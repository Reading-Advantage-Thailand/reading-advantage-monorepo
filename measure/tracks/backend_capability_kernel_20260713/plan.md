# Implementation Plan: Backend Capability Kernel

## Dependencies and sequencing

Start only after `backend_architecture_enforcement_20260713` publishes an
accepted Gate 1 baseline/hash. The durable-worker track can run concurrently,
but its capability-bound handler phase waits for this track's public API gate.

## Phase 1: Contract and Policy Schema

- [x] Task 1: Scaffold `packages/backend` as `@reading-advantage/backend`: add package manifest, exports, build/lint/test/check-types scripts, tsconfig, source/test roots, verify `packages/*` workspace discovery, and wire its tasks/outputs into Turbo before any filtered command runs. [evidence: scaffold-verification.md]

**Task 1 package-scaffold verification:** `pnpm --filter @reading-advantage/backend check-types && pnpm turbo run check-types --filter=@reading-advantage/backend --dry=json`

**Task 1 package-scaffold acceptance gate:** The workspace resolves exactly one
`@reading-advantage/backend` package; its manifest, exports, scripts, TypeScript
configuration, and Turbo task are valid. This gate must be explicitly accepted
before Task 2 or durable-job contract/test work writes under
`packages/backend/src/jobs/`.

- [x] Task 2: Define Zod-backed descriptor schemas/types for query, command, and job capabilities with JSDoc. [evidence: phase-1-contract-verification.md]
- [x] Task 3: Define executor context, auth/tenant/authorization policy ports, scoped adapter access, and transaction contract. [evidence: phase-1-contract-verification.md]
- [x] Task 4: Define stable platform error, audit declaration, and durable idempotency contracts with safe serialization rules. [evidence: phase-1-contract-verification.md]
- [x] Task 5: Define registry, generated catalog schema, route-binding schema, and invalid-combination matrix. [evidence: phase-1-contract-verification.md]

**Verification:** `pnpm --filter @reading-advantage/backend check-types && pnpm architecture:check`

**Acceptance gate:** Public contracts represent every canonical descriptor field;
unsupported combinations are enumerated before implementation; no boundary
baseline increases.

## Phase 2: Red Executor and Registry Tests

- [~] Task 6: Add registration counterexamples for duplicate IDs, invalid schemas, contradictory auth/tenant/transaction/audit/idempotency policies, and direct handler exposure.
- [~] Task 7: Add ordered-executor Red tests for validation, auth, trusted tenancy, authorization, transaction, handler, output validation, audit, and settlement.
- [~] Task 8: Add Red tests for rollback, safe declared/unexpected errors, audit redaction/failure, and durable idempotency ownership/replay/conflict.
- [~] Task 9: Run focused tests and record expected Red failures against missing kernel behavior.

**Verification:** `CI=true pnpm vitest run packages/backend/src/kernel/__tests__`

**Acceptance gate:** Failures prove missing behavior rather than invalid test
setup; handler non-execution is asserted for every failed precondition.

## Phase 3: Kernel Implementation

- [~] Task 10: Implement descriptor builders and fail-closed registry validation.
- [~] Task 11: Implement executor context creation plus input/auth/tenant/authorization ordering using existing adapters.
- [~] Task 12: Implement transaction, output validation, typed error normalization, and secret-safe observability.
- [~] Task 13: Implement audit and durable idempotency orchestration; add the reviewed Drizzle capability-idempotency schema/migration, tenant-registry classification, PostgreSQL adapter, and isolated two-connection atomic acquisition/settlement/rollback evidence; then make all Phase 2 tests Green.

**Verification:** `CI=true pnpm vitest run packages/backend/src/kernel/__tests__ && pnpm --filter @reading-advantage/backend check-types && pnpm --filter @reading-advantage/db test && pnpm --filter @reading-advantage/domain test`

**Acceptance gate:** AC-1–AC-4 pass, coverage for new kernel code is at least
80%, the durable idempotency adapter proves atomic owner/replay/conflict and
rollback behavior on isolated PostgreSQL connections without production URL
fallback, migration/tenant governance passes, and architecture baselines do
not grow.

## Phase 4: Catalog and Route Bindings (Red to Green)

- [~] Task 14: Add Red generator fixtures for duplicate IDs/routes, stale output, unsafe exposure, incompatible kinds, and a synchronous job binding.
- [~] Task 15: Implement deterministic descriptor discovery and JSON/Markdown capability catalog generation.
- [~] Task 16: Implement deterministic route manifest/thin bindings that invoke only the executor by capability ID.

**Verification:** `CI=true pnpm vitest run packages/backend/src/generator/__tests__ && pnpm backend:generate && git diff --exit-code -- measure/generated`

**Acceptance gate:** AC-5–AC-6 pass; two generations are byte-identical; every
generated binding resolves to exactly one registered capability.

## Phase 5: Small/New-App Pilot, Documentation, and Doctor

- [~] Task 17: Inventory candidate operations, select one bounded small/new-app pilot, and record compatibility, tenant, baseline, rollout, and rollback evidence.
- [~] Task 18: Implement the pilot through a generated binding and executor, run compatibility/auth/tenant/error tests, and ratchet removed debt downward.
- [~] Task 19: Document authoring/migration workflow, wire stale-generation checks into CI/doctor, run full gates, and complete independent acceptance review.

**Verification:** `CI=true pnpm --filter @reading-advantage/backend test && pnpm --filter @reading-advantage/backend lint && pnpm --filter @reading-advantage/backend check-types && pnpm backend:generate && git diff --exit-code -- measure/generated && pnpm architecture:check && bash measure/doctor.sh`

**Acceptance gate:** AC-1–AC-8 pass; pilot transport behavior is compatible;
Gate 1 baselines are equal or lower; the stable descriptor/executor API is
published for capability-bound job handlers.

## Out of Scope

- Reading/Primary migration beyond pilot planning.
- Durable queue implementation and worker process lifecycle.
- Provider SDK changes, realtime subscriptions, or hosted backend services.
