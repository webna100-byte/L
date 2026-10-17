/* POST /api/admin/notify {title, body, link?, image?}
   Saves the notification for the in-site list and pushes it to every
   device subscribed to this site.
   DELETE {id} removes one from the in-site list. */
import { json, fail, handle, readJson, authUser, isAdmin, loadConfig, purgeSiteCache } from '../../_lib/http.js';
import { sendToTopic } from '../../_lib/push.js';
import { siteOf, siteTopic, kvKey } from '../../_lib/site.js';

const clean = (v, n) => String(v || '').trim().slice(0, n);
// Older admin panels sent { ar, en } objects: keep accepting them.
const text = (v, n) => clean(v && typeof v === 'object' ? Object.values(v).find(x => x) : v, n);

export const onRequestPost = handle(async ({ request, env }) => {
  const site = siteOf(request);
  if (!isAdmin(await authUser(request, env), site)) return fail(401, 'unauthorized');
  const b = await readJson(request, 10000);
  const title = text(b.title, 120);
  const body = text(b.body, 500);
  if (!title) return fail(400, 'title_required');
  const origin = new URL(request.url).origin;
  let link = clean(b.link, 300);
  if (link && link.startsWith('/')) link = origin + link;
  if (link && !/^https:\/\//.test(link)) link = '';
  const image = clean(b.image, 300);
  const item = { id: 'n' + Date.now().toString(36), title, body, link, image, at: Date.now() };
  const key = kvKey(site, 'notifications');
  const list = (await env.STORE.get(key, 'json')) || [];
  list.unshift(item);
  await env.STORE.put(key, JSON.stringify(list.slice(0, 30)));
  await purgeSiteCache(site);

  const config = await loadConfig(env, site);
  const logo = config && config.settings && config.settings.logo;
  const abs = u => (u && u.startsWith('/') ? origin + u : u) || undefined;
  let push = 'sent';
  try {
    await sendToTopic(env, siteTopic(site), { title, body, link: link || origin + '/notifications', icon: abs(logo), image: abs(image) });
  } catch (e) {
    console.error(e);
    push = 'failed';
  }
  return json({ ok: true, item, push });
});

export const onRequestDelete = handle(async ({ request, env }) => {
  const site = siteOf(request);
  if (!isAdmin(await authUser(request, env), site)) return fail(401, 'unauthorized');
  const { id } = await readJson(request, 2000);
  const key = kvKey(site, 'notifications');
  const list = (await env.STORE.get(key, 'json')) || [];
  await env.STORE.put(key, JSON.stringify(list.filter(n => n.id !== id)));
  await purgeSiteCache(site);
  return json({ ok: true });
});
