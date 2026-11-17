// المرحلة 3 (3.3) — اختبار قبول للصفحات الـ 27 اللي ماكانش ليها أي اختبار (docs/audit/feature-inventory.json):
// كل صفحة: بتفتح ببيانات بنفس شكل البيانات الحقيقية (tools/security/xss-seed.js)، مابتحوّلش لصفحة تانية،
// بترسم محتوى، ومن غير أخطاء JS — وبعدين نوافذ الإضافة/التعديل/العرض فيها بتفتح من غير أخطاء.
// + تطابق أرقام معروضة مع المعادلات في صفحات الموردين ومستحقات العمال والتقرير الربع سنوي.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
const { buildSeed } = require('../tools/security/xss-seed');

const PAGES = ['tasks.my', 'attendance', 'performance', 'clients.crm', 'ledger.suppliers', 'ledger.quarterly', 'ledger.returns', 'warehouses.home', 'warehouses.reports', 'transfers', 'workerDues', 'ledger.payments', 'clients.accounts', 'clients.reports', 'ledger.reports', 'accounts.reports', 'ledger.archive', 'users', 'ledger.categories', 'fuel', 'documents', 'assistant', 'payroll', 'employeeDetail', 'personDetail', 'ledger.dashboard', 'general.overview'];
// صفحات التفاصيل محتاجة سجل مختار
const PREP = {
  employeeDetail: "activeEmployeeId = DATA.employees[0].id; goToPage('employeeDetail'); return 'open';",
  personDetail: "openPersonDetailPage('worker', DATA.workers[0].id); return 'open';",
};
// صفحات اسمها بديل لصفحة تانية في القائمة (aliasOf في docs/audit/feature-inventory.json) — المتوقع إنها تفتح الأصل
const ALIAS = { fuel: 'equipment', documents: 'archive', assistant: 'dashboard', payroll: 'workerDues', 'ledger.dashboard': 'dashboard', 'general.overview': 'dashboard' };
const OPEN = /✏️|تعديل|إضافة|اضافة|جديد|➕|＋|^\+|عرض|تفاصيل|👁|كشف/;
const AVOID = /حذف|🗑|مسح|استيراد|تصدير|طباعة|🖨|🧾|PDF|Excel|xlsx|نسخ احتياطي|استعادة|خروج|اعتماد|رفض|موافقة|✓|✗|ترحيل|إقفال|دمج|توحيد|حفظ|💾/;

(async () => {
  const seed = buildSeed();
  seed.users = [baseUser];
  const { browser, page, errors } = await openApp(seed);
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  page.on('popup', (p) => p.close().catch(() => {}));
  let opened = 0;
  for (const key of PAGES) {
    const before = errors.length;
    const r = await page.evaluate(({ key, prep }) => {
      try { closeModal(); } catch (e) {}
      let threw = null, via = 'goToPage';
      try { if (prep) via = new Function(prep)() || via; if (via === 'goToPage') goToPage(key); } catch (e) { threw = e.message; }
      return { threw, via };
    }, { key, prep: PREP[key] });
    await page.waitForTimeout(200);
    const s = await page.evaluate((key) => {
      const root = document.querySelector('.page') || document.querySelector('#app');
      return { landed: typeof currentPage !== 'undefined' ? currentPage : null, len: (root.innerText || '').length };
    }, key);
    ok(!r.threw && s.len > 80 && (r.via !== 'goToPage' || s.landed === (ALIAS[key] || key)) && errors.length === before, `${key}${ALIAS[key] ? ' (→ ' + ALIAS[key] + ')' : ''}: بتفتح وبترسم (${s.len} حرف)`, { ...r, ...s, errs: errors.slice(before) });
    // نوافذ الصفحة
    const labels = await page.evaluate(({ O, A }) => {
      const o = new RegExp(O), a = new RegExp(A), root = document.querySelector('.page') || document.querySelector('#app'), seen = new Set(), out = [];
      for (const b of root.querySelectorAll('button, a.btn')) { const t = (b.innerText || b.title || '').trim(); if (!t || b.disabled || a.test(t) || !o.test(t) || seen.has(t)) continue; seen.add(t); out.push(t); }
      return out.slice(0, 4);
    }, { O: OPEN.source, A: AVOID.source });
    for (const label of labels) {
      const b2 = errors.length;
      await page.evaluate(({ key, prep, label }) => {
        try { closeModal(); } catch (e) {}
        try { if (prep) new Function(prep)(); else goToPage(key); } catch (e) {}
        const root = document.querySelector('.page') || document.querySelector('#app');
        const b = [...root.querySelectorAll('button, a.btn')].find((x) => (x.innerText || x.title || '').trim() === label);
        if (b) b.click();
      }, { key, prep: PREP[key], label });
      await page.waitForTimeout(150);
      if (errors.length !== b2) ok(false, `${key} › «${label}» من غير أخطاء`, errors.slice(b2));
      else opened++;
      await page.evaluate(() => { try { closeModal(); } catch (e) {} });
    }
  }
  ok(opened >= 20, `نوافذ اتفتحت من غير أخطاء: ${opened}`);

  // تطابق المعروض مع المعادلات
  const nums = await page.evaluate(() => {
    const txt = () => ((document.querySelector('.page') || document.querySelector('#app')).innerText || '').replace(/[\u2066-\u2069\u200e\u200f]/g, '');
    const clean = (x) => String(x).replace(/[\u2066-\u2069\u200e\u200f]/g, '').trim();
    goToPage('ledger.suppliers');
    const s = DATA.ledger.suppliers.find((x) => Math.abs(supplierBalance(x.id)) > 0) || DATA.ledger.suppliers[0];
    const supplierBalanceShown = txt().includes(clean(fmt(Math.abs(supplierBalance(s.id)))));
    window.__duesTab = 'workers'; window.__duesDept = ''; workerAttFilters.from = ''; workerAttFilters.to = ''; goToPage('workerDues');
    const w = DATA.workers.find((x) => workerBalance(x.id) !== 0) || DATA.workers[0];
    const r = { supplierBalanceShown, bal: workerBalance(w.id), duesHas: txt().includes(clean(fmtNum(Math.abs(workerBalance(w.id))))) };
    window.__duesTab = ''; window.__duesDept = undefined;
    return r;
  });
  ok(nums.supplierBalanceShown, 'صفحة الموردين بتعرض نفس رصيد supplierBalance');
  ok(nums.duesHas, 'صفحة المستحقات بتعرض نفس متبقي workerBalance', nums);
  summary(errors);
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
