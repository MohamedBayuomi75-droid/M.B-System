import { adminToken, bootstrap, createTestApp, newUser, sync, TestApp } from './app';
import { cutoverModule, reconcileModule, rollbackModule } from '../src/cutover/module-cutover';
import { EMPLOYEES } from '../src/cutover/parties-cutover';

/**
 * 8.3.3 — نقل الموظفين للجدول (بيانات اختبار). المعيار: الواجهة القديمة مش بتحس بفرق، والقديم بقيمه بالظبط:
 * موظف براتب ونوع توظيف وبريد ورصيد إجازة، وموظف مستقيل في الأرشيف، وموظف في إجازة (leaveAuto)، وقيم نوعها مختلف
 * (الراتب نص، والرصيد نص، والكود رقم)، وحقل مالوش عمود. **وحماية الراتب (B-48) فوق الجدول زي قبله.**
 */
describe('8.3.3 employees cutover', () => {
  let t: TestApp;
  let admin: string;
  let viewer: string;
  const up = (id: string, set: Record<string, unknown>, baseRev = 0) => ({ collection: 'employees', id, op: 'upsert', baseRev, set: { id, ...set } });
  const snap = async (tok = admin) => { const b = await bootstrap(t, tok); return { e: b.data.employees, rev: b.meta.revs.employees }; };
  let before: Awaited<ReturnType<typeof snap>>;
  let beforeViewer: Awaited<ReturnType<typeof snap>>;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    viewer = (await newUser(t, admin, 'emp_pm', 'projectManager', { projectScope: ['pA'] })).token;
    const r = await sync(t, admin, { changes: [
      up('e1', { code: 'EMP-001', name: 'أحمد', status: 'active', employmentType: 'full', email: 'a@x.com', salary: 0.1 + 0.2, leaveBalance: 21, position: 'محاسب',
        licenseGrade: 'ثالثة', licenseExpiry: '2020-01-01', licenseStatus: 'expired', departmentId: '__core_employees__', categoryId: '__core_employees__', projectId: 'pA',
        custom: { a: 1 }, extraFields: [{ label: 'م', value: 'x', meta: null }], attachments: [] }),
      up('e2', { code: 'EMP-002', name: 'مستقيل', status: 'resigned', resignedAt: '2026-03-15', archiveGroup: 'resigned', departmentId: '__resigned_employee__', previousDepartmentId: '__core_employees__', leaveAuto: false }),
      up('e3', { code: 'EMP-003', name: 'في إجازة', status: 'on_leave', leaveAuto: true, employmentType: 'part', leaveBalance: 0 }),
      up('ex', { code: 7, name: 'نصوص', salary: '300', leaveBalance: '21', whatever: [1] }),
    ] });
    expect(r.body.applied).toHaveLength(4);
    before = await snap();
    beforeViewer = await snap(viewer);
  });
  afterAll(async () => t?.close());

  it('dry-run leaves no trace; execute keeps the exact legacy view (and the salary guard) and counts untyped values', async () => {
    const rec0 = await reconcileModule(t.ds, EMPLOYEES);
    await cutoverModule(t.ds, EMPLOYEES, 'test', 'dry-run');
    expect(Number((await t.ds.query(`SELECT count(*) AS n FROM employees`))[0].n)).toBe(0);
    const r = await cutoverModule(t.ds, EMPLOYEES, 'test', 'execute');
    expect(r.collections.map((c) => [c.collection, c.migrated, c.untyped])).toEqual([['employees', 4, { code: 1, salary: 1, leaveBalance: 1 }]]);
    const after = await snap();
    expect(after).toEqual(before);
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
    const av = await snap(viewer);
    expect(av).toEqual(beforeViewer);
    expect(av.e.map((x: { id: string }) => x.id)).toEqual(['e1']); // نطاق المشروع
    expect(av.e[0]).not.toHaveProperty('salary'); // B-48
    expect((await reconcileModule(t.ds, EMPLOYEES)).collections.map((c) => [c.count, c.content, c.order])).toEqual(rec0.collections.map((c) => [c.count, c.content, c.order]));
    const rows = await t.ds.query(`SELECT id, salary::text AS s, leave_balance::text AS lb, leave_auto, employment_type, email, license_status, archive_group, project_id, custom, legacy_extra FROM employees ORDER BY id`);
    const by = (id: string) => rows.find((x: { id: string }) => x.id === id);
    expect(by('e1')).toMatchObject({ s: '0.30000000000000004', lb: '21', employment_type: 'full', email: 'a@x.com', license_status: 'expired', project_id: 'pA', custom: { a: 1 }, legacy_extra: {} });
    expect(by('e2')).toMatchObject({ archive_group: 'resigned', leave_auto: false });
    expect(by('e3')).toMatchObject({ leave_auto: true, lb: '0' });
    expect(by('ex').legacy_extra).toEqual({ code: 7, salary: '300', leaveBalance: '21', whatever: [1] });
    await expect(t.ds.query(`UPDATE records SET data = data WHERE collection = 'employees' AND id = 'e1'`)).rejects.toThrow(/frozen/);
  });

  it('the legacy UI keeps writing over the table; rollback brings everything back', async () => {
    const { rev } = await snap();
    const w = await sync(t, admin, { changes: [
      up('n1', { code: 'EMP-009', name: 'جديد', status: 'active', employmentType: 'full', leaveBalance: 21 }), up('e1', { phone: '0122' }, rev.e1),
      { collection: 'employees', id: 'ex', op: 'delete', baseRev: rev.ex },
    ] });
    expect(w.body.applied.map((a: { id: string; op: string }) => [a.id, a.op])).toEqual([['n1', 'insert'], ['e1', 'update'], ['ex', 'delete']]);
    const mid = await snap();
    expect(mid.e.find((x: { id: string }) => x.id === 'e1')).toMatchObject({ phone: '0122' });
    const res = await rollbackModule(t.ds, EMPLOYEES, 'test');
    expect(res.restored).toMatchObject({ employees: 5 }); // ومعاهم المحذوف (tombstone)
    expect(await snap()).toEqual(mid);
    expect(JSON.stringify(await snap())).toBe(JSON.stringify(mid));
    expect(Number((await t.ds.query(`SELECT count(*) AS n FROM employees`))[0].n)).toBe(0);
  });
});
