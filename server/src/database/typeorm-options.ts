import { DataSourceOptions } from 'typeorm';
import { ENTITIES } from '../entities';
import { MIGRATIONS } from '../migrations';

/** مصدر واحد لإعدادات TypeORM (السيرفر + CLI + الاختبارات). synchronize ممنوع دايمًا — كل تغيير = migration. */
export function buildDataSourceOptions(env: NodeJS.ProcessEnv = process.env): DataSourceOptions {
  const base = env.DATABASE_URL
    ? { url: env.DATABASE_URL }
    : {
        host: env.DB_HOST || 'localhost',
        port: Number(env.DB_PORT || 5432),
        username: env.DB_USER || 'unified',
        password: env.DB_PASSWORD,
        database: env.DB_NAME || 'unified',
      };
  return {
    type: 'postgres',
    // gen_random_uuid() (مدمجة في PostgreSQL 13+) بدل uuid-ossp
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    ...base,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    migrationsTableName: 'typeorm_migrations',
    migrationsTransactionMode: 'each',
    synchronize: false,
    migrationsRun: false,
    logging: ['error', 'migration'],
    applicationName: 'unified-server',
  };
}
