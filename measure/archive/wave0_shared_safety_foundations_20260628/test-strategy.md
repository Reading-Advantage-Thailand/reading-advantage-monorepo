# Test Strategy: Wave 0 — Shared Safety Foundations

> Track: `wave0_shared_safety_foundations_20260628`  
> Baseline SHA: `63cd59b87f8c871c01b29d57d5838954ba0b1f3b`  
> Strategy role output: Phase 0 baseline/evidence lock only; no product-source remediation.

## Phase 0 baseline and graph evidence

- Roadmap evidence read: monorepo roadmap `deduplicated-findings.md`, `critical-high-remediation-plan.md`, `migration-roadmap.md`, `test-strategy-roadmap.md`; cross-app `findings.md`/`migration-tracks.md`; shared-foundation `executive-summary.md`/`migration-tracks.md`.
- Graph status: `graph.db` exists but is stale for Graph-Aware Measure (`mtime 2026-06-26T12:38:27Z`, about 39.77h old at strategy time). `build-graph stats ./graph.db` still reported 22,185 nodes / 46,017 edges / 2,715 files, so graph output is advisory only until refreshed.
- Key surfaces inspected:
  - `packages/domain/src/tenant-registry.ts`: currently classifies many tables, but comments for some single-tenant/global REFERENTIAL decisions are load-bearing.
  - `packages/domain/src/__tests__/tenant-coverage.test.ts`: registry completeness exists, but `hasBareTenantDbOnReferential()` is defined and returns false without being used; Phase 1 must retire that vacuity.
  - `packages/domain/src/db-contract.ts`: `createTenantDB()` currently warns on `schoolId: null` and permits FLAT operations to proceed unscoped.
  - `packages/api/src/context.ts`: `roleSchema` omits `SALES_REP`/`SALES_ADMIN`, and auth failure fallback still creates `createTenantDB(db, { schoolId: null })`.
  - `packages/types/src/index.ts`: role schemas drift (`userResponseSchema` omits sales roles; `sessionResponseSchema` includes `USER`); no package test script.
  - `packages/auth/src/rate-limit.ts`: production limiter is in-memory `Map` with sync API.
  - `packages/api/src/routers/reports.ts`: `teacherDashboard` still imports Drizzle/schema and queries in the router.

Baseline command results:

| Command | Result | Relevant failures |
|---|---|---|
| `CI=true pnpm turbo run test --filter=@reading-advantage/db --filter=@reading-advantage/domain --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api` | Fail | Pre-existing aggregate red: db Drizzle 0.45/closure artifact tests, journal sentinel failure, db 0-test suites; auth integration tests require `DIRECT_DATABASE_URL`/Postgres and archived-track path; domain/api run also reports null-tenant warnings. Full output captured by opencode at `tool_f0c7a232a001lD2b506ps3Ty16`. |
| `CI=true pnpm turbo run check-types --filter=@reading-advantage/db --filter=@reading-advantage/domain --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api` | Fail | `@reading-advantage/api` schema drift: sales `audioStorageKey` nullable mismatch; user role output rejects `SALES_REP`/`SALES_ADMIN`. |
| `CI=true pnpm turbo run lint --filter=@reading-advantage/domain --filter=@reading-advantage/auth --filter=@reading-advantage/api` | Pass with warnings | Domain/auth/api lint exit 0; warnings include unused `hasBareTenantDbOnReferential` and sales schema imports. |

## Aggregate-suite policy

The aggregate shared-package suite is intentionally red at baseline. Red/Green agents must not hide this by weakening tests, removing failing suites, adding `passWithNoTests`, or claiming aggregate green while historical failures remain. Phase Green gates below require targeted tests for the phase to pass and no new failures relative to this baseline. Track closeout may accept pre-existing aggregate failures only when each remaining failure is explicitly linked to an existing follow-up/remediation track and Wave 0 targeted tests are green.

Artifact/documentation tests (for example, prior Drizzle migration artifacts or archived-track plan references) are not live behavior proof for Wave 0. They may explain aggregate red, but they cannot satisfy Wave 0 acceptance criteria. Live behavior proof means deterministic unit/contract tests against the changed code path, plus optional integration proof only when required services and credentials are present.

## Phase-by-phase strategy

### Phase 1 — Tenant Registry Coverage and Fail-Closed TenantDB

- Targeted Red command: `CI=true pnpm --filter @reading-advantage/domain exec vitest run src/__tests__/tenant-coverage.test.ts src/__tests__/db-contract.test.ts`
- Required Red assertions and falsification conditions:
  1. Registry completeness: fails with `Unclassified table count: N` when any exported Drizzle `pgTable` lacks FLAT/REFERENTIAL/EXEMPT classification.
  2. FLAT schema parity: fails with `Flat-without-schoolId count: N` when a FLAT table lacks `schoolId`; fails with `Non-flat-with-schoolId count: N` when REFERENTIAL/EXEMPT has `schoolId`.
  3. Null-tenant fail-closed: `createTenantDB(db, { schoolId: null })` must throw `TenantScopeError` or an explicitly typed tenant error on FLAT select/insert/update/delete before hitting the underlying builder. It is falsified if any FLAT operation records a DB call.
  4. REFERENTIAL misuse: behavioral test must attempt `tenantDb.select().from(referentialTable)`, joins, insert, update, and delete without `unscoped()`; each must throw. Static guard is acceptable only if it reports labeled counts and fails on an injected fixture containing bare TenantDB REFERENTIAL access.
- Green gate: targeted Red command exits 0; `CI=true pnpm turbo run test --filter=@reading-advantage/domain --filter=@reading-advantage/db` has no new failures compared with baseline.
- Closeout gate: `tenant-coverage.test.ts` proves at least one FLAT, one REFERENTIAL, and one EXEMPT table were examined, and null-tenant FLAT operations cannot pass silently.
- Fixtures/mocks: use trackable mock DB builders from `db-contract.test.ts`; add explicit flat/exempt/referential fake tables; add two-school fixtures for any behavioral tenant-isolation helper. No real Postgres required for this phase.
- Architecture guardrails / contract risks: null-tenant fail-closed may break CodeCamp/Sales tests that currently create `TenantDB` with `{ schoolId: null }` for global REFERENTIAL tables. Green implementation must migrate those tests/code paths to raw DB via `tenantDb.unscoped("reason")` or an explicit global/single-tenant adapter rather than weakening TenantDB.
- Anti-pattern coverage:
  - A3: all counts must be labeled integers such as `Unclassified table count:`; digit-only regexes are forbidden.
  - A4: guard tests must fail if they examine zero FLAT/REFERENTIAL/EXEMPT tables or zero operations.
  - A5/A6: plan/registry text may not claim tenant isolation resolved unless the targeted command exits 0.
  - A7: static referential guards may exclude only paths/fixture markers, not broad words like `never` or `do not`.
  - A8: Phase 1 completion markers require targeted command evidence; do not infer completion from `[ ]`/free text.
  - A10: if TenantDB exports/imports change, run `build-graph update ./graph.db <changed files>` after implementation.

### Phase 2 — Shared Roles, Auth Context, and Rate Limiting

- Targeted Red command: `CI=true pnpm turbo run test --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api`
- Required Red assertions and falsification conditions:
  1. Role parity: `@reading-advantage/types`, `@reading-advantage/auth`, and `@reading-advantage/api` must accept the same active role set (`INTERN`, `STUDENT`, `TEACHER`, `ADMIN`, `SYSTEM`, `SALES_REP`, `SALES_ADMIN`) and reject `USER`/case variants. Falsified by any set difference.
  2. API context: `roleSchema.parse("SALES_REP")` and `roleSchema.parse("SALES_ADMIN")` must succeed, and invalid sessions must not receive a tenant-branded DB usable for FLAT operations. Falsified if malformed/auth-failed context can call a scoped domain function with null tenant.
  3. Rate limiter: production path must be DB-backed or otherwise cross-instance durable with per-username and per-IP semantics. Falsified if production code still uses only module-local `Map`, if two limiter instances do not share state in the test fixture, or if per-IP attempts are ignored.
  4. Auth-client validation: malformed login/session payloads must be rejected before client state changes. Falsified if a partial/malformed response mutates authenticated state.
- Green gate: targeted command exits 0, and `CI=true pnpm turbo run check-types --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api` clears the current role/nullability errors or leaves only unrelated documented failures.
- Closeout gate: auth/types/API role schemas share one source or a parity test; production limiter has a non-process-local proof; in-memory limiter, if retained, is explicitly dev/test-only and opt-in.
- Fixtures/mocks: role-set fixture generated once in the test; fake DB row-lock/upsert adapter for limiter; two logical limiter instances sharing fake store; mock fetch/session responses for auth-client. Live Postgres is optional and should be a separate integration proof when `DIRECT_DATABASE_URL` is set.
- Architecture guardrails / contract risks: changing `checkRateLimit` from sync to async will affect login/register callers; either provide a compat wrapper or update all callers/tests in one phase. Do not put rate-limit business logic in route handlers; keep it in `@reading-advantage/auth` behind a storage seam.
- Anti-pattern coverage:
  - A1: tests must inspect role arrays/schema objects, not prose substrings in docs.
  - A3: role parity failure should print labeled counts/sets (`Missing in api roleSchema:`), not unstructured digits.
  - A4: parity tests fail if any role source cannot be loaded or returns an empty set.
  - A5/A6: no `rate limiting resolved` text unless cross-instance proof passes.
  - A7: process-local `Map` detection may not filter out real hits because comments say `dev-only`; it must verify production exports/wiring.
  - A10: if auth/type exports change, update graph for changed TypeScript files.

### Phase 3 — Shared Contracts and Typed Error Boundaries

- Targeted Red command: `CI=true pnpm turbo run test --filter=@reading-advantage/types --filter=@reading-advantage/api --filter=@reading-advantage/domain`
- Required Red assertions and falsification conditions:
  1. Response envelopes: success, list, validation error, unauthorized, forbidden, not found, conflict, and internal error schemas parse canonical examples and reject missing `ok`/`error.code`/pagination fields. Falsified by any accepted malformed shape.
  2. Zod contracts: role, user/session, class, sales, and branded ID schemas reject drift cases from CA-003/MR-C04 (sales nullability, invalid UUID where branded non-UUID is expected, legacy `USER`).
  3. Adoption proof: at least one API/router boundary imports shared/domain contracts rather than redefining local duplicates. Falsified if the selected boundary still defines equivalent router-local Zod schemas.
  4. Typed error mapping: selected reviewed leakage site maps domain error classes/codes, not `err.message.includes(...)` or `startsWith(...)`. Falsified by message-substring mapping in the selected site.
- Green gate: targeted command exits 0; `CI=true pnpm turbo run check-types --filter=@reading-advantage/types --filter=@reading-advantage/api --filter=@reading-advantage/domain` does not report the current API role/audioStorageKey mismatches.
- Closeout gate: `@reading-advantage/types` has a meaningful `test` script and behavioral tests; at least one API boundary consumes the shared contract in runtime output validation.
- Fixtures/mocks: canonical payload fixtures for every envelope; intentionally malformed payload table; typed domain error fixtures. No live services.
- Architecture guardrails / contract risks: shared envelope contracts must not force tRPC internals into domain packages; avoid transport-specific types in `@reading-advantage/types`; use Zod as runtime contract SSOT.
- Anti-pattern coverage:
  - A3/A4: contract tests must enumerate expected cases and fail if the case table is empty; counts must be labeled.
  - A5/A6: no contract-readiness claims until check-types and contract tests match.
  - A7: static duplicate-schema guard must use path/import boundaries, not broad text filters.
  - A9: if tests reference previous review artifacts, resolve both `measure/tracks/<id>` and `measure/archive/<id>` paths.

### Phase 4 — Transport-Thin Shared API Boundary

- Targeted Red command: `CI=true pnpm --filter @reading-advantage/api exec vitest run src/__tests__/reports.test.ts src/__tests__/api-architecture-boundary.test.ts && CI=true pnpm --filter @reading-advantage/domain exec vitest run src/__tests__/reports.test.ts`
- Required Red assertions and falsification conditions:
  1. Delegation: `reports.teacherDashboard` router must call a domain function and return/map its result. Falsified if the router still calls `ctx.tenantDb.select()`/Drizzle directly.
  2. Static boundary: no `drizzle-orm` or `@reading-advantage/db/schema` imports in `packages/api/src/routers/**` except a small allowlist with a named reason. Falsified by any unapproved import.
  3. Domain behavior: new domain report function enforces `assertCan`, tenant scoping, and two-school/teacher ownership semantics using mock DB or deterministic fixtures. Falsified by cross-school or wrong-role access returning data.
  4. Router tests assert transport mapping only: auth error -> TRPC code, domain error -> typed mapping, success -> shared output contract. Falsified if router test duplicates SQL/query behavior.
- Green gate: targeted command exits 0; `CI=true pnpm turbo run lint --filter=@reading-advantage/domain --filter=@reading-advantage/api` exits 0; `CI=true pnpm turbo run check-types --filter=@reading-advantage/domain --filter=@reading-advantage/api` has no new errors.
- Closeout gate: API routers contain no reviewed shared-foundation business Drizzle query leakage; graph update recorded for any new exported domain function or router import change.
- Fixtures/mocks: `vi.mock("@reading-advantage/domain")` for router delegation; separate domain tests with TenantDB/mock DB; two-school teacher/class fixtures. No real DB required.
- Architecture guardrails / contract risks: moving `teacherDashboard` to `packages/domain/src/reports` changes public exports; update `packages/domain/src/reports/index.ts` and package export consumers. Do not import `db` singleton into the domain report function; accept `TenantDB` from context like existing report queries.
- Anti-pattern coverage:
  - A1/A7: architecture guard must inspect imports/AST or precise import strings, not broad prose substrings.
  - A4: delegation test fails if the mocked domain function is never called and if no router procedures are scanned.
  - A5/A6: do not claim `packages/api` is transport-thin if static guard still finds unapproved imports.
  - A10: update graph after exported domain/report function or router dependencies change.

### Phase 5 — Quality Gates, Documentation, and Closeout

- Targeted Red command: same as closeout aggregate to prove current red/green truth before marking closeout: `CI=true pnpm turbo run test --filter=@reading-advantage/db --filter=@reading-advantage/domain --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api`
- Green gate:
  1. `PROJECT_LINT`: `CI=true pnpm turbo run lint --filter=@reading-advantage/domain --filter=@reading-advantage/auth --filter=@reading-advantage/api`
  2. `PROJECT_CHECKS`: `CI=true pnpm turbo run check-types --filter=@reading-advantage/db --filter=@reading-advantage/domain --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api`
  3. `PROJECT_TESTS`: `CI=true pnpm turbo run test --filter=@reading-advantage/db --filter=@reading-advantage/domain --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api`
- Closeout gate: all Wave 0 targeted phase tests are green; any remaining aggregate red is explicitly pre-existing, unchanged or reduced from baseline, linked to a follow-up, and not one of this track's acceptance criteria. Only then may `critical-high-remediation-plan.md`, tech-debt, or tracks registry receive completion/resolution notes.
- Fixtures/mocks/live proof: closeout must include deterministic unit/contract evidence for all AC. Live DB/postgres proof is optional unless rate limiter implementation depends on real Postgres locking; if optional live checks are skipped, the skip reason must name missing service/env and cannot replace unit proof.
- Architecture guardrails / contract risks: documentation updates are artifacts, not product behavior. A roadmap completion note is allowed only after behavior gates pass.
- Anti-pattern coverage:
  - A2: no publish/consent workflow is in scope; if any public case-study/claims artifact is touched, consent/anonymization proof becomes mandatory before publish claims.
  - A5/A6: false green prevention — every completion claim must cite an exact command and result.
  - A8: plan markers must use the accepted vocabulary and reflect current truth; do not leave executed work as blocked or infer completion from `[ ]`.
  - A9: any closeout tests referring archived prior tracks must use a track-dir resolver.
  - A11: this is not a review track, but closeout must not leave all executable tasks blocked after evidence exists.

## Live-behavior proof checklist

- TenantDB: prove with operation-level tests that null tenant cannot touch FLAT tables; a warning is not enough.
- Roles/contracts: prove parser behavior and TypeScript output compatibility; docs listing roles are not enough.
- Rate limiter: prove two logical instances share state or that the production seam uses a DB-backed store; single-process `Map` tests are not enough.
- API boundary: prove delegation and static import guard; query-result snapshots from the router are not enough.
- Closeout: prove targeted tests run at HEAD; stale artifact tests or old review reports are not enough.
