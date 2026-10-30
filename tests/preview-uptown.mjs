// Screenshots of an Uptown-style site (placeholder colours/photos) on the local stack.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import '../public/js/pricing.js';
import '../public/js/i18n.js';
import { startDevServer, FIREBASE_STUBS } from './dev-server.mjs';
import { buildUptownConfig } from './uptown-config.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const c = buildUptownConfig();
const dev = await startDevServer({ config: c });
{
  // the real Uptown logo, uploaded through the admin API like the owner would
  const r = await fetch(dev.url + '/api/auth/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'test-admin-password' }) });
  const { idTokenFromCustom } = await import('./fake-backend.mjs');
  const tok = idTokenFromCustom((await r.json()).token);
  const up = await fetch(dev.url + '/api/admin/upload', { method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'image/png' }, body: fs.readFileSync(process.env.LOGO || '/tmp/claude-0/-home-user-L/2f743abf-40fa-5767-ae8c-78be4ba8bddf/scratchpad/uptown/logo.png') });
  const cfg = JSON.parse(await dev.env.STORE.get('config')); cfg.settings.logo = (await up.json()).url; await dev.env.STORE.put('config', JSON.stringify(cfg));
}
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => { const m = r.request().url().match(/firebase-(\w+)\.js/); r.fulfill({ contentType: 'text/javascript', body: FIREBASE_STUBS[m[1]] || 'export {}' }); });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
const page = await ctx.newPage();
const shot = (n, full = false) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: full });
await page.goto(dev.url + '/branches'); await page.waitForSelector('.branch-card, [href*="menu"]', { timeout: 8000 }).catch(() => {});
await page.evaluate(() => localStorage.setItem('selected_branch', 'irsal'));
await page.goto(dev.url + '/'); await page.waitForSelector('#wheelBanner'); await page.waitForTimeout(600); await shot('1-home');
await page.goto(dev.url + '/menu'); await page.waitForSelector('#wheelBanner'); await page.waitForTimeout(600); await shot('2-menu');
await page.click('#wheelBanner'); await page.waitForSelector('#plPhone'); await page.waitForTimeout(500); await shot('3-wheel-login');
await page.fill('#plPhone', '0597101010'); await page.click('#plConfirm'); await page.waitForSelector('#plOtpBox:not(.hidden)'); await shot('4-otp');
const code = (await page.textContent('#plDev')).match(/\d{5}/)[0];
await page.fill('#plCode', code); await page.click('#plVerify'); await page.waitForSelector('.wheel-spin'); await page.waitForTimeout(400); await shot('5-wheel-ready');
await page.click('.wheel-spin'); await page.waitForSelector('.wheel-won', { timeout: 15000 }); await page.waitForTimeout(2800); await shot('6-wheel-won');
await page.click('#wheelClose');
await page.evaluate(() => localStorage.setItem('cart_irsal', JSON.stringify([{ productId: 'steak', qty: 3, selections: {}, notes: '' }, { productId: 'crispy', qty: 1, selections: {}, notes: '' }])));
// a second, fresh visitor: type -> number -> Confirm -> fields appear
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx2.route('https://www.gstatic.com/firebasejs/**', r => { const m = r.request().url().match(/firebase-(\w+)\.js/); r.fulfill({ contentType: 'text/javascript', body: FIREBASE_STUBS[m[1]] || 'export {}' }); });
await ctx2.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
const p2 = await ctx2.newPage();
await p2.goto(dev.url + '/privacy');
await p2.evaluate(() => { localStorage.setItem('selected_branch', 'irsal'); localStorage.setItem('cart_irsal', JSON.stringify([{ productId: 'steak', qty: 3, selections: {}, notes: '' }, { productId: 'crispy', qty: 1, selections: {}, notes: '' }])); });
await p2.goto(dev.url + '/checkout'); await p2.waitForSelector('#plPhone'); await p2.waitForTimeout(500);
await p2.screenshot({ path: `${OUT}/7-checkout-before-number.png` });
await p2.fill('#plPhone', '0591234567'); await p2.click('#plConfirm'); await p2.waitForSelector('#plOtpBox:not(.hidden)');
const c2 = (await p2.textContent('#plDev')).match(/\d{5}/)[0];
await p2.fill('#plCode', c2); await p2.click('#plVerify'); await p2.waitForSelector('#checkoutForm:not(.hidden)');
await p2.click('#deliveryTab'); await p2.fill('#custName', 'محمد'); await p2.waitForTimeout(500);
await p2.screenshot({ path: `${OUT}/8-checkout-after-number.png`, fullPage: true });
await browser.close(); await dev.close();
console.log('done');
