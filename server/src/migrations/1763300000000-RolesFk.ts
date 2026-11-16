import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 0002 — ربط users.role بجدول roles (A2).
 * بيدخّل مفاتيح الأدوار الموجودة وقت كتابة الـ migration (قائمة ثابتة — ممنوع تقرا من roles.ts عشان الـ migration
 * تفضل ثابتة لو roles.ts اتغيّر). الصلاحيات نفسها بتتزامن من roles.ts عند كل إقلاع (RolesService).
 */
const ROLE_KEYS_AT_0002 = ['admin', 'hr', 'viewer', 'payroll', 'clientsSales', 'clientsAccounts', 'clientsProjects', 'warehouse', 'ledgerAccountant', 'custom'];

export class RolesFk1763300000000 implements MigrationInterface {
  name = 'RolesFk1763300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const key of ROLE_KEYS_AT_0002) {
      await queryRunner.query(`INSERT INTO "roles" ("key", "label", "is_system") VALUES ($1, $1, true) ON CONFLICT ("key") DO NOTHING`, [key]);
    }
    // أي مستخدم بدور مش معروف (مش متوقع) → viewer قبل إضافة الـ FK
    await queryRunner.query(`UPDATE "users" SET "role" = 'viewer' WHERE "role" NOT IN (SELECT "key" FROM "roles")`);
    await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "fk_users_role" FOREIGN KEY ("role") REFERENCES "roles"("key") ON DELETE NO ACTION ON UPDATE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "fk_users_role"`);
  }
}
