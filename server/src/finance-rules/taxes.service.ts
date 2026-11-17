import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth.types';
import { Money } from '../common/money';
import { TransactionRunner } from '../common/transaction';
import { computeTaxes, TaxCalcError, TaxLine, TaxVersion } from './tax-calc';
import { ComputeTaxesDto, CreateTaxCodeDto, CreateTaxVersionDto } from './taxes.dto';
import { TaxesRepository, VersionRow } from './taxes.repository';

const toVersion = (r: VersionRow): TaxVersion => ({
  id: r.id, code: r.code, category: r.category, version: r.version, method: r.method, rate: r.rate == null ? null : Money.of(r.rate).toString(),
  fixedAmount: r.fixed_amount, brackets: r.brackets, base: r.base, baseRatio: Money.of(r.base_ratio).toString(), minBase: r.min_base,
  appliesTo: r.applies_to, conditions: r.conditions ?? {}, exemptions: r.exemptions ?? [], allowStacking: r.allow_stacking,
  effectiveFrom: r.effective_from, effectiveTo: r.effective_to,
});
const dayBefore = (d: string) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10); };

/**
 * محرك القواعد المالية — عائلة الضرائب والاستقطاعات (B-21 مع B-20).
 * - الإعداد (مسودة/إرسال): مدير النظام (manageUsers). الاعتماد/الإيقاف: صاحب فعل «اعتماد» وغير اللي أعدّ الإصدار (B-04).
 * - الحساب بيستخدم **المعتمد الساري بس**. مفيش نسبة افتراضية ولا رجوع لمسودة.
 * - أي تغيير بيتسجّل في التدقيق بالقيمة القديمة والجديدة والسبب.
 */
@Injectable()
export class TaxesService {
  constructor(private readonly repo: TaxesRepository, private readonly tx: TransactionRunner, private readonly audit: AuditService) {}

  private canPrepare(u: AuthUser) { if (!u.permissions.manageUsers) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'إعداد الضرائب للمدير بس — المستخدمين العاديين مايغيّروش النسب' }); }
  private canApprove(u: AuthUser) { if (!u.docActions?.approve) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'مالكش صلاحية اعتماد' }); }
  private canRead(u: AuthUser) { if (!u.permissions.manageUsers && !u.docActions?.approve) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'مالكش صلاحية على إعداد الضرائب' }); }
  private async mustVersion(id: string, em?: Parameters<TaxesRepository['version']>[1], lock = false) {
    const v = await this.repo.version(id, em, lock);
    if (!v) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الإصدار غير موجود' });
    return v;
  }

  async list(u: AuthUser) {
    this.canRead(u);
    const [codes, versions] = await Promise.all([this.repo.codes(), this.repo.versions()]);
    return codes.map((c: { code: string }) => ({ ...c, versions: versions.filter((v) => v.code === c.code) }));
  }

  async createCode(u: AuthUser, dto: CreateTaxCodeDto, req: Request) {
    this.canPrepare(u);
    if (await this.repo.code(dto.code)) throw new ConflictException({ statusCode: 409, code: 'EXISTS', message: 'الكود موجود' });
    await this.repo.insertCode({ ...dto, by: u.id });
    await this.audit.record({ action: 'tax.code.create', userId: u.id, username: u.username, entity: 'tax_codes', entityId: dto.code, details: { ...dto }, req });
    return this.repo.code(dto.code);
  }

  private static validate(dto: CreateTaxVersionDto) {
    const bad = (m: string) => { throw new BadRequestException({ statusCode: 400, code: 'BAD_VERSION', message: m }); };
    if ((dto.method === 'PERCENT') !== (dto.rate != null)) bad('النسبة مع PERCENT بس (وإلزامية معاه)');
    if ((dto.method === 'FIXED') !== (dto.fixedAmount != null)) bad('القيمة الثابتة مع FIXED بس');
    if ((dto.method === 'BRACKETS') !== !!dto.brackets?.length) bad('الشرائح مع BRACKETS بس');
    if (dto.brackets?.length) {
      dto.brackets.forEach((b, i) => { if (b.upTo == null && i !== dto.brackets!.length - 1) bad('الشريحة المفتوحة لازم تبقى الأخيرة'); });
      for (let i = 1; i < dto.brackets.length; i++) { const p = dto.brackets[i - 1].upTo, c = dto.brackets[i].upTo; if (p != null && c != null && Money.of(c).cmp(p) <= 0) bad('الشرائح لازم تكون تصاعدية'); }
    }
    if (dto.effectiveTo && dto.effectiveTo < dto.effectiveFrom) bad('نهاية السريان قبل بدايته');
  }

  async createVersion(u: AuthUser, code: string, dto: CreateTaxVersionDto, req: Request) {
    this.canPrepare(u);
    if (!(await this.repo.code(code))) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الكود غير موجود' });
    TaxesService.validate(dto);
    const id = await this.tx.run(async (em) => this.repo.insertVersion({
      code, version: await this.repo.nextVersion(code, em), status: 'draft', method: dto.method, rate: dto.rate ?? null, fixed_amount: dto.fixedAmount ?? null,
      brackets: dto.brackets ?? null, base: dto.base, base_ratio: dto.baseRatio ?? '100', min_base: dto.minBase ?? null, applies_to: dto.appliesTo,
      bearer: dto.bearer, collector: dto.collector, conditions: dto.conditions ?? {}, exemptions: dto.exemptions ?? [], allow_stacking: dto.allowStacking ?? false,
      effective_from: dto.effectiveFrom, effective_to: dto.effectiveTo ?? null, legal_ref: dto.legalRef ?? null, notes_cfo: dto.notesCfo ?? null,
      notes_advisor: dto.notesAdvisor ?? null, change_reason: dto.changeReason, created_by: u.id,
    }, em));
    await this.audit.record({ action: 'tax.version.create', userId: u.id, username: u.username, entity: 'tax_code_versions', entityId: id, details: { code, after: { ...dto }, reason: dto.changeReason }, req });
    return this.mustVersion(id);
  }

  async deleteDraft(u: AuthUser, id: string, req: Request) {
    this.canPrepare(u);
    const v = await this.mustVersion(id);
    if (v.status !== 'draft') throw new ConflictException({ statusCode: 409, code: 'NOT_DRAFT', message: 'المسودة بس اللي تتمسح' });
    await this.tx.run((em) => this.repo.deleteDraft(id, em));
    await this.audit.record({ action: 'tax.version.delete_draft', userId: u.id, username: u.username, entity: 'tax_code_versions', entityId: id, details: { before: v }, req });
    return { deleted: true };
  }

  async submit(u: AuthUser, id: string, req: Request) {
    this.canPrepare(u);
    const v = await this.tx.run(async (em) => {
      const v = await this.mustVersion(id, em, true);
      if (v.status !== 'draft') throw new ConflictException({ statusCode: 409, code: 'NOT_DRAFT', message: `الإصدار حالته «${v.status}»` });
      if (!v.legal_ref?.trim()) throw new UnprocessableEntityException({ statusCode: 422, code: 'LEGAL_REF_REQUIRED', message: 'المرجع القانوني إلزامي قبل الإرسال للاعتماد' });
      await this.repo.setStatus(id, { status: 'pending', submitted_by: u.id, submitted_at: new Date() }, em);
      return v;
    });
    await this.audit.record({ action: 'tax.version.submit', userId: u.id, username: u.username, entity: 'tax_code_versions', entityId: id, details: { code: v.code, version: v.version }, req });
    return this.mustVersion(id);
  }

  /** اعتماد: غير اللي أعدّ (B-04) + مفيش تداخل مع إصدار معتمد بنفس الشروط (القديم المفتوح بيتقفل لليوم السابق) */
  async approve(u: AuthUser, id: string, note: string | undefined, req: Request) {
    this.canApprove(u);
    const out = await this.tx.run(async (em) => {
      const v = await this.mustVersion(id, em, true);
      if (v.status !== 'pending') throw new ConflictException({ statusCode: 409, code: 'NOT_PENDING', message: `الإصدار حالته «${v.status}»` });
      if (v.created_by === u.id) throw new ForbiddenException({ statusCode: 403, code: 'SELF_APPROVAL', message: 'اللي أعدّ الإصدار مايعتمدوش (فصل المهام — B-04)' });
      const closed: { id: string; version: number; effectiveTo: string }[] = [];
      for (const o of await this.repo.overlapping(v, em)) {
        if (o.effective_from < v.effective_from && o.effective_to == null) {
          await this.repo.setStatus(o.id, { effective_to: dayBefore(v.effective_from) }, em);
          closed.push({ id: o.id, version: o.version, effectiveTo: dayBefore(v.effective_from) });
        } else throw new ConflictException({ statusCode: 409, code: 'OVERLAP', message: `بيتداخل مع الإصدار المعتمد ${o.version} بنفس الشروط — عدّل تواريخ السريان أو أوقف القديم`, version: o.version });
      }
      await this.repo.setStatus(id, { status: 'approved', approved_by: u.id, approved_at: new Date(), decision_note: note ?? null }, em);
      return { v, closed };
    });
    await this.audit.record({ action: 'tax.version.approve', userId: u.id, username: u.username, entity: 'tax_code_versions', entityId: id, details: { code: out.v.code, version: out.v.version, note: note ?? null, closedPrevious: out.closed }, req });
    return this.mustVersion(id);
  }

  async reject(u: AuthUser, id: string, note: string | undefined, req: Request) {
    this.canApprove(u);
    if (!note?.trim()) throw new BadRequestException({ statusCode: 400, code: 'REASON_REQUIRED', message: 'سبب الرفض إلزامي' });
    const v = await this.tx.run(async (em) => {
      const v = await this.mustVersion(id, em, true);
      if (v.status !== 'pending') throw new ConflictException({ statusCode: 409, code: 'NOT_PENDING', message: `الإصدار حالته «${v.status}»` });
      await this.repo.setStatus(id, { status: 'rejected', decision_note: note.trim() }, em);
      return v;
    });
    await this.audit.record({ action: 'tax.version.reject', userId: u.id, username: u.username, entity: 'tax_code_versions', entityId: id, details: { code: v.code, version: v.version, reason: note }, req });
    return this.mustVersion(id);
  }

  async suspend(u: AuthUser, id: string, note: string | undefined, req: Request) {
    this.canApprove(u);
    if (!note?.trim()) throw new BadRequestException({ statusCode: 400, code: 'REASON_REQUIRED', message: 'سبب الإيقاف إلزامي' });
    const v = await this.tx.run(async (em) => {
      const v = await this.mustVersion(id, em, true);
      if (v.status !== 'approved') throw new ConflictException({ statusCode: 409, code: 'NOT_APPROVED', message: 'الإيقاف للإصدار المعتمد بس' });
      await this.repo.setStatus(id, { status: 'suspended', decision_note: note.trim() }, em);
      return v;
    });
    await this.audit.record({ action: 'tax.version.suspend', userId: u.id, username: u.username, entity: 'tax_code_versions', entityId: id, details: { code: v.code, version: v.version, reason: note }, req });
    return this.mustVersion(id);
  }

  /** حساب (معاينة أو للموديولات): المعتمد الساري بس — مفيش نسبة غير معتمدة بتتطبّق أبدًا */
  async compute(dto: ComputeTaxesDto, em?: Parameters<TaxesRepository['approvedAt']>[2]): Promise<TaxLine[]> {
    const approved = (await this.repo.approvedAt(dto.codes, dto.date, em)).map(toVersion);
    try { return computeTaxes(dto as never, approved); }
    catch (e) {
      if (e instanceof TaxCalcError) throw new UnprocessableEntityException({ statusCode: 422, code: e.code, message: e.message, details: e.details });
      throw e;
    }
  }

  /** للموديولات جوه معاملة المستند: حساب + لقطة بالإصدار المستخدم (مابتتعادش لو النسبة اتغيّرت — B-21 §6) */
  async computeAndSnapshot(em: Parameters<TaxesRepository['insertTaxLines']>[4], documentType: string, documentId: string, dto: Omit<ComputeTaxesDto, 'documentType'>, userId: string | null) {
    const lines = await this.compute({ ...dto, documentType }, em);
    await this.repo.insertTaxLines(documentType, documentId, lines, userId, em);
    return lines;
  }
  documentLines(docType: string, docId: string) { return this.repo.documentLines(docType, docId); }
}
