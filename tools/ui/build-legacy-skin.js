// «جلد» الواجهة القديمة للشاشات الجديدة (خطة v1.4.5 — المرحلة 6، قرار DEC-0093 (أ): تطابق كامل في الشكل).
// بياخد CSS الواجهة القديمة زي ما هو (renderer/styles/style.css + modules/ledger/ledger.css) ويحصره جوه كلاسين،
// عشان شاشات /app/ تلبس نفس الشكل بالظبط من غير ما تأثر على صفحات Angular Material التانية:
//   - :root و html و body  ← .lx-root   (غلاف التطبيق كله: المتغيّرات، والخط، والخلفية، وكلاسات الكثافة)
//   - أي selector تاني      ← .lx <selector>   (.lx بيتحط على الترويسة والتبويبات وشاشات الموديولات المطابقة بس)
//   - rem ← px على مقاس الواجهة القديمة (html{font-size:15px})، لأن /app/ مقاسه الأساسي مختلف
// المخرج مولَّد: frontend/src/legacy-skin.css، وأقسام التنقل frontend/src/app/core/legacy-nav.ts. ماتعدّلوش باليد — أي تعديل في شكل القديمة بيتنقل بإعادة التوليد.
// التشغيل: node tools/ui/build-legacy-skin.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const postcss = require(path.join(ROOT, 'frontend/node_modules/postcss'));

const SOURCES = ['renderer/styles/style.css', 'renderer/modules/ledger/ledger.css'];
const OUT = path.join(ROOT, 'frontend/src/legacy-skin.css');
const BASE_PX = 15; // renderer/styles/style.css: html{ font-size: 15px; }

function mapSelector(sel) {
  let s = sel.trim();
  if (!s) return s;
  // html body X / html X / body X / :root  ← .lx-root (مع الاحتفاظ باللي لازق فيه: .class أو :pseudo أو [attr])
  const m = s.match(/^(?:html\s+body|html|body|:root)(?=$|[\s.:#[>+~,])/);
  if (m) {
    // الجزء اللي بعد الـ body (لو فيه عنصر جوه) بيتحصر في .lx كمان: body.density-compact table ← .lx-root.density-compact .lx table
    const rest = s.slice(m[0].length);
    const sp = rest.search(/\s*[\s>+~]\s*(?=[^\s>+~])/);
    if (sp < 0) return '.lx-root' + rest;
    const head = rest.slice(0, sp); const tail = rest.slice(sp).replace(/^\s*>\s*/, ' ').trim();
    return `.lx-root${head} .lx ${tail}`;
  }
  return '.lx ' + s;
}

function transform(root) {
  root.walkComments((c) => c.remove());
  root.walkRules((rule) => {
    // قواعد جوه @keyframes (from/to/50%) مابتتغيّرش
    if (rule.parent && rule.parent.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
    rule.selectors = rule.selectors.map(mapSelector);
  });
  root.walkDecls((d) => {
    if (/\drem\b/.test(d.value)) d.value = d.value.replace(/(-?\d*\.?\d+)rem\b/g, (_, n) => `${+(Number(n) * BASE_PX).toFixed(3)}px`);
  });
  return root;
}

let css = `/* مولَّد بـ tools/ui/build-legacy-skin.js من ${SOURCES.join(' + ')} — ماتعدّلش الملف باليد (DEC-0093) */\n`;
for (const src of SOURCES) {
  const root = postcss.parse(fs.readFileSync(path.join(ROOT, src), 'utf8'), { from: src });
  css += `\n/* ---- ${src} ---- */\n` + transform(root).toString().replace(/\n{3,}/g, '\n\n') + '\n';
}

// أقسام التنقل وصفحاتها بنفس ترتيب الواجهة القديمة وأسمائها (renderer/core/modules.js NAV_SECTIONS) ← frontend/src/app/core/legacy-nav.ts
const vm = require('vm');
const modSrc = fs.readFileSync(path.join(ROOT, 'renderer/core/modules.js'), 'utf8');
const navSrc = modSrc.slice(modSrc.indexOf('const NAV_SECTIONS'), modSrc.indexOf('];', modSrc.indexOf('const NAV_SECTIONS')) + 2);
const sections = vm.runInNewContext(navSrc.replace('const NAV_SECTIONS', 'NAV_SECTIONS') + '; NAV_SECTIONS', {});
const NAV_OUT = path.join(ROOT, 'frontend/src/app/core/legacy-nav.ts');
const nav = `// مولَّد بـ tools/ui/build-legacy-skin.js من renderer/core/modules.js (NAV_SECTIONS) — ماتعدّلش الملف باليد (DEC-0093)
export interface LegacyNavSection { id: string; label: string; pages: readonly (readonly [key: string, label: string])[] }
export const LEGACY_NAV: readonly LegacyNavSection[] = ${JSON.stringify(sections.map((x) => ({ id: x.id, label: x.label, pages: x.pages })), null, 2)};
`;

const outputs = [[OUT, css], [NAV_OUT, nav]];
if (process.argv.includes('--check')) {
  const stale = outputs.filter(([f, c]) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== c).map(([f]) => path.relative(ROOT, f));
  if (stale.length) { console.error(`stale: ${stale.join(', ')} (node tools/ui/build-legacy-skin.js)`); process.exit(1); }
  console.log('legacy skin up to date');
} else { for (const [f, c] of outputs) fs.writeFileSync(f, c); console.log(`legacy skin written: ${(css.length / 1024).toFixed(0)} KB + ${sections.length} nav sections`); }
