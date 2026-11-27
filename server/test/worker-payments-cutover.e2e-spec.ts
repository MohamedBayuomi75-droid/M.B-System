import { adminToken, bootstrap, createTestApp, sync, TestApp } from './app';
import { cutoverModule, reconcileModule, rollbackModule } from '../src/cutover/module-cutover';
import { WORKER_PAYMENTS } from '../src/cutover/parties-cutover';

/**
 * 8.6.2 — نقل الصرف والخصومات وخصومات الموظفين للجداول (بيانات اختبار). المعيار: الواجهة القديمة مش بتحس بفرق، والقديم بقيمه بالظبط
 * (مفيش تطبيع). سجلات بكل أنواع الصرف اللي النافذة القديمة بتكتبها (phase83)، وسجل قديم من غير نوع، وقيم نوعها مختلف.
 */
describe('8.6.2 worker payments cutover', () => {
  let t: TestApp;
  let admin: string;
  const up = (collection: string, id: string, set: Record<string, unknown>, baseRev = 0) => ({ collection, id, op: 'upsert', baseRev, set: { id, ...set } });
  const PAY = (id: string, set: Record<string, unknown>) => up('workerPayments', id, { type: 'pay', scope: 'self', notes: '', ...set });
  const snap = async () => { const b = await bootstrap(t, admin); return { p: b.data.workerPayments, k: b.data.employeePenalties, revs: [b.meta.revs.workerPayments, b.meta.revs.employeePenalties] }; };
  let before: Awaited<ReturnType<typeof snap>>;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    const r = await sync(t, admin, { changes: [
      PAY('p1', { personType: 'worker', personId: 'w1', workerId: 'w1', date: '2026-03-05', amount: 300, payCategory: 'دفع يوميات', payKind: 'daily', isExtra: false, salaryAmount: 0, extrasAmount: 0, linkedBonusId: '' }),
      PAY('p2', { personType: 'worker', personId: 'w1', workerId: 'w1', type: 'penalty', date: '2026-03-06', amount: 40, payCategory: 'تأخير', payKind: 'penalty' }),
      PAY('p3', { personType: 'worker', personId: 'w2', workerId: 'w2', type: 'bonus', date: '2026-03-06', amount: 100, payCategory: 'مكافأة', payKind: 'bonus', isExtra: true, status: 'paid', paidDate: '2026-03-23' }),
      PAY('p4', { personType: 'worker', personId: 'w2', workerId: 'w2', date: '2026-03-25', amount: 500, payKind: 'daily', fromSupervisorId: 's1', scope: 'workers' }),
      PAY('p5', { personType: 'employee', personId: 'e1', workerId: '', date: '2026-03-10', amount: 2500, payKind: 'salary', salaryAmount: 2500 }),
      up('workerPayments', 'p6', { workerId: 'w2', date: '2026-03-08', amount: 60, notes: 'سجل قديم من غير نوع' }),
      PAY('px', { personType: 'driver', personId: 'd1', date: '2026-04-01', amount: '50', isExtra: 'no', project: 'برج النيل' }),
      up('employeePenalties', 'k1', { employeeId: 'e1', date: '2026-03-11', amount: 150, reason: 'غياب', notes: '', type: 'penalty' }),
      up('employeePenalties', 'kx', { employeeId: 'e1', date: '2026-03-12', amount: 'مية', reason: 'تأخير' }),
    ] });
    expect(r.body.applied).toHaveLength(9);
    before = await snap();
  });
  afterAll(async () => t?.close());

  it('execute keeps every record exact (no normalization) and counts untyped values', async () => {
    const rec0 = await reconcileModule(t.ds, WORKER_PAYMENTS);
    const r = await cutoverModule(t.ds, WORKER_PAYMENTS, 'test', 'execute');
    expect(r.collections.map((c) => [c.collection, c.migrated, c.untyped])).toEqual([['workerPayments', 7, { amount: 1, isExtra: 1 }], ['employeePenalties', 2, { amount: 1 }]]);
    const after = await snap();
    expect(after.p).toEqual(before.p);
    expect(after.k).toEqual(before.k);
    expect((await reconcileModule(t.ds, WORKER_PAYMENTS)).collections.map((c) => [c.count, c.content, c.order])).toEqual(rec0.collections.map((c) => [c.count, c.content, c.order]));
    const px = (await t.ds.query(`SELECT amount, is_extra, project, legacy_extra FROM worker_payments WHERE id = 'px'`))[0];
    expect(px).toEqual({ amount: null, is_extra: null, project: 'برج النيل', legacy_extra: { amount: '50', isExtra: 'no' } });
  });

  it('legacy writes over the tables; rollback brings everything back', async () => {
    const { revs } = await snap();
    const w = await sync(t, admin, { changes: [
      PAY('n1', { personType: 'supervisor', personId: 's1', date: '2026-03-25', amount: 500, payKind: 'daily', scope: 'close_account' }), up('workerPayments', 'p1', { notes: 'x' }, revs[0].p1),
      { collection: 'employeePenalties', id: 'k1', op: 'delete', baseRev: revs[1].k1 },
    ] });
    expect(w.body.applied.map((a: { id: string; op: string }) => [a.id, a.op])).toEqual([['n1', 'insert'], ['p1', 'update'], ['k1', 'delete']]);
    const mid = await snap();
    const res = await rollbackModule(t.ds, WORKER_PAYMENTS, 'test');
    expect(res.restored).toMatchObject({ workerPayments: 8, employeePenalties: 2 }); // الممسوح بيرجع كسجل محذوف (tombstone)
    expect(await snap()).toEqual(mid);
    expect(Number((await t.ds.query(`SELECT (SELECT count(*) FROM worker_payments) + (SELECT count(*) FROM employee_penalties) AS n`))[0].n)).toBe(0);
  });
});
