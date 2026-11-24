import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import { DUP_TEXT, findEntityDuplicates } from '../common/person-duplicates';
import type { RecordChangeDto } from '../data/data.dto';
import { DataService } from '../data/data.service';
import { canRead, canWrite, hiddenFields, inProjectScope, stripHidden } from '../data/policy';
import { cairoTodayIso } from '../parties/parties.service';
import {
  activeLeaveOf, boards, CONTRACT_TYPE_OPTS, Ctx, deptName, EMPLOYEE_STATUS, fmtDate, isResignedDeptId, isResignedStatus, J, nextCode, notesIssues, resignedDeptOf, retiredDeptOf, stampMembership,
  statusFromExpiry, statusLabel, syncResigned, warning,
} from '../workers/worker-rules';
import {
  COLL_OF, commitPerson, driverPayload, employeePayload, employeePositions, employeeResignYears, EMPLOYMENT_TYPES, EXT_DEPT, externalDriverPayload, filterDrivers,
  filterEmployees, filterSupervisors, INSURANCE_STATUS_OPTS, PeopleKind, peopleCards, supervisorPayload, workersOf,
} from './people-rules';
import { ListPeopleQuery, SavePersonDto, UpdatePersonDto } from './people.dto';
import { PeopleRepository, Row } from './people.repository';

type QueryRunner = Parameters<NonNullable<NonNullable<Parameters<DataService['sync']>[2]>['before']>>[0];
const uid = () => `id_${Date.now().toString(36)}${randomBytes(4).toString('hex').slice(0, 7)}`;
const LABEL: Record<PeopleKind, { one: string; many: string; code: string }> = { supervisor: { one: 'المشرف', many: 'المشرفين', code: 'SUP-' }, driver: { one: 'السائق', many: 'السائقين', code: 'DRV-' },
  employee: { one: 'الموظف', many: 'الموظفين', code: 'EMP-' } };

/**
 * المشرفين والسواقين (8.2.4، DEC-0123) — طبقة الأعمال، بنفس طريقة العمال (8.1.4). القواعد في people-rules.ts وworker-rules.ts (المشتركة)،
 * والمقارنة بالواجهة القديمة في tests-merge/phase76.js.
 *  - اللوحات، والقايمة بفلاترها (السواقين بترتيب خطواتهم)، والكروت، والملاحظات، وعلامة النقص.
 *  - الحفظ بنفس زرار الحفظ في النوافذ التلاتة (المشرف، وسواق الشركة، والسواق الخارجي **من غير دمج**)، وتاريخ الاستقالة من النافذة،
 *    والقسم، وأرشيف المستقيلين، ومنع التكرار، وتاريخ الانضمام للمشروع — في معاملة واحدة وبنفس صلاحيات /api/sync.
 *  - **الأجور (B-48):** اليومية والراتب مابيظهروش ومايتقبلوش من مستخدم مالوش صفحة الرواتب أو المستحقات، والقيمة المخزنة بتفضل.
 *  - كشف حساب المشرف، وصفحة الشخص، والحذف، والإجراءات الجماعية، والتصدير: من الشاشة الكاملة (د-2، د-3).
 * والموظفين (8.3.4، DEC-0125) بنفس الطبقة: قايمة filteredEmployees وقسم المستقيلين الخاص (كروته وفلاتره وجدوله)، والحفظ **من غير قسم**
 * زي القديمة، ورصيد الإجازة بيتحفظ زي ما هو (د-4)، والراتب محمي (B-48).
 */
@Injectable()
export class PeopleService {
  constructor(private readonly data: DataService, private readonly repo: PeopleRepository) {}

  private async ctx(qr?: QueryRunner): Promise<Ctx & { raw: Record<string, Row[]> }> {
    const em = qr?.manager;
    const [departments, supervisors, leaves, personDocuments, settings, reqDocs, reqEmpty] = await Promise.all([
      this.repo.rows('departments', em), this.repo.rows('supervisors', em), this.repo.rows('leaves', em), this.repo.rows('personDocuments', em),
      this.repo.doc('settings', em), this.repo.doc('requiredDocsByKind', em), this.repo.doc('requiredDocsEmpty', em)]);
    const flat = (xs: Row[]) => xs.map((r) => ({ ...r.data, id: r.id }));
    return {
      today: cairoTodayIso(), soonDays: Number(settings.alertSoonDays) > 0 ? Number(settings.alertSoonDays) : 30,
      departments: flat(departments), supervisors: flat(supervisors), leaves: flat(leaves), personDocuments: flat(personDocuments),
      requiredDocsByKind: reqDocs as Record<string, J[]>, requiredDocsEmpty: reqEmpty as Record<string, boolean>,
      workDaysPerMonth: Number(settings.workDaysPerMonth) || 26, raw: { departments },
    };
  }
  private assert(kind: PeopleKind, u: AuthUser, action: 'view' | 'add' | 'edit') {
    const coll = COLL_OF[kind];
    const ok = action === 'view' ? canRead(u, coll) : hasPagePermission(u.permissions, coll, action);
    if (!ok) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: action === 'view' ? `ليس لديك صلاحية على ${LABEL[kind].many}` : `🔒 ماعندكش صلاحية ${action === 'add' ? 'إضافة' : 'تعديل'} ${LABEL[kind].many}` });
  }
  private visible(u: AuthUser, coll: string, rows: Row[]) { return rows.filter((r) => inProjectScope(u, coll, { ...r.data, id: r.id })).map((r) => ({ ...r.data, id: r.id, _rev: r.rev })); }

  async list(kind: PeopleKind, u: AuthUser, q: ListPeopleQuery) {
    this.assert(kind, u, 'view');
    const coll = COLL_OF[kind];
    const [rows, c, workerRows] = await Promise.all([this.repo.rows(coll), this.ctx(), kind === 'supervisor' ? this.repo.rows('workers') : Promise.resolve([] as Row[])]);
    const hide = hiddenFields(u, coll);
    const all: J[] = this.visible(u, coll, rows);
    const workers = canRead(u, 'workers') ? this.visible(u, 'workers', workerRows) : [];
    const list = kind === 'supervisor' ? filterSupervisors(c, all, q) : kind === 'employee' ? filterEmployees(c, all, q) : filterDrivers(c, all, q);
    const deptF = q.departmentId || '';
    // الموظفين: خيارات فلتر الوظيفة وسنين قسم المستقيلين (من كل الموظفين — زي القديمة)
    const options = kind === 'employee' ? { positions: employeePositions(all), resignYears: employeeResignYears(all, deptF.indexOf('__retired_') === 0) } : undefined;
    return {
      source: await this.repo.source(coll), boards: boards(c, all, kind),
      cards: peopleCards(c, kind, list, deptF, workers).filter((x) => !hide.length || !['إجمالي الرواتب', 'إجمالي اليوميات'].includes(x.label)),
      mode: kind === 'driver' && deptF === EXT_DEPT ? 'external' : kind === 'employee' && isResignedDeptId(deptF) ? (deptF.indexOf('__retired_') === 0 ? 'retired' : 'resigned') : 'company', hiddenFields: hide,
      ...(options ? { options } : {}),
      rows: list.map((p) => this.view(kind, c, p, hide, workers)),
      layout: await this.layoutDocs(kind === 'supervisor' ? ['supervisors'] : kind === 'employee' ? ['employees'] : ['drivers', 'driversExt']),
    };
  }
  /** تخطيط أعمدة الجدول المحفوظ (DEC-0122/د-5، قراية بس) */
  private async layoutDocs(ents: string[]) {
    const [fl, af, cf, df, rk, f1, f2, f3, al] = await Promise.all(['formLayouts', 'autoFields', 'customFieldDefs', 'deadFields', '_cfRegKeys', '_cfAllHiddenFixed', '_cfAutoFlagsReset', '_cfShowInTableMigrated', '_cfAligned2'].map((k) => this.repo.docValue(k)));
    const pick = (o: unknown) => { const src = o && typeof o === 'object' ? (o as J) : {}; const out: J = {}; for (const e of ents) if (src[e] !== undefined) out[e] = src[e]; return out; };
    return { formLayouts: pick(fl), autoFields: pick(af), customFieldDefs: pick(cf), deadFields: pick(df), cfRegKeys: pick(rk), aligned: pick(al), flags: { allHiddenFixed: !!f1, autoFlagsReset: !!f2, showInTableMigrated: !!f3 } };
  }
  private view(kind: PeopleKind, c: Ctx, p: J, hide: string[], workers: J[]) {
    const { _rev, ...rec } = p;
    const leave = activeLeaveOf(c, p.id, kind);
    return {
      ...stripHidden(rec, hide), rev: _rev, statusLabel: statusLabel(p.status || 'active'), statusTone: ['active', undefined, ''].includes(p.status) ? 'ok' : p.status === 'on_leave' ? 'warn' : 'err',
      leaveUntil: leave ? (leave.to ? fmtDate(leave.to) : '—') : '', departmentName: deptName(c, p.departmentId || p.categoryId),
      cardStatus: p.idCardExpiry ? statusFromExpiry(p.idCardExpiry, c.today) : p.idCardStatus || '', licenseStatusNow: p.licenseExpiry ? statusFromExpiry(p.licenseExpiry, c.today) : p.licenseStatus || '',
      contractTypeLabel: (CONTRACT_TYPE_OPTS.find((o) => o.code === p.contractType) || { label: p.contractType || '' }).label,
      workersCount: kind === 'supervisor' ? workersOf(workers, p.id) : undefined,
      previousDepartmentName: kind === 'employee' ? deptName(c, p.previousDepartmentId || p.departmentId) : undefined,
      issues: notesIssues(c, p, kind), warning: warning(c, p, kind),
    };
  }

  async get(kind: PeopleKind, u: AuthUser, id: string) {
    this.assert(kind, u, 'view');
    const coll = COLL_OF[kind];
    const r = (await this.repo.rows(coll)).find((x) => x.id === id);
    if (!r || !inProjectScope(u, coll, { ...r.data, id })) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: `${LABEL[kind].one} غير موجود` });
    return { ...stripHidden({ ...r.data, id }, hiddenFields(u, coll)), rev: r.rev, events: await this.repo.events(kind, id) };
  }
  /** خيارات النافذة: الكود الجاي، والحالات، وأنواع العقود، ودرجات الرخصة، والنهارده (تاريخ التعيين الافتراضي) */
  async formOptions(kind: PeopleKind, u: AuthUser) {
    this.assert(kind, u, 'view');
    const coll = COLL_OF[kind];
    const rows = await this.repo.rows(coll);
    return {
      nextCode: nextCode(LABEL[kind].code, rows.map((r) => r.data)), today: cairoTodayIso(), statuses: EMPLOYEE_STATUS, contractTypes: CONTRACT_TYPE_OPTS,
      licenseGrades: ['درجة أولى', 'درجة ثانية', 'درجة ثالثة', 'رخصة شخصية'], hiddenFields: hiddenFields(u, coll),
      ...(kind === 'employee' ? { employmentTypes: EMPLOYMENT_TYPES, insuranceStatuses: INSURANCE_STATUS_OPTS, defaultLeaveDays: (await this.repo.doc('settings')).defaultLeaveDays || 21 } : {}),
    };
  }

  /** فحص الصلاحيات على كل تغيير — نفس قواعد /api/sync */
  private authorize(u: AuthUser, changes: RecordChangeDto[], current: Map<string, J>) {
    const forbidden: { collection: string; id: string; reason: string }[] = [];
    for (const ch of changes) {
      const cur = current.get(`${ch.collection}\u0000${ch.id}`);
      if (!canWrite(u, ch.collection, cur ? 'edit' : 'add')) { forbidden.push({ collection: ch.collection, id: ch.id, reason: 'FORBIDDEN' }); continue; }
      const hf = hiddenFields(u, ch.collection);
      if (hf.length && Object.keys(ch.set ?? {}).some((k) => hf.includes(k))) { forbidden.push({ collection: ch.collection, id: ch.id, reason: 'FIELD_FORBIDDEN' }); continue; }
      if (!inProjectScope(u, ch.collection, { ...(cur ?? {}), ...(ch.set ?? {}), id: ch.id })) forbidden.push({ collection: ch.collection, id: ch.id, reason: 'OUT_OF_PROJECT_SCOPE' });
    }
    if (forbidden.length) throw new ForbiddenException({ statusCode: 403, code: forbidden.some((f) => f.reason === 'FIELD_FORBIDDEN') ? 'FIELD_FORBIDDEN' : 'FORBIDDEN', message: 'مالكش صلاحية لبعض التعديلات — مفيش حاجة اتحفظت', details: forbidden });
  }
  private diff(collection: string, r: Row | undefined, after: J, id: string): RecordChangeDto | null {
    if (!r) { const { id: _i, ...set } = after; return { collection, id, op: 'upsert', baseRev: 0, set: { id, ...set } } as RecordChangeDto; } // eslint-disable-line @typescript-eslint/no-unused-vars
    const set: J = {};
    for (const k of Object.keys(after)) if (k !== 'id' && JSON.stringify(after[k]) !== JSON.stringify(r.data[k])) set[k] = after[k];
    return Object.keys(set).length ? ({ collection, id: r.id, op: 'upsert', baseRev: r.rev, set } as RecordChangeDto) : null;
  }
  /** guardEntityDuplicates(kind, payload, excludeId) — زي 8.1 (K17) */
  private async guardDuplicates(kind: PeopleKind, u: AuthUser, em: QueryRunner['manager'], payload: J, excludeId: string | null, own: Row[], confirmed: boolean) {
    const seen = async (coll: string, rows?: Row[]) => (canRead(u, coll) ? (rows ?? (await this.repo.rows(coll, em))).filter((r) => inProjectScope(u, coll, { ...r.data, id: r.id })).map((r) => ({ ...r.data, id: r.id })) : []);
    const lists = {
      worker: await seen('workers'), employee: kind === 'employee' ? await seen('employees', own) : await seen('employees'),
      supervisor: kind === 'supervisor' ? await seen('supervisors', own) : await seen('supervisors'), driver: kind === 'driver' ? await seen('drivers', own) : await seen('drivers'),
    };
    const matches = findEntityDuplicates(kind, payload, excludeId, lists);
    if (!matches.length) return;
    const hard = matches.some((m) => m.strength === 'hard');
    if (!hard && confirmed) return;
    throw new ConflictException({ statusCode: 409, code: hard ? 'DUPLICATE' : 'DUPLICATE_SOFT', message: hard ? DUP_TEXT.hardMsg : DUP_TEXT.softMsg, title: hard ? DUP_TEXT.hardTitle : DUP_TEXT.softTitle, matches });
  }

  /** الإضافة والتعديل: نفس زرار الحفظ القديم (payload ← منع التكرار ← commit ← syncPersonResignedState ← stampProjectMembership) */
  private async save(kind: PeopleKind, u: AuthUser, id: string, dto: SavePersonDto, rev?: number) {
    const coll = COLL_OF[kind];
    let saved: J = {};
    const hide = hiddenFields(u, coll);
    if (hide.length && ((dto.dailyWage ?? '') !== '' || (dto.salary ?? '') !== '')) throw new ForbiddenException({ statusCode: 403, code: 'FIELD_FORBIDDEN', message: 'مالكش صلاحية على الأجور — مفيش حاجة اتحفظت' });
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const em = qr.manager;
        const [rows, archive, c] = await Promise.all([this.repo.rows(coll, em), this.repo.rows('resignedArchive', em), this.ctx(qr)]);
        const cur = rows.find((r) => r.id === id);
        if (rev != null) {
          if (!cur || !inProjectScope(u, coll, { ...cur.data, id })) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: `${LABEL[kind].one} غير موجود` });
          if (cur.rev !== rev) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: `${LABEL[kind].one} اتعدّل من مستخدم تاني — حدّث الصفحة` });
        }
        if (!String(dto.name || '').trim()) throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: 'الاسم مطلوب' });
        const p0: J | null = cur ? { ...cur.data, id } : null;
        const all = rows.map((r) => ({ ...r.data, id: r.id }));
        // نافذة السواق الخارجي: الإضافة من زرار «سائق خارجي»، والتعديل بنوع السجل المخزن (openDriverModal ← openExternalDriverModal)
        const external = kind === 'driver' && (p0 ? !!p0.external : !!dto.external);
        // الأجر المخفي عن المستخدم: النافذة القديمة مابتعرضوش، والقيمة المخزنة بتفضل (الخارجي من غير دمج ← بنبعت المخزن)
        const form = { ...dto, ...(hide.includes('dailyWage') && external && p0 ? { dailyWage: String(p0.dailyWage ?? '') } : {}) };
        const payload = kind === 'supervisor' ? supervisorPayload(form, p0, all, c.today) : kind === 'employee' ? employeePayload(form, p0, all, c.today)
          : external ? externalDriverPayload(form, p0, all) : driverPayload(form, p0, all, c.today);
        await this.guardDuplicates(kind, u, em, payload, p0 ? id : null, rows, !!dto.confirmDuplicates);
        const rec = commitPerson(payload, p0, id, !external);
        const arch = syncResigned(rec, archive.map((a) => ({ ...a.data, id: a.id })), c.today, new Date().toISOString(), uid, kind);
        stampMembership(p0, rec, c.today);
        saved = rec;
        const changes: RecordChangeDto[] = [];
        const own = this.diff(coll, cur, rec, id); if (own) changes.push(own);
        if (arch?.op === 'upsert') { const ex = archive.find((a) => a.id === arch.entry.id); const ch = this.diff('resignedArchive', ex, arch.entry, arch.entry.id); if (ch) changes.push(ch); }
        if (arch?.op === 'remove') for (const aid of arch.ids) { const ex = archive.find((a) => a.id === aid)!; changes.push({ collection: 'resignedArchive', id: aid, op: 'delete', baseRev: ex.rev } as RecordChangeDto); }
        for (const [did, name] of [[resignedDeptOf(kind), 'المستقيلين'], [retiredDeptOf(kind), 'المعاشات']] as const) {
          if (rec.departmentId !== did) continue;
          const d = c.raw.departments.find((x) => x.id === did);
          const want = { ...(d?.data ?? { id: did }), name, kind: coll, system: true, locked: true };
          const ch = this.diff('departments', d, want, did); if (ch) changes.push(ch);
        }
        const current = new Map<string, J>();
        rows.forEach((r) => current.set(`${coll}\u0000${r.id}`, r.data)); archive.forEach((r) => current.set(`resignedArchive\u0000${r.id}`, r.data)); c.raw.departments.forEach((r) => current.set(`departments\u0000${r.id}`, r.data));
        this.authorize(u, changes.filter((ch) => ch.collection === coll), current);
        this.authorize(u, changes.filter((ch) => ch.collection !== coll), current);
        return changes;
      },
      after: async (qr, res) => {
        const ownApplied = res.applied.find((a) => a.collection === coll && a.id === id);
        if (res.conflicts.length || (ownApplied && ownApplied.overwrote?.length)) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: `${LABEL[kind].one} اتعدّل من مستخدم تاني — حدّث الصفحة` });
        await this.repo.addSavedEvent(qr.manager, kind, id, { kind: rev == null ? 'created' : 'updated', id, code: String(saved.code || ''), name: String(saved.name || ''), status: saved.status,
          departmentId: saved.departmentId || '', projectId: saved.projectId || '', external: !!saved.external, resigned: isResignedStatus(saved.status) }, u.id);
      },
    });
    return this.get(kind, u, id);
  }
  async create(kind: PeopleKind, u: AuthUser, dto: SavePersonDto) { this.assert(kind, u, 'add'); return this.save(kind, u, uid(), dto); }
  async update(kind: PeopleKind, u: AuthUser, id: string, dto: UpdatePersonDto) { this.assert(kind, u, 'edit'); return this.save(kind, u, id, dto, dto.rev); }
}
