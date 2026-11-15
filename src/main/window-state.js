// حالة مشتركة صغيرة: مرجع نافذة البرنامج الرئيسية + مسار جذر التطبيق.
// موجودة في ملف منفصل بدون أي اعتمادات عشان بقية وحدات src/main/
// (storage, window, excel, pdf, attachments, server, updater, archive)
// تقدر توصل لنفس النافذة من غير ما تعمل require دائري فيما بينها.
const path = require('path');

// جذر تطبيق Electron (حيث main.js الأصلي، preload.js، مجلد renderer، vendor...)
// نحسبها هنا مرة واحدة بدل ما كل ملف تحت src/main/ يحسب المسار النسبي بنفسه.
const APP_ROOT = path.join(__dirname, '..', '..');

let mainWindow = null;

function setMainWindow(win) {
  mainWindow = win;
}

function getMainWindow() {
  return mainWindow;
}

module.exports = { APP_ROOT, setMainWindow, getMainWindow };
