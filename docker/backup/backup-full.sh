#!/bin/sh
# نسخة كاملة يومية (B-63): pg_basebackup (للاستعادة لنقطة زمنية مع WAL) + pg_dump (نسخة منطقية مستقلة)،
# التحقق من النسختين، البصمة، السجل، ثم سياسة الاحتفاظ والنسخة المشفّرة الخارجية.
. /opt/backup/lib.sh
exec 9>/tmp/backup-full.lock
flock -n 9 || { echo "another full backup is running"; exit 0; }
TS=$(date -u +%Y%m%dT%H%M%SZ)
BASE="$BACKUP_ROOT/base"
WORK="$BASE/$TS.partial"
cleanup() { [ -n "${WORK:-}" ] && [ -d "$WORK" ] && rm -rf -- "${WORK:?}"; }
trap cleanup EXIT
START=$(date +%s)
if ! pg_basebackup -D "$WORK" -Fp -X stream -c fast -l "erp-$TS" --manifest-checksums=SHA256 2>/tmp/bb.err; then
  log_event base failed "" "pg_basebackup: $(tail -3 /tmp/bb.err)"; exit 1
fi
if ! pg_verifybackup -q "$WORK" 2>/tmp/vb.err; then log_event base failed "" "pg_verifybackup: $(tail -3 /tmp/vb.err)"; exit 1; fi
sed -n 's/^START WAL LOCATION: .*(file \([0-9A-F]*\)).*/\1/p' "$WORK/backup_label" > "$BASE/$TS.startwal"
tar -C "$WORK" -czf "$BASE/$TS.tar.gz.tmp" . && mv "$BASE/$TS.tar.gz.tmp" "$BASE/$TS.tar.gz"
( cd "$BASE" && sha256sum "$TS.tar.gz" > "$TS.tar.gz.sha256" )
log_event base ok "$BASE/$TS.tar.gz" "seconds=$(( $(date +%s) - START ))"
cleanup; trap - EXIT

DUMP="$BACKUP_ROOT/dump"
if pg_dump -Fc -Z 6 -f "$DUMP/$TS.dump.tmp" && pg_restore -l "$DUMP/$TS.dump.tmp" >/dev/null; then
  mv "$DUMP/$TS.dump.tmp" "$DUMP/$TS.dump"
  ( cd "$DUMP" && sha256sum "$TS.dump" > "$TS.dump.sha256" )
  log_event dump ok "$DUMP/$TS.dump" ""
else
  safe_rm_file "$DUMP" "$TS.dump.tmp" || true
  log_event dump failed "" "pg_dump/pg_restore -l failed"
fi
/opt/backup/retention.sh || true
/opt/backup/offsite.sh full || true
