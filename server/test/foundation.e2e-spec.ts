import { adminToken, bearer, createTestApp, newUser, sync, TestApp } from './app';
import { pdf, png } from '../src/files/file-fixtures.spec-helper';
import { NumberingService } from '../src/numbering/numbering.service';
import { ApprovalsService } from '../src/approvals/approvals.service';

/**
 * المرحلة 5 — الأساس المشترك. كل التعريفات هنا (أنواع مستندات/مسارات/مستويات/معتمدين) **بيانات اختبار بس**:
 * مفيش أي مسار أو حد أو دور متسجّل في النظام نفسه.
 */
describe('phase 5 foundation', () => {
  let t: TestApp;
  let admin: string;
  const u: Record<string, { id: string; token: string }> = {};
  let k = 0;
  const key = () => `test-key-${Date.now()}-${++k}`;
  const post = (tok: string, path: string, body: unknown, idem: string | null = key()) => {
    const r = t.http().post(path).set(bearer(tok));
    if (idem) r.set('idempotency-key', idem);
    return r.send(body as object);
  };
  const up = (collection: string, id: string, set: Record<string, unknown>, baseRev = 0) => ({ collection, id, op: 'upsert', baseRev, set });

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    for (const [name, role] of [['sub', 'ledgerAccountant'], ['a1', 'viewer'], ['a2', 'viewer'], ['a3', 'viewer'], ['pay1', 'payroll'], ['pay2', 'payroll'], ['out', 'viewer']] as const)
      u[name] = await newUser(t, admin, `f5_${name}`, role);
  });
  afterAll(async () => t?.close());

  it('migration seeds nothing: every new phase-5 table is empty', async () => {
    for (const tb of ['projects', 'user_action_permissions', 'document_counters', 'document_numbers', 'approval_document_types', 'approval_workflows',
      'approval_workflow_levels', 'approval_level_approvers', 'approval_requests', 'approval_request_steps', 'approval_decisions', 'approval_state_log', 'notifications']) {
      const [{ n }] = await t.ds.query(`SELECT count(*)::int AS n FROM ${tb}`);
      expect([tb, n]).toEqual([tb, 0]);
    }
  });

  describe('doc actions (4-level permissions)', () => {
    it('admin has every action; every other role none by default; grants are per user and audited', async () => {
      const me = await t.http().get('/api/me').set(bearer(admin)).expect(200);
      expect(Object.values(me.body.docActions).every(Boolean)).toBe(true);
      expect(me.body.modules).toContain('invoices');
      const sub = await t.http().get('/api/me').set(bearer(u.sub.token)).expect(200);
      expect(Object.values(sub.body.docActions).some(Boolean)).toBe(false);
      expect(sub.body.modules).toContain('invoices');
      expect(sub.body.modules).not.toContain('labor');

      const r = await t.http().put(`/api/users/${u.sub.id}/doc-actions`).set(bearer(admin)).send({ print: true, export: true });
      expect(r.status).toBe(200);
      const sub2 = await t.http().get('/api/me').set(bearer(u.sub.token)).expect(200);
      expect(sub2.body.docActions).toMatchObject({ print: true, export: true, approve: false, pay: false });
      await t.http().put(`/api/users/${u.sub.id}/doc-actions`).set(bearer(admin)).send({ export: null }).expect(200);
      expect((await t.http().get('/api/me').set(bearer(u.sub.token))).body.docActions.export).toBe(false);
      const [adm] = await t.ds.query(`SELECT id FROM users WHERE username = 'admin'`);
      expect((await t.http().put(`/api/users/${adm.id}/doc-actions`).set(bearer(admin)).send({ pay: false })).body.code).toBe('ADMIN_HAS_ALL');
      expect((await t.http().put(`/api/users/${u.sub.id}/doc-actions`).set(bearer(u.sub.token)).send({ pay: true })).status).toBe(403);
      const [{ n }] = await t.ds.query(`SELECT count(*)::int AS n FROM audit_log WHERE action = 'users.doc_actions'`);
      expect(n).toBe(2);
    });
  });

  describe('approvals engine', () => {
    let reqId = '';
    it('config is admin-only, validated, and requires explicit separation-of-duties flags', async () => {
      expect((await t.http().post('/api/v1/approvals/config/document-types').set(bearer(u.sub.token)).send({ code: 'test-invoice', name: 'x', module: 'ledger.invoices' })).status).toBe(403);
      expect((await t.http().post('/api/v1/approvals/config/document-types').set(bearer(admin)).send({ code: 'test-invoice', name: 'x', module: 'no.such.page' })).status).toBe(400);
      for (const [code, name] of [['test-invoice', 'فاتورة اختبار'], ['test-po', 'أمر شراء اختبار']])
        expect((await t.http().post('/api/v1/approvals/config/document-types').set(bearer(admin)).send({ code, name, module: 'ledger.invoices' })).status).toBe(201);
      // B-04: الاستثناء من فصل المهام محتاج مرجع اعتماد الإدارة
      const noRef = await t.http().post('/api/v1/approvals/config/workflows').set(bearer(admin)).send({ documentType: 'test-invoice', allowSelfApproval: true, levels: [{ mode: 'ANY', approvers: [{ type: 'USER', ref: u.a1.id }] }] });
      expect([noRef.status, noRef.body.code]).toEqual([400, 'SOD_EXCEPTION_REF_REQUIRED']);
      await expect(t.ds.query(`INSERT INTO approval_workflows (document_type, version, allow_same_approver_across_levels) VALUES ('test-invoice', 99, true)`)).rejects.toThrow(/sod_exception/);
      const [{ n }] = await t.ds.query(`SELECT count(*)::int AS n FROM approval_workflows`);
      expect(n).toBe(0);
      const badRole = await t.http().post('/api/v1/approvals/config/workflows').set(bearer(admin)).send({ documentType: 'test-invoice', allowSelfApproval: false, allowSameApproverAcrossLevels: false, levels: [{ mode: 'ANY', approvers: [{ type: 'ROLE', ref: 'ceo' }] }] });
      expect(badRole.status).toBe(400);
    });

    it('submitting with no workflow defined → 422 NO_WORKFLOW (no automatic approval)', async () => {
      const r = await post(u.sub.token, '/api/v1/approvals/requests', { documentType: 'test-invoice', documentId: 'inv-1', amount: '500.000000' });
      expect([r.status, r.body.code]).toEqual([422, 'NO_WORKFLOW']);
    });

    it('ANY then ALL(role): snapshot, idempotency, notifications, final approval', async () => {
      const wf = await t.http().post('/api/v1/approvals/config/workflows').set(bearer(admin)).send({
        documentType: 'test-invoice', amountFrom: '0.000000', amountTo: '1000.000000',
        levels: [{ mode: 'ANY', approvers: [{ type: 'USER', ref: u.a1.id }, { type: 'USER', ref: u.a2.id }] }, { mode: 'ALL', approvers: [{ type: 'ROLE', ref: 'payroll' }] }],
      });
      expect(wf.status).toBe(201);
      // B-04: من غير ما يتحدد → ممنوع افتراضيًا
      expect(wf.body).toMatchObject({ allow_self_approval: false, allow_same_approver_across_levels: false, sod_exception_ref: null });

      expect((await post(u.sub.token, '/api/v1/approvals/requests', { documentType: 'test-invoice', documentId: 'inv-1', amount: '500' }, null)).body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
      const k1 = key();
      const s = await post(u.sub.token, '/api/v1/approvals/requests', { documentType: 'test-invoice', documentId: 'inv-1', amount: '500' }, k1);
      expect(s.status).toBe(201);
      expect(s.body).toMatchObject({ status: 'Submitted', currentLevel: 1, amount: '500.000000', workflowVersion: 1, allowSelfApproval: false });
      reqId = s.body.id;
      const replay = await post(u.sub.token, '/api/v1/approvals/requests', { documentType: 'test-invoice', documentId: 'inv-1', amount: '500' }, k1);
      expect(replay.status).toBe(201);
      expect(replay.headers['idempotent-replay']).toBe('true');
      expect(replay.body.id).toBe(reqId);
      expect((await post(u.sub.token, '/api/v1/approvals/requests', { documentType: 'test-invoice', documentId: 'inv-2', amount: '500' }, k1)).body.code).toBe('IDEMPOTENCY_KEY_REUSED');
      expect((await post(u.sub.token, '/api/v1/approvals/requests', { documentType: 'test-invoice', documentId: 'inv-1', amount: '600' })).body.code).toBe('ALREADY_PENDING');
      const [{ n }] = await t.ds.query(`SELECT count(*)::int AS n FROM approval_requests`);
      expect(n).toBe(1);

      // لقطة: مسار جديد بعد الإرسال مايأثرش على الطلب
      await t.http().post('/api/v1/approvals/config/workflows').set(bearer(admin)).send({ documentType: 'test-invoice', amountFrom: '0.000000', amountTo: '1000.000000', allowSelfApproval: true, allowSameApproverAcrossLevels: true, sodExceptionRef: 'قرار إدارة اختباري رقم 1', levels: [{ mode: 'ANY', approvers: [{ type: 'USER', ref: u.a3.id }] }] }).expect(201);
      expect((await t.http().get('/api/v1/approvals/inbox').set(bearer(u.a3.token))).body).toHaveLength(0);

      const n1 = await t.http().get('/api/v1/notifications?unread=true').set(bearer(u.a1.token)).expect(200);
      expect(n1.body.unread).toBe(1);
      expect(n1.body.items[0]).toMatchObject({ kind: 'approval.pending', entityId: reqId });
      expect((await t.http().get('/api/v1/approvals/inbox').set(bearer(u.a1.token))).body.map((x: { id: string }) => x.id)).toEqual([reqId]);
      expect((await t.http().get(`/api/v1/approvals/requests/${reqId}`).set(bearer(u.out.token))).status).toBe(404);
      expect((await post(u.out.token, `/api/v1/approvals/requests/${reqId}/approve`, {})).body.code).toBe('NOT_AN_APPROVER');

      const d1 = await post(u.a1.token, `/api/v1/approvals/requests/${reqId}/approve`, {});
      expect(d1.status).toBe(200);
      expect(d1.body).toMatchObject({ status: 'Under Review', currentLevel: 2 });
      expect((await t.http().get('/api/v1/approvals/inbox').set(bearer(u.a2.token))).body).toHaveLength(0);
      expect((await post(u.pay1.token, `/api/v1/approvals/requests/${reqId}/approve`, {})).body).toMatchObject({ status: 'Under Review', currentLevel: 2 });
      expect((await post(u.pay1.token, `/api/v1/approvals/requests/${reqId}/approve`, {})).body.code).toBe('ALREADY_DECIDED');
      const fin = await post(u.pay2.token, `/api/v1/approvals/requests/${reqId}/approve`, {});
      expect(fin.body).toMatchObject({ status: 'Approved', currentLevel: null });
      expect(fin.body.log.map((l: { to_status: string }) => l.to_status)).toEqual(['Submitted', 'Under Review', 'Approved']);
      const ns = await t.http().get('/api/v1/notifications').set(bearer(u.sub.token)).expect(200);
      expect(ns.body.items.map((x: { kind: string }) => x.kind)).toContain('approval.approved');
      expect((await post(u.sub.token, `/api/v1/approvals/requests/${reqId}/cancel`, { comment: 'x' })).body.code).toBe('NOT_OPEN');
    });

    it('decisions and state log are append-only', async () => {
      await expect(t.ds.query(`UPDATE approval_decisions SET decision = 'REJECT'`)).rejects.toThrow();
      await expect(t.ds.query(`DELETE FROM approval_state_log`)).rejects.toThrow();
    });

    it('N_OF_M + reject requires a reason', async () => {
      await t.http().post('/api/v1/approvals/config/workflows').set(bearer(admin)).send({
        documentType: 'test-invoice', amountFrom: '1000.000100', allowSelfApproval: false, allowSameApproverAcrossLevels: false,
        levels: [{ mode: 'N_OF_M', requiredCount: 2, approvers: [{ type: 'USER', ref: u.a1.id }, { type: 'USER', ref: u.a2.id }, { type: 'USER', ref: u.a3.id }] }],
      }).expect(201);
      const s = await post(u.sub.token, '/api/v1/approvals/requests', { documentType: 'test-invoice', documentId: 'inv-big', amount: '25000.5' });
      expect(s.status).toBe(201);
      expect((await post(u.a1.token, `/api/v1/approvals/requests/${s.body.id}/approve`, {})).body.status).toBe('Under Review');
      expect((await post(u.a2.token, `/api/v1/approvals/requests/${s.body.id}/reject`, {})).body.code).toBe('REASON_REQUIRED');
      const rj = await post(u.a2.token, `/api/v1/approvals/requests/${s.body.id}/reject`, { comment: 'المبلغ مش مطابق' });
      expect(rj.body).toMatchObject({ status: 'Rejected' });
      expect((await t.http().get('/api/v1/notifications').set(bearer(u.sub.token))).body.items[0].kind).toBe('approval.rejected');
    });

    it('self-approval and same-approver-across-levels follow the workflow flags', async () => {
      await t.http().post('/api/v1/approvals/config/workflows').set(bearer(admin)).send({
        documentType: 'test-po', allowSelfApproval: false, allowSameApproverAcrossLevels: false,
        levels: [{ mode: 'ANY', approvers: [{ type: 'USER', ref: u.sub.id }, { type: 'USER', ref: u.a1.id }] }, { mode: 'ANY', approvers: [{ type: 'USER', ref: u.a1.id }, { type: 'USER', ref: u.a2.id }] }],
      }).expect(201);
      const s = await post(u.sub.token, '/api/v1/approvals/requests', { documentType: 'test-po', documentId: 'po-1' });
      expect(s.status).toBe(201);
      expect((await t.http().get('/api/v1/approvals/inbox').set(bearer(u.sub.token))).body).toHaveLength(0);
      expect((await post(u.sub.token, `/api/v1/approvals/requests/${s.body.id}/approve`, {})).body.code).toBe('SELF_APPROVAL');
      await post(u.a1.token, `/api/v1/approvals/requests/${s.body.id}/approve`, {}).expect(200);
      expect((await t.http().get('/api/v1/approvals/inbox').set(bearer(u.a1.token))).body.find((x: { id: string }) => x.id === s.body.id)).toBeUndefined();
      expect((await post(u.a1.token, `/api/v1/approvals/requests/${s.body.id}/approve`, {})).body.code).toBe('SAME_APPROVER_OTHER_LEVEL');
      expect((await post(u.a2.token, `/api/v1/approvals/requests/${s.body.id}/approve`, {})).body.status).toBe('Approved');
    });

    it('return (reason) → new cycle; withdraw before decisions; cancel needs a reason', async () => {
      const s1 = await post(u.sub.token, '/api/v1/approvals/requests', { documentType: 'test-po', documentId: 'po-2' });
      expect((await post(u.a1.token, `/api/v1/approvals/requests/${s1.body.id}/return`, {})).body.code).toBe('REASON_REQUIRED');
      expect((await post(u.a1.token, `/api/v1/approvals/requests/${s1.body.id}/return`, { comment: 'ناقص مرفق' })).body.status).toBe('Returned');
      const s2 = await post(u.sub.token, '/api/v1/approvals/requests', { documentType: 'test-po', documentId: 'po-2' });
      expect(s2.body).toMatchObject({ status: 'Submitted', cycle: 2 });
      expect((await post(u.a1.token, `/api/v1/approvals/requests/${s2.body.id}/withdraw`, {})).status).toBe(403);
      expect((await post(u.sub.token, `/api/v1/approvals/requests/${s2.body.id}/withdraw`, {})).body.status).toBe('Withdrawn');
      const s3 = await post(u.sub.token, '/api/v1/approvals/requests', { documentType: 'test-po', documentId: 'po-2' });
      expect((await post(u.sub.token, `/api/v1/approvals/requests/${s3.body.id}/cancel`, {})).body.code).toBe('REASON_REQUIRED');
      expect((await post(admin, `/api/v1/approvals/requests/${s3.body.id}/cancel`, { comment: 'اختبار' })).body.status).toBe('Cancelled');
    });

    it('B-07: changing material fields during approval cancels prior approvals and needs a fresh submission', async () => {
      const s = await post(u.sub.token, '/api/v1/approvals/requests', { documentType: 'test-po', documentId: 'po-m', materialHash: 'h1' });
      await post(u.a1.token, `/api/v1/approvals/requests/${s.body.id}/approve`, {}).expect(200);
      const svc = t.app.get(ApprovalsService);
      const subUser = { id: u.sub.id, username: 'f5_sub' } as never;
      expect(await t.ds.transaction((em) => svc.materialChanged('test-po', 'po-m', 'h1', subUser, em))).toBe(false);
      expect(await t.ds.transaction((em) => svc.materialChanged('test-po', 'po-m', 'h2', subUser, em))).toBe(true);
      const r = await t.http().get(`/api/v1/approvals/requests/${s.body.id}`).set(bearer(admin)).expect(200);
      expect(r.body.status).toBe('Returned');
      expect(r.body.log.at(-1)).toMatchObject({ command: 'material_change', to_status: 'Returned' });
      expect((await t.http().get('/api/v1/notifications').set(bearer(u.a1.token))).body.items[0].kind).toBe('approval.invalidated');
      const again = await post(u.sub.token, '/api/v1/approvals/requests', { documentType: 'test-po', documentId: 'po-m', materialHash: 'h2' });
      expect(again.body).toMatchObject({ status: 'Submitted', currentLevel: 1, cycle: 2 });
      expect(again.body.steps.every((st: { decisions: unknown[] }) => st.decisions.length === 0)).toBe(true);
    });

    it('B-05: being an approver does not grant posting', async () => {
      const me = await t.http().get('/api/me').set(bearer(u.a1.token)).expect(200);
      expect(me.body.docActions).toMatchObject({ approve: false, post: false });
    });

    it('a viewer without edit permission on the module cannot submit', async () => {
      expect((await post(u.a1.token, '/api/v1/approvals/requests', { documentType: 'test-po', documentId: 'po-9' })).status).toBe(403);
    });

    it('notifications: mark read', async () => {
      const before = (await t.http().get('/api/v1/notifications?unread=true').set(bearer(u.a1.token))).body.unread;
      expect(before).toBeGreaterThan(0);
      await t.http().post('/api/v1/notifications/all/read').set(bearer(u.a1.token)).expect(200);
      expect((await t.http().get('/api/v1/notifications?unread=true').set(bearer(u.a1.token))).body.unread).toBe(0);
    });
  });

  describe('NO_GAPS numbering', () => {
    const svc = () => t.app.get(NumberingService);
    it('50 concurrent documents get 1..50 with no gaps or duplicates', async () => {
      const nums = await Promise.all(Array.from({ length: 50 }, (_, i) => t.ds.transaction((em) => svc().issue(em, 'test-doc', 'test-doc', `d${i}`, null))));
      expect([...nums].sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    });
    it('a failed document transaction does not consume a number', async () => {
      await expect(t.ds.transaction(async (em) => { await svc().issue(em, 'test-doc', 'test-doc', 'fail', null); throw new Error('boom'); })).rejects.toThrow('boom');
      expect(await t.ds.transaction((em) => svc().issue(em, 'test-doc', 'test-doc', 'd50', null))).toBe(51);
      await expect(t.ds.transaction((em) => svc().issue(em, 'test-doc', 'test-doc', 'd50', null))).rejects.toMatchObject({ response: { code: 'ALREADY_NUMBERED' } });
    });
    it('issue outside a transaction is refused', async () => {
      await expect(svc().issue(t.ds.manager, 'test-doc', 'test-doc', 'x', null)).rejects.toThrow(/inside the document transaction/);
    });
    it('cancel keeps the number; numbers cannot be deleted or reused; audit shows no gaps', async () => {
      const [adm] = await t.ds.query(`SELECT id FROM users WHERE username = 'admin'`);
      await t.ds.transaction((em) => svc().cancel(em, 'test-doc', 'd7', adm.id, 'اختبار إلغاء'));
      const [row] = await t.ds.query(`SELECT number, status, cancel_reason FROM document_numbers WHERE document_id = 'd7'`);
      expect(row).toMatchObject({ status: 'cancelled', cancel_reason: 'اختبار إلغاء' });
      await expect(t.ds.query(`DELETE FROM document_numbers WHERE document_id = 'd7'`)).rejects.toThrow();
      await expect(t.ds.query(`UPDATE document_numbers SET status = 'issued' WHERE document_id = 'd7'`)).rejects.toThrow();
      await expect(t.ds.query(`UPDATE document_numbers SET number = 999 WHERE document_id = 'd8'`)).rejects.toThrow();
      const a = await t.http().get('/api/v1/numbering/test-doc/audit').set(bearer(admin)).expect(200);
      expect(a.body).toEqual({ scope: 'test-doc', last: 51, issued: 50, cancelled: 1, missing: [] });
      expect((await t.http().get('/api/v1/numbering/test-doc/audit').set(bearer(u.sub.token))).status).toBe(403);
    });
  });

  describe('projects: relational source + dry-run migration plan', () => {
    beforeAll(async () => {
      expect((await sync(t, admin, { changes: [up('projects', 'tp1', { name: 'مشروع اختبار', code: 'T1', budget: 1000.12345 }), up('projects', 'tp2', { name: 'مشروع اختبار' }), up('expenses', 'te1', { project: 'مشروع اختبار', amount: 5 })] })).status).toBe(200);
    });
    it('plan is read-only and reports blockers without writing', async () => {
      expect((await t.http().get('/api/v1/projects/migration-plan').set(bearer(u.sub.token))).status).toBe(403);
      const p = await t.http().get('/api/v1/projects/migration-plan').set(bearer(admin)).expect(200);
      expect(p.body).toMatchObject({ dryRun: true, executed: false, relationalRowsNow: 0, ready: false });
      expect(p.body.blockers.duplicateNames.length).toBe(1);
      const [{ n }] = await t.ds.query(`SELECT count(*)::int AS n FROM projects`);
      expect(n).toBe(0);
    });
    it('default source is legacy records; PROJECTS_SOURCE=relational reads the table', async () => {
      expect((await t.http().get('/api/v1/projects').set(bearer(admin))).body.source).toBe('legacy-records');
      await t.ds.query(`INSERT INTO projects (id, code, name, budget) VALUES ('rp1', 'R1', 'مشروع علائقي اختبار', 250.5)`);
      process.env.PROJECTS_SOURCE = 'relational';
      try {
        const r = await t.http().get('/api/v1/projects').set(bearer(admin)).expect(200);
        expect(r.body.source).toBe('relational');
        expect(r.body.items.map((x: { id: string }) => x.id)).toEqual(['rp1']);
        expect((await t.http().get('/api/v1/projects/rp1').set(bearer(admin))).body.budget).toBe('250.500000');
      } finally { delete process.env.PROJECTS_SOURCE; await t.ds.query(`DELETE FROM projects`); }
    });
  });

  describe('record history (audit trail)', () => {
    it('shows before/after per change with user and time; respects read permission', async () => {
      const [r] = await t.ds.query(`SELECT rev FROM records WHERE collection = 'projects' AND id = 'tp1'`);
      expect((await sync(t, admin, { changes: [up('projects', 'tp1', { status: 'متوقف' }, Number(r.rev))] })).status).toBe(200);
      const h = await t.http().get('/api/v1/history/projects/tp1').set(bearer(admin)).expect(200);
      expect(h.body.changes.length).toBe(2);
      const last = h.body.changes[0]; // الأحدث أولًا
      expect(last).toMatchObject({ user: 'admin', op: 'update' });
      expect(last.at).toBeTruthy();
      expect(last.fields).toContain('status');
      expect(last.set.status).toBe('متوقف');
      expect((await t.http().get('/api/v1/history/projects/nope').set(bearer(admin))).status).toBe(404);
      expect((await t.http().get('/api/v1/history/no-such/tp1').set(bearer(admin))).status).toBe(404);
      expect((await t.http().get('/api/v1/history/workers/tp1').set(bearer(u.sub.token))).status).toBe(403);
    });
  });

  describe('attachment versions', () => {
    const upload = (tok: string, recordId: string, buf: Buffer, name: string, replaces?: string) =>
      t.http().post(`/api/attachments?collection=projects&recordId=${recordId}${replaces ? `&replaces=${replaces}` : ''}`).set(bearer(tok)).attach('file', buf, name);
    it('replacing creates a new version and keeps the old one', async () => {
      const v1 = await upload(admin, 'tp1', pdf(), 'عقد.pdf');
      expect(v1.status).toBe(201);
      expect(v1.body).toMatchObject({ version: 1, versionOf: null, supersededAt: null });
      const v2 = await upload(admin, 'tp1', png(), 'عقد-معدل.png', v1.body.id);
      expect(v2.status).toBe(201);
      expect(v2.body).toMatchObject({ version: 2, versionOf: v1.body.id });
      const v3 = await upload(admin, 'tp1', pdf(), 'عقد-نهائي.pdf', v2.body.id);
      expect(v3.body).toMatchObject({ version: 3, versionOf: v1.body.id });
      const list = await t.http().get('/api/attachments?collection=projects&recordId=tp1').set(bearer(admin)).expect(200);
      expect(list.body.map((a: { id: string }) => a.id)).toEqual([v3.body.id]);
      const all = await t.http().get('/api/attachments/versions?collection=projects&recordId=tp1').set(bearer(admin)).expect(200);
      expect(all.body.map((a: { version: number }) => a.version)).toEqual([1, 2, 3]);
      expect(all.body[0].supersededAt).not.toBeNull();
      await t.http().get(`/api/attachments/${v1.body.id}/content`).set(bearer(admin)).expect(200);
      expect((await upload(admin, 'tp1', pdf(), 'x.pdf', v1.body.id)).body.code).toBe('NOT_LATEST');
      expect((await upload(admin, 'tp2', pdf(), 'x.pdf', v3.body.id)).body.code).toBe('BAD_REPLACES');
      const [{ n }] = await t.ds.query(`SELECT count(*)::int AS n FROM attachments WHERE owner_id = 'tp1'`);
      expect(n).toBe(3);
    });
  });
});
