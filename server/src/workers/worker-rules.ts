/**
 * قواعد العمال (8.1.4، DEC-0121) — **نقل حرفي من الواجهة القديمة**، والمقارنة بالدوال القديمة نفسها في tests-merge/phase74.js:
 *  - النوع والقسم الأساسي (isTemporaryWorker، coreDeptIdFor، personDeptOnSave)، والاستقالة (isResignedStatus، movePersonToResignedArchive).
 *  - القايمة (filteredWorkers): الحالة، والنوع، والمشرف، والمشروع، والقسم، والبحث الذكي، والفلاتر الإضافية (applyExtraPersonFilters).
 *  - لوحات الأقسام (entityDeptBoardsPageHtml)، والكروت (entityStatCardsHtml / sectionStatCardsHtml)، والملاحظات (personNotesIssues)،
 *    والأوراق المطلوبة (personRequiredDocsList / personHasDocHint)، وعلامة النقص (_personWarningBadgeBase).
 *  - الحفظ: نافذة العامل بشكليها (openWorkerModal)، والدمج (mergePersonRecord)، والكود (ensureUniqueCode)، وحالة المستندات (syncDocStatusesFromDates).
 * **مش منقول (DEC-0121 د-6، متسجّل في WORKERS_ACCEPTANCE §7):** تنبيه سن المعاش والإحالة (retirementBannerHtml)، والكروت المخصصة (customCards)،
 * وتخصيص أعمدة الجدول (formLayouts)، والإجراءات الجماعية — كلها من الشاشة الكاملة.
 */
import { normAr, smartPersonBlob, smartSearchList } from '../common/smart-search';

export type J = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// ---------------- ثوابت (state.js، helpers.js)
export const EMPLOYEE_STATUS = [{ code: 'active', label: 'نشط' }, { code: 'on_leave', label: 'في إجازة' }, { code: 'resigned', label: 'مستقيل' }, { code: 'retired', label: 'على المعاش' }];
export const STATUS_LEGACY_LABELS: Record<string, string> = { inactive: 'غير نشط', left: 'غادر', terminated: 'منتهي الخدمة', temporary: 'مؤقت' };
export const WORKER_TYPES = [{ code: 'temporary', label: 'عامل مؤقت' }, { code: 'company', label: 'عامل شركة' }, { code: 'daily', label: 'عامل يومية' }];
export const CONTRACT_TYPE_OPTS = [{ code: 'permanent', label: 'دائم' }, { code: 'temp', label: 'مؤقت' }, { code: 'daily', label: 'يومي' }, { code: 'contract', label: 'عقد محدد المدة' }];
export const DEPT_NONE = '__none__';
export const CORE_WORKER_DEPTS = [{ id: '__core_workers_perm__', name: 'عمال الشركة' }, { id: '__core_workers_temp__', name: 'عمالة مؤقتة' }];
export const RESIGNED_DEPT = '__resigned_worker__';
export const RETIRED_DEPT = '__retired_worker__';
const HIRE_REQUIRED_DOCS = [
  { code: 'qualification', label: 'أصل شهادة المؤهل' }, { code: 'military', label: 'أصل شهادة الجيش' }, { code: 'birth', label: 'أصل شهادة الميلاد' },
  { code: 'contract', label: 'عقد العمل' }, { code: 'criminal', label: 'فيش وتشبيه' }, { code: 'id_card', label: 'صورة البطاقة الشخصية' },
  { code: 'photo', label: 'صور شخصية' }, { code: 'work_stub', label: 'كعب عمل' }, { code: 'insurance', label: 'برنت تأميني' },
];
const RESIGNED_DOCS = [
  { code: 'res_id_card', label: 'صورة البطاقة الشخصية' }, { code: 'res_contract', label: 'صورة من عقد العمل' }, { code: 'res_qualification', label: 'صورة المؤهل' },
  { code: 'res_birth', label: 'صورة شهادة الميلاد' }, { code: 'res_military', label: 'صورة شهادة الجيش' }, { code: 'res_resign_request', label: 'طلب استقالة' },
  { code: 'res_clearance', label: 'نموذج إخلاء طرف' }, { code: 'res_final_settlement', label: 'مخالصة مالية نهائية' }, { code: 'res_docs_receipt', label: 'إيصال استلام أصول المستندات' },
];
const DOC_ALIASES: Record<string, string[]> = {
  id_card: ['بطاقة', 'قومي', 'رقم قومي', 'بطاقة شخصية', 'صورة البطاقة'], birth: ['ميلاد', 'شهادة الميلاد'], military: ['جيش', 'عسكري', 'شهادة الجيش'],
  qualification: ['مؤهل', 'شهادة المؤهل'], insurance: ['تأمين', 'برنت', 'برنت تأميني'], work_stub: ['كعب', 'كعب عمل'], contract: ['عقد', 'عقد عمل'],
  criminal: ['فيش', 'تشبيه'], photo: ['صورة شخصية', 'صور شخصية'], driver_license_img: ['رخصة', 'قيادة', 'رخصة القيادة'], driver_license_data: ['بيانات الرخصة', 'شهادة بيانات'],
  res_id_card: ['بطاقة', 'قومي', 'بطاقة شخصية', 'صورة البطاقة'], res_contract: ['عقد', 'عقد عمل'], res_qualification: ['مؤهل', 'شهادة المؤهل'], res_birth: ['ميلاد', 'شهادة الميلاد'],
  res_military: ['جيش', 'عسكري', 'شهادة الجيش'], res_resign_request: ['طلب استقالة', 'استقالة'], res_clearance: ['إخلاء طرف', 'اخلاء طرف'],
  res_final_settlement: ['مخالصة', 'مخالصة مالية', 'مخالصة نهائية'], res_docs_receipt: ['إيصال استلام', 'استلام أصول', 'أصول المستندات'],
};
const DOC_EXCLUDE_WORDS: Record<string, string[]> = { driver_license_img: ['بيانات'], driver_license: ['بيانات'], vehicle_license: ['سائق', 'قيادة'], photo: ['بطاقة'] };

// ---------------- أرقام وتواريخ
export function round2(n: unknown): number { const x = Number(n); if (!Number.isFinite(x)) return 0; return Math.round((x + (x < 0 ? -Number.EPSILON : Number.EPSILON)) * 100) / 100; }
export function toInt(n: unknown): number {
  if (n == null || n === '') return 0;
  if (typeof n === 'number') return Number.isFinite(n) ? round2(n) : 0;
  let s = String(n).trim();
  s = s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  s = s.replace(/٫/g, '.').replace(/[٬،]/g, '').replace(/,/g, '').replace(/[^\d.-]/g, '');
  const x = Number(s);
  return Number.isFinite(x) ? round2(x) : 0;
}
/** parseLocalDate ← YYYY-MM-DD (أو null) */
export function isoOf(d: unknown): string | null {
  if (d == null || d === '') return null;
  const s = String(d).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
/** statusFromExpiry: منتهية لو قبل النهارده (النهارده نفسه ساري) */
export function statusFromExpiry(d: unknown, today: string): string { const iso = isoOf(d); if (!iso) return ''; return iso < today ? 'expired' : 'valid'; }
const daysBetween = (a: string, b: string) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000);
/** expiryState: none / expired / soon (خلال alertSoonDays، الافتراضي 30) / valid */
export function expiryState(d: unknown, today: string, soonDays: number): string {
  const iso = isoOf(d); if (!iso) return 'none';
  const n = daysBetween(today, iso);
  if (n < 0) return 'expired';
  if (n <= soonDays) return 'soon';
  return 'valid';
}
/** fmtDate القديمة (يوم/شهر/سنة) */
export function fmtDate(d: unknown): string { const iso = isoOf(d); if (!iso) return d ? String(d) : '—'; return `${+iso.slice(8, 10)}/${+iso.slice(5, 7)}/${iso.slice(0, 4)}`; }

// ---------------- النوع والقسم والحالة
export function isTemporaryWorker(p: J | null | undefined): boolean { if (!p) return false; return /temporary|temp|daily|مؤقت|يومية|يوميه/.test(String(p.workerType || p.type || '').toLowerCase()); }
export const coreDeptIdFor = (p: J) => (isTemporaryWorker(p) ? '__core_workers_temp__' : '__core_workers_perm__');
export function isResignedStatus(st: unknown): boolean { const s = String(st || '').toLowerCase(); return s === 'resigned' || s === 'left' || s === 'terminated' || s === 'retired'; }
export const isRetiredStatus = (st: unknown) => String(st || '').toLowerCase() === 'retired';
export const isResignedDeptId = (id: unknown) => !!(id && (String(id).indexOf('__resigned_') === 0 || String(id).indexOf('__retired_') === 0));
export const entityDepartmentId = (r: J) => String(r.departmentId || r.categoryId || '').trim();
export const entityNoDeptOrJob = (e: J) => !String(e.position || e.job || e.jobTitle || e.skill || '').trim();
export const statusLabel = (st: string) => (EMPLOYEE_STATUS.find((o) => o.code === st) || { label: STATUS_LEGACY_LABELS[st] || st || '—' }).label;

// ---------------- السياق اللي القواعد محتاجاه (البيانات المرجعية من legacy_records والإعدادات)
export interface Ctx {
  today: string;
  soonDays: number;
  departments: J[];
  supervisors: J[];
  leaves: J[];
  personDocuments: J[];
  requiredDocsByKind?: Record<string, J[]>;
  requiredDocsEmpty?: Record<string, boolean>;
  workDaysPerMonth: number;
}
export const deptName = (c: Ctx, id: string) => { const d = c.departments.find((x) => x && x.id === id); return d ? d.name || id : '—'; };
export const supName = (c: Ctx, id: string) => { const s = c.supervisors.find((x) => x.id === id); return s ? s.name || s.code || id : '—'; };
/** activeLeaveOf: إجازة معتمدة سارية النهارده */
export const activeLeaveOf = (c: Ctx, id: string) => c.leaves.find((l) => l && l.status === 'approved' && (l.personKind || l.kind || 'employee') === 'worker' && (l.personId || l.employeeId) === id && (l.from || '') <= c.today && (!l.to || l.to >= c.today)) || null;

// ---------------- الأوراق المطلوبة
export function requiredDocs(c: Ctx, kind: 'worker' | 'resigned'): { code: string; label: string }[] {
  const custom = c.requiredDocsByKind?.[kind];
  if (Array.isArray(custom) && !custom.length && c.requiredDocsEmpty?.[kind]) return [];
  if (Array.isArray(custom) && custom.length) return custom.map((d) => ({ code: d.code || d.id || String(d.label || d.name || '').slice(0, 24), label: d.label || d.name || d.code || '' })).filter((d) => d.label);
  return kind === 'resigned' ? RESIGNED_DOCS : HIRE_REQUIRED_DOCS;
}
const docTextMatches = (txt: string, words: string[], excl: string[]) => { const t = normAr(txt); if (!t.trim()) return false; if (excl.some((x) => x && t.indexOf(normAr(x)) !== -1)) return false; return words.some((w) => w && t.indexOf(w) !== -1); };
/** personHasDocHint: مرفق على الشخص بملف فعلي، أو مستند في الأرشيف بنوع مطابق وملف */
export function hasDoc(c: Ctx, p: J, doc: J): boolean {
  const words = (DOC_ALIASES[doc.code] || []).concat([doc.label, doc.code, ...(doc.keys || [])]).filter(Boolean).map((w: string) => normAr(w));
  const excl = DOC_EXCLUDE_WORDS[doc.code] || [];
  const hasFile = (a: J) => !!(a && (a.path || a.storedName || a.dataUrl || a.url));
  for (const a of p.attachments || []) { if (!hasFile(a)) continue; if (docTextMatches([a.docType, a.fromDoc, a.name, a.note, a.title].join(' '), words, excl)) return true; }
  for (const d of c.personDocuments.filter((x) => x && x.personId === p.id)) {
    if (!docTextMatches([d.docType, d.title, d.name].join(' '), words, excl)) continue;
    if ((d.attachments || []).some(hasFile)) return true;
  }
  return false;
}
/** personNotesIssues('worker', p) */
export function notesIssues(c: Ctx, p: J): string[] {
  const issues: string[] = [];
  const dismissed = new Set((p.dismissedNotes || []).map((x: unknown) => String(x).trim()));
  const keep = () => issues.filter((i) => !dismissed.has(String(i).trim()));
  if (isResignedStatus(p.status)) {
    if (!String(p.resignedAt || p.resignDate || '').trim()) issues.push('تاريخ الاستقالة ناقص');
    for (const doc of requiredDocs(c, 'resigned')) if (!hasDoc(c, p, doc)) issues.push(`ناقص: ${doc.label || doc.code || ''}`);
    return keep();
  }
  if (isTemporaryWorker(p)) {
    if (!String(p.nationalId || p.idNumber || '').trim()) issues.push('الرقم القومي ناقص');
    if (!p.supervisorId) issues.push('بدون مشرف');
    if (!String(p.departmentId || p.categoryId || p.department || '').trim()) issues.push('بدون قسم');
    if (!toInt(p.dailyWage)) issues.push('بدون يومية محددة');
    return keep();
  }
  if (!String(p.name || '').trim()) issues.push('الاسم ناقص');
  if (!String(p.nationalId || p.idNumber || '').trim()) issues.push('الرقم القومي ناقص');
  if (!String(p.phone || p.mobile || '').trim()) issues.push('رقم الهاتف ناقص');
  if (!p.supervisorId) issues.push('بدون مشرف');
  if (!String(p.departmentId || p.categoryId || p.department || '').trim()) issues.push('بدون قسم');
  if (!toInt(p.dailyWage)) issues.push('بدون يومية محددة');
  if (p.idCardExpiry) { const s = statusFromExpiry(p.idCardExpiry, c.today); if (s === 'expired') issues.push('بطاقة منتهية'); else if (s === 'soon') issues.push('بطاقة قاربت على الانتهاء'); }
  else issues.push('لا يوجد تاريخ بطاقة');
  for (const doc of requiredDocs(c, 'worker')) if (!hasDoc(c, p, doc)) issues.push(`ناقص: ${doc.label}`);
  const ins = String(p.insuranceStatus || '').toLowerCase();
  if (ins === 'none' || ins === 'uninsured' || ins === 'غير مؤمن عليه' || ins === 'لا يوجد') issues.push('غير مؤمن عليه');
  return keep();
}
/** علامة ⚠️ (_personWarningBadgeBase): بيانات أساسية ناقصة (القومي والهاتف والعنوان) أو أوراق ناقصة (مش للمؤقت) */
export function warning(c: Ctx, p: J): string {
  const miss = ['nationalId', 'phone', 'address'].filter((k) => !String(p[k] || '').trim()).map((k) => ({ nationalId: 'الرقم القومي', phone: 'الهاتف', address: 'العنوان' } as J)[k]);
  const dismissed = new Set((p.dismissedNotes || []).map((x: unknown) => String(x).trim()));
  const docs = isTemporaryWorker(p) ? [] : requiredDocs(c, 'worker').filter((d) => !hasDoc(c, p, d) && !dismissed.has(`ناقص: ${d.label}`));
  if (!miss.length && !docs.length) return '';
  const tips: string[] = [];
  if (miss.length) tips.push(`بيانات ناقصة: ${miss.join('، ')}`);
  if (docs.length) tips.push(`أوراق ناقصة: ${docs.map((d) => d.label).join('، ')}`);
  return tips.join(' | ');
}

// ---------------- القايمة (filteredWorkers + applyExtraPersonFilters)
export interface WorkerFilters { q?: string; status?: string; type?: string; supervisorId?: string; project?: string; departmentId?: string; xCard?: string; xIns?: string; xDocs?: string; xData?: string }
const xInsNorm = (v0: unknown) => { const v = String(v0 || '').toLowerCase().trim(); if (!v) return 'empty'; if (v === 'none' || v === 'uninsured' || v.indexOf('غير') >= 0 || v === 'لا يوجد') return 'none'; if (v === 'pending' || v.indexOf('قيد') >= 0) return 'pending'; if (v === 'insured' || v.indexOf('مؤم') >= 0) return 'insured'; return v; };
const byNameAr = <T extends J>(list: T[]) => list.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar', { sensitivity: 'base' }));
export function filterWorkers(c: Ctx, all: J[], f: WorkerFilters): J[] {
  let list = all.slice();
  if (f.status === 'temporary') list = list.filter((w) => isTemporaryWorker(w)); else if (f.status) list = list.filter((w) => w.status === f.status);
  if (f.type) {
    const ft = String(f.type).toLowerCase();
    if (ft === 'temporary' || ft === 'temp' || ft === 'daily') list = list.filter((w) => isTemporaryWorker(w));
    else if (ft === 'company' || ft === 'permanent') list = list.filter((w) => !isTemporaryWorker(w));
    else list = list.filter((w) => String(w.type || w.workerType || '').toLowerCase() === ft);
  }
  if (f.supervisorId) list = list.filter((w) => w.supervisorId === f.supervisorId);
  if (f.project) list = list.filter((w) => String(w.project || '').includes(f.project as string));
  const deptF = f.departmentId || '';
  if (deptF) list = deptF === DEPT_NONE || deptF === 'none' ? list.filter((w) => entityNoDeptOrJob(w)) : list.filter((w) => entityDepartmentId(w) === deptF);
  if (f.q) list = smartSearchList(list, f.q, (r) => smartPersonBlob(r, (id) => deptName(c, id), (id) => supName(c, id)));
  if (f.xCard) list = list.filter((p) => expiryState(p.idCardExpiry, c.today, c.soonDays) === f.xCard);
  if (f.xIns) list = list.filter((p) => xInsNorm(p.insuranceStatus) === f.xIns);
  if (f.xDocs) list = list.filter((p) => { const has = isResignedStatus(p.status) ? requiredDocs(c, 'resigned').some((d) => !hasDoc(c, p, d) && !(p.dismissedNotes || []).map(String).includes(`ناقص: ${d.label}`)) : !isTemporaryWorker(p) && requiredDocs(c, 'worker').some((d) => !hasDoc(c, p, d) && !(p.dismissedNotes || []).map(String).includes(`ناقص: ${d.label}`)); return f.xDocs === 'missing' ? has : !has; });
  if (f.xData) list = list.filter((p) => { const t = isTemporaryWorker(p); const miss = [!String(p.nationalId || p.idNumber || '').trim(), !t && !String(p.phone || p.mobile || '').trim(), !t && !String(p.address || '').trim()]; return miss.some(Boolean); });
  return f.q && String(f.q).trim() ? list : byNameAr(list);
}

// ---------------- لوحات الأقسام
export function boards(c: Ctx, all: J[]) {
  const sys = c.departments.filter((d) => d && d.system && !d.jobDept && (!d.kind || d.kind === 'workers' || d.kind === 'all' || (Array.isArray(d.kinds) && d.kinds.includes('workers')) || all.some((p) => entityDepartmentId(p) === d.id)));
  const fixed = [{ id: RESIGNED_DEPT, name: 'المستقيلين' }, { id: RETIRED_DEPT, name: 'المعاشات' }];
  const order = CORE_WORKER_DEPTS.map((x) => x.id);
  const deps = [...CORE_WORKER_DEPTS.map((x) => ({ ...x, ...(sys.find((d) => d.id === x.id) ? { name: sys.find((d) => d.id === x.id)!.name || x.name } : {}) })),
    ...sys.filter((d) => !order.includes(d.id) && !isResignedDeptId(d.id)).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'))];
  const count = (id: string) => (id === DEPT_NONE ? all.filter((x) => entityNoDeptOrJob(x)).length : id === '' ? all.length : all.filter((x) => entityDepartmentId(x) === id).length);
  return [{ id: '', name: 'الكل', icon: '📋' }, { id: DEPT_NONE, name: 'بدون قسم أو وظيفة', icon: '📂' }, ...fixed.map((d) => ({ ...d, icon: d.id === RESIGNED_DEPT ? '🚪' : '🏖️' })), ...deps.map((d) => ({ id: d.id, name: d.name, icon: '🧑‍🔧' }))]
    .map((b) => ({ ...b, count: count(b.id) }));
}

// ---------------- العمر (extras.js: personBirthDate / personAge)
function birthFromNid(nid: unknown): string {
  const s = String(nid || '').replace(/\D/g, '');
  if (s.length !== 14) return '';
  const c = s[0] === '2' ? 1900 : s[0] === '3' ? 2000 : 0; if (!c) return '';
  const y = c + Number(s.slice(1, 3)), m = s.slice(3, 5), d = s.slice(5, 7);
  if (Number(m) < 1 || Number(m) > 12 || Number(d) < 1 || Number(d) > 31) return '';
  return `${y}-${m}-${d}`;
}
export function personAge(p: J, on: string): number | null {
  const b = (p && p.birthDate) || birthFromNid(p && p.nationalId); if (!b) return null;
  let age = Number(on.slice(0, 4)) - Number(String(b).slice(0, 4));
  if (on.slice(5) < String(b).slice(5)) age--;
  return age;
}

// ---------------- الكروت
export interface Card { label: string; value?: string | number; parts?: { n: number; l: string; tone?: string }[]; tone?: string; ico: string }
export function cards(c: Ctx, rows: J[], deptF: string): Card[] {
  const sec = deptF === RETIRED_DEPT ? 'retired' : deptF === RESIGNED_DEPT ? 'resigned' : '';
  if (sec) {
    const ret = sec === 'retired', yr = c.today.slice(0, 4);
    const rd = (p: J) => String(ret ? p.retiredAt || '' : p.resignedAt || p.resignDate || '').slice(0, 10);
    const noDate = rows.filter((p) => !rd(p)).length;
    let val = 0, cnt = 0, lastD = '';
    for (const p of rows) {
      const r = rd(p); if (r && r > lastD) lastD = r;
      if (ret) { const a = personAge(p, r || c.today); if (a != null && a > 0) { val += a; cnt++; } }
      else { const h = String(p.hireDate || '').slice(0, 10); if (h && r && r >= h) { val += (Date.parse(r) - Date.parse(h)) / (1000 * 60 * 60 * 24 * 30.4375); cnt++; } }
    }
    const avg = cnt ? val / cnt : 0;
    const avgTxt = !cnt ? '—' : ret ? `${Math.round(avg)} سنة` : avg >= 12 ? `${Math.round((avg / 12) * 10) / 10} سنة` : `${Math.round(avg)} شهر`;
    return [
      { ico: ret ? '🏖️' : '🚪', label: ret ? 'عدد المحالين للمعاش' : 'عدد المستقيلين', value: rows.length },
      { ico: '📅', label: ret ? 'أُحيلوا هذا العام' : 'استقالوا هذا العام', value: rows.filter((p) => rd(p).slice(0, 4) === yr).length, tone: 'ok' },
      { ico: ret ? '🎂' : '⏳', label: ret ? 'متوسط سن الإحالة' : 'متوسط مدة الخدمة', value: avgTxt },
      { ico: '🗓️', label: ret ? 'آخر إحالة' : 'آخر استقالة', value: lastD ? fmtDate(lastD) : '—' },
      { ico: '❗', label: ret ? 'بدون تاريخ إحالة' : 'بدون تاريخ استقالة', value: noDate, tone: noDate ? 'warn' : '' },
    ];
  }
  const act = (x: J) => !x.status || x.status === 'active' || x.status === 'working';
  const actN = rows.filter(act).length, onL = rows.filter((x) => activeLeaveOf(c, x.id)).length;
  const ins = { insured: 0, none: 0, pending: 0 } as Record<string, number>;
  for (const x of rows) { const v = String(x.insuranceStatus || '').trim(); ins[v === 'insured' || v === 'مؤمَّن' || v === 'مؤمن' ? 'insured' : v === 'pending' || v === 'قيد التسجيل' ? 'pending' : 'none']++; }
  let lv = 0, le = 0;
  for (const x of rows) { const k = ['vehicleLicenseExpiry', 'licenseExpiry', 'driverLicenseExpiry'].find((kk) => x[kk]); if (!k) continue; if (statusFromExpiry(x[k], c.today) === 'expired') le++; else lv++; }
  const cs = { active: 0, expired: 0, suspended: 0 };
  for (const x of rows) { const v = String(x.contractStatus || '').trim(); if (v === 'active' || v === 'ساري' || v === 'سارية') cs.active++; else if (v === 'expired' || v === 'منتهي' || v === 'منتهية') cs.expired++; else if (v === 'suspended' || v === 'موقوف' || v === 'موقوفة') cs.suspended++; }
  const cardExp = (x: J) => (x.idCardExpiry ? statusFromExpiry(x.idCardExpiry, c.today) === 'expired' : x.idCardStatus === 'expired' || x.idCardStatus === 'منتهية');
  const ce = rows.filter(cardExp).length;
  const cv = rows.filter((x) => !cardExp(x) && (x.idCardExpiry || x.idCardStatus === 'valid' || x.idCardStatus === 'سارية')).length;
  const pay = (x: J) => { const sal = Number(x.salary || x.basicSalary) || 0; return sal || (Number(x.dailyWage) || 0) * c.workDaysPerMonth; };
  const last: Card = deptF === '__core_workers_temp__'
    ? { ico: '💰', label: 'إجمالي اليوميات', value: toInt(rows.reduce((s, x) => s + (Number(x.dailyWage) || 0), 0)) }
    : { ico: '💰', label: 'إجمالي الرواتب', value: toInt(rows.reduce((s, x) => s + pay(x), 0)) };
  return [
    { ico: '🧑‍🔧', label: 'عدد العمال', value: rows.length },
    { ico: '✅', label: 'نشطون', tone: 'ok', parts: [{ n: actN - Math.min(onL, actN), l: 'على رأس العمل', tone: 'ok' }, { n: onL, l: 'في إجازة', tone: onL ? 'warn' : '' }] },
    { ico: '🛡️', label: 'حالة التأمين', tone: ins.none ? 'warn' : 'ok', parts: [{ n: ins.insured, l: 'مؤمَّن', tone: 'ok' }, { n: ins.none, l: 'غير مؤمن', tone: ins.none ? 'warn' : '' }, { n: ins.pending, l: 'قيد التسجيل' }] },
    { ico: '🪪', label: 'حالة الرخصة', tone: le ? 'warn' : '', parts: [{ n: lv, l: 'سارية', tone: 'ok' }, { n: le, l: 'منتهية', tone: le ? 'warn' : '' }] },
    { ico: '📑', label: 'حالة العقد', tone: cs.expired ? 'warn' : '', parts: [{ n: cs.active, l: 'ساري', tone: 'ok' }, { n: cs.expired, l: 'منتهي', tone: cs.expired ? 'warn' : '' }, { n: cs.suspended, l: 'موقوف' }] },
    { ico: '🪪', label: 'حالة البطاقة', tone: ce ? 'warn' : '', parts: [{ n: cv, l: 'سارية', tone: 'ok' }, { n: ce, l: 'منتهية', tone: ce ? 'warn' : '' }] },
    last,
  ];
}

/** شكل الجدول: مؤقت كله / شركة كله / مختلط (زي renderWorkersPage) */
export function tableMode(deptF: string, type: string, pageRows: J[]): 'temp' | 'company' | 'mixed' {
  const fType = String(type || '').toLowerCase();
  const forceTemp = fType === 'temporary' || fType === 'temp' || fType === 'daily' || deptF === '__core_workers_temp__';
  const forceCo = fType === 'company' || fType === 'permanent' || deptF === '__core_workers_perm__';
  const allTemp = pageRows.length > 0 && pageRows.every((w) => isTemporaryWorker(w));
  const allCo = pageRows.length > 0 && pageRows.every((w) => !isTemporaryWorker(w));
  return forceTemp || (!forceCo && allTemp) ? 'temp' : forceCo || allCo ? 'company' : 'mixed';
}

// ---------------- الحفظ (openWorkerModal → btnSaveWrk)
/** nextCode (helpers.js:7738) */
export function nextCode(prefix: string, list: J[]): string {
  const used = new Set<string>(); let max = 0; const pre = prefix.toUpperCase();
  for (const item of list) {
    const c = String(item.code || '').trim().toUpperCase(); if (!c) continue; used.add(c);
    if (c.startsWith(pre)) { const n = parseInt(c.slice(pre.length).replace(/^[-_\s]+/, ''), 10); if (Number.isFinite(n) && n > max) max = n; }
    else { const n = parseInt(c.replace(/\D/g, ''), 10); if (Number.isFinite(n) && n > max) max = n; }
  }
  let n = max + 1, code: string;
  do { code = pre + String(n).padStart(3, '0'); n++; } while (used.has(code));
  return code;
}
/** ensureUniqueCode: الكود لو مش مستخدم، وإلا التالي */
export function ensureUniqueCode(code0: unknown, list: J[], prefix: string, excludeId?: string): string {
  const code = String(code0 || '').trim();
  const others = list.filter((x) => x.id !== excludeId);
  const used = new Set(others.map((x) => String(x.code || '').trim().toUpperCase()).filter(Boolean));
  if (code && !used.has(code.toUpperCase())) return code;
  return nextCode(prefix, others);
}
/** خانات النافذة زي ما بتتبعت (نفس قيم الـ inputs، نصوص) */
export interface WorkerForm {
  workerType: 'temporary' | 'company'; code?: string; name: string; status?: string; supervisorId?: string; position?: string;
  nationalId?: string; phone?: string; address?: string; project?: string; dailyWage?: string; notes?: string;
  birthDate?: string; idCardExpiry?: string; hireDate?: string; contractType?: string; contractStatus?: string; insuranceNumber?: string; insuranceStatus?: string; salary?: string;
  extraFields?: { label: string; value: string }[];
}
const PRESERVE = new Set(['phone', 'nationalId', 'idCardExpiry', 'idCardStatus', 'licenseExpiry', 'licenseStatus', 'insuranceNumber', 'insuranceStatus', 'contractType', 'contractStatus', 'hireDate',
  'address', 'notes', 'email', 'salary', 'basicSalary', 'dailyWage', 'skill', 'position', 'jobTitle', 'project', 'supervisorId', 'birthDate', 'qualification', 'militaryStatus', 'photo',
  'attachments', 'extraFields', 'leaveBalance', 'employmentType', 'code', 'name']);
/** mergePersonRecord: القيمة الفاضية مابتمسحش قيمة موجودة، والمرفقات الفاضية مابتستبدلش */
export function mergePerson(target: J, payload: J): J {
  for (const k of Object.keys(payload)) {
    const v = payload[k];
    if (v === undefined) continue;
    if (PRESERVE.has(k)) { const empty = v === '' || v === null || (typeof v === 'number' && isNaN(v)); const had = target[k] !== undefined && target[k] !== null && target[k] !== ''; if (empty && had) continue; }
    if (k === 'attachments' && Array.isArray(v) && v.length === 0 && Array.isArray(target.attachments) && target.attachments.length) continue;
    target[k] = v;
  }
  return target;
}
/** الـ payload بنفس ترتيب وحساب زرار الحفظ القديم */
export function workerPayload(f: WorkerForm, w: J | null, all: J[], today: string): J {
  const isTemp = f.workerType === 'temporary';
  const s = (v: unknown) => (v == null ? '' : String(v));
  const payload: J = {
    code: ensureUniqueCode(s(f.code) || (w && w.code) || '', all, 'WRK-', w ? w.id : undefined),
    name: s(f.name).trim(), workerType: f.workerType, type: isTemp ? 'temporary' : 'company',
    status: s(f.status) || (w && w.status) || 'active',
    resignedAt: (w && w.resignedAt) || '', // النافذة مافيهاش خانة تاريخ استقالة (readResignedDateFromForm ← '')
    supervisorId: s(f.supervisorId), nationalId: s(f.nationalId).trim(), phone: s(f.phone).trim(), address: s(f.address).trim(), project: s(f.project).trim(),
    dailyWage: toInt(isTemp ? f.dailyWage || 0 : 0),
  };
  if (!isTemp) {
    // collectPersonHrFields('wrk', { showSalary, skillFromPos }) — الرخصة مش في نافذة العامل، فقيمتها ''
    const hr: J = { nationalId: s(f.nationalId).trim(), birthDate: isoOf(f.birthDate) || '', idCardExpiry: isoOf(f.idCardExpiry) || '', licenseExpiry: '', hireDate: isoOf(f.hireDate) || '',
      contractType: s(f.contractType), contractStatus: s(f.contractStatus), insuranceNumber: s(f.insuranceNumber).trim(), insuranceStatus: s(f.insuranceStatus).trim(), phone: s(f.phone).trim() };
    if (s(f.idCardExpiry)) hr.idCardStatus = statusFromExpiry(f.idCardExpiry, today);
    const pos = s(f.position).trim();
    if (pos) { hr.position = pos; hr.skill = pos; }
    if (s(f.salary) !== '') hr.salary = toInt(f.salary);
    Object.assign(payload, hr);
    if (hr.position) payload.skill = hr.position;
    payload.salary = hr.salary != null ? hr.salary : toInt((w && (w.salary || w.basicSalary)) || 0);
    payload.dailyWage = toInt((w && w.dailyWage) || 0);
    payload.basicSalary = payload.salary;
    payload.notes = s(f.notes).trim();
    payload.extraFields = (f.extraFields ?? []).map((x) => ({ label: s(x.label).trim(), value: s(x.value).trim() })).filter((x) => x.label);
    payload.attachments = w ? w.attachments || [] : [];
    // syncDocStatusesFromDates
    if (payload.idCardExpiry) payload.idCardStatus = statusFromExpiry(payload.idCardExpiry, today);
    if (payload.licenseExpiry) payload.licenseStatus = statusFromExpiry(payload.licenseExpiry, today);
  } else {
    payload.insuranceStatus = w && w.insuranceStatus ? w.insuranceStatus : 'none';
    const jb = s(f.position).trim();
    if (jb) { payload.skill = jb; payload.position = jb; }
    payload.notes = s(f.notes).trim();
    payload.attachments = w ? w.attachments || [] : [];
  }
  // personDeptOnSave
  const cur = String((w && (w.departmentId || w.categoryId)) || '');
  let dept = cur;
  if (!(cur && isResignedDeptId(cur))) dept = coreDeptIdFor({ ...(w || {}), ...payload });
  if (dept) { payload.departmentId = dept; payload.categoryId = dept; }
  return payload;
}
/** commitWorker: الدمج للتعديل (وبعده النوع واليومية والراتب بيتكتبوا صريح)، أو السجل الجديد زي ما هو */
export function commitWorker(payload: J, w: J | null, id: string): J {
  if (!w) return { ...payload, id };
  const out = mergePerson(JSON.parse(JSON.stringify(w)), payload);
  out.workerType = payload.workerType; out.type = payload.type; out.dailyWage = payload.dailyWage;
  if (payload.type !== 'temporary') { out.salary = payload.salary; out.basicSalary = payload.salary; }
  return out;
}
/** syncPersonResignedState('worker'): بيعدّل p في مكانه، ويرجّع العملية على أرشيف المستقيلين */
export function syncResigned(p: J, archive: J[], today: string, nowIso: string, uid: () => string): { op: 'upsert'; entry: J } | { op: 'remove'; ids: string[] } | null {
  if (isResignedStatus(p.status)) {
    const retired = isRetiredStatus(p.status);
    const dept = retired ? RETIRED_DEPT : RESIGNED_DEPT;
    if (!p.previousDepartmentId) { const cur = p.departmentId || p.categoryId || ''; if (cur && !isResignedDeptId(cur)) p.previousDepartmentId = cur; }
    if (retired) { p.archiveGroup = 'retired'; p.retiredAt = p.retiredAt || p.resignedAt || today; p.resignedAt = ''; }
    else { p.archiveGroup = 'resigned'; p.resignedAt = p.resignedAt || today; }
    p.departmentId = dept; p.categoryId = dept;
    const existing = archive.find((x) => x.kind === 'worker' && x.personId === p.id);
    const entry = {
      id: existing ? existing.id : uid(), kind: 'worker', personId: p.id, name: p.name || '', code: p.code || '',
      sectionName: retired ? 'المعاشات' : 'المستقيلين', archiveGroup: retired ? 'retired' : 'resigned',
      attachments: Array.isArray(p.attachments) ? p.attachments.slice() : [], entity: JSON.parse(JSON.stringify(p)),
      previousDepartmentId: p.previousDepartmentId || '', resignedAt: p.resignedAt, retiredAt: p.retiredAt || '', movedAt: nowIso,
    };
    // السجل الحي بيفضل بالاستقالة + آخر قيمة لـ retiredAt (live.retiredAt = person.retiredAt || '')
    p.retiredAt = p.retiredAt || '';
    p.previousDepartmentId = p.previousDepartmentId || '';
    return { op: 'upsert', entry };
  }
  if (p.archiveGroup === 'resigned' || p.archiveGroup === 'retired' || isResignedDeptId(p.departmentId) || isResignedDeptId(p.categoryId)) {
    const prev = p.previousDepartmentId || '';
    const restore = prev && !isResignedDeptId(prev) ? prev : '';
    p.departmentId = restore; p.categoryId = restore; p.archiveGroup = ''; p.resignedAt = ''; p.retiredAt = ''; p.previousDepartmentId = '';
    return { op: 'remove', ids: archive.filter((x) => x.kind === 'worker' && x.personId === p.id).map((x) => x.id) };
  }
  return null;
}
/** stampProjectMembership للعامل اللي اتحفظ */
export function stampMembership(prev: J | null, r: J, today: string): void {
  const cur = String(r.project || '').trim();
  if (!cur) { if (r.projectSince) r.projectSince = ''; return; }
  if (!prev) { if (!r.projectSince) r.projectSince = today; return; }
  const p = String(prev.project || '').trim(), ps = prev.projectSince || '';
  if (p !== cur && (!r.projectSince || r.projectSince === ps)) r.projectSince = today;
}
