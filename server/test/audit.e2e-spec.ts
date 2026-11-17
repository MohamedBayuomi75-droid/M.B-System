import { Client } from 'pg';
import { adminToken, createTestApp, sync, TestApp } from './app';
import { ADMIN_URL } from './db';
import { APP_ROLE } from '../src/migrations/1763500000000-AuditProtection';

/** المرحلة 2 — S-6: سجل التدقيق إلحاق فقط على مستوى القاعدة + القيمة السابقة + دور تطبيق بأقل صلاحية. */
describe('audit protection (phase 2)', () => {
  let t: TestApp;
  let admin: string;
  const APP_PW = 'app-role-test-pw';
  const up = (collection: string, id: string, baseRev: number, set: Record<string, unknown>) => ({ collection, id, op: 'upsert', baseRev, set });

  beforeAll(async () => {
    // الدور على مستوى الـ cluster — لازم يكون موجود قبل الـ migrations عشان ياخد صلاحياته
    const c = new Client({ connectionString: ADMIN_URL });
    await c.connect();
    await c.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PW}'; END IF; END $$`);
    await c.query(`ALTER ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PW}'`);
    await c.end();
    t = await createTestApp();
    admin = await adminToken(t);
  });
  afterAll(async () => t?.close());

  const appRoleClient = async () => {
    const u = new URL(t.ds.options.type === 'postgres' ? String((t.ds.options as { url?: string }).url) : '');
    u.username = APP_ROLE; u.password = APP_PW;
    const c = new Client({ connectionString: u.toString() });
    await c.connect();
    return c;
  };

  it('update and delete keep the previous value in changes.diff.before', async () => {
    let r = await sync(t, admin, { changes: [up('ledger.invoices', 'inv-a', 0, { supplierId: 's1', totalInvoice: 1000, notes: 'أول' })] });
    expect(r.status).toBe(200);
    r = await sync(t, admin, { changes: [up('ledger.invoices', 'inv-a', 1, { totalInvoice: 1200 })] });
    expect(r.body.applied[0]).toMatchObject({ op: 'update', rev: 2 });
    r = await sync(t, admin, { changes: [{ collection: 'ledger.invoices', id: 'inv-a', op: 'delete', baseRev: 2 }] });
    expect(r.body.applied[0]).toMatchObject({ op: 'delete', rev: 3 });
    const rows: { op: string; diff: Record<string, unknown> }[] = await t.ds.query(`SELECT op, diff FROM changes WHERE collection = 'ledger.invoices' AND record_id = 'inv-a' ORDER BY rev`);
    expect(rows.map((x) => x.op)).toEqual(['insert', 'update', 'delete']);
    expect(rows[1].diff).toMatchObject({ set: { totalInvoice: 1200 }, before: { totalInvoice: 1000 } });
    expect(rows[2].diff).toMatchObject({ before: { id: 'inv-a', supplierId: 's1', totalInvoice: 1200, notes: 'أول' } });
  });

  it('doc patch keeps previous field values', async () => {
    let r = await sync(t, admin, { docs: [{ key: 'settings', op: 'patch', baseRev: 0, set: { companyName: 'قديم', workDaysPerMonth: 26 } }] });
    expect(r.status).toBe(200);
    r = await sync(t, admin, { docs: [{ key: 'settings', op: 'patch', baseRev: 1, set: { companyName: 'جديد' } }] });
    expect(r.status).toBe(200);
    const [row] = await t.ds.query(`SELECT diff FROM changes WHERE collection = '$doc' AND record_id = 'settings' ORDER BY rev DESC LIMIT 1`);
    expect(row.diff).toMatchObject({ set: { companyName: 'جديد' }, before: { companyName: 'قديم' } });
  });

  it.each(['audit_log', 'changes'])('%s rejects UPDATE / DELETE / TRUNCATE even for the database owner', async (table) => {
    if (table === 'audit_log') await t.ds.query(`INSERT INTO audit_log (action, entity) VALUES ('test', 'test')`);
    await expect(t.ds.query(`UPDATE "${table}" SET ${table === 'audit_log' ? 'action' : 'op'} = 'x'`)).rejects.toThrow(/append-only/);
    await expect(t.ds.query(`DELETE FROM "${table}"`)).rejects.toThrow(/append-only/);
    await expect(t.ds.query(`TRUNCATE "${table}"`)).rejects.toThrow(/append-only/);
    const [{ n }] = await t.ds.query(`SELECT count(*)::int AS n FROM "${table}"`);
    expect(n).toBeGreaterThan(0);
  });

  it('application role: normal operations work, audit tables are insert-only, cannot disable triggers or alter schema', async () => {
    const c = await appRoleClient();
    try {
      await c.query('BEGIN');
      await c.query('SELECT pg_advisory_xact_lock(727001)');
      await c.query(`INSERT INTO records (collection, id, data, rev) VALUES ('projects', 'role-p1', '{"name":"x"}', 1)`);
      await c.query(`UPDATE records SET data = '{"name":"y"}', rev = 2 WHERE collection = 'projects' AND id = 'role-p1'`);
      await c.query(`SELECT * FROM records WHERE collection = 'projects' FOR UPDATE`);
      await c.query(`INSERT INTO changes (collection, record_id, op, rev, fields, diff) VALUES ('projects', 'role-p1', 'insert', 1, '{name}', '{}')`);
      await c.query(`INSERT INTO audit_log (action, entity) VALUES ('role-test', 'x')`);
      await c.query('COMMIT');
      await expect(c.query(`UPDATE audit_log SET action = 'x'`)).rejects.toThrow(/permission denied/);
      await expect(c.query(`DELETE FROM changes`)).rejects.toThrow(/permission denied/);
      await expect(c.query(`ALTER TABLE audit_log DISABLE TRIGGER ALL`)).rejects.toThrow(/must be owner|permission denied/);
      await expect(c.query(`DROP TABLE records`)).rejects.toThrow(/must be owner|permission denied/);
      await expect(c.query(`DELETE FROM typeorm_migrations`)).rejects.toThrow(/permission denied/);
    } finally {
      await c.end();
    }
  });
});
