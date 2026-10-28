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

- [ ] 0.1 Record the six-field entry format in spec section 4. The orchestrator sends it to the PM. This task only writes the spec. Test: AC-1.
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

## Out of scope

- Push and deploy. The push to `origin/master` stays with Daniel.
- New design, a new page, a new image or a new feature. The batch records these and sends them to the PM orchestrator.