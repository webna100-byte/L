#!/usr/bin/env node
/* Build a customised demo site (logo, colours, real menu) from a spec file.
   PLATFORM_URL=... PLATFORM_ADMIN_PASSWORD=... node tools/build-demo.mjs tools/specs/rukn.json --replace
   spec: {slug, name, lang, color, currency, timezone, phone, address, instagram, logoFile,
          heroTitle, heroText, categories:[{id,name,image,products:[{id,name,desc,price,image}]}]} */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const WT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');   // repo root; run from there
await import(WT + '/public/js/i18n.js');
const BASE = (process.env.PLATFORM_URL || '').replace(/\/$/, '');
const PASS = process.env.PLATFORM_ADMIN_PASSWORD || '';
const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const replace = process.argv.includes('--replace');

async function call(url, opts = {}) {
  const r = await fetch(url, opts);
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 200) }; }
  if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}
async function idToken() {
  const { token } = await call(`${BASE}/api/auth/admin`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: PASS }) });
  const { firebase } = await call(`${BASE}/api/site`);
  const r = await call(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebase.apiKey}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, returnSecureToken: true }) });
  return r.idToken;
}
const tok = await idToken();
const auth = { authorization: `Bearer ${tok}`, 'content-type': 'application/json' };

// logo upload
let logo = '/demo/logo.svg';
if (spec.logoFile) {
  const buf = readFileSync(spec.logoFile);
  const type = spec.logoFile.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const r = await call(`${BASE}/api/admin/upload`, { method: 'POST', headers: { authorization: `Bearer ${tok}`, 'content-type': type }, body: buf });
  logo = r.url;
}

async function up(file) {
  const r = await call(`${BASE}/api/admin/upload`, { method: 'POST', headers: { authorization: `Bearer ${tok}`, 'content-type': 'image/jpeg' }, body: readFileSync(file) });
  return r.url;
}
const bannerUrl = spec.bannerFile ? await up(spec.bannerFile) : '';
const tileUrl = spec.tileFile ? await up(spec.tileFile) : '';
const seed = JSON.parse(readFileSync(WT + '/public/seed/demo-config.json', 'utf8'));
const d = globalThis.localizeConfig(seed, spec.lang || 'ar');
d.settings.lang = spec.lang || 'ar'; delete d.settings.defaultLang;
d.settings.currency = spec.currency; d.settings.timezone = spec.timezone;
d.settings.restaurantName = spec.name; d.settings.logo = logo;
d.settings.homepage.hero.title = spec.heroTitle || spec.name;
if (spec.heroText) d.settings.homepage.hero.text = spec.heroText;
Object.assign(d.settings.colors.secondary, { type: 'solid', color1: spec.color, color2: spec.color });
if (spec.phone) d.settings.phone = spec.phone;
if (spec.address) d.settings.address = spec.address;
d.settings.footerEmail = '';
d.settings.multiBranch = false;
d.settings.minimumOrder = spec.minimumOrder ?? 0;
d.settings.socialLinks = { facebook: '', instagram: spec.instagram ? `instagram.com/${spec.instagram}` : '', tiktok: '', x: '', youtube: '' };

if (bannerUrl) { d.settings.homepage.hero.image = bannerUrl; d.settings.slider.images = [bannerUrl]; }
// single branch named after the real place
const br = d.branches[0];
br.name = spec.branchName || spec.name;
br.deliveryZones = (spec.deliveryZones || [{ name: 'توصيل', price: 0 }]).map((z, i) => ({ id: `zone_${br.id}_${i}`, name: z.name, price: z.price }));
d.branches = [br];

// real menu
d.categories = []; d.products = [];
spec.categories.forEach((c, ci) => {
  d.categories.push({ id: c.id, name: c.name, image: tileUrl || c.image || '/demo/cat_burgers.webp', branchIds: [], order: ci });
  c.products.forEach((p, pi) => d.products.push({ id: p.id, categoryId: c.id, image: tileUrl || p.image || c.image, price: p.price, discountPercent: 0, branchIds: [], order: pi, name: p.name, description: p.desc || '', optionGroups: [] }));
});
d.settings.homepage.categories.selectedIds = d.categories.slice(0, 4).map(c => c.id);
d.settings.homepage.featured.selectedIds = d.products.slice(0, 6).map(p => p.id);
for (const t of d.loyalty.tiers || []) for (const g of t.gifts || []) if (g.name) { /* keep demo gifts */ }

if (replace) { try { await call(`${BASE}/api/admin/sites`, { method: 'DELETE', headers: auth, body: JSON.stringify({ slug: spec.slug }) }); } catch (e) { /* not there */ } }
await call(`${BASE}/api/admin/sites`, { method: 'POST', headers: auth, body: JSON.stringify({ slug: spec.slug, name: spec.name, lang: spec.lang || 'ar', config: d }) });
console.log(`${BASE}/s/${spec.slug}`, 'products:', d.products.length, 'logo:', logo);
