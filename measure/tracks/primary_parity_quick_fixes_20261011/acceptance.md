# Acceptance: primary_parity_quick_fixes_20261011

- Date: pending (batch capture by the orchestrator)
- Legacy revision: bfea121
- New commit: pending
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

| Pair | Check | Result (pass, fail, difference on purpose) | Note |
| --- | --- | --- | --- |
| AC-1 to AC-13 | see `acceptance-pairs.json` | batch capture (orchestrator) | |

Owner look check: batch capture (orchestrator). The design captures of Phase 1 are in
`/home/daniebo/Desktop/primary-parity-progress/captures/quick_fixes/phase1-design/`.
