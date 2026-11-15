/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — pages-suppliers.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */
/* ---------------- Suppliers Page ---------------- */
function renderSuppliersPage(){
  return `
    <div class="layout">
      <div class="sidebar">
        <div class="sidebar-head">
          <h3>الموردون</h3>
          <input class="search-box" id="searchBox" placeholder="اسم، رقم ضريبي، سجل، هاتف، رقم فاتورة/دفعة..." value="${lgEscapeHtml(searchQuery)}" autocomplete="off" />
          <div style="display:flex;gap:6px;margin-top:8px;">
            <select id="supBalanceFilter" style="flex:1;min-width:0;font-size:12px;padding:5px 6px;" title="فلتر الرصيد">
              ${[['','كل الأرصدة'],['debt','علينا له (رصيد دائن)'],['credit','له عندنا / مدفوع زيادة'],['zero','مسدد (صفر)']].map(o=>`<option value="${o[0]}" ${supplierBalanceFilter===o[0]?'selected':''}>${o[1]}</option>`).join('')}
            </select>
            <select id="supSortMode" style="flex:1;min-width:0;font-size:12px;padding:5px 6px;" title="الترتيب">
              ${[['name','بالاسم'],['balance_desc','الأعلى رصيداً'],['balance_asc','الأقل رصيداً'],['recent','آخر نشاط']].map(o=>`<option value="${o[0]}" ${supplierSortMode===o[0]?'selected':''}>${o[1]}</option>`).join('')}
            </select>
          </div>
          <div id="supListCount" style="font-size:11.5px;color:var(--ink-soft);margin-top:6px;">${supplierListCountText()}</div>
        </div>
        ${(typeof hasPagePermission!=='function' || hasPagePermission("ledger.suppliers",'add')) ? `<button class="add-supplier-btn" id="addSupplierBtn">+ إضافة مورد جديد</button>` : ''}
        <button class="btn btn-outline btn-sm" id="exportSuppliersListBtn" style="width:100%;margin-top:6px;" title="يصدّر الموردين الظاهرين حسب البحث">تصدير الموردين (الظاهرين) Excel</button>
        <div id="supplierListWrap">${renderSupplierList()}</div>
      </div>
      <div class="main-panel" id="mainPanel">${renderSupplierMain()}</div>
    </div>
  `;
}
let supplierBalanceFilter = '';
let supplierSortMode = 'name';

/** قائمة الموردين بعد البحث والفلاتر: [{s, bal, hint}] */
function supplierListView(){
  const tokens = searchTokens(searchQuery);
  const invBy = Object.create(null), payBy = Object.create(null);
  if(tokens.length || supplierSortMode==='recent'){
    (DATA.ledger.invoices||[]).forEach(i=>{ if(i && !i.cancelled) (invBy[i.supplierId] = invBy[i.supplierId] || []).push(i); });
    (DATA.ledger.payments||[]).forEach(p=>{ if(p) (payBy[p.supplierId] = payBy[p.supplierId] || []).push(p); });
  }
  const out = [];
  (DATA.ledger.suppliers||[]).forEach(s=>{
    if(!s) return;
    const bal = supplierBalance(s.id);
    if(supplierBalanceFilter==='debt' && !(bal > 0.005)) return;
    if(supplierBalanceFilter==='credit' && !(bal < -0.005)) return;
    if(supplierBalanceFilter==='zero' && Math.abs(bal) > 0.005) return;
    let hint = '';
    if(tokens.length){
      const base = searchSupplierText(s) + ' ' + searchNorm(searchAttNames(s.attachments));
      const missing = tokens.filter(t=>base.indexOf(t) < 0);
      if(missing.length){
        const parts = [];
        (invBy[s.id]||[]).forEach(i=>parts.push({ l:(i.isReturn?'مرتجع ':'فاتورة ')+(i.invoiceNo||''), t: searchNorm([searchFlatten(i,0), i.isReturn?'مرتجع':'فاتورة', searchDateText(i.date), searchAttNames(i.attachments)].join(' ')) }));
        (payBy[s.id]||[]).forEach(p=>parts.push({ l:'دفعة #'+(p.paymentNo!=null?p.paymentNo:''), t: searchNorm(['دفعة', searchFlatten(p,0), searchDateText(p.date), searchAttNames(p.attachments)].join(' ')) }));
        const labels = [];
        let ok = true;
        missing.forEach(t=>{
          const hit = parts.find(x=>x.t.indexOf(t) > -1);
          if(!hit){ ok = false; return; }
          if(labels.indexOf(hit.l) < 0) labels.push(hit.l);
        });
        if(!ok) return;
        hint = labels.slice(0,2).join(' · ');
      }
    }
    let last = '';
    if(supplierSortMode==='recent'){
      (invBy[s.id]||[]).forEach(i=>{ const d = String(i.date||'').slice(0,10); if(d > last) last = d; });
      (payBy[s.id]||[]).forEach(p=>{ const d = String(p.date||'').slice(0,10); if(d > last) last = d; });
    }
    out.push({ s, bal, hint, last });
  });
  const byName = (a,b)=>String(a.s.name||'').localeCompare(String(b.s.name||''),'ar');
  if(supplierSortMode==='balance_desc') out.sort((a,b)=>b.bal - a.bal || byName(a,b));
  else if(supplierSortMode==='balance_asc') out.sort((a,b)=>a.bal - b.bal || byName(a,b));
  else if(supplierSortMode==='recent') out.sort((a,b)=>String(b.last).localeCompare(String(a.last)) || byName(a,b));
  else out.sort(byName);
  return out;
}
function supplierListCountText(){
  const n = supplierListView().length, all = (DATA.ledger.suppliers||[]).length;
  return n===all ? (all+' مورد') : (n+' من '+all+' مورد');
}
function getFilteredSuppliers(){
  return supplierListView().map(e=>e.s);
}

function renderSupplierList(){
  const view = supplierListView();
  if(view.length===0) return `<div class="empty-side">${(DATA.ledger.suppliers||[]).length===0?'لا يوجد موردون بعد':'لا توجد نتائج — عدّل البحث أو الفلتر'}</div>`;
  return `<ul class="supplier-list">
    ${view.map(e=>{
      const s = e.s, bal = e.bal;
      const cls = bal>0?'debt':(bal<0?'credit':'zero');
      const active = s.id===activeSupplierId?'active':'';
      return `<li class="supplier-item ${active}" data-id="${s.id}">
        <span class="s-name">${lgEscapeHtml(s.name)}${e.hint?`<small style="display:block;font-weight:600;font-size:11px;color:var(--gold);">🔎 ${lgEscapeHtml(e.hint)}</small>`:''}</span>
        <span class="s-balance ${cls}">${fmt(Math.abs(bal))}</span>
      </li>`;
    }).join('')}
  </ul>`;
}
function renderSupplierMain(){
  if(!activeSupplierId){
    return `<div class="welcome">
      <div class="big-mark">دفتر</div>
      <h3>اختر مورداً من القائمة أو أضِف مورداً جديداً</h3>
      <div>سجّل بيانات كل مورد، فواتيره، ودفعاته من هنا</div>
    </div>`;
  }
  const s = supplierById(activeSupplierId);
  if(!s){ activeSupplierId=null; return renderSupplierMain(); }
  const bal = supplierBalance(s.id);
  const balCls = bal>0?'debt':(bal<0?'credit':'zero');
  const balLabel = bal>0?'مستحق للمورد':(bal<0?'رصيد زائد لصالحنا':'الحساب متزن');

  return `
    <div class="supplier-header">
      <div>
        <h2>${lgEscapeHtml(s.name)}</h2>
        <div class="meta">
          ${s.taxId?`<span>🧾 ر.ض: ${lgEscapeHtml(s.taxId)}</span>`:''}
          ${s.phone?`<span>📞 ${lgEscapeHtml(s.phone)}</span>`:''}
          ${s.email?`<span>✉️ ${lgEscapeHtml(s.email)}</span>`:''}
          ${s.businessNature?`<span class="pill">${lgEscapeHtml(s.businessNature)}</span>`:''}
        </div>
      </div>
      <div class="balance-box">
        <div class="lbl">${balLabel}</div>
        <div class="val ${balCls}">${fmt(Math.abs(bal))}</div>
      </div>
      <div class="btn-row no-print">
        <button class="btn btn-outline btn-sm" id="printStatementBtn">حفظ PDF لكشف الحساب</button>
        <button class="btn btn-outline btn-sm" id="exportSupplierCsvBtn">تصدير Excel</button>
        <button class="btn btn-primary btn-sm" id="exportSupplierNoticesPdfBtn">تصدير إشعارات الخصم PDF</button>
        ${(typeof hasPagePermission!=='function' || hasPagePermission("ledger.suppliers",'delete')) ? '<button class="btn btn-danger btn-sm" id="deleteSupplierBtn">حذف المورد</button>' : ''}
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn ${activeSupplierTab==='info'?'active':''}" data-tab="info">البيانات</button>
      <button class="tab-btn ${activeSupplierTab==='invoices'?'active':''}" data-tab="invoices">الفواتير</button>
      <button class="tab-btn ${activeSupplierTab==='payments'?'active':''}" data-tab="payments">الدفعات</button>
      <button class="tab-btn ${activeSupplierTab==='statement'?'active':''}" data-tab="statement">كشف الحساب</button>
    </div>
    <div id="supplierTabContent">
      ${activeSupplierTab==='info'?renderInfoTab(s):''}
      ${activeSupplierTab==='invoices'?renderSupplierInvoicesTab(s):''}
      ${activeSupplierTab==='payments'?renderSupplierPaymentsTab(s):''}
      ${activeSupplierTab==='statement'?renderSupplierStatementTab(s):''}
    </div>
  `;
}
function renderInfoTab(s){
  return `
    <div class="info-grid">
      <div class="info-field"><label>اسم المورد *</label><input id="f_name" value="${lgEscapeHtml(s.name)}" /></div>
      <div class="info-field"><label>الرقم الضريبي</label><input id="f_taxid" value="${lgEscapeHtml(s.taxId||'')}" /></div>
      <div class="info-field"><label>السجل التجاري</label><input id="f_commreg" value="${lgEscapeHtml(s.commercialReg||'')}" /></div>
      <div class="info-field"><label>طبيعة نشاط المورد</label>
        <input id="f_businessNature" list="businessNatureList" value="${lgEscapeHtml(s.businessNature||'')}" placeholder="مثال: حديد، دهانات..." />
      </div>
      <div class="info-field"><label>الرصيد الافتتاحي</label><input id="f_openingBalance" type="text" inputmode="decimal" data-money="neg" dir="ltr" autocomplete="off" style="text-align:right;" value="${s.openingBalance?lgEscapeHtml(fmtInput(s.openingBalance)):''}" placeholder="٠" /></div>
      <div class="info-field"><label>تاريخ الرصيد الافتتاحي</label><input id="f_openingBalanceDate" type="date" value="${lgEscapeHtml(s.openingBalanceDate||'')}" /></div>
      <div class="info-field"><label>رقم الهاتف</label><input id="f_phone" value="${lgEscapeHtml(s.phone||'')}" /></div>
      <div class="info-field"><label>البريد الإلكتروني</label><input id="f_email" type="email" value="${lgEscapeHtml(s.email||'')}" /></div>
      <div class="info-field"><label>العنوان</label><input id="f_address" value="${lgEscapeHtml(s.address||'')}" /></div>
      <div class="info-field"><label>رقم الحساب البنكي</label><input id="f_bankAccount" value="${lgEscapeHtml(s.bankAccount||'')}" /></div>
      <div class="info-field"><label>IBAN</label><input id="f_iban" value="${lgEscapeHtml(s.iban||'')}" placeholder="EG..." /></div>
      <div class="info-field" style="grid-column:1/-1;"><label>ملاحظات</label><textarea id="f_notes">${lgEscapeHtml(s.notes||'')}</textarea></div>
      <div class="info-field" style="grid-column:1/-1;">
        <label>مستندات المورد (${(s.attachments||[]).length})</label>
        <div id="f_sup_attList" style="margin:8px 0;font-size:13px;">
          ${!(s.attachments&&s.attachments.length)
            ? '<span style="color:var(--ink-soft);">لا توجد مستندات بعد — امسح أو ارفع من الزر بالأسفل</span>'
            : (s.attachments||[]).map(a=>`
              <div class="pay-inv-row" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line);">
                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${lgEscapeHtml(a.name||'')}">📎 ${lgEscapeHtml(a.name||'ملف')}</span>
                <button type="button" class="row-btn" data-sup-info-att="${a.path?encodeURIComponent(a.path):''}" title="فتح">👁</button>
                <button type="button" class="row-btn del" data-sup-del-att="${a.id||''}" title="حذف">✕</button>
              </div>`).join('')
          }
        </div>
        <div class="btn-row no-print" style="gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn btn-outline btn-sm" id="f_sup_scanAtt">📷 مسح ضوئي / كاميرا</button>
        </div>
        <p style="font-size:11.5px;color:var(--ink-soft);margin:6px 0 0;">المستندات تظهر في صفحة الأرشيف تحت المورد وتُحفظ مع بياناته.</p>
      </div>
    </div>
    <datalist id="businessNatureList">${allBusinessNatures().map(c=>`<option value="${lgEscapeHtml(c)}">`).join('')}</datalist>
    <div style="margin-top:14px;">
      <div id="f_customFieldsWrap">${(s.extraFields||[]).map(f=>lgExtraFieldRowHtml(f.label, f.value)).join('')}</div>
      <div class="btn-row no-print" style="margin-top:8px;"><button class="btn btn-outline btn-sm" id="f_addCustomFieldBtn" type="button">+ إضافة خانة مخصصة أخرى</button></div>
    </div>
    <div style="margin-top:16px;"><button class="btn btn-gold" id="saveInfoBtn">حفظ البيانات</button></div>
  `;
}
function supplierTabToolbar(kind, allRows, shownCount, extraHtml){
  const f = supplierTabFilters;
  const years = searchYears(allRows.map(r=>r.date));
  const n = pfActiveCount('supTab');
  return `
    <div class="filters-row">
      ${pfTextField('supTab','q','بحث', kind==='invoices' ? 'رقم فاتورة، بيان، تصنيف، مشروع، كود، مبلغ...' : 'رقم دفعة، طريقة، رقم تحويل، فاتورة مرتبطة، مبلغ...', f.q)}
      ${pfSelect('supTab','year','السنة',[['','كل السنوات']].concat(years.map(y=>[y,y])), f.year)}
      ${pfMonthSelect('supTab', f.month)}
      ${extraHtml||''}
      ${pfSelect('supTab','sort','الترتيب',(kind==='invoices'?PF_SORT_INVOICES:PF_SORT_PAYMENTS).filter(o=>o[0]!=='supplier'), f.sort)}
      ${pfResetBtn('supTab')}
    </div>
    ${pfSummaryHtml(shownCount+' من '+allRows.length+(kind==='invoices'?' فاتورة':' دفعة'))}`;
}
function renderSupplierInvoicesTab(s){
  const all = supplierInvoices(s.id);
  const f = supplierTabFilters;
  const rows = filterInvoicesBy(all.filter(i=>searchDateOk(i.date, f)), { q:f.q, status:f.status, sort:f.sort, month:'' }, 'new');
  const totalNet = rows.reduce((a,b)=>a+invoiceSignedNet(b),0);
  const pg = lgPaginateRows(rows, 'supplierInvoices');
  return `
    ${supplierTabToolbar('invoices', all, rows.length, pfSelect('supTab','status','الحالة',PF_STATUS_INVOICES, f.status))}
    <div class="table-wrap"><table>
      <thead>${invoiceTableTheadHtml()}</thead>
      <tbody>
        ${pg.pageRows.length===0?`<tr><td colspan="${invoiceTableColspan()}" class="table-empty">${all.length?'لا فواتير مطابقة — عدّل البحث أو اضغط «مسح الفلاتر»':'لا توجد فواتير مسجلة لهذا المورد'}</td></tr>`:
        pg.pageRows.map(r=> invoiceTableRowHtml(r)).join('')
        }
      </tbody>
      ${rows.length>0?`<tfoot><tr><td colspan="${invoiceTableColspan()-2}" style="text-align:left;font-weight:700;padding-top:10px;">إجمالي الصافي (بعد خصم المرتجعات)</td><td class="amount-cell invoice" style="padding-top:10px;">${fmt(totalNet)}</td><td></td></tr></tfoot>`:''}
    </table></div>
    ${lgTablePagerHtml('supplierInvoices', pg)}
    <div class="section-add">
      <h4>إضافة فاتورة أو مرتجع</h4>
      <div class="btn-row">${(typeof hasPagePermission!=='function' || hasPagePermission("ledger.invoices",'add')) ? `<button class="btn btn-gold btn-sm" id="openAddInvoiceModalBtn">+ إضافة فاتورة</button><button class="btn btn-outline btn-sm" id="openAddReturnModalBtnSupplier">+ إضافة مرتجع</button>` : ''}${(typeof hasPagePermission!=='function' || hasPagePermission("ledger.payments",'add')) ? `<button class="btn btn-primary btn-sm" id="openAddPaymentModalSupplierBtn">+ إضافة دفعة</button>` : ''}</div>
    </div>
  `;
}
function renderSupplierPaymentsTab(s){
  const allPays = supplierPayments(s.id);
  const pf = supplierTabFilters, ptokens = searchTokens(pf.q);
  let rows = allPays.filter(p=>searchDateOk(p.date, pf));
  if(pf.method) rows = rows.filter(p=>(p.method||'')===pf.method);
  if(ptokens.length) rows = rows.filter(p=>searchHas(searchPaymentText(p), ptokens));
  const pdt = p=>String(p.date||'');
  if(pf.sort==='old') rows.sort((a,b)=>pdt(a).localeCompare(pdt(b)));
  else if(pf.sort==='amount_desc') rows.sort((a,b)=>Number(b.amount||0)-Number(a.amount||0));
  else if(pf.sort==='amount_asc') rows.sort((a,b)=>Number(a.amount||0)-Number(b.amount||0));
  else rows.sort((a,b)=>pdt(b).localeCompare(pdt(a)));
  const payMethods = [...new Set(allPays.map(p=>p.method).filter(Boolean))];
  const total = rows.reduce((a,b)=>a+Number(b.amount||0),0);
  const invOptions = supplierInvoices(s.id).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const pg = lgPaginateRows(rows, 'supplierPayments');
  return `
    ${supplierTabToolbar('payments', allPays, rows.length, pfSelect('supTab','method','طريقة الدفع',[['','كل الطرق']].concat(payMethods.map(m=>[m,m])), pf.method))}
    <div class="table-wrap"><table>
      <thead><tr><th>رقم الدفعة</th><th>التاريخ</th><th>طريقة الدفع</th><th>الفاتورة المرتبطة</th><th>رقم التحويل / تفاصيل إضافية</th><th>ملاحظات</th><th>المبلغ</th><th></th></tr></thead>
      <tbody>
        ${pg.pageRows.length===0?`<tr><td colspan="8" class="table-empty">${allPays.length?'لا دفعات مطابقة — عدّل البحث أو اضغط «مسح الفلاتر»':'لا توجد دفعات مسجلة لهذا المورد'}</td></tr>`:
        pg.pageRows.map(r=>{
          const linkedInv = r.invoiceId ? DATA.ledger.invoices.find(i=>i.id===r.invoiceId) : null;
          const refBits = [r.transferRef?`رقم التحويل: ${r.transferRef}`:'', lgExtraFieldsSummary(r.extraFields)].filter(Boolean).join(' | ');
          return `
          <tr data-viewpay="${r.id}" style="cursor:pointer;" title="اضغط لعرض التفاصيل">
            <td style="font-weight:800;color:var(--ledger-green);">#${lgEscapeHtml(String(r.paymentNo||'-'))}</td>
            <td>${lgEscapeHtml(lgFmtDate(r.date)||'-')}</td>
            <td>${lgEscapeHtml(r.method||'-')}</td>
            <td>${linkedInv?`<span class="pill">فاتورة ${lgEscapeHtml(linkedInv.invoiceNo)}</span>`:'<span class="pill">دفعة عامة</span>'}</td>
            <td>${lgEscapeHtml(refBits||'-')}</td>
            <td>${lgEscapeHtml(r.notes||'-')}</td>
            <td class="amount-cell payment">${fmt(r.amount)}</td>
            <td><div class="row-actions">
              <button class="row-btn" data-viewpay-btn="${r.id}" title="عرض">👁</button>
              ${(typeof hasPagePermission!=='function' || hasPagePermission("ledger.payments",'delete')) ? `<button class="row-btn del" data-delpay="${r.id}" title="حذف">✕</button>` : ''}
            </div></td>
          </tr>`;}).join('')
        }
      </tbody>
      ${rows.length>0?`<tfoot><tr><td colspan="6" style="text-align:left;font-weight:700;padding-top:10px;">الإجمالي</td><td class="amount-cell payment" style="padding-top:10px;">${fmt(total)}</td><td></td></tr></tfoot>`:''}
    </table></div>
    ${lgTablePagerHtml('supplierPayments', pg)}
    <div class="section-add">
      <h4>إضافة دفعة جديدة</h4>
      <p style="font-size:12px;color:var(--ink-soft);margin:-2px 0 10px;">اربط الدفعة بفاتورة معينة، أو اتركها "دفعة عامة" إذا لم تكن مرتبطة بفاتورة محددة (دفعة مقدمة / تحت الحساب)</p>
      <div class="form-grid">
        <div class="field"><label>التاريخ</label><input type="date" id="pay_date" /></div>
        <div class="field"><label>الفاتورة المرتبطة</label>
          <select id="pay_invoice">
            <option value="">دفعة عامة (غير مرتبطة بفاتورة)</option>
            ${invOptions.map(i=>`<option value="${i.id}">فاتورة ${lgEscapeHtml(i.invoiceNo)} - ${lgEscapeHtml(lgFmtDate(i.date)||'-')}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>طريقة الدفع</label>
          <select id="pay_method"><option value="نقدي">نقدي</option><option value="تحويل بنكي">تحويل بنكي</option><option value="شيك">شيك</option><option value="أخرى">أخرى</option></select>
        </div>
        <div class="field"><label>المبلغ</label><input type="text" inputmode="decimal" data-money="pos" dir="ltr" autocomplete="off" style="text-align:right;" id="pay_amount" placeholder="٠.٠٠" /></div>
        <div class="field"><label>رقم التحويل البنكي</label><input id="pay_transferRef" placeholder="اختياري" /></div>
      </div>
      <div id="pay_extraFieldsWrap"></div>
      <div class="btn-row no-print" style="margin-top:6px;">
        <button class="btn btn-outline btn-sm" id="pay_addFieldBtn" type="button">+ إضافة خانة أخرى</button>
      </div>
      <div class="field" style="margin-top:10px;"><label>ملاحظات</label><input id="pay_notes" placeholder="اختياري" /></div>
      ${(typeof hasPagePermission!=='function' || hasPagePermission("ledger.payments",'add')) ? `<button class="btn btn-gold btn-sm" id="addPaymentBtn" style="margin-top:10px;">إضافة الدفعة</button>` : ''}
    </div>
  `;
}

