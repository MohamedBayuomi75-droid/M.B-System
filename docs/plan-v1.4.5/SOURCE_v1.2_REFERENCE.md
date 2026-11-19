# ERP MASTER IMPLEMENTATION PLAN

## General Contracting Company --- Legacy Desktop System to Internal Web ERP

**Version:** 1.2\
**Date:** 19 November 2026\
**Status:** Revised master plan --- submitted for review and approval\
**Supersedes:** Version 1.1\
**System:** Existing Electron application to be modernized into an
internal Web ERP and installable PWA\
**Business domain:** General contracting company\
**Document owner:** Company management\
**Technical execution:** Claude Code / Engineering team\
**Approval authority:** Company management and the designated
financial/administrative decision owners

------------------------------------------------------------------------

# Document Control and Interpretation

  -----------------------------------------------------------------------
  Item                                Rule
  ----------------------------------- -----------------------------------
  Current version                     1.2

  Supersedes                          ERP_MASTER_IMPLEMENTATION_PLAN v1.1

  Primary purpose                     Govern the controlled modernization
                                      of the existing application into a
                                      web-based ERP while preserving its
                                      business capabilities, visual
                                      identity, records, and approved
                                      rules

  Business decision source of truth   `OPEN_BUSINESS_DECISIONS.md`,
                                      approved ADRs, and signed approval
                                      records

  Implementation status source of     Actual source code, database state,
  truth                               runtime evidence, automated tests,
                                      and phase reports

  Execution model                     One approved phase/work package at
                                      a time; one business module at a
                                      time during migration

  Approval rule                       No automatic phase progression;
                                      explicit approval is required at
                                      every gate
  -----------------------------------------------------------------------

This plan distinguishes:

-   **Verified Current Fact:** confirmed directly from the inspected
    repository, runtime, or data.
-   **Confirmed Decision:** explicitly approved and recorded by the
    authorized decision owner.
-   **Target Architecture:** the intended future architecture; it must
    not be described as already implemented.
-   **Recommendation:** a proposed approach requiring approval where it
    changes policy, cost, risk, or scope.
-   **Open Business Decision:** a matter that must be decided by the
    authorized company owner.
-   **Needs Verification:** a reported or inferred condition that must
    be checked before implementation.

A source file, migration script, design document, successful build, or
passing limited test suite is not by itself proof that a business
capability is complete or production-ready.

------------------------------------------------------------------------

# 1. Project Objective and Scope

## 1.1 Objective

Transform the existing contracting-company application into a reliable,
secure, maintainable, auditable internal Web ERP with PWA capability,
while preserving:

1.  Existing business functionality and workflows.
2.  The current application's recognizable visual identity and user
    experience.
3.  Historical records, identifiers, document references, and
    attachments.
4.  Approved financial calculations and business rules.
5.  Business continuity during the migration.

The project is a controlled modernization, not a big-bang rewrite. The
legacy Electron application must remain available as a controlled
reference/fallback until each replacement module has passed acceptance
and its cutover has been explicitly approved.

## 1.2 Target functional scope

The target ERP must cover, as applicable to the verified legacy
inventory and approved business requirements:

-   Dashboard, KPIs, alerts, and management follow-up.
-   Tasks, notifications, and internal workflow.
-   Customers, projects, contracts, work orders, and project documents.
-   Client certificates, claims, collections, guarantees, and customer
    balances.
-   Suppliers, subcontractors, supplier invoices, returns, deductions,
    and settlements.
-   Purchase requests, approvals, purchase orders, procurement, and
    purchasing controls.
-   Items, warehouses, stock receipts, issues, transfers, returns,
    adjustments, and stock balances.
-   Treasury, cash, banks, receipts, payments, and allocations.
-   Accounting, journals, sub-ledgers, general ledger, trial balance,
    and financial statements.
-   Project budgets, commitments, actual costs, cost centers, forecasts,
    and profitability.
-   Employees, workers, supervisors, attendance, timesheets, dues, and
    disbursements.
-   Equipment register, allocation, operating hours, maintenance, and
    utilization.
-   Safety, risks, incidents, corrective/preventive actions.
-   Quality, inspections, non-conformities, handover, and closure.
-   Workflow, approvals, delegation, document lifecycle, and separation
    of duties.
-   Users, roles, permissions, and data-access scope.
-   Archive, attachments, document versioning, printing, exports, and
    reports.
-   Backup, restore, disaster recovery, monitoring, and operational
    support.

This is the target scope. It is not a claim that every listed feature
currently exists or is complete.

## 1.3 Non-functional requirements

-   Arabic-first interface with correct RTL behavior.
-   Preserve current desktop visual identity while improving consistency
    and responsiveness.
-   Secure internal access over HTTPS.
-   Reliable multi-user concurrent operation.
-   Backend-enforced validation, authorization, and business rules.
-   Auditable financial and operational transactions.
-   Data integrity and referential integrity.
-   Verified backup, restore, and disaster recovery.
-   Maintainable modular architecture.
-   Responsive desktop, tablet, and mobile browser experience.
-   Installable PWA with a clearly defined online/offline policy.
-   Measurable performance, availability, and operational health.
-   Versioned releases, safe updates, and rollback procedures.

## 1.4 Non-negotiable preservation principle

No existing feature, page, field, calculation, report, workflow,
permission, import/export behavior, print layout, or attachment
relationship may be removed or materially changed merely because it is
inconvenient to migrate. Each item must be inventoried, mapped to its
target replacement, tested, and accepted. A proposed removal or redesign
requires an explicit decision.

------------------------------------------------------------------------

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

# 3. Confirmed Decisions and Decision Governance

## 3.1 Confirmed project constraints

Unless superseded by a newer authoritative approval:

  -----------------------------------------------------------------------
  Area                                Confirmed decision
  ----------------------------------- -----------------------------------
  System scope                        Internal company system

  Frontend target                     Angular

  UI foundation                       Angular Material, customized to
                                      preserve the existing design

  Backend target                      NestJS

  Database target                     PostgreSQL

  Application architecture            Modular Monolith

  Reverse proxy                       Nginx

  Deployment target                   Server inside the company

  Attachments                         Inside PostgreSQL, subject to
                                      performance and recovery validation

  Delivery model                      Internal Web App + PWA

  Monetary precision                  4 decimal places

  Monetary rounding                   `HALF_UP`

  Document numbering                  `NO_GAPS`, implemented
                                      transactionally

  Accounting model                    Double-entry accounting, activated
                                      in controlled stages

  Interface                           Arabic-first, RTL
  -----------------------------------------------------------------------

## 3.2 CFO approval scope

All decisions explicitly covered by the approved Financial Calculation
Engine plan are treated as approved by the CFO, within the exact scope
of that plan and its linked decision records.

This approval does not extend to unrelated future business rules, new
accounting policies, new modules, or decisions outside the approved
calculation-engine scope.

Statutory tax, withholding, stamp, and other legally regulated rates or
treatments must remain inactive until verified against current official
legal sources and reviewed by the company's tax advisor or authorized
tax professional.

## 3.3 Financial precision

-   Use PostgreSQL `NUMERIC` for monetary and other precision-sensitive
    values.
-   Use a decimal-safe backend calculation library.
-   JavaScript `Number` must not be the authoritative financial
    representation.
-   Preserve 4-decimal monetary precision and `HALF_UP`.
-   Define the rounding point for each formula from the approved rule.
-   Do not round intermediate values unless the approved formula
    requires it.
-   Store sufficient calculation details to reproduce and explain the
    result.
-   Do not silently recalculate or rewrite historical values.
-   Historical corrections require a documented, approved
    correction/migration process.

## 3.4 `NO_GAPS` numbering

Do not rely on ordinary PostgreSQL `SERIAL`, `IDENTITY`, or sequences
for gapless committed numbering.

Required behavior:

1.  Allocate the number inside the same transaction that creates the
    document.
2.  Lock the relevant numbering-scope row or use another proven
    serialization mechanism.
3.  A rolled-back document creation must not consume the number.
4.  A committed and issued number must never be reused, even if the
    document is later cancelled.
5.  Preserve cancelled document numbers and their audit history.
6.  Do not invent the numbering scope or format; use approved decisions.
7.  Test concurrency, rollback, cancellation, retries, and server
    failures.
8.  Never hide or rewrite historical numbering gaps.

## 3.5 Decisions that must not be guessed

Unless an authoritative approval exists, treat these as open:

-   Approval levels, monetary limits, roles, and named approvers.
-   Delegation and substitution rules.
-   Chart of accounts and journal templates.
-   Accounting effective date and opening-balance policy.
-   Currency and exchange-rate policy.
-   Quantity and unit-of-measure precision.
-   Numbering scope and format beyond `NO_GAPS`.
-   Inventory valuation, costing, negative-stock, and adjustment policy.
-   Procurement and supplier-selection policy.
-   Payroll, labor dues, overtime, and settlement rules.
-   Equipment depreciation and cost allocation.
-   Cost-center and project-cost allocation rules.
-   Bank reconciliation and payment authorization policy.
-   Statutory tax rates and treatments pending professional review.
-   Backup RPO, RTO, retention, offsite location, key custody, and test
    frequency.
-   Audit retention periods.
-   User/device counts, server sizing, and service-level targets.

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

# 7. Target Technical Architecture

## 7.1 Frontend --- Angular

-   Feature-based organization.
-   Arabic-first RTL design system.
-   Customized Angular Material/CDK.
-   Reusable tables, forms, dialogs, filters, navigation, and feedback
    components.
-   Clear separation between presentation and business logic.
-   Route guards for user experience only; backend remains
    authoritative.
-   Accessible keyboard navigation and readable error states.
-   PWA service worker with safe versioning.
-   No direct database access from the browser.
-   No authoritative financial calculations in the frontend.

## 7.2 Backend --- NestJS Modular Monolith

Organize by business domain, with explicit boundaries and ownership.

Each domain should contain appropriate:

-   Module registration.
-   Controllers/API endpoints.
-   Application services/use cases.
-   Domain entities and business rules.
-   Repositories/data access.
-   DTOs and validation.
-   Authorization policies/guards.
-   Transaction boundaries.
-   Domain events/outbox where required.
-   Tests and module documentation.

Controllers must not contain business calculations. Avoid a giant shared
helper/service that recreates the current monolithic JavaScript problem.

Do not introduce microservices unless measured requirements justify
their complexity and management approves the change.

## 7.3 Database --- PostgreSQL

-   Relational tables for core business entities.
-   Explicit foreign keys, unique constraints, check constraints, and
    not-null constraints.
-   Indexes based on measured queries.
-   `NUMERIC` for monetary/precision-sensitive values.
-   Transactional financial, inventory, numbering, and approval
    operations.
-   Consistent timestamps and timezone handling.
-   Data lineage and auditability.
-   Version-controlled schema migrations.
-   Tested forward recovery and rollback strategy.
-   JSONB only where genuinely justified for flexible attributes or
    controlled transition.

A module is not considered relationally migrated if its primary business
records remain undocumented generic JSON blobs.

## 7.4 Four-layer code organization

Preserve the agreed conceptual layers:

1.  Presentation.
2.  Services / application and domain logic.
3.  Data access.
4.  Utilities.

Utilities must not become a dumping ground for hidden business rules.
Shared components must remain reusable without creating uncontrolled
dependencies between business domains.

## 7.5 API design --- replace whole-data exchange

The current whole-data API pattern must not be carried into the target
ERP as the primary architecture.

Target API requirements:

-   Domain-oriented endpoints and use cases.
-   DTO validation and explicit response contracts.
-   Pagination, filtering, sorting, and bounded queries.
-   No unrestricted whole-database download to the browser.
-   No client-side merge of authoritative business records.
-   Per-operation authorization.
-   Project/department/branch/record scope where approved.
-   Transactional writes and concurrency control.
-   Idempotency keys for retryable critical operations.
-   Consistent error codes and correlation IDs.
-   API version compatibility and deprecation policy.
-   Rate limiting for sensitive endpoints.
-   OpenAPI documentation and contract tests.

## 7.6 Domain ownership and cross-module integration

Each domain must define its authoritative data ownership. Cross-module
communication should use explicit application services or domain events,
not direct manipulation of another module's tables.

For reliable asynchronous work, use an outbox/inbox or equivalent proven
mechanism with idempotent consumers. Do not rely on fire-and-forget
events for financial or stock-critical operations.

------------------------------------------------------------------------

# 8. Electron-to-Web and PWA Capability Replacement

Create a capability matrix for every Electron-specific feature before
implementation.

  -----------------------------------------------------------------------
  Existing capability     Web/PWA target approach Required verification
  ----------------------- ----------------------- -----------------------
  Native file open dialog Browser file picker and File types, size,
                          upload flow             permissions,
                                                  cancellation

  Native save dialog      Browser download with   Download behavior on
                          clear filename          supported browsers

  `shell.openPath`        Authorized              No arbitrary local-path
                          preview/download or     access
                          approved external link  

  Windows WIA scanner     Browser-supported       Actual company scanner
                          scanning only if        model, drivers, browser
                          device/browser supports security, deployment
                          it; otherwise evaluate  and support
                          a signed local scanner  
                          helper/bridge           

  Electron updater        PWA service-worker      Version notification,
                          update lifecycle        safe activation,
                                                  rollback

  Local filesystem        Upload/download API     Integrity, access
  attachments             backed by PostgreSQL    control, size, backup
                                                  and restore

  Desktop-specific APIs   Replace with browser    Capability and security
                          standards or approved   test
                          helper service          

  Desktop print/PDF       Browser print/PDF or    RTL layout, page
                          server-generated PDF    breaks, fonts, totals

  Excel export/import     Browser download/upload Formula safety,
                          or server-side          encoding, validation,
                          generation              large files
  -----------------------------------------------------------------------

Do not assume a PWA can access arbitrary local files, execute shell
commands, or replace Windows WIA functionality. If scanning is
business-critical, prove the selected solution on the actual scanner and
target Windows devices before retiring the Electron application.

## 8.1 PWA online/offline policy

PWA installation does not automatically provide safe offline ERP
operation.

Define explicitly:

-   Which pages may be cached.
-   Whether offline access is read-only.
-   Whether any drafts may be saved locally.
-   Which operations must require a live server connection.
-   How stale data is labeled.
-   How reconnection and conflict handling work.
-   How local data is protected on shared devices.
-   How logout clears sensitive cached data.
-   How updates are applied without interrupting an active transaction.

Do not permit offline financial posting, stock movement, document
numbering, or approval unless a separately approved conflict-safe
architecture is designed and tested.

------------------------------------------------------------------------

# 9. Security, Identity, Authorization, and Audit

## 9.1 Authentication and sessions

Verify and implement:

-   Secure password hashing.
-   Session/token expiry, revocation, and rotation.
-   Brute-force protection and rate limiting.
-   Secure cookie/token handling appropriate to the selected design.
-   Password reset and account recovery.
-   Account disablement and employee departure process.
-   Secret management outside source control.
-   Persistent session strategy where required.
-   Secure logout and device/session revocation.
-   MFA recommendation and approval decision, if not already mandated.

Do not invent company password or MFA policy.

## 9.2 Authorization

-   Deny access by default.
-   Enforce authorization on every protected backend operation.
-   Check action-level permissions, not merely whether a user has any
    permission in a broad section.
-   Apply record/project/department scope only according to approved
    policy.
-   Prevent unauthorized self-elevation.
-   Test direct API requests, ID substitution, cross-project access, and
    privilege escalation.
-   Separate read, create, edit, delete, approve, post, cancel, reverse,
    export, and administer privileges where the business policy
    requires.
-   Ensure file download and preview use the same authorization model as
    the parent record.

Frontend button hiding is not security.

## 9.3 Web security

Review and test:

-   XSS and unsafe HTML rendering.
-   Content Security Policy and security headers.
-   CSRF where applicable.
-   SQL injection and unsafe query construction.
-   CORS allowlist; do not use wildcard CORS for authenticated
    production APIs.
-   File upload validation, malware scanning, and content-type
    verification.
-   Dependency vulnerabilities and update policy.
-   TLS, certificate renewal, and secure internal network configuration.
-   Database least-privilege accounts.
-   Secrets and encryption-key protection.
-   Error responses that do not expose secrets or internal details.
-   Rate limiting and abuse protection.
-   Sensitive-data exposure in logs, exports, caches, and browser
    storage.

## 9.4 Audit trail

Capture relevant events:

-   Actor and effective delegated identity.
-   Timestamp and correlation/request ID.
-   Action and affected record.
-   Previous/new values for relevant fields.
-   Source module and document reference.
-   Approval, posting, cancellation, reversal, and permission changes.
-   Reason/comment where required.

Audit logs must not be editable by ordinary users. Do not log passwords,
tokens, or unnecessary sensitive content. Retention and archival periods
require an approved decision.

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

# 12. Accounting and Financial Calculation Roadmap

Accounting implementation, calculation-engine testing, and permission to
post live transactions are separate milestones.

## Stage 0 --- Existing rule documentation and golden cases

-   Inventory existing financial formulas.
-   Identify authoritative rule sources.
-   Verify the exact CFO-approved Financial Calculation Engine scope.
-   Compare legacy behavior with approved formulas.
-   Document invoices, returns, deductions, taxes, withholding,
    payments, receipts, balances, and rounding.
-   Create golden cases and edge cases.
-   Keep statutory items inactive pending official-source and
    professional review.

## Stage 1 --- Core accounting foundation

Subject to approved policy:

-   Chart of accounts.
-   Financial years and periods.
-   Journal entries and lines.
-   Journal validation and balancing.
-   General ledger.
-   Trial balance.
-   Period locks and audit.

## Stage 2 --- Treasury and banks

-   Cash/bank accounts.
-   Receipts and payments.
-   Allocations.
-   Bank reconciliation.
-   Cash movement reporting.
-   Reversal and correction workflows.

## Stage 3 --- Customer and supplier sub-ledgers

-   Customer/supplier balances.
-   Purchase invoices and returns.
-   Client certificates and collections.
-   Settlement documents.
-   Finance-approved posting templates.
-   Sub-ledger/general-ledger reconciliation.

## Stage 4 --- Project costing

-   Cost centers and project dimensions.
-   Material, labor, equipment, subcontractor, and overhead costs.
-   Budget, commitment, actual, and forecast.
-   Approved cost allocation.
-   Profitability and variance reporting.

## Stage 5 --- Reporting and close

-   Trial balance and general ledger.
-   Financial statements.
-   Period-end procedures.
-   Reconciliation and exception reports.
-   Project financial reports.

## Stage 6 --- Opening balances and controlled activation

-   Approved opening-balance method.
-   Trial migration.
-   Reconciliation.
-   Finance review and written sign-off.
-   Controlled activation by module/transaction type.
-   Post-activation monitoring.

No live posting until chart of accounts, journal templates, effective
date, opening balances, tax treatment, sub-ledgers, project dimensions,
reversal policy, permissions, segregation of duties, and reconciliation
tests are approved and passed.

------------------------------------------------------------------------

# 13. Module Migration Strategy and Dependencies

Create `MODULE_DEPENDENCY_MAP.md` from actual source code and verified
business workflows.

For every module, document:

-   Upstream and downstream dependencies.
-   Data ownership.
-   Shared reference data.
-   APIs/events.
-   Permission dependencies.
-   Financial and inventory side effects.
-   Migration blockers.
-   Golden and acceptance tests.
-   Cutover and rollback.

Candidate domains include:

-   Identity, users, roles, and permissions.
-   Projects and contracts.
-   Customers and client certificates.
-   Suppliers and subcontractors.
-   Procurement and purchase requests.
-   Inventory and warehouses.
-   Invoices, returns, payments, and receipts.
-   Treasury and accounting.
-   Cost centers and project costing.
-   Labor and employees.
-   Equipment and maintenance.
-   Safety and risks.
-   Quality and handover.
-   Workflow and approvals.
-   Attachments, archive, and reports.

The module order is a planning hypothesis, not an approved sequence.
Select the final order after dependency discovery, risk assessment, data
ownership review, and testability analysis.

A module is not complete because its screens or API endpoints exist. It
must pass functional, data, security, integration, performance, visual
parity, UAT, and recovery acceptance.

------------------------------------------------------------------------

# 14. Delivery Phases and Approval Gates

Each phase has a Before Report, explicit scope approval, implementation,
test evidence, After Report, review, and explicit next-phase approval.
Claude Code must stop at every gate.

## Phase 0 --- Repository and Environment Safety Check

**Purpose:** Establish a safe working baseline.

Activities: - Verify repository, branch, commit, working tree, and
remote state. - Identify uncommitted user work and protect it. - Verify
environment and test commands. - Identify production vs development
data. - Verify available backups without modifying data. - Confirm the
exact project root and authoritative documents.

Restrictions: - No code, schema, or business-data changes. - Do not
overwrite user work. - Do not run destructive commands.

Deliverables: - Repository/environment baseline. - Protected-work
report. - Initial risk/blocker list.

Gate: user approves proceeding to Phase 1.

## Phase 1 --- Documentation, Decision Reconciliation, and Verified Baseline

Activities: - Reconcile decisions and ADRs. - Verify actual stack
against target stack. - Reconcile documentation conflicts. - Inventory
modules and dependencies. - Create risk register and acceptance
matrix. - Identify open business decisions and owners. - Produce
realistic estimates with assumptions.

Deliverables: - Updated master plan. - Target architecture. - Decision
reconciliation report. - Verified baseline report. - Functional
inventory status. - Preliminary dependency map. - Risk register. -
Acceptance matrix and estimates.

Restrictions: documentation and read-only inspection only. No code,
schema, or data changes.

Gate: no unexplained decision conflict; baseline claims are
evidence-backed; user approves Phase 2.

## Phase 2 --- Current-System Security and Backup/Restore Proof

Activities: - Assess current authentication, authorization, XSS, file
handling, APIs, CORS, sessions, secrets, and logs. - Identify critical
vulnerabilities and containment measures. - Define backup scope and key
custody. - Prove backup integrity. - Restore into an isolated
environment. - Verify restored application and representative
workflows. - Define RPO/RTO options for management decision.

Deliverables: - Security assessment and remediation plan. -
Backup/restore design and evidence. - Restore-test report. - Disaster
recovery runbook. - Residual-risk register.

Gate: critical risks remediated or formally blocked from production;
restore proven; owners and open decisions documented.

## Phase 3 --- Legacy Functional, Visual, and Data Discovery

Activities: - Inventory every page, action, workflow, formula, report,
import/export, and permission. - Capture screenshots and design
tokens. - Inventory JSON schema/version migrations and users. -
Inventory attachments and file references. - Document Electron-only
capabilities. - Create golden business test cases. - Create
legacy-to-target traceability matrix. - Identify defects, duplicates,
and incomplete features without deleting them.

Deliverables: - Complete functional inventory. - Visual baseline and
design-system specification. - Data dictionary. - Formula catalogue and
golden tests. - Electron capability matrix. - Attachment inventory. -
Module dependency map. - Traceability matrix.

Gate: every discovered critical capability is classified and mapped;
business owners review unresolved rules.

## Phase 4 --- Target Architecture and Foundation

Activities: - Establish Angular frontend and customized RTL design
system. - Establish NestJS Modular Monolith. - Establish PostgreSQL and
migration tooling. - Establish API conventions, DTO validation, error
handling, logging, and transactions. - Establish identity and backend
authorization foundations. - Establish automated build/test/lint
pipelines. - Establish development, test/staging, and production
separation. - Establish PWA foundation and safe update policy. -
Establish deployment automation and secrets management.

Deliverables: - Reproducible development/test environments. -
Architecture skeleton. - Database migration baseline. - API standards
and OpenAPI. - Design system and shared UI foundation. - CI pipeline and
developer documentation.

Gate: reproducible setup, automated checks, RTL foundation, security
baseline, and architecture review pass. No module is considered migrated
because a placeholder exists.

## Phase 5 --- Shared Business and Platform Foundations

Activities: - Users, roles, permissions, and scope enforcement. - Audit
trail. - Attachments and archive. - Notifications. - Document
identity/versioning. - Approval engine foundation. - Transactional
`NO_GAPS` numbering. - Idempotency and concurrency controls. - Shared
reference data and common services.

Gate: authorization, audit, attachment integrity, numbering
concurrency/rollback, and idempotency tests pass. Real approval policy
remains inactive until approved.

## Phase 6 --- First Pilot Module and Migration Rehearsal

Select one bounded module based on dependency analysis and business
value.

Activities: - Complete its legacy traceability. - Implement relational
schema and domain API. - Implement Angular screens with visual parity. -
Implement permissions, audit, and workflow. - Run golden, integration,
E2E, and visual regression tests. - Run repeated test migrations and
reconciliation. - Complete UAT and cutover rehearsal.

Gate: all module criteria pass and user explicitly approves the pilot
cutover. Do not migrate a second module automatically.

## Phase 7 --- Core Operational Modules

Migrate one module/work package at a time according to the approved
dependency map. Candidate areas: customers, projects, suppliers,
procurement, inventory, invoices, returns, payments, collections,
contracts, and client certificates.

Each module follows the same sequence: 1. Scope and dependency approval.
2. Functional/data discovery. 3. Schema and mapping approval. 4. Backend
implementation. 5. Frontend implementation and visual comparison. 6.
Permissions, audit, and workflow. 7. Automated tests. 8. Test migration
and reconciliation. 9. UAT. 10. Cutover/rollback rehearsal. 11. Explicit
approval. 12. Controlled migration and monitoring.

Gate: one module only per approved work package; signed reconciliation;
no unresolved critical/high defect unless formally accepted; cutover and
rollback tested.

## Phase 8 --- Labor, Employees, Equipment, and Field Operations

Activities: - Employees, workers, supervisors, attendance, timesheets,
and daily records. - Labor dues and disbursement workflows. - Equipment
register, allocation, operating hours, and maintenance. - Project
allocation and cost tracking. - Utilization and operational reports.

Gate: calculations match approved rules; disbursements are
authorized/auditable; equipment history is traceable; project costs
reconcile. Statutory/payroll treatments require appropriate professional
review.

## Phase 9 --- Safety, Risks, Quality, and Handover

Activities: - Safety/risk registers and incident investigation. -
Preventive/corrective actions. - Inspections and checklists. -
Non-conformities. - Initial/final handover. - Observations and closure
evidence.

Gate: ownership, statuses, evidence, audit, and closure are traceable;
project reporting reconciles.

## Phase 10 --- Accounting and Controlled Financial Activation

Activities: - Double-entry accounting foundation. - Treasury and
banks. - Customer/supplier sub-ledgers. - Approved posting templates. -
Project costing and cost centers. - Opening balances and
reconciliation. - Financial reporting and period close.

Gate: all financial activation criteria pass; trial balance balances;
sub-ledgers reconcile; statutory treatment has professional approval;
finance provides written sign-off. No automatic live posting.

## Phase 11 --- Reports, Dashboards, and Management Analytics

Activities: - Executive dashboard and KPIs. - Project progress, delays,
and overruns. - Contracts, certificates, and collections. -
Supplier/subcontractor dues. - Project costs, budgets, and
profitability. - Procurement and inventory. - Labor and equipment. -
Financial and audit reports. - Alerts and operational exceptions.

Gate: each KPI has an approved definition, source, refresh rule, owner,
and reconciliation test; permissions and performance pass.

## Phase 12 --- Full-System Verification and Operational Readiness

Activities: - End-to-end cross-module tests. - Authorization and
segregation-of-duties tests. - Concurrency/idempotency tests. -
Financial precision, rounding, and numbering tests. - Legacy/target
reconciliation. - Visual regression and responsive-browser tests. -
Attachment and archive verification. - Backup/restore and disaster
recovery exercise. - Security and performance/load testing. - Failure,
retry, and rollback simulations. - UAT and user training. - Defect
closure.

Gate: critical workflows pass; reconciliation signed; restore proven; no
open critical defects; high risks accepted by authorized management;
readiness report approved.

## Phase 13 --- Controlled Production Deployment and Go-Live

Activities: - Prepare company server, network, firewall, DNS/fixed IP,
and HTTPS. - Deploy approved PostgreSQL, NestJS, Angular, Nginx, and
containers. - Configure monitoring, logs, backups, alerts, and support
ownership. - Create approved users and permissions. - Execute final
migration and reconciliation. - Test supported browsers/devices and PWA
installation. - Train users and distribute operating instructions. -
Start controlled go-live with rollback readiness. - Monitor
transactions, performance, data integrity, and user feedback.

Gate: - Production matches approved architecture. - Final migration is
reconciled and signed. - Backup/restore and monitoring are
operational. - Support and escalation owners are assigned. - Management
signs go-live approval.

## Phase 14 --- Stabilization and Legacy Retirement

Activities: - Monitor production through the approved stabilization
period. - Reconcile new-system results against expected business
controls. - Resolve defects and assess residual risks. - Confirm all
required reports, archives, and attachments. - Preserve the legacy
application and data according to retention policy. - Prepare controlled
read-only archival or retirement.

Gate: legacy retirement only after management explicitly approves, all
modules are accepted, reconciliation is signed, and required records
remain accessible.

------------------------------------------------------------------------

# 15. Backup, Restore, and Disaster Recovery

## 15.1 Backup scope

A complete recovery set must include:

-   PostgreSQL database, including attachment binaries.
-   Required application configuration.
-   Deployment definitions and versioned release artifacts.
-   Certificates and secrets, protected separately.
-   Encryption keys or documented key-recovery mechanism.
-   Audit and operational records needed for recovery.

## 15.2 Controls requiring approval

Define and approve:

-   Backup frequency and schedule.
-   Retention periods and copy count.
-   Offline/offsite copy location.
-   Encryption at rest and in transit.
-   Key custody, access, rotation, and recovery.
-   Integrity verification.
-   Failure alerts and escalation.
-   Responsible owner and substitute.
-   Ransomware and unauthorized-deletion protection.
-   RPO and RTO.
-   Restore-test frequency.

Do not invent RPO/RTO values. Present options using measured business
impact, data volume, infrastructure, and cost.

## 15.3 Restore testing

Test database restoration, attachments, application startup,
authentication, representative workflows, financial/inventory
reconciliation, key recovery, measured RPO/RTO, and service reopening. A
successful backup job is not proof of recoverability.

------------------------------------------------------------------------

# 16. Performance, Capacity, and Scalability

Measure or estimate with explicit assumptions:

-   Concurrent users.
-   Active projects and documents.
-   Daily transaction volume.
-   Database and attachment growth.
-   Largest reports and exports.
-   Peak usage periods.
-   Network and client-device constraints.
-   Backup and restore data volume.

Define measurable response-time and throughput targets only after
baseline measurement and approval. Test with representative data, not
empty databases. Document CPU, memory, storage, network, PostgreSQL
maintenance, growth thresholds, alerts, and upgrade path before server
procurement.

------------------------------------------------------------------------

# 17. Monitoring, Logging, and Operational Support

Monitor:

-   Frontend/API availability and health.
-   Database connections, storage, and performance.
-   CPU, memory, disk, and network.
-   Background jobs and scheduled tasks.
-   Failed logins and authorization anomalies.
-   Backup success/failure and backup age.
-   Restore-test status.
-   Application exceptions and failed critical business operations.
-   Certificate expiration.
-   Database and attachment growth.

Define alert severity, recipients, delivery channel, acknowledgement,
escalation, and fallback. Do not assume email or messaging integration
exists.

Assign support ownership for first-line users, application,
database/infrastructure, security incidents, and financial transaction
incidents. Record emergency coverage and escalation paths.

------------------------------------------------------------------------

# 18. Testing and Acceptance Framework

## 18.1 Required test layers

-   Unit tests.
-   Domain/service tests.
-   API/contract tests.
-   Database constraint and migration tests.
-   Permission and security tests.
-   Concurrency and idempotency tests.
-   End-to-end business workflow tests.
-   Golden-master calculation tests.
-   Data migration and reconciliation tests.
-   Visual regression tests.
-   Responsive/browser compatibility tests.
-   Import/export/print tests.
-   Attachment integrity and authorization tests.
-   Performance/load tests.
-   Backup/restore and disaster recovery tests.
-   UAT.

## 18.2 Test evidence

For every test run, record:

-   Exact command and commit/build.
-   Environment and configuration.
-   Test suite and scope.
-   Passed, failed, skipped, and not-run counts.
-   Failure details and evidence.
-   Known limitations.
-   Whether the result blocks acceptance.

Never claim a test passed unless it actually ran.

## 18.3 Golden business cases

Each case must include inputs, expected outputs, calculation breakdown,
rounding behavior, document state, permissions, audit expectations, and
failure/edge cases. Expected results must come from approved rules or
authorized subject-matter experts, not from the implementation under
test.

## 18.4 Definition of Done --- per module

A module is complete only when:

-   Functional specification and business rules are approved.
-   Legacy feature traceability is complete.
-   Visual parity is accepted.
-   Dependencies and data ownership are documented.
-   Schema and migrations are reviewed.
-   Backend and frontend workflows are complete.
-   Authorization and audit are verified.
-   Automated tests pass.
-   Golden cases pass.
-   Data migration and reconciliation pass.
-   Performance is acceptable against approved targets.
-   Backup/restore impact is validated.
-   UAT is signed.
-   Documentation and user instructions are updated.
-   Defects and residual risks are recorded.
-   Cutover and rollback are approved.
-   Explicit module acceptance is recorded.

## 18.5 Defect severity

-   **Critical:** data loss/corruption, unauthorized access, incorrect
    financial posting, or system-wide outage. Blocks release.
-   **High:** major workflow failure, material calculation error, or
    significant control failure. Blocks release unless formally accepted
    with mitigation by authorized management.
-   **Medium:** limited issue with safe workaround.
-   **Low:** cosmetic or minor usability issue.

------------------------------------------------------------------------

# 19. Release, Deployment, and Change Management

Every release must include:

-   Version and build identifier.
-   Commit hash.
-   Database migration version.
-   Environment/configuration record.
-   Release notes.
-   Test evidence.
-   Known issues.
-   Deployment instructions.
-   Rollback/forward-recovery instructions.
-   Compatibility statement for frontend, API, and database.

Use backward-compatible database changes where practical. Do not deploy
incompatible frontend/API/schema combinations. Protect unsaved work
during PWA updates. Keep secrets out of source control and build
artifacts.

Changes to scope, architecture, business rules, data mappings, or
migration strategy require documented review and approval.

------------------------------------------------------------------------

# 20. Project Estimates and Progress Reporting

Do not invent a total delivery duration before discovery.

For each phase/module, estimate:

-   Scope and assumptions.
-   Dependencies and blockers.
-   Engineering effort range.
-   Testing and UAT effort.
-   Migration/reconciliation effort.
-   Security/infrastructure effort.
-   Risk allowance.
-   Confidence level.
-   Required business-owner availability.

Distinguish engineering effort from calendar duration.

Track status using:

`Not Started`, `In Progress`, `Blocked`, `Partially Implemented`,
`Implemented`, `Verified`, `Accepted`.

Implemented is not Verified. Verified is not Accepted.

------------------------------------------------------------------------

# 21. Mandatory Phase Reports and Approval Rules

## 21.1 Before Report

Must include:

-   Phase/work-package ID.
-   Objective and exact scope.
-   Out-of-scope items.
-   Current baseline and evidence.
-   Files/modules/tables/services expected to change.
-   Dependencies and affected modules.
-   Business decisions required.
-   Data and migration impact.
-   Security impact.
-   Visual/functional parity impact.
-   Test plan and acceptance criteria.
-   Backup/restore requirements.
-   Rollback/recovery plan.
-   Estimate and uncertainty.
-   Explicit approval request.

## 21.2 After Report

Must include:

-   Summary of completed work.
-   Files created/changed/removed.
-   Actual behavior and UI changes.
-   Database/schema changes.
-   Commands and tests actually run.
-   Tests not run and why.
-   Migration counts and reconciliation evidence.
-   Visual comparison results.
-   Acceptance criteria status.
-   Defects and severity.
-   Security findings.
-   Remaining decisions and blockers.
-   Residual risks.
-   Rollback/recovery readiness.
-   Actual effort vs estimate.
-   Recommendation: Accept / Correct / Reject / Block.
-   Explicit request for next approval.

## 21.3 Approval rules

-   No phase starts without approval of its exact scope.
-   No phase automatically advances.
-   No module migration without module-specific approval.
-   No production migration without explicit authorization.
-   No live accounting activation without explicit finance
    authorization.
-   Approval of this plan does not automatically approve every future
    implementation detail.
-   Silence is not approval.
-   New risks, scope changes, or unexpected data conditions require a
    stop and decision.
-   User work and uncommitted changes must never be overwritten.

------------------------------------------------------------------------

# 22. Risk Register --- Minimum Required Risks

Create and maintain `ERP_RISK_REGISTER.md`. At minimum include:

  -----------------------------------------------------------------------
  Risk                    Potential impact        Required mitigation
  ----------------------- ----------------------- -----------------------
  Incomplete legacy       Lost business           Full traceability and
  discovery               functionality           owner review

  Visual regression       User disruption and     Screenshot baseline and
                          adoption failure        visual regression

  Incorrect formula       Wrong balances and      Golden cases and
  migration               decisions               finance review

  Incorrect data mapping  Corrupt or misleading   Mapping specification
                          records                 and reconciliation

  Attachment loss/path    Missing evidence and    Checksum migration and
  mismatch                documents               orphan report

  Uncontrolled            Divergent balances and  One authoritative
  dual-writing            duplicates              writer per domain

  Failed production       Downtime/data loss      Verified backup,
  migration                                       rehearsal, approval,
                                                  rollback

  Privilege escalation    Unauthorized access     Backend authorization
                                                  and security tests

  Whole-data API retained Excessive exposure and  Domain APIs and scoped
                          concurrency risk        access

  Electron capability gap Lost scanner/file/print Capability matrix and
                          workflows               device proof

  PWA cache/version       Incompatible clients    Safe update/version
  mismatch                                        policy

  Database/attachment     Performance and backup  Capacity tests and
  growth                  issues                  monitoring

  Numbering race          Duplicate/missing       Transactional
                          numbers                 allocation and
                                                  concurrency tests

  Unverified tax          Legal/financial         Keep inactive pending
  treatment               exposure                official/professional
                                                  review

  Failed restore          Prolonged outage/data   Periodic full restore
                          loss                    exercises

  Inadequate UAT          Operational rejection   Representative users
                                                  and signed acceptance

  Unmonitored service     Delayed response        Health checks, alerts,
  failure                                         and ownership

  Uncontrolled scope      Delays and instability  Scope/change control
  growth                                          and approval gates
  -----------------------------------------------------------------------

For each risk record probability, impact, severity, owner, mitigation,
contingency, due date, status, and residual risk. Do not assign an owner
by guessing.

------------------------------------------------------------------------

# 23. Project Success Criteria

The ERP is ready for full production only when:

-   Existing critical functions are preserved or have explicitly
    approved replacements.
-   Legacy feature traceability is complete.
-   Visual and functional parity is accepted.
-   All migrated data is reconciled and traceable.
-   Attachments are migrated, checksummed, linked, protected, and
    recoverable.
-   Financial calculations match approved rules and golden cases.
-   Live accounting posting is activated only after its approval gate.
-   `NO_GAPS` numbering passes transaction/concurrency tests.
-   Backend permissions and data scope are enforced.
-   Approval and posting are separate and auditable.
-   Relational integrity constraints protect data.
-   Browser/PWA replacements for Electron capabilities are proven.
-   Backup and full restore have been tested.
-   Disaster recovery has been exercised.
-   Performance meets approved measured targets.
-   Monitoring and escalation are operational.
-   Critical workflows pass E2E tests and UAT.
-   Critical defects are closed.
-   Residual high risks are formally accepted.
-   Users are trained and support ownership is defined.
-   Production cutover and legacy retirement are formally approved.

A build succeeding or code being written is not proof of project
completion.

------------------------------------------------------------------------

# 24. Final Instructions to Claude Code

You are responsible for technical inspection, planning, implementation
within the approved scope, testing, and evidence-based reporting. You
are not authorized to invent company policy or grant yourself approval.

1.  Treat this document as the master plan, subject to authoritative
    decisions and later signed-off changes.
2.  Inspect the actual repository, database, and runtime before claiming
    implementation status.
3.  Distinguish verified current architecture from target architecture.
4.  Re-check the current repository; the inspected archive is a baseline
    reference, not a guarantee that the repository has not changed.
5.  Preserve all existing user work and uncommitted changes.
6.  Reconcile decision records and ADRs before implementation.
7.  Treat only decisions explicitly covered by the approved Financial
    Calculation Engine plan as CFO-approved.
8.  Keep statutory tax/withholding/stamp rates inactive pending
    official-source verification and professional review.
9.  Preserve 4-decimal monetary precision, `HALF_UP`, and transactional
    `NO_GAPS`.
10. Separate `Approved` from `Posted`.
11. Preserve existing visual identity and functional behavior unless an
    improvement is explicitly approved.
12. Do not remove a legacy feature without explicit approval.
13. Do not use the legacy UI as the sole specification; inventory
    behavior and verify it.
14. Do not carry whole-data GET/POST synchronization into the target
    architecture as the primary API.
15. Do not assume PWA can replace native Windows scanner or filesystem
    capabilities.
16. Do not migrate attachments without checksum, metadata, relationship,
    authorization, and restore validation.
17. Never delete or silently alter original business data.
18. Never run production migrations without an approved plan, verified
    recoverable backup, tested restore, and explicit authorization.
19. Never invent approval limits, chart of accounts, roles, tax rates,
    numbering scope, or other business policies.
20. Use one authoritative write system per business domain; no
    uncontrolled dual-write.
21. Execute one phase at a time and one module at a time during
    migration.
22. Produce the mandatory Before Report and wait for approval.
23. Produce the After Report with reproducible evidence.
24. Stop after every phase and wait for explicit approval.
25. If actual repository conditions contradict the plan, stop affected
    work and document the conflict.
26. If an unexpected data-integrity, security, or financial risk
    appears, stop the affected operation and preserve evidence.
27. Never claim a test, migration, backup, restore, or feature passed
    unless it was actually executed and validated.
28. Do not retire the legacy system until all required modules are
    accepted, reconciliation is signed, and management authorizes
    retirement.

## First action required

Start with **Phase 0 and Phase 1 only**.

-   Phase 0 is limited to repository/environment safety checks.
-   Phase 1 is limited to read-only inspection, documentation, and
    decision reconciliation.
-   Do not modify application code, database schemas, migrations, or
    business data.
-   Do not install dependencies or run destructive/formatting commands
    without approval.
-   Do not begin Phase 2 automatically.

Deliver:

1.  Verified current-state baseline.
2.  Repository and working-tree safety report.
3.  Decision reconciliation report.
4.  Functional/module inventory status.
5.  Visual and functional discovery status.
6.  Preliminary dependency map.
7.  Risk register.
8.  Gaps and contradictions in the plan or repository.
9.  Proposed phase acceptance criteria.
10. Initial estimates with assumptions and confidence.
11. Exact decisions/information required from the company.

Then stop and request explicit approval for Phase 2.

------------------------------------------------------------------------

**Governing rule:** Data integrity, financial correctness, security,
preservation of business functionality, visual/functional acceptance,
and continuity of company operations take priority over implementation
speed. When a step could cause data loss, alter an approved rule,
activate a financial process, weaken a control, remove an existing
feature, or expand approved scope, stop and obtain explicit
authorization.
