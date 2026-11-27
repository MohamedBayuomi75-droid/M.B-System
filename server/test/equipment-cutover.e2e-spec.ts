import { adminToken, bootstrap, createTestApp, sync, TestApp } from './app';
import { cutoverModule, reconcileModule, rollbackModule } from '../src/cutover/module-cutover';
import { EQUIPMENT } from '../src/cutover/parties-cutover';

/**
 * 8.7.2 — نقل المعدات ويومياتها للجداول (بيانات اختبار). المعيار: الواجهة القديمة مش بتحس بفرق، والقديم بقيمه بالظبط (مفيش تطبيع).
 * معدة بكل حقول البيانات الحقيقية (مرفقات وحقول إضافية وcustom)، ويوميات بأنواع (تشغيل، وتوقف، ونقل بتكلفة مسجّلة)، وقيم نوعها مختلف.
 */
describe('8.7.2 equipment cutover', () => {
  let t: TestApp;
  let admin: string;
  const up = (collection: string, id: string, set: Record<string, unknown>, baseRev = 0) => ({ collection, id, op: 'upsert', baseRev, set: { id, ...set } });
  const snap = async () => { const b = await bootstrap(t, admin); return { e: b.data.equipment, d: b.data.equipmentDaily, revs: [b.meta.revs.equipment, b.meta.revs.equipmentDaily] }; };
  let before: Awaited<ReturnType<typeof snap>>;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    const r = await sync(t, admin, { changes: [
      up('equipment', 'q1', { name: 'المعدات — لودر', code: 'EQ-001', typeLabel: 'لودر', type: 'other', status: 'working', ownership: 'owned', vehicleNumber: 'أ ب 1', plate: 'أ ب 1', dailyCost: 1000, hourlyCost: 150, fuelPrice: 10,
        departmentId: '__core_eq_machinery__', categoryId: '__core_eq_machinery__', supervisorId: 's1', vehicleLicenseExpiry: '2020-01-01', vehicleLicenseStatus: 'expired', attachments: [{ name: 'رخصة.pdf' }], extraFields: [{ label: 'لون', value: 'أصفر' }], custom: { x: 1 } }),
      up('equipment', 'qx', { name: 'غريبة', code: 'EQ-009', dailyCost: '500', totalHours: 'كتير', attachments: 'none' }),
      up('equipmentDaily', 'ed1', { equipmentId: 'q1', date: '2026-03-02', project: 'أ', kind: 'work', days: 1, hours: 8, fuelLiters: 20, notes: '' }),
      up('equipmentDaily', 'ed2', { equipmentId: 'q1', date: '2026-03-03', project: 'أ', kind: 'idle', days: 2 }),
      up('equipmentDaily', 'ed3', { equipmentId: 'q1', date: '2026-03-04', project: 'أ', kind: 'move', moveCost: 350, extraCost: 20 }),
      up('equipmentDaily', 'edx', { equipmentId: 'q1', date: '2026-03-05', days: '1', hours: null, cost: 'x' }),
    ] });
    expect(r.body.applied).toHaveLength(6);
    before = await snap();
  });
  afterAll(async () => t?.close());

  it('execute keeps every record exact and counts untyped values', async () => {
    const rec0 = await reconcileModule(t.ds, EQUIPMENT);
    const r = await cutoverModule(t.ds, EQUIPMENT, 'test', 'execute');
    expect(r.collections.map((c) => [c.collection, c.migrated, c.untyped])).toEqual([['equipment', 2, { dailyCost: 1, totalHours: 1, attachments: 1 }], ['equipmentDaily', 4, { days: 1, hours: 1, cost: 1 }]]);
    const after = await snap();
    expect(after.e).toEqual(before.e);
    expect(after.d).toEqual(before.d);
    expect((await reconcileModule(t.ds, EQUIPMENT)).collections.map((c) => [c.count, c.content, c.order])).toEqual(rec0.collections.map((c) => [c.count, c.content, c.order]));
    const q1 = (await t.ds.query(`SELECT daily_cost, attachments, custom FROM equipment WHERE id = 'q1'`))[0];
    expect([Number(q1.daily_cost), q1.attachments, q1.custom]).toEqual([1000, [{ name: 'رخصة.pdf' }], { x: 1 }]);
    expect(Number((await t.ds.query(`SELECT move_cost FROM equipment_daily WHERE id = 'ed3'`))[0].move_cost)).toBe(350);
  });

  it('legacy writes over the tables; rollback brings everything back', async () => {
    const { revs } = await snap();
    const w = await sync(t, admin, { changes: [
      up('equipmentDaily', 'n1', { equipmentId: 'q1', date: '2026-03-09', project: 'أ', kind: 'work', days: 1 }), up('equipment', 'q1', { totalHours: 8, status: 'working' }, revs[0].q1),
      { collection: 'equipmentDaily', id: 'ed2', op: 'delete', baseRev: revs[1].ed2 },
    ] });
    expect(w.body.applied.map((a: { id: string; op: string }) => [a.id, a.op])).toEqual([['n1', 'insert'], ['q1', 'update'], ['ed2', 'delete']]);
    const mid = await snap();
    const res = await rollbackModule(t.ds, EQUIPMENT, 'test');
    expect(res.restored).toMatchObject({ equipment: 2, equipmentDaily: 5 });
    expect(await snap()).toEqual(mid);
    expect(Number((await t.ds.query(`SELECT (SELECT count(*) FROM equipment) + (SELECT count(*) FROM equipment_daily) AS n`))[0].n)).toBe(0);
  });
});
