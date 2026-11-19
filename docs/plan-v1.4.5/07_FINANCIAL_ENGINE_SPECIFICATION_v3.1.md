MASTER FINANCIAL CALCULATION, ACCOUNTING & CONSTRUCTION COST ENGINE SPECIFICATION

Version 3.1 — Integrated Engineering Specification

Authority: Existing Approved Company Policies and Master ERP Implementation Plan
Parent Document: "ERP_MASTER_IMPLEMENTATION_PLAN_v1.4.5"
Existing Components: B-20 Financial Rules / Calculation Engine and B-21 Tax, Withholding and Stamp Engine
Engineering References: ERPNext / Frappe and Odoo
Financial Arithmetic: Approved Decimal-Based Calculation Architecture
Database: Existing PostgreSQL Architecture
Execution Model: Master-Plan-Controlled, Work-Package-Based Implementation

---

0. DOCUMENT AUTHORITY AND RELATIONSHIP WITH THE MASTER PLAN

0.1 Purpose and authority

This document defines the specialized financial engineering requirements for the ERP financial calculation, accounting intelligence, inventory valuation, and construction cost architecture.

It is a subordinate engineering specification of:

"ERP_MASTER_IMPLEMENTATION_PLAN_v1.4.5"

It does NOT replace, duplicate, or independently govern the Master Implementation Plan.

The Master Plan remains the single authoritative source for:

- Overall project execution.
- Phase definitions.
- Work Package (WP) authorization.
- Implementation sequencing.
- Governance and approval gates.
- Baseline and change-control requirements.
- Testing and acceptance governance.
- Release and deployment authorization.
- Project-wide documentation standards.

This specification defines:

- Financial engineering requirements.
- Calculation rules and responsibilities.
- Accounting and posting invariants.
- Formula architecture.
- Tax engine integration requirements.
- Inventory valuation requirements.
- Construction costing requirements.
- Financial integrity and reconciliation requirements.
- Specialized financial testing requirements.

0.2 Mandatory precedence rules

Before any work, inspect:

1. "ERP_MASTER_IMPLEMENTATION_PLAN_v1.4.5".
2. "OPEN_BUSINESS_DECISIONS.md" (repository file; not shipped in the planning package).
3. Existing approved ADRs.
4. Existing financial architecture documentation.
5. Existing B-20 implementation and documentation.
6. Existing B-21 implementation and documentation.
7. Existing approval hierarchy and responsibility matrix.
8. Existing database schema.
9. Actual application source code and relevant tests.

Apply the following precedence:

1. Existing formally approved company decisions.
2. Master Implementation Plan and its approved governance.
3. Existing approved ADRs and implementation specifications.
4. This financial engineering specification.
5. Verified existing technical implementation.

If a conflict is discovered:

- Do not silently reinterpret an approved decision.
- Do not modify the conflicting source.
- Record the exact conflict and supporting evidence.
- Identify its financial and technical impact.
- Refer the conflict to the existing approval process.

Do not invent business policies to resolve conflicts.

0.3 No independent execution governance

The B-series identifiers used in this document are technical workstream references, not independent project phases or authorization gates.

They must be mapped to existing authorized Work Packages in the Master Plan.

Do NOT:

- Create a second project execution roadmap.
- Create independent approval gates that conflict with the Master Plan.
- Require duplicate baseline or acceptance reports.
- Introduce additional approvals for work already governed by an existing approved WP.
- Start implementation merely because a technical workstream is described here.

Every implementation activity must belong to an authorized Master Plan WP.

If no suitable WP exists, report the requirement and recommend where it should be incorporated. Do not independently authorize its implementation.

0.4 Approved company financial policies

The following policies are binding requirements where supported by existing approval records.

They are not pending proposals.

Policy A — Centralized Chart of Accounts and Project Cost Centers

- The company uses one centralized Chart of Accounts.
- Projects use independent project cost centers.
- Do not create duplicated independent Charts of Accounts for individual projects.
- Financial reporting must support company-wide and project-level reporting.
- Project costs and revenues must be traceable through the approved accounting and cost-center structure.

Policy B — Inventory Valuation

- Moving Weighted Average is the primary valuation method for most inventory items.
- Specific Identification applies to items requiring individual or batch-level cost tracking.
- Negative inventory is prohibited according to approved company rules.
- Inventory movements and valuation changes must remain traceable.
- Posted inventory movements must not be directly modified.
- Corrections must follow controlled reversal or adjustment procedures.

Policy C — Tax, Withholding and Stamp Duty

The company requires a flexible tax engine supporting, as applicable:

- VAT.
- Withholding tax.
- Collection tax.
- Stamp duty.
- Other applicable statutory deductions and charges.

Tax treatment may depend on:

- Document type.
- Supplier classification.
- Service or item type.
- Legal classification.
- Effective dates.
- Approved contractual conditions.

B-21 is the existing tax engine.

Mandatory restrictions:

- Preserve B-21.
- Extend and integrate B-21 where justified.
- Do not create a competing tax engine.
- Do not activate statutory rates without verification against official Egyptian legal sources and review by a qualified tax advisor.
- Legally unverified rates must remain inactive.
- CFO approval does not replace statutory legal verification.

Policy D — Approval and Posting Workflow

The approved lifecycle is:

"Create → Review → Approve → Post"

The workflow must support:

- Configurable approval rules by document type and value.
- Separation of duties.
- Approval limits according to the approved organizational hierarchy.
- Prevention of self-approval for sensitive financial transactions.
- Multiple approval levels where required.
- Documented exceptions.
- Audit logging.

Important distinctions:

- Approved does NOT mean Posted.
- Approval alone must not affect authoritative accounting balances.
- Posting must occur only through the authorized posting process.
- Posted documents must not be directly edited.
- Corrections must use appropriate reversal, cancellation, or adjustment documents.
- Preserve the existing approved role and responsibility matrix.
- Do not independently redesign or weaken authorization rules.

Policy E — Backup and Disaster Recovery

Approved recovery targets:

- RPO: 15 minutes.
- RTO: 4 hours.
- Daily backups.
- Continuous PostgreSQL WAL archiving.
- Minimum retention: 30 days.
- Mandatory backup copy outside the main application server.
- Monthly restore tests.

These are approved operational targets, not evidence of current compliance.

Actual capability must be verified through configuration inspection and restore testing.

Do not claim compliance based solely on documentation or the existence of backup scripts.

Policy F — Opening Balances and Financial Migration

The approved opening-balance policy requires:

- An opening trial balance approved by the CFO.
- Detailed customer balances.
- Detailed supplier balances.
- Cash and bank balances.
- Inventory quantities and costs.
- Assets and liabilities.
- Open project receivables.
- Open progress certificates.
- Project payables and other relevant open project balances.
- Supporting evidence and source documents for every opening balance.
- Reconciliation of detailed balances against the opening trial balance.

Final financial posting and go-live must remain blocked until opening balances have been reviewed, reconciled, and approved.

Imported balances do not automatically constitute a successful migration.

0.5 Other approved financial standards

Preserve the existing approved decisions:

- Monetary precision: 4 decimal places.
- Monetary rounding: "HALF_UP".
- Document numbering gaps: "NOT_ALLOWED".
- Negative inventory prevention.
- Double-entry accounting.
- Existing CFO-approved Financial Rules Engine decisions.
- Existing approval hierarchy and responsibility matrix.
- Historical financial integrity requirements.

Do not change these standards or create contradictory module-specific configurations.

Document numbering clarification

The approved "NOT_ALLOWED" policy means:

- Number allocation must occur within the same database transaction as document issuance.
- Concurrent allocations must be serialized safely.
- A transaction that fails before commit must not consume a number.
- Once a document number is successfully issued and committed, that number must never be reused, even if the document is subsequently cancelled.
- Cancelled documents retain their original number and audit history.
- Ordinary PostgreSQL sequences must not be assumed to satisfy this policy.

The actual implementation must be inspected and tested against these requirements.

0.6 Approval status versus implementation status

Always distinguish:

- "CFO_APPROVED"
- "IMPLEMENTED"
- "TESTED"
- "LEGAL_REVIEW_REQUIRED"
- "PENDING_INPUT"
- "DEPRECATED"

A decision can be approved without being implemented or tested.

A formula can be implemented without being legally approved.

A passing technical test does not establish legal or accounting approval.

0.7 Decision-record protection

Preserve existing decision IDs and approval references.

Do not:

- Create duplicate records for existing approved policies.
- Replace existing decision IDs.
- Rewrite historical approval records.
- Change approval authority.
- Mark pending legal matters as approved.
- Reopen approved decisions merely to repeat their approval.

During read-only discovery, do not update "OPEN_BUSINESS_DECISIONS.md" (repository file; not shipped in the planning package), ADRs, or any other project decision record.

---

1. ENGINEERING OBJECTIVE

Build a centralized, reliable, consistent, auditable financial calculation architecture integrated with the ERP.

The objective is not simply to document formulas.

The objective is to:

- Discover existing and required calculations.
- Verify mathematical and accounting correctness.
- Standardize financial calculation behavior.
- Integrate relevant modules with the existing central calculation architecture.
- Preserve B-20 and B-21 where verified.
- Maintain formula versions and calculation history.
- Preserve calculation traceability.
- Prevent inconsistent results across screens, reports, invoices, and accounting entries.
- Enforce financial safety and transaction integrity.
- Provide comprehensive automated testing.
- Support actual construction-company financial and operational workflows.
- Maintain compatibility with approved company policies.

The central calculation architecture must become the authoritative source for applicable financial calculations.

It must not become a replacement for specialized business modules or the accounting posting subsystem.

1.1 Separation of responsibilities

Maintain clear boundaries between:

1. Central financial calculation core.
2. Specialized business calculation services.
3. Tax and statutory calculation services.
4. Accounting and posting services.
5. Inventory valuation services.
6. Project costing services.
7. Reporting and presentation layers.

Authoritative financial formulas must not be independently duplicated across frontend components or unrelated modules.

Preserve the existing architectural separation:

- Presentation.
- Services.
- Data.
- Utilities.

Do not impose a new architecture without verifying the existing application structure and the Master Plan's approved technical architecture.

---

2. EXISTING B-20 AND B-21 PRESERVATION

2.1 Verify actual implementation status

Do not assume that B-20 or B-21 is complete merely because documentation or implementation reports describe it as completed.

Inspect independently:

- Actual source code.
- Existing architecture.
- Formula registry and specifications.
- Database structures.
- Tests and test coverage.
- Integration points.
- API contracts.
- Runtime behavior where authorized.
- Actual usage by business modules.
- Outstanding limitations.

Classify each component as:

- Documented.
- Implemented.
- Tested.
- Integrated.
- Operationally verified.
- Incomplete.
- Missing.
- Deprecated.

These statuses must be supported by evidence.

2.2 Preservation rules

Where existing functionality is verified:

- Preserve it.
- Reuse it.
- Extend it where necessary.
- Avoid unnecessary replacement.
- Avoid introducing competing calculation services.
- Preserve compatible APIs and data contracts where possible.

If an existing component is incomplete or inconsistent:

- Identify the exact gap.
- Explain the impact.
- Recommend the smallest safe correction.
- Do not create a replacement during discovery.
- Obtain authorization through the Master Plan before implementing structural changes.

---

3. FINANCIAL ARITHMETIC AND DECIMAL PRECISION

3.1 Decimal implementation assessment

Assess the existing financial arithmetic implementation before introducing dependencies.

Evaluate "decimal.js":

Official source:

https://github.com/MikeMcl/decimal.js

Inspect:

1. Existing backend and frontend technologies.
2. Node.js and TypeScript versions, where applicable.
3. Package manager and lockfiles.
4. Existing decimal and financial libraries.
5. Current B-20 arithmetic implementation.
6. Runtime and build compatibility.
7. Existing PostgreSQL numeric handling.
8. API serialization and deserialization behavior.

If Decimal.js is suitable, recommend its controlled adoption or use.

If an existing implementation already satisfies the requirements, do not introduce a second decimal library unnecessarily.

If Decimal.js is unsuitable, document why and recommend an equivalent reliable decimal arithmetic implementation.

During B-80, do not install dependencies or modify package files.

3.2 Authoritative calculation rules

For authoritative financial calculations:

- Never use JavaScript "Number" arithmetic.
- Never use "parseFloat" for financial arithmetic.
- Accept authoritative financial inputs as decimal strings or another precision-preserving representation.
- Use the approved decimal arithmetic implementation.
- Never convert authoritative decimal values to JavaScript Number during financial calculations.
- Use PostgreSQL "NUMERIC" for financial storage where appropriate.
- Keep authoritative calculations on the backend.
- Do not rely on frontend calculations as final financial results.
- Centralize decimal configuration.
- Prevent individual modules from silently changing precision or rounding behavior.

JavaScript Number may still be used for non-authoritative presentation, UI layout, or unrelated non-financial calculations.

3.3 Precision and rounding

Approved company standards:

- Monetary precision: 4 decimal places.
- Rounding: "HALF_UP".

Important distinctions:

- Internal decimal precision.
- Stored monetary scale.
- Formula-specific intermediate precision.
- Approved rounding points.
- Display precision.

Do not automatically round every intermediate operation to four decimal places.

For each formula, define:

- Input precision.
- Intermediate precision requirements.
- Calculation sequence.
- Explicit rounding points.
- Final output scale.
- Display formatting.
- Historical reproducibility requirements.

For Decimal.js, remember that "precision" represents significant digits, not fixed decimal places.

Use sufficient internal precision and apply "ROUND_HALF_UP" at explicitly defined rounding points.

Where a four-decimal rounding operation is required, use the approved equivalent of:

"toDecimalPlaces(4, Decimal.ROUND_HALF_UP)"

Do not assume that every calculation should be rounded at the same stage.

3.4 Database and API precision

Inspect:

- PostgreSQL "NUMERIC" definitions.
- API request and response types.
- JSON serialization.
- ORM behavior.
- Decimal-to-string conversion.
- Database driver precision.
- Frontend display formatting.
- Import and export behavior.

Prevent silent precision loss at system boundaries.

3.5 Decimal testing

Required test categories:

- Addition and subtraction.
- Multiplication and division.
- Percentage calculations.
- Tax and withholding.
- Discounts.
- Positive and negative rounding.
- Very small and very large values.
- Repeated division.
- Quantity × unit price.
- Multiple currencies.
- Database persistence and retrieval.
- API serialization and deserialization.
- Boundary and overflow conditions.

---

4. CENTRAL FORMULA REGISTRY AND SPECIFICATION

Inspect the existing B-20 formula registry before proposing structural changes.

Do not create a second registry.

Each authoritative formula should contain, as appropriate:

- Formula ID.
- Arabic and English names.
- Associated module.
- Business purpose.
- Input definitions and data types.
- Mathematical expression.
- Calculation sequence.
- Intermediate precision.
- Rounding rules.
- Expected output.
- Preconditions.
- Exceptions.
- Approved company decision reference.
- Formula version.
- Approval status.
- Implementation status.
- Test status.

Preserve existing formula IDs where possible.

Avoid creating duplicate formulas when an existing authoritative formula can be reused.

4.1 Formula dependencies

Document:

- Input dependencies.
- Upstream formulas.
- Downstream formulas.
- Calculation order.
- Rounding dependencies.
- Tax engine dependencies.
- Inventory valuation dependencies.
- Accounting posting dependencies.

Formula dependencies must be explicit enough to detect inconsistent calculation sequences.

---

5. FORMULA VERSIONING AND CALCULATION TRACEABILITY

Important financial calculations must be traceable to:

- Original business document.
- Input values.
- Formula ID.
- Formula version.
- Intermediate calculation values where required.
- Final calculated result.
- Calculation timestamp.
- User or process responsible.
- Reason for recalculation, where applicable.

Implement or improve Calculation Snapshots where justified.

Historical documents must remain explainable using the exact formula version and inputs originally used.

Changing a formula must not automatically modify historical posted results.

Any authorized recalculation must follow an explicit, auditable process.

Historical calculations must not be silently overwritten.

Snapshots must preserve sufficient information for reproducibility without unnecessarily duplicating sensitive data.

---

6. FINANCIAL SAFETY AND ACCOUNTING INVARIANTS

The following requirements apply across the relevant modules.

They must be enforced at the appropriate backend and database boundaries, not merely through frontend controls.

6.1 Financial integrity

- Prevent duplicate posting.
- Prevent duplicate general ledger effects.
- Validate journal entry balance.
- Use database transactions for atomic financial operations.
- Apply appropriate locking.
- Prevent race conditions.
- Use idempotency for sensitive operations.
- Maintain complete audit trails.
- Preserve original documents and their correction relationships.
- Validate critical financial rules on the server.
- Reconcile affected financial records.

6.2 Negative balance rules

Do not apply a blanket prohibition to every negative accounting balance.

Differentiate between:

- Physical inventory quantities.
- Available stock.
- Reserved stock.
- Unallocated payment balances.
- Customer balances.
- Supplier balances.
- General ledger account balances.
- Advance and prepayment balances.

Enforce negative-balance restrictions only where required by approved company policies and business rules.

Negative inventory remains prohibited.

Do not incorrectly classify a legitimate accounting debit or credit balance as a system error.

6.3 Payment and allocation rules

- Prevent payment allocation beyond the available unallocated payment amount.
- Prevent invoice settlement beyond the applicable outstanding amount unless an approved business process permits an advance or overpayment.
- Support documented advance payments.
- Support partial allocations.
- Preserve payment-to-document relationships.
- Prevent duplicate allocation.
- Maintain traceability for allocation reversals.
- Apply approved limits and authorization rules.

Do not confuse an advance payment with an ordinary invoice settlement.

6.4 Accounting and posting invariants

- Total debits must equal total credits for each posted journal entry.
- A source document must not create duplicate accounting effects.
- Approval must remain distinct from posting.
- Posted documents must not be directly edited.
- Corrections must preserve the original transaction history.
- Reversals and adjustments must be linked to their original documents.
- Posting must be atomic and protected against duplicate requests.
- The centralized Chart of Accounts remains authoritative.
- Project cost centers support project-level reporting and accounting.
- Subledger and general ledger relationships must remain reconcilable.

6.5 Document numbering

Preserve the approved "NOT_ALLOWED" numbering-gap policy.

Verify:

- Transactional number allocation.
- Concurrency safety.
- Failed transaction behavior.
- Rollback behavior.
- Duplicate submissions.
- Issued-document cancellation.
- Auditability.
- Database locking.

The implementation must satisfy the full numbering clarification in Section 0.5.

Do not assume ordinary PostgreSQL sequences meet the policy.

---

7. FINANCIAL ENGINE INTEGRATION BOUNDARIES

The calculation engine must have clear responsibilities and must not replace the source business documents or specialized accounting subsystems.

7.1 Required integration model

The intended responsibility boundaries are:

Business Modules

- Create and manage source documents.
- Own document lifecycle and business validation.
- Provide approved source inputs.
- Preserve document identity and audit history.

Central Calculation Engine

- Execute authoritative formulas.
- Apply precision and rounding standards.
- Resolve formula versions.
- Produce traceable calculation results.
- Avoid creating business documents or posting accounting entries independently.

B-21 Tax Engine

- Apply approved tax classifications and tax rules.
- Calculate tax and statutory deductions.
- Preserve effective dates and historical rate versions.
- Keep legally unverified rates inactive.

Inventory Valuation Services

- Calculate inventory valuation.
- Process approved inventory movements.
- Maintain stock and valuation traceability.
- Apply approved valuation methods.

Accounting and Posting Services

- Generate and validate accounting entries.
- Enforce double-entry accounting.
- Control posting authorization.
- Prevent duplicate financial effects.
- Reconcile source documents and accounting records.

Project Costing Services

- Associate applicable costs and revenues with project cost centers.
- Calculate project cost and profitability indicators.
- Preserve links to source transactions.

7.2 Example: Purchase invoice

The expected logical responsibility flow is:

1. The purchase module creates the source invoice.
2. The central calculation engine calculates applicable prices, discounts, and totals.
3. B-21 calculates applicable tax and statutory deductions.
4. The source document follows its approved review and approval workflow.
5. Authorized posting triggers the accounting process.
6. Inventory valuation is affected only according to the applicable document type and approved movement timing.
7. Applicable costs are associated with project cost centers.
8. Reconciliation validates the resulting relationships.

This is a responsibility model, not permission to change current workflows during discovery.

7.3 Integration requirements

For every integration, document:

- Source module.
- Source document.
- Calculation service.
- Formula IDs.
- Tax dependencies.
- Posting dependencies.
- API or service interface.
- Transaction boundaries.
- Idempotency strategy.
- Error handling.
- Reversal behavior.
- Reconciliation requirements.
- Audit relationships.

No module should independently reproduce an authoritative calculation already owned by the central calculation architecture.

---

8. INVENTORY VALUATION REQUIREMENTS

Apply the approved valuation policy:

- Moving Weighted Average as the primary valuation method.
- Specific Identification for applicable individually or batch-tracked items.
- Negative inventory prohibited.
- Posted inventory movements immutable except through controlled correction processes.

Inspect:

- Receipt valuation.
- Issue valuation.
- Transfers.
- Returns.
- Adjustments.
- Partial issues.
- Batch and serial tracking where applicable.
- Concurrent receipts and issues.
- Cost recalculation.
- Reversal handling.
- Project material consumption.
- Inventory-to-ledger reconciliation.

Verify calculation order and transaction locking.

Do not change valuation methodology or activate alternative methods without an approved company decision.

---

9. TAX AND STATUTORY CALCULATION REQUIREMENTS

Preserve B-21 as the existing tax engine.

Integrate the central calculation architecture with B-21 rather than creating a competing implementation.

Review:

- Tax applicability.
- Document-specific treatment.
- Supplier-specific treatment.
- Item and service classifications.
- Effective dates.
- Historical rates.
- Withholding and stamp calculations.
- Returns and cancellations.
- Tax rounding.
- Accounting effects.
- Legal evidence and approval status.

Statutory rates must remain inactive until verified against official Egyptian legal sources and reviewed by a qualified tax advisor.

Do not invent tax rates, classifications, or legal interpretations.

---

10. CONSTRUCTION COSTING REQUIREMENTS

Support traceable project-level calculations for:

- Project budgets.
- Actual costs.
- Material consumption.
- Labor costs.
- Equipment costs.
- Subcontractor costs.
- Progress certificates.
- Client deductions.
- Contractor deductions.
- Retentions.
- Advances and settlements.
- Project cost variances.
- Project profitability.

Use the centralized Chart of Accounts and independent project cost centers.

Do not create duplicate project-specific account trees.

For every cost calculation, preserve traceability to its source transaction and relevant project.

Distinguish between:

- Budgeted cost.
- Committed cost.
- Actual cost.
- Accrued cost.
- Paid cost.
- Forecast cost.

Do not assume these categories are interchangeable.

---

11. IMPLEMENTATION PRIORITIES AND WORKSTREAM MAPPING

The following categories are financial engineering priorities, not an independent ERP roadmap.

They must be mapped to the actual Master Plan WPs.

11.1 Priority A — Financial foundation

- Decimal arithmetic.
- Central formula definitions.
- Formula versioning.
- Calculation traceability.
- B-21 integration.
- Accounting and posting invariants.
- Transaction safety.
- Numbering integrity.
- Reconciliation.
- Historical integrity.

11.2 Priority B — Core contracting workflows

- Purchases and suppliers.
- Inventory and valuation.
- Projects and cost centers.
- Progress certificates.
- Contractors and settlements.
- Construction project costing.
- Customer and supplier subledgers.

11.3 Priority C — Additional financial domains

- HR and payroll.
- Labor and employee entitlements.
- Equipment operating costs.
- Fixed assets and depreciation.
- Treasury and banking.
- Budgeting and advanced financial analytics.

These priorities do not override the Master Plan's approved MVP or release scope.

Do not implement an entire module merely because its formulas are mentioned here.

Only implement the financial requirements needed by the authorized WP.

Do not assume that an omitted domain is approved for deletion from the ERP.

---

12. ENGINEERING BENCHMARK — ERPNEXT AND ODOO

Use ERPNext / Frappe and Odoo as engineering references, not as authorities over approved company policies.

The benchmark must be targeted to actual architectural gaps and relevant design decisions.

Review applicable topics such as:

- Decimal arithmetic.
- Purchase and sales calculations.
- Discounts and taxes.
- Withholding.
- Payment allocation.
- Inventory valuation.
- Project costing.
- General ledger posting.
- Reconciliation.
- Reversals and cancellations.
- Formula and transaction testing.

For each relevant benchmark finding, record:

- Exact product and version.
- Official documentation or source reference.
- Relevant implementation component.
- Date reviewed.
- Observed approach.
- Advantages and limitations.
- Applicability to this ERP.
- Differences from approved company policies.
- Recommendation: Adopt, Adapt, or Reject.
- Reason for the recommendation.

Prefer official documentation and relevant source code.

Do not perform an unnecessarily broad comparison of unrelated ERP features.

Do not spend excessive time benchmarking functionality that does not affect a real design decision or identified gap.

Do not copy third-party source code in violation of its license.

During B-80, report findings in the authorized discovery report only.

Do not create separate benchmark documentation during B-80.

---

13. SHADOW CALCULATION AND HISTORICAL SAFETY

Before replacing an existing authoritative calculation:

1. Preserve the existing calculation path.
2. Implement the proposed calculation in an authorized controlled environment.
3. Run both calculations against identical inputs.
4. Compare results.
5. Record differences.
6. Investigate material discrepancies.
7. Verify expected results against approved golden test cases.
8. Validate accounting and inventory reconciliation.
9. Document the proposed change's impact.
10. Obtain authorization through the Master Plan before changing the authoritative calculation path.

Shadow calculations must not:

- Post journal entries.
- Modify balances.
- Modify inventory quantities.
- Modify posted documents.
- Trigger external financial side effects.

Do not activate a new formula in production merely because unit tests pass.

Production activation requires:

- Relevant tests passing.
- Reconciliation evidence.
- Historical impact assessment.
- Rollback or recovery plan.
- Required approvals under the Master Plan.
- Explicit authorization for the applicable implementation work.

Historical financial data must never be silently rewritten.

---

14. TESTING AND ACCEPTANCE REQUIREMENTS

Testing must follow the Master Plan's testing governance.

This section defines additional financial test coverage, not a separate testing or approval framework.

14.1 Formula testing

Important formulas must have tests covering:

- Normal cases.
- Boundary conditions.
- Zero and negative inputs where applicable.
- Large and small values.
- Decimal precision.
- Rounding.
- Returns and cancellations.
- Multiple discounts.
- Multiple taxes.
- Partial payments.
- Advance payments.
- Partial and complete allocations.
- Concurrent transactions.
- Duplicate requests.
- Database failures.
- Retry behavior.
- Different transaction execution orders.

14.2 Golden test cases

Maintain known expected results for important financial formulas.

Each golden case should include:

- Formula ID and version.
- Inputs.
- Expected intermediate values where required.
- Expected final result.
- Rounding behavior.
- Business scenario.
- Source or approval reference.
- Test status.

A test passing is insufficient unless its output is verified against an expected result.

14.3 Financial reconciliation

Test where applicable:

- Customer subledger versus general ledger.
- Supplier subledger versus general ledger.
- Inventory valuation versus inventory control accounts.
- Cash and bank balances versus accounting balances.
- Project costs versus underlying transactions.
- Progress certificate balances versus payments and deductions.
- Trial balance debit and credit equality.
- Opening balances versus the approved opening trial balance.

14.4 Operational recovery

Verify actual recovery capability against the approved targets:

- RPO: 15 minutes.
- RTO: 4 hours.
- Daily backups.
- Continuous WAL archiving.
- At least 30 days retention.
- Off-server backup copy.
- Monthly restore testing.

Report measured results rather than theoretical compliance.

Do not execute destructive restore operations against production systems without the required authorization and safeguards.

---

15. FINANCIAL DOCUMENTATION MANAGEMENT

Use the existing documentation structure and naming conventions.

Before creating a new document:

1. Search for an existing authoritative equivalent.
2. Check whether the information is already maintained in B-20 or B-21 documentation.
3. Determine whether updating the existing document is more appropriate.
4. Avoid duplicate sources of truth.
5. Preserve historical records and references.

Potential specialized documents include:

- Financial calculation benchmark.
- Decimal precision standard.
- Formula catalog.
- Calculation engine architecture.
- Calculation traceability.
- Financial validation rules.
- Formula testing strategy.
- Module calculation mapping.
- Financial calculation implementation report.

These are examples, not mandatory new files.

Create or update only documents required by the authorized WP and existing Master Plan governance.

Do not create duplicate reports or documentation solely to satisfy this list.

B-80 has the single-deliverable restriction defined in Section 16.

---

16. B-80 — READ-ONLY FINANCIAL ENGINE DISCOVERY AND AUDIT

16.1 Authorization

The current authorized activity is B-80 only.

B-80 is a read-only discovery and audit activity.

It must be executed under the Master Plan's existing Phase 0 / discovery governance, not as an independent implementation phase.

No subsequent workstream is authorized.

16.2 Discovery objectives

Inspect the actual ERP project and establish evidence-based findings for:

- Actual project architecture.
- Existing B-20 implementation.
- Existing B-21 implementation.
- Formula inventory.
- Duplicated and conflicting formulas.
- Financial arithmetic and precision.
- Chart of Accounts and project cost centers.
- Inventory valuation compliance.
- Tax and statutory controls.
- Approval and posting workflow.
- Accounting and double-entry integrity.
- Construction costing.
- Backup and recovery.
- Opening balances and migration.
- Database and API impacts.
- Security, concurrency, and transaction risks.
- Relevant ERPNext engineering references.
- Relevant Odoo engineering references.
- Decimal.js compatibility.
- Existing financial documentation.

16.3 Read-only restrictions

During B-80:

DO NOT:

- Modify source code.
- Modify database records.
- Modify database schema.
- Run migrations.
- Install or update dependencies.
- Modify package files or lockfiles.
- Refactor code.
- Change application settings.
- Change accounting settings.
- Change inventory settings.
- Activate formulas.
- Change tax rates.
- Recalculate historical data.
- Modify posted documents.
- Modify decision records.
- Modify ADRs.
- Modify unrelated documentation.
- Begin any implementation work.
- Execute B-81 or any later workstream.

Inspecting a database does not authorize changing it.

Inspecting test scripts does not authorize executing them.

Inspecting migration scripts does not authorize running them.

16.4 Command execution restrictions

B-80 is static/read-only by default.

Do not automatically execute:

- Tests.
- Builds.
- Migrations.
- Seeds.
- Data import or export scripts.
- Maintenance scripts.
- Backup or restore commands.
- Package installation commands.
- Application startup commands that may write data.

A command may be executed only if:

1. Its exact behavior has been inspected.
2. Its side effects are understood.
3. It is demonstrably read-only.
4. It is necessary to establish a material discovery finding.
5. It is compatible with the Master Plan's discovery restrictions.

If any condition is uncertain, do not execute the command. Report the limitation.

Do not expose credentials, tokens, secrets, or sensitive connection strings in reports.

16.5 The only authorized B-80 deliverable

Create:

"docs/B-80_FINANCIAL_ENGINE_DISCOVERY_AUDIT.md"

This must be the only file created or modified during B-80, subject to the Master Plan's discovery restrictions.

If the exact path already exists:

- Inspect it first.
- Preserve existing information.
- Do not overwrite its history.
- Report the situation and follow the existing documentation control process.

If the Master Plan explicitly prohibits file creation during its current discovery stage, present the proposed report in the execution response instead of writing a file. Do not override the Master Plan.

16.6 Required report structure

1. Executive Summary.
2. Actual Project Architecture.
3. Existing B-20 Financial Rules / Calculation Engine.
4. Existing B-21 Tax Engine.
5. Existing Formula Inventory.
6. Missing, Duplicated, and Conflicting Formulas.
7. Decimal Arithmetic and Precision Findings.
8. Chart of Accounts and Project Cost Center Findings.
9. Inventory Valuation Compliance.
10. Tax and Statutory Controls.
11. Approval and Posting Workflow.
12. Accounting and Double-Entry Integrity.
13. Construction Costing.
14. Backup and Disaster Recovery.
15. Opening Balances and Financial Migration.
16. Database and API Impact Assessment.
17. Security, Concurrency, and Transaction Risks.
18. Relevant ERPNext Benchmark Findings.
19. Relevant Odoo Benchmark Findings.
20. Decimal.js Compatibility Assessment.
21. Existing Documentation Review.
22. Priority Classification.
23. Financial Dependency Map.
24. Recommended Work Package Mapping.
25. Outstanding Legal or Missing Business Inputs.
26. Conflicts with Approved Company Decisions.
27. Evidence and File References.
28. B-80 Acceptance Checklist.

16.7 Evidence requirements

For every significant finding, provide:

- File path or database object.
- Relevant function, component, table, or configuration.
- Line references where available.
- Actual observed behavior.
- Expected behavior.
- Risk and impact.
- Related approved decision.
- Evidence classification.

Clearly distinguish:

- Verified facts.
- Inferred risks.
- Missing implementation.
- Recommendations.
- Legal verification requirements.
- Unverified assumptions.

Never claim a feature is missing without inspecting the relevant implementation and documentation.

Never claim that a feature is operational merely because documentation describes it.

16.8 Required status classification

For each important component, use:

- "VERIFIED_COMPLIANT"
- "PARTIALLY_COMPLIANT"
- "NON_COMPLIANT"
- "NOT_IMPLEMENTED"
- "NOT_VERIFIED"
- "NOT_APPLICABLE"
- "BLOCKED_BY_MISSING_INPUT"

Provide evidence for the assigned status.

16.9 B-80 completion criteria

The discovery report must establish, as far as available evidence allows:

- Existing B-20 status.
- Existing B-21 status.
- Formula inventory and integration coverage.
- Major duplication and conflict risks.
- Compliance with approved company policies.
- Decimal arithmetic and precision findings.
- Accounting and posting integrity findings.
- Inventory valuation compliance.
- Database and API impacts.
- Relevant benchmark findings.
- Decimal.js compatibility.
- Financial dependencies.
- Critical technical and business blockers.
- Recommended mapping to existing Master Plan WPs.
- A practical, risk-based implementation recommendation.

If evidence is unavailable, explicitly identify the limitation.

Do not fabricate completeness to satisfy the checklist.

16.10 Mandatory stop condition

After completing B-80:

STOP.

Present the discovery findings and the authorized report.

Identify:

- Critical financial blockers.
- Critical technical blockers.
- Policy conflicts.
- Missing business or legal inputs.
- Recommended next work packages.
- Any limitations that prevented verification.

Wait for the user's explicit direction under the Master Plan.

Do not automatically start any implementation work.

---

17. FUTURE FINANCIAL WORKSTREAMS — REFERENCE ONLY

The following are logical work areas, not independently authorized phases.

Their implementation must be mapped to existing Master Plan WPs and executed only when authorized.

Financial Foundation

- Formula specifications.
- Decimal core.
- Formula registry.
- Formula versioning.
- Calculation snapshots.
- Calculation traceability.

Commercial and Tax Integration

- Purchases and sales.
- Pricing and discounts.
- Existing B-21 tax integration.
- Returns and cancellations.
- Payment calculations and allocations.

Inventory and Valuation

- Stock movements.
- Moving Weighted Average.
- Specific Identification.
- Inventory reconciliation.

Projects and Contractors

- Project cost centers.
- Progress certificates.
- Contractor entitlements.
- Advances, deductions, and settlements.
- Project costing and profitability.

HR and Labor

- Payroll.
- Overtime.
- Deductions.
- Labor entitlements.
- Related accounting effects.

Equipment and Fixed Assets

- Equipment operating costs.
- Maintenance and fuel costs.
- Project equipment allocation.
- Fixed asset calculations and depreciation under approved policies.

Accounting and Treasury

- General ledger.
- Subledgers.
- Double-entry posting.
- Cash and bank operations.
- Reconciliation.
- Foreign currency calculations.
- Budgeting and variance analysis.

Cross-Module Validation

- End-to-end financial workflows.
- Formula consistency.
- Financial reconciliation.
- Historical integrity.
- Security and concurrency.
- Backup and recovery.

Do not assume that the sequence above overrides the Master Plan's implementation sequence.

---

18. FINAL ENGINEERING PROTECTION RULES

- Do not create a competing calculation engine.
- Do not replace B-20 or B-21 without verified technical justification and authorization.
- Do not change approved financial policies.
- Do not create duplicate authoritative formulas.
- Do not put authoritative financial formulas in frontend components.
- Do not modify historical financial data silently.
- Do not bypass approval and posting controls.
- Do not activate legally unverified statutory rates.
- Do not permit negative inventory.
- Do not allow duplicate posting.
- Do not use unsafe number allocation.
- Do not break existing API contracts without documented justification and authorization.
- Do not modify the database directly outside approved migration processes.
- Do not install dependencies during read-only discovery.
- Do not create duplicate documentation.
- Do not invent missing business rules.
- Do not claim testing or operational compliance without evidence.
- Do not implement outside an authorized Master Plan WP.
- Do not proceed beyond the currently authorized work.

---

19. FINAL EXECUTION COMMAND

START WITH B-80 ONLY.

Inspect the actual ERP project and its existing financial calculation architecture.

Verify the actual status of:

- B-20 Financial Rules / Calculation Engine.
- B-21 Tax, Withholding and Stamp Engine.
- Existing financial formulas.
- Existing accounting and posting workflows.
- Inventory valuation.
- Chart of Accounts and project cost centers.
- Approval hierarchy.
- Database and API implementation.
- Backup and recovery.
- Opening balances and migration capabilities.

Review the approved company decisions and assess implementation compliance.

Perform a targeted ERPNext and Odoo engineering benchmark relevant to identified gaps and architectural decisions.

Assess Decimal.js compatibility against the actual technology stack and existing B-20 implementation.

Map financial requirements to the existing Master Plan WPs.

Produce the authorized B-80 discovery report:

"docs/B-80_FINANCIAL_ENGINE_DISCOVERY_AUDIT.md"

Do not create a parallel execution roadmap.

Do not create additional approval gates.

Do not modify source code, database structures, database records, dependencies, package files, financial settings, decision records, or unrelated documentation.

Do not run tests, builds, migrations, seeds, or scripts unless their read-only behavior has been verified and their execution is permitted by the Master Plan.

After the report is completed:

STOP.

Present the evidence-based findings, critical blockers, policy conflicts, and recommended next steps.

Wait for explicit user direction.

All approved company policies listed in this specification are already approved. Do not request their approval again.

Only identify genuinely missing inputs, legal verification requirements, technical blockers, or implementation gaps.

---

FINAL GOAL

Deliver a centralized, accurate, consistent, auditable financial calculation architecture integrated with the ERP and governed by the Master Implementation Plan.

The resulting system must preserve:

- Approved company policies.
- Existing B-20 and B-21 investments.
- Historical financial integrity.
- Double-entry accounting.
- Centralized Chart of Accounts.
- Project-level cost traceability.
- Reliable inventory valuation.
- Controlled tax calculations.
- Secure approval and posting workflows.
- Transaction integrity.
- Operational recovery requirements.

The system must achieve:

- No duplicated authoritative financial formulas.
- No inconsistent financial results.
- No unauthorized posting.
- No unverified statutory rates activated.
- No silent historical data changes.
- No bypass of approved company controls.
- No competing execution governance.

The final architecture must be reliable enough to support the company's actual accounting and general contracting operations.