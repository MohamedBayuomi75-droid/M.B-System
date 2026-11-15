// يشغّل كل اختبارات tests-merge (phase*.js + pages-smoke.js) ويطبع ملخص.
// التشغيل: npm run test:ui   (أو: node tests-merge/run-all.js phase2 phase3)
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const only = process.argv.slice(2);
const files = fs.readdirSync(dir)
  .filter(f => /^(phase\d+|pages-smoke)\.js$/.test(f))
  .filter(f => !only.length || only.includes(f.replace(/\.js$/, '')))
  .sort((a, b) => (parseInt(a.replace(/\D/g, '')) || 999) - (parseInt(b.replace(/\D/g, '')) || 999));
const results = [];
for (const f of files) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8', timeout: 180000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/(\d+) passed, (\d+) failed/);
  const okRun = r.status === 0;
  results.push({ f, ok: okRun, pass: m ? +m[1] : 0, fail: m ? +m[2] : (okRun ? 0 : 1), ms: Date.now() - t0 });
  console.log(`${okRun ? 'PASS' : 'FAIL'} ${f}  (${m ? m[0] : 'no summary'})  ${Date.now() - t0}ms`);
  if (!okRun) console.log(out.split('\n').filter(l => /✗|Error|FAILED|JS ERRORS/.test(l)).slice(0, 12).map(l => '    ' + l).join('\n'));
}
const bad = results.filter(r => !r.ok);
const tp = results.reduce((a, r) => a + r.pass, 0), tf = results.reduce((a, r) => a + r.fail, 0);
console.log(`\nUI TESTS: ${results.length - bad.length}/${results.length} files passed — ${tp} assertions passed, ${tf} failed`);
process.exit(bad.length ? 1 : 0);
