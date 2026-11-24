import { adminToken, bearer, bootstrap, createTestApp, newUser, sync, TestApp } from './app';
import { cutoverModule } from '../src/cutover/module-cutover';
import { LEAVES } from '../src/cutover/parties-cutover';

/**
 * 8.4.4 — API الإجازات (بيانات اختبار): الصلاحيات، والطلب («قيد الانتظار» + Idempotency + حدث)، والموافقة والرفض (للمعلّق بس)،
 * والتعديل (الحالة بتفضل)، والحذف، و**حالة الأشخاص من غير الواجهة القديمة** (د-2: بعد التغيير، ومرة كل يوم مع أول قراية)، والرصيد (د-3)
 * — قبل النقل للجدول وبعده. المقارنة الحرفية بالقديم: tests-merge/phase80.js.
 */
describe('8.4.4 leaves API', () => {
  let t: TestApp;
  let admin: string;
  let viewer: string;
  let k = 0;
  const L = '/api/v1/leaves';
  const post = (path: string, tok: string, body: Record<string, unknown>) => t.http().post(path).set(bearer(tok)).set('Idempotency-Key', `lv-test-key-${++k}`).send(body);
  const up = (collection: string, id: string, set: Record<string, unknown>) => ({ collection, id, op: 'upsert', baseRev: 0, set: { id, ...set } });
  const status = async (coll: string, id: string) => { const p = (await bootstrap(t, admin)).data[coll].find((x: { id: string }) => x.id === id); return [p.status, p.leaveAuto ?? null]; };

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    viewer = (await newUser(t, admin, 'lv_v', 'viewer')).token;
    expect((await sync(t, admin, { changes: [
      up('employees', 'e1', { code: 'EMP-001', name: 'أحمد', status: 'active', leaveBalance: 30 }),
      up('workers', 'w1', { code: 'WRK-001', name: 'عامل', status: 'active', workerType: 'temporary' }),
      up('supervisors', 's1', { code: 'SUP-001', name: 'سامي', status: 'active' }),
      up('drivers', 'd1', { code: 'DRV-001', name: 'سواق', status: 'on_leave', leaveAuto: true }),
      // إجازة معتمدة سارية اتسجّلت من غير ما حد يفتح القديمة ← المزامنة اليومية
      up('leaves', 'l0', { personKind: 'supervisor', personId: 's1', employeeId: '', type: 'annual', from: '2020-01-01', to: '2099-01-01', days: 3, status: 'approved' }),
    ] })).status).toBe(200);
  });
  afterAll(async () => t?.close());

  it('daily sync on the first read: approved current leave → on leave, ended auto leave → active (no legacy page)', async () => {
    expect(await status('supervisors', 's1')).toEqual(['active', null]);
    await t.http().get('/api/v1/supervisors').set(bearer(admin)).expect(200);
    expect(await status('supervisors', 's1')).toEqual(['on_leave', true]);
    expect(await status('drivers', 'd1')).toEqual(['active', false]);
  });

  it('permissions: viewer reads but cannot request or approve', async () => {
    expect((await t.http().get(L).set(bearer(viewer))).status).toBe(200);
    expect((await post(L, viewer, { personKind: 'employee', personId: 'e1' })).status).toBe(403);
  });

  async function flow(tag: string) {
    // طلب ← قيد الانتظار، والأيام من التاريخين
    const r = await post(L, admin, { personKind: 'worker', personId: 'w1', type: 'sick', from: '2020-06-01', to: '2099-06-05', days: '', reason: ` ${tag} ` }).expect(201);
    expect(r.body).toMatchObject({ personKind: 'worker', personId: 'w1', employeeId: '', status: 'pending', reason: tag });
    expect(r.body.days).toBeGreaterThan(1);
    expect((await status('workers', 'w1'))[0]).toBe('active'); // المعلّق مابيغيّرش الحالة (leaveAuto ممكن يكون false من الجولة اللي فاتت)
    // الموافقة ← «في إجازة» فورًا
    const a = await post(`${L}/${r.body.id}/approve`, admin, { rev: r.body.rev }).expect(200);
    expect(a.body.status).toBe('approved');
    expect(await status('workers', 'w1')).toEqual(['on_leave', true]);
    // الموافقة تاني ← مش معلّق
    expect((await post(`${L}/${r.body.id}/approve`, admin, { rev: a.body.rev })).body.code).toBe('NOT_PENDING');
    // التعديل: الحالة بتفضل معتمدة، والتواريخ في الماضي ← الإجازة خلصت ← «نشط»
    const u = await t.http().patch(`${L}/${r.body.id}`).set(bearer(admin)).send({ rev: a.body.rev, personKind: 'worker', personId: 'w1', type: 'sick', from: '2020-06-01', to: '2020-06-05', days: '' }).expect(200);
    expect(u.body).toMatchObject({ status: 'approved', days: 5 });
    expect(await status('workers', 'w1')).toEqual(['active', false]);
    // رفض طلب تاني، وحذف
    const r2 = await post(L, admin, { personKind: 'employee', personId: 'e1', type: 'annual', from: '2026-01-05', to: '2026-01-09', days: '5' }).expect(201);
    expect(r2.body.employeeId).toBe('e1');
    const no = await post(`${L}/${r2.body.id}/reject`, admin, { rev: r2.body.rev }).expect(200);
    expect(no.body.status).toBe('rejected');
    await t.http().delete(`${L}/${r2.body.id}?rev=${no.body.rev}`).set(bearer(admin)).expect(200);
    expect((await t.http().get(`${L}/${r2.body.id}`).set(bearer(admin))).status).toBe(404);
    expect((await t.http().get(`${L}/${r.body.id}`).set(bearer(admin))).body.events.map((e: { type: string }) => e.type)).toEqual(['leave.requested', 'leave.approved', 'leave.updated']);
  }

  it('request, approve (status now), edit keeps the status, reject, delete — over legacy records', async () => { await flow('أ'); });

  it('balance (annual approved only, current year) and the same flow after the cutover', async () => {
    const y = new Date().getFullYear();
    await post(L, admin, { personKind: 'employee', personId: 'e1', type: 'annual', from: `${y}-02-01`, to: `${y}-02-04`, days: '' }).expect(201)
      .then((r) => post(`${L}/${r.body.id}/approve`, admin, { rev: r.body.rev }).expect(200));
    expect((await t.http().get(`${L}/balances?ids=e1`).set(bearer(admin))).body.balances).toEqual({ e1: 26 });
    await cutoverModule(t.ds, LEAVES, 'test', 'execute');
    await flow('ب');
    expect((await t.http().get(L).set(bearer(admin))).body.source).toBe('relational');
  });
});
