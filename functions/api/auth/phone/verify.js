/* POST /api/auth/phone/verify {phone, code}
   Checks the one-time code. On success the account for this number is
   created (first time) and a Firebase custom token is returned. */
import { json, fail, handle, readJson, loadConfig } from '../../../_lib/http.js';
import { Firestore } from '../../../_lib/firestore.js';
import { siteOf } from '../../../_lib/site.js';
import { normalizePhone } from '../../../_lib/phone.js';
import { authSettings, phoneUid, issueCustomerToken } from '../../../_lib/customer.js';
import { checkOtp } from '../../../_lib/otp.js';
import { ipLimit } from '../../../_lib/ratelimit.js';

export const onRequestPost = handle(async ({ request, env }) => {
  const site = siteOf(request);
  if (!(await ipLimit(request, 'phone-verify', 40, 600))) return fail(429, 'too_many_requests');
  const config = await loadConfig(env, site);
  if (!config) return fail(404, 'site_not_found');
  const auth = authSettings(config);
  if (auth.mode !== 'phone') return fail(400, 'phone_login_disabled');
  const { phone: raw, code } = await readJson(request, 2000);
  const phone = normalizePhone(raw, auth.country);
  if (!phone) return fail(400, 'phone_invalid');
  if (!(await checkOtp(env, site, phone, code))) return fail(400, 'otp_invalid');

  const uid = await phoneUid(site, phone);
  const fs = new Firestore(env, site);
  const now = Date.now();
  const doc = await fs.get(`users/${uid}`);
  const profile = { phone, phoneVerified: true, updatedAt: now };
  if (!doc) Object.assign(profile, { name: '', address: '', points: 0, lifetimePoints: 0, createdAt: now });
  await fs.commit([fs.merge(`users/${uid}`, profile)]);
  const d = doc ? doc.data : {};
  return json({ state: 'verified', phone, token: await issueCustomerToken(env, site, phone, uid), profile: { name: d.name || '', address: d.address || '' } });
});
