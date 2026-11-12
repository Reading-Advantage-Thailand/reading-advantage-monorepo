# Implementation Plan: Master push readiness

> **Track ID:** `master_push_readiness_20261112` · **Spec:** [spec.md](./spec.md)
> **Due:** Phase 1 on 2026-11-15 (PM decision 2). Phase 2 starts after the deploy word list goes to Daniel.
> No push. No deploy. No IAM change.

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done, and `[b] … deferred:<owner>` at a human gate. An `[x]` note names the commit and the evidence class: automated, person-checked, or owner-passed.
- Tests first. The Red task writes the test and shows it fail at the base. The Green task makes the test pass with the least change.
- Phase 1 uses light roles only. Red runs on a model family other than the Green family. The orchestrator sets the models.
- Stage named paths only. Never run `git add -A`, `git add .`, or `git add -u`. Commit with a pathspec: `git commit -m <msg> -- <paths>`.
- No push, no deploy, no amend, no `--no-verify`, no `git reset`, `checkout`, `restore`, `revert`, or `stash`.
- No `gcloud` or `gh` command that writes. No IAM change.
- No new hash, checksum, or manifest (`AGENTS.md`, Hashing and Provenance Policy).
- Do not edit `apps/codecamp-advantage/scripts/configure-review-worker-scheduler.sh`. Do not edit the plan of `codecamp_pr_review_recovery_20260820`.
- Commit headers are 100 characters or less and use a lower-case subject. Each header carries `(track_id: master_push_readiness_20261112)`.
- Heavy runs go through `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh` with `HEAVY_PRIORITY=p2`, and vitest runs with `--maxWorkers=1`.

## Phase 1: fix the failing cd-apps codecamp job (due 2026-11-15, light roles only)

Blast radius: `apps/codecamp-advantage/cloudbuild.yaml`, `apps/codecamp-advantage/cloudbuild-traffic.yaml`, `apps/codecamp-advantage/lib/__tests__/review-worker-deployment-contract.test.ts`, `scripts/ci/__tests__/cloudbuild-files.test.mjs`, and the codecamp section of `docs/runbooks/traffic-moves.md`. No product symbol changes.

- [ ] 1.1 Red: the push file holds no scheduler step. Add a case to `scripts/ci/__tests__/cloudbuild-files.test.mjs` that fails when any `apps/*/cloudbuild.yaml` calls `gcloud scheduler` or runs a script that calls it. The message names the offending file. Add a fixture case that proves the check fails on a push file with the call.
  - Check: the new case fails at the base, because `apps/codecamp-advantage/cloudbuild.yaml` runs the scheduler script. The fixture case passes.
  - Commit: `test(ci): fail a push file that calls gcloud scheduler (track_id: master_push_readiness_20261112)`.
- [ ] 1.2 Red: the traffic file holds the step. Change F-11 and F-16 of `scripts/ci/__tests__/cloudbuild-files.test.mjs` to list the codecamp step `configure-review-worker-scheduler` after `update-traffic`. Change `review-worker-deployment-contract.test.ts` to read `cloudbuild-traffic.yaml` for the step and for the `availableSecrets` entry of the tick token. Keep the `--set-secrets` check on `cloudbuild.yaml`.
  - Check: F-11, F-16, and the contract test fail at the base.
  - Commit: `test(ci): expect the codecamp scheduler step in the traffic file (track_id: master_push_readiness_20261112)`.
- [ ] 1.3 Green: move the step. In `apps/codecamp-advantage/cloudbuild.yaml`, remove the step `configure-review-worker-scheduler` and the `availableSecrets` entry. Keep the tick token in `--set-secrets`. In `apps/codecamp-advantage/cloudbuild-traffic.yaml`, add the step after `update-traffic` with `PROJECT_ID`, the `secretEnv`, and the `availableSecrets` entry. Keep `bind-release-source` first. Update the file header comments of both files for the new order.
  - Check: the tests of tasks 1.1 and 1.2 pass.
  - Commit: `fix(ci): move the codecamp scheduler step to the traffic file (track_id: master_push_readiness_20261112)`.
- [ ] 1.4 Green: the runbook. In the codecamp section of `docs/runbooks/traffic-moves.md`, name the step `configure-review-worker-scheduler` and its order. State that the Cloud Build service account needs `cloudscheduler.jobs.get`, `cloudscheduler.jobs.create`, and `cloudscheduler.jobs.update`, and that the grant is a precondition of the first traffic move.
  - Check: F-16 passes.
  - Commit: `docs(ci): name the codecamp scheduler step and its IAM precondition (track_id: master_push_readiness_20261112)`.
- [ ] 1.5 Gates at one HEAD: run `node --test` or the vitest command that the repository uses for `scripts/ci/__tests__/cloudbuild-files.test.mjs`, and run `review-worker-deployment-contract.test.ts` with `--maxWorkers=1`. Run `bash measure/doctor.sh` only when the doctor track has closed. Run `grep -n "gcloud scheduler" apps/*/cloudbuild.yaml`. Record each exit code.
  - Check: the named tests pass, and the grep prints no line. This is the Phase 1 done-when.
- [ ] 1.6 Tell the owner of `codecamp_pr_review_recovery_20260820` about the move. The Monorepo orchestrator sends a short message. No edit of that plan.
- [b] 1.7 deferred:daniel — IAM grant. Daniel grants `cloudscheduler.jobs.get`, `cloudscheduler.jobs.create`, and `cloudscheduler.jobs.update` to the Cloud Build service account of project `reading-advantage`, before the first codecamp traffic move. Do not grant it in this track.
- [b] 1.8 deferred:daniel-push — after Daniel's push word, the next `cd-apps` run ends in `success` for codecamp-advantage. Record the run id.

## Phase 2: the old Primary test failures (starts after the deploy word list of the push goes to Daniel; not a push blocker)

Context: the Primary vitest run of 2026-11-12, after merge `9734e0187`, showed 4 test failures and 2 suites that do not load. They also fail on `origin/master` `2b8c25d9e`, which serves the live Primary revision `primary-advantage-00140-fhl`. Live has them too.

- [ ] 2.0 List the items. Run the Primary vitest suite once, read-only, through `heavy-run.sh` with priority p2 and `--maxWorkers=1`. Write a list in this plan: each failing test by file and test name, each suite that does not load by file, and the failure reason of each.
  - Check: the list holds 4 failing tests and 2 suites, or states the difference with the run of 2026-11-12.
  - Commit: `docs(measure): list the old primary test failures (track_id: master_push_readiness_20261112)`.
- [ ] 2.1 Classify each item as a test defect, a product defect, or an environment defect. Record the class and the owner next to each item.
- [ ] 2.2 Red and Green, one pair of tasks per item: write or repair the test first, show it fail for the stated reason, then make the least change that passes. Tasks 2.2a and later are added after task 2.1.
- [ ] 2.3 Phase check: the Primary vitest run shows no failing test and no suite that does not load. Record the exit code.
