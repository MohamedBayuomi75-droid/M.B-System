import { createDecipheriv, createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

/**
 * قراءة محتوى PDF عشان الفحص (خطة v1.4.5 — المرحلة 5، قرار B-78 (أ)).
 * - **التشفير اللي بيقيّد الصلاحيات بس** (Standard Security Handler، R2–R4: RC4 40/128 وAES-128، بيفتح بكلمة سر مستخدم فاضية):
 *   بنحسب المفتاح بكلمة السر الفاضية (ISO 32000-1 §7.6.3.3 الخوارزميات 2 و4 و5)، وبنفك الـ streams في الذاكرة بس.
 *   الملف الأصلي مابيتغيّرش وبيتخزّن زي ما هو.
 * - **object streams** (`/Type /ObjStm`): القواميس جواها مضغوطة (وممكن مشفّرة)، فبنفكها عشان أسماء زي /JavaScript ماتستخبّاش فيها.
 *   ده بيقفل ثغرة كانت موجودة كمان في الملفات **اللي مش مشفّرة**.
 * - **fail-closed:** أي حاجة مش مفهومة (كلمة سر فعلية، تشفير AES-256 R5/R6، فلتر مش مدعوم في object stream، stream مكسور)
 *   بترجّع كود رفض واضح، والملف مابيتقبلش من غير فحص.
 * من غير مكتبات خارجية: Node crypto وzlib بس.
 */
export type PdfScan = { ok: true; text: string; encrypted: boolean } | { ok: false; code: string; message: string };

const PAD = Buffer.from('28bf4e5e4e758a4164004e56fffa01082e2e00b6d0683e802f0ca9fe6453697a', 'hex');
const fail = (code: string, message: string): PdfScan => ({ ok: false, code, message });

/** فك أسماء PDF المكتوبة بـ #xx (مثلًا /J#61vaScript) */
export const decodeNames = (s: string) => s.replace(/#([0-9A-Fa-f]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));

// ---------------- قراءة سلاسل PDF (literal / hex) ----------------
function readString(src: string, i: number): { bytes: Buffer; end: number } | null {
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] === '<' && src[i + 1] !== '<') {
    const j = src.indexOf('>', i);
    if (j < 0) return null;
    let hex = src.slice(i + 1, j).replace(/\s+/g, '');
    if (hex.length % 2) hex += '0';
    return { bytes: Buffer.from(hex, 'hex'), end: j + 1 };
  }
  if (src[i] !== '(') return null;
  const out: number[] = [];
  let depth = 0, k = i + 1;
  for (; k < src.length; k++) {
    const c = src[k];
    if (c === '\\') {
      const n = src[++k];
      const map: Record<string, number> = { n: 10, r: 13, t: 9, b: 8, f: 12, '(': 40, ')': 41, '\\': 92 };
      if (n in map) out.push(map[n]);
      else if (/[0-7]/.test(n)) { let o = n; while (o.length < 3 && /[0-7]/.test(src[k + 1])) o += src[++k]; out.push(parseInt(o, 8) & 0xff); }
      else if (n === '\r') { if (src[k + 1] === '\n') k++; }
      else if (n !== '\n') out.push(n.charCodeAt(0));
      continue;
    }
    if (c === '(') depth++;
    if (c === ')') { if (depth === 0) break; depth--; }
    out.push(c.charCodeAt(0) & 0xff);
  }
  return { bytes: Buffer.from(out), end: k + 1 };
}
const stringAfter = (dict: string, key: string) => { const m = new RegExp(`/${key}(?![A-Za-z0-9])`).exec(dict); return m ? readString(dict, m.index + m[0].length)?.bytes ?? null : null; };
const numberAfter = (dict: string, key: string) => { const m = new RegExp(`/${key}\\s+(-?\\d+)`).exec(dict); return m ? Number(m[1]) : null; };
const nameAfter = (dict: string, key: string) => new RegExp(`/${key}\\s*(/[A-Za-z0-9]+)`).exec(dict)?.[1];

/** القاموس اللي بيبدأ عند start (بيعدّ << >> المتداخلة) */
function dictAt(src: string, start: number): string | null {
  let depth = 0;
  for (let k = start; k < src.length - 1; k++) {
    if (src[k] === '(') { const s = readString(src, k); if (!s) return null; k = s.end - 1; continue; }
    if (src[k] === '<' && src[k + 1] === '<') { depth++; k++; continue; }
    if (src[k] === '>' && src[k + 1] === '>') { depth--; k++; if (depth === 0) return src.slice(start, k + 1); }
  }
  return null;
}

// ---------------- RC4 ----------------
function rc4(key: Buffer, data: Buffer): Buffer {
  const s = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 0, j = 0; i < 256; i++) { j = (j + s[i] + key[i % key.length]) & 255; [s[i], s[j]] = [s[j], s[i]]; }
  const out = Buffer.alloc(data.length);
  for (let n = 0, i = 0, j = 0; n < data.length; n++) {
    i = (i + 1) & 255; j = (j + s[i]) & 255; [s[i], s[j]] = [s[j], s[i]];
    out[n] = data[n] ^ s[(s[i] + s[j]) & 255];
  }
  return out;
}
const md5 = (...parts: Buffer[]) => { const h = createHash('md5'); for (const p of parts) h.update(p); return h.digest(); };

interface Crypt { key: Buffer; aes: boolean; identity: boolean }

/** الخوارزمية 2 (المفتاح بكلمة سر فاضية) + 4/5 (التحقق إن كلمة سر المستخدم فعلًا فاضية) */
function standardKey(full: string, id0: Buffer): Crypt | PdfScan {
  // مفاتيح القاموس الأساسية من المستوى الأول بس: /CF جواه /Length تاني (بالبايت) غير /Length بتاعة المفتاح (بالبت)
  const cfAt = /\/CF\s*<</.exec(full);
  const cfDict = cfAt ? dictAt(full, cfAt.index + cfAt[0].length - 2) ?? '' : '';
  const enc = cfDict ? full.replace(cfDict, '<<>>') : full;
  const v = numberAfter(enc, 'V') ?? 0, r = numberAfter(enc, 'R') ?? 0;
  if (nameAfter(enc, 'Filter') !== '/Standard') return fail('PDF_ENCRYPTION_UNSUPPORTED', 'نوع تشفير PDF غير مدعوم (مش Standard)');
  if (r >= 5 || v >= 5) return fail('PDF_ENCRYPTION_UNSUPPORTED', 'تشفير PDF من نوع AES-256 غير مدعوم حاليًا');
  if (r < 2 || ![1, 2, 4].includes(v)) return fail('PDF_ENCRYPTION_UNSUPPORTED', 'نوع تشفير PDF غير مدعوم');
  const O = stringAfter(enc, 'O'), U = stringAfter(enc, 'U'), P = numberAfter(enc, 'P');
  if (!O || !U || P === null || O.length < 32 || U.length < 32) return fail('PDF_UNREADABLE', 'بيانات تشفير PDF ناقصة');
  let aes = false, identity = false;
  if (v === 4) {
    const stmf = nameAfter(enc, 'StmF') ?? '/Identity';
    if (stmf === '/Identity') identity = true;
    else {
      const cf = new RegExp(`${stmf.replace('/', '\\/')}\\s*<<([^>]*)>>`).exec(cfDict)?.[1] ?? '';
      const cfm = /\/CFM\s*\/(\w+)/.exec(cf)?.[1];
      if (cfm === 'AESV2') aes = true; else if (cfm !== 'V2') return fail('PDF_ENCRYPTION_UNSUPPORTED', 'طريقة تشفير PDF غير مدعومة');
    }
  }
  const n = r === 2 ? 5 : Math.min(16, Math.max(5, (numberAfter(enc, 'Length') ?? 40) / 8));
  const p = Buffer.alloc(4); p.writeInt32LE(P | 0);
  const noMeta = r >= 4 && /\/EncryptMetadata\s+false/.test(enc);
  let key = md5(PAD, O.subarray(0, 32), p, id0, noMeta ? Buffer.from([0xff, 0xff, 0xff, 0xff]) : Buffer.alloc(0)).subarray(0, n);
  if (r >= 3) for (let i = 0; i < 50; i++) key = md5(key).subarray(0, n);
  // التحقق: لو كلمة سر المستخدم مش فاضية، الملف محتاج كلمة سر للفتح ← مرفوض
  let okUser: boolean;
  if (r === 2) okUser = rc4(key, PAD).equals(U.subarray(0, 32));
  else {
    let x = rc4(key, md5(PAD, id0));
    for (let i = 1; i <= 19; i++) x = rc4(Buffer.from(key.map((b) => b ^ i)), x);
    okUser = x.subarray(0, 16).equals(U.subarray(0, 16));
  }
  if (!okUser) return fail('PDF_PASSWORD', 'ملف PDF محمي بكلمة سر للفتح — لا يمكن فحص محتواه');
  return { key, aes, identity };
}

function objectKey(c: Crypt, num: number, gen: number): Buffer {
  const k = Buffer.concat([c.key, Buffer.from([num & 255, (num >> 8) & 255, (num >> 16) & 255, gen & 255, (gen >> 8) & 255]), c.aes ? Buffer.from('sAlT', 'latin1') : Buffer.alloc(0)]);
  return md5(k).subarray(0, Math.min(c.key.length + 5, 16));
}
function decrypt(c: Crypt, num: number, gen: number, data: Buffer): Buffer {
  if (c.identity) return data;
  const k = objectKey(c, num, gen);
  if (!c.aes) return rc4(k, data);
  if (data.length < 32 || data.length % 16) throw new Error('aes-length');
  const d = createDecipheriv('aes-128-cbc', k, data.subarray(0, 16));
  return Buffer.concat([d.update(data.subarray(16)), d.final()]);
}

/**
 * النص اللي بيتفحص: الملف كله (القواميس مش مشفّرة في PDF) + محتوى كل object stream بعد فك التشفير والضغط.
 * المحتوى العادي (الصفحات والصور) مابيتفحصش: الأسماء فيه مالهاش أثر تنفيذي.
 */
export function scanPdf(b: Buffer): PdfScan {
  const src = b.toString('latin1');
  let crypt: Crypt | null = null;
  let encNum = -1;
  const encRef = /\/Encrypt\s+(\d+)\s+(\d+)\s+R/.exec(src);
  const encInline = !encRef && /\/Encrypt\s*<</.exec(src);
  if (encRef || encInline) {
    let enc: string | null = null;
    if (encRef) {
      encNum = Number(encRef[1]);
      const m = new RegExp(`(?:^|[^0-9])${encRef[1]}\\s+${encRef[2]}\\s+obj\\s*<<`).exec(src);
      enc = m ? dictAt(src, m.index + m[0].length - 2) : null;
    } else if (encInline) enc = dictAt(src, encInline.index + encInline[0].length - 2);
    if (!enc) return fail('PDF_UNREADABLE', 'قاموس تشفير PDF مش موجود أو تالف');
    const idm = /\/ID\s*\[\s*/.exec(src);
    const id0 = idm ? readString(src, idm.index + idm[0].length)?.bytes : null;
    if (!id0) return fail('PDF_UNREADABLE', 'معرّف ملف PDF (ID) ناقص');
    const k = standardKey(enc, id0);
    if ('ok' in k) return k;
    crypt = k;
  }
  // object streams
  const extra: string[] = [];
  const objRe = /(\d+)\s+(\d+)\s+obj\s*<</g;
  let m: RegExpExecArray | null;
  while ((m = objRe.exec(src))) {
    const num = Number(m[1]), gen = Number(m[2]);
    const dictStart = m.index + m[0].length - 2;
    const dict = dictAt(src, dictStart);
    if (!dict || !/\/Type\s*\/ObjStm\b/.test(dict) || num === encNum) continue;
    const after = dictStart + dict.length;
    const sm = /^\s*stream\r?\n/.exec(src.slice(after, after + 20));
    if (!sm) return fail('PDF_UNREADABLE', 'ملف PDF فيه object stream تالف');
    const dataStart = after + sm[0].length;
    const len = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dict);
    const end = len && dataStart + Number(len[1]) <= b.length ? dataStart + Number(len[1]) : src.indexOf('endstream', dataStart);
    if (end < 0) return fail('PDF_UNREADABLE', 'ملف PDF فيه object stream تالف');
    let data = b.subarray(dataStart, end);
    try {
      if (crypt) data = decrypt(crypt, num, gen, data);
      const filters = decodeNames(dict).match(/\/Filter\s*(\[[^\]]*\]|\/\w+)/)?.[1] ?? '';
      const list = filters.match(/\/\w+/g) ?? [];
      if (list.some((f) => f !== '/FlateDecode' && f !== '/Fl') || /\/DecodeParms/.test(dict)) return fail('PDF_UNREADABLE', 'ملف PDF فيه object stream بضغط غير مدعوم — لا يمكن فحص محتواه');
      if (list.length) data = inflateSync(data);
    } catch { return fail('PDF_UNREADABLE', 'ملف PDF فيه object stream تالف — لا يمكن فحص محتواه'); }
    extra.push(data.toString('latin1'));
  }
  return { ok: true, text: decodeNames([src, ...extra].join('\n')), encrypted: !!crypt };
}
