/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — pages-reports.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */
/* ---------------- Periodic Reports (quarterly / annual — all invoices) ---------------- */
function invoiceYear(dateStr){ if(!dateStr) return null; const d=new Date(dateStr); return isNaN(d)?null:d.getFullYear(); }
function availableReportYears(){
  const set = new Set();
  DATA.ledger.invoices.forEach(i=>{ const y=invoiceYear(i.date); if(y) set.add(y); });
  set.add(new Date().getFullYear());
  return Array.from(set).sort((a,b)=>b-a);
}
const REPORT_PERIODS = [
  {key:'Q1', label:'الربع الأول', months:'يناير - مارس'},
  {key:'Q2', label:'الربع الثاني', months:'أبريل - يونيو'},
  {key:'Q3', label:'الربع الثالث', months:'يوليو - سبتمبر'},
  {key:'Q4', label:'الربع الرابع', months:'أكتوبر - ديسمبر'},
  {key:'ALL', label:'السنة كاملة', months:'يناير - ديسمبر'}
];
function periodicReportInvoices(year, periodKey){
  const qNum = periodKey==='ALL' ? null : Number(periodKey.slice(1));
  return DATA.ledger.invoices.filter(i=>{
    const q = getQuarter(i.date);
    if(!q || q.year!==year) return false;
    return qNum===null || q.quarter===qNum;
  }).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
}
function lgRenderReportsPage(){
  const years = availableReportYears();
  if(!reportsYear || !years.includes(reportsYear)) reportsYear = years[0];
  const invs = getVisiblePeriodicInvoices();
  const totalBase = invs.reduce((a,b)=>a+Number(b.baseValue||0),0);
  const totalVat = invs.reduce((a,b)=>a+Number(b.vat||0),0);
  const totalStamp = invs.reduce((a,b)=>a+Number(b.stampDuty||0),0);
  const totalW = invs.reduce((a,b)=>a+Number(b.withheld||0),0);
  const totalNet = invs.reduce((a,b)=>a+invoiceSignedNet(b),0);
  const pg = lgPaginateRows(invs, 'reports');

  return `
    <h2 class="page-title">التقارير الدورية للفواتير</h2>
    <p class="page-sub">توزيع كل الفواتير على أرباع السنة حسب تاريخ كل فاتورة، مع إمكانية عرض فواتير سنة كاملة وتصديرها إلى Excel</p>
    <div class="filters-row">
      <div class="field"><label>السنة</label><select id="reportsYearSel">${years.map(y=>`<option value="${y}" ${y===reportsYear?'selected':''}>${y}</option>`).join('')}</select></div>
      <div class="field"><label>من تاريخ (اختياري)</label><input type="date" id="reportsFromInput" value="${lgEscapeHtml(reportsFrom||'')}"></div>
      <div class="field"><label>إلى تاريخ (اختياري)</label><input type="date" id="reportsToInput" value="${lgEscapeHtml(reportsTo||'')}"></div>
      ${(reportsFrom||reportsTo)?'<button class="btn btn-outline btn-sm" id="reportsClearDates" style="align-self:flex-end;">مسح فلتر التاريخ</button>':''}
      ${pfTextField('reports','q','بحث','مورد، رقم ضريبي، رقم فاتورة، بيان، تصنيف، مشروع، مبلغ... (كلمات متعددة = كلها مطلوبة)', reportsFilters.q)}
      ${pfSupplierCombo('reports', reportsFilters)}
      ${pfMonthSelect('reports', reportsFilters.month)}
      ${pfDistinctSelect('reports','category','التصنيف','كل التصنيفات',(DATA.ledger.invoices||[]).map(i=>i.category), reportsFilters.category)}
      ${pfDistinctSelect('reports','project','المشروع','كل المشاريع',(DATA.ledger.invoices||[]).map(i=>i.project), reportsFilters.project)}
      ${pfSelect('reports','kind','النوع',[['','فواتير ومرتجعات'],['invoice','فواتير فقط'],['return','مرتجعات فقط']], reportsFilters.kind)}
      ${pfSelect('reports','status','الحالة',PF_STATUS_INVOICES, reportsFilters.status)}
      ${pfSelect('reports','withheld','الخصم',[['','الكل'],['yes','عليها خصم'],['no','بدون خصم']], reportsFilters.withheld)}
      ${pfAmountFields('reports', reportsFilters, 'صافي الفاتورة من')}
      ${pfSelect('reports','sort','الترتيب',PF_SORT_INVOICES, reportsFilters.sort)}
      ${pfResetBtn('reports')}
    </div>
    <div class="quarter-tabs">
      ${REPORT_PERIODS.map(p=>`<button class="qtab ${p.key===reportsPeriod?'active':''}" data-rkey="${p.key}">${p.label}${p.key!=='ALL'?` <span style="opacity:.7;font-weight:400;">(${p.months})</span>`:''}</button>`).join('')}
    </div>
    <div class="stats-row" style="grid-template-columns:repeat(5,1fr);margin-top:14px;">
      <div class="stat-card"><div class="num">${invs.length}</div><div class="lbl">عدد الفواتير</div></div>
      <div class="stat-card"><div class="num">${fmt(totalBase)}</div><div class="lbl">إجمالي القيمة</div></div>
      <div class="stat-card"><div class="num">${fmt(totalVat)}</div><div class="lbl">إجمالي الضريبة</div></div>
      <div class="stat-card debt"><div class="num">${fmt(totalW)}</div><div class="lbl">إجمالي المخصوم</div></div>
      <div class="stat-card"><div class="num">${fmt(totalNet)}</div><div class="lbl">إجمالي الصافي (بعد خصم المرتجعات)</div></div>
    </div>
    <div class="btn-row" style="margin:14px 0;">
      <button class="btn btn-gold" id="exportPeriodicReportCsvBtn" title="يصدّر نتائج الفترة الظاهرة">تصدير Excel (النتائج الظاهرة)</button>
    </div>
    <div class="table-wrap"><table>
      <thead>${invoiceTableTheadHtml()}</thead>
      <tbody>
        ${pg.pageRows.length?pg.pageRows.map(i=> invoiceTableRowHtml(i)).join(''):`<tr><td colspan="${invoiceTableColspan()}" class="table-empty">لا توجد فواتير في هذه الفترة${pfActiveCount('reports')?' — تأكد من الفلاتر أو اضغط «مسح الفلاتر»':''}</td></tr>`}
      </tbody>
    </table>
    </div>
    ${lgTablePagerHtml('reports', pg)}
    <div class="ast-summary" style="margin-top:12px;">
      <div class="box"><div class="v">${fmt(totalBase)}</div><div class="l">إجمالي القيمة</div></div>
      <div class="box"><div class="v">${fmt(totalW)}</div><div class="l">إجمالي المخصوم</div></div>
      <div class="box"><div class="v">${fmt(totalNet)}</div><div class="l">إجمالي الصافي</div></div>
    </div>
  `;
}
function getVisiblePeriodicInvoices(){
  let invs = typeof periodicReportInvoices==='function'
    ? periodicReportInvoices(reportsYear, reportsPeriod)
    : (DATA.ledger.invoices||[]).slice();
  if(reportsFrom) invs = invs.filter(i=>i.date && i.date>=reportsFrom);
  if(reportsTo) invs = invs.filter(i=>i.date && i.date<=reportsTo);
  return filterInvoicesBy(invs, reportsFilters, 'new');
}
function exportPeriodicReportCsv(){
  const invs = getVisiblePeriodicInvoices();
  if(!invs.length){ lgShowToast('لا فواتير مطابقة للفترة الظاهرة'); return; }
  exportExcelFile(`تقرير-فواتير-${reportsYear}-${reportsPeriod}.xlsx`, 'التقرير', invoiceExportHeaders(), invs.map(invoiceExportRow));
  if(typeof logAction==='function') logAction('تصدير تقرير دوري', String(reportsYear)+'-'+String(reportsPeriod)+' — '+invs.length);
  lgShowToast('تم تصدير '+invs.length+' فاتورة (الفترة الظاهرة)');
}

