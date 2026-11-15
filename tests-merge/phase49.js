const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const { browser, page, errors } = await openApp({ users:[baseUser], schemaVersion:9,
    projects:[{id:'p1',code:'P1',name:'مشروع أ',customerId:'c1',status:'التنفيذ والمتابعة'}], clients:{customers:[{id:'c1',name:'ع',code:'C1',projects:[],boqs:[],workSurveys:[],collections:[],guarantees:[],invoices:[],contracts:[]}]},
    workers:[{id:'w1',name:'ع',code:'W1',status:'active',type:'company',dailyWage:100}],
    supervisors:[{id:'s1',name:'ش',code:'S1',status:'active',dailyWage:200,contractStatus:'active',idCardExpiry:'2020-01-01'},{id:'s2',name:'ش2',code:'S2',status:'active',dailyWage:300,contractStatus:'expired'}],
    employees:[{id:'e1',name:'م',code:'E1',status:'active',salary:5000,contractStatus:'suspended'}], drivers:[{id:'d1',name:'س',code:'D1',status:'active',dailyWage:150}] });
  const labels = async (fn) => { await page.evaluate(fn); await page.waitForTimeout(700); const r = await page.evaluate(() => [...document.querySelectorAll('#appModal label')].filter(l => !l.parentElement.closest('label') && l.offsetParent!==null).map(l => (l.innerText||'').trim().split('\n')[0])); return r; };
  const close = () => page.evaluate(() => closeModal());
  let a = await labels(() => openEmployeeModal());
  ok(!a.some(x => /الاستقالة/.test(x)) && !(await page.evaluate(() => /تُحدَّد يدوياً|تحدد يدوي/.test(document.getElementById('appModal').innerText))), 'employee form: no resign date, no manual hint'); await close();
  a = await labels(() => openDriverModal());
  ok(!a.some(x => /المشروع|الانضمام/.test(x)) && a.some(x => x === 'تاريخ انتهاء الرخصة') && a.some(x => x === 'حالة التأمين'), 'driver form: ' + a.join('|'));
  const ord = await page.evaluate(() => { const g = ['LicStatus','LicGrade','Address','Notes'].map(k => { const el = document.querySelector('#drv'+k) ; const lab = el && el.closest('label'); return lab ? +lab.style.order||0 : -1; }); return g; });
  ok(ord[1] === ord[0] + 1 || (ord[1] > ord[0] && ord[1] < ord[2]), 'license grade right after license status ' + ord);
  ok(ord[2] < ord[3], 'address above notes ' + ord);
  await close();
  a = await labels(() => openSupervisorModal());
  ok(a.some(x => x === 'حالة التأمين') && !(await page.evaluate(() => /تُحدَّد يدوياً/.test(document.getElementById('appModal').innerText))), 'sup insurance label'); await close();
  // dailies form
  await page.evaluate(() => { goToPage('workerAttendance'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  await page.evaluate(() => { openWorkerAttModal ? openWorkerAttModal() : 0; }).catch(()=>{});
  await page.waitForTimeout(600);
  const dm = await page.evaluate(() => { const p = document.getElementById('wattProject'), s = document.getElementById('wattSite'); return p && s ? [p.tagName, [...p.options].map(o=>o.value).join(',') ] : null; });
  ok(dm && dm[0]==='SELECT' && dm[1]===',مشروع أ', 'dailies: project select + site field ' + JSON.stringify(dm));
  await close();
  // resign picker
  await page.evaluate(() => openResignPicker('worker')); await page.waitForTimeout(400);
  const rs = await page.evaluate(() => { const a = document.getElementById('rsgPerson').closest('label').getBoundingClientRect(), b = document.getElementById('rsgDate').closest('label').getBoundingClientRect(); const n = document.getElementById('rsgNote'); return [Math.abs(a.width-b.width) < 3, Math.abs(a.top-b.top) < 3, n.tagName, n.closest('label').getBoundingClientRect().width > a.width*1.5]; });
  ok(rs[0] && rs[1] && rs[2]==='TEXTAREA' && rs[3], 'resign picker layout ' + rs); await close();
  // cards
  await page.evaluate(() => { supervisorFilters._boardLevel='list'; supervisorFilters.departmentId=''; goToPage('supervisors'); rerenderCurrentPage(); }); await page.waitForTimeout(500);
  const cards = await page.evaluate(() => [...document.querySelectorAll('#pageContent .sc-card')].map(c => c.innerText.replace(/\s+/g,' ').trim()));
  ok(/إجمالي اليوميات/.test(cards[cards.length-1]) && /500|٥٠٠/.test(cards[cards.length-1]) && !cards.some(c => /متوسط اليومية/.test(c)) && cards.some(c => /حالة البطاقة/.test(c)), 'sup cards: ' + cards.join(' | '));
  ok(cards.some(c => /حالة العقد/.test(c) && /ساري/.test(c) && /منتهي/.test(c) && /موقوف/.test(c)), 'contract card on sup');
  for (const [pg, f, id] of [['employees','employeeFilters'], ['workers','workerFilters'], ['drivers','driverFilters']]) {
    await page.evaluate(([pg, f]) => { window[f] ? 0 : 0; eval(f)._boardLevel='list'; eval(f).departmentId=''; goToPage(pg); rerenderCurrentPage(); }, [pg, f]); await page.waitForTimeout(450);
    const c = await page.evaluate(() => [...document.querySelectorAll('#pageContent .sc-card')].map(x => x.innerText.replace(/\s+/g,' ').trim()));
    ok(c.some(x => /حالة العقد/.test(x)) && /إجمالي الرواتب/.test(c[c.length-1]), pg + ' cards: ' + c.join(' | '));
  }
  // add button style
  const st = await page.evaluate(() => { const b = document.getElementById('btnAddDriver') || document.querySelector('#pageContent button[id^=btnAdd]'); const back = getComputedStyle(document.querySelector('.btn-entity-back-boards')||document.querySelector('.btn-outline')); return b ? [getComputedStyle(b).backgroundColor, back.backgroundColor] : null; });
  ok(st && st[0] === st[1], 'HR add buttons same as outline ' + JSON.stringify(st));
  ok(errors.length === 0, 'no errors ' + errors.slice(0,2));
  await browser.close(); summary();
})();
