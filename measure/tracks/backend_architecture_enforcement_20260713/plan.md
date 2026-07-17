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

## Phase 3: Analyzer and Ratchet Implementation

- [~] Task 9: Implement workspace-aware AST loading and import/re-export/dynamic-import resolution with fail-closed parser errors.
- [~] Task 10: Implement database ownership and direct-query detection to satisfy its Red fixtures.
- [~] Task 11: Implement provider ownership and SDK/client-construction detection to satisfy its Red fixtures.
- [~] Task 12: Implement baseline comparison, explicit acknowledged update flow, stable JSON, and concise human diagnostics.
- [ ] Task 12a: Execute the one-time analyzer-complete baseline reconciliation defined in `analyzer-baseline-reconciliation-strategy.md`: bind every proposed addition to immutable source revision `3a109c879438fd50b369eb2905ddccfb56722d2b`, whose commit introduces only the two fail-closed source-resolution prerequisites and no analyzer or ratchet implementation change; independently review every addition and its owner/rationale; preserve rules/roots/exceptions and wildcard prohibitions; perform one preview-first acknowledged transaction; and record the accepted final counts and hashes. The current 614-total / 123-addition result is a diagnostic candidate only and must not be copied into acceptance evidence until analyzer instrumentation and resolver behavior are final.

**Verification:** `CI=true pnpm vitest run packages/architecture-enforcement/src/__tests__ && pnpm architecture:check`

**Acceptance gate:** All focused tests are Green. Before Task 12a, the only
permitted debt change is the exact independently reviewed set reproduced at the
immutable pre-analyzer source revision. After the one-time reconciliation the
normal checker is clean, baseline validation targets the analyzer-complete
snapshot, and a temporary post-base counterexample exits non-zero.

## Phase 4: CI, Documentation, and Doctor

- [~] Task 13: Add the root non-interactive command and CI gate without weakening existing tenant/provider checks.
- [~] Task 14: Integrate the same command into `measure/doctor.sh` and document remediation/baseline-reduction workflow.
- [ ] Task 15: Run package lint, type-check, tests, architecture check, and Measure doctor; capture deterministic evidence.
- [ ] Task 16: Perform independent review of rules, fixtures, exclusions, the complete Task 12a reconciliation manifest, and final baselines; close all Critical/High findings and publish the Gate 1 result with accepted counts and hashes.

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
  rule, ownership root, or exact exception to make the checker pass.
