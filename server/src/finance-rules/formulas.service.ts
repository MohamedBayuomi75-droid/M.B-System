import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth.types';
import { TransactionRunner } from '../common/transaction';
import { FormulaError, runSteps, Step } from './expr';
import { FormulaDef, runTestCases, validateFormula } from './library';
import { FormulasRepository, FormulaVersionRow } from './formulas.repository';

type Em = Parameters<FormulasRepository['insertSnapshot']>[1];
const dayBefore = (d: string) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);
/** «منتهي» حالة مشتقة: معتمد وانتهى سريانه */
const displayStatus = (v: FormulaVersionRow) => (v.status === 'approved' && v.effective_to && v.effective_to < today() ? 'expired' : v.status);
const matches = (cond: Record<string, unknown>, ctx: Record<string, unknown>) =>
  Object.entries(cond ?? {}).every(([k, want]) => (Array.isArray(want) ? want.includes(ctx[k]) : ctx[k] === want));

export interface VersionInput {
  changeKind: 'new' | 'logic' | 'parameters'; effectiveFrom: string; effectiveTo?: string; changeReason: string;
  definition: { variables: Record<string, string>; lists?: Record<string, string[]>; steps: Step[] };
  testCases: FormulaDef['testCases']; conditions?: Record<string, unknown>;
}

/**
 * Financial Rules Engine (B-20 §13): المعادلات بإصدارات، وحالات اختبار إلزامية، واعتماد من غير المنشئ، ولقطة لكل مستند.
 * - الإعداد: المدير (manageUsers). الاعتماد: صاحب «اعتماد» وغير المنشئ. القراءة: الاتنين.
 * - التطبيق على المستندات بالإصدار **المعتمد** الساري بتاريخ المستند والشروط بس. المسودة للمعاينة والاختبار بس.
 * - المستند اللي اتحسب مابيتعادش حسابه (اللقطة إلحاق فقط) — B-20 §1، §13.5.
 */
@Injectable()
export class FormulasService {
  constructor(private readonly repo: FormulasRepository, private readonly tx: TransactionRunner, private readonly audit: AuditService) {}

  private canPrepare(u: AuthUser) { if (!u.permissions.manageUsers) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'إعداد المعادلات للمدير بس' }); }
  private canApprove(u: AuthUser) { if (!u.docActions?.approve) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'مالكش صلاحية اعتماد' }); }
  private canRead(u: AuthUser) { if (!u.permissions.manageUsers && !u.docActions?.approve) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'مالكش صلاحية على المعادلات' }); }
  private async must(id: string, em?: Em, lock = false) {
    const v = await this.repo.version(id, em, lock);
    if (!v) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الإصدار غير موجود' });
    return v;
  }
  private dto(v: FormulaVersionRow) { return { ...v, status: displayStatus(v), storedStatus: v.status }; }
  private static def(v: FormulaVersionRow): FormulaDef { return { code: v.code, name: v.name, module: v.module, variables: v.definition.variables as FormulaDef['variables'], lists: v.definition.lists ?? {}, steps: v.definition.steps as Step[], testCases: v.test_cases as FormulaDef['testCases'] }; }

  async list(u: AuthUser) {
    this.canRead(u);
    const [fs, vs] = await Promise.all([this.repo.formulas(), this.repo.versions()]);
    return fs.map((f: { code: string }) => ({ ...f, versions: vs.filter((v) => v.code === f.code).map((v) => this.dto(v)) }));
  }

  async createFormula(u: AuthUser, f: { code: string; name: string; module: string; description?: string }, req?: Request) {
    this.canPrepare(u);
    if (await this.repo.formula(f.code)) throw new ConflictException({ statusCode: 409, code: 'EXISTS', message: 'الكود موجود' });
    await this.repo.insertFormula({ ...f, by: u.id });
    await this.audit.record({ action: 'formula.create', userId: u.id, username: u.username, entity: 'financial_formulas', entityId: f.code, details: { ...f }, req });
    return this.repo.formula(f.code);
  }

  /** إصدار جديد (مسودة): تحقق ثابت (الصيغ آمنة والمتغيرات معرّفة) + تشغيل حالات الاختبار فورًا */
  async createVersion(u: AuthUser, code: string, input: VersionInput, req?: Request) {
    this.canPrepare(u);
    const f = await this.repo.formula(code);
    if (!f) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'المعادلة غير موجودة' });
    const def: FormulaDef = { code, name: f.name, module: f.module, variables: input.definition.variables as FormulaDef['variables'], lists: input.definition.lists ?? {}, steps: input.definition.steps, testCases: input.testCases ?? [] };
    const errors = validateFormula(def);
    if (errors.length) throw new BadRequestException({ statusCode: 400, code: 'INVALID_FORMULA', message: errors });
    if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) throw new BadRequestException({ statusCode: 400, code: 'BAD_DATES', message: 'نهاية السريان قبل بدايته' });
    const results = runTestCases(def);
    const id = await this.tx.run(async (em) => this.repo.insertVersion({
      code, version: await this.repo.nextVersion(code, em), status: 'draft', change_kind: input.changeKind, definition: { variables: def.variables, lists: def.lists, steps: def.steps },
      test_cases: def.testCases, test_results: results, tests_passed: results.length > 0 && results.every((r) => r.status === 'PASS'), tested_at: new Date(),
      conditions: input.conditions ?? {}, effective_from: input.effectiveFrom, effective_to: input.effectiveTo ?? null, change_reason: input.changeReason, created_by: u.id,
    }, em));
    await this.audit.record({ action: 'formula.version.create', userId: u.id, username: u.username, entity: 'financial_formula_versions', entityId: id, details: { code, changeKind: input.changeKind, reason: input.changeReason, after: input.definition }, req });
    return this.dto(await this.must(id));
  }

  async deleteDraft(u: AuthUser, id: string, req?: Request) {
    this.canPrepare(u);
    const v = await this.must(id);
    if (v.status !== 'draft') throw new ConflictException({ statusCode: 409, code: 'NOT_DRAFT', message: 'المسودة بس اللي تتمسح' });
    await this.tx.run((em) => this.repo.deleteDraft(id, em));
    await this.audit.record({ action: 'formula.version.delete_draft', userId: u.id, username: u.username, entity: 'financial_formula_versions', entityId: id, details: { code: v.code, version: v.version }, req });
    return { deleted: true };
  }

  /** معاينة: أي إصدار (حتى المسودة) بمدخلات يدوية — للاختبار بس، مابتتسجّلش على مستند */
  async preview(u: AuthUser, id: string, inputs: Record<string, unknown>) {
    this.canRead(u);
    const v = await this.must(id);
    try { return { outputs: runSteps(v.definition.steps as Step[], inputs) }; }
    catch (e) { if (e instanceof FormulaError) return { error: { code: e.code, message: e.message } }; throw e; }
  }

  async submit(u: AuthUser, id: string, req?: Request) {
    this.canPrepare(u);
    const v = await this.tx.run(async (em) => {
      const v = await this.must(id, em, true);
      if (v.status !== 'draft') throw new ConflictException({ statusCode: 409, code: 'NOT_DRAFT', message: `الإصدار حالته «${v.status}»` });
      // إعادة تشغيل الاختبارات وقت الإرسال (مش الاعتماد على نتيجة قديمة)
      const results = runTestCases(FormulasService.def(v));
      const passed = results.length > 0 && results.every((r) => r.status === 'PASS');
      if (!passed) throw new UnprocessableEntityException({ statusCode: 422, code: 'TESTS_REQUIRED', message: 'لازم كل حالات الاختبار تنجح (وفيه حالة واحدة على الأقل) قبل الإرسال للاعتماد', results });
      await this.repo.update(id, { status: 'pending', submitted_by: u.id, submitted_at: new Date(), test_results: results, tests_passed: true, tested_at: new Date() }, em);
      return v;
    });
    await this.audit.record({ action: 'formula.version.submit', userId: u.id, username: u.username, entity: 'financial_formula_versions', entityId: id, details: { code: v.code, version: v.version }, req });
    return this.dto(await this.must(id));
  }

  async approve(u: AuthUser, id: string, note: string | undefined, req?: Request) {
    this.canApprove(u);
    const out = await this.tx.run(async (em) => {
      const v = await this.must(id, em, true);
      if (v.status !== 'pending') throw new ConflictException({ statusCode: 409, code: 'NOT_PENDING', message: `الإصدار حالته «${v.status}»` });
      if (v.created_by === u.id) throw new ForbiddenException({ statusCode: 403, code: 'SELF_APPROVAL', message: 'منشئ المعادلة مايعتمدهاش (§13.3)' });
      const closed: { version: number; effectiveTo: string }[] = [];
      for (const o of await this.repo.overlapping(v, em)) {
        if (o.effective_from < v.effective_from && o.effective_to == null) { await this.repo.update(o.id, { effective_to: dayBefore(v.effective_from) }, em); closed.push({ version: o.version, effectiveTo: dayBefore(v.effective_from) }); }
        else throw new ConflictException({ statusCode: 409, code: 'OVERLAP', message: `بيتداخل مع الإصدار المعتمد ${o.version} بنفس الشروط` });
      }
      await this.repo.update(id, { status: 'approved', approved_by: u.id, approved_at: new Date(), decision_note: note ?? null }, em);
      return { v, closed };
    });
    await this.audit.record({ action: 'formula.version.approve', userId: u.id, username: u.username, entity: 'financial_formula_versions', entityId: id, details: { code: out.v.code, version: out.v.version, note: note ?? null, closedPrevious: out.closed }, req });
    return this.dto(await this.must(id));
  }

  async decide(u: AuthUser, id: string, cmd: 'reject' | 'suspend', note: string | undefined, req?: Request) {
    this.canApprove(u);
    if (!note?.trim()) throw new BadRequestException({ statusCode: 400, code: 'REASON_REQUIRED', message: 'السبب إلزامي' });
    const v = await this.tx.run(async (em) => {
      const v = await this.must(id, em, true);
      const from = cmd === 'reject' ? 'pending' : 'approved';
      if (v.status !== from) throw new ConflictException({ statusCode: 409, code: 'BAD_STATE', message: `الإصدار حالته «${v.status}»` });
      await this.repo.update(id, { status: cmd === 'reject' ? 'rejected' : 'suspended', decision_note: note.trim() }, em);
      return v;
    });
    await this.audit.record({ action: `formula.version.${cmd}`, userId: u.id, username: u.username, entity: 'financial_formula_versions', entityId: id, details: { code: v.code, version: v.version, reason: note }, req });
    return this.dto(await this.must(id));
  }

  /** الإصدار المعتمد الساري بالتاريخ والشروط — من غيره الحساب بيترفض (مفيش رجوع لمسودة) */
  private async resolve(code: string, date: string, context: Record<string, unknown>, em?: Em) {
    const found = (await this.repo.approvedAt(code, date, em)).filter((v) => matches(v.conditions, context));
    if (!found.length) throw new UnprocessableEntityException({ statusCode: 422, code: 'NO_APPROVED_FORMULA', message: `مفيش إصدار معتمد ساري للمعادلة ${code} بتاريخ ${date}` });
    if (found.length > 1) throw new UnprocessableEntityException({ statusCode: 422, code: 'AMBIGUOUS_FORMULA', message: `أكتر من إصدار معتمد مطابق للمعادلة ${code}` });
    return found[0];
  }
  private static run(v: FormulaVersionRow, inputs: Record<string, unknown>) {
    try { return runSteps(v.definition.steps as Step[], inputs); }
    catch (e) { if (e instanceof FormulaError) throw new UnprocessableEntityException({ statusCode: 422, code: e.code === 'RULE_VIOLATION' ? e.message : e.code, message: e.message }); throw e; }
  }

  async evaluate(code: string, date: string, inputs: Record<string, unknown>, context: Record<string, unknown> = {}) {
    const v = await this.resolve(code, date, context);
    return { code, version: v.version, versionId: v.id, outputs: FormulasService.run(v, inputs) };
  }

  /**
   * للموديولات جوه معاملة المستند: حساب + لقطة (الكود، والإصدار، والمدخلات، والنتيجة، والوقت).
   * لو المستند اتحسب قبل كده: بترجع اللقطة المحفوظة **من غير إعادة حساب** (حتى لو فيه إصدار أحدث) — §13.5.
   */
  async computeAndSnapshot(em: Em, documentType: string, documentId: string, code: string, date: string, inputs: Record<string, unknown>, userId: string | null, context: Record<string, unknown> = {}) {
    const prev = await this.repo.snapshot(documentType, documentId, code, em);
    if (prev) return { code, version: prev.version, versionId: prev.version_id, outputs: prev.outputs, reused: true };
    const v = await this.resolve(code, date, context, em);
    const outputs = FormulasService.run(v, inputs);
    await this.repo.insertSnapshot({ docType: documentType, docId: documentId, code, versionId: v.id, inputs: { date, context, values: inputs }, outputs, by: userId }, em);
    return { code, version: v.version, versionId: v.id, outputs, reused: false };
  }
  snapshot(documentType: string, documentId: string, code: string) { return this.repo.snapshot(documentType, documentId, code); }
}
