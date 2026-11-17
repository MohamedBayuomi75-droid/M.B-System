// تشفير/فك تشفير ملفات النسخ (AES-256-GCM، تدفّقي) — المرحلة 2، B-66 «نسخة مشفّرة خارج السيرفر».
//   node crypt.mjs keygen <keyfile>              ← مفتاح عشوائي 32 بايت (base64) — احفظه بعيد عن السيرفر (B-67)
//   node crypt.mjs enc <in> <out> <keyfile>
//   node crypt.mjs dec <in> <out> <keyfile>      ← بيفشل لو الملف اتعدّل أو المفتاح غلط (والناتج المؤقت بيتمسح)
// الصيغة: "UERPENC1" (8) + nonce (12) + ciphertext + tag (16)
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { closeSync, createReadStream, createWriteStream, fstatSync, openSync, readFileSync, readSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';

const MAGIC = Buffer.from('UERPENC1');
const [, , cmd, a, b, keyfile] = process.argv;
const readKey = (f) => {
  const k = Buffer.from(readFileSync(f, 'utf8').trim(), 'base64');
  if (k.length !== 32) throw new Error('key must be 32 bytes base64');
  return k;
};
const dropTmp = (p) => { try { unlinkSync(p); } catch { /* مش موجود */ } };

async function enc(inp, out, key) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const tmp = out + '.tmp';
  const w = createWriteStream(tmp);
  w.write(Buffer.concat([MAGIC, iv]));
  try {
    for await (const chunk of createReadStream(inp).pipe(c)) if (!w.write(chunk)) await new Promise((r) => w.once('drain', r));
    await new Promise((res, rej) => w.end(c.getAuthTag(), (e) => (e ? rej(e) : res())));
    renameSync(tmp, out);
  } catch (e) { w.destroy(); dropTmp(tmp); throw e; }
}

async function dec(inp, out, key) {
  const fd = openSync(inp, 'r');
  const size = fstatSync(fd).size;
  const head = Buffer.alloc(20); readSync(fd, head, 0, 20, 0);
  const tag = Buffer.alloc(16); readSync(fd, tag, 0, 16, size - 16);
  closeSync(fd);
  if (size < 36 || !head.subarray(0, 8).equals(MAGIC)) throw new Error('not an encrypted backup file');
  const d = createDecipheriv('aes-256-gcm', key, head.subarray(8, 20));
  d.setAuthTag(tag);
  const tmp = out + '.tmp';
  try {
    await pipeline(createReadStream(inp, { start: 20, end: size - 17 }), d, createWriteStream(tmp));
    renameSync(tmp, out);
  } catch (e) { dropTmp(tmp); throw new Error('decrypt failed (wrong key or tampered file): ' + e.message); }
}

try {
  if (cmd === 'keygen') { writeFileSync(a, randomBytes(32).toString('base64') + '\n', { mode: 0o600, flag: 'wx' }); console.log('key written to', a); }
  else if (cmd === 'enc') await enc(a, b, readKey(keyfile));
  else if (cmd === 'dec') await dec(a, b, readKey(keyfile));
  else { console.error('usage: crypt.mjs keygen <keyfile> | enc|dec <in> <out> <keyfile>'); process.exit(2); }
} catch (e) { console.error(e.message); process.exit(1); }
