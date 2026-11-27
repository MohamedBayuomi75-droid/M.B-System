import { adminToken, bootstrap, createTestApp, sync, TestApp } from './app';
import { cutoverModule, reconcileModule, rollbackModule } from '../src/cutover/module-cutover';
import { COSTS } from '../src/cutover/parties-cutover';

/**
 * 8.8.2 — نقل التكاليف للجدول (بيانات اختبار). المعيار: الواجهة القديمة مش بتحس بفرق، والقديم بقيمه بالظبط (مفيش تطبيع).
 * تكلفة بكل حقول البيانات الحقيقية (السطور، والقسم، والحقول الإضافية، وcreatedAt)، وتكلفة قديمة من غير سطور، وقيم نوعها مختلف.
 */
describe('8.8.2 costs cutover', () => {
  let t: TestApp;
  let admin: string;
  const up = (collection: string, id: string, set: Record<string, unknown>, baseRev = 0) => ({ collection, id, op: 'upsert', baseRev, set: { id, ...set } });
  const snap = async () => { const b = await bootstrap(t, admin); return { c: b.data.costs, revs: b.meta.revs.costs }; };
  let before: Awaited<ReturnType<typeof snap>>;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    const r = await sync(t, admin, { changes: [
      up('costs', 'c1', { personKind: 'worker', personId: 'w1', date: '2026-03-03', amount: 130, lines: [{ item: 'خامات', amount: 100 }, { item: 'مواصلات', amount: 30 }], item: 'خامات + مواصلات',
        project: 'مشروع الشروق', projectId: 'pA', departmentId: 'd1', section: 'مواقع', notes: 'ن', extraFields: [{ label: 'إيصال', value: '12' }], createdAt: '2026-03-03T10:00:00.000Z', updatedAt: '2026-03-04T10:00:00.000Z' }),
      up('costs', 'c2', { personKind: 'supervisor', personId: 's1', date: '2026-04-01', amount: 60, item: 'اتصالات', project: '' }),
      up('costs', 'cx', { personKind: 'driver', personId: 'd1', date: '2026-04-02', amount: '45', lines: 'none', section: null }),
    ] });
    expect(r.body.applied).toHaveLength(3);
    before = await snap();
  });
  afterAll(async () => t?.close());

  it('execute keeps every record exact and counts untyped values', async () => {
    const rec0 = await reconcileModule(t.ds, COSTS);
    const r = await cutoverModule(t.ds, COSTS, 'test', 'execute');
    expect(r.collections.map((c) => [c.collection, c.migrated, c.untyped])).toEqual([['costs', 3, { amount: 1, lines: 1, section: 1 }]]);
    const after = await snap();
    expect(after.c).toEqual(before.c);
    expect((await reconcileModule(t.ds, COSTS)).collections.map((c) => [c.count, c.content, c.order])).toEqual(rec0.collections.map((c) => [c.count, c.content, c.order]));
    const c1 = (await t.ds.query(`SELECT amount, lines, project, legacy_extra FROM costs WHERE id = 'c1'`))[0];
    expect([Number(c1.amount), c1.lines, c1.project, c1.legacy_extra]).toEqual([130, [{ item: 'خامات', amount: 100 }, { item: 'مواصلات', amount: 30 }], 'مشروع الشروق', { createdAt: '2026-03-03T10:00:00.000Z', updatedAt: '2026-03-04T10:00:00.000Z' }]);
  });

  it('legacy writes over the table; rollback brings everything back', async () => {
    const { revs } = await snap();
    const w = await sync(t, admin, { changes: [
      up('costs', 'n1', { personKind: 'worker', personId: 'w1', date: '2026-03-09', amount: 20, lines: [{ item: 'شاي', amount: 20 }], item: 'شاي', project: 'برج النيل', section: '' }),
      up('costs', 'c1', { section: 'المواقع' }, revs.c1),
      { collection: 'costs', id: 'c2', op: 'delete', baseRev: revs.c2 },
    ] });
    expect(w.body.applied.map((a: { id: string; op: string }) => [a.id, a.op])).toEqual([['n1', 'insert'], ['c1', 'update'], ['c2', 'delete']]);
    const mid = await snap();
    const res = await rollbackModule(t.ds, COSTS, 'test');
    expect(res.restored).toMatchObject({ costs: 4 }); // ومعاهم المحذوفة (علامة الحذف بترجع)
    expect(await snap()).toEqual(mid);
    expect(Number((await t.ds.query(`SELECT count(*) AS n FROM costs`))[0].n)).toBe(0);
  });
});
