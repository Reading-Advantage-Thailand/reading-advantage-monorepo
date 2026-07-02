# Test Strategy: Wave 1 — Stop Active High-Risk Product Failures

Track: `wave1_high_risk_product_failures_20260628`
Baseline SHA: `822f339dfbff00c9a60af861ee55b27946056633`
Role: Measure Strategy. Scope is test strategy plus Phase 0 plan evidence only; no product fixes.

## Phase 0 baseline, Wave 0 primitives, and first slices

### Wave 0 primitives available

Wave 0 commits are present at baseline SHA `822f339d` and provide these primitives for Wave 1 tests to consume:

- **Tenant registry + TenantDB:** all 92 exported Drizzle tables are classified; `createTenantDB` fails closed for null/undefined tenants on FLAT select/insert/update/delete; REFERENTIAL tables throw `TenantScopeError` unless reached via `tenantDb.unscoped("reason")`.
- **Roles/auth context:** `INTERN`, `STUDENT`, `TEACHER`, `ADMIN`, `SYSTEM`, `SALES_REP`, and `SALES_ADMIN` are accepted by shared `roleSchema` / types; deprecated `USER` is rejected in shared session contracts.
- **Rate limiting:** auth rate limiting has a Postgres-backed store seam with independent username and IP buckets; in-memory is dev-only opt-in.
- **Contracts:** shared response-envelope schemas exist in `@reading-advantage/types`; sales wire contracts exist in `packages/types/src/contracts/sales.ts`.
- **Typed mapping / transport guard:** the reviewed API boundary moved `reports.teacherDashboard` to domain, and API architecture tests forbid direct Drizzle/schema imports in routers.

Graph probe: `build-graph stats ./graph.db` reported 22,365 nodes / 46,141 edges / 2,720 files. Relevant graph/source facts: `createTenantDB` and `postActivityLog` are indexed; `roleSchema` is not indexed by name but exists in `packages/api/src/context.ts`; `codecampPrReviews` searches are not indexed by table name, so source inspection was used for CodeCamp.

### Source evidence read

Primary, Reading, CodeCamp, Sales executive summaries and migration/findings files were read, plus roadmap source files (`deduplicated-findings.md`, `product-risk-register.md`, `medium-plus-coverage-matrix.md`). Key evidence that shaped slice choice:

- Primary: M1–M6/M8/M11; ~30 game completion crashes; admin CRUD/commented UI; flashcard schema mismatch; auth and tenant gaps; fabricated dashboard metrics.
- Reading: M-RA-SEC-1..5 and PB-1..3; classroom destructive operations lack ownership/tenant checks; unauthenticated sensitive endpoints; no audit events; `postActivityLog` XP race.
- CodeCamp: MT-1..6; `pr-reviews.ts` and `exercises.ts` still call REFERENTIAL tables through TenantDB directly, while siblings use `unscoped()`; webhook suite currently logs `TenantScopeError` but still passes.
- Sales: T1/T2/T3/T7; `saveAttemptEvaluation` updates by attempt id only; `getCohortOverview` returns all `salesProgress`; audio validation/privacy and `audioStorageKey` nullability remain high-risk.

### First vertical slice per app

| App | First vertical slice | Why first | Live-behavior proof target |
|---|---|---|---|
| Primary | `lesson-sentence-order-word.tsx` / `order-words-game.tsx` completion path through session refresh + persisted activity/XP. | Representative M1 undefined `update`/`session` crash and core student learning loop. | User completes the sentence ordering game with a mocked session and DB/API response; no ReferenceError; one completion POST/action occurs; session refresh uses an available auth-client contract. |
| Reading | Classroom destructive operation (`deleteClassroom` first, then enroll/unenroll same pattern). | Highest-risk tenant/auth destructive flow: C-007/C-RA-CRIT-03 + audit logging. | Cross-school teacher cannot delete/unenroll; owning teacher/admin can; delete creates an audit event with actor/resource/school. |
| CodeCamp | GitHub PR-review webhook/domain path: PR review lookup/update/completion through real TenantDB classification. | CR-1/CR-2 + webhook reliability are the launch-blocking intern workflow. | Real `createTenantDB` with codecamp REFERENTIAL tables does not throw after explicit `unscoped("reason")`; duplicate delivery id is idempotent; webhook ACK is not blocked by LLM. |
| Sales | Roleplay attempt upload/evaluation path from role gate + audio validation to `saveAttemptEvaluation`. | C1/C2/C3/C4/C5/C13 cluster touches security, privacy, and contract drift. | `SALES_REP` is authenticated; invalid audio rejected before provider/buffer; rep cannot evaluate another rep's attempt; `audioStorageKey` nullable contract parses. |

### Baseline command evidence

Baseline aggregate command run at SHA `822f339d`:

```bash
CI=true pnpm turbo run test --filter=primary-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/webhooks
```

Result: **exit 1**. Labeled failure count: **2 API failures** in the aggregate output:

1. `packages/api/src/__tests__/wave0-phase3-typed-errors.test.ts` hook timed out importing domain modules.
2. `packages/api/src/__tests__/auth-security-phase3-signup-removal.test.ts` app-source scan timed out.

Important false-green evidence: `@reading-advantage/webhooks` reported **6/6 passing test files** while logging `TenantScopeError: [TenantDB] Table "codecamp_pr_reviews" is REFERENTIAL...` during lesson completion. Wave 1 must not treat that suite as live proof until a new assertion fails on the `TenantScopeError` and then passes after the CodeCamp fix.

## Global testing rules for this wave

- Prefer backend/domain tests first, then transport adapter tests, then component/UI/browser tests only where the slice is UI-owned.
- Use mocks for DB/provider seams in unit tests, but every app slice needs at least one behavior test that exercises the real changed contract: real `TenantDB` classification for CodeCamp/Sales/Reading tenant paths, real Zod schema parsing for contract paths, and real component rendering for Primary completion crash.
- All Red tests must have an explicit falsification condition in the test name or assertion message: e.g. `violating row count: N`, `missing auth guard count: N`, `duplicate delivery count: N`, `provider call count: N`.
- Artifact/document tests may inspect source files, migrations, or Measure docs, but they do **not** prove live behavior. Closeout for each phase requires a live-behavior test listed below.
- Do not use broad source-text filters that hide real matches. Path/disclaimer filters only; no `rg -v "never|do not|cannot"` patterns.
- If an aggregate suite remains red for unrelated pre-existing reasons, record the exact failing test names and run the targeted Wave 1 Green gate. Do not claim aggregate green unless it exits 0.

## Phase gates

### Phase 0 — Baseline and Slice Selection

**Targeted Red command:**

```bash
CI=true pnpm turbo run test --filter=primary-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/webhooks
```

**Expected Red:** aggregate exits 1 today with the two API timeout failures above. Webhooks may pass while logging CodeCamp `TenantScopeError`; that is a false-green signal to be converted into a failing Phase 3 test.

**Green gate:** `test-strategy.md` exists, Phase 0 plan markers list Wave 0 primitives, slices, and baseline evidence. No product source changes.

**Closeout gate:** `git diff -- measure/tracks/wave1_high_risk_product_failures_20260628` shows only `test-strategy.md` and Phase 0 plan evidence; no app/package source touched.

**Anti-pattern coverage:** A3 labeled failure count for aggregate baseline; A4 no Phase 0 task is marked complete without evidence; A5 no "all green" claim while aggregate exits 1; A6 no roadmap/registry overstatement; A8 plan markers use `[x]` only for completed Phase 0 tasks.

### Phase 1 — Primary Advantage Core Stabilization

**Targeted Red command (after Red tests are authored):**

```bash
CI=true pnpm --filter primary-advantage exec vitest run \
  components/lesson/games/__tests__/lesson-sentence-order-word.completion.test.tsx \
  components/pratice/__tests__/order-words-game.completion.test.tsx \
  app/api/flashcard/__tests__/flashcard-schema-contract.test.ts \
  'app/[locale]/admin/__tests__/students-crud-live-calls.test.tsx' \
  components/admin/__tests__/dashboard-real-data.test.tsx
```

**Red expectations / falsification conditions:**

- Completion tests fail with a captured ReferenceError or static guard: `missing session/update binding count >= 1`; they must prove the component imports/destructures a usable session-refresh contract before invoking it.
- Admin CRUD test fails unless add/update/delete issue a real fetch/server action and reconcile the response; optimistic-only state mutation is falsified by `server call count: 0`.
- Flashcard contract test fails on current use of `due`, `stability`, `difficulty`, `lapses`, `state`, `last_review` / `reviewedAt` casts not represented by the shared schema or extension table strategy.
- Dashboard test fails when chart data is literal/fabricated and no unavailable-state label or real endpoint is used.

**Green gate:** all targeted Primary tests pass; touched Primary routes/actions enforce auth and tenant/school scoping from the authenticated user, not request body. Component tests prove no completion crash and exactly one completion request/action per game completion.

**Closeout gate:**

```bash
CI=true pnpm turbo run test --filter=primary-advantage --filter=@reading-advantage/domain
CI=true pnpm turbo run lint --filter=primary-advantage
CI=true pnpm turbo run check-types --filter=primary-advantage --filter=@reading-advantage/domain
```

If full Primary tests expose unrelated legacy failures, list each failing test with owner wave and keep the targeted Phase 1 Green command as the Wave 1 proof.

**Fixtures/mocks/live proof:** use Testing Library for game components; mock `@reading-advantage/auth-client` with `{ user, update }`; mock completion API/action and assert calls. Use DB mock helper for route/service tests. Live proof is component behavior + route/service behavior, not source-text scans.

**Architecture guardrails / changed-contract risks:** no return to Prisma; no direct provider work; no session object named `session` unless actually returned by the auth hook; flashcard schema strategy must be explicit (shared migration or extension table), not hidden behind `as any`.

**Anti-pattern coverage:** A3 labeled counts for crash-pattern files and flashcard mismatch fields; A4 guard against tests passing when no component is rendered or no server call happens; A5 targeted command result must match plan text; A6 dashboard cannot claim "real metrics" unless endpoint/data unavailable state is tested; A7 filters only path contexts; A10 update graph only if exported/shared contracts or JSX hierarchy are structurally changed.

### Phase 2 — Reading Advantage Critical Security and XP Idempotency

**Targeted Red command (after Red tests are authored):**

```bash
CI=true pnpm --filter reading-advantage test -- \
  __tests__/controllers/classroom-authorization.test.ts \
  __tests__/controllers/audit-events.test.ts \
  __tests__/controllers/post-activity-log-idempotency.test.ts \
  __tests__/actions/sensitive-auth-boundaries.test.ts \
  __tests__/ai/level-test-contract.test.ts \
  __tests__/ai/content-quality-gate.test.ts
```

**Red expectations / falsification conditions:**

- Classroom tests fail when a cross-school teacher can delete/unenroll (`forbidden result count: 0`) or when classroom ownership is not queried.
- Audit tests fail when destructive operations return success but `recordAuditEvent` call count is 0 or lacks actor/resource/school fields.
- XP concurrency test fires parallel `postActivityLog` completions for the same `(userId, activityType, targetId)` and fails unless XP increases exactly once and `xpLogs` contains one row.
- Sensitive-boundary tests fail when `submitRating`, `actions/pratice.ts`, `refreshAIInsightsAutomated`, generation/system endpoints accept unauthenticated calls.
- AI contract tests fail on malformed level-test JSON or off-level content being persisted/returned.

**Green gate:** targeted Reading tests pass with mocked DB/AI where appropriate; tenant/ownership checks are in backend/controller/domain paths, not just UI; every destructive success emits an audit event.

**Closeout gate:**

```bash
CI=true pnpm turbo run test --filter=reading-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api
CI=true pnpm turbo run lint --filter=reading-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api
CI=true pnpm turbo run check-types --filter=reading-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api
```

**Fixtures/mocks/live proof:** controller tests should use mocked Drizzle chains and explicit `ExtendedNextRequest` fixtures; concurrency test uses controlled mock transaction/upsert behavior or a pglite-style isolated DB if already available. AI tests use mocked provider responses; live proof is validation/rejection behavior, not model quality.

**Architecture guardrails / changed-contract risks:** destructive auth/tenant logic must move toward domain/assertCan where practical; server actions must not fabricate sessions; XP idempotency must be atomic via transaction/unique constraint or equivalent domain guard, not an in-memory flag.

**Anti-pattern coverage:** A2 consent/privacy defenses for AI/user-generated publish gates; A3 labeled counts for unauthenticated endpoint inventory and XP duplicate rows; A4 concurrency test must fail if zero requests execute; A5 no success claim while aggregate Reading/Jest is red; A6 product-risk register only updated for proven workflows; A7 no broad exclusions of auth findings; A9 any tests referencing archived Measure paths must use a resolver or avoid Measure paths; A10 graph update if shared domain/controller exports move.

### Phase 3 — CodeCamp Runtime Reliability

**Targeted Red command (after Red tests are authored):**

```bash
CI=true pnpm --filter @reading-advantage/domain exec vitest run \
  src/__tests__/codecamp-tenantdb-runtime.test.ts \
  src/__tests__/codecamp-webhook-idempotency-domain.test.ts && \
CI=true pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/github-webhook-idempotency.test.ts \
  src/__tests__/github-webhook-ack-latency.test.ts && \
CI=true pnpm --filter codecamp-advantage exec vitest run \
  app/api/chat/__tests__/streaming-protocol.test.ts
```

**Red expectations / falsification conditions:**

- TenantDB runtime test uses the real tenant registry and `createTenantDB`; it fails if `getPrReviewsForUser`, `createPrReview`, `completeApprovedPrReviewLesson`, `getExerciseRepos`, or webhook event functions throw `TenantScopeError`, or if test fixtures classify codecamp tables as EXEMPT.
- Idempotency test fails when two deliveries with the same GitHub delivery id create two jobs/reviews/comments (`duplicate delivery count > 1`).
- ACK-latency test fails when the webhook awaits LLM review before returning; prove with a deferred promise and assert response resolves before the LLM promise.
- Missing-token diff test fails open today if a mock diff can produce an approved/completed lesson; Green requires fail-closed/error state.
- Streaming test fails unless server response protocol and client parser agree (`content-type`, framing, chunk buffering).

**Green gate:** all targeted CodeCamp/domain/webhooks/chat tests pass; no `TenantScopeError` appears in webhook test stderr for expected-success scenarios; duplicate delivery is no-op/idempotent.

**Closeout gate:**

```bash
CI=true pnpm turbo run test --filter=codecamp-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/webhooks
CI=true pnpm turbo run lint --filter=codecamp-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/webhooks
CI=true pnpm turbo run check-types --filter=codecamp-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/webhooks
```

**Fixtures/mocks/live proof:** use real `TenantDB` proxy around a mock DB so table classification is live; use GitHub HMAC/delivery fixtures and mocked AIClient; use fake timers/deferred promises for ACK behavior. Artifact tests about report summaries are not sufficient; runtime-equivalent webhook/domain tests are required.

**Architecture guardrails / changed-contract risks:** all REFERENTIAL access must include greppable `unscoped("reason")` plus owner-FK/user scoping where needed; no fire-and-forget untracked promise that swallows failures; worker/job state must be Postgres-backed or explicitly integrate the planned queue seam; GitHub adapter use must remain provider-neutral.

**Anti-pattern coverage:** A1/A3 structured delivery/job state rather than substring "processed" or digit-only counts; A4 fail if no webhook path executed; A5 webhooks passing while logging `TenantScopeError` is explicitly false-green and must become a failing assertion; A6 no launch/acceptance registry claim until no-go blockers are green; A7 no log filters that drop TenantScopeError lines; A9 avoid archived track paths in package tests; A10 update graph for domain/webhook exported-symbol changes.

### Phase 4 — Sales Security, Privacy, and Contract Hardening

**Targeted Red command (after Red tests are authored):**

```bash
CI=true pnpm --filter @reading-advantage/api exec vitest run \
  src/__tests__/sales-auth-context.test.ts \
  src/__tests__/sales-router-audio-contract.test.ts && \
CI=true pnpm --filter @reading-advantage/domain exec vitest run \
  src/__tests__/sales-authorization-idors.test.ts \
  src/__tests__/sales-audio-validation-privacy.test.ts \
  src/__tests__/sales-contract-nullability.test.ts && \
CI=true pnpm --filter sales-advantage exec vitest run \
  app/api/roleplay-attempts/__tests__/audio-upload-boundary.test.ts
```

**Red expectations / falsification conditions:**

- Auth-context test fails if `SALES_REP`/`SALES_ADMIN` parse to `auth=null` or if admin procedures allow a rep.
- IDOR test fails when `saveAttemptEvaluation` updates an attempt not owned by `user.id` or not in the caller's permitted tenant/global scope.
- Cohort test fails when a tenant-scoped admin can read all reps (`cross-tenant row count > 0`). If Sales remains intentionally global, the decision must be documented and the test must assert only authorized `SALES_ADMIN` access.
- Audio boundary test fails if oversized/unsupported MIME/too-long uploads call storage/provider or buffer fully before validation (`provider call count > 0`).
- Privacy test fails if roleplay UI/route can submit audio without consent/retention metadata or if raw PII prompt reaches mocked provider unredacted where redaction is in scope.
- Nullability test fails because `packages/types/src/contracts/sales.ts` and domain output schemas currently require non-null `audioStorageKey` while the mutation contract allows null.

**Green gate:** targeted Sales/API/domain/app tests pass; invalid audio returns structured 400; unauthorized/IDOR cases return 401/403; provider mocks are not called on rejected media; `audioStorageKey` contracts align with DB/write behavior.

**Closeout gate:**

```bash
CI=true pnpm turbo run test --filter=sales-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api
CI=true pnpm turbo run lint --filter=sales-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api
CI=true pnpm turbo run check-types --filter=sales-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api
```

**Fixtures/mocks/live proof:** use `MediaInput` fixtures for valid/invalid audio; mocked AIClient/storage adapter; domain DB mock records `where` predicates and provider calls. Use no real learner audio and no live provider calls.

**Architecture guardrails / changed-contract risks:** audio/privacy controls belong before provider calls; provider access must remain behind `@reading-advantage/ai`/storage adapters; do not solve T4 raw SDK barrel in this wave except guarding against new bypasses; sanitize/draft curriculum leakage is Wave 4 unless touched by roleplay slice.

**Anti-pattern coverage:** A2 consent/retention gate for audio; A3 labeled rejected media count and cross-tenant row count; A4 test fails if no provider/mock call boundary is exercised; A5 no privacy-resolved claim until consent/redaction assertions pass; A6 product-risk register only says fixed for roleplay slice; A7 source guards must not filter out raw SDK mentions by English disclaimers; A10 graph update for sales contract/export changes.

### Phase 5 — Integrated Acceptance

**Targeted Red command:** rerun the user-provided aggregate; it is Red at baseline and should only become Green or be documented with exact unrelated failures after all phase targeted gates pass.

```bash
CI=true pnpm turbo run test --filter=primary-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/webhooks
```

**Green gate:**

```bash
CI=true pnpm turbo run lint --filter=primary-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/webhooks
CI=true pnpm turbo run check-types --filter=primary-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/webhooks
CI=true pnpm turbo run test --filter=primary-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/webhooks
```

**Closeout gate:** all per-phase targeted gates pass; aggregate lint/check-types/tests either exit 0 or have exact, pre-existing, non-Wave-1 failure names with evidence. Product-risk register updates must be limited to proven fixed workflows. Any remaining Critical/High same-class sites in Wave 1 scope must be listed in deviation notes with a named owner wave; Medium+ items must match `medium-plus-coverage-matrix.md`.

**Intentionally-red aggregate-suite handling:**

- Do not add `.skip`/`passWithNoTests` to hide Wave 1 Red tests. Newly authored Red tests are allowed to fail only while their phase is in progress and must be named with the owning phase.
- Existing aggregate failures at Phase 0 are API timeout failures, not Wave 1 product proof. Keep them in the known-failure list until fixed or proven unrelated by targeted gates.
- Existing webhooks false-green is worse than Red: a passing suite logs CodeCamp `TenantScopeError`. Phase 3 must add an assertion so this becomes a true Red test before Green.

**Artifact/documentation vs live behavior:**

- Artifact tests: source scans for banned direct DB/router imports, flashcard field inventories, migration/nullability parity, delivery-id unique-index presence. These can block Green but cannot satisfy closeout alone.
- Live behavior tests: component completion without crash, controller/domain authz decisions, TenantDB runtime-equivalent codecamp calls, webhook ACK/idempotency, sales media rejection before provider, and XP idempotency. Every phase closeout needs at least one live behavior test.

**Scope-completeness rules:**

- Wave 1 may close only Primary M1–M6/M8/M11, Reading M-RA-SEC-1..5 and PB-1..3, CodeCamp MT-1..6, and Sales T1/T2/T3/T7.
- Primary M7/M9 are Wave 4; Primary M10/M12/M13 are Wave 6. Do not silently pull or drop them.
- Reading M-RA-SEC-6..10 and PB-4..8, CodeCamp MT-8..14, and Sales T5/T8/T9 are Wave 4 unless explicitly promoted with plan changes.
- CodeCamp curriculum/doc/test-artifact tracks MT-C1..C4/MT-X1 and Sales T10/T11 are Wave 6.
- A Critical/High track is not closed by one representative slice alone; same-class sites must either be migrated with the proven pattern or explicitly listed in deviation notes with owner wave and falsification evidence.

**Anti-pattern coverage:** A3 parse labeled integers for fixed/deferred counts; A4 acceptance fails if any phase has zero `[x]` evidence; A5 plan/product-risk claims must cite passing commands; A6 registry notes must avoid "resolved" unless adversarial tests pass; A8 use `[x]`, `[~]`, `[b]` only; A9 tests must not pin active paths that will archive; A10 update `graph.db` after exported symbol/import/JSX contract changes.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: wave1_high_risk_product_failures_20260628
phase: track setup / Phase 0: Baseline and Slice Selection
commits: committed by Strategy role after writing; see final handoff for hash
tests_run: CI=true pnpm turbo run test --filter=primary-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/webhooks (exit 1; baseline API timeouts, webhooks false-green TenantScopeError logs)
files_changed: measure/tracks/wave1_high_risk_product_failures_20260628/test-strategy.md (new), measure/tracks/wave1_high_risk_product_failures_20260628/plan.md (Phase 0 evidence only)
plan_updates: Phase 0 tasks marked complete with evidence for Wave 0 primitives, source reads, first app slices, and baseline command
known_failures: aggregate test command exits 1 at Phase 0 due packages/api wave0-phase3-typed-errors beforeAll timeout and auth-security-phase3-signup-removal scan timeout; @reading-advantage/webhooks passes while logging CodeCamp TenantScopeError and must be converted into a true Phase 3 Red test
handoff: Mid Red should author only the Phase 1 targeted Primary tests first unless orchestrator starts another phase; keep tests falsifiable with labeled counts, distinguish source scans from behavior tests, and do not implement product fixes during Red authoring
END_MEASURE_AGENT_RESULT
