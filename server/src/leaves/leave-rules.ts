/**
 * قواعد الإجازات (8.4.4، DEC-0127) — **نقل حرفي من الواجهة القديمة**، والمقارنة بالدوال القديمة نفسها في tests-merge/phase80.js:
 *  - القايمة filteredLeaves، والاسم leavePersonName، والفئة leaveKindLabel، والكروت (renderLeavesPage)
 *  - calcLeaveDays (ومن غير الجمعة لو settings.leaveExcludeFridays)
 *  - الحفظ (openLeaveModal → btnSaveLv): الجديد «قيد الانتظار»، والتعديل بيحافظ على الحالة، وemployeeId للموظف بس
 *  - syncLeaveStatuses (extras.js) لكل الأنواع — بقرار د-2 السيرفر بيطبّقها بعد أي تغيير في الإجازات ومرة كل يوم
 *  - employeeLeaveUsed / employeeLeaveBalance (helpers.js)
 */
import { smartMatch } from '../common/smart-search';
import { activeLeaveOf, J } from '../workers/worker-rules';

export type LeaveKind = 'employee' | 'worker' | 'supervisor' | 'driver';
export const KINDS: LeaveKind[] = ['employee', 'worker', 'supervisor', 'driver'];
export const KIND_COLL: Record<LeaveKind, string> = { employee: 'employees', worker: 'workers', supervisor: 'supervisors', driver: 'drivers' };
/** LEAVE_TYPES / LEAVE_STATUS (state.js) */
export const LEAVE_TYPES = [{ code: 'annual', label: 'إجازة سنوية' }, { code: 'sick', label: 'إجازة مرضية' }, { code: 'unpaid', label: 'إجازة بدون راتب' },
  { code: 'maternity', label: 'إجازة أمومة' }, { code: 'emergency', label: 'إجازة طارئة' }, { code: 'other', label: 'أخرى' }];
export const LEAVE_STATUS = [{ code: 'pending', label: 'قيد الانتظار' }, { code: 'approved', label: 'موافق عليها' }, { code: 'rejected', label: 'مرفوضة' }, { code: 'cancelled', label: 'ملغاة' }];
export const labelOf = (list: { code: string; label: string }[], v: unknown) => (list.find((o) => o.code === v) || { label: '' }).label;
export const kindOf = (l: J): string => l.personKind || l.kind || 'employee';
export const pidOf = (l: J): string => l.personId || l.employeeId || '';
/** leaveKindLabel */
export const kindLabel = (k: unknown) => ({ employee: 'موظف', worker: 'عامل', supervisor: 'مشرف', driver: 'سائق' } as Record<string, string>)[String(k)] || 'موظف';

export type People = Record<LeaveKind, J[]>;
/** leavePersonName: employeeName / workerName / supervisorName («—» لو مش موجود)، وdriverName (الاسم بس، و'' لو مش موجود) */
export function personName(people: People, l: J): string {
  const kind = kindOf(l), id = pidOf(l);
  const by = (k: LeaveKind, pid: string) => people[k].find((x) => x.id === pid);
  if (kind === 'worker' || kind === 'supervisor') { const p = by(kind, id); return p ? p.name || p.code || id : '—'; }
  if (kind === 'driver') { const d = by('driver', id); return d ? d.name : ''; }
  const eid = id || l.employeeId; const e = by('employee', eid); return e ? e.name || e.code || eid : '—';
}

// ---------------- القايمة
export interface LeaveFilters { personKind?: string; employeeId?: string; type?: string; status?: string; from?: string; to?: string; q?: string }
export function filterLeaves(all: J[], f: LeaveFilters, people: People): J[] {
  let list = all.slice();
  if (f.personKind) list = list.filter((l) => kindOf(l) === f.personKind);
  if (f.employeeId) list = list.filter((l) => pidOf(l) === f.employeeId);
  if (f.type) list = list.filter((l) => l.type === f.type);
  if (f.status) list = list.filter((l) => l.status === f.status);
  if (f.from) list = list.filter((l) => (l.from || '') >= (f.from as string));
  if (f.to) list = list.filter((l) => (l.to || '') <= (f.to as string));
  if (f.q) {
    const q = String(f.q).trim().toLowerCase();
    list = list.filter((l) => { const nm = (personName(people, l) || '').toLowerCase(); return smartMatch(nm, q) || smartMatch(l.reason, q) || smartMatch(l.code, q); });
  }
  return list.sort((a, b) => String(b.from || '').localeCompare(String(a.from || '')));
}
export const cards = (rows: J[]) => ({ total: rows.length, pending: rows.filter((l) => l.status === 'pending').length, approved: rows.filter((l) => l.status === 'approved').length, rejected: rows.filter((l) => l.status === 'rejected').length });

// ---------------- الأيام (calcLeaveDays: new Date(x+'T12:00:00') — بالـ UTC هنا علشان ميعتمدش على منطقة السيرفر، والفرق بالأيام هو هو)
const DAY = 24 * 3600 * 1000;
export function calcLeaveDays(from: unknown, to: unknown, excludeFridays: boolean): number {
  if (!from || !to) return 1;
  const a = Date.parse(`${from}T12:00:00Z`), b = Date.parse(`${to}T12:00:00Z`);
  const total = Math.round((b - a) / DAY) + 1;
  if (total <= 0) return 1;
  if (excludeFridays) {
    let n = 0;
    for (let i = 0; i < total; i++) if (new Date(a + i * DAY).getUTCDay() !== 5) n++;
    return n > 0 ? n : 1;
  }
  return total; // NaN لو التاريخ مش صالح — زي القديمة بالظبط
}

// ---------------- الحفظ
export interface LeaveForm { personKind?: string; personId?: string; type?: string; from?: string; to?: string; days?: string; reason?: string }
/** btnSaveLv: الطلب الجديد «قيد الانتظار»، والتعديل بيحافظ على الحالة (Object.assign على السجل القديم — المفاتيح التانية بتفضل) */
export function leavePayload(f: LeaveForm, cur: J | null, id: string, excludeFridays: boolean): J {
  const kind = String(f.personKind || 'employee');
  const pid = String(f.personId || '');
  const from = String(f.from ?? ''), to = String(f.to ?? '');
  const days = Number(f.days) || calcLeaveDays(from, to, excludeFridays);
  const rec: J = { id: cur ? cur.id : id, personKind: kind, personId: pid, employeeId: kind === 'employee' ? pid : (cur && cur.employeeId) || '',
    type: String(f.type ?? ''), from, to, days, reason: String(f.reason || '').trim(), status: cur ? cur.status || 'pending' : 'pending' };
  return cur ? Object.assign(JSON.parse(JSON.stringify(cur)), rec) : rec;
}

// ---------------- الحالة ← الإجازة (syncLeaveStatuses)
/** بيرجّع السجلات اللي اتغيّرت بس (نسخ معدّلة) لكل نوع */
export function syncStatuses(people: People, leaves: J[], today: string): { kind: LeaveKind; rec: J }[] {
  const c = { leaves, today } as unknown as Parameters<typeof activeLeaveOf>[0];
  const out: { kind: LeaveKind; rec: J }[] = [];
  for (const kind of KINDS) {
    for (const p of people[kind]) {
      if (!p) continue;
      const on = !!activeLeaveOf(c, p.id, kind);
      if (on && (p.status === 'active' || !p.status)) out.push({ kind, rec: { ...p, status: 'on_leave', leaveAuto: true } });
      else if (!on && p.status === 'on_leave' && p.leaveAuto) out.push({ kind, rec: { ...p, status: 'active', leaveAuto: false } });
    }
  }
  return out;
}

// ---------------- الرصيد (employeeLeaveUsed / employeeLeaveBalance)
/** parseLocalDate → رقم يوم (UTC) أو null */
function dayNo(d: unknown): number | null {
  if (d == null || d === '') return null;
  const s = String(d).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]) / DAY;
  const t = Date.parse(s); if (Number.isNaN(t)) return null;
  const dt = new Date(t); return Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) / DAY;
}
export function leaveUsed(leaves: J[], empId: string, year: number, excludeFridays: boolean): number {
  const y0 = Date.UTC(year, 0, 1) / DAY, y1 = Date.UTC(year, 11, 31) / DAY;
  const total = leaves.filter((l) => l.employeeId === empId && l.status === 'approved' && l.type === 'annual').reduce((s, l) => {
    const days = Number(l.days) || (l.from && l.to ? calcLeaveDays(l.from, l.to, excludeFridays) : 0);
    const a = dayNo(l.from), b = dayNo(l.to || l.from);
    if (a == null || b == null || b < a) return s + (String(l.from || '').startsWith(String(year)) ? days : 0);
    // الإجازة اللي بتعدّي رأس السنة بتتوزّع على السنتين بنسبة الأيام
    const span = Math.round(b - a) + 1;
    const lo = a > y0 ? a : y0, hi = b < y1 ? b : y1;
    const overlap = hi >= lo ? Math.round(hi - lo) + 1 : 0;
    return s + (days * overlap) / span;
  }, 0);
  return Math.round(total * 100) / 100;
}
export function leaveBalance(emp: J | undefined, leaves: J[], year: number, defaultDays: number, excludeFridays: boolean): number {
  if (!emp) return 0;
  const total = Number(emp.leaveBalance != null ? emp.leaveBalance : defaultDays || 21);
  return Math.round((total - leaveUsed(leaves, emp.id, year, excludeFridays)) * 100) / 100;
}
