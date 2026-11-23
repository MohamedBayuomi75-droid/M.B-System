/**
 * قواعد المشرفين والسواقين (8.2.4، DEC-0123) — **نقل حرفي من الواجهة القديمة**، والمقارنة بالدوال القديمة نفسها في tests-merge/phase76.js.
 * المشترك مع العمال جاي من worker-rules.ts (اتعمّم بالنوع في 8.2: الملاحظات، والأوراق، والعلامة، واللوحات، والأرشيف، والكروت).
 *  - القايمة: filteredSupervisors (pages-supervisors.js)، وقايمة السواقين جوه renderDriversPage (pages-ops.js) — **بترتيب خطوات مختلف**
 *    (الترتيب بالاسم الأول، والحالة الفاضية = «نشط»)، والفلاتر الإضافية (applyExtraPersonFilters ومنها الرخصة xLic).
 *  - الكروت (_entityStatCardsBase + _builtinExtraCards): المشرفين بـ «عمال تابعون»، والسواقين بـ «رخص منتهية».
 *  - الحفظ: openSupervisorModal، وopenDriverModal (سواق الشركة)، وopenExternalDriverModal (**من غير دمج**).
 */
import { smartPersonBlob, smartSearchList } from '../common/smart-search';
import {
  byNameAr, Card, cardParts, Ctx, DEPT_NONE, deptName, entityDepartmentId, entityNoDeptOrJob, ensureUniqueCode, expiryState, hasDoc, isoOf, isResignedDeptId,
  isResignedStatus, J, mergePerson, requiredDocs, resignedDeptOf, retiredDeptOf, sectionCards, statusFromExpiry, supName, toInt, xInsNorm,
} from '../workers/worker-rules';

export type PeopleKind = 'supervisor' | 'driver';
export const COLL_OF: Record<PeopleKind, 'supervisors' | 'drivers'> = { supervisor: 'supervisors', driver: 'drivers' };
export const EXT_DEPT = '__core_drivers_ext__';

/** coreDeptIdFor('supervisors' | 'drivers', p) */
export const coreDeptOf = (kind: PeopleKind, p: J) => (kind === 'supervisor' ? '__core_supervisors__' : p && p.external ? EXT_DEPT : '__core_drivers__');

// ---------------- القايمة
export interface PeopleFilters { q?: string; status?: string; departmentId?: string; xCard?: string; xLic?: string; xIns?: string; xDocs?: string; xData?: string }
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

// ---------------- الكروت
/** workersOfSupervisor: كل العمال المربوطين (والمستقيل كمان) */
export const workersOf = (workers: J[], supId: string) => (supId ? workers.filter((w) => w.supervisorId === supId).length : 0);
export function peopleCards(c: Ctx, kind: PeopleKind, rows: J[], deptF: string, workers: J[]): Card[] {
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
/** commit: الدمج (المشرف وسواق الشركة)، أو **من غير دمج** (السواق الخارجي: كل خانة بتتكتب زي ما هي)، أو السجل الجديد */
export function commitPerson(payload: J, cur: J | null, id: string, merge: boolean): J {
  if (!cur) return { ...payload, id };
  const out = JSON.parse(JSON.stringify(cur));
  if (merge) return mergePerson(out, payload);
  for (const k of Object.keys(payload)) if (payload[k] !== undefined) out[k] = payload[k];
  return out;
}
export { resignedDeptOf };
