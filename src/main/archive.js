// ========== تصدير أرشيف منظم ==========
const path = require('path');
const fs = require('fs');
const { ipcMain, dialog, shell } = require('electron');
const { getMainWindow } = require('./window-state');

ipcMain.handle('archive:export', async (event, payload) => {
  try {
    const items = Array.isArray(payload) ? payload : [];
    if (!items.length) return { ok: false, error: 'لا توجد ملفات' };
    const result = await dialog.showOpenDialog(getMainWindow(), {
      title: 'اختر مجلد حفظ الأرشيف المنظم',
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths.length) return { ok: false, canceled: true };
    const baseDir = result.filePaths[0];
    const _n = new Date();
    const stamp = _n.getFullYear() + '-' + String(_n.getMonth() + 1).padStart(2, '0') + '-' + String(_n.getDate()).padStart(2, '0');
    const root = path.join(baseDir, 'ارشيف-الموارد-البشرية-' + stamp);
    fs.mkdirSync(root, { recursive: true });
    let copied = 0, skipped = 0;
    for (const it of items) {
      try {
        const src = it.path;
        if (!src || !fs.existsSync(src)) { skipped++; continue; }
        let rel = String(it.relative || path.basename(src)).replace(/\\/g, path.sep);
        // منع الخروج من المجلد
        rel = rel.split(path.sep).filter(p => p && p !== '..').join(path.sep);
        const dest = path.join(root, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        // تجنب الكتابة فوق ملف بنفس الاسم
        let finalDest = dest;
        if (fs.existsSync(finalDest)) {
          const ext = path.extname(dest);
          const base = path.basename(dest, ext);
          finalDest = path.join(path.dirname(dest), base + '_' + Date.now().toString(36) + ext);
        }
        fs.copyFileSync(src, finalDest);
        copied++;
      } catch (e) {
        skipped++;
      }
    }
    try { shell.openPath(root); } catch (e) {}
    return { ok: true, copied, skipped, dir: root };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

module.exports = {};
