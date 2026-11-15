/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — pages-quarterly.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */
/* ---------------- Quarterly Withholding Report ---------------- */
const QUARTERLY_PERIODS = [
  {key:'Q1', label:'الربع الأول', months:'يناير - مارس', q:1},
  {key:'Q2', label:'الربع الثاني', months:'أبريل - يونيو', q:2},
  {key:'Q3', label:'الربع الثالث', months:'يوليو - سبتمبر', q:3},
  {key:'Q4', label:'الربع الرابع', months:'أكتوبر - ديسمبر', q:4},
  {key:'ALL', label:'السنة كاملة', months:'يناير - ديسمبر', q:null}
];
function availableQuarterlyYears(){
  const set = new Set();
  DATA.ledger.invoices.forEach(i=>{
    if(i.isReturn || Number(i.withheld||0)<=0) return;
    const q = getQuarter(i.date);
    if(q) set.add(q.year);
  });
  set.add(new Date().getFullYear());
  return Array.from(set).sort((a,b)=>b-a);
}
/** فواتير إشعارات الخصم حسب السنة والربع (أو السنة كاملة) + فلاتر التاريخ */
function quarterlyInvoices(year, periodKey){
  const meta = QUARTERLY_PERIODS.find(p=>p.key===periodKey);
  const qNum = meta && meta.q != null ? meta.q : null;
  return DATA.ledger.invoices.filter(i=>{
    if(i.isReturn || i.cancelled || Number(i.withheld||0)<=0) return false;
    const q = getQuarter(i.date);
    if(!q || q.year!==year) return false;
    if(qNum != null && q.quarter!==qNum) return false;
    if(quarterlyFilters.from && (!i.date || i.date<quarterlyFilters.from)) return false;
    if(quarterlyFilters.to && (!i.date || i.date>quarterlyFilters.to)) return false;
    return true;
  }).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
}
/** الفواتير الظاهرة حالياً في الصفحة (بعد فلتر البحث) — للاستخدام في التصدير */
function getVisibleQuarterlyInvoices(){
  const base = quarterlyInvoices(quarterlyYear, quarterlyPeriod);
  return filterInvoicesBy(base, quarterlyFilters, 'old');
}
function renderQuarterlyPage(){
  const years = availableQuarterlyYears();
  if(!quarterlyYear || !years.includes(quarterlyYear)) quarterlyYear = years[0];
  if(!QUARTERLY_PERIODS.find(p=>p.key===quarterlyPeriod)) quarterlyPeriod = 'Q1';
  const periodMeta = QUARTERLY_PERIODS.find(p=>p.key===quarterlyPeriod);
  if(quarterlyPeriod === 'ALL'){
    activeQuarterKey = quarterlyYear + '-ALL';
  } else {
    activeQuarterKey = quarterlyYear + '-' + (periodMeta && periodMeta.q != null ? periodMeta.q : 1);
  }

  const invs = getVisibleQuarterlyInvoices();
  const total = invs.reduce((a,b)=>a+noticeAmountsFor(b).baseValue,0);
  const totalW = invs.reduce((a,b)=>a+noticeAmountsFor(b).withheld,0);
  const pgQ = lgPaginateRows(invs, 'quarterly');
  const periodLabel = periodMeta
    ? (periodMeta.key==='ALL' ? `السنة ${quarterlyYear}` : `${periodMeta.label} ${quarterlyYear}`)
    : String(quarterlyYear);

  return `
    <h2 class="page-title">تقرير إشعارات الخصم</h2>
    <p class="page-sub">اختر السنة ثم الربع أو السنة كاملة لعرض الفواتير الخاضعة للخصم — التصدير يعتمد على النتائج الظاهرة أمامك (بحث / فترة)</p>
    <div class="filters-row">
      <div class="field field-search"><label>بحث</label>
        <input class="search-box" id="quarterlySearchBox" value="${lgEscapeHtml(quarterlyFilters.q||'')}" placeholder="مورد، رقم ضريبي، رقم فاتورة، بيان، مبلغ... (كلمات متعددة = كلها مطلوبة)" autocomplete="off" />
      </div>
      <div class="field"><label>السنة</label>
        <select id="quarterlyYearSel">${years.map(y=>`<option value="${y}" ${y===quarterlyYear?'selected':''}>${y}</option>`).join('')}</select>
      </div>
      <div class="field"><label>من تاريخ (اختياري)</label><input type="date" id="quarterlyFromInput" value="${lgEscapeHtml(quarterlyFilters.from||'')}"></div>
      <div class="field"><label>إلى تاريخ (اختياري)</label><input type="date" id="quarterlyToInput" value="${lgEscapeHtml(quarterlyFilters.to||'')}"></div>
      ${(quarterlyFilters.from||quarterlyFilters.to)?'<button class="btn btn-outline btn-sm" id="quarterlyClearDates" style="align-self:flex-end;">مسح فلتر التاريخ</button>':''}
      ${pfSupplierCombo('quarterly', quarterlyFilters)}
      ${pfMonthSelect('quarterly', quarterlyFilters.month)}
      ${pfDistinctSelect('quarterly','category','التصنيف','كل التصنيفات',(DATA.ledger.invoices||[]).map(i=>i.category), quarterlyFilters.category)}
      ${pfDistinctSelect('quarterly','project','المشروع','كل المشاريع',(DATA.ledger.invoices||[]).map(i=>i.project), quarterlyFilters.project)}
      ${pfAmountFields('quarterly', quarterlyFilters, 'صافي الفاتورة من')}
      ${pfSelect('quarterly','sort','الترتيب',PF_SORT_INVOICES, quarterlyFilters.sort||'old')}
      ${pfResetBtn('quarterly')}
    </div>
    <div class="quarter-tabs">
      ${QUARTERLY_PERIODS.map(p=>`<button class="qtab ${p.key===quarterlyPeriod?'active':''}" data-qperiod="${p.key}">${p.label}${p.key!=='ALL'?` <span style="opacity:.7;font-weight:400;">(${p.months})</span>`:''}</button>`).join('')}
    </div>
    <div class="stats-row" style="grid-template-columns:repeat(3,1fr);margin-top:14px;">
      <div class="stat-card"><div class="num">${invs.length}</div><div class="lbl">عدد الفواتير الخاضعة للخصم</div></div>
      <div class="stat-card"><div class="num">${fmt(total)}</div><div class="lbl">إجمالي قيمة الفواتير</div></div>
      <div class="stat-card debt"><div class="num">${fmt(totalW)}</div><div class="lbl">إجمالي المبلغ المخصوم</div></div>
    </div>
    ${invs.some(i=>i.postReturnWht) ? `<p style="font-size:12px;color:var(--ink-soft);margin:8px 0 0;">ℹ️ الإجماليين فوق مخصوم منهم قيمة أي مرتجعات جزئية مرتبطة بفواتير الفترة دي — الجدول تحت بيعرض قيمة كل فاتورة الأصلية زي ما اتسجلت.</p>` : ''}
    <div class="btn-row" style="margin-bottom:14px;">
      <button class="btn btn-primary" id="exportQuarterNoticesPdf">تصدير إشعارات PDF</button>
    </div>
    <div class="table-wrap"><table>
      <thead>${invoiceTableTheadHtml()}</thead>
      <tbody>
        ${pgQ.pageRows.length? pgQ.pageRows.map(r=> invoiceTableRowHtml(r)).join('') : `<tr><td colspan="${invoiceTableColspan()}" class="table-empty">لا توجد فواتير خصم في ${lgEscapeHtml(periodLabel)}${pfActiveCount('quarterly')?' — تأكد من الفلاتر أو اضغط «مسح الفلاتر»':''}</td></tr>`}
      </tbody>
    </table></div>
    ${lgTablePagerHtml('quarterly', pgQ)}
  `;
}
