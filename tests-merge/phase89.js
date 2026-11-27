// المرحلة 8 (الحزمة 8.8 — تكلفة المشروع والتكاليف): اختبارات قبول للواجهة القديمة (DEC-0086، DEC-0142).
// القيم المتوقعة = السلوك الحالي (LEGACY-PRESERVE) — ناتج الواجهة القديمة نفسها (phase89.expect.json، اتراجع؛ يتولّد تاني بـ PROBE=1):
//  [1] projectCostSummary لكل مشروع (عمالة، ومعدات، ووقود، وصيانة، ويومية مشروع، ومصروفات — والمصروف بسطور = صفر F-10 —، وتكاليف، وموردين
//      بالإجمالي F-11 والمرتجع سالب والملغاة والمخزّنة برّه، وصرف مخازن بتكلفته، والميزانية وحالتها) بفترة ومن غيرها، واسم مش مسجّل
//  [2] «تكلفة المشاريع الشاملة»: الكروت، والعناوين، والصفوف، والإجمالي، والبحث، والفترة
//  [3] صفحة المشاريع: عمود التكلفة، وفلتر حالة الميزانية (ضمن / قارب / تجاوز / بدون)
//  [4] صفحة التكاليف: لوحات الفئات، ولوحات الأقسام، والجدول بالفلاتر (البحث، والبند، والمشروع، والفترة)
//  [5] نافذة التكلفة: الإضافة بسطرين (السجل المخزّن بالظبط، والبنود المقترحة)، والتعديل، والتحقق، والحذف؛ والأقسام (إضافة، وتغيير اسم بيغيّر السجلات،
//      وحذف بيفضّي القسم)، وتغيير اسم بند بيغيّر السجلات
// بيشتغل في وضع الملف والويب (WEB_MODE=1) وفوق الجداول.
const { openApp } = require('./harness');
const lib = require('./lib');
const { summary, baseUser } = lib;
const probed = {};
const eq = (a, b, name) => { if (typeof b === 'string' && b.startsWith('__probe_')) { probed[b.slice(8)] = a; return; } lib.eq(a, b, name); };
(async () => {
  const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const A = (id, o) => Object.assign({ id, status: 'present', days: 1, deduction: 0, notes: '', personType: 'worker', personKind: 'worker' }, o);
  const C = (id, o) => Object.assign({ id, notes: '', section: '', extraFields: [] }, o);
  const INV = (id, o) => Object.assign({ id, supplierId: 'sp1', vat: 0, stampDuty: 0, withheld: 0, isReturn: false, attachments: [] }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9,
    projects: [
      { id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active', budget: 10000, value: 10000 },
      { id: 'pB', code: 'PRJ-002', name: 'برج النيل', status: 'active', budget: 2000, value: 2000 },
      { id: 'pC', code: 'PRJ-003', name: 'فيلا الندى', status: 'active', budget: 1000, value: 1000 },
      { id: 'pD', code: 'PRJ-004', name: 'مخزن العبور', status: 'active' },
    ],
    workers: [P('w1', { code: 'WRK-001', name: 'عامل أول', status: 'active', dailyWage: 300 }), P('w2', { code: 'WRK-002', name: 'عامل تاني', status: 'active', dailyWage: 200 })],
    supervisors: [P('s1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active', dailyWage: 400 })],
    drivers: [P('d1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', dailyWage: 280 })],
    employees: [P('e1', { code: 'EMP-001', name: 'منى المحاسبة', status: 'active', salary: 6000 })],
    equipment: [P('q1', { code: 'EQ-001', name: 'لودر', status: 'working', dailyCost: 1000 })],
    workerAttendance: [
      A('a1', { personId: 'w1', workerId: 'w1', date: '2026-03-01', dayWage: 300, project: 'مشروع الشروق' }),
      A('a2', { personId: 'w1', workerId: 'w1', date: '2026-03-02', dayWage: 300, days: 1.5, project: 'مشروع الشروق' }),
      A('a3', { personId: 'w2', workerId: 'w2', date: '2026-04-05', dayWage: 200, project: 'برج النيل' }),
      A('a4', { personId: 'w2', workerId: 'w2', date: '2026-03-03', dayWage: 200, status: 'absent', project: 'برج النيل' }),
    ],
    equipmentDaily: [{ id: 'ed1', equipmentId: 'q1', date: '2026-03-02', days: 1, hours: 0, fuelLiters: 0, kind: 'work', project: 'برج النيل', notes: '' }],
    fuelLogs: [{ id: 'f1', date: '2026-03-04', project: 'برج النيل', cost: 120.5, liters: 10 }],
    equipmentLogs: [{ id: 'm1', date: '2026-03-05', project: 'مشروع الشروق', cost: 75, type: 'maintenance' }],
    projectDaily: [{ id: 'pd1', date: '2026-03-06', project: 'فيلا الندى', laborCost: 500, equipCost: 300, fuelCost: 50 }],
    expenses: [
      { id: 'x1', date: '2026-03-07', project: 'مشروع الشروق', amount: 250, type: 'نثريات', personKind: 'worker', personId: 'w1', notes: '' },
      { id: 'x2', date: '2026-03-08', project: 'مشروع الشروق', lines: [{ item: 'شاي', amount: 40 }, { item: 'مياه', amount: 60 }], personKind: 'worker', personId: 'w1', notes: '' },
    ],
    costs: [
      C('c1', { personKind: 'worker', personId: 'w1', date: '2026-03-03', amount: 75, item: 'مواصلات', project: 'مشروع الشروق', section: 'مواقع' }),
      C('c2', { personKind: 'worker', personId: 'w2', date: '2026-03-09', amount: 130, lines: [{ item: 'خامات', amount: 100 }, { item: 'مواصلات', amount: 30 }], item: 'خامات + مواصلات', project: 'برج النيل' }),
      C('c3', { personKind: 'supervisor', personId: 's1', date: '2026-04-01', amount: 60, item: 'اتصالات', project: 'مشروع قديم', section: '' }),
      C('c4', { personKind: 'equipment', personId: 'q1', date: '2026-03-10', amount: 90, item: 'شحن ونقل', project: 'فيلا الندى' }),
      C('c5', { personKind: 'driver', personId: 'd1', date: '2026-03-11', amount: 45.5, item: 'وقود', project: '' }),
    ],
    costSections: { workers: ['مواقع', 'ورشة'] },
    ledger: {
      suppliers: [{ id: 'sp1', name: 'مورد الحديد', extraFields: [], attachments: [] }],
      invoices: [
        INV('i1', { invoiceNo: 'F-1', date: '2026-03-12', project: 'مشروع الشروق', baseValue: 1000, vat: 140, totalInvoice: 1140, withheld: 10, netInvoice: 1130 }),
        INV('i2', { invoiceNo: 'R-1', date: '2026-03-13', project: 'مشروع الشروق', baseValue: 100, totalInvoice: 100, netInvoice: 100, isReturn: true }),
        INV('i3', { invoiceNo: 'F-2', date: '2026-03-14', project: 'مشروع الشروق', baseValue: 500, totalInvoice: 500, netInvoice: 500, cancelled: true }),
        INV('i4', { invoiceNo: 'F-3', date: '2026-03-15', project: 'برج النيل', baseValue: 800, totalInvoice: 800, netInvoice: 800 }),
      ],
      payments: [],
    },
    warehouses: { items: [{ id: 'it1', code: 'IT-1', name: 'أسمنت', unit: 'شيكارة', avgCost: 90 }], movements: [
      { id: 'mv1', type: 'in', itemId: 'it1', qty: 10, supplierInvoiceId: 'i4', date: '2026-03-15' },
      { id: 'mv2', type: 'out', itemId: 'it1', qty: 3, unitCost: 80, project: 'مشروع الشروق', date: '2026-03-16' },
      { id: 'mv3', type: 'out', itemId: 'it1', qty: 2, project: 'برج النيل', date: '2026-03-17' },
    ] },
    clients: { customers: [{ id: 'cA', name: 'شركة الأمل', code: 'C1', status: 'active', projects: [], boqs: [], workSurveys: [], collections: [], contracts: [],
      invoices: [{ no: 'INV-1', project: 'مشروع الشروق', total: 5000, paid: 3000, date: '2026-03-20' }, { no: 'INV-2', project: 'برج النيل', total: 1000, paid: 0, date: '2026-03-21' }] }] },
  };
  const EXPECT = process.env.PROBE ? new Proxy({}, { get: (_, k) => '__probe_' + String(k) }) : require('./phase89.expect.json');
  const { browser, page, errors } = await openApp(seed);
  const closeAll = async () => { await page.evaluate(() => { try { closeSubModal(); } catch (e) { /* */ } try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); };
  const saveCount = () => page.evaluate(() => window.__saveCount);
  const waitSave = async (n) => { await page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 }); await page.waitForTimeout(300); };
  const grab = () => page.evaluate(() => { const t1 = (el) => (el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : ''); const root = document.querySelector('#app .page, #pageContent .page');
    const t = root.querySelector('table.data-table');
    return { title: t1(root.querySelector('.page-title')), boards: [...root.querySelectorAll('.board-card')].map(t1), cards: [...root.querySelectorAll('.stats-row .stat-card')].map(t1),
      head: t ? [...t.querySelectorAll('thead th')].map(t1) : [], rows: t ? [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map(t1)) : [], foot: t ? [...t.querySelectorAll('tfoot th')].map(t1) : [] }; });

  console.log('[1] projectCostSummary');
  const sums = await page.evaluate(() => Object.fromEntries([['all', '', ''], ['march', '2026-03-01', '2026-03-31'], ['april', '2026-04-01', '2026-04-30']].map(([k, f, t]) =>
    [k, Object.fromEntries(['مشروع الشروق', 'برج النيل', 'فيلا الندى', 'مخزن العبور', 'مشروع قديم'].map((n) => [n, projectCostSummary(n, f, t)]))])));
  eq(sums, EXPECT.sums, 'لكل مشروع بكل المصادر، بفترة ومن غيرها');
  const lines = await page.evaluate(() => ({ a: projectSupplyCostLines('مشروع الشروق'), b: projectSupplyCostLines('برج النيل') }));
  eq(lines, EXPECT.supplyLines, 'بنود الموردين والمخازن');

  console.log('[2] الشاملة');
  const comp = {};
  for (const [k, f] of [['all', {}], ['q', { q: 'النيل' }], ['march', { from: '2026-03-01', to: '2026-03-31' }]]) {
    await page.evaluate((f) => { compCostFilters = Object.assign({ q: '', from: '', to: '' }, f); goToPage('costs'); window.__costTab = '__all'; rerenderCurrentPage(); }, f);
    await page.waitForTimeout(200); comp[k] = await grab();
  }
  eq(comp, EXPECT.comprehensive, 'الكروت والعناوين والصفوف والإجمالي');

  console.log('[3] صفحة المشاريع');
  const proj = {};
  for (const b of ['', 'ok', 'warn', 'over', 'none']) {
    await page.evaluate((b) => { goToPage('projects'); Object.assign(projectFilters, { q: '', status: '', stageSel: '', customerId: '', detailId: '', hasRes: '', budget: b }); rerenderCurrentPage(); }, b);
    await page.waitForTimeout(200); const g = await grab(); proj[b || 'all'] = { head: g.head, rows: g.rows };
  }
  eq(proj, EXPECT.projects, 'عمود التكلفة وفلتر الميزانية');

  console.log('[4] صفحة التكاليف');
  const cv = async (tab, sec, showAll, f) => { await page.evaluate(([tab, sec, showAll, f]) => { costFilters = Object.assign({ q: '', personKind: '', personId: '', item: '', project: '', from: '', to: '' }, f || {}); goToPage('costs');
    window.__costTab = tab; window.__costSection = sec; window.__costShowAll = showAll; rerenderCurrentPage(); }, [tab, sec, showAll, f]); await page.waitForTimeout(200); return grab(); };
  const views = { kinds: await cv('', '', false), secs: await cv('workers', '', false), all: await cv('workers', '', true), site: await cv('workers', 'مواقع', false),
    q: await cv('workers', '', true, { q: 'خامات' }), item: await cv('workers', '', true, { item: 'مواصلات' }), project: await cv('workers', '', true, { project: 'النيل' }),
    period: await cv('workers', '', true, { from: '2026-03-05', to: '2026-03-31' }), sup: await cv('supervisors', '', true), eqp: await cv('equipment', '', true) };
  eq(views, EXPECT.costViews, 'اللوحات والأقسام والجدول بالفلاتر');
  const items = await page.evaluate(() => ({ used: costItemsUsed(), worker: costItemSuggestions('worker'), driver: costItemSuggestions('driver') }));
  eq(items, EXPECT.items, 'البنود المستخدمة والمقترحة');

  console.log('[5] النافذة والأقسام والبنود');
  await cv('workers', '', true);
  await page.click('#btnAddCost'); await page.waitForSelector('#appModal #btnSaveCost');
  const modal = await page.evaluate(() => ({ title: document.querySelector('#appModal .modal-header h3').textContent.trim(), labels: [...document.querySelectorAll('#appModal .modal-body .form-grid > label')].map((l) => { const c = l.cloneNode(true); c.querySelectorAll('input,select,textarea,div').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); }),
    kind: document.getElementById('cstFKind').value, sections: [...document.getElementById('cstSection').options].map((o) => o.textContent.trim()), date: document.getElementById('cstFDate').value === new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10) || document.getElementById('cstFDate').value.length === 10 }));
  eq(modal, EXPECT.modal, 'نافذة الإضافة (الخانات والقيم الافتراضية)');
  await page.click('#btnSaveCost'); await page.waitForTimeout(200);
  const v1 = await page.evaluate(() => document.querySelector('#toast, .toast')?.textContent || '');
  eq(/اختار الشخص/.test(v1), true, 'من غير شخص: مرفوض');
  await page.evaluate(() => { const h = document.getElementById('cstFPerson'); if (h) h.value = 'w2'; const t = document.querySelector('#cstFPersonBox .entity-combo-text'); if (t) t.value = 'عامل تاني'; if (typeof setEntityComboValue === 'function') setEntityComboValue('cstFPerson', 'w2'); });
  await page.fill('#cstFDate', '2026-03-18'); await page.fill('#cstFProject', 'مشروع الشروق'); await page.selectOption('#cstSection', 'ورشة');
  await page.click('#btnSaveCost'); await page.waitForTimeout(200);
  const v2 = await page.evaluate(() => document.querySelector('#toast, .toast')?.textContent || '');
  eq(/بند واحد على الأقل/.test(v2), true, 'من غير بنود: مرفوض');
  await page.locator('#cstLines .cst-item').first().fill('خامات'); await page.locator('#cstLines .cst-amt').first().fill('150.255');
  await page.click('#btnCstAddLine'); await page.locator('#cstLines .cst-item').nth(1).fill('بند جديد'); await page.locator('#cstLines .cst-amt').nth(1).fill('20');
  const tot = await page.innerText('#cstTotal');
  let n = await saveCount(); await page.click('#btnSaveCost'); await waitSave(n);
  const added = await page.evaluate(() => { const c = DATA.costs[DATA.costs.length - 1]; const { id, createdAt, updatedAt, ...rest } = c; return { rest: Object.fromEntries(Object.entries(rest).sort(([x], [y]) => (x < y ? -1 : 1))), hasId: !!id, pool: DATA.costItemPools.worker }; });
  eq({ tot, added }, EXPECT.added, 'الإضافة بسطرين: السجل المخزّن والبند الجديد في القايمة');
  const newId = await page.evaluate(() => DATA.costs[DATA.costs.length - 1].id);
  await cv('workers', '', true);
  await page.click(`.btn-edit-cst[data-id="c1"]`); await page.waitForSelector('#appModal #btnSaveCost');
  await page.locator('#cstLines .cst-amt').first().fill('80'); await page.fill('#cstFNotes', 'تعديل');
  n = await saveCount(); await page.click('#btnSaveCost'); await waitSave(n);
  const edited = await page.evaluate(() => { const c = DATA.costs.find((x) => x.id === 'c1'); const { createdAt, updatedAt, ...rest } = c; return Object.fromEntries(Object.entries(rest).sort(([x], [y]) => (x < y ? -1 : 1))); }); // ترتيب المفاتيح بيختلف في الويب (JSONB)
  eq(edited, EXPECT.edited, 'التعديل');
  await cv('workers', '', true);
  await page.click(`.btn-del-cst[data-id="${newId}"]`); await page.waitForSelector('#appConfirmModal');
  n = await saveCount(); await page.click('#appConfirmModal .btn-danger'); await waitSave(n);
  eq(await page.evaluate((id) => DATA.costs.some((x) => x.id === id), newId), false, 'الحذف');
  // الأقسام
  await cv('workers', '', false);
  await page.click('#btnCostAddSec'); await page.waitForSelector('#costSecName'); await page.fill('#costSecName', 'مكتب'); n = await saveCount(); await page.click('#btnDoCostSec'); await waitSave(n);
  await page.click('#btnCostRenSec'); await page.waitForSelector('#costRenOld'); await page.selectOption('#costRenOld', 'مواقع'); await page.fill('#costRenNew', 'المواقع'); n = await saveCount(); await page.click('#btnDoCostRen'); await waitSave(n);
  await page.click('#btnCostDelSec'); await page.waitForSelector('#costDelSec'); await page.selectOption('#costDelSec', 'ورشة'); await page.click('#btnDoCostDel'); await page.waitForSelector('#appConfirmModal');
  n = await saveCount(); await page.click('#appConfirmModal .btn-danger'); await waitSave(n);
  const secs = await page.evaluate(() => ({ sections: DATA.costSections, c1: DATA.costs.find((x) => x.id === 'c1').section }));
  eq(secs, EXPECT.sections, 'الأقسام: إضافة، وتغيير اسم بيغيّر السجلات، وحذف');
  // تغيير اسم بند
  await closeAll();
  const ren = await page.evaluate(() => { renameCostItemSuggestion('مواصلات', 'انتقالات', 'worker'); return { c1: DATA.costs.find((x) => x.id === 'c1').item, c2: { item: DATA.costs.find((x) => x.id === 'c2').item, lines: DATA.costs.find((x) => x.id === 'c2').lines }, hidden: DATA.costItemHidden.worker, pool: DATA.costItemPools.worker }; });
  eq(ren, EXPECT.renameItem, 'تغيير اسم بند بيغيّر السجلات');

  if (process.env.PROBE) { require('fs').writeFileSync(require('path').join(__dirname, 'phase89.expect.json'), JSON.stringify(probed, null, 2)); console.log('probed →', Object.keys(probed).length); }
  lib.eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
