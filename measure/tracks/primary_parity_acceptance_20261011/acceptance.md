# Acceptance: primary_parity_acceptance_20261011 (kit smoke run)

- Date: 2026-10-12
- Legacy revision: bfea121 (local build, Next.js 16, node 24, npm 10 `ci`)
- New commit: 0048f9620 (the build inputs equal those of the phase start sha 4e7969680)
- Copies: primary_legacy_20261011 (C4 backup), primary_parity_20261011 (ETL with the three inputs)
- Clones of the run (dropped after the run): primary_legacy_run_20261011, primary_parity_run_20261011
- Widths 375 and 1280, scheme light. Captures and report: private folder (real names), copy for the owner in `~/Desktop/primary-parity-progress/captures/acceptance/smoke/`.

| Pair | Check | Result | Note |
| --- | --- | --- | --- |
| SYS-01 | Legacy has metric cards; new has heading and "System Dashboard Description" only | difference as expected (AC-1) | Legacy: Total Sessions, Active Users, tabs Overview, Activity, AI Insights. New: two text lines. |
| ADM-01 | Legacy has KPI cards; new has three "Data unavailable" cards | difference as expected (AC-1) | The new page also shows sample numbers (327, 187, 1,168). |
| STU-05 | Finished lesson summary: legacy has a restart button; new has none | difference as expected (AC-1) | Legacy "Start Again" button; new page opens at "Step 14 of 14: Lesson Summary" with no restart. |

Acceptance criteria of the kit:

- AC-1 pass. AC-2: the same `users.id` signed in to both apps for SYSTEM, ADMIN, and STUDENT. TEACHER has no smoke pair, so its sign-in did not run.
- AC-3 pass: a search for the 24 kit passwords, temporary passwords, and class code in `measure/`, `scripts/`, `docs/`, the captures, the logs, and the owner copy gave 0 hits.
- AC-4: the guard tests passed in phase 2 and 3 (no change in this run).
- AC-5 pass: `git -C ~/Desktop/primary-advantage status --short` is empty; `git diff --stat 4e7969680..HEAD -- apps/primary-advantage packages pnpm-lock.yaml` is empty.
- AC-6: `~/Desktop/primary-parity-acceptance/timing.md` has the time and `free -m` of each heavy step. Each step ran under the shared lock.

Finding for the ETL (not a kit fault): in the first run the student was `cmhxdhv81000ds60darbzij2k`.
The legacy summary showed "Task 14 of 14", but the new page showed "Step 1 of 14". The legacy student had two
`user_lesson_progress` rows for one article (one with `assignment_id`, one without). The ETL kept the latest row
(the one with no `assignment_id`). The new app looks up progress by assignment, so it lost the finished state.
Only 28 of 263 new `lesson_progress` rows have an `assignment_id` (legacy: 40 of 289). The second run used a
student whose kept row has the assignment (`cmhxdhv80000as60dgrt01rma`).

Owner look check: pending (async).
