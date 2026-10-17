/* One deployment, several restaurants.
   The main site has no slug and keeps the original storage layout
   (KV "config", Firestore /orders ...). A demo created from the admin
   panel lives under its slug:
     KV         site:<slug>:config, site:<slug>:notifications
     Firestore  /sites/<slug>/orders, /users, /cashiers, /meta, /branchStatus
   The visitor's browser carries the slug in the rs_site cookie, which the
   /s/<slug> link sets. */

export const SITE_COOKIE = 'rs_site';
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export function validSlug(slug) {
  return typeof slug === 'string' && SLUG_RE.test(slug) && slug !== 'main';
}

/* '' = main site. */
export function siteOf(request) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/(?:^|;\s*)rs_site=([a-z0-9-]{1,40})/);
  return m && validSlug(m[1]) ? m[1] : '';
}

export function kvKey(site, key) {
  return site ? `site:${site}:${key}` : key;
}

export function siteCookie(site) {
  return site
    ? `${SITE_COOKIE}=${site}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
    : `${SITE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}

/* Broadcast topic of a site (one push request reaches every subscriber). */
export function siteTopic(site) {
  return site ? `site_${site.replace(/-/g, '_')}` : 'all';
}

/* ---- Registry of demo sites (KV "sites"), managed by the super admin ---- */
export async function listSites(env) {
  return (await env.STORE.get('sites', 'json')) || [];
}

export async function saveSites(env, list) {
  await env.STORE.put('sites', JSON.stringify(list));
}
