/* GET /api/me -> the signed-in customer's points, level and saved details. */
import { json, fail, handle, authUser, loadConfig } from '../_lib/http.js';
import { customerAllowed } from '../_lib/customer.js';
import { Firestore } from '../_lib/firestore.js';
import { siteOf } from '../_lib/site.js';

export const onRequestGet = handle(async ({ request, env }) => {
  const site = siteOf(request);
  const user = await authUser(request, env);
  if (!customerAllowed(user, await loadConfig(env, site), site)) return fail(401, 'login_required');
  const doc = await new Firestore(env, site).get(`users/${user.uid}`);
  const d = doc ? doc.data : {};
  return json({
    uid: user.uid,
    name: d.name || user.name || '',
    email: user.email || '',
    phone: d.phone || user.ph || '',
    address: d.address || '',
    points: Number(d.points) || 0,
    lifetimePoints: Number(d.lifetimePoints) || 0
  });
});
