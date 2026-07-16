# Phase 3 Mid-Red Revalidation Evidence

## Command

```bash
CI=true pnpm exec vitest run packages/architecture-enforcement/src/__tests__ --reporter=verbose
```

The command ran from the monorepo root against the immutable
`phase_base_sha` `9d0c6f770d8a232a31a49656ef2cd5c39888c92b` and exited non-zero,
matching the Phase 2 Red oracle and the Phase 3 strategy's authoritative gate.

## Failure signature

- Test files: 2 failed, 10 passed (12 total).
- Assertions: 25 failed, 62 passed, 87 total.
- Analyzer matrix: 21/21 named counterexample assertions failed because
  `analyzeArchitectureSources` is not exported from
  `packages/architecture-enforcement/src/analyzer.ts`. The Phase 3
  Tasks 10 and 11 rule detection is intentionally absent.
- Ratchet matrix: 4/5 behavior assertions failed because
  `packages/architecture-enforcement/src/ratchet.ts` (and its compiled
  `ratchet.js`) does not yet exist. The ratchet wildcard/malformed-policy
  assertion already passes against the strict Phase 1 contracts.

## Named analyzer coverage revalidated

The Red matrix names every required positive and negative case:

- `database-direct-import`, `database-alias-import`, `database-barrel-import`,
  `database-dynamic-import`, `database-raw-client-route`,
  `database-webhook-job-table`, `database-worker-job-table` all fail with
  `TypeError: analyzeArchitectureSources is not a function`.
- `database-approved-postgres-job-adapter` and `database-worker-job-port`
  allowances fail with the same root cause; they must produce an empty
  finding collection when Phase 3 supplies the analyzer.
- `provider-ai-direct-import`, `provider-ai-alias-import`,
  `provider-ai-client-construction`, `provider-ai-credential-read`,
  `provider-storage-barrel-import`, and `provider-integration-dynamic-import`
  all fail with the same root cause.
- `provider-ai-adapter`, `provider-ai-internal-interface`,
  `provider-exact-test-exception`, `provider-integration-adapter`,
  `provider-storage-adapter`, and `provider-storage-internal-interface`
  allowances fail with the same root cause; they must produce an empty
  finding collection when Phase 3 supplies the analyzer.

The accepted Phase 1 strict contract guarantees that allowed fixtures must
return an empty finding collection across every rule, so a different-rule
violation cannot produce a false Green result.

## Named ratchet coverage revalidated

- `fails when a new violation increases reviewed debt` fails because
  `ratchet.js` is missing.
- `requires baseline reduction when a reviewed violation is deleted`
  fails because `ratchet.js` is missing.
- `recognizes a path rename as the same unresolved semantic violation`
  fails because `ratchet.js` is missing.
- `rejects wildcard and malformed policy instead of broadening debt` passes
  via the strict Phase 1 schema contract (the ratchet module is not needed
  to reject an `apps/*/src/database.test.ts` exception or a future schema
  version). This is the expected Phase 3 behavior and the strategy
  documents it explicitly.
- `serializes diagnostics identically for reordered current findings`
  fails because `ratchet.js` is missing.

## Non-vacuous proof

- No `it.skip`, `it.todo`, `it.skipIf`, or `--passWithNoTests` markers
  appear in the two failing test files.
- `tests/_lib/` is not installed in this project; both test files inline
  the standard harness (`FAILED=0` / `RESULTS+=` pattern is absent because
  vitest provides the assertion framework, but every test calls a single
  named `expect(...)` and is not structurally conditional).
- Each `it.each` parameter is the explicit named fixture id; `it.each`
  expansion is not a vacuous loop because each iteration invokes a
  distinct `fixture.id` with its own fixture root, source path, and
  expected rule.
- Failure messages reference the named fixture id and the named missing
  function or missing module path; a missing-test-file or a skipped suite
  would not produce those messages.
- The 62 passing tests include the strict contract, baseline freeze,
  baseline validation, workspace resolution, loader resolution, ownership
  map, inventory, and stable order tests from Phases 1 and 2, confirming
  that the test environment is correctly configured and that the focused
  failures are isolated to the missing Phase 3 implementation.

## Phase 3 status

The Red oracle is intact, non-vacuous, and consistent with the Phase 2
verification and Phase 3 strategy. Phase 3 Green requires:

- `analyzeArchitectureSources` to be exported from
  `packages/architecture-enforcement/src/analyzer.ts` and to satisfy the
  21 named counterexamples (Tasks 10 and 11); and
- `compareArchitectureDebt` and `serializeArchitectureComparison` to be
  exported from `packages/architecture-enforcement/src/ratchet.ts` and to
  satisfy the four remaining ratchet assertions (Task 12).

Until those production modules are supplied, the focused Phase 3 suite
must remain Red and the root `pnpm architecture:check` command must remain
absent (Phase 4 wiring dependency).