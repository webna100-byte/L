// Browser test of the phone sign-in, checkout flow and wheel against the real
// pages + functions (in-memory backends, Firebase SDK stubbed).
//   NODE_PATH=$(npm root -g) node tests/e2e-phone-wheel.mjs [outDir]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import '../public/js/pricing.js';
import '../public/js/i18n.js';
import { startDevServer, FIREBASE_STUBS } from './dev-server.mjs';
import { idTokenFromCustom, googleToken } from './fake-backend.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const OUT = process.argv[2] || '/tmp/e2e';
fs.mkdirSync(OUT, { recursive: true });
const seed = JSON.parse(fs.readFileSync(new URL('../public/seed/demo-config.json', import.meta.url)));
const config = globalThis.localizeConfig(seed, 'ar');
config.version = 1;
config.settings.lang = 'ar'; delete config.settings.defaultLang;
config.settings.auth = { mode: 'phone', country: 'PS' };
config.settings.timezone = 'Asia/Hebron';
config.settings.currency = 'ILS';
config.settings.multiBranch = false;
config.wheel = { enabled: true, title: 'لف العجلة واربح!', minOrder: 20, validHours: 0, weeklyBigCap: 10, prizes: [
  { id: 'drink', label: 'مشروب', type: 'product', productId: 'prod_cola', weight: 1, big: false },
  { id: 'lemon', label: 'ليموناضة', type: 'product', productId: 'prod_lemonade', weight: 1, big: false },
  { id: 'd10', label: 'خصم 10%', type: 'percent', value: 10, weight: 1, big: false },
  { id: 'chk', label: 'دجاج كرسبي', type: 'product', productId: 'prod_crispy_chicken', weight: 1, big: true },
  { id: 'cls', label: 'كلاسيك برغر', type: 'product', productId: 'prod_classic_burger', weight: 1, big: true }
] };

const dev = await startDevServer({ config });
const browser = await chromium.launch();
const errors = [];
async function newPage(ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, ...ctxOpts });
  await ctx.route('https://www.gstatic.com/firebasejs/**', route => {
    const m = route.request().url().match(/firebase-(\w+)\.js/);
    route.fulfill({ contentType: 'text/javascript', body: FIREBASE_STUBS[m[1]] || 'export {}' });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push('console: ' + m.text()); });
  return { ctx, page };
}
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` });
let n = 0; const step = async (name, fn) => { await fn(); n++; console.log('✓', name); };
const cartWith = async (page, productId, qty) => { if (page.url() === 'about:blank') await page.goto(dev.url + '/privacy'); return page.evaluate(([id, q]) => { localStorage.setItem('cart_branch_downtown', JSON.stringify([{ productId: id, qty: q, selections: {}, notes: '' }])); localStorage.setItem('selected_branch', 'branch_downtown'); }, [productId, qty]); };

try {
  /* ---- 1. new visitor: banner, floating button, wheel, phone sign-in, free spin ---- */
  const A = await newPage();
  await step('home shows the wheel banner and the floating button', async () => {
    await A.page.goto(dev.url + '/');
    await A.page.waitForSelector('#wheelBanner'); await A.page.waitForSelector('#wheelFab');
    assert.match(await A.page.textContent('#wheelBanner'), /لف العجلة واربح/);
    await shot(A.page, '01-home');
  });
  await step('menu page also has the banner', async () => {
    await A.page.goto(dev.url + '/menu'); await A.page.waitForSelector('#wheelBanner'); await shot(A.page, '02-menu');
  });
  await step('wheel opens; signed out it asks for the number (no Google button)', async () => {
    await A.page.click('#wheelBanner'); await A.page.waitForSelector('#wheelOverlay.open #plPhone');
    assert.equal(await A.page.locator('.btn-google, [id*=oogle]').count(), 0);
    await shot(A.page, '03-wheel-login');
  });
  await step('new number: confirm -> code box -> wrong code rejected -> right code signs in', async () => {
    await A.page.fill('#plPhone', '059 123 4567'); await A.page.click('#plConfirm');
    await A.page.waitForSelector('#plOtpBox:not(.hidden)');
    const dev1 = (await A.page.textContent('#plDev')).match(/\d{5}/)[0];
    await A.page.fill('#plCode', dev1 === '00000' ? '11111' : '00000'); await A.page.click('#plVerify');
    await A.page.waitForSelector('#plError:not(.hidden)');
    assert.match(await A.page.textContent('#plError'), /غير صحيح/);
    await shot(A.page, '04-otp');
    await A.page.fill('#plCode', dev1); await A.page.click('#plVerify');
    await A.page.waitForSelector('.wheel-spin');
    await shot(A.page, '05-wheel-ready');
  });
  let prizeLabel;
  await step('free spin: wheel turns, a prize and code appear, the spin is used up', async () => {
    await A.page.click('.wheel-spin');
    await A.page.waitForSelector('#wheelResult:not(.hidden) .wheel-won', { timeout: 15000 });
    prizeLabel = await A.page.textContent('.wheel-won strong');
    assert.equal(await A.page.locator('.wheel-code').count(), 0, 'no code is shown to the customer');
    assert.match(await A.page.textContent('.wheel-won'), /تلقائي/);
    await shot(A.page, '06-wheel-won');
    await A.page.waitForSelector('#wheelActions .wheel-wait');
    assert.equal(await A.page.locator('.wheel-spin').count(), 0, 'only one spin a day');
    assert.equal(await A.page.locator('.wheel-prize-row').count(), 1);
  });
  await step('there is no share button and no code is shown', async () => {
    assert.equal(await A.page.locator('#wheelShare').count(), 0);
  });
  await step('checkout: prize applied automatically, summary shows it', async () => {
    await A.page.click('#wheelClose');
    await cartWith(A.page, 'prod_classic_burger', 3);
    await A.page.goto(dev.url + '/checkout');
    await A.page.waitForSelector('.phone-confirmed');
    await A.page.waitForSelector('.prize-box');
    assert.match(await A.page.textContent('.prize-box'), new RegExp(prizeLabel.trim().slice(0, 4)));
    await shot(A.page, '07-checkout-prize');
  });
  await step('placing the order uses the prize and saves name + address on the number', async () => {
    await A.page.click('#deliveryTab');
    await A.page.fill('#custName', 'أحمد');
    await A.page.selectOption('#custZone', { index: 1 });
    await A.page.fill('#custAddress', 'رام الله، الإرسال');
    await A.page.click('#sendBtn');
    await A.page.waitForSelector('.success-card', { timeout: 15000 });
    await shot(A.page, '08-order-sent');
    const prizes = dev.store.list('prizes'); assert.equal(prizes.filter(p => p.used).length, 1);
    const u = dev.store.list('users')[0]; assert.deepEqual([u.name, u.address], ['أحمد', 'رام الله، الإرسال']);
  });
  await A.ctx.close();

  /* ---- 2. checkout order: type -> number -> Confirm -> the rest ---- */
  const B = await newPage();
  await step('fresh visitor at checkout sees the type tabs first, then the number box, no other fields', async () => {
    await cartWith(B.page, 'prod_classic_burger', 2);
    await B.page.goto(dev.url + '/checkout');
    await B.page.waitForSelector('#phoneGate #plPhone');
    const order = await B.page.evaluate(() => [...document.querySelectorAll('.order-type-tabs, #phoneGate, #checkoutForm')].map(e => e.id || e.className.split(' ')[0]));
    assert.deepEqual(order, ['order-type-tabs', 'phoneGate', 'checkoutForm']);
    assert.ok(await B.page.locator('#checkoutForm').evaluate(e => e.classList.contains('hidden')));
    await shot(B.page, '09-checkout-gate');
  });
  await step('a known number signs in with no code and the saved name/address are filled (and editable)', async () => {
    await B.page.fill('#plPhone', '0591234567'); await B.page.click('#plConfirm');
    await B.page.waitForSelector('#checkoutForm:not(.hidden)');
    assert.equal(await B.page.locator('#plOtpBox').count(), 0, 'no code step for a known number');
    assert.equal(await B.page.inputValue('#custName'), 'أحمد');
    await B.page.click('#deliveryTab');
    assert.equal(await B.page.inputValue('#custAddress'), 'رام الله، الإرسال');
    await B.page.fill('#custName', 'أحمد سليم');
    await shot(B.page, '10-checkout-known');
    await B.page.selectOption('#custZone', { index: 1 });
    await B.page.click('#sendBtn'); await B.page.waitForSelector('.success-card', { timeout: 15000 });
    assert.equal(dev.store.list('users')[0].name, 'أحمد سليم', 'edits update the saved profile');
    assert.equal(dev.store.list('orders').length, 2);
  });
  await B.ctx.close();

  /* ---- 3. a different new number: fields start empty, "change number" works ---- */
  const C = await newPage();
  await step('new number at checkout: code, then empty name/address; change number goes back', async () => {
    await cartWith(C.page, 'prod_cola', 3);
    await C.page.goto(dev.url + '/checkout');
    await C.page.fill('#plPhone', '056-777-8888'); await C.page.click('#plConfirm');
    await C.page.waitForSelector('#plOtpBox:not(.hidden)');
    const code = (await C.page.textContent('#plDev')).match(/\d{5}/)[0];
    await C.page.fill('#plCode', code); await C.page.click('#plVerify');
    await C.page.waitForSelector('#checkoutForm:not(.hidden)');
    assert.equal(await C.page.inputValue('#custName'), '');
    assert.equal((await C.page.textContent('.phone-confirmed strong')).trim(), '056 777 8888', 'the number is shown as typed locally, with no country prefix');
    assert.ok(!/مسجّل/.test(await C.page.textContent('.phone-confirmed')), 'no wording in front of the number');
    await shot(C.page, '11-checkout-new');
    await C.page.click('#changePhone');
    await C.page.waitForSelector('#phoneGate #plPhone');
    assert.ok(await C.page.locator('#checkoutForm').evaluate(e => e.classList.contains('hidden')));
  });
  await C.ctx.close();

  /* ---- 4. login page ---- */
  const D = await newPage();
  await step('/login shows the number box and returns to the page you came from', async () => {
    await D.page.goto(dev.url + '/login?next=/menu');
    await D.page.waitForSelector('#plPhone'); await shot(D.page, '12-login');
    await D.page.fill('#plPhone', '0591234567'); await D.page.click('#plConfirm');
    await D.page.waitForURL('**/menu');
  });
  await D.ctx.close();

  /* ---- 5. admin: wheel section ---- */
  const E = await newPage({ viewport: { width: 1100, height: 900 } });
  await step('admin wheel section lists the prizes and shows results', async () => {
    const r = await fetch(dev.url + '/api/auth/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'test-admin-password' }) });
    const { token } = await r.json();
    const idToken = idTokenFromCustom(token);
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    await E.page.addInitScript(u => localStorage.setItem('stub_user_staff', JSON.stringify(u)), { uid: claims.uid, idToken, claims: claims.claims });
    await E.page.goto(dev.url + '/admin');
    await E.page.waitForSelector('[data-key="wheel"]');
    await E.page.click('[data-key="wheel"]');
    await E.page.waitForSelector('.wheel-row');
    assert.equal(await E.page.locator('.wheel-row').count(), 5);
    await E.page.waitForSelector('.stat-grid');
    await shot(E.page, '13-admin-wheel');
    await E.page.click('[data-key="general"]'); await E.page.waitForSelector('#aCountry'); await shot(E.page, '14-admin-signin');
  });
  await E.ctx.close();
  /* ---- 6. a normal (Google) site: Google button, then name AND phone are required at checkout ---- */
  const dev2 = await startDevServer({ config: (() => { const g = JSON.parse(JSON.stringify(config)); g.settings.auth = {}; delete g.wheel; return g; })() });
  const G = await newPage();
  try {
    await step('Google site: sign-in button on /login, no number box', async () => {
      await G.page.goto(dev2.url + '/login'); await G.page.waitForSelector('#googleBtn');
      assert.equal(await G.page.locator('#plPhone').count(), 0);
      await G.page.goto(dev2.url + '/'); await G.page.waitForSelector('#homeGoogleBtn');
      assert.equal(await G.page.locator('#wheelBanner').count(), 0, 'no wheel unless the site turns it on');
    });
    await step('Google site: checkout asks the name and the phone number (both required)', async () => {
      await G.page.evaluate(async t => { localStorage.setItem('stub_user_[DEFAULT]', JSON.stringify({ uid: 'g1', idToken: t, claims: {} })); localStorage.setItem('cart_branch_downtown', JSON.stringify([{ productId: 'prod_classic_burger', qty: 3, selections: {}, notes: '' }])); localStorage.setItem('selected_branch', 'branch_downtown'); }, googleToken('g1'));
      await G.page.goto(dev2.url + '/checkout'); await G.page.waitForSelector('#custName');
      assert.equal(await G.page.locator('#phoneGate').count(), 0);
      assert.ok(await G.page.locator('#custPhone').count() === 1);
      await G.page.fill('#custName', 'Ann'); await G.page.click('#sendBtn');
      await G.page.waitForSelector('#formError:not(.hidden)'); // phone missing
      await G.page.fill('#custPhone', '+34 600 111 222'); await G.page.click('#sendBtn');
      await G.page.waitForSelector('.success-card', { timeout: 15000 });
      assert.equal(dev2.store.list('orders')[0].customer.phone, '+34 600 111 222');
      await shot(G.page, '16-google-checkout-done');
    });
  } finally { await G.ctx.close(); await dev2.close(); }
  assert.deepEqual(errors, [], 'no browser errors: ' + errors.join('\n'));
  console.log(`\n${n} browser checks passed`);
} finally {
  await browser.close(); await dev.close();
}
