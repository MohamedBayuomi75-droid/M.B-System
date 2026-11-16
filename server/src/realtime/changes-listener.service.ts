import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { DataService } from '../data/data.service';
import { RealtimeGateway } from './realtime.gateway';

/**
 * LISTEN unified_changes (الـ trigger على changes بيبعت الـ seq بعد كل COMMIT) → يقرا التغييرات الجديدة بالترتيب → يبثها.
 * لو الاتصال وقع بيعيد الاتصال ويكمّل من آخر seq (مفيش تغيير بيضيع). بيشتغل مع أي كاتب (السيرفر، سكربت الاستيراد، ...).
 */
@Injectable()
export class ChangesListenerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger('ChangesListener');
  private client?: Client;
  private lastSeq = 0;
  private draining = false;
  private pending = false;
  private stopped = false;
  private retryMs = 1000;

  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly data: DataService, private readonly gateway: RealtimeGateway) {}

  async onApplicationBootstrap() {
    const [{ seq }] = await this.ds.query(`SELECT COALESCE(MAX(seq), 0)::bigint AS seq FROM changes`);
    this.lastSeq = Number(seq);
    await this.connect();
  }

  async onModuleDestroy() {
    this.stopped = true;
    await this.client?.end().catch(() => undefined);
  }

  private connOptions() {
    const o = this.ds.options as unknown as { url?: string; host?: string; port?: number; username?: string; password?: string; database?: string };
    return o.url ? { connectionString: o.url } : { host: o.host, port: o.port, user: o.username, password: o.password, database: o.database };
  }

  private async connect() {
    if (this.stopped) return;
    const client = new Client({ ...this.connOptions(), application_name: 'unified-listener' });
    client.on('notification', () => void this.drain());
    client.on('error', (e) => this.log.warn(`listener error: ${e.message}`));
    client.on('end', () => {
      if (this.stopped) return;
      this.log.warn(`listener disconnected — retry in ${this.retryMs}ms`);
      setTimeout(() => void this.connect(), this.retryMs).unref();
      this.retryMs = Math.min(this.retryMs * 2, 30_000);
    });
    try {
      await client.connect();
      await client.query('LISTEN unified_changes');
      this.client = client;
      this.retryMs = 1000;
      void this.drain(); // أي حاجة فاتت وقت الانقطاع
    } catch (e) {
      this.log.warn(`listener connect failed: ${(e as Error).message}`);
      await client.end().catch(() => undefined);
    }
  }

  /** يقرا كل التغييرات بعد lastSeq ويبثها (تسلسلي — إشعارات كتير ورا بعض = قراءة واحدة) */
  async drain(): Promise<void> {
    if (this.draining) { this.pending = true; return; }
    this.draining = true;
    try {
      do {
        this.pending = false;
        for (;;) {
          const rows = await this.data.loadChangeRows(`c.seq > $1 ORDER BY c.seq LIMIT 500`, [this.lastSeq]);
          if (!rows.length) break;
          this.lastSeq = Number(rows[rows.length - 1].seq);
          this.gateway.broadcast(rows);
          if (rows.length < 500) break;
        }
      } while (this.pending);
    } catch (e) {
      this.log.error(`drain failed: ${(e as Error).message}`);
    } finally {
      this.draining = false;
    }
  }
}
