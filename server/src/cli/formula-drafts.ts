/* eslint-disable no-console */
import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { FormulaDef, runTestCases, validateFormula } from '../finance-rules/library';
import { FormulasService } from '../finance-rules/formulas.service';
import { UsersService } from '../users/users.service';

/**
 * إدخال مكتبة المعادلات **كمسودات بس** (B-20). مابيبعتش للاعتماد ولا بيعتمد ولا بيفعّل أي معادلة.
 *   npm run formulas:drafts -- finance-formulas/B20_LIBRARY.json                                   ← فحص بس
 *   npm run formulas:drafts -- finance-formulas/B20_LIBRARY.json --execute --by <username> --from 2026-01-01
 * المعادلة اللي فيها خطأ تحقق أو حالة اختبار فاشلة بتتخطّى. الاعتماد من الشاشة ومن مستخدم غير المنشئ.
 */
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
async function main() {
  const file = process.argv.slice(2).find((a, i, all) => !a.startsWith('--') && !all[i - 1]?.startsWith('--'));
  if (!file) throw new Error('الاستخدام: formulas:drafts <file.json> [--execute --by <username> --from YYYY-MM-DD]');
  const lib: { formulas: FormulaDef[] } = JSON.parse(readFileSync(file, 'utf8'));
  const ok: FormulaDef[] = [];
  for (const f of lib.formulas) {
    const errs = validateFormula(f); const fails = runTestCases(f).filter((r) => r.status === 'FAIL');
    if (errs.length || fails.length) console.log(`– ${f.code}: تخطّي (${[...errs, ...fails.map((x) => x.name)].join(' | ')})`);
    else { ok.push(f); console.log(`✓ ${f.code}: مسودة (${f.testCases.length} حالة اختبار ناجحة)`); }
  }
  if (!process.argv.includes('--execute')) { console.log('\nفحص بس — مفيش حاجة اتكتبت. للتنفيذ: --execute --by <username> --from YYYY-MM-DD'); return; }
  const by = arg('by'); const from = arg('from');
  if (!by || !from || !/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new Error('--by و --from (تاريخ بداية السريان) مطلوبين');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const [u] = await app.get(DataSource).query(`SELECT id FROM users WHERE lower(username) = lower($1) AND active`, [by]);
    const user = u && await app.get(UsersService).loadAuthUser(u.id);
    if (!user?.permissions.manageUsers) throw new Error('المستخدم لازم يكون مدير نشط');
    const svc = app.get(FormulasService);
    const existing = new Set((await svc.list(user)).map((f: { code: string }) => f.code));
    for (const f of ok) {
      if (!existing.has(f.code)) await svc.createFormula(user, { code: f.code, name: f.name, module: f.module, description: f.description });
      const v = await svc.createVersion(user, f.code, { changeKind: 'new', effectiveFrom: from, changeReason: 'إدخال أولي من مكتبة B-20 (مقترحة — بانتظار قرار المدير المالي)',
        definition: { variables: f.variables, lists: f.lists, steps: f.steps }, testCases: f.testCases });
      console.log(`  ${f.code} v${v.version}: ${v.status} (اختبارات: ${v.tests_passed ? 'ناجحة' : 'فاشلة'})`);
    }
  } finally { await app.close(); }
}
main().catch((e) => { console.error('✗', e instanceof Error ? e.message : e); process.exit(1); });
