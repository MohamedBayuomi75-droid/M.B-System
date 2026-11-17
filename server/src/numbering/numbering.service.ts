import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

const SCOPE_RE = /^[a-z][a-z0-9_.:-]{1,80}$/;

/**
 * ترقيم NO_GAPS (ADR-013، B-30، B-69 — المرحلة 5).
 *  - issue() لازم يتنادى **جوه معاملة المستند نفسه** (نفس EntityManager): صف العدّاد بيتقفل (FOR UPDATE) لحد نهاية المعاملة،
 *    فلو المستند فشل الرقم بيرجع معاه (ROLLBACK) — مفيش رقم بيضيع، ومفيش رقمين متكررين حتى مع التزامن.
 *  - document_numbers: سجل كل رقم اتصرف (PRIMARY KEY (scope, number)) — مايتمسحش ومايتغيّرش (Trigger).
 *  - الإلغاء بيغيّر الحالة بس: الملغى بيحتفظ برقمه (ADR-024).
 *  - النطاق (scope) وشكل الرقم الظاهر = B-29 (مفتوح): هنا الرقم صحيح بس، والنطاق اسم بيحدده الموديول (مثلًا 'supplier-payment').
 *  - البيانات القديمة: فجواتها محفوظة ومش بتتعاد (B-69) — الموديول بيبدأ العدّاد بعد آخر رقم قديم عند الترحيل (بموافقة).
 */
@Injectable()
export class NumberingService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async issue(em: EntityManager, scope: string, documentType: string, documentId: string, userId: string | null): Promise<number> {
    if (!em.queryRunner?.isTransactionActive) throw new Error('NumberingService.issue must run inside the document transaction');
    if (!SCOPE_RE.test(scope)) throw new BadRequestException({ statusCode: 400, code: 'BAD_SCOPE', message: 'نطاق ترقيم غير صالح' });
    await em.query(`INSERT INTO document_counters (scope) VALUES ($1) ON CONFLICT (scope) DO NOTHING`, [scope]);
    const [{ last_value }] = await em.query(`SELECT last_value FROM document_counters WHERE scope = $1 FOR UPDATE`, [scope]);
    const n = Number(last_value) + 1;
    await em.query(`UPDATE document_counters SET last_value = $2, updated_at = now() WHERE scope = $1`, [scope, n]);
    try {
      await em.query(`INSERT INTO document_numbers (scope, number, document_type, document_id, issued_by) VALUES ($1, $2, $3, $4, $5)`, [scope, n, documentType, documentId, userId]);
    } catch (e) {
      if ((e as { code?: string }).code === '23505') throw new ConflictException({ statusCode: 409, code: 'ALREADY_NUMBERED', message: 'المستند ده متصرف له رقم قبل كده' });
      throw e;
    }
    return n;
  }

  /** الإلغاء: الرقم بيفضل محجوز للمستند (مش بيرجع للعدّاد) — السبب إلزامي */
  async cancel(em: EntityManager, documentType: string, documentId: string, userId: string, reason: string): Promise<void> {
    if (!reason || !reason.trim()) throw new BadRequestException({ statusCode: 400, code: 'REASON_REQUIRED', message: 'سبب الإلغاء إلزامي' });
    const [rows] = await em.query(`UPDATE document_numbers SET status = 'cancelled', cancelled_by = $3, cancelled_at = now(), cancel_reason = $4
      WHERE document_type = $1 AND document_id = $2 AND status = 'issued' RETURNING number`, [documentType, documentId, userId, reason.trim()]);
    if (!rows.length) throw new ConflictException({ statusCode: 409, code: 'NOT_ISSUED', message: 'المستند مالوش رقم صادر أو اتلغى قبل كده' });
  }

  /** فحص الفجوات: كل رقم من 1 لآخر رقم لازم يكون مسجّل (صادر أو ملغى) */
  async audit(scope: string): Promise<{ scope: string; last: number; issued: number; cancelled: number; missing: number[] }> {
    const [c] = await this.ds.query(`SELECT last_value FROM document_counters WHERE scope = $1`, [scope]);
    const last = c ? Number(c.last_value) : 0;
    const [{ issued, cancelled }] = await this.ds.query(`SELECT count(*) FILTER (WHERE status = 'issued')::int AS issued, count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled FROM document_numbers WHERE scope = $1`, [scope]);
    const missing: { n: string }[] = await this.ds.query(`SELECT g.n FROM generate_series(1, $2::bigint) AS g(n) LEFT JOIN document_numbers d ON d.scope = $1 AND d.number = g.n WHERE d.number IS NULL ORDER BY g.n LIMIT 1000`, [scope, last]);
    return { scope, last, issued, cancelled, missing: missing.map((m) => Number(m.n)) };
  }
}
