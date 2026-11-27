import { adminToken, bearer, createTestApp, newUser, sync, TestApp } from './app';
import { cutoverModule } from '../src/cutover/module-cutover';
import { WORKER_PAYMENTS } from '../src/cutover/parties-cutover';

/**
 * 8.6.3 — API المستحقات والصرف (بيانات اختبار phase83). الأرصدة القديمة = أرقام القديمة بالظبط (phase83.expect.json: w1 = 685، وw2 = 790،
 * وd1 = 200، وe1 = 3350)، والجديدة بالحساب الجديد للأيام (DEC-0129: 333.33 × 1.5 = 499.995، ونصف يوم 166.665 ← w1 = 684.99)، والسلفة (DEC-0132)، ونطاقات صرف
 * المشرف، والحذف، والبنود — قبل النقل للجداول وبعده. المقارنة الحرفية بالقديمة: tests-merge/phase84.js.
 */
describe('8.6.3 dues API', () => {
  let t: TestApp;
  let admin: string;
  let k = 0;
  const D = '/api/v1/dues';
  const post = (path: string, tok: string, body: Record<string, unknown>) => t.http().post(path).set(bearer(tok)).set('Idempotency-Key', `dues-key-${++k}`).send(body);
  const up = (collection: string, id: string, set: Record<string, unknown>) => ({ collection, id, op: 'upsert', baseRev: 0, set: { id, ...set } });
  const W = (id: string, pid: string, set: Record<string, unknown>) => up('workerAttendance', id, { personType: 'worker', personKind: 'worker', personId: pid, workerId: pid, status: 'present', days: 1, deduction: 0, notes: '', ...set });
  const PAY = (id: string, set: Record<string, unknown>) => up('workerPayments', id, { type: 'pay', scope: 'self', notes: '', ...set });
  const table = async (q: string, tok = admin) => (await t.http().get(`${D}/table?${q}`).set(bearer(tok)).expect(200)).body;
  const row = async (q: string, id: string) => (await table(q)).rows.find((r: { id: string }) => r.id === id);

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    expect((await sync(t, admin, { changes: [
      up('supervisors', 's1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active', dailyWage: 400, departmentId: '__core_supervisors__' }),
      up('workers', 'w1', { code: 'WRK-001', name: 'عامل أول', status: 'active', dailyWage: 333.33, supervisorId: 's1', departmentId: '__core_workers_temp__' }),
      up('workers', 'w2', { code: 'WRK-002', name: 'بدر الشركة', status: 'active', dailyWage: 250, supervisorId: 's1', departmentId: '__core_workers_perm__' }),
      up('drivers', 'd1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', dailyWage: 280 }),
      up('employees', 'e1', { code: 'EMP-001', name: 'أحمد المحاسب', status: 'active', salary: 6000, hireDate: '2025-01-01' }),
      up('equipment', 'q1', { code: 'EQ-001', name: 'لودر', status: 'active', supervisorId: 's1', dailyCost: 1000 }),
      up('equipmentDaily', 'ed1', { equipmentId: 'q1', date: '2026-03-02', days: 1 }),
      W('a1', 'w1', { date: '2026-03-01', dayWage: 333.33, days: 1.5 }), W('a2', 'w1', { date: '2026-03-02', status: 'half', dayWage: 333.33 }),
      W('a3', 'w1', { date: '2026-03-03', status: 'late', dayWage: 333.33, deduction: 50 }), W('a4', 'w1', { date: '2026-03-04', status: 'absent', dayWage: 333.33 }),
      W('a5', 'w2', { date: '2026-03-01', dayWage: 250, days: 2 }), W('a6', 'w2', { date: '2026-04-02', dayWage: 250 }),
      up('workerAttendance', 'b1', { personType: 'supervisor', personId: 's1', supervisorId: 's1', workerId: '', date: '2026-03-01', status: 'present', days: 1, dayWage: 400 }),
      up('workerAttendance', 'c1', { personType: 'driver', personId: 'd1', driverId: 'd1', workerId: '', date: '2026-03-02', status: 'present', days: 1, dayWage: 280 }),
      PAY('p1', { personType: 'worker', personId: 'w1', workerId: 'w1', date: '2026-03-05', amount: 300, payCategory: 'دفع يوميات', payKind: 'daily' }),
      PAY('p2', { personType: 'worker', personId: 'w1', workerId: 'w1', type: 'penalty', date: '2026-03-06', amount: 40, payCategory: 'تأخير', payKind: 'penalty' }),
      PAY('p3', { personType: 'worker', personId: 'w2', workerId: 'w2', type: 'bonus', date: '2026-03-06', amount: 100, payCategory: 'مكافأة', payKind: 'bonus', status: 'accrued' }),
      PAY('p4', { personType: 'supervisor', personId: 's1', workerId: '', date: '2026-03-07', amount: 200, payKind: 'daily' }),
      PAY('p5', { personType: 'employee', personId: 'e1', workerId: '', date: '2026-03-10', amount: 2500, payKind: 'salary', salaryAmount: 2500 }),
      PAY('p6', { personType: 'driver', personId: 'd1', workerId: '', date: '2026-04-01', amount: 50, payKind: 'daily' }),
      up('workerPayments', 'p7', { workerId: 'w2', date: '2026-03-08', amount: 60, notes: 'سجل قديم من غير نوع' }),
      up('employeePenalties', 'k1', { employeeId: 'e1', date: '2026-03-11', amount: 150, reason: 'غياب', type: 'penalty' }),
      up('costs', 'cs1', { personKind: 'worker', personId: 'w1', date: '2026-03-03', amount: 75, item: 'مواصلات' }),
      up('expenses', 'ex1', { personKind: 'driver', personId: 'd1', date: '2026-03-02', amount: 30 }),
    ] })).status).toBe(200);
  });
  afterAll(async () => t?.close());

  it('balances = legacy numbers, and the new day pay (DEC-0129) beside them', async () => {
    const w1 = await row('tab=workers', 'w1');
    expect([w1.legacyBal, w1.bal, w1.days, w1.absent, w1.extras, w1.penalty, w1.paid]).toEqual([685, '684.99', 3, 1, 75, 40, 300]); // الجديد: 499.995 + 166.665 + 283.33 = 949.99 (القديم 950)
    expect((await row('tab=workers', 'w2')).legacyBal).toBe(790);
    expect((await row('tab=workers&from=2026-03-01&to=2026-03-31', 'w2')).legacyBal).toBe(540);
    expect([(await row('tab=drivers', 'd1')).legacyBal, (await row('tab=drivers&from=2026-03-01&to=2026-03-31', 'd1')).legacyBal]).toEqual([200, 250]);
    const e1 = await row('tab=employees', 'e1');
    expect([e1.legacyBal, e1.baseDue]).toEqual([3350, '6000']);
    const s1 = await row('tab=supervisors', 's1');
    expect([s1.legacyTotalDue, s1.legacyBal, s1.equipCost, s1.totalDue]).toEqual([3275, 2675, 1000, '3274.99']);
    const tb = await table('tab=workers');
    expect(tb.log.totals).toEqual({ count: 4, pay: 360, penalty: 40 });
    expect(tb.log.rows.map((r: { typeLabel: string; item: string; scope: string }) => [r.typeLabel, r.item, r.scope])).toEqual([['دفع مستحق', 'دفع مستحقات', '—'], ['خصم / جزاء', 'تأخير', 'للشخص فقط'], ['إضافة / مكافأة', 'مكافأة', 'للشخص فقط'], ['يومية', 'دفع يوميات', 'للشخص فقط']]);
    expect((await t.http().get(`${D}/boards`).set(bearer(admin)).expect(200)).body.kinds.map((x: { id: string; count: number }) => [x.id, x.count])).toEqual([['employees', 1], ['supervisors', 1], ['workers', 2], ['drivers', 1], ['equipment', 1]]);
  });

  it('pay over the balance needs an advance (DEC-0132); records like the legacy modal', async () => {
    const over = await post(`${D}/pay`, admin, { mode: 'pay', personType: 'worker', personId: 'w1', payKind: 'daily', date: '2026-03-20', lines: [{ item: 'دفع يوميات', amount: '5000' }] });
    expect([over.status, over.body.code]).toEqual([409, 'OVER_BALANCE']);
    const ok = await post(`${D}/pay`, admin, { mode: 'pay', personType: 'worker', personId: 'w1', payKind: 'daily', date: '2026-03-20', lines: [{ item: 'دفع يوميات', amount: '5000' }, { item: 'حافز يومي', amount: '50' }], advance: true }).expect(201);
    expect([ok.body.total, ok.body.advance, ok.body.ids.length]).toEqual([5050, true, 2]);
    expect((await row('tab=workers', 'w1')).legacyBal).toBe(685 - 5050);
    const small = await post(`${D}/pay`, admin, { mode: 'pay', personType: 'driver', personId: 'd1', payKind: 'daily', lines: [{ item: 'دفع يوميات', amount: '100' }] }).expect(201);
    expect(small.body.advance).toBe(false);
    // راتب الموظف: السقف ورسالة القديمة
    expect((await post(`${D}/pay`, admin, { mode: 'pay', personType: 'employee', personId: 'e1', payKind: 'salary', salary: '9000' })).body.message).toBe('لا يمكن دفع أكثر من الراتب المسجّل (٦٬٠٠٠ ج.م)');
    await post(`${D}/pay`, admin, { mode: 'pay', personType: 'employee', personId: 'e1', payKind: 'salary', salary: '1000' }).expect(201);
    // بدلات (مستحق) ← دفعها ← المكافأة اتعلّمت مدفوعة
    await post(`${D}/pay`, admin, { mode: 'extras', personType: 'worker', personId: 'w2', date: '2026-03-22', lines: [{ item: 'بدل إعاشة', amount: '120' }] }).expect(201);
    const opts = (await t.http().get(`${D}/pay-options?kind=worker&id=w2`).set(bearer(admin)).expect(200)).body;
    expect(opts.person.unpaidBonuses.map((b: { id: string }) => b.id)[0]).toBe('p3');
    expect(opts.pools.paymentItemPool).toContain('بدل إعاشة');
    await post(`${D}/pay`, admin, { mode: 'pay', personType: 'worker', personId: 'w2', payKind: 'extras', bonusIds: ['p3'], date: '2026-03-23' }).expect(201);
    expect((await t.http().get(`${D}/pay-options?kind=worker&id=w2`).set(bearer(admin))).body.person.unpaidBonuses.some((b: { id: string }) => b.id === 'p3')).toBe(false);
    // خصم الموظف في employeePenalties
    await post(`${D}/pay`, admin, { mode: 'penalty', personType: 'employee', personId: 'e1', lines: [{ item: 'تأخير', amount: '90' }] }).expect(201);
    expect((await table('tab=employees')).log.rows.filter((r: { src: string }) => r.src === 'empPen').length).toBe(2);
  });

  it('supervisor scopes: self, distribution over positive worker balances, close account', async () => {
    const before = (await table('tab=workers')).log.rows.length;
    const dist = await post(`${D}/pay`, admin, { mode: 'pay', personType: 'supervisor', personId: 's1', payKind: 'daily', scope: 'workers', lines: [{ item: 'دفع يوميات', amount: '500' }] }).expect(201);
    expect(dist.body.ids.length).toBe(1); // w1 متبقيه سالب (سلفة) ← الكل لـ w2
    const after = (await table('tab=workers')).log.rows;
    expect(after.length).toBe(before + 1);
    expect(after.find((r: { id: string }) => r.id === dist.body.ids[0])).toMatchObject({ name: 'بدر الشركة', amount: 500, scope: 'توزيع على العمال' });
    expect((await post(`${D}/pay`, admin, { mode: 'pay', personType: 'supervisor', personId: 's1', payKind: 'daily', scope: 'self', lines: [{ amount: '150' }] })).status).toBe(201);
    expect((await post(`${D}/pay`, admin, { mode: 'pay', personType: 'supervisor', personId: 's1', payKind: 'daily', scope: 'self', lines: [{ amount: '9999' }] })).body.code).toBe('OVER_BALANCE');
  });

  it('delete from the log, items, and permissions', async () => {
    const tb = await table('tab=workers');
    const p2 = tb.log.rows.find((r: { id: string }) => r.id === 'p2');
    await t.http().delete(`${D}/pay/p2?rev=${p2.rev}`).set(bearer(admin)).expect(200);
    const emp = (await table('tab=employees')).log.rows.find((r: { id: string }) => r.id === 'k1');
    await t.http().delete(`${D}/empPen/k1?rev=${emp.rev}`).set(bearer(admin)).expect(200);
    expect((await table('tab=workers')).log.rows.some((r: { id: string }) => r.id === 'p2')).toBe(false);
    await t.http().put(`${D}/items`).set(bearer(admin)).send({ pool: 'penaltyItemPool', add: ['تأخير متكرر'], remove: ['إهمال'] }).expect(200);
    const pools = (await t.http().get(`${D}/pay-options?kind=worker`).set(bearer(admin))).body.pools;
    expect([pools.penaltyItemPool.includes('تأخير متكرر'), pools.penaltyItemPool.includes('إهمال')]).toEqual([true, false]);
    const clerk = (await newUser(t, admin, 'dues_clerk', 'custom', { editData: true, pages: [{ page: 'workerAttendance', view: true, add: true, edit: true, delete: false }] })).token;
    expect((await t.http().get(`${D}/table?tab=workers`).set(bearer(clerk))).status).toBe(403);
    expect((await post(`${D}/pay`, clerk, { mode: 'penalty', personType: 'worker', personId: 'w1', lines: [{ amount: '1' }] })).status).toBe(403);
  });

  it('the same after the cutover to the tables', async () => {
    await cutoverModule(t.ds, WORKER_PAYMENTS, 'test', 'execute');
    const r = await post(`${D}/pay`, admin, { mode: 'penalty', personType: 'worker', personId: 'w2', lines: [{ item: 'غياب', amount: '80' }, { item: 'مخالفة', amount: '20' }] }).expect(201);
    expect(r.body.ids.length).toBe(2);
    expect(Number((await t.ds.query(`SELECT count(*) AS n FROM worker_payments WHERE type = 'penalty' AND person_id = 'w2'`))[0].n)).toBe(2);
    expect((await row('tab=workers', 'w2')).penalty).toBe(100);
  });
});
