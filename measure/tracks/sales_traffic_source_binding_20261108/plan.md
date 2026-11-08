# Implementation Plan: Bind the sales traffic source to the release commit

> **Track ID:** `sales_traffic_source_binding_20261108` · **Spec:** [spec.md](./spec.md)

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done. An `[x]` note names the commit and the evidence class: automated, person-checked, or owner-passed.
- Each task follows `measure/workflow.md`: tests first, then code, then one commit with `(track_id: sales_traffic_source_binding_20261108)`. The header is 100 characters or less.
- Stage named paths only. Other sessions commit on master. Never run `git add -A` or `git add .`.
- No new hash, checksum field, or provenance file (AGENTS.md hashing policy).
- No live traffic run, no deploy, no push, and no `gcloud` write. The live run stays `deferred:daniel` in task 2.3h of `per_app_cicd_20261107`.
- The plan follows Option A of the spec (PM decision Q1 of 2026-11-08). The script takes the repository URL as an argument (PM decision Q3).
- The check needs the release commit on GitHub. A live traffic run can pass only after the first push of that commit.
- A task in Phase 2 starts only after the heading of Phase 1 has its checkpoint.

## Phase 1: Bind the sales traffic source to the release commit

- [ ] 1.1 Red: create `scripts/ci/__tests__/sales-traffic-source-binding.test.mjs`. Cover spec criteria 1 to 5: a differing source fails, a matching source passes (local fixture repository), a missing or malformed SHA fails before any fetch, step order in the traffic file, and the runbook name. Run `CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci` and record the failing result. Evidence class: automated.
- [ ] 1.2 Green: create `scripts/ci/verify-traffic-source.sh`. Add `scripts/ci/verify-traffic-source.sh` to the path list of `apps/sales-advantage/scripts/create-sales-release-archive.sh`. Add the step `bind-release-source` as the first step of `apps/sales-advantage/cloudbuild-traffic.yaml`. Update the order comment in that file. Run the same vitest command and record the passing result. Evidence class: automated.
- [ ] 1.3 Runbook: add the step name, its check, and the stop-before-`migrate-db` rule to the sales section of `docs/runbooks/traffic-moves.md`. Add the step to the step list there. Run the same vitest command (the F-16 runbook test must still pass). Evidence class: automated.
- [ ] 1.4 Phase check: run the vitest command of task 1.1 and `git diff --stat` of the track commits. Confirm that no hash field, manifest, or provenance file appears (criterion 6) and that no file outside the spec paths changed. Evidence class: automated.

## Phase 2: Bind the other five traffic sources to the release commit

Scope: `apps/accounts`, `apps/accounting`, `apps/codecamp-advantage`, `apps/marketing`, and `apps/primary-advantage`. Each file calls the script of Phase 1 at `scripts/ci/verify-traffic-source.sh`. This phase gates the first traffic move of the first four apps and the next Primary traffic move. The moves stay Daniel's word (task 2.3h of `per_app_cicd_20261107`, `deferred:daniel`). The Primary step goes before `refuse-legacy-db` (spec section 3b). No Primary deploy, no Cloud Build submit, and no revision change.

- [ ] 2.1 Red: add one test that covers the five traffic files (spec criteria 8 to 13): `bind-release-source` is step 1 and comes before the first source-reading step, each step command calls the script with `$_RELEASE_COMMIT_SHA` and the GitHub URL, each file holds the `_RELEASE_COMMIT_SHA` substitution with the `REQUIRED_` default, and each runbook section names the step. Run `CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci` and record the failing result. Evidence class: automated.
- [ ] 2.2 Green: add the step `bind-release-source` as the first step of the five traffic files (for Primary, before `refuse-legacy-db`), and add the substitution `_RELEASE_COMMIT_SHA` to each. Update the order comment of each file. Run the same vitest command and record the passing result. Evidence class: automated.
- [ ] 2.3 Runbook: add the step name, its check, and the stop-before-first-source-step rule to the sections `accounts`, `accounting`, `codecamp-advantage`, `marketing`, and `primary-advantage` of `docs/runbooks/traffic-moves.md`. Add the step to each step list. Add one line to the section `Rules for every traffic file`: the check needs the commit on GitHub, so a live run passes only after the first push. Run the same vitest command (the F-16 runbook test must still pass). Evidence class: automated.
- [ ] 2.4 Phase check: run the vitest command of task 2.1 and `git diff --stat` of the Phase 2 commits. Confirm that no hash field, manifest, or provenance file appears (criterion 13) and that no file outside the spec paths changed. Evidence class: automated.
