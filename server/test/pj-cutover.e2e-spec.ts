import { adminToken, bootstrap, createTestApp, sync, TestApp } from './app';
import { cutoverModule, reconcileModule, rollbackModule } from '../src/cutover/module-cutover';
import { PROJECTS } from '../src/cutover/parties-cutover';

/**
 * 7.4.3 — نقل المشروعات للجدول (بيانات اختبار). المعيار: الواجهة القديمة مش بتحس بفرق، والقديم بقيمه بالظبط:
 * حالة HR قديمة (active)، وحقول مسار المشروع (stepMeta وpathHistory و workflowSnapshot بـ null جواها)، وميزانية بخانات كتير،
 * واسم مكرر وكود فاضي (القديم ممكن يكون فيه كده — مفيش قيود في الجدول)، وقيم نوعها مختلف (الميزانية نص، والتقدم نص).
 */
describe('7.4.3 projects cutover', () => {
  let t: TestApp;
  let admin: string;
  const up = (id: string, set: Record<string, unknown>, baseRev = 0) => ({ collection: 'projects', id, op: 'upsert', baseRev, set: { id, ...set } });
  const snap = async () => { const b = await bootstrap(t, admin); return { p: b.data.projects, revs: b.meta.revs.projects }; };
  let before: Awaited<ReturnType<typeof snap>>;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    const r = await sync(t, admin, { changes: [
      up('pA', { code: 'PRJ-001', name: 'مشروع الشروق', status: 'active', budget: 0.1 + 0.2, supervisorId: 'sv1', notes: 'ن', extraFields: [{ label: 'م', value: 'x', meta: null }] }),
      up('pB', { code: 'PRJ-002', name: 'مشروع النور', status: 'المستخلصات', value: 20000, budget: 15000, stageKey: 'invoices', stepKey: 'prep_invoice',
        stepMeta: { prep_invoice: { status: 'in_progress', startDate: '2026-01-01', notes: null } }, completedSteps: ['survey_works'], stepFiles: { boq: [{ id: 'f1', name: 'x.pdf' }] },
        pathHistory: [{ id: 'h1', at: '2026-01-01T00:00:00.000Z', user: 'u', action: 'تغيير المرحلة', from: 'study', to: 'invoices' }], workflowSnapshot: { at: '2026-01-01', stages: [{ key: 'study', label: 'دراسة', steps: [{ key: 'a', label: 'أ' }] }] },
        tenderStance: 'accepted', rejectReason: '', statusBeforeReject: '' }),
      up('pC', { code: '', name: 'مشروع النور', status: 'completed', customerId: 'cA', customerName: 'شركة', customer: 'شركة', contractNo: 'ع-1', start: '2026-01-01', end: '', progress: 40, assignedTo: 'أحمد', attachments: [] }),
      up('x1', { code: 7, name: 'نصوص', budget: '1,000', progress: '50', extraFields: {} }),   // كود رقم، وميزانية وتقدم كنص، وخانات إضافية كائن
    ] });
    expect(r.body.applied).toHaveLength(4);
    before = await snap();
  });
  afterAll(async () => t?.close());

  it('dry-run leaves no trace; execute keeps the exact legacy view and counts untyped values', async () => {
    const rec0 = await reconcileModule(t.ds, PROJECTS);
    await cutoverModule(t.ds, PROJECTS, 'test', 'dry-run');
    expect(Number((await t.ds.query(`SELECT count(*)::int AS n FROM projects`))[0].n)).toBe(0);
    const r = await cutoverModule(t.ds, PROJECTS, 'test', 'execute');
    expect(r.collections[0]).toMatchObject({ collection: 'projects', migrated: 4, untyped: { code: 1, budget: 1, progress: 1 } });
    const after = await snap();
    expect(after).toEqual(before);
    expect(JSON.stringify(after.p)).toBe(JSON.stringify(before.p));
    expect((await reconcileModule(t.ds, PROJECTS)).collections.map((c) => [c.count, c.content, c.order])).toEqual(rec0.collections.map((c) => [c.count, c.content, c.order]));
    const rows = await t.ds.query(`SELECT id, budget::text AS b, stage_key, step_meta, path_history, start_date, progress::text AS pr, legacy_extra FROM projects ORDER BY id`);
    const by = (id: string) => rows.find((x: { id: string }) => x.id === id);
    expect(by('pA').b).toBe('0.30000000000000004');
    expect(by('pB')).toMatchObject({ stage_key: 'invoices', step_meta: { prep_invoice: { status: 'in_progress', startDate: '2026-01-01', notes: null } } });
    expect(by('pB').path_history).toHaveLength(1);
    expect(by('pC')).toMatchObject({ start_date: '2026-01-01', pr: '40' });
    expect(by('x1').legacy_extra).toEqual({ code: 7, budget: '1,000', progress: '50' });
    await expect(t.ds.query(`UPDATE records SET data = data WHERE collection = 'projects' AND id = 'pA'`)).rejects.toThrow(/frozen/);
    expect((await t.http().get('/api/v1/projects').set('Authorization', `Bearer ${admin}`)).body.source).toBe('relational');
  });

  it('the legacy UI keeps writing over the table; rollback brings everything back', async () => {
    const revs = (await snap()).revs;
    const w = await sync(t, admin, { changes: [up('n1', { code: 'PRJ-009', name: 'جديد', status: 'الدراسة والتخطيط' }), up('pA', { name: 'الشروق الجديد' }, revs.pA), { collection: 'projects', id: 'x1', op: 'delete', baseRev: revs.x1 }] });
    expect(w.body.applied.map((a: { id: string; op: string }) => [a.id, a.op])).toEqual([['n1', 'insert'], ['pA', 'update'], ['x1', 'delete']]);
    const mid = await snap();
    expect(mid.p.find((p: { id: string }) => p.id === 'pA').name).toBe('الشروق الجديد');
    const res = await rollbackModule(t.ds, PROJECTS, 'test');
    expect(res.restored.projects).toBe(5);
    expect(await snap()).toEqual(mid);
    expect(JSON.stringify((await snap()).p)).toBe(JSON.stringify(mid.p));
    expect(Number((await t.ds.query(`SELECT count(*)::int AS n FROM projects`))[0].n)).toBe(0);
  });
});
