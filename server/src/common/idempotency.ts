import { CallHandler, ConflictException, ExecutionContext, HttpException, Injectable, NestInterceptor, SetMetadata, UnprocessableEntityException, BadRequestException, UseInterceptors, applyDecorators } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { from, lastValueFrom, Observable } from 'rxjs';
import { DataSource } from 'typeorm';

/**
 * Idempotency (المرحلة 5، APPROVAL_WORKFLOW_DESIGN §6): العمليات الحساسة (قرارات الاعتماد، الإلغاء، الترحيل، الصرف…)
 * لازم تيجي بـ «Idempotency-Key». نفس المفتاح ونفس الطلب ← نفس الرد المحفوظ من غير تنفيذ تاني (ضغطة مكررة/إعادة إرسال الشبكة).
 *  - نفس المفتاح بطلب مختلف ← 422 IDEMPOTENCY_KEY_REUSED · الطلب الأول لسه شغال ← 409 IDEMPOTENCY_IN_PROGRESS
 *  - لو العملية فشلت، المفتاح بيتشال (ينفع تتعاد بنفس المفتاح).
 */
const IDEMPOTENT = 'idempotent';
const KEY_RE = /^[A-Za-z0-9_.:-]{8,200}$/;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.reflector.get<boolean>(IDEMPOTENT, ctx.getHandler())) return next.handle();
    const req = ctx.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const res = ctx.switchToHttp().getResponse<Response>();
    return from(this.run(req, res, () => lastValueFrom(next.handle(), { defaultValue: undefined })));
  }

  private async run(req: Request & { user?: { id: string } }, res: Response, exec: () => Promise<unknown>) {
    const key = String(req.headers['idempotency-key'] || '');
    if (!KEY_RE.test(key)) throw new BadRequestException({ statusCode: 400, code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'العملية دي محتاجة ترويسة Idempotency-Key (8–200 حرف)' });
    const userId = req.user!.id;
    const hash = createHash('sha256').update(`${req.method} ${req.originalUrl.split('?')[0]}\n${JSON.stringify(req.body ?? {})}`).digest('hex');
    const [rows] = await this.ds.query(`INSERT INTO idempotency_keys (user_id, key, method, path, request_hash) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING key`, [userId, key, req.method, req.originalUrl.split('?')[0], hash]).then((r: unknown) => (Array.isArray(r) && Array.isArray(r[0]) ? r : [r]));
    if (!rows || !rows.length) {
      const [prev] = await this.ds.query(`SELECT request_hash, status_code, response FROM idempotency_keys WHERE user_id = $1 AND key = $2`, [userId, key]);
      if (prev.request_hash !== hash) throw new UnprocessableEntityException({ statusCode: 422, code: 'IDEMPOTENCY_KEY_REUSED', message: 'المفتاح ده اتستخدم لطلب مختلف' });
      if (prev.status_code == null) throw new ConflictException({ statusCode: 409, code: 'IDEMPOTENCY_IN_PROGRESS', message: 'نفس الطلب لسه بيتنفذ' });
      res.status(prev.status_code).setHeader('Idempotent-Replay', 'true');
      return prev.response;
    }
    try {
      const out = await exec();
      await this.ds.query(`UPDATE idempotency_keys SET status_code = $3, response = $4::jsonb WHERE user_id = $1 AND key = $2`, [userId, key, res.statusCode || 200, JSON.stringify(out ?? null)]);
      return out;
    } catch (e) {
      await this.ds.query(`DELETE FROM idempotency_keys WHERE user_id = $1 AND key = $2`, [userId, key]);
      throw e instanceof HttpException ? e : e;
    }
  }
}

/** على الـ handler: لازم Idempotency-Key */
export const Idempotent = () => applyDecorators(SetMetadata(IDEMPOTENT, true), UseInterceptors(IdempotencyInterceptor));
