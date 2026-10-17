/* POST /api/push/register {token}
   Subscribes a device's FCM token to the broadcast topic of this site.
   Signed-in customers also get the token saved on their profile so they
   receive order-status updates. */
import { json, fail, handle, readJson, authUser, isGoogleCustomer } from '../../_lib/http.js';
import { subscribeTopic } from '../../_lib/push.js';
import { Firestore } from '../../_lib/firestore.js';
import { siteOf, siteTopic } from '../../_lib/site.js';

export const onRequestPost = handle(async ({ request, env }) => {
  const site = siteOf(request);
  const b = await readJson(request, 5000);
  const token = String(b.token || '');
  if (token.length < 20 || token.length > 4096) return fail(400, 'invalid_token');
  await subscribeTopic(env, token, siteTopic(site));
  const user = await authUser(request, env);
  if (isGoogleCustomer(user)) {
    const fs = new Firestore(env, site);
    const doc = await fs.get(`users/${user.uid}`);
    const tokens = (doc && Array.isArray(doc.data.pushTokens) ? doc.data.pushTokens : []).filter(t => t !== token);
    tokens.unshift(token);
    await fs.commit([fs.merge(`users/${user.uid}`, { pushTokens: tokens.slice(0, 5) })]);
  }
  return json({ ok: true });
});
