/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 8.6.3 — قواعد المستحقات والصرف: نقل حرفي من الواجهة القديمة (renderer/core/helpers.js، وpages-worker-dues.js) — DEC-0137.
 * كل رقم «قديم» بنفس دوال القديمة بالظبط (toInt لكل مبلغ — المرجع لتقرير الفرق، phase84.js)، و«المستحق» و«المتبقي» كمان بالحساب
 * الجديد للأيام (DEC-0129/0130: newNet بـ Money، واليوميات المعلّمة صفر لحد قرار المراجعة — DEC-0133). باقي البنود (البدلات والتكاليف
 * والمصاريف والمدفوع والخصومات) واحدة في الحسابين.
 */
import { Money } from '../common/money';
import { attPersonId, attType, daysCredit, DKind, Flag, legacyNet, newNet, round2, toInt } from '../dailies/dailies-rules';

type J = Record<string, any>;
export type PKind = 'worker' | 'supervisor' | 'driver' | 'employee' | 'equipment';
export interface Ctx {
  people: { worker: J[]; supervisor: J[]; driver: J[]; employee: J[]; equipment: J[] };
  att: J[]; empAtt: J[]; pays: J[]; empPens: J[]; costs: J[]; expenses: J[]; supExpenses: J[]; eqDaily: J[]; payroll: J[];
  settings: J; flags: Map<string, Flag[]>; departments: J[];
}
const m = (v: Money) => v.toFixed().replace(/\.?0+$/, '') || '0';
const inRange = (d: unknown, F?: string, T?: string) => !(F && String(d || '') < F) && !(T && String(d || '') > T);
const sumInt = (xs: J[], f: (x: J) => unknown) => toInt(xs.reduce((s, x) => s + toInt(f(x)), 0));
const getP = (c: Ctx, k: PKind, id: string) => c.people[k].find((x) => x.id === id);

// ---------------- isActualPayment / isBonusEntitlement (helpers.js:4103)
export function isActualPayment(p: J): boolean {
  if (!p) return false;
  const t = String(p.type || 'pay');
  if (t === 'penalty' || t === 'deduction' || t === 'bonus' || t === 'allowance') return false;
  if (p.status === 'accrued') return false;
  return true;
}
export const isBonusEntitlement = (p: J) => !!p && (String(p.type || '') === 'bonus' || String(p.type || '') === 'allowance');
const isPenalty = (p: J) => p.type === 'penalty' || p.type === 'deduction';
/** الصرف بتاع الشخص: العامل بـ workerId أو (personType عامل وpersonId) — paymentBelongsToWorker؛ والباقي بالنوع والمعرّف */
function belongs(p: J, kind: PKind, id: string): boolean {
  if (!p || !id) return false;
  if (kind === 'worker') return p.workerId === id || (p.personType === 'worker' && p.personId === id);
  return p.personType === kind && p.personId === id;
}

// ---------------- اليوميات في الفترة
export function attOf(c: Ctx, kind: DKind, id: string, F?: string, T?: string): J[] {
  const pp = { worker: c.people.worker, supervisor: c.people.supervisor, driver: c.people.driver };
  return c.att.filter((a) => {
    if (attType(a, pp) !== kind) return false;
    if (kind === 'worker' ? (a.workerId || a.personId) !== id : attPersonId(a) !== id) return false;
    return inRange(a.date, F, T);
  });
}
const daysOf = (list: J[]) => Math.round(list.reduce((s, a) => s + daysCredit(a), 0) * 100) / 100;
const absentOf = (list: J[]) => new Set(list.filter((a) => String(a.status || '').toLowerCase() === 'absent').map((a) => a.date || '')).size;
/** أجر الأيام: القديم (toInt(Σ attendanceNetPay)) والجديد (Σ newNet) */
function dayDue(c: Ctx, list: J[], owner: J | undefined): { legacy: number; next: Money } {
  return {
    legacy: toInt(list.reduce((s, a) => s + legacyNet(a, owner), 0)),
    next: Money.sum(list.map((a) => newNet(a, owner, c.flags.get(a.id) || []).net)),
  };
}

// ---------------- المدفوع والخصم والبدلات والتكاليف والمصاريف
export const paidTotal = (c: Ctx, kind: PKind, id: string, F?: string, T?: string) => sumInt(c.pays.filter((p) => belongs(p, kind, id) && isActualPayment(p) && inRange(p.date, F, T)), (p) => p.amount);
export const penaltyTotal = (c: Ctx, kind: PKind, id: string, F?: string, T?: string) => sumInt(c.pays.filter((p) => belongs(p, kind, id) && isPenalty(p) && inRange(p.date, F, T)), (p) => p.amount);
export const employeePenaltyTotal = (c: Ctx, id: string, F?: string, T?: string) => sumInt(c.empPens.filter((p) => p.employeeId === id && inRange(p.date, F, T)), (p) => p.amount);
export const costsOf = (c: Ctx, kind: PKind, id: string, F?: string, T?: string) => c.costs.filter((x) => x && x.personKind === kind && x.personId === id && inRange(x.date, F, T)).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
export const costsTotal = (c: Ctx, kind: PKind, id: string, F?: string, T?: string) => sumInt(costsOf(c, kind, id, F, T), (x) => x.amount);
/** personExtrasTotal: التكاليف + المكافآت المستحقة (bonus/allowance) */
export function extrasTotal(c: Ctx, kind: PKind, id: string, F?: string, T?: string): number {
  const bonus = c.pays.filter((p) => {
    if (!isBonusEntitlement(p)) return false;
    const pt = p.personType || (p.workerId ? 'worker' : '');
    const pid = p.personId || p.workerId || '';
    if (kind === 'worker') { if (!(pt === 'worker' || (!p.personType && p.workerId))) return false; if (pid !== id && p.workerId !== id) return false; }
    else if (pt !== kind || pid !== id) return false;
    return inRange(p.date, F, T);
  });
  return toInt(costsTotal(c, kind, id, F, T) + bonus.reduce((s, p) => s + toInt(p.amount || p.extrasAmount), 0));
}
/** personExpensesList / personExpensesTotal */
export function expensesTotal(c: Ctx, kind: PKind, id: string, F?: string, T?: string): number {
  const list = c.expenses.filter((e) => {
    if (!e) return false;
    const pid = e.personId || e.equipmentId || '';
    if (!(pid === id || e.equipmentId === id)) return false;
    const ek = e.personKind || (e.equipmentId ? 'equipment' : '');
    if (kind && ek && ek !== kind) return false;
    return inRange(e.date, F, T);
  });
  return toInt(list.reduce((s, e) => {
    if (Array.isArray(e.lines) && e.lines.length) return s + e.lines.reduce((a: number, l: J) => a + toInt(l.amount), 0);
    if (e.amounts && typeof e.amounts === 'object') return s + Object.keys(e.amounts).reduce((a, k) => a + toInt(e.amounts[k]), 0);
    return s + toInt(e.amount || e.total || 0);
  }, 0));
}
/** personUnpaidBonuses (للنافذة) */
export function unpaidBonuses(c: Ctx, kind: PKind, id: string): J[] {
  return c.pays.filter((p) => {
    if (!isBonusEntitlement(p) || p.status === 'paid') return false;
    const pt = p.personType || (p.workerId ? 'worker' : '');
    const pid = p.personId || p.workerId || '';
    if (kind === 'worker') { if (!(pt === 'worker' || (!p.personType && p.workerId))) return false; if (pid !== id && p.workerId !== id) return false; }
    else if (pt !== kind || pid !== id) return false;
    return toInt(p.amount || p.extrasAmount) > 0;
  }).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
}

// ---------------- المعدات (تكلفة معدات المشرف)
export function equipmentDailyCost(log: J, eq: J | undefined): number {
  if (!log) return 0;
  let days = Number(log.days); if (!Number.isFinite(days) || days < 0) days = 0;
  let hours = Number(log.hours); if (!Number.isFinite(hours) || hours < 0) hours = 0;
  if (log.cost != null && log.cost !== '' && Number.isFinite(Number(log.cost))) return toInt(log.cost);
  const dailyRate = toInt(log.dailyCost != null ? log.dailyCost : eq && eq.dailyCost);
  const hourRate = toInt(log.hourlyCost != null ? log.hourlyCost : eq && (eq.hourlyCost || eq.hourRate));
  let total = 0;
  if (days > 0 && dailyRate > 0) total += round2(days * dailyRate);
  else if (hours > 0 && hourRate > 0) total += round2(hours * hourRate);
  else if (days > 0 && hourRate > 0) total += round2(days * 8 * hourRate);
  else if (hours > 0 && dailyRate > 0) total += round2((hours / 8) * dailyRate);
  const fuel = Number(log.fuelLiters) || 0;
  const fuelPrice = toInt(log.fuelPrice != null && log.fuelPrice !== '' ? log.fuelPrice : eq && (eq.fuelPrice != null && eq.fuelPrice !== '' ? eq.fuelPrice : eq.fuelPricePerLiter));
  if (fuel > 0 && fuelPrice > 0) total += round2(fuel * fuelPrice);
  return toInt(total);
}

// ---------------- الموظف (employeeDueAmount، helpers.js:5024)
function ymd(s: string): [number, number] | null { const x = String(s || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); return x ? [Number(x[1]), Number(x[2])] : null; }
export function monthsInRange(from?: string, to?: string): number {
  if (!from || !to) return 1;
  const a = ymd(from), b = ymd(to);
  if (!a || !b || to.slice(0, 10) < from.slice(0, 10)) return 1;
  return (b[0] - a[0]) * 12 + (b[1] - a[1]) + 1;
}
export function employeeDue(c: Ctx, e: J | undefined, F?: string, T?: string): number {
  if (!e) return 0;
  const legacy = c.payroll.filter((p) => {
    if (p.employeeId !== e.id) return false;
    if (F || T) {
      const ym = p.year != null && p.month != null ? `${p.year}-${String(p.month).padStart(2, '0')}` : '';
      if (ym) { if (F && ym < String(F).slice(0, 7)) return false; if (T && ym > String(T).slice(0, 7)) return false; }
    }
    return true;
  });
  const legacySum = toInt(legacy.reduce((s, p) => s + toInt(p.netSalary || p.net || p.paid), 0));
  if (legacySum) return legacySum;
  const salary = toInt(e.salary || e.basicSalary);
  if (!salary) return 0;
  let f = F, t = T;
  const hire = String(e.hireDate || '').slice(0, 10), res = String(e.resignedAt || '').slice(0, 10);
  if (f && t) { if (hire && hire > f) f = hire; if (res && res < t) t = res; if (f > t) return 0; }
  let due = salary * monthsInRange(f, t);
  if (String(c.settings.employeeSalaryMode || 'fixed') === 'deductAbsence') {
    const wdm = Number(c.settings.workDaysPerMonth) || 26;
    due = Math.max(0, due - round2((salary / wdm) * empAbsent(c, e.id, f, t)));
  }
  return round2(due);
}
const empAtt = (c: Ctx, id: string, F?: string, T?: string) => c.empAtt.filter((a) => a.employeeId === id && inRange(a.date, F, T));
export function empDays(c: Ctx, id: string, F?: string, T?: string): number {
  let d = 0;
  empAtt(c, id, F, T).forEach((a) => { const st = String(a.status || 'present').toLowerCase(); if (st === 'absent' || st === 'holiday') return; d += daysCredit(a); });
  return Math.round(d * 100) / 100;
}
export const empAbsent = (c: Ctx, id: string, F?: string, T?: string) => absentOf(empAtt(c, id, F, T));
/** الراتب المسجّل (سقف دفع الراتب — getPersonConfiguredSalary) */
export function configuredSalary(c: Ctx, kind: PKind, id: string): number { const p = getP(c, kind, id); if (!p) return 0; const s = toInt(p.salary != null ? p.salary : p.basicSalary); return s > 0 ? s : 0; }

// ---------------- صفوف الجداول
export interface Bal { legacy: number; next: string }
export interface DuesRow { id: string; code: string; name: string; [k: string]: any }
const badge = (due: number | string, paid: number, bal: number | string) => {
  const d = Number(due), b = Number(bal);
  return (paid > 0 && b <= 0) || (d > 0 && b <= 0 && paid >= d);
};
/** صف عامل أو سواق (renderDuesWorkers / renderDuesDrivers + workerBalance / driverBalance) */
export function laborRow(c: Ctx, kind: 'worker' | 'driver', p: J, F?: string, T?: string, supName = ''): DuesRow {
  const list = attOf(c, kind, p.id, F, T);
  const base = dayDue(c, list, p);
  const extras = extrasTotal(c, kind, p.id, F, T), paid = paidTotal(c, kind, p.id, F, T), penalty = penaltyTotal(c, kind, p.id, F, T), expenses = expensesTotal(c, kind, p.id, F, T);
  const legacyDue = toInt(base.legacy + extras), legacyBal = toInt(base.legacy + extras - paid - penalty - expenses);
  const due = base.next.plus(String(extras)), bal = due.minus(String(paid)).minus(String(penalty)).minus(String(expenses));
  return { id: p.id, code: p.code || '', name: p.name || '', supervisorName: supName, dailyWage: p.dailyWage ?? null, days: daysOf(list), absent: kind === 'worker' ? toInt(absentOf(list)) : 0,
    extras, penalty, expenses, paid, baseDue: m(base.next), due: m(due), bal: m(bal), legacyBaseDue: base.legacy, legacyDue, legacyBal, paidBadge: badge(m(due), paid, m(bal)) };
}
/** صف موظف (renderDuesEmployees): الخصم = employeePenalties + خصومات workerPayments للموظف */
export function employeeRow(c: Ctx, e: J, F?: string, T?: string, deptName = ''): DuesRow {
  const base = employeeDue(c, e, F, T);
  const paid = paidTotal(c, 'employee', e.id, F, T);
  const penalty = toInt(employeePenaltyTotal(c, e.id, F, T) + penaltyTotal(c, 'employee', e.id, F, T));
  const extras = extrasTotal(c, 'employee', e.id, F, T), expenses = expensesTotal(c, 'employee', e.id, F, T);
  const due = toInt(base + extras), bal = toInt(due - paid - penalty - expenses);
  return { id: e.id, code: e.code || '', name: e.name || '', departmentName: deptName, salary: e.salary ?? null, days: empDays(c, e.id, F, T), absent: empAbsent(c, e.id, F, T),
    extras, penalty, expenses, paid, baseDue: String(base), due: String(due), bal: String(bal), legacyBaseDue: base, legacyDue: due, legacyBal: bal, paidBadge: badge(due, paid, bal) };
}
/** كشف المشرف من غير مشروع (supervisorWageStatement، helpers.js:2119) — بالحساب القديم والجديد */
export function supervisorStatement(c: Ctx, s: J, F?: string, T?: string) {
  const workers = c.people.worker.filter((w) => w.supervisorId === s.id).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar', { sensitivity: 'base' }));
  const rows = workers.map((w) => {
    const list = attOf(c, 'worker', w.id, F, T);
    const base = dayDue(c, list, w);
    const extras = extrasTotal(c, 'worker', w.id, F, T), costs = costsTotal(c, 'worker', w.id, F, T);
    const paid = paidTotal(c, 'worker', w.id, F, T), penalty = penaltyTotal(c, 'worker', w.id, F, T), expenses = expensesTotal(c, 'worker', w.id, F, T);
    return { id: w.id, days: daysOf(list), base, extras, costs, paid, penalty, expenses };
  }).filter((r) => !(F || T) || r.days > 0 || r.base.legacy > 0);
  const sum = (f: (r: (typeof rows)[number]) => number) => toInt(rows.reduce((a, r) => a + (Number(f(r)) || 0), 0));
  const wBaseL = sum((r) => r.base.legacy), wBaseN = Money.sum(rows.map((r) => r.base.next.toFixed()));
  const wExtras = sum((r) => r.extras), wCosts = sum((r) => r.costs), wPaid = sum((r) => r.paid), wPen = sum((r) => r.penalty), wExp = sum((r) => r.expenses);
  const wDueL = sum((r) => toInt(r.base.legacy + r.extras));
  const wDueN = wBaseN.plus(String(wExtras));
  const own = attOf(c, 'supervisor', s.id, F, T);
  const ownBase = dayDue(c, own, s);
  const ownExtras = extrasTotal(c, 'supervisor', s.id, F, T), ownCosts = costsTotal(c, 'supervisor', s.id, F, T);
  const ownPaid = paidTotal(c, 'supervisor', s.id, F, T), ownPen = penaltyTotal(c, 'supervisor', s.id, F, T);
  const legacySup = c.supExpenses.filter((e) => e && e.supervisorId === s.id && inRange(e.date, F, T));
  const unified = c.expenses.filter((e) => e && e.personKind === 'supervisor' && e.personId === s.id && inRange(e.date, F, T) && !legacySup.some((x) => x.id === e.id));
  const ownExp = toInt([...legacySup, ...unified].reduce((a, e) => a + toInt(e.amount), 0));
  const ownDueL = toInt(ownBase.legacy + ownExtras), ownDueN = ownBase.next.plus(String(ownExtras));
  const eqIds = new Set(c.people.equipment.filter((q) => q.supervisorId === s.id).map((q) => q.id));
  const equipCost = toInt(c.eqDaily.filter((d) => eqIds.has(d.equipmentId) && inRange(d.date, F, T)).reduce((a, d) => a + equipmentDailyCost(d, c.people.equipment.find((q) => q.id === d.equipmentId)), 0));
  const equipPaid = sumInt(c.pays.filter((p) => p.personType === 'equipment' && eqIds.has(p.personId) && isActualPayment(p) && inRange(p.date, F, T)), (p) => p.amount);
  const totalPenalty = toInt(wPen + ownPen), totalExpenses = toInt(wExp + ownExp), totalPaid = toInt(wPaid + ownPaid + equipPaid);
  const totalDueL = toInt(wDueL + ownDueL + equipCost), totalDueN = wDueN.plus(ownDueN).plus(String(equipCost));
  const workersBalN = wDueN.minus(String(wPen)).minus(String(wExp)).minus(String(wPaid));
  const ownBalN = ownDueN.minus(String(ownPen)).minus(String(ownExp)).minus(String(ownPaid));
  return {
    workersBaseDue: m(wBaseN), workersExtras: wExtras, workersCosts: wCosts, workersDue: m(wDueN), workersPenalty: wPen, workersExpenses: wExp, workersPaid: wPaid, workersBal: m(workersBalN),
    ownDays: daysOf(own), ownBaseDue: m(ownBase.next), ownExtras, ownCosts, ownDue: m(ownDueN), ownPenalty: ownPen, ownExpenses: ownExp, ownPaid, ownBal: m(ownBalN),
    equipCost, equipPaid, equipBal: toInt(equipCost - equipPaid),
    totalDue: m(totalDueN), totalPenalty, totalExpenses, totalPaid, totalBal: m(totalDueN.minus(String(totalPenalty)).minus(String(totalExpenses)).minus(String(totalPaid))),
    totalDays: Math.round((rows.reduce((a, r) => a + (Number(r.days) || 0), 0) + daysOf(own)) * 100) / 100,
    legacy: { workersBaseDue: wBaseL, workersDue: wDueL, workersBal: toInt(wDueL - wPen - wExp - wPaid), ownBaseDue: ownBase.legacy, ownDue: ownDueL, ownBal: toInt(ownDueL - ownPen - ownExp - ownPaid),
      totalDue: totalDueL, totalBal: toInt(totalDueL - totalPenalty - totalExpenses - totalPaid) },
    workers: rows.map((r) => ({ id: r.id, bal: m(r.base.next.plus(String(r.extras)).minus(String(r.penalty)).minus(String(r.expenses)).minus(String(r.paid))), legacyBal: toInt(toInt(r.base.legacy + r.extras) - r.penalty - r.expenses - r.paid) })),
  };
}
export function supervisorRow(c: Ctx, s: J, F?: string, T?: string): DuesRow {
  const st = supervisorStatement(c, s, F, T);
  return { id: s.id, code: s.code || '', name: s.name || '', dailyWage: s.dailyWage ?? null, days: st.ownDays, extras: st.ownExtras, due: st.ownDue, workersDue: st.workersDue,
    expenses: st.totalExpenses, equipCost: st.equipCost, penalty: st.totalPenalty, paid: st.totalPaid, bal: st.totalBal, totalDue: st.totalDue,
    legacyDue: st.legacy.ownDue, legacyWorkersDue: st.legacy.workersDue, legacyBal: st.legacy.totalBal, legacyTotalDue: st.legacy.totalDue, paidBadge: badge(st.totalDue, st.totalPaid, st.totalBal) };
}

// ---------------- سجل الصرف والخصومات (renderDuesPaymentsList)
export function paymentsLog(c: Ctx, kind: PKind, F: string | undefined, T: string | undefined, nameOf: (k: string, id: string) => string): J[] {
  let list: J[] = [];
  if (kind === 'employee') {
    c.pays.forEach((p) => { if (p.personType === 'employee' && p.personId && inRange(p.date, F, T)) list.push({ ...p, _src: 'pay', _name: nameOf('employee', p.personId) }); });
    c.empPens.forEach((p) => { if (p.employeeId && inRange(p.date, F, T)) list.push({ id: p.id, date: p.date, amount: p.amount, notes: p.notes || '', type: 'penalty', payCategory: p.reason || 'خصم', reason: p.reason, personType: 'employee', personId: p.employeeId, _src: 'empPen', _name: nameOf('employee', p.employeeId), rev: p.rev }); });
  } else {
    list = c.pays.filter((p) => (kind === 'worker' ? p.personType === 'worker' || (!p.personType && p.workerId) : p.personType === kind) && inRange(p.date, F, T))
      .map((p) => ({ ...p, _src: 'pay', _name: nameOf(p.personType || 'worker', p.personType === 'worker' || !p.personType ? p.workerId || p.personId : p.personId) }));
  }
  return list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}
/** أعمدة السجل: نوع المستحق، والبند، والراتب، والبدلات، والنطاق */
export function logView(p: J) {
  const pen = p.type === 'penalty' || p.type === 'deduction', bonus = p.type === 'bonus' || p.type === 'allowance';
  const k = p.payKind || '';
  const typeLabel = pen ? 'خصم / جزاء' : bonus ? 'إضافة / مكافأة' : k === 'salary' ? 'راتب' : k === 'salary_bonus' ? 'راتب مع إضافات' : k === 'daily' ? 'يومية' : 'دفع مستحق';
  const item = p.payCategory || p.reason || (p.type === 'penalty' ? 'خصم' : 'دفع مستحقات');
  const salary = pen ? 0 : p.salaryAmount != null && p.salaryAmount !== '' ? toInt(p.salaryAmount) : k === 'salary' || (p.payCategory === 'راتب' && !p.isExtra) ? toInt(p.amount) : 0;
  const extras = pen ? 0 : p.extrasAmount != null && p.extrasAmount !== '' ? toInt(p.extrasAmount) : p.isExtra || (k === 'salary_bonus' && p.payCategory !== 'راتب') ? toInt(p.amount) : 0;
  const scope = p.scope === 'self' ? 'للشخص فقط' : p.scope === 'workers' ? 'توزيع على العمال' : p.scope === 'close_account' ? 'إقفال حساب كامل' : '—';
  return { typeLabel, tone: pen ? 'pen' : bonus ? 'bonus' : 'pay', item, salary, extras, scope };
}
export function logTotals(list: J[]) {
  return {
    count: list.length,
    pay: toInt(list.filter((p) => !['penalty', 'deduction', 'bonus', 'allowance'].includes(p.type)).reduce((s, p) => s + toInt(p.amount), 0)),
    penalty: toInt(list.filter((p) => p.type === 'penalty' || p.type === 'deduction').reduce((s, p) => s + toInt(p.amount), 0)),
  };
}
export { smartMatch } from '../common/smart-search';
