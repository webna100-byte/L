// The Uptown-style demo config (placeholder colours and photos) shared by the preview and the demo creator.
import fs from 'node:fs';
import '../public/js/pricing.js';
import '../public/js/i18n.js';
export function buildUptownConfig() {
  const seed = JSON.parse(fs.readFileSync(new URL('../public/seed/demo-config.json', import.meta.url)));
  const c = globalThis.localizeConfig(seed, 'ar');
  Object.assign(c.settings, { lang: 'ar', currency: 'ILS', timezone: 'Asia/Hebron', restaurantName: 'أبتاون برغر آند وينغز', multiBranch: true, minimumOrder: 0, phone: '+970 597 101 010', address: 'رام الله', auth: { country: 'PS' } });
  delete c.settings.defaultLang;
  Object.assign(c.settings.colors.secondary, { type: 'gradient', color1: '#b80000', color2: '#e00000' });
  c.settings.homepage.hero.title = 'أبتاون برغر آند وينغز'; c.settings.homepage.hero.eyebrow = 'رام الله'; c.settings.homepage.hero.text = 'برغر وأجنحة طازجة، اطلب الآن للاستلام أو التوصيل.';
  const zones = [{ id: 'z1', name: 'رام الله والبيرة', price: 15 }];
  c.branches = [
    { ...c.branches[0], id: 'irsal', name: 'الإرسال', deliveryZones: zones.map(z => ({ ...z, id: 'z_irsal' })) },
    { ...c.branches[1], id: 'tira', name: 'الطيرة', deliveryZones: zones.map(z => ({ ...z, id: 'z_tira' })) }
  ];
  const P = (id, cat, name, price, img, d = '') => ({ id, categoryId: cat, name, description: d, price, image: `/demo/${img}.webp`, discountPercent: 0, branchIds: [], optionGroups: [] });
  c.categories = [
    { id: 'burgers', name: 'برغر', image: '/demo/cat_burgers.webp', branchIds: [], order: 0 },
    { id: 'wings', name: 'أجنحة', image: '/demo/prod_crispy_chicken.webp', branchIds: [], order: 1 },
    { id: 'sides', name: 'بطاطا', image: '/demo/cat_salads.webp', branchIds: [], order: 2 },
    { id: 'drinks', name: 'مشروبات', image: '/demo/cat_drinks.webp', branchIds: [], order: 3 }
  ];
  c.products = [
    P('crispy', 'burgers', 'كرسبي تشيكن برغر', 25, 'prod_crispy_chicken', 'دجاج مقرمش مع صوص البيت'),
    P('steak', 'burgers', 'ستيك برغر', 36, 'prod_double_cheese', 'قطعة ستيك مع جبنة'),
    P('hawaii', 'burgers', 'هاواي برغر', 30, 'prod_classic_burger', 'مع الأناناس والجبنة'),
    P('onion', 'burgers', 'برغر البصل المكرمل', 30, 'prod_classic_burger', 'بصل مكرمل وصوص خاص'),
    P('veggie', 'burgers', 'برغر نباتي', 30, 'prod_veggie', 'خضار طازجة'),
    P('wings6', 'wings', 'أجنحة (6 قطع)', 28, 'prod_crispy_chicken', 'سعر مؤقت'),
    P('fries', 'sides', 'بطاطا', 12, 'prod_house_salad', 'سعر مؤقت'),
    P('cola', 'drinks', 'مشروب', 7, 'prod_cola', 'سعر مؤقت')
  ];
  c.loyalty.tiers = []; c.loyalty.enabled = false;
  c.settings.slider = { images: ['/demo/slide1.webp', '/demo/slide2.webp', '/demo/slide3.webp'], intervalSeconds: 3 };
  c.settings.homepage.featured.selectedIds = ['crispy', 'steak', 'hawaii', 'onion'];
  c.settings.homepage.categories.selectedIds = ['burgers', 'wings', 'sides', 'drinks'];
  c.version = 1;
  c.wheel = { enabled: true, title: 'لف العجلة واربح!', minOrder: 100, validHours: 0, weeklyBigCap: 10, prizes: [
    { id: 'drink', label: 'مشروب', type: 'product', productId: 'cola', weight: 35, big: false },
    { id: 'fries', label: 'بطاطا', type: 'product', productId: 'fries', weight: 30, big: false },
    { id: 'd10', label: 'خصم 10%', type: 'percent', value: 10, weight: 20, big: false },
    { id: 'wings', label: 'أجنحة', type: 'product', productId: 'wings6', weight: 12, big: true },
    { id: 'classic', label: 'كلاسيك برغر', type: 'product', productId: 'hawaii', weight: 3, big: true }
  ] };
  return c;
}
