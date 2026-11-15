/* ---------------- App shell ---------------- */
function __syncSecClass(){ try{ document.body.classList.toggle('sec-hr', String(currentPage||'').indexOf('.')<0); }catch(_e){} }
function render(){
  __syncSecClass();
  try{ if(typeof bumpIndexVersion==='function') bumpIndexVersion(); }catch(_e){}
  const app = document.getElementById('app');
  if(typeof isNetworkMode==='function' && isNetworkMode() && typeof hasPagePermission==='function' && !hasPagePermission(currentPage,'view')){
    currentPage = typeof firstVisiblePage==='function' ? firstVisiblePage() : 'dashboard';
  }
  try{
    document.body.classList.toggle('body-readonly', !!readOnlyMode);
  }catch(_e){}
  const company = (DATA.settings && DATA.settings.companyName) || '';
  app.innerHTML = `
    <div class="top">
      <div class="brand">
        ${typeof brandLogoHtml==='function'?brandLogoHtml(52):''}
        <div>
          <h1>${escapeHtml(APP_BRAND.name)}</h1>
          <p>${escapeHtml(company) || escapeHtml(APP_BRAND.tagline)}</p>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        ${readOnlyMode ? `<span class="ro-badge no-print">🔒 قراءة فقط</span>` : ''}
        ${(typeof currentUser!=='undefined' && currentUser)
          ? `<span class="offline-badge">👤 ${escapeHtml(currentUser.name||currentUser.username)} — ${currentUser.role==='admin'?'مدير':(currentUser.role==='hr'?'موارد بشرية':(currentUser.role==='payroll'?'رواتب':'مستخدم'))}</span>
             <button type="button" class="btn btn-outline btn-sm no-print" id="btnLogout" title="تسجيل الخروج">خروج</button>`
          : `<span class="offline-badge">● يعمل بدون إنترنت — بياناتك محفوظة على هذا الجهاز</span>`}
        <div class="view-controls no-print" title="أدوات العرض">
          <button type="button" class="vc-btn btn-ro-toggle ${readOnlyMode?'is-on active':''}" id="btnToggleReadOnly" title="وضع القراءة فقط — تصفح وعرض بدون تعديل">${readOnlyMode?'🔓 قراءة':'🔒 قراءة'}</button>
          <span class="vc-sep" aria-hidden="true"></span>
          <div class="vc-group" title="كثافة العرض">
            <button type="button" class="vc-btn ${uiDensity===0?'active':''}" data-density="0" title="مضغوط">مضغوط</button>
            <button type="button" class="vc-btn ${uiDensity===1?'active':''}" data-density="1" title="عادي">عادي</button>
            <button type="button" class="vc-btn ${uiDensity===2?'active':''}" data-density="2" title="واسع">واسع</button>
          </div>
          <span class="vc-sep" aria-hidden="true"></span>
          <div class="vc-group vc-zoom" title="التكبير">
            <button type="button" class="vc-btn vc-zoom-btn" id="zoomOutBtn" title="تصغير">−</button>
            <span class="vc-zoom-val" id="zoomLevelLabel">${Math.round(uiZoom*100)}%</span>
            <button type="button" class="vc-btn vc-zoom-btn" id="zoomInBtn" title="تكبير">+</button>
          </div>
          <span class="vc-sep" aria-hidden="true"></span>
          <button type="button" class="vc-btn" id="validateBtn" title="فحص البيانات وتنظيف المخلفات">✓ فحص</button>
          <button type="button" class="vc-btn" id="btnShortcutsHelp" title="اختصارات لوحة المفاتيح (Ctrl+/)">⌨️</button>
        </div>
      </div>
    </div>
    ${renderNav()}
    <div id="pageContent" class="page-content-zoom">${renderCurrentPage()}</div>
  `;
  applyUiZoom();
  if(typeof applyUiDensity==='function') applyUiDensity();
  attachNavHandlers();
  attachPaginationHandlers();
  attachPageHandlers();
  attachGlobalHandlers();
  try{ if(typeof maybeForcePasswordChange==='function') maybeForcePasswordChange(); }catch(_e){}
}

function navBtn(page, label){
  const active = currentPage===page ? ' active' : '';
  let badge = '';
  if(page==='dashboard'){ try{ const n = (typeof alertsCount==='function') ? alertsCount() : 0; if(n) badge = ` <span class="nav-badge">${n>99?'99+':n}</span>`; }catch(_e){} }
  return `<button class="nav-btn${active}" data-page="${page}">${label}${badge}</button>`;
}

function renderCurrentPage(){
  const html = (typeof boardsRender === 'function') ? boardsRender(currentPage, __renderCurrentPageInner) : __renderCurrentPageInner();
  return (typeof hrBackBarWrap === 'function') ? hrBackBarWrap(currentPage, html) : html;
}

function __renderCurrentPageInner(){
  try {
  if(typeof isPlaceholderPage==='function' && isPlaceholderPage(currentPage)) return renderPlaceholderPage(currentPage);   // صفحات قيد الدمج
  if(currentPage==='general.overview' || currentPage==='ledger.dashboard' || currentPage==='clients.dashboard') currentPage = 'dashboard';   // اتدمجوا في مركز المتابعة
  if(typeof lgIsActive==='function' && lgIsActive()) return renderLedgerPage(String(currentPage).slice(7));   // دفتر الموردين (مدمج)
  if(String(currentPage).indexOf('home_') === 0) return renderSectionHome(String(currentPage).slice(5));
  switch(currentPage){
    case 'dashboard': return renderDashboardPage();
    case 'employees': return renderEmployeesPage();
    case 'workers': return typeof renderWorkersPage==='function' ? renderWorkersPage() : '';
    case 'supervisors': return typeof renderSupervisorsPage==='function' ? renderSupervisorsPage() : '';
    case 'equipment': return typeof renderEquipmentPage==='function' ? renderEquipmentPage() : '';
    case 'projects': return typeof renderProjectsPage==='function' ? renderProjectsPage() : '';
    case 'clients.customers': return typeof renderClientsCustomersPage==='function' ? renderClientsCustomersPage() : '';
    case 'clients.workSurveys': return typeof renderClientsWorkSurveysPage==='function' ? renderClientsWorkSurveysPage() : '';
    case 'clients.invoices': return typeof renderClientsInvoicesPage==='function' ? renderClientsInvoicesPage() : '';
    case 'clients.crm': return typeof renderClientsCrmPage==='function' ? renderClientsCrmPage() : '';
    case 'tasks.my': return typeof renderClientsTasksPage==='function' ? renderClientsTasksPage() : '';
    case 'clients.collections': return typeof renderClientsCollectionsPage==='function' ? renderClientsCollectionsPage() : '';
    case 'clients.reports': return typeof renderClientsReportsPage==='function' ? renderClientsReportsPage() : '';
    case 'clients.dashboard': return typeof renderClientsDashboardPage==='function' ? renderClientsDashboardPage() : '';
    case 'clients.accounts': return typeof renderClientsAccountsPage==='function' ? renderClientsAccountsPage() : '';
    case 'clients.archive': return typeof renderClientsArchivePage==='function' ? renderClientsArchivePage() : '';
    case 'warehouses.home': return typeof renderWarehousesHomePage==='function' ? renderWarehousesHomePage() : '';
    case 'warehouses.reports': return typeof renderWarehousesReportsPage==='function' ? renderWarehousesReportsPage() : '';
    case 'accounts.reports': return typeof renderAccountsReportsPage==='function' ? renderAccountsReportsPage() : '';
    case 'clients.comparison': return typeof renderClientsComparisonPage==='function' ? renderClientsComparisonPage() : '';
    case 'clients.guarantees': return typeof renderClientsGuaranteesPage==='function' ? renderClientsGuaranteesPage() : '';
    case 'clients.contracts': return typeof renderClientsContractsPage==='function' ? renderClientsContractsPage() : '';
    case 'clients.boqs': return typeof renderClientsBoqsPage==='function' ? renderClientsBoqsPage() : '';
    case 'drivers': return typeof renderDriversPage==='function' ? renderDriversPage() : '';
    case 'fuel': currentPage='equipment'; return typeof renderEquipmentPage==='function' ? renderEquipmentPage() : '';
    case 'transfers': return typeof renderTransfersPage==='function' ? renderTransfersPage() : '';
    case 'performance': return typeof renderPerformancePage==='function' ? renderPerformancePage() : '';
    case 'documents': currentPage='archive'; return typeof renderArchivePage==='function' ? renderArchivePage() : '';
    case 'assistant': currentPage='dashboard'; return typeof renderDashboardPage==='function' ? renderDashboardPage() : '';
    case 'hrHome':
    case 'departments': return renderHrHomePage();
    case 'attendance': return renderAttendancePage();
    case 'workerAttendance': return typeof renderWorkerAttendancePage==='function' ? renderWorkerAttendancePage() : '';
    case 'workerDues': return typeof renderWorkerDuesPage==='function' ? renderWorkerDuesPage() : '';
    case 'expenses': return typeof renderExpensesPage==='function' ? renderExpensesPage() : '';
    case 'costs': return typeof renderCostsPage==='function' ? renderCostsPage() : '';
    case 'leaves': return renderLeavesPage();
    case 'payroll': currentPage='workerDues'; return typeof renderWorkerDuesPage==='function' ? renderWorkerDuesPage() : '';
    case 'reports': return renderReportsPage();
    case 'archive': return typeof renderArchivePage==='function' ? renderArchivePage() : '';
    case 'employeeDetail': return typeof renderEmployeeDetailPage==='function' ? renderEmployeeDetailPage() : '';
    case 'personDetail': return typeof renderPersonDetailPage==='function' ? renderPersonDetailPage() : '';
    case 'backup': return typeof renderBackupPage==='function' ? renderBackupPage() : '';
    case 'users': return typeof renderUsersPage==='function' ? renderUsersPage() : '';
    default: return renderDashboardPage();
  }
  } catch(err){
    console.error('render page error', currentPage, err);
    return `<div class="page"><h2 class="page-title">خطأ في عرض الصفحة</h2>
      <p class="page-sub">${escapeHtml(String(err && err.message || err))}</p>
      <button class="btn btn-primary" onclick="goToPage('dashboard')">العودة للوحة المتابعة</button>
    </div>`;
  }
}

function clearPageSubViews(exceptPage){
  try{
    if(exceptPage !== 'equipment'){
      if(typeof equipmentFilters !== 'undefined' && equipmentFilters){
        equipmentFilters.detailId = '';
        equipmentFilters.dailyView = false;
      }
    }
    if(exceptPage !== 'supervisors'){
      if(typeof window !== 'undefined') window.__supDetailId = null;
    }
    if(exceptPage !== 'projects'){
      if(typeof projectFilters !== 'undefined' && projectFilters) projectFilters.detailId = '';
    }
    if(exceptPage !== 'clients.customers'){
      if(typeof customerFilters !== 'undefined' && customerFilters) customerFilters.detailId = '';
    }
    if(exceptPage !== 'clients.workSurveys'){
      if(typeof workSurveyFilters !== 'undefined' && workSurveyFilters) workSurveyFilters.detailKey = '';
    }
    if(exceptPage !== 'clients.invoices'){
      if(typeof clientInvFilters !== 'undefined' && clientInvFilters) clientInvFilters.detailKey = '';
    }
    if(exceptPage !== 'clients.contracts'){
      if(typeof contractFilters !== 'undefined' && contractFilters) contractFilters.detailKey = '';
    }
    if(exceptPage !== 'clients.boqs'){
      if(typeof boqFilters !== 'undefined' && boqFilters) boqFilters.detailKey = '';
    }
    if(exceptPage !== 'employees' && exceptPage !== 'employeeDetail'){
      if(typeof window !== 'undefined'){ window.__empDetailId = null; }
    }
  }catch(e){ console.warn('clearPageSubViews', e); }
}

function goToPage(page, fromNav){
  if(!page) return;
  try{
    if(typeof boardsHas==='function' && boardsHas(page)){
      if(fromNav){ boardsReset(page); const c = BOARD_PAGES[page]; const f = c.filters(); if(f) f[c.field] = ''; }
      else __boardsOpen[page] = true;      // انتقال برمجي (drill-down) → ادخل الصفحة مباشرة
    }
  }catch(e){}
  try{ if(typeof closeModal==='function') closeModal(); }catch(e){}
  try{ if(page!=='archive' && typeof archiveFilters!=='undefined') archiveFilters.folderKey=''; }catch(e){}
  clearPageSubViews(page);
  currentPage = page;
  render();
}

function attachNavHandlers(){
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const sec = btn.getAttribute('data-section');
      if(sec){ goToSection(sec); return; }                  // زر قسم
      const page = btn.getAttribute('data-page');
      goToPage(page, true);
    });
  });
}

function attachPaginationHandlers(){
  document.querySelectorAll('[data-page-prev]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const k = btn.getAttribute('data-page-prev');
      setTablePage(k, getTablePage(k) - 1);
      rerenderCurrentPage();
    });
  });
  document.querySelectorAll('[data-page-next]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const k = btn.getAttribute('data-page-next');
      setTablePage(k, getTablePage(k) + 1);
      rerenderCurrentPage();
    });
  });
}

/** تلميح (tooltip) بالنص الكامل لخانات البحث والفلاتر لأن الخانة الواحدة بقت 1/8 من العرض */
function decorateFilterBars(){
  try{
    document.querySelectorAll('.filters-bar input[type="search"], .filters-bar input[type="text"]').forEach(i=>{
      if(!i.title && i.placeholder) i.title = i.placeholder;
    });
    document.querySelectorAll('.filters-bar select').forEach(sel=>{
      if(!sel.title){
        const o = sel.options && sel.options[0];
        if(o && o.text) sel.title = o.text;
      }
    });
  }catch(e){}
}

function attachPageHandlers(){
  // صفحات الدفتر لها ربط أحداثها الخاص (modules/ledger) — وبنفعّل نطاق CSS الدفتر على body
  const lgOn = (typeof lgIsActive==='function' && lgIsActive());
  try{ document.body.classList.toggle('module-ledger', lgOn); }catch(_e){}
  try{ if(!lgOn && typeof lgSetInvoicesMode==='function') lgSetInvoicesMode(''); }catch(_e){}   // التصدير من خارج صفحات الدفتر = الكل
  if(lgOn){
    try{ document.getElementById('pageContent')?.classList.add('card'); }catch(_e){}   // صفحات الدفتر الأصلية كانت جوه كارت (#pageContent.card)
    lgAfterRender(); return;
  }
  decorateFilterBars();
  try{ if(typeof bindPageExportButtons==='function') bindPageExportButtons(); }catch(e){}
  try{ if(typeof bindEntityCombos==='function') bindEntityCombos(document); }catch(e){}
  try{ if(typeof bindDocTypeCombos==='function') bindDocTypeCombos(document); }catch(e){}


  try { if(currentPage==='dashboard' && typeof initDashboardEvents==='function') initDashboardEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='employees' && typeof initEmployeesEvents==='function') initEmployeesEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='workers' && typeof initWorkersEvents==='function') initWorkersEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='supervisors' && typeof initSupervisorsEvents==='function') initSupervisorsEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='equipment' && typeof initEquipmentEvents==='function') initEquipmentEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='projects' && typeof initProjectsEvents==='function') initProjectsEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='clients.customers' && typeof initClientsCustomersEvents==='function') initClientsCustomersEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='clients.workSurveys' && typeof initClientsWorkSurveysEvents==='function') initClientsWorkSurveysEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='clients.invoices' && typeof initClientsInvoicesEvents==='function') initClientsInvoicesEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='clients.crm' && typeof initClientsCrmEvents==='function') initClientsCrmEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='tasks.my' && typeof initClientsTasksEvents==='function') initClientsTasksEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='clients.collections' && typeof initClientsCollectionsEvents==='function') initClientsCollectionsEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='clients.reports' && typeof initClientsReportsEvents==='function') initClientsReportsEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='clients.accounts' && typeof initClientsAccountsEvents==='function') initClientsAccountsEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='clients.archive' && typeof initClientsArchiveEvents==='function') initClientsArchiveEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='warehouses.home' && typeof initWarehousesHomeEvents==='function') initWarehousesHomeEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='warehouses.reports' && typeof initWarehousesReportsEvents==='function') initWarehousesReportsEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='accounts.reports' && typeof initAccountsReportsEvents==='function') initAccountsReportsEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='clients.dashboard' && typeof initClientsDashboardEvents==='function') initClientsDashboardEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='clients.comparison' && typeof initClientsComparisonEvents==='function') initClientsComparisonEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='clients.guarantees' && typeof initClientsGuaranteesEvents==='function') initClientsGuaranteesEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='clients.contracts' && typeof initClientsContractsEvents==='function') initClientsContractsEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='clients.boqs' && typeof initClientsBoqsEvents==='function') initClientsBoqsEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='drivers' && typeof initDriversEvents==='function') initDriversEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='fuel'){ currentPage='equipment'; if(typeof initEquipmentEvents==='function') initEquipmentEvents(); } } catch(e){ console.error(e); }
  try { if(currentPage==='transfers' && typeof initTransfersEvents==='function') initTransfersEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='performance' && typeof initPerformanceEvents==='function') initPerformanceEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='documents'){ currentPage='archive'; if(typeof initArchiveEvents==='function') initArchiveEvents(); } } catch(e){ console.error(e); }
  try { if(currentPage==='assistant'){ currentPage='dashboard'; if(typeof initDashboardEvents==='function') initDashboardEvents(); } } catch(e){ console.error(e); }
  try { if((currentPage==='hrHome' || currentPage==='departments' || String(currentPage).indexOf('home_')===0) && typeof initHrHomeEvents==='function') initHrHomeEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='attendance' && typeof initAttendanceEvents==='function') initAttendanceEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='workerAttendance' && typeof initWorkerAttendanceEvents==='function') initWorkerAttendanceEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='workerDues' && typeof initWorkerDuesEvents==='function') initWorkerDuesEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='expenses' && typeof initExpensesEvents==='function') initExpensesEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='costs' && typeof initCostsEvents==='function') initCostsEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='leaves' && typeof initLeavesEvents==='function') initLeavesEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='payroll'){ currentPage='workerDues'; if(typeof initWorkerDuesEvents==='function') initWorkerDuesEvents(); } } catch(e){ console.error(e); }
  try { if(currentPage==='reports' && typeof initReportsEvents==='function') initReportsEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='archive' && typeof initArchiveEvents==='function') initArchiveEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='employeeDetail' && typeof initEmployeeDetailEvents==='function') initEmployeeDetailEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='personDetail' && typeof initPersonDetailEvents==='function') initPersonDetailEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='backup' && typeof initBackupEvents==='function') initBackupEvents(); } catch(e){ console.error(e); }
  try { if(currentPage==='users' && typeof initUsersEvents==='function') initUsersEvents(); } catch(e){ console.error(e); }

}

function attachGlobalHandlers(){
  const btnRo = document.getElementById('btnToggleReadOnly');
  if(btnRo){
    btnRo.onclick = ()=>{
      if(typeof toggleReadOnlyMode==='function') toggleReadOnlyMode();
      else {
        readOnlyMode = !readOnlyMode;
        try{ localStorage.setItem('hr_readonly', readOnlyMode ? '1' : '0'); }catch(_e){}
        document.body.classList.toggle('body-readonly', !!readOnlyMode);
        showToast(readOnlyMode ? '🔒 وضع القراءة فقط — عرض فقط' : 'تم إلغاء القراءة فقط');
        render();
      }
    };
  }
  const btnOut = document.getElementById('btnLogout');
  if(btnOut && !btnOut.dataset.bound){
    btnOut.dataset.bound = '1';
    btnOut.addEventListener('click', async ()=>{
      const ok = typeof confirmApp==='function'
        ? await confirmApp('تسجيل الخروج من النظام؟', { title:'خروج', okLabel:'خروج', cancelLabel:'إلغاء', danger:false, icon:'🚪' })
        : confirm('تسجيل الخروج؟');
      if(!ok) return;
      try{
        if(typeof isNetworkMode==='function' && isNetworkMode() && typeof apiLogout==='function') await apiLogout();
      }catch(_e){}
      if(typeof clearLocalSession==='function') clearLocalSession();
      else {
        try{ sessionStorage.removeItem('mb_local_session'); localStorage.removeItem('mb_local_session'); }catch(_e){}
        if(typeof currentUser!=='undefined') currentUser = null;
      }
      if(typeof showLoginScreen==='function') showLoginScreen();
      else location.reload();
    });
  }
  const zin = document.getElementById('zoomInBtn');
  const zout = document.getElementById('zoomOutBtn');
  if(zin) zin.addEventListener('click', ()=>{
    uiZoom = Math.min(1.4, Math.round((uiZoom+0.1)*10)/10);
    try{ localStorage.setItem('uiZoom', uiZoom); }catch(e){}
    applyUiZoom();
    const lbl = document.getElementById('zoomLevelLabel');
    if(lbl) lbl.textContent = Math.round(uiZoom*100)+'%';
  });
  if(zout) zout.addEventListener('click', ()=>{
    uiZoom = Math.max(0.5, Math.round((uiZoom-0.1)*10)/10);
    try{ localStorage.setItem('uiZoom', uiZoom); }catch(e){}
    applyUiZoom();
    const lbl = document.getElementById('zoomLevelLabel');
    if(lbl) lbl.textContent = Math.round(uiZoom*100)+'%';
  });
  const btnSc = document.getElementById('btnShortcutsHelp');
  if(btnSc) btnSc.onclick = ()=>{ if(typeof openShortcutsHelp==='function') openShortcutsHelp(); };
  const val = document.getElementById('validateBtn');
  if(val) val.addEventListener('click', ()=>{
    if(typeof runDataHealthCheck==='function'){
      showToast('جاري الفحص والتنظيف الآمن…');
      runDataHealthCheck().catch(e=>{ console.error(e); showToast('تعذر الفحص'); });
    } else {
      const issues = typeof validateAllDataDeep==='function' ? validateAllDataDeep() : [];
      showValidationResults(issues);
    }
  });
  document.querySelectorAll('[data-density]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      uiDensity = Number(btn.getAttribute('data-density'));
      applyUiDensity();
      render();
    });
  });
}

function rerenderCurrentPage(){
  __syncSecClass();
  try{ if(typeof syncLeaveStatuses==='function') syncLeaveStatuses(); }catch(_e){}
  const el = document.getElementById('pageContent');
  try{ if(typeof bumpIndexVersion==='function') bumpIndexVersion(); }catch(_e){}   // فهارس الحسابات تتجدد مع كل رسم
  if(el){
    // حفظ مكان المؤشر والتركيز قبل إعادة الرسم حتى لا تضيع الكتابة داخل خانة البحث
    let keep = null;
    try{
      const a = document.activeElement;
      if(a && a.id && el.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)){
        keep = { id: a.id, start: null, end: null };
        try{ keep.start = a.selectionStart; keep.end = a.selectionEnd; }catch(_e){}
      }
    }catch(_e){}
    const scrollY = (document.scrollingElement||document.documentElement||{}).scrollTop || 0;
    el.innerHTML = renderCurrentPage();
    attachPaginationHandlers();
    attachPageHandlers();
    try{
      if(keep){
        const n = document.getElementById(keep.id);
        if(n){
          n.focus();
          if(keep.start!=null && typeof n.setSelectionRange==='function'){
            try{ n.setSelectionRange(keep.start, keep.end); }catch(_e){}
          }
        }
      }
      const se = document.scrollingElement||document.documentElement;
      if(se && scrollY) se.scrollTop = scrollY;
    }catch(_e){}
  } else render();
}

function applyUiZoom(){
  // القائمة العلوية ثابتة · التكبير على محتوى الصفحة فقط
  // النوافذ والقوائم بدون zoom حتى تظهر الاقتراحات تحت الخانة بشكل صحيح
  const appRoot = document.getElementById('app');
  if(appRoot) appRoot.style.zoom = '';
  document.querySelectorAll('.top, .nav, .nav-btn').forEach(el=>{
    try{ el.style.zoom = ''; }catch(_e){}
  });
  const page = document.getElementById('pageContent');
  if(page) page.style.zoom = uiZoom;
  document.querySelectorAll('.modal-overlay .modal, .toast').forEach(el=>{
    try{ el.style.zoom = ''; }catch(_e){}
  });
  try{ document.documentElement.style.setProperty('--ui-zoom', String(uiZoom)); }catch(_e){}
}

(function injectExtraCss(){
  /* confirm + modal polish injected below */

  const s = document.createElement('style');
  s.textContent = `
    .modal{border-radius:14px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.18);}
    .modal-header{border-bottom:1px solid var(--line,#e5e0d4);}
    .modal-footer{gap:8px;}
    .app-confirm-modal .modal-body{font-size:15px;}
    .board-card[data-arch-special="resigned"]{border:2px solid #c9a227;}
    .board-card[data-arch-special="trash"]{border:2px solid #c1121f33;}

    .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11.5px;font-weight:700;}
    .badge-ok{background:#E8F0EA;color:#1B4332;}
    .badge-warn{background:#FFF3CD;color:#856404;}
    .badge-err{background:#F8D7DA;color:#721C24;}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .form-grid label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;color:var(--ink-soft);}
    .modal-overlay{position:fixed;inset:0;background:rgba(43,42,37,.45);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px;}
    .modal{background:var(--card);border-radius:16px;max-width:680px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 12px 40px rgba(0,0,0,.2);border:1px solid var(--line);}
    .modal-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--line);}
    .modal-header h3{margin:0;font-size:17px;}
    .modal-close{border:none;background:none;font-size:22px;cursor:pointer;color:var(--ink-soft);line-height:1;}
    .modal-body{padding:18px 20px;}
    .modal-footer{padding:12px 20px 18px;display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--line);}
    .input{border:1px solid var(--line);border-radius:8px;padding:8px 12px;font-size:13.5px;font-family:inherit;background:#fff;width:100%;}
    .input:focus{outline:2px solid var(--ledger-green-2);border-color:transparent;}
    .data-table{width:100%;border-collapse:collapse;font-size:13px;}
    .data-table th,.data-table td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:right;}
    .data-table th{
      background:linear-gradient(135deg,var(--ledger-green),var(--ledger-green-2)) !important;
      color:#F6F1E4 !important; font-weight:800; font-size:12px;
      border-bottom:2px solid var(--gold);
    }
    .data-table thead th:first-child{ border-top-right-radius:7px; }
    .data-table thead th:last-child{ border-top-left-radius:7px; }
    .data-table tr:hover td{background:#faf8f2;}
    .page{animation:pageFade .28s ease;}
    @keyframes pageFade{from{opacity:.88;}to{opacity:1;}}
    .nav-btn{transition:background .2s ease,color .2s ease;font-size:13px;padding:7px 12px;font-weight:700;}
    .nav-btn:active{transform:none;}
    .btn{transition:background .2s ease,box-shadow .2s ease;}
    .btn:active{transform:scale(.98);}
    .stat-card{transition:box-shadow .2s ease;}
    .stat-card:hover{box-shadow:0 4px 14px rgba(0,0,0,.08);}
    .modal-overlay{animation:fadeIn .22s ease;}
    @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
    .modal{animation:popIn .22s ease;}
    @keyframes popIn{from{opacity:.8;transform:scale(.97);}to{opacity:1;transform:none;}}
    .table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px;}
    .btn-primary{background:var(--ledger-green);color:#F6F1E4;}
    .btn-primary:hover{background:var(--ledger-green-2);}
    .btn-outline{background:transparent;border:1px solid var(--line);color:var(--ink);}
    .btn-outline:hover{background:var(--paper-2);}
    .btn-sm{padding:5px 10px;font-size:12px;}
    .btn-row{display:flex;gap:8px;flex-wrap:wrap;}
    .filters-bar .input{min-width:140px;width:auto;}
    @media (max-width:1100px){
      .page > div[style*="grid-template-columns:1fr 1fr 1fr"]{grid-template-columns:1fr 1fr !important;}
    }
    @media (max-width:700px){
      .page > div[style*="grid-template-columns"]{grid-template-columns:1fr !important;}
    }
    @media print{
      .nav,.top .offline-badge,.btn,.filters-bar,.table-pager,.no-print{display:none!important;}
      .page{box-shadow:none;border:none;}
    }
  `;
  document.head.appendChild(s);
})();



/* حارس وضع القراءة فقط — يمنع التعديل/الحذف/التصدير ويسمح بالتصفح والعرض */
document.addEventListener('click', function(e){
  if(typeof readOnlyMode==='undefined' || !readOnlyMode) return;
  const t = e.target.closest('button, a.btn, [role=button]');
  if(!t) return;
  // دائماً مسموح
  if(t.id==='btnToggleReadOnly' || t.id==='btnLogout' || t.id==='validateBtn' ||
     t.id==='zoomInBtn' || t.id==='zoomOutBtn' || t.classList.contains('nav-btn') ||
     t.classList.contains('vc-btn') || t.classList.contains('modal-close') ||
     t.classList.contains('qtab') || t.closest('.pagination') ||
     t.closest('.dept-card') || t.closest('.board-card') || t.closest('.exp-board-card') ||
     t.getAttribute('onclick')==='closeModal()' || t.id==='pinOk') return;

  const txt = ((t.textContent||'') + ' ' + (t.title||'') + ' ' + (t.id||'') + ' ' + (t.className||'')).toLowerCase();
  // أزرار العرض/التصفح مسموحة
  if(/(عرض|تفاصيل|رجوع|السابق|التالي|إغلاق|فتح|تصفح|بحث|فلتر|الكل|بدون قسم|تبويب|قسم)/.test(txt) &&
     !/(إضافة|تعديل|حذف|حفظ|استيراد|تصدير|رفع|مسح|دفع|صرف|يومية|خصم|جزاء|نقل|طلب|استبدال)/.test(txt)) return;
  if(/btn-view|data-view|viewbtn|open-detail|btnview/.test(txt) && !/edit|del|add|save|export|import/.test(txt)) return;

  // أفعال ممنوعة
  const blocked = /(إضافة|اضافه|\+ إضافة|تعديل|حذف|حفظ|استيراد|تصدير|رفع|مسح ضوئي|دفع|صرف|يومية|تسجيل يوم|خصم|جزاء|نقل|طلب إجازة|استبدال|إعادة تعيين|كلمة المرور|مستخدم جديد|csv|إكسيل|excel|pdf|طباعة كشف)/i;
  const blockedId = /(add|save|del|delete|import|export|upload|scan|pay|penalty|edit-user|reset-pass)/i;
  if(blocked.test(txt) || blockedId.test(t.id||'') || blockedId.test(t.className||'')){
    e.preventDefault();
    e.stopPropagation();
    if(typeof showToast==='function') showToast('🔒 وضع القراءة فقط — يمكنك التصفح والعرض فقط');
  }
}, true);


async function boot(){
  try{ if(window.desktopApi && window.desktopApi.getLockInfo){ window.desktopApi.getLockInfo().then(i=>{ if(i && i.others){ setTimeout(()=>{ try{ showToast('⚠️ البرنامج شكله مفتوح كمان على '+(i.host||'جهاز/نافذة تانية')+' بنفس البيانات — أي حفظ من الاتنين ممكن يعمل تعارض. اقفل واحدة منهم.', 20000); }catch(e){} }, 1500); } }).catch(()=>{}); } }catch(e){}
  try{
    if(window.desktopApi && window.desktopApi.loadData){
      await loadData();
      try{ if(typeof ensureAllResignedDepartments==='function') ensureAllResignedDepartments(); }catch(_e){}
      try{
        if(typeof backfillMissingCodes==='function' && backfillMissingCodes()){
          if(typeof saveData==='function') await Promise.resolve(saveData());
        }
      }catch(e){ console.warn('code backfill', e); }
    } else {
      // خارج Electron (فتح الصفحة في متصفح): نفس مسار التحميل الكامل (loadData بيقرأ من localStorage) بدل نسخة مختصرة
      await loadData();
    }
  }catch(e){ console.error('boot load', e); }
  try{
    if(typeof loadReadOnlyFlag==='function') readOnlyMode = loadReadOnlyFlag();
  }catch(e){}

  // ترقية كلمات المرور القديمة (نص) إلى hash — لازم تحصل قبل أي تسجيل دخول
  try{ if(typeof upgradeLegacyPasswords==='function') await upgradeLegacyPasswords(); }
  catch(e){ console.error('password upgrade', e); }

  // شاشة تسجيل الدخول دائماً قبل فتح البرنامج
  try{
    if(typeof ensureLocalAdminUser==='function') ensureLocalAdminUser();
    const mode = typeof getDeviceMode==='function' ? getDeviceMode() : 'standalone';
    if(mode === 'host' || mode === 'client'){
      if(typeof initAppEntry==='function'){ await initAppEntry(); return; }
    }
    if(typeof isLoggedIn==='function' && !isLoggedIn()){
      if(typeof showLoginScreen==='function'){ showLoginScreen(); return; }
    }
    if(typeof applySessionUser==='function') applySessionUser();
  }catch(e){ console.error('boot login', e); }

  try{ render(); }catch(e){ console.error('boot render', e); }
  // اختصارات لوحة المفاتيح
  if(!window.__hrKeysBound){
    window.__hrKeysBound = true;
    document.addEventListener('keydown', (e)=>{
      if(document.getElementById('forcePwdOverlay')) return;   // أثناء تغيير كلمة المرور الإجباري: لا اختصارات
      if(e.target && (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')) return;
      if(e.altKey && e.key==='1'){ goToPage('dashboard'); }
      if(e.altKey && e.key==='2'){ goToPage('employees'); }
      if(e.altKey && e.key==='3'){ goToPage('workers'); }
      if(e.altKey && e.key==='4'){ goToPage('equipment'); }
      if(e.key==='Escape'){ closeModal(); }
    });
  }
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();


/* اختصارات لوحة المفاتيح */
const HR_SHORTCUTS = [
  { keys: 'Ctrl + /', desc: 'عرض قائمة الاختصارات' },
  { keys: 'Ctrl + F', desc: 'التركيز على خانة البحث في الصفحة' },
  { keys: 'Ctrl + N', desc: 'إضافة سجل جديد (زر الإضافة الرئيسي)' },
  { keys: 'Ctrl + S', desc: 'حفظ النموذج المفتوح' },
  { keys: 'Ctrl + P', desc: 'طباعة الصفحة / الكشف الظاهر' },
  { keys: 'Ctrl + 1', desc: 'لوحة المتابعة' },
  { keys: 'Ctrl + 2', desc: 'الموظفين' },
  { keys: 'Ctrl + 3', desc: 'المستحقات' },
  { keys: 'Ctrl + 4', desc: 'اليوميات' },
  { keys: 'Ctrl + 5', desc: 'التقارير' },
  { keys: 'Delete', desc: 'حذف السجلات المحددة (بعد التحديد)' },
  { keys: 'Esc', desc: 'إغلاق النافذة المنبثقة' },
  { keys: 'Enter', desc: 'تأكيد في النماذج عند التركيز على الحقل' }
];
function openShortcutsHelp(){
  if(typeof openModal!=='function') return;
  openModal(`
    <div class="modal-header"><h3>⌨️ اختصارات لوحة المفاتيح</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--ink-soft);margin:0 0 12px;">استخدم هذه الاختصارات لتسريع العمل. على أجهزة Mac استخدم ⌘ بدل Ctrl.</p>
      <div class="table-wrap"><table class="data-table"><thead><tr><th style="width:140px;">الاختصار</th><th>الوظيفة</th></tr></thead>
      <tbody>${HR_SHORTCUTS.map(s=>`<tr><td><kbd style="background:var(--paper-2);padding:3px 10px;border-radius:6px;border:1px solid var(--line);font-weight:800;font-size:12.5px;">${s.keys}</kbd></td><td>${s.desc}</td></tr>`).join('')}</tbody></table></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إغلاق</button></div>
  `);
}
document.addEventListener('keydown', function hrShortcuts(e){
  const tag = (e.target && e.target.tagName||'').toLowerCase();
  const typing = tag==='input' || tag==='textarea' || tag==='select' || e.target?.isContentEditable;
  const mod = e.ctrlKey || e.metaKey;

  if(e.key==='Escape' && typeof closeModal==='function'){
    if(document.getElementById('appModal')){ e.preventDefault(); closeModal(); }
    return;
  }
  if(mod && e.key==='/'){ e.preventDefault(); openShortcutsHelp(); return; }
  if(mod && (e.key==='s' || e.key==='S')){
    const saveBtn = document.querySelector('#appModal .btn-primary');
    if(saveBtn && document.getElementById('appModal')){ e.preventDefault(); saveBtn.click(); }
    return;
  }
  if(typing && !(mod && e.key==='f')) return;

  if(mod && (e.key==='f' || e.key==='F')){
    e.preventDefault();
    const search = document.querySelector('.page input[type="search"], .page input[id*="Search"], .page input[id*="search"]');
    if(search){ search.focus(); search.select(); }
    return;
  }
  if(mod && (e.key==='n' || e.key==='N')){
    e.preventDefault();
    const addBtn = document.querySelector('.page .btn-primary[id^="btnAdd"], .page button.btn-primary');
    if(addBtn && !document.getElementById('appModal')) addBtn.click();
    return;
  }
  if(mod && (e.key==='p' || e.key==='P') && !typing){
    e.preventDefault();
    const printBtn = document.querySelector('.page #btnPrintMonthlyOverview, .page button[id*="Print"], .page button[id*="print"]');
    if(printBtn) printBtn.click();
    else window.print();
    return;
  }
  if(mod && !typing && e.key>='1' && e.key<='5'){
    e.preventDefault();
    const map = { '1':'dashboard', '2':'employees', '3':'workerDues', '4':'workerAttendance', '5':'reports' };
    const page = map[e.key];
    if(page && typeof goToPage==='function') goToPage(page);
    else if(page){ currentPage = page; if(typeof render==='function') render(); }
    return;
  }
  if(e.key==='Delete' && !typing){
    const kinds = ['employees','workers','supervisors','drivers','equipment'];
    for(const k of kinds){
      const set = window.__bulkSel && window.__bulkSel[k];
      if(set && set.size){
        e.preventDefault();
        document.querySelector(`.bulk-delete[data-kind="${k}"]`)?.click();
        break;
      }
    }
  }
});
