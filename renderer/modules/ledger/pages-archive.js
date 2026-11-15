/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — pages-archive.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */
/* ---------------- أرشيف الموردين — مجلد لكل مورد + 4 مجلدات فرعية ---------------- */
let lgArchiveFilters = {
  level: 'suppliers', // suppliers | supplier | sub | trash
  supplierId: '',
  sub: '', // papers | invoices | payments | notices
  // فلاتر قائمة الموردين
  lq: '', lyear: '', lcontent: '', ldoc: '', lsort: 'name',
  // فلاتر داخل المجلدات الفرعية
  q: '', year: '', month: '', from: '', to: '',
  status: '', method: '', direction: '', docType: '', kind: '', sort: 'new',
  // بحث سلة المهملات
  tq: ''
};

const ARCHIVE_SUBFOLDERS = [
  { id: 'papers',   label: 'أوراق المورد',        icon: '📋' },
  { id: 'invoices', label: 'فواتير المورد',       icon: '📄' },
  { id: 'payments', label: 'دفعات المورد',        icon: '💳' },
  { id: 'notices',  label: 'إشعارات خصم المورد',  icon: '🧾' }
];

const SUPPLIER_DOC_TYPES = [
  { key: 'tax_card', label: 'بطاقة ضريبية' },
  { key: 'commercial_reg', label: 'سجل تجاري' },
  { key: 'national_id', label: 'بطاقة شخصية' },
  { key: 'authorization', label: 'تفويض' },
  { key: 'contract', label: 'عقد' },
  { key: 'registration_cert', label: 'شهادة تسجيل' },
  { key: 'bank_letter', label: 'خطاب بنكي' },
  { key: 'invoice_scan', label: 'صورة فاتورة' },
  { key: 'other', label: 'أخرى' }
];

function archiveSubLabel(id){
  const s = ARCHIVE_SUBFOLDERS.find(x=>x.id===id);
  return s ? s.label : id;
}
function supplierDocTypeLabel(key){
  if(!key) return 'مستند';
  const t = SUPPLIER_DOC_TYPES.find(x=>x.key===key);
  if(t) return t.label;
  return String(key);
}
function archiveExtIcon(name, mime){
  const ext = String(mime || (name||'').split('.').pop() || '').toLowerCase().replace('.','');
  if(['jpg','jpeg','png','gif','webp','bmp'].includes(ext)) return '🖼️';
  if(ext==='pdf') return '📄';
  if(['xls','xlsx','csv'].includes(ext)) return '📊';
  return '📎';
}

/** عدّادات المجلدات الفرعية لمورد */
function archiveSupplierCounts(supplierId){
  const s = typeof supplierById==='function' ? supplierById(supplierId) : (DATA.ledger.suppliers||[]).find(x=>x.id===supplierId);
  const papers = s && Array.isArray(s.attachments) ? s.attachments.filter(Boolean).length : 0;
  const invoices = (DATA.ledger.invoices||[]).filter(i=>i.supplierId===supplierId && !i.cancelled).length;
  const invAtt = (DATA.ledger.invoices||[]).filter(i=>i.supplierId===supplierId).reduce((n,i)=>n+((i.attachments||[]).length),0);
  const payments = (DATA.ledger.payments||[]).filter(p=>p.supplierId===supplierId).length;
  const payAtt = (DATA.ledger.payments||[]).filter(p=>p.supplierId===supplierId).reduce((n,p)=>n+((p.attachments||[]).length),0);
  const notices = (DATA.ledger.invoices||[]).filter(i=>i.supplierId===supplierId && !i.isReturn && !i.cancelled && Number(i.withheld)>0).length;
  return {
    papers,
    invoices: invoices,
    invoiceAtts: invAtt,
    payments,
    paymentAtts: payAtt,
    notices,
    total: papers + invAtt + payAtt + notices
  };
}

/* ===================== بحث وفلاتر الأرشيف ===================== */
const ARCH_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const ARCH_LIST_KEYS = ['lq','lyear','lcontent','ldoc'];
const ARCH_SUB_KEYS = ['q','year','month','from','to','status','method','direction','docType','kind'];

function archExtra(o){
  if(!o || typeof o!=='object') return '';
  return Object.values(o).map(v=>(v && typeof v==='object') ? JSON.stringify(v) : v).join(' ');
}
function archPaperLabel(a){
  return a.docTypeLabel || (a.docType ? supplierDocTypeLabel(a.docType) : '') || a.subject || 'مستند';
}
function archPaperKind(a){
  const mime = String(a.mime||a.type||'').toLowerCase();
  const ext = String((a.name||'').split('.').pop()||'').toLowerCase();
  if(/^(jpg|jpeg|png|gif|webp|bmp)$/.test(ext) || mime.indexOf('image/')===0) return 'image';
  if(ext==='pdf' || mime.indexOf('pdf')>-1) return 'pdf';
  if(/^(xls|xlsx|csv)$/.test(ext)) return 'excel';
  return 'other';
}
function archGroupBy(list, key){
  const m = Object.create(null);
  (list||[]).forEach(x=>{ if(!x) return; const k = x[key] || ''; (m[k] = m[k] || []).push(x); });
  return m;
}
function archSortBy(list, mode, dateOf, amountOf, nameOf){
  const arr = list.slice();
  const byDate = (a,b)=>String(dateOf(a)||'').localeCompare(String(dateOf(b)||''));
  if(mode==='old') arr.sort(byDate);
  else if(mode==='amount_desc') arr.sort((a,b)=>Number(amountOf(b)||0)-Number(amountOf(a)||0));
  else if(mode==='amount_asc') arr.sort((a,b)=>Number(amountOf(a)||0)-Number(amountOf(b)||0));
  else if(mode==='name' && nameOf) arr.sort((a,b)=>String(nameOf(a)||'').localeCompare(String(nameOf(b)||''),'ar'));
  else arr.sort((a,b)=>byDate(b,a));
  return arr;
}
function archMoney(n){ return typeof fmt==='function' ? fmt(n) : String(n); }

/* ---------- حالة الفلاتر ---------- */
function archiveResetListFilters(){
  Object.assign(lgArchiveFilters, { lq:'', lyear:'', lcontent:'', ldoc:'', lsort:'name' });
}
function archiveResetSubFilters(){
  Object.assign(lgArchiveFilters, { q:'', year:'', month:'', from:'', to:'', status:'', method:'', direction:'', docType:'', kind:'', sort:'new' });
}
function archActiveCount(keys){
  return keys.filter(k=>String(lgArchiveFilters[k]||'').trim()!=='').length;
}

/* ---------- عناصر الواجهة ---------- */
function archSelect(key, label, options, value){
  return `<div class="field"><label>${lgEscapeHtml(label)}</label>
    <select data-arch-f="${key}">
      ${options.map(o=>`<option value="${lgEscapeHtml(o[0])}" ${String(value||'')===String(o[0])?'selected':''}>${lgEscapeHtml(o[1])}</option>`).join('')}
    </select></div>`;
}
function archDateField(key, label, value){
  return `<div class="field"><label>${lgEscapeHtml(label)}</label><input type="date" data-arch-f="${key}" value="${lgEscapeHtml(value||'')}"></div>`;
}
function archSearchField(key, id, placeholder, value){
  return `<div class="field field-search"><label>بحث</label>
    <input type="search" class="search-box" id="${id}" data-arch-f="${key}" placeholder="${lgEscapeHtml(placeholder)}" value="${lgEscapeHtml(value||'')}" autocomplete="off"></div>`;
}
function archResetBtn(scope, n){
  return n ? `<button type="button" class="btn btn-outline btn-sm" id="btnArchResetFilters" data-scope="${scope}" style="align-self:flex-end;">✕ مسح الفلاتر (${n})</button>` : '';
}
function archSummary(html){
  return `<p style="margin:0 0 12px;font-size:13px;color:var(--ink-soft);">${html}</p>`;
}
function archEmptyMsg(base, active){
  return active ? 'لا نتائج مطابقة للبحث/الفلاتر — جرّب تعديلها أو اضغط «مسح الفلاتر»' : base;
}

/* ===================== قائمة المجلدات (الموردين) ===================== */
function archiveSuppliersView(){
  const f = lgArchiveFilters;
  const tokens = searchTokens(f.lq);
  const yr = f.lyear || '';
  const invBy = archGroupBy(DATA.ledger.invoices, 'supplierId');
  const payBy = archGroupBy(DATA.ledger.payments, 'supplierId');
  const invNoById = Object.create(null);
  (DATA.ledger.invoices||[]).forEach(i=>{ if(i && i.id) invNoById[i.id] = i.invoiceNo; });
  const out = [];

  (DATA.ledger.suppliers||[]).forEach(s=>{
    if(!s) return;
    let invs = (invBy[s.id]||[]).filter(i=>!i.cancelled);
    let pays = payBy[s.id] || [];
    let atts = (s.attachments||[]).filter(Boolean);
    if(yr){
      invs = invs.filter(i=>String(i.date||'').slice(0,4)===yr);
      pays = pays.filter(p=>String(p.date||'').slice(0,4)===yr);
      atts = atts.filter(a=>String(a.addedAt||'').slice(0,4)===yr);
      if(!invs.length && !pays.length && !atts.length) return;
    }
    const c = {
      papers: atts.length,
      invoices: invs.length,
      payments: pays.length,
      notices: invs.filter(i=>!i.isReturn && Number(i.withheld)>0).length
    };
    c.total = c.papers + c.invoices + c.payments + c.notices;

    if(f.lcontent==='empty' && c.total>0) return;
    if(['papers','invoices','payments','notices'].indexOf(f.lcontent)>-1 && !c[f.lcontent]) return;
    if(f.ldoc && !atts.some(a=>archPaperLabel(a)===f.ldoc)) return;

    const hints = [];
    if(tokens.length){
      const base = searchNorm([s.name,s.taxId,s.commercialReg,s.phone,s.email,s.address,s.businessNature,s.bankAccount,s.iban,s.notes].join(' '));
      const parts = [];
      invs.forEach(i=>{
        parts.push({ lbl:'فاتورة '+(i.invoiceNo||''), t: searchNorm([i.invoiceNo,i.description,i.category,i.project,i.notes,i.internalCode,i.supplierItemCode,i.nature,i.totalInvoice,i.netInvoice,i.baseValue,searchDateText(i.date),searchAttNames(i.attachments)].join(' ')) });
      });
      pays.forEach(p=>{
        parts.push({ lbl:'دفعة #'+(p.paymentNo!=null?p.paymentNo:''), t: searchNorm(['دفعة',p.paymentNo,p.method,p.transferRef,p.notes,p.amount,searchDateText(p.date),invNoById[p.invoiceId],archExtra(p.extraFields),searchAttNames(p.attachments)].join(' ')) });
      });
      atts.forEach(a=>{
        parts.push({ lbl:'مستند: '+(a.name||archPaperLabel(a)), t: searchNorm(searchAttNames([a])+' '+archPaperLabel(a)) });
      });
      let ok = true;
      tokens.forEach(tok=>{
        if(base.indexOf(tok)>-1) return;
        const hit = parts.find(p=>p.t.indexOf(tok)>-1);
        if(!hit){ ok = false; return; }
        if(hints.indexOf(hit.lbl)<0) hints.push(hit.lbl);
      });
      if(!ok) return;
    }

    let last = '';
    invs.forEach(i=>{ const d = String(i.date||'').slice(0,10); if(d>last) last = d; });
    pays.forEach(p=>{ const d = String(p.date||'').slice(0,10); if(d>last) last = d; });
    atts.forEach(a=>{ const d = String(a.addedAt||'').slice(0,10); if(d>last) last = d; });
    out.push({ s, c, hints: hints.slice(0,3), last });
  });

  if(f.lsort==='files') out.sort((a,b)=>b.c.total-a.c.total || String(a.s.name||'').localeCompare(String(b.s.name||''),'ar'));
  else if(f.lsort==='recent') out.sort((a,b)=>String(b.last).localeCompare(String(a.last)) || String(a.s.name||'').localeCompare(String(b.s.name||''),'ar'));
  else out.sort((a,b)=>String(a.s.name||'').localeCompare(String(b.s.name||''),'ar'));
  return out;
}
/* ===================== Render ===================== */
function lgRenderArchivePage(){
  const lv = lgArchiveFilters.level || 'suppliers';
  if(lv==='trash') return lgRenderArchiveTrash();
  if(lv==='sub' && lgArchiveFilters.supplierId && lgArchiveFilters.sub){
    return renderArchiveSubfolder();
  }
  if(lv==='supplier' && lgArchiveFilters.supplierId){
    return renderArchiveSupplierHome();
  }
  return renderArchiveSuppliersList();
}

function lgEnsureArchiveTrash(){
  if(!Array.isArray(DATA.ledger.archiveTrash)) DATA.ledger.archiveTrash = [];
  return DATA.ledger.archiveTrash;
}

function lgRenderArchiveTrash(){
  const trash = lgEnsureArchiveTrash();
  const tokens = searchTokens(lgArchiveFilters.tq);
  const shown = [];
  trash.forEach((item, idx)=>{
    if(tokens.length){
      const sup = item.supplier || {};
      const blob = searchNorm([item.name, sup.name, sup.taxId, sup.commercialReg, sup.phone, (item.invoices||[]).map(i=>i.invoiceNo).join(' '), (sup.attachments||[]).map(a=>a&&a.name).join(' ')].join(' '));
      if(!searchHas(blob, tokens)) return;
    }
    shown.push({ item, idx });
  });
  const ro = typeof readOnlyMode!=='undefined' && readOnlyMode;
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <button type="button" class="btn btn-outline btn-sm" id="btnArchBackList">← كل الموردين</button>
          <h2 class="page-title" style="margin:10px 0 0;">🗑️ سلة المهملات</h2>
          <p class="page-sub" style="margin:4px 0 0;">موردون محذوفون — الاسترجاع يعيد المورد ومجلد أرشيفه (فواتير ودفعات ومستندات)</p>
        </div>
      </div>
      <div class="filters-row">
        ${archSearchField('tq','archTrashQ','اسم مورد، رقم ضريبي، رقم فاتورة، اسم ملف...', lgArchiveFilters.tq)}
      </div>
      ${archSummary(`${shown.length} من ${trash.length} مورد محذوف`)}
      <div class="table-wrap"><table>
        <thead><tr><th>المورد</th><th>فواتير</th><th>دفعات</th><th>مستندات</th><th>تاريخ الحذف</th><th></th></tr></thead>
        <tbody>
          ${shown.length? shown.map(({item, idx})=>{
            const papers = (item.supplier && item.supplier.attachments) ? item.supplier.attachments.length : 0;
            return `<tr>
              <td style="font-weight:800;">${lgEscapeHtml(item.name||(item.supplier&&item.supplier.name)||'—')}</td>
              <td>${(item.invoices||[]).length}</td>
              <td>${(item.payments||[]).length}</td>
              <td>${papers}</td>
              <td>${lgEscapeHtml(typeof lgFmtDate==='function'?lgFmtDate((item.deletedAt||'').slice(0,10)):(item.deletedAt||'').slice(0,10))}</td>
              <td style="white-space:nowrap;">
                <button class="btn btn-primary btn-sm btn-arch-restore" data-idx="${idx}">استرجاع</button>
                <button class="btn btn-outline btn-sm btn-arch-purge" style="color:#b91c1c;" data-idx="${idx}" ${ro?'disabled':''}>حذف نهائي</button>
              </td>
            </tr>`;
          }).join('') : `<tr><td colspan="6" class="table-empty">${trash.length?'لا نتائج مطابقة للبحث':'سلة المهملات فارغة'}</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
}

/** جمع ملفات مجلد مورد للتصدير إلى الجهاز */
function collectSupplierFolderExportItems(supplierId){
  const s = typeof supplierById==='function'?supplierById(supplierId):(DATA.ledger.suppliers||[]).find(x=>x.id===supplierId);
  if(!s) return [];
  const safe = String(s.name||'مورد').replace(/[<>:"/\\|?*]/g,'_').trim() || 'مورد';
  const items = [];
  (s.attachments||[]).forEach(a=>{
    if(a && a.path) items.push({ path:a.path, relative: safe+'/اوراق_المورد/'+(a.name||a.storedName||'ملف') });
  });
  (DATA.ledger.invoices||[]).filter(i=>i.supplierId===supplierId).forEach(inv=>{
    const folder = safe+'/فواتير/'+String(inv.invoiceNo||inv.id).replace(/[<>:"/\\|?*]/g,'_');
    (inv.attachments||[]).forEach(a=>{
      if(a && a.path) items.push({ path:a.path, relative: folder+'/'+(a.name||a.storedName||'ملف') });
    });
  });
  (DATA.ledger.payments||[]).filter(p=>p.supplierId===supplierId).forEach(pay=>{
    const folder = safe+'/دفعات/'+String(pay.paymentNo!=null?pay.paymentNo:pay.id).replace(/[<>:"/\\|?*]/g,'_');
    (pay.attachments||[]).forEach(a=>{
      if(a && a.path) items.push({ path:a.path, relative: folder+'/'+(a.name||a.storedName||'ملف') });
    });
  });
  return items;
}

function renderArchiveSuppliersList(){
  const f = lgArchiveFilters;
  const view = archiveSuppliersView();
  const all = DATA.ledger.suppliers || [];
  const ro = typeof readOnlyMode!=='undefined' && readOnlyMode;
  const n = archActiveCount(ARCH_LIST_KEYS);

  const dates = [];
  (DATA.ledger.invoices||[]).forEach(i=>dates.push(i.date));
  (DATA.ledger.payments||[]).forEach(p=>dates.push(p.date));
  all.forEach(s=>(s.attachments||[]).forEach(a=>{ if(a) dates.push(a.addedAt); }));
  const years = searchYears(dates);
  const docTypes = [...new Set(all.reduce((acc,s)=>acc.concat((s.attachments||[]).filter(Boolean).map(archPaperLabel)),[]))]
    .sort((a,b)=>String(a).localeCompare(String(b),'ar'));

  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
        <div>
          <h2 class="page-title" style="margin:0;">الأرشيف</h2>
          <p class="page-sub" style="margin:4px 0 0;">مجلد لكل مورد — داخله أوراق وفواتير ودفعات وإشعارات خصم</p>
        </div>
        <div class="btn-row">
          <button class="btn btn-outline" id="btnArchOpenTrash">🗑️ سلة المهملات (${(DATA.ledger.archiveTrash||[]).length})</button>
          <button class="btn btn-primary" id="btnArchAddDoc" ${ro?'disabled':''}>+ إرفاق مستند لمورد</button>
        </div>
      </div>

      <div class="filters-row">
        ${archSearchField('lq','archQ','اسم مورد، رقم ضريبي، سجل، هاتف، رقم فاتورة/دفعة، مبلغ، اسم ملف، نوع مستند... (أكثر من كلمة = كلها مطلوبة)', f.lq)}
        ${archSelect('lyear','السنة',[['','كل السنوات']].concat(years.map(y=>[y,y])), f.lyear)}
        ${archSelect('lcontent','المحتوى',[['','الكل'],['papers','فيها أوراق'],['invoices','فيها فواتير'],['payments','فيها دفعات'],['notices','فيها إشعارات خصم'],['empty','مجلدات فارغة']], f.lcontent)}
        ${archSelect('ldoc','نوع المستند',[['','كل الأنواع']].concat(docTypes.map(t=>[t,t])), f.ldoc)}
        ${archSelect('lsort','الترتيب',[['name','الاسم'],['files','الأكثر ملفات'],['recent','آخر نشاط']], f.lsort)}
        ${archResetBtn('list', n)}
      </div>

      ${archSummary(`${view.length} مجلد مورد${view.length!==all.length?(' من '+all.length):''}${f.lyear?(' — بيانات سنة '+lgEscapeHtml(f.lyear)):''}`)}

      ${view.length? `
      <div class="board-grid arch-folder-grid">
        ${view.map(e=>{
          const s = e.s, c = e.c;
          return `<button type="button" class="board-card arch-folder-card btn-arch-open-sup" data-sid="${lgEscapeHtml(s.id)}" title="${lgEscapeHtml(s.name||'')}">
            <div class="board-card-icon arch-folder-icon">🗂️</div>
            <div class="board-card-title">${lgEscapeHtml(s.name||'مورد')}</div>
            <div class="board-card-meta" style="flex-direction:column;align-items:flex-start;gap:4px;">
              ${s.taxId?`<span style="font-size:12px;color:var(--ink-soft);">ر.ض: ${lgEscapeHtml(s.taxId)}</span>`:''}
              <span style="font-size:12px;color:var(--ink-soft);">
                📋 ${c.papers} · 📄 ${c.invoices} · 💳 ${c.payments} · 🧾 ${c.notices}
              </span>
              ${e.hints.length?`<span style="font-size:11.5px;color:var(--gold);font-weight:700;">🔎 ${e.hints.map(lgEscapeHtml).join(' · ')}</span>`:''}
              ${f.lsort==='recent' && e.last?`<span style="font-size:11.5px;color:var(--ink-soft);">آخر نشاط: ${lgEscapeHtml(typeof lgFmtDate==='function'?lgFmtDate(e.last):e.last)}</span>`:''}
            </div>
          </button>`;
        }).join('')}
      </div>` : `<div class="table-empty" style="padding:40px;text-align:center;">${archEmptyMsg('لا موردين بعد', n>0)}</div>`}
    </div>`;
}

function renderArchiveSupplierHome(){
  const s = typeof supplierById==='function' ? supplierById(lgArchiveFilters.supplierId) : (DATA.ledger.suppliers||[]).find(x=>x.id===lgArchiveFilters.supplierId);
  if(!s){
    lgArchiveFilters.level = 'suppliers';
    lgArchiveFilters.supplierId = '';
    return renderArchiveSuppliersList();
  }
  const c = archiveSupplierCounts(s.id);
  const counts = { papers:c.papers, invoices:c.invoices, payments:c.payments, notices:c.notices };
  const ro = typeof readOnlyMode!=='undefined' && readOnlyMode;
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <button type="button" class="btn btn-outline btn-sm" id="btnArchBackList">← كل الموردين</button>
          <h2 class="page-title" style="margin:10px 0 0;">📁 ${lgEscapeHtml(s.name||'مورد')}</h2>
          <p class="page-sub" style="margin:4px 0 0;">الرقم الضريبي: ${lgEscapeHtml(s.taxId||'—')} · اختر مجلداً فرعياً</p>
        </div>
        <div class="btn-row">
          <button class="btn btn-outline" id="btnArchExportSup" data-sid="${lgEscapeHtml(s.id)}" data-name="${lgEscapeHtml(s.name||'')}">💾 حفظ المجلد على الجهاز</button>
          <button class="btn btn-primary" id="btnArchAddDoc" data-sid="${lgEscapeHtml(s.id)}" ${ro?'disabled':''}>+ إرفاق مستند</button>
        </div>
      </div>
      <div class="board-grid" style="grid-template-columns:repeat(4, minmax(0, 1fr)); gap:16px;">
        ${ARCHIVE_SUBFOLDERS.map(sf=>{
          const n = counts[sf.id]||0;
          return `<button type="button" class="board-card btn-arch-open-sub" data-sub="${sf.id}">
            <div class="board-card-icon">${sf.icon}</div>
            <div class="board-card-title">${lgEscapeHtml(sf.label)}</div>
            <div class="board-card-meta"><span class="board-card-amt">${n}</span></div>
          </button>`;
        }).join('')}
      </div>
    </div>`;
}

function renderArchiveSubfolder(){
  const sid = lgArchiveFilters.supplierId;
  const sub = lgArchiveFilters.sub;
  const s = typeof supplierById==='function' ? supplierById(sid) : (DATA.ledger.suppliers||[]).find(x=>x.id===sid);
  if(!s){
    lgArchiveFilters.level = 'suppliers';
    return renderArchiveSuppliersList();
  }
  const ro = typeof readOnlyMode!=='undefined' && readOnlyMode;
  const year = lgArchiveFilters.year || '';

  if(sub==='papers') return renderSubPapers(s, ro);
  if(sub==='invoices') return renderSubInvoices(s, year, ro);
  if(sub==='payments') return renderSubPayments(s, year, ro);
  if(sub==='notices') return renderSubNotices(s, year, ro);
  lgArchiveFilters.level = 'supplier';
  return renderArchiveSupplierHome();
}

function archiveSubHeader(s, sub){
  return `
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>
        <button type="button" class="btn btn-outline btn-sm" id="btnArchBackSup">← مجلد ${lgEscapeHtml(s.name||'')}</button>
        <h2 class="page-title" style="margin:10px 0 0;">${lgEscapeHtml(archiveSubLabel(sub))} — ${lgEscapeHtml(s.name||'')}</h2>
      </div>
      <div class="btn-row" id="archSubActions"></div>
    </div>`;
}

/* ---------- شريط أدوات المجلدات الفرعية (موحّد) ---------- */
function archSubToolbar(cfg){
  const f = lgArchiveFilters;
  const n = archActiveCount(ARCH_SUB_KEYS);
  return `
      <div class="filters-row">
        ${archSearchField('q','archSubQ',cfg.placeholder, f.q)}
        ${archSelect('year','السنة',[['','كل السنوات']].concat(cfg.years.map(y=>[y,y])), f.year)}
        ${archSelect('month','الشهر',[['','كل الشهور']].concat(ARCH_MONTHS.map((m,i)=>[String(i+1).padStart(2,'0'),m])), f.month)}
        ${archDateField('from', cfg.dateFromLabel||'من تاريخ', f.from)}
        ${archDateField('to', cfg.dateToLabel||'إلى تاريخ', f.to)}
        ${cfg.extra||''}
        ${archSelect('sort','الترتيب', cfg.sortOptions, f.sort)}
        ${archResetBtn('sub', n)}
        ${cfg.buttons||''}
      </div>
      ${archSummary(cfg.summary)}`;
}
const ARCH_SORT_AMOUNT = [['new','الأحدث أولاً'],['old','الأقدم أولاً'],['amount_desc','الأعلى قيمة'],['amount_asc','الأقل قيمة']];

/* ---------- الأوراق ---------- */
function archPapersFiltered(s){
  const f = lgArchiveFilters, tokens = searchTokens(f.q);
  let atts = (s.attachments||[]).filter(Boolean);
  atts = atts.filter(a=>searchDateOk(a.addedAt, f));
  if(f.docType) atts = atts.filter(a=>archPaperLabel(a)===f.docType);
  if(f.kind) atts = atts.filter(a=>archPaperKind(a)===f.kind);
  if(tokens.length) atts = atts.filter(a=>searchHas(searchNorm(searchAttNames([a])+' '+archPaperLabel(a)+' '+searchDateText(a.addedAt)), tokens));
  return archSortBy(atts, f.sort, a=>a.addedAt, ()=>0, a=>a.name);
}
function renderSubPapers(s, ro){
  const f = lgArchiveFilters;
  const allAtts = (s.attachments||[]).filter(Boolean);
  const atts = archPapersFiltered(s);
  const types = [...new Set(allAtts.map(archPaperLabel))].sort((a,b)=>String(a).localeCompare(String(b),'ar'));
  const n = archActiveCount(ARCH_SUB_KEYS);
  const toolbar = archSubToolbar({
    placeholder: 'اسم الملف، نوع المستند، الموضوع، التاريخ...',
    years: searchYears(allAtts.map(a=>a.addedAt)),
    dateFromLabel: 'أُضيف من', dateToLabel: 'أُضيف إلى',
    extra: archSelect('docType','نوع المستند',[['','كل الأنواع']].concat(types.map(t=>[t,t])), f.docType)
         + archSelect('kind','نوع الملف',[['','الكل'],['pdf','PDF'],['image','صور'],['excel','Excel / CSV'],['other','أخرى']], f.kind),
    sortOptions: [['new','الأحدث إضافةً'],['old','الأقدم إضافةً'],['name','الاسم']],
    buttons: `<button class="btn btn-primary btn-sm" id="btnArchAddDoc" data-sid="${lgEscapeHtml(s.id)}" ${ro?'disabled':''} style="align-self:flex-end;">+ إرفاق مستند</button>`,
    summary: `${atts.length} من ${allAtts.length} مستند`
  });
  return `
    <div class="page">
      ${archiveSubHeader(s, 'papers')}
      ${toolbar}
      <div class="table-wrap"><table>
        <thead><tr><th></th><th>الملف</th><th>نوع المستند</th><th>التاريخ</th><th></th></tr></thead>
        <tbody>
          ${atts.length? atts.map(a=>`
            <tr>
              <td style="font-size:18px;text-align:center;">${archiveExtIcon(a.name,a.mime||a.type)}</td>
              <td style="font-weight:700;">${lgEscapeHtml(a.name||'ملف')}</td>
              <td>${lgEscapeHtml(archPaperLabel(a))}</td>
              <td>${lgEscapeHtml(typeof lgFmtDate==='function'?lgFmtDate((a.addedAt||'').slice(0,10)):(a.addedAt||'').slice(0,10)||'-')}</td>
              <td style="white-space:nowrap;">
                <button class="btn btn-outline btn-sm" data-arch-pdf="${a.path?encodeURIComponent(a.path):''}" data-att-name="${lgEscapeHtml(a.name||'مرفق')}" ${a.path?'':'disabled'} title="عرض ثم حفظ">📄 PDF</button>
                <button class="btn btn-outline btn-sm" data-arch-rename="${lgEscapeHtml(s.id)}" data-att-id="${lgEscapeHtml(a.id||'')}" data-att-path="${a.path?encodeURIComponent(a.path):''}" ${ro?'disabled':''} title="تعديل الاسم">✎ تعديل</button>
                <button class="btn btn-outline btn-sm" data-arch-replace="${lgEscapeHtml(s.id)}" data-att-id="${lgEscapeHtml(a.id||'')}" data-att-path="${a.path?encodeURIComponent(a.path):''}" ${ro?'disabled':''}>استبدال</button>
                <button class="btn btn-outline btn-sm" style="color:#b91c1c;" data-arch-del-att="${lgEscapeHtml(s.id)}" data-att-id="${lgEscapeHtml(a.id||'')}" data-att-path="${a.path?encodeURIComponent(a.path):''}" ${ro?'disabled':''}>حذف</button>
              </td>
            </tr>`).join('') : `<tr><td colspan="5" class="table-empty">${archEmptyMsg('لا أوراق في هذا المجلد — أرفق مستنداً', n>0)}</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
}

/* ---------- الفواتير ---------- */
function archInvStatus(i){
  if(i.isReturn) return 'return';
  const rem = invoiceRemaining(i), net = Number(i.netInvoice||0);
  if(rem <= 0.005) return 'paid';
  if(Math.abs(rem - net) < 0.005) return 'unpaid';
  return 'partial';
}
function archInvText(i){
  return searchNorm([i.invoiceNo,i.description,i.category,i.project,i.notes,i.internalCode,i.supplierItemCode,i.nature,i.totalInvoice,i.netInvoice,i.baseValue,i.withheld,i.isReturn?'مرتجع':'',searchDateText(i.date),searchAttNames(i.attachments)].join(' '));
}
function archInvoicesFiltered(s){
  const f = lgArchiveFilters, tokens = searchTokens(f.q);
  let list = (DATA.ledger.invoices||[]).filter(i=>i.supplierId===s.id && !i.cancelled);
  list = list.filter(i=>searchDateOk(i.date, f));
  if(f.status==='overdue') list = list.filter(i=>typeof isInvoiceOverdue==='function' && isInvoiceOverdue(i));
  else if(f.status) list = list.filter(i=>archInvStatus(i)===f.status);
  if(tokens.length) list = list.filter(i=>searchHas(archInvText(i), tokens));
  return archSortBy(list, f.sort, i=>i.date, i=>i.netInvoice);
}
function renderSubInvoices(s, year, ro){
  const f = lgArchiveFilters;
  const base = (DATA.ledger.invoices||[]).filter(i=>i.supplierId===s.id && !i.cancelled);
  const invs = archInvoicesFiltered(s);
  const n = archActiveCount(ARCH_SUB_KEYS);
  const net = invs.reduce((a,i)=>a + (typeof invoiceSignedNet==='function' ? invoiceSignedNet(i) : (i.isReturn?-1:1)*Number(i.netInvoice||0)), 0);
  const thead = typeof invoiceTableTheadHtml==='function' ? invoiceTableTheadHtml() : '<tr><th>رقم الفاتورة</th><th>التاريخ</th><th></th></tr>';
  const colspan = typeof invoiceTableColspan==='function' ? invoiceTableColspan() : 17;
  const toolbar = archSubToolbar({
    placeholder: 'رقم فاتورة، بيان، تصنيف، مشروع، كود، مبلغ، ملاحظات...',
    years: searchYears(base.map(i=>i.date)),
    extra: archSelect('status','الحالة',[['','كل الحالات'],['paid','مسددة'],['partial','مسددة جزئياً'],['unpaid','غير مسددة'],['overdue','متأخرة'],['return','مرتجعات']], f.status),
    sortOptions: ARCH_SORT_AMOUNT,
    summary: `${invs.length} من ${base.length} فاتورة${invs.length?(' — صافي القيمة: <strong>'+archMoney(net)+'</strong>'):''}`
  });
  return `
    <div class="page">
      ${archiveSubHeader(s, 'invoices')}
      ${toolbar}
      <div class="table-wrap"><table>
        <thead>${thead}</thead>
        <tbody>
          ${invs.length? invs.map(inv=> typeof invoiceTableRowHtml==='function'
            ? invoiceTableRowHtml(inv, { archiveOnlyView:true })
            : '').join('') : `<tr><td colspan="${colspan}" class="table-empty">${archEmptyMsg('لا فواتير', n>0)}</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
}

/* ---------- الدفعات ---------- */
function archPayText(p){
  const inv = p.invoiceId ? (DATA.ledger.invoices||[]).find(i=>i.id===p.invoiceId) : null;
  return searchNorm(['دفعة',p.paymentNo,p.method,p.transferRef,p.notes,p.amount,searchDateText(p.date),inv?inv.invoiceNo:'',p.invoiceId?'':'عامة',p.direction==='collect'?'مدين تحصيل':'دائن سداد',archExtra(p.extraFields),searchAttNames(p.attachments)].join(' '));
}
function archPaymentsFiltered(s){
  const f = lgArchiveFilters, tokens = searchTokens(f.q);
  let list = (DATA.ledger.payments||[]).filter(p=>p.supplierId===s.id);
  list = list.filter(p=>searchDateOk(p.date, f));
  if(f.method) list = list.filter(p=>(p.method||'')===f.method);
  if(f.direction) list = list.filter(p=>(p.direction==='collect'?'collect':'pay')===f.direction);
  if(f.status==='general') list = list.filter(p=>!p.invoiceId);
  else if(f.status==='linked') list = list.filter(p=>!!p.invoiceId);
  if(tokens.length) list = list.filter(p=>searchHas(archPayText(p), tokens));
  return archSortBy(list, f.sort, p=>p.date, p=>p.amount);
}
function renderSubPayments(s, year, ro){
  const f = lgArchiveFilters;
  const base = (DATA.ledger.payments||[]).filter(p=>p.supplierId===s.id);
  const pays = archPaymentsFiltered(s);
  const n = archActiveCount(ARCH_SUB_KEYS);
  const methods = [...new Set(base.map(p=>p.method).filter(Boolean))];
  const total = pays.reduce((a,p)=>a+Number(p.amount||0),0);
  const toolbar = archSubToolbar({
    placeholder: 'رقم دفعة، طريقة، رقم تحويل، فاتورة مرتبطة، مبلغ، ملاحظات...',
    years: searchYears(base.map(p=>p.date)),
    extra: archSelect('method','طريقة الدفع',[['','كل الطرق']].concat(methods.map(m=>[m,m])), f.method)
         + archSelect('direction','نوع الحركة',[['','الكل'],['pay','دائن — علينا له'],['collect','مدين — عليه لنا']], f.direction)
         + archSelect('status','الربط',[['','الكل'],['linked','مرتبطة بفاتورة'],['general','دفعة عامة']], f.status),
    sortOptions: ARCH_SORT_AMOUNT,
    summary: `${pays.length} من ${base.length} دفعة${pays.length?(' — إجمالي المبالغ: <strong>'+archMoney(total)+'</strong>'):''}`
  });
  return `
    <div class="page">
      ${archiveSubHeader(s, 'payments')}
      ${toolbar}
      <div class="table-wrap"><table>
        <thead><tr>
          <th>رقم الدفعة</th><th>التاريخ</th><th>المورد</th><th>النوع</th><th>طريقة الدفع</th>
          <th>الفاتورة المرتبطة</th><th>رقم التحويل / تفاصيل</th><th>ملاحظات</th><th>المبلغ</th><th></th>
        </tr></thead>
        <tbody>
          ${pays.length? pays.map(p=>{
            const inv = p.invoiceId ? (DATA.ledger.invoices||[]).find(i=>i.id===p.invoiceId) : null;
            const refBits = [p.transferRef?('رقم التحويل: '+p.transferRef):'', (typeof lgExtraFieldsSummary==='function'?lgExtraFieldsSummary(p.extraFields):'')].filter(Boolean).join(' | ');
            const atts = p.attachments||[];
            return `<tr data-viewpay="${p.id}" style="cursor:pointer;" title="اضغط لعرض التفاصيل">
              <td style="font-weight:800;color:var(--ledger-green);">#${lgEscapeHtml(String(p.paymentNo!=null?p.paymentNo:'-'))}</td>
              <td>${lgEscapeHtml(typeof lgFmtDate==='function'?lgFmtDate(p.date):p.date||'-')}</td>
              <td>${lgEscapeHtml(s.name||'—')}</td>
              <td>${typeof paymentDirectionLabel==='function'?paymentDirectionLabel(p):'-'}</td>
              <td>${lgEscapeHtml(p.method||'-')}</td>
              <td>${inv?lgEscapeHtml(inv.invoiceNo):'دفعة عامة'}</td>
              <td>${lgEscapeHtml(refBits||'-')}</td>
              <td>${lgEscapeHtml(p.notes||'-')}</td>
              <td class="amount-cell payment">${typeof fmt==='function'?fmt(p.amount):p.amount}</td>
              <td><div class="row-actions">
                <button class="row-btn" data-viewpay-btn="${lgEscapeHtml(p.id)}" title="عرض">👁</button>
                ${atts.map(a=>`<button class="row-btn" data-arch-open="${a.path?encodeURIComponent(a.path):''}" ${a.path?'':'disabled'} title="${lgEscapeHtml(a.name||'مرفق')}">📎</button>`).join('')}
              </div></td>
            </tr>`;
          }).join('') : `<tr><td colspan="10" class="table-empty">${archEmptyMsg('لا دفعات', n>0)}</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
}

/* ---------- إشعارات الخصم ---------- */
function archNoticesFiltered(s){
  const f = lgArchiveFilters, tokens = searchTokens(f.q);
  let list = (DATA.ledger.invoices||[]).filter(i=>i.supplierId===s.id && !i.isReturn && !i.cancelled && Number(i.withheld)>0);
  list = list.filter(i=>searchDateOk(i.date, f));
  if(tokens.length) list = list.filter(i=>searchHas(archInvText(i), tokens));
  return archSortBy(list, f.sort, i=>i.date, i=>i.withheld);
}
function renderSubNotices(s, year, ro){
  const base = (DATA.ledger.invoices||[]).filter(i=>i.supplierId===s.id && !i.isReturn && !i.cancelled && Number(i.withheld)>0);
  const invs = archNoticesFiltered(s);
  const n = archActiveCount(ARCH_SUB_KEYS);
  const total = invs.reduce((a,i)=>a+Number(i.withheld||0),0);
  const thead = typeof invoiceTableTheadHtml==='function' ? invoiceTableTheadHtml() : '<tr><th>رقم الفاتورة</th><th></th></tr>';
  const colspan = typeof invoiceTableColspan==='function' ? invoiceTableColspan() : 17;
  const toolbar = archSubToolbar({
    placeholder: 'رقم فاتورة، بيان، تصنيف، مشروع، مبلغ...',
    years: searchYears(base.map(i=>i.date)),
    sortOptions: [['new','الأحدث أولاً'],['old','الأقدم أولاً'],['amount_desc','الأعلى خصماً'],['amount_asc','الأقل خصماً']],
    buttons: invs.length?`<button class="btn btn-gold btn-sm" id="btnArchPrintAllNotices" data-sid="${lgEscapeHtml(s.id)}" style="align-self:flex-end;">🖨 طباعة ${n>0?'الإشعارات الظاهرة':'كل الإشعارات'} (${invs.length})</button>`:'',
    summary: `${invs.length} من ${base.length} إشعار${invs.length?(' — إجمالي الخصم: <strong>'+archMoney(total)+'</strong>'):''}`
  });
  return `
    <div class="page">
      ${archiveSubHeader(s, 'notices')}
      ${toolbar}
      <div class="table-wrap"><table>
        <thead>${thead}</thead>
        <tbody>
          ${invs.length? invs.map(inv=> typeof invoiceTableRowHtml==='function'
            ? invoiceTableRowHtml(inv, { archiveOnlyNotice:true })
            : '').join('') : `<tr><td colspan="${colspan}" class="table-empty">${archEmptyMsg('لا إشعارات خصم لهذا المورد', n>0)}</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
}

/* ===================== أنواع المستندات + مودال الإرفاق ===================== */
function getDefaultSupplierDocTypeLabels(){
  return ['بطاقة ضريبية','سجل تجاري','بطاقة شخصية','تفويض','عقد','شهادة تسجيل','خطاب بنكي','صورة فاتورة','إثبات سداد','توكيل','جواز سفر','أخرى']
    .concat((SUPPLIER_DOC_TYPES||[]).map(t=>t.label));
}
function lgGetAllDocumentTypeLabels(){
  const labels = []; const seen = {};
  const hidden = new Set((DATA.ledger.documentTypeHidden||[]).map(x=>String(x).trim()));
  const add = (s)=>{ s=String(s||'').trim(); if(!s||seen[s]||hidden.has(s)) return; seen[s]=1; labels.push(s); };
  getDefaultSupplierDocTypeLabels().forEach(add);
  (DATA.ledger.documentTypes||[]).forEach(t=>add(t.name||t.label||t.code));
  (DATA.ledger.suppliers||[]).forEach(s=>(s.attachments||[]).forEach(a=>{
    if(a){ add(a.subject); add(a.docTypeLabel); if(a.docType&&!String(a.docType).includes('_')) add(a.docType); }
  }));
  return labels.sort((a,b)=>String(a).localeCompare(String(b),'ar'));
}
function lgEnsureDocumentTypeSaved(name){
  name = String(name||'').trim(); if(!name) return;
  DATA.ledger.documentTypes = DATA.ledger.documentTypes||[];
  if(!DATA.ledger.documentTypes.some(t=>String(t.name||t.label||'').trim()===name))
    DATA.ledger.documentTypes.push({ id: typeof lgUid==='function'?lgUid('dt'):('dt_'+Date.now()), name });
  if(DATA.ledger.documentTypeHidden) DATA.ledger.documentTypeHidden = DATA.ledger.documentTypeHidden.filter(x=>x!==name);
}
function lgDocTypeComboHtml(fieldId, selected){
  const val = selected || '';
  return `<div class="entity-combo-wrap" data-combo-wrap="${lgEscapeHtml(fieldId)}" style="position:relative;width:100%;">
    <input type="hidden" id="${lgEscapeHtml(fieldId)}" value="${lgEscapeHtml(val)}">
    <input type="text" class="search-box doc-type-combo-text" id="${lgEscapeHtml(fieldId)}_text" value="${lgEscapeHtml(val)}"
      placeholder="اكتب نوع المستند أو اختر..." autocomplete="off" data-doctype-id="${lgEscapeHtml(fieldId)}" style="width:100%;">
  </div>`;
}
function lgBindDocTypeCombos(scope){
  const root = scope || document;
  root.querySelectorAll('.doc-type-combo-text').forEach(inp=>{
    if(inp.dataset.boundDocType) return;
    inp.dataset.boundDocType = '1';
    const fid = inp.getAttribute('data-doctype-id');
    const hidden = document.getElementById(fid);
    let wrap = inp.closest('.entity-combo-wrap') || inp.parentElement;
    if(wrap){ wrap.style.position='relative'; wrap.style.width='100%'; }
    let drop = null;
    const ensureDrop = ()=>{
      if(drop && wrap && wrap.contains(drop)) return drop;
      if(drop && drop.parentNode) drop.parentNode.removeChild(drop);
      drop = document.createElement('div'); drop.className='entity-combo-drop'; drop.setAttribute('dir','rtl');
      (wrap||document.body).appendChild(drop); return drop;
    };
    const hideDrop = ()=>{ if(drop){ drop.hidden=true; drop.innerHTML=''; drop.style.display='none'; } };
    const positionDrop = ()=>{
      const d=ensureDrop();
      d.style.cssText='position:absolute;top:calc(100% + 2px);left:0;right:0;width:100%;max-height:220px;overflow-y:auto;z-index:5000;display:block;box-sizing:border-box;background:var(--card,#fff);border:1px solid var(--line,#ddd);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);';
      d.hidden=false;
    };
    const renderDrop = (q)=>{
      const labels = lgGetAllDocumentTypeLabels();
      const qq=String(q||'').trim().toLowerCase();
      let matches = qq?labels.filter(l=>l.toLowerCase().includes(qq)):labels;
      matches=matches.slice(0,14);
      const d=ensureDrop();
      if(!matches.length){
        d.innerHTML=`<div style="padding:10px 12px;color:var(--ink-soft);font-size:13px;">Enter لحفظ «${lgEscapeHtml(q||'')}» كنوع جديد</div>`;
        positionDrop(); return;
      }
      d.innerHTML=matches.map(l=>`<button type="button" class="entity-combo-item" data-label="${lgEscapeHtml(l)}" style="display:block;width:100%;text-align:right;padding:9px 12px;border:0;border-bottom:1px solid var(--line);background:transparent;cursor:pointer;font:inherit;color:inherit;"><span>${lgEscapeHtml(l)}</span></button>`).join('');
      positionDrop();
      d.querySelectorAll('.entity-combo-item').forEach(btn=>{
        btn.addEventListener('mousedown',(ev)=>{
          ev.preventDefault();
          const lab=btn.getAttribute('data-label')||'';
          inp.value=lab; if(hidden) hidden.value=lab; hideDrop();
        });
      });
    };
    inp.addEventListener('focus',()=>renderDrop(inp.value));
    inp.addEventListener('input',()=>{ if(hidden) hidden.value=inp.value; renderDrop(inp.value); });
    inp.addEventListener('blur',()=>setTimeout(hideDrop,180));
    inp.addEventListener('keydown',(e)=>{
      if(e.key==='Escape') hideDrop();
      if(e.key==='Enter'){ e.preventDefault(); const v=(inp.value||'').trim(); if(hidden) hidden.value=v; if(v) lgEnsureDocumentTypeSaved(v); hideDrop(); }
    });
  });
}
function lgOpenManageDocTypesModal(){
  const labels = lgGetAllDocumentTypeLabels();
  const rows = labels.map(l=>`<div style="display:flex;gap:8px;align-items:center;padding:6px 4px;border-bottom:1px solid var(--line);">
    <span style="flex:1;">${lgEscapeHtml(l)}</span>
    <button type="button" class="btn btn-outline btn-sm btn-del-dtype" data-name="${lgEscapeHtml(l)}">حذف</button>
  </div>`).join('');
  const overlay = lgEl(`<div class="modal-overlay"><div class="modal">
    <h3>إدارة أنواع المستندات</h3>
    <label style="display:block;margin-bottom:10px;">إضافة نوع جديد
      <div style="display:flex;gap:8px;margin-top:4px;">
        <input class="search-box" id="newDocTypeName" placeholder="اسم النوع..." style="flex:1;">
        <button type="button" class="btn btn-primary btn-sm" id="btnAddDocType">إضافة</button>
      </div>
    </label>
    <div style="max-height:320px;overflow:auto;">${rows||'<p style="color:var(--ink-soft)">لا أنواع</p>'}</div>
    <div class="modal-actions"><button class="btn btn-outline" id="btnCloseManageDocTypes">إغلاق</button></div>
  </div></div>`);
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.addEventListener('click',e=>{ if(e.target===overlay) close(); });
  document.getElementById('btnCloseManageDocTypes').onclick=close;
  document.getElementById('btnAddDocType').onclick=()=>{
    const v=(document.getElementById('newDocTypeName')?.value||'').trim(); if(!v) return;
    if(DATA.ledger.documentTypeHidden) DATA.ledger.documentTypeHidden=DATA.ledger.documentTypeHidden.filter(x=>x!==v);
    lgEnsureDocumentTypeSaved(v); saveData(); lgShowToast('تمت الإضافة'); close(); lgOpenManageDocTypesModal();
  };
  overlay.querySelectorAll('.btn-del-dtype').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const name=btn.getAttribute('data-name')||'';
      DATA.ledger.documentTypes=(DATA.ledger.documentTypes||[]).filter(t=>String(t.name||t.label||'').trim()!==name);
      if(!Array.isArray(DATA.ledger.documentTypeHidden)) DATA.ledger.documentTypeHidden=[];
      if(name && !DATA.ledger.documentTypeHidden.includes(name)) DATA.ledger.documentTypeHidden.push(name);
      saveData(); lgShowToast('تم الحذف'); close(); lgOpenManageDocTypesModal();
    });
  });
}

function openAddSupplierDocumentModal(prefillSupplierId){
  if(typeof guardReadOnly==='function' && guardReadOnly('إضافة مستند')) return;
  if(!(DATA.ledger.suppliers||[]).length){ lgShowToast('أضِف مورداً أولاً'); return; }
  const tempId = typeof lgUid==='function'?lgUid('doc'):('doc_'+Date.now());
  if(!window.__docDrafts) window.__docDrafts={};
  window.__docDrafts[tempId]={ id:tempId, attachments:[] };
  const suppliers = DATA.ledger.suppliers.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ar'));
  const preSup = prefillSupplierId ? suppliers.find(s=>s.id===prefillSupplierId) : null;

  const overlay = lgEl(`
    <div class="modal-overlay" id="addDocOverlay">
      <div class="modal wide">
        <h3>إرفاق مستند لمورد</h3>
        <div class="info-grid" style="margin-top:8px;">
          <div class="info-field" style="grid-column:1/-1;">
            <label>المورد *</label>
            <div class="entity-combo-wrap" id="docSupComboWrap" style="position:relative;width:100%;">
              <input type="hidden" id="docSupplier" value="${preSup?lgEscapeHtml(preSup.id):''}">
              <input type="text" class="search-box" id="docSupText" autocomplete="off" placeholder="اكتب اسم المورد أو الرقم الضريبي..."
                value="${preSup?lgEscapeHtml(preSup.name||''):''}" style="width:100%;">
            </div>
          </div>
          <div class="info-field"><label>تاريخ الانتهاء (اختياري)</label><input type="date" id="docExp"></div>
          <div class="info-field" style="grid-column:1/-1;">
            <label>نوع المستند *</label>
            <div id="docTypeComboBox"></div>
            <div style="margin-top:6px;"><button type="button" class="btn btn-outline btn-sm" id="btnManageDocTypes">إدارة الاقتراحات</button></div>
          </div>
          <div class="info-field" style="grid-column:1/-1;"><label>ملاحظات</label><input id="docNotes" class="search-box" placeholder="اختياري"></div>
          <div class="info-field" style="grid-column:1/-1;">
            <div class="section-title" style="margin:4px 0 8px;">المرفقات</div>
            <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 8px;">يُحفظ فقط ما ترفعه هنا في مجلد «أوراق المورد».</p>
            <div id="docAttList" style="min-height:40px;margin-bottom:8px;font-size:13px;color:var(--ink-soft);">لا مرفقات بعد</div>
            <div class="btn-row" style="flex-wrap:wrap;gap:8px;">
              <button type="button" class="btn btn-primary btn-sm" id="btnDocPickFile">📁 رفع ملف من الجهاز</button>
              <button type="button" class="btn btn-outline btn-sm" id="btnDocScan">📷 مسح / كاميرا</button>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" id="docCancel">إلغاء</button>
          <button class="btn btn-primary" id="btnSaveDoc">حفظ في أوراق المورد</button>
        </div>
      </div>
    </div>`);
  document.body.appendChild(overlay);

  const typeBox=document.getElementById('docTypeComboBox');
  if(typeBox){ typeBox.innerHTML=lgDocTypeComboHtml('docType',''); lgBindDocTypeCombos(overlay); }

  // كومبو المورد
  (function(){
    const wrap=document.getElementById('docSupComboWrap');
    const hidden=document.getElementById('docSupplier');
    const inp=document.getElementById('docSupText');
    if(!wrap||!inp||!hidden) return;
    let drop=null;
    const ensureDrop=()=>{
      if(drop&&wrap.contains(drop)) return drop;
      if(drop&&drop.parentNode) drop.parentNode.removeChild(drop);
      drop=document.createElement('div'); drop.className='entity-combo-drop'; drop.setAttribute('dir','rtl'); wrap.appendChild(drop); return drop;
    };
    const hideDrop=()=>{ if(drop){ drop.hidden=true; drop.innerHTML=''; drop.style.display='none'; } };
    const positionDrop=()=>{
      const d=ensureDrop();
      d.style.cssText='position:absolute;top:calc(100% + 2px);left:0;right:0;width:100%;max-height:240px;overflow-y:auto;z-index:5000;display:block;box-sizing:border-box;background:var(--card,#fff);border:1px solid var(--line,#ddd);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);';
      d.hidden=false;
    };
    const renderDrop=(q)=>{
      const qq=String(q||'').trim().toLowerCase();
      let list=suppliers;
      if(qq) list=suppliers.filter(s=>(s.name||'').toLowerCase().includes(qq)||(s.taxId||'').toLowerCase().includes(qq));
      list=list.slice(0,12);
      const d=ensureDrop();
      if(!list.length){ d.innerHTML='<div style="padding:10px 12px;color:var(--ink-soft);font-size:13px;">لا نتائج</div>'; positionDrop(); return; }
      d.innerHTML=list.map(s=>`<button type="button" class="entity-combo-item" data-id="${lgEscapeHtml(s.id)}" data-name="${lgEscapeHtml(s.name||'')}" style="display:block;width:100%;text-align:right;padding:10px 12px;border:0;border-bottom:1px solid var(--line);background:transparent;cursor:pointer;font:inherit;color:inherit;">
        <div style="font-weight:700;">${lgEscapeHtml(s.name||'')}</div>
        ${s.taxId?`<div style="font-size:12px;color:var(--ink-soft);">ر.ض: ${lgEscapeHtml(s.taxId)}</div>`:''}
      </button>`).join('');
      positionDrop();
      d.querySelectorAll('.entity-combo-item').forEach(btn=>{
        btn.addEventListener('mousedown',ev=>{
          ev.preventDefault();
          hidden.value=btn.getAttribute('data-id')||'';
          inp.value=btn.getAttribute('data-name')||'';
          hideDrop();
        });
      });
    };
    inp.addEventListener('focus',()=>renderDrop(inp.value));
    inp.addEventListener('input',()=>{
      const match=suppliers.find(s=>s.name===inp.value);
      hidden.value=match?match.id:'';
      renderDrop(inp.value);
    });
    inp.addEventListener('blur',()=>setTimeout(hideDrop,180));
  })();

  function renderDraftAttList(){
    const draft=window.__docDrafts[tempId];
    const listEl=document.getElementById('docAttList');
    if(!listEl) return;
    const atts=(draft&&draft.attachments)||[];
    if(!atts.length){ listEl.innerHTML='<span style="color:var(--ink-soft);">لا مرفقات بعد</span>'; return; }
    listEl.innerHTML=atts.map((a,i)=>`
      <div style="display:flex;align-items:center;gap:6px;padding:8px 0;border-bottom:1px solid var(--line);flex-wrap:wrap;">
        <span style="flex:1;min-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;">📎 ${lgEscapeHtml(a.name||'ملف')}</span>
        <button type="button" class="btn btn-outline btn-sm btn-doc-draft-open" data-idx="${i}">🖨 PDF</button>
        <button type="button" class="btn btn-outline btn-sm btn-doc-draft-replace" data-idx="${i}">استبدال</button>
        <button type="button" class="btn btn-outline btn-sm btn-doc-draft-del" data-idx="${i}" style="color:#b91c1c;">حذف</button>
      </div>`).join('');
    listEl.querySelectorAll('.btn-doc-draft-del').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        const i=Number(btn.getAttribute('data-idx')); const att=draft.attachments[i];
        if(att&&att.path&&window.desktopApi&&window.desktopApi.deleteAttachment){ try{ await window.desktopApi.deleteAttachment(att.path);}catch(e){} }
        draft.attachments.splice(i,1); renderDraftAttList();
      });
    });
    listEl.querySelectorAll('.btn-doc-draft-open').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        const att=draft.attachments[Number(btn.getAttribute('data-idx'))];
        if(!att||!att.path){ lgShowToast('لا مسار'); return; }
        try{ await window.desktopApi.openAttachment(att.path); }catch(e){ lgShowToast('تعذر الفتح'); }
      });
    });
    listEl.querySelectorAll('.btn-doc-draft-replace').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        const i=Number(btn.getAttribute('data-idx')); const old=draft.attachments[i];
        if(!window.desktopApi||!window.desktopApi.pickAttachments) return;
        const title=(document.getElementById('docType')?.value||'').trim()||(document.getElementById('docType_text')?.value||'').trim()||(old&&old.name)||'مرفق';
        const supplierId=document.getElementById('docSupplier')?.value||tempId;
        try{
          const res=await window.desktopApi.pickAttachments(supplierId,title);
          if(!res||res.canceled) return;
          const files=res.files||[]; if(!files.length) return;
          const f=files[0];
          if(old&&old.path&&window.desktopApi.deleteAttachment){ try{ await window.desktopApi.deleteAttachment(old.path);}catch(e){} }
          draft.attachments[i]={ id:old&&old.id?old.id:(typeof lgUid==='function'?lgUid('att'):('att_'+Date.now())), name:title||f.name||'ملف', path:f.path||'', storedName:f.storedName||f.name||'', mime:f.mime||f.type||'', docType:title, subject:title, addedAt:new Date().toISOString() };
          renderDraftAttList(); lgShowToast('تم الاستبدال');
        }catch(e){ lgShowToast('فشل الاستبدال'); }
      });
    });
  }

  async function attachFilesToDocDraft(scan){
    const draft=window.__docDrafts[tempId]; if(!draft) return;
    let title=(document.getElementById('docType')?.value||'').trim()||(document.getElementById('docType_text')?.value||'').trim()||'مرفق';
    const supplierId=document.getElementById('docSupplier')?.value||tempId;
    if(scan && typeof lgOpenScanAttachModal==='function'){
      lgOpenScanAttachModal(supplierId||tempId,(file)=>{
        if(!file) return;
        draft.attachments.push({ id:file.id||(typeof lgUid==='function'?lgUid('att'):('att_'+Date.now())), name:title||file.name||'ملف', path:file.path||'', storedName:file.storedName||file.name||'', mime:file.mime||file.type||'', docType:title, subject:title, addedAt:file.addedAt||new Date().toISOString() });
        renderDraftAttList(); lgShowToast('تم الإضافة — احفظ في الأرشيف');
      }, title);
      return;
    }
    if(!window.desktopApi||!window.desktopApi.pickAttachments){ lgShowToast('متاح في سطح المكتب فقط'); return; }
    try{
      const res=await window.desktopApi.pickAttachments(supplierId||('document_'+tempId), title);
      if(!res||res.canceled) return;
      const files=Array.isArray(res.files)?res.files:[];
      if(!files.length){ lgShowToast('لم يتم اختيار ملفات'); return; }
      let added=0;
      files.forEach(f=>{
        if(!f||!f.path) return;
        draft.attachments.push({ id:f.id||(typeof lgUid==='function'?lgUid('att'):('att_'+Date.now()+Math.random().toString(36).slice(2,5))), name:(title&&title!=='مرفق'?title:(f.name||'ملف')), path:f.path||'', storedName:f.storedName||f.name||'', mime:f.mime||f.type||'', docType:title, subject:title, addedAt:f.addedAt||new Date().toISOString() });
        added++;
      });
      renderDraftAttList();
      lgShowToast(added?('تم إضافة '+added+' ملف'):'لم يُضف أي ملف');
    }catch(e){ lgShowToast('فشل الرفع'); }
  }

  document.getElementById('btnDocPickFile').addEventListener('click',e=>{ e.preventDefault(); attachFilesToDocDraft(false); });
  document.getElementById('btnDocScan').addEventListener('click',e=>{ e.preventDefault(); attachFilesToDocDraft(true); });
  document.getElementById('btnManageDocTypes').addEventListener('click',()=>lgOpenManageDocTypesModal());
  const close=()=>{ if(window.__docDrafts) delete window.__docDrafts[tempId]; overlay.remove(); };
  document.getElementById('docCancel').addEventListener('click', close);
  overlay.addEventListener('click',e=>{ if(e.target===overlay) close(); });

  document.getElementById('btnSaveDoc').addEventListener('click',()=>{
    const supplierId=document.getElementById('docSupplier')?.value;
    let title=(document.getElementById('docType')?.value||'').trim()||(document.getElementById('docType_text')?.value||'').trim();
    if(!supplierId){ lgShowToast('اختر المورد من الاقتراحات'); return; }
    if(!title){ lgShowToast('اكتب نوع المستند'); return; }
    lgEnsureDocumentTypeSaved(title);
    const draftAtt=(window.__docDrafts&&window.__docDrafts[tempId]&&window.__docDrafts[tempId].attachments)||[];
    const seen=new Set(); const clean=[];
    draftAtt.forEach(a=>{ if(!a||!a.path||seen.has(a.path)) return; seen.add(a.path); clean.push(a); });
    if(!clean.length){ lgShowToast('أرفق ملفاً أولاً'); return; }
    const s=typeof supplierById==='function'?supplierById(supplierId):(DATA.ledger.suppliers||[]).find(x=>x.id===supplierId);
    if(!s){ lgShowToast('مورد غير موجود'); return; }
    if(!Array.isArray(s.attachments)) s.attachments=[];
    const exp=document.getElementById('docExp')?.value||'';
    const notes=(document.getElementById('docNotes')?.value||'').trim();
    const existing=new Set(s.attachments.map(x=>x&&x.path).filter(Boolean));
    let added=0;
    clean.forEach(a=>{
      if(existing.has(a.path)) return;
      existing.add(a.path);
      s.attachments.push({ id:a.id||(typeof lgUid==='function'?lgUid('att'):('att_'+Date.now())), name:a.name||title, path:a.path, storedName:a.storedName||'', type:a.mime||a.type||'', mime:a.mime||a.type||'', docType:title, subject:title, docTypeLabel:title, expiryDate:exp, notes, addedAt:a.addedAt||new Date().toISOString() });
      added++;
    });
    if(window.__docDrafts) delete window.__docDrafts[tempId];
    if(typeof logAction==='function') logAction('إرفاق مستند', title+' — '+(s.name||'')+' — '+added);
    saveData(); close();
    lgShowToast(added?('تم حفظ '+added+' مرفق في أوراق '+(s.name||'')):'الملفات كانت موجودة');
    lgArchiveFilters.supplierId=supplierId; lgArchiveFilters.level='sub'; lgArchiveFilters.sub='papers';
    archiveResetSubFilters();
    if(typeof lgRerenderCurrentPage==='function') lgRerenderCurrentPage();
  });
}

/* ===================== Handlers ===================== */
/** إعادة رسم الصفحة مع إرجاع التركيز ومكان المؤشر لخانة البحث (عشان الكتابة ما تتقطعش) */
function archGoKeepFocus(go, lgEl){
  const id = lgEl && lgEl.id;
  const pos = lgEl && typeof lgEl.selectionStart==='number' ? lgEl.selectionStart : null;
  go();
  if(!id) return;
  const n = document.getElementById(id);
  if(!n) return;
  n.focus();
  try{ const p = pos==null ? n.value.length : pos; n.setSelectionRange(p, p); }catch(_e){}
}

function attachArchiveHandlers(){
  const root = document.getElementById('pageContent') || document;
  const go = ()=>{
    try{
      if(typeof lgRerenderCurrentPage==='function') lgRerenderCurrentPage();
      else if(typeof lgRender==='function') lgRender();
    }catch(err){ console.error('archive go()', err); }
  };

  // منع الربط المزدوج: نستخدم delegation بمؤشر واحد
  if(root.__archBound){
    root.removeEventListener('click', root.__archBound, true);
    root.removeEventListener('input', root.__archInputBound, true);
    root.removeEventListener('change', root.__archChangeBound, true);
  }

  root.__archBound = async function archClick(e){
    const t = e.target;
    if(!t || !t.closest) return;
    const lgEl = t.closest('[data-sid], [data-sub], [data-arch-open], [data-arch-pdf], [data-arch-rename], [data-arch-replace], [data-arch-del-att], [data-viewpay-btn], [data-viewpay], [data-arch-view-inv], [data-arch-view-pay], [data-arch-print-notice], .btn-arch-open-sup, .btn-arch-open-sub, .btn-arch-restore, .btn-arch-purge, #btnArchBackList, #btnArchBackSup, #btnArchAddDoc, #btnArchOpenTrash, #btnArchExportSup, #btnArchPrintAllNotices, #btnArchResetFilters, [data-viewinv-btn], [data-notice]');
    if(!lgEl) return;

    // —— تنقّل المجلدات ——
    if(lgEl.classList.contains('btn-arch-open-sup') || (lgEl.hasAttribute('data-sid') && lgEl.classList.contains('arch-folder-card'))){
      e.preventDefault(); e.stopPropagation();
      lgArchiveFilters.supplierId = lgEl.getAttribute('data-sid') || '';
      lgArchiveFilters.level = 'supplier';
      lgArchiveFilters.sub = '';
      archiveResetSubFilters();
      go(); return;
    }
    if(lgEl.classList.contains('btn-arch-open-sub')){
      e.preventDefault(); e.stopPropagation();
      lgArchiveFilters.sub = lgEl.getAttribute('data-sub') || '';
      lgArchiveFilters.level = 'sub';
      archiveResetSubFilters();
      go(); return;
    }
    if(lgEl.id==='btnArchBackList'){
      e.preventDefault();
      lgArchiveFilters.level='suppliers'; lgArchiveFilters.supplierId=''; lgArchiveFilters.sub='';
      archiveResetSubFilters();
      go(); return;
    }
    if(lgEl.id==='btnArchBackSup'){
      e.preventDefault();
      lgArchiveFilters.level='supplier'; lgArchiveFilters.sub='';
      archiveResetSubFilters();
      go(); return;
    }
    if(lgEl.id==='btnArchOpenTrash'){
      e.preventDefault();
      lgArchiveFilters.level='trash';
      lgArchiveFilters.tq='';
      go(); return;
    }
    if(lgEl.id==='btnArchResetFilters'){
      e.preventDefault(); e.stopPropagation();
      if(lgEl.getAttribute('data-scope')==='list') archiveResetListFilters(); else archiveResetSubFilters();
      go(); return;
    }

    // —— إضافة مستند ——
    if(lgEl.id==='btnArchAddDoc'){
      e.preventDefault(); e.stopPropagation();
      const sid = lgEl.getAttribute('data-sid') || lgArchiveFilters.supplierId || null;
      if(typeof openAddSupplierDocumentModal==='function') openAddSupplierDocumentModal(sid);
      else lgShowToast('مودال الإرفاق غير متاح');
      return;
    }

    // —— تصدير مجلد ——
    if(lgEl.id==='btnArchExportSup'){
      e.preventDefault(); e.stopPropagation();
      const sid = lgEl.getAttribute('data-sid') || lgArchiveFilters.supplierId;
      const items = typeof collectSupplierFolderExportItems==='function' ? collectSupplierFolderExportItems(sid) : [];
      if(!items.length){ lgShowToast('لا مرفقات في هذا المجلد للتصدير'); return; }
      if(!window.desktopApi || !window.desktopApi.exportArchive){ lgShowToast('التصدير متاح في نسخة سطح المكتب'); return; }
      try{
        lgShowToast('جاري التصدير...');
        const res = await window.desktopApi.exportArchive(items);
        if(res && res.ok) lgShowToast('تم حفظ '+(res.copied||0)+' ملف'+(res.skipped?(' (تخطى '+res.skipped+')'):''));
        else if(res && !res.canceled) lgShowToast(res.error||'تعذر التصدير');
      }catch(err){ console.error(err); lgShowToast('تعذر التصدير'); }
      return;
    }

    // —— فتح مرفق ——
    if(lgEl.hasAttribute('data-arch-open')){
      e.preventDefault(); e.stopPropagation();
      const pth = lgEl.getAttribute('data-arch-open');
      if(!pth){ lgShowToast('مسار غير متوفر'); return; }
      try{
        if(!window.desktopApi || !window.desktopApi.openAttachment){ lgShowToast('فتح الملفات متاح في سطح المكتب'); return; }
        const res = await window.desktopApi.openAttachment(decodeURIComponent(pth));
        if(res && !res.ok) lgShowToast(res.error||'تعذر الفتح');
      }catch(err){ lgShowToast('تعذر الفتح'); }
      return;
    }

    // —— PDF: عرض ثم حفظ ——
    if(lgEl.hasAttribute('data-arch-pdf')){
      e.preventDefault(); e.stopPropagation();
      const pth = lgEl.getAttribute('data-arch-pdf');
      const name = lgEl.getAttribute('data-att-name') || 'مرفق';
      if(!pth){ lgShowToast('مسار غير متوفر'); return; }
      const pathDecoded = decodeURIComponent(pth);
      try{
        if(window.desktopApi && window.desktopApi.openAttachment)
          await window.desktopApi.openAttachment(pathDecoded);
      }catch(err){ lgShowToast('تعذر فتح الملف'); return; }
      let wantSave = false;
      try{
        wantSave = await showAppConfirm('تم فتح المرفق. هل تريد حفظ نسخة على جهازك؟', { title:'حفظ المرفق', okText:'حفظ على الجهاز', cancelText:'لا' });
      }catch(_e){ wantSave = false; }
      if(!wantSave) return;
      if(!window.desktopApi || !window.desktopApi.exportArchive){ lgShowToast('الحفظ متاح في سطح المكتب'); return; }
      try{
        const res = await window.desktopApi.exportArchive([{ path: pathDecoded, relative: name }]);
        if(res && res.ok) lgShowToast('تم الحفظ');
        else if(res && !res.canceled) lgShowToast(res.error||'تعذر الحفظ');
      }catch(err){ lgShowToast('تعذر الحفظ'); }
      return;
    }

    // —— تعديل اسم ——
    if(lgEl.hasAttribute('data-arch-rename')){
      e.preventDefault(); e.stopPropagation();
      if(typeof guardReadOnly==='function' && guardReadOnly('تعديل اسم مرفق')) return;
      const sid = lgEl.getAttribute('data-arch-rename');
      const attId = lgEl.getAttribute('data-att-id');
      const attPath = lgEl.getAttribute('data-att-path');
      const s = typeof supplierById==='function'?supplierById(sid):null;
      if(!s || !Array.isArray(s.attachments)){ lgShowToast('المورد غير موجود'); return; }
      const pathDecoded = attPath ? decodeURIComponent(attPath) : '';
      const att = s.attachments.find(a=>(attId && a.id===attId) || (pathDecoded && a.path===pathDecoded));
      if(!att){ lgShowToast('المرفق غير موجود'); return; }
      const next = await showAppPrompt('اسم المرفق الجديد:', att.name || att.storedName || '', { title:'تعديل اسم المرفق' });
      if(next==null) return;
      const name = String(next).trim();
      if(!name){ lgShowToast('الاسم فارغ'); return; }
      att.name = name;
      saveData();
      lgShowToast('تم تعديل الاسم');
      go(); return;
    }

    // —— استبدال ——
    if(lgEl.hasAttribute('data-arch-replace')){
      e.preventDefault(); e.stopPropagation();
      if(typeof guardReadOnly==='function' && guardReadOnly('استبدال')) return;
      const sid = lgEl.getAttribute('data-arch-replace');
      const attId = lgEl.getAttribute('data-att-id');
      const attPath = lgEl.getAttribute('data-att-path');
      const s = typeof supplierById==='function'?supplierById(sid):null;
      if(!s||!window.desktopApi||!window.desktopApi.pickAttachments){ lgShowToast('غير متاح'); return; }
      try{
        const res = await window.desktopApi.pickAttachments(sid, 'استبدال');
        if(!res||res.canceled) return;
        const files = res.files||[]; if(!files.length) return;
        const f = files[0];
        if(!Array.isArray(s.attachments)) s.attachments=[];
        const pathDecoded = attPath?decodeURIComponent(attPath):'';
        const idx = s.attachments.findIndex(a=>(attId&&a.id===attId)||(pathDecoded&&a.path===pathDecoded));
        if(idx<0){ lgShowToast('المرفق غير موجود'); return; }
        const old = s.attachments[idx];
        if(old.path&&window.desktopApi.deleteAttachment){ try{ await window.desktopApi.deleteAttachment(old.path);}catch(_e){} }
        s.attachments[idx]=Object.assign({},old,{ name:f.name||old.name||'ملف', path:f.path||'', storedName:f.storedName||f.name||'', type:f.mime||f.type||old.type||'', mime:f.mime||f.type||'', addedAt:new Date().toISOString() });
        saveData(); lgShowToast('تم الاستبدال'); go();
      }catch(err){ console.error(err); lgShowToast('فشل الاستبدال'); }
      return;
    }

    // —— حذف مرفق ——
    if(lgEl.hasAttribute('data-arch-del-att')){
      e.preventDefault(); e.stopPropagation();
      if(typeof guardReadOnly==='function' && guardReadOnly('حذف مرفق')) return;
      const sid = lgEl.getAttribute('data-arch-del-att');
      const attId = lgEl.getAttribute('data-att-id');
      const attPath = lgEl.getAttribute('data-att-path');
      let ok = true;
      try{
        ok = await showAppConfirm('حذف هذا المرفق؟',{title:'حذف',okText:'حذف',cancelText:'إلغاء',danger:true});
      }catch(_e){ ok = false; }
      if(!ok) return;
      const s = typeof supplierById==='function'?supplierById(sid):null;
      if(!s) return;
      if(!Array.isArray(s.attachments)) s.attachments=[];
      const pathDecoded = attPath?decodeURIComponent(attPath):'';
      s.attachments = s.attachments.filter(a=>{
        if(attId && a.id===attId) return false;
        if(pathDecoded && a.path===pathDecoded) return false;
        return true;
      });
      if(pathDecoded && window.desktopApi && window.desktopApi.deleteAttachment){
        try{ await window.desktopApi.deleteAttachment(pathDecoded); }catch(_e){}
      }
      saveData(); lgShowToast('تم الحذف'); go(); return;
    }

    // —— عرض فاتورة / دفعة ——
    if(lgEl.hasAttribute('data-arch-view-inv') || lgEl.hasAttribute('data-viewinv-btn')){
      e.preventDefault(); e.stopPropagation();
      const id = lgEl.getAttribute('data-arch-view-inv') || lgEl.getAttribute('data-viewinv-btn');
      if(typeof openViewInvoiceModal==='function') openViewInvoiceModal(id);
      return;
    }
    if(lgEl.hasAttribute('data-arch-view-pay') || lgEl.hasAttribute('data-viewpay-btn')){
      e.preventDefault(); e.stopPropagation();
      const id = lgEl.getAttribute('data-arch-view-pay') || lgEl.getAttribute('data-viewpay-btn');
      if(typeof openViewPaymentModal==='function') openViewPaymentModal(id);
      return;
    }
    // صف دفعة
    if(lgEl.hasAttribute('data-viewpay') && lgEl.tagName==='TR'){
      if(e.target.closest('button') || e.target.closest('.row-actions')) return;
      const sel = window.getSelection && String(window.getSelection()).trim();
      if(sel) return;
      if(typeof openViewPaymentModal==='function') openViewPaymentModal(lgEl.getAttribute('data-viewpay'));
      return;
    }

    // —— إشعار خصم ——
    if(lgEl.hasAttribute('data-notice') || lgEl.hasAttribute('data-arch-print-notice')){
      e.preventDefault(); e.stopPropagation();
      const id = lgEl.getAttribute('data-notice') || lgEl.getAttribute('data-arch-print-notice');
      if(typeof openDiscountNoticeModal==='function') openDiscountNoticeModal(id);
      else lgShowToast('عرض الإشعار غير متاح');
      return;
    }

    // —— طباعة كل الإشعارات ——
    if(lgEl.id==='btnArchPrintAllNotices'){
      e.preventDefault(); e.stopPropagation();
      const sid = lgArchiveFilters.supplierId;
      const supObj = typeof supplierById==='function' ? supplierById(sid) : null;
      const invs = supObj ? archNoticesFiltered(supObj) : [];
      if(!invs.length){ lgShowToast('لا إشعارات'); return; }
      if(typeof buildDiscountNoticeHtml==='function' && typeof printHtmlContent==='function'){
        const pages = invs.map((inv, idx)=>buildDiscountNoticeHtml(inv, idx<invs.length-1)).join('');
        const s = typeof supplierById==='function'?supplierById(sid):null;
        printHtmlContent(pages, 'اشعارات-خصم-'+(s?s.name:sid)+'.pdf');
      } else lgShowToast('الطباعة غير متاحة');
      return;
    }

    // —— سلة: استرجاع / حذف نهائي ——
    if(lgEl.classList.contains('btn-arch-restore')){
      e.preventDefault(); e.stopPropagation();
      const idx = Number(lgEl.getAttribute('data-idx'));
      const trash = lgEnsureArchiveTrash();
      const item = trash[idx];
      if(!item || !item.supplier){ lgShowToast('عنصر غير صالح'); return; }
      if((DATA.ledger.suppliers||[]).some(s=>s.id===item.supplier.id)){ lgShowToast('المورد موجود بالفعل'); return; }
      DATA.ledger.suppliers.push(item.supplier);
      (item.invoices||[]).forEach(inv=>{ if(!(DATA.ledger.invoices||[]).some(i=>i.id===inv.id)) DATA.ledger.invoices.push(inv); });
      (item.payments||[]).forEach(pay=>{ if(!(DATA.ledger.payments||[]).some(p=>p.id===pay.id)) DATA.ledger.payments.push(pay); });
      trash.splice(idx, 1);
      try{ if(typeof lgRebuildIndexes==='function') lgRebuildIndexes(); }catch(_e){}
      if(typeof logAction==='function') logAction('استرجاع مورد من السلة', item.name||'');
      saveData(true);
      lgShowToast('تم استرجاع المورد ومجلد أرشيفه');
      lgArchiveFilters.level = 'suppliers';
      go();
      return;
    }
    if(lgEl.classList.contains('btn-arch-purge')){
      e.preventDefault(); e.stopPropagation();
      if(typeof guardReadOnly==='function' && guardReadOnly('حذف نهائي')) return;
      const idx = Number(lgEl.getAttribute('data-idx'));
      let ok = true;
      try{
        ok = await showAppConfirm('حذف نهائي من السلة؟ لا يمكن التراجع.', { title:'حذف نهائي', okText:'حذف', cancelText:'إلغاء', danger:true });
      }catch(_e){ ok = false; }
      if(!ok) return;
      lgEnsureArchiveTrash().splice(idx, 1);
      saveData(true);
      lgShowToast('تم الحذف النهائي');
      go(); return;
    }
  };

  // أي حقل عليه data-arch-f بيحدّث الفلتر المقابل. النص بتأخير بسيط مع الحفاظ على مكان المؤشر.
  root.__archInputBound = function(e){
    const t = e.target;
    const key = t && t.getAttribute ? t.getAttribute('data-arch-f') : null;
    if(!key || (t.type!=='search' && t.type!=='text')) return;
    lgArchiveFilters[key] = t.value || '';
    clearTimeout(window.__archQT);
    window.__archQT = setTimeout(()=>archGoKeepFocus(go, t), 250);
  };
  root.__archChangeBound = function(e){
    const t = e.target;
    const key = t && t.getAttribute ? t.getAttribute('data-arch-f') : null;
    if(!key || t.type==='search' || t.type==='text') return;
    lgArchiveFilters[key] = t.value || '';
    go();
  };

  root.addEventListener('click', root.__archBound, true);
  root.addEventListener('input', root.__archInputBound, true);
  root.addEventListener('change', root.__archChangeBound, true);

  // صفوف الفواتير (عرض) — مع حماية من التعطيل
  try{
    if(typeof attachInvoiceRowHandlers==='function') attachInvoiceRowHandlers();
  }catch(err){ console.error('attachInvoiceRowHandlers', err); }

}
