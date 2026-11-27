# مصفوفة تطابق الحقول — المعدات ويومياتها (خطة v1.4.5 — المرحلة 8، الحزمة 8.7)

> **مولَّد** بـ `node tools/discovery/build-equipment-parity.js`. ماتعدّلش الملف باليد.
> **المصادر:** اللي نوافذ القديمة بتكتبه (`openEquipmentModal`، و`openEquipmentDailyModal`)، وتكلفة النقل (DEC-0140)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجداول (`server/src/migrations/1765800000000-EquipmentCutover.ts`).
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في `legacy_extra` بالظبط (DEC-0107)، وعددها بيطلع في تقرير النقل (`untyped`).

## المعدات (`equipment` ← جدول `equipment`)
- **الحقول:** 48 — ليها عمود: **48**، ومحفوظة في `legacy_extra`: **0**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** `legacyDepartmentId`، `location`، `projectSince`، `rentalDaily`

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `attachments` | array | عمود `attachments` (json) | ✅ |
| `brand` | string | عمود `brand` (text) | ✅ |
| `categoryId` | string | عمود `category_id` (text) | ✅ |
| `chassisNumber` | string | عمود `chassis_number` (text) | ✅ |
| `code` | string | عمود `code` (text) | ✅ |
| `color` | string | عمود `color` (text) | ✅ |
| `custom` | object | عمود `custom` (json) | ✅ |
| `dailyCost` | number | عمود `daily_cost` (number) | ✅ |
| `departmentId` | string | عمود `department_id` (text) | ✅ |
| `driverId` | (من الكود القديم) | عمود `driver_id` (text) | ✅ |
| `driverLicenseExpiry` | string | عمود `driver_license_expiry` (text) | ✅ |
| `driverLicenseStatus` | string | عمود `driver_license_status` (text) | ✅ |
| `driverName` | string | عمود `driver_name` (text) | ✅ |
| `extraFields` | array | عمود `extra_fields` (json) | ✅ |
| `fuelPrice` | number | عمود `fuel_price` (number) | ✅ |
| `hourlyCost` | number | عمود `hourly_cost` (number) | ✅ |
| `id` | string | المفتاح الأساسي `id` | ✅ |
| `inspectionDate` | string | عمود `inspection_date` (text) | ✅ |
| `insuranceNumber` | string | عمود `insurance_number` (text) | ✅ |
| `insuranceStatus` | string | عمود `insurance_status` (text) | ✅ |
| `lastMaintenance` | string | عمود `last_maintenance` (text) | ✅ |
| `legacyDepartmentId` | string | عمود `legacy_department_id` (text) | — |
| `licenseCategory` | string | عمود `license_category` (text) | ✅ |
| `licenseExpiry` | string | عمود `license_expiry` (text) | ✅ |
| `licenseIssueDate` | string | عمود `license_issue_date` (text) | ✅ |
| `licenseStatus` | string | عمود `license_status` (text) | ✅ |
| `location` | string | عمود `location` (text) | — |
| `model` | string | عمود `model` (text) | ✅ |
| `motorNumber` | string | عمود `motor_number` (text) | ✅ |
| `name` | string | عمود `name` (text) | ✅ |
| `nextMaintenance` | string | عمود `next_maintenance` (text) | ✅ |
| `notes` | string | عمود `notes` (text) | ✅ |
| `ownership` | string | عمود `ownership` (text) | ✅ |
| `plate` | string | عمود `plate` (text) | ✅ |
| `project` | string | عمود `project` (text) | ✅ |
| `projectSince` | string | عمود `project_since` (text) | — |
| `purchaseDate` | string | عمود `purchase_date` (text) | ✅ |
| `purchasePrice` | number | عمود `purchase_price` (number) | ✅ |
| `rentalDaily` | number | عمود `rental_daily` (number) | — |
| `serial` | string | عمود `serial` (text) | ✅ |
| `status` | string | عمود `status` (text) | ✅ |
| `supervisorId` | string | عمود `supervisor_id` (text) | ✅ |
| `totalHours` | number | عمود `total_hours` (number) | ✅ |
| `type` | string | عمود `type` (text) | ✅ |
| `typeLabel` | string | عمود `type_label` (text) | ✅ |
| `vehicleLicenseExpiry` | string | عمود `vehicle_license_expiry` (text) | ✅ |
| `vehicleLicenseStatus` | string | عمود `vehicle_license_status` (text) | ✅ |
| `vehicleNumber` | string | عمود `vehicle_number` (text) | ✅ |

## يوميات المعدات (`equipmentDaily` ← جدول `equipment_daily`)
- **الحقول:** 16 — ليها عمود: **16**، ومحفوظة في `legacy_extra`: **0**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** مفيش

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `cost` | (من الكود القديم) | عمود `cost` (number) | ✅ |
| `dailyCost` | number | عمود `daily_cost` (number) | ✅ |
| `date` | string | عمود `date` (text) | ✅ |
| `days` | number | عمود `days` (number) | ✅ |
| `equipmentId` | string | عمود `equipment_id` (text) | ✅ |
| `extraCost` | number | عمود `extra_cost` (number) | ✅ |
| `fuelLiters` | number | عمود `fuel_liters` (number) | ✅ |
| `fuelPrice` | number | عمود `fuel_price` (number) | ✅ |
| `hourlyCost` | number | عمود `hourly_cost` (number) | ✅ |
| `hours` | number | عمود `hours` (number) | ✅ |
| `id` | string | المفتاح الأساسي `id` | ✅ |
| `kind` | string | عمود `kind` (text) | ✅ |
| `moveCost` | (من الكود القديم) | عمود `move_cost` (number) | ✅ |
| `notes` | string | عمود `notes` (text) | ✅ |
| `productivity` | string | عمود `productivity` (text) | ✅ |
| `project` | string | عمود `project` (text) | ✅ |

## الخلاصة
- **كل حقل ليه مكان** (عمود أو `legacy_extra`)، ومفيش حقل بيضيع، ومفيش تطبيع وقت النقل.
