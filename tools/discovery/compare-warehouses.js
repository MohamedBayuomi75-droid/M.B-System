// مقارنة الشكل: المخازن في الواجهة القديمة ↔ /app/ جنب بعض (خطة v1.4.5 — المرحلة 7، الحزمة 7.1، معيار DEC-0093).
// الواجهة القديمة بتتصوّر بنفس البيانات المُركّبة اللي capture-app.js بيحطها في /app/ (مخزنين، و3 أصناف، واستلامين، وتحويل)،
// وبعدين كل لقطة قديمة بتتحط جنب لقطة /app/ المقابلة من docs/discovery/app-baseline/app/.
// التشغيل: node tools/discovery/compare-warehouses.js   (بعد capture-app.js)   المخرج: docs/reports/v1.4.5/phase7-visual/
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { openApp } = require(path.join(ROOT, 'tests-merge/harness'));
const { baseUser } = require(path.join(ROOT, 'tests-merge/lib'));
const OUT = path.join(ROOT, 'docs/reports/v1.4.5/phase7-visual');
const APP = path.join(ROOT, 'docs/discovery/app-baseline/app');

const seed = {
  users: [baseUser],
  warehouses: {
    settings: { itemPrefix: 'ITM-', movementPrefix: 'MV-' },
    locations: [{ id: 'LOC-01', name: 'المخزن الرئيسي', notes: '' }, { id: 'LOC-02', name: 'مخزن الموقع', notes: '' }],
    items: [
      { id: 'i1', code: 'ITM-0001', name: 'أسمنت', unit: 'شيكارة', category: 'خامات', minQty: 10, avgCost: 0, lastCost: 0, notes: '' },
      { id: 'i2', code: 'ITM-0002', name: 'حديد تسليح', unit: 'طن', category: 'خامات', minQty: 5, avgCost: 0, lastCost: 0, notes: '' },
      { id: 'i3', code: 'ITM-0003', name: 'رمل', unit: 'م3', category: '', minQty: 2, avgCost: 0, lastCost: 0, notes: '' },
    ],
    movements: [
      { id: 'MV-0001', type: 'in', itemId: 'i1', qty: 30, locationId: 'LOC-01', date: '2026-11-01', notes: '' },
      { id: 'MV-0002', type: 'in', itemId: 'i2', qty: 4.5, locationId: 'LOC-01', date: '2026-11-02', notes: '' },
      { id: 'MV-0003', type: 'transfer', itemId: 'i1', qty: 7, locationId: 'LOC-01', toLocationId: 'LOC-02', date: '2026-11-03', notes: '' },
    ],
  },
};
const PAIRS = [['stock', 'warehouses'], ['items', 'warehouses-items'], ['moves', 'warehouses-moves'], ['locations', 'warehouses-locations'], ['transfer', 'warehouses-transfer']];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, page } = await openApp(seed);
  await page.setViewportSize({ width: 1366, height: 768 });
  const legacy = {};
  for (const [tab] of PAIRS) {
    await page.evaluate((t) => { try { closeModal(); } catch (e) { /* مفيش نافذة */ } whFilters.tab = t === 'transfer' ? 'stock' : t; goToPage('warehouses.home'); }, tab);
    await page.waitForTimeout(500);
    if (tab === 'transfer') { await page.click('#btnWhTransfer'); await page.waitForSelector('#appModal'); await page.waitForTimeout(300); }
    await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); });
    legacy[tab] = await page.screenshot({ animations: 'disabled', caret: 'hide' });
  }
  const p = await browser.newPage({ viewport: { width: 1400, height: 440 } });
  const d = (b) => 'data:image/png;base64,' + b.toString('base64');
  for (const [tab, appShot] of PAIRS) {
    const app = fs.readFileSync(path.join(APP, `${appShot}.png`));
    await p.setContent(`<body style="margin:0;font:600 15px sans-serif;background:#fff"><div style="display:flex;gap:8px;padding:8px;direction:rtl">
      <figure style="margin:0;flex:1"><figcaption>القديمة (/legacy/)</figcaption><img src="${d(legacy[tab])}" style="width:100%;border:1px solid #999"></figure>
      <figure style="margin:0;flex:1"><figcaption>الجديدة (/app/)</figcaption><img src="${d(app)}" style="width:100%;border:1px solid #999"></figure></div></body>`);
    await p.screenshot({ path: path.join(OUT, `warehouses-${tab}.png`), fullPage: true });
  }
  await browser.close();
  console.log(`side-by-side: ${PAIRS.length} → ${path.relative(ROOT, OUT)}`);
})().catch((e) => { console.error(e); process.exit(1); });
