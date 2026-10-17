/* ===================== Admin i18n =====================
   The admin panel is written with English source strings wrapped in L():
     L('Save Changes')          -> 'Guardar cambios' (es) / 'Save Changes' (en)
     L('Level {n}', { n: 2 })   -> 'Nivel 2'         / 'Level 2'
   The panel speaks the website's language by default (read from the cached
   site config), and the owner can switch it to English with the toggle.
   Translations live in /js/admin-lang/<lang>.js (one small file per
   language, loaded only when needed); any missing string falls back to
   English. The choice also sets window.FORCE_LANG so the shared helpers
   (t(), fmtMoney(), fmtDate()) follow it.
   Load this file before i18n.js/admin.js. Static HTML can use data-l
   (text), data-l-title / data-l-placeholder attributes, and a button with
   [data-admin-lang-toggle] becomes the language switch. */
const ADMIN_LANG_NAMES = { en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch', it: 'Italiano', pt: 'Português', nl: 'Nederlands', ar: 'العربية' };
window.ADMIN_TR = {};
(function () {
  let pfx = '';
  try { const m = document.cookie.match(/(?:^|;\s*)rs_site=([a-z0-9-]{1,40})/); pfx = m ? m[1] + ':' : ''; } catch (e) { /* no cookies */ }
  let siteLang = 'en';
  try {
    const c = JSON.parse(localStorage.getItem(pfx + 'site_cache_v3') || 'null');
    const s = (c && c.config && c.config.settings) || {};
    const l = s.lang || s.defaultLang;
    if (ADMIN_LANG_NAMES[l]) siteLang = l;
  } catch (e) { /* storage blocked */ }
  let lang = siteLang;
  try { if (localStorage.getItem('admin_lang') === 'en') lang = 'en'; } catch (e) { /* storage blocked */ }
  window.ADMIN_SITE_LANG = siteLang;
  window.ADMIN_LANG = lang;
  window.FORCE_LANG = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  // Parser-blocking on purpose: the translations must exist before admin.js runs.
  if (lang !== 'en') document.write('<script src="/js/admin-lang/' + lang + '.js"><\/script>');
})();

function adminLang() { return window.ADMIN_LANG || 'en'; }

/* Translate an English source string for the admin UI; {name} placeholders
   are filled from vars (values are inserted as-is: escape them first when
   they come from user data and the result goes into HTML). */
function L(text, vars) {
  const tr = window.ADMIN_TR || {};
  const s = Object.prototype.hasOwnProperty.call(tr, text) ? tr[text] : text;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s;
}

/* 'en' = always English; anything else = follow the website language. */
function setAdminLang(lang) {
  try { lang === 'en' ? localStorage.setItem('admin_lang', 'en') : localStorage.removeItem('admin_lang'); } catch (e) { /* storage blocked */ }
}

/* Called once the real site config is loaded: if the cached language was
   missing or out of date, reload so the panel speaks the right language. */
function syncAdminLang(siteLang) {
  if (!ADMIN_LANG_NAMES[siteLang] || siteLang === window.ADMIN_SITE_LANG) return false;
  let forcedEn = false;
  try { forcedEn = localStorage.getItem('admin_lang') === 'en'; } catch (e) { /* ignore */ }
  if (forcedEn) return false;
  location.reload();
  return true;
}

/* Translates static markup and wires the language toggle button. */
function applyAdminI18n(root = document) {
  root.querySelectorAll('[data-l]').forEach(el => { el.textContent = L(el.getAttribute('data-l') || el.textContent.trim()); });
  root.querySelectorAll('[data-l-title]').forEach(el => { el.title = L(el.getAttribute('data-l-title')); });
  root.querySelectorAll('[data-l-placeholder]').forEach(el => { el.placeholder = L(el.getAttribute('data-l-placeholder')); });
  root.querySelectorAll('[data-admin-lang-toggle]').forEach(btn => {
    const site = window.ADMIN_SITE_LANG;
    // Only offered when the website is not in English.
    btn.classList.toggle('hidden', site === 'en');
    const target = adminLang() === 'en' ? site : 'en';
    btn.textContent = ADMIN_LANG_NAMES[target];
    btn.setAttribute('lang', target);
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => { setAdminLang(adminLang() === 'en' ? 'site' : 'en'); location.reload(); });
  });
  const title = document.querySelector('title[data-l]');
  if (title) document.title = L(title.getAttribute('data-l'));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => applyAdminI18n());
else applyAdminI18n();
