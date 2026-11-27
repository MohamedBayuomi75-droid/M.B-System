import { DataSource } from 'typeorm';
import { CutoverReport, cutoverModule, ModuleSpec, rollbackModule } from './module-cutover';
import { SUPPLIER_INVOICE_COLUMNS } from '../migrations/1764800000000-SupplierInvoices';
import { SUPPLIER_PAYMENT_COLUMNS } from '../migrations/1765000000000-SupplierPayments';
import { PROJECT_COLUMNS } from '../migrations/1765100000000-ProjectsCutover';
import { WORKER_COLUMNS } from '../migrations/1765200000000-WorkersCutover';
import { DRIVER_COLUMNS, SUPERVISOR_COLUMNS } from '../migrations/1765300000000-SupervisorsDriversCutover';
import { EMPLOYEE_COLUMNS } from '../migrations/1765400000000-EmployeesCutover';
import { LEAVE_COLUMNS } from '../migrations/1765500000000-LeavesCutover';
import { ATTENDANCE_COLUMNS, WORKER_ATTENDANCE_COLUMNS } from '../migrations/1765600000000-AttendanceCutover';
import { EMPLOYEE_PENALTY_COLUMNS, WORKER_PAYMENT_COLUMNS } from '../migrations/1765700000000-WorkerPaymentsCutover';

export type { CutoverReport } from './module-cutover';

/**
 * 6.1 — الموردين والعملاء. التطبيع المسموح بس: defaults للحقول الناقصة + تقريب الرصيد الافتتاحي لـ 6 خانات HALF_UP (B-25)
 * + جهات اتصال بنفس المفاتيح.
 */
const partiesNormalized = (defaults: string) => `(${defaults} || r.data || jsonb_build_object('id', r.id,
  'openingBalance', CASE WHEN coalesce(r.data->>'openingBalance','') = '' THEN 0 ELSE trim_scale(round((r.data->>'openingBalance')::numeric, 6)) END)
  || CASE WHEN r.data ? 'contacts' AND jsonb_typeof(r.data->'contacts') = 'array' THEN jsonb_build_object('contacts', (SELECT coalesce(jsonb_agg(jsonb_build_object('title','','phone','','email','') || e ORDER BY o), '[]'::jsonb) FROM jsonb_array_elements(r.data->'contacts') WITH ORDINALITY AS x(e, o))) ELSE '{}'::jsonb END
  || CASE WHEN coalesce(r.data->>'status','') = '' AND r.data ? 'code' THEN jsonb_build_object('status','active') ELSE '{}'::jsonb END)`;

export const PARTIES: ModuleSpec = {
  label: 'parties',
  collections: [
    { collection: 'ledger.suppliers', table: 'suppliers', write: 'legacy_write_supplier', read: 'supplier_to_legacy', rounding: { column: 'opening_balance', key: 'openingBalance' },
      normalized: partiesNormalized(`jsonb_build_object('name','','taxId','','commercialReg','','businessNature','','openingBalance',0,'openingBalanceDate','','phone','','email','','address','','bankAccount','','iban','','notes','','extraFields','[]'::jsonb)`) },
    { collection: 'clients.customers', table: 'customers', write: 'legacy_write_customer', read: 'customer_to_legacy', rounding: { column: 'opening_balance', key: 'openingBalance' },
      normalized: partiesNormalized(`jsonb_build_object('code','','name','','phone','','email','','city','','category','','taxId','','department','','status','active','openingBalance',0,'address','','notes','','extraFields','[]'::jsonb,'contacts','[]'::jsonb)`) },
  ],
  clearTables: ['customer_contacts', 'customers', 'suppliers'],
};

/**
 * 6.2 — المخازن (الأصناف والمخازن والحركات). الجرد (warehouses.stocktakes) بيفضل في records (B-51: نتيجة الجرد بتترحّل كتسوية).
 * التطبيع المسموح بس: الحقل اللي قيمته null على المستوى الأول = مش موجود، والأرقام بقيمتها (5 خانات — B-26). مفيش defaults.
 */
export const WAREHOUSES: ModuleSpec = {
  label: 'warehouses',
  collections: [
    { collection: 'warehouses.locations', table: 'wh_locations', write: 'legacy_write_wh_location', read: 'wh_location_to_legacy',
      normalized: `jsonb_drop_null_keys(r.data || jsonb_build_object('id', r.id))` },
    { collection: 'warehouses.items', table: 'wh_items', write: 'legacy_write_wh_item', read: 'wh_item_to_legacy',
      normalized: `jsonb_drop_null_keys(r.data || jsonb_build_object('id', r.id))` },
    { collection: 'warehouses.movements', table: 'wh_movements', write: 'legacy_write_wh_movement', read: 'wh_movement_to_legacy',
      normalized: `jsonb_drop_null_keys(r.data || jsonb_build_object('id', r.id))` },
  ],
  clearTables: ['wh_movements', 'wh_items', 'wh_locations'],
};

/**
 * 7.2 — فواتير ومرتجعات الموردين. **مفيش أي تطبيع** (DEC-0107: القديم بقيمه): كل حقل نوعه مطابق بيروح عموده،
 * واللي نوعه مختلف بيفضل في legacy_extra زي ما هو، والتقرير بيعدّه (untyped).
 */
export const SUPPLIER_INVOICES: ModuleSpec = {
  label: 'supplier-invoices',
  collections: [
    { collection: 'ledger.invoices', table: 'supplier_invoices', write: 'legacy_write_supplier_invoice', read: 'supplier_invoice_to_legacy',
      normalized: `(r.data || jsonb_build_object('id', r.id))`, typedKeys: SUPPLIER_INVOICE_COLUMNS.map(([, k]) => k) },
  ],
  clearTables: ['supplier_invoices'],
};

/** 7.3 — دفعات الموردين. نفس طريقة الفواتير: مفيش تطبيع، واللي نوعه مختلف بيفضل في legacy_extra ويتعدّ (untyped) */
export const SUPPLIER_PAYMENTS: ModuleSpec = {
  label: 'supplier-payments',
  collections: [
    { collection: 'ledger.payments', table: 'supplier_payments', write: 'legacy_write_supplier_payment', read: 'supplier_payment_to_legacy',
      normalized: `(r.data || jsonb_build_object('id', r.id))`, typedKeys: SUPPLIER_PAYMENT_COLUMNS.map(([, k]) => k) },
  ],
  clearTables: ['supplier_payments'],
};

/** 7.4 — المشروعات (DEC-0117). نفس طريقة الفواتير والدفعات: مفيش تطبيع، وحقول المسار بقيمها، واللي نوعه مختلف بيفضل في legacy_extra ويتعدّ */
export const PROJECTS: ModuleSpec = {
  label: 'projects',
  collections: [
    { collection: 'projects', table: 'projects', write: 'legacy_write_project', read: 'project_to_legacy',
      normalized: `(r.data || jsonb_build_object('id', r.id))`, typedKeys: PROJECT_COLUMNS.map(([, k]) => k) },
  ],
  clearTables: ['projects'],
};

/** 8.1 — العمال (DEC-0121). نفس الطريقة: مفيش تطبيع، واللي نوعه مختلف بيفضل في legacy_extra ويتعدّ */
export const WORKERS: ModuleSpec = {
  label: 'workers',
  collections: [
    { collection: 'workers', table: 'workers', write: 'legacy_write_worker', read: 'worker_to_legacy',
      normalized: `(r.data || jsonb_build_object('id', r.id))`, typedKeys: WORKER_COLUMNS.map(([, k]) => k) },
  ],
  clearTables: ['workers'],
};

/** 8.2 — المشرفين والسواقين (DEC-0123). نفس الطريقة، والاتنين في أمر واحد */
export const SUPERVISORS_DRIVERS: ModuleSpec = {
  label: 'supervisors-drivers',
  collections: [
    { collection: 'supervisors', table: 'supervisors', write: 'legacy_write_supervisor', read: 'supervisor_to_legacy',
      normalized: `(r.data || jsonb_build_object('id', r.id))`, typedKeys: SUPERVISOR_COLUMNS.map(([, k]) => k) },
    { collection: 'drivers', table: 'drivers', write: 'legacy_write_driver', read: 'driver_to_legacy',
      normalized: `(r.data || jsonb_build_object('id', r.id))`, typedKeys: DRIVER_COLUMNS.map(([, k]) => k) },
  ],
  clearTables: ['drivers', 'supervisors'],
};

/** 8.3 — الموظفين (DEC-0125). نفس الطريقة */
export const EMPLOYEES: ModuleSpec = {
  label: 'employees',
  collections: [
    { collection: 'employees', table: 'employees', write: 'legacy_write_employee', read: 'employee_to_legacy',
      normalized: `(r.data || jsonb_build_object('id', r.id))`, typedKeys: EMPLOYEE_COLUMNS.map(([, k]) => k) },
  ],
  clearTables: ['employees'],
};

/** 8.4 — الإجازات (DEC-0127). نفس الطريقة */
export const LEAVES: ModuleSpec = {
  label: 'leaves',
  collections: [
    { collection: 'leaves', table: 'leaves', write: 'legacy_write_leave', read: 'leave_to_legacy',
      normalized: `(r.data || jsonb_build_object('id', r.id))`, typedKeys: LEAVE_COLUMNS.map(([, k]) => k) },
  ],
  clearTables: ['leaves'],
};

/**
 * 8.5 — اليوميات وحضور الموظفين (DEC-0135). **التطبيع الوحيد: تثبيت الأجر (DEC-0130، د-3):** اليومية اللي مالهاش أجر محفوظ صالح
 * (نفس شرط attendanceDayWage: موجود، ومش فاضي، ورقم) بتاخد أجر صاحبها الحالي (toInt = round2، وصفر لو مش موجود — زي القديمة) وبيتثبّت فيها،
 * ومعاه `dayWageSource: 'pinned-at-cutover'` علشان العدد يطلع في تقرير النقل. صاحب اليومية بنفس attType/attPersonId (normalizeAttendanceRecord).
 */
const ATT_KIND = `(CASE WHEN lower(coalesce(r.data->>'personType', r.data->>'personKind', r.data->>'kind', '')) IN ('worker','supervisor','driver')
    THEN lower(coalesce(r.data->>'personType', r.data->>'personKind', r.data->>'kind'))
  WHEN EXISTS (SELECT 1 FROM legacy_records x WHERE x.collection = 'workers' AND x.deleted_at IS NULL AND x.id = ATT_PID) THEN 'worker'
  WHEN EXISTS (SELECT 1 FROM legacy_records x WHERE x.collection = 'drivers' AND x.deleted_at IS NULL AND x.id = ATT_PID) THEN 'driver'
  WHEN EXISTS (SELECT 1 FROM legacy_records x WHERE x.collection = 'supervisors' AND x.deleted_at IS NULL AND x.id = ATT_PID) THEN 'supervisor'
  WHEN coalesce(r.data->>'driverId','') <> '' AND coalesce(r.data->>'workerId','') = '' THEN 'driver' ELSE 'worker' END)`;
const ATT_PID = `coalesce(nullif(r.data->>'personId',''), nullif(r.data->>'workerId',''), nullif(r.data->>'driverId',''), nullif(r.data->>'supervisorId',''), '')`;
const WAGE_OK = `(r.data ? 'dayWage' AND jsonb_typeof(r.data->'dayWage') <> 'null' AND coalesce(r.data->>'dayWage','') <> ''
  AND (jsonb_typeof(r.data->'dayWage') = 'number' OR (r.data->>'dayWage') ~ '^\\s*-?[0-9]+(\\.[0-9]+)?\\s*$'))`;
const PERSON_WAGE = `coalesce((SELECT CASE WHEN jsonb_typeof(x.data->'dailyWage') = 'number' THEN round((x.data->>'dailyWage')::numeric, 2)
    WHEN (x.data->>'dailyWage') ~ '^\\s*-?[0-9]+(\\.[0-9]+)?\\s*$' THEN round(trim(x.data->>'dailyWage')::numeric, 2) ELSE 0 END
  FROM legacy_records x WHERE x.deleted_at IS NULL AND x.id = ${ATT_PID}
    AND x.collection = (CASE ${ATT_KIND.replace(/ATT_PID/g, ATT_PID)} WHEN 'supervisor' THEN 'supervisors' WHEN 'driver' THEN 'drivers' ELSE 'workers' END) LIMIT 1), 0)`;
export const ATTENDANCE: ModuleSpec = {
  label: 'attendance',
  collections: [
    { collection: 'workerAttendance', table: 'worker_attendance', write: 'legacy_write_worker_attendance', read: 'worker_attendance_to_legacy',
      normalized: `(coalesce(r.data, jsonb_build_object('id', r.id)) || CASE WHEN ${WAGE_OK} THEN '{}'::jsonb
        ELSE jsonb_build_object('dayWage', trim_scale(${PERSON_WAGE}), 'dayWageSource', 'pinned-at-cutover') END)`,
      typedKeys: WORKER_ATTENDANCE_COLUMNS.map(([, k]) => k), writeFrom: 'normalized' },
    { collection: 'attendance', table: 'attendance', write: 'legacy_write_attendance', read: 'attendance_to_legacy',
      normalized: `(r.data || jsonb_build_object('id', r.id))`, typedKeys: ATTENDANCE_COLUMNS.map(([, k]) => k) },
  ],
  clearTables: ['worker_attendance', 'attendance'],
};

/** 8.6 — الصرف والخصومات وخصومات الموظفين (DEC-0137). مفيش تطبيع — نسخ زي ما هو (0 سجل حقيقي). */
export const WORKER_PAYMENTS: ModuleSpec = {
  label: 'worker-payments',
  collections: [
    { collection: 'workerPayments', table: 'worker_payments', write: 'legacy_write_worker_payment', read: 'worker_payment_to_legacy',
      normalized: `(r.data || jsonb_build_object('id', r.id))`, typedKeys: WORKER_PAYMENT_COLUMNS.map(([, k]) => k) },
    { collection: 'employeePenalties', table: 'employee_penalties', write: 'legacy_write_employee_penalty', read: 'employee_penalty_to_legacy',
      normalized: `(r.data || jsonb_build_object('id', r.id))`, typedKeys: EMPLOYEE_PENALTY_COLUMNS.map(([, k]) => k) },
  ],
  clearTables: ['worker_payments', 'employee_penalties'],
};

export const MODULES: Record<string, ModuleSpec> = { parties: PARTIES, warehouses: WAREHOUSES, 'supplier-invoices': SUPPLIER_INVOICES, 'supplier-payments': SUPPLIER_PAYMENTS, projects: PROJECTS, workers: WORKERS, 'supervisors-drivers': SUPERVISORS_DRIVERS, employees: EMPLOYEES, leaves: LEAVES, attendance: ATTENDANCE, 'worker-payments': WORKER_PAYMENTS };

export const partiesCutover = (ds: DataSource, by: string, mode: CutoverReport['mode']) => cutoverModule(ds, PARTIES, by, mode);
export const partiesRollback = (ds: DataSource, by: string) => rollbackModule(ds, PARTIES, by);
