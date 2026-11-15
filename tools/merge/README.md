# أدوات دمج دفتر الموردين (مرة واحدة)

الكود في `renderer/modules/ledger/*.js` (غير `glue.js` و`ledger.css`) **ناتج** عن الأدوات دي من برنامج دفتر الموردين الأصلي،
وبعد التوليد بقى هو مصدر الحقيقة (بنعدّل فيه مباشرة). الأدوات محفوظة للمرجعية وإعادة التوليد لو اتغيّر الأصل.

| الملف | الوظيفة |
|---|---|
| `ledger-merge.config.json` | تصنيف ملفات الدفتر (اللي بيتنقل/اللي بيتحذف) + القواعد (domainKeys، extraRename، patches) |
| `codemod.js` | الدمج الفعلي بتحليل AST: حذف، إعادة تسمية الأسماء المتصادمة (بادئة `lg`)، `DATA.x` → `DATA.ledger.x` |
| `css-merge.js` | دمج CSS: الجديد يتضاف، المختلف يتحصر في `body.module-ledger` |
| `rename-map.json` | ناتج: الأسماء اللي اتغيّرت (52 اسم) |
| `jsast.js` / `analyze.js` / `deps.js` | تحليل (acorn المدمج في Node): الإعلانات، الأسماء الحرة، الاعتماديات |

```
node --expose-internals tools/merge/codemod.js tools/merge/ledger-merge.config.json --report   # تقرير بس
node --expose-internals tools/merge/codemod.js tools/merge/ledger-merge.config.json            # توليد
node tools/merge/css-merge.js <ledger style.css> renderer/styles/style.css renderer/modules/ledger/ledger.css
```
**تنبيه:** إعادة التوليد بتكتب فوق الملفات المولّدة (مش `glue.js`) — أي تعديل يدوي عليها هيضيع. **من 0.6.0 الملفات اتعدّلت يدويًا (صفحة المرتجعات في `pages-invoices.js` و`app.js`) — فالتوليد من جديد ما بقاش مناسب.** الأدوات للمرجعية.
