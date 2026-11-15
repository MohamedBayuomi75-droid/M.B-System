/* =========================================================
   clients/helpers.js — أدوات وحدة العملاء
   ========================================================= */

function clCustomers(){
  return (clientsData().customers || []);
}

function clSettings(){
  return clientsData().settings || {};
}

function clNextCode(prefix, list, field){
  field = field || 'code';
  const p = String(prefix || 'CUS-');
  let max = 0;
  (list || []).forEach(function(x){
    const m = String(x && x[field] || '').match(/(\d+)\s*$/);
    if(m) max = Math.max(max, parseInt(m[1], 10) || 0);
  });
  return p + String(max + 1).padStart(4, '0');
}

function clNextCustomerCode(){
  return clNextCode(clSettings().customerPrefix || 'CUS-', clCustomers(), 'code');
}

function clCustomerById(id){
  return clCustomers().find(function(c){ return c && c.id === id; }) || null;
}

function clCustomerName(id){
  const c = clCustomerById(id);
  return c ? (c.name || c.code || id) : (id || '—');
}

/* =========================================================
   المشروع الموحّد (المرحلة 2)
   ---------------------------------------------------------
   DATA.projects هو المصدر الوحيد للمشاريع (HR + العملاء). كل مشروع تجاري له customerId.
   customer.projects[] لم يعد يُستخدم (يُرحَّل في schema 7 ويُفرَّغ).
   ========================================================= */

function clNormName(s){
  return String(s == null ? '' : s).replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

function clProjects(){
  if(!Array.isArray(DATA.projects)) DATA.projects = [];
  return DATA.projects;
}

function clProjectById(id){
  if(!id) return null;
  return clProjects().find(function(p){ return p && p.id === id; }) || null;
}

/** هل المشروع تابع للعميل؟ (بالمعرّف، أو بالاسم النصي للمشاريع القديمة بدون customerId) */
function clProjectBelongsTo(p, c){
  if(!p || !c) return false;
  if(p.customerId) return p.customerId === c.id;
  const nm = p.customerName || p.customer || '';
  return !!nm && clNormName(nm) === clNormName(c.name);
}

/** مشاريع العميل من المصدر الموحّد */
function clProjectsOfCustomer(c){
  if(!c) return [];
  return clProjects().filter(function(p){ return clProjectBelongsTo(p, c); });
}

/** كل المشاريع التجارية (اللي ليها عميل) من المصدر الموحّد */
function clAllCommercialProjects(){
  const rows = [];
  clProjects().forEach(function(p){
    if(!p) return;
    let c = p.customerId ? clCustomerById(p.customerId) : null;
    if(!c && (p.customerName || p.customer)){
      c = clCustomers().find(function(x){ return clNormName(x.name) === clNormName(p.customerName || p.customer); }) || null;
    }
    if(!c) return;
    rows.push(Object.assign({}, p, { customerId: c.id, customerName: c.name }));
  });
  return rows;
}

/** البحث عن مشروع: بالمعرّف ثم الكود ثم الاسم (الأفضل داخل نفس العميل). الاسم مفتاح ربط في HR فهو فريد في النظام. */
function clFindProject(q){
  q = q || {};
  const list = clProjects();
  if(q.id){ const byId = list.find(function(p){ return p && p.id === q.id; }); if(byId) return byId; }
  if(q.code){
    const byCode = list.find(function(p){ return p && p.code && String(p.code).trim() === String(q.code).trim(); });
    if(byCode) return byCode;
  }
  const nm = clNormName(q.name);
  if(!nm) return null;
  const named = list.filter(function(p){ return p && clNormName(p.name) === nm; });
  if(!named.length) return null;
  if(q.customerId){
    const same = named.find(function(p){ return p.customerId === q.customerId; });
    if(same) return same;
  }
  return named[0];
}

const CL_TERMINAL_STATUSES = ['مكتمل', 'متوقف', 'ملغي'];

/** يقدّم مرحلة المشروع للأمام فقط (لا يرجّعها ولا يلمس المشاريع المتوقفة/الملغاة/المكتملة) */
function clAdvanceProjectStatus(p, targetLabel){
  if(!p || !targetLabel || typeof PROJECT_STAGES === 'undefined') return false;
  const cur = typeof normalizeProjectStatus === 'function' ? normalizeProjectStatus(p) : (p.status || '');
  if(CL_TERMINAL_STATUSES.indexOf(cur) >= 0) return false;
  const order = PROJECT_STAGES.map(function(s){ return s.value; });
  const ci = order.indexOf(cur), ti = order.indexOf(targetLabel);
  if(ti < 0) return false;
  if(ci >= 0 && ci >= ti) return false;
  p.status = targetLabel;
  try{ if(typeof pwOnStatusChanged === 'function') pwOnStatusChanged(p, targetLabel); }catch(_e){}
  return true;
}

/**
 * يضمن وجود مشروع موحّد للعميل (ينشئه لو مش موجود) — **من غير ما يمسح أي بيانات موجودة**:
 * الحقول الموجودة بالفعل لا تُستبدل (تُملأ الفارغة فقط)، والمرحلة تتقدّم للأمام فقط.
 * spec: { name, code, value, contractNo, advanceTo, ... }
 * يرجّع المشروع، أو null لو الاسم فاضي، أو { conflict:true, owner } لو الاسم مملوك لعميل آخر.
 */
function clEnsureProject(customer, spec){
  spec = spec || {};
  const name = String(spec.name || '').trim();
  if(!name) return null;
  const cid = (customer && customer.id) || spec.customerId || '';
  const cname = (customer && customer.name) || spec.customerName || '';
  let p = clFindProject({ id: spec.projectId || spec.id, code: spec.code, name: name, customerId: cid });
  if(p && p.customerId && cid && p.customerId !== cid){
    return { conflict: true, owner: p.customerId, project: p };
  }
  if(!p){
    p = {
      id: (typeof uid === 'function') ? uid() : ('prj_' + Date.now().toString(36)),
      code: spec.code || (typeof nextProjectCode === 'function' ? nextProjectCode() : ''),
      name: name,
      status: (typeof pwFirstStageLabel === 'function') ? pwFirstStageLabel() : 'الدراسة والتخطيط',
      value: 0, budget: 0, start: '', end: '', progress: null,
      notes: '', assignedTo: '', supervisorId: '', contractNo: '', extraFields: [], docs: []
    };
    clProjects().push(p);
  }
  if(cid && !p.customerId) p.customerId = cid;
  if(cname && (!p.customerName || p.customerId === cid)){ p.customerName = cname; p.customer = cname; }
  const fillNum = function(k, v){ if(v != null && v !== '' && !Number(p[k]) && Number(v)) p[k] = Number(v); };
  const fillTxt = function(k, v){ if(v && !p[k]) p[k] = v; };
  fillNum('value', spec.value);
  if(!Number(p.budget) && Number(p.value)) p.budget = Number(p.value);
  fillTxt('contractNo', spec.contractNo);
  fillTxt('start', spec.start);
  fillTxt('end', spec.end);
  fillTxt('notes', spec.notes);
  fillTxt('assignedTo', spec.assignedTo);
  if(spec.advanceTo) clAdvanceProjectStatus(p, spec.advanceTo);
  return p;
}

/** يربط سجل تجاري (عقد/مستخلص/مقايسة/حصر/تحصيل) بالمشروع الموحّد؛ يرجّع false لو الاسم مملوك لعميل آخر */
function clLinkRecordToProject(customer, rec, spec){
  if(!rec || !rec.project){ if(rec) rec.projectId = rec.projectId || ''; return true; }
  const pr = clEnsureProject(customer, Object.assign({ name: rec.project, projectId: rec.projectId }, spec || {}));
  if(!pr) return true;
  if(pr.conflict){ return false; }
  rec.projectId = pr.id;
  rec.project = pr.name;
  return true;
}

/** فحص مسبق قبل الحفظ: هل اسم المشروع مملوك لعميل آخر؟ */
function clProjectNameConflict(customerId, name){
  const p = clFindProject({ name: name, customerId: customerId });
  if(p && p.customerId && customerId && p.customerId !== customerId){
    return { project: p, owner: clCustomerName(p.customerId) };
  }
  return null;
}

/** قائمة اقتراح المشاريع لحقول «المشروع» في النماذج (مشاريع كل العملاء، مع اسم العميل كوصف) */
function clProjectDatalistHtml(listId){
  return '<datalist id="' + (listId || 'clProjList') + '">' +
    clProjects().filter(function(p){ return p && p.name; }).map(function(p){
      return '<option value="' + escapeHtml(p.name) + '">' + escapeHtml((p.code ? p.code + ' · ' : '') + (p.customerName || '')) + '</option>';
    }).join('') + '</datalist>';
}

/** السجلات التجارية المرتبطة بمشروع (للحماية من الحذف وللعرض) */
function clProjectLinks(p){
  const out = { contracts: 0, invoices: 0, boqs: 0, workSurveys: 0, collections: 0 };
  if(!p) return out;
  const nm = clNormName(p.name);
  clCustomers().forEach(function(c){
    Object.keys(out).forEach(function(k){
      (c[k] || []).forEach(function(r){
        if(!r) return;
        if((r.projectId && r.projectId === p.id) || (!r.projectId && r.project && clNormName(r.project) === nm && (!p.customerId || p.customerId === c.id))) out[k]++;
      });
    });
  });
  out.total = out.contracts + out.invoices + out.boqs + out.workSurveys + out.collections;
  return out;
}

/** تغيير اسم مشروع → تحديث السجلات التجارية المرتبطة (تربط بالاسم النصي كمان) */
function clRenameProjectRefs(p, oldName, newName){
  if(!p || !oldName || oldName === newName) return 0;
  const old = clNormName(oldName);
  let n = 0;
  clCustomers().forEach(function(c){
    ['contracts', 'invoices', 'boqs', 'workSurveys', 'collections'].forEach(function(k){
      (c[k] || []).forEach(function(r){
        if(!r) return;
        if((r.projectId && r.projectId === p.id) || (!r.projectId && r.project && clNormName(r.project) === old && clProjectBelongsTo(p, c))){
          r.project = newName; r.projectId = p.id; n++;
        }
      });
    });
  });
  return n;
}

/** [متروكة] اسم قديم — كانت بتكتب فوق بيانات المشروع. بقت تحويلة لـ clEnsureProject (تملأ الفارغ وتقدّم المرحلة فقط). */
function clSyncProjectToUnified(customer, project){
  if(!project || !project.name) return null;
  return clEnsureProject(customer, Object.assign({}, project, { advanceTo: project.status }));
}

/** دمج مشروع قديم (متداخل تحت العميل) في المشروع الموحّد — يُستخدم في الترحيل والاستيراد. لا يمسح شيئًا موجودًا. */
function clMergeLegacyProject(customer, lp, log){
  if(!lp || !String(lp.name || '').trim()) return null;
  const cid = customer.id;
  let target = clFindProject({ id: lp.unifiedId, code: lp.code, name: lp.name, customerId: cid });
  let created = false;
  if(target && target.customerId && target.customerId !== cid){
    // نفس الاسم لعميل آخر: نخلّي مشروعًا مستقلًا باسم مميّز بدل ما نخلط بياناتهم
    const newName = String(lp.name).trim() + ' (' + (customer.name || cid) + ')';
    if(log) log.conflicts.push({ customer: customer.name, project: lp.name, renamedTo: newName });
    target = clFindProject({ name: newName, customerId: cid });
    lp = Object.assign({}, lp, { name: newName, code: '' });
  }
  if(!target){
    target = { id: (typeof uid === 'function') ? uid() : ('prj_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)) };
    clProjects().push(target);
    created = true;
  }
  const isEmpty = function(v){ return v == null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length); };
  Object.keys(lp).forEach(function(k){
    if(k === 'unifiedId' || k === 'id') return;
    const v = lp[k];
    if(isEmpty(v)) return;
    if(k === 'value' || k === 'budget'){ if(!Number(target[k])) target[k] = Number(v) || 0; return; }
    if(k === 'progress'){ if(target.progress == null || target.progress === '') target.progress = v; return; }
    if(k === 'status'){
      if(created || !target.status){ target.status = v; }
      else if(typeof clAdvanceProjectStatus === 'function') clAdvanceProjectStatus(target, v);
      return;
    }
    if(k === 'docs' || k === 'extraFields' || k === 'completedSteps'){
      const cur = Array.isArray(target[k]) ? target[k] : [];
      const seen = {}; cur.forEach(function(x){ seen[JSON.stringify(x)] = 1; });
      const add = (Array.isArray(v) ? v : []).filter(function(x){ return !seen[JSON.stringify(x)]; });
      target[k] = cur.concat(add);
      return;
    }
    if(typeof v === 'object' && !Array.isArray(v)){
      target[k] = Object.assign({}, v, isEmpty(target[k]) ? {} : target[k]);
      return;
    }
    if(isEmpty(target[k])) target[k] = v;
  });
  if(!target.name) target.name = String(lp.name).trim();
  if(!target.code) target.code = (typeof nextProjectCode === 'function') ? nextProjectCode() : '';
  if(!target.status) target.status = 'الدراسة والتخطيط';
  target.customerId = cid;
  target.customerName = customer.name || '';
  target.customer = customer.name || '';
  if(log){ if(created) log.created++; else log.merged++; }
  return target;
}

/** ترحيل schema 7: نقل customer.projects[] إلى DATA.projects + ملء projectId في السجلات التجارية */
function clMigrateNestedProjects(){
  const cl = getDataSection('clients');
  const log = { at: new Date().toISOString(), created: 0, merged: 0, conflicts: [], linked: 0 };
  (cl.customers || []).forEach(function(c){
    if(!c) return;
    const legacy = Array.isArray(c.projects) ? c.projects : [];
    legacy.forEach(function(lp){ try{ clMergeLegacyProject(c, lp, log); }catch(e){ console.error('project merge', e); } });
    c.projects = [];
  });
  // ربط الكيانات التجارية بالمشروع بالمعرّف (الاسم يفضل موجود للتوافق)
  (cl.customers || []).forEach(function(c){
    ['contracts', 'invoices', 'boqs', 'workSurveys', 'collections'].forEach(function(k){
      (c[k] || []).forEach(function(r){
        if(!r || r.projectId || !r.project) return;
        const p = clFindProject({ name: r.project, customerId: c.id });
        if(p && (!p.customerId || p.customerId === c.id)){
          if(!p.customerId){ p.customerId = c.id; p.customerName = c.name; p.customer = c.name; }
          r.projectId = p.id; log.linked++;
        }
      });
    });
  });
  // مشاريع HR القديمة اللي ليها اسم عميل نصي فقط: اربطها بالعميل لو الاسم مطابق
  clProjects().forEach(function(p){
    if(!p || p.customerId) return;
    const nm = p.customerName || p.customer;
    if(!nm) return;
    const c = (cl.customers || []).find(function(x){ return clNormName(x.name) === clNormName(nm); });
    if(c){ p.customerId = c.id; p.customerName = c.name; p.customer = c.name; }
  });
  if(log.created || log.merged || log.linked || log.conflicts.length){
    cl.projectsUnifyLog = log;
    // لقطة احتياطية قبل أول حفظ بعد الترحيل (الملف على القرص لسه قبل الترحيل)
    try{ if(window.desktopApi && window.desktopApi.snapshotData) window.desktopApi.snapshotData('before-projects-unify'); }catch(_e){}
  }
  return log;
}

function clSaveCustomers(list){
  const cl = clientsData();
  cl.customers = list || [];
  saveData(true);
}

function clUpsertCustomer(rec){
  // اسم العميل المنسوخ داخل مشاريعه (عرض فقط) يتحدّث لو الاسم اتغيّر
  try{
    clProjects().forEach(function(p){
      if(p && p.customerId === rec.id && p.customerName !== rec.name){ p.customerName = rec.name; p.customer = rec.name; }
    });
  }catch(_e){}
  const list = clCustomers().slice();
  const i = list.findIndex(function(c){ return c.id === rec.id; });
  if(i >= 0) list[i] = rec;
  else list.push(rec);
  // ترتيب بالاسم
  if(typeof sortByNameAr === 'function'){
    clSaveCustomers(sortByNameAr(list, function(x){ return x.name; }));
  } else {
    clSaveCustomers(list);
  }
}

function clDeleteCustomer(id){
  // مشاريع العميل ممكن يكون عليها موارد/تكاليف HR: بنفصلها عن العميل (customerId فاضي) بدل ما نحذفها
  clProjects().forEach(function(p){
    if(p && p.customerId === id){ p.customerId = ''; p.customerName = ''; p.customer = ''; }
  });
  clSaveCustomers(clCustomers().filter(function(c){ return c.id !== id; }));
}

/** استيراد data.json من برنامج العملاء القديم */
function clImportLegacyClientsData(raw){
  if(!raw) throw new Error('ملف فارغ');
  let data = raw;
  if(typeof raw === 'string') data = JSON.parse(raw);
  // شكل قديم: مصفوفة عملاء مباشرة أو { customers }
  let customers = [];
  if(Array.isArray(data)) customers = data;
  else if(data && Array.isArray(data.customers)) customers = data.customers;
  else if(data && data.data && Array.isArray(data.data.customers)) customers = data.data.customers;
  else throw new Error('لا يوجد customers في الملف');

  const cl = clientsData();
  const existingIds = {};
  (cl.customers || []).forEach(function(c){ if(c && c.id) existingIds[c.id] = true; });

  let added = 0, merged = 0;
  const plog = { created: 0, merged: 0, conflicts: [], linked: 0 };
  customers.forEach(function(src){
    if(!src || typeof src !== 'object') return;
    const rec = {
      id: src.id || (typeof uid === 'function' ? uid() : ('cus_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6))),
      code: src.code || '',
      name: src.name == null ? '' : String(src.name),
      phone: src.phone || '',
      email: src.email || '',
      address: src.address || '',
      city: src.city || '',
      department: src.department || '',
      taxId: src.taxId || src.tax || '',
      category: src.category || '',
      status: src.status || 'active',
      openingBalance: Number(src.openingBalance) || 0,
      notes: src.notes || '',
      contacts: Array.isArray(src.contacts) ? src.contacts : [],
      projects: [],   // المشاريع تُدمج في DATA.projects (المصدر الموحّد) — انظر legacyProjects أدناه
      contracts: Array.isArray(src.contracts) ? src.contracts : [],
      invoices: Array.isArray(src.invoices) ? src.invoices : [],
      collections: Array.isArray(src.collections) ? src.collections : [],
      workSurveys: Array.isArray(src.workSurveys) ? src.workSurveys : [],
      boqs: Array.isArray(src.boqs) ? src.boqs : [],
      guarantees: Array.isArray(src.guarantees) ? src.guarantees : [],
      ledger: Array.isArray(src.ledger) ? src.ledger : [],
      comms: Array.isArray(src.comms) ? src.comms : [],
      opportunities: Array.isArray(src.opportunities) ? src.opportunities : [],
      docs: Array.isArray(src.docs) ? src.docs : [],
      extraFields: Array.isArray(src.extraFields) ? src.extraFields : [],
      createdAt: src.createdAt || '',
      updatedAt: src.updatedAt || new Date().toISOString()
    };
    const idx = (cl.customers || []).findIndex(function(c){ return c.id === rec.id || (rec.name && c.name === rec.name); });
    if(idx >= 0){
      // دمج: احتفظ بالمعرف وحدّث الحقول الأساسية وأضف الكيانات الناقصة بحذر
      const old = cl.customers[idx];
      cl.customers[idx] = Object.assign({}, old, rec, {
        contacts: (rec.contacts && rec.contacts.length) ? rec.contacts : (old.contacts || []),
        projects: [],
        contracts: (old.contracts || []).concat(rec.contracts || []).filter(function(k, i, arr){
          return arr.findIndex(function(x){ return x.id === k.id; }) === i;
        }),
        invoices: (old.invoices || []).concat(rec.invoices || []).filter(function(inv, i, arr){
          return arr.findIndex(function(x){ return x.no === inv.no; }) === i;
        }),
        collections: (old.collections || []).concat(rec.collections || []).filter(function(r, i, arr){
          return arr.findIndex(function(x){ return x.id === r.id; }) === i;
        }),
        workSurveys: (old.workSurveys || []).concat(rec.workSurveys || []).filter(function(w, i, arr){
          return arr.findIndex(function(x){ return x.id === w.id; }) === i;
        }),
        boqs: (old.boqs || []).concat(rec.boqs || []).filter(function(b, i, arr){
          return arr.findIndex(function(x){ return x.id === b.id; }) === i;
        }),
        opportunities: (old.opportunities || []).concat(rec.opportunities || []),
        comms: (old.comms || []).concat(rec.comms || [])
      });
      merged++;
    } else {
      cl.customers.push(rec);
      added++;
    }
    // المشاريع القديمة (المتداخلة) → المشروع الموحّد (يملأ الفارغ فقط، ولا يكرّر المشروع لو موجود بنفس الكود/الاسم)
    const finalCust = clCustomerById(rec.id) || (cl.customers || []).find(function(c){ return c.name === rec.name; });
    if(finalCust && Array.isArray(src.projects)){
      src.projects.forEach(function(lp){ try{ clMergeLegacyProject(finalCust, lp, plog); }catch(_e){} });
    }
  });
  // اربط السجلات التجارية المستوردة بمشاريعها
  (cl.customers || []).forEach(function(c){
    ['contracts', 'invoices', 'boqs', 'workSurveys', 'collections'].forEach(function(k){
      (c[k] || []).forEach(function(r){
        if(!r || r.projectId || !r.project) return;
        const pr = clFindProject({ name: r.project, customerId: c.id });
        if(pr && (!pr.customerId || pr.customerId === c.id)){ if(!pr.customerId){ pr.customerId = c.id; pr.customerName = c.name; pr.customer = c.name; } r.projectId = pr.id; }
      });
    });
  });

  // settings
  if(data && data.settings && typeof data.settings === 'object'){
    const s = cl.settings || {};
    Object.keys(data.settings).forEach(function(k){
      if(s[k] === undefined || s[k] === null || s[k] === '') s[k] = data.settings[k];
    });
    cl.settings = s;
  }

  try{ clMigratePaidSource(); }catch(_e){}
  ensureClientsSection();
  saveData(true);
  return { added: added, merged: merged, total: cl.customers.length, projects: plog.created + plog.merged, projectsCreated: plog.created, projectConflicts: plog.conflicts.length };
}

async function clImportLegacyFromFile(){
  if(typeof readOnlyMode !== 'undefined' && readOnlyMode){
    showToast('🔒 وضع القراءة فقط');
    return;
  }
  if(!window.desktopApi || !window.desktopApi.openFile){
    // fallback: file input
    return new Promise(function(resolve){
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async function(){
        const file = input.files && input.files[0];
        if(!file){ resolve(null); return; }
        try{
          const text = await file.text();
          const res = clImportLegacyClientsData(text);
          showToast('تم الاستيراد: +' + res.added + ' دمج ' + res.merged + ' (الإجمالي ' + res.total + ')');
          try{ if(typeof addAudit === 'function') addAudit('استيراد بيانات العملاء', res.added + '/' + res.merged); }catch(_e){}
          if(typeof rerenderCurrentPage === 'function') rerenderCurrentPage();
          resolve(res);
        }catch(e){
          showToast('فشل الاستيراد: ' + (e.message || e));
          resolve(null);
        }
      };
      input.click();
    });
  }
  try{
    const file = await window.desktopApi.openFile({ filters: [{ name: 'JSON', extensions: ['json'] }] });
    if(!file || file.canceled) return null;
    const content = file.content || file.data || file.text;
    const res = clImportLegacyClientsData(content);
    showToast('تم الاستيراد: +' + res.added + ' دمج ' + res.merged);
    try{ if(typeof addAudit === 'function') addAudit('استيراد بيانات العملاء', res.added + '/' + res.merged); }catch(_e){}
    if(typeof rerenderCurrentPage === 'function') rerenderCurrentPage();
    return res;
  }catch(e){
    showToast('فشل الاستيراد: ' + (e.message || e));
    return null;
  }
}


/** لوحة إعدادات العملاء داخل صفحة الإعدادات الموحّدة */
function clRenderSettingsPanel(){
  const s = (typeof clSettings === 'function' ? clSettings() : {}) || {};
  return `
      <div class="settings-panel" data-panel="clients" style="display:none;">
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">إعدادات العملاء والمشاريع</div>
          <p style="font-size:13px;color:var(--ink-soft);margin:0 0 12px;">بادئات الترقيم والتصنيفات — جزء من بيانات النظام الموحد (DATA.clients).</p>
          <div class="form-grid form-grid-2">
            <label>بادئة كود العميل<input class="input" id="clSetCustPrefix" value="${escapeHtml(s.customerPrefix || 'CUS-')}"></label>
            <label>بادئة أعمال الحصر<input class="input" id="clSetSurveyPrefix" value="${escapeHtml(s.surveyPrefix || 'Q-')}"></label>
            <label>بادئة المقايسات<input class="input" id="clSetBoqPrefix" value="${escapeHtml(s.boqPrefix || 'BOQ-')}"></label>
            <label>بادئة العقود<input class="input" id="clSetContractPrefix" value="${escapeHtml(s.contractPrefix || 'CON-')}"></label>
            <label>بادئة التحصيل<input class="input" id="clSetCollPrefix" value="${escapeHtml(s.collectionPrefix || 'REC-')}"></label>
            <label style="grid-column:1/-1;">تصنيفات المستخلصات (سطر لكل تصنيف)
              <textarea class="input" id="clSetInvCats" rows="3">${escapeHtml((s.invoiceCategories || []).join('\n'))}</textarea>
            </label>
          </div>
          <div class="btn-row" style="margin-top:14px;">
            <button type="button" class="btn btn-primary" id="clSaveSettingsBtn" ${typeof readOnlyMode !== 'undefined' && readOnlyMode ? 'disabled' : ''}>💾 حفظ إعدادات العملاء</button>
          </div>
        </div>
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">مسار المشروع (مراحل وخطوات)</div>
          <p style="font-size:13px;color:var(--ink-soft);margin:0 0 10px;">${(typeof pwSettingsWorkflow === 'function') ? pwSettingsWorkflow().length : 0} مراحل · تعديل المسار يطبّق على المشاريع الجديدة فقط ولا يغيّر مسار المشاريع القائمة.</p>
          <button type="button" class="btn btn-outline" id="clWorkflowEditBtn" ${typeof readOnlyMode !== 'undefined' && readOnlyMode ? 'disabled' : ''}>⚙️ تعديل مسار العمل</button>
        </div>
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">كتالوج أكواد البنود</div>
          <p style="font-size:13px;color:var(--ink-soft);margin:0 0 10px;">${(typeof clCatalog === 'function') ? clCatalog().length : 0} كود · بيقترح البند والوحدة والسعر تلقائيًا في الحصر والمقايسات.</p>
          <button type="button" class="btn btn-outline" id="clCatalogBtn" ${typeof readOnlyMode !== 'undefined' && readOnlyMode ? 'disabled' : ''}>📚 إدارة الكتالوج</button>
        </div>
        <div class="settings-card">
          <div class="section-title" style="margin-top:0;">استيراد سريع</div>
          <p style="font-size:13px;color:var(--ink-soft);margin:0 0 10px;">يمكن أيضاً من تبويب «الاستيراد والتصدير».</p>
          <button type="button" class="btn btn-outline" id="clImportFromSettingsBtn" ${typeof readOnlyMode !== 'undefined' && readOnlyMode ? 'disabled' : ''}>📥 استيراد data.json للعملاء</button>
        </div>
      </div>`;
}
function clInitSettingsPanel(){
  const btn = document.getElementById('clSaveSettingsBtn');
  if(btn) btn.addEventListener('click', function(){
    if(typeof readOnlyMode !== 'undefined' && readOnlyMode){ showToast('🔒 قراءة فقط'); return; }
    const cl = clientsData();
    cl.settings = cl.settings || {};
    cl.settings.customerPrefix = (document.getElementById('clSetCustPrefix')?.value || 'CUS-').trim() || 'CUS-';
    cl.settings.surveyPrefix = (document.getElementById('clSetSurveyPrefix')?.value || 'Q-').trim() || 'Q-';
    cl.settings.boqPrefix = (document.getElementById('clSetBoqPrefix')?.value || 'BOQ-').trim() || 'BOQ-';
    cl.settings.contractPrefix = (document.getElementById('clSetContractPrefix')?.value || 'CON-').trim() || 'CON-';
    cl.settings.collectionPrefix = (document.getElementById('clSetCollPrefix')?.value || 'REC-').trim() || 'REC-';
    const cats = (document.getElementById('clSetInvCats')?.value || '').split(/\n+/).map(function(x){ return x.trim(); }).filter(Boolean);
    if(cats.length) cl.settings.invoiceCategories = cats;
    saveData(true);
    showToast('تم حفظ إعدادات العملاء');
    try{ if(typeof addAudit === 'function') addAudit('إعدادات العملاء', ''); }catch(_e){}
  });
  document.getElementById('clWorkflowEditBtn')?.addEventListener('click', function(){ openWorkflowEditor(); });
  document.getElementById('clCatalogBtn')?.addEventListener('click', function(){ openCatalogEditor(); });
  document.getElementById('clImportFromSettingsBtn')?.addEventListener('click', function(){
    document.getElementById('clImportOldBtn')?.click();
  });
}


/* =========================================================
   مصدر واحد لـ «المدفوع على المستخلص» (المرحلة 13)
   inv.paid = inv.paidManual (سداد مباشر مسجّل على المستخلص نفسه) + مجموع التحصيلات المربوطة به (invoiceNo)
   قبل كده كان بيتعدّل بالزيادة/النقص من أكتر من مكان، فكان ممكن يتعد مرتين أو ينفصل عن كشف حساب العميل.
   ========================================================= */
function clInvLinkedCollected(c, inv){
  return (c.collections || []).reduce(function(s, r){ return s + (r && inv.no && r.invoiceNo === inv.no ? (Number(r.amount) || 0) : 0); }, 0);
}
/** يرجّع عدد المستخلصات اللي اتغيّر مدفوعها */
function clReconcilePaid(c){
  let changed = 0;
  (c.invoices || []).forEach(function(inv){
    const linked = clInvLinkedCollected(c, inv);
    if(inv.paidManual == null || inv.paidManual === '') inv.paidManual = Math.max(0, Math.round(((Number(inv.paid) || 0) - linked) * 100) / 100);
    const paid = Math.round(((Number(inv.paidManual) || 0) + linked) * 100) / 100;
    if((Number(inv.paid) || 0) !== paid){ inv.paid = paid; changed++; }
  });
  return changed;
}
function clMigratePaidSource(){
  const cl = clientsData(); let n = 0;
  (cl.customers || []).forEach(function(c){ n += clReconcilePaid(c); });
  if(n) cl.paidReconcileLog = { at: new Date().toISOString(), invoicesChanged: n };
  return n;
}


/** مشروع شغّال = لسه ما خلصش (مش مكتمل/متوقف/ملغي) */
function clProjectIsRunning(p){
  const st = typeof normalizeProjectStatus === 'function' ? normalizeProjectStatus(p) : (p && p.status || '');
  return CL_TERMINAL_STATUSES.indexOf(st) < 0;
}
/** عميل نشط = له مشروع شغّال على الأقل؛ وإلا غير نشط */
function clCustomerSegment(c){
  return clProjectsOfCustomer(c).some(clProjectIsRunning) ? 'active' : 'inactive';
}
