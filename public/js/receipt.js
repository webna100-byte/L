/* ===================== Receipt printing =====================
   Builds a self-contained receipt sized for 80mm / 58mm thermal printers
   (or A4) and prints it from a hidden iframe. Works with any printer the
   device can reach, including Bluetooth/USB thermal printers set up in the
   OS print dialog. */
let printBusy = false;
function printReceipt(order, config) {
  // One click = one receipt: ignore repeat clicks while a print is in flight.
  if (!order || printBusy) return;
  printBusy = true;
  setTimeout(() => { printBusy = false; }, 4000);
  const s = config.settings || {};
  const opts = s.receipt || {};
  // The receipt is printed in the site's language.
  const lang = contentLang();
  const width = opts.paperWidth === 'a4' ? null : (Number(opts.paperWidth) || 80);
  const tf = f => tField(f, lang);
  const T = (k, v) => translate(lang, k, v);
  const L = {
    order: T('receipt_order'), date: T('receipt_date'), branch: T('branch'), type: T('order_type'), pickup: T('type_pickup'), delivery: T('type_delivery'),
    customer: T('customer'), phone: T('rc_phone'), address: T('rc_address'), zone: T('rc_zone'), notes: T('notes'), subtotal: T('subtotal'),
    inv: T('invoice_discount'), level: T('rc_level_discount'), fee: T('delivery_fee'), feeDisc: T('delivery_discount'), tax: T('tax'),
    total: T('total').toUpperCase(), gift: T('gift'), free: T('free'), thanks: T('receipt_thanks'), pts: T('pts')
  };
  const dec = Pricing.currencyDecimals(order.currency || s.currency || 'EUR');
  const cur = (CURRENCIES.find(c => c.code === (order.currency || s.currency)) || {});
  const money = n => {
    if (lang === 'ar') return `${Number(Pricing.round(n, dec)).toFixed(dec)} ${cur.symbol || ''}`;
    try { return new Intl.NumberFormat(langLocale(lang), { style: 'currency', currency: cur.code || 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n); }
    catch (e) { return `${Number(Pricing.round(n, dec)).toFixed(dec)} ${cur.symbolEn || ''}`; }
  };
  const esc = escapeHtml;
  const date = new Intl.DateTimeFormat(langLocale(lang), { dateStyle: 'short', timeStyle: 'short', timeZone: s.timezone || undefined }).format(new Date(order.createdAtMs));
  const row = (a, b, cls = '') => `<tr class="${cls}"><td>${a}</td><td class="r">${b}</td></tr>`;
  const items = (order.items || []).map(i => `<tr><td>${i.qty}× ${esc(tf(i.name))}${tf(i.options) || i.notes ? `<div class="sub">${esc([tf(i.options), i.notes].filter(Boolean).join(' • '))}</div>` : ''}</td><td class="r">${money(i.lineTotal)}</td></tr>`).join('')
    + (order.gifts || []).map(g => `<tr><td>${g.qty}× ${esc(tf(g.name))}<div class="sub">${L.gift} · ${g.points} ${L.pts}</div></td><td class="r">${L.free}</td></tr>`).join('');
  const html = `<!DOCTYPE html><html lang="${lang}" dir="${SITE_LANGS[lang].rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>#${order.number}</title><style>
    @page { size: ${width ? width + 'mm auto' : 'A4'}; margin: ${width ? '2mm' : '12mm'}; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Tahoma, Arial, sans-serif; color: #000; font-size: ${width === 58 ? 11 : 12.5}px; width: ${width ? (width - 4) + 'mm' : 'auto'}; }
    h1 { font-size: 1.35em; text-align: center; margin: 2px 0; }
    .c { text-align: center; } .num { font-size: 1.9em; font-weight: 700; text-align: center; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; } td { padding: 2px 0; vertical-align: top; } .r { text-align: end; white-space: nowrap; padding-inline-start: 6px; }
    .sub { font-size: .85em; color: #333; } hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
    .total td { font-weight: 700; font-size: 1.2em; padding-top: 4px; } .notes { border: 1px solid #000; padding: 4px; margin: 4px 0; font-weight: 700; }
    .big { font-weight: 700; }
    html, body { height: auto; overflow: visible; } tr, .notes { break-inside: avoid; }
  </style></head><body>
    ${s.logo ? `<div class="c"><img src="${esc(s.logo)}" style="max-height:48px;max-width:60%;filter:grayscale(1)"></div>` : ''}
    <h1>${esc(tf(s.restaurantName))}</h1>
    <div class="c">${esc(tf(order.branchName))}</div>
    <div class="num">${L.order} #${order.number}</div>
    <div class="c big">${order.type === 'delivery' ? L.delivery : L.pickup}</div>
    <div class="c">${esc(date)}</div>
    <hr>
    <table>
      ${row(L.customer, esc(order.customer?.name || ''))}
      ${row(L.phone, `<span dir="ltr">${esc(order.customer?.phone || '')}</span>`)}
      ${order.zone ? row(L.zone, esc(tf(order.zone.name))) : ''}
    </table>
    ${order.address ? `<div><b>${L.address}:</b> ${esc(order.address)}</div>` : ''}
    ${order.notes ? `<div class="notes">${L.notes}: ${esc(order.notes)}</div>` : ''}
    <hr><table>${items}</table><hr>
    <table>
      ${row(L.subtotal, money(order.subtotal))}
      ${order.invoiceDiscount ? row(L.inv, '−' + money(order.invoiceDiscount)) : ''}
      ${order.levelDiscount ? row(L.level, '−' + money(order.levelDiscount)) : ''}
      ${order.type === 'delivery' ? row(L.fee, money(order.deliveryFee || 0)) : ''}
      ${order.deliveryDiscount ? row(L.feeDisc, '−' + money(order.deliveryDiscount)) : ''}
      ${order.tax ? row(L.tax, money(order.tax)) : ''}
      ${row(L.total, money(order.total), 'total')}
    </table>
    <hr><div class="c">${L.thanks}</div>
  </body></html>`;
  let frame = document.getElementById('printFrame');
  if (frame) frame.remove();
  frame = document.createElement('iframe');
  frame.id = 'printFrame';
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  let printed = false;
  const go = () => { if (printed) return; printed = true; frame.contentWindow.focus(); frame.contentWindow.print(); setTimeout(() => { printBusy = false; }, 800); };
  const img = doc.querySelector('img');
  if (img && !img.complete) { img.onload = go; img.onerror = go; setTimeout(go, 1500); } else setTimeout(go, 150);
}
