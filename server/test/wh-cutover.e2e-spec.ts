import { adminToken, bootstrap, createTestApp, newUser, sync, TestApp } from './app';
import { cutoverModule, rollbackModule } from '../src/cutover/module-cutover';
import { WAREHOUSES } from '../src/cutover/parties-cutover';

/**
 * 6.2-ب — نقل المخازن للجداول (بيانات اختبار). المعيار: الواجهة الحالية مش بتحس بفرق، وB-50 بيفضل مفروض قبل وبعد النقل وبعد الرجوع.
 */
describe('6.2-B warehouses cutover', () => {
  let t: TestApp;
  let admin: string;
  let wh: string;
  const up = (collection: string, id: string, set: Record<string, unknown>, baseRev = 0) => ({ collection, id, op: 'upsert', baseRev, set });
  const mv = (id: string, set: Record<string, unknown>) => up('warehouses.movements', id, { id, date: '2026-06-01', ...set });
  const snap = async () => { const b = await bootstrap(t, admin); const w = b.data.warehouses; return { i: w.items, l: w.locations, m: w.movements, revs: [b.meta.revs['warehouses.items'], b.meta.revs['warehouses.movements']] }; };
  const bal = async (item = 'it1', loc = 'L1') => Number((await t.ds.query(`SELECT wh_balance($1, $2)::text AS b`, [item, loc]))[0].b);
  let before: Awaited<ReturnType<typeof snap>>;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    wh = (await newUser(t, admin, 'whc_keeper', 'warehouse')).token;
    expect((await sync(t, admin, { changes: [
      up('warehouses.locations', 'L1', { id: 'L1', name: 'مخزن 1', notes: '' }), up('warehouses.locations', 'L2', { id: 'L2', name: 'مخزن 2' }),
      up('warehouses.items', 'it1', { id: 'it1', code: 'ITM-0001', name: 'أسمنت', unit: 'شيكارة', category: 'مواد', minQty: 5, avgCost: 12.5, lastCost: 13, notes: '', _x: { keep: true } }),
      up('warehouses.items', 'it2', { id: 'it2', name: 'صنف من غير حركات' }),
      mv('m1', { type: 'in', itemId: 'it1', qty: 10, locationId: 'L1', unitCost: 12.5, supplierInvoiceId: 'inv1', supplierName: 'مورد', notes: '' }),
      mv('m2', { type: 'out', itemId: 'it1', qty: 10, locationId: 'L1', project: 'مشروع 1', unitCost: 12.5, notes: '' }),
      mv('m3', { type: 'in', itemId: 'it1', qty: 3, locationId: 'L1', unitCost: 13 }),
      mv('m4', { type: 'transfer', itemId: 'it1', qty: 0.25, locationId: 'L1', toLocationId: 'L2' }),
    ] })).status).toBe(200);
    // تعديل لاحق: الاستلام الأول بقى 7.25 — الحالة النهائية سليمة (7.25 − 10 + 3 − 0.25 = 0)، لكن بالترتيب الزمني لوحده الصرف (m2) بيعدّي بـ −2.75 مؤقتًا
    const r1 = (await bootstrap(t, admin)).meta.revs['warehouses.movements'].m1;
    expect((await sync(t, admin, { changes: [up('warehouses.movements', 'm1', { qty: 7.25 }, r1)] })).body.applied).toHaveLength(1);
    expect([await bal('it1', 'L1'), await bal('it1', 'L2')]).toEqual([0, 0.25]);
    before = await snap();
  });
  afterAll(async () => t?.close());

  it('dry-run leaves no trace; execute keeps the exact legacy view (data, order, revs) — final-state check, not prefix order', async () => {
    await cutoverModule(t.ds, WAREHOUSES, 'test', 'dry-run');
    expect(Number((await t.ds.query(`SELECT (SELECT count(*) FROM wh_movements) + (SELECT count(*) FROM module_cutover) AS n`))[0].n)).toBe(0);
    const r = await cutoverModule(t.ds, WAREHOUSES, 'test', 'execute');
    expect(r.collections.map((c) => [c.collection, c.migrated])).toEqual([['warehouses.locations', 2], ['warehouses.items', 2], ['warehouses.movements', 4]]);
    expect(await snap()).toEqual(before);
    expect([await bal('it1', 'L1'), await bal('it1', 'L2')]).toEqual([0, 0.25]);
    await expect(t.ds.query(`UPDATE records SET data = data WHERE collection = 'warehouses.items' AND id = 'it1'`)).rejects.toThrow(/frozen/);
  });

  it('B-50 still enforced on the tables: refusal, audit, concurrency, direct SQL, no hard delete', async () => {
    const r = await sync(t, wh, { changes: [mv('m5', { type: 'out', itemId: 'it1', qty: 0.1, locationId: 'L2' }), mv('m6', { type: 'out', itemId: 'it1', qty: 0.2, locationId: 'L2' })] });
    expect(r.body.applied.map((a: { id: string }) => a.id)).toEqual(['m5']);
    expect(r.body.conflicts[0].fields[0]).toMatch(/^negative_stock:NEGATIVE_STOCK/);
    expect((await t.ds.query(`SELECT count(*)::int AS n FROM audit_log WHERE action = 'stock.issue_rejected' AND entity_id = 'm6'`))[0].n).toBe(1);
    expect((await sync(t, wh, { changes: [mv('m7', { type: 'in', itemId: 'it9', qty: 10, locationId: 'L1' })] })).body.applied).toHaveLength(1);
    const res = await Promise.all(Array.from({ length: 15 }, (_, i) => sync(t, wh, { changes: [mv(`c${i}`, { type: 'out', itemId: 'it9', qty: 1, locationId: 'L1' })] })));
    expect(res.filter((x) => x.body.applied?.length === 1)).toHaveLength(10);
    expect(await bal('it9', 'L1')).toBe(0);
    await expect(t.ds.query(`INSERT INTO wh_movements (id, type, item_id, qty, location_id) VALUES ('sql1', 'out', 'it1', 1, 'L1')`)).rejects.toThrow(/NEGATIVE_STOCK/);
    await expect(t.ds.query(`DELETE FROM wh_movements WHERE id = 'm3'`)).rejects.toThrow(/never hard-deleted/);
    expect((await sync(t, wh, { changes: [mv('bad', { type: 'in', itemId: 'it1', qty: 0, locationId: 'L1' })] })).body.conflicts[0].fields[0]).toMatch(/^invalid_movement:/);
  });

  it('an item with movements cannot be deleted (stop instead); an unused item can', async () => {
    const revs = (await bootstrap(t, admin)).meta.revs['warehouses.items'];
    const r = await sync(t, admin, { changes: [{ collection: 'warehouses.items', id: 'it1', op: 'delete', baseRev: revs.it1 }, { collection: 'warehouses.items', id: 'it2', op: 'delete', baseRev: revs.it2 }] });
    expect(r.body.applied.map((a: { id: string; op: string }) => [a.id, a.op])).toEqual([['it2', 'delete']]);
    expect(r.body.conflicts[0]).toMatchObject({ id: 'it1', reason: 'constraint' });
    expect(r.body.conflicts[0].fields[0]).toMatch(/^item_has_movements:/);
  });

  it('rollback brings everything (incl. post-cutover changes) back to records; B-50 keeps working there', async () => {
    const mid = await snap();
    const res = await rollbackModule(t.ds, WAREHOUSES, 'test');
    expect(res.restored['warehouses.movements']).toBeGreaterThan(4);
    expect(await snap()).toEqual(mid);
    expect(Number((await t.ds.query(`SELECT (SELECT count(*) FROM wh_movements) + (SELECT count(*) FROM wh_items) AS n`))[0].n)).toBe(0);
    expect((await sync(t, wh, { changes: [mv('after', { type: 'out', itemId: 'it9', qty: 1, locationId: 'L1' })] })).body.conflicts[0].fields[0]).toMatch(/^negative_stock/);
  });
});
