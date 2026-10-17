/* Injects the restaurant's own title, description and preview image into
   every public HTML page, so links shared on WhatsApp / Facebook /
   Instagram show the client's brand (crawlers don't run JavaScript). */
import { loadConfig, metaCacheUrl } from './_lib/http.js';
import { siteOf } from './_lib/site.js';

async function cachedConfig(env, site, waitUntil) {
  const cache = caches.default;
  const key = new Request(metaCacheUrl(site));
  const hit = await cache.match(key);
  if (hit) return hit.json();
  const config = await loadConfig(env, site);
  const s = (config && config.settings) || {};
  const lang = s.lang || s.defaultLang || 'en';
  const tf = f => (f && typeof f === 'object') ? (f[lang] || f.en || Object.values(f).find(Boolean) || '') : (f || '');
  const hero = (s.homepage && s.homepage.hero) || {};
  const meta = {
    lang,
    name: tf(s.restaurantName),
    description: tf(hero.text),
    image: hero.image || s.logo || '',
    color: (s.colors && s.colors.header && s.colors.header.color1) || '#ffffff',
    pages: Object.fromEntries(Object.entries(config && config.pages || {}).map(([k, p]) => [k, { title: tf(p.title), image: p.image || '' }]))
  };
  waitUntil(cache.put(key, new Response(JSON.stringify(meta), { headers: { 'Cache-Control': 'max-age=60' } })));
  return meta;
}

const esc = v => String(v || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function onRequest({ request, next, env, waitUntil }) {
  const res = await next();
  const url = new URL(request.url);
  if (request.method !== 'GET' || /^\/(admin|cashier|api|s)(\/|$)/.test(url.pathname)) return res;
  if (!(res.headers.get('Content-Type') || '').includes('text/html')) return res;
  let meta;
  try { meta = await cachedConfig(env, siteOf(request), waitUntil); } catch (e) { return res; }
  if (!meta || !meta.name) return res;
  const key = url.pathname.replace(/^\/|\.html$/g, '') || 'home';
  const page = meta.pages[key];
  const title = page && page.title ? `${page.title} · ${meta.name}` : meta.name;
  const image = (page && page.image) || meta.image;
  const abs = image && image.startsWith('/') ? url.origin + image : image;
  const tags = `
<meta name="description" content="${esc(meta.description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(meta.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:url" content="${esc(url.origin + url.pathname)}">
${abs ? `<meta property="og:image" content="${esc(abs)}"><meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="canonical" href="${esc(url.origin + url.pathname)}">`;
  return new HTMLRewriter()
    .on('html', { element(el) { el.setAttribute('lang', meta.lang); if (meta.lang === 'ar') el.setAttribute('dir', 'rtl'); } })
    .on('title', { element(el) { el.setInnerContent(title); } })
    .on('meta[name="theme-color"]', { element(el) { el.setAttribute('content', meta.color); } })
    .on('head', { element(el) { el.append(tags, { html: true }); } })
    .transform(res);
}
