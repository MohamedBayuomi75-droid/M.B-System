// نافذة العامل (8.1، اتلقى في 8.2.5): نفس الخانات بالترتيب الظاهر زي القديمة (applyPeopleFormOrder + applyFormLayout) على بيانات
// **مااتحفظش فيها التخطيط بعد ترتيب الجلسة** (syncAutoFields — _cfAligned2) — والخانة الإضافية بتظهر في الإضافة.
// (حالة التخطيط المحفوظ في tests-web/workers-layout-e2e.js [3].)  التشغيل: node tests-web/workers-form-e2e.js
'use strict';
const path = require('path');
const { openWebApp } = require(path.join(__dirname, '../tests-merge/harness'));
const { baseUser, eq, summary } = require(path.join(__dirname, '../tests-merge/lib'));
(async () => {
  const { browser, page, base } = await openWebApp({ users: [baseUser], schemaVersion: 9, customFieldDefs: { workers: [{ id: 'cf1', label: 'المقاس', showInTable: true }] },
    workers: [{ id: 'w2', code: 'WRK-002', name: 'أحمد', workerType: 'company', type: 'company', status: 'active', salary: 6000, extraFields: [{ label: 'المقاس', value: 'XL' }], attachments: [] }] });
  const labels = () => page.evaluate(() => [...document.querySelectorAll('#appModal .modal-body label')].filter((l) => l.offsetParent !== null && getComputedStyle(l).display !== 'none').map((l, i) => [l, Number(getComputedStyle(l).order) || 0, i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map((x) => x[0]).map((l) => { const c = l.cloneNode(true); c.querySelectorAll('input,select,textarea,small,button').forEach((n) => n.remove()); return (c.textContent || '').replace(/\s+/g, ' ').replace(/\*/g, '').trim(); }).filter((x) => x && !/^(المرفقات|إرفاق|رفع مرفق)/.test(x)));
  const out = {};
  for (const [k, id, o] of [['addCo', null, { defaultType: 'company' }], ['editCo', 'w2', null], ['addTemp', null, { defaultType: 'temporary' }]]) {
    await page.evaluate(() => { try { closeModal(); } catch (e) {} }); await page.waitForTimeout(300);
    await page.evaluate(([i, o]) => { goToPage('workers'); openWorkerModal(i, o || undefined); }, [id, o]); await page.waitForTimeout(500); out[k] = [await labels()];
  }
  for (const [k, how] of [['addCo', '#btnAddWorker'], ['editCo', '.btn-edit-wrk[data-id="w2"]'], ['addTemp', '#btnAddTempWorker']]) {
    await page.goto(base + '/app/workers'); await page.waitForSelector('#wkBoards .entity-dept-board'); await page.click('#wkBoards .entity-dept-board[data-dept=""]'); await page.waitForSelector('#wkTable tr[data-id="w2"]');
    await page.click(how); await page.waitForSelector('#btnSaveWrk'); await page.waitForTimeout(300); out[k].push(await labels());
  }
  for (const k of Object.keys(out)) eq(out[k][1], out[k][0], `${k}: نفس الخانات بالترتيب الظاهر`);
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
