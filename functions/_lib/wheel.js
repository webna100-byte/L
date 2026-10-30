/* "Wheel" game rules. Everything that decides a result lives here and runs
   on the server only (functions/api/wheel/*): the browser just animates
   the answer it receives. One free spin per day per phone number.

   config.wheel = {
     enabled, title, minOrder, validHours, weeklyBigCap,
     prizes: [{ id, label, type: 'product'|'percent', productId?, value?,
                weight, big, image?, color? }]
   }
   weight = chance (any positive numbers, they are normalised)
   big    = counts against the weekly cap of big prizes
   minOrder = a prize is applied automatically to an order of at least this amount
   validHours = 0 means the prize stays on the number until it is used */
import { dayKey } from './orders.js';

export const WHEEL_DEFAULTS = { minOrder: 100, validHours: 0, weeklyBigCap: 10 };
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function wheelSettings(config) {
  const w = (config && config.wheel) || {};
  const num = (v, d, min = 0) => (Number.isFinite(Number(v)) && Number(v) >= min ? Number(v) : d);
  return {
    enabled: w.enabled === true && Array.isArray(w.prizes) && w.prizes.length > 0,
    title: w.title || '',
    minOrder: num(w.minOrder, WHEEL_DEFAULTS.minOrder),
    validHours: num(w.validHours, WHEEL_DEFAULTS.validHours, 0),   // 0 = the prize never expires
    weeklyBigCap: num(w.weeklyBigCap, WHEEL_DEFAULTS.weeklyBigCap),
    prizes: Array.isArray(w.prizes) ? w.prizes : []
  };
}

/* What visitors may see: no chances. */
export function publicWheel(config) {
  const w = wheelSettings(config);
  return {
    enabled: w.enabled,
    title: w.title,
    minOrder: w.minOrder,
    validHours: w.validHours,
    prizes: w.prizes.map(p => ({ id: p.id, label: p.label, type: p.type, productId: p.productId, value: p.value, image: p.image || '', color: p.color || '' }))
  };
}

/* ISO week (Mon-Sun) of a moment in the site's time zone: '2026-W44'. */
export function weekKey(ms, timeZone) {
  const [y, m, d] = dayKey(ms, timeZone).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = (date.getUTCDay() + 6) % 7;            // Monday = 0
  date.setUTCDate(date.getUTCDate() - dow + 3);       // Thursday of this week
  const first = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - first) / 86400000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/* Uniform [0,1) from the platform's secure random source. */
export function secureRandom() {
  const n = new Uint32Array(2);
  crypto.getRandomValues(n);
  return (n[0] * 2 ** 21 + (n[1] >>> 11)) / 2 ** 53;
}

export function newCode(length = 8, rng = secureRandom) {
  let s = '';
  for (let i = 0; i < length; i++) s += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  return s;
}

/* Can this customer spin today? user: { lastFreeSpinDay } */
export function spinState(wheel, user, nowMs, timeZone) {
  const today = dayKey(nowMs, timeZone);
  return { today, freeAvailable: !user || user.lastFreeSpinDay !== today };
}

/* The server's draw. `bigAllowed=false` removes "big" prizes (weekly cap
   reached). Returns a prize definition from wheel.prizes. */
export function pickPrize(wheel, { bigAllowed = true, rng = secureRandom } = {}) {
  const pool = wheel.prizes
    .map(p => ({ p, w: Math.max(0, Number(p.weight) || 0) }))
    .filter(x => x.w > 0 && (bigAllowed || !x.p.big));
  if (!pool.length) {
    // The cap removed everything with a chance: fall back to any small prize.
    const small = wheel.prizes.filter(p => !p.big);
    return small.length ? small[Math.floor(rng() * small.length)] : wheel.prizes[0];
  }
  const total = pool.reduce((s, x) => s + x.w, 0);
  let r = rng() * total;
  for (const x of pool) { r -= x.w; if (r < 0) return x.p; }
  return pool[pool.length - 1].p;
}

/* The document stored for a won prize (one-time code bound to a phone). */
export function prizeRecord(def, { uid, phone, code, now, wheel }) {
  return {
    code,
    uid,
    phone,
    prizeId: def.id,
    label: def.label,
    type: def.type,
    productId: def.type === 'product' ? def.productId : '',
    value: def.type === 'percent' ? Number(def.value) || 0 : 0,
    image: def.image || '',
    big: !!def.big,
    minOrder: wheel.minOrder,
    issuedAt: now,
    expiresAt: wheel.validHours > 0 ? now + wheel.validHours * 3600 * 1000 : 0,
    used: false
  };
}

/* expiresAt 0 = no expiry: the prize stays on the customer's number until it is used. */
export const prizeActive = (p, now) => !!p && p.used !== true && (!Number(p.expiresAt) || Number(p.expiresAt) > now);
