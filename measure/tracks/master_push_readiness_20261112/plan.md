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

Blast radius: `apps/codecamp-advantage/cloudbuild.yaml`, `apps/codecamp-advantage/cloudbuild-traffic.yaml`, `apps/codecamp-advantage/lib/__tests__/review-worker-deployment-contract.test.ts`, `scripts/ci/__tests__/cloudbuild-files.test.mjs`, `scripts/ci/__tests__/helpers/plan.mjs` (a new helper only; `ordered` stays unchanged), and the codecamp section of `docs/runbooks/traffic-moves.md`. No product symbol changes.

- [ ] 1.1 Red: the push file holds no scheduler step. Add case F-20 to `scripts/ci/__tests__/cloudbuild-files.test.mjs`. The case reads `apps/codecamp-advantage/cloudbuild.yaml`, resolves each script path that a step runs to the repository file, and fails when the step text or that script file holds `gcloud scheduler`. Put the helper in `scripts/ci/__tests__/helpers/plan.mjs`, beside the other helpers. The check covers that one file only, because the A-52 step `schedule-intake-job` in `apps/accounting/cloudbuild.yaml` is part of the A-52 design. The message names the offending file. The fixture case uses an inline YAML string and an inline script text, and it proves that the check fails on them. Add case F-21: it fails when `apps/codecamp-advantage/cloudbuild.yaml` holds a `secretEnv` entry or an `availableSecrets` entry for `CODECAMP_REVIEW_WORKER_TICK_TOKEN`. The `--set-secrets` entry `REVIEW_WORKER_TICK_TOKEN=CODECAMP_REVIEW_WORKER_TICK_TOKEN:latest` stays and stays checked. Update the header comment of `cloudbuild-files.test.mjs` (line 4) to name F-20 and F-21.
  - Check: F-20 and F-21 fail at the base, because the push file runs the scheduler script and holds the secret entries. The fixture case passes.
  - Commit: `test(ci): fail a push file that calls gcloud scheduler (track_id: master_push_readiness_20261112)`.
- [ ] 1.2 Red: the traffic file holds the step. Change F-11 and F-16 of `scripts/ci/__tests__/cloudbuild-files.test.mjs` to list the codecamp steps `migrate-db`, `doctor-check`, `configure-review-worker-scheduler`, `update-traffic`. The helper `ordered` stays unchanged. Change `review-worker-deployment-contract.test.ts` to read `cloudbuild-traffic.yaml` for the step and for the `availableSecrets` entry of the tick token. Keep the `--set-secrets` check on `cloudbuild.yaml`.
  - Check: F-11, F-16, and the contract test fail at the base.
  - Commit: `test(ci): expect the codecamp scheduler step in the traffic file (track_id: master_push_readiness_20261112)`.
- [ ] 1.3 Green: move the step. In `apps/codecamp-advantage/cloudbuild.yaml`, remove the step `configure-review-worker-scheduler` and the `availableSecrets` entry. Keep the tick token in `--set-secrets`. In `apps/codecamp-advantage/cloudbuild-traffic.yaml`, add the step directly before `update-traffic`, after `doctor-check`, with `PROJECT_ID`, the `secretEnv`, and the `availableSecrets` entry. Keep `bind-release-source` first and `update-traffic` last. Set the header order line of the traffic file (line 7) to: "Order: release source bind, migrate, doctor check, review worker scheduler, traffic move." Update the header comments of the push file for the removed step.
  - Check: the tests of tasks 1.1 and 1.2 pass.
  - Commit: `fix(ci): move the codecamp scheduler step to the traffic file (track_id: master_push_readiness_20261112)`.
- [ ] 1.4 Green: the runbook. In the codecamp section of `docs/runbooks/traffic-moves.md`, name the step `configure-review-worker-scheduler`. Set the step list and the order line to: "Order: release source bind, migrate, doctor check, review worker scheduler, traffic move." The general rule at line 17 stays unchanged. State that the Cloud Build service account needs `cloudscheduler.jobs.get`, `cloudscheduler.jobs.create`, and `cloudscheduler.jobs.update`, and that the grant is a precondition of the first traffic move.
  - Check: F-16 passes.
  - Commit: `docs(ci): name the codecamp scheduler step and its IAM precondition (track_id: master_push_readiness_20261112)`.
- [ ] 1.5 Gates at one HEAD. From the repository root, run these four commands. Each runs through `HEAVY_PRIORITY=p2 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && <command>'`:
  - `CI=true pnpm exec vitest run scripts/ci`
  - `pnpm exec vitest run apps/codecamp-advantage/lib/__tests__/review-worker-deployment-contract.test.ts --maxWorkers=1`
  - `pnpm exec vitest run packages/db/src/__tests__/deploy-gate-contract.test.ts packages/db/src/__tests__/codecamp-0049-ledger-gap-deploy-contract.test.ts --maxWorkers=1`
  - `pnpm exec vitest run apps/accounts/scripts/production-readiness.test.ts --maxWorkers=1`
  - If one command does not run in the checkout, check it read-only and record the command that does run.
  - Run `bash measure/doctor.sh` only when the doctor track has closed. Run `grep -n "gcloud scheduler" apps/codecamp-advantage/cloudbuild.yaml`. Record each exit code.
  - Check: the four commands pass, and the grep prints no line. This is the Phase 1 done-when.
- [ ] 1.6 Tell the owner of `codecamp_pr_review_recovery_20260820` about the move. The Monorepo orchestrator sends a short message. No edit of that plan.
- [b] 1.7 deferred:daniel — IAM grant. Daniel grants `cloudscheduler.jobs.get`, `cloudscheduler.jobs.create`, and `cloudscheduler.jobs.update` to the Cloud Build service account of project `reading-advantage`, before the first codecamp traffic move. The grant is also needed before the first push of master that carries commit `fd6a99142`, if the accounting scheduler starts at that push (see spec section 2.7). Do not grant it in this track.
- [b] 1.8 deferred:daniel-push — after Daniel's push word, the next `cd-apps` run ends in `success` for codecamp-advantage. Record the run id.
- [ ] 1.9 Push check (read-only, before the deploy word list goes to Daniel): A-52 Phase 3 is accepted, and `grep -n 'gcloud scheduler' apps/*/cloudbuild.yaml` and the scripts those push files run print no line, or each line is named on the deploy word list with its IAM grant. Review A of A-52 Phase 3 holds this risk as finding F301.

## Phase 2: the old Primary test failures (starts after the deploy word list of the push goes to Daniel; not a push blocker)

Context: the Primary vitest run of 2026-11-12, after merge `9734e0187`, showed 4 test failures and 2 suites that do not load. They also fail on `origin/master` `2b8c25d9e`, which serves the live Primary revision `primary-advantage-00140-fhl`. Live has them too.

- [ ] 2.0 List the items. Run the Primary vitest suite once, read-only: `HEAVY_PRIORITY=p2 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/primary-advantage && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1'`. The runner of `apps/primary-advantage` is vitest (checked: `"test": "vitest run"`, `vitest.config.ts`, and `../../node_modules/.bin/vitest` exist). Write a list in this plan: each failing test by file and test name, each suite that does not load by file, and the failure reason of each.
  - Check: the list holds 4 failing tests and 2 suites, or states the difference with the run of 2026-11-12.
  - Commit: `docs(measure): list the old primary test failures (track_id: master_push_readiness_20261112)`.
- [ ] 2.1 Classify each item with this rule. Record the class next to each item. The owner of every Primary item is the Monorepo orchestrator.
  - A test defect: the test asserts old behavior that the product changed on purpose.
  - A product defect: the product breaks a stated rule or contract.
  - An environment defect: the failure depends on the machine, a missing service, or a missing file outside git.
- [ ] 2.2 Add tasks after task 2.1: one Red task and one Green task for each test defect and each product defect, and one task for each environment defect that records the cause and the fix of the setup. A Red task writes or repairs the test first and shows it fail for the stated reason. A Green task makes the least change that passes. Each added task names its file and test name.
- [ ] 2.3 Phase check: run the command of task 2.0 again. The run shows no failing test and no suite that does not load. Record the exit code.
