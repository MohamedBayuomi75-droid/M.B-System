// Playwright harness for the unified system renderer (no Electron needed)
const path = require('path');
const fs = require('fs');
// كل المسارات من env (مع افتراضات معقولة) — مفيش مسارات ثابتة لجهاز معيّن.
//   PLAYWRIGHT_PATH : مسار حزمة playwright لو مش متاحة بـ require('playwright')
//   CHROME_PATH     : مسار متصفح Chromium/Chrome (اختياري — الافتراضي متصفح playwright نفسه)
//   APP_ROOT        : جذر المشروع (الافتراضي: المجلد الأب لـ tests-merge)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ROOT = process.env.APP_ROOT || path.resolve(__dirname, '..');
const CHROME_PATH = process.env.CHROME_PATH || '';

async function openApp(seed, opts = {}) {
  const browser = await chromium.launch({ ...(CHROME_PATH && fs.existsSync(CHROME_PATH) ? { executablePath: CHROME_PATH } : {}), args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'ar-EG' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(({ seed }) => {
    window.__saved = null; window.__saveCount = 0;
    const store = { data: seed ? JSON.parse(JSON.stringify(seed)) : null };
    window.desktopApi = new Proxy({
      loadData: async () => store.data ? JSON.parse(JSON.stringify(store.data)) : null,
      saveData: async (d) => { store.data = JSON.parse(JSON.stringify(d)); window.__saved = store.data; window.__saveCount++; return { ok: true }; },
      saveDataSync: (d) => { store.data = JSON.parse(JSON.stringify(d)); window.__saved = store.data; return { ok: true }; },
      hashPassword: async (p) => ({ salt: 's', hash: 'h' + p }),
      verifyPassword: async () => true,
      getAppVersion: async () => '1.2.0-test',
      getDataPath: async () => '/tmp/x',
      snapshotData: async () => ({ ok: true }),
      pickAttachments: async () => [],
      saveFile: async () => ({ ok: true }),
      savePdf: async () => ({ ok: true }),
      savePdfHtml: async () => ({ ok: true }),
      getLockInfo: async () => ({}),
      getExtraBackupDir: async () => '',
    }, { get: (t, k) => (k in t ? t[k] : async () => ({ ok: true })) });
    try { sessionStorage.setItem('mb_local_session', JSON.stringify({ username: 'admin', name: 'المدير', role: 'admin', at: Date.now() })); } catch (e) {}
  }, { seed });
  await page.goto('file://' + path.join(ROOT, 'renderer/index.html'));
  await page.waitForFunction(() => typeof DATA !== 'undefined' && document.querySelector('#app') && document.querySelector('#app').children.length > 0, null, { timeout: 15000 });
  await page.waitForTimeout(600);
  return { browser, page, errors };
}

/* =====================================================================================
 * وضع الويب (A4): WEB_MODE=1 — نفس الاختبارات بالظبط فوق السيرفر الحقيقي (NestJS + PostgreSQL):
 *   لكل openApp: قاعدة جديدة + سيرفر جديد (server/dist) → دخول admin → الـ seed بيعدي على ترحيلات
 *   الواجهة نفسها (loadData) ← saveData يرفعه للسيرفر عبر /api/sync ← إعادة تحميل الصفحة من /api/bootstrap.
 *   window.__saved / __saveCount بيتحدّثوا بعد ما الحفظ على السيرفر يخلص.
 *   المتطلبات: npm --prefix server run build + PostgreSQL (WEB_TEST_DATABASE_URL، افتراضي حاوية التطوير).
 * ===================================================================================== */
const WEB = process.env.WEB_MODE === '1';
const ADMIN_PW = 'Harness#Admin#2026';
const ADMIN_INIT = 'Harness#Init#2026';

async function freePort() {
  const net = require('net');
  return new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
}

async function startWebServer() {
  const { Client } = require(path.join(ROOT, 'server/node_modules/pg'));
  const adminUrl = process.env.WEB_TEST_DATABASE_URL || 'postgres://unified:devpass@localhost:55432/postgres';
  const db = 'unified_ui_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const c = new Client({ connectionString: adminUrl }); await c.connect(); await c.query(`CREATE DATABASE "${db}"`); await c.end();
  const u = new URL(adminUrl); u.pathname = '/' + db;
  const port = await freePort();
  const { spawn } = require('child_process');
  const proc = spawn(process.execPath, [path.join(ROOT, 'server/dist/main.js')], {
    env: { ...process.env, DATABASE_URL: u.toString(), PORT: String(port), NODE_ENV: 'test', LOG_LEVEL: 'warn', DB_MIGRATIONS_RUN: 'true',
      COOKIE_SECURE: 'false', LOGIN_RATE_LIMIT_PER_MIN: '1000', ADMIN_INITIAL_PASSWORD: ADMIN_INIT, JWT_SECRET: 'harness-secret-'.padEnd(48, 'x'), LEGACY_UI_ROOT: ROOT, SWAGGER_ENABLED: 'false' },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  proc.stderr.on('data', (d) => { stderr += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 150; i++) {
    try { const r = await fetch(base + '/api/health'); if (r.ok) break; } catch (e) { /* لسه */ }
    if (proc.exitCode !== null) throw new Error('server exited: ' + stderr.slice(-500));
    await new Promise((r) => setTimeout(r, 100));
  }
  const stop = async () => {
    proc.kill('SIGTERM');
    await new Promise((r) => (proc.exitCode !== null ? r() : proc.once('exit', r)));
    const c2 = new Client({ connectionString: adminUrl }); await c2.connect(); await c2.query(`DROP DATABASE IF EXISTS "${db}" WITH (FORCE)`); await c2.end();
  };
  return { base, stop };
}

async function openWebApp(seed) {
  const srv = await startWebServer();
  const browser = await chromium.launch({ ...(CHROME_PATH && fs.existsSync(CHROME_PATH) ? { executablePath: CHROME_PATH } : {}), args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'ar-EG' });
  // دخول admin + تغيير كلمة المرور الإجباري (الكوكي بيتحفظ في الـ context)
  let r = await ctx.request.post(srv.base + '/api/auth/login', { data: { username: 'admin', password: ADMIN_INIT } });
  const tok = (await r.json()).accessToken;
  r = await ctx.request.post(srv.base + '/api/auth/change-password', { data: { newPassword: ADMIN_PW }, headers: { authorization: 'Bearer ' + tok } });
  if (!r.ok()) throw new Error('change-password failed ' + r.status());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource: the server responded with a status of (401|403|409)/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('response', (res) => { if (res.status() >= 400 && !/\/api\/auth\/refresh$/.test(res.url()) && process.env.HARNESS_DEBUG) console.log('[harness] HTTP', res.status(), res.request().method(), res.url()); });
  // seed: بيعدي من loadData (ترحيلات الواجهة) مرة واحدة، وبعدين بيتحفظ على السيرفر
  await page.addInitScript(({ seed }) => {
    window.__saved = null; window.__saveCount = 0;
    const seeding = !!seed && !sessionStorage.getItem('__harnessSeeded');
    let api;
    Object.defineProperty(window, 'desktopApi', {
      configurable: true,
      get() { return api; },
      set(v) {
        api = v;
        if (!v || !v.__web || v.__harnessWrapped) return;
        v.__harnessWrapped = true;
        const load = v.loadData, save = v.saveData;
        if (seeding) v.loadData = async () => { await load(); const s = JSON.parse(JSON.stringify(seed)); delete s.users; return s; };
        v.saveData = async (d) => {
          const res = await save(d);
          window.__saved = JSON.parse(JSON.stringify(window.__webGetDATA())); window.__saveCount++;
          return res;
        };
      },
    });
  }, { seed: seed || null });
  // جاهز = البيانات اتحمّلت والواجهة رسمت فعلًا (مش بس bootstrap رجع — loadData لسه بينسخ في DATA)
  const ready = () => page.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && window.WebSync._state.meta && !document.getElementById('webAuthOverlay') && document.querySelector('#app') && document.querySelector('#app').innerText.length > 100 && !document.querySelector('#app').innerText.includes('جارِ التحميل'), null, { timeout: 30000 });
  await page.goto(srv.base + '/legacy/');
  await ready();
  if (seed) {
    const dbg = await page.evaluate(async () => { const r1 = await saveData(true); const r2 = await WebSync.save(DATA); sessionStorage.setItem('__harnessSeeded', '1'); return JSON.stringify({ r1, r2, ro: typeof readOnlyMode !== 'undefined' && readOnlyMode, tooNew: window.__schemaTooNew, sv: DATA.schemaVersion, writable: WebSync._state.meta.writable['clients.customers'] }); });
    if (process.env.HARNESS_DEBUG) console.log('[harness] seed save', dbg);
    // أي مفتاح في DATA مش معروف للسيرفر = بيانات مش هتتحفظ → الاختبار يفشل (بدل ضياع صامت)
    const unknown = await page.evaluate(() => WebSync.unknownKeys(DATA));
    if (unknown.length) errors.push('unknown DATA keys (not synced): ' + unknown.join(', '));
    const pending = await page.evaluate(() => WebSync._buildPlan(DATA).changes.length);
    if (pending) { const sample = await page.evaluate(() => { const p = WebSync._buildPlan(DATA); const by = {}; p.changes.forEach((c) => { by[c.collection] = (by[c.collection] || 0) + 1; }); const bad = p.changes.filter((c) => /[\s<>"'`&\\]/.test(c.id)).map((c) => c.collection + ' ' + String(c.id).slice(0, 60)); return JSON.stringify({ byCollection: by, badIds: bad.slice(0, 10) }) + ' ' + JSON.stringify(p.changes.slice(0, 2)).slice(0, 600); }); throw new Error('seed upload incomplete: ' + pending + ' pending changes ' + sample + ' errors=' + JSON.stringify(errors.slice(0, 3))); }
    await page.reload();
    await ready();
  }
  await page.waitForTimeout(600);
  await page.evaluate(() => { window.__saved = null; window.__saveCount = 0; });
  const close = browser.close.bind(browser);
  browser.close = async () => { await close(); await srv.stop(); };
  return { browser, page, errors, base: srv.base };
}

module.exports = { openApp: WEB ? openWebApp : openApp, openFileApp: openApp, openWebApp, startWebServer, ROOT, WEB, ADMIN_PW, ADMIN_INIT };
