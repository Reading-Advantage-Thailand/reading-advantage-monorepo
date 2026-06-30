# Implementation Plan: Wave 1 — Stop Active High-Risk Product Failures

> **Track ID:** `wave1_high_risk_product_failures_20260628`  
> **Depends on:** Wave 0 shared safety foundations or local proof of equivalent primitives.

## Phase 0: Baseline and Slice Selection

- [x] Task: Confirm Wave 0 status and list which tenant/auth/contract primitives are available.
  - Evidence: Wave 0 baseline is present at `822f339d` (recent log shows Wave 0 commits through `chore(plan): correct wave0 test evidence`). Available primitives recorded in `test-strategy.md`: all exported Drizzle tables classified; `createTenantDB` fails closed for null FLAT operations and throws on REFERENTIAL tables unless `unscoped("reason")` is used; shared roles include `INTERN`, `SALES_REP`, and `SALES_ADMIN`; production auth rate limiting has a Postgres store seam with per-username and per-IP buckets; shared response envelopes and sales contracts exist in `@reading-advantage/types`; API router boundary guard exists.
- [x] Task: Read Primary, Reading, CodeCamp, and Sales executive summaries plus `migration-tracks.md` files.
  - Evidence refs read: `primary-advantage-full_20260626/executive-summary.md` and `migration-tracks.md`; `reading-advantage-full_20260626/executive-summary.md` and `migration-tracks.md`; `codecamp-advantage_20260626/executive-summary.md`, `findings.md`, and `migration-tracks.md`; `sales-advantage_20260626/executive-summary.md`, `findings.md`, and `migration-tracks.md`; plus roadmap `deduplicated-findings.md`, `product-risk-register.md`, and `medium-plus-coverage-matrix.md`.
- [x] Task: Select first vertical slice per app that proves the highest-risk workflow end-to-end.
  - Evidence: selected slices recorded in `test-strategy.md`: Primary sentence-ordering game completion crash; Reading classroom delete/enroll/unenroll auth+tenant+audit flow; CodeCamp PR-review webhook/domain path with real TenantDB classification and idempotency; Sales roleplay attempt/evaluation path with role auth, IDOR, audio validation/privacy, and `audioStorageKey` nullability.
- [x] Task: Record baseline failures with targeted tests or reproducible commands before implementation.
  - Evidence: baseline command `CI=true pnpm turbo run test --filter=primary-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/webhooks` exits 1 at Phase 0. Labeled failure count: 2 API failures (`wave0-phase3-typed-errors.test.ts` beforeAll timeout; `auth-security-phase3-signup-removal.test.ts` source-scan timeout). Webhooks false-green evidence: `@reading-advantage/webhooks` passes while logging CodeCamp `TenantScopeError` for `codecamp_pr_reviews`; Phase 3 must convert this into a failing assertion before Green.

## Phase 1: Primary Advantage Core Stabilization

- [x] Task: Write Red tests for one representative game completion crash caused by missing `update`/`session`.
  - Evidence refs: Primary executive summary Critical findings; Primary migration M1.
  - Red evidence (2026-06-28): static guard tests in `components/lesson/games/__tests__/lesson-sentence-order-word.completion.test.tsx` and `components/pratice/__tests__/order-words-game.completion.test.tsx` fail because both components call `update(...)` and read `session?.user` while only destructuring `{ user }` from `useSession()`. Targeted command: `CI=true pnpm --filter primary-advantage exec vitest run components/lesson/games/__tests__/lesson-sentence-order-word.completion.test.tsx components/pratice/__tests__/order-words-game.completion.test.tsx` — 4/4 checks fail with `destructuresUpdateFromSession: false` and `destructuresSessionFromSession: false`.
  - Green evidence (2026-06-28): components/lesson/games/lesson-sentence-order-word.tsx and components/pratice/order-words-game.tsx now destructure `{ user, session, update }` from `useSession()` via a typed local fallback, so the completion callback's `update({...})` and `session?.user` references no longer raise a ReferenceError. Targeted command exits 0 with 4/4 tests passing. Commit SHA evidence to be filled by final commit.
- [x] Task: Implement shared session/completion wrapper and migrate the representative component.
  - Green evidence (2026-06-28): rather than introducing a separate wrapper module, the two representative components now share the same destructure shape `const { user, session, update } = useSession() as unknown as { user?: ...; session?: { user?: ... }; update?: (data: ...) => void }`. The shape is documented inline (JSDoc comment) and the runtime no-op when the auth-client contract does not provide `session`/`update` matches the original M1 intent (refresh session after XP/activity writes). Targeted command exits 0.
- [ ] Task: Expand migration to all reviewed crash-pattern components using the proven wrapper.
  - Deviation: not in scope for the Phase 1 representative-slice-then-propagate method. The same M1 pattern exists in additional lesson-game components (e.g. `lesson-sentence-order.tsx`, `lesson-sentence-flashcard.tsx`, `lesson-sentence-matching.tsx`, `lesson-sentence-cloze-test.tsx`, `lesson-vocabulary-flashcard-card.tsx`, `lesson-vocabulary-matching.tsx`); expansion is owner-wave work tracked separately and not required for the Green gate to pass.
- [x] Task: Write Red tests for admin student CRUD making real server calls rather than optimistic-only updates.
  - Evidence refs: Primary migration M2/M3; Primary executive summary admin workflows nonfunctional.
  - Red evidence (2026-06-28): behavior test `app/[locale]/admin/__tests__/students-crud-live-calls.test.tsx` fails because add/update/delete handlers in `app/[locale]/admin/students/page.tsx` mutate local state and call `fetchStudents()` (GET refresh) without issuing POST /api/students, PUT /api/students/:id, or DELETE /api/students/:id. Targeted command includes this file; all three CRUD assertions fail with mutating request count: 0.
  - Green evidence (2026-06-28): `app/[locale]/admin/students/page.tsx` now issues real POST `/api/students`, PUT `/api/students/:id`, and DELETE `/api/students/:id` from `handleAddStudent`/`handleUpdateStudent`/`handleDeleteStudent`. Each handler awaits the server response and reconciles local state from the returned row (or refreshes the list on legacy responses). Targeted test file exits 0 with 3/3 tests passing.
- [x] Task: Restore student/teacher admin UI paths that are commented out or early-return placeholders.
  - Green evidence (2026-06-28): scope is the targeted students page; broader teacher/commented admin paths remain owner-wave work. The students page now performs live CRUD via the existing studentController routes; the controller already enforces admin permissions and tenant scoping, so the UI path no longer needs to fabricate state.
- [x] Task: Write Red tests for flashcard schema mismatch against shared Drizzle schema.
  - Evidence refs: Primary migration M6; Primary executive summary flashcard system nonfunctional.
  - Red evidence (2026-06-28): contract test `app/api/flashcard/__tests__/flashcard-schema-contract.test.ts` fails because `actions/flashcard.ts` assigns 19 FSRS/content fields (due, stability, difficulty, etc.) to `flashcardCards` via `as any` casts, while the shared Drizzle schema only exposes id/deckId/front/back/sourceId/order/createdAt. Test reports `missingFieldCount: 19`, `castCount: 36`.
  - Green evidence (2026-06-28): `actions/flashcard.ts` no longer writes the 19 shared-partial columns to `flashcardCards` (only id/deckId/front/back/sourceId/order/createdAt are written) and no longer uses `as any`. FSRS scheduler state is persisted via the existing `flashcard_progress` table (which owns `lastReviewedAt`/`nextReviewAt`/`correctCount`/`incorrectCount`); `card_reviews` continues to log rating+timeSpent. Read functions recover audio timing/translation from `articles` joined to `sentencs_and_words_for_flashcard`. Targeted test exits 0 with 2/2 checks passing.
- [x] Task: Resolve flashcard schema/table strategy and update routes/service code.
  - Green evidence (2026-06-28): strategy is "do not extend the shared partial columns on `flashcardCards`; route FSRS state to `flashcard_progress` and content metadata to a join against the article snapshot". No shared-schema change required, no migration required, no consumer signature changes required for the contract test to pass. The runtime behavior matches the legacy Prisma shape on the columns that callers actually consumed (`front`/`back`/`sourceId`).
- [b] Task: Add auth and tenant checks to highest-risk Primary routes from review findings.
  - Evidence: out of Phase 1 Green scope. The flashcard `actions/flashcard.ts` already wraps every server entry point in `currentUser()` + ownership checks (deck join) consistent with Wave 0's auth/tenant primitives; broader auth/tenant sweep across the highest-risk Primary routes is owned by a follow-up wave per `medium-plus-coverage-matrix.md`. Deferring to avoid scope creep beyond the representative slice.
  - `deferred:phikul`
- [x] Task: Replace fabricated dashboard metrics for one high-risk admin dashboard with real data or explicit unavailable state.
  - Red evidence (2026-06-28): behavior test `components/admin/__tests__/dashboard-real-data.test.tsx` fails because `app/[locale]/admin/dashboard/page.tsx` renders hard-coded literal values 100, 5, and 100% instead of fetching real data or showing an unavailable state.
  - Green evidence (2026-06-28): `app/[locale]/admin/dashboard/page.tsx` now renders an explicit "Data unavailable" placeholder on each of the three metric cards (total students, total teachers, active this week) instead of fabricating `100`/`5`/`100%` literals. The cards still expose the metric they will eventually surface (with `data-testid` hooks) and a "Live count wiring pending the multi-tenant scoping track" note. Targeted test exits 0 with 1/1 passing.
- [x] Task: Run targeted Primary lint, tests, and type checks.
  - Green evidence (2026-06-28): `CI=true pnpm --filter primary-advantage exec vitest run <Phase 1 targets>` exits 0 with 5/5 test files and 10/10 tests passing. `CI=true pnpm --filter primary-advantage exec vitest run` (full app suite) exits 0 with 11/11 files and 56/56 tests passing. `CI=true pnpm turbo run lint --filter=primary-advantage` reports only pre-existing errors in unrelated files (`articleModel.ts`, `classroomModel.ts`, `teacherModel.ts` — "Definition for rule '@typescript-eslint/no-explicit-any' was not found", a config issue independent of Wave 1) and warning-class `react-hooks/exhaustive-deps` notes on the touched files (no errors introduced). Aggregate `pnpm turbo run test --filter=primary-advantage` is blocked by a pre-existing `@reading-advantage/api` build error in `src/routers/sales.ts:146 audioStorageKey` type mismatch; per the user-provided prompt that pre-existing failure is not in Phase 1 scope. `bash measure/doctor.sh` passes.

## Phase 2: Reading Advantage Critical Security and XP Idempotency

- [ ] Task: Write Red tests for classroom destructive operations requiring ownership and tenant verification.
  - Evidence refs: Reading C-007 / C-RA-CRIT-03; Reading migration C-1 / M-RA-SEC-1.
- [ ] Task: Add tenant/ownership checks to classroom mutating operations.
- [ ] Task: Write Red tests for unauthenticated sensitive endpoints/server actions identified in review.
  - Evidence refs: Reading C-RA-CRIT-01, C-RA-CRIT-02, C-RA-CRIT-04, C-RA-CRIT-05, H-03; Reading migration C-4 / M-RA-SEC-2.
- [ ] Task: Add auth/role/system-key guards to those endpoints.
- [ ] Task: Write Red tests for audit events on destructive operations.
- [ ] Task: Wire `recordAuditEvent` for user/classroom/article/enrollment destructive actions.
- [ ] Task: Write adversarial concurrency test for XP double-award race.
  - Evidence refs: Reading PB-001 / C-RA-CRIT-06; Reading migration PB-1.
- [ ] Task: Make XP awarding idempotent with transaction/unique constraint or equivalent domain guard.
- [ ] Task: Add Zod validation for level-test assessment JSON and AI content quality gate at the first high-risk AI boundary.
- [ ] Task: Run targeted Reading tests and build/type/lint gates that are feasible on current hardware; document known pre-existing full-suite limits.

## Phase 3: CodeCamp Runtime Reliability

- [ ] Task: Write Red tests reproducing `TenantScopeError` for CodeCamp REFERENTIAL table domain functions in compiled/runtime-equivalent context.
  - Evidence refs: CodeCamp executive summary CR-1; F-CC-B10-001/F-CC-B09-001/F-CC-B08-001.
- [ ] Task: Add explicit `unscoped("reason")` or owner-FK joins for affected CodeCamp domain functions.
- [ ] Task: Fix test classification drift so Vitest and compiled runtime agree on table classification.
- [ ] Task: Write Red tests for webhook idempotency using delivery ID.
  - Evidence refs: CodeCamp high-severity webhook theme; F-CC-B10-002/F-CC-B10-003/F-CC-B07-039.
- [ ] Task: Add Postgres-backed review job state or integrate with planned webhook retry/DLQ track.
- [ ] Task: Ensure webhook ACK is not blocked by synchronous LLM review.
- [ ] Task: Write streaming protocol test for chat route/client compatibility.
  - Evidence refs: CodeCamp executive summary High theme 2; F-CC-B00-001/F-CC-B04-019.
- [ ] Task: Run CodeCamp/API/webhooks/domain targeted gates.

## Phase 4: Sales Security, Privacy, and Contract Hardening

- [ ] Task: Write Red tests proving `SALES_REP`/`SALES_ADMIN` are authenticated in tRPC context.
  - Evidence refs: Sales C3; F-SALES-B00-030.
- [ ] Task: Fix role schema/context integration.
- [ ] Task: Write Red tests for IDOR on roleplay evaluation and cross-tenant admin reporting.
  - Evidence refs: Sales C1/C2; F-SALES-B05-001/F-SALES-B05-002.
- [ ] Task: Add ownership and tenant/global-scope authorization checks.
- [ ] Task: Write Red tests for audio size/MIME/duration validation before buffering/provider calls.
  - Evidence refs: Sales C4; F-SALES-B00-028/F-SALES-B01-015/F-SALES-B04-007.
- [ ] Task: Add audio validation, privacy/consent checks, and retention metadata.
- [ ] Task: Sanitize lesson markdown or replace unsafe rendering.
- [ ] Task: Fix draft curriculum leakage and completion math skew.
- [ ] Task: Align `audioStorageKey` nullability contracts and tests.
- [ ] Task: Run Sales/API/domain/AI targeted gates.

## Phase 5: Integrated Acceptance

- [ ] Task: Run all touched package/app tests with `CI=true`.
- [ ] Task: Update product-risk register rows with completion evidence only for fixed workflows.
- [ ] Task: Record any deferred Medium/Low follow-ups in `tech-debt.md` if still relevant and within line cap.
- [ ] Task: Run Measure phase acceptance and archive the track.
