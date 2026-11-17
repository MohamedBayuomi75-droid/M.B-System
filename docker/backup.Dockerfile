# حاوية النسخ الاحتياطي — المرحلة 2 (S-7، B-63…B-66). نفس إصدار PostgreSQL + node (للتشفير AES-256-GCM).
# من غير أي تحميل من الإنترنت وقت البناء (node بيتنسخ من صورة node الرسمية).
FROM postgres:16-alpine
COPY --from=node:22-alpine /usr/local/bin/node /usr/local/bin/node
COPY docker/backup/ /opt/backup/
RUN chmod 755 /opt/backup/*.sh && mkdir -p /var/log/backup
ENTRYPOINT ["/opt/backup/entrypoint.sh"]
