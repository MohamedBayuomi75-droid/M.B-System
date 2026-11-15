// تشفير والتحقق من كلمات المرور (scrypt) — مصدر واحد يستخدمه السيرفر المحلي (server.js)
// والتحقق المحلي في وضع الجهاز الواحد (auth.js). ممنوع تغيير الخوارزمية: الحسابات المخزنة بتعتمد عليها.
const crypto = require('crypto');

// حد أقصى لطول كلمة المرور اللي بنعالجها (حماية من إدخال ضخم)
const MAX_PASSWORD_LENGTH = 256;
function normalize(password) { return String(password == null ? '' : password).slice(0, MAX_PASSWORD_LENGTH); }

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(normalize(password), salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  try {
    if (!salt || !hash) return false;
    const check = crypto.scryptSync(normalize(password), String(salt), 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(String(hash), 'hex'));
  } catch (e) { return false; }
}

// كلمات المرور الافتراضية المعروفة — ممنوع استخدامها كلمة مرور فعلية
const DEFAULT_PASSWORDS = ['admin123', '123456'];
const MIN_PASSWORD_LENGTH = 8;

// بترجّع نص الخطأ (بالعربي) أو '' لو كلمة المرور مقبولة
function passwordPolicyError(password) {
  const p = String(password == null ? '' : password);
  if (p.length < MIN_PASSWORD_LENGTH) return 'كلمة المرور لازم ' + MIN_PASSWORD_LENGTH + ' أحرف على الأقل';
  if (p.length > 128) return 'كلمة المرور طويلة جداً';
  if (DEFAULT_PASSWORDS.indexOf(p.toLowerCase()) >= 0) return 'كلمة المرور دي معروفة (افتراضية) — اختار كلمة مختلفة';
  return '';
}

module.exports = { hashPassword, verifyPassword, passwordPolicyError, DEFAULT_PASSWORDS, MIN_PASSWORD_LENGTH };
