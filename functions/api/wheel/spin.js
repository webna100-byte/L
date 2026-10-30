/* POST /api/wheel/spin {kind: 'free' | 'gold'} (signed-in customer)
   The server alone decides the result. In one Firestore transaction it
   checks the customer's entitlement, applies the weekly cap on big prizes,
   draws the prize, spends the spin and writes a one-time prize code bound
   to the customer's phone. */
import { json, fail, handle, readJson, authUser, loadConfig } from '../../_lib/http.js';
import { customerAllowed } from '../../_lib/customer.js';
import { Firestore } from '../../_lib/firestore.js';
import { siteOf } from '../../_lib/site.js';
import { wheelSettings, spinState, pickPrize, prizeRecord, newCode, weekKey } from '../../_lib/wheel.js';

export const onRequestPost = handle(async ({ request, env }) => {
  const site = siteOf(request);
  const config = await loadConfig(env, site);
  const user = await authUser(request, env);
  if (!config || !customerAllowed(user, site)) return fail(401, 'login_required');
  const wheel = wheelSettings(config);
  if (!wheel.enabled) return fail(400, 'wheel_disabled');
  const { kind } = await readJson(request, 500);
  if (kind !== 'free' && kind !== 'gold') return fail(400, 'invalid_kind');

  const fs = new Firestore(env, site);
  const now = Date.now();
  const tz = config.settings.timezone;
  const week = weekKey(now, tz);

  const result = await fs.runTransaction(async tx => {
    const [userDoc, weekDoc] = await fs.getMany([`users/${user.uid}`, `meta/wheel_${week}`], tx);
    const u = userDoc ? userDoc.data : {};
    const st = spinState(wheel, u, now, tz);
    if (kind === 'free' && !st.freeAvailable) throw Object.assign(new Error('no_spin'), { status: 409, publicMessage: 'no_spin_available' });
    if (kind === 'gold' && st.goldAvailable < 1) throw Object.assign(new Error('no_spin'), { status: 409, publicMessage: 'no_spin_available' });

    const bigIssued = weekDoc ? Number(weekDoc.data.big) || 0 : 0;
    const def = pickPrize(wheel, kind, { bigAllowed: bigIssued < wheel.weeklyBigCap });
    const code = newCode();
    const record = prizeRecord(def, { uid: user.uid, phone: user.ph || u.phone || '', kind, code, now, wheel });
    const writes = [
      fs.set(`prizes/${code}`, record, { mustNotExist: true }),
      fs.set(`spins/${code}`, { uid: user.uid, prizeId: def.id, kind, big: record.big, at: now, week }),
      fs.merge(`meta/wheel_${week}`, { week }, { increments: { spins: 1, big: record.big ? 1 : 0 } })
    ];
    if (kind === 'free') writes.push(fs.merge(`users/${user.uid}`, { lastFreeSpinDay: st.today, updatedAt: now }));
    else writes.push(fs.merge(`users/${user.uid}`, { updatedAt: now }, { increments: { goldSpinsUsed: 1 } }));
    return { writes, result: { record, prizeIndex: wheel.prizes.findIndex(p => p.id === def.id) } };
  });

  const r = result.record;
  return json({ ok: true, prizeIndex: result.prizeIndex, prize: { code: r.code, label: r.label, type: r.type, productId: r.productId, value: r.value, image: r.image, minOrder: r.minOrder, expiresAt: r.expiresAt, kind: r.kind } });
});
