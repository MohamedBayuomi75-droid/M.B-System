/* eslint-disable no-console */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { inspectFile } from '../files/file-inspector';
import { scanPdf } from '../files/pdf-scan';

/**
 * فحص مجلد ملفات بفاحص المرفقات نفسه (خطة v1.4.5 — المرحلة 5، البند 5.2: إثبات B-78 على المرفقات الحقيقية).
 *   node dist/cli/inspect-files.js <مجلد>
 * قراءة بس: مابيكتبش ولا بيعدّل أي ملف. المخرج **أعداد وأكواد بس** — مفيش أسماء ملفات ولا محتوى.
 * وبيتأكد إن الفحص مابيغيّرش الملف (البصمة قبل وبعد).
 */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
}
const dir = process.argv[2];
if (!dir) { console.error('الاستخدام: inspect-files <مجلد>'); process.exit(2); }
const byCode: Record<string, number> = {};
const pdf = { total: 0, encrypted: 0, encryptedAccepted: 0 };
let files = 0, bytes = 0, changed = 0;
for (const f of walk(dir)) {
  const b = readFileSync(f); const before = createHash('sha256').update(b).digest('hex');
  const r = inspectFile(b, f);
  if (createHash('sha256').update(b).digest('hex') !== before) changed++;
  files++; bytes += b.length;
  const code = r.ok ? `OK (${r.kind})` : r.code;
  byCode[code] = (byCode[code] ?? 0) + 1;
  if (b.subarray(0, 5).toString('latin1') === '%PDF-') {
    pdf.total++;
    const s = scanPdf(b);
    const enc = s.ok ? s.encrypted : /\/Encrypt\b/.test(b.toString('latin1'));
    if (enc) { pdf.encrypted++; if (r.ok) pdf.encryptedAccepted++; }
  }
}
console.log(JSON.stringify({ files, bytes, results: byCode, pdf, unchangedByScan: changed === 0 }, null, 2));
