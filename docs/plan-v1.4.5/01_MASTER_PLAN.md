# ERP MASTER PLAN

**Version:** 1.4.5  
**Date:** 19 November 2026  
**Status:** Micro clarity fix over v1.4.4 — submitted for review and approval  
**System:** Legacy Electron application → internal Web ERP + installable PWA  
**Business domain:** General contracting company

> Start with `00_README_DOCUMENT_INDEX.md`. This document is the governing overview; detailed execution, engineering, migration, and acceptance requirements are maintained in the linked specialist documents.

## 1. Program objective

Modernize the existing contracting-company application into a secure, maintainable, auditable internal Web ERP while preserving verified legacy functionality, recognizable visual identity, historical records, identifiers, document relationships, approved calculations, and business continuity.

This is a controlled modernization, not an unverified big-bang rewrite. The legacy application remains a controlled reference/fallback until each replacement capability passes acceptance and its cutover is explicitly approved.

## 2. Scope boundaries

The target ERP scope is the union of:
- verified legacy capabilities that must be preserved (`LEGACY-PRESERVE`);
- explicitly approved changes (`APPROVED-CHANGE`);
- new capabilities approved through change control (`NEW-REQUIREMENT`);
- technical and operational requirements (`TECHNICAL`);
- unresolved matters tracked as `OPEN-DECISION`.

The target functional areas may include dashboard and alerts; tasks and workflow; customers, projects, contracts, and work orders; client certificates and collections; suppliers and subcontractors; procurement; inventory and warehouses; treasury and banking; accounting; project costing; employees, workers, and labor; equipment; safety and risks; quality and handover; users and permissions; archive, attachments, reports; backup, recovery, monitoring, and support. **This list is not proof that each capability exists in the legacy system.** The verified inventory determines what is parity work; new capabilities require explicit scope approval.

## 3. Non-negotiable principles

1. No silent removal or material change of an existing feature, field, formula, report, workflow, permission, import/export, print behavior, or attachment relationship.
2. Preserve the current application's recognizable visual identity while improving consistency, accessibility, and responsiveness through controlled, evidenced design changes.
3. Backend is authoritative for validation, authorization, financial calculations, numbering, and transaction integrity.
4. No financial or operational transaction may be treated as posted merely because it is approved.
5. No historical data rewrite, mass correction, or migration cutover without reconciliation, backup, tested recovery, and explicit approval.
6. One authoritative writer per data domain during coexistence; no uncontrolled dual-write.
7. No phase progression by silence. Every gate requires explicit approval.
8. Do not claim target technology, features, tests, or operational controls exist until verified in the live repository and runtime.
9. Do not introduce microservices, offline financial posting, new statutory rates, or unapproved organizational policies by assumption.
10. Keep the legacy system available as a reference/fallback until replacement acceptance and cutover approval.

## 4. Confirmed decisions and protected constraints

The following decisions are treated as confirmed only within their stated scope. The authoritative decision record is the combination of this section, section 4.1 below, approved ADRs, and the repository file `OPEN_BUSINESS_DECISIONS.md` (when present in the project repository — it is not part of this planning package).

**Financial and operational policies A–F** are detailed exclusively in §4.1. Do not treat the short bullet list below as a second independent source for those six policies.

- Target architecture direction: Angular frontend, NestJS Modular Monolith backend, PostgreSQL, Nginx reverse proxy, company-hosted internal server, Web application and installable PWA.
- Arabic-first RTL interface.
- Attachments are intended to be stored inside PostgreSQL, subject to measured performance, database growth, backup, and restore validation. If those measurements show unacceptable size, backup duration, or restore time, the approved fallback is file-system storage on the company server with metadata and integrity references kept in PostgreSQL (path/URI, checksum, size, MIME type, access control). Switching to the fallback requires an explicit decision record; it must not be done silently.
- Money precision: 4 decimal places (see also Policy context in §4.1).
- Rounding mode: `HALF_UP`.
- Document numbering: `NO_GAPS` (transactional allocation, no reuse on cancellation) — full rules in §3.4 and Technical Specification.
- Tax, withholding and stamp-duty rates remain inactive until verified against official Egyptian legal sources and reviewed by a qualified tax advisor (Policy C in §4.1).
- Approval and posting are distinct lifecycle states (Policy D in §4.1).
- No historical data or financial formula is changed merely as part of implementation.
- Company server deployment and data protection require verified backup and restore procedures (targets in Policy E, §4.1).
- The six financial/operational policies A–F are defined only in §4.1 and are closed decisions.

### 4.1 Confirmed financial and operational policies (from Financial Engine Specification v3.1)

The following policies are treated as **closed / approved** and must not be re-opened as OPEN-DECISION items unless an explicit formal change request is raised and approved:

**Policy A — Centralized Chart of Accounts and Project Cost Centers**
- One centralized Chart of Accounts for the company.
- Projects use independent project cost centers (not duplicated Charts of Accounts).
- Reporting must support both company-wide and project-level views.
- Project costs and revenues must remain traceable through the approved structure.

**Policy B — Inventory Valuation**
- Primary method: Moving Weighted Average for most items.
- Specific Identification for items requiring individual or batch-level tracking.
- Negative inventory is prohibited.
- Posted inventory movements are immutable except through controlled reversal/adjustment procedures.

**Policy C — Tax, Withholding and Stamp Duty**
- Flexible tax engine (existing B-21) supporting VAT, withholding, collection tax, stamp duty and other statutory charges as applicable.
- Preserve and extend B-21; do not create a competing tax engine.
- Statutory rates remain inactive until verified against official Egyptian legal sources and reviewed by a qualified tax advisor.
- CFO approval does not replace statutory legal verification.

**Policy D — Approval and Posting Workflow**
- Lifecycle: Create → Review → Approve → Post.
- Approved ≠ Posted. Approval alone must not affect authoritative accounting balances.
- Posted documents must not be directly edited; corrections use reversal, cancellation or adjustment documents.
- Configurable approval rules, separation of duties, approval limits, prevention of self-approval for sensitive transactions, and full audit logging are required.
- Preserve the existing approved role and responsibility matrix.

**Policy E — Backup and Disaster Recovery**
- Approved targets: RPO 15 minutes, RTO 4 hours, daily backups, continuous PostgreSQL WAL archiving, minimum 30-day retention, off-server backup copy, monthly restore tests.
- These are targets, not evidence of current compliance; actual capability must be verified.

**Policy F — Opening Balances and Financial Migration**
- Opening trial balance approved by the CFO is required, together with detailed customer, supplier, cash/bank, inventory, assets/liabilities, open project receivables, progress certificates and payables, with supporting evidence.
- Final financial posting and go-live remain blocked until opening balances are reviewed, reconciled and approved.
- Imported balances do not automatically constitute a successful migration.

These six policies are binding where supported by existing approval records. They close the corresponding items that previously appeared as OPEN-DECISION candidates in earlier planning packages.

If a decision is not explicitly covered above or in an approved decision record, mark it `OPEN-DECISION`; do not guess. In particular, do not invent tax rates, approval thresholds, roles, limits, user counts, retention periods beyond the targets above, or production cutover dates.

## 5. Architecture direction

The intended target is:
- Frontend: Angular, Arabic-first RTL, with a customized component/design system that preserves the current visual language.
- Backend: NestJS Modular Monolith with domain-oriented modules and explicit service boundaries.
- Database: PostgreSQL.
- Reverse proxy: Nginx.
- Deployment: internal company server using a reproducible, approved deployment method.
- Client: browser-based Web ERP and installable PWA.
- Attachments: PostgreSQL storage by default, conditional on evidence-based capacity and recovery validation; approved fallback is server file-system + PostgreSQL metadata if measurements fail.

This is target-state guidance, not a claim of current implementation. Detailed technical requirements and capability replacements are in `03_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md`.

## 6. Governance and approval authority

Business decisions belong to the designated company decision owners. Financial rules within the approved CFO scope belong to the CFO. Statutory tax treatment requires official-source verification and tax-advisor review. Technical implementation decisions must be documented as ADRs and approved when they affect cost, risk, architecture, data integrity, or scope.

Claude Code may inspect and recommend. It may not convert recommendations into policy, resolve open business decisions by assumption, or proceed beyond an approval gate without explicit authorization.

## 7. Delivery model

The program is delivered through phases, work packages, module increments, gates, and versioned releases. These terms are defined in `00_README_DOCUMENT_INDEX.md`. The roadmap is dependency-driven and gate-based; the phase numbers do not authorize automatic sequential execution.

The first authorized activity is Phase 0 only: repository/environment safety verification in read-only mode. Phase 1 is not authorized until the user reviews the Phase 0 report and explicitly approves it. No code/database/business-data modification, dependency installation, destructive command, or production change is authorized by this plan alone.

## 8. Success criteria

The program is successful only when:
- Every verified legacy capability is mapped to a target capability, approved disposition, or explicitly open decision.
- No legacy feature or record is silently omitted.
- UI and functional parity are evidenced and accepted.
- Data and attachment migration is reconciled, repeatable, and recoverable.
- Security, access control, audit, and approval/posting controls are tested.
- Financial golden cases match approved expected results; tax rates remain inactive until approved.
- Every released module meets its Definition of Done and cross-module acceptance criteria.
- Backup restoration is demonstrated in a controlled environment.
- Deployment, rollback, monitoring, support, and user training are ready.
- Go-live and legacy retirement are separately authorized.

## 9. Specialist documents

- `02_EXECUTION_ROADMAP.md` — phases, dependencies, work packages, gates, estimates, reporting, and risks.
- `03_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md` — target architecture, security, API, PWA, financial calculation roadmap, backup, performance, monitoring, deployment.
- `04_LEGACY_PRESERVATION_AND_MIGRATION.md` — verified baseline, UI/functional parity, inventory, golden-master behavior, migration and workflow.
- `05_TESTING_AND_ACCEPTANCE.md` — test layers, evidence, golden cases, module Definition of Done, defect severity, acceptance.
- `06_EXECUTION_TEMPLATES.md` — mandatory templates for reports, approvals, work packages, requirements, and module acceptance.

## 10. v1.2 → v1.3 change summary (historical)

v1.3 reorganizes the single v1.2 document into a coordinated document set, reduces repetition in the governing overview, distinguishes legacy preservation from approved changes and new requirements, adds priority and traceability controls, defines Phase/WP/Module/Gate/Release vocabulary, clarifies discovery boundaries, and introduces dependency-based progression and explicit scope-change control. The original substantive v1.2 sections are redistributed into the specialist documents; see the traceability matrix in `02_EXECUTION_ROADMAP.md`. The v1.4 changes are recorded in `CHANGELOG_v1.4.md`.


---

## Original v1.2 source sections retained in this document

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

## 3.4 `NO_GAPS` numbering (CONFIRMED)

Do not rely on ordinary PostgreSQL `SERIAL`, `IDENTITY`, or sequences
for gapless committed numbering.

**Confirmed required behavior (do not re-open as an open decision):**

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

Only the **scope and format** of numbering (which dimensions define a sequence) may remain an open decision if not already specified in approved records. The cancellation and non-reuse rules above are closed.

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

The active execution instructions are governed by the v1.4 package documents, especially `00_README_DOCUMENT_INDEX.md`, `02_EXECUTION_ROADMAP.md`, and `START_HERE_CLAUDE_CODE_PROMPT.md`. This section intentionally does not duplicate their detailed operating protocol.

Initial authorization is **Phase 0 only**. Present the Phase 0 report in the conversation and stop for explicit user approval before Phase 1. Phase 1 approval does not authorize Phase 2 or implementation. Every later phase and work package requires its own explicit scope approval.

Do not treat historical v1.2 wording retained above as an independent authorization. Where retained text conflicts with v1.4 governance, the active v1.4 instructions and explicit approval records govern.

