// Writes public/seed/uptown-config.json: Uptown as a STANDALONE site (its own Cloudflare/Firebase), Google sign-in.
// node tools/export-uptown-seed.mjs [google|phone]
import fs from 'node:fs';
const { buildUptownConfig } = await import(new URL('../tests/uptown-config.mjs', import.meta.url));
const mode = process.argv[2] === 'phone' ? 'phone' : 'google';
const c = buildUptownConfig();
c.settings.logo = '/demo/uptown-logo.png';
c.settings.auth = mode === 'phone' ? { mode: 'phone', country: 'PS', demoShowCode: false } : { mode: 'google' };
if (mode === 'google') {
  // the saved texts mention the mobile number; use the original Google wording
  const seed = JSON.parse(fs.readFileSync(new URL('../public/seed/demo-config.json', import.meta.url)));
  const ar = v => (v && typeof v === 'object' ? v.ar : v);
  const h = seed.settings.homepage && seed.settings.homepage.login;
  if (h) c.settings.homepage.login = { title: ar(h.title), text: ar(h.text), button: ar(h.button) };
}
fs.writeFileSync(new URL('../public/seed/uptown-config.json', import.meta.url), JSON.stringify(c, null, 1));
console.log('wrote public/seed/uptown-config.json', mode, c.products.length + ' products');
