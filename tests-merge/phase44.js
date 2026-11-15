const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const seed = { users:[baseUser], schemaVersion:9,
    employees:[{id:'e1',name:'م',code:'E1',status:'active',position:'مهندس'},{id:'e2',name:'ن',code:'E2',status:'active'}],
    drivers:[{id:'d1',name:'س',code:'D1',status:'active',phone:'010'}],
    equipment:[{id:'q1',name:'معدة1',code:'Q1',status:'working',licenseCategory:'ملاكى'},{id:'q2',name:'معدة2',code:'Q2',status:'working'}] };
  const { browser, page } = await openApp(seed);
  const names = await page.evaluate(() => { ensureAllResignedDepartments(); return departmentsForKind('employees').map(d => d.name); });
  ok(!names.some(n => /المهندسين/.test(n)), 'no job departments created: ' + names);
  await page.evaluate(() => { employeeFilters._boardLevel='boards'; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(400);
  const order = await page.evaluate(() => [...document.querySelectorAll('.entity-dept-board')].map(x => x.querySelector('.lbl').textContent.trim() + ':' + x.querySelector('.num').textContent.trim()));
  ok(order[0].startsWith('الكل') && order[1] === 'بدون قسم أو وظيفة:1', 'employee boards order/none label: ' + order);
  await page.evaluate(() => { equipmentFilters._boardLevel='boards'; goToPage('equipment'); rerenderCurrentPage(); }); await page.waitForTimeout(400);
  const eo = await page.evaluate(() => [...document.querySelectorAll('.entity-dept-board')].map(x => x.querySelector('.lbl').textContent.trim() + ':' + x.querySelector('.num').textContent.trim()));
  ok(eo[0].startsWith('الكل') && /^بدون قسم/.test(eo[1]) && eo[1].endsWith(':1'), 'equipment none board counts no license type: ' + eo);
  await page.evaluate(() => openEmployeeModal()); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.getElementById('empStatus').value === '' && document.getElementById('empType').value === '' && document.getElementById('empDept').readOnly), 'employee form: no auto-selected status/type; dept read-only');
  await page.evaluate(() => { const i = document.getElementById('empPos'); i.value = 'محاسب'; i.dispatchEvent(new Event('input', { bubbles:true })); });
  ok(await page.evaluate(() => document.getElementById('empDept').value === 'محاسب'), 'dept field mirrors job');
  await page.evaluate(() => closeModal()); await page.waitForTimeout(200);
  await page.evaluate(() => openEquipmentModal()); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.getElementById('eqStatus').value === '' && document.getElementById('eqOwnership').value === ''), 'equipment form: no auto status/ownership');
  await page.evaluate(() => closeModal()); await page.waitForTimeout(200);
  // table layout applied before first paint (microtask)
  await page.evaluate(() => { ensureFormLayout('drivers').forEach(f => { if (f.key === 'phone') f.showInTable = false; }); });
  const hidden = await page.evaluate(async () => { driverFilters._boardLevel='list'; driverFilters.departmentId=''; goToPage('drivers'); rerenderCurrentPage(); await Promise.resolve(); const ths = [...document.querySelectorAll('#pageContent table thead th')].filter(h => h.textContent.trim() === 'رقم التليفون'); return ths.length === 0 || ths.every(h => h.style.display === 'none'); });
  ok(hidden, 'hidden column is hidden already in first microtask (no flash)');
  await browser.close(); summary();
})();
