#!/bin/sh
# النسخة المشفّرة خارج السيرفر (B-66): بتتكتب في OFFSITE_DIR (مجلد مركّب من جهاز/NAS تاني) مشفّرة AES-256-GCM.
#   offsite.sh full  ← آخر نسخة كاملة + آخر dump (بعد backup-full) + نفس سياسة الاحتفاظ
#   offsite.sh wal   ← ملفات WAL الجديدة (كل 15 دقيقة) — عشان لو السيرفر والتخزين المحلي ضاعوا مع بعض يفضل الفقد في حدود الـ RPO
. /opt/backup/lib.sh
[ -d "$OFFSITE_DIR" ] && [ -w "$OFFSITE_DIR" ] || { echo "offsite dir not mounted — skipped"; exit 0; }
[ -f "$KEY_FILE" ] || { log_event offsite failed "" "encryption key missing ($KEY_FILE)"; exit 1; }
mkdir -p "$OFFSITE_DIR/base" "$OFFSITE_DIR/dump" "$OFFSITE_DIR/wal"

enc() { # src dst
  [ -f "$2" ] && return 0
  if node /opt/backup/crypt.mjs enc "$1" "$2" "$KEY_FILE"; then
    ( cd "$(dirname "$2")" && sha256sum "$(basename "$2")" > "$(basename "$2").sha256" )
    return 0
  fi
  log_event offsite failed "$1" "encrypt failed"; return 1
}

case "${1:-full}" in
  full)
    b=$(ls "$BACKUP_ROOT/base" | grep '\.tar\.gz$' | sort | tail -1 || true)
    d=$(ls "$BACKUP_ROOT/dump" | grep '\.dump$' | sort | tail -1 || true)
    if [ -n "$b" ] && enc "$BACKUP_ROOT/base/$b" "$OFFSITE_DIR/base/$b.enc"; then
      cp "$BACKUP_ROOT/base/${b%.tar.gz}.startwal" "$OFFSITE_DIR/base/"
      log_event offsite ok "$OFFSITE_DIR/base/$b.enc" ""
    fi
    if [ -n "$d" ] && enc "$BACKUP_ROOT/dump/$d" "$OFFSITE_DIR/dump/$d.enc"; then log_event offsite ok "$OFFSITE_DIR/dump/$d.enc" ""; fi
    /opt/backup/retention.sh "$OFFSITE_DIR/base" .tar.gz.enc
    /opt/backup/retention.sh "$OFFSITE_DIR/dump" .dump.enc
    # WAL الخارجي: نفس حد الـ WAL المحلي
    for w in $(ls "$OFFSITE_DIR/wal" | grep '\.gz\.enc$' || true); do
      [ -f "$BACKUP_ROOT/wal/${w%.enc}" ] && continue
      safe_rm_file "$OFFSITE_DIR/wal" "$w"
      safe_rm_file "$OFFSITE_DIR/wal" "$w.sha256"
    done
    ;;
  wal)
    n=0
    for w in $(ls "$BACKUP_ROOT/wal" | grep -E '^[0-9A-F]{24}(\.[0-9A-F]{8}\.backup)?\.gz$|^[0-9A-F]{8}\.history\.gz$' || true); do
      [ -f "$OFFSITE_DIR/wal/$w.enc" ] && continue
      enc "$BACKUP_ROOT/wal/$w" "$OFFSITE_DIR/wal/$w.enc" && n=$((n + 1))
    done
    [ "$n" -gt 0 ] && log_event offsite-wal ok "" "copied $n WAL files"
    ;;
esac
exit 0
