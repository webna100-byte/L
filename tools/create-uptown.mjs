// PLATFORM_URL=... PLATFORM_ADMIN_PASSWORD=... node tools/create-uptown.mjs uptown tools/assets/uptown-logo.png
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const WT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { buildUptownConfig } = await import(WT + '/tests/uptown-config.mjs');
const BASE = process.env.PLATFORM_URL.replace(/\/$/, ''), PASS = process.env.PLATFORM_ADMIN_PASSWORD;
const [slug, logoFile] = process.argv.slice(2);
async function call(url, opts = {}) { const r = await fetch(url, opts); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 200) }; } if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 300)}`); return j; }
const { token } = await call(`${BASE}/api/auth/admin`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: PASS }) });
const { firebase } = await call(`${BASE}/api/site`);
const tok = (await call(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebase.apiKey}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, returnSecureToken: true }) })).idToken;
const auth = { authorization: `Bearer ${tok}`, 'content-type': 'application/json' };
const config = buildUptownConfig();
if (logoFile) {
  const type = /\.png$/i.test(logoFile) ? 'image/png' : /\.webp$/i.test(logoFile) ? 'image/webp' : 'image/jpeg';
  config.settings.logo = (await call(`${BASE}/api/admin/upload`, { method: 'POST', headers: { authorization: auth.authorization, 'content-type': type }, body: readFileSync(logoFile) })).url;
}
try { await call(`${BASE}/api/admin/sites`, { method: 'DELETE', headers: auth, body: JSON.stringify({ slug }) }); } catch (e) { /* new */ }
await call(`${BASE}/api/admin/sites`, { method: 'POST', headers: auth, body: JSON.stringify({ slug, name: config.settings.restaurantName, lang: 'ar', config }) });
console.log(`${BASE}/s/${slug}`);
