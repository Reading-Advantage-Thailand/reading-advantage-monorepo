# Acceptance: primary_parity_school_management_20261011

- Date: 2026-10-12 (Phase A preparation). The page captures run in a batch (orchestrator).
- Legacy revision: bfea121
- New commit: pending (batch capture)
- Copies: primary_legacy_20261011, primary_parity_20261011
- Pair list: `acceptance-pairs.json` (9 pairs; AC-1 to AC-6 as ADMIN, TEACHER, STUDENT, and SYSTEM; it parses with `PairList`)
- Behavior contract: `behavior-contract.md` (section 6 uses the pair ids)
- Data checks: `reference-sql.sql` (L1 to L5 for the license view; A1 to A7 for the acceptance run)

## Run of S1 to S5 on a clone (2026-10-12)

Method. The helper cloned the matched copy under the heavy lock
(`createdb -T primary_parity_20261011 primary_parity_run_school_pa`). A `tsx` script (scratch folder
`school_management-pa/`) called the real domain and model code with a `postgres-js` connection to the clone.
The script added two test teachers to the second largest school (no names). The helper dropped the clone at the end.
Schools: B = 218 students, 8 classes; C = school `2c5f6031` (5 students, 1 license of 100 seats);
D = school `a5158947` (0 students, 1 license of 1 seat).

| Story | Call | Result |
| --- | --- | --- |
| S1 | `setClassroomTeachers` as ADMIN of B: add two teachers, then keep one | pass: the owner stays, the pairs follow the list, no duplicate |
| S1 | teacher of school C into a class of B | pass: `CROSS_SCHOOL_TEACHER`, no change |
| S1 | ADMIN of school C edits a class of B | pass: `FORBIDDEN`, no change |
| S2 | `resolveImportSchool` (the route is not called) | pass: SYSTEM without a school: "School selection required"; with school C: C; bad id: "School not found"; ADMIN with a form value for C: own school B |
| S3 | `moveTeacherToSchool`: ADMIN | pass: `FORBIDDEN` |
| S3 | owner of classes | pass: `OWNS_CLASSES`, no change |
| S3 | class of the old school as target class | pass: `CROSS_SCHOOL_CLASSROOM` |
| S3 | teacher without classes to school C with one class of C | pass: `school_id` = C, one link in the class of C, none elsewhere, one audit event `teacher:school:move` |
| S4 | `getSchoolLicenseView` for C, D, B against reference-sql L2 | pass: C 100 / 5 / 95 / 0 and D 1 / 0 / 1 / 0 equal L2. B has no license: the view shows "no active license" (seats 0, over 0), L2 gives over 218 (the design default of the contract) |
| S4 | `listSeatHolders` page 1 | pass: C 5 rows, D 0 rows, B 50 rows of 218 |
| S4 | TEACHER without `school_admins` row | pass: `FORBIDDEN` |
| S5 | `updateTeacher` role to admin | pass: `users.role` = ADMIN, sessions 0, one audit event `user:role_changed` |
| Teachers list | `getTeachers` as ADMIN of the 4 largest schools | pass: the count and rows equal the TEACHER and ADMIN rows of each school (6, 5, 2, 2) |
| `school_id` null | users and classes before and after | no new row: users 1 before and 1 after (the baseline TEACHER row of the copy), classes 0 and 0 |

Notes.
- The first S3 move failed because the script used a made-up SYSTEM user id. `audit_events.actor_user_id` has a foreign key to `users`, and the audit write sits in the move transaction, so the whole move rolled back with no change. A real SYSTEM id works. This is the wanted behavior (no move without an audit row), not a defect.
- The copy has 2 `classroom_teachers` rows where the teacher has the role ADMIN (A2 baseline). The run added none.
- The S2 import routes and the SYSTEM import stamp are route work (multipart upload). The helper did not run them. The route tests of Phase S2 cover them. The batch run checks AC-2 in the browser.

## Batch capture (orchestrator)

Needs. AC-4 needs an ADMIN account of school `2c5f6031` (the only school with an ADMIN and a license; school
`a5158947` has a SYSTEM user only). AC-3 and AC-1 can use any school with teachers. Run the A-queries of
`reference-sql.sql` after each browser step on the capture clone.

| Pair | Check | Result |
| --- | --- | --- |
| AC-1 to AC-6 (9 pairs) | page captures and report | batch capture (orchestrator) |
| AC-7 | look check of the changed parts, 375 px and 1280 px, day and night (design captures exist in `~/Desktop/primary-parity-progress/captures/school_management/`) | batch capture (orchestrator); look check pending (owner, async) |

## Final gates (AC-8), run 2026-10-12 under the heavy lock, one at a time

| Command | Result |
| --- | --- |
| `cd packages/auth && ../../node_modules/.bin/tsc`, then `packages/domain` | exit 0 (stale `dist` rebuilt) |
| `cd packages/domain && nice ../../node_modules/.bin/vitest run` | 165 files passed, 4 skipped, 2 failed; 1846 tests passed. The 2 failures are `games-host-proof.test.ts` and `phase-3-adversarial.test.ts`. They fail at load: their `@reading-advantage/db/schema` mock has no `primaryClassBooks`, and `games/practice-input.ts` (commit `628585040`, track `primary_parity_lesson_games_20261011`) imports `primary-books/class-books.ts`. Not a file of this track |
| `cd apps/primary-advantage && nice ../../node_modules/.bin/vitest run` (first) | 264 files passed, 3 failed; 1608 tests passed, 1 failed |
| the failed test `components/nav/__tests__/app-nav.test.tsx` | cause: S4 added the nav item "School license" and the test list was old. Fixed in this phase (test list now has `schoollicense`); the file passes, 15 tests |
| the 2 failed suites `component-deduplication-behavior.test.tsx` and `loading-state-flow.behavior.test.tsx` | fail at load: `packages/sales-knowledge/dist/data/evidence/release-candidate.json` is missing in the stale `dist` of that package. Not a file of this track; the helper did not rebuild it |
| `cd apps/primary-advantage && ../../node_modules/.bin/tsc --noEmit` | exit 0, 0 errors (run before and after the test fix) |
| `cd packages/domain && ../../node_modules/.bin/tsc --noEmit` | exit 0, 0 errors |
| `eslint` on the 47 app files and the 14 domain files of the commits of this track | exit 0, 0 errors (95 old warnings, `no-explicit-any` and unused vars in `teacherModel.ts` and others) |

The working tree also held uncommitted files of the lesson games helper (`actions/lesson-games.ts`,
`packages/domain/src/games/lesson-results.ts`, and others). The gates ran with these files present. The helper did not stage them.
The helper used no `pnpm run`, `pnpm exec`, or `pnpm --filter`.
