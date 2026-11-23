import { adminToken, bearer, bootstrap, createTestApp, newUser, sync, TestApp } from './app';
import { cutoverModule } from '../src/cutover/module-cutover';
import { WORKERS } from '../src/cutover/parties-cutover';

/**
 * 8.1.4 — API العمال (بيانات اختبار): الصلاحيات ونطاق المشروع، والإضافة (Idempotency + حدث worker.saved)، وحماية الأجور (B-48)،
 * والاستقالة (أرشيف المستقيلين + قسم المستقيلين) في معاملة واحدة، ونفس السلوك بعد نقل العمال للجدول.
 * المقارنة الحرفية بالقديم: tests-merge/phase74.js.
 */
describe('8.1.4 workers API', () => {
  let t: TestApp;
  let admin: string;
  let viewer: string;
  let pm: string;
  const P = '/api/v1/workers';
  let k = 0;
  const post = (tok: string, body: Record<string, unknown>, key: string | null = `wk-test-key-${++k}`) => { const r = t.http().post(P).set(bearer(tok)); return (key ? r.set('Idempotency-Key', key) : r).send(body); };
  const up = (collection: string, id: string, set: Record<string, unknown>) => ({ collection, id, op: 'upsert', baseRev: 0, set: { id, ...set } });

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    viewer = (await newUser(t, admin, 'wk_v', 'viewer')).token;
    pm = (await newUser(t, admin, 'wk_pm2', 'projectManager', { projectScope: ['pA'] })).token;
    expect((await sync(t, admin, { changes: [
      up('workers', 'w1', { code: 'WRK-001', name: 'محمد', workerType: 'temporary', type: 'temporary', status: 'active', dailyWage: 300, projectId: 'pA', project: 'أ', departmentId: '__core_workers_temp__', categoryId: '__core_workers_temp__' }),
      up('workers', 'w2', { code: 'WRK-002', name: 'أحمد', workerType: 'company', type: 'company', status: 'active', salary: 6000, basicSalary: 6000, position: 'نجار', skill: 'نجار', departmentId: '__core_workers_perm__', categoryId: '__core_workers_perm__' }),
    ] })).status).toBe(200);
  });
  afterAll(async () => t?.close());

  it('permissions and scope: viewer reads but cannot add/edit; project manager sees only his project and no wages', async () => {
    expect((await t.http().get(P).set(bearer(viewer))).status).toBe(200);
    expect((await post(viewer, { workerType: 'temporary', name: 'x' })).status).toBe(403);
    const l = await t.http().get(P).set(bearer(pm)).expect(200);
    expect(l.body.rows.map((w: { id: string }) => w.id)).toEqual(['w1']);
    expect(l.body.rows[0]).not.toHaveProperty('dailyWage');
    expect(l.body.hiddenFields).toEqual(expect.arrayContaining(['dailyWage', 'salary']));
    expect((await t.http().get(`${P}/w2`).set(bearer(pm))).status).toBe(404);
  });

  it('create: Idempotency-Key required; name required; legacy payload; event once; replay returns the same worker', async () => {
    expect((await post(admin, { workerType: 'temporary', name: 'x' }, null)).status).toBe(400);
    expect((await post(admin, { workerType: 'temporary', name: ' ' })).body.code).toBe('VALIDATION');
    const a = await post(admin, { workerType: 'temporary', name: ' جديد ', dailyWage: '٢٧٥٫٥٥٥', position: 'مساعد', code: 'WRK-001' }, 'wk-replay');
    expect(a.status).toBe(201);
    expect(a.body).toMatchObject({ code: 'WRK-003', name: 'جديد', workerType: 'temporary', type: 'temporary', status: 'active', dailyWage: 275.56, insuranceStatus: 'none', skill: 'مساعد', position: 'مساعد', departmentId: '__core_workers_temp__' });
    expect(a.body.events.map((e: { type: string }) => e.type)).toEqual(['worker.saved']);
    const b = await post(admin, { workerType: 'temporary', name: ' جديد ', dailyWage: '٢٧٥٫٥٥٥', position: 'مساعد', code: 'WRK-001' }, 'wk-replay');
    expect([b.status, b.body.id]).toEqual([201, a.body.id]);
  });

  it('resign moves to the resigned department and archive (one transaction); reactivate restores — also over the table', async () => {
    const edit = async (id: string, over: Record<string, unknown>) => {
      const w = (await t.http().get(`${P}/${id}`).set(bearer(admin))).body;
      return t.http().patch(`${P}/${id}`).set(bearer(admin)).send({ rev: w.rev, workerType: 'company', name: w.name, code: w.code, status: w.status, position: w.position, salary: String(w.salary), hireDate: w.hireDate || '2026-01-01', ...over });
    };
    await cutoverModule(t.ds, WORKERS, 'test', 'execute');
    const r = await edit('w2', { status: 'resigned' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: 'resigned', departmentId: '__resigned_worker__', archiveGroup: 'resigned', previousDepartmentId: '__core_workers_perm__' });
    let d = (await bootstrap(t, admin)).data;
    expect(d.resignedArchive.filter((a: { personId: string }) => a.personId === 'w2')).toHaveLength(1);
    expect(d.departments.find((x: { id: string }) => x.id === '__resigned_worker__')).toMatchObject({ name: 'المستقيلين', kind: 'workers', system: true });
    const b = await edit('w2', { status: 'active' });
    expect(b.body).toMatchObject({ status: 'active', departmentId: '__core_workers_perm__', archiveGroup: '' });
    d = (await bootstrap(t, admin)).data;
    expect(d.resignedArchive.filter((a: { personId: string }) => a.personId === 'w2')).toHaveLength(0);
    expect((await t.ds.query(`SELECT status FROM workers WHERE id = 'w2'`))[0].status).toBe('active');
  });

  it('wage guard on writes: a user without payroll/dues pages cannot send wages', async () => {
    const hrLess = (await newUser(t, admin, 'wk_cp', 'clientsProjects')).token;
    expect((await post(hrLess, { workerType: 'temporary', name: 'x', dailyWage: '100' })).status).toBe(403);
  });
});
