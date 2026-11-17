#!/bin/sh
# سياسة الاحتفاظ (B-65): كل النسخ آخر 30 يوم، وبعدها آخر نسخة من كل أسبوع لـ 12 أسبوع، وآخر نسخة من كل شهر لـ 12 شهر.
# WAL: بيتمسح اللي أقدم من بداية أقدم نسخة كاملة جوه نافذة الـ 30 يوم → الاستعادة لأي نقطة زمنية متاحة آخر 30 يوم،
# والأقدم من كده استعادة لوقت النسخة نفسها (كل نسخة فيها الـ WAL اللازم ليها).
#   retention.sh                 ← النسخ المحلية + WAL
#   retention.sh <مجلد> <امتداد>  ← مجلد واحد (مثلًا النسخ المشفّرة الخارجية)
# RETENTION_NOW=<epoch> للاختبار بس.
. /opt/backup/lib.sh
NOW=${RETENTION_NOW:-$(date -u +%s)}

stamps() { ls "$1" 2>/dev/null | sed -n "s/^\([0-9]\{8\}T[0-9]\{6\}Z\)$2\$/\1/p" | sort -r; }

keep_list() { # dir suffix → الطوابع اللي تتحفظ
  stamps "$1" "$2" | while read -r ts; do
    e=$(date -u -d "$(echo "$ts" | sed 's/^\(....\)\(..\)\(..\)T\(..\)\(..\)\(..\)Z$/\1-\2-\3 \4:\5:\6/')" +%s)
    printf '%s %s %s %s\n' "$ts" "$(( (NOW - e) / 86400 ))" "$(date -u -d "@$e" +%G-%V)" "$(echo "$ts" | cut -c1-6)"
  done | awk -v kd="$KEEP_DAILY_DAYS" -v kw="$KEEP_WEEKLY" -v km="$KEEP_MONTHLY" '
    { if ($2 <= kd) { print $1; next }
      if (!($3 in w) && nw < kw) { w[$3] = 1; nw++; print $1; next }
      if (!($4 in m) && nm < km) { m[$4] = 1; nm++; print $1; next } }'
}

apply() { # dir suffix
  dir=$1; suf=$2
  keep=$(keep_list "$dir" "$suf")
  for ts in $(stamps "$dir" "$suf"); do
    echo "$keep" | grep -qx "$ts" && continue
    safe_rm_file "$dir" "$ts$suf"
    safe_rm_file "$dir" "$ts$suf.sha256"
    safe_rm_file "$dir" "$ts.startwal"
    log_event retention ok "" "deleted $dir/$ts$suf"
  done
}

if [ -n "${1:-}" ]; then apply "$1" "${2:-.tar.gz}"; exit 0; fi
apply "$BACKUP_ROOT/base" .tar.gz
apply "$BACKUP_ROOT/dump" .dump
cutoff=$(date -u -d "@$(( NOW - KEEP_DAILY_DAYS * 86400 ))" +%Y%m%dT%H%M%SZ)
oldest=$(ls "$BACKUP_ROOT/base" | sed -n 's/^\([0-9]\{8\}T[0-9]\{6\}Z\)\.startwal$/\1/p' | sort | awk -v c="$cutoff" '$1 >= c' | head -1)
if [ -n "$oldest" ]; then
  first=$(cat "$BACKUP_ROOT/base/$oldest.startwal")
  pg_archivecleanup -x .gz "$BACKUP_ROOT/wal" "$first" && log_event wal-cleanup ok "" "removed WAL before $first"
fi
