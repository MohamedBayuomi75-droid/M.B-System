import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

export interface WorkflowRow { id: string; document_type: string; version: number; amount_from: string | null; amount_to: string | null; allow_self_approval: boolean; allow_same_approver_across_levels: boolean; active: boolean }
export interface RequestRow { id: string; document_type: string; document_id: string; cycle: number; workflow_id: string; workflow_version: number; allow_self_approval: boolean; allow_same_approver_across_levels: boolean; amount: string | null; status: string; current_sequence: number | null; submitted_by: string; submitted_at: Date; row_version: number }
export interface StepRow { id: string; request_id: string; sequence: number; mode: 'ALL' | 'ANY' | 'N_OF_M'; required_count: number | null; approvers: { type: string; ref: string; users: string[] }[]; status: string }

const rowsOf = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? (r[0] as T[]) : (r as T[]));

/** طبقة الوصول لبيانات الاعتمادات — SQL بس، على جداول approval_* بس */
@Injectable()
export class ApprovalsRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}
  private m(em?: EntityManager) { return em ?? this.ds.manager; }

  // ---------- التهيئة
  documentTypes(em?: EntityManager) { return this.m(em).query(`SELECT code, name, module, active FROM approval_document_types ORDER BY code`); }
  async documentType(code: string, em?: EntityManager) { return (await this.m(em).query(`SELECT code, name, module, active FROM approval_document_types WHERE code = $1`, [code]))[0] ?? null; }
  insertDocumentType(code: string, name: string, module: string, by: string, em?: EntityManager) {
    return this.m(em).query(`INSERT INTO approval_document_types (code, name, module, created_by) VALUES ($1, $2, $3, $4)`, [code, name, module, by]);
  }
  async nextWorkflowVersion(docType: string, em: EntityManager): Promise<number> {
    const [r] = await em.query(`SELECT coalesce(max(version), 0) + 1 AS v FROM approval_workflows WHERE document_type = $1`, [docType]);
    return Number(r.v);
  }
  /** نفس النوع بنطاق قيمة متداخل ونشط (null = مفتوح) */
  overlappingActive(docType: string, from: string | null, to: string | null, em: EntityManager): Promise<WorkflowRow[]> {
    return em.query(`SELECT * FROM approval_workflows WHERE document_type = $1 AND active
      AND coalesce(amount_from, '-Infinity'::numeric) <= coalesce($3::numeric, 'Infinity'::numeric)
      AND coalesce($2::numeric, '-Infinity'::numeric) <= coalesce(amount_to, 'Infinity'::numeric)`, [docType, from, to]);
  }
  deactivate(ids: string[], em: EntityManager) { return em.query(`UPDATE approval_workflows SET active = false WHERE id = ANY($1::uuid[])`, [ids]); }
  async insertWorkflow(w: { documentType: string; version: number; from: string | null; to: string | null; self: boolean; cross: boolean; by: string }, em: EntityManager): Promise<string> {
    const [r] = await em.query(`INSERT INTO approval_workflows (document_type, version, amount_from, amount_to, allow_self_approval, allow_same_approver_across_levels, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [w.documentType, w.version, w.from, w.to, w.self, w.cross, w.by]);
    return r.id;
  }
  async insertLevel(workflowId: string, seq: number, mode: string, requiredCount: number | null, em: EntityManager): Promise<string> {
    const [r] = await em.query(`INSERT INTO approval_workflow_levels (workflow_id, sequence, mode, required_count) VALUES ($1, $2, $3, $4) RETURNING id`, [workflowId, seq, mode, requiredCount]);
    return r.id;
  }
  insertApprover(levelId: string, type: string, ref: string, em: EntityManager) {
    return em.query(`INSERT INTO approval_level_approvers (level_id, approver_type, approver_ref) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [levelId, type, ref]);
  }
  workflows(docType?: string) {
    return this.ds.query(`SELECT w.*, (SELECT json_agg(json_build_object('sequence', l.sequence, 'mode', l.mode, 'requiredCount', l.required_count,
        'approvers', (SELECT json_agg(json_build_object('type', a.approver_type, 'ref', a.approver_ref)) FROM approval_level_approvers a WHERE a.level_id = l.id)) ORDER BY l.sequence)
      FROM approval_workflow_levels l WHERE l.workflow_id = w.id) AS levels
      FROM approval_workflows w WHERE ($1::text IS NULL OR w.document_type = $1) ORDER BY w.document_type, w.version`, [docType ?? null]);
  }
  async workflowLevels(workflowId: string, em: EntityManager): Promise<{ id: string; sequence: number; mode: string; required_count: number | null; approvers: { type: string; ref: string }[] }[]> {
    return em.query(`SELECT l.id, l.sequence, l.mode, l.required_count,
      coalesce((SELECT json_agg(json_build_object('type', a.approver_type, 'ref', a.approver_ref)) FROM approval_level_approvers a WHERE a.level_id = l.id), '[]') AS approvers
      FROM approval_workflow_levels l WHERE l.workflow_id = $1 ORDER BY l.sequence`, [workflowId]);
  }
  /** المسار المطابق للقيمة (أو للمستند من غير قيمة: المسارات المفتوحة من الناحيتين بس) */
  matchingWorkflows(docType: string, amount: string | null, em: EntityManager): Promise<WorkflowRow[]> {
    if (amount == null) return em.query(`SELECT * FROM approval_workflows WHERE document_type = $1 AND active AND amount_from IS NULL AND amount_to IS NULL`, [docType]);
    return em.query(`SELECT * FROM approval_workflows WHERE document_type = $1 AND active
      AND (amount_from IS NULL OR amount_from <= $2::numeric) AND (amount_to IS NULL OR $2::numeric <= amount_to)`, [docType, amount]);
  }
  activeUsersWithRole(role: string, em: EntityManager): Promise<{ id: string }[]> { return em.query(`SELECT id FROM users WHERE role = $1 AND active ORDER BY id`, [role]); }
  async activeUser(id: string, em?: EntityManager): Promise<boolean> { return (await this.m(em).query(`SELECT 1 FROM users WHERE id::text = $1 AND active`, [id])).length > 0; }

  // ---------- التشغيل
  async nextCycle(docType: string, docId: string, em: EntityManager): Promise<number> {
    const [r] = await em.query(`SELECT coalesce(max(cycle), 0) + 1 AS c FROM approval_requests WHERE document_type = $1 AND document_id = $2`, [docType, docId]);
    return Number(r.c);
  }
  async insertRequest(r: Omit<RequestRow, 'id' | 'submitted_at' | 'row_version'>, em: EntityManager): Promise<string> {
    const [x] = await em.query(`INSERT INTO approval_requests (document_type, document_id, cycle, workflow_id, workflow_version, allow_self_approval, allow_same_approver_across_levels, amount, status, current_sequence, submitted_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [r.document_type, r.document_id, r.cycle, r.workflow_id, r.workflow_version, r.allow_self_approval, r.allow_same_approver_across_levels, r.amount, r.status, r.current_sequence, r.submitted_by]);
    return x.id;
  }
  insertStep(requestId: string, seq: number, mode: string, requiredCount: number | null, approvers: unknown, em: EntityManager) {
    return em.query(`INSERT INTO approval_request_steps (request_id, sequence, mode, required_count, approvers) VALUES ($1, $2, $3, $4, $5::jsonb)`, [requestId, seq, mode, requiredCount, JSON.stringify(approvers)]);
  }
  async lockRequest(id: string, em: EntityManager): Promise<RequestRow | null> {
    return (await em.query(`SELECT * FROM approval_requests WHERE id = $1 FOR UPDATE`, [id]))[0] ?? null;
  }
  async request(id: string, em?: EntityManager): Promise<RequestRow | null> { return (await this.m(em).query(`SELECT * FROM approval_requests WHERE id::text = $1`, [id]))[0] ?? null; }
  steps(requestId: string, em?: EntityManager): Promise<StepRow[]> { return this.m(em).query(`SELECT * FROM approval_request_steps WHERE request_id = $1 ORDER BY sequence`, [requestId]); }
  decisions(requestId: string, em?: EntityManager): Promise<{ step_id: string; decided_by: string; decision: string; comment: string | null; decided_at: Date }[]> {
    return this.m(em).query(`SELECT d.step_id, d.decided_by, u.username, d.decision, d.comment, d.decided_at FROM approval_decisions d LEFT JOIN users u ON u.id = d.decided_by WHERE d.request_id = $1 ORDER BY d.id`, [requestId]);
  }
  stateLog(requestId: string) { return this.ds.query(`SELECT from_status, to_status, command, user_id, reason, at FROM approval_state_log WHERE request_id = $1 ORDER BY id`, [requestId]); }
  insertDecision(requestId: string, stepId: string, by: string, decision: string, comment: string | null, em: EntityManager) {
    return em.query(`INSERT INTO approval_decisions (request_id, step_id, decided_by, decision, comment) VALUES ($1, $2, $3, $4, $5)`, [requestId, stepId, by, decision, comment]);
  }
  setStepStatus(stepId: string, status: string, em: EntityManager) { return em.query(`UPDATE approval_request_steps SET status = $2 WHERE id = $1`, [stepId, status]); }
  setRequestStatus(id: string, status: string, currentSeq: number | null, em: EntityManager) {
    return em.query(`UPDATE approval_requests SET status = $2, current_sequence = $3, row_version = row_version + 1 WHERE id = $1`, [id, status, currentSeq]);
  }
  logState(requestId: string, from: string | null, to: string, command: string, userId: string, reason: string | null, em: EntityManager) {
    return em.query(`INSERT INTO approval_state_log (request_id, from_status, to_status, command, user_id, reason) VALUES ($1, $2, $3, $4, $5, $6)`, [requestId, from, to, command, userId, reason]);
  }
  /** الطلبات المفتوحة اللي المستخدم ضمن معتمدي مستواها الحالي ولسه ماقررش */
  inbox(userId: string): Promise<(RequestRow & { step_id: string; doc_name: string })[]> {
    return this.ds.query(`SELECT r.*, s.id AS step_id, t.name AS doc_name FROM approval_requests r
      JOIN approval_request_steps s ON s.request_id = r.id AND s.sequence = r.current_sequence
      JOIN approval_document_types t ON t.code = r.document_type
      WHERE r.status IN ('Submitted','Under Review')
        AND EXISTS (SELECT 1 FROM jsonb_array_elements(s.approvers) a, jsonb_array_elements_text(a->'users') u WHERE u = $1)
        AND NOT EXISTS (SELECT 1 FROM approval_decisions d WHERE d.step_id = s.id AND d.decided_by::text = $1)
        AND (r.allow_self_approval OR r.submitted_by::text <> $1)
        AND (r.allow_same_approver_across_levels OR NOT EXISTS (SELECT 1 FROM approval_decisions d2 WHERE d2.request_id = r.id AND d2.decided_by::text = $1))
      ORDER BY r.submitted_at`, [userId]);
  }
  rows = rowsOf;
}
