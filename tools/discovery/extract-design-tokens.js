// استخراج design tokens من الواجهة القديمة (خطة v1.4.5 — المرحلة 3، البند 3.5؛ 04 §4.2).
// قراءة بس: (1) متغيّرات CSS والقيم المتكررة في ملفات الـ CSS، (2) الشكل المحسوب فعليًا في المتصفح
// لعناصر أساسية (الأزرار، القايمة، الجداول، الخانات، النوافذ، الكروت). على بيانات مُركّبة.
// المخرجات: docs/discovery/tokens.json + DESIGN_TOKENS.md
// التشغيل: node tools/discovery/extract-design-tokens.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'docs/discovery');
const { openFileApp } = require(path.join(ROOT, 'tests-merge/harness'));
const { baseUser } = require(path.join(ROOT, 'tests-merge/lib'));
const { buildSeed } = require(path.join(ROOT, 'tools/security/xss-seed'));

const CSS_FILES = ['renderer/styles/style.css', 'renderer/modules/ledger/ledger.css'].filter((f) => fs.existsSync(path.join(ROOT, f)));
const css = CSS_FILES.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');

// ---------------------------------------------------------------- (1) من ملفات الـ CSS
const vars = {};
for (const m of css.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)) if (!(m[1] in vars)) vars[m[1]] = m[2].trim();
const freq = (re, src = css, norm = (x) => x) => { const c = {}; for (const m of src.matchAll(re)) { const k = norm(m[1]); c[k] = (c[k] || 0) + 1; } return Object.entries(c).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); };
const normColor = (c) => { c = c.trim().toLowerCase(); if (/^#[0-9a-f]{3}$/.test(c)) c = '#' + [...c.slice(1)].map((x) => x + x).join(''); return c.replace(/\s+/g, ''); };
const decl = (prop) => new RegExp(`(?:^|[;{\\s])${prop}\\s*:\\s*([^;}!]+)`, 'gm');
const tokensCss = {
  files: CSS_FILES,
  cssVariables: vars,
  colors: freq(/(#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\))/g, css, normColor).slice(0, 40),
  fontFamilies: freq(decl('font-family'), css, (x) => x.trim()).slice(0, 10),
  fontSizes: freq(decl('font-size'), css, (x) => x.trim()).slice(0, 25),
  fontWeights: freq(decl('font-weight'), css, (x) => x.trim()).slice(0, 10),
  radii: freq(decl('border-radius'), css, (x) => x.trim()).slice(0, 20),
  shadows: freq(decl('box-shadow'), css, (x) => x.trim()).slice(0, 15),
  paddings: freq(decl('padding'), css, (x) => x.trim()).slice(0, 25),
  gaps: freq(decl('gap'), css, (x) => x.trim()).slice(0, 15),
  breakpoints: freq(/@media[^{]*?\((?:max|min)-width\s*:\s*(\d+px)\)/g).slice(0, 15),
};

(async () => {
  // ---------------------------------------------------------------- (2) الشكل المحسوب في المتصفح
  const seed = buildSeed(); seed.users = [baseUser];
  const { browser, page } = await openFileApp(seed);
  await page.setViewportSize({ width: 1366, height: 768 });
  const PROPS = ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'borderRadius', 'borderTopColor', 'borderTopWidth', 'boxShadow', 'paddingTop', 'paddingRight', 'height'];
  const probe = async (pageKey, sel, open) => page.evaluate(({ pageKey, sel, open, PROPS }) => {
    try { closeModal(); } catch (e) {}
    try { goToPage(pageKey); } catch (e) {}
    if (open) { const b = [...document.querySelectorAll('.page button, #app button')].find((x) => (x.innerText || '').includes(open)); if (b) b.click(); }
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const o = {}; for (const p of PROPS) o[p] = cs[p];
    return o;
  }, { pageKey, sel, open, PROPS });
  // كل عنصر: أول صفحة فيها العنصر ده (بالترتيب ده)، عشان مش كل صفحة فيها جداول أو خانات
  const PAGE_ORDER = ['dashboard', 'clients.contracts', 'clients.customers', 'ledger.suppliers', 'warehouses.home', 'employees', 'projects', 'expenses', 'users', 'backup',
    ...JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audit/feature-inventory.json'), 'utf8')).pages.map((p) => p.key)];
  const SAMPLES = [
    ['body', 'body'],
    ['header', '.top'],
    ['section nav button (active)', 'nav.nav-sections .nav-btn.active'],
    ['section nav button', 'nav.nav-sections .nav-btn:not(.active)'],
    ['page nav button (active)', 'nav.nav-pages .nav-btn.active'],
    ['page nav button', 'nav.nav-pages .nav-btn:not(.active)'],
    ['primary button', '.page-content-zoom .btn-primary'],
    ['outline button', '.page-content-zoom .btn-outline'],
    ['board card', '.board-card'],
    ['stat card', '.stat-card, .stats-row > *'],
    ['table header cell', '.page-content-zoom table thead th'],
    ['table body cell', '.page-content-zoom table tbody td'],
    ['text input', '.page-content-zoom input[type=text], .page-content-zoom input[type=search]'],
    ['select', '.page-content-zoom select'],
    ['badge', '.nav-badge'],
    ['debt amount', '.debt, .neg, .amount-debt'],
    ['credit amount', '.credit, .pos, .amount-credit'],
  ];
  const computed = {};
  for (const [name, sel] of SAMPLES) {
    let found = null;
    for (const key of [...new Set(PAGE_ORDER)]) { const st = await probe(key, sel); if (st) { found = { page: key, selector: sel, style: st }; break; } }
    computed[name] = found || { page: '—', selector: sel, style: null };
  }
  // النافذة: أول زرار إضافة في صفحة العقود
  for (const [name, sel] of [['modal', '.modal-overlay .modal'], ['modal header', '.modal-overlay .modal-header, .modal-overlay .modal h3']]) {
    computed[name] = { page: 'clients.contracts', selector: sel, style: await probe('clients.contracts', sel, '+ عقد') };
  }
  await browser.close();

  const tokens = { generatedBy: 'tools/discovery/extract-design-tokens.js', source: 'renderer (legacy UI), synthetic data', css: tokensCss, computed };
  fs.writeFileSync(path.join(OUT, 'tokens.json'), JSON.stringify(tokens, null, 1) + '\n');

  // ---------------------------------------------------------------- DESIGN_TOKENS.md
  const sw = (c) => (/^#|^rgb/.test(c) ? `\`${c}\`` : c);
  const list = (arr, n = 12) => arr.slice(0, n).map(([v, k]) => `${sw(v)} (${k})`).join(' · ');
  let md = `# Design tokens للواجهة القديمة (خطة v1.4.5 — المرحلة 3)

> **مولَّد** بـ \`node tools/discovery/extract-design-tokens.js\` من ${CSS_FILES.map((f) => `\`${f}\``).join(' و')} + الشكل المحسوب في المتصفح. المصدر الكامل: \`tokens.json\`.
> **الغرض:** الواجهة الجديدة (Angular Material) لازم **تحافظ على الهوية البصرية الحالية** (\`01\` §3 مبدأ 2، و\`04\` §4.2). الجدول ده هو المرجع، واللقطات في \`visual-baseline/\`.
> القيم اللي بين قوسين = عدد مرات التكرار في الـ CSS.

## 1. متغيّرات CSS (الألوان الأساسية للهوية)
| المتغيّر | القيمة | الاستخدام (من الاسم) |
|---|---|---|
${Object.entries(vars).map(([k, v]) => `| \`${k}\` | \`${v}\` | ${({ '--paper': 'خلفية الصفحة (ورقي)', '--paper-2': 'خلفية ثانوية', '--ink': 'النص الأساسي', '--ink-soft': 'النص الثانوي', '--ledger-green': 'اللون الأساسي (أخضر الدفتر)', '--ledger-green-2': 'الأساسي الفاتح', '--accent': 'لون التمييز = الأخضر', '--accent-2': 'لون التمييز الفاتح', '--gold': 'ذهبي (تمييز ثانوي)', '--gold-soft': 'ذهبي فاتح', '--debt': 'مدين / سالب (أحمر)', '--credit': 'دائن / موجب (أخضر)', '--line': 'الحدود والفواصل', '--card': 'خلفية الكروت', '--shadow': 'ظل الكروت' })[k] || '—'} |`).join('\n')}

## 2. القيم المتكررة في الـ CSS
| النوع | الأكثر استخدامًا |
|---|---|
| الألوان | ${list(tokensCss.colors, 16)} |
| الخطوط | ${list(tokensCss.fontFamilies, 6)} |
| مقاسات الخط | ${list(tokensCss.fontSizes, 14)} |
| أوزان الخط | ${list(tokensCss.fontWeights, 6)} |
| الحواف (radius) | ${list(tokensCss.radii, 10)} |
| الظلال | ${list(tokensCss.shadows, 6)} |
| الحشو (padding) | ${list(tokensCss.paddings, 12)} |
| المسافات (gap) | ${list(tokensCss.gaps, 10)} |
| نقاط التجاوب (breakpoints) | ${list(tokensCss.breakpoints, 12)} |

## 3. الشكل المحسوب فعليًا للعناصر الأساسية (1366×768)
| العنصر | الصفحة | اللون | الخلفية | الخط | المقاس/الوزن | الحواف | الحد | الظل | الحشو | الارتفاع |
|---|---|---|---|---|---|---|---|---|---|---|
${Object.entries(computed).map(([n, c]) => { const s = c.style; if (!s) return `| ${n} | \`${c.page}\` | (مش موجود في الصفحة دي) | | | | | | | | |`; return `| ${n} | \`${c.page}\` | \`${s.color}\` | \`${s.backgroundColor}\` | ${s.fontFamily.split(',')[0].replace(/"/g, '')} | ${s.fontSize} / ${s.fontWeight} | ${s.borderRadius} | ${s.borderTopWidth} \`${s.borderTopColor}\` | ${s.boxShadow === 'none' ? '—' : `\`${s.boxShadow.slice(0, 40)}\``} | ${s.paddingTop} ${s.paddingRight} | ${s.height} |`; }).join('\n')}

## 4. ملاحظات للواجهة الجديدة (مقترحات، مش قرارات)
- **اللوحة:** أساسي أخضر \`${vars['--ledger-green'] || ''}\` على خلفية ورقية \`${vars['--paper'] || ''}\`، وكروت \`${vars['--card'] || ''}\`، وذهبي للتمييز الثانوي. ثيم Material لازم يتبني من القيم دي (primary = الأخضر، surface = الورقي).
- **الألوان المالية:** مدين \`${vars['--debt'] || ''}\` ودائن \`${vars['--credit'] || ''}\`. ده معنى عمل، مش زينة، ولازم يتحافظ عليه في كل الأرصدة.
- **الاتجاه:** عربي من اليمين للشمال في كل الصفحات.
- **التجاوب:** أهم نقاط الكسر: ${tokensCss.breakpoints.slice(0, 5).map(([v]) => v).join('، ')}.
- **المقارنة البصرية الآلية (TECH: visual-regression):** بتستخدم اللقطات في \`visual-baseline/\` بنفس البيانات المُركّبة ونفس التاريخ الثابت.
`;
  fs.writeFileSync(path.join(OUT, 'DESIGN_TOKENS.md'), md);
  console.log(`tokens: ${Object.keys(vars).length} css vars, ${tokensCss.colors.length} colors, ${Object.values(computed).filter((c) => c.style).length}/${Object.keys(computed).length} computed samples`);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
