# سيرفر النظام الموحد (NestJS + PostgreSQL)

المرحلة الحالية: **A2** (هيكل + داتابيز + health + مصادقة + مستخدمين + أدوار). الخطة: [`../docs/UNIFIED-WEB-PLAN.md`](../docs/UNIFIED-WEB-PLAN.md).

## التشغيل بـ Docker (كل حاجة)
```bash
cp docker/.env.example docker/.env      # غيّر DB_PASSWORD و JWT_SECRET
docker compose -f docker/docker-compose.yml up -d --build
curl localhost:3000/api/health          # Swagger: http://localhost:3000/api/docs (لو SWAGGER_ENABLED=true)
```
الترتيب: `db` (healthy) ← `migrate` (يطبّق الـ migrations ويخرج 0) ← `server`.

## المصادقة (A2) — بسرعة
```bash
# أول تشغيل بداتابيز فاضية: admin بكلمة مؤقتة (ADMIN_INITIAL_PASSWORD أو عشوائية في السجل)
docker compose -f docker/docker-compose.yml logs server | grep admin
curl -c jar -H 'content-type: application/json' -d '{"username":"admin","password":"..."}' localhost:3000/api/auth/login
#  → { accessToken, expiresIn: 900, user: {..., mustChangePassword: true} } + cookie rt (HttpOnly)
curl -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"newPassword":"..."}' localhost:3000/api/auth/change-password
curl -b jar -c jar -X POST localhost:3000/api/auth/refresh        # access token جديد (والكوكي بتتدوّر)
curl -H "authorization: Bearer $TOKEN" localhost:3000/api/me      # المستخدم + صلاحياته الفعلية
```
- الأدوار والصفحات: `src/authz/roles.ts` (المصدر الوحيد). endpoint عام = `@Public()`، وصلاحية = `@RequirePerms({ flag: 'manageUsers' })` أو `@RequirePerms({ page: 'payroll', action: 'edit' })`.
- أكواد الأخطاء الثابتة: `src/auth/auth.types.ts` (`AuthErrorCode`).

## التطوير المحلي
```bash
docker run -d --name unified-pg-dev -e POSTGRES_USER=unified -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=unified -p 55432:5432 postgres:16-alpine
cd server && npm ci
cp .env.example .env && set -a && . ./.env && set +a
npm run start:dev                       # يبني ويشغّل (DB_MIGRATIONS_RUN=true يطبّق الـ migrations)
```

## الاختبارات
```bash
npm run test:unit    # بدون داتابيز (توافق scrypt ↔ argon2id، env)
npm run test:e2e     # محتاج PostgreSQL: TEST_DATABASE_URL (افتراضي postgres://unified:devpass@localhost:55432/postgres)
npm test             # الاتنين
npm run lint         # tsc --noEmit
```
كل ملف e2e بينشئ قاعدة مؤقتة `unified_test_*` ويمسحها.

## الـ migrations
- `synchronize` ممنوع دايمًا. كل تغيير في الـ schema = migration جديدة في `src/migrations/` + تتسجل في `src/migrations/index.ts`.
- توليد مسودة من الـ entities: `npm run build && npx typeorm migration:generate -d dist/database/data-source.js src/migrations/<Name> -p` ثم راجعها يدويًا.
- `test/schema.e2e-spec.ts` بيفشل لو الـ entities والـ migrations مش متطابقين (drift).
- `npm run migration:show` / `migration:run` / `migration:revert` (بعد `npm run build`).

## الهيكل
```
src/
  main.ts, setup-app.ts (prefix /api، ValidationPipe، Swagger)، app.module.ts (config، pino، TypeORM)
  config/env.validation.ts   كل env بيتحقق عند الإقلاع
  database/                  typeorm-options.ts (مصدر واحد) + data-source.ts (للـ CLI)
  entities/                  جداول الطبقة 1
  migrations/                مرقّمة
  auth/                      login/refresh/logout، strategies (local + jwt)، PasswordService (argon2id + scrypt القديم)، أول admin
  authz/                     roles.ts (المصدر الوحيد)، effective-permissions، guards عامة، decorators
  users/                     /api/users (manageUsers)، /api/me، جلسات الـ refresh
  audit/                     AuditService (audit_log)
  health/                    GET /api/health
```
