const { openApp } = require('./harness');
const { baseUser, ok, summary } = require('./lib');
(async () => {
  const t = new Date(); const iso = d => d.toISOString().slice(0, 10);
  const plus = n => { const d = new Date(t); d.setDate(d.getDate() + n); return iso(d); };
  const y = n => (t.getFullYear() - n) + '-01-15';
  const seed = { users: [baseUser], schemaVersion: 9,
    employees: [
      { id: 'e1', name: 'مسن', code: 'E1', salary: 100, status: 'active', birthDate: y(61) },
      { id: 'e2', name: 'شاب', code: 'E2', salary: 100, status: 'active', birthDate: y(30) },
      { id: 'e3', name: 'مجاز', code: 'E3', salary: 100, status: 'active' },
      { id: 'e4', name: 'عاد', code: 'E4', salary: 100, status: 'on_leave', leaveAuto: true }],
    leaves: [
      { id: 'l1', employeeId: 'e3', personId: 'e3', personKind: 'employee', status: 'approved', type: 'annual', from: plus(-1), to: plus(3) },
      { id: 'l2', employeeId: 'e4', personId: 'e4', personKind: 'employee', status: 'approved', type: 'annual', from: plus(-10), to: plus(-5) }] };
  const { browser, page, errors } = await openApp(seed);
  await page.evaluate(() => { employeeFilters._boardLevel = 'list'; employeeFilters.departmentId = ''; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  const st = id => page.evaluate(i => DATA.employees.find(e => e.id === i).status, id);
  ok(await st('e3') === 'on_leave', 'leave in progress => on_leave');
  ok(await st('e4') === 'active', 'leave ended => active again');
  ok(await page.evaluate(() => personAge(DATA.employees[0]) >= 60 && retirementDue('employee').length === 1), 'retirement due detected (60+)');
  ok(await page.evaluate(() => !!document.querySelector('.ret-banner')), 'banner shown');
  ok(await page.evaluate(() => /حالة البطاقة/.test(document.querySelector('.sc-row').innerText)), 'card status card');
  // قرار: تجديد
  await page.evaluate(() => openRetirementModal('employee')); await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('.ret-renew').click()); await page.waitForTimeout(400);
  ok(await page.evaluate(() => retirementDue('employee').length === 0 && !!DATA.employees[0].retireDeferredUntil), 'renew defers alert');
  // قرار: إحالة
  await page.evaluate(() => { delete DATA.employees[0].retireDeferredUntil; openRetirementModal('employee'); }); await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('.ret-retire').click()); await page.waitForTimeout(400);
  await page.evaluate(() => { const b = document.querySelector('#appDlgOk'); if (b) b.click(); }); await page.waitForTimeout(500);
  ok(await page.evaluate(() => { const e = DATA.employees[0]; return e.status === 'retired' && isRetiredDeptId(e.departmentId); }), 'retired moved to المعاشات dept');
  // صفحة الشخص
  await page.evaluate(() => { openPersonDetailPage('employee', 'e2'); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => /تاريخ الميلاد/.test(document.body.innerText) && /30 سنة/.test(document.body.innerText)), 'person detail shows birth+age');
  ok(await page.evaluate(() => /حالة التأمين/.test(document.body.innerText) && /حالة البطاقة/.test(document.body.innerText)), 'person detail shows insurance/card status');
  // المعاينة
  await page.evaluate(() => { goToPage('settings'); });
  await page.waitForTimeout(300);
  ok(errors.length === 0, 'no errors ' + errors.join('|'));
  await browser.close(); summary();
})();
