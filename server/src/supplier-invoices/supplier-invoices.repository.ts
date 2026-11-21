import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';

export interface Rec { id: string; data: Record<string, any>; rev: number } // eslint-disable-line @typescript-eslint/no-explicit-any

/** القراءة من legacy_records (records قبل النقل، والجدول بعده). الكتابة عن طريق DataService.sync */
@Injectable()
export class SupplierInvoicesRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}
  all(collection: 'ledger.invoices' | 'ledger.suppliers' | 'ledger.payments', qr?: QueryRunner): Promise<Rec[]> {
    return (qr ?? this.ds).query(`SELECT id, data, rev FROM legacy_records WHERE collection = $1 AND deleted_at IS NULL ORDER BY created_at, id`, [collection]);
  }
  async one(collection: string, id: string, qr?: QueryRunner): Promise<Rec | null> {
    return (await (qr ?? this.ds).query(`SELECT id, data, rev FROM legacy_records WHERE collection = $1 AND id = $2 AND deleted_at IS NULL`, [collection, id]))[0] ?? null;
  }
  events(aggregateId: string): Promise<{ event_type: string; idempotency_key: string; payload: Record<string, unknown> }[]> {
    return this.ds.query(`SELECT event_type, idempotency_key, payload FROM integration_events WHERE aggregate_type = 'supplier-invoice' AND aggregate_id = $1 ORDER BY seq`, [aggregateId]);
  }
}
