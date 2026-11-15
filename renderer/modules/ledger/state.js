/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — state.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */
/* =========================================================
   دفتر الموردين والفواتير - تطبيق سطح مكتب يعمل بالكامل بدون إنترنت
   التخزين محلي في ملف حقيقي على جهازك (وليس داخل المتصفح)
   ========================================================= */

const CATEGORY_SUGGESTIONS = ['مصاريف','تكاليف','أصول ثابتة','مخزون / مشتريات'];
const NATURE_OPTIONS = [
  {code:'1', label:'مقاولات'}, {code:'2', label:'توريدات'}, {code:'3', label:'مشتريات'},
  {code:'4', label:'خدمات'}, {code:'10', label:'أعمال مهنية'}
];
const DISCOUNT_TYPE_OPTIONS = [
  {code:'1', label:'غير محدد'}, {code:'2', label:'مردودات'}, {code:'3', label:'رد تجاري'},
  {code:'5', label:'دفعات مقدمة'}, {code:'6', label:'إعفاءات'}, {code:'7', label:'مردودات دفعات'},
  {code:'8', label:'مردودات إعفاءات'}
];
let lgCurrentPage = 'dashboard'; // dashboard | suppliers | invoices | payments | categories | quarterly | backup
let activeSupplierId = null;
let activeSupplierTab = 'info';
let searchQuery = '';
let invoiceFilters = { supplierId: '', category: '', project: '', from: '', to: '', q: '', overdueOnly: false, year: '', month: '', kind: '', status: '', withheld: '', min: '', max: '', sort: 'new' };
let activeCategory = null;
let activeQuarterKey = null; // "2026-1"
let quarterlyYear = null;
let quarterlyPeriod = 'Q1'; // Q1-Q4
let quarterlyFilters = { from: '', to: '', q: '', month: '', supplierId: '', category: '', project: '', min: '', max: '', sort: 'old' };
let statementFilters = { supplierId: '', from: '', to: '' };
let reportsYear = null;
let reportsPeriod = 'ALL'; // Q1 | Q2 | Q3 | Q4 | ALL
let reportsFrom = '';
let reportsTo = '';
let invoiceListPage = 1; // توافق خلفي
const LG_TABLE_PAGE_SIZE = 20;
const lgPageState = { invoices:1, payments:1, categories:1, quarterly:1, reports:1, supplierInvoices:1, supplierPayments:1, auditLog:1, archive:1 };
function lgGetTablePage(key){ return Math.max(1, lgPageState[key] || 1); }
function lgSetTablePage(key, n){ lgPageState[key] = Math.max(1, Number(n)||1); if(key==='invoices') invoiceListPage = lgPageState[key]; }
function lgResetTablePage(key){ lgSetTablePage(key, 1); }
function lgPaginateRows(rows, key){
  const pageSize = LG_TABLE_PAGE_SIZE;
  const totalRows = (rows||[]).length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize) || 1);
  let page = lgGetTablePage(key);
  if(page > totalPages){ page = totalPages; lgSetTablePage(key, page); }
  const pageStart = (page - 1) * pageSize;
  return {
    pageRows: (rows||[]).slice(pageStart, pageStart + pageSize),
    page, totalPages, totalRows, pageStart, pageSize
  };
}
function lgTablePagerHtml(key, info){
  const { page, totalPages, totalRows, pageStart, pageSize } = info;
  return `<div class="btn-row table-pager" data-pager="${key}" style="justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
    <span style="font-size:13px;color:var(--ink-soft);">عرض ${totalRows?pageStart+1:0}–${Math.min(pageStart+pageSize,totalRows)} من ${totalRows} <span style="opacity:.75;">(20 لكل صفحة)</span></span>
    <div style="display:flex;gap:8px;align-items:center;">
      <button type="button" class="btn btn-outline btn-sm" data-page-prev="${key}" ${page<=1?'disabled':''}>السابق</button>
      <span style="font-size:13px;font-weight:700;">صفحة ${page} / ${totalPages}</span>
      <button type="button" class="btn btn-outline btn-sm" data-page-next="${key}" ${page>=totalPages?'disabled':''}>التالي</button>
    </div>
  </div>`;
}

const INVOICE_PAGE_SIZE = LG_TABLE_PAGE_SIZE; // 20

// هل تم عرض تنبيه المتأخرات عند الفتح
let overdueAlertShown = false;

let paymentsFilters = { from: '', to: '', year: '', q: '', month: '', supplierId: '', method: '', direction: '', link: '', min: '', max: '', sort: 'new' };
