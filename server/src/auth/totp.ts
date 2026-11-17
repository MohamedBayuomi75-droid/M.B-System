import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * TOTP (RFC 6238: HMAC-SHA1، 30 ثانية، 6 أرقام) — المرحلة 2، S-8 (2FA للإدارة). من غير مكتبات خارجية.
 * السر بيتخزن مشفّر (AES-256-GCM) بمفتاح TOTP_ENC_KEY (32 بايت hex/base64)، ولو مش موجود: مشتق من JWT_SECRET (HKDF).
 * ملاحظة تشغيل: تغيير JWT_SECRET من غير TOTP_ENC_KEY = كل أسرار 2FA تبقى غير صالحة (المستخدمين يعيدوا التسجيل).
 */
const STEP_SEC = 30;
const DIGITS = 6;
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const b of buf) { value = (value << 8) | b; bits += 8; while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0, value = 0; const out: number[] = [];
  for (const ch of clean) { const i = B32.indexOf(ch); if (i < 0) throw new Error('bad base32'); value = (value << 5) | i; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}

export const generateSecret = (): string => base32Encode(randomBytes(20));

export function totpAt(secretB32: string, step: number): string {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac('sha1', base32Decode(secretB32)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** DIGITS).padStart(DIGITS, '0');
}

export const currentStep = (nowMs = Date.now()) => Math.floor(nowMs / 1000 / STEP_SEC);

/** يرجّع رقم الخطوة اللي الكود مطابق لها (±1 خطوة لفرق الساعة) — أو null. الخطوات <= lastStep مرفوضة (منع إعادة الاستخدام). */
export function verifyTotp(secretB32: string, code: string, lastStep: number | null, nowMs = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const s = currentStep(nowMs);
  for (const step of [s - 1, s, s + 1]) {
    if (lastStep !== null && step <= lastStep) continue;
    const a = Buffer.from(totpAt(secretB32, step)), b = Buffer.from(code);
    if (timingSafeEqual(a, b)) return step;
  }
  return null;
}

export function otpauthUrl(secretB32: string, account: string, issuer = 'Unified ERP'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SEC}`;
}

// ---------------- تشفير السر ----------------
export function totpKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const k = env.TOTP_ENC_KEY?.trim();
  if (k) {
    const buf = /^[0-9a-fA-F]{64}$/.test(k) ? Buffer.from(k, 'hex') : Buffer.from(k, 'base64');
    if (buf.length !== 32) throw new Error('TOTP_ENC_KEY must be 32 bytes (64 hex chars or base64)');
    return buf;
  }
  return Buffer.from(hkdfSync('sha256', String(env.JWT_SECRET || ''), 'unified-totp', 'totp-secret-v1', 32));
}
export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return `v1.${iv.toString('base64')}.${c.getAuthTag().toString('base64')}.${enc.toString('base64')}`;
}
export function decryptSecret(blob: string, key: Buffer): string {
  const [v, iv, tag, enc] = blob.split('.');
  if (v !== 'v1') throw new Error('unknown secret format');
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(enc, 'base64')), d.final()]).toString('utf8');
}

// ---------------- أكواد الاسترداد ----------------
/** 10 أكواد × 10 حروف base32 (~50 bit) — بتظهر مرة واحدة، وبيتخزن HMAC بتاعها بس */
export function generateRecoveryCodes(n = 10): string[] {
  return Array.from({ length: n }, () => { const c = base32Encode(randomBytes(7)).slice(0, 10); return `${c.slice(0, 5)}-${c.slice(5)}`; });
}
export function hashRecoveryCode(code: string, key: Buffer): string {
  return createHmac('sha256', key).update(code.toUpperCase().replace(/[^A-Z2-7]/g, '')).digest('hex');
}
export const looksLikeRecoveryCode = (s: string) => /^[A-Za-z2-7]{5}-?[A-Za-z2-7]{5}$/.test(s.trim());
export const sha256hex = (s: string) => createHash('sha256').update(s).digest('hex');
