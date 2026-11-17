#!/bin/sh
# استعادة نسخة كاملة (+ WAL لنقطة زمنية اختيارية) في مجلد بيانات **جديد** — عمره ما بيلمس القاعدة الشغالة.
#   restore.sh <طابع-النسخة|latest> <مجلد-الهدف> [وقت-الهدف]
#   مثال: restore.sh latest /restore/pgdata "2026-11-17 10:15:00+02"
#   RESTORE_FROM=offsite → يفك التشفير من OFFSITE_DIR بدل النسخ المحلية
# بعد كده: postgres -D <مجلد-الهدف> بيطبّق WAL لحد الوقت المطلوب ويفتح القاعدة. الإجراء الكامل: docs/OPERATIONS_SECURITY_BACKUP.md
. /opt/backup/lib.sh
TS=${1:?backup timestamp or latest}; TARGET=${2:?target dir}; UNTIL=${3:-}
FROM=${RESTORE_FROM:-local}
SRC_BASE="$BACKUP_ROOT/base"; WALDIR="$BACKUP_ROOT/wal"; EXT=".tar.gz"
if [ "$FROM" = offsite ]; then SRC_BASE="$OFFSITE_DIR/base"; EXT=".tar.gz.enc"; fi
if [ "$TS" = latest ]; then TS=$(ls "$SRC_BASE" | sed -n "s/^\([0-9]\{8\}T[0-9]\{6\}Z\)$(echo "$EXT" | sed 's/\./\\./g')\$/\1/p" | sort | tail -1); fi
[ -n "$TS" ] || { echo "no backup found in $SRC_BASE"; exit 1; }
if [ -e "$TARGET" ] && [ -n "$(ls -A "$TARGET" 2>/dev/null)" ]; then echo "target $TARGET is not empty — refusing"; exit 1; fi
mkdir -p "$TARGET"; chmod 700 "$TARGET"
if [ "$FROM" = offsite ]; then
  ( cd "$SRC_BASE" && sha256sum -c "$TS$EXT.sha256" ) || { echo "checksum mismatch — backup damaged"; exit 1; }
  WORKDIR=$(mktemp -d /tmp/restore-src.XXXXXX)
  node /opt/backup/crypt.mjs dec "$SRC_BASE/$TS$EXT" "$WORKDIR/base.tar.gz" "$KEY_FILE"
  ARCHIVE="$WORKDIR/base.tar.gz"; WALDIR="$WORKDIR/wal"; mkdir -p "$WALDIR"
  for w in $(ls "$OFFSITE_DIR/wal" | grep '\.enc$' || true); do node /opt/backup/crypt.mjs dec "$OFFSITE_DIR/wal/$w" "$WALDIR/${w%.enc}" "$KEY_FILE"; done
  chmod -R a+rX "$WORKDIR"
else
  ARCHIVE="$SRC_BASE/$TS$EXT"
  ( cd "$SRC_BASE" && sha256sum -c "$TS$EXT.sha256" ) || { echo "checksum mismatch — backup damaged"; exit 1; }
fi
tar -C "$TARGET" -xzf "$ARCHIVE"
[ "$FROM" = offsite ] && safe_rm_file "$WORKDIR" base.tar.gz
# الاستعادة: WAL من الأرشيف (مضغوط) لحد الوقت المطلوب، وبعدها القاعدة تفتح للكتابة
{
  echo "restore_command = 'gunzip -c $WALDIR/%f.gz > %p'"
  [ -n "$UNTIL" ] && echo "recovery_target_time = '$UNTIL'"
  echo "recovery_target_action = 'promote'"
  # المجلد المستعاد ممنوع يأرشف WAL فوق أرشيف الإنتاج
  echo "archive_mode = off"
} >> "$TARGET/postgresql.auto.conf"
touch "$TARGET/recovery.signal"
chown -R postgres:postgres "$TARGET" 2>/dev/null || true
echo "restored base $TS into $TARGET${UNTIL:+ (target time $UNTIL)} from $FROM"
