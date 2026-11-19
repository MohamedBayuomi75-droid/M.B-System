# ERP EXECUTION ROADMAP

**Version:** 1.4.5 | **Date:** 19 November 2026  
**Purpose:** Govern phases, work packages, dependencies, approval gates, reporting, and risks.

Read `00_README_DOCUMENT_INDEX.md` and `01_MASTER_PLAN.md` first. The phase descriptions below retain the substantive v1.2 requirements; the additions in this document clarify execution control and dependencies.

## 1. Execution model and dependency rules

A phase is a major program stage. A Work Package (WP) is the smallest planned unit that can be authorized, executed, evidenced, reviewed, and accepted. A module is a business capability, not a phase. A Gate is an explicit approval decision. A Release is a versioned deployable increment.

Phases are not an unconditional linear checklist. Each WP must define:
- WP ID, title, owner, and phase;
- objective and business outcome;
- included and excluded scope;
- requirement IDs and classifications;
- prerequisites and dependency evidence;
- impacted modules, APIs, data, reports, and integrations;
- risks and rollback/recovery approach;
- deliverables and acceptance criteria;
- required approvers and gate decision.

No WP starts until its prerequisites are evidenced and its scope is explicitly authorized. Parallel work is allowed only where dependencies are independent, baselines cannot conflict, and the responsible owner approves the parallelization.

## 2. Requirement and priority control

Every requirement must have a unique ID and:
- one primary classification: `LEGACY-PRESERVE`, `APPROVED-CHANGE`, `NEW-REQUIREMENT`, `TECHNICAL`, or `OPEN-DECISION`;
- priority: P0, P1, P2, or P3;
- source/evidence and owner;
- affected module(s) and dependency links;
- acceptance criteria and test evidence;
- status and approval reference.

Priority definitions:
- **P0:** integrity, security, financial correctness, preservation, recoverability, and controls against material harm.
- **P1:** essential ERP capabilities and verified legacy parity for an approved release.
- **P2:** operational improvements, enhanced reporting, usability, and efficiency.
- **P3:** optional enhancements and convenience features.

Where priority is not approved, Claude Code must label it proposed. Do not infer that a legacy feature is low priority merely because it is difficult to migrate.

## 3. Discovery boundary — avoid duplicated work

- **Phase 0:** establish safe access and repository/environment identity; no implementation. Phase 0 is the only initially authorized activity.
- **Phase 1:** starts only after explicit user approval of the Phase 0 report. It is a concise baseline and decision reconciliation: repository/branch/commit, working tree, stack, commands, current deployment/data presence, existing documentation, and immediate safety constraints. It identifies what is known and what requires deeper discovery; it does not attempt the exhaustive feature-by-feature inventory.
- **Phase 2:** verify current-system security and backup/restore evidence, proportionate to the actual data environment.
- **Phase 3:** deep discovery: exhaustive screen/action/report/workflow/formula/permission/import-export/print/attachment inventory, UI capture, data dictionary, golden cases, and traceability.
- The Phase 1 report must explicitly hand unresolved discovery items to Phase 3 rather than repeating them in Phase 1.

## 4. Dependency map

| Workstream / phase | Minimum prerequisites | Enables |
|---|---|---|
| Phase 0 — safety | Explicit read-only authorization and repository access | Phase 1 |
| Phase 1 — baseline | Phase 0 evidence | Phase 2 and Phase 3 |
| Phase 2 — security/recovery proof | Identified data environment and approved test boundary | Architecture risk decisions; safe later migration |
| Phase 3 — deep discovery | Stable baseline; read-only access | Approved architecture, migration mapping, module sequencing |
| Phase 4 — target architecture/foundation | Phase 3 findings and reconciled decisions | Platform implementation |
| Phase 5 — shared foundations | Approved Phase 4 architecture and security controls | Pilot module |
| Phase 6 — pilot and rehearsal | Shared foundations; selected pilot approved | Reusable migration and acceptance pattern |
| Phase 7–9 — operational/field modules | Pilot accepted; module dependencies satisfied | Integrated operational ERP |
| Phase 10 — accounting activation | Financial foundations, CFO-approved rules, golden cases, source verification where statutory | Controlled financial posting |
| Phase 11 — reports/analytics | Stable source modules and reconciled definitions | Management reporting |
| Phase 12 — full validation | Candidate release with accepted modules | Go-live readiness decision |
| Phase 13 — go-live | Phase 12 passed; explicit production authorization | Controlled production operation |
| Phase 14 — stabilization/retirement | Stable operation and approved retirement/retention plan | Legacy retirement |

### Financial Engine Discovery (B-80) mapping

`B-80` (read-only Financial Engine Discovery and Audit defined in `07_FINANCIAL_ENGINE_SPECIFICATION_v3.1.md`) is **not** an independent phase.

It is a technical workstream that must be authorized as a Work Package under the Master Plan. Preferred placement:

- **Primary home:** Phase 1 (Documentation, Decision Reconciliation, and Verified Baseline) or early Phase 3 (Deep Discovery), depending on when financial architecture inspection is most useful.
- B-80 remains strictly read-only regarding source code, database, dependencies, and configuration.
- Its **only** permitted written deliverable is the report `docs/B-80_FINANCIAL_ENGINE_DISCOVERY_AUDIT.md` (or the equivalent conversation report if the Master Plan / WP forbids file creation).
- When authorizing the B-80 Work Package via the template in `06_EXECUTION_TEMPLATES.md`, the WP must explicitly list this report path under **Deliverables** and under **Permitted actions**. Without that explicit permission, no file may be created.
- If the report file already exists, follow the preservation rules in the financial specification §16.5 (inspect first, do not overwrite history).
- B-80 does not authorize any implementation, formula activation, schema change, posting change, or other file writes.
- Starting B-80 requires an explicit Work Package authorization that references this mapping; silence or the existence of the financial specification alone is not authorization.



Phase numbers retain v1.2 identity. A phase may be split into multiple WPs; a phase can remain partially open while independent WPs are accepted.

## 5. Release and module readiness controls

A module readiness score may be used as a diagnostic, not as an automatic approval. Score each dimension as `Not assessed / Red / Amber / Green`, with evidence:
1. requirements and legacy traceability;
2. UX and functional parity;
3. data model and migration reconciliation;
4. authorization and audit;
5. workflow and lifecycle;
6. API and integration;
7. unit/integration/E2E/security testing;
8. reports and exports;
9. performance and operational monitoring;
10. backup/restore and rollback;
11. user acceptance and training;
12. unresolved defects and decisions.

A module cannot be accepted based only on an average score. Any P0 failure blocks acceptance. Any Red dimension blocks release unless an authorized exception is documented with compensating controls, owner, expiry, and approval. Do not invent numeric weighting or thresholds without approval.

Cross-module acceptance is mandatory where a transaction spans domains (for example, purchase request → purchase order → receipt → supplier invoice → payment; or project contract → work execution → client certificate → collection → project profitability). Validate end-to-end ownership, balances, audit trail, and failure/rollback behavior.

## 6. Scope change and decision control

Before a scope or behavior change, document the request, reason, requirement IDs, impact, options, risks, estimate, test changes, migration implications, rollback, and decision owner. Obtain explicit approval before implementation. Update all affected documents and traceability links. See the detailed templates in `06_EXECUTION_TEMPLATES.md`.

## 7. Phase and work-package reports

Use the Before Report before any authorized change and the After Report after completion. The templates in `06_EXECUTION_TEMPLATES.md` are mandatory. Reports must distinguish:
- planned vs actually completed;
- verified evidence vs assumptions;
- tests passed vs not run;
- changed vs untouched files/data;
- open defects and decisions;
- rollback status;
- gate recommendation vs actual approval.

A recommendation to pass a gate is not a gate approval.


---

## Original v1.2 detailed requirements (retained)

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

Gate: present the Phase 0 report and obtain explicit user approval before starting Phase 1. No Phase 1 work is implicitly authorized by the plan or prompt.

## Phase 1 --- Documentation, Decision Reconciliation, and Verified Baseline

Activities: - Reconcile decisions and ADRs. - Verify actual stack
against target stack. - Reconcile documentation conflicts. - Inventory
modules and dependencies. - Create risk register and acceptance
matrix. - Identify open business decisions and owners. - Produce
realistic estimates with assumptions.

Deliverables: - Verified baseline report. - Decision reconciliation report. - Current-vs-target architecture gap summary (recommendations only, not an approved architecture change). - Functional inventory status at a high level. - Preliminary dependency map. - Risk register. - Acceptance matrix outline and estimates with assumptions.

Phase 1 must not rewrite the governing master plan or specialist documents. Present findings and proposed document changes in the conversation or as a clearly separated draft only if the user explicitly authorizes creation of report files. Any change to approved project documents requires separate approval.

Restrictions: read-only inspection only. No source/configuration/business-document edits, no schema or data changes, and no dependency installation. Reports are presented in the conversation by default; creating or editing repository files requires explicit authorization.

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

**Scope boundary (v1.4.5 clarification):** Phase 7 delivers operational documents, operational workflows, and operational balances only. It does **not** implement double-entry general ledger, journal posting templates, period close, or full accounting activation.

Migrate one module/work package at a time according to the approved dependency map. Candidate areas:
- customers, projects, contracts, and client certificates
- suppliers and subcontractors
- procurement and purchase requests
- inventory and warehouses
- invoices, returns, payments, and collections (as **operational** documents and operational receivables/payables balances)

Each module follows the same sequence: 1. Scope and dependency approval. 2. Functional/data discovery. 3. Schema and mapping approval. 4. Backend implementation. 5. Frontend implementation and visual comparison. 6. Permissions, audit, and workflow. 7. Automated tests. 8. Test migration and reconciliation. 9. UAT. 10. Cutover/rollback rehearsal. 11. Explicit approval. 12. Controlled migration and monitoring.

**Interface requirement:** Before implementing invoices/payments/collections in Phase 7, define and approve the interface contracts that Phase 10 accounting will consume (document status events, amounts, parties, project references, tax lines if any, and idempotency keys). Do not embed full double-entry posting logic inside Phase 7 modules.

Gate: one module only per approved work package; signed reconciliation; no unresolved critical/high defect unless formally accepted; cutover and rollback tested; interface contracts for accounting-facing documents are documented.

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

**Scope boundary (v1.4.5 clarification):** Phase 10 builds and activates true double-entry accounting. It consumes the operational documents and balances produced by Phase 7 (and other operational phases) through the previously approved interface contracts.

Activities:
- Double-entry accounting foundation (chart of accounts, journals, general ledger).
- Treasury and banks as accounting entities.
- Customer/supplier sub-ledgers linked to the general ledger.
- Approved posting templates and automated/manual posting from operational documents.
- Project costing and cost centers.
- Opening balances and reconciliation (including handling of legacy financial exceptions under the Legacy Data Defects policy).
- Financial reporting and period close/lock.
- Controlled activation of live posting only after all gates pass.

Do **not** re-implement operational invoice/payment screens here; those belong to Phase 7. Phase 10 focuses on the accounting treatment, posting, and ledger integrity of those documents.

Gate: all financial activation criteria pass; trial balance balances; sub-ledgers reconcile; statutory treatment has professional approval; finance provides written sign-off. No automatic live posting.

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

## Appendix A — v1.2 to v1.3 section traceability

| v1.2 section | v1.3 destination |
|---|---|
| Document Control and Interpretation | `00_README_DOCUMENT_INDEX.md`, `01_MASTER_PLAN.md` |
| 1. Project Objective and Scope | `01_MASTER_PLAN.md` |
| 2. Verified Legacy Baseline and Target-State Separation | `04_LEGACY_PRESERVATION_AND_MIGRATION.md` |
| 3. Confirmed Decisions and Decision Governance | `01_MASTER_PLAN.md` |
| 4. Visual and Functional Parity | `04_LEGACY_PRESERVATION_AND_MIGRATION.md` |
| 5. Legacy Feature Inventory and Traceability | `04_LEGACY_PRESERVATION_AND_MIGRATION.md` |
| 6. Golden-Master Business Rules and Legacy Behavior | `04_LEGACY_PRESERVATION_AND_MIGRATION.md` |
| 7. Target Technical Architecture | `03_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md` |
| 8. Electron-to-Web and PWA Capability Replacement | `03_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md` |
| 9. Security, Identity, Authorization, and Audit | `03_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md` |
| 10. Data and Attachment Migration | `04_LEGACY_PRESERVATION_AND_MIGRATION.md` |
| 11. Workflow, Approvals, and Document Lifecycle | `04_LEGACY_PRESERVATION_AND_MIGRATION.md` |
| 12. Accounting and Financial Calculation Roadmap | `03_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md` |
| 13. Module Migration Strategy and Dependencies | `02_EXECUTION_ROADMAP.md` |
| 14. Delivery Phases and Approval Gates | `02_EXECUTION_ROADMAP.md` |
| 15. Backup, Restore, and Disaster Recovery | `03_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md` |
| 16. Performance, Capacity, and Scalability | `03_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md` |
| 17. Monitoring, Logging, and Operational Support | `03_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md` |
| 18. Testing and Acceptance Framework | `05_TESTING_AND_ACCEPTANCE.md` |
| 19. Release, Deployment, and Change Management | `03_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md` |
| 20. Project Estimates and Progress Reporting | `02_EXECUTION_ROADMAP.md` |
| 21. Mandatory Phase Reports and Approval Rules | `02_EXECUTION_ROADMAP.md` and `06_EXECUTION_TEMPLATES.md` |
| 22. Risk Register | `02_EXECUTION_ROADMAP.md` |
| 23. Project Success Criteria | `01_MASTER_PLAN.md` |
| 24. Final Instructions to Claude Code | `01_MASTER_PLAN.md`, `00_README_DOCUMENT_INDEX.md`, `06_EXECUTION_TEMPLATES.md` |

All substantive numbered sections from v1.2 are retained in the destinations above. Reorganization does not authorize changing business requirements.
