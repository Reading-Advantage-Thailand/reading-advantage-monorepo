# Test Strategy — `review_findings_remediation_20260624`

> Phase 0 deliverable. Defines the Red/Green altitudes per FR, the gate commands the
> orchestrator runs at each transition, mocking and fixture policy, and how the
> intentionally-red aggregate suite is handled. The orchestrator dispatches Red /
> Green / audit subagents against the gates below.

## Test Altitude per FR

Each FR fix must land a test that **fails on the pre-fix code** and passes after the
fix. The altitude is chosen so the test actually exercises the layer where the defect
lives (FR-9 / AC-10 rule — a domain-layer unit test would pass while the route stays
broken for FR-1..FR-4).

| FR  | Altitude | Test file (new or extended) | Red proof asserts |
| --- | --- | --- | --- |
| FR-1 | **Route-level integration** on `/api/chat` | `apps/sales-advantage/app/api/chat/__tests__/route.test.ts` (new — exercises the real `route.ts` POST handler with a mocked `validateSession` returning a non-sales authenticated user) | Non-sales authenticated user → 401/403; `SALES_REP` → 200 / stream OK. Currently fails because the route never calls `assertCan("sales:chat", …)`. |
| FR-2 | **Behavioral** against a real test DB (`primary_advantage_test`) for `studentModel.getStudents` | `apps/primary-advantage/server/models/__tests__/studentModel.behavior.test.ts` (new) | Seed 1 student enrolled in 2 classrooms → `getStudents({ schoolId })` returns exactly 1 row **and** `totalCount === 1`. Pre-fix: returns 2 rows / mismatched count. |
| FR-3 | **Behavioral** against the awaited-transaction path in `apps/primary-advantage/server/utils/genaretors/new-generator.ts` | `apps/primary-advantage/server/utils/genaretors/__tests__/new-generator.test.ts` (new — mocks `db.transaction` to inject an inner failure; uses an option-mismatch fixture) | (a) An inner-`Promise.all` rejection rejects the caller (pre-fix: caller resolves because the tx is fire-and-forget). (b) A row whose `answer` is not in `options` is **not** persisted with `correctAnswer: 0` (pre-fix: persists `0` silently). |
| FR-4 | **Route-level integration** on `/api/roleplay-attempts` | `apps/sales-advantage/app/api/roleplay-attempts/__tests__/route.test.ts` (new — mocks `storage.put`, `submitRoleplayAttempt`, scenario fetcher) | (a) Evaluator receives **non-empty** `excerpts` derived from the scenario/module curriculum (pre-fix: route passes `[]`). (b) When `storage.put` rejects, the persisted attempt's `audioStorageKey` is `null`/absent (pre-fix: route persists the key in the catch path anyway). (c) Type-check passes without `as never` / `as unknown as` (verified via `pnpm --filter sales-advantage check-types`). |
| FR-5 | **Unit** on `packages/domain/src/sales/roleplay-evaluator.ts` | `packages/domain/src/sales/__tests__/roleplay-evaluator.test.ts` (extend) | When both primary and fallback AI calls reject, the thrown `SalesError("…","EVALUATION_FAILED")` exposes both underlying errors via `error.cause` (pre-fix: cause is `undefined`). |
| FR-6 | **Unit** on `packages/domain/src/sales/permissions.ts` | `packages/domain/src/sales/__tests__/permissions.test.ts` (extend) | The keys passed to `registerDomainModulePermissions` are derived from / equal to `Object.keys(SALES_PERMISSIONS)` — single source of truth. Pre-fix: literal duplicate array drifts independently (mutate one and assert the other changed via the derivation). |
| FR-7 | **Decision** + (if durable) unit test on shared limiter wiring | `apps/sales-advantage/lib/__tests__/rate-limit.test.ts` (extend) | Decision recorded in this strategy (see **FR-7 Decision** below). If durable: assert the limiter delegates to `@reading-advantage/auth` rate-limit-v2 (mocked). If best-effort: doc/test asserts the documented banner is present in `rate-limit.ts` and the strategy entry approves it. |
| FR-8 | **Route-level** on `/api/chat` (same file as FR-1) | `apps/sales-advantage/app/api/chat/__tests__/route.test.ts` (extend) | Zod schema rejects: missing `messages`, `messages[].content` undefined, `messages[].role` outside the union, and role markers like `"\nCOACH:"` embedded in `content` are escaped/stripped (no raw turn-spoof leak to the prompt). |
| FR-9 | (umbrella for FR-1, FR-4, FR-8 route tests) | files above | Phase 7 gate: the route test files for `/api/chat` and `/api/roleplay-attempts` exist, run at the route layer, and Red-proof FR-1 / FR-4. |
| FR-10 | **Unit-but-non-passthrough** on `packages/auth/src/__tests__/session.test.ts` | `packages/auth/src/__tests__/session.test.ts` (extend) | (a) Creating an 11th session evicts the oldest of the existing 10 (assert by session-id ordering). (b) The mocked `transaction(fn)` is called **once** with a callback that performs count, evict (when needed), and insert — i.e., a single `tx.*` instance threads all three ops. Replace the current passthrough `transaction: vi.fn((fn) => fn(mockDb))` with a spy-tx that fails the test if the three ops use distinct db handles. |
| FR-11 | **Behavioral** against `primary_advantage_test` for each migrated model | `apps/primary-advantage/server/models/__tests__/{studentModel,classroomModel,teacherModel,assignmentModel}.behavior.test.ts` | ≥1 representative list/lookup query per model exercises a real DB row and asserts behavior-preservation vs. the Prisma baseline (e.g., classroom returns its student list as a nested array; teacher lookup matches the documented include-shape). FR-2 covers `studentModel`; siblings get one behavioral test each. |
| FR-12 | **Replace or delete** brittle assertions | `apps/marketing/app/__tests__/phase-4-campaigns.test.ts` and `phase-5*` / `phase-6*` siblings (edit/delete) | After the change, `rg "existsSync\\(|toMatch\\(/export default|borderRadius:\"50%\"" apps/marketing/app/__tests__` returns no hits in remaining tests. Every remaining test asserts an observable behavior (rendered DOM, route response, or computed value). |

## FR-7 Decision (rate limiter durability)

**Decision (Phase 0):** Defer to Phase 6 with a presumed default of **(b) documented
best-effort** — the in-memory `Map` is acknowledged as a best-effort soft guard, and
`apps/sales-advantage/lib/rate-limit.ts` is updated with a top-of-file banner
explaining the limitation, plus a reference to `rate_limiter_v2_20260603` for the
durable path. The orchestrator must surface this decision to the user at the start of
Phase 6; if the user opts for (a), swap to the shared `@reading-advantage/auth`
rate-limit-v2 adapter and replace the FR-7 test accordingly. **AC-7** allows either
outcome provided it is documented and approved.

## Gate Commands

The orchestrator runs these exact commands. Tail-trimming is intentional so the
audit subagents see a deterministic window.

- **`RED_TEST_COMMAND`** (per-phase Red proof; must contain at least one new failure
  attributable to the FR under test):

  ```bash
  pnpm --filter sales-advantage test -- --run --reporter=verbose 2>&1 | tail -50
  pnpm --filter primary-advantage test 2>&1 | tail -50
  ```

- **`GREEN_TEST_COMMAND`** (per-phase Green gate; the Red proof now passes, and the
  domain + auth packages remain green):

  ```bash
  pnpm --filter sales-advantage test -- --run --reporter=verbose 2>&1 | tail -50
  pnpm --filter primary-advantage test 2>&1 | tail -50
  pnpm --filter @reading-advantage/domain test 2>&1 | tail -30
  pnpm --filter @reading-advantage/auth test 2>&1 | tail -30
  ```

- **`PROJECT_LINT`** (closeout gate per phase that touched sales-advantage):

  ```bash
  pnpm --filter sales-advantage lint 2>&1 | tail -30
  ```

- **`PROJECT_CHECKS`** (closeout gate — type-check must regress to zero new errors;
  FR-4 explicitly requires the `as never`/`as unknown as` casts to be removable):

  ```bash
  pnpm --filter sales-advantage check-types 2>&1 | tail -30
  pnpm --filter primary-advantage check-types 2>&1 | tail -30
  ```

- **`PROJECT_TESTS`** (Phase 8 closeout — the four package baselines from Phase 0
  must not regress):

  ```bash
  pnpm --filter sales-advantage test 2>&1 | tail -50
  pnpm --filter primary-advantage test 2>&1 | tail -50
  pnpm --filter @reading-advantage/domain test 2>&1 | tail -50
  pnpm --filter @reading-advantage/api test 2>&1 | tail -50
  ```

- **`PROJECT_DEV_URL`**: **Not applicable.** The three defect surfaces are all
  server-only — `/api/chat` (server stream), `/api/roleplay-attempts` (POST API), and
  the `new-generator.ts` (server worker). No UX flow surfaces FR-1..FR-12 through
  the browser within this track.

- **`UX_REQUIRED`**: **never**. WebBridge / screenshot evidence is not part of any
  acceptance criterion (AC-1..AC-13 are all server-layer assertions).

## Fixtures, Mocks, and Live-Behavior Proof

- **Mock policy (default):** Unit tests mock the DB layer with `vi.fn()` per the
  `AGENTS.md` § "Project-Specific Testing" rule. The standard helper is
  `packages/domain/src/__tests__/mock-db.ts`. Route tests for sales-advantage mock
  `validateSession`, the storage adapter, and the AI adapter — but **not** the
  domain layer; the route must reach `assertCan` for the FR-1 Red proof to trigger
  the right code path.
- **Behavioral tests against a real DB (FR-2, FR-11):** Use a dedicated
  `primary_advantage_test` Postgres database (per `measure/tech-stack.md` test-DB
  convention; the local `pnpm db:start` Docker brings up the cluster, and the test
  DB is created on demand). Each behavioral test:
  - Runs migrations from `packages/db/drizzle/` against `primary_advantage_test` in a
    `beforeAll` (or relies on an already-migrated DB if CI does this once).
  - Seeds the fixture in a transaction; rolls back in `afterEach` to keep tests
    independent.
  - Never depends on production data.
- **Live-behavior proof expectations:**
  - **FR-1 / FR-8:** The route test must hit the real `route.ts` POST export (no
    handler stub). Asserting only that `assertCan` was called from the *domain*
    function would not Red-proof FR-1, because the route currently bypasses the
    domain entirely.
  - **FR-3:** The Red proof must demonstrate that an inner rejection actually
    propagates after the fix. Use a `db.transaction` mock that returns a rejecting
    promise on a sentinel row to prove the caller now rejects.
  - **FR-4:** The Red proof asserts the evaluator's actual `excerpts` argument
    (spy on `evaluateRoleplayAttempt` or its underlying domain call). Asserting
    only the HTTP 200 status would not Red-proof the empty-excerpt defect.
  - **FR-10:** Replace the passthrough `transaction` mock with a spy that records
    which `tx` handle each op was called on. The Red proof: cap/evict/insert today
    happen on `mockDb` directly because the production code is not wrapped in a
    single tx, so the spy's "single-tx-handle" assertion fails on pre-fix code.

## Architecture Guardrails

- **Route → domain rule:** FR-1's fix routes `/api/chat` through the domain mutation
  that already calls `assertCan("sales:chat", tenant)`. Do **not** add a duplicate
  `assertCan` at the route layer alongside the domain check — keep the
  authorization point single-source (the domain mutation). Route stays thin per
  `AGENTS.md` § "Backend Function Pattern".
- **Adapter rule:** Do not import provider SDKs from route handlers. Storage in the
  roleplay-attempts route stays on `storage.put`; AI in chat stays on
  `getAIClient().streamText`.
- **TenantDB rule:** FR-2's fix must respect the tenant registry — `getStudents`
  reads `users.schoolId`; classroom-students is REFERENTIAL, so any direct join
  goes through `tenantDb.unscoped("…reason…")` per `AGENTS.md` § Multi-Tenancy.
  The behavioral test asserts the query is correctly scoped by `schoolId`.
- **Contract-first:** FR-4 changes `getScenario`'s return shape and
  `SalesDomainContext`'s db typing. Update the Zod contract first; let the type
  system surface the route changes (no `as never` patches).
- **Changed-contract risk:** FR-4 (scenario return shape), FR-6 (permission
  registration shape), and FR-10 (session transaction signature) each ripple
  through consumers. Audit subagents must run `pnpm --filter @reading-advantage/api
  test` in addition to the per-package gates above.

## Intentionally-Red Aggregate Suite Handling

- This track expects **net-new failing tests** in Phase 1 (Red) before each
  corresponding Green phase. The orchestrator records each Red command's failure
  count under the phase entry. When dispatching the mid-red audit, treat the
  expected Red counts as the floor; any *additional* failure outside the FR scope
  is a blocking finding.
- The aggregate `pnpm turbo run test` is **not** a phase gate for this track —
  per-filter commands above are. The aggregate is run only at Phase 8 closeout.
- Pre-existing intentionally-red baselines that are out of scope:
  - `primary-advantage` Turbopack build baseline failure (called out in spec
    § Out of Scope).
  - `apps/marketing/app/__tests__/phase-4-campaigns.test.ts` siblings currently
    pass via brittle string assertions; FR-12 will convert/delete them. During
    Phases 1–7 they must keep passing; Phase 7 lands the FR-12 churn.

## Artifact / Documentation Tests vs. Live Behavior Tests

- **Artifact tests** (acceptable for `phase-N-*.test.mjs` and `lessons-learned.md`
  evidence) assert that a file exists or that a doc line is present. The migrated
  primary-advantage `.mjs` phase suites are artifact tests — FR-11 deliberately
  adds **behavioral** tests *alongside* them, it does not delete them.
- **Live-behavior tests** are required for every FR's Red proof per the
  altitude table above. The Phase-7 FR-12 cleanup converts the marketing
  artifact-shaped assertions into behavioral ones (rendered output / route
  response) **only** where the underlying requirement is behavioral; pure-doc
  shape assertions get deleted.
- For AC-9 (lessons-learned entry): allowed as an artifact test (`grep` of
  `lessons-learned.md` for the new bullet) — this AC is a documentation
  acceptance, not a behavioral one.

## Per-Phase Coverage Gates

| Phase | Red gate | Green gate | Closeout gate |
| --- | --- | --- | --- |
| 0 Pre-flight | baselines recorded (this file) | baselines committed | metadata.json updated |
| 1 FR-1 | `/api/chat` route test Red (403 expected, 200 observed) | route test green, sales/primary baselines unchanged | `PROJECT_LINT` + `PROJECT_CHECKS` clean |
| 2 FR-2 | `studentModel.behavior` Red (count==2) | Red passes; `totalCount==1` | sibling-model grep audit committed |
| 3 FR-3 | `new-generator` Red (caller resolves on inner failure; row persists `0` on mismatch) | both Reds pass | sales-advantage check-types clean |
| 4 FR-4 | roleplay-attempts route Red (excerpts==[]; key persists on upload failure) | both Reds pass; no `as never` casts | check-types proves casts gone |
| 5 FR-5/6 | evaluator + permissions Red | both green | domain test green |
| 6 FR-7/8 | chat Zod Red + FR-7 decision-doc Red | both green | rate-limit decision recorded in this file (update in place) |
| 7 FR-9..12 | session.test cap Red + per-model behavioral Reds + marketing churn list | all green | aggregate `PROJECT_TESTS` no regression |
| 8 Closeout | doctor runs clean | `PROJECT_TESTS` matches Phase 0 + new tests | `lessons-learned.md` entry; AC-1..AC-13 verified |

## Phase 0 Baseline

> Recorded by the strategy subagent at Phase 0 dispatch. The orchestrator compares
> Phase 8 closeout against these counts to assert no regression.

- **sales-advantage** (`pnpm --filter sales-advantage test`):
  - _to be populated by the Phase 0 baseline run appended below_
- **primary-advantage** (`pnpm --filter primary-advantage test`):
  - _to be populated by the Phase 0 baseline run appended below_
- **domain / auth / api** (informational, not the per-phase gate floor):
  - run during Phase 8 closeout per `PROJECT_TESTS` above.

### Baseline runs

<!-- Phase 0 baseline output is appended below by the orchestrator/strategy subagent. -->
