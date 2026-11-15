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
module.exports = { openApp, ROOT };
