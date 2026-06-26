# Implementation Plan: Review-Findings Follow-up

> Classic FR plan. Each phase follows Test (Red) → Implement (Green) per workflow.md.
> Order: build the test-DB harness first (Phase 1) because the FR-1 correctness proof
> depends on it; then the FR-1 fix (Phase 2); then the cheaper guards (Phases 3–4).

## Phase 1: FR-2 — PGlite test-DB harness + sibling behavioral tests

- [ ] Task: Install `@electric-sql/pglite` as a dev dependency and confirm `drizzle-orm/pglite` boots an in-process Postgres.
- [ ] Task: Create a reusable harness `apps/primary-advantage/server/models/__tests__/helpers/testDb.ts` that boots a PGlite instance, applies the schema for the tables the primary-advantage models touch (users, roles, user_roles, classrooms, classroom_students, school_admins, assignments, student_assignments, + minimal deps), returns a drizzle db, and exposes a teardown. Gate/skip cleanly if PGlite init throws.
- [ ] Task: Test (behavioral) — `classroomModel`: insert classrooms + enrollments, assert `getAllClassrooms` returns the real rows (count + names), not just an array shape.
- [ ] Task: Test (behavioral) — `teacherModel`: insert teachers + role rows, assert `getTeachers` returns the seeded teachers with correct `totalCount`.
- [ ] Task: Test (behavioral) — `assignmentModel`: insert assignments + studentAssignments, assert `getStudentAssignments` returns the seeded assignments for the student.

## Phase 2: FR-1 — Distinct-student pagination in `getStudents`

- [ ] Task: Test (Red) — against the PGlite harness, seed M students each in 2 classrooms; call `getStudents` with a `limit` that forces fan-out across the page boundary; assert page 1 returns `limit` **distinct** students and `students.length === Math.min(limit, totalCount)`, and that paging through all pages yields exactly `totalCount` distinct students with no duplicates. Confirm this FAILS on the current row-paginated code.
- [ ] Task: Implement (Green) — rewrite `getStudents` to paginate over distinct students (page query joins users→userRoles→roles only, with `limit`/`offset`), then a second query keyed by the page's student ids attaches one classroom per student (preserve the existing `className`/`classroomId` singular shape). Keep the `classroomId` filter and the distinct-count query working.
- [ ] Task: Verify — full `pnpm --filter primary-advantage test` is green; `studentModel.fr2.test.ts` (the prior mock test) still passes; `check-types` clean.

## Phase 3: FR-3 — Caller-level transaction await guard

- [ ] Task: Test (Red) — exercise `generateArticleNew` with a mocked `db.transaction` whose callback rejects; assert `generateArticleNew` rejects (proving the caller awaits). Confirm it FAILS if the `await` on `db.transaction(...)` is removed.
- [ ] Task: Implement/Confirm (Green) — ensure `generateArticleNew` awaits `db.transaction(...)`; no production change expected beyond confirming the guard pins the existing fix. Record the result.

## Phase 4: FR-4 — Roleplay excerpt-derivation unit tests

- [ ] Task: Test — unit tests for `extractCanonicalSourceExcerpts`: paragraph split on blank lines, ≤8 cap, empty/whitespace-only content → `[]`, single-paragraph content → 1 excerpt.
- [ ] Task: Test — unit tests for `getRoleplayEvaluationContext`: a scenario whose lesson has multi-paragraph content yields non-empty `canonicalSourceExcerpts`; a missing scenario yields `scenario: undefined` and `canonicalSourceExcerpts: []`.
- [ ] Task: Verify — `pnpm --filter @reading-advantage/domain test` green; no baseline regression.

## Phase 5: Closeout

- [ ] Task: Final sweep — primary-advantage, sales-advantage, domain suites green (or PGlite-skip clean); record SHAs against each task.
- [ ] Task: Update `metadata.json` (status → done, actual_tasks), update `measure/tracks.md`, and offer archive/review.

## Acceptance Criteria Summary

| AC | Description | FR |
| --- | --- | --- |
| AC-1 | Full page of distinct students; no short page from fan-out; verified on PGlite | FR-1, FR-2 |
| AC-2 | Reusable PGlite harness + real-query tests per migrated model (data, not shape) | FR-2 |
| AC-3 | Test fails when `generateArticleNew` does not await its transaction | FR-3 |
| AC-4 | Unit tests for `extractCanonicalSourceExcerpts` + `getRoleplayEvaluationContext` | FR-4 |
| AC-5 | All four suites green / skip-clean; no baseline regression | all |
