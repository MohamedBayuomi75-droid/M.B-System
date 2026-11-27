# مصفوفة تطابق الحقول — المعدات ويومياتها (خطة v1.4.5 — المرحلة 8، الحزمة 8.7)

> **مولَّد** بـ `node tools/discovery/build-equipment-parity.js`. ماتعدّلش الملف باليد.
> **المصادر:** اللي نوافذ القديمة بتكتبه (`openEquipmentModal`، و`openEquipmentDailyModal`)، وتكلفة النقل (DEC-0140)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجداول (`server/src/migrations/1765800000000-EquipmentCutover.ts`).
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في `legacy_extra` بالظبط (DEC-0107)، وعددها بيطلع في تقرير النقل (`untyped`).

## المعدات (`equipment` ← جدول `equipment`)
- **الحقول:** 48 — ليها عمود: **48**، ومحفوظة في `legacy_extra`: **0**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** (الشاشة في 8.7.5)

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `attachments` | array | عمود `attachments` (json) | (الشاشة في 8.7.5) |
| `brand` | string | عمود `brand` (text) | (الشاشة في 8.7.5) |
| `categoryId` | string | عمود `category_id` (text) | (الشاشة في 8.7.5) |
| `chassisNumber` | string | عمود `chassis_number` (text) | (الشاشة في 8.7.5) |
| `code` | string | عمود `code` (text) | (الشاشة في 8.7.5) |
| `color` | string | عمود `color` (text) | (الشاشة في 8.7.5) |
| `custom` | object | عمود `custom` (json) | (الشاشة في 8.7.5) |
| `dailyCost` | number | عمود `daily_cost` (number) | (الشاشة في 8.7.5) |
| `departmentId` | string | عمود `department_id` (text) | (الشاشة في 8.7.5) |
| `driverId` | (من الكود القديم) | عمود `driver_id` (text) | (الشاشة في 8.7.5) |
| `driverLicenseExpiry` | string | عمود `driver_license_expiry` (text) | (الشاشة في 8.7.5) |
| `driverLicenseStatus` | string | عمود `driver_license_status` (text) | (الشاشة في 8.7.5) |
| `driverName` | string | عمود `driver_name` (text) | (الشاشة في 8.7.5) |
| `extraFields` | array | عمود `extra_fields` (json) | (الشاشة في 8.7.5) |
| `fuelPrice` | number | عمود `fuel_price` (number) | (الشاشة في 8.7.5) |
| `hourlyCost` | number | عمود `hourly_cost` (number) | (الشاشة في 8.7.5) |
| `id` | string | المفتاح الأساسي `id` | (الشاشة في 8.7.5) |
| `inspectionDate` | string | عمود `inspection_date` (text) | (الشاشة في 8.7.5) |
| `insuranceNumber` | string | عمود `insurance_number` (text) | (الشاشة في 8.7.5) |
| `insuranceStatus` | string | عمود `insurance_status` (text) | (الشاشة في 8.7.5) |
| `lastMaintenance` | string | عمود `last_maintenance` (text) | (الشاشة في 8.7.5) |
| `legacyDepartmentId` | string | عمود `legacy_department_id` (text) | (الشاشة في 8.7.5) |
| `licenseCategory` | string | عمود `license_category` (text) | (الشاشة في 8.7.5) |
| `licenseExpiry` | string | عمود `license_expiry` (text) | (الشاشة في 8.7.5) |
| `licenseIssueDate` | string | عمود `license_issue_date` (text) | (الشاشة في 8.7.5) |
| `licenseStatus` | string | عمود `license_status` (text) | (الشاشة في 8.7.5) |
| `location` | string | عمود `location` (text) | (الشاشة في 8.7.5) |
| `model` | string | عمود `model` (text) | (الشاشة في 8.7.5) |
| `motorNumber` | string | عمود `motor_number` (text) | (الشاشة في 8.7.5) |
| `name` | string | عمود `name` (text) | (الشاشة في 8.7.5) |
| `nextMaintenance` | string | عمود `next_maintenance` (text) | (الشاشة في 8.7.5) |
| `notes` | string | عمود `notes` (text) | (الشاشة في 8.7.5) |
| `ownership` | string | عمود `ownership` (text) | (الشاشة في 8.7.5) |
| `plate` | string | عمود `plate` (text) | (الشاشة في 8.7.5) |
| `project` | string | عمود `project` (text) | (الشاشة في 8.7.5) |
| `projectSince` | string | عمود `project_since` (text) | (الشاشة في 8.7.5) |
| `purchaseDate` | string | عمود `purchase_date` (text) | (الشاشة في 8.7.5) |
| `purchasePrice` | number | عمود `purchase_price` (number) | (الشاشة في 8.7.5) |
| `rentalDaily` | number | عمود `rental_daily` (number) | (الشاشة في 8.7.5) |
| `serial` | string | عمود `serial` (text) | (الشاشة في 8.7.5) |
| `status` | string | عمود `status` (text) | (الشاشة في 8.7.5) |
| `supervisorId` | string | عمود `supervisor_id` (text) | (الشاشة في 8.7.5) |
| `totalHours` | number | عمود `total_hours` (number) | (الشاشة في 8.7.5) |
| `type` | string | عمود `type` (text) | (الشاشة في 8.7.5) |
| `typeLabel` | string | عمود `type_label` (text) | (الشاشة في 8.7.5) |
| `vehicleLicenseExpiry` | string | عمود `vehicle_license_expiry` (text) | (الشاشة في 8.7.5) |
| `vehicleLicenseStatus` | string | عمود `vehicle_license_status` (text) | (الشاشة في 8.7.5) |
| `vehicleNumber` | string | عمود `vehicle_number` (text) | (الشاشة في 8.7.5) |

## يوميات المعدات (`equipmentDaily` ← جدول `equipment_daily`)
- **الحقول:** 16 — ليها عمود: **16**، ومحفوظة في `legacy_extra`: **0**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** (الشاشة في 8.7.5)

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `cost` | (من الكود القديم) | عمود `cost` (number) | (الشاشة في 8.7.5) |
| `dailyCost` | number | عمود `daily_cost` (number) | (الشاشة في 8.7.5) |
| `date` | string | عمود `date` (text) | (الشاشة في 8.7.5) |
| `days` | number | عمود `days` (number) | (الشاشة في 8.7.5) |
| `equipmentId` | string | عمود `equipment_id` (text) | (الشاشة في 8.7.5) |
| `extraCost` | number | عمود `extra_cost` (number) | (الشاشة في 8.7.5) |
| `fuelLiters` | number | عمود `fuel_liters` (number) | (الشاشة في 8.7.5) |
| `fuelPrice` | number | عمود `fuel_price` (number) | (الشاشة في 8.7.5) |
| `hourlyCost` | number | عمود `hourly_cost` (number) | (الشاشة في 8.7.5) |
| `hours` | number | عمود `hours` (number) | (الشاشة في 8.7.5) |
| `id` | string | المفتاح الأساسي `id` | (الشاشة في 8.7.5) |
| `kind` | string | عمود `kind` (text) | (الشاشة في 8.7.5) |
| `moveCost` | (من الكود القديم) | عمود `move_cost` (number) | (الشاشة في 8.7.5) |
| `notes` | string | عمود `notes` (text) | (الشاشة في 8.7.5) |
| `productivity` | string | عمود `productivity` (text) | (الشاشة في 8.7.5) |
| `project` | string | عمود `project` (text) | (الشاشة في 8.7.5) |

## الخلاصة
- **كل حقل ليه مكان** (عمود أو `legacy_extra`)، ومفيش حقل بيضيع، ومفيش تطبيع وقت النقل.
