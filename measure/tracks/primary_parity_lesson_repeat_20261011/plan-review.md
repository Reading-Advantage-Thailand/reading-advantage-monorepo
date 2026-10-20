# Plan review: lesson repeat

## Note for S1 (from batch acceptance, 2026-10-12)
The ETL keeps only the latest of the duplicate legacy `lesson_progress` rows. When that row has no
`assignment_id`, a finished lesson opens at step 1. New rows with `assignment_id`: 28 of 263. Legacy
rows: 40 of 289. Example student id prefix: `cmhxdhv81000d`.
S1 must:
1. Import the legacy duplicates as closed attempts (history rows).
2. Keep the row that links the assignment as the current `lesson_progress` row.
3. Add an ETL test for both rules.

## Phase D
- Low: the Thai texts of the new keys have no owner approval. S2 to S4 use English until the owner gives Thai.
- Low: the grid cell grows from 36 px to 44 px high. S4 must check the 14-lesson grid at 375 px (the table already scrolls).
- Shortcut: the summary mock shows only the top and the action row, not the full summary.

## Phase S1
- Low: the snapshot `meta/0073_snapshot.json` keeps the 0071 `prevId`. The orchestrator fixes the chain after lane C adds 0072.
- Low: `journal-integrity` idx test and 2 deploy-gate tests fail until 0072 and the cloudbuild tag exist (merge step).
- Low: an ETL attempt copy holds empty `activities` and `steps` (legacy duplicates have no activity rows).
- Low: `closeAttemptInTx` makes 6 to 7 selects per student. For 30 students this is about 200 queries in one transaction; check the time on the rehearsal clone in S3/S4.
- Lesson: `drizzle-kit generate` numbers from the journal (next idx 72). Rename the SQL, the snapshot, and the journal entry by hand when another lane takes the number.
- Lesson: a domain test that imports a new db table needs a rebuilt `packages/db/dist` (direct tsc, under the lock).

## Phase S2
- Low: the keys `restart.*`, `attempt`, `attemptXp`, `historyNote`, `previewNote` are English in `th`, `cn`, `tw`, `vi` (no approved text). Only `startAgain` and `restarting` use the legacy text.
- Low: the "Attempt N" banner shows only for attempts made in the same page session. S4 must return the attempt number from `getLessonSummaryData`.
- Low: the legacy label is "Start Again" (capital A); the design said "Start again". The legacy text won.
- Low: the dialog has no focus trap and no Escape key; Cancel has autofocus. A shared dialog primitive would fix this.
- Low: `closed:false` (no work) still opens task 1 without an error; this is intended.
- Shortcut: the look-check captures use a browser bundle with stubbed actions, not the running app.
- Medium (pre-existing): `component-deduplication-behavior` and `loading-state-flow.behavior` tests fail to load: `packages/sales-knowledge/dist/.../release-candidate.json` is missing in this worktree.
- Lesson: a client file that imports `@/lib/student-view` pulls server code into an esbuild browser bundle; alias it to a stub in the harness.

## Phase S3
- Low: the dialog text has no student count (design key `teachAgainStudents` is not built). The domain pacing read has no count of students with work. S4 can add it with the attempt counts.
- Low: the keys of S3 are English in `th`, `cn`, `tw`, `vi` (no approved text).
- Low: the dialog has no focus trap and no Escape key (same as S2); Cancel has autofocus.
- Low: "Taught N times" counts runs with a taught time and shows from 2. "Taught 1 time" (spec check A4) is not shown; the plain "Taught <date>" line shows instead.
- Low: `earlier_runs` stores dates as ISO strings (JSON copy in `teachLessonAgain`); `parseEarlierRuns` drops a bad item.
- Low: a lesson without an article link does not close student attempts (only the run moves).
- Low: the 30-student close is 587 ms on a local copy. The close makes about 7 selects for each student. A batch read would cut this if a class grows.
- Shortcut: the look-check captures use a copy of the row markup of the page with the real `LessonActions`, not the running app.
- Lesson: vitest 4 reports a mock that rejects a promise (`mockRejectedValue`) as a failed test even when the code catches it. Throw synchronously in the mock for a caught audit error.
- Lesson: a `vi.fn()` insert mock returns the same object each call, so read every `values` call from `mock.insert.mock.results[0].value.values.mock.calls`.
