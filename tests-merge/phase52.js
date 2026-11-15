const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const { browser, page, errors } = await openApp({ users:[baseUser], schemaVersion:9,
    employees:[{id:'e1',name:'م',code:'E1',status:'active',salary:5}],
    drivers:[{id:'d1',name:'سائق ١',code:'D1',status:'active',salary:6000,licenseExpiry:'2030-01-01'}],
    equipment:[{id:'q1',code:'EQ-1',typeLabel:'حفار',status:'working'}] });
  const open = async fn => { await page.evaluate(fn); await page.waitForTimeout(700); };
  const close = async () => { await page.evaluate(() => closeModal()); await page.waitForTimeout(500); };
  // notes width even with a narrow custom layout
  await open(() => { const l = ensureFormLayout('employees'); l.forEach(f => { if(f.key==='notes'){ f.width = 25; } }); DATA.formLayouts.employees = l; openEmployeeModal(); });
  ok(await page.evaluate(() => { const t = document.getElementById('empNotes'); const g = document.querySelector('#appModal .form-grid'); return t.getBoundingClientRect().width >= g.getBoundingClientRect().width - 4; }), 'notes full width despite layout width'); await close();
  // stale label cleanup
  ok(await page.evaluate(() => { const l = ensureFormLayout('employees'); const f = l.find(x => x.key==='insuranceStatus'); f.label = 'حالة التأمين (تحدد يدويا)'; DATA.formLayouts.employees = l; return true; }), 'seed stale label');
  await open(() => openEmployeeModal());
  ok(await page.evaluate(() => ![...document.querySelectorAll('#appModal label')].some(l => /تحدد يدو/.test(l.innerText))), 'no manual hint in label'); await close();
  // equipment form
  await open(() => openEquipmentModal());
  const h = await page.evaluate(() => document.querySelector('#appModal .modal-header h3').innerText.trim());
  ok(h === 'إضافة مركبة', 'title ' + h);
  const ord = await page.evaluate(() => [...document.querySelectorAll('#appModal label')].filter(l => !l.parentElement.closest('label') && l.offsetParent!==null).map(l => [+(l.style.order||500), (l.innerText||'').trim().split('\n')[0]]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]));
  const ix = t => ord.findIndex(x => x.indexOf(t) === 0);
  ok(ix('اسم السائق') === ix('الموديل') + 1 && ix('سعر الشراء') === ix('اسم السائق') + 1, 'driver after model, price after driver: ' + ord.join('|'));
  ok(ix('تكلفة الساعة') < 0 && ix('انتهاء رخصة السائق') < 0 && ix('تاريخ انتهاء رخصة السيارة') > -1, 'removed fields / renamed: ' + ord.join('|'));
  await page.fill('#eqCarType', 'سيارة'); await page.evaluate(() => document.getElementById('eqDriver_text').focus()); await page.waitForTimeout(300);
  await page.click('.entity-combo-drop .entity-combo-item >> nth=0'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.getElementById('eqDriver').value === 'd1'), 'driver picked from drivers page');
  await page.click('#btnSaveEq'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => { const e = DATA.equipment.find(x => x.driverId === 'd1'); return !!e && e.driverName === 'سائق ١' && e.driverLicenseExpiry === '2030-01-01'; }), 'driver saved');
  // core dept
  ok(await page.evaluate(() => { const c = CORE_DEPTS.equipment; return c[0].name === 'المعدات' && c[1].name === 'السيارات الملاكى'; }), 'machinery dept first');
  ok(await page.evaluate(() => !!(DATA.departments||[]).find(d => d.id === '__core_eq_machinery__')), 'machinery dept created');
  // temp table has no project-since col
  await open(() => { workerFilters._boardLevel='list'; workerFilters.departmentId='__core_workers_temp__'; goToPage('workers'); rerenderCurrentPage(); });
  ok(await page.evaluate(() => ![...document.querySelectorAll('#pageContent table thead th')].some(t => /الانضمام|الربط/.test(t.innerText))), 'no join-project col');
  ok(errors.length === 0, 'no page errors ' + errors.slice(0,2));
  await browser.close(); summary();
})();
