// اختبارات الأمان والسيرفر (Node فقط — بدون أي مكتبات، وبنحاكي electron)
// التشغيل:  npm test
const Module = require('module');
const path = require('path');
const fs = require('fs');
const os = require('os');
const vm = require('vm');
const crypto = require('crypto');
const http = require('http');

const PROJ = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'unified-test-'));

// الكود الأصلي لبرنامج الموارد البشرية (للتأكد إن الحسابات القديمة تفضل شغالة)
const ORIGINAL_HR_HASH_CODE = `
function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, hash) {
  try {
    const check = crypto.scryptSync(String(password || ''), salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
  } catch (e) { return false; }
}
`;

let pass = 0, fail = 0;
function T(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (detail ? ' -> ' + JSON.stringify(detail) : '')); } }

/* ---- electron stub ---- */
const handlers = {};
const noop = () => {};
const electronStub = new Proxy({
  app: new Proxy({ getPath: () => TMP, getVersion: () => '0.0.0', getName: () => 'unified-system', isPackaged: false, on: noop, whenReady: () => Promise.resolve(), setPath: noop },
                 { get: (t, k) => (k in t ? t[k] : noop) }),
  ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; }, on: noop },
}, { get: (t, k) => (k in t ? t[k] : new Proxy({}, { get: () => noop })) });
const origLoad = Module._load;
Module._load = function (req, parent, isMain) { if (req === 'electron') return electronStub; return origLoad.apply(this, arguments); };

(async () => {
  /* ===== 1) password.js ===== */
  const pw = require(PROJ + '/src/main/password.js');
  const h = pw.hashPassword('S3cret-pass');
  T('hash returns salt+hash (hex)', /^[0-9a-f]{32}$/.test(h.salt) && /^[0-9a-f]{128}$/.test(h.hash));
  T('verify accepts correct password', pw.verifyPassword('S3cret-pass', h.salt, h.hash) === true);
  T('verify rejects wrong password', pw.verifyPassword('S3cret-pasS', h.salt, h.hash) === false);
  T('verify rejects empty salt/hash', pw.verifyPassword('x', '', '') === false && pw.verifyPassword('x', h.salt, 'zz') === false);
  T('policy: too short', !!pw.passwordPolicyError('abc123'));
  T('policy: default password blocked (any case)', !!pw.passwordPolicyError('Admin123') && !!pw.passwordPolicyError('123456'));
  T('policy: good password accepted', pw.passwordPolicyError('Zx9-long-enough') === '');

  // compatibility with the ORIGINAL HR server hashing (existing accounts must keep working)
  const sandbox = { crypto, Buffer }; vm.createContext(sandbox);
  vm.runInContext(ORIGINAL_HR_HASH_CODE + '\nthis.hp = hashPassword; this.vp = verifyPassword;', sandbox);
  const oh = sandbox.hp('OldAccount#1');
  T('NEW verify accepts hash created by ORIGINAL server code', pw.verifyPassword('OldAccount#1', oh.salt, oh.hash) === true);
  const nh = pw.hashPassword('NewAccount#2');
  T('ORIGINAL verify accepts hash created by NEW code', sandbox.vp('NewAccount#2', nh.salt, nh.hash) === true);
  // the fixed default-admin constants embedded in the renderer really are admin123
  const net = fs.readFileSync(PROJ + '/renderer/core/network.js', 'utf8');
  const salt = net.match(/DEFAULT_ADMIN_SALT = '([0-9a-f]+)'/)[1], hash = net.match(/DEFAULT_ADMIN_HASH = '([0-9a-f]+)'/)[1];
  T('embedded default-admin salt/hash == admin123', pw.verifyPassword('admin123', salt, hash) === true);

  /* ===== 2) auth.js IPC ===== */
  require(PROJ + '/src/main/auth.js');
  const hr = await handlers['auth:hashPassword']({}, 'ViaIpc-1234');
  T('IPC hash handler works', hr && hr.salt && hr.hash);
  T('IPC verify handler true/false', (await handlers['auth:verifyPassword']({}, { password: 'ViaIpc-1234', salt: hr.salt, hash: hr.hash })) === true &&
                                      (await handlers['auth:verifyPassword']({}, { password: 'nope', salt: hr.salt, hash: hr.hash })) === false);
  T('IPC verify tolerates garbage payload', (await handlers['auth:verifyPassword']({}, null)) === false);

  /* ===== 3) the real server over HTTP ===== */
  require(PROJ + '/src/main/server.js');
  const PORT = 48000 + Math.floor(Math.random() * 1000);
  const st = await handlers['server:start']({}, { port: PORT });
  T('server starts', st && st.ok !== false, st);
  const call = (method, url, body, token) => new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ host: '127.0.0.1', port: PORT, path: url, method, headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token, 'X-Auth-Token': token } : {}) }, (res) => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => { let j = null; try { j = JSON.parse(b); } catch (_e) {} resolve({ status: res.statusCode, json: j, raw: b }); });
    });
    req.on('error', (err) => resolve({ status: 0, json: null, raw: String(err) }));
    if (data) req.write(data); req.end();
  });

  const bad = await call('POST', '/api/login', { username: 'admin', password: 'wrong' });
  T('login with wrong password rejected', bad.status === 401 || (bad.json && bad.json.ok === false), bad);
  const login = await call('POST', '/api/login', { username: 'admin', password: 'admin123' });
  T('seeded admin can log in with the default password', login.json && login.json.ok && login.json.token, login);
  T('login response says mustChangePassword = true', login.json && login.json.mustChangePassword === true, login.json);
  const tok = login.json.token;

  const weak = await call('POST', '/api/me/password', { newPassword: 'admin123' }, tok);
  T('self-change rejects the default password', weak.status === 400, weak);
  const short = await call('POST', '/api/me/password', { newPassword: 'abc' }, tok);
  T('self-change rejects short password', short.status === 400, short);
  const unauth = await call('POST', '/api/me/password', { newPassword: 'Brand-new-pass1' }, '');
  T('self-change requires a session', unauth.status === 401 || unauth.status === 403, unauth);
  const okc = await call('POST', '/api/me/password', { newPassword: 'Brand-new-pass1' }, tok);
  T('forced change succeeds without old password', okc.status === 200 && okc.json && okc.json.ok, okc);
  const old = await call('POST', '/api/login', { username: 'admin', password: 'admin123' });
  T('old default password no longer works', !(old.json && old.json.ok), old);
  const nl = await call('POST', '/api/login', { username: 'admin', password: 'Brand-new-pass1' });
  T('new password works and flag is cleared', nl.json && nl.json.ok && nl.json.mustChangePassword === false, nl.json);
  const tok2 = nl.json.token;
  const noOld = await call('POST', '/api/me/password', { newPassword: 'Another-pass-22' }, tok2);
  T('normal change now REQUIRES the current password', noOld.status === 403, noOld);
  const withOld = await call('POST', '/api/me/password', { oldPassword: 'Brand-new-pass1', newPassword: 'Another-pass-22' }, tok2);
  T('normal change with correct current password works', withOld.status === 200 && withOld.json.ok, withOld);

  // users file must hold only salt/hash — never a plaintext password
  const usersRaw = fs.readFileSync(path.join(TMP, 'users.json'), 'utf8');
  T('users.json has no plaintext passwords', !/Brand-new-pass1|Another-pass-22|admin123/.test(usersRaw) && !/"password"/.test(usersRaw));

  // create user: weak password rejected, strong accepted
  const tok3 = (await call('POST', '/api/login', { username: 'admin', password: 'Another-pass-22' })).json.token;
  const cw = await call('POST', '/api/users', { action: 'create', username: 'sara', name: 'Sara', role: 'viewer', password: '1234' }, tok3);
  T('create user: weak password rejected', cw.status === 400, cw);
  const cn = await call('POST', '/api/users', { action: 'create', username: 'sara', name: 'Sara', role: 'viewer' }, tok3);
  T('create user: missing password rejected (no more silent 123456)', cn.status === 400, cn);
  const cs = await call('POST', '/api/users', { action: 'create', username: 'sara', name: 'Sara', role: 'viewer', password: 'Sara-strong-9' }, tok3);
  T('create user: strong password accepted', cs.status === 200 && cs.json.ok, cs);
  const sl = await call('POST', '/api/login', { username: 'sara', password: 'Sara-strong-9' });
  T('new user logs in, no forced change', sl.json && sl.json.ok && !sl.json.mustChangePassword, sl.json);

  /* ===== 4) single data file with three sections through the real merge ===== */
  const cur = await call('GET', '/api/data', null, tok3);
  T('GET /api/data works', cur.status === 200 && cur.json, cur.status);
  const body = cur.json || {};
  const dataObj = body.data || body;
  const payload = Object.assign({}, dataObj, {
    employees: [{ id: 'e1', name: 'Ahmed' }],
    ledger: { suppliers: [{ id: 's1', name: 'Supplier A' }], settings: { currency: 'EGP' } },
    clients: { customers: [{ id: 'c1', name: 'Client A' }] }
  });
  const put = await call('POST', '/api/data', { data: payload, baseVersion: body.version || body.dataVersion || 0 }, tok3);
  T('saving data with ledger+clients sections accepted', put.status === 200 && put.json && put.json.ok !== false, put);
  const back = await call('GET', '/api/data', null, tok3);
  const bd = (back.json && (back.json.data || back.json)) || {};
  T('ledger section survives round trip', bd.ledger && bd.ledger.suppliers && bd.ledger.suppliers[0].name === 'Supplier A' && bd.ledger.settings.currency === 'EGP', bd.ledger);
  T('clients section survives round trip', bd.clients && bd.clients.customers && bd.clients.customers[0].name === 'Client A', bd.clients);
  T('HR keys still intact next to the sections', bd.employees && bd.employees[0] && bd.employees[0].name === 'Ahmed');

  await handlers['server:stop']({});
  console.log('\nNODE TESTS: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(err => { console.log('FATAL', err && err.stack || err); process.exit(2); });
