import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import { Money } from '../common/money';
import { DataService } from '../data/data.service';
import { canRead, hiddenFields } from '../data/policy';
import { CreateCustomerDto, CreateSupplierDto, UpdateCustomerDto, UpdateSupplierDto } from './parties.dto';
import { CUSTOMERS, PartiesRepository, PartyRow, SUPPLIERS } from './parties.repository';

type Json = Record<string, unknown>;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPLIER_TEXT = ['taxId', 'commercialReg', 'businessNature', 'openingBalanceDate', 'phone', 'email', 'address', 'bankAccount', 'iban', 'notes'] as const;
const CUSTOMER_TEXT = ['phone', 'email', 'city', 'category', 'taxId', 'department', 'address', 'notes'] as const;
const CUSTOMER_LISTS = ['contracts', 'invoices', 'collections', 'workSurveys', 'boqs', 'guarantees', 'ledger', 'comms', 'opportunities', 'attachments', 'docs'] as const;

/** تطبيع البحث بالعربي (نفس فكرة searchNorm في الواجهة الحالية): همزات/ى/ة/تشكيل/تطويل وحالة الأحرف */
export const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();
const str = (v: unknown) => (v == null ? '' : String(v));
/** رقم JSON من الطبقة الانتقالية ← نص عشري 4 خانات (عرض بس — مفيش حساب بـ Number) */
export const moneyOut = (v: unknown): string => {
  if (v == null || v === '') return '0.0000';
  try { return (typeof v === 'number' ? Money.fromNumberUnsafe(v) : Money.of(String(v))).toFixed(); } catch { return '0.0000'; }
};
/**
 * نص عشري ← رقم JSON بنفس شكل الواجهة الحالية (MODULE_MIGRATION_PLAN §3.1). مسموح بس لما الرقم يتمثّل بالظبط
 * (≤ 15 رقم معنوي) — غير كده 422 بدل ما القيمة تتغيّر بصمت.
 */
export function moneyToLegacyNumber(s: string): number {
  const fixed = Money.of(s).round().toString();
  const digits = fixed.replace(/^-/, '').replace('.', '').replace(/^0+/, '');
  if (digits.length > 15) throw new UnprocessableEntityException({ statusCode: 422, code: 'PRECISION_LIMIT', message: 'المبلغ أطول من اللي الواجهة الحالية تقدر تخزّنه بدقة (15 رقم)' });
  return Number(fixed);
}

/**
 * الموردين والعملاء — بيانات أساسية (المرحلة 6.1). القواعد هنا = قواعد الواجهة الحالية بالملف والسطر
 * (docs/modules/PARTIES_MODULE.md)، مفيش قاعدة جديدة. الكتابة عن طريق DataService.sync بنفس شكل السجل القديم.
 */
@Injectable()
export class PartiesService {
  constructor(private readonly repo: PartiesRepository, private readonly data: DataService) {}

  // ---------------- قراءة
  private assertRead(user: AuthUser, collection: string) {
    if (!canRead(user, collection)) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'ليس لديك صلاحية على هذه البيانات' });
  }
  private supplierDto(r: PartyRow, counts?: { invoices: number; payments: number }) {
    const d = r.data;
    return {
      id: r.id, name: str(d.name), taxId: str(d.taxId), commercialReg: str(d.commercialReg), businessNature: str(d.businessNature),
      openingBalance: moneyOut(d.openingBalance), openingBalanceDate: str(d.openingBalanceDate), phone: str(d.phone), email: str(d.email),
      address: str(d.address), bankAccount: str(d.bankAccount), iban: str(d.iban), notes: str(d.notes),
      extraFields: Array.isArray(d.extraFields) ? d.extraFields : [], attachmentsCount: Array.isArray(d.attachments) ? d.attachments.length : 0,
      invoicesCount: counts?.invoices ?? 0, paymentsCount: counts?.payments ?? 0, rev: r.rev, updatedAt: r.updated_at,
    };
  }
  private customerDto(user: AuthUser, r: PartyRow) {
    const d = r.data; const hidden = hiddenFields(user, CUSTOMERS);
    return {
      id: r.id, code: str(d.code), name: str(d.name), phone: str(d.phone), email: str(d.email), city: str(d.city), category: str(d.category),
      taxId: str(d.taxId), department: str(d.department), status: str(d.status), address: str(d.address), notes: str(d.notes),
      openingBalance: hidden.includes('openingBalance') ? null : moneyOut(d.openingBalance),
      contacts: Array.isArray(d.contacts) ? d.contacts : [], extraFields: Array.isArray(d.extraFields) ? d.extraFields : [],
      createdAt: str(d.createdAt), updatedAt: str(d.updatedAt), rev: r.rev,
    };
  }
  private static match(q: string | undefined, fields: unknown[]) {
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    const hay = fields.map(norm).join(' ');
    return tokens.every((t) => hay.includes(t));
  }

  async listSuppliers(user: AuthUser, q?: string) {
    this.assertRead(user, SUPPLIERS);
    const [rows, counts] = await Promise.all([this.repo.all(SUPPLIERS), this.repo.supplierDocCounts()]);
    const items = rows.filter((r) => PartiesService.match(q, [r.data.name, r.data.taxId, r.data.commercialReg, r.data.phone, r.data.email, r.data.businessNature]))
      .map((r) => this.supplierDto(r, counts.get(r.id))).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    return { items, total: items.length, all: rows.length };
  }
  async getSupplier(user: AuthUser, id: string) {
    this.assertRead(user, SUPPLIERS);
    const r = await this.repo.one(SUPPLIERS, id);
    if (!r) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'المورد غير موجود' });
    return this.supplierDto(r, (await this.repo.supplierDocCounts()).get(id));
  }
  async listCustomers(user: AuthUser, q?: string) {
    this.assertRead(user, CUSTOMERS);
    const rows = await this.repo.all(CUSTOMERS);
    const items = rows.filter((r) => PartiesService.match(q, [r.data.name, r.data.code, r.data.phone, r.data.email, r.data.city, r.data.taxId]))
      .map((r) => this.customerDto(user, r)).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    return { items, total: items.length, all: rows.length };
  }
  async getCustomer(user: AuthUser, id: string) {
    this.assertRead(user, CUSTOMERS);
    const r = await this.repo.one(CUSTOMERS, id);
    if (!r) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'العميل غير موجود' });
    return this.customerDto(user, r);
  }

  // ---------------- كتابة (عن طريق طبقة السجلات — نسخة واحدة قابلة للكتابة)
  private assertPage(user: AuthUser, page: string, action: 'add' | 'edit') {
    if (!hasPagePermission(user.permissions, page, action)) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: action === 'add' ? 'ليس لديك صلاحية الإضافة' : 'ليس لديك صلاحية التعديل' });
  }
  private async write(user: AuthUser, collection: string, id: string, baseRev: number, set: Json) {
    const res = await this.data.sync(user, { changes: [{ collection, id, op: 'upsert', baseRev, set }] });
    const c = res.conflicts[0];
    if (c) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: c.reason === 'deleted' ? 'السجل اتمسح من مستخدم تاني' : 'السجل اتعدّل من مستخدم تاني — حدّث الصفحة', reason: c.reason, fields: c.fields });
  }
  private static newId(prefix: string) { return `${prefix}_${Date.now().toString(36)}${randomBytes(4).toString('hex')}`; }

  /** validateSupplierFields — renderer/modules/ledger/helpers.js:54 */
  static validateSupplier(f: { name?: string; taxId?: string; email?: string }, creating: boolean) {
    if ((creating || f.name !== undefined) && !str(f.name).trim()) throw new BadRequestException({ statusCode: 400, code: 'NAME_REQUIRED', message: 'اسم المورد مطلوب' });
    const tax = str(f.taxId).trim();
    if (tax.length > 0 && tax.length < 5) throw new BadRequestException({ statusCode: 400, code: 'TAX_ID_TOO_SHORT', message: 'الرقم الضريبي قصير جداً (أقل من 5 أرقام)' });
    const em = str(f.email).trim();
    if (em && !EMAIL_RE.test(em)) throw new BadRequestException({ statusCode: 400, code: 'INVALID_EMAIL', message: 'صيغة البريد الإلكتروني غير صحيحة' });
  }
  private static supplierSet(dto: Partial<CreateSupplierDto>): Json {
    const set: Json = {};
    if (dto.name !== undefined) set.name = dto.name.trim();
    for (const k of SUPPLIER_TEXT) if (dto[k] !== undefined) set[k] = String(dto[k]).trim();
    if (dto.openingBalance !== undefined) set.openingBalance = moneyToLegacyNumber(dto.openingBalance);
    if (dto.extraFields !== undefined) set.extraFields = dto.extraFields.map((f) => ({ label: f.label.trim(), value: f.value }));
    return set;
  }
  async createSupplier(user: AuthUser, dto: CreateSupplierDto) {
    this.assertPage(user, SUPPLIERS, 'add');
    PartiesService.validateSupplier(dto, true);
    const id = PartiesService.newId('sup');
    // نفس شكل السجل الجديد في نافذة الإضافة (modals.js:108)
    const set: Json = { id, name: '', taxId: '', commercialReg: '', businessNature: '', openingBalance: 0, openingBalanceDate: '', phone: '', email: '', address: '', bankAccount: '', iban: '', extraFields: [], notes: '', attachments: [], ...PartiesService.supplierSet(dto) };
    await this.write(user, SUPPLIERS, id, 0, set);
    return this.getSupplier(user, id);
  }
  async updateSupplier(user: AuthUser, id: string, dto: UpdateSupplierDto) {
    this.assertPage(user, SUPPLIERS, 'edit');
    if (!(await this.repo.one(SUPPLIERS, id))) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'المورد غير موجود' });
    PartiesService.validateSupplier(dto, false);
    const set = PartiesService.supplierSet(dto);
    if (Object.keys(set).length) await this.write(user, SUPPLIERS, id, dto.rev, set);
    return this.getSupplier(user, id);
  }

  /** clNextCode — renderer/modules/clients/helpers.js:13: البادئة من إعدادات العملاء + (أكبر رقم في آخر الكود + 1) بأربع خانات */
  async nextCustomerCode(): Promise<string> {
    const [rows, settings] = await Promise.all([this.repo.all(CUSTOMERS), this.repo.clientsSettings()]);
    const prefix = str(settings.customerPrefix) || 'CUS-';
    let max = 0;
    for (const r of rows) { const m = str(r.data.code).match(/(\d+)\s*$/); if (m) max = Math.max(max, parseInt(m[1], 10) || 0); }
    return prefix + String(max + 1).padStart(4, '0');
  }
  private static customerSet(dto: Partial<CreateCustomerDto>): Json {
    const set: Json = {};
    if (dto.name !== undefined) set.name = dto.name.trim();
    if (dto.code !== undefined) set.code = dto.code.trim();
    for (const k of CUSTOMER_TEXT) if (dto[k] !== undefined) set[k] = String(dto[k]).trim();
    if (dto.openingBalance !== undefined) set.openingBalance = moneyToLegacyNumber(dto.openingBalance);
    if (dto.contacts !== undefined) set.contacts = dto.contacts.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), title: str(c.title).trim(), phone: str(c.phone).trim(), email: str(c.email).trim() }));
    if (dto.extraFields !== undefined) set.extraFields = dto.extraFields.map((f) => ({ label: f.label.trim(), value: f.value }));
    return set;
  }
  async createCustomer(user: AuthUser, dto: CreateCustomerDto) {
    this.assertPage(user, CUSTOMERS, 'add');
    if (!dto.name.trim()) throw new BadRequestException({ statusCode: 400, code: 'NAME_REQUIRED', message: 'اسم العميل مطلوب' });
    const id = PartiesService.newId('cus');
    const now = new Date().toISOString();
    const set: Json = {
      id, code: '', name: '', phone: '', email: '', city: '', category: '', taxId: '', department: '', status: 'active', openingBalance: 0, address: '', notes: '',
      contacts: [], projects: [], ...Object.fromEntries(CUSTOMER_LISTS.map((k) => [k, []])), extraFields: [], createdAt: now, updatedAt: now,
      ...PartiesService.customerSet(dto),
    };
    if (!set.code) set.code = await this.nextCustomerCode();
    // الحقول المحمية (الرصيد ودفتر العميل): المستخدم اللي مالوش صفحات الحسابات مايبعتهاش — زي الواجهة الحالية بالظبط
    for (const f of hiddenFields(user, CUSTOMERS)) if (!(f in PartiesService.customerSet(dto))) delete set[f];
    await this.write(user, CUSTOMERS, id, 0, set);
    return this.getCustomer(user, id);
  }
  async updateCustomer(user: AuthUser, id: string, dto: UpdateCustomerDto) {
    this.assertPage(user, CUSTOMERS, 'edit');
    if (!(await this.repo.one(CUSTOMERS, id))) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'العميل غير موجود' });
    if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException({ statusCode: 400, code: 'NAME_REQUIRED', message: 'اسم العميل مطلوب' });
    const set = PartiesService.customerSet(dto);
    if (set.code === '') set.code = await this.nextCustomerCode();
    if (Object.keys(set).length) await this.write(user, CUSTOMERS, id, dto.rev, { ...set, updatedAt: new Date().toISOString() });
    return this.getCustomer(user, id);
  }

  // ---------------- خطة ترحيل (قراءة بس — الخطوة 7 مش متنفّذة)
  async migrationPlan() {
    const [sup, cus, counts, rel] = await Promise.all([this.repo.all(SUPPLIERS), this.repo.all(CUSTOMERS), this.repo.supplierDocCounts(), this.repo.relationalCounts()]);
    const dups = (rows: PartyRow[], key: string) => {
      const m = new Map<string, string[]>();
      for (const r of rows) { const k = norm(r.data[key]); if (k) m.set(k, [...(m.get(k) ?? []), r.id]); }
      return [...m.values()].filter((ids) => ids.length > 1);
    };
    const balances = (rows: PartyRow[]) => rows.map((r) => {
      const raw = r.data.openingBalance; const original = raw == null || raw === '' ? '0' : String(raw);
      let migrated: string | null = null; try { migrated = Money.of(original).round().toFixed(); } catch { /* invalid */ }
      return { id: r.id, original, migrated, changed: migrated != null && !Money.of(original).eq(migrated) };
    });
    const supBal = balances(sup), cusBal = balances(cus);
    const supplierIds = new Set(sup.map((r) => r.id));
    const blockers = {
      suppliersEmptyName: sup.filter((r) => !str(r.data.name).trim()).map((r) => r.id),
      customersEmptyName: cus.filter((r) => !str(r.data.name).trim()).map((r) => r.id),
      supplierDuplicateNames: dups(sup, 'name'),
      customerDuplicateNames: dups(cus, 'name'),
      customerDuplicateCodes: dups(cus, 'code'),
      invalidOpeningBalance: [...supBal, ...cusBal].filter((b) => b.migrated == null).map((b) => b.id),
      orphanSupplierRefs: [...counts.keys()].filter((sid) => !supplierIds.has(sid)),
    };
    const warnings = {
      supplierInvalidEmail: sup.filter((r) => str(r.data.email).trim() && !EMAIL_RE.test(str(r.data.email).trim())).map((r) => r.id),
      supplierShortTaxId: sup.filter((r) => { const t = str(r.data.taxId).trim(); return t.length > 0 && t.length < 5; }).map((r) => r.id),
      roundingChanges: [...supBal, ...cusBal].filter((b) => b.changed),
    };
    return {
      dryRun: true, executed: false, relationalRowsNow: rel,
      counts: { suppliers: sup.length, customers: cus.length, supplierInvoices: [...counts.values()].reduce((a, b) => a + b.invoices, 0), supplierPayments: [...counts.values()].reduce((a, b) => a + b.payments, 0) },
      blockers, warnings, ready: Object.values(blockers).every((v) => v.length === 0),
    };
  }
}
