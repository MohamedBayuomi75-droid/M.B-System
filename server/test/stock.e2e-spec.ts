import { adminToken, bootstrap, createTestApp, newUser, sync, TestApp } from './app';

/**
 * B-50 (معتمد ونهائي): مفيش رصيد مخزني سالب في أي حالة ومن غير استثناء — خادم + قاعدة بيانات.
 * كل البيانات هنا بيانات اختبار.
 */
describe('B-50 no negative stock', () => {
  let t: TestApp;
  let admin: string;
  let wh: string;
  let n = 0;
  const mv = (type: string, qty: unknown, o: Record<string, unknown> = {}) => {
    const id = `mv_t${++n}`;
    return { collection: 'warehouses.movements', id, op: 'upsert', baseRev: 0, set: { id, type, itemId: 'it1', qty, locationId: 'L1', date: '2026-06-01', ...o } };
  };
  const balance = async (item = 'it1', loc = 'L1') => String(Number((await t.ds.query(`SELECT wh_balance($1, $2)::text AS b`, [item, loc]))[0].b));
  const rev = async (id: string) => (await bootstrap(t, admin)).meta.revs['warehouses.movements'][id];

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    wh = (await newUser(t, admin, 'b50_wh', 'warehouse')).token;
    await sync(t, admin, { changes: [
      { collection: 'warehouses.items', id: 'it1', op: 'upsert', baseRev: 0, set: { id: 'it1', name: 'صنف اختبار' } },
      { collection: 'warehouses.locations', id: 'L1', op: 'upsert', baseRev: 0, set: { id: 'L1', name: 'مخزن 1' } },
      { collection: 'warehouses.locations', id: 'L2', op: 'upsert', baseRev: 0, set: { id: 'L2', name: 'مخزن 2' } },
    ] });
  });
  afterAll(async () => t?.close());

  it('issue above the balance is refused (explicit conflict, nothing saved, other changes in the batch still apply) and the attempt is audited', async () => {
    const recv = mv('in', 10);
    expect((await sync(t, wh, { changes: [recv] })).body.applied[0].op).toBe('insert');
    const ok = mv('out', 4), tooMuch = mv('out', 6.00001), other = { collection: 'warehouses.items', id: 'it2', op: 'upsert', baseRev: 0, set: { id: 'it2', name: 'صنف 2' } };
    const r = await sync(t, wh, { changes: [ok, tooMuch, other] });
    expect(r.status).toBe(200);
    expect(r.body.applied.map((a: { id: string }) => a.id)).toEqual([ok.id, 'it2']);
    expect(r.body.conflicts).toEqual([expect.objectContaining({ id: tooMuch.id, reason: 'constraint', current: null })]);
    expect(r.body.conflicts[0].fields[0]).toMatch(/^negative_stock:NEGATIVE_STOCK item=it1 location=L1 .*available=-0\.00001/);
    expect(await balance()).toBe('6');
    const [a] = await t.ds.query(`SELECT username, action, entity_id, details FROM audit_log WHERE action = 'stock.issue_rejected'`);
    expect(a).toMatchObject({ username: 'b50_wh', entity_id: tooMuch.id });
    expect(a.details.attempted).toMatchObject({ type: 'out', qty: 6.00001 });
    expect((await sync(t, wh, { changes: [mv('out', 6)] })).body.applied).toHaveLength(1); // بالظبط الرصيد = مسموح (5 خانات من غير تقريب)
    expect(await balance()).toBe('0');
  });

  it('no override: the admin is refused too', async () => {
    expect((await sync(t, admin, { changes: [mv('out', 1)] })).body.conflicts[0].reason).toBe('constraint');
    expect((await sync(t, admin, { changes: [mv('adjust_out', 1)] })).body.conflicts[0].reason).toBe('constraint');
  });

  it('transfers check the source; edits and deletes that lower a balance are refused', async () => {
    const recv = mv('in', 5);
    await sync(t, wh, { changes: [recv] });
    expect((await sync(t, wh, { changes: [mv('transfer', 6, { toLocationId: 'L2' })] })).body.conflicts).toHaveLength(1);
    const tr = mv('transfer', 3, { toLocationId: 'L2' });
    expect((await sync(t, wh, { changes: [tr] })).body.applied).toHaveLength(1);
    expect([await balance('it1', 'L1'), await balance('it1', 'L2')]).toEqual(['2', '3']);
    // تعديل كمية الاستلام لأقل من المصروف منه ← مرفوض
    expect((await sync(t, wh, { changes: [{ collection: 'warehouses.movements', id: recv.id, op: 'upsert', baseRev: await rev(recv.id), set: { qty: 2.5 } }] })).body.conflicts[0].reason).toBe('constraint');
    // حذف الاستلام ← L1 يبقى سالب ← مرفوض (الحذف بالمدير — دور المخازن مالوش حذف — والمدير كمان ممنوع)
    expect((await sync(t, wh, { changes: [{ collection: 'warehouses.movements', id: recv.id, op: 'delete', baseRev: await rev(recv.id) }] })).status).toBe(403);
    expect((await sync(t, admin, { changes: [{ collection: 'warehouses.movements', id: recv.id, op: 'delete', baseRev: await rev(recv.id) }] })).body.conflicts[0].reason).toBe('constraint');
    // حذف التحويل اللي وصل L2 بعد ما L2 صرف منه ← مرفوض
    expect((await sync(t, wh, { changes: [mv('out', 3, { locationId: 'L2' })] })).body.applied).toHaveLength(1);
    expect((await sync(t, admin, { changes: [{ collection: 'warehouses.movements', id: tr.id, op: 'delete', baseRev: await rev(tr.id) }] })).body.conflicts).toHaveLength(1);
    expect([await balance('it1', 'L1'), await balance('it1', 'L2')]).toEqual(['2', '0']);
  });

  it('invalid movements are refused (qty ≤ 0, unknown type, transfer to the same place, missing item)', async () => {
    const bad = [mv('in', 0), mv('in', -3), mv('in', 'abc'), mv('lend', 1), mv('transfer', 1, { toLocationId: 'L1' }), mv('in', 1, { itemId: '' })];
    const r = await sync(t, wh, { changes: bad });
    expect(r.body.conflicts.map((c: { fields: string[] }) => c.fields[0].split(':')[0])).toEqual(Array(6).fill('invalid_movement'));
    expect((await t.ds.query(`SELECT count(*)::int AS n FROM audit_log WHERE action = 'stock.movement_rejected'`))[0].n).toBe(6);
  });

  it('available = balance − reserved; a reservation itself cannot exceed availability', async () => {
    expect(await balance()).toBe('2');
    await t.ds.query(`INSERT INTO stock_reservations (item_id, location_id, qty, source_type, source_id) VALUES ('it1', 'L1', 1.5, 'test', 'R1')`);
    expect((await sync(t, wh, { changes: [mv('out', 1)] })).body.conflicts).toHaveLength(1);
    expect((await sync(t, wh, { changes: [mv('out', 0.5)] })).body.applied).toHaveLength(1);
    await expect(t.ds.query(`INSERT INTO stock_reservations (item_id, location_id, qty, source_type, source_id) VALUES ('it1', 'L1', 0.1, 'test', 'R2')`)).rejects.toThrow(/NEGATIVE_STOCK/);
    await t.ds.query(`UPDATE stock_reservations SET status = 'released', closed_at = now() WHERE source_id = 'R1'`);
    expect((await sync(t, wh, { changes: [mv('out', 1.5)] })).body.applied).toHaveLength(1);
    expect(await balance()).toBe('0');
  });

  it('concurrency: 20 simultaneous issues of 1 against a balance of 10 → exactly 10 succeed', async () => {
    await sync(t, wh, { changes: [mv('in', 10, { itemId: 'it9' })] });
    const res = await Promise.all(Array.from({ length: 20 }, () => sync(t, wh, { changes: [mv('out', 1, { itemId: 'it9' })] })));
    expect(res.every((r) => r.status === 200)).toBe(true);
    expect(res.filter((r) => r.body.applied.length === 1)).toHaveLength(10);
    expect(await balance('it9')).toBe('0');
  });

  it('database level: direct SQL that would go negative is refused; movements are never hard-deleted', async () => {
    await expect(t.ds.query(`INSERT INTO records (collection, id, data, rev) VALUES ('warehouses.movements', 'sql1', '{"type":"out","itemId":"it1","qty":1,"locationId":"L1"}', 1)`)).rejects.toThrow(/NEGATIVE_STOCK/);
    await expect(t.ds.query(`DELETE FROM records WHERE collection = 'warehouses.movements'`)).rejects.toThrow(/never hard-deleted/);
  });
});
