// شاشة الموظفين (8.3.5، DEC-0125): /app/employees بتعرض نفس صفحة الموظفين القديمة بالظبط — نفس الكروت، ونفس الفلاتر (بالمعرّفات والخيارات)،
// ونفس الجدول (العناوين الظاهرة بالترتيب، وخلايا كل صف) — في الكل، والقسم الأساسي، و**قسم المستقيلين والمعاشات بجدولهم وكروتهم وفلاترهم الخاصة**،
// في وضعين: من غير تخطيط محفوظ، وبتخطيط محفوظ (ترتيب، وإخفاء، وخانة إضافية). والنافذة بنفس الخانات بالترتيب، والحفظ من الشاشة الجديدة.
// نفس السيرفر ونفس البيانات: القديمة بتتفتح الأول وبتحفظ التخطيط الفعلي (syncAutoFields) زي البيانات الحقيقية.
// التشغيل: node tests-web/employees-layout-e2e.js   (محتاج build للسيرفر والواجهة الجديدة + PostgreSQL للاختبار)
'use strict';
const path = require('path');
const { openWebApp } = require(path.join(__dirname, '../tests-merge/harness'));
const { baseUser, eq, ok, summary } = require(path.join(__dirname, '../tests-merge/lib'));

const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
const base = () => ({
  users: [baseUser], schemaVersion: 9,
  settings: { defaultLeaveDays: 21 },
  leaves: [{ id: 'l1', personKind: 'employee', personId: 'e2', status: 'approved', from: '2020-01-01', to: '2099-01-01' }],
  employees: [
    P('e1', { code: 'EMP-001', name: 'أحمد المحاسب', status: 'active', employmentType: 'full', position: 'محاسب', nationalId: '28501011234567', phone: '01001234567', address: 'القاهرة', email: 'a@x.com',
      salary: 8000, hireDate: '2022-01-01', idCardExpiry: '2099-01-01', insuranceStatus: 'insured', insuranceNumber: '111', contractType: 'permanent', contractStatus: 'active', leaveBalance: 21, birthDate: '1985-01-01',
      extraFields: [{ label: 'المقاس', value: 'XL' }] }),
    P('e2', { code: 'EMP-002', name: 'منى السكرتيرة', status: 'active', employmentType: 'part', position: 'سكرتارية', salary: 4000, licenseExpiry: '2020-01-01' }),
    P('e3', { code: 'EMP-003', name: 'حسن مستقيل', status: 'resigned', resignedAt: '2025-06-01', hireDate: '2020-06-01', position: 'مهندس', insuranceStatus: 'insured', insuranceNumber: '333',
      departmentId: '__resigned_employee__', categoryId: '__resigned_employee__', archiveGroup: 'resigned', previousDepartmentId: '__core_employees__' }),
    P('e5', { code: 'EMP-005', name: 'رامي مستقيل قديم', status: 'resigned', resignedAt: '2024-02-10', hireDate: '2023-01-01', position: 'فني', insuranceStatus: 'none', phone: '0122',
      departmentId: '__resigned_employee__', categoryId: '__resigned_employee__', archiveGroup: 'resigned', previousDepartmentId: '__core_employees__' }),
    // UAT 8.3 E5: حالة بكود قديم في قسم المستقيلين ← labelOf («منتهي الخدمة»)
    P('e7', { code: 'EMP-007', name: 'كمال منتهي الخدمة', status: 'terminated', resignedAt: '2024-09-01', departmentId: '__resigned_employee__', categoryId: '__resigned_employee__' }),
    P('e6', { code: 'EMP-006', name: 'سعاد معاش', status: 'retired', retiredAt: '2023-05-01', hireDate: '1990-01-01', departmentId: '__retired_employee__', categoryId: '__retired_employee__' }),
    P('e4', { code: 'EMP-004', name: 'سيد بلا وظيفة', status: 'active', employmentType: 'full' }),
  ],
  customFieldDefs: { employees: [{ id: 'cf1', label: 'المقاس', showInTable: true }] },
});
const SAVED = {
  formLayouts: {
    employees: [
      { key: 'code', label: 'الكود', type: 'builtin' }, { key: 'name', label: 'الاسم', type: 'builtin' }, { key: 'status', label: 'الحالة', type: 'builtin' }, { key: 'phone', label: 'الهاتف', type: 'builtin' },
      { key: 'nationalId', label: 'الرقم القومي', type: 'builtin' }, { key: 'position', label: 'المسمى الوظيفي', type: 'builtin' }, { key: 'department', label: 'القسم', type: 'builtin' },
      { key: 'salary', label: 'الراتب', type: 'builtin' }, { key: 'address', label: 'العنوان', type: 'builtin', showInTable: false, _userHidTable: true }, { key: 'birthDate', label: 'تاريخ الميلاد', type: 'builtin' },
      { key: 'cf1', id: 'cf1', label: 'المقاس', type: 'custom', showInTable: true }, { key: 'notes', label: 'الملاحظات', type: 'builtin' },
    ],
  },
  autoFields: { employees: [{ key: 'f_empEmail', label: 'البريد الإلكتروني', selector: '#empEmail' }] },
};
const DEPTS = ['', '__core_employees__', '__resigned_employee__', '__retired_employee__'];
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
  const root = t.closest('.page') || document;
  const cards = [...root.querySelectorAll('.sc-row .sc-card')].map((c) => (c.innerText || '').replace(/\s+/g, ' ').trim());
  const filters = [...root.querySelectorAll('.filters-bar select, .filters-bar input')].map((x) => [x.id, x.tagName === 'SELECT' ? [...x.options].map((o) => o.textContent.trim()) : x.getAttribute('placeholder')]);
  return { head: keep.map((i) => txt(ths[i])), rows, cards, filters };
};

async function round(label, seed) {
  const { browser, page, base: url, errors } = await openWebApp(seed);
  const legacyAt = async (d) => {
    await page.evaluate((d) => { goToPage('employees'); Object.keys(employeeFilters).forEach((k) => { employeeFilters[k] = ''; }); employeeFilters._boardLevel = 'list'; employeeFilters.departmentId = d; rerenderCurrentPage(); }, d);
    await page.waitForTimeout(600);
    return page.evaluate(grab, '#pageContent table.data-table');
  };
  for (const d of DEPTS) await legacyAt(d);
  await page.evaluate(async () => { await WebSync.save(DATA); });
  await page.reload(); await page.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && DATA.employees.length === 7, null, { timeout: 30000 });
  console.log(`[${label}] الكروت والفلاتر والجدول بنفس الشكل في الواجهتين`);
  const legacyAll = [];
  for (const d of DEPTS) legacyAll.push(await legacyAt(d));
  const out = {};
  for (const [vi, d] of DEPTS.entries()) {
    const legacy = legacyAll[vi];
    await page.goto(url + '/app/employees'); await page.waitForSelector('#pplBoards .entity-dept-board');
    const resp = page.waitForResponse((r) => /\/api\/v1\/employees(\?|$)/.test(r.url()) && r.request().method() === 'GET');
    await page.click(`#pplBoards .entity-dept-board[data-dept="${d}"]`); await resp; await page.waitForSelector('#pplTable tbody tr[data-id]'); await page.waitForTimeout(300);
    const app = await page.evaluate(grab, '#pplTable');
    const tag = `employees${d ? ' ' + d : ''}`;
    eq(app.cards, legacy.cards, `${tag}: الكروت`);
    eq(app.filters, legacy.filters, `${tag}: الفلاتر (المعرّفات والخيارات)`);
    eq(app.head, legacy.head, `${tag}: العناوين الظاهرة بنفس الترتيب`);
    for (const id of Object.keys(legacy.rows)) legacy.rows[id].forEach((v, i) => { const g = (app.rows[id] || [])[i]; if (g !== v) console.log('   ≠', tag, id, i, legacy.head[i], JSON.stringify(g), JSON.stringify(v)); });
    eq(app.rows, legacy.rows, `${tag}: خلايا كل صف`);
    out[tag] = legacy.head;
  }
  eq(errors, [], `${label}: من غير أخطاء`);
  await browser.close();
  return out;
}

/** النافذة: نفس الخانات بنفس الترتيب الظاهر، والحفظ من الشاشة الجديدة (المقارنة الحرفية بالقديمة في phase78) */
async function modals(seed = base()) {
  const { browser, page, base: url, errors } = await openWebApp(seed);
  const labels = (root) => page.evaluate((r) => [...document.querySelectorAll(r + ' .modal-body label')].filter((l) => l.offsetParent !== null && getComputedStyle(l).display !== 'none').map((l, i) => [l, Number(getComputedStyle(l).order) || 0, i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map((x) => x[0])
    .map((l) => { const c = l.cloneNode(true); c.querySelectorAll('input,select,textarea,small,button').forEach((n) => n.remove()); return (c.textContent || '').replace(/\s+/g, ' ').replace(/\*/g, '').trim(); }).filter((x) => x && !/^(المرفقات|إرفاق|رفع مرفق)/.test(x)), root);
  const values = (root) => page.evaluate((r) => Object.fromEntries([...document.querySelectorAll(r + ' .modal-body [id^="emp"]')].filter((x) => /^(INPUT|SELECT|TEXTAREA)$/.test(x.tagName)).map((x) => [x.id, x.value])), root);
  const legacy = [];
  for (const id of [null, 'e1', 'e3']) {
    await page.evaluate(() => { try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(300);
    await page.evaluate((id) => { goToPage('employees'); openEmployeeModal(id); }, id); await page.waitForTimeout(500);
    legacy.push({ labels: await labels('#appModal'), values: await values('#appModal'),
      opts: await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#appModal .modal-body select[id^="emp"]')].map((x) => [x.id, [...x.options].map((o) => o.textContent.trim())]))) });
  }
  console.log('[النافذة] نفس الخانات بالترتيب ونفس القيم الافتراضية');
  const openNew = async (dept, how) => {
    await page.goto(url + '/app/employees'); await page.waitForSelector('#pplBoards .entity-dept-board');
    const resp = page.waitForResponse((r) => /\/api\/v1\/employees(\?|$)/.test(r.url()) && r.request().method() === 'GET');
    await page.click(`#pplBoards .entity-dept-board[data-dept="${dept}"]`); await resp; await page.waitForTimeout(200);
    await page.click(how); await page.waitForSelector('#appModal .modal-footer .btn-primary'); await page.waitForTimeout(250);
  };
  const NEW = [['', '#btnAddEmployee'], ['', '.btn-edit-emp[data-id="e1"]'], ['__resigned_employee__', '.btn-edit-emp[data-id="e3"]']];
  const names = ['موظف جديد', 'تعديل موظف', 'تعديل موظف مستقيل'];
  const skipVal = new Set(['empDept']); // القسم (من الوظيفة): للعرض بس
  for (const [i, [d, how]] of NEW.entries()) {
    await openNew(d, how);
    eq(await labels('#appModal'), legacy[i].labels, `${names[i]}: نفس الخانات بالترتيب`);
    const got = await values('#appModal');
    const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
    const want = sorted(Object.fromEntries(Object.entries(legacy[i].values).filter(([k]) => !skipVal.has(k))));
    eq(sorted(Object.fromEntries(Object.entries(got).filter(([k]) => !skipVal.has(k)))), want, `${names[i]}: نفس القيم في الخانات`);
    const opts = (r) => page.evaluate((r) => Object.fromEntries([...document.querySelectorAll(r + ' .modal-body select[id^="emp"]')].map((x) => [x.id, [...x.options].map((o) => o.textContent.trim())])), r);
    eq(sorted(await opts('#appModal')), sorted(legacy[i].opts), `${names[i]}: نفس الخيارات في القوايم بالترتيب`);
  }

  console.log('[الحفظ من الشاشة الجديدة]');
  // جسم الرد ممكن يختفي لو الصفحة حدّثت نفسها بعد الحفظ (CI 119: «No data found for resource») ← نقرا السجل من السيرفر بنفس التوثيق
  const bodyOf = async (r) => { try { return await r.json(); } catch (e) {
    const auth = r.request().headers()['authorization']; const own = r.request().method() === 'POST' ? null : r.url();
    if (!own) throw e;
    return page.evaluate(async ([u, a]) => (await fetch(u, { headers: { Authorization: a, Accept: 'application/json' } })).json(), [own, auth]);
  } };
  const lastSaved = async (method) => { const r = await page.waitForResponse((x) => /\/api\/v1\/employees(\/[^/?]+)?$/.test(x.url()) && x.request().method() === method); return [r.status(), await bodyOf(r)]; };
  await openNew('', '#btnAddEmployee');
  eq(await page.inputValue('#empLeaveBal'), '21', 'رصيد الإجازة الافتراضي من الإعدادات');
  ok(!(await page.$('#empResignDate')), 'مفيش خانة تاريخ استقالة (زي القديمة)');
  await page.fill('#empName', 'موظف الواجهة'); await page.fill('#empPos', 'مشتريات'); await page.fill('#empSalary', '6500.555'); await page.fill('#empEmail', ' n@x.com '); await page.fill('#empLeaveBal', '15');
  let [st, b] = await Promise.all([lastSaved('POST'), page.click('#btnSaveEmp')]).then((x) => x[0]);
  eq([st, b.code, b.employmentType, b.salary, b.email, b.leaveBalance, b.position, b.departmentId], [201, 'EMP-008', 'full', 6500.56, 'n@x.com', 15, 'مشتريات', '__core_employees__'], 'إضافة موظف (القسم الأساسي — DEC-0126، و«full» افتراضي)');
  await page.waitForSelector('.btn-edit-emp[data-id="e4"]'); await page.click('.btn-edit-emp[data-id="e4"]'); await page.waitForSelector('#empStatus');
  await page.selectOption('#empStatus', 'resigned');
  [st, b] = await Promise.all([lastSaved('PATCH'), page.click('#btnSaveEmp')]).then((x) => x[0]);
  ok(st === 200 && b.status === 'resigned' && /^\d{4}-\d{2}-\d{2}$/.test(b.resignedAt) && b.departmentId === '__resigned_employee__', 'الاستقالة: النهارده وقسم المستقيلين', [st, b.status, b.resignedAt, b.departmentId]);
  await openNew('', '#btnAddEmployee'); await page.fill('#empName', 'أحمد المحاسب'); await page.click('#btnSaveEmp');
  await page.waitForSelector('#appSubModal #btnDupForce');
  eq(await page.$eval('#appSubModal h3', (h) => h.textContent.trim()), '⚠️ يوجد سجلات متشابهة', 'منع التكرار: نافذة التشابه');
  eq(errors, [], 'النافذة: من غير أخطاء');
  await browser.close();
}

(async () => {
  await modals();
  await round('الافتراضي', base());
  const saved = await round('تخطيط محفوظ', { ...base(), ...SAVED });
  // (الاسم المتغيّر «المسمى الوظيفي» مابيطبّقش على عمود «الوظيفة» في القديمة كمان — والشاشتين متطابقين)
  ok(!saved.employees.includes('العنوان') && saved.employees.includes('المقاس') && saved.employees[2] === 'الرقم القومي', 'التخطيط اتطبّق: عمود مخفي، وخانة إضافية، وترتيب', saved.employees);
  ok(saved['employees __resigned_employee__'].includes('العنوان'), 'قسم المستقيلين من غير تخطيط (زي القديمة)', saved['employees __resigned_employee__']);
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
