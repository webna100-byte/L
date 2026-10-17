// Pure-logic tests (no services needed): node --test tests/unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../public/js/pricing.js';
import '../public/js/i18n.js';
import { statusEffects, dayKey, orderId, statusMessage } from '../functions/_lib/orders.js';
import { siteOf, kvKey, validSlug, siteTopic } from '../functions/_lib/site.js';

const P = globalThis.Pricing;
const seed = JSON.parse(fs.readFileSync(new URL('../public/seed/demo-config.json', import.meta.url)));
const demo = globalThis.localizeConfig(seed, 'en');
const base = { branchId: 'branch_downtown', type: 'pickup', items: [], gifts: [] };

test('subtotal, invoice range discount, tax, points', () => {
  const q = P.computeOrder(demo, { ...base, items: [{ productId: 'prod_classic_burger', qty: 6 }] }, { lifetimePoints: 0 });
  assert.equal(q.subtotal, 57);
  assert.equal(q.invoiceDiscount, 2.85);
  assert.equal(q.tax, 0); // demo prices include VAT
  assert.equal(q.total, 54.15);
  assert.equal(q.pointsEarned, 54);
  const taxed = P.computeOrder({ ...demo, settings: { ...demo.settings, taxRate: 2 } }, { ...base, items: [{ productId: 'prod_classic_burger', qty: 6 }] }, {});
  assert.equal(taxed.tax, 1.08);
  assert.equal(taxed.total, 55.23);
});

test('delivery: zone required, percent and free delivery ranges', () => {
  assert.throws(() => P.computeOrder(demo, { ...base, type: 'delivery', items: [{ productId: 'prod_cola', qty: 1 }] }, {}), /zone_required/);
  const zone = demo.branches[0].deliveryZones[0];
  const half = P.computeOrder(demo, { ...base, type: 'delivery', zoneId: zone.id, items: [{ productId: 'prod_classic_burger', qty: 4 }] }, {}); // 38 -> 50% off delivery
  assert.equal(half.deliveryFee, 4.5);
  assert.equal(half.deliveryDiscount, 2.25);
  const free = P.computeOrder(demo, { ...base, type: 'delivery', zoneId: zone.id, items: [{ productId: 'prod_classic_burger', qty: 6 }] }, {});
  assert.equal(free.deliveryDiscount, free.deliveryFee);
  // delivery fee never earns points
  assert.equal(free.pointsEarned, P.computeOrder(demo, { ...base, items: [{ productId: 'prod_classic_burger', qty: 6 }] }, {}).pointsEarned);
});

test('level discount uses lifetime points and stacks after the invoice discount', () => {
  const q = P.computeOrder(demo, { ...base, items: [{ productId: 'prod_classic_burger', qty: 6 }] }, { lifetimePoints: 1000 });
  assert.equal(q.level.id, 'gold');
  assert.equal(q.levelDiscount, 5.42); // 10% of 54.15
  assert.equal(P.levelFor(demo.loyalty, 299), null);
  assert.equal(P.levelFor(demo.loyalty, 2500).id, 'diamond');
});

test('gifts: several, same gift twice, unknown gift rejected', () => {
  const q = P.computeOrder(demo, { ...base, gifts: [{ giftId: 'gift_cola', qty: 2 }, { giftId: 'gift_brownie', qty: 1 }] }, {});
  assert.equal(q.giftPoints, 450);
  assert.equal(q.total, 0);
  assert.throws(() => P.computeOrder(demo, { ...base, gifts: [{ giftId: 'nope', qty: 1 }] }, {}), /invalid_gift/);
});

test('options are validated against the product', () => {
  const product = { id: 'p', price: 5, optionGroups: [
    { id: 'size', type: 'single_price', options: [{ id: 's', priceDelta: 5 }, { id: 'l', priceDelta: 7 }] },
    { id: 'extra', type: 'multi_priced', options: [{ id: 'cheese', priceDelta: 1 }] }
  ] };
  assert.equal(P.unitPrice(product, { size: 'l', extra: ['cheese'] }, 2).price, 8);
  assert.equal(P.unitPrice(product, {}, 2).price, 5);
  assert.throws(() => P.unitPrice(product, { extra: ['bacon'] }, 2), /invalid_option/);
});

test('three-decimal currencies round correctly', () => {
  assert.equal(P.currencyDecimals('KWD'), 3);
  assert.equal(P.round(1.23456, 3), 1.235);
});

test('status effects: points once on delivery, gift refund once on cancel', () => {
  const o = { status: 'pending', pointsEarned: 10, giftPoints: 100 };
  assert.deepEqual(statusEffects(o, 'preparing'), { pointsAwarded: false, giftRefunded: false, points: 0, lifetime: 0, needPoints: 0 });
  const d = statusEffects({ ...o, status: 'preparing' }, 'delivered');
  assert.equal(d.points, 10); assert.equal(d.lifetime, 10); assert.equal(d.pointsAwarded, true);
  assert.equal(statusEffects({ ...o, status: 'delivered', pointsAwarded: true }, 'delivered').points, 0);
  const c = statusEffects({ ...o, status: 'pending' }, 'cancelled');
  assert.equal(c.points, 100); assert.equal(c.giftRefunded, true);
  const reopen = statusEffects({ ...o, status: 'cancelled', giftRefunded: true }, 'pending');
  assert.equal(reopen.points, -100); assert.equal(reopen.needPoints, 100);
});

test('order ids sort newest first; day key uses the restaurant time zone', () => {
  assert.ok(orderId(2000) < orderId(1000));
  assert.equal(dayKey(Date.UTC(2026, 0, 1, 22, 0), 'Asia/Kuwait'), '2026-01-02');
});

test('demo seed: every text exists in every site language', () => {
  const langs = Object.keys(globalThis.SITE_LANGS);
  let maps = 0;
  (function walk(v, path) {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`));
    if (!v || typeof v !== 'object') return;
    if (v.en !== undefined && typeof v.en === 'string') {
      maps++;
      for (const l of langs) assert.ok(v[l], `${path} is missing "${l}"`);
      return;
    }
    for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  })(seed, '');
  assert.ok(maps > 80);
});

test('localizeConfig turns the seed into plain single-language text', () => {
  const es = globalThis.localizeConfig(seed, 'es');
  assert.equal(es.categories[0].name, 'Hamburguesas');
  assert.equal(es.products[3].optionGroups[0].name, 'Tamaño');
  assert.equal(typeof es.pages.privacy.text, 'string');
  assert.equal(es.settings.logo, seed.settings.logo); // non-text values untouched
  assert.ok(!JSON.stringify(es).includes('"de":'));
});

test('option summaries and prices with burger extras and pizza sizes', () => {
  const de = globalThis.localizeConfig(seed, 'de');
  de.settings.lang = 'de';
  const q = P.computeOrder(de, { ...base, items: [
    { productId: 'prod_classic_burger', qty: 1, selections: { grp_burger_side: ['opt_fries'], grp_burger_extras: ['opt_cheese', 'opt_bacon'] } },
    { productId: 'prod_margherita', qty: 1, selections: { grp_pizza_size: 'opt_size_l' } }
  ] }, {});
  assert.equal(q.lines[0].unitPrice, 9.5 + 2.5 + 1 + 1.5);
  assert.equal(q.lines[1].unitPrice, 15);
  assert.equal(typeof q.lines[0].options, 'string');
  assert.match(q.lines[0].options, /Extras: Extra Käse, Bacon/);
});

test('every site language has every storefront string', () => {
  const dict = globalThis.I18N_DICT;
  const keys = Object.keys(dict.en);
  for (const l of Object.keys(globalThis.SITE_LANGS)) {
    const missing = keys.filter(k => !dict[l][k]);
    assert.deepEqual(missing, [], `${l} is missing ${missing.join(', ')}`);
    for (const k of keys) {
      const want = (dict.en[k].match(/\{\w+\}/g) || []).sort().join();
      const got = (dict[l][k].match(/\{\w+\}/g) || []).sort().join();
      assert.equal(got, want, `${l}.${k} placeholders`);
    }
  }
});

test('every admin panel language translates every admin string', async () => {
  const dir = new URL('../public/js/admin-lang/', import.meta.url);
  const load = lang => { const w = { ADMIN_TR: {} }; new Function('window', fs.readFileSync(new URL(lang + '.js', dir), 'utf8'))(w); return w.ADMIN_TR; };
  const es = load('es');
  for (const l of ['fr', 'de', 'it', 'pt', 'nl', 'ar']) assert.deepEqual(Object.keys(load(l)).sort(), Object.keys(es).sort(), l);
  // every L('...') string used by the admin panel is translated
  const src = fs.readFileSync(new URL('../public/js/admin.js', import.meta.url), 'utf8');
  const used = [...src.matchAll(/L\('((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'"));
  const missing = [...new Set(used)].filter(k => !(k in es));
  assert.deepEqual(missing, []);
});

test('push status messages follow the site language', () => {
  const m = statusMessage({ number: 1042, pointsEarned: 12 }, 'delivered', { lang: 'fr', restaurantName: 'Chez Paul' });
  assert.equal(m.title, 'Chez Paul · #1042');
  assert.match(m.body, /12 points/);
  assert.match(statusMessage({ number: 1 }, 'preparing', { lang: 'es', restaurantName: 'X' }).body, /preparando/);
  assert.equal(statusMessage({ number: 1 }, 'pending', { lang: 'en' }), null);
});

test('demo sites: cookie, storage keys and topics are per site', () => {
  const req = cookie => new Request('https://x.test/', { headers: { Cookie: cookie } });
  assert.equal(siteOf(req('a=1; rs_site=la-paella')), 'la-paella');
  assert.equal(siteOf(req('rs_site=Bad_Slug')), '');
  assert.equal(siteOf(req('')), '');
  assert.equal(kvKey('', 'config'), 'config');
  assert.equal(kvKey('la-paella', 'config'), 'site:la-paella:config');
  assert.ok(validSlug('chez-paul-2'));
  assert.ok(!validSlug('-x') && !validSlug('main') && !validSlug('a b'));
  assert.equal(siteTopic(''), 'all');
  assert.equal(siteTopic('la-paella'), 'site_la_paella');
});
