/* =========================================================
   المعدات — بطاقة كاملة + يومية تشغيل + صيانة وتكاليف
   ========================================================= */

function filteredEquipment(){
  let list = (DATA.equipment||[]).slice();
  const f = equipmentFilters || {};
  if(f.status) list = list.filter(eq => eq.status === f.status);
  if(f.type) list = list.filter(eq =>
    eq.type === f.type || eq.typeLabel === f.type || (eq.typeLabel||'').includes(f.type)
  );
  if(f.ownership) list = list.filter(eq => eq.ownership === f.ownership);
  if(f.project){
    const pq = f.project.trim().toLowerCase();
    list = list.filter(eq => (eq.project||'').toLowerCase().includes(pq));
  }
  if(f.q && typeof smartSearchList==='function') list = smartSearchList(list, f.q);
  if(typeof applyExtraPersonFilters==='function') list = applyExtraPersonFilters('equipment', list, f);
  const deptF = f.departmentId || f.categoryId || '';
  list = typeof filterByDeptFilter==='function' ? filterByDeptFilter(list, deptF) : (deptF ? list.filter(eq=>(eq.departmentId||eq.categoryId)===deptF) : list);
  return (f.q && String(f.q).trim()) ? list : sortByNameAr(list, eq=>eq.name);
}

function eqStatusBadge(st){
  const ok = st==='working';
  const warn = st==='stopped'||st==='maintenance'||st==='rented'||st==='rented_out'||st==='in_use'||st==='available';
  const cls = ok?'ok':warn?'warn':'err';
  const lab = labelOf(EQUIPMENT_STATUS, st) || ({in_use:'مستأجرة', available:'تعمل', broken:'صيانة', retired:'متوقفة'}[st]) || st || '—';
  return `<span class="badge badge-${cls}">${escapeHtml(lab)}</span>`;
}

function renderEquipmentPage(){
  if(!equipmentFilters.detailId && typeof isEntityBoardsView==='function' && isEntityBoardsView(equipmentFilters)){
    return entityDeptBoardsPageHtml('equipment', 'المعدات والمركبات', '');
  }

  // وضع التفاصيل؟
  if(equipmentFilters.detailId){
    return renderEquipmentDetail(equipmentFilters.detailId);
  }
  if(equipmentFilters.dailyView){
    return renderEquipmentDailyGrid();
  }
  const rows = filteredEquipment();
  if(typeof setPageExport==='function') setPageExport('equipment',
    ['الكود','نوع السيارة','رقم اللوحة','اللون','رقم الماتور','رقم الشاسيه','الرقم التأميني','حالة التأمين','الموديل','تاريخ الفحص','تاريخ الإصدار','انتهاء رخصة السيارة','حالة رخصة السيارة','نوع الترخيص','اسم السائق','انتهاء رخصة السائق','حالة رخصة السائق','القسم','الحالة','الملكية','الملاحظات'],
    (typeof filteredEquipment==='function'?filteredEquipment():(DATA.equipment||[])).map(eq=>{
      const lab = (c)=> (typeof arabicLabelForCode==='function'?arabicLabelForCode(c):c)||'';
      const fd = (d)=> d ? (typeof fmtDate==='function'?fmtDate(d):d) : '';
      const vExp = eq.vehicleLicenseExpiry || eq.licenseExpiry || '';
      const dExp = eq.driverLicenseExpiry || '';
      const vSt = vExp && typeof statusFromExpiry==='function' ? statusFromExpiry(vExp) : (eq.vehicleLicenseStatus||'');
      const dSt = dExp && typeof statusFromExpiry==='function' ? statusFromExpiry(dExp) : (eq.driverLicenseStatus||'');
      return [
        eq.code||'',
        eq.typeLabel||eq.name||'',
        eq.vehicleNumber||eq.plate||'',
        eq.color||'',
        eq.motorNumber||eq.serial||'',
        eq.chassisNumber||'',
        eq.insuranceNumber||'',
        (typeof arabicLabelForCode==='function'?arabicLabelForCode(eq.insuranceStatus):'')||eq.insuranceStatus||'',
        eq.model||'',
        fd(eq.inspectionDate),
        fd(eq.licenseIssueDate),
        fd(vExp),
        lab(vSt),
        eq.licenseCategory || lab(eq.ownership) || '',
        eq.driverName||'',
        fd(dExp),
        lab(dSt),
        typeof departmentName==='function'?departmentName(eq.departmentId||eq.categoryId):'',
        lab(eq.status),
        lab(eq.ownership),
        (eq.notes||'').toString().replace(/\s+/g,' ').trim()
      ];
    }));
  const pg = paginateRows(rows, 'equipment');
  const working = (DATA.equipment||[]).filter(e=>e.status==='working').length;
  const maint = (DATA.equipment||[]).filter(e=>e.status==='maintenance'||e.status==='stopped').length;
  const rented = (DATA.equipment||[]).filter(e=>e.ownership==='rented'||e.status==='rented_out').length;
  const monthStart = todayISO().slice(0,8)+'01';
  const monthCost = toInt((DATA.equipmentDaily||[]).filter(d=>(d.date||'')>=monthStart)
    .reduce((s,d)=>s+equipmentDailyCost(d, getEquipment(d.equipmentId)),0));

  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <div>
          ${typeof entityListBackBarHtml==='function'?entityListBackBarHtml('equipment', equipmentFilters, ''):''}
          <h2 class="page-title" style="margin:0;">المعدات والمركبات</h2>
        </div>
        <div class="btn-row">
          ${typeof pageExportButtonsHtml==='function'?pageExportButtonsHtml():'<button class="btn btn-outline" id="btnExportEquip">CSV</button>'}
          ${String(equipmentFilters.departmentId||equipmentFilters.categoryId||'')==='__core_eq_external__' ? `<button class="btn btn-green-strong" id="btnAddExtCar" ${readOnlyMode?'disabled':''}>+ إضافة سيارة خارجية</button>` : `<button class="btn btn-primary" id="btnAddEquip" ${readOnlyMode?'disabled':''}>+ إضافة معدة</button>`}
        </div>
      </div>
      ${entityStatCardsHtml('equipment', rows)}
      ${typeof bulkBarHtml==='function'?bulkBarHtml('equipment'):''}
      <div class="filters-bar">
        <input type="search" id="eqSearch" class="input" placeholder="بحث: كود، اسم، لوحة، شاسيه، مشروع..." value="${escapeHtml(equipmentFilters.q||'')}" style="min-width:200px;">
        <select id="eqFilterStatus" class="input"><option value="">كل الحالات</option>${selectOptions(EQUIPMENT_STATUS, equipmentFilters.status)}</select>
        <select id="eqFilterOwn" class="input"><option value="">الملكية</option>${selectOptions(EQUIPMENT_OWNERSHIP, equipmentFilters.ownership)}</select>
        <input type="search" id="eqFilterProject" class="input" placeholder="مشروع..." value="${escapeHtml(equipmentFilters.project||'')}" style="min-width:120px;">
        ${typeof extraPersonFiltersHtml==='function'?extraPersonFiltersHtml('equipment', equipmentFilters, 'eq'):''}
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:36px;"><input type="checkbox" id="checkAll_equipment" title="تحديد الكل"></th>
              <th>الكود</th><th>نوع السيارة</th><th>رقم اللوحة</th><th>اللون</th>
              <th>رقم الماتور</th><th>رقم الشاسيه</th><th>الرقم التأميني</th><th>حالة التأمين</th><th>الموديل</th><th>اسم السائق</th>${thIf('equipment','purchasePrice','سعر الشراء')}
              <th>تاريخ الفحص</th><th>تاريخ الإصدار</th>
              <th>تاريخ انتهاء رخصة السيارة</th><th>حالة رخصة السيارة</th>
              <th>نوع الترخيص</th>
              <th>انتهاء رخصة السائق</th><th>حالة رخصة السائق</th>
              ${thIf('equipment','status','الحالة')}${thIf('equipment','ownership','الملكية')}${thIf('equipment','purchaseDate','تاريخ الشراء')}${thIf('equipment','lastMaintenance','آخر صيانة')}${thIf('equipment','nextMaintenance','الصيانة القادمة')}
              <th>ملاحظات</th>
              ${customFieldsTableHeaders('equipment')}<th></th>
            </tr>
          </thead>
          <tbody>
            ${pg.pageRows.length ? pg.pageRows.map(eq => {
              const vExp = eq.vehicleLicenseExpiry || eq.licenseExpiry || '';
              const dExp = eq.driverLicenseExpiry || '';
              const vSt = vExp && typeof statusFromExpiry==='function' ? statusFromExpiry(vExp) : (eq.vehicleLicenseStatus||'');
              const dSt = dExp && typeof statusFromExpiry==='function' ? statusFromExpiry(dExp) : (eq.driverLicenseStatus||'');
              return `<tr>
                <td><input type="checkbox" class="row-check" data-kind="equipment" data-id="${eq.id}"></td>
                <td>${escapeHtml(eq.code||'')}</td>
                <td><strong>${escapeHtml(eq.typeLabel||eq.name||'')}</strong></td>
                <td>${escapeHtml(eq.vehicleNumber||eq.plate||'—')}</td>
                <td>${escapeHtml(eq.color||'—')}</td>
                <td>${escapeHtml(eq.motorNumber||eq.serial||'—')}</td>
                <td>${escapeHtml(eq.chassisNumber||'—')}</td>
                <td>${escapeHtml(eq.insuranceNumber||'—')}</td>
                <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(eq.insuranceStatus||'','insurance'):escapeHtml(eq.insuranceStatus||'—')}</td>
                <td>${escapeHtml(eq.model||'—')}</td>
                <td>${escapeHtml(eq.driverName||(eq.driverId&&typeof getDriver==='function'&&getDriver(eq.driverId)?getDriver(eq.driverId).name:'')||'—')}</td>
                ${tdIf('equipment','purchasePrice',`<td>${eq.purchasePrice?fmtMoney(eq.purchasePrice):'—'}</td>`)}
                <td>${fmtDate(eq.inspectionDate)}</td>
                <td>${fmtDate(eq.licenseIssueDate)}</td>
                <td>${fmtDate(vExp)}</td>
                <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(vSt,'card'):escapeHtml(vSt||'—')}</td>
                <td>${escapeHtml(eq.licenseCategory||eq.ownership||'—')}</td>
                <td>${fmtDate(dExp)}</td>
                <td>${typeof statusBadgeSarya==='function'?statusBadgeSarya(dSt,'license'):escapeHtml(dSt||'—')}</td>
                ${tdIf('equipment','status',`<td>${escapeHtml((typeof labelOf==='function'&&typeof EQUIPMENT_STATUS!=='undefined'?labelOf(EQUIPMENT_STATUS,eq.status):'')||eq.status||'—')}</td>`)}
                ${tdIf('equipment','ownership',`<td>${escapeHtml((typeof labelOf==='function'&&typeof EQUIPMENT_OWNERSHIP!=='undefined'?labelOf(EQUIPMENT_OWNERSHIP,eq.ownership):'')||eq.ownership||'—')}</td>`)}
                ${tdIf('equipment','purchaseDate',`<td>${fmtDate(eq.purchaseDate)}</td>`)}
                ${tdIf('equipment','lastMaintenance',`<td>${fmtDate(eq.lastMaintenance)}</td>`)}
                ${tdIf('equipment','nextMaintenance',`<td>${fmtDate(eq.nextMaintenance)}</td>`)}
                <td class="notes-cell">${typeof equipmentNotesCellHtml==='function'?equipmentNotesCellHtml(eq):(escapeHtml((eq.notes||'').slice(0,40))||'—')}</td>
                ${customFieldsTableCells('equipment', eq)}
                <td>
                  <div class="row-actions">
                    <button type="button" class="icon-btn btn-view-eq" data-id="${eq.id}" title="عرض">👁️</button>
                    <button type="button" class="icon-btn btn-daily-eq" data-id="${eq.id}" title="يومية" ${readOnlyMode?'disabled':''}>📅</button>
                    <button type="button" class="icon-btn btn-edit-eq" data-id="${eq.id}" title="تعديل">✏️</button>
                    <button type="button" class="icon-btn icon-del btn-del-eq" data-id="${eq.id}" title="حذف" ${readOnlyMode?'disabled':''}>🗑️</button>
                  </div>
                </td>
              </tr>`;
            }).join('') : '<tr><td colspan="18" style="text-align:center;color:var(--ink-soft);padding:30px;">لا توجد معدات — اضغط «إضافة معدة»</td></tr>'}
          </tbody>
        </table>
      </div>
      ${tablePagerHtml('equipment', pg)}
      ${customFieldsManageHtml('equipment')}

    </div>`;
}

function renderRecentDailyTable(limit){
  const logs = (DATA.equipmentDaily||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0, limit||12);
  if(!logs.length) return '<p style="color:var(--ink-soft);">لا يوميات بعد — اضغط «يومية معدة»</p>';
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>التاريخ</th><th>المعدة</th><th>المشروع</th><th>ساعات</th><th>وقود (لتر)</th><th>إنتاجية</th><th>تكلفة اليوم</th><th></th></tr></thead>
    <tbody>
      ${logs.map(d=>{
        const eq = getEquipment(d.equipmentId);
        const cost = equipmentDailyCost(d, eq);
        return `<tr>
          <td>${fmtDate(d.date)}</td>
          <td>${escapeHtml(eq?eq.name:d.equipmentId)}</td>
          <td>${escapeHtml(d.project||'—')}</td>
          <td>${escapeHtml(d.hours||0)}</td>
          <td>${escapeHtml(d.fuelLiters||0)}</td>
          <td>${escapeHtml(d.productivity||'—')}</td>
          <td><strong>${fmtMoney(cost)}</strong></td>
          <td><button class="btn btn-outline btn-sm btn-del-daily" data-id="${d.id}" ${readOnlyMode?'disabled':''}>حذف</button></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table></div>`;
}


/* ===== يوميات التشغيل في صفحة عرض المعدة (مطوّرة) ===== */
const EQ_WD = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
function eqWeekday(date){ const d = new Date(String(date||'')+'T00:00:00'); return isNaN(d) ? '' : EQ_WD[d.getDay()]; }
function eqDailyDays(d){ const n = Number(d.days); return (Number.isFinite(n) && n>0) ? n : 1; }
function eqDailiesStats(eq, logs){
  const dates = new Set(logs.map(d=>d.date));
  const hours = logs.reduce((s,d)=>s+(Number(d.hours)||0),0);
  const fuel = logs.reduce((s,d)=>s+(Number(d.fuelLiters)||0),0);
  const extra = toInt(logs.reduce((s,d)=>s+(Number(d.extraCost)||0),0));
  const cost = toInt(logs.reduce((s,d)=>s+equipmentDailyCost(d,eq),0));
  const byProj = {};
  logs.forEach(d=>{ const p = (d.project||'').trim()||'غير محدد'; const o = byProj[p] || (byProj[p]={days:new Set(),hours:0,cost:0}); o.days.add(d.date); o.hours += Number(d.hours)||0; o.cost += equipmentDailyCost(d,eq); });
  return { days:dates.size, hours:Math.round(hours*10)/10, fuel, extra, cost, byProj };
}
function equipDailiesSectionHtml(eq, dailies){
  const st = eqDailiesStats(eq, dailies);
  const asc = dailies.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const pg = paginateRows(asc, 'eqDetDailies');
  const tile = (ic,l,v)=>`<div class="pf-tile"><div class="pf-tile-l">${ic} ${l}</div><div class="pf-tile-v">${v}</div></div>`;
  const projs = Object.keys(st.byProj);
  return `<section class="pd-card eq-dailies">
    <div class="section-title" style="margin-top:0;">📅 يوميات التشغيل (${dailies.length})</div>
    <div class="pf-tiles" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:12px;">
      ${tile('🗓️','أيام التشغيل',fmtNum(st.days))}${tile('⏱️','الساعات',fmtNum(st.hours))}${tile('⛽','الوقود (لتر)',fmtNum(st.fuel))}${tile('➕','إضافي',fmtMoney(st.extra))}${tile('💰','تكلفة التشغيل',fmtMoney(st.cost))}
    </div>
    ${projs.length>1 ? `<div class="btn-row" style="flex-wrap:wrap;margin-bottom:10px;">${projs.map(p=>`<span class="pn-badge muted">${escapeHtml(p)} — ${st.byProj[p].days.size} يوم · ${fmtMoney(toInt(st.byProj[p].cost))}</span>`).join('')}</div>` : ''}
    <div class="table-wrap"><table class="data-table eq-dailies-table">
      <thead><tr><th>م</th><th>التاريخ</th><th>اليوم</th><th>المشروع / الموقع</th><th>الأيام</th><th>ساعات</th><th>وقود</th><th>إنتاجية</th><th>إضافي</th><th>التكلفة</th><th></th></tr></thead>
      <tbody>
        ${pg.pageRows.length ? pg.pageRows.map((d,i)=>`<tr>
          <td>${pg.pageStart+i+1}</td>
          <td>${fmtDate(d.date)}</td>
          <td>${eqWeekday(d.date)}</td>
          <td>${escapeHtml(d.project||'غير محدد')}</td>
          <td>${eqDailyDays(d)}</td>
          <td>${fmtNum(d.hours||0)}</td>
          <td>${fmtNum(d.fuelLiters||0)}</td>
          <td>${escapeHtml(d.productivity||'—')}</td>
          <td>${fmtMoney(d.extraCost)}</td>
          <td><strong>${fmtMoney(equipmentDailyCost(d,eq))}</strong></td>
          <td style="white-space:nowrap;"><button class="btn btn-outline btn-sm btn-edit-daily" data-id="${d.id}" data-eq="${eq.id}" ${readOnlyMode?'disabled':''}>تعديل</button> <button class="btn btn-outline btn-sm btn-del-daily" data-id="${d.id}" ${readOnlyMode?'disabled':''}>حذف</button></td>
        </tr>`).join('') : '<tr><td colspan="11" style="text-align:center;color:var(--ink-soft);padding:22px;">لا يوميات في هذه الفترة</td></tr>'}
      </tbody>
      ${dailies.length?`<tfoot><tr><th colspan="4">الإجمالي</th><th>${fmtNum(st.days)}</th><th>${fmtNum(st.hours)}</th><th>${fmtNum(st.fuel)}</th><th></th><th>${fmtMoney(st.extra)}</th><th>${fmtMoney(st.cost)}</th><th></th></tr></tfoot>`:''}
    </table></div>
    ${tablePagerHtml('eqDetDailies', pg)}
  </section>`;
}

/** كشف أيام المعدة/المركبة: أيام التشغيل بالتاريخ والموقع + وقود + مصاريف + تكاليف + صرف + المتبقي */
function printEquipmentDaysStatement(equipmentId, from, to){
  const eq = getEquipment(equipmentId);
  if(!eq){ showToast('المعدة غير موجودة'); return; }
  const inR = x => (!from||(x.date||'')>=from) && (!to||(x.date||'')<=to);
  const logs = (DATA.equipmentDaily||[]).filter(d=>d.equipmentId===equipmentId && inR(d)).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const st = eqDailiesStats(eq, logs);
  const fuels = (DATA.fuelLogs||[]).filter(x=>x.equipmentId===equipmentId && inR(x)).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const fuelCost = fuels.reduce((s,x)=>s+toInt(x.cost||x.amount||0),0);
  const fuelLit = fuels.reduce((s,x)=>s+(Number(x.liters)||0),0);
  const expList = typeof personExpensesList==='function' ? personExpensesList('equipment', equipmentId, from, to) : [];
  const costList = typeof costsInRange==='function' ? costsInRange('equipment', equipmentId, from, to) : [];
  const f = personFinData('equipment', equipmentId);
  const stat = personFinStatus(f);
  const expAmt = e => (Array.isArray(e.lines)&&e.lines.length) ? e.lines.reduce((a,l)=>a+toInt(l.amount),0) : toInt(e.amount||e.total||0);
  const periodLine = 'الفترة: '+(from?fmtDate(from):'الكل')+' → '+(to?fmtDate(to):'الكل');
  const title = (typeof buildExportFileTitle==='function') ? buildExportFileTitle('كشف أيام معدة', eq.name||eq.code||'', from, to) : 'كشف أيام معدة';
  const row = (l,v,b)=>`<tr><th>${l}</th><td${b?' style="font-weight:800;"':''}>${v}</td></tr>`;
  const dRows = logs.map((d,i)=>`<tr><td>${i+1}</td><td>${fmtDate(d.date)}</td><td>${eqWeekday(d.date)}</td><td>${escapeHtml(d.project||'غير محدد')}</td><td>${eqDailyDays(d)}</td><td>${fmtNum(d.hours||0)}</td><td>${fmtNum(d.fuelLiters||0)}</td><td>${fmtMoney(d.extraCost)}</td><td>${fmtMoney(equipmentDailyCost(d,eq))}</td><td>${escapeHtml(d.notes||'')}</td></tr>`).join('');
  const projRows = Object.keys(st.byProj).map(p=>`<tr><td>${escapeHtml(p)}</td><td>${st.byProj[p].days.size}</td><td>${fmtNum(Math.round(st.byProj[p].hours*10)/10)}</td><td>${fmtMoney(toInt(st.byProj[p].cost))}</td></tr>`).join('');
  const tbl = (head, cols, rows, total)=> rows ? `<h4 style="margin-top:16px;">${head}</h4><table><thead><tr>${cols.map(c=>'<th>'+c+'</th>').join('')}</tr></thead><tbody>${rows}</tbody>${total!=null?`<tfoot><tr><th colspan="${cols.length-1}">الإجمالي</th><th>${fmtMoney(total)}</th></tr></tfoot>`:''}</table>` : '';
  const fuelRows = fuels.map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${fmtNum(x.liters)}</td><td>${escapeHtml(x.project||'—')}</td><td>${fmtMoney(x.cost||x.amount)}</td></tr>`).join('');
  const expRows = expList.map(e=>`<tr><td>${fmtDate(e.date)}</td><td>${escapeHtml(e.item||e.category||e.type||'مصروف')}</td><td>${escapeHtml(e.project||'—')}</td><td>${fmtMoney(expAmt(e))}</td></tr>`).join('');
  const costRows = costList.map(c=>`<tr><td>${fmtDate(c.date)}</td><td>${escapeHtml(typeof costItemText==='function'?costItemText(c):(c.item||'تكلفة'))}</td><td>${escapeHtml(c.project||'—')}</td><td>${fmtMoney(c.amount)}</td></tr>`).join('');
  const payRows = f.pays.map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${escapeHtml(x.payCategory||x.reason||'صرف')}</td><td>${escapeHtml(x.notes||'')}</td><td>${fmtMoney(x.amount)}</td></tr>`).join('');
  printHtml(`
    <div class="print-sheet">
      ${statementHeaderHtml(title, periodLine)}
      <table>
        <tr><th>المعدة / المركبة</th><td>${escapeHtml(eq.name||'')}</td><th>الكود</th><td>${escapeHtml(eq.code||'')}</td></tr>
        <tr><th>النوع</th><td>${escapeHtml(eq.typeLabel||eq.type||'')}</td><th>اللوحة</th><td>${escapeHtml(eq.plate||eq.vehicleNumber||'—')}</td></tr>
        <tr><th>أول يوم تشغيل</th><td>${logs.length?fmtDate(logs[0].date):'—'}</td><th>آخر يوم تشغيل</th><td>${logs.length?fmtDate(logs[logs.length-1].date):'—'}</td></tr>
        <tr><th>عدد أيام التشغيل</th><td>${st.days}</td><th>إجمالي الساعات</th><td>${fmtNum(st.hours)}</td></tr>
        <tr><th>حالة الاستلام</th><td colspan="3">${stat.ico} ${stat.txt}</td></tr>
      </table>
      <h4 style="margin-top:16px;">تفصيل أيام التشغيل (${logs.length})</h4>
      <table>
        <thead><tr><th>م</th><th>التاريخ</th><th>اليوم</th><th>المشروع / الموقع</th><th>الأيام</th><th>ساعات</th><th>وقود (ل)</th><th>إضافي</th><th>التكلفة</th><th>ملاحظات</th></tr></thead>
        <tbody>${dRows || '<tr><td colspan="10" style="text-align:center;">لا أيام تشغيل في هذه الفترة</td></tr>'}</tbody>
        <tfoot><tr><th colspan="4">الإجمالي</th><th>${st.days}</th><th>${fmtNum(st.hours)}</th><th>${fmtNum(st.fuel)}</th><th>${fmtMoney(st.extra)}</th><th>${fmtMoney(st.cost)}</th><th></th></tr></tfoot>
      </table>
      ${projRows ? `<h4 style="margin-top:16px;">ملخص حسب المشروع / الموقع</h4><table><thead><tr><th>المشروع / الموقع</th><th>الأيام</th><th>الساعات</th><th>التكلفة</th></tr></thead><tbody>${projRows}</tbody></table>` : ''}
      ${tbl('صرف الوقود ('+fuels.length+') — '+fmtNum(fuelLit)+' لتر', ['التاريخ','لتر','المشروع','التكلفة'], fuelRows, fuelCost)}
      ${tbl('مصاريف المعدة', ['التاريخ','البند','المشروع','المبلغ'], expRows, f.exp)}
      ${tbl('تكاليف المعدة', ['التاريخ','البند','المشروع','المبلغ'], costRows, f.costs)}
      <h4 style="margin-top:16px;">الملخص المالي</h4>
      <table>
        ${row('تكلفة التشغيل (أيام)', fmtMoney(st.cost))}
        ${row('وقود مصروف منفصل', fmtMoney(fuelCost))}
        ${row('المصاريف', fmtMoney(f.exp))}${row('التكاليف', fmtMoney(f.costs))}
        ${row('المدفوع / المستلم', fmtMoney(f.paid))}${row('المتبقي', fmtMoney(f.remaining), true)}
      </table>
      ${tbl('سجل الصرف والاستلام', ['التاريخ','البند','ملاحظات','المبلغ'], payRows, f.paid)}
      ${statementFooterHtml()}
    </div>`, title, { statement:true, brand:false, periodLine: periodLine, headerTitle: title });
}

function renderEquipmentDetail(id){
  const eq = getEquipment(id);
  if(!eq){
    equipmentFilters.detailId = '';
    return renderEquipmentPage();
  }
  const from = equipmentFilters.from || '';
  const to = equipmentFilters.to || '';
  const hours = equipmentTotalHours(id, from||undefined, to||undefined);
  const fuel = equipmentTotalFuel(id, from||undefined, to||undefined);
  const cost = equipmentTotalCost(id, from||undefined, to||undefined);
  const dailies = getEquipmentDailyLogs(id, from||undefined, to||undefined);
  const plate = eq.vehicleNumber || '—';
  const chassis = eq.chassisNumber || '—';
  const brandModel = ((eq.brand||'')+(eq.model?(' / '+eq.model):'')) || '—';
  const supName = (typeof supervisorName==='function' ? supervisorName(eq.supervisorId) : '') || '—';

  // مصاريف المعدة
  const expList = (DATA.expenses||[]).filter(e=>{
    if(e.personKind==='equipment' && e.personId===id) return true;
    if(e.equipmentId===id) return true;
    return false;
  }).filter(e=>{
    if(from && (e.date||'') < from) return false;
    if(to && (e.date||'') > to) return false;
    return true;
  }).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  const expTotal = expList.reduce((s,e)=>s+(Number(e.amount)||0),0);

  const issues = typeof equipmentNotesIssues==='function' ? equipmentNotesIssues(eq) : [];
  const notesLog = Array.isArray(eq.notesLog) ? eq.notesLog : (eq.notes ? [{id:'legacy', text:eq.notes, at:''}] : []);

  const kv = (label, val)=>`<div class="eq-kv"><span class="eq-k">${label}</span><span class="eq-v">${val}</span></div>`;

  return `
    <div class="page eq-detail-page">
      <div class="eq-detail-head">
        <div>
          <button class="btn btn-outline btn-sm" id="btnEqBack">← رجوع للقائمة</button>
          <h2 class="page-title" style="margin:8px 0 0;">${escapeHtml(eq.name||'')} <span style="font-size:14px;color:var(--ink-soft);">${escapeHtml(eq.code||'')}</span></h2>
          <p class="page-sub" style="margin:4px 0 0;">${eqStatusBadge(eq.status)} · ${escapeHtml(labelOf(EQUIPMENT_OWNERSHIP, eq.ownership||'owned'))}</p>
        </div>
        <div class="eq-detail-actions btn-row">
          <button class="btn btn-primary" id="btnEqDetailEdit">تعديل البطاقة</button>
        </div>
      </div>

      ${(function(){
        const f = (ico, k, v)=>`<div class="pd-f"><span class="pd-f-ico">${ico}</span><div><em>${k}</em><b>${v||'—'}</b></div></div>`;
        const vehicle = [f('🚜','نوع المعدة', escapeHtml(eq.typeLabel||labelOf(EQUIPMENT_TYPES,eq.type)||'')), f('🏷️','الموديل', escapeHtml(eq.model||'')), f('🏭','الماركة', escapeHtml(eq.brand||'')), f('🔢','رقم اللوحة', escapeHtml(plate==='—'?'':plate)), f('🧾','رقم الشاسيه', escapeHtml(chassis==='—'?'':chassis)), f('⚙️','رقم الماتور', escapeHtml(eq.motorNumber||eq.serial||'')), f('🎨','اللون', escapeHtml(eq.color||''))];
        const lic = [f('🪪','نوع الترخيص', escapeHtml(eq.licenseCategory||'')), f('🛡️','الرقم التأميني', escapeHtml(eq.insuranceNumber||'')), f('📋','حالة التأمين', (typeof statusBadgeSarya==='function'?statusBadgeSarya(eq.insuranceStatus||'','insurance'):escapeHtml(eq.insuranceStatus||''))), f('🔧','آخر صيانة', fmtDate(eq.lastMaintenance)), f('🗓️','الصيانة القادمة', fmtDate(eq.nextMaintenance))];
        const ops = [f('🤝','الملكية', escapeHtml(labelOf(EQUIPMENT_OWNERSHIP, eq.ownership||'owned'))), f('⏱️','تكلفة الساعة', fmtMoney(eq.hourlyCost)), f('🛒','سعر الشراء', fmtMoney(eq.purchasePrice))];
        return `<section class="settings-card pd-info"><div class="pd-info-head"><span class="pd-avatar">🚜</span><div><div class="pd-name">${escapeHtml(eq.name||'')}</div><div class="pd-meta"><span class="pd-chip">معدة / مركبة</span><span class="pd-chip">${escapeHtml(eq.code||'—')}</span>${eqStatusBadge(eq.status)}</div></div></div>
          <div class="pd-info-cols"><div class="pd-col"><h5>🚜 بيانات المركبة</h5>${vehicle.join('')}</div><div class="pd-col"><h5>🛡️ الترخيص والصيانة</h5>${lic.join('')}</div><div class="pd-col"><h5>⚙️ التشغيل والتكلفة</h5>${ops.join('')}</div></div></section>`;
      })()}

      <div class="pd-grid2">
      <div class="settings-card person-notes-card pn-compact" style="margin-bottom:14px;">
        <div class="pn-title">الملاحظات والتنبيهات</div>
        <div class="pn-split">
          <div class="pn-col">
            <div class="pn-block pn-active">
              <div class="pn-block-h">
                <span>تنبيهات البرنامج</span>
                <span class="pn-badge">${issues.length}</span>
              </div>
              ${issues.length
                ? `<div class="pn-list">${issues.map((i,ii)=>`
                    <div class="pn-item">
                      <span class="pn-dot">•</span>
                      <span class="pn-txt">${escapeHtml(i)}</span>
                      <button type="button" class="pn-btn btn-eq-dismiss-issue" data-idx="${ii}" data-text="${escapeHtml(i)}" ${readOnlyMode?'disabled':''}>إخفاء</button>
                    </div>`).join('')}</div>`
                : `<div class="pn-empty ok">✓ لا تنبيهات</div>`}
            </div>
            <div class="pn-block pn-hidden">
              <div class="pn-block-h">
                <span>تنبيهات مخفاة</span>
                <span class="pn-badge muted">${(eq.dismissedNotes&&eq.dismissedNotes.length)||0}</span>
              </div>
              ${(eq.dismissedNotes&&eq.dismissedNotes.length)
                ? `<div class="pn-list">${eq.dismissedNotes.map((t,ti)=>`
                    <div class="pn-item">
                      <span class="pn-dot">•</span>
                      <span class="pn-txt muted">${escapeHtml(t)}</span>
                      <button type="button" class="pn-btn restore btn-eq-restore-issue" data-idx="${ti}">إظهار</button>
                    </div>`).join('')}</div>`
                : `<div class="pn-empty">لا تنبيهات مخفاة</div>`}
            </div>
          </div>
          <div class="pn-col">
            <div class="pn-block pn-manual">
              <div class="pn-block-h">
                <span>ملاحظات يدوية</span>
                <span class="pn-badge muted">${notesLog.length}</span>
              </div>
              <div id="eqNotesLogBox" class="pn-list">
                ${notesLog.length
                  ? notesLog.map((n,ni)=>`
                    <div class="pn-item">
                      <span class="pn-dot">•</span>
                      <span class="pn-txt">${escapeHtml(n.text||'')}</span>
                      <button type="button" class="pn-btn del btn-eq-del-note" data-idx="${ni}" data-nid="${escapeHtml(n.id||'')}" ${readOnlyMode?'disabled':''}>حذف</button>
                    </div>`).join('')
                  : `<div class="pn-empty">لا ملاحظات</div>`}
              </div>
              <div class="pn-add">
                <input class="input" id="eqNewNote" placeholder="أضف ملاحظة..." ${readOnlyMode?'disabled':''}>
                <button type="button" class="btn btn-primary btn-sm" id="btnEqSaveNote" ${readOnlyMode?'disabled':''}>حفظ</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      ${typeof personDocsCardHtml==='function' ? personDocsCardHtml('equipment', eq) : ''}
      </div>

      <div class="filters-bar">
        <label style="font-size:13px;">من <input type="date" class="input" id="eqDetFrom" value="${escapeHtml(from)}" style="width:auto;"></label>
        <label style="font-size:13px;">إلى <input type="date" class="input" id="eqDetTo" value="${escapeHtml(to)}" style="width:auto;"></label>
        <button class="btn btn-outline btn-sm" id="eqDetApply">تطبيق</button>
      </div>

      ${equipDailiesSectionHtml(eq, dailies)}

      ${typeof personFinanceHtml==='function' ? personFinanceHtml('equipment', eq) : ''}
    </div>`;
}


function initEquipmentEvents(){
  if(!equipmentFilters.detailId && typeof isEntityBoardsView==='function' && isEntityBoardsView(equipmentFilters)){
    if(typeof bindEntityDeptBoards==='function') bindEntityDeptBoards('equipment', equipmentFilters);
    return;
  }
  if(typeof bindEntityListBack==='function') bindEntityListBack('equipment', equipmentFilters);

  try{ if(typeof bindBulkUI==='function') bindBulkUI('equipment', 'equipment', x=>x.name||x.code||x.typeLabel); }catch(_e){}
  if(typeof bindCategoryUI==='function') bindCategoryUI('equipment', typeof equipmentFilters!=='undefined'?equipmentFilters:{categoryId:''}, ()=>{ resetTablePage('equipment'); rerenderCurrentPage(); });

  if(typeof bindCustomFieldsManage==='function') bindCustomFieldsManage('equipment');

  if(equipmentFilters.detailId){
    const back = document.getElementById('btnEqBack');
    if(back) back.addEventListener('click', ()=>{ equipmentFilters.detailId=''; rerenderCurrentPage(); });
    const apply = document.getElementById('eqDetApply');
    if(apply) apply.addEventListener('click', ()=>{
      equipmentFilters.from = document.getElementById('eqDetFrom')?.value||'';
      equipmentFilters.to = document.getElementById('eqDetTo')?.value||'';
      rerenderCurrentPage();
    });
    try{ bindPersonFinance('equipment', equipmentFilters.detailId); }catch(e){ console.error(e); }
    document.getElementById('btnPersonDetDoc2')?.addEventListener('click', ()=>{ if(typeof openDocModal==='function') openDocModal({ kind: 'equipment', personId: equipmentFilters.detailId }); });
    const dBtn = document.getElementById('btnEqDetailDaily');
    if(dBtn) dBtn.addEventListener('click', ()=> openEquipmentDailyModal(equipmentFilters.detailId));
    const expB = document.getElementById('btnEqDetailExp');
    if(expB) expB.addEventListener('click', ()=>{
      window.__expTab = 'equipment';
      window.__expPrePerson = equipmentFilters.detailId;
      if(typeof openVehicleExpenseModal==='function')
        openVehicleExpenseModal(null, '', equipmentFilters.detailId);
      else if(typeof openExpenseModal==='function')
        openExpenseModal(null);
      else showToast('افتح صفحة المصاريف لإضافة مصروف');
    });
    document.getElementById('btnEqSaveNote')?.addEventListener('click', ()=>{
      const text = (document.getElementById('eqNewNote')?.value||'').trim();
      if(!text){ showToast('اكتب ملاحظة'); return; }
      const eq = getEquipment(equipmentFilters.detailId);
      if(!eq) return;
      if(!Array.isArray(eq.notesLog)) eq.notesLog = [];
      eq.notesLog.push({ id: uid(), text, at: new Date().toISOString() });
      eq.notes = eq.notesLog.map(n=>n.text).join('\n');
      saveData(true); showToast('تم حفظ الملاحظة');
      rerenderCurrentPage();
    });
    document.querySelectorAll('.btn-eq-dismiss-issue').forEach(b=> b.addEventListener('click', ()=>{
      const eq = getEquipment(equipmentFilters.detailId);
      if(!eq) return;
      const text = b.getAttribute('data-text')||'';
      if(typeof dismissPersonNote==='function') dismissPersonNote('equipment', eq.id, text);
      else {
        if(!Array.isArray(eq.dismissedNotes)) eq.dismissedNotes = [];
        if(text && !eq.dismissedNotes.includes(text)) eq.dismissedNotes.push(text);
        saveData(true);
      }
      showToast('تم إخفاء التنبيه');
      rerenderCurrentPage();
    }));
    document.querySelectorAll('.btn-eq-restore-issue').forEach(b=> b.addEventListener('click', ()=>{
      const eq = getEquipment(equipmentFilters.detailId);
      if(!eq || !Array.isArray(eq.dismissedNotes)) return;
      const idx = parseInt(b.getAttribute('data-idx'),10);
      if(!isNaN(idx) && idx>=0 && idx<eq.dismissedNotes.length) eq.dismissedNotes.splice(idx,1);
      saveData(true); showToast('تم إظهار التنبيه');
      rerenderCurrentPage();
    }));
    document.querySelectorAll('.btn-eq-del-note').forEach(b=> b.addEventListener('click', (ev)=>{
      ev.preventDefault();
      const eq = getEquipment(equipmentFilters.detailId);
      if(!eq) return;
      if(!Array.isArray(eq.notesLog)) eq.notesLog = [];
      const idx = parseInt(b.getAttribute('data-idx'),10);
      const nid = b.getAttribute('data-nid')||'';
      if(!isNaN(idx) && idx>=0 && idx<eq.notesLog.length) eq.notesLog.splice(idx,1);
      else if(nid) eq.notesLog = eq.notesLog.filter(n=>n && n.id!==nid);
      eq.notes = eq.notesLog.map(n=>n.text).join('\n');
      saveData(true); showToast('تم حذف الملاحظة');
      rerenderCurrentPage();
    }));
    const eBtn = document.getElementById('btnEqDetailEdit');
    if(eBtn) eBtn.addEventListener('click', ()=> openEquipmentModal(equipmentFilters.detailId));
    const stmtBtn = document.getElementById('btnEqDetailStmt');
    if(stmtBtn) stmtBtn.addEventListener('click', ()=>{
      const from = equipmentFilters.from||'';
      const to = equipmentFilters.to||'';
      if(typeof printEquipmentAccountStatement==='function')
        printEquipmentAccountStatement(equipmentFilters.detailId, from||undefined, to||undefined);
      else if(typeof printEquipmentDailyStatement==='function')
        printEquipmentDailyStatement(equipmentFilters.detailId, from||undefined, to||undefined);
    });
  }

  const search = document.getElementById('eqSearch');
  if(search) search.addEventListener('input', ()=>{ equipmentFilters.q = search.value; resetTablePage('equipment'); if(typeof debounceRerender==='function') debounceRerender('equipmentSearch', 250); else rerenderCurrentPage(); });
  if(typeof bindExtraPersonFilters==='function') bindExtraPersonFilters('eq', equipmentFilters, 'equipment');
  const fs = document.getElementById('eqFilterStatus');
  if(fs) fs.addEventListener('change', ()=>{ equipmentFilters.status = fs.value; resetTablePage('equipment'); rerenderCurrentPage(); });
  const fo = document.getElementById('eqFilterOwn');
  if(fo) fo.addEventListener('change', ()=>{ equipmentFilters.ownership = fo.value; resetTablePage('equipment'); rerenderCurrentPage(); });
  const fp = document.getElementById('eqFilterProject');
  if(fp) fp.addEventListener('input', ()=>{ equipmentFilters.project = fp.value; resetTablePage('equipment'); rerenderCurrentPage(); });

  document.getElementById('btnAddExtCar')?.addEventListener('click', ()=>{
    openEquipmentModal();
    setTimeout(()=>{
      const t = document.getElementById('eqType'); if(t){ t.value = '__core_eq_external__'; t.dispatchEvent(new Event('change',{bubbles:true})); }
      const o = document.getElementById('eqOwnership'); if(o){ o.value = 'rented'; o.dispatchEvent(new Event('change',{bubbles:true})); }
    }, 80);
  });
  const add = document.getElementById('btnAddEquip');
  if(add) add.addEventListener('click', ()=> openEquipmentModal());
  const fuelBtns = [document.getElementById('btnEqFuel'), document.getElementById('btnEqFuel2')].filter(Boolean);
  fuelBtns.forEach(b=> b.addEventListener('click', ()=>{ if(typeof openFuelModal==='function') openFuelModal(); }));
  document.querySelectorAll('.btn-del-fuel').forEach(b=> b.addEventListener('click', ()=>{
    confirmDelete().then(ok=>{ if(!ok) return;
      DATA.fuelLogs=(DATA.fuelLogs||[]).filter(x=>x.id!==b.getAttribute('data-id'));
      saveData(true); showToast('تم'); rerenderCurrentPage();
    });
  }));
  document.querySelectorAll('.btn-stmt-eq').forEach(b=> b.addEventListener('click', ()=> printEquipmentDailyStatement(b.getAttribute('data-id'))));
  const detStmt = document.getElementById('btnEqDetailStmt');
  if(detStmt) detStmt.addEventListener('click', ()=> printEquipmentDailyStatement(equipmentFilters.detailId));

  document.querySelectorAll('.btn-view-eq').forEach(b=> b.addEventListener('click', ()=>{
    equipmentFilters.detailId = b.getAttribute('data-id');
    rerenderCurrentPage();
  }));
  document.querySelectorAll('.btn-daily-eq').forEach(b=> b.addEventListener('click', ()=> openEquipmentDailyModal(b.getAttribute('data-id'))));
  document.querySelectorAll('.btn-log-eq').forEach(b=> b.addEventListener('click', ()=> openEquipLogModal(b.getAttribute('data-id'))));
  document.querySelectorAll('.btn-edit-eq').forEach(b=> b.addEventListener('click', ()=> openEquipmentModal(b.getAttribute('data-id'))));
  document.querySelectorAll('.btn-del-eq').forEach(b=> b.addEventListener('click', ()=>{
    const id = b.getAttribute('data-id');
    const eq = getEquipment(id);
    confirmDelete('حذف المعدة؟').then(ok=>{ if(!ok) return;
      softDelete('equipment', id, eq?eq.name:id);
      addAudit('حذف معدة', eq?eq.name:id);
      rerenderCurrentPage();
    });
  }));
  document.querySelectorAll('.btn-edit-daily').forEach(b=> b.addEventListener('click', ()=>{ if(typeof openEquipmentDailyModal==='function') openEquipmentDailyModal(b.getAttribute('data-eq'), b.getAttribute('data-id')); }));
  document.querySelectorAll('.btn-del-daily').forEach(b=> b.addEventListener('click', ()=>{
    confirmDelete().then(ok=>{ if(!ok) return;
      DATA.equipmentDaily = (DATA.equipmentDaily||[]).filter(d=>d.id!==b.getAttribute('data-id'));
      saveData(true); showToast('تم الحذف'); rerenderCurrentPage();
    });
  }));
  document.querySelectorAll('.btn-del-eqlog').forEach(b=> b.addEventListener('click', ()=>{
    confirmDelete().then(ok=>{ if(!ok) return;
      DATA.equipmentLogs = (DATA.equipmentLogs||[]).filter(d=>d.id!==b.getAttribute('data-id'));
      saveData(true); showToast('تم الحذف'); rerenderCurrentPage();
    });
  }));

  const exp = document.getElementById('btnExportEquip');
  if(exp) exp.addEventListener('click', ()=>{
    downloadCsv('equipment.csv',
      ['الكود','الاسم','النوع','لوحة','شاسيه','ملكية','مشروع','تكلفة/ساعة','حالة','آخر صيانة','صيانة قادمة'],
      filteredEquipment().map(eq=>[
        eq.code, eq.name, eq.typeLabel||labelOf(EQUIPMENT_TYPES,eq.type),
        eq.vehicleNumber, eq.chassisNumber, labelOf(EQUIPMENT_OWNERSHIP,eq.ownership||'owned'),
        eq.project, toInt(eq.hourlyCost), labelOf(EQUIPMENT_STATUS,eq.status),
        eq.lastMaintenance, eq.nextMaintenance
      ]));
    showToast('تم التصدير');
  });

  // أحداث جدول كشف أيام معدة
  if(equipmentFilters.dailyView){
    document.getElementById('btnEqDailyBack')?.addEventListener('click', ()=>{ equipmentFilters.dailyView=false; rerenderCurrentPage(); });
    document.getElementById('btnEqDailyAdd')?.addEventListener('click', ()=> openEquipmentDailyModal());
    const applyG = ()=>{
      equipmentFilters.year = Number(document.getElementById('eqdYear')?.value)||new Date().getFullYear();
      equipmentFilters.month = Number(document.getElementById('eqdMonth')?.value)||(new Date().getMonth()+1);
      equipmentFilters.q = document.getElementById('eqdSearch')?.value||'';
      equipmentFilters.status = document.getElementById('eqdStatus')?.value||'';
      rerenderCurrentPage();
    };
    ['eqdYear','eqdMonth','eqdStatus'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.addEventListener('change', applyG);
    });
    document.getElementById('eqdSearch')?.addEventListener('input', ()=>{ equipmentFilters.q=document.getElementById('eqdSearch').value; rerenderCurrentPage(); });
    document.querySelectorAll('.eqd-cell.empty').forEach(b=> b.addEventListener('click', ()=>{
      const day=Number(b.getAttribute('data-day'));
      const {y,m}=eqDailyMonthBounds();
      const date=y+'-'+String(m).padStart(2,'0')+'-'+String(day).padStart(2,'0');
      openEquipmentDailyModal(b.getAttribute('data-eq'), null, date);
    }));
    document.querySelectorAll('.eqd-cell.filled').forEach(b=> b.addEventListener('click', ()=>{
      openEquipmentDailyModal(null, b.getAttribute('data-id'));
    }));
    document.querySelectorAll('.btn-eqd-add').forEach(b=> b.addEventListener('click', ()=> openEquipmentDailyModal(b.getAttribute('data-eq'))));
    document.querySelectorAll('.btn-eqd-stmt').forEach(b=> b.addEventListener('click', ()=> printEquipmentDailyStatement(b.getAttribute('data-eq'))));
    document.querySelectorAll('.btn-edit-eqd').forEach(b=> b.addEventListener('click', ()=> openEquipmentDailyModal(null, b.getAttribute('data-id'))));
    document.querySelectorAll('.btn-del-eqd').forEach(b=> b.addEventListener('click', ()=>{
      confirmDelete().then(ok=>{ if(!ok) return;
        DATA.equipmentDaily=(DATA.equipmentDaily||[]).filter(d=>d.id!==b.getAttribute('data-id'));
        saveData(true); showToast('تم الحذف'); rerenderCurrentPage();
      });
    }));
  }
}





function renderEquipmentFuelTable(){
  const logs = (DATA.fuelLogs||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0, 40);
  if(!logs.length) return '<p style="color:var(--ink-soft);">لا سجلات وقود — اضغط «صرف وقود»</p>';
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>التاريخ</th><th>المعدة</th><th>المشروع</th><th>السائق</th><th>لتر</th><th>ساعات</th><th>التكلفة</th><th></th></tr></thead>
    <tbody>${logs.map(f=>{
      const eq=getEquipment(f.equipmentId);
      return `<tr>
        <td>${fmtDate(f.date)}</td>
        <td>${escapeHtml(eq?eq.name:'—')}</td>
        <td>${escapeHtml(f.project||'')}</td>
        <td>${escapeHtml(typeof driverName==='function'?driverName(f.driverId):'')}</td>
        <td>${fmtNum(f.liters)}</td>
        <td>${fmtNum(f.hours)}</td>
        <td>${fmtMoney(f.cost)}</td>
        <td><button class="btn btn-outline btn-sm btn-del-fuel" data-id="${f.id}" ${readOnlyMode?'disabled':''}>حذف</button></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}


function openEquipmentModal(editId){
  const eq = editId ? getEquipment(editId) : null;
  const isEdit = !!eq;
  const formAttId = isEdit ? eq.id : uid();
  if(!isEdit && typeof ensureFormDraft==='function') ensureFormDraft('equipment', formAttId);
  openModal(`
    <div class="modal-header">
      <h3>${isEdit?'تعديل مركبة':'إضافة مركبة'}</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>الكود (تلقائي — قابل للتعديل)
          <input class="input" id="eqCode" value="${escapeHtml(eq&&eq.code||(typeof nextEquipmentCode==='function'?nextEquipmentCode():'EQ-001'))}">
        </label>
        <label>نوع الترخيص
          ${typeof equipmentDeptTypeHtml==='function'
            ? equipmentDeptTypeHtml('eqType', eq)
            : (typeof categorySelectHtml==='function'
              ? categorySelectHtml('equipment','eqType', eq&&(eq.departmentId||eq.categoryId||eq.licenseCategory)||'')
              : `<select class="input" id="eqType"><option value="">—</option></select>`)}
          <input type="hidden" id="eqCategory" value="${escapeHtml(eq&&(eq.departmentId||eq.categoryId)||'')}">
        </label>
        <label>نوع السيارة
          <input class="input" id="eqCarType" value="${escapeHtml(eq&&(eq.typeLabel||eq.brand||eq.typeName||'')||'')}" placeholder="مثال: تويوتا / حفار / لودر..." autocomplete="off">
        </label>
        <label>الحالة
          <select class="input" id="eqStatus">${(eq?'':'<option value="" selected>— اختر —</option>')+selectOptions(EQUIPMENT_STATUS, eq?(eq.status||'working'):'__none__')}</select>
        </label>
        <label>الملكية
          <select class="input" id="eqOwnership">${(eq?'':'<option value="" selected>— اختر —</option>')+selectOptions(EQUIPMENT_OWNERSHIP, eq?(eq.ownership||'owned'):'__none__')}</select>
        </label>
        <label>رقم اللوحة
          <input class="input" id="eqVehicleNumber" value="${escapeHtml(eq&&eq.vehicleNumber||'')}" placeholder="أ ب ج 1234">
        </label>
        <label>اللون
          <input class="input" id="eqColor" value="${escapeHtml(eq&&eq.color||'')}">
        </label>
        <label>رقم الماتور
          <input class="input" id="eqMotor" value="${escapeHtml(eq&&eq.motorNumber||'')}">
        </label>
        <label>رقم الشاسيه
          <input class="input" id="eqChassis" value="${escapeHtml(eq&&eq.chassisNumber||'')}">
        </label>
        <label>الرقم التأميني
          <input class="input" id="eqInsNo" value="${escapeHtml(eq&&eq.insuranceNumber||'')}" placeholder="رقم تأمين المعدة / المركبة">
        </label>
        <label>حالة التأمين
          <select class="input" id="eqInsStatus">
            <option value="">—</option>
            ${(typeof selectOptions==='function'?selectOptions(typeof INSURANCE_STATUS_OPTS!=='undefined'?INSURANCE_STATUS_OPTS:[], eq&&eq.insuranceStatus||''):'')}
          </select>
        </label>
        <label>الموديل
          <input class="input" id="eqModel" value="${escapeHtml(eq&&eq.model||'')}">
        </label>
        <label>اسم السائق
          ${entityComboHtml('eqDriver','driver',(function(){ if(!eq) return ''; if(eq.driverId) return eq.driverId; const d=(DATA.drivers||[]).find(x=>x&&eq.driverName&&String(x.name||'').trim()===String(eq.driverName).trim()); return d?d.id:''; })(),'اختر السائق من صفحة السائقين...')}
        </label>
        <label>سعر الشراء
          <input class="input" id="eqPurchasePrice" type="number" min="0" step="0.01" value="${eq?toInt(eq.purchasePrice):0}">
        </label>
        <label>تاريخ الفحص
          <input class="input" id="eqInspection" type="date" value="${escapeHtml(eq&&eq.inspectionDate||'')}">
        </label>
        <label>تاريخ إصدار الرخصة
          <input class="input" id="eqLicIssue" type="date" value="${escapeHtml(eq&&eq.licenseIssueDate||'')}">
        </label>
        <label>تاريخ انتهاء رخصة السيارة
          <input class="input" id="eqVehLicExp" type="date" value="${escapeHtml(eq&&(eq.vehicleLicenseExpiry||eq.licenseExpiry)||'')}">
        </label>
        <label>تاريخ الشراء
          <input class="input" id="eqPurchaseDate" type="date" value="${escapeHtml(eq&&eq.purchaseDate||'')}">
        </label>
        <label>تاريخ آخر صيانة
          <input class="input" id="eqLastMaint" type="date" value="${escapeHtml(eq&&eq.lastMaintenance||'')}">
        </label>
        <label>موعد الصيانة القادمة
          <input class="input" id="eqNextMaint" type="date" value="${escapeHtml(eq&&eq.nextMaintenance||'')}">
        </label>
        ${customFieldsFormHtml('equipment', eq)}
        <label style="grid-column:1/-1;">ملاحظات
          <textarea class="input" id="eqNotes" rows="2">${escapeHtml(eq&&eq.notes||'')}</textarea>
        </label>
        ${typeof formAttachmentsBlockHtml==='function'?formAttachmentsBlockHtml('equipment', formAttId, isEdit?(eq.attachments||[]):[]):''}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveEq">${isEdit?'حفظ التعديلات':'إضافة'}</button>
    </div>
  `);
  if(typeof bindAttachmentHandlers==='function') bindAttachmentHandlers(document.getElementById('appModal'));
  if(typeof bindEntityCombos==='function') bindEntityCombos(document.getElementById('appModal'));
  if(typeof bindExtraFieldsButton==='function') bindExtraFieldsButton('extraFields_equipment');
  
  // منع موعد صيانة قادمة قبل آخر صيانة
  (function(){
    const lastEl = document.getElementById('eqLastMaint');
    const nextEl = document.getElementById('eqNextMaint');
    if(!lastEl || !nextEl) return;
    const sync = ()=>{
      if(lastEl.value) nextEl.min = lastEl.value;
      else nextEl.removeAttribute('min');
      if(lastEl.value && nextEl.value && nextEl.value < lastEl.value) nextEl.value = lastEl.value;
    };
    lastEl.addEventListener('change', sync);
    nextEl.addEventListener('change', ()=>{
      if(lastEl.value && nextEl.value && nextEl.value < lastEl.value){
        showToast('موعد الصيانة القادمة لا يمكن أن يكون قبل تاريخ آخر صيانة');
        nextEl.value = lastEl.value;
      }
    });
    sync();
  })();

  document.getElementById('btnSaveEq').addEventListener('click', ()=>{
    try {
    // نوع الترخيص ← أقسام المعدات + عمود نوع الترخيص
    const typeVal = (document.getElementById('eqType')?.value||'').trim();
    let deptId = '';
    let licenseCat = typeVal;
    if(typeVal && typeof departmentsForKind==='function'){
      const deps = departmentsForKind('equipment')||[];
      const byId = deps.find(d=>d.id===typeVal);
      const byName = deps.find(d=>String(d.name||'').trim()===typeVal);
      if(byId){ deptId = byId.id; licenseCat = byId.name; }
      else if(byName){ deptId = byName.id; licenseCat = byName.name; }
      else if(typeof ensureDepartmentSaved==='function'){
        deptId = ensureDepartmentSaved(typeVal, 'equipment')||'';
        licenseCat = typeVal;
      }
    }
    if(document.getElementById('eqCategory')) document.getElementById('eqCategory').value = deptId;
    // نوع السيارة ← عمود نوع السيارة
    const carType = (document.getElementById('eqCarType')?.value||document.getElementById('eqBrand')?.value||'').trim();
    const typeLabel = carType;
    const brand0 = carType;
    const plate0 = (document.getElementById('eqPlate')?.value||document.getElementById('eqVehicleNumber')?.value||document.getElementById('eqVehicle')?.value||'').trim();
    const name = (document.getElementById('eqName')?.value||'').trim() || [licenseCat, carType, plate0].filter(Boolean).join(' — ') || 'معدة';
    if(!name){ showToast('الاسم مطلوب'); return; }
    const fixed = (EQUIPMENT_TYPES||[]).find(t=>t.code===carType || t.label===carType);
    const _drvId = (document.getElementById('eqDriver')?.value||'').trim();
    const _drvSel = _drvId ? (DATA.drivers||[]).find(x=>x&&x.id===_drvId) : null;
    const payload = {
      code: (typeof ensureUniqueCode==='function'
        ? ensureUniqueCode(document.getElementById('eqCode').value, DATA.equipment, 'EQ-', eq&&eq.id)
        : ((document.getElementById('eqCode').value||'').trim() || nextEquipmentCode())),
      name,
      type: fixed ? fixed.code : 'other',
      typeLabel,
      categoryId: (typeof deptId!=='undefined'&&deptId) ? deptId : (document.getElementById('eqCategory')?.value || ''),
      departmentId: (typeof deptId!=='undefined'&&deptId) ? deptId : (document.getElementById('eqCategory')?.value || ''),
      status: document.getElementById('eqStatus').value || 'working',
      ownership: document.getElementById('eqOwnership').value || 'owned',
      vehicleNumber: (document.getElementById('eqVehicleNumber').value||'').trim(),
      color: (document.getElementById('eqColor')?.value||'').trim(),
      motorNumber: (document.getElementById('eqMotor')?.value||'').trim(),
      chassisNumber: (document.getElementById('eqChassis').value||'').trim(),
      insuranceNumber: (document.getElementById('eqInsNo')?.value||'').trim(),
      insuranceStatus: (document.getElementById('eqInsStatus')?.value||'').trim(),
      brand: (document.getElementById('eqCarType')?.value||document.getElementById('eqBrand')?.value||'').trim(),
      model: (document.getElementById('eqModel').value||'').trim(),
      serial: (document.getElementById('eqSerial')?.value||'').trim(),
      inspectionDate: document.getElementById('eqInspection')?.value || '',
      licenseIssueDate: document.getElementById('eqLicIssue')?.value || '',
      vehicleLicenseExpiry: document.getElementById('eqVehLicExp')?.value || '',
      vehicleLicenseStatus: typeof statusFromExpiry==='function' ? statusFromExpiry(document.getElementById('eqVehLicExp')?.value||'') : '',
      licenseCategory: (typeof licenseCat!=='undefined' && licenseCat) ? licenseCat : '',
      driverId: _drvSel ? _drvSel.id : '',
      driverName: _drvSel ? (_drvSel.name||'') : '',
      driverLicenseExpiry: _drvSel ? (_drvSel.licenseExpiry||'') : '',
      driverLicenseStatus: (_drvSel && _drvSel.licenseExpiry && typeof statusFromExpiry==='function') ? statusFromExpiry(_drvSel.licenseExpiry) : '',
      hourlyCost: toInt(eq ? eq.hourlyCost : 0),
      purchaseDate: document.getElementById('eqPurchaseDate').value || '',
      purchasePrice: toInt(document.getElementById('eqPurchasePrice').value),
      lastMaintenance: (function(){
        const last = document.getElementById('eqLastMaint').value || '';
        const next = document.getElementById('eqNextMaint').value || '';
        if(last && next && next < last){
          showToast('موعد الصيانة القادمة لا يمكن أن يكون قبل تاريخ آخر صيانة');
          throw new Error('maint-date');
        }
        return last;
      })(),
      nextMaintenance: document.getElementById('eqNextMaint').value || '',
      notes: (document.getElementById('eqNotes').value||'').trim(),
      extraFields: typeof collectExtraFieldsForSave==='function' ? collectExtraFieldsForSave('extraFields_equipment') : [],
      attachments: isEdit ? ((eq && eq.attachments) || []) : (typeof takeFormDraftAttachments==='function' ? takeFormDraftAttachments('equipment', formAttId) : [])
    };
    if(typeLabel) ensureEquipmentTypeSaved(typeLabel);
    // typeLabel = نوع السيارة، licenseCat = نوع الترخيص
    // تزامن حقول بديلة مستخدمة في التنبيهات والعرض
    if(payload.vehicleNumber) payload.plate = payload.vehicleNumber;
    if(payload.vehicleLicenseExpiry) payload.licenseExpiry = payload.vehicleLicenseExpiry;
    if(payload.vehicleLicenseStatus) payload.licenseStatus = payload.vehicleLicenseStatus;
    const commitEq = ()=>{
      if(isEdit){
        Object.assign(eq, payload);
        addAudit('تعديل معدة', name);
      } else {
        payload.id = uid();
        DATA.equipment.push(payload);
        addAudit('إضافة معدة', name);
      }
      DATA.equipment = sortByNameAr(DATA.equipment, x=>x.name);
      saveData(true);
      closeModal();
      showToast(isEdit?'تم التعديل':'تمت الإضافة');
      if(typeof goToPage==='function') goToPage('equipment');
      else rerenderCurrentPage();
    };
    if(typeof guardEntityDuplicates==='function'){
      guardEntityDuplicates('equipment', payload, isEdit && eq ? eq.id : null).then(ok=>{ if(ok) commitEq(); });
    } else commitEq();
    } catch(err){
      if(err && err.message==='maint-date') return;
      console.error(err);
      showToast('تعذر الحفظ: '+(err.message||err));
    }
  });
}



/* ---- جدول كشف أيام معدة الشهري + كشف يومية ---- */
function eqDailyMonthBounds(){
  const f = equipmentFilters || {};
  let y = Number(f.year) || new Date().getFullYear();
  let m = Number(f.month) || (new Date().getMonth()+1);
  if(m<1) m=1; if(m>12) m=12;
  const last = new Date(y, m, 0).getDate();
  const from = y+'-'+String(m).padStart(2,'0')+'-01';
  const to = y+'-'+String(m).padStart(2,'0')+'-'+String(last).padStart(2,'0');
  return { y, m, last, from, to };
}

function renderEquipmentDailyGrid(){
  if(!equipmentFilters.year) equipmentFilters.year = new Date().getFullYear();
  if(!equipmentFilters.month) equipmentFilters.month = new Date().getMonth()+1;
  const { y, m, last, from, to } = eqDailyMonthBounds();
  const days = Array.from({length:last}, (_,i)=>i+1);
  let list = (DATA.equipment||[]).slice();
  if(equipmentFilters.q){
    const q = equipmentFilters.q.trim().toLowerCase();
    list = list.filter(eq => (eq.name||'').toLowerCase().includes(q) || (eq.code||'').toLowerCase().includes(q) || (eq.plate||'').toLowerCase().includes(q));
  }
  if(equipmentFilters.status) list = list.filter(eq => eq.status === equipmentFilters.status);
  list = sortByNameAr(list, eq=>eq.name);

  function cellLog(eqId, day){
    const date = y+'-'+String(m).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    return (DATA.equipmentDaily||[]).find(d => d.equipmentId===eqId && d.date===date) || null;
  }

  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <button class="btn btn-outline btn-sm" id="btnEqDailyBack">← رجوع للمعدات</button>
          <h2 class="page-title" style="margin:10px 0 0;">جدول كشف أيام معدة</h2>
          <p class="page-sub" style="margin:4px 0 0;">علامة تحت اليوم = تشغيل · اضغط للتعديل · كشف يومية لكل معدة</p>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="btnEqDailyAdd" ${readOnlyMode?'disabled':''}>+ يومية معدة</button>
        </div>
      </div>
      <div class="filters-bar">
        <select id="eqdYear" class="input" style="width:100px;">
          ${[y-1,y,y+1].map(yy=>`<option value="${yy}" ${yy===y?'selected':''}>${yy}</option>`).join('')}
        </select>
        <select id="eqdMonth" class="input" style="min-width:120px;">
          ${[1,2,3,4,5,6,7,8,9,10,11,12].map(mm=>`<option value="${mm}" ${mm===m?'selected':''}>${typeof monthNameAr==='function'?monthNameAr(mm):mm}</option>`).join('')}
        </select>
        <input type="search" id="eqdSearch" class="input" placeholder="بحث معدة..." value="${escapeHtml(equipmentFilters.q||'')}" style="min-width:160px;">
        <select id="eqdStatus" class="input"><option value="">كل الحالات</option>${selectOptions(EQUIPMENT_STATUS, equipmentFilters.status)}</select>
      </div>
      <div class="table-wrap" style="overflow:auto;">
        <table class="data-table" style="min-width:${160+last*34}px;font-size:12px;">
          <thead>
            <tr>
              <th style="position:sticky;right:0;background:var(--paper);z-index:2;min-width:150px;">المعدة</th>
              ${days.map(d=>`<th style="text-align:center;padding:4px;min-width:28px;">${d}</th>`).join('')}
              <th>ساعات</th>
              <th>تكلفة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${list.length? list.map(eq=>{
              const logs = (DATA.equipmentDaily||[]).filter(d=>d.equipmentId===eq.id && (d.date||'')>=from && (d.date||'')<=to);
              const hours = logs.reduce((s,d)=>s+(Number(d.hours)||0),0);
              const cost = toInt(logs.reduce((s,d)=>s+equipmentDailyCost(d,eq),0));
              return `<tr>
                <td style="position:sticky;right:0;background:var(--paper);z-index:1;">
                  <strong>${escapeHtml(eq.name||'')}</strong>
                  <div style="font-size:11px;color:var(--ink-soft);">${escapeHtml(eq.code||'')}</div>
                </td>
                ${days.map(d=>{
                  const log = cellLog(eq.id, d);
                  if(!log){
                    return `<td style="text-align:center;padding:2px;">
                      <button type="button" class="eqd-cell empty" data-eq="${eq.id}" data-day="${d}" title="تسجيل يومية" ${readOnlyMode?'disabled':''}
                        style="border:none;background:transparent;cursor:pointer;width:100%;min-height:28px;color:var(--ink-soft);">·</button>
                    </td>`;
                  }
                  const h = Number(log.hours)||0;
                  const mark = h ? (h>=8?'✓':String(Math.round(h))) : '✓';
                  const title = h+'س · وقود '+(log.fuelLiters||0)+'ل · '+fmtMoney(equipmentDailyCost(log,eq));
                  return `<td style="text-align:center;padding:2px;">
                    <button type="button" class="eqd-cell filled" data-id="${log.id}" data-eq="${eq.id}" data-day="${d}" title="${title}"
                      style="border:none;background:transparent;cursor:pointer;font-weight:800;color:var(--ok,#2d6a4f);width:100%;min-height:28px;">${mark}</button>
                  </td>`;
                }).join('')}
                <td><strong>${fmtNum(Math.round(hours*10)/10)}</strong></td>
                <td><strong>${fmtMoney(cost)}</strong></td>
                <td style="white-space:nowrap;">
                  <button class="btn btn-outline btn-sm btn-eqd-add" data-eq="${eq.id}" ${readOnlyMode?'disabled':''}>+</button>
                  <button class="btn btn-outline btn-sm btn-eqd-stmt" data-eq="${eq.id}">كشف</button>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="${last+4}" style="text-align:center;color:var(--ink-soft);padding:28px;">لا معدات</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="section-title" style="margin-top:20px;">سجلات الشهر (تعديل / حذف)</div>
      ${renderEquipmentDailyList(from, to)}
    </div>`;
}

function renderEquipmentDailyList(from, to){
  let logs = (DATA.equipmentDaily||[]).filter(d=>(d.date||'')>=from && (d.date||'')<=to);
  logs.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const pg = paginateRows(logs, 'equipmentDaily');
  return `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>التاريخ</th><th>المعدة</th><th>المشروع</th><th>ساعات</th><th>وقود</th><th>تكلفة</th><th>إنتاجية</th><th></th></tr></thead>
      <tbody>
        ${pg.pageRows.length? pg.pageRows.map(d=>{
          const eq = getEquipment(d.equipmentId);
          return `<tr>
            <td>${fmtDate(d.date)}</td>
            <td>${escapeHtml(eq?eq.name:'—')}</td>
            <td>${escapeHtml(d.project||'')}</td>
            <td>${fmtNum(d.hours)}</td>
            <td>${fmtNum(d.fuelLiters)} ل</td>
            <td><strong>${fmtMoney(equipmentDailyCost(d,eq))}</strong></td>
            <td>${escapeHtml(d.productivity||'—')}</td>
            <td style="white-space:nowrap;">
              <button class="btn btn-outline btn-sm btn-edit-eqd" data-id="${d.id}">تعديل</button>
              <button class="btn btn-outline btn-sm btn-del-eqd" data-id="${d.id}" ${readOnlyMode?'disabled':''}>حذف</button>
            </td>
          </tr>`;
        }).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--ink-soft);">لا يوميات في الشهر</td></tr>'}
      </tbody>
    </table></div>
    ${tablePagerHtml('equipmentDaily', pg)}`;
}

function printEquipmentDailyStatement(equipmentId, from, to){
  const eq = getEquipment(equipmentId);
  if(!eq){ showToast('المعدة غير موجودة'); return; }
  if(!from || !to){
    const { from:f, to:t } = eqDailyMonthBounds();
    from = from || f; to = to || t;
  }
  const logs = (DATA.equipmentDaily||[]).filter(d=>d.equipmentId===equipmentId && (!from||(d.date||'')>=from) && (!to||(d.date||'')<=to))
    .slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const totalH = logs.reduce((s,d)=>s+(Number(d.hours)||0),0);
  const totalF = logs.reduce((s,d)=>s+(Number(d.fuelLiters)||0),0);
  const totalC = toInt(logs.reduce((s,d)=>s+equipmentDailyCost(d,eq),0));
  const co = DATA.settings||{};
  const rows = logs.map(d=>{
    const cost = equipmentDailyCost(d, eq);
    return `<tr>
      <td>${fmtDate(d.date)}</td>
      <td>${escapeHtml(d.project||'')}</td>
      <td>${fmtNum(d.hours)}</td>
      <td>${fmtNum(d.fuelLiters)}</td>
      <td>${fmtMoney(d.hourlyCost!=null?d.hourlyCost:eq.hourlyCost)}</td>
      <td>${fmtMoney(cost)}</td>
      <td>${escapeHtml(d.productivity||'')}</td>
      <td>${escapeHtml(d.notes||'')}</td>
    </tr>`;
  }).join('');
  const periodLine = `الفترة: ${fmtDate(from)} → ${fmtDate(to)}`;
  printHtml(`
    <div class="print-sheet">
      ${typeof statementHeaderHtml==='function'?statementHeaderHtml('كشف أيام معدة', periodLine):''}
      <table>
        <tr><th>المعدة</th><td>${escapeHtml(eq.name||'')}</td><th>الكود</th><td>${escapeHtml(eq.code||'')}</td></tr>
        <tr><th>النوع</th><td>${escapeHtml(eq.typeLabel||eq.type||'')}</td><th>اللوحة</th><td>${escapeHtml(eq.plate||'—')}</td></tr>
        <tr><th>المشروع الحالي</th><td>${escapeHtml(eq.project||'—')}</td><th>حالة</th><td>${escapeHtml(labelOf(EQUIPMENT_STATUS,eq.status))}</td></tr>
        <tr><th>إجمالي الساعات</th><td>${fmtNum(Math.round(totalH*10)/10)}</td><th>إجمالي الوقود</th><td>${fmtNum(totalF)} لتر</td></tr>
        <tr><th>إجمالي تكلفة التشغيل</th><td colspan="3"><strong>${fmtMoney(totalC)}</strong></td></tr>
      </table>
      <h4 style="margin-top:18px;">تفصيل اليومية</h4>
      <table>
        <thead><tr><th>التاريخ</th><th>المشروع</th><th>ساعات</th><th>وقود (ل)</th><th>يومية / ساعة</th><th>تكلفة اليوم</th><th>إنتاجية</th><th>ملاحظات</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center;">لا سجلات</td></tr>'}</tbody>
        <tfoot><tr><th colspan="2">الإجمالي</th><th>${fmtNum(Math.round(totalH*10)/10)}</th><th>${fmtNum(totalF)}</th><th></th><th>${fmtMoney(totalC)}</th><th colspan="2"></th></tr></tfoot>
      </table>
      ${typeof paymentsStatementBlock==='function'?paymentsStatementBlock('equipment', equipmentId, from, to):''}
      ${typeof statementFooterHtml==='function'?statementFooterHtml():''}
    </div>
  `, 'كشف أيام معدة', { statement:true, brand:false });
}

/** يومية معدة: معدة → مشروع → ساعات → وقود → إنتاجية → تكلفة */
function openEquipmentDailyModal(equipmentId, editId, presetDate){
  const existing = editId ? (DATA.equipmentDaily||[]).find(x=>x.id===editId) : null;
  const eid0 = existing ? existing.equipmentId : (equipmentId||'');
  const date0 = existing ? (existing.date||todayISO()) : (presetDate || todayISO());
  openModal(`
    <div class="modal-header">
      <h3>${existing?'تعديل يومية معدة':'يومية تشغيل معدة'}</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>المعدة *
          <div id="edEqBox">${typeof entityComboHtml==='function'?entityComboHtml('edEq','equipment',eid0||'','اكتب اسم المعدة أو الكود...'):`<select class="input" id="edEq">${equipmentOptions(eid0)}</select>`}</div>
        </label>
        <label>التاريخ *
          <input class="input" id="edDate" type="date" value="${escapeHtml(date0)}">
        </label>
        <label>المشروع / الموقع *
          ${typeof projectInputHtml==='function'?projectInputHtml('edProject', (existing&&existing.project)||'','edProjList'):'<input class="input" id="edProject">'}
        </label>
        <label>نوع اليوم
          <select class="input" id="edKind">
            <option value="work" ${!existing||existing.kind==='work'?'selected':''}>تشغيل</option>
            <option value="idle" ${existing&&existing.kind==='idle'?'selected':''}>توقف</option>
            <option value="move" ${existing&&existing.kind==='move'?'selected':''}>نقل</option>
          </select>
        </label>
        <label>عدد الأيام المحسوبة *
          <input class="input" id="edDays" type="number" min="0" step="0.5" value="${existing && existing.days!=null ? Number(existing.days) : 1}">
          <small style="display:block;color:var(--ink-soft);margin-top:4px;">مثل العمال: 1 أو 0.5 أو 2</small>
        </label>
        <label>سعر اليومية (ج.م)
          <input class="input" id="edDaily" type="number" min="0" step="0.01" value="${existing?toInt(existing.dailyCost):0}">
        </label>
        <label>ساعات التشغيل
          <input class="input" id="edHours" type="number" min="0" step="0.5" value="${existing?Number(existing.hours)||0:0}">
        </label>
        <label>تكلفة الساعة (ج.م)
          <input class="input" id="edHourly" type="number" min="0" step="0.01" value="${existing?toInt(existing.hourlyCost):0}">
        </label>
        <label>وقود (لتر)
          <input class="input" id="edFuel" type="number" min="0" step="0.1" value="${existing?Number(existing.fuelLiters)||0:0}">
        </label>
        <label>سعر اللتر (ج.م)
          <input class="input" id="edFuelPrice" type="number" min="0" step="0.01" value="${existing?toInt(existing.fuelPrice):toInt(DATA.settings&&DATA.settings.defaultFuelPrice)}">
        </label>
        <label>تكلفة إضافية
          <input class="input" id="edExtra" type="number" min="0" step="0.01" value="${existing?toInt(existing.extraCost):0}">
        </label>
        <label>الإنتاجية
          <input class="input" id="edProd" value="${escapeHtml(existing&&existing.productivity||'')}">
        </label>
        <label style="grid-column:1/-1;">ملاحظات
          <textarea class="input" id="edNotes" rows="4">${escapeHtml(existing&&existing.notes||'')}</textarea>
        </label>
      </div>
      <div style="margin-top:12px;padding:10px;border-radius:8px;background:var(--paper-2);border:1px solid var(--line);font-weight:700;">
        تكلفة اليوم التقريبية: <span id="edCostVal">0</span> ج.م
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      ${existing?`<button class="btn btn-outline" id="btnDelEd" style="color:var(--debt);">حذف</button>`:''}
      <button class="btn btn-primary" id="btnSaveEd">${existing?'حفظ التعديل':'حفظ اليومية'}</button>
    </div>
  `);
  if(typeof bindEntityCombos==='function') bindEntityCombos(document.getElementById('appModal'));
  document.getElementById('edEq_text')?.addEventListener('change', ()=> fillFromEq());
  function fillFromEq(){
    const eq = getEquipment(document.getElementById('edEq')?.value);
    if(!eq) return;
    if(!existing || !toInt(document.getElementById('edHourly').value))
      document.getElementById('edHourly').value = toInt(eq.hourlyCost);
    if(document.getElementById('edDaily') && (!existing || !toInt(document.getElementById('edDaily').value)))
      document.getElementById('edDaily').value = toInt(eq.dailyCost);
    refreshCost();
  }
  function refreshCost(){
    const days = Number(document.getElementById('edDays') && document.getElementById('edDays').value) || 0;
    const daily = toInt(document.getElementById('edDaily') && document.getElementById('edDaily').value);
    const hours = Number(document.getElementById('edHours').value)||0;
    const fuel = Number(document.getElementById('edFuel').value)||0;
    const hourly = toInt(document.getElementById('edHourly').value);
    const fp = toInt(document.getElementById('edFuelPrice').value);
    const extra = toInt(document.getElementById('edExtra').value);
    const total = toInt(Math.round(days*daily) + Math.round(hours*hourly) + Math.round(fuel*fp) + extra);
    const el = document.getElementById('edCostVal');
    if(el) el.textContent = fmtNum(total);
  }
  document.getElementById('edEq').addEventListener('change', fillFromEq);
  ['edDays','edDaily','edHours','edFuel','edHourly','edFuelPrice','edExtra'].forEach(id=>{
    const el = document.getElementById(id);
    if(el){ el.addEventListener('input', refreshCost); el.addEventListener('change', refreshCost); }
  });
  if(eid0) fillFromEq(); else refreshCost();
  document.getElementById('btnDelEd')?.addEventListener('click', ()=>{
    if(!existing) return;
    confirmDelete().then(ok=>{ if(!ok) return;
      DATA.equipmentDaily = (DATA.equipmentDaily||[]).filter(d=>d.id!==existing.id);
      saveData(true); closeModal(); showToast('تم الحذف'); rerenderCurrentPage();
    });
  });
  document.getElementById('btnSaveEd').addEventListener('click', ()=>{
    try {
    const eid = document.getElementById('edEq').value;
    const date = document.getElementById('edDate').value;
    let project = (document.getElementById('edProject').value||'').trim();
    const hours = Number(document.getElementById('edHours').value)||0;
    if(!eid){ showToast('اختر المعدة'); return; }
    if(!date){ showToast('حدد التاريخ'); return; }
    if(!project){ showToast('اختر المشروع'); return; }
    const daysVal = Number(document.getElementById('edDays') && document.getElementById('edDays').value) || 0;
    const payload = {
      equipmentId: eid,
      date,
      project,
      kind: document.getElementById('edKind').value||'work',
      days: daysVal,
      dailyCost: toInt(document.getElementById('edDaily') && document.getElementById('edDaily').value),
      hours,
      fuelLiters: Number(document.getElementById('edFuel').value)||0,
      hourlyCost: toInt(document.getElementById('edHourly').value),
      fuelPrice: toInt(document.getElementById('edFuelPrice').value),
      extraCost: toInt(document.getElementById('edExtra').value),
      productivity: (document.getElementById('edProd').value||'').trim(),
      notes: (document.getElementById('edNotes').value||'').trim()
    };
    if(project) ensureProjectSaved(project);
    DATA.equipmentDaily = DATA.equipmentDaily || [];
    const eq = getEquipment(eid);
    if(existing){
      Object.assign(existing, payload);
      addAudit('تعديل يومية معدة', (eq?eq.name:eid)+' — '+date);
    } else {
      payload.id = uid();
      DATA.equipmentDaily.push(payload);
      if(eq){
        eq.totalHours = toInt((Number(eq.totalHours)||0) + hours);
        if(eq.status==='available'||eq.status==='stopped') eq.status = 'working';
      }
      addAudit('يومية معدة', (eq?eq.name:eid)+' — '+project+' — '+hours+'س');
    }
    saveData(true);
    closeModal();
    showToast('تم الحفظ — التكلفة '+fmtMoney(equipmentDailyCost(existing||payload, eq)));
    rerenderCurrentPage();
    } catch(err){
      console.error(err);
      showToast('تعذر حفظ اليومية: '+(err.message||err));
    }
  });
}


function openEquipLogModal(equipmentId){
  openModal(`
    <div class="modal-header">
      <h3>صيانة وقطع غيار</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>المعدة *<div id="elogEqBox">${typeof entityComboHtml==='function'?entityComboHtml('elogEq','equipment',equipmentId||'','اكتب اسم المعدة...'):`<select class="input" id="elogEq">${equipmentOptions(equipmentId||'')}</select>`}</div></label>
        <label>التاريخ<input class="input" id="elogDate" type="date" value="${todayISO()}"></label>
        <label>النوع
          <select class="input" id="elogType">${selectOptions((EQUIP_LOG_TYPES||[]).filter(t=>/maint|repair|part|spare|صيان|قطع/i.test(String(t.code||'')+String(t.label||''))), 'maintenance')}</select>
        </label>
        <label>التكلفة (ج.م)
          <input class="input" id="elogCost" type="number" min="0" step="0.01" value="0">
        </label>
        <label style="grid-column:1/-1;">قطع الغيار
          <input class="input" id="elogParts" placeholder="فلتر زيت، تيل فرامل...">
        </label>
        <label style="grid-column:1/-1;">ملاحظات / وصف العطل
          <textarea class="input" id="elogNotes" rows="2"></textarea>
        </label>
        <label style="grid-column:1/-1;">
          <span style="display:flex;align-items:center;gap:8px;">
            <input type="checkbox" id="elogUpdateMaint" checked style="width:auto;min-height:auto;">
            تحديث تاريخ آخر صيانة على بطاقة المعدة
          </span>
        </label>
        <label>تحديد الصيانة القادمة
          <input class="input" id="elogNext" type="date">
        </label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveElog">حفظ</button>
    </div>
  `);
  document.getElementById('btnSaveElog').addEventListener('click', ()=>{
    const eid = document.getElementById('elogEq').value;
    if(!eid){ showToast('اختر المعدة'); return; }
    const type = document.getElementById('elogType').value||'maintenance';
    const date = document.getElementById('elogDate').value||todayISO();
    const payload = {
      id: uid(),
      equipmentId: eid,
      date,
      type,
      cost: toInt(document.getElementById('elogCost').value),
      parts: (document.getElementById('elogParts').value||'').trim(),
      notes: (document.getElementById('elogNotes').value||'').trim()
    };
    DATA.equipmentLogs = DATA.equipmentLogs || [];
    DATA.equipmentLogs.push(payload);
    const eq = getEquipment(eid);
    if(eq){
      if(document.getElementById('elogUpdateMaint').checked && (type==='maintenance'||type==='repair'||type==='parts')){
        eq.lastMaintenance = date;
      }
      const next = document.getElementById('elogNext').value;
      if(next) eq.nextMaintenance = next;
      if(type==='fault') eq.status = 'broken';
      if(type==='maintenance') eq.status = 'maintenance';
    }
    // صيانة / قطع غيار → مصروف في صفحة المصاريف
    if(type==='maintenance' || type==='repair' || type==='parts' || type==='spare'){
      const cost = toInt(payload.cost);
      if(cost > 0){
        DATA.expenses = DATA.expenses || [];
        const itemName = type==='parts'||type==='spare' ? ('قطع غيار: '+(payload.parts||'')) : ('صيانة: '+(payload.parts||payload.notes||''));
        DATA.expenses.push({
          id: uid(),
          date,
          personKind: 'equipment',
          personId: eid,
          amount: cost,
          type: type==='parts'||type==='spare' ? 'قطع غيار' : 'صيانة',
          section: 'معدات ومركبات',
          notes: (payload.notes||'') + (payload.parts?(' | '+payload.parts):''),
          items: [{ name: itemName || (type==='parts'?'قطع غيار':'صيانة'), amount: cost }],
          equipmentLogId: payload.id
        });
      }
    }
    addAudit('سجل معدة', (eq?eq.name:eid)+' — '+(typeof labelOf==='function'?labelOf(EQUIP_LOG_TYPES,type):type));
    saveData(true);
    closeModal();
    showToast('تم الحفظ'+(toInt(payload.cost)>0 && (type==='maintenance'||type==='repair'||type==='parts')?' — أُضيف للمصاريف':''));
    rerenderCurrentPage();
  });
}
