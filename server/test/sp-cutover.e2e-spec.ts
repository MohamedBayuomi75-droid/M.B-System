import { adminToken, bootstrap, createTestApp, sync, TestApp } from './app';
import { cutoverModule, reconcileModule, rollbackModule } from '../src/cutover/module-cutover';
import { SUPPLIER_PAYMENTS } from '../src/cutover/parties-cutover';

/**
 * 7.3.3 — نقل دفعات الموردين للجداول (بيانات اختبار). المعيار: الواجهة القديمة مش بتحس بفرق، والقديم بقيمه بالظبط:
 * مبالغ بخانات كتير، ودفعة من غير اتجاه (B-53)، ودفعة موزّعة (batchId)، وخانات إضافية كائن أو مصفوفة، وnull جواها، وقيم نوعها مختلف.
 */
describe('7.3.3 supplier payments cutover', () => {
  let t: TestApp;
  let admin: string;
  const up = (id: string, set: Record<string, unknown>, baseRev = 0) => ({ collection: 'ledger.payments', id, op: 'upsert', baseRev, set: { id, ...set } });
  const pay = (id: string, o: Record<string, unknown> = {}) => up(id, { paymentNo: 1, supplierId: 's1', date: '2026-01-20', amount: 100, method: 'نقدي', invoiceId: '', transferRef: '', notes: '', extraFields: [], attachments: [], ...o });
  const snap = async () => { const b = await bootstrap(t, admin); return { pay: b.data.ledger.payments, revs: b.meta.revs['ledger.payments'] }; };
  let before: Awaited<ReturnType<typeof snap>>;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    const r = await sync(t, admin, { changes: [
      pay('p1', { paymentNo: 1, direction: 'pay', amount: 0.1 + 0.2, _lastEditRole: 'admin', _lastEditBy: { u: 'admin' } }),
      pay('p2', { paymentNo: 2 }),                                                                  // من غير اتجاه (B-53)
      pay('p3', { paymentNo: 3, direction: 'collect', extraFields: [{ label: 'بنك', value: 'x', meta: null }] }),
      pay('b1', { paymentNo: 4, direction: 'pay', invoiceId: 'i1', amount: 600, batchId: 'pbatch_1' }),
      pay('b2', { paymentNo: 5, direction: 'pay', invoiceId: '', amount: 100.01, batchId: 'pbatch_1', notes: 'متبقي غير موزع' }),
      pay('x1', { paymentNo: '6', amount: '50', extraFields: {} }),                                  // رقم ومبلغ كنص، وخانات إضافية كائن
    ] });
    expect(r.body.applied).toHaveLength(6);
    before = await snap();
  });
  afterAll(async () => t?.close());

  it('dry-run leaves no trace; execute keeps the exact legacy view and counts untyped values', async () => {
    const rec0 = await reconcileModule(t.ds, SUPPLIER_PAYMENTS);
    await cutoverModule(t.ds, SUPPLIER_PAYMENTS, 'test', 'dry-run');
    expect(Number((await t.ds.query(`SELECT count(*)::int AS n FROM supplier_payments`))[0].n)).toBe(0);
    const r = await cutoverModule(t.ds, SUPPLIER_PAYMENTS, 'test', 'execute');
    expect(r.collections[0]).toMatchObject({ collection: 'ledger.payments', migrated: 6, untyped: { amount: 1, paymentNo: 1 } });
    const after = await snap();
    expect(after).toEqual(before);
    expect(JSON.stringify(after.pay)).toBe(JSON.stringify(before.pay));
    expect((await reconcileModule(t.ds, SUPPLIER_PAYMENTS)).collections.map((c) => [c.count, c.content, c.order])).toEqual(rec0.collections.map((c) => [c.count, c.content, c.order]));
    const rows = await t.ds.query(`SELECT id, amount::text AS a, direction, batch_id, extra_fields FROM supplier_payments ORDER BY id`);
    expect(rows.find((x: { id: string }) => x.id === 'p1')).toMatchObject({ a: '0.30000000000000004', direction: 'pay' });
    expect(rows.find((x: { id: string }) => x.id === 'p2').direction).toBeNull();
    expect(rows.filter((x: { batch_id: string }) => x.batch_id === 'pbatch_1')).toHaveLength(2);
    expect(rows.find((x: { id: string }) => x.id === 'x1').extra_fields).toEqual({});
    await expect(t.ds.query(`UPDATE records SET data = data WHERE collection = 'ledger.payments' AND id = 'p1'`)).rejects.toThrow(/frozen/);
  });

  it('the legacy UI keeps writing over the table; rollback brings everything back', async () => {
    const revs = (await snap()).revs;
    const w = await sync(t, admin, { changes: [pay('n1', { paymentNo: 7, direction: 'pay' }), up('p2', { direction: 'collect' }, revs.p2), { collection: 'ledger.payments', id: 'x1', op: 'delete', baseRev: revs.x1 }] });
    expect(w.body.applied.map((a: { id: string; op: string }) => [a.id, a.op])).toEqual([['n1', 'insert'], ['p2', 'update'], ['x1', 'delete']]);
    const mid = await snap();
    expect(mid.pay.find((p: { id: string }) => p.id === 'p2').direction).toBe('collect');
    const res = await rollbackModule(t.ds, SUPPLIER_PAYMENTS, 'test');
    expect(res.restored['ledger.payments']).toBe(7);
    expect(await snap()).toEqual(mid);
    expect(JSON.stringify((await snap()).pay)).toBe(JSON.stringify(mid.pay));
    expect(Number((await t.ds.query(`SELECT count(*)::int AS n FROM supplier_payments`))[0].n)).toBe(0);
  });
});
