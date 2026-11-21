import { adminToken, bootstrap, createTestApp, sync, TestApp } from './app';
import { cutoverModule, reconcileModule, rollbackModule } from '../src/cutover/module-cutover';
import { SUPPLIER_INVOICES } from '../src/cutover/parties-cutover';

/**
 * 7.2.3 — نقل فواتير ومرتجعات الموردين للجداول (بيانات اختبار). المعيار: الواجهة القديمة مش بتحس بفرق، والقديم بقيمه بالظبط
 * (DEC-0107): مبالغ بخانات كتير، وقيم نوعها مختلف، وnull جوه المرفقات، وترتيب، وrev — والرجوع بيرجّع كله شامل اللي اتضاف بعد النقل.
 */
describe('7.2.3 supplier invoices cutover', () => {
  let t: TestApp;
  let admin: string;
  const up = (id: string, set: Record<string, unknown>, baseRev = 0) => ({ collection: 'ledger.invoices', id, op: 'upsert', baseRev, set: { id, ...set } });
  const inv = (id: string, o: Record<string, unknown> = {}) => up(id, { supplierId: 's1', invoiceNo: id.toUpperCase(), date: '2026-01-10', baseValue: 1000, vat: 140, stampDuty: 0, withheld: 10,
    totalInvoice: 1140, netInvoice: 1130, isReturn: false, attachments: [], notes: '', ...o });
  const snap = async () => { const b = await bootstrap(t, admin); return { inv: b.data.ledger.invoices, revs: b.meta.revs['ledger.invoices'] }; };
  let before: Awaited<ReturnType<typeof snap>>;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    const r = await sync(t, admin, { changes: [
      inv('i1', { category: 'مواد', project: 'مشروع 1', dueDate: '2026-02-09', internalCode: 'A\nB', supplierItemCode: 'X\nY', quantity: '2\n3', unitPrice: '1.5\n2', discountRate: '1', withheldStatus: 'paid',
        nature: '001', discountType: '01', invoiceLink: 'https://example.invalid/x', _lastEditRole: 'admin', _lastEditBy: 'admin' }),
      // مبالغ بخانات كتير (float قديم: 0.1 + 0.2 = 0.30000000000000004) بتتنقل بقيمتها
      inv('i2', { baseValue: 0.1, vat: 0.2, totalInvoice: 0.1 + 0.2, netInvoice: 0.1 + 0.2 - 0.0001, withheld: 0.0001 }),
      // قيم نوعها مختلف عن العمود: بتفضل في legacy_extra زي ما هي
      inv('i3', { baseValue: '1000', discountRate: 5, cancelled: 'no', attachments: [{ id: 'f1', name: 'a.pdf', meta: null }], linkedReturnIds: 'r1' }),
      // مرتجع مربوط، وأصل ملغي
      inv('r1', { isReturn: true, linkedInvoiceId: 'i4', withheld: 0, netInvoice: 1140 }),
      inv('i4', { cancelled: true, postReturnWht: false, linkedReturnIds: ['r1'] }),
      // رقم مكرر قديم لنفس المورد (B-31 مابيتطبّقش على القديم)
      inv('i5', { invoiceNo: 'I1' }),
    ] });
    expect(r.status).toBe(200);
    expect(r.body.applied).toHaveLength(6);
    const rev = (await snap()).revs.i2;
    expect((await sync(t, admin, { changes: [up('i2', { notes: 'بعد تعديل' }, rev)] })).body.applied).toHaveLength(1);
    before = await snap();
  });
  afterAll(async () => t?.close());

  it('dry-run leaves no trace; execute keeps the exact legacy view (values, types, order, revs) and counts untyped values', async () => {
    const rec0 = await reconcileModule(t.ds, SUPPLIER_INVOICES);
    await cutoverModule(t.ds, SUPPLIER_INVOICES, 'test', 'dry-run');
    expect(Number((await t.ds.query(`SELECT (SELECT count(*) FROM supplier_invoices) + (SELECT count(*) FROM module_cutover) AS n`))[0].n)).toBe(0);
    const r = await cutoverModule(t.ds, SUPPLIER_INVOICES, 'test', 'execute');
    expect(r.collections[0]).toMatchObject({ collection: 'ledger.invoices', migrated: 6, untyped: { baseValue: 1, cancelled: 1, discountRate: 1, linkedReturnIds: 1 } });
    const after = await snap();
    expect(after).toEqual(before);
    expect(JSON.stringify(after.inv)).toBe(JSON.stringify(before.inv)); // نفس الترتيب ونفس شكل الأرقام
    const rec1 = await reconcileModule(t.ds, SUPPLIER_INVOICES);
    expect(rec1.collections.map((c) => [c.count, c.content, c.order])).toEqual(rec0.collections.map((c) => [c.count, c.content, c.order]));
    expect(rec1.others).toEqual(rec0.others);
    const rows = await t.ds.query(`SELECT total_invoice::text AS t, base_value::text AS v, legacy_extra->'baseValue' AS b FROM supplier_invoices WHERE id IN ('i2', 'i3') ORDER BY id`);
    expect(rows).toEqual([{ t: '0.30000000000000004', v: '0.1', b: null }, { t: '1140', v: null, b: '1000' }]);
    await expect(t.ds.query(`UPDATE records SET data = data WHERE collection = 'ledger.invoices' AND id = 'i1'`)).rejects.toThrow(/frozen/);
  });

  it('the legacy UI keeps writing over the table (add, edit, delete); B-31 applies only to rows with an internal number', async () => {
    const revs = (await snap()).revs;
    const w = await sync(t, admin, { changes: [inv('n1', { invoiceNo: 'I1' }), up('i1', { notes: 'من القديمة' }, revs.i1), { collection: 'ledger.invoices', id: 'i5', op: 'delete', baseRev: revs.i5 }] });
    expect(w.body.applied.map((a: { id: string; op: string }) => [a.id, a.op])).toEqual([['n1', 'insert'], ['i1', 'update'], ['i5', 'delete']]);
    const b = await snap();
    expect(b.inv.find((x: { id: string }) => x.id === 'i1')).toMatchObject({ notes: 'من القديمة', quantity: '2\n3', _lastEditBy: 'admin' });
    expect(b.inv.some((x: { id: string }) => x.id === 'i5')).toBe(false);
    // الجديد برقم داخلي: نفس رقم المورد (من غير حالة أحرف ومسافات) لنفس المورد ونفس النوع ← مرفوض، والمرتجع بنفس الرقم مقبول (س1)
    await expect(t.ds.query(`SELECT legacy_write_supplier_invoice('p1', '{"supplierId":"s1","invoiceNo":" i1 ","isReturn":false,"internalNo":"PI-2026-00001"}'::jsonb)`)).rejects.toThrow(/DUPLICATE_SUPPLIER_INVOICE_NO/);
    await t.ds.query(`SELECT legacy_write_supplier_invoice('p2', '{"supplierId":"s1","invoiceNo":"I1","isReturn":true,"internalNo":"PR-2026-00001"}'::jsonb)`);
    await t.ds.query(`SELECT legacy_write_supplier_invoice('p3', '{"supplierId":"s2","invoiceNo":"I1","isReturn":false,"internalNo":"PI-2026-00002"}'::jsonb)`);
    await expect(t.ds.query(`SELECT legacy_write_supplier_invoice('p4', '{"supplierId":"s9","invoiceNo":"Z","internalNo":"PI-2026-00002"}'::jsonb)`)).rejects.toThrow(/uq_supplier_invoices_internal_no/);
  });

  it('rollback brings everything (incl. post-cutover changes) back to records with the same legacy view', async () => {
    const mid = await snap();
    const res = await rollbackModule(t.ds, SUPPLIER_INVOICES, 'test');
    expect(res.restored['ledger.invoices']).toBe(9); // 6 (منهم i5 بتترجع محذوفة) + n1 + p2 + p3
    expect(await snap()).toEqual(mid);
    expect(JSON.stringify((await snap()).inv)).toBe(JSON.stringify(mid.inv));
    expect(Number((await t.ds.query(`SELECT count(*)::int AS n FROM supplier_invoices`))[0].n)).toBe(0);
    expect((await sync(t, admin, { changes: [inv('after')] })).body.applied).toHaveLength(1);
  });
});
