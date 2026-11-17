/* =========================================================================
   web-session.js — جلسة نسخة الويب (A4)
   - الـ access token في الذاكرة بس (مش localStorage). الـ refresh token في cookie HttpOnly من السيرفر.
   - عند الفتح: نحاول /api/auth/refresh (الكوكي) → لو فشل نعرض شاشة الدخول.
   - تجديد تلقائي قبل انتهاء التوكن بدقيقة، وأي 401 → تجديد مرة واحدة وإعادة الطلب.
   - تغيير كلمة المرور الإجباري قبل تحميل أي بيانات (السيرفر بيرفض البيانات لحد ما تتغير).
   ========================================================================= */
(function () {
  'use strict';
  var state = { token: '', me: null, expiresIn: 900, refreshTimer: null, readyPromise: null, listeners: [] };

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'className') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }

  async function rawFetch(method, path, body, opts) {
    var headers = { 'Accept': 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (state.token && !(opts && opts.noAuth)) headers['Authorization'] = 'Bearer ' + state.token;
    var res = await fetch(path, { method: method, headers: headers, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: 'same-origin', keepalive: !!(opts && opts.keepalive) });
    var json = null;
    try { json = await res.json(); } catch (e) { json = null; }
    return { status: res.status, ok: res.ok, body: json };
  }

  function setSession(r) {
    state.token = r.accessToken;
    state.me = r.user;
    state.expiresIn = r.expiresIn || 900;
    if (state.refreshTimer) clearTimeout(state.refreshTimer);
    var ms = Math.max(30, state.expiresIn - 60) * 1000;
    state.refreshTimer = setTimeout(function () { refresh().catch(function () {}); }, ms);
    state.listeners.forEach(function (fn) { try { fn(state.token); } catch (e) {} });
  }

  var refreshing = null;
  /** تجديد الـ access token من الكوكي. بيرجّع true/false */
  function refresh() {
    if (refreshing) return refreshing;
    refreshing = (async function () {
      for (var attempt = 0; attempt < 2; attempt++) {
        var r = await rawFetch('POST', '/api/auth/refresh', undefined, { noAuth: true });
        if (r.ok && r.body && r.body.accessToken) { setSession(r.body); return true; }
        if (r.body && r.body.code === 'REFRESH_RACE') { await new Promise(function (ok) { setTimeout(ok, 400); }); continue; }
        return false;
      }
      return false;
    })().finally(function () { refreshing = null; });
    return refreshing;
  }

  /** طلب API موثّق: 401 → تجديد مرة واحدة → إعادة. لو التجديد فشل → شاشة الدخول */
  async function api(method, path, body, opts) {
    var r = await rawFetch(method, path, body, opts);
    if (r.status === 401 && !(opts && opts.noRetry)) {
      if (await refresh()) r = await rawFetch(method, path, body, opts);
      else { showLogin('انتهت الجلسة — سجّل الدخول مرة أخرى'); throw new Error('UNAUTHENTICATED'); }
    }
    return r;
  }

  // ------------------------------------------------------------------ UI
  function overlay() {
    var ov = document.getElementById('webAuthOverlay');
    if (ov) { ov.innerHTML = ''; return ov; }
    ov = el('div', { id: 'webAuthOverlay', className: 'web-auth-overlay', role: 'dialog', 'aria-modal': 'true', dir: 'rtl' });
    document.body.appendChild(ov);
    return ov;
  }
  function closeOverlay() { var ov = document.getElementById('webAuthOverlay'); if (ov) ov.remove(); }

  function card(title, subtitle) {
    var c = el('div', { className: 'web-auth-card' });
    c.appendChild(el('div', { className: 'web-auth-brand', text: 'النظام الموحد' }));
    c.appendChild(el('h2', { text: title }));
    if (subtitle) c.appendChild(el('p', { className: 'web-auth-sub', text: subtitle }));
    return c;
  }

  /** تركيز أول خانة في الفورم: فورًا (الـ overlay في الصفحة ومرئي)، ومحاولة احتياطية بعد لحظة
      بس لو التركيز لسه برّه الفورم. ممنوع نسرق التركيز من خانة المستخدم بدأ يكتب فيها: المؤقت القديم
      (focus بعد 30ms بدون شرط) كان بينقل التركيز لأول خانة في نص الكتابة في التانية، فالنص يتلزق في الأولى. */
  function focusField(form, input) {
    input.focus();
    setTimeout(function () {
      if (input.isConnected && !form.contains(document.activeElement)) input.focus();
    }, 30);
  }

  function field(label, id, type, autocomplete) {
    var input = el('input', { className: 'input', id: id, type: type, autocomplete: autocomplete, dir: type === 'password' || id === 'waUser' ? 'ltr' : 'rtl' });
    return { wrap: el('label', { className: 'web-auth-field' }, [el('span', { text: label }), input]), input: input };
  }

  /** شاشة الدخول — بتحل الـ promise لما الدخول ينجح */
  function loginForm(message) {
    return new Promise(function (resolve) {
      var ov = overlay();
      var c = card('تسجيل الدخول', 'ادخل باسم المستخدم وكلمة المرور');
      var u = field('اسم المستخدم', 'waUser', 'text', 'username');
      var p = field('كلمة المرور', 'waPass', 'password', 'current-password');
      // التحقق بخطوتين (المرحلة 2): الخانة بتظهر لما السيرفر يطلب الكود (OTP_REQUIRED)
      var o = field('كود التحقق (6 أرقام) أو كود استرداد', 'waOtp', 'text', 'one-time-code');
      o.input.setAttribute('inputmode', 'numeric'); o.input.setAttribute('dir', 'ltr'); o.input.setAttribute('maxlength', '16');
      o.wrap.style.display = 'none';
      var err = el('div', { className: 'web-auth-err', id: 'waErr', role: 'alert', text: message || '' });
      var btn = el('button', { type: 'submit', className: 'btn btn-primary web-auth-btn', id: 'waLogin', text: 'دخول' });
      var form = el('form', { id: 'waForm', novalidate: 'novalidate' }, [u.wrap, p.wrap, o.wrap, err, btn]);
      c.appendChild(form);
      ov.appendChild(c);
      focusField(form, u.input);
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        err.textContent = '';
        var username = u.input.value.trim(), password = p.input.value;
        if (!username || !password) { err.textContent = 'اكتب اسم المستخدم وكلمة المرور'; return; }
        btn.disabled = true;
        try {
          var body = { username: username, password: password };
          var otp = o.input.value.trim();
          if (o.wrap.style.display !== 'none' && otp) body.otp = otp;
          var r = await rawFetch('POST', '/api/auth/login', body, { noAuth: true });
          if (r.ok && r.body && r.body.accessToken) { setSession(r.body); resolve(); return; }
          var b = r.body || {};
          if (b.code === 'OTP_REQUIRED' || b.code === 'OTP_INVALID') {
            o.wrap.style.display = '';
            err.textContent = b.code === 'OTP_REQUIRED' ? 'أدخل كود التحقق من تطبيق المصادقة على موبايلك' : (b.message || 'كود التحقق غلط');
            o.input.value = ''; o.input.focus();
            return;
          }
          if (r.status === 429) err.textContent = 'محاولات كتير — استنى دقيقة وحاول تاني';
          else err.textContent = (typeof b.message === 'string' ? b.message : '') || 'تعذر تسجيل الدخول';
          p.input.value = ''; o.input.value = ''; p.input.focus();
        } catch (ex) {
          err.textContent = 'تعذر الاتصال بالسيرفر';
        } finally { btn.disabled = false; }
      });
    });
  }

  /** تغيير كلمة المرور الإجباري (أول دخول / بعد إعادة تعيين) */
  function changePasswordForm() {
    return new Promise(function (resolve) {
      var ov = overlay();
      var c = card('لازم تغيّر كلمة المرور', 'اختار كلمة مرور جديدة (10 أحرف على الأقل) عشان تكمل');
      var p1 = field('كلمة المرور الجديدة', 'waNew', 'password', 'new-password');
      var p2 = field('تأكيد كلمة المرور', 'waNew2', 'password', 'new-password');
      var err = el('div', { className: 'web-auth-err', id: 'waErr', role: 'alert' });
      var btn = el('button', { type: 'submit', className: 'btn btn-primary web-auth-btn', id: 'waChange', text: 'حفظ والمتابعة' });
      var out = el('button', { type: 'button', className: 'btn btn-outline web-auth-btn', id: 'waLogout', text: 'تسجيل الخروج' });
      var form = el('form', { id: 'waPwdForm', novalidate: 'novalidate' }, [p1.wrap, p2.wrap, err, btn, out]);
      c.appendChild(form);
      ov.appendChild(c);
      focusField(form, p1.input);
      out.addEventListener('click', function () { logout(); });
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        err.textContent = '';
        if (p1.input.value.length < 10) { err.textContent = 'كلمة المرور لازم 10 أحرف على الأقل'; return; }
        if (p1.input.value !== p2.input.value) { err.textContent = 'كلمتا المرور غير متطابقتين'; return; }
        btn.disabled = true;
        try {
          var r = await api('POST', '/api/auth/change-password', { newPassword: p1.input.value });
          if (r.ok && r.body && r.body.accessToken) { setSession(r.body); resolve(); return; }
          var m = r.body && r.body.message;
          err.textContent = (Array.isArray(m) ? m.join('، ') : m) || 'تعذر حفظ كلمة المرور';
        } catch (ex) { err.textContent = 'تعذر الاتصال بالسيرفر'; } finally { btn.disabled = false; }
      });
    });
  }

  /** تفعيل التحقق بخطوتين الإجباري (REQUIRE_2FA_ROLES) — كلمة المرور ← السر ← أول كود ← أكواد الاسترداد */
  function twoFactorSetupForm() {
    return new Promise(function (resolve) {
      var ov = overlay();
      var c = card('لازم تفعّل التحقق بخطوتين', 'حسابك يتطلب كود من تطبيق مصادقة على الموبايل (Google أو Microsoft Authenticator) مع كلمة المرور');
      var p = field('كلمة المرور الحالية', 'wa2Pass', 'password', 'current-password');
      var err = el('div', { className: 'web-auth-err', id: 'wa2Err', role: 'alert' });
      var btn = el('button', { type: 'submit', className: 'btn btn-primary web-auth-btn', id: 'wa2Start', text: 'متابعة' });
      var out = el('button', { type: 'button', className: 'btn btn-outline web-auth-btn', text: 'تسجيل الخروج' });
      var form = el('form', { novalidate: 'novalidate' }, [p.wrap, err, btn, out]);
      c.appendChild(form); ov.appendChild(c);
      out.addEventListener('click', function () { logout(); });
      focusField(form, p.input);
      var step = 'password';
      var o = null;
      form.addEventListener('submit', async function (e) {
        e.preventDefault(); err.textContent = ''; btn.disabled = true;
        try {
          if (step === 'password') {
            var r = await api('POST', '/api/auth/2fa/setup', { password: p.input.value });
            if (!r.ok) { err.textContent = (r.body && r.body.message) || 'تعذر البدء'; return; }
            step = 'code';
            p.wrap.remove();
            var secret = String(r.body.secret).replace(/(.{4})/g, '$1 ').trim();
            form.insertBefore(el('p', { className: 'web-auth-sub', text: '١) في تطبيق المصادقة اختار «إضافة حساب» ← «إدخال مفتاح يدويًا»، واكتب المفتاح ده (نوع الحساب: حسب الوقت):' }), err);
            form.insertBefore(el('div', { className: 'web-auth-secret', id: 'wa2Secret', dir: 'ltr', text: secret }), err);
            form.insertBefore(el('p', { className: 'web-auth-sub', text: '٢) اكتب الكود اللي ظهر في التطبيق:' }), err);
            o = field('كود التحقق (6 أرقام)', 'wa2Otp', 'text', 'one-time-code');
            o.input.setAttribute('inputmode', 'numeric'); o.input.setAttribute('dir', 'ltr'); o.input.setAttribute('maxlength', '6');
            form.insertBefore(o.wrap, err);
            btn.textContent = 'تفعيل';
            focusField(form, o.input);
          } else if (step === 'code') {
            var r2 = await api('POST', '/api/auth/2fa/enable', { otp: o.input.value.trim() });
            if (!r2.ok) { err.textContent = (r2.body && r2.body.message) || 'الكود غلط'; o.input.value = ''; o.input.focus(); return; }
            step = 'done';
            while (form.firstChild) form.removeChild(form.firstChild);
            form.appendChild(el('p', { className: 'web-auth-sub', text: 'تم التفعيل. احتفظ بأكواد الاسترداد دي في مكان آمن — كل كود يستخدم مرة واحدة لو الموبايل ضاع. مش هتظهر تاني:' }));
            form.appendChild(el('div', { className: 'web-auth-secret', id: 'wa2Codes', dir: 'ltr', text: r2.body.recoveryCodes.join('   ') }));
            form.appendChild(el('button', { type: 'submit', className: 'btn btn-primary web-auth-btn', id: 'wa2Done', text: 'حفظت الأكواد — متابعة' }));
          } else {
            var me = await api('GET', '/api/me');
            if (me.ok) state.me = me.body;
            resolve();
          }
        } catch (ex) { err.textContent = 'تعذر الاتصال بالسيرفر'; } finally { btn.disabled = false; }
      });
    });
  }

  /** بيرجّع بعد ما المستخدم يبقى مسجّل دخول وكلمة مروره سليمة (مرة واحدة لكل تحميل صفحة) */
  function ready() {
    if (state.readyPromise) return state.readyPromise;
    state.readyPromise = (async function () {
      var ok = false;
      try { ok = await refresh(); } catch (e) { ok = false; }
      if (!ok) await loginForm();
      if (state.me && state.me.mustChangePassword) await changePasswordForm();
      if (state.me && state.me.twoFactorSetupRequired) await twoFactorSetupForm();
      closeOverlay();
      document.documentElement.classList.add('web-mode');
      return state.me;
    })();
    return state.readyPromise;
  }

  /** لو الجلسة انتهت في النص: نعرض الدخول، وبعد النجاح نعيد تحميل الصفحة (أنضف من ترقيع الحالة) */
  var loginShown = false;
  function showLogin(message) {
    if (loginShown) return;
    loginShown = true;
    loginForm(message).then(function () { location.reload(); });
  }

  async function logout() {
    try { await rawFetch('POST', '/api/auth/logout', undefined, { noAuth: true }); } catch (e) {}
    state.token = ''; state.me = null;
    location.reload();
  }

  /** المستخدم بشكل currentUser في الواجهة القديمة */
  function legacyUser() {
    var m = state.me;
    if (!m) return null;
    return { id: m.id, username: m.username, name: m.name || m.username, role: m.role, permissions: m.permissions, mustChangePassword: false, projectScope: m.projectScope || null };
  }

  window.WebSession = {
    ready: ready,
    api: api,
    refresh: refresh,
    logout: logout,
    showLogin: showLogin,
    legacyUser: legacyUser,
    token: function () { return state.token; },
    me: function () { return state.me; },
    onToken: function (fn) { state.listeners.push(fn); },
    _rawFetch: rawFetch,
  };
})();
