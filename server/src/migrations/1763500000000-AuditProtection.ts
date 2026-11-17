import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 0004 — حماية سجل التدقيق (المرحلة 2 — S-6):
 *  1) audit_log و changes «إلحاق فقط»: Trigger بيرفض أي UPDATE/DELETE/TRUNCATE مهما كان المستخدم
 *     (حتى مالك القاعدة — تعطيله محتاج ALTER TABLE ... DISABLE TRIGGER صريح من المالك، وده بيظهر في لوج القاعدة).
 *  2) أقل صلاحية: لو دور التطبيق «unified_app» موجود (بيتعمل من docker/db-init أو يدويًا)،
 *     بياخد SELECT/INSERT/UPDATE/DELETE على الجداول — ما عدا جداول التدقيق: SELECT/INSERT بس — ومش مالك لأي جدول،
 *     فمايقدرش يعطّل الـ Trigger ولا يغيّر الهيكل. الـ migrations بتشتغل بدور المالك (خدمة migrate).
 */
const APPEND_ONLY = ['audit_log', 'changes'];
export const APP_ROLE = 'unified_app';

export class AuditProtection1763500000000 implements MigrationInterface {
  name = 'AuditProtection1763500000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE FUNCTION "forbid_append_only_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'append-only table %: % is not allowed', TG_TABLE_NAME, TG_OP USING ERRCODE = 'insufficient_privilege';
      END $$`);
    for (const t of APPEND_ONLY) {
      await q.query(`CREATE TRIGGER "trg_${t}_no_update_delete" BEFORE UPDATE OR DELETE ON "${t}" FOR EACH ROW EXECUTE FUNCTION "forbid_append_only_mutation"()`);
      await q.query(`CREATE TRIGGER "trg_${t}_no_truncate" BEFORE TRUNCATE ON "${t}" FOR EACH STATEMENT EXECUTE FUNCTION "forbid_append_only_mutation"()`);
      await q.query(`REVOKE UPDATE, DELETE, TRUNCATE ON "${t}" FROM PUBLIC`);
    }
    await q.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
          EXECUTE format('GRANT CONNECT ON DATABASE %I TO ${APP_ROLE}', current_database());
          GRANT USAGE ON SCHEMA public TO ${APP_ROLE};
          GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_ROLE};
          GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_ROLE};
          REVOKE UPDATE, DELETE, TRUNCATE ON ${APPEND_ONLY.map((t) => `"${t}"`).join(', ')} FROM ${APP_ROLE};
          REVOKE ALL ON "typeorm_migrations" FROM ${APP_ROLE};
          GRANT SELECT ON "typeorm_migrations" TO ${APP_ROLE};
          ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_ROLE};
          ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${APP_ROLE};
        END IF;
      END $$`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of APPEND_ONLY) {
      await q.query(`DROP TRIGGER "trg_${t}_no_truncate" ON "${t}"`);
      await q.query(`DROP TRIGGER "trg_${t}_no_update_delete" ON "${t}"`);
    }
    await q.query(`DROP FUNCTION "forbid_append_only_mutation"()`);
    // صلاحيات الدور بتفضل زي ما هي (الرجوع للهيكل بس) — سحبها يدوي لو مطلوب
  }
}
