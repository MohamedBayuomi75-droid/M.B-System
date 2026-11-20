import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface DocRow { key: string; data: unknown; rev: number }

/** القوايم المرجعية في جدول docs — نفس المصدر اللي الواجهة القديمة بتقرا وتكتب فيه (/api/bootstrap و/api/sync) */
@Injectable()
export class ReferenceRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}
  many(keys: string[]): Promise<DocRow[]> {
    return this.ds.query(`SELECT key, data, rev FROM docs WHERE key = ANY($1::text[])`, [keys]);
  }
}
