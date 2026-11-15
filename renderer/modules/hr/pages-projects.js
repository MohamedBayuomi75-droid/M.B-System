/* =========================================================
   المشاريع — نسخة موحّدة مستوحاة من برنامج العملاء
   شكل وتنسيق النظام الموحد (HR) + حقول ومراحل العملاء
   + الاحتفاظ بربط الموارد والتكلفة اللحظية من HR
   ========================================================= */

/** مراحل المشروع (من دورة العملاء / المقاولات) */
const PROJECT_STAGES = [
  { value: 'الدراسة والتخطيط',        short: 'دراسة' },
  { value: 'تجهيز المستندات',         short: 'مستندات' },
  { value: 'المناقصة وترسية المشروع', short: 'مناقصة' },
  { value: 'التعاقد',                 short: 'تعاقد' },
  { value: 'التنفيذ والمتابعة',       short: 'تنفيذ' },
  { value: 'المستخلصات',              short: 'مستخلصات' },
  { value: 'المراجعة المالية',        short: 'مراجعة' },
  { value: 'التسليم الابتدائي',       short: 'تسليم ابتدائي' },
  { value: 'الإدارة المركزية للحسابات', short: 'حسابات مركزية' },
  { value: 'التسليم النهائي',         short: 'تسليم نهائي' },
  { value: 'مكتمل',                   short: 'مكتمل' },
  { value: 'متوقف',                   short: 'متوقف' },
  { value: 'ملغي',                    short: 'ملغي' }
];

/** تطبيع حالة قديمة من HR إلى مرحلة العملاء */
function normalizeProjectStatus(p){
  const s = String(p && p.status || '').trim();
  if(!s) return (typeof pwFirstStageLabel === 'function') ? pwFirstStageLabel() : 'الدراسة والتخطيط';
  if(s === 'active') return 'التنفيذ والمتابعة';
  if(s === 'completed') return 'مكتمل';
  if(s === 'paused') return 'متوقف';
  if(PROJECT_STAGES.some(x => x.value === s)) return s;
  if(typeof pwCanonicalStatus === 'function') return pwCanonicalStatus(s);   // مرادفات قديمة مثل «التسليم النهائي»
  return s;
}


/* renderProjectPathTrack(project) — معرّفة الآن في modules/clients/project-path.js (مسار تفاعلي) */

function projectStageBadge(status){
  const s = normalizeProjectStatus({ status });
  const map = {
    'الدراسة والتخطيط': 'badge-info',
    'تجهيز المستندات': 'badge-info',
    'المناقصة وترسية المشروع': 'badge-warn',
    'التعاقد': 'badge-warn',
    'التنفيذ والمتابعة': 'badge-ok',
    'المستخلصات': 'badge-ok',
    'المراجعة المالية': 'badge-ok',
    'التسليم الابتدائي': 'badge-ok',
    'الإدارة المركزية للحسابات': 'badge-ok',
    'التسليم النهائي': 'badge-ok',
    'مكتمل': 'badge-ok',
    'متوقف': 'badge-muted',
    'ملغي': 'badge-danger'
  };
  const cls = map[s] || 'badge-muted';
  return '<span class="badge ' + cls + '" style="white-space:nowrap;">' + escapeHtml(s) + '</span>';
}

function renderProjectsPage(){
  if(typeof pwApplyStagesToProjectList === 'function') pwApplyStagesToProjectList();   // قائمة المراحل = المسار المعتمد
  if(projectFilters.detailId) return renderProjectDetail(projectFilters.detailId);

  const q = (projectFilters.q || '').trim();
  let list = sortByNameAr(DATA.projects || [], p => p.name);

  if(q){
    list = list.filter(p => {
      const hay = [
        p.name, p.code, p.notes, p.customerName, p.customer, p.contractNo,
        p.status, normalizeProjectStatus(p)
      ].join(' ');
      if(smartMatch(hay, q)) return true;
      try{
        const sid = p.supervisorId;
        if(sid){
          const sn = typeof supervisorName === 'function' ? supervisorName(sid) : '';
          if(smartMatch(sn, q)) return true;
        }
        const res = typeof resourcesOnProject === 'function' ? resourcesOnProject(p.name) : null;
        if(res && (res.supervisors || []).some(s => smartMatch(s.name, q))) return true;
      }catch(_e){}
      return false;
    });
  }

  // القسم (مرحلة معيّنة) يحدد المشاريع المعروضة؛ وفي «الكل» فلتر المراحل هو اللي بيحدد
  const inSection = !!projectFilters.status;
  const stageNow = projectFilters.status || projectFilters.stageSel || '';
  if(stageNow){
    list = list.filter(p => normalizeProjectStatus(p) === stageNow);
  }
  if(projectFilters.customerId){
    list = list.filter(p => (p.customerId || '') === projectFilters.customerId || (!p.customerId && (p.customerName || p.customer || '') === projectFilters.customerId));
  }

  if(projectFilters.hasRes){
    list = list.filter(p => {
      const res = typeof resourcesOnProject === 'function'
        ? resourcesOnProject(p.name)
        : { workers: [], equipment: [], supervisors: [], drivers: [] };
      const n = (res.workers || []).length
        + (res.equipment || []).length
        + (res.supervisors || []).length
        + (res.drivers || []).length;
      return projectFilters.hasRes === 'with' ? n > 0 : n === 0;
    });
  }

  if(projectFilters.budget){
    list = list.filter(p => {
      const cost = typeof projectCostSummary === 'function' ? projectCostSummary(p.name) : {};
      if(projectFilters.budget === 'none') return !toInt(p.budget) && !toInt(p.value);
      return (cost.budgetStatus || '') === projectFilters.budget;
    });
  }

  const all = inSection ? (DATA.projects || []).filter(p => normalizeProjectStatus(p) === projectFilters.status) : (DATA.projects || []);
  const activeLike = all.filter(p => {
    const s = normalizeProjectStatus(p);
    return s !== 'مكتمل' && s !== 'متوقف' && s !== 'ملغي';
  }).length;
  const done = all.filter(p => normalizeProjectStatus(p) === 'مكتمل').length;
  const totalValue = all.reduce((s, p) => s + toInt(p.value || p.budget), 0);
  const sectionCost = inSection ? all.reduce((s, p) => s + toInt((typeof projectCostSummary === 'function' ? projectCostSummary(p.name) : {}).total), 0) : 0;
  const custOpts = (() => {
    const seen = {}; const out = [];
    all.forEach(p => { const k = p.customerId || p.customerName || p.customer || ''; if(!k || seen[k]) return; seen[k] = 1;
      const c = (typeof clCustomers === 'function' ? clCustomers() : []).find(x => x && x.id === p.customerId);
      out.push({ v: k, l: (c && c.name) || p.customerName || p.customer || k }); });
    return out.sort((a, b) => a.l.localeCompare(b.l, 'ar')).map(o => '<option value="' + escapeHtml(o.v) + '"' + (projectFilters.customerId === o.v ? ' selected' : '') + '>' + escapeHtml(o.l) + '</option>').join('');
  })();

  try{
    if(typeof setPageExport === 'function'){
      setPageExport('projects',
        ['الكود', 'المشروع', 'العميل', 'المرحلة', 'القيمة', 'التقدم %', 'مشرفين', 'عمال', 'معدات', 'التكلفة اللحظية', 'ملاحظات'],
        list.map(p => {
          const res = typeof resourcesOnProject === 'function' ? resourcesOnProject(p.name) : { supervisors: [], workers: [], equipment: [] };
          const cost = typeof projectCostSummary === 'function' ? projectCostSummary(p.name) : { total: 0 };
          return [
            p.code || '',
            p.name || '',
            p.customerName || p.customer || '',
            normalizeProjectStatus(p),
            toInt(p.value || p.budget),
            p.progress != null ? p.progress : '',
            (res.supervisors || []).length,
            (res.workers || []).length,
            (res.equipment || []).length,
            cost.total || 0,
            p.notes || ''
          ];
        })
      );
    }
  }catch(_e){}

  const pg = paginateRows(list, 'projects');
  const stageOpts = PROJECT_STAGES.map(s =>
    '<option value="' + escapeHtml(s.value) + '"' + (projectFilters.stageSel === s.value ? ' selected' : '') + '>' + escapeHtml(s.value) + '</option>'
  ).join('');

  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <h2 class="page-title" style="margin:0;">المشاريع</h2>
          <p class="page-sub" style="margin:4px 0 0;">إدارة المشاريع التجارية · المراحل · الموارد · التكلفة اللحظية</p>
        </div>
        <div class="btn-row page-header-actions">
          ${typeof pageExportButtonsHtml === 'function' ? pageExportButtonsHtml() : ''}
          <button class="btn btn-primary" id="btnAddProject" ${readOnlyMode ? 'disabled' : ''}>+ مشروع</button>
        </div>
      </div>

      <div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">
        ${inSection ? `
        <div class="stat-card"><div class="num">${all.length}</div><div class="lbl">مشاريع «${escapeHtml(projectFilters.status)}»</div></div>
        <div class="stat-card"><div class="num">${new Set(all.map(p => p.customerId || p.customerName || p.customer || '').filter(Boolean)).size}</div><div class="lbl">عدد العملاء</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(sectionCost)}</div><div class="lbl">التكلفة اللحظية</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(totalValue)}</div><div class="lbl">إجمالي قيم المرحلة</div></div>` : `
        <div class="stat-card"><div class="num">${all.length}</div><div class="lbl">كل المشاريع</div></div>
        <div class="stat-card"><div class="num">${activeLike}</div><div class="lbl">جارٍ العمل</div></div>
        <div class="stat-card"><div class="num">${done}</div><div class="lbl">مكتمل</div></div>
        <div class="stat-card"><div class="num">${fmtMoney(totalValue)}</div><div class="lbl">إجمالي القيم</div></div>
        <div class="stat-card"><div class="num">${list.length}</div><div class="lbl">نتيجة البحث</div></div>`}
      </div>

      <div class="filters-bar">
        <input type="search" id="projSearch" class="input" placeholder="بحث: اسم، كود، عميل، عقد، ملاحظات..." value="${escapeHtml(projectFilters.q || '')}" style="min-width:220px;flex:1;">
        ${inSection ? `<select id="projCustomer" class="input" style="min-width:180px;">
          <option value="">كل العملاء</option>
          ${custOpts}
        </select>` : `<select id="projStatus" class="input" style="min-width:180px;">
          <option value="">كل المراحل</option>
          ${stageOpts}
        </select>`}
        <select id="projHasRes" class="input" style="min-width:150px;">
          <option value="">الموارد: الكل</option>
          <option value="with" ${projectFilters.hasRes === 'with' ? 'selected' : ''}>بها موارد</option>
          <option value="empty" ${projectFilters.hasRes === 'empty' ? 'selected' : ''}>بدون موارد</option>
        </select>
        <select id="projBudget" class="input" style="min-width:160px;">
          <option value="">الميزانية: الكل</option>
          <option value="ok" ${projectFilters.budget === 'ok' ? 'selected' : ''}>تحت الميزانية</option>
          <option value="warn" ${projectFilters.budget === 'warn' ? 'selected' : ''}>قريب من الميزانية</option>
          <option value="over" ${projectFilters.budget === 'over' ? 'selected' : ''}>تجاوز الميزانية</option>
          <option value="none" ${projectFilters.budget === 'none' ? 'selected' : ''}>بدون ميزانية/قيمة</option>
        </select>
        <button type="button" class="btn btn-outline btn-sm" id="projClear">مسح الفلاتر</button>
      </div>

      <div class="table-wrap"><table class="data-table">
        <thead><tr>
          <th>الكود</th>
          <th>المشروع</th>
          <th>العميل</th>
          <th>المرحلة</th>
          <th>القيمة</th>
          <th>التقدم</th>
          <th>موارد</th>
          <th>التكلفة</th>
          <th>ملاحظات</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${pg.pageRows.length ? pg.pageRows.map(p => {
            const res = typeof resourcesOnProject === 'function'
              ? resourcesOnProject(p.name)
              : { supervisors: [], workers: [], drivers: [], equipment: [] };
            const cost = typeof projectCostSummary === 'function' ? projectCostSummary(p.name) : { total: 0 };
            const progress = p.progress != null && p.progress !== '' ? (Number(p.progress) + '%') : '—';
            const cust = p.customerName || p.customer || '—';
            const val = toInt(p.value || p.budget);
            return '<tr>' +
              '<td style="white-space:nowrap;">' + escapeHtml(p.code || '—') + '</td>' +
              '<td><strong>' + escapeHtml(p.name || '') + '</strong>' +
                (p.contractNo ? '<div style="font-size:11px;color:var(--ink-soft);">عقد: ' + escapeHtml(p.contractNo) + '</div>' : '') +
              '</td>' +
              '<td>' + escapeHtml(cust) + '</td>' +
              '<td>' + projectStageBadge(p.status) + '</td>' +
              '<td style="white-space:nowrap;">' + (val ? fmtMoney(val) : '—') + '</td>' +
              '<td>' + escapeHtml(String(progress)) + '</td>' +
              '<td title="مشرفين / عمال / معدات">' + (res.supervisors || []).length + '/' + (res.workers || []).length + '/' + (res.equipment || []).length + '</td>' +
              '<td style="white-space:nowrap;"><strong>' + fmtMoney(cost.total || 0) + '</strong></td>' +
              '<td class="notes-cell">' + recordNotesCellHtml(projectNotesIssues(p)) + '</td>' +
              '<td style="white-space:nowrap;">' +
                '<button type="button" class="icon-btn btn-view-proj" data-id="' + p.id + '" title="تفاصيل وكشف حساب">👁️</button> ' +
                '<button type="button" class="icon-btn btn-edit-proj" data-id="' + p.id + '" title="تعديل">✏️</button> ' +
                '<button type="button" class="icon-btn icon-del btn-del-proj" data-id="' + p.id + '"' + (readOnlyMode ? ' disabled' : '') + ' title="حذف">🗑️</button>' +
              '</td></tr>';
          }).join('') : '<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:28px;">لا مشاريع بعد — اضغط «+ مشروع» لإضافة مشروع جديد بنفس حقول برنامج العملاء</td></tr>'}
        </tbody>
      </table></div>
      ${tablePagerHtml('projects', pg)}
    </div>`;
}

function renderProjectDetail(id){
  const p = (DATA.projects || []).find(x => x.id === id);
  if(!p){ projectFilters.detailId = ''; return renderProjectsPage(); }
  return renderProjectStatementPage(p);
}

function initProjectsEvents(){
  if(projectFilters.detailId){
    const proj = (DATA.projects || []).find(x => x.id === projectFilters.detailId);
    if(proj && typeof initProjectStatementEvents === 'function') initProjectStatementEvents(proj);
    return;
  }

  document.getElementById('projSearch')?.addEventListener('input', e => {
    projectFilters.q = e.target.value;
    clearTimeout(window.__projQT);
    window.__projQT = setTimeout(() => { resetTablePage('projects'); rerenderCurrentPage(); }, 220);
  });
  document.getElementById('projStatus')?.addEventListener('change', e => {
    projectFilters.stageSel = e.target.value;
    resetTablePage('projects');
    rerenderCurrentPage();
  });
  document.getElementById('projCustomer')?.addEventListener('change', e => {
    projectFilters.customerId = e.target.value;
    resetTablePage('projects');
    rerenderCurrentPage();
  });
  document.getElementById('projHasRes')?.addEventListener('change', e => {
    projectFilters.hasRes = e.target.value;
    resetTablePage('projects');
    rerenderCurrentPage();
  });
  document.getElementById('projBudget')?.addEventListener('change', e => {
    projectFilters.budget = e.target.value;
    resetTablePage('projects');
    rerenderCurrentPage();
  });
  document.getElementById('projClear')?.addEventListener('click', () => {
    projectFilters.q = '';
    projectFilters.stageSel = '';
    projectFilters.customerId = '';
    projectFilters.hasRes = '';
    projectFilters.budget = '';
    resetTablePage('projects');
    rerenderCurrentPage();
  });
  document.getElementById('btnAddProject')?.addEventListener('click', () => openProjectModal());
  document.querySelectorAll('.btn-view-proj').forEach(b => b.addEventListener('click', () => {
    projectFilters.detailId = b.getAttribute('data-id');
    rerenderCurrentPage();
  }));
  document.querySelectorAll('.btn-edit-proj').forEach(b => b.addEventListener('click', () => openProjectModal(b.getAttribute('data-id'))));
  document.querySelectorAll('.btn-del-proj').forEach(b => b.addEventListener('click', () => {
    const pid = b.getAttribute('data-id');
    const delP = (DATA.projects || []).find(p => p.id === pid);
    const lk = (typeof clProjectLinks === 'function' && delP) ? clProjectLinks(delP) : null;
    if(lk && lk.total){
      showToast('لا يمكن حذف المشروع: مرتبط بـ ' + [
        lk.contracts ? lk.contracts + ' عقد' : '', lk.invoices ? lk.invoices + ' مستخلص' : '', lk.boqs ? lk.boqs + ' مقايسة' : '',
        lk.workSurveys ? lk.workSurveys + ' حصر' : '', lk.collections ? lk.collections + ' تحصيل' : ''
      ].filter(Boolean).join(' · ') + ' — احذفها أو انقلها أولاً');
      return;
    }
    confirmDelete('حذف المشروع؟').then(ok => {
      if(!ok) return;
      DATA.projects = (DATA.projects || []).filter(p => p.id !== pid);
      saveData(true);
      showToast('تم الحذف');
      rerenderCurrentPage();
    });
  }));
}

function openProjectModal(editId, presetCustomerId){
  if(typeof pwApplyStagesToProjectList === 'function') pwApplyStagesToProjectList();
  const p = editId ? (DATA.projects || []).find(x => x.id === editId) : null;
  const presetCid = (!p && presetCustomerId) ? presetCustomerId : '';
  const curStatus = p ? normalizeProjectStatus(p) : ((typeof pwFirstStageLabel === 'function') ? pwFirstStageLabel() : 'الدراسة والتخطيط');
  const stageList = PROJECT_STAGES.slice();
  if(!stageList.some(s => s.value === curStatus)) stageList.unshift({ value: curStatus, short: curStatus });   // مرحلة من مسار قديم/معدّل: ما نغيّرهاش بالغلط
  const stageOptions = stageList.map(s =>
    '<option value="' + escapeHtml(s.value) + '"' + (curStatus === s.value ? ' selected' : '') + '>' + escapeHtml(s.value) + '</option>'
  ).join('');

  const today = (typeof todayISO === 'function')
    ? todayISO()
    : new Date().toISOString().slice(0, 10);

  openModal(`
    <div class="modal-header">
      <h3>${p ? 'تعديل مشروع' : 'مشروع جديد'}</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>كود المشروع
          <input class="input" id="prCode" value="${escapeHtml(p && p.code || (typeof nextProjectCode === 'function' ? nextProjectCode() : ''))}" placeholder="يُولَّد تلقائياً إن تُرك فارغاً">
        </label>
        <label>اسم المشروع *
          <input class="input" id="prName" value="${escapeHtml(p && p.name || '')}" placeholder="اسم المشروع">
        </label>
        <label>العميل
          ${ (typeof clCustomers === 'function' && clCustomers().length)
            ? `<select class="input" id="prCustomerId">
                <option value="">— اختر العميل —</option>
                ${clCustomers().map(function(c){
                  const sel = ((p && (p.customerId === c.id || (!p.customerId && p.customerName === c.name))) || (presetCid && presetCid === c.id)) ? ' selected' : '';
                  return '<option value="' + escapeHtml(c.id) + '"' + sel + '>' + escapeHtml((c.code ? c.code + ' — ' : '') + c.name) + '</option>';
                }).join('')}
              </select>
              <input type="hidden" id="prCustomer" value="">`
            : `<input class="input" id="prCustomer" value="${escapeHtml(p && (p.customerName || p.customer) || '')}" placeholder="اسم العميل" required>`
          }
        </label>
        <label>رقم العقد
          <input class="input" id="prContractNo" value="${escapeHtml(p && p.contractNo || '')}" placeholder="اختياري">
        </label>
        <label>قيمة المشروع (ج.م)
          <input class="input" id="prValue" type="number" min="0" step="0.01" value="${p ? toInt(p.value || p.budget) : ''}">
        </label>
        <label>الميزانية التشغيلية (ج.م)
          <input class="input" id="prBudget" type="number" min="0" step="0.01" value="${p ? toInt(p.budget) : 0}">
        </label>
        <label>تاريخ البداية
          <input class="input" id="prStart" type="date" value="${escapeHtml(p && p.start || today)}">
        </label>
        <label>تاريخ النهاية المتوقع
          <input class="input" id="prEnd" type="date" value="${escapeHtml(p && p.end || '')}">
        </label>
        <label>نسبة الإنجاز %
          <input class="input" id="prProgress" type="number" min="0" max="100" step="1" value="${p && p.progress != null ? p.progress : ''}">
        </label>
        <label>المرحلة / الحالة
          <select class="input" id="prStatus">${stageOptions}</select>
        </label>
        <label>مشرف المشروع
          <div>${typeof entityComboHtml === 'function'
            ? entityComboHtml('prSup', 'supervisor', p && p.supervisorId || '', 'اختر مشرف...')
            : '<select class="input" id="prSup">' + (typeof supervisorOptions === 'function' ? supervisorOptions(p && p.supervisorId || '', '—') : '') + '</select>'}
          </div>
        </label>
        <label>المسؤول (تعيين)
          <input class="input" id="prAssigned" value="${escapeHtml(p && p.assignedTo || '')}" placeholder="اسم أو كود المسؤول">
        </label>
        <label style="grid-column:1/-1;">ملاحظات
          <textarea class="input" id="prNotes" rows="2">${escapeHtml(p && p.notes || '')}</textarea>
        </label>
        ${typeof customFieldsFormHtml === 'function' ? customFieldsFormHtml('projects', p || null) : ''}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSavePr">حفظ</button>
    </div>
  `);

  const prAtt = (typeof clAttachMount === 'function') ? clAttachMount(function(){ return 'project_' + (p ? p.id : 'new'); }, 'مشروع', p ? (p.attachments || []) : []) : null;
  if(typeof bindEntityCombos === 'function') bindEntityCombos(document.getElementById('appModal'));
  if(typeof applyFormLayout === 'function') applyFormLayout('projects', document.getElementById('appModal'));

  document.getElementById('btnSavePr').onclick = () => {
    const name = (document.getElementById('prName').value || '').trim();
    if(!name){ showToast('اسم المشروع مطلوب'); return; }
    {
      const _cs = document.getElementById('prCustomerId');
      const _cv = _cs ? _cs.value : (document.getElementById('prCustomer')?.value || '').trim();
      if(!_cv && (!p || p.customerId || p.customerName || p.customer)){ showToast('حدد العميل أولاً — لا يمكن إضافة مشروع بدون عميل'); try{ (_cs || document.getElementById('prCustomer')).focus(); }catch(_e){} return; }
    }

    const supervisorId = document.getElementById('prSup')?.value || '';
    const value = toInt(document.getElementById('prValue').value);
    const budget = toInt(document.getElementById('prBudget').value);
    const progressRaw = document.getElementById('prProgress').value;
    const progress = progressRaw === '' ? null : Math.min(100, Math.max(0, toInt(progressRaw)));

    const payload = {
      attachments: prAtt ? prAtt.get() : ((p && p.attachments) || []),
      code: (document.getElementById('prCode').value || '').trim()
        || (typeof nextProjectCode === 'function' ? nextProjectCode() : ('PRJ-' + Date.now().toString().slice(-4))),
      name,
      customerId: document.getElementById('prCustomerId') ? document.getElementById('prCustomerId').value : ((p && p.customerId) || ''),
      customerName: (function(){
        const sel = document.getElementById('prCustomerId');
        if(sel && sel.value && typeof clCustomerName === 'function') return clCustomerName(sel.value);
        return (document.getElementById('prCustomer') && document.getElementById('prCustomer').value || '').trim();
      })(),
      customer: (function(){
        const sel = document.getElementById('prCustomerId');
        if(sel && sel.value && typeof clCustomerName === 'function') return clCustomerName(sel.value);
        return (document.getElementById('prCustomer') && document.getElementById('prCustomer').value || '').trim();
      })(),
      contractNo: (document.getElementById('prContractNo').value || '').trim(),
      value,
      budget: budget || value,
      start: document.getElementById('prStart').value || '',
      end: document.getElementById('prEnd').value || '',
      progress,
      status: document.getElementById('prStatus').value || ((typeof pwFirstStageLabel === 'function') ? pwFirstStageLabel() : 'الدراسة والتخطيط'),
      supervisorId,
      assignedTo: (document.getElementById('prAssigned').value || '').trim(),
      notes: (document.getElementById('prNotes').value || '').trim(),
      extraFields: typeof collectExtraFieldsForSave === 'function'
        ? collectExtraFieldsForSave('extraFields_projects')
        : (p && p.extraFields) || []
    };

    // منع التكرار: الاسم والكود فريدين في النظام (HR بيربط بالاسم)
    const dupName = (DATA.projects || []).find(x => x.id !== (p && p.id) && (typeof clNormName === 'function' ? clNormName(x.name) === clNormName(name) : String(x.name || '').trim() === name));
    if(dupName){ showToast('يوجد مشروع بنفس الاسم بالفعل (' + (dupName.code || dupName.name) + ')'); return; }
    const dupCode = payload.code && (DATA.projects || []).find(x => x.id !== (p && p.id) && x.code && String(x.code).trim() === String(payload.code).trim());
    if(dupCode){ showToast('كود المشروع مستخدم بالفعل في: ' + dupCode.name); return; }

    if(supervisorId){
      const sup = typeof getSupervisor === 'function' ? getSupervisor(supervisorId) : null;
      if(sup) sup.project = name;
    }

    if(p){
      const oldName = p.name;
      const oldStatus = normalizeProjectStatus(p);
      if(typeof projLinkAll === 'function') projLinkAll();      // اربط السجلات بالمعرّف قبل تغيير الاسم
      Object.assign(p, payload);
      if(typeof projLinkAll === 'function') projLinkAll();      // وانشر الاسم الجديد على كل السجلات المربوطة
      if(oldStatus !== payload.status && typeof pwOnStatusChanged === 'function') pwOnStatusChanged(p, payload.status);
      if(oldName && oldName !== name){
        if(typeof clRenameProjectRefs === 'function') clRenameProjectRefs(p, oldName, name);   // عقود/مستخلصات/مقايسات/حصر/تحصيلات
        ['workers', 'equipment', 'drivers', 'employees', 'supervisors'].forEach(k => {
          (DATA[k] || []).forEach(r => {
            if(String(r.project || '').trim() === oldName) r.project = name;
          });
        });
      }
    } else {
      payload.id = uid();
      DATA.projects = DATA.projects || [];
      DATA.projects.push(payload);
    }

    DATA.projects = sortByNameAr(DATA.projects, x => x.name);
    saveData(true);
    closeModal();
    showToast('تم حفظ المشروع');
    rerenderCurrentPage();
  };
}

/* ========== يومية المشروع ========== */
function openPlanModal(){
  const projOpts = (DATA.projects || []).map(p =>
    '<option value="' + escapeHtml(p.name) + '">' + escapeHtml((p.code ? p.code + ' — ' : '') + p.name) + '</option>'
  ).join('');
  const today = (typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0, 10);

  openModal(`
    <div class="modal-header"><h3>خطة / يومية مشروع</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>المشروع
          <select class="input" id="pdProj"><option value="">— اختر —</option>${projOpts}</select>
        </label>
        <label>التاريخ
          <input class="input" id="pdDate" type="date" value="${today}">
        </label>
        <label>تكلفة العمالة
          <input class="input" id="pdLabor" type="number" min="0" step="0.01" value="0">
        </label>
        <label>تكلفة المعدات
          <input class="input" id="pdEquip" type="number" min="0" step="0.01" value="0">
        </label>
        <label>تكلفة الوقود
          <input class="input" id="pdFuel" type="number" min="0" step="0.01" value="0">
        </label>
        <label>عدد العمال
          <input class="input" id="pdWorkersN" type="number" min="0" value="0">
        </label>
        <label style="grid-column:1/-1;">ملاحظات
          <textarea class="input" id="pdNotes" rows="2"></textarea>
        </label>
      </div>
      <div style="margin-top:10px;">
        <button type="button" class="btn btn-outline btn-sm" id="pdAutoFill">تعبئة تلقائية من الحضور والمعدات</button>
      </div>
      <div id="pdTotal" style="margin-top:10px;font-weight:700;">إجمالي اليوم: 0 ج.م</div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSavePd">حفظ</button>
    </div>
  `);

  function tot(){
    const t = toInt(document.getElementById('pdLabor').value)
      + toInt(document.getElementById('pdEquip').value)
      + toInt(document.getElementById('pdFuel').value);
    document.getElementById('pdTotal').textContent = 'إجمالي اليوم: ' + fmtMoney(t);
  }
  ['pdLabor', 'pdEquip', 'pdFuel'].forEach(id =>
    document.getElementById(id).addEventListener('input', tot)
  );

  document.getElementById('pdAutoFill').onclick = () => {
    const name = document.getElementById('pdProj').value;
    const date = document.getElementById('pdDate').value;
    if(!name || !date){ showToast('اختر المشروع والتاريخ'); return; }
    let labor = 0, n = 0;
    (DATA.workerAttendance || []).filter(a => a.date === date && String(a.project || '').trim() === name).forEach(a => {
      labor += typeof attendanceNetPay === 'function' ? attendanceNetPay(a) : 0;
      n++;
    });
    let equip = 0, fuel = 0;
    (DATA.equipmentDaily || []).filter(d => d.date === date && String(d.project || '').trim() === name).forEach(d => {
      const eq = typeof getEquipment === 'function' ? getEquipment(d.equipmentId) : null;
      equip += typeof equipmentDailyCost === 'function' ? equipmentDailyCost(d, eq) : 0;
      fuel += toInt(Math.round((Number(d.fuelLiters) || 0) * toInt(d.fuelPrice || (eq && eq.fuelPrice))));
    });
    (DATA.fuelLogs || []).filter(f => f.date === date && String(f.project || '').trim() === name).forEach(f => {
      fuel += toInt(f.cost);
    });
    document.getElementById('pdLabor').value = toInt(labor);
    document.getElementById('pdEquip').value = toInt(equip);
    document.getElementById('pdFuel').value = toInt(fuel);
    document.getElementById('pdWorkersN').value = n;
    tot();
  };

  document.getElementById('btnSavePd').onclick = () => {
    const project = document.getElementById('pdProj').value;
    if(!project){ showToast('اختر المشروع'); return; }
    DATA.projectDaily = DATA.projectDaily || [];
    DATA.projectDaily.push({
      id: uid(),
      project,
      date: document.getElementById('pdDate').value,
      laborCost: toInt(document.getElementById('pdLabor').value),
      equipCost: toInt(document.getElementById('pdEquip').value),
      fuelCost: toInt(document.getElementById('pdFuel').value),
      workersCount: toInt(document.getElementById('pdWorkersN').value),
      notes: (document.getElementById('pdNotes').value || '').trim()
    });
    saveData(true);
    closeModal();
    showToast('تم حفظ يومية المشروع');
    rerenderCurrentPage();
  };
}
