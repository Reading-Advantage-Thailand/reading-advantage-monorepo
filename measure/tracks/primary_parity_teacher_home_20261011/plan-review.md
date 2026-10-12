# Plan review — primary_parity_teacher_home_20261011

## Phase 1: Design (phase start sha 9f9fbf9eb)

Phase review of the diff (docs, SQL, and notes only). No Critical and no High finding.

Medium:

- FR-4 says "70 % or more". `activeRate7d` is a whole percent. The contract decides that the status reads the rounded percent the row shows (69.6 % shows 70 % and gives `onTrack`). Phase 2 must write the rule test at the rounded limits and keep the contract.
- The current `getTeacherHome` counts class students with no role filter. The contract and `reference.sql` count only users with the role `STUDENT` in the teacher school (the shared scope rule). Phase 2 must add this filter to the student count too, so that the strip and the table agree.

Low:

- The phone card of one class is about 280 px high. Six classes need about 1700 px. Accepted for the first release. A compact card is a later change.
- The spec "Current Monorepo State" says "`studentCount`, `studentCount`". It means the class `studentCount` and the total. No change needed.
- The `Need help` tile has no link. The sub-line says "See the list below". An anchor link is optional in Phase 3.

Shortcuts and lessons (for the orchestrator to move into the shared files):

- Lesson: the design harness needs `i.decode()` on all images before a screenshot. With a fixed wait, two captures had a grey backdrop.
- Lesson: a `next-intl` stub that reads the real `messages/en.json` lets a harness render real client components with real strings.

## Phase 2: Contracts and domain queries (phase start sha 42e1ffbf1)

Phase review of `git diff 42e1ffbf1..HEAD`. No Critical and no High finding. Checked: plan compliance, tenant scope, Zod at the scope boundary, tests, JSDoc, no `console` call, no new strings (no locale change in this phase).

- Phase 1 findings handled: (1) `classStatus` reads `activeRate7d`, the rounded percent of the row; tests at 16 of 23 (69.6 % gives 70 and `onTrack`), 39 / 40 %, and 99 of 250. (2) The roster query of `getTeacherHome` now filters `users.role = 'STUDENT'` and `users.school_id`; a teacher in a roster and a student of school B are not counted (PGlite test).
- Tenant scope: the scope kind `classes` joins `classrooms.school_id` and `users.school_id`; a class id of another school gives no student. `scopedRawDb` parses the scope with Zod.

Medium:

- `getTeacherHome` runs 9 raw queries and 3 selects (a fixed number). The queries run in parallel and the 7-day, previous 7-day, 30-day, and today counts re-read the three event tables. If the production timing is bad on the largest school, merge the windows into one query. Phase 4 measures this on the rehearsal copy.
- `completedToday` counts `student_assignments` rows of the class assignments with no role filter. This matches `reference.sql`. A teacher cannot hold a student assignment, so the count is the same in practice.

Low:

- `classRows` repeats the class id, name, grade, and student count of `classes`. The page can drop `classes` later; this phase keeps both so that the Class Quest cards and the tests of the old fields stay valid.
- `scopeStudentsSql` now also selects `u.level` (a new column in the shared select). The admin dashboard ignores it.
- Subpath export added: `@reading-advantage/domain/teacher-class-csv` (`./teacher-class-csv`). `csv.ts` has no subpath export (YAGNI).

Lessons:

- The recording DB stub of `primary-teacher-home.test.ts` now has an `execute` method with a handler that picks rows by the text of the rendered SQL. Use `sharedRows` for new cases.
- `windowBoundsSql` params for the previous 7-day window end where the last 7-day window starts. A stub that matches on a params value must test the previous window first.
