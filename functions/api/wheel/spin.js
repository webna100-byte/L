/* POST /api/wheel/spin (signed-in customer): the one free spin of the day.
   The server alone decides the result. In one Firestore transaction it
   checks that today's spin is unused, applies the weekly cap on big prizes,
   draws the prize, uses up the spin and saves the prize on the customer's
   phone number (no code to type: it is applied at checkout). */
import { json, fail, handle, authUser, loadConfig } from '../../_lib/http.js';
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

  const fs = new Firestore(env, site);
  const now = Date.now();
  const tz = config.settings.timezone;
  const week = weekKey(now, tz);

  const result = await fs.runTransaction(async tx => {
    const [userDoc, weekDoc] = await fs.getMany([`users/${user.uid}`, `meta/wheel_${week}`], tx);
    const u = userDoc ? userDoc.data : {};
    const st = spinState(wheel, u, now, tz);
    if (!st.freeAvailable) throw Object.assign(new Error('no_spin'), { status: 409, publicMessage: 'no_spin_available' });

    const bigIssued = weekDoc ? Number(weekDoc.data.big) || 0 : 0;
    const def = pickPrize(wheel, { bigAllowed: bigIssued < wheel.weeklyBigCap });
    const code = newCode();
    const record = prizeRecord(def, { uid: user.uid, phone: user.ph || u.phone || '', code, now, wheel });
    const writes = [
      fs.set(`prizes/${code}`, record, { mustNotExist: true }),
      fs.set(`spins/${code}`, { uid: user.uid, prizeId: def.id, big: record.big, at: now, week }),
      fs.merge(`meta/wheel_${week}`, { week }, { increments: { spins: 1, big: record.big ? 1 : 0 } })
    ];
    writes.push(fs.merge(`users/${user.uid}`, { lastFreeSpinDay: st.today, updatedAt: now }));
    return { writes, result: { record, prizeIndex: wheel.prizes.findIndex(p => p.id === def.id) } };
  });

  const r = result.record;
  return json({ ok: true, prizeIndex: result.prizeIndex, prize: { code: r.code, label: r.label, type: r.type, productId: r.productId, value: r.value, image: r.image, minOrder: r.minOrder, expiresAt: r.expiresAt } });
});
