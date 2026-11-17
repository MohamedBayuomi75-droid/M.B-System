import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FormulaDef, runTestCases, validateFormula } from './library';

/**
 * B-20 — كل معادلات المكتبة الأولية (finance-formulas/B20_LIBRARY.json): تحقق ثابت + كل حالات الاختبار.
 * FORMULA_REPORT=1 بيكتب تقرير docs/FORMULA_TEST_REPORT.md (المدخل، والمتوقع، والفعلي، والحالة، وسبب الفشل) — البند 15.
 */
const lib: { formulas: FormulaDef[] } = JSON.parse(readFileSync(join(__dirname, '../../finance-formulas/B20_LIBRARY.json'), 'utf8'));

describe('B-20 formula library — every formula validated and every test case run', () => {
  it('codes are unique and every formula has test cases', () => {
    const codes = lib.formulas.map((f) => f.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const f of lib.formulas) expect([f.code, f.testCases.length > 0]).toEqual([f.code, true]);
  });
  it.each(lib.formulas.map((f) => [f.code, f] as const))('%s', (_code, f) => {
    expect(validateFormula(f)).toEqual([]);
    const results = runTestCases(f);
    expect(results.filter((r) => r.status === 'FAIL').map((r) => `${r.name}: ${r.reason} → ${JSON.stringify(r.actual)}`)).toEqual([]);
  });

  afterAll(() => {
    if (process.env.FORMULA_REPORT !== '1') return;
    const lines: string[] = ['# تقرير اختبارات مكتبة المعادلات — B-20', '', `> مولَّد آليًا من \`server/finance-formulas/B20_LIBRARY.json\` بمحرك التعبيرات (\`expr.ts\`). المعادلات **مقترحة — مش معتمدة**. القيم في الحالات أمثلة اختبار مش نسب معتمدة.`, ''];
    let pass = 0, total = 0;
    for (const f of lib.formulas) {
      const rs = runTestCases(f);
      lines.push(`## ${f.code} — ${f.name} (المواصفات ${f.specRef ?? ''})`, '', '| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |', '|---|---|---|---|---|---|');
      for (const r of rs) {
        total++; if (r.status === 'PASS') pass++;
        const j = (v: unknown) => '`' + JSON.stringify(v).replace(/\|/g, '\\|') + '`';
        lines.push(`| ${r.name} | ${j(r.inputs)} | ${j(r.expected)} | ${j(r.actual)} | ${r.status === 'PASS' ? '✅' : '❌'} | ${r.reason ?? '—'} |`);
      }
      if (f.openDecisions?.length) lines.push('', `**قرارات مفتوحة:** ${f.openDecisions.join(' · ')}`);
      lines.push('');
    }
    lines.splice(4, 0, `**النتيجة:** ${pass}/${total} حالة ناجحة في ${lib.formulas.length} معادلة.`, '');
    writeFileSync(join(__dirname, '../../../docs/FORMULA_TEST_REPORT.md'), lines.join('\n') + '\n');
  });
});
