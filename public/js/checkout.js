/* ===================== Checkout ===================== */
boot('checkout', async (data) => {
  const user = Auth.user;
  // The customer signs in right here (number + Confirm), so a visitor without a session still sees the page.
  if (Store.isMultiBranch() && !Store.getSelectedBranch()) { location.replace('/branches'); return; }
  const branchId = Store.ensureBranch();
  const branch = data.branches.find(b => b.id === branchId);
  const cart = Store.getCart();
  const gifts = Store.getGiftCart();
  if (!branch || (!cart.length && !gifts.length)) { location.replace('/cart'); return; }

  const pickupOn = branch.pickupEnabled !== false;
  const deliveryOn = branch.deliveryEnabled !== false;
  const zones = Array.isArray(branch.deliveryZones) ? branch.deliveryZones : [];
  let orderType = pickupOn ? 'pickup' : 'delivery';
  let me = { name: (user && user.displayName) || '', phone: '', address: '', lifetimePoints: 0, points: 0 };
  if (user) { try { me = { ...me, ...(await Auth.profile(true)) }; } catch (e) { console.error(e); } }
  let identified = !!user;   // true once the number is confirmed
  let prizes = [], activePrize = null, prizeOff = false;

  document.getElementById('pageTitle').textContent = t('checkout');
  const root = document.getElementById('checkoutRoot');
  root.innerHTML = `
    ${Store.isMultiBranch() ? `<div class="menu-branch-bar"><span><i data-lucide="map-pin"></i> ${tx(branch.name)}</span><a href="/branches">${t('change_branch')}</a></div>` : ''}
    <div class="order-type-tabs ${pickupOn && deliveryOn ? '' : 'hidden'}">
      <button type="button" class="order-type-btn" id="pickupTab"><i data-lucide="shopping-bag"></i><span>${t('pickup')}</span></button>
      <button type="button" class="order-type-btn" id="deliveryTab"><i data-lucide="bike"></i><span>${t('delivery')}</span></button>
    </div>
    ${pickupOn && deliveryOn ? '' : `<p class="mini-note notice">${pickupOn ? t('only_pickup') : t('only_delivery')}</p>`}
    <div class="busy-banner hidden" id="busyBanner"><i data-lucide="clock"></i><span>${t('restaurant_busy')}</span></div>
    <div class="card phone-gate" id="phoneGate"></div>
    <form id="checkoutForm" class="${identified ? '' : 'hidden'}" novalidate>
      <div class="card">
        <h3 id="infoTitle"></h3>
        <div class="form-group"><label for="custName">${t('name')} <span class="req">*</span></label><input type="text" id="custName" maxlength="60" autocomplete="name" value="${escapeHtml(me.name)}" required></div>
        <div class="form-group delivery-only"><label for="custZone">${t('zone')} <span class="req">*</span></label>
          <select id="custZone">${zones.length ? `<option value="">${t('select_zone')}</option>` + zones.map(z => `<option value="${escapeHtml(z.id)}">${tx(z.name)} — ${fmtMoney(z.price)}</option>`).join('') : `<option value="">${t('no_zones')}</option>`}</select>
        </div>
        <div class="form-group delivery-only"><label for="custAddress">${t('address')} <span class="req">*</span></label><textarea id="custAddress" class="notes-field" maxlength="300" autocomplete="street-address">${escapeHtml(me.address)}</textarea></div>
        <div class="form-group"><label for="custNotes">${t('order_notes')}</label><textarea id="custNotes" class="notes-field" maxlength="500"></textarea></div>
      </div>
      <div class="card">
        <h3>${t('order_summary')}</h3>
        <div id="prizeBox"></div>
        <div id="orderSummary"></div>
      </div>
      <p class="form-error hidden" id="formError"></p>
      <button type="submit" class="btn-primary" id="sendBtn"><i data-lucide="send"></i> <span>${t('place_order')}</span></button>
    </form>`;

  const zoneSelect = document.getElementById('custZone');
  const pickupTab = document.getElementById('pickupTab');
  const deliveryTab = document.getElementById('deliveryTab');
  pickupTab.addEventListener('click', () => setType('pickup'));
  deliveryTab.addEventListener('click', () => setType('delivery'));
  zoneSelect.addEventListener('change', renderSummary);

  function setType(type) {
    if (type === 'pickup' && !pickupOn) type = 'delivery';
    if (type === 'delivery' && !deliveryOn) type = 'pickup';
    orderType = type;
    pickupTab.classList.toggle('active', type === 'pickup');
    deliveryTab.classList.toggle('active', type === 'delivery');
    root.querySelectorAll('.delivery-only').forEach(el => el.classList.toggle('hidden', type !== 'delivery'));
    document.getElementById('infoTitle').textContent = type === 'pickup' ? t('pickup_info') : t('delivery_info');
    renderSummary();
  }

  function input() {
    return {
      branchId: branch.id,
      type: orderType,
      zoneId: zoneSelect.value,
      items: Store.getCart().map(i => ({ productId: i.productId, qty: i.qty, selections: i.selections, notes: i.notes })),
      gifts: Store.getGiftCart().map(g => ({ giftId: g.giftId, qty: g.qty })),
      prizeCode: appliedPrize() ? activePrize.code : undefined
    };
  }

  /* The wheel prize used for this order, if it can be (right number, big enough order). */
  function appliedPrize() { return activePrize && !prizeOff ? activePrize : null; }

  function errorText(code, extra = {}) {
    if (code === 'prize_min_order') return t('prize_min_order', { amount: fmtMoney(extra.minimum || 0) });
    if (code === 'below_minimum') return t('below_minimum', { amount: fmtMoney(extra.minimum || data.settings.minimumOrder || 0) });
    if (code === 'empty_cart') return t('empty_cart_err');
    const map = { zone_required: 'zone_required', no_zones: 'no_zones', product_unavailable: 'product_unavailable', invalid_option: 'invalid_option', invalid_gift: 'invalid_gift', insufficient_points: 'insufficient_points', restaurant_busy: 'restaurant_busy', phone_invalid: 'phone_invalid', address_required: 'address_required', name_required: 'name_required', login_required: 'login_required_to_order', prize_invalid: 'prize_invalid', prize_min_order: 'prize_min_order', prize_unavailable: 'prize_unavailable' };
    return map[code] ? t(map[code]) : t('order_failed');
  }

  let quote = null;
  function renderSummary() {
    const box = document.getElementById('orderSummary');
    let q, error = null;
    const probe = { ...input() };
    // Show totals even before a zone is picked.
    if (orderType === 'delivery' && !probe.zoneId && zones.length) probe.zoneId = zones[0].id;
    const customer = { lifetimePoints: me.lifetimePoints, prize: appliedPrize() };
    try { q = Pricing.computeOrder(data, probe, customer); } catch (e) { error = e; }
    if (!q && error && /^prize_/.test(error.code)) {
      // The prize does not fit this order (too small, item unavailable): show the order without it.
      const why = error; error = null;
      try { q = Pricing.computeOrder(data, probe, { lifetimePoints: me.lifetimePoints }); } catch (e) { error = e; }
      renderPrizeBox(why);
    } else renderPrizeBox(null);
    if (!q) {
      try { q = Pricing.computeOrder(data, { ...probe, type: 'pickup' }, { lifetimePoints: me.lifetimePoints }); } catch (e2) { q = null; }
    }
    quote = q;
    if (!q) { box.innerHTML = `<p class="form-error">${escapeHtml(errorText(error && error.code, error))}</p>`; return; }
    const line = (label, value, cls = '') => `<div class="checkout-line ${cls}"><span>${escapeHtml(label)}</span><span>${value}</span></div>`;
    let html = q.lines.map(l => `
      <div class="summary-item"><div><strong>${l.qty}× ${tx(l.name)}</strong>${tField(l.options) || l.notes ? `<div class="mini-note">${escapeHtml([tField(l.options), l.notes].filter(Boolean).join(' • '))}</div>` : ''}</div><span>${fmtMoney(l.lineTotal)}</span></div>`).join('');
    html += q.gifts.map(g => `
      <div class="summary-item gift"><div><strong>${g.qty}× ${tx(g.name)}</strong><div class="mini-note"><i data-lucide="gift"></i> ${fmtNumber(g.points)} ${t('pts')}</div></div><span>${t('free')}</span></div>`).join('');
    html += line(t('subtotal'), fmtMoney(q.subtotal));
    if (q.invoiceDiscount) html += line(t('invoice_discount'), '−' + fmtMoney(q.invoiceDiscount), 'discount');
    if (q.levelDiscount) html += line(t('level_discount', { level: tField(q.level.name) }) + ` (${q.level.discountPercent}%)`, '−' + fmtMoney(q.levelDiscount), 'discount');
    if (q.prizeDiscount) html += line(t('prize_line') + ': ' + q.prize.label, '−' + fmtMoney(q.prizeDiscount), 'discount');
    if (orderType === 'delivery' && q.type === 'delivery') {
      html += line(t('delivery_fee'), q.deliveryFee ? fmtMoney(q.deliveryFee) : t('free'));
      if (q.deliveryDiscount) html += line(t('delivery_discount'), '−' + fmtMoney(q.deliveryDiscount), 'discount');
    }
    if (q.tax) html += line(t('tax'), fmtMoney(q.tax));
    html += `<div class="checkout-total"><span>${t('total')}</span><span>${fmtMoney(q.total)}</span></div>`;
    if (q.pointsEarned) html += `<p class="points-note"><i data-lucide="sparkles"></i> ${escapeHtml(t('points_to_earn', { n: fmtNumber(q.pointsEarned) }))}</p>`;
    if (error) html = `<p class="form-error">${escapeHtml(errorText(error.code, error))}</p>` + html;
    box.innerHTML = html;
    renderIcons();
  }

  /* Wheel prize card above the summary: applied automatically, can be removed. */
  function renderPrizeBox(problem) {
    const box = document.getElementById('prizeBox');
    if (!box) return;
    if (!activePrize) { box.innerHTML = ''; return; }
    const min = Number(activePrize.minOrder) || 0;
    box.innerHTML = `<div class="prize-box ${prizeOff ? 'off' : ''}">
      <span class="prize-box-icon"><i data-lucide="gift"></i></span>
      <div class="prize-box-text"><strong>${escapeHtml(prizeOff ? activePrize.label : t('prize_applied', { label: activePrize.label }))}</strong>
        ${problem ? `<small class="warn">${escapeHtml(errorText(problem.code, problem))}</small>` : (min ? `<small>${escapeHtml(t('wheel_min_order', { amount: fmtMoney(min) }))}</small>` : '')}</div>
      <button type="button" class="link-btn" id="prizeToggle">${prizeOff ? t('prize_use') : t('prize_remove')}</button>
    </div>`;
    document.getElementById('prizeToggle').addEventListener('click', () => { prizeOff = !prizeOff; renderSummary(); });
    renderIcons();
  }
  async function loadPrizes() {
    prizes = []; activePrize = null;
    if (!Store.data.wheel || !Store.data.wheel.enabled || !Auth.user) return;
    try { prizes = (await api('/api/wheel/status', { token: await Auth.token() })).prizes || []; } catch (e) { return; }
    activePrize = prizes[0] || null;     // the one that expires first
    renderSummary();
  }

  setType(orderType);

  /* ----- Phone sites: number + Confirm first, the rest appears afterwards ----- */
  const nameInput = document.getElementById('custName');
  const addressInput = document.getElementById('custAddress');
  const formEl = document.getElementById('checkoutForm');
  function showGate() {
    const gate = document.getElementById('phoneGate');
    if (!gate) return;
    if (identified) {
      const phone = me.phone || Auth.phoneLabel();
      gate.innerHTML = `<div class="phone-confirmed"><span><i data-lucide="check-circle-2"></i> <strong dir="ltr">${escapeHtml(phone)}</strong></span><button type="button" class="link-btn" id="changePhone">${t('change_number')}</button></div>`;
      document.getElementById('changePhone').addEventListener('click', async () => {
        await Auth.signOut(); me = { name: '', phone: '', address: '', lifetimePoints: 0, points: 0 }; identified = false; prizes = []; activePrize = null;
        nameInput.value = ''; addressInput.value = ''; formEl.classList.add('hidden'); showGate(); renderSummary();
      });
      renderIcons();
    } else {
      gate.innerHTML = `<h3>${t('phone_label')}</h3><p class="mini-note">${t('confirm_phone_first')}</p><div id="gateHost"></div>`;
      PhoneLogin.mount(document.getElementById('gateHost'), {
        onDone: async (profile, { phone }) => {
          try { me = { ...me, ...(await Auth.profile(true)) }; } catch (e) { console.error(e); }
          me.phone = me.phone || phone;
          // Known numbers come back with their saved details; both fields stay editable.
          nameInput.value = profile.name || me.name || '';
          addressInput.value = profile.address || me.address || '';
          identified = true; formEl.classList.remove('hidden'); showGate(); renderSummary(); loadPrizes();
          formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }
  showGate();
  if (identified) loadPrizes();

  /* "Busy" mode set by the branch cashier: no new orders until it is off. */
  let busy = false;
  async function checkBusy() {
    try { busy = !!(await api('/api/busy?branchId=' + encodeURIComponent(branch.id))).busy; } catch (e) { return; }
    const banner = document.getElementById('busyBanner'), btn = document.getElementById('sendBtn');
    if (!banner || !btn) return;
    banner.classList.toggle('hidden', !busy);
    btn.disabled = busy;
    if (busy) window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  checkBusy();
  const busyTimer = setInterval(() => { if (document.getElementById('busyBanner')) checkBusy(); else clearInterval(busyTimer); }, 30000);

  const form = document.getElementById('checkoutForm');
  const errBox = document.getElementById('formError');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    errBox.classList.add('hidden');
    const name = document.getElementById('custName').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    const notes = document.getElementById('custNotes').value.trim();
    const showErr = msg => { errBox.textContent = msg; errBox.classList.remove('hidden'); errBox.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    if (busy) return showErr(t('restaurant_busy'));
    if (!name) return showErr(t('name_required'));
    if (!identified) return showErr(t('confirm_phone_first'));
    if (orderType === 'delivery') {
      if (!zoneSelect.value) return showErr(t('zone_required'));
      if (address.length < 3) return showErr(t('address_required'));
    }
    try { Pricing.computeOrder(data, input(), { lifetimePoints: me.lifetimePoints, prize: appliedPrize() }); } catch (err) { return showErr(errorText(err.code, err)); }
    const giftCost = Store.giftCartPoints();
    if (giftCost > (Number(me.points) || 0)) return showErr(t('insufficient_points'));

    const btn = document.getElementById('sendBtn');
    btn.disabled = true; btn.classList.add('loading');
    try {
      const res = await api('/api/orders/create', {
        method: 'POST',
        token: await Auth.token(),
        body: { ...input(), customer: { name, address, notes } }
      });
      Store.saveCart([]);
      Store.clearGiftCart();
      Auth._profile = null;
      updateCartCount();
      document.getElementById('pageTitle').classList.add('hidden');
      root.innerHTML = `
        <div class="success-card">
          <span class="success-icon"><i data-lucide="check"></i></span>
          <h2>${t('order_sent_title')}</h2>
          <p>${escapeHtml(t('order_sent_text', { n: res.number }))}</p>
          ${res.pointsEarned ? `<p class="points-note"><i data-lucide="sparkles"></i> ${escapeHtml(t('points_to_earn', { n: fmtNumber(res.pointsEarned) }))}</p>` : ''}
          <a class="btn-primary btn-inline" href="/orders">${t('view_my_orders')}</a>
        </div>`;
      renderIcons();
      window.scrollTo({ top: 0 });
    } catch (err) {
      console.error(err);
      btn.disabled = false; btn.classList.remove('loading');
      if (err.status === 401) { identified = false; formEl.classList.add('hidden'); showGate(); return showErr(t('login_required_to_order')); }
      showErr(errorText(err.message, err.data || {}));
      if (err.message === 'restaurant_busy') checkBusy();
      if (err.message === 'insufficient_points') { Auth._profile = null; }
      if (err.message === 'prize_invalid') { prizeOff = true; loadPrizes(); }
    }
  });
}, { colors: 'checkout', needsAuth: true });
