import { adminToken, bootstrap, connectSocket, createTestApp, newUser, sync, TestApp, waitFor } from './app';

/** A3 قبول: «50 مستخدم متزامن من غير تعارض صامت» */
describe('A3 load: 50 concurrent users', () => {
  const N = 50;
  let t: TestApp;
  let admin: string;
  const users: { token: string }[] = [];
  const socks: Awaited<ReturnType<typeof connectSocket>>[] = [];
  const up = (id: string, baseRev: number, set: Record<string, unknown>) => ({ collection: 'costs', id, op: 'upsert', baseRev, set });
  let startSeq = 0;
  const timings: Record<string, number> = {};
  const time = async <T>(label: string, fn: () => Promise<T>) => { const t0 = Date.now(); const r = await fn(); timings[label] = Date.now() - t0; return r; };

  beforeAll(async () => {
    t = await createTestApp({}, { listen: true });
    admin = await adminToken(t);
    for (let i = 0; i < N; i++) users.push(await newUser(t, admin, `load${i}`, 'hr'));
    for (const u of users) socks.push(await connectSocket(t, u.token));
    expect(socks.every((s) => s.outcome === 'ready')).toBe(true);
    const r = await sync(t, admin, { changes: [up('c-merge', 0, { amount: 100 }), up('c-race', 0, { amount: 100 }), up('c-text', 0, { notes: '' })] });
    expect(r.status).toBe(200);
    startSeq = (await t.ds.query(`SELECT MIN(seq)::int AS s FROM changes WHERE collection='costs'`))[0].s - 1;
  }, 120_000);
  afterAll(async () => {
    socks.forEach((s) => s.socket.disconnect());
    // eslint-disable-next-line no-console
    console.log('A3 load timings (ms):', JSON.stringify(timings));
    await t?.close();
  });

  it(`${N} users edit DIFFERENT fields of the same record at once (same baseRev) → all merged, nothing lost`, async () => {
    const res = await time('merge50', () => Promise.all(users.map((u, i) => sync(t, u.token, { changes: [up('c-merge', 1, { [`tag${i}`]: `v${i}` })] }))));
    expect(res.every((r) => r.status === 200 && r.body.applied[0]?.op === 'update' && r.body.conflicts.length === 0)).toBe(true);
    expect(res.every((r) => !r.body.applied[0].overwrote)).toBe(true);
    const [row] = await t.ds.query(`SELECT data, rev FROM records WHERE collection='costs' AND id='c-merge'`);
    expect(row.rev).toBe(N + 1);
    for (let i = 0; i < N; i++) expect(row.data[`tag${i}`]).toBe(`v${i}`);
    expect(row.data.amount).toBe(100);
  });

  it(`${N} users change the SAME financial field at once → exactly one wins, ${N - 1} explicit conflicts (no silent overwrite)`, async () => {
    const res = await time('race50', () => Promise.all(users.map((u, i) => sync(t, u.token, { changes: [up('c-race', 1, { amount: 1000 + i })] }))));
    const winnerIdx = res.map((r, i) => (r.body.applied.length === 1 ? i : -1)).filter((i) => i >= 0);
    const winners = res.filter((r) => r.body.applied.length === 1);
    const losers = res.filter((r) => r.body.conflicts.length === 1);
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(N - 1);
    expect(losers.every((r) => r.body.conflicts[0].reason === 'field_conflict' && r.body.conflicts[0].fields[0] === 'amount')).toBe(true);
    const winnerValue = 1000 + winnerIdx[0];
    const [row] = await t.ds.query(`SELECT data, rev FROM records WHERE collection='costs' AND id='c-race'`);
    expect(row.rev).toBe(2);
    expect(row.data.amount).toBe(winnerValue);
    // كل الخاسرين شافوا القيمة الفائزة في current
    expect(losers.every((r) => r.body.conflicts[0].current.data.amount === row.data.amount)).toBe(true);
  });

  it(`${N} users change the same TEXT field → last writer wins, and every overwrite is reported (not silent)`, async () => {
    const res = await time('text50', () => Promise.all(users.map((u, i) => sync(t, u.token, { changes: [up('c-text', 1, { notes: `n${i}` })] }))));
    expect(res.every((r) => r.body.applied[0]?.op === 'update')).toBe(true);
    expect(res.filter((r) => r.body.applied[0].overwrote?.includes('notes'))).toHaveLength(N - 1);
    const [{ n }] = await t.ds.query(`SELECT count(*)::int AS n FROM changes WHERE record_id='c-text' AND diff ? 'overwrote'`);
    expect(n).toBe(N - 1);
  });

  it(`${N} users insert 20 records each concurrently (${N * 20} records)`, async () => {
    const res = await time('insert1000', () => Promise.all(users.map((u, i) => sync(t, u.token, { changes: Array.from({ length: 20 }, (_, j) => up(`ins-${i}-${j}`, 0, { amount: j, projectId: 'p1' })) }))));
    expect(res.every((r) => r.status === 200 && r.body.applied.length === 20)).toBe(true);
    const b = await time('bootstrap', () => bootstrap(t, users[0].token));
    expect(b.data.costs.length).toBe(3 + N * 20);
  });

  it('every one of the 50 sockets received every change, in seq order, with no gaps', async () => {
    const all: number[] = (await t.ds.query(`SELECT seq::int AS s FROM changes WHERE seq > $1 AND collection='costs' ORDER BY seq`, [startSeq])).map((r: { s: number }) => r.s);
    await time('broadcastDrain', () => waitFor(() => socks.every((s) => s.changes.filter((e) => e.collection === 'costs').length >= all.length), 20_000, 'all sockets caught up'));
    for (const s of socks) {
      const got = s.changes.filter((e) => e.collection === 'costs').map((e) => e.seq);
      expect(got).toEqual(all);
    }
  });
});
