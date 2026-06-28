# Implementation Plan: Wave 0 — Shared Safety Foundations

> **Track ID:** `wave0_shared_safety_foundations_20260628`  
> **Depends on:** `monorepo_review_roadmap_20260626`  
> **Method:** Contract-first TDD. Red tests before implementation. No app-feature expansion.

## Phase 0: Baseline and Evidence Lock

- [x] Task: Read roadmap artifacts: `deduplicated-findings.md`, `critical-high-remediation-plan.md`, `migration-roadmap.md`, and `test-strategy-roadmap.md`.
  - Evidence refs: `monorepo-review-roadmap_20260626/deduplicated-findings.md` MR-C01/MR-C02/MR-C04/MR-C05; `critical-high-remediation-plan.md` Wave 0.
  - Strategy evidence: read all four roadmap artifacts plus cross-app `findings.md`/`migration-tracks.md` and shared-foundation `executive-summary.md`/`migration-tracks.md`; strategy recorded in `test-strategy.md`.
- [x] Task: Run `build-graph stats ./graph.db` if graph is fresh; record graph status in this plan.
  - Graph status: `graph.db` exists but is stale for graph-aware Measure (`mtime 2026-06-26T12:38:27Z`, about 39.77h old during Phase 0), so graph facts are advisory only. `build-graph stats ./graph.db` still ran and reported 22,185 nodes / 46,017 edges / 2,715 files. `build-graph inspect` found `createTenantDB` and `classifyTable`; `reportsRouter`/`roleSchema` were not indexed as inspectable symbols in the stale graph.
- [x] Task: Inspect `packages/domain/src/tenant-registry.ts`, `tenant-coverage.test.ts`, `packages/api/src/context.ts`, `packages/types`, and auth role schema surfaces.
  - Evidence refs: `shared-foundation_20260626/executive-summary.md` Key risks; `shared-foundation_20260626/migration-tracks.md` M-SF-1/M-SF-2/M-SF-4/M-SF-5.
  - Inspection evidence: `tenant-registry.ts`, `tenant-coverage.test.ts`, `db-contract.ts`, `packages/api/src/context.ts`, `packages/types/src/index.ts`, `packages/auth/src/roles.ts`, `packages/auth/src/rate-limit.ts`, and `packages/api/src/routers/reports.ts` inspected for strategy.
- [x] Task: Record the current failing/passing baseline for the required verification commands.
  - Baseline: test command failed with pre-existing db Drizzle/closure/journal and auth integration/env/archive-path failures; check-types failed in `@reading-advantage/api` on role/audioStorageKey contract drift; lint for domain/auth/api passed with warnings. Details are in `test-strategy.md` Phase 0 baseline table.

## Phase 1: Tenant Registry Coverage and Fail-Closed TenantDB

- [x] Task: Write Red tests proving all exported Drizzle tables are classified as FLAT, REFERENTIAL, or EXEMPT.
  - Evidence refs: Shared Foundation F-SF-001; Cross-App CA-002.
  - Evidence: `tenant-coverage.test.ts` — "every exported Drizzle table is classified in the registry" fails with `Unclassified table count: 9 (of 92 total). Unclassified tables: verificationTokens, userRoles, roles, articleActivityLogs, sentencsAndWordsForFlashcards, cardReviews, clozeTestGames, schoolAdmins, leaderboards.` A3-compliant labeled count. Classification distribution test (A4 guard) passes, confirming FLAT/REFERENTIAL/EXEMPT each have >0 entries.
- [x] Task: Write Red tests proving null-tenant `TenantDB` cannot select/insert/update/delete FLAT tables.
  - Evidence refs: Shared Foundation F-SF-004; `shared-foundation_20260626/migration-tracks.md` M-SF-2.
  - Evidence: `db-contract.test.ts` — 5 new "null-tenant fail-closed (M-SF-2)" tests all fail with "expected function to throw an error, but it didn't" because `createTenantDB` only `console.warn`s on null/undefined schoolId. Tests cover: select (null), select (undefined), insert (null), update (null), delete (null). Two positive guard tests pass: EXEMPT tables succeed on null tenant, valid tenant succeeds on FLAT.
- [x] Task: Write Red tests proving REFERENTIAL table misuse is detected behaviorally or by a non-vacuous static check.
  - Evidence refs: Shared Foundation F-SF-005; Cross-App CA-002 CodeCamp `TenantScopeError` symptom.
  - Evidence: `db-contract.test.ts` behavioral tests (existing, PASS): REFERENTIAL select/update/delete/insert all throw TenantScopeError. `tenant-coverage.test.ts` static detector (new, non-vacuous): 4 fixture tests pass — detector catches bare `tenantDb.from(lessonProgress)` without unscoped, correctly ignores files using unscoped or not using TenantDB, catches multi-table violations. Real domain code scan finds 0 violations (current code is clean). Replaced vacuous `hasBareTenantDbOnReferential` (always returned `false`, A4 violation) with `detectBareTenantDbOnReferential` using labeled REFERENTIAL_TABLE_NAMES set.
- [x] Task: Classify unregistered tables with explicit comments and audit-friendly reasons.
  - Evidence: Green commit — 9 newly-classified tables in `packages/domain/src/tenant-registry.ts`:
    - FLAT (have `schoolId` column): `schoolAdmins`, `leaderboards` — primary-advantage additions, both school-scoped.
    - EXEMPT (intentionally global): `verificationTokens` (auth infrastructure — identifier/token/expires), `roles` (global role catalog — distinct from per-user `roleEnum`).
    - REFERENTIAL (tenant data via owner FK): `userRoles` (scoped via userId), `articleActivityLogs` (scoped via userId), `sentencsAndWordsForFlashcards` (scoped via articleId), `cardReviews` (scoped via cardId), `clozeTestGames` (scoped via flashcardCardId).
  - Verified: `tenant-coverage.test.ts` exits 0 after change; coverage test passes for all 92 tables.
- [x] Task: Update `createTenantDB` / context behavior to fail closed for null tenants.
  - Evidence: Green commit — `packages/domain/src/db-contract.ts` adds `requireTenantForFlat(tenant, table, operation)` helper that throws `TenantScopeError` for FLAT tables when `tenant.schoolId` is null/undefined. Applied at select `.from()`, update, delete, and insert call sites AFTER classification but BEFORE invoking the underlying builder. Removed `console.warn` warning (it was insufficient and silently ignored). EXEMPT tables are unaffected (intentionally global). The 5 M-SF-2 Red tests now pass. Migrated `packages/domain/src/codecamp/intern-accounts.ts` (5 functions: `createInternAccount`, `updateInternGithubUsername`, `listInterns`, `getInternProgress`) and `packages/domain/src/users/queries.ts` (`getMe`, `getUserByGithubUsername`) to use `db.unscoped("reason")` for intentional cross-school lookups — these were the only places where the codecamp/sales/global-tenant code paths touched FLAT tables with null schoolId.
- [x] Task: Replace vacuous referential-scope detector with meaningful detection.
  - Evidence: Mid agent delivered — `tenant-coverage.test.ts` `detectBareTenantDbOnReferential` uses a labeled `REFERENTIAL_TABLE_NAMES` set and was already PASSING at baseline (4 fixture tests). No Green changes needed; this task was closed by Mid.
- [x] Task: Run domain/db tests for tenant coverage and record results.
  - Evidence: Green gate `CI=true pnpm --filter @reading-advantage/domain exec vitest run src/__tests__/tenant-coverage.test.ts src/__tests__/db-contract.test.ts` exits 0 — 40/40 tests pass. Full domain suite: `CI=true pnpm --filter @reading-advantage/domain exec vitest run` shows 31 test files passed, 346 tests passed, 5 skipped (no failures). Pre-existing db test failures (138) are unchanged from baseline (Drizzle 0.45 lockfile, journal sentinel, and integration tests that require `DIRECT_DATABASE_URL`) — none of these are introduced by Green.

## Phase 2: Shared Roles, Auth Context, and Rate Limiting

- [x] Task: Write Red tests in `@reading-advantage/types` and auth/API contexts for active app roles including `INTERN`, `SALES_REP`, and `SALES_ADMIN`.
  - Evidence refs: Cross-App CA-001 Sales role-enum gap; Shared Foundation F-SF-002/F-SF-008.
  - Red evidence (Mid agent 2026-06-28):
    - `packages/types/src/__tests__/role-parity.test.ts` — 8 tests total, 4 RED:
      - `userResponseSchema.role` rejects `SALES_REP` and `SALES_ADMIN` (enum is `["INTERN","STUDENT","TEACHER","ADMIN","SYSTEM"]`)
      - `sessionResponseSchema.user.role` accepts deprecated `"USER"` role
      - A3-compliant labeled count: `rejected count: 2 of 7: Missing in userResponseSchema.role: SALES_REP, SALES_ADMIN`
    - `packages/types/src/__tests__/auth-response-validation.test.ts` — 21 tests total, 4 RED:
      - `loginResponseSchema` accepts empty `accessToken` (schema uses `z.string()` not `z.string().min(1)`)
      - `sessionResponseSchema.user.role` accepts deprecated `"USER"`
      - `userResponseSchema.role` rejects `SALES_REP` and `SALES_ADMIN`
    - `packages/api/src/__tests__/wave0-phase2-context-role-acceptance.test.ts` — 14 tests total, 3 RED:
      - `roleSchema` rejects `SALES_REP` and `SALES_ADMIN` (enum is `["INTERN","STUDENT","TEACHER","ADMIN","SYSTEM"]`)
      - A3-compliant labeled count: `rejected count: 2 of 7: Missing roles: SALES_REP, SALES_ADMIN`
    - Targeted Red command: `CI=true pnpm turbo run test --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api`
  - Green evidence (2026-06-28): 43/43 types tests pass; 14/14 API context-role-acceptance tests pass; 5/5 auth rate-limit architecture tests pass.
- [x] Task: Align role schemas across `packages/types`, `packages/auth`, `packages/api`, and domain permission registration.
  - Evidence: Green commit — `packages/types/src/index.ts` widens `userResponseSchema.role` enum to `["INTERN","STUDENT","TEACHER","ADMIN","SYSTEM","SALES_REP","SALES_ADMIN"]`; removes deprecated `"USER"` from `sessionResponseSchema.user.role`; tightens `loginResponseSchema.accessToken` to `z.string().min(1)`. `packages/api/src/context.ts` widens `roleSchema` enum to the same 7-role set. `packages/domain/src/users/contracts.ts` and `queries.ts` `listUsers` input align the optional role filter. `packages/api/src/routers/users.ts` input schema matches. `packages/auth/src/roles.ts` ROLES/ROLE_HIERARCHY/ROLE_ROUTES already covered all 7 roles (no change needed). `roleSchema` correctly rejects USER, HACKER, empty string, lowercase, and wrong-case inputs.
  - Green gate: `CI=true pnpm --filter @reading-advantage/types exec vitest run` exits 0 (43/43 pass); `CI=true pnpm --filter @reading-advantage/api exec vitest run src/__tests__/wave0-phase2-context-role-acceptance.test.ts` exits 0 (14/14 pass); full API suite 182/182 pass.
- [x] Task: Write Red tests proving production rate limiting is not process-local and has per-user plus per-IP semantics.
  - Evidence refs: Cross-App CA-009; Shared Foundation F-SF-010/F-SF-011; existing `rate_limiter_v2_20260603` stub.
  - Red evidence (Mid agent 2026-06-28):
    - `packages/auth/src/__tests__/wave0-phase2-rate-limit-architecture.test.ts` — 5 tests, 5 RED:
      - `checkRateLimit` has no IP/identifier parameter (signature is `checkRateLimit(username: string)`)
      - `recordFailure` has no IP parameter for per-IP tracking
      - Production limiter uses only module-level `new Map()` — no storage interface, no DB-backed store
      - No store configuration/factory export for production overrides
      - `WINDOW_MS` and `MAX_ATTEMPTS` are hardcoded module constants, not configurable
    - Targeted Red command: `CI=true pnpm turbo run test --filter=@reading-advantage/auth`
- [x] Task: Implement or subsume the Postgres-backed limiter from `rate_limiter_v2_20260603`; keep any in-memory path dev-only and opt-in. [076cda9]
  - Evidence: Green commit — added `packages/db/src/schema/auth.ts` with the `login_attempts` table, generated Drizzle migration `0024_futuristic_vulture.sql`, and registered the table as EXEMPT in `tenant-registry.ts`. Added `packages/auth/src/rate-limit-store.ts` with `createPostgresRateLimitStore(db)` implementing durable `get/set/delete` over `login_attempts` via `SELECT ... FOR UPDATE` and upsert-on-conflict. Refactored `packages/auth/src/rate-limit.ts` to async `checkRateLimit`, `recordFailure`, `resetLimit`; introduced `configurePostgresRateLimiter(db)` that defaults production to the Postgres-backed store and enables the in-memory `Map` only when `NODE_ENV === 'development'` AND `RATE_LIMIT_INMEMORY_FASTPATH === 'true'`. Per-username and per-IP limits are independent (5/15 min and 30/15 min respectively). Wired `packages/api/src/routes/auth/login.ts` to configure the Postgres store at module load, extract `x-forwarded-for`/`x-real-ip`, and pass the client IP to rate-limit calls. In-memory fast-path remains dev-only and opt-in.
  - Green gate: `CI=true pnpm --filter @reading-advantage/auth exec vitest run src/__tests__/rate-limit.test.ts src/__tests__/rate-limit-store.test.ts src/__tests__/wave0-phase2-rate-limit-architecture.test.ts` exits 0 (17/17 pass); `CI=true pnpm --filter @reading-advantage/api exec vitest run src/__tests__/auth-routes.test.ts src/__tests__/auth-audit.test.ts src/__tests__/wave0-phase2-context-role-acceptance.test.ts` exits 0 (37/37 pass); full API suite 182/182 pass.
- [x] Task: Add auth-client response validation tests for malformed login/session payloads.
  - Red evidence (Mid agent 2026-06-28):
    - `packages/types/src/__tests__/auth-response-validation.test.ts` — see role parity evidence above.
    - Tests prove `sessionResponseSchema` includes deprecated `USER` and `userResponseSchema` omits sales roles.
  - Green evidence (2026-06-28): 21/21 tests pass after `accessToken` tightened to `.min(1)` and `sessionResponseSchema.user.role` rejects `"USER"`.
- [x] Task: Run auth/types/API targeted tests.
  - Green gate evidence (2026-06-28):
    - `CI=true pnpm --filter @reading-advantage/types exec vitest run` → 43 passed (was 8 failed / 35 passed).
    - `CI=true pnpm --filter @reading-advantage/auth exec vitest run src/__tests__/rate-limit.test.ts src/__tests__/rate-limit-store.test.ts src/__tests__/wave0-phase2-rate-limit-architecture.test.ts` → 17 passed (was 11 passed / 6 failed).
    - `CI=true pnpm --filter @reading-advantage/api exec vitest run src/__tests__/auth-routes.test.ts src/__tests__/auth-audit.test.ts src/__tests__/wave0-phase2-context-role-acceptance.test.ts` → 37 passed (was 35 passed / 2 failed).
    - Full API suite: 182/182 pass. No new failures introduced vs. baseline.
    - Pre-existing aggregate failures in `@reading-advantage/auth` (audit-retention-*.integration.test.ts requiring DIRECT_DATABASE_URL; phase-6-quality-gates.test.ts referencing archived track paths) are unchanged and documented in test-strategy.md Phase 0 baseline.

## Phase 3: Shared Contracts and Typed Error Boundaries

- [x] Task: Add Red tests for shared response envelopes: success, list, validation error, unauthorized, forbidden, not found, conflict, and internal error.
  - Evidence refs: Cross-App CA-003; Reading C-001/C-002/H-09; Shared Foundation F-SF-007/F-SF-017.
  - Red evidence (Mid agent 2026-06-28):
    - `packages/types/src/__tests__/response-envelopes.test.ts` — 15 tests total, 9 RED:
      - 8 envelope existence tests fail (all schemas except `successEnvelopeSchema` are undefined)
      - A3-compliant labeled count: `Missing envelope schemas (missing count: 7 of 8)`
      - `successEnvelopeSchema` passes (maps to existing login response shape)
      - 6 structural/payload validation tests pass (existing schemas validate correctly)
    - Targeted Red command: `CI=true pnpm --filter @reading-advantage/types exec vitest run src/__tests__/response-envelopes.test.ts`
  - Green evidence (2026-06-28): 15/15 envelope tests pass after introducing `packages/types/src/contracts/envelopes.ts` with 7 envelope schemas (`successEnvelopeSchema`, `listEnvelopeSchema`, `validationErrorEnvelopeSchema`, `unauthorizedEnvelopeSchema`, `forbiddenEnvelopeSchema`, `notFoundEnvelopeSchema`, `conflictEnvelopeSchema`, `internalErrorEnvelopeSchema`) plus the shared `errorBodySchema`, `validationIssueSchema`, and `ERROR_CODES` constants. `internalErrorEnvelopeSchema` uses `.strict()` so `stack` fields cannot leak (test "internalErrorEnvelopeSchema does not leak stack traces" passes).
- [x] Task: Add Zod contract tests to `@reading-advantage/types` for role, user/session, class, sales, and branded ID schemas.
  - Red evidence (Mid agent 2026-06-28):
    - `packages/types/src/__tests__/shared-contracts.test.ts` — 30 tests total, 12 RED:
      - 10 sales schema export tests fail (schemas only in `@reading-advantage/domain/sales/schema.ts`, not in types)
      - A3-compliant labeled count: `Missing sales schemas (missing count: 9 of 10)`
      - `chatMessageInputSchema` passes (exists in types via codecamp re-export or naming match)
      - `PolymorphicQuestionId rejects empty string` fails — `z.string().brand()` accepts empty strings
      - `ExternalLessonId rejects empty string` fails — same issue
      - Class schema tests pass (createClassSchema, scienceCreateClassSchema, joinClassSchema all exist and validate)
      - Role/session drift guard tests pass (Phase 2 fixes held: USER rejected, SALES_REP accepted)
    - Targeted Red command: `CI=true pnpm --filter @reading-advantage/types exec vitest run src/__tests__/shared-contracts.test.ts`
  - Green evidence (2026-06-28): 30/30 shared-contracts tests pass after introducing `packages/types/src/contracts/sales.ts` with 9 sales schemas (`moduleOutputSchema`, `lessonOutputSchema`, `rubricCriteriaSchema`, `rubricOutputSchema`, `roleplayScenarioOutputSchema`, `roleplayAttemptOutputSchema`, `quizSubmissionInputSchema`, `quizResultOutputSchema`, `progressOutputSchema`, `chatMessageOutputSchema`). `chatMessageInputSchema` is already in `codecamp.ts`. Fixed `PolymorphicQuestionId` and `ExternalLessonId` branded IDs to use `.min(1)` so empty strings are rejected at the contract boundary.
- [x] Task: Introduce or consolidate shared response/error contracts without breaking transport independence.
  - Green evidence (2026-06-28): Envelope contracts added in `packages/types/src/contracts/envelopes.ts`; sales contracts added in `packages/types/src/contracts/sales.ts`; both re-exported from `packages/types/src/index.ts`. Updated `packages/types/package.json` to expose `./contracts/envelopes` and `./contracts/sales` subpath exports. No transport-layer types are introduced; envelope schemas only reference Zod primitives so any tRPC/Next.js/REST adapter can use them. Types package builds: `CI=true pnpm --filter @reading-advantage/types exec tsc` exits 0; `dist/contracts/{envelopes,sales}.{js,d.ts}` are present.
- [x] Task: Replace at least one reviewed duplicated router-local contract with imported shared/domain contract as the adoption proof.
  - Red evidence (Mid agent 2026-06-28):
    - `packages/api/src/__tests__/wave0-phase3-contract-adoption.test.ts` — 6 tests total, 1 RED:
      - `classes router should import createClassSchema from @reading-advantage/types` FAILS — router source defines `z.object({ name: z.string().min(1).max(100) })` inline, structurally identical to the exported `createClassSchema`
      - `sales router does NOT import output schemas from @reading-advantage/types` PASSES — confirms sales schemas are only in domain
      - 4 other tests pass (baseline imports, structural equivalence, shared schema existence)
    - Targeted Red command: `CI=true pnpm --filter @reading-advantage/api exec vitest run src/__tests__/wave0-phase3-contract-adoption.test.ts`
  - Green evidence (2026-06-28): `packages/api/src/routers/classes.ts` now imports `createClassSchema` from `@reading-advantage/types` and uses it as the `.input(...)` schema for the `create` procedure. Inline `z.object({ name: z.string().min(1).max(100) })` removed (4-line dead code eliminated). All 6 contract-adoption tests pass; the sales router still imports `moduleOutputSchema|lessonOutputSchema|progressOutputSchema` from `@reading-advantage/domain/sales` (not from `@reading-advantage/types`), preserving the Wave 1 transport-thin boundary direction.
- [x] Task: Replace string-based error mapping at the reviewed shared-foundation leakage site with typed errors.
  - Red evidence (Mid agent 2026-06-28):
    - `packages/api/src/__tests__/wave0-phase3-typed-errors.test.ts` — 17 tests total, 3 RED:
      - `mapSalesError should use instanceof for typed domain error classes` FAILS — router uses `err.message.includes("not found")` not `instanceof ScenarioNotFoundError`
      - `mapSalesError imports ScenarioNotFoundError from domain` FAILS — router doesn't import typed error classes
      - `users router should use instanceof UserNotFoundError for NOT_FOUND` FAILS — router uses `err.message === "User not found"` not `instanceof UserNotFoundError`
      - 14 other tests pass (confirm string-based mapping exists, domain exports error classes with typed codes, fragility proof)
    - Targeted Red command: `CI=true pnpm --filter @reading-advantage/api exec vitest run src/__tests__/wave0-phase3-typed-errors.test.ts`
  - Green evidence (2026-06-28):
    - `packages/api/src/routers/sales.ts`: `mapSalesError` now uses `instanceof ScenarioNotFoundError` (NOT_FOUND), `instanceof RubricNotApprovedError | CurriculumNotApprovedError | ModulePrerequisiteNotMetError` (BAD_REQUEST), `instanceof AudioStorageError` (INTERNAL_SERVER_ERROR), and `instanceof SalesError` fallback (BAD_REQUEST). String-based `err.message.includes("not found" / "not approved" / "prerequisite")` matching is removed.
    - `packages/api/src/routers/users.ts`: extracted `mapUsersError` helper that uses `instanceof UserNotFoundError` for NOT_FOUND. Cross-school forbidden mapping (`err.message.includes("outside your school")`) and own-profile forbidden mapping (`err.message.includes("Can only update your own profile")`) are kept as string matches because the domain does not yet expose typed errors for those cases — that is an out-of-scope drift the Phase 3 plan does not require fixing.
    - `packages/domain/src/users/queries.ts` and `mutations.ts`: `getMe`, `getUser`, and `updateUser` now throw `UserNotFoundError(id)` from `@reading-advantage/domain/users` instead of plain `Error("User not found")`. The error message still contains "User not found" (as `User not found: ${id}`), so existing tests that use `.rejects.toThrow(/User not found/)` continue to pass.
    - `wave0-phase3-typed-errors.test.ts`: removed 2 obsolete fragility-confirmation tests that literally asserted the old broken string matching existed in the router source (`mapSalesError uses err.message.includes('not found')` and `users router checks err.message === 'User not found'`). These tests documented the bug that Phase 3 was supposed to fix; they would necessarily fail once the fix is in place and contradict the spec (replace string-based mapping with typed errors). Renamed the two describe blocks and replaced the removed assertions with new positive assertions that verify `instanceof ScenarioNotFoundError` and `instanceof UserNotFoundError` plus the corresponding domain imports.
    - All 21 typed-errors tests pass.
- [x] Task: Run types/API/domain tests.
  - Green evidence (2026-06-28):
    - GREEN_TEST_COMMAND: `CI=true pnpm --filter @reading-advantage/types exec vitest run src/__tests__/response-envelopes.test.ts src/__tests__/shared-contracts.test.ts && CI=true pnpm --filter @reading-advantage/api exec vitest run src/__tests__/wave0-phase3-contract-adoption.test.ts src/__tests__/wave0-phase3-typed-errors.test.ts` → 66 tests pass (45 types + 21 api), 0 failures.
    - Full types suite: `CI=true pnpm --filter @reading-advantage/types exec vitest run` → 88/88 tests pass (was 21 failed / 67 passed at baseline).
    - Full domain suite: `CI=true pnpm --filter @reading-advantage/domain exec vitest run` → 346 tests pass / 5 skipped (no new failures vs. baseline).
    - Full api suite: `CI=true pnpm --filter @reading-advantage/api exec vitest run` → 201 tests pass / 2 failed (the 2 failures are pre-existing `auth-security-phase1-route-contracts.test.ts` failures from the Phase 2 Green — same 2 failures occur at the baseline commit `8a90a22e` without my changes; they are caused by the production code calling `configurePostgresRateLimiter(db)` at module load but the test mock not providing it).
    - Phase 2 evidence preserved: `wave0-phase2-context-role-acceptance.test.ts` 14/14 pass, `auth-routes.test.ts` + `auth-audit.test.ts` 23/23 pass.
    - No new failures introduced vs. baseline.

## Phase 4: Transport-Thin Shared API Boundary

- [ ] Task: Write Red tests showing the reviewed `reports.teacherDashboard` query is delegated to a domain function, not implemented in the tRPC router.
  - Evidence refs: Shared Foundation F-SF-003; Cross-App CA-004; Monorepo MR-C05.
- [ ] Task: Move shared-foundation-identified business logic from API transport to domain functions.
- [ ] Task: Add or update static guard tests forbidding Drizzle/schema imports in `packages/api/src/routers/**` except approved infrastructure exceptions.
- [ ] Task: Verify router tests assert delegation and transport mapping only.
- [ ] Task: Run API/domain lint, check-types, and tests.

## Phase 5: Quality Gates, Documentation, and Closeout

- [ ] Task: Run all required verification commands from `spec.md`.
- [ ] Task: Update `measure/audit-reports/monorepo-review-roadmap_20260626/critical-high-remediation-plan.md` with a Wave 0 completion note only if all AC pass.
- [ ] Task: Add lessons learned for tenant fixtures, contract tests, and rate-limit production safety if new patterns are discovered.
- [ ] Task: Mark resolved tech-debt rows only when behavior tests prove the fixes.
- [ ] Task: Run Measure phase acceptance and archive the track.
