function isWorkerTemporary(w){
  if(!w) return false;
  if(typeof isTemporaryWorker==='function') return isTemporaryWorker(w);
  const t = String(w.workerType || w.type || '').toLowerCase();
  return /temporary|temp|daily|مؤقت|يومية|يوميه/.test(t);
}
function filteredWorkers(){
  let list = (DATA.workers||[]).slice();
  const f = workerFilters||{};
  if(f.status==='temporary') list = list.filter(w=>typeof isTemporaryWorker==='function' && isTemporaryWorker(w)); else if(f.status) list = list.filter(w=>w.status===f.status);
  if(f.type){
    const ft = String(f.type).toLowerCase();
    if(ft==='temporary' || ft==='temp' || ft==='daily')
      list = list.filter(w=>isWorkerTemporary(w));
    else if(ft==='company' || ft==='permanent')
      list = list.filter(w=>!isWorkerTemporary(w));
    else
      list = list.filter(w=>String(w.type||w.workerType||'').toLowerCase()===ft);
  }
  if(f.supervisorId) list = list.filter(w=>w.supervisorId===f.supervisorId);
  if(f.project) list = list.filter(w=>(w.project||'').includes(f.project));
  const deptF = f.departmentId || f.categoryId || '';
  list = typeof filterByDeptFilter==='function' ? filterByDeptFilter(list, deptF) : (deptF ? list.filter(w=>(w.departmentId||w.categoryId)===deptF) : list);
  if(f.q && typeof smartSearchList==='function') list = smartSearchList(list, f.q);
  if(typeof applyExtraPersonFilters==='function') list = applyExtraPersonFilters('worker', list, f);
  return (f.q && String(f.q).trim()) ? list : sortByNameAr(list, w=>w.name);
}

function renderWorkersPage(){
  if(typeof isEntityBoardsView==='function' && isEntityBoardsView(workerFilters)){
    return entityDeptBoardsPageHtml('workers', 'العمال', '');
  }
  const catId = (workerFilters&&(workerFilters.departmentId||workerFilters.categoryId))||'';
  const rows = filteredWorkers();
  if(typeof setPageExport==='function'){
    const _x = personListExport('worker', rows);
    setPageExport('workers', _x.headers, _x.rows);
  }
  const pg = paginateRows(rows, 'workers');
  const projects = [...new Set((DATA.workers||[]).map(w=>w.project).filter(Boolean))];
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <div>
          ${typeof entityListBackBarHtml==='function'?entityListBackBarHtml('workers', workerFilters, ''):''}
          <h2 class="page-title" style="margin:0;">العمال</h2>
        </div>
        <div class="btn-row">
          ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():'<button class="btn btn-outline btn-sm" id="btnExportWorkers">CSV</button>'}
          ${String((workerFilters&&(workerFilters.departmentId||workerFilters.categoryId))||'')==='__core_workers_perm__' ? '' : `<button type="button" class="btn btn-green-strong" id="btnAddTempWorker" ${readOnlyMode?'disabled':''}>+ إضافة عامل مؤقت</button>`}
          ${String((workerFilters&&(workerFilters.departmentId||workerFilters.categoryId))||'')==='__core_workers_temp__' ? '' : `<button type="button" class="btn btn-primary" id="btnAddWorker" ${readOnlyMode?'disabled':''}>+ إضافة عامل</button>`}
        </div>
      </div>
      ${entityStatCardsHtml('workers', rows)}
      <div class="filters-bar filters-bar-inline" style="align-items:center;">
        <input type="search" id="wrkSearch" class="input" placeholder="بحث: اسم، كود، مهارة، مشروع، هاتف، قومي..." value="${escapeHtml(workerFilters.q||'')}">
        <select id="wrkFilterStatus" class="input"><option value="">كل الحالات</option>${personStatusOptionsHtml(workerFilters.status||'__all__')}</select>
        <div class="filter-combo">${typeof entityComboHtml==='function'?entityComboHtml('wrkFilterSup','supervisor',workerFilters.supervisorId||'','بحث مشرف...'):`<select id="wrkFilterSup" class="input">${supervisorOptions(workerFilters.supervisorId||'', '— كل المشرفين —')}</select>`}</div>
        <select id="wrkFilterType" class="input"><option value="">كل الأنواع</option>${selectOptions(WORKER_TYPES, workerFilters.type)}</select>
        <input type="text" id="wrkFilterProject" class="input" placeholder="المشروع" list="wrkProjectsList" value="${escapeHtml(workerFilters.project||'')}">
        <datalist id="wrkProjectsList">${projects.map(p=>`<option value="${escapeHtml(p)}">`).join('')}</datalist>
        ${typeof extraPersonFiltersHtml==='function'?extraPersonFiltersHtml('worker', workerFilters, 'wrk'):''}
      </div>
      ${typeof bulkBarHtml==='function'?bulkBarHtml('workers'):''}
      ${(() => {
        const fType = String((workerFilters&&workerFilters.type)||'').toLowerCase();
        const _wd = String((workerFilters&&(workerFilters.departmentId||workerFilters.categoryId))||'');
        const forceTemp = fType==='temporary' || fType==='temp' || fType==='daily' || _wd==='__core_workers_temp__';
        const forceCo = fType==='company' || fType==='permanent' || _wd==='__core_workers_perm__';
        const allTemp = pg.pageRows.length>0 && pg.pageRows.every(w=>isWorkerTemporary(w));
        const allCo = pg.pageRows.length>0 && pg.pageRows.every(w=>!isWorkerTemporary(w));
        const mode = forceTemp || (!forceCo && allTemp) ? 'temp' : (forceCo || allCo ? 'company' : 'mixed');

        if(mode==='temp'){
          const head = `<tr>
              <th style="width:36px;"><input type="checkbox" id="checkAll_workers" title="تحديد الكل"></th>
              ${thIf('workersTemp','code','الكود')}${thIf('workersTemp','name','الاسم')}${thIf('workersTemp','status','الحالة')}${thIf('workersTemp','nationalId','الرقم القومي')}
              ${thIf('workersTemp','job','الوظيفة')}${thIf('workersTemp','department','القسم')}${thIf('workersTemp','supervisor','المشرف')}${thIf('workersTemp','dailyWage','اليومية')}
              ${thIf('workersTemp','phone','رقم التليفون')}${thIf('workersTemp','address','العنوان')}
              ${thIf('workersTemp','notes','الملاحظات')}<th></th>
            </tr>`;
          const body = pg.pageRows.length ? pg.pageRows.map(w => `<tr>
                <td><input type="checkbox" class="row-check" data-kind="workers" data-id="${w.id}"></td>
                ${tdIf('workersTemp','code',`<td>${escapeHtml(w.code||'')}</td>`)}
                ${tdIf('workersTemp','name',`<td>${typeof personWarningBadge==='function'?personWarningBadge('worker',w):''}<strong>${escapeHtml(w.name||'')}</strong></td>`)}
                ${tdIf('workersTemp','status',typeof personStatusCellHtml==='function'?personStatusCellHtml('worker',w):'<td>—</td>')}
                ${tdIf('workersTemp','nationalId',`<td>${escapeHtml(w.nationalId||'—')}</td>`)}
                ${tdIf('workersTemp','job',`<td>${escapeHtml(w.position||w.skill||'—')}</td>`)}
                ${tdIf('workersTemp','department',`<td>${escapeHtml(typeof departmentName==='function'?departmentName(w.departmentId||w.categoryId):'—')}</td>`)}
                ${tdIf('workersTemp','supervisor',`<td>${escapeHtml(supervisorName(w.supervisorId))}</td>`)}
                ${tdIf('workersTemp','dailyWage',`<td>${fmtMoney(w.dailyWage)}</td>`)}
                ${tdIf('workersTemp','phone',`<td>${escapeHtml(w.phone||'—')}</td>`)}
                ${tdIf('workersTemp','address',`<td>${escapeHtml(w.address||'—')}</td>`)}
                ${tdIf('workersTemp','notes',`<td>${typeof personNotesCellHtml==='function'?personNotesCellHtml('worker',w):'—'}</td>`)}
                <td>${typeof rowActionBtnsHtml==='function'?rowActionBtnsHtml({id:w.id, viewClass:'btn-view-wrk', editClass:'btn-edit-wrk', delClass:'btn-del-wrk'}):''}</td>
              </tr>`).join('') : '<tr><td colspan="12" style="text-align:center;color:var(--ink-soft);padding:30px;">لا يوجد عمال مؤقتون</td></tr>';
          return `<div class="table-wrap"><table class="data-table" data-layout-ent="workersTemp"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
        }

        const typeColH = mode==='mixed' ? '<th>النوع</th>' : '';
        const head = `<tr>
              <th style="width:36px;"><input type="checkbox" id="checkAll_workers" title="تحديد الكل"></th>
              ${thIf('workers','code','كود العامل')}${thIf('workers','name','الاسم')}${typeColH}${thIf('workers','job','الوظيفة')}${thIf('workers','nationalId','الرقم القومي')}
              ${thIf('workers','idCardExpiry','انتهاء البطاقة')}${thIf('workers','idCardStatus','حالة البطاقة')}
              ${thIf('workers','hireDate','تاريخ التعيين')}${thIf('workers','contractType','نوع العقد')}${thIf('workers','contractStatus','حالة العقد')}${mode==='company'?'':thIf('workers','dailyWage','اليومية')}${thIf('workers','salary','الراتب')}
              ${thIf('workers','insuranceStatus','حالة التأمين')}${thIf('workers','insuranceNumber','الرقم التأميني')}${thIf('workers','phone','رقم التليفون')}
              ${thIf('workers','birthDate','تاريخ الميلاد')}${thIf('workers','address','العنوان')}${thIf('workers','project','المشروع')}${thIf('workers','supervisor','المشرف')}${thIf('workers','department','القسم')}${thIf('workers','status','الحالة')}${thIf('workers','notes','الملاحظات')}${customFieldsTableHeaders('workers')}<th></th>
            </tr>`;
        const body = pg.pageRows.length ? pg.pageRows.map(w => {
          const temp = isWorkerTemporary(w);
          const typeCell = mode==='mixed' ? `<td>${temp?'مؤقت':'شركة'}</td>` : '';
          if(temp){
            return `<tr>
                <td><input type="checkbox" class="row-check" data-kind="workers" data-id="${w.id}"></td>
                <td>—</td>
                ${tdIf('workers','name',`<td>${typeof personWarningBadge==='function'?personWarningBadge('worker',w):''}<strong>${escapeHtml(w.name||'')}</strong></td>`)}
                ${typeCell}
                <td>—</td>
                ${tdIf('workers','nationalId',`<td>${escapeHtml(w.nationalId||'—')}</td>`)}
                <td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>
                ${tdIf('workers','dailyWage',`<td>${fmtMoney(w.dailyWage)}</td>`)}
                <td>—</td><td>—</td><td>—</td>
                ${tdIf('workers','phone',`<td>${escapeHtml(w.phone||'—')}</td>`)}
                ${tdIf('workers','address',`<td>${escapeHtml(w.address||'—')}</td>`)}
                ${tdIf('workers','project',`<td>${escapeHtml(w.project||'—')}</td>`)}
                ${tdIf('workers','supervisor',`<td>${escapeHtml(supervisorName(w.supervisorId))}</td>`)}
                ${tdIf('workers','department',`<td>${escapeHtml(typeof departmentName==='function'?departmentName(w.departmentId||w.categoryId):'—')}</td>`)}
                <td><span class="badge badge-ok">مؤقت</span></td>
                ${tdIf('workers','notes',`<td>${typeof personNotesCellHtml==='function'?personNotesCellHtml('worker',w):'—'}</td>`)}
                ${customFieldsTableCells('workers', w)}
                <td>${typeof rowActionBtnsHtml==='function'?rowActionBtnsHtml({id:w.id, viewClass:'btn-view-wrk', editClass:'btn-edit-wrk', delClass:'btn-del-wrk'}):''}</td>
              </tr>`;
          }
          return `<tr>
                <td><input type="checkbox" class="row-check" data-kind="workers" data-id="${w.id}"></td>
                ${tdIf('workers','code',`<td>${escapeHtml(w.code||'')}</td>`)}
                ${tdIf('workers','name',`<td>${typeof personWarningBadge==='function'?personWarningBadge('worker',w):''}<strong>${escapeHtml(w.name||'')}</strong></td>`)}
                ${typeCell}
                ${tdIf('workers','job',`<td>${escapeHtml(w.position||w.skill||'')}</td>`)}
                ${tdIf('workers','nationalId',`<td>${escapeHtml(w.nationalId||'—')}</td>`)}
                ${tdIf('workers','idCardExpiry',`<td>${fmtDate(w.idCardExpiry)}</td>`)}
                ${tdIf('workers','idCardStatus',`<td>${typeof statusBadgeSarya==='function'?statusBadgeSarya((w.idCardExpiry?statusFromExpiry(w.idCardExpiry):w.idCardStatus),'card'):'—'}</td>`)}
                ${tdIf('workers','hireDate',`<td>${fmtDate(w.hireDate)}</td>`)}
                ${tdIf('workers','contractType',`<td>${escapeHtml(labelOf(typeof CONTRACT_TYPE_OPTS!=='undefined'?CONTRACT_TYPE_OPTS:[], w.contractType)||'—')}</td>`)}
                ${tdIf('workers','contractStatus',`<td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(w.contractStatus,'contract'):'—'}</td>`)}
                ${mode==='company'?'':tdIf('workers','dailyWage',`<td>${fmtMoney(w.dailyWage)}</td>`)}
                ${tdIf('workers','salary',`<td>${fmtMoney(w.salary||w.basicSalary)}</td>`)}
                ${tdIf('workers','insuranceStatus',`<td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(w.insuranceStatus||'','insurance'):'—'}</td>`)}
                ${tdIf('workers','insuranceNumber',`<td>${escapeHtml(w.insuranceNumber||'—')}</td>`)}
                ${tdIf('workers','phone',`<td>${escapeHtml(w.phone||'—')}</td>`)}
                ${tdIf('workers','birthDate',`<td>${fmtDate(w.birthDate)||'—'}</td>`)}${tdIf('workers','address',`<td>${escapeHtml(w.address||'—')}</td>`)}
                ${tdIf('workers','project',`<td>${escapeHtml(w.project||'—')}</td>`)}
                ${tdIf('workers','supervisor',`<td>${escapeHtml(supervisorName(w.supervisorId))}</td>`)}
                ${tdIf('workers','department',`<td>${escapeHtml(typeof departmentName==='function'?departmentName(w.departmentId||w.categoryId):'—')}</td>`)}
                ${tdIf('workers','status',`${personStatusCellHtml('worker',w)}`)}
                ${tdIf('workers','notes',`<td>${typeof personNotesCellHtml==='function'?personNotesCellHtml('worker',w):'—'}</td>`)}
                ${customFieldsTableCells('workers', w)}
                <td>${typeof rowActionBtnsHtml==='function'?rowActionBtnsHtml({id:w.id, viewClass:'btn-view-wrk', editClass:'btn-edit-wrk', delClass:'btn-del-wrk'}):''}</td>
              </tr>`;
        }).join('') : '<tr><td colspan="12" style="text-align:center;color:var(--ink-soft);padding:30px;">لا يوجد عمال — اضغط "إضافة عامل"</td></tr>';
        return `<div class="table-wrap"><table class="data-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
      })()}
      ${tablePagerHtml('workers', pg)}
      ${customFieldsManageHtml('workers')}
    </div>`;
}

function initWorkersEvents(){
  // زر الإضافة مربوط بتفويض عام على document (في آخر الملف) — لا ربط مزدوج هنا
  if(typeof isEntityBoardsView==='function' && isEntityBoardsView(workerFilters)){
    if(typeof bindEntityDeptBoards==='function') bindEntityDeptBoards('workers', workerFilters);
    return;
  }
  if(typeof bindEntityListBack==='function') bindEntityListBack('workers', workerFilters);

  try{ if(typeof bindBulkUI==='function') bindBulkUI('workers','workers'); }catch(_e){}
  try{ if(typeof bindEntityCombos==='function') bindEntityCombos(document); }catch(_e){}

  try{ if(typeof bindCategoryUI==='function') bindCategoryUI('workers', workerFilters, ()=>{ resetTablePage('workers'); rerenderCurrentPage(); }); }catch(_e){}
  try{ if(typeof bindCustomFieldsManage==='function') bindCustomFieldsManage('workers'); }catch(_e){}
  const search = document.getElementById('wrkSearch');
  if(search) search.addEventListener('input', ()=>{ workerFilters.q = search.value; resetTablePage('workers'); if(typeof debounceRerender==='function') debounceRerender('workersSearch'); else rerenderCurrentPage(); });
  if(typeof bindExtraPersonFilters==='function') bindExtraPersonFilters('wrk', workerFilters, 'workers');
  const fs = document.getElementById('wrkFilterStatus');
  if(fs) fs.addEventListener('change', ()=>{ workerFilters.status = fs.value; resetTablePage('workers'); rerenderCurrentPage(); });
  const fsup = document.getElementById('wrkFilterSup');
  if(fsup) fsup.addEventListener('change', ()=>{ workerFilters.supervisorId = fsup.value; resetTablePage('workers'); rerenderCurrentPage(); });
  
  const ft = document.getElementById('wrkFilterType');
  if(ft) ft.addEventListener('change', ()=>{ workerFilters.type = ft.value; resetTablePage('workers'); rerenderCurrentPage(); });
  const fp = document.getElementById('wrkFilterProject');
  if(fp) fp.addEventListener('input', ()=>{ workerFilters.project = fp.value; resetTablePage('workers'); if(typeof debounceRerender==='function') debounceRerender('workersProj'); else rerenderCurrentPage(); });
  const exp = document.getElementById('btnExportWorkers');
  if(exp) exp.addEventListener('click', ()=>{
    const rows = filteredWorkers().map(w=>[w.code,w.name,(w.skill||w.position||labelOf(WORKER_TYPES,w.type)||''),w.skill,w.dailyWage,w.project,w.phone,w.nationalId,labelOf(WORKER_STATUS,w.status)]);
    downloadCsv('workers.csv', ['الكود','الاسم','النوع','المهارة','اليومية','المشروع','الهاتف','الرقم القومي','الحالة'], rows);
    showToast('تم التصدير');
  });
  document.querySelectorAll('.btn-edit-wrk').forEach(b => b.addEventListener('click', ()=> openWorkerModal(b.getAttribute('data-id'))));
  document.querySelectorAll('.btn-view-wrk').forEach(b => b.addEventListener('click', ()=> {
    const id = b.getAttribute('data-id');
    if(typeof openPersonDetailPage==='function') openPersonDetailPage('worker', id);
    else if(typeof openPersonDetailModal==='function') openPersonDetailModal('worker', id);
  }));
  document.querySelectorAll('.btn-del-wrk').forEach(b => b.addEventListener('click', ()=>{
    const id = b.getAttribute('data-id');
    const w = getWorker(id);
    confirmDelete('حذف العامل؟ يمكن الاستعادة خلال 5 ثوانٍ').then(ok=>{ if(!ok) return;
      softDelete('workers', id, w?w.name:id);
      addAudit('حذف عامل', w?w.name:id);
      rerenderCurrentPage();
    });
  }));
}

function openWorkerModal(editId, opts){
  try{ window.openWorkerModal = openWorkerModal; }catch(_e){}
  try{
    opts = opts || {};
    // إن مُرّر كائن كأول وسيط (opts فقط)
    if(editId && typeof editId==='object' && !editId.id && (editId.defaultType||editId.workerType)){
      opts = editId; editId = null;
    }
    const w = (editId && typeof getWorker==='function') ? getWorker(editId) : (editId && typeof editId==='object' && editId.id ? editId : null);
    const isEdit = !!(w && w.id);
    const formAttId = isEdit ? w.id : (typeof uid==='function'?uid():('w_'+Date.now()));
    if(!isEdit && typeof ensureFormDraft==='function') ensureFormDraft('worker', formAttId);

    const wt0 = String((w && (w.workerType || w.type)) || opts.defaultType || opts.workerType || '').toLowerCase();
    let workerType0 = 'company';
    // من الفلتر الحالي في صفحة العمال
    try{
      if(!isEdit && !wt0 && typeof workerFilters!=='undefined' && workerFilters && workerFilters.type){
        const ft = String(workerFilters.type).toLowerCase();
        if(/temporary|temp|daily|مؤقت/.test(ft)) workerType0 = 'temporary';
        else if(/company|permanent|شركة/.test(ft)) workerType0 = 'company';
      }
    }catch(_e){}
    if(/temporary|temp|daily|مؤقت|يومية|يوميه/.test(wt0)) workerType0 = 'temporary';
    else if(/company|permanent|شركة/.test(wt0)) workerType0 = 'company';
    else if(w && (w.salary || w.basicSalary)) workerType0 = 'company';
    else if(w && w.dailyWage && !w.salary) workerType0 = 'temporary';
    else if(opts.defaultType==='temporary' || opts.workerType==='temporary') workerType0 = 'temporary';

    const curSt = (w && w.status) || '';
    const statusOpts = personStatusOptionsHtml(curSt, { blank: !w });
    const code0 = (w && w.code) || (typeof nextWorkerCode==='function' ? nextWorkerCode() : 'WRK-001');
    const hrBlock = (typeof personHrFieldsHtml==='function')
      ? personHrFieldsHtml('wrk', Object.assign({}, w||{}, {
          position: (w && (w.skill || w.position || w.jobTitle)) || '',
          dailyWage: w ? w.dailyWage : '',
          salary: w ? (w.salary || w.basicSalary) : ''
        }), { showSalary:true, showWage:false, showLicense:false, skillFromPos:true, showPosition:true })
      : '';

    const html = `
    <div class="modal-header">
      <h3>${isEdit ? 'تعديل عامل' : 'إضافة عامل جديد'}</h3>
      <button type="button" class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-grid form-grid-2" id="wrkFormGrid">
        <input type="hidden" id="wrkWorkerType" value="${workerType0}">
        <label>الاسم *
          <input class="input" id="wrkName" value="${escapeHtml((w && w.name) || '')}" required>
        </label>
        <label>كود العامل (تلقائي — قابل للتعديل)
          <input class="input" id="wrkCode" value="${escapeHtml(code0)}" placeholder="WRK-001">
        </label>
        <label>الحالة
          <select class="input" id="wrkStatus">${statusOpts}</select>
        </label>
        <label>المشرف *
          ${typeof entityComboHtml==='function'
            ? entityComboHtml('wrkSupervisor','supervisor', (w && w.supervisorId) || '', 'اكتب اسم المشرف...')
            : `<select class="input" id="wrkSupervisor">${typeof supervisorOptions==='function'?supervisorOptions((w&&w.supervisorId)||''):'<option value="">—</option>'}</select>`}
        </label>
        <label class="wrk-temp-only" id="wrkPosTempLab" style="display:none;">الوظيفة
          <input class="input" id="wrkPosTemp" value="${escapeHtml((w && (w.skill||w.position||w.jobTitle)) || '')}" placeholder="مثال: نجار، سباك...">
        </label>
        <label>القسم (من الوظيفة)
          <input class="input" id="wrkDept" readonly tabindex="-1" value="${escapeHtml((w && (w.skill||w.position||w.jobTitle)) || '')}" placeholder="يُقرأ من خانة الوظيفة" style="background:var(--paper-2);cursor:default;">
        </label>
        <div id="wrkHrWrap" class="wrk-full-only" style="display:contents;">
          ${hrBlock}
        </div>
        <label class="wrk-temp-wage" style="display:none;">اليومية (ج.م)
          <input class="input" id="wrkWageTemp" type="number" min="0" step="0.01" value="${w && w.dailyWage != null && w.dailyWage !== '' ? toInt(w.dailyWage) : ''}" placeholder="اليومية">
        </label>
        <label id="wrkNidTempLab" style="display:none;">الرقم القومي<input class="input" id="wrkNidTemp" value="${escapeHtml((w&&w.nationalId)||'')}"></label>
        <label id="wrkPhoneTempLab" style="display:none;">الهاتف<input class="input" id="wrkPhoneTemp" value="${escapeHtml((w&&w.phone)||'')}"></label>
        <label class="wrk-full-only">المشروع
          ${typeof projectInputHtml==='function'
            ? projectInputHtml('wrkProject', (w && w.project) || '', 'wrkProjList')
            : `<input class="input" id="wrkProject" value="${escapeHtml((w && w.project) || '')}">`}
        </label>

        <label>العنوان
          <input class="input" id="wrkAddress" value="${escapeHtml((w && w.address) || '')}">
        </label>
        <label style="grid-column:1/-1;">ملاحظات
          <textarea class="input" id="wrkNotes" rows="4">${escapeHtml((w && w.notes) || '')}</textarea>
        </label>
        <div class="wrk-full-only" style="display:contents;">
          ${typeof customFieldsFormHtml==='function' ? customFieldsFormHtml('workers', w || {}) : ''}
          ${typeof formAttachmentsBlockHtml==='function' ? formAttachmentsBlockHtml('worker', formAttId, isEdit ? ((w && w.attachments) || []) : []) : ''}
        </div>
      </div>
      <p id="wrkTypeHint" style="font-size:12px;color:var(--ink-soft);margin:8px 0 0;"></p>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button type="button" class="btn btn-primary" id="btnSaveWrk">${isEdit ? 'حفظ التعديلات' : 'إضافة'}</button>
    </div>`;

    if(typeof openModal!=='function'){ showToast('openModal غير متاح'); return; }
    openModal(html);

    function applyWorkerTypeUI(){
      const isTemp = (document.getElementById('wrkWorkerType')?.value || '') === 'temporary';
      // حقول عامل الشركة فقط
      document.querySelectorAll('.wrk-full-only').forEach(el=>{
        if(isTemp){
          el.style.display = 'none';
        } else {
          if((el.getAttribute('style')||'').indexOf('contents')>=0) el.style.display = 'contents';
          else el.style.display = '';
        }
      });
      document.querySelectorAll('.wrk-temp-only').forEach(el=>{ el.style.display = isTemp ? '' : 'none'; });
      // اليومية الخاصة بالمؤقت
      document.querySelectorAll('.wrk-temp-wage').forEach(el=>{
        el.style.display = isTemp ? '' : 'none';
      });
      // داخل كتلة HR: للمؤقت أظهر الرقم القومي والهاتف فقط إن وُجدت
      const wrap = document.getElementById('wrkHrWrap');
      if(wrap){
        if(isTemp){
          // أخفِ الكتلة كلها ثم أظهر القومي/الهاتف خارجها إن لزم — الكتلة مخفية عبر wrk-full-only
          wrap.style.display = 'none';
        } else {
          wrap.style.display = 'contents';
          wrap.querySelectorAll('label').forEach(lab=>{ lab.style.display = ''; });
        }
      }
      // أظهر حقول المشترك: مشرف، قسم، عنوان، مشروع دائماً
      ['wrkSupervisor','wrkDept','wrkAddress','wrkName','wrkWorkerType'].forEach(id=>{
        const el = document.getElementById(id);
        if(!el) return;
        const lab = el.closest('label') || el.closest('div');
        if(lab) lab.style.display = '';
      });
      // للمؤقت: أضف صفوف قومي وهاتف إن لم تكن ظاهرة
      let nidLab = document.getElementById('wrkNidTemp');
      let phoneLab = document.getElementById('wrkPhoneTemp');
      if(isTemp){
        const grid = document.getElementById('wrkFormGrid');
        if(grid && !nidLab){
          const htmlN = '<label id="wrkNidTempLab">الرقم القومي<input class="input" id="wrkNidTemp" value="'+(document.getElementById('wrkNid')?escapeHtml(document.getElementById('wrkNid').value):'')+'"></label>';
          const htmlP = '<label id="wrkPhoneTempLab">الهاتف<input class="input" id="wrkPhoneTemp" value="'+(document.getElementById('wrkPhone')?escapeHtml(document.getElementById('wrkPhone').value):'')+'"></label>';
          const wageEl = document.querySelector('.wrk-temp-wage');
          if(wageEl){
            wageEl.insertAdjacentHTML('beforebegin', htmlN + htmlP);
          } else {
            grid.insertAdjacentHTML('beforeend', htmlN + htmlP);
          }
        } else {
          const a = document.getElementById('wrkNidTempLab'); if(a) a.style.display = '';
          const b = document.getElementById('wrkPhoneTempLab'); if(b) b.style.display = '';
        }
      } else {
        const a = document.getElementById('wrkNidTempLab'); if(a) a.style.display = 'none';
        const b = document.getElementById('wrkPhoneTempLab'); if(b) b.style.display = 'none';
      }
      const sal = document.getElementById('wrkSalary');
      if(sal){ const lab = sal.closest('label'); if(lab) lab.style.display = isTemp ? 'none' : ''; }
      const wage = document.getElementById('wrkWage');
      if(wage){ const lab = wage.closest('label'); if(lab) lab.style.display = isTemp ? 'none' : ''; }
      const hint = document.getElementById('wrkTypeHint');
      if(hint){
        hint.textContent = isTemp
          ? 'عامل مؤقت: الاسم · القومي · المشرف · الوظيفة · العنوان · الهاتف · اليومية'
          : 'عامل شركة: كل البيانات + راتب أساسي + يومية اختيارية';
      }
      // عنوان النافذة
      try{
        const h = document.querySelector('#appModal .modal-header h3, .modal-header h3');
        if(h && !isEdit) h.textContent = isTemp ? 'إضافة عامل مؤقت' : 'إضافة عامل جديد';
      }catch(_e){}
    }
    applyWorkerTypeUI();
    Promise.resolve().then(applyWorkerTypeUI); setTimeout(applyWorkerTypeUI, 120);   // بعد تطبيق «تعديلات مخصصة» اللي بتظهر كل الخانات

    try{ const _di=document.getElementById('wrkDept'); ['wrkPos','wrkPosTemp'].forEach(id=>{ const _pi=document.getElementById(id); if(_pi&&_di) _pi.addEventListener('input',()=>{ _di.value=_pi.value; }); }); const _isT=()=>(document.getElementById('wrkWorkerType')?.value||'')==='temporary'; if(_di && _isT()) _di.value=(document.getElementById('wrkPosTemp')?.value||''); }catch(_e){}
    if(typeof bindResignedStatusToggle==='function') bindResignedStatusToggle('wrkStatus','wrk');
    if(typeof bindAttachmentHandlers==='function') bindAttachmentHandlers(document.getElementById('appModal'));
    if(typeof bindAutoStatusDates==='function') bindAutoStatusDates(document.getElementById('appModal'));
    if(typeof bindExtraFieldsButton==='function') bindExtraFieldsButton('extraFields_workers');
    if(typeof bindEntityCombos==='function') bindEntityCombos(document.getElementById('appModal'));

    const saveBtn = document.getElementById('btnSaveWrk');
    if(!saveBtn){ showToast('زر الحفظ غير موجود'); return; }
    saveBtn.addEventListener('click', ()=>{
      try{
        const name = (document.getElementById('wrkName')?.value || '').trim();
        if(!name){ showToast('الاسم مطلوب'); return; }
        const workerType = document.getElementById('wrkWorkerType')?.value || 'company';
        const isTemp = workerType === 'temporary';
        const g = (id)=>{ const el=document.getElementById(id); return el ? el.value : ''; };
        let dailyWage = toInt(g('wrkWageTemp') || g('wrkWage') || 0);
        const payload = {
          code: (typeof ensureUniqueCode==='function'
            ? ensureUniqueCode(g('wrkCode') || (w && w.code) || '', DATA.workers || [], 'WRK-', w && w.id)
            : ((g('wrkCode') || '').trim() || (typeof nextWorkerCode==='function' ? nextWorkerCode() : 'WRK-001'))),
          name,
          workerType,
          type: isTemp ? 'temporary' : 'company',
          status: (g('wrkStatus') || (w && w.status) || 'active'),
          resignedAt: (typeof readResignedDateFromForm==='function'?readResignedDateFromForm('wrk', g('wrkStatus')||(w&&w.status)||'active'):'') || (w&&w.resignedAt)||'',
          supervisorId: (document.getElementById('wrkSupervisor')?.value) || '',
          nationalId: (isTemp ? (g('wrkNidTemp') || g('wrkNid')) : (g('wrkNid') || g('wrkNidTemp')) || '').trim(),
          phone: (isTemp ? (g('wrkPhoneTemp') || g('wrkPhone')) : (g('wrkPhone') || g('wrkPhoneTemp')) || '').trim(),
          address: (g('wrkAddress') || '').trim(),
          project: (g('wrkProject') || '').trim(),
          dailyWage
        };
        if(!isTemp){
          const hr = typeof collectPersonHrFields==='function' ? collectPersonHrFields('wrk', { showSalary:true, showWage:false, skillFromPos:true }) : {};
          Object.assign(payload, hr);
          if(hr.position) payload.skill = hr.position;
          payload.salary = (hr.salary!=null) ? hr.salary : toInt((w && (w.salary || w.basicSalary)) || 0);
          payload.dailyWage = toInt((w && w.dailyWage) || 0);
          payload.basicSalary = payload.salary;
          payload.notes = (g('wrkNotes') || '').trim();
          payload.extraFields = typeof collectExtraFieldsForSave==='function' ? collectExtraFieldsForSave('extraFields_workers') : [];
          payload.attachments = isEdit ? ((w && w.attachments) || []) : (typeof takeFormDraftAttachments==='function' ? takeFormDraftAttachments('worker', formAttId) : []);
          if(typeof syncDocStatusesFromDates==='function') syncDocStatusesFromDates(payload);
        } else {
          payload.insuranceStatus = (isEdit && w && w.insuranceStatus) ? w.insuranceStatus : 'none';
          { const jb = (g('wrkPosTemp')||'').trim(); if(jb){ payload.skill = jb; payload.position = jb; } }
          payload.notes = (g('wrkNotes') || '').trim();
          payload.attachments = isEdit ? ((w && w.attachments) || []) : (typeof takeFormDraftAttachments==='function' ? takeFormDraftAttachments('worker', formAttId) : []);
        }
        try{ personDeptOnSave('workers', w, payload); }catch(_e){}
        if(payload.project && typeof ensureProjectSaved==='function') ensureProjectSaved(payload.project);
        const commitWorker = ()=>{
          DATA.workers = DATA.workers || [];
          if(isEdit){
            if(typeof mergePersonRecord==='function') mergePersonRecord(w, payload);
            else Object.keys(payload).forEach(k=>{ if(payload[k] !== undefined) w[k] = payload[k]; });
            w.workerType = workerType;
            w.type = payload.type;
            w.dailyWage = payload.dailyWage;
            if(!isTemp){ w.salary = payload.salary; w.basicSalary = payload.salary; }
            if(typeof addAudit==='function') addAudit('تعديل عامل', w.name);
          } else {
            payload.id = typeof uid==='function' ? uid() : ('w_'+Date.now());
            DATA.workers.push(payload);
            if(typeof addAudit==='function') addAudit('إضافة عامل', payload.name);
          }
          try{
            const person = isEdit ? w : payload;
            if(person && typeof syncPersonResignedState==='function') syncPersonResignedState('worker', person);
          }catch(_e){}
          if(typeof saveData==='function') saveData();
          if(typeof closeModal==='function') closeModal();
          showToast(isEdit ? 'تم التعديل' : 'تمت الإضافة');
          if(typeof currentPage!=='undefined' && currentPage==='workers' && typeof rerenderCurrentPage==='function') rerenderCurrentPage();
          else if(typeof goToPage==='function') goToPage('workers');
          else if(typeof render==='function'){ try{ currentPage='workers'; render(); }catch(_e){} }
        };
        if(typeof guardEntityDuplicates==='function'){
          guardEntityDuplicates('worker', payload, isEdit && w ? w.id : null).then(ok=>{ if(ok) commitWorker(); });
        } else commitWorker();
      }catch(err){
        console.error(err);
        showToast('تعذر الحفظ: '+(err && err.message ? err.message : ''));
      }
    });
  }catch(err){
    console.error('openWorkerModal', err);
    if(typeof showToast==='function') showToast('تعذر فتح نموذج العامل: '+(err && err.message ? err.message : String(err)));
  }
}

(function(){
  if(typeof document==='undefined') return;
  if(document.documentElement.dataset.workerAddDelegated==='1') return;
  document.documentElement.dataset.workerAddDelegated = '1';
  document.addEventListener('click', function(e){
    const t = e.target && e.target.closest && e.target.closest('#btnAddWorker, #btnAddTempWorker, .btn-add-worker');
    if(!t || t.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    try{
      if(typeof openWorkerModal!=='function'){ if(typeof showToast==='function') showToast('نموذج العامل غير متاح'); return; }
      // من فلتر الصفحة إن وُجد — وإلا النموذج يفتح عادي ويختار المستخدم النوع داخله
      let def = '';
      if(t.id==='btnAddTempWorker'){ openWorkerModal(null, { defaultType:'temporary' }); return; }
      try{
        if(typeof workerFilters!=='undefined' && workerFilters && workerFilters.type){
          const ft = String(workerFilters.type).toLowerCase();
          if(/temporary|temp|daily|مؤقت/.test(ft)) def = 'temporary';
          else if(/company|permanent|شركة/.test(ft)) def = 'company';
        }
      }catch(_e){}
      openWorkerModal(null, def ? { defaultType: def } : {});
    }catch(err){
      console.error(err);
      if(typeof showToast==='function') showToast('تعذر فتح نموذج العامل');
    }
  });
})();
