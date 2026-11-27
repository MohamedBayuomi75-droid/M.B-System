// شاشة التكاليف وتكلفة المشروع (8.8.5، DEC-0142): /app/costs بتعرض نفس صفحة التكاليف القديمة — لوحات الفئات، ولوحات الأقسام، والجدول بالفلاتر،
// ونافذة التكلفة، و«التكلفة الشاملة»؛ و/app/projects بعمود التكلفة وفلتر حالة الميزانية وكارت التكلفة. والحفظ بالسطور والأقسام والبنود والحذف من الجديدة.
// البيانات من غير مصروف بسطور ولا فاتورة فيها خصم ولا يوميات مستنية مراجعة، فالحساب الجديد (TR-10) = القديم هنا (الفرق متغطّي في costs.e2e وphase90).
// التشغيل: node tests-web/costs-e2e.js   (محتاج build للسيرفر والواجهة الجديدة + PostgreSQL للاختبار)
'use strict';
const path = require('path');
const { openWebApp } = require(path.join(__dirname, '../tests-merge/harness'));
const lib = require(path.join(__dirname, '../tests-merge/lib'));
const { baseUser, ok, summary } = lib;
const eq = (a, b, name) => { const A = JSON.stringify(a), B = JSON.stringify(b); if (A !== B) { let i = 0; while (A[i] === B[i]) i += 1; console.log('    ↯', JSON.stringify(A.slice(Math.max(0, i - 80), i + 60)), '≠', JSON.stringify(B.slice(Math.max(0, i - 80), i + 60))); } lib.eq(a, b, name); };
(async () => {
  const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const C = (id, o) => Object.assign({ id, notes: '', section: '', extraFields: [] }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9,
    projects: [
      { id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active', budget: 10000, value: 10000 },
      { id: 'pB', code: 'PRJ-002', name: 'برج النيل', status: 'active', budget: 1200, value: 1200 },
      { id: 'pC', code: 'PRJ-003', name: 'فيلا الندى', status: 'active', budget: 100, value: 100 },
    ],
    workers: [P('w1', { code: 'WRK-001', name: 'عامل أول', status: 'active', dailyWage: 300 }), P('w2', { code: 'WRK-002', name: 'عامل تاني', status: 'active', dailyWage: 200 })],
    supervisors: [P('s1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active', dailyWage: 400 })],
    drivers: [P('d1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', dailyWage: 280 })],
    equipment: [P('q1', { code: 'EQ-001', name: 'لودر', status: 'working', dailyCost: 1000 })],
    workerAttendance: [{ id: 'a1', personType: 'worker', personKind: 'worker', personId: 'w1', workerId: 'w1', date: '2026-03-01', status: 'present', days: 1, dayWage: 300, deduction: 0, notes: '', project: 'مشروع الشروق' }],
    equipmentDaily: [{ id: 'ed1', equipmentId: 'q1', date: '2026-03-02', days: 1, hours: 0, fuelLiters: 0, kind: 'work', project: 'برج النيل', notes: '' }],
    expenses: [{ id: 'x1', date: '2026-03-07', project: 'مشروع الشروق', amount: 250, type: 'نثريات', notes: '' }],
    costs: [
      C('c1', { personKind: 'worker', personId: 'w1', date: '2026-03-03', amount: 75, item: 'مواصلات', project: 'مشروع الشروق', section: 'مواقع' }),
      C('c2', { personKind: 'worker', personId: 'w2', date: '2026-03-09', amount: 130, lines: [{ item: 'خامات', amount: 100 }, { item: 'مواصلات', amount: 30 }], item: 'خامات + مواصلات', project: 'برج النيل', notes: 'ملاحظة' }),
      C('c3', { personKind: 'supervisor', personId: 's1', date: '2026-04-01', amount: 60, item: 'اتصالات', project: 'مشروع قديم' }),
      C('c4', { personKind: 'equipment', personId: 'q1', date: '2026-03-10', amount: 90, item: 'شحن ونقل', project: 'فيلا الندى' }),
    ],
    costSections: { workers: ['مواقع', 'ورشة'] },
    ledger: { suppliers: [{ id: 'sp1', name: 'مورد الحديد', extraFields: [], attachments: [] }], payments: [],
      invoices: [{ id: 'i1', supplierId: 'sp1', invoiceNo: 'F-1', date: '2026-03-12', project: 'مشروع الشروق', baseValue: 1000, vat: 0, stampDuty: 0, withheld: 0, totalInvoice: 1000, netInvoice: 1000, isReturn: false, attachments: [] }] },
  };
  const t1s = 'const t1 = (el) => (el ? (el.innerText || "").replace(/\\s+/g, " ").trim() : "");'; void t1s;
  const grab = () => {
    const t1 = (el) => (el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : '');
    const root = document.querySelector('#pageContent .page, app-costs .page'); const t = root.querySelector('table.data-table');
    return { title: t1(root.querySelector('.page-title')), sub: t1(root.querySelector('.page-sub')), buttons: [...root.querySelectorAll('.btn-row > button, .page-header-actions > button, #compCostsBack, #btnCostBackKinds, #btnCostBackSecs')].map(t1),
      boards: [...root.querySelectorAll('.board-card')].map(t1), cards: [...root.querySelectorAll('.stats-row .stat-card')].map(t1),
      filters: [...root.querySelectorAll('.filters-bar input, .filters-bar select')].map((x) => [x.id, x.tagName === 'SELECT' ? [...x.options].map((o) => o.textContent.trim()) : x.placeholder || x.type]),
      head: t ? [...t.querySelectorAll('thead th')].map(t1) : [], rows: t ? [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map(t1)) : [], foot: t ? [...t.querySelectorAll('tfoot th')].map(t1) : [],
      pager: t1(root.querySelector('.table-pager span')) };
  };
  const modalOf = () => {
    const m = document.getElementById('appModal'); const vis = (el) => el && el.offsetParent !== null;
    const labels = [...m.querySelectorAll('.modal-body .form-grid > label')].filter(vis).map((l) => { const c = l.cloneNode(true); c.querySelectorAll('input,select,textarea,div,datalist').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); });
    const opts = (id) => [...document.getElementById(id).options].map((o) => o.textContent.trim());
    return { title: m.querySelector('.modal-header h3').textContent.trim(), labels, kind: document.getElementById('cstFKind').value, kinds: opts('cstFKind'), sections: opts('cstSection'), section: document.getElementById('cstSection').value,
      lines: [...m.querySelectorAll('.cst-line')].map((r) => [r.querySelector('.cst-item').value, r.querySelector('.cst-amt').value]), total: m.querySelector('#cstTotal').textContent.trim(),
      notes: document.getElementById('cstFNotes').value, footer: [...m.querySelectorAll('.modal-footer button')].map((b) => b.textContent.trim()) };
  };
  const { browser, page, base: url, errors } = await openWebApp(seed);
  const settle = (ms = 400) => page.waitForTimeout(ms);
  const legacy = async (tab, sec, showAll, f, fn) => { await page.evaluate(([tab, sec, showAll, f]) => { try { closeModal(); } catch (e) { /* */ } costFilters = Object.assign({ q: '', personKind: '', personId: '', item: '', project: '', from: '', to: '' }, f || {});
    compCostFilters = { q: '', from: '', to: '' }; goToPage('costs'); window.__costTab = tab; window.__costSection = sec; window.__costShowAll = showAll; rerenderCurrentPage(); }, [tab, sec, showAll, f]); await settle(); return page.evaluate(fn); };

  // ---------- القديمة
  /** غلطة تخطيط النافذة القديمة (زي المستحقات — DUES_ACCEPTANCE §3): عنوان «نوع التكلفة (القسم)» بيتكتب عليه «بنود التكلفة» — مش منقولة */
  const fixLegacy = (m) => ({ ...m, labels: m.labels.map((l, i) => (i === 1 && l === 'بنود التكلفة' ? 'نوع التكلفة (القسم)' : l)) });
  const VIEWS = [['workers', '', true, {}], ['workers', 'مواقع', false, {}], ['workers', '', true, { item: 'مواصلات' }], ['workers', '', true, { q: 'خامات' }], ['supervisors', '', true, {}], ['equipment', '', true, {}]];
  const L = { kinds: await legacy('', '', false, {}, grab), secs: await legacy('workers', '', false, {}, grab), views: [], comp: await legacy('__all', '', false, {}, grab) };
  for (const [tab, sec, all, f] of VIEWS) L.views.push(await legacy(tab, sec, all, f, grab));
  await legacy('workers', 'مواقع', false, {}, () => 0); await page.click('#pageContent #btnAddCost'); await page.waitForSelector('#appModal #btnSaveCost'); await settle(300); L.addModal = fixLegacy(await page.evaluate(modalOf));
  await legacy('workers', '', true, {}, () => 0); await page.click('#pageContent .btn-edit-cst[data-id="c2"]'); await page.waitForSelector('#appModal #btnSaveCost'); await settle(300); L.editModal = fixLegacy(await page.evaluate(modalOf));
  await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } });
  L.projCost = await page.evaluate(() => { goToPage('projects'); Object.assign(projectFilters, { q: '', status: '', stageSel: '', customerId: '', detailId: '', hasRes: '', budget: '' }); rerenderCurrentPage();
    return [...document.querySelectorAll('#pageContent table.data-table tbody tr')].map((tr) => (tr.children[7] ? tr.children[7].innerText.trim() : '')); });
  L.over = await page.evaluate(() => { Object.assign(projectFilters, { budget: 'over' }); rerenderCurrentPage(); return [...document.querySelectorAll('#pageContent table.data-table tbody tr')].map((tr) => tr.children[1] && tr.children[1].innerText.trim().split('\n')[0]); });
  L.sectionCost = await page.evaluate(() => { Object.assign(projectFilters, { budget: '', status: 'التنفيذ والمتابعة' }); rerenderCurrentPage(); return [...document.querySelectorAll('#pageContent .stats-row .stat-card')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()); });

  // ---------- الجديدة
  const tableResp = () => page.waitForResponse((r) => /\/api\/v1\/costs\/table/.test(r.url()));
  const openTab = async (tab) => { await page.goto(url + '/app/costs'); await page.waitForSelector('#costKinds .board-card'); const r = tableResp(); await page.click(`[data-cost-tab="${tab}"]`); await r; await page.waitForSelector('#costSecs .board-card'); await settle(200); };
  const openView = async (tab, sec, all, f) => {
    await openTab(tab); let r = tableResp(); await page.click(all ? '[data-show-all="1"]' : `[data-cost-sec="${sec}"]`); await r; await settle(200);
    if (f.q) { r = tableResp(); await page.fill('#cstSearch', f.q); await page.click('#cstApply'); await r; await settle(200); }
    if (f.item) { r = tableResp(); await page.selectOption('#cstItem', f.item); await r; await settle(200); }
  };
  console.log('[اللوحات والجدول والشاملة]');
  await page.goto(url + '/app/costs'); await page.waitForSelector('#costKinds .board-card'); await settle(300);
  eq(await page.evaluate(grab), L.kinds, 'لوحات الفئات (والشاملة)');
  await openTab('workers'); eq(await page.evaluate(grab), L.secs, 'لوحات أقسام العمال');
  for (const [i, [tab, sec, all, f]] of VIEWS.entries()) { await openView(tab, sec, all, f); eq(await page.evaluate(grab), L.views[i], `الجدول ${tab} ${sec || 'الكل'} ${JSON.stringify(f)}`); }
  await page.goto(url + '/app/costs'); await page.waitForSelector('#costKinds .board-card'); await page.click('[data-cost-tab="__all"]'); await page.waitForSelector('#ccTable'); await settle(500);
  const nComp = await page.evaluate(grab);
  eq(nComp, L.comp, 'التكلفة الشاملة (الكروت والأعمدة والصفوف والإجمالي)');

  console.log('[النافذة] نفس الخانات والخيارات والقيم');
  await openView('workers', 'مواقع', false, {}); await page.click('#btnAddCost'); await page.waitForSelector('#appModal #btnSaveCost'); await settle(300);
  eq(await page.evaluate(modalOf), L.addModal, 'إضافة تكلفة: نفس النافذة');
  await page.click('#appModal .modal-close'); await settle(200);
  await openView('workers', '', true, {}); await page.click('.btn-edit-cst[data-id="c2"]'); await page.waitForSelector('#appModal #btnSaveCost'); await settle(300);
  eq(await page.evaluate(modalOf), L.editModal, 'تعديل تكلفة بسطرين: نفس النافذة');
  await page.click('#appModal .modal-close'); await settle(200);

  console.log('[صفحة المشاريع] عمود التكلفة وفلتر الميزانية');
  await page.goto(url + '/app/projects'); await page.waitForSelector('#projTable tbody tr'); await settle(600);
  eq(await page.evaluate(() => [...document.querySelectorAll('#projTable tbody tr')].map((tr) => tr.children[7].innerText.trim())), L.projCost, 'عمود التكلفة = القديمة');
  await page.selectOption('#projBudget', 'over'); await settle(600);
  eq(await page.evaluate(() => [...document.querySelectorAll('#projTable tbody tr')].map((tr) => tr.children[1] && tr.children[1].innerText.trim().split('\n')[0])), L.over, 'فلتر «تجاوز الميزانية»');
  await page.goto(url + '/app/projects?status=' + encodeURIComponent('التنفيذ والمتابعة')); await page.waitForSelector('#projSectionCost'); await settle(800);
  eq(await page.evaluate(() => [...document.querySelectorAll('#projStats .stat-card')].map((c) => c.innerText.replace(/\s+/g, ' ').trim())), L.sectionCost, 'كارت التكلفة اللحظية في القسم');

  console.log('[الحفظ من الشاشة الجديدة]');
  const after = async (re, method, fn) => { const [r] = await Promise.all([page.waitForResponse((x) => re.test(x.url()) && x.request().method() === method), fn()]); return r.status(); };
  await openView('workers', '', true, {}); await page.click('#btnAddCost'); await page.waitForSelector('#appModal #btnSaveCost'); await settle(300);
  await page.selectOption('#cstFPerson', 'w2'); await page.fill('#cstFProject', 'مشروع الشروق');
  await page.locator('.cst-item').first().fill('خامات'); await page.locator('.cst-amt').first().fill('40');
  await page.click('#btnCstAddLine'); await page.locator('.cst-item').nth(1).fill('بند جديد'); await page.locator('.cst-amt').nth(1).fill('10.5');
  ok(/٥٠٫٥/.test(await page.innerText('#cstTotal')), 'الإجمالي بيتحسب من السطور');
  eq(await after(/\/api\/v1\/costs$/, 'POST', () => page.click('#btnSaveCost')), 201, 'إضافة تكلفة بسطرين');
  await settle(500);
  ok(await page.evaluate(() => [...document.querySelectorAll('#cstTable tbody tr')].some((tr) => /خامات ٤٠ \+ بند جديد ١٠٫٥/.test(tr.innerText))), 'التكلفة الجديدة في الجدول (البند بسطرين)');
  await page.click('.btn-edit-cst[data-id="c1"]'); await page.waitForSelector('#appModal #btnSaveCost'); await settle(300); await page.locator('.cst-amt').first().fill('80');
  eq(await after(/\/api\/v1\/costs\/c1$/, 'PATCH', () => page.click('#btnSaveCost')), 200, 'تعديل تكلفة');
  await settle(400);
  // البنود: تغيير اسم من «إدارة البنود»
  await page.click('#btnAddCost'); await page.waitForSelector('#btnCstManageItems'); await page.click('#btnCstManageItems'); await page.waitForSelector('#appSubModal .pitem-row');
  await page.locator('#appSubModal .pitem-row[data-item="مواصلات"] .pitem-edit').fill('انتقالات');
  eq(await after(/\/api\/v1\/costs\/items$/, 'POST', () => page.click('#appSubModal .pitem-row[data-item="مواصلات"] .btn-save-pitem')), 201, 'تغيير اسم بند');
  await settle(500); await page.click('#appSubModal .modal-close'); await page.click('#appModal .modal-close'); await settle(300);
  ok(await page.evaluate(() => [...document.querySelectorAll('#cstTable tbody tr')].some((tr) => /خامات ١٠٠ \+ انتقالات ٣٠/.test(tr.innerText))), 'اسم البند اتغيّر في التكاليف');
  // الأقسام
  await page.click('#btnCostBackSecs'); await page.waitForSelector('#costSecs .board-card'); await settle(300);
  await page.click('#btnCostAddSec'); await page.waitForSelector('#costSecName'); await page.fill('#costSecName', 'مكتب');
  eq(await after(/\/api\/v1\/costs\/sections$/, 'POST', () => page.click('#btnDoCostSec')), 201, 'إضافة قسم'); await settle(400);
  await page.click('#btnCostRenSec'); await page.waitForSelector('#costRenOld'); await page.selectOption('#costRenOld', 'مواقع'); await page.fill('#costRenNew', 'المواقع');
  eq(await after(/\/api\/v1\/costs\/sections$/, 'POST', () => page.click('#btnDoCostRen')), 201, 'تغيير اسم قسم'); await settle(400);
  ok(await page.evaluate(() => [...document.querySelectorAll('#costSecs .board-card')].map((b) => b.innerText.replace(/\s+/g, ' ')).some((x) => /المواقع 1 سجل/.test(x))), 'لوحة القسم بالاسم الجديد وتكلفتها معاه');
  await page.click('#btnCostDelSec'); await page.waitForSelector('#costDelSec'); await page.selectOption('#costDelSec', 'ورشة'); await page.click('#btnDoCostDel'); await page.waitForSelector('#appConfirmModal #btnConfirmDel');
  eq(await after(/\/api\/v1\/costs\/sections$/, 'POST', () => page.click('#btnConfirmDel')), 201, 'حذف قسم'); await settle(400);
  // الحذف
  await page.click('[data-show-all="1"]'); await page.waitForSelector('#cstTable'); await settle(400);
  await page.click('.btn-del-cst[data-id="c2"]'); await page.waitForSelector('#appConfirmModal #btnConfirmDel');
  eq(await after(/\/api\/v1\/costs\/c2/, 'DELETE', () => page.click('#btnConfirmDel')), 200, 'حذف تكلفة'); await settle(400);
  ok(await page.evaluate(() => !document.querySelector('.btn-del-cst[data-id="c2"]')), 'الجدول اتحدّث');
  eq(errors, [], 'من غير أخطاء');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
