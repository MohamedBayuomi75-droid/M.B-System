import { adminToken, bearer, bootstrap, createTestApp, newUser, sync, TestApp } from './app';
import { cutoverModule, reconcileModule, rollbackModule } from '../src/cutover/module-cutover';
import { WORKERS } from '../src/cutover/parties-cutover';

/**
 * 8.1.3 — نقل العمال للجدول (بيانات اختبار). المعيار: الواجهة القديمة مش بتحس بفرق، والقديم بقيمه بالظبط:
 * مؤقت وشركة، وأجر بخانات كتير، ومستقيل في قسم المستقيلين، وخانات إضافية بـ null جواها، و custom كائن، وقيم نوعها مختلف
 * (الأجر نص، والكود رقم)، وحقل منطقي (leaveAuto) مالوش عمود. **وحماية الأجور (B-48) فوق الجدول زي قبله.**
 */
describe('8.1.3 workers cutover', () => {
  let t: TestApp;
  let admin: string;
  let viewer: string;
  const up = (id: string, set: Record<string, unknown>, baseRev = 0) => ({ collection: 'workers', id, op: 'upsert', baseRev, set: { id, ...set } });
  const snap = async (tok = admin) => { const b = await bootstrap(t, tok); return { w: b.data.workers, revs: b.meta.revs.workers }; };
  let before: Awaited<ReturnType<typeof snap>>;
  let beforeViewer: Awaited<ReturnType<typeof snap>>;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    viewer = (await newUser(t, admin, 'wk_pm', 'projectManager', { projectScope: ['pA'] })).token; // بيشوف العمال (نطاق مشروعه) من غير الرواتب والمستحقات
    const r = await sync(t, admin, { changes: [
      up('w1', { code: 'WRK-001', name: 'محمد علي', workerType: 'temporary', type: 'temporary', status: 'active', dailyWage: 0.1 + 0.2, supervisorId: 'sv1', project: 'مشروع أ', projectId: 'pA',
        departmentId: '__core_workers_temp__', categoryId: '__core_workers_temp__', nationalId: '29001011234567', phone: '0100', insuranceStatus: 'none', attachments: [], projectSince: '2026-01-01' }),
      up('w2', { code: 'WRK-002', name: 'أحمد', workerType: 'company', type: 'company', status: 'resigned', salary: 6000, basicSalary: 6000, dailyWage: 0, position: 'نجار', skill: 'نجار',
        departmentId: '__resigned_worker__', categoryId: '__resigned_worker__', archiveGroup: 'resigned', resignedAt: '2026-02-01', previousDepartmentId: '__core_workers_perm__',
        idCardExpiry: '2020-01-01', idCardStatus: 'expired', custom: { a: 1 }, extraFields: [{ label: 'م', value: 'x', meta: null }], dismissedNotes: ['بدون مشرف'], leaveAuto: false }),
      up('x1', { code: 7, name: 'نصوص', dailyWage: '300', salary: null, extraFields: {} }),
    ] });
    expect(r.body.applied).toHaveLength(3);
    before = await snap();
    beforeViewer = await snap(viewer);
  });
  afterAll(async () => t?.close());

  it('dry-run leaves no trace; execute keeps the exact legacy view (and the wage guard) and counts untyped values', async () => {
    const rec0 = await reconcileModule(t.ds, WORKERS);
    await cutoverModule(t.ds, WORKERS, 'test', 'dry-run');
    expect(Number((await t.ds.query(`SELECT count(*)::int AS n FROM workers`))[0].n)).toBe(0);
    const r = await cutoverModule(t.ds, WORKERS, 'test', 'execute');
    expect(r.collections[0]).toMatchObject({ collection: 'workers', migrated: 3, untyped: { code: 1, dailyWage: 1, salary: 1 } });
    const after = await snap();
    expect(after).toEqual(before);
    expect(JSON.stringify(after.w)).toBe(JSON.stringify(before.w));
    const av = await snap(viewer);
    expect(av).toEqual(beforeViewer);
    expect(av.w.map((w: { id: string }) => w.id)).toEqual(['w1']);
    expect(av.w[0]).not.toHaveProperty('dailyWage'); // B-48: من غير صفحة الرواتب أو المستحقات
    expect((await reconcileModule(t.ds, WORKERS)).collections.map((c) => [c.count, c.content, c.order])).toEqual(rec0.collections.map((c) => [c.count, c.content, c.order]));
    const rows = await t.ds.query(`SELECT id, daily_wage::text AS w, department_id, archive_group, project_id, custom, legacy_extra FROM workers ORDER BY id`);
    const by = (id: string) => rows.find((x: { id: string }) => x.id === id);
    expect(by('w1')).toMatchObject({ w: '0.30000000000000004', department_id: '__core_workers_temp__', project_id: 'pA' });
    expect(by('w2')).toMatchObject({ archive_group: 'resigned', custom: { a: 1 }, legacy_extra: { leaveAuto: false } });
    expect(by('x1').legacy_extra).toEqual({ code: 7, dailyWage: '300', salary: null }); // والخانات الإضافية كائن ← عمودها (jsonb)
    await expect(t.ds.query(`UPDATE records SET data = data WHERE collection = 'workers' AND id = 'w1'`)).rejects.toThrow(/frozen/);
  });

  it('the legacy UI keeps writing over the table (wage writes still guarded); rollback brings everything back', async () => {
    const revs = (await snap()).revs;
    const w = await sync(t, admin, { changes: [up('n1', { code: 'WRK-009', name: 'جديد', workerType: 'temporary', status: 'active', dailyWage: 250 }), up('w1', { phone: '0122' }, revs.w1), { collection: 'workers', id: 'x1', op: 'delete', baseRev: revs.x1 }] });
    expect(w.body.applied.map((a: { id: string; op: string }) => [a.id, a.op])).toEqual([['n1', 'insert'], ['w1', 'update'], ['x1', 'delete']]);
    const hr = (await newUser(t, admin, 'wk_hr', 'hr')).token;
    const ok = await sync(t, hr, { changes: [up('w1', { dailyWage: 310 }, revs.w1 + 1)] });
    expect(ok.status).toBe(200);
    const mid = await snap();
    expect(mid.w.find((x: { id: string }) => x.id === 'w1')).toMatchObject({ phone: '0122', dailyWage: 310 });
    const res = await rollbackModule(t.ds, WORKERS, 'test');
    expect(res.restored.workers).toBe(4); // ومعاهم السجل المحذوف (x1) بعلامة الحذف
    expect(await snap()).toEqual(mid);
    expect(JSON.stringify((await snap()).w)).toBe(JSON.stringify(mid.w));
    expect(Number((await t.ds.query(`SELECT count(*)::int AS n FROM workers`))[0].n)).toBe(0);
    expect(bearer).toBeDefined();
  });
});
