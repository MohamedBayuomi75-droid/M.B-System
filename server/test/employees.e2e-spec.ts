import { adminToken, bearer, bootstrap, createTestApp, newUser, sync, TestApp } from './app';
import { cutoverModule } from '../src/cutover/module-cutover';
import { EMPLOYEES } from '../src/cutover/parties-cutover';

/**
 * 8.3.4 — API الموظفين (بيانات اختبار): الصلاحيات، والإضافة **من غير قسم** (Idempotency + حدث employee.saved)، وحماية الراتب (B-48)،
 * والاستقالة (النهارده — مفيش خانة تاريخ) بأرشيف المستقيلين وقسمهم في معاملة واحدة، وقسم المستقيلين الخاص — ونفس السلوك بعد النقل للجدول.
 * المقارنة الحرفية بالقديم: tests-merge/phase78.js.
 */
describe('8.3.4 employees API', () => {
  let t: TestApp;
  let admin: string;
  let viewer: string;
  let k = 0;
  const E = '/api/v1/employees';
  const post = (tok: string, body: Record<string, unknown>, key: string | null = `emp-test-key-${++k}`) => { const r = t.http().post(E).set(bearer(tok)); return (key ? r.set('Idempotency-Key', key) : r).send(body); };
  const up = (id: string, set: Record<string, unknown>) => ({ collection: 'employees', id, op: 'upsert', baseRev: 0, set: { id, ...set } });

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    viewer = (await newUser(t, admin, 'emp_v', 'viewer')).token;
    expect((await sync(t, admin, { changes: [
      up('e1', { code: 'EMP-001', name: 'أحمد', status: 'active', employmentType: 'full', salary: 8000, leaveBalance: 21, departmentId: '__core_employees__', categoryId: '__core_employees__', phone: '0100', address: 'القاهرة' }),
      up('e2', { code: 'EMP-002', name: 'مستقيل', status: 'resigned', resignedAt: '2025-06-01', hireDate: '2020-06-01', departmentId: '__resigned_employee__', categoryId: '__resigned_employee__', previousDepartmentId: '__core_employees__', archiveGroup: 'resigned' }),
    ] })).status).toBe(200);
  });
  afterAll(async () => t?.close());

  it('permissions: viewer reads but cannot add; a user without payroll sees no salary and cannot write it', async () => {
    expect((await t.http().get(E).set(bearer(viewer))).status).toBe(200);
    expect((await post(viewer, { name: 'x' })).status).toBe(403);
    const hr = (await newUser(t, admin, 'emp_clerk', 'custom', { editData: true, pages: [{ page: 'employees', view: true, add: true, edit: true, delete: false }] })).token;
    const l = await t.http().get(E).set(bearer(hr)).expect(200);
    expect(l.body.hiddenFields).toContain('salary');
    expect(l.body.rows.some((e: Record<string, unknown>) => 'salary' in e)).toBe(false);
    expect(l.body.cards.some((c: { label: string }) => /إجمالي/.test(c.label))).toBe(false);
    expect((await post(hr, { name: 'x', salary: '100' })).body.code).toBe('FIELD_FORBIDDEN');
  });

  it('resigned section: own cards, filters and mode', async () => {
    const r = await t.http().get(`${E}?departmentId=__resigned_employee__`).set(bearer(admin)).expect(200);
    expect(r.body.mode).toBe('resigned');
    expect(r.body.cards.map((c: { label: string }) => c.label)).toEqual(['عدد المستقيلين', 'استقالوا هذا العام', 'متوسط مدة الخدمة', 'بدون تاريخ استقالة']);
    expect(r.body.cards[2].value).toBe('5 سنة');
    expect(r.body.options.resignYears).toEqual(['2025']);
    expect(r.body.rows.map((e: { id: string; previousDepartmentName: string }) => [e.id, e.previousDepartmentName])).toEqual([['e2', '—']]);
  });

  async function addResignReactivate(tag: string) {
    const r = await post(admin, { name: `موظف ${tag}`, email: ' n@x.com ', leaveBalance: '15', salary: '6500.555', position: 'مشتريات' }).expect(201);
    expect(r.body).toMatchObject({ code: expect.stringMatching(/^EMP-/), employmentType: 'full', status: 'active', email: 'n@x.com', leaveBalance: 15, salary: 6500.56, position: 'مشتريات' });
    expect(r.body).not.toHaveProperty('departmentId'); // personDeptOnSave مش بيتنادى — القسم عند التحميل الجاي (assignCoreDepartments)
    expect(r.body.events.map((e: { type: string }) => e.type)).toEqual(['employee.saved']);
    const today = (await t.http().get(`${E}/form-options`).set(bearer(admin))).body.today;
    const res = await t.http().patch(`${E}/${r.body.id}`).set(bearer(admin)).send({ rev: r.body.rev, name: r.body.name, code: r.body.code, status: 'resigned', resignedAt: '2020-01-01' }).expect(200);
    expect(res.body).toMatchObject({ status: 'resigned', resignedAt: today, departmentId: '__resigned_employee__', archiveGroup: 'resigned' }); // مفيش خانة تاريخ ← النهارده
    const d = (await bootstrap(t, admin)).data;
    expect(d.resignedArchive.filter((a: { personId: string }) => a.personId === r.body.id).map((a: { kind: string }) => a.kind)).toEqual(['employee']);
    expect(d.departments.find((x: { id: string }) => x.id === '__resigned_employee__')).toMatchObject({ name: 'المستقيلين', kind: 'employees' });
    const back = await t.http().patch(`${E}/${r.body.id}`).set(bearer(admin)).send({ rev: res.body.rev, name: r.body.name, code: r.body.code, status: 'active' }).expect(200);
    expect(back.body).toMatchObject({ status: 'active', archiveGroup: '', resignedAt: '' });
  }

  it('add (no department), resign today, reactivate — over legacy records', async () => { await addResignReactivate('أ'); });

  it('same behaviour after the cutover to the employees table; merge keeps values', async () => {
    await cutoverModule(t.ds, EMPLOYEES, 'test', 'execute');
    expect((await t.http().get(E).set(bearer(admin))).body.source).toBe('relational');
    await addResignReactivate('ب');
    const e1 = (await t.http().get(`${E}/e1`).set(bearer(admin))).body;
    const m = await t.http().patch(`${E}/e1`).set(bearer(admin)).send({ rev: e1.rev, name: e1.name, code: e1.code, status: 'active', phone: '', address: '', leaveBalance: '10' }).expect(200);
    expect(m.body).toMatchObject({ phone: '0100', address: 'القاهرة', leaveBalance: 10 });
    expect((await t.ds.query(`SELECT leave_balance::text AS lb FROM employees WHERE id = 'e1'`))[0].lb).toBe('10');
    const dup = await post(admin, { name: 'أحمد' });
    expect([dup.status, dup.body.code]).toEqual([409, 'DUPLICATE_SOFT']);
  });
});
