import { adminToken, bearer, connectSocket, createTestApp, login, newUser, refreshCookie, sync, TestApp, waitFor } from './app';

describe('A3 realtime (Socket.IO /api/stream + LISTEN/NOTIFY)', () => {
  let t: TestApp;
  let admin: string;
  const sockets: { socket: { disconnect: () => void } }[] = [];
  const open = async (token: string | undefined) => { const s = await connectSocket(t, token); sockets.push(s); return s; };
  const up = (collection: string, id: string, baseRev: number, set: Record<string, unknown>) => ({ collection, id, op: 'upsert', baseRev, set });

  beforeAll(async () => {
    t = await createTestApp({ REALTIME_REVALIDATE_MS: '400' }, { listen: true });
    admin = await adminToken(t);
    await sync(t, admin, { changes: [up('projects', 'p1', 0, { name: 'p1' }), up('projects', 'p2', 0, { name: 'p2' })] });
  });
  afterAll(async () => {
    sockets.forEach((s) => s.socket.disconnect());
    await t?.close();
  });

  it('rejects connections without a valid token or with a pending forced password change', async () => {
    expect((await open(undefined)).outcome).toBe('rejected');
    expect((await open('garbage')).outcome).toBe('rejected');
    const r = await t.http().post('/api/users/' + (await newUser(t, admin, 'mustchange', 'hr')).id + '/reset-password').set(bearer(admin)).send({ newPassword: 'Must#Change#1' });
    expect(r.status).toBe(204);
    const tok = (await login(t, 'mustchange', 'Must#Change#1')).token;
    expect((await open(tok)).outcome).toBe('rejected');
  });

  it('broadcasts every committed change, filtered per recipient (salary, scope, page access)', async () => {
    const hr = await open((await newUser(t, admin, 'rt_hr', 'hr')).token);
    const clerk = await open((await newUser(t, admin, 'rt_clerk', 'custom', { editData: true, pages: [{ page: 'employees', view: true, add: false, edit: false, delete: false }] })).token);
    const pm = await open((await newUser(t, admin, 'rt_pm', 'projectManager', { projectScope: ['p1'] })).token);
    const ledger = await open((await newUser(t, admin, 'rt_ledger', 'ledgerAccountant')).token);
    for (const s of [hr, clerk, pm, ledger]) expect(s.outcome).toBe('ready');

    await sync(t, admin, { changes: [
      up('employees', 'e1', 0, { name: 'محمد', salary: 9000 }),
      up('workerAttendance', 'a1', 0, { personId: 'w1', projectId: 'p1', dayWage: 350, date: '2026-11-01' }),
      up('workerAttendance', 'a2', 0, { personId: 'w2', projectId: 'p2', dayWage: 300, date: '2026-11-01' }),
    ] });
    await waitFor(() => hr.changes.length >= 3, 5000, 'hr events');
    expect(hr.changes.map((e) => `${e.collection}/${e.id}`)).toEqual(['employees/e1', 'workerAttendance/a1', 'workerAttendance/a2']);
    expect(hr.changes[0]).toMatchObject({ kind: 'record', op: 'upsert', rev: 1, data: { name: 'محمد', salary: 9000 } });
    const seqs = hr.changes.map((e) => e.seq);
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);

    await waitFor(() => clerk.changes.length >= 1, 5000, 'clerk events');
    await waitFor(() => pm.changes.length >= 1, 5000, 'pm events');
    await new Promise((r) => setTimeout(r, 300));
    expect(clerk.changes.map((e) => e.id)).toEqual(['e1']);
    expect(clerk.changes[0].data).toEqual({ id: 'e1', name: 'محمد' }); // من غير الراتب
    expect(pm.changes.map((e) => e.id)).toEqual(['a1']); // مشروعه بس
    expect(pm.changes[0].data).not.toHaveProperty('dayWage');
    expect(ledger.changes).toEqual([]);
  });

  it('deletes and doc changes are broadcast too', async () => {
    const hr = await open((await newUser(t, admin, 'rt_hr2', 'hr')).token);
    await sync(t, admin, { changes: [{ collection: 'employees', id: 'e1', op: 'delete', baseRev: 1 }], docs: [{ key: 'settings', baseRev: 0, op: 'set', value: { companyName: 'X' } }] });
    await waitFor(() => hr.changes.length >= 2, 5000, 'delete+doc events');
    expect(hr.changes[0]).toMatchObject({ collection: 'employees', id: 'e1', op: 'delete', data: null, rev: 2 });
    expect(hr.changes[1]).toMatchObject({ kind: 'doc', collection: 'settings', op: 'upsert', rev: 1, data: { companyName: 'X' } });
  });

  it('deactivating a user disconnects their sockets immediately; logout-all too', async () => {
    const u = await newUser(t, admin, 'rt_kick', 'viewer');
    const s = await open(u.token);
    let disconnected = false;
    (s.socket as unknown as { on: (e: string, f: () => void) => void }).on('disconnect', () => { disconnected = true; });
    await t.http().patch(`/api/users/${u.id}`).set(bearer(admin)).send({ active: false });
    await waitFor(() => disconnected, 3000, 'disconnect after deactivate');

    const u2 = await newUser(t, admin, 'rt_logoutall', 'viewer');
    const s2 = await open(u2.token);
    let d2 = false;
    (s2.socket as unknown as { on: (e: string, f: () => void) => void }).on('disconnect', () => { d2 = true; });
    await t.http().post('/api/auth/logout-all').set(bearer(u2.token));
    await waitFor(() => d2, 3000, 'disconnect after logout-all');
  });

  it('permission change → resync event (client re-bootstraps)', async () => {
    const u = await newUser(t, admin, 'rt_resync', 'viewer');
    const s = await open(u.token);
    await t.http().patch(`/api/users/${u.id}`).set(bearer(admin)).send({ role: 'hr' });
    await waitFor(() => s.events.some((e) => e.name === 'resync'), 3000, 'resync');
  });

  it('after a token refresh the socket must reauth with the new token, otherwise it is closed', async () => {
    const r = await login(t, 'admin', 'Admin#Strong#2026');
    const s = await open(r.token);
    const sock = s.socket as unknown as { on: (e: string, f: () => void) => void; emitWithAck: (e: string, p: unknown) => Promise<{ ok: boolean }> };
    let disconnected = false;
    sock.on('disconnect', () => { disconnected = true; });
    const ref = await t.http().post('/api/auth/refresh').set('cookie', r.cookie!);
    await waitFor(() => s.events.some((e) => e.name === 'reauth_required'), 3000, 'reauth_required');
    expect(await sock.emitWithAck('reauth', { token: ref.body.accessToken })).toEqual({ ok: true });
    await new Promise((res) => setTimeout(res, 1000)); // أكتر من دورتين تحقق
    expect(disconnected).toBe(false);

    // من غير reauth → بيتقفل
    const r2 = await login(t, 'admin', 'Admin#Strong#2026');
    const s2 = await open(r2.token);
    let d2 = false;
    (s2.socket as unknown as { on: (e: string, f: () => void) => void }).on('disconnect', () => { d2 = true; });
    await t.http().post('/api/auth/refresh').set('cookie', r2.cookie!);
    await waitFor(() => d2, 4000, 'disconnect without reauth');
    expect(refreshCookie(ref)).toBeDefined();
  });

  it('catch-up after a disconnect: /api/changes?since=<last seq> returns exactly what was missed', async () => {
    const hrTok = (await newUser(t, admin, 'rt_catch', 'hr')).token;
    const s = await open(hrTok);
    await sync(t, admin, { changes: [up('departments', 'd1', 0, { name: 'قسم 1' })] });
    await waitFor(() => s.changes.length >= 1, 3000, 'first event');
    const lastSeq = s.changes[s.changes.length - 1].seq;
    s.socket.disconnect();
    await sync(t, admin, { changes: [up('departments', 'd2', 0, { name: 'قسم 2' }), up('departments', 'd3', 0, { name: 'قسم 3' })] });
    const missed = await t.http().get(`/api/changes?since=${lastSeq}`).set(bearer(hrTok));
    expect(missed.body.changes.map((c: { id: string }) => c.id)).toEqual(['d2', 'd3']);
    expect(missed.body.hasMore).toBe(false);
  });

  it('changes written directly in the database (e.g. an import script) are broadcast too', async () => {
    const s = await open((await newUser(t, admin, 'rt_direct', 'hr')).token);
    await t.ds.transaction(async (em) => {
      await em.query(`INSERT INTO records (collection, id, data) VALUES ('departments', 'd9', '{"id":"d9","name":"مستورد"}')`);
      await em.query(`INSERT INTO changes (collection, record_id, op, rev, fields) VALUES ('departments', 'd9', 'insert', 1, '{name}')`);
    });
    await waitFor(() => s.changes.some((e) => e.id === 'd9'), 3000, 'direct db event');
  });
});
