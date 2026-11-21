/**
 * قواعد فواتير الموردين — نقل حرفي من الواجهة القديمة (LEGACY-PRESERVE، DEC-0107). كل دالة جنبها مصدرها،
 * والمطابقة بالدالة القديمة نفسها على نفس البيانات: tests-merge/phase68.js (بالأوضاع التلاتة).
 * الأرقام هنا JS numbers زي القديم بالظبط (العرض والفلترة والحالة)، والمعادلة للجديد في الخدمة بـ Money (B-25).
 */
export type Inv = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export interface Supplier { id: string; name?: string; [k: string]: unknown }
export interface Payment { invoiceId?: string; amount?: unknown }

/** searchNorm — renderer/modules/ledger/helpers.js (محرك البحث الموحّد) */
export function searchNorm(v: unknown): string {
  return String(v == null ? '' : v).toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/\s+/g, ' ').trim();
}
/** searchTokens */
export function searchTokens(q: unknown): string[] {
  const n = searchNorm(q).replace(/(\d)[,٬،](?=\d{3}\b)/g, '$1');
  return n ? n.split(' ') : [];
}
const searchHas = (text: string, tokens: string[]) => tokens.every((t) => text.indexOf(t) > -1);
/** lgFmtDate للنص yyyy-mm-dd: يوم/شهر/سنة من غير أصفار */
function fmtDate(s: string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : s;
}
function searchDateText(d: unknown): string { const s = String(d || '').slice(0, 10); return s ? `${s} ${fmtDate(s)}` : ''; }
const searchAttNames = (list: unknown) => (Array.isArray(list) ? list : []).filter(Boolean).map((a: Inv) => `${a.name || ''} ${a.docTypeLabel || ''} ${a.subject || ''}`).join(' ');
const SEARCH_SKIP_KEYS = /(^id$|Id$|^_|^attachments$|^createdAt$|^updatedAt$|^cancelled$|^isReturn$|^linked)/;
function searchFlatten(o: unknown, depth: number): string {
  if (o == null) return '';
  const t = typeof o;
  if (t === 'string' || t === 'number') return String(o);
  if (t !== 'object' || depth > 2) return '';
  if (Array.isArray(o)) return o.map((x) => searchFlatten(x, depth + 1)).join(' ');
  return Object.keys(o as Inv).filter((k) => !SEARCH_SKIP_KEYS.test(k)).map((k) => searchFlatten((o as Inv)[k], depth + 1)).join(' ');
}
function searchSupplierText(s: Supplier | undefined): string {
  if (!s) return '';
  return searchNorm([s.name, s.taxId, s.commercialReg, s.phone, s.email, s.address, s.businessNature, s.bankAccount, s.iban, s.notes, searchFlatten(s.extraFields, 1), searchFlatten(s.customFields, 1)].join(' '));
}
/** searchInvoiceText — نفس النص اللي البحث القديم بيدوّر فيه */
export function searchInvoiceText(inv: Inv, sup: Supplier | undefined): string {
  return searchNorm([searchSupplierText(sup), searchFlatten(inv, 0), inv.isReturn ? 'مرتجع' : 'فاتورة', searchDateText(inv.date), searchDateText(inv.dueDate), searchAttNames(inv.attachments)].join(' '));
}

/** parseAmount (helpers.js:195) */
export function parseAmount(v: unknown): number {
  if (v === undefined || v === null || v === '') return 0;
  let s = String(v).trim();
  s = s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  s = s.replace(/[‎‏‪-‮⁦-⁩]/g, '').replace(/٬/g, ',').replace(/٫/g, '.').replace(/−/g, '-');
  s = s.replace(/,/g, '').replace(/\s/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** addDaysToIsoDate (helpers.js:223) — بمكوّنات التاريخ من غير UTC */
export function addDaysToIsoDate(iso: unknown, days: number): string | null {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** getInvoiceDueDate: المكتوب، أو التاريخ + 30 يوم */
export function getInvoiceDueDate(inv: Inv): string | null {
  if (inv.dueDate) return inv.dueDate as string;
  return inv.date ? addDaysToIsoDate(inv.date, 30) : null;
}
/** todayIso بالتوقيت المحلي */
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** المدفوع لكل فاتورة (paidByInvoice) */
export function paidByInvoice(payments: Payment[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of payments) if (p.invoiceId) m.set(p.invoiceId, (m.get(p.invoiceId) ?? 0) + Number(p.amount || 0));
  return m;
}
/** invoiceRemaining (helpers.js:590) */
export function invoiceRemaining(inv: Inv, paid: Map<string, number>): number {
  if (!inv || inv.isReturn || inv.cancelled) return 0;
  return Number(inv.netInvoice || 0) - Number(paid.get(inv.id) || 0);
}
/** isInvoiceOverdue (helpers.js:725) */
export function isInvoiceOverdue(inv: Inv, paid: Map<string, number>, today: string): boolean {
  if (!inv || inv.isReturn || inv.cancelled) return false;
  if (invoiceRemaining(inv, paid) <= 0) return false;
  const due = getInvoiceDueDate(inv);
  return !!due && due < today;
}
/** invoiceStatusKey: return | paid | partial | unpaid */
export function invoiceStatusKey(inv: Inv, paid: Map<string, number>): string {
  if (!inv) return '';
  if (inv.isReturn) return 'return';
  const rem = invoiceRemaining(inv, paid), net = Number(inv.netInvoice || 0);
  if (rem <= 0.005) return 'paid';
  if (Math.abs(rem - net) < 0.005) return 'unpaid';
  return 'partial';
}

/** invoiceMissingFields (helpers.js:111) — شارة ⚠️ «بيانات ناقصة» */
export function invoiceMissingFields(inv: Inv, supplierExists: boolean): string[] {
  const miss: string[] = [];
  const empty = (v: unknown) => v === undefined || v === null || String(v).trim() === '';
  if (empty(inv.invoiceNo)) miss.push('رقم الفاتورة');
  if (empty(inv.date)) miss.push('تاريخ التعامل');
  if (empty(inv.supplierId) || !supplierExists) miss.push('المورد');
  if (empty(inv.description)) miss.push('بيان المشتريات');
  if (empty(inv.internalCode)) miss.push('الكود الداخلي');
  if (empty(inv.supplierItemCode)) miss.push('كود المورد');
  if (empty(inv.category)) miss.push('نوع الفاتورة/التصنيف');
  if (empty(inv.project)) miss.push('المشروع');
  if (empty(inv.nature)) miss.push('طبيعة التعامل');
  if (empty(inv.discountType)) miss.push('نوع الخصم');
  if (empty(inv.dueDate)) miss.push('تاريخ الاستحقاق');
  const base = Number(inv.baseValue);
  if (!Number.isFinite(base) || (base === 0 && !inv.isReturn)) miss.push('القيمة الإجمالية');
  if (inv.vat === undefined || inv.vat === null || inv.vat === '') miss.push('الضريبة');
  if (inv.stampDuty === undefined || inv.stampDuty === null || inv.stampDuty === '') miss.push('الدمغات');
  if (inv.withheld === undefined || inv.withheld === null || inv.withheld === '') miss.push('المبلغ المخصوم');
  // حسابات غير متطابقة (roundMoney بست خانات زي القديم)
  const expectedTotal = roundMoney((Number(inv.baseValue) || 0) + (Number(inv.vat) || 0) + (Number(inv.stampDuty) || 0), 6);
  const expectedNet = roundMoney(expectedTotal - (Number(inv.withheld) || 0), 6);
  if (Math.abs((Number(inv.totalInvoice) || 0) - expectedTotal) > 0.0001) miss.push('إجمالي غير متطابق');
  if (Math.abs((Number(inv.netInvoice) || 0) - expectedNet) > 0.0001) miss.push('صافي غير متطابق');
  return miss;
}
/** roundMoney (helpers.js:208): Math.round على الـ float — مش HALF_UP العشري (فرق معروف ومسجّل، للعرض والمقارنة بس) */
export function roundMoney(n: unknown, digits = 6): number {
  const f = Math.pow(10, digits);
  return Math.round((Number(n) || 0) * f) / f;
}

export interface InvoiceFilters {
  mode?: 'invoices' | 'returns' | ''; q?: string; supplierId?: string; category?: string; project?: string; year?: string; month?: string;
  from?: string; to?: string; overdueOnly?: boolean; kind?: '' | 'invoice' | 'return'; status?: string; withheld?: '' | 'yes' | 'no';
  min?: string; max?: string; sort?: string;
}
/** getFilteredInvoices + searchDateOk + filterInvoicesBy (pages-invoices.js:5، helpers.js:2140/2159) */
export function filterInvoices(all: Inv[], f: InvoiceFilters, suppliers: Map<string, Supplier>, paid: Map<string, number>, today: string): Inv[] {
  let rows = all.slice();
  if (f.mode === 'invoices') rows = rows.filter((i) => !i.isReturn);
  else if (f.mode === 'returns') rows = rows.filter((i) => !!i.isReturn);
  rows = rows.filter((i) => {
    const s = String(i.date || '').slice(0, 10);
    if (f.year && s.slice(0, 4) !== String(f.year)) return false;
    if (f.month && s.slice(5, 7) !== f.month) return false;
    if (f.from && (!s || s < f.from)) return false;
    if (f.to && (!s || s > f.to)) return false;
    return true;
  });
  const tokens = searchTokens(f.q);
  let out = rows;
  if (f.supplierId) out = out.filter((i) => i.supplierId === f.supplierId);
  if (f.category) out = out.filter((i) => i.category === f.category);
  if (f.project) out = out.filter((i) => i.project === f.project);
  if (f.month) out = out.filter((i) => String(i.date || '').slice(5, 7) === f.month);
  if (f.kind === 'invoice') out = out.filter((i) => !i.isReturn);
  else if (f.kind === 'return') out = out.filter((i) => !!i.isReturn);
  if (f.status === 'overdue') out = out.filter((i) => isInvoiceOverdue(i, paid, today));
  else if (f.status) out = out.filter((i) => invoiceStatusKey(i, paid) === f.status);
  if (f.withheld === 'yes') out = out.filter((i) => Number(i.withheld) > 0);
  else if (f.withheld === 'no') out = out.filter((i) => !(Number(i.withheld) > 0));
  const has = (v: unknown) => v !== '' && v != null;
  if (has(f.min) || has(f.max)) out = out.filter((i) => {
    const n = Math.abs(Number(i.netInvoice) || 0);
    if (has(f.min) && n < parseAmount(f.min)) return false;
    if (has(f.max) && n > parseAmount(f.max)) return false;
    return true;
  });
  if (tokens.length) out = out.filter((i) => searchHas(searchInvoiceText(i, suppliers.get(i.supplierId)), tokens));
  const mode = f.sort || 'new';
  const dt = (i: Inv) => String(i.date || '');
  const arr = out.slice();
  if (mode === 'old') arr.sort((a, b) => dt(a).localeCompare(dt(b)));
  else if (mode === 'amount_desc') arr.sort((a, b) => Number(b.netInvoice || 0) - Number(a.netInvoice || 0));
  else if (mode === 'amount_asc') arr.sort((a, b) => Number(a.netInvoice || 0) - Number(b.netInvoice || 0));
  else if (mode === 'supplier') arr.sort((a, b) => String(suppliers.get(a.supplierId)?.name || '').localeCompare(String(suppliers.get(b.supplierId)?.name || ''), 'ar') || dt(b).localeCompare(dt(a)));
  // القديم بيرتّب بلغة المتصفح (undefined) — والواجهة عربي، فالسيرفر بيثبّتها 'ar' (من غيرها Node بيحط اللاتيني قبل العربي). اتكشف في phase68
  else if (mode === 'no') arr.sort((a, b) => String(a.invoiceNo || '').localeCompare(String(b.invoiceNo || ''), 'ar', { numeric: true }));
  else arr.sort((a, b) => dt(b).localeCompare(dt(a)));
  if (f.overdueOnly && f.mode !== 'returns') return arr.filter((i) => isInvoiceOverdue(i, paid, today));
  return arr;
}

/** كروت صفحة الفواتير (renderInvoicesPage): المرتجع بيخصم */
export function invoiceTotals(rows: Inv[]) {
  const signed = (b: Inv, key: string) => (b.isReturn ? -1 : 1) * Number(b[key] || 0);
  const sum = (key: string) => rows.reduce((a, b) => a + signed(b, key), 0);
  return { count: rows.length, gross: sum('totalInvoice'), vat: sum('vat'), stamp: sum('stampDuty'), withheld: sum('withheld'), net: sum('netInvoice') };
}

/** validateInvoiceFields (helpers.js:31) — نفس الرسايل */
export function validateInvoiceFields(f: Inv): string[] {
  const errors: string[] = [];
  if (!f.supplierId) errors.push('المورد مطلوب');
  if (!f.invoiceNo || !String(f.invoiceNo).trim()) errors.push('رقم الفاتورة مطلوب');
  if (!f.date) errors.push('تاريخ التعامل مطلوب');
  const base = Number(f.baseValue) || 0, vat = Number(f.vat) || 0, stamp = Number(f.stampDuty) || 0, withheld = Number(f.withheld) || 0;
  if (base < 0) errors.push('القيمة الإجمالية لا يمكن أن تكون سالبة');
  if (base === 0 && !f.isReturn) errors.push('القيمة الإجمالية للتعامل يجب أن تكون أكبر من صفر');
  if (vat < 0) errors.push('الضريبة لا يمكن أن تكون سالبة');
  if (stamp < 0) errors.push('الدمغات لا يمكن أن تكون سالبة');
  if (withheld < 0) errors.push('المبلغ المخصوم لا يمكن أن يكون سالباً');
  if (withheld > base + vat + stamp + 0.0001) errors.push('المبلغ المخصوم أكبر من إجمالي الفاتورة');
  if (f.dueDate && f.date && f.dueDate < f.date) errors.push('تاريخ الاستحقاق لا يمكن أن يكون قبل تاريخ الفاتورة');
  if (f.discountRate !== '' && f.discountRate !== undefined && f.discountRate !== null) {
    const dr = Number(f.discountRate);
    if (isNaN(dr) || dr < 0 || dr > 100) errors.push('نسبة الخصم يجب أن تكون بين 0 و 100');
  }
  return errors;
}

/** حالة الأصل من مرتجعاته — recalcLinkedOriginal (helpers.js:1927) */
export function linkedOriginalState(orig: Inv, returns: Inv[]): { cancelled: boolean; postReturnWht: boolean; linkedReturnIds: string[] } {
  const rets = returns.filter((r) => r.isReturn && r.linkedInvoiceId === orig.id);
  const allRetNet = rets.reduce((a, b) => a + Number(b.netInvoice || 0), 0);
  const oNet = Number(orig.netInvoice || 0);
  const linkedReturnIds = rets.map((r) => r.id);
  if (rets.length && oNet > 0 && allRetNet >= oNet - 0.02) return { cancelled: true, postReturnWht: false, linkedReturnIds };
  if (rets.length && Number(orig.withheld || 0) > 0) return { cancelled: false, postReturnWht: true, linkedReturnIds };
  return { cancelled: false, postReturnWht: false, linkedReturnIds };
}
/**
 * حالة الفاتورة الأصلية لما هي نفسها بتتحفظ — الفرع الأخير في saveInvoiceData (modals.js:1329). مختلف عن recalcLinkedOriginal في حاجتين
 * (LEGACY-PRESERVE): لو فيه مرتجعات مش مغطية ومفيش محجوز ← الحالة مابتتغيّرش، و linkedReturnIds بتتصفّر بس لو مفيش مرتجعات.
 */
export function selfSaveState(saved: Inv, returns: Inv[]): Partial<{ cancelled: boolean; postReturnWht: boolean; linkedReturnIds: string[] }> {
  const rets = returns.filter((r) => r.isReturn && r.linkedInvoiceId === saved.id);
  const allRetNet = rets.reduce((a, b) => a + Number(b.netInvoice || 0), 0);
  const oNet = Number(saved.netInvoice || 0);
  if (rets.length && oNet > 0 && allRetNet >= oNet - 0.02) return { cancelled: true, postReturnWht: false };
  if (rets.length && Number(saved.withheld || 0) > 0) return { cancelled: false, postReturnWht: true };
  if (!rets.length) return { cancelled: false, postReturnWht: false, linkedReturnIds: [] };
  return {};
}
