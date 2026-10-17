/* GET /api/site -> everything the public pages need in one request:
   the restaurant config, the latest notifications and the public Firebase
   web config. Cached at the edge for a short time so visitors cost almost
   no KV reads; admin saves purge the cache. */
import { json, fail, handle, loadConfig, siteCacheUrl } from '../_lib/http.js';
import { firebaseWebConfig } from '../_lib/public.js';
import { siteOf, kvKey } from '../_lib/site.js';

export const onRequestGet = handle(async ({ request, env, waitUntil }) => {
  const site = siteOf(request);
  const cache = caches.default;
  const key = new Request(siteCacheUrl(site));
  const hit = await cache.match(key);
  if (hit) return hit;
  const [config, notifications] = await Promise.all([
    loadConfig(env, site),
    env.STORE.get(kvKey(site, 'notifications'), 'json')
  ]);
  // A demo link that was deleted (or mistyped): never fall back to the main site.
  if (site && !config) return fail(404, 'site_not_found');
  const res = json({ config, notifications: notifications || [], firebase: firebaseWebConfig(env) }, 200, {
    'Cache-Control': 'private, max-age=20', Vary: 'Cookie'
  });
  waitUntil(cache.put(key, res.clone()));
  return res;
});
