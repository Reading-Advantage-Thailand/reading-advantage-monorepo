# Acceptance: primary_parity_teacher_home_20261011

- Date: 2026-10-12 (Phase 4 preparation). The page captures run in a batch (orchestrator).
- Legacy revision: bfea121
- New commit: pending (batch capture)
- Copies: primary_legacy_20261011, primary_parity_20261011
- Pair list: `acceptance-pairs.json` (8 pairs, AC-1 to AC-7 as TEACHER; it parses with `PairList`)
- Behavior contract: `behavior-contract.md` (section 6 uses the pair ids and has the SQL data checks)
- Steps modules: `acceptance-steps-search-sort.ts` (env `PARITY_CLASS_SEARCH`), `acceptance-steps-class-link.ts` (optional env `PARITY_NEW_CLASS_ID`)

## Domain query check (run 2026-10-12)

Method. The helper cloned the matched copy under the heavy lock
(`createdb -T primary_parity_20261011 primary_parity_run_teacher_p4`). A script in the scratch folder
`teacher_home-p4/check.mts` called `getTeacherHome` (real domain code, real SQL, `drizzle` over `postgres-js`
on the clone) and ran `reference.sql` through `psql` in the container with the same instant (`now()` replaced by one
timestamp literal). The helper added 38 `xp_logs` rows on the clone (100 XP one day ago for 24 students of two classes of
teacher 1, 50 XP nine days ago for 10 of them, 20 XP for 4 more) so that the 7-day windows, the trend, and the status
have non-zero values. The helper dropped the clone at the end.

Teachers (no names): T1 = the teacher with the most classes (6 classes, 160 students); T2 = a teacher of another school
(3 classes, 106 students); T3 = a teacher with 2 classes (checked after the test rows).

| Item | Teachers | Result |
| --- | --- | --- |
| Summary: classes, students | T1, T2 (before the test rows) | equal |
| Summary: active students 30 days, active today, average level, completed today | T1, T2 | equal (T1 after the test rows: 51 active in 30 days) |
| Class rows: count | T1, T2, T3 | equal |
| Class rows: students, active 7 days, rate | each class of T1, T2 | equal (one class of T1 after the test rows: 33 students, 14 active, 42 %) |
| Class rows: average level, XP 7 days, XP previous 7 days | each class of T1, T2 | equal |
| Class rows: trend, status | each class of T1, T2 | equal (T1 has `down` and `flat`; every status of T1 and T2 before the test rows is `needsAttention`; after the test rows the changed class matches `reference.sql`) |
| Differences | all | 0 |

Query time of `getTeacherHome` (server code plus database, in process, three runs each):
T1 483 ms (cold), 47 ms, 40 ms. T2 43, 43, 50 ms. After the test rows: T1 194, 63, 49 ms; T3 63, 56, 42 ms.
The limit of the plan is 1 s for the biggest teacher. The call is far below it, so there is no High finding
and the code stays as it is (the Phase 2 Medium finding about merging the windows stays a Low item).

## Batch capture (orchestrator)

Set `PARITY_CLASS_SEARCH` to a part of a class name of the matched TEACHER (the kit signs in as that teacher; the class
id in `th-start-class` is a legacy class of the teacher with 6 classes, as in the class books pairs, so use that teacher or
change the id). Use the clone with the 38 test rows of the method above if the 7-day numbers must be non-zero.

| Pair | Check | Result |
| --- | --- | --- |
| th-numbers, th-columns (AC-1, AC-2) | page captures and report; compare with D1 and D2 of the behavior contract | batch capture (orchestrator) |
| th-search-sort (AC-3) | capture after the search and two taps on Students | batch capture (orchestrator) |
| th-csv (AC-4) | button exists; file check is the manual step below | batch capture (orchestrator); manual step |
| th-class-link, th-start-class, th-one-list (AC-5, AC-6) | page captures and report | batch capture (orchestrator) |
| th-look (AC-7) | look check of the built page, 375 px and 1280 px, day and night | batch capture (orchestrator); look check pending (owner, async) |

### Manual step: the CSV file (the kit cannot capture a download)

1. Sign in as the matched TEACHER on the new build. Open `/en/teacher/dashboard`.
2. Search for part of a class name. Tap "Students" two times. Tap "Download CSV".
3. Open the file `teacher-classes-<Bangkok date>.csv`. The header must be
   `class,grade,students,active_7d,active_rate_7d,average_level,xp_7d,xp_previous_7d,trend,status`.
4. The rows must be the rows that the table shows, in the shown order. The row count must equal the table (D3).
5. Tap "Start class" in one row. The class page must open at the sign-in panel (`#class-login`).
6. In the legacy app, tap "Export" and note the columns for the comparison (AC-4).

## Final gates (AC-8), run 2026-10-12 under the heavy lock, one at a time

| Command | Result |
| --- | --- |
| `cd packages/domain && nice ../../node_modules/.bin/vitest run` | 164 files passed, 4 skipped, 1 failed (1902 tests passed, 26 skipped). The failed file is `mastery-persistence-public-api.test.ts`: its `beforeAll` runs a full `tsc` build with a 120 s timeout and the machine was under load. Run alone under the lock it passed (1 file, 9 tests, 39 s). No file of this track failed |
| `cd apps/primary-advantage && nice ../../node_modules/.bin/vitest run` | 258 files passed, 1 failed (1572 tests passed, 1 failed). The failure is `components/nav/__tests__/app-nav.test.tsx` ("keeps the current admin and SYSTEM menu items"): the nav has a `schoollicense` item that the test does not list. The cause is the track `primary_parity_school_management_20261011` (commit bd796b6d8), not this track. The orchestrator must fix the test or the item when the lanes merge |
| `cd apps/primary-advantage && ../../node_modules/.bin/tsc --noEmit` | exit 0, 0 errors |
| `cd packages/domain && ../../node_modules/.bin/tsc --noEmit` | exit 0, 0 errors |
| `cd packages/domain && ../../node_modules/.bin/eslint <13 changed source and test files of this track>` | exit 0, no output |
| `cd apps/primary-advantage && ../../node_modules/.bin/eslint <7 changed source and test files of this track>` | exit 0, no output |

The helper did not use `pnpm run`, `pnpm exec`, or `pnpm --filter`. `measure/generate.sh` ran and the helper restored
`measure/generated`. `measure/doctor.sh` fails on checks that are old and outside this track (see plan.md Phase 4 notes).
