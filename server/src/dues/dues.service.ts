import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import { Money } from '../common/money';
import type { DocChangeDto, RecordChangeDto } from '../data/data.dto';
import { DataService } from '../data/data.service';
import { canRead } from '../data/policy';
import { flagsOf, toInt } from '../dailies/dailies-rules';
import { cairoTodayIso } from '../parties/parties.service';
import { CORE_DEPTS_OF, J } from '../workers/worker-rules';
import {
  configuredSalary, Ctx, employeeRow, laborRow, logTotals, logView, paymentsLog, PKind, smartMatch, supervisorRow, supervisorStatement, unpaidBonuses,
} from './dues-rules';
import { DuesQuery, ItemsDto, PayDto } from './dues.dto';
import { DuesRepository, Row } from './dues.repository';

type QueryRunner = Parameters<NonNullable<NonNullable<Parameters<DataService['sync']>[2]>['before']>>[0];
type Em = QueryRunner['manager'];
const uid = () => `id_${Date.now().toString(36)}${randomBytes(4).toString('hex').slice(0, 7)}`;
const PAGE = 'workerDues';
const PAYS = 'workerPayments', PENS = 'employeePenalties';
const BOARDS = [
  { id: 'employees', label: 'الموظفين', icon: '👔', kind: 'employee' as const }, { id: 'supervisors', label: 'المشرفون', icon: '👷', kind: 'supervisor' as const },
  { id: 'workers', label: 'العمال', icon: '🧑‍🔧', kind: 'worker' as const }, { id: 'drivers', label: 'السائقون', icon: '🧑‍🚒', kind: 'driver' as const },
  { id: 'equipment', label: 'المعدات والمركبات', icon: '🛻', kind: 'equipment' as const },
];
const TAB_KIND: Record<string, PKind> = { workers: 'worker', supervisors: 'supervisor', drivers: 'driver', employees: 'employee', equipment: 'equipment' };
const COLL_OF: Record<PKind, string> = { worker: 'workers', supervisor: 'supervisors', driver: 'drivers', employee: 'employees', equipment: 'equipment' };
/** البنود الافتراضية للنافذة (openUnifiedPayModal) */
const DEFAULT_POOLS: Record<string, { seed: string; items: string[] }> = {
  paymentItemPool: { seed: 'paymentItemPoolSeeded', items: ['مكافأة', 'بدل مواصلات', 'بدل إعاشة', 'حافز إنتاج', 'سلفة', 'بدل انتقال', 'بدل طبيعة عمل', 'بدل انتقالات', 'تصفية حساب', 'أخرى'] },
  dailyPayItemPool: { seed: 'dailyPayItemPoolSeeded', items: ['دفع يوميات', 'ساعات إضافية', 'حافز يومي', 'بدل انتقال', 'أخرى'] },
  penaltyItemPool: { seed: 'penaltyItemPoolSeeded', items: ['تأخير', 'غياب', 'مخالفة', 'إهمال', 'جزاء إداري', 'خصم سلفة', 'أخرى'] },
};
const fmtMoney = (n: number) => `${n.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م`;
const sumMoney = (xs: (string | number)[]) => Money.sum(xs.length ? xs.map(String) : ['0']).toFixed().replace(/\.?0+$/, '') || '0';
const deptOf = (p: J) => String(p.departmentId || p.categoryId || '').trim();
const noDept = (p: J, kind: PKind) => (kind === 'equipment' ? !String(p.licenseCategory || '').trim() : !String(p.position || p.job || p.jobTitle || p.skill || '').trim());

/**
 * المستحقات والصرف (8.6.3، DEC-0137) — طبقة الأعمال. القواعد في dues-rules.ts، والمقارنة بالقديمة في tests-merge/phase84.js.
 *  - اللوحات، والجدول لكل نوع (العمال والمشرفين والسواقين والموظفين؛ المعدات ← 8.7) بالكروت، وسجل الصرف والخصومات.
 *  - **المستحق والمتبقي بالحساب الجديد للأيام (DEC-0129)** ومعاهم القديم (تقرير الفرق).
 *  - الصرف بنفس سجلات نافذة القديمة (يومية، وراتب بسقف، ودفع الإضافات المستحقة، وبدلات ومكافآت مستحقة، وخصم، ونطاقات صرف المشرف)،
 *    و**الصرف فوق المتبقي سلفة بس (DEC-0132)**: بيترفض إلا بعلامة «سلفة»، وبيتسجّل مين وإمتى، والمتبقي السالب بيتخصم من المستحقات الجاية.
 *  - الحذف من السجل، وبنود الصرف والخصم.
 */
@Injectable()
export class DuesService {
  constructor(private readonly data: DataService, private readonly repo: DuesRepository) {}

  private async ctx(em?: Em): Promise<Ctx & { rows: { pays: Row[]; pens: Row[] } }> {
    const names = ['workers', 'supervisors', 'drivers', 'employees', 'equipment', 'workerAttendance', 'attendance', PAYS, PENS, 'costs', 'expenses', 'supervisorExpenses', 'equipmentDaily', 'payroll', 'departments'];
    const r = await Promise.all(names.map((n) => this.repo.rows(n, em)));
    const flat = (xs: Row[]) => xs.map((x) => ({ ...x.data, id: x.id, rev: x.rev }) as J);
    const [w, s, d, e, q, att, eAtt, pays, pens, costs, exps, supExp, eqd, payroll, deps] = r.map(flat);
    const settings = ((await this.repo.doc('settings', em))?.data || {}) as J;
    const people = { worker: w, supervisor: s, driver: d, employee: e, equipment: q };
    return { people, att, empAtt: eAtt, pays, empPens: pens, costs, expenses: exps, supExpenses: supExp, eqDaily: eqd, payroll, settings, departments: deps,
      flags: flagsOf(att, { worker: w, supervisor: s, driver: d }), rows: { pays: r[7], pens: r[8] } };
  }
  private assert(u: AuthUser, action: 'view' | 'add' | 'edit' | 'delete') {
    const ok = action === 'view' ? canRead(u, PAYS) && hasPagePermission(u.permissions, PAGE, 'view') : hasPagePermission(u.permissions, PAGE, action);
    if (!ok) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: '🔒 ماعندكش صلاحية' });
  }
  private nameOf(c: Ctx) {
    return (kind: string, id: string) => { const p = (c.people as Record<string, J[]>)[kind]?.find((x) => x.id === id); return p ? (kind === 'equipment' ? p.typeLabel || p.name || p.code || '' : p.name || '') : ''; };
  }
  /** departmentsForKind (helpers.js:3532) */
  private deptsFor(c: Ctx, kind: PKind) {
    const coll = COLL_OF[kind];
    const used = new Set(c.people[kind].map(deptOf).filter(Boolean));
    const matched = c.departments.filter((d) => d && (!d.kind || d.kind === 'all' || d.kind === coll || (Array.isArray(d.kinds) && d.kinds.includes(coll)) || used.has(d.id)));
    const core = (CORE_DEPTS_OF as Record<string, { id: string }[]>)[kind];
    if (!core) return matched.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar', { sensitivity: 'base' }));
    const order = core.map((x) => x.id);
    return matched.filter((d) => d.system && !d.jobDept).sort((a, b) => {
      const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
      const ra = ia < 0 ? (a.jobDept ? 50 : 99) : ia, rb = ib < 0 ? (b.jobDept ? 50 : 99) : ib;
      return ra - rb || String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
  }
  private listOf(c: Ctx, kind: PKind) {
    return kind === 'equipment' ? c.people.equipment.filter((e) => e.status !== 'sold' && e.status !== 'scrapped' && e.status !== 'retired') : c.people[kind];
  }

  async boards(u: AuthUser) {
    this.assert(u, 'view');
    const c = await this.ctx();
    return {
      kinds: BOARDS.map((b) => ({ id: b.id, label: b.label, icon: b.icon, count: this.listOf(c, b.kind).length, depts: this.deptsFor(c, b.kind).length })),
      depts: Object.fromEntries(BOARDS.map((b) => {
        const list = this.listOf(c, b.kind);
        return [b.id, [{ id: '', name: 'الكل', icon: '📂', count: list.length }, { id: '__none__', name: 'بدون قسم', icon: '📭', count: list.filter((p) => !deptOf(p)).length },
          ...this.deptsFor(c, b.kind).map((d) => ({ id: d.id, name: d.name || '', icon: '📁', count: list.filter((p) => deptOf(p) === String(d.id)).length }))]];
      })),
    };
  }

  /** المستوى 3 (renderWorkerDuesPage): الجدول، والكروت، وسجل الصرف والخصومات */
  async table(u: AuthUser, q: DuesQuery) {
    this.assert(u, 'view');
    const c = await this.ctx();
    const tab = q.tab || 'workers', kind = TAB_KIND[tab];
    const F = q.from || undefined, T = q.to || undefined, query = String(q.q || '').trim().toLowerCase();
    const byName = (xs: J[]) => xs.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar', { sensitivity: 'base' }));
    let list = byName(kind === 'driver' ? c.people.driver.filter((d) => d.status !== 'inactive') : c.people[kind]);
    const dept = q.dept;
    if (dept !== undefined && dept !== '') list = dept === '__none__' || dept === 'none' ? list.filter((p) => noDept(p, kind)) : list.filter((p) => deptOf(p) === dept);
    if (query) list = list.filter((p) => smartMatch(p.name, query) || smartMatch(p.code, query));
    const supName = (id: string) => { const s = c.people.supervisor.find((x) => x.id === id); return s ? s.name || '' : '—'; };
    const depName = (id: string) => { const d = c.departments.find((x) => x.id === id); return d ? d.name || '' : ''; };
    const rows = kind === 'supervisor' ? list.map((s) => supervisorRow(c, s, F, T))
      : kind === 'employee' ? list.map((e) => employeeRow(c, e, F, T, depName(e.departmentId)))
      : list.map((p) => laborRow(c, kind as 'worker' | 'driver', p, F, T, kind === 'worker' ? supName(p.supervisorId) : ''));
    const cards = kind === 'employee' ? null : {
      due: sumMoney(rows.map((r) => (kind === 'supervisor' ? r.totalDue : r.due))), paid: Math.round(rows.reduce((s, r) => s + r.paid, 0) * 100) / 100, bal: sumMoney(rows.map((r) => r.bal)),
      legacyDue: Math.round(rows.reduce((s, r) => s + (kind === 'supervisor' ? r.legacyTotalDue : r.legacyDue), 0) * 100) / 100, legacyBal: Math.round(rows.reduce((s, r) => s + r.legacyBal, 0) * 100) / 100,
    };
    let log = paymentsLog(c, kind, F, T, this.nameOf(c));
    if (query) log = log.filter((p) => smartMatch(p._name, query) || smartMatch(p.payCategory, query) || smartMatch(p.notes, query) || smartMatch(p.reason, query));
    const dn = dept === undefined ? '' : dept === '' ? 'الكل' : dept === '__none__' ? 'بدون قسم' : depName(dept) || dept;
    return {
      tab, kind, from: q.from || '', to: q.to || '', deptName: dn, label: BOARDS.find((b) => b.id === tab)?.label || tab, rows, cards,
      log: { totals: logTotals(log), rows: log.map((p) => ({ id: p.id, rev: p.rev, src: p._src, date: p.date || '', name: p._name || '', amount: toInt(p.amount), notes: p.notes || '', type: p.type || 'pay', isAdvance: !!p.isAdvance, ...logView(p) })) },
    };
  }

  /** خيارات النافذة: الأشخاص، والإضافات المستحقة، والراتب المسجّل، والبنود، وأرقام نطاق المشرف */
  async payOptions(u: AuthUser, kind: string, id: string) {
    this.assert(u, 'view');
    const c = await this.ctx();
    const k = (['worker', 'supervisor', 'driver', 'employee'].includes(kind) ? kind : 'worker') as PKind;
    const byName = (xs: J[]) => xs.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar', { sensitivity: 'base' }));
    const people = Object.fromEntries((['employee', 'supervisor', 'worker', 'driver'] as PKind[]).map((pk) => [pk, byName(c.people[pk]).map((p) => ({ id: p.id, name: p.name || '', code: p.code || '', departmentId: deptOf(p) }))]));
    const pools = Object.fromEntries(await Promise.all(Object.entries(DEFAULT_POOLS).map(async ([key, def]) => {
      const cur = (await this.repo.doc(key))?.data; const seeded = (await this.repo.doc(def.seed))?.data;
      const arr = Array.isArray(cur) ? (cur as string[]).slice() : [];
      if (!seeded) def.items.forEach((x) => { if (!arr.includes(x)) arr.push(x); });
      return [key, arr];
    })));
    const out: J = { today: cairoTodayIso(), people, pools, departments: Object.fromEntries((['employee', 'supervisor', 'worker', 'driver'] as PKind[]).map((pk) => [pk, this.deptsFor(c, pk).map((d) => ({ id: d.id, name: d.name || '' }))])) };
    if (id) {
      const p = c.people[k].find((x) => x.id === id);
      if (!p) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الشخص غير موجود' });
      out.person = { id, kind: k, salary: configuredSalary(c, k, id), balance: this.balanceOf(c, k, id, 'self'),
        unpaidBonuses: unpaidBonuses(c, k, id).map((b) => ({ id: b.id, date: b.date || '', item: b.payCategory || 'مكافأة', amount: toInt(b.amount || b.extrasAmount) })) };
      if (k === 'supervisor') { const st = supervisorStatement(c, p); out.supervisor = { ownDue: st.ownDue, ownBal: st.ownBal, workersDue: st.workersDue, workersBal: st.workersBal, totalDue: st.totalDue, totalPenalty: st.totalPenalty, totalExpenses: st.totalExpenses, totalPaid: st.totalPaid, totalBal: st.totalBal }; }
    }
    return out;
  }
  /** المتبقي (الحساب الجديد، من غير فترة — زي workerBalance(w.id) في النافذة القديمة) */
  private balanceOf(c: Ctx, kind: PKind, id: string, scope: 'self' | 'workers' | 'close_account'): string {
    const p = c.people[kind].find((x) => x.id === id); if (!p) return '0';
    if (kind === 'supervisor') {
      const st = supervisorStatement(c, p);
      return scope === 'close_account' ? st.totalBal : scope === 'workers' ? sumMoney(st.workers.map((w) => (Number(w.bal) > 0 ? w.bal : '0'))) : st.ownBal;
    }
    return String(kind === 'employee' ? employeeRow(c, p).bal : laborRow(c, kind as 'worker' | 'driver', p).bal);
  }

  /** حفظ النافذة (btnSaveUp) — نفس السجلات اللي القديمة بتخزنها، ومعاها قاعدة السلفة */
  async pay(u: AuthUser, dto: PayDto) {
    this.assert(u, 'add');
    const isPen = dto.mode === 'penalty', extrasOnly = dto.mode === 'extras';
    const pt = dto.personType, pid = String(dto.personId || '').trim();
    const bad = (m: string) => new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: m });
    if (!pid) throw bad('اختر الشخص');
    const ids: string[] = [];
    let total = 0, advanced = false;
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const c = await this.ctx(qr.manager);
        if (!c.people[pt].some((x) => x.id === pid)) throw bad('اختر الشخص');
        const date = String(dto.date || '').trim() || cairoTodayIso();
        const notes = String(dto.notes || '').trim();
        const payKind = isPen ? 'penalty' : extrasOnly ? 'salary_bonus' : dto.payKind || 'salary';
        const lines: { item: string; amount: number; isExtra: boolean; salaryPart?: boolean; bonusId?: string; payExtra?: boolean }[] = [];
        const pools: Record<string, string[]> = {};
        const pool = (key: string, item: string) => { if (item) (pools[key] = pools[key] || []).push(item); };
        const rawLines = (dto.lines || []).map((l) => ({ item: String(l.item || '').trim(), amount: toInt(l.amount) })).filter((l) => l.amount > 0);
        if (isPen) rawLines.forEach((l) => { pool('penaltyItemPool', l.item); lines.push({ item: l.item || 'خصم', amount: l.amount, isExtra: false }); });
        else if (payKind === 'salary') {
          const salary = toInt(dto.salary);
          if (salary <= 0) throw bad('أدخل مبلغ الراتب');
          const cap = configuredSalary(c, pt, pid);
          if (cap > 0 && salary > cap) throw bad(`لا يمكن دفع أكثر من الراتب المسجّل (${fmtMoney(cap)})`);
          if (cap <= 0) throw bad('لا يوجد راتب مسجّل لهذا الشخص — حدّث بياناته أولاً');
          lines.push({ item: 'راتب', amount: salary, isExtra: false, salaryPart: true });
        } else if (payKind === 'extras') {
          const unpaid = unpaidBonuses(c, pt, pid);
          (dto.bonusIds || []).forEach((bid) => { const b = unpaid.find((x) => x.id === bid); if (!b) return; const amount = toInt(b.amount || b.extrasAmount); if (amount <= 0) return; lines.push({ item: String(b.payCategory || 'مكافأة').trim(), amount, isExtra: true, bonusId: b.id, payExtra: true }); });
          if (!lines.length) throw bad('اختر إضافة/مكافأة واحدة على الأقل من المسجّلة للشخص');
        } else if (payKind === 'salary_bonus') {
          rawLines.forEach((l) => { pool('paymentItemPool', l.item); lines.push({ item: l.item || 'إضافة', amount: l.amount, isExtra: true }); });
          if (!lines.length) throw bad('أضف بند إضافة/مكافأة واحد على الأقل');
        } else if (payKind === 'daily') rawLines.forEach((l) => { pool('dailyPayItemPool', l.item); lines.push({ item: l.item || 'دفع يوميات', amount: l.amount, isExtra: false }); });
        if (!lines.length) throw bad('أدخل مبلغاً واحداً على الأقل');
        total = lines.reduce((s, l) => s + toInt(l.amount), 0);
        const scope = pt === 'supervisor' && !isPen && !extrasOnly && payKind !== 'extras' ? dto.scope || 'self' : 'self';
        // DEC-0132: الصرف الفعلي فوق المتبقي = سلفة بس
        const adv: J = {};
        if (!isPen && !extrasOnly) {
          const bal = Number(this.balanceOf(c, pt, pid, scope));
          if (total > Math.max(0, bal)) {
            if (scope === 'workers') throw new ConflictException({ statusCode: 409, code: 'OVER_BALANCE', message: `المبلغ أكبر من متبقي العمال (${fmtMoney(Math.max(0, bal))}) — التوزيع على العمال مايقبلش سلفة`, balance: String(Math.max(0, bal)) });
            if (!dto.advance) throw new ConflictException({ statusCode: 409, code: 'OVER_BALANCE', message: `المبلغ أكبر من المتبقي (${fmtMoney(Math.max(0, bal))}) — الزيادة لازم تتسجّل «سلفة» (DEC-0132)`, balance: String(Math.max(0, bal)) });
            advanced = true;
            Object.assign(adv, { isAdvance: true, advanceApprovedBy: u.username || u.id, advanceApprovedAt: new Date().toISOString() });
          }
        }
        const recs: { coll: string; rec: J }[] = [];
        const base = { personType: pt, personId: pid, workerId: pt === 'worker' ? pid : '' };
        if (isPen) {
          if (pt === 'employee') lines.forEach((l) => recs.push({ coll: PENS, rec: { employeeId: pid, date, amount: l.amount, reason: l.item, notes, type: 'penalty' } }));
          else lines.forEach((l) => recs.push({ coll: PAYS, rec: { ...base, type: 'penalty', date, amount: l.amount, notes, payCategory: l.item, payKind: 'penalty', scope: 'self' } }));
        } else if (extrasOnly) {
          lines.forEach((l) => recs.push({ coll: PAYS, rec: { ...base, type: 'bonus', date, amount: l.amount, notes, payCategory: l.item, payKind: 'bonus', isExtra: true, salaryAmount: 0, extrasAmount: l.amount, scope: 'self', status: 'accrued' } }));
        } else if (payKind === 'extras') {
          lines.forEach((l) => recs.push({ coll: PAYS, rec: { ...base, type: 'pay', date, amount: l.amount, notes, payCategory: l.item, payKind: 'extras', isExtra: true, salaryAmount: 0, extrasAmount: l.amount, linkedBonusId: l.bonusId || '', scope: 'self', ...adv } }));
        } else if (pt === 'supervisor' && scope === 'workers') {
          const sup = c.people.supervisor.find((x) => x.id === pid)!;
          const st = supervisorStatement(c, sup);
          const ws = st.workers.map((w) => ({ id: w.id, bal: Math.max(0, Number(w.bal)) })).filter((x) => x.bal > 0)
            .sort((a, b) => { const na = c.people.worker.find((x) => x.id === a.id)?.name || '', nb = c.people.worker.find((x) => x.id === b.id)?.name || ''; return String(na).localeCompare(String(nb), 'ar', { sensitivity: 'base' }); });
          const sumBal = ws.reduce((s, x) => s + x.bal, 0);
          if (!ws.length || sumBal <= 0) throw bad('لا متبقي على عمال هذا المشرف للتوزيع');
          let left = total;
          ws.forEach((x, i) => {
            let share = i === ws.length - 1 ? left : toInt(Math.round(total * (x.bal / sumBal)));
            if (share > left) share = left;
            if (share <= 0) return;
            left -= share;
            recs.push({ coll: PAYS, rec: { personType: 'worker', personId: x.id, workerId: x.id, type: 'pay', date, amount: share, notes: notes || 'توزيع صرف مشرف', payCategory: lines.map((l) => l.item).join(' + '), payKind, salaryAmount: 0, extrasAmount: share, fromSupervisorId: pid, scope: 'workers' } });
          });
        } else if (pt === 'supervisor') {
          lines.forEach((l) => recs.push({ coll: PAYS, rec: { personType: 'supervisor', personId: pid, workerId: '', type: 'pay', date, amount: l.amount, notes, payCategory: l.item, payKind, isExtra: !!l.isExtra, salaryAmount: l.salaryPart ? l.amount : 0, extrasAmount: l.isExtra ? l.amount : 0, scope, ...adv } }));
        } else {
          lines.forEach((l) => recs.push({ coll: PAYS, rec: { ...base, type: 'pay', date, amount: l.amount, notes, payCategory: l.item, payKind, isExtra: !!l.isExtra, salaryAmount: l.salaryPart ? l.amount : 0, extrasAmount: l.isExtra || l.payExtra ? l.amount : 0, linkedBonusId: l.bonusId || '', scope: 'self', ...adv } }));
        }
        const changes: RecordChangeDto[] = recs.map(({ coll, rec }) => { const id = uid(); ids.push(id); return { collection: coll, id, op: 'upsert', baseRev: 0, set: { id, ...rec } } as RecordChangeDto; });
        // دفع الإضافات المستحقة: المكافأة بتتعلّم «مدفوعة»
        for (const l of lines) if (l.bonusId) {
          const b = c.rows.pays.find((x) => x.id === l.bonusId);
          if (b) changes.push({ collection: PAYS, id: b.id, op: 'upsert', baseRev: b.rev, set: { status: 'paid', paidDate: date } } as RecordChangeDto);
        }
        const docs: DocChangeDto[] = [];
        for (const [key, items] of Object.entries(pools)) {
          const cur = await this.repo.doc(key, qr.manager); const have = Array.isArray(cur?.data) ? (cur!.data as string[]) : [];
          const add = [...new Set(items)].filter((x) => !have.includes(x));
          if (add.length) docs.push({ key, baseRev: cur?.rev ?? 0, op: 'arrayDelta', add } as DocChangeDto);
        }
        return { records: changes, docs };
      },
      after: async (qr, res) => {
        if (res.conflicts.length) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'البيانات اتعدّلت من مستخدم تاني — حدّث الصفحة' });
        for (const id of ids) await this.repo.addEvent(qr.manager, isPen ? 'penalty' : extrasOnly ? 'accrued' : advanced ? 'advance' : 'paid', id, { id, personType: pt, personId: pid, mode: dto.mode, total }, u.id);
      },
    });
    return { ids, total, advance: advanced };
  }

  /** الحذف من السجل (btn-del-pay): الصرف من workerPayments، وخصم الموظف من employeePenalties */
  async remove(u: AuthUser, src: string, id: string, rev: number) {
    this.assert(u, 'delete');
    const coll = src === 'empPen' ? PENS : PAYS;
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const cur = (await this.repo.rows(coll, qr.manager)).find((r) => r.id === id);
        if (!cur) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'السجل غير موجود' });
        if (cur.rev !== rev) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'السجل اتعدّل من مستخدم تاني — حدّث الصفحة' });
        return [{ collection: coll, id, op: 'delete', baseRev: cur.rev } as RecordChangeDto];
      },
      after: async (qr, res) => {
        if (res.conflicts.length) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'السجل اتعدّل من مستخدم تاني — حدّث الصفحة' });
        await this.repo.addEvent(qr.manager, 'deleted', id, { id, collection: coll }, u.id);
      },
    });
    return { id, deleted: true };
  }

  /** إدارة البنود (openPayItemsManageModal): إضافة وحذف من القايمة */
  async items(u: AuthUser, dto: ItemsDto) {
    this.assert(u, 'edit');
    const def = DEFAULT_POOLS[dto.pool];
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const cur = await this.repo.doc(dto.pool, qr.manager); const seeded = await this.repo.doc(def.seed, qr.manager);
        let arr = Array.isArray(cur?.data) ? (cur!.data as string[]).slice() : [];
        if (!seeded?.data) def.items.forEach((x) => { if (!arr.includes(x)) arr.push(x); });
        (dto.add || []).map((x) => String(x || '').trim()).filter(Boolean).forEach((x) => { if (!arr.includes(x)) arr.push(x); });
        arr = arr.filter((x) => !(dto.remove || []).includes(x));
        const docs: DocChangeDto[] = [{ key: dto.pool, baseRev: cur?.rev ?? 0, op: 'set', value: arr } as DocChangeDto];
        if (!seeded?.data) docs.push({ key: def.seed, baseRev: seeded?.rev ?? 0, op: 'set', value: true } as DocChangeDto);
        return { docs };
      },
    });
    return { pool: dto.pool };
  }
}
