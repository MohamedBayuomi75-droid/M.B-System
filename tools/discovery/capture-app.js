// لقطات الواجهة الجديدة (/app/) فوق سيرفر اختبار حقيقي (قاعدة مؤقتة، بيانات مُركّبة) — خطة v1.4.5 المرحلة 4، البند 4.5.
// المرحلة 6 (البند 6.4): خط الأساس البصري لشاشات الموديول التجريبي — الموردين والعملاء فيها بيانات مُركّبة، ونموذج التعديل والإضافة مفتوح.
// الاستخدام: node tools/discovery/capture-app.js --out <dir>   (والمقارنة: node tools/discovery/visual-compare.js --app)
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
  // بيانات مُركّبة ثابتة (من غير أي بيانات حقيقية)، عشان الشاشات تتصوّر بقوايم ونماذج مليانة
  const t = (await api('POST', '/api/auth/login', { username: 'admin', password: ADMIN_PW })).accessToken;
  for (const s of [
    { name: 'شركة النور للتوريدات', taxId: '100200300', commercialReg: '55123', businessNature: 'توريد مواد', phone: '01000000001', email: 'nour@example.com', address: 'القاهرة', extraFields: [{ label: 'المندوب', value: 'سعيد' }] },
    { name: 'مؤسسة الأمل', taxId: '400500600', businessNature: 'نقل', phone: '01000000002' },
    { name: 'ACME Supplies', taxId: '700800900', email: 'acme@example.com' },
  ]) await api('POST', '/api/v1/suppliers', s, t);
  for (const c of [
    { name: 'شركة الشروق للمقاولات', code: 'CUS-0001', phone: '0220000001', email: 'shorouk@example.com', city: 'الجيزة', category: 'شركات', taxId: '111222333', extraFields: [{ label: 'المنطقة', value: 'أكتوبر' }] },
    { name: 'تامر حسن', code: 'CUS-0002', phone: '01100000003', city: 'القاهرة' },
  ]) await api('POST', '/api/v1/customers', c, t);
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
    // النماذج: تعديل أول سجل، وإضافة جديد (الموردين والعملاء)
    const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, `${name}.png`), animations: 'disabled', caret: 'hide' }); };
    let n = PAGES.length + 1;
    // نفس شكل الواجهة القديمة (DEC-0093): الموردين = لوحة المورد + نافذة «إضافة مورد جديد»، والعملاء = نافذة التعديل + نافذة «عميل جديد»
    const steps = [
      ['suppliers-edit', '/app/suppliers', '#supList li[data-id] >> nth=0', '#supForm'],
      ['suppliers-new', '/app/suppliers', '#supNew', '#modalOverlay'],
      ['customers-edit', '/app/customers', '#cusList .btn-edit-cust >> nth=0', '#appModal'],
      ['customers-new', '/app/customers', '#cusNew', '#appModal'],
    ];
    for (const [name, url, click, wait] of steps) {
      await page.goto(srv.base + url); await page.waitForLoadState('networkidle');
      await page.click(click); await page.waitForSelector(wait);
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await shot(name); n++;
    }
    console.log(`app screenshots: ${n} → ${OUT}`);
  } finally { await browser.close(); await srv.stop?.(); process.exit(0); }
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
