/* =========================================================
   clients/access.js — صلاحيات + سجل تدقيق لقسم العملاء (المرحلة 12)
   - إنفاذ add/edit/delete لكل صفحة (hasPagePermission) على النوافذ وأزرار الحذف
   - سجل تدقيق تلقائي: أي إضافة/تعديل/حذف على سجلات العميل بيتسجل (من غير تكرار للي بيسجّل لوحده)
   ========================================================= */
(function(){
  const OPEN_GUARDS = [
    ['openCustomerModal', 'clients.customers'], ['openContractModal', 'clients.contracts'], ['openClientInvoiceModal', 'clients.invoices'],
    ['openBoqModal', 'clients.boqs'], ['openWorkSurveyModal', 'clients.workSurveys'], ['openCollectionModal', 'clients.collections'],
    ['openOppModal', 'clients.crm'], ['openCommModal', 'clients.crm'], ['openGuaranteeModal', 'clients.guarantees'], ['openChangeOrderModal', 'clients.contracts']
  ];
  const DEL_GUARDS = { 'btn-del-cust': 'clients.customers', 'btn-del-ct': 'clients.contracts', 'btn-del-ci': 'clients.invoices', 'btn-del-boq': 'clients.boqs',
    'btn-del-ws': 'clients.workSurveys', 'btn-del-co': 'clients.collections', 'btn-del-opp': 'clients.crm', 'btn-del-comm': 'clients.crm', 'gar-del': 'clients.guarantees', 'vo-del': 'clients.contracts' };
  function can(page, act){ return typeof hasPagePermission !== 'function' || hasPagePermission(page, act); }
  function deny(act){ showToast('🔒 ماعندكش صلاحية ' + (act === 'add' ? 'الإضافة' : act === 'edit' ? 'التعديل' : 'الحذف') + ' هنا'); }

  OPEN_GUARDS.forEach(function(g){
    const name = g[0], page = g[1];
    const orig = window[name]; if(typeof orig !== 'function') return;
    window[name] = function(){
      const first = arguments[0];
      const act = first ? 'edit' : 'add';
      if(!can(page, act)){ deny(act); return; }
      return orig.apply(this, arguments);
    };
  });
  document.addEventListener('click', function(e){
    const t = e.target && e.target.closest ? e.target.closest('button') : null; if(!t) return;
    for(const cls in DEL_GUARDS){
      if(t.classList.contains(cls)){
        if(!can(DEL_GUARDS[cls], 'delete')){ e.stopImmediatePropagation(); e.preventDefault(); deny('delete'); }
        return;
      }
    }
  }, true);

  /* ---- سجل التدقيق التلقائي ---- */
  const AUDIT_KINDS = [['contracts', 'id', 'عقد'], ['invoices', 'no', 'مستخلص'], ['boqs', 'id', 'مقايسة'], ['workSurveys', 'id', 'حصر'],
    ['collections', 'id', 'تحصيل'], ['opportunities', 'id', 'فرصة'], ['comms', 'id', 'تواصل']];
  function sig(r){ const o = Object.assign({}, r); delete o.changeOrders; delete o.docs; try{ return JSON.stringify(o); }catch(_e){ return ''; } }
  // الـ modals بتعدّل كائن العميل في مكانه قبل clUpsertCustomer، فلازم "قبل" يتاخد قبل التعديل:
  // بنصوّر حالة كل عميل لحظة فتح أي نافذة / طلب تأكيد حذف / بعد كل حفظ.
  const base = {};
  function snapCustomer(c){
    const o = { _name: c.name, _phone: c.phone, _status: c.status };
    AUDIT_KINDS.forEach(function(k){ o[k[0]] = {}; (c[k[0]] || []).forEach(function(r){ o[k[0]][r[k[1]]] = sig(r); }); });
    return o;
  }
  function clAuditBaseline(){ try{ clCustomers().forEach(function(c){ base[c.id] = snapCustomer(c); }); }catch(_e){} }
  window.clAuditBaseline = clAuditBaseline;
  function diffAudit(oldS, newC){
    const out = [];
    AUDIT_KINDS.forEach(function(k){
      const key = k[0], lab = k[2];
      const o = (oldS && oldS[key]) || {}, n = {};
      (newC[key] || []).forEach(function(r){ n[r[k[1]]] = sig(r); });
      Object.keys(n).forEach(function(id){ if(!(id in o)) out.push(['إضافة ' + lab, id]); else if(o[id] !== n[id]) out.push(['تعديل ' + lab, id]); });
      Object.keys(o).forEach(function(id){ if(!(id in n)) out.push(['حذف ' + lab, id]); });
    });
    return out;
  }
  ['openModal', 'confirmDelete', 'confirmApp'].forEach(function(fn){
    const orig = window[fn]; if(typeof orig !== 'function') return;
    window[fn] = function(){ clAuditBaseline(); return orig.apply(this, arguments); };
  });
  const origUpsert = window.clUpsertCustomer;
  if(typeof origUpsert === 'function'){
    window.clUpsertCustomer = function(rec){
      const before = base[rec.id] || null;
      const res = origUpsert.apply(this, arguments);
      try{
        if(typeof addAudit === 'function'){
          if(!before) addAudit('إضافة عميل', rec.name || rec.id);
          else {
            if(before._name !== rec.name || before._phone !== rec.phone || before._status !== rec.status) addAudit('تعديل عميل', rec.name || rec.id);
            diffAudit(before, rec).forEach(function(d){ addAudit(d[0], d[1] + ' — ' + (rec.name || '')); });
          }
        }
        base[rec.id] = snapCustomer(rec);
      }catch(_e){}
      return res;
    };
  }
  const origDel = window.clDeleteCustomer;
  if(typeof origDel === 'function'){
    window.clDeleteCustomer = function(id){
      let nm = ''; try{ const c = clCustomerById(id); nm = c ? c.name : ''; }catch(_e){}
      const res = origDel.apply(this, arguments);
      try{ if(typeof addAudit === 'function') addAudit('حذف عميل', nm || id); }catch(_e){}
      return res;
    };
  }
})();
