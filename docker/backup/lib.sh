#!/bin/sh
# إعدادات مشتركة لسكربتات النسخ (المرحلة 2 — S-7). كل القيم من env (docker/.env).
set -eu
[ -f /opt/backup/env.sh ] && . /opt/backup/env.sh
export PGHOST="${PGHOST:-db}" PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-${DB_USER:-unified}}" PGPASSWORD="${PGPASSWORD:-${DB_PASSWORD:-}}" PGDATABASE="${PGDATABASE:-${DB_NAME:-unified}}"
BACKUP_ROOT="${BACKUP_ROOT:-/backup}"     # جهاز التخزين المنفصل داخل الشركة (B-66)
OFFSITE_DIR="${OFFSITE_DIR:-/offsite}"     # النسخة المشفّرة خارج السيرفر (B-66) — مجلد مركّب من NAS/جهاز آخر
KEY_FILE="${BACKUP_KEY_FILE:-/run/secrets/backup_key}"  # مفتاح التشفير (B-67: مين يحتفظ بيه — مفتوح)
KEEP_DAILY_DAYS="${KEEP_DAILY_DAYS:-30}"  # B-65
KEEP_WEEKLY="${KEEP_WEEKLY:-12}"
KEEP_MONTHLY="${KEEP_MONTHLY:-12}"
LOG="$BACKUP_ROOT/backup-log.jsonl"
mkdir -p "$BACKUP_ROOT/base" "$BACKUP_ROOT/dump" "$BACKUP_ROOT/wal"

now_utc() { date -u +%Y-%m-%dT%H:%M:%SZ; }

# سطر JSON لكل عملية: الوقت، النوع، الحالة، الملف، الحجم، البصمة، الرسالة
log_event() { # kind status file message
  f="${3:-}"; size=""; sha=""
  if [ -n "$f" ] && [ -f "$f" ]; then size=$(stat -c %s "$f"); sha=$(sha256sum "$f" | cut -d' ' -f1); fi
  msg=$(printf '%s' "${4:-}" | tr '"\n' "' ")
  printf '{"at":"%s","kind":"%s","status":"%s","file":"%s","bytes":"%s","sha256":"%s","message":"%s"}\n' "$(now_utc)" "$1" "$2" "$f" "$size" "$sha" "$msg" >> "$LOG"
  [ "$2" = "ok" ] || echo "BACKUP ALERT: $1 $2 $msg" >&2
}

# حذف ملف واحد داخل مجلد معروف — بيرفض أي مسار فاضي أو خارج المجلدات المسموحة
safe_rm_file() { # dir name
  d="${1:?dir}"; n="${2:?name}"
  case "$n" in */*|.|..) echo "refusing to delete '$n'" >&2; return 1;; esac
  case "$d" in "$BACKUP_ROOT"/*|"$OFFSITE_DIR"/*|/tmp/*) ;; *) echo "refusing to delete in '$d'" >&2; return 1;; esac
  rm -f -- "${d:?}/${n:?}"
}
