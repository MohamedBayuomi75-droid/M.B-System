import { adminToken, bootstrap, createTestApp, sync, TestApp } from './app';
import { cutoverModule, reconcileModule, rollbackModule } from '../src/cutover/module-cutover';
import { ATTENDANCE } from '../src/cutover/parties-cutover';

/**
 * 8.5.3 — نقل اليوميات وحضور الموظفين للجداول (بيانات اختبار). المعيار: الواجهة القديمة مش بتحس بفرق، والقديم بقيمه بالظبط —
 * **ما عدا تثبيت الأجر (DEC-0130):** اليومية اللي مالهاش أجر محفوظ صالح بتاخد أجر صاحبها الحالي (round2) ويتثبّت، ومعاه dayWageSource.
 * ويوميات بأنواع: عامل، ومشرف، وسواق، وسجل قديم ناقصه النوع (بيتعرف من الشخص)، وصاحب مش موجود (أجر 0)، وقيم نوعها مختلف.
 */
describe('8.5.3 attendance cutover', () => {
  let t: TestApp;
  let admin: string;
  const up = (collection: string, id: string, set: Record<string, unknown>, baseRev = 0) => ({ collection, id, op: 'upsert', baseRev, set: { id, ...set } });
  const W = (id: string, set: Record<string, unknown>) => up('workerAttendance', id, { status: 'present', days: 1, deduction: 0, project: 'أ', ...set });
  const snap = async () => { const b = await bootstrap(t, admin); return { w: b.data.workerAttendance, a: b.data.attendance, revs: [b.meta.revs.workerAttendance, b.meta.revs.attendance] }; };
  let before: Awaited<ReturnType<typeof snap>>;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    const r = await sync(t, admin, { changes: [
      up('workers', 'w1', { code: 'WRK-001', name: 'عامل', status: 'active', dailyWage: 333.335 }),
      up('supervisors', 's1', { code: 'SUP-001', name: 'مشرف', status: 'active', dailyWage: 400 }),
      up('drivers', 'd1', { code: 'DRV-001', name: 'سواق', status: 'active', dailyWage: '280' }),
      W('a1', { personType: 'worker', personKind: 'worker', personId: 'w1', workerId: 'w1', date: '2026-03-01', dayWage: 333.33, days: 1.5, site: 'س' }),
      W('a2', { personType: 'worker', personKind: 'worker', personId: 'w1', workerId: 'w1', date: '2026-03-02' }), // من غير أجر ← 333.34
      W('a3', { personType: 'supervisor', personId: 's1', supervisorId: 's1', date: '2026-03-01', dayWage: '' }), // أجر فاضي ← 400
      W('a4', { personType: 'driver', personId: 'd1', driverId: 'd1', date: '2026-03-01' }), // أجر الشخص نص ← 280
      W('a5', { workerId: 'w1', date: '2026-03-03' }), // قديم ناقصه النوع ← عامل من الشخص ← 333.34
      W('a6', { personType: 'worker', personId: 'w9', workerId: 'w9', date: '2026-03-04' }), // صاحب مش موجود ← 0
      W('ax', { personType: 'worker', personId: 'w1', workerId: 'w1', date: '2026-03-05', dayWage: 250, days: '2', deduction: 'x', projectId: 'pA' }),
      up('attendance', 't1', { employeeId: 'e1', date: '2026-03-01', status: 'present', checkIn: '08:00', checkOut: '16:00', notes: '' }),
    ] });
    expect(r.body.applied).toHaveLength(11);
    before = await snap();
  });
  afterAll(async () => t?.close());

  it('execute pins missing wages (and only those), keeps everything else exact, and counts them', async () => {
    const rec0 = await reconcileModule(t.ds, ATTENDANCE);
    const r = await cutoverModule(t.ds, ATTENDANCE, 'test', 'execute');
    expect(r.collections.map((c) => [c.collection, c.migrated, c.untyped, c.normalizedOnWrite])).toEqual([['workerAttendance', 7, { days: 1, deduction: 1 }, 5], ['attendance', 1, {}, undefined]]);
    const after = await snap();
    const pinned = (id: string) => after.w.find((x: { id: string }) => x.id === id);
    expect([pinned('a2').dayWage, pinned('a3').dayWage, pinned('a4').dayWage, pinned('a5').dayWage, pinned('a6').dayWage]).toEqual([333.34, 400, 280, 333.34, 0]);
    expect(pinned('a2').dayWageSource).toBe('pinned-at-cutover');
    // كل حاجة تانية زي ما هي بالظبط
    const strip = (xs: Record<string, unknown>[]) => xs.map((x) => { const { dayWage, dayWageSource, ...rest } = x as Record<string, unknown>; void dayWageSource; return ['a2', 'a3', 'a4', 'a5', 'a6'].includes(String(x.id)) ? rest : { ...rest, dayWage }; });
    expect(strip(after.w)).toEqual(strip(before.w));
    expect(pinned('a1')).toEqual(before.w.find((x: { id: string }) => x.id === 'a1'));
    expect(after.a).toEqual(before.a);
    expect((await reconcileModule(t.ds, ATTENDANCE)).collections.map((c) => [c.count, c.content, c.order])).toEqual(rec0.collections.map((c) => [c.count, c.content, c.order]));
    const ax = (await t.ds.query(`SELECT project_id, legacy_extra FROM worker_attendance WHERE id = 'ax'`))[0];
    expect(ax).toEqual({ project_id: 'pA', legacy_extra: { days: '2', deduction: 'x' } });
  });

  it('legacy writes over the tables; rollback brings everything back (pins stay — DEC-0130)', async () => {
    const { revs } = await snap();
    const w = await sync(t, admin, { changes: [
      W('n1', { personType: 'worker', personId: 'w1', workerId: 'w1', date: '2026-03-09', dayWage: 300 }), up('workerAttendance', 'a1', { notes: 'x' }, revs[0].a1),
      { collection: 'attendance', id: 't1', op: 'delete', baseRev: revs[1].t1 },
    ] });
    expect(w.body.applied.map((a: { id: string; op: string }) => [a.id, a.op])).toEqual([['n1', 'insert'], ['a1', 'update'], ['t1', 'delete']]);
    const mid = await snap();
    const res = await rollbackModule(t.ds, ATTENDANCE, 'test');
    expect(res.restored).toMatchObject({ workerAttendance: 8, attendance: 1 });
    expect(await snap()).toEqual(mid);
    expect(Number((await t.ds.query(`SELECT (SELECT count(*) FROM worker_attendance) + (SELECT count(*) FROM attendance) AS n`))[0].n)).toBe(0);
  });
});
