/* "Wheel" game rules. Everything that decides a result lives here and runs
   on the server only (functions/api/wheel/*): the browser just animates
   the answer it receives.

   config.wheel = {
     enabled, title, minOrder, goldenEvery, validHours, weeklyBigCap,
     prizes: [{ id, label, type: 'product'|'percent', productId?, value?,
                weight, goldWeight, big, image?, color? }]
   }
   weight      = chance (any positive numbers, they are normalised)
   goldWeight  = chance on a golden spin
   big         = counts against the weekly cap of big prizes */
import { dayKey } from './orders.js';

export const WHEEL_DEFAULTS = { minOrder: 100, goldenEvery: 150, validHours: 48, weeklyBigCap: 10 };
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function wheelSettings(config) {
  const w = (config && config.wheel) || {};
  const num = (v, d, min = 0) => (Number.isFinite(Number(v)) && Number(v) >= min ? Number(v) : d);
  return {
    enabled: w.enabled === true && Array.isArray(w.prizes) && w.prizes.length > 0,
    title: w.title || '',
    minOrder: num(w.minOrder, WHEEL_DEFAULTS.minOrder),
    goldenEvery: num(w.goldenEvery, WHEEL_DEFAULTS.goldenEvery, 1),
    validHours: num(w.validHours, WHEEL_DEFAULTS.validHours, 1),
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
    goldenEvery: w.goldenEvery,
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

/* Which spins can this customer use now?
   user: { lastFreeSpinDay, goldSpinsUsed, lifetimeSpend } */
export function spinState(wheel, user, nowMs, timeZone) {
  const u = user || {};
  const today = dayKey(nowMs, timeZone);
  const earnedGold = Math.floor((Number(u.lifetimeSpend) || 0) / wheel.goldenEvery + 1e-9);
  return {
    today,
    freeAvailable: u.lastFreeSpinDay !== today,
    goldAvailable: Math.max(0, earnedGold - (Number(u.goldSpinsUsed) || 0))
  };
}

/* The server's draw. `bigAllowed=false` removes "big" prizes (weekly cap
   reached). Returns a prize definition from wheel.prizes. */
export function pickPrize(wheel, kind, { bigAllowed = true, rng = secureRandom } = {}) {
  const key = kind === 'gold' ? 'goldWeight' : 'weight';
  const pool = wheel.prizes
    .map(p => ({ p, w: Math.max(0, Number(p[key]) || 0) }))
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
export function prizeRecord(def, { uid, phone, kind, code, now, wheel }) {
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
    kind,
    big: !!def.big,
    minOrder: wheel.minOrder,
    issuedAt: now,
    expiresAt: now + wheel.validHours * 3600 * 1000,
    used: false
  };
}

export const prizeActive = (p, now) => !!p && p.used !== true && Number(p.expiresAt) > now;
