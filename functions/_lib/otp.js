/* One-time codes (OTP) for phone sign-in.

   - The code is 4-6 digits, valid for 5 minutes, and only its HMAC is kept
     (KV key otp:<site>:<phone>), so nobody can read a code back.
   - At most 3 codes per number per hour, and 5 wrong guesses per code.
   - Delivery goes through ONE interface, `sendOtp`, with interchangeable
     providers chosen by the OTP_PROVIDER variable:
        console  (default / development) prints the code in the server log
        twilio   SMS or WhatsApp through Twilio's REST API
        webhook  POSTs {to, code, text, channel} to OTP_WEBHOOK_URL, so any
                 SMS/WhatsApp gateway (or a tiny relay) can be plugged in
   To add a provider, add one function to PROVIDERS. */
import { safeEqual } from './google.js';

export const OTP_LENGTH = 5;
export const OTP_TTL_SEC = 300;
export const OTP_MAX_SENDS = 3;
export const OTP_SEND_WINDOW_SEC = 3600;
export const OTP_MAX_TRIES = 5;

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

function secret(env) {
  const s = env.OTP_SECRET || env.ADMIN_PASSWORD || '';
  if (!s) throw Object.assign(new Error('otp_secret_missing'), { status: 500 });
  return s;
}

async function hmac(env, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

export function randomCode(length = OTP_LENGTH) {
  const n = new Uint32Array(1);
  let out = '';
  while (out.length < length) { crypto.getRandomValues(n); out += String(n[0] % 10); }
  return out;
}

const otpKey = (site, phone) => `otp:${site || '_'}:${phone}`;
const cntKey = (site, phone) => `otpc:${site || '_'}:${phone}`;

/* Message text in the site's language (ar / en; anything else gets English). */
export function otpText(lang, name, code) {
  return lang === 'ar'
    ? `رمز التحقق الخاص بك في ${name}: ${code}\nصالح لمدة 5 دقائق. لا تشاركه مع أحد.`
    : `Your ${name} verification code: ${code}\nValid for 5 minutes. Do not share it.`;
}

/* ---------- providers: async (env, { to, code, text }) ---------- */
export const PROVIDERS = {
  console: async (env, msg) => { console.log(`[OTP] ${msg.to}: ${msg.code}`); },

  twilio: async (env, msg) => {
    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = env;
    if (!sid || !token || !from) throw new Error('twilio_not_configured');
    const wa = String(env.TWILIO_CHANNEL || 'sms').toLowerCase() === 'whatsapp';
    const body = new URLSearchParams({ To: (wa ? 'whatsapp:' : '') + msg.to, From: (wa && !from.startsWith('whatsapp:') ? 'whatsapp:' : '') + from, Body: msg.text });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!res.ok) throw new Error('twilio_failed_' + res.status);
  },

  webhook: async (env, msg) => {
    if (!env.OTP_WEBHOOK_URL) throw new Error('webhook_not_configured');
    const res = await fetch(env.OTP_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(env.OTP_WEBHOOK_TOKEN ? { Authorization: 'Bearer ' + env.OTP_WEBHOOK_TOKEN } : {}) },
      body: JSON.stringify({ to: msg.to, code: msg.code, text: msg.text, channel: env.OTP_CHANNEL || 'sms' })
    });
    if (!res.ok) throw new Error('webhook_failed_' + res.status);
  }
};

export async function sendOtp(env, msg) {
  const name = String(env.OTP_PROVIDER || 'console').toLowerCase();
  const provider = PROVIDERS[name];
  if (!provider) throw new Error('unknown_otp_provider');
  await provider(env, msg);
}

/* Creates and sends a code. Returns { ok:true } or { ok:false, reason:'rate_limited' }.
   `devCode` is set only when OTP_DEV_ECHO=1 (a demo switch, never default). */
export async function issueOtp(env, site, phone, { lang = 'en', name = '', length = OTP_LENGTH, now = Date.now(), echo = false } = {}) {
  const ck = cntKey(site, phone);
  const sends = (await env.STORE.get(ck, 'json')) || { n: 0, reset: now + OTP_SEND_WINDOW_SEC * 1000 };
  if (sends.reset < now) { sends.n = 0; sends.reset = now + OTP_SEND_WINDOW_SEC * 1000; }
  if (sends.n >= OTP_MAX_SENDS) return { ok: false, reason: 'rate_limited' };
  const code = randomCode(length);
  const text = otpText(lang, name || 'Restaurant', code);
  if (!echo || env.OTP_PROVIDER) await sendOtp(env, { to: phone, code, text });
  sends.n += 1;
  await env.STORE.put(ck, JSON.stringify(sends), { expirationTtl: OTP_SEND_WINDOW_SEC });
  await env.STORE.put(otpKey(site, phone), JSON.stringify({ h: await hmac(env, `${site}|${phone}|${code}`), exp: now + OTP_TTL_SEC * 1000, tries: 0 }), { expirationTtl: 600 });
  return { ok: true, devCode: (env.OTP_DEV_ECHO === '1' || echo) ? code : undefined };
}

/* -> true when the code is right. Wrong, expired and unknown all look the
   same to the caller. */
export async function checkOtp(env, site, phone, code, now = Date.now()) {
  const key = otpKey(site, phone);
  const rec = await env.STORE.get(key, 'json');
  if (!rec || rec.exp < now) return false;
  if (rec.tries >= OTP_MAX_TRIES) { await env.STORE.delete(key); return false; }
  const ok = /^\d{4,6}$/.test(String(code || '')) && safeEqual(rec.h, await hmac(env, `${site}|${phone}|${String(code)}`));
  if (ok) { await env.STORE.delete(key); return true; }
  rec.tries += 1;
  if (rec.tries >= OTP_MAX_TRIES) await env.STORE.delete(key);
  else await env.STORE.put(key, JSON.stringify(rec), { expirationTtl: 600 });
  return false;
}
