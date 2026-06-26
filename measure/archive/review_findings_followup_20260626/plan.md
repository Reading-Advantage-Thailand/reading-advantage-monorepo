# Implementation Plan: Review-Findings Follow-up

> Classic FR plan. Each phase follows Test (Red) → Implement (Green) per workflow.md.
> Order: build the test-DB harness first (Phase 1) because the FR-1 correctness proof
> depends on it; then the FR-1 fix (Phase 2); then the cheaper guards (Phases 3–4).
>
> Commit grouping note: the prior failed (commitlint) commit attempts left files staged,
> so the harness foundation and the FR-1 fix landed together in `96563834` rather than as
> two separate commits. SHAs below reflect where each change actually committed.

## Phase 1: FR-2 — PGlite test-DB harness + sibling behavioral tests

- [x] Task: Install `@electric-sql/pglite` as a dev dependency and confirm `drizzle-orm/pglite` boots an in-process Postgres. SHA: 96563834.
- [x] Task: Create a reusable harness `__tests__/helpers/testDb.ts` (PGlite + focused DDL for users/roles/user_roles/classrooms/classroom_students/school_admins/assignments/student_assignments/classroom_teachers/schools; drizzle bound to it; reset + close). Smoke test proves real fan-out. SHA: 96563834.
- [x] Task: Test (behavioral) — `classroomModel.getAllClassrooms` returns the seeded classrooms by name (real rows). SHA: 99ce0242.
- [x] Task: Test (behavioral) — `teacherModel.getTeachers` returns the seeded teacher with correct `totalCount`. SHA: 99ce0242.
- [x] Task: Test (behavioral) — `assignmentModel.getStudentAssignments` returns the seeded assignment for the student. SHA: 99ce0242.

## Phase 2: FR-1 — Distinct-student pagination in `getStudents`

- [x] Task: Test (Red) — PGlite test seeds 6 students × 2 classrooms; asserts a full page of `limit` distinct students and that paging yields all `totalCount` distinct students. Confirmed RED on the row-paginated code (page returned only `['s5','s4','s3','s2']` = 4 of 6 distinct). SHA: 96563834.
- [x] Task: Implement (Green) — `getStudents` now paginates over distinct students (users→userRoles→roles only, `limit`/`offset`), then attaches one classroom per page student via a follow-up query keyed by page ids. `classroomId` filter + distinct-count query preserved. SHA: 96563834.
- [x] Task: Verify — full `primary-advantage` suite green (46 tests); `tsc` shows only the 6 pre-existing `TS2769` baseline errors in `studentModel.ts` (zero new). The superseded mock test `studentModel.fr2.test.ts` was deleted (it pinned the old single-query+JS-dedup structure). SHA: 96563834.

## Phase 3: FR-3 — Caller-level transaction await guard

- [x] Task: Test (Red) — `new-generator.caller.test.ts` drives `generateArticleNew` with a rejecting `db.transaction`; asserts the caller rejects. Verified it FAILS when the `await` on `db.transaction(...)` is temporarily removed and passes when restored (production code untouched). SHA: d36fea32.
- [x] Task: Implement/Confirm (Green) — `generateArticleNew` already awaits `db.transaction(...)`; no production change. The guard now pins that fix. SHA: d36fea32.

## Phase 4: FR-4 — Roleplay excerpt-derivation unit tests

- [x] Task: Test — `extractCanonicalSourceExcerpts`: blank-line split, trim, ≤8 cap, empty/whitespace → `[]`, single block → 1 excerpt, blank-line runs dropped. SHA: 8ccbcd98.
- [x] Task: Test — `getRoleplayEvaluationContext`: non-empty `canonicalSourceExcerpts` for a content lesson; `[]` for empty content; throws `ScenarioNotFoundError` for a missing scenario (spec draft guessed `undefined`; the real impl throws — test pins real behavior). SHA: 8ccbcd98.
- [x] Task: Verify — `@reading-advantage/domain` sales suite green (10 tests incl. the prior permissions-and-evaluator); additive, no regression. SHA: 8ccbcd98.

## Phase 5: Closeout

- [x] Task: Final sweep — primary-advantage 46 passed (6 files); domain sales 10 passed (2 files). No baseline regression. PGlite hook timeouts set to 60s for full-suite parallelism.
- [x] Task: Update `metadata.json` (status → done, actual_tasks), update `measure/tracks.md`, and offer archive/review.

## Acceptance Criteria Summary

| AC | Description | FR | Status |
| --- | --- | --- | --- |
| AC-1 | Full page of distinct students; no short page from fan-out; verified on PGlite | FR-1, FR-2 | ✓ |
| AC-2 | Reusable PGlite harness + real-query tests per migrated model (data, not shape) | FR-2 | ✓ |
| AC-3 | Test fails when `generateArticleNew` does not await its transaction | FR-3 | ✓ (verified via temp await-removal) |
| AC-4 | Unit tests for `extractCanonicalSourceExcerpts` + `getRoleplayEvaluationContext` | FR-4 | ✓ |
| AC-5 | All four suites green / skip-clean; no baseline regression | all | ✓ |

## Deviations

- Two superseded mock tests deleted: `studentModel.fr2.test.ts` (pinned the old single-query+JS-dedup internal shape) and `fr11.behavior.test.ts` (mocked the DB, asserted only shape, and called `getStudentAssignments` with the wrong `userId` param). Both are replaced by the PGlite behavioral tests.
- `getRoleplayEvaluationContext` throws `ScenarioNotFoundError` on a missing scenario (the spec draft's "returns `scenario: undefined`" was incorrect); the test pins the real throwing behavior.
- Tech-stack change documented in `measure/tech-stack.md` (PGlite, test-only) before install, per workflow.md principle #2.
