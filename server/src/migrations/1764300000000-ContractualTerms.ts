import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * قرار الاحتجاز والغرامات (2026-11-17): الأكواد عامة وموحّدة، والنسب والقيم الفعلية **على مستوى العقد**.
 * - طريقة جديدة CONTRACT للأكواد التعاقدية: الكود بيحدد السلوك (الأساس، والمتحمّل، والفصل المحاسبي) من غير نسبة.
 * - template_rate: قالب افتراضي **اختياري** (بيتعتمد بنفس دورة الإصدار) — اقتراح عند إنشاء بند العقد بس، ومابيتطبّقش مباشرة أبدًا.
 * - مفيش استقطاع تعاقدي من غير بند عقد معتمد (بيتفرض في الحساب: CONTRACT_TERM_REQUIRED).
 */
export class ContractualTerms1764300000000 implements MigrationInterface {
  name = 'ContractualTerms1764300000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "tax_code_versions" DROP CONSTRAINT "tax_code_versions_method_check"`);
    await q.query(`ALTER TABLE "tax_code_versions" ADD CONSTRAINT "tax_code_versions_method_check" CHECK ("method" IN ('PERCENT','FIXED','BRACKETS','CONTRACT'))`);
    await q.query(`ALTER TABLE "tax_code_versions" ADD COLUMN "template_rate" numeric(9,6)`);
    await q.query(`ALTER TABLE "tax_code_versions" ADD CONSTRAINT "CHK_tax_template_rate" CHECK ("template_rate" IS NULL OR ("method" = 'CONTRACT' AND "template_rate" >= 0 AND "template_rate" <= 100))`);
    // الطريقة CONTRACT للأكواد التعاقدية بس، والعكس (الكود التعاقدي مايبقاش له نسبة ثابتة في الإصدار)
    await q.query(`CREATE FUNCTION tax_version_method_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE cat text;
      BEGIN
        SELECT category INTO cat FROM tax_codes WHERE code = NEW.code;
        IF (cat = 'CONTRACTUAL') <> (NEW.method = 'CONTRACT') THEN
          RAISE EXCEPTION 'contractual codes use method CONTRACT (rate comes from the approved contract term), taxes never do' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
      END $$`);
    await q.query(`CREATE TRIGGER tax_version_method_guard BEFORE INSERT ON "tax_code_versions" FOR EACH ROW EXECUTE FUNCTION tax_version_method_guard()`);
  }
  async down(q: QueryRunner): Promise<void> {
    const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM tax_code_versions WHERE method = 'CONTRACT'`);
    if (n > 0) throw new Error('CONTRACT versions exist — cannot revert');
    await q.query(`DROP TRIGGER tax_version_method_guard ON "tax_code_versions"`);
    await q.query(`DROP FUNCTION tax_version_method_guard()`);
    await q.query(`ALTER TABLE "tax_code_versions" DROP CONSTRAINT "CHK_tax_template_rate"`);
    await q.query(`ALTER TABLE "tax_code_versions" DROP COLUMN "template_rate"`);
    await q.query(`ALTER TABLE "tax_code_versions" DROP CONSTRAINT "tax_code_versions_method_check"`);
    await q.query(`ALTER TABLE "tax_code_versions" ADD CONSTRAINT "tax_code_versions_method_check" CHECK ("method" IN ('PERCENT','FIXED','BRACKETS'))`);
  }
}
