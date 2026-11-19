# ERP Plan v1.4.5 — Document Index and Reading Guide

**Version:** 1.4.5  
**Date:** 19 November 2026  
**Status:** Micro clarity fix over v1.4.4 — submitted for management review and approval  
**Business:** General contracting company  
**Purpose:** Govern the controlled modernization of the inspected legacy Electron application into an internal Web ERP and installable PWA.

## 1. How to use this package

This package is a focused consistency update to v1.4. It resolves internal conflicts, clarifies phase boundaries, hardens Phase 0 safety, introduces a unified requirement ID scheme, formalizes the Legacy Data Defects policy, and lightens governance by risk level. It does **not** authorize implementation or expand functional scope.

**Read in this order:**
1. `01_MASTER_PLAN.md` — project intent, scope, non-negotiable principles, confirmed decisions, governance, and success criteria.
2. `02_EXECUTION_ROADMAP.md` — phases, work packages, dependencies, gates, sequencing, risk, reporting, and progress control.
3. Read only the relevant specialist documents for the current work package:
   - `03_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md`
   - `04_LEGACY_PRESERVATION_AND_MIGRATION.md`
   - `05_TESTING_AND_ACCEPTANCE.md`
   - `06_EXECUTION_TEMPLATES.md`
   - `07_FINANCIAL_ENGINE_SPECIFICATION_v3.1.md` (financial calculation, accounting, inventory valuation, construction costing, B-20/B-21)

Claude Code must not load every specialist document for every task. It must read the Master Plan and Roadmap first, then only the sections/files relevant to the approved work package. It must state which documents and sections it relied on.

## 2. Document authority and source of truth

| Subject | Authoritative source |
|---|---|
| Business decisions | Repository file `OPEN_BUSINESS_DECISIONS.md` (when present in the project repo — it is **not** shipped inside this planning package), approved ADRs, and explicit approval records |
| Project scope and governance | `01_MASTER_PLAN.md` plus approved scope-change records |
| Phase order and gates | `02_EXECUTION_ROADMAP.md` plus latest signed gate decision |
| Technical design | Approved ADRs and `03_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md` |
| Legacy behavior and migration mapping | Verified repository evidence and `04_LEGACY_PRESERVATION_AND_MIGRATION.md` |
| Acceptance status | Test evidence and `05_TESTING_AND_ACCEPTANCE.md` |
| Actual implementation status | Current source code, database state, runtime evidence, CI results, and approved reports |


**Note on `OPEN_BUSINESS_DECISIONS.md`:** This file is expected to live inside the actual application repository (or to be created there under change control). Its absence from the planning ZIP is intentional; it is not a missing package file.

If documents conflict, do not silently choose one. Stop the affected work, identify the conflict, cite both locations, and request a decision from the authorized owner. A newer timestamp alone does not constitute approval.

**Historical text rule:** `SOURCE_v1.2_REFERENCE.md` is retained only as historical reference. Where any retained historical wording conflicts with active v1.4.5 instructions or explicit approvals, the active v1.4.5 text and approvals govern.

## 3. Requirement classification and ID scheme

Every requirement in the inventory must carry exactly one primary classification **and** a unique ID from the unified scheme below.

### Classification
- `LEGACY-PRESERVE` — verified existing behavior, data, UI, report, workflow, or integration that must be retained unless formally approved for change.
- `APPROVED-CHANGE` — an explicitly approved change to existing behavior.
- `NEW-REQUIREMENT` — a proposed or approved capability not verified in the legacy system. It must not be represented as legacy parity.
- `TECHNICAL` — an engineering, security, infrastructure, maintainability, or operational requirement.
- `OPEN-DECISION` — a matter that requires a named decision owner and explicit resolution.

### Unified Requirement ID scheme (mandatory)
| Prefix | Meaning | Example |
|--------|---------|---------|
| `LEG-` | Verified legacy behavior that must be preserved | `LEG-0042` |
| `TECH-` | Technical / engineering / security / operational | `TECH-0017` |
| `NEW-` | New capability not present in legacy | `NEW-0009` |
| `CHG-` | Approved change to existing behavior | `CHG-0003` |
| `DEC-` | Open decision requiring resolution | `DEC-0012` |

Rules:
- IDs are allocated once and never reused.
- Every requirement must be linked to the module(s) it affects, the tests that cover it, and (where applicable) the approved decision record.
- Claude Code must not invent ad-hoc numbering systems.

### Priority
- `P0` — data integrity, security, financial correctness, preservation of verified legacy capabilities, recoverability, and controls required to prevent material harm.
- `P1` — essential ERP capabilities and verified legacy parity required for an approved first controlled release.
- `P2` — operational improvements, enhanced reporting, usability, and efficiency improvements.
- `P3` — optional enhancements and convenience features.

Priority is a planning classification, not a substitute for business approval. Claude Code must propose priority where not already approved and label it **proposed** until accepted. Do not silently demote or drop any verified legacy capability; if deferral is needed it must be recorded as an explicit decision.

## 4. Work-control vocabulary

- **Phase:** a major stage in the overall modernization program.
- **Work Package (WP):** a bounded, reviewable unit of work with inputs, outputs, acceptance criteria, and an approval gate.
- **Module:** a business capability boundary (for example, procurement, inventory, projects, or accounting); modules may have dependencies and may be delivered across multiple work packages.
- **Gate:** a formal decision point. Passing technical checks does not automatically authorize progression.
- **Release:** a versioned, deployable product increment with documented compatibility, migration, rollback, and acceptance evidence.

A phase may contain multiple work packages. A work package may touch shared platform capabilities and one or more modules only when its scope explicitly permits it. A module is not considered accepted merely because its screens exist.

## 5. Change control and graduated governance

Any change to scope, approved business behavior, data ownership, financial rules, security model, architecture baseline, migration strategy, or acceptance criteria must be recorded before implementation.

Governance effort is proportional to risk:

| Risk level | Typical examples | Required documentation |
|------------|------------------|------------------------|
| Low | Minor UI text, non-financial display fix, documentation | Concise description of change + tests run + result |
| Medium | Non-financial business rule adjustment, new non-critical field, report layout | Before/After summary, linked requirements, tests |
| High / Sensitive | Financial calculations, document numbering, permissions & approvals, data migration, schema changes affecting integrity, backup/restore, posting logic | Full Before/After report, impact analysis, comprehensive tests, explicit named approval |

Main phase and work-package gates remain mandatory regardless of risk level. Silence is never approval.

## 6. Phase 0 authorization reminder

Claude Code is initially authorized for **Phase 0 only** (read-only repository and environment safety check). Phase 1 and all later phases require explicit user approval after the Phase 0 report.

## 7. Package contents

| File | Role |
|------|------|
| `00_README_DOCUMENT_INDEX.md` | This index and reading rules |
| `01_MASTER_PLAN.md` | Governing principles, confirmed decisions (incl. financial policies A–F), success criteria |
| `02_EXECUTION_ROADMAP.md` | Phases, gates, sequencing, Phase 7/10 boundary |
| `03_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md` | Technical design, financial controls, Electron replacement |
| `04_LEGACY_PRESERVATION_AND_MIGRATION.md` | Parity, migration, Legacy Data Defects policy |
| `05_TESTING_AND_ACCEPTANCE.md` | Test strategy and acceptance criteria |
| `06_EXECUTION_TEMPLATES.md` | Phase 0 template first, then WP templates |
| `07_FINANCIAL_ENGINE_SPECIFICATION_v3.1.md` | Specialized financial calculation, accounting, inventory valuation, construction costing, B-20/B-21 engineering spec (subordinate to Master Plan) |
| `START_HERE_CLAUDE_CODE_PROMPT.md` | Initial execution prompt for Claude Code |
| `CHANGELOG_v1.4.5.md` | Changes from v1.4.4 |
| `SOURCE_v1.2_REFERENCE.md` | Historical reference only (unchanged) |
| `PACKAGE_MANIFEST.md` | File list and package summary |

## 8. Success criteria (summary)

A successful modernization delivers:
- Verified legacy functionality preserved or explicitly and approvedly replaced.
- Financial calculations that match approved rules with full auditability.
- Strict transactional `NO_GAPS` numbering.
- Separated Approval and Posting states.
- Reconciled, recoverable data and attachment migration.
- Working backup/restore and operational controls.
- Clear phase gates and no silent progression.
