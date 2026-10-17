/* GET /s/<slug>[/<page>] -> opens a demo site.
   Sets the rs_site cookie and sends the visitor on to the page
   (/s/la-paella -> /, /s/la-paella/menu -> /menu, /s/la-paella/admin -> /admin).
   /s/main switches back to the main site.
   The response is a tiny HTML page (not a bare redirect) so link previews
   on WhatsApp / Facebook / iMessage show the demo restaurant's own name and
   image: crawlers don't keep cookies across redirects. */
import { loadConfig } from '../_lib/http.js';
import { validSlug, siteCookie } from '../_lib/site.js';

const esc = v => String(v || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const textOf = (f, lang) => (f && typeof f === 'object') ? (f[lang] || f.en || Object.values(f).find(Boolean) || '') : (f || '');

export async function onRequestGet({ request, params, env }) {
  const parts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  const slug = String(parts[0] || '').toLowerCase();
  const rest = parts.slice(1).filter(p => /^[\w.-]+$/.test(p)).join('/');
  const target = '/' + rest;
  const url = new URL(request.url);

  if (slug === 'main' || !slug) {
    return new Response(null, { status: 302, headers: { Location: target, 'Set-Cookie': siteCookie(''), 'Cache-Control': 'no-store' } });
  }
  if (!validSlug(slug)) return new Response('Not found', { status: 404 });
  const config = await loadConfig(env, slug);
  if (!config) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

  const s = config.settings || {};
  const lang = s.lang || s.defaultLang || 'en';
  const name = textOf(s.restaurantName, lang);
  const hero = (s.homepage && s.homepage.hero) || {};
  const description = textOf(hero.text, lang);
  const image = hero.image || s.logo || '';
  const abs = image && image.startsWith('/') ? url.origin + image : image;
  const html = `<!DOCTYPE html><html lang="${esc(lang)}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(name)}">
<meta property="og:title" content="${esc(name)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url.origin + url.pathname)}">
${abs ? `<meta property="og:image" content="${esc(abs)}"><meta name="twitter:card" content="summary_large_image">` : ''}
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<script>location.replace(${JSON.stringify(target)})</script>
</head><body></body></html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': siteCookie(slug), 'Cache-Control': 'no-store' }
  });
}
