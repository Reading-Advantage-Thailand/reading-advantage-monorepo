# Implementation Plan: Remove the void Storytime code from Primary

> **Track ID:** `primary_storytime_removal_20261107` · **Spec:** [spec.md](./spec.md) · **Parent plan:** [storytime_app_rebuild_20261025/plan.md](../storytime_app_rebuild_20261025/plan.md) (task 7.1)
> **Dates:** Phase 1 local commits on 2026-11-07. Phase 2 follows the next Primary deploy by the team.

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done, and `[b] … deferred:<owner>` at a human gate. A task in phase N+1 starts only after the heading of phase N has its checkpoint (measure-guard).
- An `[x]` note names the commit and the evidence class: automated, person-checked, or owner-passed.
- Hard gates stay with Daniel: deploys, deletions of production data, and public dates. No push and no deploy.
- Each task follows `measure/workflow.md`: tests first, then code, then one commit with `(track_id: primary_storytime_removal_20261107)`. The commit header is 100 characters or less.
- Stage named paths only. Other sessions commit on master. Never run `git add -A` or `git add .`.
- Heavy steps run through `HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`, one job at a time. Vitest uses `--maxWorkers=1` and targeted files.
- Paths start at the monorepo root. The bucket prefix `gs://primary-app-storage/storytime/` stays untouched.
- No new hash, checksum field, or provenance file (AGENTS.md hashing policy).
- At the end of each phase, run the phase check and append `[checkpoint: <sha>]` to the phase heading.

## Phase 1: Removal

Blast radius: `apps/primary-advantage` only (25 deletions, 9 edits). `apps/storytime` and `packages/` do not change.

- [ ] 1.1 Spec review and test strategy. A reviewer of another model family than `claude-code/claude-sonnet-5-5` reviews `spec.md` and `plan.md`. The strategy role assigns the review gates (A, B, C) and writes `test-strategy.md`. Evidence class: automated (review report).
- [ ] 1.2 Start check (read only), in two parts. Part (a): each of the 25 DELETE paths and each of the 9 EDIT paths of spec section 2 exists (`test -e`). A missing path stops the task. Part (b): run `rg -il storytime apps/primary-advantage --glob '!node_modules' --glob '!.next'`. Each file that the scan lists must be in DELETE, EDIT, or KEEP. A listed file in none of the three lists stops the task. A path in DELETE or EDIT that the scan does not list is not a fault, because the scan reads file contents only (for example `content/storytime/media-list.txt` and `lib/storytime/__tests__/blend.test.ts`). Record `delete_paths=25`, `edit_paths=9`, `scan_files_outside_lists=0`, and `git rev-parse HEAD` as the phase base. A stop goes to the orchestrator. Evidence class: automated.
- [ ] 1.3 Red test. Write `apps/primary-advantage/__tests__/storytime-removed.test.ts` (AC-1.1, AC-1.2, AC-1.3, AC-1.4). It asserts that the path list and the source scan are not empty before each property check. Run it red: each failure is an assertion on the present files, and no file fails to load. Commit the Red test alone. Evidence class: automated.
- [ ] 1.4 Green: one deletion commit. Delete the 25 files and make the 9 edits of spec section 2. Run the Primary tests of the touched files, then the Red test, then the proxy and route-policy tests. Stage named paths only. Commit subject: `refactor(primary): remove the void storytime code (track_id: primary_storytime_removal_20261107)`. Evidence class: automated.
- [ ] 1.5 Gates on one HEAD. Run through `heavy-run`, one job at a time: the targeted Primary vitest files (`--maxWorkers=1`), `tsc --noEmit` for `primary-advantage` (strategy G4: the error list equals the before-run), ESLint of the touched files (0 errors and 0 warnings, strategy G5; the whole app has at most 13 errors, strategy G9), and `apps/storytime/__tests__/phase1-boundary.test.ts`. Check AC-1.7 with `git diff --stat` over the KEEP paths. Evidence class: automated.
- [ ] 1.6 Review A (correctness, callers). Run `build-graph callers` for the removed exports if the graph is fresh. Evidence class: automated (review report).
- [ ] 1.7 Review B (security: routing). The host rule leaves `proxy.ts`. Review B checks that no auth, role, or callback route changes, and that the removal opens no path that was closed. Evidence class: automated (review report).
- [ ] 1.8 Review C (route and message contract). Review C checks that no route, message key, or import still names a removed path. Evidence class: automated (review report).
- [ ] 1.9 Adversarial tests (risk based). The adversarial role, not Green, writes ONE new file: `apps/primary-advantage/__tests__/storytime-removal-adversarial.test.ts`. It holds three cases: a path under `/st/` returns the Primary 404 and not a 500; a `Host: storytime.reading-advantage.com` request is not rewritten by Primary; the service worker registers on a normal host. A defect that a case finds goes back to Green. Evidence class: automated.
- [ ] 1.10 Phase acceptance. The acceptance role checks AC-1.1 to AC-1.8 at an immutable HEAD. Append `[checkpoint: <sha>]` to this heading. Evidence class: automated.

## Phase 2: Production leaves the route

- [b] 2.1 The next Primary deploy by the team carries the deletion commit. Target: the next Primary deploy. Tests: AC-2.1. deferred:daniel
- [b] 2.2 After the deploy, request `https://primary.reading-advantage.com/th/st/2/1`. It must not answer with the void Storytime page. Record the command and the status. Tests: AC-2.2. deferred:daniel

## Phase 3: Closeout

Phase 3 starts after the Phase 2 deploy record exists, or after Daniel's word to close with the Phase 2 tasks open.

- [ ] 3.1 Final acceptance at an immutable HEAD, after the phase gates. Then closeout: archive the track, update `measure/tracks.md`, and mark the parent task 7.1 code part done. The two `[b]` tasks of Phase 2 stay as `[b]` and carry the deploy record when it exists.
