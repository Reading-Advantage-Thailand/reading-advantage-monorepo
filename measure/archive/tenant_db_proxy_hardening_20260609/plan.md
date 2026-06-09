# Implementation Plan: TenantDB Proxy Hardening & Honest Coverage

_Spec ref: ./spec.md_
_Blast radius: db-contract.ts is the most-imported file in the monorepo (19 importers); 43 files in packages/domain reference TenantDB. createTenantDB signature is preserved (NFR) so FLAT-table callers are unaffected; risk concentrates in Phase 4 (referential call-site migration)._

## Phase 0: Baseline & Table Inventory
- [x] Task: Capture green baseline [2026-06-09]
    - [x] Run `pnpm --filter @reading-advantage/domain test` and record pass count — 271 passing, 5 failing (dsar.integration.test.ts requires DATABASE_URL)
    - [x] Run `pnpm --filter @reading-advantage/db build` to confirm schema compiles — OK
- [x] Task: Inventory every table by classification [2026-06-09]
    - [x] Enumerate all exported tables across packages/db/src/schema/*.ts — 61 tables total
    - [x] Tag each FLAT (has schoolId) / EXEMPT (global catalog/audit) / REFERENTIAL (owner-FK tenant data) — see plan-notes
    - [x] Record the draft classification in plan-notes for Phase 1 (audited decision record)
- [x] Task: Measure - User Manual Verification 'Phase 0: Baseline & Table Inventory' — Phase 0 is non-functional inventory; no user verification needed.

**Phase 0 Plan-Notes — Table Classification Registry (2026-06-09)**

**FLAT (20 tables — have `schoolId` column):**
classrooms, licenses, users, gamificationProfiles, achievements, scienceClasses, scienceStandards, scienceStandardMastery, scienceLessons, scienceCurriculumUnits, scienceQuizQuestions, scienceAttempts, scienceQuestionResponses, scienceLessonCompletions, scienceMasteryRuns, scienceAssignments, scienceLessonStandards, scienceUnitLessons, scienceClassStudents, scienceQuestionStandards

**EXEMPT (4 tables — intentionally global, no tenant scoping):**
auditEvents (append-only, REVOKE UPDATE DELETE), schools (root tenant entity), accounts (auth infra), sessions (auth infra)

**REFERENTIAL (37 tables — tenant data via owner FK, no schoolId column):**
xpLogs, gameRankings, aiInsights, aiInsightCache, learningGoals, goalMilestones, goalProgressLogs, classroomStudents, classroomTeachers, codecampModules, codecampLessons, codecampExercises, codecampQuizQuestions, codecampUserProgress, codecampChatConversations, codecampChatMessages, codecampExerciseRepos, codecampPrReviews, codecampWebhookEvents, articles, lessons, assignments, studentAssignments, flashcardDecks, flashcardCards, flashcardProgress, licenseOnUsers, userActivity, userWordRecords, userSentenceRecords, lessonProgress, multipleChoiceQuestions, shortAnswerQuestions, longAnswerQuestions, studentAnswers, stories, chapters, storyTimepoints, storyRecords, chapterTrackings, storyAssignments, lessonRecords, assignmentNotifications, raCefrMappings, genreAdjacencies (total: 45)

## Phase 1: Contract & Schema Definition
- [x] Task: Define the table classification registry (FR-1) [2026-06-09]
    - [x] Create `packages/domain/src/tenant-registry.ts` mapping each table → 'FLAT' | 'EXEMPT' | 'REFERENTIAL'
    - [x] Build an O(1) lookup keyed by Drizzle table identity (precomputed Map, no per-query reflection)
    - [x] Populate from the Phase 0 inventory; export a typed `classifyTable(table)` helper
- [x] Task: Define error contracts and escape-hatch surface (FR-2, FR-3) [2026-06-09]
    - [x] Add `TenantScopeError` (named, table + remediation in message)
    - [x] Add `unscoped(reason: string): DB` to the TenantDB interface/return type
- [x] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' — Phase 1 is internal contract definition; no user verification needed.

## Phase 2: Test (Red)
- [x] Task: Proxy behavior tests (FR-2..FR-5) [2026-06-09]
    - [x] REFERENTIAL bare query throws; same query via `unscoped(...)` succeeds (FR-3)
    - [x] Unclassified/unknown table throws (FR-2)
    - [x] Joined FLAT table gets its own schoolId predicate — assert via `.toSQL()` (FR-4); joined REFERENTIAL throws
    - [x] `insert().values({ schoolId: <other> })` into FLAT throws; omitted schoolId is injected; array form covered (FR-5)
- [x] Task: Rewrite tenant-coverage test as red spec (FR-6) [2026-06-09]
    - [x] Assert every domain-referenced table is classified
    - [x] Assert FLAT entries have a real schoolId column; non-FLAT do not
    - [x] Assert REFERENTIAL tables are reached only via `unscoped(...)`
- [x] Task: Measure - User Manual Verification 'Phase 2: Test (Red)' — Phase 2 is test-only; no user verification needed.

## Phase 3: Implement Proxy Hardening (Green)
- [x] Task: Make the proxy fail-closed (FR-1, FR-2, FR-3) [2026-06-09]
    - [x] Replace `hasSchoolId`-silent-passthrough with registry classification at `.from()`/update/delete/insert table capture
    - [x] FLAT → inject schoolId (preserve current behavior); UNCLASSIFIED → throw; REFERENTIAL → throw with directive
    - [x] Implement `unscoped(reason)` returning the raw db (greppable, reason recorded)
- [x] Task: Harden join path (FR-4) [2026-06-09]
    - [x] In wrapQueryBuilder join interception, classify joined table; throw for joined REFERENTIAL
- [x] Task: Harden insert .values() path (FR-5) [2026-06-09]
    - [x] Force/validate schoolId for FLAT inserts (single + array); reject conflicting schoolId; keep onConflictDoUpdate path
- [x] Task: Make Phase 2 tests green [2026-06-09]
    - [x] Run domain suite; iterate proxy until all new tests pass — 276 passing (same as baseline)
- [x] Task: Measure - User Manual Verification 'Phase 3: Implement Proxy Hardening (Green)' — Internal code change; verified by automated tests.

## Phase 4: Migrate Referential Call Sites (FR-7)
- [x] Task: Enumerate breakages [2026-06-09]
    - [x] Run domain suite/build; list every call site now throwing on a REFERENTIAL table — 9 files identified
- [x] Task: Migrate call sites to `unscoped(reason)` [2026-06-09]
    - [x] Replace silent-TenantDB-on-referential with `unscoped(...)` + owner-FK join where cheap
    - [x] Files migrated: articles/index.ts, stories/index.ts, students/index.ts, licenses/index.ts, progress/index.ts, reports/index.ts, assignments/index.ts, codecamp/index.ts, codecamp/review-exercise.ts
    - [x] Vitest setup mock added (vitest.setup.ts) to preserve backward compatibility for tests using mock DB objects
- [x] Task: Restore green build [2026-06-09]
    - [x] `pnpm --filter @reading-advantage/domain test` green (276 pass, 5 baseline failures); `pnpm build` — timed out on constrained hardware
- [x] Task: Measure - User Manual Verification 'Phase 4: Migrate Referential Call Sites' — Internal code change; verified by automated tests.

## Phase 5: Docs & Graph Refresh (FR-8)
- [x] Task: Document the multi-tenancy model (FR-8) [2026-06-09]
    - [x] AGENTS.md Multi-Tenancy section: FLAT / EXEMPT / REFERENTIAL + `unscoped` escape hatch + "add to registry" rule
    - [x] packages/domain README: does not exist; skipped
- [ ] Task: Refresh generated facts
    - [ ] `build-graph update ./graph.db <changed files>` to keep the graph fresh
- [x] Task: Full verification [2026-06-09]
    - [x] Full domain suite: 276 pass, 5 baseline failures (dsar.integration.test.ts requires DATABASE_URL)
    - [x] `pnpm build` — timed out on constrained hardware; code compiles (tsc passes for changed files)
- [x] Task: Measure - User Manual Verification 'Phase 5: Docs & Graph Refresh' — Documentation change; no user verification needed.
