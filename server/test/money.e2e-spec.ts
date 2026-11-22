import { Client } from 'pg';
import { createTempDb } from './db';
import { Money, moneyColumnTransformer } from '../src/common/money';

/** ADR-023 + DEC-0112: Money لازم يطابق PostgreSQL (NUMERIC + round(x,6) و CAST لـ numeric(20,6)) — اللي هو التخزين الفعلي. */
describe('Money ↔ PostgreSQL NUMERIC parity', () => {
  let db: { url: string; drop: () => Promise<void> };
  let c: Client;
  beforeAll(async () => { db = await createTempDb(); c = new Client({ connectionString: db.url }); await c.connect(); });
  afterAll(async () => { await c?.end(); await db?.drop(); });

  it('pg returns NUMERIC as text (never a JS float)', async () => {
    const r = await c.query(`SELECT 0.1::numeric + 0.2::numeric AS s, 550628.695::numeric(20,6) AS v`);
    expect(typeof r.rows[0].s).toBe('string');
    expect(r.rows[0].s).toBe('0.3');
    expect(r.rows[0].v).toBe('550628.695000');
  });

  it('round(x,6) and ::numeric(20,6) == Money.round() on 30,000 values incl. halves, negatives and 15+ digit amounts', async () => {
    let seed = 42;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const vals: string[] = ['2.0000005', '-2.0000005', '0.0000005', '-0.0000005', '1.2344445', '550628.695', '9999999999999.9999995', '-9999999999999.9999995'];
    for (let i = 0; i < 30000; i++) {
      const sign = rnd() < 0.5 ? '-' : '';
      const int = String(Math.floor(rnd() * 10 ** Math.floor(rnd() * 14))); // حتى 14 رقم صحيح (حد NUMERIC(20,6))
      const half = rnd() < 0.3; // ثلث الحالات نص بالظبط عند الخانة السابعة
      const frac = half ? String(Math.floor(rnd() * 1e6)).padStart(6, '0') + '5' : String(Math.floor(rnd() * 1e9)).padStart(9, '0');
      vals.push(`${sign}${int}.${frac}`);
    }
    const bad: string[] = [];
    for (let i = 0; i < vals.length; i += 5000) {
      const chunk = vals.slice(i, i + 5000);
      const r = await c.query(`SELECT v, round(v::numeric, 6)::text AS r, (v::numeric)::numeric(20,6)::text AS c FROM unnest($1::text[]) AS v`, [chunk]);
      for (const row of r.rows) {
        const mine = Money.of(row.v).round().toFixed();
        if (mine !== row.r || mine !== row.c) bad.push(`${row.v}: money=${mine} round=${row.r} cast=${row.c}`);
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('round-trip through a NUMERIC(20,6) column with the TypeORM transformer keeps the exact value', async () => {
    await c.query(`CREATE TEMP TABLE t (a numeric(20,6))`);
    const inputs = ['2.0000005', '-2.0000005', '1250.5', '0', '12345678901234.678901'];
    for (const v of inputs) await c.query(`INSERT INTO t VALUES ($1)`, [moneyColumnTransformer.to(Money.of(v))]);
    const r = await c.query(`SELECT a FROM t`);
    expect(r.rows.map((x) => moneyColumnTransformer.from(x.a)!.toFixed())).toEqual(['2.000001', '-2.000001', '1250.500000', '0.000000', '12345678901234.678901']);
  });
});
