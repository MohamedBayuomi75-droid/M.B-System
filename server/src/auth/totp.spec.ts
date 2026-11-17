import { base32Decode, base32Encode, decryptSecret, encryptSecret, generateRecoveryCodes, generateSecret, hashRecoveryCode, totpAt, totpKey, verifyTotp } from './totp';

describe('TOTP (RFC 6238)', () => {
  // متجهات RFC 6238 الملحق B (SHA1، السر "12345678901234567890"، 8 أرقام → نقارن آخر 6)
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  it.each([[59, '287082'], [1111111109, '081804'], [1111111111, '050471'], [1234567890, '005924'], [2000000000, '279037']])('t=%i → %s', (t, code) => {
    expect(totpAt(secret, Math.floor(t / 30))).toBe(code);
  });
  it('base32 roundtrip', () => {
    const b = Buffer.from([0, 1, 2, 250, 255, 7, 8]);
    expect(base32Decode(base32Encode(b)).equals(b)).toBe(true);
    expect(generateSecret()).toMatch(/^[A-Z2-7]{32}$/);
  });
  it('verify: ±1 step window, rejects replay (step <= lastStep), rejects garbage', () => {
    const now = 1_700_000_000_000; const step = Math.floor(now / 30000);
    expect(verifyTotp(secret, totpAt(secret, step), null, now)).toBe(step);
    expect(verifyTotp(secret, totpAt(secret, step - 1), null, now)).toBe(step - 1);
    expect(verifyTotp(secret, totpAt(secret, step - 2), null, now)).toBeNull();
    expect(verifyTotp(secret, totpAt(secret, step), step, now)).toBeNull(); // نفس الكود مرتين
    expect(verifyTotp(secret, '12345', null, now)).toBeNull();
    expect(verifyTotp(secret, 'abcdef', null, now)).toBeNull();
  });
  it('secret encryption: AES-GCM roundtrip, tamper detected, key from TOTP_ENC_KEY or derived', () => {
    const k1 = totpKey({ TOTP_ENC_KEY: 'a'.repeat(64) } as NodeJS.ProcessEnv);
    const k2 = totpKey({ JWT_SECRET: 'x'.repeat(40) } as NodeJS.ProcessEnv);
    expect(k1.length).toBe(32); expect(k2.length).toBe(32);
    const blob = encryptSecret('JBSWY3DPEHPK3PXP', k1);
    expect(blob).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptSecret(blob, k1)).toBe('JBSWY3DPEHPK3PXP');
    expect(() => decryptSecret(blob, k2)).toThrow();
    const parts = blob.split('.'); parts[3] = Buffer.from('tampered').toString('base64');
    expect(() => decryptSecret(parts.join('.'), k1)).toThrow();
    expect(() => totpKey({ TOTP_ENC_KEY: 'short' } as NodeJS.ProcessEnv)).toThrow();
  });
  it('recovery codes: format, uniqueness, hash normalisation', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[A-Z2-7]{5}-[A-Z2-7]{5}$/);
    const k = Buffer.alloc(32, 1);
    expect(hashRecoveryCode(codes[0], k)).toBe(hashRecoveryCode(codes[0].toLowerCase().replace('-', ''), k));
  });
});
