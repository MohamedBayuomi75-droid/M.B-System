import { Money } from '../common/money';
import { Inv, parseAmount, searchNorm, searchTokens, Supplier } from '../supplier-invoices/invoice-rules';

/**
 * قواعد دفعات الموردين والرصيد (7.3.4).
 *  - القايمة والفلاتر والبحث: نقل حرفي من الواجهة القديمة (getFilteredPayments، searchPaymentText) — المقارنة: tests-merge/phase70.js.
 *  - الرصيد بالطريقة الحالية (supplierBalance، helpers.js:576) للعلامة بس.
 *  - **الرصيد وكشف الحساب بقاعدة F-05 المعتمدة** (DEC-0113 د-2): الافتتاحي + صافي الفواتير غير الملغاة − المرتجعات − السداد + التحصيل،
 *    والدفعات غير المصنّفة مابتدخلش (قايمة مراجعة، B-53). الكشف والرصيد من نفس الحركات (P7.3-H)، بست خانات (DEC-0112) من غير تقريب الكشف لخانتين.
 */
export type Pay = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const SKIP = /(^id$|Id$|^_|^attachments$|^createdAt$|^updatedAt$|^cancelled$|^isReturn$|^linked)/;
function flatten(o: unknown, depth: number): string {
  if (o == null) return '';
  const t = typeof o;
  if (t === 'string' || t === 'number') return String(o);
  if (t !== 'object' || depth > 2) return '';
  if (Array.isArray(o)) return o.map((x) => flatten(x, depth + 1)).join(' ');
  return Object.keys(o as Pay).filter((k) => !SKIP.test(k)).map((k) => flatten((o as Pay)[k], depth + 1)).join(' ');
}
const fmtDate = (s: string) => { const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : s; };
const dateText = (d: unknown) => { const s = String(d || '').slice(0, 10); return s ? `${s} ${fmtDate(s)}` : ''; };
const attNames = (l: unknown) => (Array.isArray(l) ? l : []).filter(Boolean).map((a: Pay) => `${a.name || ''} ${a.docTypeLabel || ''} ${a.subject || ''}`).join(' ');

/** searchPaymentText (helpers.js) */
export function searchPaymentText(p: Pay, s: Supplier | undefined, inv: Inv | undefined): string {
  return searchNorm([s ? `${s.name} ${s.taxId || ''}` : '', 'دفعة', flatten(p, 0), inv ? inv.invoiceNo : 'عامه',
    p.direction === 'collect' ? 'مدين تحصيل' : 'دائن سداد', dateText(p.date), attNames(p.attachments)].join(' '));
}

export interface PaymentFilters { q?: string; year?: string; month?: string; from?: string; to?: string; supplierId?: string; method?: string; direction?: '' | 'pay' | 'collect'; link?: '' | 'linked' | 'general'; min?: string; max?: string; sort?: string }
/** getFilteredPayments (pages-payments.js:4) */
export function filterPayments(all: Pay[], f: PaymentFilters, suppliers: Map<string, Supplier>, invoices: Map<string, Inv>): Pay[] {
  const tokens = searchTokens(f.q);
  let rows = all.filter((p) => {
    const s = String(p.date || '').slice(0, 10);
    if (f.year && s.slice(0, 4) !== String(f.year)) return false;
    if (f.month && s.slice(5, 7) !== f.month) return false;
    if (f.from && (!s || s < f.from)) return false;
    if (f.to && (!s || s > f.to)) return false;
    return true;
  });
  if (f.supplierId) rows = rows.filter((p) => p.supplierId === f.supplierId);
  if (f.method) rows = rows.filter((p) => (p.method || '') === f.method);
  if (f.direction) rows = rows.filter((p) => (p.direction === 'collect' ? 'collect' : 'pay') === f.direction);
  if (f.link === 'general') rows = rows.filter((p) => !p.invoiceId);
  else if (f.link === 'linked') rows = rows.filter((p) => !!p.invoiceId);
  const has = (v: unknown) => v !== '' && v != null;
  if (has(f.min) || has(f.max)) rows = rows.filter((p) => {
    const n = Math.abs(Number(p.amount) || 0);
    if (has(f.min) && n < parseAmount(f.min)) return false;
    if (has(f.max) && n > parseAmount(f.max)) return false;
    return true;
  });
  if (tokens.length) rows = rows.filter((p) => { const t = searchPaymentText(p, suppliers.get(p.supplierId), p.invoiceId ? invoices.get(p.invoiceId) : undefined); return tokens.every((x) => t.indexOf(x) > -1); });
  const dt = (p: Pay) => String(p.date || '');
  const mode = f.sort || 'new';
  const out = rows.slice();
  if (mode === 'old') out.sort((a, b) => dt(a).localeCompare(dt(b)));
  else if (mode === 'amount_desc') out.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
  else if (mode === 'amount_asc') out.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
  else out.sort((a, b) => dt(b).localeCompare(dt(a)));
  return out;
}

/** الاتجاه: pay / collect / غير مصنّف ('') — B-53 */
export const directionOf = (p: Pay): '' | 'pay' | 'collect' => (p.direction === 'pay' || p.direction === 'collect' ? p.direction : '');
const m = (v: unknown) => { const n = Number(v); return Money.fromNumberUnsafe(Number.isFinite(n) ? n : 0); };

/** الرصيد بالطريقة الحالية (supplierBalance) — للعلامة بس */
export function legacyBalance(opening: unknown, invoices: Inv[], payments: Pay[]): number {
  const inv = invoices.reduce((a, b) => a + Number(b.netInvoice || 0) * (b.isReturn ? -1 : 1), 0);
  const pay = payments.reduce((a, b) => a + Number(b.amount || 0), 0);
  return Number(opening || 0) + inv - pay;
}

export interface StatementLine { date: string; type: 'invoice' | 'return' | 'pay' | 'collect'; id: string; ref: string; description: string; debit: string; credit: string; balance: string }
export interface Statement {
  supplierId: string; from: string; to: string; opening: string; closing: string; lines: StatementLine[];
  /** الدفعات من غير اتجاه في الفترة — مابتدخلش الرصيد (B-53) */
  unclassified: { id: string; date: string; amount: string; paymentNo: unknown }[];
}
/** حركة F-05: دائن (علينا للمورد) = فاتورة غير ملغاة أو تحصيل، ومدين = مرتجع أو سداد. غير المصنّف = null */
function movement(x: Pay, kind: 'inv' | 'pay'): { type: StatementLine['type']; debit: Money; credit: Money } | null {
  if (kind === 'inv') {
    if (x.cancelled && !x.isReturn) return null;
    return x.isReturn ? { type: 'return', debit: m(x.netInvoice), credit: Money.zero() } : { type: 'invoice', debit: Money.zero(), credit: m(x.netInvoice) };
  }
  const d = directionOf(x);
  if (!d) return null;
  return d === 'pay' ? { type: 'pay', debit: m(x.amount), credit: Money.zero() } : { type: 'collect', debit: Money.zero(), credit: m(x.amount) };
}
/** كشف الحساب والرصيد بـ F-05: نفس الحركات، والرصيد المتحرك من غير تقريب وسطي (6 خانات) */
export function statementF05(supplier: Supplier & { openingBalance?: unknown }, invoices: Inv[], payments: Pay[], from = '', to = ''): Statement {
  const ev: (StatementLine & { _d: Money; _c: Money; _o: number })[] = [];
  const pre = { d: Money.zero(), c: Money.zero() };
  const add = (x: Pay, kind: 'inv' | 'pay') => {
    const mv = movement(x, kind);
    if (!mv) return;
    const date = String(x.date || '');
    if (from && date < from) { pre.d = pre.d.plus(mv.debit); pre.c = pre.c.plus(mv.credit); return; }
    if (to && date > to) return;
    const order = { invoice: 0, return: 1, pay: 2, collect: 2 }[mv.type];
    const description = kind === 'inv' ? (x.isReturn ? `مرتجع: ${x.description || 'فاتورة'}` : String(x.description || 'فاتورة'))
      : `${mv.type === 'collect' ? 'قيد مدين (عليه لنا)' : 'دفعة دائن (سداد)'}${x.notes ? ` — ${x.notes}` : ''}`;
    ev.push({ date, type: mv.type, id: x.id, ref: kind === 'inv' ? String(x.invoiceNo || '-') : String(x._ref || '-'), description, debit: '', credit: '', balance: '', _d: mv.debit, _c: mv.credit, _o: order });
  };
  invoices.forEach((i) => add(i, 'inv'));
  payments.forEach((p) => add(p, 'pay'));
  ev.sort((a, b) => a.date.localeCompare(b.date) || a._o - b._o || a.id.localeCompare(b.id));
  const opening = m(supplier.openingBalance).plus(pre.c).minus(pre.d);
  let run = opening;
  const lines = ev.map(({ _d, _c, _o, ...l }) => { void _o; run = run.plus(_c).minus(_d); return { ...l, debit: _d.toFixed(), credit: _c.toFixed(), balance: run.toFixed() }; });
  const unclassified = payments.filter((p) => !directionOf(p) && (!from || String(p.date || '') >= from) && (!to || String(p.date || '') <= to))
    .map((p) => ({ id: p.id, date: String(p.date || ''), amount: m(p.amount).toFixed(), paymentNo: p.paymentNo ?? null }));
  return { supplierId: supplier.id, from, to, opening: opening.toFixed(), closing: run.toFixed(), lines, unclassified };
}

/** فرق الرصيد الحالي عن F-05 وأسبابه (DEC-0105، 7.3.6) — أعداد ومبالغ لكل سبب */
export function balanceDiff(supplier: Supplier & { openingBalance?: unknown }, invoices: Inv[], payments: Pay[]) {
  const f05 = Money.of(statementF05(supplier, invoices, payments).closing);
  const legacy = m(legacyBalance(supplier.openingBalance, invoices, payments));
  const cancelled = invoices.filter((i) => i.cancelled && !i.isReturn);
  const collect = payments.filter((p) => directionOf(p) === 'collect');
  const unclassified = payments.filter((p) => !directionOf(p));
  const sum = (xs: Pay[], k: string) => Money.sum(xs.map((x) => m(x[k]).toString()));
  return {
    balance: f05.toFixed(), legacyBalance: legacy.toFixed(), difference: legacy.minus(f05).toFixed(), differs: !legacy.minus(f05).abs().round(6).isZero(),
    reasons: {
      cancelledInvoices: { count: cancelled.length, amount: sum(cancelled, 'netInvoice').toFixed() },
      collect: { count: collect.length, amount: sum(collect, 'amount').toFixed() },
      unclassified: { count: unclassified.length, amount: sum(unclassified, 'amount').toFixed() },
    },
  };
}
