# LEGACY PRESERVATION AND MIGRATION SPECIFICATION

**Version:** 1.4.5 | **Date:** 19 November 2026  
**Purpose:** Preserve verified legacy behavior, UI, data, documents, and business rules through controlled discovery and migration.

Read the Master Plan and Roadmap first. The archive observations below are provisional baseline facts from the inspected v1.2 archive; verify against the live repository before acting.

## 1. Preservation classification

Each discovered item must be classified as:
- `LEGACY-PRESERVE`: verified current behavior to retain;
- `APPROVED-CHANGE`: change with explicit approval reference;
- `NEW-REQUIREMENT`: capability not verified in legacy, requiring scope approval;
- `TECHNICAL`: implementation/operational requirement;
- `OPEN-DECISION`: unresolved decision.

For every item capture: stable requirement ID, module/page, description, trigger, inputs, validations, business rules, outputs, permissions, data entities, API/integration, reports/prints/exports, attachment relationships, error behavior, source evidence, test case, priority, owner, target disposition, and approval reference.

No item may disappear from the inventory without a documented disposition and approval.


---

## Original v1.2 detailed preservation and migration requirements (retained)

# 2. Verified Legacy Baseline and Target-State Separation

## 2.1 Verified facts from the inspected application archive

The inspected application archive identifies the current application as:

-   Electron desktop application.
-   HTML, CSS, and Vanilla JavaScript renderer.
-   Node.js/Electron main process.
-   `data.json` persistence through `src/main/storage.js`.
-   `users.json` for user records.
-   Custom HTTP server in `src/main/server.js`.
-   Current server API includes whole-data `GET /api/data` and
    `POST /api/data` behavior.
-   Current data store includes `SCHEMA_VERSION = 9` and migrations.
-   Attachments are currently stored in a filesystem `attachments`
    directory through `src/main/attachments.js`.
-   Electron-specific capabilities include native file dialogs,
    `shell.openPath`, Windows WIA scanner integration, and desktop
    update behavior.
-   The current navigation inventory reports 11 sections and 44 page
    keys.
-   A number of JavaScript files are very large;
    `renderer/core/helpers.js` was approximately 459 KB / 8,556 lines in
    the inspected archive.
-   The inspected `package.json` identifies version `1.3.53`.
-   The inspected package does not establish that Angular, NestJS, or
    PostgreSQL are already the active application stack.

These facts describe the inspected archive only. Claude Code must
re-check the actual working repository, branch, commit, runtime, and
current deployment before relying on them. If the current repository has
changed since the archive was inspected, report the differences and use
the live repository as the current baseline.

## 2.2 Existing tests and their limits

The inspected archive produced the following results:

-   `node tools/check-structure.js`: 41 passed, 0 failed.
-   `npm test -- --runInBand`: 35 passed, 0 failed.

These results are useful baseline evidence, but they do **not** prove
full ERP correctness. The available test coverage was primarily
structural, security/basic API, and data round-trip coverage. It did not
establish complete business-workflow coverage, browser/PWA parity,
PostgreSQL migration correctness, full Electron runtime behavior, or
production readiness.

Never present these counts as proof that the entire application is fully
tested.

## 2.3 Target architecture --- not current implementation

The intended target architecture is:

-   **Frontend:** Angular, Arabic-first RTL, customized Angular
    Material/CDK design system.
-   **Backend:** NestJS Modular Monolith.
-   **Database:** PostgreSQL.
-   **Reverse proxy:** Nginx.
-   **Deployment:** company-hosted internal server.
-   **Client access:** Web application and installable PWA.
-   **Attachments:** stored inside PostgreSQL, subject to measured
    performance, growth, backup, and restore validation.
-   **Packaging/operations:** Docker Compose or another approved
    reproducible deployment method.

Do not claim any target component exists until it has been implemented
and verified in the actual repository and runtime.

## 2.4 Baseline verification deliverable

Create a baseline report that records:

-   Repository path, branch, commit hash, and working-tree status.
-   Actual package versions and dependencies.
-   Build, start, test, and packaging commands.
-   Current application entry points and runtime behavior.
-   Exact page, route, form, action, report, import/export, and print
    inventories.
-   Existing data stores, schemas, schema versions, and record counts.
-   Attachment inventory, sizes, paths, and references.
-   Existing users, roles, permissions, and session behavior.
-   Current integrations, background jobs, scheduled tasks, and
    desktop-only capabilities.
-   Known defects, test gaps, security findings, and documentation
    conflicts.
-   What is verified, reported but unverified, or unknown.

------------------------------------------------------------------------

# 4. Visual and Functional Parity --- Mandatory Workstream

This workstream is a core acceptance requirement, not a cosmetic
activity.

## 4.1 Visual baseline capture

Before redesigning or migrating any screen:

-   Capture reference screenshots of every existing page at
    representative desktop sizes.
-   Capture important modals, dropdowns, tables, filters, forms, empty
    states, validation errors, loading states, and notifications.
-   Record typography, Arabic font behavior, colors, spacing, borders,
    icons, table density, navigation dimensions, and layout rules.
-   Record responsive behavior where it exists.
-   Identify screen-specific exceptions and business-critical visual
    cues.
-   Store screenshots in a versioned visual-baseline directory.

Do not rely on memory or a few dashboard screenshots as the design
specification.

## 4.2 Design-system extraction

Create a documented design system from the current application:

-   Color and semantic status tokens.
-   Typography and Arabic font stack.
-   RTL spacing and alignment rules.
-   Navigation, sidebar, top bar, cards, tables, filters, forms,
    dialogs, tabs, badges, and notifications.
-   Button sizes and hierarchy.
-   Field validation and error display.
-   Empty/loading/disabled states.
-   Print styles and report layouts.
-   Responsive breakpoints and behavior.

Angular Material must be themed and customized, or Angular CDK/headless
components may be used where necessary. Do not allow default Angular
Material styling to replace the current interface without approval.

## 4.3 Visual acceptance

For each migrated page:

1.  Compare the legacy and new page at the same viewport size and
    equivalent data state.
2.  Compare layout, RTL direction, typography, colors, density,
    navigation, controls, and interactions.
3.  Record visual differences.
4.  Classify each difference as intentional approved improvement,
    acceptable technical difference, or defect.
5.  Fix unapproved regressions before acceptance.

Use screenshot-based visual regression testing where practical.
Automated pixel comparison may allow documented tolerances for rendering
differences, but it must not conceal missing controls or altered
layouts.

## 4.4 Functional parity

For every page, verify all existing:

-   Buttons and actions.
-   Search, filters, sorting, pagination, and selection behavior.
-   Form validation and defaults.
-   Add/edit/delete/archive/cancel actions.
-   Modal and confirmation behavior.
-   Permissions and visibility rules.
-   Calculations and derived values.
-   Print, PDF, Excel, import, and export behavior.
-   Notifications and cross-page navigation.
-   Attachment upload, preview, download, and linking.
-   Error, retry, and empty-state behavior.

A screen is not accepted merely because it looks similar or loads
without errors.

------------------------------------------------------------------------

# 5. Legacy Feature Inventory and Traceability

## 5.1 Complete inventory

Create a traceability matrix covering every discovered:

-   Section, page, route, tab, modal, and form.
-   Field and validation rule.
-   Button, menu item, action, and keyboard interaction.
-   Business workflow and document state.
-   Calculation and derived field.
-   Report, dashboard KPI, print layout, and export.
-   Import format and validation behavior.
-   Attachment and archive behavior.
-   Permission and data visibility rule.
-   Background job, notification, integration, and scheduled task.

Each inventory item must have a stable ID.

## 5.2 Required traceability fields

  -----------------------------------------------------------------------
  Field                               Required information
  ----------------------------------- -----------------------------------
  Legacy ID                           Stable page/action/workflow
                                      identifier

  Legacy location                     File, function, page key, or route

  Business purpose                    What the function does

  Inputs/outputs                      Fields, records, documents, and
                                      results

  Preconditions                       Required state and permissions

  Business rules                      Formula, validation, and state
                                      transitions

  Dependencies                        Other modules and shared services

  Data impact                         Read/write entities and side
                                      effects

  Target location                     New Angular page and NestJS domain

  Test reference                      Golden, integration, or E2E test ID

  Status                              Not reviewed / Documented / Mapped
                                      / Implemented / Verified / Accepted

  Decision                            Preserve / Improve / Replace /
                                      Defer / Remove with approval
  -----------------------------------------------------------------------

## 5.3 No silent omission

Every legacy item must be assigned one of these outcomes:

-   Preserve as-is.
-   Preserve with an approved improvement.
-   Replace with an explicitly mapped equivalent.
-   Defer with an owner, reason, and risk.
-   Retire only with explicit business approval.

No item may disappear simply because it was difficult to locate or
migrate.

------------------------------------------------------------------------

# 6. Golden-Master Business Rules and Legacy Behavior

Before replacing a calculation or workflow, capture the existing
behavior and determine whether it is approved.

For every critical financial, inventory, project-cost, labor, and
document workflow:

-   Record representative real-world inputs.
-   Record the legacy output.
-   Record the approved expected output.
-   Explain any difference between legacy output and approved expected
    output.
-   Record the calculation breakdown and rounding points.
-   Include boundary cases, invalid inputs, cancellation, reversal, and
    concurrency.
-   Obtain business-owner review for unresolved or disputed behavior.

The legacy application's output is a reference, not automatic proof of
correctness. If legacy behavior conflicts with an approved financial
rule, do not copy the defect into the new system; document the
discrepancy and obtain the required approval before changing behavior.

Create a versioned golden-test catalogue. The same cases must run
against the legacy baseline where possible and the new implementation.
Any intentional difference must have an approved decision record.

------------------------------------------------------------------------

# 10. Data and Attachment Migration

## 10.1 Known legacy sources to inspect

At minimum, inspect and reconcile:

-   `data.json`.
-   `users.json`.
-   `SCHEMA_VERSION` and all legacy migrations.
-   Files under `attachments/`.
-   Attachment metadata and references inside business records.
-   Any exports, backups, secondary stores, or hidden persistence
    discovered in the repository.
-   Any later transitional PostgreSQL/JSONB stores found in the current
    working repository.

Do not assume the inspected archive is the only source of authoritative
data.

## 10.2 Migration principles

1.  Preserve immutable source snapshots.
2.  Use repeatable, version-controlled migration scripts.
3.  Record source-to-target mappings.
4.  Make each migration run identifiable and auditable.
5.  Make migrations idempotent.
6.  Preserve original IDs where safe and required; otherwise maintain
    explicit old-to-new ID mapping.
7.  Never silently discard malformed, duplicate, orphaned, or unmapped
    records.
8.  Quarantine exceptions for review.
9.  Reconcile record counts and business totals.
10. Preserve document history, cancellation, reversal, and attachment
    links.
11. Do not cleanse or normalize data without documented rules and
    approval.
12. Do not run production migration without explicit authorization.

## 10.3 Data dictionary and mapping specification

For every entity and field, document:

-   Source file/table/path and source schema version.
-   Source identifier and target identifier.
-   Data type and nullability.
-   Meaning and business owner.
-   Relationships and natural keys.
-   Transformation/default rules.
-   Date/time and timezone handling.
-   Monetary and quantity precision.
-   Status mapping.
-   Validation and target constraints.
-   Exception/quarantine behavior.
-   Reconciliation method.
-   Migration script version and evidence.

Do not infer business meaning from field names alone.

## 10.4 Attachment migration --- mandatory detailed process

Because the legacy application stores attachments on the filesystem
while the target decision is PostgreSQL storage, create a dedicated
attachment migration plan.

For every file:

-   Resolve the stored legacy path safely.
-   Identify the owning business record and attachment category.
-   Preserve original filename, extension, MIME type, size, creation
    time, uploader, and relevant metadata where available.
-   Compute a cryptographic checksum (for example SHA-256) before
    migration.
-   Verify the file is readable and not unexpectedly empty/corrupt.
-   Store the binary in the approved PostgreSQL design, with metadata
    and parent relationship.
-   Recompute and compare checksum after migration.
-   Verify access authorization through the owning record.
-   Detect missing files, duplicate references, orphan files, path
    traversal, and invalid paths.
-   Quarantine exceptions; never silently delete them.
-   Preserve a legacy-to-target attachment mapping.
-   Reconcile counts, sizes, checksums, and parent-record links.

Test large-file performance, database growth, backup duration, restore
duration, and maintenance impact before production.

## 10.5 Migration rehearsal and reconciliation

For each module:

1.  Snapshot and checksum the source.
2.  Record source counts and totals.
3.  Run migration in an isolated environment.
4.  Validate schema constraints and relationships.
5.  Reconcile counts, statuses, totals, and references.
6.  Review exceptions with the business owner.
7.  Re-run to prove idempotency.
8.  Test performance and failure recovery.
9.  Rehearse cutover and rollback.
10. Obtain explicit production migration approval.
11. Freeze/control writes or use an approved delta-capture process.
12. Execute final migration.
13. Reconcile again before enabling target writes.
14. Obtain module cutover approval.

Reconciliation must include, where applicable:

-   Counts by entity, status, and date range.
-   Unique document identifiers and numbering.
-   Parent-child and cross-module references.
-   Supplier/customer balances.
-   Invoice, return, payment, receipt, and collection totals.
-   Stock quantities and valuation.
-   Project-level costs and financial totals.
-   Opening balances.
-   Cancelled and reversed documents.
-   Attachment counts, sizes, checksums, and links.

Any difference must be explained by an approved deterministic
transformation. Broad tolerances must not hide unexplained differences.

## 10.6 Coexistence and one authoritative writer

Each domain must have exactly one authoritative write system at a time.

Preferred approach:

-   Legacy remains read-only for the migrated domain after cutover.
-   New system becomes the only authoritative writer for that domain.
-   Use a controlled write freeze or a tested delta-capture mechanism
    during cutover.
-   Temporary dual-write is prohibited unless specifically approved and
    implemented with reliable transactional/outbox processing,
    idempotency, monitoring, reconciliation, and recovery.
-   Never allow two systems to independently accept authoritative writes
    for the same business records.

## 10.7 Rollback and recovery

A rollback plan must explain:

-   Trigger conditions and approval authority.
-   How writes are stopped.
-   How post-cutover transactions are preserved.
-   Whether reverse migration is supported and tested.
-   Whether backup restoration is required.
-   Expected downtime and possible data-loss window.
-   How legacy write access is safely re-enabled.
-   How reconciliation is repeated.

Restoring a backup is not automatically a safe rollback if new
transactions have been created after cutover.

------------------------------------------------------------------------

# 11. Workflow, Approvals, and Document Lifecycle

The workflow engine must support, as required by approved policy:

-   Configurable workflow definitions.
-   Multiple approval levels.
-   Separation of `Approved` and `Posted`.
-   Backend-only approval decisions.
-   Immutable approval history.
-   Snapshot of workflow configuration at submission.
-   Delegation only under approved rules.
-   Idempotent approval and posting.
-   Rejection, return, cancellation, and reversal.
-   Notifications and escalation according to approved policy.
-   Separation-of-duties controls.

Potential states such as `Draft`, `Submitted`, `Under Review`,
`Approved`, `Posted`, `Rejected`, `Returned`, `Cancelled`, and
`Reversed` are design candidates only. Validate the real lifecycle per
document type. Do not impose one universal state machine on all modules.

Posting must be transactional. Posted financial records must not be
silently edited or deleted. Corrections must use approved
reversal/correction workflows that preserve both histories.

------------------------------------------------------------------------


---

# 11. Legacy Data Defects & Migration Exceptions Policy (v1.4.5)

This policy governs how imperfect, incomplete, conflicting, or financially incorrect legacy data is handled during migration. Silent correction of historical financial values is forbidden.

## 11.1 Classification of legacy data

Every record or balance set discovered during migration must be classified into one of the following:

| Class | Description | Handling |
|-------|-------------|----------|
| **Clean** | Data is complete, consistent, and matches supporting documents | Normal migration |
| **Completable** | Data is incomplete but can be completed from reliable secondary sources or with documented rules | Complete under documented rules; record the completion action and source |
| **Quarantine** | Data is conflicting, orphaned, duplicated, or cannot be confidently mapped | Isolate from production balances; retain original values; require review before any use in operational or financial reports |
| **Financial Exception** | Balances or monetary values that do not match supporting documents or known correct figures | Must not be treated as authoritative. Follow the financial exception procedure below |

## 11.2 Financial Exception procedure (mandatory)

When a legacy balance or monetary figure is known or suspected to be incorrect:

1. **Preserve the original value** and its source (file, record ID, timestamp, original system).
2. **Record the difference** between the legacy value and the supported correct value.
3. **Document the reason** for the difference if known (missing documents, prior manual adjustment, system bug, etc.).
4. **Do not overwrite** the historical legacy value in place.
5. **Require explicit review and approval** by the designated financial authority (normally CFO or authorized finance owner) before any correcting entry is posted.
6. **Post an approved adjustment / reconciliation entry** that links to the original legacy record, states the reason, and carries full audit metadata (who, when, approval reference).
7. **Retain both** the original legacy value and the correcting entry permanently for audit.

Creating fictitious historical documents solely to force a balance to zero or to hide a difference is prohibited.

## 11.3 Quarantine rules

- Quarantined records must be clearly flagged and excluded from operational balances, trial balance, and management reports until released.
- A quarantine register must be maintained (record ID, reason, owner, status, resolution decision).
- Release from quarantine requires documented decision and, for financial impact, financial approval.

## 11.4 Migration reporting requirements

Every migration run that encounters non-Clean data must report:
- Counts and totals by class (Clean / Completable / Quarantine / Financial Exception).
- List of Financial Exceptions with original value, proposed correct value, and status of approval.
- Confirmation that no silent overwrites of historical monetary values occurred.

## 11.5 Relation to opening balances

Opening balances in the new system must be derived only from:
- Clean migrated data, or
- Completable data that has been completed under approved rules, or
- Explicitly approved adjustment entries arising from Financial Exceptions.

Unapproved Quarantine or Financial Exception amounts must not flow into live opening balances.
