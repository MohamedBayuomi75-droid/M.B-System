import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** قراءة تاريخ سجل من changes (إلحاق فقط) — SQL بس */
@Injectable()
export class HistoryRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}
  async record(collection: string, id: string): Promise<{ data: Record<string, unknown>; deleted_at: Date | null } | null> {
    return (await this.ds.query(`SELECT data, deleted_at FROM records WHERE collection = $1 AND id = $2`, [collection, id]))[0] ?? null;
  }
  changes(collection: string, id: string, limit: number): Promise<{ seq: string; op: string; rev: number; user_id: string | null; username: string | null; fields: string[]; diff: Record<string, unknown> | null; at: Date }[]> {
    return this.ds.query(`SELECT c.seq, c.op, c.rev, c.user_id, u.username, c.fields, c.diff, c.at FROM changes c LEFT JOIN users u ON u.id = c.user_id
      WHERE c.collection = $1 AND c.record_id = $2 ORDER BY c.seq DESC LIMIT $3`, [collection, id, limit]);
  }
}
