/* Demo sites (super admin only: signed in with ADMIN_PASSWORD).
   GET                         -> { sites }
   POST   {slug, name, lang, config, password?} -> create (config is the
          localized starting data, prepared by the admin panel)
   PATCH  {slug, password?, name?}  -> set / clear the demo's own admin password
   DELETE {slug}               -> remove the demo's KV data and registry entry
   Orders, customers and cashiers of a demo stay in Firestore under
   /sites/<slug> (delete them from the Firebase console if needed). */
import { json, fail, handle, readJson, authUser, isSuper, loadConfig, purgeSiteCache } from '../../_lib/http.js';
import { hashPassword } from '../../_lib/google.js';
import { validSlug, kvKey, listSites, saveSites } from '../../_lib/site.js';
import { validConfig } from './config.js';

const LANGS = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ar'];
const view = s => ({ slug: s.slug, name: s.name, lang: s.lang, createdAt: s.createdAt, hasPassword: !!s.pwHash });

async function guard(request, env) {
  if (!isSuper(await authUser(request, env))) throw Object.assign(new Error('unauthorized'), { status: 401 });
}

async function passwordFields(password) {
  if (!password) return { pwHash: '', pwSalt: '' };
  if (String(password).length < 6) throw Object.assign(new Error('weak_password'), { status: 400 });
  const { salt, hash } = await hashPassword(String(password));
  return { pwHash: hash, pwSalt: salt };
}

export const onRequestGet = handle(async ({ request, env }) => {
  await guard(request, env);
  return json({ sites: (await listSites(env)).map(view) });
});

export const onRequestPost = handle(async ({ request, env }) => {
  await guard(request, env);
  const b = await readJson(request, 3000000);
  const slug = String(b.slug || '').trim().toLowerCase();
  if (!validSlug(slug)) return fail(400, 'invalid_slug');
  const lang = LANGS.includes(b.lang) ? b.lang : 'en';
  const name = String(b.name || '').trim().slice(0, 80);
  if (!name) return fail(400, 'name_required');
  const config = b.config;
  if (!validConfig(config)) return fail(400, 'invalid_config');
  if (JSON.stringify(config).includes('data:image/')) return fail(400, 'inline_images_not_allowed');
  const sites = await listSites(env);
  if (sites.some(s => s.slug === slug) || await loadConfig(env, slug)) return fail(409, 'slug_taken');
  config.settings.lang = lang;
  config.version = 1;
  config.updatedAt = Date.now();
  await env.STORE.put(kvKey(slug, 'config'), JSON.stringify(config));
  sites.unshift({ slug, name, lang, createdAt: Date.now(), ...(await passwordFields(b.password)) });
  await saveSites(env, sites);
  await purgeSiteCache(slug);
  return json({ ok: true, slug });
});

export const onRequestPatch = handle(async ({ request, env }) => {
  await guard(request, env);
  const b = await readJson(request, 5000);
  const sites = await listSites(env);
  const entry = sites.find(s => s.slug === b.slug);
  if (!entry) return fail(404, 'not_found');
  if ('password' in b) Object.assign(entry, await passwordFields(b.password));
  if (typeof b.name === 'string' && b.name.trim()) entry.name = b.name.trim().slice(0, 80);
  await saveSites(env, sites);
  return json({ ok: true, site: view(entry) });
});

export const onRequestDelete = handle(async ({ request, env }) => {
  await guard(request, env);
  const { slug } = await readJson(request, 2000);
  if (!validSlug(String(slug || ''))) return fail(400, 'invalid_slug');
  await Promise.all([env.STORE.delete(kvKey(slug, 'config')), env.STORE.delete(kvKey(slug, 'notifications'))]);
  await saveSites(env, (await listSites(env)).filter(s => s.slug !== slug));
  await purgeSiteCache(slug);
  return json({ ok: true });
});
