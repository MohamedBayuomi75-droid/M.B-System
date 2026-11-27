// جداول المشرفين والسواقين (8.2.5، DEC-0123 د-5): /app/supervisors و/app/drivers بيعرضوا نفس جدول الواجهة القديمة بالظبط —
// نفس العناوين الظاهرة بالترتيب، ونفس خلايا كل صف — في وضعين: من غير تخطيط محفوظ (الافتراضي)، وبتخطيط محفوظ (ترتيب، وإخفاء، وخانة إضافية،
// وخانة تلقائية). نفس السيرفر ونفس البيانات: القديمة بتتفتح الأول وبتحفظ التخطيط الفعلي (syncAutoFields) زي البيانات الحقيقية.
// التشغيل: node tests-web/people-layout-e2e.js   (محتاج build للسيرفر والواجهة الجديدة + PostgreSQL للاختبار)
'use strict';
const path = require('path');
const { openWebApp } = require(path.join(__dirname, '../tests-merge/harness'));
const { baseUser, eq, ok, summary } = require(path.join(__dirname, '../tests-merge/lib'));

const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
const base = () => ({
  users: [baseUser], schemaVersion: 9,
  supervisors: [
    P('s1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active', nationalId: '28001011234567', phone: '01001112222', dailyWage: 350, position: 'مشرف موقع', skill: 'مشرف موقع', licenseExpiry: '2020-01-01', idCardExpiry: '2099-01-01', hireDate: '2024-01-01', address: 'القاهرة', insuranceStatus: 'insured', contractType: 'permanent', contractStatus: 'active', extraFields: [{ label: 'المقاس', value: 'XL' }] }),
    P('s2', { code: 'SUP-002', name: 'كريم عادل', status: 'on_leave' }),
  ],
  workers: [P('w1', { code: 'WRK-001', name: 'عامل', workerType: 'temporary', status: 'active', supervisorId: 's1' })],
  drivers: [
    P('d1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', salary: 5000, licenseGrade: 'درجة أولى', licenseExpiry: '2099-01-01', nationalId: '29001011234567', phone: '01112223333', position: 'سائق نقل', idCardExpiry: '2020-01-01', birthDate: '1990-01-01' }),
    P('d2', { code: 'DRV-002', name: 'محمود خارجي', status: 'active', external: true, dailyWage: 200, phone: '01223334444', position: 'سائق', address: 'الجيزة' }),
    P('d3', { code: 'DRV-003', name: 'سيد سواق', status: '' }),
  ],
  customFieldDefs: { supervisors: [{ id: 'cf1', label: 'المقاس', showInTable: true }] },
});
const SAVED = {
  formLayouts: {
    supervisors: [
      { key: 'code', label: 'الكود', type: 'builtin' }, { key: 'name', label: 'الاسم', type: 'builtin' }, { key: 'status', label: 'الحالة', type: 'builtin' }, { key: 'phone', label: 'الهاتف', type: 'builtin' },
      { key: 'nationalId', label: 'الرقم القومي', type: 'builtin' }, { key: 'department', label: 'القسم', type: 'builtin' }, { key: 'dailyWage', label: 'اليومية', type: 'builtin' },
      { key: 'address', label: 'العنوان', type: 'builtin', showInTable: false, _userHidTable: true }, { key: 'birthDate', label: 'تاريخ الميلاد', type: 'builtin' },
      { key: 'cf1', id: 'cf1', label: 'المقاس', type: 'custom', showInTable: true }, { key: 'notes', label: 'الملاحظات', type: 'builtin' },
    ],
    driversExt: [
      { key: 'code', label: 'الكود', type: 'builtin' }, { key: 'name', label: 'الاسم', type: 'builtin' }, { key: 'phone', label: 'الهاتف', type: 'builtin' }, { key: 'status', label: 'الحالة', type: 'builtin' },
      { key: 'nationalId', label: 'الرقم القومي', type: 'builtin', showInTable: false, _userHidTable: true }, { key: 'job', label: 'الوظيفة', type: 'builtin' }, { key: 'department', label: 'القسم', type: 'builtin' },
      { key: 'dailyWage', label: 'اليومية', type: 'builtin' }, { key: 'address', label: 'العنوان', type: 'builtin' }, { key: 'notes', label: 'الملاحظات', type: 'builtin' },
    ],
  },
  autoFields: { drivers: [{ key: 'f_drvInsNo', label: 'الرقم التأميني', selector: '#drvInsNo' }] },
};
const VIEWS = [['supervisors', 'supervisorFilters', ''], ['drivers', 'driverFilters', ''], ['drivers', 'driverFilters', '__core_drivers_ext__'], ['drivers', 'driverFilters', '__core_drivers__']];
const grab = (sel) => {
  const t = document.querySelector(sel); if (!t) return null;
  const vis = (el) => el && getComputedStyle(el).display !== 'none';
  const txt = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
  const ths = [...t.querySelectorAll('thead tr > th')];
  const keep = ths.map((th, i) => (vis(th) && !th.querySelector('input') && txt(th) ? i : -1)).filter((i) => i >= 0);
  const rows = {};
  t.querySelectorAll('tbody tr').forEach((tr) => {
    const idEl = tr.querySelector('[data-id]'); const id = (idEl && idEl.getAttribute('data-id')) || tr.getAttribute('data-id');
    if (!id) return;
    const cells = [...tr.children];
    rows[id] = keep.map((i) => (!cells[i] ? '' : !vis(cells[i]) ? '∅' : cells[i].querySelector('button, a') ? 'أزرار' : txt(cells[i])));
  });
  return { head: keep.map((i) => txt(ths[i])), rows };
};

async function round(label, seed) {
  const { browser, page, base: url, errors } = await openWebApp(seed);
  const legacyAt = async (pg, f, d) => {
    await page.evaluate(([pg, d]) => { goToPage(pg); const F = pg === 'supervisors' ? supervisorFilters : driverFilters; Object.keys(F).forEach((k) => { F[k] = ''; }); F._boardLevel = 'list'; F.departmentId = d; rerenderCurrentPage(); }, [pg, d]);
    await page.waitForTimeout(600);
    return page.evaluate(grab, '#pageContent table.data-table');
  };
  for (const [pg, f, d] of VIEWS) await legacyAt(pg, f, d);
  await page.evaluate(async () => { await WebSync.save(DATA); });
  await page.reload(); await page.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && DATA.drivers.length === 3, null, { timeout: 30000 });
  console.log(`[${label}] الجدول بنفس الأعمدة والترتيب والقيم في الواجهتين`);
  const out = {};
  const legacyAll = [];
  for (const [pg, f, d] of VIEWS) legacyAll.push(await legacyAt(pg, f, d));
  for (const [vi, [pg, , d]] of VIEWS.entries()) {
    const legacy = legacyAll[vi];
    await page.goto(url + '/app/' + pg); await page.waitForSelector('#pplBoards .entity-dept-board');
    const resp = page.waitForResponse((r) => new RegExp(`/api/v1/${pg}(\\?|$)`).test(r.url()) && r.request().method() === 'GET');
    await page.click(`#pplBoards .entity-dept-board[data-dept="${d}"]`); await resp; await page.waitForSelector('#pplTable tbody tr[data-id]'); await page.waitForTimeout(300);
    const app = await page.evaluate(grab, '#pplTable');
    const tag = `${pg}${d ? ' ' + d : ''}`;
    eq(app.head, legacy.head, `${tag}: العناوين الظاهرة بنفس الترتيب`);
    for (const id of Object.keys(legacy.rows)) legacy.rows[id].forEach((v, i) => { const g = (app.rows[id] || [])[i]; if (g !== v) console.log('   ≠', tag, id, i, legacy.head[i], JSON.stringify(g), JSON.stringify(v)); });
    eq(app.rows, legacy.rows, `${tag}: خلايا كل صف`);
    out[tag] = legacy.head;
  }
  eq(errors, [], `${label}: من غير أخطاء`);
  await browser.close();
  return out;
}

/** النوافذ: نفس الخانات بنفس الترتيب، والحفظ من الشاشة الجديدة بيطلّع القيم المتوقعة (المقارنة الحرفية بالقديمة في phase76) */
async function modals(seed = base(), onlyLabels = false) {
  const { browser, page, base: url, errors } = await openWebApp(seed);
  // التخطيط المحفوظ (S5): القديمة بتطبّقه وقت فتح الصفحة (syncAutoFields) — نحفظه زي البيانات الحقيقية
  if (onlyLabels) { for (const pg of ['supervisors', 'drivers']) { await page.evaluate((p) => { goToPage(p); rerenderCurrentPage(); }, pg); await page.waitForTimeout(500); } await page.evaluate(async () => { await WebSync.save(DATA); }); await page.reload(); await page.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta, null, { timeout: 30000 }); }
  // الترتيب الظاهر (CSS order من applyPeopleFormOrder، وبعده ترتيب الـ DOM) — مش ترتيب الـ DOM لوحده
  const labels = (root) => page.evaluate((r) => [...document.querySelectorAll(r + ' .modal-body label')].filter((l) => l.offsetParent !== null && getComputedStyle(l).display !== 'none').map((l, i) => [l, Number(getComputedStyle(l).order) || 0, i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map((x) => x[0])
    .map((l) => { const c = l.cloneNode(true); c.querySelectorAll('input,select,textarea,small,button').forEach((n) => n.remove()); return (c.textContent || '').replace(/\s+/g, ' ').replace(/\*/g, '').trim(); }).filter((x) => x && !/^(المرفقات|إرفاق|رفع مرفق)/.test(x)), root);
  // خيارات القوايم المنسدلة بالترتيب (selectOptions في القديمة بيرتّب بالاسم)
  const opts = (r) => page.evaluate((r) => Object.fromEntries([...document.querySelectorAll(r + ' .modal-body select')].filter((x) => x.id).map((x) => [x.id, [...x.options].map((o) => o.textContent.trim())]).sort(([a], [b]) => a.localeCompare(b))), r);
  const legacyOpts = [];
  const LEG = [['supervisors', 'openSupervisorModal', null, 'sup'], ['supervisors', 'openSupervisorModal', 's1', 'sup'], ['drivers', 'openDriverModal', null, 'drv'], ['drivers', 'openDriverModal', 'd1', 'drv'], ['drivers', 'openDriverModal', 'd2', 'drv']];
  const legacy = [];
  for (const [pg, fn, id] of LEG) {
    await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(300);
    await page.evaluate(([pg, fn, id]) => { goToPage(pg); window[fn](id); }, [pg, fn, id]); await page.waitForTimeout(500);
    legacy.push(await labels('#appModal'));
    legacyOpts.push(await opts('#appModal'));
  }
  // الخارجي الجديد: زرار «سائق خارجي»
  await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(300);
  await page.evaluate(() => { goToPage('drivers'); openDriverModal(null, { external: true }); }); await page.waitForTimeout(500);
  legacy.push(await labels('#appModal'));
  console.log('[النوافذ] نفس الخانات بنفس الترتيب');
  const openNew = async (pg, dept, how) => {
    await page.goto(url + '/app/' + pg); await page.waitForSelector('#pplBoards .entity-dept-board');
    const resp = page.waitForResponse((r) => new RegExp(`/api/v1/${pg}(\\?|$)`).test(r.url()) && r.request().method() === 'GET');
    await page.click(`#pplBoards .entity-dept-board[data-dept="${dept}"]`); await resp; await page.waitForTimeout(200);
    await page.click(how); await page.waitForSelector('#appModal .modal-footer .btn-primary'); await page.waitForTimeout(200);
  };
  const NEW = [['supervisors', '', '#btnAddSup'], ['supervisors', '', '.btn-edit-sup[data-id="s1"]'], ['drivers', '__core_drivers__', '#btnAddDriver'], ['drivers', '', '.btn-edit-drv[data-id="d1"]'], ['drivers', '', '.btn-edit-drv[data-id="d2"]'], ['drivers', '__core_drivers_ext__', '#btnAddExtDriver']];
  const names = ['مشرف جديد', 'تعديل مشرف', 'سائق شركة جديد', 'تعديل سائق شركة', 'تعديل سائق خارجي', 'سائق خارجي جديد'];
  for (const [i, [pg, d, how]] of NEW.entries()) {
    await openNew(pg, d, how); eq(await labels('#appModal'), legacy[i], `${names[i]}: نفس الخانات بالترتيب`);
    if (legacyOpts[i]) eq(await opts('#appModal'), legacyOpts[i], `${names[i]}: نفس خيارات القوايم بالترتيب`);
  }

  if (onlyLabels) { ok(legacy[0].includes('انتهاء رخصة القيادة'), 'الاسم المتغيّر ظاهر فعلًا في نافذة المشرف القديمة', legacy[0]); eq(errors, [], 'النوافذ (تخطيط محفوظ): من غير أخطاء'); await browser.close(); return; }
  console.log('[الحفظ من الشاشة الجديدة]');
  // جسم الرد ممكن يختفي لو الصفحة حدّثت نفسها بعد الحفظ (CI 119: «No data found for resource») ← نقرا السجل من السيرفر بنفس التوثيق
  const bodyOf = async (r) => { try { return await r.json(); } catch (e) {
    const auth = r.request().headers()['authorization'];
    const get = (u) => page.evaluate(async ([u, a]) => (await fetch(u, { headers: { Authorization: a, Accept: 'application/json' } })).json(), [u, auth]);
    if (r.request().method() !== 'POST') return get(r.url());
    // POST (CI 173): السجل الجديد بالاسم من القايمة، وبعدين نقراه بمعرّفه
    const name = String((JSON.parse(r.request().postData() || '{}').name) || '').trim(); if (!name) throw e;
    const list = await get(`${r.url()}?q=${encodeURIComponent(name)}`); const row = (list.rows || list.items || []).find((x) => String(x.name || '').trim() === name);
    if (!row) throw e;
    return get(`${r.url()}/${encodeURIComponent(row.id)}`);
  } };
  const lastSaved = async (pg, method) => { const r = await page.waitForResponse((x) => new RegExp(`/api/v1/${pg}(/[^/?]+)?$`).test(x.url()) && x.request().method() === method); return [r.status(), await bodyOf(r)]; };
  // مشرف: يومية وتاريخ رخصة
  await openNew('supervisors', '', '#btnAddSup');
  await page.fill('#supName', 'مشرف الواجهة'); await page.fill('#supPos', 'مشرف أمن'); await page.fill('#supWage', '275.555'); await page.fill('#supLicExp', '2020-05-01');
  let [st, b] = await Promise.all([lastSaved('supervisors', 'POST'), page.click('#btnSaveSup')]).then((x) => x[0]);
  eq([st, b.code, b.dailyWage, b.skill, b.licenseStatus, b.departmentId, !!b.hireDate], [201, 'SUP-003', 275.56, 'مشرف أمن', 'expired', '__core_supervisors__', true], 'إضافة مشرف (اليومية بخانتين، والرخصة منتهية، وتاريخ التعيين اتملى)');
  // استقالة بتاريخها
  await page.waitForSelector('.btn-edit-sup[data-id="s2"]'); await page.click('.btn-edit-sup[data-id="s2"]'); await page.waitForSelector('#supStatus');
  await page.selectOption('#supStatus', 'resigned'); await page.waitForSelector('#supResignDate'); await page.fill('#supResignDate', '2026-03-15');
  [st, b] = await Promise.all([lastSaved('supervisors', 'PATCH'), page.click('#btnSaveSup')]).then((x) => x[0]);
  eq([st, b.status, b.resignedAt, b.departmentId], [200, 'resigned', '2026-03-15', '__resigned_supervisor__'], 'استقالة المشرف بتاريخها من النافذة');
  // سواق شركة: الراتب ودرجة الرخصة
  await openNew('drivers', '__core_drivers__', '#btnAddDriver');
  eq(await page.inputValue('#drvPos'), 'سائق', 'الوظيفة «سائق» افتراضي');
  await page.fill('#drvName', 'سواق الواجهة'); await page.fill('#drvSalary', '4500.5'); await page.selectOption('#drvLicGrade', 'درجة ثانية');
  [st, b] = await Promise.all([lastSaved('drivers', 'POST'), page.click('#btnSaveDriver')]).then((x) => x[0]);
  eq([st, b.salary, b.licenseGrade, b.departmentId, !!b.external], [201, 4500.5, 'درجة ثانية', '__core_drivers__', false], 'إضافة سواق شركة');
  // سواق خارجي
  await openNew('drivers', '__core_drivers_ext__', '#btnAddExtDriver');
  eq(await page.$eval('#appModal h3', (h) => h.textContent.trim()), 'إضافة سائق خارجي', 'نافذة السواق الخارجي');
  await page.fill('#drvName', 'خارجي الواجهة'); await page.fill('#drvWage', '180.555');
  [st, b] = await Promise.all([lastSaved('drivers', 'POST'), page.click('#btnSaveDriver')]).then((x) => x[0]);
  eq([st, b.external, b.dailyWage, b.departmentId, b.position], [201, true, 180.56, '__core_drivers_ext__', 'سائق'], 'إضافة سواق خارجي');
  // منع التكرار
  await openNew('supervisors', '', '#btnAddSup'); await page.fill('#supName', 'سامي المشرف'); await page.click('#btnSaveSup');
  await page.waitForSelector('#appSubModal #btnDupForce');
  eq(await page.$eval('#appSubModal h3', (h) => h.textContent.trim()), '⚠️ يوجد سجلات متشابهة', 'منع التكرار: نافذة التشابه');
  eq(errors, [], 'النوافذ: من غير أخطاء');
  await browser.close();
}

(async () => {
  await modals();
  // S5 (UAT 8.2): اسم خانة متغيّر في التخطيط المحفوظ (خانة تلقائية على #supLicExp)
  console.log('[النوافذ بتخطيط محفوظ]');
  await modals({ ...base(), autoFields: { supervisors: [{ key: 'f_supLicExp', label: 'تاريخ انتهاء الرخصة الشخصية', selector: '#supLicExp' }] },
    formLayouts: { supervisors: [{ key: 'code', label: 'الكود', type: 'builtin' }, { key: 'name', label: 'الاسم', type: 'builtin' }, { key: 'f_supLicExp', label: 'انتهاء رخصة القيادة', type: 'builtin', selector: '#supLicExp', auto: true }] } }, true);
  await round('الافتراضي', base());
  const saved = await round('تخطيط محفوظ', { ...base(), ...SAVED });
  ok(!saved.supervisors.includes('العنوان') && saved.supervisors.includes('المقاس'), 'التخطيط اتطبّق: عمود مخفي وخانة إضافية (المشرفين)', saved.supervisors);
  ok(!saved['drivers __core_drivers_ext__'].includes('الرقم القومي'), 'التخطيط اتطبّق: عمود مخفي (السواقين من بره)', saved['drivers __core_drivers_ext__']);
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
