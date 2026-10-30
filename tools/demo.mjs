#!/usr/bin/env node
/* Command-line helper for the owner: create / list / delete demo sites and
   load the demo restaurant into the main site, without opening the admin panel.

   Environment:
     PLATFORM_URL             e.g. https://platform-89w.pages.dev
     PLATFORM_ADMIN_PASSWORD  the master ADMIN_PASSWORD (never commit it)

   node tools/demo.mjs list
   node tools/demo.mjs create <slug> "<Restaurant name>" <lang> [demo-admin-password] [logoUrl] [primaryColor]
   node tools/demo.mjs delete <slug>
   node tools/demo.mjs phone-wheel <slug> [PS|SA|AE|KW|JO]
   node tools/demo.mjs init-main <lang> */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await import(path.join(root, 'public/js/i18n.js'));   // defines globalThis.localizeConfig
const BASE = (process.env.PLATFORM_URL || '').replace(/\/$/, '');
const PASS = process.env.PLATFORM_ADMIN_PASSWORD || '';
if (!BASE || !PASS) { console.error('Set PLATFORM_URL and PLATFORM_ADMIN_PASSWORD'); process.exit(1); }
const LANG_CUR_TZ = { es: ['EUR', 'Europe/Madrid'], fr: ['EUR', 'Europe/Paris'], de: ['EUR', 'Europe/Berlin'], it: ['EUR', 'Europe/Rome'], pt: ['EUR', 'Europe/Lisbon'], nl: ['EUR', 'Europe/Amsterdam'], en: ['GBP', 'Europe/London'], ar: ['AED', 'Asia/Dubai'] };

async function call(url, opts = {}) {
  const r = await fetch(url, opts);
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 200) }; }
  if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}
async function idToken(site = '') {
  const { token } = await call(`${BASE}/api/auth/admin`, { method: 'POST', headers: { 'content-type': 'application/json', ...(site ? { cookie: `rs_site=${site}` } : {}) }, body: JSON.stringify({ password: PASS }) });
  const { firebase } = await call(`${BASE}/api/site`);
  const r = await call(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebase.apiKey}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, returnSecureToken: true }) });
  return r.idToken;
}
const auth = t => ({ authorization: `Bearer ${t}`, 'content-type': 'application/json' });

function demoConfig(lang, { name, logo, color } = {}) {
  const seed = JSON.parse(readFileSync(path.join(root, 'public/seed/demo-config.json'), 'utf8'));
  const d = globalThis.localizeConfig(seed, lang);
  const [cur, tz] = LANG_CUR_TZ[lang] || LANG_CUR_TZ.en;
  d.settings.lang = lang; delete d.settings.defaultLang; d.settings.currency = cur; d.settings.timezone = tz;
  if (name) { d.settings.restaurantName = name; if (d.settings.homepage && d.settings.homepage.hero) d.settings.homepage.hero.title = name; }
  if (logo) d.settings.logo = logo;
  if (color && d.settings.colors && d.settings.colors.secondary) Object.assign(d.settings.colors.secondary, { type: 'solid', color1: color, color2: color });
  return d;
}

const [cmd, ...a] = process.argv.slice(2);
if (cmd === 'list') {
  console.log(JSON.stringify(await call(`${BASE}/api/admin/sites`, { headers: auth(await idToken()) }), null, 1));
} else if (cmd === 'create') {
  const [slug, name, lang, password, logo, color] = a;
  if (!slug || !name || !lang) { console.error('usage: create <slug> "<name>" <lang> [password] [logoUrl] [color]'); process.exit(1); }
  const body = { slug, name, lang, config: demoConfig(lang, { name, logo, color }) };
  if (password) body.password = password;
  await call(`${BASE}/api/admin/sites`, { method: 'POST', headers: auth(await idToken()), body: JSON.stringify(body) });
  console.log(`${BASE}/s/${slug}`);
} else if (cmd === 'phone-wheel') {
  // node tools/demo.mjs phone-wheel <slug> [PS|SA|AE|KW|JO] : phone sign-in (code shown on screen) + the standard wheel
  const [slug, country = 'PS'] = a;
  if (!slug) { console.error('usage: phone-wheel <slug> [country]'); process.exit(1); }
  const t = await idToken(slug);
  const h = { ...auth(t), cookie: `rs_site=${slug}` };
  const { config } = await call(`${BASE}/api/admin/config`, { headers: h });
  if (!config) { console.error('site not found'); process.exit(1); }
  const name = p => String(typeof p.name === 'string' ? p.name : Object.values(p.name || {})[0] || '');
  const find = re => (config.products.find(p => re.test(name(p))) || {}).id || '';
  const prize = (id, label, productId, weight, goldWeight, big) => ({ id, label, type: 'product', productId, weight, goldWeight, big });
  config.settings.auth = { mode: 'phone', country, demoShowCode: true };
  config.wheel = { enabled: true, title: '', minOrder: 100, goldenEvery: 150, validHours: 48, weeklyBigCap: 10, prizes: [
    prize('drink', 'مشروب', find(/cola|drink|مشروب|ليمون|lemon|water|مياه|pepsi|بيبسي/i), 35, 0, false),
    prize('fries', 'بطاطا', find(/fries|بطاط|patat|potato/i) || find(/salad|سلطة/i), 30, 20, false),
    { id: 'd10', label: 'خصم 10%', type: 'percent', value: 10, weight: 20, goldWeight: 20, big: false },
    prize('wings', 'أجنحة', find(/wing|أجنحة|جناح|chicken|دجاج/i), 12, 35, true),
    prize('classic', 'كلاسيك برغر', find(/classic|كلاسيك|burger|برغر/i), 3, 25, true)
  ] };
  if (config.wheel.prizes.some(p => p.type === 'product' && !p.productId)) { console.error('could not match every prize to a product; set them in Admin > Wheel game'); }
  await call(`${BASE}/api/admin/config`, { method: 'PUT', headers: h, body: JSON.stringify({ config, baseVersion: Number(config.version) || 0 }) });
  console.log('phone sign-in + wheel enabled on', slug);
} else if (cmd === 'delete') {
  await call(`${BASE}/api/admin/sites`, { method: 'DELETE', headers: auth(await idToken()), body: JSON.stringify({ slug: a[0] }) });
  console.log('deleted', a[0]);
} else if (cmd === 'init-main') {
  const lang = a[0] || 'es';
  const t = await idToken();
  const cfg = demoConfig(lang);
  await call(`${BASE}/api/admin/config`, { method: 'PUT', headers: auth(t), body: JSON.stringify({ config: cfg, baseVersion: 0 }) });
  console.log('main site loaded with the demo in', lang);
} else {
  console.error('commands: list | create | delete | phone-wheel | init-main'); process.exit(1);
}
