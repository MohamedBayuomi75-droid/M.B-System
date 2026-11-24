import { adminToken, bearer, createTestApp, newUser, sync, TestApp } from './app';
import { cutoverModule } from '../src/cutover/module-cutover';
import { ATTENDANCE } from '../src/cutover/parties-cutover';

/**
 * 8.5.4 — API اليوميات وحضور الموظفين (بيانات اختبار): **الحساب الجديد بأمثلة مستند القرار** (DEC-0129/0130: 333.33 × 1.5 = 499.995،
 * و300 بخصم 400 = 0، ونصف يوم بأجر 300 = 150)، وقايمة المراجعة وقرارها (DEC-0133)، وتقرير الفرق (د-2)، وحماية الأجور (DEC-0134)،
 * والحفظ (doSaveWatt) — قبل النقل للجداول وبعده. المقارنة الحرفية بالقديمة: tests-merge/phase82.js.
 */
describe('8.5.4 dailies and attendance API', () => {
  let t: TestApp;
  let admin: string;
  let k = 0;
  const D = '/api/v1/dailies', A = '/api/v1/attendance';
  const post = (path: string, tok: string, body: Record<string, unknown>) => t.http().post(path).set(bearer(tok)).set('Idempotency-Key', `dl-test-key-${++k}`).send(body);
  const up = (collection: string, id: string, set: Record<string, unknown>) => ({ collection, id, op: 'upsert', baseRev: 0, set: { id, ...set } });
  const W = (id: string, pid: string, set: Record<string, unknown>) => up('workerAttendance', id, { personType: 'worker', personKind: 'worker', personId: pid, workerId: pid, status: 'present', days: 1, deduction: 0, project: 'برج النيل', ...set });
  const net = async (id: string, tok = admin) => (await t.http().get(`${D}/${id}`).set(bearer(tok))).body;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    expect((await sync(t, admin, { changes: [
      up('projects', 'pB', { code: 'PRJ-002', name: 'برج النيل', status: 'active' }),
      up('workers', 'w1', { code: 'WRK-001', name: 'عامل', status: 'active', dailyWage: 333.33, supervisorId: 's1' }),
      up('workers', 'w2', { code: 'WRK-002', name: 'تاني', status: 'active', dailyWage: 300 }),
      up('supervisors', 's1', { code: 'SUP-001', name: 'مشرف', status: 'active', dailyWage: 400 }),
      up('employees', 'e1', { code: 'EMP-001', name: 'موظف', status: 'active', departmentId: 'dX' }),
      W('a1', 'w1', { date: '2026-03-01', dayWage: 333.33, days: 1.5 }),
      W('a2', 'w2', { date: '2026-03-01', dayWage: 300, status: 'late', deduction: 400 }),
      W('a3', 'w2', { date: '2026-03-02', dayWage: 300, status: 'half' }),
      W('a4', 'w2', { date: '2026-03-03', dayWage: 250, status: 'overtime' }), // حالة مش معروفة ← مراجعة
      W('a5', 'w2', { date: '2026-03-02', dayWage: 300, status: 'half' }), // مكررة (نفس الشخص واليوم والمشروع)
      W('a6', 'w9', { date: '2026-03-04', dayWage: 100 }), // صاحبها مش موجود
    ] })).status).toBe(200);
  });
  afterAll(async () => t?.close());

  it('new pay (DEC-0129/0130) with the decision document examples, and the legacy value beside it', async () => {
    const [a1, a2, a3] = [await net('a1'), await net('a2'), await net('a3')];
    expect([a1.net, a1.legacyNet]).toEqual(['499.995', 500]);
    expect([a2.net, a2.legacyNet]).toEqual(['0', 0]);
    expect([a3.net, a3.legacyNet]).toEqual(['150', 150]);
    const a4 = await net('a4');
    expect([a4.net, a4.pending, a4.legacyNet, a4.flags]).toEqual(['0', true, 250, ['unknownStatus']]);
    expect((await net('a5')).flags).toEqual(['duplicate']);
    expect((await net('a6')).flags).toEqual(['orphan']);
  });

  it('review list and decisions (dues edit only; void needs a reason), and the difference report', async () => {
    const r = await t.http().get(`${D}/review`).set(bearer(admin)).expect(200);
    expect(r.body.rows.map((x: { id: string }) => x.id).sort()).toEqual(['a4', 'a5', 'a6']);
    const pm = (await newUser(t, admin, 'dl_pm', 'projectManager', { projectScope: ['pB'] })).token;
    expect((await post(`${D}/a4/review`, pm, { rev: 1, decision: 'count' })).status).toBe(403);
    expect((await post(`${D}/a5/review`, admin, { rev: 1, decision: 'void' })).body.code).toBe('VALIDATION');
    await post(`${D}/a5/review`, admin, { rev: 1, decision: 'void', reason: 'مكررة' }).expect(200);
    const c = await post(`${D}/a4/review`, admin, { rev: 1, decision: 'count' }).expect(200);
    expect([c.body.net, c.body.pending, c.body.reviewDecision]).toEqual(['250', false, 'count']);
    expect((await post(`${D}/a1/review`, admin, { rev: 1, decision: 'count' })).body.code).toBe('NOT_FLAGGED');
    const d = (await t.http().get(`${D}/diff?from=2026-03-01&to=2026-03-31`).set(bearer(admin)).expect(200)).body;
    // a1 تقريب (500 ← 499.995)، وa5 ملغية (150 ← 0)، وa6 مستنية (100 ← 0)
    expect([d.records, d.changed, d.byReason]).toEqual([6, 3, { rounding: 2, review: 1 }]);
    expect([d.legacyTotal, d.newTotal, d.difference]).toEqual(['1150', '899.995', '-250.005']); // القديم: 500+0+150+250+150+100
  });

  it('wage guard (DEC-0134): no wage, deduction or pay without payroll/dues; writing them is refused', async () => {
    const clerk = (await newUser(t, admin, 'dl_clerk', 'custom', { editData: true, pages: [{ page: 'workerAttendance', view: true, add: true, edit: true, delete: false }] })).token;
    const g = (await t.http().get(`${D}/grid?tab=workers&from=2026-03-01&to=2026-03-07`).set(bearer(clerk)).expect(200)).body;
    expect([g.wages, g.cards.pay]).toEqual([false, null]);
    const one = await net('a1', clerk);
    expect(['dayWage', 'deduction', 'net', 'wage', 'legacyNet'].some((x) => x in one)).toBe(false);
    expect((await post(D, clerk, { personType: 'worker', personId: 'w1', date: '2026-03-09', project: 'برج النيل', dayWage: '1' })).body.code).toBe('FIELD_FORBIDDEN');
    const ok = await post(D, clerk, { personType: 'worker', personId: 'w1', date: '2026-03-09', project: 'برج النيل', days: '1' }).expect(201);
    expect((await net(ok.body.id)).dayWage).toBe(333.33); // الأجر من الشخص زي fillWage
    expect((await t.http().get(`${D}/diff`).set(bearer(clerk))).status).toBe(403);
  });

  async function crud(tag: string) {
    const r = await post(D, admin, { personType: 'worker', personId: 'w1', date: `2026-04-0${tag}`, status: 'late', days: '1', dayWage: '333.33', deduction: '30', project: ' برج النيل ', site: ' س ', notes: ' ن ' }).expect(201);
    expect(r.body).toMatchObject({ personType: 'worker', workerId: 'w1', supervisorId: 's1', status: 'late', days: 1, dayWage: 333.33, deduction: 30, project: 'برج النيل', projectId: 'pB', site: 'س', notes: 'ن', net: '303.33' });
    // نفس ترتيب التحقق في القديمة: الأيام قبل المشروع
    expect((await post(D, admin, { personType: 'worker', personId: 'w1', date: '2026-04-09', project: '' })).body.message).toBe('أدخل عدد الأيام (مثال 1 أو 2 أو 0.5)');
    expect((await post(D, admin, { personType: 'worker', personId: 'w1', date: '2026-04-09', days: '1', project: '' })).body.message).toBe('اختر المشروع');
    const u = await t.http().patch(`${D}/${r.body.id}`).set(bearer(admin)).send({ rev: r.body.rev, personType: 'worker', personId: 'w1', date: r.body.date, status: 'absent', days: '1', dayWage: '333.33', project: 'برج النيل' }).expect(200);
    expect([u.body.days, u.body.deduction, u.body.net]).toEqual([0, 0, '0']);
    await t.http().delete(`${D}/${r.body.id}?rev=${u.body.rev}`).set(bearer(admin)).expect(200);
    const e = await post(A, admin, { employeeId: 'e1', date: `2026-04-0${tag}`, status: 'half', checkIn: '10:00', notes: ' نص ' }).expect(201);
    expect(e.body).toMatchObject({ employeeId: 'e1', status: 'half', checkIn: '10:00', checkOut: '', notes: 'نص' });
    const l = (await t.http().get(`${A}?departmentId=dX`).set(bearer(admin)).expect(200)).body;
    expect([l.rows.length, l.cards.half]).toEqual([1, 1]);
    await t.http().delete(`${A}/${e.body.id}?rev=${e.body.rev}`).set(bearer(admin)).expect(200);
  }
  it('record, edit, delete (dailies and employee attendance) — over legacy records', async () => { await crud('1'); });
  it('the same after the cutover to the tables', async () => {
    await cutoverModule(t.ds, ATTENDANCE, 'test', 'execute');
    await crud('2');
    expect((await t.http().get(`${D}/grid?tab=workers&from=2026-03-01&to=2026-03-07`).set(bearer(admin))).body.source).toBe('relational');
  });
});
