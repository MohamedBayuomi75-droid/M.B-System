/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 8.7.3 — قواعد المعدات ويومياتها: نقل حرفي من الواجهة القديمة (pages-equipment.js، وhelpers.js، وsmart-tools.js) — DEC-0139.
 * التكلفة: القديمة (equipmentDailyCost — المرجع) والجديدة (DEC-0140: التوقف 50%، والنقل = تكلفة مكتوبة في اليومية، و«تكلفة إضافية» محسوبة).
 */
import { Money } from '../common/money';
import { normAr, smartPersonBlob, smartSearchList } from '../common/smart-search';
import { Ctx, deptName, DOC_EXCLUDE_WORDS, ensureUniqueCode, expiryState, J, round2, statusFromExpiry, supName, toInt, xInsNorm } from '../workers/worker-rules';

export const EQUIPMENT_STATUS = [{ code: 'working', label: 'تعمل' }, { code: 'stopped', label: 'متوقفة' }, { code: 'maintenance', label: 'صيانة' }, { code: 'rented', label: 'مستأجرة' }, { code: 'rented_out', label: 'مؤجرة للغير' }];
export const EQUIPMENT_OWNERSHIP = [{ code: 'owned', label: 'ملك الشركة' }, { code: 'rented', label: 'إيجار خارجي' }];
export const EQUIPMENT_TYPES = [{ code: 'machine', label: 'آلة' }, { code: 'vehicle', label: 'مركبة' }, { code: 'tool', label: 'عدة / أداة' }];
export const DAY_KINDS = [{ code: 'work', label: 'تشغيل' }, { code: 'idle', label: 'توقف' }, { code: 'move', label: 'نقل' }];
export const CORE_EQ_DEPTS = [{ id: '__core_eq_machinery__', name: 'المعدات' }, { id: '__core_eq_private__', name: 'السيارات الملاكى' }, { id: '__core_eq_trucks__', name: 'سيارات النقل' }, { id: '__core_eq_external__', name: 'سيارات خارجية' }];
export const EQUIPMENT_REQUIRED_DOCS = [
  { code: 'purchase_contract', label: 'أصل عقد الشراء' }, { code: 'driver_license', label: 'رخصة قيادة السائق' }, { code: 'vehicle_data', label: 'شهادة البيانات' },
  { code: 'insurance_doc', label: 'وثيقة التأمين' }, { code: 'owner_id', label: 'بطاقة الرقم القومي للمالك' }, { code: 'vehicle_license', label: 'رخصة المركبة أو المعدة' }, { code: 'inspection', label: 'شهادة الفحص الفني' },
];
const EQ_DOC_ALIASES: Record<string, string[]> = {
  purchase_contract: ['عقد شراء', 'عقد الشراء', 'شراء'], driver_license: ['رخصة قيادة', 'رخصة السائق', 'قيادة'], vehicle_data: ['شهادة بيانات', 'شهادة البيانات', 'بيانات'],
  insurance_doc: ['وثيقة التأمين', 'تأمين', 'تامين'], owner_id: ['بطاقة', 'قومي', 'المالك', 'رقم قومي'], vehicle_license: ['رخصة المركبة', 'رخصة المعدة', 'استمارة', 'ترخيص'], inspection: ['فحص فني', 'فحص', 'شهادة الفحص'],
};
export const labelOf = (list: { code: string; label: string }[], code: string) => (list.find((o) => o.code === code) || { label: '' }).label;
const deptOf = (e: J) => String(e.departmentId || e.categoryId || '').trim();

/** personRequiredDocsList('equipment') */
export function requiredEqDocs(c: Ctx): { code: string; label: string }[] {
  const custom = c.requiredDocsByKind?.equipment;
  if (Array.isArray(custom) && !custom.length && c.requiredDocsEmpty?.equipment) return [];
  if (Array.isArray(custom) && custom.length) return custom.map((d) => ({ code: d.code || d.id || String(d.label || d.name || '').slice(0, 24), label: d.label || d.name || d.code || '' })).filter((d) => d.label);
  return EQUIPMENT_REQUIRED_DOCS;
}
const docTextMatches = (txt: string, words: string[], excl: string[]) => { const t = normAr(txt); if (!t.trim()) return false; if (excl.some((x) => x && t.indexOf(normAr(x)) !== -1)) return false; return words.some((w) => w && t.indexOf(w) !== -1); };
/** equipmentHasDocHint */
export function eqHasDoc(c: Ctx, eq: J, doc: J): boolean {
  const words = (EQ_DOC_ALIASES[doc.code] || []).concat([doc.label, doc.code]).filter(Boolean).map((w: string) => normAr(w));
  const excl = DOC_EXCLUDE_WORDS[doc.code] || [];
  const hasFile = (a: J) => !!(a && (a.path || a.storedName || a.dataUrl || a.url));
  for (const a of eq.attachments || []) { if (!hasFile(a)) continue; if (docTextMatches([a.docType, a.fromDoc, a.name, a.note, a.title].join(' '), words, excl)) return true; }
  for (const d of c.personDocuments.filter((x) => x && x.personId === eq.id)) { if (!docTextMatches([d.docType, d.title, d.name].join(' '), words, excl)) continue; if ((d.attachments || []).some(hasFile)) return true; }
  return false;
}
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
/** equipmentNotesIssues */
export function equipmentIssues(c: Ctx, eq: J): string[] {
  const issues: string[] = [];
  const st = String(eq.status || '').toLowerCase();
  if (st === 'maintenance' || st === 'صيانة') issues.push('تحت الصيانة');
  if (st === 'broken' || st === 'عاطلة') issues.push('عاطلة / معطلة');
  if (st === 'stopped' || st === 'متوقفة' || st === 'stopped_down') issues.push('متوقفة / عاطلة');
  if (st === 'rented' || st === 'مؤجرة' || st === 'rented_out') issues.push('مؤجرة');
  if (!String(eq.project || '').trim()) issues.push('بدون مشروع');
  if (!eq.supervisorId) issues.push('بدون مشرف');
  const vExp = eq.vehicleLicenseExpiry || eq.licenseExpiry || '';
  if (vExp) { if (statusFromExpiry(vExp, c.today) === 'expired') issues.push('رخصة المركبة منتهية'); } else issues.push('لا يوجد تاريخ انتهاء رخصة');
  const dExp = eq.driverLicenseExpiry || '';
  if (dExp && statusFromExpiry(dExp, c.today) === 'expired') issues.push('رخصة السائق منتهية');
  const insSt = String(eq.insuranceStatus || '').toLowerCase().trim();
  if (!insSt) issues.push('حالة التأمين ناقصة');
  else if (insSt === 'none' || insSt === 'uninsured' || insSt === 'غير مؤمن' || insSt.indexOf('غير مؤمن') >= 0) issues.push('غير مؤمن عليها');
  else if ((insSt === 'insured' || insSt === 'مؤم') && !String(eq.insuranceNumber || '').trim()) issues.push('الرقم التأميني ناقص');
  if (!String(eq.vehicleNumber || eq.plate || '').trim()) issues.push('رقم اللوحة ناقص');
  if (eq.nextMaintenance) {
    const nm = String(eq.nextMaintenance).slice(0, 10);
    if (nm < c.today) issues.push('تجاوز موعد الصيانة');
    else { const diff = daysBetween(c.today, nm); if (diff >= 0 && diff <= 14) issues.push(`صيانة قريبة خلال ${Math.round(diff)} يوم`); }
  }
  requiredEqDocs(c).forEach((doc) => { if (!eqHasDoc(c, eq, doc)) issues.push(`ناقص: ${doc.label}`); });
  const dismissed = new Set((eq.dismissedNotes || []).map((x: unknown) => String(x).trim()));
  return issues.filter((i) => !dismissed.has(String(i).trim()));
}

// ---------------- القايمة (filteredEquipment)
export interface EqFilters { status?: string; type?: string; ownership?: string; project?: string; q?: string; departmentId?: string; xLic?: string; xIns?: string; xDocs?: string }
export function filterEquipment(c: Ctx, all: J[], f: EqFilters): J[] {
  let list = all.slice();
  if (f.status) list = list.filter((e) => e.status === f.status);
  if (f.type) list = list.filter((e) => e.type === f.type || e.typeLabel === f.type || String(e.typeLabel || '').includes(f.type!));
  if (f.ownership) list = list.filter((e) => e.ownership === f.ownership);
  if (f.project) { const pq = f.project.trim().toLowerCase(); list = list.filter((e) => String(e.project || '').toLowerCase().includes(pq)); }
  if (f.q) list = smartSearchList(list, f.q, (r) => smartPersonBlob(r, (id) => deptName(c, id), (id) => supName(c, id)));
  if (f.xLic) list = list.filter((p) => expiryState(p.vehicleLicenseExpiry || p.licenseExpiry, c.today, c.soonDays) === f.xLic);
  if (f.xIns) list = list.filter((p) => xInsNorm(p.insuranceStatus) === f.xIns);
  if (f.xDocs) list = list.filter((p) => { const has = requiredEqDocs(c).some((d) => !eqHasDoc(c, p, d)); return f.xDocs === 'missing' ? has : !has; });
  const d = f.departmentId || '';
  if (d) list = d === '__none__' || d === 'none' ? list.filter((e) => !String(e.licenseCategory || '').trim()) : list.filter((e) => deptOf(e) === d);
  return f.q && String(f.q).trim() ? list : list.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar', { sensitivity: 'base' }));
}

// ---------------- التكلفة
/** equipmentDailyCost (helpers.js) — القديمة بالظبط */
export function legacyCost(log: J, eq: J | undefined): number {
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
/**
 * DEC-0140 — الجديدة: الأساس (نفس اختيار القديمة: تكلفة مسجّلة، أو أيام × يومية، أو ساعات × ساعة، أو التقديرات) × معامل النوع
 * (تشغيل 100%، وتوقف `idlePercent` = 50%)، والنقل = «تكلفة النقل» المكتوبة في اليومية (moveCost، وإلا التكلفة المسجّلة، وإلا 0)،
 * + الوقود + «تكلفة إضافية». بـ Money (6 خانات، DEC-0112).
 */
export function newCost(log: J, eq: J | undefined, idlePercent = 50): string {
  if (!log) return '0';
  const kind = String(log.kind || 'work');
  let days = Number(log.days); if (!Number.isFinite(days) || days < 0) days = 0;
  let hours = Number(log.hours); if (!Number.isFinite(hours) || hours < 0) hours = 0;
  const recorded = log.cost != null && log.cost !== '' && Number.isFinite(Number(log.cost)) ? Number(log.cost) : null;
  const dailyRate = toInt(log.dailyCost != null ? log.dailyCost : eq && eq.dailyCost);
  const hourRate = toInt(log.hourlyCost != null ? log.hourlyCost : eq && (eq.hourlyCost || eq.hourRate));
  let base = Money.zero();
  if (kind === 'move') base = Money.of(String(Number(log.moveCost) > 0 ? Number(log.moveCost) : recorded ?? 0));
  else {
    if (recorded != null) base = Money.of(String(recorded));
    else if (days > 0 && dailyRate > 0) base = Money.of(String(days)).times(String(dailyRate));
    else if (hours > 0 && hourRate > 0) base = Money.of(String(hours)).times(String(hourRate));
    else if (days > 0 && hourRate > 0) base = Money.of(String(days)).times('8').times(String(hourRate));
    else if (hours > 0 && dailyRate > 0) base = Money.of(String(hours)).times(String(dailyRate)).div('8');
    if (kind === 'idle') base = base.times(String(idlePercent)).div('100');
  }
  const fuel = Number(log.fuelLiters) || 0;
  const fuelPrice = toInt(log.fuelPrice != null && log.fuelPrice !== '' ? log.fuelPrice : eq && (eq.fuelPrice != null && eq.fuelPrice !== '' ? eq.fuelPrice : eq.fuelPricePerLiter));
  let total = base.round();
  if (!(recorded != null && kind !== 'move') && fuel > 0 && fuelPrice > 0) total = total.plus(Money.of(String(fuel)).times(String(fuelPrice)).round());
  total = total.plus(String(toInt(log.extraCost)));
  return total.toFixed().replace(/\.?0+$/, '') || '0';
}

// ---------------- الحفظ (btnSaveEq) — ومعاه تصليح DEC-0140 (4)
export interface EqForm { code?: string; type?: string; carType?: string; status?: string; ownership?: string; vehicleNumber?: string; color?: string; motorNumber?: string; chassisNumber?: string;
  insuranceNumber?: string; insuranceStatus?: string; model?: string; driverId?: string; purchasePrice?: string; inspectionDate?: string; licenseIssueDate?: string; vehicleLicenseExpiry?: string;
  purchaseDate?: string; lastMaintenance?: string; nextMaintenance?: string; notes?: string; extraFields?: J[] }
/**
 * نوع الترخيص: قسم من أقسام المعدات (بالمعرّف أو الاسم)، أو اسم جديد بيتعمل له قسم (ensureDepartmentSaved) — **بس لو المستخدم اختاره**:
 * لو الخانة فاضية: مفيش قسم جديد ولا اسم متركّب جديد (DEC-0140 بند 4)، **والمعدة بترجع «بدون قسم»** — القسم ونوع الترخيص بيتفضّوا
 * زي القديمة (eqCategory = '') — DEC-0144.
 */
export function equipmentPayload(c: Ctx & { drivers: J[]; deps: J[] }, f: EqForm, cur: J | null, all: J[]): { payload: J; newDept: string | null } | string {
  const typeVal = String(f.type || '').trim();
  let deptId = '', licenseCat = '', newDept: string | null = null;
  if (typeVal) {
    const byId = c.deps.find((d) => d.id === typeVal), byName = c.deps.find((d) => String(d.name || '').trim() === typeVal);
    if (byId) { deptId = byId.id; licenseCat = byId.name; } else if (byName) { deptId = byName.id; licenseCat = byName.name; } else { newDept = typeVal; licenseCat = typeVal; }
  }
  const carType = String(f.carType || '').trim();
  const plate0 = String(f.vehicleNumber || '').trim();
  const name = !typeVal && cur ? cur.name || [carType, plate0].filter(Boolean).join(' — ') || 'معدة' : [licenseCat, carType, plate0].filter(Boolean).join(' — ') || 'معدة';
  const last = String(f.lastMaintenance || ''), next = String(f.nextMaintenance || '');
  if (last && next && next < last) return 'موعد الصيانة القادمة لا يمكن أن يكون قبل تاريخ آخر صيانة';
  const fixed = EQUIPMENT_TYPES.find((t) => t.code === carType || t.label === carType);
  const drv = f.driverId ? c.drivers.find((x) => x && x.id === f.driverId) : null;
  const vExp = String(f.vehicleLicenseExpiry || '');
  const payload: J = {
    code: ensureUniqueCode(f.code, all, 'EQ-', cur?.id), name, type: fixed ? fixed.code : 'other', typeLabel: carType,
    categoryId: deptId, departmentId: deptId,
    status: f.status || 'working', ownership: f.ownership || 'owned', vehicleNumber: plate0, color: String(f.color || '').trim(), motorNumber: String(f.motorNumber || '').trim(),
    chassisNumber: String(f.chassisNumber || '').trim(), insuranceNumber: String(f.insuranceNumber || '').trim(), insuranceStatus: String(f.insuranceStatus || '').trim(), brand: carType,
    model: String(f.model || '').trim(), serial: '', inspectionDate: f.inspectionDate || '', licenseIssueDate: f.licenseIssueDate || '', vehicleLicenseExpiry: vExp,
    vehicleLicenseStatus: statusFromExpiry(vExp, c.today), licenseCategory: licenseCat,
    driverId: drv ? drv.id : '', driverName: drv ? drv.name || '' : '', driverLicenseExpiry: drv ? drv.licenseExpiry || '' : '',
    driverLicenseStatus: drv && drv.licenseExpiry ? statusFromExpiry(drv.licenseExpiry, c.today) : '', hourlyCost: toInt(cur ? cur.hourlyCost : 0),
    purchaseDate: f.purchaseDate || '', purchasePrice: toInt(f.purchasePrice), lastMaintenance: last, nextMaintenance: next, notes: String(f.notes || '').trim(),
    extraFields: Array.isArray(f.extraFields) ? f.extraFields : cur?.extraFields || [], attachments: cur ? cur.attachments || [] : [],
  };
  if (payload.vehicleNumber) payload.plate = payload.vehicleNumber;
  if (payload.vehicleLicenseExpiry) payload.licenseExpiry = payload.vehicleLicenseExpiry;
  if (payload.vehicleLicenseStatus) payload.licenseStatus = payload.vehicleLicenseStatus;
  return { payload, newDept };
}

// ---------------- اليومية (btnSaveEd)
export interface DailyForm { equipmentId?: string; date?: string; project?: string; kind?: string; days?: string; dailyCost?: string; hours?: string; fuelLiters?: string; hourlyCost?: string; fuelPrice?: string; extraCost?: string; moveCost?: string; productivity?: string; notes?: string }
export function dailyPayload(f: DailyForm): J | string {
  if (!f.equipmentId) return 'اختر المعدة';
  if (!f.date) return 'حدد التاريخ';
  const project = String(f.project || '').trim();
  if (!project) return 'اختر المشروع';
  const kind = f.kind || 'work';
  const p: J = { equipmentId: f.equipmentId, date: f.date, project, kind, days: Number(f.days) || 0, dailyCost: toInt(f.dailyCost), hours: Number(f.hours) || 0, fuelLiters: Number(f.fuelLiters) || 0,
    hourlyCost: toInt(f.hourlyCost), fuelPrice: toInt(f.fuelPrice), extraCost: toInt(f.extraCost), productivity: String(f.productivity || '').trim(), notes: String(f.notes || '').trim() };
  if (kind === 'move') { if (!(toInt(f.moveCost) > 0)) return 'اكتب تكلفة النقل'; p.moveCost = toInt(f.moveCost); }
  return p;
}
