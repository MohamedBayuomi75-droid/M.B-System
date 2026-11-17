/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — statement.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */
/* ---------------- Bank-style Statement ---------------- */
function statementRows(sid, from, to){
  const events=[];
  const round2 = (n)=>Math.round((Number(n)||0)*100)/100;
  DATA.ledger.invoices.filter(i=>i.supplierId===sid).forEach(i=>{
    if((from && i.date<from)||(to && i.date>to)) return;
    // الصافي فقط — فاتورة: دائن | مرتجع: مدين
    const amt = round2(i.netInvoice);
    if(i.isReturn){
      events.push({date:i.date||'', type:'return', ref:i.invoiceNo||'-', description:'مرتجع: '+(i.description||'فاتورة')+(i.linkedInvoiceId?' (مرتبط)':''), debit:amt, credit:0, id:i.id});
    } else if(!i.cancelled){
      events.push({date:i.date||'', type:'invoice', ref:i.invoiceNo||'-', description:i.description||'فاتورة', debit:0, credit:amt, id:i.id});
    }
  });
  DATA.ledger.payments.filter(p=>p.supplierId===sid).forEach(p=>{
    if((from && p.date<from)||(to && p.date>to)) return;
    const inv=p.invoiceId?DATA.ledger.invoices.find(i=>i.id===p.invoiceId):null;
    const amt = round2(p.amount);
    if(amt<=0) return;
    const dir=(p.direction==='collect')?'collect':'pay';
    const typeName = dir==='collect' ? 'قيد مدين (عليه لنا)' : 'دفعة دائن (سداد)';
    const desc = (p.notes && String(p.notes).trim()) ? (typeName + ' — ' + p.notes) : typeName;
    // السداد والقيد المدين → عمود مدين (يقللان المستحق للمورد)
    events.push({date:p.date||'', type:'payment', ref:inv?inv.invoiceNo:'-', description:desc, debit:amt, credit:0, method:p.method||'', direction:dir, id:p.id});
  });
  // ترتيب ثابت: تاريخ ثم فاتورة → مرتجع → دفعة (عشان الرصيد المتحرك مظبوط)
  const typeOrder = {invoice:0, return:1, payment:2};
  events.sort((a,b)=>{
    const d=(a.date||'').localeCompare(b.date||'');
    if(d) return d;
    const td=(typeOrder[a.type]||9)-(typeOrder[b.type]||9);
    if(td) return td;
    return String(a.id||'').localeCompare(String(b.id||''));
  });
  let running=0;
  events.forEach(e=>{
    running = round2(running + e.credit - e.debit);
    e.balance = running;
  });
  return events;
}
function openingBalanceFor(sid, from){
  const s = supplierById(sid);
  let bal = Number((s && s.openingBalance) || 0);
  const obDate = (s && s.openingBalanceDate) || '';
  if(from){
    DATA.ledger.invoices.filter(i=>i.supplierId===sid).forEach(i=>{ if(i.date && i.date < from) bal += invoiceSignedNet(i); });
    DATA.ledger.payments.filter(p=>p.supplierId===sid).forEach(p=>{
      if(p.date && p.date < from) bal -= Number(p.amount||0);
    });
  } else if(obDate){
    DATA.ledger.invoices.filter(i=>i.supplierId===sid).forEach(i=>{ if(i.date && i.date < obDate) bal += invoiceSignedNet(i); });
    DATA.ledger.payments.filter(p=>p.supplierId===sid).forEach(p=>{
      if(p.date && p.date < obDate) bal -= Number(p.amount||0);
    });
  }
  return bal;
}
/* بناء مستند كشف الحساب - نفس الهيكل يُستخدم للمعاينة على الشاشة وللطباعة معاً */
function buildAccountStatementHtml(s, from, to){
  const opening = Number(openingBalanceFor(s.id, from))||0;
  const rows = statementRows(s.id, from, to);
  // الرصيد المتحرك = افتتاحي + تراكم الحركات (مش opening+balance لو balance يبدأ من 0 داخل الفترة فقط)
  rows.forEach(r=>{ r.absBalance = Math.round((opening + r.balance)*100)/100; });
  const debit = Math.round(rows.reduce((a,r)=>a+Number(r.debit||0),0)*100)/100;
  const credit = Math.round(rows.reduce((a,r)=>a+Number(r.credit||0),0)*100)/100;
  // الرصيد الختامي = آخر رصيد في الجدول (يتطابق صفًا بصف)
  const closing = rows.length ? rows[rows.length-1].absBalance : opening;
  const company = DATA.settings.companyName || '';
  const periodText = `${lgEscapeHtml(from ? lgFmtDate(from) : 'بداية التعامل')} إلى ${lgEscapeHtml(to ? lgFmtDate(to) : 'تاريخ اليوم')}`;
  const todayStr = lgFmtDate(new Date());
  return `
    <div class="acc-statement">
      <div class="ast-brand ast-brand-bar">
        <div class="ast-brand-logo">${lgBrandLogoHtml(42)}</div>
        ${company?`<div class="co">${lgEscapeHtml(company)}</div>`:''}
        <div class="ast-brand-spacer"></div>
      </div>
      <div class="ast-title-wrap"><span class="ast-title">كشف حساب مورد</span></div>
      <div class="ast-info">
        <div>
          <div class="ast-info-row"><span class="k">اسم المورد</span><span class="v">${lgEscapeHtml(s.name)}</span></div>
          <div class="ast-info-row"><span class="k">فترة الكشف</span><span class="v">${periodText}</span></div>
        </div>
        <div>
          <div class="ast-info-row"><span class="k">الرقم الضريبي</span><span class="v">${lgEscapeHtml(s.taxId||'-')}</span></div>
          <div class="ast-info-row"><span class="k">تاريخ الإصدار</span><span class="v">${lgEscapeHtml(todayStr)}</span></div>
        </div>
      </div>
      <table class="ast-table">
        <thead><tr><th>تاريخ القيد</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead>
        <tbody>
          <tr class="ast-opening"><td colspan="2">الرصيد الافتتاحي</td><td>-</td><td>-</td><td class="ast-bal">${fmt(opening)}</td></tr>
          ${rows.length?rows.map(r=>`<tr>
            <td>${lgEscapeHtml(lgFmtDate(r.date)||'-')}</td>
            <td style="white-space:pre-line;">${lgEscapeHtml(r.description||'-')}${r.ref&&r.ref!=='-'?` <span class="pill">${lgEscapeHtml(r.ref)}</span>`:''}${r.method?` <span class="pill">${lgEscapeHtml(r.method)}</span>`:''}</td>
            <td class="ast-debit">${r.debit?fmt(r.debit):'-'}</td>
            <td class="ast-credit">${r.credit?fmt(r.credit):'-'}</td>
            <td class="ast-bal">${fmt(r.absBalance)}${r.absBalance<0?' <span style="color:var(--ledger-green);font-size:11px;">(لصالحنا)</span>':''}</td>
          </tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:16px;">لا توجد حركات في هذه الفترة</td></tr>'}
        </tbody>
      </table>
      <div class="ast-summary">
        <div class="box"><div class="v">${fmt(opening)}</div><div class="l">الرصيد الافتتاحي</div></div>
        <div class="box"><div class="v">${fmt(credit)}</div><div class="l">إجمالي دائن (فترة الكشف)</div></div>
        <div class="box"><div class="v">${fmt(debit)}</div><div class="l">إجمالي مدين (فترة الكشف)</div></div>
      </div>
      <div class="ast-final">
        <div class="amt">${fmt(closing)}</div>
        <div class="lbl">الرصيد الختامي ${closing>0?'(مستحق للمورد)':closing<0?'(رصيد زائد لصالحنا)':'(متسوّى)'}</div>
      </div>
      <div class="ast-footer">تم إعداد هذا الكشف آلياً بواسطة نظام دفتر الموردين — ${lgEscapeHtml(todayStr)}</div>
    </div>`;
}

function renderStatementPage(){
  const s=statementFilters.supplierId?supplierById(statementFilters.supplierId):null;
  return `
    <h2 class="page-title">كشف حساب المورد</h2>
    <p class="page-sub">كشف حركات المورد: فواتير (دائن) · مرتجعات ودفعات (مدين) · رصيد متحرك</p>
    <div class="filters-row">
      <div class="field" style="min-width:260px;"><label>المورد</label>
        <div class="ss-cell ss-cell-wide">
          <input type="text" id="statementSupplierName" placeholder="ابحث أو اكتب اسم المورد..." autocomplete="off"
            value="${lgEscapeHtml((function(){ const s=typeof supplierById==='function'&&statementFilters.supplierId?supplierById(statementFilters.supplierId):null; return s?s.name:''; })())}"
            data-combo-id="${lgEscapeHtml(statementFilters.supplierId||'')}" />
          <input type="hidden" id="statementSupplier" value="${lgEscapeHtml(statementFilters.supplierId||'')}" />
        </div>
      </div>
      <div class="field"><label>من تاريخ</label><input type="date" id="statementFrom" value="${escapeHtml(statementFilters.from)}"></div>
      <div class="field"><label>إلى تاريخ</label><input type="date" id="statementTo" value="${escapeHtml(statementFilters.to)}"></div>
      <button class="btn btn-gold" id="generateStatementBtn">عرض الكشف</button>
      ${s?'<button class="btn btn-outline" id="printStatementPageBtn">حفظ PDF (يفتح تلقائياً)</button>':''}
    </div>
    ${s?`<div class="notice-doc" id="bankStatementDoc">${buildAccountStatementHtml(s, statementFilters.from, statementFilters.to)}</div>`
      :'<div class="table-empty" style="padding:28px;text-align:center;color:var(--ink-soft);">اختر مورداً ثم اضغط «عرض الكشف»</div>'}`;
}

function printBankStatement(){
  const doc=document.getElementById('bankStatementDoc'); if(!doc) return;
  printHtmlContent(doc.outerHTML);
}

