#!/bin/sh
# فحص حالة النسخ (كل ساعة): عمر آخر نسخة كاملة، أرشفة WAL شغالة، أخطاء الأرشفة — والنتيجة في status.json.
# أي مشكلة = سطر «BACKUP ALERT» في لوج الحاوية (وسيلة التنبيه نفسها — بريد/رسالة — تتحدد في مرحلة التشغيل).
. /opt/backup/lib.sh
problems=""
last=$(ls "$BACKUP_ROOT/base" | grep '\.tar\.gz$' | sort | tail -1 || true)
if [ -z "$last" ]; then problems="$problems no-full-backup;"; else
  age=$(( ( $(date -u +%s) - $(stat -c %Y "$BACKUP_ROOT/base/$last") ) / 3600 ))
  [ "$age" -le 26 ] || problems="$problems full-backup-age=${age}h;"
fi
arch=$(psql -XAtc "SELECT failed_count, coalesce(extract(epoch from now()-last_archived_time)::int, -1), coalesce(extract(epoch from now()-last_failed_time)::int, -1) FROM pg_stat_archiver" 2>/dev/null || echo "x|x|x")
fails=$(echo "$arch" | cut -d'|' -f1); since_ok=$(echo "$arch" | cut -d'|' -f2); since_fail=$(echo "$arch" | cut -d'|' -f3)
if [ "$fails" = "x" ]; then problems="$problems db-unreachable;"
elif [ "$since_fail" -ge 0 ] && { [ "$since_ok" -lt 0 ] || [ "$since_fail" -lt "$since_ok" ]; }; then problems="$problems wal-archive-failing;"; fi
status=ok; [ -n "$problems" ] && status=alert
printf '{"at":"%s","status":"%s","lastFull":"%s","walSecondsSinceArchived":"%s","problems":"%s"}\n' "$(now_utc)" "$status" "$last" "$since_ok" "$problems" > "$BACKUP_ROOT/status.json"
[ "$status" = ok ] || { log_event check alert "" "$problems"; exit 1; }
