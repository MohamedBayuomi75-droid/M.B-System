// مقارنة الشكل: صفحة المشاريع ونافذة المشروع في الواجهة القديمة ↔ /app/projects جنب بعض (خطة v1.4.5 — المرحلة 7، الحزمة 7.4، معيار DEC-0093).
// نفس السيرفر ونفس البيانات المُركّبة ونفس الجلسة. **عمود التكلفة وكارت التكلفة اللحظية بيظهروا «—» في الجديدة عن قصد** (F-12، DEC-0117 د-6).
// التشغيل: node tools/discovery/compare-projects.js   (محتاج build للسيرفر والواجهة الجديدة + PostgreSQL للاختبار)
// المخرج: docs/reports/v1.4.5/phase7-visual/projects-*.png
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { openWebApp } = require(path.join(ROOT, 'tests-merge/harness'));
const { baseUser } = require(path.join(ROOT, 'tests-merge/lib'));
const OUT = path.join(ROOT, 'docs/reports/v1.4.5/phase7-visual');

const seed = {
  users: [baseUser], schemaVersion: 9,
  projects: [
    { id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق السكني', status: 'active', value: 2500000, budget: 1800000, progress: 45, supervisorId: 'sv1', customerId: 'cA', customerName: 'شركة الأمل للتطوير', customer: 'شركة الأمل للتطوير', contractNo: 'ع-2026/14', start: '2026-03-01', extraFields: [] },
    { id: 'pB', code: 'PRJ-002', name: 'مدرسة النور', status: 'المستخلصات', value: 900000, customerId: 'cB', customerName: 'هيئة الأبنية التعليمية', customer: 'هيئة الأبنية التعليمية', stageKey: 'invoices', stepKey: 'prep_invoice', extraFields: [] },
    { id: 'pC', code: 'PRJ-003', name: 'برج الأعمال', status: 'المناقصة وترسية المشروع', extraFields: [] },
    { id: 'pD', code: 'PRJ-004', name: 'فيلا التجمع', status: 'completed', value: 450000, customerName: 'عميل فردي', customer: 'عميل فردي', progress: 100, extraFields: [] },
  ],
  supervisors: [{ id: 'sv1', code: 'SUP-1', name: 'سامي المشرف', status: 'active', project: 'مشروع الشروق السكني' }],
  workers: [{ id: 'w1', code: 'W1', name: 'عامل', status: 'active', project: 'مشروع الشروق السكني', supervisorId: 'sv1' }, { id: 'w2', code: 'W2', name: 'عامل ٢', status: 'active', project: 'مدرسة النور' }],
  equipment: [{ id: 'eq1', code: 'EQ1', name: 'لودر', status: 'active', project: 'مشروع الشروق السكني' }],
  clients: { customers: [
    { id: 'cA', name: 'شركة الأمل للتطوير', code: 'C1', status: 'active', projects: [], boqs: [], workSurveys: [], collections: [], invoices: [], contracts: [] },
    { id: 'cB', name: 'هيئة الأبنية التعليمية', code: 'C2', status: 'active', projects: [], boqs: [], workSurveys: [], collections: [], invoices: [], contracts: [] },
  ] },
};
const PAIRS = [['list', ''], ['add', ''], ['edit', 'pA']];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, page, base } = await openWebApp(seed);
  await page.setViewportSize({ width: 1366, height: 768 });
  const shot = () => page.screenshot({ animations: 'disabled', caret: 'hide' });
  const settle = async () => { await page.waitForTimeout(300); await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); }); };
  const legacy = {}, app = {};
  for (const [name, id] of PAIRS) {
    await page.evaluate(() => { try { closeModal(); } catch (e) { /* مفيش نافذة */ } });
    await page.waitForTimeout(250);
    await page.evaluate(() => { goToPage('projects'); Object.assign(projectFilters, { q: '', status: '', stageSel: '', customerId: '', detailId: '', hasRes: '', budget: '' }); rerenderCurrentPage(); });
    await page.waitForTimeout(400);
    if (name !== 'list') { await page.evaluate((i) => openProjectModal(i || undefined), id); await page.waitForSelector('#btnSavePr'); }
    await settle();
    legacy[name] = await shot();
  }
  for (const [name, id] of PAIRS) {
    await page.goto(base + '/app/projects');
    await page.waitForSelector('#projTable tr[data-id="pA"]');
    if (name === 'add') await page.click('#btnAddProject');
    if (name === 'edit') await page.click(`.btn-edit-proj[data-id="${id}"]`);
    if (name !== 'list') await page.waitForSelector('#btnSavePr');
    await settle();
    app[name] = await shot();
  }
  const p = await browser.newPage({ viewport: { width: 1400, height: 440 } });
  const d = (b) => 'data:image/png;base64,' + b.toString('base64');
  for (const [name] of PAIRS) {
    await p.setContent(`<body style="margin:0;font:600 15px sans-serif;background:#fff"><div style="display:flex;gap:8px;padding:8px;direction:rtl">
      <figure style="margin:0;flex:1"><figcaption>القديمة (/legacy/)</figcaption><img src="${d(legacy[name])}" style="width:100%;border:1px solid #999"></figure>
      <figure style="margin:0;flex:1"><figcaption>الجديدة (/app/)</figcaption><img src="${d(app[name])}" style="width:100%;border:1px solid #999"></figure></div></body>`);
    await p.screenshot({ path: path.join(OUT, `projects-${name}.png`), fullPage: true });
  }
  await browser.close();
  console.log(`side-by-side: ${PAIRS.length} → ${path.relative(ROOT, OUT)}`);
})().catch((e) => { console.error(e); process.exit(1); });
