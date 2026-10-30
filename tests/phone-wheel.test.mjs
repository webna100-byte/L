// Phone sign-in + wheel: node --test tests/phone-wheel.test.mjs
// Runs the real API handlers in Node against an in-memory Firestore/KV.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../public/js/pricing.js';
import '../public/js/i18n.js';
import { normalizePhone } from '../functions/_lib/phone.js';
import { weekKey, pickPrize, wheelSettings, spinState } from '../functions/_lib/wheel.js';
import { startFakeFirestore, makeEnv, idTokenFromCustom, staffToken, googleToken, req, call } from './fake-backend.mjs';

globalThis.caches = { default: { match: async () => undefined, put: async () => {}, delete: async () => {} } };

const lookup = (await import('../functions/api/auth/phone/lookup.js')).onRequestPost;
const verify = (await import('../functions/api/auth/phone/verify.js')).onRequestPost;
const create = (await import('../functions/api/orders/create.js')).onRequestPost;
const setStatus = (await import('../functions/api/orders/status.js')).onRequestPost;
const me = (await import('../functions/api/me.js')).onRequestGet;
const wheelStatus = (await import('../functions/api/wheel/status.js')).onRequestGet;
const wheelSpin = (await import('../functions/api/wheel/spin.js')).onRequestPost;
const wheelStats = (await import('../functions/api/admin/wheel.js')).onRequestGet;
const siteApi = (await import('../functions/api/site.js')).onRequestGet;
const report = (await import('../functions/api/admin/report.js')).onRequestGet;

const seed = JSON.parse(fs.readFileSync(new URL('../public/seed/demo-config.json', import.meta.url)));
function baseConfig(wheelOver = {}, authOver = {}) {
  const c = globalThis.localizeConfig(seed, 'ar');
  c.settings.auth = { mode: 'phone', country: 'PS', ...authOver };
  c.settings.timezone = 'Asia/Hebron';
  c.version = 1;
  c.wheel = {
    enabled: true, title: 'لف العجلة', minOrder: 20, validHours: 48, weeklyBigCap: 10,
    prizes: [
      { id: 'drink', label: 'مشروب', type: 'product', productId: 'prod_cola', weight: 35, big: false },
      { id: 'lemon', label: 'ليموناضة', type: 'product', productId: 'prod_lemonade', weight: 30, big: false },
      { id: 'disc10', label: 'خصم 10%', type: 'percent', value: 10, weight: 20, big: false },
      { id: 'wings', label: 'دجاج', type: 'product', productId: 'prod_crispy_chicken', weight: 12, big: true },
      { id: 'classic', label: 'كلاسيك', type: 'product', productId: 'prod_classic_burger', weight: 3, big: true }
    ],
    ...wheelOver
  };
  return c;
}

async function setup(config = baseConfig()) {
  const store = await startFakeFirestore();
  const env = makeEnv(store.host);
  await env.STORE.put('config', JSON.stringify(config));
  const ctx = { env, pending: [] };
  return { store, env, ctx, close: () => store.close() };
}

/* Sign a customer in by phone (new number -> otp -> verify). */
async function signUp(t, phone, { site } = {}) {
  const a = await call(lookup, t.ctx, req('/api/auth/phone/lookup', { method: 'POST', body: { phone }, site }));
  assert.equal(a.status, 200, JSON.stringify(a));
  if (a.state === 'existing') return { token: idTokenFromCustom(a.token), phone: a.phone, existing: true, profile: a.profile };
  const b = await call(verify, t.ctx, req('/api/auth/phone/verify', { method: 'POST', body: { phone, code: a.devCode }, site }));
  assert.equal(b.status, 200, JSON.stringify(b));
  return { token: idTokenFromCustom(b.token), phone: b.phone, existing: false, profile: b.profile };
}
const order = (t, token, body) => call(create, t.ctx, req('/api/orders/create', { method: 'POST', token, body: { branchId: 'branch_downtown', type: 'pickup', items: [{ productId: 'prod_classic_burger', qty: 3 }], ...body } }));

test('phone numbers are normalised (Palestine, Israel, Gulf, international)', () => {
  assert.equal(normalizePhone('0591234567'), '+970591234567');
  assert.equal(normalizePhone('059 123 4567'), '+970591234567');
  assert.equal(normalizePhone('056-123-4567'), '+970561234567');
  assert.equal(normalizePhone('591234567'), '+970591234567');
  assert.equal(normalizePhone('+970591234567'), '+970591234567');
  assert.equal(normalizePhone('00970591234567'), '+970591234567');
  assert.equal(normalizePhone('+970 (0)59 1234567'), '+970591234567');
  assert.equal(normalizePhone('0521234567'), '+972521234567');
  assert.equal(normalizePhone('0501234567', 'SA'), '+966501234567');
  assert.equal(normalizePhone('0501234567', 'AE'), '+971501234567');
  assert.equal(normalizePhone('+447911123456'), '+447911123456');
  for (const bad of ['', 'abc', '059123', '0321234567', '+970291234567', '05912345678', null, undefined, '+0123456789']) assert.equal(normalizePhone(bad), null, String(bad));
});

test('new number: code is sent, wrong code fails, right code signs in; known number needs no code', async () => {
  const t = await setup();
  try {
    const a = await call(lookup, t.ctx, req('/api/auth/phone/lookup', { method: 'POST', body: { phone: '059 111 2222' } }));
    assert.equal(a.status, 200);
    assert.deepEqual([a.phone, a.length, a.token], ['+970591112222', 5, undefined]);
    assert.match(a.devCode, /^\d{5}$/);
    // nothing is stored in clear text
    const stored = JSON.stringify([...t.env.STORE.m.values()]);
    assert.ok(!stored.includes(a.devCode));
    const wrong = await call(verify, t.ctx, req('/api/auth/phone/verify', { method: 'POST', body: { phone: '0591112222', code: a.devCode === '00000' ? '11111' : '00000' } }));
    assert.deepEqual([wrong.status, wrong.error], [400, 'otp_invalid']);
    const ok = await call(verify, t.ctx, req('/api/auth/phone/verify', { method: 'POST', body: { phone: '0591112222', code: a.devCode } }));
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.profile, { name: '', address: '' });
    assert.ok(ok.token.split('.').length === 3);
    // a code works once
    const again = await call(verify, t.ctx, req('/api/auth/phone/verify', { method: 'POST', body: { phone: '0591112222', code: a.devCode } }));
    assert.equal(again.error, 'otp_invalid');
    // known number: no code, token and (still empty) profile come straight back
    const k = await call(lookup, t.ctx, req('/api/auth/phone/lookup', { method: 'POST', body: { phone: '+970591112222' } }));
    assert.deepEqual([k.status, k.state], [200, 'existing']);
    assert.ok(k.token && !k.devCode);
    assert.equal((await call(lookup, t.ctx, req('/api/auth/phone/lookup', { method: 'POST', body: { phone: '123' } }))).error, 'phone_invalid');
  } finally { await t.close(); }
});

test('codes expire after 5 minutes, are limited to 3 per hour and 5 wrong guesses', async () => {
  const t = await setup();
  try {
    const otp = await import('../functions/_lib/otp.js');
    const issued = await otp.issueOtp(t.env, '', '+970591113333', { now: 1000 });
    assert.ok(issued.ok);
    assert.equal(await otp.checkOtp(t.env, '', '+970591113333', issued.devCode, 1000 + 301 * 1000), false, 'expired');
    // 3 codes per hour per number: the 4th request is refused, with the same generic answer
    const lk = () => call(lookup, t.ctx, req('/api/auth/phone/lookup', { method: 'POST', body: { phone: '0591115555' } }));
    for (let i = 0; i < 3; i++) assert.equal((await lk()).state, 'otp_sent');
    const r = await lk();
    assert.deepEqual([r.status, r.error], [429, 'too_many_requests']);
    assert.deepEqual(await otp.issueOtp(t.env, '', '+970591115555'), { ok: false, reason: 'rate_limited' });
    // 5 wrong guesses burn the code, even a later right guess fails
    const fresh = await otp.issueOtp(t.env, '', '+970591114444', { now: 5000 });
    for (let i = 0; i < 5; i++) assert.equal(await otp.checkOtp(t.env, '', '+970591114444', '00000', 5000), false);
    assert.equal(await otp.checkOtp(t.env, '', '+970591114444', fresh.devCode, 5000), false);
  } finally { await t.close(); }
});

test('the console provider prints the code; unknown providers are rejected', async () => {
  const otp = await import('../functions/_lib/otp.js');
  const lines = []; const orig = console.log; console.log = (...a) => lines.push(a.join(' '));
  try { await otp.sendOtp({ OTP_PROVIDER: 'console' }, { to: '+970591110000', code: '12345', text: 'x' }); } finally { console.log = orig; }
  assert.deepEqual(lines, ['[OTP] +970591110000: 12345']);
  await assert.rejects(otp.sendOtp({ OTP_PROVIDER: 'nope' }, { to: '+1', code: '1', text: 'x' }), /unknown_otp_provider/);
  let posted;
  const f = globalThis.fetch;
  globalThis.fetch = async (url, init) => { posted = { url, body: JSON.parse(init.body), auth: init.headers.Authorization }; return new Response('{}'); };
  try { await otp.sendOtp({ OTP_PROVIDER: 'webhook', OTP_WEBHOOK_URL: 'https://gw.test/send', OTP_WEBHOOK_TOKEN: 'tok', OTP_CHANNEL: 'whatsapp' }, { to: '+970591110000', code: '12345', text: 'hi' }); } finally { globalThis.fetch = f; }
  assert.deepEqual(posted, { url: 'https://gw.test/send', body: { to: '+970591110000', code: '12345', text: 'hi', channel: 'whatsapp' }, auth: 'Bearer tok' });
});

test('checkout: name and address are saved on the number and refilled next time; edits update them', async () => {
  const t = await setup();
  try {
    const c = await signUp(t, '0592223333');
    const o1 = await order(t, c.token, { type: 'pickup', customer: { name: 'أحمد', phone: '0599999999' } });
    assert.equal(o1.status, 200, JSON.stringify(o1));
    const stored = t.store.list('orders')[0];
    assert.equal(stored.customer.phone, '+970592223333', 'the verified number wins over the typed one');
    const o2 = await order(t, c.token, { type: 'delivery', zoneId: 'zone_branch_downtown_standard', customer: { name: 'أحمد س.', address: 'رام الله، الإرسال' } });
    assert.equal(o2.status, 200, JSON.stringify(o2));
    const again = await signUp(t, '059-222-3333');
    assert.equal(again.existing, true);
    assert.deepEqual(again.profile, { name: 'أحمد س.', address: 'رام الله، الإرسال' });
    const profile = await call(me, t.ctx, req('/api/me', { token: again.token }));
    assert.equal(profile.phone, '+970592223333');
    // a pickup order keeps the saved address
    await order(t, c.token, { type: 'pickup', customer: { name: 'أحمد س.' } });
    assert.equal((await signUp(t, '0592223333')).profile.address, 'رام الله، الإرسال');
    assert.equal(t.store.list('users').length, 1);
  } finally { await t.close(); }
});

test('only phone customers of this site can act: Google tokens and other sites are refused', async () => {
  const t = await setup();
  try {
    assert.equal((await order(t, googleToken('g1'), { customer: { name: 'x' } })).status, 401);
    assert.equal((await call(me, t.ctx, req('/api/me', { token: googleToken('g1') }))).status, 401);
    assert.equal((await call(wheelStatus, t.ctx, req('/api/wheel/status', { token: googleToken('g1') }))).status, 401);
    const c = await signUp(t, '0593334444');
    assert.equal((await order(t, c.token, { customer: { name: 'x' } })).status, 200);
    // the same token on a demo site is refused (different site claim)
    await t.env.STORE.put('site:demo1:config', JSON.stringify(baseConfig()));
    const other = await call(create, t.ctx, req('/api/orders/create', { method: 'POST', token: c.token, site: 'demo1', body: { branchId: 'branch_downtown', type: 'pickup', items: [{ productId: 'prod_cola', qty: 1 }], customer: { name: 'x' } } }));
    assert.equal(other.status, 401);
    // there is no sign-in setting to switch: a site config with or without settings.auth behaves the same
    const bare = baseConfig(); delete bare.settings.auth;
    await t.env.STORE.put('config', JSON.stringify(bare));
    assert.equal((await call(lookup, t.ctx, req('/api/auth/phone/lookup', { method: 'POST', body: { phone: '0593335555' } }))).state, 'otp_sent');
    assert.equal((await order(t, c.token, { customer: { name: 'x' } })).status, 200);
  } finally { await t.close(); }
});

test('wheel: one free spin per day per number, result drawn on the server, prize is a one-time code', async () => {
  const t = await setup();
  try {
    const c = await signUp(t, '0594445555');
    const st = await call(wheelStatus, t.ctx, req('/api/wheel/status', { token: c.token }));
    assert.deepEqual([st.enabled, st.freeAvailable, st.goldAvailable, st.prizes.length], [true, true, undefined, 0]);
    assert.ok(st.wheel.prizes.every(p => !('weight' in p) && !('goldWeight' in p)), 'chances are never sent to the browser');
    const s1 = await call(wheelSpin, t.ctx, req('/api/wheel/spin', { method: 'POST', token: c.token, body: { kind: 'free' } }));
    assert.equal(s1.status, 200, JSON.stringify(s1));
    assert.match(s1.prize.code, /^[A-Z2-9]{8}$/);
    assert.ok(s1.prizeIndex >= 0 && s1.prizeIndex < 5);
    const pz = t.store.get('prizes/' + s1.prize.code);
    assert.deepEqual([pz.phone, pz.used, pz.expiresAt - pz.issuedAt, pz.minOrder], ['+970594445555', false, 48 * 3600 * 1000, 20]);
    const s2 = await call(wheelSpin, t.ctx, req('/api/wheel/spin', { method: 'POST', token: c.token, body: { kind: 'free' } }));
    assert.deepEqual([s2.status, s2.error], [409, 'no_spin_available']);
    const st2 = await call(wheelStatus, t.ctx, req('/api/wheel/status', { token: c.token }));
    assert.deepEqual([st2.freeAvailable, st2.prizes.length, st2.prizes[0].code], [false, 1, s1.prize.code]);
    // another number has its own spin
    const d = await signUp(t, '0595556666');
    assert.equal((await call(wheelSpin, t.ctx, req('/api/wheel/spin', { method: 'POST', token: d.token, body: { kind: 'free' } }))).status, 200);
    // the client cannot choose a prize or fake a kind
    // the client cannot choose the prize: a request asking for one is simply a normal spin (here the daily one is already used)
    assert.equal((await call(wheelSpin, t.ctx, req('/api/wheel/spin', { method: 'POST', token: d.token, body: { prizeId: 'classic', kind: 'gold' } }))).status, 409);
    assert.equal((await call(wheelSpin, t.ctx, req('/api/wheel/spin', { method: 'POST', body: { kind: 'free' } }))).status, 401);
  } finally { await t.close(); }
});

test('prize use: minimum order, same number only, once, applied to the order total', async () => {
  const cfg = baseConfig({ prizes: [{ id: 'disc10', label: 'خصم 10%', type: 'percent', value: 10, weight: 1, big: false }] });
  const t = await setup(cfg);
  try {
    const c = await signUp(t, '0596667777');
    const s = await call(wheelSpin, t.ctx, req('/api/wheel/spin', { method: 'POST', token: c.token, body: { kind: 'free' } }));
    const code = s.prize.code;
    const small = await order(t, c.token, { items: [{ productId: 'prod_cola', qty: 1 }], prizeCode: code, customer: { name: 'س' } });
    assert.deepEqual([small.status, small.error], [400, 'prize_min_order']);
    assert.equal(t.store.get('prizes/' + code).used, false, 'a refused order does not burn the prize');
    const other = await signUp(t, '0597778888');
    assert.equal((await order(t, other.token, { prizeCode: code, customer: { name: 'غريب' } })).error, 'prize_invalid');
    const ok = await order(t, c.token, { items: [{ productId: 'prod_classic_burger', qty: 3 }], prizeCode: code, customer: { name: 'س' } });
    assert.equal(ok.status, 200, JSON.stringify(ok));
    const placed = t.store.list('orders').find(o => o.prize && o.prize.code === code);
    assert.equal(placed.prize.discount, 2.85);                  // 10% of 28.5
    assert.equal(placed.total, 25.65);
    assert.equal(placed.subtotal, 28.5);
    const used = t.store.get('prizes/' + code);
    assert.deepEqual([used.used, used.orderId.length > 5, used.orderTotal], [true, true, placed.total]);
    assert.equal((await order(t, c.token, { items: [{ productId: 'prod_classic_burger', qty: 3 }], prizeCode: code, customer: { name: 'س' } })).error, 'prize_invalid');
    // cancelling the order gives the prize back (still inside its 48 hours)
    const admin = staffToken({ role: 'admin', site: '' });
    const orderId = [...t.store.docs.keys()].find(k => k.includes('/orders/')).split('/').pop();
    const cancel = await call(setStatus, t.ctx, req('/api/orders/status', { method: 'POST', token: admin, body: { orderId, status: 'cancelled' } }));
    assert.equal(cancel.status, 200, JSON.stringify(cancel));
    assert.equal(t.store.get('prizes/' + code).used, false);
    assert.equal((await order(t, c.token, { items: [{ productId: 'prod_classic_burger', qty: 3 }], prizeCode: code, customer: { name: 'س' } })).status, 200);
  } finally { await t.close(); }
});

test('free-product prize adds a free line; expired prizes are refused', async () => {
  const cfg = baseConfig({ prizes: [{ id: 'cola', label: 'مشروب', type: 'product', productId: 'prod_cola', weight: 1, big: false }] });
  const t = await setup(cfg);
  try {
    const c = await signUp(t, '0598889999');
    const s = await call(wheelSpin, t.ctx, req('/api/wheel/spin', { method: 'POST', token: c.token, body: { kind: 'free' } }));
    const ok = await order(t, c.token, { items: [{ productId: 'prod_classic_burger', qty: 3 }], prizeCode: s.prize.code, customer: { name: 'س' } });
    assert.equal(ok.status, 200, JSON.stringify(ok));
    const placed = t.store.list('orders')[0];
    assert.equal(placed.total, 28.5, 'the free drink costs nothing and adds nothing');
    const free = placed.items.find(i => i.prize);
    assert.deepEqual([free.productId, free.unitPrice, free.lineTotal], ['prod_cola', 0, 0]);
    // expired
    const d = await signUp(t, '0598880000');
    const s2 = await call(wheelSpin, t.ctx, req('/api/wheel/spin', { method: 'POST', token: d.token, body: { kind: 'free' } }));
    t.store.set('prizes/' + s2.prize.code, { ...t.store.get('prizes/' + s2.prize.code), expiresAt: Date.now() - 1 });
    assert.equal((await order(t, d.token, { items: [{ productId: 'prod_classic_burger', qty: 3 }], prizeCode: s2.prize.code, customer: { name: 'س' } })).error, 'prize_invalid');
    const st = await call(wheelStatus, t.ctx, req('/api/wheel/status', { token: d.token }));
    assert.equal(st.prizes.length, 0, 'expired prizes are not listed');
  } finally { await t.close(); }
});

test('weekly cap: big prizes stop once the cap is reached, small ones continue', async () => {
  const cfg = baseConfig({ weeklyBigCap: 2, prizes: [
    { id: 'big', label: 'كبيرة', type: 'product', productId: 'prod_classic_burger', weight: 100, big: true },
    { id: 'small', label: 'صغيرة', type: 'product', productId: 'prod_cola', weight: 1, big: false }
  ] });
  const t = await setup(cfg);
  try {
    const got = [];
    for (let i = 0; i < 4; i++) {
      const c = await signUp(t, '059200000' + i);
      got.push((await call(wheelSpin, t.ctx, req('/api/wheel/spin', { method: 'POST', token: c.token, body: { kind: 'free' } }))).prize);
    }
    const big = got.filter(p => p.label === 'كبيرة').length;
    assert.ok(big <= 2, 'never more than the cap: ' + got.map(p => p.label).join());
    assert.ok(got.slice(2).every(p => p.label === 'صغيرة') || big === 2, got.map(p => p.label).join());
    const admin = staffToken({ role: 'admin', site: '' });
    const stats = await call(wheelStats, t.ctx, req('/api/admin/wheel', { token: admin }));
    assert.deepEqual([stats.spins, stats.bigThisWeek <= 2, stats.used], [4, true, 0]);
    assert.equal((await call(wheelStats, t.ctx, req('/api/admin/wheel', { token: googleToken('x') }))).status, 401);
  } finally { await t.close(); }
});

test('draw odds follow the configured chances (large sample) and the cap removes big prizes', () => {
  const w = wheelSettings(baseConfig());
  let seedN = 12345;
  const rng = () => { seedN = (seedN * 1664525 + 1013904223) % 4294967296; return seedN / 4294967296; };
  const n = 40000, count = {};
  for (let i = 0; i < n; i++) { const p = pickPrize(w, { rng }); count[p.id] = (count[p.id] || 0) + 1; }
  const near = (id, pct) => assert.ok(Math.abs(count[id] / n * 100 - pct) < 1.2, `${id}: ${(count[id] / n * 100).toFixed(1)}% vs ${pct}%`);
  near('drink', 35); near('lemon', 30); near('disc10', 20); near('wings', 12); near('classic', 3);
  for (let i = 0; i < 2000; i++) assert.equal(pickPrize(w, { rng, bigAllowed: false }).big, false);
});

test('weeks run Monday-Sunday in the restaurant time zone; spin state follows the local day', () => {
  assert.equal(weekKey(Date.UTC(2026, 9, 28, 12), 'Asia/Hebron'), '2026-W44');
  assert.equal(weekKey(Date.UTC(2026, 9, 25, 22, 30), 'Asia/Hebron'), '2026-W44', 'Sunday 01:30 local still belongs to the week that started Monday');
  assert.notEqual(weekKey(Date.UTC(2026, 9, 25, 12), 'Asia/Hebron'), weekKey(Date.UTC(2026, 9, 26, 12), 'Asia/Hebron'));
  const w = wheelSettings(baseConfig());
  const now = Date.UTC(2026, 9, 28, 12);
  assert.equal(spinState(w, { lastFreeSpinDay: '2026-10-28' }, now, 'Asia/Hebron').freeAvailable, false);
  assert.equal(spinState(w, { lastFreeSpinDay: '2026-10-27' }, now, 'Asia/Hebron').freeAvailable, true);
});

test('public site data hides the chances of the wheel', async () => {
  const t = await setup();
  try {
    const r = await siteApi({ request: req('/api/site'), env: t.env, waitUntil: () => {} });
    const body = await r.json();
    assert.equal(body.config.wheel.enabled, true);
    assert.ok(body.config.wheel.prizes.every(p => !('weight' in p) && !('goldWeight' in p) && !('big' in p)));
    assert.ok(!JSON.stringify(body).includes('goldWeight'));
  } finally { await t.close(); }
});

test('demo sites show the code on screen by default; the main site never does', async () => {
  const t = await setup(baseConfig({}, { demoShowCode: true }));
  try {
    t.env.OTP_DEV_ECHO = '';
    const main = await call(lookup, t.ctx, req('/api/auth/phone/lookup', { method: 'POST', body: { phone: '0591212121' } }));
    assert.deepEqual([main.state, main.devCode], ['otp_sent', undefined], 'the main site (no slug) ignores demoShowCode');
    await t.env.STORE.put('site:shop1:config', JSON.stringify(baseConfig({}, { demoShowCode: true })));
    const demo = await call(lookup, t.ctx, req('/api/auth/phone/lookup', { method: 'POST', body: { phone: '0591212121' }, site: 'shop1' }));
    assert.match(demo.devCode, /^\d{5}$/);
    const ok = await call(verify, t.ctx, req('/api/auth/phone/verify', { method: 'POST', body: { phone: '0591212121', code: demo.devCode }, site: 'shop1' }));
    assert.equal(ok.state, 'verified');
    // a demo shows the code by default (prospects can try it), and demoShowCode:false turns that off
    await t.env.STORE.put('site:shop2:config', JSON.stringify(baseConfig({}, {})));
    const byDefault = await call(lookup, t.ctx, req('/api/auth/phone/lookup', { method: 'POST', body: { phone: '0591212121' }, site: 'shop2' }));
    assert.match(byDefault.devCode, /^\d{5}$/);
    await t.env.STORE.put('site:shop3:config', JSON.stringify(baseConfig({}, { demoShowCode: false })));
    const off = await call(lookup, t.ctx, req('/api/auth/phone/lookup', { method: 'POST', body: { phone: '0591212121' }, site: 'shop3' }));
    assert.equal(off.devCode, undefined);
  } finally { await t.close(); }
});

test('prizes have no code to type and, by default, no expiry; a set validity expires them', async () => {
  const one = [{ id: 'cola', label: 'مشروب', type: 'product', productId: 'prod_cola', weight: 1, big: false }];
  const t = await setup(baseConfig({ validHours: 0, prizes: one }));
  try {
    const c = await signUp(t, '0591515151');
    const s = await call(wheelSpin, t.ctx, req('/api/wheel/spin', { method: 'POST', token: c.token, body: { kind: 'free' } }));
    const doc = t.store.get('prizes/' + s.prize.code);
    assert.equal(doc.expiresAt, 0, 'no expiry');
    assert.equal(s.prize.expiresAt, 0);
    // long after the day it was won, the prize is still there and still usable
    t.store.set('prizes/' + s.prize.code, { ...doc, issuedAt: Date.now() - 400 * 86400000 });
    const st = await call(wheelStatus, t.ctx, req('/api/wheel/status', { token: c.token }));
    assert.equal(st.prizes.length, 1);
    assert.equal((await order(t, c.token, { items: [{ productId: 'prod_classic_burger', qty: 3 }], prizeCode: s.prize.code, customer: { name: 'س' } })).status, 200);
    // with a validity set, the prize carries an end time
    await t.env.STORE.put('config', JSON.stringify(baseConfig({ validHours: 24, prizes: one })));
    const d = await signUp(t, '0591616161');
    const s2 = await call(wheelSpin, t.ctx, req('/api/wheel/spin', { method: 'POST', token: d.token, body: { kind: 'free' } }));
    assert.ok(Math.abs(s2.prize.expiresAt - (Date.now() + 24 * 3600 * 1000)) < 5000);
  } finally { await t.close(); }
});

test('old saved texts that mention Google are cleaned before visitors see them', async () => {
  const old = baseConfig();
  old.settings.homepage.login = { title: 'Entra', text: 'Inicia sesión con tu cuenta de Google para pedir, ganar puntos y seguir tus pedidos.', button: 'Iniciar sesión con Google' };
  old.pages.login = { title: 'Entra', button: 'Continuar con Google' };
  old.settings.lang = 'es';
  const t = await setup(old);
  try {
    const body = await (await siteApi({ request: req('/api/site'), env: t.env, waitUntil: () => {} })).json();
    assert.equal(body.config.settings.homepage.login.button, 'Inicia sesión con tu número de móvil');
    assert.match(body.config.settings.homepage.login.text, /número de móvil/);
    assert.equal(body.config.pages.login.button, 'Continuar con tu número de móvil');
    assert.ok(!/google/i.test(JSON.stringify(body.config)));
    assert.match(JSON.stringify(JSON.parse(await t.env.STORE.get('config'))), /Google/, 'the stored config is not rewritten');
  } finally { await t.close(); }
});

test('sales report: delivered food sales, new subscribers/customers, commission from the percentage', async () => {
  const cfg = baseConfig(); cfg.settings.report = { commissionPercent: 10 };
  const t = await setup(cfg);
  try {
    const admin = staffToken({ role: 'admin', site: '' });
    const a = await signUp(t, '0592020201'), b = await signUp(t, '0592020202'), c = await signUp(t, '0592020203');   // 3 subscribers
    const o1 = await order(t, a.token, { items: [{ productId: 'prod_classic_burger', qty: 4 }], customer: { name: 'أ' } });             // 38
    const o2 = await order(t, b.token, { type: 'delivery', zoneId: 'zone_branch_downtown_standard', items: [{ productId: 'prod_classic_burger', qty: 2 }], customer: { name: 'ب', address: 'رام الله' } }); // 19 + delivery
    const o3 = await order(t, c.token, { items: [{ productId: 'prod_cola', qty: 2 }], customer: { name: 'ج' } });                       // cancelled
    const set = (id, status) => call(setStatus, t.ctx, req('/api/orders/status', { method: 'POST', token: admin, body: { orderId: id, status } }));
    for (const id of [o1.id, o2.id]) for (const st of ['preparing', 'delivered']) assert.equal((await set(id, st)).status, 200);
    await set(o3.id, 'cancelled');
    await call(wheelSpin, t.ctx, req('/api/wheel/spin', { method: 'POST', token: a.token, body: {} }));
    const r = await call(report, t.ctx, req('/api/admin/report', { token: admin }));
    assert.equal(r.status, 200, JSON.stringify(r));
    const food1 = t.store.list('orders').find(o => o.number === o1.number), food2 = t.store.list('orders').find(o => o.number === o2.number);
    const expected = Math.round(((food1.total - food1.deliveryFee + food1.deliveryDiscount) + (food2.total - food2.deliveryFee + food2.deliveryDiscount)) * 100) / 100;
    assert.deepEqual([r.delivered, r.cancelled, r.subscribers, r.newCustomers, r.spins], [2, 1, 3, 2, 1]);
    assert.equal(r.sales, expected, 'delivery fees are not part of the sales');
    assert.equal(r.commission, Math.round(expected * 10) / 100, '10% of the sales');
    assert.equal(r.average, Math.round(expected / 2 * 100) / 100);
    assert.equal(r.days.length, 1);
    assert.equal((await call(report, t.ctx, req('/api/admin/report?month=2001-01', { token: admin }))).delivered, 0, 'other months are empty');
    assert.equal((await call(report, t.ctx, req('/api/admin/report?month=nope', { token: admin }))).status, 400);
    assert.equal((await call(report, t.ctx, req('/api/admin/report', { token: googleToken('x') }))).status, 401);
  } finally { await t.close(); }
});
