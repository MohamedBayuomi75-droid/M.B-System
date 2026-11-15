import { plainToInstance, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength, validateSync } from 'class-validator';

/** كل إعدادات السيرفر من env — بتتحقق عند الإقلاع، ولو فيه غلط السيرفر مش هيقوم. */
export class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: 'development' | 'test' | 'production' = 'development';

  @Type(() => Number) @IsInt() @Min(1) @Max(65535)
  PORT = 3000;

  @IsOptional() @IsString()
  DATABASE_URL?: string;

  @IsString() DB_HOST = 'localhost';
  @Type(() => Number) @IsInt() DB_PORT = 5432;
  @IsString() DB_USER = 'unified';
  @IsOptional() @IsString() DB_PASSWORD?: string;
  @IsString() DB_NAME = 'unified';

  @IsIn(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
  LOG_LEVEL = 'info';

  /** Swagger على /api/docs — مفعّل افتراضيًا إلا في الإنتاج */
  @IsOptional() @IsIn(['true', 'false'])
  SWAGGER_ENABLED?: 'true' | 'false';

  /** يشغّل الـ migrations تلقائيًا عند الإقلاع (للتطوير بس — في Compose فيه خدمة migrate منفصلة) */
  @IsOptional() @IsIn(['true', 'false'])
  DB_MIGRATIONS_RUN?: 'true' | 'false';

  /** يستخدم في A2 لتوقيع JWT — مطلوب في الإنتاج */
  @IsOptional() @IsString() @MinLength(32)
  JWT_SECRET?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true, exposeDefaultValues: true });
  const errors = validateSync(env, { skipMissingProperties: false, whitelist: false });
  if (env.NODE_ENV === 'production') {
    if (!env.JWT_SECRET) errors.push({ property: 'JWT_SECRET', constraints: { required: 'JWT_SECRET مطلوب في الإنتاج (32 حرف على الأقل)' } } as never);
    if (!env.DATABASE_URL && !env.DB_PASSWORD) errors.push({ property: 'DB_PASSWORD', constraints: { required: 'DB_PASSWORD أو DATABASE_URL مطلوب في الإنتاج' } } as never);
  }
  if (errors.length) {
    const msg = errors.map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`).join('\n');
    throw new Error('إعدادات env غير صالحة:\n' + msg);
  }
  return env;
}
