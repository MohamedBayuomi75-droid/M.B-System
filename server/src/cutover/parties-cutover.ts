import { DataSource } from 'typeorm';
import { CutoverReport, cutoverModule, ModuleSpec, rollbackModule } from './module-cutover';
import { SUPPLIER_INVOICE_COLUMNS } from '../migrations/1764800000000-SupplierInvoices';
import { SUPPLIER_PAYMENT_COLUMNS } from '../migrations/1765000000000-SupplierPayments';

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

export const MODULES: Record<string, ModuleSpec> = { parties: PARTIES, warehouses: WAREHOUSES, 'supplier-invoices': SUPPLIER_INVOICES, 'supplier-payments': SUPPLIER_PAYMENTS };

export const partiesCutover = (ds: DataSource, by: string, mode: CutoverReport['mode']) => cutoverModule(ds, PARTIES, by, mode);
export const partiesRollback = (ds: DataSource, by: string) => rollbackModule(ds, PARTIES, by);
