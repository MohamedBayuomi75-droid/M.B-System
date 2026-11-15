// هوية البرنامج في العملية الرئيسية (main process) — مصدر واحد للاسم
// الاسم يُقرأ من package.json حتى لا يتكرر في أكثر من مكان.
const pkg = require('../../package.json');

// الاسم التقني الثابت للحزمة: يستخدمه المحدّث للتأكد إن ملف التحديث
// تابع لهذا البرنامج الموحّد وليس لبرنامج قديم (موارد بشرية / دفتر موردين).
const PACKAGE_NAME = 'unified-system';
const PRODUCT_NAME = String(pkg.productName || 'النظام الموحد');

module.exports = { PACKAGE_NAME, PRODUCT_NAME };
