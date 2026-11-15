function filteredSupervisors(){
  let list = (DATA.supervisors||[]).slice();
  const f = supervisorFilters || {};
  const deptF = f.departmentId || f.categoryId || '';
  list = typeof filterByDeptFilter==='function' ? filterByDeptFilter(list, deptF) : (deptF ? list.filter(s=>(s.departmentId||s.categoryId)===deptF) : list);
  if(f.status) list = list.filter(s => s.status === f.status);
  if(f.q && typeof smartSearchList==='function') list = smartSearchList(list, f.q);
  if(typeof applyExtraPersonFilters==='function') list = applyExtraPersonFilters('supervisor', list, f);
  return (f.q && String(f.q).trim()) ? list : sortByNameAr(list, s=>s.name);
}

function renderSupervisorsPage(){
  // كشف الحساب أولاً: لو اتفتح من شاشة المستحقات كان بيظهر شاشة الأقسام بدل الكشف
  if(window.__supDetailId) return renderSupervisorStatementPage(window.__supDetailId);
  if(typeof isEntityBoardsView==='function' && isEntityBoardsView(supervisorFilters)){
    return entityDeptBoardsPageHtml('supervisors', 'المشرفون', '');
  }
  try{
    const _sr = typeof filteredSupervisors==='function'?filteredSupervisors():(DATA.supervisors||[]);
    if(typeof setPageExport==='function'){ const _x = personListExport('supervisor', _sr); setPageExport('supervisors', _x.headers, _x.rows); }
  }catch(_e){}

  if(window.__supDetailId) return renderSupervisorStatementPage(window.__supDetailId);
  const rows = filteredSupervisors();
  const pg = paginateRows(rows, 'supervisors');
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <div>
          ${typeof entityListBackBarHtml==='function'?entityListBackBarHtml('supervisors', supervisorFilters, ''):''}
          <h2 class="page-title" style="margin:0;">المشرفون</h2>
        </div>
        <div class="btn-row page-header-actions">
          ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}
          <button class="btn btn-primary" id="btnAddSup" ${readOnlyMode?'disabled':''}>+ إضافة مشرف</button>
        </div>
      </div>
      ${entityStatCardsHtml('supervisors', rows)}
      <div class="filters-bar">
        <input type="search" id="supSearch" class="input" placeholder="بحث: اسم، كود، هاتف، قومي، وظيفة، عنوان..." value="${escapeHtml((supervisorFilters&&supervisorFilters.q)||'')}" style="min-width:200px;">
        <select id="supFilterStatus" class="input">
          <option value="">كل الحالات</option>
          ${personStatusOptionsHtml((supervisorFilters&&supervisorFilters.status)||'__all__')}
        </select>
        ${typeof extraPersonFiltersHtml==='function'?extraPersonFiltersHtml('supervisor', supervisorFilters||{}, 'sup'):''}
      </div>
      ${typeof bulkBarHtml==='function'?bulkBarHtml('supervisors'):''}
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
          <th style="width:36px;"><input type="checkbox" id="checkAll_supervisors" title="تحديد الكل"></th>${thIf('supervisors','code','كود المشرف')}${thIf('supervisors','name','الاسم')}<th>الوظيفة</th>${thIf('supervisors','nationalId','الرقم القومي')}
          <th>انتهاء البطاقة</th><th>حالة البطاقة</th><th>انتهاء الرخصة</th><th>حالة الرخصة</th>
          <th>تاريخ التعيين</th><th>نوع العقد</th><th>حالة العقد</th><th>اليومية</th>
          <th>حالة التأمين</th><th>الرقم التأميني</th><th>رقم التليفون</th>
          ${thIf('supervisors','birthDate','تاريخ الميلاد')}${thIf('supervisors','address','العنوان')}${thIf('supervisors','department','القسم')}<th>عدد العمال</th>${thIf('supervisors','status','الحالة')}${thIf('supervisors','notes','الملاحظات')}${customFieldsTableHeaders('supervisors')}<th></th>
        </tr></thead>
          <tbody>
            ${pg.pageRows.length? pg.pageRows.map(s=>{
              const n = workersOfSupervisor(s.id).length;
              return `<tr>
                <td><input type="checkbox" class="row-check" data-kind="supervisors" data-id="${s.id}"></td>
                ${tdIf('supervisors','code',`<td>${escapeHtml(s.code||'')}</td>`)}
                <td>${typeof personWarningBadge==='function'?personWarningBadge('supervisor',s):''}<strong>${escapeHtml(s.name||'')}</strong></td>
                <td>${escapeHtml(s.position||s.skill||'—')}</td>
                ${tdIf('supervisors','nationalId',`<td>${escapeHtml(s.nationalId||'—')}</td>`)}
                <td>${fmtDate(s.idCardExpiry)}</td>
                <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(s.idCardExpiry?statusFromExpiry(s.idCardExpiry):s.idCardStatus,'card'):'—'}</td>
                <td>${fmtDate(s.licenseExpiry)}</td>
                <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(s.licenseExpiry?statusFromExpiry(s.licenseExpiry):s.licenseStatus,'license'):'—'}</td>
                <td>${fmtDate(s.hireDate)}</td>
                <td>${escapeHtml(labelOf(typeof CONTRACT_TYPE_OPTS!=='undefined'?CONTRACT_TYPE_OPTS:[], s.contractType)||'—')}</td>
                <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(s.contractStatus,'contract'):'—'}</td>
                <td>${fmtMoney(s.dailyWage)}</td>
                <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(s.insuranceStatus||'','insurance'):'—'}</td>
                <td>${escapeHtml(s.insuranceNumber||'—')}</td>
                ${tdIf('supervisors','phone',`<td>${escapeHtml(s.phone||'—')}</td>`)}
                ${tdIf('supervisors','birthDate',`<td>${fmtDate(s.birthDate)||'—'}</td>`)}${tdIf('supervisors','address',`<td>${escapeHtml(s.address||'—')}</td>`)}
                <td>${escapeHtml(typeof departmentName==='function'?departmentName(s.departmentId||s.categoryId):'')}</td>
                <td>${n}</td>
                ${personStatusCellHtml('supervisor',s)}
                <td>${typeof personNotesCellHtml==='function'?personNotesCellHtml('supervisor',s):'—'}</td>
                ${customFieldsTableCells('supervisors', s)}
                <td style="white-space:nowrap;">
                  <button class="btn btn-outline btn-sm btn-stmt-sup" data-id="${s.id}">كشف حساب</button>
                  ${typeof rowActionBtnsHtml==='function'?rowActionBtnsHtml({id:s.id, viewClass:'btn-view-sup', editClass:'btn-edit-sup', delClass:'btn-del-sup'}):''}
                </td>
              </tr>`;
            }).join('') : '<tr><td colspan="11" style="text-align:center;color:var(--ink-soft);padding:28px;">لا يوجد مشرفون — أضف مشرفاً أولاً</td></tr>'}
          </tbody>
        </table>
      </div>
      ${tablePagerHtml('supervisors', pg)}
      ${customFieldsManageHtml('supervisors')}
      
      
    </div>`;
}
/** أقسام كشف حساب المشرف (للشاشة والطباعة) — كلها من supervisorWageStatement فالأرقام ثابتة في كل مكان */
function supervisorStatementSectionsHtml(stmt, s, mode, showOnly){
  const print = mode === 'print';
  const SHOW = (showOnly===undefined ? (window.__supStmtShow||'') : showOnly) || '';
  const T = print ? '<table>' : '<table class="data-table">';
  const WRAP = (inner)=> print ? inner : '<div class="table-wrap">'+inner+'</div>';
  const H = (t)=> print ? '<h4>'+t+'</h4>' : '<div class="section-title" style="margin-top:18px;">'+t+'</div>';
  const m = fmtMoney;
  const balStyle = (v)=> print ? '' : ' style="color:'+(toInt(v)>0?'var(--debt)':'var(--credit)')+';font-weight:800;"';
  const extrasOnly = (e,c)=> toInt(toInt(e) - toInt(c));
  let html = SHOW ? '' : H('ملخص الحساب')+WRAP(T+`
    <thead><tr><th>البند</th><th>العمال</th><th>المشرف نفسه</th><th>المعدات</th><th>الإجمالي</th></tr></thead>
    <tbody>
      <tr><td>الأجور (اليوميات / تكلفة التشغيل)</td><td>${m(stmt.workersBaseDue)}</td><td>${m(stmt.ownBaseDue)}</td><td>${m(stmt.equipCost)}</td><td>${m(toInt(stmt.workersBaseDue+stmt.ownBaseDue+stmt.equipCost))}</td></tr>
      <tr><td>بدلات ومكافآت</td><td>${m(extrasOnly(stmt.workersExtras,stmt.workersCosts))}</td><td>${m(extrasOnly(stmt.ownExtras,stmt.ownCosts))}</td><td>—</td><td>${m(toInt(extrasOnly(stmt.workersExtras,stmt.workersCosts)+extrasOnly(stmt.ownExtras,stmt.ownCosts)))}</td></tr>
      <tr><td>التكاليف (مستحقة لهم)</td><td>${m(stmt.workersCosts)}</td><td>${m(stmt.ownCosts)}</td><td>—</td><td>${m(toInt(stmt.workersCosts+stmt.ownCosts))}</td></tr>
      <tr style="font-weight:800;"><td>إجمالي المستحق</td><td>${m(stmt.workersDue)}</td><td>${m(stmt.ownDue)}</td><td>${m(stmt.equipCost)}</td><td>${m(stmt.totalDue)}</td></tr>
      <tr><td>(−) خصومات وجزاءات</td><td>${m(stmt.workersPenalty)}</td><td>${m(stmt.ownPenalty)}</td><td>—</td><td>${m(stmt.totalPenalty)}</td></tr>
      <tr><td>(−) مصاريف</td><td>${m(stmt.workersExpenses)}</td><td>${m(stmt.ownExpenses)}</td><td>—</td><td>${m(stmt.totalExpenses)}</td></tr>
      <tr><td>(−) المدفوع</td><td>${m(stmt.workersPaid)}</td><td>${m(stmt.ownPaid)}</td><td>${m(stmt.equipPaid)}</td><td>${m(stmt.totalPaid)}</td></tr>
    </tbody>
    <tfoot><tr><th>المتبقي</th><th${balStyle(stmt.workersBal)}>${m(stmt.workersBal)}</th><th${balStyle(stmt.ownBal)}>${m(stmt.ownBal)}</th><th${balStyle(stmt.equipBal)}>${m(stmt.equipBal)}</th><th${balStyle(stmt.totalBal)}>${m(stmt.totalBal)}</th></tr></tfoot>
  </table>`)+(print?'':'<p style="font-size:12.5px;color:var(--ink-soft);margin:6px 0 0;">المتبقي = المستحق − الخصومات − المصاريف − المدفوع. (موجب = مستحق للمشرف/العمال علينا، سالب = عليهم لينا).</p>');
  if(!SHOW || SHOW==='costs') html += costsTableHtml((stmt.costsList||[]).map(c=>({date:c.date,name:c.name,item:c.item,project:c.project,notes:c.notes,amount:c.amount})), { showPerson:true, title:'التكاليف (مشرف + عماله)' });
  if((!SHOW || SHOW==='expenses') && stmt.expList && stmt.expList.length){
    html += H('مصاريف المشرف')+WRAP(T+`<thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>البيان</th></tr></thead><tbody>${stmt.expList.map(e=>{
      const lines = typeof expenseLinesOf==='function' ? expenseLinesOf(e) : [];
      const linesTxt = (lines||[]).map(l=>(l.item||'')+': '+m(l.amount)).join(' · ');
      return `<tr><td>${fmtDate(e.date)}</td><td>${escapeHtml(typeof expenseTypeLabel==='function'?expenseTypeLabel(e.type):(e.type||''))}</td><td>${m(e.amount)}</td><td>${escapeHtml(linesTxt||e.notes||'')}</td></tr>`;
    }).join('')}</tbody><tfoot><tr><th colspan="2">إجمالي المصاريف</th><th>${m(stmt.ownExpenses)}</th><th></th></tr></tfoot></table>`);
  }
  if(!SHOW || SHOW==='equipment') html += H('يومية المعدات التابعة للمشرف')+WRAP(T+`
    <thead><tr><th>التاريخ</th><th>المعدة</th>${thIf('supervisors','code','الكود')}<th>المشروع</th><th>أيام</th><th>ساعات</th><th>وقود (ل)</th><th>تكلفة اليوم</th></tr></thead>
    <tbody>${(stmt.equipLogs&&stmt.equipLogs.length)? stmt.equipLogs.map(r=>`<tr><td>${fmtDate(r.date)}</td><td><strong>${escapeHtml(r.name)}</strong></td><td>${escapeHtml(r.code)}</td><td>${escapeHtml(r.project||'—')}</td><td>${fmtDays(r.days)}</td><td>${fmtNum(r.hours)}</td><td>${fmtNum(r.fuel)}</td><td><strong>${m(r.cost)}</strong></td></tr>`).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--ink-soft);padding:16px;">لا يوميات معدات في الفترة</td></tr>'}</tbody>
    <tfoot><tr><th colspan="7">إجمالي تكلفة المعدات</th><th>${m(stmt.equipCost)}</th></tr>${stmt.equipPaid?`<tr><th colspan="7">المدفوع للمعدات</th><th>${m(stmt.equipPaid)}</th></tr><tr><th colspan="7">متبقي المعدات</th><th>${m(stmt.equipBal)}</th></tr>`:''}</tfoot></table>`);
  if(!SHOW || SHOW==='own') html += H('حساب المشرف نفسه')+WRAP(T+`
    <thead><tr><th>المشرف</th>${thIf('supervisors','code','الكود')}<th>اليومية</th><th>أيام العمل</th><th>الأجر</th><th>تكاليف</th><th>خصم</th><th>مصاريف</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
    <tbody><tr><td><strong>${escapeHtml(s.name||'')}</strong></td>${tdIf('supervisors','code',`<td>${escapeHtml(s.code||'')}</td>`)}<td>${m(s.dailyWage)}</td><td><strong>${fmtDays(stmt.ownDays||0)}</strong></td><td>${m(stmt.ownBaseDue)}</td><td>${m(stmt.ownExtras)}</td><td>${m(stmt.ownPenalty)}</td><td>${m(stmt.ownExpenses)}</td><td>${m(stmt.ownPaid)}</td><td${balStyle(stmt.ownBal)}><strong>${m(stmt.ownBal)}</strong></td></tr></tbody></table>`);
  if(print && (!SHOW || SHOW==='own')){
    const rowsOwn = (stmt.ownLogs||[]).map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${escapeHtml(labelOf(typeof ATTENDANCE_STATUS!=='undefined'?ATTENDANCE_STATUS:[], r.status)||r.status||'')}</td><td>${fmtDays(r.days)}</td><td>${m(r.wage)}</td><td>${m(r.net)}</td><td>${escapeHtml(r.project||'')}</td></tr>`).join('');
    html += `<h4>تفصيل أيام المشرف</h4><table><thead><tr><th>التاريخ</th>${thIf('supervisors','status','الحالة')}<th>أيام</th><th>اليومية</th><th>المستحق</th><th>المشروع</th></tr></thead><tbody>${rowsOwn||'<tr><td colspan="6">لا يوميات</td></tr>'}</tbody><tfoot><tr><th colspan="2">إجمالي</th><th>${fmtDays(stmt.ownDays||0)}</th><th></th><th>${m(stmt.ownBaseDue)}</th><th></th></tr></tfoot></table>`;
  }
  if(!SHOW || SHOW==='workers') html += H('حساب العمال')+WRAP(T+`
    <thead><tr><th>العامل</th>${thIf('supervisors','code','الكود')}<th>اليومية</th><th>أيام العمل</th><th>غياب</th><th>الأجر</th><th>تكاليف</th><th>خصم</th><th>مصاريف</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
    <tbody>${stmt.workers.length? stmt.workers.map(r=>`<tr><td><strong>${escapeHtml(r.w.name||'')}</strong></td><td>${escapeHtml(r.w.code||'')}</td><td>${m(r.w.dailyWage)}</td><td>${fmtDays(r.days)}</td><td>${fmtNum(r.absent)}</td><td>${m(r.baseDue)}</td><td>${m(r.extras)}</td><td>${m(r.penalty)}</td><td>${m(r.expenses)}</td><td>${m(r.paid)}</td><td${balStyle(r.bal)}><strong>${m(r.bal)}</strong></td></tr>`).join('') : '<tr><td colspan="11" style="text-align:center;color:var(--ink-soft);padding:20px;">لا عمال مرتبطين بهذا المشرف</td></tr>'}</tbody>
    <tfoot><tr><th colspan="5">إجمالي العمال</th><th>${m(stmt.workersBaseDue)}</th><th>${m(stmt.workersExtras)}</th><th>${m(stmt.workersPenalty)}</th><th>${m(stmt.workersExpenses)}</th><th>${m(stmt.workersPaid)}</th><th>${m(stmt.workersBal)}</th></tr></tfoot></table>`);
  if(!SHOW) try{ html += supervisorMultiSiteNoticeHtml(s.id, window.__supStmtFrom||'', window.__supStmtTo||'', print); }catch(_e){}
  return html;
}

/** كروت كشف حساب المشرف — تتغير مع الفلاتر (فترة/مشروع/نوع العرض) */
function supervisorStatementCardsHtml(stmt){
  const show = window.__supStmtShow || '';
  const C = (num, lbl, cls)=> `<div class="stat-card ${cls||''}"><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`;
  const wDays = (stmt.workers||[]).reduce((t,r)=>t+(Number(r.days)||0),0);
  const m = fmtMoney;
  let cards = [];
  if(show==='workers') cards = [C(stmt.workers.length,'عمال تابعين'), C(fmtDays(wDays),'أيام عمل العمال'), C(m(stmt.workersDue),'مستحق العمال'), C(m(stmt.workersPenalty),'خصومات وجزاءات'), C(m(stmt.workersExpenses),'مصاريف'), C(m(stmt.workersPaid),'المدفوع'), C(m(stmt.workersBal),'المتبقي', stmt.workersBal>0?'debt':'')];
  else if(show==='own') cards = [C(fmtDays(stmt.ownDays||0),'أيام عمل المشرف'), C(m(stmt.ownDue),'مستحق المشرف'), C(m(stmt.ownPenalty),'خصومات وجزاءات'), C(m(stmt.ownExpenses),'مصاريف'), C(m(stmt.ownPaid),'المدفوع'), C(m(stmt.ownBal),'المتبقي', stmt.ownBal>0?'debt':'')];
  else if(show==='equipment') cards = [C((stmt.equipLogs||[]).length,'يوميات المعدات'), C(m(stmt.equipCost),'تكلفة المعدات'), C(m(stmt.equipPaid),'المدفوع للمعدات'), C(m(stmt.equipBal),'المتبقي', stmt.equipBal>0?'debt':'')];
  else if(show==='expenses') cards = [C((stmt.expList||[]).length,'عدد المصاريف'), C(m(stmt.ownExpenses),'مصاريف المشرف'), C(m(stmt.workersExpenses),'مصاريف العمال'), C(m(stmt.totalExpenses),'إجمالي المصاريف')];
  else if(show==='costs'){ const list = stmt.costsList||[]; cards = [C(list.length,'عدد التكاليف'), C(m(list.reduce((t,c)=>t+(Number(c.amount)||0),0)),'إجمالي التكاليف')]; }
  else cards = [C(stmt.workers.length,'عمال تابعين'), C(fmtDays(stmt.totalDays),'أيام العمل (عمال+مشرف)'), C(m(stmt.totalDue),'إجمالي المستحق'), C(m(stmt.totalPenalty),'خصومات وجزاءات'), C(m(stmt.totalExpenses),'مصاريف'), C(m(stmt.totalPaid),'إجمالي المدفوع'), C(m(stmt.totalBal),'المتبقي الإجمالي', stmt.totalBal>0?'debt':'')];
  return `<div class="stats-row" id="supStmtCards" style="margin-bottom:16px;">${cards.join('')}</div>`;
}

function renderSupervisorStatementPage(supId){
  const s = getSupervisor(supId);
  if(!s){ window.__supDetailId = null; return renderSupervisorsPage(); }
  const from = window.__supStmtFrom || '';
  const to = window.__supStmtTo || '';
  const project = window.__supStmtProject || '';
  const stmt = supervisorWageStatement(supId, from||undefined, to||undefined, project||undefined);
  // قائمة المشاريع للاختيار
  const projSet = new Set();
  (DATA.projects||[]).forEach(p=>{ if(p && (p.name||p.title)) projSet.add(String(p.name||p.title).trim()); });
  (DATA.workerAttendance||[]).forEach(a=>{ if(a && a.project) projSet.add(String(a.project).trim()); });
  (DATA.equipmentDaily||[]).forEach(d=>{ if(d && d.project) projSet.add(String(d.project).trim()); });
  (DATA.costs||[]).forEach(c=>{ if(c && c.project) projSet.add(String(c.project).trim()); });
  const projList = Array.from(projSet).filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar'));
  const projOpts = `<option value="">كل المشاريع</option>` + projList.map(p=>`<option value="${escapeHtml(p)}" ${p===project?'selected':''}>${escapeHtml(p)}</option>`).join('');
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <div>
          <button class="btn btn-outline btn-sm" id="btnBackSup">← رجوع للمشرفين</button>
          <h2 class="page-title" style="margin:10px 0 0;">كشف حساب مشرف: ${escapeHtml(s.name)}</h2>
          <p class="page-sub" style="margin:4px 0 0;">المستحق (عمال + مشرف + معدات) − الخصومات − المصاريف − المدفوع = المتبقي${project?(' — مشروع: '+escapeHtml(project)):''}</p>
        </div>
        <div class="btn-row">
          <button class="btn btn-outline" id="btnPrintSupDays">طباعة كشف أيام</button>
          <button class="btn btn-outline" id="btnPrintSupStmt">طباعة كشف الحساب</button>
        </div>
      </div>
      <div class="filters-bar">
        <label style="font-size:13px;">من <input type="date" id="supStmtFrom" class="input" value="${escapeHtml(from)}"></label>
        <label style="font-size:13px;">إلى <input type="date" id="supStmtTo" class="input" value="${escapeHtml(to)}"></label>
        <label style="font-size:13px;">عرض في الكشف
          <select id="supStmtShow" class="input" style="min-width:150px;">${[['','الكل'],['workers','العمال'],['own','المشرف نفسه'],['equipment','المعدات'],['expenses','المصاريف'],['costs','التكاليف']].map(o=>`<option value="${o[0]}" ${o[0]===(window.__supStmtShow||'')?'selected':''}>${o[1]}</option>`).join('')}</select>
        </label>
        <label style="font-size:13px;">المشروع
          <select id="supStmtProject" class="input" style="min-width:160px;">${projOpts}</select>
        </label>
        <button class="btn btn-outline btn-sm" id="supStmtApply">تطبيق</button>
      </div>
      ${supervisorStatementCardsHtml(stmt)}
      ${supervisorStatementSectionsHtml(stmt, s, 'screen')}
    </div>`;
}

function initSupervisorsEvents(){
  if(!window.__supDetailId && typeof isEntityBoardsView==='function' && isEntityBoardsView(supervisorFilters)){
    if(typeof bindEntityDeptBoards==='function') bindEntityDeptBoards('supervisors', supervisorFilters);
    return;
  }
  if(typeof bindEntityListBack==='function') bindEntityListBack('supervisors', supervisorFilters);

  if(typeof bindBulkUI==='function') bindBulkUI('supervisors','supervisors');

  document.querySelectorAll('.btn-view-sup').forEach(b=> b.addEventListener('click', ()=>{
    const id = b.getAttribute('data-id');
    if(typeof openPersonDetailPage==='function') openPersonDetailPage('supervisor', id);
    else if(typeof openPersonDetailModal==='function') openPersonDetailModal('supervisor', id);
  }));

  if(typeof bindCategoryUI==='function') bindCategoryUI('supervisors', typeof supervisorFilters!=='undefined'?supervisorFilters:{categoryId:''}, ()=>{ resetTablePage('supervisors'); rerenderCurrentPage(); });

  if(window.__supDetailId){
    const back = document.getElementById('btnBackSup');
    if(back) back.addEventListener('click', ()=>{ window.__supDetailId=null; rerenderCurrentPage(); });
    const apply = document.getElementById('supStmtApply');
    if(apply) apply.addEventListener('click', ()=>{
      window.__supStmtFrom = document.getElementById('supStmtFrom')?.value||'';
      window.__supStmtTo = document.getElementById('supStmtTo')?.value||'';
      window.__supStmtProject = document.getElementById('supStmtProject')?.value||'';
      window.__supStmtShow = document.getElementById('supStmtShow')?.value||'';
      rerenderCurrentPage();
    });
    ['supStmtProject','supStmtShow','supStmtFrom','supStmtTo'].forEach(id=>{
      const el = document.getElementById(id); if(!el) return;
      el.addEventListener('change', ()=>{
        window.__supStmtFrom = document.getElementById('supStmtFrom')?.value||'';
        window.__supStmtTo = document.getElementById('supStmtTo')?.value||'';
        window.__supStmtProject = document.getElementById('supStmtProject')?.value||'';
        window.__supStmtShow = document.getElementById('supStmtShow')?.value||'';
        rerenderCurrentPage();
      });
    });
    const prDays = document.getElementById('btnPrintSupDays');
    if(prDays) prDays.addEventListener('click', ()=>{
      const from = window.__supStmtFrom||'';
      const to = window.__supStmtTo||'';
      if(typeof printDaysStatement==='function') printDaysStatement('supervisor', window.__supDetailId, from||undefined, to||undefined);
    });
    const pr = document.getElementById('btnPrintSupStmt');
    if(pr) pr.addEventListener('click', ()=>{
      const s = getSupervisor(window.__supDetailId);
      const from = window.__supStmtFrom||'';
      const to = window.__supStmtTo||'';
      const project = window.__supStmtProject||'';
      const stmt = supervisorWageStatement(window.__supDetailId, from||undefined, to||undefined, project||undefined);
      const periodLine = `الفترة: ${from?fmtDate(from):'الكل'} → ${to?fmtDate(to):'الكل'}`+(project?` — المشروع: ${project}`:'')+(window.__supStmtShow?(' — العرض: '+({workers:'العمال',own:'المشرف نفسه',equipment:'المعدات',expenses:'المصاريف',costs:'التكاليف'})[window.__supStmtShow]):'');
      printHtml(`
        <div class="print-sheet">
          ${typeof statementHeaderHtml==='function'?statementHeaderHtml('كشف حساب مشرف — '+(s&&s.name||''), periodLine):`<h2 style="text-align:center;">كشف حساب مشرف</h2>`}
          ${supervisorStatementSectionsHtml(stmt, s||{}, 'print')}
          ${typeof statementFooterHtml==='function'?statementFooterHtml():''}
        </div>
      `, (typeof buildExportFileTitle==='function'?buildExportFileTitle('كشف حساب مشرف', (s&&s.name)||'', from, to):('كشف حساب مشرف — '+((s&&s.name)||''))), { statement:true, brand:false, periodLine, totalAtEnd:true });
    });
    return;
  }
  if(typeof bindCustomFieldsManage==='function') bindCustomFieldsManage('supervisors');
  const search = document.getElementById('supSearch');
  if(search) search.addEventListener('input', ()=>{
    if(!supervisorFilters) window.supervisorFilters = supervisorFilters = {};
    supervisorFilters.q = search.value;
    if(typeof debounceRerender==='function') debounceRerender('supSearch');
    else { try{resetTablePage();}catch(_e){} rerenderCurrentPage(); }
  });
  if(typeof bindExtraPersonFilters==='function' && supervisorFilters) bindExtraPersonFilters('sup', supervisorFilters, 'supervisors');
  const stSel = document.getElementById('supFilterStatus');
  if(stSel) stSel.addEventListener('change', ()=>{
    if(!supervisorFilters) window.supervisorFilters = supervisorFilters = {};
    supervisorFilters.status = stSel.value;
    try{resetTablePage();}catch(_e){}
    rerenderCurrentPage();
  });
  const add = document.getElementById('btnAddSup');
  if(add) add.addEventListener('click', ()=> openSupervisorModal());
  document.querySelectorAll('.btn-edit-sup').forEach(b=> b.addEventListener('click', ()=> openSupervisorModal(b.getAttribute('data-id'))));
  document.querySelectorAll('.btn-stmt-sup').forEach(b=> b.addEventListener('click', ()=>{
    window.__supDetailId = b.getAttribute('data-id');
    rerenderCurrentPage();
  }));
  document.querySelectorAll('.btn-del-sup').forEach(b=> b.addEventListener('click', ()=>{
    confirmDelete('حذف المشرف؟ العمال المرتبطون لن يُحذفوا لكن يفقدون الربط.').then(ok=>{ if(!ok) return;
      const id = b.getAttribute('data-id');
      const s = getSupervisor(id);
      (DATA.workers||[]).forEach(w=>{ if(w.supervisorId===id) w.supervisorId=''; });
      if(typeof softDelete==='function') softDelete('supervisors', id, s?s.name:id);
      else {
      DATA.supervisors = (DATA.supervisors||[]).filter(x=>x.id!==id);
      saveData(); showToast('تم الحذف');
      }
      addAudit('حذف مشرف', s?s.name:id);
      rerenderCurrentPage();
    });
  }));
  
  const addP = document.getElementById('btnAddProj');
  if(addP) addP.addEventListener('click', ()=>{
    const name = prompt('اسم المشروع:');
    if(!name || !name.trim()) return;
    ensureProjectSaved(name.trim());
    saveData(); showToast('تم حفظ المشروع'); rerenderCurrentPage();
  });
  document.querySelectorAll('.btn-del-proj').forEach(b=> b.addEventListener('click', ()=>{
    confirmDelete('حذف المشروع من القائمة؟').then(ok=>{ if(!ok) return;
      deleteProjectById(b.getAttribute('data-id'));
      saveData(); showToast('تم الحذف'); rerenderCurrentPage();
    });
  }));
}

function openSupervisorModal(editId){
  const s = editId ? getSupervisor(editId) : null;
  const isEdit = !!s;
  const formAttId = isEdit ? s.id : uid();
  if(!isEdit && typeof ensureFormDraft==='function') ensureFormDraft('supervisor', formAttId);
  openModal(`
    <div class="modal-header">
      <h3>${isEdit?'تعديل مشرف':'إضافة مشرف جديد'}</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>الكود (تلقائي — قابل للتعديل)
          <input class="input" id="supCode" value="${escapeHtml(s&&s.code||(typeof nextSupervisorCode==='function'?nextSupervisorCode():'SUP-001'))}" placeholder="SUP-001">
        </label>
        <label>الاسم الكامل *
          <input class="input" id="supName" value="${escapeHtml(s&&s.name||'')}" required>
        </label>
        <label>الحالة
          <select class="input" id="supStatus">${personStatusOptionsHtml(s&&s.status, { blank: !s })}</select>
        </label>
        ${typeof resignedDateFieldHtml==='function'?resignedDateFieldHtml('sup', s):''}
        <label>القسم (من الوظيفة)
          <input class="input" id="supDept" readonly tabindex="-1" value="${escapeHtml(s&&(s.skill||s.position)||'')}" placeholder="يُقرأ من خانة الوظيفة" style="background:var(--paper-2);cursor:default;">
        </label>
        ${typeof personHrFieldsHtml==='function'?personHrFieldsHtml('sup', Object.assign({},s,{position:s&&s.skill,dailyWage:s?s.dailyWage:''}), { showSalary:false, showWage:true, showLicense:true }):''}
        <label>العنوان
          <input class="input" id="supAddress" value="${escapeHtml(s&&s.address||'')}">
        </label>

        ${customFieldsFormHtml('supervisors', s)}
        <label style="grid-column:1/-1;">ملاحظات
          <textarea class="input" id="supNotes" rows="2">${escapeHtml(s&&s.notes||'')}</textarea>
        </label>
        ${typeof formAttachmentsBlockHtml==='function'?formAttachmentsBlockHtml('supervisor', formAttId, isEdit?(s.attachments||[]):[]):''}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveSup">${isEdit?'حفظ التعديلات':'إضافة'}</button>
    </div>
  `);
  if(typeof bindAttachmentHandlers==='function') bindAttachmentHandlers(document.getElementById('appModal'));
  if(typeof bindAutoStatusDates==='function') bindAutoStatusDates(document.getElementById('appModal'));
  if(typeof bindExtraFieldsButton==='function') bindExtraFieldsButton('extraFields_supervisors');
  if(typeof bindResignedStatusToggle==='function') bindResignedStatusToggle('supStatus','sup');
  try{ const _pi=document.getElementById('supPos'), _di=document.getElementById('supDept'); if(_pi&&_di) _pi.addEventListener('input',()=>{ _di.value=_pi.value; }); }catch(_e){}
  document.getElementById('btnSaveSup').addEventListener('click', ()=>{
    const name = (document.getElementById('supName').value||'').trim();
    const project = (document.getElementById('supProject')?.value||'').trim();
    if(!name){ showToast('الاسم مطلوب'); return; }
        const hrS = typeof collectPersonHrFields==='function' ? collectPersonHrFields('sup',{showWage:true,skillFromPos:true}) : {};
    const payload = Object.assign({
      code: (typeof ensureUniqueCode==='function'
        ? ensureUniqueCode(document.getElementById('supCode').value, DATA.supervisors, 'SUP-', s&&s.id)
        : ((document.getElementById('supCode').value||'').trim() || nextSupervisorCode())),
      name,
      status: document.getElementById('supStatus').value||'active',
      resignedAt: (typeof readResignedDateFromForm==='function'?readResignedDateFromForm('sup', document.getElementById('supStatus').value):'')||(s&&s.resignedAt)||'',
      address: ((document.getElementById('supAddress')&&document.getElementById('supAddress').value)||'').trim(),
      notes: (document.getElementById('supNotes').value||'').trim(),
      extraFields: typeof collectExtraFieldsForSave==='function' ? collectExtraFieldsForSave('extraFields_supervisors') : [],
      attachments: isEdit ? ((s && s.attachments) || []) : (typeof takeFormDraftAttachments==='function' ? takeFormDraftAttachments('supervisor', formAttId) : [])
    }, hrS);
    if(typeof syncDocStatusesFromDates==='function') syncDocStatusesFromDates(payload);
    if(hrS.position && !payload.skill) payload.skill = hrS.position;
    try{ if(typeof personDeptOnSave==='function') personDeptOnSave('supervisors', s, payload); }catch(_e){}
    const commitSup = ()=>{
      if(isEdit){
        if(typeof mergePersonRecord==='function') mergePersonRecord(s, payload); else Object.keys(payload).forEach(k=>{ if(payload[k]!==undefined) s[k]=payload[k]; });
        addAudit('تعديل مشرف', name);
      } else {
        payload.id = uid();
        DATA.supervisors.push(payload);
        addAudit('إضافة مشرف', name);
      }
      DATA.supervisors = sortByNameAr(DATA.supervisors, x=>x.name);
      if(project) ensureProjectSaved(project);
      try{
        const person = isEdit ? s : payload;
        if(person && typeof syncPersonResignedState==='function') syncPersonResignedState('supervisor', person);
      }catch(_e){}
      saveData(true);
      closeModal();
      showToast(isEdit?'تم التعديل':'تمت الإضافة');
      if(currentPage==='supervisors') rerenderCurrentPage();
      else { currentPage='supervisors'; render(); }
    };
    if(typeof guardEntityDuplicates==='function'){
      guardEntityDuplicates('supervisor', payload, isEdit && s ? s.id : null).then(ok=>{ if(ok) commitSup(); });
    } else commitSup();
  });
}
