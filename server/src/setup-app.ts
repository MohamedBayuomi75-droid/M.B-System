import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { SERVER_VERSION } from './version';

/** إعدادات مشتركة بين main.ts والاختبارات (عشان الاختبار يختبر نفس السلوك بالظبط). */
export function setupApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  // التحقق من المدخلات على السيرفر دايمًا: أي حقل مش في الـ DTO = 400
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  app.use(cookieParser());
  // الـ sync ممكن يشيل دفعة كبيرة (أول مزامنة بعد الاستيراد) — الافتراضي 100kb
  (app as unknown as { useBodyParser: (t: string, o: object) => void }).useBodyParser('json', { limit: process.env.BODY_LIMIT || '20mb' });
  const http = app.getHttpAdapter().getInstance();
  http.disable?.('x-powered-by');
  http.set?.('trust proxy', 'loopback, uniquelocal'); // خلف Caddy

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
