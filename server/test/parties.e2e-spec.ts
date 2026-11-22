import { adminToken, bearer, bootstrap, createTestApp, newUser, sync, TestApp } from './app';

/**
 * المرحلة 6.1 — الموردين والعملاء (بيانات أساسية). كل البيانات هنا اختبارية.
 * أهم حاجة: الـ API الجديد والواجهة القديمة بيكتبوا ويقروا **نفس السجل بنفس الشكل** (نسخة واحدة قابلة للكتابة).
 */
describe('phase 6.1 suppliers & customers', () => {
  let t: TestApp;
  let admin: string;
  let viewer: string;
  let ledger: string;
  let sales: string;
  let crm: string; // مخصّص: عملاء بس، من غير صفحات الحسابات
  const up = (collection: string, id: string, set: Record<string, unknown>, baseRev = 0) => ({ collection, id, op: 'upsert', baseRev, set });

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    viewer = (await newUser(t, admin, 'p6_viewer', 'viewer')).token;
    ledger = (await newUser(t, admin, 'p6_ledger', 'ledgerAccountant')).token;
    sales = (await newUser(t, admin, 'p6_sales', 'clientsSales')).token;
    crm = (await newUser(t, admin, 'p6_crm', 'custom', { editData: true, pages: [{ page: 'clients.customers', view: true, add: true, edit: true, delete: false }] })).token;
  });
  afterAll(async () => t?.close());

  describe('suppliers', () => {
    let id = '';
    it('create via API → same record shape the legacy UI writes (modals.js:108)', async () => {
      const r = await t.http().post('/api/v1/suppliers').set(bearer(ledger)).send({ name: '  مورد اختبار حديد  ', taxId: '123456789', openingBalance: '-1250.5', openingBalanceDate: '2026-01-01', email: 'test@example.com' });
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({ name: 'مورد اختبار حديد', openingBalance: '-1250.500000', invoicesCount: 0, rev: 1 });
      id = r.body.id;
      const b = await bootstrap(t, admin);
      const legacy = (b.data.ledger.suppliers as Record<string, unknown>[]).find((s) => s.id === id);
      expect(legacy).toEqual({ id, name: 'مورد اختبار حديد', taxId: '123456789', commercialReg: '', businessNature: '', openingBalance: -1250.5, openingBalanceDate: '2026-01-01',
        phone: '', email: 'test@example.com', address: '', bankAccount: '', iban: '', extraFields: [], notes: '', attachments: [] });
    });

    it('server enforces the current validation rules (helpers.js:54)', async () => {
      const cases: [Record<string, unknown>, number, string?][] = [
        [{}, 400],
        [{ name: '   ' }, 400, 'NAME_REQUIRED'],
        [{ name: 'س', taxId: '1234' }, 400, 'TAX_ID_TOO_SHORT'],
        [{ name: 'س', email: 'not-an-email' }, 400, 'INVALID_EMAIL'],
        [{ name: 'س', openingBalance: '1.1234567' }, 400], // أكتر من 6 خانات (DEC-0112)
        [{ name: 'س', openingBalance: 100 }, 400],
        [{ name: 'س', openingBalance: '12345678901234.123400' }, 422, 'PRECISION_LIMIT'],
      ];
      for (const [body, status, code] of cases) {
        const r = await t.http().post('/api/v1/suppliers').set(bearer(admin)).send(body);
        expect([JSON.stringify(body), r.status, code ? r.body.code : undefined]).toEqual([JSON.stringify(body), status, code]);
      }
    });

    it('legacy writes are visible in the API and vice versa (parity)', async () => {
      expect((await sync(t, admin, { changes: [
        up('ledger.suppliers', 'sup_legacy1', { id: 'sup_legacy1', name: 'أحمد للتوريدات', openingBalance: 2000.1234565, phone: '0100', attachments: [{ id: 'a1' }] }),
        up('ledger.invoices', 'inv_t1', { supplierId: 'sup_legacy1', invoiceNo: '1' }), up('ledger.invoices', 'inv_t2', { supplierId: 'sup_legacy1', invoiceNo: '2' }),
        up('ledger.payments', 'pay_t1', { supplierId: 'sup_legacy1', amount: 5 }),
      ] })).status).toBe(200);
      const g = await t.http().get('/api/v1/suppliers/sup_legacy1').set(bearer(viewer)).expect(200);
      expect(g.body).toMatchObject({ name: 'أحمد للتوريدات', openingBalance: '2000.123457', attachmentsCount: 1, invoicesCount: 2, paymentsCount: 1 });
      const s = await t.http().get('/api/v1/suppliers?q=' + encodeURIComponent('احمد')).set(bearer(viewer)).expect(200);
      expect(s.body.items.map((x: { id: string }) => x.id)).toEqual(['sup_legacy1']);

      const p = await t.http().patch('/api/v1/suppliers/sup_legacy1').set(bearer(ledger)).send({ rev: g.body.rev, notes: 'ملاحظة من الواجهة الجديدة', iban: 'EG00' });
      expect(p.status).toBe(200);
      const legacy = ((await bootstrap(t, admin)).data.ledger.suppliers as Record<string, unknown>[]).find((x) => x.id === 'sup_legacy1')!;
      expect(legacy).toMatchObject({ notes: 'ملاحظة من الواجهة الجديدة', iban: 'EG00', openingBalance: 2000.1234565, attachments: [{ id: 'a1' }] });
      const h = await t.http().get('/api/v1/history/ledger.suppliers/sup_legacy1').set(bearer(admin)).expect(200);
      expect(h.body.changes[0].fields).toEqual(expect.arrayContaining(['notes', 'iban']));
    });

    it('legacy data kept as-is: placeholder tax id "_" (edit path never validated it) — editing other fields works, changing it is validated', async () => {
      expect((await sync(t, admin, { changes: [up('ledger.suppliers', 'sup_us', { id: 'sup_us', name: 'مورد قديم', taxId: '_' })] })).status).toBe(200);
      const g = await t.http().get('/api/v1/suppliers/sup_us').set(bearer(admin));
      expect((await t.http().patch('/api/v1/suppliers/sup_us').set(bearer(admin)).send({ rev: g.body.rev, taxId: '_', phone: '1' })).status).toBe(200);
      expect((await t.http().patch('/api/v1/suppliers/sup_us').set(bearer(admin)).send({ rev: g.body.rev + 1, taxId: '12' })).body.code).toBe('TAX_ID_TOO_SHORT');
    });

    it('stale rev on a guarded field → 409 CONFLICT, nothing saved', async () => {
      const g = await t.http().get(`/api/v1/suppliers/${id}`).set(bearer(admin)).expect(200);
      expect((await sync(t, admin, { changes: [up('ledger.suppliers', id, { openingBalanceDate: '2026-02-01' }, g.body.rev)] })).status).toBe(200);
      const r = await t.http().patch(`/api/v1/suppliers/${id}`).set(bearer(admin)).send({ rev: g.body.rev, openingBalanceDate: '2026-03-01' });
      expect([r.status, r.body.code]).toEqual([409, 'CONFLICT']);
      expect((await t.http().get(`/api/v1/suppliers/${id}`).set(bearer(admin))).body.openingBalanceDate).toBe('2026-02-01');
    });

    it('permissions follow the page: viewer reads only; unknown id 404', async () => {
      expect((await t.http().get('/api/v1/suppliers').set(bearer(viewer))).status).toBe(200);
      expect((await t.http().post('/api/v1/suppliers').set(bearer(viewer)).send({ name: 'x' })).status).toBe(403);
      expect((await t.http().patch(`/api/v1/suppliers/${id}`).set(bearer(viewer)).send({ rev: 1, name: 'x' })).status).toBe(403);
      expect((await t.http().get('/api/v1/suppliers/nope').set(bearer(admin))).status).toBe(404);
      expect((await t.http().get('/api/v1/suppliers').set(bearer(sales))).status).toBe(403);
    });
  });

  describe('customers', () => {
    it('code generated like clNextCode (prefix + max+1, 4 digits); full legacy shape', async () => {
      expect((await sync(t, admin, { changes: [up('clients.customers', 'cus_legacy1', { id: 'cus_legacy1', name: 'عميل قديم', code: 'CUS-0007', openingBalance: 300 })] })).status).toBe(200);
      const r = await t.http().post('/api/v1/customers').set(bearer(admin)).send({ name: 'شركة اختبار', openingBalance: '1500.25', contacts: [{ name: 'م. اختبار', phone: '0111' }, { name: '  ' }] });
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({ code: 'CUS-0008', status: 'active', openingBalance: '1500.250000', contacts: [{ name: 'م. اختبار', title: '', phone: '0111', email: '' }] });
      const legacy = ((await bootstrap(t, admin)).data.clients.customers as Record<string, unknown>[]).find((c) => c.id === r.body.id)!;
      for (const k of ['contracts', 'invoices', 'collections', 'workSurveys', 'boqs', 'guarantees', 'ledger', 'comms', 'opportunities', 'projects', 'docs', 'attachments', 'extraFields']) expect(legacy[k]).toEqual([]);
      expect(legacy).toMatchObject({ openingBalance: 1500.25, code: 'CUS-0008' });
      expect(typeof legacy.createdAt).toBe('string');
      const r2 = await t.http().post('/api/v1/customers').set(bearer(admin)).send({ name: 'عميل تاني', code: '' });
      expect(r2.body.code).toBe('CUS-0009');
    });

    it('decisions 2026-11-17: customer code unique (case/space-insensitive), customer email validated', async () => {
      const d = await t.http().post('/api/v1/customers').set(bearer(admin)).send({ name: 'مكرر', code: ' cus-0007 ' });
      expect([d.status, d.body.code]).toEqual([409, 'DUPLICATE_CODE']);
      const e = await t.http().post('/api/v1/customers').set(bearer(admin)).send({ name: 'بريد', email: 'bad@' });
      expect([e.status, e.body.code]).toEqual([400, 'INVALID_EMAIL']);
      const c = await t.http().get('/api/v1/customers/cus_legacy1').set(bearer(admin));
      expect((await t.http().patch('/api/v1/customers/cus_legacy1').set(bearer(admin)).send({ rev: c.body.rev, code: 'CUS-0007', city: 'x' })).status).toBe(200);
    });

    it('opening balance limited to 2 decimals (legacy toInt → round2 compatibility)', async () => {
      const r = await t.http().post('/api/v1/customers').set(bearer(admin)).send({ name: 'س', openingBalance: '10.125' });
      expect([r.status, r.body.code]).toEqual([400, 'SCALE_LIMIT']);
      // القيمة الراجعة من الـ API (4 خانات) تترجع زي ما هي من غير خطأ
      const ok = await t.http().post('/api/v1/customers').set(bearer(admin)).send({ name: 'س', openingBalance: '10.120000' });
      expect([ok.status, ok.body.openingBalance]).toEqual([201, '10.120000']);
    });

    it('guarded opening balance: hidden from users without account pages and not writable by them', async () => {
      // المبيعات بتشوف صفحات العملاء كلها (clientsRole viewOnly "*") — يعني بتشوف الرصيد في النظام الحالي
      expect((await t.http().get('/api/v1/customers').set(bearer(sales))).body.items[0].openingBalance).not.toBeNull();
      const l = await t.http().get('/api/v1/customers').set(bearer(crm)).expect(200);
      expect(l.body.items.every((c: { openingBalance: unknown }) => c.openingBalance === null)).toBe(true);
      const c = await t.http().post('/api/v1/customers').set(bearer(crm)).send({ name: 'عميل خدمة العملاء' });
      expect(c.status).toBe(201);
      const w = await t.http().patch(`/api/v1/customers/${c.body.id}`).set(bearer(crm)).send({ rev: c.body.rev, openingBalance: '5' });
      expect([w.status, w.body.code]).toEqual([403, 'FIELD_FORBIDDEN']);
      const ok = await t.http().patch(`/api/v1/customers/${c.body.id}`).set(bearer(crm)).send({ rev: c.body.rev, city: 'القاهرة' });
      expect(ok.body).toMatchObject({ city: 'القاهرة', rev: 2 });
      expect((await t.http().post('/api/v1/customers').set(bearer(ledger)).send({ name: 'x' })).status).toBe(403);
    });
  });

  describe('migration plan (dry-run, step 7 not executed)', () => {
    it('admin only; read-only; reports blockers and rounding without writing', async () => {
      expect((await sync(t, admin, { changes: [up('ledger.suppliers', 'sup_dup', { id: 'sup_dup', name: 'احمد للتوريدات ' })] })).status).toBe(200);
      expect((await t.http().get('/api/v1/suppliers/migration-plan').set(bearer(ledger))).status).toBe(403);
      const p = await t.http().get('/api/v1/suppliers/migration-plan').set(bearer(admin)).expect(200);
      expect(p.body).toMatchObject({ dryRun: true, executed: false, relationalRowsNow: { suppliers: 0, customers: 0 }, ready: true });
      expect(p.body.counts).toMatchObject({ supplierInvoices: 2, supplierPayments: 1 });
      // قرار 2026-11-17: اسم المورد مش فريد → تنبيه بس، مش معوّق
      expect(p.body.warnings.supplierDuplicateNames).toEqual([['sup_legacy1', 'sup_dup']]);
      expect(p.body.blockers.supplierDuplicateNames).toBeUndefined();
      expect(p.body.warnings.roundingChanges).toEqual([{ id: 'sup_legacy1', original: '2000.1234565', migrated: '2000.123457', changed: true }]);
      const [{ n }] = await t.ds.query(`SELECT (SELECT count(*) FROM suppliers) + (SELECT count(*) FROM customers) AS n`);
      expect(Number(n)).toBe(0);
    });
  });
});
