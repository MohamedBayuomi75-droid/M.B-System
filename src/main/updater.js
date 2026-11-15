// ========== تحديث يدوي آمن (exe أو zip) ==========
const path = require('path');
const fs = require('fs');
const { app, ipcMain, dialog } = require('electron');
const { APP_ROOT, getMainWindow } = require('./window-state');
const { PACKAGE_NAME, PRODUCT_NAME } = require('./brand');

const UPDATE_NAME_HINTS = [
  'daftar', 'mawredin', 'ledger', 'mb-daftar', 'mb_daftar',
  'nizam', 'mawarid', 'bashariya', 'hr-system', 'hr_system', 'mb-hr', 'mb_hr',
  'nizam-al-mawarid', 'nizam_al_mawarid',
  'unified', 'muwahhad', 'موحد',
  'دفتر', 'موردين', 'موارد', 'بشري'
];

function getAppInstallDir() {
  // مجلد ملفات البرنامج فقط — لا يمس userData (البيانات)
  if (app.isPackaged) {
    // electron-builder مع asar:false: resources/app
    const appDir = path.join(process.resourcesPath, 'app');
    if (fs.existsSync(path.join(appDir, 'main.js'))) return appDir;
    // بعض التركيبات تضع الملفات مباشرة تحت resources
    if (fs.existsSync(path.join(process.resourcesPath, 'main.js'))) return process.resourcesPath;
    // احتياطي: مجلد الـ exe
    const exeDir = path.dirname(process.execPath);
    if (fs.existsSync(path.join(exeDir, 'resources', 'app', 'main.js'))) {
      return path.join(exeDir, 'resources', 'app');
    }
    return exeDir;
  }
  return APP_ROOT;
}

function getRelaunchPath() {
  if (app.isPackaged) return process.execPath;
  return process.execPath;
}

function looksLikeOurUpdateName(filePath) {
  const base = path.basename(filePath || '').toLowerCase();
  return UPDATE_NAME_HINTS.some(h => base.includes(h.toLowerCase()));
}

function findUpdateRoot(dir) {
  const candidates = [
    dir,
    path.join(dir, 'ledger-app'),
    path.join(dir, 'ledger-desktop-app'),
    path.join(dir, 'hr-app'),
    path.join(dir, 'hr-system-app'),
    path.join(dir, 'nizam-hr'),
    path.join(dir, 'app'),
    path.join(dir, 'resources', 'app')
  ];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(e => {
      if (e.isDirectory()) {
        candidates.push(path.join(dir, e.name));
        candidates.push(path.join(dir, e.name, 'ledger-app'));
        candidates.push(path.join(dir, e.name, 'hr-app'));
        candidates.push(path.join(dir, e.name, 'app'));
      }
    });
  } catch (e) {}
  for (const c of candidates) {
    try {
      const pkgPath = path.join(c, 'package.json');
      const mainPath = path.join(c, 'main.js');
      if (fs.existsSync(pkgPath) && fs.existsSync(mainPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const name = String(pkg.name || '').toLowerCase();
        const product = String(pkg.productName || '');
        const appId = String((pkg.build && pkg.build.appId) || pkg.appId || '').toLowerCase();
        const okName =
          name.includes('daftar') ||
          name.includes('mawredin') ||
          name.includes('ledger') ||
          name.includes('nizam') ||
          name.includes('mawarid') ||
          name.includes('bashariya') ||
          name.includes('hr') ||
          product.includes('موردين') ||
          product.includes('دفتر') ||
          product.includes('موارد') ||
          product.includes('بشري') ||
          appId.includes('daftar') ||
          appId.includes('nizam') ||
          appId.includes('nizam-hr') ||
          appId.includes('mawarid');
        // أي حزمة تحتوي main.js + package.json لهذا المشروع
        // حماية: لا نقبل إلا حزمة تحمل نفس الاسم التقني للبرنامج الموحّد،
        // حتى لا يُستبدل البرنامج الموحّد بنسخة قديمة من الموارد البشرية أو دفتر الموردين.
        const isOurPackage = String(pkg.name || '') === PACKAGE_NAME;
        if (isOurPackage && (okName || fs.existsSync(path.join(c, 'renderer', 'index.html')))) return { root: c, pkg };
      }
    } catch (e) {}
  }
  return null;
}

async function extractZipToTemp(zipPath) {
  const tmp = path.join(app.getPath('temp'), 'hr-update-' + Date.now());
  fs.mkdirSync(tmp, { recursive: true });
  await new Promise((resolve, reject) => {
    const ps = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}' -Force`;
    const { spawn } = require('child_process');
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], { windowsHide: true });
    let err = '';
    child.stderr.on('data', d => { err += d.toString(); });
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(err || ('Expand-Archive failed: ' + code)));
    });
  });
  return tmp;
}

/**
 * تحديث zip قوي:
 * 1) يكتب سكربت PowerShell على القرص (UTF-8 BOM) عشان المسارات العربية
 * 2) يستنى خروج عملية البرنامج بالكامل
 * 3) ينسخ بـ robocopy مع إعادة محاولة
 * 4) يتحقق إن package.json / main.js اتحدّثوا
 * 5) يعيد تشغيل الـ exe
 */
function runZipUpdateAndRelaunch({ sourceDir, targetDir, relaunchPath, backupDir }) {
  const { spawn } = require('child_process');
  const logFile = path.join(app.getPath('temp'), 'daftar-update-log.txt');
  const scriptPath = path.join(app.getPath('temp'), 'daftar-do-update.ps1');
  const failMarker = path.join(app.getPath('temp'), 'daftar-update-failed.txt');
  const okMarker = path.join(app.getPath('temp'), 'daftar-update-ok.txt');
  const exeBase = path.basename(relaunchPath, path.extname(relaunchPath));
  const esc = (s) => String(s).replace(/'/g, "''");

  const psBody = `
$ErrorActionPreference = 'Continue'
$log = '${esc(logFile)}'
$fail = '${esc(failMarker)}'
$ok = '${esc(okMarker)}'
$src = '${esc(sourceDir)}'
$dst = '${esc(targetDir)}'
$bak = '${esc(backupDir)}'
$rp = '${esc(relaunchPath)}'
$exeName = '${esc(path.basename(relaunchPath))}'
$procBase = '${esc(exeBase)}'

function Log($m) { $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'; Add-Content -LiteralPath $log -Value "[$ts] $m" -Encoding UTF8 }

try {
  if (Test-Path -LiteralPath $ok) { Remove-Item -LiteralPath $ok -Force -ErrorAction SilentlyContinue }
  if (Test-Path -LiteralPath $fail) { Remove-Item -LiteralPath $fail -Force -ErrorAction SilentlyContinue }
  '' | Set-Content -LiteralPath $log -Encoding UTF8
  Log "start update"
  Log "src=$src"
  Log "dst=$dst"
  Log "relaunch=$rp"

  # انتظر خروج البرنامج (حتى 30 ثانية)
  for ($i = 0; $i -lt 30; $i++) {
    $running = Get-Process -Name $procBase -ErrorAction SilentlyContinue
    if (-not $running) { break }
    Log "waiting for process exit ($i)..."
    Start-Sleep -Seconds 1
  }
  Start-Sleep -Seconds 2

  if (!(Test-Path -LiteralPath $src)) { throw "source missing: $src" }
  if (!(Test-Path -LiteralPath $dst)) { New-Item -ItemType Directory -Path $dst -Force | Out-Null }

  # نسخة احتياطية
  try {
    if (!(Test-Path -LiteralPath $bak)) { New-Item -ItemType Directory -Path $bak -Force | Out-Null }
    robocopy $dst $bak /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
    Log "backup done"
  } catch { Log "backup warn: $_" }

  # نسخ الملفات مع إعادة محاولة
  $rc = 0
  for ($attempt = 1; $attempt -le 5; $attempt++) {
    Log "robocopy attempt $attempt"
    & robocopy $src $dst /E /XO /NFL /NDL /NJH /NJS /nc /ns /np /R:3 /W:2
    $rc = $LASTEXITCODE
    Log "robocopy exit=$rc"
    # robocopy: 0-7 success-ish, >=8 failure
    if ($rc -lt 8) { break }
    Start-Sleep -Seconds 2
  }
  if ($rc -ge 8) { throw "robocopy failed code $rc" }

  # تحقق إن الملفات وصلت
  $mainJs = Join-Path $dst 'main.js'
  $pkgJs = Join-Path $dst 'package.json'
  if (!(Test-Path -LiteralPath $mainJs)) { throw "main.js missing after copy in $dst" }
  if (!(Test-Path -LiteralPath $pkgJs)) { throw "package.json missing after copy in $dst" }
  Log "files verified"

  # إيجاد ملف التشغيل
  if (!(Test-Path -LiteralPath $rp)) {
    $found = Get-ChildItem -LiteralPath (Split-Path $dst -Parent) -Filter $exeName -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $rp = $found.FullName; Log "found exe at $rp" }
  }
  if (!(Test-Path -LiteralPath $rp)) {
    $parent = Split-Path $dst -Parent
    $parent2 = Split-Path $parent -Parent
    foreach ($root in @($parent2, $parent, $dst)) {
      if (-not $root) { continue }
      $found2 = Get-ChildItem -LiteralPath $root -Filter '*.exe' -ErrorAction SilentlyContinue | Where-Object { $_.Name -notmatch 'Uninstall|Update|Setup' } | Select-Object -First 1
      if ($found2) { $rp = $found2.FullName; Log "fallback exe $rp"; break }
    }
  }

  'ok' | Set-Content -LiteralPath $ok -Encoding UTF8
  Log "starting $rp"
  if (Test-Path -LiteralPath $rp) {
    Start-Process -FilePath $rp
  } else {
    throw "cannot find relaunch exe"
  }
  Log "done"
} catch {
  $msg = "$_"
  Log "FAIL $msg"
  $msg | Set-Content -LiteralPath $fail -Encoding UTF8
}
`.trim();

  // اكتب السكربت بـ UTF-8 BOM
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
  fs.writeFileSync(scriptPath, Buffer.concat([bom, Buffer.from(psBody, 'utf8')]));

  spawn('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-WindowStyle', 'Hidden',
    '-File', scriptPath
  ], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  }).unref();
}

ipcMain.handle('app:pickInstaller', async () => {
  const result = await dialog.showOpenDialog(getMainWindow(), {
    title: 'اختر ملف التحديث (Setup.exe أو zip)',
    properties: ['openFile'],
    filters: [
      { name: 'ملفات التحديث', extensions: ['exe', 'zip'] },
      { name: 'مثبت Windows', extensions: ['exe'] },
      { name: 'أرشيف ZIP', extensions: ['zip'] },
      { name: 'الكل', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePaths.length) return { ok: false, canceled: true };
  const filePath = result.filePaths[0];
  const ext = path.extname(filePath).toLowerCase();
  return {
    ok: true,
    path: filePath,
    ext,
    name: path.basename(filePath),
    nameLooksValid: looksLikeOurUpdateName(filePath)
  };
});

ipcMain.handle('app:runInstaller', async (event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { ok: false, error: 'الملف غير موجود' };
    }
    const ext = path.extname(filePath).toLowerCase();
    const base = path.basename(filePath);

    // تحقق مرن من اسم الملف (نسمح بـ Setup / HR / zip بعد تأكيد المستخدم)
    const baseLower = base.toLowerCase();
    const softNameOk =
      looksLikeOurUpdateName(filePath) ||
      baseLower.includes('setup') ||
      baseLower.includes('install') ||
      baseLower.includes('hr') ||
      baseLower.includes('nizam') ||
      baseLower.includes('mawarid') ||
      ext === '.zip';
    if (!softNameOk) {
      return {
        ok: false,
        error: 'الملف المختار لا يبدو تحديثًا لبرنامج «' + PRODUCT_NAME + '».\nاختر ملف Setup (مثل Unified-System-Setup-....exe) أو ملف zip للتحديث.\n\nالملف: ' + base
      };
    }

    // ----- EXE: تشغيل المثبت فقط، من غير أي محاولة إعادة فتح يدوية منا -----
    // إعدادات NSIS الحالية للبرنامج (oneClick + runAfterFinish) بالفعل بتخلي
    // المثبت نفسه يفتح البرنامج تلقائيًا بعد ما يخلص — وده أضمن وأدق بكتير من
    // أي تخمين لمسار إعادة التشغيل من عندنا (المثبت هو اللي عارف فعليًا وين
    // بيركّب البرنامج). محاولتنا القديمة لفتح مسار مُخمَّن كانت بتتعارض مع
    // فتح المثبت التلقائي وتحاول تفتح نسخة قديمة/غلط، وده سبب رسالة
    // "Windows cannot find" اللي بتظهر.
    if (ext === '.exe') {
      const { spawn } = require('child_process');
      spawn(filePath, [], { detached: true, stdio: 'ignore', windowsHide: false }).unref();
      setTimeout(() => {
        try { app.quit(); } catch (e) {}
      }, 1200);
      return {
        ok: true,
        mode: 'exe',
        message: 'تم تشغيل المثبت. سيتم إغلاق البرنامج الآن، وسيفتح المثبت البرنامج تلقائيًا بعد انتهاء التثبيت مباشرة.\nالبيانات محفوظة ولن تُمس.'
      };
    }

    // ----- ZIP: فك الضغط + التحقق + استبدال الملفات -----
    if (ext === '.zip') {
      let tmpDir;
      try {
        tmpDir = await extractZipToTemp(filePath);
      } catch (e) {
        return { ok: false, error: 'تعذر فك ضغط ملف zip: ' + String(e.message || e) };
      }
      const found = findUpdateRoot(tmpDir);
      if (!found) {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
        return {
          ok: false,
          error: 'ملف zip لا يحتوي على نسخة صالحة من برنامج ' + PRODUCT_NAME + ' (main.js + package.json).'
        };
      }
      const updateVersion = String((found.pkg && found.pkg.version) || '').trim() || null;
      const currentVersion = (() => { try { return app.getVersion(); } catch (e) { return null; } })();
      // تحذير فقط لو نفس الإصدار (نسمح بالتثبيت لإصلاح ملفات تالفة)
      let versionNote = '';
      if (updateVersion && currentVersion) {
        if (updateVersion === currentVersion) {
          versionNote = ' (نفس الإصدار الحالي ' + currentVersion + ' — سيتم استبدال الملفات)';
        } else {
          versionNote = ' (من ' + currentVersion + ' → ' + updateVersion + ')';
        }
      } else if (updateVersion) {
        versionNote = ' (الإصدار الجديد: ' + updateVersion + ')';
      }
      const targetDir = getAppInstallDir();
      // مسار إعادة التشغيل
      let relaunchPath = process.execPath;
      if (!app.isPackaged) {
        // في وضع التطوير: ننسخ الملفات مباشرة ثم نطلب إعادة التشغيل يدويًا
        try {
          const copyRecursive = (src, dest) => {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            for (const name of fs.readdirSync(src)) {
              if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
              const s = path.join(src, name);
              const d = path.join(dest, name);
              const st = fs.statSync(s);
              if (st.isDirectory()) copyRecursive(s, d);
              else fs.copyFileSync(s, d);
            }
          };
          copyRecursive(found.root, targetDir);
          try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
          // إعادة تشغيل تلقائية بدل ما نطلب من المستخدم يقفل ويفتح بنفسه
          setTimeout(() => {
            try { app.relaunch(); app.exit(0); } catch (e) {}
          }, 800);
          return {
            ok: true,
            mode: 'zip-dev',
            version: updateVersion,
            currentVersion,
            message: 'تم تحديث ملفات البرنامج' + versionNote + '. سيُعاد تشغيله تلقائيًا الآن...'
          };
        } catch (e) {
          return { ok: false, error: 'تعذر نسخ ملفات التحديث: ' + String(e.message || e) };
        }
      }
      // وضع التثبيت: سكربت خارجي ينتظر إغلاق البرنامج ثم ينسخ ويعيد التشغيل
      const backupDir = path.join(app.getPath('temp'), 'daftar-backup-' + Date.now());
      const installDir = targetDir;
      // سجّل المسارات للمراجعة
      try {
        fs.writeFileSync(
          path.join(app.getPath('temp'), 'daftar-update-planned.txt'),
          JSON.stringify({
            source: found.root,
            target: installDir,
            relaunch: getRelaunchPath(),
            version: updateVersion,
            current: currentVersion,
            at: new Date().toISOString()
          }, null, 2),
          'utf8'
        );
      } catch (e) {}
      runZipUpdateAndRelaunch({
        sourceDir: found.root,
        targetDir: installDir,
        relaunchPath: getRelaunchPath(),
        backupDir
      });
      // أغلق بقوة بعد ما السكربت اتطلق
      setTimeout(() => {
        try { app.exit(0); } catch (e) {
          try { app.quit(); } catch (e2) {}
        }
      }, 600);
      return {
        ok: true,
        mode: 'zip',
        version: updateVersion,
        currentVersion,
        message: 'جاري تطبيق التحديث' + versionNote + '. سيتم إغلاق البرنامج ثم إعادة فتحه تلقائيًا بعد نسخ الملفات.'
      };
    }

    return { ok: false, error: 'نوع الملف غير مدعوم. استخدم .exe أو .zip فقط.' };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

// فحص ملف تحديث (zip) بدون تطبيقه — يعرض الإصدار والمحتوى
ipcMain.handle('app:inspectUpdate', async (event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return { ok: false, error: 'الملف غير موجود' };
    const ext = path.extname(filePath).toLowerCase();
    const base = path.basename(filePath);
    const nameLooksValid = looksLikeOurUpdateName(filePath);
    if (ext === '.exe') {
      return {
        ok: true,
        type: 'exe',
        name: base,
        nameLooksValid,
        currentVersion: app.getVersion(),
        message: nameLooksValid
          ? 'ملف مثبت Windows — سيتم تشغيله وسيغلق البرنامج مؤقتاً'
          : 'تحذير: اسم الملف لا يشبه تحديث ' + PRODUCT_NAME
      };
    }
    if (ext !== '.zip') return { ok: false, error: 'نوع الملف غير مدعوم' };
    let tmpDir;
    try {
      tmpDir = await extractZipToTemp(filePath);
    } catch (e) {
      return { ok: false, error: 'تعذر فك ضغط zip: ' + String(e.message || e) };
    }
    const found = findUpdateRoot(tmpDir);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
    if (!found) {
      return { ok: false, error: 'الملف لا يحتوي على نسخة صالحة من البرنامج' };
    }
    const updateVersion = String((found.pkg && found.pkg.version) || '').trim() || null;
    const product = String((found.pkg && (found.pkg.productName || found.pkg.name)) || '');
    return {
      ok: true,
      type: 'zip',
      name: base,
      nameLooksValid,
      version: updateVersion,
      product,
      currentVersion: app.getVersion(),
      sameVersion: !!(updateVersion && updateVersion === app.getVersion())
    };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

ipcMain.handle('app:getVersion', async () => {
  try {
    return { ok: true, version: app.getVersion(), packaged: app.isPackaged };
  } catch (e) {
    return { ok: false, version: '1.0.0', packaged: false };
  }
});

module.exports = {};
