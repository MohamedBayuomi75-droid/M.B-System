// مقارنة الشكل: فواتير ومرتجعات الموردين في الواجهة القديمة ↔ /app/ جنب بعض (خطة v1.4.5 — المرحلة 7، الحزمة 7.2، معيار DEC-0093).
// نفس السيرفر ونفس البيانات المُركّبة ونفس الجلسة: الواجهة القديمة (/legacy/) والشاشة الجديدة (/app/supplier-invoices) بيتصوّروا وبيتحطوا جنب بعض.
// التشغيل: node tools/discovery/compare-invoices.js   (محتاج build للسيرفر والواجهة الجديدة + PostgreSQL للاختبار)
// المخرج: docs/reports/v1.4.5/phase7-visual/invoices-*.png
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { openWebApp } = require(path.join(ROOT, 'tests-merge/harness'));
const { baseUser } = require(path.join(ROOT, 'tests-merge/lib'));
const OUT = path.join(ROOT, 'docs/reports/v1.4.5/phase7-visual');

const inv = (id, o) => Object.assign({ id, supplierId: 's1', invoiceNo: id.toUpperCase(), date: '2026-10-05', dueDate: '', category: 'مخزون / مشتريات', project: 'مشروع البرج', description: 'أسمنت\nحديد تسليح\nرمل',
  internalCode: 'C-01\nC-02\nC-03', supplierItemCode: 'S-01\nS-02\nS-03', itemDescription: '', quantity: '100\n2\n10', unitPrice: '', nature: '2', discountType: '1', baseValue: 10000, vat: 1400, stampDuty: 0, discountRate: '1',
  withheld: 100, withheldStatus: 'unpaid', totalInvoice: 11400, netInvoice: 11300, isReturn: false, linkedInvoiceId: '', attachments: [], notes: '' }, o);
const seed = {
  users: [baseUser],
  ledger: {
    suppliers: [
      { id: 's1', name: 'شركة النيل للمقاولات', taxId: '100-200-300', commercialReg: '12345', openingBalance: 0, extraFields: [], attachments: [] },
      { id: 's2', name: 'مؤسسة الأمل للتوريدات', taxId: '400-500-600', commercialReg: '67890', openingBalance: 0, extraFields: [], attachments: [] },
    ],
    invoices: [
      inv('f-101', { date: '2026-09-01' }),
      inv('f-102', { supplierId: 's2', date: '2026-10-12', category: 'مصاريف', description: 'كابلات', internalCode: 'E-1', supplierItemCode: 'X-9', quantity: '5', baseValue: 2500, vat: 350, withheld: 0, discountRate: '', totalInvoice: 2850, netInvoice: 2850, nature: '3' }),
      inv('f-103', { date: '2026-11-02', dueDate: '2026-12-31', withheldStatus: 'paid', postReturnWht: true, linkedReturnIds: ['r-1'] }),
      inv('r-1', { date: '2026-11-10', isReturn: true, linkedInvoiceId: 'f-103', description: 'أسمنت', internalCode: 'C-01', supplierItemCode: 'S-01', quantity: '10', baseValue: 1000, vat: 140, withheld: 0, discountRate: '', totalInvoice: 1140, netInvoice: 1140 }),
    ],
    payments: [{ id: 'p1', paymentNo: 1, supplierId: 's2', invoiceId: 'f-102', amount: 2850, direction: 'pay', date: '2026-10-20' }],
  },
};
// [اسم الملف، الصفحة القديمة، مسار /app/، النافذة]
const PAIRS = [['invoices', 'ledger.invoices', '/app/supplier-invoices', null], ['returns', 'ledger.returns', '/app/supplier-returns', null],
  ['add', 'ledger.invoices', '/app/supplier-invoices', 'add'], ['view', 'ledger.invoices', '/app/supplier-invoices', 'view']];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, page, base } = await openWebApp(seed);
  await page.setViewportSize({ width: 1366, height: 768 });
  const shot = () => page.screenshot({ animations: 'disabled', caret: 'hide' });
  const legacy = {}, app = {};
  for (const [name, key, , modal] of PAIRS) {
    await page.evaluate((k) => { try { closeModal(); } catch (e) { /* مفيش نافذة */ } document.querySelectorAll('#modalOverlay').forEach((o) => o.remove()); goToPage(k); }, key);
    await page.waitForTimeout(500);
    if (modal === 'add') { await page.click('#openAddInvoiceModalBtnGlobal'); await page.waitForSelector('#modalOverlay'); }
    if (modal === 'view') { await page.click('[data-viewinv="f-103"] [data-viewinv-btn]'); await page.waitForSelector('#modalOverlay'); }
    await page.waitForTimeout(300);
    await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); });
    legacy[name] = await shot();
  }
  for (const [name, , url, modal] of PAIRS) {
    await page.goto(base + url);
    await page.waitForSelector('#invTable tbody tr');
    await page.waitForTimeout(400);
    if (modal === 'add') { await page.click('#openAddInvoiceModalBtnGlobal'); await page.waitForSelector('#modalOverlay'); }
    if (modal === 'view') { await page.click('[data-viewinv="f-103"] [data-viewinv-btn]'); await page.waitForSelector('#invViewModal'); }
    await page.waitForTimeout(300);
    await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); });
    app[name] = await shot();
  }
  const p = await browser.newPage({ viewport: { width: 1400, height: 440 } });
  const d = (b) => 'data:image/png;base64,' + b.toString('base64');
  for (const [name] of PAIRS) {
    await p.setContent(`<body style="margin:0;font:600 15px sans-serif;background:#fff"><div style="display:flex;gap:8px;padding:8px;direction:rtl">
      <figure style="margin:0;flex:1"><figcaption>القديمة (/legacy/)</figcaption><img src="${d(legacy[name])}" style="width:100%;border:1px solid #999"></figure>
      <figure style="margin:0;flex:1"><figcaption>الجديدة (/app/)</figcaption><img src="${d(app[name])}" style="width:100%;border:1px solid #999"></figure></div></body>`);
    await p.screenshot({ path: path.join(OUT, `invoices-${name}.png`), fullPage: true });
  }
  await browser.close();
  console.log(`side-by-side: ${PAIRS.length} → ${path.relative(ROOT, OUT)}`);
})().catch((e) => { console.error(e); process.exit(1); });
