// لقطات الواجهة الجديدة (/app/) فوق سيرفر اختبار حقيقي (قاعدة مؤقتة، بيانات مُركّبة) — خطة v1.4.5 المرحلة 4، البند 4.5.
// الاستخدام: node tools/discovery/capture-app.js --out <dir>
// المتطلبات: npm --prefix server run build && npm --prefix frontend run build + PostgreSQL التطوير (55432).
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { chromium } = require('playwright');
const { startWebServer, ADMIN_INIT, ADMIN_PW } = require(path.join(ROOT, 'tests-merge/harness'));

const i = process.argv.indexOf('--out');
if (i < 0) { console.error('usage: capture-app.js --out <dir>'); process.exit(2); }
const OUT = path.resolve(process.argv[i + 1]);
const PAGES = [['home', '/app/'], ['projects', '/app/projects'], ['suppliers', '/app/suppliers'], ['customers', '/app/customers'], ['warehouses', '/app/warehouses']];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await startWebServer();
  const api = async (m, p, b, t) => { const r = await fetch(srv.base + p, { method: m, headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return r.json().catch(() => null); };
  let r = await api('POST', '/api/auth/login', { username: 'admin', password: ADMIN_INIT });
  await api('POST', '/api/auth/change-password', { newPassword: ADMIN_PW }, r.accessToken);
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'ar-EG' });
    const page = await ctx.newPage();
    await page.goto(srv.base + '/app/login');
    await page.waitForSelector('#loginForm');
    await page.screenshot({ path: path.join(OUT, 'login.png'), animations: 'disabled', caret: 'hide' });
    await page.fill('#username', 'admin'); await page.fill('#password', ADMIN_PW); await page.click('#loginBtn');
    await page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 15000 });
    for (const [name, url] of PAGES) {
      await page.goto(srv.base + url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT, `${name}.png`), animations: 'disabled', caret: 'hide' });
    }
    console.log(`app screenshots: ${PAGES.length + 1} → ${OUT}`);
  } finally { await browser.close(); await srv.stop?.(); process.exit(0); }
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
