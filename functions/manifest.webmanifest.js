/* PWA manifest built from the restaurant's own name/logo/colors, so
   "Add to Home Screen" (needed for iPhone push notifications) shows the
   client's brand without editing any file. A demo site starts at its own
   /s/<slug> link: an installed iPhone app has its own cookie jar, so it
   must pick the demo again on first launch. */
import { loadConfig } from './_lib/http.js';
import { siteOf } from './_lib/site.js';

export async function onRequestGet({ request, env }) {
  const site = siteOf(request);
  let config = null;
  try { config = await loadConfig(env, site); } catch (e) { /* fall through */ }
  const s = (config && config.settings) || {};
  const lang = s.lang || s.defaultLang || 'en';
  const rn = s.restaurantName;
  const name = (rn && typeof rn === 'object' ? (rn[lang] || rn.en || Object.values(rn).find(Boolean)) : rn) || 'Restaurant';
  const icon = s.logo || '';
  const color = (s.colors && s.colors.secondary && s.colors.secondary.color1) || '#b30000';
  const manifest = {
    name, short_name: name.slice(0, 12), lang, dir: lang === 'ar' ? 'rtl' : 'ltr',
    start_url: site ? `/s/${site}` : '/', scope: '/', display: 'standalone', background_color: '#ffffff', theme_color: color,
    icons: icon ? [{ src: icon, sizes: '192x192', purpose: 'any' }, { src: icon, sizes: '512x512', purpose: 'any' }] : []
  };
  return new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'private, max-age=300', Vary: 'Cookie' } });
}
