import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 0006 — التحقق بخطوتين (المرحلة 2 — S-8):
 *  totp_pending: سر مؤقت أثناء التسجيل (قبل تأكيد أول كود) · totp_recovery: HMAC لأكواد الاسترداد (استخدام مرة واحدة)
 *  totp_last_step: آخر خطوة زمنية اتقبلت (منع إعادة استخدام نفس الكود). totp_secret/totp_enabled موجودين من 0001.
 */
export class TwoFactor1763700000000 implements MigrationInterface {
  name = 'TwoFactor1763700000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "users" ADD "totp_pending" text`);
    await q.query(`ALTER TABLE "users" ADD "totp_recovery" text array`);
    await q.query(`ALTER TABLE "users" ADD "totp_last_step" bigint`);
    await q.query(`ALTER TABLE "users" ADD CONSTRAINT "ck_users_totp_enabled_secret" CHECK (NOT "totp_enabled" OR "totp_secret" IS NOT NULL)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "users" DROP CONSTRAINT "ck_users_totp_enabled_secret"`);
    await q.query(`ALTER TABLE "users" DROP COLUMN "totp_last_step"`);
    await q.query(`ALTER TABLE "users" DROP COLUMN "totp_recovery"`);
    await q.query(`ALTER TABLE "users" DROP COLUMN "totp_pending"`);
  }
}
