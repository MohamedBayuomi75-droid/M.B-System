import { adminToken, bootstrap, createTestApp, newUser, sync, TestApp } from './app';
import { cutoverModule, reconcileModule, rollbackModule } from '../src/cutover/module-cutover';
import { SUPERVISORS_DRIVERS } from '../src/cutover/parties-cutover';

/**
 * 8.2.3 — نقل المشرفين والسواقين للجداول (بيانات اختبار). المعيار: الواجهة القديمة مش بتحس بفرق، والقديم بقيمه بالظبط:
 * مشرف بيومية بخانات كتير ورخصة، ومشرف مستقيل في الأرشيف، وسواق شركة براتب ودرجة رخصة، وسواق خارجي (external منطقي)،
 * وقيم نوعها مختلف (اليومية نص، والكود رقم، وexternal نص)، وحقل مالوش عمود. **وحماية الأجور (B-48) فوق الجداول زي قبلها.**
 */
describe('8.2.3 supervisors and drivers cutover', () => {
  let t: TestApp;
  let admin: string;
  let viewer: string;
  const up = (collection: string, id: string, set: Record<string, unknown>, baseRev = 0) => ({ collection, id, op: 'upsert', baseRev, set: { id, ...set } });
  const snap = async (tok = admin) => { const b = await bootstrap(t, tok); return { s: b.data.supervisors, d: b.data.drivers, revs: [b.meta.revs.supervisors, b.meta.revs.drivers] }; };
  let before: Awaited<ReturnType<typeof snap>>;
  let beforeViewer: Awaited<ReturnType<typeof snap>>;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    viewer = (await newUser(t, admin, 'sd_pm', 'projectManager', { projectScope: ['pA'] })).token;
    const r = await sync(t, admin, { changes: [
      up('supervisors', 's1', { code: 'SUP-001', name: 'سامي', status: 'active', dailyWage: 0.1 + 0.2, position: 'مشرف', skill: 'مشرف', licenseExpiry: '2020-01-01', licenseStatus: 'expired',
        departmentId: '__core_supervisors__', categoryId: '__core_supervisors__', project: 'مشروع أ', projectId: 'pA', custom: { a: 1 }, extraFields: [{ label: 'م', value: 'x', meta: null }] }),
      up('supervisors', 's2', { code: 'SUP-002', name: 'مستقيل', status: 'resigned', resignedAt: '2026-03-15', archiveGroup: 'resigned', departmentId: '__resigned_supervisor__', previousDepartmentId: '__core_supervisors__', leaveAuto: false }),
      up('supervisors', 'sx', { code: 7, name: 'نصوص', dailyWage: '300' }),
      up('drivers', 'd1', { code: 'DRV-001', name: 'سواق', status: 'active', salary: 5000.5, licenseGrade: 'درجة أولى', position: 'سائق', departmentId: '__core_drivers__', categoryId: '__core_drivers__', projectId: 'pA', attachments: [] }),
      up('drivers', 'd2', { code: 'DRV-002', name: 'خارجي', status: 'active', external: true, dailyWage: 180.56, departmentId: '__core_drivers_ext__' }),
      up('drivers', 'dx', { code: 'DRV-003', name: 'نصوص', external: 'نعم', salary: null }),
    ] });
    expect(r.body.applied).toHaveLength(6);
    before = await snap();
    beforeViewer = await snap(viewer);
  });
  afterAll(async () => t?.close());

  it('dry-run leaves no trace; execute keeps the exact legacy view (and the wage guard) and counts untyped values', async () => {
    const rec0 = await reconcileModule(t.ds, SUPERVISORS_DRIVERS);
    await cutoverModule(t.ds, SUPERVISORS_DRIVERS, 'test', 'dry-run');
    expect(Number((await t.ds.query(`SELECT (SELECT count(*) FROM supervisors) + (SELECT count(*) FROM drivers) AS n`))[0].n)).toBe(0);
    const r = await cutoverModule(t.ds, SUPERVISORS_DRIVERS, 'test', 'execute');
    expect(r.collections.map((c) => [c.collection, c.migrated, c.untyped])).toEqual([['supervisors', 3, { code: 1, dailyWage: 1 }], ['drivers', 3, { external: 1, salary: 1 }]]);
    const after = await snap();
    expect(after).toEqual(before);
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
    const av = await snap(viewer);
    expect(av).toEqual(beforeViewer);
    expect(av.s.map((x: { id: string }) => x.id)).toEqual(['s1']); // نطاق المشروع
    expect(av.s[0]).not.toHaveProperty('dailyWage'); // B-48
    expect(av.d.map((x: { id: string }) => x.id)).toEqual(['d1']);
    expect(av.d[0]).not.toHaveProperty('salary');
    expect((await reconcileModule(t.ds, SUPERVISORS_DRIVERS)).collections.map((c) => [c.count, c.content, c.order])).toEqual(rec0.collections.map((c) => [c.count, c.content, c.order]));
    const s = await t.ds.query(`SELECT id, daily_wage::text AS w, license_status, archive_group, project_id, custom, legacy_extra FROM supervisors ORDER BY id`);
    expect(s.find((x: { id: string }) => x.id === 's1')).toMatchObject({ w: '0.30000000000000004', license_status: 'expired', project_id: 'pA', custom: { a: 1 } });
    expect(s.find((x: { id: string }) => x.id === 's2')).toMatchObject({ archive_group: 'resigned', legacy_extra: { leaveAuto: false } });
    expect(s.find((x: { id: string }) => x.id === 'sx').legacy_extra).toEqual({ code: 7, dailyWage: '300' });
    const d = await t.ds.query(`SELECT id, salary::text AS s, external, license_grade, legacy_extra FROM drivers ORDER BY id`);
    expect(d.find((x: { id: string }) => x.id === 'd1')).toMatchObject({ s: '5000.5', external: null, license_grade: 'درجة أولى' });
    expect(d.find((x: { id: string }) => x.id === 'd2')).toMatchObject({ external: true });
    expect(d.find((x: { id: string }) => x.id === 'dx').legacy_extra).toEqual({ external: 'نعم', salary: null });
    await expect(t.ds.query(`UPDATE records SET data = data WHERE collection = 'drivers' AND id = 'd1'`)).rejects.toThrow(/frozen/);
  });

  it('the legacy UI keeps writing over the tables; rollback brings everything back', async () => {
    const [sr, dr] = (await snap()).revs;
    const w = await sync(t, admin, { changes: [
      up('supervisors', 'n1', { code: 'SUP-009', name: 'جديد', status: 'active', dailyWage: 250 }), up('supervisors', 's1', { phone: '0122' }, sr.s1),
      up('drivers', 'd2', { address: '' , external: true, name: 'خارجي', code: 'DRV-002', status: 'active' }, dr.d2), { collection: 'drivers', id: 'dx', op: 'delete', baseRev: dr.dx },
    ] });
    expect(w.body.applied.map((a: { id: string; op: string }) => [a.id, a.op])).toEqual([['n1', 'insert'], ['s1', 'update'], ['d2', 'update'], ['dx', 'delete']]);
    const mid = await snap();
    expect(mid.s.find((x: { id: string }) => x.id === 's1')).toMatchObject({ phone: '0122' });
    const res = await rollbackModule(t.ds, SUPERVISORS_DRIVERS, 'test');
    expect(res.restored).toMatchObject({ supervisors: 4, drivers: 3 });
    expect(await snap()).toEqual(mid);
    expect(JSON.stringify(await snap())).toBe(JSON.stringify(mid));
    expect(Number((await t.ds.query(`SELECT (SELECT count(*) FROM supervisors) + (SELECT count(*) FROM drivers) AS n`))[0].n)).toBe(0);
  });
});
