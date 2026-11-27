/* eslint-disable @typescript-eslint/no-explicit-any */
import { Money } from '../common/money';
import { attType, DKind, Flag, legacyNet, newNet, ownerOf, People, round2, toInt } from '../dailies/dailies-rules';
import { equipmentDailyCost } from '../dues/dues-rules';
import { newCost } from '../equipment/equipment-rules';

/**
 * تكلفة المشروع والتكاليف (8.8، DEC-0142) — نقل حرفي من الواجهة القديمة + الحساب الجديد جنبه:
 *  - **القديم:** projectCostSummary وprojectSupplyCostLines (helpers.js)، وcompCostRows (cost-center.js) — بالظبط، ومنه F-10 (المصروف بسطور = صفر)
 *    وF-11 (الموردين بالإجمالي قبل الخصم)، و«السلف» صفر، والربط باسم المشروع كنص.
 *  - **الجديد (TR-10 / CHG-0010، DEC-0142):** المصروف بكل سطوره، والفاتورة بالصافي بعد الخصم (netInvoice)، والمرتجع سالب، والملغاة صفر، والمخزّنة وقت الصرف،
 *    والصرف بتكلفته المثبّتة؛ والعمالة بالحساب الجديد للأيام (DEC-0129 / DEC-0133) والمعدات بالحساب الجديد (DEC-0140). كل حاجة بـ Money.
 *    ضريبة القيمة المضافة زي ما هي في الصافي لحد B-20، والتكاليف غير المباشرة (B-33) مش داخلة.
 *  - صفحة التكاليف: costLines وcostItemText وفلاتر الجدول والبنود المقترحة والحفظ (openCostModal) والأقسام والبنود (pages-costs.js).
 */
export type J = Record<string, any>;
export const COST_KINDS = ['worker', 'supervisor', 'driver', 'employee', 'equipment'] as const;
export type CKind = (typeof COST_KINDS)[number];
export const COST_TABS: { id: string; label: string; kind: CKind; icon: string }[] = [
  { id: 'workers', label: 'العمال', kind: 'worker', icon: '🧑‍🔧' }, { id: 'supervisors', label: 'المشرفون', kind: 'supervisor', icon: '👷' },
  { id: 'drivers', label: 'السائقون', kind: 'driver', icon: '🧑‍🚒' }, { id: 'employees', label: 'الموظفين', kind: 'employee', icon: '👔' },
  { id: 'equipment', label: 'المعدات والمركبات', kind: 'equipment', icon: '🛻' },
];
export const KIND_LABEL: Record<string, string> = { worker: 'عامل', supervisor: 'مشرف', driver: 'سائق', employee: 'موظف', equipment: 'معدة / مركبة' };
export const COST_ITEM_DEFAULTS = ['مواصلات', 'خامات', 'أدوات ومعدات صغيرة', 'إصلاح وصيانة', 'وقود', 'إقامة وإعاشة', 'اتصالات', 'شحن ونقل', 'مصاريف نثرية'];
export const COMP_COST_COLS: [string, string][] = [['labor', 'عمالة'], ['equip', 'معدات'], ['fuel', 'وقود'], ['maint', 'صيانة'], ['expenses', 'مصروفات'], ['costs', 'تكاليف'], ['advances', 'سلف'], ['suppliers', 'موردون'], ['warehouse', 'مخازن']];
const m = (v: Money) => v.toFixed().replace(/\.?0+$/, '') || '0';
const s = (v: unknown) => String(v ?? '').trim();
const arAr = (a: string, b: string) => a.localeCompare(b, 'ar');

export interface CostCtx {
  projects: J[]; people: People; employees: J[]; equipment: J[]; att: J[]; flags: Map<string, Flag[]>; eqDaily: J[]; fuelLogs: J[]; equipmentLogs: J[]; projectDaily: J[];
  expenses: J[]; costs: J[]; invoices: J[]; suppliers: J[]; movements: J[]; items: J[]; clientInvoices: J[]; idlePercent: number;
}
const inRange = (d: unknown, from?: string, to?: string) => !((from && s(d) < from) || (to && s(d) > to));
const onProject = (x: J, name: string) => !!x && s(x.project) === name;

// ---------------- القديم
/** projectSupplyCostLines (helpers.js) */
export function supplyLines(c: CostCtx, projectName: string, from?: string, to?: string, mode: 'legacy' | 'new' = 'legacy'): J[] {
  const name = s(projectName); const out: J[] = [];
  if (!name) return out;
  const stocked = new Set(c.movements.filter((mv) => mv && (mv.type === 'in' || mv.type === 'adjust_in') && mv.supplierInvoiceId).map((mv) => mv.supplierInvoiceId));
  for (const inv of c.invoices) {
    if (!inv || inv.cancelled || s(inv.project) !== name || stocked.has(inv.id) || !inRange(inv.date, from, to)) continue;
    // القديم: الإجمالي قبل الخصم (F-11) — الجديد: الصافي بعد الخصم (TR-10)، والفاتورة القديمة من غير صافي بإجماليها
    const base = mode === 'new' && inv.netInvoice != null && inv.netInvoice !== '' && Number.isFinite(Number(inv.netInvoice)) ? Number(inv.netInvoice) : Number(inv.totalInvoice || 0);
    const amt = (inv.isReturn ? -1 : 1) * base;
    const sup = c.suppliers.find((x) => x.id === inv.supplierId);
    out.push({ source: 'supplier', date: inv.date || '', ref: inv.invoiceNo || inv.id, party: sup ? sup.name : '', desc: inv.isReturn ? 'مرتجع مورد' : 'فاتورة مورد', amount: amt, recordId: inv.id });
  }
  for (const mv of c.movements) {
    if (!mv || mv.type !== 'out' || s(mv.project) !== name || !inRange(mv.date, from, to)) continue;
    const it = c.items.find((x) => x.id === mv.itemId) || {};
    const unit = mv.unitCost != null && mv.unitCost !== '' ? Number(mv.unitCost) : Number(it.avgCost) || Number(it.lastCost) || 0;
    out.push({ source: 'warehouse', date: mv.date || '', ref: mv.id, party: it.name || '', desc: 'صرف مخزني', qty: Number(mv.qty) || 0, unit, amount: Math.round((Number(mv.qty) || 0) * unit * 100) / 100, recordId: mv.id });
  }
  return out;
}
export interface Summary { labor: number; equip: number; fuel: number; maint: number; advances: number; expenses: number; costs: number; suppliers: number; warehouse: number; total: number; budget: number; budgetStatus: string }
const budgetOf = (c: CostCtx, name: string) => { const p = c.projects.find((x) => s(x.name) === name); return toInt(p && p.budget); };
const statusOf = (total: number, budget: number) => { if (!(budget > 0)) return 'none'; const r = total / budget; return r < 0.85 ? 'ok' : r <= 1 ? 'warn' : 'over'; };
/** projectCostSummary (helpers.js:7887) — بالظبط */
export function legacySummary(c: CostCtx, projectName: string, from?: string, to?: string): Summary {
  const name = s(projectName);
  let labor = 0, equip = 0, fuel = 0, maint = 0; const advances = 0;
  for (const a of c.att) if (onProject(a, name) && inRange(a.date, from, to)) labor += legacyNet(a, ownerOf(a, c.people));
  for (const d of c.eqDaily) if (onProject(d, name) && inRange(d.date, from, to)) equip += equipmentDailyCost(d, c.equipment.find((e) => e.id === d.equipmentId));
  for (const f of c.fuelLogs) if (onProject(f, name) && inRange(f.date, from, to)) fuel += toInt(f.cost);
  for (const l of c.equipmentLogs) if (onProject(l, name) && inRange(l.date, from, to)) maint += toInt(l.cost);
  for (const pd of c.projectDaily) if (onProject(pd, name) && inRange(pd.date, from, to)) { labor += toInt(pd.laborCost); equip += toInt(pd.equipCost); fuel += toInt(pd.fuelCost); }
  let expenses = 0, costsAmt = 0;
  for (const e of c.expenses) if (onProject(e, name) && inRange(e.date, from, to)) expenses += toInt(e.amount);
  for (const x of c.costs) if (onProject(x, name) && inRange(x.date, from, to)) costsAmt += toInt(x.amount);
  labor = toInt(labor); equip = toInt(equip); fuel = toInt(fuel); maint = toInt(maint); expenses = toInt(expenses); costsAmt = toInt(costsAmt);
  let suppliers = 0, warehouse = 0;
  for (const l of supplyLines(c, name, from, to)) { if (l.source === 'supplier') suppliers += l.amount; else warehouse += l.amount; }
  suppliers = toInt(suppliers); warehouse = toInt(warehouse);
  const total = toInt(labor + equip + fuel + maint + advances + expenses + costsAmt + suppliers + warehouse);
  const budget = budgetOf(c, name);
  return { labor, equip, fuel, maint, advances, expenses, costs: costsAmt, suppliers, warehouse, total, budget, budgetStatus: statusOf(total, budget) };
}

// ---------------- الجديد (TR-10)
export interface NewSummary { labor: string; equip: string; fuel: string; maint: string; advances: string; expenses: string; costs: string; suppliers: string; warehouse: string; total: string; budget: number; budgetStatus: string; pendingDailies: number }
/** المصروف بكل سطوره (تصليح F-10): السطور لو موجودة، وإلا المبلغ */
export const expenseAmount = (e: J): string => (Array.isArray(e.lines) && e.lines.length ? m(Money.sum(e.lines.map((l: J) => String(toInt(l && l.amount))).concat(['0']))) : String(toInt(e.amount)));
export function newSummary(c: CostCtx, projectName: string, from?: string, to?: string): NewSummary {
  const name = s(projectName);
  const z = () => Money.zero();
  let labor = z(), equip = z(), fuel = z(), maint = z(), expenses = z(), costsAmt = z(), suppliers = z(), warehouse = z(); let pendingDailies = 0;
  for (const a of c.att) if (onProject(a, name) && inRange(a.date, from, to)) { const r = newNet(a, ownerOf(a, c.people), c.flags.get(a.id) || []); if (r.pending) pendingDailies++; labor = labor.plus(r.net); }
  for (const d of c.eqDaily) if (onProject(d, name) && inRange(d.date, from, to)) equip = equip.plus(newCost(d, c.equipment.find((e) => e.id === d.equipmentId), c.idlePercent));
  for (const f of c.fuelLogs) if (onProject(f, name) && inRange(f.date, from, to)) fuel = fuel.plus(String(toInt(f.cost)));
  for (const l of c.equipmentLogs) if (onProject(l, name) && inRange(l.date, from, to)) maint = maint.plus(String(toInt(l.cost)));
  for (const pd of c.projectDaily) if (onProject(pd, name) && inRange(pd.date, from, to)) { labor = labor.plus(String(toInt(pd.laborCost))); equip = equip.plus(String(toInt(pd.equipCost))); fuel = fuel.plus(String(toInt(pd.fuelCost))); }
  for (const e of c.expenses) if (onProject(e, name) && inRange(e.date, from, to)) expenses = expenses.plus(expenseAmount(e));
  for (const x of c.costs) if (onProject(x, name) && inRange(x.date, from, to)) costsAmt = costsAmt.plus(String(toInt(x.amount)));
  for (const l of supplyLines(c, name, from, to, 'new')) { if (l.source === 'supplier') suppliers = suppliers.plus(String(l.amount)); else warehouse = warehouse.plus(String(l.amount)); }
  const total = Money.sum([labor, equip, fuel, maint, expenses, costsAmt, suppliers, warehouse].map(m));
  const budget = budgetOf(c, name);
  return { labor: m(labor), equip: m(equip), fuel: m(fuel), maint: m(maint), advances: '0', expenses: m(expenses), costs: m(costsAmt), suppliers: m(suppliers), warehouse: m(warehouse), total: m(total), budget, budgetStatus: statusOf(Number(m(total)), budget), pendingDailies };
}

// ---------------- الشاملة (cost-center.js)
/** compCostProjectNames: المسجّلة + الأسماء المكتوبة نصًا في المصروفات والتكاليف والفواتير وصرف المخازن */
export function compNames(c: CostCtx): string[] {
  const set = new Map<string, true | 'free'>();
  for (const p of c.projects) if (p && p.name) set.set(s(p.name), true);
  const add = (v: unknown) => { const n = s(v); if (n && !set.has(n)) set.set(n, 'free'); };
  c.expenses.forEach((e) => e && add(e.project)); c.costs.forEach((x) => x && add(x.project)); c.invoices.forEach((i) => i && add(i.project));
  c.movements.forEach((mv) => mv && mv.type === 'out' && add(mv.project));
  return [...set.keys()];
}
export const collected = (c: CostCtx, name: string) => toInt(c.clientInvoices.reduce((acc, i) => acc + (s(i.project) === name ? Number(i.paid) || 0 : 0), 0));
export function compRows(c: CostCtx, q: string, from?: string, to?: string, match: (hay: string, q: string) => boolean = (h, x) => h.includes(x)) {
  return compNames(c).filter((n) => !q || match(n, q)).map((name) => {
    const legacy = legacySummary(c, name, from, to), nw = newSummary(c, name, from, to), col = collected(c, name);
    return { name, registered: c.projects.some((p) => s(p.name) === name), collected: col, legacy, legacyNet: col - legacy.total, new: nw, net: m(Money.of(String(col)).minus(nw.total)) };
  }).filter((r) => r.legacy.total || Number(r.new.total) || r.collected);
}

// ---------------- صفحة التكاليف (pages-costs.js)
/** costLines: السجلات القديمة (item + amount) بتتحول لسطر واحد */
export function costLines(x: J): { item: string; amount: number }[] {
  if (x && Array.isArray(x.lines) && x.lines.length) return x.lines.map((l: J) => ({ item: s(l.item || l.label), amount: toInt(l.amount) }));
  return [{ item: s(x && x.item), amount: toInt(x && x.amount) }];
}
export function costItemText(x: J, fmtNum: (n: number) => string): string {
  const ls = costLines(x).filter((l) => l.item || l.amount);
  if (ls.length <= 1) return (ls[0] && ls[0].item) || '';
  return ls.map((l) => `${l.item || 'بدون بند'} ${fmtNum(l.amount)}`).join(' + ');
}
export const itemsUsed = (costs: J[]) => [...new Set(costs.filter(Boolean).flatMap((x) => costLines(x).map((l) => l.item).filter(Boolean)))].sort(arAr);
/** costItemSuggestions */
export function itemSuggestions(costs: J[], pools: J, hidden: J, kind: string): string[] {
  const hid = new Set((Array.isArray(hidden[kind]) ? hidden[kind] : []).map((x: unknown) => s(x)));
  const set = new Set<string>(COST_ITEM_DEFAULTS);
  (Array.isArray(pools[kind]) ? pools[kind] : []).forEach((x: unknown) => { const v = s(x); if (v) set.add(v); });
  costs.forEach((x) => { if (x && x.personKind === kind) costLines(x).forEach((l) => { if (l.item) set.add(l.item); }); });
  return [...set].filter((x) => !hid.has(x)).sort(arAr);
}
export function personName(x: J, people: { worker: J[]; supervisor: J[]; driver: J[]; employee: J[]; equipment: J[] }): string {
  if (!x) return '';
  const id = x.personId, k = x.personKind;
  if (k === 'worker' || k === 'supervisor' || k === 'employee') { const p = people[k as 'worker'].find((y) => y.id === id); return p ? p.name || p.code || id : '—'; }
  if (k === 'driver') { const p = people.driver.find((y) => y.id === id); return p ? p.name : ''; }
  if (k === 'equipment') { const e = people.equipment.find((y) => y && y.id === id); return e ? e.name || e.code || id : id || ''; }
  return id || '';
}
export interface CostFilters { q?: string; item?: string; project?: string; from?: string; to?: string }
/** جدول الفئة (المستوى 3 في renderCostsPage) */
export function tableRows(costs: J[], kind: string, section: string, f: CostFilters, name: (x: J) => string, text: (x: J) => string, match: (hay: unknown, q: string) => boolean): J[] {
  let rows = costs.filter((x) => x && x.personKind === kind);
  if (section) rows = rows.filter((x) => (x.section || '') === section);
  if (f.q) { const q = f.q.trim(); rows = rows.filter((x) => match(name(x), q) || match(text(x), q) || match(x.notes, q) || match(x.project, q)); }
  if (f.item) rows = rows.filter((x) => costLines(x).some((l) => l.item === f.item));
  if (f.project) rows = rows.filter((x) => String(x.project || '').includes(f.project as string));
  if (f.from) rows = rows.filter((x) => s(x.date) >= (f.from as string));
  if (f.to) rows = rows.filter((x) => s(x.date) <= (f.to as string));
  return rows.sort((a, b) => s(b.date).localeCompare(s(a.date)));
}
export const sumAmounts = (xs: J[]) => toInt(xs.reduce((acc, x) => acc + toInt(x.amount), 0));
export interface CostForm { personKind?: string; personId?: string; date?: string; project?: string; section?: string; notes?: string; lines?: { item?: string; amount?: string }[]; extraFields?: J[] }
/** btnSaveCost: السطور اللي فيها بند أو مبلغ، والمبلغ = مجموعهم بـ toInt، والبند نص واحد أو «أ + ب» */
export function costPayload(f: CostForm): J | string {
  const personKind = (COST_KINDS as readonly string[]).includes(String(f.personKind)) ? String(f.personKind) : 'worker';
  const ls = (f.lines || []).map((l) => ({ item: s(l.item), amount: toInt(l.amount) })).filter((l) => l.item || l.amount);
  const amount = toInt(ls.reduce((acc, l) => acc + toInt(l.amount), 0));
  if (!s(f.personId)) return 'اختار الشخص';
  if (!s(f.date)) return 'اكتب التاريخ';
  if (!ls.length || !(amount > 0)) return 'اكتب بند واحد على الأقل بمبلغ أكبر من صفر';
  return { personKind, personId: s(f.personId), date: s(f.date), amount, lines: ls, item: ls.length === 1 ? ls[0].item : ls.map((l) => l.item).filter(Boolean).join(' + '), project: s(f.project), section: s(f.section), notes: s(f.notes), extraFields: Array.isArray(f.extraFields) ? f.extraFields : [] };
}
/** saveCostItemSuggestion: بيرجّع البند من المخفي، وبيضيفه للقايمة لو مش افتراضي */
export function addItem(pools: J, hidden: J, kind: string, label: string): { pools: string[]; hidden: string[] } {
  const v = s(label); const p = (Array.isArray(pools[kind]) ? pools[kind] : []).slice(), h = (Array.isArray(hidden[kind]) ? hidden[kind] : []).slice();
  if (!v) return { pools: p, hidden: h };
  const i = h.indexOf(v); if (i >= 0) h.splice(i, 1);
  if (!COST_ITEM_DEFAULTS.includes(v) && !p.includes(v)) p.push(v);
  return { pools: p, hidden: h };
}
/** removeCostItemSuggestion */
export function removeItem(pools: J, hidden: J, kind: string, label: string): { pools: string[]; hidden: string[] } {
  const v = s(label); const p = (Array.isArray(pools[kind]) ? pools[kind] : []).filter((x: string) => x !== v), h = (Array.isArray(hidden[kind]) ? hidden[kind] : []).slice();
  if (!h.includes(v)) h.push(v);
  return { pools: p, hidden: h };
}
/** renameCostItemSuggestion: بيشيل القديم (ويخفيه) ويضيف الجديد، وبيغيّر السجلات (السطور والبند) */
export function renameItemChanges(costs: J[], kind: string, o: string, n: string): { id: string; set: J }[] {
  const out: { id: string; set: J }[] = [];
  for (const x of costs) {
    if (!x || x.personKind !== kind) continue;
    let touched = false; const set: J = {};
    if (Array.isArray(x.lines)) { const lines = x.lines.map((l: J) => (s(l.item) === o ? ((touched = true), { ...l, item: n }) : l)); if (touched) set.lines = lines; }
    if (s(x.item) === o) { set.item = n; touched = true; }
    if (touched && Array.isArray(x.lines)) { const lines = set.lines || x.lines; set.item = lines.length === 1 ? lines[0].item : lines.map((l: J) => l.item).filter(Boolean).join(' + '); }
    if (touched) out.push({ id: x.id, set });
  }
  return out;
}
export { attType, round2, toInt };
export type { DKind };
