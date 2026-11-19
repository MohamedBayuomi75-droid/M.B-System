# TESTING AND ACCEPTANCE SPECIFICATION

**Version:** 1.4.5 | **Date:** 19 November 2026  
**Purpose:** Define evidence-based testing and acceptance for parity, migration, financial correctness, module readiness, releases, and go-live.

Read the Master Plan and Roadmap first. Testing is continuous; passing a build or a small existing test suite is not proof of ERP readiness.

## 1. Acceptance principles

- Every requirement must map to one or more tests or an explicitly approved reason why it is not testable.
- Every critical legacy behavior needs a golden case or a documented alternative acceptance method.
- Tests must run against controlled fixtures; never use production data for destructive test scenarios.
- Record exact commands, environment, commit, results, logs, and known limitations.
- A test not run is `NOT RUN`, never implicitly passed.
- A module is accepted only when its UI, workflow, data, security, integrations, reports, migration, and operational behavior meet its approved criteria.
- Any P0 defect blocks acceptance and release.


---

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


---

# v1.4 Acceptance Additions

## 2.1 Requirement-to-test traceability

Maintain a traceability matrix with at least: requirement ID; source and classification; priority; module/process; acceptance criterion; test-case ID; test layer; test data/fixture; expected result source; latest result; evidence link; defect/exception; approver; and release/WP. Every P0 and P1 requirement must have explicit acceptance coverage before the relevant release. Uncovered requirements remain visible and block acceptance where material.

## 2.2 Mandatory cross-module business journeys

For every implemented journey, test the complete chain and its failure paths, not only individual screens. At minimum evaluate applicable flows for procure-to-pay, project-to-cash, inventory-to-site, subcontractor settlement, labor/equipment allocation to project cost, and quality/safety corrective actions. Verify document lineage, authorization, state transitions, audit trail, balances, rollback/compensation, and reports across the chain. Applicability must be confirmed from verified legacy behavior and approved scope.

## 2.3 Financial and data-integrity test catalogue

Include automated tests for: exact 4-decimal precision; `HALF_UP` at approved rounding boundaries; balanced journal entries; immutable posted records; reversal/correction linkage; approval-versus-posting separation; strict transactional `NO_GAPS` numbering under success, rollback, cancellation, and concurrency; idempotent retries; duplicate submission; concurrent stock and financial operations; sub-ledger/general-ledger reconciliation; and migration reconciliation. Test statutory tax/withholding/stamp items in inactive/unconfigured states until separately authorized; do not create assumed rates as fixtures for production behavior.

## 2.4 Performance acceptance protocol

Before performance is a release gate, management must approve measurable targets and representative workload assumptions. Each performance report must identify hardware, environment, dataset profile, concurrency, workload mix, duration, percentile latency, throughput, error rate, resource utilization, and bottlenecks. A result without reproducible conditions is diagnostic only, not acceptance evidence.

## 2.5 Backup and recovery acceptance

A release requiring production readiness must have a successful isolated restore rehearsal covering database, attachments, application/configuration artifacts, encryption-key recovery, login, representative business workflows, financial/inventory reconciliation, and service reopening. Record measured RPO/RTO against approved targets, recovery gaps, evidence, and owner sign-off. Never perform destructive restore tests against production.

## 2.6 Exceptions and conditional acceptance

An exception must identify the requirement, reason, impact, compensating control, risk owner, expiry/review date, affected release, and explicit approval. No exception may waive a legal obligation, conceal a P0 data-integrity/security/financial defect, or convert an untested feature into a passed test.
