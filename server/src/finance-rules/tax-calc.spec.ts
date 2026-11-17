import { computeTaxes, TaxCalcError, TaxVersion } from './tax-calc';

/** بيانات اختبار بس — الأرقام هنا مش نسب معتمدة */
const v = (o: Partial<TaxVersion>): TaxVersion => ({ id: o.code + '-' + (o.version ?? 1), code: 'T', category: 'VAT', version: 1, method: 'PERCENT', rate: '10', fixedAmount: null, brackets: null,
  base: 'NET_OF_DISCOUNT', baseRatio: '100', minBase: null, appliesTo: ['test-invoice'], conditions: {}, exemptions: [], allowStacking: false, effectiveFrom: '2026-01-01', effectiveTo: null, ...o });
const err = (f: () => unknown) => { try { f(); } catch (e) { return (e as TaxCalcError).code; } return 'NO_ERROR'; };
const inp = (o: Record<string, unknown> = {}) => ({ documentType: 'test-invoice', date: '2026-06-01', codes: ['T'], bases: { NET_OF_DISCOUNT: '1000.00005' }, ...o }) as never;

describe('tax calculator (B-21)', () => {
  it('percent with HALF_UP 4dp on the configured base', () => {
    expect(computeTaxes(inp(), [v({ rate: '12.5' })])[0]).toMatchObject({ baseAmount: '1000.0001', taxableAmount: '1000.0001', amount: '125.0000' });
    expect(computeTaxes(inp({ bases: { NET_OF_DISCOUNT: '0.0004' } }), [v({ rate: '10' })])[0].amount).toBe('0.0000'); // 0.00004 → 0.0000
    expect(computeTaxes(inp({ bases: { NET_OF_DISCOUNT: '0.0005' } }), [v({ rate: '10' })])[0].amount).toBe('0.0001'); // 0.00005 → 0.0001 (HALF_UP)
  });
  it('base ratio (part of the base is taxable) — e.g. a transitional treatment', () => {
    expect(computeTaxes(inp({ bases: { NET_OF_DISCOUNT: '1000' } }), [v({ rate: '10', baseRatio: '40' })])[0]).toMatchObject({ taxableAmount: '400.0000', amount: '40.0000' });
  });
  it('only approved, in-range, matching versions; none → NO_APPROVED_RATE; two → AMBIGUOUS_RATE', () => {
    expect(err(() => computeTaxes(inp(), []))).toBe('NO_APPROVED_RATE');
    expect(err(() => computeTaxes(inp({ date: '2025-12-31' }), [v({})]))).toBe('NO_APPROVED_RATE');
    expect(err(() => computeTaxes(inp({ documentType: 'other' }), [v({})]))).toBe('NO_APPROVED_RATE');
    expect(err(() => computeTaxes(inp(), [v({}), v({ version: 2 })]))).toBe('AMBIGUOUS_RATE');
    const old = v({ version: 1, rate: '5', effectiveTo: '2026-03-31' }), now = v({ version: 2, rate: '7', effectiveFrom: '2026-04-01' });
    expect(computeTaxes(inp({ date: '2026-03-31' }), [old, now])[0]).toMatchObject({ version: 1, amount: '50.0000' });
    expect(computeTaxes(inp({ date: '2026-04-01' }), [old, now])[0]).toMatchObject({ version: 2, amount: '70.0000' });
  });
  it('transitional dating by contract date (old vs new contracts)', () => {
    const oldC = v({ version: 1, rate: '10', baseRatio: '30', conditions: { contractDateTo: '2026-03-15' } });
    const newC = v({ version: 2, rate: '10', conditions: { contractDateFrom: '2026-03-16' } });
    const at = (contractDate?: string) => () => computeTaxes(inp({ bases: { NET_OF_DISCOUNT: '1000' }, context: contractDate ? { contractDate } : {} }), [oldC, newC])[0];
    expect(at('2026-03-15')()).toMatchObject({ version: 1, amount: '30.0000' });
    expect(at('2026-03-16')()).toMatchObject({ version: 2, amount: '100.0000' });
    expect(err(at())).toBe('NO_APPROVED_RATE');
  });
  it('exemptions and minimum base give zero with the reason', () => {
    const e = v({ exemptions: [{ reason: 'دور عبادة (اختبار)', activities: ['worship'] }] });
    expect(computeTaxes(inp({ context: { activity: 'worship' } }), [e])[0]).toMatchObject({ amount: '0.0000', exemptReason: 'دور عبادة (اختبار)' });
    expect(computeTaxes(inp({ context: { activity: 'other' } }), [e])[0].exemptReason).toBeNull();
    expect(computeTaxes(inp({ bases: { NET_OF_DISCOUNT: '300' } }), [v({ minBase: '300' })])[0]).toMatchObject({ amount: '0.0000', exemptReason: 'BELOW_MIN_BASE' });
    expect(computeTaxes(inp({ bases: { NET_OF_DISCOUNT: '300.0001' } }), [v({ minBase: '300' })])[0].amount).toBe('30.0000');
  });
  it('fixed amount and progressive brackets', () => {
    expect(computeTaxes(inp(), [v({ method: 'FIXED', rate: null, fixedAmount: '15.5' })])[0].amount).toBe('15.5000');
    const b = v({ method: 'BRACKETS', rate: null, base: 'TAXABLE_WAGE', brackets: [{ upTo: '1000', rate: '0' }, { upTo: '3000', rate: '10' }, { upTo: null, rate: '20' }] });
    const tax = (w: string) => computeTaxes(inp({ bases: { TAXABLE_WAGE: w } }), [b])[0].amount;
    expect([tax('500'), tax('1000'), tax('2000'), tax('3000'), tax('5000')]).toEqual(['0.0000', '0.0000', '100.0000', '200.0000', '600.0000']);
  });
  it('no double application of the same kind on the same base unless both allow stacking', () => {
    const a = v({ code: 'A' }), b = v({ code: 'B' });
    expect(err(() => computeTaxes(inp({ codes: ['A', 'B'] }), [a, b]))).toBe('DOUBLE_APPLICATION');
    expect(err(() => computeTaxes(inp({ codes: ['A', 'A'] }), [a]))).toBe('DOUBLE_APPLICATION');
    expect(computeTaxes(inp({ codes: ['A', 'B'] }), [{ ...a, allowStacking: true }, { ...b, allowStacking: true }])).toHaveLength(2);
    const w = v({ code: 'W', category: 'WHT' });
    expect(computeTaxes(inp({ codes: ['A', 'W'] }), [a, w]).map((l) => l.code)).toEqual(['A', 'W']);
    expect(err(() => computeTaxes(inp({ codes: ['A'], bases: {} }), [a]))).toBe('MISSING_BASE');
  });
});
