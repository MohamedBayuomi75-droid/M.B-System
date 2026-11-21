import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { QueryRunner } from 'typeorm';
import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import { Money } from '../common/money';
import type { RecordChangeDto } from '../data/data.dto';
import { DataService } from '../data/data.service';
import { NumberingService } from '../numbering/numbering.service';
import {
  filterInvoices, getInvoiceDueDate, Inv, invoiceMissingFields, invoiceRemaining, invoiceStatusKey, invoiceTotals, isInvoiceOverdue,
  linkedOriginalState, paidByInvoice, selfSaveState, Supplier, todayIso, validateInvoiceFields,
} from './invoice-rules';
import { ListInvoicesQuery, SaveInvoiceDto, UpdateInvoiceDto } from './supplier-invoices.dto';
import { Rec, SupplierInvoicesRepository } from './supplier-invoices.repository';

const COLL = 'ledger.invoices';
/** state.js — نفس القوايم الثابتة في الواجهة القديمة */
const CATEGORY_SUGGESTIONS = ['مصاريف', 'تكاليف', 'أصول ثابتة', 'مخزون / مشتريات'];
const NATURE_OPTIONS = [{ code: '1', label: 'مقاولات' }, { code: '2', label: 'توريدات' }, { code: '3', label: 'مشتريات' }, { code: '4', label: 'خدمات' }, { code: '10', label: 'أعمال مهنية' }];
const DISCOUNT_TYPE_OPTIONS = [{ code: '1', label: 'غير محدد' }, { code: '2', label: 'مردودات' }, { code: '3', label: 'رد تجاري' }, { code: '5', label: 'دفعات مقدمة' }, { code: '6', label: 'إعفاءات' }, { code: '7', label: 'مردودات دفعات' }, { code: '8', label: 'مردودات إعفاءات' }];
/** rememberManyCodes (helpers.js:808): الحفظ القديم بيضيف الأكواد والأصناف الجديدة لقوايم الاقتراحات */
const REMEMBER: [string, string][] = [['internalCode', 'ledger.customInternalCodes'], ['supplierItemCode', 'ledger.customSupplierItemCodes'], ['description', 'ledger.customItemNames'], ['itemDescription', 'ledger.customItemDescriptions']];
const s = (v: unknown) => (v == null ? '' : String(v));
const normNo = (v: unknown) => s(v).trim().toLowerCase();
/** مبلغ (نص عشري) ← رقم JSON بنفس شكل الواجهة القديمة، بس لو بيتمثّل بالظبط (15 رقم) */
function jsonNumber(m: Money): number {
  const t = m.toString();
  if (t.replace(/[.-]/g, '').replace(/^0+/, '').length > 15) throw new UnprocessableEntityException({ statusCode: 422, code: 'PRECISION_LIMIT', message: 'المبلغ أطول من اللي يتخزّن بدقة' });
  return Number(t);
}
/** مبلغ قديم (رقم أو نص) ← نص بأربع خانات للحدث */
const amt = (v: unknown) => Money.fromNumberUnsafe(Number(v) || 0).toFixed();

interface PendingEvent { type: string; key: string; aggregateId: string; payload: Record<string, unknown> }

/**
 * فواتير ومرتجعات الموردين (7.2.4). القواعد = الواجهة القديمة (invoice-rules.ts، LEGACY-PRESERVE) + القرارات:
 *  - المعادلة الانتقالية للجديد (DEC-0107): الإجمالي = الأساسي + ق.م + الدمغة، والصافي = الإجمالي − المحجوز، بأربع خانات HALF_UP (B-25).
 *    القديم بقيمه، ومابيتعادش حسابه إلا لو اتعدّل من هنا (ساعتها بيتحسب زي ما الواجهة القديمة بتعمل عند الحفظ).
 *  - رقم داخلي سنوي PI-/PR- من خدمة NO_GAPS للجديد بس (DEC-0103، DEC-0108)، جوه معاملة المستند.
 *  - B-31 للجديد: رقم المورد فريد لكل مورد جوه نفس النوع (س1)، تحت قفل الكتابة العام (ومعاه trigger في الجدول بعد النقل).
 *  - المرتجع المربوط بيلغي الأصل أو يعلّم postReturnWht (recalcLinkedOriginal)، في نفس المعاملة.
 *  - أحداث outbox (DEC-0104) بمفتاح idempotency، ومفيش قيود محاسبية (المرحلة 10). مفيش اعتماد على الفاتورة (الحالي كده).
 */
@Injectable()
export class SupplierInvoicesService {
  constructor(private readonly repo: SupplierInvoicesRepository, private readonly data: DataService, private readonly numbering: NumberingService) {}

  private assertView(u: AuthUser) {
    if (!['ledger.invoices', 'ledger.returns'].some((p) => hasPagePermission(u.permissions, p, 'view'))) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'ليس لديك صلاحية على الفواتير' });
  }
  /** نافذة الفاتورة القديمة بتفحص صلاحية «الفواتير»، وزرار «إضافة مرتجع» بيفحص «المرتجعات» */
  private assertWrite(u: AuthUser, action: 'add' | 'edit', isReturn: boolean) {
    if (hasPagePermission(u.permissions, 'ledger.invoices', action) || (isReturn && hasPagePermission(u.permissions, 'ledger.returns', action))) return;
    throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: action === 'edit' ? '🔒 ماعندكش صلاحية تعديل الفواتير' : '🔒 ماعندكش صلاحية إضافة فواتير' });
  }

  async list(u: AuthUser, q: ListInvoicesQuery) {
    this.assertView(u);
    const [invs, sups, pays] = await Promise.all([this.repo.all(COLL), this.repo.all('ledger.suppliers'), this.repo.all('ledger.payments')]);
    const suppliers = new Map<string, Supplier>(sups.map((x) => [x.id, { ...x.data, id: x.id }]));
    const paid = paidByInvoice(pays.map((p) => p.data));
    const today = todayIso();
    const revs = new Map(invs.map((x) => [x.id, x.rev]));
    const rows = filterInvoices(invs.map((x) => ({ ...x.data, id: x.id })), { ...q, overdueOnly: !!q.overdueOnly }, suppliers, paid, today);
    const years = [...new Set(invs.map((i) => s(i.data.date).slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    return {
      totals: invoiceTotals(rows), years,
      rows: rows.map((i) => this.view(i, revs.get(i.id) ?? 0, suppliers, paid, today)),
    };
  }

  private view(i: Inv, rev: number, suppliers: Map<string, Supplier>, paid: Map<string, number>, today: string) {
    const sup = suppliers.get(i.supplierId);
    return { ...i, rev, supplierName: s(sup?.name), supplierTaxId: s(sup?.taxId), dueDateEffective: getInvoiceDueDate(i), remaining: invoiceRemaining(i, paid),
      paid: Number(paid.get(i.id) || 0), overdue: isInvoiceOverdue(i, paid, today), status: invoiceStatusKey(i, paid), missing: invoiceMissingFields(i, !!sup) };
  }

  async get(u: AuthUser, id: string) {
    this.assertView(u);
    const r = await this.repo.one(COLL, id);
    if (!r) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' });
    const [invs, sups, pays, events] = await Promise.all([this.repo.all(COLL), this.repo.all('ledger.suppliers'), this.repo.all('ledger.payments'), this.repo.events(id)]);
    const suppliers = new Map<string, Supplier>(sups.map((x) => [x.id, { ...x.data, id: x.id }]));
    const paid = paidByInvoice(pays.map((p) => p.data));
    return {
      ...this.view({ ...r.data, id }, r.rev, suppliers, paid, todayIso()),
      linkedReturns: invs.filter((x) => x.data.isReturn && x.data.linkedInvoiceId === id).map((x) => ({ id: x.id, invoiceNo: s(x.data.invoiceNo), date: s(x.data.date), netInvoice: x.data.netInvoice })),
      events: events.map((e) => ({ type: e.event_type, key: e.idempotency_key })),
    };
  }

  /**
   * اختيارات النافذة والفلاتر — نفس مصادر القديم: allCategories/allProjects/allInternalCodes… (helpers.js:753)، وNATURE_OPTIONS/DISCOUNT_TYPE_OPTIONS (state.js)،
   * وعدد خانات العرض (settings.moneyDecimals، الافتراضي 6 زي fmt القديم).
   */
  async options(u: AuthUser) {
    this.assertView(u);
    const keys = ['settings', 'ledger.hiddenSuggestions', 'ledger.customCategories', 'ledger.hiddenProjects', 'ledger.customProjects', 'ledger.customInternalCodes', 'ledger.customSupplierItemCodes', 'ledger.customItemNames', 'ledger.customItemDescriptions'];
    const [d, invs, sups] = await Promise.all([this.repo.docs(keys), this.repo.all(COLL), this.repo.all('ledger.suppliers')]);
    const arr = (k: string) => (Array.isArray(d.get(k)) ? (d.get(k) as unknown[]).map(s).filter(Boolean) : []);
    const sortAr = (x: Set<string>) => [...x].sort((a, b) => a.localeCompare(b, 'ar'));
    const hidden = new Set(arr('ledger.hiddenSuggestions'));
    const cats = new Set(CATEGORY_SUGGESTIONS.filter((c) => !hidden.has(c)));
    arr('ledger.customCategories').forEach((c) => cats.add(c));
    invs.forEach((i) => { if (i.data.category) cats.add(s(i.data.category)); });
    const hiddenP = new Set(arr('ledger.hiddenProjects'));
    const projs = new Set<string>();
    arr('ledger.customProjects').forEach((c) => { if (!hiddenP.has(c)) projs.add(c); });
    invs.forEach((i) => { if (i.data.project && !hiddenP.has(s(i.data.project))) projs.add(s(i.data.project)); });
    const lines = (key: string, list: string) => { const set = new Set(arr(list).map((x) => x.trim())); invs.forEach((i) => s(i.data[key]).split('\n').forEach((x) => { if (x.trim()) set.add(x.trim()); })); return [...set]; };
    const md = (d.get('settings') as { moneyDecimals?: unknown } | undefined)?.moneyDecimals;
    const n = Number(md);
    return {
      moneyDecimals: md === 'auto' ? 'auto' : md !== undefined && md !== '' && Number.isInteger(n) && n >= 0 && n <= 6 ? n : 6,
      suppliers: sups.map((x) => ({ id: x.id, name: s(x.data.name), taxId: s(x.data.taxId), commercialReg: s(x.data.commercialReg) })).sort((a, b) => a.name.localeCompare(b.name, 'ar')),
      categories: sortAr(cats), projects: sortAr(projs),
      internalCodes: lines('internalCode', 'ledger.customInternalCodes'), supplierItemCodes: lines('supplierItemCode', 'ledger.customSupplierItemCodes'),
      itemNames: lines('description', 'ledger.customItemNames'), itemDescriptions: lines('itemDescription', 'ledger.customItemDescriptions'),
      natures: NATURE_OPTIONS, discountTypes: DISCOUNT_TYPE_OPTIONS,
    };
  }

  /** الفواتير الأصلية اللي ينفع المرتجع يتربط بيها (نفس قايمة النافذة القديمة: نفس المورد، مش مرتجع، مش ملغية) */
  async linkable(u: AuthUser, supplierId: string, keep?: string) {
    this.assertView(u);
    return (await this.repo.all(COLL)).filter((x) => (x.data.supplierId === supplierId && !x.data.isReturn && !x.data.cancelled) || (keep && x.id === keep))
      .map((x) => ({ id: x.id, invoiceNo: s(x.data.invoiceNo), date: s(x.data.date), netInvoice: x.data.netInvoice, postReturnWht: !!x.data.postReturnWht }));
  }

  create(u: AuthUser, dto: SaveInvoiceDto) { return this.save(u, null, dto); }
  update(u: AuthUser, id: string, dto: UpdateInvoiceDto) { return this.save(u, id, dto); }

  private async save(u: AuthUser, editId: string | null, dto: SaveInvoiceDto & { rev?: number }) {
    this.assertWrite(u, editId ? 'edit' : 'add', dto.isReturn);
    const id = editId ?? `inv_${Date.now().toString(36)}${randomBytes(4).toString('hex')}`;
    // المعادلة الانتقالية (DEC-0107) بأربع خانات (B-25)
    const base = Money.of(dto.baseValue), vat = Money.of(dto.vat || '0'), stamp = Money.of(dto.stampDuty || '0'), wh = Money.of(dto.withheld || '0');
    const total = base.plus(vat).plus(stamp).round(), net = total.minus(wh).round();
    // نفس كائن fields في زرار الحفظ القديم (modals.js m_save)
    const fields: Inv = {
      supplierId: dto.supplierId, invoiceNo: dto.invoiceNo.trim(), date: dto.date, dueDate: dto.isReturn ? '' : s(dto.dueDate),
      category: s(dto.category).trim(), project: s(dto.project).trim(), invoiceLink: s(dto.invoiceLink).trim(), notes: s(dto.notes).trim(),
      description: s(dto.description), internalCode: s(dto.internalCode), supplierItemCode: s(dto.supplierItemCode), itemDescription: s(dto.itemDescription),
      quantity: s(dto.quantity), unitPrice: s(dto.unitPrice), baseValue: jsonNumber(base), vat: jsonNumber(vat), stampDuty: jsonNumber(stamp),
      discountRate: s(dto.discountRate).trim(), withheld: jsonNumber(wh), withheldStatus: dto.withheldStatus ?? 'unpaid',
      totalInvoice: jsonNumber(total), netInvoice: jsonNumber(net), nature: s(dto.nature).trim(), discountType: s(dto.discountType).trim(),
      isReturn: !!dto.isReturn, linkedInvoiceId: dto.isReturn ? s(dto.linkedInvoiceId) : '',
    };
    const errs = validateInvoiceFields(fields);
    if (errs.length) throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: errs[0], errors: errs });

    const events: PendingEvent[] = [];
    const change: RecordChangeDto = { collection: COLL, id, op: 'upsert', baseRev: editId ? (dto.rev ?? 0) : 0, set: fields } as RecordChangeDto;
    // الأكواد الجديدة (مش موجودة في القايمة) بس — arrayDelta بيضيف من غير ما يمسح حاجة
    const lists = await this.repo.docs(REMEMBER.map((r) => r[1]));
    const docs = REMEMBER.map(([field, key]) => {
      const have = new Set(Array.isArray(lists.get(key)) ? (lists.get(key) as unknown[]).map(s) : []);
      const add = [...new Set(s(fields[field]).split('\n').map((x) => x.trim()).filter((x) => x && !have.has(x)))];
      return add.length ? { key, op: 'arrayDelta', baseRev: 0, add } : null;
    }).filter(Boolean);
    await this.data.sync(u, { changes: [change], docs } as never, {
        before: async (qr) => this.prepare(qr, u, id, editId, fields, events),
        after: async (qr, res) => {
          const c = res.conflicts[0];
          if (c) {
            const f = s(c.fields?.[0]);
            if (f.startsWith('duplicate:')) throw new ConflictException({ statusCode: 409, code: 'DUPLICATE_INVOICE_NO', message: 'رقم الفاتورة ده متسجّل للمورد قبل كده (B-31)' });
            throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'الفاتورة اتعدّلت من مستخدم تاني — حدّث الصفحة', reason: c.reason });
          }
          for (const e of events) {
            // الإلغاء والرجوع ممكن يتكرروا لنفس الفاتورة: المفتاح بالترتيب (تحت قفل الكتابة العام، فمفيش تزامن)
            if (e.key.endsWith(':#')) {
              const [{ n }] = await qr.query(`SELECT count(*)::int AS n FROM integration_events WHERE event_type = $1 AND aggregate_id = $2`, [e.type, e.aggregateId]);
              e.key = e.key.slice(0, -1) + String(n + 1);
            }
            await qr.query(`INSERT INTO integration_events (event_type, aggregate_type, aggregate_id, idempotency_key, payload, created_by) VALUES ($1, 'supplier-invoice', $2, $3, $4::jsonb, $5)
              ON CONFLICT (idempotency_key) DO NOTHING`, [e.type, e.aggregateId, e.key, JSON.stringify(e.payload), u.id]);
          }
        },
    });
    return this.get(u, id);
  }

  /** جوه المعاملة وتحت قفل الكتابة: التحقق من المورد والربط، وB-31، والرقم الداخلي، وأثر المرتجع، والأحداث */
  private async prepare(qr: QueryRunner, u: AuthUser, id: string, editId: string | null, fields: Inv, events: PendingEvent[]): Promise<RecordChangeDto[]> {
    const all = await this.repo.all(COLL, qr);
    const byId = new Map(all.map((x) => [x.id, x]));
    const existing = editId ? byId.get(editId) : undefined;
    if (editId && !existing) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' });
    if (!(await this.repo.one('ledger.suppliers', fields.supplierId, qr))) throw new BadRequestException({ statusCode: 400, code: 'UNKNOWN_SUPPLIER', message: 'المورد غير موجود' });
    const internalNo: string | undefined = existing ? existing.data.internalNo : undefined;
    if (existing && internalNo && !!existing.data.isReturn !== fields.isReturn) throw new BadRequestException({ statusCode: 400, code: 'KIND_LOCKED', message: 'المستند ليه رقم داخلي بنوعه — ماينفعش يتحوّل من فاتورة لمرتجع أو العكس' });
    if (fields.isReturn && fields.linkedInvoiceId) {
      const t = byId.get(fields.linkedInvoiceId);
      const keep = existing && existing.data.linkedInvoiceId === fields.linkedInvoiceId;
      if (!t || t.data.isReturn || t.data.supplierId !== fields.supplierId || (t.data.cancelled && !keep)) throw new BadRequestException({ statusCode: 400, code: 'BAD_LINK', message: 'الفاتورة الأصلية لازم تكون لنفس المورد، ومش مرتجع، ومش ملغية' });
    }
    // الرقم الداخلي للجديد بس (DEC-0108) — والقديم بيفضل من غير رقم حتى لو اتعدّل
    let number = internalNo;
    if (!existing) {
      const year = fields.date.slice(0, 4);
      const kind = fields.isReturn ? 'supplier-return' : 'supplier-invoice';
      const n = await this.numbering.issue(qr.manager, `${kind}:${year}`, kind, id, u.id);
      number = `${fields.isReturn ? 'PR' : 'PI'}-${year}-${String(n).padStart(5, '0')}`;
      fields.internalNo = number;
    }
    // B-31 للي ليه رقم داخلي: مقارنةً بكل الفواتير الحية (القديمة كمان) لنفس المورد ونفس النوع
    if (number && all.some((x) => x.id !== id && x.data.supplierId === fields.supplierId && !!x.data.isReturn === fields.isReturn && normNo(x.data.invoiceNo) === normNo(fields.invoiceNo))) {
      throw new ConflictException({ statusCode: 409, code: 'DUPLICATE_INVOICE_NO', message: 'رقم الفاتورة ده متسجّل للمورد قبل كده (B-31)' });
    }

    // الحالة بعد الحفظ (في الذاكرة) — نفس ترتيب saveInvoiceData
    const saved: Inv = { ...(existing?.data ?? {}), ...fields, id };
    const after: Inv[] = [...all.filter((x) => x.id !== id).map((x) => ({ ...x.data, id: x.id })), saved];
    const system: RecordChangeDto[] = [];
    const before = new Map<string, Inv>(all.map((x) => [x.id, x.data]));
    const touch = (orig: Rec | undefined) => {
      if (!orig || orig.data.isReturn) return;
      const st = linkedOriginalState({ ...orig.data, id: orig.id }, after);
      const cur = { cancelled: orig.data.cancelled, postReturnWht: orig.data.postReturnWht, linkedReturnIds: orig.data.linkedReturnIds };
      if (!isDeepStrictEqual(cur, st)) system.push({ collection: COLL, id: orig.id, op: 'upsert', baseRev: orig.rev, set: st } as RecordChangeDto);
      this.transitionEvents(orig.id, { ...orig.data, ...st }, !!orig.data.cancelled, st.cancelled, events, all, saved);
    };
    if (saved.isReturn) {
      if (saved.linkedInvoiceId) touch(byId.get(saved.linkedInvoiceId));
      const prev = existing?.data.isReturn ? s(existing.data.linkedInvoiceId) : '';
      if (prev && prev !== saved.linkedInvoiceId) touch(byId.get(prev));
    } else {
      const st = selfSaveState(saved, after);
      Object.assign(fields, st);
      this.transitionEvents(id, { ...saved, ...st }, !!before.get(id)?.cancelled, st.cancelled ?? !!before.get(id)?.cancelled, events, all, saved);
    }
    if (!existing) {
      const type = saved.isReturn ? 'supplier-return.posted' : 'supplier-invoice.posted';
      events.unshift({ type, key: `${type}:${id}`, aggregateId: id, payload: this.payload(saved, saved.isReturn && saved.linkedInvoiceId ? { originalInvoiceId: saved.linkedInvoiceId, originalEventKey: this.postedKey(byId.get(saved.linkedInvoiceId)) } : {}) });
    }
    return system;
  }

  private postedKey(r: Rec | undefined) { return r && r.data.internalNo ? `supplier-invoice.posted:${r.id}` : null; }

  /** إلغاء الأصل (أو رجوعه) = حدث جديد، مش تعديل للقديم (DEC-0104). المفتاح بالترتيب لكل فاتورة (#) — بيتحدد وقت الكتابة */
  private transitionEvents(id: string, inv: Inv, was: boolean, now: boolean, events: PendingEvent[], all: Rec[], saved: Inv) {
    if (was === now) return;
    const type = now ? 'supplier-invoice.cancelled' : 'supplier-invoice.reinstated';
    const rets = [...all.map((x): Inv => ({ ...x.data, id: x.id })).filter((x) => x.id !== saved.id), saved].filter((r) => r.isReturn && r.linkedInvoiceId === id).map((r) => r.id).sort();
    const orig = all.find((x) => x.id === id);
    events.push({ type, key: `${type}:${id}:#`, aggregateId: id, payload: {
      ...this.payload(inv), reason: now ? 'المرتجعات المربوطة غطّت صافي الفاتورة' : 'المرتجعات المربوطة مابقتش بتغطي صافي الفاتورة',
      returnIds: rets, originalEventKey: this.postedKey(orig) } });
  }

  /** محتوى الحدث (DEC-0104): المبالغ نصوص بأربع خانات. سطور الضرايب من محرك الضرايب لما نسبها تتعتمد (F-01، B-21…B-24) — لحد دلوقتي فاضية */
  private payload(i: Inv, extra: Record<string, unknown> = {}) {
    return { id: i.id, internalNo: i.internalNo ?? null, invoiceNo: s(i.invoiceNo), date: s(i.date), supplierId: s(i.supplierId), project: s(i.project),
      baseValue: amt(i.baseValue), vat: amt(i.vat), stampDuty: amt(i.stampDuty), total: amt(i.totalInvoice), withheld: amt(i.withheld), net: amt(i.netInvoice),
      currency: 'EGP', taxLines: [], ...extra };
  }
}
