import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 0005 — المرفقات داخل PostgreSQL (ADR-007، المرحلة 2 — S-5):
 *  - content bytea: محتوى الملف (بعد الفحص) — التخزين الخارجي (storage_key) بقى اختياري.
 *  - kind: النوع الفعلي اللي اتحدد من محتوى الملف (pdf/jpg/png/docx/xlsx).
 *  - sha256 إلزامي للملفات الجديدة (فحص سلامة + كشف التكرار).
 * الجدول فاضي (مفيش مرفقات اترحّلت لسه — B-61).
 */
export class AttachmentsInDb1763600000000 implements MigrationInterface {
  name = 'AttachmentsInDb1763600000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "attachments" ALTER COLUMN "storage_key" DROP NOT NULL`);
    await q.query(`ALTER TABLE "attachments" ADD "content" bytea`);
    await q.query(`ALTER TABLE "attachments" ADD "kind" text`);
    await q.query(`ALTER TABLE "attachments" ADD CONSTRAINT "ck_attachments_kind" CHECK ("kind" IS NULL OR "kind" IN ('pdf','jpg','png','docx','xlsx'))`);
    await q.query(`ALTER TABLE "attachments" ADD CONSTRAINT "ck_attachments_stored" CHECK ("content" IS NOT NULL OR "storage_key" IS NOT NULL OR "legacy_path" IS NOT NULL)`);
    await q.query(`ALTER TABLE "attachments" ADD CONSTRAINT "ck_attachments_hash" CHECK ("content" IS NULL OR "sha256" ~ '^[0-9a-f]{64}$')`);
    // المحتوى الكبير بيتخزن خارج الصف تلقائيًا (TOAST) — من غير ضغط لأن PDF/صور/Office مضغوطة أصلًا
    await q.query(`ALTER TABLE "attachments" ALTER COLUMN "content" SET STORAGE EXTERNAL`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "attachments" DROP CONSTRAINT "ck_attachments_hash"`);
    await q.query(`ALTER TABLE "attachments" DROP CONSTRAINT "ck_attachments_stored"`);
    await q.query(`ALTER TABLE "attachments" DROP CONSTRAINT "ck_attachments_kind"`);
    await q.query(`ALTER TABLE "attachments" DROP COLUMN "kind"`);
    await q.query(`ALTER TABLE "attachments" DROP COLUMN "content"`);
    await q.query(`ALTER TABLE "attachments" ALTER COLUMN "storage_key" SET NOT NULL`);
  }
}
