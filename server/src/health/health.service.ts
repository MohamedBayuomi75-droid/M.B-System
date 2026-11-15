import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MIGRATIONS } from '../migrations';
import { HealthDto } from './health.dto';
import { SERVER_VERSION } from '../version';

@Injectable()
export class HealthService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async check(): Promise<HealthDto> {
    const out: HealthDto = {
      status: 'ok',
      version: SERVER_VERSION,
      legacySchemaVersion: null,
      uptimeSec: Math.round(process.uptime()),
      time: new Date().toISOString(),
      db: { up: false, latencyMs: null, version: null },
      migrations: null,
    };
    try {
      const t0 = performance.now();
      const [{ v }] = await this.ds.query(`SELECT current_setting('server_version') AS v`);
      out.db = { up: true, latencyMs: Math.round(performance.now() - t0), version: v };
      const rows: { name: string }[] = await this.ds.query(`SELECT name FROM typeorm_migrations ORDER BY id`);
      const appliedNames = new Set(rows.map((r) => r.name));
      const known = MIGRATIONS.map((m) => m.name);
      out.migrations = { applied: rows.length, pending: known.filter((n) => !appliedNames.has(n)).length, latest: rows.at(-1)?.name ?? null };
      const meta: { value: unknown }[] = await this.ds.query(`SELECT value FROM schema_meta WHERE key = 'legacy_schema_version'`);
      out.legacySchemaVersion = typeof meta[0]?.value === 'number' ? (meta[0].value as number) : null;
      if (out.migrations.pending > 0) out.status = 'degraded';
    } catch {
      // الاتصال واقع، أو الجداول لسه مش موجودة (migrations ما اتشغلتش)
      out.status = out.db.up ? 'degraded' : 'error';
    }
    return out;
  }
}
