/* Phone numbers are the customer "account" in phone mode, so every number is
   reduced to one canonical form (E.164, e.g. +970591234567) before it is
   looked up, stored or used to derive the customer's id.

   normalizePhone(raw, country) -> '+9705...' or null when it is not a valid
   mobile number. `country` is the site's default (settings.auth.country)
   and decides how a local number such as 0591234567 is read. */

const onlyDigits = s => String(s || '').replace(/\D/g, '');

/* Full international numbers we validate strictly (mobile numbers only). */
const INTL = [
  { cc: '970', re: /^970(5[69]\d{7})$/ },          // Palestine: 059 Jawwal, 056 Ooredoo
  { cc: '972', re: /^972(5\d{8})$/ },              // Israel mobiles (050, 052, 053, 054, 055, 058)
  { cc: '966', re: /^966(5\d{8})$/ },              // Saudi Arabia
  { cc: '971', re: /^971(5\d{8})$/ },              // UAE
  { cc: '965', re: /^965([569]\d{7})$/ },          // Kuwait
  { cc: '962', re: /^962(7[789]\d{7})$/ }          // Jordan
];

/* A local number (no country code) per default country. */
function fromLocal(digits, country) {
  switch (country) {
    case 'SA': { const m = digits.match(/^0?(5\d{8})$/); return m ? '966' + m[1] : null; }
    case 'AE': { const m = digits.match(/^0?(5\d{8})$/); return m ? '971' + m[1] : null; }
    case 'KW': { const m = digits.match(/^([569]\d{7})$/); return m ? '965' + m[1] : null; }
    case 'JO': { const m = digits.match(/^0?(7[789]\d{7})$/); return m ? '962' + m[1] : null; }
    case 'PS':
    default: {
      const m = digits.match(/^0?(5\d{8})$/);        // 059xxxxxxx, 056xxxxxxx, 52xxxxxxx ...
      if (!m) return null;
      const national = m[1];
      return (national.startsWith('59') || national.startsWith('56') ? '970' : '972') + national;
    }
  }
}

export function normalizePhone(raw, country = 'PS') {
  const text = String(raw == null ? '' : raw).trim();
  if (!text || text.length > 30) return null;
  let digits = onlyDigits(text);
  if (!digits) return null;
  const international = text.startsWith('+') || digits.startsWith('00');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (international) {
    // +970 (0)59 1234567 and similar: drop a stray trunk zero after the country code.
    for (const { cc, re } of INTL) {
      if (digits.startsWith(cc)) {
        const rest = digits.slice(cc.length).replace(/^0/, '');
        return re.test(cc + rest) ? '+' + cc + rest : null;
      }
    }
    return /^[1-9]\d{7,14}$/.test(digits) ? '+' + digits : null;
  }
  // A number typed with its country code but without "+": 970591234567.
  for (const { cc, re } of INTL) if (digits.startsWith(cc) && re.test(digits)) return '+' + digits;
  const local = fromLocal(digits, country);
  return local ? '+' + local : null;
}

/* Display form for the cashier / receipts: keeps the number readable. */
export function displayPhone(e164) { return String(e164 || ''); }
