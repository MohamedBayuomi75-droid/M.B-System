// قنوات IPC للتحقق المحلي من كلمات المرور (وضع الجهاز الواحد).
// الواجهة ما بتحسبش أي hash بنفسها: التشفير كله هنا في العملية الرئيسية بـ scrypt.
const { ipcMain } = require('electron');
const { hashPassword, verifyPassword } = require('./password');

// -> { salt, hash }
ipcMain.handle('auth:hashPassword', async (event, password) => hashPassword(password));

// payload: { password, salt, hash } -> true/false
ipcMain.handle('auth:verifyPassword', async (event, payload) => {
  const p = payload || {};
  return verifyPassword(p.password, p.salt, p.hash);
});
