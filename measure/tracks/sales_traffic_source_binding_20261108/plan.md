# Implementation Plan: Bind the sales traffic source to the release commit

> **Track ID:** `sales_traffic_source_binding_20261108` · **Spec:** [spec.md](./spec.md)

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done. An `[x]` note names the commit and the evidence class: automated, person-checked, or owner-passed.
- Each task follows `measure/workflow.md`: tests first, then code, then one commit with `(track_id: sales_traffic_source_binding_20261108)`. The header is 100 characters or less.
- Stage named paths only. Other sessions commit on master. Never run `git add -A` or `git add .`.
- No new hash, checksum field, or provenance file (AGENTS.md hashing policy).
- No live traffic run, no deploy, no push, and no `gcloud` write. The live run stays `deferred:daniel` in task 2.3h of `per_app_cicd_20261107`.
- The plan follows Option A of the spec (decision Q1). A change to Option B changes tasks 1.1 and 1.2 only.

## Phase 1: Bind the sales traffic source to the release commit

- [ ] 1.1 Red: create `scripts/ci/__tests__/sales-traffic-source-binding.test.mjs`. Cover spec criteria 1 to 5: a differing source fails, a matching source passes (local fixture repository), a missing or malformed SHA fails before any fetch, step order in the traffic file, and the runbook name. Run `CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci` and record the failing result. Evidence class: automated.
- [ ] 1.2 Green: create `apps/sales-advantage/scripts/verify-traffic-source.sh`. Add the step `bind-release-source` as the first step of `apps/sales-advantage/cloudbuild-traffic.yaml`. Update the order comment in that file. Run the same vitest command and record the passing result. Evidence class: automated.
- [ ] 1.3 Runbook: add the step name, its check, and the stop-before-`migrate-db` rule to the sales section of `docs/runbooks/traffic-moves.md`. Add the step to the step list there. Run the same vitest command (the F-16 runbook test must still pass). Evidence class: automated.
- [ ] 1.4 Phase check: run the vitest command of task 1.1 and `git diff --stat` of the track commits. Confirm that no hash field, manifest, or provenance file appears (criterion 6) and that no file outside the spec paths changed. Evidence class: automated.
