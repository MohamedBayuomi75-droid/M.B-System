// منطق طباعة وحفظ كشوف الحساب والتقارير.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { ipcMain, dialog, shell, BrowserWindow } = require('electron');
const { getMainWindow } = require('./window-state');

ipcMain.handle('pdf:save', async (event, { filename }) => {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { ok: false, error: 'النافذة غير متاحة' };
  }
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: filename || 'مستند.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  let filePath = result.filePath;
  if (!/\.pdf$/i.test(filePath)) filePath += '.pdf';

  try {
    await new Promise(r => setTimeout(r, 400));
    const buffer = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: false,
      displayHeaderFooter: false,
      margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
    });
    if (!buffer || !buffer.length) {
      return { ok: false, error: 'ملف فارغ — تأكد أن المحتوى ظاهر' };
    }
    fs.writeFileSync(filePath, buffer);
    try { shell.openPath(filePath); } catch (_) {}
    return { ok: true, filePath };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
});

/** حفظ PDF من HTML كامل — نافذة مخفية (موثوق لتصدير المستندات) */
ipcMain.handle('pdf:saveHtml', async (event, { html, filename }) => {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { ok: false, error: 'النافذة غير متاحة' };
  }
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: filename || 'المستندات.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  let filePath = result.filePath;
  if (!/\.pdf$/i.test(filePath)) filePath += '.pdf';

  let win = null;
  let tmpFile = null;
  try {
    win = new BrowserWindow({
      show: false,
      width: 900,
      height: 1400,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false
      }
    });
    // كتابة HTML لملف مؤقت لتجنب حدود طول data URL مع الصور
    tmpFile = path.join(require('os').tmpdir(), 'hr-person-export-' + Date.now() + '.html');
    fs.writeFileSync(tmpFile, String(html || ''), 'utf8');
    await win.loadFile(tmpFile);
    await new Promise(r => setTimeout(r, 500));
    try {
      await win.webContents.executeJavaScript(`
        Promise.all(Array.from(document.images||[]).map(img =>
          img.complete ? Promise.resolve() : new Promise(res => {
            img.onload = img.onerror = () => res();
          })
        ))
      `);
    } catch (_) {}
    await new Promise(r => setTimeout(r, 300));

    const buffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: false,
      displayHeaderFooter: false,
      margins: { top: 0.45, bottom: 0.45, left: 0.45, right: 0.45 }
    });
    if (!buffer || !buffer.length) {
      return { ok: false, error: 'ملف PDF فارغ' };
    }
    fs.writeFileSync(filePath, buffer);
    try { shell.openPath(filePath); } catch (_) {}
    return { ok: true, filePath };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  } finally {
    try { if (win && !win.isDestroyed()) win.destroy(); } catch (_) {}
    try { if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (_) {}
  }
});

module.exports = {};
