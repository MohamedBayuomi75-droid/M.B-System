let archiveFilters = {
  level: 'kinds', // kinds | sections | people | folder | trash
  kind: 'worker',
  sectionId: '',
  folderKey: '',
  q: ''
};

const ARCHIVE_KIND_BOARDS = [
  { id:'employee', label:'الموظفين', icon:'👔' },
  { id:'supervisor', label:'المشرفون', icon:'👷' },
  { id:'worker', label:'العمال', icon:'🧑‍🔧' },
  { id:'driver', label:'السائقون', icon:'🧑‍🚒' },
  { id:'equipment', label:'المعدات والمركبات', icon:'🚜' },
  { id:'project', label:'المشاريع', icon:'🏗️' }
];

function archiveKindLabel(k){
  const f = ARCHIVE_KIND_BOARDS.find(x=>x.id===k);
  return f ? f.label : k;
}

function archiveEntityDeptId(ent){
  if(!ent) return '';
  return ent.departmentId || ent.categoryId || ent.sectionId || '';
}

function archivePeopleOfKind(kind){
  if(kind==='employee') return (DATA.employees||[]).slice();
  if(kind==='worker') return (DATA.workers||[]).slice();
  if(kind==='supervisor') return (DATA.supervisors||[]).slice();
  if(kind==='driver') return (DATA.drivers||[]).slice();
  if(kind==='equipment') return (DATA.equipment||[]).slice();
  if(kind==='project') return (DATA.projects||[]).slice();
  return [];
}

function archiveFolderCountFor(kind, id){
  const folders = typeof collectArchiveFolders==='function' ? collectArchiveFolders() : [];
  const f = folders.find(x=>x.kind===kind && x.id===id);
  return f ? (f.count||0) : 0;
}

function archiveTotalFilesForKind(kind){
  const folders = typeof collectArchiveFolders==='function' ? collectArchiveFolders() : [];
  return folders.filter(f=>f.kind===kind).reduce((s,f)=>s+(f.count||0),0);
}

function ensureArchiveTrash(){
  if(!Array.isArray(DATA.archiveTrash)) DATA.archiveTrash = [];
  return DATA.archiveTrash;
}

function renderArchivePage(){
  /* روابط سريعة لأرشيفات الأقسام */
  const _archLinks = '<div class="btn-row" style="margin-bottom:12px;flex-wrap:wrap;gap:6px;">' +
    '<button type="button" class="btn btn-outline btn-sm" onclick="goToPage(\'archive\')">أرشيف الموارد</button>' +
    '<button type="button" class="btn btn-outline btn-sm" onclick="goToPage(\'ledger.archive\')">أرشيف الموردين</button>' +
    '<button type="button" class="btn btn-outline btn-sm" onclick="goToPage(\'clients.archive\')">أرشيف العملاء</button>' +
  '</div>';

  const lv = archiveFilters.level || 'kinds';
  if(lv==='folder' && archiveFilters.folderKey){
    return renderArchiveFolderDetail(archiveFilters.folderKey);
  }
  if(lv==='trash') return renderArchiveTrash();
  if(lv==='resigned'){ archiveFilters.level = 'kinds'; return renderArchiveKinds(); }
  if(lv==='people') return renderArchivePeople();
  if(lv==='sections') return renderArchiveSections();
  return renderArchiveKinds();
}
function renderArchiveKinds(){
  const trashCnt = ensureArchiveTrash().length;
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <h2 class="page-title" style="margin:0;">الأرشيف</h2>
          <p class="page-sub" style="margin:4px 0 0;">اختر لوحة للدخول إلى الأقسام ثم مجلدات الأشخاص</p>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="btnArchAddDoc" ${readOnlyMode?'disabled':''}>+ إرفاق مستند</button>
        </div>
      </div>
      <div class="board-grid exp-kind-boards arch-kind-boards">
        ${ARCHIVE_KIND_BOARDS.map(t=>{
          const people = archivePeopleOfKind(t.id).length;
          const files = archiveTotalFilesForKind(t.id);
          return `<button type="button" class="board-card arch-kind-board" data-arch-kind="${t.id}">
            <div class="board-card-icon">${t.icon}</div>
            <div class="board-card-title">${escapeHtml(t.label)}</div>
            <div class="board-card-meta">
              <span>${people} مجلد</span>
              <span class="board-card-amt">${files} مرفق</span>
            </div>
          </button>`;
        }).join('')}
        <button type="button" class="board-card arch-kind-board" id="btnArchOpenTrash" data-arch-special="trash">
          <div class="board-card-icon">🗑️</div>
          <div class="board-card-title">سلة المهملات</div>
          <div class="board-card-meta">
            <span>${trashCnt} عنصر</span>
            <span class="board-card-amt">قابل للاسترجاع</span>
          </div>
        </button>

      </div>
    </div>`;
}

function renderArchiveSections(){
  const kind = archiveFilters.kind || 'worker';
  // المشاريع بدون أقسام — مجلد لكل مشروع مباشرة
  if(kind==='project'){
    archiveFilters.level = 'people';
    archiveFilters.sectionId = '';
    return renderArchivePeople();
  }

  const deps = typeof departmentsForKind==='function' ? departmentsForKind(kind) : (DATA.departments||[]).filter(d=>!d.kind||d.kind===kind);
  const people = archivePeopleOfKind(kind);
  const noDept = people.filter(p=>!archiveEntityDeptId(p));
  const boards = deps.map(d=>{
    const cnt = people.filter(p=>archiveEntityDeptId(p)===d.id).length;
    const files = people.filter(p=>archiveEntityDeptId(p)===d.id).reduce((s,p)=>s+archiveFolderCountFor(kind,p.id),0);
    return { id:d.id, name:d.name||'قسم', count:cnt, files };
  });
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <button type="button" class="btn btn-outline btn-sm" id="btnArchBackKinds">← كل الأرشيف</button>
          <h2 class="page-title" style="margin:10px 0 0;">${escapeHtml(archiveKindLabel(kind))}</h2>
          <p class="page-sub" style="margin:4px 0 0;">أقسام مربوطة بصفحات الأشخاص والمعدات — اضغط لوحة للدخول</p>
        </div>
        <div class="btn-row">
          <button class="btn btn-outline btn-sm" id="btnArchAddSec" ${readOnlyMode?'disabled':''}>إضافة قسم</button>
          <button class="btn btn-outline btn-sm" id="btnArchRenSec" ${readOnlyMode?'disabled':''}>تعديل قسم</button>
          <button class="btn btn-outline btn-sm" id="btnArchDelSec" ${readOnlyMode?'disabled':''}>حذف قسم</button>
          <button class="btn btn-primary" id="btnArchAddDoc" ${readOnlyMode?'disabled':''}>+ إرفاق مستند</button>
        </div>
      </div>
      <div class="board-grid exp-sec-boards">
        <button type="button" class="board-card arch-sec-board" data-arch-sec="">
          <div class="board-card-icon">📂</div>
          <div class="board-card-title">الكل</div>
          <div class="board-card-meta"><span>${people.length} مجلد</span><span>${people.reduce((s,p)=>s+archiveFolderCountFor(kind,p.id),0)} مرفق</span></div>
        </button>
        <button type="button" class="board-card arch-sec-board" data-arch-sec="__none__">
          <div class="board-card-icon">📭</div>
          <div class="board-card-title">بدون قسم</div>
          <div class="board-card-meta"><span>${noDept.length} مجلد</span><span>${noDept.reduce((s,p)=>s+archiveFolderCountFor(kind,p.id),0)} مرفق</span></div>
        </button>
        ${boards.map(b=>`
          <button type="button" class="board-card arch-sec-board" data-arch-sec="${escapeHtml(b.id)}">
            <div class="board-card-icon">📁</div>
            <div class="board-card-title">${escapeHtml(b.name)}</div>
            <div class="board-card-meta"><span>${b.count} مجلد</span><span>${b.files} مرفق</span></div>
          </button>`).join('')}
      </div>
    </div>`;
}

function renderArchivePeople(){
  const kind = archiveFilters.kind || 'worker';
  const sec = archiveFilters.sectionId || '';
  let people = archivePeopleOfKind(kind);
  if(sec==='__none__') people = people.filter(p=>!archiveEntityDeptId(p));
  else if(sec) people = people.filter(p=>archiveEntityDeptId(p)===sec);
  if(archiveFilters.q){
    const q = archiveFilters.q.trim().toLowerCase();
    people = people.filter(p=>smartMatch(p.name, q)||smartMatch(p.code, q));
  }
  people = people.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ar'));
  const secName = sec==='__none__' ? 'بدون قسم' : (sec ? (typeof departmentName==='function'?departmentName(sec):sec) : 'الكل');
  const folders = typeof collectArchiveFolders==='function' ? collectArchiveFolders() : [];

  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <button type="button" class="btn btn-outline btn-sm" id="btnArchBackSecs">← الأقسام</button>
          <h2 class="page-title" style="margin:10px 0 0;">${escapeHtml(archiveKindLabel(kind))} · ${escapeHtml(secName)}</h2>
          <p class="page-sub" style="margin:4px 0 0;">${kind==='project'?'مجلدات مستندات المشروع (تكاليف · مصاريف · عمالة · فترة العمل)':'اضغط فتح المجلد لإدارة المرفقات'}</p>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="btnArchAddDoc" ${readOnlyMode?'disabled':''}>+ إرفاق مستند</button>
        </div>
      </div>
      <div class="filters-bar" style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <input type="search" id="archQ" class="input" placeholder="بحث بالاسم أو الكود..." value="${escapeHtml(archiveFilters.q||'')}" style="min-width:200px;flex:1;">
      </div>
      <div class="board-grid arch-folder-boards" style="margin-top:4px;">
        ${people.length? people.map(p=>{
          const key = typeof archiveFolderKey==='function'?archiveFolderKey(kind,p.id):(kind+'_'+p.id);
          const f = folders.find(x=>x.kind===kind && x.id===p.id);
          const cnt = f ? (f.count||0) : archiveFolderCountFor(kind,p.id);
          const dep = typeof departmentName==='function'?departmentName(archiveEntityDeptId(p)):'';
          return `<div class="board-card arch-folder-card">
            <button type="button" class="btn-arch-open-folder" data-key="${escapeHtml(key)}" style="all:unset;cursor:pointer;display:block;width:100%;text-align:center;">
              <div class="board-card-icon" style="font-size:42px;line-height:1;margin-bottom:8px;">🗂️</div>
              <div class="board-card-title">${escapeHtml(p.name||'—')}</div>
              <div class="board-card-meta" style="justify-content:center;flex-wrap:wrap;gap:6px;">
                <span>${escapeHtml(p.code||'—')}</span>
                ${dep?`<span>${escapeHtml(dep)}</span>`:''}
              </div>
              <div class="board-card-amt" style="margin-top:8px;">${cnt} مرفق</div>
            </button>
            <div style="margin-top:10px;display:flex;justify-content:center;gap:6px;flex-wrap:wrap;">
              <button type="button" class="btn btn-primary btn-sm btn-arch-open-folder" data-key="${escapeHtml(key)}">فتح</button>
              <button type="button" class="btn btn-outline btn-sm btn-arch-export-folder" data-kind="${escapeHtml(kind)}" data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name||'')}">تصدير</button>
            </div>
          </div>`;
        }).join('') : '<div style="grid-column:1/-1;text-align:center;color:var(--ink-soft);padding:36px;">لا مجلدات في هذا القسم</div>'}
      </div>
    </div>`;
}

function renderArchiveTrash(){
  const trash = ensureArchiveTrash();
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <button type="button" class="btn btn-outline btn-sm" id="btnArchBackKinds">← كل الأرشيف</button>
          <h2 class="page-title" style="margin:10px 0 0;">🗑️ سلة المهملات</h2>
          <p class="page-sub" style="margin:4px 0 0;">مجلدات الأشخاص المنقولة بعد حذف القسم — يمكن استرجاعها</p>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>النوع</th><th>الكود</th><th>الاسم</th><th>القسم السابق</th><th>المرفقات</th><th>تاريخ الحذف</th><th></th></tr></thead>
          <tbody>
            ${trash.length? trash.map((t,idx)=>`
              <tr>
                <td>${escapeHtml(archiveKindLabel(t.kind))}</td>
                <td>${escapeHtml(t.code||'—')}</td>
                <td><strong>${escapeHtml(t.name||'—')}</strong></td>
                <td>${escapeHtml(t.sectionName||'—')}</td>
                <td>${(t.attachments||[]).length}</td>
                <td>${fmtDate(t.deletedAt||'')}</td>
                <td style="white-space:nowrap;">
                  <button class="btn btn-primary btn-sm btn-arch-restore" data-idx="${idx}">استرجاع</button>
                  <button class="btn btn-outline btn-sm btn-arch-purge" style="color:#b91c1c;" data-idx="${idx}" ${readOnlyMode?'disabled':''}>حذف نهائي</button>
                </td>
              </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:28px;">سلة المهملات فارغة</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderArchiveFolderDetail(folderKey){
  const folders = typeof collectArchiveFolders==='function' ? collectArchiveFolders() : [];
  const f = folders.find(x=>x.key===folderKey);
  if(!f){
    archiveFilters.level = 'kinds';
    archiveFilters.folderKey = '';
    return renderArchivePage();
  }
  const atts = f.attachments||[];
  const isProject = f.kind==='project';
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <button type="button" class="btn btn-outline btn-sm" id="btnArchBackPeople">← المجلدات</button>
          <h2 class="page-title" style="margin:10px 0 0;">📁 ${escapeHtml(f.name||'')}</h2>
          <p class="page-sub" style="margin:4px 0 0;">كود: ${escapeHtml(f.code||'—')} · ${atts.length} مرفق · ${escapeHtml(archiveKindLabel(f.kind))}</p>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="btnArchAddFile" data-kind="${escapeHtml(f.kind)}" data-id="${escapeHtml(f.id)}" ${readOnlyMode?'disabled':''}>+ إرفاق مستند</button>
          <button class="btn btn-outline" id="btnArchPersonPdf" data-kind="${escapeHtml(f.kind)}" data-id="${escapeHtml(f.id)}">تصدير المستندات pdf</button>
          <button class="btn btn-outline" id="btnArchExportFolder" data-kind="${escapeHtml(f.kind)}" data-id="${escapeHtml(f.id)}" data-name="${escapeHtml(f.name||'')}">تصدير المجلد</button>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>اسم الملف</th><th>المصدر</th><th>تاريخ الإضافة</th><th></th></tr></thead>
          <tbody>
            ${atts.length? atts.map((a,idx)=>`
              <tr>
                <td>${escapeHtml(a.name||a.storedName||'ملف')}</td>
                <td>${escapeHtml(a.fromDoc||'مرفق مباشر')}</td>
                <td>${fmtDate(a.addedAt||a.date||'')}</td>
                <td style="white-space:nowrap;">
                  <button class="btn btn-outline btn-sm btn-arch-open-file" data-path="${escapeHtml(a.path||'')}">فتح</button>
                  <button class="btn btn-outline btn-sm btn-arch-print-file" data-path="${escapeHtml(a.path||'')}" data-name="${escapeHtml(a.name||a.storedName||'مرفق')}" data-owner="${escapeHtml(f.name||'')}">طباعة PDF</button>
                  <button class="btn btn-outline btn-sm btn-arch-replace" data-kind="${escapeHtml(f.kind)}" data-id="${escapeHtml(f.id)}" data-idx="${idx}" data-doc="${escapeHtml(a.docId||'')}" ${readOnlyMode?'disabled':''}>استبدال</button>
                  <button class="btn btn-outline btn-sm btn-arch-del" style="color:#b91c1c;border-color:#fca5a5;" data-kind="${escapeHtml(f.kind)}" data-id="${escapeHtml(f.id)}" data-idx="${idx}" data-doc="${escapeHtml(a.docId||'')}" data-path="${escapeHtml(a.path||'')}" ${readOnlyMode?'disabled':''}>🗑️ حذف</button>
                </td>
              </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);padding:28px;">المجلد فارغ — أرفق ملفاً</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

function getArchiveEntity(kind, id){
  if(kind==='employee') return getEmployee(id);
  if(kind==='worker') return getWorker(id);
  if(kind==='supervisor') return getSupervisor(id);
  if(kind==='driver') return typeof getDriver==='function'?getDriver(id):(DATA.drivers||[]).find(d=>d.id===id);
  if(kind==='equipment') return getEquipment(id);
  if(kind==='project') return (DATA.projects||[]).find(p=>p&&p.id===id)||null;
  return null;
}

function movePersonFolderToTrash(kind, personId, sectionName){
  const folders = typeof collectArchiveFolders==='function' ? collectArchiveFolders() : [];
  const f = folders.find(x=>x.kind===kind && x.id===personId);
  const ent = getArchiveEntity(kind, personId);
  const entry = {
    id: uid(),
    kind,
    personId,
    name: (ent&&ent.name)||(f&&f.name)||personId,
    code: (ent&&ent.code)||(f&&f.code)||'',
    sectionName: sectionName||'',
    attachments: ((f&&f.attachments)||[]).map(a=>Object.assign({},a)),
    deletedAt: new Date().toISOString()
  };
  ensureArchiveTrash().push(entry);
  // تفريغ مرفقات الشخص من العرض النشط (تبقى في السلة)
  if(ent){
    ent.attachments = [];
  }
  DATA.personDocuments = (DATA.personDocuments||[]).filter(d=>!(d && d.personId===personId && (!d.kind || d.kind===kind)));
}


function archNavigateBack(){
  const lv = archiveFilters.level || 'kinds';
  if(lv==='folder'){
    archiveFilters.level = 'people';
    archiveFilters.folderKey = '';
  } else if(lv==='people'){
    archiveFilters.folderKey = '';
    // المشاريع بدون مستوى أقسام
    if((archiveFilters.kind||'')==='project'){
      archiveFilters.level = 'kinds';
      archiveFilters.sectionId = '';
    } else {
      archiveFilters.level = 'sections';
      archiveFilters.sectionId = '';
    }
  } else if(lv==='sections' || lv==='trash' || lv==='resigned'){
    archiveFilters.level = 'kinds';
    archiveFilters.folderKey = '';
    archiveFilters.sectionId = '';
  } else {
    archiveFilters.level = 'kinds';
    archiveFilters.folderKey = '';
    archiveFilters.sectionId = '';
  }
  if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
}

function initArchiveEvents(){
  // أزرار الرجوع — مستوى واحد للخلف دائماً
  ['btnArchBackKinds','btnArchBackSecs','btnArchBackPeople','btnArchBack'].forEach(id=>{
    const el = document.getElementById(id);
    if(el && !el.dataset.archBackBound){
      el.dataset.archBackBound = '1';
      el.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); archNavigateBack(); });
    }
  });

  // لوحات الأنواع
  document.querySelectorAll('.arch-kind-board').forEach(b=> b.addEventListener('click', ()=>{
    archiveFilters.kind = b.getAttribute('data-arch-kind');
    archiveFilters.level = 'sections';
    archiveFilters.sectionId = '';
    archiveFilters.folderKey = '';
    rerenderCurrentPage();
  }));
  // لوحات الأقسام
  document.querySelectorAll('.arch-sec-board').forEach(b=> b.addEventListener('click', ()=>{
    archiveFilters.sectionId = b.getAttribute('data-arch-sec')||'';
    archiveFilters.level = 'people';
    archiveFilters.folderKey = '';
    rerenderCurrentPage();
  }));

  document.getElementById('btnArchOpenTrash')?.addEventListener('click', ()=>{
    archiveFilters.level = 'trash';
    rerenderCurrentPage();
  });

  const aq = document.getElementById('archQ');
  if(aq) aq.addEventListener('input', ()=>{
    archiveFilters.q = aq.value||'';
    clearTimeout(window.__archQT);
    window.__archQT = setTimeout(()=>rerenderCurrentPage(), 250);
  });

  document.getElementById('btnArchAddDoc')?.addEventListener('click', ()=>{
    if(typeof openDocModal==='function') openDocModal({ kind: archiveFilters.kind||'worker' });
  });
  document.getElementById('btnArchAddFile')?.addEventListener('click', (e)=>{
    const kind = e.currentTarget.getAttribute('data-kind');
    const id = e.currentTarget.getAttribute('data-id');
    if(typeof openDocModal==='function') openDocModal({ kind, personId: id });
  });

  // إضافة / تعديل / حذف قسم
  document.getElementById('btnArchAddSec')?.addEventListener('click', ()=>{
    const name = prompt('اسم القسم الجديد:');
    if(!name || !name.trim()) return;
    const kind = archiveFilters.kind||'worker';
    if(typeof ensureDepartmentSaved==='function'){
      ensureDepartmentSaved(name.trim(), kind);
    } else {
      DATA.departments = DATA.departments||[];
      DATA.departments.push({ id: uid(), name: name.trim(), kind });
    }
    saveData(true); showToast('تمت إضافة القسم — يظهر في صفحة الأقسام والأرشيف وصفحة '+(archiveKindLabel(kind)||''));
    rerenderCurrentPage();
  });
  document.getElementById('btnArchRenSec')?.addEventListener('click', ()=>{
    const kind = archiveFilters.kind||'worker';
    const deps = typeof departmentsForKind==='function'?departmentsForKind(kind):(DATA.departments||[]);
    if(!deps.length){ showToast('لا أقسام'); return; }
    const list = deps.map((d,i)=>(i+1)+') '+d.name).join('\\n');
    const pick = prompt('اختر رقم القسم للتعديل:\\n'+list);
    const idx = parseInt(pick,10)-1;
    if(isNaN(idx)||!deps[idx]) return;
    const nn = prompt('الاسم الجديد:', deps[idx].name||'');
    if(!nn || !nn.trim()) return;
    deps[idx].name = nn.trim();
    saveData(true); showToast('تم التعديل');
    rerenderCurrentPage();
  });
  document.getElementById('btnArchDelSec')?.addEventListener('click', ()=>{
    const kind = archiveFilters.kind||'worker';
    const deps = typeof departmentsForKind==='function'?departmentsForKind(kind):(DATA.departments||[]);
    if(!deps.length){ showToast('لا أقسام'); return; }
    const list = deps.map((d,i)=>(i+1)+') '+d.name).join('\\n');
    const pick = prompt('اختر رقم القسم للحذف:\\n'+list+'\\n\\nمجلدات الأشخاص ستنتقل لسلة المهملات');
    const idx = parseInt(pick,10)-1;
    if(isNaN(idx)||!deps[idx]) return;
    const dep = deps[idx];
    confirmDelete('حذف قسم «'+dep.name+'»؟ مجلدات الأشخاص ستنتقل لسلة المهملات.').then(ok=>{ if(!ok) return;
      const people = archivePeopleOfKind(kind).filter(p=>archiveEntityDeptId(p)===dep.id);
      people.forEach(p=> movePersonFolderToTrash(kind, p.id, dep.name));
      // فك ربط الأشخاص بالقسم
      people.forEach(p=>{ p.departmentId=''; p.categoryId=''; });
      DATA.departments = (DATA.departments||[]).filter(d=>d.id!==dep.id);
      saveData(true);
      showToast('تم حذف القسم · نُقلت '+people.length+' مجلدات لسلة المهملات');
      archiveFilters.level = 'sections';
      rerenderCurrentPage();
    });
  });

  // فتح مجلد
  document.querySelectorAll('.btn-arch-open-folder').forEach(b=> b.addEventListener('click', ()=>{
    archiveFilters.folderKey = b.getAttribute('data-key');
    archiveFilters.level = 'folder';
    rerenderCurrentPage();
  }));

  // تصدير / حذف مجلد من القائمة
  document.querySelectorAll('.btn-arch-export-folder').forEach(b=> b.addEventListener('click', async ()=>{
    if(typeof exportArchiveFolder==='function')
      await exportArchiveFolder(b.getAttribute('data-kind'), b.getAttribute('data-id'), b.getAttribute('data-name')||'');
  }));
  document.querySelectorAll('.btn-arch-del-folder').forEach(b=> b.addEventListener('click', async (ev)=>{
    ev.preventDefault();
    ev.stopPropagation();
    const kind = b.getAttribute('data-kind');
    const id = b.getAttribute('data-id');
    const name = b.getAttribute('data-name')||'';
    confirmDelete('نقل مجلد «'+name+'» إلى سلة المهملات؟').then(ok=>{ if(!ok) return;
      try{
      if(typeof movePersonFolderToTrash==='function'){
        movePersonFolderToTrash(kind, id, 'حذف يدوي');
      } else if(typeof archiveFolderToTrashOnEntityDelete==='function'){
        const ent = getArchiveEntity(kind, id);
        archiveFolderToTrashOnEntityDelete(kind, id, name, ent&&ent.code);
        if(ent) ent.attachments = [];
        DATA.personDocuments = (DATA.personDocuments||[]).filter(d=>!(d && d.personId===id && (!d.kind || d.kind===kind)));
      } else {
        const folders = typeof collectArchiveFolders==='function' ? collectArchiveFolders() : [];
        const f = folders.find(x=>x.kind===kind && x.id===id);
        const ent = getArchiveEntity(kind, id);
        if(ent) ent.attachments = [];
        DATA.personDocuments = (DATA.personDocuments||[]).filter(d=>!(d && d.personId===id && (!d.kind || d.kind===kind)));
      }
      saveData(true);
      showToast('تم نقل المجلد لسلة المهملات');
      archiveFilters.folderKey = '';
      archiveFilters.level = 'people';
      rerenderCurrentPage();
      }catch(e){
      console.error(e);
      showToast('فشل حذف المجلد: '+(e.message||e));
      }
    });
  }));

  // داخل المجلد
  document.querySelectorAll('.btn-arch-open-file').forEach(b=> b.addEventListener('click', async ()=>{
    const p = b.getAttribute('data-path');
    if(p && window.desktopApi && window.desktopApi.openAttachment) await window.desktopApi.openAttachment(p);
    else showToast('المسار غير متاح');
  }));
  document.querySelectorAll('.btn-arch-print-file').forEach(b=> b.addEventListener('click', async ()=>{
    // طباعة مرفق واحد عبر تصدير PDF بسيط
    showToast('افتح الملف للطباعة من العارض');
    const p = b.getAttribute('data-path');
    if(p && window.desktopApi && window.desktopApi.openAttachment) await window.desktopApi.openAttachment(p);
  }));
  document.querySelectorAll('.btn-arch-del').forEach(b=> b.addEventListener('click', async ()=>{
    confirmDelete('حذف هذا المرفق؟').then(async ok=>{ if(!ok) return;
      const kind = b.getAttribute('data-kind');
      const id = b.getAttribute('data-id');
      const idx = parseInt(b.getAttribute('data-idx'),10);
      const docId = b.getAttribute('data-doc')||'';
      const path = b.getAttribute('data-path')||'';
      if(path && window.desktopApi && window.desktopApi.deleteAttachment){
      try{ await window.desktopApi.deleteAttachment(path); }catch(e){}
      }
      const matchAtt = (a,j)=> !!(a && ((path && a.path===path) || (!path && j===idx) || (path && a.storedName && a.storedName===path)));
      const removeFrom = (arr)=>{
      if(!Array.isArray(arr)) return;
      for(let i=arr.length-1;i>=0;i--){ if(matchAtt(arr[i],i)) arr.splice(i,1); }
      };
      // 1) مرفقات الكيان
      const ent = typeof getArchiveEntity==='function' ? getArchiveEntity(kind, id) : null;
      if(ent) removeFrom(ent.attachments);
      // 2) كل personDocuments المرتبطة
      DATA.personDocuments = DATA.personDocuments || [];
      if(docId){
      const doc = DATA.personDocuments.find(d=>d && d.id===docId);
      if(doc) removeFrom(doc.attachments);
      }
      DATA.personDocuments.forEach(d=>{
        if(d && d.personId===id) removeFrom(d.attachments);
      });
      // 3) احذف سجلات المستند الفارغة (بدون ملفات) لنفس الشخص
      DATA.personDocuments = DATA.personDocuments.filter(d=>{
        if(!d || d.personId!==id) return true;
        const files = (d.attachments||[]).filter(a=>a && (a.path||a.storedName||a.dataUrl));
        d.attachments = files;
        return files.length > 0;
      });
      // 4) نظّف أي نسخة مكررة في draft/form إن وُجدت
      try{
        if(window.__formDrafts){
          Object.keys(window.__formDrafts).forEach(k=>{
            const d = window.__formDrafts[k];
            if(d && Array.isArray(d.attachments)) removeFrom(d.attachments);
          });
        }
      }catch(_e){}
      if(typeof rebuildIndexes==='function') try{ rebuildIndexes(); }catch(_e){}
      saveData(true);
      showToast('تم حذف المرفق من الأرشيف والعرض');
      rerenderCurrentPage();
    });
  }));
  document.querySelectorAll('.btn-arch-replace').forEach(b=> b.addEventListener('click', async ()=>{
    const kind = b.getAttribute('data-kind');
    const id = b.getAttribute('data-id');
    const idx = parseInt(b.getAttribute('data-idx'),10);
    const docId = b.getAttribute('data-doc')||'';
    if(!window.desktopApi || !window.desktopApi.pickAttachments){ showToast('غير متاح'); return; }
    try{
      const res = await window.desktopApi.pickAttachments(kind+'_'+id, 'استبدال');
      if(!res || res.canceled || !(res.files||[]).length) return;
      const f0 = res.files[0];
      const newAtt = { id:uid(), name:f0.name||'ملف', path:f0.path||'', storedName:f0.storedName||f0.name||'', addedAt:new Date().toISOString() };
      const ent = getArchiveEntity(kind, id);
      if(ent && Array.isArray(ent.attachments) && ent.attachments[idx]){
        const oldPath = ent.attachments[idx].path||'';
        if(oldPath && window.desktopApi.deleteAttachment) try{ await window.desktopApi.deleteAttachment(oldPath); }catch(e){}
        ent.attachments[idx] = Object.assign({}, ent.attachments[idx], newAtt);
      }
      if(docId){
        const doc = (DATA.personDocuments||[]).find(d=>d.id===docId);
        if(doc && Array.isArray(doc.attachments) && doc.attachments[idx]){
          doc.attachments[idx] = Object.assign({}, doc.attachments[idx], newAtt);
        }
      }
      saveData(true); showToast('تم الاستبدال');
      rerenderCurrentPage();
    }catch(e){ console.error(e); showToast('فشل الاستبدال'); }
  }));

  document.getElementById('btnArchPersonPdf')?.addEventListener('click', async ()=>{
    const k = document.getElementById('btnArchPersonPdf').getAttribute('data-kind');
    const id = document.getElementById('btnArchPersonPdf').getAttribute('data-id');
    if(typeof printPersonFilePdf==='function') await printPersonFilePdf(k, id);
  });
  document.getElementById('btnArchExportFolder')?.addEventListener('click', async ()=>{
    const el = document.getElementById('btnArchExportFolder');
    if(typeof exportArchiveFolder==='function')
      await exportArchiveFolder(el.getAttribute('data-kind'), el.getAttribute('data-id'), el.getAttribute('data-name')||'');
  });

  // سلة المهملات
  document.querySelectorAll('.btn-arch-restore').forEach(b=> b.addEventListener('click', ()=>{
    const idx = parseInt(b.getAttribute('data-idx'),10);
    const trash = ensureArchiveTrash();
    const item = trash[idx];
    if(!item) return;
    const listKey = ({employee:'employees',worker:'workers',supervisor:'supervisors',driver:'drivers',equipment:'equipment'})[item.kind];
    let ent = getArchiveEntity(item.kind, item.personId);
    // إن كان السجل محذوفاً — أعده من النسخة المحفوظة
    if(!ent && item.entity && listKey){
      DATA[listKey] = DATA[listKey] || [];
      const copy = JSON.parse(JSON.stringify(item.entity));
      if(!DATA[listKey].some(x=>x && x.id===copy.id)){
        DATA[listKey].push(copy);
        DATA[listKey] = typeof sortByNameAr==='function' ? sortByNameAr(DATA[listKey], x=>x.name) : DATA[listKey];
      }
      ent = getArchiveEntity(item.kind, item.personId) || copy;
    }
    if(!ent){
      showToast('تعذر الاسترجاع — لا توجد نسخة من السجل');
      return;
    }
    if(!Array.isArray(ent.attachments)) ent.attachments = [];
    (item.attachments||[]).forEach(a=>{
      if(a && a.path && ent.attachments.some(x=>x.path===a.path)) return;
      ent.attachments.push(Object.assign({},a));
    });
    if(Array.isArray(item.personDocuments) && item.personDocuments.length){
      DATA.personDocuments = DATA.personDocuments || [];
      item.personDocuments.forEach(d=>{
        if(d && !DATA.personDocuments.some(x=>x.id===d.id)) DATA.personDocuments.push(d);
      });
    }
    trash.splice(idx,1);
    if(typeof rebuildIndexes==='function') try{ rebuildIndexes(); }catch(_e){}
    saveData(true); showToast('تم استرجاع «'+(item.name||'')+'» مع المرفقات');
    rerenderCurrentPage();
  }));
  document.querySelectorAll('.btn-arch-purge').forEach(b=> b.addEventListener('click', async ()=>{
    const idx = parseInt(b.getAttribute('data-idx'),10);
    const trash = ensureArchiveTrash();
    const item = trash[idx];
    if(!item) return;
    if(!(await confirmDelete('حذف نهائي لمجلد «'+(item.name||'')+'»؟'))) return;
    for(const att of (item.attachments||[])){
      if(att && att.path && window.desktopApi && window.desktopApi.deleteAttachment){
        try{ await window.desktopApi.deleteAttachment(att.path); }catch(e){}
      }
    }
    trash.splice(idx,1);
    saveData(true); showToast('تم الحذف النهائي');
    rerenderCurrentPage();
  }));
}
