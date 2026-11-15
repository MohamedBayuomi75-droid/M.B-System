/* escapeHtml مُعرّفة في helpers.js (تُحمَّل لاحقًا) وتُستخدم هنا أيضًا */
/* ============================================================================
   وضع الشبكة: تعدد المستخدمين وتعدد الأجهزة على نفس الشبكة المحلية
   ميزة اختيارية بالكامل ومطفأة افتراضيًا — الوضع الافتراضي (standalone) يفضل
   يشتغل بالضبط زي قبل من غير أي تسجيل دخول ومن غير أي تغيير.
   ============================================================================ */

const NET_KEYS = {
  mode: 'mb_device_mode',       // 'standalone' | 'host' | 'client'
  hostUrl: 'mb_host_url',       // مثال: http://192.168.1.5:4173
  hostPort: 'mb_host_port',
  token: 'mb_auth_token',
  userCache: 'mb_auth_user_cache'
};

let currentUser = null; // { username, role, name }
let __netBaseUrl = '';
let __netPollTimer = null;

function getDeviceMode(){
  try{ return localStorage.getItem(NET_KEYS.mode) || 'standalone'; }catch(e){ return 'standalone'; }
}
function setDeviceMode(mode){
  try{ localStorage.setItem(NET_KEYS.mode, mode); }catch(e){}
}
function getHostPort(){
  try{ return Number(localStorage.getItem(NET_KEYS.hostPort)) || 4173; }catch(e){ return 4173; }
}
function setHostPort(p){
  try{ localStorage.setItem(NET_KEYS.hostPort, String(p||4173)); }catch(e){}
}
function getHostUrl(){
  try{ return localStorage.getItem(NET_KEYS.hostUrl) || ''; }catch(e){ return ''; }
}
function setHostUrl(u){
  try{ localStorage.setItem(NET_KEYS.hostUrl, u||''); }catch(e){}
}
function getAuthToken(){
  try{ return localStorage.getItem(NET_KEYS.token) || ''; }catch(e){ return ''; }
}
function setAuthToken(t){
  try{
    if(t) localStorage.setItem(NET_KEYS.token, t);
    else localStorage.removeItem(NET_KEYS.token);
  }catch(e){}
}
function cacheCurrentUser(u){
  currentUser = u;
  try{ localStorage.setItem(NET_KEYS.userCache, JSON.stringify(u||null)); }catch(e){}
}
function loadCachedUser(){
  try{
    const raw = localStorage.getItem(NET_KEYS.userCache);
    currentUser = raw ? JSON.parse(raw) : null;
  }catch(e){ currentUser = null; }
  return currentUser;
}

function isNetworkMode(){ return getDeviceMode() !== 'standalone'; }

function apiUrl(p){ return __netBaseUrl.replace(/\/$/,'') + p; }

async function apiCall(method, p, body){
  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if(token) headers['Authorization'] = 'Bearer ' + token;
  let res;
  try{
    res = await fetch(apiUrl(p), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  }catch(e){
    return { ok:false, status:0, error:'تعذر الاتصال بجهاز السيرفر — تأكد إنكم على نفس الشبكة وإن البرنامج شغال على الجهاز التاني' };
  }
  let json;
  try{ json = await res.json(); }catch(e){ json = { ok:false, error:'رد غير صالح من السيرفر' }; }
  json.status = res.status;
  return json;
}

async function apiLogin(username, password){
  const r = await apiCall('POST', '/api/login', { username, password });
  if(r.ok){
    setAuthToken(r.token);
    cacheCurrentUser({ username: r.username, role: r.role, name: r.name, perms: r.perms || null, mustChangePassword: !!r.mustChangePassword });
  }
  return r;
}
async function apiLogout(){
  try{ await apiCall('POST', '/api/logout'); }catch(e){}
  setAuthToken('');
  cacheCurrentUser(null);
}
async function apiGetData(){ return apiCall('GET', '/api/data'); }
async function apiSaveData(data, expectedVersion){ return apiCall('POST', '/api/data', { data, expectedVersion }); }
async function apiCreateUser(username, password, name, role, perms, roleTemplate, jobTitle, email){ return apiCall('POST', '/api/users', { action:'create', username, password, name, role, perms, roleTemplate, jobTitle, email }); }
async function apiResetUserPassword(id, password){ return apiCall('POST', '/api/users', { action:'resetPassword', id, password }); }
/** تحديث موحّد للمستخدم (ملف شخصي + صلاحيات + حالة + كلمة سر) */
async function apiUpdateUser(id, payload){ return apiCall('POST', '/api/users', Object.assign({ action:'update', id }, payload||{})); }

let __lastKnownVersion = 0;
let __netSaveInFlight = false;

/** تطبيق بيانات السيرفر على DATA بالكامل (كل المفاتيح) مع الحفاظ على الافتراضيات الناقصة */
function applyServerDataToState(parsed){
  if(!parsed || typeof parsed !== 'object') return;
  Object.keys(parsed).forEach(k=>{
    const v = parsed[k];
    if(v === undefined || v === null) return;
    if(k === 'settings' && typeof v === 'object') DATA.settings = Object.assign({}, DATA.settings||{}, v);
    else DATA[k] = v;
  });
}

/** تحميل البيانات من السيرفر بدل الملف المحلي — يُستخدم فقط في وضع الشبكة */
async function loadDataNetwork(){
  const r = await apiGetData();
  if(!r.ok){
    if(r.status === 401){ showLoginScreen('انتهت الجلسة — سجّل الدخول مرة أخرى'); return false; }
    showToast(r.error || 'تعذر تحميل البيانات من السيرفر');
    return false;
  }
  const parsed = r.data || {};
  applyServerDataToState(parsed);
  __lastKnownVersion = r.version || 0;
  try{ sanitizeLoadedData(); }catch(e){}
  try{ migrateLegacyFields(); }catch(e){}
  try{ rebuildIndexes(); }catch(e){}
  return true;
}

/** حفظ البيانات على السيرفر بدل الملف المحلي — يُستخدم فقط في وضع الشبكة
 * السيرفر بيدمج تعديلاتنا مع أي تعديلات وصلت من مستخدمين تانيين في نفس اللحظة
 * (بدل ما يرفض الحفظ كامل)، وبيرجّع النسخة النهائية المدموجة. */
async function saveDataNetwork(){
  rebuildIndexes();
  __netSaveInFlight = true;
  const r = await apiSaveData(DATA, __lastKnownVersion);
  __netSaveInFlight = false;
  if(!r.ok){
    if(r.status === 401){ showLoginScreen('انتهت الجلسة — سجّل الدخول مرة أخرى'); return false; }
    showToast(r.error || 'تعذر الحفظ على السيرفر');
    return false;
  }
  __lastKnownVersion = r.version || __lastKnownVersion;
  if(r.data){
    // نطبّق النسخة المدموجة النهائية من السيرفر (فيها تعديلنا + أي تعديلات مستخدمين تانيين)
    applyServerDataToState(r.data);
    try{ migrateLegacyFields(); }catch(e){}
    try{ rebuildIndexes(); }catch(e){}
    if(r.conflictNote){
      showToast('⚠️ ' + r.conflictNote);
      // متعدّش الرسم لو المستخدم بيكتب عشان ما تضيعش اللي كتبه
      if(!(typeof isUserTypingOrEditing==='function' && isUserTypingOrEditing())){
        try{ rerenderCurrentPage(); }catch(e){ try{ render(); }catch(e2){} }
      }
    }
  }
  return true;
}

/** هل المستخدم حالياً بيكتب في خانة؟ لو أيوه منعملش إعادة رسم كاملة عشان ما تتعطلش الخانات */
function isUserTypingOrEditing(){
  try{
    if(document.querySelector('.modal-overlay')) return true;
    const ae = document.activeElement;
    if(!ae) return false;
    const tag = (ae.tagName || '').toUpperCase();
    if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if(ae.isContentEditable) return true;
    // لو الخانة جوه فورم تعديل مستخدم أو أي card فيه إدخال
    if(ae.closest && (ae.closest('#usrEditPanel') || ae.closest('.form-grid') || ae.closest('.modal'))) return true;
  }catch(e){}
  return false;
}

function startNetworkPolling(){
  stopNetworkPolling();
  __netPollTimer = setInterval(async ()=>{
    if(!isNetworkMode()) return;
    if(typeof __savePending !== 'undefined' && __savePending) return;
    if(__netSaveInFlight) return;
    const r = await apiCall('GET', '/api/data');
    if(r.ok && r.version !== __lastKnownVersion){
      const typing = isUserTypingOrEditing();
      // دايماً نحدّث الذاكرة بالبيانات الجديدة
      await loadDataNetwork();
      // لو المستخدم بيكتب أو بيعدّل فورم — منأجل الرسم عشان الخانات ما تتجمّدش
      if(typing || isUserTypingOrEditing()) return;
      try{ rerenderCurrentPage(); }catch(e){ try{ render(); }catch(e2){} }
    }
  }, 4000);
}
function stopNetworkPolling(){ if(__netPollTimer){ clearInterval(__netPollTimer); __netPollTimer = null; } }

/* ---------------- شاشة تسجيل الدخول ---------------- */

/* ========== تسجيل دخول محلي (دائماً قبل فتح البرنامج) ========== */
const LOCAL_SESSION_KEY = 'mb_local_session';

function ensureLocalAdminUser(){
  if(!DATA.users) DATA.users = [];
  try{ if(typeof restoreUsersCredentialsIfNeeded==='function') restoreUsersCredentialsIfNeeded(); }catch(_e){}
  if(!DATA.users.length){
    DATA.users.push({
      id: 'u_admin_default',
      username: 'admin',
      name: 'المدير',
      salt: DEFAULT_ADMIN_SALT,
      hash: DEFAULT_ADMIN_HASH,
      mustChangePassword: true,   // لازم يغيّر كلمة المرور الافتراضية عند أول دخول
      role: 'admin',
      active: true,
      permissions: (typeof roleTemplates==='function' ? roleTemplates().admin : null)
    });
    try{ if(typeof backupUsersCredentials==='function') backupUsersCredentials(); }catch(_e){}
    try{ if(typeof saveData==='function') saveData(true); }catch(_e){}
  } else {
    // تأكد أن لكل مستخدم id
    DATA.users.forEach(u=>{
      if(u && !u.id) u.id = 'u_' + String(u.username||'user').toLowerCase().replace(/\s+/g,'_');
    });
  }
}

function getLocalSession(){
  try{
    const raw = sessionStorage.getItem(LOCAL_SESSION_KEY) || localStorage.getItem(LOCAL_SESSION_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}
function setLocalSession(user, remember){
  const payload = JSON.stringify({
    username: user.username,
    name: user.name||user.username,
    role: user.role||'admin',
    at: Date.now()
  });
  try{ sessionStorage.setItem(LOCAL_SESSION_KEY, payload); }catch(_e){}
  try{
    if(remember) localStorage.setItem(LOCAL_SESSION_KEY, payload);
    else localStorage.removeItem(LOCAL_SESSION_KEY);
  }catch(_e){}
}
function clearLocalSession(){
  try{ sessionStorage.removeItem(LOCAL_SESSION_KEY); }catch(_e){}
  try{ localStorage.removeItem(LOCAL_SESSION_KEY); }catch(_e){}
  currentUser = null;
  setAuthToken('');
  cacheCurrentUser(null);
}

/* ========== كلمات المرور المحلية (وضع الجهاز الواحد) ==========
   - ما بنخزّنش أي كلمة مرور نصية: بنخزّن salt + hash (scrypt) محسوبين في العملية الرئيسية (auth.js)،
     وبنفس صيغة حسابات السيرفر (server.js) — فنفس الحساب يتحقق منه في الوضعين.
   - الحساب الافتراضي (admin) عليه mustChangePassword: لازم يغيّر كلمة المرور عند أول دخول.
   - حسابات قديمة كانت بكلمة مرور نصية بتتحوّل تلقائياً أول ما البرنامج يفتح (upgradeLegacyPasswords). */
const DEFAULT_PASSWORDS = ['admin123', '123456'];            // معروفة — ممنوع تتستخدم كلمة مرور فعلية
const MIN_PASSWORD_LENGTH = 8;
// صيغة كلمة المرور الافتراضية للحساب الأول (salt ثابت معروف + hash لـ admin123) — مؤقتة لحد أول تغيير إجباري
const DEFAULT_ADMIN_SALT = '4f1c7b2e9a6d3085c1e7f2a94b6d0c38';
const DEFAULT_ADMIN_HASH = 'a7773bf820b6d94c8deeda8e55723c557d11633e8c0f9b1962488cc8170e7fe02cdb54c1e55a91da61712ac0551bd5e7c281a20ac710de603fc7e6b6a5daf15d';

function isDefaultPassword(p){ return DEFAULT_PASSWORDS.indexOf(String(p==null?'':p).toLowerCase()) >= 0; }

async function localHashPassword(password){
  if(!(window.desktopApi && typeof window.desktopApi.hashPassword === 'function')) throw new Error('تشفير كلمة المرور متاح في نسخة سطح المكتب فقط');
  const r = await window.desktopApi.hashPassword(String(password==null?'':password));
  if(!r || !r.salt || !r.hash) throw new Error('تعذر تشفير كلمة المرور');
  return { salt: r.salt, hash: r.hash };
}
async function localVerifyPassword(password, salt, hash){
  try{
    if(!salt || !hash) return false;
    if(!(window.desktopApi && typeof window.desktopApi.verifyPassword === 'function')) return false;
    return !!(await window.desktopApi.verifyPassword(String(password==null?'':password), salt, hash));
  }catch(_e){ return false; }
}

/** تطبيق كلمة مرور محلياً: salt/hash جديدين + مسح أي كلمة نصية قديمة */
async function applyLocalPassword(user, newPassword){
  if(!user) return;
  const h = await localHashPassword(newPassword);
  user.salt = h.salt;
  user.hash = h.hash;
  try{ delete user.password; }catch(_e){ user.password = undefined; }
  user.passwordUpdatedAt = new Date().toISOString();
  user.mustChangePassword = false;
  if(!user.id) user.id = 'u_' + String(user.username||'user').toLowerCase() + '_' + Date.now().toString(36);
}

/** نسخة احتياطية لبيانات الدخول محلياً (hash فقط — بدون أي كلمة نصية) تُستخدم لو data.json رجع نسخة قديمة */
function backupUsersCredentials(){
  try{
    const list = (DATA.users||[]).map(u=>({
      username: u.username,
      salt: u.salt || '',
      hash: u.hash || '',
      mustChangePassword: !!u.mustChangePassword,
      name: u.name||'',
      role: u.role||'viewer',
      active: u.active!==false,
      id: u.id||'',
      passwordUpdatedAt: u.passwordUpdatedAt||''
    }));
    localStorage.setItem('hr_users_cred', JSON.stringify(list));
  }catch(_e){}
}

function restoreUsersCredentialsIfNeeded(){
  try{
    const raw = localStorage.getItem('hr_users_cred');
    if(!raw) return;
    const list = JSON.parse(raw);
    if(!Array.isArray(list) || !list.length) return;
    DATA.users = DATA.users || [];
    list.forEach(b=>{
      if(!b || !b.username || !b.salt || !b.hash) return;   // نسخ قديمة بكلمة نصية: بنتجاهلها (بتتمسح عند أول نسخة جديدة)
      const u = DATA.users.find(x=>x && String(x.username).toLowerCase()===String(b.username).toLowerCase());
      if(!u) return;   // لا نُضيف مستخدمين محذوفين تلقائياً — فقط نحدّث الموجود
      const hasCred = !!(u.salt && u.hash) || (u.password != null && u.password !== '');
      if(!hasCred){
        u.salt = b.salt; u.hash = b.hash; u.mustChangePassword = !!b.mustChangePassword;
        if(b.passwordUpdatedAt) u.passwordUpdatedAt = b.passwordUpdatedAt;
      } else if(b.passwordUpdatedAt && (!u.passwordUpdatedAt || b.passwordUpdatedAt > u.passwordUpdatedAt)){
        // النسخة الاحتياطية أحدث
        u.salt = b.salt; u.hash = b.hash; u.mustChangePassword = !!b.mustChangePassword;
        u.passwordUpdatedAt = b.passwordUpdatedAt;
        try{ delete u.password; }catch(_e){}
      }
    });
  }catch(_e){}
}

/** ترقية لمرة واحدة: أي كلمة مرور نصية قديمة → salt/hash، وحذف النص من البيانات ومن النسخ المحلية */
async function upgradeLegacyPasswords(){
  let changed = false;
  for(const u of (DATA.users||[])){
    if(!u) continue;
    if(u.password != null && String(u.password) !== ''){
      const plain = String(u.password);
      const h = await localHashPassword(plain);
      u.salt = h.salt; u.hash = h.hash;
      if(isDefaultPassword(plain)) u.mustChangePassword = true;   // كلمة افتراضية معروفة → لازم تتغيّر
      if(!u.passwordUpdatedAt) u.passwordUpdatedAt = new Date().toISOString();
      try{ delete u.password; }catch(_e){}
      changed = true;
    } else if('password' in u){
      try{ delete u.password; }catch(_e){}
      changed = true;
    }
  }
  // امسح أي نسخة محلية قديمة فيها كلمات مرور نصية
  let legacyCache = false;
  try{
    const raw = localStorage.getItem('hr_users_cred');
    if(raw && /"password"\s*:/.test(raw)) legacyCache = true;
    const rawData = localStorage.getItem('hr-data');
    if(rawData && /"password"\s*:\s*"[^"]/.test(rawData)) localStorage.removeItem('hr-data');
  }catch(_e){}
  if(changed || legacyCache) backupUsersCredentials();
  if(changed){ try{ if(typeof saveData==='function') await saveData(true); }catch(_e){} }
  return changed;
}

/** حفظ فوري للمستخدمين على القرص + نسخة احتياطية */
async function persistUsersNow(){
  backupUsersCredentials();
  try{
    if(window.desktopApi && window.desktopApi.saveDataSync){
      window.desktopApi.saveDataSync(DATA);
    }
  }catch(_e){}
  try{
    if(typeof saveData==='function') await saveData(true);
  }catch(_e){}
  // نسخة إضافية في localStorage للبيانات كاملة (شبكة أمان) — الحسابات فيها hash فقط
  try{ localStorage.setItem('hr-data', JSON.stringify(DATA)); }catch(_e){}
}

function validateNewPassword(p1, p2){
  const a = String(p1||'');
  const b = String(p2||'');
  if(a.length < MIN_PASSWORD_LENGTH) return 'كلمة المرور لازم ' + MIN_PASSWORD_LENGTH + ' أحرف على الأقل';
  if(a.length > 128) return 'كلمة المرور طويلة جداً';
  if(isDefaultPassword(a)) return 'كلمة المرور دي معروفة (افتراضية) — اختار كلمة مختلفة';
  if(b !== '' && a !== b) return 'كلمتا المرور غير متطابقتين';
  return '';
}

/** عدّاد محاولات الدخول الفاشلة (قفل مؤقت) */
try{ if(typeof window!=='undefined') window.__loginFail = window.__loginFail || { count:0, until:0 }; }catch(_e){}

async function verifyLocalLogin(username, password){
  ensureLocalAdminUser();
  const now = Date.now();
  const failSt = _loginFailState();
  if(failSt.until && now < failSt.until){
    const sec = Math.ceil((failSt.until - now)/1000);
    return { ok:false, error:'تم إيقاف المحاولات مؤقتاً — انتظر '+sec+' ثانية' };
  }
  const uname = String(username||'').trim().toLowerCase();
  const pass = String(password||'');
  const u = (DATA.users||[]).find(x=>
    x && String(x.username||'').trim().toLowerCase()===uname && x.active!==false
  );
  const bad = ()=>{ _registerLoginFail(); return { ok:false, error:'اسم المستخدم أو كلمة المرور غير صحيحة' }; };
  if(!u) return bad();
  // 1) الحالة الطبيعية: salt + hash
  if(u.salt && u.hash && (u.password == null || u.password === '')){
    if(await localVerifyPassword(pass, u.salt, u.hash)){ _clearLoginFail(); return { ok:true, user:u }; }
    return bad();
  }
  // 2) حساب لسه بكلمة نصية قديمة (قبل ما الترقية تشتغل): نتحقق ونحوّله فوراً لـ hash
  if(u.password != null && u.password !== '' && String(u.password) === pass){
    try{
      const h = await localHashPassword(pass);
      u.salt = h.salt; u.hash = h.hash;
      if(isDefaultPassword(pass)) u.mustChangePassword = true;
      try{ delete u.password; }catch(_e){}
      if(typeof persistUsersNow==='function') await persistUsersNow();
    }catch(_e){}
    _clearLoginFail();
    return { ok:true, user:u };
  }
  return bad();
}

/* ========== تغيير كلمة المرور الإجباري ==========
   بيظهر فوق البرنامج كله (مش نافذة تتقفل) لو حساب المستخدم الحالي عليه mustChangePassword
   — الحساب الافتراضي admin / admin123، أو أي كلمة افتراضية معروفة اتحوّلت من نسخة قديمة. */
function needsForcedPasswordChange(){
  try{
    if(typeof currentUser === 'undefined' || !currentUser) return false;
    if(typeof isNetworkMode === 'function' && isNetworkMode()) return !!currentUser.mustChangePassword;
    const rec = (DATA.users||[]).find(x=>x && x.username === currentUser.username);
    return !!(rec && rec.mustChangePassword);
  }catch(_e){ return false; }
}

function maybeForcePasswordChange(){
  const existing = document.getElementById('forcePwdOverlay');
  if(!needsForcedPasswordChange()){
    if(existing){ existing.remove(); try{ document.getElementById('app')?.removeAttribute('inert'); }catch(_e){} }
    return;
  }
  if(existing) return;
  const ov = document.createElement('div');
  ov.id = 'forcePwdOverlay';
  ov.className = 'force-pwd-overlay';
  ov.setAttribute('role','dialog');
  ov.setAttribute('aria-modal','true');
  ov.innerHTML = `
    <div class="force-pwd-card" dir="rtl">
      <h3>🔐 لازم تغيّر كلمة المرور</h3>
      <p>الحساب ده بيستخدم كلمة مرور افتراضية معروفة. اختار كلمة مرور جديدة (${MIN_PASSWORD_LENGTH} أحرف على الأقل) عشان تكمل.</p>
      <label>كلمة المرور الجديدة<input class="input" id="fpNew" type="password" autocomplete="new-password"></label>
      <label>تأكيد كلمة المرور<input class="input" id="fpNew2" type="password" autocomplete="new-password"></label>
      <div class="force-pwd-err" id="fpErr" role="alert"></div>
      <div class="force-pwd-actions">
        <button type="button" class="btn btn-primary" id="fpSave">حفظ والمتابعة</button>
        <button type="button" class="btn btn-outline" id="fpLogout">تسجيل الخروج</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  try{ document.getElementById('app')?.setAttribute('inert',''); }catch(_e){}

  const showErr = (m)=>{ const el = document.getElementById('fpErr'); if(el) el.textContent = m || ''; };
  const save = async ()=>{
    const p1 = (document.getElementById('fpNew')?.value||'');
    const p2 = (document.getElementById('fpNew2')?.value||'');
    const err = validateNewPassword(p1, p2);
    if(err){ showErr(err); return; }
    if(p2 === ''){ showErr('أكّد كلمة المرور'); return; }
    const btn = document.getElementById('fpSave');
    if(btn){ btn.disabled = true; }
    try{
      if(typeof isNetworkMode === 'function' && isNetworkMode()){
        const r = await apiCall('POST', '/api/me/password', { newPassword: p1 });
        if(!r.ok){ showErr(r.error || 'تعذر حفظ كلمة المرور'); return; }
        currentUser.mustChangePassword = false;
        cacheCurrentUser(currentUser);
      } else {
        const rec = (DATA.users||[]).find(x=>x && x.username === currentUser.username);
        if(!rec){ showErr('الحساب غير موجود'); return; }
        await applyLocalPassword(rec, p1);
        currentUser.mustChangePassword = false;
        if(typeof addAudit === 'function') addAudit('تغيير كلمة المرور الإجباري', rec.username);
        await persistUsersNow();
      }
      document.getElementById('forcePwdOverlay')?.remove();
      try{ document.getElementById('app')?.removeAttribute('inert'); }catch(_e){}
      try{ showToast('✅ تم تغيير كلمة المرور'); }catch(_e){}
    }catch(e){
      showErr(String(e && e.message || 'حدث خطأ أثناء الحفظ'));
    }finally{
      const b = document.getElementById('fpSave'); if(b) b.disabled = false;
    }
  };
  document.getElementById('fpSave')?.addEventListener('click', save);
  document.getElementById('fpNew2')?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); save(); } });
  document.getElementById('fpNew')?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); document.getElementById('fpNew2')?.focus(); } });
  document.getElementById('fpLogout')?.addEventListener('click', async ()=>{
    document.getElementById('forcePwdOverlay')?.remove();
    try{ document.getElementById('app')?.removeAttribute('inert'); }catch(_e){}
    try{ if(typeof isNetworkMode === 'function' && isNetworkMode()) await apiLogout(); }catch(_e){}
    try{ clearLocalSession(); }catch(_e){}
    location.reload();
  });
  setTimeout(()=>{ document.getElementById('fpNew')?.focus(); }, 30);
}

function _loginFailState(){
  try{
    if(typeof window==='undefined') return { count:0, until:0 };
    if(!window.__loginFail) window.__loginFail = { count:0, until:0 };
    return window.__loginFail;
  }catch(_e){ return { count:0, until:0 }; }
}
function _registerLoginFail(){
  const st = _loginFailState();
  st.count = (st.count||0) + 1;
  if(st.count >= 5){
    st.until = Date.now() + 60000;
    st.count = 0;
  }
}
function _clearLoginFail(){
  try{ if(typeof window!=='undefined') window.__loginFail = { count:0, until:0 }; }catch(_e){}
}

function isLoggedIn(){
  if(typeof isNetworkMode==='function' && isNetworkMode()){
    return !!(getAuthToken() && (currentUser || loadCachedUser()));
  }
  const s = getLocalSession();
  if(!s || !s.username) return false;
  // جلسة أقدم من 12 ساعة في session فقط — localStorage يبقى حتى الخروج
  return true;
}

function applySessionUser(){
  if(typeof isNetworkMode==='function' && isNetworkMode()){
    loadCachedUser();
    return currentUser;
  }
  const s = getLocalSession();
  if(!s) return null;
  ensureLocalAdminUser();
  const u = (DATA.users||[]).find(x=>x && x.username===s.username) || {
    username: s.username, name: s.name, role: s.role||'admin'
  };
  currentUser = { username: u.username, name: u.name||u.username, role: u.role||'admin', permissions: u.permissions||null, mustChangePassword: !!u.mustChangePassword };
  cacheCurrentUser(currentUser);
  return currentUser;
}

function showLoginScreen(message){
  const app = document.getElementById('app');
  if(!app) return;
  const net = typeof isNetworkMode==='function' && isNetworkMode();
  const mode = typeof getDeviceMode==='function' ? getDeviceMode() : 'standalone';
  const co = (DATA && DATA.settings) || {};
  const company = (co.companyName||'').trim() || brandName();
  const logoSrc = co.logoDataUrl || co.logoPath || 'assets/logo.png';
  const year = new Date().getFullYear();
  const ver = (typeof window.desktopApi!=='undefined' && window.desktopApi.getAppVersion)
    ? '' : '';
  const modeLabel = mode==='host' ? 'مضيف الشبكة' : (mode==='client' ? 'عميل الشبكة' : 'تشغيل محلي');
  const modeClass = mode==='host' ? 'host' : (mode==='client' ? 'client' : '');
  const msgHtml = message
    ? `<div class="login-err show" id="loginErr">${escapeHtml(message)}</div>`
    : `<div class="login-err" id="loginErr" role="alert"></div>`;

  app.innerHTML = `
    <div class="login-screen" role="main">
      <div class="login-shell">
        <aside class="login-aside" aria-hidden="true">
          <div class="login-aside-inner">
            <div class="login-aside-badge">${escapeHtml(brandName())}</div>
            <h2>${escapeHtml(company)}</h2>
            <p class="login-aside-desc">منصة واحدة لإدارة القوى العاملة والمعدات والمستحقات — بدقة، صلاحيات واضحة، وتقارير جاهزة.</p>
            <ul class="login-features">
              <li><span>✓</span> بيانات آمنة محلياً أو على الشبكة</li>
              <li><span>✓</span> صلاحيات حسب الدور والمهام</li>
              <li><span>✓</span> يوميات · مستحقات · أرشيف · تقارير</li>
            </ul>
          </div>
          <div class="login-aside-foot">
            <span>© ${year} · جميع الحقوق محفوظة</span>
          </div>
        </aside>
        <section class="login-panel">
          <div class="login-panel-head">
            <div class="login-logo-wrap">
              <img class="login-logo" src="${escapeHtml(logoSrc)}" alt="شعار المؤسسة" onerror="this.onerror=null;this.src='assets/logo.png';this.onerror=function(){this.parentElement.style.display='none'}">
            </div>
            <h1>تسجيل الدخول</h1>
            <p>أدخل بيانات حسابك للوصول إلى النظام</p>
            <div class="login-mode-chip ${modeClass}">${escapeHtml(modeLabel)}</div>
          </div>
          ${msgHtml}
          <form id="loginForm" autocomplete="on" onsubmit="return false;">
            <div class="login-field">
              <label for="loginUsername">اسم المستخدم</label>
              <div class="login-input-wrap">
                <span class="login-input-ico" aria-hidden="true">👤</span>
                <input id="loginUsername" class="input" type="text" name="username" autocomplete="username" placeholder="أدخل اسم المستخدم" autofocus>
              </div>
            </div>
            <div class="login-field">
              <label for="loginPassword">كلمة المرور</label>
              <div class="login-input-wrap login-pass-wrap">
                <span class="login-input-ico" aria-hidden="true">🔑</span>
                <input id="loginPassword" class="input" type="password" name="password" autocomplete="current-password" placeholder="أدخل كلمة المرور">
                <button type="button" class="login-toggle-pass" id="loginTogglePass" title="إظهار أو إخفاء" aria-label="إظهار كلمة المرور">👁</button>
              </div>
            </div>
            <div class="login-row">
              <label><input type="checkbox" id="loginRemember" checked> تذكرني على هذا الجهاز</label>
            </div>
            <button type="submit" class="login-btn" id="loginBtn">دخول إلى النظام</button>
          </form>
          <div class="login-divider"><span>ملاحظة</span></div>
          <div class="login-hint">
            ${net
              ? (mode==='host'
                  ? 'جهاز المضيف نشط — استخدم حساب الشبكة المعتمد من المدير'
                  : 'تأكد أن جهازك على نفس شبكة المضيف قبل الدخول')
              : 'الحساب الافتراضي: <code>admin</code> / <code>admin123</code><br>يُفضّل تغيير كلمة المرور بعد أول دخول'}
          </div>
          <div class="login-secure">جلسة محمية — لا تشارك بيانات الدخول مع أحد</div>
        </section>
      </div>
    </div>
  `;

  const errBox = document.getElementById('loginErr');
  const showErr = (t)=>{
    if(!errBox) return;
    errBox.textContent = t||'';
    errBox.classList.add('show');
    errBox.style.display = 'flex';
  };
  document.getElementById('loginTogglePass')?.addEventListener('click', ()=>{
    const inp = document.getElementById('loginPassword');
    if(!inp) return;
    inp.type = inp.type==='password' ? 'text' : 'password';
  });

  const doLogin = async ()=>{
    const u = (document.getElementById('loginUsername')?.value||'').trim();
    const p = document.getElementById('loginPassword')?.value||'';
    const remember = !!document.getElementById('loginRemember')?.checked;
    if(!u || !p){ showErr('يرجى إدخال اسم المستخدم وكلمة المرور'); return; }
    const btn = document.getElementById('loginBtn');
    if(btn){ btn.disabled = true; btn.textContent = 'جاري التحقق...'; }

    try{
      if(net){
        const r = await apiLogin(u, p);
        if(!r.ok){
          showErr(r.error || 'تعذر تسجيل الدخول — تحقق من البيانات');
          if(btn){ btn.disabled=false; btn.textContent='دخول إلى النظام'; }
          return;
        }
        setLocalSession({ username:r.username||u, name:r.name||u, role:r.role||'viewer' }, remember);
        const ok = await loadDataNetwork();
        if(ok){ startNetworkPolling(); render(); }
        else showErr('تم الدخول لكن تعذر تحميل البيانات من الخادم');
      } else {
        const r = await verifyLocalLogin(u, p);
        if(!r.ok){
          showErr(r.error||'اسم المستخدم أو كلمة المرور غير صحيحة');
          if(btn){ btn.disabled=false; btn.textContent='دخول إلى النظام'; }
          return;
        }
        setLocalSession(r.user, remember);
        currentUser = {
          username: r.user.username,
          name: r.user.name||r.user.username,
          role: r.user.role||'admin',
          permissions: r.user.permissions||null,
          mustChangePassword: !!r.user.mustChangePassword
        };
        cacheCurrentUser(currentUser);
        if(typeof addAudit==='function') addAudit('تسجيل دخول', r.user.username);
        render();
      }
    }catch(e){
      showErr('حدث خطأ أثناء محاولة الدخول');
      console.error(e);
    }finally{
      if(btn){ btn.disabled=false; btn.textContent='دخول إلى النظام'; }
    }
  };

  document.getElementById('loginForm')?.addEventListener('submit', (e)=>{ e.preventDefault(); doLogin(); });
  document.getElementById('loginBtn')?.addEventListener('click', doLogin);
  document.getElementById('loginPassword')?.addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
  document.getElementById('loginUsername')?.addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('loginPassword')?.focus(); });
}


async function initAppEntry(){
  const mode = getDeviceMode();
  if(mode === 'standalone'){
    loadData();
    ensureLocalAdminUser();
    if(!isLoggedIn()){
      showLoginScreen();
      return;
    }
    applySessionUser();
    if(typeof render==='function') render();
    return;
  }

  if(mode === 'host'){
    if(!(window.desktopApi && typeof window.desktopApi.serverStart==='function')){
      document.getElementById('app').innerHTML = `<div class="page" style="padding:32px;text-align:center;max-width:480px;margin:40px auto;">
        <div style="font-size:42px;">💻</div>
        <h3>وضع المضيف متاح في نسخة سطح المكتب فقط</h3>
        <p style="color:var(--ink-soft);">افتح البرنامج من التثبيت على الجهاز (Electron) وليس من المتصفح.</p>
        <button class="btn btn-primary" id="btnNetFallbackStandalone">الرجوع لوضع جهاز واحد</button>
      </div>`;
      document.getElementById('btnNetFallbackStandalone')?.addEventListener('click', ()=>{ setDeviceMode('standalone'); location.reload(); });
      return;
    }
    let st;
    try{ st = await window.desktopApi.serverStart(getHostPort()); }
    catch(e){ st = { ok:false, error: String(e && e.message || e) }; }
    if(!st || st.ok===false){
      const err = (st && st.error) || 'تعذر تشغيل السيرفر';
      document.getElementById('app').innerHTML = `<div class="page" style="padding:32px;text-align:center;max-width:520px;margin:40px auto;">
        <div style="font-size:42px;">⚠️</div>
        <h3>تعذر تشغيل المضيف</h3>
        <p style="color:var(--ink-soft);line-height:1.7;">${escapeHtml(err)}</p>
        <p style="font-size:13px;color:var(--ink-soft);">جرّب تغيّر المنفذ من الإعدادات أو أعد تشغيل الجهاز.</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px;">
          <button class="btn btn-primary" id="btnNetRetryHost">إعادة المحاولة</button>
          <button class="btn btn-outline" id="btnNetFallbackStandalone">وضع جهاز واحد</button>
        </div>
      </div>`;
      document.getElementById('btnNetRetryHost')?.addEventListener('click', ()=> location.reload());
      document.getElementById('btnNetFallbackStandalone')?.addEventListener('click', ()=>{ setDeviceMode('standalone'); location.reload(); });
      return;
    }
    const port = st.port || getHostPort();
    setHostPort(port);
    __netBaseUrl = 'http://127.0.0.1:' + port;
    // احفظ عناوين LAN للأجهزة الأخرى
    try{
      const ips = st.ips || [];
      if(ips.length) localStorage.setItem('mb_lan_urls', JSON.stringify(ips.map(ip=>'http://'+ip+':'+port)));
    }catch(_e){}
  } else {
    __netBaseUrl = getHostUrl();
    if(!__netBaseUrl){ setDeviceMode('standalone'); loadData(); return; }
    // اختبار سريع للاتصال
    try{
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(), 4000);
      const r = await fetch(__netBaseUrl.replace(/\/$/,'') + '/api/ping', { signal: ctrl.signal });
      clearTimeout(t);
      if(!r.ok) throw new Error('HTTP '+r.status);
    }catch(e){
      document.getElementById('app').innerHTML = `<div class="page" style="padding:32px;text-align:center;max-width:520px;margin:40px auto;">
        <div style="font-size:42px;">📡</div>
        <h3>تعذر الاتصال بالمضيف</h3>
        <p style="color:var(--ink-soft);line-height:1.7;">العنوان: <code>${escapeHtml(__netBaseUrl)}</code></p>
        <p style="font-size:13px;color:var(--ink-soft);">تأكد أن جهاز المضيف يعمل، وأن الجهازين على نفس الشبكة، وأن جدار الحماية يسمح بالمنفذ.</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px;">
          <button class="btn btn-primary" id="btnNetRetryClient">إعادة المحاولة</button>
          <button class="btn btn-outline" id="btnNetFallbackStandalone">وضع جهاز واحد</button>
        </div>
      </div>`;
      document.getElementById('btnNetRetryClient')?.addEventListener('click', ()=> location.reload());
      document.getElementById('btnNetFallbackStandalone')?.addEventListener('click', ()=>{ setDeviceMode('standalone'); setHostUrl(''); location.reload(); });
      return;
    }
  }

  loadCachedUser();
  if(getAuthToken() && currentUser){
    const ok = await loadDataNetwork();
    if(ok){ startNetworkPolling(); render(); return; }
    // توكن منتهي — شاشة دخول
    setAuthToken('');
    cacheCurrentUser(null);
  }
  showLoginScreen();
}

/** تفعيل وضع المضيف ثم إعادة تشغيل الواجهة */
async function activateHostMode(port){
  port = Number(port) || 4173;
  if(!(window.desktopApi && window.desktopApi.serverStart)){
    return { ok:false, error:'متاح في نسخة سطح المكتب فقط' };
  }
  let st;
  try{ st = await window.desktopApi.serverStart(port); }
  catch(e){ return { ok:false, error:String(e&&e.message||e) }; }
  if(!st || st.ok===false) return { ok:false, error:(st&&st.error)||'فشل التشغيل' };
  const realPort = st.port || port;
  setHostPort(realPort);
  setHostUrl('http://127.0.0.1:'+realPort);
  setDeviceMode('host');
  try{
    const ips = st.ips || [];
    localStorage.setItem('mb_lan_urls', JSON.stringify(ips.map(ip=>'http://'+ip+':'+realPort)));
  }catch(_e){}
  return { ok:true, port: realPort, ips: st.ips||[], alreadyRunning: !!st.alreadyRunning };
}

/** تفعيل وضع العميل بعد اختبار الاتصال */
async function activateClientMode(url){
  url = String(url||'').trim().replace(/\/$/,'');
  if(!url) return { ok:false, error:'أدخل عنوان المضيف' };
  if(!/^https?:\/\//i.test(url)) url = 'http://'+url;
  try{
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), 5000);
    const r = await fetch(url + '/api/ping', { signal: ctrl.signal });
    clearTimeout(t);
    const j = await r.json().catch(()=>({}));
    if(!r.ok || j.ok===false) return { ok:false, error:'المضيف لم يرد بشكل صحيح' };
  }catch(e){
    return { ok:false, error:'تعذر الوصول للعنوان — تأكد من تشغيل المضيف ونفس الشبكة' };
  }
  setHostUrl(url);
  setDeviceMode('client');
  setAuthToken('');
  cacheCurrentUser(null);
  return { ok:true, url };
}

async function deactivateNetworkMode(){
  try{
    if(window.desktopApi && window.desktopApi.serverStop) await window.desktopApi.serverStop();
  }catch(_e){}
  setDeviceMode('standalone');
  setAuthToken('');
  cacheCurrentUser(null);
  try{ localStorage.removeItem('mb_lan_urls'); }catch(_e){}
  return { ok:true };
}
