import { inspectFile, safeFilename } from './file-inspector';
import { docx, jpeg, pdf, png, xlsx, zip } from './file-fixtures.spec-helper';

const code = (r: ReturnType<typeof inspectFile>) => (r.ok ? 'OK' : r.code);

describe('file inspector (S-5 / B-59)', () => {
  it('accepts the five allowed types with matching extensions', () => {
    for (const [buf, name, kind] of [[pdf(), 'a.pdf', 'pdf'], [png(), 'a.png', 'png'], [jpeg(), 'a.JPG', 'jpg'], [jpeg(), 'b.jpeg', 'jpg'], [docx(), 'c.docx', 'docx'], [xlsx(), 'd.xlsx', 'xlsx']] as const) {
      const r = inspectFile(buf, name);
      expect(r).toMatchObject({ ok: true, kind });
      if (r.ok) expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('size limit: 25MB default, empty rejected', () => {
    expect(code(inspectFile(Buffer.alloc(0), 'a.pdf'))).toBe('EMPTY');
    expect(code(inspectFile(Buffer.alloc(25 * 1024 * 1024 + 1), 'a.pdf'))).toBe('TOO_LARGE');
    expect(code(inspectFile(pdf(), 'a.pdf', 10))).toBe('TOO_LARGE');
  });

  it('type comes from content, not extension', () => {
    expect(code(inspectFile(Buffer.from('MZ\x90\x00 fake exe'), 'invoice.pdf'))).toBe('TYPE_NOT_ALLOWED');
    expect(code(inspectFile(Buffer.from('<html><script>alert(1)</script>'), 'a.png'))).toBe('TYPE_NOT_ALLOWED');
    expect(code(inspectFile(png(), 'photo.pdf'))).toBe('EXTENSION_MISMATCH');
    expect(code(inspectFile(pdf(), 'doc.exe'))).toBe('EXTENSION_MISMATCH');
    expect(code(inspectFile(pdf(), 'noext'))).toBe('EXTENSION_MISMATCH');
    expect(code(inspectFile(zip({ 'a.txt': 'x' }), 'a.docx'))).toBe('TYPE_NOT_ALLOWED'); // ZIP عادي مش Office
    expect(code(inspectFile(docx(), 'a.xlsx'))).toBe('EXTENSION_MISMATCH');
  });

  it('PDF: active content, obfuscated names, encryption, truncation', () => {
    expect(code(inspectFile(pdf('/OpenAction << /S /JavaScript /JS (app.alert(1)) >>'), 'a.pdf'))).toBe('PDF_ACTIVE_CONTENT');
    expect(code(inspectFile(pdf('/AA << /O << /S /J#61vaScript >> >>'), 'a.pdf'))).toBe('PDF_ACTIVE_CONTENT');
    expect(code(inspectFile(pdf('/OpenAction << /S /Launch /F (cmd.exe) >>'), 'a.pdf'))).toBe('PDF_ACTIVE_CONTENT');
    expect(code(inspectFile(pdf('/Names << /EmbeddedFiles 3 0 R >>'), 'a.pdf'))).toBe('PDF_ACTIVE_CONTENT');
    expect(code(inspectFile(pdf('/Encrypt 5 0 R'), 'a.pdf'))).toBe('PDF_UNREADABLE'); // تشفير من غير قاموسه = مرفوض (fail-closed). الحالات الحقيقية في pdf-scan.spec.ts
    expect(code(inspectFile(Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\n'), 'a.pdf'))).toBe('PDF_TRUNCATED');
    expect(code(inspectFile(pdf('/OpenAction [3 0 R /Fit]'), 'a.pdf'))).toBe('OK'); // فتح على صفحة = عادي
  });

  it('images: absurd dimensions and trailing payloads rejected', () => {
    expect(code(inspectFile(png(50000, 50000), 'a.png'))).toBe('IMAGE_DIMENSIONS');
    expect(code(inspectFile(Buffer.concat([png(), Buffer.from('<?php system($_GET[1]); ?>'.repeat(10))]), 'a.png'))).toBe('IMAGE_CORRUPT');
    expect(code(inspectFile(jpeg(60000, 60000), 'a.jpg'))).toBe('IMAGE_DIMENSIONS');
    expect(code(inspectFile(Buffer.concat([jpeg(), Buffer.alloc(200, 0x41)]), 'a.jpg'))).toBe('IMAGE_CORRUPT');
  });

  it('DOCX/XLSX: macros, ActiveX, executables, macro-enabled content type, encryption, path traversal, zip bombs', () => {
    expect(code(inspectFile(docx({ 'word/vbaProject.bin': 'x' }), 'a.docx'))).toBe('MACRO_OR_EXECUTABLE');
    expect(code(inspectFile(xlsx({ 'xl/activeX/activeX1.xml': 'x' }), 'a.xlsx'))).toBe('MACRO_OR_EXECUTABLE');
    expect(code(inspectFile(docx({ 'word/embeddings/run.exe': 'x' }), 'a.docx'))).toBe('MACRO_OR_EXECUTABLE');
    expect(code(inspectFile(xlsx({}, '<Override PartName="/m" ContentType="application/vnd.ms-excel.sheet.macroEnabled.main+xml"/>'), 'a.xlsx'))).toBe('MACRO_OR_EXECUTABLE');
    expect(code(inspectFile(docx({ '../../evil.txt': 'x' }), 'a.docx'))).toBe('ZIP_PATH');
    expect(code(inspectFile(zip({ '[Content_Types].xml': 'x', 'word/document.xml': 'x' }, { encryptFlag: true }), 'a.docx'))).toBe('ZIP_ENCRYPTED');
    expect(code(inspectFile(docx({ 'word/big.xml': '0'.repeat(5_000_000) }), 'a.docx'))).toBe('ZIP_BOMB');
  });

  it('safe filenames', () => {
    expect(safeFilename('../../etc/passwd')).toBe('passwd');
    expect(safeFilename('C:\\Users\\x\\فاتورة 1.pdf')).toBe('فاتورة 1.pdf');
    expect(safeFilename('a<b>"c".pdf')).toBe('a_b__c_.pdf');
    expect(safeFilename('...hidden')).toBe('hidden');
    expect(safeFilename('')).toBe('file');
  });
});
