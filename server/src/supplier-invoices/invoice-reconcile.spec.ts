import { reconcileInvoices } from './invoice-reconcile';

/** 7.2.6 — تقرير المطابقة: كل نوع فرق بيتعدّ، والسليم مابيطلعش، ومفيش أي تعديل على المدخلات */
describe('invoice reconciliation report (read-only)', () => {
  const inv = (id: string, o: Record<string, unknown> = {}) => ({ id, supplierId: 's1', invoiceNo: id.toUpperCase(), baseValue: 1000, vat: 140, stampDuty: 0, withheld: 10, totalInvoice: 1140, netInvoice: 1130, isReturn: false, ...o });
  const all = [
    inv('ok'),
    inv('tot', { totalInvoice: 1139, netInvoice: 1129 }),                    // الاتنين غلط
    inv('net', { netInvoice: 1140 }),                                      // الصافي بس
    inv('flt', { baseValue: 0.1, vat: 0.2, withheld: 0, totalInvoice: 0.1 + 0.2, netInvoice: 0.30000000000000004 }), // float: سليم بالسماحية، بس فوق 4 خانات
    inv('str', { baseValue: '1000' }),                                     // مبلغ كنص
    inv('nos', { supplierId: 'x' }),                                       // مورد مش موجود
    inv('r1', { isReturn: true, linkedInvoiceId: 'gone', withheld: 0, netInvoice: 1140 }),
    inv('r2', { isReturn: true, linkedInvoiceId: 'r1', withheld: 0, netInvoice: 1140 }),
    inv('r3', { isReturn: true, linkedInvoiceId: 'o2', withheld: 0, netInvoice: 1140 }),
    inv('o2', { supplierId: 's2' }),                                       // r3 لمورد تاني، و o2 مش معلّمة بس الربط مش لنفس المورد (الحالة بتتحسب زي القديم)
    inv('o3', { cancelled: true }),                                        // ملغية من غير مرتجعات
    inv('dupA', { invoiceNo: 'D-1' }), inv('dupB', { invoiceNo: ' d-1 ' }), inv('dupR', { invoiceNo: 'D-1', isReturn: true, withheld: 0, netInvoice: 1140 }),
  ];
  const before = JSON.stringify(all);
  const r = reconcileInvoices(all, new Set(['s1', 's2']), new Date('2026-11-21T00:00:00Z'));

  it('counts each kind and lists the ids (no values)', () => {
    expect(r.counts).toMatchObject({ total_mismatch: 1, net_mismatch: 2, non_numeric_amount: 1, over_4dp: 1, missing_supplier: 1, link_missing: 1, link_not_original: 1, link_other_supplier: 1, duplicate_supplier_no: 2 });
    expect(r.duplicateGroups).toBe(1); // المرتجع بنفس الرقم مش مكرر (س1)
    expect(r.issues.filter((x) => x.kind === 'net_mismatch').map((x) => x.id).sort()).toEqual(['net', 'tot']);
    expect(r.issues.some((x) => x.id === 'ok' || x.id === 'flt' && x.kind !== 'over_4dp')).toBe(false);
    expect(Object.keys(r.issues[0]).sort()).toEqual(['id', 'invoiceNo', 'isReturn', 'kind']);
  });
  it('flags stored cancel/postReturnWht flags that differ from the linked returns', () => {
    expect(r.issues.filter((x) => x.kind === 'cancel_flag_mismatch').map((x) => x.id)).toEqual(['o2', 'o3']); // o2 مغطية بـ r3 (القديم مابيفحصش المورد)، وo3 ملغية من غير مرتجع
  });
  it('never mutates the input', () => { expect(JSON.stringify(all)).toBe(before); });
});
