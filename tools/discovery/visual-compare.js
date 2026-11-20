// المقارنة البصرية مع خط الأساس (خطة v1.4.5 — المرحلة 4، البند 4.2؛ 04 §4.3).
// بيصوّر الواجهة القديمة تاني (discover-pages.js --out، نفس البيانات المُركّبة والتاريخ الثابت) في مجلد مؤقت،
// وبيقارن كل لقطة بخط الأساس (docs/discovery/visual-baseline/) بكسل ببكسل مع سماحية في اللون.
// من غير أي مكتبة: قارئ/كاتب PNG بسيط بـ zlib المدمجة (8-bit RGB/RGBA، من غير interlace — شكل لقطات Chromium).
//
// التشغيل: node tools/discovery/visual-compare.js [--out <dir>] [--tolerance 24] [--max-ratio 0] [--skip-capture]
//   --out          مجلد التقرير واللقطات الجديدة (الافتراضي: مجلد مؤقت)
//   --tolerance    أقصى فرق مقبول في أي قناة لون للبكسل الواحد (0–255)
//   --max-ratio    أقصى نسبة بكسلات مختلفة مقبولة في اللقطة الواحدة (الافتراضي 0.0005 = 0.05%)
//   --skip-capture استخدم لقطات موجودة في --out بدل التصوير من جديد
// كود الخروج: 0 لو كل اللقطات في الحدود، 1 لو فيه فروق أو لقطات ناقصة/زيادة.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const BASE = path.join(ROOT, 'docs/discovery/visual-baseline');

const arg = (name, def) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : def; };
const OUT = path.resolve(arg('--out', fs.mkdtempSync(path.join(os.tmpdir(), 'visual-'))));
const TOL = Number(arg('--tolerance', 24));
const MAX_RATIO = Number(arg('--max-ratio', 0.0005)); // 0.05%: رسم النصوص بيفرق بكام بكسل بين تشغيلتين على نفس الجهاز
const SKIP = process.argv.includes('--skip-capture');

// ---------------------------------------------------------------- PNG
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8, width, height, bitDepth, colorType, interlace;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8), data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; interlace = data[12]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8 || interlace !== 0 || ![2, 6].includes(colorType)) throw new Error(`unsupported PNG (depth ${bitDepth}, color ${colorType}, interlace ${interlace})`);
  const bpp = colorType === 6 ? 4 : 3, stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 0xff;
    }
    for (let x = 0; x < width; x++) { const o = (y * width + x) * 4; px[o] = cur[x * bpp]; px[o + 1] = cur[x * bpp + 1]; px[o + 2] = cur[x * bpp + 2]; px[o + 3] = bpp === 4 ? cur[x * bpp + 3] : 255; }
    [prev, cur] = [cur, prev];
  }
  return { width, height, px };
}
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = CRC_TABLE[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function encodePng({ width, height, px }) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) px.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- المقارنة
function compare(a, b) {
  if (a.width !== b.width || a.height !== b.height) return { sizeMismatch: true, diff: null, ratio: 1, changed: null, total: a.width * a.height };
  const total = a.width * a.height, out = Buffer.alloc(total * 4);
  let changed = 0;
  for (let i = 0; i < total; i++) {
    const o = i * 4;
    const d = Math.max(Math.abs(a.px[o] - b.px[o]), Math.abs(a.px[o + 1] - b.px[o + 1]), Math.abs(a.px[o + 2] - b.px[o + 2]));
    if (d > TOL) { changed++; out[o] = 255; out[o + 1] = 0; out[o + 2] = 0; out[o + 3] = 255; }
    else { const g = (a.px[o] + a.px[o + 1] + a.px[o + 2]) / 3; out[o] = out[o + 1] = out[o + 2] = 200 + Math.round(g / 255 * 55); out[o + 3] = 255; } // خلفية باهتة والفرق أحمر
  }
  return { sizeMismatch: false, diff: { width: a.width, height: a.height, px: out }, ratio: changed / total, changed, total };
}

(function main() {
  if (!SKIP) {
    console.log(`capturing into ${OUT} …`);
    const r = spawnSync(process.execPath, [path.join(__dirname, 'discover-pages.js'), '--out', OUT], { stdio: 'inherit' });
    if (r.status !== 0) { console.error('capture failed'); process.exit(1); }
  }
  const NEW = path.join(OUT, 'visual-baseline');
  const DIFF = path.join(OUT, 'diff');
  fs.mkdirSync(DIFF, { recursive: true });
  const list = (root) => (fs.existsSync(root) ? fs.readdirSync(root).flatMap((d) => fs.readdirSync(path.join(root, d)).filter((f) => f.endsWith('.png')).map((f) => `${d}/${f}`)) : []).sort();
  const baseFiles = list(BASE), newFiles = list(NEW);
  const results = [];
  for (const f of baseFiles) {
    if (!newFiles.includes(f)) { results.push({ file: f, status: 'missing' }); continue; }
    const c = compare(decodePng(fs.readFileSync(path.join(BASE, f))), decodePng(fs.readFileSync(path.join(NEW, f))));
    const ok = !c.sizeMismatch && c.ratio <= MAX_RATIO;
    if (!ok && c.diff) { fs.mkdirSync(path.dirname(path.join(DIFF, f)), { recursive: true }); fs.writeFileSync(path.join(DIFF, f), encodePng(c.diff)); }
    results.push({ file: f, status: ok ? 'same' : c.sizeMismatch ? 'size-changed' : 'changed', changed: c.changed, ratio: c.ratio });
  }
  for (const f of newFiles) if (!baseFiles.includes(f)) results.push({ file: f, status: 'new' });
  const bad = results.filter((r) => r.status !== 'same');
  const report = { baseline: path.relative(ROOT, BASE), tolerance: TOL, maxRatio: MAX_RATIO, compared: baseFiles.length, same: results.length - bad.length, problems: bad.length, results };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1) + '\n');
  const md = `# المقارنة البصرية\n\n- خط الأساس: \`${report.baseline}\` · السماحية: ${TOL} لكل قناة · أقصى نسبة: ${MAX_RATIO}\n- اتقارنت ${report.compared} لقطة: **${report.same} متطابقة، و${report.problems} فيها مشكلة**\n\n| اللقطة | الحالة | بكسلات مختلفة | النسبة |\n|---|---|---|---|\n${bad.map((r) => `| ${r.file} | ${r.status} | ${r.changed ?? '—'} | ${r.ratio == null ? '—' : (r.ratio * 100).toFixed(3) + '%'} |`).join('\n') || '| — | كله متطابق | | |'}\n`;
  fs.writeFileSync(path.join(OUT, 'REPORT.md'), md);
  console.log(`visual compare: ${report.compared} compared, ${report.same} same, ${report.problems} problems (report: ${path.join(OUT, 'REPORT.md')})`);
  for (const r of bad.slice(0, 20)) console.log(`  ${r.status.padEnd(12)} ${r.file}${r.ratio != null ? `  ${(r.ratio * 100).toFixed(3)}%` : ''}`);
  process.exit(bad.length ? 1 : 0);
})();
