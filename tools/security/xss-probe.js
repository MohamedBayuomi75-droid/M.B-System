// فحص XSS آلي (المرحلة 2 — S-1): بيحقن نص خبيث في كل قيمة نصية في البيانات، ويفتح كل الصفحات،
// ويلتقط أي تنفيذ فعلي (onerror) أو عنصر محقون أو قيمة وصلت جوه معالج حدث نصي (onclick="...").
//
// التشغيل:
//   node tools/security/xss-probe.js                       ← بيانات مُركّبة (tools/security/xss-seed.js)
//   DATA_JSON=/path/data.json node tools/security/xss-probe.js   ← شكل بيانات حقيقية (النتيجة أعداد ومسارات حقول بس)
//   WEB_MODE=1 ...                                          ← فوق السيرفر الحقيقي
//   XSS_ALL=1                                               ← يحقن في الأرقام والتواريخ والحالات كمان
//   XSS_REPORT=path.json                                    ← حفظ التقرير
// الخروج بكود 1 لو فيه أي تنفيذ أو عنصر محقون.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { openApp, WEB } = require(path.join(ROOT, 'tests-merge/harness'));
const { baseUser } = require(path.join(ROOT, 'tests-merge/lib'));
const { buildSeed } = require('./xss-seed');

// قيم لازم تفضل زي ما هي عشان الصفحات تلاقي السجلات (معرّفات، تواريخ، أرقام، حالات)
const KEEP_KEY = /^(id|_id|key|_rev|status|state|type|kind|role|method|direction|mode|source|period|frequency|priority|gender|currency|personKind|personType|ownerType|category|section|unit|color|icon)$|Id$|Ids$|Date$|At$|^date|^time|Key$/;
const KEEP_VAL = /^(\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}|-?\d+(\.\d+)?|true|false)/;
// XSS_ALL=1: يحقن في كل شيء (أرقام وتواريخ وحالات كمان) ما عدا المعرّفات — بعض الصفحات هتفلتر السجلات أو ترمي، بس بيكشف المواضع اللي بتطبع أرقام/تواريخ من غير ترميز
const ALL = process.env.XSS_ALL === '1';
const ID_KEY = /^(id|_id|_rev)$|Id$|Ids$/;
const SKIP_TOP = new Set(['users', 'schemaVersion', 'formLayouts', 'tableLayouts', 'formCols', 'autoFields', 'deadFields', 'customFieldDefs', '_cfRegKeys', '_cfAligned', '_cfAligned2', 'alertState', 'projectLinksLog']);

function inject(data) {
  const map = []; // tag → مسار الحقل (من غير قيم)
  const tagFor = (p) => { const i = map.length; map.push(p); return i; };
  const payload = (i) => `"'><img src=x onerror=__xss(${i})>X${i}`;
  const walk = (v, p, key) => {
    if (ALL && (typeof v === 'string' || typeof v === 'number')) return key && ID_KEY.test(key) ? v : payload(tagFor(p));
    if (typeof v === 'string') {
      if (key && KEEP_KEY.test(key)) return v;
      if (KEEP_VAL.test(v) || v === '') return v;
      return payload(tagFor(p));
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, p + '[]', key));
    if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = walk(x, p + '.' + k, k); return o; }
    return v;
  };
  const out = {};
  for (const [k, v] of Object.entries(data)) out[k] = SKIP_TOP.has(k) ? v : walk(v, k, k);
  // نفس المسار بيتكرر في كل سجل → نختصر الخريطة لمسار عام (collection[].field)
  return { data: out, map };
}

(async () => {
  const real = !!process.env.DATA_JSON;
  const src = real ? JSON.parse(fs.readFileSync(process.env.DATA_JSON, 'utf8')) : buildSeed();
  const { data: seed, map } = inject(src);
  if (!WEB) seed.users = [baseUser];
  const { browser, page, errors } = await openApp(seed);
  await page.evaluate(() => {
    window.__xssHits = new Set(); window.__xss = (i) => window.__xssHits.add(i);
    // وضع الويب: عدّ مخالفات CSP (المُنفَّذة = حاجة اتمنعت فعلًا؛ Report-Only = المتبقي قبل إزالة unsafe-inline)
    window.__csp = {};
    document.addEventListener('securitypolicyviolation', (e) => { const k = e.disposition + ' ' + e.effectiveDirective + ' ' + (e.blockedURI || ''); window.__csp[k] = (window.__csp[k] || 0) + 1; });
  });
  const inv = require(path.join(ROOT, 'docs/audit/feature-inventory.json'));
  const keys = inv.pages.map((p) => p.key);
  const pages = [];
  const scan = () => page.evaluate(() => {
    const injected = [...document.querySelectorAll('img[src="x"]')].map((e) => (e.getAttribute('onerror') || '').replace(/\D/g, ''));
    const handlers = [];
    for (const el of document.querySelectorAll('*')) if (!(el.tagName === 'IMG' && el.getAttribute('src') === 'x')) for (const a of el.attributes) if (/^on/i.test(a.name) && a.value.includes('__xss')) handlers.push((a.value.match(/__xss\((\d+)/) || [])[1]);
    const hits = [...window.__xssHits]; window.__xssHits.clear();
    return { injected, handlers, hits };
  });
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  page.on('popup', (p) => p.close().catch(() => {}));
  const go = (key) => page.evaluate((key) => { try { closeModal(); } catch (e) {} try { goToPage(key); } catch (e) { /* الصفحة نفسها بترمي — مش موضوعنا */ } }, key);
  // أزرار آمنة للفتح (تعديل/إضافة/عرض/تفاصيل) — مش حذف ولا تصدير ولا طباعة ولا استيراد
  const OPEN = /✏️|تعديل|إضافة|اضافة|جديد|➕|＋|^\+|عرض|تفاصيل|👁|كشف/;
  const AVOID = /حذف|🗑|مسح|استيراد|تصدير|طباعة|🖨|🧾|PDF|Excel|xlsx|نسخ احتياطي|استعادة|خروج|اعتماد|رفض|موافقة|✓|✗|ترحيل|إقفال|دمج|توحيد|حفظ|💾/;
  const MAX_CLICKS = Number(process.env.XSS_CLICKS || 8);
  for (const key of keys) {
    await go(key);
    await page.waitForTimeout(150);
    pages.push({ key, ...(await scan()) });
    // بعد كده: افتح نوافذ التعديل/الإضافة/التفاصيل (القيم بتتطبع في value="" و<option> وعناوين)
    const n = await page.evaluate(({ OPEN, AVOID }) => {
      const o = new RegExp(OPEN), a = new RegExp(AVOID);
      const root = document.querySelector('.page') || document.querySelector('#app');
      const seen = new Set(); const btns = [];
      for (const b of root.querySelectorAll('button, a.btn, [role=button]')) { const t = (b.innerText || b.title || '').trim(); if (!t || b.disabled || a.test(t) || !o.test(t) || seen.has(t)) continue; seen.add(t); b.setAttribute('data-xss-click', String(btns.length)); btns.push(t); }
      return btns.length;
    }, { OPEN: OPEN.source, AVOID: AVOID.source });
    for (let i = 0; i < Math.min(n, MAX_CLICKS); i++) {
      const clicked = await page.evaluate((i) => { const b = document.querySelector(`[data-xss-click="${i}"]`); if (!b) return false; try { b.click(); } catch (e) {} return true; }, i);
      if (!clicked) { await go(key); await page.waitForTimeout(100); await page.evaluate(({ OPEN, AVOID, i }) => { const o = new RegExp(OPEN), a = new RegExp(AVOID); const root = document.querySelector('.page') || document.querySelector('#app'); const seen = new Set(); let k = 0; for (const b of root.querySelectorAll('button, a.btn, [role=button]')) { const t = (b.innerText || b.title || '').trim(); if (!t || b.disabled || a.test(t) || !o.test(t) || seen.has(t)) continue; seen.add(t); if (k === i) { try { b.click(); } catch (e) {} } k++; } }, { OPEN: OPEN.source, AVOID: AVOID.source, i }); }
      await page.waitForTimeout(150);
      pages.push({ key: key + ' › click#' + i, ...(await scan()) });
      await page.evaluate(() => { try { closeModal(); } catch (e) {} });
    }
  }
  await page.waitForTimeout(300);
  const final = await page.evaluate(() => [...window.__xssHits]);
  const csp = await page.evaluate(() => window.__csp);
  await browser.close();
  const gen = (i) => map[Number(i)] ? map[Number(i)].replace(/\[\]\.?/g, '[].').replace(/\.$/, '') : '?' + i;
  const summarize = (field) => { const s = {}; for (const p of pages) for (const i of p[field]) { const g = gen(i); (s[g] = s[g] || new Set()).add(p.key); } return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, [...v]])); };
  const report = {
    mode: WEB ? 'web' : 'file', data: real ? 'real-shape (values replaced)' : 'synthetic', injectedValues: map.length, pages: keys.length,
    executed: summarize('hits'), injectedElements: summarize('injected'), inlineHandlerContext: summarize('handlers'),
    cspViolations: csp, views: pages.length, executedTotal: new Set(final).size, jsErrors: errors.length, jsErrorSamples: errors.slice(0, 5).map((e) => e.slice(0, 200)),
  };
  if (process.env.XSS_REPORT) fs.writeFileSync(process.env.XSS_REPORT, JSON.stringify(report, null, 1));
  const nExec = Object.keys(report.executed).length, nInj = Object.keys(report.injectedElements).length, nH = Object.keys(report.inlineHandlerContext).length;
  console.log(`XSS probe (${report.mode}, ${report.data}): ${map.length} injected values, ${keys.length} pages, ${pages.length} views (pages + opened dialogs)`);
  console.log(`  executed sinks: ${nExec} · injected-element sinks: ${nInj} · inline-handler sinks: ${nH} · js errors: ${errors.length}`);
  if (nExec || nInj) console.log(JSON.stringify({ executed: report.executed, injectedElements: report.injectedElements }, null, 1));
  if (Object.keys(csp).length) console.log('CSP violations (disposition directive blocked):', JSON.stringify(csp));
  if (nH) console.log('inline-handler context (needs JS-string escaping):', JSON.stringify(report.inlineHandlerContext, null, 1));
  process.exit(nExec || nInj || nH ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
