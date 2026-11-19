# TECHNICAL IMPLEMENTATION SPECIFICATION

**Version:** 1.4.5 | **Date:** 19 November 2026  
**Purpose:** Define the target technical direction and engineering controls. It is not evidence that the target stack has already been implemented.

Read the Master Plan and Roadmap first. Apply only the parts relevant to the currently authorized WP. All architecture choices that materially affect scope, cost, security, data integrity, or operations require approved ADRs.

## 1. Technical implementation guardrails

- Build a Modular Monolith unless an approved ADR establishes a compelling reason for another architecture.
- Keep business rules out of UI components. UI calls application services; domain logic and financial formulas belong in backend/domain services.
- Enforce authorization, validation, numbering, and transaction rules on the server.
- Use explicit domain ownership and documented contracts for cross-module operations.
- Avoid whole-database payload exchange; use domain-oriented APIs and pagination/filtering.
- No uncontrolled dual-write during migration.
- No offline posting of financial or stock transactions unless separately designed, risk-assessed, and approved.
- Never represent a planned target component as implemented without repository/runtime evidence.


---

## Original v1.2 detailed technical requirements (retained)

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


---

# v1.4 Engineering Clarifications and Additional Controls

## 20. Architecture decisions and implementation evidence

The target stack in this plan is an approved direction, not permission to invent every implementation detail. Before implementation, record ADRs for material choices that remain unresolved, including ORM/data-access approach, migration tooling, API versioning and compatibility policy, session strategy, background-job mechanism, realtime transport, observability stack, deployment packaging, secrets/key management, and file/attachment size limits. For each ADR record context, options, decision, consequences, security/data implications, migration implications, owner, approval reference, and revisit conditions.

Do not select a new infrastructure dependency merely because it is familiar. Compare operational burden, maintainability, Windows/company-server support, backup/recovery impact, licensing, and team capability. A recommendation remains proposed until approved.

## 21. Financial and accounting integrity controls

The detailed financial calculation-engine decisions already approved by the CFO remain approved only within their documented scope. This section adds engineering controls; it does not approve new accounting policies, rates, thresholds, posting templates, or statutory treatment.

### 21.1 Monetary representation and calculation pipeline
- Use PostgreSQL `NUMERIC` with an explicitly documented precision/scale appropriate to each field; never use binary floating-point for authoritative monetary values.
- Preserve the approved 4-decimal monetary precision and `HALF_UP` rounding behavior. Specify at which business boundaries rounding occurs for each approved calculation; do not round intermediate values unless the approved rule requires it.
- Store source inputs, applied rule/version, calculation breakdown, rounded result, and relevant document references so a result can be reproduced and audited.
- Keep frontend calculations informational only. The backend is authoritative and must validate recalculated totals before approval/posting.
- Golden cases must cover positive/negative values, zero, fractional quantities, partial returns, discounts, deductions, tax/withholding inactive states, boundary values, and repeated recalculation. Expected results must come from approved rules, not the code under test.

### 21.2 Ledger and document lifecycle
Subject to approved accounting policy, design and test: chart of accounts; fiscal years and periods; journal headers/lines; balanced-entry validation; general ledger; trial balance; period close/lock; opening balances; reversal/correction; and reconciliation. Do not assume an account structure, posting template, period policy, or opening-balance treatment that is not documented and approved.

Every posted journal must be immutable in place. Corrections must use approved reversal/correction workflows with links to the original entry, reason, actor, timestamp, and approval. Approval is not posting; a document may be approved without being posted, and posting requires its own permissions, validations, and atomic transaction.

### 21.3 Idempotency, concurrency, and numbering
- Critical write operations must have an idempotency strategy so network retries cannot duplicate receipts, payments, invoices, stock movements, or journal entries.
- Enforce uniqueness and state transitions in the database as well as application services.
- Test concurrent approvals, posting, payment allocation, stock issue/receipt, and number allocation under realistic contention.
- Strict `NO_GAPS` numbering must use a transactionally locked counter/allocator whose allocation rolls back with the document transaction.
- **Confirmed cancellation policy (aligned with Master Plan §3.4):**
  1. Allocate the number inside the same transaction that creates the document.
  2. A rolled-back document creation must not consume the number.
  3. A committed and issued number must never be reused, even if the document is later cancelled.
  4. Cancelled documents retain their original number and full audit history.
  5. Never hide or rewrite historical numbering gaps.
- Numbering **scope and format** (document type, fiscal year, branch, or other dimension) remain an `OPEN-DECISION` only if not already specified in an approved record. Do not re-open the cancellation/reuse policy.
- Use atomic transactions or an approved outbox/inbox pattern for cross-module financial and inventory effects. Never rely on fire-and-forget event delivery for authoritative balances.

### 21.4 Reconciliation controls
Provide reconciliation between customer/supplier sub-ledgers and general ledger, inventory quantities and valuation, project cost ledgers and source documents, treasury balances and bank/cash records, and migrated opening balances. Differences must be visible, explainable, assigned, and resolved or formally accepted before activation.

## 22. Contracting-domain end-to-end process integration

Build a verified process and data-ownership map from actual legacy evidence and approved business workflows. The following are candidate end-to-end journeys, not assumptions that every step or policy already exists:

**Procure-to-pay:** purchase request → approval → quotation/comparison where applicable → purchase order → goods receipt/inspection → supplier invoice → payable validation → payment/settlement.

**Project-to-cash:** project/contract/work order → BOQ and approved budget → work execution and measurement → client certificate/claim → approval → invoice/settlement where applicable → collection → project financial result.

**Inventory-to-site:** purchase receipt/warehouse transfer → reservation/issue to project → consumption/return/adjustment → stock and project-cost reconciliation.

**Subcontractor cycle:** subcontract/assignment → measured work → subcontractor certificate → deductions/retention as approved → approval → payment → project-cost reconciliation.

**Resources and controls:** labor attendance/allocations and employee/worker dues; equipment assignment, operating hours, maintenance, and cost allocation; safety incidents and corrective actions; quality inspections, nonconformities, and handover records. Keep these domains separate where the approved module design requires, while defining their controlled interfaces.

For each journey document: initiating event, authoritative owner for each data entity, states and allowed transitions, actor/permission, validation, source/target document references, financial/stock/project-cost effect, transaction boundary, failure/compensation behavior, audit event, reports, and acceptance tests. Do not invent retention, deduction, measurement, or approval rules.

## 23. Security engineering and operational resilience

Create a threat model before production architecture approval. At minimum consider account compromise, privilege escalation, cross-project/tenant data exposure (where applicable), malicious uploads, attachment access bypass, injection/XSS/CSRF, insecure direct object references, secrets leakage, ransomware, insider misuse, backup theft, and compromised update/deployment artifacts. Map each threat to preventive/detective controls, owner, test, and residual risk.

Operational controls must include: least-privilege service/database accounts; separate environments and credentials; protected secret storage; dependency and vulnerability scanning; security patch ownership; centralized or protected logs; clock synchronization; certificate expiry monitoring; security-event alerts; incident response and evidence preservation; and a documented emergency access process. Do not expose credentials or sensitive business data in logs or generated reports.

## 24. Backup policy design and recovery runbook

Before production, an authorized owner must approve a backup policy containing: backup type and frequency; retention tiers; encrypted off-host/offline copy; access separation; key custody and recovery; integrity verification; failure alert and escalation; restore-test frequency; and named primary/alternate owners. Values for RPO, RTO, retention, and schedule remain `OPEN-DECISION` until approved.

The recovery runbook must be rehearsed in an isolated environment and include: incident declaration; containment; identification of last known-good backup; retrieval of deployment/configuration artifacts; key recovery; restore of PostgreSQL and attachment data; application version compatibility; integrity and referential checks; reconciliation of financial, inventory, and document counters; representative workflow smoke tests; measured recovery point/time; controlled service reopening; and post-incident review. A backup job status alone is insufficient.

## 25. Capacity, performance, and service objectives

Do not invent response-time, throughput, concurrency, uptime, or recovery targets. During discovery, measure current workload and collect management estimates for users, concurrent sessions, projects, documents, daily transactions, attachments, peak periods, report sizes, and growth. Propose tiered targets with test conditions and cost implications; obtain approval before using them as acceptance gates or purchasing infrastructure.

Performance tests must state dataset size/distribution, concurrency profile, workload mix, warm/cold cache conditions, hardware, network, database configuration, test duration, percentiles (including p50/p95/p99 where meaningful), throughput, error rate, and resource consumption. Include slow-query analysis, pagination limits, export/background-job behavior, and attachment throughput. Empty-database benchmarks are not representative.

## 26. Release, update, and rollback safety

For each release define compatibility among frontend, API, database schema, PWA cached assets, and background jobs. Prefer expand/migrate/contract database changes: deploy backward-compatible schema, migrate/reconcile, switch behavior under a controlled gate, and remove obsolete structures only after a separate approval. A rollback plan must state whether database rollback is safe; when not safe, define forward-recovery and restore requirements. Preserve user-entered drafts and prevent an update from interrupting an in-flight approval or posting operation.
