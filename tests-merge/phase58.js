const { openApp } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 9,
    projects: [{ id: 'pA', code: 'P1', name: 'م', customerId: 'cA', status: 'الدراسة والتخطيط', value: 10000 }],
    supervisors: [{ id: 's1', name: 'مشرف أ', code: 'S1' }],
    employees: [{ id: 'e1', name: 'م. سامي', position: 'مهندس موقع' }, { id: 'e2', name: 'محاسب علي', position: 'محاسب' }],
    clients: { customers: [{ id: 'cA', name: 'ع', code: 'C', projects: [], contracts: [], invoices: [], boqs: [], workSurveys: [], collections: [] }] } };
  const { browser, page, errors } = await openApp(seed);
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { goToPage('projects'); projectFilters.detailId = 'pA'; rerenderCurrentPage(); });
  await page.waitForTimeout(300);
  console.log('[1] start button only on first step of stage');
  eq(await ev(() => document.querySelectorAll('.ppt2-step [data-act="start"]').length), 0, 'current first step: no start (already current)');
  await ev(() => { __pwViewStage['pA'] = 'docs'; rerenderCurrentPage(); });
  await page.waitForTimeout(300);
  eq(await ev(() => document.querySelectorAll('.ppt2-step [data-act="start"]').length), 1, 'one start in docs stage');
  eq(await ev(() => document.querySelector('.ppt2-step [data-act="start"]').closest('.ppt2-step').getAttribute('data-step')), 'initial_insurance', 'on first step');
  console.log('[2] responsible combo: supervisors + engineers only');
  await ev(() => { const p = DATA.projects[0]; openStepModal(p, pwCurrent(p).stepKey); });
  await page.waitForTimeout(500);
  const names = await ev(() => listEntitiesForKind('respPerson').map(x => x.name));
  eq(names.sort(), ['م. سامي', 'مشرف أ'].sort(), 'only supervisors and engineers: ' + names);
  await ev(() => { const h = document.getElementById('pwRespId'); h.value = 'e1'; document.getElementById('pwSave').click(); });
  await page.waitForTimeout(400);
  eq(await ev(() => Object.values(DATA.projects[0].stepMeta).map(m => m.responsible).filter(Boolean)), ['م. سامي'], 'responsible saved by name');
  console.log('[3] statement: no summary, order, profit table');
  await ev(() => { rerenderCurrentPage(); });
  await page.waitForTimeout(300);
  const t = await ev(() => document.querySelector('.page').innerText);
  ok(!t.includes('ملخص التكلفة'), 'no cost summary');
  const i1 = t.indexOf('جدول مهندسي المشروع'), i2 = t.indexOf('جدول مشرفي المشروع'), i3 = t.indexOf('جدول العمالة'), i4 = t.indexOf('جدول ربحية المشروع');
  ok(i1 > 0 && i1 < i2 && i2 < i3 && i3 < i4, 'order eng<sup<labor<profit: ' + [i1, i2, i3, i4]);
  ok(t.includes('خسارة') || t.includes('رابح'), 'profit verdict shown');
  ok(t.lastIndexOf('جدول ربحية المشروع') > t.lastIndexOf('دفتر حركات المشروع'), 'profit table is last');
  eq(errors.length, 0, 'no page errors: ' + errors.join('|'));
  await browser.close(); summary();
})();
