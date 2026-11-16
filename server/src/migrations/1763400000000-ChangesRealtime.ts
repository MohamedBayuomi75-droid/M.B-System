import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 0003 — طبقة البيانات والبث اللحظي (A3):
 *  - changes.fields: أسماء الحقول اللي كل تغيير لمسها (اكتشاف التعارض على مستوى الحقل).
 *  - فهرس (collection, record_id, rev) بدل (collection, record_id).
 *  - trigger بيعمل NOTIFY unified_changes بالـ seq بعد كل إدراج (Postgres بيوصّل الإشعار بعد COMMIT وبالترتيب).
 */
export class ChangesRealtime1763400000000 implements MigrationInterface {
  name = 'ChangesRealtime1763400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."ix_changes_record"`);
    await queryRunner.query(`ALTER TABLE "changes" ADD "fields" text array NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`CREATE INDEX "ix_changes_record_rev" ON "changes" ("collection", "record_id", "rev")`);
    await queryRunner.query(`
      CREATE FUNCTION "notify_change"() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM pg_notify('unified_changes', NEW.seq::text);
        RETURN NULL;
      END $$`);
    await queryRunner.query(`CREATE TRIGGER "trg_changes_notify" AFTER INSERT ON "changes" FOR EACH ROW EXECUTE FUNCTION "notify_change"()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER "trg_changes_notify" ON "changes"`);
    await queryRunner.query(`DROP FUNCTION "notify_change"()`);
    await queryRunner.query(`DROP INDEX "public"."ix_changes_record_rev"`);
    await queryRunner.query(`ALTER TABLE "changes" DROP COLUMN "fields"`);
    await queryRunner.query(`CREATE INDEX "ix_changes_record" ON "changes" ("collection", "record_id")`);
  }
}
