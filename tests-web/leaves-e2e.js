// شاشة الإجازات (8.4.5، DEC-0127): /app/leaves بتعرض نفس صفحة الإجازات القديمة بالظبط — نفس الكروت، ونفس الفلاتر (بالمعرّفات والخيارات)،
// ونفس الجدول (العناوين والخلايا والأزرار لكل صف)، وبعد فلتر — والنافذة بنفس الخانات والخيارات والقيم. والحفظ والموافقة والرفض والحذف من
// الشاشة الجديدة، وحالة الشخص بتتغيّر فورًا بالموافقة (د-2).
// التشغيل: node tests-web/leaves-e2e.js   (محتاج build للسيرفر والواجهة الجديدة + PostgreSQL للاختبار)
'use strict';
const path = require('path');
const { openWebApp } = require(path.join(__dirname, '../tests-merge/harness'));
const { baseUser, eq, ok, summary } = require(path.join(__dirname, '../tests-merge/lib'));

const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
const L = (id, o) => Object.assign({ id, personKind: 'employee', type: 'annual', status: 'pending', reason: '' }, o);
const seed = {
  users: [baseUser], schemaVersion: 9,
  settings: { defaultLeaveDays: 21 },
  employees: [P('e1', { code: 'EMP-001', name: 'أحمد المحاسب', status: 'active', departmentId: '__core_employees__', categoryId: '__core_employees__' }),
    P('e2', { code: 'EMP-002', name: 'منى السكرتيرة', status: 'active', departmentId: '__core_employees__', categoryId: '__core_employees__' })],
  workers: [P('w1', { code: 'WRK-001', name: 'عامل أ', workerType: 'temporary', status: 'active', departmentId: '__core_workers_temp__', categoryId: '__core_workers_temp__' })],
  supervisors: [P('s1', { code: 'SUP-001', name: 'سامي المشرف', status: 'active', departmentId: '__core_supervisors__', categoryId: '__core_supervisors__' })],
  drivers: [P('d1', { code: 'DRV-001', name: 'أحمد السواق', status: 'active', departmentId: '__core_drivers__', categoryId: '__core_drivers__' })],
  leaves: [
    L('l1', { personId: 'e1', employeeId: 'e1', from: '2026-01-05', to: '2026-01-09', days: 5, status: 'approved', reason: 'سفر' }),
    L('l3', { personId: 'e1', employeeId: 'e1', type: 'sick', from: '2026-02-01', to: '2026-02-03', days: 3, status: 'approved' }),
    L('l4', { personId: 'e2', employeeId: 'e2', from: '2020-03-01', to: '2099-03-02', days: 2, status: 'pending', reason: 'ظروف' }),
    L('l5', { personKind: 'worker', personId: 'w1', employeeId: '', from: '2026-04-01', to: '2026-04-03', days: 3, status: 'approved' }),
    L('l6', { personKind: 'supervisor', personId: 's1', employeeId: '', from: '2026-03-01', to: '2026-03-02', days: 2, status: 'approved', type: 'emergency' }),
    L('l7', { personKind: 'driver', personId: 'd1', employeeId: '', from: '2026-03-10', to: '2026-03-01', days: 1, status: 'rejected' }),
    L('l8', { personKind: 'worker', personId: 'w9', employeeId: '', from: '2026-04-01', to: '2026-04-01', days: 1, status: 'approved' }),
  ],
};
const grab = () => {
  const root = document.querySelector('#pageContent .page, app-leaves .page');
  const txt = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
  const t = root.querySelector('table.data-table');
  return {
    cards: [...root.querySelectorAll('.stats-row .stat-card')].map((c) => [txt(c), c.classList.contains('debt')]),
    filters: [...root.querySelectorAll('.filters-bar select, .filters-bar input')].map((x) => [x.id, x.tagName === 'SELECT' ? [...x.options].map((o) => o.textContent.trim()) : x.type]),
    head: [...t.querySelectorAll('thead th')].map(txt),
    rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((td, i, all) => (i === all.length - 1 && all.length > 1 ? [...td.querySelectorAll('button, a')].map((b) => b.className.match(/btn-(ok|no|print|edit|del)-lv/)[1]).join(',') : txt(td)))),
  };
};
const modalOf = () => ({
  // الترتيب الظاهر: CSS order (الجديدة) وبعده ترتيب الـ DOM (القديمة بتحرّك العناصر نفسها — applyFormLayout)، والمخفي برّه
  labels: [...document.querySelectorAll('#appModal .modal-body label')].filter((l) => l.offsetParent !== null && getComputedStyle(l).display !== 'none')
    .map((l, i) => [l, Number(getComputedStyle(l).order) || 0, i]).sort((x, y) => x[1] - y[1] || x[2] - y[2]).map((x) => x[0]).map((l) => { const c = l.cloneNode(true); c.querySelectorAll('input,select,textarea,div').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').replace(/\*/g, '').trim(); }),
  options: Object.fromEntries(['lvKind', 'lvType', 'lvDept'].map((id) => [id, [...document.getElementById(id).options].map((o) => o.textContent.trim())])),
  values: Object.fromEntries(['lvKind', 'lvType', 'lvDays', 'lvFromD', 'lvToD', 'lvReason', 'lvDept'].map((id) => [id, document.getElementById(id).value])),
  person: document.getElementById('lvEmp').value,
});

/** تخطيط نافذة الإجازة المحفوظ زي البيانات الحقيقية (UAT 8.4 V3): خانات تلقائية بترتيب تاني (القسم، والنوع، والفئة، والشخص…)، واسم متغيّر، وخانة مخفية */
const SAVED = {
  _cfAutoFlagsReset: true,
  autoFields: { leaves: [{ key: 'f_lvKind', label: 'الفئة', selector: '#lvKind' }, { key: 'f_lvEmp_text', label: 'الشخص', selector: '#lvEmp_text' }, { key: 'f_lvDays', label: 'عدد الأيام', selector: '#lvDays' },
    { key: 'f_lvFromD', label: 'من تاريخ', selector: '#lvFromD' }, { key: 'f_lvToD', label: 'إلى تاريخ', selector: '#lvToD' }, { key: 'f_lvReason', label: 'السبب', selector: '#lvReason' }] },
  formLayouts: { leaves: [
    { key: 'department', label: 'القسم', type: 'builtin' }, { key: 'type', label: 'نوع الإجازة', type: 'builtin' },
    { key: 'f_lvKind', label: 'فئة الموظف', type: 'builtin', selector: '#lvKind', auto: true }, { key: 'f_lvEmp_text', label: 'الشخص', type: 'builtin', selector: '#lvEmp_text', auto: true, size: 'lg' },
    { key: 'f_lvFromD', label: 'من تاريخ', type: 'builtin', selector: '#lvFromD', auto: true }, { key: 'f_lvToD', label: 'إلى تاريخ', type: 'builtin', selector: '#lvToD', auto: true },
    { key: 'f_lvDays', label: 'عدد الأيام', type: 'builtin', selector: '#lvDays', auto: true, visible: false }, { key: 'f_lvReason', label: 'السبب', type: 'builtin', selector: '#lvReason', auto: true, size: 'lg' },
  ] },
};
/** النافذة بتخطيط محفوظ: نفس الخانات بنفس الترتيب الظاهر والأسماء والإخفاء في الواجهتين */
async function savedLayoutModal() {
  const { browser, page, base: url, errors } = await openWebApp({ ...seed, ...SAVED });
  // القديمة بتفتح النافذة الأول وبتحفظ التخطيط الفعلي (syncAutoFields) — زي البيانات الحقيقية
  await page.evaluate(() => { goToPage('leaves'); openLeaveModal(); }); await page.waitForTimeout(500);
  await page.evaluate(async () => { try { closeModal(); } catch (e) { /* */ } await WebSync.save(DATA); });
  await page.reload(); await page.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && (DATA.leaves || []).length > 0, null, { timeout: 30000 });
  const legacy = [];
  for (const id of [null, 'l6']) {
    await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(300);
    await page.evaluate((id) => { goToPage('leaves'); openLeaveModal(id); }, id); await page.waitForTimeout(500);
    legacy.push(await page.evaluate(modalOf));
  }
  console.log('[النافذة بتخطيط محفوظ] نفس الترتيب والأسماء والإخفاء');
  await page.goto(url + '/app/leaves'); await page.waitForSelector('#lvTable tbody tr'); await page.waitForTimeout(300);
  for (const [i, sel] of ['#btnAddLeave', '.btn-edit-lv[data-id="l6"]'].entries()) {
    await page.click(sel); await page.waitForSelector('#appModal #btnSaveLv'); await page.waitForTimeout(250);
    eq(await page.evaluate(modalOf), legacy[i], `${['طلب جديد', 'تعديل'][i]}: نفس النافذة بالتخطيط المحفوظ`);
    await page.click('#appModal .modal-close'); await page.waitForTimeout(200);
  }
  ok(legacy[0].labels[0] === 'القسم' && legacy[0].labels.includes('فئة الموظف') && !legacy[0].labels.includes('عدد الأيام'), 'التخطيط اتطبّق فعلًا في القديمة (ترتيب، واسم، وإخفاء)', legacy[0].labels);
  eq(errors, [], 'النافذة بتخطيط محفوظ: من غير أخطاء');
  await browser.close();
}

(async () => {
  await savedLayoutModal();
  const { browser, page, base: url, errors } = await openWebApp(seed);
  const legacyAt = async (f) => { await page.evaluate((f) => { goToPage('leaves'); Object.keys(leaveFilters).forEach((k) => { leaveFilters[k] = ''; }); Object.assign(leaveFilters, f); rerenderCurrentPage(); }, f); await page.waitForTimeout(400); return page.evaluate(grab); };
  const VIEWS = [{}, { status: 'approved', personKind: 'employee' }, { q: 'سامي' }];
  const legacy = []; for (const f of VIEWS) legacy.push(await legacyAt(f));
  const legacyModal = [];
  for (const id of [null, 'l1', 'l6']) {
    await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(300);
    await page.evaluate((id) => { goToPage('leaves'); openLeaveModal(id); }, id); await page.waitForTimeout(500);
    legacyModal.push(await page.evaluate(modalOf));
  }
  await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } });

  console.log('[الصفحة] الكروت والفلاتر والجدول بنفس الشكل');
  const goApp = async () => { await page.goto(url + '/app/leaves'); await page.waitForSelector('#lvTable tbody tr'); await page.waitForTimeout(300); };
  await goApp();
  for (const [i, f] of VIEWS.entries()) {
    if (i) {
      await page.fill('#lvSearch', f.q || ''); await page.selectOption('#lvFilterKind', f.personKind || ''); await page.selectOption('#lvFilterStatus', f.status || '');
      const resp = page.waitForResponse((r) => /\/api\/v1\/leaves(\?|$)/.test(r.url()) && r.request().method() === 'GET');
      await page.click('#lvApply'); await resp; await page.waitForTimeout(300);
    }
    const app = await page.evaluate(grab);
    eq(app, legacy[i], `${JSON.stringify(f)}: نفس الكروت والفلاتر والجدول`);
  }

  console.log('[النافذة] نفس الخانات والخيارات والقيم');
  await goApp();
  const NEW = ['#btnAddLeave', '.btn-edit-lv[data-id="l1"]', '.btn-edit-lv[data-id="l6"]'];
  for (const [i, sel] of NEW.entries()) {
    await page.click(sel); await page.waitForSelector('#appModal #btnSaveLv'); await page.waitForTimeout(250);
    eq(await page.evaluate(modalOf), legacyModal[i], `${['طلب جديد', 'تعديل إجازة موظف', 'تعديل إجازة مشرف'][i]}: نفس النافذة`);
    await page.click('#appModal .modal-close'); await page.waitForTimeout(200);
  }

  console.log('[الحفظ من الشاشة الجديدة]');
  const after = async (re, method, fn) => { const [r] = await Promise.all([page.waitForResponse((x) => re.test(x.url()) && x.request().method() === method), fn()]); return r.status(); };
  await page.click('#btnAddLeave'); await page.waitForSelector('#appModal #btnSaveLv');
  await page.selectOption('#lvKind', 'driver'); await page.selectOption('#lvEmp', 'd1');
  await page.fill('#lvFromD', '2020-05-03'); await page.dispatchEvent('#lvFromD', 'change');
  await page.fill('#lvToD', '2099-05-07'); await page.dispatchEvent('#lvToD', 'change');
  ok(Number(await page.inputValue('#lvDays')) > 1000, 'الأيام اتحسبت من التاريخين');
  eq(await after(/\/api\/v1\/leaves$/, 'POST', () => page.click('#btnSaveLv')), 201, 'طلب جديد');
  await page.waitForTimeout(400);
  const newId = await page.evaluate(() => [...document.querySelectorAll('#lvTable tbody tr')].find((tr) => /أحمد السواق/.test(tr.innerText) && /قيد الانتظار/.test(tr.innerText)).getAttribute('data-id'));
  eq(await after(/\/approve$/, 'POST', () => page.click(`.btn-ok-lv[data-id="${newId}"]`)), 200, 'موافقة');
  await page.waitForTimeout(400);
  eq(await after(/\/reject$/, 'POST', () => page.click('.btn-no-lv[data-id="l4"]')), 200, 'رفض');
  await page.waitForTimeout(300);
  await page.click('.btn-del-lv[data-id="l8"]'); await page.waitForSelector('#appConfirmModal #btnConfirmDel');
  eq(await after(/\/api\/v1\/leaves\/l8/, 'DELETE', () => page.click('#btnConfirmDel')), 200, 'حذف بعد التأكيد');
  await page.waitForTimeout(400);
  const rows = await page.evaluate(() => [...document.querySelectorAll('#lvTable tbody tr')].map((tr) => tr.getAttribute('data-id')));
  ok(!rows.includes('l8') && rows.includes(newId), 'الجدول اتحدّث', rows);
  // الحالة فورًا: القديمة بتشوف السواق «في إجازة» من غير ما syncLeaveStatuses تشتغل فيها
  await page.goto(url + '/legacy/'); await page.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && Array.isArray(DATA.drivers) && DATA.drivers.some((x) => x.id === 'd1'), null, { timeout: 30000 });
  eq(await page.evaluate(() => { const d = DATA.drivers.find((x) => x.id === 'd1'); return [d.status, d.leaveAuto]; }), ['on_leave', true], 'السواق «في إجازة» بعد الموافقة من الشاشة الجديدة');
  eq(errors, [], 'من غير أخطاء');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
