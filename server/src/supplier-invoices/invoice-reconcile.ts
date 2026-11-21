import { Inv, linkedOriginalState } from './invoice-rules';

/**
 * 7.2.6 — تقرير مطابقة الفواتير القديمة (P7.2-H). **قراءة بس، ومفيش أي تعديل.**
 * لكل فاتورة: الإجمالي والصافي المخزّنين مقابل المعادلة (DEC-0107: نفس فحص previewInvoiceCalculationFixes — helpers.js:143)،
 * وحالة الإلغاء المخزّنة مقابل المرتجعات المربوطة (recalcLinkedOriginal)، والربط المقطوع، وB-31، والقيم اللي نوعها مش رقم، والخانات فوق 4 (B-25).
 * المخرج للمستودع **أعداد بس** (counts). القايمة التفصيلية (معرّف ورقم المورد ونوع الفرق) بتتكتب في ملف محلي على جهاز التشغيل، برا المستودع.
 */
export type IssueKind =
  | 'total_mismatch' | 'net_mismatch' | 'non_numeric_amount' | 'over_4dp'
  | 'missing_supplier' | 'link_missing' | 'link_not_original' | 'link_other_supplier'
  | 'cancel_flag_mismatch' | 'post_return_wht_mismatch' | 'duplicate_supplier_no';
export interface ReconcileIssue { id: string; invoiceNo: string; isReturn: boolean; kind: IssueKind }
export interface InvoiceReconcileReport {
  at: string; invoices: number; returns: number; withIssues: number;
  counts: Record<IssueKind, number>;
  duplicateGroups: number;
  issues: ReconcileIssue[];
}
const AMOUNTS = ['baseValue', 'vat', 'stampDuty', 'withheld', 'totalInvoice', 'netInvoice'] as const;
const TOL = 0.000001; // نفس سماحية previewInvoiceCalculationFixes
const roundMoney = (n: number, d = 6) => { const f = Math.pow(10, d); return Math.round((Number(n) || 0) * f) / f; };
const decimals = (v: unknown) => { const m = String(v).match(/\.(\d+)$/); return m ? m[1].length : 0; };

export function reconcileInvoices(all: Inv[], supplierIds: Set<string>, now = new Date()): InvoiceReconcileReport {
  const kinds: IssueKind[] = ['total_mismatch', 'net_mismatch', 'non_numeric_amount', 'over_4dp', 'missing_supplier', 'link_missing', 'link_not_original', 'link_other_supplier', 'cancel_flag_mismatch', 'post_return_wht_mismatch', 'duplicate_supplier_no'];
  const counts = Object.fromEntries(kinds.map((k) => [k, 0])) as Record<IssueKind, number>;
  const issues: ReconcileIssue[] = [];
  const add = (i: Inv, kind: IssueKind) => { counts[kind]++; issues.push({ id: i.id, invoiceNo: String(i.invoiceNo ?? ''), isReturn: !!i.isReturn, kind }); };
  const byId = new Map(all.map((i) => [i.id, i]));

  for (const i of all) {
    // المعادلة (نفس فحص المعاينة القديمة بالظبط)
    const base = Number(i.baseValue) || 0, vat = Number(i.vat) || 0, stamp = Number(i.stampDuty) || 0, wh = Number(i.withheld) || 0;
    const total = roundMoney(base + vat + stamp, 6), net = roundMoney(total - wh, 6);
    const oldTotal = Number(i.totalInvoice), oldNet = Number(i.netInvoice);
    if (!Number.isFinite(oldTotal) || Math.abs(oldTotal - total) > TOL) add(i, 'total_mismatch');
    if (!Number.isFinite(oldNet) || Math.abs(oldNet - net) > TOL) add(i, 'net_mismatch');
    if (AMOUNTS.some((k) => i[k] !== undefined && i[k] !== null && typeof i[k] !== 'number')) add(i, 'non_numeric_amount');
    if (AMOUNTS.some((k) => typeof i[k] === 'number' && decimals(i[k]) > 4)) add(i, 'over_4dp');
    if (!i.supplierId || !supplierIds.has(i.supplierId)) add(i, 'missing_supplier');
    if (i.isReturn && i.linkedInvoiceId) {
      const o = byId.get(i.linkedInvoiceId);
      if (!o) add(i, 'link_missing');
      else if (o.isReturn) add(i, 'link_not_original');
      else if (o.supplierId !== i.supplierId) add(i, 'link_other_supplier');
    }
    // حالة الإلغاء المخزّنة مقابل المرتجعات المربوطة (للأصل اللي ليه مرتجعات، أو المعلّم ملغي/postReturnWht)
    if (!i.isReturn && (all.some((r) => r.isReturn && r.linkedInvoiceId === i.id) || i.cancelled || i.postReturnWht)) {
      const st = linkedOriginalState(i, all);
      if (!!i.cancelled !== st.cancelled) add(i, 'cancel_flag_mismatch');
      if (!!i.postReturnWht !== st.postReturnWht) add(i, 'post_return_wht_mismatch');
    }
  }
  // B-31: نفس رقم المورد لنفس المورد ونفس النوع (القديم مابيتعدّلش — قايمة مراجعة)
  const groups = new Map<string, Inv[]>();
  for (const i of all) {
    const no = String(i.invoiceNo ?? '').trim().toLowerCase();
    if (!no) continue;
    const k = `${i.supplierId}\u0000${i.isReturn ? 1 : 0}\u0000${no}`;
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }
  let duplicateGroups = 0;
  for (const g of groups.values()) if (g.length > 1) { duplicateGroups++; g.forEach((i) => add(i, 'duplicate_supplier_no')); }
  return {
    at: now.toISOString(), invoices: all.filter((i) => !i.isReturn).length, returns: all.filter((i) => i.isReturn).length,
    withIssues: new Set(issues.map((x) => x.id)).size, counts, duplicateGroups, issues,
  };
}
