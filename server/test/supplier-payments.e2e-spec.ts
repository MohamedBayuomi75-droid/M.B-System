import { adminToken, bearer, bootstrap, createTestApp, newUser, sync, TestApp } from './app';
import { cutoverModule } from '../src/cutover/module-cutover';
import { PARTIES, SUPPLIER_INVOICES, SUPPLIER_PAYMENTS } from '../src/cutover/parties-cutover';

/**
 * 7.3.4 — API دفعات الموردين والتخصيص والرصيد (بيانات اختبار): نفس السلوك قبل نقل البيانات للجداول وبعده.
 * التوزيع زي القديم (سجلات بـ batchId + الباقي بالفرق الدقيق)، ومن غير تجاوز باقي الفاتورة (B-72)، ورقم PV- + paymentNo من العدّاد القديم،
 * والحدث مرة واحدة، والتعديل سجل واحد، ومراجعة غير المصنّف دفعة بدفعة (B-53)، والرصيد والكشف بـ F-05 مع علامة الفرق (DEC-0113).
 */
describe('7.3.4 supplier payments API', () => {
  let t: TestApp;
  let admin: string;
  let acc: string;
  let viewer: string;
  const P = '/api/v1/supplier-payments';
  let k = 0;
  const post = (tok: string, body: Record<string, unknown>, key = `sp-test-key-${++k}`) => t.http().post(P).set(bearer(tok)).set('Idempotency-Key', key).send(body);
  const legacyPays = async (sid: string) => (await bootstrap(t, admin)).data.ledger.payments.filter((p: { supplierId: string }) => p.supplierId === sid);
  const settingsNo = async () => Number((await bootstrap(t, admin)).data.settings?.nextPaymentNo);

  const seed = async (x: string) => {
    const up = (collection: string, id: string, set: Record<string, unknown>) => ({ collection, id, op: 'upsert', baseRev: 0, set: { id, ...set } });
    const inv = (id: string, o: Record<string, unknown>) => up('ledger.invoices', `${id}${x}`, { supplierId: `s${x}`, invoiceNo: `${id}${x}`.toUpperCase(), date: '2026-01-10', baseValue: 1000, vat: 140, stampDuty: 0, withheld: 10, totalInvoice: 1140, netInvoice: 1130, isReturn: false, attachments: [], notes: '', description: 'بند', ...o });
    const pay = (id: string, o: Record<string, unknown>) => up('ledger.payments', `${id}${x}`, { paymentNo: 0, supplierId: `s${x}`, invoiceId: '', amount: 100, method: 'نقدي', date: '2026-01-20', transferRef: '', notes: '', extraFields: [], attachments: [], ...o });
    expect((await sync(t, admin, { changes: [
      up('ledger.suppliers', `s${x}`, { name: `مورد دفعات ${x}`, taxId: '', openingBalance: 1000, openingBalanceDate: '', extraFields: [], attachments: [] }),
      inv('i1', {}), inv('i2', { date: '2026-01-15', baseValue: 500, vat: 70, withheld: 0, totalInvoice: 570, netInvoice: 570 }),
      inv('ic', { date: '2026-01-05', baseValue: 500, vat: 0, withheld: 0, totalInvoice: 500, netInvoice: 500, cancelled: true }),
      inv('r1', { date: '2026-01-25', isReturn: true, baseValue: 113, vat: 0, withheld: 0, totalInvoice: 113, netInvoice: 113 }),
      pay('p1', { paymentNo: 1, amount: 500, direction: 'pay' }), pay('p2', { paymentNo: 2, amount: 100, direction: 'collect', date: '2026-01-21' }),
      pay('p3', { paymentNo: 3, amount: 0.105, date: '2026-01-22' }),
    ] })).body.applied).toHaveLength(8);
  };

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    acc = (await newUser(t, admin, 'spa_acc', 'ledgerAccountant')).token;
    viewer = (await newUser(t, admin, 'spa_viewer', 'viewer')).token;
    expect((await sync(t, admin, { docs: [{ key: 'settings', op: 'patch', baseRev: 0, set: { nextPaymentNo: 7 } }] })).status).toBe(200);
    await seed('A'); await seed('B');
  });
  afterAll(async () => t?.close());

  const scenario = (label: string, x: 'A' | 'B') => it(`${label}: statement F-05, payments, allocation, numbering, edit, classify`, async () => {
    if (x === 'B') for (const m of [PARTIES, SUPPLIER_INVOICES, SUPPLIER_PAYMENTS]) await cutoverModule(t.ds, m, 'test', 'execute');
    const sid = `s${x}`;
    // الكشف والرصيد بـ F-05: 1000 + 1130 + 570 − 113 − 500 + 100 = 2187 (الملغاة برا، والتحصيل بيتجمع، والـ 0.105 للمراجعة)
    const st = (await t.http().get(`${P}/statement/${sid}`).set(bearer(viewer))).body;
    expect(st).toMatchObject({ opening: '1000.000000', closing: '2187.000000', balance: '2187.000000', legacyBalance: '2486.895000', differs: true,
      reasons: { cancelledInvoices: { count: 1, amount: '500.000000' }, collect: { count: 1, amount: '100.000000' }, unclassified: { count: 1, amount: '0.105000' } } });
    expect(st.lines.map((l: { type: string; debit: string; credit: string; balance: string }) => [l.type, l.debit, l.credit, l.balance])).toEqual([
      ['invoice', '0.000000', '1130.000000', '2130.000000'], ['invoice', '0.000000', '570.000000', '2700.000000'], ['pay', '500.000000', '0.000000', '2200.000000'],
      ['collect', '0.000000', '100.000000', '2300.000000'], ['return', '113.000000', '0.000000', '2187.000000']]);
    expect(st.unclassified.map((u: { id: string }) => u.id)).toEqual([`p3${x}`]);
    expect(st.closing).toBe(st.lines[st.lines.length - 1].balance); // P7.3-H: الكشف والرصيد من نفس الحركات
    expect((await t.http().get(`${P}/statement/${sid}?from=2026-01-16`).set(bearer(viewer))).body.opening).toBe('2700.000000');

    expect((await post(viewer, { supplierId: sid, date: '2026-03-01', direction: 'pay', amount: '1', general: true })).status).toBe(403);
    const no0 = await settingsNo();
    // دفعة عامة
    const g = await post(acc, { supplierId: sid, date: '2026-03-01', direction: 'pay', amount: '250', general: true, notes: 'مقدم' });
    expect(g.status).toBe(201);
    expect(g.body).toMatchObject({ invoiceId: '', amount: 250, direction: 'pay', paymentNo: no0, notes: 'مقدم', unclassified: false });
    expect(g.body.internalNo).toMatch(/^PV-2026-\d{5}$/);
    // موزّعة: i2 = 300 و i1 = 600 من 1000.005 ← 3 سجلات بنفس الـ batch والرقم الداخلي، والباقي بالفرق الدقيق 100.005 (س1)
    const d = await post(acc, { supplierId: sid, date: '2026-03-02', direction: 'pay', amount: '1000.005', notes: 'توزيع', allocations: [{ invoiceId: `i2${x}`, amount: '300' }, { invoiceId: `i1${x}`, amount: '600' }] });
    expect(d.status).toBe(201);
    expect(d.body.batch.map((b: { invoiceId: string; amount: number; notes: string; paymentNo: number }) => [b.invoiceId, b.amount, b.notes, b.paymentNo])).toEqual([
      [`i2${x}`, 300, 'توزيع', no0 + 1], [`i1${x}`, 600, 'توزيع', no0 + 2], ['', 100.005, 'توزيع — متبقي غير موزع', no0 + 3]]);
    expect(new Set(d.body.batch.map((b: { internalNo: string; batchId: string }) => `${b.internalNo}|${b.batchId}`)).size).toBe(1);
    expect(Number(d.body.internalNo.slice(-5))).toBe(Number(g.body.internalNo.slice(-5)) + 1);
    expect(await settingsNo()).toBe(no0 + 4); // العدّاد القديم بيكمّل عشان الواجهة القديمة
    expect(d.body.events.map((e: { type: string }) => e.type)).toEqual(['supplier-payment.posted']);
    // الرفض: توزيع أكبر من المبلغ، وأكبر من باقي الفاتورة (B-72)، وفاتورة ملغاة، ومن غير ما يضيع رقم PV
    expect((await post(acc, { supplierId: sid, date: '2026-03-03', direction: 'pay', amount: '100', allocations: [{ invoiceId: `i1${x}`, amount: '200' }] })).body.code).toBe('OVER_ALLOCATED');
    expect((await post(acc, { supplierId: sid, date: '2026-03-03', direction: 'pay', amount: '400', allocations: [{ invoiceId: `i2${x}`, amount: '300' }] })).body.code).toBe('OVER_INVOICE_REMAINING'); // باقي i2 = 270
    expect((await post(acc, { supplierId: sid, date: '2026-03-03', direction: 'pay', amount: '10', allocations: [{ invoiceId: `ic${x}`, amount: '10' }] })).body.code).toBe('BAD_INVOICE');
    const open = (await t.http().get(`${P}/open-invoices?supplierId=${sid}`).set(bearer(acc))).body;
    expect(open.map((o: { id: string; remaining: string }) => [o.id, o.remaining])).toEqual([[`i2${x}`, '270.000000'], [`i1${x}`, '530.000000']]);
    // نفس Idempotency-Key ← نفس الرد من غير سجلات تانية
    const before = (await legacyPays(sid)).length;
    const i1 = await post(acc, { supplierId: sid, date: '2026-03-04', direction: 'collect', amount: '5', general: true }, `sp-idem-${x}-00001`);
    const i2 = await post(acc, { supplierId: sid, date: '2026-03-04', direction: 'collect', amount: '5', general: true }, `sp-idem-${x}-00001`);
    expect([i1.status, i2.body.id, (await legacyPays(sid)).length]).toEqual([201, i1.body.id, before + 1]);
    // التعديل: سجل واحد (س2)، ومن غير تجاوز الباقي، و rev قديم ← تعارض
    const p1 = (await t.http().get(`${P}/p1${x}`).set(bearer(acc))).body;
    expect((await t.http().patch(`${P}/p1${x}`).set(bearer(acc)).send({ rev: p1.rev, supplierId: sid, date: '2026-01-20', direction: 'collect', amount: '700', invoiceId: `i1${x}` })).body.code).toBe('OVER_INVOICE_REMAINING');
    const e = await t.http().patch(`${P}/p1${x}`).set(bearer(acc)).send({ rev: p1.rev, supplierId: sid, date: '2026-01-20', direction: 'collect', amount: '500', invoiceId: `i1${x}` });
    expect([e.status, e.body.direction, e.body.amount, e.body.invoiceId, e.body.paymentNo]).toEqual([200, 'collect', 500, `i1${x}`, 1]);
    expect((await t.http().patch(`${P}/p1${x}`).set(bearer(acc)).send({ rev: p1.rev, supplierId: sid, date: '2026-01-20', direction: 'pay', amount: '1' })).body.code).toBe('CONFLICT');
    // مراجعة غير المصنّف: دفعة واحدة، ومرة واحدة
    expect((await t.http().get(`${P}/unclassified`).set(bearer(viewer))).body.map((u: { id: string }) => u.id)).toContain(`p3${x}`);
    const p3 = (await t.http().get(`${P}/p3${x}`).set(bearer(acc))).body;
    expect((await t.http().patch(`${P}/p3${x}/direction`).set(bearer(viewer)).send({ rev: p3.rev, direction: 'pay' })).status).toBe(403);
    const c = await t.http().patch(`${P}/p3${x}/direction`).set(bearer(acc)).send({ rev: p3.rev, direction: 'pay' });
    expect([c.status, c.body.direction, c.body.unclassified]).toEqual([200, 'pay', false]);
    expect((await t.http().patch(`${P}/p3${x}/direction`).set(bearer(acc)).send({ rev: c.body.rev, direction: 'collect' })).body.code).toBe('ALREADY_CLASSIFIED');
    // القايمة: نفس فلاتر القديم، والأرصدة لكل مورد
    const lst = (await t.http().get(`${P}?supplierId=${sid}&direction=collect`).set(bearer(viewer))).body;
    expect(lst.rows.every((r: { direction: string }) => r.direction === 'collect')).toBe(true);
    const bal = (await t.http().get(`${P}/balances`).set(bearer(viewer))).body.find((b: { supplierId: string }) => b.supplierId === sid);
    const st2 = (await t.http().get(`${P}/statement/${sid}`).set(bearer(viewer))).body;
    expect(bal.balance).toBe(st2.closing);
    // من الواجهة القديمة: نفس شكل السجلات
    const legacy = (await legacyPays(sid)).filter((p: { notes: string }) => String(p.notes).startsWith('توزيع'));
    expect(legacy.map((p: { batchId: string }) => p.batchId)).toEqual([d.body.batchId, d.body.batchId, d.body.batchId]);
  });

  scenario('before cutover (records)', 'A');
  scenario('after cutover (tables)', 'B');
});
