import { Client } from 'pg';
import { createTempDb } from './db';
import { Money, moneyColumnTransformer } from '../src/common/money';

/** ADR-023: Money لازم يطابق PostgreSQL (NUMERIC + round(x,4) و CAST لـ numeric(p,4)) — اللي هو التخزين الفعلي. */
describe('Money ↔ PostgreSQL NUMERIC parity', () => {
  let db: { url: string; drop: () => Promise<void> };
  let c: Client;
  beforeAll(async () => { db = await createTempDb(); c = new Client({ connectionString: db.url }); await c.connect(); });
  afterAll(async () => { await c?.end(); await db?.drop(); });

  it('pg returns NUMERIC as text (never a JS float)', async () => {
    const r = await c.query(`SELECT 0.1::numeric + 0.2::numeric AS s, 550628.695::numeric(18,4) AS v`);
    expect(typeof r.rows[0].s).toBe('string');
    expect(r.rows[0].s).toBe('0.3');
    expect(r.rows[0].v).toBe('550628.6950');
  });

  it('round(x,4) and ::numeric(20,4) == Money.round() on 30,000 values incl. halves, negatives and 15+ digit amounts', async () => {
    let seed = 42;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const vals: string[] = ['2.00005', '-2.00005', '0.00005', '-0.00005', '1.23445', '550628.695', '99999999999999.99995', '-99999999999999.99995'];
    for (let i = 0; i < 30000; i++) {
      const sign = rnd() < 0.5 ? '-' : '';
      const int = String(Math.floor(rnd() * 10 ** Math.floor(rnd() * 14)));
      const half = rnd() < 0.3; // ثلث الحالات نص بالظبط عند الخانة الخامسة
      const frac = half ? String(Math.floor(rnd() * 1e4)).padStart(4, '0') + '5' : String(Math.floor(rnd() * 1e9)).padStart(9, '0');
      vals.push(`${sign}${int}.${frac}`);
    }
    const bad: string[] = [];
    for (let i = 0; i < vals.length; i += 5000) {
      const chunk = vals.slice(i, i + 5000);
      const r = await c.query(`SELECT v, round(v::numeric, 4)::text AS r, (v::numeric)::numeric(20,4)::text AS c FROM unnest($1::text[]) AS v`, [chunk]);
      for (const row of r.rows) {
        const mine = Money.of(row.v).round().toFixed();
        if (mine !== row.r || mine !== row.c) bad.push(`${row.v}: money=${mine} round=${row.r} cast=${row.c}`);
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('round-trip through a NUMERIC(20,4) column with the TypeORM transformer keeps the exact value', async () => {
    await c.query(`CREATE TEMP TABLE t (a numeric(20,4))`);
    const inputs = ['2.00005', '-2.00005', '1250.5', '0', '123456789012345.6789'];
    for (const v of inputs) await c.query(`INSERT INTO t VALUES ($1)`, [moneyColumnTransformer.to(Money.of(v))]);
    const r = await c.query(`SELECT a FROM t`);
    expect(r.rows.map((x) => moneyColumnTransformer.from(x.a)!.toFixed())).toEqual(['2.0001', '-2.0001', '1250.5000', '0.0000', '123456789012345.6789']);
  });
});
