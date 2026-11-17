import { plainToInstance, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength, validateSync } from 'class-validator';

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

  /** توقيع JWT — مطلوب في الإنتاج. في التطوير/الاختبار لو مش موجود بيتولّد عشوائي لكل تشغيل */
  @IsOptional() @IsString() @MinLength(32)
  JWT_SECRET?: string;

  /** عمر access token بالثواني (الخطة: 15 دقيقة) */
  @Type(() => Number) @IsInt() @Min(60) @Max(3600)
  JWT_ACCESS_TTL_SEC = 900;

  /** عمر refresh token بالأيام */
  @Type(() => Number) @IsInt() @Min(1) @Max(90)
  REFRESH_TTL_DAYS = 14;

  /** cookie Secure (لازم true ورا HTTPS — false بس للتجربة على http غير localhost) */
  @IsOptional() @IsIn(['true', 'false'])
  COOKIE_SECURE?: 'true' | 'false';

  /** حد محاولات الدخول لكل (IP + اسم مستخدم) في الدقيقة */
  @Type(() => Number) @IsInt() @Min(1) @Max(1000)
  LOGIN_RATE_LIMIT_PER_MIN = 5;

  /** عدد المحاولات الفاشلة المتتالية قبل قفل الحساب مؤقتًا، ومدة القفل */
  @Type(() => Number) @IsInt() @Min(3) @Max(100)
  LOGIN_MAX_FAILURES = 10;
  @Type(() => Number) @IsInt() @Min(1) @Max(1440)
  LOGIN_LOCK_MINUTES = 15;

  /** كلمة مرور أول أدمن (لو الداتابيز فاضية). لو مش محددة بتتولّد عشوائي وتتكتب في السجل مرة واحدة. تغييرها إجباري أول دخول */
  @IsOptional() @IsString() @MinLength(10)
  ADMIN_INITIAL_PASSWORD?: string;

  /** المرحلة 2 — 2FA: مفتاح تشفير أسرار TOTP (32 بايت: 64 hex أو base64). لو مش موجود بيتشتق من JWT_SECRET */
  @IsOptional() @IsString() @Matches(/^([0-9a-fA-F]{64}|[A-Za-z0-9+/]{43}=)$/, { message: 'TOTP_ENC_KEY لازم 32 بايت (64 hex أو base64)' })
  TOTP_ENC_KEY?: string;

  /** أدوار لازم تفعّل 2FA (مفصولة بفاصلة، مثلًا admin). المستخدم بيقدر يدخل بس مايقدرش يعمل أي حاجة غير تفعيل 2FA */
  @IsOptional() @IsString()
  REQUIRE_2FA_ROLES?: string;

  /** المرحلة 2 — رفع الملفات: الحد الأقصى بالميجابايت (القرار B-59: 25) */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  ATTACH_MAX_MB?: number;

  /** ترويسات CSP (الطوارئ بس: false بيقفلها) */
  @IsOptional() @IsIn(['true', 'false']) CSP_ENFORCE?: 'true' | 'false';
  @IsOptional() @IsIn(['true', 'false']) CSP_REPORT_ONLY?: 'true' | 'false';
  /** أصول إضافية مسموح لها بطلبات التعديل (مفصولة بفاصلة) — الافتراضي: نفس الأصل بس */
  @IsOptional() @IsString() ALLOWED_ORIGINS?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  // متغير فاضي (VAR= في .env أو ${VAR:-} في Compose) = مش محدد
  config = Object.fromEntries(Object.entries(config).filter(([, v]) => v !== ''));
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
