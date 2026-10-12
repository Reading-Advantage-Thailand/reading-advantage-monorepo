# Acceptance: primary_parity_quick_fixes_20261011

- Date: 2026-10-12 (batch capture 1)
- Legacy revision: bfea121
- New commit: 0c9356701
- Copies: primary_legacy_20261011, primary_parity_20261011

Prepared files in this folder: `acceptance-pairs.json` (15 pairs, AC-1 to AC-13), the steps modules
`acceptance-steps-fr13-new.ts` and `acceptance-steps-fr13-old.ts`, the behavior contracts
`behavior-contract-fr3.md`, `-fr5.md`, `-fr6.md`, `-fr11.md`, and `migrated-data-checks.sql`.

## Notes for the batch run

- AC-12 needs the merge of `primary/public-pages` (commit `c7228ab74`). Without the merge, the new footer shows the old link.
- AC-13a and AC-13b read the class codes from the environment: `PARITY_NEW_CLASS_CODE` (a 6-character code of a
  class made on the clone) and `PARITY_OLD_CLASS_CODE` (an 8-character migrated code). Read the old code from
  the clone, for example the class with id `14285370-b59a-41a5-a7f1-d34fc2268554`. Never write a code in a file.
- The FR-13 rehearsal check needs a migrated 8-character class code. The copy has 12 classes with 8 characters.
- Steps that a page capture cannot show (toasts, dialogs, a quiz finish, a game, a code-only session) are manual
  steps on the clone. Use 2 or 3 students only.
- The legacy article ids in the pair list are in `primary_legacy_id_map` (table `article`, `classrooms`).

## Migrated data checks

Run on `primary_parity_20261011`, read only, on 2026-10-12. Counts only. The SQL is in `migrated-data-checks.sql`.

| FR | Result on the copy | Note |
| --- | --- | --- |
| FR-1 | 31 classes, 19 with no grade, 0 archived | Grade is nullable; the dialog edits it. |
| FR-3 | 5 students with activity in the last 7 days; newest activity 2026-10-07 | The copy has old dates. Make one activity in both apps first. |
| FR-5 | 14 distinct progress values from 7 to 100 on unfinished lessons | The reader maps each value to a task (7 gives task 2). |
| FR-6 | `completed = false` rows: LA 50, MC 22, SA 21; 0 duplicate groups | The case of the old defect exists in the copy. |
| FR-7 | 390 finished SA rows, 376 with details | Pick an article with details. |
| FR-9 | 626 articles, all with a sentences array, the shortest has 4 | Three articles with 7 or more sentences are in the pair list. |
| FR-10 | 643 students, XP from 0 to 150000 | Read `users.xp` of the matched student before and after the game. |
| FR-11 | 126 logs saved, 401 not saved; 81 logs with three quizzes done and not saved | Decks: 172 vocabulary, 172 sentence. |
| FR-13 | Class code lengths: 12 classes with 8 characters, 1 with 9 | A migrated 8-character code exists for the old-link check. |

## Pairs

Built at 0c9356701 with fresh package `dist` folders. Legacy student sessions were redirected to sign-in on the article pages (AC-5, 6, 7, 10, 11), so only the new side exists for them.

| Pair | Check | Result (pass, fail, difference on purpose) | Note |
| --- | --- | --- | --- |
| AC-1 | AC-1-a | not checked (manual) | The list shows the migrated classes with grades, equal to legacy. The edit dialog needs the manual step. |
| AC-2 | AC-2-a | fail | The admin student list is empty in the new app ("No students found", tiles 0). Legacy shows 3 students. The server log has `getStudentsController`: `Reduce of empty array with no initial value`. Likely file: `server/models/studentModel.ts:640` (reduce of `Object.entries(levelCounts)` with no initial value) and the empty student set for the matched admin. Toasts need the manual step. |
| AC-3 | AC-3-a | difference on purpose | Four tiles. New fourth tile: 100% and "1 of 1 students" (the kit student was active during the run). Legacy: 0%, "0 of 1" (E-3). |
| AC-3 | AC-3-b | not checked | No SQL compare in this run. The 1 of 1 matches the one kit student. |
| AC-4 | AC-4-a | fail (pair data) | Both apps show "Classroom not found". The mapped class is not in the kit teacher's school (log: `The class is not in your school`). Use a class of the kit teacher. The Settings click is manual. |
| AC-5 | AC-5-a | not checked (legacy side) | New app opens the lesson at "Step 1 of 14" for an article with progress 0. The legacy student session was redirected to the code sign-in page, so no comparison. Progress above 0 not tested. |
| AC-6 | AC-6-a | not checked (manual) | The double-click quiz finish is a manual step. New page loads (chip "Flashcard: Not Saved"). Legacy was redirected to sign-in. |
| AC-7 | AC-7-a | not checked | Task 8 needs interaction. New lesson page loads; legacy was redirected to sign-in. |
| AC-8 | AC-8-a | pass (partial) | New page shows "Display name" and "Sign-in username" (read-only) labels. Legacy shows one "Username" field. The change and the header update are manual. |
| AC-8 | AC-8-b | not checked (manual) | Code-only session needed. |
| AC-9 | AC-9-a | pass | The text file of the new capture equals legacy for all sentences, in order. Only the header lines differ (the new page drops RA Level; new disclaimer text). The 3-block layout was not checked in the PNG. |
| AC-9b | AC-9b-a | pass | Same result as AC-9. |
| AC-10 | AC-10-a | not checked (manual) | New rune-match page loads at the 3D route. The game play and the XP read are manual. Legacy was redirected to sign-in. |
| AC-11 | AC-11-a | pass (partial) | New page shows "Flashcard: Not Saved" for the kit student on an unsaved article. The saved case was not checked. |
| AC-11 | AC-11-b | not checked (manual) | Needs the three quizzes and SQL. |
| AC-12 | AC-12-a | fail (known) | The new footer has no "Support" link. Legacy has one. The branch `primary/public-pages` (c7228ab74) is not merged in this build. |
| AC-13a | AC-13a-a | fail (pair data) | The new app shows "This code does not work" for the 6-character code. The env query took the first class, which has 0 students. Use a class with students. Legacy shows "Invalid Classroom Code" (difference on purpose). |
| AC-13b | AC-13b-a | pass | New app shows "This link has an old class code. Type the code that your teacher shows." and an empty input. Legacy shows "Invalid Classroom Code" for the same code in this copy. |

Owner look check: pending (owner, async). Report: `~/Desktop/primary-parity-acceptance/captures/primary_parity_quick_fixes_20261011/report.html`. The design captures of Phase 1 are in
`/home/daniebo/Desktop/primary-parity-progress/captures/quick_fixes/phase1-design/`.
