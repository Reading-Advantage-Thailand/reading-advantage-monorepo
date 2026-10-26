# Acceptance: primary_parity_admin_dashboard_20261011

- Date: 2026-10-12 (Phase 4 preparation). The page captures run in a batch (orchestrator).
- Legacy revision: bfea121
- New commit: pending (batch capture)
- Copies: primary_legacy_20261011, primary_parity_20261011
- Pair list: `acceptance-pairs.json` (18 pairs; AC-1 to AC-7 as ADMIN and as SYSTEM; it parses with `PairList`)
- Behavior contract: `behavior-contract.md` (section 6 uses the pair ids)
- Steps modules: `acceptance-steps-school.ts` (env `PARITY_SCHOOL_ID`) and `acceptance-steps-other-school.ts` (env `PARITY_OTHER_SCHOOL_ID`)

## Domain query check (run 2026-10-12)

Method. The helper cloned the matched copy under the heavy lock
(`createdb -T primary_parity_20261011 primary_parity_run_admin_p4`) and added two test rows on the clone:
one `auth:login` audit event for a teacher of school B, and one active license of 250 seats that ends in 20 days
for school B. A script called `getSchoolDashboard` (real domain code, real SQL) for each school and each range
(7, 30, 90), and ran the queries Q3a to Q9b of `reference-sql.sql` with the same instant. The host has no
database password for the helper, so the script sent each domain query to `psql` in the container
(`docker exec`). The script is in the scratch folder `admin_dashboard-p4/check.mts`. The helper dropped the clone at the end.

Schools (no names): A = the largest school (417 students, 15 classes, 3 teachers, no activity and no license);
B = the largest school with activity (218 students, 8 classes, 2 teachers); C = school `2c5f6031` (5 students,
1 license of 100 seats); D = school `a5158947` (0 students, 1 license of 1 seat).

| Item | Schools | Result |
| --- | --- | --- |
| Q3a active students / total | A, B, C, D x n=7, 30, 90 | all equal |
| Q3b active teachers / total | same | all equal (B: 1 of 2 after the test sign-in row) |
| Q3c classes with activity / total | same | all equal |
| Q3d articles opened, Q3e XP earned, Q3f new students | same | all equal |
| Q4 adoption by CEFR level | same | all equal |
| Q5 adoption by class grade | same | all equal |
| Q8 teachers table (classes / students / active / engagement) | same | all equal |
| Q9a activity by day (cell count, last day, sum) | same | all equal; last day = 2026-10-12 |
| Q9b activity events | same | all equal |
| Q6a / Q6b alerts, read by eye | same | agree (below) |

Values for school B at n = 30 match the reference run in the behavior contract: 23 of 218 active (11 %), 71 articles,
1745 XP, 0 new students, 580 events. At n = 90: 72 of 218, 187 articles, 4493 XP, 1 new student, 1431 events.

Alerts by eye. A: low activity, high (0 of 417); no seat alert (0 seats); no license alert. B: low activity, medium
(23 of 218 = 11 %), license ends soon, medium (20 days); no seat alert (218 of 250 = 87 %). C: none (100 seats, 5 used).
D: none (0 students). For n = 7 and n = 90 the low activity alert uses the 30-day window, as the spec says.
The "license ended" and "seats nearly full" alerts have no row in the copy; the Phase 2 pure tests cover their limits.

Query time of `getSchoolDashboard` (14 aggregate queries in parallel). Large school A: the sum of the server time of
the 13 or 14 queries was 201 to 318 ms, and the slowest query took 27 to 44 ms. The wall time through `docker exec` was
1.6 to 4.6 s, because each query starts a new process; this is not the page time. School B: server sum 202 to 244 ms,
slowest query 24 to 32 ms. In the earlier Phase 2 run, the in-process time was 180 ms (cold) and 29 ms. The target is 2 s for
the page. The domain call is far below it. The page time on a build goes to the batch.

## Batch capture (orchestrator)

Environment for the steps modules: `PARITY_SCHOOL_ID` = the id of school B; `PARITY_OTHER_SCHOOL_ID` = the id of any
other school. The clone needs the two test rows above, or Q3b and the license alert show empty values. Run
`GET /api/admin/recent-activity` against the new server and expect 404 (AC-5). Open `/en/admin/dashboard/students`
and `/en/admin/dashboard/teachers` and expect the not-found page (AC-6).

| Pair | Check | Result |
| --- | --- | --- |
| AC-1 to AC-7 (18 pairs) | page captures and report | batch capture (orchestrator) |
| Page time for school A or B on the build (target 2 s) | measure | batch capture (orchestrator) |
| AC-8 | look check of the built page, 375 px and 1280 px, day and night | batch capture (orchestrator); look check pending (owner, async) |

## Final gates (AC-9), run 2026-10-12 under the heavy lock, one at a time

| Command | Result |
| --- | --- |
| `cd packages/domain && nice ../../node_modules/.bin/vitest run` (first run) | 157 files passed, 4 skipped, 1 failed: `src/__tests__/licenses.test.ts` (its `drizzle-orm` mock had no `sql`, which `licenses/usage.ts` needs at load time) |
| fix: the mock keeps the real exports (`importOriginal`), commit `5c350f810`; then `vitest run src/__tests__/licenses.test.ts src/__tests__/licenses-usage.test.ts` | 2 files, 15 tests passed. The second full run (under the lock) showed the same single failure before the fix and 157 other files passed; the full suite was not run a third time after the fix |
| `cd apps/primary-advantage && nice ../../node_modules/.bin/vitest run` | 233 files, 1395 tests passed (exit 0); `class-book-pacing-controls.test.tsx` passed in this run |
| `cd apps/primary-advantage && ../../node_modules/.bin/tsc --noEmit` | exit 0, 0 errors |
| `cd packages/domain && ../../node_modules/.bin/tsc --noEmit` | exit 0, 0 errors |
| `cd packages/domain && ../../node_modules/.bin/eslint <18 changed files + licenses.test.ts>` | exit 0, no output |
| `cd apps/primary-advantage && ../../node_modules/.bin/eslint <24 changed files>` (files of the commits of this track) | exit 0, no output |

The helper did not use `pnpm run`, `pnpm exec`, or `pnpm --filter`. `measure/generate.sh` ran and the helper restored
`measure/generated`. `measure/doctor.sh` fails on checks that are old and outside this track: A13 (stale archived
directory), the missing `measure/automation-supervisor.py`, deprecated `[ ]` markers in many old plans (this plan keeps
`[ ]` on the batch capture tasks, by the brief), and `architecture:check` (stale manifest hash).
