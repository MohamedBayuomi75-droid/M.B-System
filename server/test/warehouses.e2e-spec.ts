import { adminToken, bearer, bootstrap, createTestApp, newUser, sync, TestApp } from './app';
import { cutoverModule } from '../src/cutover/module-cutover';
import { WAREHOUSES } from '../src/cutover/parties-cutover';

/** 6.2-ب — API المخازن (بيانات اختبار): نفس السلوك قبل وبعد نقل البيانات للجداول، ومن غير أي حساب تكلفة (B-20) */
describe('6.2-B warehouses API', () => {
  let t: TestApp;
  let admin: string;
  let keeper: string;
  let viewer: string;
  const W = '/api/v1/warehouses';

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    keeper = (await newUser(t, admin, 'wha_keeper', 'warehouse')).token;
    viewer = (await newUser(t, admin, 'wha_viewer', 'viewer')).token;
  });
  afterAll(async () => t?.close());

  const scenario = (label: string, cut: boolean) => it(`${label}: items, locations, balances, transfers with B-50`, async () => {
    if (cut) await cutoverModule(t.ds, WAREHOUSES, 'test', 'execute');
    const p = cut ? 'B' : 'A';
    expect((await t.http().post(`${W}/locations`).set(bearer(viewer)).send({ name: 'x' })).status).toBe(403);
    const l1 = (await t.http().post(`${W}/locations`).set(bearer(keeper)).send({ name: `مخزن ${p}1` })).body;
    const l2 = (await t.http().post(`${W}/locations`).set(bearer(keeper)).send({ name: `مخزن ${p}2` })).body;
    const it1 = await t.http().post(`${W}/items`).set(bearer(keeper)).send({ name: `حديد ${p}`, minQty: '2.5' });
    expect(it1.status).toBe(201);
    expect(it1.body).toMatchObject({ unit: 'قطعة', minQty: '2.5', avgCost: '0', total: '0' });
    expect(it1.body.code).toMatch(/^ITM-\d{4}$/);
    const legacy = (await bootstrap(t, admin)).data.warehouses.items.find((x: { id: string }) => x.id === it1.body.id);
    expect(legacy).toMatchObject({ name: `حديد ${p}`, unit: 'قطعة', minQty: 2.5, avgCost: 0, lastCost: 0, notes: '', category: '' });
    // التكلفة مش قابلة للكتابة من الـ API (B-20)
    expect((await t.http().patch(`${W}/items/${it1.body.id}`).set(bearer(keeper)).send({ rev: it1.body.rev, avgCost: '5' })).status).toBe(400);
    expect((await t.http().patch(`${W}/items/${it1.body.id}`).set(bearer(keeper)).send({ rev: it1.body.rev, category: 'مواد' })).body.category).toBe('مواد');
    // استلام من الواجهة الحالية (الشاشة الكاملة)
    expect((await sync(t, keeper, { changes: [{ collection: 'warehouses.movements', id: `rcv-${p}`, op: 'upsert', baseRev: 0, set: { id: `rcv-${p}`, type: 'in', itemId: it1.body.id, qty: 10, locationId: l1.id, unitCost: 4 } }] })).body.applied).toHaveLength(1);
    expect((await t.http().post(`${W}/transfers`).set(bearer(keeper)).send({ itemId: it1.body.id, fromLocationId: l1.id, toLocationId: l2.id, qty: '3.25' })).status).toBe(201);
    const ov = (await t.http().get(W).set(bearer(viewer)).expect(200)).body.items.find((x: { id: string }) => x.id === it1.body.id);
    expect(ov.total).toBe('10');
    expect(Object.fromEntries(ov.balances.map((b: { locationId: string; balance: string }) => [b.locationId, Number(b.balance)]))).toEqual({ [l1.id]: 6.75, [l2.id]: 3.25 });
    const over = await t.http().post(`${W}/transfers`).set(bearer(keeper)).send({ itemId: it1.body.id, fromLocationId: l2.id, toLocationId: l1.id, qty: '3.25001' });
    expect([over.status, over.body.code]).toEqual([409, 'NEGATIVE_STOCK']);
    expect((await t.http().post(`${W}/transfers`).set(bearer(keeper)).send({ itemId: it1.body.id, fromLocationId: l1.id, toLocationId: l1.id, qty: '1' })).body.code).toBe('BAD_TRANSFER');
    expect((await t.http().get(`${W}/movements?itemId=${it1.body.id}`).set(bearer(viewer))).body.map((m: { type: string }) => m.type)).toEqual(['transfer', 'in']);
    if (cut) expect(Number((await t.ds.query(`SELECT count(*) FROM wh_movements WHERE item_id = $1`, [it1.body.id]))[0].count)).toBe(2);
  });

  scenario('before cutover (records)', false);
  scenario('after cutover (tables)', true);

  it('7.1 (legacy parity): warehouse code LOC-NN by default or given, unique; name/notes editable with rev, code fixed; legacy UI sees it', async () => {
    const all = (await t.http().get(W).set(bearer(viewer))).body.locations as { id: string }[];
    const a = (await t.http().post(`${W}/locations`).set(bearer(keeper)).send({ name: 'مخزن الكود' })).body;
    expect(a.id).toMatch(/^LOC-\d{2,}$/);
    expect(all.map((l) => l.id)).not.toContain(a.id);
    const b = (await t.http().post(`${W}/locations`).set(bearer(keeper)).send({ name: 'مخزن بكود', code: 'MAIN-1' })).body;
    expect(b.id).toBe('MAIN-1');
    expect((await t.http().post(`${W}/locations`).set(bearer(keeper)).send({ name: 'تكرار', code: 'MAIN-1' })).body.code).toBe('DUPLICATE_CODE');
    expect((await t.http().patch(`${W}/locations/${b.id}`).set(bearer(viewer)).send({ rev: b.rev, name: 'x' })).status).toBe(403);
    const e = await t.http().patch(`${W}/locations/${b.id}`).set(bearer(keeper)).send({ rev: b.rev, name: 'المخزن الرئيسي', notes: 'الدور الأرضي' });
    expect([e.status, e.body.id, e.body.name, e.body.notes]).toEqual([200, 'MAIN-1', 'المخزن الرئيسي', 'الدور الأرضي']);
    // rev قديم على حقل نصي: آخر كتابة بتكسب (نفس قاعدة التعارض في الطبقة الانتقالية — الحقول المحمية بس بترجّع 409)
    expect((await t.http().patch(`${W}/locations/nope`).set(bearer(keeper)).send({ rev: 1, name: 'x' })).status).toBe(404);
    const legacy = (await bootstrap(t, admin)).data.warehouses.locations.find((l: { id: string }) => l.id === 'MAIN-1');
    expect([legacy.name, legacy.notes]).toEqual(['المخزن الرئيسي', 'الدور الأرضي']);
  });
});
