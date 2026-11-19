import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit, UnprocessableEntityException } from '@nestjs/common';
import type { Request } from 'express';
import { ApprovalsService } from '../approvals/approvals.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import { DataService } from '../data/data.service';
import { CreateAdjustmentDto, UpdateAdjustmentDto } from './stock.dto';
import { AdjustmentRow, StockRepository } from './stock.repository';

export const ADJ_DOC_TYPE = 'stock-adjustment';
const DIRECTION: Record<string, 'in' | 'out' | 'transfer' | null> = { increase: 'in', deficit: 'out', damage: 'out', correction: null, stocktake: null, transfer: 'transfer' };
const MOVE_TYPE = { in: 'adjust_in', out: 'adjust_out', transfer: 'transfer' } as const;
const FINAL: Record<string, string> = { Approved: 'approved', Rejected: 'rejected', Returned: 'returned', Cancelled: 'cancelled', Withdrawn: 'withdrawn' };

/**
 * التسويات المخزنية (B-51): مسودة (أمين المخزن) ← إرسال لمحرك الاعتمادات (المستويات والمعتمدين من الإعداد، مفيش افتراضي)
 * ← معتمد بالكامل ← **ترحيل آلي** لحركة مخزون بتمر بقيد B-50. الكمية مابتدخلش الرصيد قبل الترحيل الفعلي.
 * فصل المهام إلزامي من غير استثناء لنوع المستند ده (SOD_MANDATORY_TYPES في المحرك).
 */
@Injectable()
export class StockService implements OnModuleInit {
  constructor(private readonly repo: StockRepository, private readonly approvals: ApprovalsService, private readonly data: DataService, private readonly audit: AuditService) {}

  onModuleInit() {
    this.approvals.onFinalStatus(ADJ_DOC_TYPE, async (e) => {
      const to = FINAL[e.status]; if (!to) return;
      const a = await this.repo.get(e.documentId);
      if (!a || a.approval_request_id !== e.requestId || a.status !== 'submitted') return;
      await this.repo.update(a.id, to === 'approved' ? { status: to, approved_at: new Date() } : { status: to });
      if (to === 'approved') await this.post(a.id, e.actor, true); // B-51 §2.6: الترحيل آلي بعد اكتمال الاعتمادات
    });
  }

  private canView(u: AuthUser) { return u.permissions.manageUsers || hasPagePermission(u.permissions, 'warehouses.home', 'view') || hasPagePermission(u.permissions, 'warehouses.reports', 'view'); }
  private async must(id: string) {
    const a = await this.repo.get(id);
    if (!a) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'التسوية غير موجودة' });
    return a;
  }
  private dto(a: AdjustmentRow) {
    return { id: a.id, kind: a.kind, direction: a.direction, itemId: a.item_id, locationId: a.location_id, toLocationId: a.to_location_id, qty: a.qty, reason: a.reason, status: a.status,
      approvalRequestId: a.approval_request_id, movementId: a.movement_id, postError: a.post_error, createdBy: a.created_by, createdAt: a.created_at, postedAt: a.posted_at, cancelReason: a.cancel_reason, rowVersion: a.row_version };
  }

  async list(u: AuthUser) {
    if (!this.canView(u)) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'مالكش صلاحية على المخازن' });
    return (await this.repo.list()).map((a) => this.dto(a));
  }
  /** التفاصيل: صاحب صفحة المخازن أو المدير أو أي حد في مسار اعتمادها (المراجع/المحاسب/المدير المالي) */
  async get(u: AuthUser, id: string) {
    const a = await this.must(id);
    if (!this.canView(u) && a.created_by !== u.id) {
      let involved = false;
      if (a.approval_request_id) { try { await this.approvals.get(a.approval_request_id, u); involved = true; } catch { /* مش طرف */ } }
      if (!involved) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'التسوية غير موجودة' });
    }
    return this.dto(a);
  }

  async create(u: AuthUser, dto: CreateAdjustmentDto, req: Request) {
    if (!hasPagePermission(u.permissions, 'warehouses.home', 'add')) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'إنشاء التسوية لأمين المخزن (صلاحية إضافة على المخازن)' });
    const dir = DIRECTION[dto.kind] ?? dto.direction;
    if (!dir) throw new BadRequestException({ statusCode: 400, code: 'DIRECTION_REQUIRED', message: 'التصحيح ونتيجة الجرد محتاجين اتجاه (زيادة/نقص)' });
    if (DIRECTION[dto.kind] && dto.direction && dto.direction !== DIRECTION[dto.kind]) throw new BadRequestException({ statusCode: 400, code: 'BAD_DIRECTION', message: 'الاتجاه مش متسق مع نوع التسوية' });
    if ((dir === 'transfer') !== !!dto.toLocationId) throw new BadRequestException({ statusCode: 400, code: 'BAD_TRANSFER', message: 'المخزن المحوَّل له للتحويل بس (وإلزامي معاه)' });
    if (dto.toLocationId && dto.toLocationId === dto.locationId) throw new BadRequestException({ statusCode: 400, code: 'BAD_TRANSFER', message: 'التحويل لمخزن مختلف' });
    if (!(await this.repo.exists('warehouses.items', dto.itemId))) throw new BadRequestException({ statusCode: 400, code: 'UNKNOWN_ITEM', message: 'الصنف غير موجود' });
    for (const l of [dto.locationId, dto.toLocationId].filter(Boolean) as string[])
      if (!(await this.repo.exists('warehouses.locations', l))) throw new BadRequestException({ statusCode: 400, code: 'UNKNOWN_LOCATION', message: 'المخزن غير موجود' });
    const id = await this.repo.insert({ kind: dto.kind, direction: dir, item: dto.itemId, location: dto.locationId, to: dto.toLocationId ?? null, qty: dto.qty, reason: dto.reason.trim(), by: u.id });
    await this.audit.record({ action: 'stock.adjustment.create', userId: u.id, username: u.username, entity: 'stock_adjustments', entityId: id, details: { ...dto }, req });
    return this.dto((await this.repo.get(id))!);
  }

  async update(u: AuthUser, id: string, dto: UpdateAdjustmentDto, req: Request) {
    const a = await this.must(id);
    if (a.created_by !== u.id) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'التعديل لمنشئ التسوية بس' });
    if (!['draft', 'returned'].includes(a.status)) throw new ConflictException({ statusCode: 409, code: 'IMMUTABLE', message: 'التسوية مابتتعدّلش بعد الإرسال — ألغها قبل الترحيل أو اعمل تسوية تصحيح بعده (B-51)' });
    if (dto.rowVersion !== a.row_version) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'التسوية اتعدّلت — حدّث الصفحة' });
    const set: Record<string, unknown> = {};
    if (dto.qty !== undefined) set.qty = dto.qty;
    if (dto.reason !== undefined) set.reason = dto.reason.trim();
    if (Object.keys(set).length) await this.repo.update(id, set);
    await this.audit.record({ action: 'stock.adjustment.update', userId: u.id, username: u.username, entity: 'stock_adjustments', entityId: id, details: { before: { qty: a.qty, reason: a.reason }, after: set }, req });
    return this.dto((await this.repo.get(id))!);
  }

  /** إرسال لمحرك الاعتمادات — مفيش قيمة مالية لحد اعتماد معادلة التكلفة (B-20)، فالمسار بيتحدد بنوع المستند بس */
  async submit(u: AuthUser, id: string, req: Request) {
    const a = await this.must(id);
    if (a.created_by !== u.id) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'الإرسال لمنشئ التسوية' });
    if (!['draft', 'returned'].includes(a.status)) throw new ConflictException({ statusCode: 409, code: 'NOT_DRAFT', message: `التسوية حالتها «${a.status}»` });
    const r = await this.approvals.submit({ documentType: ADJ_DOC_TYPE, documentId: id }, u, req);
    await this.repo.update(id, { status: 'submitted', approval_request_id: r.id, submitted_at: new Date() });
    return this.dto((await this.repo.get(id))!);
  }

  /** إلغاء قبل الترحيل بس (المنشئ أو المدير، بسبب). بعد الترحيل = تسوية تصحيح */
  async cancel(u: AuthUser, id: string, reason: string | undefined, req: Request) {
    if (!reason?.trim()) throw new BadRequestException({ statusCode: 400, code: 'REASON_REQUIRED', message: 'سبب الإلغاء إلزامي' });
    const a = await this.must(id);
    if (a.created_by !== u.id && !u.permissions.manageUsers) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'الإلغاء للمنشئ أو المدير' });
    if (a.status === 'posted') throw new ConflictException({ statusCode: 409, code: 'POSTED', message: 'التسوية اترحّلت — التصحيح بتسوية تصحيح معتمدة (B-51)' });
    if (!['draft', 'returned', 'submitted', 'approved'].includes(a.status)) throw new ConflictException({ statusCode: 409, code: 'NOT_CANCELLABLE', message: `التسوية حالتها «${a.status}»` });
    if (a.status === 'submitted' && a.approval_request_id) await this.approvals.close(a.approval_request_id, 'cancel', reason, u, req); // المعالج بيحدّث الحالة
    const now = await this.repo.get(id);
    if (now!.status !== 'cancelled') await this.repo.update(id, { status: 'cancelled', cancel_reason: reason.trim() });
    else await this.repo.update(id, { cancel_reason: reason.trim() });
    await this.audit.record({ action: 'stock.adjustment.cancel', userId: u.id, username: u.username, entity: 'stock_adjustments', entityId: id, details: { from: a.status, reason }, req });
    return this.dto((await this.repo.get(id))!);
  }

  /**
   * الترحيل: آلي بعد الاعتماد الكامل، أو إعادة محاولة يدوية لصاحب صلاحية «ترحيل» المستقلة (B-05) بس.
   * الحركة بتمر بقيد B-50 في قاعدة البيانات — لو الرصيد مايكفيش التسوية بتفضل «معتمدة» بسبب الفشل، ومابتتجاوزش المنع.
   */
  async post(id: string, u: AuthUser, automatic = false) {
    if (!automatic && !u.docActions?.post) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'الترحيل محتاج صلاحية «ترحيل» مستقلة (B-05)' });
    const a = await this.must(id);
    if (a.status !== 'approved') throw new ConflictException({ statusCode: 409, code: 'NOT_APPROVED', message: 'الترحيل للتسوية المعتمدة بالكامل بس' });
    const qtyNum = Number(a.qty);
    if (String(qtyNum) !== String(Number(a.qty)) || a.qty.replace(/[-.]/g, '').replace(/^0+/, '').length > 15) throw new UnprocessableEntityException({ statusCode: 422, code: 'PRECISION_LIMIT', message: 'الكمية أطول من اللي يتخزّن بدقة' });
    const moveId = `adj-${a.id}`;
    const set: Record<string, unknown> = { id: moveId, type: MOVE_TYPE[a.direction], itemId: a.item_id, qty: qtyNum, locationId: a.location_id, date: new Date().toISOString().slice(0, 10),
      adjustmentId: a.id, adjustmentKind: a.kind, notes: a.reason, ...(a.to_location_id ? { toLocationId: a.to_location_id } : {}) };
    const res = await this.data.sync(u, { changes: [{ collection: 'warehouses.movements', id: moveId, op: 'upsert', baseRev: 0, set }] }, { trusted: true });
    const applied = res.applied.find((x) => x.id === moveId && x.op !== 'noop');
    if (!applied) {
      const why = res.conflicts[0]?.fields?.[0] ?? res.conflicts[0]?.reason ?? 'unknown';
      await this.repo.update(id, { post_error: why });
      await this.audit.record({ action: 'stock.adjustment.post_failed', userId: u.id, username: u.username, entity: 'stock_adjustments', entityId: id, details: { reason: why, automatic } });
      return this.dto((await this.repo.get(id))!);
    }
    await this.repo.update(id, { status: 'posted', movement_id: moveId, posted_by: u.id, posted_at: new Date(), post_error: null });
    await this.audit.record({ action: 'stock.adjustment.posted', userId: u.id, username: u.username, entity: 'stock_adjustments', entityId: id, details: { movementId: moveId, automatic } });
    return this.dto((await this.repo.get(id))!);
  }
}
