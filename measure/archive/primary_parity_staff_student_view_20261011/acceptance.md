# Acceptance: primary_parity_staff_student_view_20261011

- Date: batch capture (orchestrator)
- Legacy revision: bfea121
- New commit: batch capture (orchestrator)
- Copies: primary_legacy_20261011, primary_parity_20261011

Prepared files in this folder: `acceptance-pairs.json` (19 pairs, SSV-A1 to SSV-A19),
`acceptance-steps-student-view-book.ts`, `acceptance-steps-student-view-lesson.ts`, `behavior-contract.md`,
and `acceptance-data-checks.sql`. The block "staff ..." in `scripts/primary-parity/cutover-check.mjs`
(kit FR-13) runs for rehearsal 3.

## Notes for the batch run

- Sign in four users: a teacher, an admin, a SYSTEM user, and a student. The teacher needs a class with an
  assigned class book (run the class book browser check first), or pairs SSV-A17 and SSV-A18 fail.
- Pairs SSV-A12 to SSV-A15, SSV-A17, and SSV-A18 are "new only": legacy has no avatar, shop, Class Quest,
  Reedy, or class book. The legacy side shows a reference page. Mark the result "difference on purpose".
- The legacy path of SSV-A2 uses the raw legacy article id; only the new path uses `{map:article:...}`.
- Staff see the hero picker on the avatar page (SSV-A12). This is intended. Save stays off.
- The 15 copy keys that S3 added (`emptyTitle`, `homeHeroTitle`, `homeHeroLine`, `emptyLesson`, `emptyBooks`,
  `emptyReading`, `emptyQuest`, `emptyHistory`, `emptyReports`, `emptySentences`, `emptyVocabulary`,
  `questNoClass`, `reedyStudentsOnly`, `reedyStudentsOnlyLine`, `gameSampleWords`) are English text in
  th, cn, tw, and vi. Do not fail a Thai, Chinese, or Vietnamese capture for this. The owner translation pass fixes it.
- The apk game page runs full screen with `save=false`. It shows no "sample words" line inside the game. Check
  this in the batch (SSV-A9) and write the result. The Word adventures page shows the notice.
- The Student view menu item is checked by hand: open the account menu of the teacher and select "Student view".
- Use 2 or 3 students only. Do not write to the shared `primary_advantage` database.
- Migration 0073 (`primary_lesson_attempts`) must exist on the copy, or the SQL file fails on that line.

## Data checks (AC-2 and AC-5)

Run `acceptance-data-checks.sql` on the `_run_` clone before and after the staff session, once for the teacher
and once for the admin and the SYSTEM user. Every column must be equal before and after.

| Staff user | Before (row) | After (row) | Equal? |
| --- | --- | --- | --- |
| TEACHER | batch capture (orchestrator) | | |
| ADMIN | batch capture (orchestrator) | | |
| SYSTEM | batch capture (orchestrator) | | |
| STUDENT control (rows must rise after a quiz) | batch capture (orchestrator) | | |

## Pairs

| Pair | Check | Result (pass, fail, difference on purpose) | Note |
| --- | --- | --- | --- |
| SSV-A1 (TEACHER) | SSV-A1-a | batch capture (orchestrator) | |
| SSV-A1 (TEACHER) | SSV-A1-b | batch capture (orchestrator) | |
| SSV-A2 (TEACHER) | SSV-A2-a | batch capture (orchestrator) | |
| SSV-A2 (TEACHER) | SSV-A2-b | batch capture (orchestrator) | |
| SSV-A3 (ADMIN) | SSV-A3-a | batch capture (orchestrator) | |
| SSV-A4 (SYSTEM) | SSV-A4-a | batch capture (orchestrator) | |
| SSV-A5 (TEACHER) | SSV-A5-a | batch capture (orchestrator) | |
| SSV-A6 (TEACHER) | SSV-A6-a | batch capture (orchestrator) | |
| SSV-A7 (TEACHER) | SSV-A7-a | batch capture (orchestrator) | |
| SSV-A8 (TEACHER) | SSV-A8-a | batch capture (orchestrator) | |
| SSV-A9 (TEACHER) | SSV-A9-a | batch capture (orchestrator) | |
| SSV-A10 (STUDENT) | SSV-A10-a | batch capture (orchestrator) | |
| SSV-A11 (TEACHER) | SSV-A11-a | batch capture (orchestrator) | |
| SSV-A12 (TEACHER) | SSV-A12-a | batch capture (orchestrator) | |
| SSV-A13 (TEACHER) | SSV-A13-a | batch capture (orchestrator) | |
| SSV-A14 (TEACHER) | SSV-A14-a | batch capture (orchestrator) | |
| SSV-A15 (TEACHER) | SSV-A15-a | batch capture (orchestrator) | |
| SSV-A16 (TEACHER) | SSV-A16-a | batch capture (orchestrator) | |
| SSV-A17 (TEACHER) | SSV-A17-a | batch capture (orchestrator) | |
| SSV-A18 (TEACHER) | SSV-A18-a | batch capture (orchestrator) | |
| SSV-A19 (SYSTEM) | SSV-A19-a | batch capture (orchestrator) | |

## Go/no-go script

| Block | Expect | Result |
| --- | --- | --- |
| `staff teacher ...` checks (11 pages, read article, Exit preview, class book, lesson) | all pass | batch capture (orchestrator) |
| `staff admin ...` checks | all pass | batch capture (orchestrator) |
| `staff system ...` checks | all pass | batch capture (orchestrator) |

## Captures (AC-3, AC-6)

Widths 375 px and 1280 px, light and dark. Capture paths: batch capture (orchestrator).

Owner look check: pending
