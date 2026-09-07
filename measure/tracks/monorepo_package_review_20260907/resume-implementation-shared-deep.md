# Shared package repair report

## Result

The assigned shared repairs are complete.
The current v3.2 bridge now uses minimum retention across reviewed variants.
An explicit `reps` value defines review history.
A missing `reps` value preserves compatibility by treating `lastReviewedAt` as review history.
Cards with `reps: 0` do not forward retention metadata.
An unreviewed card without proficiency evidence remains `untouched`.
High proficiency retention without reviewed cards remains `inProgress`.
This follows `/home/daniebo/Desktop/mastery-advantage/SPECIFICATION.md` section 2.1.1.
The bridge preserves the proficiency retention and proficiency flag.

Historical v2 repository checks now use `RA_MATH_V2_ROOT`.
The ra-math repository owns those specification, IM3, Measure, and script assertions.
The Mastery Advantage repository remains the current v3.2 specification owner.
Local tests retain current runtime behavior and package boundary coverage.

The Codecamp verifier still validates the artifact, origin base, and inventory.
Its tests now report live-source drift as telemetry.
CLI tests use temporary source fixtures and test explicit, environment, and sibling resolution separately.

The config guard now finds actual AST call expressions.
It ignores the two comment matches that raised the regex count from 634 to 636.
The 15 auth route migrations reduce the reviewed AST count from 634 to 619.
The guard limit remains 621.

`logStructuredError` is the shared logging adapter boundary.
It preserves error severity, event names, request identifiers, routes, methods, and error names.
It omits error messages and stacks.
Codecamp migrated six calls, Sales migrated five calls, and Accounting migrated four calls.
All three apps already depended on `@reading-advantage/utils`.

The Auth Client refresh action now handles request and parsing failures.
It clears loading only while its generation remains current.
It preserves the current authentication state and rethrows the original error.
An older refresh failure cannot change a later logout state.

## Files

- `packages/knowledge-space-core/src/srs-bridge.ts`
- `packages/knowledge-space-core/src/knowledge-state-engine.ts`
- `packages/knowledge-space-core/README.md`
- `packages/knowledge-space-core/src/__tests__/upstream-contract.ts`
- `packages/knowledge-space-core/src/__tests__/docs-reconciliation.test.ts`
- `packages/knowledge-space-core/src/__tests__/phase-1-adversarial.test.ts`
- `packages/knowledge-space-core/src/__tests__/phase-3-adversarial.test.ts`
- `packages/knowledge-space-core/src/__tests__/phase-5-adversarial.test.ts`
- `packages/knowledge-space-core/src/__tests__/phase4-doctor-generate-scripts.test.ts`
- `packages/knowledge-space-core/src/__tests__/phase4-final-verification.test.ts`
- `packages/knowledge-space-core/src/__tests__/phase4-spec-section-6-implementation.test.ts`
- `packages/knowledge-space-core/src/__tests__/phase5-spec-section-3-2-3-7-8-4-13-3-implementation.test.ts`
- `packages/knowledge-space-core/src/__tests__/spec-markers.test.ts`
- `packages/knowledge-space-core/src/__tests__/srs-bridge-implementation.test.ts`
- `packages/knowledge-space-core/src/__tests__/srs-bridge-pipeline.test.ts`
- `packages/knowledge-space-core/src/__tests__/transfer-credit-signature.test.ts`
- `packages/codecamp-knowledge/src/__tests__/curriculum-inventory.test.ts`
- `packages/codecamp-knowledge/src/__tests__/source-sync-and-cli.test.ts`
- `packages/config/src/__tests__/wave2-observability-provider-guard.test.ts`
- `packages/utils/src/structured-error.ts`
- `packages/utils/src/__tests__/structured-error.test.ts`
- `packages/utils/src/index.ts`
- `packages/utils/package.json`
- `packages/utils/README.md`
- `packages/auth-client/src/provider.tsx`
- `packages/auth-client/src/__tests__/hooks.test.tsx`
- `apps/codecamp-advantage/app/api/auth/callback/route.ts`
- `apps/codecamp-advantage/app/api/auth/login/route.ts`
- `apps/codecamp-advantage/app/api/auth/reset-password/route.ts`
- `apps/codecamp-advantage/app/api/auth/logout/route.ts`
- `apps/sales-advantage/app/api/auth/callback/route.ts`
- `apps/sales-advantage/app/api/auth/login/route.ts`
- `apps/sales-advantage/app/api/auth/logout/route.ts`
- `apps/accounting/app/api/auth/callback/route.ts`
- `apps/accounting/app/api/auth/logout/route.ts`
- `apps/accounting/app/api/auth/session/route.ts`
- `graph.db`

The existing Sales company-start changes were preserved without edits from this assignment.

## Verification

- Knowledge Space Core: 648 passed and 47 historical checks skipped without `RA_MATH_V2_ROOT`.
- Historical ra-math v2 command: 81 passed with `RA_MATH_V2_ROOT=/home/daniebo/Desktop/ra-math-advantage`.
- Bridge, pipeline, and adversarial focus: 36 passed.
- Core export and bridge focus: 37 passed and 7 historical checks skipped.
- Knowledge Space Core type check: passed.
- Codecamp inventory and CLI: 15 passed with permitted Git access.
- Codecamp release artifact: 5 passed with permitted subprocess access.
- Codecamp Knowledge test type check: passed.
- Utils structured error tests: 4 passed.
- Utils type check and build: passed.
- Config logging guard: 2 passed.
- Codecamp auth routes: 19 passed.
- Sales auth routes: 20 passed.
- Accounting auth routes: 23 passed.
- Codecamp, Sales, and Accounting app type checks: passed.
- Focused ESLint checks: passed.
- Auth Client full tests: 31 passed.
- Auth Client type check and build: passed.
- Auth Client focused ESLint: passed.
- Code graph update: completed for changed source exports and imports.

## Remaining work

No confirmed defect remains in this assignment.
The root task owns final workspace verification.
