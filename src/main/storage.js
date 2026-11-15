// قراءة وحفظ data.json، وإدارة النسخ الاحتياطي التلقائي والدوري، ومسار
// تخزين بيانات البرنامج (قابل للتغيير من الإعدادات)، بالإضافة إلى استيراد/
// تصدير ملفات عامة (JSON) عبر نوافذ "فتح"/"حفظ" حقيقية.
const path = require('path');
const os = require('os');
const fs = require('fs');
const { app, ipcMain, dialog } = require('electron');
const { getMainWindow } = require('./window-state');

// مؤشر دائم لمسار البيانات (دائمًا في userData الافتراضي)
const APP_CONFIG_DIR = app.getPath('userData');
const DATA_LOCATION_FILE = path.join(APP_CONFIG_DIR, 'data-location.json');

// مسار بيانات البرنامج (قابل للتغيير من الإعدادات)
let DATA_DIR = APP_CONFIG_DIR;
let DATA_FILE = path.join(DATA_DIR, 'data.json');
let BACKUPS_DIR = path.join(DATA_DIR, 'backups-تلقائية');
let ATTACH_DIR = path.join(DATA_DIR, 'attachments');

function applyDataDir(dir) {
  DATA_DIR = dir || APP_CONFIG_DIR;
  DATA_FILE = path.join(DATA_DIR, 'data.json');
  BACKUPS_DIR = path.join(DATA_DIR, 'backups-تلقائية');
  ATTACH_DIR = path.join(DATA_DIR, 'attachments');
}

function loadDataLocationConfig() {
  try {
    if (!fs.existsSync(APP_CONFIG_DIR)) fs.mkdirSync(APP_CONFIG_DIR, { recursive: true });
    if (fs.existsSync(DATA_LOCATION_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(DATA_LOCATION_FILE, 'utf-8'));
      if (cfg && cfg.dataDir && typeof cfg.dataDir === 'string' && cfg.dataDir.trim()) {
        applyDataDir(cfg.dataDir.trim());
        return;
      }
    }
  } catch (e) {
    console.error('data-location load', e);
  }
  applyDataDir(APP_CONFIG_DIR);
}
loadDataLocationConfig();

function saveDataLocationConfig(dir) {
  try {
    if (!fs.existsSync(APP_CONFIG_DIR)) fs.mkdirSync(APP_CONFIG_DIR, { recursive: true });
    fs.writeFileSync(DATA_LOCATION_FILE, JSON.stringify({ dataDir: dir }, null, 2), 'utf-8');
  } catch (e) {
    console.error('data-location save', e);
  }
}

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  if (!fs.existsSync(ATTACH_DIR)) fs.mkdirSync(ATTACH_DIR, { recursive: true });
}

function copyFileIfExists(src, dest) {
  try {
    if (fs.existsSync(src) && src !== dest) {
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);
    }
  } catch (e) { console.error('copy', e); }
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    const st = fs.statSync(s);
    if (st.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

function readData() {
  ensureDirs();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    // الملف تالف - نحتفظ بنسخة منه أولاً (حتى لا يُكتب فوقه عند أول حفظ) ثم نحاول آخر نسخة احتياطية
    try { fs.copyFileSync(DATA_FILE, DATA_FILE + '.corrupt-' + Date.now()); } catch (_c) { /* ignore */ }
    try { // أحدث نسخة سليمة قبل آخر حفظ
      if (fs.existsSync(DATA_FILE + '.prev')) return JSON.parse(fs.readFileSync(DATA_FILE + '.prev', 'utf-8'));
    } catch (_p) { /* نكمل للنسخ الاحتياطية */ }
    try {
      const backups = fs.readdirSync(BACKUPS_DIR).filter(f => /^backup-.*\.json$/.test(f)).sort().reverse();
      if (backups.length) {
        const raw = fs.readFileSync(path.join(BACKUPS_DIR, backups[0]), 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e2) { /* لا يوجد شيء يمكن استرجاعه */ }
  }
  return null;
}

/* ===================== نسخة احتياطية إضافية في مكان تاني (فلاشة / مجلد شبكة / OneDrive) ===================== */
const EXTRA_BACKUP_FILE = path.join(APP_CONFIG_DIR, 'backup-extra.json');
function getExtraBackupDir() {
  try {
    if (fs.existsSync(EXTRA_BACKUP_FILE)) {
      const c = JSON.parse(fs.readFileSync(EXTRA_BACKUP_FILE, 'utf-8'));
      if (c && typeof c.dir === 'string' && c.dir.trim()) return c.dir.trim();
    }
  } catch (_e) { /* ignore */ }
  return '';
}
function setExtraBackupDir(dir) {
  try {
    if (!dir) { if (fs.existsSync(EXTRA_BACKUP_FILE)) fs.unlinkSync(EXTRA_BACKUP_FILE); return true; }
    fs.writeFileSync(EXTRA_BACKUP_FILE, JSON.stringify({ dir }), 'utf-8');
    return true;
  } catch (_e) { return false; }
}
/** بيحاول ينسخ النسخة اليومية للمكان الإضافي — لو فشل (الفلاشة مش موجودة) مبيوقفش الحفظ الأساسي */
function copyToExtraBackup(srcFile) {
  const dir = getExtraBackupDir();
  if (!dir) return { ok: true, skipped: true };
  try {
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, path.basename(srcFile));
    fs.copyFileSync(srcFile, dest + '.tmp');
    fs.renameSync(dest + '.tmp', dest);
    const files = fs.readdirSync(dir).filter(f => /^backup-.*\.json$/.test(f)).sort();
    if (files.length > 30) files.slice(0, files.length - 30).forEach(f => { try { fs.unlinkSync(path.join(dir, f)); } catch (_e) { /* ignore */ } });
    return { ok: true, path: dest };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}

/* ===================== قفل الملف: تحذير لو البرنامج مفتوح في مكان تاني على نفس البيانات ===================== */
let __lockInfo = { others: false };
function lockPath() { return path.join(DATA_DIR, 'data.lock'); }
function writeLock() {
  try { fs.writeFileSync(lockPath(), JSON.stringify({ pid: process.pid, host: os.hostname(), ts: Date.now() }), 'utf-8'); } catch (_e) { /* ignore */ }
}
function checkLockAtStartup() {
  try {
    if (fs.existsSync(lockPath())) {
      const l = JSON.parse(fs.readFileSync(lockPath(), 'utf-8'));
      const fresh = l && l.ts && (Date.now() - l.ts) < 120000;
      if (fresh && l.pid !== process.pid) __lockInfo = { others: true, host: l.host || '', ts: l.ts };
    }
  } catch (_e) { /* ignore */ }
  writeLock();
  const t = setInterval(writeLock, 30000); if (t.unref) t.unref();
  app.on('will-quit', () => { try { const l = JSON.parse(fs.readFileSync(lockPath(), 'utf-8')); if (l && l.pid === process.pid) fs.unlinkSync(lockPath()); } catch (_e) { /* ignore */ } });
}

/** انتظار قصير متزامن (لإعادة المحاولة لو الملف مقفول لحظياً بواسطة مضاد فيروسات/مزامنة) */
function sleepSync(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch (_e) { /* ignore */ }
}

function writeData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('بيانات غير صالحة للحفظ');
  }
  ensureDirs();
  const json = JSON.stringify(data);   // بدون تنسيق مسافات: ملف أصغر بحوالي 35% وحفظ أسرع
  const tmpFile = DATA_FILE + '.tmp';
  fs.writeFileSync(tmpFile, json, 'utf-8');
  // تحقق إن الملف المؤقت اتكتب كامل وقابل للقراءة قبل ما يحل محل الأصلي
  try { JSON.parse(fs.readFileSync(tmpFile, 'utf-8')); }
  catch (e) { try { fs.unlinkSync(tmpFile); } catch (_e) { /* ignore */ } throw new Error('فشل التحقق من الملف المؤقت: ' + e.message); }
  // نسخة من آخر ملف سليم قبل الاستبدال — شبكة أمان ضد أي حفظ خاطئ
  try { if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, DATA_FILE + '.prev'); } catch (_e) { /* ignore */ }
  // استبدال ذري (مع إعادة محاولة لو الملف مقفول)
  let lastErr = null;
  for (let i = 0; i < 5; i++) {
    try { fs.renameSync(tmpFile, DATA_FILE); lastErr = null; break; }
    catch (e) { lastErr = e; if (e && (e.code === 'EPERM' || e.code === 'EBUSY' || e.code === 'EACCES')) sleepSync(60 * (i + 1)); else break; }
  }
  if (lastErr) throw lastErr;
  // نسخة احتياطية تلقائية يومية (باسم يحمل التاريخ) بحد أقصى 30 نسخة
  try {
    const _n = new Date();
    const today = _n.getFullYear() + '-' + String(_n.getMonth() + 1).padStart(2, '0') + '-' + String(_n.getDate()).padStart(2, '0'); // تاريخ الجهاز المحلي
    const backupFile = path.join(BACKUPS_DIR, `backup-${today}.json`);
    const backupTmp = backupFile + '.tmp';
    fs.writeFileSync(backupTmp, JSON.stringify(data), 'utf-8');
    fs.renameSync(backupTmp, backupFile);
    copyToExtraBackup(backupFile);
    const files = fs.readdirSync(BACKUPS_DIR).filter(f => /^backup-.*\.json$/.test(f)).sort();
    if (files.length > 30) {
      files.slice(0, files.length - 30).forEach(f => fs.unlinkSync(path.join(BACKUPS_DIR, f)));
    }
  } catch (e) { /* تجاهل أخطاء النسخ الاحتياطي التلقائي حتى لا توقف الحفظ الأساسي */ }
  return true;
}

/* ---------------- جسور التواصل مع واجهة البرنامج ---------------- */

ipcMain.handle('data:load', async () => {
  return readData();
});

let __saveQueue = Promise.resolve();
ipcMain.handle('data:save', async (event, data) => {
  // طابور حفظ — يمنع الكتابة المتزامنة عند الضغط السريع
  __saveQueue = __saveQueue.then(() => {
    try {
      writeData(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }).catch(e => ({ ok: false, error: String(e) }));
  return __saveQueue;
});

// حفظ متزامن لحظة إغلاق النافذة فقط — يضمن كتابة آخر تعديل قبل غلق البرنامج
// فعلاً حتى لو كان الحفظ المؤجل العادي (280ms) لسه ما نفذش
ipcMain.on('data:saveSync', (event, data) => {
  try {
    writeData(data);
    event.returnValue = { ok: true };
  } catch (e) {
    event.returnValue = { ok: false, error: String(e) };
  }
});

// حفظ ملف (تصدير CSV / نسخة احتياطية JSON) عبر نافذة "حفظ باسم" حقيقية
ipcMain.handle('file:save', async (event, { filename, content }) => {
  const result = await dialog.showSaveDialog(getMainWindow(), {
    defaultPath: filename
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  fs.writeFileSync(result.filePath, content, 'utf-8');
  return { ok: true, filePath: result.filePath };
});

// استيراد نسخة احتياطية عبر نافذة "فتح ملف" حقيقية
ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog(getMainWindow(), {
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths.length) return { ok: false, canceled: true };
  const content = fs.readFileSync(result.filePaths[0], 'utf-8');
  return { ok: true, content };
});

// نسخة أمان من ملف البيانات الحالي قبل أي عملية خطرة (استيراد نسخة / مسح كل البيانات).
// بتتحفظ في مجلد النسخ التلقائية باسم يبدأ بـ before- فمبتتمسحش بالتدوير (حد أقصى 10 نسخ أمان).
ipcMain.handle('data:snapshot', async (event, { label } = {}) => {
  try {
    ensureDirs();
    if (!fs.existsSync(DATA_FILE)) return { ok: true, skipped: true };
    const safe = String(label || 'manual').replace(/[^\w-]/g, '_').slice(0, 30) || 'manual';
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(BACKUPS_DIR, `before-${safe}-${stamp}.json`);
    fs.copyFileSync(DATA_FILE, dest);
    const olds = fs.readdirSync(BACKUPS_DIR).filter(f => /^before-.*\.json$/.test(f)).sort();
    if (olds.length > 10) olds.slice(0, olds.length - 10).forEach(f => { try { fs.unlinkSync(path.join(BACKUPS_DIR, f)); } catch (_e) { /* ignore */ } });
    return { ok: true, path: dest };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
});

ipcMain.handle('backup:getExtraDir', async () => getExtraBackupDir());
ipcMain.handle('backup:pickExtraDir', async () => {
  const result = await dialog.showOpenDialog(getMainWindow(), { title: 'اختر مكان النسخة الاحتياطية الإضافية (فلاشة / مجلد شبكة / OneDrive)', properties: ['openDirectory', 'createDirectory'] });
  if (result.canceled || !result.filePaths.length) return { ok: false, canceled: true };
  const dir = result.filePaths[0];
  try { fs.mkdirSync(dir, { recursive: true }); fs.accessSync(dir, fs.constants.W_OK); } catch (e) { return { ok: false, error: 'المجلد غير قابل للكتابة' }; }
  setExtraBackupDir(dir);
  return { ok: true, path: dir };
});
ipcMain.handle('backup:clearExtraDir', async () => ({ ok: setExtraBackupDir('') }));
// نسخ فوري لملف البيانات الحالي للمكان الإضافي
ipcMain.handle('backup:runNow', async () => {
  try {
    if (!getExtraBackupDir()) return { ok: false, error: 'لم يتم اختيار مكان إضافي' };
    if (!fs.existsSync(DATA_FILE)) return { ok: false, error: 'لا توجد بيانات محفوظة' };
    const n = new Date();
    const stamp = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0') + '_' + String(n.getHours()).padStart(2, '0') + String(n.getMinutes()).padStart(2, '0');
    const tmp = path.join(BACKUPS_DIR, `backup-${stamp}.json`);
    ensureDirs(); fs.copyFileSync(DATA_FILE, tmp);
    const r = copyToExtraBackup(tmp);
    try { fs.unlinkSync(tmp); } catch (_e) { /* ignore */ }
    return r;
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
});
ipcMain.handle('app:lockInfo', async () => __lockInfo);
ipcMain.handle('app:dataPath', async () => DATA_DIR);
ipcMain.handle('app:getDefaultDataPath', async () => APP_CONFIG_DIR);
ipcMain.handle('app:pickDataDir', async () => {
  const result = await dialog.showOpenDialog(getMainWindow(), {
    title: 'اختر مجلد حفظ بيانات البرنامج',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths.length) return { ok: false, canceled: true };
  return { ok: true, path: result.filePaths[0] };
});
ipcMain.handle('app:setDataDir', async (event, { dir, moveData }) => {
  try {
    if (!dir || typeof dir !== 'string') return { ok: false, error: 'مسار غير صالح' };
    const newDir = path.resolve(dir);
    if (!fs.existsSync(newDir)) {
      try { fs.mkdirSync(newDir, { recursive: true }); }
      catch (e) { return { ok: false, error: 'تعذر إنشاء المجلد: ' + e.message }; }
    }
    // اختبار الكتابة
    try {
      const testFile = path.join(newDir, '.write-test');
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
    } catch (e) {
      return { ok: false, error: 'المجلد غير قابل للكتابة. اختر مكانًا آخر.' };
    }

    const oldDir = DATA_DIR;
    const oldData = path.join(oldDir, 'data.json');
    const oldBackups = path.join(oldDir, 'backups-تلقائية');
    const oldAttach = path.join(oldDir, 'attachments');

    if (moveData && oldDir !== newDir) {
      copyFileIfExists(oldData, path.join(newDir, 'data.json'));
      if (fs.existsSync(oldBackups)) copyDirRecursive(oldBackups, path.join(newDir, 'backups-تلقائية'));
      if (fs.existsSync(oldAttach)) copyDirRecursive(oldAttach, path.join(newDir, 'attachments'));
    }

    applyDataDir(newDir);
    saveDataLocationConfig(newDir);
    ensureDirs();
    return { ok: true, path: DATA_DIR };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});
ipcMain.handle('app:resetDataDir', async () => {
  try {
    applyDataDir(APP_CONFIG_DIR);
    saveDataLocationConfig(APP_CONFIG_DIR);
    ensureDirs();
    return { ok: true, path: DATA_DIR };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

checkLockAtStartup();

module.exports = {
  APP_CONFIG_DIR,
  ensureDirs,
  readData,
  writeData,
  copyFileIfExists,
  copyDirRecursive,
  getDataDir: () => DATA_DIR,
  getBackupsDir: () => BACKUPS_DIR,
  getAttachDir: () => ATTACH_DIR
};
