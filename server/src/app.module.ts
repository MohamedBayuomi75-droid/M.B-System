import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { LoggerModule } from 'nestjs-pino';
import { AuditModule } from './audit/audit.module';
import { DataModule } from './data/data.module';
import { EventsModule } from './events/domain-events';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { buildDataSourceOptions } from './database/typeorm-options';
import { HealthModule } from './health/health.module';
import { FilesModule } from './files/files.module';
import { CommonModule } from './common/common.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, cache: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        genReqId: (req, res) => {
          const id = (req.headers['x-request-id'] as string) || randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        // ممنوع تسجيل كلمات مرور أو توكنات
        redact: { paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]', '*.password', '*.newPassword', '*.currentPassword'], censor: '[REDACTED]' },
        autoLogging: { ignore: (req) => req.url === '/api/health' },
        // المرحلة 4: كل سطر طلب فيه المستخدم (بعد التوثيق) جنب رقم الطلب
        customProps: (req) => ({ userId: (req as unknown as { user?: { id?: string } }).user?.id }),
        transport: process.env.NODE_ENV === 'development' && process.env.LOG_PRETTY !== 'false' ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
      },
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...buildDataSourceOptions(),
        migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
        retryAttempts: 10,
        retryDelay: 2000,
      }),
    }),
    CommonModule,
    EventsModule,
    AuditModule,
    DataModule,
    AuthModule,
    HealthModule,
    FilesModule,
    ProjectsModule,
  ],
})
export class AppModule {}
