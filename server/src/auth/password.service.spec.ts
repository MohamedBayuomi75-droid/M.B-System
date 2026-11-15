import { scryptSync } from 'node:crypto';
import * as path from 'node:path';
import { legacyScryptHash, verifyLegacyScrypt } from './legacy-password';
import { PasswordService } from './password.service';

// الكود الفعلي بتاع الديسكتوب (src/main/password.js) — اختبار توافق حقيقي بين التنفيذين، مش نسخة
// eslint-disable-next-line @typescript-eslint/no-require-imports
const desktop = require(path.resolve(__dirname, '../../../src/main/password.js')) as {
  hashPassword(p: string, salt?: string): { salt: string; hash: string };
  verifyPassword(p: string, salt: string, hash: string): boolean;
};
// الكود الأصلي لبرنامج الموارد البشرية قبل التوحيد (بدون قطع الطول) — منسوخ من tools/test-security.js
const originalHrHash = (p: string, salt: string) => scryptSync(String(p), salt, 64).toString('hex');

/** متجه ثابت محسوب من src/main/password.js — لو أي تنفيذ اتغيّر الاختبار ده يفشل */
const VECTOR = {
  password: 'كلمة-سر-قديمة#2024',
  salt: '0123456789abcdef0123456789abcdef',
  hash: '6271edfddd3e03f79951440d9a7e854142f94eacb9fa77689055a60e7ad69f106339ff060fa1cbccb7ad771a8468180d845dc00df6b2b92f588a95f1b4c177da',
};

describe('legacy scrypt compatibility (desktop → server)', () => {
  it('matches the fixed vector', () => {
    expect(legacyScryptHash(VECTOR.password, VECTOR.salt)).toBe(VECTOR.hash);
    expect(verifyLegacyScrypt(VECTOR.password, VECTOR.salt, VECTOR.hash)).toBe(true);
    expect(desktop.verifyPassword(VECTOR.password, VECTOR.salt, VECTOR.hash)).toBe(true);
  });

  it.each(['Admin@12345', 'كلمة مرور عربية طويلة', 'x', ' spaces  ', '🙂emoji🙂', 'a'.repeat(255)])('desktop hash verifies on server: %s', (pw) => {
    const { salt, hash } = desktop.hashPassword(pw);
    expect(verifyLegacyScrypt(pw, salt, hash)).toBe(true);
    expect(verifyLegacyScrypt(pw + '!', salt, hash)).toBe(false);
  });

  it('original HR hashes (pre-unification) verify for normal-length passwords', () => {
    const salt = 'deadbeefdeadbeefdeadbeefdeadbeef';
    expect(verifyLegacyScrypt('OldHrPass99', salt, originalHrHash('OldHrPass99', salt))).toBe(true);
  });

  it('truncates at 256 chars exactly like the desktop (D-005)', () => {
    const long = 'p'.repeat(256);
    const { salt, hash } = desktop.hashPassword(long + 'TAIL-IGNORED');
    expect(verifyLegacyScrypt(long, salt, hash)).toBe(true);
    expect(verifyLegacyScrypt(long + 'different-tail', salt, hash)).toBe(true);
    expect(verifyLegacyScrypt('p'.repeat(255), salt, hash)).toBe(false);
  });

  it('rejects missing/garbage salt or hash without throwing', () => {
    expect(verifyLegacyScrypt('x', null, VECTOR.hash)).toBe(false);
    expect(verifyLegacyScrypt('x', VECTOR.salt, null)).toBe(false);
    expect(verifyLegacyScrypt('x', VECTOR.salt, 'zz-not-hex')).toBe(false);
    expect(verifyLegacyScrypt('x', VECTOR.salt, 'abcd')).toBe(false);
    expect(verifyLegacyScrypt(undefined, VECTOR.salt, VECTOR.hash)).toBe(false);
  });
});

describe('PasswordService', () => {
  const svc = new PasswordService();

  it('scrypt login succeeds and asks for rehash to argon2id', async () => {
    const r = await svc.verify(VECTOR.password, { algo: 'scrypt', hash: VECTOR.hash, salt: VECTOR.salt });
    expect(r).toEqual({ ok: true, needsRehash: true });
    const bad = await svc.verify('wrong', { algo: 'scrypt', hash: VECTOR.hash, salt: VECTOR.salt });
    expect(bad).toEqual({ ok: false, needsRehash: false });
  });

  it('full upgrade path: scrypt → argon2id, then the same password still works', async () => {
    const legacy = desktop.hashPassword('Migrated#Pass1');
    const first = await svc.verify('Migrated#Pass1', { algo: 'scrypt', ...legacy });
    expect(first.needsRehash).toBe(true);
    const upgraded = await svc.hash('Migrated#Pass1');
    expect(upgraded.algo).toBe('argon2id');
    expect(upgraded.hash.startsWith('$argon2id$')).toBe(true);
    expect(upgraded.salt).toBeNull();
    expect(await svc.verify('Migrated#Pass1', upgraded)).toEqual({ ok: true, needsRehash: false });
    expect(await svc.verify('migrated#pass1', upgraded)).toEqual({ ok: false, needsRehash: false });
  });

  it('argon2 hashes are salted (same password → different hashes)', async () => {
    const a = await svc.hash('SamePassword1');
    const b = await svc.hash('SamePassword1');
    expect(a.hash).not.toBe(b.hash);
  });

  it('weaker argon2 params trigger rehash', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const argon2 = require('argon2');
    const weak = await argon2.hash('Weak#Params1', { type: argon2.argon2id, memoryCost: 4096, timeCost: 2, parallelism: 1 });
    expect(await svc.verify('Weak#Params1', { algo: 'argon2id', hash: weak })).toEqual({ ok: true, needsRehash: true });
  });

  it('garbage stored hash / unknown algo → false, no throw', async () => {
    expect(await svc.verify('x', { algo: 'argon2id', hash: 'not-a-hash' })).toEqual({ ok: false, needsRehash: false });
    expect(await svc.verify('x', { algo: 'bcrypt' as never, hash: 'x' })).toEqual({ ok: false, needsRehash: false });
  });

  it('policy: min 10, max 128, forbidden defaults (new passwords only)', () => {
    expect(svc.policyError('short1234')).toMatch(/10/);
    expect(svc.policyError('a'.repeat(129))).toMatch(/طويلة/);
    expect(svc.policyError('Admin123')).toMatch(/10/);
    expect(svc.policyError('LongEnough#1')).toBe('');
  });

});
