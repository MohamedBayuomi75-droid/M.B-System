/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * تخطيط أعمدة جداول الأشخاص المحفوظ (formLayouts) — نقل حرفي من الواجهة القديمة (DEC-0122، قراية بس):
 *  - ensureFormLayout / _cfEnforceOrder / migrateStaleFormLayouts (renderer/core/helpers.js)
 *  - thIf / tdIf / fieldShownInTable (helpers.js): إخفاء الخلية حسب «يظهر في الجدول»
 *  - apply() + addAutoColumns() + autoCellValue() (renderer/core/extras.js): ترتيب الأعمدة حسب ترتيب الخانات،
 *    والإخفاء، وتغيير اسم العمود، وأعمدة الخانات التلقائية/غير المطابقة.
 * القديمة بتطبّقها على الـ DOM بعد الرسم (MutationObserver): apply ← addAutoColumns ← apply. هنا نفس الخطوات
 * بنفس الترتيب على نموذج الجدول (عناوين + خلايا بالموضع)، ومنها إن الصف اللي عدد خلاياه مختلف عن العناوين
 * مابيترتّبش (زي القديمة بالظبط — صف المؤقت في الجدول المختلط).
 * اللي مش منقول: syncAutoFields (بيقرا النافذة الحقيقية من الـ DOM) — نتيجته محفوظة في البيانات أصلًا
 * (autoFields وformLayouts)، والقديمة بتعيد حسابها مرة في الجلسة. الترتيب الفعلي بيتأكد على البيانات الحقيقية في البروفة.
 */

export interface LayoutDocs {
  formLayouts: Record<string, any[]>; autoFields: Record<string, any[]>; customFieldDefs: Record<string, any[]>; deadFields: Record<string, string[]>;
  cfRegKeys: Record<string, string>; aligned?: Record<string, boolean>; flags: { allHiddenFixed: boolean; autoFlagsReset: boolean; showInTableMigrated: boolean };
}
export interface Head { text: string; key?: string; input?: boolean; auto?: boolean; hide?: boolean }
export interface Cell { t: string; v?: string; key?: string; auto?: boolean; hide?: boolean }
export interface Row { id: string; cells: Cell[] }

const AUTO_HDR_ALIAS: Record<string, string[]> = {
  IdCardExp: ['انتهاء البطاقة'], IdCardStatus: ['حالة البطاقة'], LicExp: ['انتهاء الرخصة'], LicStatus: ['حالة الرخصة'],
  Hire: ['تاريخ التعيين'], ContractType: ['نوع العقد'], ContractStatus: ['حالة العقد'], InsNo: ['الرقم التأميني'], InsStatus: ['حالة التأمين'],
  Pos: ['الوظيفة'], WageTemp: ['اليومية'], ProjSince: ['تاريخ الربط بالمشروع', 'تاريخ الانضمام للمشروع'],
};
const autoFieldSuffix = (sel: string) => String(sel || '').replace(/^#/, '').replace(/^(emp|wrk|sup|drv|eq)/, '');
type Def = { key: string; label: string; selector: string; table?: boolean; size?: string };
const FORM_BUILTIN_FIELDS: Record<string, Def[]> = {
  employees: [
    { key: 'code', label: 'الكود', selector: '#empCode' }, { key: 'name', label: 'الاسم', selector: '#empName' }, { key: 'nationalId', label: 'الرقم القومي', selector: '#empNid' },
    { key: 'birthDate', label: 'تاريخ الميلاد', selector: '#empBirth', table: false }, { key: 'phone', label: 'الهاتف', selector: '#empPhone' }, { key: 'department', label: 'القسم', selector: '#empDept' },
    { key: 'position', label: 'الوظيفة', selector: '#empPos' }, { key: 'salary', label: 'الراتب', selector: '#empSalary' }, { key: 'hireDate', label: 'تاريخ التعيين', selector: '#empHire' },
    { key: 'status', label: 'الحالة', selector: '#empStatus' }, { key: 'address', label: 'العنوان', selector: '#empAddress' }, { key: 'cardExpiry', label: 'تاريخ انتهاء البطاقة الشخصية', selector: '#empIdCardExp' },
    { key: 'insuranceNo', label: 'الرقم التأميني', selector: '#empInsNo' }, { key: 'insuranceStatus', label: 'حالة التأمين', selector: '#empInsStatus' }, { key: 'notes', label: 'الملاحظات', selector: '#empNotes' },
  ],
  workers: [
    { key: 'code', label: 'الكود', selector: '#wrkCode' }, { key: 'name', label: 'الاسم', selector: '#wrkName' }, { key: 'nationalId', label: 'الرقم القومي', selector: '#wrkNid' },
    { key: 'birthDate', label: 'تاريخ الميلاد', selector: '#wrkBirth', table: false }, { key: 'phone', label: 'الهاتف', selector: '#wrkPhone' },
    { key: 'supervisor', label: 'المشرف', selector: '#wrkSupervisor_text' }, { key: 'department', label: 'القسم', selector: '#wrkDept' }, { key: 'job', label: 'الوظيفة', selector: '#wrkPos' },
    { key: 'salary', label: 'الراتب', selector: '#wrkSalary' }, { key: 'project', label: 'المشروع', selector: '#wrkProject' }, { key: 'address', label: 'العنوان', selector: '#wrkAddress' },
    { key: 'status', label: 'الحالة', selector: '#wrkStatus' }, { key: 'notes', label: 'الملاحظات', selector: '#wrkNotes' },
  ],
  workersTemp: [
    { key: 'code', label: 'الكود', selector: '#wrkCode' }, { key: 'name', label: 'الاسم', selector: '#wrkName' }, { key: 'status', label: 'الحالة', selector: '#wrkStatus' },
    { key: 'nationalId', label: 'الرقم القومي', selector: '#wrkNidTemp' }, { key: 'job', label: 'الوظيفة', selector: '#wrkPosTemp' }, { key: 'department', label: 'القسم', selector: '#wrkDept' },
    { key: 'supervisor', label: 'المشرف', selector: '#wrkSupervisor_text' }, { key: 'dailyWage', label: 'اليومية', selector: '#wrkWageTemp' }, { key: 'phone', label: 'الهاتف', selector: '#wrkPhoneTemp' },
    { key: 'address', label: 'العنوان', selector: '#wrkAddress' }, { key: 'notes', label: 'الملاحظات', selector: '#wrkNotes' },
  ],
  supervisors: [
    { key: 'code', label: 'الكود', selector: '#supCode' }, { key: 'name', label: 'الاسم', selector: '#supName' }, { key: 'nationalId', label: 'الرقم القومي', selector: '#supNid' },
    { key: 'birthDate', label: 'تاريخ الميلاد', selector: '#supBirth', table: false }, { key: 'phone', label: 'الهاتف', selector: '#supPhone' }, { key: 'department', label: 'القسم', selector: '#supDept' },
    { key: 'dailyWage', label: 'اليومية', selector: '#supWage' }, { key: 'status', label: 'الحالة', selector: '#supStatus' }, { key: 'address', label: 'العنوان', selector: '#supAddress' },
    { key: 'notes', label: 'الملاحظات', selector: '#supNotes' },
  ],
  drivers: [
    { key: 'code', label: 'الكود', selector: '#drvCode' }, { key: 'name', label: 'الاسم', selector: '#drvName' }, { key: 'nationalId', label: 'الرقم القومي', selector: '#drvNid' },
    { key: 'birthDate', label: 'تاريخ الميلاد', selector: '#drvBirth', table: false }, { key: 'phone', label: 'الهاتف', selector: '#drvPhone' },
    { key: 'licenseDegree', label: 'درجة الرخصة', selector: '#drvLicGrade' }, { key: 'licenseExpiry', label: 'تاريخ انتهاء الرخصة', selector: '#drvLicExp' },
    { key: 'salary', label: 'الراتب', selector: '#drvSalary' }, { key: 'project', label: 'المشروع', selector: '#drvProject' }, { key: 'department', label: 'القسم', selector: '#drvDept' },
    { key: 'address', label: 'العنوان', selector: '#drvAddress' }, { key: 'status', label: 'الحالة', selector: '#drvStatus' }, { key: 'notes', label: 'الملاحظات', selector: '#drvNotes' },
  ],
  driversExt: [
    { key: 'code', label: 'الكود', selector: '#drvCode' }, { key: 'name', label: 'الاسم', selector: '#drvName' }, { key: 'status', label: 'الحالة', selector: '#drvStatus' },
    { key: 'nationalId', label: 'الرقم القومي', selector: '#drvNid' }, { key: 'job', label: 'الوظيفة', selector: '#drvPos' }, { key: 'department', label: 'القسم', selector: '#drvDept' },
    { key: 'dailyWage', label: 'اليومية', selector: '#drvWage' }, { key: 'phone', label: 'الهاتف', selector: '#drvPhone' }, { key: 'address', label: 'العنوان', selector: '#drvAddress' },
    { key: 'notes', label: 'الملاحظات', selector: '#drvNotes' },
  ],
  // المعدات (8.7.5): نافذة المعدة وعناوين الجدول (applyFormLayout وextras.js apply)
  equipment: [
    { key: 'code', label: 'الكود', selector: '#eqCode' }, { key: 'licenseType', label: 'نوع الترخيص', selector: '#eqType' }, { key: 'carType', label: 'نوع السيارة', selector: '#eqCarType' },
    { key: 'status', label: 'الحالة', selector: '#eqStatus' }, { key: 'ownership', label: 'الملكية', selector: '#eqOwnership' }, { key: 'vehicleNumber', label: 'رقم اللوحة', selector: '#eqVehicleNumber' },
    { key: 'color', label: 'اللون', selector: '#eqColor' }, { key: 'motorNumber', label: 'رقم الماتور', selector: '#eqMotor' }, { key: 'chassisNumber', label: 'رقم الشاسيه', selector: '#eqChassis' },
    { key: 'insuranceNumber', label: 'الرقم التأميني', selector: '#eqInsNo' }, { key: 'insuranceStatus', label: 'حالة التأمين', selector: '#eqInsStatus' }, { key: 'model', label: 'الموديل', selector: '#eqModel' },
    { key: 'driverName', label: 'اسم السائق', selector: '#eqDriver_text' }, { key: 'purchasePrice', label: 'سعر الشراء', selector: '#eqPurchasePrice' }, { key: 'inspectionDate', label: 'تاريخ الفحص', selector: '#eqInspection' },
    { key: 'licenseIssueDate', label: 'تاريخ إصدار الرخصة', selector: '#eqLicIssue' }, { key: 'vehicleLicenseExpiry', label: 'تاريخ انتهاء رخصة السيارة', selector: '#eqVehLicExp' },
    { key: 'purchaseDate', label: 'تاريخ الشراء', selector: '#eqPurchaseDate', table: false }, { key: 'lastMaintenance', label: 'تاريخ آخر صيانة', selector: '#eqLastMaint', table: false },
    { key: 'nextMaintenance', label: 'موعد الصيانة القادمة', selector: '#eqNextMaint', table: false }, { key: 'notes', label: 'الملاحظات', selector: '#eqNotes' },
  ],
  // نافذة اليومية وحضور الموظفين (8.5.5): زي القديمة — الترتيب والأسماء الافتراضية من هنا (applyFormLayout)
  attendance: [
    { key: 'date', label: 'التاريخ', selector: '#attDate' }, { key: 'department', label: 'القسم', selector: '#attDept' }, { key: 'employee', label: 'الموظف', selector: '#attEmp' },
    { key: 'status', label: 'الحالة', selector: '#attStatus' }, { key: 'notes', label: 'ملاحظات', selector: '#attNotes' },
  ],
  workerAttendance: [
    { key: 'kind', label: 'النوع', selector: '#wattType' }, { key: 'person', label: 'الشخص', selector: '#wattPerson' }, { key: 'status', label: 'الحالة', selector: '#wattStatus' },
    { key: 'date', label: 'التاريخ', selector: '#wattDate' }, { key: 'days', label: 'عدد الأيام', selector: '#wattDays' }, { key: 'deduction', label: 'خصم', selector: '#wattDed' },
    { key: 'project', label: 'المشروع', selector: '#wattProject' }, { key: 'notes', label: 'ملاحظات', selector: '#wattNotes' },
  ],
  // نافذة الصرف الموحّدة (8.6.5): items وtotal مالهمش label في النافذة (applyFormLayout في القديمة بيحط اسمهم غلط — DUES_ACCEPTANCE §3)
  payments: [
    { key: 'type', label: 'النوع', selector: '#upType' }, { key: 'department', label: 'القسم', selector: '#upDept' }, { key: 'person', label: 'الشخص', selector: '#upPerson' },
    { key: 'date', label: 'التاريخ', selector: '#upDate' }, { key: 'payKind', label: 'نوع المستحق', selector: '#upPayKind' }, { key: 'items', label: 'بنود اليوميات / الإضافات', selector: '#upLines', size: 'lg' },
    { key: 'total', label: 'الإجمالي', selector: '#upTotal', size: 'lg' }, { key: 'notes', label: 'ملاحظات', selector: '#upNotes', size: 'lg' },
  ],
  // نافذة الإجازة (8.4 V3): زي القديمة بالظبط — أغلب الـ selectors دي مش موجودة في النافذة، والترتيب الفعلي بييجي من الخانات التلقائية والتخطيط المحفوظ
  leaves: [
    { key: 'department', label: 'القسم', selector: '#lvDept' }, { key: 'person', label: 'الشخص', selector: '#lvPerson' }, { key: 'type', label: 'نوع الإجازة', selector: '#lvType' },
    { key: 'from', label: 'من تاريخ', selector: '#lvFrom' }, { key: 'to', label: 'إلى تاريخ', selector: '#lvTo' }, { key: 'status', label: 'الحالة', selector: '#lvStatus' },
    { key: 'notes', label: 'ملاحظات', selector: '#lvNotes' },
  ],
};
/** FORM_BUILTIN_FIELDS[entity] (للـ selector والاسم الافتراضي في applyFormLayout) */
export function builtinFields(entity: string): { key: string; label: string; selector: string }[] { return FORM_BUILTIN_FIELDS[entity] || []; }
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x ?? null));

/* --- helpers.js: _cfEnforceOrder --- */
const _cfIsCodeField = (x: any) => !!x && x.type !== 'custom' && (x.key === 'code' || (x.key === 'id' && /كود/.test(x.label || '')) || /^(ال)?كود\s*(ال)?(موظف|عامل|مشرف|سائق|معدة|عميل|مشروع)?$/.test(String(x.label || '').trim()));
const _cfIsNotesField = (x: any) => !!x && x.type !== 'custom' && (x.key === 'notes' || /^(ال)?ملاحظات$/.test(String(x.label || '').trim()));
function _cfEnforceOrder(out: any[]) {
  const ci = out.findIndex(_cfIsCodeField);
  if (ci > 0) { const c = out.splice(ci, 1)[0]; out.unshift(c); }
  const ni = out.findIndex(_cfIsNotesField);
  if (ni >= 0) { const n = out.splice(ni, 1)[0]; n.size = 'lg'; n.height = Math.max(Number(n.height) || 0, 90); out.push(n); }
  return out;
}

/* --- helpers.js: migrateStaleFormLayouts (الجزء الخاص بـ formLayouts) — على نسخة --- */
function migrateStale(d: LayoutDocs) {
  const fl = d.formLayouts;
  if (!d.flags.allHiddenFixed) {
    Object.keys(fl).forEach((ent) => {
      const b = (fl[ent] || []).filter((x) => x && x.type !== 'custom');
      if (b.length > 2 && b.every((x) => x.showInTable === false)) {
        const defs = FORM_BUILTIN_FIELDS[ent] || [];
        b.forEach((x) => { const df = defs.find((t) => t.key === x.key); x.showInTable = !(df && df.table === false); });
      }
    });
  }
  if (!d.flags.autoFlagsReset) {
    Object.keys(fl).forEach((ent) => (fl[ent] || []).forEach((x) => {
      if (x && x.type !== 'custom' && String(x.key || '').indexOf('f_') === 0) { x.showInTable = !!AUTO_HDR_ALIAS[autoFieldSuffix(x.selector)]; delete x._userHidTable; }
    }));
  }
  if (!d.flags.showInTableMigrated) {
    Object.keys(fl).forEach((ent) => (fl[ent] || []).forEach((x) => {
      if (x && x.type !== 'custom' && !x.auto && x.showInTable === false && x._userHidTable !== true && !(((FORM_BUILTIN_FIELDS[ent] || []).find((df) => df.key === x.key) || {} as Def).table === false)) x.showInTable = true;
    }));
  }
}

/* --- helpers.js: ensureFormLayout --- */
function ensureFormLayout(entity: string, d: LayoutDocs): any[] {
  const _dead = new Set((d.deadFields && d.deadFields[entity]) || []);
  const builtins: any[] = (FORM_BUILTIN_FIELDS[entity] || []).filter((f) => !_dead.has(f.key)).map((f) => ({
    key: f.key, label: f.label, type: 'builtin', visible: true, size: f.size || 'md', showInTable: f.table !== false, selector: f.selector || '', fieldType: 'text',
  }));
  ((d.autoFields && d.autoFields[entity]) || []).forEach((a: any) => {
    if (a && a.key && !builtins.some((b) => b.key === a.key)) builtins.push({ key: a.key, label: a.label, type: 'builtin', visible: true, size: a.size || 'md', showInTable: !!AUTO_HDR_ALIAS[autoFieldSuffix(a.selector)] || entity === 'workersTemp', selector: a.selector || '', fieldType: 'text', auto: true });
  });
  const cdefs = d.customFieldDefs[entity];
  const customs = (Array.isArray(cdefs) ? cdefs : []).map((f: any) => ({ key: f.id || ('cf_' + f.label), label: f.label, type: 'custom', visible: true, size: f.size || 'md', showInTable: f.showInTable !== false, id: f.id }));
  const layout = d.formLayouts[entity];
  if (!Array.isArray(layout) || !layout.length) return (d.formLayouts[entity] = _cfEnforceOrder(builtins.concat(customs)));
  const out: any[] = [];
  const seenKeys = new Set<string>();
  layout.forEach((x) => {
    if (!x || !x.key) return;
    if (_dead.has(x.key) && x.type !== 'custom') return;
    if (x.type === 'custom') {
      out.push(Object.assign({ type: 'custom', visible: true, size: 'md', showInTable: true, fieldType: 'text' }, x, { type: 'custom', visible: x.visible !== false, showInTable: x.showInTable !== false }));
      seenKeys.add(x.key); return;
    }
    const b = builtins.find((t) => t.key === x.key);
    if (!b && x.type === 'builtin' && String(x.key).indexOf('f_') !== 0) return;
    if (b) {
      let lab = (x.label || '').trim();
      if (!lab || lab === x.key || lab === b.key) lab = b.label;
      lab = lab.replace(/\s*[([]?\s*(تحدد|تحديد|تُحدد|يحدد)\s*يدو[يى]?[اًا]?\s*[)\]]?/g, '').trim() || b.label;
      if (String(x.key).indexOf('f_') !== 0) {
        if (x._defLabel === undefined) { if (lab !== b.label) lab = b.label; }
        else if (x._defLabel !== b.label && lab === x._defLabel) lab = b.label;
      }
      let showT = x.showInTable === false ? false : true;
      if (x._defTable !== undefined && x._defTable !== b.showInTable) showT = b.showInTable;
      out.push(Object.assign({}, b, x, { type: 'builtin', label: lab, _defLabel: b.label, _defTable: b.showInTable, visible: x.visible !== false, size: x.size || b.size || 'md', showInTable: showT, fieldType: x.fieldType || 'text', selector: b.selector || x.selector || '' }));
      seenKeys.add(x.key);
    } else { out.push(Object.assign({ type: 'custom', visible: true, size: 'md', showInTable: true, fieldType: 'text' }, x)); seenKeys.add(x.key); }
  });
  builtins.forEach((b) => { if (!seenKeys.has(b.key)) out.push(Object.assign({}, b)); });
  customs.forEach((c) => { if (!out.some((x) => x.type === 'custom' && (x.id === c.id || x.key === c.key || x.label === c.label))) out.push(c); });
  const regList = (FORM_BUILTIN_FIELDS[entity] || []).filter((f) => !_dead.has(f.key)).map((f) => f.key);
  const regSig = regList.join(',');
  if (d.cfRegKeys[entity] !== regSig) {
    const idxs: number[] = []; out.forEach((x, i) => { if (x.type !== 'custom' && regList.indexOf(x.key) >= 0) idxs.push(i); });
    const items = idxs.map((i) => out[i]).sort((a, b) => regList.indexOf(a.key) - regList.indexOf(b.key));
    idxs.forEach((i, k) => { out[i] = items[k]; });
    d.cfRegKeys[entity] = regSig;
  }
  _cfEnforceOrder(out);
  return (d.formLayouts[entity] = out);
}

/** التخطيط الفعلي لكيان (نفس ensureFormLayout بعد migrateStaleFormLayouts)، على نسخة من المستندات */
export function effectiveLayout(entity: string, docs: LayoutDocs | null): any[] {
  const d: LayoutDocs = clone(docs || { formLayouts: {}, autoFields: {}, customFieldDefs: {}, deadFields: {}, cfRegKeys: {}, flags: { allHiddenFixed: true, autoFlagsReset: true, showInTableMigrated: true } });
  for (const k of ['formLayouts', 'autoFields', 'customFieldDefs', 'deadFields', 'cfRegKeys'] as const) if (!d[k] || typeof d[k] !== 'object') (d as any)[k] = {};
  migrateStale(d);
  return ensureFormLayout(entity, d).filter(Boolean);
}
/** fieldShownInTable: false صراحة بس = مخفي */
export function shownInTable(layout: any[], key: string) { const f = layout.find((x) => x && x.key === key); return !f || f.showInTable !== false; }
/** customFieldsTableHeaders / customFieldsTableCells */
export function customCols(layout: any[]) { return layout.filter((x) => x && x.type === 'custom' && x.label && x.showInTable !== false && x.visible !== false); }
export function customValue(rec: any, label: string) {
  const map: Record<string, unknown> = {};
  (rec && rec.extraFields || []).forEach((f: any) => { if (f && f.label) map[f.label] = f.value; });
  if (rec && rec.custom && typeof rec.custom === 'object') Object.keys(rec.custom).forEach((k) => { if (map[k] == null) map[k] = rec.custom[k]; });
  return map[label] != null ? String(map[label]) : '';
}

/* --- extras.js: apply() --- */
const norm = (t: string) => String(t || '').replace(/[ً-ْ\s]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/^ال/, '');
const ALIAS: Record<string, string[]> = {
  code: ['كودالموظف', 'كودالعامل', 'كودالمشرف', 'كودالسائق', 'كود', 'الكود'], phone: ['رقمالتليفون', 'الهاتف', 'رقمالهاتف'], salary: ['الراتبالاساسي', 'الراتب'],
  hireDate: ['تاريخالتعيين'], position: ['الوظيفه'], job: ['الوظيفه'], cardExpiry: ['انتهاءالبطاقه'], idCardExpiry: ['انتهاءالبطاقه'],
  insuranceNo: ['الرقمالتاميني'], insuranceStatus: ['حالهالتامين'], licenseExpiry: ['انتهاءالرخصه'], licenseDegree: ['درجهالرخصه'],
  workerType: ['نوعالعامل'], projectSince: ['تاريخالربطبالمشروع', 'تاريخالانضمامللمشروع'],
  vehicleLicenseExpiry: ['انتهاءرخصهالسياره', 'تاريخانتهاءرخصهالسياره', 'حالهرخصهالسياره'], driverLicenseExpiry: ['انتهاءرخصهالسائق', 'حالهرخصهالسائق'],
  licenseIssueDate: ['تاريخالاصدار', 'تاريخاصدارالرخصه'], licenseType: ['نوعالترخيص'], carType: ['نوعالسياره'], vehicleNumber: ['رقماللوحه'], motorNumber: ['رقمالماتور'], chassisNumber: ['رقمالشاسيه'],
  inspectionDate: ['تاريخالفحص'], driverName: ['اسمالسائق'], notes: ['الملاحظات', 'ملاحظات'], hourlyCost: ['تكلفهالساعه'], purchaseDate: ['تاريخالشراء'], purchasePrice: ['سعرالشراء'],
  lastMaintenance: ['تاريخاخرصيانه'], nextMaintenance: ['موعدالصيانهالقادمه'], ownership: ['الملكيه'],
  dailyWage: ['اليوميه'], project: ['المشروع'], supervisor: ['المشرف'], department: ['القسم'], address: ['العنوان'], status: ['الحاله'], name: ['الاسم'], nationalId: ['الرقمالقومي'], model: ['الموديل'], color: ['اللون'],
};
function defaultLabel(ent: string, key: string) { const f = (FORM_BUILTIN_FIELDS[ent] || []).find((x) => x.key === key); return f ? f.label : ''; }

interface T { head: Head[]; rows: Row[]; unmatched: Set<string>; layoutEnt: boolean }
function apply(ent: string, t: T, layoutAll: any[]) {
  const ths = t.head;
  t.head.forEach((h) => { if (h.hide === undefined) h.hide = false; });
  // أعد أي عمود أخفيناه سابقاً ثم طبّق من جديد (data-clhide)
  const reset = (c: { hide?: boolean; clhide?: boolean } & any) => { if (c.clhide) { c.hide = false; c.clhide = false; } };
  ths.forEach(reset); t.rows.forEach((r) => r.cells.forEach(reset));
  const used = new Set<number>(); const units: { key: string; order: number; cols: number[]; hide: boolean; label: string }[] = [];
  const _unm = (t.unmatched = new Set());
  layoutAll.forEach((f, order) => {
    const isCustom = f.type === 'custom';
    if (f.auto && !AUTO_HDR_ALIAS[autoFieldSuffix(f.selector)]) return;
    const keyN = (isCustom ? [f.label] : f.auto ? AUTO_HDR_ALIAS[autoFieldSuffix(f.selector)] || [] : ALIAS[f.key] || []).map(norm);
    const labN = norm(f.label), defN = norm(defaultLabel(ent, f.key));
    const cols: number[] = [];
    ths.forEach((th, i) => {
      if (used.has(i) || th.input) return;
      if (th.auto && !f.auto && !isCustom) return;
      const txt = norm(th.text);
      if (!txt) return;
      const byKey = !isCustom && th.key === f.key;
      const hit = byKey || keyN.indexOf(txt) >= 0 || (!isCustom && !keyN.length && (txt === labN || txt === defN));
      if (hit) { cols.push(i); used.add(i); }
    });
    if (!cols.length) { if (!isCustom && !f.auto) _unm.add(f.key); return; }
    const primary = cols.slice().sort((a, b) => { const pa = keyN.indexOf(norm(ths[a].text)), pb = keyN.indexOf(norm(ths[b].text)); return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb) || a - b; });
    const cur = { key: f.key, order, cols: primary, hide: f.showInTable === false, label: '' };
    if (!isCustom && f.label && defN && labN !== defN && keyN[0] === norm(ths[primary[0]].text)) cur.label = f.label;
    units.push(cur);
  });
  if (!(t.layoutEnt ? units.some((u) => u.key === 'name') : units.some((u) => u.key === 'name') && units.some((u) => u.key === 'code'))) _unm.clear();
  const slots = ([] as number[]).concat(...units.map((u) => u.cols)).sort((a, b) => a - b);
  const seq = ([] as number[]).concat(...units.slice().sort((a, b) => a.order - b.order).map((u) => u.cols));
  const perm = ths.map((_, i) => i);
  slots.forEach((slot, k) => { perm[slot] = seq[k]; });
  const n = ths.length;
  if (perm.some((v, i) => v !== i)) {
    t.head = perm.map((src) => ths[src]);
    t.rows.forEach((r) => { if (r.cells.length === n) r.cells = perm.map((src) => r.cells[src]); });
  }
  const where = new Map<number, number>(); perm.forEach((src, dst) => where.set(src, dst));
  units.forEach((u) => u.cols.forEach((src, ix) => {
    const dst = where.get(src)!;
    if (ix === 0 && u.label) { const th = t.head[dst]; if (th && th.text.trim() !== u.label) th.text = u.label; }
    if (u.hide) {
      const hideAt = (c: any) => { if (c && !c.hide) { c.hide = true; c.clhide = true; } };
      hideAt(t.head[dst]);
      t.rows.forEach((r) => { if (r.cells.length === t.head.length) hideAt(r.cells[dst]); });
    }
  }));
}

/* --- extras.js: addAutoColumns --- */
/** كيانات تخطيط مالهاش مجموعة في DATA (فـ DATA[ent] فاضية في القديمة) */
const LAYOUT_ONLY_ENTS = new Set(['workersTemp', 'driversExt']);
function addAutoColumns(ent: string, t: T, layoutAll: any[], recs: Map<string, any>, fmt: { date: (v: string) => string }, skip: (f: any) => boolean) {
  const layout = layoutAll.filter((f) => f && !/ProjSince$/.test(String(f.selector || '')) && f.key !== 'projectSince' && (f.auto || t.unmatched.has(f.key)) && f.showInTable === true && f.visible !== false && !skip(f));
  if (!layout.length) return;
  const existing = new Set(t.head.map((h) => norm(h.text)));
  layout.forEach((f) => {
    if (existing.has(norm(f.label))) return;
    const _mh = AUTO_HDR_ALIAS[autoFieldSuffix(f.selector)]; if (_mh && _mh.some((h) => existing.has(norm(h)))) return;
    const th: Head = { text: f.label, auto: true };
    const last = t.head[t.head.length - 1]; const endBlank = !!last && !(last.text || '').trim() && !last.input;
    if (endBlank) t.head.splice(t.head.length - 1, 0, th); else t.head.push(th);
    t.rows.forEach((r) => {
      // القديمة بتدوّر في DATA[ent]، و«workersTemp» تخطيط بس من غير مجموعة بيانات ← مابتلاقيش السجل وبتكتب «—» (UAT M15)
      const rec = LAYOUT_ONLY_ENTS.has(ent) ? undefined : recs.get(r.id);
      const cell: Cell = { t: 'txt', auto: true, v: rec ? String(autoCellValue(ent, rec, f, fmt)) : '—' };
      if (endBlank && r.cells.length === t.head.length - 1) r.cells.splice(r.cells.length - 1, 0, cell); else r.cells.push(cell);
    });
  });
}
const AUTO_PROP: Record<string, string> = { ResignDate: 'resignedAt', Type: 'employmentType', IdCardExp: 'idCardExpiry', IdCardStatus: 'idCardStatus', LicExp: 'licenseExpiry', LicStatus: 'licenseStatus', ContractType: 'contractType', ContractStatus: 'contractStatus', Email: 'email', Hire: 'hireDate', InsNo: 'insuranceNumber', InsStatus: 'insuranceStatus', WageTemp: 'dailyWage', Pos: 'position', ProjSince: 'projectSince', Phone: 'phone', Nid: 'nationalId', Birth: 'birthDate' };
const STAT_AR: Record<string, string> = { valid: 'سارية', expired: 'منتهية', active: 'نشط', insured: 'مؤمن عليه', uninsured: 'غير مؤمن عليه', pending: 'قيد التسجيل', resigned: 'مستقيل' };
const EMPLOYEE_STATUS: Record<string, string> = { active: 'نشط', on_leave: 'في إجازة', resigned: 'مستقيل', retired: 'على المعاش' };
function birthFromNid(nid: string) {
  const s = String(nid || '').replace(/\D/g, ''); if (s.length !== 14) return '';
  const c = s[0] === '2' ? 1900 : s[0] === '3' ? 2000 : 0; if (!c) return '';
  const y = c + Number(s.slice(1, 3)), m = s.slice(3, 5), d = s.slice(5, 7);
  if (Number(m) < 1 || Number(m) > 12 || Number(d) < 1 || Number(d) > 31) return '';
  return y + '-' + m + '-' + d;
}
function autoCellValue(ent: string, rec: any, f: any, fmt: { date: (v: string) => string }): string {
  const sel = String(f.selector || '').replace(/^#/, '');
  const suf = sel.replace(/^(emp|wrk|sup|drv|eq)/, '');
  // employeeLeaveBalance(rec.id) في القديمة — من السيرفر (8.4، د-3): leaveBalanceNow
  if (suf === 'LeaveBal') return ent === 'employees' && rec.leaveBalanceNow != null ? String(rec.leaveBalanceNow) : '';
  if (!f.auto) {
    if (f.key === 'birthDate') return (rec.birthDate || birthFromNid(rec.nationalId)) || '—';
    const bv = rec[f.key]; if (bv == null || bv === '') return '—';
    if (f.key === 'status' && EMPLOYEE_STATUS[bv]) return EMPLOYEE_STATUS[bv];
    return /^\d{4}-\d{2}-\d{2}/.test(String(bv)) ? fmt.date(bv) : (STAT_AR[bv] || bv);
  }
  const prop = AUTO_PROP[suf] || (suf.charAt(0).toLowerCase() + suf.slice(1));
  const v = rec[prop]; if (v == null || v === '') return '—';
  if (/^\d{4}-\d{2}-\d{2}/.test(String(v))) return fmt.date(v);
  return STAT_AR[v] || v;
}

/**
 * الجدول بعد التخطيط: نفس تسلسل القديمة (apply ← addAutoColumns ← apply). القديمة مابتطبّقش لو عناوين الجدول 5 أو أقل
 * أو مفيش صف (mainTable) — وصف «لا يوجد عمال» بيتحسب صف (الصفحة بتبعته بـ id فاضي وخلية واحدة). skip: خانات مش هتتعرض كأعمدة تلقائية (الأجور لمستخدم مالوش صلاحيتها).
 */
export function layoutTable(ent: string, layoutEnt: boolean, head: Head[], rows: Row[], layout: any[], recs: Map<string, any>, fmt: { date: (v: string) => string }, skip: (f: any) => boolean = () => false) {
  const t: T = { head: head.map((h) => ({ ...h })), rows: rows.map((r) => ({ id: r.id, cells: r.cells.map((c) => ({ ...c })) })), unmatched: new Set(), layoutEnt };
  // thIf / tdIf: إخفاء حسب «يظهر في الجدول»
  t.head.forEach((h) => { if (h.key && !shownInTable(layout, h.key)) h.hide = true; });
  t.rows.forEach((r) => r.cells.forEach((c) => { if (c.key && !shownInTable(layout, c.key)) c.hide = true; }));
  if (t.head.length > 5 && t.rows.length) {
    apply(ent, t, layout);
    addAutoColumns(ent, t, layout, recs, fmt, skip);
    apply(ent, t, layout);
  }
  return { head: t.head, rows: t.rows };
}
