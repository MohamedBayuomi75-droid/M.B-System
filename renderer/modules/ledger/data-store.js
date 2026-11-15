/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — data-store.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */


          // عدد عمليات الحفظ الجارية (عشان إغلاق النافذة ما يقطعش كتابة نصف خالصة)
    // لو تحميل البيانات فشل: نمنع الحفظ عشان ما نكتبش بيانات فاضية فوق بياناتك
let __lgIndexes = { suppliersById: {}, paidByInvoice: {}, paymentsBySupplier: {}, invoicesBySupplier: {} };

function lgRebuildIndexes(){
  const suppliersById = Object.create(null);
  const paidByInvoice = Object.create(null);
  const paymentsBySupplier = Object.create(null);
  const invoicesBySupplier = Object.create(null);
  (DATA.ledger.suppliers || []).forEach(s => { if(s && s.id) suppliersById[s.id] = s; });
  (DATA.ledger.invoices || []).forEach(inv => {
    if(!inv || !inv.id) return;
    const sid = inv.supplierId || '';
    if(!invoicesBySupplier[sid]) invoicesBySupplier[sid] = [];
    invoicesBySupplier[sid].push(inv);
  });
  (DATA.ledger.payments || []).forEach(p => {
    if(!p) return;
    const sid = p.supplierId || '';
    if(!paymentsBySupplier[sid]) paymentsBySupplier[sid] = [];
    paymentsBySupplier[sid].push(p);
    if(p.invoiceId){
      paidByInvoice[p.invoiceId] = (paidByInvoice[p.invoiceId] || 0) + (Number(p.amount) || 0);
    }
  });
  __lgIndexes = { suppliersById, paidByInvoice, paymentsBySupplier, invoicesBySupplier };
}

function lgSanitizeLoadedData(){
  if(!Array.isArray(DATA.ledger.suppliers)) DATA.ledger.suppliers = [];
  if(!Array.isArray(DATA.ledger.invoices)) DATA.ledger.invoices = [];
  if(!Array.isArray(DATA.ledger.payments)) DATA.ledger.payments = [];
  if(!Array.isArray(DATA.ledger.customCategories)) DATA.ledger.customCategories = [];
  if(!Array.isArray(DATA.ledger.customInternalCodes)) DATA.ledger.customInternalCodes = [];
  if(!Array.isArray(DATA.ledger.customSupplierItemCodes)) DATA.ledger.customSupplierItemCodes = [];
  if(!Array.isArray(DATA.ledger.customItemNames)) DATA.ledger.customItemNames = [];
  if(!Array.isArray(DATA.ledger.customLinkedItems)) DATA.ledger.customLinkedItems = [];
  if(!Array.isArray(DATA.ledger.customProjects)) DATA.ledger.customProjects = [];
  if(!Array.isArray(DATA.ledger.hiddenProjects)) DATA.ledger.hiddenProjects = [];
  if(!Array.isArray(DATA.ledger.customItemDescriptions)) DATA.ledger.customItemDescriptions = [];
  if(!Array.isArray(DATA.ledger.hiddenSuggestions)) DATA.ledger.hiddenSuggestions = [];
  if(!Array.isArray(DATA.ledger.archiveFolders)) DATA.ledger.archiveFolders = [];
  if(!Array.isArray(DATA.ledger.archiveTrash)) DATA.ledger.archiveTrash = [];
  if(!Array.isArray(DATA.ledger.archiveSections)) DATA.ledger.archiveSections = [];
  if(!Array.isArray(DATA.ledger.documentTypes)) DATA.ledger.documentTypes = [];
  if(!Array.isArray(DATA.ledger.documentTypeHidden)) DATA.ledger.documentTypeHidden = [];
  // إزالة عناصر تالفة
  DATA.ledger.suppliers = DATA.ledger.suppliers.filter(s => s && typeof s === 'object' && s.id);
  DATA.ledger.invoices = DATA.ledger.invoices.filter(i => i && typeof i === 'object' && i.id);
  DATA.ledger.payments = DATA.ledger.payments.filter(p => p && typeof p === 'object' && p.id);
  DATA.ledger.archiveTrash = DATA.ledger.archiveTrash.filter(t => t && typeof t === 'object');
}

function lgMigrateData(){
  // ترقيم تلقائي للدفعات (رقم دفعة تسلسلي دائم) — نرقّم أي دفعات قديمة لسه من غير رقم
  // حسب ترتيب التاريخ (الأقدم أولاً) عشان يكون الترقيم منطقي تاريخيًا، ونضبط العدّاد
  // بحيث الدفعات الجديدة تاخد أرقام تالية ولا تتكرر حتى لو اتحذفت دفعة قديمة
  (function(){
    if(!DATA.settings || typeof DATA.settings !== 'object') DATA.settings = {};
    const missing = DATA.ledger.payments.filter(p=>!p.paymentNo);
    const existingMax = DATA.ledger.payments.reduce((m,p)=> p.paymentNo ? Math.max(m, Number(p.paymentNo)||0) : m, 0);
    // nextPaymentNo = «الرقم التالي اللي هيتاخد» (nextPaymentNo() بيرجّعه وبعدين يزوّده) — فمنزودش عليه تاني هنا
    // وإلا كل مرة يتفتح فيها البرنامج الرقم كان بيقفز واحد زيادة وتظهر فجوات في ترقيم الدفعات
    let counter = Math.max(existingMax + 1, Number(DATA.settings.nextPaymentNo)||1);
    if(missing.length){
      missing.slice().sort((a,b)=> String(a.date||'').localeCompare(String(b.date||''))).forEach(p=>{ p.paymentNo = counter++; });
    }
    if(!Number.isFinite(Number(DATA.settings.nextPaymentNo)) || counter > Number(DATA.settings.nextPaymentNo)){
      DATA.settings.nextPaymentNo = counter;
    }
  })();
  DATA.ledger.suppliers.forEach(s=>{
    if(s.category && !s.businessNature){ s.businessNature = s.category; }
    if(s.businessNature === undefined) s.businessNature = s.businessNature || '';
    if(s.email === undefined) s.email = '';
    if(s.bankAccount === undefined) s.bankAccount = '';
    if(s.iban === undefined) s.iban = '';
    delete s.category;
  });
  DATA.ledger.invoices.forEach(i=>{
    if(i.baseValue === undefined){
      i.baseValue = Number(i.total || 0);
      delete i.total;
    }
    if(i.vat === undefined) i.vat = 0;
    if(i.stampDuty === undefined) i.stampDuty = 0;
    const expectedTotal = Number(i.baseValue||0) + Number(i.vat||0) + Number(i.stampDuty||0);
    if(i.totalInvoice === undefined || !Number.isFinite(Number(i.totalInvoice))) i.totalInvoice = expectedTotal;
    if(i.netInvoice === undefined || !Number.isFinite(Number(i.netInvoice))) i.netInvoice = Number(i.totalInvoice||0) - Number(i.withheld||0);
    if(i.discountType === undefined) i.discountType = '';
    if(i.invoiceId !== undefined) delete i.invoiceId;
    if(!Array.isArray(i.attachments)) i.attachments = [];
    if(i.unitPrice === undefined) i.unitPrice = '';
  });
  DATA.ledger.payments.forEach(p=>{
    if(p.invoiceId === undefined) p.invoiceId = '';
    if(!Number.isFinite(Number(p.amount))) p.amount = 0;
    if(!Array.isArray(p.attachments)) p.attachments = [];
  });

  if(!Array.isArray(DATA.ledger.archiveFolders)) DATA.ledger.archiveFolders = [];
  if(!Array.isArray(DATA.ledger.archiveTrash)) DATA.ledger.archiveTrash = [];
  if(!Array.isArray(DATA.ledger.documentTypes)) DATA.ledger.documentTypes = [];
  if(!Array.isArray(DATA.ledger.documentTypeHidden)) DATA.ledger.documentTypeHidden = [];
  if(!Array.isArray(DATA.ledger.archiveSections)) DATA.ledger.archiveSections = [];
  DATA.ledger.suppliers.forEach(s=>{ if(!Array.isArray(s.attachments)) s.attachments = []; });
}

/** رقم دفعة تسلسلي جديد وفريد — يُستخدم مرة واحدة (يزيد العدّاد فورًا) عشان دفعتين
 *  في نفس الحفظ (توزيع دفعة على أكتر من فاتورة مثلاً) ياخدوا رقمين مختلفين */
function nextPaymentNo(){
  if(!DATA.settings || typeof DATA.settings !== 'object') DATA.settings = {};
  const n = Number(DATA.settings.nextPaymentNo) || 1;
  DATA.settings.nextPaymentNo = n + 1;
  return n;
}

