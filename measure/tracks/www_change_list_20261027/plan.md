# Implementation Plan: www change list (standing)

> **Track ID:** `www_change_list_20261027` · **Spec:** [spec.md](./spec.md)
> **Request:** Daniel, 2026-10-26, tracks page row E8. A standing track that builds PR's weekly www copy changes.
> **Standing:** no end date. One weekly batch runs per phase.

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done, and `[b]` at a human gate.
- Each task line names its acceptance criterion in the form `Test: AC-n`.
- Each task follows `measure/workflow.md`: the test comes first, then the code, then one commit with `(track_id: www_change_list_20261027)`. The commit header is 100 characters or less.
- The batch branch is `www/changes-YYYY-MM-DD`. It starts from `master` and lives in a worktree under `/home/daniebo/Desktop/rama-worktrees/`.
- Pathspec commits only. No `git add -A`, no `git commit -a`, no stash, no reset. Other sessions commit in this tree.
- Every heavy command runs through `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
- No push and no deploy. The push to `origin/master` is Daniel's gate.

## Phase 0: Set-up

- [~] 0.1 Record the six-field entry format in spec section 4. The orchestrator sends it to the PM. This task only writes the spec. Test: AC-1.
- [ ] 0.2 Record the www locale list and the page list in spec section 10, read from `apps/www-reading-advantage`. Test: AC-2.
- [ ] 0.3 Write the weekly approval page template in spec section 11, with the row fields. Test: AC-3.

## Weekly batch template

> No phase for a week exists yet. Each Monday, the PM orchestrator sends the new entries.
> Create one phase "Week of YYYY-MM-DD" under this heading, then run W.1 to W.6 in order.

- [ ] W.1 Receive the entries. Copy every field from PR's change list. Record the week and the source. Test: AC-4.
- [ ] W.2 Tests first. Add a content test for each changed fact that has none. Run the tests against the current pages to confirm the change is missing. Test: AC-5.
- [ ] W.3 Build the copy. Put PR's copy onto the changed pages word for word. Change nothing else. Test: AC-6.
- [ ] W.4 Run the gates. Lint, typecheck and the www build, each through the heavy-run script. Test: AC-7.
- [ ] W.5 Open one live approval page for Daniel. Give it one row per changed page and locale. Test: AC-8.
- [ ] W.6 After the pass, merge the branch into local `master`. Then remove the worktree and delete the branch in the same turn. Test: AC-9.

## Batch 2026-11-19: Thai-checked rows

> Source: `/home/daniebo/Desktop/advantage-pr/11-content/www-change-list.md` v1.51, file lines 51, 52, 55, 56, 57. Branch `www/batch-20261119` from `origin/master` `ac1d09869`, worktree `/home/daniebo/Desktop/rama-worktrees/www-batch-20261119`. Thai check: Daniel, Google Tasks 2026-11-19 05:40 ICT, "All ok" — each "(draft; Daniel checks)" Thai in these rows counts as Daniel checked. Home roadmapNote takes place 2 INTERIM, not LAUNCH. W.5 and W.6 run later.

- [x] W.1 Receive the entries. The five rows and their places are recorded in this phase. Test: AC-4.
- [x] W.2 Tests first. `src/__tests__/www-batch-20261119.locale.test.ts` fails 41 of 43 (2 scope guards pass). Test commit `5945c4fb8`. Test: AC-5.
- [x] W.3 Build the copy word for word in en and th. Newer rows win on shared keys. Commit `05dad845e`. Test: AC-6.
- [x] W.4 Run the gates through heavy-run: www lint, typecheck, the www vitest suite, the www build, `affected-apps.mjs`. Lint exit 0, typecheck exit 0, suite 81 files / 2898 tests pass, build success (two SecurityFatalError nudge exits first, third attempt clean), affected `["www-reading-advantage"]`. Test: AC-7.

## Batch 2026-11-30: Storytime launch day

> Source: `/home/daniebo/Desktop/advantage-pr/11-content/www-change-list.md` v1.50, list line 50 (row 2026-11-16 app-first, LAUNCH copy of places 1, 4, 33, 34) and list line 60 (row 2026-10-27 release-state copy, places 5, 6, 7, 8). Branch `storytime-launch-day` from `origin/master`; no merge, no push; W.5 and W.6 wait for the launch day.

- [x] W.1 Receive the entries. Record the 8 launch-day keys with en, th, zh LAUNCH text. Test: AC-4. Thai check 2026-11-19: Daniel checked the Thai of rows 2026-11-16 app-first (LAUNCH Thai, places 1, 4, 33, 34) and 2026-11-16 home roadmap (Google Tasks 05:40, "All ok"). The 4 draft Thai LAUNCH lines are now Daniel checked.
- [x] W.2 Tests first. Update the storytime fixture and pin every changed key in en, th, zh. Test: AC-5. Commit `da4c5e955`.
- [x] W.3 Build the copy. Put the LAUNCH text word for word into the locale files. Test: AC-6. Commit `631d10af9`.
- [x] W.4 Run the gates. Lint, typecheck, the vitest suite, and the www build. Test: AC-7. Lint exit 0, typecheck exit 0, vitest 81 files 2876 tests exit 0, build exit 0 on retry 2. Guard commit `1915410e5`.

- [x] Roadmap-note LAUNCH (list line 51, place 2). Pin `v2.products.roadmapNote` LAUNCH en+th in the launch test, apply to home.ts en+th, leave zh on its Chinese line. One key only. Test: AC-5/AC-6/AC-7. Test commit `8fcb40a`, copy commit `964201d`. Gates: lint 0, types 0, vitest 81 files 2876 tests 0, build 0 on retry 2.

## Out of scope

- Push and deploy. The push to `origin/master` stays with Daniel.
- New design, a new page, a new image or a new feature. The batch records these and sends them to the PM orchestrator.