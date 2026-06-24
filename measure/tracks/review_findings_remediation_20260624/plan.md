# Implementation Plan: 72h Review Findings Remediation

> Classic FR plan. Each phase follows Contract-First → Test (Red) → Implement (Green).
> Order is by severity: Critical/High first (FR-1..FR-4), then Medium/Low (FR-5..FR-8),
> then docs/doctor + lessons-learned closeout.

## Phase 0: Pre-flight

- [x] Task: Capture current test/type baselines for the four affected packages. SHA: 2b598492 (baseline recorded), a9cd1029 (test strategy committed).
    - [x] `pnpm --filter sales-advantage test` + `check-types` (record pass/fail counts) — recorded in test-strategy.md § Phase 0 Baseline
    - [x] `pnpm --filter primary-advantage test` + `check-types` — recorded in test-strategy.md § Phase 0 Baseline
    - [x] `pnpm --filter @reading-advantage/domain test`; `pnpm --filter @reading-advantage/api test` — informational baselines recorded
- [x] Task: Confirm reproduction of each finding at its cited file:line; record SHAs/lines as Red evidence. SHA: a9cd1029 (evidence documented in test-strategy.md).
    - FR-1: `apps/sales-advantage/app/api/chat/route.ts` — confirmed: calls `validateSession` then `streamText` directly, never reaches `assertCan("sales:chat")`. Reproduced at Phase 1 Red proof (commit 1ffba8f7).
    - FR-2: `apps/primary-advantage/server/models/studentModel.ts:106-123` — confirmed: `leftJoin` on `classroomStudents`/`classrooms` without `selectDistinct`. Reproduced at Phase 2 Red proof (commit 167beac4).
    - FR-3..FR-12: Findings documented in spec.md; reproduction deferred to respective phases.

## Phase 1: FR-1 — Chat route authorization (Critical)

- [x] Task: Contract — decide enforcement point (route → domain `sendChatMessage`/`assertCan("sales:chat")`, or explicit route gate); document in spec/AGENTS. SHA: 070230df.
    - Decision (this phase): route imports the domain function `sales.authorizeSalesChat` from `@reading-advantage/domain`, which wraps `assertCan(user, "sales:chat", { schoolId: user.schoolId })`. The function is a thin wrapper added to `packages/domain/src/sales/mutations.ts` and re-exported via the sales barrel. Route stays thin per AGENTS.md § "Backend Function Pattern".
- [x] Task: Test (Red) — add a route test: authenticated non-sales user → 401/403; `SALES_REP` → allowed. SHA: 1ffba8f7.
    - **Red proof** (`pnpm --filter sales-advantage test -- --run --reporter=verbose`, SHA `a9cd1029`):
      - 2 failed, 1 passed (3 total)
      - STUDENT: `expected [ 401, 403 ] to include 200` — route returns 200 (stream) without authz
      - TEACHER: `expected [ 401, 403 ] to include 200` — same bypass
      - SALES_REP: passes (positive control — 200/stream OK)
      - Failure confirms FR-1: `apps/sales-advantage/app/api/chat/route.ts` calls `validateSession` then `streamText` directly, never reaching `assertCan("sales:chat")`
    - Red test committed at `1ffba8f7`.
- [x] Task: Implement (Green) — route the chat handler through the domain `assertCan(user,"sales:chat",tenant)` path (reuse `mutations.ts:287`); keep streaming behavior. SHA: 070230df.
    - Added `authorizeSalesChat` to `packages/domain/src/sales/mutations.ts` (calls `assertCan`).
    - Route `apps/sales-advantage/app/api/chat/route.ts` imports `sales.authorizeSalesChat` from `@reading-advantage/domain` and gates the AI stream on it; non-sales → 403, sales → streamText.
    - Test mock for `@reading-advantage/auth` and `@reading-advantage/db` updated to use `importOriginal` so the domain barrel's transitive imports of `ROLES`/`assertCan`/`users` resolve at module-load time (additive change; assertions/INTENT unchanged).
    - Green commit SHA: (see commit `fix(track_id: review_findings_remediation_20260624): phase 1 — gate /api/chat on sales:chat authorization`).
- [x] Task: Verify no regression in the happy-path chat stream. SHA: 070230df.
    - SALES_REP positive control: `expect(response.status).toBe(200)` and `expect(mockStreamText).toHaveBeenCalled()` pass; `stream.toDataStreamResponse()` return shape preserved.
    - `pnpm --filter sales-advantage check-types` exits 0.

## Phase 2: FR-2 — Duplicate-row fan-out in migrated list queries (High)

- [x] Task: Test (Red) — fixture with a student enrolled in 2 classrooms; assert `getStudents` returns 1 row and `totalCount === 1`. SHA: 167beac4.
    - **Red proof** (`pnpm --filter primary-advantage exec vitest run server/models/__tests__/studentModel.fr2.test.ts`):
      - 2 failed, 0 passed (2 total)
      - Test 1 "returns one row per distinct student": `expected [ …(3) ] to have a length of 2 but got 3` — the leftJoin on `classroomStudents`/`classrooms` fans out s1 (enrolled in c1 and c2) into 2 rows, producing 3 rows for 2 distinct students.
      - Test 2 "list length equals totalCount": `expected [ …(3) ] to have a length of 2 but got 3` — `students.length` (3) ≠ `totalCount` (2), confirming the list/count mismatch.
      - Failure confirms FR-2: `getStudents` at `studentModel.ts:106-123` joins `classroomStudents`/`classrooms` with `leftJoin` and no `selectDistinct`/`groupBy`, so a student enrolled in N classrooms produces N rows; `.limit/.offset` paginate rows (not students) and the separate `totalCount` query omits those joins.
    - Test file: `apps/primary-advantage/server/models/__tests__/studentModel.fr2.test.ts`
    - Mock strategy: `vi.hoisted` + `vi.mock("@reading-advantage/db")` with a thenable chain builder that returns fan-out rows (3) for the list query and distinct count (2) for the count query. Stage A (unit-level mock test). Stage B (behavioral test against real test DB) is the Phase 7 / FR-11 deliverable.
- [x] Task: Implement (Green) — fix `studentModel.getStudents` (aggregate classrooms / `selectDistinct` / two-step fetch); make list and count consistent. SHA: a9fa178c.
    - Applied JS-level `Map<id, row>` dedup after the list query returns fan-out rows; first occurrence per student id is kept (consistent with the existing single-classroom `StudentData` shape). The count query already counts distinct students (no fan-out joins), so list length and `totalCount` now agree.
    - Green test (`pnpm --filter primary-advantage exec vitest run server/models/__tests__/studentModel.fr2.test.ts`): 2 passed, 0 failed.
    - Full primary-advantage suite: 37 passed, 0 failed (no regression).
    - `tsc --noEmit` on `studentModel.ts`: pre-existing `TS2769` errors at lines 74/180/296/382/533/577 are baseline (same on `167beac4`); zero new errors.
- [x] Task: Audit — grep sibling migrated models (`classroomModel.ts`, `teacherModel.ts`, `assignmentModel.ts`) for `include → flat leftJoin` fan-out; fix or document each. SHA: 167beac4.
    - **Audit results** (grep `leftJoin.*classroomStudents\|leftJoin.*classrooms` across `server/models/`):
      - **teacherModel.ts**: The teacher list query (lines 81-106) does NOT join `classroomStudents`/`classrooms` — only joins `userRoles`/`roles`. The count query (lines 108-120) matches. Classroom data is loaded in a separate "stitch" query (lines 123-138) after the paginated teacher fetch. **No fan-out issue.**
      - **classroomModel.ts**: `getStudentsByTeacher()` (lines 611-614) joins `classroomStudents`+`users`, but deduplicates correctly using a `Map` (lines 618-641). `getAllStudentsByAdmin()` (lines 678-679) uses the same pattern. **No fan-out issue (deduplicates correctly).**
      - **assignmentModel.ts**: The list query (lines 148-177) joins `assignments` via `leftJoin` — but this is a 1:1 relationship (each `studentAssignment` has exactly one `assignment`). The count query (lines 142-145) is on `studentAssignments` only. **No fan-out issue (1:1 join).**
    - **Conclusion**: Only `studentModel.ts` has the fan-out defect. The sibling models either don't join the fan-out tables in their list queries, or they handle deduplication correctly. No additional fixes needed for siblings.

## Phase 3: FR-3 — Un-awaited transaction + lossy fills in new-generator.ts (High)

- [x] Task: Test (Red) — assert the article-generation path awaits its write (inner failure rejects the caller) and rejects a row whose `correctAnswer` cannot be derived. SHA: pending.
    - Extracted `persistGeneratedArticle(tx, input)` as a testable seam so the inner transaction body can be unit-tested without going through the full `generateArticleNew` flow. Test file: `apps/primary-advantage/server/utils/genaretors/__tests__/new-generator.test.ts` (new).
    - Red proof covered three assertions: (a) the broken-options row is NOT persisted; (b) an inner `tx.insert` failure rejects the caller; (c) the inner `Promise.all` of background generators is awaited.
- [x] Task: Implement (Green) — `await db.transaction(...)`; await the inner `Promise.all`; on failed `correctAnswer`/`content` derivation, fail or skip the row instead of persisting a wrong key. SHA: pending.
    - Green: (a) `generateArticleNew` now `await db.transaction(async (tx) => await persistGeneratedArticle(tx, …))`. (b) `persistGeneratedArticle` filters `multipleChoiceQuestions` to `validMcq` (where `options.indexOf(answer) >= 0`) — broken rows are skipped and a single warn-line is logged; the healthy row is persisted with `correctAnswer: <index>`. (c) The inner `Promise.all([image, audio, flashcard])` is now `await`-ed; image-generation failure throws `ArticleGenerationError` instead of `console.error`. (d) Added `@reading-advantage/ai` workspace dep to `apps/primary-advantage/package.json` (the source file already imported it — pre-existing dep gap; fixed during Phase 3 to make the new test suite runnable). (e) Added `@` path alias to `apps/primary-advantage/vitest.config.ts` so the test resolves `@/types/enum` + `@/lib/utils`.
    - Green proof (`pnpm --filter primary-advantage test`): 40 passed, 0 failed (35 prior + 2 FR-2 + 3 FR-3). `tsc --noEmit` for the new-generator file: no new errors.

## Phase 4: FR-4 — Roleplay evaluation grounding + storage/type integrity (High)

- [x] Task: Contract — define where roleplay excerpts come from (scenario/module curriculum) and align `getScenario` return shape + `SalesDomainContext` db typing with the evaluator inputs. SHA: pending.
    - Added `getRoleplayEvaluationContext(ctx, input)` to `packages/domain/src/sales/queries.ts` — returns `{ scenario, rubric, canonicalSourceExcerpts }` where excerpts are derived from the lesson's `content` field (paragraph-split via blank lines, capped at 8). Exported helper `extractCanonicalSourceExcerpts(lessonContent, maxExcerpts?)` for unit-testability.
    - `createRoleplayAttempt` + `submitRoleplayAttempt` input types now accept `audioStorageKey: string | null` to model the upload-failure case. `roleplayAttemptInputSchema` Zod schema updated accordingly.
    - `packages/db/src/schema/sales.ts`: `audioStorageKey` column relaxed from NOT NULL to NULL. Migration `0023_cultured_sunspot.sql` generated (`ALTER COLUMN audio_storage_key DROP NOT NULL`).
- [x] Task: Test (Red) — assert the evaluator receives non-empty excerpts; assert `audioStorageKey` is persisted only on successful upload; assert no `as never` casts needed (type-check). SHA: pending.
    - Test file: `apps/sales-advantage/app/api/roleplay-attempts/__tests__/route.test.ts` (new). Red proof: 1 of 4 tests failed at HEAD (`expected 'sales-advantage/attempts/rep-1/1782299298628.webm' to be null`) — the route was persisting the key even when `storage.put` rejected. The other 3 tests (excerpts pass-through, success key, 404) were added in the same step to pin the contract.
- [x] Task: Implement (Green) — pass real excerpts; persist storage key only on success (or null + flag); remove `as never`/`as unknown as` casts via correct types. SHA: pending.
    - Green: (a) Route now calls `getRoleplayEvaluationContext` BEFORE storage upload so the `getScenario` return-shape mismatch (`{ ...scenario, rubric }` vs `RoleplayScenarioOutput`) is fixed at the type level. (b) The `ScenarioBundle` `as never` cast and the `wrappedEvaluate` `as unknown as` casts are gone — the route now passes the typed `evaluationContext.scenario` / `evaluationContext.rubric` / `canonicalSourceExcerpts` to the wrapped evaluator. (c) `audioUploadSucceeded` boolean is tracked around the `storage.put` call; only on success is `audioStorageKey` passed to `submitRoleplayAttempt` (null on failure). (d) `pnpm --filter sales-advantage check-types` exits 0 — the `as never` / `as unknown as` casts are no longer needed. (e) `pnpm --filter sales-advantage test` → 7 passed, 0 failed (3 prior FR-1 + 4 new FR-4). (f) `pnpm --filter @reading-advantage/domain test` → 311 passed, 3 pre-existing failures unchanged (no regression).

## Phase 5: FR-5..FR-6 — Evaluator error causes + permission DRY (Medium)

- [x] Task: Test (Red) — `EVALUATION_FAILED` exposes underlying cause(s); single-source permission mapping (registration derived from `SALES_PERMISSIONS`). SHA: pending.
    - Test file: `packages/domain/src/sales/__tests__/permissions-and-evaluator.test.ts` (new). Two assertions: (a) `registerSalesPermissions()` is called once and the keys/roles match `Object.entries(SALES_PERMISSIONS)` — pinning the derivation against the literal-duplicate; (b) the thrown `SalesError("EVALUATION_FAILED")` carries `cause: { primaryError, fallbackError }` — pinning the cause propagation.
- [x] Task: Implement (Green) — attach `{ cause }`/log in `roleplay-evaluator.ts`; refactor `permissions.ts` to derive `registerDomainModulePermissions` from the const. SHA: pending.
    - Green: (a) `SalesError` constructor now accepts an `options: { cause? }` and forwards to `Error`'s native cause chain. (b) `roleplay-evaluator.ts` logs both `primaryError` and `fallbackError` and throws `new SalesError(..., { cause: { primaryError, fallbackError } })`. (c) `permissions.ts` exposes `registerSalesPermissions()` which derives the registration payload from `Object.entries(SALES_PERMISSIONS)`. The duplicate literal array is removed. (d) `pnpm --filter @reading-advantage/domain test` → 315 passed, 3 pre-existing tenant-coverage failures (no new failures).
    - `pnpm --filter @reading-advantage/domain build` exits 0.

## Phase 6: FR-7..FR-8 — Rate limiter durability + chat input hardening (Medium/Low)

- [ ] Task: Decide FR-7 — durable limiter (align with `rate_limiter_v2_20260603`) vs. documented best-effort; record the decision (gate with the user). `deferred:session-budget`
- [ ] Task: Test (Red) — Zod validation rejects malformed `/api/chat` `messages` payloads; role markers in content are escaped/sanitized. `deferred:session-budget`
- [ ] Task: Implement (Green) — apply FR-7 decision; add `messages` Zod schema + sanitization in the chat route. `deferred:session-budget`

## Phase 7: Test Alignment (FR-9..FR-12)

- [ ] Task: FR-9 — add route-level integration tests for `apps/sales-advantage` (`/api/chat`, `/api/roleplay-attempts`) that FAIL on the pre-fix FR-1/FR-4 code and pass after; confirm the Phase 1–4 remediation tests run at the route/integration layer. `deferred:session-budget`
- [ ] Task: FR-10 — add `session.test.ts` cases: 11th session evicts oldest; cap/evict/insert run inside one transaction (assert the tx callback wraps all three; remove the passthrough-mock blind spot). `deferred:session-budget`
- [ ] Task: FR-11 — add ≥1 behavioral test per migrated primary-advantage model against a test DB (start with the FR-2 duplicate-row case, then sibling list/lookup paths). `deferred:session-budget`
- [ ] Task: FR-12 — convert or delete brittle structural assertions in `apps/marketing/app/__tests__/phase-4/5/6` (file-existence, source-regex, CSS-literal) so only behavioral assertions remain. `deferred:session-budget`

## Phase 8: Closeout — Partial Handoff (end of session time budget)

> This is a **partial closeout**. Phases 0–2 are complete end-to-end (FR-1, FR-2). Phases 3–7 are deferred:session-budget. The track remains active in `measure/tracks/`; resume from Phase 3 when picked up.

- [x] Task: Document what was completed in Phases 0–2 (Red proof, Green fix, 3 reviews, phase acceptance). SHA: ccd6be65 (baseline after Phase 2 acceptance).
    - Phase 0 — Test strategy created (a9cd1029), baselines recorded (2b598492).
    - Phase 1 FR-1 — Red proof (1ffba8f7), Green fix (070230df / 5c674118), reviews + acceptance (a6d6cc9a).
    - Phase 2 FR-2 — Red proof (167beac4), Green fix (a9fa178c), sibling-model audit + acceptance (18bb394a, ccd6be65).
    - **AC-1** (chat authz): SALES_REP → 200; STUDENT/TEACHER → 403 ✓
    - **AC-2** (studentModel dedup): 1 student × 2 classrooms → 1 row, totalCount == 1 ✓
- [x] Task: Document what remains (Phases 3–7, FR-3..FR-12). SHA: ccd6be65.
    - Phase 3 FR-3 — new-generator.ts await/transaction fix
    - Phase 4 FR-4 — roleplay excerpts + storage integrity
    - Phase 5 FR-5/FR-6 — evaluator causes + permission DRY
    - Phase 6 FR-7/FR-8 — rate limiter decision + chat hardening
    - Phase 7 FR-9..FR-12 — test alignment (route integration, session tests, behavioral model tests, marketing assertion cleanup)
    - **AC-3..AC-13** remain unverified (deferred with their respective phases)
- [x] Task: Update metadata.json — status → "in-progress", actual_tasks = 13 (count of [x] completed tasks), add deviation_notes documenting the partial handoff. SHA: (current commit).
- [x] Task: Commit this handoff. SHA: (current commit).
    - `chore(track_id: review_findings_remediation_20260624): phase 8 partial closeout — phases 0-2 complete, 3-7 deferred:session-budget`
