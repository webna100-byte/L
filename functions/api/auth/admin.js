/* POST /api/auth/admin {password} -> Firebase custom token with role=admin
   for the site this browser is on (rs_site cookie).
   - ADMIN_PASSWORD (Cloudflare secret, the owner's master password) works
     on every site and also unlocks "Demo sites" (claim super=true).
   - A demo site may have its own admin password, set from "Demo sites",
     so a prospect can try the admin panel of THEIR demo only. */
import { json, fail, handle, readJson, loginGuard, loadConfig } from '../../_lib/http.js';
import { createCustomToken, hashPassword, safeEqual } from '../../_lib/google.js';
import { siteOf, listSites } from '../../_lib/site.js';

export const onRequestPost = handle(async ({ request, env }) => {
  const guard = await loginGuard(request, 'admin-login');
  if (guard.blocked) return fail(429, 'too_many_attempts');
  const { password } = await readJson(request, 2000);
  if (!env.ADMIN_PASSWORD) return fail(500, 'admin_password_not_configured');
  const site = siteOf(request);
  if (site && !(await loadConfig(env, site))) return fail(404, 'site_not_found');
  const pw = String(password || '');
  let claims = null;
  if (pw && safeEqual(pw, env.ADMIN_PASSWORD)) {
    claims = { role: 'admin', site, super: true };
  } else if (pw && site) {
    const entry = (await listSites(env)).find(s => s.slug === site);
    if (entry && entry.pwHash) {
      const { hash } = await hashPassword(pw, entry.pwSalt);
      if (safeEqual(hash, entry.pwHash)) claims = { role: 'admin', site };
    }
  }
  if (!claims) { await guard.fail(); return fail(401, 'invalid_login'); }
  let token;
  try {
    token = await createCustomToken(env, `staff_admin${site ? '_' + site : ''}${claims.super ? '' : '_demo'}`, claims);
  } catch (e) {
    // Only reachable with a correct password: says what is wrong with the Firebase service account settings.
    const raw = String(env.FIREBASE_PRIVATE_KEY || '');
    const body = raw.replace(/\\n/g, '\n').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g, '');
    const odd = [...new Set(body.replace(/[A-Za-z0-9+/=]/g, ''))].map(c => c.charCodeAt(0)).slice(0, 10);
    return fail(500, `token_failed: ${String(e && e.message || e).slice(0, 60)} | key length ${raw.length}, starts "${raw.slice(0, 12)}", ends "${raw.slice(-12).replace(/\n/g, '<LF>')}", body ${body.length}, odd chars ${JSON.stringify(odd)}`);
  }
  return json({ token });
});
