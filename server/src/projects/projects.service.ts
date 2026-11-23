import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import { Money } from '../common/money';
import type { RecordChangeDto } from '../data/data.dto';
import { DataService } from '../data/data.service';
import { canRead, canWrite, inProjectScope } from '../data/policy';
import { cairoTodayIso } from '../parties/parties.service';
import {
  byNameAr, CLIENT_LISTS, filterProjects, firstStageLabel, HR_RENAME, Hr, J, LINK_SOURCES, linkAll, nextCode, normalizeProjectStatus, normName, onStatusChanged,
  MEMBER_STORES, projectCards, projectNotesIssues, projectStages, renameClientRefs, renameCustomerRefs, resourcesOnProject, stageBadge, stampMembership, toInt, unmatchedReport, WfCtx,
} from './project-rules';
import { ListProjectsQuery, SaveProjectDto, UpdateProjectDto } from './projects.dto';
import { ProjectsRepository } from './projects.repository';

const COLL = 'projects';
const s = (v: unknown) => (v == null ? '' : String(v));
interface Rec { id: string; data: J; rev: number }
const HR_COLLS = ['workers', 'equipment', 'drivers', 'employees', 'supervisors'];
const LINK_COLLS = [...new Set(LINK_SOURCES.map(([c]) => c))];
const CLIENT_COLLS = CLIENT_LISTS.map((k) => `clients.${k}`);

/**
 * المشروعات (7.4.4، DEC-0117) — طبقة الأعمال. القواعد كلها منقولة من الواجهة القديمة في project-rules.ts.
 *  - القايمة والفلاتر والكروت والموارد زي renderProjectsPage، ومن غير التكلفة (F-12، د-6).
 *  - الإضافة والتعديل بنفس تحقق نافذة المشروع، والكتابة كلها في **معاملة واحدة** عن طريق DataService.sync (نفس صلاحيات الواجهة القديمة:
 *    لو المستخدم مالوش يكتب في مجموعة من اللي بيتنشر فيها الاسم، مفيش حاجة بتتحفظ — زي حفظ الواجهة القديمة في وضع الويب).
 *  - تغيير الاسم بيتنشر زي القديم (د-2)، وتغيير المرحلة بيحرّك موضع المسار (د-1)، وحدث `project.saved` (من غير قيود).
 *  - الحذف ومسار المشروع التفاعلي وكشف المشروع في الواجهة القديمة (د-1، د-3، د-6).
 */
@Injectable()
export class ProjectsService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly data: DataService, private readonly repo: ProjectsRepository) {}

  private all(c: string, qr?: QueryRunner): Promise<Rec[]> {
    return (qr ?? this.ds).query(`SELECT id, data, rev FROM legacy_records WHERE collection = $1 AND deleted_at IS NULL ORDER BY created_at, id`, [c]);
  }
  private many(cs: string[], qr?: QueryRunner): Promise<Record<string, Rec[]>> {
    return Promise.all(cs.map((c) => this.all(c, qr))).then((xs) => Object.fromEntries(cs.map((c, i) => [c, xs[i]])));
  }
  private async settingsWorkflow(qr?: QueryRunner): Promise<unknown> {
    const [r] = await (qr ?? this.ds).query(`SELECT data FROM docs WHERE key = 'clients.settings'`);
    return r?.data && typeof r.data === 'object' ? (r.data as J).projectWorkflow : null;
  }
  private ctx(u: AuthUser, settingsWorkflow: unknown): WfCtx {
    return { settingsWorkflow, today: cairoTodayIso(), nowIso: new Date().toISOString(), userName: u.name || u.username || '', uid: () => `id_${Date.now().toString(36)}${randomBytes(4).toString('hex').slice(0, 7)}` };
  }
  private assert(u: AuthUser, action: 'view' | 'add' | 'edit') {
    const ok = action === 'view' ? canRead(u, COLL) : hasPagePermission(u.permissions, COLL, action);
    if (!ok) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: action === 'view' ? 'ليس لديك صلاحية على المشروعات' : action === 'add' ? '🔒 ماعندكش صلاحية إضافة مشروعات' : '🔒 ماعندكش صلاحية تعديل المشروعات' });
  }
  private visible(u: AuthUser, rows: Rec[]) { return rows.filter((r) => inProjectScope(u, COLL, { ...r.data, id: r.id })); }
  private hr(x: Record<string, Rec[]>): Hr {
    const m = (c: string) => (x[c] ?? []).map((r) => ({ ...r.data, id: r.id }));
    return { workers: m('workers'), equipment: m('equipment'), drivers: m('drivers'), employees: m('employees'), supervisors: m('supervisors') };
  }

  async list(u: AuthUser, q: ListProjectsQuery) {
    this.assert(u, 'view');
    const [rows, x, wfRaw] = await Promise.all([this.all(COLL), this.many(HR_COLLS), this.settingsWorkflow()]);
    const c = this.ctx(u, wfRaw);
    const vis = this.visible(u, rows);
    const revs = new Map(vis.map((r) => [r.id, r.rev]));
    const all: J[] = vis.map((r) => ({ ...r.data, id: r.id }));
    const d = this.hr(x);
    const list = filterProjects(all, q, d, c);
    // خيارات فلتر العميل جوه القسم: من مشاريع القسم (custOpts)
    const sec = q.status ? all.filter((p) => normalizeProjectStatus(p, c) === q.status) : all;
    const seen = new Set<string>();
    const custOpts: { value: string; label: string }[] = [];
    for (const p of sec) { const k = p.customerId || p.customerName || p.customer || ''; if (!k || seen.has(k)) continue; seen.add(k); custOpts.push({ value: k, label: p.customerName || p.customer || k }); }
    return {
      source: await this.repo.source(), stages: projectStages(c), cards: projectCards(all, q, list.length, c), customers: custOpts.sort((a, b) => a.label.localeCompare(b.label, 'ar')),
      rows: list.map((p) => {
        const r = resourcesOnProject(p.name, d);
        const stage = normalizeProjectStatus(p, c);
        return { ...p, rev: revs.get(p.id) ?? 0, stage, badge: stageBadge(stage), shownValue: toInt(p.value || p.budget),
          resources: { supervisors: r.supervisors.length, workers: r.workers.length, equipment: r.equipment.length }, issues: projectNotesIssues(p, c) };
      }),
    };
  }

  async get(u: AuthUser, id: string) {
    this.assert(u, 'view');
    const [r, wfRaw] = await Promise.all([this.repo.findById(id), this.settingsWorkflow()]);
    // خارج النطاق = 404 (مانكشفش إن المشروع موجود)
    if (!r || !inProjectScope(u, COLL, { ...r.data, id: r.id })) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'المشروع غير موجود' });
    const c = this.ctx(u, wfRaw);
    const p = { ...r.data, id: r.id };
    const events = await this.ds.query(`SELECT event_type AS type, idempotency_key AS key FROM integration_events WHERE aggregate_type = 'project' AND aggregate_id = $1 ORDER BY seq`, [id]);
    return { ...p, rev: r.rev, stage: normalizeProjectStatus(p, c), events };
  }

  /** خيارات النافذة: العملاء (clCustomers)، والمشرفين (entityComboHtml 'supervisor')، والمراحل، والكود الجاي */
  async formOptions(u: AuthUser, editId?: string) {
    this.assert(u, 'view');
    const [rows, custs, sups, wfRaw] = await Promise.all([this.all(COLL), this.all('clients.customers'), this.all('supervisors'), this.settingsWorkflow()]);
    const c = this.ctx(u, wfRaw);
    const p = editId ? rows.find((r) => r.id === editId) : undefined;
    const stages = projectStages(c);
    const cur = p ? normalizeProjectStatus(p.data, c) : firstStageLabel(c);
    // مرحلة من مسار قديم/معدّل: ما نغيّرهاش بالغلط
    if (!stages.some((x) => x.value === cur)) stages.unshift({ value: cur, short: cur });
    return {
      stages, current: cur, nextCode: nextCode('PRJ-', rows.map((r) => r.data)),
      customers: custs.map((x) => ({ id: x.id, code: s(x.data.code), name: s(x.data.name) })),
      supervisors: byNameAr(sups.map((x) => ({ id: x.id, code: s(x.data.code), name: s(x.data.name) })), (e) => e.name || e.code || ''),
    };
  }

  /** نفس تحقق وحساب زرار الحفظ القديم (btnSavePr) — بيرجّع الـ payload */
  private payload(dto: SaveProjectDto, p: J | null, all: Rec[], custs: Rec[], c: WfCtx): J {
    const name = s(dto.name).trim();
    if (!name) throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: 'اسم المشروع مطلوب' });
    const hasCustomers = custs.length > 0;
    const cid = hasCustomers ? s(dto.customerId) : '';
    const cv = hasCustomers ? cid : s(dto.customerName).trim();
    if (!cv && (!p || p.customerId || p.customerName || p.customer)) throw new BadRequestException({ statusCode: 400, code: 'CUSTOMER_REQUIRED', message: 'حدد العميل أولاً — لا يمكن إضافة مشروع بدون عميل' });
    const cust = cid ? custs.find((x) => x.id === cid) : undefined;
    if (cid && !cust) throw new BadRequestException({ statusCode: 400, code: 'UNKNOWN_CUSTOMER', message: 'العميل غير موجود' });
    // clCustomerName للمختار، وإلا الخانة النصّية (فاضية لما القايمة موجودة)
    const custName = cust ? s(cust.data.name || cust.data.code || cid) : hasCustomers ? '' : cv;
    const value = toInt(dto.value);
    const budget = toInt(dto.budget);
    const pr = s(dto.progress);
    const status = s(dto.status) || firstStageLabel(c);
    const allowed = projectStages(c).map((x) => x.value);
    if (p) allowed.unshift(normalizeProjectStatus(p, c));
    if (!allowed.includes(status)) throw new BadRequestException({ statusCode: 400, code: 'BAD_STAGE', message: 'المرحلة غير موجودة في المسار' });
    const out: J = {
      attachments: (p && p.attachments) || [],
      code: s(dto.code).trim() || nextCode('PRJ-', all.map((r) => r.data)),
      name, customerId: hasCustomers ? cid : (p && p.customerId) || '', customerName: custName, customer: custName,
      contractNo: s(dto.contractNo).trim(), value, budget: budget || value, start: s(dto.start), end: s(dto.end),
      progress: pr === '' ? null : Math.min(100, Math.max(0, toInt(pr))), status, supervisorId: s(dto.supervisorId), assignedTo: s(dto.assignedTo).trim(), notes: s(dto.notes).trim(),
      extraFields: (dto.extraFields ?? []).map((x) => ({ label: s(x.label).trim(), value: s(x.value).trim() })).filter((x) => x.label),
    };
    const pid = p ? p.id : null;
    const dupName = all.find((x) => x.id !== pid && normName(x.data.name) === normName(name));
    if (dupName) throw new ConflictException({ statusCode: 409, code: 'DUPLICATE_NAME', message: `يوجد مشروع بنفس الاسم بالفعل (${s(dupName.data.code || dupName.data.name)})` });
    const dupCode = out.code && all.find((x) => x.id !== pid && x.data.code && s(x.data.code).trim() === s(out.code).trim());
    if (dupCode) throw new ConflictException({ statusCode: 409, code: 'DUPLICATE_CODE', message: `كود المشروع مستخدم بالفعل في: ${s(dupCode.data.name)}` });
    return out;
  }

  /** الفرق بين نسختين من سجل ← تغيير upsert بالحقول اللي اتغيّرت بس (المستوى الأول) */
  private diff(collection: string, r: Rec, after: J): RecordChangeDto | null {
    const set: J = {};
    for (const k of Object.keys(after)) if (k !== 'id' && JSON.stringify(after[k]) !== JSON.stringify(r.data[k])) set[k] = after[k];
    return Object.keys(set).length ? ({ collection, id: r.id, op: 'upsert', baseRev: r.rev, set } as RecordChangeDto) : null;
  }

  /**
   * التغييرات اللي بترجع من before بتتعامل في DataService كتغييرات نظام (من غير فحص صلاحيات) — فهنا بنفحصها بنفس قواعد /api/sync:
   * صلاحية الكتابة على كل مجموعة ونطاق المشروع. أي رفض = 403 ومفيش حاجة بتتحفظ (زي حفظ الواجهة القديمة في وضع الويب).
   */
  private authorize(u: AuthUser, changes: RecordChangeDto[], current: Map<string, J>) {
    const forbidden: { collection: string; id: string; reason: string }[] = [];
    for (const ch of changes) {
      const cur = current.get(`${ch.collection}\u0000${ch.id}`);
      if (!canWrite(u, ch.collection, cur ? 'edit' : 'add')) { forbidden.push({ collection: ch.collection, id: ch.id, reason: 'FORBIDDEN' }); continue; }
      if (!inProjectScope(u, ch.collection, { ...(cur ?? {}), ...(ch.set ?? {}), id: ch.id })) forbidden.push({ collection: ch.collection, id: ch.id, reason: 'OUT_OF_PROJECT_SCOPE' });
    }
    if (forbidden.length) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'مالكش صلاحية لبعض التعديلات — مفيش حاجة اتحفظت', details: forbidden.slice(0, 50) });
  }

  async create(u: AuthUser, dto: SaveProjectDto) {
    this.assert(u, 'add');
    const id = `id_${Date.now().toString(36)}${randomBytes(4).toString('hex').slice(0, 7)}`;
    let saved: J = {};
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const [all, custs, sups, wfRaw] = await Promise.all([this.all(COLL, qr), this.all('clients.customers', qr), this.all('supervisors', qr), this.settingsWorkflow(qr)]);
        const c = this.ctx(u, wfRaw);
        saved = { ...this.payload(dto, null, all, custs, c), id };
        const changes: RecordChangeDto[] = [];
        const sup = saved.supervisorId ? sups.find((x) => x.id === saved.supervisorId) : undefined;
        if (sup) { const nx: J = { ...sup.data, project: saved.name }; stampMembership(sup.data, nx, c.today); const ch = this.diff('supervisors', sup, nx); if (ch) changes.push(ch); }
        changes.push({ collection: COLL, id, op: 'upsert', baseRev: 0, set: saved } as RecordChangeDto);
        this.authorize(u, changes, new Map(sups.map((x) => [`supervisors\u0000${x.id}`, x.data])));
        return changes;
      },
      after: async (qr, res) => {
        if (res.conflicts.length) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'تعذّر الحفظ — حدّث الصفحة', reason: res.conflicts[0].reason });
        await this.event(qr, u, id, 'created', saved, { renamed: 0, stageMoved: false });
      },
    });
    return this.get(u, id);
  }

  /** تعديل المشروع زي زرار الحفظ القديم: projLinkAll قبل وبعد، والمسار، ونشر الاسم على سجلات العميل والموارد، والمشرف */
  async update(u: AuthUser, id: string, dto: UpdateProjectDto) {
    this.assert(u, 'edit');
    let saved: J = {}, renamed = 0, moved = false;
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const [all, custs, wfRaw, links, clients] = await Promise.all([this.all(COLL, qr), this.all('clients.customers', qr), this.settingsWorkflow(qr), this.many(LINK_COLLS, qr), this.many(CLIENT_COLLS, qr)]);
        const cur = all.find((r) => r.id === id);
        if (!cur || !inProjectScope(u, COLL, { ...cur.data, id })) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'المشروع غير موجود' });
        if (cur.rev !== dto.rev) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'المشروع اتعدّل من مستخدم تاني — حدّث الصفحة' });
        const c = this.ctx(u, wfRaw);
        // نسخ قابلة للتعديل (القواعد بتعدّل في مكانها زي القديم)، ونقارن بعدين بالأصل
        const clone = (xs: Rec[]) => xs.map((r) => ({ ...JSON.parse(JSON.stringify(r.data)), id: r.id }));
        const projects = clone(all);
        const p = projects.find((x) => x.id === id) as J;
        const src: Record<string, J[]> = Object.fromEntries(LINK_COLLS.map((k) => [k, clone(links[k])]));
        const payload = this.payload(dto, { ...cur.data, id }, all, custs, c);
        const oldName = s(p.name);
        const oldStatus = normalizeProjectStatus(p, c);
        if (payload.supervisorId) { const sup = src.supervisors.find((x) => x.id === payload.supervisorId); if (sup) sup.project = payload.name; }
        linkAll(projects, src);
        Object.assign(p, payload);
        linkAll(projects, src);
        if (oldStatus !== payload.status) moved = onStatusChanged(p, payload.status, c);
        const custClone = clone(custs);
        const cl: Record<string, J[]> = Object.fromEntries(CLIENT_LISTS.map((k) => [k, clone(clients[`clients.${k}`])]));
        if (oldName && oldName !== payload.name) {
          renameCustomerRefs(p, oldName, payload.name, custClone);
          renameClientRefs(p, oldName, payload.name, cl, new Map(custs.map((x) => [x.id, { ...x.data, id: x.id }])));
          for (const k of HR_RENAME) for (const r of src[k]) if (s(r.project).trim() === oldName) r.project = payload.name;
        }
        saved = p;
        const changes: RecordChangeDto[] = [];
        const push = (coll: string, orig: Rec[], now: J[]) => { orig.forEach((r, i) => { const ch = this.diff(coll, r, now[i]); if (ch) changes.push(ch); }); };
        push(COLL, all, projects);
        // تاريخ الانضمام للمشروع بيتختم مع الحفظ زي القديم (stampProjectMembership)
        for (const k of MEMBER_STORES) links[k].forEach((r, i) => stampMembership(r.data, src[k][i], c.today));
        for (const k of LINK_COLLS) push(k, links[k], src[k]);
        push('clients.customers', custs, custClone);
        for (const k of CLIENT_LISTS) push(`clients.${k}`, clients[`clients.${k}`], cl[k]);
        renamed = changes.filter((ch) => ch.collection !== COLL).length;
        const current = new Map<string, J>();
        const idx = (coll: string, xs: Rec[]) => xs.forEach((r) => current.set(`${coll}\u0000${r.id}`, r.data));
        idx(COLL, all); idx('clients.customers', custs);
        for (const k of LINK_COLLS) idx(k, links[k]);
        for (const k of CLIENT_LISTS) idx(`clients.${k}`, clients[`clients.${k}`]);
        this.authorize(u, changes, current);
        return changes;
      },
      after: async (qr, res) => {
        const own = res.applied.find((a) => a.collection === COLL && a.id === id);
        if (res.conflicts.length || (own && own.overwrote?.length)) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'المشروع أو سجل مربوط بيه اتعدّل من مستخدم تاني — حدّث الصفحة' });
        await this.event(qr, u, id, 'updated', saved, { renamed, stageMoved: moved });
      },
    });
    return { ...(await this.get(u, id)), propagated: renamed, stageMoved: moved };
  }

  /** حدث project.saved (DEC-0104: صندوق integration_events، مرة واحدة لكل حفظ). مفيش قيود محاسبية */
  private async event(qr: QueryRunner, u: AuthUser, id: string, kind: 'created' | 'updated', p: J, extra: J) {
    const [{ n }] = await qr.query(`SELECT count(*)::int AS n FROM integration_events WHERE aggregate_type = 'project' AND aggregate_id = $1`, [id]);
    const payload = { kind, id, code: s(p.code), name: s(p.name), status: s(p.status), customerId: s(p.customerId), value: Money.fromNumberUnsafe(Number(p.value) || 0).toFixed(), budget: Money.fromNumberUnsafe(Number(p.budget) || 0).toFixed(), ...extra };
    await qr.query(`INSERT INTO integration_events (event_type, aggregate_type, aggregate_id, idempotency_key, payload, created_by) VALUES ('project.saved', 'project', $1, $2, $3::jsonb, $4)
      ON CONFLICT (idempotency_key) DO NOTHING`, [id, `project.saved:${id}:${n + 1}`, JSON.stringify(payload), u.id]);
  }

  /** الأسماء المكتوبة في سجلات ومالهاش مشروع (projUnmatchedReport، د-5): أعداد لكل مجموعة + الأسماء (للأدمن بس) */
  async unmatched() {
    const [rows, links] = await Promise.all([this.all(COLL), this.many(LINK_COLLS)]);
    const src = Object.fromEntries(LINK_COLLS.map((k) => [k, links[k].map((r) => ({ ...r.data, id: r.id }))]));
    const rep = unmatchedReport(rows.map((r) => ({ ...r.data, id: r.id })), src);
    return { projects: rows.length, distinctNames: Object.keys(rep.names).length, records: Object.values(rep.names).reduce((a, b) => a + b, 0), byCollection: rep.byCollection, names: rep.names };
  }

  /**
   * خطة ترحيل المشروعات (المرحلة 5، B-34/B-28) — **قراءة بس، مفيش أي كتابة**. بقت مكمّلة لـ `cutover projects dry-run`:
   * فروق تقريب الميزانية لو اتقرّبت لست خانات (للعلم — النقل نفسه بالقيمة القديمة بالظبط، DEC-0107)، والتعارضات، والربط بالاسم.
   */
  async migrationPlan() {
    const rows = await this.repo.legacyProjects();
    const items = rows.map((r) => {
      const d = r.data;
      const name = String(d.name ?? '').trim();
      const b = d.budget;
      let original: string | null = null, migrated: string | null = null, invalidBudget = false;
      if (typeof b === 'number' && Number.isFinite(b)) { original = Money.fromNumberUnsafe(b).toString(); migrated = Money.fromNumberUnsafe(b).round().toFixed(); }
      else if (typeof b === 'string' && b.trim()) { try { original = Money.of(b.replace(/,/g, '')).toString(); migrated = Money.of(original).round().toFixed(); } catch { invalidBudget = true; original = b; } }
      const negative = migrated != null && Money.of(migrated).isNegative();
      return { id: r.id, name, code: d.code == null || d.code === '' ? null : String(d.code), budget: { original, migrated, diff: original != null && migrated != null ? Money.of(migrated).minus(original).toString() : null, invalid: invalidBudget, negative } };
    });
    const dup = (key: (x: (typeof items)[number]) => string | null) => {
      const m = new Map<string, string[]>();
      for (const it of items) { const k = key(it); if (k) m.set(k, [...(m.get(k) ?? []), it.id]); }
      return [...m.entries()].filter(([, ids]) => ids.length > 1).map(([value, ids]) => ({ value, ids }));
    };
    const names = new Set(items.map((i) => i.name));
    const links = await this.repo.nameLinks();
    const blockers = { emptyName: items.filter((i) => !i.name).map((i) => i.id), duplicateNames: dup((i) => i.name || null), duplicateCodes: dup((i) => (i.code ? i.code.toLowerCase() : null)), invalidBudget: items.filter((i) => i.budget.invalid).map((i) => i.id), negativeBudget: items.filter((i) => i.budget.negative).map((i) => i.id) };
    return {
      dryRun: true, executed: false, relationalRowsNow: await this.repo.relationalCount(),
      projects: { count: items.length, roundingChanges: items.filter((i) => i.budget.diff && i.budget.diff !== '0').map((i) => ({ id: i.id, ...i.budget })), items },
      blockers, ready: Object.values(blockers).every((x) => x.length === 0),
      nameLinks: {
        byCollection: Object.values(links.reduce((acc: Record<string, { collection: string; records: number; nameOnly: number; matched: number; unmatchedNames: string[] }>, l) => {
          const a = (acc[l.collection] ??= { collection: l.collection, records: 0, nameOnly: 0, matched: 0, unmatchedNames: [] });
          a.records += l.records; a.nameOnly += l.records - l.with_id;
          if (names.has(l.name)) a.matched += l.records; else a.unmatchedNames.push(l.name);
          return acc;
        }, {})),
      },
    };
  }
}
