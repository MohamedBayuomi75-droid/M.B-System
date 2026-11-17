/* =========================================================================
   web-overrides.js — بيتحمّل بعد كل ملفات الواجهة القديمة وقبل boot() (DOMContentLoaded).
   بيوصّل وضع «الشبكة» الموجود أصلًا في الواجهة (currentUser + permissions + apiCreateUser ...) بالسيرفر الجديد
   بدل ما نعدّل ملفات الواجهة. كل override هنا ليه سبب مكتوب.
   ========================================================================= */
/* global DATA, currentUser, __savePending, __saveTimer */
(function () {
  'use strict';
  // مرجع لـ DATA (متعرّف بـ let في state.js — مش على window)
  window.__webGetDATA = function () { return DATA; };

  // الويب = وضع شبكة دايمًا (الصلاحيات من currentUser، الحفظ على السيرفر، تسجيل اسم المستخدم في السجل)
  window.isNetworkMode = function () { return true; };
  // لكن getDeviceMode تفضل 'standalone' عشان boot مايشغّلش مسار الشبكة القديم (initAppEntry)
  window.getDeviceMode = function () { return 'standalone'; };

  // الجلسة من WebSession (التوكن في الذاكرة، مش localStorage)
  window.getAuthToken = function () { return window.WebSession.token(); };
  window.setAuthToken = function () {};
  window.loadCachedUser = function () { currentUser = window.WebSession.legacyUser(); return currentUser; };
  window.cacheCurrentUser = function (u) { currentUser = u; };
  window.isLoggedIn = function () { return !!window.WebSession.me(); };
  window.applySessionUser = function () { currentUser = window.WebSession.legacyUser(); return currentUser; };
  window.getLocalSession = function () { var u = window.WebSession.legacyUser(); return u ? { username: u.username, name: u.name, role: u.role } : null; };
  window.setLocalSession = function () {};
  window.clearLocalSession = function () { currentUser = null; };
  // الحساب الافتراضي/المستخدمين المحليين مش موجودين في الويب (المستخدمين من /api/users)
  window.ensureLocalAdminUser = function () { if (!Array.isArray(DATA.users)) DATA.users = []; };
  window.upgradeLegacyPasswords = function () { return Promise.resolve(); };
  window.restoreUsersCredentialsIfNeeded = function () {};
  window.backupUsersCredentials = function () {};
  // تغيير كلمة المرور الإجباري بيتعمل قبل تحميل البيانات (web-session.js)
  window.needsForcedPasswordChange = function () { return false; };

  // الدخول/الخروج
  window.showLoginScreen = function (message) { window.WebSession.showLogin(message); };
  window.apiLogout = function () { return window.WebSession.logout(); };
  window.apiLogin = function () { return Promise.resolve({ ok: false, error: 'استخدم شاشة دخول الويب' }); };

  // الحفظ/التحميل/المتابعة: سيرفر الويب + Socket.IO بدل /api/data القديم و polling كل 4 ثواني
  // عبر desktopApi.saveData (نفس مسار الديسكتوب — أي غلاف/مراقبة على desktopApi بيشتغل)
  window.saveDataNetwork = function () { return Promise.resolve(window.desktopApi.saveData(DATA)).then(function (r) { return !!(r && r.ok); }); };
  window.loadDataNetwork = function () { window.WebSync.resync(); return Promise.resolve(true); };
  window.startNetworkPolling = function () {};
  window.stopNetworkPolling = function () {};

  // ---- إدارة المستخدمين (pages-users.js بيستدعي دول في وضع الشبكة) → /api/users
  function overridesFrom(perms) {
    var pages = (perms && perms.pages) || {};
    return Object.keys(pages).map(function (k) { var p = pages[k] || {}; return { page: k, view: !!p.view, add: !!p.add, edit: !!p.edit, delete: !!p.delete }; });
  }
  function knownRole(r) { var T = typeof window.roleTemplates === 'function' ? window.roleTemplates() : {}; return T[r] ? r : (r === 'custom' ? 'custom' : 'viewer'); }
  async function refreshUsers() { try { DATA.users = await window.WebSync.fetchUsers(); } catch (e) {} }
  function errOf(r) { var m = r.body && r.body.message; return (Array.isArray(m) ? m.join('، ') : m) || 'تعذر الحفظ على السيرفر'; }
  window.apiCreateUser = async function (username, password, name, role, perms) {
    var body = { username: username, password: password, name: name || username, role: knownRole(role), pages: overridesFrom(perms) };
    if (perms) { body.editData = !!perms.editData; body.deleteData = !!perms.deleteData; if (perms.manageUsers) body.manageUsers = true; }
    var r = await window.WebSession.api('POST', '/api/users', body);
    if (!r.ok) { try { window.showToast('⚠️ ' + errOf(r)); } catch (e) {} }
    await refreshUsers();
    return { ok: r.ok, error: r.ok ? undefined : errOf(r) };
  };
  window.apiUpdateUser = async function (id, payload) {
    payload = payload || {};
    var body = {};
    if (payload.name !== undefined) body.name = payload.name;
    if (payload.role !== undefined) body.role = knownRole(payload.role);
    if (payload.active !== undefined) body.active = !!payload.active;
    if (payload.permissions) {
      body.pages = overridesFrom(payload.permissions);
      body.editData = !!payload.permissions.editData;
      body.deleteData = !!payload.permissions.deleteData;
      body.manageUsers = !!payload.permissions.manageUsers;
    }
    var r = await window.WebSession.api('PATCH', '/api/users/' + id, body);
    if (!r.ok) { try { window.showToast('⚠️ ' + errOf(r)); } catch (e) {} }
    await refreshUsers();
    return { ok: r.ok, error: r.ok ? undefined : errOf(r) };
  };
  window.apiResetUserPassword = async function (id, password) {
    var r = await window.WebSession.api('POST', '/api/users/' + id + '/reset-password', { newPassword: password, mustChangePassword: true });
    return { ok: r.ok, error: r.ok ? undefined : errOf(r) };
  };
  // مسار قديم عام (/api/me/password ...) — مش مستخدم في الويب
  window.apiCall = async function () { return { ok: false, status: 400, error: 'غير متاح في نسخة الويب' }; };

  // ---- إغلاق الصفحة: الواجهة القديمة بتتجاهل beforeunload في وضع الشبكة → نبعت المعلّق بـ keepalive
  function flushOnLeave() {
    try {
      var pending = (typeof __savePending !== 'undefined' && __savePending) || (typeof __saveTimer !== 'undefined' && __saveTimer);
      if (pending || window.WebSync.hasPendingLocalChanges(DATA)) window.WebSync.saveSync(DATA);
    } catch (e) {}
  }
  window.addEventListener('pagehide', flushOnLeave);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushOnLeave(); });
  window.addEventListener('online', function () { window.WebSync.save(DATA); });

  // ---- المرحلة 4: رابط مباشر لصفحة (من الواجهة الجديدة /app/): /legacy/#ledger.suppliers — لو المستخدم ليه صلاحية العرض
  function openHashPage() {
    var key = decodeURIComponent(String(location.hash || '').replace(/^#/, ''));
    if (!key || !/^[A-Za-z][\w.]*$/.test(key)) return;
    try {
      if (typeof HR_PAGES !== 'undefined' && HR_PAGES.indexOf(key) < 0) return;
      if (typeof hasPagePermission === 'function' && !hasPagePermission(key, 'view')) return;
      goToPage(key);
    } catch (e) { /* صفحة مش موجودة: نفضل في الرئيسية */ }
  }

  // ---- بعد ما الواجهة ترسم أول مرة: الاتصال اللحظي
  document.addEventListener('DOMContentLoaded', function () {
    window.WebSession.ready().then(function () {
      var tries = 0;
      (function waitBoot() {
        if (document.querySelector('#app .sidebar, #app nav, #app .layout') || tries++ > 100) { window.WebSync.connect(); openHashPage(); }
        else setTimeout(waitBoot, 100);
      })();
    });
  });
})();
