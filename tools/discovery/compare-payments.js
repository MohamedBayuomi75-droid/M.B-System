// مقارنة الشكل: الدفعات وكشف الحساب في الواجهة القديمة ↔ /app/ جنب بعض (خطة v1.4.5 — المرحلة 7، الحزمة 7.3، معيار DEC-0093).
// نفس السيرفر ونفس البيانات المُركّبة ونفس الجلسة. **الكشف بيختلف في الأرقام عن قصد** (F-05، DEC-0113 د-2): البيانات فيها فاتورة ملغاة
// ودفعة تحصيل ودفعة من غير اتجاه، عشان الفرق يبان جنب بعض.
// التشغيل: node tools/discovery/compare-payments.js   (محتاج build للسيرفر والواجهة الجديدة + PostgreSQL للاختبار)
// المخرج: docs/reports/v1.4.5/phase7-visual/payments-*.png
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { openWebApp } = require(path.join(ROOT, 'tests-merge/harness'));
const { baseUser } = require(path.join(ROOT, 'tests-merge/lib'));
const OUT = path.join(ROOT, 'docs/reports/v1.4.5/phase7-visual');

const pay = (id, o) => Object.assign({ id, paymentNo: 0, supplierId: 's1', invoiceId: '', amount: 1000, method: 'تحويل بنكي', date: '2026-10-10', transferRef: '', notes: '', extraFields: [], attachments: [] }, o);
const seed = {
  users: [baseUser],
  ledger: {
    suppliers: [
      { id: 's1', name: 'شركة النيل للمقاولات', taxId: '100-200-300', commercialReg: '12345', openingBalance: 5000, extraFields: [], attachments: [] },
      { id: 's2', name: 'مؤسسة الأمل للتوريدات', taxId: '400-500-600', commercialReg: '67890', openingBalance: 0, extraFields: [], attachments: [] },
    ],
    invoices: [
      { id: 'f1', supplierId: 's1', invoiceNo: 'F-101', date: '2026-09-01', description: 'أسمنت', baseValue: 10000, vat: 1400, stampDuty: 0, withheld: 100, totalInvoice: 11400, netInvoice: 11300, isReturn: false, attachments: [] },
      { id: 'f2', supplierId: 's1', invoiceNo: 'F-102', date: '2026-10-01', description: 'حديد', baseValue: 2500, vat: 350, stampDuty: 0, withheld: 0, totalInvoice: 2850, netInvoice: 2850, isReturn: false, attachments: [] },
      { id: 'f3', supplierId: 's1', invoiceNo: 'F-103', date: '2026-10-05', description: 'ملغاة', baseValue: 500, vat: 0, stampDuty: 0, withheld: 0, totalInvoice: 500, netInvoice: 500, isReturn: false, cancelled: true, attachments: [] },
      { id: 'r1', supplierId: 's1', invoiceNo: 'R-1', date: '2026-10-20', description: 'مرتجع', baseValue: 1000, vat: 140, stampDuty: 0, withheld: 0, totalInvoice: 1140, netInvoice: 1140, isReturn: true, attachments: [] },
    ],
    payments: [
      pay('p1', { paymentNo: 1, direction: 'pay', invoiceId: 'f1', amount: 6000, transferRef: 'TR-55', date: '2026-09-15' }),
      pay('p2', { paymentNo: 2, direction: 'pay', invoiceId: '', amount: 1500, method: 'نقدي', notes: 'مقدم', date: '2026-10-02' }),
      pay('p3', { paymentNo: 3, direction: 'collect', amount: 250, method: 'نقدي', notes: 'خصم تسوية', date: '2026-10-12' }),
      pay('p4', { paymentNo: 4, amount: 120, method: 'شيك', date: '2026-10-15', supplierId: 's2' }),
    ],
  },
};
const PAIRS = [['payments', 'page'], ['add', 'add'], ['statement', 'statement']];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, page, base } = await openWebApp(seed);
  await page.setViewportSize({ width: 1366, height: 768 });
  const shot = () => page.screenshot({ animations: 'disabled', caret: 'hide' });
  const legacy = {}, app = {};
  for (const [name, kind] of PAIRS) {
    await page.evaluate((k) => {
      try { closeModal(); } catch (e) { /* مفيش نافذة */ }
      document.querySelectorAll('#modalOverlay').forEach((o) => o.remove());
      if (k === 'statement') { statementFilters.supplierId = 's1'; statementFilters.from = ''; statementFilters.to = ''; lgCurrentPage = 'statement'; lgRender(); } else goToPage('ledger.payments');
    }, kind);
    await page.waitForTimeout(500);
    if (kind === 'add') { await page.click('#openAddPaymentPageBtn'); await page.waitForSelector('#m_pay_save'); }
    await page.waitForTimeout(300);
    await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); });
    legacy[name] = await shot();
  }
  for (const [name, kind] of PAIRS) {
    await page.goto(base + (kind === 'statement' ? '/app/supplier-statement?supplierId=s1' : '/app/supplier-payments'));
    await page.waitForSelector(kind === 'statement' ? '#stClosing' : '#payTable tbody tr');
    await page.waitForTimeout(400);
    if (kind === 'add') { await page.click('#openAddPaymentPageBtn'); await page.waitForSelector('#m_pay_save'); }
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
    await p.screenshot({ path: path.join(OUT, `payments-${name}.png`), fullPage: true });
  }
  await browser.close();
  console.log(`side-by-side: ${PAIRS.length} → ${path.relative(ROOT, OUT)}`);
})().catch((e) => { console.error(e); process.exit(1); });
