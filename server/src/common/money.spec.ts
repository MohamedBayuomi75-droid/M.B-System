import { Money, MoneyError, moneyColumnTransformer } from './money';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const target = require('../../../tools/formulas/target');

const m = (s: string) => Money.of(s);

describe('Money (ADR-023: 4 decimals, HALF_UP both signs, no JS Number source)', () => {
  it('HALF_UP at 4 decimals — positive and negative (B-70)', () => {
    const cases: Array<[string, string]> = [
      ['2.00005', '2.0001'], ['-2.00005', '-2.0001'], ['2.00004999', '2.0000'], ['-2.00004999', '-2.0000'],
      ['1.23445', '1.2345'], ['0.00005', '0.0001'], ['-0.00005', '-0.0001'], ['0.000049', '0.0000'],
      ['550628.695', '550628.6950'], ['99999999999999.99995', '100000000000000.0000'], ['0', '0.0000'], ['-0', '0.0000'],
    ];
    for (const [i, o] of cases) expect([i, m(i).round().toFixed()]).toEqual([i, o]);
  });

  it('no binary float error: 0.1 + 0.2 = 0.3 exactly; large values keep every digit', () => {
    expect(m('0.1').plus('0.2').toString()).toBe('0.3');
    expect(m('550628.695').times('100').toString()).toBe('55062869.5'); // JS: 55062869.49999999
    expect(m('123456789012345.6789').plus('0.0001').toFixed()).toBe('123456789012345.6790');
  });

  it('rejects JS numbers and malformed strings as input (the API carries decimals as strings)', () => {
    expect(() => Money.of(1.5 as unknown as string)).toThrow(MoneyError);
    for (const bad of ['', ' ', '1,250.50', '1e5', 'abc', '١٢٣', '--1', '1.2.3', 'NaN', 'Infinity']) expect(() => m(bad)).toThrow(MoneyError);
    expect(m(' 12.5 ').toFixed()).toBe('12.5000');
    expect(m('.5').toFixed()).toBe('0.5000');
    expect(Money.of(10n).toFixed()).toBe('10.0000');
  });

  it('legacy JSON numbers convert via their shortest representation', () => {
    expect(Money.fromNumberUnsafe(0.1).toString()).toBe('0.1');
    expect(Money.fromNumberUnsafe(2026.9998).toFixed()).toBe('2026.9998');
    expect(() => Money.fromNumberUnsafe(NaN)).toThrow(MoneyError);
  });

  it('arithmetic: percent, division, sum, max0, comparisons', () => {
    expect(m('104000').percent('5').toFixed()).toBe('5200.0000');
    expect(m('6000').times('15').div('31').round().toFixed()).toBe('2903.2258');
    expect(() => m('1').div('0')).toThrow(MoneyError);
    expect(Money.sum(['1130', '-113', '0.3']).toFixed()).toBe('1017.3000');
    expect(m('-5').max0().toFixed()).toBe('0.0000');
    expect([m('1.0').eq('1'), m('2').cmp('3'), m('-0.0001').isNegative(), m('0').isNegative()]).toEqual([true, -1, true, false]);
    expect(JSON.stringify({ a: m('1.5') })).toBe('{"a":"1.5000"}');
  });

  it('TypeORM transformer: NUMERIC text ↔ Money, writes 4 decimals HALF_UP', () => {
    expect(moneyColumnTransformer.to(m('2.00005'))).toBe('2.0001');
    expect(moneyColumnTransformer.to(null)).toBeNull();
    expect(moneyColumnTransformer.from('1250.5000')!.toString()).toBe('1250.5');
    expect(moneyColumnTransformer.from(null)).toBeNull();
  });

  it('matches the approved-rules reference implementation (tools/formulas/target.js q4) on 20,000 random values', () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const mismatches: string[] = [];
    for (let i = 0; i < 20000; i++) {
      const sign = rnd() < 0.5 ? '-' : '';
      const int = String(Math.floor(rnd() * 10 ** Math.floor(rnd() * 12)));
      const frac = String(Math.floor(rnd() * 1e8)).padStart(8, '0').slice(0, 1 + Math.floor(rnd() * 8));
      const s = `${sign}${int}.${frac}`;
      const a = m(s).round().toFixed();
      const b = target.q4(s).toString();
      if (Money.of(a).cmp(b === '-0' ? '0' : b) !== 0) mismatches.push(`${s}: ${a} vs ${b}`);
    }
    expect(mismatches.slice(0, 5)).toEqual([]);
  });
});
