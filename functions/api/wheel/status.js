/* GET /api/wheel/status (signed-in customer)
   -> whether today's free spin is still available, and the prizes waiting
      on this number to be used. */
import { json, fail, handle, authUser, loadConfig } from '../../_lib/http.js';
import { customerAllowed } from '../../_lib/customer.js';
import { Firestore, where } from '../../_lib/firestore.js';
import { siteOf } from '../../_lib/site.js';
import { wheelSettings, publicWheel, spinState, prizeActive } from '../../_lib/wheel.js';

export async function activePrizes(fs, uid, now) {
  const rows = await fs.query('prizes', {
    where: { compositeFilter: { op: 'AND', filters: [where('uid', 'EQUAL', uid), where('used', 'EQUAL', false)] } },
    limit: 50
  });
  return rows.map(r => r.data).filter(p => prizeActive(p, now)).sort((a, b) => a.issuedAt - b.issuedAt);   // oldest first
}

export const onRequestGet = handle(async ({ request, env }) => {
  const site = siteOf(request);
  const config = await loadConfig(env, site);
  const user = await authUser(request, env);
  if (!config || !customerAllowed(user, config, site)) return fail(401, 'login_required');
  const wheel = wheelSettings(config);
  if (!wheel.enabled) return json({ enabled: false });
  const fs = new Firestore(env, site);
  const now = Date.now();
  const doc = await fs.get(`users/${user.uid}`);
  const st = spinState(wheel, doc && doc.data, now, config.settings.timezone);
  return json({
    enabled: true,
    wheel: publicWheel(config),
    freeAvailable: st.freeAvailable,
    prizes: (await activePrizes(fs, user.uid, now)).map(p => ({ code: p.code, label: p.label, type: p.type, productId: p.productId, value: p.value, image: p.image, minOrder: p.minOrder, expiresAt: p.expiresAt }))
  });
});
