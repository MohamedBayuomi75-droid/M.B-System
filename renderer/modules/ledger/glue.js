/* =====================================================================
   glue.js — ربط دفتر الموردين بإطار البرنامج الموحّد  (ملف يدوي، مش مولَّد)
   ---------------------------------------------------------------------
   باقي ملفات modules/ledger/*.js اتولّدت بالـ codemod (tools/merge) من برنامج دفتر الموردين الأصلي
   (أسماء متصادمة بتبدأ بـ lg…، وبيانات الموردين في DATA.ledger). الملف ده بيربطها بـ:
     1) الصفحات والرسم (قائمة الوحدات، renderCurrentPage، attachPageHandlers)
     2) دورة حياة البيانات (تحميل/حفظ/ترقية/استيراد البيانات القديمة)
     3) الإعدادات (تبويب «الموردون والفواتير» جوه صفحة الإعدادات الموحّدة)
   ===================================================================== */

/* ================= 1) الصفحات والرسم ================= */
const LEDGER_PAGES = ['dashboard', 'suppliers', 'invoices', 'returns', 'payments', 'categories', 'quarterly', 'reports', 'archive'];

/** وضع صفحة الفواتير: 'invoices' (الفواتير فقط) | 'returns' (المرتجعات فقط) | '' (الكل — تصدير الإعدادات). بيتغيّر مع الصفحة المفتوحة */
let lgInvoicesMode = '';
function lgSetInvoicesMode(m){
  const prev = lgInvoicesMode;
  lgInvoicesMode = m;
  // الفلاتر ما بتتسرّب من صفحة الفواتير لصفحة المرتجعات (والعكس). الدخول من برا (من لوحة المتابعة مثلاً) بيحافظ على الفلتر المطلوب
  if((prev === 'invoices' && m === 'returns') || (prev === 'returns' && m === 'invoices')){
    try{
      Object.assign(invoiceFilters, { supplierId: '', category: '', project: '', from: '', to: '', q: '', overdueOnly: false, year: '', month: '', kind: '', status: '', withheld: '', min: '', max: '', sort: 'new' });
      invoiceListPage = 1; lgSetTablePage('invoices', 1);
    }catch(_e){}
  }
}

/** هل الصفحة الحالية في الإطار الموحّد تابعة للدفتر؟ (currentPage هنا بتاع الإطار الموحّد) */
function lgIsActive(){
  try{ return moduleOfPage(currentPage).id === 'ledger'; }catch(_e){ return false; }
}

/** بديل render() بتاع الدفتر الأصلي: بيزامن الصفحة الحالية مع الإطار الموحّد وبيعيد الرسم */
function lgRender(){
  if(LEDGER_PAGES.indexOf(lgCurrentPage) < 0) lgCurrentPage = 'dashboard';
  currentPage = 'ledger.' + lgCurrentPage;
  render();
}

/** HTML صفحة الدفتر (بيستدعيها renderCurrentPage في الإطار الموحّد) */
function renderLedgerPage(pageKey){
  if(LEDGER_PAGES.indexOf(pageKey) < 0) pageKey = 'dashboard';
  lgCurrentPage = pageKey;
  if(pageKey !== 'invoices' && pageKey !== 'returns') lgInvoicesMode = '';
  switch(pageKey){
    case 'dashboard': {
      const L = DATA.ledger;
      const signedAmt = (b, k) => (b.isReturn ? -1 : 1) * Number(b[k] || 0);   // المرتجع يخصم
      const totalSuppliers = L.suppliers.length;
      const totalInvoicesVal = L.invoices.reduce((a, b) => a + signedAmt(b, 'totalInvoice'), 0);
      const totalWithheld = L.invoices.reduce((a, b) => a + signedAmt(b, 'withheld'), 0);
      const totalVatAll = L.invoices.reduce((a, b) => a + signedAmt(b, 'vat'), 0);
      const totalStampAll = L.invoices.reduce((a, b) => a + signedAmt(b, 'stampDuty'), 0);
      const totalNetAll = L.invoices.reduce((a, b) => a + invoiceSignedNet(b), 0);
      const totalPayments = L.payments.reduce((a, b) => a + Number(b.amount || 0), 0);
      const totalDebt = L.suppliers.reduce((sum, s) => { const b = supplierBalance(s.id); return sum + (b > 0 ? b : 0); }, 0);
      return renderDashboard(totalSuppliers, totalInvoicesVal, totalWithheld, totalDebt, totalVatAll, totalStampAll, totalNetAll, totalPayments);
    }
    case 'suppliers': return renderSuppliersPage();
    case 'invoices': lgSetInvoicesMode('invoices'); return renderInvoicesPage('invoices');
    case 'returns': lgSetInvoicesMode('returns'); return renderInvoicesPage('returns');
    case 'payments': return renderPaymentsPage();
    case 'categories': return renderCategoriesPage();
    case 'quarterly': return renderQuarterlyPage();
    case 'reports': return lgRenderReportsPage();
    case 'archive': return lgRenderArchivePage();
  }
  return '';
}

/** بعد رسم صفحة الدفتر: ربط الأحداث + أدوات الأرقام + القفل (زي آخر render() في الدفتر الأصلي) */
function lgAfterRender(){
  try{ lgAttachPageHandlers(); }catch(handlerErr){ console.error('attachPageHandlers error:', handlerErr); }
  try{ installMoneyInputs(); }catch(e){ console.error('installMoneyInputs error:', e); }
  try{ fitMoneyBlocks(); }catch(e){}
  if(!window.__fitMoneyResize){
    window.__fitMoneyResize = true;
    window.addEventListener('resize', () => { clearTimeout(window.__fitMoneyT); window.__fitMoneyT = setTimeout(() => { try{ fitMoneyBlocks(); }catch(e){} }, 150); });
  }
  try{
    if(typeof applyReadOnlyDomLocks === 'function') applyReadOnlyDomLocks();
    else document.body.classList.toggle('body-readonly', !!readOnlyMode);
  }catch(e){}
  try{
    if(!readOnlyMode){
      document.body.classList.remove('body-readonly');
      if(typeof forceUnlockAllInputs === 'function') forceUnlockAllInputs(document, true);
    }
  }catch(e){}
}

/** شريط أدوات صغير تحت قائمة الدفتر (كان في هيدر الدفتر الأصلي) */
function renderLedgerToolbar(){
  return `<div class="module-toolbar no-print">
    <button type="button" class="btn btn-outline btn-sm" onclick="openGlobalValidationModal()" title="فحص بيانات الموردين والفواتير">✓ فحص البيانات</button>
    <button type="button" class="btn btn-outline btn-sm" onclick="lgOpenShortcutsHelp()" title="اختصارات لوحة المفاتيح في صفحات الدفتر">⌨ اختصارات الدفتر</button>
    <button type="button" class="btn btn-outline btn-sm" onclick="goToPage('backup')" title="إعدادات النظام الموحد — تبويب الموردون">⚙️ الإعدادات</button>
  </div>`;
}

/* ================= 2) دورة حياة البيانات ================= */
// مفاتيح بيانات الدفتر (داخل DATA.ledger). settings و auditLog مشتركين مع البرنامج الموحّد (على المستوى الأعلى)
const LEDGER_DOMAIN_KEYS = ['suppliers', 'invoices', 'payments', 'customCategories', 'customInternalCodes', 'customSupplierItemCodes',
  'customItemNames', 'customLinkedItems', 'customProjects', 'hiddenProjects', 'customItemDescriptions', 'hiddenSuggestions',
  'archiveFolders', 'archiveTrash', 'archiveSections', 'documentTypes', 'documentTypeHidden'];

function lgDefaultSection(){
  const o = {};
  LEDGER_DOMAIN_KEYS.forEach(k => { o[k] = []; });
  return o;
}

/** تنظيف + ترقية + فهارس — بعد تحميل البيانات أو استيرادها */
function lgNormalizeData(){
  if(!DATA.ledger || typeof DATA.ledger !== 'object' || Array.isArray(DATA.ledger)) DATA.ledger = {};
  if(!DATA.settings || typeof DATA.settings !== 'object') DATA.settings = {};
  lgSanitizeLoadedData();
  lgMigrateData();
  lgRebuildIndexes();
}
function lgOnDataLoaded(){ try{ lgNormalizeData(); }catch(e){ console.error('ledger normalize error:', e); } }
function lgOnBeforeSave(){ try{ lgRebuildIndexes(); }catch(_e){} }

/**
 * بيستوعب كائن بيانات دفتر قديم (ملف data.json من برنامج الدفتر، أو قسم ledger بصيغة 0.3.0 اللي كان جواه settings و auditLog):
 *  - الإعدادات بتتدمج في إعدادات البرنامج الموحّد (managerName → companyManager) من غير ما تمسح قيم موجودة
 *  - سجل العمليات بيتدمج في سجل التدقيق الموحّد (من غير تكرار)
 *  - بيرجّع قسم الدفتر (المفاتيح الخاصة بالدفتر بس)
 */
function lgAbsorbLegacyLedgerObject(src){
  src = src && typeof src === 'object' ? src : {};
  const section = {};
  LEDGER_DOMAIN_KEYS.forEach(k => { if(src[k] !== undefined) section[k] = src[k]; });

  if(!DATA.settings || typeof DATA.settings !== 'object') DATA.settings = {};
  const st = (src.settings && typeof src.settings === 'object') ? src.settings : {};
  if(st.companyName && !DATA.settings.companyName) DATA.settings.companyName = st.companyName;
  if(st.managerName && !DATA.settings.companyManager) DATA.settings.companyManager = st.managerName;
  Object.keys(st).forEach(k => {
    if(k === 'companyName' || k === 'managerName' || k === 'nextPaymentNo') return;
    if(DATA.settings[k] === undefined) DATA.settings[k] = st[k];
  });
  const nextNo = Math.max(Number(DATA.settings.nextPaymentNo) || 1, Number(st.nextPaymentNo) || 1);
  DATA.settings.nextPaymentNo = nextNo;

  if(Array.isArray(src.auditLog) && src.auditLog.length){
    if(!Array.isArray(DATA.auditLog)) DATA.auditLog = [];
    const have = new Set(DATA.auditLog.map(e => e && e.id));
    src.auditLog.forEach(e => { if(e && e.id && !have.has(e.id)){ DATA.auditLog.push(e); have.add(e.id); } });
    DATA.auditLog.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    if(DATA.auditLog.length > 3000) DATA.auditLog = DATA.auditLog.slice(0, 3000);
  }
  return section;
}

/** ترحيل قسم ledger اللي اتحفظ بصيغة 0.3.0 (كان جواه settings و auditLog) — بيتنادى من ترحيل schema 4 */
function lgMigrateLegacySection(){
  const sec = DATA.ledger;
  if(!sec || typeof sec !== 'object' || Array.isArray(sec)) return;
  if(sec.settings === undefined && sec.auditLog === undefined) return;
  const clean = lgAbsorbLegacyLedgerObject(sec);
  const extras = {};
  Object.keys(sec).forEach(k => { if(k !== 'settings' && k !== 'auditLog' && clean[k] === undefined) extras[k] = sec[k]; });
  DATA.ledger = Object.assign(clean, extras);
}

/** تطبيق بيانات دفتر مستوردة (بدون واجهة) */
function lgApplyImportedLedgerObject(obj){
  const section = lgAbsorbLegacyLedgerObject(obj);
  DATA.ledger = section;
  lgNormalizeData();
}

/** استيراد ملف data.json بتاع برنامج دفتر الموردين القديم (من الواجهة) */
async function lgImportLedgerFile(file){
  try{
    if(readOnlyMode){ showToast('🔒 وضع القراءة فقط — الاستيراد غير مسموح'); return; }
    if(file.size > 60 * 1024 * 1024) throw new Error('الملف كبير جداً');
    let obj;
    try{ obj = JSON.parse(await file.text()); }catch(_e){ throw new Error('الملف مش JSON صالح'); }
    if(!obj || !Array.isArray(obj.suppliers) || !Array.isArray(obj.invoices) || !Array.isArray(obj.payments)){
      throw new Error('الملف ده مش بيانات دفتر الموردين (مفيش موردين/فواتير/دفعات)');
    }
    const cur = DATA.ledger || {};
    const hasData = !!((cur.suppliers || []).length || (cur.invoices || []).length || (cur.payments || []).length);
    const summary = obj.suppliers.length + ' مورد، ' + obj.invoices.length + ' فاتورة، ' + obj.payments.length + ' دفعة';
    const msg = hasData
      ? 'هيتم استبدال بيانات الموردين والفواتير الحالية بالملف ده (' + summary + ').\nهيتم أخذ نسخة احتياطية قبل الاستبدال.\n\nتكمل؟'
      : 'استيراد بيانات دفتر الموردين (' + summary + ')؟';
    if(!window.confirm(msg)) return;
    try{ await Promise.resolve(saveData(true)); }catch(_e){}
    try{ if(window.desktopApi && typeof window.desktopApi.backupNow === 'function') await window.desktopApi.backupNow(); }catch(_e){}
    const droppedUsers = Array.isArray(obj.users) && obj.users.length;
    lgApplyImportedLedgerObject(obj);
    try{ addAudit('استيراد بيانات دفتر الموردين', summary); }catch(_e){}
    await Promise.resolve(saveData(true));
    showToast('✅ تم استيراد ' + summary + (droppedUsers ? ' (تم تجاهل حسابات المستخدمين القديمة)' : ''));
    render();
  }catch(e){
    showToast('❌ ' + String(e && e.message || e));
  }
}

/** مسح بيانات الموردين والفواتير فقط (باقي بيانات البرنامج ما بتتأثرش) */
async function lgResetLedgerData(){
  if(readOnlyMode){ showToast('🔒 وضع القراءة فقط'); return; }
  if(!window.confirm('هيتم حذف كل الموردين والفواتير والدفعات والأرشيف الخاص بالدفتر نهائياً.\nباقي بيانات البرنامج (الموارد البشرية والإعدادات) ما بتتأثرش.\nهيتم أخذ نسخة احتياطية قبل المسح.\n\nتكمل؟')) return;
  if(!window.confirm('تأكيد أخير: مسح بيانات الموردين والفواتير؟')) return;
  try{ await Promise.resolve(saveData(true)); }catch(_e){}
  try{ if(window.desktopApi && typeof window.desktopApi.backupNow === 'function') await window.desktopApi.backupNow(); }catch(_e){}
  DATA.ledger = lgDefaultSection();
  if(DATA.settings) DATA.settings.nextPaymentNo = 1;
  lgNormalizeData();
  try{ addAudit('مسح بيانات الموردين والفواتير', ''); }catch(_e){}
  await Promise.resolve(saveData(true));
  showToast('تم مسح بيانات الموردين والفواتير');
  render();
}

/* ================= 3) الإعدادات (تبويب جوه صفحة الإعدادات الموحّدة) ================= */
function lgRenderSettingsPanel(){
  const decOpts = [['6', '٦ خانات (دقة كاملة)'], ['5', '٥ خانات'], ['4', '٤ خانات'], ['3', '٣ خانات'], ['2', 'خانتان'], ['0', 'بدون كسور'], ['auto', 'تلقائي (بدون أصفار زيادة)']]
    .map(o => `<option value="${o[0]}" ${String(moneyDecimals()) === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('');
  return `
      <div class="settings-panel" data-panel="ledger" style="display:none;">
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">تنسيق الأرقام المالية (الموردون والفواتير)</div>
          <div class="form-grid form-grid-2">
            <label>عدد الخانات العشرية<select class="input" id="lgMoneyDecimalsSelect">${decOpts}</select></label>
            <label>معاينة<div id="lgMoneyDecimalsPreview" dir="ltr" style="font-weight:800;font-size:16px;padding:8px 0;text-align:right;">${fmt(5657435865.655668)}</div></label>
          </div>
          <p style="font-size:12.5px;color:var(--ink-soft);margin:8px 0 0;">اسم الشركة واسم المدير (اللي بيظهر في إشعارات الخصم) من تبويب «الشركة».</p>
        </div>
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">استيراد وتصدير</div>
          <div class="btn-row">
            <button type="button" class="btn btn-primary" id="lgImportOldBtn">📥 استيراد بيانات دفتر الموردين القديمة (data.json)</button>
            <button type="button" class="btn btn-outline" id="lgExcelImportBtn">استيراد من إكسيل</button>
            <button type="button" class="btn btn-outline" id="lgExportSuppliersBtn">تصدير الموردين</button>
            <button type="button" class="btn btn-outline" id="lgExportInvoicesBtn">تصدير كل الفواتير</button>
            <button type="button" class="btn btn-outline" id="lgExportPaymentsBtn">تصدير كل الدفعات</button>
          </div>
          <input type="file" id="lgImportOldFile" accept=".json,application/json" hidden>
          <p style="font-size:12.5px;color:var(--ink-soft);margin:8px 0 0;">المرفقات القديمة محفوظة بمساراتها الكاملة على الجهاز — سيب مجلد برنامج الدفتر القديم مكانه لحد ما يتم نقل المرفقات.</p>
        </div>
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">فحص البيانات</div>
          <div class="btn-row">
            <button type="button" class="btn btn-primary" id="lgValidateBtn">✓ فحص البيانات الآن</button>
            <button type="button" class="btn btn-outline" id="lgFixCalcBtn" ${readOnlyMode ? 'disabled' : ''}>إصلاح حسابات الفواتير (الإجمالي والصافي)</button>
          </div>
        </div>
        <div class="settings-card" style="border-color:#c0392b;">
          <div class="section-title" style="margin-top:0;color:#c0392b;">منطقة خطر — الموردون والفواتير</div>
          <p style="font-size:13px;color:var(--ink-soft);">حذف كل الموردين والفواتير والدفعات والأرشيف الخاص بالدفتر نهائياً. باقي بيانات البرنامج ما بتتأثرش.</p>
          <button type="button" class="btn btn-outline" id="lgResetBtn" style="color:#c0392b;border-color:#c0392b;" ${readOnlyMode ? 'disabled' : ''}>🗑️ مسح بيانات الموردين والفواتير</button>
        </div>
      </div>`;
}

function lgInitSettingsPanel(){
  const sel = document.getElementById('lgMoneyDecimalsSelect');
  if(sel) sel.addEventListener('change', () => {
    if(readOnlyMode){ showToast('وضع القراءة فقط'); return; }
    if(!DATA.settings || typeof DATA.settings !== 'object') DATA.settings = {};
    DATA.settings.moneyDecimals = sel.value === 'auto' ? 'auto' : Number(sel.value);
    saveData();
    const pv = document.getElementById('lgMoneyDecimalsPreview'); if(pv) pv.textContent = fmt(5657435865.655668);
    showToast('تم تغيير تنسيق الأرقام');
  });
  const bind = (id, fn) => { const b = document.getElementById(id); if(b) b.addEventListener('click', fn); };
  bind('lgImportOldBtn', () => document.getElementById('lgImportOldFile')?.click());
  const f = document.getElementById('lgImportOldFile');
  if(f) f.addEventListener('change', () => { const file = f.files && f.files[0]; f.value = ''; if(file) lgImportLedgerFile(file); });
  bind('lgExcelImportBtn', () => lgOpenExcelImportModal());
  bind('lgExportSuppliersBtn', () => exportSuppliersCsv());
  bind('lgExportInvoicesBtn', () => exportAllInvoicesCsv());
  bind('lgExportPaymentsBtn', () => exportAllPaymentsCsv());
  bind('lgValidateBtn', () => openGlobalValidationModal());
  bind('lgFixCalcBtn', () => openFixCalculationsConfirm());
  bind('lgResetBtn', () => lgResetLedgerData());
}
