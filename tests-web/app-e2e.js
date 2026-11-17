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
  page.on('console', (m) => { if (m.type() === 'error' && !/status of (400|401|403|404)/.test(m.text())) errors.push(`${tag} console: ${m.text()}`); });
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
    ok(nav.app.includes('projects') && nav.legacy.includes('/legacy/#ledger.suppliers'), 'menu from the page routing table (pilot in Angular, others → legacy)', nav);
  }
  r = await api('POST', '/api/auth/login', { username: 'admin', password: PW });
  adminTok = r.body.accessToken;
  await api('POST', '/api/sync', { changes: [
    { collection: 'projects', id: 'p1', op: 'upsert', baseRev: 0, set: { name: 'مشروع الشروق', code: 'PRJ-1', budget: 1250000.5, status: 'active' } },
    { collection: 'projects', id: 'p2', op: 'upsert', baseRev: 0, set: { name: 'مشروع النيل', code: 'PRJ-2', budget: '2000.00005', status: 'active' } },
  ] }, adminTok);

  console.log('[3] pilot screen reads /api/v1/projects; money shown from the server string (no client math)');
  {
    await A.page.click('#nav [data-page="projects"]');
    await A.page.waitForSelector('#projectsTable tr[data-id="p1"]');
    const rows = await A.page.evaluate(() => [...document.querySelectorAll('#projectsTable tr[data-id]')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim())));
    eq(rows.length, 2, 'two projects listed');
    const budgets = rows.map((x) => x[3]);
    ok(budgets.includes('١٬٢٥٠٬٠٠٠٫٥٠') && budgets.includes('٢٬٠٠٠٫٠٠٠١'), 'budgets: 1250000.5 → ١٬٢٥٠٬٠٠٠٫٥٠ · 2000.00005 → HALF_UP 4dp ٢٬٠٠٠٫٠٠٠١', budgets);
    await A.page.fill('#projSearch', 'نيل');
    await A.page.waitForFunction(() => document.querySelectorAll('#projectsTable tr[data-id]').length === 1);
    ok(true, 'search filters on the server');
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
    await W.page.waitForSelector('h1');
    const canView = !!(me.permissions.pages.projects && me.permissions.pages.projects.view);
    const h1 = await W.page.textContent('h1');
    ok(canView ? h1.includes('المشروعات') : h1.includes('ليس لديك صلاحية'), `guard follows server permissions (warehouse can view projects: ${canView})`, h1);
    await W.page.goto(srv.base + '/app/does-not-exist');
    await W.page.waitForSelector('h1');
    ok((await W.page.textContent('h1')).includes('غير موجودة'), 'unknown route → not found inside the shell');
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

    eq((await api('POST', '/api/sync', { changes: [{ collection: 'projects', id: 'e2e-att', op: 'upsert', baseRev: 0, set: { name: 'مشروع مرفقات اختبار' } }] }, adminTok)).status, 200, 'test project');
    await A.page.goto(srv.base + '/app/projects');
    await A.page.waitForSelector('#projectsTable [data-id="e2e-att"]');
    await A.page.click('#projectsTable [data-id="e2e-att"]');
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
  }

  console.log('[6c] phase 6.1: suppliers & customers screens (cutover) write the same records the legacy UI reads (test data)');
  {
    await A.page.goto(srv.base + '/app/suppliers');
    await A.page.waitForSelector('#supNew');
    await A.page.click('#supNew');
    await A.page.fill('#supForm [data-field="name"]', 'مورد اختبار الواجهة');
    await A.page.fill('#supForm [data-field="taxId"]', '1234');
    await A.page.click('#supSave');
    await A.page.waitForSelector('#supError');
    ok((await A.page.textContent('#supError')).includes('الرقم الضريبي'), 'server validation shown (short tax id)');
    await A.page.fill('#supForm [data-field="taxId"]', '123456789');
    await A.page.fill('#supForm [data-field="openingBalance"]', '-750.25');
    await A.page.click('#supSave');
    await A.page.waitForFunction(() => /٧٥٠٫٢٥|750\.25/.test(document.querySelector('#supOpening')?.textContent || ''));
    const b = await api('GET', '/api/bootstrap', null, adminTok);
    const legacy = b.body.data.ledger.suppliers.find((x) => x.name === 'مورد اختبار الواجهة');
    eq(legacy && [legacy.taxId, legacy.openingBalance, legacy.attachments], ['123456789', -750.25, []], 'legacy sees the supplier with the same field types');
    await A.page.fill('#supSearch', 'اختبار الواجهه');
    await A.page.waitForFunction(() => document.querySelectorAll('#supList li[data-id]').length === 1);
    ok(true, 'Arabic-normalized search');

    await A.page.goto(srv.base + '/app/customers');
    await A.page.waitForSelector('#cusNew');
    await A.page.click('#cusNew');
    await A.page.fill('#cusForm [data-field="name"]', 'عميل اختبار الواجهة');
    await A.page.click('#cusSave');
    await A.page.waitForFunction(() => /^CUS-\d{4}$/.test(document.querySelector('#cusForm [data-field="code"]')?.value || ''));
    ok(true, 'customer code generated by the server (legacy format)');
    await A.page.click('#cusAddContact');
    await A.page.fill('[data-contact="0"] input[name="cn0"]', 'م. اختبار');
    await A.page.fill('[data-contact="0"] input[name="cp0"]', '0100');
    const [pr] = await Promise.all([A.page.waitForResponse((r) => r.url().includes('/api/v1/customers/') && r.request().method() === 'PATCH'), A.page.click('#cusSave')]);
    eq(pr.status(), 200, 'customer with a contact saved');
    const b2 = await api('GET', '/api/bootstrap', null, adminTok);
    const c = b2.body.data.clients.customers.find((x) => x.name === 'عميل اختبار الواجهة');
    eq(c && [c.status, Array.isArray(c.contracts), typeof c.createdAt], ['active', true, 'string'], 'legacy customer shape');
    eq(c && c.contacts.map((k) => [k.name, k.title, k.phone, k.email]), [['م. اختبار', '', '0100', '']], 'contacts edited in the new screen reach the legacy record');
    const nav = await A.page.$$eval('#nav a', (as) => as.map((x) => [x.textContent.trim(), x.getAttribute('href') || '']));
    ok(nav.some(([t, h]) => t.includes('الموردين') && !t.includes('الكاملة') && h.endsWith('/suppliers')) && nav.some(([t, h]) => t.includes('الموردين — الشاشة الكاملة') && h.includes('/legacy/')), 'cutover: suppliers → new screen, full legacy screen still reachable');
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
