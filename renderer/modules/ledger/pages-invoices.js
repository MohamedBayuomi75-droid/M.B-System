/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — pages-invoices.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */
/* ---------------- All Invoices Page ---------------- */
/** الفواتير الظاهرة حسب فلاتر الصفحة (بحث / فترة / مورد / تصنيف...) */
/** mode: 'invoices' (الفواتير فقط) | 'returns' (المرتجعات فقط) | '' (الكل — للتصدير من الإعدادات). الافتراضي = وضع الصفحة الحالية */
function getFilteredInvoices(mode){
  if(mode === undefined) mode = lgInvoicesMode;
  let rows = (DATA.ledger.invoices||[]).slice();
  if(mode === 'invoices') rows = rows.filter(i=>!i.isReturn);
  else if(mode === 'returns') rows = rows.filter(i=>!!i.isReturn);
  rows = rows.filter(i=>searchDateOk(i.date, invoiceFilters));
  rows = filterInvoicesBy(rows, invoiceFilters, 'new');
  if(invoiceFilters.overdueOnly && mode !== 'returns'){
    rows = rows.filter(i=>typeof isInvoiceOverdue==='function' && isInvoiceOverdue(i));
  }
  return rows;
}

function invoiceFiltersLabel(){
  const bits = [];
  if(invoiceFilters.q) bits.push('بحث: '+invoiceFilters.q);
  if(invoiceFilters.supplierId){
    const s = typeof supplierById==='function' ? supplierById(invoiceFilters.supplierId) : null;
    bits.push('مورد: '+(s?s.name:invoiceFilters.supplierId));
  }
  if(invoiceFilters.category) bits.push('تصنيف: '+invoiceFilters.category);
  if(invoiceFilters.project) bits.push('مشروع: '+invoiceFilters.project);
  if(invoiceFilters.year) bits.push('سنة: '+invoiceFilters.year);
  if(invoiceFilters.from) bits.push('من: '+invoiceFilters.from);
  if(invoiceFilters.to) bits.push('إلى: '+invoiceFilters.to);
  if(invoiceFilters.overdueOnly) bits.push('متأخرة فقط');
  pfLabelBits('invoices').forEach(x=>bits.push(x));
  return bits.length ? bits.join(' | ') : 'كل الفواتير';
}

function renderInvoicesPage(mode){
  if(mode === undefined) mode = lgInvoicesMode;
  const isRet = (mode === 'returns');
  const modeKnown = (mode === 'invoices' || mode === 'returns');
  const rows = getFilteredInvoices(mode);
  // المرتجع يخصم من كل اللوحات (مش يزود)
  const signed = (b, key)=> (b.isReturn?-1:1)*Number(b[key]||0);
  const total = rows.reduce((a,b)=>a+invoiceSignedNet(b),0);
  const totalWithheld = rows.reduce((a,b)=>a+signed(b,'withheld'),0);
  const totalGross = rows.reduce((a,b)=>a+signed(b,'totalInvoice'),0);
  const totalVat = rows.reduce((a,b)=>a+signed(b,'vat'),0);
  const totalStamp = rows.reduce((a,b)=>a+signed(b,'stampDuty'),0);
  lgPageState.invoices = invoiceListPage;
  const pg = lgPaginateRows(rows, 'invoices');
  invoiceListPage = pg.page;
  const { pageRows } = pg;

  return `
    <h2 class="page-title">${isRet?'المرتجعات':'كل الفواتير'}</h2>
    <p class="page-sub">${isRet?'سجل المرتجعات عبر جميع الموردين — المرتجع بيخصم من حساب المورد':'سجل شامل لكل الفواتير عبر جميع الموردين — يتم التحقق تلقائياً من تكرار الفاتورة بمطابقة كل الأعمدة'}</p>

    <div class="filters-row">
      <div class="field field-search">
        <label>بحث</label>
        <input class="search-box" id="invSearchBox" value="${lgEscapeHtml(invoiceFilters.q)}" placeholder="رقم فاتورة، مورد، رقم ضريبي، بيان، كود، مبلغ، ملاحظات... (كلمات متعددة = كلها مطلوبة)" autocomplete="off" />
      </div>
      <div class="field" style="min-width:180px;">
        <label>المورد</label>
        <div class="ss-cell">
          <input type="text" id="invFilterSupplierName" placeholder="كل الموردين — ابحث..." autocomplete="off"
            value="${lgEscapeHtml((function(){ const s=invoiceFilters.supplierId&&typeof supplierById==='function'?supplierById(invoiceFilters.supplierId):null; return s?s.name:''; })())}"
            data-combo-id="${lgEscapeHtml(invoiceFilters.supplierId||'')}" />
          <input type="hidden" id="invFilterSupplier" value="${lgEscapeHtml(invoiceFilters.supplierId||'')}" />
        </div>
      </div>
      <div class="field" style="min-width:150px;">
        <label>التصنيف</label>
        <div class="ss-cell">
          <input type="text" id="invFilterCategory" placeholder="كل التصنيفات — ابحث..." autocomplete="off" value="${lgEscapeHtml(invoiceFilters.category||'')}" />
        </div>
      </div>
      <div class="field" style="min-width:150px;">
        <label>المشروع</label>
        <div class="ss-cell">
          <input type="text" id="invFilterProject" placeholder="كل المشاريع — ابحث..." autocomplete="off" value="${lgEscapeHtml(invoiceFilters.project||'')}" />
        </div>
      </div>
      <div class="field"><label>السنة</label>
        <select id="invFilterYear">
          <option value="">كل السنوات</option>
          ${Array.from(new Set(DATA.ledger.invoices.map(i=>(i.date||'').slice(0,4)).filter(Boolean))).sort((a,b)=>b.localeCompare(a)).map(y=>`<option value="${y}" ${String(invoiceFilters.year)===String(y)?'selected':''}>${y}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>من تاريخ</label><input type="date" id="invFilterFrom" value="${lgEscapeHtml(invoiceFilters.from||'')}"></div>
      <div class="field"><label>إلى تاريخ</label><input type="date" id="invFilterTo" value="${lgEscapeHtml(invoiceFilters.to||'')}"></div>
      ${(invoiceFilters.from||invoiceFilters.to)?'<button class="btn btn-outline btn-sm" id="invClearDates" style="align-self:flex-end;">مسح فلتر التاريخ</button>':''}
      ${isRet?'':`<button class="btn ${invoiceFilters.overdueOnly?'btn-primary':'btn-outline'} btn-sm" id="invFilterOverdue" style="align-self:flex-end;">${invoiceFilters.overdueOnly?'إلغاء فلتر المتأخرة':'فواتير متأخرة فقط'}</button>`}
      ${pfMonthSelect('invoices', invoiceFilters.month)}
      ${modeKnown ? '' : pfSelect('invoices','kind','النوع',[['','فواتير ومرتجعات'],['invoice','فواتير فقط'],['return','مرتجعات فقط']], invoiceFilters.kind)}
      ${pfSelect('invoices','status','الحالة',PF_STATUS_INVOICES, invoiceFilters.status)}
      ${pfSelect('invoices','withheld','الخصم',[['','الكل'],['yes','عليها خصم'],['no','بدون خصم']], invoiceFilters.withheld)}
      ${pfAmountFields('invoices', invoiceFilters, 'صافي الفاتورة من')}
      ${pfSelect('invoices','sort','الترتيب',PF_SORT_INVOICES, invoiceFilters.sort)}
      ${pfResetBtn('invoices')}
    </div>
    <div class="btn-row" style="margin-bottom:14px;">
      ${(!isRet && (typeof hasPagePermission!=='function' || hasPagePermission("ledger.invoices",'add'))) ? `<button class="btn btn-gold" id="openAddInvoiceModalBtnGlobal">+ إضافة فاتورة</button>` : ''}
      ${(mode !== 'invoices' && (typeof hasPagePermission!=='function' || hasPagePermission(isRet?"ledger.returns":"ledger.invoices",'add'))) ? `<button class="btn ${isRet?'btn-gold':'btn-outline'}" id="openAddReturnModalBtn">+ إضافة مرتجع</button>` : ''}
      <button class="btn btn-outline" id="exportAllInvoicesCsv" title="يصدّر النتائج الظاهرة حسب البحث والفلاتر">تصدير Excel (النتائج الظاهرة)</button>
    </div>

    <div class="stats-row" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));">
      <div class="stat-card"><div class="num">${rows.length}</div><div class="lbl">${isRet?'عدد المرتجعات (بعد الفلترة)':'عدد الفواتير (بعد الفلترة)'}</div></div>
      <div class="stat-card"><div class="num">${fmt(totalGross)}</div><div class="lbl">إجمالي قيمة الفواتير</div></div>
      <div class="stat-card"><div class="num">${fmt(totalVat)}</div><div class="lbl">إجمالي ضريبة القيمة المضافة</div></div>
      <div class="stat-card"><div class="num">${fmt(totalStamp)}</div><div class="lbl">إجمالي قيمة الدمغات</div></div>
      <div class="stat-card"><div class="num">${fmt(totalWithheld)}</div><div class="lbl">إجمالي المخصوم</div></div>
      <div class="stat-card"><div class="num">${fmt(total)}</div><div class="lbl">إجمالي الصافي</div></div>
    </div>

    <div class="table-wrap"><table>
      <thead>${invoiceTableTheadHtml()}</thead>
      <tbody>
        ${pageRows.length===0?`<tr><td colspan="${invoiceTableColspan()}" class="table-empty">${(DATA.ledger.invoices||[]).length?'لا توجد فواتير مطابقة — جرّب تعديل البحث أو اضغط «مسح الفلاتر»':'لا توجد فواتير بعد'}</td></tr>`:
        pageRows.map(r=> invoiceTableRowHtml(r)).join('')
        }
      </tbody>
    </table></div>

    ${lgTablePagerHtml('invoices', pg)}
  `;
}

