import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import { Money } from '../common/money';
import type { DocChangeDto, RecordChangeDto } from '../data/data.dto';
import { DataService } from '../data/data.service';
import { NumberingService } from '../numbering/numbering.service';
import { Inv, paidByInvoice, Supplier } from '../supplier-invoices/invoice-rules';
import { ClassifyPaymentDto, CreatePaymentDto, ListPaymentsQuery, StatementQuery, UpdatePaymentDto } from './supplier-payments.dto';
import { balanceDiff, directionOf, filterPayments, Pay, statementF05 } from './payment-rules';

const COLL = 'ledger.payments';
const s = (v: unknown) => (v == null ? '' : String(v));
interface Rec { id: string; data: Record<string, any>; rev: number } // eslint-disable-line @typescript-eslint/no-explicit-any
/** مبلغ (نص عشري) ← رقم JSON بنفس شكل الواجهة القديمة، بس لو بيتمثّل بالظبط (15 رقم) */
function jsonNumber(x: Money): number {
  const t = x.toString();
  if (t.replace(/[.-]/g, '').replace(/^0+/, '').length > 15) throw new UnprocessableEntityException({ statusCode: 422, code: 'PRECISION_LIMIT', message: 'المبلغ أطول من اللي يتخزّن بدقة' });
  return Number(t);
}
const amt = (v: unknown) => Money.fromNumberUnsafe(Number(v) || 0);

/**
 * دفعات الموردين والتخصيص والرصيد (7.3.4، DEC-0113).
 *  - الإضافة زي النافذة القديمة: دفعة عامة، أو موزّعة (سجل لكل فاتورة بنفس batchId + الباقي بالفرق الدقيق، س1)، و**من غير تجاوز** باقي الفاتورة (B-72).
 *  - رقم داخلي سنوي `PV-` للدفعة كلها (NO_GAPS)، و`paymentNo` لكل سجل من نفس العدّاد العام بتاع الواجهة القديمة (settings.nextPaymentNo) في نفس المعاملة.
 *  - حدث `supplier-payment.posted` مرة واحدة للدفعة (DEC-0104). مفيش قيود محاسبية.
 *  - التعديل سجل واحد زي القديم (س2). ومراجعة الدفعات من غير اتجاه دفعة بدفعة (B-53).
 *  - الرصيد وكشف الحساب بقاعدة F-05، ومعاهم الرصيد بالطريقة الحالية وعلامة الفرق (DEC-0113 د-2).
 */
@Injectable()
export class SupplierPaymentsService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly data: DataService, private readonly numbering: NumberingService) {}

  private all(c: string, qr?: QueryRunner): Promise<Rec[]> {
    return (qr ?? this.ds).query(`SELECT id, data, rev FROM legacy_records WHERE collection = $1 AND deleted_at IS NULL ORDER BY created_at, id`, [c]);
  }
  private async doc(key: string, qr: QueryRunner): Promise<{ data: Record<string, unknown>; rev: number }> {
    const [r] = await qr.query(`SELECT data, rev FROM docs WHERE key = $1`, [key]);
    return { data: (r?.data && typeof r.data === 'object' ? r.data : {}) as Record<string, unknown>, rev: r?.rev ?? 0 };
  }
  private assert(u: AuthUser, action: 'view' | 'add' | 'edit') {
    const ok = action === 'view' ? ['ledger.payments', 'ledger.suppliers'].some((p) => hasPagePermission(u.permissions, p, 'view')) : hasPagePermission(u.permissions, 'ledger.payments', action);
    if (!ok) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: action === 'edit' ? '🔒 ماعندكش صلاحية تعديل الدفعات' : action === 'add' ? '🔒 ماعندكش صلاحية إضافة دفعات' : 'ليس لديك صلاحية على الدفعات' });
  }

  private view(p: Pay, rev: number, sups: Map<string, Supplier>, invs: Map<string, Inv>) {
    const inv = p.invoiceId ? invs.get(p.invoiceId) : undefined;
    return { ...p, rev, supplierName: s(sups.get(p.supplierId)?.name), invoiceNo: inv ? s(inv.invoiceNo) : '', unclassified: !directionOf(p) };
  }

  async list(u: AuthUser, q: ListPaymentsQuery) {
    this.assert(u, 'view');
    const [pays, sups, invs] = await Promise.all([this.all(COLL), this.all('ledger.suppliers'), this.all('ledger.invoices')]);
    const sm = new Map<string, Supplier>(sups.map((x) => [x.id, { ...x.data, id: x.id }]));
    const im = new Map<string, Inv>(invs.map((x) => [x.id, { ...x.data, id: x.id }]));
    const revs = new Map(pays.map((x) => [x.id, x.rev]));
    const rows = filterPayments(pays.map((x) => ({ ...x.data, id: x.id })), q, sm, im);
    return {
      totals: { count: rows.length, total: rows.reduce((a, b) => a + Number(b.amount || 0), 0) },
      years: [...new Set(pays.map((p) => s(p.data.date).slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
      methods: [...new Set(pays.map((p) => s(p.data.method)).filter(Boolean))],
      unclassifiedCount: pays.filter((p) => !directionOf(p.data)).length,
      rows: rows.map((p) => this.view(p, revs.get(p.id) ?? 0, sm, im)),
    };
  }

  async get(u: AuthUser, id: string) {
    this.assert(u, 'view');
    const [pays, sups, invs] = await Promise.all([this.all(COLL), this.all('ledger.suppliers'), this.all('ledger.invoices')]);
    const r = pays.find((x) => x.id === id);
    if (!r) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الدفعة غير موجودة' });
    const sm = new Map<string, Supplier>(sups.map((x) => [x.id, { ...x.data, id: x.id }]));
    const im = new Map<string, Inv>(invs.map((x) => [x.id, { ...x.data, id: x.id }]));
    const batch = r.data.batchId ? pays.filter((x) => x.data.batchId === r.data.batchId) : [r];
    const events = await this.ds.query(`SELECT event_type AS type, idempotency_key AS key FROM integration_events WHERE aggregate_type = 'supplier-payment' AND aggregate_id = $1 ORDER BY seq`, [s(r.data.batchId) || id]);
    return { ...this.view({ ...r.data, id }, r.rev, sm, im), batch: batch.map((x) => this.view({ ...x.data, id: x.id }, x.rev, sm, im)), events };
  }

  /** الفواتير اللي ليها باقي للمورد (نفس قايمة النافذة: مش مرتجع، مش ملغية، الباقي > 0.009، الأحدث الأول) */
  async openInvoices(u: AuthUser, supplierId: string, keepPaymentId?: string) {
    this.assert(u, 'view');
    const [invs, pays] = await Promise.all([this.all('ledger.invoices'), this.all(COLL)]);
    const keep = keepPaymentId ? pays.find((p) => p.id === keepPaymentId) : undefined;
    const paid = paidByInvoice(pays.filter((p) => p.id !== keepPaymentId).map((p) => p.data));
    return invs.filter((i) => i.data.supplierId === supplierId && !i.data.isReturn && !i.data.cancelled)
      .map((i) => ({ id: i.id, invoiceNo: s(i.data.invoiceNo), date: s(i.data.date), netInvoice: i.data.netInvoice, remaining: amt(i.data.netInvoice).minus(amt(paid.get(i.id) ?? 0)).toFixed() }))
      .filter((i) => Number(i.remaining) > 0.009 || (keep && keep.data.invoiceId === i.id))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async create(u: AuthUser, dto: CreatePaymentDto) {
    this.assert(u, 'add');
    const total = Money.of(dto.amount);
    if (!total.cmp('0') || total.isNegative()) throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: 'أدخل مبلغاً صحيحاً' });
    const allocs = dto.general ? [] : (dto.allocations ?? []).filter((a) => Money.of(a.amount).cmp('0') > 0);
    if (new Set(allocs.map((a) => a.invoiceId)).size !== allocs.length) throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: 'الفاتورة متكررة في التوزيع' });
    const allocated = Money.sum(allocs.map((a) => a.amount));
    if (allocated.cmp(total) > 0) throw new BadRequestException({ statusCode: 400, code: 'OVER_ALLOCATED', message: 'مجموع التوزيع أكبر من المبلغ الإجمالي' });
    const batchId = `pbatch_${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
    const notes = s(dto.notes).trim();
    const base = { supplierId: dto.supplierId, date: dto.date, method: dto.method ?? 'نقدي', direction: dto.direction, transferRef: s(dto.transferRef).trim(),
      extraFields: (dto.extraFields ?? []).map((x) => ({ label: x.label.trim() || 'خانة', value: x.value.trim() })).filter((x) => x.value), batchId, attachments: [] as unknown[] };
    // نفس سجلات الحفظ القديم (modals.js): سجل لكل فاتورة بترتيبها + الباقي، أو سجل واحد للدفعة العامة
    const parts: { invoiceId: string; amount: Money; notes: string }[] = allocs.length
      ? allocs.map((a) => ({ invoiceId: a.invoiceId, amount: Money.of(a.amount), notes }))
      : [{ invoiceId: '', amount: total, notes }];
    const rest = total.minus(allocated);
    if (allocs.length && rest.cmp('0') > 0) parts.push({ invoiceId: '', amount: rest, notes: (notes ? `${notes} — ` : '') + 'متبقي غير موزع' });
    const ids = parts.map(() => `pay_${Date.now().toString(36)}${randomBytes(4).toString('hex')}`);
    let pv = '';
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        if (!(await qr.query(`SELECT 1 FROM legacy_records WHERE collection = 'ledger.suppliers' AND id = $1 AND deleted_at IS NULL`, [dto.supplierId])).length) throw new BadRequestException({ statusCode: 400, code: 'UNKNOWN_SUPPLIER', message: 'اختر المورد' });
        if (allocs.length) {
          const [invs, pays] = await Promise.all([this.all('ledger.invoices', qr), this.all(COLL, qr)]);
          const paid = paidByInvoice(pays.map((p) => p.data));
          for (const a of allocs) {
            const inv = invs.find((i) => i.id === a.invoiceId);
            if (!inv || inv.data.supplierId !== dto.supplierId || inv.data.isReturn || inv.data.cancelled) throw new BadRequestException({ statusCode: 400, code: 'BAD_INVOICE', message: 'الفاتورة لازم تكون لنفس المورد، ومش مرتجع، ومش ملغية' });
            const remaining = amt(inv.data.netInvoice).minus(amt(paid.get(inv.id) ?? 0));
            if (Money.of(a.amount).cmp(remaining) > 0) throw new BadRequestException({ statusCode: 400, code: 'OVER_INVOICE_REMAINING', message: `المبلغ أكبر من باقي الفاتورة ${s(inv.data.invoiceNo)} (B-72)` });
          }
        }
        const year = dto.date.slice(0, 4);
        pv = `PV-${year}-${String(await this.numbering.issue(qr.manager, `supplier-payment:${year}`, 'supplier-payment', batchId, u.id)).padStart(5, '0')}`;
        const st = await this.doc('settings', qr);
        let n = Number(st.data.nextPaymentNo) || 1;
        const records: RecordChangeDto[] = parts.map((p, k) => ({ collection: COLL, id: ids[k], op: 'upsert', baseRev: 0,
          set: { id: ids[k], paymentNo: n++, supplierId: base.supplierId, date: base.date, invoiceId: p.invoiceId, method: base.method, amount: jsonNumber(p.amount), direction: base.direction,
            transferRef: base.transferRef, extraFields: base.extraFields, notes: p.notes, batchId, attachments: base.attachments, internalNo: pv } } as RecordChangeDto));
        const docs: DocChangeDto[] = [{ key: 'settings', op: 'patch', baseRev: st.rev, set: { nextPaymentNo: n } } as DocChangeDto];
        return { records, docs };
      },
      after: async (qr, res) => {
        if (res.conflicts.length) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'تعذّر الحفظ — حدّث الصفحة', reason: res.conflicts[0].reason });
        const payload = { batchId, internalNo: pv, supplierId: dto.supplierId, date: dto.date, direction: dto.direction, method: base.method, amount: total.toFixed(),
          allocations: allocs.map((a) => ({ invoiceId: a.invoiceId, amount: Money.of(a.amount).toFixed() })), unallocated: (allocs.length ? rest : total).toFixed(), currency: 'EGP' };
        await qr.query(`INSERT INTO integration_events (event_type, aggregate_type, aggregate_id, idempotency_key, payload, created_by) VALUES ('supplier-payment.posted', 'supplier-payment', $1, $2, $3::jsonb, $4)
          ON CONFLICT (idempotency_key) DO NOTHING`, [batchId, `supplier-payment.posted:${batchId}`, JSON.stringify(payload), u.id]);
      },
    });
    return this.get(u, ids[0]);
  }

  /** تعديل سجل واحد زي القديم (س2): المبلغ، والاتجاه، والربط بفاتورة واحدة أو من غير — من غير تجاوز باقي الفاتورة (B-72) */
  async update(u: AuthUser, id: string, dto: UpdatePaymentDto) {
    this.assert(u, 'edit');
    const total = Money.of(dto.amount);
    if (!total.cmp('0')) throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: 'أدخل مبلغاً صحيحاً' });
    const invoiceId = s(dto.invoiceId);
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const pays = await this.all(COLL, qr);
        const cur = pays.find((p) => p.id === id);
        if (!cur) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الدفعة غير موجودة' });
        if (invoiceId) {
          const inv = (await this.all('ledger.invoices', qr)).find((i) => i.id === invoiceId);
          const same = cur.data.invoiceId === invoiceId;
          if (!inv || inv.data.supplierId !== dto.supplierId || inv.data.isReturn || (inv.data.cancelled && !same)) throw new BadRequestException({ statusCode: 400, code: 'BAD_INVOICE', message: 'الفاتورة لازم تكون لنفس المورد، ومش مرتجع، ومش ملغية' });
          const paid = paidByInvoice(pays.filter((p) => p.id !== id).map((p) => p.data));
          if (total.cmp(amt(inv.data.netInvoice).minus(amt(paid.get(inv.id) ?? 0))) > 0) throw new BadRequestException({ statusCode: 400, code: 'OVER_INVOICE_REMAINING', message: `المبلغ أكبر من باقي الفاتورة ${s(inv.data.invoiceNo)} (B-72)` });
        }
        return [{ collection: COLL, id, op: 'upsert', baseRev: dto.rev, set: { supplierId: dto.supplierId, date: dto.date, method: dto.method ?? s(cur.data.method), direction: dto.direction,
          amount: jsonNumber(total), invoiceId, transferRef: s(dto.transferRef).trim(), notes: s(dto.notes).trim(),
          extraFields: (dto.extraFields ?? []).map((x) => ({ label: x.label.trim() || 'خانة', value: x.value.trim() })).filter((x) => x.value) } } as RecordChangeDto];
      },
      after: async (_qr, res) => {
        const c = res.conflicts[0];
        if (c || res.applied.some((a) => a.id === id && a.overwrote?.length)) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'الدفعة اتعدّلت من مستخدم تاني — حدّث الصفحة' });
      },
    });
    return this.get(u, id);
  }

  /** الدفعات من غير اتجاه (B-53): القايمة، وتحديد اتجاه دفعة واحدة كل مرة (مفيش تصنيف جماعي) */
  async unclassified(u: AuthUser) {
    return (await this.list(u, {})).rows.filter((p) => p.unclassified);
  }
  async classify(u: AuthUser, id: string, dto: ClassifyPaymentDto) {
    this.assert(u, 'edit');
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const cur = (await this.all(COLL, qr)).find((p) => p.id === id);
        if (!cur) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الدفعة غير موجودة' });
        if (directionOf(cur.data)) throw new ConflictException({ statusCode: 409, code: 'ALREADY_CLASSIFIED', message: 'الدفعة ليها اتجاه — التعديل من نافذة الدفعة' });
        return [{ collection: COLL, id, op: 'upsert', baseRev: dto.rev, set: { direction: dto.direction } } as RecordChangeDto];
      },
      after: async (_qr, res) => { if (res.conflicts.length) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'الدفعة اتعدّلت من مستخدم تاني — حدّث الصفحة' }); },
    });
    return this.get(u, id);
  }

  private async ledger(supplierId?: string) {
    const [sups, invs, pays] = await Promise.all([this.all('ledger.suppliers'), this.all('ledger.invoices'), this.all(COLL)]);
    const by = (xs: Rec[], sid: string): Pay[] => xs.filter((x) => x.data.supplierId === sid).map((x) => ({ ...x.data, id: x.id }));
    const invNo = new Map(invs.map((i) => [i.id, s(i.data.invoiceNo)]));
    return { sups: supplierId ? sups.filter((x) => x.id === supplierId) : sups, inv: (sid: string) => by(invs, sid), pay: (sid: string) => by(pays, sid).map((p) => ({ ...p, _ref: p.invoiceId ? invNo.get(p.invoiceId) : '-' })) };
  }
  /** كشف الحساب بـ F-05 (نفس حركات الرصيد) + الرصيد بالطريقة الحالية للعلامة */
  async statement(u: AuthUser, supplierId: string, q: StatementQuery) {
    this.assert(u, 'view');
    const L = await this.ledger(supplierId);
    const sp = L.sups[0];
    if (!sp) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'المورد غير موجود' });
    const sup = { ...sp.data, id: sp.id };
    return { supplier: { id: sp.id, name: s(sp.data.name), taxId: s(sp.data.taxId) }, ...statementF05(sup, L.inv(sp.id), L.pay(sp.id), q.from ?? '', q.to ?? ''), ...balanceDiff(sup, L.inv(sp.id), L.pay(sp.id)) };
  }
  /** الأرصدة لكل الموردين: F-05 + الحالية + الفرق وأسبابه (DEC-0105، 7.3.6) */
  async balances(u: AuthUser) {
    this.assert(u, 'view');
    const L = await this.ledger();
    return L.sups.map((sp) => ({ supplierId: sp.id, name: s(sp.data.name), ...balanceDiff({ ...sp.data, id: sp.id }, L.inv(sp.id), L.pay(sp.id)) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }
}
