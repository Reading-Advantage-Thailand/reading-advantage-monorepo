# Line-by-Line Review — `sales-batch-05` (Final Batch)

- **Track:** `sales_advantage_review_20260626`
- **Batch:** `sales-batch-05` (final batch)
- **Reviewer model:** ark-code-latest (Doubao-Seed-Code)
- **Date:** 2026-06-27
- **Scope:** Line-by-line read of the 10 files listed in `/tmp/opencode/sales-batch-05`. No source code was edited.
- **Focus areas:** sales curriculum/progression, browser audio recording/upload, storage adapter use, AI evaluation/fallback/privacy, auth/role/tenant boundaries, admin reporting, AGENTS compliance, test quality.

## Files Reviewed (all 10 in batch)

1. `packages/domain/src/sales/__tests__/excerpt-derivation.test.ts`
2. `packages/domain/src/sales/__tests__/permissions-and-evaluator.test.ts`
3. `packages/domain/src/sales/contracts.ts`
4. `packages/domain/src/sales/errors.ts`
5. `packages/domain/src/sales/index.ts`
6. `packages/domain/src/sales/mutations.ts`
7. `packages/domain/src/sales/permissions.ts`
8. `packages/domain/src/sales/queries.ts`
9. `packages/domain/src/sales/roleplay-evaluator.ts`
10. `packages/domain/src/sales/schema.ts`

Supporting files read for cross-reference (not part of the batch, not scored): `packages/db/src/schema/sales.ts`.

## Verification Performed

- Ran the two batch test files: `npx vitest run packages/domain/src/sales/__tests__/excerpt-derivation.test.ts packages/domain/src/sales/__tests__/permissions-and-evaluator.test.ts` → **10 tests passed (2 files)**. (Console noted `DATABASE_URL is not set` warning and the intentional `console.error` output from the evaluator fallback path.)
- Cross-checked domain assumptions against the Drizzle schema in `packages/db/src/schema/sales.ts`.

---

## Severity Legend

- **HIGH** — security/authorization/tenant-isolation/data-integrity defect; fix before release.
- **MEDIUM** — correctness, contract mismatch, or AGENTS-compliance gap with material impact.
- **LOW** — minor correctness, robustness, naming, or maintainability issue.
- **INFO** — observation / confirmation of good practice / context for follow-up.

---

## Findings

### F-SALES-B05-001 — `saveAttemptEvaluation` updates an attempt by id with no ownership/tenant scoping (IDOR)
- **Severity:** HIGH
- **File:** `packages/domain/src/sales/mutations.ts:126-168`
- **Detail:** The function asserts only `sales:attempt:create` (line 134) and then updates `salesRoleplayAttempts` filtering solely by `eq(salesRoleplayAttempts.id, input.attemptId)` (line 145). It never verifies that the attempt belongs to `user.id`. Because all `sales_*` tables are REFERENTIAL and accessed through `salesRawDb()` (no `schoolId` scoping), any authenticated SALES_REP can write an arbitrary LLM evaluation (and trigger lesson completion on line 147-166) onto **another rep's** attempt by supplying a foreign `attemptId`. The same gap means there is no cross-tenant isolation on this write.
- **Recommendation:** Add `and(eq(id, attemptId), eq(userId, user.id))` to the update predicate (and re-check after `.returning()` that a row was updated), mirroring the userId scoping used in `getAttemptsForScenario` (queries.ts:204-208).

### F-SALES-B05-002 — `getCohortOverview` returns progress across all tenants with no school boundary
- **Severity:** HIGH
- **File:** `packages/domain/src/sales/queries.ts:295-298`
- **Detail:** `getCohortOverview` runs `rawDb.select().from(salesProgress)` with no filter. Since `sales_progress` has no `schoolId` (REFERENTIAL, scoped via `userId` → `users.schoolId`) and the query is issued through `salesRawDb()` (the explicit tenant escape hatch), a SALES_ADMIN in one school sees **every rep in every school**. AGENTS multi-tenancy rule ("Every query must be scoped by `schoolId`") is violated for admin reporting. The whole sales module currently behaves as single-tenant.
- **Recommendation:** Join `salesProgress.userId` → `users.id` and filter `users.schoolId = tenant.schoolId` (the owner-FK pattern AGENTS prescribes for REFERENTIAL tables), or document an explicit, reviewed decision that sales is intentionally global.

### F-SALES-B05-003 — `getModuleBySlug` and `getDashboardData` leak/count draft (unapproved) lessons
- **Severity:** MEDIUM
- **File:** `packages/domain/src/sales/queries.ts:36-54` (module-by-slug) and `:250-288` (dashboard)
- **Detail:** `getModuleBySlug` selects lessons by `moduleId` with no `reviewStatus` filter (lines 48-52), despite the docstring "with its approved lessons" (line 31). Draft lessons are therefore exposed to reps in the module view, contradicting `getLesson`, which explicitly blocks draft content (`CurriculumNotApprovedError`, lines 75-77) and the `CurriculumNotApprovedError` contract in errors.ts:53-61. `getDashboardData` likewise pulls all lessons (lines 258-265) and counts them in `lessonCount`/progress denominators (lines 280-285), so draft lessons skew completion percentages.
- **Recommendation:** Filter lessons by `reviewStatus = 'approved'` in both queries (and in the dashboard denominator) to match the stated contract and the single-lesson guard.

### F-SALES-B05-004 — `submitRoleplayAttempt` evaluate callback bypasses the FR-4 canonical-excerpt fix
- **Severity:** MEDIUM
- **File:** `packages/domain/src/sales/mutations.ts:181-224`; cross-ref `contracts.ts:25-31`, `queries.ts:157-187`
- **Detail:** The `EvaluateRoleplayFn` contract (contracts.ts:26-31) takes `(audio, scenario, rubric, excerpts)`, and FR-4 added `getRoleplayEvaluationContext` precisely so callers stop passing `excerpts: []`. But `submitRoleplayAttempt.input.evaluate` is typed `(audio, scenarioId) => Promise<...>` (lines 188-191) and is invoked with only `(input.audio, input.scenarioId)` (line 218). This internal flow never sources canonical excerpts via `getRoleplayEvaluationContext`; whether the model receives grounding excerpts depends entirely on the route-supplied callback. The FR-4 regression guard (excerpt-derivation.test.ts) does not cover this path.
- **Recommendation:** Either call `getRoleplayEvaluationContext` inside `submitRoleplayAttempt` and pass `(audio, scenario, rubric, excerpts)`, or align the callback type with `EvaluateRoleplayFn` and document where excerpts are injected. Add a test asserting excerpts reach the evaluator on this path.

### F-SALES-B05-005 — Domain mutations accept unvalidated input (Zod schemas defined but not enforced at the boundary)
- **Severity:** MEDIUM
- **File:** `packages/domain/src/sales/mutations.ts:37-39, 84-87, 126-133, 181-193, 305-307, 342-344` vs `schema.ts:66-70, 106-109, 135-141, 161-165`
- **Detail:** schema.ts defines Zod input contracts (`roleplayAttemptInputSchema`, `quizSubmissionInputSchema`, `chatMessageInputSchema`, `createRepInputSchema`, `approveContentInputSchema`), but the mutation functions take inline TypeScript-typed object literals and never `.parse()` them. Several functions (`createRoleplayAttempt`, `markTheoryLessonComplete`, `saveAttemptEvaluation`) use ad-hoc inline types not backed by any schema at all. AGENTS requires runtime validation at every external boundary ("Do not rely solely on TypeScript types"). If a route forwards raw input, malformed payloads enter the DB layer unchecked.
- **Recommendation:** Parse inputs with the corresponding Zod schema at the top of each mutation/query (or document that the tRPC/route layer guarantees parsing and reference where). Add inline schemas for the currently-unschematized inputs.

### F-SALES-B05-006 — `roleplayAttemptOutputSchema.audioStorageKey` is non-nullable but the column and write path are nullable
- **Severity:** MEDIUM
- **File:** `packages/domain/src/sales/schema.ts:93`; cross-ref `db/src/schema/sales.ts:112`, `mutations.ts:111`
- **Detail:** The output contract declares `audioStorageKey: z.string()` (non-nullable), but the DB column is `text("audio_storage_key")` (nullable, sales.ts:112) and `createRoleplayAttempt` deliberately omits the key when upload failed (mutations.ts:111, per the documented FR-4 null contract). Validating a real attempt row (null key) against this output schema would throw. The contract contradicts the intended nullable behavior.
- **Recommendation:** Change to `z.string().nullable()` to match the column and the FR-4 design.

### F-SALES-B05-007 — `submitRoleplayAttempt` is not transactional; failed evaluation leaves orphan attempt rows
- **Severity:** MEDIUM
- **File:** `packages/domain/src/sales/mutations.ts:181-224`
- **Detail:** The flow performs `createRoleplayAttempt` (insert, line 196) → fetch scenario/rubric → `input.evaluate(...)` (network LLM call, line 218) → `saveAttemptEvaluation` (line 219) as four independent operations with no transaction boundary. If the rubric check throws (lines 215-217) or the evaluator throws `EVALUATION_FAILED`, the inserted attempt row persists with `null` score/passed and inflates `attemptNumber` for subsequent attempts. AGENTS lists "Transaction boundary when appropriate" as a backend-function requirement.
- **Recommendation:** Wrap create+save in a transaction, or validate rubric approval *before* inserting the attempt (the rubric check on lines 210-217 currently runs after the insert on line 196).

### F-SALES-B05-008 — `saveAttemptEvaluation` accepts `rubricId` but never persists or uses it
- **Severity:** LOW
- **File:** `packages/domain/src/sales/mutations.ts:126-168` (param `rubricId` at line 131; passed at line 221)
- **Detail:** `input.rubricId` is required by the signature and supplied by `submitRoleplayAttempt`, but it is never written to the row (the attempts table has no `rubricId` column) nor used for any check. This is a dead parameter and an audit gap: the evaluation result does not record which rubric version (or its approval state) produced the score.
- **Recommendation:** Either drop the parameter or persist a `rubricId` (and rubric version) on the attempt for auditability of AI evaluations.

### F-SALES-B05-009 — `submitQuiz` does not verify lesson is approved/visible before grading
- **Severity:** LOW
- **File:** `packages/domain/src/sales/mutations.ts:233-284`
- **Detail:** Unlike `getLesson` (queries.ts:75-77), `submitQuiz` never checks `reviewStatus`. A rep could submit answers against a draft lesson's questions and have progress written. With zero questions it silently returns `score: 0, passed: false` (lines 250-254) and still upserts a `completed` progress row (lines 265-282), marking a contentless lesson complete.
- **Recommendation:** Load the lesson, enforce approval (reuse `CurriculumNotApprovedError`), and guard the empty-question case (avoid writing `completed` when no questions exist).

### F-SALES-B05-010 — `getModules` docstring claims "approved" filtering that neither exists nor is possible
- **Severity:** LOW
- **File:** `packages/domain/src/sales/queries.ts:16-28`
- **Detail:** Docstring says "Retrieves all **approved** sales modules" but the query has no filter (lines 24-27), and `sales_modules` has no `reviewStatus` column (db/src/schema/sales.ts:37-45). The JSDoc is inaccurate and misleads consumers about gating.
- **Recommendation:** Correct the docstring (modules are not approval-gated) or add module-level gating if intended.

### F-SALES-B05-011 — Free-form `console.error` logging in the evaluator fallback (AGENTS observability)
- **Severity:** LOW
- **File:** `packages/domain/src/sales/roleplay-evaluator.ts:179-188`
- **Detail:** The two-tier failure path uses `console.error` for operationally important AI-failure logging. AGENTS Observability says "Avoid free-form console logging in production code" and prefers structured logs with request/user/operation metadata. The `cause` attachment on the thrown `SalesError` (lines 189-193) is good; the loose console logging is the gap.
- **Recommendation:** Route through the project's structured logger with operation/user identifiers; keep the `cause` propagation.

### F-SALES-B05-012 — Repeated `as unknown as` double-casts defeat type safety around the DB context
- **Severity:** LOW
- **File:** `packages/domain/src/sales/mutations.ts:161, 195, 197, 220`
- **Detail:** `salesRawDb(db)` already returns a `DB`, yet the code re-wraps it as `rawDb as unknown as SalesDomainContext["db"]` (and `salesRawDb(db) as unknown as DB`). Double-casting through `unknown` silences the compiler and hides any genuine context-shape mismatch; if `SalesDomainContext.db` later diverges from `DB`, these casts will mask it.
- **Recommendation:** Pass the original `db` (or a properly-typed wrapper) instead of re-casting; narrow the context type so the cast is unnecessary.

### F-SALES-B05-013 — `attemptNumber` derivation has a concurrency race
- **Severity:** LOW
- **File:** `packages/domain/src/sales/mutations.ts:96-113`
- **Detail:** `attemptNumber = prior.length + 1` (line 105) is computed from a non-locking read. Two concurrent submissions for the same `(scenarioId, userId)` can both read N and both insert `N+1`. There is no unique constraint on `(scenarioId, userId, attemptNumber)` in `sales_roleplay_attempts` (db/src/schema/sales.ts:104-121) to catch it.
- **Recommendation:** Use a DB-side sequence/count within a transaction, or add a unique constraint and retry on conflict.

### F-SALES-B05-014 — `createRepAccount` passes the plaintext password through unchanged
- **Severity:** LOW (privacy/handling)
- **File:** `packages/domain/src/sales/mutations.ts:342-348`; `schema.ts:161-165`
- **Detail:** The function asserts the admin permission and returns `input` (including the plaintext `password`) for the route to hash and persist. This is documented (lines 334-337) and consistent with AGENTS' "auth adapter owns hashing," but it means a plaintext secret traverses the domain return value. Risk depends on whether callers log return values.
- **Recommendation:** Consider returning a sanitized object (omit `password`) or having the function delegate to the auth adapter directly so the secret never round-trips through a returned value.

### F-SALES-B05-015 — `markTheoryLessonComplete` is reused for roleplay completion without recording a score
- **Severity:** LOW
- **File:** `packages/domain/src/sales/mutations.ts:37-71` (called from `saveAttemptEvaluation` line 160-163)
- **Detail:** A passed roleplay marks the lesson complete via `markTheoryLessonComplete`, which sets `status: "completed"` but no `score` (lines 56, 64-68). The function name ("Theory") is misleading for roleplay completion, and roleplay pass results don't propagate a score into `sales_progress` (unlike quizzes, which do — line 270/279).
- **Recommendation:** Rename to a neutral `markLessonComplete` and optionally record the roleplay `overallScore` on the progress row for reporting parity.

### F-SALES-B05-016 — `submitRoleplayAttempt` re-queries scenario/rubric already implied by `createRoleplayAttempt`
- **Severity:** LOW
- **File:** `packages/domain/src/sales/mutations.ts:196-217`
- **Detail:** `createRoleplayAttempt` fetches the scenario (lines 90-95) and `submitRoleplayAttempt` fetches it again (lines 204-209) plus the rubric. Minor redundant round-trips; not incorrect but wasteful on the hot submit path.
- **Recommendation:** Have `createRoleplayAttempt` return the scenario, or fetch scenario+rubric once before insert (which also helps F-SALES-B05-007).

### F-SALES-B05-017 — Mutation layer has no unit tests; only FR-4/5/6 query/evaluator/permission paths are covered
- **Severity:** MEDIUM (test quality)
- **File:** `packages/domain/src/sales/__tests__/*` vs `mutations.ts`
- **Detail:** The batch's two test files cover excerpt derivation + `getRoleplayEvaluationContext` wiring (excerpt-derivation.test.ts) and permission-registration + evaluator error-cause propagation (permissions-and-evaluator.test.ts). There are **no tests** for any mutation: `createRoleplayAttempt`, `saveAttemptEvaluation`, `submitRoleplayAttempt`, `submitQuiz`, `saveChatMessage`, `approveCurriculumContent`, `createRepAccount`. Consequently the authorization gap in F-SALES-B05-001, the draft-leak in F-SALES-B05-003, and the quiz-grading/threshold logic are entirely unverified. AGENTS: "Write tests for all new backend code."
- **Recommendation:** Add mock-DB unit tests (per `packages/domain/src/__tests__/mock-db.ts`) for the mutations, especially ownership scoping, the 70% pass threshold, draft gating, and the null-`audioStorageKey` path.

### F-SALES-B05-018 — Evaluator tests cover only the double-failure path; success and fallback-success paths are untested
- **Severity:** LOW (test quality)
- **File:** `packages/domain/src/sales/__tests__/permissions-and-evaluator.test.ts:50-104`
- **Detail:** Only the "both paths reject" branch is exercised (good for FR-5). The primary multimodal success path (roleplay-evaluator.ts:143-149) and the fallback STT→eval success path — including the `transcriptExcerpt` back-fill at lines 169-172 — have no coverage.
- **Recommendation:** Add tests asserting (a) primary success returns the model object, and (b) fallback success populates `transcriptExcerpt` from the transcript when the eval model omits it.

---

## Positive Observations (INFO)

- **F-SALES-B05-019 (INFO):** Provider-neutrality is respected — `roleplay-evaluator.ts:15-34` defines a structural `AIClientLike` interface instead of importing `@reading-advantage/ai`, matching the AGENTS adapter rule. Models are env-overridable (lines 133-140) with sane defaults.
- **F-SALES-B05-020 (INFO):** FR-6 single-source-of-truth permissions (`permissions.ts:11-31`) and FR-5 error-cause propagation (`roleplay-evaluator.ts:189-193`) are well-implemented and pinned by tests. `errors.ts` provides a clean, coded `SalesError` hierarchy.
- **F-SALES-B05-021 (INFO):** Storage-adapter boundary is correctly kept out of the domain — mutations accept an opaque `audioStorageKey` and never call a storage SDK; browser audio capture/upload is handled at the route/UI layer (not in this batch). The documented nullable-key contract for failed uploads is a reasonable resilience design (modulo F-SALES-B05-006).
- **F-SALES-B05-022 (INFO):** `salesRawDb` (contracts.ts:39-43) uses the AGENTS-sanctioned `unscoped()` escape hatch with a greppable reason string, correctly reflecting that `sales_*` tables are REFERENTIAL. Note this is the mechanism that makes F-SALES-B05-001/002 possible, so owner-FK scoping must be enforced manually in those functions.

---

## Limitations

- This review covered **only** the 10 files in `/tmp/opencode/sales-batch-05`. The tRPC routers, Next.js route handlers, server actions, browser MediaRecorder/upload code, the storage adapter implementation, the AI client (`generateObjectFromMedia`/`transcribeAudio`) implementation, and any seed/migration data are **out of scope** and were not reviewed here. Findings about excerpt wiring, storage-key handling, and chat authorization assume the route layer behaves as the docstrings claim; that assumption was not verified against the actual routes.
- Authorization findings (F-SALES-B05-001/002) are based on static reading plus the schema; I did not execute an integration test proving cross-user/cross-tenant access. The conclusion follows from the absence of `userId`/`schoolId` predicates combined with `unscoped()` access.
- `assertCan` semantics in `@reading-advantage/auth` were taken at face value (resolves role→permission); its internals were not part of this batch.
- Test execution used the repo's vitest config; the `DATABASE_URL is not set` warning indicates the mock-DB path was used (expected for unit tests). No real Postgres was exercised.
- This document is a line-review report only. It makes **no acceptance or closeout claim** for the batch or the track; those gates are the responsibility of the acceptance/closeout phases.
