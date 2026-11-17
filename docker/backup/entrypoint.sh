#!/bin/sh
# حاوية النسخ: جدولة (crond) — نسخة كاملة يومية 01:30، WAL للخارج كل 15 دقيقة، فحص كل ساعة.
# أوامر يدوية: docker compose exec backup /opt/backup/<backup-full|restore-test|check|restore>.sh
set -eu
# متغيرات البيئة لـ cron (cron بيشغّل الأوامر من غير env الحاوية)
env | grep -E '^(PG|DB_USER|DB_NAME|DB_PASSWORD|BACKUP|OFFSITE|KEEP_)' | sed "s/'/'\\\\''/g; s/^\([^=]*\)=\(.*\)$/export \1='\2'/" > /opt/backup/env.sh
chmod 600 /opt/backup/env.sh
. /opt/backup/lib.sh
# PostgreSQL (uid 70) بيكتب WAL هنا مباشرة (archive_command في خدمة db)
chown 70:70 "$BACKUP_ROOT/wal"
# الجذر 711: PostgreSQL (uid 70) يقدر يعدّي لـ wal/ بس، من غير ما يشوف باقي النسخ
chmod 711 "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT/wal"
if [ "$#" -gt 0 ]; then exec "$@"; fi
{
  echo "${BACKUP_FULL_CRON:-30 1 * * *} /opt/backup/backup-full.sh >> /var/log/backup/full.log 2>&1"
  echo "*/15 * * * * /opt/backup/offsite.sh wal >> /var/log/backup/offsite.log 2>&1"
  echo "7 * * * * /opt/backup/check.sh >> /var/log/backup/check.log 2>&1"
} > /etc/crontabs/root
# أول تشغيل: نسخة كاملة بعد دقيقة لو مفيش (عشان الـ WAL يبقى ليه نقطة بداية)
if [ -z "$(ls "$BACKUP_ROOT/base" | grep '\.tar\.gz$' || true)" ]; then (sleep 60; /opt/backup/backup-full.sh >> /var/log/backup/full.log 2>&1) & fi
exec crond -f -l 6
