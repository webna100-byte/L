// Browser smoke test (mobile viewport) against the local stack used by
// tests/api.test.mjs. Firebase's browser SDK is served from a local copy
// of the `firebase` npm package (FIREBASE_PKG=<dir>/package), so it also
// runs where gstatic.com is unreachable.
// Run: PLAYWRIGHT=<path to playwright> FIREBASE_PKG=<dir> node tests/ui.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import '../public/js/i18n.js';

const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT || 'playwright');
const SITE = process.env.SITE || 'http://127.0.0.1:8788';
const PKG = process.env.FIREBASE_PKG;
const SHOTS = process.env.SHOTS || '';

const browser = await chromium.launch();
async function context() {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/^https:\/\//, async route => {
    const url = new URL(route.request().url());
    const m = url.hostname === 'www.gstatic.com' && url.pathname.match(/\/firebasejs\/[\d.]+\/(.+\.js)$/);
    if (m && PKG && fs.existsSync(path.join(PKG, m[1]))) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(PKG, m[1])) });
    return route.abort();
  });
  return ctx;
}
const errors = [];
function watch(page, who) {
  page.on('pageerror', e => errors.push(`${who}: ${e.message}`));
}
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true }); };
let passed = 0;
async function step(name, fn) { await fn(); passed++; console.log('✓', name); }

// clean slate, then staff setup through the API
await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-test/databases/(default)/documents', { method: 'DELETE' });
const adminTok = await (async () => {
  const r = await (await fetch(SITE + '/api/auth/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'test1234' }) })).json();
  const ex = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: r.token, returnSecureToken: true }) })).json();
  return ex.idToken;
})();
const site = await (await fetch(SITE + '/api/site')).json();
const branchId = site.config.branches[0].id;
const uname = 'ui' + Date.now().toString(36);
await fetch(SITE + '/api/admin/cashiers', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminTok }, body: JSON.stringify({ name: 'UI', username: uname, password: 'secret12', branchId }) });

/* ---------- customer ---------- */
const cctx = await context();
const cust = await cctx.newPage();
watch(cust, 'customer');

await step('home renders restaurant data in the site language, no language switch', async () => {
  await cust.goto(SITE + '/', { waitUntil: 'load' });
  await cust.waitForSelector('#appSplash', { state: 'detached' });
  assert.equal(await cust.getAttribute('html', 'lang'), site.config.settings.lang || 'en');
  assert.equal(await cust.getAttribute('html', 'dir'), 'ltr');
  assert.equal(await cust.locator('#langBtn').count(), 0);
  assert.ok(await cust.isVisible('#homeGoogleBtn'));
  assert.equal(await cust.locator('.bn-item').count(), 5);
});

await step('cart -> checkout requires sign-in', async () => {
  await cust.goto(SITE + '/branches', { waitUntil: 'load' });
  await cust.click(`.branch-card[data-id="${branchId}"]`);
  await cust.waitForSelector('.product-card');
  await cust.click('.product-card');
  await cust.click('#addToCartBtn');
  await cust.goto(SITE + '/cart', { waitUntil: 'load' });
  await cust.click('#checkoutBtn');
  await cust.waitForURL(/\/login\?next=/);
});

await step('Google sign-in (emulator credential) and back to checkout', async () => {
  await cust.evaluate(async () => {
    const { m, auth } = await FB.auth();
    await m.signInWithCredential(auth, m.GoogleAuthProvider.credential(JSON.stringify({ sub: 'ui-user', email: 'ui@example.com', email_verified: true, name: 'Sara Ahmad' })));
  });
  await cust.goto(SITE + '/checkout', { waitUntil: 'load' });
  await cust.waitForSelector('#checkoutForm');
  assert.equal(await cust.inputValue('#custName'), 'Sara Ahmad');
});

await step('place order', async () => {
  await cust.fill('#custPhone', '+34 612 34 56 78');
  await shot(cust, 'ui-checkout');
  await cust.click('#sendBtn');
  await cust.waitForSelector('.success-card', { timeout: 15000 });
  await shot(cust, 'ui-success');
});

await step('my orders shows the order as pending (live)', async () => {
  await cust.goto(SITE + '/orders', { waitUntil: 'load' });
  await cust.waitForSelector('.order-card.status-pending', { timeout: 15000 });
});

/* ---------- cashier ---------- */
const kctx = await context();
const cashier = await kctx.newPage();
watch(cashier, 'cashier');

await step('cashier signs in and sees the new order with the alarm', async () => {
  await cashier.goto(SITE + '/cashier/login', { waitUntil: 'load' });
  await cashier.fill('#username', uname);
  await cashier.fill('#password', 'secret12');
  await cashier.click('#loginBtn');
  await cashier.waitForURL(/\/cashier\/$/);
  // the start button only works once the panel has loaded (its label is set then)
  await cashier.waitForFunction(() => document.getElementById('shiftNote').textContent.length > 0);
  await cashier.click('#shiftBtn');
  await cashier.waitForSelector('.staff-order.is-new', { timeout: 15000 });
  assert.ok(await cashier.isVisible('#alarm.show'), 'alarm must ring while an order is pending');
  await shot(cashier, 'ui-cashier-new');
});

await step('accept stops the alarm; customer sees "preparing" live', async () => {
  await cashier.click('[data-act="preparing"]');
  await cashier.waitForSelector('#alarm:not(.show)', { state: 'attached', timeout: 10000 });
  await cust.waitForSelector('.order-card.status-preparing', { timeout: 15000 });
});

await step('delivered -> customer sees points added', async () => {
  await cashier.click('[data-tab="preparing"]');
  await cashier.click('[data-act="delivered"]');
  await cust.waitForSelector('.order-card.status-delivered .order-points .ok', { timeout: 15000 });
  await shot(cust, 'ui-orders-delivered');
});

/* ---------- admin ---------- */
const actx = await context();
const admin = await actx.newPage();
watch(admin, 'admin');
await step('admin signs in and sees the order in the live list', async () => {
  await admin.goto(SITE + '/admin/login', { waitUntil: 'load' });
  await admin.fill('#password', 'test1234');
  await admin.click('#loginBtn');
  await admin.waitForSelector('.staff-order', { timeout: 15000 });
  await shot(admin, 'ui-admin-orders');
});
await step('admin sections render', async () => {
  for (const key of ['loyalty', 'discounts', 'pages', 'cashiers', 'products', 'general']) {
    await admin.click(`.admin-mobile-nav [data-key="${key}"]`);
    await admin.waitForTimeout(400);
    await shot(admin, 'ui-admin-' + key);
  }
});

/* ---------- demo site in Spanish ---------- */
const DEMO = 'ui-demo-' + Date.now().toString(36);
await step('super admin creates a Spanish demo from the Demo sites section', async () => {
  await admin.click('.admin-mobile-nav [data-key="sites"]');
  await admin.waitForSelector('#dsName');
  await admin.fill('#dsName', 'Casa Pepe');
  await admin.fill('#dsSlug', DEMO);
  await admin.selectOption('#dsLang', 'es');
  await admin.fill('#dsPass', 'pepe123');
  await admin.click('#dsCreate');
  await admin.waitForSelector(`[data-copy="${DEMO}"]`, { timeout: 15000 });
  await shot(admin, 'ui-admin-sites');
});

const dctx = await context();
const visitor = await dctx.newPage();
watch(visitor, 'demo visitor');
await step('the /s/ link opens the demo in Spanish with euro prices', async () => {
  await visitor.goto(SITE + '/s/' + DEMO, { waitUntil: 'load' });
  await visitor.waitForURL(SITE + '/');
  await visitor.waitForSelector('#appSplash', { state: 'detached' });
  assert.equal(await visitor.getAttribute('html', 'lang'), 'es');
  assert.equal(await visitor.textContent('#heroTitle'), 'Casa Pepe');
  assert.match(await visitor.textContent('.bn-item.bn-home'), /Inicio/);
  await shot(visitor, 'ui-demo-home');
  await visitor.goto(SITE + '/branches', { waitUntil: 'load' });
  await visitor.click(`.branch-card[data-id="${branchId}"]`);
  await visitor.waitForSelector('.product-card');
  assert.match(await visitor.textContent('.menu-category-title'), /Hamburguesas/);
  assert.match(await visitor.textContent('.product-card .product-price'), /9,50\s€/);
  await visitor.click('.product-card');
  await visitor.waitForSelector('#addToCartBtn');
  assert.match(await visitor.textContent('#addToCartBtn'), /Añadir al carrito/);
  await shot(visitor, 'ui-demo-product');
});

await step('demo admin password opens a Spanish admin panel without Demo sites', async () => {
  await visitor.goto(SITE + '/admin/login', { waitUntil: 'load' });
  await visitor.fill('#password', 'pepe123');
  await visitor.click('#loginBtn');
  await visitor.waitForSelector('.admin-mobile-nav [data-key="orders"]', { timeout: 15000 });
  assert.equal(await visitor.getAttribute('html', 'lang'), 'es');
  assert.match(await visitor.textContent('.admin-mobile-nav [data-key="orders"]'), /Pedidos/);
  assert.equal(await visitor.locator('.admin-mobile-nav [data-key="sites"]').count(), 0);
  await visitor.click('.admin-mobile-nav [data-key="products"]');
  await visitor.waitForTimeout(400);
  await shot(visitor, 'ui-demo-admin-products');
});

await step('main site is unchanged after visiting the demo', async () => {
  await cust.goto(SITE + '/', { waitUntil: 'load' });
  await cust.waitForSelector('#appSplash', { state: 'detached' });
  assert.notEqual(await cust.textContent('#heroTitle'), 'Casa Pepe');
});

await browser.close();
assert.deepEqual(errors, [], 'no uncaught page errors');
console.log(`\n${passed} UI checks passed`);
