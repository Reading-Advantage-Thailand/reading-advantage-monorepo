# Implementation Plan: Per-app CI/CD

> **Track ID:** `per_app_cicd_20261107` · **Spec:** [spec.md](./spec.md)
> **Date needed:** 2026-11-09. The DONE condition: the workflows are in local master with tests, a dry-run report per app, and a one-line plan for the first push. Then the PM relays to Daniel and the push follows.

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done, and `[b] … deferred:<owner>` at a human gate. A task in phase N+1 starts only after the heading of phase N has its checkpoint (measure-guard).
- An `[x]` note names the commit and the evidence class: automated, person-checked, or owner-passed.
- Human gates: a new GitHub secret or service-account role, the first push, and every traffic move. No push and no deploy before the report.
- Each task follows `measure/workflow.md`: tests first, then code, then one commit with `(track_id: per_app_cicd_20261107)`. The commit header is 100 characters or less.
- Stage named paths only. Other sessions commit on master. Never run `git add -A` or `git add .`.
- Heavy jobs run one at a time through `HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
- No new hash, checksum field, or provenance file (AGENTS.md hashing policy).
- At the end of each phase, run the phase check and append `[checkpoint: <sha>]` to the phase heading.

## Phase 1: The affected-app logic

- [ ] 1.1 Spec review and test strategy by another model family than `claude-code/claude-sonnet-5-5`. Re-measure the facts of spec section 2 (the cloudbuild files, the workflows, the triggers, the 168-commit range) and record any difference. Evidence class: automated.
- [ ] 1.2 Red tests (AC-1.1 to AC-1.7): fake-range tests on a scratch git repository built by the test. Cases: www-only, storytime-only, shared package (read-along), one app's lockfile entry, a shared lockfile entry, docs-only, zero base, missing base. Run red, commit the Red tests alone. Evidence class: automated.
- [ ] 1.3 Green: the affected-app script and the app table file. Apply decision D4 (global keys) in the script. One commit. Evidence class: automated.
- [ ] 1.4 Run the script on `origin/master..HEAD` and on three real past ranges. Record the output. Evidence class: automated.
- [ ] 1.5 Phase check: targeted tests, `tsc` and ESLint of the new files (through `heavy-run`), Reviews A and C, phase acceptance. Append `[checkpoint: <sha>]` to this heading. Evidence class: automated.

## Phase 2: Per-app CD workflows

- [ ] 2.1 Red tests (AC-2.1 to AC-2.5, AC-4.1, AC-4.2): workflow text checks, the tag length rule for each table row, the runbook fact check. Run red, commit alone. Evidence class: automated.
- [ ] 2.2 Green: change `cd-www-reading-advantage.yml` to run the script and deploy www only when affected. Keep the direct deploy and the two secrets. Evidence class: automated.
- [ ] 2.3 Green: add `cd-apps.yml` for the gated apps, driven by the table (decisions D2, D3, D6). Each job builds with `--no-traffic` and a tag, and no job moves traffic. `accounts` and `workbooks` are rows of the table. `reading-advantage` is not. Evidence class: automated.
- [ ] 2.3a Red tests for decision D1 (AC-2.6, AC-2.7, AC-2.8): the push file of Primary has no migrate step; the traffic file runs the migrate step before the traffic move; no workflow references the traffic file. Run red, commit alone. Evidence class: automated.
- [ ] 2.3b Green for decision D1: move the migrate steps out of `apps/primary-advantage/cloudbuild.yaml` and into the new `apps/primary-advantage/cloudbuild-traffic.yaml`, which runs the migrate steps and then the traffic move. The push file deploys with `--no-traffic` and a tag. Record in the runbook that the new revision must start against the old schema. Evidence class: automated.
- [b] 2.3c Run `cloudbuild-traffic.yaml` for Primary: every run needs Daniel's word. deferred:daniel
- [ ] 2.4 Green (decision D6): fix the storytime tag in `apps/storytime/cloudbuild.yaml` (`st-$BUILD_ID` plus `storytime-app` is 52 characters; the limit is 46). Evidence class: automated.
- [ ] 2.5 Green: record the runbook facts of FR-4 in `docs/runbooks/storytime-deploy.md`. Evidence class: automated.
- [b] 2.6 Create the GitHub secret or the service-account role that a gated app needs, if the check of AC-2.5 finds one missing. Until then the app stays out of the table. deferred:daniel
- [ ] 2.7 Phase check: targeted tests, ESLint of the changed files, Review A, Review B (CI secrets and deploy permissions), Review C, phase acceptance. Append `[checkpoint: <sha>]` to this heading. Evidence class: automated.

## Phase 3: CI for the affected apps

- [ ] 3.1 Red tests (AC-3.1, AC-3.2): the planned app set of `ci.yml` for each fake range. Run red, commit alone. Evidence class: automated.
- [ ] 3.2 Green: change `ci.yml` to run the script and to check the affected apps with `turbo run … --filter=<app>...`. Keep the repository-wide guards on their path triggers. Evidence class: automated.
- [ ] 3.3 Record the first failing step of the latest CI run on master (D5). Do not fix it here; the PM opens a separate small track later (decision D5). Evidence class: automated.
- [ ] 3.4 Phase check: tests, ESLint of changed files, Reviews A and B, phase acceptance. Append `[checkpoint: <sha>]` to this heading. Evidence class: automated.

## Phase 4: Dry runs, www proof, and the first-push plan

- [ ] 4.1 Dry run of each workflow for each fake range, with `act` or a script, with no secret and no deploy. One report row for each app and one for CI (AC-5.1). The report goes to `measure/tracks/per_app_cicd_20261107/dry-run-report.md`. Evidence class: automated.
- [ ] 4.2 Build and test www locally at the HEAD that will be pushed: `turbo run build test --filter=www-reading-advantage...` through `heavy-run` (AC-5.2). The pending commits change `packages/read-along`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml` (next 16.4.1, vinext 1.2.0). Evidence class: automated.
- [ ] 4.3 Write the one-line first-push plan: the apps that the script returns for `origin/master..HEAD` (AC-5.3). Evidence class: automated.
- [ ] 4.4 Adversarial review of the workflows, final acceptance at an immutable HEAD, then hand the report to the PM. Evidence class: automated.
- [b] 4.5 The first push, on Daniel's word after the PM relays the report (AC-5.4). deferred:daniel
- [b] 4.6 Every traffic move of a gated app, on Daniel's word. deferred:daniel
