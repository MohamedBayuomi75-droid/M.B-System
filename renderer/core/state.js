/* =========================================================
   نظام الموارد البشرية - تطبيق سطح مكتب يعمل بالكامل بدون إنترنت
   التخزين محلي في ملف حقيقي على جهازك
   ========================================================= */

let DATA = {
  employees: [],      // الموظفين (إداريون / دوام)
  workers: [],        // العمال (يومية / مشاريع)
  supervisors: [],    // المشرفون
  equipment: [],      // المعدات والآلات
  departments: [],
  projects: [],       // كتالوج المشاريع (للاختيار لاحقاً)
  equipmentTypes: [], // أنواع معدات مخصصة محفوظة
  attendance: [],     // حضور الموظفين
  workerAttendance: [], // حضور العمال
  leaves: [],
  payroll: [],
  workerPayments: [], // دفعات / خصومات العمال (type: pay|penalty)
  employeePenalties: [], // خصومات وجزاءات الموظفين
  equipmentLogs: [],  // صيانة / أعطال / قطع غيار / تعيين
  equipmentDaily: [], // يومية تشغيل المعدات
  drivers: [],        // السائقون
  fuelLogs: [],       // صرف وقود
  resourceTransfers: [], // نقل عمال/معدات بين مشاريع
  projectPlans: [],   // تخطيط عمالة ومعدات للمشاريع
  projectDaily: [],   // يومية مشروع ذكية
  performanceReviews: [], // تقييم أداء
  personDocuments: [], // مستندات أشخاص مع تاريخ انتهاء
  supervisorExpenses: [], // مصاريف المشرفين
  expenses: [],          // مصاريف موحّدة لكل الفئات
  costs: [],             // تكاليف دفعها شخص (عامل/مشرف/سائق/موظف) = مستحقة له علينا
  licenseExpenses: [],   // مصاريف تراخيص المعدات
  documentTypesByKind: {},
  documentTypeHidden: [],
  expenseItemPools: {},
  expenseTypes: [], // أنواع مصاريف مخصصة
  documentTypes: [], // أنواع مستندات مخصصة
  workerCategories: [], // تصنيفات العمالة (تبويبات)
  equipmentCategories: [],
  driverCategories: [],
  supervisorCategories: [],
  employeeCategories: [],
  customFieldDefs: {
    employees: [], workers: [], supervisors: [], equipment: [], departments: [], drivers: []
  },
  settings: {
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyTaxId: '',
    workDaysPerMonth: 26,
    employeeSalaryMode: 'fixed',
    leaveExcludeFridays: false,
    defaultLeaveDays: 21,
    defaultDailyWage: 0
  },
  auditLog: [],
  dailyTasks: [],
  users: [],
  // ---- أقسام الوحدات الأخرى في نفس ملف البيانات (البرنامج الموحّد) ----
  // مفاتيح HR فوق بتفضل على المستوى الأعلى زي ما هي. كل وحدة تانية ليها قسم (كائن) واحد خاص بيها.
  // أقسام الوحدات في نفس ملف البيانات — النظام الموحّد (ledger / clients / warehouses).
  ledger: {},
  clients: {},
  warehouses: {}
};

const EMPLOYMENT_TYPES = [
  { code: 'full', label: 'دوام كامل' },
  { code: 'part', label: 'دوام جزئي' },
  { code: 'contract', label: 'عقد مؤقت' },
  { code: 'intern', label: 'تدريب' }
];

const EMPLOYEE_STATUS = [
  { code: 'active', label: 'نشط' },
  { code: 'on_leave', label: 'في إجازة' },
  { code: 'resigned', label: 'مستقيل' },
  { code: 'retired', label: 'على المعاش' }
];

const WORKER_STATUS = EMPLOYEE_STATUS;

const WORKER_TYPES = [
  { code: 'temporary', label: 'عامل مؤقت' },
  { code: 'company', label: 'عامل شركة' },
  { code: 'daily', label: 'عامل يومية' }
];

const EQUIPMENT_STATUS = [
  { code: 'working', label: 'تعمل' },
  { code: 'stopped', label: 'متوقفة' },
  { code: 'maintenance', label: 'صيانة' },
  { code: 'rented', label: 'مستأجرة' },
  { code: 'rented_out', label: 'مؤجرة للغير' }
];

const EQUIPMENT_OWNERSHIP = [
  { code: 'owned', label: 'ملك الشركة' },
  { code: 'rented', label: 'إيجار خارجي' }
];


const EQUIPMENT_TYPES = [
  { code: 'machine', label: 'آلة' },
  { code: 'vehicle', label: 'مركبة' },
  { code: 'tool', label: 'عدة / أداة' },
  { code: 'device', label: 'جهاز' },
  { code: 'other', label: 'أخرى' }
];

const EQUIP_LOG_TYPES = [
  { code: 'maintenance', label: 'صيانة' },
  { code: 'repair', label: 'إصلاح' },
  { code: 'parts', label: 'قطع غيار' },
  { code: 'fault', label: 'عطل' },
  { code: 'rental', label: 'إيجار خارجي' },
  { code: 'assign', label: 'تعيين' },
  { code: 'return', label: 'إرجاع' },
  { code: 'note', label: 'ملاحظة' }
];

const LEAVE_TYPES = [
  { code: 'annual', label: 'إجازة سنوية' },
  { code: 'sick', label: 'إجازة مرضية' },
  { code: 'unpaid', label: 'إجازة بدون راتب' },
  { code: 'maternity', label: 'إجازة أمومة' },
  { code: 'emergency', label: 'إجازة طارئة' },
  { code: 'other', label: 'أخرى' }
];

const LEAVE_STATUS = [
  { code: 'pending', label: 'قيد الانتظار' },
  { code: 'approved', label: 'موافق عليها' },
  { code: 'rejected', label: 'مرفوضة' },
  { code: 'cancelled', label: 'ملغاة' }
];

const ATTENDANCE_STATUS = [
  { code: 'present', label: 'حاضر' },
  { code: 'absent', label: 'غائب' },
  { code: 'late', label: 'متأخر' },
  { code: 'half', label: 'نصف يوم' },
  { code: 'holiday', label: 'عطلة' }
];

let currentPage = 'dashboard';   // أول صفحة بعد الدخول: لوحة المتابعة العامة ← نظرة عامة
let activeEmployeeId = null;
let activeEmployeeTab = 'info';
let employeeFilters = { departmentId: '', status: '', q: '', employmentType: '', categoryId: '' };
let workerFilters = { q: '', status: '', type: '', supervisorId: '', project: '', categoryId: '' };
let supervisorFilters = { q: '', status: '', categoryId: '', departmentId: '' };
let driverFilters = { q: '', status: '', categoryId: '' };
let equipmentFilters = { status: '', type: '', q: '', ownership: '', project: '', detailId: '', from: '', to: '', dailyView: false, year: 0, month: 0, categoryId: '' };
let attendanceFilters = { employeeId: '', departmentId: '', from: '', to: '', status: '', q: '' };
let workerAttFilters = { q: '', status: '', from: '', to: '', supervisorId: '', workerId: '', personType: '', project: '', site: '', year: 0, month: 0, listView: false, dailiesTab: 'workers' };
let leaveFilters = { employeeId: '', personKind: '', type: '', status: '', from: '', to: '', q: '' };

const TABLE_PAGE_SIZE = 20;
const pageState = {
  employees: 1, workers: 1, equipment: 1, attendance: 1, workerAttendance: 1,
  leaves: 1, payroll: 1, departments: 1, supervisors: 1, drivers: 1, reports: 1, archive: 1, auditLog: 1, equipLogs: 1,
  projects: 1, expenses: 1, costs: 1, transfers: 1, equipmentDaily: 1, fuel: 1,
  duesWorkers: 1, duesSup: 1, duesDrv: 1, duesEq: 1, duesEmp: 1
};
function getTablePage(key){ return Math.max(1, pageState[key] || 1); }
function setTablePage(key, n){ pageState[key] = Math.max(1, Number(n)||1); }
function resetTablePage(key){ if(key) setTablePage(key, 1); else Object.keys(pageState).forEach(k=>setTablePage(k,1)); }
function paginateRows(rows, key){
  const pageSize = (typeof TABLE_PAGE_SIZE==='number' && TABLE_PAGE_SIZE>0) ? TABLE_PAGE_SIZE : 20;
  const totalRows = (rows||[]).length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize) || 1);
  let page = getTablePage(key);
  if(page > totalPages){ page = totalPages; setTablePage(key, page); }
  const pageStart = (page - 1) * pageSize;
  return {
    pageRows: (rows||[]).slice(pageStart, pageStart + pageSize),
    page, totalPages, totalRows, pageStart, pageSize
  };
}
function tablePagerHtml(key, info){
  const { page, totalPages, totalRows, pageStart, pageSize } = info;
  return `<div class="btn-row table-pager" data-pager="${key}" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
    <span style="font-size:13px;color:var(--ink-soft);">عرض ${totalRows?pageStart+1:0}–${Math.min(pageStart+pageSize,totalRows)} من ${totalRows} <span style="opacity:.75;">(${pageSize} صف لكل صفحة)</span></span>
    <div style="display:flex;gap:8px;align-items:center;">
      <button type="button" class="btn btn-outline btn-sm" data-page-prev="${key}" ${page<=1?'disabled':''}>السابق</button>
      <span style="font-size:13px;font-weight:700;">صفحة ${page} / ${totalPages}</span>
      <button type="button" class="btn btn-outline btn-sm" data-page-next="${key}" ${page>=totalPages?'disabled':''}>التالي</button>
    </div>
  </div>`;
}

let uiDensity = 1;
let uiZoom = 1;
try{ const z=parseFloat(localStorage.getItem('uiZoom')); if(Number.isFinite(z) && z>=0.5 && z<=1.4) uiZoom=z; }catch(e){}
let readOnlyMode = false;

let projectFilters = { q: '', status: '', stageSel: '', customerId: '', detailId: '', hasRes:'', budget:'' };

const EXPENSE_TYPES = [
  {code:'food', label:'أكل / إعاشة'},
  {code:'housing', label:'سكن'},
  {code:'transport', label:'انتقالات'},
  {code:'tools', label:'أدوات / معدات'},
  {code:'medical', label:'علاج'},
  {code:'other', label:'أخرى'}
];

/** الأوراق المطلوبة لكل عامل/موظف/مشرف/سائق */
const REQUIRED_PERSON_DOCS = [
  { code: 'id_card', label: 'صورة البطاقة الشخصية', keys: ['بطاقة', 'قومي', 'شخصية', 'id', 'card'] },
  { code: 'birth', label: 'أصل شهادة الميلاد', keys: ['ميلاد', 'birth'] },
  { code: 'military', label: 'أصل شهادة الجيش', keys: ['جيش', 'عسكري', 'military'] },
  { code: 'qualification', label: 'أصل شهادة المؤهل', keys: ['مؤهل', 'شهادة', 'qualification', 'diploma'] },
  { code: 'contract', label: 'عقد العمل', keys: ['عقد', 'contract'] },
  { code: 'criminal', label: 'فيش وتشبيه', keys: ['فيش', 'تشبيه', 'criminal'] },
  { code: 'photo', label: 'صور شخصية', keys: ['صورة شخصية', 'صور شخصية', 'photo'] },
  { code: 'work_stub', label: 'كعب عمل', keys: ['كعب', 'عمل'] },
  { code: 'insurance', label: 'برنت تأميني', keys: ['تأمين', 'برنت', 'insurance'] }
];
