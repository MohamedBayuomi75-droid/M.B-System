import { randomBytes } from 'node:crypto';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../src/database/typeorm-options';

/**
 * قاعدة مؤقتة لكل ملف اختبار. الاتصال الإداري من TEST_DATABASE_URL
 * (الافتراضي: حاوية التطوير postgres://unified:devpass@localhost:55432/postgres).
 */
export const ADMIN_URL = process.env.TEST_DATABASE_URL || 'postgres://unified:devpass@localhost:55432/postgres';

export async function createTempDb(): Promise<{ url: string; drop: () => Promise<void> }> {
  const name = 'unified_test_' + randomBytes(5).toString('hex');
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();
  const u = new URL(ADMIN_URL);
  u.pathname = '/' + name;
  return {
    url: u.toString(),
    drop: async () => {
      const c = new Client({ connectionString: ADMIN_URL });
      await c.connect();
      await c.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      await c.end();
    },
  };
}

export function dataSourceFor(url: string): DataSource {
  return new DataSource({ ...buildDataSourceOptions({ DATABASE_URL: url }), logging: false });
}
