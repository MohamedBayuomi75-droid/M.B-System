# Design tokens للواجهة القديمة (خطة v1.4.5 — المرحلة 3)

> **مولَّد** بـ `node tools/discovery/extract-design-tokens.js` من `renderer/styles/style.css` و`renderer/modules/ledger/ledger.css` + الشكل المحسوب في المتصفح. المصدر الكامل: `tokens.json`.
> **الغرض:** الواجهة الجديدة (Angular Material) لازم **تحافظ على الهوية البصرية الحالية** (`01` §3 مبدأ 2، و`04` §4.2). الجدول ده هو المرجع، واللقطات في `visual-baseline/`.
> القيم اللي بين قوسين = عدد مرات التكرار في الـ CSS.

## 1. متغيّرات CSS (الألوان الأساسية للهوية)
| المتغيّر | القيمة | الاستخدام (من الاسم) |
|---|---|---|
| `--paper` | `#F6F1E4` | خلفية الصفحة (ورقي) |
| `--paper-2` | `#EFE7D3` | خلفية ثانوية |
| `--ink` | `#2B2A25` | النص الأساسي |
| `--ink-soft` | `#6B6555` | النص الثانوي |
| `--ledger-green` | `#1B4332` | اللون الأساسي (أخضر الدفتر) |
| `--ledger-green-2` | `#2D6A4F` | الأساسي الفاتح |
| `--accent` | `var(--ledger-green)` | لون التمييز = الأخضر |
| `--accent-2` | `var(--ledger-green-2)` | لون التمييز الفاتح |
| `--gold` | `#B08A2E` | ذهبي (تمييز ثانوي) |
| `--gold-soft` | `#D9B65C` | ذهبي فاتح |
| `--debt` | `#9B2C2C` | مدين / سالب (أحمر) |
| `--credit` | `#2D6A4F` | دائن / موجب (أخضر) |
| `--line` | `#D8CDAF` | الحدود والفواصل |
| `--card` | `#FFFDF7` | خلفية الكروت |
| `--shadow` | `0 2px 10px rgba(43,42,37,0.08)` | ظل الكروت |

## 2. القيم المتكررة في الـ CSS
| النوع | الأكثر استخدامًا |
|---|---|
| الألوان | `#ffffff` (138) · `#1b4332` (44) · `#f6f1e4` (30) · `#2d6a4f` (26) · `#2d5a3d` (21) · `#c9a227` (16) · `#faf6ea` (15) · `#92400e` (14) · `#eaf3ec` (11) · `#eef5f0` (11) · `rgba(27,67,50,.12)` (11) · `#b3261e` (10) · `#1b7a45` (9) · `#f59e0b` (9) · `#b45309` (8) · `rgba(0,0,0,.25)` (7) |
| الخطوط | inherit (24) · Tahoma,Arial,sans-serif (2) · "Segoe UI", Arial, sans-serif (1) · "Segoe UI","Tahoma","Arial","Noto Sans Arabic",sans-serif (1) · ui-monospace, monospace (1) |
| مقاسات الخط | 12px (78) · 13px (78) · 11px (52) · 12.5px (42) · 14px (37) · 11.5px (36) · 13.5px (32) · 15px (22) · 17px (13) · 10.5px (12) · 10px (12) · 20px (12) · 18px (10) · 22px (10) |
| أوزان الخط | 800 (95) · 700 (91) · 900 (62) · 600 (26) · 500 (3) · 400 (2) |
| الحواف (radius) | 12px (46) · 10px (44) · 8px (40) · 14px (37) · 999px (26) · 16px (18) · 50% (17) · 6px (16) · 9px (10) · 99px (6) |
| الظلال | none (14) · var(--shadow) (7) · 0 0 0 3px rgba(27,67,50,.14) (4) · 0 10px 40px rgba(0,0,0,.25) (3) · 0 2px 8px rgba(0,0,0,.04) (3) · 0 6px 16px rgba(27,67,50,.12) (3) |
| الحشو (padding) | 0 (27) · 10px 12px (19) · 8px 10px (15) · 12px 14px (12) · 14px 16px (11) · 12px (10) · 10px 14px (8) · 10px (7) · 3px 10px (7) · 6px 8px (7) · 12px 16px (6) · 16px (6) |
| المسافات (gap) | 8px (79) · 10px (55) · 12px (45) · 6px (42) · 4px (19) · 14px (16) · 5px (8) · 16px (6) · 0 (5) · 2px (5) |
| نقاط التجاوب (breakpoints) | 1000px (11) · 900px (5) · 1100px (4) · 640px (4) · 720px (4) · 860px (4) · 700px (3) · 760px (3) · 1400px (2) · 560px (2) · 600px (1) · 650px (1) |

## 3. الشكل المحسوب فعليًا للعناصر الأساسية (1366×768)
| العنصر | الصفحة | اللون | الخلفية | الخط | المقاس/الوزن | الحواف | الحد | الظل | الحشو | الارتفاع |
|---|---|---|---|---|---|---|---|---|---|---|
| body | `dashboard` | `rgb(43, 42, 37)` | `rgb(246, 241, 228)` | Segoe UI | 15px / 400 | 0px | 0px `rgb(43, 42, 37)` | — | 0px 0px | 3918.36px |
| header | `dashboard` | `rgb(43, 42, 37)` | `rgba(0, 0, 0, 0)` | Segoe UI | 15px / 400 | 0px | 0px `rgb(43, 42, 37)` | — | 0px 0px | 70px |
| section nav button (active) | `dashboard` | `rgb(246, 241, 228)` | `rgb(27, 67, 50)` | Arial | 13px / 700 | 8px | 0px `rgb(246, 241, 228)` | — | 7px 12px | 32px |
| section nav button | `dashboard` | `rgb(107, 101, 85)` | `rgba(0, 0, 0, 0)` | Arial | 13px / 700 | 8px | 0px `rgb(107, 101, 85)` | — | 7px 12px | 32px |
| page nav button (active) | `users` | `rgb(246, 241, 228)` | `rgb(27, 67, 50)` | Arial | 13px / 700 | 8px | 0px `rgb(246, 241, 228)` | — | 7px 12px | 30.8906px |
| page nav button | `users` | `rgb(107, 101, 85)` | `rgba(0, 0, 0, 0)` | Arial | 13px / 700 | 8px | 0px `rgb(107, 101, 85)` | — | 7px 12px | 30.8906px |
| primary button | `dashboard` | `rgb(246, 241, 228)` | `rgb(27, 67, 50)` | Segoe UI | 12px / 700 | 7px | 0px `rgb(246, 241, 228)` | — | 5px 10px | 27px |
| outline button | `dashboard` | `rgb(43, 42, 37)` | `rgba(0, 0, 0, 0)` | Segoe UI | 12px / 700 | 7px | 1px `rgb(216, 205, 175)` | — | 5px 10px | 27px |
| board card | `employees` | `rgb(0, 0, 0)` | `rgb(246, 241, 228)` | Arial | 13.3333px / 400 | 16px | 1px `rgb(216, 205, 175)` | `rgba(0, 0, 0, 0.04) 0px 2px 8px 0px` | 22px 20px | 174px |
| stat card | `clients.contracts` | `rgb(43, 42, 37)` | `rgb(246, 241, 228)` | Segoe UI | 15px / 400 | 14px | 1px `rgb(216, 205, 175)` | — | 12px 12px | 65.3594px |
| table header cell | `dashboard` | `rgb(246, 241, 228)` | `rgb(27, 67, 50)` | Segoe UI | 11.5px / 800 | 0px 7px 0px 0px | 0px `rgb(246, 241, 228)` | — | 10px 10px | 34px |
| table body cell | `dashboard` | `rgb(43, 42, 37)` | `rgb(246, 241, 228)` | Segoe UI | 12px / 400 | 0px | 0px `rgb(43, 42, 37)` | — | 8px 10px | 31.5px |
| text input | `dashboard` | `rgb(0, 0, 0)` | `rgb(255, 255, 255)` | Segoe UI | 13.5px / 400 | 8px | 1px `rgb(216, 205, 175)` | — | 8px 12px | 34px |
| select | `dashboard` | `rgb(43, 42, 37)` | `rgb(255, 255, 255)` | Segoe UI | 13.5px / 600 | 10px | 1px `rgba(45, 90, 61, 0.22)` | — | 7px 12px | 38px |
| badge | `dashboard` | `rgb(255, 255, 255)` | `rgb(179, 38, 30)` | Arial | 11px / 800 | 9px | 0px `rgb(255, 255, 255)` | — | 0px 5px | 18px |
| debt amount | `dashboard` | `rgb(43, 42, 37)` | `rgb(255, 244, 242)` | Segoe UI | 15px / 400 | 12px | 3px `rgb(179, 38, 30)` | — | 8px 10px | 69.9062px |
| credit amount | `—` | (مش موجود في الصفحة دي) | | | | | | | | |
| modal | `clients.contracts` | `rgb(43, 42, 37)` | `rgb(255, 253, 247)` | Segoe UI | 15px / 400 | 16px | 1px `rgb(216, 205, 175)` | `rgba(0, 0, 0, 0.25) 0px 10px 40px 0px` | 0px 0px | 671.594px |
| modal header | `clients.contracts` | `rgb(43, 42, 37)` | `rgba(0, 0, 0, 0)` | Segoe UI | 15px / 400 | 16px 16px 0px 0px | 0px `rgb(43, 42, 37)` | — | 16px 20px | 65px |

## 4. ملاحظات للواجهة الجديدة (مقترحات، مش قرارات)
- **اللوحة:** أساسي أخضر `#1B4332` على خلفية ورقية `#F6F1E4`، وكروت `#FFFDF7`، وذهبي للتمييز الثانوي. ثيم Material لازم يتبني من القيم دي (primary = الأخضر، surface = الورقي).
- **الألوان المالية:** مدين `#9B2C2C` ودائن `#2D6A4F`. ده معنى عمل، مش زينة، ولازم يتحافظ عليه في كل الأرصدة.
- **الاتجاه:** عربي من اليمين للشمال في كل الصفحات.
- **التجاوب:** أهم نقاط الكسر: 1000px، 900px، 1100px، 640px، 720px.
- **المقارنة البصرية الآلية (TECH: visual-regression):** بتستخدم اللقطات في `visual-baseline/` بنفس البيانات المُركّبة ونفس التاريخ الثابت.
