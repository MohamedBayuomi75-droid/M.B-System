/**
 * قواعد المشرفين والسواقين (8.2.4، DEC-0123) — **نقل حرفي من الواجهة القديمة**، والمقارنة بالدوال القديمة نفسها في tests-merge/phase76.js.
 * المشترك مع العمال جاي من worker-rules.ts (اتعمّم بالنوع في 8.2: الملاحظات، والأوراق، والعلامة، واللوحات، والأرشيف، والكروت).
 *  - القايمة: filteredSupervisors (pages-supervisors.js)، وقايمة السواقين جوه renderDriversPage (pages-ops.js) — **بترتيب خطوات مختلف**
 *    (الترتيب بالاسم الأول، والحالة الفاضية = «نشط»)، والفلاتر الإضافية (applyExtraPersonFilters ومنها الرخصة xLic).
 *  - الكروت (_entityStatCardsBase + _builtinExtraCards): المشرفين بـ «عمال تابعون»، والسواقين بـ «رخص منتهية».
 *  - الحفظ: openSupervisorModal، وopenDriverModal (سواق الشركة)، وopenExternalDriverModal (**من غير دمج**).
 * الموظفين (8.3.4، DEC-0125) — pages-employees.js وmodals-employees.js، والمقارنة في tests-merge/phase78.js:
 *  - القايمة filteredEmployees (ومنها فلاتر قسم المستقيلين الخاصة: التأمين، وسنة الاستقالة)، والكروت (وكروت قسم المستقيلين الخاصة الأربعة).
 *  - الحفظ openEmployeeModal: **مفيش قسم بيتحفظ** (personDeptOnSave مش بيتنادى)، ومفيش خانة تاريخ استقالة، ورصيد الإجازة زي ما هو (د-4).
 */
import { smartPersonBlob, smartSearchList } from '../common/smart-search';
import {
  byNameAr, Card, cardParts, Ctx, DEPT_NONE, deptName, entityDepartmentId, entityNoDeptOrJob, ensureUniqueCode, expiryState, hasDoc, isoOf, isResignedDeptId,
  isResignedStatus, J, mergePerson, requiredDocs, resignedDeptOf, retiredDeptOf, sectionCards, statusFromExpiry, supName, toInt, xInsNorm,
} from '../workers/worker-rules';

export type PeopleKind = 'supervisor' | 'driver' | 'employee';
export const COLL_OF: Record<PeopleKind, 'supervisors' | 'drivers' | 'employees'> = { supervisor: 'supervisors', driver: 'drivers', employee: 'employees' };
/** EMPLOYMENT_TYPES (state.js) وINSURANCE_STATUS_OPTS (helpers.js) */
export const EMPLOYMENT_TYPES = [{ code: 'full', label: 'دوام كامل' }, { code: 'part', label: 'دوام جزئي' }, { code: 'contract', label: 'عقد مؤقت' }, { code: 'intern', label: 'تدريب' }];
export const INSURANCE_STATUS_OPTS = [{ code: 'insured', label: 'مؤمَّن' }, { code: 'none', label: 'غير مؤمن عليه' }, { code: 'pending', label: 'قيد التسجيل' }];
export const EXT_DEPT = '__core_drivers_ext__';

/** coreDeptIdFor('supervisors' | 'drivers', p) */
export const coreDeptOf = (kind: PeopleKind, p: J) => (kind === 'employee' ? '__core_employees__' : kind === 'supervisor' ? '__core_supervisors__' : p && p.external ? EXT_DEPT : '__core_drivers__');

// ---------------- القايمة
export interface PeopleFilters {
  q?: string; status?: string; departmentId?: string; xCard?: string; xLic?: string; xIns?: string; xDocs?: string; xData?: string;
  /** الموظفين: نوع التوظيف، والوظيفة، وفلاتر قسم المستقيلين (حالة التأمين، وسنة الاستقالة / الإحالة) */
  employmentType?: string; position?: string; insuranceStatus?: string; resignYear?: string;
}
const deptFilter = (list: J[], deptF: string) => (!deptF ? list : deptF === DEPT_NONE || deptF === 'none' ? list.filter((e) => entityNoDeptOrJob(e)) : list.filter((e) => entityDepartmentId(e) === deptF));
/** xHasLicenseAny: تاريخ رخصة، أو مستند «صورة الرخصة الشخصية» */
const hasLicenseAny = (c: Ctx, p: J) => !!p.licenseExpiry || hasDoc(c, p, { code: 'driver_license_img', label: 'صورة الرخصة الشخصية' });
/** xMissingDocLabels(kind, p) */
function missingDocLabels(c: Ctx, kind: PeopleKind, p: J): string[] {
  const dismissed = new Set((p.dismissedNotes || []).map((x: unknown) => String(x).trim()));
  const list = isResignedStatus(p.status) ? requiredDocs(c, 'resigned') : requiredDocs(c, kind);
  return list.filter((d) => !hasDoc(c, p, d)).map((d) => d.label).filter((l) => !dismissed.has(`ناقص: ${l}`));
}
/** applyExtraPersonFilters(kind, list, f) */
export function extraFilters(c: Ctx, kind: PeopleKind, list: J[], f: PeopleFilters): J[] {
  if (!['xCard', 'xLic', 'xIns', 'xDocs', 'xData'].some((k) => f[k as keyof PeopleFilters])) return list;
  let out = list;
  if (f.xCard) out = out.filter((p) => expiryState(p.idCardExpiry, c.today, c.soonDays) === f.xCard);
  if (f.xLic) out = f.xLic === 'nolic' ? out.filter((p) => !hasLicenseAny(c, p)) : out.filter((p) => expiryState(p.licenseExpiry, c.today, c.soonDays) === f.xLic);
  if (f.xIns) out = out.filter((p) => xInsNorm(p.insuranceStatus) === f.xIns);
  if (f.xDocs) out = out.filter((p) => { const has = missingDocLabels(c, kind, p).length > 0; return f.xDocs === 'missing' ? has : !has; });
  if (f.xData) out = out.filter((p) => [!String(p.nationalId || p.idNumber || '').trim(), !String(p.phone || p.mobile || '').trim(), !String(p.address || '').trim()].some(Boolean));
  return out;
}
const search = (c: Ctx, list: J[], q: string) => smartSearchList(list, q, (r) => smartPersonBlob(r, (id) => deptName(c, id), (id) => supName(c, id)));
/** filteredSupervisors: القسم ← الحالة ← البحث ← الفلاتر الإضافية ← الترتيب بالاسم (لو مفيش بحث) */
export function filterSupervisors(c: Ctx, all: J[], f: PeopleFilters): J[] {
  let list = deptFilter(all.slice(), f.departmentId || '');
  if (f.status) list = list.filter((s) => s.status === f.status);
  if (f.q) list = search(c, list, f.q);
  list = extraFilters(c, 'supervisor', list, f);
  return f.q && String(f.q).trim() ? list : byNameAr(list);
}
/** renderDriversPage: الترتيب بالاسم ← البحث ← الفلاتر الإضافية ← الحالة (الفاضية = «نشط») ← القسم */
export function filterDrivers(c: Ctx, all: J[], f: PeopleFilters): J[] {
  const q = String(f.q || '').trim().toLowerCase();
  let list = byNameAr(all);
  if (q) list = search(c, list, q);
  list = extraFilters(c, 'driver', list, f);
  if (f.status) list = list.filter((d) => (d.status || 'active') === f.status);
  return deptFilter(list, f.departmentId || '');
}

/** filteredEmployees: القسم ← (قسم المستقيلين: التأمين وسنة الاستقالة) ← الحالة ونوع التوظيف (برا القسم) ← الوظيفة ← البحث ← الفلاتر الإضافية ← الترتيب بالاسم (لو مفيش بحث) */
export function filterEmployees(c: Ctx, all: J[], f: PeopleFilters): J[] {
  const deptF = f.departmentId || '';
  let list = deptFilter(all.slice(), deptF);
  const inRes = isResignedDeptId(deptF);
  if (inRes) {
    if (f.insuranceStatus) list = list.filter((e) => String(e.insuranceStatus || '') === f.insuranceStatus);
    if (f.resignYear) list = list.filter((e) => String((deptF.indexOf('__retired_') === 0 ? e.retiredAt : e.resignedAt || e.resignDate) || '').slice(0, 4) === String(f.resignYear));
  }
  if (f.status && !inRes) list = list.filter((e) => e.status === f.status);
  if (f.employmentType && !inRes) list = list.filter((e) => e.employmentType === f.employmentType);
  if (f.position) list = list.filter((e) => String(e.position || e.job || '').trim() === f.position);
  if (f.q) list = search(c, list, f.q);
  list = extraFilters(c, 'employee', list, f);
  return f.q && String(f.q).trim() ? list : byNameAr(list);
}
/** خيارات فلتر الوظيفة (من كل الموظفين) وسنين قسم المستقيلين (resignedEmployeesFiltersHtml) */
export const employeePositions = (all: J[]) => Array.from(new Set(all.map((e) => String(e.position || e.job || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar'));
export const employeeResignYears = (all: J[], retired: boolean) => Array.from(new Set(all.map((e) => String(retired ? e.retiredAt || '' : e.resignedAt || e.resignDate || '').slice(0, 4)).filter((y) => /^\d{4}$/.test(y)))).sort().reverse();

// ---------------- الكروت
/** resignedEmployeesCardsHtml: كروت قسم المستقيلين (والمعاشات) الخاصة بالموظفين — 4 كروت */
export function employeeSectionCards(c: Ctx, rows: J[], retired: boolean): Card[] {
  const yr = c.today.slice(0, 4);
  const rd = (e: J) => String(retired ? e.retiredAt || '' : e.resignedAt || e.resignDate || '').slice(0, 10);
  let months = 0, cnt = 0;
  for (const e of rows) { const h = String(e.hireDate || '').slice(0, 10), r = rd(e); if (h && r && r >= h) { months += (Date.parse(r) - Date.parse(h)) / (1000 * 60 * 60 * 24 * 30.4375); cnt++; } }
  const avg = cnt ? months / cnt : 0;
  const avgTxt = !cnt ? '—' : avg >= 12 ? `${Math.round((avg / 12) * 10) / 10} سنة` : `${Math.round(avg)} شهر`;
  const noDate = rows.filter((e) => !rd(e)).length;
  return [
    { ico: retired ? '🏖️' : '🚪', label: retired ? 'عدد المتقاعدين' : 'عدد المستقيلين', value: rows.length },
    { ico: '📅', label: retired ? 'أُحيلوا للمعاش هذا العام' : 'استقالوا هذا العام', value: rows.filter((e) => rd(e).slice(0, 4) === yr).length, tone: 'ok' },
    { ico: '⏳', label: 'متوسط مدة الخدمة', value: avgTxt },
    { ico: '❗', label: retired ? 'بدون تاريخ إحالة' : 'بدون تاريخ استقالة', value: noDate, tone: noDate ? 'warn' : '' },
  ];
}
/** workersOfSupervisor: كل العمال المربوطين (والمستقيل كمان) */
export const workersOf = (workers: J[], supId: string) => (supId ? workers.filter((w) => w.supervisorId === supId).length : 0);
export function peopleCards(c: Ctx, kind: PeopleKind, rows: J[], deptF: string, workers: J[]): Card[] {
  if (kind === 'employee') {
    if (isResignedDeptId(deptF)) return employeeSectionCards(c, rows, deptF.indexOf('__retired_') === 0);
    const e = cardParts(c, kind, rows);
    return [{ ico: '👔', label: 'عدد الموظفين', value: rows.length }, e.active, e.insurance, e.license, e.contract, e.idCard, e.payTotal];
  }
  if (deptF === retiredDeptOf(kind)) return sectionCards(c, rows, 'retired');
  if (deptF && /^__resigned_/.test(deptF)) return sectionCards(c, rows, 'resigned');
  const k = cardParts(c, kind, rows);
  if (kind === 'supervisor') {
    return [{ ico: '👷', label: 'عدد المشرفين', value: rows.length }, k.active, { ico: '🧑‍🔧', label: 'عمال تابعون', value: rows.reduce((s, x) => s + workersOf(workers, x.id), 0) },
      k.insurance, k.license, k.contract, k.idCard, k.dailySum];
  }
  const expired = (x: J) => ['idCardExpiry', 'licenseExpiry', 'vehicleLicenseExpiry', 'driverLicenseExpiry', 'insuranceExpiry', 'contractEnd'].some((kk) => x[kk] && statusFromExpiry(x[kk], c.today) === 'expired');
  const ex = rows.filter(expired).length;
  return [{ ico: '🧑‍🚒', label: 'عدد السائقين', value: rows.length }, k.active, { ico: '🪪', label: 'رخص منتهية', value: ex, tone: ex ? 'warn' : '' },
    k.insurance, k.license, k.contract, deptF === EXT_DEPT ? k.dailySum : k.payTotal];
}

// ---------------- الحفظ
/** بيانات النافذة (نفس خانات النوافذ القديمة) */
export interface PeopleForm {
  code?: string; name?: string; status?: string; resignedAt?: string; position?: string; nationalId?: string; birthDate?: string; idCardExpiry?: string; licenseExpiry?: string;
  hireDate?: string; contractType?: string; contractStatus?: string; insuranceNumber?: string; insuranceStatus?: string; phone?: string; address?: string; notes?: string;
  dailyWage?: string; salary?: string; licenseGrade?: string; extraFields?: { label: string; value: string }[];
  /** الموظف: نوع التوظيف، والبريد، ورصيد الإجازة السنوية */
  employmentType?: string; email?: string; leaveBalance?: string;
}
const s = (v: unknown) => (v == null ? '' : String(v));
/** collectPersonHrFields(prefix, opts) */
function hrFields(f: PeopleForm, today: string, o: { wage: boolean; salary: boolean; skillFromPos: boolean }): J {
  const out: J = { nationalId: s(f.nationalId).trim(), birthDate: isoOf(f.birthDate) || '', idCardExpiry: isoOf(f.idCardExpiry) || '', licenseExpiry: isoOf(f.licenseExpiry) || '',
    hireDate: isoOf(f.hireDate) || '', contractType: s(f.contractType), contractStatus: s(f.contractStatus), insuranceNumber: s(f.insuranceNumber).trim(), insuranceStatus: s(f.insuranceStatus).trim(), phone: s(f.phone).trim() };
  if (s(f.idCardExpiry)) out.idCardStatus = statusFromExpiry(f.idCardExpiry, today);
  if (s(f.licenseExpiry)) out.licenseStatus = statusFromExpiry(f.licenseExpiry, today);
  const pos = s(f.position).trim();
  if (pos) { out.position = pos; if (o.skillFromPos) out.skill = pos; }
  if (o.salary && s(f.salary) !== '') out.salary = toInt(f.salary);
  if (o.wage && s(f.dailyWage) !== '') out.dailyWage = toInt(f.dailyWage);
  return out;
}
/** readResignedDateFromForm + القيمة القديمة */
const resignedAtOf = (f: PeopleForm, cur: J | null) => (isResignedStatus(f.status) ? s(f.resignedAt).trim() : '') || (cur && cur.resignedAt) || '';
const extraOf = (f: PeopleForm) => (f.extraFields ?? []).map((x) => ({ label: s(x.label).trim(), value: s(x.value).trim() })).filter((x) => x.label);
/** personDeptOnSave(kind, existing, payload) */
function deptOnSave(kind: PeopleKind, cur: J | null, payload: J) {
  const c0 = String((cur && (cur.departmentId || cur.categoryId)) || '');
  let id = c0;
  if (!(c0 && isResignedDeptId(c0))) { const want = coreDeptOf(kind, { ...(cur || {}), ...payload }); if (want) id = want; }
  if (id) { payload.departmentId = id; payload.categoryId = id; }
}
/** openSupervisorModal → btnSaveSup */
export function supervisorPayload(f: PeopleForm, cur: J | null, all: J[], today: string): J {
  const hr = hrFields(f, today, { wage: true, salary: false, skillFromPos: true });
  const p: J = Object.assign({
    code: ensureUniqueCode(s(f.code), all, 'SUP-', cur ? cur.id : undefined), name: s(f.name).trim(), status: s(f.status) || 'active', resignedAt: resignedAtOf(f, cur),
    address: s(f.address).trim(), notes: s(f.notes).trim(), extraFields: extraOf(f), attachments: cur ? cur.attachments || [] : [],
  }, hr);
  // syncDocStatusesFromDates
  if (p.idCardExpiry) p.idCardStatus = statusFromExpiry(p.idCardExpiry, today);
  if (p.licenseExpiry) p.licenseStatus = statusFromExpiry(p.licenseExpiry, today);
  if (hr.position && !p.skill) p.skill = hr.position;
  deptOnSave('supervisor', cur, p);
  return p;
}
/** openDriverModal (سواق الشركة) → btnSaveDriver */
export function driverPayload(f: PeopleForm, cur: J | null, all: J[], today: string): J {
  const hr = hrFields(f, today, { wage: false, salary: true, skillFromPos: false });
  const p: J = Object.assign({
    name: s(f.name).trim(), code: ensureUniqueCode(s(f.code), all, 'DRV-', cur ? cur.id : undefined), status: s(f.status) || 'active', resignedAt: resignedAtOf(f, cur),
    licenseGrade: s(f.licenseGrade).trim(), address: s(f.address).trim(), notes: s(f.notes).trim(), extraFields: extraOf(f), attachments: cur ? cur.attachments || [] : [],
  }, hr);
  deptOnSave('driver', cur, p);
  return p;
}
/** openExternalDriverModal → btnSaveDriver */
export function externalDriverPayload(f: PeopleForm, cur: J | null, all: J[]): J {
  const p: J = {
    name: s(f.name).trim(), external: true, code: ensureUniqueCode(s(f.code), all, 'DRV-', cur ? cur.id : undefined), status: s(f.status).trim() || 'active',
    nationalId: s(f.nationalId).trim(), position: s(f.position).trim() || 'سائق', phone: s(f.phone).trim(), address: s(f.address).trim(),
    dailyWage: toInt(s(f.dailyWage).trim()), notes: s(f.notes).trim(), attachments: cur ? cur.attachments || [] : [],
  };
  deptOnSave('driver', cur, p);
  return p;
}
/** openEmployeeModal → btnSaveEmp. **مفيش قسم** (personDeptOnSave مش بيتنادى)، ومفيش خانة تاريخ استقالة (readResignedDateFromForm ← فاضي) */
export function employeePayload(f: PeopleForm, cur: J | null, all: J[], today: string): J {
  const hr = hrFields(f, today, { wage: false, salary: true, skillFromPos: false });
  const p: J = Object.assign({
    code: ensureUniqueCode(s(f.code), all, 'EMP-', cur ? cur.id : undefined), name: s(f.name).trim(), employmentType: s(f.employmentType) || 'full',
    status: s(f.status) || 'active', resignedAt: (cur && cur.resignedAt) || '', email: s(f.email).trim(), leaveBalance: Number(s(f.leaveBalance)) || 0,
    address: s(f.address).trim(), notes: s(f.notes).trim(), extraFields: extraOf(f), attachments: cur ? cur.attachments || [] : [],
  }, hr);
  // syncDocStatusesFromDates
  if (p.idCardExpiry) p.idCardStatus = statusFromExpiry(p.idCardExpiry, today);
  if (p.licenseExpiry) p.licenseStatus = statusFromExpiry(p.licenseExpiry, today);
  return p;
}
/** commit: الدمج (المشرف وسواق الشركة)، أو **من غير دمج** (السواق الخارجي: كل خانة بتتكتب زي ما هي)، أو السجل الجديد */
export function commitPerson(payload: J, cur: J | null, id: string, merge: boolean): J {
  if (!cur) return { ...payload, id };
  const out = JSON.parse(JSON.stringify(cur));
  if (merge) return mergePerson(out, payload);
  for (const k of Object.keys(payload)) if (payload[k] !== undefined) out[k] = payload[k];
  return out;
}
export { resignedDeptOf };
