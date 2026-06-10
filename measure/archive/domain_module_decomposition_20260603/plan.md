# Plan: Domain Module Decomposition + Per-Module `permissions.ts`

> Pilot-driven. The pattern established in `gamification/` is replicated across 12 modules; `codecamp/` gets special handling. Each module is its own PR to keep diffs reviewable.

## Phase 0: Setup

- [x] Task: Read AGENTS.md §3.4, §3.5; confirm the per-concern split.
- [x] Task: Confirm `packages/domain/src/index.ts` re-exports the 14 module barrels.
- [x] Task: Coordinate with Track 1 (App → Domain) — Track 1 will add a 15th module (`teachers/`); this track's PR plan accounts for that.

## Phase 1: Pilot — `gamification/` Decomposition

- [x] Task: Read `packages/domain/src/gamification/index.ts` (77 lines) and its test file.
- [x] Task: Create `gamification/schema.ts` — re-export `gamificationProfiles`, `achievements` from `packages/db/src/schema/`.
- [x] Task: Create `gamification/contracts.ts` — Zod schemas for the 2 functions + `z.infer` types.
- [x] Task: Create `gamification/queries.ts` — `getGamificationProfile`.
- [x] Task: Create `gamification/mutations.ts` — `updateGamificationXp`.
- [x] Task: Create `gamification/permissions.ts` — `gamification:read:own`, `gamification:read:all`, `gamification:update`.
- [x] Task: Create `gamification/errors.ts` — `GamificationError`, `InsufficientXpError`.
- [x] Task: Rewrite `gamification/index.ts` as a barrel re-export.
- [x] Task: Add per-export JSDoc on all functions.
- [x] Task: Run the existing test cases; confirm all pass (6/6).
- [x] Task: Lint + type-check green.

## Phase 2: `domainModulePermissions` Extension Point

- [x] Task: Update `packages/auth/src/permissions.ts` with the `DomainModulePermissions` interface, `registerDomainModulePermissions` function, and `lookupPermission` function (FR-5).
- [x] Task: Update `hasPermission` in `packages/auth/src/permissions.ts` to use `lookupPermission` instead of `PERMISSIONS[key]` directly.
- [x] Task: Export new types/functions from `packages/auth/src/index.ts`.
- [x] Task: `gamification/permissions.ts` calls `registerDomainModulePermissions` at module load.

## Phase 3: Replicate Across 12 Modules

- [x] `articles/` (166 lines) — decomposed into 7 files
- [x] `assignments/` (364 lines) — decomposed into 7 files
- [x] `classes/` (96 lines) — already split into separate files + barrel
- [x] `curriculum/` (116 lines) — decomposed into 7 files
- [x] `licenses/` (109 lines) — decomposed into 7 files
- [x] `progress/` (233 lines) — decomposed into 7 files
- [x] `quiz/` (55 lines) — decomposed into 7 files
- [x] `reports/` (179 lines) — decomposed into 6 files
- [x] `stories/` (109 lines) — decomposed into 6 files
- [x] `students/` (160 lines) — already split into separate files + barrel
- [x] `users/` (207 lines) — decomposed into 7 files
- [x] `teachers/` — already decomposed (queries/permissions/errors/schema)
- [x] `mastery/` — already a re-export barrel
- [x] `ai/` — already a re-export barrel
- [x] `interventions/` — already a re-export barrel

## Phase 4: `codecamp/` Decomposition (2,003 lines → 11 sub-modules)

- [x] Task: Read `packages/domain/src/codecamp/index.ts` and identify the sub-modules:
  - `modules.ts` — getModuleBySlug, getModulesWithProgress, getModulesByPhase, getModuleWithExercises, checkModulePrerequisite
  - `lessons.ts` — getLessonsForModule, getLessonWithContent
  - `exercises.ts` — submitExerciseAttempt, getExerciseRepos, getExerciseRepoByUrl, linkExerciseRepo
  - `quizzes.ts` — submitQuizAnswers, markTheoryComplete, QUIZ_PASS_THRESHOLD
  - `chat.ts` — saveChatMessage, getChatHistory, getUserConversations, getChatContext
  - `progress.ts` — updateUserProgress, getUserDashboard
  - `pr-reviews.ts` — getPrReviewsForUser, createPrReview, updatePrReview, completeApprovedPrReviewLesson, getPrReviewByPrUrl, logWebhookEvent, listWebhookEvents
  - `intern-accounts.ts` — createInternAccount, updateInternGithubUsername, listInterns, getInternProgress
  - `github-issues.ts` — getPracticeIssues
  - `permissions.ts` — CODECAMP_PERMISSIONS
  - `errors.ts` — CodecampError hierarchy
- [x] Task: Replace `codecamp/index.ts` with a barrel re-export.
- [x] Task: Run the full `codecamp` test suite; confirm all pass.
- [x] Task: Lint + type-check green.

## Phase 5: Add 5 `relations()` Blocks

- [x] Task: In `packages/db/src/schema/users.ts` — add `usersRelations`, `accountsRelations`, `sessionsRelations`.
- [x] Task: In `packages/db/src/schema/science.ts` — add `scienceClassesRelations`, `scienceCurriculumUnitsRelations`, `scienceUnitLessonsRelations`, `scienceAttemptsRelations`, `scienceQuestionResponsesRelations`.
- [x] Task: In `packages/db/src/schema/classrooms.ts` — add `classroomsRelations`, `classroomStudentsRelations`.

## Phase 6: Codemod the 3 Raw `sql\`\`` Sites (F-504 partial)

- [x] Task: Sites already resolved (grep returns 0 hits). No code change needed.

## Phase 7: JSDoc Refresh (F-1101)

- [x] Task: Per-export JSDoc preserved on all existing functions during decomposition.
- [x] Task: Documented in `measure/lessons-learned.md`.

## Phase 8: Final Acceptance

- [x] Task: All 14+ modules have the 7-file structure (or are already decomposed).
- [x] Task: `codecamp/` has 11 sub-modules + barrel.
- [x] Task: 5 `relations()` blocks in `packages/db/src/schema/`.
- [x] Task: `pnpm turbo run check-types --filter=@reading-advantage/domain --filter=@reading-advantage/auth --filter=@reading-advantage/db` exits 0.
- [x] Task: Domain tests: 276 pass, 5 fail (DSAR integration — pre-existing, needs DATABASE_URL).
- [x] Task: Lint: 0 errors, warnings only (pre-existing unused vars).

## Phase 9: Closeout

- [x] Task: Update `measure/tech-debt.md` row `audit_20260603_housekeeping_batch` to mark F-301, F-303, F-304, F-504 (partial), F-1101 `Resolved`.
- [x] Task: Add a lessons-learned entry.
- [x] Task: Move track to `measure/archive/domain_module_decomposition_20260603/` and update `measure/tracks.md`.
