# Implementation Plan: Backend Architecture Enforcement

## Dependencies and sequencing

This is Backend Platform Program Gate 1. Kernel and durable-worker
implementation remain blocked until the final acceptance gate passes.

## Phase 1: Contract, Rule Schema, and Inventory

- [x] Task 1: Define versioned Zod contracts for rules, findings, ownership roots, exact exceptions, and baseline entries. [commit: a3d07363]
- [x] Task 2: Define the database/provider ownership map, including the exact `packages/backend/src/jobs/adapters/postgres/` job-table query root and worker/webhook prohibition, and reconcile it with existing tenant/provider checks. [commits: 2acffc87, 78a96657]
- [x] Task 3: Produce a deterministic read-only inventory and review each proposed baseline entry for owner, rationale, and false positives. [commit: 815209d5]
- [x] Task 4: Freeze v1 database and provider baselines without wildcard exemptions. [commit: 444306fc]

**Verification:** `pnpm architecture:inventory --format json && pnpm architecture:baseline:validate`

**Acceptance gate:** Contracts parse; repeated inventory output is byte-identical;
all baseline entries are reviewed and no implementation package is newly exempted.

## Phase 2: Red Tests and Counterexample Fixtures

- [x] Task 5: Add database-boundary positive fixtures for direct/aliased/barrel/dynamic imports, raw SQL/client calls, and worker/webhook job-table access, plus exact job-port/PostgreSQL-adapter negative fixtures. [commit: 60fcb320]
- [x] Task 6: Add provider-boundary positive fixtures for direct/aliased/barrel/dynamic imports and client construction, plus adapter negatives. [commit: bad9da7c]
- [x] Task 7: Add ratchet tests for new debt, deletion, path rename, wildcard rejection, malformed config, and deterministic diagnostics. [commit: c46c7519]
- [x] Task 8: Run the focused suite and record the expected Red failures against the absent analyzer/ratchet implementation. [commit: ef7eea7d]

**Verification:** `CI=true pnpm vitest run packages/architecture-enforcement/src/__tests__`

**Acceptance gate:** Tests fail for missing behavior, not fixture syntax or broken
test setup; every FR-2–FR-5 counterexample has a named assertion.

## Phase 3: Analyzer and Ratchet Implementation [checkpoint: 4ff2cae]

- [x] Task 9: Implement workspace-aware AST loading and import/re-export/dynamic-import resolution with fail-closed parser errors. [commits: d7238d09, 19af0186]
- [x] Task 10: Implement database ownership and direct-query detection to satisfy its Red fixtures. [commits: d7238d09, 19af0186]
- [x] Task 11: Implement provider ownership and SDK/client-construction detection to satisfy its Red fixtures. [commits: d7238d09, 19af0186]
- [x] Task 12: Implement baseline comparison, explicit acknowledged update flow, stable JSON, and concise human diagnostics. [commits: d7238d09, de19b65e]
- [x] Task 12a: Execute the one-time analyzer-complete baseline reconciliation defined in `analyzer-baseline-reconciliation-strategy.md` with final analyzer SHA `19af018669873e59bb8b721017d3d91fc1096f83`: preserve `3a109c879438fd50b369eb2905ddccfb56722d2b` as the immutable pre-analyzer provenance anchor, reproduce 614 finding identities there plus exactly one self-hosting `MODULE_RESOLUTION_ERROR` at `packages/architecture-enforcement/src/__tests__/ratchet.red.test.ts:49:10`, and manually compare those findings to the historical baselines because fail-closed analysis omits comparison; use `d7238d09551e3961cd7234cc25a412a821c68611` as the separate zero-error execution denominator only after independently auditing the complete 3a..d723 diff as enforcement, documentation, CI, and tenant-guard work with no product architecture debt; require two byte-identical d723 runs with exactly 123 additions, zero removals, zero renames, and zero errors; prove current-HEAD additions equal both anchor-derived sets; independently review every production baseline addition and every test-only exact rule/file exception; preserve rules, ownership roots, and wildcard/directory/production-path prohibitions; perform one preview-first coordinated policy/baseline transaction; and record the accepted final counts, exception pairs, and changed ruleset/baseline hashes. [commits: de19b65e, 07837001, 4b66e7ee, 3e9df00e, 2f1f2180; accepted plan: cf2592ada8f786ad343ce28482010e884e85e69171b98a255886e4c3cfc332eb]

**Verification:** `CI=true pnpm vitest run packages/architecture-enforcement/src/__tests__ && pnpm architecture:check`

**Acceptance gate:** All focused tests are Green. Before Task 12a, the only
permitted debt change is the exact independently reviewed set present in both
the manually derived 3a provenance result and the zero-error d723 execution
result, with the current-HEAD set equal to both, partitioned into production
baseline entries and exact rule/test-file exceptions for test-only evidence.
After the one-time reconciliation the normal checker is clean, baseline validation targets
the analyzer-complete snapshot and reviewed final ruleset hashes, and a temporary
post-base counterexample exits non-zero.

## Phase 4: CI, Documentation, and Doctor [checkpoint: 251f108]

- [x] Task 13: Add the root non-interactive command and CI gate without weakening existing tenant/provider checks. [commit: d7238d09]
- [x] Task 14: Integrate the same command into `measure/doctor.sh` and document remediation/baseline-reduction workflow. [commit: d7238d09]
- [x] Task 15: Run package lint, type-check, tests, architecture check, and Measure doctor; capture deterministic evidence. [evidence: verification.md]
- [x] Task 16: Perform independent review of rules, fixtures, every proposed exact rule/test-file exception and its covered findings, the complete Task 12a reconciliation manifest, final baselines, and changed ruleset hashes; close all Critical/High findings and publish the Gate 1 result with accepted counts and hashes. [evidence: reconciliation-*-review.md, plan-review.md, verification.md]

**Verification:** `pnpm --filter @reading-advantage/architecture-enforcement lint && pnpm --filter @reading-advantage/architecture-enforcement check-types && CI=true pnpm --filter @reading-advantage/architecture-enforcement test && pnpm architecture:check && bash measure/doctor.sh`

**Acceptance gate:** AC-1–AC-9 pass, CI and doctor invoke the same command, and
the accepted analyzer-complete baseline counts and hashes are available to
dependent tracks. The Phase 1 464/27 counts remain historical evidence, not the
expected final count asserted before Task 12a review completes.

## Out of Scope

- Remediating baseline debt, apart from the one-time evidence-model
  reconciliation authorized by the specification and Task 12a.
- Capability/kernel, generated route, or durable-job implementation.
- Broad source-code refactors unrelated to proving the checks.
- Any second reconciliation, acceptance of a post-base finding, or change to a
  rule or ownership root to make the checker pass.
- Any wildcard, directory-wide, production-path, or non-reconciled exact
  exception; only the independently reviewed Task 12a test-only pairs are in
  scope.
