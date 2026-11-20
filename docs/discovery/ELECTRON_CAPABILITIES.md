# مصفوفة قدرات Electron (خطة v1.4.5 — المرحلة 3)

> **مولَّد** بـ `node tools/discovery/build-electron-capabilities.js`. ماتعدّلش الملف باليد.
> **المصادر:** `docs/web/desktop-api-inventory.json` (الدوال في `preload.js` ومراجعها والبديل المقترح)، و`web/web-api.js` (البديل **الفعلي** في نسخة الويب)، و`src/main/*.js`.
> **القاعدة** (`03` §8): أي قدرة ديسكتوب ليها بديل مُثبت في الويب أو قرار صريح إنها مالهاش لازمة. الحالة هنا محسوبة من الكود، ومش من التوثيق.

## 1. الملخص
| الحالة | العدد |
|---|---|
| ✅ متنفّذ | 10 |
| 🟡 جزئي | 2 |
| ⏳ مؤجّل (موديول المرفقات) | 7 |
| 🔁 السيرفر بيعملها | 3 |
| ➖ مالهاش لازمة في الويب | 20 |
| ❌ مش موجود في الويب | 0 |
| **الإجمالي** | **42** |

## 2. الدوال (`window.desktopApi`)
| ID | الدالة | قناة IPC | مراجع في الواجهة | الفئة | البديل المقترح | الحالة في الويب | ملاحظة |
|---|---|---|---|---|---|---|---|
| LEG-0299 | `askPin` | `app:askPin` | 0 | auth | يتراجع: صلاحيات السيرفر بدل PIN | ➖ مالهاش لازمة في الويب | بترجع «مش متاحة في نسخة الويب» |
| LEG-0300 | `backupNow` | `backup:runNow` | 7 | backup | POST /api/backups | 🔁 السيرفر بيعملها | النسخ الاحتياطي على السيرفر (المرحلة 2) |
| LEG-0301 | `cleanupOrphans` | `storage:cleanupOrphans` | 2 | attach | POST /api/admin/attachments/cleanup (dry-run) | ⏳ مؤجّل (موديول المرفقات) | بترجع «المرفقات هتتفعّل قريبًا» |
| LEG-0302 | `clearExtraBackupDir` | `backup:clearExtraDir` | 2 | remove | لا ينطبق | ➖ مالهاش لازمة في الويب | بترجع «مش متاحة في نسخة الويب» |
| LEG-0303 | `deleteAttachment` | `attachment:delete` | 23 | attach | DELETE /api/attachments/:id | ✅ متنفّذ |  |
| LEG-0304 | `exportArchive` | `archive:export` | 6 | pdf | POST /api/archive (ZIP stream) | ⏳ مؤجّل (موديول المرفقات) | بترجع «المرفقات هتتفعّل قريبًا» |
| LEG-0305 | `exportExcel` | `excel:export` | 3 | browser | xlsx في المتصفح | ✅ متنفّذ |  |
| LEG-0306 | `getAppVersion` | `app:getVersion` | 3 | data | GET /api/health (version) | ✅ متنفّذ |  |
| LEG-0307 | `getDataPath` | `app:dataPath` | 4 | remove | لا ينطبق | ➖ مالهاش لازمة في الويب | السيرفر هو المرجع (رد ثابت) |
| LEG-0308 | `getDefaultDataPath` | `app:getDefaultDataPath` | 0 | remove | لا ينطبق | ➖ مالهاش لازمة في الويب | السيرفر هو المرجع (رد ثابت) |
| LEG-0309 | `getExtraBackupDir` | `backup:getExtraDir` | 2 | remove | لا ينطبق (النسخ على السيرفر) | ➖ مالهاش لازمة في الويب | السيرفر هو المرجع (رد ثابت) |
| LEG-0310 | `getLockInfo` | `app:lockInfo` | 2 | remove | لا ينطبق (السيرفر هو القفل) | ➖ مالهاش لازمة في الويب | السيرفر هو المرجع (رد ثابت) |
| LEG-0311 | `hashPassword` | `auth:hashPassword` | 2 | auth | POST /api/users (السيرفر يشفّر) | ➖ مالهاش لازمة في الويب | السيرفر هو المرجع (رد ثابت) |
| LEG-0312 | `importExcel` | `excel:import` | 3 | browser | xlsx في المتصفح | ✅ متنفّذ |  |
| LEG-0313 | `inspectUpdate` | `app:inspectUpdate` | 2 | remove | لا ينطبق | ➖ مالهاش لازمة في الويب | بترجع «مش متاحة في نسخة الويب» |
| LEG-0314 | `loadData` | `data:load` | 3 | data | GET /api/bootstrap | ✅ متنفّذ |  |
| LEG-0315 | `openAttachment` | `attachment:open` | 19 | attach | GET /api/attachments/:id (signed URL) | ⏳ مؤجّل (موديول المرفقات) | بترجع «المرفقات هتتفعّل قريبًا» |
| LEG-0316 | `openExternalLink` | `open-external-url` | 4 | browser | window.open | ✅ متنفّذ |  |
| LEG-0317 | `openFile` | `file:open` | 4 | browser | <input type=file> | ✅ متنفّذ |  |
| LEG-0318 | `openWindowsScanApp` | `scan:openWindowsScanApp` | 2 | remove | لا ينطبق | ➖ مالهاش لازمة في الويب | بترجع «مش متاحة في نسخة الويب» |
| LEG-0319 | `pickAttachments` | `attachment:pick` | 21 | attach | input file + POST /api/attachments | ⏳ مؤجّل (موديول المرفقات) | بترجع «المرفقات هتتفعّل قريبًا» |
| LEG-0320 | `pickDataDir` | `app:pickDataDir` | 2 | remove | لا ينطبق | ➖ مالهاش لازمة في الويب | بترجع «مش متاحة في نسخة الويب» |
| LEG-0321 | `pickExtraBackupDir` | `backup:pickExtraDir` | 2 | remove | لا ينطبق | ➖ مالهاش لازمة في الويب | بترجع «مش متاحة في نسخة الويب» |
| LEG-0322 | `pickInstaller` | `app:pickInstaller` | 2 | remove | لا updater في الويب | ➖ مالهاش لازمة في الويب | بترجع «مش متاحة في نسخة الويب» |
| LEG-0323 | `readAttachmentDataUrl` | `attachment:readDataUrl` | 2 | attach | GET /api/attachments/:id | ⏳ مؤجّل (موديول المرفقات) | بترجع «المرفقات هتتفعّل قريبًا» |
| LEG-0324 | `resetDataDir` | `app:resetDataDir` | 2 | remove | لا ينطبق | ➖ مالهاش لازمة في الويب | بترجع «مش متاحة في نسخة الويب» |
| LEG-0325 | `runInstaller` | `app:runInstaller` | 1 | remove | لا ينطبق | ➖ مالهاش لازمة في الويب | بترجع «مش متاحة في نسخة الويب» |
| LEG-0326 | `safetyBackup` | **مش معرّفة في preload** | 2 | backup | POST /api/backups (سبب) | 🔁 السيرفر بيعملها | النسخ الاحتياطي على السيرفر (المرحلة 2) |
| LEG-0327 | `saveAttachmentBuffer` | `attachment:saveBuffer` | 2 | attach | POST /api/attachments | ⏳ مؤجّل (موديول المرفقات) | بترجع «المرفقات هتتفعّل قريبًا» |
| LEG-0328 | `saveData` | `data:save` | 4 | data | POST /api/sync (diff) | ✅ متنفّذ |  |
| LEG-0329 | `saveDataSync` | `data:saveSync` | 4 | data | fetch keepalive / sendBeacon → /api/sync | ✅ متنفّذ |  |
| LEG-0330 | `saveFile` | `file:save` | 5 | browser | Blob + download | ✅ متنفّذ |  |
| LEG-0331 | `savePdf` | `pdf:save` | 3 | pdf | POST /api/pdf | 🟡 جزئي | نافذة الطباعة ← «حفظ كـ PDF» (مش PDF عربي على السيرفر) |
| LEG-0332 | `savePdfHtml` | `pdf:saveHtml` | 4 | pdf | POST /api/pdf | 🟡 جزئي | نافذة الطباعة ← «حفظ كـ PDF» (مش PDF عربي على السيرفر) |
| LEG-0333 | `scanAttachment` | **مش معرّفة في preload** | 2 | attach | كاميرا / رفع PDF | ⏳ مؤجّل (موديول المرفقات) | بترجع «المرفقات هتتفعّل قريبًا» |
| LEG-0334 | `scanWindows` | `scan:windows` | 6 | attach | كاميرا / رفع PDF | ➖ مالهاش لازمة في الويب | بترجع «مش متاحة في نسخة الويب» |
| LEG-0335 | `serverStart` | `server:start` | 6 | remove | وضع الشبكة القديم يتلغى | ➖ مالهاش لازمة في الويب | بترجع «مش متاحة في نسخة الويب» |
| LEG-0336 | `serverStatus` | `server:status` | 2 | remove | يتلغى | ➖ مالهاش لازمة في الويب | السيرفر هو المرجع (رد ثابت) |
| LEG-0337 | `serverStop` | `server:stop` | 4 | remove | يتلغى | ➖ مالهاش لازمة في الويب | بترجع «مش متاحة في نسخة الويب» |
| LEG-0338 | `setDataDir` | `app:setDataDir` | 2 | remove | لا ينطبق | ➖ مالهاش لازمة في الويب | بترجع «مش متاحة في نسخة الويب» |
| LEG-0339 | `snapshotData` | `data:snapshot` | 8 | backup | POST /api/backups (أدمن) | 🔁 السيرفر بيعملها | النسخ الاحتياطي على السيرفر (المرحلة 2) |
| LEG-0340 | `verifyPassword` | `auth:verifyPassword` | 2 | auth | POST /api/auth/login | ➖ مالهاش لازمة في الويب | السيرفر هو المرجع (رد ثابت) |

## 3. التكامل مع نظام التشغيل في الـ main process
| الملف | معالجات IPC | فتح ملفات (`shell`) | حوارات ملفات | طباعة/PDF | ماسح WIA |
|---|---|---|---|---|---|
| `src/main/archive.js` | 1 | أيوه | أيوه | — | — |
| `src/main/attachments.js` | 8 | أيوه | أيوه | — | أيوه |
| `src/main/auth.js` | 2 | — | — | — | — |
| `src/main/excel.js` | 2 | — | أيوه | — | — |
| `src/main/pdf.js` | 2 | أيوه | أيوه | أيوه | — |
| `src/main/server.js` | 3 | — | — | — | — |
| `src/main/storage.js` | 16 | — | أيوه | — | — |
| `src/main/updater.js` | 4 | — | أيوه | — | — |
| `src/main/window.js` | 2 | أيوه | أيوه | — | — |

## 4. الفجوات المهمة (مقترحات للمراحل الجاية)
| القدرة | الوضع | المقترح | القرار/المرحلة |
|---|---|---|---|
| المرفقات (اختيار، فتح، حذف، معاينة، حفظ من الماسح) | مؤجّلة في الواجهة القديمة على الويب. السيرفر عنده `/api/attachments` بالفحص والإصدارات، والواجهة الجديدة فيها لوحة مرفقات | ربط الواجهة القديمة بـ `/api/attachments` أو نقل الشاشات. **ملفات PDF المشفّرة: B-78 (أ)** | المرحلة 5/7 + B-78 |
| PDF عربي | الويب بيستخدم نافذة طباعة المتصفح | PDF على السيرفر بنفس شكل الطباعة الحالية | مرحلة التقارير (11) |
| تصدير الأرشيف (ZIP) | مؤجّل | تصدير ZIP من السيرفر | مع المرفقات |
| الماسح الضوئي (WIA) | ويندوز بس، **مالوش بديل في المتصفح** | رفع ملف من الماسح (تطبيق الماسح ← ملف ← رفع)، أو أداة صغيرة على الجهاز لو لازم | **قرار مطلوب** (مقترح `DEC`) |
| مجلد البيانات، المحدّث، القفل، وضع الشبكة القديم | مالهمش لازمة في الويب (السيرفر هو المرجع) | يفضلوا في نسخة الديسكتوب لحد إيقافها (المرحلة 14) | — |
