# جرد desktopApi (مولَّد آليًا — `npm run inventory`)

- مُعرَّفة في `preload.js`: **40** دالة
- مستخدمة في `renderer/`: **40** اسم، **181** مرجع
- ⚠️ مستخدمة ومش مُعرَّفة في preload (بتتجاهَل بصمت بشرط `if(desktopApi.x)`): `scanAttachment`، `safetyBackup`
- مُعرَّفة ومش مستخدمة بالاسم المباشر: `getDefaultDataPath`، `askPin`

| الدالة | المعاملات | IPC | مراجع | الملفات | فئة الويب | البديل المقترح في الويب |
|---|---|---|---|---|---|---|
| `askPin` | `opts` | `app:askPin` | 0 | — | auth | يتراجع: صلاحيات السيرفر بدل PIN |
| `backupNow` | `` | `backup:runNow` | 7 | core/pages-backup.js×3<br>modules/ledger/glue.js×4 | backup | POST /api/backups |
| `cleanupOrphans` | `payload` | `storage:cleanupOrphans` | 2 | core/helpers.js×2 | attach | POST /api/admin/attachments/cleanup (dry-run) |
| `clearExtraBackupDir` | `` | `backup:clearExtraDir` | 2 | core/pages-backup.js×2 | remove | لا ينطبق |
| `deleteAttachment` | `filePath` | `attachment:delete` | 23 | core/helpers.js×2<br>core/pages-archive.js×6<br>modules/clients/project-path.js×2<br>modules/ledger/app.js×1<br>modules/ledger/modals.js×4<br>modules/ledger/pages-archive.js×8 | attach | DELETE /api/attachments/:id |
| `exportArchive` | `payload` | `archive:export` | 6 | core/helpers.js×2<br>modules/ledger/pages-archive.js×4 | pdf | POST /api/archive (ZIP stream) |
| `exportExcel` | `payload` | `excel:export` | 3 | core/helpers.js×2<br>modules/ledger/helpers.js×1 | browser | xlsx في المتصفح |
| `getAppVersion` | `` | `app:getVersion` | 3 | core/network.js×1<br>core/pages-backup.js×2 | data | GET /api/health (version) |
| `getDataPath` | `` | `app:dataPath` | 4 | core/pages-backup.js×4 | remove | لا ينطبق |
| `getDefaultDataPath` | `` | `app:getDefaultDataPath` | 0 | — | remove | لا ينطبق |
| `getExtraBackupDir` | `` | `backup:getExtraDir` | 2 | core/pages-backup.js×2 | remove | لا ينطبق (النسخ على السيرفر) |
| `getLockInfo` | `` | `app:lockInfo` | 2 | core/app.js×2 | remove | لا ينطبق (السيرفر هو القفل) |
| `hashPassword` | `password` | `auth:hashPassword` | 2 | core/network.js×2 | auth | POST /api/users (السيرفر يشفّر) |
| `importExcel` | `` | `excel:import` | 3 | core/excel-import.js×2<br>modules/ledger/excel-import.js×1 | browser | xlsx في المتصفح |
| `inspectUpdate` | `filePath` | `app:inspectUpdate` | 2 | core/pages-backup.js×2 | remove | لا ينطبق |
| `loadData` | `` | `data:load` | 3 | core/app.js×1<br>core/data-store.js×2 | data | GET /api/bootstrap |
| `openAttachment` | `filePath` | `attachment:open` | 19 | core/helpers.js×2<br>core/pages-archive.js×4<br>modules/clients/attachments.js×2<br>modules/ledger/app.js×1<br>modules/ledger/modals.js×5<br>modules/ledger/pages-archive.js×5 | attach | GET /api/attachments/:id (signed URL) |
| `openExternalLink` | `url` | `open-external-url` | 4 | modules/ledger/modals.js×4 | browser | window.open |
| `openFile` | `` | `file:open` | 4 | core/pages-backup.js×2<br>modules/clients/helpers.js×2 | browser | <input type=file> |
| `openWindowsScanApp` | `` | `scan:openWindowsScanApp` | 2 | core/modals-common.js×1<br>modules/ledger/modals.js×1 | remove | لا ينطبق |
| `pickAttachments` | `ownerId, preferredName` | `attachment:pick` | 21 | core/helpers.js×8<br>core/pages-archive.js×2<br>modules/clients/attachments.js×3<br>modules/hr/pages-ops.js×2<br>modules/ledger/pages-archive.js×6 | attach | input file + POST /api/attachments |
| `pickDataDir` | `` | `app:pickDataDir` | 2 | core/pages-backup.js×2 | remove | لا ينطبق |
| `pickExtraBackupDir` | `` | `backup:pickExtraDir` | 2 | core/pages-backup.js×2 | remove | لا ينطبق |
| `pickInstaller` | `` | `app:pickInstaller` | 2 | core/pages-backup.js×2 | remove | لا updater في الويب |
| `readAttachmentDataUrl` | `filePath` | `attachment:readDataUrl` | 2 | core/helpers.js×2 | attach | GET /api/attachments/:id |
| `resetDataDir` | `` | `app:resetDataDir` | 2 | core/pages-backup.js×2 | remove | لا ينطبق |
| `runInstaller` | `filePath` | `app:runInstaller` | 1 | core/pages-backup.js×1 | remove | لا ينطبق |
| `safetyBackup` | — | **غير موجودة** | 2 | modules/ledger/helpers.js×2 | backup | POST /api/backups (سبب) |
| `saveAttachmentBuffer` | `ownerId, fileName, base64, mime, preferredName` | `attachment:saveBuffer` | 2 | core/modals-common.js×1<br>modules/ledger/modals.js×1 | attach | POST /api/attachments |
| `saveData` | `data` | `data:save` | 4 | core/data-store.js×4 | data | POST /api/sync (diff) |
| `saveDataSync` | `data` | `data:saveSync` (sync) | 4 | core/data-store.js×2<br>core/network.js×2 | data | fetch keepalive / sendBeacon → /api/sync |
| `saveFile` | `filename, content` | `file:save` | 5 | core/helpers.js×2<br>core/pages-backup.js×2<br>modules/ledger/helpers.js×1 | browser | Blob + download |
| `savePdf` | `payload` | `pdf:save` | 3 | core/helpers.js×2<br>modules/ledger/helpers.js×1 | pdf | POST /api/pdf |
| `savePdfHtml` | `payload` | `pdf:saveHtml` | 4 | core/helpers.js×4 | pdf | POST /api/pdf |
| `scanAttachment` | — | **غير موجودة** | 2 | core/helpers.js×2 | attach | كاميرا / رفع PDF |
| `scanWindows` | `` | `scan:windows` | 6 | core/helpers.js×2<br>core/modals-common.js×1<br>modules/hr/pages-ops.js×2<br>modules/ledger/modals.js×1 | attach | كاميرا / رفع PDF |
| `serverStart` | `port` | `server:start` | 6 | core/network.js×4<br>core/pages-backup.js×2 | remove | وضع الشبكة القديم يتلغى |
| `serverStatus` | `` | `server:status` | 2 | core/pages-backup.js×2 | remove | يتلغى |
| `serverStop` | `` | `server:stop` | 4 | core/network.js×2<br>core/pages-backup.js×2 | remove | يتلغى |
| `setDataDir` | `dir, moveData` | `app:setDataDir` | 2 | core/pages-backup.js×2 | remove | لا ينطبق |
| `snapshotData` | `label` | `data:snapshot` | 8 | core/pages-backup.js×4<br>core/project-links.js×2<br>modules/clients/helpers.js×2 | backup | POST /api/backups (أدمن) |
| `verifyPassword` | `password, salt, hash` | `auth:verifyPassword` | 2 | core/network.js×2 | auth | POST /api/auth/login |

**مفتاح الفئات:** data = طبقة البيانات (A3/A4) · auth = A2 · attach = A5 · pdf/backup = A6 · browser = بديل في المتصفح بدون سيرفر · remove = تتشال من نسخة الويب.
