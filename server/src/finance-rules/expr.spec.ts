import { evaluate, FormulaError, LIMITS, parse, references, runSteps } from './expr';

const run = (src: string, scope: Record<string, unknown> = {}) => { const v = evaluate(parse(src), scope); return v && typeof v === 'object' ? v.toString() : v; };
const err = (f: () => unknown) => { try { f(); } catch (e) { return (e as FormulaError).code; } return 'NO_ERROR'; };

describe('B-20 formula expression engine', () => {
  it('decimal arithmetic (no float), precedence, unary minus', () => {
    expect(run('0.1 + 0.2')).toBe('0.3');
    expect(run('2 + 3 * 4 - -1')).toBe('15');
    expect(run('(2 + 3) * 4 / 8')).toBe('2.5');
    expect(run('Q * P', { Q: '3.5', P: '40.12345' })).toBe('140.432075');
  });
  it('ROUND is HALF_UP for both signs (B-25)', () => {
    expect(run('ROUND(2.00005, 4)')).toBe('2.0001');
    expect(run('ROUND(-2.00005, 4)')).toBe('-2.0001');
    expect(run('ROUND(1.005, 2)')).toBe('1.01');
    expect(err(() => run('ROUND(1, 11)'))).toBe('BAD_INPUT');
  });
  it('division by zero is explicit; IF/NULL avoid it', () => {
    expect(err(() => run('A / B', { A: '1', B: '0' }))).toBe('DIV_ZERO');
    expect(run('IF(B = 0, NULL, A / B)', { A: '1', B: '0' })).toBeNull();
    expect(run('COALESCE(NULL, 5)')).toBe('5');
    expect(err(() => run('NULL + 1'))).toBe('NULL_VALUE');
  });
  it('SUM / COUNT over lines (line fields first, then document variables)', () => {
    const lines = [{ Quantity: '10', UnitPrice: '125.5' }, { Quantity: '3.5', UnitPrice: '40.12345' }];
    expect(run('SUM(lines, ROUND(Quantity * UnitPrice, 4))', { lines })).toBe('1395.4321');
    expect(run('SUM(lines, Quantity * Rate)', { lines, Rate: '2' })).toBe('27');
    expect(run('COUNT(lines)', { lines })).toBe('2');
    expect(err(() => run('SUM(lines, Missing)', { lines }))).toBe('UNKNOWN_VARIABLE');
  });
  it('comparisons, logic, MIN/MAX/ABS, REQUIRE', () => {
    expect(run('A >= B AND NOT (A = 0)', { A: '5', B: '5' })).toBe(true);
    expect(run('MAX(1, 7, 3) - MIN(4, 2) + ABS(-1.5)')).toBe('6.5');
    expect(run("REQUIRE(D <= B, 'DISCOUNT_EXCEEDS_BASE')", { D: '1', B: '2' })).toBe(true);
    try { run("REQUIRE(D <= B, 'DISCOUNT_EXCEEDS_BASE')", { D: '3', B: '2' }); } catch (e) { expect([(e as FormulaError).code, (e as Error).message]).toEqual(['RULE_VIOLATION', 'DISCOUNT_EXCEEDS_BASE']); }
  });
  it('SECURITY: no code execution, no property access, no SQL — everything outside the grammar is refused', () => {
    for (const bad of ["process.exit(1)", "require('fs')", "this.constructor", "a[0]", "x; DROP TABLE users", "`${1}`", "eval('1')", "Function('return 1')()", "1 && 1", "a.__proto__", "{}", "1 ** 2", "x = 1; y"])
      expect(['SYNTAX', 'UNKNOWN_FUNCTION']).toContain(err(() => parse(bad)));
    // أسماء زي constructor/__proto__ بتتعامل كمتغيرات عادية لازم تكون مُعرّفة صراحة — مفيش وصول للـ prototype
    expect(err(() => run('constructor + 1'))).toBe('UNKNOWN_VARIABLE');
    expect(err(() => run('__proto__ + 1'))).toBe('UNKNOWN_VARIABLE');
    expect(err(() => run('A + 1', { A: 'x' }))).toBe('BAD_INPUT');
  });
  it('limits: length, depth, node count, list size', () => {
    expect(err(() => parse('1+'.repeat(LIMITS.maxLength)))).toBe('TOO_LONG');
    expect(err(() => parse('('.repeat(60) + '1' + ')'.repeat(60)))).toBe('TOO_DEEP');
    expect(err(() => parse(Array.from({ length: 500 }, () => '1').join('+')))).toBe('TOO_COMPLEX');
    expect(err(() => run('COUNT(l)', { l: Array.from({ length: LIMITS.maxList + 1 }, () => ({})) }))).toBe('TOO_LARGE');
  });
  it('references() lists document variables and list fields (for validation)', () => {
    const r = references(parse('SUM(lines, Quantity * UnitPrice) - Discount'));
    expect([...r.vars].sort()).toEqual(['Discount', 'lines']);
    expect([...r.lists.get('lines')!].sort()).toEqual(['Quantity', 'UnitPrice']);
  });
  it('multi-step formulas: later steps see earlier results; money 6dp (DEC-0112) / qty 5dp rounding', () => {
    const out = runSteps([
      { name: 'Gross', expr: 'SUM(lines, ROUND(Quantity * UnitPrice, 4))' },
      { name: 'Net', expr: 'Gross - Discount' },
      { name: 'Avg', expr: 'Net / 3', kind: 'qty' },
      { name: 'Ok', expr: 'Net > 0', kind: 'check' },
    ], { lines: [{ Quantity: '1', UnitPrice: '10.00005' }], Discount: '0.5' });
    // ROUND(…, 4) صريح في التعبير بيفضل 4، والخطوة نفسها بتتخزّن بست خانات
    expect(out).toEqual({ Gross: '10.000100', Net: '9.500100', Avg: '3.16670', Ok: true });
    expect(err(() => runSteps([{ name: 'Discount', expr: '1' }], { Discount: '1' }))).toBe('NAME_CLASH');
  });
});
