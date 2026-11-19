# EXECUTION TEMPLATES

**Version:** 1.4.5 | **Date:** 19 November 2026  
Use these templates for every authorized work package. Replace bracketed placeholders. Do not mark an approval as granted unless the named approver explicitly grants it.

## 0. Phase 0 Baseline Report Template (mandatory for Phase 0 only)

Use this template exclusively for the Phase 0 report. Present it in the conversation. Do not write files during Phase 0.

### A. Repository and project identity
- Exact project root path:
- Evidence that this is the intended repository (package.json / README / distinctive files):
- Current branch:
- Current commit hash (full):
- Remote(s) (redact any tokens or credentials):
- Working-tree status (clean / dirty). List of uncommitted or untracked files that appear to be user work:
- How uncommitted user work was protected (left untouched / noted for user):

### B. Environment and runtime
- Detected runtime / Node version / package manager (if safely observable without side effects):
- Evidence of database presence or connection strings (redact secrets; do not connect or query):
- Indication whether production data may be present in the current environment:
- Any deployment or process configuration discovered (without starting services):

### C. Commands and safety
- List of test / build / migration / seed commands discovered by inspection of package.json, scripts, or documentation:
- Commands that were **inspected only** (not executed):
- Commands that were deliberately **not run**, with reason (side-effect risk, unknown behavior, destructive potential):
- Confirmation that no mutating, installing, migrating, seeding, or cleaning commands were executed:

### D. Documentation and authority
- Location of project documentation found inside the repository:
- Any obvious conflict between repository state and the v1.4.5 plan documents:

### E. Risks, blockers, and unknowns
- Immediate risks identified:
- Blockers that prevent safe start of Phase 1:
- Unknowns that should be resolved before Phase 1:

### F. Recommendation
- Recommendation: **SAFE TO PROCEED TO PHASE 1** / **CONDITIONAL** / **NOT SAFE**
- Conditions (if any) that must be satisfied before Phase 1 approval:
- Explicit request to the user: “Do you approve starting Phase 1 under the scope defined in 02_EXECUTION_ROADMAP.md?”

**Rules for Phase 0:**
- Read-only.
- No file creation or modification.
- No command execution that can change state.
- Redact secrets.
- Stop and wait for explicit approval.

---

## 1. Work Package Authorization Request


- WP ID:
- Title / Phase:
- Request date:
- Requester / execution owner:
- Objective and expected business outcome:
- Requirement IDs and classifications:
- Proposed priorities (mark unapproved priorities as proposed):
- In-scope:
- Explicitly out-of-scope:
- Affected modules / pages / APIs / data / reports / integrations:
- Prerequisites and dependency evidence:
- Files or systems to inspect:
- Permitted actions:
- Prohibited actions:
- Data classification and test-data boundary:
- Risks and mitigations:
- Deliverables:
- Acceptance criteria:
- Required reviewers / approvers:
- Gate to be reached:
- Approval decision / approver / date / reference:

## 2. Before Report (mandatory before changes)

### A. Identity and baseline
- Repository path:
- Branch:
- Commit hash:
- Working-tree status:
- Runtime/environment:
- Current release/version:
- Relevant database/data source:
- Backup/recovery status:

### B. Scope and safety
- Authorized WP:
- Documents/sections consulted:
- Requirements covered:
- In-scope / out-of-scope:
- Allowed and prohibited actions:
- Production data present? Evidence:
- Destructive or irreversible actions? Expected: none unless separately approved.

### C. Current behavior and evidence
- Relevant files/components:
- Current workflows and behavior:
- Existing tests and exact commands:
- Test results:
- Known defects / limitations:
- UI screenshots or visual baseline references:
- Data entities and attachment relationships:

### D. Plan
- Proposed changes:
- Files/data expected to change:
- Migration or schema impact:
- Security/financial impact:
- Rollback plan:
- Test plan:
- Open decisions:
- Approval required before proceeding? State explicitly.

## 3. After Report (mandatory after changes)

### A. Execution summary
- WP ID:
- Commit(s):
- Completed:
- Not completed:
- Deviations from authorization:
- Files added/modified/deleted:
- Database/schema/data changes:
- Configuration/secrets changes (never expose secret values):

### B. Verification
- Build commands/results:
- Unit/integration/E2E/security tests:
- Migration/reconciliation results:
- UI/visual parity results:
- Performance observations:
- Backup/restore or rollback evidence:
- Exact evidence locations:

### C. Risk and remaining work
- Defects by severity:
- Open decisions:
- Deferred requirements and reasons:
- Known limitations:
- Data integrity status:
- Rollback readiness:

### D. Gate recommendation (not approval)
- Recommended: PASS / CONDITIONAL PASS / FAIL
- Evidence supporting recommendation:
- Conditions and owners:
- Required approver:
- Explicit approval received? YES / NO
- Next authorized WP (leave blank until approval):

## 4. Requirement Traceability Record

| Field | Value |
|---|---|
| Requirement ID | |
| Title / description | |
| Primary classification | LEGACY-PRESERVE / APPROVED-CHANGE / NEW-REQUIREMENT / TECHNICAL / OPEN-DECISION |
| Priority | P0 / P1 / P2 / P3 (proposed until approved) |
| Source / evidence | |
| Decision / approval reference | |
| Module / page / workflow | |
| Inputs / validations / rules | |
| Data / API / integration | |
| Permissions / audit | |
| Reports / print / export / attachments | |
| Target disposition | |
| Acceptance criteria | |
| Test case IDs / evidence | |
| Status / owner | |

## 5. Scope Change Request

- Change ID:
- Requester / date:
- Existing approved baseline:
- Requested change:
- Reason / business value:
- Requirement IDs affected:
- Legacy behavior affected:
- Modules / screens / data / reports / APIs affected:
- Security and segregation-of-duties impact:
- Financial/accounting/tax impact:
- Migration/history impact:
- Performance/backup/restore impact:
- Options considered:
- Effort estimate and assumptions:
- Test and acceptance changes:
- Rollback/recovery:
- Recommendation (not approval):
- Decision owner:
- Explicit decision / date / reference:
- Documents and traceability updated:

## 6. Module Acceptance Record

- Module:
- Release / build / commit:
- Business owner:
- Requirements and traceability complete:
- Legacy parity evidence:
- New/changed requirements separately approved:
- UI/RTL/responsive acceptance:
- Workflow and approval lifecycle:
- Data model and migration reconciliation:
- API and cross-module integration:
- Authorization and audit:
- Financial/business golden cases:
- Reports/exports/printing:
- Unit/integration/E2E/security tests:
- Performance and monitoring:
- Backup/restore and rollback:
- Training and operating procedure:
- Open defects and severity:
- Readiness dimensions (Not assessed / Red / Amber / Green):
- Any P0 failures?:
- Exceptions with owner, compensating control, expiry, approval:
- Business UAT decision:
- Technical decision:
- Final acceptance: ACCEPT / REJECT / CONDITIONAL (explicitly approved):
- Approver / date / reference:

## 7. Architecture Decision Record (ADR)

- ADR ID / title / status:
- Context and problem:
- Constraints and confirmed decisions:
- Options considered:
- Decision:
- Rationale:
- Consequences and trade-offs:
- Security/data/financial impact:
- Migration and compatibility impact:
- Validation plan:
- Supersedes / related ADRs:
- Decision owner and approval reference:

## 8. Gate Approval Record

- Gate ID / phase / WP:
- Deliverables reviewed:
- Acceptance evidence:
- Outstanding P0/P1 defects:
- Open decisions:
- Risks and mitigations:
- Decision: APPROVE / REJECT / CONDITIONAL APPROVAL
- Conditions, owner, due date:
- Explicit approver:
- Date and approval reference:
- Next permitted scope:


---
