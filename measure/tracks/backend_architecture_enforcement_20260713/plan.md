# Implementation Plan: Backend Architecture Enforcement

## Dependencies and sequencing

This is Backend Platform Program Gate 1. Kernel and durable-worker
implementation remain blocked until the final acceptance gate passes.

## Phase 1: Contract, Rule Schema, and Inventory

- [~] Task 1: Define versioned Zod contracts for rules, findings, ownership roots, exact exceptions, and baseline entries.
- [ ] Task 2: Define the database/provider ownership map, including the exact `packages/backend/src/jobs/adapters/postgres/` job-table query root and worker/webhook prohibition, and reconcile it with existing tenant/provider checks.
- [ ] Task 3: Produce a deterministic read-only inventory and review each proposed baseline entry for owner, rationale, and false positives.
- [ ] Task 4: Freeze v1 database and provider baselines without wildcard exemptions.

**Verification:** `pnpm architecture:inventory --format json && pnpm architecture:baseline:validate`

**Acceptance gate:** Contracts parse; repeated inventory output is byte-identical;
all baseline entries are reviewed and no implementation package is newly exempted.

## Phase 2: Red Tests and Counterexample Fixtures

- [ ] Task 5: Add database-boundary positive fixtures for direct/aliased/barrel/dynamic imports, raw SQL/client calls, and worker/webhook job-table access, plus exact job-port/PostgreSQL-adapter negative fixtures.
- [ ] Task 6: Add provider-boundary positive fixtures for direct/aliased/barrel/dynamic imports and client construction, plus adapter negatives.
- [ ] Task 7: Add ratchet tests for new debt, deletion, path rename, wildcard rejection, malformed config, and deterministic diagnostics.
- [ ] Task 8: Run the focused suite and record the expected Red failures against the absent analyzer/ratchet implementation.

**Verification:** `CI=true pnpm vitest run packages/architecture-enforcement/src/__tests__`

**Acceptance gate:** Tests fail for missing behavior, not fixture syntax or broken
test setup; every FR-2–FR-5 counterexample has a named assertion.

## Phase 3: Analyzer and Ratchet Implementation

- [ ] Task 9: Implement workspace-aware AST loading and import/re-export/dynamic-import resolution with fail-closed parser errors.
- [ ] Task 10: Implement database ownership and direct-query detection to satisfy its Red fixtures.
- [ ] Task 11: Implement provider ownership and SDK/client-construction detection to satisfy its Red fixtures.
- [ ] Task 12: Implement baseline comparison, explicit acknowledged update flow, stable JSON, and concise human diagnostics.

**Verification:** `CI=true pnpm vitest run packages/architecture-enforcement/src/__tests__ && pnpm architecture:check`

**Acceptance gate:** All focused tests are Green; the repository is no worse than
the reviewed baseline; a temporary counterexample above baseline exits non-zero.

## Phase 4: CI, Documentation, and Doctor

- [ ] Task 13: Add the root non-interactive command and CI gate without weakening existing tenant/provider checks.
- [ ] Task 14: Integrate the same command into `measure/doctor.sh` and document remediation/baseline-reduction workflow.
- [ ] Task 15: Run package lint, type-check, tests, architecture check, and Measure doctor; capture deterministic evidence.
- [ ] Task 16: Perform independent review of rules, fixtures, exclusions, and baselines; close all Critical/High findings and publish the Gate 1 result.

**Verification:** `pnpm --filter @reading-advantage/architecture-enforcement lint && pnpm --filter @reading-advantage/architecture-enforcement check-types && CI=true pnpm --filter @reading-advantage/architecture-enforcement test && pnpm architecture:check && bash measure/doctor.sh`

**Acceptance gate:** AC-1–AC-8 pass, CI and doctor invoke the same command, and
the accepted baseline/hash is available to dependent tracks.

## Out of Scope

- Remediating baseline debt.
- Capability/kernel, generated route, or durable-job implementation.
- Broad source-code refactors unrelated to proving the checks.
