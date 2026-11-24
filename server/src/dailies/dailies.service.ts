import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import { Money } from '../common/money';
import type { RecordChangeDto } from '../data/data.dto';
import { DataService } from '../data/data.service';
import { canRead, hiddenFields, inProjectScope } from '../data/policy';
import { cairoTodayIso } from '../parties/parties.service';
import { CORE_DEPTS_OF, J } from '../workers/worker-rules';
import {
  ATTENDANCE_STATUS, attendancePayload, attPersonId, attType, bounds, dailyPayload, daysCredit, dayWage, DKind, FLAG_LABEL, filterAttendance, flagsOf, fmtAttendanceDays, fmtDays,
  KIND_COLL, legacyNet, newNet, ownerOf, People, peopleList, recordsFor, TAB_KIND,
} from './dailies-rules';
import { AttQuery, GridQuery, ReviewDto, SaveAttDto, SaveDailyDto, UpdateAttDto, UpdateDailyDto } from './dailies.dto';
import { DailiesRepository, Row } from './dailies.repository';

type QueryRunner = Parameters<NonNullable<NonNullable<Parameters<DataService['sync']>[2]>['before']>>[0];
type Em = QueryRunner['manager'];
const uid = () => `id_${Date.now().toString(36)}${randomBytes(4).toString('hex').slice(0, 7)}`;
const COLL = 'workerAttendance';
const ATT = 'attendance';
const KINDS: DKind[] = ['worker', 'supervisor', 'driver'];
const BOARDS = [{ id: 'workers', label: 'العمال', icon: '🧑‍🔧', kind: 'worker' as const }, { id: 'supervisors', label: 'المشرفون', icon: '👷', kind: 'supervisor' as const },
  { id: 'drivers', label: 'السائقون', icon: '🧑‍🚒', kind: 'driver' as const }];
const sum = (xs: string[]) => Money.sum(xs.length ? xs : ['0']).toFixed().replace(/\.?0+$/, '') || '0';

/**
 * اليوميات وحضور الموظفين (8.5.4، DEC-0135) — طبقة الأعمال. القواعد في dailies-rules.ts، والمقارنة بالقديمة في tests-merge/phase82.js.
 *  - اللوحات، والجدول الشهري (الأشخاص بالفلاتر، والسجلات لكل شخص، والكروت)، وقايمة سجلات الفترة، ونافذة مواقع اليوم، والحفظ (doSaveWatt) والحذف.
 *  - **المستحق بالحساب الجديد (DEC-0129/0130)**، ومعاه القديم في تقرير الفرق (د-2). والمستحق والأجر والخصم مابيظهروش من غير صلاحيتهم (DEC-0134).
 *  - قايمة المراجعة (DEC-0133): المكررة واليتيمة وبأجر صفر وبحالة مش معروفة، والقرار (تتحسب / تتلغي بسبب) بصلاحية «تعديل» على المستحقات.
 *  - حضور الموظفين (pages-attendance.js).
 */
@Injectable()
export class DailiesService {
  constructor(private readonly data: DataService, private readonly repo: DailiesRepository) {}

  private async ctx(em?: Em) {
    const [w, s, d, rows, projects, deps] = await Promise.all([this.repo.rows('workers', em), this.repo.rows('supervisors', em), this.repo.rows('drivers', em),
      this.repo.rows(COLL, em), this.repo.rows('projects', em), this.repo.rows('departments', em)]);
    const flat = (xs: Row[]) => xs.map((r) => ({ ...r.data, id: r.id }) as J);
    const people: People = { worker: flat(w), supervisor: flat(s), driver: flat(d) };
    return { people, rows, all: rows.map((r) => ({ ...r.data, id: r.id, _rev: r.rev }) as J), projects: flat(projects), departments: flat(deps) };
  }
  private assert(u: AuthUser, page: string, action: 'view' | 'add' | 'edit' | 'delete') {
    const ok = action === 'view' ? canRead(u, page) : hasPagePermission(u.permissions, page, action);
    if (!ok) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: '🔒 ماعندكش صلاحية' });
  }
  /** الأجور والمستحق (DEC-0134): نفس حارس الحقول على اليوميات (dayWage / deduction) */
  private wages(u: AuthUser) { return !hiddenFields(u, COLL).includes('dayWage'); }
  private visible(u: AuthUser, all: J[]) { return all.filter((a) => inProjectScope(u, COLL, a)); }
  private supName(people: People) { return (id: string) => { const s = people.supervisor.find((x) => x.id === id); return s ? s.name || s.code || id : '—'; }; }

  /** departmentsForKind (helpers.js) لأقسام الأشخاص: أقسام النظام بس، بترتيب الأقسام الأساسية */
  private deptsFor(kind: DKind, departments: J[], people: People) {
    const coll = KIND_COLL[kind];
    const used = new Set(people[kind].map((p) => p.departmentId || p.categoryId || '').filter(Boolean));
    const matched = departments.filter((d) => d && (!d.kind || d.kind === 'all' || d.kind === coll || (Array.isArray(d.kinds) && d.kinds.includes(coll)) || used.has(d.id)));
    const order = (CORE_DEPTS_OF[kind] || []).map((c) => c.id);
    return matched.filter((d) => d.system && !d.jobDept).sort((a, b) => {
      const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
      return ((ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)) || String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
  }
  async boards(u: AuthUser) {
    this.assert(u, COLL, 'view');
    const c = await this.ctx();
    return {
      kinds: BOARDS.map((b) => ({ id: b.id, label: b.label, icon: b.icon, count: c.people[b.kind].length, depts: this.deptsFor(b.kind, c.departments, c.people).length })),
      depts: Object.fromEntries(BOARDS.map((b) => {
        const list = c.people[b.kind];
        const deps = this.deptsFor(b.kind, c.departments, c.people).filter((d) => !/^__(resigned|retired)_/.test(d.id || ''));
        return [b.id, [{ id: '', name: 'الكل', count: list.length }, ...deps.map((d) => ({ id: d.id, name: (b.id === 'workers' && d.dailiesName) || d.name || '', count: list.filter((p) => String(p.departmentId || p.categoryId || '') === String(d.id)).length }))]];
      })),
    };
  }

  /** الجدول الشهري (renderWorkerAttendancePage) — الأشخاص، والأيام، وسجلات كل شخص في الفترة، والكروت */
  async grid(u: AuthUser, q: GridQuery) {
    this.assert(u, COLL, 'view');
    const c = await this.ctx();
    const tab = q.tab || 'workers', kind = TAB_KIND[tab];
    const today = cairoTodayIso();
    const first = `${today.slice(0, 7)}-01`;
    const lastD = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7), 0)).toISOString().slice(0, 10);
    const ok = (v?: string) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
    const b = bounds(ok(q.from) ? q.from! : first, ok(q.to) ? q.to! : lastD);
    const all = this.visible(u, c.all);
    let people = peopleList(all, c.people, { ...q, tab }, b.from, b.to, this.supName(c.people)).filter((p) => p.kind === kind);
    if (q.dept !== undefined) {
      const dept = q.dept || '';
      if (dept) {
        const ids = new Set(c.people[kind].filter((p) => (dept === '__none__' || dept === 'none' ? !String(p.position || p.job || p.jobTitle || p.skill || '').trim() : String(p.departmentId || p.categoryId || '').trim() === dept)).map((p) => p.id));
        people = people.filter((p) => ids.has(p.id));
      }
    }
    const wages = this.wages(u);
    const flags = flagsOf(c.all, c.people);
    let days = 0, multi = 0; const pays: string[] = [], legacyPays: number[] = [];
    const rows = people.map((p) => {
      const recs = recordsFor(all, c.people, p.kind, p.id, b.from, b.to, q);
      const owner = c.people[p.kind].find((x) => x.id === p.id);
      const byDate: Record<string, J[]> = {};
      for (const a of recs) { days += daysCredit(a); pays.push(newNet(a, owner, flags.get(a.id)).net); legacyPays.push(legacyNet(a, owner)); (byDate[a.date] = byDate[a.date] || []).push(a); }
      for (const g of Object.values(byDate)) if (g.length > 1) g.slice(1).forEach((a) => { multi += daysCredit(a); });
      return { ...p, totalDays: fmtDays(Math.round(recs.reduce((s, a) => s + daysCredit(a), 0) * 100) / 100),
        records: recs.map((a) => ({ id: a.id, date: a.date, status: a.status, days: daysCredit(a), project: a.project || '', site: a.site || '', flags: flags.get(a.id) || [] })) };
    });
    return {
      source: await this.repo.source(COLL), from: b.from, to: b.to, dates: b.dates, wages, rows,
      cards: { people: people.length, days: fmtDays(Math.round(days * 100) / 100), pay: wages ? sum(pays) : null, legacyPay: wages ? Math.round(legacyPays.reduce((s, x) => s + x, 0) * 100) / 100 : null, multi: fmtDays(Math.round(multi * 100) / 100) },
      options: this.filterOptions(c, all),
    };
  }
  private filterOptions(c: Awaited<ReturnType<DailiesService['ctx']>>, all: J[]) {
    const byAr = (xs: string[]) => Array.from(new Set(xs.map((x) => String(x || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar'));
    return { projects: byAr(c.projects.map((p) => p.name || p.title)), sites: byAr(all.map((a) => a.site)), statuses: ATTENDANCE_STATUS,
      supervisors: c.people.supervisor.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar', { sensitivity: 'base' })).map((s) => ({ id: s.id, name: s.name || '', code: s.code || '' })) };
  }
  private view(c: Awaited<ReturnType<DailiesService['ctx']>>, a: J, wages: boolean, flags: Map<string, ReturnType<typeof flagsOf> extends Map<string, infer F> ? F : never>) {
    const { _rev, ...rec } = a;
    const kind = attType(a, c.people), owner = ownerOf(a, c.people);
    const n = newNet(a, owner, flags.get(a.id));
    const name = kind === 'supervisor' ? (owner ? owner.name || owner.code || attPersonId(a) : '—') : kind === 'driver' ? (owner ? owner.name : '') : (owner ? owner.name || owner.code || attPersonId(a) : '—');
    const out: J = { ...rec, rev: _rev, kind, personName: name, kindLabel: kind === 'supervisor' ? 'مشرف' : kind === 'driver' ? 'سائق' : 'عامل', statusLabel: (ATTENDANCE_STATUS.find((s) => s.code === a.status) || { label: '' }).label,
      daysText: fmtAttendanceDays(a), credit: daysCredit(a), flags: flags.get(a.id) || [], flagLabels: (flags.get(a.id) || []).map((f) => FLAG_LABEL[f]), pending: n.pending };
    if (wages) Object.assign(out, { wage: dayWage(a, owner), net: n.net, legacyNet: legacyNet(a, owner) });
    else { delete out.dayWage; delete out.deduction; }
    return out;
  }
  /** قايمة سجلات الفترة (renderWattRecordsList) */
  async list(u: AuthUser, q: GridQuery) {
    this.assert(u, COLL, 'view');
    const c = await this.ctx();
    const tab = q.tab || '', from = q.from || '0000', to = q.to || '9999';
    const proj = String(q.project || '').trim(), sf = String(q.site || '').trim();
    const list = this.visible(u, c.all).filter((a) => (a.date || '') >= from && (a.date || '') <= to && !(proj && String(a.project || '').trim() !== proj) && !(sf && String(a.site || '').trim() !== sf)
      && !(tab === 'workers' && a.personType && a.personType !== 'worker') && !(tab === 'supervisors' && a.personType !== 'supervisor') && !(tab === 'drivers' && a.personType !== 'driver'))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const wages = this.wages(u), flags = flagsOf(c.all, c.people);
    return { wages, rows: list.map((a) => this.view(c, a, wages, flags)) };
  }
  /** نافذة مواقع اليوم الواحد (openWattDaySitesModal) */
  async day(u: AuthUser, kind: DKind, id: string, date: string) {
    this.assert(u, COLL, 'view');
    const c = await this.ctx();
    const recs = this.visible(u, c.all).filter((a) => a && a.date === date && (a.personType || 'worker') === kind && (kind === 'worker' ? a.workerId === id || a.personId === id : a.personId === id));
    const wages = this.wages(u), flags = flagsOf(c.all, c.people);
    const rows = recs.map((a) => this.view(c, a, wages, flags));
    return { rows, totalDays: fmtDays(Math.round(recs.reduce((s, a) => s + daysCredit(a), 0) * 100) / 100), totalNet: wages ? sum(rows.map((r) => r.net)) : null, wages };
  }
  async get(u: AuthUser, id: string) {
    this.assert(u, COLL, 'view');
    const c = await this.ctx();
    const a = c.all.find((x) => x.id === id);
    if (!a || !inProjectScope(u, COLL, a)) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'اليومية غير موجودة' });
    return { ...this.view(c, a, this.wages(u), flagsOf(c.all, c.people)), events: await this.repo.events('daily', id) };
  }
  /** خيارات النافذة: الأشخاص النشطين لكل نوع (بالأجر لو مسموح)، والمشاريع، والحالات */
  async formOptions(u: AuthUser) {
    this.assert(u, COLL, 'view');
    const c = await this.ctx();
    const wages = this.wages(u);
    const sorted = (xs: J[]) => xs.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar', { sensitivity: 'base' }));
    const pick = (p: J) => ({ id: p.id, name: p.name || '', code: p.code || '', ...(wages ? { dailyWage: p.dailyWage ?? null } : {}) });
    return { today: cairoTodayIso(), wages, statuses: ATTENDANCE_STATUS, projects: this.filterOptions(c, c.all).projects,
      people: { worker: sorted(c.people.worker.filter((w) => w.status === 'active' || !w.status)).map(pick), supervisor: sorted(c.people.supervisor.filter((s) => s.status !== 'inactive')).map(pick),
        driver: sorted(c.people.driver.filter((d) => d.status !== 'inactive')).map(pick) } };
  }

  /** قايمة المراجعة (DEC-0133) */
  async review(u: AuthUser) {
    this.assert(u, COLL, 'view');
    const c = await this.ctx();
    const flags = flagsOf(c.all, c.people), wages = this.wages(u);
    const rows = this.visible(u, c.all).filter((a) => flags.has(a.id)).map((a) => this.view(c, a, wages, flags));
    return { rows, pending: rows.filter((r) => !r.reviewDecision).length, canDecide: hasPagePermission(u.permissions, 'workerDues', 'edit') };
  }
  /** تقرير الفرق (د-2): القديم مقابل الجديد للفترة (أو الكل) */
  async diff(u: AuthUser, q: GridQuery) {
    this.assert(u, COLL, 'view');
    if (!this.wages(u)) throw new ForbiddenException({ statusCode: 403, code: 'FIELD_FORBIDDEN', message: 'مالكش صلاحية على الأجور' });
    const c = await this.ctx();
    const flags = flagsOf(c.all, c.people);
    const list = this.visible(u, c.all).filter((a) => (!q.from || (a.date || '') >= q.from) && (!q.to || (a.date || '') <= q.to));
    let changed = 0; const olds: string[] = [], news: string[] = []; const byReason: Record<string, number> = {};
    for (const a of list) {
      const owner = ownerOf(a, c.people);
      const o = String(legacyNet(a, owner)); const n = newNet(a, owner, flags.get(a.id));
      olds.push(o); news.push(n.net);
      if (Money.of(o).minus(n.net).isZero()) continue;
      changed++;
      const why = n.pending ? 'review' : 'rounding';
      byReason[why] = (byReason[why] || 0) + 1;
    }
    const oldT = sum(olds), newT = sum(news);
    return { records: list.length, changed, byReason, legacyTotal: oldT, newTotal: newT, difference: Money.of(newT).minus(oldT).toFixed().replace(/\.?0+$/, '') || '0' };
  }

  // ---------------- الكتابة
  private async write(u: AuthUser, coll: string, id: string, eventType: string, action: string, make: (cur: Row | undefined, c: Awaited<ReturnType<DailiesService['ctx']>>) => J | null, rev?: number) {
    let saved: J | null = null;
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const c = await this.ctx(qr.manager);
        const rows = coll === COLL ? c.rows : await this.repo.rows(coll, qr.manager);
        const cur = rows.find((r) => r.id === id);
        if (rev != null) {
          if (!cur || (coll === COLL && !inProjectScope(u, coll, { ...cur.data, id }))) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'السجل غير موجود' });
          if (cur.rev !== rev) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'السجل اتعدّل من مستخدم تاني — حدّث الصفحة' });
        }
        const next = make(cur, c);
        saved = next ?? (cur ? { ...cur.data, id } : null);
        if (next === null) return [{ collection: coll, id, op: 'delete', baseRev: cur!.rev } as RecordChangeDto];
        if (!cur) return [{ collection: coll, id, op: 'upsert', baseRev: 0, set: next } as RecordChangeDto];
        const set = Object.fromEntries(Object.entries(next).filter(([k, v]) => k !== 'id' && JSON.stringify(v) !== JSON.stringify(cur.data[k])));
        return Object.keys(set).length ? [{ collection: coll, id, op: 'upsert', baseRev: cur.rev, set } as RecordChangeDto] : [];
      },
      after: async (qr, res) => {
        const mine = res.applied.find((a) => a.collection === coll && a.id === id);
        if (res.conflicts.length || (mine && mine.overwrote?.length)) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'السجل اتعدّل من مستخدم تاني — حدّث الصفحة' });
        const s = saved as J | null;
        await this.repo.addEvent(qr.manager, eventType, action, id, coll === COLL
          ? { id, personType: s?.personType ?? '', personId: s?.personId ?? '', date: s?.date ?? '', status: s?.status ?? '', project: s?.project ?? '', reviewDecision: s?.reviewDecision ?? '' }
          : { id, employeeId: s?.employeeId ?? '', date: s?.date ?? '', status: s?.status ?? '' }, u.id);
      },
    });
  }
  /** الأجر والخصم المحميين (DEC-0134): الكتابة بيهم ممنوعة من غير صلاحيتهم، والقيمة المخزنة بتفضل */
  private guardWages(u: AuthUser, dto: SaveDailyDto) {
    if (!this.wages(u) && ((dto.dayWage ?? '') !== '' || (dto.deduction ?? '') !== '')) throw new ForbiddenException({ statusCode: 403, code: 'FIELD_FORBIDDEN', message: 'مالكش صلاحية على الأجور — مفيش حاجة اتحفظت' });
  }
  private payload(u: AuthUser, dto: SaveDailyDto, c: Awaited<ReturnType<DailiesService['ctx']>>, cur: J | null) {
    // من غير صلاحية الأجور: الأجر بييجي من المخزّن (التعديل) أو من الشخص (الإضافة — زي fillWage في النافذة)
    const form = { ...dto };
    if (!this.wages(u)) {
      const owner = c.people[dto.personType as DKind]?.find((x) => x.id === dto.personId);
      form.dayWage = String(cur ? cur.dayWage ?? '' : owner?.dailyWage ?? ''); form.deduction = String(cur ? cur.deduction ?? '' : '');
    }
    const p = dailyPayload(form, c.people, (name) => (c.projects.find((x) => String(x.name || x.title || '').trim() === name) || { id: '' }).id);
    if (typeof p === 'string') throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: p });
    return p;
  }
  async create(u: AuthUser, dto: SaveDailyDto) {
    this.assert(u, COLL, 'add'); this.guardWages(u, dto); const id = uid();
    await this.write(u, COLL, id, 'daily', 'recorded', (_cur, c) => this.payload(u, dto, c, null));
    return this.get(u, id);
  }
  async update(u: AuthUser, id: string, dto: UpdateDailyDto) {
    this.assert(u, COLL, 'edit'); this.guardWages(u, dto);
    // Object.assign(existing, payload): المفاتيح التانية (ومنها قرار المراجعة) بتفضل
    await this.write(u, COLL, id, 'daily', 'updated', (cur, c) => ({ ...cur!.data, ...this.payload(u, dto, c, cur!.data) }), dto.rev);
    return this.get(u, id);
  }
  async remove(u: AuthUser, id: string, rev: number) {
    this.assert(u, COLL, 'delete');
    await this.write(u, COLL, id, 'daily', 'deleted', () => null, rev);
    return { id, deleted: true };
  }
  /** قرار المراجعة (DEC-0133): بصلاحية «تعديل» على المستحقات، وللسجلات المعلّمة بس، والإلغاء بسبب */
  async decide(u: AuthUser, id: string, dto: ReviewDto) {
    if (!hasPagePermission(u.permissions, 'workerDues', 'edit')) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: '🔒 قرار المراجعة لصاحب «تعديل» على المستحقات' });
    if (dto.decision === 'void' && !String(dto.reason || '').trim()) throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: 'سبب الإلغاء مطلوب' });
    await this.write(u, COLL, id, 'daily', 'reviewed', (cur, c) => {
      const all = c.rows.map((r) => ({ ...r.data, id: r.id }) as J);
      if (!flagsOf(all, c.people).has(id)) throw new ConflictException({ statusCode: 409, code: 'NOT_FLAGGED', message: 'اليومية مش في قايمة المراجعة' });
      return { ...cur!.data, reviewDecision: dto.decision, reviewReason: String(dto.reason || '').trim(), reviewedBy: u.username || u.id, reviewedAt: new Date().toISOString() };
    }, dto.rev);
    return this.get(u, id);
  }

  // ---------------- حضور الموظفين
  async attList(u: AuthUser, q: AttQuery) {
    this.assert(u, ATT, 'view');
    const [rows, emps, deps] = await Promise.all([this.repo.rows(ATT), this.repo.rows('employees'), this.repo.rows('departments')]);
    const employees = emps.map((r) => ({ ...r.data, id: r.id }) as J);
    const list = filterAttendance(rows.map((r) => ({ ...r.data, id: r.id, _rev: r.rev })), employees, q);
    const name = (id: string) => { const e = employees.find((x) => x.id === id); return e ? e.name || e.code || id : '—'; };
    const label = (s: string) => (ATTENDANCE_STATUS.find((x) => x.code === s) || { label: '' }).label;
    const dl = deps.map((r) => ({ ...r.data, id: r.id }) as J).filter((d) => !d.kind || d.kind === 'employees' || d.kind === 'all').sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar', { sensitivity: 'base' }));
    return {
      source: await this.repo.source(ATT),
      cards: { total: list.length, present: list.filter((a) => a.status === 'present').length, absent: list.filter((a) => a.status === 'absent').length, late: list.filter((a) => a.status === 'late').length, half: list.filter((a) => a.status === 'half').length },
      rows: list.map(({ _rev, ...a }) => ({ ...a, rev: _rev, employeeName: name(a.employeeId), statusLabel: label(a.status) })),
      options: { departments: dl.map((d) => ({ id: d.id, name: d.name })), statuses: ATTENDANCE_STATUS,
        employees: employees.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar', { sensitivity: 'base' })).map((e) => ({ id: e.id, name: e.name || '', code: e.code || '', departmentId: e.departmentId || '' })) },
    };
  }
  async attGet(u: AuthUser, id: string) {
    this.assert(u, ATT, 'view');
    const r = (await this.repo.rows(ATT)).find((x) => x.id === id);
    if (!r) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'السجل غير موجود' });
    return { ...r.data, id, rev: r.rev };
  }
  private attForm(dto: SaveAttDto) { const p = attendancePayload(dto); if (typeof p === 'string') throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: p }); return p; }
  async attCreate(u: AuthUser, dto: SaveAttDto) { this.assert(u, ATT, 'add'); const id = uid(); const p = this.attForm(dto); await this.write(u, ATT, id, 'attendance', 'recorded', () => p); return this.attGet(u, id); }
  async attUpdate(u: AuthUser, id: string, dto: UpdateAttDto) { this.assert(u, ATT, 'edit'); const p = this.attForm(dto); await this.write(u, ATT, id, 'attendance', 'updated', (cur) => ({ ...cur!.data, ...p }), dto.rev); return this.attGet(u, id); }
  async attRemove(u: AuthUser, id: string, rev: number) { this.assert(u, ATT, 'delete'); await this.write(u, ATT, id, 'attendance', 'deleted', () => null, rev); return { id, deleted: true }; }
}
