/* =========================================================
   clients/catalog.js — كتالوج أكواد البنود (المرحلة 10)
   settings.itemCatalog[] { code, name, unit, method, price, isHeader }
   - اقتراح الأكواد + تعبئة تلقائية في نماذج الحصر والمقايسة
   - البنود الجديدة بتتحفظ في الكتالوج تلقائيًا (من غير ما نغيّر بند موجود)
   - محرر كتالوج من إعدادات العملاء
   ========================================================= */
const CL_CATALOG_DEFAULT = [
  { code: '2-2', name: 'أعمال تسوية الموقع', unit: 'مقطوعية', method: 'يدوي', price: 0, isHeader: true },
  { code: '2-2-1', name: 'توريد وتركيب بلاطات شترولك ملون', unit: 'م2', method: 'مساحة', price: 0 },
  { code: '2-2-2', name: 'مسحة الموقع العام', unit: 'م2', method: 'مساحة', price: 0 },
  { code: '3-1', name: 'خرسانة عادية', unit: 'م3', method: 'حجم', price: 0 },
  { code: '3-2', name: 'خرسانة مسلحة', unit: 'م3', method: 'حجم', price: 0 },
  { code: '4-1', name: 'مباني طوب', unit: 'م2', method: 'مساحة', price: 0 }
];
function clCatalog(){
  const s = clSettings();
  if(!Array.isArray(s.itemCatalog)) s.itemCatalog = [];
  return s.itemCatalog;
}
function clCatalogFind(code){
  const c = String(code || '').trim(); if(!c) return null;
  return clCatalog().find(function(x){ return String(x.code).trim() === c; }) || null;
}
/** يضيف الأكواد الجديدة فقط (مش بيعدّل ولا بيمسح الموجود). يرجّع عدد المضاف. */
function clCatalogLearn(items){
  let n = 0; const cat = clCatalog();
  (items || []).forEach(function(it){
    const code = String(it && it.code || '').trim(), name = String(it && (it.name || '') || '').trim();
    if(!code || !name || clCatalogFind(code)) return;
    cat.push({ code: code, name: name, unit: it.unit || '', method: it.method || 'يدوي', price: Number(it.price) || 0, isHeader: !!it.isHeader }); n++;
  });
  return n;
}
/** يفعّل الاقتراح والتعبئة التلقائية على tbody بنود (بالتفويض — يشتغل مع إعادة رسم الصفوف) */
function clMountCatalog(tbodyId){
  const tb = document.getElementById(tbodyId); if(!tb) return;
  let dl = document.getElementById('clCatalogList');
  if(!dl){ dl = document.createElement('datalist'); dl.id = 'clCatalogList'; document.body.appendChild(dl); }
  dl.innerHTML = clCatalog().map(function(x){ return '<option value="' + escapeHtml(x.code) + '">' + escapeHtml(x.name) + '</option>'; }).join('');
  tb.addEventListener('focusin', function(e){ if(e.target.classList && e.target.classList.contains('it-code')) e.target.setAttribute('list', 'clCatalogList'); });
  tb.addEventListener('change', function(e){
    const el = e.target; if(!el.classList || !el.classList.contains('it-code')) return;
    const hit = clCatalogFind(el.value); if(!hit) return;
    const tr = el.closest('tr'); const set = function(sel, v, onlyEmpty){
      const f = tr.querySelector(sel); if(!f) return;
      if(onlyEmpty && String(f.value || '').trim() && Number(f.value) !== 0) return;
      f.value = v; f.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('.it-name', hit.name, true); set('.it-unit', hit.unit || '', true); set('.it-method', hit.method || 'يدوي', false);
    if(hit.price) set('.it-price', hit.price, true);
  });
}

function openCatalogEditor(){
  let list = clCatalog().map(function(x){ return Object.assign({}, x); });
  const rows = function(){
    return list.map(function(x, i){
      return '<tr data-i="' + i + '"><td><input class="input cat-code" value="' + escapeHtml(x.code) + '" style="width:90px;"></td>' +
        '<td><input class="input cat-name" value="' + escapeHtml(x.name) + '"></td>' +
        '<td><input class="input cat-unit" value="' + escapeHtml(x.unit || '') + '" style="width:70px;"></td>' +
        '<td><select class="input cat-method">' + ['يدوي', 'حجم', 'مساحة', 'طول', 'عدد'].map(function(m){ return '<option' + (x.method === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></td>' +
        '<td><input class="input cat-price" type="number" step="0.01" value="' + (Number(x.price) || 0) + '" style="width:90px;"></td>' +
        '<td><input type="checkbox" class="cat-head"' + (x.isHeader ? ' checked' : '') + '></td>' +
        '<td><button type="button" class="icon-btn cat-del">🗑️</button></td></tr>';
    }).join('');
  };
  openModal(`
    <div class="modal-header"><h3>كتالوج أكواد البنود</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body" style="max-height:70vh;overflow:auto;">
      <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;"><button type="button" class="btn btn-outline btn-sm" id="catAdd">+ كود</button>
      <button type="button" class="btn btn-outline btn-sm" id="catSeed">إضافة أمثلة افتراضية</button></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>الكود</th><th>البند</th><th>الوحدة</th><th>الطريقة</th><th>السعر</th><th>عنوان</th><th></th></tr></thead><tbody id="catBody">${rows()}</tbody></table></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" id="catSave">حفظ</button></div>`);
  const read = function(){
    list = Array.from(document.querySelectorAll('#catBody tr')).map(function(tr){
      return { code: tr.querySelector('.cat-code').value.trim(), name: tr.querySelector('.cat-name').value.trim(), unit: tr.querySelector('.cat-unit').value.trim(),
        method: tr.querySelector('.cat-method').value, price: Number(tr.querySelector('.cat-price').value) || 0, isHeader: tr.querySelector('.cat-head').checked };
    });
  };
  const paint = function(){ document.getElementById('catBody').innerHTML = rows(); };
  document.getElementById('catAdd').onclick = function(){ read(); list.push({ code: '', name: '', unit: '', method: 'يدوي', price: 0, isHeader: false }); paint(); };
  document.getElementById('catSeed').onclick = function(){ read(); CL_CATALOG_DEFAULT.forEach(function(d){ if(!list.some(function(x){ return x.code === d.code; })) list.push(Object.assign({}, d)); }); paint(); };
  document.getElementById('catBody').addEventListener('click', function(e){
    const b = e.target.closest('.cat-del'); if(!b) return; read(); list.splice(Number(b.closest('tr').getAttribute('data-i')), 1); paint();
  });
  document.getElementById('catSave').onclick = function(){
    read();
    const bad = list.find(function(x){ return !x.code || !x.name; });
    if(bad){ showToast('كل بند لازم يكون له كود واسم'); return; }
    const seen = {}; const dup = list.find(function(x){ if(seen[x.code]) return true; seen[x.code] = 1; return false; });
    if(dup){ showToast('الكود «' + dup.code + '» مكرر'); return; }
    clSettings().itemCatalog = list;
    try{ addAudit('كتالوج البنود', list.length + ' كود'); }catch(_e){}
    saveData(true); closeModal(); showToast('تم حفظ الكتالوج'); rerenderCurrentPage();
  };
}
