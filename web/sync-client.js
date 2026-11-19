/* =========================================================================
   sync-client.js — مزامنة DATA مع السيرفر (A4)
   - bootstrap(): GET /api/bootstrap → نسخة «أساس» (آخر حالة اتأكدت من السيرفر) + revs.
   - save(DATA): diff على مستوى الحقل بين DATA والأساس → POST /api/sync (baseRev لكل سجل) →
       تحديث الأساس، وتطبيق النسخ المدموجة/الحالية في التعارضات، ورسائل واضحة للمستخدم.
   - saveSync(DATA): نفس الـ diff بـ fetch keepalive (إغلاق الصفحة).
   - Socket.IO: تغييرات الباقيين بتتطبق على DATA فورًا — من غير ما تكسر تعديل محلي لسه ماتحفظش،
       ومن غير إعادة رسم وهو بيكتب (isUserTypingOrEditing).
   مفيش أي تعديل في ملفات الواجهة نفسها: كل حاجة بتعدي من desktopApi + web-overrides.js.
   ========================================================================= */
(function () {
  'use strict';
  var S = {
    meta: null, seq: 0,
    base: {},        // path → Map(id → record)
    baseDocs: {},    // key → value
    baseAudit: new Set(),
    baseUsers: null, // [{id, username}] للي عنده manageUsers
    saving: null, again: false, offlineToastAt: 0, retryTimer: null,
    socket: null, renderPending: false, renderTimer: null, warnedNoId: {},
  };
  var LABELS = {
    employees: 'موظف', workers: 'عامل', supervisors: 'مشرف', drivers: 'سائق', equipment: 'معدة', projects: 'مشروع',
    workerAttendance: 'يومية عامل', attendance: 'حضور', payroll: 'راتب', costs: 'تكلفة', expenses: 'مصروف',
    'ledger.invoices': 'فاتورة مورد', 'ledger.payments': 'دفعة مورد', 'ledger.suppliers': 'مورد',
    'clients.customers': 'عميل', 'clients.invoices': 'مستخلص', 'clients.contracts': 'عقد', 'clients.collections': 'تحصيل',
  };

  // ------------------------------------------------------------ helpers
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function deepEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
      // undefined ≈ غياب الحقل (JSON بيشيله)
      return (a === undefined && b === undefined) || (Number.isNaN(a) && Number.isNaN(b));
    }
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
      return true;
    }
    var ka = Object.keys(a).filter(function (k) { return a[k] !== undefined; });
    var kb = Object.keys(b).filter(function (k) { return b[k] !== undefined; });
    if (ka.length !== kb.length) return false;
    for (var j = 0; j < ka.length; j++) if (!Object.prototype.hasOwnProperty.call(b, ka[j]) || !deepEqual(a[ka[j]], b[ka[j]])) return false;
    return true;
  }
  function isPlain(o) { return o !== null && typeof o === 'object' && !Array.isArray(o); }
  function getPath(obj, path) {
    var p = path.split('.');
    var v = obj && obj[p[0]];
    return p.length === 1 ? v : (v && typeof v === 'object' ? v[p[1]] : undefined);
  }
  function setPath(obj, path, val) {
    var p = path.split('.');
    if (p.length === 1) { obj[p[0]] = val; return; }
    if (!obj[p[0]] || typeof obj[p[0]] !== 'object') obj[p[0]] = {};
    obj[p[0]][p[1]] = val;
  }
  function DATA_() { return typeof window.__webGetDATA === 'function' ? window.__webGetDATA() : null; }
  function toast(msg, ms) { try { if (typeof window.showToast === 'function') window.showToast(msg, ms); else console.warn(msg); } catch (e) {} }
  function kindOf(path) { return (S.meta && S.meta.catalog && S.meta.catalog[path]) || null; }
  function label(path) { return LABELS[path] || path; }

  // ------------------------------------------------------------ bootstrap
  async function bootstrap() {
    var r = await window.WebSession.api('GET', '/api/bootstrap');
    if (!r.ok) throw new Error('bootstrap failed: ' + r.status);
    var b = r.body;
    S.meta = b.meta;
    S.seq = b.seq;
    S.base = {}; S.baseDocs = {};
    Object.keys(b.meta.catalog).forEach(function (path) {
      var kind = b.meta.catalog[path];
      if (kind === 'collection') {
        var m = new Map();
        (getPath(b.data, path) || []).forEach(function (rec) { if (rec && rec.id != null) m.set(String(rec.id), clone(rec)); });
        S.base[path] = m;
      } else if (kind === 'doc' || kind === 'lookup' || kind === 'meta-flag') {
        var v = getPath(b.data, path);
        if (v !== undefined && path !== 'schemaVersion') S.baseDocs[path] = clone(v);
      }
    });
    S.baseAudit = new Set((b.data.auditLog || []).map(function (e) { return String(e.id); }));
    // المستخدمين (شاشة إدارة المستخدمين في الواجهة القديمة بتقرا DATA.users)
    S.baseUsers = null;
    if (b.me && b.me.permissions && b.me.permissions.manageUsers) {
      try { b.data.users = await fetchUsers(); } catch (e) { b.data.users = []; }
    }
    return b.data;
  }

  async function fetchUsers() {
    var r = await window.WebSession.api('GET', '/api/users');
    if (!r.ok) return [];
    var list = r.body.map(function (u) {
      var pages = {};
      var tpl = null;
      try { tpl = typeof window.roleTemplates === 'function' ? (window.roleTemplates()[u.role] || null) : null; } catch (e) {}
      if (tpl && tpl.pages) Object.keys(tpl.pages).forEach(function (k) { pages[k] = clone(tpl.pages[k]); });
      (u.pages || []).forEach(function (o) { pages[o.page] = { view: o.view, add: o.add, edit: o.edit, delete: o.delete }; });
      return { id: u.id, username: u.username, name: u.name, role: u.role, active: u.active, mustChangePassword: u.mustChangePassword,
        lastLoginAt: u.lastLoginAt, projectScope: u.projectScope,
        permissions: { editData: u.editData, deleteData: u.deleteData, manageUsers: u.manageUsers, pages: pages } };
    });
    S.baseUsers = list.map(function (u) { return { id: u.id, username: u.username }; });
    return list;
  }

  // ------------------------------------------------------------ diff
  function buildPlan(DATA) {
    if (S.meta) unknownKeys(DATA);
    var meta = S.meta, changes = [], docs = [], recPlan = [], docPlan = [];
    if (!meta) return { changes: changes, docs: docs, recPlan: recPlan, docPlan: docPlan };
    Object.keys(meta.catalog).forEach(function (path) {
      var kind = meta.catalog[path];
      if (kind === 'collection') {
        var w = meta.writable[path];
        if (!w || !S.base[path]) return; // مش مقروءة → مانبعتش أي حاجة ليها أبدًا
        var cur = getPath(DATA, path);
        if (!Array.isArray(cur)) return;
        var hidden = (meta.hiddenFields && meta.hiddenFields[path]) || [];
        var base = S.base[path], seen = new Set(), revs = meta.revs[path] || {};
        cur.forEach(function (rec) {
          if (!rec || typeof rec !== 'object') return;
          if (rec.id == null || rec.id === '') {
            if (!S.warnedNoId[path]) { S.warnedNoId[path] = 1; console.warn('[sync] سجل من غير id في', path, '— مش هيتحفظ على السيرفر'); }
            return;
          }
          var id = String(rec.id);
          seen.add(id);
          var b = base.get(id);
          var set = {}, unset = [], n = 0;
          Object.keys(rec).forEach(function (k) {
            if (hidden.indexOf(k) >= 0 || k === '_rev') return;
            if (rec[k] === undefined) { if (b && b[k] !== undefined) { unset.push(k); n++; } return; }
            if (!b || !deepEqual(rec[k], b[k])) { set[k] = rec[k]; n++; }
          });
          if (b) Object.keys(b).forEach(function (k) { if (hidden.indexOf(k) < 0 && !(k in rec) && unset.indexOf(k) < 0) { unset.push(k); n++; } });
          if (!n) return;
          var action = b ? 'edit' : 'add';
          if (!w[action]) return; // تعديل محلي بس (تطبيع بيانات وقت التحميل مثلًا) — المستخدم مالوش صلاحية يحفظه
          var c = { collection: path, id: id, op: 'upsert', baseRev: b ? (revs[id] || 0) : 0, set: clone(set) };
          if (unset.length) c.unset = unset;
          changes.push(c);
          recPlan.push({ path: path, id: id, snap: clone(rec) });
        });
        if (w.delete) base.forEach(function (_v, id) {
          if (seen.has(id)) return;
          changes.push({ collection: path, id: id, op: 'delete', baseRev: revs[id] || 0 });
          recPlan.push({ path: path, id: id, snap: null });
        });
      } else if ((kind === 'doc' || kind === 'lookup' || kind === 'meta-flag') && path !== 'schemaVersion') {
        if (!meta.docsWritable) return;
        var curD = getPath(DATA, path);
        if (curD === undefined) return;
        var bD = S.baseDocs[path];
        if (deepEqual(curD, bD)) return;
        var rev = meta.docRevs[path] || 0, d;
        if (Array.isArray(curD) && (bD === undefined || Array.isArray(bD))) {
          var bArr = bD || [];
          var add = curD.filter(function (x) { return !bArr.some(function (y) { return deepEqual(x, y); }); });
          var rem = bArr.filter(function (y) { return !curD.some(function (x) { return deepEqual(x, y); }); });
          var sameSet = curD.length === bArr.length + add.length - rem.length;
          d = (add.length || rem.length) && sameSet ? { key: path, baseRev: rev, op: 'arrayDelta', add: clone(add), remove: clone(rem) } : { key: path, baseRev: rev, op: 'set', value: clone(curD) };
        } else if (isPlain(curD) && isPlain(bD)) {
          var dset = {}, dun = [];
          Object.keys(curD).forEach(function (k) { if (curD[k] === undefined) { if (bD[k] !== undefined) dun.push(k); } else if (!deepEqual(curD[k], bD[k])) dset[k] = curD[k]; });
          Object.keys(bD).forEach(function (k) { if (!(k in curD) && dun.indexOf(k) < 0) dun.push(k); });
          d = { key: path, baseRev: rev, op: 'patch', set: clone(dset) };
          if (dun.length) d.unset = dun;
        } else d = { key: path, baseRev: rev, op: 'set', value: clone(curD) };
        docs.push(d);
        docPlan.push({ key: path, snap: clone(curD) });
      } else if (path === 'auditLog') {
        (DATA.auditLog || []).forEach(function (e) {
          if (!e || e.id == null || S.baseAudit.has(String(e.id))) return;
          changes.push({ collection: 'auditLog', id: String(e.id), op: 'upsert', baseRev: 0, set: { id: String(e.id), at: e.at, action: e.action, details: typeof e.details === 'string' ? e.details : JSON.stringify(e.details || '') } });
          recPlan.push({ path: 'auditLog', id: String(e.id), snap: null });
        });
      }
    });
    return { changes: changes, docs: docs, recPlan: recPlan, docPlan: docPlan };
  }

  /** مفاتيح في DATA مش في الكتالوج = مش هتتحفظ على السيرفر → تحذير واضح (مرة لكل مفتاح) بدل ضياع صامت */
  var warnedUnknown = {};
  function unknownKeys(DATA) {
    var cat = (S.meta && S.meta.catalog) || {}, out = [];
    Object.keys(DATA || {}).forEach(function (k) {
      if (k === 'ledger' || k === 'clients' || k === 'warehouses') Object.keys(DATA[k] || {}).forEach(function (k2) { if (!cat[k + '.' + k2]) out.push(k + '.' + k2); });
      else if (!cat[k]) out.push(k);
    });
    out.forEach(function (k) { if (!warnedUnknown[k]) { warnedUnknown[k] = 1; console.warn('[sync] مفتاح «' + k + '» مش معروف للسيرفر — مش هيتحفظ. ضيفه في docs/web/collections-map.json (npm run inventory + gen:collections)'); } });
    return out;
  }

  // ------------------------------------------------------------ apply results
  function findIndex(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i] && String(arr[i].id) === id) return i; return -1; }
  function replaceLocal(DATA, path, id, data) {
    var arr = getPath(DATA, path);
    if (!Array.isArray(arr)) { arr = []; setPath(DATA, path, arr); }
    var i = findIndex(arr, id);
    if (data === null) { if (i >= 0) arr.splice(i, 1); return; }
    if (i >= 0) arr[i] = clone(data); else arr.push(clone(data));
  }

  function applyResults(DATA, plan, body) {
    var meta = S.meta, notes = [], changedLocal = false;
    var byKey = {};
    plan.recPlan.forEach(function (p) { byKey[p.path + '\u0000' + p.id] = p; });
    (body.applied || []).forEach(function (a) {
      if (a.collection === 'auditLog') { S.baseAudit.add(String(a.id)); return; }
      var p = byKey[a.collection + '\u0000' + a.id];
      if (!p) return;
      var revs = meta.revs[a.collection] || (meta.revs[a.collection] = {});
      if (a.op === 'delete' || (a.op === 'noop' && p.snap === null)) { S.base[a.collection].delete(a.id); delete revs[a.id]; return; }
      if (a.data) { replaceLocal(DATA, a.collection, a.id, a.data); S.base[a.collection].set(a.id, clone(a.data)); changedLocal = true; }
      else if (p.snap) S.base[a.collection].set(a.id, p.snap);
      revs[a.id] = a.rev;
      if (a.overwrote && a.overwrote.length) notes.push('ℹ️ حفظت ' + label(a.collection) + ' فوق تعديل حد تاني في: ' + a.overwrote.join('، '));
    });
    (body.conflicts || []).forEach(function (c) {
      var revs = meta.revs[c.collection] || (meta.revs[c.collection] = {});
      if (c.current) { replaceLocal(DATA, c.collection, c.id, c.current.data); S.base[c.collection].set(c.id, clone(c.current.data)); revs[c.id] = c.current.rev; }
      else { replaceLocal(DATA, c.collection, c.id, null); S.base[c.collection].delete(c.id); delete revs[c.id]; }
      changedLocal = true;
      // reason=constraint: قاعدة البيانات رفضت القيمة (مثلًا B-50 رصيد سالب، أو كود مكرر) — مش تعارض مع مستخدم تاني
      var cf = String((c.fields || [])[0] || '');
      var why = c.reason === 'deleted' ? 'اتمسح من مستخدم تاني' : c.reason === 'changed_since' ? 'اتعدّل من مستخدم تاني قبل الحذف'
        : c.reason === 'constraint' ? (cf.indexOf('negative_stock') === 0 ? 'الرصيد المتاح مايكفيش — ممنوع الرصيد المخزني السالب (كمّل الاستلام أو اعمل تسوية معتمدة الأول)'
          : cf.indexOf('item_has_movements') === 0 ? 'الصنف عليه حركات مخزون — ماينفعش يتمسح'
          : cf.indexOf('invalid_movement') === 0 ? 'بيانات حركة المخزن غير صحيحة' : cf.indexOf('duplicate') === 0 ? 'الكود مستخدم لسجل تاني' : 'القيمة مرفوضة من قواعد النظام')
        : 'مستخدم تاني غيّر ' + (c.fields || []).join('، ') + ' في نفس الوقت';
      notes.push('⚠️ تعديلك على ' + label(c.collection) + ' ماتحفظش لأنه ' + why + ' — اتعرضت النسخة الحالية، راجعها وعدّل تاني لو لازم');
    });
    var dByKey = {};
    plan.docPlan.forEach(function (p) { dByKey[p.key] = p; });
    (body.docsApplied || []).forEach(function (a) {
      var p = dByKey[a.key];
      if (!p || a.op === 'ignored') return;
      if (a.data !== undefined) { setPath(DATA, a.key, clone(a.data)); S.baseDocs[a.key] = clone(a.data); if (!deepEqual(a.data, p.snap)) changedLocal = true; }
      else S.baseDocs[a.key] = p.snap;
      meta.docRevs[a.key] = a.rev;
    });
    (body.docConflicts || []).forEach(function (c) {
      if (c.current) { setPath(DATA, c.key, clone(c.current.data)); S.baseDocs[c.key] = clone(c.current.data); meta.docRevs[c.key] = c.current.rev; }
      changedLocal = true;
      notes.push('⚠️ إعدادات «' + c.key + '» اتعدّلت من مستخدم تاني في نفس الوقت — اتعرضت النسخة الحالية');
    });
    if (notes.length) toast(notes.slice(0, 3).join('\n'), 9000);
    if (changedLocal) afterRemoteChange();
  }

  // ------------------------------------------------------------ save
  async function sendPlan(DATA, plan) {
    var CHUNK = 2000;
    for (var i = 0; i < Math.max(plan.changes.length, 1); i += CHUNK) {
      var part = { changes: plan.changes.slice(i, i + CHUNK), docs: i === 0 ? plan.docs : [] };
      if (!part.changes.length && !part.docs.length) continue;
      var subPlan = { recPlan: plan.recPlan.slice(i, i + CHUNK), docPlan: i === 0 ? plan.docPlan : [] };
      var r = await window.WebSession.api('POST', '/api/sync', part);
      if (r.status === 200) { applyResults(DATA, subPlan, r.body); continue; }
      return r;
    }
    return { status: 200 };
  }

  /**
   * حذف مستخدم من شاشة المستخدمين القديمة = تعطيل على السيرفر (مفيش حذف نهائي — D-015).
   * بحذر: مستخدم واحد بس ناقص بالظبط ومش المستخدم الحالي — أي اختلاف تاني (استرجاع نسخة، seed، ...) مش بيعطّل حد.
   */
  async function saveUsersDeletions(DATA) {
    if (!S.baseUsers || !Array.isArray(DATA.users)) return;
    var ids = new Set(DATA.users.map(function (u) { return u && u.id; }));
    var removed = S.baseUsers.filter(function (u) { return !ids.has(u.id); });
    if (!removed.length) return;
    var me = window.WebSession.me();
    var safe = removed.length === 1 && DATA.users.length === S.baseUsers.length - 1 && (!me || removed[0].id !== me.id);
    if (safe) {
      var r = await window.WebSession.api('PATCH', '/api/users/' + removed[0].id, { active: false });
      if (!r.ok) toast('⚠️ تعذر تعطيل المستخدم: ' + ((r.body && r.body.message) || r.status));
    } else console.warn('[sync] قائمة المستخدمين اتغيّرت بشكل غير متوقع — مفيش مستخدمين اتعطلوا، والقائمة رجعت من السيرفر');
    DATA.users = await fetchUsers();
  }

  function scheduleRetry() {
    if (S.retryTimer) return;
    S.retryTimer = setTimeout(function () { S.retryTimer = null; var D = DATA_(); if (D) save(D); }, 5000);
  }

  async function saveOnce(DATA) {
    var plan = buildPlan(DATA);
    await saveUsersDeletions(DATA);
    if (!plan.changes.length && !plan.docs.length) return { ok: true, noop: true };
    var r;
    try { r = await sendPlan(DATA, plan); }
    catch (e) {
      if (String(e && e.message) === 'UNAUTHENTICATED') return { ok: false };
      r = { status: 0 };
    }
    if (r.status === 200) { if (S.offlineToastAt) { S.offlineToastAt = 0; toast('✅ الاتصال رجع واتحفظ كل حاجة'); } return { ok: true }; }
    if (r.status === 0 || r.status >= 500) {
      if (Date.now() - S.offlineToastAt > 60000) { S.offlineToastAt = Date.now(); toast('⚠️ مفيش اتصال بالسيرفر — التعديلات محفوظة عندك وهتتبعت أول ما الاتصال يرجع', 8000); }
      scheduleRetry();
      return { ok: false, offline: true };
    }
    var b = r.body || {};
    if (r.status === 403) {
      toast('🔒 ' + (b.message || 'مالكش صلاحية لبعض التعديلات') + ' — هنرجّع آخر نسخة من السيرفر', 8000);
      setTimeout(resync, 1500);
      return { ok: false, forbidden: true };
    }
    console.error('[sync] رفض السيرفر ' + r.status + ' ' + JSON.stringify(b).slice(0, 800));
    toast('تعذر الحفظ: ' + (Array.isArray(b.message) ? b.message[0] : b.message || r.status), 8000);
    return { ok: false };
  }

  /** حفظ متسلسل: لو جه طلب حفظ أثناء حفظ شغال، بيتعمل بعده مرة واحدة */
  function save(DATA) {
    if (S.saving) { S.again = true; return S.saving; }
    S.saving = (async function () {
      var res;
      do { S.again = false; res = await saveOnce(DATA_() || DATA); } while (S.again);
      return res;
    })().finally(function () { S.saving = null; });
    return S.saving;
  }

  /** إغلاق الصفحة: نفس الـ diff بـ keepalive (من غير انتظار رد) */
  function saveSync(DATA) {
    try {
      var plan = buildPlan(DATA);
      if (!plan.changes.length && !plan.docs.length) return { ok: true };
      var body = JSON.stringify({ changes: plan.changes, docs: plan.docs });
      fetch('/api/sync', { method: 'POST', keepalive: body.length < 60000, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + window.WebSession.token() }, body: body });
    } catch (e) {}
    return { ok: true };
  }

  function hasPendingLocalChanges(DATA) {
    var p = buildPlan(DATA);
    return p.changes.length > 0 || p.docs.length > 0;
  }

  async function resync() {
    var D = DATA_();
    try { if (D && !S.saving) await save(D); } catch (e) {}
    location.reload();
  }

  // ------------------------------------------------------------ realtime
  function afterRemoteChange() {
    try { if (typeof window.rebuildIndexes === 'function') window.rebuildIndexes(); } catch (e) {}
    S.renderPending = true;
    if (S.renderTimer) return;
    S.renderTimer = setTimeout(function tick() {
      S.renderTimer = null;
      if (!S.renderPending) return;
      var typing = false;
      try { typing = typeof window.isUserTypingOrEditing === 'function' && window.isUserTypingOrEditing(); } catch (e) {}
      if (typing) { S.renderTimer = setTimeout(tick, 1000); return; } // هيترسم لما يخلّص كتابة
      S.renderPending = false;
      try { if (typeof window.rerenderCurrentPage === 'function') window.rerenderCurrentPage(); else if (typeof window.render === 'function') window.render(); } catch (e) { console.warn('[sync] rerender', e); }
    }, 150);
  }

  function applyRemote(e) {
    var DATA = DATA_();
    if (!DATA || !S.meta) return false;
    if (e.seq <= S.seq) return false;
    S.seq = e.seq;
    if (e.kind === 'doc') {
      var key = e.collection;
      if ((S.meta.docRevs[key] || 0) >= e.rev) return false;
      var cur = getPath(DATA, key), bD = S.baseDocs[key];
      if (cur !== undefined && !deepEqual(cur, bD)) return false; // تعديل محلي لسه ماتحفظش → السيرفر هيدمج وقت الحفظ
      setPath(DATA, key, clone(e.data)); S.baseDocs[key] = clone(e.data); S.meta.docRevs[key] = e.rev;
      return true;
    }
    var path = e.collection, id = String(e.id);
    var base = S.base[path];
    if (!base) return false; // collection مش مقروءة
    var revs = S.meta.revs[path] || (S.meta.revs[path] = {});
    if ((revs[id] || 0) >= e.rev) return false; // تغييرنا إحنا (أو أقدم)
    var arr = getPath(DATA, path);
    if (!Array.isArray(arr)) { arr = []; setPath(DATA, path, arr); }
    var i = findIndex(arr, id), local = i >= 0 ? arr[i] : null, b = base.get(id);
    var dirty = local ? !deepEqual(local, b) : !!b; // اتعدّل/اتمسح محليًا ولسه ماتحفظش
    if (e.op === 'delete') {
      if (dirty) return false; // الحفظ هيطلع تعارض «اتمسح» ويتحل وقتها
      if (i >= 0) arr.splice(i, 1);
      base.delete(id); delete revs[id];
      return true;
    }
    if (!dirty) {
      if (i >= 0) arr[i] = clone(e.data); else arr.push(clone(e.data));
      base.set(id, clone(e.data)); revs[id] = e.rev;
      return true;
    }
    // فيه تعديل محلي: ناخد الحقول اللي محدش لمسها محليًا، ولو حد غيّر حقل إحنا كمان غيّرناه نسيب السيرفر يقرر وقت الحفظ
    var localFields = Object.keys(Object.assign({}, local || {}, b || {})).filter(function (k) { return !deepEqual(local && local[k], b && b[k]); });
    var clash = localFields.some(function (k) { return !deepEqual(e.data[k], b && b[k]); });
    if (clash) return false;
    var merged = clone(e.data);
    localFields.forEach(function (k) { if (local && local[k] !== undefined) merged[k] = clone(local[k]); else delete merged[k]; });
    if (i >= 0) arr[i] = merged; else arr.push(merged);
    base.set(id, clone(e.data)); revs[id] = e.rev;
    return true;
  }

  function onChanges(list) {
    var any = false;
    list.forEach(function (e) { if (applyRemote(e)) any = true; });
    if (any) afterRemoteChange();
  }

  async function catchUp() {
    for (var guard = 0; guard < 50; guard++) {
      var r = await window.WebSession.api('GET', '/api/changes?since=' + S.seq + '&limit=1000');
      if (!r.ok) return;
      onChanges(r.body.changes);
      if (r.body.seq > S.seq) S.seq = r.body.seq;
      if (!r.body.hasMore) return;
    }
    resync(); // متأخر جدًا — أنضف نعيد التحميل
  }

  function connect() {
    if (S.socket || typeof window.io !== 'function') return;
    var sock = window.io(location.origin, { path: '/api/stream', transports: ['websocket', 'polling'], auth: function (cb) { cb({ token: window.WebSession.token() }); } });
    S.socket = sock;
    var first = true;
    sock.on('ready', function () { if (!first) catchUp(); first = false; });
    sock.on('change', function (e) { onChanges([e]); });
    sock.on('resync', function () { toast('🔄 صلاحياتك اتغيّرت — بنحدّث البيانات', 4000); setTimeout(resync, 800); });
    sock.on('reauth_required', function () { window.WebSession.refresh().then(function (ok) { if (ok) sock.emit('reauth', { token: window.WebSession.token() }); }); });
    sock.on('auth_error', function () { window.WebSession.refresh().then(function (ok) { if (!ok) window.WebSession.showLogin('انتهت الجلسة — سجّل الدخول مرة أخرى'); }); });
    window.WebSession.onToken(function (t) { if (sock.connected) sock.emit('reauth', { token: t }); });
  }

  window.WebSync = {
    bootstrap: bootstrap, save: save, saveSync: saveSync, connect: connect, resync: resync, catchUp: catchUp,
    fetchUsers: fetchUsers, hasPendingLocalChanges: hasPendingLocalChanges,
    unknownKeys: unknownKeys,
    _state: S, _buildPlan: buildPlan, _applyRemote: applyRemote, _deepEqual: deepEqual,
  };
})();
