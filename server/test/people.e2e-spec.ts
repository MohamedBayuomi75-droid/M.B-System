import { adminToken, bearer, bootstrap, createTestApp, newUser, sync, TestApp } from './app';
import { cutoverModule } from '../src/cutover/module-cutover';
import { SUPERVISORS_DRIVERS } from '../src/cutover/parties-cutover';

/**
 * 8.2.4 — API المشرفين والسواقين (بيانات اختبار): الصلاحيات ونطاق المشروع، والإضافة (Idempotency + حدث *.saved)، وحماية الأجور (B-48)،
 * والاستقالة بتاريخها (أرشيف المستقيلين + قسم المستقيلين) في معاملة واحدة، والسواق الخارجي من غير دمج — ونفس السلوك بعد النقل للجداول.
 * المقارنة الحرفية بالقديم: tests-merge/phase76.js.
 */
describe('8.2.4 supervisors and drivers API', () => {
  let t: TestApp;
  let admin: string;
  let viewer: string;
  let pm: string;
  let k = 0;
  const post = (path: string, tok: string, body: Record<string, unknown>, key: string | null = `sd-test-key-${++k}`) => { const r = t.http().post(path).set(bearer(tok)); return (key ? r.set('Idempotency-Key', key) : r).send(body); };
  const up = (collection: string, id: string, set: Record<string, unknown>) => ({ collection, id, op: 'upsert', baseRev: 0, set: { id, ...set } });
  const S = '/api/v1/supervisors', D = '/api/v1/drivers';

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    viewer = (await newUser(t, admin, 'sd_v', 'viewer')).token;
    pm = (await newUser(t, admin, 'sd_pm2', 'projectManager', { projectScope: ['pA'] })).token;
    expect((await sync(t, admin, { changes: [
      up('supervisors', 's1', { code: 'SUP-001', name: 'سامي', status: 'active', dailyWage: 300, projectId: 'pA', project: 'أ', departmentId: '__core_supervisors__', categoryId: '__core_supervisors__' }),
      up('supervisors', 's2', { code: 'SUP-002', name: 'كريم', status: 'active', departmentId: '__core_supervisors__', categoryId: '__core_supervisors__' }),
      up('drivers', 'd1', { code: 'DRV-001', name: 'أحمد', status: 'active', salary: 5000, departmentId: '__core_drivers__', categoryId: '__core_drivers__', phone: '0100', address: 'القاهرة' }),
      up('drivers', 'd2', { code: 'DRV-002', name: 'خارجي', status: 'active', external: true, dailyWage: 200, departmentId: '__core_drivers_ext__', categoryId: '__core_drivers_ext__', phone: '0111', address: 'الجيزة' }),
    ] })).status).toBe(200);
  });
  afterAll(async () => t?.close());

  it('permissions and scope: viewer reads but cannot add; project manager sees only his project and no wages', async () => {
    expect((await t.http().get(S).set(bearer(viewer))).status).toBe(200);
    expect((await post(S, viewer, { name: 'x' })).status).toBe(403);
    expect((await post(D, viewer, { name: 'x' })).status).toBe(403);
    const l = await t.http().get(S).set(bearer(pm)).expect(200);
    expect(l.body.rows.map((s: { id: string }) => s.id)).toEqual(['s1']);
    expect(l.body.rows[0]).not.toHaveProperty('dailyWage');
    expect((await t.http().get(`${S}/s2`).set(bearer(pm))).status).toBe(404);
    expect((await t.http().get(D).set(bearer(pm))).body.rows).toEqual([]);
  });

  it('create: Idempotency-Key required; name required; legacy payload; event once; replay returns the same record', async () => {
    expect((await post(S, admin, { name: 'x' }, null)).status).toBe(400);
    expect((await post(S, admin, { name: ' ' })).body.code).toBe('VALIDATION');
    const a = await post(S, admin, { name: ' جديد ', dailyWage: '٢٧٥٫٥٥٥', position: 'مشرف', code: 'SUP-001', licenseExpiry: '2020-01-01', hireDate: '2026-01-01' }, 'sd-replay');
    expect(a.status).toBe(201);
    expect(a.body).toMatchObject({ code: 'SUP-003', name: 'جديد', status: 'active', dailyWage: 275.56, position: 'مشرف', skill: 'مشرف', licenseStatus: 'expired', departmentId: '__core_supervisors__' });
    expect(a.body.events.map((e: { type: string }) => e.type)).toEqual(['supervisor.saved']);
    expect((await post(S, admin, { name: ' جديد ', dailyWage: '٢٧٥٫٥٥٥', position: 'مشرف', code: 'SUP-001', licenseExpiry: '2020-01-01', hireDate: '2026-01-01' }, 'sd-replay')).body.id).toBe(a.body.id);
    const ext = await post(D, admin, { external: true, name: 'خارجي جديد', dailyWage: '180.555' });
    expect(ext.body).toMatchObject({ code: 'DRV-003', external: true, dailyWage: 180.56, position: 'سائق', departmentId: '__core_drivers_ext__' });
    expect(ext.body.events.map((e: { type: string }) => e.type)).toEqual(['driver.saved']);
  });

  it('over the tables: resign with the modal date → archive + resigned department; reactivate; external driver saved without merge', async () => {
    await cutoverModule(t.ds, SUPERVISORS_DRIVERS, 'test', 'execute');
    const sup = (await t.http().get(`${S}/s2`).set(bearer(admin))).body;
    const r = await t.http().patch(`${S}/s2`).set(bearer(admin)).send({ rev: sup.rev, name: sup.name, code: sup.code, status: 'resigned', resignedAt: '2026-03-15', hireDate: '2026-01-01' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: 'resigned', resignedAt: '2026-03-15', departmentId: '__resigned_supervisor__', archiveGroup: 'resigned', previousDepartmentId: '__core_supervisors__' });
    let d = (await bootstrap(t, admin)).data;
    expect(d.resignedArchive.filter((a: { personId: string; kind: string }) => a.personId === 's2' && a.kind === 'supervisor')).toHaveLength(1);
    expect(d.departments.find((x: { id: string }) => x.id === '__resigned_supervisor__')).toMatchObject({ name: 'المستقيلين', kind: 'supervisors', system: true });
    const back = await t.http().patch(`${S}/s2`).set(bearer(admin)).send({ rev: r.body.rev, name: sup.name, code: sup.code, status: 'active', hireDate: '2026-01-01' });
    expect(back.body).toMatchObject({ status: 'active', departmentId: '__core_supervisors__', archiveGroup: '', resignedAt: '' });
    d = (await bootstrap(t, admin)).data;
    expect(d.resignedArchive.filter((a: { personId: string }) => a.personId === 's2')).toHaveLength(0);
    // الخارجي: الخانة الفاضية بتمسح (من غير دمج)، وسواق الشركة: الدمج
    const x = (await t.http().get(`${D}/d2`).set(bearer(admin))).body;
    expect((await t.http().patch(`${D}/d2`).set(bearer(admin)).send({ rev: x.rev, name: x.name, code: x.code, status: 'active', position: 'سائق', dailyWage: '200', phone: '0111', address: '' })).body.address).toBe('');
    const c = (await t.http().get(`${D}/d1`).set(bearer(admin))).body;
    expect((await t.http().patch(`${D}/d1`).set(bearer(admin)).send({ rev: c.rev, name: c.name, code: c.code, status: 'active', phone: '', address: '', hireDate: '2026-01-01' })).body).toMatchObject({ phone: '0100', address: 'القاهرة' });
    expect((await t.ds.query(`SELECT address FROM drivers WHERE id = 'd2'`))[0].address).toBe('');
  });

  it('wage guard on writes and duplicates', async () => {
    const hrLess = (await newUser(t, admin, 'sd_cp', 'clientsProjects')).token;
    expect((await post(S, hrLess, { name: 'x', dailyWage: '100' })).status).toBe(403);
    const dup = await post(S, admin, { name: 'سامي' });
    expect([dup.status, dup.body.code]).toEqual([409, 'DUPLICATE_SOFT']);
    expect((await post(S, admin, { name: 'سامي', confirmDuplicates: true })).status).toBe(201);
  });
});
