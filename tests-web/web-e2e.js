// A4 — اختبارات نسخة الويب فوق السيرفر الحقيقي (متصفحات متعددة).
// التشغيل: npm run test:web   (محتاج: npm --prefix server run build + PostgreSQL للاختبار)
const { chromium } = require('playwright');
const { startWebServer, ADMIN_INIT, ADMIN_PW } = require('../tests-merge/harness');
const { ok, eq, summary } = require('../tests-merge/lib');

const PW = 'Web#User#2026';
let srv, browser, adminTok;
const errors = [];

async function api(method, path, body, token) {
  const r = await fetch(srv.base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) { /* 204 */ }
  return { status: r.status, body: j };
}

async function openUser(username, password, { expectChange = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 850 }, locale: 'ar-EG' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${username} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource: (the server responded with a status of (401|403|409)|net::ERR_FAILED)/.test(m.text())) errors.push(`${username} console: ${m.text()}`); });
  await page.goto(srv.base + '/legacy/');
  await page.waitForSelector('#waForm');
  await page.fill('#waUser', username);
  await page.fill('#waPass', password);
  await page.click('#waLogin');
  if (expectChange) {
    await page.waitForSelector('#waPwdForm');
    await page.fill('#waNew', PW); await page.fill('#waNew2', PW); await page.click('#waChange');
  }
  await page.waitForFunction(() => !document.getElementById('webAuthOverlay') && typeof DATA !== 'undefined' && window.WebSync && WebSync._state.socket && WebSync._state.socket.connected && document.querySelector('#app').innerText.length > 100, null, { timeout: 20000 });
  return { ctx, page };
}

async function newUser(username, role, extra = {}) {
  const r = await api('POST', '/api/users', { username, password: PW, role, ...extra }, adminTok);
  if (r.status !== 201) throw new Error(`create ${username}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

(async () => {
  process.env.REQUIRE_2FA_ROLES = 'clientsSales'; // المرحلة 2: دور بيتطلب 2FA (اختبار [12])
  srv = await startWebServer();
  browser = await chromium.launch({ args: ['--no-sandbox'] });
  // أدمن عبر الـ API (عشان ننشئ مستخدمين)
  let r = await api('POST', '/api/auth/login', { username: 'admin', password: ADMIN_INIT });
  r = await api('POST', '/api/auth/change-password', { newPassword: ADMIN_PW }, r.body.accessToken);
  adminTok = r.body.accessToken;

  console.log('[1] login screen: wrong password, then forced first change');
  {
    await newUser('first_login', 'hr', { mustChangePassword: true });
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    await page.goto(srv.base + '/legacy/');
    await page.waitForSelector('#waForm');
    await page.fill('#waUser', 'first_login'); await page.fill('#waPass', 'wrong-password'); await page.click('#waLogin');
    await page.waitForFunction(() => document.getElementById('waErr').textContent.length > 0);
    ok(/غلط/.test(await page.textContent('#waErr')), 'wrong password shows an Arabic error');
    ok(await page.evaluate(() => typeof DATA === 'undefined' || !(window.WebSync && WebSync._state.meta)), 'no data loaded before login');
    await page.fill('#waPass', PW); await page.click('#waLogin');
    await page.waitForSelector('#waPwdForm');
    ok(true, 'forced password change form shown');
    await page.fill('#waNew', 'short'); await page.fill('#waNew2', 'short'); await page.click('#waChange');
    await page.waitForFunction(() => /10/.test(document.getElementById('waErr').textContent), null, { timeout: 5000 }).catch(() => {}); // الرسالة ممكن تتأخر لحظة (كان بيقرا قبلها)
    ok(/10/.test(await page.textContent('#waErr')), 'weak new password rejected in the form', await page.evaluate(() => ({ err: document.getElementById('waErr') && document.getElementById('waErr').textContent, pwdForm: !!document.getElementById('waPwdForm'), loginForm: !!document.getElementById('waForm'), overlay: !!document.getElementById('webAuthOverlay'), newVal: (document.getElementById('waNew') || {}).value })));
    await page.fill('#waNew', 'First#Login#2026'); await page.fill('#waNew2', 'First#Login#2026'); await page.click('#waChange');
    await page.waitForFunction(() => !document.getElementById('webAuthOverlay') && typeof DATA !== 'undefined' && currentUser && currentUser.username === 'first_login', null, { timeout: 20000 });
    ok(true, 'app opens after the change, currentUser from the server');
    eq(await page.evaluate(() => [isNetworkMode(), getUserPerms().manageUsers, hasPagePermission('users', 'view')]), [true, false, false], 'permissions come from /api/me (hr: no user management)');
    // إعادة تحميل = نفس الجلسة (cookie) من غير شاشة دخول
    await page.reload();
    await page.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta, null, { timeout: 20000 });
    ok(await page.evaluate(() => !document.getElementById('webAuthOverlay')), 'reload keeps the session (refresh cookie)');
    await ctx.close();
  }

  console.log('[2] two users: changes appear instantly on the other screen');
  const A = await openUser('admin', ADMIN_PW);
  await newUser('hr_b', 'hr');
  const B = await openUser('hr_b', PW);
  await B.page.evaluate(() => { window.__rr = 0; const o = window.rerenderCurrentPage; window.rerenderCurrentPage = function () { window.__rr++; return o.apply(this, arguments); }; });
  let t0 = Date.now();
  await A.page.evaluate(() => { DATA.departments.push({ id: 'dep_live', name: 'قسم لحظي', kind: 'admin' }); return saveData(true); });
  await B.page.waitForFunction(() => DATA.departments.some((d) => d.id === 'dep_live'), null, { timeout: 5000 });
  const ms = Date.now() - t0;
  ok(ms < 2000, `B sees A's insert in ${ms}ms`);
  await B.page.waitForFunction(() => window.__rr > 0, null, { timeout: 3000 });
  ok(true, 'B screen re-rendered');
  await B.page.evaluate(() => { DATA.departments.find((d) => d.id === 'dep_live').name = 'اتعدّل من ب'; return saveData(true); });
  await A.page.waitForFunction(() => (DATA.departments.find((d) => d.id === 'dep_live') || {}).name === 'اتعدّل من ب', null, { timeout: 5000 });
  ok(true, 'A sees B edit');
  await A.page.evaluate(() => { DATA.departments = DATA.departments.filter((d) => d.id !== 'dep_live'); return saveData(true); });
  await B.page.waitForFunction(() => !DATA.departments.some((d) => d.id === 'dep_live'), null, { timeout: 5000 });
  ok(true, 'delete propagates');

  console.log('[3] no re-render while the user is typing (re-render after)');
  {
    await B.page.evaluate(() => { const i = document.createElement('input'); i.id = 'typingProbe'; document.body.appendChild(i); i.focus(); window.__rr = 0; });
    await A.page.evaluate(() => { DATA.departments.push({ id: 'dep_typing', name: 'أثناء الكتابة', kind: 'admin' }); return saveData(true); });
    await B.page.waitForFunction(() => DATA.departments.some((d) => d.id === 'dep_typing'), null, { timeout: 5000 });
    await B.page.waitForTimeout(800);
    eq(await B.page.evaluate(() => window.__rr), 0, 'data updated but no re-render while typing');
    await B.page.evaluate(() => { document.getElementById('typingProbe').blur(); document.getElementById('typingProbe').remove(); });
    await B.page.waitForFunction(() => window.__rr > 0, null, { timeout: 4000 });
    ok(true, 're-rendered after typing stopped');
  }

  console.log('[4] conflicts: financial field rejected with a clear message; different fields merge');
  {
    await A.page.evaluate(() => { DATA.costs.push({ id: 'cost_c', amount: 100, notes: '', item: '' }); return saveData(true); });
    await B.page.waitForFunction(() => DATA.costs.some((c) => c.id === 'cost_c'), null, { timeout: 5000 });
    await B.page.evaluate(() => WebSync._state.socket.disconnect()); // B مايشوفش تعديل A قبل ما يحفظ
    await A.page.evaluate(() => { DATA.costs.find((c) => c.id === 'cost_c').amount = 150; return saveData(true); });
    const after = await B.page.evaluate(async () => { DATA.costs.find((c) => c.id === 'cost_c').amount = 999; await saveData(true); return DATA.costs.find((c) => c.id === 'cost_c').amount; });
    eq(after, 150, 'B change rejected, B now shows the server value');
    ok(/ماتحفظش/.test(await B.page.evaluate(() => document.body.innerText)), 'B sees the conflict message');
    const srvRow = (await api('GET', '/api/bootstrap', null, adminTok)).body.data.costs.find((c) => c.id === 'cost_c');
    eq(srvRow.amount, 150, 'server keeps A value (no silent overwrite)');
    await A.page.evaluate(() => { DATA.costs.find((c) => c.id === 'cost_c').notes = 'من أ'; return saveData(true); });
    await B.page.evaluate(async () => { DATA.costs.find((c) => c.id === 'cost_c').item = 'من ب'; await saveData(true); });
    const merged = (await api('GET', '/api/bootstrap', null, adminTok)).body.data.costs.find((c) => c.id === 'cost_c');
    eq([merged.notes, merged.item, merged.amount], ['من أ', 'من ب', 150], 'different fields merged on the server');
    eq(await B.page.evaluate(() => DATA.costs.find((c) => c.id === 'cost_c').notes), 'من أ', 'B got the merged record back (A notes) even while disconnected');
    await B.page.evaluate(() => WebSync._state.socket.connect());
  }

  console.log('[5] viewer: sees data, nothing it changes reaches the server');
  {
    await newUser('viewer_w', 'viewer');
    const V = await openUser('viewer_w', PW);
    ok(await V.page.evaluate(() => DATA.costs.some((c) => c.id === 'cost_c')), 'viewer sees costs');
    const plan = await V.page.evaluate(async () => { DATA.costs.find((c) => c.id === 'cost_c').amount = 1; const p = WebSync._buildPlan(DATA); await saveData(true); return p.changes.length; });
    eq(plan, 0, 'client does not even send changes the viewer may not make');
    const srvRow = (await api('GET', '/api/bootstrap', null, adminTok)).body.data.costs.find((c) => c.id === 'cost_c');
    eq(srvRow.amount, 150, 'server unchanged');
    const manual = await V.page.evaluate(async () => (await fetch('/api/sync', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + WebSession.token() }, body: JSON.stringify({ changes: [{ collection: 'costs', id: 'cost_c', op: 'upsert', baseRev: 99, set: { amount: 1 } }] }) })).status);
    eq(manual, 403, 'hand-made request from the viewer browser → 403');
    await V.ctx.close();
  }

  console.log('[6] no payroll permission → no salaries in the browser at all; edits keep the hidden salary');
  {
    await api('POST', '/api/sync', { changes: [{ collection: 'employees', id: 'emp_s', op: 'upsert', baseRev: 0, set: { name: 'محمد', salary: 9000, phone: '010' } }] }, adminTok);
    await newUser('clerk_w', 'custom', { editData: true, pages: [{ page: 'employees', view: true, add: true, edit: true, delete: false }, { page: 'dashboard', view: true, add: false, edit: false, delete: false }] });
    const C = await openUser('clerk_w', PW);
    const emp = await C.page.evaluate(() => DATA.employees.find((e) => e.id === 'emp_s'));
    // الواجهة القديمة بتحط salary افتراضي (0) لو الحقل مش موجود — المهم إن الراتب الحقيقي ماوصلش
    ok(emp && emp.salary !== 9000, 'real salary never reaches the clerk browser (got ' + (emp && emp.salary) + ')');
    // الواجهة القديمة ممكن تحط salary:0 افتراضي — العميل مايبعتهوش
    await C.page.evaluate(async () => { const e = DATA.employees.find((x) => x.id === 'emp_s'); e.phone = '011'; e.salary = 0; await saveData(true); });
    const row = (await api('GET', '/api/bootstrap', null, adminTok)).body.data.employees.find((e) => e.id === 'emp_s');
    eq([row.phone, row.salary], ['011', 9000], 'phone saved, hidden salary untouched on the server');
    await C.ctx.close();
  }

  console.log('[7] project manager: only his projects in the browser');
  {
    await api('POST', '/api/sync', { changes: [
      { collection: 'projects', id: 'p1', op: 'upsert', baseRev: 0, set: { name: 'مشروع 1' } },
      { collection: 'projects', id: 'p2', op: 'upsert', baseRev: 0, set: { name: 'مشروع 2' } },
      { collection: 'workerAttendance', id: 'wa1', op: 'upsert', baseRev: 0, set: { projectId: 'p1', date: '2026-11-01', dayWage: 300 } },
      { collection: 'workerAttendance', id: 'wa2', op: 'upsert', baseRev: 0, set: { projectId: 'p2', date: '2026-11-01', dayWage: 300 } },
    ] }, adminTok);
    await newUser('pm_w', 'projectManager', { projectScope: ['p1'] });
    const P = await openUser('pm_w', PW);
    eq(await P.page.evaluate(() => [DATA.projects.map((p) => p.id), DATA.workerAttendance.map((a) => a.id), 'dayWage' in (DATA.workerAttendance[0] || {})]), [['p1'], ['wa1'], false], 'p1 only, wages hidden');
    eq(await P.page.evaluate(() => [hasPagePermission('payroll', 'view'), hasPagePermission('workerAttendance', 'add')]), [false, true], 'UI permissions match the role');
    await P.ctx.close();
  }

  console.log('[8] users page (legacy) → /api/users');
  {
    const res = await A.page.evaluate(async () => {
      const perms = roleTemplates().payroll;
      const c = await apiCreateUser('via_ui', 'Via#Ui#Pass1', 'من الواجهة', 'payroll', perms);
      const u = DATA.users.find((x) => x.username === 'via_ui');
      return { ok: c.ok, id: u && u.id, role: u && u.role };
    });
    ok(res.ok && res.id && res.role === 'payroll', 'apiCreateUser creates the user on the server and refreshes the list');
    const viaApi = (await api('GET', '/api/users', null, adminTok)).body.find((u) => u.username === 'via_ui');
    eq(viaApi && viaApi.role, 'payroll', 'user exists on the server');
    await A.page.evaluate(async () => { DATA.users = DATA.users.filter((u) => u.username !== 'via_ui'); await saveData(true); });
    const after = (await api('GET', '/api/users', null, adminTok)).body.find((u) => u.username === 'via_ui');
    eq(after.active, false, 'deleting in the legacy page = deactivated on the server (no hard delete)');
    const me = (await api('GET', '/api/users', null, adminTok)).body.find((u) => u.username === 'admin');
    eq(me.active, true, 'admin untouched');
    ok(await A.page.evaluate(() => DATA.users.length > 0 && !('hash' in DATA.users[0])), 'users list has no password data');
  }

  console.log('[9] offline: changes queue locally and go out when the server is reachable again');
  {
    await A.page.route('**/api/sync', (route) => route.abort());
    await A.page.evaluate(() => { DATA.departments.push({ id: 'dep_offline', name: 'من غير نت', kind: 'admin' }); return saveData(true); });
    ok(/مفيش اتصال/.test(await A.page.evaluate(() => document.body.innerText)), 'offline message shown');
    let srvHas = (await api('GET', '/api/bootstrap', null, adminTok)).body.data.departments.some((d) => d.id === 'dep_offline');
    eq(srvHas, false, 'not on the server yet');
    await A.page.unroute('**/api/sync');
    await A.page.evaluate(() => window.dispatchEvent(new Event('online')));
    for (let i = 0; i < 50 && !srvHas; i++) { await new Promise((res) => setTimeout(res, 200)); srvHas = (await api('GET', '/api/bootstrap', null, adminTok)).body.data.departments.some((d) => d.id === 'dep_offline'); }
    ok(srvHas, 'queued change saved after reconnect');
  }

  console.log('[10] closing the tab with an unsaved change still saves it (keepalive)');
  {
    const page2 = await A.ctx.newPage();
    await page2.goto(srv.base + '/legacy/');
    await page2.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && document.querySelector('#app').innerText.length > 100, null, { timeout: 20000 });
    await page2.evaluate(() => { DATA.departments.push({ id: 'dep_close', name: 'قبل القفل', kind: 'admin' }); saveData(); /* مؤجل 280ms */ });
    await page2.close({ runBeforeUnload: true });
    let has = false;
    for (let i = 0; i < 25 && !has; i++) { await new Promise((res) => setTimeout(res, 200)); has = (await api('GET', '/api/bootstrap', null, adminTok)).body.data.departments.some((d) => d.id === 'dep_close'); }
    ok(has, 'pending change sent on page close');
  }

  console.log('[11] desktop-only settings are hidden; logout returns to the login screen');
  {
    await A.page.evaluate(() => { goToPage('backup'); });
    await A.page.waitForTimeout(400);
    eq(await A.page.evaluate(() => [...document.querySelectorAll('.set-tab[data-panel="network"], .set-tab[data-panel="system"]')].map((e) => getComputedStyle(e).display)), ['none', 'none'], 'network/system tabs hidden');
    await A.page.evaluate(() => apiLogout());
    await A.page.waitForSelector('#waForm', { timeout: 10000 });
    ok(true, 'logout → login screen');
    const r2 = await A.page.evaluate(async () => (await fetch('/api/auth/refresh', { method: 'POST' })).status);
    eq(r2, 401, 'refresh cookie revoked');
  }

  console.log('[12] two-factor: required role enrols in the browser, then logs in with a code');
  {
    const { totpAt, currentStep } = require('../server/dist/auth/totp');
    await newUser('tf_sales', 'clientsSales');
    const ctx = await browser.newContext({ viewport: { width: 1300, height: 850 }, locale: 'ar-EG' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`tf pageerror: ${e.message}`));
    await page.goto(srv.base + '/legacy/');
    await page.waitForSelector('#waForm');
    await page.fill('#waUser', 'tf_sales'); await page.fill('#waPass', PW); await page.click('#waLogin');
    await page.waitForSelector('#wa2Pass');
    ok(true, 'enrolment screen shown for a required role');
    await page.fill('#wa2Pass', PW); await page.click('#wa2Start');
    await page.waitForSelector('#wa2Secret');
    const secret = (await page.textContent('#wa2Secret')).replace(/\s/g, '');
    ok(/^[A-Z2-7]{32}$/.test(secret), 'secret shown for manual entry');
    await page.fill('#wa2Otp', totpAt(secret, currentStep())); await page.click('#wa2Start');
    await page.waitForSelector('#wa2Codes');
    eq((await page.textContent('#wa2Codes')).trim().split(/\s+/).length, 10, '10 recovery codes shown once');
    await page.click('#wa2Done');
    await page.waitForFunction(() => !document.getElementById('webAuthOverlay') && typeof DATA !== 'undefined' && document.querySelector('#app').innerText.length > 100, null, { timeout: 20000 });
    ok(true, 'app opens after enrolment');
    await page.evaluate(() => apiLogout());
    await page.waitForSelector('#waForm', { timeout: 10000 });
    await page.fill('#waUser', 'tf_sales'); await page.fill('#waPass', PW); await page.click('#waLogin');
    await page.waitForFunction(() => getComputedStyle(document.getElementById('waOtp').closest('label')).display !== 'none', null, { timeout: 10000 });
    ok((await page.textContent('#waErr')).includes('كود'), 'login asks for the code after the password');
    await page.fill('#waOtp', totpAt(secret, currentStep() + 1)); await page.click('#waLogin');
    await page.waitForFunction(() => !document.getElementById('webAuthOverlay') && typeof DATA !== 'undefined', null, { timeout: 20000 });
    ok(true, 'login with code succeeds');
    await ctx.close();
  }

  console.log('[13] security headers on the legacy UI');
  {
    const r = await fetch(srv.base + '/legacy/');
    ok(/frame-ancestors 'none'/.test(r.headers.get('content-security-policy') || ''), 'CSP enforced on /legacy/');
    eq(r.headers.get('x-content-type-options'), 'nosniff', 'nosniff');
    const x = await fetch(srv.base + '/api/auth/refresh', { method: 'POST', headers: { origin: 'http://evil.example' } });
    eq(x.status, 403, 'cross-origin refresh rejected');
  }

  await browser.close();
  await srv.stop();
  summary(errors);
})().catch(async (e) => { console.error('FATAL', e); try { await browser.close(); await srv.stop(); } catch (_) {} process.exit(1); });
