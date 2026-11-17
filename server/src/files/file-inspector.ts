import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';

/**
 * فاحص الملفات المرفوعة (المرحلة 2 — S-5، القرار B-59):
 *   الأنواع: PDF, JPG, PNG, DOCX, XLSX فقط · الحد 25MB · النوع بيتحدد من **محتوى الملف** (التوقيع) مش الامتداد،
 *   والامتداد لازم يطابق النوع الفعلي · فحص المحتوى: JavaScript/إجراءات تلقائية/ملفات مضمّنة في PDF،
 *   الماكرو وActiveX والملفات التنفيذية والملفات المضغوطة المتضخمة في DOCX/XLSX، صور بأبعاد غير معقولة.
 * دالة نقية (من غير I/O) عشان تتختبر لوحدها وتتستخدم في أي مكان.
 */
export type FileKind = 'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx';

export const FILE_KINDS: Record<FileKind, { mime: string; exts: string[] }> = {
  pdf: { mime: 'application/pdf', exts: ['pdf'] },
  jpg: { mime: 'image/jpeg', exts: ['jpg', 'jpeg'] },
  png: { mime: 'image/png', exts: ['png'] },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', exts: ['docx'] },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', exts: ['xlsx'] },
};

export const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 10_000;
const MAX_ZIP_UNCOMPRESSED = 250 * 1024 * 1024;
const MAX_ZIP_RATIO = 200;
const MAX_IMAGE_PIXELS = 100_000_000; // 10000×10000

export type InspectResult =
  | { ok: true; kind: FileKind; mime: string; size: number; sha256: string; filename: string }
  | { ok: false; code: string; message: string };

const fail = (code: string, message: string): InspectResult => ({ ok: false, code, message });

/** اسم آمن للتخزين والعرض: من غير مسار ولا محارف تحكم، بحد أقصى 200 حرف */
export function safeFilename(name: string): string {
  const base = String(name || '').split(/[\\/]/).pop() || '';
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '_').replace(/^\.+/, '').trim();
  return (clean || 'file').slice(-200);
}

export function inspectFile(buf: Buffer, originalName: string, maxBytes = DEFAULT_MAX_BYTES): InspectResult {
  if (!buf || buf.length === 0) return fail('EMPTY', 'الملف فاضي');
  if (buf.length > maxBytes) return fail('TOO_LARGE', `حجم الملف أكبر من الحد المسموح (${Math.round(maxBytes / 1048576)}MB)`);
  const filename = safeFilename(originalName);
  const ext = (filename.match(/\.([A-Za-z0-9]{1,8})$/)?.[1] || '').toLowerCase();
  const kind = detectKind(buf);
  if (!kind) return fail('TYPE_NOT_ALLOWED', 'نوع الملف غير مسموح (المسموح: PDF, JPG, PNG, DOCX, XLSX)');
  if (!FILE_KINDS[kind].exts.includes(ext)) return fail('EXTENSION_MISMATCH', `امتداد الملف (.${ext || '—'}) لا يطابق محتواه الفعلي (${kind.toUpperCase()})`);
  const content = kind === 'pdf' ? checkPdf(buf) : kind === 'png' ? checkPng(buf) : kind === 'jpg' ? checkJpeg(buf) : checkOoxml(buf, kind);
  if (content) return content;
  return { ok: true, kind, mime: FILE_KINDS[kind].mime, size: buf.length, sha256: createHash('sha256').update(buf).digest('hex'), filename };
}

function detectKind(b: Buffer): FileKind | null {
  if (b.length >= 5 && b.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length >= 4 && b.readUInt32LE(0) === 0x04034b50) {
    const names = zipEntries(b)?.map((e) => e.name) ?? [];
    if (!names.includes('[Content_Types].xml')) return null;
    if (names.includes('word/document.xml')) return 'docx';
    if (names.includes('xl/workbook.xml')) return 'xlsx';
  }
  return null;
}

// ---------------- PDF ----------------
const PDF_FORBIDDEN: Array<[RegExp, string]> = [
  [/\/JavaScript\b/, 'JavaScript'],
  [/\/JS\b/, 'JavaScript'],
  [/\/Launch\b/, 'تشغيل برامج'],
  [/\/EmbeddedFiles?\b/, 'ملفات مضمّنة'],
  [/\/RichMedia\b/, 'وسائط تفاعلية'],
  [/\/XFA\b/, 'نماذج XFA'],
  [/\/SubmitForm\b/, 'إرسال نماذج'],
  [/\/ImportData\b/, 'استيراد بيانات'],
];
function checkPdf(b: Buffer): InspectResult | null {
  // أسماء PDF ممكن تتكتب بـ #xx (مثلًا /J#61vaScript) — نفكها قبل الفحص
  const text = b.toString('latin1').replace(/#([0-9A-Fa-f]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
  for (const [re, label] of PDF_FORBIDDEN) if (re.test(text)) return fail('PDF_ACTIVE_CONTENT', `ملف PDF يحتوي على محتوى نشط غير مسموح (${label})`);
  if (/\/Encrypt\b/.test(text)) return fail('PDF_ENCRYPTED', 'ملف PDF مشفّر — لا يمكن فحص محتواه');
  if (!text.slice(-2048).includes('%%EOF')) return fail('PDF_TRUNCATED', 'ملف PDF غير مكتمل أو تالف');
  return null;
}

// ---------------- الصور ----------------
function checkPng(b: Buffer): InspectResult | null {
  if (b.length < 33 || b.subarray(12, 16).toString('latin1') !== 'IHDR') return fail('IMAGE_CORRUPT', 'ملف PNG تالف');
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  if (!w || !h || w * h > MAX_IMAGE_PIXELS) return fail('IMAGE_DIMENSIONS', 'أبعاد الصورة غير مقبولة');
  if (b.subarray(-12, -8).readUInt32BE(0) !== 0 || b.subarray(-8, -4).toString('latin1') !== 'IEND') return fail('IMAGE_CORRUPT', 'ملف PNG غير مكتمل أو فيه بيانات زائدة بعد نهايته');
  return null;
}
function checkJpeg(b: Buffer): InspectResult | null {
  // نهاية JPEG (FFD9) لازم تكون في آخر الملف (مسموح بحشو بسيط) — بيانات زائدة كبيرة بعدها = ملف مدمج/مخفي
  const tail = b.subarray(Math.max(0, b.length - 64));
  if (tail.lastIndexOf(Buffer.from([0xff, 0xd9])) < 0) return fail('IMAGE_CORRUPT', 'ملف JPG غير مكتمل أو فيه بيانات زائدة بعد نهايته');
  // الأبعاد من أول SOF
  for (let i = 2; i + 9 < b.length;) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      const h = b.readUInt16BE(i + 5), w = b.readUInt16BE(i + 7);
      if (!w || !h || w * h > MAX_IMAGE_PIXELS) return fail('IMAGE_DIMENSIONS', 'أبعاد الصورة غير مقبولة');
      return null;
    }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return fail('IMAGE_CORRUPT', 'ملف JPG تالف');
}

// ---------------- DOCX / XLSX (ZIP) ----------------
interface ZipEntry { name: string; flags: number; method: number; csize: number; usize: number }

/** قراءة الفهرس المركزي للـ ZIP (من غير فك ضغط) — null لو الملف مش ZIP سليم */
export function zipEntries(b: Buffer): ZipEntry[] | null {
  const min = Math.max(0, b.length - 65557);
  let eocd = -1;
  for (let i = b.length - 22; i >= min; i--) if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return null;
  const count = b.readUInt16LE(eocd + 10);
  const cdSize = b.readUInt32LE(eocd + 12);
  const cdOff = b.readUInt32LE(eocd + 16);
  if (count === 0xffff || cdOff === 0xffffffff || cdOff + cdSize > b.length) return null; // ZIP64 أو فهرس خارج الملف
  const out: ZipEntry[] = [];
  let p = cdOff;
  for (let n = 0; n < count; n++) {
    if (p + 46 > b.length || b.readUInt32LE(p) !== 0x02014b50) return null;
    const flags = b.readUInt16LE(p + 8), method = b.readUInt16LE(p + 10);
    const csize = b.readUInt32LE(p + 20), usize = b.readUInt32LE(p + 24);
    const nl = b.readUInt16LE(p + 28), xl = b.readUInt16LE(p + 30), cl = b.readUInt16LE(p + 32);
    const name = b.subarray(p + 46, p + 46 + nl).toString(flags & 0x800 ? 'utf8' : 'latin1');
    out.push({ name, flags, method, csize, usize });
    p += 46 + nl + xl + cl;
  }
  return out;
}

const OOXML_FORBIDDEN = /(^|\/)vbaProject\.bin$|(^|\/)vbaData\.xml$|(^|\/)activeX\/|\.(exe|dll|com|bat|cmd|ps1|vbs|vbe|js|jse|wsf|scr|msi|jar|hta|lnk)$/i;
function checkOoxml(b: Buffer, kind: FileKind): InspectResult | null {
  const entries = zipEntries(b);
  if (!entries) return fail('ZIP_CORRUPT', 'ملف تالف');
  if (entries.length > MAX_ZIP_ENTRIES) return fail('ZIP_BOMB', 'الملف يحتوي على عدد ملفات داخلية غير معقول');
  let total = 0;
  for (const e of entries) {
    if (e.flags & 0x1) return fail('ZIP_ENCRYPTED', 'الملف مشفّر — لا يمكن فحص محتواه');
    if (e.usize === 0xffffffff || e.csize === 0xffffffff) return fail('ZIP_BOMB', 'حجم داخلي غير معقول');
    if (e.name.includes('..') || e.name.startsWith('/') || /^[A-Za-z]:/.test(e.name) || e.name.includes('\\')) return fail('ZIP_PATH', 'مسار داخلي غير صالح في الملف');
    if (OOXML_FORBIDDEN.test(e.name)) return fail('MACRO_OR_EXECUTABLE', 'الملف يحتوي على ماكرو أو مكونات تنفيذية (غير مسموح)');
    if (e.csize > 0 && e.usize / e.csize > MAX_ZIP_RATIO) return fail('ZIP_BOMB', 'نسبة ضغط غير معقولة (ملف مضغوط متضخم)');
    total += e.usize;
  }
  if (total > MAX_ZIP_UNCOMPRESSED) return fail('ZIP_BOMB', 'الحجم بعد فك الضغط غير معقول');
  // نوع المحتوى المعلن: ممنوع macroEnabled (docm/xlsm متسمّي docx/xlsx)
  const ct = readStoredOrDeflated(b, entries, '[Content_Types].xml');
  if (ct === null) return fail('ZIP_CORRUPT', 'ملف تالف');
  if (/macroEnabled/i.test(ct)) return fail('MACRO_OR_EXECUTABLE', 'الملف من نوع يدعم الماكرو (غير مسموح)');
  const main = kind === 'docx' ? 'wordprocessingml.document.main' : 'spreadsheetml.sheet.main';
  if (!ct.includes(main)) return fail('EXTENSION_MISMATCH', 'محتوى الملف لا يطابق نوعه');
  return null;
}

/** يقرأ ملف داخلي صغير بالاسم (stored أو deflate) — للتحقق من [Content_Types].xml */
function readStoredOrDeflated(b: Buffer, entries: ZipEntry[], name: string): string | null {
  // نلاقي الـ local header بالبحث (الفهرس المركزي فيه offset بس قرأناه بأقل حقول — نعيد قراءته)
  const min = Math.max(0, b.length - 65557);
  let eocd = -1;
  for (let i = b.length - 22; i >= min; i--) if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  let p = b.readUInt32LE(eocd + 16);
  for (let n = 0; n < entries.length; n++) {
    const nl = b.readUInt16LE(p + 28), xl = b.readUInt16LE(p + 30), cl = b.readUInt16LE(p + 32);
    const nm = b.subarray(p + 46, p + 46 + nl).toString('utf8');
    if (nm === name) {
      const method = b.readUInt16LE(p + 10), csize = b.readUInt32LE(p + 20), usize = b.readUInt32LE(p + 24);
      const lo = b.readUInt32LE(p + 42);
      if (lo + 30 > b.length || b.readUInt32LE(lo) !== 0x04034b50 || usize > 1024 * 1024) return null;
      const start = lo + 30 + b.readUInt16LE(lo + 26) + b.readUInt16LE(lo + 28);
      const data = b.subarray(start, start + csize);
      if (method === 0) return data.toString('utf8');
      if (method === 8) {
        try { return inflateRawSync(data, { maxOutputLength: 1024 * 1024 }).toString('utf8'); } catch { return null; }
      }
      return null;
    }
    p += 46 + nl + xl + cl;
  }
  return null;
}
