# Baseline Results — Wave 4 Phase 0

> **Track:** `wave4_app_security_correctness_backlog_20260628`
> **Phase:** 0 — Baseline and Coverage Lock
> **Baseline SHA:** `2f58fed2161d88e12c9faffbdc60f3d3e6ddb75b` (== HEAD at capture time; no source edits made by this phase)
> **Captured:** 2026-07-06

## 1. Coverage-matrix ownership confirmation (Task 1)

Verified against `measure/audit-reports/monorepo-review-roadmap_20260626/medium-plus-coverage-matrix.md`.
The owned track IDs in `spec.md` §"Source Findings" match the matrix exactly. No drift.

| App | Owned track IDs (per matrix) | Severity | Confirmed |
|---|---|---|---|
| Science | ST-1, ST-2, ST-4, SP-3 | High/High/Medium/P2 | yes |
| Reading | M-RA-SEC-6, SEC-7, SEC-8, SEC-9, SEC-10, PB-4, PB-5, PB-6, PB-7, PB-8 | High/Med/Med/Med/Med/Med/Med/Med/Med/High | yes |
| CodeCamp | MT-8, MT-9, MT-10, MT-11, MT-13, MT-14 | High/High/High/Med/Med/Med | yes |
| Sales | T5, T8, T9 | Med/Med-High/Med | yes |
| Primary | M7, M9 | High/Med-High | yes |
| www | T9 (blog security) | High | yes |

No Medium+ track is double-owned or unowned. Low-severity deferrals (M-RA-SEC-11, www T18, etc.) remain explicitly deferred in the matrix and are out of Wave 4 scope.

## 2. Wave 0 / Wave 2 primitive availability (Task 2)

All four primitives are present in the baseline tree and importable by the touched apps.
Science `lib/` can import `createTenantDB` from `@reading-advantage/domain` (the package is a
`workspace:*` dependency of `science-advantage`).

| Primitive | Location | Export | Locally proven? |
|---|---|---|---|
| `createTenantDB` | `packages/domain/src/db-contract.ts:332` (re-exported from `@reading-advantage/domain` barrel) | `export function createTenantDB(db, tenant): TenantDB` | yes — fail-closed + REFERENTIAL-throw covered by `db-contract.test.ts`, `2-school-acceptance.test.ts`, `phase-4-adversarial.test.ts` |
| `assertCan` | `packages/auth/src/assert.ts:18` | `export function assertCan(user, permission, tenant?)` | yes — `assert.ts` unit tests + domain adversarial suites |
| Tenant-isolation test helper (Wave 2 P4) | `packages/domain/src/testing/tenant-isolation-harness.ts` | `buildTenantIsolationHarness()` | yes — `wave2-tenant-isolation-harness.test.ts` (7 tests, green) |
| Provider guard (Wave 2 P4) | `packages/ai/src/testing/provider-guard-utility.ts`; observability variant `packages/config/src/__tests__/wave2-observability-provider-guard.test.ts` | `createProviderGuard()` | yes — `wave2-provider-guard-utility.test.ts` (green) |

**Apps NOT yet wired to `@reading-advantage/domain`:**
- `primary-advantage` — `package.json` has NO `@reading-advantage/domain` dependency. M7 (Prisma cleanup) and M9 (secrets) do not require domain migration, so this is acceptable for Wave 4. If Primary later needs domain routing, add the dep in that follow-up.
- `www-reading-advantage` — only depends on `@reading-advantage/config`. www T9 (blog sanitize + Zod) needs no domain import; it stays app-local.

**No primitive requires local re-proof in Wave 4.** Each phase that relies on a primitive must still
include a behavior test that fails when the primitive is bypassed (falsifiability — see test-strategy.md).

## 3. Baseline command results (Task 3)

Run from repo root at the baseline SHA. Full logs saved to `/tmp/opencode/w4-checktypes.log` and
`/tmp/opencode/w4-test.log` during this phase (transient; evidence summarized below).

### 3.1 Lint — PASS

```
CI=true pnpm turbo run lint --filter=science-advantage --filter=reading-advantage \
  --filter=codecamp-advantage --filter=sales-advantage
```

- **Exit code:** 0
- **Tasks:** 16 successful, 16 total (4 cached)
- **Lint output:** 0 errors, 2235 warnings (all pre-existing `@typescript-eslint/no-explicit-any` / `no-unused-vars`).
- **Note:** `primary-advantage` is not in the lint filter set (spec.md lists only science/reading/codecamp/sales for lint). Wave 4 must not introduce new lint errors in the filtered apps; the 49 pre-existing Primary ESLint errors are out of scope (tech-debt.md).

### 3.2 Check-types — FAIL (pre-existing, blocks app-level tasks)

```
CI=true pnpm turbo run check-types --filter=science-advantage --filter=reading-advantage \
  --filter=codecamp-advantage --filter=sales-advantage --filter=primary-advantage
```

- **Exit code:** 2
- **Tasks:** 9 successful, 10 total (Failed: `@reading-advantage/api#check-types`)
- **Root-cause failure (pre-existing at baseline SHA):**
  `packages/api/src/routers/progress.ts:54:94` — `error TS2322: Type '{ status: string; ... }' is not assignable to type '{ status: "completed" | "not_started" | "in_progress"; ... }'`.
  The route input declares `status: z.string()` but the output schema (`lessonProgressResponseSchema`) and `updateLessonProgress` require the union literal.
- **Blast radius:** `@reading-advantage/api` is a build/check-types dependency of all 5 filtered apps. Turbo therefore never ran check-types for science-advantage, reading-advantage, codecamp-advantage, sales-advantage, or primary-advantage — they are **blocked**, not independently failing.
- **Classification:** Pre-existing contract drift in shared `@reading-advantage/api`. It overlaps Wave 4 Reading PB-4 (assignment/lesson status enum lifecycle) scope. Wave 4 must either (a) fix it as part of PB-4, or (b) explicitly defer to a named follow-up track. Phase 9 closeout must show the actual exit code of this command and link every remaining failure.

### 3.3 Test — FAIL (pre-existing build blocker; domain tests green standalone)

```
CI=true pnpm turbo run test --filter=science-advantage --filter=reading-advantage \
  --filter=codecamp-advantage --filter=sales-advantage --filter=primary-advantage \
  --filter=@reading-advantage/domain
```

- **Exit code:** 2
- **Tasks:** 11 successful, 13 total (Failed: `@reading-advantage/api#build`)
- **Root-cause failure (pre-existing):** `@reading-advantage/api#build` (`tsc`) fails with the same `progress.ts:54` TS2322 error as 3.2. Because every filtered app's `test` task depends on `^build` of `@reading-advantage/api`, **none of the 5 app test suites executed.**
- **`@reading-advantage/domain` test status:**
  - Under the turbo aggregate: reported `[ELIFECYCLE] Test failed` (concurrent `dist/` test run interleaved with the failing `api#build`; the aggregate exit is dominated by the api build failure).
  - Run directly (`cd packages/domain && CI=true pnpm test`): **PASS** — `Test Files 41 passed | 1 skipped (42)`, `Tests 524 passed | 5 skipped (529)`, exit 0.
  - Conclusion: domain tests are green at baseline; the aggregate red is entirely attributable to the `@reading-advantage/api` build break.
- **Classification:** The pre-existing `@reading-advantage/api` build break is the single blocker for the aggregate test command. It must be resolved (or formally deferred) before Phase 9 can demonstrate a green aggregate. Any Wave 4 task that touches `packages/api` (Reading SEC-8 domain migration, CodeCamp/Sales router changes) must not worsen this and should prefer to fix it.

### 3.4 Baseline summary table

| Command | Exit | Status | Blocking failure | Owner for resolution |
|---|---|---|---|---|
| lint (4 apps) | 0 | PASS | none | — |
| check-types (5 apps) | 2 | FAIL | `packages/api/src/routers/progress.ts:54` TS2322 (pre-existing) | Wave 4 PB-4 or named follow-up |
| test (5 apps + domain) | 2 | FAIL | `@reading-advantage/api#build` TS2322 (pre-existing); domain green standalone | Wave 4 PB-4 or named follow-up |

**Phase 9 closeout contract:** the closeout gate may NOT claim "all required commands green" while
`progress.ts:54` still fails. Either the fix lands in Wave 4 (preferred, since it overlaps PB-4) or
the failure is re-baselined into a named follow-up track and the closeout report quotes the exact
remaining failure with the follow-up track ID. This is the A5/A6 defense (no false "resolved" claims
while the adversarial/type check is still red).

## 4. Reproduction recipe (for any reviewer)

```bash
git checkout 2f58fed2161d88e12c9faffbdc60f3d3e6ddb75b
CI=true pnpm turbo run lint   --filter=science-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage
CI=true pnpm turbo run check-types --filter=science-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage --filter=primary-advantage
CI=true pnpm turbo run test --filter=science-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage --filter=primary-advantage --filter=@reading-advantage/domain
# Domain-only sanity (expected green):
cd packages/domain && CI=true pnpm test
```
