/* Phone-mode customers. The phone number IS the account: a stable customer
   id is derived from (site, phone), so orders, points, wheel spins and
   prizes of one number always belong together. The browser signs in to
   Firebase with a custom token carrying { customer: true, site, ph }. */
import { createCustomToken } from './google.js';

const enc = new TextEncoder();

export async function phoneUid(site, phone) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(`customer|${site || ''}|${phone}`));
  return 'ph_' + [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export async function issueCustomerToken(env, site, phone, uid) {
  return createCustomToken(env, uid, { customer: true, site: site || '', ph: phone });
}

/* The site's auth settings with defaults. */
export function authSettings(config) {
  const a = (config && config.settings && config.settings.auth) || {};
  return {
    mode: a.mode === 'phone' ? 'phone' : 'google',
    country: ['PS', 'SA', 'AE', 'KW', 'JO'].includes(a.country) ? a.country : 'PS',
    requireOtpForExisting: a.requireOtpForExisting === true,
    otpLength: [4, 5, 6].includes(Number(a.otpLength)) ? Number(a.otpLength) : 5,
    // Demo sites only (never the main site): show the code on screen so a prospect can try the flow without an SMS provider.
    demoShowCode: a.demoShowCode === true
  };
}

/* May this signed-in user act as a customer of this site? Phone sites accept
   phone customers only; Google sites accept Google customers only. */
export function customerAllowed(user, config, site = '') {
  if (!user || user.role) return false;
  const phoneMode = authSettings(config).mode === 'phone';
  if (user.customer === true) return phoneMode && (user.site || '') === (site || '');
  return !phoneMode && !!user.firebase && user.firebase.sign_in_provider === 'google.com';
}
