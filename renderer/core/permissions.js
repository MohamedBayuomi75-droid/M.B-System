/* صلاحيات دقيقة لكل صفحة — في الوضع المحلي (standalone) الكل مسموح للأدمن الافتراضي */
const HR_PAGES = ['dashboard','employees','workers','supervisors','equipment','projects','drivers','transfers','performance','departments','attendance','workerAttendance','workerDues','expenses','costs','leaves','payroll','reports','archive','backup','users',
  // دفتر الموردين (مدمج) — مفاتيح الصفحات بادئتها ledger.
  'ledger.dashboard','ledger.suppliers','ledger.invoices','ledger.returns','ledger.payments','ledger.categories','ledger.quarterly','ledger.reports','ledger.archive',
  // صفحات الأقسام الجديدة (بعضها قيد الدمج)
  'general.overview','tasks.my','clients.dashboard','clients.customers','clients.workSurveys','clients.boqs','clients.contracts','clients.invoices','clients.guarantees','clients.comparison','clients.crm',
  'clients.collections','clients.accounts','clients.reports','clients.archive','warehouses.home','warehouses.reports','accounts.reports'];

function emptyPagePerms(view, add, edit, del){
  const o = {};
  HR_PAGES.forEach(p=>{ o[p] = { view:!!view, add:!!add, edit:!!edit, delete:!!del }; });
  return o;
}

function roleTemplates(){
  const T = {};
  T.admin = {
    editData:true, deleteData:true, manageUsers:true, manageNetwork:true,
    pages: emptyPagePerms(true, true, true, true)
  };
  T.hr = {
    editData:true, deleteData:true, manageUsers:false, manageNetwork:false,
    pages: (()=>{
      const p = emptyPagePerms(true, true, true, true);
      p.backup = { view:true, add:false, edit:false, delete:false };
      p.users = { view:false, add:false, edit:false, delete:false };
      return p;
    })()
  };
  T.viewer = {
    editData:false, deleteData:false, manageUsers:false, manageNetwork:false,
    pages: emptyPagePerms(true, false, false, false)
  };
  T.payroll = {
    editData:true, deleteData:false, manageUsers:false, manageNetwork:false,
    pages: (()=>{
      const p = emptyPagePerms(false, false, false, false);
      ['dashboard','employees','payroll','supervisors','reports','leaves','projects','workers','workerDues','expenses','costs'].forEach(k=>{
        p[k] = { view:true, add: (k==='payroll'||k==='leaves'), edit: (k==='payroll'||k==='leaves'), delete:false };
      });
      return p;
    })()
  };
  // قوالب أدوار قسم العملاء والمشاريع (حذف ممنوع إلا للمدير)
  const clientsRole = function(full, viewOnly){
    const p = emptyPagePerms(false, false, false, false);
    ['dashboard','general.overview','tasks.my'].forEach(function(k){ p[k] = { view:true, add:false, edit:false, delete:false }; });
    HR_PAGES.filter(function(k){ return k.indexOf('clients.') === 0; }).forEach(function(k){
      const f = full.indexOf(k) >= 0;
      p[k] = { view: f || viewOnly.indexOf(k) >= 0 || viewOnly.indexOf('*') >= 0, add: f, edit: f, delete: false };
    });
    if(full.indexOf('projects') >= 0) p.projects = { view:true, add:true, edit:true, delete:false };
    else p.projects = { view:true, add:false, edit:false, delete:false };
    return { editData:true, deleteData:false, manageUsers:false, manageNetwork:false, pages:p };
  };
  T.clientsSales = clientsRole(['clients.customers','clients.crm','clients.workSurveys','clients.boqs','clients.contracts','clients.comparison'], ['*']);
  T.clientsAccounts = clientsRole(['clients.invoices','clients.collections','clients.accounts','clients.guarantees'], ['*']);
  T.clientsProjects = clientsRole(['projects','clients.workSurveys','clients.boqs','clients.comparison','clients.guarantees'], ['*']);
  return T;
}

function getUserPerms(){
  if(typeof isNetworkMode==='function' && isNetworkMode() && typeof currentUser!=='undefined' && currentUser){
    if(currentUser.role==='admin') return roleTemplates().admin;
    if(currentUser.permissions) return currentUser.permissions;
    const T = roleTemplates();
    return T[currentUser.role] || T.viewer;
  }
  // standalone: full access
  return roleTemplates().admin;
}

function hasPagePermission(page, action){
  const perms = getUserPerms();
  if(!perms || !perms.pages) return true;
  const p = perms.pages[page];
  if(!p){
    // أي صفحة بمفتاح مركّب (ledger.* / clients.* / ...): مستخدم صلاحياته محفوظة قبل وجودها → مسموح للأدمن بس (الأمان بالافتراض)
    if(String(page).indexOf('.') > 0) return !!(typeof currentUser!=='undefined' && currentUser && currentUser.role === 'admin');
    return true;
  }
  if(action==='view') return !!p.view;
  if(action==='add') return !!p.add;
  if(action==='edit') return !!p.edit;
  if(action==='delete') return !!p.delete;
  return true;
}
function firstVisiblePage(){
  for(const p of HR_PAGES){
    if(hasPagePermission(p,'view')) return p;
  }
  return 'dashboard';
}
