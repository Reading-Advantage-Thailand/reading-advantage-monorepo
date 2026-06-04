# Plan: Domain Module Decomposition + Per-Module `permissions.ts`

> Pilot-driven. The pattern established in `gamification/` is replicated across 12 modules; `codecamp/` gets special handling. Each module is its own PR to keep diffs reviewable.

## Phase 0: Setup

- [ ] Task: Read AGENTS.md §3.4, §3.5; confirm the per-concern split.
- [ ] Task: Confirm `packages/domain/src/index.ts` re-exports the 14 module barrels.
- [ ] Task: Coordinate with Track 1 (App → Domain) — Track 1 will add a 15th module (`teachers/`); this track's PR plan accounts for that.

## Phase 1: Pilot — `gamification/` Decomposition

- [ ] Task: Read `packages/domain/src/gamification/index.ts` (77 lines) and its test file.
- [ ] Task: Create `gamification/schema.ts` — re-export `gamificationProfiles`, `xpEvents`, `badges` from `packages/db/src/schema/`.
- [ ] Task: Create `gamification/contracts.ts` — Zod schemas for the 2 functions + `z.infer` types.
- [ ] Task: Create `gamification/queries.ts` — `getStudentGamification({ studentId })`.
- [ ] Task: Create `gamification/mutations.ts` — `updateStudentGamification({ studentId, updates })` wrapped in `command({ input, output, auth, authorize, handler })`.
- [ ] Task: Create `gamification/permissions.ts` — `gamification:read:own`, `gamification:read:all`, `gamification:update`.
- [ ] Task: Create `gamification/errors.ts` — `GamificationError`, `InsufficientXpError`.
- [ ] Task: Rewrite `gamification/index.ts` as a barrel re-export.
- [ ] Task: Add per-export JSDoc on all functions.
- [ ] Task: Run the 77 existing test cases; confirm all pass.
- [ ] Task: Lint + type-check green.

## Phase 2: `domainModulePermissions` Extension Point

- [ ] Task: Update `packages/auth/src/permissions.ts` with the `DomainModulePermissions` interface, `registerDomainModulePermissions` function, and `lookupPermission` function (FR-5).
- [ ] Task: Update `assertCan` in `packages/auth/src/server.ts` to use `lookupPermission` instead of `PERMISSIONS[key]` directly.
- [ ] Task: Write failing tests:
  - `registerDomainModulePermissions({ moduleName: 'gamification', keys: [{ key: 'gamification:read:own', roles: ['STUDENT', 'TEACHER', 'ADMIN'] }] })` registers successfully.
  - `assertCan(STUDENT, 'gamification:read:own')` returns true after registration.
  - `assertCan(STUDENT, 'gamification:read:all')` returns false (not registered for STUDENT).
  - `assertCan(STUDENT, 'class:read')` (central map only) returns true.
- [ ] Task: Confirm tests pass; `gamification/permissions.ts` calls `registerDomainModulePermissions` at module load.

## Phase 3: Replicate Across 12 Modules

For each module, follow the Phase 1 pattern. One PR per module.

- [ ] `articles/` (159 lines)
- [ ] `assignments/` (352 lines)
- [ ] `classes/` (82 lines)
- [ ] `curriculum/` (113 lines)
- [ ] `licenses/` (107 lines)
- [ ] `progress/` (225 lines)
- [ ] `quiz/` (78 lines)
- [ ] `reports/` (175 lines)
- [ ] `stories/` (105 lines)
- [ ] `students/` (150 lines)
- [ ] `users/` (207 lines)
- [ ] (Plus `teachers/` once Track 1 has added it; this track will decompose it post-Track 1.)

For each module:
- Decompose into 7 files.
- Add per-export JSDoc.
- Add `permissions.ts` with module-scoped keys.
- Add `errors.ts` with module-specific errors.
- Update barrel.
- Re-validate existing tests.

## Phase 4: `codecamp/` Decomposition (1,987 lines → 8-10 sub-modules)

- [ ] Task: Read `packages/domain/src/codecamp/index.ts` and identify the 8-10 sub-modules:
  - `modules.ts` (curriculum module queries/mutations)
  - `lessons.ts`
  - `exercises.ts`
  - `quizzes.ts`
  - `chat.ts`
  - `pr-review.ts`
  - `webhook-events.ts`
  - `intern-accounts.ts`
  - (possibly `chat-history.ts`, `repositories.ts` — adjust based on actual content)
- [ ] Task: For each sub-module: extract the functions; add `contracts.ts`; add `permissions.ts` keys; add `errors.ts` errors.
- [ ] Task: Merge `codecamp/review-exercise.ts` into `codecamp/pr-review.ts`.
- [ ] Task: Replace `codecamp/index.ts` with a barrel re-export.
- [ ] Task: Add per-export JSDoc on all 30+ functions.
- [ ] Task: Run the full `codecamp` test suite; confirm all pass.
- [ ] Task: Lint + type-check green.

## Phase 5: Add 5 `relations()` Blocks

- [ ] Task: In `packages/db/src/schema/users.ts` — add `usersRelations = relations(users, ({ many }) => ({ accounts: many(accounts), sessions: many(sessions) }))`.
- [ ] Task: In `packages/db/src/schema/science.ts` (or a new `science-relations.ts`) — add `scienceClassesRelations`, `scienceCurriculumUnitsRelations`, `scienceUnitLessonsRelations`, `scienceLessonsRelations`.
- [ ] Task: Add `scienceAttemptsRelations = relations(scienceAttempts, ({ many, one }) => ({ responses: many(scienceQuestionResponses), lesson: one(scienceLessons, ...) }))`.
- [ ] Task: In `packages/db/src/schema/classrooms.ts` — add `classroomsRelations = relations(classrooms, ({ many }) => ({ students: many(classroomStudents) }))`.
- [ ] Task: In `packages/db/src/schema/assignments.ts` (or wherever the science assignments table is) — add `scienceAssignmentsRelations`.
- [ ] Task: Write a test: `db.query.users.findFirst({ where: eq(users.id, testUserId), with: { accounts: true, sessions: true } })` returns the user with their accounts + sessions.
- [ ] Task: Confirm.

## Phase 6: Codemod the 3 Raw `sql\`\`` Sites (F-504 partial)

- [ ] Task: `apps/science-advantage/lib/services/mastery/standard-mastery.ts:68` — document the `sql\`${col} + ${val}\`` pattern as correct (Drizzle's parameterized form). No code change.
- [ ] Task: `apps/science-advantage/app/api/teachers/dashboard/route.ts:163` — `lt(col, sql\`0.6\`)` → `lt(col, 0.6)`.
- [ ] Task: `apps/science-advantage/app/api/teachers/classes/[classId]/intervention-alerts/route.ts:166` — `sql\`${col}\`` → `col` (column reference).
- [ ] Task: Grep gate: `rg "sql\`" apps/science-advantage/` returns only the mastery arithmetic site (or 0 hits if the maintainer wants to refactor that too).

## Phase 7: JSDoc Refresh (F-1101)

- [ ] Task: For each function in the 14 modules, add per-export JSDoc with description + `@param` + `@returns`. Use the 2026-05-30 JSDoc track as the baseline.
- [ ] Task: After Track 0's graph.db rebuild, run `build-graph inspect` on a sample of functions to confirm JSDoc is now being extracted.
- [ ] Task: Document the re-validation in `measure/lessons-learned.md`.

## Phase 8: Final Acceptance

- [ ] Task: All 14 modules have the 7-file structure.
- [ ] Task: `codecamp/` has 8-10 sub-modules + barrel.
- [ ] Task: Per-export JSDoc on 100% of exported functions.
- [ ] Task: 5 `relations()` blocks in `packages/db/src/schema/`.
- [ ] Task: `pnpm turbo run test --filter=@reading-advantage/domain --filter=codecamp-advantage` exits 0.
- [ ] Task: `pnpm turbo run lint --filter=@reading-advantage/domain --filter=codecamp-advantage` exits 0.
- [ ] Task: `pnpm turbo run check-types --filter=@reading-advantage/domain --filter=codecamp-advantage` exits 0.

## Phase 9: Closeout

- [ ] Task: Update `measure/tech-debt.md` row `audit_20260603_housekeeping_batch` to mark F-301, F-303, F-304, F-504 (partial), F-1101 `Resolved`.
- [ ] Task: Add a lessons-learned entry: "The per-concern split (schema/contracts/queries/mutations/permissions/errors) is a one-time cost; once the pattern is established, replication is mechanical. Use a codemod for the 12 small modules."
- [ ] Task: Move track to `measure/archive/domain_module_decomposition_20260603/` and update `measure/tracks.md`.
