// المرحلة 8 (الحزمة 8.7 — المعدات): اختبارات قبول للواجهة القديمة (DEC-0086، DEC-0139).
// القيم المتوقعة = السلوك الحالي (LEGACY-PRESERVE) — ناتج الواجهة القديمة نفسها (phase86.expect.json، اتراجع؛ يتولّد تاني بـ PROBE=1):
//  [1] لوحات أقسام المعدات، وجدول المعدات (الكروت، والفلاتر، والعناوين، والصفوف) بالفلاتر: الحالة، والملكية، والمشروع، والبحث، والقسم
//  [2] equipmentDailyCost لكل حالة (تكلفة مسجّلة، أيام × يومية، ساعات × ساعة، تقديرات، وقود؛ ويوم «توقف» و«نقل» بنفس التكلفة؛ و«تكلفة إضافية» مش محسوبة)
//      والمعاينة في نافذة اليومية (بتجمع كل حاجة — مختلفة عن التكلفة)
//  [3] نافذة المعدة: الإضافة (السجل المخزّن بالظبط: الاسم المتركّب، والكود الفريد، والقسم من نوع الترخيص، والسائق ورخصته، وحالة الرخصة من التاريخ)،
//      والتعديل (Object.assign)، والتحقق (الصيانة القادمة قبل الأخيرة)
//  [4] نافذة يومية المعدة: الإضافة (السجل، وساعات المعدة وحالتها بتتغيّر، والمشروع الجديد بيتضاف)، والتعديل، والحذف، والتحقق
//  [5] الجدول الشهري في صفحة المعدات، ولوحة المعدات في صفحة اليوميات (الكروت والصفوف)
//  [6] تبويب المعدات في المستحقات (الأيام = عدد السجلات، والتكلفة، والمدفوع، والمتبقي)
// بيشتغل في وضع الملف والويب (WEB_MODE=1) وفوق الجداول.
const { openApp } = require('./harness');
const lib = require('./lib');
const { summary, baseUser } = lib;
const probed = {};
const eq = (a, b, name) => { if (typeof b === 'string' && b.startsWith('__probe_')) { probed[b.slice(8)] = a; return; } lib.eq(a, b, name); };
(async () => {
  const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const E = (id, o) => P(id, Object.assign({ type: 'other', status: 'working', ownership: 'owned' }, o));
  const D = (id, o) => Object.assign({ id, kind: 'work', days: 1, hours: 0, fuelLiters: 0, notes: '' }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9, settings: { defaultFuelPrice: 12 },
    projects: [{ id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active' }],
    supervisors: [P('s1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active', dailyWage: 400 })],
    drivers: [P('d1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', licenseExpiry: '2099-01-01' })],
    equipment: [
      E('q1', { code: 'EQ-001', name: 'المعدات — لودر', typeLabel: 'لودر', licenseCategory: 'المعدات', departmentId: '__core_eq_machinery__', categoryId: '__core_eq_machinery__', vehicleNumber: 'أ ب 1', dailyCost: 1000, hourlyCost: 150, fuelPrice: 10, supervisorId: 's1', project: 'مشروع الشروق', vehicleLicenseExpiry: '2020-01-01', insuranceStatus: 'insured' }),
      E('q2', { code: 'EQ-002', name: 'سيارات النقل — قلاب', typeLabel: 'قلاب', licenseCategory: 'سيارات النقل', departmentId: '__core_eq_trucks__', categoryId: '__core_eq_trucks__', ownership: 'rented', status: 'maintenance', hourlyCost: 200, driverName: 'أحمد السواق', driverId: 'd1' }),
      E('q3', { code: 'EQ-003', name: 'ملاكي', typeLabel: 'تويوتا', status: 'stopped', dailyCost: 300 }),
    ],
    equipmentDaily: [
      D('ed1', { equipmentId: 'q1', date: '2026-03-02', project: 'مشروع الشروق', hours: 8, fuelLiters: 20 }),
      D('ed2', { equipmentId: 'q1', date: '2026-03-03', project: 'مشروع الشروق', kind: 'idle', days: 2 }),
      D('ed3', { equipmentId: 'q2', date: '2026-03-02', project: 'مشروع الشروق', days: 0, hours: 5 }),
      D('ed4', { equipmentId: 'q2', date: '2026-03-04', project: 'مشروع الشروق', kind: 'move', cost: 777 }),
      D('ed5', { equipmentId: 'q3', date: '2026-03-05', project: 'مشروع الشروق', extraCost: 50, dailyCost: 250 }),
    ],
    workerPayments: [{ id: 'p1', personType: 'equipment', personId: 'q1', workerId: '', type: 'pay', date: '2026-03-10', amount: 500, scope: 'self', notes: '' }],
  };
  const EXPECT = process.env.PROBE ? new Proxy({}, { get: (_, k) => '__probe_' + String(k) }) : require('./phase86.expect.json');
  const { browser, page, errors } = await openApp(seed);
  const closeAll = async () => { await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); };
  const saveCount = () => page.evaluate(() => window.__saveCount);
  const waitSave = async (n) => { await page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 }); await page.waitForTimeout(300); };
  const txt = 'const t1 = (el) => (el ? (el.innerText || "").replace(/\\s+/g, " ").trim() : "");';

  console.log('[1] اللوحات والجدول');
  const boards = await page.evaluate(() => { goToPage('equipment'); Object.keys(equipmentFilters).forEach((k) => { equipmentFilters[k] = ''; }); equipmentFilters.detailId = ''; equipmentFilters.dailyView = false; equipmentFilters._boardLevel = ''; rerenderCurrentPage();
    return [...document.querySelectorAll('#app .board-card')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()); });
  eq(boards, EXPECT.boards, 'لوحات أقسام المعدات');
  const view = (f) => page.evaluate(([f, txt]) => { const t1 = (el) => (el ? (el.innerText || "").replace(/\s+/g, " ").trim() : ""); void txt;
    goToPage('equipment'); Object.keys(equipmentFilters).forEach((k) => { equipmentFilters[k] = ''; }); equipmentFilters.detailId = ''; equipmentFilters.dailyView = false; Object.assign(equipmentFilters, { _boardLevel: 'list' }, f); rerenderCurrentPage();
    const root = document.querySelector('#app .page'); const t = root.querySelector('table.data-table');
    return { cards: [...root.querySelectorAll('.sc-row .sc-card, .stats-row .stat-card')].map(t1), filters: [...root.querySelectorAll('.filters-bar select, .filters-bar input')].map((x) => [x.id, x.tagName === 'SELECT' ? [...x.options].map((o) => o.textContent.trim()) : x.placeholder]),
      head: [...t.querySelectorAll('thead th')].map(t1), rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map(t1)) }; }, [f, txt]);
  const views = {};
  for (const f of [{}, { status: 'working' }, { ownership: 'rented' }, { project: 'الشروق' }, { q: 'قلاب' }, { departmentId: '__core_eq_machinery__' }]) views[JSON.stringify(f)] = await view(f);
  eq(views, EXPECT.views, 'جدول المعدات بالفلاتر');

  console.log('[2] التكلفة');
  const costs = await page.evaluate(() => DATA.equipmentDaily.map((d) => [d.id, equipmentDailyCost(d, getEquipment(d.equipmentId))]).concat([
    ['hoursOnly-day8', equipmentDailyCost({ days: 2, hours: 0 }, { hourlyCost: 100 })], ['dailyFromHours', equipmentDailyCost({ days: 0, hours: 4 }, { dailyCost: 800 })],
    ['fuelEqPrice', equipmentDailyCost({ days: 1, fuelLiters: 10 }, { dailyCost: 100, fuelPricePerLiter: 7 })], ['costString', equipmentDailyCost({ cost: '' , days: 1 }, { dailyCost: 90 })]]));
  eq(costs, EXPECT.costs, 'equipmentDailyCost لكل حالة');

  console.log('[3] نافذة المعدة');
  await closeAll(); await page.evaluate(() => { goToPage('equipment'); openEquipmentModal(); }); await page.waitForTimeout(500);
  const modalShape = await page.evaluate(([txt]) => { const t1 = (el) => (el ? (el.innerText || "").replace(/\s+/g, " ").trim() : ""); void txt;
    const m = document.getElementById('appModal'); return { title: t1(m.querySelector('.modal-header h3')), labels: [...m.querySelectorAll('.modal-body label')].filter((l) => l.offsetParent !== null).map((l) => { const c = l.cloneNode(true); c.querySelectorAll('input,select,textarea,div,button').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); }),
      options: Object.fromEntries(['eqType', 'eqStatus', 'eqOwnership', 'eqInsStatus'].map((id) => [id, [...document.getElementById(id).options].map((o) => o.textContent.trim())])), code: document.getElementById('eqCode').value }; }, [txt]);
  await page.evaluate(() => { const v = (id, x) => { document.getElementById(id).value = x; }; v('eqType', '__core_eq_trucks__'); v('eqCarType', ' مرسيدس '); v('eqStatus', 'working'); v('eqOwnership', 'rented'); v('eqVehicleNumber', ' ن ق 9 '); v('eqColor', 'أبيض'); v('eqChassis', 'CH1'); v('eqInsStatus', 'insured'); v('eqModel', '2020');
    v('eqDriver', 'd1'); v('eqPurchasePrice', '150000.555'); v('eqVehLicExp', '2099-05-05'); v('eqLastMaint', '2026-01-01'); v('eqNextMaint', '2026-06-01'); v('eqNotes', ' ملاحظة '); v('eqCode', 'EQ-001'); });
  let n = await saveCount(); await page.click('#btnSaveEq'); await waitSave(n);
  const added = await page.evaluate(() => { const e = DATA.equipment.find((x) => x.typeLabel === 'مرسيدس'); const { id, ...r } = e; return { ...r, hasId: !!id }; });
  await closeAll(); await page.evaluate(() => openEquipmentModal('q3')); await page.waitForTimeout(400);
  await page.evaluate(() => { document.getElementById('eqVehLicExp').value = '2020-02-02'; document.getElementById('eqNotes').value = 'اتعدّلت'; });
  n = await saveCount(); await page.click('#btnSaveEq'); await waitSave(n);
  const edited = await page.evaluate(() => { const e = DATA.equipment.find((x) => x.id === 'q3'); const dep = DATA.departments.find((d) => d.id === e.departmentId); return [e.name, e.code, e.status, e.ownership, e.dailyCost, e.vehicleLicenseStatus, e.licenseStatus, e.notes, dep ? [dep.name, dep.kind || '', /^id_/.test(dep.id)] : e.departmentId, e.licenseCategory]; });
  await closeAll(); await page.evaluate(() => openEquipmentModal('q2')); await page.waitForTimeout(400);
  await page.evaluate(() => { document.getElementById('eqLastMaint').value = '2026-05-01'; document.getElementById('eqNextMaint').value = '2026-04-01'; });
  n = await saveCount(); await page.click('#btnSaveEq'); await page.waitForTimeout(500);
  const maintBlocked = await page.evaluate((n) => window.__saveCount === n, n);
  eq({ modalShape, added, edited, maintBlocked }, EXPECT.eqModal, 'نافذة المعدة: الشكل والإضافة والتعديل والتحقق');

  console.log('[4] نافذة اليومية');
  await closeAll(); await page.evaluate(() => { goToPage('equipment'); openEquipmentDailyModal('q1', null, '2026-03-20'); }); await page.waitForTimeout(500);
  const dShape = await page.evaluate(([txt]) => { const t1 = (el) => (el ? (el.innerText || "").replace(/\s+/g, " ").trim() : ""); void txt;
    const m = document.getElementById('appModal'); return { title: t1(m.querySelector('.modal-header h3')), labels: [...m.querySelectorAll('.modal-body label')].map((l) => { const c = l.cloneNode(true); c.querySelectorAll('input,select,textarea,div,small').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); }),
      values: Object.fromEntries(['edEq', 'edDate', 'edKind', 'edDays', 'edDaily', 'edHours', 'edHourly', 'edFuel', 'edFuelPrice', 'edExtra'].map((id) => [id, document.getElementById(id).value])), preview: document.getElementById('edCostVal').textContent }; }, [txt]);
  await page.fill('#edHours', '6'); await page.fill('#edFuel', '10'); await page.fill('#edExtra', '40'); await page.dispatchEvent('#edExtra', 'input');
  const preview = await page.evaluate(() => document.getElementById('edCostVal').textContent);
  n = await saveCount(); await page.click('#btnSaveEd'); await page.waitForTimeout(400);
  const noProject = await page.evaluate((n) => window.__saveCount === n, n);
  await page.evaluate(() => { document.getElementById('edProject').value = 'موقع جديد'; });
  n = await saveCount(); await page.click('#btnSaveEd'); await waitSave(n);
  const dAdded = await page.evaluate(() => { const d = DATA.equipmentDaily.find((x) => x.date === '2026-03-20'); const { id, ...r } = d; const e = DATA.equipment.find((x) => x.id === 'q1'); return { rec: { ...r, hasId: !!id }, cost: equipmentDailyCost(d, e), eqAfter: [e.totalHours, e.status], projectAdded: DATA.projects.some((p) => p.name === 'موقع جديد') }; });
  await closeAll(); await page.evaluate(() => openEquipmentDailyModal(null, null, '2026-03-21')); await page.waitForTimeout(400);
  await page.evaluate(() => { document.getElementById('edEq').value = 'q3'; document.getElementById('edEq').dispatchEvent(new Event('change')); }); await page.waitForTimeout(200);
  await page.selectOption('#edKind', 'idle'); await page.evaluate(() => { document.getElementById('edProject').value = 'مشروع الشروق'; });
  n = await saveCount(); await page.click('#btnSaveEd'); await waitSave(n);
  const idleAdded = await page.evaluate(() => { const d = DATA.equipmentDaily.find((x) => x.date === '2026-03-21'); const e = DATA.equipment.find((x) => x.id === 'q3'); return [d.kind, d.dailyCost, d.hourlyCost, equipmentDailyCost(d, e), e.status]; });
  await closeAll(); await page.evaluate(() => openEquipmentDailyModal(null, 'ed2')); await page.waitForTimeout(400);
  await page.fill('#edNotes', 'اتعدّلت'); n = await saveCount(); await page.click('#btnSaveEd'); await waitSave(n);
  const dEdited = await page.evaluate(() => { const d = DATA.equipmentDaily.find((x) => x.id === 'ed2'); return [d.kind, d.days, d.dailyCost, d.notes, DATA.equipment.find((x) => x.id === 'q1').totalHours]; });
  await closeAll(); await page.evaluate(() => { window.confirmDelete = () => Promise.resolve(true); openEquipmentDailyModal(null, 'ed5'); }); await page.waitForTimeout(400);
  n = await saveCount(); await page.click('#btnDelEd'); await waitSave(n);
  eq({ dShape, preview, noProject, dAdded, idleAdded, dEdited, deleted: await page.evaluate(() => !DATA.equipmentDaily.some((x) => x.id === 'ed5')) }, EXPECT.dailyModal, 'نافذة اليومية: الشكل والمعاينة والإضافة والتعديل والحذف');

  console.log('[5] الجداول الشهرية');
  const grid = await page.evaluate(([txt]) => { const t1 = (el) => (el ? (el.innerText || "").replace(/\s+/g, " ").trim() : ""); void txt;
    goToPage('equipment'); Object.assign(equipmentFilters, { _boardLevel: 'list', detailId: '', dailyView: true, year: 2026, month: 3, q: '', status: '' }); rerenderCurrentPage();
    const t = document.querySelector('#app table.data-table'); const list = [...document.querySelectorAll('#app table.data-table')][1];
    return { head: [...t.querySelectorAll('thead th')].map(t1).slice(0, 3), rows: [...t.querySelectorAll('tbody tr')].map((tr) => { const c = [...tr.children]; return [t1(c[0]), c.slice(1, -3).map((td) => { const b = td.querySelector('button'); return b && b.classList.contains('filled') ? [t1(b), b.title] : ''; }).filter(Boolean), t1(c[c.length - 3]), t1(c[c.length - 2])]; }),
      list: [...list.querySelectorAll('tbody tr')].map((tr) => [...tr.children].slice(0, 7).map(t1)) }; }, [txt]);
  const embed = await page.evaluate(([txt]) => { const t1 = (el) => (el ? (el.innerText || "").replace(/\s+/g, " ").trim() : ""); void txt;
    goToPage('workerAttendance'); Object.assign(workerAttFilters, { dailiesTab: 'equipment', dailiesDept: '', dFrom: '2026-03-01', dTo: '2026-03-31', q: '', project: '', site: '', status: '' }); rerenderCurrentPage();
    const t = document.querySelector('#app table.watt-grid');
    return { cards: [...document.querySelectorAll('#app .sc-row .sc-card')].map(t1), rows: [...t.querySelectorAll('tbody tr')].map((tr) => { const c = [...tr.children]; return [t1(c[0]), t1(c[1]), c.slice(2, -4).map(t1).filter((x) => x && x !== '·'), ...c.slice(-4, -1).map(t1)]; }) }; }, [txt]);
  eq({ grid, embed }, EXPECT.grids, 'الجدول الشهري في المعدات، ولوحة المعدات في اليوميات');

  console.log('[6] مستحقات المعدات');
  const dues = await page.evaluate(([txt]) => { const t1 = (el) => (el ? (el.innerText || "").replace(/\s+/g, " ").trim() : ""); void txt;
    goToPage('workerDues'); window.__duesTab = 'equipment'; window.__duesDept = ''; window.__duesWorkerQ = ''; workerAttFilters.from = ''; workerAttFilters.to = ''; rerenderCurrentPage();
    const t = document.querySelector('#app table.data-table'); return { cards: [...document.querySelectorAll('#app .stats-row .stat-card')].map(t1), head: [...t.querySelectorAll('thead th')].map(t1), rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map(t1)) }; }, [txt]);
  eq(dues, EXPECT.dues, 'تبويب المعدات في المستحقات');

  eq(errors, [], 'no JS errors');
  await browser.close();
  if (process.env.PROBE) require('fs').writeFileSync(require('path').join(__dirname, 'phase86.expect.json'), JSON.stringify(probed, null, 1) + '\n');
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
