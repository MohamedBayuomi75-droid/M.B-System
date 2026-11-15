/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — pages-payments.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */
/* ---------------- Payments Page ---------------- */
/** الدفعات الظاهرة حسب فلاتر الصفحة */
function getFilteredPayments(){
  const f = paymentsFilters, tokens = searchTokens(f.q);
  let rows = (DATA.ledger.payments||[]).slice();
  rows = rows.filter(p=>searchDateOk(p.date, f));
  if(f.supplierId) rows = rows.filter(p=>p.supplierId===f.supplierId);
  if(f.method) rows = rows.filter(p=>(p.method||'')===f.method);
  if(f.direction) rows = rows.filter(p=>(p.direction==='collect'?'collect':'pay')===f.direction);
  if(f.link==='general') rows = rows.filter(p=>!p.invoiceId);
  else if(f.link==='linked') rows = rows.filter(p=>!!p.invoiceId);
  if((f.min!==''&&f.min!=null) || (f.max!==''&&f.max!=null)) rows = rows.filter(p=>searchAmountOk(p.amount, f));
  if(tokens.length) rows = rows.filter(p=>searchHas(searchPaymentText(p), tokens));
  const dt = p=>String(p.date||'');
  const mode = f.sort || 'new';
  if(mode==='old') rows.sort((a,b)=>dt(a).localeCompare(dt(b)));
  else if(mode==='amount_desc') rows.sort((a,b)=>Number(b.amount||0)-Number(a.amount||0));
  else if(mode==='amount_asc') rows.sort((a,b)=>Number(a.amount||0)-Number(b.amount||0));
  else rows.sort((a,b)=>dt(b).localeCompare(dt(a)));
  return rows;
}
function paymentsFiltersLabel(){
  const bits = [];
  if(paymentsFilters.q) bits.push('بحث: '+paymentsFilters.q);
  if(paymentsFilters.year) bits.push('سنة: '+paymentsFilters.year);
  if(paymentsFilters.from) bits.push('من: '+paymentsFilters.from);
  if(paymentsFilters.to) bits.push('إلى: '+paymentsFilters.to);
  if(paymentsFilters.supplierId){ const sp = typeof supplierById==='function' ? supplierById(paymentsFilters.supplierId) : null; bits.push('مورد: '+(sp?sp.name:paymentsFilters.supplierId)); }
  pfLabelBits('payments').forEach(x=>bits.push(x));
  return bits.length ? bits.join(' | ') : 'كل الدفعات';
}
function renderPaymentsPage(){
  const rows = getFilteredPayments();
  const total = rows.reduce((a,b)=>a+Number(b.amount||0),0);
  const pg = lgPaginateRows(rows, 'payments');
  const pageRows = pg.pageRows;
  return `
    <h2 class="page-title">كل الدفعات</h2>
    <p class="page-sub">سجل شامل لكل الدفعات مع إمكانية ربط الدفعة بفاتورة أو تسجيلها كدفعة عامة</p>
    <div class="filters-row">
      <div class="field field-search"><label>بحث</label>
        <input class="search-box" id="paymentsSearchBox" value="${lgEscapeHtml(paymentsFilters.q||'')}" placeholder="رقم الدفعة، مورد، فاتورة، تحويل، مبلغ، ملاحظات... (كلمات متعددة = كلها مطلوبة)" autocomplete="off" />
      </div>
      <div class="field"><label>السنة</label>
        <select id="paymentsYearFilter">
          <option value="">كل السنوات</option>
          ${Array.from(new Set(DATA.ledger.payments.map(p=>(p.date||'').slice(0,4)).filter(Boolean))).sort((a,b)=>b.localeCompare(a)).map(y=>`<option value="${y}" ${String(paymentsFilters.year)===String(y)?'selected':''}>${y}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>من تاريخ</label><input type="date" id="paymentsFromInput" value="${lgEscapeHtml(paymentsFilters.from||'')}"></div>
      <div class="field"><label>إلى تاريخ</label><input type="date" id="paymentsToInput" value="${lgEscapeHtml(paymentsFilters.to||'')}"></div>
      ${(paymentsFilters.from||paymentsFilters.to)?'<button class="btn btn-outline btn-sm" id="paymentsClearDates" style="align-self:flex-end;">مسح فلتر التاريخ</button>':''}
      ${pfSupplierCombo('payments', paymentsFilters)}
      ${pfMonthSelect('payments', paymentsFilters.month)}
      ${pfSelect('payments','method','طريقة الدفع',[['','كل الطرق']].concat([...new Set((DATA.ledger.payments||[]).map(p=>p.method).filter(Boolean))].map(m=>[m,m])), paymentsFilters.method)}
      ${pfSelect('payments','direction','نوع الحركة',[['','الكل'],['pay','دائن — علينا له'],['collect','مدين — عليه لنا']], paymentsFilters.direction)}
      ${pfSelect('payments','link','الربط',[['','الكل'],['linked','مرتبطة بفاتورة'],['general','دفعة عامة']], paymentsFilters.link)}
      ${pfAmountFields('payments', paymentsFilters, 'المبلغ من')}
      ${pfSelect('payments','sort','الترتيب',PF_SORT_PAYMENTS, paymentsFilters.sort)}
      ${pfResetBtn('payments')}
    </div>
    <div class="btn-row" style="margin-bottom:16px;">
      ${(typeof hasPagePermission!=='function' || hasPagePermission("ledger.payments",'add')) ? `<button class="btn btn-primary" id="openAddPaymentPageBtn">+ إضافة دفعة</button>` : ''}
      <button class="btn btn-outline" id="exportAllPaymentsPageBtn" title="يصدّر النتائج الظاهرة حسب البحث والفلاتر">تصدير Excel (النتائج الظاهرة)</button>
    </div>
    <div class="stats-row" style="grid-template-columns:repeat(2,1fr);">
      <div class="stat-card"><div class="num">${rows.length}</div><div class="lbl">عدد الدفعات</div></div>
      <div class="stat-card"><div class="num">${fmt(total)}</div><div class="lbl">إجمالي الدفعات</div></div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>رقم الدفعة</th><th>التاريخ</th><th>المورد</th><th>النوع</th><th>طريقة الدفع</th><th>الفاتورة المرتبطة</th><th>رقم التحويل / تفاصيل</th><th>ملاحظات</th><th>المبلغ</th><th></th></tr></thead>
      <tbody>${pageRows.length===0?`<tr><td colspan="10" class="table-empty">${(DATA.ledger.payments||[]).length?'لا توجد دفعات مطابقة — جرّب تعديل البحث أو اضغط «مسح الفلاتر»':'لا توجد دفعات مسجلة'}</td></tr>`:pageRows.map(p=>{
        const s=supplierById(p.supplierId), inv=p.invoiceId?DATA.ledger.invoices.find(i=>i.id===p.invoiceId):null;
        const refBits = [p.transferRef?`رقم التحويل: ${p.transferRef}`:'', lgExtraFieldsSummary(p.extraFields)].filter(Boolean).join(' | ');
        return `<tr data-viewpay="${p.id}" style="cursor:pointer;" title="اضغط لعرض التفاصيل">
          <td style="font-weight:800;color:var(--ledger-green);">#${lgEscapeHtml(String(p.paymentNo||'-'))}</td>
          <td>${lgEscapeHtml(lgFmtDate(p.date)||'-')}</td>
          <td>${lgEscapeHtml(s?s.name:'—')}</td>
          <td>${typeof paymentDirectionLabel==='function'?paymentDirectionLabel(p):'-'} </td><td>${lgEscapeHtml(p.method||'-')}</td>
          <td>${inv?lgEscapeHtml(inv.invoiceNo):'دفعة عامة'}</td>
          <td>${lgEscapeHtml(refBits||'-')}</td>
          <td>${lgEscapeHtml(p.notes||'-')}</td>
          <td class="amount-cell payment">${fmt(p.amount)}</td>
          <td><div class="row-actions">
            <button class="row-btn" data-viewpay-btn="${p.id}" title="عرض">👁</button>
            <button class="row-btn" data-editpay="${p.id}" title="تعديل">✎</button>
            ${(typeof hasPagePermission!=='function' || hasPagePermission("ledger.payments",'delete')) ? `<button class="row-btn del" data-delpay-global="${p.id}" title="حذف">✕</button>` : ''}
          </div></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
    ${lgTablePagerHtml('payments', pg)}`;
}

