import { adminToken, bootstrap, createTestApp, sync, TestApp } from './app';
import { cutoverModule, reconcileModule, rollbackModule } from '../src/cutover/module-cutover';
import { LEAVES } from '../src/cutover/parties-cutover';

/**
 * 8.4.3 — نقل الإجازات للجدول (بيانات اختبار). المعيار: الواجهة القديمة مش بتحس بفرق، والقديم بقيمه بالظبط:
 * إجازة موظف معتمدة، وإجازة عامل معلّقة بنص يوم، وإجازة بعكس التواريخ، وقيم نوعها مختلف (الأيام نص، والحالة رقم)، وحقل مالوش عمود (`kind`).
 */
describe('8.4.3 leaves cutover', () => {
  let t: TestApp;
  let admin: string;
  const up = (id: string, set: Record<string, unknown>, baseRev = 0) => ({ collection: 'leaves', id, op: 'upsert', baseRev, set: { id, ...set } });
  const snap = async () => { const b = await bootstrap(t, admin); return { l: b.data.leaves, rev: b.meta.revs.leaves }; };
  let before: Awaited<ReturnType<typeof snap>>;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    const r = await sync(t, admin, { changes: [
      up('l1', { personKind: 'employee', personId: 'e1', employeeId: 'e1', type: 'annual', from: '2026-01-05', to: '2026-01-09', days: 5, reason: 'سفر', status: 'approved' }),
      up('l2', { personKind: 'worker', personId: 'w1', employeeId: '', type: 'sick', from: '2026-02-01', to: '2026-02-01', days: 0.5, reason: '', status: 'pending' }),
      up('l3', { personKind: 'driver', personId: 'd1', employeeId: '', type: 'annual', from: '2026-03-10', to: '2026-03-01', days: 1, status: 'rejected' }),
      up('lx', { kind: 'employee', employeeId: 'e2', type: 'annual', from: '2026-04-01', to: '2026-04-02', days: '2', status: 7 }),
    ] });
    expect(r.body.applied).toHaveLength(4);
    before = await snap();
  });
  afterAll(async () => t?.close());

  it('dry-run leaves no trace; execute keeps the exact legacy view and counts untyped values', async () => {
    const rec0 = await reconcileModule(t.ds, LEAVES);
    await cutoverModule(t.ds, LEAVES, 'test', 'dry-run');
    expect(Number((await t.ds.query(`SELECT count(*) AS n FROM leaves`))[0].n)).toBe(0);
    const r = await cutoverModule(t.ds, LEAVES, 'test', 'execute');
    expect(r.collections.map((c) => [c.collection, c.migrated, c.untyped])).toEqual([['leaves', 4, { days: 1, status: 1 }]]);
    const after = await snap();
    expect(after).toEqual(before);
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
    expect((await reconcileModule(t.ds, LEAVES)).collections.map((c) => [c.count, c.content, c.order])).toEqual(rec0.collections.map((c) => [c.count, c.content, c.order]));
    const rows = await t.ds.query(`SELECT id, person_kind, person_id, from_date, to_date, days::text AS d, status, legacy_extra FROM leaves ORDER BY id`);
    const by = (id: string) => rows.find((x: { id: string }) => x.id === id);
    expect(by('l1')).toMatchObject({ person_kind: 'employee', from_date: '2026-01-05', to_date: '2026-01-09', d: '5', status: 'approved', legacy_extra: {} });
    expect(by('l2')).toMatchObject({ d: '0.5', status: 'pending' });
    expect(by('l3')).toMatchObject({ from_date: '2026-03-10', to_date: '2026-03-01' });
    expect(by('lx').legacy_extra).toEqual({ kind: 'employee', days: '2', status: 7 });
    await expect(t.ds.query(`UPDATE records SET data = data WHERE collection = 'leaves' AND id = 'l1'`)).rejects.toThrow(/frozen/);
  });

  it('the legacy UI keeps writing over the table; rollback brings everything back', async () => {
    const { rev } = await snap();
    const w = await sync(t, admin, { changes: [
      up('n1', { personKind: 'supervisor', personId: 's1', employeeId: '', type: 'emergency', from: '2026-05-01', to: '2026-05-02', days: 2, reason: 'x', status: 'pending' }),
      up('l2', { status: 'approved' }, rev.l2), { collection: 'leaves', id: 'lx', op: 'delete', baseRev: rev.lx },
    ] });
    expect(w.body.applied.map((a: { id: string; op: string }) => [a.id, a.op])).toEqual([['n1', 'insert'], ['l2', 'update'], ['lx', 'delete']]);
    const mid = await snap();
    expect(mid.l.find((x: { id: string }) => x.id === 'l2')).toMatchObject({ status: 'approved', days: 0.5 });
    const res = await rollbackModule(t.ds, LEAVES, 'test');
    expect(res.restored).toMatchObject({ leaves: 5 }); // ومعاهم المحذوف (tombstone)
    expect(await snap()).toEqual(mid);
    expect(JSON.stringify(await snap())).toBe(JSON.stringify(mid));
    expect(Number((await t.ds.query(`SELECT count(*) AS n FROM leaves`))[0].n)).toBe(0);
  });
});
