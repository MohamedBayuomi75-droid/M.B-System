import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('applies defaults in development', () => {
    const env = validateEnv({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.DB_HOST).toBe('localhost');
  });

  it('coerces numbers from strings', () => {
    expect(validateEnv({ PORT: '8080', DB_PORT: '6543' })).toMatchObject({ PORT: 8080, DB_PORT: 6543 });
  });

  it('rejects invalid values', () => {
    expect(() => validateEnv({ PORT: '99999' })).toThrow(/PORT/);
    expect(() => validateEnv({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    expect(() => validateEnv({ LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/);
  });

  it('production requires JWT_SECRET (>=32) and a DB password', () => {
    expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
    expect(() => validateEnv({ NODE_ENV: 'production', JWT_SECRET: 'short', DB_PASSWORD: 'x' })).toThrow(/JWT_SECRET/);
    expect(() => validateEnv({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(32) })).toThrow(/DB_PASSWORD/);
    expect(validateEnv({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(32), DB_PASSWORD: 'p' }).NODE_ENV).toBe('production');
  });

  it('empty values count as unset (Compose ${VAR:-})', () => {
    const env = validateEnv({ ADMIN_INITIAL_PASSWORD: '', JWT_SECRET: '', PORT: '' });
    expect(env.ADMIN_INITIAL_PASSWORD).toBeUndefined();
    expect(env.PORT).toBe(3000);
    expect(() => validateEnv({ ADMIN_INITIAL_PASSWORD: 'short' })).toThrow(/ADMIN_INITIAL_PASSWORD/);
  });

  it('auth settings have safe defaults and bounds', () => {
    expect(validateEnv({})).toMatchObject({ JWT_ACCESS_TTL_SEC: 900, REFRESH_TTL_DAYS: 14, LOGIN_RATE_LIMIT_PER_MIN: 5, LOGIN_MAX_FAILURES: 10, LOGIN_LOCK_MINUTES: 15 });
    expect(() => validateEnv({ JWT_ACCESS_TTL_SEC: '86400' })).toThrow(/JWT_ACCESS_TTL_SEC/);
    expect(() => validateEnv({ LOGIN_MAX_FAILURES: '1' })).toThrow(/LOGIN_MAX_FAILURES/);
  });
});
