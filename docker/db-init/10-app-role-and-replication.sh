#!/bin/sh
# بيشتغل مرة واحدة بس عند إنشاء القاعدة لأول مرة (volume فاضي) — المرحلة 2:
#  1) دور التطبيق unified_app بأقل صلاحية (السيرفر بيتصل بيه؛ الـ migrations بالمالك) — الصلاحيات نفسها في migration 0004.
#  2) السماح باتصال replication من شبكة Compose (للنسخ الكامل pg_basebackup من حاوية backup).
# قاعدة موجودة قبل كده: نفّذ نفس الأوامر يدويًا (docs/OPERATIONS_SECURITY_BACKUP.md).
set -eu
if [ -z "${DB_APP_PASSWORD:-}" ]; then echo "DB_APP_PASSWORD is required" >&2; exit 1; fi
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v pw="$DB_APP_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE unified_app LOGIN PASSWORD %L', :'pw') WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'unified_app') \gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SQL
echo "host replication ${POSTGRES_USER} samenet scram-sha-256" >> "$PGDATA/pg_hba.conf"
