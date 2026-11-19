import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import { isRoleKey, PAGES } from '../authz/roles';
import { Money } from '../common/money';
import { TransactionRunner } from '../common/transaction';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDocumentTypeDto, CreateWorkflowDto, SubmitDto } from './approvals.dto';
import { ApprovalsRepository, RequestRow, StepRow } from './approvals.repository';

/**
 * محرك الاعتمادات (المرحلة 5 — APPROVAL_WORKFLOW_DESIGN.md §3–§6).
 *  - **مفيش أي تهيئة افتراضية**: أنواع المستندات، والمسارات، والمستويات، والمعتمدين، والحدود، وفصل المهام — كلها من الإعداد (B-01…B-08).
 *    إرسال مستند من غير مسار مطابق = خطأ صريح (مفيش اعتماد تلقائي).
 *  - الطلب بياخد **لقطة** من المسار وقت الإرسال (المسار يتغيّر بعدين مايأثرش على الطلبات الجارية)، والمعتمدين بالدور بيتحوّلوا لأسماء مستخدمين وقتها.
 *  - كل انتقال حالة في approval_state_log، وكل قرار في approval_decisions (الاتنين إلحاق فقط)، والتغيير الأساسي في audit_log.
 *  - Approved ≠ Posted: الترحيل شغل الموديول المالك (المرحلة 6/9).
 */
type Cmd = 'approve' | 'reject' | 'return';
const OPEN = ['Submitted', 'Under Review'];
/**
 * أنواع مستندات فصل المهام فيها إلزامي **من غير أي استثناء** (حتى بمرجع إدارة):
 * B-51 (2026-11-17): «لا يسمح للمنشئ باعتماد طلبه» في التسويات المخزنية.
 */
export const SOD_MANDATORY_TYPES = new Set(['stock-adjustment']);
/** بعد ما الطلب يوصل حالة نهائية (معتمد/مرفوض/مرتجع/ملغى/مسحوب) — الموديولات المالكة بتسجّل نفسها (مثلًا الترحيل الآلي للتسوية بعد الاعتماد) */
export type FinalStatusHandler = (e: { requestId: string; documentType: string; documentId: string; status: string; actor: AuthUser }) => Promise<void>;

@Injectable()
export class ApprovalsService {
  private readonly finalHandlers = new Map<string, FinalStatusHandler[]>();
  /** تسجيل معالج للحالات النهائية لنوع مستند (بيتنفّذ بعد commit قرار الاعتماد — فشله مابيلغيش الاعتماد) */
  onFinalStatus(documentType: string, h: FinalStatusHandler) { this.finalHandlers.set(documentType, [...(this.finalHandlers.get(documentType) ?? []), h]); }
  private async fireFinal(e: Parameters<FinalStatusHandler>[0]) { for (const h of this.finalHandlers.get(e.documentType) ?? []) await h(e); }

  constructor(private readonly repo: ApprovalsRepository, private readonly tx: TransactionRunner, private readonly notifications: NotificationsService, private readonly audit: AuditService) {}

  // ================= التهيئة (مدير النظام)
  listDocumentTypes() { return this.repo.documentTypes(); }

  async createDocumentType(dto: CreateDocumentTypeDto, actor: AuthUser, req: Request) {
    if (!(PAGES as readonly string[]).includes(dto.module)) throw new BadRequestException({ statusCode: 400, code: 'UNKNOWN_MODULE_PAGE', message: 'الموديول لازم يكون صفحة موجودة' });
    if (await this.repo.documentType(dto.code)) throw new ConflictException({ statusCode: 409, code: 'EXISTS', message: 'نوع المستند موجود' });
    await this.repo.insertDocumentType(dto.code, dto.name, dto.module, actor.id);
    await this.audit.record({ action: 'approvals.document_type.create', userId: actor.id, username: actor.username, entity: 'approval_document_types', entityId: dto.code, details: { ...dto }, req });
    return this.repo.documentType(dto.code);
  }

  listWorkflows(docType?: string) { return this.repo.workflows(docType); }

  /** نسخة جديدة من المسار: المسارات النشطة لنفس النوع ونطاق متداخل بتتقفل (الطلبات الجارية ماشية على لقطتها) */
  async createWorkflow(dto: CreateWorkflowDto, actor: AuthUser, req: Request) {
    const dt = await this.repo.documentType(dto.documentType);
    if (!dt || !dt.active) throw new BadRequestException({ statusCode: 400, code: 'UNKNOWN_DOCUMENT_TYPE', message: 'نوع المستند غير موجود' });
    const from = dto.amountFrom != null ? Money.of(dto.amountFrom).round().toFixed() : null;
    const to = dto.amountTo != null ? Money.of(dto.amountTo).round().toFixed() : null;
    if (from && to && Money.of(from).cmp(to) > 0) throw new BadRequestException({ statusCode: 400, code: 'BAD_RANGE', message: 'بداية النطاق أكبر من نهايته' });
    dto.levels.forEach((l, i) => {
      if ((l.mode === 'N_OF_M') !== (l.requiredCount != null)) throw new BadRequestException({ statusCode: 400, code: 'BAD_LEVEL', message: `المستوى ${i + 1}: العدد المطلوب مع N_OF_M بس` });
      if (l.mode === 'N_OF_M' && l.requiredCount! > l.approvers.length && l.approvers.every((a) => a.type === 'USER')) throw new BadRequestException({ statusCode: 400, code: 'BAD_LEVEL', message: `المستوى ${i + 1}: العدد المطلوب أكبر من المعتمدين` });
    });
    for (const l of dto.levels) for (const a of l.approvers) {
      if (a.type === 'ROLE' && (!isRoleKey(a.ref) || a.ref === 'custom')) throw new BadRequestException({ statusCode: 400, code: 'UNKNOWN_ROLE', message: `الدور «${a.ref}» مش موجود (مفيش أدوار جديدة من هنا)` });
      if (a.type === 'USER' && !(await this.repo.activeUser(a.ref))) throw new BadRequestException({ statusCode: 400, code: 'UNKNOWN_USER', message: 'مستخدم معتمد غير موجود أو متعطل' });
    }
    const self = dto.allowSelfApproval ?? false, cross = dto.allowSameApproverAcrossLevels ?? false;
    if (SOD_MANDATORY_TYPES.has(dto.documentType) && (self || cross))
      throw new UnprocessableEntityException({ statusCode: 422, code: 'SOD_MANDATORY', message: 'نوع المستند ده فصل المهام فيه إلزامي من غير استثناء (B-51)' });
    const ref = dto.sodExceptionRef?.trim() || null;
    if ((self || cross) && !ref) throw new BadRequestException({ statusCode: 400, code: 'SOD_EXCEPTION_REF_REQUIRED', message: 'الاستثناء من فصل المهام محتاج مرجع اعتماد الإدارة (B-04)' });
    const id = await this.tx.run(async (em) => {
      const overlap = await this.repo.overlappingActive(dto.documentType, from, to, em);
      if (overlap.length) await this.repo.deactivate(overlap.map((w) => w.id), em);
      const version = await this.repo.nextWorkflowVersion(dto.documentType, em);
      const wid = await this.repo.insertWorkflow({ documentType: dto.documentType, version, from, to, self, cross, ref: (self || cross) ? ref : null, by: actor.id }, em);
      for (const [i, l] of dto.levels.entries()) {
        const lid = await this.repo.insertLevel(wid, i + 1, l.mode, l.requiredCount ?? null, em);
        for (const a of l.approvers) await this.repo.insertApprover(lid, a.type, a.ref, em);
      }
      return { wid, version, deactivated: overlap.map((w) => w.id) };
    }, { lockKeys: [781001] });
    await this.audit.record({ action: 'approvals.workflow.create', userId: actor.id, username: actor.username, entity: 'approval_workflows', entityId: id.wid, details: { ...dto, version: id.version, deactivated: id.deactivated } as Record<string, unknown>, req });
    return (await this.repo.workflows(dto.documentType)).find((w: { id: string }) => w.id === id.wid);
  }

  // ================= التشغيل
  async submit(dto: SubmitDto, actor: AuthUser, req: Request) {
    const dt = await this.repo.documentType(dto.documentType);
    if (!dt || !dt.active) throw new BadRequestException({ statusCode: 400, code: 'UNKNOWN_DOCUMENT_TYPE', message: 'نوع المستند غير موجود' });
    if (!hasPagePermission(actor.permissions, dt.module, 'edit')) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'ليس لديك صلاحية إرسال هذا المستند' });
    const amount = dto.amount != null ? Money.of(dto.amount).round().toFixed() : null;
    const result = await this.tx.run(async (em) => {
      const wfs = await this.repo.matchingWorkflows(dto.documentType, amount, em);
      if (!wfs.length) throw new UnprocessableEntityException({ statusCode: 422, code: 'NO_WORKFLOW', message: 'مفيش مسار اعتماد معرّف لنوع المستند ده وقيمته — لازم يتعرّف من الإعداد' });
      if (wfs.length > 1) throw new ConflictException({ statusCode: 409, code: 'AMBIGUOUS_WORKFLOW', message: 'أكتر من مسار مطابق — راجع إعداد النطاقات' });
      const wf = wfs[0];
      if (SOD_MANDATORY_TYPES.has(dto.documentType) && (wf.allow_self_approval || wf.allow_same_approver_across_levels))
        throw new UnprocessableEntityException({ statusCode: 422, code: 'SOD_MANDATORY', message: 'مسار الاعتماد فيه استثناء من فصل المهام، وده ممنوع لنوع المستند ده (B-51)' });
      const levels = await this.repo.workflowLevels(wf.id, em);
      const snapshot: { seq: number; mode: string; required: number | null; approvers: { type: string; ref: string; users: string[] }[] }[] = [];
      for (const l of levels) {
        const approvers = [];
        for (const a of l.approvers) approvers.push({ ...a, users: a.type === 'USER' ? [a.ref] : (await this.repo.activeUsersWithRole(a.ref, em)).map((u) => u.id) });
        const eligible = new Set(approvers.flatMap((a) => a.users).filter((u) => wf.allow_self_approval || u !== actor.id));
        const need = l.mode === 'ANY' ? 1 : l.mode === 'N_OF_M' ? l.required_count! : eligible.size;
        if (eligible.size === 0 || eligible.size < need) throw new UnprocessableEntityException({ statusCode: 422, code: 'NO_ELIGIBLE_APPROVERS', message: `المستوى ${l.sequence}: مفيش عدد كافي من المعتمدين المتاحين` });
        snapshot.push({ seq: l.sequence, mode: l.mode, required: l.mode === 'ALL' ? eligible.size : l.mode === 'ANY' ? 1 : l.required_count, approvers });
      }
      const cycle = await this.repo.nextCycle(dto.documentType, dto.documentId, em);
      let id: string;
      try {
        id = await this.repo.insertRequest({ document_type: dto.documentType, document_id: dto.documentId, cycle, workflow_id: wf.id, workflow_version: wf.version, allow_self_approval: wf.allow_self_approval, allow_same_approver_across_levels: wf.allow_same_approver_across_levels, amount, status: 'Submitted', current_sequence: 1, submitted_by: actor.id, material_hash: dto.materialHash ?? null }, em);
      } catch (e) {
        if ((e as { code?: string }).code === '23505') throw new ConflictException({ statusCode: 409, code: 'ALREADY_PENDING', message: 'المستند ده عليه طلب اعتماد مفتوح' });
        throw e;
      }
      for (const st of snapshot) await this.repo.insertStep(id, st.seq, st.mode, st.required, st.approvers, em);
      await this.repo.logState(id, null, 'Submitted', 'submit', actor.id, null, em);
      await this.notifyStep(id, snapshot[0].approvers, actor.id, wf.allow_self_approval, dt.name, dto.documentId, em);
      return id;
    });
    await this.audit.record({ action: 'approvals.submit', userId: actor.id, username: actor.username, entity: dto.documentType, entityId: dto.documentId, details: { requestId: result, amount }, req });
    return this.get(result, actor);
  }

  private async notifyStep(requestId: string, approvers: { users: string[] }[], submitter: string, allowSelf: boolean, docName: string, docId: string, em: Parameters<NotificationsService['notify']>[1]) {
    const users = [...new Set(approvers.flatMap((a) => a.users))].filter((u) => allowSelf || u !== submitter);
    await this.notifications.notify(users.map((u) => ({ userId: u, kind: 'approval.pending', title: `طلب اعتماد: ${docName}`, body: `المستند ${docId} بانتظار اعتمادك`, entity: 'approval_requests', entityId: requestId })), em);
  }

  async decide(id: string, cmd: Cmd, comment: string | undefined, actor: AuthUser, req: Request) {
    if ((cmd === 'reject' || cmd === 'return') && !comment?.trim()) throw new BadRequestException({ statusCode: 400, code: 'REASON_REQUIRED', message: 'السبب إلزامي للرفض والإرجاع' });
    const out = await this.tx.run(async (em) => {
      const r = await this.repo.lockRequest(id, em);
      if (!r) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الطلب غير موجود' });
      if (!OPEN.includes(r.status)) throw new ConflictException({ statusCode: 409, code: 'NOT_OPEN', message: `الطلب حالته «${r.status}»` });
      const steps = await this.repo.steps(id, em);
      const step = steps.find((s) => s.sequence === r.current_sequence)!;
      this.assertCanDecide(r, step, steps, await this.repo.decisions(id, em), actor);
      const decision = cmd === 'approve' ? 'APPROVE' : cmd === 'reject' ? 'REJECT' : 'RETURN';
      try { await this.repo.insertDecision(id, step.id, actor.id, decision, comment?.trim() || null, em); }
      catch (e) { if ((e as { code?: string }).code === '23505') throw new ConflictException({ statusCode: 409, code: 'ALREADY_DECIDED', message: 'قرارك على المستوى ده متسجّل' }); throw e; }
      let to = r.status, seq: number | null = r.current_sequence;
      if (cmd === 'reject') { await this.repo.setStepStatus(step.id, 'Rejected', em); to = 'Rejected'; seq = null; }
      else if (cmd === 'return') { await this.repo.setStepStatus(step.id, 'Returned', em); to = 'Returned'; seq = null; }
      else {
        const approvals = (await this.repo.decisions(id, em)).filter((d) => d.step_id === step.id && d.decision === 'APPROVE').length;
        if (approvals >= (step.required_count ?? 1)) {
          await this.repo.setStepStatus(step.id, 'Approved', em);
          const next = steps.find((s) => s.sequence === step.sequence + 1);
          if (next) { to = 'Under Review'; seq = next.sequence; await this.notifyStep(id, next.approvers, r.submitted_by, r.allow_self_approval, r.document_type, r.document_id, em); }
          else { to = 'Approved'; seq = null; }
        } else to = 'Under Review';
      }
      await this.repo.setRequestStatus(id, to, seq, em);
      if (to !== r.status) await this.repo.logState(id, r.status, to, cmd, actor.id, comment?.trim() || null, em);
      if (['Approved', 'Rejected', 'Returned'].includes(to)) await this.notifications.notify([{ userId: r.submitted_by, kind: `approval.${to.toLowerCase()}`, title: `طلب الاعتماد: ${to === 'Approved' ? 'اتعتمد' : to === 'Rejected' ? 'اترفض' : 'اترجّع للتعديل'}`, body: `${r.document_type} ${r.document_id}${comment ? ' — ' + comment : ''}`, entity: 'approval_requests', entityId: id }], em);
      return { r, to };
    });
    await this.audit.record({ action: `approvals.${cmd}`, userId: actor.id, username: actor.username, entity: out.r.document_type, entityId: out.r.document_id, details: { requestId: id, from: out.r.status, to: out.to, comment: comment ?? null }, req });
    if (out.to !== out.r.status && !OPEN.includes(out.to)) await this.fireFinal({ requestId: id, documentType: out.r.document_type, documentId: out.r.document_id, status: out.to, actor });
    return this.get(id, actor);
  }

  private assertCanDecide(r: RequestRow, step: StepRow, steps: StepRow[], decisions: { step_id: string; decided_by: string }[], actor: AuthUser) {
    const eligible = step.approvers.some((a) => a.users.includes(actor.id));
    if (!eligible) throw new ForbiddenException({ statusCode: 403, code: 'NOT_AN_APPROVER', message: 'مش من معتمدي المستوى الحالي' });
    if (!r.allow_self_approval && r.submitted_by === actor.id) throw new ForbiddenException({ statusCode: 403, code: 'SELF_APPROVAL', message: 'مقدّم الطلب مايعتمدش مستنده (حسب إعداد المسار)' });
    if (!r.allow_same_approver_across_levels && decisions.some((d) => d.decided_by === actor.id && d.step_id !== step.id && steps.some((s) => s.id === d.step_id)))
      throw new ForbiddenException({ statusCode: 403, code: 'SAME_APPROVER_OTHER_LEVEL', message: 'قررت في مستوى سابق لنفس الطلب (حسب إعداد المسار)' });
  }

  /** سحب (المقدّم، قبل أي قرار) أو إلغاء (المقدّم أو المدير، بسبب) */
  async close(id: string, cmd: 'withdraw' | 'cancel', reason: string | undefined, actor: AuthUser, req: Request) {
    if (cmd === 'cancel' && !reason?.trim()) throw new BadRequestException({ statusCode: 400, code: 'REASON_REQUIRED', message: 'سبب الإلغاء إلزامي' });
    const out = await this.tx.run(async (em) => {
      const r = await this.repo.lockRequest(id, em);
      if (!r) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الطلب غير موجود' });
      if (!OPEN.includes(r.status) && !(cmd === 'cancel' && r.status === 'Returned')) throw new ConflictException({ statusCode: 409, code: 'NOT_OPEN', message: `الطلب حالته «${r.status}»` });
      const isSubmitter = r.submitted_by === actor.id;
      if (cmd === 'withdraw') {
        if (!isSubmitter) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'السحب لمقدّم الطلب بس' });
        if ((await this.repo.decisions(id, em)).length) throw new ConflictException({ statusCode: 409, code: 'ALREADY_DECIDED', message: 'فيه قرار صدر — السحب مش متاح' });
      } else if (!isSubmitter && !actor.permissions.manageUsers) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'الإلغاء لمقدّم الطلب أو المدير' });
      const to = cmd === 'withdraw' ? 'Withdrawn' : 'Cancelled';
      await this.repo.setRequestStatus(id, to, null, em);
      await this.repo.logState(id, r.status, to, cmd, actor.id, reason?.trim() || null, em);
      return r;
    });
    await this.audit.record({ action: `approvals.${cmd}`, userId: actor.id, username: actor.username, entity: out.document_type, entityId: out.document_id, details: { requestId: id, reason: reason ?? null }, req });
    await this.fireFinal({ requestId: id, documentType: out.document_type, documentId: out.document_id, status: cmd === 'withdraw' ? 'Withdrawn' : 'Cancelled', actor });
    return this.get(id, actor);
  }

  /**
   * B-07: الموديول المالك بيستدعيها جوه معاملة تعديل المستند. لو الحقول الجوهرية اتغيّرت والمستند عليه طلب مفتوح →
   * الطلب بيرجع «Returned» (القرارات السابقة بتفضل في السجل لكن مابقاش ليها أثر) ولازم إرسال جديد يبدأ من المستوى الأول.
   * بيرجّع true لو اتلغى طلب.
   */
  async materialChanged(documentType: string, documentId: string, newHash: string, actor: AuthUser, em: Parameters<ApprovalsRepository['lockOpenFor']>[2]): Promise<boolean> {
    const r = await this.repo.lockOpenFor(documentType, documentId, em);
    if (!r || r.material_hash === newHash) return false;
    const reason = 'تعديل حقول جوهرية أثناء الاعتماد — الاعتمادات السابقة اتلغت (B-07)';
    await this.repo.setRequestStatus(r.id, 'Returned', null, em);
    await this.repo.logState(r.id, r.status, 'Returned', 'material_change', actor.id, reason, em);
    const steps = await this.repo.steps(r.id, em);
    const users = [...new Set([r.submitted_by, ...steps.flatMap((s) => s.approvers.flatMap((a) => a.users))])];
    await this.notifications.notify(users.map((u) => ({ userId: u, kind: 'approval.invalidated', title: 'طلب اعتماد محتاج إعادة تقييم', body: `${documentType} ${documentId} — ${reason}`, entity: 'approval_requests', entityId: r.id })), em);
    return true;
  }

  inbox(actor: AuthUser) {
    return this.repo.inbox(actor.id).then((rows) => rows.map((r) => ({ id: r.id, documentType: r.document_type, documentName: r.doc_name, documentId: r.document_id, cycle: r.cycle, amount: r.amount, status: r.status, currentLevel: r.current_sequence, submittedBy: r.submitted_by, submittedAt: r.submitted_at })));
  }

  /** التفاصيل: لمقدّم الطلب أو أي معتمد في أي مستوى أو المدير */
  async get(id: string, actor: AuthUser) {
    const r = await this.repo.request(id);
    if (!r) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الطلب غير موجود' });
    const steps = await this.repo.steps(id);
    const involved = r.submitted_by === actor.id || actor.permissions.manageUsers || steps.some((s) => s.approvers.some((a) => a.users.includes(actor.id)));
    if (!involved) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الطلب غير موجود' });
    const decisions = await this.repo.decisions(id);
    return {
      id: r.id, documentType: r.document_type, documentId: r.document_id, cycle: r.cycle, workflowVersion: r.workflow_version,
      amount: r.amount, status: r.status, currentLevel: r.current_sequence, submittedBy: r.submitted_by, submittedAt: r.submitted_at,
      allowSelfApproval: r.allow_self_approval, allowSameApproverAcrossLevels: r.allow_same_approver_across_levels,
      steps: steps.map((s) => ({ sequence: s.sequence, mode: s.mode, requiredCount: s.required_count, status: s.status, approvers: s.approvers.map((a) => ({ type: a.type, ref: a.ref })),
        decisions: decisions.filter((d) => d.step_id === s.id).map((d) => ({ by: d.decided_by, username: (d as unknown as { username: string }).username, decision: d.decision, comment: d.comment, at: d.decided_at })) })),
      log: await this.repo.stateLog(id),
    };
  }
}
