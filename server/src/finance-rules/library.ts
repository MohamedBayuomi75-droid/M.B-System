import { FormulaError, parse, references, runSteps, Step } from './expr';

/** تعريف معادلة (مكتبة B-20 أو إصدار في قاعدة البيانات) */
export interface FormulaDef {
  code: string; name: string; module: string; specRef?: string; description?: string;
  variables: Record<string, 'money' | 'qty' | 'rate' | 'list'>;
  lists: Record<string, string[]>;
  steps: Step[];
  testCases: { name: string; inputs: Record<string, unknown>; expected?: Record<string, unknown>; expectError?: string }[];
  openDecisions?: string[];
}
export interface CaseResult { name: string; inputs: Record<string, unknown>; expected: unknown; actual: unknown; status: 'PASS' | 'FAIL'; reason: string | null }

/** تحقق ثابت: كل خطوة بتتحلل، وكل متغير مستخدم معرّف (مدخل أو خطوة سابقة أو حقل قايمة معرّف) */
export function validateFormula(f: FormulaDef): string[] {
  const errors: string[] = [];
  const known = new Set(Object.keys(f.variables));
  for (const [list, fields] of Object.entries(f.lists ?? {})) if (f.variables[list] !== 'list') errors.push(`القائمة «${list}» مش معرّفة كـ list`); else void fields;
  if (!f.steps?.length) errors.push('مفيش خطوات');
  const seen = new Set<string>();
  for (const s of f.steps ?? []) {
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,60}$/.test(s.name)) { errors.push(`اسم خطوة غير صالح «${s.name}»`); continue; }
    if (known.has(s.name) || seen.has(s.name)) errors.push(`اسم مكرر «${s.name}»`);
    try {
      const r = references(parse(s.expr));
      for (const v of r.vars) if (!known.has(v) && !seen.has(v)) errors.push(`${s.name}: المتغير «${v}» مش معرّف`);
      for (const [list, fields] of r.lists) for (const fl of fields)
        if (!(f.lists?.[list] ?? []).includes(fl) && !known.has(fl) && !seen.has(fl)) errors.push(`${s.name}: الحقل «${fl}» مش معرّف في «${list}»`);
    } catch (e) { errors.push(`${s.name}: ${(e as Error).message}`); }
    seen.add(s.name);
  }
  return errors;
}

/** تشغيل حالات الاختبار: النتيجة المتوقعة (للمفاتيح المذكورة) أو كود الرفض المتوقع */
export function runTestCases(f: FormulaDef): CaseResult[] {
  return (f.testCases ?? []).map((tc) => {
    try {
      const out = runSteps(f.steps, tc.inputs);
      if (tc.expectError) return { name: tc.name, inputs: tc.inputs, expected: { error: tc.expectError }, actual: out, status: 'FAIL', reason: 'متوقع رفض والحساب نجح' };
      const exp = tc.expected ?? {};
      const diff = Object.keys(exp).filter((k) => out[k] !== exp[k]);
      const actual = Object.fromEntries(Object.keys(exp).map((k) => [k, out[k]]));
      return { name: tc.name, inputs: tc.inputs, expected: exp, actual, status: diff.length ? 'FAIL' : 'PASS', reason: diff.length ? `مختلف في: ${diff.join('، ')}` : null };
    } catch (e) {
      const got = e instanceof FormulaError ? (e.code === 'RULE_VIOLATION' ? e.message : e.code) : (e as Error).message;
      const ok = !!tc.expectError && got === tc.expectError;
      return { name: tc.name, inputs: tc.inputs, expected: tc.expectError ? { error: tc.expectError } : tc.expected, actual: { error: got }, status: ok ? 'PASS' : 'FAIL', reason: ok ? null : `خطأ: ${got}` };
    }
  });
}
