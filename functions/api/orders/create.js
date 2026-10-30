/* POST /api/orders/create (signed-in customers only: a verified phone number)
   Body: { branchId, type, zoneId, items:[{productId, qty, selections, notes}],
           gifts:[{giftId, qty}], prizeCode?, customer:{name, phone, address, notes} }

   Everything is recomputed here from the stored menu (prices, discounts,
   level discount, points). Gift points are checked and deducted inside the
   same Firestore transaction that creates the order, so a customer can
   never spend the same points twice (two tabs, two phones, replayed
   requests, a gift kept in an old cart...). */
import '../../../public/js/pricing.js';
import { json, fail, handle, readJson, authUser, loadConfig } from '../../_lib/http.js';
import { customerAllowed } from '../../_lib/customer.js';
import { prizeActive } from '../../_lib/wheel.js';
import { Firestore } from '../../_lib/firestore.js';
import { dayKey, orderId } from '../../_lib/orders.js';
import { branchBusy } from '../busy.js';
import { siteOf } from '../../_lib/site.js';

const Pricing = globalThis.Pricing;
const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

export const onRequestPost = handle(async ({ request, env }) => {
  const site = siteOf(request);
  const user = await authUser(request, env);
  const config = await loadConfig(env, site);
  if (!config) return fail(503, 'not_configured');
  if (!customerAllowed(user, site)) return fail(401, 'login_required');

  const body = await readJson(request, 100000);
  const customer = body.customer || {};
  const name = str(customer.name, 60);
  // The number is the verified account: whatever the browser sends here is ignored.
  const phone = user.ph;
  const address = str(customer.address, 300);
  const notes = str(customer.notes, 500);
  if (!name) return fail(400, 'name_required');
  if (!phone) return fail(401, 'login_required');
  if (body.type === 'delivery' && address.length < 3) return fail(400, 'address_required');
  const prizeCode = /^[A-Z0-9]{6,12}$/.test(String(body.prizeCode || '')) ? String(body.prizeCode) : '';
  const branchKey = str(body.branchId, 80);
  if (/^[\w-]+$/.test(branchKey) && await branchBusy(env, branchKey, site)) return fail(423, 'restaurant_busy');
  const fs = new Firestore(env, site);
  const now = Date.now();
  const id = orderId(now);

  try {
    const order = await fs.runTransaction(async tx => {
      const [userDoc, counter, prizeDoc] = await fs.getMany([`users/${user.uid}`, 'meta/counter', `prizes/${prizeCode || '_none_'}`], tx);
      const u = userDoc ? userDoc.data : {};
      const available = Number(u.points) || 0;
      let prize = null;
      if (prizeCode) {
        const pz = prizeDoc && prizeDoc.data;
        if (!pz || pz.uid !== user.uid || !prizeActive(pz, now)) throw Object.assign(new Error('prize_invalid'), { status: 409, publicMessage: 'prize_invalid' });
        prize = pz;
      }
      const quote = Pricing.computeOrder(config, body, { lifetimePoints: Number(u.lifetimePoints) || 0, prize });
      if (quote.giftPoints > available) {
        throw Object.assign(new Error('insufficient_points'), { status: 409, publicMessage: 'insufficient_points' });
      }
      const number = ((counter && Number(counter.data.orders)) || 1000) + 1;
      const order = {
        number,
        uid: user.uid,
        customer: { name, phone },
        prize: quote.prize ? { code: prizeCode, label: quote.prize.label, type: quote.prize.type, discount: quote.prizeDiscount } : null,
        address: quote.type === 'delivery' ? address : '',
        notes,
        branchId: quote.branch.id,
        branchName: quote.branch.name,
        type: quote.type,
        zone: quote.zone,
        items: quote.lines.map(l => ({ productId: l.productId, name: l.name, qty: l.qty, options: l.options, notes: l.notes, unitPrice: l.unitPrice, lineTotal: l.lineTotal, ...(l.prize ? { prize: true } : {}) })),
        gifts: quote.gifts.map(g => ({ giftId: g.giftId, name: g.name, qty: g.qty, points: g.points })),
        giftPoints: quote.giftPoints,
        subtotal: quote.subtotal,
        invoiceDiscount: quote.invoiceDiscount,
        level: quote.level,
        levelDiscount: quote.levelDiscount,
        deliveryFee: quote.deliveryFee,
        deliveryDiscount: quote.deliveryDiscount,
        tax: quote.tax,
        total: quote.total,
        currency: quote.currency,
        pointsEarned: quote.pointsEarned,
        pointsAwarded: false,
        giftRefunded: false,
        status: 'pending',
        statusHistory: [{ status: 'pending', at: now, by: 'customer' }],
        lang: config.settings.lang || config.settings.defaultLang || 'en',
        createdAtMs: now,
        day: dayKey(now, config.settings.timezone),
        createdAt: new Date(now)
      };
      // The saved name and address are always the latest ones the customer typed.
      const profile = { name, phone, updatedAt: now };
      if (quote.type === 'delivery') profile.address = address;
      if (!userDoc) Object.assign(profile, { points: 0, lifetimePoints: 0, createdAt: now });
      const writes = [
        fs.set(`orders/${id}`, order, { mustNotExist: true }),
        fs.merge(`users/${user.uid}`, profile, { increments: quote.giftPoints ? { points: -quote.giftPoints } : {} }),
        fs.set('meta/counter', { orders: number })
      ];
      if (prize) writes.push(fs.merge(`prizes/${prizeCode}`, { used: true, usedAt: now, orderId: id, orderNumber: number, orderTotal: order.total }, { mustExist: true }));
      return { writes, result: order };
    });
    return json({ ok: true, id, number: order.number, total: order.total, pointsEarned: order.pointsEarned });
  } catch (e) {
    if (e.code) return fail(400, e.code, { minimum: e.minimum, productId: e.productId, giftId: e.giftId });
    throw e;
  }
});
