/* =====================================================================
   modules.js — هيكل التنقل الموحّد (الأقسام الـ 11 حسب تصميم المستخدم) + صفحات «قيد الدمج»
   ---------------------------------------------------------------------
   الشكل: صف أزرار للأقسام + تحته صف لصفحات القسم الحالي — بنفس أزرار وشكل برنامج الموارد البشرية (.nav / .nav-btn).
   مفاتيح الصفحات (مهم لتجنب التصادم):
     - صفحات HR القديمة بمفاتيحها بدون بادئة (employees, workers, ...) — الصلاحيات المخزنة معتمدة عليها
     - أي صفحة من مصدر تاني ببادئة مصدرها:  ledger.invoices  clients.contracts  warehouses.home  accounts.reports  general.overview  tasks.my
   القسم والصفحة حاجتين مختلفتين: القسم تجميع للعرض، والبادئة بتحدد الكود صاحب الصفحة.
   ===================================================================== */

const NAV_SECTIONS = [
  { id: 'general', label: '🧭 مركز المتابعة', pages: [
      ['dashboard', '🧭 مركز المتابعة']
  ] },
  { id: 'tasks', label: 'مهامي', pages: [
      ['tasks.my', 'مهامي']
  ] },
  { id: 'hr', label: 'الموارد البشرية', pages: [
      ['hrHome', '🏠 لوحات الموارد البشرية'],
      ['employees', 'الموظفين'],
      ['supervisors', 'المشرفون'],
      ['workers', 'العمال'],
      ['drivers', 'السائقون'],
      ['equipment', 'معدات ومركبات'],
      ['attendance', 'حضور الموظفين'],
      ['workerAttendance', 'اليوميات'],
      ['leaves', 'الإجازات'],
      ['performance', 'تقييم الأداء']
  ] },
  { id: 'clients', label: 'العملاء والمشاريع', pages: [
      ['clients.customers', 'العملاء'],
      ['projects', 'المشاريع'],
      ['clients.workSurveys', 'أعمال الحصر'],
      ['clients.boqs', 'المقايسات'],
      ['clients.contracts', 'العقود'],
      ['clients.invoices', 'المستخلصات'],
      ['clients.guarantees', 'الضمانات'],
      ['clients.comparison', 'المقارنة'],
      ['clients.crm', 'CRM']
  ] },
  { id: 'suppliers', label: 'الموردون', pages: [
      ['ledger.suppliers', 'الموردون'],
      ['ledger.invoices', 'الفواتير'],
      ['ledger.quarterly', 'إشعارات الخصم'],
      ['ledger.returns', 'المرتجعات']
  ] },
  { id: 'warehouses', label: 'المخازن', pages: [
      ['warehouses.home', 'المخازن'],
      ['warehouses.reports', 'تقارير المخازن']
  ] },
  { id: 'movements', label: 'حركة الموارد', pages: [
      ['transfers', 'حركة الموارد']
  ] },
  { id: 'accounts', label: 'الحسابات', pages: [
      ['workerDues', 'المستحقات'],
      ['ledger.payments', 'الدفعات'],
      ['expenses', 'مصاريف شاملة'],
      ['costs', 'تكاليف شاملة'],
      ['clients.collections', 'الإيرادات'],
      ['clients.accounts', 'حسابات العملاء']
  ] },
  { id: 'reports', label: 'التقارير', pages: [
      ['reports', 'تقارير الموارد البشرية'],
      ['clients.reports', 'تقارير العملاء والمشاريع'],
      ['ledger.reports', 'تقارير الموردين'],
      ['accounts.reports', 'تقارير الحسابات']
  ] },
  { id: 'archive', label: 'الأرشيف', pages: [
      ['archive', 'أرشيف الموارد البشرية'],
      ['ledger.archive', 'أرشيف الموردين'],
      ['clients.archive', 'أرشيف العملاء والمشاريع']
  ] },
  { id: 'settings', label: 'الإعدادات', pages: [
      ['backup', 'الإعدادات العامة'],
      ['users', 'المستخدمون'],
      ['ledger.categories', 'الاقتراحات']
  ] }
];

/** صفحات HR الفرعية/التحويلات الداخلية (مش أزرار) — بتتبع قسم الموارد البشرية في التظليل */
const HR_HIDDEN_PAGES = ['employeeDetail', 'personDetail', 'fuel', 'documents', 'assistant', 'payroll'];

/** صفحات لسه ما اتنقلتش (قيد الدمج) — الإصدار اللي هتتنفذ فيه */
const PLACEHOLDER_PAGES = {};

/* آخر صفحة زارها المستخدم في كل قسم (للرجوع إليها عند الضغط على زر القسم) */
const __sectionLastPage = {};

function sectionOfPage(page){
  const p = String(page || '');
  if(p.indexOf('home_') === 0){ const hs = NAV_SECTIONS.find(x => x.id === p.slice(5)); if(hs) return hs; }
  for(const s of NAV_SECTIONS) if(s.pages.some(x => x[0] === p)) return s;
  return NAV_SECTIONS.find(s => s.id === 'hr');            // الصفحات الفرعية (HR_HIDDEN_PAGES) وأي صفحة غير معروفة
}

/** الكود صاحب الصفحة (حسب البادئة): ledger / clients / ... وأي صفحة بدون بادئة = hr */
function moduleOfPage(page){
  const p = String(page || '');
  const dot = p.indexOf('.');
  return { id: dot > 0 ? p.slice(0, dot) : 'hr' };
}

function pageVisible(page){
  try{ return typeof hasPagePermission !== 'function' || !!hasPagePermission(page, 'view'); }catch(_e){ return true; }
}
function sectionVisible(s){ return s.pages.some(p => pageVisible(p[0])); }

function isPlaceholderPage(page){ return Object.prototype.hasOwnProperty.call(PLACEHOLDER_PAGES, String(page || '')); }

function goToSection(id){
  const s = NAV_SECTIONS.find(x => x.id === id);
  if(!s) return;
  const last = (typeof sectionHasHome === 'function' && sectionHasHome(s)) ? sectionHomeKey(s) : __sectionLastPage[s.id];
  const target = (last && pageVisible(last)) ? last : (s.pages.find(p => pageVisible(p[0])) || [])[0];
  if(target) goToPage(target, true);
  else if(typeof showToast === 'function') showToast('مفيش صلاحية لأي صفحة في القسم ده');
}

/** صف الأقسام + صف صفحات القسم الحالي (+ شريط أدوات الدفتر لصفحاته) — بنفس شكل HR */
function renderNav(){
  const cur = sectionOfPage(currentPage);
  if(cur.pages.some(p => p[0] === currentPage)) __sectionLastPage[cur.id] = currentPage;

  const secBtns = NAV_SECTIONS.filter(sectionVisible).map(s =>
    `<button type="button" class="nav-btn${s.id === cur.id ? ' active' : ''}" data-section="${s.id}">${escapeHtml(s.label)}${(s.id==='general' && typeof alertsCount==='function' && alertsCount()) ? ' <span class="nav-badge">'+(alertsCount()>99?'99+':alertsCount())+'</span>' : ''}</button>`
  ).join('\n      ');
  const visiblePages = cur.pages.filter(p => pageVisible(p[0]));
  const pagesRow = (!(typeof sectionHasHome === 'function' && sectionHasHome(cur)) && visiblePages.length > 1)
    ? `<nav class="nav nav-pages">\n      ${visiblePages.map(p => navBtn(p[0], p[1])).join('\n      ')}\n    </nav>`
    : '';
  const toolbar = (typeof lgIsActive === 'function' && lgIsActive() && typeof renderLedgerToolbar === 'function') ? renderLedgerToolbar() : '';
  return `<nav class="nav nav-sections">
      ${secBtns}
    </nav>
    ${pagesRow}${toolbar}`;
}

/** صفحة «قيد الدمج» */
function renderPlaceholderPage(page){
  const info = PLACEHOLDER_PAGES[page] || { title: String(page), phase: '', desc: '' };
  const sec = sectionOfPage(page);
  return `<div class="card">
    <h2 class="page-title">${escapeHtml(info.title)}</h2>
    <p class="page-sub">${escapeHtml(sec.label)}</p>
    <div class="module-placeholder">
      <div class="module-placeholder-badge">قيد الدمج${info.phase ? ' — الإصدار ' + escapeHtml(info.phase) : ''}</div>
      <p>${escapeHtml(info.desc)}</p>
      <p>الصفحة دي مكانها محجوز في التصميم، ولسه ما اتنقلتش للبرنامج الموحّد. بياناتك الحالية في برنامجها الأصلي سليمة ولا تتأثر.</p>
    </div>
  </div>`;
}
