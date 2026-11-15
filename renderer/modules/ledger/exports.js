/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — exports.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */
/* ---------------- Exports ---------------- */
/** صف فاتورة كامل لكل أعمدة التصدير */
function invoiceExportHeaders(){
  return ['رقم الفاتورة','النوع','التاريخ','تاريخ الاستحقاق','المورد','الرقم الضريبي','البيان','الكود الداخلي','كود المورد','وصف الصنف','الكمية','سعر الوحدة','التصنيف','المشروع','طبيعة التعامل','نوع الخصم','القيمة الإجمالية','ضريبة القيمة المضافة','الدمغات','نسبة الخصم','المبلغ المخصوم','إجمالي الفاتورة','صافي الفاتورة','الباقي','ملاحظات'];
}
function invoiceExportRow(i){
  const s = supplierById(i.supplierId);
  return [
    i.invoiceNo||'', i.isReturn?'مرتجع':'فاتورة', i.date||'', i.dueDate||'',
    s?s.name:'', s?(s.taxId||''):'', i.description||'', i.internalCode||'', i.supplierItemCode||'',
    i.itemDescription||'', i.quantity||'', i.unitPrice||'',
    i.category||'', i.project||'',
    codeDescription(NATURE_OPTIONS, i.nature), codeDescription(DISCOUNT_TYPE_OPTIONS, i.discountType),
    Number(i.baseValue||0), Number(i.vat||0), Number(i.stampDuty||0),
    i.discountRate?Number(i.discountRate):'', Number(i.withheld||0),
    Number(i.totalInvoice||0), Number(i.netInvoice||0),
    i.isReturn?0:Number(Number(invoiceRemaining(i)).toFixed(6)),
    i.notes||''
  ];
}

function sanitizeFilename(name){
  return String(name||'ملف').replace(/[\\/:*?"<>|]/g,'-').trim() || 'ملف';
}
function exportCategoriesExcel(){
  if(guardReadOnly('تصدير Excel')) return;
  if(activeCategory){
    const rows0 = DATA.ledger.invoices.filter(i=>i.category===activeCategory).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    exportExcelFile(`فواتير-تصنيف-${sanitizeFilename(activeCategory)}.xlsx`, sanitizeFilename(activeCategory).slice(0,31), invoiceExportHeaders(), rows0.map(invoiceExportRow));
    return;
  }
  const cats = allCategories().map(c=>{
    const invs = DATA.ledger.invoices.filter(i=>i.category===c);
    return [c, invs.length, Number(invs.reduce((a,b)=>a+Number(b.netInvoice||0),0).toFixed(2))];
  });
  exportExcelFile('التصنيفات.xlsx', 'التصنيفات', ['التصنيف','عدد الفواتير','الإجمالي'], cats);
}
function exportSuppliersCsv(){
  if(typeof guardReadOnly==='function' && guardReadOnly('تصدير Excel')) return;
  const list = typeof getFilteredSuppliers==='function'
    ? getFilteredSuppliers()
    : (DATA.ledger.suppliers||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ar'));
  if(!list.length){ lgShowToast('لا موردين مطابقين للبحث'); return; }
  const headers = ['الاسم','الرقم الضريبي','السجل التجاري','طبيعة النشاط','الرصيد الافتتاحي','تاريخ الرصيد الافتتاحي','الرصيد الحالي','الهاتف','البريد الإلكتروني','العنوان','رقم الحساب البنكي','IBAN','الخانات المخصصة','ملاحظات'];
  const rows = list.map(s=>[
    s.name, s.taxId||'', s.commercialReg||'', s.businessNature||'',
    Number(s.openingBalance||0), s.openingBalanceDate||'', Number((typeof supplierBalance==='function'?supplierBalance(s.id):0).toFixed(2)),
    s.phone||'', s.email||'', s.address||'', s.bankAccount||'', s.iban||'',
    typeof lgExtraFieldsSummary==='function'?lgExtraFieldsSummary(s.extraFields):'', s.notes||''
  ]);
  const fileTag = list.length===((DATA.ledger.suppliers||[]).length) ? 'الموردون' : ('موردون_مفلترون_'+list.length);
  exportExcelFile(fileTag+'.xlsx', 'الموردون', headers, rows);
  if(typeof logAction==='function') logAction('تصدير Excel موردين', (typeof searchQuery!=='undefined'&&searchQuery?searchQuery:'الكل')+' — '+list.length);
  lgShowToast('تم تصدير '+list.length+' مورد (الظاهرين)');
}
function exportAllInvoicesCsv(){
  const invs = typeof getFilteredInvoices==='function'
    ? getFilteredInvoices()
    : (DATA.ledger.invoices||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(!invs.length){ lgShowToast('لا توجد فواتير مطابقة للنتائج الظاهرة'); return; }
  const rows = invs.map(invoiceExportRow);
  const label = typeof invoiceFiltersLabel==='function' ? invoiceFiltersLabel() : 'نتائج';
  const fileTag = invs.length===((DATA.ledger.invoices||[]).length) ? 'كل_الفواتير' : ('فواتير_مفلترة_'+invs.length);
  exportExcelFile(fileTag+'.xlsx', 'الفواتير', invoiceExportHeaders(), rows);
  if(typeof logAction==='function') logAction('تصدير Excel فواتير', label+' — '+invs.length);
  lgShowToast('تم تصدير '+invs.length+' فاتورة (النتائج الظاهرة)');
}
function exportAllPaymentsCsv(){
  if(typeof guardReadOnly==='function' && guardReadOnly('تصدير Excel')) return;
  const pays = typeof getFilteredPayments==='function'
    ? getFilteredPayments()
    : (DATA.ledger.payments||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(!pays.length){ lgShowToast('لا توجد دفعات مطابقة للنتائج الظاهرة'); return; }
  const headers = ['رقم الدفعة','التاريخ','المورد','الرقم الضريبي','الفاتورة المرتبطة','تاريخ الفاتورة','صافي الفاتورة','طريقة الدفع','المبلغ','رقم التحويل البنكي','تفاصيل إضافية','ملاحظات','معرّف الدفعة'];
  const rows = pays.map(p=>{
    const s = typeof supplierById==='function'?supplierById(p.supplierId):null;
    const linkedInv = p.invoiceId ? (DATA.ledger.invoices||[]).find(i=>i.id===p.invoiceId) : null;
    return [
      p.paymentNo||'', p.date||'', s?s.name:'', s?(s.taxId||''):'',
      linkedInv?linkedInv.invoiceNo:'دفعة عامة', linkedInv?(linkedInv.date||''):'',
      linkedInv?Number(linkedInv.netInvoice||0):'',
      p.method||'', Number(p.amount||0), p.transferRef||'',
      typeof lgExtraFieldsSummary==='function'?lgExtraFieldsSummary(p.extraFields):'', p.notes||'', p.id||''
    ];
  });
  const fileTag = pays.length===((DATA.ledger.payments||[]).length) ? 'كل_الدفعات' : ('دفعات_مفلترة_'+pays.length);
  exportExcelFile(fileTag+'.xlsx', 'الدفعات', headers, rows);
  const label = typeof paymentsFiltersLabel==='function' ? paymentsFiltersLabel() : 'نتائج';
  if(typeof logAction==='function') logAction('تصدير Excel دفعات', label+' — '+pays.length);
  lgShowToast('تم تصدير '+pays.length+' دفعة (النتائج الظاهرة)');
}
function exportSupplierCsv(){
  const s = supplierById(activeSupplierId); if(!s) return;
  const rows = supplierInvoices(s.id).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(invoiceExportRow);
  exportExcelFile(sanitizeFilename(s.name)+'.xlsx', sanitizeFilename(s.name).slice(0,31), invoiceExportHeaders(), rows);
}
/** تصدير إشعارات الخصم PDF حسب النتائج الظاهرة في صفحة التقرير (بحث / فترة / ربع / سنة) */
function exportVisibleQuarterNoticesPdf(){
  const invs = (typeof getVisibleQuarterlyInvoices === 'function')
    ? getVisibleQuarterlyInvoices()
    : [];
  if(!invs.length){ lgShowToast('لا توجد إشعارات خصم مطابقة للنتائج الظاهرة'); return; }
  const pages = invs.map((inv, idx) => buildDiscountNoticeHtml(inv, idx < invs.length - 1)).join('');
  let label = String(quarterlyYear || '');
  if(quarterlyPeriod === 'ALL') label += '-سنة-كاملة';
  else if(quarterlyPeriod) label += '-' + quarterlyPeriod;
  if(quarterlyFilters.from || quarterlyFilters.to){
    label += (quarterlyFilters.from ? '-من-' + quarterlyFilters.from : '') + (quarterlyFilters.to ? '-إلى-' + quarterlyFilters.to : '');
  }
  if(quarterlyFilters.q && quarterlyFilters.q.trim()){
    label += '-' + sanitizeFilename(quarterlyFilters.q.trim()).slice(0, 40);
  }
  printHtmlContent(pages, `إشعارات-خصم-${sanitizeFilename(label)}.pdf`);
  logAction('تصدير PDF مجمع', `إشعارات خصم ظاهرة — ${invs.length}`);
}
/** تصدير كل إشعارات الخصم لمورد واحد */
function exportSupplierDiscountNoticesPdf(supplierId){
  const s = supplierById(supplierId);
  if(!s){ lgShowToast('مورد غير موجود'); return; }
  const invs = DATA.ledger.invoices.filter(i=>{
    if(i.supplierId !== supplierId) return false;
    if(i.isReturn || i.cancelled || Number(i.withheld||0)<=0) return false;
    return true;
  }).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  if(!invs.length){ lgShowToast('لا توجد إشعارات خصم لهذا المورد'); return; }
  const pages = invs.map((inv, idx) => buildDiscountNoticeHtml(inv, idx < invs.length - 1)).join('');
  printHtmlContent(pages, `إشعارات-خصم-${sanitizeFilename(s.name)}.pdf`);
  logAction('تصدير PDF مورد', `إشعارات خصم ${s.name} — ${invs.length}`);
}

function exportQuarterNoticesPdf(key){
  // للتوافق: إن وُجد مفتاح ربع قديم يُصدَّر الربع؛ وإلا النتائج الظاهرة
  if(key && String(key).indexOf('-ALL') === -1 && /^\d{4}-\d$/.test(String(key))){
    const parts = String(key).split('-');
    const year = Number(parts[0]), qn = Number(parts[1]);
    const months = {1:[1,2,3],2:[4,5,6],3:[7,8,9],4:[10,11,12]}[qn] || [];
    const invs = DATA.ledger.invoices.filter(i=>{
      if(i.isReturn) return false;
      if(!i.withheld || Number(i.withheld)<=0) return false;
      if(!i.date) return false;
      const y = Number(String(i.date).slice(0,4)), mo = Number(String(i.date).slice(5,7));
      return y===year && months.includes(mo);
    }).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    if(!invs.length){ lgShowToast('لا توجد إشعارات خصم في هذا الربع'); return; }
    const pages = invs.map((inv, idx) => buildDiscountNoticeHtml(inv, idx < invs.length - 1)).join('');
    printHtmlContent(pages, `إشعارات-خصم-ربع-${key}.pdf`);
    logAction('تصدير PDF مجمع', `إشعارات خصم ${key} — ${invs.length}`);
    return;
  }
  exportVisibleQuarterNoticesPdf();
}
