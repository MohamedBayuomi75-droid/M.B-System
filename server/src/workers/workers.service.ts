import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import type { RecordChangeDto } from '../data/data.dto';
import { DataService } from '../data/data.service';
import { canRead, canWrite, hiddenFields, inProjectScope, stripHidden } from '../data/policy';
import { cairoTodayIso } from '../parties/parties.service';
import {
  boards, cards, Ctx, deptName, EMPLOYEE_STATUS, fmtDate, isResignedStatus, J, nextCode, notesIssues, RESIGNED_DEPT, RETIRED_DEPT, stampMembership, statusFromExpiry,
  statusLabel, supName, syncResigned, tableMode, warning, WORKER_TYPES, CONTRACT_TYPE_OPTS, activeLeaveOf, commitWorker, filterWorkers, isTemporaryWorker, workerPayload,
} from './worker-rules';
import { ListWorkersQuery, SaveWorkerDto, UpdateWorkerDto } from './workers.dto';
import { Row, WorkersRepository } from './workers.repository';

const COLL = 'workers';
type QueryRunner = Parameters<NonNullable<NonNullable<Parameters<DataService['sync']>[2]>['before']>>[0];
const WAGE_KEYS = ['dailyWage', 'salary'] as const;
const uid = () => `id_${Date.now().toString(36)}${randomBytes(4).toString('hex').slice(0, 7)}`;

/**
 * العمال (8.1.4، DEC-0121) — طبقة الأعمال. القواعد منقولة من الواجهة القديمة في worker-rules.ts، والمقارنة في tests-merge/phase74.js.
 *  - لوحات الأقسام، والقايمة بفلاترها، والكروت، والملاحظات، وعلامة النقص، وشكل الجدول — زي renderWorkersPage.
 *  - الحفظ بنفس حساب زرار الحفظ في نافذة العامل (بشكليها)، والدمج، والقسم، وأرشيف المستقيلين، وتاريخ الانضمام للمشروع — في معاملة واحدة
 *    وبنفس صلاحيات /api/sync.
 *  - **الأجور (B-48):** اليومية والراتب مابيظهروش ومايتقبلوش من مستخدم مالوش صفحة الرواتب أو المستحقات (field-guards)، والقيمة المخزنة بتفضل.
 *  - الحذف، وصفحة العامل وكشف مستحقاته، والإحالة للمعاش، والإجراءات الجماعية، وتخصيص الأعمدة: من الشاشة الكاملة (د-2، د-3، د-6).
 */
@Injectable()
export class WorkersService {
  constructor(private readonly data: DataService, private readonly repo: WorkersRepository) {}

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
  private assert(u: AuthUser, action: 'view' | 'add' | 'edit') {
    const ok = action === 'view' ? canRead(u, COLL) : hasPagePermission(u.permissions, COLL, action);
    if (!ok) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: action === 'view' ? 'ليس لديك صلاحية على العمال' : action === 'add' ? '🔒 ماعندكش صلاحية إضافة عمال' : '🔒 ماعندكش صلاحية تعديل العمال' });
  }
  private visible(u: AuthUser, rows: Row[]) { return rows.filter((r) => inProjectScope(u, COLL, { ...r.data, id: r.id })).map((r) => ({ ...r.data, id: r.id, _rev: r.rev })); }

  async list(u: AuthUser, q: ListWorkersQuery) {
    this.assert(u, 'view');
    const [rows, c] = await Promise.all([this.repo.rows(COLL), this.ctx()]);
    const hide = hiddenFields(u, COLL);
    const all: J[] = this.visible(u, rows);
    const list = filterWorkers(c, all, q);
    const deptF = q.departmentId || '';
    return {
      source: await this.repo.source(), boards: boards(c, all),
      cards: cards(c, list, deptF).filter((x) => !hide.length || !['إجمالي الرواتب', 'إجمالي اليوميات'].includes(x.label)),
      mode: tableMode(deptF, q.type || '', list.slice(0, 20)), hiddenFields: hide,
      supervisors: c.supervisors.map((s) => ({ id: s.id, code: s.code || '', name: s.name || '' })),
      projects: [...new Set(all.map((w) => w.project).filter(Boolean))],
      rows: list.map((w) => this.view(c, w, hide)),
    };
  }
  private view(c: Ctx, w: J, hide: string[]) {
    const { _rev, ...rec } = w;
    const leave = activeLeaveOf(c, w.id);
    return {
      ...stripHidden(rec, hide), rev: _rev, temporary: isTemporaryWorker(w), statusLabel: statusLabel(w.status || 'active'), statusTone: ['active', 'temporary', undefined, ''].includes(w.status) ? 'ok' : w.status === 'on_leave' ? 'warn' : 'err',
      leaveUntil: leave ? (leave.to ? fmtDate(leave.to) : '—') : '', departmentName: deptName(c, w.departmentId || w.categoryId), supervisorName: supName(c, w.supervisorId),
      cardStatus: w.idCardExpiry ? statusFromExpiry(w.idCardExpiry, c.today) : w.idCardStatus || '', contractTypeLabel: (CONTRACT_TYPE_OPTS.find((o) => o.code === w.contractType) || { label: w.contractType || '' }).label,
      issues: notesIssues(c, w), warning: warning(c, w),
    };
  }

  async get(u: AuthUser, id: string) {
    this.assert(u, 'view');
    const r = (await this.repo.rows(COLL)).find((x) => x.id === id);
    if (!r || !inProjectScope(u, COLL, { ...r.data, id })) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'العامل غير موجود' });
    return { ...stripHidden({ ...r.data, id }, hiddenFields(u, COLL)), rev: r.rev, events: await this.repo.events(id) };
  }

  /** خيارات النافذة: المشرفين، والحالات، والأنواع، وأنواع العقود، والكود الجاي، والمشروعات، والنهارده (تاريخ التعيين الافتراضي) */
  async formOptions(u: AuthUser) {
    this.assert(u, 'view');
    const [rows, sups, projects] = await Promise.all([this.repo.rows(COLL), this.repo.rows('supervisors'), this.repo.rows('projects')]);
    return {
      nextCode: nextCode('WRK-', rows.map((r) => r.data)), today: cairoTodayIso(), statuses: EMPLOYEE_STATUS, types: WORKER_TYPES, contractTypes: CONTRACT_TYPE_OPTS,
      supervisors: sups.map((s) => ({ id: s.id, code: String(s.data.code || ''), name: String(s.data.name || '') })).sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code, 'ar', { sensitivity: 'base' })),
      projects: projects.map((p) => String(p.data.name || '')).filter(Boolean), hiddenFields: hiddenFields(u, COLL),
    };
  }

  /** فحص الصلاحيات على كل تغيير (التغييرات اللي بترجع من before بتتعامل كتغييرات نظام) — نفس قواعد /api/sync */
  private authorize(u: AuthUser, changes: RecordChangeDto[], current: Map<string, J>) {
    const forbidden: { collection: string; id: string; reason: string }[] = [];
    for (const ch of changes) {
      const cur = current.get(`${ch.collection}\u0000${ch.id}`);
      if (!canWrite(u, ch.collection, cur ? 'edit' : 'add')) { forbidden.push({ collection: ch.collection, id: ch.id, reason: 'FORBIDDEN' }); continue; }
      const hf = hiddenFields(u, ch.collection);
      if (hf.length && Object.keys(ch.set ?? {}).some((k) => hf.includes(k))) { forbidden.push({ collection: ch.collection, id: ch.id, reason: 'FIELD_FORBIDDEN' }); continue; }
      if (!inProjectScope(u, ch.collection, { ...(cur ?? {}), ...(ch.set ?? {}), id: ch.id })) forbidden.push({ collection: ch.collection, id: ch.id, reason: 'OUT_OF_PROJECT_SCOPE' });
    }
    if (forbidden.length) throw new ForbiddenException({ statusCode: 403, code: forbidden.some((f) => f.reason === 'FIELD_FORBIDDEN') ? 'FIELD_FORBIDDEN' : 'FORBIDDEN', message: 'مالكش صلاحية لبعض التعديلات — مفيش حاجة اتحفظت', details: forbidden.slice(0, 50) });
  }
  private diff(collection: string, r: Row | undefined, after: J, id: string): RecordChangeDto | null {
    if (!r) { const { id: _i, ...set } = after; return { collection, id, op: 'upsert', baseRev: 0, set: { id, ...set } } as RecordChangeDto; } // eslint-disable-line @typescript-eslint/no-unused-vars
    const set: J = {};
    for (const k of Object.keys(after)) if (k !== 'id' && JSON.stringify(after[k]) !== JSON.stringify(r.data[k])) set[k] = after[k];
    return Object.keys(set).length ? ({ collection, id: r.id, op: 'upsert', baseRev: r.rev, set } as RecordChangeDto) : null;
  }

  /** الإضافة والتعديل: نفس زرار الحفظ القديم (workerPayload ← commitWorker ← syncResigned ← stampMembership) */
  private async save(u: AuthUser, id: string, dto: SaveWorkerDto, rev?: number) {
    let saved: J = {};
    const hide = hiddenFields(u, COLL);
    if (hide.length && ((dto.dailyWage ?? '') !== '' || (dto.salary ?? '') !== '')) throw new ForbiddenException({ statusCode: 403, code: 'FIELD_FORBIDDEN', message: 'مالكش صلاحية على الأجور — مفيش حاجة اتحفظت' });
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const em = qr.manager;
        const [rows, archive, c] = await Promise.all([this.repo.rows(COLL, em), this.repo.rows('resignedArchive', em), this.ctx(qr)]);
        const cur = rows.find((r) => r.id === id);
        if (rev != null) {
          if (!cur || !inProjectScope(u, COLL, { ...cur.data, id })) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'العامل غير موجود' });
          if (cur.rev !== rev) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'العامل اتعدّل من مستخدم تاني — حدّث الصفحة' });
        }
        if (!String(dto.name || '').trim()) throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: 'الاسم مطلوب' });
        const w: J | null = cur ? { ...cur.data, id } : null;
        const all = rows.map((r) => ({ ...r.data, id: r.id }));
        // الأجر المخفي عن المستخدم: النافذة القديمة مابتعرضوش، والسيرفر بياخد القيمة المخزنة (مش بيمسحها)
        const form = { ...dto, ...(hide.includes('dailyWage') && w ? { dailyWage: String(w.dailyWage ?? '') } : {}) };
        const payload = workerPayload(form, w, all, c.today);
        const rec = commitWorker(payload, w, id);
        const arch = syncResigned(rec, archive.map((a) => ({ ...a.data, id: a.id })), c.today, new Date().toISOString(), uid);
        stampMembership(w, rec, c.today);
        saved = rec;
        const changes: RecordChangeDto[] = [];
        const own = this.diff(COLL, cur, rec, id); if (own) changes.push(own);
        if (arch?.op === 'upsert') { const ex = archive.find((a) => a.id === arch.entry.id); const ch = this.diff('resignedArchive', ex, arch.entry, arch.entry.id); if (ch) changes.push(ch); }
        if (arch?.op === 'remove') for (const aid of arch.ids) { const ex = archive.find((a) => a.id === aid)!; changes.push({ collection: 'resignedArchive', id: aid, op: 'delete', baseRev: ex.rev } as RecordChangeDto); }
        // ensureResignedDepartment / ensureRetiredDepartment: القسم بيتعمل لو مش موجود
        for (const [did, name] of [[RESIGNED_DEPT, 'المستقيلين'], [RETIRED_DEPT, 'المعاشات']] as const) {
          if (rec.departmentId !== did) continue;
          const d = c.raw.departments.find((x) => x.id === did);
          const want = { ...(d?.data ?? { id: did }), name, kind: 'workers', system: true, locked: true };
          const ch = this.diff('departments', d, want, did); if (ch) changes.push(ch);
        }
        const current = new Map<string, J>();
        rows.forEach((r) => current.set(`${COLL}\u0000${r.id}`, r.data)); archive.forEach((r) => current.set(`resignedArchive\u0000${r.id}`, r.data)); c.raw.departments.forEach((r) => current.set(`departments\u0000${r.id}`, r.data));
        this.authorize(u, changes.filter((ch) => ch.collection === COLL), current);
        this.authorize(u, changes.filter((ch) => ch.collection !== COLL), current);
        return changes;
      },
      after: async (qr, res) => {
        const ownApplied = res.applied.find((a) => a.collection === COLL && a.id === id);
        if (res.conflicts.length || (ownApplied && ownApplied.overwrote?.length)) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'العامل اتعدّل من مستخدم تاني — حدّث الصفحة' });
        await this.repo.addSavedEvent(qr.manager, id, { kind: rev == null ? 'created' : 'updated', id, code: String(saved.code || ''), name: String(saved.name || ''), workerType: saved.workerType, status: saved.status,
          departmentId: saved.departmentId || '', supervisorId: saved.supervisorId || '', projectId: saved.projectId || '', resigned: isResignedStatus(saved.status) }, u.id);
      },
    });
    return this.get(u, id);
  }
  async create(u: AuthUser, dto: SaveWorkerDto) { this.assert(u, 'add'); return this.save(u, uid(), dto); }
  async update(u: AuthUser, id: string, dto: UpdateWorkerDto) { this.assert(u, 'edit'); return this.save(u, id, dto, dto.rev); }
}
