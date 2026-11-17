import { adminToken, createTestApp, TestApp } from './app';
import { CSP_ENFORCED, CSP_STRICT_REPORT_ONLY } from '../src/security/security-headers';
import { cspReportCounts, resetCspReportCounts } from '../src/security/csp-report';

/** المرحلة 2: ترويسات الأمان وCSP، فحص الأصل، تقارير CSP، وحصر المسارات العامة. */
describe('security (phase 2)', () => {
  let t: TestApp;
  let token: string;
  beforeAll(async () => {
    t = await createTestApp();
    token = await adminToken(t);
  });
  afterAll(async () => t?.close());

  it('security headers + CSP on API responses', async () => {
    const res = await t.http().get('/api/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(res.headers['content-security-policy']).toBe(CSP_ENFORCED);
    expect(res.headers['content-security-policy-report-only']).toBe(CSP_STRICT_REPORT_ONLY);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['strict-transport-security']).toBeUndefined(); // HTTP عادي
  });

  it('enforced CSP: no eval, no plugins, no framing, same-origin connections only', () => {
    expect(CSP_ENFORCED).not.toContain('unsafe-eval');
    for (const d of ["object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "connect-src 'self'", "default-src 'self'"]) expect(CSP_ENFORCED).toContain(d);
    expect(CSP_STRICT_REPORT_ONLY).toContain("script-src 'self';");
    expect(CSP_STRICT_REPORT_ONLY).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('HSTS only over HTTPS (behind trusted proxy)', async () => {
    const res = await t.http().get('/api/health').set('x-forwarded-proto', 'https').expect(200);
    expect(res.headers['strict-transport-security']).toMatch(/max-age=31536000/);
  });

  it('legacy UI page carries the same headers', async () => {
    const res = await t.http().get('/legacy/');
    if (res.status === 200) {
      expect(res.headers['content-security-policy']).toBe(CSP_ENFORCED);
      expect(res.headers['x-frame-options']).toBe('DENY');
    }
  });

  describe('origin check on state-changing requests', () => {
    it('cross-origin POST is rejected (refresh / login / sync)', async () => {
      for (const path of ['/api/auth/refresh', '/api/auth/login', '/api/sync']) {
        const res = await t.http().post(path).set('origin', 'http://evil.example').set('authorization', `Bearer ${token}`).send({});
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('BAD_ORIGIN');
      }
    });
    it('Sec-Fetch-Site: cross-site is rejected even without Origin', async () => {
      const res = await t.http().post('/api/auth/refresh').set('sec-fetch-site', 'cross-site').send({});
      expect(res.status).toBe(403);
    });
    it('Origin: null is rejected', async () => {
      const res = await t.http().post('/api/auth/logout').set('origin', 'null').send({});
      expect(res.status).toBe(403);
    });
    it('same-origin POST passes the check', async () => {
      const res = await t.http().post('/api/auth/refresh').set('host', 'erp.local').set('origin', 'https://erp.local').send({});
      expect(res.status).not.toBe(403); // 401: مفيش كوكي — المهم إن الفحص عدّى
    });
    it('same-origin behind trusted proxy uses X-Forwarded-Host', async () => {
      const res = await t.http().post('/api/auth/refresh').set('host', 'server:3000').set('x-forwarded-host', 'erp.local').set('origin', 'https://erp.local').send({});
      expect(res.status).not.toBe(403);
    });
    it('GET is never blocked by the origin check', async () => {
      await t.http().get('/api/health').set('origin', 'http://evil.example').expect(200);
    });
    it('requests without Origin (CLI/scripts) are allowed', async () => {
      const res = await t.http().post('/api/auth/refresh').send({});
      expect(res.status).not.toBe(403);
    });
  });

  it('CSP report endpoint accepts reports (204) and counts them without auth', async () => {
    resetCspReportCounts();
    await t.http().post('/api/security/csp-report').set('content-type', 'application/csp-report')
      .send(JSON.stringify({ 'csp-report': { 'effective-directive': 'script-src-attr', 'blocked-uri': 'inline' } })).expect(204);
    expect(cspReportCounts()['script-src-attr inline']).toBe(1);
  });

  it('every API route requires authentication except an explicit allowlist', async () => {
    const PUBLIC = new Set(['GET /api/health', 'POST /api/auth/login', 'POST /api/auth/refresh', 'POST /api/auth/logout']);
    const doc = (await t.http().get('/api/docs-json').expect(200)).body as { paths: Record<string, Record<string, unknown>> };
    const routes: string[] = [];
    for (const [p, ops] of Object.entries(doc.paths)) for (const m of Object.keys(ops)) routes.push(`${m.toUpperCase()} ${p}`);
    expect(routes.length).toBeGreaterThan(15);
    const unguarded: string[] = [];
    for (const r of routes) {
      if (PUBLIC.has(r)) continue;
      const [method, path] = r.split(' ');
      const url = path.replace(/\{[^}]+\}/g, '00000000-0000-0000-0000-000000000000');
      const res = await (t.http() as unknown as Record<string, (u: string) => { send: (b: unknown) => Promise<{ status: number }> }>)[method.toLowerCase()](url).send({});
      if (res.status !== 401) unguarded.push(`${r} → ${res.status}`);
    }
    expect(unguarded).toEqual([]);
  });
});
