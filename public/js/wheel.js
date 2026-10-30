/* ===================== Wheel game (customer side) =====================
   The browser only shows the wheel and animates the answer. Who may spin,
   what they win, the weekly cap and the one-time prize code are all decided
   by /api/wheel/spin on the server. Enabled per site by config.wheel.

   Entry points: a banner on the home and menu pages and a floating button.
   Loaded after phone-auth.js; hooks boot() so it starts once a page is up. */
const Wheel = {
  cfg: null, st: null, spinning: false, rot: 0, imgs: {}, sound: true, audio: null,

  init(pageKey) {
    const w = Store.data && Store.data.wheel;
    if (!w || !w.enabled || !Array.isArray(w.prizes) || !w.prizes.length || document.body.classList.contains('admin-body')) return;
    this.cfg = w;
    const title = w.title || t('wheel_title');
    if (pageKey === 'home') this.banner(document.getElementById('homeAccount') || document.getElementById('homeHero'), 'after', title);
    if (pageKey === 'menu') this.banner(document.getElementById('main'), 'prepend', title);
    if (pageKey !== 'checkout' && pageKey !== 'cart') this.fab(title);
    // /?wheel=1 opens the wheel (used by links and shared images)
    if (new URLSearchParams(location.search).get('wheel') === '1') this.open();
  },

  miniWheel() {
    return `<span class="wheel-mini" aria-hidden="true"><i></i></span>`;
  },
  banner(anchor, where, title) {
    if (!anchor || document.getElementById('wheelBanner')) return;
    const el = document.createElement('button');
    el.type = 'button'; el.id = 'wheelBanner'; el.className = 'wheel-banner';
    el.innerHTML = `${this.miniWheel()}<span class="wheel-banner-text"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(t('wheel_sub'))}</small></span><span class="wheel-banner-cta">${escapeHtml(t('wheel_spin_free'))}</span>`;
    el.addEventListener('click', () => this.open());
    if (where === 'after') anchor.insertAdjacentElement('afterend', el); else anchor.insertAdjacentElement('afterbegin', el);
  },
  fab(title) {
    if (document.getElementById('wheelFab')) return;
    const el = document.createElement('button');
    el.type = 'button'; el.id = 'wheelFab'; el.className = 'wheel-fab';
    el.setAttribute('aria-label', title);
    el.innerHTML = `${this.miniWheel()}<span class="wheel-fab-dot"></span>`;
    el.addEventListener('click', () => this.open());
    document.body.appendChild(el);
    // The button steps aside while the banner is on screen (it would cover the banner's own button).
    const banner = document.getElementById('wheelBanner');
    if (banner && 'IntersectionObserver' in window) new IntersectionObserver(es => el.classList.toggle('wheel-fab-away', es[0].isIntersecting), { threshold: 0.4 }).observe(banner);
  },

  /* ---------- modal ---------- */
  async open() {
    if (!this.cfg) return;
    let ov = document.getElementById('wheelOverlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'wheelOverlay'; ov.className = 'wheel-overlay';
      ov.innerHTML = `
        <div class="wheel-modal" role="dialog" aria-modal="true" aria-labelledby="wheelH">
          <button type="button" class="wheel-close" id="wheelClose" aria-label="${t('close')}"><i data-lucide="x"></i></button>
          <h2 id="wheelH">${escapeHtml(this.cfg.title || t('wheel_title'))}</h2>
          <p class="wheel-sub" id="wheelSub">${escapeHtml(t('wheel_sub'))}</p>
          <div class="wheel-stage" id="wheelStage"><div class="wheel-pointer"></div><canvas id="wheelCanvas" width="640" height="640" aria-hidden="true"></canvas><div class="wheel-hub" id="wheelHub"></div></div>
          <div class="wheel-actions" id="wheelActions"></div>
          <div class="wheel-result hidden" id="wheelResult" aria-live="polite"></div>
          <div class="wheel-prizes" id="wheelPrizes"></div>
          <label class="wheel-sound"><input type="checkbox" id="wheelSound" checked> <span>${t('wheel_sound')}</span></label>
          <canvas id="wheelConfetti" class="wheel-confetti" aria-hidden="true"></canvas>
        </div>`;
      document.body.appendChild(ov);
      ov.addEventListener('click', e => { if (e.target === ov) this.close(); });
      ov.querySelector('#wheelClose').addEventListener('click', () => this.close());
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('open')) this.close(); });
      ov.querySelector('#wheelSound').addEventListener('change', e => { this.sound = e.target.checked; });
      const logo = Store.data.settings.logo;
      if (logo) ov.querySelector('#wheelHub').innerHTML = `<img src="${escapeHtml(logo)}" alt="">`;
      renderIcons();
    }
    ov.classList.add('open'); document.body.classList.add('wheel-open');
    await this.drawWheel('free');
    await this.refresh();
  },
  close() {
    if (this.spinning) return;
    const ov = document.getElementById('wheelOverlay');
    if (ov) ov.classList.remove('open');
    document.body.classList.remove('wheel-open');
  },

  /* Signed out: sign-in box. Signed in: the spins that are available. */
  async refresh() {
    const box = document.getElementById('wheelActions');
    const res = document.getElementById('wheelResult');
    if (!box) return;
    await Auth.init();
    if (!Auth.user) { this.renderLogin(box); document.getElementById('wheelPrizes').innerHTML = ''; return; }
    box.innerHTML = `<p class="mini-note">${t('loading')}</p>`;
    try { this.st = await api('/api/wheel/status', { token: await Auth.token() }); }
    catch (e) {
      if (e.status === 401) { this.renderLogin(box); return; }
      box.innerHTML = `<p class="form-error">${escapeHtml(t('wheel_error'))}</p>`; return;
    }
    if (!this.st.enabled) { box.innerHTML = ''; return; }
    this.renderActions(box);
    this.renderPrizes();
    const dot = document.querySelector('.wheel-fab-dot');
    if (dot) dot.classList.toggle('hidden', !(this.st.freeAvailable || this.st.goldAvailable > 0));
    if (res && !this.spinning) res.classList.add('hidden');
  },

  renderLogin(box) {
    box.innerHTML = `<p class="wheel-login-note">${escapeHtml(t('wheel_login'))}</p>${signInBlockHtml()}`;
    PhoneLogin.mount(box.querySelector('[data-phone-host]'), { compact: true, onDone: () => this.refresh() });
  },
  renderActions(box) {
    const st = this.st;
    const golden = Math.max(0, st.goldAvailable || 0);
    box.innerHTML = `
      ${st.freeAvailable ? `<button type="button" class="btn-primary wheel-spin" data-kind="free">${escapeHtml(t('wheel_spin_free'))}</button>` : `<p class="mini-note wheel-wait">${escapeHtml(t('wheel_next_day'))}</p>`}
      ${golden ? `<button type="button" class="btn-primary wheel-spin gold" data-kind="gold">${escapeHtml(t('wheel_spin_gold', { n: golden }))}</button>` : ''}
      <p class="mini-note">${escapeHtml(t('wheel_golden_hint', { amount: fmtMoney(this.cfg.goldenEvery || 150) }))}</p>`;
    box.querySelectorAll('.wheel-spin').forEach(b => b.addEventListener('click', () => this.spin(b.dataset.kind)));
    this.setGold(!st.freeAvailable && golden > 0);
  },
  renderPrizes() {
    const list = (this.st && this.st.prizes) || [];
    const el = document.getElementById('wheelPrizes');
    if (!el) return;
    el.innerHTML = list.length ? `<h3>${t('wheel_my_prizes')}</h3>` + list.map(p => `
      <div class="wheel-prize-row"><div><strong>${escapeHtml(p.label)}</strong>
        <small>${escapeHtml(this.prizeNote(p))}</small></div></div>`).join('') : '';
  },
  /* "Applied automatically on orders of 100 ₪ or more" (+ the end date only when prizes expire). */
  prizeNote(p) {
    const min = Number(p.minOrder) || 0;
    const parts = [min ? t('wheel_auto_min', { amount: fmtMoney(min) }) : t('wheel_auto')];
    if (Number(p.expiresAt) > 0) parts.push(t('wheel_valid_until', { date: this.fmtDate(p.expiresAt) }));
    return parts.join(' · ');
  },
  fmtDate(ms) { try { return new Date(ms).toLocaleString(langLocale(), { weekday: 'short', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }); } catch (e) { return new Date(ms).toLocaleString(); } },

  /* ---------- drawing ---------- */
  setGold(on) { const s = document.getElementById('wheelStage'); if (s) s.classList.toggle('gold', !!on); },
  prizeImage(p) {
    if (p.image) return p.image;
    const prod = p.type === 'product' && (Store.data.products || []).find(x => x.id === p.productId);
    return (prod && prod.image) || '';
  },
  loadImg(src) {
    if (!src) return Promise.resolve(null);
    if (this.imgs[src]) return this.imgs[src];
    return (this.imgs[src] = new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
  },
  async drawWheel(kind) {
    const cv = document.getElementById('wheelCanvas');
    if (!cv) return;
    const prizes = this.cfg.prizes, n = prizes.length, seg = 2 * Math.PI / n;
    const css = getComputedStyle(document.documentElement);
    const accent = (css.getPropertyValue('--accent') || '#b30000').trim() || '#b30000';
    const imgs = await Promise.all(prizes.map(p => this.loadImg(this.prizeImage(p))));
    const ctx = cv.getContext('2d'), S = cv.width, R = S / 2;
    ctx.clearRect(0, 0, S, S);
    const fills = [accent, '#fff4e3'];
    prizes.forEach((p, i) => {
      const a0 = -Math.PI / 2 + i * seg, a1 = a0 + seg;
      ctx.beginPath(); ctx.moveTo(R, R); ctx.arc(R, R, R - 6, a0, a1); ctx.closePath();
      ctx.fillStyle = p.color || fills[i % 2]; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
      const dark = !p.color && i % 2 === 1;
      ctx.save();
      ctx.translate(R, R); ctx.rotate(a0 + seg / 2);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = dark ? '#3b1d00' : '#fff';
      ctx.font = `800 ${n > 6 ? 26 : 30}px Cairo, Poppins, sans-serif`;
      ctx.direction = 'ltr';
      const label = String(p.label || '');
      ctx.fillText(label.length > 14 ? label.slice(0, 13) + '…' : label, R - 40, 0);
      const img = imgs[i];
      const sz = n > 6 ? 76 : 92, x = R * 0.5;
      if (img) {
        ctx.save(); ctx.beginPath(); ctx.arc(x, 0, sz / 2, 0, 7); ctx.clip(); ctx.rotate(Math.PI / 2 * 0);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - sz / 2, -sz / 2, sz, sz);
        ctx.drawImage(img, x - sz / 2, -sz / 2, sz, sz); ctx.restore();
        ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(x, 0, sz / 2, 0, 7); ctx.stroke();
      } else if (p.type === 'percent') {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, 0, sz / 2, 0, 7); ctx.fill();
        ctx.fillStyle = accent; ctx.font = '800 34px Poppins, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText((Number(p.value) || 0) + '%', x, 2);
      }
      ctx.restore();
    });
    ctx.beginPath(); ctx.arc(R, R, R - 3, 0, 7); ctx.lineWidth = 8; ctx.strokeStyle = kind === 'gold' ? '#d4a017' : accent; ctx.stroke();
  },

  /* ---------- spin ---------- */
  async spin(kind) {
    if (this.spinning) return;
    const box = document.getElementById('wheelActions');
    this.spinning = true;
    box.querySelectorAll('button').forEach(b => { b.disabled = true; });
    document.getElementById('wheelResult').classList.add('hidden');
    this.setGold(kind === 'gold');
    this.audioUnlock();
    let res;
    try { res = await api('/api/wheel/spin', { method: 'POST', token: await Auth.token(), body: { kind } }); }
    catch (e) {
      this.spinning = false;
      toast(t(e.message === 'no_spin_available' ? 'no_spin_available' : 'wheel_error'));
      return this.refresh();
    }
    await this.animateTo(res.prizeIndex);
    this.spinning = false;
    this.celebrate(res.prize);
    await this.refresh();
    document.getElementById('wheelResult').classList.remove('hidden');
  },
  animateTo(index) {
    return new Promise(resolve => {
      const cv = document.getElementById('wheelCanvas');
      const n = this.cfg.prizes.length, seg = 360 / n;
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const jitter = (Math.random() - 0.5) * seg * 0.6;
      const target = -((index + 0.5) * seg + jitter);
      const finalMod = ((target % 360) + 360) % 360, curMod = ((this.rot % 360) + 360) % 360;
      let delta = finalMod - curMod; if (delta <= 0) delta += 360;
      this.rot += (reduce ? 0 : 360 * 6) + delta;
      const ms = reduce ? 400 : 5200;
      cv.style.transition = `transform ${ms}ms cubic-bezier(.12,.62,.08,1)`;
      cv.style.transform = `rotate(${this.rot}deg)`;
      let lastSeg = -1, raf;
      const tick = () => {
        const m = new DOMMatrix(getComputedStyle(cv).transform);
        const ang = (Math.atan2(m.b, m.a) * 180 / Math.PI + 360) % 360;
        const s = Math.floor((((360 - ang) % 360)) / seg);
        if (s !== lastSeg) { if (lastSeg !== -1) this.tick(); lastSeg = s; }
        raf = requestAnimationFrame(tick);
      };
      if (!reduce) raf = requestAnimationFrame(tick);
      setTimeout(() => { cancelAnimationFrame(raf); resolve(); }, ms + 80);
    });
  },

  /* ---------- sound (WebAudio, no files) ---------- */
  audioUnlock() { if (!this.sound) return; try { this.audio = this.audio || new (window.AudioContext || window.webkitAudioContext)(); if (this.audio.state === 'suspended') this.audio.resume(); } catch (e) { this.audio = null; } },
  beep(freq, dur, type = 'square', gain = 0.04, at = 0) {
    if (!this.sound || !this.audio) return;
    try {
      const a = this.audio, o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + at;
      o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) { /* ignore */ }
  },
  tick() { this.beep(900, 0.04); },
  winSound() { [523, 659, 784, 1046].forEach((f, i) => this.beep(f, 0.22, 'triangle', 0.06, i * 0.12)); },

  /* ---------- result ---------- */
  celebrate(prize) {
    const el = document.getElementById('wheelResult');
    el.innerHTML = `
      <div class="wheel-won">
        <small>${escapeHtml(t('wheel_won'))}</small>
        <strong>${escapeHtml(prize.label)}</strong>
        <small>${escapeHtml(this.prizeNote(prize))}</small>
        <div class="wheel-won-actions">
          <a class="btn-primary btn-inline" href="${menuUrl()}">${escapeHtml(t('wheel_use_now'))}</a>
          <button type="button" class="btn-secondary-ghost" id="wheelShare">${escapeHtml(t('wheel_share'))}</button>
        </div>
      </div>`;
    el.classList.remove('hidden');
    el.querySelector('#wheelShare').addEventListener('click', () => this.share(prize));
    this.winSound(); this.confetti();
  },
  confetti() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = document.getElementById('wheelConfetti'), host = cv.parentElement.getBoundingClientRect();
    cv.width = host.width; cv.height = host.height;
    const ctx = cv.getContext('2d'), colors = ['#ffcc00', '#ff4d4d', '#ffffff', '#36cfc9', '#ff9c6e', '#b37feb'];
    const ps = Array.from({ length: 140 }, () => ({ x: cv.width / 2, y: cv.height * 0.38, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, s: 5 + Math.random() * 6, c: colors[Math.floor(Math.random() * colors.length)], r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4 }));
    const t0 = performance.now();
    (function frame(now) {
      const k = (now - t0) / 2600;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(p => { p.vy += 0.4; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
      if (k < 1) requestAnimationFrame(frame); else ctx.clearRect(0, 0, cv.width, cv.height);
    })(t0);
  },

  /* ---------- "share your win": a 9:16 story image ---------- */
  async storyBlob(prize) {
    const W = 1080, H = 1920;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const accent = (css.getPropertyValue('--accent') || '#b30000').trim() || '#b30000';
    const accent2 = (css.getPropertyValue('--accent-2') || accent).trim() || accent;
    try { await document.fonts.load('800 80px Cairo'); await document.fonts.load('600 40px Cairo'); } catch (e) { /* use fallback fonts */ }
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, accent); g.addColorStop(1, '#16181d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(W * (i % 3) / 2, H * (Math.floor(i / 3) + 0.5) / 3, 260, 0, 7); ctx.fill(); }
    const name = tField(Store.data.settings.restaurantName);
    const logo = await this.loadImg(Store.data.settings.logo);
    ctx.textAlign = 'center'; ctx.direction = Store.data.settings.lang === 'ar' ? 'rtl' : 'ltr';
    let y = 260;
    if (logo) {
      ctx.save(); ctx.beginPath(); ctx.arc(W / 2, y, 150, 0, 7); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(W / 2 - 150, y - 150, 300, 300);
      const k = Math.min(300 / logo.width, 300 / logo.height); ctx.drawImage(logo, W / 2 - logo.width * k / 2, y - logo.height * k / 2, logo.width * k, logo.height * k); ctx.restore();
      ctx.lineWidth = 10; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(W / 2, y, 150, 0, 7); ctx.stroke();
      y += 260;
    }
    ctx.fillStyle = '#fff'; ctx.font = '800 70px Cairo, Poppins, sans-serif'; ctx.fillText(name, W / 2, y); y += 200;
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '600 56px Cairo, Poppins, sans-serif'; ctx.fillText(t('wheel_won'), W / 2, y); y += 150;
    // prize card
    const pimg = await this.loadImg(this.prizeImage(Object.assign({ type: prize.type, productId: prize.productId, image: prize.image })));
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(110, y - 70, W - 220, 620, 60); ctx.fill();
    if (pimg) { ctx.save(); ctx.beginPath(); ctx.roundRect(W / 2 - 170, y - 20, 340, 340, 40); ctx.clip(); ctx.drawImage(pimg, W / 2 - 170, y - 20, 340, 340); ctx.restore(); }
    else if (prize.type === 'percent') { ctx.fillStyle = accent; ctx.font = '800 220px Poppins, sans-serif'; ctx.fillText((Number(prize.value) || 0) + '%', W / 2, y + 230); }
    ctx.fillStyle = '#16181d'; ctx.font = '800 92px Cairo, Poppins, sans-serif';
    this.wrapText(ctx, prize.label, W / 2, y + 450, W - 300, 100);
    y += 760;
    ctx.fillStyle = accent2 === accent ? '#ffd666' : accent2;
    ctx.beginPath(); ctx.roundRect(W / 2 - 360, y, 720, 120, 60); ctx.fill();
    ctx.fillStyle = '#16181d'; ctx.font = '800 54px Cairo, Poppins, sans-serif'; ctx.fillText(t('wheel_title'), W / 2, y + 78);
    ctx.fillStyle = '#fff'; ctx.font = '600 48px Poppins, Cairo, sans-serif'; ctx.direction = 'ltr';
    ctx.fillText(location.host, W / 2, H - 140);
    return new Promise(res => cv.toBlob(b => res(b), 'image/png'));
  },
  wrapText(ctx, text, x, y, maxW, lh) {
    const words = String(text).split(' '); let line = '', lines = [];
    words.forEach(w => { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; });
    lines.push(line);
    const top = y - (lines.length - 1) * lh / 2;
    lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, x, top + i * lh));
  },
  async share(prize) {
    try {
      const blob = await this.storyBlob(prize);
      if (!blob) throw new Error('no image');
      const file = new File([blob], 'wheel-win.png', { type: 'image/png' });
      const text = `${t('wheel_won')} ${prize.label}! ${location.origin}`;
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, url: location.origin }); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'wheel-win.png'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) { if (e && e.name !== 'AbortError') { console.error(e); toast(t('wheel_share_failed')); } }
  }
};

/* Start the wheel once a page has booted. */
(function () {
  const original = window.boot;
  if (typeof original !== 'function') return;
  window.boot = async function (pageKey, render, opts) {
    await original(pageKey, render, opts);
    try { Wheel.init(pageKey); } catch (e) { console.error(e); }
  };
})();
