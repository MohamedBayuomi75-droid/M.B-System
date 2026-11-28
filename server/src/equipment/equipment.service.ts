import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import { Money } from '../common/money';
import { DUP_TEXT, findEntityDuplicates } from '../common/person-duplicates';
import type { DocChangeDto, RecordChangeDto } from '../data/data.dto';
import { DataService } from '../data/data.service';
import { canRead, inProjectScope } from '../data/policy';
import { cairoTodayIso } from '../parties/parties.service';
import { INSURANCE_STATUS_OPTS } from '../people/people-rules';
import { cardParts, Ctx, deptName, fmtDate, J, nextCode, statusFromExpiry, supName, toInt } from '../workers/worker-rules';
import {
  CORE_EQ_DEPTS, DAY_KINDS, dailyPayload, EQUIPMENT_OWNERSHIP, EQUIPMENT_STATUS, equipmentIssues, equipmentPayload, filterEquipment, labelOf, legacyCost, newCost,
} from './equipment-rules';
import { EquipmentDailyQuery, ListEquipmentQuery, SaveEquipmentDailyDto, SaveEquipmentDto, UpdateEquipmentDailyDto, UpdateEquipmentDto } from './equipment.dto';
import { EquipmentRepository, Row } from './equipment.repository';

type QueryRunner = Parameters<NonNullable<NonNullable<Parameters<DataService['sync']>[2]>['before']>>[0];
type Em = QueryRunner['manager'];
const uid = () => `id_${Date.now().toString(36)}${randomBytes(4).toString('hex').slice(0, 7)}`;
const COLL = 'equipment', DAILY = 'equipmentDaily', EXT = '__core_eq_external__';
const m = (v: Money | string) => (typeof v === 'string' ? v : v.toFixed().replace(/\.?0+$/, '') || '0');
const sumStr = (xs: string[]) => m(Money.sum(xs.length ? xs : ['0']));
const deptOf = (e: J) => String(e.departmentId || e.categoryId || '').trim();

/**
 * المعدات ويومياتها (8.7.3، DEC-0139/0140) — طبقة الأعمال. القواعد في equipment-rules.ts، والمقارنة بالقديمة في tests-merge/phase87.js.
 *  - اللوحات، والقايمة بفلاترها (والفلاتر الإضافية)، والكروت، والملاحظات (الناقص من الأوراق)، والحفظ بنفس زرار الحفظ القديم
 *    (الكود الفريد، والاسم المتركّب، ونوع الترخيص ← القسم، والسائق ورخصته، وحالة الرخصة، ومنع التكرار، ونوع السيارة في القايمة)
 *    — **ومن غير القسم اللي القديمة كانت بتعمله لوحدها** (DEC-0140).
 *  - اليوميات: الجدول الشهري، ولوحة المعدات في اليوميات، وسجلات الفترة، والحفظ (وساعات المعدة وحالتها)، والحذف.
 *  - **التكلفة بالحسابين:** القديمة (equipmentDailyCost) والجديدة (DEC-0140: التوقف 50%، والنقل بتكلفة مكتوبة، والتكلفة الإضافية محسوبة).
 */
@Injectable()
export class EquipmentService {
  constructor(private readonly data: DataService, private readonly repo: EquipmentRepository) {}

  private async ctx(em?: Em) {
    const [deps, sups, docs, drivers, settings, reqDocs, reqEmpty, daily] = await Promise.all([this.repo.rows('departments', em), this.repo.rows('supervisors', em), this.repo.rows('personDocuments', em),
      this.repo.rows('drivers', em), this.repo.doc('settings', em), this.repo.doc('requiredDocsByKind', em), this.repo.doc('requiredDocsEmpty', em), this.repo.rows(DAILY, em)]);
    const flat = (xs: Row[]) => xs.map((r) => ({ ...r.data, id: r.id }) as J);
    const c: Ctx & { drivers: J[]; deps: J[]; daily: J[]; idlePercent: number; rawDeps: Row[]; rawDaily: Row[] } = {
      today: cairoTodayIso(), soonDays: Number(settings.alertSoonDays) > 0 ? Number(settings.alertSoonDays) : 30, departments: flat(deps), supervisors: flat(sups), leaves: [], personDocuments: flat(docs),
      requiredDocsByKind: reqDocs as Record<string, J[]>, requiredDocsEmpty: reqEmpty as Record<string, boolean>, workDaysPerMonth: Number(settings.workDaysPerMonth) || 26,
      drivers: flat(drivers), deps: [], daily: daily.map((r) => ({ ...r.data, id: r.id, _rev: r.rev }) as J), idlePercent: Number(settings.equipmentIdlePercent) >= 0 && settings.equipmentIdlePercent !== undefined ? Number(settings.equipmentIdlePercent) : 50,
      rawDeps: deps, rawDaily: daily,
    };
    c.deps = this.deptsFor(c.departments, []);
    return c;
  }
  /** departmentsForKind('equipment'): أقسام النظام الأساسية بترتيبها */
  private deptsFor(departments: J[], all: J[]) {
    const used = new Set(all.map(deptOf).filter(Boolean));
    const matched = departments.filter((d) => d && (!d.kind || d.kind === 'all' || d.kind === 'equipment' || (Array.isArray(d.kinds) && d.kinds.includes('equipment')) || used.has(d.id)));
    const order = CORE_EQ_DEPTS.map((x) => x.id);
    return matched.filter((d) => d.system && !d.jobDept).sort((a, b) => {
      const ia = order.indexOf(a.id), ib = order.indexOf(b.id); const ra = ia < 0 ? (a.jobDept ? 50 : 99) : ia, rb = ib < 0 ? (b.jobDept ? 50 : 99) : ib;
      return ra - rb || String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
  }
  private assert(u: AuthUser, coll: string, action: 'view' | 'add' | 'edit' | 'delete') {
    const page = coll === DAILY ? 'workerAttendance' : COLL;
    const ok = action === 'view' ? canRead(u, coll) : hasPagePermission(u.permissions, page, action) || (coll === DAILY && hasPagePermission(u.permissions, COLL, action));
    if (!ok) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: '🔒 ماعندكش صلاحية' });
  }
  private visible(u: AuthUser, rows: Row[]) { return rows.filter((r) => inProjectScope(u, COLL, { ...r.data, id: r.id })).map((r) => ({ ...r.data, id: r.id, _rev: r.rev }) as J); }
  private eqOf(all: J[]) { return (id: string) => all.find((e) => e.id === id); }

  async list(u: AuthUser, q: ListEquipmentQuery) {
    this.assert(u, COLL, 'view');
    const [rows, c] = await Promise.all([this.repo.rows(COLL), this.ctx()]);
    const all = this.visible(u, rows);
    const deps = this.deptsFor(c.departments, all);
    const list = filterEquipment(c, all, q);
    const ids = new Set(list.map((x) => x.id)), ms = `${c.today.slice(0, 8)}01`, eqOf = this.eqOf(all);
    const monthLogs = c.daily.filter((d) => ids.has(d.equipmentId) && (d.date || '') >= ms);
    const parts = cardParts(c, 'worker', list);
    const maint = list.filter((e) => e.status === 'maintenance' || e.status === 'stopped').length;
    // قسم «سيارات خارجية»: كارت «توافر السيارات» بدل «حالة التأمين» (_builtinExtraCards — E2 في البروفة المجمّعة)
    const av = list.filter((e) => e.status === 'working' || e.status === 'available').length, un = list.length - av;
    const availability = { ico: '🚗', label: 'توافر السيارات', tone: un ? 'warn' : 'ok', parts: [{ n: av, l: 'متاحة', tone: 'ok' }, { n: un, l: 'غير متاحة', tone: un ? 'warn' : '' }] };
    const count = (id: string) => (id === '__none__' ? all.filter((e) => !String(e.licenseCategory || '').trim()).length : id === '' ? all.length : all.filter((e) => deptOf(e) === id).length);
    return {
      source: await this.repo.source(COLL),
      boards: [{ id: '', name: 'الكل', icon: '📋' }, { id: '__none__', name: 'بدون قسم أو نوع ترخيص', icon: '📂' }, ...deps.map((d) => ({ id: d.id, name: d.name || '', icon: '🛻' }))].map((b) => ({ ...b, count: count(b.id) })),
      cards: [{ ico: '🚜', label: 'إجمالي القسم', value: list.length }, { ico: '🛠️', label: 'صيانة / عاطلة', value: maint, tone: maint ? 'warn' : '' }, q.departmentId === EXT ? availability : parts.insurance, parts.license,
        { ico: '💰', label: 'تكلفة تشغيل الشهر', value: toInt(monthLogs.reduce((s, d) => s + legacyCost(d, eqOf(d.equipmentId)), 0)), newValue: sumStr(monthLogs.map((d) => newCost(d, eqOf(d.equipmentId), c.idlePercent))) }],
      rows: list.map((e) => this.view(c, e)), layout: await this.layoutDocs(),
    };
  }
  private async layoutDocs() {
    const [fl, af, cf, df, rk, f1, f2, f3, al] = await Promise.all(['formLayouts', 'autoFields', 'customFieldDefs', 'deadFields', '_cfRegKeys', '_cfAllHiddenFixed', '_cfAutoFlagsReset', '_cfShowInTableMigrated', '_cfAligned2'].map((k) => this.repo.docValue(k)));
    const pick = (o: unknown) => { const src = o && typeof o === 'object' ? (o as J) : {}; return src[COLL] !== undefined ? { [COLL]: src[COLL] } : {}; };
    return { formLayouts: pick(fl), autoFields: pick(af), customFieldDefs: pick(cf), deadFields: pick(df), cfRegKeys: pick(rk), aligned: pick(al), flags: { allHiddenFixed: !!f1, autoFlagsReset: !!f2, showInTableMigrated: !!f3 } };
  }
  private view(c: Ctx & { drivers: J[] }, e: J) {
    const { _rev, ...rec } = e;
    const vExp = e.vehicleLicenseExpiry || e.licenseExpiry || '', dExp = e.driverLicenseExpiry || '';
    const drv = e.driverId ? c.drivers.find((x) => x.id === e.driverId) : null;
    return {
      ...rec, rev: _rev, vehicleExpiry: vExp, vehicleLicenseNow: vExp ? statusFromExpiry(vExp, c.today) : e.vehicleLicenseStatus || '', driverLicenseNow: dExp ? statusFromExpiry(dExp, c.today) : e.driverLicenseStatus || '',
      driverDisplay: e.driverName || (drv ? drv.name || '' : ''), statusLabel: labelOf(EQUIPMENT_STATUS, e.status) || ({ in_use: 'مستأجرة', available: 'تعمل', broken: 'صيانة', retired: 'متوقفة' } as J)[e.status] || e.status || '',
      ownershipLabel: labelOf(EQUIPMENT_OWNERSHIP, e.ownership) || e.ownership || '', departmentName: deptName(c, deptOf(e)), supervisorName: e.supervisorId ? supName(c, e.supervisorId) : '',
      insuranceLabel: (INSURANCE_STATUS_OPTS.find((o) => o.code === e.insuranceStatus) || { label: e.insuranceStatus || '' }).label, issues: equipmentIssues(c, e),
    };
  }
  async get(u: AuthUser, id: string) {
    this.assert(u, COLL, 'view');
    const r = (await this.repo.rows(COLL)).find((x) => x.id === id);
    if (!r || !inProjectScope(u, COLL, { ...r.data, id })) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'المعدة غير موجودة' });
    return { ...r.data, id, rev: r.rev, events: await this.repo.events('equipment', id) };
  }
  async formOptions(u: AuthUser) {
    this.assert(u, COLL, 'view');
    const [rows, c, types] = await Promise.all([this.repo.rows(COLL), this.ctx(), this.repo.docValue('equipmentTypes')]);
    const byName = (xs: J[]) => xs.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar', { sensitivity: 'base' }));
    return {
      nextCode: nextCode('EQ-', rows.map((r) => r.data)), today: c.today, statuses: EQUIPMENT_STATUS, ownership: EQUIPMENT_OWNERSHIP, insuranceStatuses: INSURANCE_STATUS_OPTS, dayKinds: DAY_KINDS,
      departments: c.deps.map((d) => ({ id: d.id, name: d.name || '' })), drivers: byName(c.drivers).map((d) => ({ id: d.id, name: d.name || '', code: d.code || '', licenseExpiry: d.licenseExpiry || '' })),
      equipmentTypes: (Array.isArray(types) ? (types as J[]) : []).map((t) => t.name).filter(Boolean), idlePercent: c.idlePercent, defaultFuelPrice: toInt((await this.repo.doc('settings')).defaultFuelPrice),
      equipment: byName(rows.map((r) => ({ ...r.data, id: r.id }) as J)).map((e) => ({ id: e.id, name: e.name || '', code: e.code || '', dailyCost: toInt(e.dailyCost), hourlyCost: toInt(e.hourlyCost) })),
    };
  }

  private async guardDuplicates(u: AuthUser, em: Em, payload: J, excludeId: string | null, own: Row[], confirmed: boolean) {
    const lists = { equipment: own.filter((r) => inProjectScope(u, COLL, { ...r.data, id: r.id })).map((r) => ({ ...r.data, id: r.id })), worker: [], employee: [], supervisor: [], driver: [] };
    void em;
    const matches = findEntityDuplicates('equipment', payload, excludeId, lists);
    if (!matches.length) return;
    const hard = matches.some((x) => x.strength === 'hard');
    if (!hard && confirmed) return;
    throw new ConflictException({ statusCode: 409, code: hard ? 'DUPLICATE' : 'DUPLICATE_SOFT', message: hard ? DUP_TEXT.hardMsg : DUP_TEXT.softMsg, title: hard ? DUP_TEXT.hardTitle : DUP_TEXT.softTitle, matches });
  }
  private diff(collection: string, r: Row | undefined, after: J, id: string): RecordChangeDto | null {
    if (!r) { const { id: _i, ...set } = after; void _i; return { collection, id, op: 'upsert', baseRev: 0, set: { id, ...set } } as RecordChangeDto; }
    const set: J = {};
    for (const k of Object.keys(after)) if (k !== 'id' && JSON.stringify(after[k]) !== JSON.stringify(r.data[k])) set[k] = after[k];
    return Object.keys(set).length ? ({ collection, id: r.id, op: 'upsert', baseRev: r.rev, set } as RecordChangeDto) : null;
  }
  /** الإضافة والتعديل (btnSaveEq) */
  private async save(u: AuthUser, id: string, dto: SaveEquipmentDto, rev?: number) {
    let saved: J = {};
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const em = qr.manager;
        const [rows, c, types] = await Promise.all([this.repo.rows(COLL, em), this.ctx(em), this.repo.docValue('equipmentTypes', em)]);
        const cur = rows.find((r) => r.id === id);
        if (rev != null) {
          if (!cur || !inProjectScope(u, COLL, { ...cur.data, id })) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'المعدة غير موجودة' });
          if (cur.rev !== rev) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'المعدة اتعدّلت من مستخدم تاني — حدّث الصفحة' });
        }
        const all = rows.map((r) => ({ ...r.data, id: r.id }) as J);
        const p0 = cur ? ({ ...cur.data, id } as J) : null;
        const res = equipmentPayload(c, dto, p0, all);
        if (typeof res === 'string') throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: res });
        const changes: RecordChangeDto[] = [];
        if (res.newDept) {
          const ex = c.departments.find((d) => String(d.name || '').trim() === res.newDept && (!d.kind || d.kind === 'equipment'));
          const did = ex ? ex.id : uid();
          if (!ex) changes.push({ collection: 'departments', id: did, op: 'upsert', baseRev: 0, set: { id: did, name: res.newDept, kind: 'equipment', manager: '', notes: '', code: '' } } as RecordChangeDto);
          res.payload.departmentId = did; res.payload.categoryId = did;
        }
        await this.guardDuplicates(u, em, res.payload, p0 ? id : null, rows, !!dto.confirmDuplicates);
        const rec = p0 ? { ...p0, ...res.payload } : { ...res.payload, id };
        saved = rec;
        const own = this.diff(COLL, cur, rec, id); if (own) changes.unshift(own);
        const docs: DocChangeDto[] = [];
        const tl = String(res.payload.typeLabel || '').trim();
        if (tl && !(Array.isArray(types) ? (types as J[]) : []).some((t) => String(t.name || '').trim() === tl)) docs.push({ key: 'equipmentTypes', baseRev: 0, op: 'arrayDelta', add: [{ id: uid(), name: tl }] } as DocChangeDto);
        return { records: changes, docs };
      },
      after: async (qr, res) => {
        const mine = res.applied.find((a) => a.collection === COLL && a.id === id);
        if (res.conflicts.length || (mine && mine.overwrote?.length)) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'المعدة اتعدّلت من مستخدم تاني — حدّث الصفحة' });
        await this.repo.addSavedEvent(qr.manager, 'equipment', id, { kind: rev == null ? 'created' : 'updated', id, code: String(saved.code || ''), name: String(saved.name || ''), status: saved.status || '', departmentId: saved.departmentId || '' }, u.id);
      },
    });
    return this.get(u, id);
  }
  async create(u: AuthUser, dto: SaveEquipmentDto) { this.assert(u, COLL, 'add'); return this.save(u, uid(), dto); }
  async update(u: AuthUser, id: string, dto: UpdateEquipmentDto) { this.assert(u, COLL, 'edit'); return this.save(u, id, dto, dto.rev); }

  // ---------------- اليوميات
  /** الجدول الشهري (renderEquipmentDailyGrid) ولوحة المعدات في اليوميات (renderEquipmentDailyEmbed) — بنفس الفلاتر، والتكلفة بالحسابين */
  async dailyGrid(u: AuthUser, q: EquipmentDailyQuery) {
    this.assert(u, DAILY, 'view');
    const [rows, c] = await Promise.all([this.repo.rows(COLL), this.ctx()]);
    const all = this.visible(u, rows), eqOf = this.eqOf(all);
    const from = q.from || `${c.today.slice(0, 8)}01`, to = q.to || c.today;
    let list = all.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar', { sensitivity: 'base' }));
    if (q.dept) list = q.dept === '__none__' ? list.filter((e) => !String(e.licenseCategory || '').trim()) : list.filter((e) => deptOf(e) === q.dept);
    if (q.status) list = list.filter((e) => e.status === q.status);
    const qs = String(q.q || '').trim().toLowerCase();
    if (qs) list = list.filter((e) => String(e.name || '').toLowerCase().includes(qs) || String(e.code || '').toLowerCase().includes(qs) || String(e.plate || e.vehicleNumber || '').toLowerCase().includes(qs));
    const proj = String(q.project || '').trim();
    const logsOf = (e: J) => c.daily.filter((d) => d.equipmentId === e.id && (d.date || '') >= from && (d.date || '') <= to && (!proj || String(d.project || '').trim() === proj));
    if (proj) list = list.filter((e) => logsOf(e).length);
    const rowsOut = list.map((e) => {
      const logs = logsOf(e);
      return { id: e.id, name: e.name || '', code: e.code || '', typeLabel: e.typeLabel || '', days: Math.round(logs.reduce((s, d) => s + (Number(d.days) > 0 ? Number(d.days) : 1), 0) * 100) / 100, records: logs.length,
        dates: new Set(logs.map((d) => d.date)).size, hours: Math.round(logs.reduce((s, d) => s + (Number(d.hours) || 0), 0) * 10) / 10,
        legacyCost: toInt(logs.reduce((s, d) => s + legacyCost(d, e), 0)), cost: sumStr(logs.map((d) => newCost(d, e, c.idlePercent))),
        logs: logs.map((d) => ({ id: d.id, date: d.date, kind: d.kind || 'work', hours: Number(d.hours) || 0, fuelLiters: Number(d.fuelLiters) || 0, days: d.days, legacyCost: legacyCost(d, e), cost: newCost(d, e, c.idlePercent) })) };
    });
    const allLogs = rowsOut.flatMap((r) => r.logs);
    return { from, to, idlePercent: c.idlePercent, rows: rowsOut,
      cards: { equipment: list.length, records: allLogs.length, hours: Math.round(allLogs.reduce((s, d) => s + d.hours, 0) * 10) / 10, legacyCost: toInt(allLogs.reduce((s, d) => s + d.legacyCost, 0)), cost: sumStr(allLogs.map((d) => d.cost)) },
      list: c.daily.filter((d) => (d.date || '') >= from && (d.date || '') <= to).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).map((d) => {
        const e = eqOf(d.equipmentId);
        return { id: d.id, rev: d._rev, date: d.date, dateText: fmtDate(d.date), equipmentName: e ? e.name || '' : '—', project: d.project || '', kind: d.kind || 'work', hours: Number(d.hours) || 0, fuelLiters: Number(d.fuelLiters) || 0, productivity: d.productivity || '', legacyCost: legacyCost(d, e), cost: newCost(d, e, c.idlePercent) };
      }) };
  }
  async getDaily(u: AuthUser, id: string) {
    this.assert(u, DAILY, 'view');
    const r = (await this.repo.rows(DAILY)).find((x) => x.id === id);
    if (!r) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'اليومية غير موجودة' });
    const eq = (await this.repo.rows(COLL)).find((x) => x.id === r.data.equipmentId);
    const c = await this.ctx();
    return { ...r.data, id, rev: r.rev, legacyCost: legacyCost(r.data, eq?.data), cost: newCost(r.data, eq?.data, c.idlePercent) };
  }
  /** الحفظ (btnSaveEd): اليومية، و**في الإضافة** ساعات المعدة بتتجمع وحالتها («متاحة» أو «متوقفة») بتبقى «تعمل» */
  private async writeDaily(u: AuthUser, id: string, dto: SaveEquipmentDailyDto | null, rev?: number) {
    let saved: J | null = null;
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const em = qr.manager;
        const [daily, eqs] = await Promise.all([this.repo.rows(DAILY, em), this.repo.rows(COLL, em)]);
        const cur = daily.find((r) => r.id === id);
        if (rev != null) {
          if (!cur) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'اليومية غير موجودة' });
          if (cur.rev !== rev) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'اليومية اتعدّلت من مستخدم تاني — حدّث الصفحة' });
        }
        if (!dto) { saved = cur ? { ...cur.data, id } : null; return [{ collection: DAILY, id, op: 'delete', baseRev: cur!.rev } as RecordChangeDto]; }
        // fillFromEq: اليومية الجديدة بتاخد يومية المعدة وتكلفة الساعة لو الخانة مش متبعتة، وسعر اللتر الافتراضي من الإعدادات
        const eq0 = eqs.find((r) => r.id === dto.equipmentId)?.data;
        const form = cur || !eq0 ? dto : { ...dto, days: dto.days ?? '1', dailyCost: dto.dailyCost ?? String(toInt(eq0.dailyCost)), hourlyCost: dto.hourlyCost ?? String(toInt(eq0.hourlyCost)),
          fuelPrice: dto.fuelPrice ?? String(toInt((await this.repo.doc('settings', em)).defaultFuelPrice)) };
        const p = dailyPayload(form);
        if (typeof p === 'string') throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: p });
        const eqRow = eqs.find((r) => r.id === p.equipmentId);
        if (!eqRow) throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: 'اختر المعدة' });
        const changes: RecordChangeDto[] = [];
        if (cur) { const rec = { ...cur.data, ...p }; saved = { ...rec, id }; const ch = this.diff(DAILY, cur, rec, id); if (ch) changes.push(ch); }
        else {
          saved = { ...p, id }; changes.push({ collection: DAILY, id, op: 'upsert', baseRev: 0, set: { id, ...p } } as RecordChangeDto);
          const e = eqRow.data; const set: J = { totalHours: toInt((Number(e.totalHours) || 0) + (Number(p.hours) || 0)) };
          if (e.status === 'available' || e.status === 'stopped') set.status = 'working';
          changes.push({ collection: COLL, id: eqRow.id, op: 'upsert', baseRev: eqRow.rev, set } as RecordChangeDto);
        }
        return changes;
      },
      after: async (qr, res) => {
        const mine = res.applied.find((a) => a.collection === DAILY && a.id === id);
        if (res.conflicts.length || (mine && mine.overwrote?.length)) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'اليومية اتعدّلت من مستخدم تاني — حدّث الصفحة' });
        const s = saved as J | null;
        await this.repo.addSavedEvent(qr.manager, 'equipment-daily', id, { kind: !dto ? 'deleted' : rev == null ? 'created' : 'updated', id, equipmentId: s?.equipmentId || '', date: s?.date || '', dayKind: s?.kind || '' }, u.id);
      },
    });
  }
  async createDaily(u: AuthUser, dto: SaveEquipmentDailyDto) { this.assert(u, DAILY, 'add'); const id = uid(); await this.writeDaily(u, id, dto); return this.getDaily(u, id); }
  async updateDaily(u: AuthUser, id: string, dto: UpdateEquipmentDailyDto) { this.assert(u, DAILY, 'edit'); await this.writeDaily(u, id, dto, dto.rev); return this.getDaily(u, id); }
  async removeDaily(u: AuthUser, id: string, rev: number) { this.assert(u, DAILY, 'delete'); await this.writeDaily(u, id, null, rev); return { id, deleted: true }; }
}
