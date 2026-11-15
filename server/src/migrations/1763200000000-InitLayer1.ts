import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 0001 — الطبقة 1 (UNIFIED-WEB-PLAN §2.2): users, sessions, roles, user_permissions,
 * records, docs, changes, audit_log, attachments, schema_meta.
 * الجسم مولَّد من الـ entities (typeorm migration:generate) + إضافات يدوية في الآخر
 * (فهارس دالية/جزئية مش بيعرف يولّدها، و seed لـ schema_meta).
 * اختبار test/schema.e2e-spec.ts بيتأكد إن الـ entities مطابقة للـ migrations (مفيش drift).
 */

export class InitLayer11763200000000 implements MigrationInterface {
    name = 'InitLayer11763200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "attachments" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "owner_collection" text,
                "owner_id" text,
                "storage_key" text NOT NULL,
                "filename" text NOT NULL,
                "mime" text NOT NULL,
                "size_bytes" bigint NOT NULL,
                "sha256" text,
                "legacy_path" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "created_by" uuid,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "UQ_ec3648b85f6af7eafe865a3257b" UNIQUE ("storage_key"),
                CONSTRAINT "ck_attachments_size" CHECK ("size_bytes" >= 0),
                CONSTRAINT "PK_5e1f050bcff31e3084a1d662412" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "ix_attachments_owner" ON "attachments" ("owner_collection", "owner_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "audit_log" (
                "id" BIGSERIAL NOT NULL,
                "at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "user_id" uuid,
                "username" text,
                "action" text NOT NULL,
                "entity" text,
                "entity_id" text,
                "details" jsonb,
                "ip" inet,
                "user_agent" text,
                CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "ix_audit_log_entity" ON "audit_log" ("entity", "entity_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "ix_audit_log_user" ON "audit_log" ("user_id", "at")
        `);
        await queryRunner.query(`
            CREATE INDEX "ix_audit_log_at" ON "audit_log" ("at")
        `);
        await queryRunner.query(`
            CREATE TABLE "changes" (
                "seq" BIGSERIAL NOT NULL,
                "collection" text NOT NULL,
                "record_id" text NOT NULL,
                "op" text NOT NULL,
                "rev" integer NOT NULL,
                "user_id" uuid,
                "at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "diff" jsonb,
                CONSTRAINT "ck_changes_op" CHECK ("op" IN ('insert', 'update', 'delete')),
                CONSTRAINT "PK_6ebae225b8451fb270bfdaacd56" PRIMARY KEY ("seq")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "ix_changes_record" ON "changes" ("collection", "record_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "docs" (
                "key" text NOT NULL,
                "data" jsonb NOT NULL,
                "rev" integer NOT NULL DEFAULT '1',
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_by" uuid,
                CONSTRAINT "ck_docs_rev_positive" CHECK ("rev" > 0),
                CONSTRAINT "PK_e60c91159c7b78fb41f5b499904" PRIMARY KEY ("key")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "records" (
                "collection" text NOT NULL,
                "id" text NOT NULL,
                "data" jsonb NOT NULL,
                "rev" integer NOT NULL DEFAULT '1',
                "project_id" text,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "created_by" uuid,
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_by" uuid,
                CONSTRAINT "ck_records_rev_positive" CHECK ("rev" > 0),
                CONSTRAINT "PK_4b69b89752c60ab90299859501c" PRIMARY KEY ("collection", "id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "ix_records_collection_project" ON "records" ("collection", "project_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "roles" (
                "key" text NOT NULL,
                "label" text NOT NULL,
                "permissions" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "is_system" boolean NOT NULL DEFAULT false,
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_a87cf0659c3ac379b339acf36a2" PRIMARY KEY ("key")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "schema_meta" (
                "key" text NOT NULL,
                "value" jsonb NOT NULL,
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_844e699f1b8c86a40d805e4d032" PRIMARY KEY ("key")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "legacy_id" text,
                "username" text NOT NULL,
                "name" text NOT NULL DEFAULT '',
                "role" text NOT NULL DEFAULT 'viewer',
                "active" boolean NOT NULL DEFAULT true,
                "password_algo" text NOT NULL,
                "password_hash" text NOT NULL,
                "password_salt" text,
                "must_change_password" boolean NOT NULL DEFAULT false,
                "password_changed_at" TIMESTAMP WITH TIME ZONE,
                "can_edit_data" boolean NOT NULL DEFAULT false,
                "can_delete_data" boolean NOT NULL DEFAULT false,
                "can_manage_users" boolean NOT NULL DEFAULT false,
                "project_scope" text array,
                "failed_attempts" integer NOT NULL DEFAULT '0',
                "locked_until" TIMESTAMP WITH TIME ZONE,
                "last_login_at" TIMESTAMP WITH TIME ZONE,
                "token_version" integer NOT NULL DEFAULT '0',
                "totp_secret" text,
                "totp_enabled" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_60fbe7e9fbad9f9d76088fc5475" UNIQUE ("legacy_id"),
                CONSTRAINT "ck_users_username_not_blank" CHECK (length(btrim("username")) > 0),
                CONSTRAINT "ck_users_scrypt_salt" CHECK (
                    "password_algo" <> 'scrypt'
                    OR "password_salt" IS NOT NULL
                ),
                CONSTRAINT "ck_users_password_algo" CHECK ("password_algo" IN ('argon2id', 'scrypt')),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "sessions" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "token_hash" text NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "revoked_at" TIMESTAMP WITH TIME ZONE,
                "replaced_by" uuid,
                "user_agent" text,
                "ip" inet,
                CONSTRAINT "UQ_abaa9e068cdd390bc5210f79884" UNIQUE ("token_hash"),
                CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "ix_sessions_user" ON "sessions" ("user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "user_permissions" (
                "user_id" uuid NOT NULL,
                "page" text NOT NULL,
                "can_view" boolean NOT NULL DEFAULT false,
                "can_add" boolean NOT NULL DEFAULT false,
                "can_edit" boolean NOT NULL DEFAULT false,
                "can_delete" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_61c5d30ade880a70678098ff294" PRIMARY KEY ("user_id", "page")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "sessions"
            ADD CONSTRAINT "fk_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "user_permissions"
            ADD CONSTRAINT "fk_user_permissions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        // ---- إضافات يدوية ----
        // اسم المستخدم فريد بدون حساسية لحالة الأحرف
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_users_username_lower" ON "users" (lower("username"))`);
        // السجلات الحية بس (القراءة الأساسية لـ bootstrap)
        await queryRunner.query(`CREATE INDEX "ix_records_collection_live" ON "records" ("collection") WHERE "deleted_at" IS NULL`);
        await queryRunner.query(`COMMENT ON TABLE "records" IS 'الطبقة 1: سجل لكل عنصر في مصفوفات DATA (docs/web/collections-map.json)'`);
        await queryRunner.query(`COMMENT ON TABLE "docs" IS 'الطبقة 1: مفاتيح DATA من نوع doc/lookup/meta-flag'`);
        await queryRunner.query(`COMMENT ON TABLE "changes" IS 'سجل تغييرات متسلسل (seq) للمزامنة والبث اللحظي'`);
        await queryRunner.query(`INSERT INTO "schema_meta" ("key", "value") VALUES ('legacy_schema_version', '9'::jsonb), ('data_layer', '"records-v1"'::jsonb)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."ix_records_collection_live"`);
        await queryRunner.query(`DROP INDEX "public"."uq_users_username_lower"`);
        await queryRunner.query(`
            ALTER TABLE "user_permissions" DROP CONSTRAINT "fk_user_permissions_user"
        `);
        await queryRunner.query(`
            ALTER TABLE "sessions" DROP CONSTRAINT "fk_sessions_user"
        `);
        await queryRunner.query(`
            DROP TABLE "user_permissions"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."ix_sessions_user"
        `);
        await queryRunner.query(`
            DROP TABLE "sessions"
        `);
        await queryRunner.query(`
            DROP TABLE "users"
        `);
        await queryRunner.query(`
            DROP TABLE "schema_meta"
        `);
        await queryRunner.query(`
            DROP TABLE "roles"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."ix_records_collection_project"
        `);
        await queryRunner.query(`
            DROP TABLE "records"
        `);
        await queryRunner.query(`
            DROP TABLE "docs"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."ix_changes_record"
        `);
        await queryRunner.query(`
            DROP TABLE "changes"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."ix_audit_log_at"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."ix_audit_log_user"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."ix_audit_log_entity"
        `);
        await queryRunner.query(`
            DROP TABLE "audit_log"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."ix_attachments_owner"
        `);
        await queryRunner.query(`
            DROP TABLE "attachments"
        `);
    }

}
