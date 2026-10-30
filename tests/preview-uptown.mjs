// Screenshots of an Uptown-style site (placeholder colours/photos) on the local stack.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import '../public/js/pricing.js';
import '../public/js/i18n.js';
import { startDevServer, FIREBASE_STUBS } from './dev-server.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const seed = JSON.parse(fs.readFileSync(new URL('../public/seed/demo-config.json', import.meta.url)));
const c = globalThis.localizeConfig(seed, 'ar');
Object.assign(c.settings, { lang: 'ar', currency: 'ILS', timezone: 'Asia/Hebron', restaurantName: 'أبتاون برغر آند وينغز', multiBranch: true, minimumOrder: 0, phone: '+970 597 101 010', address: 'رام الله', auth: { country: 'PS' } });
delete c.settings.defaultLang;
Object.assign(c.settings.colors.secondary, { type: 'gradient', color1: '#b3121f', color2: '#f0541f' });
c.settings.homepage.hero.title = 'أبتاون برغر آند وينغز'; c.settings.homepage.hero.eyebrow = 'رام الله'; c.settings.homepage.hero.text = 'برغر وأجنحة طازجة، اطلب الآن للاستلام أو التوصيل.';
const zones = [{ id: 'z1', name: 'رام الله والبيرة', price: 15 }];
c.branches = [
  { ...c.branches[0], id: 'irsal', name: 'الإرسال', deliveryZones: zones.map(z => ({ ...z, id: 'z_irsal' })) },
  { ...c.branches[1], id: 'tira', name: 'الطيرة', deliveryZones: zones.map(z => ({ ...z, id: 'z_tira' })) }
];
const P = (id, cat, name, price, img, d = '') => ({ id, categoryId: cat, name, description: d, price, image: `/demo/${img}.webp`, discountPercent: 0, branchIds: [], optionGroups: [] });
c.categories = [
  { id: 'burgers', name: 'برغر', image: '/demo/cat_burgers.webp', branchIds: [], order: 0 },
  { id: 'wings', name: 'أجنحة', image: '/demo/prod_crispy_chicken.webp', branchIds: [], order: 1 },
  { id: 'sides', name: 'بطاطا', image: '/demo/cat_salads.webp', branchIds: [], order: 2 },
  { id: 'drinks', name: 'مشروبات', image: '/demo/cat_drinks.webp', branchIds: [], order: 3 }
];
c.products = [
  P('crispy', 'burgers', 'كرسبي تشيكن برغر', 25, 'prod_crispy_chicken', 'دجاج مقرمش مع صوص البيت'),
  P('steak', 'burgers', 'ستيك برغر', 36, 'prod_double_cheese', 'قطعة ستيك مع جبنة'),
  P('hawaii', 'burgers', 'هاواي برغر', 30, 'prod_classic_burger', 'مع الأناناس والجبنة'),
  P('onion', 'burgers', 'برغر البصل المكرمل', 30, 'prod_classic_burger', 'بصل مكرمل وصوص خاص'),
  P('veggie', 'burgers', 'برغر نباتي', 30, 'prod_veggie', 'خضار طازجة'),
  P('wings6', 'wings', 'أجنحة (6 قطع)', 28, 'prod_crispy_chicken', 'سعر مؤقت'),
  P('fries', 'sides', 'بطاطا', 12, 'prod_house_salad', 'سعر مؤقت'),
  P('cola', 'drinks', 'مشروب', 7, 'prod_cola', 'سعر مؤقت')
];
c.loyalty.tiers = []; c.loyalty.enabled = false;
c.settings.slider = { images: ['/demo/slide1.webp', '/demo/slide2.webp', '/demo/slide3.webp'], intervalSeconds: 3 };
c.settings.homepage.featured.selectedIds = ['crispy', 'steak', 'hawaii', 'onion'];
c.settings.homepage.categories.selectedIds = ['burgers', 'wings', 'sides', 'drinks'];
c.version = 1;
c.wheel = { enabled: true, title: 'لف العجلة واربح!', minOrder: 100, validHours: 0, weeklyBigCap: 10, prizes: [
  { id: 'drink', label: 'مشروب', type: 'product', productId: 'cola', weight: 35, big: false },
  { id: 'fries', label: 'بطاطا', type: 'product', productId: 'fries', weight: 30, big: false },
  { id: 'd10', label: 'خصم 10%', type: 'percent', value: 10, weight: 20, big: false },
  { id: 'wings', label: 'أجنحة', type: 'product', productId: 'wings6', weight: 12, big: true },
  { id: 'classic', label: 'كلاسيك برغر', type: 'product', productId: 'hawaii', weight: 3, big: true }
] };
const dev = await startDevServer({ config: c });
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
