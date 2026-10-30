/* GET /api/admin/wheel (admin) -> numbers for the wheel dashboard:
   spins, prizes won / used, orders that used a prize, weekly big prizes. */
import { json, fail, handle, authUser, isAdmin, loadConfig } from '../../_lib/http.js';
import { Firestore } from '../../_lib/firestore.js';
import { siteOf } from '../../_lib/site.js';
import { weekKey } from '../../_lib/wheel.js';

export const onRequestGet = handle(async ({ request, env }) => {
  const site = siteOf(request);
  if (!isAdmin(await authUser(request, env), site)) return fail(401, 'unauthorized');
  const config = await loadConfig(env, site);
  const fs = new Firestore(env, site);
  const week = weekKey(Date.now(), config && config.settings.timezone);
  const [spins, prizes, weekDoc] = await Promise.all([fs.query('spins', { limit: 5000 }), fs.query('prizes', { limit: 5000 }), fs.get(`meta/wheel_${week}`)]);
  const byPrize = {};
  for (const s of spins) {
    const b = byPrize[s.data.prizeId] || (byPrize[s.data.prizeId] = { spins: 0, gold: 0, used: 0, orders: 0, sales: 0 });
    b.spins++; if (s.data.kind === 'gold') b.gold++;
  }
  let used = 0, sales = 0;
  for (const p of prizes) {
    if (p.data.used) {
      used++; sales += Number(p.data.orderTotal) || 0;
      const b = byPrize[p.data.prizeId]; if (b) { b.used++; b.orders++; b.sales += Number(p.data.orderTotal) || 0; }
    }
  }
  return json({ spins: spins.length, gold: spins.filter(s => s.data.kind === 'gold').length, prizes: prizes.length, used, sales, week, bigThisWeek: weekDoc ? Number(weekDoc.data.big) || 0 : 0, byPrize });
});
