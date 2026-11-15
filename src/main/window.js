// فتح وإدارة نوافذ البرنامج وشريط القوائم وقائمة كليك يمين الماوس، بالإضافة
// إلى دورة حياة التطبيق (فتح/إغلاق) وفحص نتيجة آخر تحديث عند الإقلاع.
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, Menu, ipcMain, dialog, shell, nativeImage } = require('electron');
const { APP_ROOT, setMainWindow } = require('./window-state');
const { ensureDirs } = require('./storage');
const { PRODUCT_NAME } = require('./brand');

function createWindow() {
  const iconPath = path.join(APP_ROOT, process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  let winIcon = undefined;
  try {
    if (fs.existsSync(iconPath)) {
      winIcon = nativeImage.createFromPath(iconPath);
      if (winIcon.isEmpty()) winIcon = undefined;
    }
  } catch (e) { winIcon = undefined; }
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 980,
    minHeight: 600,
    title: PRODUCT_NAME,
    icon: winIcon || (fs.existsSync(iconPath) ? iconPath : undefined),
    webPreferences: {
      preload: path.join(APP_ROOT, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });
  setMainWindow(win);

  // قائمة بسيطة لدعم النسخ/اللصق من لوحة المفاتيح
  const template = [
    {
      label: 'تحرير',
      submenu: [
        { role: 'undo', label: 'تراجع' },
        { role: 'redo', label: 'إعادة' },
        { type: 'separator' },
        { role: 'cut', label: 'قص' },
        { role: 'copy', label: 'نسخ' },
        { role: 'paste', label: 'لصق' },
        { role: 'selectAll', label: 'تحديد الكل' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  // قائمة يمين الماوس: نسخ النص المحدد
  win.webContents.on('context-menu', (event, params) => {
    const menuItems = [];
    if (params.selectionText && params.selectionText.trim()) {
      menuItems.push({ label: 'نسخ', role: 'copy' });
    }
    if (params.isEditable) {
      menuItems.push({ label: 'قص', role: 'cut' });
      menuItems.push({ label: 'لصق', role: 'paste' });
      menuItems.push({ type: 'separator' });
      menuItems.push({ label: 'تحديد الكل', role: 'selectAll' });
    }
    if (!menuItems.length && params.selectionText) {
      menuItems.push({ label: 'نسخ', role: 'copy' });
    }
    if (menuItems.length) {
      Menu.buildFromTemplate(menuItems).popup({ window: win });
    }
  });
  // السماح بالكاميرا للمسح الضوئي / التقاط صورة المرفق
  win.webContents.session.setPermissionRequestHandler((wc, permission, callback) => {
    if (permission === 'media' || permission === 'camera' || permission === 'microphone') callback(true);
    else callback(false);
  });
  win.loadFile(path.join(APP_ROOT, 'renderer', 'index.html'));
  return win;
}

function checkLastUpdateResult() {
  // لو آخر محاولة تحديث فشلت في إعادة فتح البرنامج تلقائيًا (نادر جدًا بعد
  // الإصلاح الأخير)، نوضح للمستخدم اللي حصل بالظبط بدل ما يفضل مش فاهم ليه
  // البرنامج مقفول، بدل ما يفضل صامت ومحدش يعرف ليه
  try {
    const failMarker = path.join(app.getPath('temp'), 'daftar-update-failed.txt');
    const okMarker = path.join(app.getPath('temp'), 'daftar-update-ok.txt');
    const logFile = path.join(app.getPath('temp'), 'daftar-update-log.txt');
    if (fs.existsSync(failMarker)) {
      const info = fs.readFileSync(failMarker, 'utf-8');
      try { fs.unlinkSync(failMarker); } catch (e) {}
      let logExtra = '';
      try { if (fs.existsSync(logFile)) logExtra = '\n\n— السجل —\n' + fs.readFileSync(logFile, 'utf-8').slice(-2000); } catch (e) {}
      dialog.showMessageBox({
        type: 'warning',
        title: 'تعذّر إكمال التحديث',
        message: 'آخر محاولة تحديث لم تكتمل بنجاح.',
        detail: info + logExtra,
        buttons: ['حسنًا']
      });
    } else if (fs.existsSync(okMarker)) {
      try { fs.unlinkSync(okMarker); } catch (e) {}
    }
  } catch (e) {}
}

function initAppLifecycle() {
  app.whenReady().then(() => {
    ensureDirs();
    createWindow();
    checkLastUpdateResult();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

ipcMain.handle('open-external-url', async (event, url) => {
  try {
    const u = String(url || '').trim();
    if (!/^https?:\/\//i.test(u)) return { ok: false, error: 'الرابط لازم يبدأ بـ http:// أو https://' };
    await shell.openExternal(u);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

// الرقم السري يُطلب داخل الواجهة الآمنة فقط (contextIsolation + بدون nodeIntegration)
// لا نفتح نافذة Electron منفصلة — انظر promptPinDialog في renderer
ipcMain.handle('app:askPin', async () => {
  // واجهة احتياطية فقط: المُفضّل أن يستدعي الـ renderer النافذة الداخلية
  return { ok: false, canceled: true, useRenderer: true };
});

module.exports = { createWindow, initAppLifecycle };
