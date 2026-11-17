#!/bin/sh
# اختبار استعادة فعلي (الخطة §11: وجود نسخة لا يعني نجاح الاستعادة ما لم تُختبر):
# يستعيد آخر نسخة في مجلد مؤقت، يشغّل PostgreSQL منفصل عليه (بورت 5499، من غير شبكة)، يطبع أعداد السجلات،
# يسجّل المدة الفعلية (مقارنة بالـ RTO = 4 ساعات، B-64)، ويمسح المجلد المؤقت.
#   restore-test.sh [وقت-الهدف]        RESTORE_FROM=offsite لاختبار النسخة المشفّرة الخارجية
. /opt/backup/lib.sh
T0=$(date +%s)
DIR=$(mktemp -d /tmp/restore-test.XXXXXX)
rmdir "$DIR"
/opt/backup/restore.sh latest "$DIR" "${1:-}" >/dev/null
su postgres -c "pg_ctl -D $DIR -l $DIR.log -o '-p 5499 -c listen_addresses= -c unix_socket_directories=/tmp' -w -t 900 start" >/dev/null
i=0
while [ "$(su postgres -c "psql -h /tmp -p 5499 -XAtc 'select pg_is_in_recovery()' $PGDATABASE" 2>/dev/null)" != f ]; do
  i=$((i + 1)); [ "$i" -gt 900 ] && { echo "recovery did not finish"; exit 1; }; sleep 1
done
Q="SELECT 'records', count(*) FROM records UNION ALL SELECT 'docs', count(*) FROM docs UNION ALL SELECT 'users', count(*) FROM users UNION ALL SELECT 'audit_log', count(*) FROM audit_log UNION ALL SELECT 'attachments', count(*) FROM attachments UNION ALL SELECT 'changes.max_seq', coalesce(max(seq),0) FROM changes"
RESTORED=$(su postgres -c "psql -h /tmp -p 5499 -XAtF= -c \"$Q\" $PGDATABASE")
su postgres -c "pg_ctl -D $DIR -m fast -w stop" >/dev/null
rm -rf -- "${DIR:?}" "${DIR:?}.log"
SECS=$(( $(date +%s) - T0 ))
echo "$RESTORED"
log_event restore-test ok "" "from=${RESTORE_FROM:-local} seconds=$SECS $(echo "$RESTORED" | tr '\n' ' ')"
echo "restore test finished in ${SECS}s (RTO target 4h = 14400s)"
