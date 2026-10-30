/* Customers. The phone number IS the account: a stable customer
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
    country: ['PS', 'SA', 'AE', 'KW', 'JO'].includes(a.country) ? a.country : 'PS',
    requireOtpForExisting: a.requireOtpForExisting === true,
    otpLength: [4, 5, 6].includes(Number(a.otpLength)) ? Number(a.otpLength) : 5,
    // Demo sites only (never the main site): the code is also shown on screen so a prospect can try the
    // flow without an SMS provider. Set demoShowCode to false on a demo to behave like a real site.
    demoShowCode: a.demoShowCode !== false
  };
}

/* May this signed-in user act as a customer of this site? Only phone customers
   of this very site (their token carries customer: true and the site). */
export function customerAllowed(user, site = '') {
  return !!user && !user.role && user.customer === true && (user.site || '') === (site || '');
}
