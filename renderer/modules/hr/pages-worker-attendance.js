/* =========================================================
   اليوميات ومشرفون — جدول شهري + عدد أيام في اليومية
   ========================================================= */

function wattISO(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function wattMonthBounds(){
  const f = workerAttFilters || {};
  const now = new Date();
  const okD = v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
  let from = okD(f.dFrom) ? f.dFrom : wattISO(new Date(now.getFullYear(), now.getMonth(), 1));
  let to = okD(f.dTo) ? f.dTo : wattISO(new Date(now.getFullYear(), now.getMonth()+1, 0));
  if(to < from){ const t=from; from=to; to=t; }
  const MAXD = 62;
  const d0 = new Date(from+'T00:00:00');
  let d1 = new Date(to+'T00:00:00');
  let count = Math.round((d1-d0)/86400000)+1;
  if(count>MAXD){ count=MAXD; d1=new Date(d0.getTime()+(MAXD-1)*86400000); to=wattISO(d1); }
  const dates = Array.from({length:count}, (_,i)=>wattISO(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate()+i)));
  return { y:d0.getFullYear(), m:d0.getMonth()+1, last:count, from, to, dates };
}
function wattDayHead(date, i, dates){
  const d = Number(date.slice(8,10));
  const first = i===0 || d===1;
  return first ? `${d}<div style="font-size:9px;color:var(--ink-soft);font-weight:400;">${date.slice(5,7)}</div>` : String(d);
}

function wattProjectOptionsHtml(selected){
  const set = new Set();
  (DATA.projects||[]).forEach(p=>{ if(p&&(p.name||p.title)) set.add(String(p.name||p.title).trim()); });
  const list = Array.from(set).filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar'));
  const sel = String(selected||'').trim();
  return list.map(p=>`<option value="${escapeHtml(p)}" ${p===sel?'selected':''}>${escapeHtml(p)}</option>`).join('');
}

function wattSiteOptionsHtml(selected){
  const set = new Set();
  (DATA.workerAttendance||[]).forEach(a=>{ if(a&&a.site) set.add(String(a.site).trim()); });
  const sel = String(selected||'').trim();
  return Array.from(set).filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar')).map(p=>`<option value="${escapeHtml(p)}" ${p===sel?'selected':''}>${escapeHtml(p)}</option>`).join('');
}
function wattPeopleList(){
  const f = workerAttFilters || {};
  const tab = f.dailiesTab || '';
  // الفلاتر خاصة بالقسم الحالي
  let type = f.personType || '';
  if(tab==='workers') type = 'worker';
  else if(tab==='supervisors') type = 'supervisor';
  else if(tab==='drivers') type = 'driver';
  else if(tab==='equipment') type = 'equipment';
  const proj = String(f.project||'').trim();
  let from = '', to = '';
  try{ const b = wattMonthBounds(); from = b.from; to = b.to; }catch(_e){}
  function hasProjectLink(kind, id){
    if(!proj) return true;
    const onPerson = (kind==='worker' && (DATA.workers||[]).some(w=>w.id===id && String(w.project||'').trim()===proj))
      || (kind==='supervisor' && (DATA.supervisors||[]).some(s=>s.id===id && String(s.project||'').trim()===proj))
      || (kind==='driver' && (DATA.drivers||[]).some(d=>d.id===id && String(d.project||'').trim()===proj));
    if(onPerson) return true;
    return (DATA.workerAttendance||[]).some(a=>{
      if(String(a.project||'').trim()!==proj) return false;
      if(from && (a.date||'')<from) return false;
      if(to && (a.date||'')>to) return false;
      if(kind==='worker') return (a.personType==='worker'||!a.personType) && (a.workerId===id||a.personId===id);
      if(kind==='supervisor') return a.personType==='supervisor' && a.personId===id;
      if(kind==='driver') return a.personType==='driver' && a.personId===id;
      return false;
    });
  }
  const siteF = String(f.site||'').trim();
  const hasSite = (kind, id)=> !siteF || (DATA.workerAttendance||[]).some(a=>{
    if(String(a.site||'').trim()!==siteF) return false;
    if(from && (a.date||'')<from) return false; if(to && (a.date||'')>to) return false;
    if(kind==='worker') return (a.personType==='worker'||!a.personType) && (a.workerId===id||a.personId===id);
    return a.personType===kind && a.personId===id;
  });
  let people = [];
  if(!type || type==='worker'){
    let workers = (DATA.workers||[]).filter(w=>w.status==='active'||!w.status);
    if(f.supervisorId) workers = workers.filter(w=>String(w.supervisorId||'')===String(f.supervisorId));
    if(f.q){
      const q=f.q.trim().toLowerCase();
      workers = workers.filter(w=>smartMatch(w.name, q)||smartMatch(w.code, q)||smartMatch(w.project,q));
    }
    if(proj) workers = workers.filter(w=>hasProjectLink('worker', w.id));
    if(siteF) workers = workers.filter(w=>hasSite('worker', w.id));
    workers = sortByNameAr(workers, w=>w.name);
    workers.forEach(w=> people.push({ kind:'worker', id:w.id, name:w.name, code:w.code, extra:supervisorName(w.supervisorId) }));
  }
  if(!type || type==='supervisor'){
    let sups = (DATA.supervisors||[]).filter(s=>s.status!=='inactive');
    if(f.q){
      const q=f.q.trim().toLowerCase();
      sups = sups.filter(s=>smartMatch(s.name, q)||smartMatch(s.code, q)||smartMatch(s.project,q));
    }
    if(f.supervisorId) sups = sups.filter(s=>String(s.id)===String(f.supervisorId));
    if(proj) sups = sups.filter(s=>hasProjectLink('supervisor', s.id));
    if(siteF) sups = sups.filter(s=>hasSite('supervisor', s.id));
    sortByNameAr(sups, s=>s.name).forEach(s=> people.push({ kind:'supervisor', id:s.id, name:s.name, code:s.code, extra:'مشرف' }));
  }
  if(!type || type==='driver'){
    let drvs = (DATA.drivers||[]).filter(d=>d.status!=='inactive');
    if(f.q){
      const q=f.q.trim().toLowerCase();
      drvs = drvs.filter(d=>smartMatch(d.name, q)||smartMatch(d.code, q)||smartMatch(d.project,q));
    }
    if(proj) drvs = drvs.filter(d=>hasProjectLink('driver', d.id));
    if(siteF) drvs = drvs.filter(d=>hasSite('driver', d.id));
    sortByNameAr(drvs, d=>d.name).forEach(d=> people.push({ kind:'driver', id:d.id, name:d.name, code:d.code, extra:'سائق' }));
  }
  return people;
}

/** قائمة السنوات المتاحة للاختيار: من أقدم سنة بها بيانات (أو 2020) حتى +10 سنوات، الأحدث أولاً */
function wattYearList(current){
  const now = new Date().getFullYear();
  let lo = Math.min(2020, current||now), hi = Math.max(now, current||now) + 10;
  (DATA.workerAttendance||[]).forEach(a=>{ const yy = parseInt(String(a.date||'').slice(0,4),10); if(yy && yy<lo) lo = yy; if(yy && yy>hi) hi = yy; });
  (DATA.equipmentDaily||[]).forEach(a=>{ const yy = parseInt(String(a.date||'').slice(0,4),10); if(yy && yy<lo) lo = yy; if(yy && yy>hi) hi = yy; });
  const out = []; for(let yy=hi; yy>=lo; yy--) out.push(yy);
  return out;
}
function wattRecordsForPerson(kind, id, from, to){
  const proj = String((workerAttFilters&&workerAttFilters.project)||'').trim();
  return (DATA.workerAttendance||[]).filter(a=>{
    if((a.date||'') < from || (a.date||'') > to) return false;
    if(proj && String(a.project||'').trim() !== proj) return false;
    { const sf = String((workerAttFilters&&workerAttFilters.site)||'').trim(); if(sf && String(a.site||'').trim() !== sf) return false; }
    const stF = String((workerAttFilters&&workerAttFilters.status)||'');
    if(stF && String(a.status||'').toLowerCase() !== stF.toLowerCase()) return false;
    if(kind==='worker') return (a.personType==='worker'||!a.personType) && (a.workerId===id || a.personId===id);
    if(kind==='supervisor') return a.personType==='supervisor' && a.personId===id;
    if(kind==='driver') return a.personType==='driver' && a.personId===id;
    return false;
  });
}


const DAILIES_KIND_BOARDS = [
  { id:'workers', label:'العمال', icon:'🧑‍🔧', entityKind:'worker' },
  { id:'supervisors', label:'المشرفون', icon:'👷', entityKind:'supervisor' },
  { id:'drivers', label:'السائقون', icon:'🧑‍🚒', entityKind:'driver' },
  { id:'equipment', label:'المعدات والمركبات', icon:'🛻', entityKind:'equipment' }
];

function dailiesListForKind(tabId){
  if(tabId==='workers') return (DATA.workers||[]).slice();
  if(tabId==='supervisors') return (DATA.supervisors||[]).slice();
  if(tabId==='drivers') return (DATA.drivers||[]).slice();
  if(tabId==='equipment') return (DATA.equipment||[]).filter(e=>e.status!=='sold'&&e.status!=='scrapped'&&e.status!=='retired');
  return [];
}

function renderDailiesKindBoards(){
  return `<div class="board-grid exp-kind-boards">
    ${DAILIES_KIND_BOARDS.map(t=>{
      const list = dailiesListForKind(t.id);
      const deps = typeof departmentsForKind==='function' ? departmentsForKind(t.entityKind) : [];
      return `<button type="button" class="board-card dailies-kind-board" data-dailies-tab="${t.id}">
        <div class="board-card-icon">${t.icon}</div>
        <div class="board-card-title">${escapeHtml(t.label)}</div>
        <div class="board-card-meta"><span>${list.length} سجل</span><span>${deps.length} قسم</span></div>
      </button>`;
    }).join('')}
  </div>`;
}

function renderDailiesDeptBoards(tabId){
  const b = DAILIES_KIND_BOARDS.find(x=>x.id===tabId)||{};
  const list = dailiesListForKind(tabId);
  const _deps0 = typeof departmentsForKind==='function' ? departmentsForKind(b.entityKind||'') : [];
  const _fx = d=>/^__(resigned|retired)_/.test(d.id||'');
  const deps = _deps0.filter(d=>!_fx(d)); // بدون المستقيلين والمعاشات في اليوميات
  const noneCnt = list.filter(p=>!((p.departmentId||p.categoryId)||'').toString().trim()).length;
  const cards = [];
  cards.push(`<button type="button" class="board-card dailies-dept-board" data-dailies-dept="">
    <div class="board-card-icon">📂</div><div class="board-card-title">الكل</div>
    <div class="board-card-meta"><span>${list.length} سجل</span></div></button>`);
  deps.forEach(d=>{
    const cnt = list.filter(p=>String(p.departmentId||p.categoryId||'')===String(d.id)).length;
    cards.push(`<button type="button" class="board-card dailies-dept-board" data-dailies-dept="${escapeHtml(d.id)}">
      <div class="board-card-icon">📁</div><div class="board-card-title">${escapeHtml((tabId==='workers' && d.dailiesName) || d.name||'')}</div>
      <div class="board-card-meta"><span>${cnt} سجل</span></div></button>`);
  });
  return `
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>
        <button type="button" class="btn btn-outline btn-sm" id="btnDailiesBackKinds">← كل اليوميات</button>
        <h2 class="page-title" style="margin:10px 0 0;">${escapeHtml(b.label||'')}</h2>
        <p class="page-sub" style="margin:4px 0 0;">أقسام مرتبطة بصفحة ${escapeHtml(b.label||'')} — اضغط لوحة للعرض</p>
      </div>
    </div>
    <div class="board-grid exp-sec-boards">${cards.join('')}</div>`;
}

function renderWorkerAttendancePage(){
  const tab = workerAttFilters.dailiesTab || '';
  const dept = workerAttFilters.dailiesDept; // undefined | '' | __none__ | id

  // لوحات الأنواع
  if(!tab){
    return `<div class="page">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <h2 class="page-title" style="margin:0;">اليوميات</h2>
          <p class="page-sub" style="margin:4px 0 0;">اختر فئة — الأقسام مرتبطة بصفحات الناس والمعدات</p>
        </div>
        <div class="btn-row">${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}</div>
      </div>
      ${renderDailiesKindBoards()}
    </div>`;
  }

  // لوحات الأقسام
  if(dept === undefined || dept === null){
    return `<div class="page">${renderDailiesDeptBoards(tab)}</div>`;
  }

  if(!workerAttFilters.year) workerAttFilters.year = new Date().getFullYear();
  if(!workerAttFilters.month) workerAttFilters.month = new Date().getMonth()+1;
  const { y, m, last, from, to, dates } = wattMonthBounds();
  let people = wattPeopleList().filter(p=>{
    if(tab==='workers') return p.kind==='worker';
    if(tab==='supervisors') return p.kind==='supervisor';
    if(tab==='drivers') return p.kind==='driver';
    if(tab==='equipment') return false; // المعدات لها جدول منفصل
    return true;
  });
  // تصفية بالقسم
  if(typeof filterByDeptFilter==='function' && dept !== undefined && dept !== null){
    const ids = new Set(filterByDeptFilter(
      tab==='workers' ? (DATA.workers||[]) :
      tab==='supervisors' ? (DATA.supervisors||[]) :
      tab==='drivers' ? (DATA.drivers||[]) : [],
      dept
    ).map(x=>x.id));
    people = people.filter(p=>ids.has(p.id));
  }
  try{
    if(typeof setPageExport==='function'){
      const expRows = [];
      people.forEach(p=>{
        wattRecordsForPerson(p.kind, p.id, from, to).forEach(a=>{
          const kindLab = p.kind==='supervisor'?'مشرف':p.kind==='driver'?'سائق':'عامل';
          expRows.push([a.date, kindLab, p.name, labelOf(ATTENDANCE_STATUS,a.status)||a.status, fmtAttendanceDays(a), a.dayWage||a.dailyWage, a.deduction||0, a.project||'']);
        });
      });
      expRows.sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
      setPageExport('dailies_'+y+'_'+String(m).padStart(2,'0'),
        ['التاريخ','النوع','الاسم','الحالة','أيام','اليومية','خصم','المشروع'],
        expRows);
    }
  }catch(_e){}
  const days = dates;
  const pgPeople = paginateRows(people, 'wattPeople');

  // map date -> records for quick lookup
  function cellRecs(kind, id, date){
    return wattRecordsForPerson(kind, id, date, date);
  }
  function cellRec(kind, id, date){
    const list = wattRecordsForPerson(kind, id, date, date);
    return list[0] || null; // أول سجل في اليوم
  }

  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <button type="button" class="btn btn-outline btn-sm" id="btnDailiesBackDepts">← الأقسام</button>
          <h2 class="page-title" style="margin:10px 0 0;">اليوميات — ${escapeHtml((DAILIES_KIND_BOARDS.find(x=>x.id===tab)||{}).label||tab)}</h2>
          <p class="page-sub" style="margin:4px 0 0;">جدول شهري — علامة ✓ تحت اليوم · اضغط للتعديل</p>
        </div>
        <div class="btn-row page-header-actions" style="display:flex;flex-wrap:nowrap;gap:8px;align-items:center;">
          ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():''}
          <button class="btn btn-primary" id="btnAddWatt" ${readOnlyMode?'disabled':''}>+ تسجيل يومية</button>
        </div>
      </div>

      ${tab==='equipment' ? '' : (function(){
        let dSum = 0, pay = 0, multi = 0;
        people.forEach(p=>{
          const recs = wattRecordsForPerson(p.kind, p.id, from, to);
          const per = p.kind==='supervisor'?getSupervisor(p.id):p.kind==='driver'&&typeof getDriver==='function'?getDriver(p.id):getWorker(p.id);
          recs.forEach(a=>{ dSum += attendanceDaysCredit(a); pay += (typeof attendanceNetPay==='function'?attendanceNetPay(a, per):0); });
          const byDate = {}; recs.forEach(a=>{ (byDate[a.date]=byDate[a.date]||[]).push(a); }); Object.keys(byDate).forEach(k=>{ const g=byDate[k]; if(g.length>1){ g.slice(1).forEach(a=>{ multi += attendanceDaysCredit(a); }); } });
        });
        const kl = tab==='supervisors'?'المشرفين':tab==='drivers'?'السائقين':'العمال';
        return statCardsHtml([
          {ico:'👥',label:'عدد '+kl,value:fmtNum(people.length)},
          {ico:'📅',label:'أيام العمل في الشهر',value:fmtDays(Math.round(dSum*100)/100),tone:'ok'},
          {ico:'💰',label:'مستحق الشهر',value:fmtMoney(toInt(pay))},
          {ico:'⚑',label:'أيام في أكثر من مشروع',value:fmtDays(Math.round(multi*100)/100),tone:multi?'warn':''}]);
      })()}
      <div class="dly-filters">
        <label class="dly-f"><span>من</span><input type="date" id="wattFrom" class="input" value="${from}"></label>
        <label class="dly-f"><span>إلى</span><input type="date" id="wattTo" class="input" value="${to}"></label>
        ${tab==='workers' ? `<label class="dly-f"><span>المشرف</span>${typeof entityComboHtml==='function'?entityComboHtml('wattFilterSup','supervisor',workerAttFilters.supervisorId||'','كل المشرفين...'):`<select id="wattFilterSup" class="input">${supervisorOptions(workerAttFilters.supervisorId||'','— كل المشرفين —')}</select>`}</label>` : '<input type="hidden" id="wattFilterSup" value="">'}
        <label class="dly-f"><span>المشروع</span>
          <select id="wattFilterProject" class="input"><option value="">كل المشاريع</option>${(typeof wattProjectOptionsHtml==='function'?wattProjectOptionsHtml(workerAttFilters.project||''):'')}</select>
        </label>
        <label class="dly-f"><span>الموقع</span>
          <select id="wattFilterSite" class="input"><option value="">كل المواقع</option>${(typeof wattSiteOptionsHtml==='function'?wattSiteOptionsHtml(workerAttFilters.site||''):'')}</select>
        </label>
        ${tab==='equipment' ? '' : `<label class="dly-f"><span>الحالة</span>
          <select id="wattFilterStatus" class="input"><option value="">كل الحالات</option>${(typeof ATTENDANCE_STATUS!=='undefined'?ATTENDANCE_STATUS:[]).map(o=>`<option value="${escapeHtml(o.code||o.id||'')}" ${String(workerAttFilters.status||'')===String(o.code||o.id||'')?'selected':''}>${escapeHtml(o.label||o.name||'')}</option>`).join('')}</select>
        </label>`}
        <label class="dly-f"><span>بحث</span>
          <input type="search" id="wattSearch" class="input" placeholder="${tab==='equipment'?'اسم أو كود المعدة...':tab==='supervisors'?'اسم أو كود المشرف...':tab==='drivers'?'اسم أو كود السائق...':'اسم أو كود العامل...'}" value="${escapeHtml(workerAttFilters.q||'')}">
        </label>
        <div class="dly-f"><span>&nbsp;</span><button type="button" class="btn btn-outline dly-clear" id="wattClearFilters">مسح الفلاتر</button></div>
      </div>

      <div class="btn-row" style="margin-bottom:12px;flex-wrap:wrap;">

      </div>

      ${tab==='equipment' ? renderEquipmentDailyEmbed() : `
      <div class="table-wrap" style="overflow:auto;max-width:100%;">
        <table class="data-table watt-grid" style="min-width:${120+last*36}px;font-size:12px;">
          <thead>
            <tr>
              <th style="position:sticky;right:0;background:var(--paper);z-index:2;min-width:140px;">الاسم</th>
              <th style="min-width:50px;">النوع</th>
              ${days.map((d,i)=>`<th style="text-align:center;padding:4px;min-width:28px;">${wattDayHead(d,i,days)}</th>`).join('')}
              <th>أيام</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${pgPeople.pageRows.length? pgPeople.pageRows.map(p=>{
              const recs = wattRecordsForPerson(p.kind, p.id, from, to);
              const totalDays = Math.round(recs.reduce((s,a)=>s+attendanceDaysCredit(a),0)*100)/100;
              const kindLabel = p.kind==='supervisor'?'مشرف':p.kind==='driver'?'سائق':'عامل';
              return `<tr>
                <td style="position:sticky;right:0;background:var(--paper);z-index:1;"><strong>${escapeHtml(p.name||'')}</strong><div style="font-size:11px;color:var(--ink-soft);">${escapeHtml(p.code||'')}</div></td>
                <td>${kindLabel}</td>
                ${days.map(d=>{
                  const rec = cellRec(p.kind, p.id, d);
                  if(!rec){
                    return `<td style="text-align:center;padding:2px;">
                      <button type="button" class="watt-cell empty" data-kind="${p.kind}" data-id="${p.id}" data-day="${d.slice(8,10)}" data-date="${d}" title="تسجيل حضور" ${readOnlyMode?'disabled':''} style="border:none;background:transparent;cursor:pointer;width:100%;min-height:28px;color:var(--ink-soft);">·</button>
                    </td>`;
                  }
                  const st = String(rec.status||'').toLowerCase();
                  const credit = attendanceDaysCredit(rec);
                  let mark = '✓', color = 'var(--ok,#2d6a4f)', title = 'حاضر';
                  if(st==='half'){ mark = '½'; color='#b45309'; title='نصف يوم'; }
                  else if(st==='late'){ mark = '✓'; color='#b45309'; title='متأخر'; }
                  else if(st==='absent'){ mark = '✗'; color='var(--debt,#c1121f)'; title='غائب'; }
                  else if(st==='holiday'){ mark = 'ع'; color='#6c757d'; title='إجازة'; }
                  if(credit>1) mark = credit; // 2 أو 3 أيام
                  const dayRecs = cellRecs(p.kind, p.id, d);
                  const multi = dayRecs.length>1;
                  let ttl = title+' — '+credit+' يوم'+(String(rec.project||'').trim()?' — '+rec.project:'')+' — اضغط للتعديل';
                  if(multi){
                    const tot = Math.round(dayRecs.reduce((x,a)=>x+attendanceDaysCredit(a),0)*100)/100;
                    mark = fmtDays(tot)+'⚑'; color='#b45309';
                    ttl = 'في '+dayRecs.length+' مواقع: '+dayRecs.map(a=>(String(a.project||'').trim()||'غير محدد')+' ('+fmtDays(attendanceDaysCredit(a))+')').join(' + ');
                  }
                  return `<td style="text-align:center;padding:2px;${multi?'background:#fff7e6;':''}">
                    <button type="button" class="watt-cell filled" data-att="${rec.id}" data-multi="${multi?1:0}" data-kind="${p.kind}" data-id="${p.id}" data-day="${d.slice(8,10)}" data-date="${d}" title="${escapeHtml(ttl)}" style="border:none;background:transparent;cursor:pointer;font-weight:800;color:${color};width:100%;min-height:28px;">${mark}</button>
                  </td>`;
                }).join('')}
                <td><strong>${fmtDays(totalDays)}</strong></td>
                <td style="white-space:nowrap;">
                  <button class="btn btn-outline btn-sm btn-add-watt-person" data-kind="${p.kind}" data-id="${p.id}" ${readOnlyMode?'disabled':''}>+</button>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="${last+4}" style="text-align:center;color:var(--ink-soft);padding:28px;">لا أشخاص للعرض — غيّر الفلتر أو أضف عمالاً/سائقين/مشرفين</td></tr>`}
          </tbody>
        </table>
      </div>

      ${tablePagerHtml('wattPeople', pgPeople)}

      ${workerAttFilters.listView ? renderWattRecordsList(from, to) : ''}
      `}
    </div>`;
}

function renderWattRecordsList(from, to){
  const tab = (workerAttFilters&&workerAttFilters.dailiesTab)||'';
  const proj = String((workerAttFilters&&workerAttFilters.project)||'').trim();
  let list = (DATA.workerAttendance||[]).filter(a=>{
    if((a.date||'')<from || (a.date||'')>to) return false;
    if(proj && String(a.project||'').trim()!==proj) return false;
    { const sf = String((workerAttFilters&&workerAttFilters.site)||'').trim(); if(sf && String(a.site||'').trim()!==sf) return false; }
    if(tab==='workers' && a.personType && a.personType!=='worker') return false;
    if(tab==='supervisors' && a.personType!=='supervisor') return false;
    if(tab==='drivers' && a.personType!=='driver') return false;
    return true;
  });
  list.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const pg = paginateRows(list, 'workerAttendance');
  return `
    <div class="section-title" style="margin-top:20px;">سجلات الفترة (تعديل / حذف)</div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>التاريخ</th><th>الاسم</th><th>النوع</th><th>الحالة</th><th>عدد الأيام</th><th>اليومية</th><th>المستحق</th><th>المشروع</th><th>الموقع</th><th></th></tr></thead>
      <tbody>
        ${pg.pageRows.length? pg.pageRows.map(a=>{
          let nm='', kind='عامل';
          if(a.personType==='supervisor'){ nm=supervisorName(a.personId); kind='مشرف'; }
          else if(a.personType==='driver'){ nm=driverName(a.personId); kind='سائق'; }
          else nm=workerName(a.workerId||a.personId);
          const person = a.personType==='supervisor'?getSupervisor(a.personId):a.personType==='driver'?getDriver(a.personId):getWorker(a.workerId||a.personId);
          const pay = attendanceNetPay(a, person);
          return `<tr>
            <td>${fmtDate(a.date)}</td>
            <td>${escapeHtml(nm)}</td>
            <td>${kind}</td>
            <td>${escapeHtml(labelOf(ATTENDANCE_STATUS,a.status))}</td>
            <td>${fmtAttendanceDays(a)}</td>
            <td>${fmtMoney(a.dayWage)}</td>
            <td><strong>${fmtMoney(pay)}</strong></td>
            <td>${escapeHtml(a.project||'—')}</td>
            <td>${escapeHtml(a.site||'—')}</td>
            <td style="white-space:nowrap;">
              <button class="btn btn-outline btn-sm btn-edit-watt" data-id="${a.id}">تعديل</button>
              <button class="btn btn-outline btn-sm btn-del-watt" data-id="${a.id}" ${readOnlyMode?'disabled':''}>حذف</button>
            </td>
          </tr>`;
        }).join('') : '<tr><td colspan="10" style="text-align:center;color:var(--ink-soft);">لا سجلات</td></tr>'}
      </tbody>
    </table></div>
    ${tablePagerHtml('workerAttendance', pg)}`;
}

function initWorkerAttendanceEvents(){
  if(typeof bindEntityCombos==='function') bindEntityCombos(document);

  const applyFilters = ()=>{
    workerAttFilters.dFrom = document.getElementById('wattFrom')?.value||'';
    workerAttFilters.dTo = document.getElementById('wattTo')?.value||'';
    // النوع يُفرض من القسم الحالي
    const tabNow = workerAttFilters.dailiesTab||'';
    if(tabNow==='workers') workerAttFilters.personType = 'worker';
    else if(tabNow==='supervisors') workerAttFilters.personType = 'supervisor';
    else if(tabNow==='drivers') workerAttFilters.personType = 'driver';
    else if(tabNow==='equipment') workerAttFilters.personType = 'equipment';
    else workerAttFilters.personType = document.getElementById('wattPersonType')?.value||'';
    workerAttFilters.supervisorId = document.getElementById('wattFilterSup')?.value||'';
    workerAttFilters.project = document.getElementById('wattFilterProject')?.value||'';
    workerAttFilters.site = document.getElementById('wattFilterSite')?.value||'';
    workerAttFilters.q = document.getElementById('wattSearch')?.value||'';
    workerAttFilters.status = document.getElementById('wattFilterStatus')?.value||'';
    try{ resetTablePage('wattPeople'); resetTablePage('wattEquip'); }catch(e){}
    rerenderCurrentPage();
  };
  document.getElementById('wattClearFilters')?.addEventListener('click', ()=>{
    workerAttFilters.supervisorId=''; workerAttFilters.project=''; workerAttFilters.site=''; workerAttFilters.q=''; workerAttFilters.status=''; workerAttFilters.dFrom=''; workerAttFilters.dTo='';
    try{ resetTablePage('wattPeople'); resetTablePage('wattEquip'); }catch(e){}
    rerenderCurrentPage();
  });
  ['wattFrom','wattTo','wattPersonType','wattFilterSup','wattFilterProject','wattFilterSite','wattFilterStatus'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('change', applyFilters);
  });
  const search=document.getElementById('wattSearch');
  if(search) search.addEventListener('input', ()=>{ workerAttFilters.q=search.value; try{ resetTablePage('wattPeople'); resetTablePage('wattEquip'); }catch(e){} rerenderCurrentPage(); });

  document.getElementById('btnAddWatt')?.addEventListener('click', ()=>{
    if((workerAttFilters&&workerAttFilters.dailiesTab)==='equipment'){
      if(typeof openEquipmentDailyModal==='function') openEquipmentDailyModal();
      else openWorkerAttModal(null, null, { kind:'equipment' });
      return;
    }
    openWorkerAttModal();
  });
    document.querySelectorAll('.dailies-kind-board').forEach(b=> b.addEventListener('click', ()=>{
    workerAttFilters.dailiesTab = b.getAttribute('data-dailies-tab')||'';
    const t = workerAttFilters.dailiesTab;
    workerAttFilters.personType = t==='workers'?'worker':t==='supervisors'?'supervisor':t==='drivers'?'driver':t==='equipment'?'equipment':'';
    workerAttFilters.supervisorId = '';
    // الإبقاء على فلتر المشروع والبحث إن وُجد
    workerAttFilters.dailiesDept = undefined;
    rerenderCurrentPage();
  }));
  document.querySelectorAll('.dailies-dept-board').forEach(b=> b.addEventListener('click', ()=>{
    workerAttFilters.dailiesDept = b.getAttribute('data-dailies-dept')||'';
    rerenderCurrentPage();
  }));
  document.getElementById('btnDailiesBackKinds')?.addEventListener('click', ()=>{
    workerAttFilters.dailiesTab = '';
    workerAttFilters.dailiesDept = undefined;
    rerenderCurrentPage();
  });
  document.getElementById('btnDailiesBackDepts')?.addEventListener('click', ()=>{
    workerAttFilters.dailiesDept = undefined;
    rerenderCurrentPage();
  });
  document.getElementById('btnWattListView')?.addEventListener('click', ()=>{
    workerAttFilters.listView = !workerAttFilters.listView;
    rerenderCurrentPage();
  });

  document.querySelectorAll('.watt-cell.empty').forEach(b=>{
    b.addEventListener('click', ()=>{
      if(readOnlyMode) return;
      const kind=b.getAttribute('data-kind');
      const id=b.getAttribute('data-id');
      const date=b.getAttribute('data-date');
      openWorkerAttModal(null, null, { kind, id, date });
    });
  });
  document.querySelectorAll('.watt-cell.filled').forEach(b=>{
    b.addEventListener('click', ()=>{
      const attId=b.getAttribute('data-att');
      if(b.getAttribute('data-multi')==='1'){
        const date=b.getAttribute('data-date');
        openWattDaySitesModal(b.getAttribute('data-kind'), b.getAttribute('data-id'), date);
        return;
      }
      openWorkerAttModal(null, attId);
    });
  });
  document.querySelectorAll('.btn-add-watt-person').forEach(b=>{
    b.addEventListener('click', ()=>{
      openWorkerAttModal(null, null, { kind:b.getAttribute('data-kind'), id:b.getAttribute('data-id') });
    });
  });
  document.querySelectorAll('.btn-edit-watt').forEach(b=>b.addEventListener('click',()=>openWorkerAttModal(null,b.getAttribute('data-id'))));
  document.querySelectorAll('.eqd-cell.empty').forEach(b=> b.addEventListener('click', ()=>{
    const date=b.getAttribute('data-date');
    if(typeof openEquipmentDailyModal==='function') openEquipmentDailyModal(b.getAttribute('data-eq'), null, date);
  }));
  document.querySelectorAll('.eqd-cell.filled').forEach(b=> b.addEventListener('click', ()=>{
    if(typeof openEquipmentDailyModal==='function') openEquipmentDailyModal(null, b.getAttribute('data-id'));
  }));
  document.querySelectorAll('.btn-eqd-add').forEach(b=> b.addEventListener('click', ()=>{
    if(typeof openEquipmentDailyModal==='function') openEquipmentDailyModal(b.getAttribute('data-eq'));
  }));
  document.querySelectorAll('.btn-del-watt').forEach(b=>b.addEventListener('click',()=>{
    confirmDelete().then(ok=>{ if(!ok) return;
      DATA.workerAttendance=(DATA.workerAttendance||[]).filter(a=>a.id!==b.getAttribute('data-id'));
      saveData(true); showToast('تم الحذف'); rerenderCurrentPage();
    });
  }));
}

/** قائمة مواقع اليوم الواحد لشخص مسجّل في أكثر من موقع */
function openWattDaySitesModal(kind, id, date){
  const recs = (DATA.workerAttendance||[]).filter(a=>{
    if(!a || a.date!==date) return false;
    const pt = a.personType||'worker';
    return pt===kind && (kind==='worker' ? (a.workerId===id||a.personId===id) : a.personId===id);
  });
  const nm = (kind==='supervisor'?getSupervisor(id):kind==='driver'&&typeof getDriver==='function'?getDriver(id):getWorker(id))||{};
  const totDays = Math.round(recs.reduce((x,a)=>x+attendanceDaysCredit(a),0)*100)/100;
  const pay = a=> typeof attendanceNetPay==='function' ? attendanceNetPay(a, nm) : 0;
  const totPay = recs.reduce((x,a)=>x+pay(a),0);
  const stBadge = a=>{ const st=String(a.status||'').toLowerCase(); const cls = st==='absent'?'err':(st==='half'||st==='late')?'warn':'ok'; return `<span class="badge badge-${cls}">${escapeHtml(labelOf(ATTENDANCE_STATUS,a.status)||a.status||'')}</span>`; };
  openModal(`<div class="modal-header"><h3>يوميات ${escapeHtml(nm.name||'')} — ${fmtDate(date)}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <p class="wsite-note">يمكن تسجيل أكثر من موقع في نفس اليوم؛ اختر سجلاً للتعديل أو أضف موقعاً جديداً.</p>
      <div class="wsite-chips">
        <span class="wsite-chip">📍 عدد المواقع <b>${recs.length}</b></span>
        <span class="wsite-chip">📅 إجمالي الأيام <b>${fmtDays(totDays)}</b></span>
        <span class="wsite-chip">💰 إجمالي المستحق <b>${fmtMoney(toInt(totPay))}</b></span>
      </div>
      <div class="table-wrap"><table class="data-table wsite-table"><thead><tr><th>م</th><th>الموقع / المشروع</th><th>الحالة</th><th>أيام</th><th>اليومية</th><th>المستحق</th><th></th></tr></thead><tbody>
      ${recs.map((a,i)=>`<tr><td>${i+1}</td><td><strong>${escapeHtml(String(a.project||'').trim()||'غير محدد')}</strong>${a.notes?`<div class="wsite-sub">${escapeHtml(a.notes)}</div>`:''}</td><td>${stBadge(a)}</td><td>${fmtDays(attendanceDaysCredit(a))}</td><td>${fmtMoney(typeof attendanceDayWage==='function'?attendanceDayWage(a,nm):toInt(a.dayWage))}</td><td><strong>${fmtMoney(pay(a))}</strong></td>
        <td style="white-space:nowrap;"><button class="btn btn-outline btn-sm btn-wsite-edit" data-id="${a.id}">تعديل</button> <button class="btn btn-outline btn-sm btn-wsite-del" data-id="${a.id}" ${readOnlyMode?'disabled':''}>حذف</button></td></tr>`).join('')}
      </tbody><tfoot><tr><th colspan="3">الإجمالي</th><th>${fmtDays(totDays)}</th><th></th><th>${fmtMoney(toInt(totPay))}</th><th></th></tr></tfoot></table></div>
    </div>
    <div class="modal-footer"><button class="btn btn-primary" id="btnWsiteAdd" ${readOnlyMode?'disabled':''}>+ موقع آخر لنفس اليوم</button><button class="btn btn-outline" onclick="closeModal()">إغلاق</button></div>`);
  document.querySelectorAll('.btn-wsite-edit').forEach(b=>b.addEventListener('click',()=>{ closeModal(); setTimeout(()=>openWorkerAttModal(null,b.getAttribute('data-id')),50); }));
  document.querySelectorAll('.btn-wsite-del').forEach(b=>b.addEventListener('click',()=>{
    confirmDelete().then(ok=>{ if(!ok) return;
      DATA.workerAttendance=(DATA.workerAttendance||[]).filter(a=>a.id!==b.getAttribute('data-id'));
      saveData(true); showToast('تم الحذف'); closeModal(); rerenderCurrentPage();
      if((DATA.workerAttendance||[]).some(a=>a.date===date && (a.personType||'worker')===kind && (kind==='worker'?(a.workerId===id||a.personId===id):a.personId===id))) setTimeout(()=>openWattDaySitesModal(kind,id,date),80);
    });
  }));
  document.getElementById('btnWsiteAdd')?.addEventListener('click',()=>{ closeModal(); setTimeout(()=>openWorkerAttModal(null,null,{kind,id,date}),50); });
}

function openWorkerAttModal(workerId, editId, preset){
  const existing = editId ? (DATA.workerAttendance||[]).find(x=>x.id===editId) : null;
  let personType0 = 'worker';
  let personId0 = workerId || '';
  let date0 = todayISO();
  if(existing){
    if(existing.personType==='supervisor'){ personType0='supervisor'; personId0=existing.personId||''; }
    else if(existing.personType==='driver'){ personType0='driver'; personId0=existing.personId||''; }
    else { personType0='worker'; personId0=existing.workerId||existing.personId||''; }
    date0 = existing.date || date0;
  } else if(preset){
    personType0 = preset.kind || 'worker';
    personId0 = preset.id || '';
    if(preset.date) date0 = preset.date;
  }
  const defaultWage = existing && existing.dayWage != null ? toInt(existing.dayWage) : '';
  let defaultDays = existing && existing.days != null ? Number(existing.days) : 1;
  if(existing && String(existing.status).toLowerCase()==='half' && !(existing.days>0)) defaultDays = 0.5;

  openModal(`
    <div class="modal-header"><h3>${existing?'تعديل يومية':'تسجيل يومية'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>النوع *
          <select class="input" id="wattType">
            <option value="worker" ${personType0==='worker'?'selected':''}>عامل</option>
            <option value="supervisor" ${personType0==='supervisor'?'selected':''}>مشرف</option>
            <option value="driver" ${personType0==='driver'?'selected':''}>سائق</option>
            <option value="equipment" ${personType0==='equipment'?'selected':''}>معدة</option>
          </select>
        </label>
        <label id="wattPersonLabel">الشخص / المعدة *
          <div id="wattPersonBox"></div>
        </label>
        <label>الحالة
          <select class="input" id="wattStatus">${selectOptions(ATTENDANCE_STATUS, existing&&existing.status||'present')}</select>
        </label>
        <label>التاريخ *
          <input class="input" id="wattDate" type="date" value="${escapeHtml(date0)}">
        </label>
        <label>عدد الأيام المحسوبة *
          <input class="input" id="wattDays" type="number" min="0" step="0.5" value="${defaultDays}" title="مثال: 1 أو 2 أو 3 أو 0.5 لنصف يوم">
          <small style="display:block;color:var(--ink-soft);margin-top:4px;">اليوم الواحد ممكن يتحسب بيومين أو ثلاثة حسب الشغل</small>
        </label>
        <label>اليومية لهذا اليوم (ج.م)
          <input class="input" id="wattDayWage" type="number" min="0" step="0.01" value="${defaultWage||''}">
        </label>
        <label id="wattDedWrap" style="display:none;">خصم التأخير (ج.م)
          <input class="input" id="wattDeduction" type="number" min="0" step="0.01" value="${existing && existing.deduction ? toInt(existing.deduction) : ''}">
        </label>
        <label>المشروع *
          ${(function(){ const cur=(existing&&existing.project)||''; const names=Array.from(new Set((DATA.projects||[]).map(p=>String(p.name||'').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'ar')); if(cur && names.indexOf(cur)<0) names.unshift(cur); return '<select class="input" id="wattProject"><option value="">— اختر المشروع —</option>'+names.map(n=>'<option value="'+escapeHtml(n)+'"'+(n===cur?' selected':'')+'>'+escapeHtml(n)+'</option>').join('')+'</select>'; })()}
        </label>
        <label>الموقع
          <input class="input" id="wattSite" value="${escapeHtml((existing&&existing.site)||'')}" placeholder="اسم الموقع">
        </label>
        <label style="grid-column:1/-1;">ملاحظات
          <textarea class="input" id="wattNotes" rows="4">${escapeHtml(existing&&existing.notes||'')}</textarea>
        </label>
      </div>
      <div id="wattSameDay" style="display:none;margin-top:12px;padding:10px;border-radius:8px;background:#fff7e6;border:1px solid #f0c36d;font-size:13px;"></div>
      <div id="wattPreview" style="margin-top:12px;padding:10px;border-radius:8px;background:var(--paper-2);border:1px solid var(--line);font-weight:700;">
        المستحق = اليومية × عدد الأيام: <span id="wattPreviewVal">0</span> ج.م
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      ${existing?`<button class="btn btn-outline" id="btnDelWattModal" style="color:var(--debt);">حذف</button>`:''}
      <button class="btn btn-outline" id="btnSaveWattMore" title="حفظ هذه اليومية وتسجيل موقع آخر لنفس اليوم">حفظ + موقع آخر لنفس اليوم</button>
      <button class="btn btn-primary" id="btnSaveWatt">${existing?'حفظ التعديل':'تسجيل'}</button>
    </div>
  `);

  function personOptionsHtml(type, selected){
    if(type==='supervisor'){
      return selectOptions(sortByNameAr((DATA.supervisors||[]).filter(s=>s.status!=='inactive'), s=>s.name).map(s=>({id:s.id, name:(s.code?s.code+' — ':'')+s.name})), selected, '— اختر المشرف —');
    }
    if(type==='driver'){
      return selectOptions(sortByNameAr((DATA.drivers||[]).filter(d=>d.status!=='inactive'), d=>d.name).map(d=>({id:d.id, name:(d.code?d.code+' — ':'')+d.name})), selected, '— اختر السائق —');
    }
    if(type==='equipment'){
      return selectOptions(sortByNameAr((DATA.equipment||[]), eq=>eq.name).map(eq=>({id:eq.id, name:(eq.code?eq.code+' — ':'')+eq.name})), selected, '— اختر المعدة —');
    }
    return selectOptions(sortByNameAr((DATA.workers||[]).filter(w=>w.status==='active'||!w.status), w=>w.name).map(w=>({id:w.id, name:(w.code?w.code+' — ':'')+w.name})), selected, '— اختر العامل —');
  }
  function fillPersonList(keepId){
    const type = document.getElementById('wattType').value;
    const lab = document.getElementById('wattPersonLabel');
    const box = document.getElementById('wattPersonBox');
    const labels = {worker:'العامل *', supervisor:'المشرف *', driver:'السائق *', equipment:'المعدة *'};
    if(lab){
      const t = lab.querySelector('.lbl-text') || lab;
      // keep structure
    }
    const kindMap = { worker:'worker', supervisor:'supervisor', driver:'driver', equipment:'equipment' };
    const kind = kindMap[type] || 'worker';
    if(box && typeof entityComboHtml==='function'){
      // إزالة قوائم عالقة
      document.querySelectorAll('.entity-combo-drop-fixed').forEach(d=>d.remove());
      box.innerHTML = entityComboHtml('wattPerson', kind, keepId||'', 'اكتب الاسم أو الكود...');
      if(typeof bindEntityCombos==='function') bindEntityCombos(document.getElementById('appModal'));
      const text = document.getElementById('wattPerson_text');
      if(text) text.addEventListener('change', fillWage);
      // also on select from dropdown
      const hid = document.getElementById('wattPerson');
      if(hid){
        const obs = new MutationObserver(()=> fillWage());
        // simpler: poll on input
      }
      if(text) text.addEventListener('input', ()=> setTimeout(fillWage, 50));
    } else if(box){
      box.innerHTML = `<select class="input" id="wattPerson">${typeof personOptionsHtml==='function'?personOptionsHtml(type, keepId||''):''}</select>`;
      document.getElementById('wattPerson')?.addEventListener('change', fillWage);
    }
    fillWage();
  }
  function getPerson(){
    const type = document.getElementById('wattType').value;
    const id = (typeof getEntityComboValue==='function'?getEntityComboValue('wattPerson'):(document.getElementById('wattPerson')?.value||''));
    if(!id) return null;
    if(type==='supervisor') return getSupervisor(id);
    if(type==='driver') return typeof getDriver==='function'?getDriver(id):null;
    if(type==='equipment') return typeof getEquipment==='function'?getEquipment(id):null;
    return getWorker(id);
  }
  function fillWage(){
    const p = getPerson();
    if(p) document.getElementById('wattDayWage').value = toInt(p.dailyWage);
    refreshPreview();
  }
  function toggleDed(){
    const st = document.getElementById('wattStatus').value;
    const wrap = document.getElementById('wattDedWrap');
    if(wrap) wrap.style.display = st==='late' ? '' : 'none';
    // نصف يوم: اقترح 0.5 إن كان الأيام 1
    if(st==='half'){
      const dEl = document.getElementById('wattDays');
      if(dEl && Number(dEl.value)===1) dEl.value = 0.5;
    }
    refreshPreview();
  }
  let daysTouched = false;
  function refreshSameDay(){
    const box = document.getElementById('wattSameDay'); if(!box) return;
    const type = document.getElementById('wattType').value;
    const pid = (typeof getEntityComboValue==='function'?getEntityComboValue('wattPerson'):(document.getElementById('wattPerson')?.value||''));
    const date = document.getElementById('wattDate')?.value||'';
    if(!pid || !date || type==='equipment'){ box.style.display='none'; return; }
    const others = (DATA.workerAttendance||[]).filter(a=>{
      if(!a || a.date!==date || (existing && a.id===existing.id)) return false;
      const pt = a.personType||'worker';
      return pt===type && (type==='worker' ? (a.workerId===pid||a.personId===pid) : a.personId===pid);
    });
    if(!others.length){ box.style.display='none'; return; }
    const sum = Math.round(others.reduce((x,a)=>x+attendanceDaysCredit(a),0)*100)/100;
    box.style.display='';
    box.innerHTML = '<b>⚑ مسجّل بالفعل في هذا اليوم ('+others.length+' سجل — '+fmtDays(sum)+' يوم):</b><br>'+others.map(a=>'• '+escapeHtml(String(a.project||'').trim()||'غير محدد')+' — '+fmtDays(attendanceDaysCredit(a))+' يوم').join('<br>')+'<br><small>تسجيل موقع آخر لنفس اليوم مسموح، وسيظهر في كشف المشرف أنه كان في أكثر من موقع.</small>';
    if(!existing && !daysTouched){ const dEl=document.getElementById('wattDays'); if(dEl){ dEl.value = Math.max(0.5, Math.round((1-sum)*100)/100); refreshPreview(); } }
  }
  function refreshPreview(){
    const st = document.getElementById('wattStatus').value;
    const wage = toInt(document.getElementById('wattDayWage').value);
    let days = Number(document.getElementById('wattDays').value)||0;
    if(st==='absent'||st==='holiday') days = 0;
    const ded = toInt(document.getElementById('wattDeduction')?.value);
    let total = Math.round(wage * days);
    if(st==='late') total = Math.max(0, total - ded);
    const elv = document.getElementById('wattPreviewVal');
    if(elv) elv.textContent = fmtNum(total);
  }
  document.getElementById('wattType').addEventListener('change', ()=>{ fillPersonList(''); refreshSameDay(); });
  document.getElementById('wattDate').addEventListener('change', refreshSameDay);
  document.getElementById('wattDays').addEventListener('input', ()=>{ daysTouched = true; });
  document.getElementById('appModal')?.addEventListener('change', (e)=>{ if(e.target && /wattPerson/.test(e.target.id||'')) setTimeout(refreshSameDay, 80); });
  document.getElementById('appModal')?.addEventListener('click', ()=> setTimeout(refreshSameDay, 150));
  // person bound inside fillPersonList
  document.getElementById('wattStatus').addEventListener('change', toggleDed);
  ['wattDayWage','wattDays','wattDeduction'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.addEventListener('input', refreshPreview);
  });
  fillPersonList(personId0);
  toggleDed();
  refreshSameDay();

  document.getElementById('btnDelWattModal')?.addEventListener('click', ()=>{
    if(!existing) return;
    confirmDelete().then(ok=>{ if(!ok) return;
      DATA.workerAttendance = (DATA.workerAttendance||[]).filter(a=>a.id!==existing.id);
      saveData(true); closeModal(); showToast('تم الحذف'); rerenderCurrentPage();
    });
  });

  document.getElementById('btnSaveWattMore')?.addEventListener('click', ()=> doSaveWatt(true));
  document.getElementById('btnSaveWatt').addEventListener('click', ()=> doSaveWatt(false));
  function doSaveWatt(addAnother){
    const personType = document.getElementById('wattType').value;
    const personId = document.getElementById('wattPerson').value;
    const date = document.getElementById('wattDate').value;
    if(!personId){ showToast('اختر الشخص / المعدة'); return; }
    if(!date){ showToast('حدد التاريخ'); return; }
    if(personType==='equipment'){
      closeModal();
      if(typeof openEquipmentDailyModal==='function') openEquipmentDailyModal(personId, null, date);
      return;
    }
    const status = document.getElementById('wattStatus').value||'present';
    let days = Number(document.getElementById('wattDays').value)||0;
    if(status==='absent'||status==='holiday') days = 0;
    else if(days<=0){ showToast('أدخل عدد الأيام (مثال 1 أو 2 أو 0.5)'); return; }
    const dayWage = toInt(document.getElementById('wattDayWage').value);
    const deduction = status==='late' ? toInt(document.getElementById('wattDeduction')?.value) : 0;
    const project = (document.getElementById('wattProject').value||'').trim();
    if(!project){ showToast('اختر المشروع'); return; }
    const notes = (document.getElementById('wattNotes').value||'').trim();
    const site = (document.getElementById('wattSite')?.value||'').trim();
    let payload = { personType, personId, date, status, days, dayWage, deduction, project, site, notes };
    if(personType==='worker'){
      payload.workerId = personId;
      const w = getWorker(personId);
      payload.supervisorId = w ? (w.supervisorId||'') : '';
    } else if(personType==='supervisor'){
      payload.workerId = '';
      payload.supervisorId = personId;
    } else {
      payload.workerId = '';
      payload.supervisorId = '';
    }
    if(project && typeof ensureProjectSaved==='function') ensureProjectSaved(project);
    if(existing){
      Object.assign(existing, payload);
      addAudit('تعديل حضور', personType+' '+date);
    } else {
      payload.id = uid();
      DATA.workerAttendance = DATA.workerAttendance||[];
      DATA.workerAttendance.push(payload);
      addAudit('تسجيل حضور', personType+' '+date);
    }
    saveData(true);
    closeModal();
    showToast('تم الحفظ');
    rerenderCurrentPage();
    if(addAnother && personType!=='equipment') setTimeout(()=> openWorkerAttModal(null, null, { kind: personType, id: personId, date }), 120);
  }
}


function renderEquipmentDailyEmbed(){
  const { y, m, last, from, to, dates } = wattMonthBounds();
  const days = dates;
  let list = sortByNameAr((DATA.equipment||[]).slice(), eq=>eq.name);
  if(typeof filterByDeptFilter==='function' && workerAttFilters.dailiesDept !== undefined && workerAttFilters.dailiesDept !== null)
    list = filterByDeptFilter(list, workerAttFilters.dailiesDept);
  const q = String(workerAttFilters.q||'').trim();
  if(q) list = list.filter(eq=> (typeof smartMatch==='function' ? smartMatch([eq.name,eq.code,eq.vehicleNumber].join(' '), q) : String(eq.name||'').indexOf(q)>=0));
  const proj = String(workerAttFilters.project||'').trim();
  const logsOf = eq => (DATA.equipmentDaily||[]).filter(d=>d.equipmentId===eq.id && (d.date||'')>=from && (d.date||'')<=to && (!proj || String(d.project||'').trim()===proj));
  if(proj) list = list.filter(eq=>logsOf(eq).length);
  const pg = paginateRows(list, 'wattEquip');
  const allLogs = list.reduce((a,eq)=>a.concat(logsOf(eq)),[]);
  const eqCards = statCardsHtml([
    {ico:'🚜',label:'عدد المعدات',value:fmtNum(list.length)},
    {ico:'📅',label:'أيام التشغيل',value:fmtNum(allLogs.length),tone:'ok'},
    {ico:'⏱️',label:'ساعات التشغيل',value:fmtNum(Math.round(allLogs.reduce((s,d)=>s+(Number(d.hours)||0),0)*10)/10)},
    {ico:'💰',label:'تكلفة تشغيل الشهر',value:fmtMoney(toInt(allLogs.reduce((s,d)=>s+equipmentDailyCost(d,getEquipment(d.equipmentId)),0)))}]);
  return `
    ${eqCards}
    <div class="table-wrap" style="overflow:auto;max-width:100%;">
      <table class="data-table watt-grid" style="min-width:${120+last*36}px;font-size:12px;">
        <thead><tr>
          <th style="position:sticky;right:0;background:var(--paper);z-index:2;min-width:140px;">المعدة</th>
          <th style="min-width:50px;">النوع</th>
          ${days.map((d,i)=>`<th style="text-align:center;padding:4px;min-width:28px;">${wattDayHead(d,i,days)}</th>`).join('')}
          <th>أيام</th><th>ساعات</th><th>التكلفة</th><th></th>
        </tr></thead>
        <tbody>
          ${pg.pageRows.length? pg.pageRows.map(eq=>{
            const logs = logsOf(eq);
            const hours = logs.reduce((s,d)=>s+(Number(d.hours)||0),0);
            const cost = toInt(logs.reduce((s,d)=>s+equipmentDailyCost(d,eq),0));
            const daysCount = new Set(logs.map(d=>d.date)).size;
            const typeLab = eq.typeLabel || (typeof labelOf==='function' && typeof EQUIPMENT_TYPES!=='undefined' ? labelOf(EQUIPMENT_TYPES, eq.type) : '') || 'معدة';
            return `<tr>
              <td style="position:sticky;right:0;background:var(--paper);z-index:1;"><strong>${escapeHtml(eq.name||'')}</strong><div style="font-size:11px;color:var(--ink-soft);">${escapeHtml(eq.code||'')}</div></td>
              <td>${escapeHtml(typeLab)}</td>
              ${days.map(d=>{
                const date=d;
                const log=logs.find(x=>x.date===date);
                if(!log) return `<td style="text-align:center;padding:2px;"><button type="button" class="eqd-cell empty" data-eq="${eq.id}" data-day="${d.slice(8,10)}" data-date="${d}" title="تسجيل يومية" ${readOnlyMode?'disabled':''} style="border:none;background:transparent;cursor:pointer;width:100%;min-height:28px;color:var(--ink-soft);">·</button></td>`;
                const h = Number(log.hours)||0;
                return `<td style="text-align:center;padding:2px;"><button type="button" class="eqd-cell filled" data-id="${log.id}" title="${escapeHtml((log.project||'بدون مشروع')+' — '+h+' ساعة — اضغط للتعديل')}" style="border:none;background:transparent;cursor:pointer;font-weight:800;color:var(--ok,#2d6a4f);width:100%;min-height:28px;">${h>0?(Math.round(h*10)/10):'✓'}</button></td>`;
              }).join('')}
              <td><strong>${daysCount}</strong></td>
              <td>${fmtNum(Math.round(hours*10)/10)}</td>
              <td>${fmtMoney(cost)}</td>
              <td style="white-space:nowrap;"><button class="btn btn-outline btn-sm btn-eqd-add" data-eq="${eq.id}" ${readOnlyMode?'disabled':''}>+</button></td>
            </tr>`;
          }).join('') : `<tr><td colspan="${last+6}" style="text-align:center;color:var(--ink-soft);padding:28px;">لا معدات للعرض — غيّر الفلتر أو أضف معدات</td></tr>`}
        </tbody>
      </table>
    </div>
    ${tablePagerHtml('wattEquip', pg)}`;
}
