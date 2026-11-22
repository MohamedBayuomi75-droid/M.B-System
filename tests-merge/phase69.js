// المرحلة 7 (الحزمة 7.3 — دفعات الموردين والتخصيص والرصيد): اختبارات قبول للواجهة القديمة (DEC-0086، DEC-0113).
// القيم المتوقعة = السلوك الحالي (LEGACY-PRESERVE)، وده المرجع اللي الشاشة الجديدة بتتقارن بيه، **مش** قاعدة F-05 (اللي بتتطبق في السيرفر):
//  [1] supplierBalance: الافتتاحي + كل الفواتير (حتى الملغاة) − المرتجعات − كل الدفعات (السداد والتحصيل والغير مصنّف)
//  [2] statementRows / openingBalanceFor: الكشف من غير الملغاة، وتقريب خانتين، والترتيب بالتاريخ ثم فاتورة ← مرتجع ← دفعة
//  [3] nextPaymentNo: عدّاد عام في الإعدادات
//  [4] نافذة الدفعة (openPaymentModal): دفعة عامة، ودفعة موزّعة على فاتورتين + باقي (سجلات بنفس batchId، والباقي متقرّب لخانتين)،
//      ورفض التوزيع الأكبر من المبلغ، والتعديل (بيبدّل سجل واحد وبياخد أول فاتورة)
//  [5] confirmAndSoftDeletePayment: حذف فعلي + «استعادة» 5 ثواني
//  [6] صفحة الدفعات: الفلاتر والكروت، والدفعة من غير اتجاه بتتعرض «دائن»
//  [7] صلاحيات الصفحة (UAT 7.3 K14): ✎ و«تعديل الدفعة» بيختفوا من غير صلاحية تعديل
// بيشتغل في وضع الملف والويب (WEB_MODE=1) وفوق الجداول.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const inv = (id, o) => Object.assign({ id, supplierId: 's1', invoiceNo: id.toUpperCase(), date: '2026-01-10', category: '', project: '', description: 'بند', baseValue: 1000, vat: 140, stampDuty: 0, withheld: 10, totalInvoice: 1140, netInvoice: 1130, isReturn: false, attachments: [], notes: '' }, o);
  const pay = (id, o) => Object.assign({ id, paymentNo: 0, supplierId: 's1', invoiceId: '', amount: 100, method: 'نقدي', date: '2026-01-20', transferRef: '', notes: '', extraFields: [], attachments: [] }, o);
  const seed = {
    users: [baseUser],
    settings: { nextPaymentNo: 7 },
    ledger: {
      suppliers: [
        { id: 's1', name: 'مورد الدفعات', taxId: '555', commercialReg: 'CR', openingBalance: 1000, openingBalanceDate: '', extraFields: [], attachments: [] },
        { id: 's2', name: 'مورد تاني', taxId: '', openingBalance: 0, extraFields: [], attachments: [] },
      ],
      invoices: [
        inv('i1'),                                                                            // 1130
        inv('i2', { date: '2026-01-15', baseValue: 500, vat: 70, withheld: 0, totalInvoice: 570, netInvoice: 570 }),
        inv('ic', { date: '2026-01-05', baseValue: 500, vat: 0, withheld: 0, totalInvoice: 500, netInvoice: 500, cancelled: true }), // ملغاة: في الرصيد الحالي، ومش في الكشف
        inv('r1', { date: '2026-01-25', isReturn: true, linkedInvoiceId: '', baseValue: 113, vat: 0, withheld: 0, totalInvoice: 113, netInvoice: 113 }),
      ],
      payments: [
        pay('p1', { paymentNo: 1, amount: 500, direction: 'pay', date: '2026-01-20' }),
        pay('p2', { paymentNo: 2, amount: 100, direction: 'collect', date: '2026-01-21' }),
        pay('p3', { paymentNo: 3, amount: 0.105, date: '2026-01-22' }),                    // من غير اتجاه (B-53)، والتقريب في الكشف
      ],
    },
  };
  const { browser, page, errors } = await openApp(seed);
  const saved = (n) => page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 });
  const ready = () => page.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && document.querySelector('#app') && document.querySelector('#app').innerText.length > 100, null, { timeout: 30000 });

  console.log('[1] supplierBalance (الطريقة الحالية): الملغاة داخلة، والتحصيل والغير مصنّف بيتطرحوا');
  // 1000 + 1130 + 570 + 500 (ملغاة) − 113 − 500 − 100 − 0.105 = 2486.895
  eq(await page.evaluate(() => Math.round(supplierBalance('s1') * 1e6) / 1e6), 2486.895, 'الرصيد الحالي = 2486.895 (F-05 كانت هتدّي 1000+1130+570−113−500+100 = 2187، والـ 0.105 للمراجعة)');

  console.log('[2] statementRows / openingBalanceFor');
  const st = await page.evaluate(() => statementRows('s1', '', '').map((e) => [e.type, e.ref, e.debit, e.credit, e.balance]));
  eq(st, [
    ['invoice', 'I1', 0, 1130, 1130], ['invoice', 'I2', 0, 570, 1700], ['payment', '-', 500, 0, 1200], ['payment', '-', 100, 0, 1100],
    ['payment', '-', 0.11, 0, 1099.89], ['return', 'R1', 113, 0, 986.89],
  ], 'الكشف: من غير الملغاة، والتقريب لخانتين (0.105 ← 0.11)، والتحصيل في عمود مدين، والترتيب بالتاريخ');
  eq(await page.evaluate(() => [openingBalanceFor('s1', ''), openingBalanceFor('s1', '2026-01-16')]), [1000, 1000 + 1130 + 570 + 500],
    'الافتتاحي في أول الفترة: الملغاة داخلة (عكس سطور الكشف) — ده سبب اختلاف الكشف عن الرصيد');

  console.log('[3] nextPaymentNo');
  eq(await page.evaluate(() => [nextPaymentNo(), nextPaymentNo(), DATA.settings.nextPaymentNo]), [7, 8, 9], 'عدّاد عام في الإعدادات، وكل نداء رقم جديد');

  console.log('[4] نافذة الدفعة: عامة، وموزّعة + باقي، والرفض، والتعديل');
  const openModal = async () => { await page.evaluate(() => openPaymentModal('s1')); await page.waitForSelector('#m_pay_save'); };
  // عامة
  await openModal();
  await page.fill('#m_pay_amount', '250'); await page.check('#m_pay_general'); await page.fill('#m_pay_notes', 'مقدم');
  let n = await page.evaluate(() => window.__saveCount);
  await page.click('#m_pay_save'); await saved(n);
  const gen = await page.evaluate(() => DATA.ledger.payments.filter((p) => p.notes === 'مقدم'));
  ok(gen.length === 1 && gen[0].invoiceId === '' && gen[0].amount === 250 && gen[0].direction === 'pay' && gen[0].paymentNo === 9 && /^pbatch/.test(gen[0].batchId), 'دفعة عامة: سجل واحد، من غير فاتورة، ورقم من العدّاد، و batchId', gen);
  // موزّعة: 1000 على i1 = 600 و i2 = 300، والباقي 100.005 ← 100.01 (تقريب خانتين)
  await openModal();
  await page.fill('#m_pay_amount', '1000.005'); await page.fill('#m_pay_notes', 'توزيع');
  await page.check('.m_pay_inv_cb[value="i1"]'); await page.fill('.m_pay_inv_amt[data-invid="i1"]', '600');
  await page.check('.m_pay_inv_cb[value="i2"]'); await page.fill('.m_pay_inv_amt[data-invid="i2"]', '300');
  ok((await page.textContent('#m_pay_allocHint')).includes('متبقي للتوزيع'), 'تنبيه «متبقي للتوزيع»');
  n = await page.evaluate(() => window.__saveCount);
  await page.click('#m_pay_save'); await saved(n);
  const dist = await page.evaluate(() => DATA.ledger.payments.filter((p) => String(p.notes).startsWith('توزيع')).map((p) => [p.invoiceId, p.amount, p.notes, p.paymentNo, p.batchId]));
  eq(dist.map((d) => d.slice(0, 4)), [['i2', 300, 'توزيع', 10], ['i1', 600, 'توزيع', 11], ['', 100.01, 'توزيع — متبقي غير موزع', 12]], '3 سجلات بترتيب قايمة الفواتير (الأحدث الأول) + الباقي (متقرّب لخانتين)، وكل سجل برقم');
  ok(new Set(dist.map((d) => d[4])).size === 1, 'التلاتة بنفس batchId');
  // توزيع أكبر من المبلغ ← مرفوض
  await openModal();
  await page.fill('#m_pay_amount', '100');
  await page.check('.m_pay_inv_cb[value="i1"]'); await page.fill('.m_pay_inv_amt[data-invid="i1"]', '200');
  const before = await page.evaluate(() => DATA.ledger.payments.length);
  await page.click('#m_pay_save');
  await page.waitForFunction(() => (document.querySelector('.toast, #toast, #lgToast') || {}).textContent?.includes('مجموع التوزيع أكبر من المبلغ الإجمالي') || [...document.querySelectorAll('div')].some((d) => d.textContent === 'مجموع التوزيع أكبر من المبلغ الإجمالي'), null, { timeout: 5000 });
  eq(await page.evaluate(() => DATA.ledger.payments.length), before, 'التوزيع الأكبر من المبلغ مرفوض ومفيش حاجة اتحفظت');
  await page.click('#m_pay_cancel');
  // التعديل: p1 ← تحصيل 700 على i2 و i1 (بياخد أول فاتورة متعلّمة بس، ومابيقسمش)
  await page.evaluate(() => openPaymentModal('s1', 'p1')); await page.waitForSelector('#m_pay_save');
  await page.selectOption('#m_pay_direction', 'collect'); await page.fill('#m_pay_amount', '700');
  // الدفعة كانت عامة، فخانة «دفعة عامة» متعلّمة: لازم تتشال الأول وإلا الربط بيتجاهل (سلوك القديم)
  await page.uncheck('#m_pay_general');
  await page.check('.m_pay_inv_cb[value="i2"]'); await page.fill('.m_pay_inv_amt[data-invid="i2"]', '200');
  n = await page.evaluate(() => window.__saveCount);
  await page.click('#m_pay_save'); await saved(n);
  eq(await page.evaluate(() => DATA.ledger.payments.filter((p) => p.id === 'p1').map((p) => [p.direction, p.amount, p.invoiceId, p.paymentNo])), [['collect', 700, 'i2', 1]],
    'التعديل: نفس السجل ونفس الرقم، والمبلغ الإجمالي، وأول فاتورة متعلّمة بس (مفيش تقسيم)');

  console.log('[5] الحذف مع الاستعادة');
  n = await page.evaluate(() => window.__saveCount);
  await page.evaluate(() => { confirmAndSoftDeletePayment('p2'); });
  await page.click('#appDlgOk'); await saved(n);
  eq(await page.evaluate(() => DATA.ledger.payments.some((p) => p.id === 'p2')), false, 'حذف فعلي');
  n = await page.evaluate(() => window.__saveCount);
  await page.click('#undoToastBtn'); await saved(n);
  eq(await page.evaluate(() => DATA.ledger.payments.some((p) => p.id === 'p2')), true, '«استعادة» بترجّعها');

  console.log('[6] صفحة الدفعات: الفلاتر والكروت');
  await page.evaluate(() => goToPage('ledger.payments')); await page.waitForTimeout(300);
  const cards = await page.evaluate(() => [...document.querySelectorAll('.stats-row .stat-card .num')].map((x) => x.innerText.trim()));
  const want = await page.evaluate(() => { const r = DATA.ledger.payments; return [String(r.length), fmt(r.reduce((a, b) => a + Number(b.amount || 0), 0))]; });
  eq(cards, want, 'الكروت: العدد وإجمالي كل الدفعات (التحصيل والغير مصنّف داخلين)');
  ok(await page.evaluate(() => { const tr = document.querySelector('tr[data-viewpay="p3"]'); return !!tr && tr.innerText.includes('دائن — علينا له'); }), 'الدفعة من غير اتجاه بتتعرض «دائن — علينا له»');
  eq(await page.evaluate(() => { Object.assign(paymentsFilters, { direction: 'collect', link: '', sort: 'new' }); const a = getFilteredPayments().map((p) => p.id); Object.assign(paymentsFilters, { direction: '', link: 'general' }); const b = getFilteredPayments().length; Object.assign(paymentsFilters, { link: '' }); return [a, b]; }),
    [['p2', 'p1'], await page.evaluate(() => DATA.ledger.payments.filter((p) => !p.invoiceId).length)], 'فلتر «مدين» (التحصيل بس)، وفلتر «دفعة عامة»');

  console.log('[7] صلاحيات صفحة الدفعات (UAT 7.3 K14): مستخدم عرض بس مايشوفش ✎ ولا ✕ ولا «إضافة»، ولا «تعديل الدفعة» في نافذة العرض');
  const perm = await page.evaluate(() => {
    const orig = window.getUserPerms;
    window.getUserPerms = () => ({ pages: { 'ledger.payments': { view: true, add: false, edit: false, delete: false } } });
    goToPage('ledger.payments');
    const table = { edit: document.querySelectorAll('[data-editpay]').length, del: document.querySelectorAll('[data-delpay-global]').length, add: !!document.getElementById('openAddPaymentPageBtn') };
    openViewPaymentModal('p1'); const viewEdit = !!document.getElementById('m_pay_edit'); try { closeModal(); } catch (e) { /* */ } document.querySelectorAll('#modalOverlay').forEach((o) => o.remove());
    window.getUserPerms = orig; goToPage('ledger.payments');
    const admin = { edit: document.querySelectorAll('[data-editpay]').length > 0, add: !!document.getElementById('openAddPaymentPageBtn') };
    openViewPaymentModal('p1'); const adminViewEdit = !!document.getElementById('m_pay_edit'); document.querySelectorAll('#modalOverlay').forEach((o) => o.remove());
    return { table, viewEdit, admin, adminViewEdit };
  });
  eq([perm.table, perm.viewEdit], [{ edit: 0, del: 0, add: false }, false], 'مفيش ✎ ولا ✕ ولا «إضافة» في الجدول، ولا «تعديل الدفعة» في نافذة العرض');
  eq([perm.admin, perm.adminViewEdit], [{ edit: true, add: true }, true], 'الأدمن لسه بيشوف الأزرار');

  if (WEB) {
    await page.waitForFunction(() => !WebSync._state.saving, null, { timeout: 15000 });
    await page.evaluate(() => WebSync.save(DATA)).catch(() => {});
    await page.waitForFunction(() => !WebSync._state.saving, null, { timeout: 15000 });
    await page.waitForTimeout(300); await page.reload(); await ready(); await page.waitForTimeout(600);
    ok(await page.evaluate(() => DATA.ledger.payments.filter((p) => String(p.notes).startsWith('توزيع')).length === 3 && DATA.ledger.payments.find((p) => p.id === 'p1').direction === 'collect'), 'كله اتحفظ على السيرفر (بعد إعادة التحميل)');
  } else ok(await page.evaluate(() => window.__saved.ledger.payments.filter((p) => String(p.notes).startsWith('توزيع')).length === 3), 'كله اتحفظ');

  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
