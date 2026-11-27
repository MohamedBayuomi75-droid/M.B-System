import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import { Money } from '../common/money';
import { smartMatch } from '../common/smart-search';
import { flagsOf } from '../dailies/dailies-rules';
import type { DocChangeDto, RecordChangeDto } from '../data/data.dto';
import { DataService } from '../data/data.service';
import { canRead } from '../data/policy';
import { cairoTodayIso } from '../parties/parties.service';
import {
  addItem, COMP_COST_COLS, compRows, CostCtx, costItemText, costLines, costPayload, COST_ITEM_DEFAULTS, COST_TABS, itemsUsed, itemSuggestions, J, KIND_LABEL, legacySummary, newSummary,
  personName, removeItem, renameItemChanges, sumAmounts, supplyLines, tableRows, toInt,
} from './cost-rules';
import { CostItemDto, CostSectionDto, CostTableQuery, ProjectCostOneQuery, ProjectCostQuery, SaveCostDto, UpdateCostDto } from './costs.dto';
import { CostsRepository, Row } from './costs.repository';

type QueryRunner = Parameters<NonNullable<NonNullable<Parameters<DataService['sync']>[2]>['before']>>[0];
type Em = QueryRunner['manager'];
const uid = () => `id_${Date.now().toString(36)}${randomBytes(4).toString('hex').slice(0, 7)}`;
const COLL = 'costs';
const fmtNum = (n: unknown) => toInt(n).toLocaleString('ar-EG', { maximumFractionDigits: 2 });
const flat = (xs: Row[]) => xs.map((r) => ({ ...r.data, id: r.id, _rev: r.rev }) as J);
const objOf = (v: unknown): J => (v && typeof v === 'object' && !Array.isArray(v) ? (v as J) : {});
const tabOf = (kind: string) => (COST_TABS.find((t) => t.kind === kind) || COST_TABS[0]).id;

/**
 * التكاليف وتكلفة المشروع (8.8.3، DEC-0142) — طبقة الأعمال. القواعد في cost-rules.ts، والمقارنة بالقديمة في tests-merge/phase90.js.
 *  - صفحة التكاليف: لوحات الفئات ← الأقسام ← الجدول بالفلاتر والكروت؛ الحفظ بالسطور (openCostModal)، والحذف، والأقسام، والبنود.
 *  - تكلفة المشروع بالحسابين: القديم (projectCostSummary بالظبط) والجديد (TR-10 + العمالة والمعدات بالحساب الجديد)، والشاملة، وعمود
 *    التكلفة وحالة الميزانية لصفحة المشاريع، وقايمة الأسماء الغير مسجّلة (DEC-0142 د-4).
 */
@Injectable()
export class CostsService {
  constructor(private readonly data: DataService, private readonly repo: CostsRepository) {}

  private assert(u: AuthUser, action: 'view' | 'add' | 'edit' | 'delete') {
    const ok = action === 'view' ? canRead(u, COLL) && hasPagePermission(u.permissions, COLL, 'view') : hasPagePermission(u.permissions, COLL, action);
    if (!ok) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: '🔒 ماعندكش صلاحية' });
  }
  /** تكلفة المشروع بتظهر في المشاريع والتكاليف والمصاريف (القديمة) */
  private assertCostView(u: AuthUser) {
    if (!['projects', 'costs', 'expenses'].some((p) => hasPagePermission(u.permissions, p, 'view'))) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: '🔒 ماعندكش صلاحية' });
  }
  private async people(em?: Em) {
    const [w, s, d, e, q] = await Promise.all(['workers', 'supervisors', 'drivers', 'employees', 'equipment'].map((n) => this.repo.rows(n, em)));
    return { worker: flat(w), supervisor: flat(s), driver: flat(d), employee: flat(e), equipment: flat(q) };
  }
  /** كل مدخلات projectCostSummary */
  async costCtx(em?: Em): Promise<CostCtx> {
    const names = ['projects', 'workerAttendance', 'equipmentDaily', 'fuelLogs', 'equipmentLogs', 'projectDaily', 'expenses', COLL, 'ledger.invoices', 'ledger.suppliers', 'warehouses.movements', 'warehouses.items', 'clients.invoices', 'clients.customers'];
    const [r, p, settings] = await Promise.all([Promise.all(names.map((n) => this.repo.rows(n, em))), this.people(em), this.repo.doc('settings', em)]);
    const [projects, att, eqd, fuel, eqLogs, pDaily, exps, costs, invs, sups, mvs, items, cInv, custs] = r.map(flat);
    const st = objOf(settings?.data);
    const people = { worker: p.worker, supervisor: p.supervisor, driver: p.driver };
    return {
      projects, people, employees: p.employee, equipment: p.equipment, att, flags: flagsOf(att, people), eqDaily: eqd, fuelLogs: fuel, equipmentLogs: eqLogs, projectDaily: pDaily, expenses: exps, costs,
      invoices: invs, suppliers: sups, movements: mvs, items, clientInvoices: [...cInv, ...custs.flatMap((c) => (Array.isArray(c.invoices) ? c.invoices : []))],
      idlePercent: st.equipmentIdlePercent !== undefined && Number(st.equipmentIdlePercent) >= 0 ? Number(st.equipmentIdlePercent) : 50,
    };
  }

  // ---------------- تكلفة المشروع
  /** «تكلفة المشاريع الشاملة» (comprehensiveCostsPageHtml) بالحسابين */
  async comprehensive(u: AuthUser, q: ProjectCostQuery) {
    this.assertCostView(u);
    const c = await this.costCtx();
    const rows = compRows(c, (q.q || '').trim(), q.from || '', q.to || '', smartMatch).sort((a, b) => Number(b.new.total) - Number(a.new.total) || b.legacy.total - a.legacy.total);
    const tot = (pick: (r: (typeof rows)[number]) => string | number) => Money.sum(rows.map((r) => String(pick(r))).concat(['0'])).toFixed().replace(/\.?0+$/, '') || '0';
    const legacyTot: J = { total: 0, collected: 0 }; COMP_COST_COLS.forEach(([k]) => (legacyTot[k] = 0));
    rows.forEach((r) => { COMP_COST_COLS.forEach(([k]) => (legacyTot[k] += (r.legacy as unknown as J)[k] || 0)); legacyTot.total += r.legacy.total; legacyTot.collected += r.collected; });
    const newTot: J = Object.fromEntries([...COMP_COST_COLS.map(([k]) => [k, tot((r) => (r.new as unknown as J)[k])]), ['total', tot((r) => r.new.total)], ['collected', tot((r) => r.collected)]]);
    return {
      cols: COMP_COST_COLS.map(([key, label]) => ({ key, label })), rows, totals: { legacy: legacyTot, new: newTot },
      unregistered: rows.filter((r) => !r.registered).map((r) => r.name), pendingDailies: rows.reduce((acc, r) => acc + r.new.pendingDailies, 0),
    };
  }
  /** تكلفة مشروع واحد (صفحة المشروع وكشفه) بالحسابين وبنود الموردين والمخازن */
  async one(u: AuthUser, q: ProjectCostOneQuery) {
    this.assertCostView(u);
    const c = await this.costCtx();
    return { name: q.name, legacy: legacySummary(c, q.name, q.from, q.to), new: newSummary(c, q.name, q.from, q.to), supplyLines: { legacy: supplyLines(c, q.name, q.from, q.to), new: supplyLines(c, q.name, q.from, q.to, 'new') } };
  }
  /** عمود التكلفة وحالة الميزانية لكل مشروع مسجّل (renderProjectsPage) */
  async byProject(u: AuthUser) {
    this.assertCostView(u);
    const c = await this.costCtx();
    return Object.fromEntries(c.projects.filter((p) => p && p.name).map((p) => { const L = legacySummary(c, p.name), N = newSummary(c, p.name);
      return [p.id, { name: p.name, legacyTotal: L.total, legacyStatus: L.budgetStatus, total: N.total, budgetStatus: N.budgetStatus }]; }));
  }

  // ---------------- صفحة التكاليف
  async boards(u: AuthUser) {
    this.assert(u, 'view');
    const c = await this.costCtx();
    const rows = compRows(c, '', '', '', smartMatch);
    return {
      kinds: COST_TABS.map((t) => { const items = c.costs.filter((x) => x && x.personKind === t.kind); return { id: t.id, label: t.label, icon: t.icon, count: items.length, total: sumAmounts(items) }; }),
      comprehensive: { total: Money.sum(rows.map((r) => r.new.total).concat(['0'])).toFixed().replace(/\.?0+$/, '') || '0', legacyTotal: rows.reduce((acc, r) => acc + r.legacy.total, 0) },
    };
  }
  async table(u: AuthUser, q: CostTableQuery) {
    this.assert(u, 'view');
    const tabDef = COST_TABS.find((t) => t.id === q.tab) || COST_TABS[0];
    const [rows, ppl, secDoc] = await Promise.all([this.repo.rows(COLL), this.people(), this.repo.doc('costSections')]);
    const costs = flat(rows);
    const sections: string[] = Array.isArray(objOf(secDoc?.data)[tabDef.id]) ? objOf(secDoc?.data)[tabDef.id] : [];
    const all = costs.filter((x) => x && x.personKind === tabDef.kind);
    const name = (x: J) => personName(x, ppl), text = (x: J) => costItemText(x, fmtNum);
    const sectionBoards = [{ id: '', name: 'الكل', all: true, count: all.length, total: sumAmounts(all) }, ...sections.map((sName) => { const it = all.filter((x) => (x.section || '') === sName); return { id: sName, name: sName, all: false, count: it.length, total: sumAmounts(it) }; })];
    const list = tableRows(costs, tabDef.kind, q.section || '', q, name, text, smartMatch);
    return {
      tab: tabDef.id, label: tabDef.label, kind: tabDef.kind, sections: sectionBoards, items: itemsUsed(costs),
      cards: { count: list.length, total: sumAmounts(list) },
      rows: list.map((x) => ({ id: x.id, rev: x._rev, date: x.date || '', name: name(x), itemText: text(x), section: x.section || '', project: x.project || '', notes: x.notes || '', amount: toInt(x.amount), personKind: x.personKind, personId: x.personId, kindLabel: KIND_LABEL[x.personKind] || '' })),
    };
  }
  async formOptions(u: AuthUser) {
    this.assert(u, 'view');
    const [rows, ppl, secDoc, pools, hidden, projects] = await Promise.all([this.repo.rows(COLL), this.people(), this.repo.doc('costSections'), this.repo.doc('costItemPools'), this.repo.doc('costItemHidden'), this.repo.rows('projects')]);
    const costs = flat(rows);
    const byName = (xs: J[]) => xs.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar', { sensitivity: 'base' }));
    return {
      today: cairoTodayIso(),
      people: Object.fromEntries(Object.entries(ppl).map(([k, xs]) => [k, byName(xs).map((p) => ({ id: p.id, code: p.code || '', name: p.name || '' }))])),
      sections: Object.fromEntries(COST_TABS.map((t) => [t.id, Array.isArray(objOf(secDoc?.data)[t.id]) ? objOf(secDoc?.data)[t.id] : []])),
      suggestions: Object.fromEntries(COST_TABS.map((t) => [t.kind, itemSuggestions(costs, objOf(pools?.data), objOf(hidden?.data), t.kind)])),
      defaults: COST_ITEM_DEFAULTS, projects: byName(flat(projects)).map((p) => p.name).filter(Boolean),
    };
  }
  async get(u: AuthUser, id: string) {
    this.assert(u, 'view');
    const r = (await this.repo.rows(COLL)).find((x) => x.id === id);
    if (!r) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'التكلفة غير موجودة' });
    return { ...r.data, id: r.id, rev: r.rev, lines: costLines(r.data) };
  }
  private diff(r: Row | undefined, after: J, id: string): RecordChangeDto | null {
    if (!r) { const { id: _i, ...set } = after; void _i; return { collection: COLL, id, op: 'upsert', baseRev: 0, set: { id, ...set } } as RecordChangeDto; }
    const set: J = {};
    for (const k of Object.keys(after)) if (k !== 'id' && JSON.stringify(after[k]) !== JSON.stringify(r.data[k])) set[k] = after[k];
    return Object.keys(set).length ? ({ collection: COLL, id: r.id, op: 'upsert', baseRev: r.rev, set } as RecordChangeDto) : null;
  }
  /** btnSaveCost: Object.assign على السجل القديم، والبنود الجديدة في القايمة (saveCostItemSuggestion) */
  private async write(u: AuthUser, id: string, dto: SaveCostDto | null, rev?: number) {
    let saved: J = {};
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const em = qr.manager;
        const [rows, pools, hidden] = await Promise.all([this.repo.rows(COLL, em), this.repo.doc('costItemPools', em), this.repo.doc('costItemHidden', em)]);
        const cur = rows.find((r) => r.id === id);
        if (rev != null) {
          if (!cur) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'التكلفة غير موجودة' });
          if (cur.rev !== rev) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'التكلفة اتعدّلت من مستخدم تاني — حدّث الصفحة' });
        }
        if (!dto) { saved = { ...cur!.data, id }; return { records: [{ collection: COLL, id, op: 'delete', baseRev: cur!.rev } as RecordChangeDto] }; }
        const res = costPayload({ ...dto, extraFields: cur && Array.isArray(cur.data.extraFields) ? cur.data.extraFields : [] });
        if (typeof res === 'string') throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: res });
        const now = new Date().toISOString();
        const rec: J = cur ? { ...cur.data, ...res, id, createdAt: cur.data.createdAt || now, updatedAt: now } : { id, ...res, createdAt: now, updatedAt: now };
        saved = rec;
        const changes: RecordChangeDto[] = []; const own = this.diff(cur, rec, id); if (own) changes.push(own);
        let P = objOf(pools?.data), H = objOf(hidden?.data); let touched = false;
        for (const l of res.lines as { item: string }[]) if (l.item) { const r = addItem(P, H, res.personKind, l.item); if (JSON.stringify(r.pools) !== JSON.stringify(P[res.personKind] || []) || JSON.stringify(r.hidden) !== JSON.stringify(H[res.personKind] || [])) touched = true; P = { ...P, [res.personKind]: r.pools }; H = { ...H, [res.personKind]: r.hidden }; }
        const docs: DocChangeDto[] = touched ? [{ key: 'costItemPools', baseRev: pools?.rev ?? 0, op: 'set', value: P } as DocChangeDto, { key: 'costItemHidden', baseRev: hidden?.rev ?? 0, op: 'set', value: H } as DocChangeDto] : [];
        return { records: changes, docs };
      },
      after: async (qr, res) => {
        const mine = res.applied.find((a) => a.collection === COLL && a.id === id);
        if (res.conflicts.length || (mine && mine.overwrote?.length)) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'التكلفة اتعدّلت من مستخدم تاني — حدّث الصفحة' });
        await this.repo.addEvent(qr.manager, dto ? 'saved' : 'deleted', id, { kind: !dto ? 'deleted' : rev == null ? 'created' : 'updated', id, personKind: saved.personKind, personId: saved.personId, amount: toInt(saved.amount), project: saved.project || '' }, u.id);
      },
    });
    return saved;
  }
  async create(u: AuthUser, dto: SaveCostDto) { this.assert(u, 'add'); const id = uid(); await this.write(u, id, dto); return this.get(u, id); }
  async update(u: AuthUser, id: string, dto: UpdateCostDto) { this.assert(u, 'edit'); await this.write(u, id, dto, dto.rev); return this.get(u, id); }
  async remove(u: AuthUser, id: string, rev: number) { this.assert(u, 'delete'); await this.write(u, id, null, rev); return { id, deleted: true }; }

  /** الأقسام (btnCostAddSec / btnCostRenSec / btnCostDelSec): القايمة في costSections، والسجلات بتتغيّر مع تغيير الاسم والحذف */
  async section(u: AuthUser, dto: CostSectionDto) {
    this.assert(u, dto.op === 'delete' ? 'delete' : 'edit');
    const name = dto.name.trim(), to = String(dto.to || '').trim();
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const em = qr.manager;
        const [doc, rows] = await Promise.all([this.repo.doc('costSections', em), this.repo.rows(COLL, em)]);
        const all = objOf(doc?.data); const list: string[] = Array.isArray(all[dto.tab]) ? all[dto.tab].slice() : [];
        let next = list; const records: RecordChangeDto[] = [];
        if (dto.op === 'add') { if (!name) throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: 'أدخل الاسم' }); if (list.includes(name)) throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: 'موجود' }); next = [...list, name]; }
        else {
          if (dto.op === 'rename' && (!name || !to)) throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: 'أدخل الاسم' });
          next = dto.op === 'rename' ? list.map((x) => (x === name ? to : x)) : list.filter((x) => x !== name);
          // القديمة بتغيّر قسم كل التكاليف اللي بالاسم ده (مش بس الفئة)
          for (const r of rows) if (r.data.section === name) records.push({ collection: COLL, id: r.id, op: 'upsert', baseRev: r.rev, set: { section: dto.op === 'rename' ? to : '' } } as RecordChangeDto);
        }
        return { records, docs: [{ key: 'costSections', baseRev: doc?.rev ?? 0, op: 'set', value: { ...all, [dto.tab]: next } } as DocChangeDto] };
      },
    });
    return { tab: dto.tab, ok: true };
  }
  /** إدارة البنود (openCostItemsManager): إضافة، وتغيير اسم (بيغيّر السجلات)، وحذف من القايمة (السجلات زي ما هي) */
  async item(u: AuthUser, dto: CostItemDto) {
    this.assert(u, 'edit');
    const label = dto.label.trim(), to = String(dto.to || '').trim();
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const em = qr.manager;
        const [pools, hidden, rows] = await Promise.all([this.repo.doc('costItemPools', em), this.repo.doc('costItemHidden', em), this.repo.rows(COLL, em)]);
        const P = objOf(pools?.data), H = objOf(hidden?.data); let r = { pools: P[dto.kind] || [], hidden: H[dto.kind] || [] }; const records: RecordChangeDto[] = [];
        if (dto.op === 'add') r = addItem(P, H, dto.kind, label);
        else if (dto.op === 'remove') r = removeItem(P, H, dto.kind, label);
        else if (to && to !== label) {
          const a = removeItem(P, H, dto.kind, label); r = addItem({ [dto.kind]: a.pools }, { [dto.kind]: a.hidden }, dto.kind, to);
          const byId = new Map(rows.map((x) => [x.id, x]));
          for (const ch of renameItemChanges(flat(rows), dto.kind, label, to)) records.push({ collection: COLL, id: ch.id, op: 'upsert', baseRev: byId.get(ch.id)!.rev, set: ch.set } as RecordChangeDto);
        } else if (to) r = addItem(P, H, dto.kind, to);
        return { records, docs: [{ key: 'costItemPools', baseRev: pools?.rev ?? 0, op: 'set', value: { ...P, [dto.kind]: r.pools } } as DocChangeDto, { key: 'costItemHidden', baseRev: hidden?.rev ?? 0, op: 'set', value: { ...H, [dto.kind]: r.hidden } } as DocChangeDto] };
      },
    });
    return { kind: dto.kind, tab: tabOf(dto.kind), ok: true };
  }
}
