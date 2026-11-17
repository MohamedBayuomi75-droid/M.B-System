import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

export type IsolationLevel = 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';

/**
 * المعاملات الموحّدة (المرحلة 4، TARGET_ARCHITECTURE §6.4 «العمليات المترابطة في Transaction واحدة»):
 *  - كل عملية بتكتب أكتر من صف = run(fn) واحدة؛ أي خطأ = ROLLBACK كامل (مفيش نص عملية).
 *  - lockKeys: أقفال استشارية (pg_advisory_xact_lock) بتتفك تلقائيًا مع نهاية المعاملة — لتسلسل عمليات زي الترقيم أو تحديث رصيد.
 *  - الطبقات: الـ Service هو اللي بيستدعي run() ويمرّر الـ EntityManager للـ Repositories (الـ Controller عمره ما بيفتح معاملة).
 */
@Injectable()
export class TransactionRunner {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async run<T>(fn: (em: EntityManager) => Promise<T>, opts: { isolation?: IsolationLevel; lockKeys?: number[] } = {}): Promise<T> {
    return this.ds.transaction(opts.isolation ?? 'READ COMMITTED', async (em) => {
      for (const k of [...(opts.lockKeys ?? [])].sort((a, b) => a - b)) await em.query('SELECT pg_advisory_xact_lock($1)', [k]);
      return fn(em);
    });
  }
}
