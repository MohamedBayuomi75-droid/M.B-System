// معالجة ملفات المرفقات الخاصة بالأشخاص والمعدات (اختيار/فتح/حذف/حفظ من Base64)
// والمسح الضوئي عبر WIA على ويندوز (Scanner).
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app, ipcMain, dialog, shell } = require('electron');
const { getMainWindow } = require('./window-state');
const { ensureDirs, getAttachDir } = require('./storage');

/** اسم مجلد آمن لكل شخص/معدة (يمنع الخروج من مجلد المرفقات بـ .. أو فواصل مسار) */
function safeFolderName(id) {
  const n = String(id == null || id === '' ? 'tmp' : id).replace(/[^\p{L}\p{N}_.-]/gu, '_').replace(/^\.+/, '_').slice(0, 80);
  return n || 'tmp';
}

/** مسار المرفق الفعلي: لو المسار المحفوظ قديم (بعد نقل مجلد البيانات) بندوّر على نفس الملف في مجلد المرفقات الحالي */
function resolveAttachmentPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return '';
  try {
    if (fs.existsSync(filePath)) return filePath;
    const alt = path.join(getAttachDir(), path.basename(path.dirname(filePath)), path.basename(filePath));
    if (fs.existsSync(alt)) return alt;
  } catch (_e) { /* ignore */ }
  return '';
}

/** هل المسار داخل مجلد المرفقات (لمنع حذف ملفات خارجه) */
function isInsideAttachDir(full) {
  try {
    const root = path.resolve(getAttachDir()) + path.sep;
    return path.resolve(full).toLowerCase().startsWith(root.toLowerCase());
  } catch (_e) { return false; }
}

// إرفاق ملفات (نسخ إلى مجلد attachments الخاص بالتطبيق — مجلد فرعي لكل شخص/معدة)
ipcMain.handle('attachment:pick', async (event, { ownerId, preferredName }) => {
  ensureDirs();
  const result = await dialog.showOpenDialog(getMainWindow(), {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'صور ومستندات', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'bmp'] },
      { name: 'الكل', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePaths.length) return { ok: false, canceled: true };
  const invDir = path.join(getAttachDir(), safeFolderName(ownerId));
  if (!fs.existsSync(invDir)) fs.mkdirSync(invDir, { recursive: true });
  const preferredBase = String(preferredName || '').trim().replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  const saved = [];
  let idx = 0;
  for (const src of result.filePaths) {
    idx++;
    const base = path.basename(src);
    const ext = path.extname(base) || '';
    let displayName = base;
    let destName;
    if (preferredBase) {
      const suffix = idx > 1 ? ('_' + idx) : '';
      displayName = preferredBase + suffix + ext;
      destName = preferredBase + suffix + ext;
      // تجنب التصادم
      if (fs.existsSync(path.join(invDir, destName))) {
        destName = preferredBase + suffix + '_' + Date.now().toString(36) + ext;
      }
    } else {
      const safe = base.replace(/[<>:"/\\|?*]/g, '_');
      destName = Date.now().toString(36) + '-' + safe;
    }
    const dest = path.join(invDir, destName);
    fs.copyFileSync(src, dest);
    saved.push({
      id: 'att_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: displayName,
      storedName: destName,
      path: dest,
      type: ext.toLowerCase().replace('.', ''),
      addedAt: new Date().toISOString()
    });
  }
  return { ok: true, files: saved };
});

ipcMain.handle('attachment:open', async (event, { filePath }) => {
  const real = resolveAttachmentPath(filePath);
  if (!real) return { ok: false, error: 'الملف غير موجود' };
  const err = await shell.openPath(real);
  return err ? { ok: false, error: err } : { ok: true };
});

ipcMain.handle('attachment:delete', async (event, { filePath }) => {
  try {
    const real = resolveAttachmentPath(filePath);
    // نمسح فقط الملفات اللي جوه مجلد مرفقات البرنامج — أي مسار تاني نتجاهله
    if (real && isInsideAttachDir(real)) fs.unlinkSync(real);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

// حفظ مرفق من بيانات Base64 (بعد المسح/الكاميرا)
ipcMain.handle('attachment:saveBuffer', async (event, { ownerId, fileName, base64, mime, preferredName }) => {
  try {
    ensureDirs();
    const invDir = path.join(getAttachDir(), safeFolderName(ownerId));
    if (!fs.existsSync(invDir)) fs.mkdirSync(invDir, { recursive: true });
    const extFromName = fileName && path.extname(fileName);
    const extFromMime = mime && String(mime).includes('png') ? '.png' : (mime && String(mime).includes('pdf') ? '.pdf' : '.jpg');
    const ext = extFromName || extFromMime;
    const preferredBase = String(preferredName || '').trim().replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
    let displayName;
    let destName;
    if (preferredBase) {
      displayName = preferredBase + (preferredBase.toLowerCase().endsWith(ext.toLowerCase()) ? '' : ext);
      destName = displayName;
      if (fs.existsSync(path.join(invDir, destName))) {
        const baseNoExt = preferredBase.replace(/\.[^.]+$/, '');
        destName = baseNoExt + '_' + Date.now().toString(36) + ext;
        displayName = destName;
      }
    } else {
      const safeBase = (fileName || ('scan-' + Date.now())).replace(/[<>:"/\\|?*]/g, '_');
      displayName = safeBase.endsWith(ext) ? safeBase : safeBase + ext;
      destName = Date.now().toString(36) + '-' + displayName;
    }
    const dest = path.join(invDir, destName);
    const b64 = String(base64 || '').replace(/^data:[^;]+;base64,/, '');
    fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
    return {
      ok: true,
      file: {
        id: 'att_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: displayName,
        storedName: destName,
        path: dest,
        type: ext.toLowerCase().replace('.', ''),
        addedAt: new Date().toISOString()
      }
    };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

// مسح ضوئي عبر WIA على ويندوز → يرجع مسار صورة مؤقتة
ipcMain.handle('scan:windows', async () => {
  if (process.platform !== 'win32') {
    return { ok: false, error: 'المسح التلقائي متاح على ويندوز فقط. استخدم الكاميرا أو اختيار ملف.' };
  }
  ensureDirs();
  const outPath = path.join(app.getPath('temp'), 'mb-scan-' + Date.now() + '.bmp');
  const outEscaped = outPath.replace(/'/g, "''");
  // سكربت PowerShell يستخدم Windows Image Acquisition (WIA)
  const psScript = `
$ErrorActionPreference = 'Stop'
try {
  $deviceManager = New-Object -ComObject WIA.DeviceManager
  if ($deviceManager.DeviceInfos.Count -lt 1) {
    Write-Output 'NO_SCANNER'
    exit 2
  }
  $device = $null
  foreach ($info in $deviceManager.DeviceInfos) {
    if ($info.Type -eq 1 -or $info.Type -eq 2) { $device = $info.Connect(); break }
  }
  if (-not $device) { $device = $deviceManager.DeviceInfos.Item(1).Connect() }
  $item = $device.Items.Item(1)
  try {
    foreach ($prop in $item.Properties) {
      if ($prop.PropertyID -eq 6147) { $prop.Value = 200 }
      if ($prop.PropertyID -eq 6148) { $prop.Value = 200 }
    }
  } catch {}
  $image = $item.Transfer()
  $out = '${outEscaped.replace(/\\/g, '\\\\')}'
  $image.SaveFile($out)
  if (Test-Path -LiteralPath $out) { Write-Output $out; exit 0 }
  Write-Output 'SAVE_FAILED'
  exit 3
} catch {
  Write-Output ('ERR:' + $_.Exception.Message)
  exit 1
}
`
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
      windowsHide: true,
      timeout: 180000,
      maxBuffer: 4 * 1024 * 1024
    }, (err, stdout, stderr) => {
      const lines = String(stdout || '').trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const out = lines[lines.length - 1] || '';
      if (out === 'NO_SCANNER' || lines.includes('NO_SCANNER')) {
        resolve({ ok: false, error: 'لم يتم العثور على ماسح ضوئي متصل. تأكد أن الماسح موصول ومشغّل، أو افتح تطبيق مسح ويندوز.' });
        return;
      }
      if (out.startsWith('ERR:') || lines.some(l => l.startsWith('ERR:'))) {
        const errLine = lines.find(l => l.startsWith('ERR:')) || out;
        resolve({ ok: false, error: errLine.slice(4) || 'فشل المسح' });
        return;
      }
      const filePath = (out && fs.existsSync(out)) ? out : (fs.existsSync(outPath) ? outPath : '');
      if (filePath) {
        try {
          const buf = fs.readFileSync(filePath);
          const base64 = 'data:image/bmp;base64,' + buf.toString('base64');
          resolve({ ok: true, path: filePath, base64, fileName: path.basename(filePath) });
        } catch (e) {
          resolve({ ok: false, error: String(e) });
        }
        return;
      }
      resolve({ ok: false, error: (err && err.message) || String(stderr || '').trim() || 'تعذر إكمال المسح. جرّب «فتح تطبيق مسح ويندوز» ثم اختر الملف المحفوظ.' });
    });
  });
});

ipcMain.handle('scan:openWindowsScanApp', async () => {
  if (process.platform !== 'win32') return { ok: false };
  try {
    // فتح تطبيق Windows Scan إن وُجد
    shell.openExternal('ms-windows-scan:');
    return { ok: true };
  } catch (e) {
    try {
      shell.openPath('wiaacmgr');
      return { ok: true };
    } catch (e2) {
      return { ok: false, error: String(e2) };
    }
  }
});





/** تنظيف مرفقات يتيمة + مؤقتات — مع احترام قائمة الملفات المحمية */
ipcMain.handle('storage:cleanupOrphans', async (event, payload = {}) => {
  ensureDirs();
  const referenced = new Set();
  const addPath = (p) => {
    if (!p || typeof p !== 'string') return;
    try {
      referenced.add(path.normalize(p));
      referenced.add(path.basename(p));
      // بدون امتداد أيضاً
      const base = path.basename(p);
      referenced.add(base);
      const noExt = base.replace(/\.[^.]+$/, '');
      if (noExt) referenced.add(noExt);
    } catch (_) {}
  };
  (payload.referencedPaths || []).forEach(addPath);

  const attachRoot = getAttachDir();
  let removedFiles = 0, removedDirs = 0, freedBytes = 0, scanned = 0;
  const removedNames = [];

  function isProtected(full) {
    const norm = path.normalize(full);
    const base = path.basename(full);
    if (referenced.has(norm) || referenced.has(full) || referenced.has(base)) return true;
    // حماية أي مسار داخل مجلد يطابق id موجود في referenced كاسم مجلد
    const parts = norm.split(path.sep);
    for (const part of parts) {
      if (part && referenced.has(part)) return true;
    }
    return false;
  }

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
        try {
          const left = fs.readdirSync(full);
          if (!left.length) { fs.rmdirSync(full); removedDirs++; }
        } catch (_) {}
      } else if (ent.isFile()) {
        scanned++;
        try {
          const st = fs.statSync(full);
          const ageOk = (Date.now() - st.mtimeMs) > 120000;
          if (!isProtected(full) && ageOk) {
            freedBytes += st.size || 0;
            fs.unlinkSync(full);
            removedFiles++;
            if (removedNames.length < 40) removedNames.push(ent.name);
          }
        } catch (_) {}
      }
    }
  }
  walk(attachRoot);

  let tempRemoved = 0;
  try {
    const tmp = app.getPath('temp');
    for (const name of fs.readdirSync(tmp)) {
      if (!/^mb-scan-/i.test(name) && !/^hr-.*\.(tmp|partial)$/i.test(name)) continue;
      const full = path.join(tmp, name);
      try {
        const st = fs.statSync(full);
        if (st.isFile() && (Date.now() - st.mtimeMs) > 60000) {
          fs.unlinkSync(full); tempRemoved++; freedBytes += st.size || 0;
        }
      } catch (_) {}
    }
  } catch (_) {}

  try {
    const { getDataDir } = require('./storage');
    const dataDir = typeof getDataDir === 'function' ? getDataDir() : path.dirname(attachRoot);
    for (const name of fs.readdirSync(dataDir)) {
      if (!/\.tmp$/i.test(name)) continue;
      const full = path.join(dataDir, name);
      try {
        const st = fs.statSync(full);
        if (st.isFile() && (Date.now() - st.mtimeMs) > 300000) {
          fs.unlinkSync(full); tempRemoved++; freedBytes += st.size || 0;
        }
      } catch (_) {}
    }
  } catch (_) {}

  return { ok: true, scanned, removedFiles, removedDirs, tempRemoved, freedBytes, removedNames };
});


// قراءة مرفق كـ data URL لتضمينه في ملف الطباعة
ipcMain.handle('attachment:readDataUrl', async (event, filePath) => {
  try {
    const real = resolveAttachmentPath(filePath);
    if (!real) return { ok: false, error: 'الملف غير موجود: ' + String(filePath || '') };
    filePath = real;
    const buf = fs.readFileSync(filePath);
    if (buf.length > 15 * 1024 * 1024) return { ok: false, error: 'الملف كبير جداً للتضمين' };
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
      '.pdf': 'application/pdf', '.txt': 'text/plain', '.jfif': 'image/jpeg',
      '.tif': 'image/tiff', '.tiff': 'image/tiff'
    };
    let mime = mimeMap[ext] || '';
    // اكتشاف النوع من محتوى الملف إن لم يوجد امتداد
    if (!mime && buf.length >= 4) {
      if (buf[0] === 0xFF && buf[1] === 0xD8) mime = 'image/jpeg';
      else if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) mime = 'image/png';
      else if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) mime = 'image/gif';
      else if (buf[0] === 0x42 && buf[1] === 0x4D) mime = 'image/bmp';
      else if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) mime = 'application/pdf';
      else if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) mime = 'image/webp';
    }
    if (!mime) mime = 'application/octet-stream';
    return { ok: true, dataUrl: 'data:' + mime + ';base64,' + buf.toString('base64'), mime };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
});

module.exports = { safeFolderName, resolveAttachmentPath, isInsideAttachDir };
