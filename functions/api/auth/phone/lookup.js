/* POST /api/auth/phone/lookup {phone}   (the "Confirm" button)
   - New number  -> a one-time code is sent; answer { state: 'otp_sent' }.
   - Known number -> no message; answer { state: 'existing', token, profile }
     so the checkout can fill in the saved name and address.
   Nothing about the number is revealed before the button is pressed, and
   all failures use the same generic messages. */
import { json, fail, handle, readJson, loadConfig } from '../../../_lib/http.js';
import { Firestore } from '../../../_lib/firestore.js';
import { siteOf } from '../../../_lib/site.js';
import { normalizePhone } from '../../../_lib/phone.js';
import { authSettings, phoneUid, issueCustomerToken } from '../../../_lib/customer.js';
import { issueOtp } from '../../../_lib/otp.js';
import { ipLimit } from '../../../_lib/ratelimit.js';

export const onRequestPost = handle(async ({ request, env }) => {
  const site = siteOf(request);
  if (!(await ipLimit(request, 'phone-lookup', 30, 600))) return fail(429, 'too_many_requests');
  const config = await loadConfig(env, site);
  if (!config) return fail(404, 'site_not_found');
  const auth = authSettings(config);
  if (auth.mode !== 'phone') return fail(400, 'phone_login_disabled');
  const { phone: raw } = await readJson(request, 2000);
  const phone = normalizePhone(raw, auth.country);
  if (!phone) return fail(400, 'phone_invalid');

  const uid = await phoneUid(site, phone);
  const fs = new Firestore(env, site);
  const doc = await fs.get(`users/${uid}`);
  const known = !!(doc && doc.data.phoneVerified === true);

  if (known && !auth.requireOtpForExisting) {
    const d = doc.data;
    return json({ state: 'existing', phone, token: await issueCustomerToken(env, site, phone, uid), profile: { name: d.name || '', address: d.address || '' } });
  }
  const s = config.settings || {};
  const out = await issueOtp(env, site, phone, {
    lang: s.lang || s.defaultLang || 'en',
    name: typeof s.restaurantName === 'string' ? s.restaurantName : (s.restaurantName && (s.restaurantName.ar || s.restaurantName.en)) || '',
    length: auth.otpLength,
    echo: !!site && auth.demoShowCode
  });
  if (!out.ok) return fail(429, 'too_many_requests');
  return json({ state: 'otp_sent', phone, ttl: 300, length: auth.otpLength, ...(out.devCode ? { devCode: out.devCode } : {}) });
});
