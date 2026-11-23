// المرحلة 4 — اختبار متصفح للواجهة الجديدة (Angular على /app/) فوق السيرفر الحقيقي:
// الدخول + تغيير كلمة المرور الإجباري + 2FA، نفس الجلسة مع /legacy/، الحارس، RTL، الشاشة التجريبية، PWA، CSP صارمة.
// التشغيل: npm run test:app   (محتاج: build للسيرفر والواجهة الجديدة + PostgreSQL للاختبار)
const { chromium } = require('playwright');
const { startWebServer, ADMIN_INIT } = require('../tests-merge/harness');
const { ok, eq, summary } = require('../tests-merge/lib');

const PW = 'App#User#2026x';
let srv, browser, adminTok;
const errors = [];

async function api(method, path, body, token) {
  const r = await fetch(srv.base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) { /* 204 */ }
  return { status: r.status, body: j, headers: r.headers };
}

async function newContext(tag) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 850 }, locale: 'ar-EG' });
  await ctx.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.disposition + ' ' + e.effectiveDirective + ' ' + e.blockedURI)); });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${tag} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/status of (400|401|403|404|409)/.test(m.text())) errors.push(`${tag} console: ${m.text()}`); });
  return { ctx, page };
}

async function login(page, username, password) {
  await page.goto(srv.base + '/app/login');
  await page.waitForSelector('#loginForm');
  await page.fill('#username', username); await page.fill('#password', password); await page.click('#loginBtn');
}

(async () => {
  process.env.REQUIRE_2FA_ROLES = 'clientsSales';
  srv = await startWebServer();
  browser = await chromium.launch({ args: ['--no-sandbox'] });
  let r = await api('POST', '/api/auth/login', { username: 'admin', password: ADMIN_INIT });
  const initTok = r.body.accessToken;

  console.log('[1] /app/ is served (RTL, strict CSP, PWA files), unknown files 404');
  {
    const h = await fetch(srv.base + '/app/');
    const html = await h.text();
    ok(h.status === 200 && /<html lang="ar" dir="rtl">/.test(html) && /<base href="\/app\/"\/?>/.test(html), '/app/ index: Arabic RTL, base /app/');
    const csp = h.headers.get('content-security-policy') || '';
    ok(/script-src 'self'(;|$)/.test(csp) && !/script-src[^;]*unsafe-inline/.test(csp) && /script-src-attr 'none'/.test(csp), 'strict CSP on /app/ (no inline scripts at all)', csp);
    eq(h.headers.get('cache-control'), 'no-cache', 'index.html not cached');
    ok(!/fonts\.googleapis|gstatic|cdn\./.test(html), 'no external resources in index.html');
    const m = await api('GET', '/app/manifest.webmanifest');
    eq([m.status, m.body && m.body.start_url, m.body && m.body.dir], [200, '/app/', 'rtl'], 'PWA manifest');
    eq((await fetch(srv.base + '/app/ngsw.json')).status, 200, 'service worker manifest served');
    eq((await fetch(srv.base + '/app/missing-file.js')).status, 404, 'missing asset → 404 (not index.html)');
    eq((await fetch(srv.base + '/app/projects')).status, 200, 'deep route → index.html (SPA)');
  }

  console.log('[2] first login: forced password change, then the shell');
  const A = await newContext('admin');
  {
    await login(A.page, 'admin', ADMIN_INIT);
    await A.page.waitForSelector('#newPw');
    ok(true, 'forced password change screen');
    await A.page.fill('#newPw', 'short'); await A.page.fill('#newPw2', 'short'); await A.page.click('#pwBtn');
    await A.page.waitForFunction(() => /10/.test(document.getElementById('pwError').textContent));
    ok(true, 'weak password rejected');
    await A.page.fill('#newPw', PW); await A.page.fill('#newPw2', PW); await A.page.click('#pwBtn');
    await A.page.waitForSelector('#whoami');
    ok((await A.page.textContent('#whoami')).includes('مدير النظام'), 'shell shows the user and role');
    eq(await A.page.evaluate(() => getComputedStyle(document.body).direction), 'rtl', 'page direction is RTL');
    const nav = await A.page.evaluate(() => ({ app: [...document.querySelectorAll('#nav [data-page]')].map((a) => a.getAttribute('data-page')), legacy: [...document.querySelectorAll('#nav [data-legacy]')].map((a) => a.getAttribute('href')) }));
    ok(nav.app.includes('ledger.suppliers') && nav.app.includes('clients.customers') && nav.app.includes('workers') && nav.legacy.includes('/legacy/#dashboard') && nav.legacy.includes('/legacy/#transfers'), 'legacy sections (DEC-0093): sections with a moved page open it here (HR → workers since 8.1), the others open their legacy board/page', nav);
    ok(!!(await A.page.$('.lx .top .brand img.mark-logo')) && !!(await A.page.$('.lx nav.nav.nav-sections')), 'legacy header and section tabs');
  }
  r = await api('POST', '/api/auth/login', { username: 'admin', password: PW });
  adminTok = r.body.accessToken;
  await api('POST', '/api/sync', { changes: [
    { collection: 'projects', id: 'p1', op: 'upsert', baseRev: 0, set: { name: 'مشروع الشروق', code: 'PRJ-1', budget: 1250000.5, status: 'active' } },
    { collection: 'projects', id: 'p2', op: 'upsert', baseRev: 0, set: { name: 'مشروع النيل', code: 'PRJ-2', budget: '2000.0000005', status: 'active' } },
  ] }, adminTok);

  console.log('[3] projects screen (7.4.5): legacy look, server list, add + rename through the modal');
  {
    await A.page.click('#nav [data-section="clients"]');
    await A.page.click('#navProjects');
    await A.page.waitForSelector('#projTable tr[data-id="p1"]');
    // قلب التوجيه (موافقة 2026-11-23، DEC-0119): «المشاريع» في صف قسم «العملاء والمشاريع» بتفتح الشاشة الجديدة، والقديمة «الشاشة الكاملة»
    ok((await A.page.$$eval('a', (as) => as.map((x) => x.getAttribute('href') || ''))).some((h) => /\/projects$/.test(h)), 'section link opens /app/projects');
    const rows = await A.page.evaluate(() => [...document.querySelectorAll('#projTable tr[data-id]')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim())));
    eq(rows.length, 2, 'two projects listed');
    eq(rows.map((x) => [x[0], x[3], x[4]]), [['PRJ-1', 'التنفيذ والمتابعة', '١٬٢٥٠٬٠٠٠٫٥ ج.م'], ['PRJ-2', 'التنفيذ والمتابعة', '٢٬٠٠٠ ج.م']], 'code, legacy stage label (active), value like fmtMoney (toInt = 2 decimals)');
    ok(!!(await A.page.$('.page .stats-row .stat-card')) && !!(await A.page.$('.filters-bar #projHasRes')), 'legacy page structure (cards + filters bar)');
    await A.page.fill('#projSearch', 'النيل');
    await A.page.waitForFunction(() => document.querySelectorAll('#projTable tr[data-id]').length === 1);
    ok(true, 'smart search on the server');
    await A.page.fill('#projSearch', '');
    await A.page.waitForFunction(() => document.querySelectorAll('#projTable tr[data-id]').length === 2);
    await A.page.click('#btnAddProject'); await A.page.waitForSelector('#btnSavePr');
    eq(await A.page.inputValue('#prCode'), 'PRJ-003', 'auto code prefilled');
    await A.page.fill('#prName', 'مشروع الواجهة');
    if (await A.page.$('#prCustomer')) await A.page.fill('#prCustomer', 'عميل نصّي');
    await A.page.fill('#prValue', '1500.255');
    const [pr] = await Promise.all([A.page.waitForResponse((r) => r.url().endsWith('/api/v1/projects') && r.request().method() === 'POST'), A.page.click('#btnSavePr')]);
    eq(pr.status(), 201, 'created through the modal');
    await A.page.waitForFunction(() => document.querySelectorAll('#projTable tr[data-id]').length === 3);
    const created = (await api('GET', '/api/v1/projects', null, adminTok)).body.rows.find((p) => p.name === 'مشروع الواجهة');
    ok(created && created.value === 1500.26 && created.budget === 1500.26 && created.status === 'الدراسة والتخطيط', 'saved like the legacy modal (round2, budget = value, first stage)', created);
    await A.page.click(`.btn-edit-proj[data-id="${created.id}"]`); await A.page.waitForSelector('#btnSavePr');
    await A.page.fill('#prName', 'مشروع الواجهة ٢');
    const [pu] = await Promise.all([A.page.waitForResponse((r) => r.url().includes('/api/v1/projects/') && r.request().method() === 'PATCH'), A.page.click('#btnSavePr')]);
    eq(pu.status(), 200, 'renamed through the modal');
    await A.page.waitForFunction(() => [...document.querySelectorAll('#projTable tr[data-id] strong')].some((s) => s.textContent === 'مشروع الواجهة ٢'));
    ok(true, 'list refreshed after save');
  }

  console.log('[3w] workers screen (8.1.5): boards, list from the server, add temporary + edit company + resign through the modal');
  {
    await api('POST', '/api/sync', { changes: [
      { collection: 'supervisors', id: 'sv1', op: 'upsert', baseRev: 0, set: { code: 'SUP-1', name: 'سامي', status: 'active' } },
      { collection: 'workers', id: 'w1', op: 'upsert', baseRev: 0, set: { code: 'WRK-001', name: 'محمد علي', workerType: 'temporary', type: 'temporary', status: 'active', dailyWage: 300, departmentId: '__core_workers_temp__', categoryId: '__core_workers_temp__' } },
      { collection: 'workers', id: 'w2', op: 'upsert', baseRev: 0, set: { code: 'WRK-002', name: 'أحمد محمود', workerType: 'company', type: 'company', status: 'active', salary: 6000, basicSalary: 6000, position: 'نجار', skill: 'نجار', departmentId: '__core_workers_perm__', categoryId: '__core_workers_perm__' } },
    ] }, adminTok);
    // قلب التوجيه (موافقة 2026-11-23، DEC-0122): «العمال» في صف قسم الموارد البشرية بتفتح الشاشة الجديدة، والقديمة «الشاشة الكاملة»
    await A.page.goto(srv.base + '/app/projects'); await A.page.waitForSelector('#nav [data-section="hr"]');
    await A.page.click('#nav [data-section="hr"]');
    await A.page.click('#navWorkers');
    await A.page.waitForSelector('#wkBoards .entity-dept-board');
    ok(/\/app\/workers$/.test(A.page.url()), 'section link opens /app/workers', A.page.url());
    const boards = await A.page.$$eval('#wkBoards .entity-dept-board', (bs) => bs.map((b) => [b.getAttribute('data-dept'), b.querySelector('.num').textContent.trim()]));
    eq(boards.slice(0, 1).concat(boards.filter(([d]) => d.startsWith('__core_workers'))), [['', '2'], ['__core_workers_perm__', '1'], ['__core_workers_temp__', '1']], 'department boards with counts');
    await A.page.click('#wkBoards .entity-dept-board[data-dept=""]');
    await A.page.waitForSelector('#wkTable tr[data-id="w2"]');
    ok((await A.page.$$eval('a', (as) => as.map((x) => x.getAttribute('href') || ''))).includes('/legacy/#workers'), 'the full legacy screen stays reachable (/legacy/#workers)');
    ok(!!(await A.page.$('#wkCards .sc-card')) && !!(await A.page.$('#wkBack')), 'legacy list structure (cards + back to boards)');
    await A.page.click('#btnAddTempWorker'); await A.page.waitForSelector('#btnSaveWrk');
    eq(await A.page.inputValue('#wrkCode'), 'WRK-003', 'auto code prefilled');
    await A.page.fill('#wrkName', 'عامل الواجهة'); await A.page.fill('#wrkWageTemp', '275.555'); await A.page.fill('#wrkPosTemp', 'مساعد');
    const [pr] = await Promise.all([A.page.waitForResponse((r) => r.url().endsWith('/api/v1/workers') && r.request().method() === 'POST'), A.page.click('#btnSaveWrk')]);
    eq(pr.status(), 201, 'temporary worker created through the modal');
    const created = await pr.json();
    ok(created.dailyWage === 275.56 && created.departmentId === '__core_workers_temp__' && created.insuranceStatus === 'none', 'saved like the legacy modal (round2, temp department)', created);
    await A.page.waitForSelector(`#wkTable tr[data-id="${created.id}"]`);
    await A.page.click('.btn-edit-wrk[data-id="w2"]'); await A.page.waitForSelector('#wrkSalary');
    ok(!!(await A.page.inputValue('#wrkHire')), 'hire date prefilled with today when empty (legacy form)');
    await A.page.selectOption('#wrkStatus', 'resigned');
    const [pu] = await Promise.all([A.page.waitForResponse((r) => r.url().includes('/api/v1/workers/') && r.request().method() === 'PATCH'), A.page.click('#btnSaveWrk')]);
    eq(pu.status(), 200, 'company worker edited through the modal');
    const res = await pu.json();
    eq([res.status, res.departmentId, res.archiveGroup], ['resigned', '__resigned_worker__', 'resigned'], 'resign moves to the resigned department');
    await A.page.click('#wkBack'); await A.page.waitForSelector('#wkBoards');
    ok((await A.page.$eval('#wkBoards .entity-dept-board[data-dept="__resigned_worker__"] .num', (e) => e.textContent.trim())) === '1', 'resigned board counts him');
  }

  console.log('[4] same session with the legacy UI + deep link');
  {
    await A.page.goto(srv.base + '/legacy/#ledger.suppliers');
    await A.page.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && !document.getElementById('webAuthOverlay') && typeof currentPage !== 'undefined' && currentPage === 'ledger.suppliers', null, { timeout: 30000 });
    ok(true, 'legacy UI opened without a second login, on the linked page');
    await A.page.goto(srv.base + '/app/');
    await A.page.waitForSelector('#whoami');
    ok(true, 'back in /app/ still logged in (shared refresh cookie)');
  }

  console.log('[5] page guard + unknown route');
  {
    const u = await api('POST', '/api/users', { username: 'app_wh', password: PW, role: 'warehouse' }, adminTok);
    eq(u.status, 201, 'warehouse user created');
    const t = (await api('POST', '/api/auth/login', { username: 'app_wh', password: PW })).body.accessToken;
    const me = (await api('GET', '/api/me', null, t)).body;
    const W = await newContext('wh');
    await login(W.page, 'app_wh', PW);
    await W.page.waitForSelector('#whoami');
    await W.page.goto(srv.base + '/app/projects');
    await W.page.waitForSelector('.shell-body h1, .shell-body h2.page-title');
    const canView = !!(me.permissions.pages.projects && me.permissions.pages.projects.view);
    const h1 = await W.page.textContent('.shell-body h1, .shell-body h2.page-title');
    ok(canView ? h1.includes('المشاريع') : h1.includes('ليس لديك صلاحية'), `guard follows server permissions (warehouse can view projects: ${canView})`, h1);
    if (canView) ok(!(await W.page.$('#btnAddProject')) && !(await W.page.$('.btn-edit-proj')), 'view-only: no add/edit buttons');
    await W.page.goto(srv.base + '/app/does-not-exist');
    await W.page.waitForSelector('.shell-body h1');
    ok((await W.page.textContent('.shell-body h1')).includes('غير موجودة'), 'unknown route → not found inside the shell');
    await W.ctx.close();
  }

  console.log('[6] two-factor: required role enrols, then logs in with a code');
  {
    const { totpAt, currentStep } = require('../server/dist/auth/totp');
    eq((await api('POST', '/api/users', { username: 'app_sales', password: PW, role: 'clientsSales' }, adminTok)).status, 201, 'sales user created');
    const S = await newContext('sales');
    await login(S.page, 'app_sales', PW);
    await S.page.waitForSelector('#tfPw');
    ok(true, 'enrolment screen for a required role');
    await S.page.fill('#tfPw', PW); await S.page.click('#tfStart');
    await S.page.waitForSelector('#tfSecret');
    const secret = (await S.page.textContent('#tfSecret')).replace(/\s/g, '');
    await S.page.fill('#tfOtp', totpAt(secret, currentStep())); await S.page.click('#tfEnable');
    await S.page.waitForSelector('#tfCodes');
    eq((await S.page.textContent('#tfCodes')).trim().split(/\s+/).length, 10, '10 recovery codes shown once');
    await S.page.click('#tfDone');
    await S.page.waitForSelector('#whoami');
    ok(true, 'shell after enrolment');
    await S.page.click('#logoutBtn');
    await S.page.waitForSelector('#loginForm');
    await S.page.fill('#username', 'app_sales'); await S.page.fill('#password', PW); await S.page.click('#loginBtn');
    await S.page.waitForSelector('#otp');
    ok((await S.page.textContent('#loginError')).includes('كود'), 'password accepted → asks for the code');
    await S.page.fill('#otp', totpAt(secret, currentStep() + 1)); await S.page.click('#loginBtn');
    await S.page.waitForSelector('#whoami');
    ok(true, 'login with code');
    await S.ctx.close();
  }

  console.log('[6b] phase 5: approvals inbox + notifications bell + attachment versions (test data only)');
  {
    const idem = (k) => ({ 'idempotency-key': 'app-e2e-' + k + '-' + Date.now() });
    const apiH = async (method, path, body, token, headers) => {
      const r = await fetch(srv.base + path, { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token, ...headers }, body: JSON.stringify(body) });
      return { status: r.status, body: await r.json() };
    };
    const ap = await api('POST', '/api/users', { username: 'app_approver', password: PW, role: 'viewer' }, adminTok);
    eq(ap.status, 201, 'approver user created');
    eq((await api('POST', '/api/v1/approvals/config/document-types', { code: 'e2e-doc', name: 'مستند اختبار', module: 'ledger.invoices' }, adminTok)).status, 201, 'test document type');
    eq((await api('POST', '/api/v1/approvals/config/workflows', { documentType: 'e2e-doc', allowSelfApproval: false, allowSameApproverAcrossLevels: false, levels: [{ mode: 'ANY', approvers: [{ type: 'USER', ref: ap.body.id }] }] }, adminTok)).status, 201, 'test workflow');
    const sub = await apiH('POST', '/api/v1/approvals/requests', { documentType: 'e2e-doc', documentId: 'E2E-1', amount: '1500.5' }, adminTok, idem('s'));
    eq([sub.status, sub.body.status], [201, 'Submitted'], 'submitted for approval');

    const P = await newContext('approver');
    await login(P.page, 'app_approver', PW);
    await P.page.waitForSelector('#whoami');
    await P.page.waitForFunction(() => document.querySelector('#bellBadge')?.getAttribute('data-unread') === '1');
    ok(true, 'bell shows 1 unread notification');
    await P.page.click('#navApprovals');
    await P.page.waitForSelector(`#inbox [data-id="${sub.body.id}"]`);
    ok((await P.page.textContent('#inbox')).includes('١٬٥٠٠٫٥٠'), 'inbox lists the request with formatted amount');
    await P.page.click(`#inbox [data-id="${sub.body.id}"] [data-act="reject"]`);
    ok((await P.page.textContent('#apprError')).includes('السبب'), 'reject without a reason is blocked');
    await P.page.click(`#inbox [data-id="${sub.body.id}"] [data-act="approve"]`);
    await P.page.waitForSelector('#inboxEmpty');
    eq((await api('GET', '/api/v1/approvals/requests/' + sub.body.id, null, adminTok)).body.status, 'Approved', 'approved from the UI');
    await P.ctx.close();

    eq((await api('POST', '/api/sync', { changes: [{ collection: 'projects', id: 'e2e-att', op: 'upsert', baseRev: 0, set: { name: 'مشروع مرفقات اختبار', attachments: [{ id: 'old1', name: 'مرفق-قديم.pdf', date: '2026-01-01' }] } }] }, adminTok)).status, 200, 'test project');
    await A.page.goto(srv.base + '/app/projects');
    await A.page.waitForSelector('#projTable tr[data-id="e2e-att"]');
    await A.page.click('#projTable .btn-edit-proj[data-id="e2e-att"]'); // المرفقات في نافذة التعديل (زي «📎 إرفاق مستند» في النافذة القديمة)
    await A.page.waitForSelector('#attUpload', { state: 'attached' });
    const pdf = (t) => Buffer.from(`%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R /T (${t}) >> endobj\n2 0 obj << /Type /Pages /Kids [] /Count 0 >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n`, 'latin1');
    await A.page.setInputFiles('#attUpload', { name: 'عقد.pdf', mimeType: 'application/pdf', buffer: pdf('v1') });
    await A.page.waitForSelector('#attList [data-version="1"]');
    const v1 = await A.page.getAttribute('#attList [data-version="1"]', 'data-id');
    await A.page.setInputFiles(`#attList [data-replace="${v1}"]`, { name: 'عقد-معدل.pdf', mimeType: 'application/pdf', buffer: pdf('v2') });
    await A.page.waitForSelector('#attList [data-version="2"]');
    ok((await A.page.textContent('#attList')).includes('متبدّل'), 'old version kept and marked superseded');
    const latest = await api('GET', '/api/attachments?collection=projects&recordId=e2e-att', null, adminTok);
    eq(latest.body.map((a) => a.version), [2], 'list returns the latest version only');
    // UAT 7.4 L11 (قرار المستخدم: توحيد المرفقات): كل واجهة بتعرض النوعين
    ok((await A.page.textContent('#attLegacyList')).includes('مرفق-قديم.pdf'), '/app/ edit window also lists the legacy record attachments (read-only)');
    await A.page.goto(srv.base + '/legacy/#projects');
    await A.page.waitForFunction(() => typeof openProjectModal === 'function' && window.WebSync && WebSync._state.meta && Array.isArray(DATA.projects) && DATA.projects.some((p) => p.id === 'e2e-att'), null, { timeout: 30000 });
    await A.page.evaluate(() => openProjectModal('e2e-att'));
    await A.page.waitForSelector('.cl-att-server [data-server-att]');
    ok((await A.page.textContent('.cl-att-server')).includes('عقد-معدل.pdf'), 'legacy project window (web) lists the server attachment uploaded from /app/ (latest version)');
    await A.page.evaluate(() => closeModal());
  }

  console.log('[6c] phase 6.1: suppliers & customers screens (cutover) write the same records the legacy UI reads (test data)');
  {
    // بنفس شكل الواجهة القديمة (DEC-0093): الإضافة في نافذة «إضافة مورد جديد»، والتعديل في تبويب «البيانات»
    await A.page.goto(srv.base + '/app/suppliers');
    await A.page.waitForSelector('#supNew');
    ok(!!(await A.page.$('.layout .sidebar .supplier-list, .layout .sidebar .empty-side')) && !!(await A.page.$('.main-panel .welcome')), 'legacy layout: sidebar list + welcome panel');
    await A.page.click('#supNew');
    await A.page.waitForSelector('#modalOverlay .modal.wide');
    await A.page.fill('#supNewForm [data-field="name"]', 'مورد اختبار الواجهة');
    await A.page.fill('#supNewForm [data-field="taxId"]', '1234');
    await A.page.click('#m_save');
    await A.page.waitForSelector('#supError');
    ok((await A.page.textContent('#supError')).includes('الرقم الضريبي'), 'server validation shown (short tax id)');
    await A.page.fill('#supNewForm [data-field="taxId"]', '123456789');
    await A.page.fill('#supNewForm [data-field="openingBalance"]', '-750.25');
    // الهاتف والبريد… مخفيين لحد زرار «+ إضافة خانة» (زي النافذة القديمة)، والخانة المخصصة باسم من نافذة صغيرة
    ok(!(await A.page.$('#supNewForm [data-field="phone"]')), 'phone/email/bank hidden until requested (legacy modal)');
    await A.page.click('#m_showExtraFields');
    await A.page.fill('#supNewForm [data-field="phone"]', '0100');
    await A.page.click('#m_addCustomFieldBtn'); await A.page.fill('#efPromptInput', 'المندوب'); await A.page.click('#efPromptOk');
    await A.page.fill('#m_customFieldsWrap [data-extra="0"] input', 'سعيد');
    await A.page.click('#m_addCustomFieldBtn'); await A.page.fill('#efPromptInput', 'فاضية'); await A.page.click('#efPromptOk');
    await A.page.click('#m_save');
    await A.page.waitForSelector('#supForm');
    await A.page.waitForSelector('#supList li.supplier-item.active');
    ok(await A.page.$eval('#supList li.supplier-item.active', (li) => li.textContent.includes('مورد اختبار الواجهة')), 'new supplier opened and marked active in the list');
    eq(await A.page.$eval('#supForm [data-field="openingBalance"]', (i) => i.value), '-750.25', 'opening balance shown like the legacy input (no trailing zeros)');
    eq(await A.page.$$eval('#supExtra [data-extra]', (r) => r.length), 1, 'empty custom field dropped (legacy collectExtraFields)');
    const b = await api('GET', '/api/bootstrap', null, adminTok);
    const legacy = b.body.data.ledger.suppliers.find((x) => x.name === 'مورد اختبار الواجهة');
    eq(legacy && [legacy.taxId, legacy.openingBalance, legacy.phone, legacy.attachments], ['123456789', -750.25, '0100', []], 'legacy sees the supplier with the same field types');
    eq(legacy && legacy.extraFields, [{ label: 'المندوب', value: 'سعيد' }], 'custom fields from the new screen reach the legacy record (DEC-0091)');
    // التعديل من تبويب «البيانات»
    await A.page.fill('#supForm [data-field="notes"]', 'ملاحظة');
    const [pu] = await Promise.all([A.page.waitForResponse((r) => r.url().includes('/api/v1/suppliers/') && r.request().method() === 'PATCH'), A.page.click('#supSave')]);
    eq(pu.status(), 200, 'info tab saves (PATCH with rev)');
    await A.page.waitForFunction(() => (document.getElementById('appToast')?.textContent || '').includes('تم حفظ البيانات'));
    ok(true, 'legacy-style toast');
    await A.page.fill('#supSearch', 'اختبار الواجهه');
    await A.page.waitForFunction(() => document.querySelectorAll('#supList li[data-id]').length === 1);
    ok(true, 'Arabic-normalized search');

    // العملاء: جدول بنفس أعمدة القديمة + نافذة العميل. الخانات المخصصة في القديمة معرّفة من الإعدادات: بتتعدّل قيمتها بس
    await api('POST', '/api/sync', { changes: [{ collection: 'clients.customers', id: 'cus_x1', op: 'upsert', baseRev: 0,
      set: { id: 'cus_x1', code: 'CUS-0900', name: 'عميل بخانات', phone: '', status: 'active', contracts: [], extraFields: [{ label: 'المنطقة', value: 'القاهرة' }] } }] }, adminTok);
    await A.page.goto(srv.base + '/app/customers');
    await A.page.waitForSelector('#cusNew');
    await A.page.waitForSelector('#cusList tr[data-id="cus_x1"]');
    const row = await A.page.$$eval('#cusList tr[data-id="cus_x1"] td', (td) => td.map((x) => x.textContent.trim()));
    eq([row[0], row[1], row[2], row[6]], ['CUS-0900', 'عميل بخانات', '—', '0'], 'table columns like the legacy table (code, name, phone, contracts)');
    ok(row[10].includes('ناقص: رقم الهاتف') && row[10].includes('لا يوجد عقد'), 'notes column from the server (same rules as customerNotesIssues)', row[10]);
    await A.page.click('#cusNew');
    await A.page.waitForSelector('#appModal .modal');
    await A.page.fill('#cusForm [data-field="name"]', 'عميل اختبار الواجهة');
    await A.page.click('#cusAddContact');
    await A.page.fill('[data-contact="0"] input.ct-name', 'م. اختبار');
    await A.page.fill('[data-contact="0"] input.ct-phone', '0100');
    const [pc] = await Promise.all([A.page.waitForResponse((r) => r.url().endsWith('/api/v1/customers') && r.request().method() === 'POST'), A.page.click('#cusSave')]);
    eq(pc.status(), 201, 'customer with a contact created');
    await A.page.waitForFunction(() => !document.getElementById('appModal'));
    const b2 = await api('GET', '/api/bootstrap', null, adminTok);
    const c = b2.body.data.clients.customers.find((x) => x.name === 'عميل اختبار الواجهة');
    ok(c && /^CUS-\d{4}$/.test(c.code), 'customer code generated by the server (legacy format)', c && c.code);
    eq(c && [c.status, Array.isArray(c.contracts), typeof c.createdAt], ['active', true, 'string'], 'legacy customer shape');
    eq(c && c.contacts.map((k) => [k.name, k.title, k.phone, k.email]), [['م. اختبار', '', '0100', '']], 'contacts edited in the new screen reach the legacy record');
    await A.page.click('#cusList tr[data-id="cus_x1"] .btn-edit-cust');
    await A.page.waitForSelector('#cusExtra [data-extra="0"]');
    ok((await A.page.textContent('#cusStatus')).includes('نشط'), 'customer status shown read-only, like the full screen');
    await A.page.fill('#cusExtra [data-extra="0"] input', 'الجيزة');
    const [pr] = await Promise.all([A.page.waitForResponse((r) => r.url().includes('/api/v1/customers/') && r.request().method() === 'PATCH'), A.page.click('#cusSave')]);
    eq(pr.status(), 200, 'customer edited from the modal');
    const b3 = await api('GET', '/api/bootstrap', null, adminTok);
    eq(b3.body.data.clients.customers.find((x) => x.id === 'cus_x1').extraFields, [{ label: 'المنطقة', value: 'الجيزة' }], 'customer custom field value reaches the legacy record (DEC-0091)');
    // التنقل بأقسام الواجهة القديمة: «الموردون» بيفتح الشاشة الجديدة، وباقي صفحات القسم في الواجهة القديمة
    const nav = await A.page.$$eval('#nav a', (as) => as.map((x) => [x.textContent.trim(), x.getAttribute('href') || '']));
    ok(nav.some(([t, h]) => t === 'العملاء' && h.endsWith('/customers')) && nav.some(([t, h]) => t === 'المشاريع' && h.endsWith('/projects')) && nav.filter(([t]) => t === 'المشاريع').length === 1 && nav.some(([t, h]) => t === 'العقود' && h.includes('/legacy/#clients.contracts')), 'legacy-style nav: customers and projects → new screens (once each), other pages → legacy', nav.slice(0, 30));
  }

  console.log('[6d] B-21: taxes screen — admin prepares, a different approver approves, preview uses approved only (test data)');
  {
    await A.page.goto(srv.base + '/app/taxes');
    await A.page.waitForSelector('#taxEmpty');
    ok(true, 'no tax codes seeded');
    await A.page.fill('#taxCodeForm input[name="code"]', 'TEST-E2E');
    await A.page.fill('#taxCodeForm input[name="name"]', 'ضريبة اختبار');
    await A.page.click('#taxCodeAdd');
    await A.page.waitForSelector('#taxTable tr[data-code="TEST-E2E"]');
    const ver = await api('POST', '/api/v1/finance/taxes/codes/TEST-E2E/versions', { method: 'PERCENT', rate: '10', base: 'NET_OF_DISCOUNT', appliesTo: ['test-doc'], bearer: 'COUNTERPARTY', collector: 'COUNTERPARTY_CHARGES', effectiveFrom: '2026-01-01', legalRef: 'مرجع اختباري', changeReason: 'اختبار' }, adminTok);
    eq(ver.status, 201, 'draft version created');
    await A.page.reload(); await A.page.waitForSelector(`tr[data-version="${ver.body.id}"][data-status="draft"]`);
    await A.page.click(`tr[data-version="${ver.body.id}"] [data-act="submit"]`);
    await A.page.waitForSelector(`tr[data-version="${ver.body.id}"][data-status="pending"]`);
    ok(!(await A.page.$(`tr[data-version="${ver.body.id}"] [data-act="approve"]`)), 'preparer sees no approve button (B-04)');
    const prev = await api('POST', '/api/v1/finance/taxes/compute', { documentType: 'test-doc', date: '2026-06-01', codes: ['TEST-E2E'], bases: { NET_OF_DISCOUNT: '1000' } }, adminTok);
    eq(prev.body.code, 'NO_APPROVED_RATE', 'pending rate is not applied');
    const apr = await api('POST', '/api/users', { username: 'app_tax_approver', password: PW, role: 'viewer' }, adminTok);
    await fetch(srv.base + `/api/users/${apr.body.id}/doc-actions`, { method: 'PUT', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + adminTok }, body: JSON.stringify({ approve: true }) });
    const T = await newContext('tax-approver');
    await login(T.page, 'app_tax_approver', PW);
    // صفحات Angular الجديدة في قسم «الإعدادات» (الأقسام بشكل الواجهة القديمة — DEC-0093)
    await T.page.waitForSelector('#nav [data-section="settings"]');
    await T.page.click('#nav [data-section="settings"]');
    await T.page.waitForSelector('#navTaxes');
    await T.page.click('#navTaxes');
    await T.page.waitForSelector(`tr[data-version="${ver.body.id}"] [data-act="approve"]`);
    await T.page.click(`tr[data-version="${ver.body.id}"] [data-act="approve"]`);
    await T.page.waitForSelector(`tr[data-version="${ver.body.id}"][data-status="approved"]`);
    await T.page.fill('#taxPreview input[name="pdoc"]', 'test-doc');
    await T.page.fill('#taxPreview input[name="pdate"]', '2026-06-01');
    await T.page.fill('#taxPreview input[name="pcodes"]', 'TEST-E2E');
    await T.page.fill('#taxPreview input[name="pbase"]', '1000');
    await T.page.click('#taxPreviewBtn');
    await T.page.waitForSelector('#taxPreviewOut li');
    ok((await T.page.textContent('#taxPreviewOut')).includes('100.0000'), 'preview with the approved version');
    await T.ctx.close();
  }

  console.log('[6e] 6.2-B: warehouses screen — items/balances, transfer blocked above availability, adjustment → approval → auto-post (test data)');
  {
    A.page.on('dialog', (d) => d.accept('سبب اختباري'));
    await A.page.goto(srv.base + '/app/warehouses');
    await A.page.waitForSelector('#whItems');
    const loc = async (name) => (await api('POST', '/api/v1/warehouses/locations', { name }, adminTok)).body.id;
    const L1 = await loc('مخزن واجهة 1'), L2 = await loc('مخزن واجهة 2');
    // بشكل الواجهة القديمة (DEC-0097): تبويبات wh-tab، والإضافة والتعديل في نوافذ
    ok(!!(await A.page.$('.page #whTabs .wh-tab[data-tab="stock"]')) && !!(await A.page.$('#whStats .stat-card')), 'legacy layout: tabs + KPI cards');
    await A.page.click('#whTabs [data-tab="items"]');
    await A.page.click('#btnWhAddItem'); await A.page.waitForSelector('#appModal');
    await A.page.fill('#whModalForm [data-field="name"]', 'صنف واجهة'); await A.page.fill('#whModalForm [data-field="category"]', 'خامات');
    await A.page.click('#whModalSave');
    await A.page.waitForFunction(() => !document.getElementById('appModal') && [...document.querySelectorAll('#whItemsList tr')].some((r) => r.textContent.includes('صنف واجهة')));
    const ov = await api('GET', '/api/v1/warehouses', null, adminTok);
    const it = ov.body.items.find((x) => x.name === 'صنف واجهة');
    ok(/^ITM-\d{4}$/.test(it.code), 'item created from the item modal (server code, legacy format)');
    await api('POST', '/api/sync', { changes: [{ collection: 'warehouses.movements', id: 'ui-rcv', op: 'upsert', baseRev: 0, set: { id: 'ui-rcv', type: 'in', itemId: it.id, qty: 5, locationId: L1 } }] }, adminTok);
    const tr = await api('POST', '/api/v1/warehouses/transfers', { itemId: it.id, fromLocationId: L1, toLocationId: L2, qty: '6' }, adminTok);
    eq([tr.status, tr.body.code], [409, 'NEGATIVE_STOCK'], 'transfer above availability refused by the server (B-50)');
    // التحويل من الشاشة (نافذة «تحويل بين مخازن»): الأكبر من المتاح بيتمنع قبل الإرسال، والصحيح بياخد كود MV-NNNN
    await A.page.reload(); await A.page.waitForSelector(`#whItems tr[data-id="${it.id}"]`);
    await A.page.click('#btnWhTransfer'); await A.page.waitForSelector('#appModal');
    await A.page.selectOption('#whModalForm [data-field="itemId"]', it.id);
    await A.page.selectOption('#whModalForm [data-field="fromLocationId"]', L1); await A.page.selectOption('#whModalForm [data-field="toLocationId"]', L2);
    await A.page.fill('#whModalForm [data-field="qty"]', '6'); await A.page.click('#whModalSave');
    await A.page.waitForFunction(() => (document.getElementById('appToast')?.textContent || '').includes('الرصيد غير كافٍ'));
    ok(!!(await A.page.$('#appModal')), 'over-availability transfer blocked in the modal (legacy toast)');
    await A.page.fill('#whModalForm [data-field="qty"]', '2');
    const [pt] = await Promise.all([A.page.waitForResponse((r) => r.url().endsWith('/api/v1/warehouses/transfers') && r.request().method() === 'POST'), A.page.click('#whModalSave')]);
    eq(pt.status(), 201, 'valid transfer from the screen');
    ok(/^MV-\d{4}$/.test((await pt.json()).id), 'transfer code in the legacy format (MV-NNNN)');
    await A.page.waitForSelector('#whMoves tr[data-id]');
    await A.page.click('#whTabs [data-tab="stock"]');
    eq(await A.page.getAttribute(`#whItems tr[data-id="${it.id}"] td[data-total]`, 'data-total'), '5', 'total unchanged by a transfer');
    // تعديل المخزن من نافذته: الاسم يتغيّر والكود ثابت
    await A.page.click('#whTabs [data-tab="locations"]');
    await A.page.click(`#whLocations .btn-edit-loc[data-id="${L2}"]`); await A.page.waitForSelector('#appModal');
    ok(await A.page.$eval('#whModalForm [data-field="code"]', (i) => i.readOnly), 'warehouse code read-only on edit (legacy)');
    await A.page.fill('#whModalForm [data-field="name"]', 'مخزن واجهة معدّل'); await A.page.click('#whModalSave');
    await A.page.waitForFunction((id) => document.querySelector(`#whLocations tr[data-id="${id}"]`)?.textContent.includes('مخزن واجهة معدّل'), L2);
    ok(true, 'warehouse renamed from the modal');
    // التسوية: مسار اختبار بمعتمد واحد (مستخدم تاني)
    eq((await api('POST', '/api/v1/approvals/config/document-types', { code: 'stock-adjustment', name: 'تسوية مخزنية', module: 'warehouses.home' }, adminTok)).status, 201, 'test doc type');
    const apr = await api('POST', '/api/users', { username: 'app_adj_approver', password: PW, role: 'viewer' }, adminTok);
    eq((await api('POST', '/api/v1/approvals/config/workflows', { documentType: 'stock-adjustment', levels: [{ mode: 'ANY', approvers: [{ type: 'USER', ref: apr.body.id }] }] }, adminTok)).status, 201, 'test workflow');
    const adj = await api('POST', '/api/v1/stock/adjustments', { kind: 'increase', itemId: it.id, locationId: L1, qty: '1.5', reason: 'تسوية من اختبار الواجهة' }, adminTok);
    await A.page.reload(); await A.page.click('#whTabs [data-tab="adjustments"]');
    await A.page.waitForSelector(`#whAdjs tr[data-id="${adj.body.id}"][data-status="draft"]`);
    await A.page.click(`#whAdjs tr[data-id="${adj.body.id}"] [data-act="submit"]`);
    await A.page.waitForSelector(`#whAdjs tr[data-id="${adj.body.id}"][data-status="submitted"]`);
    ok(true, 'submitted for approval from the screen');
    const t2 = (await api('POST', '/api/auth/login', { username: 'app_adj_approver', password: PW })).body.accessToken;
    const reqId = (await api('GET', `/api/v1/stock/adjustments/${adj.body.id}`, null, adminTok)).body.approvalRequestId;
    const r = await fetch(srv.base + `/api/v1/approvals/requests/${reqId}/approve`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t2, 'idempotency-key': 'app-e2e-adj-' + Date.now() }, body: '{}' });
    eq(r.status, 200, 'approved by a different user');
    await A.page.reload(); await A.page.click('#whTabs [data-tab="adjustments"]');
    await A.page.waitForSelector(`#whAdjs tr[data-id="${adj.body.id}"][data-status="posted"]`);
    ok(true, 'auto-posted after the last approval');
    eq((await api('GET', '/api/v1/warehouses', null, adminTok)).body.items.find((x) => x.id === it.id).total, '6.5', 'balance includes the posted adjustment only after posting');
  }

  console.log('[6f] B-20: Financial Rules Management — draft with passing tests, preview, submit, approval by a different user (test data)');
  {
    const lib = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../server/finance-formulas/B20_LIBRARY.json'), 'utf8')).formulas;
    const f = lib.find((x) => x.code === 'PROJECT-PROFIT');
    eq((await api('POST', '/api/v1/finance/formulas', { code: f.code, name: f.name, module: f.module }, adminTok)).status, 201, 'formula created');
    const v = await api('POST', `/api/v1/finance/formulas/${f.code}/versions`, { changeKind: 'new', effectiveFrom: '2026-01-01', changeReason: 'اختبار الواجهة', definition: { variables: f.variables, lists: f.lists, steps: f.steps }, testCases: f.testCases }, adminTok);
    eq([v.status, v.body.tests_passed], [201, true], 'draft version with passing tests');
    await A.page.goto(srv.base + '/app/formulas');
    await A.page.waitForSelector(`#frmTable tr[data-version="${v.body.id}"][data-status="draft"]`);
    await A.page.click(`#frmTable tr[data-version="${v.body.id}"] td:first-child`);
    await A.page.waitForSelector('#frmTests tr[data-test-status="PASS"]');
    ok((await A.page.textContent('#frmSteps')).includes('GrossProfit'), 'formula steps shown');
    await A.page.click('#frmPreviewBtn');
    await A.page.waitForSelector('#frmPreviewOut');
    ok((await A.page.textContent('#frmPreviewOut')).includes('34569.7500'), 'preview result');
    ok(!(await A.page.$('#frmDetail [data-act="approve"]')), 'creator sees no approve button');
    await A.page.click('#frmDetail [data-act="submit"]');
    await A.page.waitForSelector(`#frmTable tr[data-version="${v.body.id}"][data-status="pending"]`);
    const T = await newContext('formula-approver');
    await login(T.page, 'app_tax_approver', PW);
    await T.page.click('#nav [data-section="settings"]');
    await T.page.waitForSelector('#navFormulas');
    await T.page.click('#navFormulas');
    await T.page.click(`#frmTable tr[data-version="${v.body.id}"] td:first-child`);
    await T.page.click('#frmDetail [data-act="approve"]');
    await T.page.waitForSelector(`#frmTable tr[data-version="${v.body.id}"][data-status="approved"]`);
    ok(true, 'approved by a different user from the screen');
    await T.ctx.close();
    const e = await api('POST', `/api/v1/finance/formulas/${f.code}/evaluate`, { date: '2026-06-01', inputs: { RecognizedRevenue: '200', RecognizedProjectCost: '150' } }, adminTok);
    eq(e.body.outputs, { GrossProfit: '50.000000', ProfitMargin: '25.000000' }, 'evaluation uses the approved version');
  }

  console.log('[6g] 7.2: supplier invoices screen — legacy layout, add via the modal (server formula + PI- number), linked return cancels the original, view modal (test data)');
  {
    await api('POST', '/api/sync', { changes: [{ collection: 'ledger.suppliers', id: 'si-ui-sup', op: 'upsert', baseRev: 0, set: { id: 'si-ui-sup', name: 'مورد شاشة الفواتير', taxId: '987', commercialReg: 'CR-1', openingBalance: 0, extraFields: [], attachments: [] } }] }, adminTok);
    await A.page.goto(srv.base + '/app/supplier-invoices');
    await A.page.waitForSelector('#invTable');
    // قلب التوجيه (موافقة 2026-11-22): «الفواتير» و«المرتجعات» في صف القسم بيفتحوا الشاشة الجديدة
    const navHrefs = await A.page.$$eval('a', (as) => as.map((a) => a.getAttribute('href') || ''));
    ok(navHrefs.some((h) => /\/supplier-invoices$/.test(h)) && navHrefs.some((h) => /\/supplier-returns$/.test(h)), 'section links open /app/supplier-invoices and /app/supplier-returns', navHrefs.filter((h) => /supplier|ledger/.test(h)));
    ok(!!(await A.page.$('.filters-row #invSearchBox')) && (await A.page.$$('#invStats .stat-card')).length === 6 && (await A.page.$$('#invTable thead th')).length === 17, 'legacy layout: filters row, 6 cards, 17 columns');
    await A.page.click('#openAddInvoiceModalBtnGlobal'); await A.page.waitForSelector('#modalOverlay .modal.wide');
    await A.page.selectOption('#inv_supplier', 'si-ui-sup');
    eq(await A.page.inputValue('#inv_taxid_display'), '987', 'supplier tax id shown read-only');
    await A.page.fill('#inv_number', 'UI-1'); await A.page.fill('#inv_date', '2026-05-01');
    await A.page.fill('.inv-item-desc', 'أسمنت'); await A.page.fill('.inv-item-quantity', '10');
    await A.page.click('#inv_addItemBtn'); await A.page.locator('.inv-item-desc').nth(1).fill('حديد');
    await A.page.fill('#inv_baseValue', '1000'); await A.page.fill('#inv_vat', '140'); await A.page.fill('#inv_discountRate', '1');
    eq(await A.page.inputValue('#inv_withheld'), '10', 'withheld suggested = base x rate (legacy suggestWithheld)');
    ok((await A.page.inputValue('#inv_netInvoice')).startsWith('١,١٣٠'), 'net shown live (display only)');
    const [pr] = await Promise.all([A.page.waitForResponse((r) => r.url().endsWith('/api/v1/supplier-invoices') && r.request().method() === 'POST'), A.page.click('#m_save')]);
    eq(pr.status(), 201, 'saved from the modal (Idempotency-Key sent)');
    const inv = await pr.json();
    ok(/^PI-2026-\d{5}$/.test(inv.internalNo) && inv.netInvoice === 1130 && inv.description === 'أسمنت\nحديد' && inv.quantity === '10\n', 'server formula + internal number + item rows joined like the legacy modal', inv);
    await A.page.waitForSelector(`#invTable tr[data-viewinv="${inv.id}"]`);
    ok((await A.page.textContent(`#invTable tr[data-viewinv="${inv.id}"]`)).includes(inv.internalNo), 'row shows the supplier number and the internal number');
    // B-31 من الشاشة: نفس الرقم لنفس المورد ← رسالة السيرفر في النافذة
    await A.page.click('#openAddInvoiceModalBtnGlobal'); await A.page.waitForSelector('#modalOverlay');
    await A.page.selectOption('#inv_supplier', 'si-ui-sup'); await A.page.fill('#inv_number', 'ui-1'); await A.page.fill('#inv_date', '2026-05-02'); await A.page.fill('#inv_baseValue', '5');
    await A.page.click('#m_save'); await A.page.waitForSelector('#invError');
    ok((await A.page.textContent('#invError')).includes('B-31'), 'duplicate supplier number refused (B-31) with the server message');
    await A.page.click('#m_cancel');
    // مرتجع كامل مربوط من صفحة المرتجعات ← الأصل ملغي (شارة «فاتورة ملغاة»)
    await A.page.goto(srv.base + '/app/supplier-returns'); await A.page.waitForSelector('#invTable');
    ok(!(await A.page.$('#invFilterOverdue')) && !(await A.page.$('#openAddInvoiceModalBtnGlobal')), 'returns page: no overdue filter, no add-invoice button (legacy)');
    await A.page.click('#openAddReturnModalBtn'); await A.page.waitForSelector('#inv_linkedWrap');
    await A.page.selectOption('#inv_supplier', 'si-ui-sup');
    await A.page.waitForFunction((id) => !!document.querySelector(`#inv_linkedInvoice option[value="${id}"]`), inv.id);
    await A.page.selectOption('#inv_linkedInvoice', inv.id);
    await A.page.fill('#inv_number', 'UI-R1'); await A.page.fill('#inv_date', '2026-05-03'); await A.page.fill('#inv_baseValue', '1130');
    ok((await A.page.textContent('#inv_linkedHint')).includes('مرتجع كامل'), 'linked hint: full return cancels the original');
    const [rr] = await Promise.all([A.page.waitForResponse((r) => r.url().endsWith('/api/v1/supplier-invoices') && r.request().method() === 'POST'), A.page.click('#m_save')]);
    eq([rr.status(), (await rr.json()).internalNo.slice(0, 3)], [201, 'PR-'], 'return saved with a PR- number');
    await A.page.goto(srv.base + '/app/supplier-invoices'); await A.page.waitForSelector(`#invTable tr[data-viewinv="${inv.id}"]`);
    ok((await A.page.textContent(`#invTable tr[data-viewinv="${inv.id}"]`)).includes('فاتورة ملغاة'), 'original shows «فاتورة ملغاة»');
    await A.page.click(`#invTable tr[data-viewinv="${inv.id}"] [data-viewinv-btn]`); await A.page.waitForSelector('#invViewModal');
    ok((await A.page.textContent('#invViewModal')).includes('المرتجعات المرتبطة (1)') && (await A.page.textContent('#invViewInternalNo')) === inv.internalNo, 'view modal: linked returns + internal number');
    await A.page.click('#m_close_view');
    eq((await api('GET', `/api/v1/supplier-invoices/${inv.id}`, null, adminTok)).body.events.map((e) => e.type), ['supplier-invoice.posted', 'supplier-invoice.cancelled'], 'outbox events: posted, then cancelled');
  }

  console.log('[6h] 7.3: payments screen (allocation, unclassified review), statement by F-05, supplier balance (test data)');
  {
    const up = (collection, id, set) => ({ collection, id, op: 'upsert', baseRev: 0, set: { id, ...set } });
    await api('POST', '/api/sync', { changes: [
      up('ledger.suppliers', 'pay-ui-sup', { name: 'مورد شاشة الدفعات', taxId: '321', commercialReg: 'CR-9', openingBalance: 1000, extraFields: [], attachments: [] }),
      up('ledger.invoices', 'pay-ui-i1', { supplierId: 'pay-ui-sup', invoiceNo: 'PUI-1', date: '2026-02-01', baseValue: 1000, vat: 140, stampDuty: 0, withheld: 10, totalInvoice: 1140, netInvoice: 1130, isReturn: false, attachments: [], notes: '' }),
      up('ledger.invoices', 'pay-ui-ic', { supplierId: 'pay-ui-sup', invoiceNo: 'PUI-C', date: '2026-02-02', baseValue: 500, vat: 0, stampDuty: 0, withheld: 0, totalInvoice: 500, netInvoice: 500, isReturn: false, cancelled: true, attachments: [], notes: '' }),
      up('ledger.payments', 'pay-ui-u1', { paymentNo: 900, supplierId: 'pay-ui-sup', invoiceId: '', amount: 40, method: 'نقدي', date: '2026-02-03', transferRef: '', notes: 'غير مصنّفة', extraFields: [], attachments: [] }),
    ] }, adminTok);
    await A.page.goto(srv.base + '/app/supplier-payments');
    await A.page.waitForSelector('#payTable');
    // قلب التوجيه (موافقة 2026-11-22): «الدفعات» في صف قسم «الحسابات» بتفتح الشاشة الجديدة
    ok((await A.page.$$eval('a', (as) => as.map((x) => x.getAttribute('href') || ''))).some((h) => /\/supplier-payments$/.test(h)), 'section link opens /app/supplier-payments');
    ok(!!(await A.page.$('.filters-row #paymentsSearchBox')) && (await A.page.$$('#payStats .stat-card')).length === 2 && (await A.page.$$('#payTable thead th')).length === 10, 'legacy layout: filters row, 2 cards, 10 columns');
    // دفعة موزّعة من النافذة: 700 على PUI-1 من 1000 ← سجلين بنفس الـ batch (الفاتورة + الباقي 300)
    await A.page.click('#openAddPaymentPageBtn'); await A.page.waitForSelector('#m_pay_save');
    await A.page.selectOption('#m_pay_supplier', 'pay-ui-sup');
    eq(await A.page.inputValue('#m_pay_taxid'), '321', 'supplier tax id shown');
    await A.page.waitForSelector('.m_pay_inv_cb[value="pay-ui-i1"]');
    ok(!(await A.page.$('.m_pay_inv_cb[value="pay-ui-ic"]')), 'cancelled invoice not offered for allocation');
    await A.page.fill('#m_pay_amount', '1000');
    await A.page.check('.m_pay_inv_cb[value="pay-ui-i1"]');
    await A.page.waitForFunction(() => document.querySelector('.m_pay_inv_amt[data-invid="pay-ui-i1"]')?.value !== '', null, { timeout: 5000 }).catch(() => {});
    eq(await A.page.inputValue('.m_pay_inv_amt[data-invid="pay-ui-i1"]'), '1130', 'checking an invoice pre-fills its remaining (legacy)');
    await A.page.fill('.m_pay_inv_amt[data-invid="pay-ui-i1"]', '700');
    ok((await A.page.textContent('#m_pay_allocHint')).includes('متبقي للتوزيع'), 'allocation hint: remainder');
    const [pr] = await Promise.all([A.page.waitForResponse((r) => r.url().endsWith('/api/v1/supplier-payments') && r.request().method() === 'POST'), A.page.click('#m_pay_save')]);
    eq(pr.status(), 201, 'saved from the modal (Idempotency-Key sent)');
    const pay = await pr.json();
    eq(pay.batch.map((b) => [b.invoiceId, b.amount]), [['pay-ui-i1', 700], ['', 300]], 'one record per invoice + the remainder, same batch');
    ok(/^PV-2026-\d{5}$/.test(pay.internalNo), 'PV- internal number');
    await A.page.waitForSelector(`#payTable tr[data-viewpay="${pay.id}"]`);
    await A.page.click(`#payTable tr[data-viewpay="${pay.id}"] [data-viewpay-btn]`); await A.page.waitForSelector('#payViewModal');
    ok((await A.page.textContent('#payViewBatch')).includes('2 بند'), 'view modal shows the allocated batch');
    await A.page.click('#m_close_pay_view');
    // الكشف بـ F-05 قبل المراجعة: 1000 + 1130 (الملغاة برا) − 1000 = 1130، والـ 40 غير المصنّفة برا الرصيد ومعاها علامة الفرق
    await A.page.goto(srv.base + '/app/supplier-statement?supplierId=pay-ui-sup');
    await A.page.waitForSelector('#stClosing');
    ok((await A.page.textContent('#stClosing')).includes('١,١٣٠'), 'statement closing by F-05 (cancelled out, unclassified out)', await A.page.textContent('#stClosing'));
    ok(!!(await A.page.$('#stDiffers')) && !!(await A.page.$('#stUnclassified')), 'difference banner + unclassified list');
    eq(await A.page.$$eval('#stTable tr[data-type]', (rs) => rs.map((r) => r.getAttribute('data-type'))), ['invoice', 'pay', 'pay'], 'statement lines: invoice, the two payment records (no cancelled, no unclassified)');
    // مراجعة غير المصنّفة: دفعة واحدة بزرارها (التأكيد بيتقبل)
    await A.page.goto(srv.base + '/app/supplier-payments'); await A.page.waitForSelector('#payReviewBtn');
    await A.page.click('#payReviewBtn'); await A.page.waitForSelector('#payReviewHint');
    await Promise.all([A.page.waitForResponse((r) => r.url().endsWith('/api/v1/supplier-payments/pay-ui-u1/direction')), A.page.click('[data-classify-collect="pay-ui-u1"]')]);
    eq((await api('GET', '/api/v1/supplier-payments/pay-ui-u1', null, adminTok)).body.direction, 'collect', 'unclassified payment classified one at a time (collect)');
    // رصيد المورد في شاشة الموردين بـ F-05: 1130 + 40 (التحصيل بيتجمع) = 1170
    await A.page.goto(srv.base + '/app/suppliers'); await A.page.waitForSelector('#supList [data-id="pay-ui-sup"]');
    eq(await A.page.getAttribute('#supList [data-id="pay-ui-sup"] .s-balance', 'data-balance'), '1170.000000', 'supplier list shows the F-05 balance');
    await A.page.selectOption('#supBalanceFilter', 'zero');
    ok(!(await A.page.$('#supList [data-id="pay-ui-sup"]')), 'balance filter (paid off) hides a supplier with a balance');
    await A.page.selectOption('#supBalanceFilter', '');
  }

  console.log('[7] logout ends the shared session; PWA service worker registers; no CSP violations');
  {
    const reg = await A.page.waitForFunction(() => navigator.serviceWorker.getRegistration('/app/').then((r) => !!r), null, { timeout: 45000 }).then(() => true).catch(() => false);
    ok(reg, 'service worker registered for /app/');
    const csp = await A.page.evaluate(() => window.__csp);
    eq(csp, [], 'no CSP violations in /app/');
    await A.page.click('#logoutBtn');
    await A.page.waitForSelector('#loginForm');
    const rr = await A.page.evaluate(async () => (await fetch('/api/auth/refresh', { method: 'POST' })).status);
    eq(rr, 401, 'refresh cookie revoked (legacy session ends too)');
  }

  await browser.close();
  await srv.stop();
  summary(errors);
})().catch(async (e) => { console.error('FATAL', e); try { await browser.close(); await srv.stop(); } catch (_) {} process.exit(1); });
