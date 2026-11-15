const { openApp } = require('./harness');
const { baseUser, ok, summary } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 9,
    employees: [{ id: 'e1', name: 'أ', code: 'E1', salary: 100, status: 'active', hireDate: '2020-01-01' }, { id: 'e2', name: 'ب', code: 'E2', salary: 100, status: 'active' }],
    equipment: [{ id: 'q1', name: 'مع', code: 'Q1', status: 'working', ownership: 'rented', hourlyCost: 50 }],
    leaves: [{ id: 'l1', employeeId: 'e1', personId: 'e1', personKind: 'employee', type: 'annual', from: '2020-01-01', to: '2099-12-31', status: 'pending', days: 5 },
             { id: 'l2', employeeId: 'e2', personId: 'e2', personKind: 'employee', type: 'annual', from: '2020-01-01', to: '2099-12-31', status: 'approved', days: 5 }] };
  const { browser, page, errors } = await openApp(seed);
  await page.evaluate(() => { employeeFilters._boardLevel = 'list'; employeeFilters.departmentId = ''; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  const labels = await page.evaluate(() => [...document.querySelectorAll('.sc-card .sc-lbl')].map(x => x.innerText.trim()));
  ok(labels[labels.length - 1] === 'إجمالي الرواتب' && /حالة البطاقة/.test(labels[labels.length - 2]), 'salary card last, expired docs before it: ' + labels.join('|'));
  ok(await page.evaluate(() => document.querySelectorAll('.leave-until').length === 1), 'only approved leave shows badge');
  ok(await page.evaluate(() => { const c = [...document.querySelectorAll('.sc-card')].find(x => /نشطون/.test(x.innerText)); return /[1١]\s*في إجازة/.test(c.innerText.replace(/\n/g, ' ')); }), 'active card counts approved leaves only');
  // المعدات
  await page.evaluate(() => { equipmentFilters._boardLevel = 'list'; equipmentFilters.departmentId = ''; goToPage('equipment'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  const eq = await page.evaluate(() => [...document.querySelectorAll('.sc-card .sc-lbl')].map(x => x.innerText.trim()));
  ok(!eq.some(x => /تعمل|إيجار/.test(x)), 'equipment: no working/rented cards: ' + eq.join('|'));
  // إخفاء عمود من الجدول (حتى لو بدون thIf)
  const hid = await page.evaluate(async () => {
    const f = ensureFormLayout('equipment').find(x => x.key === 'model'); f.showInTable = false; rerenderCurrentPage(); await new Promise(r => setTimeout(r, 150));
    const t = document.querySelector('table.data-table'); const th = [...t.querySelectorAll('thead th')].find(x => x.innerText.trim() === 'الموديل');
    const vis = [...t.querySelectorAll('thead th')].filter(x => getComputedStyle(x).display !== 'none').length, vtd = [...t.querySelector('tbody tr').children].filter(x => getComputedStyle(x).display !== 'none').length;
    return th && getComputedStyle(th).display === 'none' && vis === vtd;
  });
  ok(hid, 'column hidden by layout & aligned');
  // العمود الجديد
  ok(await page.evaluate(async () => { ensureFormLayout('equipment').find(x => x.key === 'purchasePrice').showInTable = true; rerenderCurrentPage(); await new Promise(r => setTimeout(r, 150)); return [...document.querySelectorAll('table.data-table thead th')].some(x => x.innerText.trim() === 'سعر الشراء' && getComputedStyle(x).display !== 'none'); }), 'optional equipment column can be shown');
  ok(errors.length === 0, 'no errors ' + errors.join('|'));
  await browser.close(); summary();
})();
