// استكشاف فعلي لكل صفحات الواجهة القديمة في المتصفح (خطة v1.4.5 — المرحلة 3، البندين 3.3 و3.4).
// قراءة بس: بيفتح كل صفحة على بيانات مُركّبة (tools/security/xss-seed.js، نصوص عادية)، وبيجرد الأزرار
// والجداول والخانات، وبيفتح نوافذ الإضافة/التعديل/العرض بس (مش حذف ولا حفظ ولا تصدير ولا اعتماد)،
// وبيصوّر كل صفحة ونافذة. الساعة متثبّتة على تاريخ واحد عشان النتايج تتكرر.
//
// المخرجات:
//   docs/discovery/page-discovery.json                     (الجرد — مصدر FUNCTIONAL_INVENTORY.md)
//   docs/discovery/visual-baseline/desktop/<page>.png      (1366×768، الصفحة كاملة)
//   docs/discovery/visual-baseline/dialogs/<page>__<n>.png (النوافذ)
//   docs/discovery/visual-baseline/mobile/<page>.png       (390×844، صفحات القايمة)
// التشغيل: node tools/discovery/discover-pages.js   (NO_SHOTS=1: الجرد من غير لقطات؛ --out <dir>: مجلد مخرجات تاني)
// ممنوع تشغيله على بيانات حقيقية والمخرجات جوه المستودع.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { openFileApp } = require(path.join(ROOT, 'tests-merge/harness'));
const { baseUser } = require(path.join(ROOT, 'tests-merge/lib'));
const { buildSeed } = require(path.join(ROOT, 'tools/security/xss-seed'));

// --out <dir>: كل المخرجات (اللقطات + page-discovery.json) في مجلد تاني، من غير ما تلمس خط الأساس (للمقارنة البصرية)
const outArg = process.argv.indexOf('--out');
const OUT = outArg > 0 ? path.resolve(process.argv[outArg + 1]) : path.join(ROOT, 'docs/discovery');
const VB = path.join(OUT, 'visual-baseline');
const SHOTS = process.env.NO_SHOTS !== '1';
const FIXED_TIME = new Date('2026-03-15T09:00:00Z'); // تاريخ ثابت عشان «اليوم» والتنبيهات تتكرر
const DESKTOP = { width: 1366, height: 768 };
const MOBILE = { width: 390, height: 844 };
// نفس قواعد الأمان بتاعة xss-probe: افتح بس، وماتعملش أي حاجة بتغيّر أو بتطلّع ملف
const OPEN = /✏️|تعديل|إضافة|اضافة|جديد|➕|＋|^\+|عرض|تفاصيل|👁|كشف/;
const AVOID = /حذف|🗑|مسح|استيراد|تصدير|طباعة|🖨|🧾|PDF|Excel|xlsx|نسخ احتياطي|استعادة|خروج|اعتماد|رفض|موافقة|✓|✗|ترحيل|إقفال|دمج|توحيد|حفظ|💾/;
const MAX_DIALOGS = Number(process.env.MAX_DIALOGS || 6);
// تصنيف الأفعال من نص الزرار أو اسم الدالة اللي بيناديها
const ACTION_KINDS = [
  ['filter', /مسح الفلاتر|إعادة تعيين|reset/i], ['delete', /حذف|🗑|مسح|delete|remove/i], ['export', /تصدير|Excel|إكسيل|اكسيل|xlsx|csv|export|download/i], ['import', /استيراد|import/i],
  ['print', /طباعة|🖨|PDF|print|pdf/i], ['approve', /اعتماد|موافقة|رفض|approve|reject/i], ['attachment', /مرفق|📎|attach/i],
  ['save', /حفظ|💾|save/i], ['add', /إضافة|اضافة|جديد|➕|＋|^\+|add|new/i], ['edit', /تعديل|✏️|edit/i], ['view', /عرض|تفاصيل|👁|كشف|view|detail/i],
  ['filter', /بحث|فلتر|تصفية|🔍|filter|search/i], ['navigate', /رجوع|←|→|التالي|السابق|back/i],
];
const kindOf = (t) => (ACTION_KINDS.find(([, re]) => re.test(t)) || ['other'])[0];
const safeName = (k) => k.replace(/[^\w.-]+/g, '_');

(async () => {
  const seed = buildSeed();
  seed.users = [baseUser];
  const { browser, page, errors } = await openFileApp(seed);
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  page.on('popup', (p) => p.close().catch(() => {}));
  // اختبار سلبي للمقارنة البصرية بس: CSS بيتحقن في الصفحة (مش في ملفات المستودع)
  if (process.env.INJECT_CSS) await page.addStyleTag({ content: process.env.INJECT_CSS });
  await page.clock.install({ time: FIXED_TIME });
  await page.clock.pauseAt(FIXED_TIME);
  await page.setViewportSize(DESKTOP);
  if (SHOTS) for (const d of ['desktop', 'dialogs', 'mobile']) { fs.rmSync(path.join(VB, d), { recursive: true, force: true }); fs.mkdirSync(path.join(VB, d), { recursive: true }); }

  const inv = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audit/feature-inventory.json'), 'utf8'));
  const go = (key) => page.evaluate((key) => { try { closeModal(); } catch (e) {} try { goToPage(key); return null; } catch (e) { return e.message; } }, key);
  const settle = async () => { await page.clock.runFor(400); await page.waitForTimeout(120); };

  // جرد جوه عنصر (الصفحة أو النافذة)
  const scan = (scope) => page.evaluate((scope) => {
    const root = scope === 'modal' ? (document.querySelector('.modal-overlay .modal') || document.querySelector('.modal-overlay')) : (document.querySelector('.page') || document.querySelector('#app'));
    if (!root) return null;
    const nid = (id) => (id ? id.replace(/_id_[a-z0-9]{8,}/g, '_id_*') : null); // معرّفات عشوائية بيولّدها البرنامج
    const txt = (el) => (el.innerText || el.value || el.title || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    const fns = (el) => { const a = el.getAttribute('onclick') || ''; return [...new Set([...a.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]).filter((f) => !/^(if|return|event|confirm|alert|String|Number|JSON|parseInt|parseFloat|encodeURIComponent)$/.test(f)))]; };
    const buttons = [];
    const seen = new Set();
    for (const b of root.querySelectorAll('button, a.btn, [role=button], .btn')) {
      if (scope !== 'modal' && b.closest('nav, .top')) continue; // الهيدر والقايمة: عامين، بيتجردوا مرة واحدة
      const t = txt(b).slice(0, 80);
      const f = fns(b);
      const sig = t + '|' + f.join(',');
      if ((!t && !f.length) || seen.has(sig)) continue;
      seen.add(sig);
      buttons.push({ text: t, id: nid(b.id), calls: f, disabled: !!b.disabled });
    }
    const tables = [...root.querySelectorAll('table')].map((t) => ({ headers: [...t.querySelectorAll('thead th')].map(txt).filter(Boolean).slice(0, 30), rows: t.querySelectorAll('tbody tr').length }));
    const fields = [...root.querySelectorAll('input:not([type=hidden]), select, textarea')].map((f) => {
      const lab = f.id && root.querySelector(`label[for="${f.id}"]`);
      const wrapLab = f.closest('label');
      const near = f.closest('.form-group, .field, .fg, td, div');
      const own = (el) => { const c = el.cloneNode(true); c.querySelectorAll('select, option, input, textarea').forEach((x) => x.remove()); return (c.innerText || c.textContent || '').replace(/\s+/g, ' ').trim(); };
      const label = (lab && own(lab)) || (wrapLab && own(wrapLab)) || f.placeholder || (near && near.querySelector('label') && own(near.querySelector('label'))) || '';
      return { tag: f.tagName.toLowerCase(), type: f.type || null, id: nid(f.id), label: label.slice(0, 60), required: !!f.required };
    });
    const heading = root.querySelector('h1, h2, h3, .page-title, .modal-title, .modal-header');
    const tabs = [...root.querySelectorAll('.tab, .tabs button, [role=tab], .sub-tab')].map(txt).filter(Boolean).slice(0, 30);
    return { heading: heading ? txt(heading).slice(0, 100) : '', buttons, tables, fields, tabs, textLen: (root.innerText || '').length };
  }, scope);

  // الهيدر والقايمة: مرة واحدة (مستبعدين من جرد كل صفحة)
  await go('dashboard'); await settle();
  const chrome = await page.evaluate(() => {
    const t = (el) => (el.innerText || el.title || '').replace(/\s+/g, ' ').replace(/\s*\d+$/, '').trim();
    return {
      header: [...document.querySelectorAll('.top button, .top .btn')].map((b) => ({ text: t(b), id: b.id || null })).filter((b) => b.text || b.id),
      sections: [...document.querySelectorAll('nav.nav-sections .nav-btn')].map((b) => ({ text: t(b), section: b.getAttribute('data-section') })),
    };
  });
  const out = [];
  for (const p of inv.pages) {
    const key = p.key;
    const before = errors.length;
    const threw = await go(key);
    await settle();
    const landedOn = await page.evaluate(() => (typeof currentPage !== 'undefined' ? currentPage : null));
    const info = await scan('page');
    if (SHOTS) {
      await page.screenshot({ path: path.join(VB, 'desktop', safeName(key) + '.png'), fullPage: true, animations: 'disabled', caret: 'hide' });
      if (p.inNavigation) {
        await page.setViewportSize(MOBILE); await settle();
        await page.screenshot({ path: path.join(VB, 'mobile', safeName(key) + '.png'), animations: 'disabled', caret: 'hide' });
        await page.setViewportSize(DESKTOP); await go(key); await settle();
      }
    }
    // النوافذ: افتح أزرار الإضافة/التعديل/العرض الآمنة بس
    const openers = await page.evaluate(({ OPEN, AVOID }) => {
      const o = new RegExp(OPEN), a = new RegExp(AVOID);
      const root = document.querySelector('.page') || document.querySelector('#app');
      const seen = new Set(); const list = [];
      for (const b of root.querySelectorAll('button, a.btn, [role=button]')) {
        const t = (b.innerText || b.title || '').replace(/\s+/g, ' ').trim();
        if (!t || b.disabled || a.test(t) || !o.test(t) || seen.has(t)) continue;
        seen.add(t); list.push(t);
      }
      return list;
    }, { OPEN: OPEN.source, AVOID: AVOID.source });
    const dialogs = [];
    for (let i = 0; i < Math.min(openers.length, MAX_DIALOGS); i++) {
      await go(key); await settle();
      await page.evaluate(({ label, OPEN, AVOID }) => {
        const o = new RegExp(OPEN), a = new RegExp(AVOID);
        const root = document.querySelector('.page') || document.querySelector('#app');
        for (const b of root.querySelectorAll('button, a.btn, [role=button]')) {
          const t = (b.innerText || b.title || '').replace(/\s+/g, ' ').trim();
          if (t === label && !a.test(t) && o.test(t)) { try { b.click(); } catch (e) {} return; }
        }
      }, { label: openers[i], OPEN: OPEN.source, AVOID: AVOID.source });
      await settle();
      const open = await page.evaluate(() => !!document.querySelector('.modal-overlay'));
      if (!open) { dialogs.push({ opener: openers[i].slice(0, 80), opened: false }); continue; }
      const d = await scan('modal');
      const shot = `${safeName(key)}__${i + 1}.png`;
      if (SHOTS) await page.screenshot({ path: path.join(VB, 'dialogs', shot), animations: 'disabled', caret: 'hide' });
      dialogs.push({ opener: openers[i].slice(0, 80), opened: true, ...d, screenshot: SHOTS ? `visual-baseline/dialogs/${shot}` : null });
      await page.evaluate(() => { try { closeModal(); } catch (e) {} });
    }
    out.push({
      key, label: p.label, section: p.section, inNavigation: p.inNavigation, renderFn: p.renderFn, definedAt: p.definedAt,
      threw, landedOn, ...info,
      actionsByKind: (info ? info.buttons : []).reduce((acc, b) => { const k = kindOf(b.text + ' ' + b.calls.join(' ')); acc[k] = (acc[k] || 0) + 1; return acc; }, {}),
      dialogs, jsErrors: errors.slice(before).length,
      screenshots: SHOTS ? { desktop: `visual-baseline/desktop/${safeName(key)}.png`, mobile: p.inNavigation ? `visual-baseline/mobile/${safeName(key)}.png` : null } : null,
    });
    process.stdout.write('.');
  }
  await browser.close();
  const res = {
    generatedBy: 'tools/discovery/discover-pages.js', data: 'synthetic (tools/security/xss-seed.js, plain text)', mode: 'file (desktop renderer, mocked desktopApi)',
    fixedTime: FIXED_TIME.toISOString(), viewports: { desktop: DESKTOP, mobile: MOBILE }, maxDialogsPerPage: MAX_DIALOGS,
    chrome, pages: out, jsErrors: errors,
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'page-discovery.json'), JSON.stringify(res, null, 1) + '\n');
  const nd = out.reduce((n, p) => n + p.dialogs.filter((d) => d.opened).length, 0);
  console.log(`\n${out.length} pages, ${nd} dialogs opened, ${out.filter((p) => p.threw || p.jsErrors).length} pages with errors, ${errors.length} js errors`);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
