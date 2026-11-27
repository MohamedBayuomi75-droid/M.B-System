import { adminToken, bearer, createTestApp, sync, TestApp } from './app';
import { cutoverModule } from '../src/cutover/module-cutover';
import { EQUIPMENT } from '../src/cutover/parties-cutover';

/**
 * 8.7.3 — API المعدات ويومياتها ومستحقاتها (بيانات phase86). التكلفة القديمة = أرقام القديمة بالظبط (phase86.expect.json: 1200، و2000،
 * و1000، و777، و250)، والجديدة بـ DEC-0140 (التوقف 50% ← 1000، و«تكلفة إضافية» محسوبة ← 300، والنقل بتكلفته المكتوبة)، والحفظ (ومن غير
 * القسم اللي القديمة كانت بتعمله)، واليومية (ساعات المعدة وحالتها، وتكلفة النقل إلزامية)، ومستحقات المعدات — قبل النقل للجداول وبعده.
 */
describe('8.7.3 equipment API', () => {
  let t: TestApp;
  let admin: string;
  let k = 0;
  const E = '/api/v1/equipment';
  const post = (path: string, body: Record<string, unknown>) => t.http().post(path).set(bearer(admin)).set('Idempotency-Key', `eq-key-${++k}`).send(body);
  const up = (collection: string, id: string, set: Record<string, unknown>) => ({ collection, id, op: 'upsert', baseRev: 0, set: { id, ...set } });
  const D = (id: string, set: Record<string, unknown>) => up('equipmentDaily', id, { kind: 'work', days: 1, hours: 0, fuelLiters: 0, notes: '', project: 'مشروع الشروق', ...set });
  const grid = async () => (await t.http().get(`${E}/daily?from=2026-03-01&to=2026-03-31`).set(bearer(admin)).expect(200)).body;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    expect((await sync(t, admin, { changes: [
      up('supervisors', 's1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active' }),
      up('drivers', 'd1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', licenseExpiry: '2099-01-01' }),
      up('departments', '__core_eq_machinery__', { name: 'المعدات', kind: 'equipment', system: true }), up('departments', '__core_eq_trucks__', { name: 'سيارات النقل', kind: 'equipment', system: true }),
      up('equipment', 'q1', { code: 'EQ-001', name: 'المعدات — لودر', typeLabel: 'لودر', type: 'other', status: 'working', ownership: 'owned', licenseCategory: 'المعدات', departmentId: '__core_eq_machinery__', categoryId: '__core_eq_machinery__',
        vehicleNumber: 'أ ب 1', dailyCost: 1000, hourlyCost: 150, fuelPrice: 10, supervisorId: 's1', project: 'مشروع الشروق', vehicleLicenseExpiry: '2020-01-01', insuranceStatus: 'insured' }),
      up('equipment', 'q2', { code: 'EQ-002', name: 'سيارات النقل — قلاب', typeLabel: 'قلاب', type: 'other', status: 'maintenance', ownership: 'rented', licenseCategory: 'سيارات النقل', departmentId: '__core_eq_trucks__', hourlyCost: 200 }),
      up('equipment', 'q3', { code: 'EQ-003', name: 'ملاكي', typeLabel: 'تويوتا', type: 'other', status: 'stopped', ownership: 'owned', dailyCost: 300 }),
      D('ed1', { equipmentId: 'q1', date: '2026-03-02', hours: 8, fuelLiters: 20 }), D('ed2', { equipmentId: 'q1', date: '2026-03-03', kind: 'idle', days: 2 }),
      D('ed3', { equipmentId: 'q2', date: '2026-03-02', days: 0, hours: 5 }), D('ed4', { equipmentId: 'q2', date: '2026-03-04', kind: 'move', cost: 777 }),
      D('ed5', { equipmentId: 'q3', date: '2026-03-05', extraCost: 50, dailyCost: 250 }),
      up('workerPayments', 'p1', { personType: 'equipment', personId: 'q1', workerId: '', type: 'pay', date: '2026-03-10', amount: 500, scope: 'self', notes: '' }),
    ] })).status).toBe(200);
  });
  afterAll(async () => t?.close());

  it('list: boards, cards, filters and issues like the legacy page', async () => {
    const l = (await t.http().get(E).set(bearer(admin)).expect(200)).body;
    expect(l.boards.map((b: { name: string; count: number }) => [b.name, b.count])).toEqual([['الكل', 3], ['بدون قسم أو نوع ترخيص', 1], ['المعدات', 1], ['سيارات النقل', 1]]);
    expect(l.cards.map((c: { label: string }) => c.label)).toEqual(['إجمالي القسم', 'صيانة / عاطلة', 'حالة التأمين', 'حالة الرخصة', 'تكلفة تشغيل الشهر']);
    expect(l.rows.map((r: { code: string }) => r.code)).toEqual(['EQ-001', 'EQ-002', 'EQ-003']);
    expect(l.rows[0].issues.slice(0, 2)).toEqual(['رخصة المركبة منتهية', 'الرقم التأميني ناقص']);
    expect((await t.http().get(`${E}?status=working`).set(bearer(admin))).body.rows.length).toBe(1);
    expect((await t.http().get(`${E}?departmentId=__none__`).set(bearer(admin))).body.rows.map((r: { id: string }) => r.id)).toEqual(['q3']);
  });

  it('costs: legacy = phase86, new = DEC-0140', async () => {
    const g = await grid();
    const byId = Object.fromEntries(g.list.map((d: { id: string; legacyCost: number; cost: string }) => [d.id, [d.legacyCost, d.cost]]));
    expect(byId).toEqual({ ed1: [1200, '1200'], ed2: [2000, '1000'], ed3: [1000, '1000'], ed4: [777, '777'], ed5: [250, '300'] });
    const q1 = g.rows.find((r: { id: string }) => r.id === 'q1');
    expect([q1.days, q1.records, q1.hours, q1.legacyCost, q1.cost]).toEqual([3, 2, 8, 3200, '2200']);
  });

  it('daily: save, equipment hours and status, move cost required, edit, delete', async () => {
    expect((await post(`${E}/daily`, { equipmentId: 'q3', date: '2026-03-20', kind: 'move', project: 'مشروع الشروق' })).body.message).toBe('اكتب تكلفة النقل');
    expect((await post(`${E}/daily`, { equipmentId: 'q3', date: '2026-03-20', project: '' })).body.message).toBe('اختر المشروع');
    const mv = await post(`${E}/daily`, { equipmentId: 'q3', date: '2026-03-20', kind: 'move', project: 'مشروع الشروق', moveCost: '450', fuelLiters: '10', fuelPrice: '12', hours: '3' }).expect(201);
    expect([mv.body.moveCost, mv.body.legacyCost, mv.body.cost]).toEqual([450, 420, '570']); // القديم: يومية 300 + وقود 120؛ الجديد: 450 + 120
    const q3 = (await t.http().get(`${E}/q3`).set(bearer(admin))).body;
    expect([q3.totalHours, q3.status]).toEqual([3, 'working']);
    const ed = (await t.http().get(`${E}/daily/ed2`).set(bearer(admin))).body;
    const u = await t.http().patch(`${E}/daily/ed2`).set(bearer(admin)).send({ rev: ed.rev, equipmentId: 'q1', date: '2026-03-03', kind: 'idle', days: '2', dailyCost: '1000', project: 'مشروع الشروق', notes: 'اتعدّلت' }).expect(200);
    expect([u.body.notes, u.body.cost]).toEqual(['اتعدّلت', '1000']);
    await t.http().delete(`${E}/daily/${mv.body.id}?rev=${mv.body.rev}`).set(bearer(admin)).expect(200);
  });

  it('save: like the legacy modal, without creating a department on edit (DEC-0140)', async () => {
    const opts = (await t.http().get(`${E}/form-options`).set(bearer(admin)).expect(200)).body;
    expect([opts.nextCode, opts.idlePercent, opts.departments.map((d: { name: string }) => d.name)]).toEqual(['EQ-004', 50, ['المعدات', 'سيارات النقل']]);
    const c = await post(E, { code: 'EQ-001', type: '__core_eq_trucks__', carType: ' مرسيدس ', status: 'working', ownership: 'rented', vehicleNumber: ' ن ق 9 ', driverId: 'd1', purchasePrice: '150000.555', vehicleLicenseExpiry: '2099-05-05', notes: ' ملاحظة ' }).expect(201);
    expect(c.body).toMatchObject({ code: 'EQ-004', name: 'سيارات النقل — مرسيدس — ن ق 9', typeLabel: 'مرسيدس', departmentId: '__core_eq_trucks__', licenseCategory: 'سيارات النقل', plate: 'ن ق 9',
      driverName: 'أحمد السواق', driverLicenseStatus: 'valid', vehicleLicenseStatus: 'valid', purchasePrice: 150000.56, notes: 'ملاحظة' });
    const q3 = (await t.http().get(`${E}/q3`).set(bearer(admin))).body;
    const e = await t.http().patch(`${E}/q3`).set(bearer(admin)).send({ rev: q3.rev, carType: 'تويوتا', status: 'stopped', ownership: 'owned', notes: 'اتعدّلت' }).expect(200);
    expect([e.body.name, e.body.departmentId ?? '', e.body.licenseCategory ?? '', e.body.dailyCost]).toEqual(['ملاكي', '', '', 300]);
    const n = await post(E, { type: 'معدات تقيلة', carType: 'حفار' }).expect(201);
    expect([n.body.name, n.body.licenseCategory]).toEqual(['معدات تقيلة — حفار', 'معدات تقيلة']);
    expect((await t.http().get(`${E}/form-options`).set(bearer(admin))).body.equipmentTypes).toEqual(expect.arrayContaining(['مرسيدس', 'حفار']));
    expect((await post(E, { carType: 'x', lastMaintenance: '2026-05-01', nextMaintenance: '2026-04-01' })).body.message).toBe('موعد الصيانة القادمة لا يمكن أن يكون قبل تاريخ آخر صيانة');
  });

  it('equipment dues: operating days = sum of days (legacy: records), cost both ways', async () => {
    const tb = (await t.http().get('/api/v1/dues/table?tab=equipment&from=2026-03-01&to=2026-03-31').set(bearer(admin)).expect(200)).body;
    const q1 = tb.rows.find((r: { id: string }) => r.id === 'q1');
    expect([q1.days, q1.legacyDays, q1.legacyDue, q1.due, q1.paid, q1.legacyBal, q1.bal, q1.supervisorName]).toEqual([3, 2, 3200, '2200', 500, 2700, '1700', 'سامي المشرف']);
    const over = await t.http().post('/api/v1/dues/pay').set(bearer(admin)).set('Idempotency-Key', `eq-key-${++k}`).send({ mode: 'pay', personType: 'equipment', personId: 'q1', payKind: 'daily', lines: [{ item: 'دفع يوميات', amount: '9999' }] });
    expect(over.body.code).toBe('OVER_BALANCE');
  });

  it('the same after the cutover to the tables', async () => {
    await cutoverModule(t.ds, EQUIPMENT, 'test', 'execute');
    const g = await grid();
    expect(g.list.find((d: { id: string }) => d.id === 'ed5').cost).toBe('300');
    const d = await post(`${E}/daily`, { equipmentId: 'q1', date: '2026-03-25', project: 'مشروع الشروق', days: '1' }).expect(201);
    expect(d.body.legacyCost).toBe(1000);
    expect(Number((await t.ds.query(`SELECT count(*) AS n FROM equipment_daily WHERE equipment_id = 'q1'`))[0].n)).toBe(3);
  });
});
