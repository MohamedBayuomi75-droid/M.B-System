import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * صيغة أخطاء موحّدة لكل الـ API (المرحلة 4): { statusCode, code, message, requestId }.
 *  - أخطاء HttpException بتحتفظ بالـ code والرسالة بتاعتها (الواجهة القديمة بتعتمد عليهم)، ولو مفيش code بيتحط حسب الحالة.
 *  - أي خطأ تاني = 500 INTERNAL برسالة عامة (التفاصيل والـ stack في اللوج بس — مابتطلعش للمستخدم).
 */
const CODE_BY_STATUS: Record<number, string> = {
  400: 'VALIDATION_FAILED', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE', 423: 'LOCKED', 429: 'TOO_MANY_REQUESTS',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger('ApiError');
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    if (res.headersSent) return;
    const requestId = String(res.getHeader('x-request-id') || req.headers['x-request-id'] || '') || undefined;
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const r = exception.getResponse();
      const body = (typeof r === 'object' && r !== null ? { ...(r as Record<string, unknown>) } : { message: r }) as Record<string, unknown>;
      body.statusCode = status;
      if (!body.code) body.code = CODE_BY_STATUS[status] || (status >= 500 ? 'INTERNAL' : 'ERROR');
      delete body.error;
      res.status(status).json({ ...body, requestId });
      return;
    }
    this.log.error(`unhandled error on ${req.method} ${req.originalUrl} [${requestId}]: ${(exception as Error)?.stack || exception}`);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: 500, code: 'INTERNAL', message: 'حصل خطأ غير متوقع — بلّغ الدعم برقم الطلب', requestId });
  }
}
