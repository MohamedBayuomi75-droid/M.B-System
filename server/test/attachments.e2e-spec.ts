import { adminToken, bearer, createTestApp, newUser, sync, TestApp } from './app';
import { docx, pdf, png, xlsx } from '../src/files/file-fixtures.spec-helper';

/** المرحلة 2 — S-5: رفع/تنزيل المرفقات بالفحص وصلاحية السجل المالك. */
describe('attachments security (phase 2)', () => {
  let t: TestApp;
  let admin: string;
  let viewer: string;
  let pm: string; // مدير مشروع p1 بس
  let ledger: string; // محاسب الموردين — مالوش على العمال
  const up = (collection: string, id: string, set: Record<string, unknown>) => ({ collection, id, op: 'upsert', baseRev: 0, set });
  const upload = (tok: string, collection: string, recordId: string, buf: Buffer, name: string) =>
    t.http().post(`/api/attachments?collection=${encodeURIComponent(collection)}&recordId=${encodeURIComponent(recordId)}`).set(bearer(tok)).attach('file', buf, name);

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    const r = await sync(t, admin, { changes: [
      up('projects', 'p1', { name: 'م1' }), up('projects', 'p2', { name: 'م2' }),
      up('workers', 'w1', { name: 'ع1', projectId: 'p1' }), up('workers', 'w2', { name: 'ع2', projectId: 'p2' }),
      up('ledger.invoices', 'inv1', { supplierId: 's1', totalInvoice: 100 }),
    ] });
    expect(r.status).toBe(200);
    viewer = (await newUser(t, admin, 'att_viewer', 'viewer')).token;
    pm = (await newUser(t, admin, 'att_pm', 'projectManager', { projectScope: ['p1'] })).token;
    ledger = (await newUser(t, admin, 'att_ledger', 'ledgerAccountant')).token;
  });
  afterAll(async () => t?.close());

  let pdfId = '';
  it('admin uploads allowed types; metadata comes from content; download is forced attachment + sandboxed', async () => {
    const r = await upload(admin, 'ledger.invoices', 'inv1', pdf(), 'فاتورة مارس.pdf');
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ collection: 'ledger.invoices', recordId: 'inv1', filename: 'فاتورة مارس.pdf', kind: 'pdf', mime: 'application/pdf', size: pdf().length });
    pdfId = r.body.id;
    for (const [buf, name] of [[png(), 'scan.png'], [docx(), 'contract.docx'], [xlsx(), 'boq.xlsx']] as const) expect((await upload(admin, 'ledger.invoices', 'inv1', buf, name)).status).toBe(201);
    const list = await t.http().get('/api/attachments?collection=ledger.invoices&recordId=inv1').set(bearer(admin)).expect(200);
    expect(list.body.map((a: { kind: string }) => a.kind)).toEqual(['pdf', 'png', 'docx', 'xlsx']);
    const d = await t.http().get(`/api/attachments/${pdfId}/content`).set(bearer(admin)).buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on('data', (x: Buffer) => c.push(x)); res.on('end', () => cb(null, Buffer.concat(c))); }).expect(200);
    expect(Buffer.compare(d.body as Buffer, pdf())).toBe(0);
    expect(d.headers['content-type']).toBe('application/pdf');
    expect(d.headers['content-disposition']).toMatch(/^attachment; .*filename\*=UTF-8''/);
    expect(d.headers['content-security-policy']).toBe("default-src 'none'; sandbox");
    expect(d.headers['x-content-type-options']).toBe('nosniff');
  });

  it('rejects disguised, active or oversized files with a reason code', async () => {
    const cases: Array<[Buffer, string, string]> = [
      [Buffer.from('MZ fake executable'), 'invoice.pdf', 'TYPE_NOT_ALLOWED'],
      [png(), 'photo.pdf', 'EXTENSION_MISMATCH'],
      [pdf('/OpenAction << /S /JavaScript /JS (x) >>'), 'a.pdf', 'PDF_ACTIVE_CONTENT'],
      [docx({ 'word/vbaProject.bin': 'x' }), 'a.docx', 'MACRO_OR_EXECUTABLE'],
      [Buffer.from('<svg onload=alert(1)>'), 'a.svg', 'TYPE_NOT_ALLOWED'],
    ];
    for (const [buf, name, code] of cases) {
      const r = await upload(admin, 'ledger.invoices', 'inv1', buf, name);
      expect([r.status, r.body.code]).toEqual([400, code]);
    }
    const [{ n }] = await t.ds.query(`SELECT count(*)::int AS n FROM audit_log WHERE action = 'attachment.rejected'`);
    expect(n).toBe(cases.length);
  });

  it('size limit enforced before the file is stored (413)', async () => {
    const big = Buffer.concat([pdf(), Buffer.alloc(25 * 1024 * 1024)]);
    const r = await upload(admin, 'ledger.invoices', 'inv1', big, 'big.pdf');
    expect(r.status).toBe(413);
  });

  it('missing file / unknown collection / missing record', async () => {
    expect((await t.http().post('/api/attachments?collection=ledger.invoices&recordId=inv1').set(bearer(admin))).body.code).toBe('NO_FILE');
    expect((await upload(admin, 'settings', 'x', pdf(), 'a.pdf')).body.code).toBe('BAD_OWNER');
    expect((await upload(admin, 'ledger.invoices', 'nope', pdf(), 'a.pdf')).status).toBe(404);
  });

  it('permissions follow the owner record: viewer can read but not upload; other module → 403', async () => {
    expect((await upload(viewer, 'ledger.invoices', 'inv1', pdf(), 'a.pdf')).status).toBe(403);
    expect((await t.http().get('/api/attachments?collection=ledger.invoices&recordId=inv1').set(bearer(viewer))).status).toBe(200);
    expect((await upload(ledger, 'workers', 'w1', pdf(), 'a.pdf')).status).toBe(403);
  });

  it('project scope: project manager of p1 can attach to w1 but not see or download w2 files', async () => {
    expect((await upload(pm, 'workers', 'w1', pdf(), 'id.pdf')).status).toBe(201);
    const w2 = await upload(admin, 'workers', 'w2', pdf(), 'id2.pdf');
    expect(w2.status).toBe(201);
    expect((await upload(pm, 'workers', 'w2', pdf(), 'x.pdf')).status).toBe(403);
    expect((await t.http().get('/api/attachments?collection=workers&recordId=w2').set(bearer(pm))).status).toBe(403);
    expect((await t.http().get(`/api/attachments/${w2.body.id}/content`).set(bearer(pm))).status).toBe(403);
    expect((await t.http().get(`/api/attachments/${pdfId}/content`).set(bearer(pm))).status).toBe(403); // فواتير الموردين مش من صلاحياته
  });

  it('uploads and downloads are audited; unauthenticated → 401', async () => {
    const rows: { action: string }[] = await t.ds.query(`SELECT action FROM audit_log WHERE action LIKE 'attachment.%'`);
    expect(rows.some((r) => r.action === 'attachment.upload')).toBe(true);
    expect(rows.some((r) => r.action === 'attachment.download')).toBe(true);
    expect((await t.http().get(`/api/attachments/${pdfId}/content`)).status).toBe(401);
  });
});
