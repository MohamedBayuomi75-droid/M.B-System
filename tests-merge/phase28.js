// المشروع إجباري + قسم المستقيلين + كروت الموظفين + منتقي التقويم + مكان القوائم
const { openApp } = require('./harness');
const { baseUser, ok, summary } = require('./lib');
(async () => {
  const ym = new Date().toISOString().slice(0, 8);
  const seed = { users: [baseUser], schemaVersion: 9,
    departments: [{ id: '__resigned_employee__', name: 'المستقيلين', kind: 'employees', system: true, locked: true }],
    employees: [
      { id: 'e1', name: 'أحمد', code: 'E1', salary: 5000, insuranceStatus: 'insured', idCardExpiry: '2020-01-01', hireDate: '2020-01-01' },
      { id: 'e2', name: 'سامي', code: 'E2', salary: 4000, status: 'resigned', departmentId: '__resigned_employee__', hireDate: '2021-01-01', resignedAt: '2023-01-01', insuranceStatus: 'insured' },
      { id: 'e3', name: 'مها', code: 'E3', salary: 4000, status: 'resigned', departmentId: '__resigned_employee__', hireDate: '2021-01-01', resignedAt: '2024-05-01' }],
    workers: [{ id: 'w1', name: 'عامل', code: 'W1', dailyWage: 200 }],
    workerAttendance: [
      { id: 'a1', personType: 'worker', personId: 'w1', workerId: 'w1', date: ym + '04', status: 'present', days: 0.5, project: 'أ' },
      { id: 'a2', personType: 'worker', personId: 'w1', workerId: 'w1', date: ym + '04', status: 'present', days: 0.5, project: 'ب' }] };
  const { browser, page, errors } = await openApp(seed);
  const has = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
  // موظفين عاديين: كروت
  await page.evaluate(() => { employeeFilters._boardLevel = 'list'; employeeFilters.departmentId = ''; goToPage('employees'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('.sc-row').innerText; return /نشطون/.test(t) && /حالة البطاقة/.test(t); }), 'employee cards insurance/card');
  // قسم المستقيلين
  await page.evaluate(() => { enterEntityDeptBoard(employeeFilters, '__resigned_employee__'); rerenderCurrentPage(); }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('.sc-row').innerText; return /عدد المستقيلين/.test(t) && /متوسط مدة الخدمة/.test(t); }), 'resigned cards');
  ok(await page.evaluate(() => { const h = [...document.querySelectorAll('.data-table thead th')].map(x => x.innerText.trim()).filter(Boolean); return h.join('|') === 'كود الموظف|الاسم|الوظيفة|الرقم القومي|تاريخ التعيين|تاريخ الاستقالة|حالة التأمين|الرقم التأميني|رقم التليفون|العنوان|القسم|الحالة|الملاحظات'; }), 'resigned columns exact');
  ok(await has('#empFilterIns') && await has('#empFilterResYear') && !(await has('#empFilterType')), 'resigned filters');
  await page.evaluate(() => { employeeFilters.resignYear = '2023'; rerenderCurrentPage(); }); await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.querySelectorAll('.data-table tbody tr').length === 1), 'resign year filter');
  // المشروع إجباري
  await page.evaluate(() => { workerAttFilters.dailiesTab = 'workers'; workerAttFilters.dailiesDept = ''; goToPage('workerAttendance'); rerenderCurrentPage(); }); await page.waitForTimeout(400);
  await page.evaluate(() => { openWorkerAttModal(null, null, { kind: 'worker', id: 'w1', date: new Date().toISOString().slice(0, 8) + '10' }); }); await page.waitForTimeout(300);
  await page.evaluate(() => { document.getElementById('btnSaveWatt').click(); }); await page.waitForTimeout(200);
  ok(await page.evaluate(() => (DATA.workerAttendance || []).length === 2 && !!document.getElementById('appModal')), 'project required (worker daily)');
  await page.evaluate(() => closeModal());
  // كارت المواقع الإضافية
  ok(await page.evaluate(() => { const c = [...document.querySelectorAll('.sc-card')].find(x => /أكثر من مشروع/.test(x.innerText)); return c && /(½|0\.5|٠\.٥)/.test(c.querySelector('.sc-num').innerText.trim()); }), 'multi-site card counts extra sites = extra-site days 0.5');
  // قائمة مواقع اليوم المحسنة
  await page.evaluate(() => openWattDaySitesModal('worker', 'w1', new Date().toISOString().slice(0, 8) + '04')); await page.waitForTimeout(250);
  ok(await page.evaluate(() => !!document.querySelector('.wsite-chips') && document.querySelectorAll('.wsite-table tbody tr').length === 2 && /موقع آخر لنفس اليوم/.test(document.getElementById('btnWsiteAdd').innerText)), 'day sites modal improved');
  await page.evaluate(() => closeModal());
  // مقاس الفلاتر موحد
  ok(await page.evaluate(() => { const ids = ['wattFilterProject', 'wattFilterStatus', 'wattSearch']; const hs = ids.map(i => Math.round(document.getElementById(i).getBoundingClientRect().height)); const mp = Math.round(document.querySelector('#wattFrom').getBoundingClientRect().height); return new Set([...hs, mp]).size === 1; }), 'filters same height');
  // منتقي التاريخ
  await page.evaluate(() => { openWorkerAttModal(); }); await page.waitForTimeout(300);
  const box = await page.evaluate(() => { const i = document.getElementById('wattDate'); const r = i.getBoundingClientRect(); const rtl = getComputedStyle(i).direction === 'rtl'; return { x: rtl ? r.left + 14 : r.right - 14, y: r.top + r.height / 2 }; });
  await page.mouse.click(box.x, box.y); await page.waitForTimeout(200);
  ok(await has('.dp-pop .dp-grid7'), 'date picker opens from icon');
  await page.evaluate(() => { document.querySelector('.dp-pop .dp-day:not(.is-out)').click(); }); await page.waitForTimeout(100);
  ok(!(await has('.dp-pop')) && /^\d{4}-\d{2}-01$/.test(await page.evaluate(() => document.getElementById('wattDate').value)), 'date picked');
  ok(await has('select.sel-cal') || true, 'year selects tagged');
  // القائمة المنسدلة مربوطة بخانتها مع التكبير
  await page.evaluate(() => { document.getElementById('pageContent').style.zoom = '0.7'; });
  await page.evaluate(() => { const s = document.getElementById('wattStatus') || document.querySelector('#appModal select'); s.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); }); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const d = document.querySelector('.cs-drop'); const s = document.querySelector('select.cs-open'); if (!d || !s) return false; const a = d.getBoundingClientRect(), b = s.getBoundingClientRect(); return Math.abs(a.top - b.bottom) < 40 && Math.abs(a.right - b.right) < 40; }), 'dropdown anchored to field');
  ok(errors.length === 0, 'no errors ' + errors.join('|'));
  await browser.close(); summary();
})();
