# Test strategy: Backend Capability Kernel — Phase 3 provenance and adoption reconciliation

> Canonical strategy for `backend_capability_kernel_20260713`, Phase 3 (Kernel
> Implementation), with reference coverage of Phases 1, 2, 4, and 5. This role
> owns only this file plus the plan annotation and role log. It owns no product
> source, test source, migration, or generated fact.
>
> Phase 3 is **not** a new Red phase. The Phase 2 Red suites (commit
> `569f4f214`, this track) now pass because the implementation landed under
> other tracks: `2ec48b0f2` (`company_identity_sso_20260715`) plus five SSO
> follow-ups, and `9355abf62` (`small_company_admin_privileges_20260722`).
> Phase 3 is therefore a provenance, adoption, and live-proof reconciliation
> phase. Its Red state is a set of missing-evidence and open-gate checks, not
> missing product tests.

## Verified current state at role_base_sha `1129427fbdb17c214fd55c086d60e62c7a4e1b7f`

This role executed the following read-only gates. No file was modified.

| ID | Gate | Result |
|----|------|--------|
| E1 | `CI=true pnpm vitest run packages/backend/src/kernel/__tests__` (repo root) | 9 files, 156 passed, 7 skipped |
| E2 | Same suites with `PG_TEST_URL` set, run from `packages/backend` | 9 files, 163 passed, 0 skipped |
| E3 | `postgres-idempotency.integration.test.ts` alone, `PG_TEST_URL` set | 8/8 passed on PostgreSQL 16.14 (container `measure-audit-pg`, `postgres:16`) |
| E4 | Integration suite with `PG_TEST_URL` set, run from repo root | Fails: migration path `../../packages/db/drizzle/0038_...sql` is cwd-dependent |
| E5 | `pnpm --filter @reading-advantage/backend exec tsc --noEmit` | Pass. `tsc --noEmit -p tsconfig.test.json`: 18 TS6059 errors, all non-kernel paths |
| E6 | `pnpm --filter @reading-advantage/db test` | Red: 65 failed / 1080 passed. Failures are company-identity podman integration suites (`pasta failed with exit code 1`). `capability-idempotency-schema.test.ts` passes 2/2 standalone |
| E7 | `pnpm --filter @reading-advantage/domain test` | Red: 74 failed / 691 passed. Failures are activity/games/mastery live-DB integration suites. `tenant-coverage.test.ts` passes 12/12 standalone |
| E8 | Coverage for `src/kernel/**` | Never measured. The backend package has no coverage script or provider |

E4 defines an invocation contract: the PG16 proof command must run with
`packages/backend` as the working directory. A repo-root invocation fails on
path resolution, not on kernel behavior.

## Phase scope and risk classification

| Phase | State | Risk | This strategy |
|-------|-------|------|---------------|
| Phase 1: Contract and Policy Schema | Accepted (`phase-1-contract-verification.md`) | low | Reference only; regression-guarded |
| Phase 2: Red Executor and Registry Tests | Accepted (`phase-2-red-verification.md`) | low | Reference only; historical Red evidence |
| Phase 3: Kernel Implementation | Active; implementation landed cross-track; acceptance gate incomplete | high | Full strategy below |
| Phase 4: Catalog and Route Bindings | Not started | medium | Forward gates only |
| Phase 5: Small/New-App Pilot, Documentation, Doctor | Not started | high | Forward gates only |

Phase 3 is HIGH, not CRITICAL: the PG16 two-connection atomic proof passes (E3),
and the kernel owns no tenant business data. It is not MEDIUM: coverage is
unmeasured, the plan verification command is Red (E5), the db/domain aggregate
gates are Red (E6, E7), and the duplicate-adapter decision is open.

## Phase 3: acceptance of existing implementation versus required remediation

### Accepted-in-principle implementation (subject to phase-acceptance re-run)

The following satisfies the implementation intent of Tasks 10–13, proven by
E1–E3 at role_base_sha:

- Descriptor builders and fail-closed registry validation: 62 registry tests.
- Ordered executor pipeline with handler non-execution per failed precondition:
  45 pipeline tests plus 7 hardening tests.
- Context and safety contracts: 9 tests. Durable value semantics: 19 tests.
- Catalog and route-binding contract behavior: 6 tests.
- Durable idempotency: reviewed Drizzle migration `0038_capability_idempotency_records.sql`,
  schema with state/scope/tenant-key check constraints, and the PostgreSQL adapter.
- PG16 two-connection proof: one owner across two isolated connections,
  deterministic replay, non-retryable input conflict, retryable reacquisition,
  terminal settlement preservation, and rollback. 8/8 pass (E3).
- Tenant governance: `capabilityIdempotencyRecords` is classified EXEMPT in
  `packages/domain/src/tenant-registry.ts` (line 186); `tenant-coverage.test.ts`
  passes 12/12; the db schema contract test passes 2/2.

### Required remediation before Phase 3 acceptance (R1–R7)

These items are Red today. Each has a falsification condition.

- **R1 — Coverage evidence missing (E8).** The plan gate requires at least 80%
  coverage for new kernel code. No measurement exists. An implementation role
  must add a coverage provider and publish per-file numbers for `src/kernel/**`.
  Falsification: coverage below 80% on any kernel file fails the gate.
- **R2 — `check-types` is Red (E5).** 18 TS6059 rootDir errors come from
  non-kernel modules (advantage-play-kit cross-imports, finance and
  planned-game-intake Red tests, standard-pack-ingestion lifecycle test). The
  owning tracks must fix them, or phase-acceptance must record an explicit
  pre-existing-failure disposition with the exact file list. The strategy does
  not permit a silent waiver.
- **R3 — db aggregate suite is Red in this environment (E6).** Failures are
  podman container-spawn errors (`pasta`) in company-identity integration
  suites. Acceptance must either run the suite in a provisioned environment or
  record an environment-gated disposition naming each failing file. The
  kernel-relevant subset (`capability-idempotency-schema.test.ts`) must stay
  green. Falsification: a capability-idempotency schema failure is never
  waivable.
- **R4 — domain aggregate suite is Red in this environment (E7).** Failures are
  live-DB integration suites outside kernel scope. Same disposition rule as R3.
  `tenant-coverage.test.ts` (12/12) is never waivable.
- **R5 — Architecture baseline gate not executed.** Phase-acceptance must run
  `pnpm architecture:check` and `pnpm architecture:baseline:validate` against
  the immutable `phase3_base_sha`. Both Gate 1 baselines must be equal or
  lower. Falsification: any baseline growth fails the gate.
- **R6 — Duplicate Company Identity adapter decision missing.** See the
  decision section below. A written decision record must land in this track
  directory before acceptance. Falsification: the record file is absent.
- **R7 — Provenance bookkeeping missing.** `metadata.json` `deviation_notes` is
  empty and no Phase 3 evidence doc exists. Phase-acceptance must publish a
  Phase 3 evidence doc and record the cross-track delivery. This defends A5
  and A6.

### Targeted reconciliation commands (Red now, Green at acceptance)

```bash
# R6 falsifier: decision record must exist.
test -f measure/tracks/backend_capability_kernel_20260713/phase-3-adapter-decision.md

# R7 falsifier: Phase 3 evidence doc must exist.
test -f measure/tracks/backend_capability_kernel_20260713/phase-3-acceptance-evidence.md

# R2: plan verification command must exit zero (or carry a recorded disposition).
pnpm --filter @reading-advantage/backend check-types

# R1: coverage gate (exact flags set by the implementation role that adds the provider).
pnpm --filter @reading-advantage/backend exec vitest run src/kernel/__tests__ --coverage
```

### Green gate (phase-acceptance must run all of these)

```bash
# Full kernel gate with the live PG16 proof. cwd must be packages/backend (E4).
PG_TEST_URL=postgres://postgres:postgres@localhost:5432/postgres \
  CI=true pnpm --filter @reading-advantage/backend exec vitest run src/kernel/__tests__
# Expected: 9 files, 163 passed, 0 skipped. A skipped integration test fails this gate.

# Kernel-relevant db and domain subsets (never waivable).
pnpm --filter @reading-advantage/db exec vitest run src/__tests__/capability-idempotency-schema.test.ts
pnpm --filter @reading-advantage/domain exec vitest run src/__tests__/tenant-coverage.test.ts
```

### Closeout gate (Phase 3)

1. Green gate passes with zero skipped tests.
2. R1 coverage published at 80% or higher for every `src/kernel/**` file.
3. R2–R4 resolved or dispositioned in writing inside the Phase 3 evidence doc.
4. R5 architecture baselines equal or lower against `phase3_base_sha`.
5. R6 adapter decision record accepted by review.
6. R7 evidence doc and `deviation_notes` landed.
7. Independent review receipt binds the final commit and gate outputs (A15).

## Required PG16 two-connection proof (exact contract)

Environment: PostgreSQL 16. The verified local container is `measure-audit-pg`
(`postgres:16`, PG_VERSION 16.14-1.pgdg13, trust auth). Command:

```bash
PG_TEST_URL=postgres://postgres:postgres@localhost:5432/postgres \
  CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/kernel/__tests__/postgres-idempotency.integration.test.ts
```

The proof must demonstrate, on a throwaway database created and dropped by the
suite: concurrent acquisition from two isolated single-connection clients
grants exactly one owner; the loser receives retryable `IDEMPOTENCY_IN_PROGRESS`;
settled output replays deterministically; a different input fingerprint fails
closed with non-retryable `IDEMPOTENCY_INPUT_CONFLICT`; retryable settlement is
reacquirable; terminal settlement is preserved. No production URL fallback is
permitted; the suite skips without `PG_TEST_URL`, and a skipped suite is Red
for acceptance purposes (A4 defense).

## API/caller audit (required evidence for R6/R7)

Phase-acceptance must publish `phase-3-api-caller-audit.md` enumerating:

1. Every importer of `@reading-advantage/backend` kernel exports
   (`build-graph callers ./graph.db <symbol>` per public kernel symbol).
2. The deep relative import in `apps/accounts/lib/server/company-identity-route-bindings.ts`,
   which bypasses the package exports map to reach
   `src/modules/company-identity/internal-route-adapter.js`. The audit must
   confirm only Accounts holds this bypass.
3. The exports-map substitution: `./company-identity/internal-route-adapter`
   resolves to the public-route-adapter dist files for package consumers. The
   audit must confirm this substitution is intact and covered by
   `route-bindings.security.test.ts`.
4. Every consumer of both durable idempotency ports.

## Duplicate Company Identity adapter decision (R6)

Two duplication questions need one written decision record:

- **D1 — Two durable idempotency stores.** Kernel
  `createPostgresDurableIdempotencyPort` persists to
  `capability_idempotency_records`. Module
  `createCompanyIdentityDurableIdempotencyPort` (246 lines) implements the same
  kernel `DurableIdempotencyPort` contract against the identity-owned store.
  Decision: retain both with a documented employee-identity data-boundary
  rationale, or unify on the kernel store. The record must address fingerprint
  format drift (`sha256:` prefix versus raw hex) and namespace drift
  (`capability:<id>` operation key versus `capabilityId` column).
- **D2 — Two same-named route-adapter factories.** `internal-route-adapter.ts`
  (Accounts provenance) and `public-route-adapter.ts` both export
  `createCompanyIdentityRouteAdapter`. The public shim executes callbacks with
  `undefined as never` context. Decision: retain the exports-map substitution
  pattern with its security test, or rename for clarity. The record must state
  why the same-name collision is safe.

## Fixtures, mocks, and live-behavior proof expectations

Fixtures: the Phase 2 counterexample matrix, fixed `sha256:` fingerprint
constants, and migration `0038` read from disk by the integration suite.

Mocks: in-memory ports and stub adapters are acceptable in unit suites
(registry, pipeline, context, hardening). The durable idempotency proof must
not mock PostgreSQL.

Live-behavior proof: the PG16 suite (E3) is the only live proof Phase 3
requires. It uses real `CREATE DATABASE`/`DROP DATABASE`, two real isolated
connections, and real concurrent acquisition. No browser, deploy, or
production behavior belongs to Phase 3.

## Artifact/documentation tests versus live behavior tests

Artifact tests (shape assertions, no subprocess): registry immutability,
descriptor contracts, catalog/binding contract tests, db schema-shape test.
Falsification: a wrong constraint name, missing field, or mutable registry
object fails the assertion.

Live behavior tests: the PG16 two-connection suite and the executor pipeline
tests with real settlement semantics. Falsification: a lost owner, a leaked
second owner, or a skipped suite fails the gate.

This strategy file and the R6/R7 records are documentation artifacts. Their
existence checks are artifact tests; they never substitute for the live PG16
proof.

## Architecture guardrails

- No provider SDK import may enter app, backend, or domain source because of
  this track (spec AC-8).
- The exports-map substitution for the route adapter must stay intact.
- No new deep relative import into `packages/backend/src` may appear; the
  Accounts bypass is the single audited exception.
- The EXEMPT classification of `capabilityIdempotencyRecords` must remain
  justified: infrastructure table, tenant namespacing inside the row, guarded
  by `tenant-coverage.test.ts`.
- Gate 1 baselines must not grow (R5).

## Changed-contract risks

1. The kernel public API gained consumers (SSO, Admin) before acceptance. Any
   contract change now breaks downstream tracks. Mitigation: caller audit
   first, change second.
2. Two idempotency stores can drift in fingerprint and namespace semantics
   (D1). Mitigation: R6 decision record plus contract-level tests.
3. The integration suite's cwd-dependent migration path (E4) makes the proof
   fragile to invocation directory. Mitigation: run from `packages/backend`;
   an implementation role may later resolve the path from `import.meta.url`.
4. The public route-adapter shim runs callbacks without a context. A caller
   that treats it as trusted breaks provenance. Mitigation: security test plus
   caller audit.
5. `tsconfig.test.json` rootDir errors (E5) can mask future kernel type
   errors behind non-kernel noise. Mitigation: R2 resolution, not a waiver.

## Intentionally-red aggregate-suite handling

Aggregate `pnpm turbo run test` and `pnpm turbo run lint` are intentionally red
from pre-existing failures outside this track. The db (E6) and domain (E7)
package aggregates are also red for environment reasons. Phase 3 gates use
focused filters only. This is the A7 defense: a real kernel regression fails
the focused command even while aggregates stay red. Phase 3 must not fix other
tracks' failures and must not edit files outside its lease.

## Review applicability (Phase 3)

| Review type | Applicable | Notes |
|-------------|-----------|-------|
| Security review | Yes | Idempotency atomicity, tenant-key scoping, EXEMPT classification, secret-safe errors, immutable audit, undefined-context shim, exports-map substitution |
| UX/API review | Partial | No UI. API surface is the kernel public contract, the exports map, and both adapter factories; the caller audit is the API review input |
| Adversarial testing | Yes | Tampered fingerprints, cross-tenant key acquisition, replay after terminal settlement, conflict retry storms, shim misuse |
| Browser review | No | Phase 3 owns no browser behavior; Phase 5 pilot may re-open this |

## Anti-pattern coverage

Per-phase defenses from `measure/anti-patterns.md`. Every defense names its
falsification condition.

### Phase 1 (accepted reference)

| Anti-pattern | Defense |
|---|---|
| A5 | Acceptance doc cites exact commands and counts. Falsification: re-run the cited command; non-zero exit refutes the claim |
| A15 | Historical receipts stay bound to their commits; later fixes need fresh receipts |

### Phase 2 (accepted reference)

| Anti-pattern | Defense |
|---|---|
| A4 | Red evidence records 107 named failures, not a vacuous suite. Falsification: a suite that passes at Red is invalid |
| A3 | Counts are labeled (62 registry, 45 executor). Falsification: unlabeled digit claims are rejected |

### Phase 3 (active)

| Anti-pattern | Defense |
|---|---|
| A3 (digit-only count) | All counts are labeled per suite (E1–E3). Falsification: re-run and compare labeled output |
| A4 (vacuous pass) | Acceptance requires 163 passed with 0 skipped; the 7-test skip state is Red. Falsification: `PG_TEST_URL` unset yields skips, which fail the gate |
| A5 (false-claim text) | Plan Tasks 10–13 stay `[~]` until R1–R7 close. Falsification: any open R-item refutes a completion claim |
| A6 (registry overstatement) | `tracks.md` must not claim kernel acceptance. Falsification: red R2–R5 gates refute the claim |
| A7 (over-broad filter) | Focused package filters, never the aggregate. Falsification: a kernel regression fails the focused command under a red aggregate |
| A8/A11 (marker truthfulness) | The new plan checkpoint uses `[x]` with a commit SHA; Tasks 10–13 stay `[~]`. Falsification: `tests/orchestrator_marker_vocabulary.sh` fails on deprecated markers |
| A10 (generated-facts drift) | R5 compares architecture baselines against `phase3_base_sha`. Falsification: baseline growth fails the gate |
| A14 (detector syntax) | Audit detectors use `rg -n`, never `rg -nE`. Falsification: exit code 2 is a failure, not a zero-hit result |
| A15 (stale receipts) | Closeout requires a fresh receipt binding the final commit. Falsification: `tests/orchestrator_role_receipt_integrity.sh` fails on stale hashes |
| A16 (one worktree) | All gates run in the shared master checkout. Falsification: `git worktree list` shows more than one worktree |

### Phase 4 (forward)

| Anti-pattern | Defense |
|---|---|
| A4 | Two-generation byte-identity check must compare real output; empty output is Red |
| A10 | `git diff --exit-code -- measure/generated` is the staleness gate. Falsification: any diff fails CI |
| A5 | Determinism claims require two recorded generation runs |

### Phase 5 (forward)

| Anti-pattern | Defense |
|---|---|
| A6 | Pilot compatibility claims require recorded transport-contract tests |
| A7 | Pilot gates use app-scoped filters |
| A5 | Baseline ratchet claims cite exact before/after counts |

## phase_base_sha capture point

Do not capture `phase3_base_sha` before both of these commits exist:

1. The strategy commit containing this file.
2. The evidence commit containing the plan checkpoint and the role log.

Immediately after the evidence commit lands, the orchestrator must verify that
no track-owned path is dirty, then run `git rev-parse HEAD` and record the
result as the immutable `phase3_base_sha`. The `role_base_sha`
`1129427fbdb17c214fd55c086d60e62c7a4e1b7f` predates the committed strategy and
is invalid for this purpose. No SHA is embedded in this strategy.

## Falsifiability summary

- The Green gate fails if any of the 163 tests fail or any integration test
  skips.
- R1 fails if any kernel file measures below 80% coverage.
- R2 fails while `check-types` exits non-zero without a written disposition.
- R3/R4 fail if a kernel-relevant subset regresses; environment dispositions
  must name exact files.
- R5 fails on any architecture baseline growth.
- R6/R7 fail while the decision record or evidence doc is absent.
- A completion claim for Tasks 10–13 fails while any R-item is open.
