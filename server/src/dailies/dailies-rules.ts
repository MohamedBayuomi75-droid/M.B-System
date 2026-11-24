/**
 * قواعد اليوميات وحضور الموظفين (8.5.4، DEC-0135) — **نقل حرفي من الواجهة القديمة** للعرض والحفظ (pages-worker-attendance.js،
 * pages-attendance.js، helpers.js)، والمقارنة بالدوال القديمة نفسها في tests-merge/phase82.js. **والحساب الجديد بقرارك** (DEC-0129/0130):
 *  - القديم (legacyNet) = attendanceNetPay: round2(الأجر × الأيام) − الخصم ≥ 0 — للمرجع وتقرير الفرق بس (د-2).
 *  - الجديد (newNet) = F-08: Money(الأجر × الأيام × معامل الحالة) مقرّب بـ MONEY_SCALE (6، DEC-0112) − الخصم ≥ 0. ومعامل الحالة: حاضر/متأخر/نصف يوم
 *    (على أيام ½) = 1، وغائب/عطلة = 0، وأي حالة تانية ← مراجعة. واليوميات المعلّمة للمراجعة (DEC-0133) مستحقها 0 لحد القرار، و«تتحسب» بيرجّع الحساب.
 */
import { Money } from '../common/money';
import { smartMatch } from '../common/smart-search';
import type { J } from '../workers/worker-rules';

export type DKind = 'worker' | 'supervisor' | 'driver';
export const KIND_COLL: Record<DKind, string> = { worker: 'workers', supervisor: 'supervisors', driver: 'drivers' };
export const TAB_KIND: Record<string, DKind> = { workers: 'worker', supervisors: 'supervisor', drivers: 'driver' };
export const ATTENDANCE_STATUS = [{ code: 'present', label: 'حاضر' }, { code: 'absent', label: 'غائب' }, { code: 'late', label: 'متأخر' }, { code: 'half', label: 'نصف يوم' }, { code: 'holiday', label: 'عطلة' }];
const KNOWN = new Set(ATTENDANCE_STATUS.map((s) => s.code));
export type People = Record<DKind, J[]>;

// ---------------- القديم: صاحب اليومية (attType / attPersonId)
export const attPersonId = (a: J): string => (a ? a.personId || a.workerId || a.driverId || a.supervisorId || '' : '');
export function attType(a: J, people: People): DKind {
  if (!a) return 'worker';
  const t = String(a.personType || a.personKind || a.kind || '').toLowerCase();
  if (t === 'worker' || t === 'supervisor' || t === 'driver') return t;
  const id = attPersonId(a);
  if (id) {
    if (people.worker.some((x) => x.id === id)) return 'worker';
    if (people.driver.some((x) => x.id === id)) return 'driver';
    if (people.supervisor.some((x) => x.id === id)) return 'supervisor';
  }
  if (a.driverId && !a.workerId) return 'driver';
  return 'worker';
}
export const ownerOf = (a: J, people: People): J | undefined => people[attType(a, people)].find((x) => x.id === attPersonId(a));

// ---------------- القديم: الحساب (للمرجع وتقرير الفرق)
export function round2(n: unknown): number { const x = Number(n); if (!Number.isFinite(x)) return 0; return Math.round((x + (x < 0 ? -Number.EPSILON : Number.EPSILON)) * 100) / 100; }
/** toInt (helpers.js): رقم ← round2، ونص بالأرقام العربية ← رقم */
export function toInt(n: unknown): number {
  if (n == null || n === '') return 0;
  if (typeof n === 'number') return Number.isFinite(n) ? round2(n) : 0;
  let s = String(n).trim().replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  s = s.replace(/٫/g, '.').replace(/[٬،]/g, '').replace(/,/g, '').replace(/[^\d.-]/g, '');
  const x = Number(s); return Number.isFinite(x) ? round2(x) : 0;
}
export const isPayable = (status: unknown) => { const s = String(status || '').toLowerCase(); return s !== 'absent' && s !== 'holiday'; };
export function daysCredit(a: J): number {
  if (!a || !isPayable(a.status)) return 0;
  const st = String(a.status || '').toLowerCase();
  let d = Number(a.days);
  if (!Number.isFinite(d) || d <= 0) d = st === 'half' ? 0.5 : 1;
  else if (st === 'half' && d >= 1) d = 0.5;
  return Math.round(d * 100) / 100;
}
export function dayWage(a: J, owner: J | undefined): number {
  if (a && a.dayWage != null && a.dayWage !== '' && Number.isFinite(Number(a.dayWage))) return toInt(a.dayWage);
  return toInt(owner && owner.dailyWage);
}
export function legacyNet(a: J, owner: J | undefined): number {
  if (!a || !isPayable(a.status)) return 0;
  let total = round2(dayWage(a, owner) * daysCredit(a));
  const ded = toInt(a.deduction);
  if (ded > 0) total = Math.max(0, total - ded);
  return toInt(total);
}
/** fmtDays (helpers.js): ½ و¼ و¾، وأي كسر تاني بالأرقام */
export function fmtDays(n: unknown): string {
  const x = Number(n) || 0; if (!x) return '0';
  const r = Math.round(x * 100) / 100;
  if (Math.abs(r - Math.round(r)) < 0.005) return String(Math.round(r));
  const whole = Math.floor(r), frac = Math.round((r - whole) * 100) / 100;
  const sym = frac === 0.5 ? '½' : frac === 0.25 ? '¼' : frac === 0.75 ? '¾' : '';
  if (sym) return whole === 0 ? sym : `${whole}${sym}`;
  return String(r);
}
/** fmtAttendanceDays (helpers.js) */
export function fmtAttendanceDays(a: J): string {
  if (!a) return '—';
  const st = String(a.status || '').toLowerCase();
  if (st === 'absent' || st === 'holiday') return '0';
  const c = daysCredit(a);
  if (!c) return '0';
  if (Math.abs(c - 0.5) < 0.001) return '½';
  if (Math.abs(c - Math.round(c)) < 0.001) return String(Math.round(c));
  return fmtDays(c);
}

// ---------------- المراجعة (DEC-0133) والجديد (DEC-0129/0130)
export type Flag = 'duplicate' | 'orphan' | 'zeroWage' | 'unknownStatus';
export const FLAG_LABEL: Record<Flag, string> = { duplicate: 'مكررة (نفس الشخص ونفس اليوم ونفس المشروع)', orphan: 'صاحبها مش موجود', zeroWage: 'أجر صفر', unknownStatus: 'حالة مش معروفة' };
/** أسباب المراجعة لكل يومية: المكررة (التانية وبعدها بترتيب الإنشاء — TR-08: نفس الشخص ونفس اليوم ونفس المشروع)، واليتيمة، وبأجر صفر، وبحالة مش معروفة */
export function flagsOf(all: J[], people: People): Map<string, Flag[]> {
  const out = new Map<string, Flag[]>();
  const seen = new Set<string>();
  for (const a of all) {
    const f: Flag[] = [];
    const k = `${attType(a, people)}|${attPersonId(a)}|${a.date}|${String(a.project || '').trim()}`;
    if (seen.has(k)) f.push('duplicate'); else seen.add(k);
    const owner = ownerOf(a, people);
    if (!owner) f.push('orphan');
    if (isPayable(a.status) && dayWage(a, owner) === 0) f.push('zeroWage');
    if (!KNOWN.has(String(a.status || '').toLowerCase())) f.push('unknownStatus');
    if (f.length) out.set(a.id, f);
  }
  return out;
}
/** F-08 الجديد: الأجر × الأيام × المعامل، مقرّب، ناقص الخصم، بحد أدنى صفر. pending = معلّمة ومستنية قرار */
export function newNet(a: J, owner: J | undefined, flags: Flag[] = []): { net: string; pending: boolean } {
  const decision = String(a.reviewDecision || '');
  if (decision === 'void') return { net: '0', pending: false };
  if (flags.length && decision !== 'count') return { net: '0', pending: true };
  const st = String(a.status || '').toLowerCase();
  if (st === 'absent' || st === 'holiday') return { net: '0', pending: false };
  const base = Money.of(String(dayWage(a, owner))).times(String(daysCredit(a))).round();
  const v = base.minus(String(toInt(a.deduction)));
  return { net: (v.isNegative() ? Money.zero() : v).toFixed().replace(/\.?0+$/, '') || '0', pending: false };
}

// ---------------- الجدول (wattPeopleList / wattRecordsForPerson)
export interface GridFilters { tab?: string; dept?: string; from?: string; to?: string; supervisorId?: string; project?: string; site?: string; status?: string; q?: string }
const sortAr = (xs: J[]) => xs.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar', { sensitivity: 'base' }));
export function recordsFor(all: J[], people: People, kind: DKind, id: string, from: string, to: string, f: GridFilters): J[] {
  const proj = String(f.project || '').trim(), sf = String(f.site || '').trim(), stF = String(f.status || '');
  return all.filter((a) => {
    if ((a.date || '') < from || (a.date || '') > to) return false;
    if (proj && String(a.project || '').trim() !== proj) return false;
    if (sf && String(a.site || '').trim() !== sf) return false;
    if (stF && String(a.status || '').toLowerCase() !== stF.toLowerCase()) return false;
    if (kind === 'worker') return (a.personType === 'worker' || !a.personType) && (a.workerId === id || a.personId === id);
    return a.personType === kind && a.personId === id;
  });
}
export function peopleList(all: J[], people: People, f: GridFilters, from: string, to: string, supName: (id: string) => string): { kind: DKind; id: string; name: string; code: string; extra: string }[] {
  const type = TAB_KIND[f.tab || ''] || '';
  const proj = String(f.project || '').trim(), siteF = String(f.site || '').trim();
  const q = String(f.q || '').trim().toLowerCase();
  const hasProjectLink = (kind: DKind, id: string) => {
    if (!proj) return true;
    if (people[kind].some((p) => p.id === id && String(p.project || '').trim() === proj)) return true;
    return all.some((a) => String(a.project || '').trim() === proj && !((from && (a.date || '') < from) || (to && (a.date || '') > to))
      && (kind === 'worker' ? (a.personType === 'worker' || !a.personType) && (a.workerId === id || a.personId === id) : a.personType === kind && a.personId === id));
  };
  const hasSite = (kind: DKind, id: string) => !siteF || all.some((a) => String(a.site || '').trim() === siteF && !((from && (a.date || '') < from) || (to && (a.date || '') > to))
    && (kind === 'worker' ? (a.personType === 'worker' || !a.personType) && (a.workerId === id || a.personId === id) : a.personType === kind && a.personId === id));
  const out: { kind: DKind; id: string; name: string; code: string; extra: string }[] = [];
  const match = (p: J) => !q || smartMatch(p.name, q) || smartMatch(p.code, q) || smartMatch(p.project, q);
  if (!type || type === 'worker') {
    let ws = people.worker.filter((w) => w.status === 'active' || !w.status);
    if (f.supervisorId) ws = ws.filter((w) => String(w.supervisorId || '') === String(f.supervisorId));
    ws = ws.filter(match).filter((w) => hasProjectLink('worker', w.id)).filter((w) => hasSite('worker', w.id));
    for (const w of sortAr(ws)) out.push({ kind: 'worker', id: w.id, name: w.name, code: w.code, extra: supName(w.supervisorId) });
  }
  if (!type || type === 'supervisor') {
    let ss = people.supervisor.filter((s) => s.status !== 'inactive').filter(match);
    if (f.supervisorId) ss = ss.filter((s) => String(s.id) === String(f.supervisorId));
    ss = ss.filter((s) => hasProjectLink('supervisor', s.id)).filter((s) => hasSite('supervisor', s.id));
    for (const s of sortAr(ss)) out.push({ kind: 'supervisor', id: s.id, name: s.name, code: s.code, extra: 'مشرف' });
  }
  if (!type || type === 'driver') {
    const ds = people.driver.filter((d) => d.status !== 'inactive').filter(match).filter((d) => hasProjectLink('driver', d.id)).filter((d) => hasSite('driver', d.id));
    for (const d of sortAr(ds)) out.push({ kind: 'driver', id: d.id, name: d.name, code: d.code, extra: 'سائق' });
  }
  return out;
}
/** wattMonthBounds: الفترة (حد أقصى 62 يوم) والأيام */
export function bounds(from: string, to: string): { from: string; to: string; dates: string[] } {
  if (to < from) { const t = from; from = to; to = t; }
  const d0 = Date.parse(`${from}T00:00:00Z`);
  let count = Math.round((Date.parse(`${to}T00:00:00Z`) - d0) / 86400000) + 1;
  if (count > 62) { count = 62; to = new Date(d0 + 61 * 86400000).toISOString().slice(0, 10); }
  return { from, to, dates: Array.from({ length: count }, (_, i) => new Date(d0 + i * 86400000).toISOString().slice(0, 10)) };
}

// ---------------- الحفظ (doSaveWatt)
export interface DailyForm { personType?: string; personId?: string; date?: string; status?: string; days?: string; dayWage?: string; deduction?: string; project?: string; site?: string; notes?: string }
export function dailyPayload(f: DailyForm, people: People, projectIdOf: (name: string) => string): J | string {
  const personType = String(f.personType || 'worker') as DKind;
  const personId = String(f.personId || '');
  const date = String(f.date || '');
  if (!personId) return 'اختر الشخص / المعدة';
  if (!date) return 'حدد التاريخ';
  const status = String(f.status || '') || 'present';
  let days = Number(f.days) || 0;
  if (status === 'absent' || status === 'holiday') days = 0;
  else if (days <= 0) return 'أدخل عدد الأيام (مثال 1 أو 2 أو 0.5)';
  const dayWageV = toInt(f.dayWage);
  const deduction = status === 'late' ? toInt(f.deduction) : 0;
  const project = String(f.project || '').trim();
  if (!project) return 'اختر المشروع';
  const p: J = { personType, personId, date, status, days, dayWage: dayWageV, deduction, project, site: String(f.site || '').trim(), notes: String(f.notes || '').trim() };
  if (personType === 'worker') { p.workerId = personId; const w = people.worker.find((x) => x.id === personId); p.supervisorId = w ? w.supervisorId || '' : ''; }
  else if (personType === 'supervisor') { p.workerId = ''; p.supervisorId = personId; }
  else { p.workerId = ''; p.supervisorId = ''; }
  // الجديدة بتحفظ معرّف المشروع كمان (القديمة بالاسم بس — DAILIES_ACCEPTANCE §4-2)
  const pid = projectIdOf(project); if (pid) p.projectId = pid;
  return p;
}

// ---------------- حضور الموظفين (filteredAttendance / openAttendanceModal)
export interface AttFilters { departmentId?: string; employeeId?: string; status?: string; from?: string; to?: string; q?: string }
export function filterAttendance(all: J[], employees: J[], f: AttFilters): J[] {
  let list = all.slice();
  if (f.departmentId) { const ids = new Set(employees.filter((e) => e.departmentId === f.departmentId).map((e) => e.id)); list = list.filter((a) => ids.has(a.employeeId)); }
  if (f.employeeId) list = list.filter((a) => a.employeeId === f.employeeId);
  if (f.status) list = list.filter((a) => a.status === f.status);
  if (f.from) list = list.filter((a) => (a.date || '') >= (f.from as string));
  if (f.to) list = list.filter((a) => (a.date || '') <= (f.to as string));
  if (f.q) { const q = String(f.q).trim().toLowerCase(); const name = (id: string) => { const e = employees.find((x) => x.id === id); return e ? e.name || e.code || id : '—'; }; list = list.filter((a) => smartMatch(name(a.employeeId), q) || smartMatch(a.notes, q)); }
  return list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}
export interface AttForm { employeeId?: string; date?: string; status?: string; checkIn?: string; checkOut?: string; notes?: string }
export function attendancePayload(f: AttForm): J | string {
  if (!f.employeeId) return 'اختر الموظف';
  if (!f.date) return 'حدد التاريخ';
  return { employeeId: f.employeeId, date: f.date, status: f.status || 'present', checkIn: f.checkIn || '', checkOut: f.checkOut || '', notes: String(f.notes || '').trim() };
}
