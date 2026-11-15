const { openApp } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 9, projects: [
    { id: 'pA', code: 'PRJ-1', name: 'مشروع أ', customerId: 'cA', customerName: 'شركة الأمل', status: 'الدراسة والتخطيط', value: 1000, budget: 5000 },
    { id: 'pB', code: 'PRJ-2', name: 'مشروع ب', customerId: 'cB', customerName: 'شركة النور', status: 'الدراسة والتخطيط', value: 2000 },
    { id: 'pC', code: 'PRJ-3', name: 'مشروع ج', customerId: 'cA', customerName: 'شركة الأمل', status: 'التنفيذ والمتابعة', value: 4000 }
  ], clients: { customers: [
    { id: 'cA', name: 'شركة الأمل', code: 'CUS-1', projects: [], contracts: [], invoices: [], boqs: [], workSurveys: [], collections: [] },
    { id: 'cB', name: 'شركة النور', code: 'CUS-2', projects: [], contracts: [], invoices: [], boqs: [], workSurveys: [], collections: [] }] } };
  const { browser, page, errors } = await openApp(seed);
  let ok2; const ev = (f, a) => page.evaluate(f, a);
  console.log('[1] list: no compact path, الكل has stage filter');
  await ev(() => { goToPage('projects'); boardsOpen('projects', ''); });
  await page.waitForTimeout(300);
  eq(await ev(() => document.querySelectorAll('.ppt-wrap, .stage-row').length), 0, 'no path in list');
  ok(await ev(() => !!document.getElementById('projStatus')), 'stage filter in الكل');
  ok(await ev(() => !document.getElementById('projCustomer')), 'no customer filter in الكل');
  await ev(() => { const s = document.getElementById('projStatus'); s.value = 'التنفيذ والمتابعة'; s.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(250);
  ok(await ev(() => !!document.getElementById('projStatus')), 'stage select stays after choosing');
  eq(await ev(() => document.querySelectorAll('.btn-view-proj').length), 1, 'filter by stage works');

  console.log('[2] stage section: customer filter, section-only rows & cards');
  await ev(() => { boardsBack('projects'); boardsOpen('projects', 'الدراسة والتخطيط'); });
  await page.waitForTimeout(300);
  ok(await ev(() => !document.getElementById('projStatus')), 'no stage filter in section');
  ok(await ev(() => !!document.getElementById('projCustomer')), 'customer filter in section');
  eq(await ev(() => document.querySelectorAll('.btn-view-proj').length), 2, 'section rows = 2');
  const cards = await ev(() => document.querySelector('.stats-row').innerText);
  ok(cards.includes('3,000') || cards.includes('3000') || cards.includes('٣'), 'section value card = 3000: ' + cards.replace(/\s+/g, ' '));
  ok(!cards.includes('كل المشاريع') && !cards.includes('نتيجة البحث'), 'no global/search card');
  ok(cards.indexOf('عدد العملاء') < cards.indexOf('التكلفة') && cards.indexOf('التكلفة') < cards.indexOf('إجمالي قيم'), 'card order');
  await ev(() => { const s = document.getElementById('projCustomer'); s.value = 'cA'; s.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(250);
  eq(await ev(() => document.querySelectorAll('.btn-view-proj').length), 1, 'customer filter works');

  console.log('[3] statement tables / presets');
  await ev(() => { projectFilters.detailId = 'pA'; rerenderCurrentPage(); });
  await page.waitForTimeout(300);
  const body = await ev(() => document.querySelector('.page').innerText);
  for(const t of ['جدول العمالة','جدول مشرفي المشروع','جدول مهندسي المشروع','جدول التكاليف','جدول المصاريف','جدول الموردين','جدول المخازن']) ok(body.includes(t), 'has ' + t);
  ok(!body.includes('تخطيط الموارد'), 'no resource planning');
  ok(await ev(() => !Array.from(document.querySelectorAll('#pstPreset option')).some(o => o.value === '30')), 'no 30-day preset');
  console.log('[3b] project view page: hero + path + comments');
  await ev(() => { projectFilters.detailId = 'pA'; rerenderCurrentPage(); });
  await page.waitForTimeout(300);
  ok(await ev(() => !!document.querySelector('.pv-hero') && !!document.querySelector('.ppt2')), 'hero + path rendered');
  ok(await ev(() => document.querySelectorAll('.ppt-node-stage').length >= 5), 'stage track');
  await ev(() => { const p = DATA.projects.find(x => x.id === 'pA'); const cur = pwCurrent(p); openStepModal(p, cur.stepKey); });
  await page.waitForTimeout(500);
  await ev(() => { window.__m = !document.getElementById('pwDue') && document.querySelector('#appModal h3').innerText.includes('قائمة تفاصيل الخطوة') && !document.getElementById('pwNotes'); document.getElementById('pwCmText').value = 'تعليق تجريبي'; document.getElementById('pwCmAdd').click(); });
  await page.waitForTimeout(400);
  ok(await ev(() => window.__m), 'modal: title, no due date, merged notes');
  eq(await ev(() => DATA.projects.find(x => x.id === 'pA').stepMeta[pwCurrent(DATA.projects.find(x => x.id === 'pA')).stepKey].comments.length), 1, 'comment saved');
  ok(await ev(() => document.getElementById('pwCmList').innerText.includes('تعليق تجريبي')), 'comment shown in modal');
  await ev(() => { document.querySelector('[data-cm-del]').click(); });
  await page.waitForTimeout(200);
  eq(await ev(() => document.querySelectorAll('.pw-cm-item').length), 0, 'comment deleted');
  eq(errors.length, 0, 'no page errors: ' + errors.join('|'));
  await browser.close(); summary();
})();
