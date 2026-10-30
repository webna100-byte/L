/* ===================== Phone sign-in (customers) =====================
   Sites with settings.auth.mode = 'phone' have NO Google sign-in: the
   customer's mobile number is the account. The flow, everywhere it appears:
     1. type the number and press "Confirm"
     2. a number we have seen before signs in at once (no message) and the
        saved name/address are handed back to be pre-filled
     3. a new number gets a one-time code (SMS/WhatsApp) to type in
   Loaded after ui.js; also owns the new texts (English + Arabic, other
   languages fall back to English). */
Object.assign(I18N.en, {
  phone_label: 'Mobile number', phone_ph: '059 123 4567', confirm: 'Confirm', otp_label: 'Verification code',
  otp_sent_to: 'We sent a code to {phone}', verify: 'Verify', resend: 'Resend code', resend_in: 'Resend in {n}s',
  change_number: 'Change number', otp_invalid: 'The code is wrong or has expired.', too_many_requests: 'Too many attempts. Please try again later.',
  phone_login_title: 'Sign in with your mobile number', phone_login_text: 'Enter your number to order, collect points and spin the wheel.',
  signed_in_as: 'Signed in as', confirm_phone_first: 'Confirm your mobile number to continue.', dev_code: 'Test code: {code}', login_failed: 'Could not sign in. Please try again.',
  prize_invalid: 'This prize is no longer valid.', prize_min_order: 'Your prize needs an order of at least {amount}.', prize_unavailable: 'The prize item is not available at this branch.',
  prize_applied: 'Wheel prize applied: {label}', prize_remove: 'Remove', prize_use: 'Use prize', prize_line: 'Wheel prize',
  wheel_title: 'Spin the wheel and win!', wheel_sub: 'One free spin every day', wheel_spin_free: 'Free spin', wheel_spin_gold: 'Golden spin ({n})',
  wheel_next_day: 'Your next free spin is tomorrow.', wheel_login: 'Sign in to spin the wheel', wheel_won: 'Congratulations! You won', wheel_code: 'Prize code',
  wheel_valid_until: 'Valid until {date}', wheel_min_order: 'On orders of {amount} or more', wheel_use_now: 'Use it now', wheel_share: 'Share your win',
  wheel_my_prizes: 'My prizes', wheel_none: 'No prizes yet', wheel_golden_hint: 'You earn a golden spin for every {amount} you spend.', wheel_error: 'The spin failed. Please try again.',
  no_spin_available: 'No spin available right now.', wheel_sound: 'Sound', wheel_spinning: 'Spinning…', wheel_share_failed: 'Could not create the image.'
});
Object.assign(I18N.ar, {
  phone_label: 'رقم الجوال', phone_ph: '059 123 4567', confirm: 'تأكيد', otp_label: 'رمز التحقق',
  otp_sent_to: 'أرسلنا رمز التحقق إلى {phone}', verify: 'تحقق', resend: 'إعادة إرسال الرمز', resend_in: 'إعادة الإرسال بعد {n} ث',
  change_number: 'تغيير الرقم', otp_invalid: 'الرمز غير صحيح أو انتهت صلاحيته.', too_many_requests: 'محاولات كثيرة، حاول لاحقًا.',
  phone_login_title: 'سجّل دخولك برقم جوالك', phone_login_text: 'أدخل رقمك لتطلب وتجمع النقاط وتلف العجلة.',
  signed_in_as: 'مسجّل برقم', confirm_phone_first: 'أكّد رقم جوالك للمتابعة.', dev_code: 'رمز التجربة: {code}', login_failed: 'تعذّر تسجيل الدخول، حاول مرة أخرى.',
  prize_invalid: 'هذه الجائزة لم تعد صالحة.', prize_min_order: 'جائزتك تحتاج طلبًا بقيمة {amount} على الأقل.', prize_unavailable: 'منتج الجائزة غير متوفر في هذا الفرع.',
  prize_applied: 'تم تطبيق جائزة العجلة: {label}', prize_remove: 'إزالة', prize_use: 'استخدم الجائزة', prize_line: 'جائزة العجلة',
  wheel_title: 'لف العجلة واربح!', wheel_sub: 'لفّة مجانية كل يوم', wheel_spin_free: 'لفّة مجانية', wheel_spin_gold: 'لفّة ذهبية ({n})',
  wheel_next_day: 'لفّتك المجانية القادمة غدًا.', wheel_login: 'سجّل دخولك لتلف العجلة', wheel_won: 'مبروك! ربحت', wheel_code: 'كود الجائزة',
  wheel_valid_until: 'صالحة حتى {date}', wheel_min_order: 'عند طلب بقيمة {amount} أو أكثر', wheel_use_now: 'استخدمها الآن', wheel_share: 'شارك نتيجتك',
  wheel_my_prizes: 'جوائزي', wheel_none: 'لا توجد جوائز حاليًا', wheel_golden_hint: 'تحصل على لفّة ذهبية مقابل كل {amount} مشتريات.', wheel_error: 'تعذّرت اللفّة، حاول مرة أخرى.',
  no_spin_available: 'لا توجد لفّة متاحة الآن.', wheel_sound: 'الصوت', wheel_spinning: 'تدور العجلة…', wheel_share_failed: 'تعذّر إنشاء الصورة.'
});

Object.assign(Auth, {
  mode() { const a = Store.data && Store.data.settings && Store.data.settings.auth; return a && a.mode === 'phone' ? 'phone' : 'google'; },
  phoneLookup(phone) { return api('/api/auth/phone/lookup', { method: 'POST', body: { phone } }); },
  phoneVerify(phone, code) { return api('/api/auth/phone/verify', { method: 'POST', body: { phone, code } }); },
  async signInWithToken(token, phone) {
    const { m, auth } = await FB.auth();
    const cred = await m.signInWithCustomToken(auth, token);
    this.user = cred.user; this.resolved = true; this._profile = null; this._setHint(true);
    try { localStorage.setItem(skey('auth_phone'), phone); } catch (e) { /* ignore */ }
    this._listeners.forEach(fn => { try { fn(cred.user); } catch (e) { console.error(e); } });
    return cred.user;
  },
  phoneLabel() { try { return localStorage.getItem(skey('auth_phone')) || ''; } catch (e) { return ''; } }
});

function phoneErrorText(code) {
  return ({ phone_invalid: t('phone_invalid'), otp_invalid: t('otp_invalid'), too_many_requests: t('too_many_requests') })[code] || t('login_failed');
}

/* PhoneLogin.mount(root, { onDone(profile, { existing, phone }) }) builds the
   "number + Confirm" box, and the code box that follows for new numbers. */
const PhoneLogin = {
  mount(root, { onDone, compact = false } = {}) {
    root.innerHTML = `
      <div class="phone-login ${compact ? 'compact' : ''}">
        <div class="form-group">
          <label for="plPhone">${t('phone_label')} <span class="req">*</span></label>
          <div class="phone-row">
            <input type="tel" id="plPhone" dir="ltr" maxlength="20" autocomplete="tel" inputmode="tel" placeholder="${escapeHtml(t('phone_ph'))}">
            <button type="button" class="btn-primary btn-inline" id="plConfirm">${t('confirm')}</button>
          </div>
        </div>
        <div class="form-group otp-box hidden" id="plOtpBox">
          <label for="plCode">${t('otp_label')}</label>
          <p class="mini-note" id="plSentTo"></p>
          <div class="phone-row">
            <input type="text" id="plCode" dir="ltr" maxlength="6" autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]*">
            <button type="button" class="btn-primary btn-inline" id="plVerify">${t('verify')}</button>
          </div>
          <div class="otp-actions"><button type="button" class="link-btn" id="plResend" disabled></button><button type="button" class="link-btn" id="plChange">${t('change_number')}</button></div>
          <p class="mini-note dev-code hidden" id="plDev"></p>
        </div>
        <p class="form-error hidden" id="plError"></p>
      </div>`;
    const $ = id => root.querySelector('#' + id);
    const phoneInput = $('plPhone'), confirmBtn = $('plConfirm'), codeInput = $('plCode'), verifyBtn = $('plVerify'), errBox = $('plError'), resendBtn = $('plResend');
    let phone = '', timer = null;
    const showErr = msg => { errBox.textContent = msg; errBox.classList.toggle('hidden', !msg); };
    const busy = (btn, on) => { btn.disabled = on; btn.classList.toggle('loading', on); };

    function cooldown(sec) {
      clearInterval(timer);
      const tick = () => {
        resendBtn.disabled = sec > 0;
        resendBtn.textContent = sec > 0 ? t('resend_in', { n: sec }) : t('resend');
        if (sec-- <= 0) clearInterval(timer);
      };
      tick(); timer = setInterval(tick, 1000);
    }
    function showOtp(res) {
      phone = res.phone;
      $('plOtpBox').classList.remove('hidden');
      $('plSentTo').textContent = t('otp_sent_to', { phone: res.phone });
      phoneInput.readOnly = true; confirmBtn.classList.add('hidden');
      codeInput.value = ''; codeInput.maxLength = res.length || 6; codeInput.focus();
      const dev = $('plDev');
      dev.classList.toggle('hidden', !res.devCode);
      if (res.devCode) dev.textContent = t('dev_code', { code: res.devCode });
      cooldown(30);
    }
    async function done(res, existing) {
      await Auth.signInWithToken(res.token, res.phone);
      clearInterval(timer);
      onDone && onDone(res.profile || {}, { existing, phone: res.phone });
    }
    async function confirm() {
      showErr('');
      if (!phoneInput.value.trim()) return showErr(t('phone_invalid'));
      busy(confirmBtn, true);
      try {
        const res = await Auth.phoneLookup(phoneInput.value.trim());
        if (res.state === 'existing') await done(res, true);
        else showOtp(res);
      } catch (e) { showErr(phoneErrorText(e.message)); }
      busy(confirmBtn, false);
    }
    async function verify() {
      showErr('');
      if (!/^\d{4,6}$/.test(codeInput.value.trim())) return showErr(t('otp_invalid'));
      busy(verifyBtn, true);
      try { await done(await Auth.phoneVerify(phone, codeInput.value.trim()), false); }
      catch (e) { showErr(phoneErrorText(e.message)); busy(verifyBtn, false); }
    }
    confirmBtn.addEventListener('click', confirm);
    phoneInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); confirm(); } });
    verifyBtn.addEventListener('click', verify);
    codeInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); verify(); } });
    resendBtn.addEventListener('click', async () => {
      showErr(''); resendBtn.disabled = true;
      try { showOtp(await Auth.phoneLookup(phone)); } catch (e) { showErr(phoneErrorText(e.message)); cooldown(30); }
    });
    $('plChange').addEventListener('click', () => {
      clearInterval(timer); phone = ''; showErr('');
      $('plOtpBox').classList.add('hidden'); phoneInput.readOnly = false; confirmBtn.classList.remove('hidden'); phoneInput.focus();
    });
    return { focus: () => phoneInput.focus() };
  }
};

/* One sign-in block for every page: phone box on phone sites, the Google
   button elsewhere. `bindSignIn(root, next)` wires it. */
function signInBlockHtml(label, id = 'googleBtn') {
  return Auth.mode() === 'phone' ? `<div class="phone-login-host" data-phone-host></div>` : googleButtonHtml(label, id);
}
function bindSignIn(root, { next = '/', id = 'googleBtn' } = {}) {
  if (Auth.mode() === 'phone') {
    const host = root.querySelector('[data-phone-host]');
    if (host) PhoneLogin.mount(host, { onDone: () => { toast(t('logged_in')); location.href = next; } });
  } else {
    const b = root.querySelector('#' + id);
    if (b) b.addEventListener('click', e => doGoogleSignIn(e.currentTarget, next));
  }
}
