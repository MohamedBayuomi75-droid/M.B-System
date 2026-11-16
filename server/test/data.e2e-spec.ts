import { adminToken, bearer, bootstrap, createTestApp, newUser, sync, TestApp } from './app';

describe('A3 data layer: bootstrap + sync', () => {
  let t: TestApp;
  let admin: string;
  const up = (collection: string, id: string, baseRev: number, set: Record<string, unknown>, unset?: string[]) => ({ collection, id, op: 'upsert', baseRev, set, ...(unset ? { unset } : {}) });
  const del = (collection: string, id: string, baseRev: number) => ({ collection, id, op: 'delete', baseRev });

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    // بيانات أساسية: مشروعين، عمال بأجور، موظف براتب
    const r = await sync(t, admin, { changes: [
      up('projects', 'p1', 0, { name: 'مشروع الشروق', code: 'PRJ-1' }),
      up('projects', 'p2', 0, { name: 'مشروع النيل', code: 'PRJ-2' }),
      up('employees', 'e1', 0, { name: 'محمد', salary: 9000, phone: '010' }),
      up('workers', 'w1', 0, { name: 'عامل 1', dailyWage: 350, projectId: 'p1' }),
      up('workers', 'w2', 0, { name: 'عامل 2', dailyWage: 300, projectId: 'p2' }),
      up('workerAttendance', 'a1', 0, { personId: 'w1', date: '2026-11-01', status: 'present', days: 1, dayWage: 350, projectId: 'p1' }),
      up('workerAttendance', 'a2', 0, { personId: 'w2', date: '2026-11-01', status: 'present', days: 1, dayWage: 300, projectId: 'p2' }),
      up('ledger.invoices', 'inv1', 0, { supplierId: 's1', totalInvoice: 1000, vat: 140, notes: '' }),
    ] });
    expect(r.status).toBe(200);
    expect(r.body.applied.every((a: { op: string; rev: number }) => a.op === 'insert' && a.rev === 1)).toBe(true);
  });
  afterAll(async () => { await t?.close(); });

  describe('bootstrap', () => {
    it('returns DATA-shaped data with every collection as an array + meta revs', async () => {
      const b = await bootstrap(t, admin);
      expect(b.data.schemaVersion).toBe(9);
      expect(b.data.users).toEqual([]);
      expect(Array.isArray(b.data.employees)).toBe(true);
      expect(Array.isArray(b.data.ledger.suppliers)).toBe(true);
      expect(Array.isArray(b.data.clients.contracts)).toBe(true);
      expect(Array.isArray(b.data.warehouses.movements)).toBe(true);
      expect(b.data.employees).toEqual([{ id: 'e1', name: 'محمد', salary: 9000, phone: '010' }]);
      expect(b.meta.revs.employees).toEqual({ e1: 1 });
      expect(b.meta.hidden).toEqual([]);
      expect(b.meta.writable.employees).toEqual({ add: true, edit: true, delete: true });
      expect(b.seq).toBeGreaterThan(0);
    });

    it('requires authentication', async () => {
      expect((await t.http().get('/api/bootstrap')).status).toBe(401);
      expect((await t.http().post('/api/sync').send({})).status).toBe(401);
    });
  });

  describe('viewer cannot modify anything — even with a hand-made request', () => {
    let viewer: string;
    beforeAll(async () => { viewer = (await newUser(t, admin, 'viewer1', 'viewer')).token; });

    it('reads but every write is 403 and nothing is stored (whole batch rejected)', async () => {
      const b = await bootstrap(t, viewer);
      expect(b.data.employees).toHaveLength(1);
      expect(b.meta.writable.employees).toEqual({ add: false, edit: false, delete: false });
      expect(b.meta.docsWritable).toBe(false);
      for (const change of [up('employees', 'e1', 1, { name: 'hacked' }), up('employees', 'new1', 0, { name: 'x' }), del('employees', 'e1', 1)]) {
        const r = await sync(t, viewer, { changes: [change] });
        expect(r.status).toBe(403);
        expect(r.body.code).toBe('FORBIDDEN');
      }
      expect((await sync(t, viewer, { docs: [{ key: 'settings', baseRev: 0, op: 'patch', set: { companyName: 'x' } }] })).status).toBe(403);
      const after = await bootstrap(t, admin);
      expect(after.data.employees).toEqual([{ id: 'e1', name: 'محمد', salary: 9000, phone: '010' }]);
      expect(after.meta.revs.employees.new1).toBeUndefined();
    });
  });

  describe('sensitive fields (field-guards)', () => {
    let clerk: string;
    beforeAll(async () => {
      clerk = (await newUser(t, admin, 'hrclerk', 'custom', {
        editData: true,
        pages: [{ page: 'employees', view: true, add: true, edit: true, delete: false }, { page: 'workers', view: true, add: false, edit: false, delete: false }],
      })).token;
    });

    it('without payroll view: salaries/wages are not in bootstrap', async () => {
      const b = await bootstrap(t, clerk);
      expect(b.data.employees).toEqual([{ id: 'e1', name: 'محمد', phone: '010' }]);
      expect(b.data.workers.map((w: Record<string, unknown>) => 'dailyWage' in w)).toEqual([false, false]);
      expect(b.meta.hiddenFields.employees).toContain('salary');
      expect(b.meta.hidden).toContain('payroll');
    });

    it('editing other fields keeps the hidden salary; writing the salary is 403 FIELD_FORBIDDEN', async () => {
      const ok = await sync(t, clerk, { changes: [up('employees', 'e1', 1, { phone: '011' })] });
      expect(ok.status).toBe(200);
      expect(ok.body.applied[0]).toMatchObject({ op: 'update', rev: 2 });
      const [row] = await t.ds.query(`SELECT data FROM records WHERE collection='employees' AND id='e1'`);
      expect(row.data).toEqual({ id: 'e1', name: 'محمد', salary: 9000, phone: '011' });
      for (const change of [up('employees', 'e1', 2, { salary: 1 }), up('employees', 'e1', 2, {}, ['salary']), up('employees', 'e9', 0, { name: 'x', salary: 5 })]) {
        const r = await sync(t, clerk, { changes: [change] });
        expect(r.status).toBe(403);
        expect(r.body.code).toBe('FIELD_FORBIDDEN');
      }
    });

    it('conflict responses and /api/changes also hide the salary', async () => {
      const c = await sync(t, clerk, { changes: [del('employees', 'e1', 1)] }); // مالوش delete
      expect(c.status).toBe(403);
      const ch = await t.http().get('/api/changes?since=0').set(bearer(clerk));
      const emp = ch.body.changes.filter((e: { collection: string }) => e.collection === 'employees');
      expect(emp.length).toBeGreaterThan(0);
      for (const e of emp) expect(e.data).not.toHaveProperty('salary');
      expect(ch.body.changes.some((e: { collection: string }) => e.collection === 'ledger.invoices')).toBe(false);
    });
  });

  describe('project scope (projectManager)', () => {
    let pm: string;
    beforeAll(async () => { pm = (await newUser(t, admin, 'pm1', 'projectManager', { projectScope: ['p1'] })).token; });

    it('sees only rows of p1 in project-bound collections, without wages', async () => {
      const b = await bootstrap(t, pm);
      expect(b.data.projects.map((p: { id: string }) => p.id)).toEqual(['p1']);
      expect(b.data.workerAttendance.map((a: { id: string }) => a.id)).toEqual(['a1']);
      expect(b.data.workerAttendance[0]).not.toHaveProperty('dayWage');
      expect(b.data.workers.map((w: { id: string }) => w.id)).toEqual(['w1']);
      expect(b.meta.hidden).toEqual(expect.arrayContaining(['payroll', 'attendance', 'ledger.invoices']));
      expect(b.data.employees).toEqual([]); // الموظف e1 مش مربوط بمشروع من مشاريعه
    });

    it('can record attendance for p1 (wage filled by the server), not for p2', async () => {
      const ok = await sync(t, pm, { changes: [up('workerAttendance', 'a3', 0, { personId: 'w1', date: '2026-11-02', status: 'present', days: 1, projectId: 'p1' })] });
      expect(ok.status).toBe(200);
      const [row] = await t.ds.query(`SELECT data, project_id FROM records WHERE collection='workerAttendance' AND id='a3'`);
      expect(row.data.dayWage).toBe(350); // من أجر العامل المسجّل
      expect(row.project_id).toBe('p1');
      const bad = await sync(t, pm, { changes: [up('workerAttendance', 'a4', 0, { personId: 'w2', date: '2026-11-02', projectId: 'p2' })] });
      expect(bad.status).toBe(403);
      expect(bad.body.details[0].reason).toBe('OUT_OF_PROJECT_SCOPE');
      const moveOut = await sync(t, pm, { changes: [up('workerAttendance', 'a3', 1, { projectId: 'p2' })] });
      expect(moveOut.status).toBe(403);
      const noProject = await sync(t, pm, { changes: [up('workerAttendance', 'a5', 0, { personId: 'w1', date: '2026-11-03' })] });
      expect(noProject.status).toBe(403);
      const otherRow = await sync(t, pm, { changes: [up('workerAttendance', 'a2', 1, { notes: 'x' })] });
      expect(otherRow.status).toBe(403);
    });
  });

  describe('conflicts (two users, same base revision)', () => {
    let u1: string; let u2: string;
    beforeAll(async () => {
      u1 = (await newUser(t, admin, 'acc1', 'ledgerAccountant')).token;
      u2 = (await newUser(t, admin, 'acc2', 'ledgerAccountant')).token;
    });
    const rev = async (id: string) => (await t.ds.query(`SELECT rev FROM records WHERE collection='ledger.invoices' AND id=$1`, [id]))[0].rev as number;

    it('different fields → both merged', async () => {
      await sync(t, admin, { changes: [up('ledger.invoices', 'm1', 0, { supplierId: 's1', totalInvoice: 500, notes: 'a', description: 'd' })] });
      expect((await sync(t, u1, { changes: [up('ledger.invoices', 'm1', 1, { notes: 'من الأول' })] })).body.applied[0].op).toBe('update');
      const r2 = await sync(t, u2, { changes: [up('ledger.invoices', 'm1', 1, { totalInvoice: 600 })] });
      expect(r2.body.applied[0]).toMatchObject({ op: 'update', rev: 3 });
      expect(r2.body.conflicts).toEqual([]);
      const [row] = await t.ds.query(`SELECT data FROM records WHERE collection='ledger.invoices' AND id='m1'`);
      expect(row.data).toMatchObject({ notes: 'من الأول', totalInvoice: 600, description: 'd' });
    });

    it('same FINANCIAL field → explicit conflict, nothing silently overwritten', async () => {
      await sync(t, admin, { changes: [up('ledger.invoices', 'm2', 0, { supplierId: 's1', totalInvoice: 1000 })] });
      expect((await sync(t, u1, { changes: [up('ledger.invoices', 'm2', 1, { totalInvoice: 1100 })] })).body.applied[0].op).toBe('update');
      const r2 = await sync(t, u2, { changes: [up('ledger.invoices', 'm2', 1, { totalInvoice: 1200, notes: 'x' })] });
      expect(r2.status).toBe(200);
      expect(r2.body.applied).toEqual([]);
      expect(r2.body.conflicts[0]).toMatchObject({ collection: 'ledger.invoices', id: 'm2', reason: 'field_conflict', fields: ['totalInvoice'], current: { rev: 2, data: { totalInvoice: 1100 } } });
      const [row] = await t.ds.query(`SELECT data FROM records WHERE collection='ledger.invoices' AND id='m2'`);
      expect(row.data.totalInvoice).toBe(1100);
      expect(row.data.notes).toBeUndefined(); // التغيير كله اترفض (مش نصه)
      // بعد ما العميل يشوف النسخة الحالية يقدر يعيد بالـ rev الصح
      expect((await sync(t, u2, { changes: [up('ledger.invoices', 'm2', 2, { totalInvoice: 1200 })] })).body.applied[0].op).toBe('update');
    });

    it('same plain-text field → last writer wins, reported in overwrote; structured field → conflict', async () => {
      await sync(t, admin, { changes: [up('ledger.invoices', 'm3', 0, { supplierId: 's1', notes: 'أصل', linkedReturnIds: [] , extra: { a: 1 } })] });
      await sync(t, u1, { changes: [up('ledger.invoices', 'm3', 1, { notes: 'u1', extra: { a: 2 } })] });
      const r2 = await sync(t, u2, { changes: [up('ledger.invoices', 'm3', 1, { notes: 'u2' })] });
      expect(r2.body.applied[0]).toMatchObject({ op: 'update', overwrote: ['notes'] });
      const r3 = await sync(t, u2, { changes: [up('ledger.invoices', 'm3', 1, { extra: { a: 3 } })] });
      expect(r3.body.conflicts[0]).toMatchObject({ reason: 'field_conflict', fields: ['extra'] });
      const [ch] = await t.ds.query(`SELECT diff FROM changes WHERE collection='ledger.invoices' AND record_id='m3' ORDER BY seq DESC LIMIT 1`);
      expect(ch.diff.overwrote).toEqual(['notes']);
    });

    it('same value written twice = noop (no conflict, no new rev)', async () => {
      const before = await rev('m1');
      const r = await sync(t, u1, { changes: [up('ledger.invoices', 'm1', 1, { totalInvoice: 600 })] });
      expect(r.body.applied[0]).toMatchObject({ op: 'noop', rev: before });
    });

    it('delete after someone edited → changed_since; edit after delete → deleted; delete twice → noop', async () => {
      await sync(t, admin, { changes: [up('ledger.invoices', 'm4', 0, { supplierId: 's1', notes: 'n' })] });
      await sync(t, u1, { changes: [up('ledger.invoices', 'm4', 1, { notes: 'edited' })] });
      const d1 = await sync(t, admin, { changes: [del('ledger.invoices', 'm4', 1)] });
      expect(d1.body.conflicts[0].reason).toBe('changed_since');
      expect((await sync(t, admin, { changes: [del('ledger.invoices', 'm4', 2)] })).body.applied[0]).toMatchObject({ op: 'delete', rev: 3 });
      const e = await sync(t, u1, { changes: [up('ledger.invoices', 'm4', 2, { notes: 'late' })] });
      expect(e.body.conflicts[0]).toMatchObject({ reason: 'deleted', current: null });
      expect((await sync(t, admin, { changes: [del('ledger.invoices', 'm4', 3)] })).body.applied[0].op).toBe('noop');
      const b = await bootstrap(t, admin);
      expect(b.data.ledger.invoices.some((i: { id: string }) => i.id === 'm4')).toBe(false);
      // استرجاع من سلة المهملات (سجل جديد بنفس الـ id، baseRev 0)
      expect((await sync(t, admin, { changes: [up('ledger.invoices', 'm4', 0, { supplierId: 's1', notes: 'restored' })] })).body.applied[0]).toMatchObject({ op: 'insert', rev: 4 });
    });

    it('"new" record that already exists (baseRev 0) → its financial fields conflict', async () => {
      const r = await sync(t, u1, { changes: [up('ledger.invoices', 'm1', 0, { totalInvoice: 1 })] });
      expect(r.body.conflicts[0]).toMatchObject({ reason: 'field_conflict', fields: ['totalInvoice'] });
    });

    it('baseRev ahead of the server → bad_rev', async () => {
      const r = await sync(t, u1, { changes: [up('ledger.invoices', 'm1', 999, { notes: 'x' })] });
      expect(r.body.conflicts[0].reason).toBe('bad_rev');
    });
  });

  describe('docs (settings / lookups)', () => {
    it('patch merges different keys; concurrent nextPaymentNo → conflict; arrayDelta always merges', async () => {
      const a = await sync(t, admin, { docs: [{ key: 'settings', baseRev: 0, op: 'set', value: { companyName: 'شركة', nextPaymentNo: 10 } }] });
      expect(a.body.docsApplied[0]).toMatchObject({ key: 'settings', rev: 1, op: 'set' });
      await sync(t, admin, { docs: [{ key: 'settings', baseRev: 1, op: 'patch', set: { companyPhone: '02' } }] });
      const p2 = await sync(t, admin, { docs: [{ key: 'settings', baseRev: 1, op: 'patch', set: { companyAddress: 'القاهرة' } }] });
      expect(p2.body.docsApplied[0].rev).toBe(3);
      await sync(t, admin, { docs: [{ key: 'settings', baseRev: 3, op: 'patch', set: { nextPaymentNo: 11 } }] });
      const n2 = await sync(t, admin, { docs: [{ key: 'settings', baseRev: 3, op: 'patch', set: { nextPaymentNo: 11 } }] });
      expect(n2.body.docsApplied[0].op).toBe('noop'); // نفس القيمة
      const n3 = await sync(t, admin, { docs: [{ key: 'settings', baseRev: 3, op: 'patch', set: { nextPaymentNo: 12 } }] });
      expect(n3.body.docConflicts[0]).toMatchObject({ key: 'settings', reason: 'field_conflict', fields: ['nextPaymentNo'] });

      await sync(t, admin, { docs: [{ key: 'ledger.customItemNames', baseRev: 0, op: 'arrayDelta', add: ['أسمنت'] }] });
      await sync(t, admin, { docs: [{ key: 'ledger.customItemNames', baseRev: 0, op: 'arrayDelta', add: ['حديد'] }] });
      await sync(t, admin, { docs: [{ key: 'ledger.customItemNames', baseRev: 1, op: 'arrayDelta', add: ['حديد', 'رمل'], remove: ['أسمنت'] }] });
      const b = await bootstrap(t, admin);
      expect(b.data.ledger.customItemNames).toEqual(['حديد', 'رمل']);
      expect(b.data.settings).toEqual({ companyName: 'شركة', nextPaymentNo: 11, companyPhone: '02', companyAddress: 'القاهرة' });
      expect(b.meta.docRevs.settings).toBe(4);
    });

    it('stale full set → changed_since; schemaVersion is server-owned (ignored); unknown key → 400', async () => {
      const s = await sync(t, admin, { docs: [{ key: 'formLayouts', baseRev: 0, op: 'set', value: { employees: [] } }] });
      expect(s.body.docsApplied[0].rev).toBe(1);
      await sync(t, admin, { docs: [{ key: 'formLayouts', baseRev: 1, op: 'set', value: { employees: ['a'] } }] });
      const stale = await sync(t, admin, { docs: [{ key: 'formLayouts', baseRev: 1, op: 'set', value: { employees: ['b'] } }] });
      expect(stale.body.docConflicts[0].reason).toBe('changed_since');
      expect((await sync(t, admin, { docs: [{ key: 'schemaVersion', baseRev: 0, op: 'set', value: 1 }] })).body.docsApplied[0].op).toBe('ignored');
      expect((await bootstrap(t, admin)).data.schemaVersion).toBe(9);
      expect((await sync(t, admin, { docs: [{ key: 'evilKey', baseRev: 0, op: 'set', value: 1 }] })).status).toBe(400);
    });
  });

  describe('legacy audit log (DATA.auditLog)', () => {
    it('append-only, attributed by the server (client "user" ignored); trims/edits ignored', async () => {
      const acc = (await newUser(t, admin, 'auditor', 'hr')).token;
      const r = await sync(t, acc, { changes: [
        { collection: 'auditLog', id: 'log_1', op: 'upsert', baseRev: 0, set: { id: 'log_1', at: '2026-11-16T10:00:00Z', action: 'إضافة موظف', details: 'محمد', user: 'admin (مزوّر)' } },
        { collection: 'auditLog', id: 'log_old', op: 'delete', baseRev: 1 },
      ] });
      expect(r.status).toBe(200);
      expect(r.body.applied.map((a: { op: string }) => a.op)).toEqual(['insert', 'ignored']);
      expect((await sync(t, acc, { changes: [{ collection: 'auditLog', id: 'log_1', op: 'upsert', baseRev: 0, set: { action: 'dup' } }] })).body.applied[0].op).toBe('noop');
      const b = await bootstrap(t, admin);
      const e = b.data.auditLog.find((x: { id: string }) => x.id === 'log_1');
      expect(e).toMatchObject({ action: 'إضافة موظف', details: 'محمد', user: 'auditor', at: '2026-11-16T10:00:00Z' });
      expect(b.data.auditLog.some((x: { action: string }) => x.action === 'auth.login')).toBe(true);
      // مستخدم من غير صفحة النسخ الاحتياطي ومش مدير مستخدمين مايشوفش السجل
      const pmTok = (await newUser(t, admin, 'pm_audit', 'projectManager', { projectScope: ['p1'] })).token;
      expect((await bootstrap(t, pmTok)).data.auditLog).toEqual([]);
    });
  });

  describe('validation (400, nothing applied)', () => {
    it.each([
      [{ changes: [up('notACollection', 'x', 0, { a: 1 })] }],
      [{ changes: [up('users', 'u', 0, { username: 'x' })] }],
      [{ changes: [up('employees', 'x', 0, { id: 'different' })] }],
      [{ changes: [up('employees', 'dup', 0, { a: 1 }), up('employees', 'dup', 0, { a: 2 })] }],
      [{ changes: [{ collection: 'employees', id: 'x', op: 'upsert', baseRev: 0 }] }],
      [{ changes: [{ collection: 'employees', id: 'has space', op: 'upsert', baseRev: 0, set: { a: 1 } }] }],
      [{ changes: [{ collection: 'employees', id: 'x', op: 'merge', baseRev: 0, set: {} }] }],
      [{ changes: [{ collection: 'employees', id: 'x', op: 'upsert', baseRev: -1, set: { a: 1 } }] }],
      [{ changes: [up('employees', 'x', 0, { a: 1 })], extra: true }],
      [{ docs: [{ key: 'settings', baseRev: 0, op: 'patch' }] }],
    ])('rejects %j', async (body) => {
      const r = await sync(t, admin, body as never);
      expect(r.status).toBe(400);
    });

    it('a 5MB batch is accepted (body limit raised for first sync)', async () => {
      const big = 'x'.repeat(50_000);
      const changes = Array.from({ length: 100 }, (_, i) => up('dailyTasks', `big${i}`, 0, { title: big }));
      const r = await sync(t, admin, { changes });
      expect(r.status).toBe(200);
      expect(r.body.applied).toHaveLength(100);
    });
  });

  it('OpenAPI documents the compat data API', async () => {
    const doc = (await t.http().get('/api/docs-json')).body;
    for (const p of ['/api/bootstrap', '/api/sync', '/api/changes']) expect(doc.paths[p]).toBeDefined();
    expect(Object.keys(doc.components.schemas)).toEqual(expect.arrayContaining(['BootstrapDto', 'SyncRequestDto', 'SyncResponseDto', 'RecordChangeDto', 'DocChangeDto', 'ConflictRecordDto', 'ChangesResponseDto']));
  });

  describe('GET /api/changes (catch-up)', () => {
    it('pages through changes in seq order with hasMore', async () => {
      const p1 = await t.http().get('/api/changes?since=0&limit=5').set(bearer(admin));
      expect(p1.body.changes).toHaveLength(5);
      expect(p1.body.hasMore).toBe(true);
      const seqs = p1.body.changes.map((c: { seq: number }) => c.seq);
      expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);
      const p2 = await t.http().get(`/api/changes?since=${p1.body.seq}&limit=5`).set(bearer(admin));
      expect(p2.body.changes[0].seq).toBeGreaterThan(p1.body.seq);
      expect((await t.http().get('/api/changes?since=-1').set(bearer(admin))).status).toBe(400);
    });

    it('every write produced a change row with the author', async () => {
      const [r] = await t.ds.query(`SELECT count(*)::int AS n, count(user_id)::int AS with_user FROM changes`);
      expect(r.n).toBeGreaterThan(20);
      expect(r.with_user).toBe(r.n);
    });
  });
});
