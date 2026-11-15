/* ================= وضع الشبكة: تعدد المستخدمين على أكثر من جهاز ================= *
 * ميزة اختيارية بالكامل ومطفأة افتراضيًا — لا تغيّر شيئًا في وضع الجهاز الواحد     *
 * (الوضع الافتراضي القديم يفضل يشتغل بالضبط زي ما هو من غير سيرفر ولا تسجيل دخول). *
 * ============================================================================== */
const os = require('os');
const crypto = require('crypto');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { app, ipcMain } = require('electron');
const { PRODUCT_NAME } = require('./brand');
const { APP_CONFIG_DIR, readData, writeData } = require('./storage');

const USERS_FILE = path.join(APP_CONFIG_DIR, 'users.json');
const SERVER_CONFIG_FILE = path.join(APP_CONFIG_DIR, 'server-config.json');

const { hashPassword, verifyPassword, passwordPolicyError } = require('./password');

function readUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      let arr = null;
      try { arr = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')); }
      catch (e) {
        // الملف تالف: نحتفظ بنسخة منه ونحاول آخر نسخة سليمة بدل ما نمسح كل الحسابات وننشئ أدمن افتراضي
        try { fs.copyFileSync(USERS_FILE, USERS_FILE + '.corrupt-' + Date.now()); } catch (_c) { /* ignore */ }
        try { arr = JSON.parse(fs.readFileSync(USERS_FILE + '.prev', 'utf-8')); } catch (_p) { arr = null; }
      }
      if (Array.isArray(arr) && arr.length) return arr;
    }
  } catch (e) { console.error('readUsers', e); }
  // أول تشغيل: ننشئ حساب أدمن افتراضي — اسم المستخدم admin وكلمة السر admin123
  // (لازم الأدمن يغيّرها فورًا من "إدارة المستخدمين")
  const { salt, hash } = hashPassword('admin123');
  const seeded = [{
    id: 'u_' + Date.now().toString(36),
    code: 'USR-001',
    username: 'admin',
    name: 'المدير',
    jobTitle: 'مدير النظام',
    role: 'admin',
    salt, hash,
    mustChangePassword: true,   // الحساب الافتراضي لازم يغيّر كلمة المرور عند أول دخول
    active: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    updatedBy: null,
    updatedAt: null
  }];
  writeUsers(seeded);
  return seeded;
}
function nextUserCode(users) {
  let max = 0;
  (users || []).forEach(u => {
    const m = /^USR-(\d+)$/.exec(u.code || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return 'USR-' + String(max + 1).padStart(3, '0');
}
const ROLE_TEMPLATE_LABELS_SRV = { manager: 'مدير', accountant: 'محاسب', collection: 'تحصيل', sales: 'مبيعات', viewer: 'عرض فقط', custom: 'مخصّص' };
function writeUsers(list) {
  try {
    if (!fs.existsSync(APP_CONFIG_DIR)) fs.mkdirSync(APP_CONFIG_DIR, { recursive: true });
    const tmp = USERS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf-8');       // كتابة ذرّية: ملف مؤقت ثم استبدال
    try { if (fs.existsSync(USERS_FILE)) fs.copyFileSync(USERS_FILE, USERS_FILE + '.prev'); } catch (_e) { /* ignore */ }
    fs.renameSync(tmp, USERS_FILE);
    return true;
  } catch (e) { console.error('writeUsers', e); return false; }
}

function getLanIps() {
  const ifaces = os.networkInterfaces();
  const out = [];
  Object.keys(ifaces).forEach(name => {
    (ifaces[name] || []).forEach(i => {
      if (i.family === 'IPv4' && !i.internal) out.push(i.address);
    });
  });
  return out;
}

// جلسات تسجيل الدخول (في الذاكرة فقط — تنتهي بإعادة تشغيل السيرفر)
let __sessions = Object.create(null); // token -> { userId, username, role, name, at }
function makeToken() { return crypto.randomBytes(24).toString('hex'); }

let __dataVersion = 0; // نسخة البيانات — تزيد مع كل حفظ ناجح، تُستخدم لاكتشاف وجود تعديلات جديدة (polling)
let __httpServer = null;
let __serverPort = 4173;
let __apiWriteQueue = Promise.resolve(); // يضمن معالجة عمليات الحفظ المتزامنة (أكثر من موظف بيحفظ في نفس اللحظة) واحدة تلو الأخرى

/* ---------------- دمج ذكي لتعديلات أكثر من مستخدم في نفس اللحظة -----------------
 * بدل رفض الحفظ كامل عند أي تعارض، بنحتفظ بآخر ~60 نسخة من البيانات (snapshots)
 * عشان نقدر نقارن: النسخة اللي كان شايفها المستخدم وقت ما فتح الشاشة (base) مقابل
 * النسخة الحالية على السيرفر (اللي ممكن يكون حد تاني عدّلها) مقابل النسخة الجديدة
 * اللي بيحاول يحفظها دلوقتي (incoming). بنطبّق تعديلات كل مستخدم كل واحدة لوحدها
 * بدل ما نضيّع شغل شخص كامل بسبب تعديل بسيط من شخص تاني على سجل مختلف.
 * عند تعارض حقيقي (نفس السجل اتعدّل من الاتنين)، تعديل الأدمن يكسب دائماً. */
let __versionSnapshots = new Map(); // version -> deep clone of data at that version
const MAX_SNAPSHOTS = 60;
function snapshotData(version, data) {
  __versionSnapshots.set(version, JSON.parse(JSON.stringify(data)));
  if (__versionSnapshots.size > MAX_SNAPSHOTS) {
    const oldestKey = __versionSnapshots.keys().next().value;
    __versionSnapshots.delete(oldestKey);
  }
}

/** دمج مصفوفة سجلات (موردين/فواتير/دفعات) بمعرّف id فريد لكل سجل */
function mergeRecordArray(base, serverCurrent, incoming, actingRole, actingUser) {
  const baseMap = new Map((base || []).filter(r => r && r.id).map(r => [r.id, r]));
  const serverMap = new Map((serverCurrent || []).filter(r => r && r.id).map(r => [r.id, r]));
  const incomingMap = new Map((incoming || []).filter(r => r && r.id).map(r => [r.id, r]));
  const allIds = new Set([...baseMap.keys(), ...serverMap.keys(), ...incomingMap.keys()]);
  const resultMap = new Map(serverMap);
  const conflicts = [];
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  for (const id of allIds) {
    const b = baseMap.get(id), sv = serverMap.get(id), inc = incomingMap.get(id);
    const clientChanged = !eq(b, inc);
    const serverChanged = !eq(b, sv);

    if (!clientChanged) continue; // العميل ما لمسش السجل ده — سيب نسخة السيرفر زي ما هي

    const applyIncoming = () => {
      if (inc === undefined) { resultMap.delete(id); return; }
      const stamped = Object.assign({}, inc, { _lastEditRole: actingRole, _lastEditBy: actingUser });
      resultMap.set(id, stamped);
    };

    if (!serverChanged) { applyIncoming(); continue; }

    // تعارض حقيقي: الاتنين عدّلوا نفس السجل من نفس الأساس
    conflicts.push(id);
    const svRole = sv && sv._lastEditRole;
    if (actingRole === 'admin') {
      applyIncoming(); // الأدمن يكسب دايمًا
    } else if (svRole === 'admin') {
      // تعديل الأدمن الموجود على السيرفر يفضل زي ما هو (يفوز على المستخدم العادي)
    } else {
      applyIncoming(); // مفيش أدمن في التعارض — الحفظ الحالي (الأحدث وصولاً) يكسب
    }
  }
  return { array: Array.from(resultMap.values()), conflicts };
}

/** دمج مصفوفات بسيطة (تصنيفات/أكواد مقترحة...) بدون id — دمج تجميعي (اتحاد) فقط */
function mergeStringArray(base, serverCurrent, incoming) {
  const b = new Set(base || []);
  const sv = new Set(serverCurrent || []);
  const inc = new Set(incoming || []);
  const removedByClient = [...b].filter(x => !inc.has(x));
  const result = new Set(sv);
  inc.forEach(x => result.add(x));
  removedByClient.forEach(x => { if (!sv.has(x) || b.has(x)) result.delete(x); });
  return Array.from(result);
}

function mergeAuditLog(serverCurrent, incoming) {
  const map = new Map();
  (serverCurrent || []).forEach(l => { if (l && l.id) map.set(l.id, l); });
  (incoming || []).forEach(l => { if (l && l.id) map.set(l.id, l); });
  return Array.from(map.values())
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
    .slice(0, 500);
}


/* دمج عام لكل مفاتيح البيانات (موظفين/عمال/حضور/...): السجلات اللي ليها id تتدمج سجل بسجل،
 * والمصفوفات البسيطة بالاتحاد، وأي قيمة تانية (إعدادات/كائنات) تتدمج مفتاح بمفتاح. */
function __eqJson(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function __isRecArr(a) { return Array.isArray(a) && a.every(r => r && typeof r === 'object' && !Array.isArray(r) && r.id !== undefined && r.id !== null && r.id !== ''); }
function __isPrimArr(a) { return Array.isArray(a) && a.every(x => x === null || ['string', 'number', 'boolean'].includes(typeof x)); }
function __isPlainObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }

function mergeAnyValue(b, sv, inc, role, user, stats, depth) {
  if (__eqJson(b, inc)) return sv;           // العميل ما غيّرش حاجة → نسيب نسخة السيرفر
  if (__eqJson(b, sv)) return inc;           // السيرفر ما اتغيّرش → ناخد تعديل العميل
  if (__eqJson(sv, inc)) return sv;
  // الاتنين غيّروا نفس القيمة
  if (Array.isArray(inc) && (sv === undefined || Array.isArray(sv)) && (b === undefined || Array.isArray(b))) {
    const bb = b || [], ss = sv || [];
    if (__isRecArr(bb) && __isRecArr(ss) && __isRecArr(inc)) {
      const m = mergeRecordArray(bb, ss, inc, role, user);
      stats.conflicts += m.conflicts.length;
      return m.array;
    }
    if (__isPrimArr(bb) && __isPrimArr(ss) && __isPrimArr(inc)) return mergeStringArray(bb, ss, inc);
  }
  if (depth < 3 && __isPlainObj(inc) && __isPlainObj(sv || {}) && __isPlainObj(b || {})) {
    const out = Object.assign({}, sv || {});
    const keys = new Set([...Object.keys(b || {}), ...Object.keys(sv || {}), ...Object.keys(inc)]);
    keys.forEach(k => {
      const v = mergeAnyValue((b || {})[k], (sv || {})[k], inc[k], role, user, stats, depth + 1);
      if (v === undefined) delete out[k]; else out[k] = v;
    });
    return out;
  }
  stats.conflicts++;
  return role === 'admin' ? inc : sv;
}

function mergeWholeData(base, serverCurrent, incoming, role, user) {
  const stats = { conflicts: 0 };
  const merged = {};
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(serverCurrent || {}), ...Object.keys(incoming || {})]);
  keys.forEach(k => {
    if (k === 'auditLog') { merged[k] = mergeAuditLog((serverCurrent || {})[k], (incoming || {})[k]); return; }
    const v = mergeAnyValue((base || {})[k], (serverCurrent || {})[k], (incoming || {})[k], role, user, stats, 0);
    if (v !== undefined) merged[k] = v;
  });
  return { data: merged, conflicts: stats.conflicts };
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end(body);
}

/**
 * قراءة جسم الطلب كـ Buffer كامل ثم فك ترميز UTF-8 مرة واحدة.
 * (النسخة القديمة كانت بتفك كل قطعة 64KB لوحدها فبتقسم الحرف العربي (2 بايت) عند حد القطعة
 *  وبيطلع رمزين "��" في الاسم — ودي كانت سبب تلف أسماء المشاريع وتكرارها.)
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', c => {
      total += c.length;
      if (total > 100 * 1024 * 1024) { req.destroy(); reject(new Error('طلب كبير جدًا')); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const SESSION_IDLE_MS = 12 * 60 * 60 * 1000; // الجلسة تنتهي بعد 12 ساعة خمول
function authFromReq(req) {
  const h = req.headers['authorization'] || '';
  const m = /^Bearer (.+)$/.exec(h);
  if (!m) return null;
  const sess = __sessions[m[1]];
  if (!sess) return null;
  if (Date.now() - (sess.at || 0) > SESSION_IDLE_MS) { delete __sessions[m[1]]; return null; }
  sess.at = Date.now();
  return sess;
}

// حماية من تخمين كلمة السر: 5 محاولات فاشلة لنفس المستخدم/الجهاز تقفل الدخول 10 دقايق
const __loginFails = Object.create(null);
const LOGIN_MAX_FAILS = 5, LOGIN_LOCK_MS = 10 * 60 * 1000;
function loginKey(req, username) { return String(username || '').toLowerCase() + '|' + String((req.socket && req.socket.remoteAddress) || ''); }
function loginLocked(key) {
  const f = __loginFails[key];
  if (!f) return 0;
  if (f.until && f.until > Date.now()) return Math.ceil((f.until - Date.now()) / 1000);
  if (f.until && f.until <= Date.now()) delete __loginFails[key];
  return 0;
}
function loginFailed(key) {
  const f = __loginFails[key] || (__loginFails[key] = { n: 0, until: 0 });
  f.n++;
  if (f.n >= LOGIN_MAX_FAILS) { f.until = Date.now() + LOGIN_LOCK_MS; f.n = 0; }
}

/** مستخدم صلاحياته كلها "عرض فقط" مينفعش يحفظ بيانات (حتى لو أرسل طلب مباشرة) */
function canWriteData(sess) {
  if (!sess) return false;
  if (sess.role === 'admin') return true;
  const pages = sess.perms && sess.perms.pages;
  if (!pages || typeof pages !== 'object') return true; // حسابات قديمة بدون صلاحيات تفصيلية
  return Object.keys(pages).some(k => pages[k] && (pages[k].add || pages[k].edit || pages[k].delete));
}

function startNetworkServer(port) {
  return new Promise((resolve, reject) => {
    if (__httpServer) {
      resolve({ ok: true, port: __serverPort, ips: getLanIps(), alreadyRunning: true });
      return;
    }
    const preferred = Number(port) || __serverPort || 4173;
    const candidates = [preferred, preferred + 1, preferred + 2, preferred + 3, 4173, 4174, 4175, 5173, 8080]
      .filter((v, i, a) => v > 0 && v < 65535 && a.indexOf(v) === i);
    let attemptIdx = 0;

    function finishOk(server) {
      __httpServer = server;
      __dataVersion = 1;
      __versionSnapshots = new Map();
      __apiWriteQueue = Promise.resolve();
      try { snapshotData(1, readData() || {}); } catch (_e) {}
      resolve({ ok: true, port: __serverPort, ips: getLanIps(), triedPort: preferred });
    }

    function attempt() {
      const p = candidates[attemptIdx];
      __serverPort = p;
      const server = http.createServer(async (req, res) => {

      try {
        if (req.method === 'OPTIONS') { sendJson(res, 200, { ok: true }); return; }
        const url = req.url.split('?')[0];

        if (url === '/api/ping' && req.method === 'GET') {
          sendJson(res, 200, {
            ok: true,
            app: PRODUCT_NAME,
            version: (typeof app.getVersion === 'function' ? app.getVersion() : ''),
            port: __serverPort,
            ips: getLanIps(),
            mode: 'host'
          });
          return;
        }

        if (url === '/api/login' && req.method === 'POST') {
          const body = await readBody(req);
          const lkey = loginKey(req, body.username);
          const wait = loginLocked(lkey);
          if (wait) { sendJson(res, 429, { ok: false, error: 'محاولات كتير غلط — جرّب تاني بعد ' + Math.ceil(wait / 60) + ' دقيقة' }); return; }
          const users = readUsers();
          const u = users.find(x => x.username === String(body.username || '').trim() && x.active !== false);
          if (!u || !verifyPassword(body.password, u.salt, u.hash)) {
            loginFailed(lkey);
            sendJson(res, 401, { ok: false, error: 'اسم المستخدم أو كلمة السر غير صحيحة' });
            return;
          }
          delete __loginFails[lkey];
          u.lastLoginAt = new Date().toISOString();
          writeUsers(users);
          const token = makeToken();
          __sessions[token] = { userId: u.id, username: u.username, role: u.role, name: u.name, perms: u.perms || null, at: Date.now() };
          sendJson(res, 200, { ok: true, token, role: u.role, name: u.name, username: u.username, perms: u.perms || null, mustChangePassword: !!u.mustChangePassword });
          return;
        }

        // كل ما تحت ده محتاج تسجيل دخول صحيح
        const sess = authFromReq(req);
        if (!sess) { sendJson(res, 401, { ok: false, error: 'غير مسجل دخول' }); return; }

        // تغيير كلمة المرور بواسطة صاحب الحساب نفسه.
        // لو الحساب مطلوب منه التغيير (mustChangePassword) مش بنطلب القديمة — الجلسة نفسها اتحقق منها.
        if (url === '/api/me/password' && req.method === 'POST') {
          const body = await readBody(req);
          const users = readUsers();
          const idx = users.findIndex(x => x && x.id === sess.userId);
          if (idx < 0) { sendJson(res, 404, { ok: false, error: 'الحساب غير موجود' }); return; }
          const me = users[idx];
          if (!me.mustChangePassword && !verifyPassword(body.oldPassword, me.salt, me.hash)) {
            sendJson(res, 403, { ok: false, error: 'كلمة المرور الحالية غير صحيحة' });
            return;
          }
          const perr = passwordPolicyError(body.newPassword);
          if (perr) { sendJson(res, 400, { ok: false, error: perr }); return; }
          const hp = hashPassword(body.newPassword);
          me.salt = hp.salt; me.hash = hp.hash;
          me.mustChangePassword = false;
          me.passwordUpdatedAt = new Date().toISOString();
          me.updatedBy = me.name || me.username; me.updatedAt = me.passwordUpdatedAt;
          if (!writeUsers(users)) { sendJson(res, 500, { ok: false, error: 'تعذر كتابة ملف المستخدمين على القرص' }); return; }
          sendJson(res, 200, { ok: true });
          return;
        }

        if (url === '/api/logout' && req.method === 'POST') {
          const h = req.headers['authorization'] || '';
          const m = /^Bearer (.+)$/.exec(h);
          if (m) delete __sessions[m[1]];
          sendJson(res, 200, { ok: true });
          return;
        }

        if (url === '/api/data' && req.method === 'GET') {
          const data = readData() || {};
          if (!__versionSnapshots.has(__dataVersion)) snapshotData(__dataVersion, data);
          sendJson(res, 200, { ok: true, data, version: __dataVersion });
          return;
        }

        if (url === '/api/data' && req.method === 'POST') {
          if (!canWriteData(sess)) { sendJson(res, 403, { ok: false, error: 'حسابك صلاحيته عرض فقط — لا يمكن حفظ تعديلات' }); return; }
          const body = await readBody(req);
          const incoming = body.data || {};
          if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming) || !Array.isArray(incoming.employees)) {
            sendJson(res, 400, { ok: false, error: 'بيانات غير صالحة' });
            return;
          }
          // نُسلسل كل عمليات الدمج والكتابة بطابور — عشان لو موظفين حفظوا في نفس
          // اللحظة بالظبط، كل حفظة تدمج فوق نتيجة اللي قبلها مباشرة، مش فوق نسخة
          // قديمة ممكن تتكتب فوقها وتضيع
          __apiWriteQueue = __apiWriteQueue.then(async () => {
            const serverCurrent = readData() || {};

            if (sess.role !== 'admin') {
              const cnt = d => ['employees', 'workers', 'supervisors', 'drivers', 'equipment'].reduce((n, k) => n + ((d[k] || []).length || 0), 0);
              if (cnt(serverCurrent) > 5 && cnt(incoming) === 0) {
                sendJson(res, 403, { ok: false, error: 'غير مسموح للمستخدم العادي بمسح كل البيانات — يلزم صلاحية أدمن' });
                return;
              }
            }

            const baseVersion = typeof body.expectedVersion === 'number' ? body.expectedVersion : __dataVersion;
            const base = __versionSnapshots.get(baseVersion) || serverCurrent;
            const actingUser = { username: sess.username, name: sess.name };

            const mergedRes = mergeWholeData(base, serverCurrent, incoming, sess.role, actingUser);
            const merged = mergedRes.data;
            const totalConflicts = mergedRes.conflicts;

            writeData(merged);
            __dataVersion++;
            snapshotData(__dataVersion, merged);

            sendJson(res, 200, {
              ok: true,
              version: __dataVersion,
              data: merged,
              conflicts: totalConflicts,
              conflictNote: totalConflicts
                ? 'حصل تعارض في ' + totalConflicts + ' سجل عدّله حد تاني في نفس اللحظة — تم حسم الأمر تلقائيًا وتحديث شاشتك'
                : null
            });
          }).catch(e => {
            try { sendJson(res, 500, { ok: false, error: String(e.message || e) }); } catch (e2) {}
          });
          await __apiWriteQueue;
          return;
        }

        function canManageUsers(s) {
          return s.role === 'admin' || (s.perms && s.perms.manageUsers);
        }

        if (url === '/api/users' && req.method === 'GET') {
          if (!canManageUsers(sess)) { sendJson(res, 403, { ok: false, error: 'صلاحية إدارة المستخدمين مطلوبة' }); return; }
          const users = readUsers().map(u => ({
            id: u.id, code: u.code || '', username: u.username, name: u.name, jobTitle: u.jobTitle || '',
            email: u.email || '', role: u.role, roleTemplate: u.roleTemplate || null, perms: u.perms || null,
            active: u.active !== false, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt || null,
            updatedBy: u.updatedBy || null, updatedAt: u.updatedAt || null
          }));
          sendJson(res, 200, { ok: true, users });
          return;
        }

        if (url === '/api/users' && req.method === 'POST') {
          if (!canManageUsers(sess)) { sendJson(res, 403, { ok: false, error: 'صلاحية إدارة المستخدمين مطلوبة' }); return; }
          const body = await readBody(req);
          let users = readUsers();
          // مستخدم مفوَّض (manageUsers) وليس أدمن حقيقي — ممنوع يدير حسابات الأدمن أو يمنح صلاحية أدمن
          const targetIsAdmin = (id) => { const t = users.find(x=>x.id===id); return t && t.role === 'admin'; };
          if (sess.role !== 'admin') {
            if (body.role === 'admin') { sendJson(res, 403, { ok: false, error: 'منح صلاحية أدمن متاح للأدمن الأساسي فقط' }); return; }
            if (body.id && targetIsAdmin(body.id)) { sendJson(res, 403, { ok: false, error: 'التعديل على حساب أدمن متاح للأدمن الأساسي فقط' }); return; }
          }
          const stamp = (u) => { u.updatedBy = sess.name || sess.username; u.updatedAt = new Date().toISOString(); return u; };
          if (body.action === 'create') {
            const uname = String(body.username || '').trim();
            if (!uname) { sendJson(res, 400, { ok: false, error: 'اسم المستخدم مطلوب' }); return; }
            if (users.some(u => u.username === uname)) { sendJson(res, 400, { ok: false, error: 'اسم المستخدم موجود بالفعل' }); return; }
            const perrC = passwordPolicyError(body.password);
            if (perrC) { sendJson(res, 400, { ok: false, error: perrC }); return; }
            const { salt, hash } = hashPassword(body.password);
            users.push(stamp({
              id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              code: nextUserCode(users),
              username: uname,
              name: String(body.name || uname),
              jobTitle: String(body.jobTitle || ROLE_TEMPLATE_LABELS_SRV[body.roleTemplate] || ''),
              email: String(body.email || ''),
              role: body.role === 'admin' ? 'admin' : 'custom',
              roleTemplate: body.roleTemplate || 'custom',
              perms: body.perms || null,
              salt, hash, active: true, createdAt: new Date().toISOString(), lastLoginAt: null
            }));
            if (!writeUsers(users)) {
              sendJson(res, 500, { ok: false, error: 'تعذر كتابة ملف المستخدمين على القرص' });
              return;
            }
            sendJson(res, 200, { ok: true });
            return;
          }
          // تحديث موحّد: ملف شخصي + صلاحيات + حالة + كلمة سر في كتابة واحدة (بدل عدة طلبات ممكن تفشل جزئيًا)
          if (body.action === 'update' || body.action === 'setRole' || body.action === 'setActive' || body.action === 'rename' || body.action === 'setPerms' || body.action === 'setProfile' || body.action === 'resetPassword') {
            if (!body.id) { sendJson(res, 400, { ok: false, error: 'معرّف المستخدم مطلوب' }); return; }
            const idx = users.findIndex(u => u && u.id === body.id);
            if (idx < 0) { sendJson(res, 404, { ok: false, error: 'المستخدم غير موجود (قد يكون اتحذف)' }); return; }
            let u = Object.assign({}, users[idx]);

            if (body.action === 'setRole') u.role = body.role === 'admin' ? 'admin' : 'custom';
            if (body.action === 'setActive' || (body.action === 'update' && body.active !== undefined)) u.active = !!body.active;
            if (body.action === 'rename') u.name = String(body.name || u.name);

            if (body.action === 'setPerms' || (body.action === 'update' && body.perms !== undefined)) {
              // مهم: نقبل perms حتى لو كل القيم false (مش نستخدم || اللي كانت بترجع القديم)
              if (body.perms !== undefined && body.perms !== null) u.perms = body.perms;
              if (body.roleTemplate !== undefined && body.roleTemplate !== null && body.roleTemplate !== '') {
                u.roleTemplate = String(body.roleTemplate);
              }
            }

            if (body.action === 'setProfile' || body.action === 'update') {
              if (body.name != null) u.name = String(body.name || u.name);
              if (body.jobTitle != null) u.jobTitle = String(body.jobTitle);
              if (body.email != null) u.email = String(body.email);
            }

            if (body.action === 'resetPassword' || (body.action === 'update' && body.password)) {
              const pwd = String(body.password || '');
              const perrR = pwd ? passwordPolicyError(pwd) : '';
              if (perrR) { sendJson(res, 400, { ok: false, error: perrR }); return; }
              if (pwd) {
                const { salt, hash } = hashPassword(pwd);
                u.salt = salt;
                u.hash = hash;
                u.mustChangePassword = false;
                u.passwordUpdatedAt = new Date().toISOString();
              }
            }

            u = stamp(u);
            users[idx] = u;
            if (!writeUsers(users)) {
              sendJson(res, 500, { ok: false, error: 'تعذر كتابة ملف المستخدمين على القرص' });
              return;
            }
            // رجّع النسخة المحدّثة للعميل عشان الجدول يتزامن فورًا
            sendJson(res, 200, {
              ok: true,
              user: {
                id: u.id, code: u.code || '', username: u.username, name: u.name,
                jobTitle: u.jobTitle || '', email: u.email || '', role: u.role,
                roleTemplate: u.roleTemplate || null, perms: u.perms || null,
                active: u.active !== false, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt || null,
                updatedBy: u.updatedBy || null, updatedAt: u.updatedAt || null
              }
            });
            return;
          }
          if (body.action === 'delete') {
            if (users.length <= 1) { sendJson(res, 400, { ok: false, error: 'لا يمكن حذف آخر حساب' }); return; }
            users = users.filter(u => u.id !== body.id);
            writeUsers(users);
            sendJson(res, 200, { ok: true });
            return;
          }
          sendJson(res, 400, { ok: false, error: 'إجراء غير معروف' });
          return;
        }

        sendJson(res, 404, { ok: false, error: 'غير موجود' });
      } catch (e) {
        try { sendJson(res, 500, { ok: false, error: String(e.message || e) }); } catch (e2) {}
      }
      });
      server.once('error', (e) => {
        try { server.close(); } catch (_e) {}
        if (e && (e.code === 'EADDRINUSE' || e.code === 'EACCES') && attemptIdx < candidates.length - 1) {
          attemptIdx++;
          attempt();
          return;
        }
        __httpServer = null;
        const msg = (e && e.code === 'EADDRINUSE')
          ? ('المنفذ ' + p + ' مستخدم — أغلق البرنامج الذي يستخدمه أو غيّر المنفذ')
          : String((e && e.message) || e || 'فشل تشغيل السيرفر');
        reject(new Error(msg));
      });
      server.listen(p, '0.0.0.0', () => finishOk(server));
    }

    attempt();
  });
}

function stopNetworkServer() {
  return new Promise((resolve) => {
    if (!__httpServer) { resolve({ ok: true }); return; }
    __httpServer.close(() => { __httpServer = null; __sessions = Object.create(null); resolve({ ok: true }); });
  });
}

ipcMain.handle('server:start', async (event, { port } = {}) => {
  try { return await startNetworkServer(port); }
  catch (e) { return { ok: false, error: String(e.message || e) }; }
});
ipcMain.handle('server:stop', async () => stopNetworkServer());
ipcMain.handle('server:status', async () => ({
  ok: true, running: !!__httpServer, port: __serverPort, ips: getLanIps()
}));

module.exports = {};
