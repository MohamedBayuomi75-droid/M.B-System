const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApi', {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),
  // حفظ متزامن يُستخدم فقط لحظة إغلاق النافذة، لضمان عدم فقد آخر تعديل
  // لو المستخدم قفل البرنامج قبل ما الحفظ المؤجل العادي (280ms) يتم فعلياً
  saveDataSync: (data) => ipcRenderer.sendSync('data:saveSync', data),
  // وضع الشبكة (تعدد المستخدمين/الأجهزة) — اختياري بالكامل
  serverStart: (port) => ipcRenderer.invoke('server:start', { port }),
  serverStop: () => ipcRenderer.invoke('server:stop'),
  serverStatus: () => ipcRenderer.invoke('server:status'),
  openExternalLink: (url) => ipcRenderer.invoke('open-external-url', url),
  saveFile: (filename, content) => ipcRenderer.invoke('file:save', { filename, content }),
  snapshotData: (label) => ipcRenderer.invoke('data:snapshot', { label }),
  getExtraBackupDir: () => ipcRenderer.invoke('backup:getExtraDir'),
  pickExtraBackupDir: () => ipcRenderer.invoke('backup:pickExtraDir'),
  clearExtraBackupDir: () => ipcRenderer.invoke('backup:clearExtraDir'),
  backupNow: () => ipcRenderer.invoke('backup:runNow'),
  getLockInfo: () => ipcRenderer.invoke('app:lockInfo'),
  savePdf: (payload) => ipcRenderer.invoke('pdf:save', payload),
  savePdfHtml: (payload) => ipcRenderer.invoke('pdf:saveHtml', payload),
  openFile: () => ipcRenderer.invoke('file:open'),
  getDataPath: () => ipcRenderer.invoke('app:dataPath'),
  getDefaultDataPath: () => ipcRenderer.invoke('app:getDefaultDataPath'),
  pickDataDir: () => ipcRenderer.invoke('app:pickDataDir'),
  setDataDir: (dir, moveData) => ipcRenderer.invoke('app:setDataDir', { dir, moveData }),
  resetDataDir: () => ipcRenderer.invoke('app:resetDataDir'),
  importExcel: () => ipcRenderer.invoke('excel:import'),
  exportExcel: (payload) => ipcRenderer.invoke('excel:export', payload),
  pickAttachments: (ownerId, preferredName) => ipcRenderer.invoke('attachment:pick', { ownerId, preferredName: preferredName || '' }),
  openAttachment: (filePath) => ipcRenderer.invoke('attachment:open', { filePath }),
  readAttachmentDataUrl: (filePath) => ipcRenderer.invoke('attachment:readDataUrl', filePath),
  deleteAttachment: (filePath) => ipcRenderer.invoke('attachment:delete', { filePath }),
  cleanupOrphans: (payload) => ipcRenderer.invoke('storage:cleanupOrphans', payload || {}),
  saveAttachmentBuffer: (ownerId, fileName, base64, mime, preferredName) => ipcRenderer.invoke('attachment:saveBuffer', { ownerId, fileName, base64, mime, preferredName: preferredName || '' }),
  scanWindows: () => ipcRenderer.invoke('scan:windows'),
  openWindowsScanApp: () => ipcRenderer.invoke('scan:openWindowsScanApp'),
  askPin: (opts) => ipcRenderer.invoke('app:askPin', opts),
  pickInstaller: () => ipcRenderer.invoke('app:pickInstaller'),
  runInstaller: (filePath) => ipcRenderer.invoke('app:runInstaller', filePath),
  inspectUpdate: (filePath) => ipcRenderer.invoke('app:inspectUpdate', filePath),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  exportArchive: (payload) => ipcRenderer.invoke('archive:export', payload),
  // التحقق المحلي من كلمات المرور (scrypt في العملية الرئيسية)
  hashPassword: (password) => ipcRenderer.invoke('auth:hashPassword', password),
  verifyPassword: (password, salt, hash) => ipcRenderer.invoke('auth:verifyPassword', { password, salt, hash })
});
