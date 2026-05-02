# Implementation Plan: Last-24-Hour Review Remediation

---

## Phase 1: Validation Baseline And Governance Repair

- [x] Task: Reproduce and document current validation failures
    - [x] Run `CI=true pnpm validate` and capture failing package/test/lint evidence
    - [x] Separate review-window regressions from known baseline debt
    - [x] Record the accepted baseline in this plan if full validation cannot be green
- [x] Task: Fix domain test lint/type violations
    - [x] Replace `any` casts with typed mock DB helpers or narrowed test types
    - [x] Remove unused imports and dead test scaffolding
    - [x] Run `pnpm turbo run lint --filter=@reading-advantage/domain`
- [x] Task: Repair Measure completion state
    - [x] Reopen or annotate tasks marked `[x] ... [deferred]` in affected plans
    - [x] Ensure track metadata/status reflects actual verified state
    - [x] Add explicit follow-up references to this remediation track where work remains
    - **Note:** Corrected `shared_backend_api_20260502`, `i18n_migration_20260502`, `shared_config_consolidation_20260502` counts. `tracks.md` updated.
- [x] Task: Finish i18n/config governance cleanup
    - [x] Remove remaining `next-international` dependency/config references or reopen the i18n migration track
    - [x] Replace reading-advantage stale `I18nProviderClient` usage with valid `NextIntlClientProvider` wiring
    - [x] Implement reading-advantage locale switching through the installed `next-intl` navigation API
    - [x] Restore or replace reading-advantage Tailwind animation plugin utilities under Tailwind v4
    - [x] Fix `www-reading-advantage` locale provider/layout contract and stale `transpilePackages`
    - [x] Make `scripts/config-drift.test.ts` runnable from root — moved to `packages/config/__tests__/config-drift.test.ts`, runs via `pnpm --filter @reading-advantage/config test`
    - [ ] Add config drift checks to `pnpm validate` and CI — **NOT done**
    - [x] Align CI branch triggers with the repository branch policy — updated `.github/workflows/ci.yml` to trigger on `master`
- [x] Task: Resolve dependency lockfile drift
    - [x] Confirm whether `pnpm-lock.yaml` changes match package dependency changes
    - [x] Keep and commit required lockfile changes or revert accidental drift
- [ ] Task: Measure - User Manual Verification 'Validation Baseline And Governance Repair' (Protocol in workflow.md) — **NOT done**

## Phase 2: Auth Migration Correctness

- [ ] Task: Write failing tests for Firebase-only existing-user login migration — **NOT done**
    - [ ] Cover user with `firebaseUid` and no local password
    - [ ] Cover invalid credentials and safe error messaging
    - [ ] Cover successful local password setup or documented migration exchange
- [ ] Task: Restore existing-user login/migration path — **NOT done**
    - [ ] Implement the smallest supported Firebase-to-tRPC bridge or restore a migration modal backed by tested API behavior
    - [ ] Preserve token issuance through `auth.login`/migration completion
    - [ ] Avoid reintroducing broad Firebase auth dependency outside the migration boundary
- [~] Task: Align reading-advantage login with server-consumed session state — **Partially done**
    - [x] reading-advantage `TRPCProvider` sends `Authorization: Bearer <token>` header via `httpBatchLink` reading from `localStorage`
    - [x] reading-advantage tRPC route handler passes `authorization` header into tRPC context
    - [ ] Decide whether NextAuth session providers remain during transition or are replaced by tRPC auth state — **open decision**
    - [ ] Ensure login followed by hard refresh keeps protected server pages authenticated — **not verified**
    - [ ] Await or remove legacy `getCurrentUser()` session plumbing as appropriate — **not done**
- [ ] Task: Write failing tests for auth token propagation — **NOT done**
    - [ ] Verify reading-advantage tRPC client sends `Authorization` when an access token exists
    - [ ] Verify `auth-client` session/logout calls use the correct endpoint and bearer token
- [x] Task: Fix tRPC/auth-client endpoint and bearer-token handling
    - [x] `AuthProvider` accepts configurable `trpcEndpoint` (defaults to `/api/trpc`)
    - [x] `AuthProvider` logout sends bearer token to server logout endpoint
    - [x] `AuthProvider` refreshSession sends bearer token to session endpoint
- [~] Task: Fix primary/science auth integration gaps — **Partially done**
    - [x] Add `@reading-advantage/auth-client` to primary package dependencies
    - [x] Replace changed primary auth `<a>` elements with locale-aware `Link`
    - [ ] Add or target a real tRPC endpoint for primary auth-client usage — **not done**
    - [ ] Normalize legacy primary role shapes or migrate comparisons to shared role values — **partially done** (shim exists but may be incomplete)
    - [ ] Remove science production password login UI or migrate it to shared tRPC auth — **not done**
- [ ] Task: Measure - User Manual Verification 'Auth Migration Correctness' (Protocol in workflow.md) — **NOT done**

## Phase 3: Backend Architecture And Tenant Safety

- [ ] Task: Write authorization regression tests for cross-tenant access — **NOT done**
    - [ ] Students cannot read other students' progress
    - [ ] `users.list`, `users.get`, and `users.update` cannot leak or mutate cross-school users
    - [ ] User API responses never include `password`, `firebaseUid`, or auth token/session fields
    - [ ] Teachers cannot list or mutate classes outside their school/roster
    - [ ] Assignment create/list/update/delete verifies classroom ownership
    - [ ] Report queries verify class/student membership
- [x] Task: Move router business logic into domain functions
    - [x] `packages/domain/src/assignments/index.ts` — create, list, get, update, delete, submit
    - [x] `packages/domain/src/progress/index.ts` — recordActivity, getStudentProgress, getLessonProgress, updateLessonProgress
    - [x] `packages/domain/src/articles/index.ts` — list, get, create, update
    - [x] Routers are thin wrappers: validate input, enforce auth, call domain, return result
- [x] Task: Add tenant and ownership guards to domain functions
    - [x] Assignment domain verifies `classroom.schoolId === tenant.schoolId` before reads/writes
    - [x] User updates scoped to self or admin
    - [x] `usersRouter` (`me`, `get`, `list`) selects only safe columns (excludes `password`, `firebaseUid`)
- [x] Task: Fix lesson progress persistence semantics
    - [x] Added `uniqueIndex("lesson_progress_user_lesson_unique")` on `(userId, lessonId)` in `packages/db/src/schema/progress.ts`
    - [x] `updateLessonProgress` uses `insert(...).onConflictDoUpdate(...)` targeting `[lessonProgress.userId, lessonProgress.lessonId]`
    - [ ] Align `lessonProgress.lessonId` with `lessons.id` or document it as an external identifier — **open question**
    - [ ] Add a repeat-update test that proves runtime-safe behavior — **not done**
- [x] Task: Add missing database integrity constraints
    - [x] `classroomStudents`: unique `(classroomId, studentId)` — `packages/db/src/schema/classrooms.ts`
    - [x] `studentAssignments`: unique `(assignmentId, studentId)` — `packages/db/src/schema/content.ts`
    - [x] `accounts`: unique `(provider, providerAccountId)` — `packages/db/src/schema/users.ts`
    - [x] `verificationTokens`: unique `(identifier, token)` — `packages/db/src/schema/users.ts`
    - [x] `studentAnswers`: unique `(userId, questionId, questionType)` — `packages/db/src/schema/questions.ts`
    - [ ] Add migration/schema tests for each constraint — **not done** (schema test exists but doesn't assert new constraints specifically)
- [x] Task: Replace stub modules with real exports or remove inactive router surface
    - [x] `packages/domain/src/assignments/index.ts` is real (was stubbed)
    - [x] `packages/domain/src/progress/index.ts` is real (was stubbed)
    - [x] `packages/domain/src/articles/index.ts` is new real module
    - [x] `packages/domain/src/index.ts` barrel updated with `./articles` export
    - [x] `packages/domain/package.json` updated with `./articles` export
- [x] Task: Fix package typecheck and export metadata
    - [x] API test context typing fixed in `trpc.test.ts`
    - [x] `mock-db.ts` uses explicit `MockDb` interface (no self-referential typing)
    - [x] `auth.test.ts` `any` types removed
    - [x] Domain layer has no `@trpc/server` dependency (uses standard `Error`)
    - [x] `check-types` passes for API and domain
- [ ] Task: Measure - User Manual Verification 'Backend Architecture And Tenant Safety' (Protocol in workflow.md) — **NOT done**

## Phase 4: Final Verification And Closure

- [x] Task: Run targeted package gates
    - [x] `pnpm turbo run lint --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/auth-client` — passes
    - [x] `pnpm turbo run test --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/auth-client` — passes
    - [x] `pnpm turbo run build --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/auth-client` — passes
    - [x] `pnpm turbo run build --filter=primary-advantage --filter=www-reading-advantage` — passes
    - [x] Also verified: `reading-advantage` builds successfully
- [~] Task: Run root validation
    - [x] `CI=true pnpm validate` was run
    - [ ] Document any remaining known baseline failures with file/track ownership — **partially done** in `tech-debt.md` but not in this plan
    - **Known baseline:** `primary-advantage` lint fails with 49 pre-existing ESLint errors (documented in `measure/tech-debt.md`). All other packages pass.
- [x] Task: Update lessons learned and tech debt if shortcuts remain
    - [x] `measure/tech-debt.md` updated — resolved items marked; pre-existing items retained
    - [x] `measure/lessons-learned.md` updated with architecture and build lessons
- [ ] Task: Measure - User Manual Verification 'Final Verification And Closure' (Protocol in workflow.md) — **NOT done**

---

## Total Estimated Tasks: 9
## Completed Tasks: 5
## Partially Completed Tasks: 3
## Not Started Tasks: 1

## Notes

- This track intentionally starts with validation and governance repair because downstream fixes need a truthful baseline.
- Review evidence came from local diff/log inspection and `CI=true pnpm validate`, which failed at `@reading-advantage/domain` lint.

---

# 🔄 HANDOFF — Next Agent Read This First

## What This Track Is
`review_remediation_20260502` is a **review remediation track**. Its purpose is to fix all regressions and incomplete work discovered during a last-24-hour review of the monorepo. It is **NOT** a feature track — do not add new capabilities unless they are required to fix a regression.

## Current State (as of end of this session)

### ✅ Done — Verified Working
- **All workspace packages build, lint, and test pass:**
  - `api` (17 tests), `auth` (40 tests), `auth-client` (9 tests), `domain` (15 tests), `db` (6 tests), `utils` (10 tests), `ui` (10 tests), `config` (6 tests)
- **All three main apps build successfully:**
  - `reading-advantage`, `primary-advantage`, `www-reading-advantage`
- **Domain extraction complete:** Business logic moved from tRPC routers to `packages/domain/src/{articles,assignments,progress}/`
- **Tenant guards in place:** Domain functions verify `classroom.schoolId === tenant.schoolId` and use `assertCan()`
- **Database constraints added:** Unique indexes on `classroomStudents`, `studentAssignments`, `lessonProgress`, `accounts`, `verificationTokens`, `studentAnswers`
- **Auth-client test fixed:** `useRequireAuth` test passes (mocks both `auth.refresh` and `auth.session` fetch calls)
- **i18n cleanup done:** `next-international` removed from `reading-advantage`, locale provider uses `next-intl`
- **Package exports fixed:** All packages with `.js` ESM imports now build to `dist/` and export `dist/` (prevents Next.js transpilation failures)
- **`packages/utils` barrel fixed:** Main export only exports `cn`; hooks available via `@reading-advantage/utils/hooks`
- **`reading-advantage/lib/session.ts` orphaned code removed**

### ⚠️ Partially Done — Needs Completion
1. **Auth token propagation tests** — No tests verify that `reading-advantage` tRPC client actually sends `Authorization` header, or that `auth-client` logout hits the right endpoint. The code exists but is untested.
2. **Primary/science auth integration** — `primary-advantage` has `@reading-advantage/auth-client` dep and uses locale-aware `Link`, but no real tRPC auth endpoint is wired. Science app still has its own password login UI.
3. **NextAuth vs tRPC auth decision** — `reading-advantage` still uses both. `getCurrentUser()` in `lib/session.ts` falls back to NextAuth first, then tRPC token. No decision made on which survives.

### ❌ Not Done — Still Open
1. **Firebase migration path** — Users with `firebaseUid` and no local password cannot log in. No tests, no migration modal, no bridge.
2. **Cross-tenant authorization regression tests** — No tests verify that students can't read other students' progress, or that teachers can't mutate classes outside their school.
3. **`studentAnswers.questionId` integrity** — `questionId` is still `text` without a foreign key. It has a unique constraint on `(userId, questionId, questionType)` but no referential integrity to `multipleChoiceQuestions.id` or `shortAnswerQuestions.id`.
4. **Config drift in `pnpm validate`** — Config drift test runs via `pnpm --filter @reading-advantage/config test` but is NOT in `pnpm validate` or CI.
5. **All 4 `Measure — User Manual Verification` checkpoints** — Never executed.

## Known Traps for Next Agent

1. **Do NOT modify other track plans** — The previous agent wasted time updating `shared_backend_api_20260502`, `i18n_migration_20260502`, and `shared_config_consolidation_20260502` plans instead of this one. Stay focused on `review_remediation_20260502`.
2. **Root validation (`CI=true pnpm validate`) will fail on `primary-advantage` lint** — This is expected (49 pre-existing ESLint errors). Don't chase it unless explicitly asked.
3. **Package builds are required before app builds** — If you change `packages/api`, `packages/auth`, etc., run `pnpm turbo run build --filter=<package>` before testing app builds. The `dist/` output is what Next.js consumes.
4. **`useRequireAuth` throws during render** — If writing auth-client tests, remember: the hook throws when `!isLoading && !isAuthenticated`. Pre-seed tokens in `localStorage` AND mock both the `auth.refresh` and `auth.session` fetch calls (there are 2 fetch calls in `refreshSession`).
5. **Domain layer must not import from `@trpc/server`** — If you add new domain functions, use standard `Error` for failures. Routers can map to `TRPCError` if needed.

## What To Do Next

Priority order:
1. **Run the 4 `Measure — User Manual Verification` protocols** (see `measure/workflow.md`). This is required before closing any phase.
2. **Write the missing auth tests** (Phase 2): Firebase migration, token propagation.
3. **Write cross-tenant authorization regression tests** (Phase 3).
4. **Fix `studentAnswers.questionId` integrity** — either add FK constraints or document why it can't have one.
5. **Add config drift to `pnpm validate` and CI** (Phase 1 leftover).
6. **Make the NextAuth vs tRPC auth decision** and document it.
