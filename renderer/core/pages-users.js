
function canManageUsers(){
  try{
    if(typeof readOnlyMode!=='undefined' && readOnlyMode) return false;
    if(typeof currentUser==='undefined' || !currentUser){
      // وضع محلي بدون جلسة ظاهرة — اسمح إن وُجد مدير فقط
      return true;
    }
    if(currentUser.role==='admin') return true;
    const p = currentUser.permissions || null;
    if(p && p.manageUsers) return true;
    return false;
  }catch(_e){ return false; }
}

function renderUsersPage(){
  if(typeof ensureLocalAdminUser==="function") ensureLocalAdminUser();
  // لا مستخدمين مثبتين إضافيين — المدير الافتراضي فقط عند فراغ القائمة
  try{
    DATA.users = (DATA.users||[]).filter(u=>u && u.username);
  }catch(_e){}
  const canManage = typeof canManageUsers==='function' ? canManageUsers() : true;
  const net = typeof isNetworkMode==='function' && isNetworkMode();
  const mode = typeof getDeviceMode==='function' ? getDeviceMode() : 'standalone';
  const users = (DATA.users||[]).slice();
  const roleLab = { admin:'مدير النظام', hr:'موارد بشرية', payroll:'رواتب ومستحقات', viewer:'عرض فقط', clientsSales:'عملاء: مبيعات وعقود', clientsAccounts:'عملاء: محاسب مستخلصات وتحصيل', clientsProjects:'عملاء: مدير مشاريع', custom:'مخصّص' };
  const activeCount = users.filter(u=>u.active!==false).length;
  const adminCount = users.filter(u=>u.role==='admin').length;
  const q = (window.__usersSearch||'').trim().toLowerCase();
  const filtered = q ? users.filter(u=>{
    const s = [u.username,u.name,u.role,roleLab[u.role],u.jobTitle].join(' ').toLowerCase();
    return s.indexOf(q)!==-1;
  }) : users;

  function initials(u){
    const n = (u.name||u.username||'?').trim();
    const parts = n.split(/\s+/).filter(Boolean);
    if(parts.length>=2) return (parts[0][0]+parts[1][0]).toUpperCase();
    return n.slice(0,2).toUpperCase();
  }

  const cards = filtered.map(u=>{
    const role = u.role||'viewer';
    const active = u.active!==false;
    return `
      <div class="user-card" data-user="${escapeHtml(u.username||'')}">
        <div class="user-card-top">
          <div class="user-avatar${!active?' inactive':''}">${escapeHtml(initials(u))}</div>
          <div class="user-meta">
            <div class="uname">${escapeHtml(u.name||u.username||'')}</div>
            <div class="ulogin">@${escapeHtml(u.username||'')}</div>
            <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
              <span class="role-badge ${escapeHtml(role)}">${escapeHtml(roleLab[role]||role)}</span>
              <span class="status-dot${!active?' off':''}">${active?'نشط':'موقوف'}</span>
            </div>
          </div>
        </div>
        ${u.jobTitle?`<div style="font-size:12.5px;color:var(--ink-soft);">الوظيفة: ${escapeHtml(u.jobTitle)}</div>`:''}
        <div class="user-card-actions">
          <button type="button" class="btn btn-outline btn-sm btn-edit-user" data-user="${escapeHtml(u.username||'')}" ${readOnlyMode?'disabled':''}>⚙️ صلاحيات</button>
          <button type="button" class="btn btn-outline btn-sm btn-reset-pass" data-user="${escapeHtml(u.username||'')}" ${readOnlyMode?'disabled':''}>🔑 كلمة المرور</button>
          <button type="button" class="btn btn-outline btn-sm btn-del-user" data-user="${escapeHtml(u.username||'')}" ${readOnlyMode?'disabled':''} style="color:#b91c1c;border-color:#f1c0c0;">حذف</button>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="page">
      <h2 class="page-title">المستخدمون والصلاحيات</h2>
      <p class="page-sub">${net
        ? (mode==='host'?'وضع مضيف — أدر حسابات الأجهزة المتصلة':'وضع عميل — الصلاحيات حسب حسابك')
        : 'وضع جهاز واحد · فعّل الشبكة من الإعدادات لتعدد المستخدمين'}</p>

      <div class="net-banner ${net?'':'offline'}">
        ${net
          ? '<strong>الشبكة مفعّلة.</strong> كل مستخدم يرى الصفحات حسب صلاحياته. غيّر الأدوار من البطاقات أدناه.'
          : '<strong>وضع جهاز واحد.</strong> حسابك كمدير ظاهر دائماً ويمكنك تغيير كلمة المرور وتعديل البيانات. لتعدد الأجهزة فعّل الشبكة من الإعدادات.'}
      </div>

      <div class="users-hero">
        <div class="users-stat"><div class="us-label">إجمالي المستخدمين</div><div class="us-num">${users.length}</div></div>
        <div class="users-stat"><div class="us-label">نشط</div><div class="us-num">${activeCount}</div></div>
        <div class="users-stat"><div class="us-label">مديرو النظام</div><div class="us-num">${adminCount}</div></div>
        <div class="users-stat"><div class="us-label">الوضع</div><div class="us-num" style="font-size:15px;">${net?(mode==='host'?'مضيف':'عميل'):'محلي'}</div></div>
      </div>

      <div class="users-toolbar">
        <input class="input search-box" id="usersSearchInput" placeholder="بحث بالاسم أو اسم المستخدم أو الدور..." value="${escapeHtml(window.__usersSearch||'')}">
        <button type="button" class="btn btn-primary" id="btnAddUser" ${(!canManage||readOnlyMode)?"disabled":""}>+ مستخدم جديد</button>
      </div>

      ${(()=>{
        const me = (typeof currentUser!=='undefined' && currentUser) ? currentUser : null;
        const meRec = me ? (DATA.users||[]).find(x=>x && x.username===me.username) : (DATA.users||[]).find(x=>x && x.role==='admin');
        if(!meRec && !me) return '';
        const u = meRec || { username: me.username, name: me.name, role: me.role||'admin' };
        return `<div class="stat-card" style="margin-bottom:16px;border:2px solid var(--ledger-green);background:linear-gradient(135deg,#E8F0EA,#fffef9);">
          <div class="section-title" style="margin-top:0;">حسابي (مدير النظام)</div>
          <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;">
            <div style="flex:1;min-width:180px;">
              <div style="font-size:12px;color:var(--ink-soft);">اسم المستخدم</div>
              <div style="font-weight:900;font-size:16px;direction:ltr;unicode-bidi:plaintext;">${escapeHtml(u.username||'')}</div>
              <div style="font-size:12px;color:var(--ink-soft);margin-top:8px;">الاسم الظاهر</div>
              <div style="font-weight:700;">${escapeHtml(u.name||u.username||'')}</div>
              <div style="font-size:12px;color:var(--ink-soft);margin-top:8px;">الدور</div>
              <div><span class="role-badge admin">مدير النظام</span></div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              <button type="button" class="btn btn-primary btn-sm btn-edit-user" data-user="${escapeHtml(u.username||'')}" ${readOnlyMode?'disabled':''}>⚙️ تعديل الحساب</button>
              <button type="button" class="btn btn-outline btn-sm btn-reset-pass" data-user="${escapeHtml(u.username||'')}" ${readOnlyMode?'disabled':''}>🔑 تغيير كلمة المرور</button>
            </div>
          </div>
          <p style="margin:12px 0 0;font-size:12.5px;color:var(--ink-soft);">يمكنك تغيير اسم المستخدم الظاهر وكلمة المرور من هنا في أي وقت.</p>
        </div>`;
      })()}


      ${filtered.length ? `<div class="user-cards" id="usersCardsGrid">${cards}</div>` : `
        <div class="users-empty">
          <div style="font-size:36px;margin-bottom:8px;">🔍</div>
          <p style="margin:0;font-weight:700;">لا نتائج${q?' للبحث':''}</p>
          ${!users.length?'<p style="margin:8px 0 0;font-size:13px;">أضف مستخدماً من الزر أعلاه — الحساب الافتراضي admin يُنشأ تلقائياً</p>':''}
        </div>
      `}

      <div class="section-title">دليل الأدوار</div>
      <div class="users-guide">
        <div class="users-guide-item"><strong>مدير النظام</strong>كل الصفحات + المستخدمين والشبكة والنسخ الاحتياطي</div>
        <div class="users-guide-item"><strong>موارد بشرية</strong>موظفين وعمال وحضور وإجازات وأرشيف — بدون إدارة مستخدمين</div>
        <div class="users-guide-item"><strong>رواتب ومستحقات</strong>المستحقات والرواتب والتقارير الأساسية</div>
        <div class="users-guide-item"><strong>عرض فقط</strong>مشاهدة بدون إضافة أو تعديل أو حذف</div>
        <div class="users-guide-item"><strong>مخصّص</strong>تختار كل صفحة وصلاحية يدوياً من زر الصلاحيات</div>
      </div>
    </div>`;
}

function userPermsMatrixHtml(perms){
  const pages = (typeof HR_PAGES!=='undefined'?HR_PAGES:['dashboard','employees','workers','supervisors','drivers','equipment','projects','attendance','workerAttendance','workerDues','expenses','leaves','payroll','reports','archive','backup','users']);
  const labels = {
    dashboard:'لوحة المتابعة', employees:'الموظفين', workers:'العمال', supervisors:'المشرفين', drivers:'السائقين',
    equipment:'معدات ومركبات', projects:'المشاريع', attendance:'حضور موظفين', workerAttendance:'اليوميات',
    workerDues:'المستحقات', expenses:'المصاريف', leaves:'الإجازات', payroll:'الرواتب', reports:'التقارير',
    archive:'الأرشيف', backup:'البيانات والتحديثات', users:'المستخدمون', departments:'الأقسام', permits:'التصاريح',
    'ledger.dashboard':'الموردون: لوحة المتابعة', 'ledger.suppliers':'الموردون: الموردون', 'ledger.invoices':'الموردون: الفواتير',
    'ledger.payments':'الموردون: الدفعات', 'ledger.categories':'الموردون: الاقتراحات', 'ledger.quarterly':'الموردون: إشعارات الخصم',
    'ledger.reports':'الموردون: التقارير', 'ledger.archive':'الموردون: الأرشيف', 'ledger.returns':'الموردون: المرتجعات',
    'general.overview':'نظرة عامة', 'tasks.my':'مهامي', 'clients.dashboard':'العملاء: لوحة المتابعة', 'clients.customers':'العملاء',
    'clients.workSurveys':'أعمال الحصر', 'clients.boqs':'المقايسات', 'clients.contracts':'العقود', 'clients.invoices':'المستخلصات', 'clients.guarantees':'الضمانات', 'clients.comparison':'المقارنة',
    'clients.crm':'CRM', 'clients.collections':'الإيرادات', 'clients.accounts':'حسابات العملاء', 'clients.reports':'تقارير العملاء والمشاريع',
    'clients.archive':'أرشيف العملاء والمشاريع', 'warehouses.home':'المخازن', 'warehouses.reports':'تقارير المخازن', 'accounts.reports':'تقارير الحسابات'
  };
  const p = (perms && perms.pages) || {};
  return `<div class="perm-matrix-wrap">
    <table class="data-table">
      <thead><tr><th>الصفحة</th><th>عرض</th><th>إضافة</th><th>تعديل</th><th>حذف</th></tr></thead>
      <tbody>
        ${pages.map(k=>{
          const x = p[k] || {view:true,add:false,edit:false,delete:false};
          return `<tr>
            <td>${escapeHtml(labels[k]||k)}</td>
            <td style="text-align:center;"><input type="checkbox" class="perm-cb" data-page="${k}" data-act="view" ${x.view?'checked':''}></td>
            <td style="text-align:center;"><input type="checkbox" class="perm-cb" data-page="${k}" data-act="add" ${x.add?'checked':''}></td>
            <td style="text-align:center;"><input type="checkbox" class="perm-cb" data-page="${k}" data-act="edit" ${x.edit?'checked':''}></td>
            <td style="text-align:center;"><input type="checkbox" class="perm-cb" data-page="${k}" data-act="delete" ${x.delete?'checked':''}></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
}

function collectPermsFromModal(){
  const pages = {};
  (typeof HR_PAGES!=='undefined'?HR_PAGES:[]).forEach(k=>{ pages[k] = { view:false, add:false, edit:false, delete:false }; });
  document.querySelectorAll('.perm-cb').forEach(cb=>{
    const page = cb.getAttribute('data-page');
    const act = cb.getAttribute('data-act');
    if(!pages[page]) pages[page] = { view:false, add:false, edit:false, delete:false };
    pages[page][act] = !!cb.checked;
  });
  return {
    editData: !!document.getElementById('uEditData')?.checked,
    deleteData: !!document.getElementById('uDeleteData')?.checked,
    manageUsers: !!document.getElementById('uManageUsers')?.checked,
    manageNetwork: !!document.getElementById('uManageNetwork')?.checked,
    pages
  };
}

function openUserModal(editUser){
  const isEdit = !!editUser;
  const role = (editUser && editUser.role) || 'viewer';
  const perms = (editUser && editUser.permissions) || (typeof roleTemplates==='function' ? (roleTemplates()[role]||roleTemplates().viewer) : null);
  openModal(`
    <div class="modal-header"><h3>${isEdit?'تعديل صلاحيات المستخدم':'مستخدم جديد'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>اسم المستخدم *<input class="input" id="uUser" value="${escapeHtml(editUser&&editUser.username||'')}" autocomplete="username" ${isEdit?'data-old-user="'+escapeHtml(editUser.username||'')+'"':''}></label>
        <label>الاسم الظاهر<input class="input" id="uName" value="${escapeHtml(editUser&&editUser.name||'')}"></label>
        <label>${isEdit?'كلمة مرور جديدة (اختياري)':'كلمة المرور *'}<input class="input" id="uPass" type="password" placeholder="${isEdit?'اتركها فارغة للإبقاء':''}" autocomplete="new-password"></label>
        <label>الدور
          <select class="input" id="uRole">
            <option value="admin" ${role==='admin'?'selected':''}>مدير النظام</option>
            <option value="hr" ${role==='hr'?'selected':''}>موارد بشرية</option>
            <option value="payroll" ${role==='payroll'?'selected':''}>رواتب ومستحقات</option>
            <option value="viewer" ${role==='viewer'?'selected':''}>عرض فقط</option>
            <option value="clientsSales" ${role==='clientsSales'?'selected':''}>عملاء: مبيعات وعقود</option>
            <option value="clientsAccounts" ${role==='clientsAccounts'?'selected':''}>عملاء: محاسب مستخلصات وتحصيل</option>
            <option value="clientsProjects" ${role==='clientsProjects'?'selected':''}>عملاء: مدير مشاريع</option>
            <option value="custom" ${role==='custom'?'selected':''}>مخصّص</option>
          </select>
        </label>
        <label>المسمى الوظيفي<input class="input" id="uJob" value="${escapeHtml(editUser&&editUser.jobTitle||'')}"></label>
        <label style="display:flex;align-items:center;gap:8px;padding-top:22px;"><input type="checkbox" id="uActive" ${!editUser || editUser.active!==false?'checked':''}> حساب نشط</label>
      </div>
      <div class="section-title" style="margin-top:14px;">صلاحيات عامة</div>
      <div style="display:flex;flex-wrap:wrap;gap:14px;margin-bottom:12px;font-size:13px;">
        <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="uEditData" ${perms&&perms.editData?'checked':''}> تعديل البيانات</label>
        <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="uDeleteData" ${perms&&perms.deleteData?'checked':''}> حذف البيانات</label>
        <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="uManageUsers" ${perms&&perms.manageUsers?'checked':''}> إدارة المستخدمين</label>
        <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="uManageNetwork" ${perms&&perms.manageNetwork?'checked':''}> إدارة الشبكة</label>
      </div>
      <div class="section-title">صلاحيات الصفحات</div>
      ${userPermsMatrixHtml(perms)}
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-primary" id="btnSaveUser">حفظ</button>
      <button type="button" class="btn btn-outline" onclick="closeModal()">إلغاء</button>
    </div>
  `);
  const roleSel = document.getElementById('uRole');
  const applyRoleTemplate = ()=>{
    const r = roleSel.value;
    if(r==='custom' || typeof roleTemplates!=='function') return;
    const T = roleTemplates()[r];
    if(!T) return;
    const ed = document.getElementById('uEditData'); if(ed) ed.checked = !!T.editData;
    const dd = document.getElementById('uDeleteData'); if(dd) dd.checked = !!T.deleteData;
    const mu = document.getElementById('uManageUsers'); if(mu) mu.checked = !!T.manageUsers;
    const mn = document.getElementById('uManageNetwork'); if(mn) mn.checked = !!T.manageNetwork;
    const box = document.querySelector('.modal-body .perm-matrix-wrap');
    if(box) box.outerHTML = userPermsMatrixHtml(T);
  };
  roleSel.addEventListener('change', applyRoleTemplate);

  document.getElementById('btnSaveUser').addEventListener('click', async ()=>{
    const oldUsername = (document.getElementById('uUser').getAttribute('data-old-user')||'').trim();
    const username = (document.getElementById('uUser').value||'').trim();
    const pass = document.getElementById('uPass').value||''; // لا نعمل trim لكلمة المرور إلا للأطراف
    const passTrim = pass.trim();
    if(!username){ showToast('اسم المستخدم مطلوب'); return; }
    if(!/^[A-Za-z0-9._@-]{2,40}$/.test(username)){
      showToast('اسم المستخدم: حروف وأرقام و . _ @ - فقط (2–40)');
      return;
    }
    if(!isEdit && !passTrim){ showToast('كلمة المرور مطلوبة'); return; }
    DATA.users = DATA.users || [];

    // منع تكرار اسم المستخدم
    const clash = DATA.users.find(x=>x && String(x.username).toLowerCase()===username.toLowerCase()
      && (!isEdit || String(x.username).toLowerCase()!==String(oldUsername||editUser&&editUser.username||'').toLowerCase()));
    if(!isEdit && DATA.users.some(u=>u && String(u.username).toLowerCase()===username.toLowerCase())){
      showToast('المستخدم موجود مسبقاً'); return;
    }
    if(isEdit && oldUsername && username.toLowerCase()!==oldUsername.toLowerCase()){
      if(DATA.users.some(u=>u && String(u.username).toLowerCase()===username.toLowerCase())){
        showToast('اسم المستخدم مستخدم بالفعل'); return;
      }
    }

    if(passTrim){
      const verr = typeof validateNewPassword==='function' ? validateNewPassword(passTrim, passTrim) : (passTrim.length<8?'كلمة المرور 8 أحرف على الأقل':'');
      if(verr){ showToast(verr); return; }
    }

    const permissions = collectPermsFromModal();
    const payload = {
      username,
      name: (document.getElementById('uName').value||'').trim()||username,
      role: document.getElementById('uRole').value||'viewer',
      jobTitle: (document.getElementById('uJob')?.value||'').trim(),
      active: !!document.getElementById('uActive')?.checked,
      permissions
    };

    if(isEdit){
      const key = oldUsername || (editUser && editUser.username) || username;
      const u = DATA.users.find(x=>x && String(x.username)===String(key))
        || DATA.users.find(x=>x && String(x.username).toLowerCase()===String(key).toLowerCase());
      if(!u){ showToast('المستخدم غير موجود'); return; }
      const prevUser = u.username;
      u.username = username;
      u.name = payload.name;
      u.role = payload.role;
      u.jobTitle = payload.jobTitle;
      u.active = payload.active;
      u.permissions = permissions;
      if(passTrim){
        try{ await applyLocalPassword(u, passTrim); }
        catch(e){ showToast(String(e && e.message || 'تعذر تشفير كلمة المرور')); return; }
      }
      if(typeof addAudit==='function') addAudit('تعديل مستخدم', prevUser+' → '+username);
      // تحديث الجلسة لو كان المستخدم الحالي
      try{
        if(typeof currentUser!=='undefined' && currentUser &&
          (currentUser.username===prevUser || currentUser.username===key)){
          currentUser.username = username;
          currentUser.name = u.name;
          currentUser.role = u.role;
          if(typeof setLocalSession==='function') setLocalSession(currentUser, true);
          if(typeof cacheCurrentUser==='function') cacheCurrentUser(currentUser);
        }
      }catch(_e){}
      // شبكة
      try{
        if(typeof isNetworkMode==='function' && isNetworkMode() && u.id){
          if(passTrim && typeof apiResetUserPassword==='function') await apiResetUserPassword(u.id, passTrim);
          if(typeof apiUpdateUser==='function') await apiUpdateUser(u.id, {
            username, name:u.name, role:u.role, jobTitle:u.jobTitle, active:u.active, permissions
          });
        }
      }catch(e){ console.warn(e); }
    } else {
      const nu = Object.assign({}, payload);
      try{ await applyLocalPassword(nu, passTrim); }
      catch(e){ showToast(String(e && e.message || 'تعذر تشفير كلمة المرور')); return; }
      DATA.users.push(nu);
      if(typeof addAudit==='function') addAudit('إضافة مستخدم', username);
      try{
        if(typeof isNetworkMode==='function' && isNetworkMode() && typeof apiCreateUser==='function')
          await apiCreateUser(username, passTrim, payload.name, payload.role, permissions, payload.role, payload.jobTitle, '');
      }catch(e){ console.warn(e); }
    }

    if(typeof persistUsersNow==='function') await persistUsersNow();
    else if(typeof saveData==='function') await saveData(true);

    closeModal();
    showToast(passTrim ? 'تم الحفظ — كلمة المرور واسم المستخدم محدّثان' : 'تم حفظ بيانات المستخدم');
    if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
  });
}

function initUsersEvents(){
  const search = document.getElementById('usersSearchInput');
  if(search){
    search.addEventListener('input', ()=>{
      window.__usersSearch = search.value||'';
      // إعادة رسم سريعة للبطاقات فقط
      if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
      const el = document.getElementById('usersSearchInput');
      if(el){ el.focus(); const v=el.value; el.setSelectionRange(v.length,v.length); }
    });
  }
  const add = document.getElementById('btnAddUser');
  if(add) add.addEventListener('click', ()=>{
    if(typeof canManageUsers==='function' && !canManageUsers()){ showToast('ليس لديك صلاحية إدارة المستخدمين'); return; }
    openUserModal(null);
  });
  document.querySelectorAll('.btn-edit-user').forEach(b=>{
    b.addEventListener('click', ()=>{
      if(typeof canManageUsers==='function' && !canManageUsers()){ showToast('ليس لديك صلاحية إدارة المستخدمين'); return; }
      const un = b.getAttribute('data-user');
      const u = (DATA.users||[]).find(x=>x.username===un);
      if(u) openUserModal(u);
    });
  });
  document.querySelectorAll('.btn-reset-pass').forEach(b=>{
    b.addEventListener('click', async ()=>{
      const un = b.getAttribute('data-user');
      const u = (DATA.users||[]).find(x=>x && String(x.username)===String(un))
        || (DATA.users||[]).find(x=>x && String(x.username).toLowerCase()===String(un||'').toLowerCase());
      if(!u){ showToast('المستخدم غير موجود'); return; }
      const ok = await confirmApp('تعيين كلمة مرور جديدة للمستخدم «'+(u.name||un)+'»؟', {
        title: 'تغيير كلمة المرور', okLabel: 'متابعة', cancelLabel: 'إلغاء', danger: false, icon: '🔑'
      });
      if(!ok) return;
      openModal(`
        <div class="modal-header"><h3>كلمة مرور جديدة — ${escapeHtml(u.name||un)}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
        <div class="modal-body form-grid form-grid-2">
          <label>كلمة المرور الجديدة *
            <input class="input" id="uNewPass" type="password" autocomplete="new-password" autofocus>
          </label>
          <label>تأكيد كلمة المرور *
            <input class="input" id="uNewPass2" type="password" autocomplete="new-password">
          </label>
          <p style="grid-column:1/-1;margin:0;font-size:12.5px;color:var(--ink-soft);">8 أحرف على الأقل. بعد الحفظ استخدم الكلمة الجديدة في شاشة الدخول.</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" id="btnSavePass">حفظ كلمة المرور</button>
          <button type="button" class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        </div>
      `);
      const doSavePass = async ()=>{
        const p1 = (document.getElementById('uNewPass')?.value)||'';
        const p2 = (document.getElementById('uNewPass2')?.value)||'';
        const err = typeof validateNewPassword==='function' ? validateNewPassword(p1.trim(), p2.trim())
          : (p1.trim().length<8?'كلمة المرور 8 أحرف على الأقل':(p1.trim()!==p2.trim()?'كلمتا المرور غير متطابقتين':''));
        if(err){ showToast(err); return; }
        const newPass = p1.trim();
        // ابحث عن المستخدم من جديد (مرجع حديث)
        const target = (DATA.users||[]).find(x=>x && (x.username===u.username || x.id===u.id)) || u;
        try{ await applyLocalPassword(target, newPass); }
        catch(e){ showToast(String(e && e.message || 'تعذر تشفير كلمة المرور')); return; }
        try{
          if(typeof isNetworkMode==='function' && isNetworkMode() && target.id && typeof apiResetUserPassword==='function'){
            const r = await apiResetUserPassword(target.id, newPass);
            if(r && r.ok===false){ showToast(r.error||'تعذر الحفظ على الشبكة'); /* نكمل الحفظ المحلي */ }
          }
        }catch(e){ console.warn(e); }
        if(typeof addAudit==='function') addAudit('إعادة تعيين كلمة مرور', target.username||un);
        if(typeof persistUsersNow==='function') await persistUsersNow();
        else if(typeof saveData==='function') await saveData(true);
        closeModal();
        showToast('تم حفظ كلمة المرور الجديدة بنجاح');
      };
      document.getElementById('btnSavePass')?.addEventListener('click', doSavePass);
      document.getElementById('uNewPass2')?.addEventListener('keydown', (ev)=>{
        if(ev.key==='Enter'){ ev.preventDefault(); doSavePass(); }
      });
    });
  });
  document.querySelectorAll('.btn-del-user').forEach(b=>{
    b.addEventListener('click', async ()=>{
      if(typeof canManageUsers==='function' && !canManageUsers()){ showToast('ليس لديك صلاحية إدارة المستخدمين'); return; }
      const un = b.getAttribute('data-user');
      const target = (DATA.users||[]).find(x=>x && x.username===un);
      if(target && target.role==='admin'){
        const admins = (DATA.users||[]).filter(x=>x && x.role==='admin' && x.username!==un);
        if(!admins.length){ showToast('لا يمكن حذف المدير الوحيد'); return; }
      }
      const ok = await confirmDelete('حذف المستخدم «'+un+'» نهائياً؟\nلن يتمكن من تسجيل الدخول بعد الحذف.');
      if(!ok) return;
      DATA.users = (DATA.users||[]).filter(x=>x.username!==un);
      if(typeof addAudit==='function') addAudit('حذف مستخدم', un);
      if(typeof saveData==='function') saveData(true);
      showToast('تم حذف المستخدم');
      if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
    });
  });
}
