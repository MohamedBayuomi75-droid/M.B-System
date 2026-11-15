/* =========================================================
   project-links.js — ربط كل السجلات بالمشروع بالمعرّف (projectId) مع بقاء اسم المشروع للعرض
   projLinkAll(): يملأ projectId للسجلات اللي عندها اسم مشروع مطابق لمشروع مسجّل (اسم مطابق/مطابق بعد التطبيع وفريد)،
                  ويصحّح اسم أي سجل مربوط لو اسم المشروع اتغيّر (نشر تغيير الاسم).
   projUnmatchedReport(): أسماء مشاريع مكتوبة في سجلات ومالهاش مشروع مسجّل.
   ========================================================= */

const PROJECT_LINK_SOURCES = [
  { label: 'عمال', get: () => DATA.workers },        { label: 'معدات', get: () => DATA.equipment },
  { label: 'سائقون', get: () => DATA.drivers },      { label: 'موظفون', get: () => DATA.employees },
  { label: 'مشرفون', get: () => DATA.supervisors }, { label: 'مصاريف', get: () => DATA.expenses },
  { label: 'تكاليف', get: () => DATA.costs },        { label: 'يوميات عمال', get: () => DATA.workerAttendance },
  { label: 'يوميات معدات', get: () => DATA.equipmentDaily }, { label: 'وقود', get: () => DATA.fuelLogs },
  { label: 'صيانة', get: () => DATA.equipmentLogs }, { label: 'يومية مشروع', get: () => DATA.projectDaily },
  { label: 'فواتير موردين', get: () => DATA.ledger && DATA.ledger.invoices },
  { label: 'حركات مخازن', get: () => DATA.warehouses && DATA.warehouses.movements },
  { label: 'نقل موارد (من)', get: () => DATA.resourceTransfers, field: 'fromProject', idField: 'fromProjectId' },
  { label: 'نقل موارد (إلى)', get: () => DATA.resourceTransfers, field: 'toProject', idField: 'toProjectId' }
];

function __plNorm(s){ return (typeof clNormName === 'function') ? clNormName(s) : String(s || '').trim().toLowerCase(); }

function __plIndex(){
  const byId = {}, byName = {}, byNorm = {};
  (DATA.projects || []).forEach(function(p){
    if(!p || !p.id) return;
    byId[p.id] = p;
    const n = String(p.name || '').trim(); if(n) byName[n] = byName[n] ? 'dup' : p;
    const k = __plNorm(p.name); if(k) byNorm[k] = byNorm[k] ? 'dup' : p;
  });
  return { byId: byId, byName: byName, byNorm: byNorm };
}

function projLinkAll(){
  const idx = __plIndex();
  const rep = { linked: 0, renamed: 0, unmatched: {}, total: 0 };
  PROJECT_LINK_SOURCES.forEach(function(src){
    const list = src.get(); if(!Array.isArray(list)) return;
    const f = src.field || 'project', fid = src.idField || 'projectId';
    list.forEach(function(r){
      if(!r) return;
      const name = String(r[f] || '').trim();
      if(r[fid] && idx.byId[r[fid]]){
        const p = idx.byId[r[fid]];
        if(String(p.name || '').trim() !== name){ r[f] = p.name; rep.renamed++; }      // نشر تغيير الاسم
        return;
      }
      if(!name) return;
      rep.total++;
      let p = idx.byName[name];
      if(!p || p === 'dup') p = idx.byNorm[__plNorm(name)];
      if(p && p !== 'dup'){ r[fid] = p.id; rep.linked++; }
      else rep.unmatched[name] = (rep.unmatched[name] || 0) + 1;
    });
  });
  return rep;
}

function projUnmatchedReport(){
  const idx = __plIndex(), out = {};
  PROJECT_LINK_SOURCES.forEach(function(src){
    const list = src.get(); if(!Array.isArray(list)) return;
    const f = src.field || 'project', fid = src.idField || 'projectId';
    list.forEach(function(r){
      if(!r) return;
      const name = String(r[f] || '').trim();
      if(!name || (r[fid] && idx.byId[r[fid]])) return;
      if(idx.byName[name] && idx.byName[name] !== 'dup') return;
      out[name] = (out[name] || 0) + 1;
    });
  });
  return out;
}

/** ترحيل 9: لقطة احتياطية + ربط بالمعرّف + تقرير الأسماء غير المطابقة */
function projMigrateLinks(){
  try{ if(window.desktopApi && window.desktopApi.snapshotData) window.desktopApi.snapshotData('before-project-links'); }catch(_e){}
  const rep = projLinkAll();
  DATA.projectLinksLog = { at: new Date().toISOString(), linked: rep.linked, unmatched: rep.unmatched };
  return rep;
}
