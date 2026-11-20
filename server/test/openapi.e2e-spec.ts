import * as fs from 'fs';
import * as path from 'path';
import { createTestApp, TestApp } from './app';

/**
 * المرحلة 4 (خطة v1.4.5، البند 4.3): عقد الـ API متتبّع في المستودع.
 * docs/api/openapi.json لازم يطابق اللي السيرفر بيولّده. أي تغيير في الـ API من غير تحديث الملف = فشل.
 * التحديث المقصود: UPDATE_OPENAPI=1 npm --prefix server run test:e2e -- openapi
 */
const FILE = path.resolve(__dirname, '../../docs/api/openapi.json');

/** ترتيب ثابت للمفاتيح عشان الملف مايتغيّرش من غير سبب */
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]));
  return v;
}

describe('OpenAPI contract (phase 4)', () => {
  let t: TestApp;
  beforeAll(async () => { t = await createTestApp(); });
  afterAll(async () => t?.close());

  it('docs/api/openapi.json matches the generated document', async () => {
    const r = await t.http().get('/api/docs-json').expect(200);
    const generated = JSON.stringify(sortKeys(r.body), null, 1) + '\n';
    if (process.env.UPDATE_OPENAPI === '1') {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      fs.writeFileSync(FILE, generated);
    }
    expect(fs.existsSync(FILE)).toBe(true);
    const committed = fs.readFileSync(FILE, 'utf8');
    // الرسالة لو فشل: شغّل التحديث المقصود وراجع الفرق في git
    expect(committed === generated ? 'match' : 'docs/api/openapi.json is stale — run with UPDATE_OPENAPI=1 and review the diff').toBe('match');
  });

  it('documents the Resource API v1 and the auth endpoints', async () => {
    const doc = JSON.parse(fs.readFileSync(FILE, 'utf8')) as { paths: Record<string, unknown>; openapi: string };
    expect(doc.openapi).toMatch(/^3\./);
    const paths = Object.keys(doc.paths);
    for (const p of ['/api/auth/login', '/api/v1/projects', '/api/v1/suppliers', '/api/v1/customers', '/api/v1/approvals', '/api/v1/finance/taxes'])
      expect(paths.some((x) => x === p || x.startsWith(p + '/'))).toBe(true);
  });
});
