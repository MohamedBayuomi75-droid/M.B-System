import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 0007 — الأساس المشترك (المرحلة 5). **مفيش أي بيانات بتتزرع**: كل الجداول فاضية — ولا مسار اعتماد ولا مستوى ولا حد ولا نوع مستند.
 *  - user_action_permissions: أفعال المستندات (اعتماد/رفض/طباعة/تصدير/صرف/إلغاء/ترحيل) لكل مستخدم — المنح بقرار المدير.
 *  - projects: جدول المشروعات العلائقي (فاضي — الترحيل في المرحلة 6 بموافقة منفصلة).
 *  - attachments: الإصدارات (version_of/version) من غير حذف للقديم.
 *  - document_counters + document_numbers: ترقيم NO_GAPS (ADR-013) — الرقم مايتعادش والملغى بيحتفظ برقمه.
 *  - approval_*: محرك الاعتمادات (APPROVAL_WORKFLOW_DESIGN.md §4) — سجل الحالات والقرارات إلحاق فقط.
 *  - notifications، idempotency_keys.
 */
const APPEND_ONLY = ['approval_decisions', 'approval_state_log'];

export class Foundation1763800000000 implements MigrationInterface {
  name = 'Foundation1763800000000';

  public async up(q: QueryRunner): Promise<void> {
    // 5.1 أفعال المستندات لكل مستخدم
    await q.query(`CREATE TABLE "user_action_permissions" (
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "action" text NOT NULL CHECK ("action" IN ('approve','reject','print','export','pay','cancel','post')),
      "scope" text NOT NULL DEFAULT '*',
      "allowed" boolean NOT NULL,
      "granted_by" uuid, "granted_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("user_id", "action", "scope"))`);

    // 5.2 المشروعات (علائقي)
    await q.query(`CREATE TABLE "projects" (
      "id" text PRIMARY KEY,
      "code" text, "name" text NOT NULL CHECK (length(btrim("name")) > 0),
      "status" text, "stage" text,
      "budget" numeric(18,4) CHECK ("budget" IS NULL OR "budget" >= 0),
      "customer_id" text, "supervisor_id" text,
      "legacy_name" text, "legacy_rev" int,
      "extra" jsonb NOT NULL DEFAULT '{}',
      "row_version" int NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE UNIQUE INDEX "uq_projects_code" ON "projects" (lower("code")) WHERE "code" IS NOT NULL AND "code" <> ''`);
    await q.query(`CREATE UNIQUE INDEX "uq_projects_name" ON "projects" (btrim("name"))`);

    // 5.3/5.5 إصدارات المرفقات
    await q.query(`ALTER TABLE "attachments" ADD "version_of" uuid`); // المرجع بيتحقق في الخدمة (نفس الجدول، والكيان مالوش علاقة TypeORM)
    await q.query(`ALTER TABLE "attachments" ADD "version" int NOT NULL DEFAULT 1`);
    await q.query(`ALTER TABLE "attachments" ADD CONSTRAINT "CHK_attachments_version_min" CHECK ("version" >= 1)`);
    await q.query(`ALTER TABLE "attachments" ADD "superseded_at" timestamptz`);
    await q.query(`CREATE UNIQUE INDEX "uq_attachments_version" ON "attachments" (coalesce("version_of", "id"), "version")`);

    // 5.7 الترقيم NO_GAPS
    await q.query(`CREATE TABLE "document_counters" ("scope" text PRIMARY KEY, "last_value" bigint NOT NULL DEFAULT 0 CHECK ("last_value" >= 0), "updated_at" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE "document_numbers" (
      "scope" text NOT NULL REFERENCES "document_counters"("scope"),
      "number" bigint NOT NULL CHECK ("number" >= 1),
      "document_type" text NOT NULL, "document_id" text NOT NULL,
      "status" text NOT NULL DEFAULT 'issued' CHECK ("status" IN ('issued','cancelled')),
      "issued_by" uuid, "issued_at" timestamptz NOT NULL DEFAULT now(),
      "cancelled_by" uuid, "cancelled_at" timestamptz, "cancel_reason" text,
      PRIMARY KEY ("scope", "number"),
      UNIQUE ("document_type", "document_id"),
      CHECK (("status" = 'cancelled') = ("cancelled_at" IS NOT NULL)))`);
    // الرقم مايتمسحش ومايتغيّرش (الإلغاء بس بيغيّر الحالة)
    await q.query(`CREATE FUNCTION "document_numbers_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'document numbers are never deleted' USING ERRCODE = 'insufficient_privilege'; END IF;
        IF NEW.scope <> OLD.scope OR NEW.number <> OLD.number OR NEW.document_type <> OLD.document_type OR NEW.document_id <> OLD.document_id OR OLD.status = 'cancelled' THEN
          RAISE EXCEPTION 'document numbers are immutable (only issued → cancelled)' USING ERRCODE = 'insufficient_privilege';
        END IF;
        RETURN NEW;
      END $$`);
    await q.query(`CREATE TRIGGER "trg_document_numbers_guard" BEFORE UPDATE OR DELETE ON "document_numbers" FOR EACH ROW EXECUTE FUNCTION "document_numbers_guard"()`);

    // 5.6 الاعتمادات — التهيئة
    await q.query(`CREATE TABLE "approval_document_types" (
      "code" text PRIMARY KEY CHECK ("code" ~ '^[a-z][a-z0-9_.-]{1,60}$'),
      "name" text NOT NULL, "module" text NOT NULL, "active" boolean NOT NULL DEFAULT true,
      "created_by" uuid, "created_at" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE "approval_workflows" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "document_type" text NOT NULL REFERENCES "approval_document_types"("code"),
      "version" int NOT NULL CHECK ("version" >= 1),
      "amount_from" numeric(18,4), "amount_to" numeric(18,4),
      "allow_self_approval" boolean NOT NULL,
      "allow_same_approver_across_levels" boolean NOT NULL,
      "active" boolean NOT NULL DEFAULT true,
      "created_by" uuid, "created_at" timestamptz NOT NULL DEFAULT now(),
      UNIQUE ("document_type", "version"),
      CHECK ("amount_from" IS NULL OR "amount_to" IS NULL OR "amount_from" <= "amount_to"))`);
    await q.query(`CREATE TABLE "approval_workflow_levels" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "workflow_id" uuid NOT NULL REFERENCES "approval_workflows"("id") ON DELETE CASCADE,
      "sequence" int NOT NULL CHECK ("sequence" >= 1),
      "mode" text NOT NULL CHECK ("mode" IN ('ALL','ANY','N_OF_M')),
      "required_count" int CHECK ("required_count" IS NULL OR "required_count" >= 1),
      UNIQUE ("workflow_id", "sequence"),
      CHECK (("mode" = 'N_OF_M') = ("required_count" IS NOT NULL)))`);
    await q.query(`CREATE TABLE "approval_level_approvers" (
      "level_id" uuid NOT NULL REFERENCES "approval_workflow_levels"("id") ON DELETE CASCADE,
      "approver_type" text NOT NULL CHECK ("approver_type" IN ('ROLE','USER')),
      "approver_ref" text NOT NULL,
      PRIMARY KEY ("level_id", "approver_type", "approver_ref"))`);

    // 5.6 الاعتمادات — التشغيل
    await q.query(`CREATE TABLE "approval_requests" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "document_type" text NOT NULL REFERENCES "approval_document_types"("code"),
      "document_id" text NOT NULL, "cycle" int NOT NULL DEFAULT 1,
      "workflow_id" uuid NOT NULL REFERENCES "approval_workflows"("id"),
      "workflow_version" int NOT NULL, "allow_self_approval" boolean NOT NULL, "allow_same_approver_across_levels" boolean NOT NULL,
      "amount" numeric(18,4), "material_hash" text,
      "status" text NOT NULL CHECK ("status" IN ('Submitted','Under Review','Approved','Rejected','Returned','Cancelled','Withdrawn')),
      "current_sequence" int,
      "submitted_by" uuid NOT NULL, "submitted_at" timestamptz NOT NULL DEFAULT now(),
      "row_version" int NOT NULL DEFAULT 1,
      UNIQUE ("document_type", "document_id", "cycle"))`);
    await q.query(`CREATE UNIQUE INDEX "uq_approval_open_request" ON "approval_requests" ("document_type", "document_id") WHERE "status" IN ('Submitted','Under Review')`);
    await q.query(`CREATE TABLE "approval_request_steps" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "request_id" uuid NOT NULL REFERENCES "approval_requests"("id"),
      "sequence" int NOT NULL, "mode" text NOT NULL, "required_count" int,
      "approvers" jsonb NOT NULL,
      "status" text NOT NULL DEFAULT 'Pending' CHECK ("status" IN ('Pending','Approved','Rejected','Returned','Skipped')),
      UNIQUE ("request_id", "sequence"))`);
    await q.query(`CREATE TABLE "approval_decisions" (
      "id" bigserial PRIMARY KEY,
      "request_id" uuid NOT NULL REFERENCES "approval_requests"("id"),
      "step_id" uuid NOT NULL REFERENCES "approval_request_steps"("id"),
      "decided_by" uuid NOT NULL,
      "decision" text NOT NULL CHECK ("decision" IN ('APPROVE','REJECT','RETURN')),
      "comment" text, "decided_at" timestamptz NOT NULL DEFAULT now(),
      UNIQUE ("step_id", "decided_by"))`);
    await q.query(`CREATE TABLE "approval_state_log" (
      "id" bigserial PRIMARY KEY,
      "request_id" uuid NOT NULL REFERENCES "approval_requests"("id"),
      "from_status" text, "to_status" text NOT NULL, "command" text NOT NULL,
      "user_id" uuid NOT NULL, "reason" text, "at" timestamptz NOT NULL DEFAULT now())`);
    for (const t of APPEND_ONLY) {
      await q.query(`CREATE TRIGGER "trg_${t}_no_update_delete" BEFORE UPDATE OR DELETE ON "${t}" FOR EACH ROW EXECUTE FUNCTION "forbid_append_only_mutation"()`);
      await q.query(`CREATE TRIGGER "trg_${t}_no_truncate" BEFORE TRUNCATE ON "${t}" FOR EACH STATEMENT EXECUTE FUNCTION "forbid_append_only_mutation"()`);
    }

    // 5.9 الإشعارات
    await q.query(`CREATE TABLE "notifications" (
      "id" bigserial PRIMARY KEY,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "kind" text NOT NULL, "title" text NOT NULL, "body" text,
      "entity" text, "entity_id" text,
      "read_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX "ix_notifications_user_unread" ON "notifications" ("user_id", "created_at" DESC) WHERE "read_at" IS NULL`);

    // 5.8 Idempotency
    await q.query(`CREATE TABLE "idempotency_keys" (
      "user_id" uuid NOT NULL, "key" text NOT NULL CHECK (length("key") BETWEEN 8 AND 200),
      "method" text NOT NULL, "path" text NOT NULL, "request_hash" text NOT NULL,
      "status_code" int, "response" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("user_id", "key"))`);

    // صلاحيات دور التطبيق (لو موجود): الجداول الجديدة اتغطّت بـ ALTER DEFAULT PRIVILEGES في 0004؛ الإلحاق فقط:
    await q.query(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'unified_app') THEN
      REVOKE UPDATE, DELETE, TRUNCATE ON "approval_decisions", "approval_state_log" FROM unified_app;
      REVOKE DELETE, TRUNCATE ON "document_numbers" FROM unified_app;
    END IF; END $$`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of ['idempotency_keys', 'notifications', 'approval_state_log', 'approval_decisions', 'approval_request_steps', 'approval_requests', 'approval_level_approvers', 'approval_workflow_levels', 'approval_workflows', 'approval_document_types', 'document_numbers', 'document_counters', 'projects', 'user_action_permissions']) await q.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
    await q.query(`DROP FUNCTION IF EXISTS "document_numbers_guard"()`);
    await q.query(`DROP INDEX IF EXISTS "uq_attachments_version"`);
    await q.query(`ALTER TABLE "attachments" DROP COLUMN "superseded_at"`);
    await q.query(`ALTER TABLE "attachments" DROP COLUMN "version"`);
    await q.query(`ALTER TABLE "attachments" DROP COLUMN "version_of"`);
  }
}
