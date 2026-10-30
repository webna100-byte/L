/* GET /api/admin/report?month=YYYY-MM (admin) -> the month's website numbers:
   delivered orders, sales (food after discounts, delivery fees excluded),
   new subscribers (new verified phone numbers), new customers (new numbers
   with a delivered order that month), wheel spins and prize orders, plus a
   daily table. `commissionPercent` comes from settings.report.commissionPercent
   so an agency paid a percentage can show the exact amount. */
import { json, fail, handle, authUser, isAdmin, loadConfig } from '../../_lib/http.js';
import { Firestore, where } from '../../_lib/firestore.js';
import { siteOf } from '../../_lib/site.js';
import { dayKey } from '../../_lib/orders.js';

const num = v => Number(v) || 0;
const round2 = v => Math.round(v * 100) / 100;

export const onRequestGet = handle(async ({ request, env }) => {
  const site = siteOf(request);
  if (!isAdmin(await authUser(request, env), site)) return fail(401, 'unauthorized');
  const config = await loadConfig(env, site);
  const tz = config && config.settings && config.settings.timezone;
  const month = new URL(request.url).searchParams.get('month') || dayKey(Date.now(), tz).slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return fail(400, 'invalid_month');
  const [y, m] = month.split('-').map(Number);
  const first = `${month}-01`, last = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
  // Time-zone safe bounds for the numeric timestamps (a day either side, filtered by day key below).
  const fromMs = Date.UTC(y, m - 1, 1) - 86400000, toMs = Date.UTC(y, m, 1) + 86400000;

  const fs = new Firestore(env, site);
  const [orders, users, spins] = await Promise.all([
    fs.query('orders', { where: { compositeFilter: { op: 'AND', filters: [where('day', 'GREATER_THAN_OR_EQUAL', first), where('day', 'LESS_THAN_OR_EQUAL', last)] } }, limit: 5000 }),
    fs.query('users', { where: { compositeFilter: { op: 'AND', filters: [where('createdAt', 'GREATER_THAN_OR_EQUAL', fromMs), where('createdAt', 'LESS_THAN', toMs)] } }, limit: 5000 }),
    fs.query('spins', { where: { compositeFilter: { op: 'AND', filters: [where('at', 'GREATER_THAN_OR_EQUAL', fromMs), where('at', 'LESS_THAN', toMs)] } }, limit: 5000 })
  ]);

  const days = {};
  const dayRow = d => days[d] || (days[d] = { day: d, orders: 0, sales: 0 });
  let delivered = 0, cancelled = 0, sales = 0, gross = 0, prizeOrders = 0;
  const buyers = new Set();
  for (const { data: o } of orders) {
    if (o.status === 'cancelled') { cancelled++; continue; }
    if (o.status !== 'delivered') continue;
    const food = Math.max(0, num(o.total) - num(o.deliveryFee) + num(o.deliveryDiscount));
    delivered++; sales += food; gross += num(o.total);
    if (o.prize && o.prize.code) prizeOrders++;
    buyers.add(o.uid);
    const r = dayRow(o.day); r.orders++; r.sales += food;
  }
  const monthUsers = users.filter(u => {
    const d = dayKey(num(u.data.createdAt), tz);
    return d >= first && d <= last;
  });
  const newCustomers = monthUsers.filter(u => buyers.has(u.id)).length;
  const pct = Math.max(0, Math.min(100, num(config && config.settings && config.settings.report && config.settings.report.commissionPercent)));
  const salesR = round2(sales);
  return json({
    month, currency: config && config.settings && config.settings.currency, percent: pct,
    delivered, cancelled, sales: salesR, gross: round2(gross), average: delivered ? round2(sales / delivered) : 0,
    subscribers: monthUsers.length, newCustomers,
    spins: spins.filter(s => { const d = dayKey(num(s.data.at), tz); return d >= first && d <= last; }).length,
    prizeOrders, commission: round2(salesR * pct / 100),
    days: Object.values(days).sort((a, b) => a.day.localeCompare(b.day)).map(d => ({ ...d, sales: round2(d.sales) }))
  });
});
