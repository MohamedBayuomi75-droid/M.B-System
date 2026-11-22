/**
 * تنسيق العرض بنفس دوال الواجهة القديمة (renderer/modules/ledger/helpers.js) — للعرض بس، ومفيش أي حساب مالي هنا (ADR-023).
 * مشترك بين شاشات الفواتير والدفعات وكشف الحساب (المرحلة 7).
 */
export const AR = '٠١٢٣٤٥٦٧٨٩';
export const toAr = (s: string) => s.replace(/[0-9]/g, (d) => AR[+d]);
export const toLatin = (s: string) => String(s).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
/** plainMoneyText (helpers.js): أرقام لاتينية من غير فواصل، للإرسال */
export const plain = (v: unknown) => toLatin(String(v ?? '').trim()).replace(/[‎‏‪-‮⁦-⁩]/g, '').replace(/[,٬\s]/g, '').replace(/٫/g, '.').replace(/−/g, '-');
/** roundMoney القديم (Math.round) — للعرض بس، زي fmt */
export const roundMoney = (n: number, d = 6) => { const f = Math.pow(10, d); return Math.round((Number(n) || 0) * f) / f; };
/** lgFmtDate: يوم/شهر/سنة */
export const fmtDate = (v: string) => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : v || ''; };
/** fmt (helpers.js:279): أرقام عربية بفاصلة آلاف، وعدد الخانات من الإعدادات (settings.moneyDecimals، الافتراضي 6) */
export function legacyFmt(n: unknown, decimals: number | 'auto' = 6): string {
  let num = roundMoney(Number(n) || 0, 6) || 0;
  let txt: string;
  if (decimals === 'auto') { const raw = Math.abs(num).toFixed(6).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1'); const fl = raw.includes('.') ? Math.max(2, raw.split('.')[1].length) : 0; txt = Math.abs(num).toFixed(fl); }
  else txt = Math.abs(num).toFixed(decimals);
  if (Number(txt) === 0) num = 0;
  const parts = txt.split('.');
  const out = toAr(parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (parts[1] !== undefined ? '.' + parts[1] : ''));
  return num < 0 ? '\u2066-' + out + '\u2069' : out;
}
