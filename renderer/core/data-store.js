/* ---------------- storage ---------------- */
let __saveTimer = null;
let __savePending = false;
let __indexes = {
  employeesById: {}, workersById: {}, equipmentById: {}, departmentsById: {},
  attendanceByEmployee: {}, workerAttByWorker: {}, leavesByEmployee: {},
  payrollByEmployee: {}, equipLogsByEquipment: {}
};

/* ===== فهارس الحسابات: بتجمع السجلات حسب الشخص مرة واحدة بدل ما كل دالة تمسح الجدول كله لكل شخص =====
 * بتتجدد تلقائياً عند أي حفظ/إعادة بناء (rebuildIndexes) أو تغيّر عدد السجلات، ومع كل رسم للصفحة. */
let __idxVer = 0;
const __idxCache = {};
function bumpIndexVersion(){ __idxVer++; }
function indexedRecords(arrName, tag, keyFn, key){
  const arr = DATA[arrName] || [];
  if(typeof window !== 'undefined' && window.__noIdx) return arr.slice();       // وضع الاختبار: بدون فهرس (للمقارنة)
  const ck = arrName + '#' + tag;
  let c = __idxCache[ck];
  if(!c || c.ver !== __idxVer || c.arr !== arr || c.len !== arr.length){
    const map = new Map();
    for(let i = 0; i < arr.length; i++){
      const r = arr[i]; if(!r) continue;
      let k = keyFn(r);
      if(k == null || k === '') continue;
      if(!Array.isArray(k)) k = [k];
      const seen = new Set();
      for(const kk of k){
        if(kk == null || kk === '' || seen.has(kk)) continue;
        seen.add(kk);
        let bucket = map.get(kk); if(!bucket){ bucket = []; map.set(kk, bucket); }
        bucket.push(r);
      }
    }
    c = __idxCache[ck] = { ver: __idxVer, arr, len: arr.length, map };
  }
  return c.map.get(key) || [];
}


/* ===================== إصدار هيكل البيانات =====================
 * كل ما نغيّر شكل البيانات نزوّد الرقم ونضيف خطوة ترقية. ملف من نسخة أحدث من البرنامج بيتفتح "قراءة فقط" عشان ما نبوّظوش. */
const SCHEMA_VERSION = 9;
const SCHEMA_MIGRATIONS = {
  // 2: توحيد سجلات الحضور (personType/personId) + قائمة التكاليف
  2: function(){ try{ (DATA.workerAttendance||[]).forEach(normalizeAttendanceRecord); }catch(e){} if(!Array.isArray(DATA.costs)) DATA.costs = []; },
  // 3: ملف بيانات واحد للتلات وحدات — أقسام ledger و clients (كائنات). الملف بعد كده بيترفض الحفظ من نسخ أقدم (حماية).
  3: function(){ DATA_SECTIONS.forEach(function(k){ if(!DATA[k] || typeof DATA[k] !== 'object' || Array.isArray(DATA[k])) DATA[k] = {}; }); },
  // 4: دمج دفتر الموردين — قسم ledger كان (في 0.3.0) فيه settings و auditLog؛ دلوقتي مشتركين مع البرنامج الموحّد (إعدادات HR وسجل التدقيق)
  4: function(){ try{ if(typeof lgMigrateLegacySection === 'function') lgMigrateLegacySection(); }catch(e){ console.error('ledger section migration', e); } },
  // 5: تهيئة قسم العملاء (customers + كيانات الدورة التجارية + إعدادات)
  5: function(){ try{ if(typeof ensureClientsSection === 'function') ensureClientsSection(); }catch(e){ console.error('clients section migration', e); } },
  6: function(){ try{ if(typeof ensureWarehousesSection === 'function') ensureWarehousesSection(); }catch(e){ console.error('warehouses section migration', e); } },
  // 7: توحيد المشاريع — customer.projects[] ← DATA.projects (customerId) + ربط السجلات التجارية بـ projectId
  7: function(){ try{ if(typeof clMigrateNestedProjects === 'function') clMigrateNestedProjects(); }catch(e){ console.error('projects unify migration', e); } },
  // 8: مصدر واحد للمدفوع على المستخلص (paidManual + التحصيلات المربوطة) — قيمة المدفوع الحالية بتتحفظ
  8: function(){ try{ if(typeof clMigratePaidSource === 'function') clMigratePaidSource(); }catch(e){ console.error('paid source migration', e); } },
  // 9: ربط كل سجلات (عمال/معدات/مصاريف/تكاليف/يوميات/فواتير موردين/حركات مخازن/نقل موارد) بالمشروع بالمعرّف projectId + تقرير الأسماء غير المطابقة
  9: function(){ try{ if(typeof projMigrateLinks === 'function') projMigrateLinks(); }catch(e){ console.error('project links migration', e); } }
};

/* ===================== أقسام الوحدات داخل ملف البيانات الواحد =====================
 * HR: مفاتيح المستوى الأعلى (زي ما هي)   |   ledger / clients: قسم (كائن) لكل وحدة.
 * أي كود في وحدة ledger أو clients لازم يقرا ويكتب بياناته من getDataSection('ledger') / ('clients') بس. */
const DATA_SECTIONS = ['ledger', 'clients', 'warehouses'];
function getDataSection(name){
  if(DATA_SECTIONS.indexOf(name) < 0) throw new Error('قسم بيانات غير معروف: ' + name);
  if(!DATA[name] || typeof DATA[name] !== 'object' || Array.isArray(DATA[name])) DATA[name] = {};
  return DATA[name];
}

/** تهيئة/تطبيع قسم العملاء — يُستدعى من migration 5 ومن sanitizeLoadedData */
function defaultClientsSettings(){
  return {
    customerPrefix: 'CUS-',
    projectPrefix: 'PRJ-',
    contractPrefix: 'CON-',
    collectionPrefix: 'REC-',
    surveyPrefix: 'Q-',
    boqPrefix: 'BOQ-',
    invoiceCategories: ['مستخلص جاري', 'مستخلص ختامي', 'مستخلص جزئي', 'دفعة مقدمة'],
    costCategories: ['مواد','عمالة','معدات','مقاول باطن','نقل مواد','خرسانة','حديد','أخرى'],
    expenseCategories: ['نقل','إعاشة','إيجار','رواتب','صيانة','وقود','اتصالات','أخرى'],
    projectWorkflow: null,
    archiveSeparators: [
      {id:1, label:'فاصل (1)', types:['كراسة','كراسه','مرفقات الكراسة'], desc:'مرفقات الكراسة'},
      {id:2, label:'فاصل (2)', types:['عقد','عقود'], desc:'العقد'},
      {id:3, label:'فاصل (3)', types:['مقايسة','مقايسات'], desc:'المقايسة'},
      {id:4, label:'فاصل (4)', types:['حصر','أعمال حصر'], desc:'أعمال الحصر'},
      {id:5, label:'فاصل (5)', types:['مستخلص','مستخلصات'], desc:'المستخلصات'},
      {id:6, label:'فاصل (6)', types:['إيراد','إيرادات','تحصيل'], desc:'الإيرادات'},
      {id:7, label:'فاصل (7)', types:['تكلفة','تكاليف','مصروف','مصاريف'], desc:'تكاليف ومصاريف'},
      {id:8, label:'فاصل (8)', types:['ضمان','ضمانات'], desc:'الضمانات'},
      {id:9, label:'فاصل (9)', types:['أخرى','مرفق','مسح'], desc:'أخرى'}
    ],
    customFieldDefs: {},
    itemCatalog: [],
    knownFieldLabels: []
  };
}

function ensureClientsSection(){
  const cl = getDataSection('clients');
  const arrKeys = [
    'customers','workSurveys','boqs','contracts','invoices',
    'collections','guarantees','opportunities','activities','docs'
  ];
  arrKeys.forEach(function(k){
    if(!Array.isArray(cl[k])) cl[k] = [];
  });
  if(!cl.settings || typeof cl.settings !== 'object' || Array.isArray(cl.settings)){
    cl.settings = defaultClientsSettings();
  } else {
    const d = defaultClientsSettings();
    Object.keys(d).forEach(function(k){
      if(cl.settings[k] === undefined || cl.settings[k] === null) cl.settings[k] = d[k];
    });
    if(!Array.isArray(cl.settings.invoiceCategories)) cl.settings.invoiceCategories = d.invoiceCategories;
    if(!Array.isArray(cl.settings.costCategories)) cl.settings.costCategories = d.costCategories;
    if(!Array.isArray(cl.settings.expenseCategories)) cl.settings.expenseCategories = d.expenseCategories;
    if(!Array.isArray(cl.settings.archiveSeparators)) cl.settings.archiveSeparators = d.archiveSeparators;
    if(!cl.settings.customFieldDefs || typeof cl.settings.customFieldDefs !== 'object') cl.settings.customFieldDefs = {};
    if(!Array.isArray(cl.settings.itemCatalog)) cl.settings.itemCatalog = [];
  }
  // تطبيع العملاء الأساسي
  cl.customers = (cl.customers || []).filter(function(c){ return c && typeof c === 'object'; }).map(function(c){
    return {
      id: c.id || '',
      name: c.name == null ? '' : String(c.name),
      code: c.code || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      city: c.city || '',
      department: c.department || '',
      taxId: c.taxId || '',
      category: c.category || '',
      status: c.status || 'active',
      openingBalance: Number(c.openingBalance) || 0,
      notes: c.notes || '',
      contacts: Array.isArray(c.contacts) ? c.contacts : [],
      // الكيانات المتداخلة (توافق مع برنامج العملاء الأصلي)
      projects: Array.isArray(c.projects) ? c.projects : [],
      contracts: Array.isArray(c.contracts) ? c.contracts : [],
      invoices: Array.isArray(c.invoices) ? c.invoices : [],
      collections: Array.isArray(c.collections) ? c.collections : [],
      workSurveys: Array.isArray(c.workSurveys) ? c.workSurveys : [],
      boqs: Array.isArray(c.boqs) ? c.boqs : [],
      guarantees: Array.isArray(c.guarantees) ? c.guarantees : [],
      ledger: Array.isArray(c.ledger) ? c.ledger : [],
      comms: Array.isArray(c.comms) ? c.comms : [],
      opportunities: Array.isArray(c.opportunities) ? c.opportunities : [],
      docs: Array.isArray(c.docs) ? c.docs : [],
      extraFields: Array.isArray(c.extraFields) ? c.extraFields : [],
      createdAt: c.createdAt || '',
      updatedAt: c.updatedAt || ''
    };
  });
  return cl;
}

/** اختصار للوصول لقسم العملاء */
function clientsData(){ return ensureClientsSection(); }

function ensureWarehousesSection(){
  const wh = getDataSection('warehouses');
  ['items','locations','movements','stocktakes'].forEach(function(k){
    if(!Array.isArray(wh[k])) wh[k] = [];
  });
  if(!wh.settings || typeof wh.settings !== 'object'){
    wh.settings = { itemPrefix: 'ITM-', movementPrefix: 'MV-', defaultLocationId: '' };
  }
  if(!wh.locations.length){
    wh.locations.push({ id: 'LOC-MAIN', name: 'المخزن الرئيسي', notes: '' });
    wh.settings.defaultLocationId = 'LOC-MAIN';
  }
  return wh;
}
function warehousesData(){ return ensureWarehousesSection(); }


function runSchemaMigrations(fromVersion){
  if((Number(fromVersion)||0) > SCHEMA_VERSION) return;   // ملف من نسخة أحدث: ما نلمسوش
  for(let v = (Number(fromVersion)||0) + 1; v <= SCHEMA_VERSION; v++){
    const fn = SCHEMA_MIGRATIONS[v];
    if(typeof fn === 'function'){ try{ fn(); }catch(e){ console.error('schema migration', v, e); } }
  }
  DATA.schemaVersion = SCHEMA_VERSION;
}

/* ===================== سجل التدقيق المالي التلقائي =====================
 * أي إضافة/تعديل/حذف في الدفعات والحضور والمصاريف والتكاليف والجزاءات والإجازات بيتسجل في سجل التدقيق
 * (القيمة القديمة ← الجديدة) من غير ما أي شاشة تحتاج تعمل ده بنفسها. */
const FIN_STORES = [
  { key:'workerPayments', label:'دفعة',
    fields: p=>[p.personType||(p.workerId?'worker':''), p.personId||p.workerId||'', p.type||'pay', p.amount, p.date, p.status||''],
    text: f=>finPerson(f[0],f[1])+' — '+(f[2]==='penalty'||f[2]==='deduction'?'جزاء':(f[2]==='bonus'||f[2]==='allowance'?'بدل':'صرف'))+' '+f[3]+' ج.م — '+f[4]+(f[5]?' ('+f[5]+')':'') },
  { key:'workerAttendance', label:'حضور',
    fields: a=>[attType(a), attPersonId(a), a.date, a.status||'', a.days, a.dayWage, a.deduction],
    text: f=>finPerson(f[0],f[1])+' — '+f[2]+' — '+(f[3]||'حاضر')+' ('+(f[4]==null?'':f[4])+' يوم'+(f[5]?' × '+f[5]:'')+(f[6]?' − خصم '+f[6]:'')+')' },
  { key:'attendance', label:'حضور موظف',
    fields: a=>['employee', a.employeeId, a.date, a.status||''],
    text: f=>finPerson(f[0],f[1])+' — '+f[2]+' — '+(f[3]||'حاضر') },
  { key:'expenses', label:'مصروف',
    fields: e=>[e.personKind||(e.equipmentId?'equipment':''), e.personId||e.equipmentId||'', e.amount, e.date, e.type||''],
    text: f=>finPerson(f[0],f[1])+' — '+f[2]+' ج.م — '+f[3]+(f[4]?' ('+f[4]+')':'') },
  { key:'costs', label:'تكلفة',
    fields: c=>[c.personKind, c.personId, c.amount, c.date, (typeof costItemText==='function'?costItemText(c):(c.item||''))],
    text: f=>finPerson(f[0],f[1])+' — '+f[2]+' ج.م — '+f[3]+(f[4]?' ('+f[4]+')':'') },
  { key:'employeePenalties', label:'جزاء موظف',
    fields: p=>['employee', p.employeeId, p.amount, p.date, p.reason||''],
    text: f=>finPerson(f[0],f[1])+' — '+f[2]+' ج.م — '+f[3] },
  { key:'leaves', label:'إجازة',
    fields: l=>['employee', l.employeeId, l.from, l.to, l.days, l.type||'', l.status||''],
    text: f=>finPerson(f[0],f[1])+' — '+f[2]+' → '+f[3]+' ('+f[4]+' يوم، '+f[5]+'، '+f[6]+')' }
];
function finPerson(kind, id){
  try{
    if(kind==='worker') return workerName(id);
    if(kind==='supervisor') return supervisorName(id);
    if(kind==='driver') return driverName(id);
    if(kind==='employee') return employeeName(id);
    if(kind==='equipment'){ const q = getEquipment(id); return q ? (q.name||q.code||id) : id; }
  }catch(_e){}
  return id || '';
}
let __finSnap = null;
function finSnapshotStore(st){
  const m = new Map(); const arr = DATA[st.key] || [];
  for(let i = 0; i < arr.length; i++){ const r = arr[i]; if(r && r.id) m.set(r.id, JSON.stringify(st.fields(r))); }
  return m;
}
function initFinanceSnapshot(){ __finSnap = {}; FIN_STORES.forEach(st=>{ __finSnap[st.key] = finSnapshotStore(st); }); }
function trackFinancialChanges(){
  if(!__finSnap){ initFinanceSnapshot(); return; }
  FIN_STORES.forEach(st=>{
    const prev = __finSnap[st.key] || new Map(); const cur = finSnapshotStore(st);
    const entries = [];
    cur.forEach((sig, id)=>{
      if(!prev.has(id)) entries.push(['إضافة', st.text(JSON.parse(sig))]);
      else if(prev.get(id) !== sig) entries.push(['تعديل', st.text(JSON.parse(prev.get(id)))+'  ⟵ صار ⟶  '+st.text(JSON.parse(sig))]);
    });
    prev.forEach((sig, id)=>{ if(!cur.has(id)) entries.push(['حذف', st.text(JSON.parse(sig))]); });
    if(entries.length > 200){
      addAudit('تغيير جماعي — '+st.label, entries.length+' سجل (إضافة/تعديل/حذف دفعة واحدة، مثلاً استيراد أو مسح)');
    } else {
      entries.forEach(e=>addAudit(e[0]+' '+st.label, e[1]));
    }
    __finSnap[st.key] = cur;
  });
}

/* ===================== تاريخ الانضمام للمشروع =====================
 * أي شخص/معدة المشروع بتاعها اتغيّر (من أي شاشة) من غير ما يتحدد تاريخ، بيتسجّل تاريخ انضمامه = النهارده.
 * لو التاريخ اتحدد (في نافذة التعديل أو من حركة الموارد) بيفضل زي ما هو. */
const PROJECT_MEMBER_STORES = ['workers', 'supervisors', 'drivers', 'equipment'];
let __projSnap = null;
function projectMembershipSnapshot(){
  const m = new Map();
  PROJECT_MEMBER_STORES.forEach(k=>(DATA[k]||[]).forEach(r=>{ if(r && r.id) m.set(k+'|'+r.id, { p: String(r.project||'').trim(), s: r.projectSince||'' }); }));
  return m;
}
function stampProjectMembership(){
  if(!__projSnap){ __projSnap = projectMembershipSnapshot(); return; }
  const today = (typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0,10);
  PROJECT_MEMBER_STORES.forEach(k=>(DATA[k]||[]).forEach(r=>{
    if(!r || !r.id) return;
    const cur = String(r.project||'').trim();
    if(!cur){ if(r.projectSince) r.projectSince = ''; return; }
    const prev = __projSnap.get(k+'|'+r.id);
    if(!prev){ if(!r.projectSince) r.projectSince = today; return; }                 // سجل جديد
    if(prev.p !== cur && (!r.projectSince || r.projectSince === prev.s)) r.projectSince = today;   // اتنقل لمشروع تاني من غير تاريخ
  }));
  __projSnap = projectMembershipSnapshot();
}

function rebuildIndexes(){
  bumpIndexVersion();
  const employeesById = Object.create(null);
  const workersById = Object.create(null);
  const equipmentById = Object.create(null);
  const departmentsById = Object.create(null);
  const attendanceByEmployee = Object.create(null);
  const workerAttByWorker = Object.create(null);
  const leavesByEmployee = Object.create(null);
  const payrollByEmployee = Object.create(null);
  const equipLogsByEquipment = Object.create(null);

  (DATA.employees || []).forEach(e => { if(e && e.id) employeesById[e.id] = e; });
  (DATA.workers || []).forEach(w => { if(w && w.id) workersById[w.id] = w; });
  (DATA.equipment || []).forEach(eq => { if(eq && eq.id) equipmentById[eq.id] = eq; });
  (DATA.departments || []).forEach(d => { if(d && d.id) departmentsById[d.id] = d; });
  (DATA.attendance || []).forEach(a => {
    if(!a || !a.id) return;
    const eid = a.employeeId || '';
    if(!attendanceByEmployee[eid]) attendanceByEmployee[eid] = [];
    attendanceByEmployee[eid].push(a);
  });
  (DATA.workerAttendance || []).forEach(a => {
    if(!a || !a.id) return;
    const wid = a.workerId || '';
    if(!workerAttByWorker[wid]) workerAttByWorker[wid] = [];
    workerAttByWorker[wid].push(a);
  });
  (DATA.leaves || []).forEach(l => {
    if(!l || !l.id) return;
    const eid = l.employeeId || '';
    if(!leavesByEmployee[eid]) leavesByEmployee[eid] = [];
    leavesByEmployee[eid].push(l);
  });
  (DATA.payroll || []).forEach(p => {
    if(!p || !p.id) return;
    const eid = p.employeeId || '';
    if(!payrollByEmployee[eid]) payrollByEmployee[eid] = [];
    payrollByEmployee[eid].push(p);
  });
  (DATA.equipmentLogs || []).forEach(log => {
    if(!log || !log.id) return;
    const eqid = log.equipmentId || '';
    if(!equipLogsByEquipment[eqid]) equipLogsByEquipment[eqid] = [];
    equipLogsByEquipment[eqid].push(log);
  });
  __indexes = { employeesById, workersById, equipmentById, departmentsById,
    attendanceByEmployee, workerAttByWorker, leavesByEmployee, payrollByEmployee, equipLogsByEquipment };
}

/** يحتفظ بكل السجلات الصالحة (كائنات) ويديّ أي سجل ملوش id رقم جديد بدل ما يتمسح بصمت */
function ensureRecordIds(arr){
  const out = [];
  (arr || []).forEach(x=>{
    if(!x || typeof x !== 'object' || Array.isArray(x)) return;   // قيم تالفة (مش سجلات) بس هي اللي بتتشال
    if(!x.id) x.id = (typeof uid==='function') ? uid() : ('rec_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
    out.push(x);
  });
  return out;
}

function sanitizeLoadedData(){
  if(!Array.isArray(DATA.employees)) DATA.employees = [];
  if(!Array.isArray(DATA.workers)) DATA.workers = [];
  if(!Array.isArray(DATA.equipment)) DATA.equipment = [];
  if(!Array.isArray(DATA.departments)) DATA.departments = [];
  if(!Array.isArray(DATA.attendance)) DATA.attendance = [];
  if(!Array.isArray(DATA.workerAttendance)) DATA.workerAttendance = [];
  if(!Array.isArray(DATA.leaves)) DATA.leaves = [];
  if(!Array.isArray(DATA.payroll)) DATA.payroll = [];
  if(!Array.isArray(DATA.workerPayments)) DATA.workerPayments = [];
  if(!Array.isArray(DATA.employeePenalties)) DATA.employeePenalties = [];
  if(!Array.isArray(DATA.equipmentLogs)) DATA.equipmentLogs = [];
  if(!Array.isArray(DATA.equipmentDaily)) DATA.equipmentDaily = [];
  if(!Array.isArray(DATA.personDocuments)) DATA.personDocuments = [];
  if(!Array.isArray(DATA.archiveTrash)) DATA.archiveTrash = [];
  if(!Array.isArray(DATA.resignedArchive)) DATA.resignedArchive = [];
  try{ if(typeof ensureAllResignedDepartments==='function') ensureAllResignedDepartments(); }catch(_e){}
  if(!DATA.requiredDocsByKind || typeof DATA.requiredDocsByKind!=='object') DATA.requiredDocsByKind = {};
  if(!Array.isArray(DATA.performanceReviews)) DATA.performanceReviews = [];
  if(!Array.isArray(DATA.projectDaily)) DATA.projectDaily = [];
  if(!Array.isArray(DATA.projectPlans)) DATA.projectPlans = [];
  if(!Array.isArray(DATA.resourceTransfers)) DATA.resourceTransfers = [];
  if(!Array.isArray(DATA.fuelLogs)) DATA.fuelLogs = [];
  if(!Array.isArray(DATA.supervisorExpenses)) DATA.supervisorExpenses = [];
  if(!Array.isArray(DATA.expenses)) DATA.expenses = [];
  if(!Array.isArray(DATA.payments)) DATA.payments = [];
  if(!Array.isArray(DATA.projects)) DATA.projects = [];
  try{ if(typeof ensureClientsSection==='function') ensureClientsSection(); }catch(_e){}
  if(!DATA.expenseSections || typeof DATA.expenseSections !== 'object') DATA.expenseSections = {};
  if(!DATA.vehicleExpenseItems || typeof DATA.vehicleExpenseItems !== 'object') DATA.vehicleExpenseItems = {};
  if(!Array.isArray(DATA.expenseItemPool)) DATA.expenseItemPool = [];
  if(!DATA.personExpenseItems || typeof DATA.personExpenseItems !== 'object') DATA.personExpenseItems = {};
  if(!Array.isArray(DATA.licenseExpenses)) DATA.licenseExpenses = [];
  if(!Array.isArray(DATA.licenseExpenseSections)) DATA.licenseExpenseSections = [];
  if(!Array.isArray(DATA.licenseExpenseFieldDefs)) DATA.licenseExpenseFieldDefs = [];
  if(!Array.isArray(DATA.expenseTypes)) DATA.expenseTypes = [];
  if(!Array.isArray(DATA.documentTypes)) DATA.documentTypes = [];
  if(!DATA.documentTypesByKind || typeof DATA.documentTypesByKind !== 'object') DATA.documentTypesByKind = {};
  if(!Array.isArray(DATA.documentTypeHidden)) DATA.documentTypeHidden = [];
  if(!Array.isArray(DATA.paymentItemPool)) DATA.paymentItemPool = [];
  if(!Array.isArray(DATA.penaltyItemPool)) DATA.penaltyItemPool = [];
  if(!Array.isArray(DATA.dailyPayItemPool)) DATA.dailyPayItemPool = [];
  if(!DATA.expenseItemPools || typeof DATA.expenseItemPools !== 'object') DATA.expenseItemPools = {};
  if(!Array.isArray(DATA.workerCategories)) DATA.workerCategories = [];
  if(!Array.isArray(DATA.equipmentCategories)) DATA.equipmentCategories = [];
  if(!Array.isArray(DATA.driverCategories)) DATA.driverCategories = [];
  if(!Array.isArray(DATA.supervisorCategories)) DATA.supervisorCategories = [];
  if(!Array.isArray(DATA.employeeCategories)) DATA.employeeCategories = [];
  if(!Array.isArray(DATA.drivers)) DATA.drivers = [];
  if(!DATA.settings || typeof DATA.settings !== 'object') {
    DATA.settings = { companyName: '', companyAddress: '', companyPhone: '', companyTaxId: '', workDaysPerMonth: 26, defaultLeaveDays: 21, defaultDailyWage: 0, employeeSalaryMode: 'fixed', leaveExcludeFridays: false };
  }
  if(!Array.isArray(DATA.auditLog)) DATA.auditLog = [];
  if(!Array.isArray(DATA.dailyTasks)) DATA.dailyTasks = [];
  if(!Array.isArray(DATA.users)) DATA.users = [];
  if(!Array.isArray(DATA.supervisors)) DATA.supervisors = [];
  if(!Array.isArray(DATA.projects)) DATA.projects = [];
  if(!Array.isArray(DATA.equipmentTypes)) DATA.equipmentTypes = [];
  if(!DATA.customFieldDefs || typeof DATA.customFieldDefs !== 'object') {
    DATA.customFieldDefs = { employees: [], workers: [], supervisors: [], equipment: [], departments: [], drivers: [] };
  }
  ['employees','workers','supervisors','equipment','departments','drivers'].forEach(k=>{
    if(!Array.isArray(DATA.customFieldDefs[k])) DATA.customFieldDefs[k] = [];
  });

  DATA.employees = ensureRecordIds(DATA.employees);
  DATA.workers = ensureRecordIds(DATA.workers);
  DATA.equipment = ensureRecordIds(DATA.equipment);
  DATA.departments = ensureRecordIds(DATA.departments);
  DATA.attendance = ensureRecordIds(DATA.attendance);
  DATA.workerAttendance = ensureRecordIds(DATA.workerAttendance);
  DATA.leaves = ensureRecordIds(DATA.leaves);
  DATA.payroll = ensureRecordIds(DATA.payroll);
  DATA.workerPayments = ensureRecordIds(DATA.workerPayments);
  DATA.employeePenalties = ensureRecordIds(DATA.employeePenalties);
  DATA.equipmentLogs = ensureRecordIds(DATA.equipmentLogs);
  DATA.supervisors = ensureRecordIds(DATA.supervisors);
  DATA.projects = (DATA.projects||[]).filter(p => p && typeof p === 'object' && (p.id || p.name));
  DATA.projects.forEach(p=>{
    if(p.budget === undefined) p.budget = 0;
    if(p.status === undefined) p.status = 'active';
    if(p.code === undefined) p.code = '';
  });
  DATA.equipmentTypes = (DATA.equipmentTypes||[]).filter(p => p && typeof p === 'object' && (p.id || p.name));
  DATA.drivers = ensureRecordIds(DATA.drivers);
  DATA.fuelLogs = ensureRecordIds(DATA.fuelLogs);
  DATA.resourceTransfers = ensureRecordIds(DATA.resourceTransfers);
  DATA.projectPlans = ensureRecordIds(DATA.projectPlans);
  DATA.projectDaily = ensureRecordIds(DATA.projectDaily);
  DATA.performanceReviews = ensureRecordIds(DATA.performanceReviews);
  DATA.personDocuments = ensureRecordIds(DATA.personDocuments);
  DATA.supervisorExpenses = ensureRecordIds(DATA.supervisorExpenses);
  DATA.licenseExpenses = ensureRecordIds(DATA.licenseExpenses);
  // إعادة حساب حالة البطاقة/الرخصة من التاريخ (إصلاح بيانات قديمة)
  if(typeof migrateExpenseTypeLabels==='function'){ try{ migrateExpenseTypeLabels(); }catch(_e){} }
  if(typeof syncDocStatusesFromDates==='function'){
    ['employees','workers','supervisors','drivers'].forEach(k=>{
      (DATA[k]||[]).forEach(rec=> syncDocStatusesFromDates(rec));
    });
  }
  DATA.equipmentDaily = ensureRecordIds(DATA.equipmentDaily);
  DATA.costs = ensureRecordIds(DATA.costs);
  if(DATA.auditLog.length > 3000) DATA.auditLog = DATA.auditLog.slice(0, 3000);
}

async function loadData(){
  try{
    let parsed = null;
    if(window.desktopApi && window.desktopApi.loadData){
      parsed = await window.desktopApi.loadData();
    } else {
      try{ parsed = JSON.parse(localStorage.getItem('hr-data')||'null'); }catch(e){ parsed = null; }
    }
    if(parsed && typeof parsed === 'object'){
      // تحميل كل المصفوفات المعروفة — عدم نسيان أي مفتاح يسبب فقدان بيانات بعد التحديث
      const ARRAY_KEYS = [
        'employees','workers','supervisors','equipment','departments','projects','equipmentTypes',
        'attendance','workerAttendance','leaves','payroll','workerPayments','employeePenalties',
        'equipmentLogs','equipmentDaily','drivers','fuelLogs','resourceTransfers','projectPlans',
        'projectDaily','performanceReviews','personDocuments','supervisorExpenses','licenseExpenses','expenses','licenseExpenseSections','licenseExpenseFieldDefs','expenseTypes','documentTypes','workerCategories','employeeCategories','auditLog','dailyTasks','users'
      ];
      ARRAY_KEYS.forEach(k=>{
        if(Array.isArray(parsed[k])) DATA[k] = parsed[k];
        else if(DATA[k] === undefined) DATA[k] = [];
      });
      if(parsed.customFieldDefs && typeof parsed.customFieldDefs === 'object')
        DATA.customFieldDefs = parsed.customFieldDefs;
      if(parsed.settings && typeof parsed.settings === 'object')
        DATA.settings = Object.assign({}, DATA.settings||{}, parsed.settings);
      if(parsed.network) DATA.network = parsed.network;
      // أي مفتاح تاني في الملف (قوائم/كائنات/قيم): يُحمَّل كما هو.
      // مهم: المفاتيح اللي ليها قيمة افتراضية في state.js (زي documentTypesByKind و driverCategories)
      // كانت بتتجاهل بياناتها المحفوظة وتتمسح عند أول حفظ — دلوقتي كل مفتاح بيتحمّل.
      const _plain = (o)=> o && typeof o === 'object' && !Array.isArray(o);
      Object.keys(parsed).forEach(k=>{
        const v = parsed[k];
        if(v === undefined) return;
        if(k === 'settings' || k === 'customFieldDefs' || k === 'network') return; // اتعالجوا فوق
        if(Array.isArray(v)){ DATA[k] = v; }
        else if(_plain(v) && _plain(DATA[k])){ DATA[k] = Object.assign({}, DATA[k], v); }
        else if(v !== null){ DATA[k] = v; }
        else if(DATA[k] === undefined){ DATA[k] = v; }
      });
    }
  }catch(e){ console.error('loadData', e); }
  sanitizeLoadedData();
  try{ if(typeof restoreUsersCredentialsIfNeeded==='function') restoreUsersCredentialsIfNeeded(); }catch(_e){}
  // ملف بيانات من نسخة أحدث من البرنامج: نمنع الحفظ عشان ما نبوّظش البيانات بنسخة قديمة
  window.__schemaTooNew = (Number(DATA.schemaVersion)||0) > SCHEMA_VERSION;
  migrateLegacyFields();
  rebuildIndexes();
  try{ initFinanceSnapshot(); }catch(e){}
  try{ __projSnap = projectMembershipSnapshot(); }catch(e){}
  if(window.__repairNote){ const _n = window.__repairNote; window.__repairNote = ''; setTimeout(()=>{ try{ showToast('🛠️ '+_n, 12000); }catch(e){} }, 1500); }
  if(window.__schemaTooNew){
    setTimeout(()=>{ try{ showToast('⚠️ ملف البيانات ده من نسخة أحدث من البرنامج — اتفتح للعرض فقط ومش هيتحفظ عليه. حدّث البرنامج.', 15000); }catch(e){} }, 1200);
  }
}

/** تحقق إن الملف نسخة احتياطية صالحة من البرنامج قبل أي استيراد (بيمنع استبدال البيانات بملف غلط/تالف) */
function validateBackupObject(obj){
  if(!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok:false, error:'محتوى الملف مش كائن بيانات' };
  const known = ['employees','workers','supervisors','drivers','equipment','departments','projects','attendance','workerAttendance','leaves','workerPayments','personDocuments','settings'];
  if(!known.some(k => k in obj)) return { ok:false, error:'مفيش أي جدول بيانات معروف في الملف' };
  for(const k of Object.keys(obj)){
    if(k === 'network') continue;
    const cur = DATA[k];
    if(Array.isArray(cur) && !Array.isArray(obj[k])) return { ok:false, error:'القسم "'+k+'" لازم يكون قائمة' };
    if(cur && typeof cur === 'object' && !Array.isArray(cur) && (obj[k] === null || typeof obj[k] !== 'object' || Array.isArray(obj[k]))) return { ok:false, error:'القسم "'+k+'" لازم يكون كائن' };
  }
  const recs = ['employees','workers','supervisors','drivers','equipment','departments','attendance','workerAttendance','leaves','workerPayments','personDocuments'];
  for(const k of recs){
    if(Array.isArray(obj[k]) && obj[k].some(x => !x || typeof x !== 'object' || Array.isArray(x))) return { ok:false, error:'القسم "'+k+'" فيه سجلات غير صالحة' };
  }
  return { ok:true };
}


/* ===================== حماية وإصلاح النصوص التالفة (�) =====================
 * الرمز � (U+FFFD) بيظهر لما حرف عربي (2 بايت) يتقسم أثناء النقل. السبب الأصلي (قراءة طلبات السيرفر) اتصلّح،
 * لكن البيانات اللي اتبوّظت قبل كده لازم تتصلّح: أسماء المشاريع التالفة بتتدمج تلقائياً في المشروع السليم المطابق. */
const FFFD = '\uFFFD';
const PROJECT_REF_KEYS = ['project', 'fromProject', 'toProject', 'projectName'];
function textHasCorruption(s){ return typeof s === 'string' && s.indexOf(FFFD) >= 0; }
function escapeRegexText(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** بيدمج اسم مشروع تالف في اسم سليم مطابق (كل � أو مجموعة � = حرف أو اتنين ضايعين) */
function repairCorruptedProjectNames(){
  const out = { repaired: [], unresolved: [] };
  try{
    const arrays = Object.keys(DATA).filter(k => Array.isArray(DATA[k]) && k !== 'auditLog' && k !== 'projects');
    const bad = new Set(), good = new Set();
    (DATA.projects || []).forEach(p => {
      const n = String(p && p.name || '').trim(); if(!n) return;
      (textHasCorruption(n) ? bad : good).add(n);
    });
    arrays.forEach(k => DATA[k].forEach(r => {
      if(!r || typeof r !== 'object') return;
      PROJECT_REF_KEYS.forEach(f => {
        const v = r[f]; if(typeof v !== 'string') return;
        const n = v.trim(); if(!n) return;
        (textHasCorruption(n) ? bad : good).add(n);
      });
    }));
    if(!bad.size) return out;
    const goodList = Array.from(good);
    const map = new Map();
    bad.forEach(b => {
      const parts = b.split(/\uFFFD+/);
      const runs = b.match(/\uFFFD+/g) || [];
      let src = '^';
      parts.forEach((p, i) => { src += escapeRegexText(p); if(i < runs.length) src += '.{0,' + (runs[i].length + 1) + '}'; });
      src += '$';
      let re; try{ re = new RegExp(src); }catch(_e){ return; }
      const cands = goodList.filter(g => re.test(g));
      if(cands.length === 1) map.set(b, cands[0]);
      else if(cands.length > 1){
        // نختار الأقرب في الطول لو فيه فرق واضح، وإلا نسيبه للمستخدم
        const target = b.replace(/\uFFFD+/g, 'x').length;
        const sorted = cands.slice().sort((a, c) => Math.abs(a.length - target) - Math.abs(c.length - target));
        if(Math.abs(sorted[0].length - target) < Math.abs(sorted[1].length - target)) map.set(b, sorted[0]);
      }
    });
    bad.forEach(b => { if(!map.has(b)) out.unresolved.push(b); });
    if(!map.size) return out;
    // 1) تحديث كل المراجع بالاسم
    arrays.forEach(k => DATA[k].forEach(r => {
      if(!r || typeof r !== 'object') return;
      PROJECT_REF_KEYS.forEach(f => {
        const v = r[f];
        if(typeof v === 'string' && map.has(v.trim())) r[f] = map.get(v.trim());
      });
    }));
    // 2) شيل المشاريع الوهمية وحوّل مراجعها بالـ id للمشروع السليم
    const idMap = {};
    const cleanByName = {}; (DATA.projects || []).forEach(p => { if(p && p.name && !textHasCorruption(p.name)) cleanByName[String(p.name).trim()] = p; });
    DATA.projects = (DATA.projects || []).filter(p => {
      const n = String(p && p.name || '').trim();
      if(map.has(n)){
        const target = cleanByName[map.get(n)];
        if(target && p.id){
          idMap[p.id] = target.id;
          if(!target.budget && p.budget) target.budget = p.budget;          // ما نخسّرش ميزانية اتسجلت على الاسم التالف
          if(!target.notes && p.notes) target.notes = p.notes;
        }
        return false;
      }
      return true;
    });
    if(Object.keys(idMap).length){
      arrays.forEach(k => DATA[k].forEach(r => { if(r && typeof r === 'object' && r.projectId && idMap[r.projectId]) r.projectId = idMap[r.projectId]; }));
    }
    map.forEach((to, from) => out.repaired.push({ from, to }));
    try{
      addAudit('إصلاح أسماء مشاريع تالفة', out.repaired.map(x => x.from + ' ← ' + x.to).join(' | '));
      window.__repairNote = 'تم إصلاح ' + out.repaired.length + ' اسم مشروع تالف ودمجه في المشروع الصحيح: ' + out.repaired.map(x => x.to).join('، ');
    }catch(_e){}
  }catch(e){ console.error('repairCorruptedProjectNames', e); }
  return out;
}

/**
 * نسخ مشتقة (أرشيف المستقيلين / سلة المحذوفات) فيها نصوص تالفة:
 * - الثوابت (sectionName) بتتكتب من جديد سليمة.
 * - اسم/كود الشخص بيتنسخ من السجل الحي لو هو السليم، ولو السجل الحي هو التالف والنسخة الأرشيفية سليمة (اتاخدت قبل التلف) بنرجّع الاسم منها.
 */
function repairDerivedCorruptedText(){
  let fixed = 0; const notes = [];
  try{
    const live = { worker: DATA.workers, employee: DATA.employees, supervisor: DATA.supervisors, driver: DATA.drivers };
    (DATA.resignedArchive || []).forEach(e => {
      if(!e || typeof e !== 'object') return;
      if(textHasCorruption(e.sectionName)){ e.sectionName = 'المستقيلين'; fixed++; }
      const rec = (live[e.kind] || []).find(p => p && p.id === e.personId);
      ['name', 'code'].forEach(f => {
        const eb = textHasCorruption(e[f]);
        const sb = !!(e.entity && textHasCorruption(e.entity[f]));
        const lb = !!(rec && textHasCorruption(rec[f]));
        if(rec && !lb && (eb || sb)){                                   // السجل الحي سليم → نصلّح النسخة
          if(eb) e[f] = rec[f];
          if(sb) e.entity[f] = rec[f];
          fixed++;
        } else if(rec && lb){                                           // السجل الحي تالف → نشوف لو الأرشيف فيه نسخة سليمة
          const good = (!eb && e[f]) ? e[f] : ((e.entity && !sb && e.entity[f]) ? e.entity[f] : '');
          if(good){ notes.push(rec[f] + ' ← ' + good); rec[f] = good; if(eb) e[f] = good; if(sb) e.entity[f] = good; fixed++; }
        }
      });
    });
    (DATA.archiveTrash || []).forEach(t => { if(t && textHasCorruption(t.sectionName)){ t.sectionName = 'حذف سجل'; fixed++; } });
    // أنواع معدات وهمية (اتعملت من اسم نوع تالف) ومفيش معدة بتستخدمها دلوقتي → تتشال
    const usedTypes = new Set((DATA.equipment || []).map(e => String(e && (e.typeLabel || e.typeName) || '').trim()));
    const beforeT = (DATA.equipmentTypes || []).length;
    DATA.equipmentTypes = (DATA.equipmentTypes || []).filter(x => !(x && textHasCorruption(x.name) && !usedTypes.has(String(x.name).trim())));
    fixed += beforeT - DATA.equipmentTypes.length;
    if(fixed){
      try{ addAudit('إصلاح نصوص تالفة في الأرشيف', fixed + ' عنصر' + (notes.length ? ' — استرجاع من الأرشيف: ' + notes.join(' | ') : '')); }catch(_e){}
    }
  }catch(e){ console.error('repairDerivedCorruptedText', e); }
  return fixed;
}

/** كل الحقول النصية اللي فيها رموز تالفة (للتنبيه في فحص البيانات) */
function findCorruptedTexts(limit){
  const res = []; limit = limit || 300;
  // الأرشيف/السلة نسخ مشتقة (بتتصلّح من السجل الحي) فبنبلّغ عن السجل الحي بس
  const skip = { auditLog: 1, users: 1, resignedArchive: 1, archiveTrash: 1, equipmentTypes: 1 };
  for(const k of Object.keys(DATA)){
    if(skip[k] || !Array.isArray(DATA[k])) continue;
    for(const r of DATA[k]){
      if(!r || typeof r !== 'object') continue;
      for(const f of Object.keys(r)){
        const v = r[f];
        if(textHasCorruption(v)){ res.push({ store: k, id: r.id || '', field: f, value: v, name: r.name || '' }); if(res.length >= limit) return res; }
      }
    }
  }
  return res;
}

function migrateLegacyFields(){
  runSchemaMigrations(DATA.schemaVersion);
  try{ if(typeof lgOnDataLoaded==='function') lgOnDataLoaded(); }catch(e){ console.error('ledger load hook', e); }   // دفتر الموردين: تنظيف + ترقية + فهارس
  try{ repairCorruptedProjectNames(); }catch(e){}
  try{ repairDerivedCorruptedText(); }catch(e){}
  try{ (DATA.workerAttendance||[]).forEach(normalizeAttendanceRecord); }catch(e){}   // سجلات مستوردة/قديمة ناقصها نوع الشخص — بتتوحّد مرة واحدة
  DATA.employees.forEach(e=>{
    if(!e.status) e.status = 'active';
    if(!e.employmentType) e.employmentType = 'full';
    if(e.salary === undefined) e.salary = 0;
    if(!Array.isArray(e.attachments)) e.attachments = [];
    if(e.leaveBalance === undefined) e.leaveBalance = (DATA.settings && DATA.settings.defaultLeaveDays) || 21;
  });
  DATA.workers.forEach(w=>{
    if(!w.status) w.status = 'active';
    if(!w.type) w.type = 'daily';
    if(w.dailyWage === undefined) w.dailyWage = (DATA.settings && DATA.settings.defaultDailyWage) || 0;
    if(!Array.isArray(w.attachments)) w.attachments = [];
    if(w.supervisorId === undefined) w.supervisorId = '';
    if(!w.custom || typeof w.custom !== 'object') w.custom = {};
  });
  DATA.employees.forEach(e=>{
    if(!e.custom || typeof e.custom !== 'object') e.custom = {};
  });
  DATA.supervisors.forEach(s=>{
    if(!s.status) s.status = 'active';
    if(s.dailyWage === undefined) s.dailyWage = 0;
    if(!Array.isArray(s.attachments)) s.attachments = [];
    if(!s.custom || typeof s.custom !== 'object') s.custom = {};
  });
  DATA.equipment.forEach(eq=>{
    if(!eq.custom || typeof eq.custom !== 'object') eq.custom = {};
  });
  DATA.departments.forEach(d=>{
    if(!d.custom || typeof d.custom !== 'object') d.custom = {};
  });
  // projects from free-text on workers/attendance
  const projNames = new Set((DATA.projects||[]).map(p=>String(p.name||'').trim()).filter(Boolean));
  (DATA.workers||[]).forEach(w=>{
    const n = String(w.project||'').trim();
    if(n && !textHasCorruption(n)) projNames.add(n);     // اسم تالف (�) ما بيعملش مشروع جديد
  });
  (DATA.workerAttendance||[]).forEach(a=>{
    const n = String(a.project||'').trim();
    if(n && !textHasCorruption(n)) projNames.add(n);
  });
  DATA.projects = Array.from(projNames).sort((a,b)=>a.localeCompare(b,'ar')).map(name=>{
    const existing = (DATA.projects||[]).find(p=>p.name===name);
    return existing || { id: 'proj_'+name.replace(/\s+/g,'_').slice(0,40)+'_'+Math.random().toString(36).slice(2,6), name };
  });
  DATA.equipment.forEach(eq=>{
    if(!eq.status) eq.status = 'available';
    if(eq.ownership === undefined) eq.ownership = 'owned';
    if(eq.chassisNumber === undefined) eq.chassisNumber = '';
    if(eq.hourlyCost === undefined) eq.hourlyCost = 0;
    if(eq.fuelPrice === undefined) eq.fuelPrice = 0;
    if(eq.totalHours === undefined) eq.totalHours = 0;
    if(eq.vehicleNumber === undefined) eq.vehicleNumber = '';
    // collect custom type names
    const tn = String(eq.typeLabel||eq.typeName||'').trim();
    if(tn && !textHasCorruption(tn)){          // نوع تالف (�) ما بيتحولش لنوع جديد
      DATA.equipmentTypes = DATA.equipmentTypes||[];
      if(!DATA.equipmentTypes.some(x=>String(x.name||'').trim()===tn))
        DATA.equipmentTypes.push({ id: 'et_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), name: tn });
    }

    if(!eq.type) eq.type = 'machine';
    if(!Array.isArray(eq.attachments)) eq.attachments = [];
  });
  DATA.leaves.forEach(l=>{
    if(!l.status) l.status = 'pending';
    if(!l.type) l.type = 'annual';
  });
  DATA.attendance.forEach(a=>{ if(!a.status) a.status = 'present'; });
  DATA.workerAttendance.forEach(a=>{ if(!a.status) a.status = 'present'; if(a.days===undefined) a.days = 1; });
  DATA.payroll.forEach(p=>{
    if(p.basicSalary === undefined) p.basicSalary = 0;
    if(p.allowances === undefined) p.allowances = 0;
    if(p.deductions === undefined) p.deductions = 0;
    if(p.netSalary === undefined) p.netSalary = Number(p.basicSalary||0) + Number(p.allowances||0) - Number(p.deductions||0);
  });
}

function saveData(immediate){
  if(window.__schemaTooNew){ try{ showToast('🔒 ملف البيانات من نسخة أحدث من البرنامج — الحفظ متوقف'); }catch(e){} return Promise.resolve(); }
  if(typeof readOnlyMode !== 'undefined' && readOnlyMode){
    showToast('🔒 وضع القراءة فقط — لا يمكن حفظ تعديلات');
    return Promise.resolve();
  }
  rebuildIndexes();
  try{ if(typeof lgOnBeforeSave==='function') lgOnBeforeSave(); }catch(e){}   // فهارس دفتر الموردين
  if(immediate){
    if(__saveTimer){ clearTimeout(__saveTimer); __saveTimer = null; }
    return flushSave();
  }
  __savePending = true;
  if(__saveTimer) clearTimeout(__saveTimer);
  __saveTimer = setTimeout(()=>{ __saveTimer = null; flushSave(); }, 280);
}

function flushSave(){
  try{ stampProjectMembership(); }catch(e){ console.error('project membership', e); }
  if(window.__schemaTooNew) return Promise.resolve();
  try{ trackFinancialChanges(); }catch(e){ console.error('finance audit', e); }
  __savePending = false;
  if(typeof isNetworkMode==='function' && isNetworkMode()){
    return saveDataNetwork();
  }
  if(!window.desktopApi || !window.desktopApi.saveData){
    try{ localStorage.setItem('hr-data', JSON.stringify(DATA)); }catch(e){}
    return Promise.resolve();
  }
  return window.desktopApi.saveData(DATA).then(res=>{
    if(!res || !res.ok){ showToast('تعذر الحفظ على الجهاز'); }
  }).catch(()=>{ showToast('تعذر الحفظ على الجهاز'); });
}

window.addEventListener('beforeunload', ()=>{
  if(typeof isNetworkMode==='function' && isNetworkMode()) return;
  if(__savePending || __saveTimer){
    try{
      if(__saveTimer){ clearTimeout(__saveTimer); __saveTimer = null; }
      if(window.desktopApi && window.desktopApi.saveDataSync){
        window.desktopApi.saveDataSync(DATA);
      }else if(window.desktopApi && window.desktopApi.saveData){
        window.desktopApi.saveData(DATA);
      }
    }catch(e){}
  }
});
