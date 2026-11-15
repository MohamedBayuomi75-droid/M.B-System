/* =========================================================
   clients/attachments.js — أدوات المرفقات لوحدة العملاء
   ---------------------------------------------------------
   بنستخدم نفس نظام تخزين المرفقات المعتمد في النظام (desktopApi.pickAttachments/openAttachment/deleteAttachment)
   ونفس شكل سجل المرفق { id, name, docType, path, storedName, mime, addedAt } — مفيش نظام تخزين موازي.
   ========================================================= */

/** اختيار ملفات من الجهاز → مصفوفة مرفقات جاهزة للتخزين على أي كيان */
async function clPickFiles(ownerId, label, extra){
  if(!window.desktopApi || !window.desktopApi.pickAttachments){
    showToast('الإرفاق متاح في نسخة سطح المكتب');
    return [];
  }
  let res;
  try{ const oid = /[A-Za-z0-9]/.test(String(ownerId || '')) ? String(ownerId) : 'file';
    res = await window.desktopApi.pickAttachments(oid, label || 'مرفق'); }
  catch(e){ console.error(e); showToast('فشل اختيار الملف'); return []; }
  if(!res || res.canceled) return [];
  const files = res.files || (res.path ? [res] : []);
  const now = new Date().toISOString();
  return files.map(function(f){
    return Object.assign({
      id: (typeof uid === 'function') ? uid() : String(Date.now() + Math.random()),
      name: f.name || f.storedName || label || 'ملف',
      docType: label || '',
      path: f.path || '',
      storedName: f.storedName || f.name || '',
      mime: f.mime || f.type || '',
      date: now.slice(0, 10),
      addedAt: now
    }, extra || {});
  });
}

function clDocIcon(d){
  const t = String((d && (d.mime || d.name || d.storedName)) || '');
  if(/image|jpg|jpeg|png|webp|gif/i.test(t)) return '🖼️';
  if(/pdf/i.test(t)) return '📄';
  if(/sheet|excel|xls|csv/i.test(t)) return '📊';
  if(/word|doc/i.test(t)) return '📝';
  return '📎';
}

/** قائمة مرفقات (HTML) — الأزرار بتشتغل عن طريق clBindAttachmentList */
function clAttachmentListHtml(docs, opts){
  opts = opts || {};
  const list = Array.isArray(docs) ? docs : [];
  if(!list.length) return '<div class="cl-att-empty">📭 لا مرفقات بعد</div>';
  return '<div class="cl-att-list">' + list.map(function(d){
    const nm = String(d.name || d.storedName || 'ملف');
    const ext = (nm.split('.').length > 1 ? nm.split('.').pop() : '').slice(0, 5).toUpperCase();
    return '<div class="cl-att-item" data-doc="' + escapeHtml(d.id || '') + '">' +
      '<span class="cl-att-ico">' + clDocIcon(d) + '</span>' +
      '<div class="cl-att-info"><span class="cl-att-name" title="' + escapeHtml(nm) + '">' + escapeHtml(nm) + '</span>' +
        '<span class="cl-att-sub">' + (ext ? '<i>' + escapeHtml(ext) + '</i>' : '') + (d.date ? escapeHtml(d.date) : '') + '</span></div>' +
      '<div class="cl-att-btns"><button type="button" class="btn btn-outline btn-sm cl-att-open">فتح</button>' +
      (opts.readOnly ? '' : '<button type="button" class="btn btn-outline btn-sm cl-att-del" title="حذف">🗑</button>') + '</div>' +
    '</div>';
  }).join('') + '</div>';
}

async function clOpenDoc(d){
  if(!d) return;
  try{
    if(d.path && window.desktopApi && window.desktopApi.openAttachment) await window.desktopApi.openAttachment(d.path);
    else if(d.dataUrl){ const w = window.open(); if(w) w.document.write('<iframe src="' + d.dataUrl + '" style="border:0;width:100%;height:100%"></iframe>'); }
    else showToast('مسار الملف غير متاح');
  }catch(e){ console.error(e); showToast('تعذر فتح الملف'); }
}

/** ربط أزرار قائمة المرفقات: getDocs() ترجّع المصفوفة الحالية، onRemove(doc) تتنفذ بعد تأكيد الحذف */
function clBindAttachmentList(root, getDocs, onRemove){
  if(!root) return;
  root.querySelectorAll('.cl-att-item').forEach(function(row){
    const id = row.getAttribute('data-doc');
    const find = function(){ return (getDocs() || []).find(function(x){ return String(x.id) === String(id); }); };
    row.querySelector('.cl-att-open')?.addEventListener('click', function(){ clOpenDoc(find()); });
    row.querySelector('.cl-att-del')?.addEventListener('click', function(){
      const d = find(); if(!d) return;
      confirmDelete('حذف المرفق «' + (d.name || '') + '»؟').then(function(ok){ if(ok && onRemove) onRemove(d); });
    });
  });
}

/** يضيف بلوك مرفقات لآخر نافذة مفتوحة (داخل .modal-body) ويرجّع { get() } — يُستدعى بعد openModal */
function clAttachMount(ownerId, label, initialDocs){
  let docs = (initialDocs || []).slice();
  const body = document.querySelector('.modal-body'); if(!body) return { get: function(){ return docs; } };
  const box = document.createElement('div');
  box.className = 'cl-att-block'; box.style.cssText = 'margin-top:12px;border-top:1px solid var(--line);padding-top:10px;';
  box.innerHTML = '<div class="section-title" style="margin-top:8px;">المرفقات والمستندات</div><div class="cl-att-host"></div><div class="att-toolbar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;"><button type="button" class="btn btn-primary btn-sm cl-att-add">📎 إرفاق مستند</button></div>';
  body.appendChild(box);
  const host = box.querySelector('.cl-att-host');
  const paint = function(){
    host.innerHTML = clAttachmentListHtml(docs, {});
    clBindAttachmentList(host, function(){ return docs; }, function(d){ docs = docs.filter(function(x){ return x.id !== d.id; }); paint(); });
  };
  paint();
  box.querySelector('.cl-att-add').addEventListener('click', async function(){
    const f = await clPickFiles(typeof ownerId === 'function' ? ownerId() : ownerId, label);
    if(f.length){ docs = docs.concat(f); paint(); }
  });
  return { get: function(){ return docs; } };
}

/* ---------- خانات مخصصة (نفس نظام «تعديلات مخصصة» في الإعدادات) ---------- */
/** يرسم الخانات المخصصة المعرّفة للكيان داخل آخر نافذة مفتوحة — يُستدعى بعد openModal */
function clMountCustomFields(entity, record){
  if(typeof customFieldsFormHtml !== 'function') return;
  const html = customFieldsFormHtml(entity, record || null);
  if(!html) return;
  const host = document.querySelector('.modal-body .form-grid') || document.querySelector('.modal-body');
  if(host) host.insertAdjacentHTML('beforeend', html);
}
/** قيم الخانات المخصصة عند الحفظ؛ لو الكيان ملوش خانات معرّفة نبقي على القيم القديمة */
function clCollectCustomFields(entity, record){
  const wrap = document.getElementById('extraFields_' + entity);
  if(!wrap || typeof collectExtraFieldsForSave !== 'function') return (record && record.extraFields) || [];
  const vals = collectExtraFieldsForSave('extraFields_' + entity);
  const keep = ((record && record.extraFields) || []).filter(function(f){ return !vals.some(function(v){ return v.label === f.label; }); });
  return keep.concat(vals);
}
