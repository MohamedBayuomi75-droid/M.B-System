import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import express from 'express';
import { mountLegacyUi } from './legacy-ui';
import { CSP_REPORT_PATH, securityHeaders } from './security/security-headers';
import { originCheck } from './security/origin-check';
import { cspReportHandler } from './security/csp-report';
import { ApiExceptionFilter } from './common/http-exception.filter';
import { SERVER_VERSION } from './version';

/** إعدادات مشتركة بين main.ts والاختبارات (عشان الاختبار يختبر نفس السلوك بالظبط). */
export function setupApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  // التحقق من المدخلات على السيرفر دايمًا: أي حقل مش في الـ DTO = 400
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  // المرحلة 4: صيغة أخطاء موحّدة { statusCode, code, message, requestId }
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  app.use(cookieParser());
  // الـ sync ممكن يشيل دفعة كبيرة (أول مزامنة بعد الاستيراد) — الافتراضي 100kb
  (app as unknown as { useBodyParser: (t: string, o: object) => void }).useBodyParser('json', { limit: process.env.BODY_LIMIT || '20mb' });
  const http = app.getHttpAdapter().getInstance();
  http.disable?.('x-powered-by');
  http.set?.('trust proxy', process.env.TRUST_PROXY || 'loopback, uniquelocal'); // خلف Nginx (شبكة Docker الداخلية)
  // المرحلة 2: ترويسات الأمان وCSP على كل الردود (API + الواجهة) + فحص الأصل للطلبات اللي بتغيّر حاجة
  app.use(securityHeaders());
  app.use(originCheck());
  http.post?.(CSP_REPORT_PATH, express.json({ type: ['application/csp-report', 'application/reports+json', 'application/json'], limit: '32kb' }), cspReportHandler);

  if (process.env.LEGACY_UI !== 'false') mountLegacyUi(app);

  const swaggerOn = process.env.SWAGGER_ENABLED ? process.env.SWAGGER_ENABLED === 'true' : process.env.NODE_ENV !== 'production';
  if (swaggerOn) {
    const config = new DocumentBuilder()
      .setTitle('النظام الموحد — API')
      .setDescription('Compat API (للواجهة القديمة) + Resource API /api/v1 (لـ Angular). المصدر لتوليد عميل Angular.')
      .setVersion(SERVER_VERSION)
      .addBearerAuth()
      .addCookieAuth('refresh_token')
      .build();
    const doc = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, doc, { jsonDocumentUrl: 'api/docs-json' });
  }
}
