import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import { DataService } from '../data/data.service';
import { CreateItemDto, CreateLocationDto, TransferDto, UpdateItemDto, UpdateLocationDto } from './warehouses.dto';
import { Rec, WarehousesRepository } from './warehouses.repository';

const s = (v: unknown) => (v == null ? '' : String(v));
const num = (v: unknown) => (v == null || v === '' ? null : String(v));
/** كمية نصية (5 خانات) ← رقم JSON بنفس شكل الواجهة الحالية، بس لو بيتمثّل بالظبط */
function qtyNumber(q: string): number {
  const n = Number(q);
  if (q.replace(/[.-]/g, '').replace(/^0+/, '').length > 15 || !Number.isFinite(n)) throw new UnprocessableEntityException({ statusCode: 422, code: 'PRECISION_LIMIT', message: 'الكمية أطول من اللي يتخزّن بدقة' });
  return n;
}

/**
 * المخازن (6.2-ب): الأصناف والمخازن والأرصدة والتحويل. القواعد = قواعد الواجهة الحالية + B-50 (من قاعدة البيانات).
 * مفيش أي حساب تكلفة هنا (B-20). الكتابة بتمر بنفس طبقة السجلات (نسخة واحدة قابلة للكتابة، والبث والتدقيق والتعارض شغالين).
 */
/** عمود «ملاحظات» في جدول الأرصدة القديم — whItemNotesIssues (renderer/core/alerts-center.js:305). مقارنة بالدالة القديمة: tests-merge/phase65.js */
export function itemIssues(it: Record<string, unknown>, total: string): string[] {
  const out: string[] = []; const min = Number(it.minQty) || 0;
  if (!it.category) out.push('ناقص: التصنيف');
  if (min) { const q = Number(total); if (q <= 0) out.push('نفد من المخزون'); else if (q <= min) out.push('تحت حد الطلب'); }
  return out;
}

@Injectable()
export class WarehousesService {
  constructor(private readonly repo: WarehousesRepository, private readonly data: DataService) {}

  private assert(u: AuthUser, action: 'view' | 'add' | 'edit') {
    const ok = action === 'view'
      ? hasPagePermission(u.permissions, 'warehouses.home', 'view') || hasPagePermission(u.permissions, 'warehouses.reports', 'view')
      : hasPagePermission(u.permissions, 'warehouses.home', action);
    if (!ok) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'ليس لديك صلاحية على المخازن' });
  }
  private async write(u: AuthUser, collection: string, id: string, baseRev: number, set: Record<string, unknown>) {
    const r = await this.data.sync(u, { changes: [{ collection, id, op: 'upsert', baseRev, set }] });
    const c = r.conflicts[0];
    if (!c) return;
    const f = s(c.fields?.[0]);
    if (f.startsWith('negative_stock')) throw new ConflictException({ statusCode: 409, code: 'NEGATIVE_STOCK', message: 'الرصيد المتاح مايكفيش — ممنوع الرصيد المخزني السالب (B-50). كمّل الاستلام أو اعمل تسوية معتمدة الأول' });
    if (f.startsWith('invalid_movement')) throw new BadRequestException({ statusCode: 400, code: 'INVALID_MOVEMENT', message: 'بيانات الحركة غير صحيحة' });
    throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'السجل اتعدّل من مستخدم تاني — حدّث الصفحة', reason: c.reason });
  }
  private static newId(p: string) { return `${p}_${Date.now().toString(36)}${randomBytes(4).toString('hex')}`; }

  async overview(u: AuthUser) {
    this.assert(u, 'view');
    const [items, locations, bal] = await Promise.all([this.repo.all('warehouses.items'), this.repo.all('warehouses.locations'), this.repo.balances()]);
    const byItem = new Map<string, { locationId: string; balance: string; reserved: string }[]>();
    for (const b of bal) byItem.set(b.item_id, [...(byItem.get(b.item_id) ?? []), { locationId: b.location_id, balance: b.balance, reserved: b.reserved }]);
    return {
      locations: locations.map((l) => ({ id: l.id, name: s(l.data.name), notes: s(l.data.notes), rev: l.rev })),
      items: items.map((i) => {
        const per = byItem.get(i.id) ?? [];
        const total = per.reduce((a, b) => a + Number(b.balance), 0).toString();
        return { id: i.id, code: s(i.data.code), name: s(i.data.name), unit: s(i.data.unit), category: s(i.data.category), minQty: num(i.data.minQty), notes: s(i.data.notes),
          avgCost: num(i.data.avgCost), lastCost: num(i.data.lastCost), rev: i.rev, balances: per, total, issues: itemIssues(i.data, total) };
      }).sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    };
  }

  async movements(u: AuthUser, itemId?: string) {
    this.assert(u, 'view');
    return (await this.repo.movements(itemId ?? null, 300)).map((m: Rec) => ({ id: m.id, ...m.data, rev: m.rev }));
  }

  /** whNextItemCode — renderer/modules/warehouses/helpers.js:18 */
  private async nextItemCode(): Promise<string> {
    const [items, st] = await Promise.all([this.repo.all('warehouses.items'), this.repo.settings()]);
    const prefix = s(st.itemPrefix) || 'ITM-';
    let max = 0;
    for (const i of items) { const m = s(i.data.code).match(/(\d+)\s*$/); if (m) max = Math.max(max, parseInt(m[1], 10) || 0); }
    return prefix + String(max + 1).padStart(4, '0');
  }

  /** whNextMovementId — renderer/modules/warehouses/helpers.js:19 (نفس whNextCode: أكبر رقم في آخر المعرّف + 1، بأربع خانات) */
  private async nextMovementId(): Promise<string> {
    const [moves, st] = await Promise.all([this.repo.movements(null, 1_000_000), this.repo.settings()]);
    const prefix = s(st.movementPrefix) || 'MV-';
    let max = 0;
    for (const m of moves as Rec[]) { const x = s(m.id).match(/(\d+)\s*$/); if (x) max = Math.max(max, parseInt(x[1], 10) || 0); }
    return prefix + String(max + 1).padStart(4, '0');
  }

  async createItem(u: AuthUser, dto: CreateItemDto) {
    this.assert(u, 'add');
    if (!dto.name.trim()) throw new BadRequestException({ statusCode: 400, code: 'NAME_REQUIRED', message: 'اسم الصنف مطلوب' });
    const id = WarehousesService.newId('itm');
    // نفس شكل السجل في الواجهة الحالية (pages-home.js:222). التكلفة 0 لحد أول استلام (الحساب نفسه في الواجهة الحالية لحد B-20)
    await this.write(u, 'warehouses.items', id, 0, { id, code: dto.code?.trim() || await this.nextItemCode(), name: dto.name.trim(), unit: dto.unit?.trim() || 'قطعة',
      category: dto.category?.trim() ?? '', minQty: dto.minQty != null ? qtyNumber(dto.minQty) : null, avgCost: 0, lastCost: 0, notes: dto.notes?.trim() ?? '' });
    return (await this.overview(u)).items.find((i) => i.id === id);
  }

  async updateItem(u: AuthUser, id: string, dto: UpdateItemDto) {
    this.assert(u, 'edit');
    if (!(await this.repo.one('warehouses.items', id))) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الصنف غير موجود' });
    if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException({ statusCode: 400, code: 'NAME_REQUIRED', message: 'اسم الصنف مطلوب' });
    const set: Record<string, unknown> = {};
    for (const k of ['name', 'code', 'unit', 'category', 'notes'] as const) if (dto[k] !== undefined) set[k] = s(dto[k]).trim();
    if (dto.minQty !== undefined) set.minQty = qtyNumber(dto.minQty);
    if (Object.keys(set).length) await this.write(u, 'warehouses.items', id, dto.rev, set);
    return (await this.overview(u)).items.find((i) => i.id === id);
  }

  async createLocation(u: AuthUser, dto: CreateLocationDto) {
    this.assert(u, 'add');
    if (!dto.name.trim()) throw new BadRequestException({ statusCode: 400, code: 'NAME_REQUIRED', message: 'اسم المخزن مطلوب' });
    const existing = new Set((await this.repo.all('warehouses.locations')).map((l) => l.id));
    let id = dto.code?.trim() ?? '';
    if (id && existing.has(id)) throw new ConflictException({ statusCode: 409, code: 'DUPLICATE_CODE', message: 'كود المخزن مستخدم' });
    // الكود الافتراضي زي الواجهة القديمة: LOC- + (عدد المخازن + 1) بخانتين (openWhLocationModal)، وأول رقم فاضي لو اتاخد
    for (let n = existing.size + 1; !id || existing.has(id); n++) id = `LOC-${String(n).padStart(2, '0')}`;
    await this.write(u, 'warehouses.locations', id, 0, { id, name: dto.name.trim(), notes: dto.notes?.trim() ?? '' });
    return (await this.overview(u)).locations.find((l) => l.id === id);
  }

  async updateLocation(u: AuthUser, id: string, dto: UpdateLocationDto) {
    this.assert(u, 'edit');
    if (!(await this.repo.one('warehouses.locations', id))) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'المخزن غير موجود' });
    if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException({ statusCode: 400, code: 'NAME_REQUIRED', message: 'اسم المخزن مطلوب' });
    const set: Record<string, unknown> = {};
    for (const k of ['name', 'notes'] as const) if (dto[k] !== undefined) set[k] = s(dto[k]).trim();
    if (Object.keys(set).length) await this.write(u, 'warehouses.locations', id, dto.rev, set);
    return (await this.overview(u)).locations.find((l) => l.id === id);
  }

  /** التحويل: من غير أثر على التكلفة، وB-50 على المخزن المصدر من قاعدة البيانات */
  async transfer(u: AuthUser, dto: TransferDto) {
    this.assert(u, 'add');
    if (dto.fromLocationId === dto.toLocationId) throw new BadRequestException({ statusCode: 400, code: 'BAD_TRANSFER', message: 'اختر مخزناً مختلفاً للتحويل' });
    if (!(await this.repo.one('warehouses.items', dto.itemId))) throw new BadRequestException({ statusCode: 400, code: 'UNKNOWN_ITEM', message: 'الصنف غير موجود' });
    for (const l of [dto.fromLocationId, dto.toLocationId]) if (!(await this.repo.one('warehouses.locations', l))) throw new BadRequestException({ statusCode: 400, code: 'UNKNOWN_LOCATION', message: 'المخزن غير موجود' });
    // كود الحركة بنفس صيغة الواجهة القديمة (MV-NNNN). لو طلبين اتزامنوا على نفس الرقم، التاني بيرفض بتعارض فبنعيد الحساب (لحد 3 مرات)
    for (let attempt = 0; ; attempt++) {
      const id = await this.nextMovementId();
      try {
        await this.write(u, 'warehouses.movements', id, 0, { id, type: 'transfer', itemId: dto.itemId, qty: qtyNumber(dto.qty), locationId: dto.fromLocationId, toLocationId: dto.toLocationId,
          date: dto.date ?? new Date().toISOString().slice(0, 10), notes: dto.notes?.trim() ?? '' });
        return { id };
      } catch (e) {
        const code = (e as { response?: { code?: string } }).response?.code;
        if (code !== 'CONFLICT' || attempt >= 2) throw e;
      }
    }
  }
}
