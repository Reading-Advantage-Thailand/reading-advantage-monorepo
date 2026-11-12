# Specification: Master push readiness

**Track ID:** `master_push_readiness_20261112`
**Type:** chore (classic FR list with acceptance checks)
**Status:** new. Opened 2026-11-12.
**Author model:** claude-code/claude-sonnet-5-5
**Due:** 2026-11-15 for Phase 1 (PM decision 2). Phase 2 has no date; it starts after the deploy word list goes to Daniel.
**Owner chain:** Daniel (owner; deploy gate and push word) → Monorepo orchestrator (track owner) → PM orchestrator (assignment A-55)
**Plan:** [plan.md](./plan.md)
**Depends on:** none. This track reads `codecamp_pr_review_recovery_20260820` and `per_app_cicd_20261107`. It does not edit their plans.

## 1. Purpose

PM assignment A-55 is the master push of about 11-17. This track holds the in-repo work that must end before that push. It holds two items:

- **Phase 1:** the failing `cd-apps` matrix job of the codecamp-advantage app. It blocks the push.
- **Phase 2:** the 4 old Primary test failures and the 2 Primary test suites that do not load. It does not block the push.

This track does not push, deploy, move traffic, or change IAM.

### 1.1 PM decisions of 2026-11-12

Quoted word for word:

> Decision 2: "Before that push: find and fix the failing cd-apps matrix job (11-09 and 11-12 runs ended in "failure"). Add it as an A-55 task, a light role, due 11-15."

> Decision 3: "The 4 old Primary test failures and the 2 suites that do not load: one follow-up task, after the push list is ready (not a push blocker, because live has them too). Name it in the A-55 plan."

## 2. Evidence

All facts below come from read-only checks of the orchestrator on 2026-11-12, 23:00 to 23:40 ICT.

### 2.1 The failing job

The workflow is `.github/workflows/cd-apps.yml`. Four runs failed on 2026-11-09 and 2026-11-12:

- run 43160466891 (11-12 05:18 UTC, head `2b8c25d9e`);
- run 43153060172 (11-12 04:10 UTC, head `4455d10f3`);
- run 42701037828 (11-09 21:17 UTC);
- run 42657605458 (11-09 16:43 UTC).

In each run, only the codecamp-advantage matrix job fails. It fails at the step "Submit Cloud Build". The four Cloud Builds fail at build step 4. They are, in project `reading-advantage`:

- `6bce2e22-5794-4c4b-a96f-c9b636d815e3`;
- `23eb44a2-8a6a-47de-841f-bdbf2c6658e6`;
- `23ed1fa3-da4b-44cc-9502-22702982982c`;
- `ab9453da-3eaf-47f7-9322-e22b8029a091`.

### 2.2 The cause

Build step 4 has the id `configure-review-worker-scheduler` (`apps/codecamp-advantage/cloudbuild.yaml` lines 53 to 62). It runs `apps/codecamp-advantage/scripts/configure-review-worker-scheduler.sh`. The scheduler job `codecamp-review-worker-tick` does not exist in `asia-southeast1`, so the script takes the create branch. The create call fails with this error:

`ERROR: (gcloud.scheduler.jobs.create.http) PERMISSION_DENIED: The principal (user or service account) lacks IAM permission "cloudscheduler.jobs.create" for the resource "projects/reading-advantage/locations/asia-southeast1" (or the resource may not exist). This command is authenticated as`

The build log names the Cloud Build service account of project `reading-advantage` as that principal. The same account runs the steps of the manual traffic build, because no traffic file sets `options.serviceAccount`.

Steps 0 to 3 pass. The candidate revision `codecamp-advantage-00016-qoc` sits on the tag `sso-candidate` with 0 % traffic. Live traffic (100 %) stays on `codecamp-advantage-00010-ts6`.

### 2.3 Context that is not the open defect

- Run 42596115488 (11-09 09:47 UTC) failed for six apps at docker build step 0. Later runs build those apps, so a later commit fixed it.
- Run 42674322779 (11-09 18:28 UTC, old workflow name "CD — gated apps") shows only a skipped matrix job.

### 2.4 The design fault

The push file is a no-traffic build (`scripts/ci/apps.json`, mode `gated`). Its step 4 creates or updates a live scheduler job. That job calls the live host `https://codecamp.reading-advantage.com/api/internal/review-worker-tick` every 2 minutes. The push therefore changes live behavior before Daniel's traffic word.

Decision D7 of `per_app_cicd_20261107` keeps live-changing steps in the traffic file. The header comments of `apps/codecamp-advantage/cloudbuild.yaml` and `apps/codecamp-advantage/cloudbuild-traffic.yaml` state the same rule.

### 2.5 Files that read the affected build files

- `apps/codecamp-advantage/lib/__tests__/review-worker-deployment-contract.test.ts`: the test "binds the route token from the canonical Secret Manager secret" reads `cloudbuild.yaml` for the `availableSecrets` entry of the tick token.
- `scripts/ci/__tests__/cloudbuild-files.test.mjs`: cases F-11 and F-16 list the codecamp traffic steps `migrate-db`, `doctor-check`, and `update-traffic`. The helper `ordered` in `scripts/ci/__tests__/helpers/plan.mjs` requires `update-traffic` as the last step of a traffic file. Line 17 of `docs/runbooks/traffic-moves.md` and AC-2.12 of `measure/archive/per_app_cicd_20261107` state the same rule.
- `packages/db/src/__tests__/deploy-gate-contract.test.ts`, `packages/db/src/__tests__/codecamp-0049-ledger-gap-deploy-contract.test.ts`, and `apps/accounts/scripts/production-readiness.test.ts` also read the codecamp push file or the traffic file.
- `docs/runbooks/traffic-moves.md`: the codecamp section (line 198 and later) is checked by F-16.

### 2.6 Interface with an active track

The track `codecamp_pr_review_recovery_20260820` owns `apps/codecamp-advantage/scripts/configure-review-worker-scheduler.sh` and the contract test. Its Phase 4 production verification waits for the deploy. This track edits the contract test only to move its file reference. It does not edit the script, and it does not edit the plan of that track. The Monorepo orchestrator tells the owner of that track about the change when the Green task ends.

### 2.7 Interface with the accounting push file (A-52)

Commit `fd6a99142` of the track `accounting_drive_intake_20261109` (A-52) adds two steps to `apps/accounting/cloudbuild.yaml`: `deploy-intake-job` (`gcloud run jobs deploy accounting-intake-poll`) and `schedule-intake-job` (`gcloud scheduler jobs create http accounting-intake-poll`). The A-52 spec asks for them (decisions D-12 and D-20, acceptance row 38). The PM deploy list of the push names "the intake job and the scheduler start" for accounting. The accounting build runs in project `reading-advantage` (`scripts/ci/apps.json`). Three facts follow:

- (a) The step `schedule-intake-job` needs the same scheduler permission for the Cloud Build service account. Without the grant, the accounting job of `cd-apps` fails at that step after the first push of master.
- (b) The step runs only `jobs create`. A second push fails when the job exists.
- (c) These two points belong to A-52. The orchestrator gives them to the A-52 Phase 3 reviews. This track does not edit accounting files.
- (d) Review A of A-52 Phase 3 holds this risk as finding F301 (`measure/runs/accounting_drive_intake_20261109/review-a-p3-05ae3b335.json`). Its default moves the accounting job and scheduler steps to a manual file.
- (e) Plan task 1.9 checks the state of this risk before the deploy word list goes to Daniel.

## 3. Decisions

### D-1 Default: option B, move the scheduler step to the traffic file

- Remove the step `configure-review-worker-scheduler` and its `availableSecrets` entry from `apps/codecamp-advantage/cloudbuild.yaml`.
- Keep `REVIEW_WORKER_TICK_TOKEN=CODECAMP_REVIEW_WORKER_TICK_TOKEN:latest` in the `--set-secrets` of the push deploy, because the runtime needs it.
- Add the step to `apps/codecamp-advantage/cloudbuild-traffic.yaml` directly before `update-traffic`, after `doctor-check`, with the secret in that file's `availableSecrets`. Keep `bind-release-source` first. The traffic move stays the last step.
- Update the contract test to read the traffic file for the step and the secret.
- Update F-11 and F-16 for the new step. Add a check that the push file `apps/codecamp-advantage/cloudbuild.yaml` does not call `gcloud scheduler`.
- Update the codecamp section of `docs/runbooks/traffic-moves.md`: name the step and its IAM precondition.

Reasons: the push stays a no-traffic build, the fix follows decision D7, and the push no longer needs a new IAM grant.

### D-2 Alternative, not chosen: option A, grant the permission

Daniel grants the scheduler permission to the Cloud Build service account, and the push file keeps the step. This option is not the default. The push then still changes live behavior before the traffic word. The PM can still choose option A. If the PM chooses it, the Green tasks of Phase 1 reduce to the IAM task, and the new check of FR-3 does not apply.

### D-3 The IAM grant is a human gate in both options

The scheduler step needs `cloudscheduler.jobs.get`, `cloudscheduler.jobs.create`, and `cloudscheduler.jobs.update` for the Cloud Build service account. In option B, the grant must exist before the first codecamp traffic move. In option A, it must exist before the next push. This track does not grant it. The plan holds one task with the tag `deferred:daniel`.

### D-4 Phase 2 is a follow-up and does not block the push

The PM decision 3 says the Primary failures are not a push blocker, because live has them too. Phase 2 starts after the deploy word list of the push goes to Daniel. Task 2.0 lists the items. Later tasks classify and fix each item test-first.

## 4. Functional requirements

### FR-1 The push file holds no scheduler step

After the change, `apps/codecamp-advantage/cloudbuild.yaml` holds no step with the id `configure-review-worker-scheduler`, no `secretEnv`, and no `availableSecrets` entry for the tick token. The `--set-secrets` list of `deploy-cloudrun` keeps `REVIEW_WORKER_TICK_TOKEN=CODECAMP_REVIEW_WORKER_TICK_TOKEN:latest`. Case F-21 fails when the push file holds a `secretEnv` entry or an `availableSecrets` entry for `CODECAMP_REVIEW_WORKER_TICK_TOKEN`, and it keeps the `--set-secrets` entry checked.

### FR-2 The traffic file holds the scheduler step

`apps/codecamp-advantage/cloudbuild-traffic.yaml` holds the step `configure-review-worker-scheduler` directly before `update-traffic`, after `doctor-check`. `bind-release-source` stays the first step, and `update-traffic` stays the last step. The helper `ordered`, the runbook rule at line 17, and AC-2.12 of `per_app_cicd_20261107` stay unchanged. The order line of the file header and of the runbook is: "Order: release source bind, migrate, doctor check, review worker scheduler, traffic move." The step runs the existing script with `PROJECT_ID` and the secret `CODECAMP_REVIEW_WORKER_TICK_TOKEN`. The file's `availableSecrets` holds the entry for that secret next to the database URL entry.

### FR-3 The codecamp push file calls no gcloud scheduler

A test fails when `apps/codecamp-advantage/cloudbuild.yaml` calls `gcloud scheduler`, or runs a script that calls it. The case has the id F-20. It reads the file, resolves each script path that a step runs to the repository file, and fails when the step text or that script file holds `gcloud scheduler`. The helper sits in `scripts/ci/__tests__/helpers/plan.mjs`. A fixture case with an inline YAML string and an inline script text proves that the check fails. The test names the offending file in its message. The check covers that one file only, because the A-52 step `schedule-intake-job` in `apps/accounting/cloudbuild.yaml` is part of the A-52 design (section 2.7).

### FR-4 The contract test follows the move

`review-worker-deployment-contract.test.ts` reads the traffic file for the step and for the `availableSecrets` entry. It reads the push file only for the `--set-secrets` binding.

### FR-5 The cloudbuild file test follows the move

Cases F-11 and F-16 of `scripts/ci/__tests__/cloudbuild-files.test.mjs` list the new codecamp step. The codecamp steps read `migrate-db`, `doctor-check`, `configure-review-worker-scheduler`, `update-traffic`. Each case still checks the order, with `bind-release-source` first and `update-traffic` last.

### FR-6 The runbook names the step and its precondition

The codecamp section of `docs/runbooks/traffic-moves.md` names the step `configure-review-worker-scheduler`. It states the three IAM permissions of D-3 and states that the grant is a precondition of the first traffic move.

### FR-7 The registry carries the track

`measure/tracks.md` carries one entry for this track. The entry names the status, the due date 2026-11-15 for Phase 1, the owner chain, and the PM decisions 2 and 3.

### FR-8 Phase 2 lists and classifies each Primary item

Task 2.0 lists each failing test and each suite that does not load, by file and test name, with the failure reason. Later tasks classify each item and fix it test-first.

## 5. Constraints

- No push, no deploy, no Cloud Run change, no IAM change. No `gcloud` or `gh` command that writes.
- No edit of `apps/codecamp-advantage/scripts/configure-review-worker-scheduler.sh`.
- No edit of the plan of `codecamp_pr_review_recovery_20260820` or of `per_app_cicd_20261107`.
- No new hash, checksum, or manifest (AGENTS.md, Hashing and Provenance Policy).
- Never print a password, a hash, a database URL, or a secret value.
- Tests first. A Red task writes a test and shows it fail at the base. A Green task makes the test pass with the least change.
- One commit per task, with a pathspec. Each header carries `(track_id: master_push_readiness_20261112)` and stays at 100 characters or less.
- Phase 1 uses light roles only.
- Phase 2 heavy runs go through `heavy-run.sh` with priority p2 and `--maxWorkers=1`.

## 6. Acceptance criteria

1. **AC-1.** The contract test `review-worker-deployment-contract.test.ts` passes.
2. **AC-2.** `scripts/ci/__tests__/cloudbuild-files.test.mjs` passes, with F-11 and F-16 listing the new step, and with the new cases F-20 and F-21.
3. **AC-3.** The new FR-3 check passes, and it fails on a fixture push file that calls `gcloud scheduler`.
4. **AC-4.** `grep -n "gcloud scheduler" apps/codecamp-advantage/cloudbuild.yaml` prints no line.
5. **AC-5.** The runbook section of FR-6 holds the step name and the three permissions.
6. **AC-6 (deferred:daniel).** The IAM grant exists before the first codecamp traffic move.
7. **AC-7 (deferred:daniel-push).** After Daniel's push word, the next `cd-apps` run ends in `success` for codecamp-advantage.
8. **AC-8.** Task 2.0 lists every Primary failure and every suite that does not load, each with its reason.

## 7. Out of scope

- The scheduler script and the tick route. Track `codecamp_pr_review_recovery_20260820` owns them.
- The IAM grant itself and the push itself. Daniel owns both.
- The run 42596115488 failure of six apps. A later commit fixed it.
- Any change to the live codecamp-advantage service or to live traffic.

## 8. Open questions

Each item has a default. The track proceeds with the default unless the PM says otherwise.

- **OQ-1, option A or option B.** Default: option B (D-1). The PM can choose option A (D-2).
- **OQ-2, the order of the scheduler step.** Default: directly before `update-traffic`, after `doctor-check`. Reason: the traffic move must stay the last step (helper `ordered`, runbook line 17, AC-2.12 of `per_app_cicd_20261107`). The scheduler then calls the live host for a few seconds before the traffic move, in a one-time manual run. The review of round 1 finding F6 (the general runbook rule) drops, because line 17 stays true.
- **OQ-3, the Phase 2 start.** Default: Phase 2 starts after the deploy word list of the push goes to Daniel.
