/* Sites created before the mobile-number sign-in still carry texts such as
   "Sign in with Google" in their saved config. Visitors must never see them,
   so the public copy of the config is cleaned on the way out (the stored
   config is untouched; the owner can rewrite the texts in Admin > Pages). */
const BUTTON = { en: 'Sign in with your mobile number', es: 'Inicia sesión con tu número de móvil', fr: 'Se connecter avec votre numéro de mobile', de: 'Mit der Handynummer anmelden', it: 'Accedi con il numero di cellulare', pt: 'Iniciar sessão com o número de telemóvel', nl: 'Inloggen met je mobiele nummer', ar: 'تسجيل الدخول برقم الجوال' };
const CONTINUE = { en: 'Continue with your mobile number', es: 'Continuar con tu número de móvil', fr: 'Continuer avec votre numéro de mobile', de: 'Weiter mit der Handynummer', it: 'Continua con il numero di cellulare', pt: 'Continuar com o número de telemóvel', nl: 'Doorgaan met je mobiele nummer', ar: 'المتابعة برقم الجوال' };
const TEXT = { en: 'Sign in with your mobile number to order, earn points and track your orders.', es: 'Inicia sesión con tu número de móvil para pedir, ganar puntos y seguir tus pedidos.', fr: 'Connectez-vous avec votre numéro de mobile pour commander, gagner des points et suivre vos commandes.', de: 'Melde dich mit deiner Handynummer an, um zu bestellen, Punkte zu sammeln und deine Bestellungen zu verfolgen.', it: 'Accedi con il tuo numero di cellulare per ordinare, accumulare punti e seguire i tuoi ordini.', pt: 'Inicie sessão com o seu número de telemóvel para pedir, ganhar pontos e acompanhar os seus pedidos.', nl: 'Log in met je mobiele nummer om te bestellen, punten te sparen en je bestellingen te volgen.', ar: 'سجّل دخولك برقم جوالك لتطلب وتجمع النقاط وتتابع طلباتك.' };

function replacement(text, lang) {
  const l = BUTTON[lang] ? lang : 'en';
  if (text.length > 60) return TEXT[l];
  return /continu|weiter|doorgaan|المتابعة/i.test(text) ? CONTINUE[l] : BUTTON[l];
}

export function withoutGoogleTexts(config) {
  if (!config) return config;
  const lang = (config.settings && (config.settings.lang || config.settings.defaultLang)) || 'en';
  let changed = false;
  const clean = v => {
    if (typeof v === 'string') { if (/google/i.test(v)) { changed = true; return replacement(v, lang); } return v; }
    if (Array.isArray(v)) return v.map(clean);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)]));
    return v;
  };
  // Only the places where sign-in texts live; menu or description texts are never touched.
  const out = { ...config };
  if (config.pages && config.pages.login) out.pages = { ...config.pages, login: clean(config.pages.login) };
  const hp = config.settings && config.settings.homepage;
  if (hp && hp.login) out.settings = { ...config.settings, homepage: { ...hp, login: clean(hp.login) } };
  return changed ? out : config;
}
