#!/usr/bin/env node
/* =====================================================================
   css-merge.js — دمج CSS الدفتر في CSS البرنامج الموحّد (مرة واحدة، من غير مكتبات)
   التشغيل: node tools/merge/css-merge.js <ledger-style.css> <hr-style.css> <out ledger.css>
   القواعد:
     - قاعدة موجودة في الدفتر وناقصة في HR            → تتضاف زي ما هي (كلاسات جديدة بس)
     - نفس المحدد ونفس الخصائص                        → تتخطى (مكررة)
     - نفس المحدد وخصائص مختلفة                       → تتضاف بنطاق  body.module-ledger  (مظهر الدفتر يفضل زي الأصل)
     - html / body                                     → تتخطى (الإطار الموحّد هو اللي بيتحكم)
     - :root (متغيرات)                                 → لو مختلفة: بتتحصر في body.module-ledger
   ===================================================================== */
const fs = require('fs');
const [, , ledgerPath, hrPath, outPath] = process.argv;

function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, ''); }

/** يرجّع قائمة عناصر: {ctx:[at-rules], sel, body, atomic} */
function parseCss(css, ctx = []) {
  const out = []; let i = 0; const n = css.length;
  while (i < n) {
    while (i < n && /\s/.test(css[i])) i++;
    if (i >= n) break;
    let j = i, depthStr = null;
    while (j < n && css[j] !== '{' && css[j] !== ';') { j++; }
    const prelude = css.slice(i, j).trim();
    if (j >= n) break;
    if (css[j] === ';') { if (prelude) out.push({ ctx, sel: prelude, body: null, atomic: true, stmt: true }); i = j + 1; continue; }
    // find matching }
    let depth = 1, k = j + 1;
    while (k < n && depth > 0) {
      const c = css[k];
      if (c === '"' || c === "'") { const q = c; k++; while (k < n && css[k] !== q) { if (css[k] === '\\') k++; k++; } }
      else if (c === '{') depth++;
      else if (c === '}') depth--;
      k++;
    }
    const inner = css.slice(j + 1, k - 1);
    if (/^@(media|supports|layer|container)\b/i.test(prelude)) out.push(...parseCss(inner, ctx.concat(prelude.replace(/\s+/g, ' '))));
    else if (/^@/.test(prelude)) out.push({ ctx, sel: prelude.replace(/\s+/g, ' '), body: inner, atomic: true });
    else out.push({ ctx, sel: prelude.replace(/\s+/g, ' '), body: inner, atomic: false });
    i = k;
  }
  return out;
}
function normDecls(body) {
  return body.split(';').map(d => d.trim()).filter(Boolean).map(d => {
    const idx = d.indexOf(':'); if (idx < 0) return d;
    return d.slice(0, idx).trim().toLowerCase() + ':' + d.slice(idx + 1).trim().replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',');
  }).sort().join(';');
}
const key = (r) => r.ctx.join(' >> ') + ' || ' + r.sel;

const ledger = parseCss(stripComments(fs.readFileSync(ledgerPath, 'utf8')));
const hr = parseCss(stripComments(fs.readFileSync(hrPath, 'utf8')));
const hrMap = new Map();
for (const r of hr) { const k = key(r); (hrMap.get(k) || hrMap.set(k, []).get(k)).push(r); }

const SCOPE = 'body.module-ledger';
const SHELL_OWNED = /^(\.nav\b|\.nav-btn|\.view-controls|\.settings-|html\s*,\s*body|\.top\b|\.brand)/;
function scopeSelector(sel) {
  return sel.split(',').map(s => {
    s = s.trim();
    if (s === ':root' || s === 'html' || s === 'body') return SCOPE;
    if (/^(html|body)\b/.test(s)) return s.replace(/^(html|body)\b/, SCOPE);
    return SCOPE + ' ' + s;
  }).join(',\n');
}

const stats = { new: 0, same: 0, scoped: 0, skipped: 0, atomic: 0 };
const outRules = [], report = { scoped: [], skipped: [], atomicDiff: [] };
for (const r of ledger) {
  if (r.stmt) { continue; }                                                   // @import / @charset
  const k = key(r), same = hrMap.get(k);
  if (r.atomic) {                                                              // @keyframes / @font-face
    if (same && same.some(h => normDecls(h.body) === normDecls(r.body) || h.body.replace(/\s+/g, '') === r.body.replace(/\s+/g, ''))) { stats.same++; continue; }
    if (same) { report.atomicDiff.push(r.sel); stats.atomic++; continue; }
    outRules.push(r); stats.new++; continue;
  }
  if (/^(html|body)$/.test(r.sel.trim()) && !same) { stats.skipped++; report.skipped.push(r.sel); continue; }
  if (/^(html|body)$/.test(r.sel.trim())) { stats.skipped++; report.skipped.push(r.sel); continue; }
  if (!same) { outRules.push(r); stats.new++; continue; }
  if (same.some(h => normDecls(h.body) === normDecls(r.body))) { stats.same++; continue; }
  if (SHELL_OWNED.test(r.sel.trim())) { stats.skipped++; report.skipped.push(r.sel); continue; }   // قوائم/إعدادات/هيدر: الإطار الموحّد هو اللي بيحدد شكلها
  outRules.push(Object.assign({}, r, { sel: scopeSelector(r.sel) })); stats.scoped++; report.scoped.push(r.sel);
}
// تجميع حسب سياق @media
let css = '/* ledger.css — مولَّد بـ tools/merge/css-merge.js: قواعد الدفتر الناقصة في الإطار الموحّد، والمختلفة محصورة في body.module-ledger */\n';
const byCtx = new Map();
for (const r of outRules) { const c = r.ctx.join(' ||| '); (byCtx.get(c) || byCtx.set(c, []).get(c)).push(r); }
for (const [c, rs] of byCtx) {
  const body = rs.map(r => r.atomic ? (r.sel + ' {' + r.body + '}') : (r.sel + ' {' + r.body.trim().replace(/\n\s*/g, ' ') + '}')).join('\n');
  if (!c) css += body + '\n';
  else css += c.split(' ||| ').reduceRight((acc, at) => at + ' {\n' + acc + '\n}', body) + '\n';
}
fs.writeFileSync(outPath, css);
console.log('ledger rules:', ledger.length, ' HR rules:', hr.length);
console.log(JSON.stringify(stats));
console.log('skipped:', report.skipped.join(' | '));
console.log('atomic differing (kept HR):', report.atomicDiff.join(' | '));
console.log('scoped selectors (' + report.scoped.length + '):', report.scoped.slice(0, 40).join(' | '));
