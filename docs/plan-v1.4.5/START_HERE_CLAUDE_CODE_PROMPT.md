# Claude Code — Initial ERP Plan Execution Prompt (v1.4.5)

You are working on the existing contracting-company application. The governing specification is the complete v1.4.5 package in this folder. Treat repository evidence, approved business decisions, approved ADRs, and explicit approval records as authoritative within their respective scopes. Do not assume that planned architecture or features are already implemented.

## Mandatory reading
1. Read `00_README_DOCUMENT_INDEX.md`.
2. Read `01_MASTER_PLAN.md`.
3. Read `02_EXECUTION_ROADMAP.md`.
4. For Phase 0, read only the relevant safety and repository-inspection instructions. Do not load every specialist document unnecessarily.
5. The specialized financial engineering document `07_FINANCIAL_ENGINE_SPECIFICATION_v3.1.md` is subordinate to the Master Plan. Do not treat it as an independent roadmap or authorization source. B-80 (read-only financial discovery) is only authorized when the user explicitly starts that work under an approved Work Package.

## Initial authorization — Phase 0 ONLY
Execute **Phase 0: Repository and Environment Safety Check** in read-only mode. Verify repository identity, exact project root, branch, commit, working-tree status, remotes, runtime/deployment context, available commands, existing test commands (inspect only — do not run commands with uncertain side effects), and the location/authority of project documentation. Identify uncommitted user work and protect it.

Phase 0 is limited to establishing safe access and the working baseline. Do not perform the full Phase 1 decision reconciliation or broad system discovery yet.

## Prohibited during Phase 0
- Do not edit, create, delete, format, move, or rename source files, configuration, documentation, or business files.
- Do not modify database schemas, records, files, attachments, or configuration.
- Do not install/update dependencies or alter lockfiles.
- Do not run destructive, mutating, migration, reset, seed, cleanup, build-output-cleaning, or production commands.
- Do not change branches, commits, remotes, or repository settings.
- Do not start Phase 1, Phase 2, Phase 3, or any implementation work.
- Do not infer approvals from silence or from decisions outside their stated scope.
- Do not execute any test, build, or script whose side effects are uncertain. Inspect command names and content only.
- Do not expose secrets, credentials, tokens, personal data, or production data in reports. Redact any that appear in remotes, logs, or configuration.

If a command may modify state or its effects are uncertain, do not run it. Explain the uncertainty and propose a safe alternative.

## Required Phase 0 response
Present the Phase 0 report in the conversation using the dedicated **Phase 0 Baseline Report Template** in `06_EXECUTION_TEMPLATES.md`. Include at minimum:
1. Repository/project-root identity and evidence.
2. Branch, commit, remotes, and working-tree status.
3. Uncommitted/user work identified and how it was protected.
4. Runtime/environment identity and whether production data may be present.
5. Commands that were inspected and commands deliberately not run, with reasons.
6. Immediate risks, blockers, and unknowns.
7. A clear recommendation on whether Phase 1 can safely begin.

Do not create report files during Phase 0. Do not claim that backups, tests, security, or application behavior are verified unless you actually verified them using a safe method.

## Approval gate
Stop after the Phase 0 report. Ask the user explicitly whether to proceed to Phase 1. **Do not begin Phase 1 unless the user gives a clear affirmative approval.** After approval, follow the Phase 1 scope and restrictions in `02_EXECUTION_ROADMAP.md`; that approval does not authorize Phase 2 or any implementation. Every later phase/work package requires its own explicit scope approval.

## Critical project constraints (v1.4.5)
- Preserve all verified legacy functionality, visual identity, historical data, identifiers, attachments, and user work.
- Preserve approved financial decisions: monetary precision 4 decimal places, `HALF_UP`, and transactional `NO_GAPS` numbering. A committed/issued number is never reused, even if the document is later cancelled. Cancelled documents retain their number and audit history.
- Keep Approval and Posting as distinct states.
- Statutory tax, withholding, and stamp-duty rates remain inactive pending official-source verification and tax-advisor review.
- Do not activate live financial posting, migrate production data, or perform cutover without explicit approvals and passed acceptance gates.
- Treat all recommendations as proposals until approved by the authorized owner.
- Use the unified requirement ID scheme (`LEG-`, `TECH-`, `NEW-`, `CHG-`, `DEC-`).
- When handling legacy data defects, follow the Legacy Data Defects & Migration Exceptions Policy; never silently correct financial balances.

Start with Phase 0 only and wait for approval.
