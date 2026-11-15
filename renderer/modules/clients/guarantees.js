/* =========================================================
   clients/guarantees.js — خطابات الضمان (المرحلة 5)
   ---------------------------------------------------------
   السجل مخزّن داخل العميل: customer.guarantees[] (نفس هيكل الأصلي + ربط بعقد/مشروع).
   { id, type, letterNo, issuer, amount, pct, issueDate, expiryDate, status,
     contractId, projectId, project, notes, docs[], releasedDate, releaseNote, renewals[] }
   الحالة المعروضة (clGuaranteeEffStatus): ساري/قيد التجديد اللي تاريخ انتهائه عدّى = منتهي (من غير تعديل البيانات).
   ========================================================= */
const CL_GUARANTEE_TYPES = [
  'ضمان ابتدائي (مناقصة)', 'ضمان دفعة مقدمة', 'ضمان حسن تنفيذ',
  'ضمان أعمال صيانة', 'ضمان نهائي', 'ضمان احتجاز', 'خطاب ضمان بنكي', 'أخرى'
];
const CL_GUARANTEE_STATUS = ['ساري', 'قيد التجديد', 'منتهي', 'محرَّر', 'مصادَر'];
const CL_GUARANTEE_ALERT_DAYS = 30;
let guaranteeFilters = { q: '', customerId: '', status: '', type: '' };

function clTodayISO(){
  return (typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0, 10);
}
function clDaysUntil(iso){
  if(!iso) return null;
  const a = new Date(clTodayISO() + 'T00:00:00'), b = new Date(iso + 'T00:00:00');
  if(isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}
function clGuaranteeEffStatus(g){
  const st = (g && g.status) || 'ساري';
  if((st === 'ساري' || st === 'قيد التجديد') && g.expiryDate && g.expiryDate < clTodayISO()) return 'منتهي';
  return st;
}
function clGuaranteeIsLive(g){ const s = clGuaranteeEffStatus(g); return s === 'ساري' || s === 'قيد التجديد'; }

function clAllGuarantees(){
  const rows = [];
  clCustomers().forEach(function(c){
    (c.guarantees || []).forEach(function(g, idx){
      rows.push(Object.assign({}, g, {
        customerId: c.id, customerName: c.name, _idx: idx, _key: c.id + '::' + (g.id || idx),
        _eff: clGuaranteeEffStatus(g)
      }));
    });
  });
  return rows;
}
function clNextGuaranteeId(){
  let max = 0;
  clAllGuarantees().forEach(function(g){
    const m = String(g.id || '').match(/(\d+)\s*$/);
    if(m) max = Math.max(max, parseInt(m[1], 10) || 0);
  });
  return 'GAR-' + String(max + 1).padStart(4, '0');
}
/** ضمانات عقد معيّن (بالربط المباشر contractId) */
function clGuaranteesOfContract(customerId, contractId){
  return clAllGuarantees().filter(function(g){ return g.customerId === customerId && g.contractId === contractId; });
}
/** المبالغ المحتجزة من مستخلصات العقد (نسبة الاحتجاز × إجمالي المستخلص) */
function clRetainedOfContract(customerId, contractId){
  const c = clCustomerById(customerId); if(!c) return 0;
  let sum = 0;
  (c.invoices || []).forEach(function(inv){
    if(inv.contractId !== contractId) return;
    const gross = (Number(inv.value) || 0) + (Number(inv.extras) || 0) - (Number(inv.excluded) || 0);
    sum += gross * ((Number(inv.retentionPct) || 0) / 100);
  });
  return Math.round(sum * 100) / 100;
}
function clGuaranteeTotals(list){
  const t = { live: 0, expired: 0, released: 0, seized: 0, soon: 0, liveCount: 0, expiredCount: 0 };
  (list || []).forEach(function(g){
    const a = Number(g.amount) || 0, s = clGuaranteeEffStatus(g);
    if(s === 'ساري' || s === 'قيد التجديد'){
      t.live += a; t.liveCount++;
      const d = clDaysUntil(g.expiryDate);
      if(d != null && d <= CL_GUARANTEE_ALERT_DAYS) t.soon++;
    } else if(s === 'منتهي'){ t.expired += a; t.expiredCount++; }
    else if(s === 'محرَّر') t.released += a;
    else if(s === 'مصادَر') t.seized += a;
  });
  return t;
}
function clGuaranteeBadge(g){
  const s = clGuaranteeEffStatus(g);
  const col = s === 'ساري' ? '#16a34a' : s === 'قيد التجديد' ? '#d97706' : s === 'منتهي' ? '#dc2626' : s === 'مصادَر' ? '#7f1d1d' : '#64748b';
  let extra = '';
  if(clGuaranteeIsLive(g)){
    const d = clDaysUntil(g.expiryDate);
    if(d != null && d >= 0 && d <= CL_GUARANTEE_ALERT_DAYS) extra = ' <small style="color:#d97706;">(باقي ' + d + ' يوم)</small>';
  }
  return '<span style="color:' + col + ';font-weight:700;">' + escapeHtml(s) + '</span>' + extra;
}

/** جدول ضمانات (يُستخدم في الصفحة وفي تفاصيل العقد/العميل) */
function clGuaranteesTableHtml(list, opts){
  opts = opts || {};
  const ro = (typeof readOnlyMode !== 'undefined' && readOnlyMode) ? ' disabled' : '';
  if(!list.length) return '<div style="text-align:center;color:var(--ink-soft);padding:22px;">لا ضمانات</div>';
  return '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>الكود</th><th>النوع</th>' + (opts.hideCustomer ? '' : '<th>العميل</th>') +
    '<th>رقم الخطاب / البنك</th><th>المبلغ</th><th>الانتهاء</th><th>الحالة</th><th></th></tr></thead><tbody>' +
    list.map(function(g){
      const k = escapeHtml(g._key);
      const live = clGuaranteeIsLive(g);
      return '<tr' + (g._eff === 'منتهي' ? ' style="background:rgba(220,38,38,.06);"' : '') + '>' +
        '<td>' + escapeHtml(g.id || '') + '</td>' +
        '<td>' + escapeHtml(g.type || '') + (g.project ? '<div style="font-size:11px;color:var(--ink-soft);">' + escapeHtml(g.project) + '</div>' : '') + '</td>' +
        (opts.hideCustomer ? '' : '<td>' + escapeHtml(g.customerName || '') + '</td>') +
        '<td>' + escapeHtml(g.letterNo || '—') + (g.issuer ? '<div style="font-size:11px;color:var(--ink-soft);">' + escapeHtml(g.issuer) + '</div>' : '') + '</td>' +
        '<td>' + fmtMoney(Number(g.amount) || 0) + '</td>' +
        '<td>' + escapeHtml(g.expiryDate || '—') + '</td>' +
        '<td>' + clGuaranteeBadge(g) + '</td>' +
        '<td style="white-space:nowrap;">' +
          (live ? '<button type="button" class="icon-btn gar-renew" title="تجديد" data-key="' + k + '"' + ro + '>🔄</button> ' +
                  '<button type="button" class="icon-btn gar-release" title="تحرير" data-key="' + k + '"' + ro + '>🔓</button> ' +
                  '<button type="button" class="icon-btn gar-seize" title="مصادرة" data-key="' + k + '"' + ro + '>⛔</button> ' : '') +
          '<button type="button" class="icon-btn gar-edit" data-key="' + k + '"' + ro + '>✏️</button> ' +
          '<button type="button" class="icon-btn icon-del gar-del" data-key="' + k + '"' + ro + '>🗑️</button>' +
        '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

function clGuaranteeTotalsHtml(t, retained){
  const card = function(n, l, c){ return '<div class="stat-card"><div class="num"' + (c ? ' style="color:' + c + ';"' : '') + '>' + n + '</div><div class="lbl">' + l + '</div></div>'; };
  return '<div class="stats-row" style="margin:12px 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">' +
    card(fmtMoney(t.live), 'ضمانات سارية (' + t.liveCount + ')', '#16a34a') +
    card(fmtMoney(t.expired), 'ضمانات منتهية (' + t.expiredCount + ')', '#dc2626') +
    card(t.soon, 'تنتهي خلال ' + CL_GUARANTEE_ALERT_DAYS + ' يوم', '#d97706') +
    card(fmtMoney(t.released), 'محرَّرة') +
    (t.seized ? card(fmtMoney(t.seized), 'مصادَرة', '#7f1d1d') : '') +
    (retained != null ? card(fmtMoney(retained), 'محتجز من المستخلصات') : '') +
    '</div>';
}

/** قسم ضمانات جاهز للتضمين: contractId اختياري، وإلا لكل العميل */
function clGuaranteesSectionHtml(customerId, contractId, projectId){
  let list = clAllGuarantees().filter(function(g){ return g.customerId === customerId; });
  if(contractId) list = list.filter(function(g){ return g.contractId === contractId; });
  else if(projectId) list = list.filter(function(g){ return g.projectId === projectId; });
  const retained = contractId ? clRetainedOfContract(customerId, contractId) : null;
  return '<div class="card gar-section" data-cid="' + escapeHtml(customerId) + '" data-ctr="' + escapeHtml(contractId || '') + '" style="padding:14px;margin-top:14px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">' +
    '<h3 style="margin:0;">🛡️ خطابات الضمان</h3>' +
    '<button type="button" class="btn btn-primary btn-sm gar-add"' + ((typeof readOnlyMode !== 'undefined' && readOnlyMode) ? ' disabled' : '') + '>+ ضمان</button></div>' +
    clGuaranteeTotalsHtml(clGuaranteeTotals(list), retained) +
    clGuaranteesTableHtml(list, { hideCustomer: true }) + '</div>';
}

function clBindGuaranteeActions(root){
  if(!root) return;
  const find = function(el){ const k = el.getAttribute('data-key'); return clAllGuarantees().find(function(x){ return x._key === k; }); };
  root.querySelectorAll('.gar-edit').forEach(function(b){ b.addEventListener('click', function(){ openGuaranteeModal(b.getAttribute('data-key')); }); });
  root.querySelectorAll('.gar-renew').forEach(function(b){ b.addEventListener('click', function(){ const g = find(b); if(g) openGuaranteeActionModal(g, 'renew'); }); });
  root.querySelectorAll('.gar-release').forEach(function(b){ b.addEventListener('click', function(){ const g = find(b); if(g) openGuaranteeActionModal(g, 'release'); }); });
  root.querySelectorAll('.gar-seize').forEach(function(b){ b.addEventListener('click', function(){ const g = find(b); if(g) openGuaranteeActionModal(g, 'seize'); }); });
  root.querySelectorAll('.gar-del').forEach(function(b){
    b.addEventListener('click', function(){
      const g = find(b); if(!g) return;
      confirmDelete('حذف الضمان «' + (g.id || '') + '»؟').then(function(ok){
        if(!ok) return;
        const c = clCustomerById(g.customerId); if(!c) return;
        c.guarantees = (c.guarantees || []).filter(function(x){ return x.id !== g.id; });
        try{ addAudit('حذف ضمان', g.id + ' — ' + (g.customerName || '')); }catch(_e){}
        clUpsertCustomer(c); showToast('تم الحذف'); rerenderCurrentPage();
      });
    });
  });
  root.querySelectorAll('.gar-add').forEach(function(b){
    b.addEventListener('click', function(){
      const sec = b.closest('.gar-section');
      openGuaranteeModal('', sec ? { customerId: sec.getAttribute('data-cid'), contractId: sec.getAttribute('data-ctr') } : null);
    });
  });
}

/* ---------- الصفحة ---------- */
function renderClientsGuaranteesPage(){
  const q = (guaranteeFilters.q || '').trim();
  let list = clAllGuarantees();
  if(guaranteeFilters.customerId) list = list.filter(function(g){ return g.customerId === guaranteeFilters.customerId; });
  if(guaranteeFilters.status) list = list.filter(function(g){ return g._eff === guaranteeFilters.status; });
  if(guaranteeFilters.type) list = list.filter(function(g){ return g.type === guaranteeFilters.type; });
  if(q) list = list.filter(function(g){
    const hay = [g.id, g.letterNo, g.issuer, g.customerName, g.project, g.contractId, g.type, g.notes].join(' ');
    return typeof smartMatch === 'function' ? smartMatch(hay, q) : hay.toLowerCase().indexOf(q.toLowerCase()) >= 0;
  });
  list = list.slice().sort(function(a, b){ return String(a.expiryDate || '9999').localeCompare(String(b.expiryDate || '9999')); });
  try{
    if(typeof setPageExport === 'function'){
      setPageExport('clients.guarantees',
        ['الكود', 'النوع', 'العميل', 'المشروع', 'العقد', 'رقم الخطاب', 'البنك', 'المبلغ', 'الإصدار', 'الانتهاء', 'الحالة'],
        list.map(function(g){ return [g.id || '', g.type || '', g.customerName || '', g.project || '', g.contractId || '', g.letterNo || '', g.issuer || '', Number(g.amount) || 0, g.issueDate || '', g.expiryDate || '', g._eff]; }));
    }
  }catch(_e){}
  const custOpts = clCustomers().map(function(c){ return '<option value="' + escapeHtml(c.id) + '"' + (guaranteeFilters.customerId === c.id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>'; }).join('');
  const stOpts = CL_GUARANTEE_STATUS.map(function(s){ return '<option value="' + s + '"' + (guaranteeFilters.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('');
  const tyOpts = CL_GUARANTEE_TYPES.map(function(s){ return '<option value="' + escapeHtml(s) + '"' + (guaranteeFilters.type === s ? ' selected' : '') + '>' + escapeHtml(s) + '</option>'; }).join('');
  return `
    <div class="page">
      ${typeof unifiedPageHeader === 'function' ? unifiedPageHeader('خطابات الضمان', 'ضمانات العملاء · مرتبطة بالعقود والمشاريع · متابعة الانتهاء والتجديد', `
        ${typeof pageExportButtonsHtml === 'function' ? pageExportButtonsHtml() : ''}
        <button class="btn btn-primary" id="btnAddGuarantee" ${readOnlyMode ? 'disabled' : ''}>+ ضمان</button>`) : ''}
      ${clGuaranteeTotalsHtml(clGuaranteeTotals(clAllGuarantees()), null)}
      <div class="card" style="padding:12px;margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;">
        <input class="input" id="garSearch" placeholder="بحث…" value="${escapeHtml(guaranteeFilters.q)}" style="flex:1;min-width:160px;">
        <select class="input" id="garCust" style="width:auto;"><option value="">كل العملاء</option>${custOpts}</select>
        <select class="input" id="garStatus" style="width:auto;"><option value="">كل الحالات</option>${stOpts}</select>
        <select class="input" id="garType" style="width:auto;"><option value="">كل الأنواع</option>${tyOpts}</select>
      </div>
      <div class="card gar-section" style="padding:6px;">${clGuaranteesTableHtml(list, {})}</div>
    </div>`;
}
function initClientsGuaranteesEvents(){
  const re = function(){ rerenderCurrentPage(); };
  document.getElementById('garSearch')?.addEventListener('input', function(e){
    guaranteeFilters.q = e.target.value;
    clearTimeout(window.__garQT); window.__garQT = setTimeout(re, 220);
  });
  document.getElementById('garCust')?.addEventListener('change', function(e){ guaranteeFilters.customerId = e.target.value; re(); });
  document.getElementById('garStatus')?.addEventListener('change', function(e){ guaranteeFilters.status = e.target.value; re(); });
  document.getElementById('garType')?.addEventListener('change', function(e){ guaranteeFilters.type = e.target.value; re(); });
  document.getElementById('btnAddGuarantee')?.addEventListener('click', function(){
    if(!clCustomers().length){ showToast('أضف عميلاً أولاً'); return; }
    openGuaranteeModal();
  });
  clBindGuaranteeActions(document.querySelector('.page'));
}
/** يُستدعى من صفحات التفاصيل (عقد/عميل) بعد الرسم */
function initGuaranteeSections(){ document.querySelectorAll('.gar-section').forEach(clBindGuaranteeActions); }

/* ---------- نافذة الإضافة/التعديل ---------- */
function openGuaranteeModal(editKey, preset){
  const existing = editKey ? clAllGuarantees().find(function(g){ return g._key === editKey; }) : null;
  const customers = clCustomers();
  if(!customers.length){ showToast('أضف عميلاً أولاً'); return; }
  const cid0 = existing ? existing.customerId : ((preset && preset.customerId) || guaranteeFilters.customerId || customers[0].id);
  const ctr0 = existing ? (existing.contractId || '') : ((preset && preset.contractId) || '');
  let docs = existing ? (existing.docs || []).slice() : [];
  const today = clTodayISO();
  const ctrOpts = function(cid, sel){
    const c = clCustomerById(cid);
    return '<option value="">— بدون عقد —</option>' + ((c && c.contracts) || []).map(function(k){
      return '<option value="' + escapeHtml(k.id) + '"' + (sel === k.id ? ' selected' : '') + '>' + escapeHtml(k.id + (k.title ? ' — ' + k.title : '')) + '</option>';
    }).join('');
  };
  openModal(`
    <div class="modal-header"><h3>${existing ? 'تعديل ضمان' : 'ضمان جديد'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body" style="max-height:70vh;overflow:auto;">
      <div class="form-grid form-grid-2">
        <label>العميل *<select class="input" id="garCustSel">${customers.map(function(c){ return '<option value="' + escapeHtml(c.id) + '"' + (cid0 === c.id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>'; }).join('')}</select></label>
        <label>الكود<input class="input" id="garId" value="${escapeHtml(existing && existing.id || clNextGuaranteeId())}"></label>
        <label>العقد<select class="input" id="garContract">${ctrOpts(cid0, ctr0)}</select></label>
        <label>المشروع<input class="input" id="garProject" list="clProjList" value="${escapeHtml(existing && existing.project || '')}">${clProjectDatalistHtml('clProjList')}</label>
        <label>النوع<select class="input" id="garTypeSel">${CL_GUARANTEE_TYPES.map(function(t){ return '<option value="' + escapeHtml(t) + '"' + ((existing ? existing.type : CL_GUARANTEE_TYPES[2]) === t ? ' selected' : '') + '>' + escapeHtml(t) + '</option>'; }).join('')}</select></label>
        <label>الحالة<select class="input" id="garStatusSel">${CL_GUARANTEE_STATUS.map(function(t){ return '<option value="' + t + '"' + ((existing ? (existing.status || 'ساري') : 'ساري') === t ? ' selected' : '') + '>' + t + '</option>'; }).join('')}</select></label>
        <label>رقم الخطاب<input class="input" id="garLetter" value="${escapeHtml(existing && existing.letterNo || '')}"></label>
        <label>البنك / الجهة المصدرة<input class="input" id="garIssuer" value="${escapeHtml(existing && existing.issuer || '')}"></label>
        <label>المبلغ (ج.م) *<input class="input" id="garAmount" type="number" step="0.01" value="${existing ? Number(existing.amount) || '' : ''}"></label>
        <label>النسبة من العقد %<input class="input" id="garPct" type="number" step="0.1" value="${existing && existing.pct != null ? existing.pct : ''}"></label>
        <label>تاريخ الإصدار<input class="input" id="garIssue" type="date" value="${escapeHtml(existing && existing.issueDate || today)}"></label>
        <label>تاريخ الانتهاء<input class="input" id="garExpiry" type="date" value="${escapeHtml(existing && existing.expiryDate || '')}"></label>
        <label style="grid-column:1/-1;">ملاحظات<textarea class="input" id="garNotes" rows="2">${escapeHtml(existing && existing.notes || '')}</textarea></label>
        <div style="grid-column:1/-1;"><div class="section-title" style="margin-top:8px;">المرفقات والمستندات</div><div id="garDocs"></div><div class="att-toolbar" style="display:flex;gap:8px;margin-top:6px;"><button type="button" class="btn btn-primary btn-sm" id="garAttach">📎 إرفاق مستند</button></div></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" id="btnSaveGuarantee">حفظ</button></div>
  `);
  const paintDocs = function(){
    const box = document.getElementById('garDocs'); if(!box) return;
    box.innerHTML = clAttachmentListHtml(docs, {});
    clBindAttachmentList(box, function(){ return docs; }, function(d){ docs = docs.filter(function(x){ return x.id !== d.id; }); paintDocs(); });
  };
  paintDocs();
  clMountCustomFields('clGuarantees', existing);
  document.getElementById('garCustSel').addEventListener('change', function(){
    document.getElementById('garContract').innerHTML = ctrOpts(document.getElementById('garCustSel').value, '');
  });
  document.getElementById('garAttach').addEventListener('click', async function(){
    const f = await clPickFiles(document.getElementById('garId').value || 'GAR', 'خطاب ضمان');
    if(f.length){ docs = docs.concat(f); paintDocs(); }
  });
  document.getElementById('btnSaveGuarantee').onclick = function(){
    const cid = document.getElementById('garCustSel').value;
    const cust = clCustomerById(cid); if(!cust){ showToast('اختر عميلاً'); return; }
    const amount = Number(document.getElementById('garAmount').value) || 0;
    if(amount <= 0){ showToast('المبلغ مطلوب'); return; }
    const id = (document.getElementById('garId').value || '').trim() || clNextGuaranteeId();
    const dupe = clAllGuarantees().some(function(g){ return g.id === id && !(existing && g._key === existing._key); });
    if(dupe){ showToast('الكود «' + id + '» مستخدم'); return; }
    const issue = document.getElementById('garIssue').value || '';
    const expiry = document.getElementById('garExpiry').value || '';
    if(issue && expiry && expiry < issue){ showToast('تاريخ الانتهاء قبل الإصدار'); return; }
    const project = (document.getElementById('garProject').value || '').trim();
    const conf = project && clProjectNameConflict(cid, project);
    if(conf){ showToast('المشروع «' + project + '» تابع للعميل «' + conf.owner + '»'); return; }
    const ctrId = document.getElementById('garContract').value || '';
    const rec = Object.assign({}, existing ? stripGarMeta(existing) : {}, {
      id: id, type: document.getElementById('garTypeSel').value, status: document.getElementById('garStatusSel').value,
      letterNo: (document.getElementById('garLetter').value || '').trim(), issuer: (document.getElementById('garIssuer').value || '').trim(),
      amount: amount, pct: document.getElementById('garPct').value === '' ? '' : Number(document.getElementById('garPct').value),
      issueDate: issue, expiryDate: expiry, contractId: ctrId, project: project, projectId: existing ? (existing.projectId || '') : '',
      notes: (document.getElementById('garNotes').value || '').trim(), docs: docs,
      extraFields: clCollectCustomFields('clGuarantees', existing)
    });
    // لو اتحدد عقد وملهوش مشروع، ناخد مشروع العقد
    if(ctrId && !rec.project){
      const k = (cust.contracts || []).find(function(x){ return x.id === ctrId; });
      if(k && k.project){ rec.project = k.project; rec.projectId = k.projectId || ''; }
    }
    cust.guarantees = cust.guarantees || [];
    if(existing && existing.customerId !== cid){
      const oldC = clCustomerById(existing.customerId);
      if(oldC){ oldC.guarantees = (oldC.guarantees || []).filter(function(x){ return x.id !== existing.id; }); clUpsertCustomer(oldC); }
    }
    const i = cust.guarantees.findIndex(function(x){ return x.id === (existing ? existing.id : id); });
    if(i >= 0) cust.guarantees[i] = rec; else cust.guarantees.push(rec);
    if(rec.project) clLinkRecordToProject(cust, rec, {});
    try{ addAudit(existing ? 'تعديل ضمان' : 'إضافة ضمان', rec.id + ' — ' + cust.name); }catch(_e){}
    clUpsertCustomer(cust);
    closeModal(); showToast(existing ? 'تم التحديث' : 'تم الإضافة'); rerenderCurrentPage();
  };
}
function stripGarMeta(g){
  const o = Object.assign({}, g);
  ['customerId', 'customerName', '_idx', '_key', '_eff'].forEach(function(k){ delete o[k]; });
  return o;
}

/* ---------- تجديد / تحرير / مصادرة ---------- */
function openGuaranteeActionModal(g, action){
  const titles = { renew: 'تجديد الضمان', release: 'تحرير الضمان', seize: 'مصادرة الضمان' };
  const today = clTodayISO();
  openModal(`
    <div class="modal-header"><h3>${titles[action]} — ${escapeHtml(g.id)}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body"><div class="form-grid form-grid-2">
      ${action === 'renew'
        ? '<label>تاريخ الانتهاء الجديد *<input class="input" id="gaDate" type="date" value=""></label><label>رقم الخطاب الجديد<input class="input" id="gaLetter" value="' + escapeHtml(g.letterNo || '') + '"></label>'
        : '<label>التاريخ<input class="input" id="gaDate" type="date" value="' + today + '"></label>'}
      <label style="grid-column:1/-1;">ملاحظات${action === 'seize' ? ' / السبب *' : ''}<textarea class="input" id="gaNote" rows="2"></textarea></label>
    </div></div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" id="btnGaSave">تأكيد</button></div>`);
  document.getElementById('btnGaSave').onclick = function(){
    const date = document.getElementById('gaDate').value;
    const note = (document.getElementById('gaNote').value || '').trim();
    const cust = clCustomerById(g.customerId); if(!cust) return;
    const rec = (cust.guarantees || []).find(function(x){ return x.id === g.id; }); if(!rec) return;
    if(action === 'renew'){
      if(!date){ showToast('حدد تاريخ الانتهاء الجديد'); return; }
      if(rec.issueDate && date < rec.issueDate){ showToast('التاريخ قبل الإصدار'); return; }
      rec.renewals = (rec.renewals || []).concat([{ at: clTodayISO(), from: rec.expiryDate || '', to: date, letterNo: document.getElementById('gaLetter').value || '', note: note }]);
      rec.expiryDate = date; rec.status = 'ساري';
      if(document.getElementById('gaLetter').value) rec.letterNo = document.getElementById('gaLetter').value.trim();
    } else if(action === 'release'){
      rec.status = 'محرَّر'; rec.releasedDate = date || today; rec.releaseNote = note;
    } else {
      if(!note){ showToast('اكتب سبب المصادرة'); return; }
      rec.status = 'مصادَر'; rec.releasedDate = date || today; rec.releaseNote = note;
    }
    try{ addAudit(titles[action], rec.id + ' — ' + cust.name); }catch(_e){}
    clUpsertCustomer(cust); closeModal(); showToast('تم'); rerenderCurrentPage();
  };
}
