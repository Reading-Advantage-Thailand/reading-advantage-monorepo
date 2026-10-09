# Implementation Plan: Monorepo Continuous Deployment

Track: `monorepo_cd_20261009`. Spec: [spec.md](./spec.md).
No task starts before the preconditions in Phase 0 are true.

## Phase 0: Preconditions

- [ ] Task: Confirm that the Primary cutover passed and the owner ended the feature freeze.
- [ ] Task: Confirm that `primary-advantege-prod` is disabled (`gcloud builds triggers describe`). (FR-12)
- [ ] Task: Confirm that local `master` contains `origin/master` and is pushed.
- [x] Task: Record the owner's answers to OD-1 to OD-5 in `spec.md`. (2026-10-09)
- [ ] Task: Confirm that Cloud SQL automated backups and point-in-time recovery are on for `cloud-sql`. (NFR)
- [ ] Task: Measure - User Manual Verification 'Phase 0: Preconditions' (Protocol in workflow.md)

## Phase 1: Contract Definition

- [ ] Task: Define the `deploy-app.yml` interface. (FR-1)
    - [ ] Write the input names, types, and defaults in the header comment of the workflow.
    - [ ] Define the two jobs `build-candidate` and `promote`, and what each job does.
    - [ ] Write the per-app input table (www, Primary) in `docs/deployment/continuous-deployment.md`.
- [ ] Task: Set the app gate command, choice (a) or (b) in FR-3, and write it in the spec. (FR-3, AC-3)
- [ ] Task: Define the smoke-check contract. (FR-8)
    - [ ] Select the Primary smoke paths and the expected status of each path.
    - [ ] Confirm the www paths `/en` and `/th` and their expected status.
- [ ] Task: Define the WIF setup for each project. (FR-9)
    - [ ] Record which existing service account each project uses (reuse `github-actions-pool`).
    - [ ] Write the provider attribute condition (repository, `refs/heads/master`, environment claim).
    - [ ] List the roles each service account needs.
- [ ] Task: Confirm that `.gcloudignore` leaves out `node_modules`, `.turbo`, `dist`, and `.next`.
- [ ] Task: Measure - User Manual Verification 'Phase 1: Contract Definition' (Protocol in workflow.md)

## Phase 2: Tests

- [ ] Task: Write the workflow shape test in `packages/config` (red first; no new dependency). (FR-13)
    - [ ] Every `cd-*.yml` calls `deploy-app.yml`.
    - [ ] Every `cd-*.yml` has the required path filters, `workflow_dispatch`, and the `master` guard.
    - [ ] Every `cd-*.yml` has a concurrency group with `cancel-in-progress: false`.
    - [ ] `promote` needs `build-candidate`, and only `promote` has `environment:`.
    - [ ] No workflow uses a JSON key secret.
    - [ ] Every deployed app `cloudbuild.yaml` keeps `CLOUD_LOGGING_ONLY`. (FR-11)
- [ ] Task: Change `primary-deploy-gate-contract.test.ts` to expect the pinned secret version in `availableSecrets` and in `--set-secrets=DATABASE_URL` (red first). (FR-7)
- [ ] Task: Measure - User Manual Verification 'Phase 2: Tests' (Protocol in workflow.md)

## Phase 3: Implementation

- [ ] Task: Set up WIF for the www and Primary projects. (FR-9)
    - [ ] Add a provider with the attribute condition to `github-actions-pool` (owner approves the IAM change).
    - [ ] Give each service account only the listed roles.
    - [ ] Move `GCP_PROJECT_ID` to a repository variable.
- [ ] Task: Write `.github/workflows/deploy-app.yml` with the jobs `build-candidate` and `promote`. (FR-1, FR-3, FR-8, FR-10)
- [ ] Task: Move www to the shared workflow. (FR-2, FR-4, FR-5)
    - [ ] Push a `docs/**` change and confirm that no deploy runs.
    - [ ] Push a www change and confirm the deploy, the smoke check, and the live page.
    - [ ] Delete the `GCP_SERVICE_ACCOUNT` secret and its key in GCP.
- [ ] Task: Change the Primary `deploy-cloudrun` step to `--no-traffic --tag=candidate` and pin the secret versions in both places. (FR-6, FR-7)
- [ ] Task: Create the GitHub environment `primary-production` with the owner as the required reviewer. (FR-6, OD-2)
- [ ] Task: Add `cd-primary-advantage.yml`. (FR-2, FR-4, FR-6)
- [ ] Task: Run the first Primary deploy with the owner present.
    - [ ] Confirm the gate, the migration steps, the candidate revision, the smoke check, the approval, and the traffic move.
    - [ ] Record the deploy time, and ask the owner for the time limit. (NFR)
    - [ ] Remove the tags `rehearsal1`, `rehearsal2`, and `cutover`. (FR-6)
- [ ] Task: Run a manual deploy with a wrong smoke path and confirm that `candidate` keeps 0% of the traffic. (AC-5)
- [ ] Task: Run the rollback drill on Primary with the owner present. (FR-10, AC-9)
- [ ] Task (Could): Add `cd-codecamp-advantage.yml` after the migration ceiling fix. (FR-15)
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implementation' (Protocol in workflow.md)

## Phase 4: Docs and Doctor

- [ ] Task: Complete `docs/deployment/continuous-deployment.md`: how a deploy runs, how to add an app, a manual redeploy, a rollback, the concurrency and approval wait, and the `--required-migration` edit. (FR-14)
- [ ] Task: Update `measure/tech-debt.md`: close the items this track fixes; add an item for the red `ci.yml`.
- [ ] Task: Run `measure/generate.sh` and `measure/doctor.sh`.
- [ ] Task: Measure - User Manual Verification 'Phase 4: Docs and Doctor' (Protocol in workflow.md)
