/* Tiny per-IP limiter in the edge cache (no KV writes). Unlike loginGuard it
   counts every call, which is what the phone endpoints need. */
export async function ipLimit(request, bucket, max, windowSec) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = new Request(`https://ratelimit.internal/${bucket}/${encodeURIComponent(ip)}`);
  const cache = caches.default;
  const hit = await cache.match(key);
  const count = hit ? Number(await hit.text()) || 0 : 0;
  if (count >= max) return false;
  await cache.put(key, new Response(String(count + 1), { headers: { 'Cache-Control': `max-age=${windowSec}` } }));
  return true;
}
