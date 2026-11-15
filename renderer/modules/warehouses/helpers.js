/* مخازن — helpers */
function whData(){ return warehousesData(); }
function whItems(){ return whData().items || []; }
function whLocations(){ return whData().locations || []; }
function whMovements(){ return whData().movements || []; }
function whSettings(){ return whData().settings || {}; }

function whNextCode(prefix, list, field){
  field = field || 'code';
  const p = String(prefix || 'ITM-');
  let max = 0;
  (list || []).forEach(function(x){
    const m = String(x && x[field] || '').match(/(\d+)\s*$/);
    if(m) max = Math.max(max, parseInt(m[1], 10) || 0);
  });
  return p + String(max + 1).padStart(4, '0');
}
function whNextItemCode(){ return whNextCode(whSettings().itemPrefix || 'ITM-', whItems(), 'code'); }
function whNextMovementId(){ return whNextCode(whSettings().movementPrefix || 'MV-', whMovements(), 'id'); }

function whItemById(id){ return whItems().find(function(x){ return x.id === id; }) || null; }
function whLocationById(id){ return whLocations().find(function(x){ return x.id === id; }) || null; }
function whLocationName(id){ const L = whLocationById(id); return L ? L.name : (id || '—'); }
function whItemName(id){ const it = whItemById(id); return it ? ((it.code ? it.code + ' — ' : '') + it.name) : (id || '—'); }

/** رصيد صنف في مخزن (أو كل المخازن) */
function whStockQty(itemId, locationId){
  let q = 0;
  whMovements().forEach(function(m){
    if(!m || m.itemId !== itemId) return;
    if(locationId && m.locationId !== locationId && m.toLocationId !== locationId) return;
    const qty = Number(m.qty) || 0;
    if(m.type === 'in' || m.type === 'adjust_in'){
      if(!locationId || m.locationId === locationId) q += qty;
    } else if(m.type === 'out' || m.type === 'adjust_out'){
      if(!locationId || m.locationId === locationId) q -= qty;
    } else if(m.type === 'transfer'){
      if(locationId){
        if(m.locationId === locationId) q -= qty;
        if(m.toLocationId === locationId) q += qty;
      }
      // total stock unchanged on transfer when no location filter
    }
  });
  return Math.round(q * 1000) / 1000;
}

function whStockValue(itemId, locationId){
  const it = whItemById(itemId);
  const cost = it ? (Number(it.avgCost) || Number(it.lastCost) || 0) : 0;
  return Math.round(whStockQty(itemId, locationId) * cost * 100) / 100;
}

function whSave(){ saveData(true); }

function whUpsertItem(rec){
  const list = whItems().slice();
  const i = list.findIndex(function(x){ return x.id === rec.id; });
  if(i >= 0) list[i] = rec; else list.push(rec);
  whData().items = typeof sortByNameAr === 'function' ? sortByNameAr(list, function(x){ return x.name; }) : list;
  whSave();
}
function whDeleteItem(id){
  whData().items = whItems().filter(function(x){ return x.id !== id; });
  whSave();
}
function whUpsertLocation(rec){
  const list = whLocations().slice();
  const i = list.findIndex(function(x){ return x.id === rec.id; });
  if(i >= 0) list[i] = rec; else list.push(rec);
  whData().locations = list;
  whSave();
}
function whAddMovement(m){
  // تكلفة الصرف تتثبّت وقت الحركة (عشان تكلفة المشروع ما تتغيّرش بتغيّر المتوسط بعدين)
  if((m.type === 'out' || m.type === 'adjust_out') && (m.unitCost == null || m.unitCost === '')){
    const it0 = whItemById(m.itemId);
    m.unitCost = it0 ? (Number(it0.avgCost) || Number(it0.lastCost) || 0) : 0;
  }
  const list = whMovements().slice();
  list.push(m);
  whData().movements = list;
  // update item last cost on inbound
  if((m.type === 'in' || m.type === 'adjust_in') && m.unitCost != null){
    const it = whItemById(m.itemId);
    if(it){
      const oldQty = whStockQty(m.itemId) - (Number(m.qty) || 0); // before this movement roughly
      const oldCost = Number(it.avgCost) || Number(it.lastCost) || 0;
      const addQty = Number(m.qty) || 0;
      const addCost = Number(m.unitCost) || 0;
      if(oldQty > 0 && addQty > 0){
        it.avgCost = Math.round(((oldQty * oldCost) + (addQty * addCost)) / (oldQty + addQty) * 100) / 100;
      } else if(addQty > 0){
        it.avgCost = addCost;
      }
      it.lastCost = addCost;
    }
  }
  whSave();
}


function whRenderSettingsPanel(){
  const s = (typeof whSettings === 'function' ? whSettings() : {}) || {};
  const locs = (typeof whLocations === 'function' ? whLocations() : []) || [];
  const locOpts = locs.map(function(L){
    return '<option value="' + escapeHtml(L.id) + '"' + (s.defaultLocationId === L.id ? ' selected' : '') + '>' + escapeHtml(L.name) + '</option>';
  }).join('');
  return `
      <div class="settings-panel" data-panel="warehouses" style="display:none;">
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">إعدادات المخازن</div>
          <p style="font-size:13px;color:var(--ink-soft);margin:0 0 12px;">بادئات وترقيم — جزء من بيانات النظام الموحد (DATA.warehouses).</p>
          <div class="form-grid form-grid-2">
            <label>بادئة الأصناف<input class="input" id="whSetItemPrefix" value="${escapeHtml(s.itemPrefix || 'ITM-')}"></label>
            <label>بادئة الحركات<input class="input" id="whSetMovePrefix" value="${escapeHtml(s.movementPrefix || 'MV-')}"></label>
            <label>المخزن الافتراضي<select class="input" id="whSetDefLoc"><option value="">—</option>${locOpts}</select></label>
          </div>
          <div class="btn-row" style="margin-top:14px;">
            <button type="button" class="btn btn-primary" id="whSaveSettingsBtn" ${typeof readOnlyMode !== 'undefined' && readOnlyMode ? 'disabled' : ''}>💾 حفظ إعدادات المخازن</button>
          </div>
        </div>
      </div>`;
}
function whInitSettingsPanel(){
  document.getElementById('whSaveSettingsBtn')?.addEventListener('click', function(){
    if(typeof readOnlyMode !== 'undefined' && readOnlyMode){ showToast('🔒 قراءة فقط'); return; }
    const wh = warehousesData();
    wh.settings = wh.settings || {};
    wh.settings.itemPrefix = (document.getElementById('whSetItemPrefix')?.value || 'ITM-').trim() || 'ITM-';
    wh.settings.movementPrefix = (document.getElementById('whSetMovePrefix')?.value || 'MV-').trim() || 'MV-';
    wh.settings.defaultLocationId = document.getElementById('whSetDefLoc')?.value || '';
    saveData(true);
    showToast('تم حفظ إعدادات المخازن');
    try{ if(typeof addAudit === 'function') addAudit('إعدادات المخازن', ''); }catch(_e){}
  });
}
