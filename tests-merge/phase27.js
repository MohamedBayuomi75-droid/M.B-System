// نموذج المعدة + كروت الأقسام + منتقي الشهر/السنة + القوائم المنسدلة الموحدة
const { openApp } = require('./harness');
const { baseUser, ok, summary } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 9, departments: [],
    employees: [{ id: 'e1', name: 'أحمد', code: 'E1', salary: 5000 }],
    workers: [{ id: 'w1', name: 'عامل', code: 'W1', dailyWage: 200, workerType: 'temporary' }],
    equipment: [{ id: 'q1', name: 'حفار', code: 'Q1', status: 'working' }] };
  const { browser, page, errors } = await openApp(seed);
  const has = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
  await page.evaluate(() => openEquipmentModal()); await page.waitForTimeout(300);
  ok(await page.evaluate(() => ['eqProject', 'eqProjSince', 'eqSupervisor', 'eqLocation', 'eqDaily', 'eqFuelPrice', 'eqRentalDaily'].every(id => !document.getElementById(id) && !document.getElementById(id + '_text'))), 'equipment form fields removed');
  ok(!(await has('#eqHourly')), 'hourly cost removed');
  await page.evaluate(() => closeModal());
  await page.evaluate(() => { equipmentFilters.detailId = 'q1'; goToPage('equipment'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('.eq-detail-page').innerText; return !t.includes('لتر وقود') && !t.includes('إجمالي المصاريف') && !document.querySelector('.stats-row.dashboard-stats'); }), 'detail 4 cards removed');
  await page.evaluate(() => { equipmentFilters.detailId = ''; equipmentFilters._boardLevel = 'list'; rerenderCurrentPage(); }); await page.waitForTimeout(300);
  ok(await has('.sc-row .sc-card'), 'equipment section cards');
  for (const [pg, filt, name] of [['employees', 'employeeFilters', 'emp'], ['workers', 'workerFilters', 'wrk'], ['supervisors', 'supervisorFilters', 'sup'], ['drivers', 'driverFilters', 'drv']]) {
    await page.evaluate(([p, f]) => { window[f] = window[f] || {}; try { eval(f)._boardLevel = 'list'; } catch (e) { } goToPage(p); rerenderCurrentPage(); }, [pg, filt]); await page.waitForTimeout(300);
    ok(await has('.sc-row .sc-card'), 'cards on ' + pg);
  }
  await page.evaluate(() => { workerAttFilters.dailiesTab = 'workers'; workerAttFilters.dailiesDept = ''; goToPage('workerAttendance'); rerenderCurrentPage(); }); await page.waitForTimeout(400);
  ok(await has('.sc-row .sc-card'), 'cards on dailies');
  ok(await page.evaluate(() => { const f = document.querySelector('.dly-filters'); const cs = getComputedStyle(f); return cs.borderTopWidth === '0px' && cs.backgroundColor === 'rgba(0, 0, 0, 0)'; }), 'dailies filters not boxed');
  await page.fill('#wattFrom','2024-03-05'); await page.fill('#wattTo','2024-03-20'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => workerAttFilters.dFrom === '2024-03-05' && document.querySelectorAll('.watt-grid thead th').length >= 16 + 2), 'from/to range gives 16 day columns');
  // قائمة منسدلة موحدة
  await page.mouse.move(5, 5);
  const box = await page.evaluate(() => { const r = document.getElementById('wattFilterProject').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.click(box.x, box.y); await page.waitForTimeout(150);
  ok(await has('.cs-drop .cs-item'), 'custom dropdown opens');
  await page.evaluate(() => { const s = document.getElementById('wattFilterProject'); window.__chg = 0; s.addEventListener('change', () => window.__chg++); });
  await page.evaluate(() => { document.querySelector('.cs-drop .cs-item:last-of-type, .cs-drop .cs-item').click(); });
  await page.waitForTimeout(100);
  ok(!(await has('.cs-drop')), 'dropdown closes on pick');
  ok(errors.length === 0, 'no errors ' + errors.join('|'));
  await browser.close(); summary();
})();
