// يكتب docs/FEATURE_INVENTORY.md من docs/audit/*.json (الحصر الثابت + الزحف الفعلي)
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const inv = require(path.join(ROOT, 'docs/audit/feature-inventory.json'));
const load = (f) => { try { return require(path.join(ROOT, 'docs/audit', f)); } catch (e) { return null; } };
const crawlReal = load('page-crawl-file-real.json'), crawlEmpty = load('page-crawl-file-empty.json'), crawlWeb = load('page-crawl-web-real.json');
const byKey = (c) => Object.fromEntries(((c && c.pages) || []).map((p) => [p.key, p]));
const R = byKey(crawlReal), E = byKey(crawlEmpty), W = byKey(crawlWeb);
const S = { ok: '✅ موجودة وتعمل وتم التحقق منها', unv: '🟡 موجودة لكن لم يتم التحقق منها', part: '🟠 موجودة جزئيًا', none: '❌ غير موجودة', unclear: '❓ غير واضحة وتحتاج قرارًا' };
const DETAIL = new Set(['employeeDetail', 'personDetail']);

let md = `# حصر وظائف النظام الحالي (Feature Inventory)

> **مولَّد آليًا** من الكود والتشغيل الفعلي (القسم 3 مكتوب يدويًا جوه السكربت) — \`node tools/audit/feature-inventory.js && node tools/audit/crawl-pages.js && node tools/audit/render-inventory.js\`.
> المرجع: «النظام الموحد» v1.3.53 (\`renderer/\`) — ده «البرنامج الأصلي» اللي الخطة الرئيسية بتطلب عدم فقد أي وظيفة منه.

## قواعد الحالة (والدليل المطلوب لكل حالة)
| الحالة | معناها هنا | الدليل |
|---|---|---|
| ${S.ok} | الصفحة بتترسم من غير أخطاء JS بالبيانات الحقيقية **و** فيه اختبار آلي في \`tests-merge/\` بيشغّل عملياتها وبيعدي | عمود «رسم» + عمود «اختبارات» |
| ${S.unv} | موجودة في الكود وبتترسم من غير أخطاء، لكن **مفيش اختبار آلي لعملياتها** (إضافة/تعديل/حذف/طباعة) | عمود «رسم» بس |
| ${S.part} | جزء منها شغال وجزء لأ (مذكور) | — |
| ${S.none} | مطلوبة في الخطة الرئيسية ومش موجودة في البرنامج | بحث في الكود |
| ${S.unclear} | محتاجة قرار من صاحب المشروع | — |

**مهم:** «رسم ✔» معناه إن الصفحة فتحت وعرضت محتوى من غير أخطاء — **مش** إن كل زرار فيها اتجرّب. العمليات اللي ماعليهاش اختبار آلي محتاجة اختبار قبول يدوي أو آلي قبل ما تتنقل لأي واجهة جديدة.

## الأرقام الإجمالية
| | |
|---|---|
| ملفات الواجهة | ${inv.totals.files} ملف، ${inv.totals.lines.toLocaleString('en')} سطر، ${inv.totals.functions} دالة |
| الأقسام في التنقل | ${inv.sections.length} |
| الصفحات | ${inv.totals.navPages} في التنقل + ${inv.totals.pages - inv.totals.navPages} مفاتيح تانية (تفاصيل/أسماء قديمة/إعدادات) = ${inv.totals.pages} |
| النوافذ (modals) | ${inv.totals.modals} دالة \`open…Modal\` |
| الأزرار المعرّفة بـ id | ${inv.totals.buttonsWithId} |
| دوال الحسابات (بالاسم) | ${inv.totals.calcFns} |
| ملفات الاختبار | ${inv.totals.testFiles} (781 assertion) |
| الزحف الفعلي | ${crawlReal ? crawlReal.pages.length + ' صفحة بالبيانات الحقيقية — ' + crawlReal.jsErrors.length + ' خطأ JS' : 'لم يُشغَّل'}${crawlWeb ? ' · نسخة الويب: ' + crawlWeb.pages.length + ' صفحة — ' + crawlWeb.jsErrors.length + ' خطأ' : ''} |

---

## 1) الصفحات (حسب أقسام التنقل)

`;
const row = (p) => {
  const r = R[p.key] || E[p.key];
  const rendered = r && !r.threw && !r.jsErrors && (r.textLen >= 50 || DETAIL.has(p.key));
  const web = W[p.key] ? (W[p.key].jsErrors || W[p.key].threw ? '✖' : '✔') : '—';
  let status = !p.renderFn ? S.none : DETAIL.has(p.key) ? S.unv : rendered && p.tests.length ? S.ok : rendered ? S.unv : S.part;
  const note = p.aliasOf ? `اسم قديم → \`${p.aliasOf}\`` : DETAIL.has(p.key) ? 'محتاجة اختيار شخص (مش بتتفتح لوحدها)' : '';
  const draw = r ? `${rendered ? '✔' : '✖'} ${r.buttons} زرار · ${r.tables} جدول · ${r.rows} صف` : '—';
  return `| \`${p.key}\` | ${p.label || '—'} | ${p.definedAt ? '`' + p.renderFn + '` — ' + p.definedAt.replace('renderer/', '') : '—'} | ${draw} | ${web} | ${p.tests.length ? p.tests.map((t) => t.replace('.js', '')).join(', ') : '—'} | ${status}${note ? ' — ' + note : ''} |`;
};
const head = '| المفتاح | الاسم | دالة الرسم — الملف:السطر | رسم (بيانات حقيقية) | ويب | اختبارات | الحالة |\n|---|---|---|---|---|---|---|\n';
for (const s of inv.sections) {
  md += `### ${s.label}\n${head}${s.pages.map((k) => row(inv.pages.find((p) => p.key === k))).join('\n')}\n\n`;
}
const navKeys = new Set(inv.sections.flatMap((s) => s.pages));
md += `### مفاتيح خارج التنقل (تفاصيل، أسماء قديمة، صفحات اتدمجت)\n${head}${inv.pages.filter((p) => !navKeys.has(p.key)).map(row).join('\n')}\n\n`;
const st = inv.pages.map((p) => row(p).split('|').slice(-2)[0]);
md += `**الملخص:** ${st.filter((x) => x.includes('✅')).length} صفحة متحقق منها (رسم + اختبار) · ${st.filter((x) => x.includes('🟡')).length} بتترسم ومن غير اختبار لعملياتها · ${st.filter((x) => x.includes('🟠') || x.includes('❌')).length} ناقصة.\n\n---\n\n`;

md += `## 2) الوظائف لكل ملف (نوافذ · أزرار · حفظ/حذف · تصدير/طباعة · حسابات · مرفقات)

> الحالة لكل اللي في القسم ده: ${S.unv} **إلا** لو الملف مذكور في اختبار في القسم 1 — الاختبارات بتغطي سيناريوهات محددة مش كل زرار.

`;
const order = Object.keys(inv.perFile).sort();
for (const f of order) {
  const x = inv.perFile[f];
  if (!x.modals.length && !x.buttons.length && !x.calcs.length && !x.pages.length && !x.saves.length) continue;
  const c = x.calls;
  md += `### \`${f.replace('renderer/', '')}\` — ${x.lines} سطر، ${x.functions} دالة\n`;
  if (x.pages.length) md += `- **صفحات:** ${x.pages.map((n) => '`' + n + '`').join('، ')}\n`;
  if (x.modals.length) md += `- **نوافذ (${x.modals.length}):** ${x.modals.map((n) => '`' + n + '`').join('، ')}\n`;
  if (x.saves.length) md += `- **عمليات (${x.saves.length}):** ${x.saves.map((n) => '`' + n + '`').join('، ')}\n`;
  if (x.calcs.length) md += `- **حسابات/ملخصات (${x.calcs.length}):** ${x.calcs.map((n) => '`' + n + '`').join('، ')}\n`;
  if (x.exportsFns.length) md += `- **دوال تصدير/طباعة:** ${x.exportsFns.map((n) => '`' + n + '`').join('، ')}\n`;
  const io = [['Excel تصدير', c.exportExcel], ['Excel استيراد', c.importExcel], ['PDF', c.savePdf + c.savePdfHtml], ['طباعة', c.windowPrint], ['حفظ ملف', c.saveFile], ['تصدير أرشيف', c.exportArchive], ['مرفقات: اختيار', c.pickAttachments], ['مرفقات: فتح', c.openAttachment], ['مرفقات: حذف', c.deleteAttachment]].filter(([, n]) => n).map(([l, n]) => `${l}×${n}`);
  if (io.length) md += `- **تصدير/مرفقات:** ${io.join(' · ')}\n`;
  md += `- **مؤشرات:** saveData×${c.saveData} · سجل تدقيق×${c.addAudit} · تأكيد حذف×${c.confirmDelete} · فحص صلاحية×${c.hasPagePermission}\n`;
  if (x.buttons.length) md += `- **أزرار (${x.buttons.length}):** ${x.buttons.map((b) => '`' + b.id + '`' + (b.label ? ' «' + b.label.slice(0, 40) + '»' : '')).join(' · ')}\n`;
  md += '\n';
}
md += `---

## 3) موديولات الخطة الرئيسية (ERP_System_Master_Implementation_Plan §3) مقابل الموجود فعلًا

> الدليل: بحث نصي في \`renderer/\` عن المصطلحات العربية والإنجليزية لكل موديول + قراءة الملفات المذكورة.

| # | موديول الخطة | الحالة | الموجود فعلًا (الدليل) | الناقص عن الخطة |
|---|---|---|---|---|
| 1 | Dashboard | ${S.ok} | مركز المتابعة \`dashboard\` + \`core/follow-center.js\` + \`alerts-center.js\` | — |
| 2 | HR | ${S.ok} | موظفين، حضور، إجازات، تقييم أداء، أقسام (\`modules/hr/\`) | — |
| 3 | Employees & Labor | ${S.ok} | عمال، مشرفين، سائقين، يوميات، مستحقات، نقل موارد | دورة اعتماد للصرف (مراجعة ← اعتماد ← صرف) مش موجودة كحالات |
| 4 | Projects | ${S.ok} | \`projects\` + مسار المشروع بخطوات (\`clients/project-workflow.js\`, \`project-path.js\`) + \`core/cost-center.js\` (ملخص تكلفة المشروع) | «مراكز تكلفة» ككيان مستقل · «أعضاء المشروع» كجدول |
| 5 | Clients | ${S.ok} | عملاء، CRM، حسابات عملاء، تحصيلات | — |
| 6 | Suppliers | ${S.ok} | موردين، فواتير، مرتجعات، دفعات، إشعارات خصم، كشف حساب (\`modules/ledger/\`) | — |
| 7 | Accounting & Ledger | ${S.part} | دفتر موردين + مصاريف + تكاليف + إيرادات + حسابات عملاء + تقارير حسابات | **مفيش محاسبة قيد مزدوج**: لا دليل حسابات (Accounts) ولا قيود يومية (Journal Entries/Lines) ولا ميزان مراجعة |
| 8 | Warehouses | ${S.part} | أصناف، مخازن، حركات، جرد (\`modules/warehouses/\` — 560 سطر) | تصنيفات أصناف · منع صرف غير المتاح موجود في الواجهة بس (\`pages-home.js:321\`) مش على السيرفر · ربط بالمشتريات |
| 9 | Procurement | ${S.none} | 0 نتيجة لـ «طلب شراء / أمر شراء / purchaseOrder» | الموديول كله: طلب شراء ← اعتماد ← أمر شراء ← استلام ← فاتورة |
| 10 | Equipment | ${S.ok} | معدات، يوميات تشغيل، صيانة، وقود، تراخيص، تخصيص لمشروع | — |
| 11 | Safety & Risks | ${S.none} | مفيش صفحات/بيانات للسلامة أو المخاطر | الموديول كله |
| 12 | Quality & Handover | ${S.none} | «استلام ابتدائي/نهائي» بتظهر كخطوات في مسار المشروع بس | موديول جودة/فحوصات/محاضر استلام |
| 13 | Contracts & BOQ | ${S.ok} | عقود، مقايسات، أعمال حصر، مستخلصات، ضمانات، **أوامر تغيير** (\`clients/change-orders.js\`) | — |
| 14 | Documents & Archive | ${S.part} | أرشيف HR + أرشيف الدفتر + أرشيف العملاء + مستندات أشخاص بتاريخ انتهاء؛ الملفات على القرص | **إصدارات المستندات** · التخزين داخل PostgreSQL · فحص الملفات · (في الويب: المرفقات لسه — A5) |
| 15 | Workflow & Approvals | ${S.part} | مسار المشروع قابل للتعديل (\`workflow-editor.js\`)، اعتماد إجازات، حد اعتماد مصروف (\`settings.expenseApprovalLimit\`) | **محرك اعتمادات عام** (Draft/Submitted/Approved/Rejected/Returned/Cancelled) حسب نوع المستند والمبلغ والإدارة |
| 16 | Notifications | ${S.part} | مركز تنبيهات داخل الواجهة (انتهاء مستندات/تراخيص…) محسوب وقت العرض | إشعارات لكل مستخدم مخزّنة · «إشعار المسؤول التالي» |
| 17 | Reports | ${S.ok} | تقارير HR، الدفتر، العملاء، المخازن، الحسابات + Excel/PDF/طباعة | — |
| 18 | Users & Permissions | ${S.part} | مستخدمين + أدوار + صلاحيات صفحة × (عرض/إضافة/تعديل/حذف)؛ **على السيرفر** في نسخة الويب + نطاق مشاريع | إجراءات Approve/Reject/Print/Export/Pay/Cancel · نطاق «إدارته» و«اللي أنشأه بس» |
| 19 | System Settings | ${S.ok} | بيانات الشركة، حقول مخصصة، تخطيط النماذج، مستندات مطلوبة | — |
| 20 | Backup & Restore | ${S.part} | الديسكتوب: نسخ تلقائية + نسخة إضافية + استيراد/تصدير | في الويب: نسخ السيرفر واختبار الاستعادة لسه (A6) |
| — | PWA | ${S.none} | مفيش manifest ولا service worker | — |
| — | Audit Log | ${S.part} | \`DATA.auditLog\` (وصف نصي)؛ في الويب: \`changes\` (مين/إمتى/الحقول/القيم الجديدة) + \`audit_log\` | القيم **القديمة** في السجل · سبب الإلغاء/الرفض · سياسة احتفاظ |
`;
fs.writeFileSync(path.join(ROOT, 'docs/FEATURE_INVENTORY.md'), md);
console.log('wrote', md.split('\n').length, 'lines;', st.filter((x) => x.includes('✅')).length, 'verified,', st.filter((x) => x.includes('🟡')).length, 'unverified');
