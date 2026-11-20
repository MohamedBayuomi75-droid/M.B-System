import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inspectFile } from './file-inspector';
import { scanPdf } from './pdf-scan';

/**
 * قرار B-78 (أ): PDF بتشفير بيقيّد الصلاحيات بس بيتقبل بعد فكه وفحصه، وأي حاجة تانية بتترفض بكود واضح.
 * الملفات مُركّبة ومولّدة بمكتبة مستقلة (qpdf) — tools/security/make-pdf-fixtures.py — مش بالكود اللي بيتختبر هنا.
 */
const fx = (n: string) => readFileSync(join(__dirname, '../../test/fixtures/pdf', n));
const code = (n: string) => { const r = inspectFile(fx(n), n); return r.ok ? 'OK' : r.code; };

describe('PDF scan: permission-only encryption (B-78 a), object streams, fail-closed', () => {
  it('accepts permission-only encryption: RC4-40 (R2), RC4-128 (R3), AES-128 (R4), with and without object streams / metadata', () => {
    for (const n of ['plain.pdf', 'rc4-40.pdf', 'rc4-128.pdf', 'rc4-128-objstm.pdf', 'aes-128.pdf', 'aes-128-nometa.pdf']) expect([n, code(n)]).toEqual([n, 'OK']);
  });
  it('really decrypts: object streams of the encrypted files decode to readable PDF objects', () => {
    for (const n of ['rc4-128-objstm.pdf', 'aes-128.pdf', 'aes-128-nometa.pdf']) {
      const s = scanPdf(fx(n));
      expect(s.ok && s.encrypted).toBe(true);
      expect(s.ok && /\/Type\s*\/Catalog/.test(s.text) && /\/Type\s*\/Pages/.test(s.text)).toBe(true); // القاموسين دول جوه الـ object stream
    }
  });
  it('rejects a real open password and AES-256 with a clear code', () => {
    expect(code('user-password.pdf')).toBe('PDF_PASSWORD');
    expect(code('aes-256.pdf')).toBe('PDF_ENCRYPTION_UNSUPPORTED');
  });
  it('finds JavaScript hidden in object streams — plain and encrypted — and in encrypted files', () => {
    expect(code('js-plain-objstm.pdf')).toBe('PDF_ACTIVE_CONTENT');    // كان بيعدّي قبل كده (الاسم جوه stream مضغوط)
    expect(code('js-aes-128-objstm.pdf')).toBe('PDF_ACTIVE_CONTENT');  // مضغوط ومشفّر
    expect(code('js-rc4-128.pdf')).toBe('PDF_ACTIVE_CONTENT');
  });
  it('the stored file is the original: the scan does not change the bytes or the hash', () => {
    const b = fx('aes-128.pdf'); const copy = Buffer.from(b);
    const r = inspectFile(b, 'x.pdf');
    expect(b.equals(copy)).toBe(true);
    expect(r.ok && r.size).toBe(b.length);
  });
  it('a broken object stream is refused, not accepted unscanned', () => {
    const b = Buffer.from(fx('rc4-128-objstm.pdf'));
    const i = b.indexOf('/ObjStm'); const s = b.indexOf('stream', i) + 8;
    for (let k = s; k < s + 24; k++) b[k] ^= 0x5a;
    expect(code2(b)).toMatch(/^PDF_UNREADABLE$/);
  });
});
const code2 = (b: Buffer) => { const r = inspectFile(b, 'x.pdf'); return r.ok ? 'OK' : r.code; };
