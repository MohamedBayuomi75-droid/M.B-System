const { openApp } = require('./harness'); const { baseUser, ok, summary } = require('./lib');
(async () => {
  const d = new Date().toISOString().slice(0,8);
  const { browser, page, errors } = await openApp({ users:[baseUser], schemaVersion:9,
    workers:[{id:'w1',name:'ع1',code:'W1',status:'active',type:'temporary',workerType:'temporary',dailyWage:200,supervisorId:'s1'},{id:'w2',name:'ع2',code:'W2',status:'active',type:'temporary',workerType:'temporary',dailyWage:300,supervisorId:'s1'}],
    supervisors:[{id:'s1',name:'ش',code:'S1',status:'active',dailyWage:200}],
    workerAttendance:[{id:'a1',personType:'worker',workerId:'w1',personId:'w1',date:d+'05',status:'present',days:1,dayWage:200},{id:'a2',personType:'worker',workerId:'w2',personId:'w2',date:d+'15',status:'present',days:1,dayWage:300}] });
  const open = async fn => { await page.evaluate(fn); await page.waitForTimeout(700); };
  // stale stored layout follows code changes
  const r = await page.evaluate(() => {
    DATA.formLayouts = DATA.formLayouts || {}; DATA.formLayouts.equipment = [
      { key:'code', label:'الكود', type:'builtin', visible:true, size:'md', showInTable:true, selector:'#eqCode' },
      { key:'model', label:'الموديل', type:'builtin', visible:true, size:'md', showInTable:true, selector:'#eqModel' },
      { key:'vehicleLicenseExpiry', label:'انتهاء رخصة السيارة', type:'builtin', visible:true, size:'md', showInTable:true, selector:'#eqVehLicExp' },
      { key:'driverLicenseExpiry', label:'انتهاء رخصة السائق', type:'builtin', visible:true, size:'md', showInTable:true, selector:'#eqDrvLicExp' },
      { key:'driverName', label:'اسم السائق', type:'builtin', visible:true, size:'md', showInTable:true, selector:'#eqDriverName' },
      { key:'color', label:'اللون', type:'builtin', visible:true, size:'md', showInTable:true, selector:'#eqColor' },
      { key:'notes', label:'الملاحظات', type:'builtin', visible:true, size:'lg', showInTable:true, selector:'#eqNotes' } ];
    delete DATA._cfRegKeys;
    const l = ensureFormLayout('equipment'); const k = l.map(x => x.key);
    return { keys:k, lic:(l.find(x => x.key==='vehicleLicenseExpiry')||{}).label, drvSel:(l.find(x => x.key==='driverName')||{}).selector, hasOld: k.indexOf('driverLicenseExpiry') >= 0 };
  });
  ok(r.lic === 'تاريخ انتهاء رخصة السيارة' && !r.hasOld && r.drvSel === '#eqDriver_text', 'stale layout synced ' + JSON.stringify(r));
  ok(r.keys.indexOf('driverName') === r.keys.indexOf('model') + 1, 'order follows code ' + r.keys.join());
  // user-customized label is kept after the sync
  ok(await page.evaluate(() => { const l = ensureFormLayout('equipment'); l.find(x => x.key==='color').label = 'لون المركبة'; const l2 = ensureFormLayout('equipment'); return l2.find(x => x.key==='color').label === 'لون المركبة'; }), 'custom label kept');
  // supervisor statement: only workers who worked in the period
  await open(() => { window.__supStmtShow=''; window.__supStmtFrom=''; window.__supStmtTo=''; window.__supStmtProject=''; window.__supDetailId='s1'; goToPage('supervisors'); rerenderCurrentPage(); });
  const cnt = () => page.evaluate(() => (document.querySelector('#supStmtCards .stat-card .num')||{}).innerText);
  ok((await cnt()).trim() === '2', 'all workers when no period ' + await cnt());
  await page.fill('#supStmtFrom', d+'01'); await page.dispatchEvent('#supStmtFrom','change'); await page.waitForTimeout(500);
  await page.fill('#supStmtTo', d+'10'); await page.dispatchEvent('#supStmtTo','change'); await page.waitForTimeout(700);
  ok((await cnt()).trim() === '1', 'only worked workers in period: ' + await cnt());
  ok(await page.evaluate(() => !/عامل?\s*ع2|ع2/.test(document.getElementById('pageContent').innerText)), 'non-working worker hidden');
  // filter order: show before project
  ok(await page.evaluate(() => { const a = document.getElementById('supStmtShow'), b = document.getElementById('supStmtProject'); return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); }), 'show filter before project');
  // print css: headings glued to tables, totals once
  const css = await page.evaluate(() => { const rules = []; [...document.styleSheets].forEach(ss => { try{ [...ss.cssRules].forEach(r => { if(r.media && /print/.test(r.media.mediaText)) [...r.cssRules].forEach(x => rules.push(x.cssText)); }); }catch(_e){} }); return rules.join('\n'); });
  ok(/print-sheet h4[^{]*\{[^}]*break-after:\s*avoid/.test(css) && /print-sheet tfoot[^{]*\{[^}]*table-row-group/.test(css), 'print css rules');
  // no manual chunking (caused blank pages)
  ok(await page.evaluate(() => { const a = document.getElementById('printArea'); a.innerHTML = '<div class="print-sheet"><table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr><tr><td>2</td></tr></tbody><tfoot><tr><th>t</th></tr></tfoot></table></div>'; paginateTotalsAtEnd(a); const r = !a.querySelector('.stmt-cont,.pg-chunk'); a.innerHTML=''; return r; }), 'no manual chunks');
  ok(errors.length === 0, 'no page errors ' + errors.slice(0,2));
  await browser.close(); summary();
})();
