import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * قرارات الإدارة B-04/B-07 (2026-11-17):
 * - فصل المهام ممنوع افتراضيًا (false)، والاستثناء لازم يكون بمرجع اعتماد إداري مسجّل في المسار.
 * - تعديل الحقول الجوهرية أثناء الاعتماد بيلغي الاعتمادات السابقة (أمر material_change في سجل الحالات).
 */
export class ApprovalPolicy1763900000000 implements MigrationInterface {
  name = 'ApprovalPolicy1763900000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "approval_workflows" ALTER COLUMN "allow_self_approval" SET DEFAULT false, ALTER COLUMN "allow_same_approver_across_levels" SET DEFAULT false`);
    await q.query(`ALTER TABLE "approval_workflows" ADD COLUMN "sod_exception_ref" text`);
    await q.query(`ALTER TABLE "approval_workflows" ADD CONSTRAINT "CHK_approval_workflows_sod_exception"
      CHECK (NOT ("allow_self_approval" OR "allow_same_approver_across_levels") OR length(btrim(coalesce("sod_exception_ref", ''))) > 0)`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "approval_workflows" DROP CONSTRAINT "CHK_approval_workflows_sod_exception"`);
    await q.query(`ALTER TABLE "approval_workflows" DROP COLUMN "sod_exception_ref"`);
    await q.query(`ALTER TABLE "approval_workflows" ALTER COLUMN "allow_self_approval" DROP DEFAULT, ALTER COLUMN "allow_same_approver_across_levels" DROP DEFAULT`);
  }
}
