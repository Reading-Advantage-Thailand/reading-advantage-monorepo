# Track Specification: Monorepo Continuous Deployment

**Track ID:** `monorepo_cd_20261009`
**Type:** chore (infrastructure)
**Created:** 2026-10-09
**Starts:** after the Primary cutover passes and the feature freeze ends (2026-10-11 or later).
Until then, this track changes no workflow, no Cloud Build file, and no Cloud Run service.

## Overview

A push to `master` must deploy each app that the push changes, with no manual step except an
approval where the owner asks for one. Today only www deploys automatically. After the Primary
cutover, the legacy trigger `primary-advantege-prod` is off (runbook step C12), so Primary has no
automatic deploy from any repo.

The legacy repos were simple: one repo, one app, one Cloud Build trigger on `main`. The monorepo
has many apps in one repo, many GCP projects, and shared packages. A change in `packages/**` can
change several apps. This track gives each app one deploy workflow that uses one shared deploy
procedure.

## Current State (checked 2026-10-09)

| App | Deploy today |
|---|---|
| www | GitHub Actions `.github/workflows/cd-www-reading-advantage.yml`, on a push to `master` that touches the app, `packages/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, or `turbo.json`. It runs `gcloud builds submit` with `apps/www-reading-advantage/cloudbuild.yaml`. Auth: JSON key secret `GCP_SERVICE_ACCOUNT`. A deploy takes about 15 minutes. |
| Primary | Legacy trigger `primary-advantege-prod` (legacy repo `main`). The cutover deploys by hand (C9 to C11). No monorepo workflow. |
| Reading | Legacy trigger `Main` (legacy repo `reading-advantage`, `web/cloudbuild.yaml`). |
| Tutor | Trigger `tutor-advantage-master` on its own repo. |
| CodeCamp | Manual `gcloud builds submit` (tech debt 2026-05-18). Deploys are blocked by `MIGRATION_CEILING_TAG` (tech debt 2026-10-04). |
| Science, Zhongwen, Math | No production deploy from the monorepo. |

Other facts:

- `ci.yml` failed on every `master` push since at least 2026-09-24. The cause on 2026-10-09: the
  config drift check counts 636 `console.error` calls, and the baseline is 621. The later CI steps
  (build, lint, types, tests) do not run. The www deploy does not wait for CI.
- `ci.yml` gives `pnpm test` a Postgres and a PgBouncer service. `packages/db` has about 40 tests
  that fail without a database environment (tech debt 2026-10-04, Lane A item d). Primary depends
  on `@reading-advantage/db`.
- `apps/primary-advantage/cloudbuild.yaml` already has the migration gate: `refuse-legacy-db`,
  `migrate-db`, and `doctor-check --required-migration <tag>`, then `deploy-cloudrun`. The deploy
  step sends traffic to the new revision at once and uses secret versions `:latest`. The required
  migration tag is written in the file, so each new migration needs an edit of the file.
- `packages/db/src/__tests__/primary-deploy-gate-contract.test.ts` checks the step order, the
  required migration tag, and that `availableSecrets` uses `versions/latest`.
- The cutover deploys Primary with `--no-traffic` and a tag, pins the secret version (C9), and moves
  the traffic only after the owner says go (C11). The service also has the tags `rehearsal1` and
  `rehearsal2` at 0%.
- Both Cloud Build files set `options.logging: CLOUD_LOGGING_ONLY`. The GitHub log of a www deploy
  shows only the build link and the result, not the build steps (run 37924356466).
- The project `www-reading-advantage` already has the Workload Identity pool `github-actions-pool`
  (active, no provider) and the service accounts `github-actions-build@` and `www-reading-github@`.
- The Cloud SQL instance `cloud-sql` (project `reading-advantage`) has automated backups and
  point-in-time recovery with 7 days of transaction logs.
- The repository is public, so GitHub Actions logs are public. The repository has no GitHub
  environments.

## Functional Requirements

**FR-1. One shared deploy workflow.** `.github/workflows/deploy-app.yml` (`on: workflow_call`) holds
the full deploy procedure. Inputs: app package name, GCP project, region, Cloud Build config path,
Cloud Run service name, smoke-check paths, rollout mode (`direct` or `tagged`), and GitHub
environment name. Each app workflow gives only these inputs and its path filters. The workflow has
two jobs:
- `build-candidate`: the app gate (FR-3), `gcloud builds submit`, and the smoke check (FR-8).
- `promote` (rollout mode `tagged` only): `needs: build-candidate`, `environment:` set from the
  input, its own authentication, and the traffic move. A GitHub environment approval applies when a
  job starts, so only `promote` carries the environment. The build and the migrations do not wait
  for the approval.

**FR-2. One trigger workflow for each app.** `cd-<app>.yml` runs on a push to `master` with path
filters: the app folder, `packages/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and
`turbo.json`. It also has `workflow_dispatch` for a manual redeploy. A manual run deploys only when
`github.ref == 'refs/heads/master'`. A manual run can override the smoke-check paths (used for the
AC-5 test).

**FR-3. App gate before the build.** Before `gcloud builds submit`, the `build-candidate` job runs
lint, type checks, and tests for the app and its workspace dependencies. A failure stops the deploy.
Phase 1 sets the exact command. Two choices: (a) run the tests that need no database and skip the
`packages/db` integration tests, or (b) add the Postgres and PgBouncer services from `ci.yml`. The
full `ci.yml` is not a gate until it is green (see Out of Scope).

**FR-4. One deploy for each app at a time.** Each app workflow sets `concurrency: deploy-<app>` with
`cancel-in-progress: false`, so that a new push never stops a migration step. GitHub keeps one
waiting run in each group and cancels an older waiting run. A run that waits for the approval holds
the group, so the next push waits until the owner approves or rejects.

**FR-5. www uses the shared workflow.** `cd-www-reading-advantage.yml` calls `deploy-app.yml` with
rollout mode `direct`. It adds FR-3, FR-4, and a smoke check of `/en` and `/th`. The deploy result
stays the same as today.

**FR-6. Primary deploys with a tagged rollout.**
- `cd-primary-advantage.yml` calls `deploy-app.yml` with rollout mode `tagged`, region
  `asia-southeast1`, the Cloud Build config `apps/primary-advantage/cloudbuild.yaml`, and the
  environment `primary-production`.
- The Cloud Build config keeps `refuse-legacy-db`, `migrate-db`, and `doctor-check`. A failure in any
  of them stops the build before `deploy-cloudrun`.
- `deploy-cloudrun` deploys with `--no-traffic --tag=candidate`. The tag moves to the new revision
  on each deploy.
- `build-candidate` runs the smoke check on the `candidate` tag URL.
- The `promote` job moves the traffic with `gcloud run services update-traffic --to-tags=candidate=100`.
- After the first successful promote, the workflow removes the old tags (`rehearsal1`, `rehearsal2`,
  `cutover`) with `update-traffic --remove-tags`. Later deploys keep only the `candidate` tag.

**FR-7. Primary secret versions (OD-4).** The Primary deploy uses pinned secret versions, written in
the Cloud Build substitutions. The migration steps (`availableSecrets.versionName`) and the runtime
(`--set-secrets=DATABASE_URL=...`) use the same pinned version, so the migration and the app always
use the same database. `primary-deploy-gate-contract.test.ts` changes from `versions/latest` to the
pinned version.

**FR-8. Smoke check.** The workflow sends an HTTP GET to each smoke-check path and expects status
200 (or the expected redirect). The paths are workflow inputs. Primary has no health route today;
Phase 1 selects the Primary paths (for example the sign-in page). A failure leaves the new
revision with no traffic (`tagged`) or fails the job (`direct`).

**FR-9. Authentication (OD-3).** The workflows authenticate with Workload Identity Federation.
- Reuse the pool `github-actions-pool` and an existing service account in `www-reading-advantage`.
  Phase 1 records which service account each project uses.
- Each provider has an attribute condition that accepts only the repository
  `Reading-Advantage-Thailand/reading-advantage-monorepo` and the ref `refs/heads/master` (and, for
  `promote`, the environment claim).
- Each job sets `permissions: id-token: write, contents: read`.
- Each service account has only the roles that the deploy needs.
- `GCP_PROJECT_ID` moves from a secret to a repository variable.
- After www moves to WIF, the `GCP_SERVICE_ACCOUNT` JSON key is deleted from GitHub and from GCP.

**FR-10. Rollback.** Before the traffic move, the job summary shows the name of the revision that
has the traffic, and the one command that moves the traffic back to it. Migrations stay compatible
with the previous revision (add first, remove in a later deploy), so a traffic rollback needs no
schema rollback.

**FR-11. Private build logs.** Every app `cloudbuild.yaml` in this track keeps
`options.logging: CLOUD_LOGGING_ONLY`, so that the public GitHub log never shows the build steps.
The full log stays in Cloud Logging.

**FR-12. Legacy trigger check.** Before the first Primary run, the track confirms that
`primary-advantege-prod` is disabled (runbook C12). Two triggers must never deploy the same service.

**FR-13. Workflow shape test.** A Vitest test in `packages/config` checks every `cd-*.yml`: it calls
`deploy-app.yml`, has the required path filters and the `master` guard for manual runs, has a
concurrency group with `cancel-in-progress: false`, and uses no JSON key secret. It also checks that
every app `cloudbuild.yaml` in a `cd-*.yml` keeps `CLOUD_LOGGING_ONLY`. The test uses regular
expressions (as `primary-deploy-gate-contract.test.ts` does) or the `yaml` package that the
workspace already has. No new dependency.

**FR-14. Deploy documentation.** `docs/deployment/continuous-deployment.md` tells how a deploy runs,
how to add an app, how to redeploy by hand, how to roll back, how the concurrency group and the
approval wait work (FR-4), and that each new Primary migration needs an edit of
`--required-migration` in `cloudbuild.yaml`.

**FR-15 (Could). CodeCamp.** After the migration ceiling fix, CodeCamp gets `cd-codecamp-advantage.yml`
with the same pattern. This closes the tech debt item of 2026-05-18.

## Non-Functional Requirements

- All builds run in GitHub runners and Cloud Build. No build runs on the local machine.
- No secret value, database URL, or password appears in a GitHub log.
- Recovery from a failed migration uses the Cloud SQL automated backups and point-in-time recovery
  (7 days). Phase 0 confirms that both are on.
- Deploy time: the first Primary run measures the time. Then the owner sets the limit. For
  reference, a www deploy takes about 15 minutes.
- No new paid service.

## Acceptance Criteria

1. A `master` push that changes only `apps/primary-advantage/**` deploys Primary and not www.
   A push that changes only `apps/www-reading-advantage/**` deploys www and not Primary.
2. A `master` push that changes only `measure/**` or `docs/**` deploys no app.
3. A failing app gate stops the deploy before `gcloud builds submit`. Proof: the FR-13 test checks
   the job order, and the Phase 1 gate command appears in the workflow. No production failure is
   forced.
4. A failing `doctor-check` stops the build before `deploy-cloudrun`. Proof:
   `primary-deploy-gate-contract.test.ts` checks the step order. No production failure is forced.
5. A failing smoke check leaves the `candidate` revision with 0% of the traffic. Proof: one manual
   run with a wrong smoke path (FR-2 override).
6. The `promote` job waits for the owner's approval in the environment `primary-production`.
7. The FR-13 test confirms `CLOUD_LOGGING_ONLY` in every deployed app `cloudbuild.yaml`.
8. No JSON service account key remains in the repository secrets or in GCP for the deploy.
9. One rollback drill on Primary passes with the owner present: move the traffic to the previous
   revision, check, and move it back.
10. The FR-13 test passes, and `docs/deployment/continuous-deployment.md` exists.

## Out of Scope

- Making the full `ci.yml` green (the `console.error` baseline). A separate track owns it. When it
  is green, a later change can make it a deploy gate.
- Deploys for Reading, Science, Tutor, Zhongwen, and Math. Each one moves at its own cutover with
  the same pattern.
- Preview deploys for pull requests.
- Change detection with Turbo (`--affected`). Path filters are enough for now.
- A change to the branch model. `primary-parity-integration` merges into `master`, and `master` is
  production.

## Preconditions

- The Primary cutover passed, and the owner ended the feature freeze.
- Runbook step C12 disabled `primary-advantege-prod`.
- Local `master` contains `origin/master` (www fix `15ad6d459`) and is pushed.
- The owner answered OD-1 to OD-5 (done 2026-10-09).

## Owner Decisions

| ID | Question | Decision |
|---|---|---|
| OD-1 | Which system runs the deploys: GitHub Actions or Cloud Build triggers? | **Decided 2026-10-09:** GitHub Actions starts each deploy and runs the app gate; Cloud Build runs the image build, the migrations, and the deploy. Reasons: one deploy at a time for each app (migration safety), an approval after the smoke check, and the setup is in the repo. |
| OD-2 | Does the Primary traffic move need the owner's approval? | **Decided 2026-10-09:** yes, for the first four weeks after the first Primary deploy: a GitHub environment `primary-production` with the owner as the required reviewer. Then the owner reviews the rule. |
| OD-3 | How does GitHub authenticate to GCP? | **Decided 2026-10-09:** Workload Identity Federation. No stored key. |
| OD-4 | Which secret versions does the Primary deploy use? | **Decided 2026-10-09:** the pinned versions from the cutover, written in the Cloud Build substitutions. A secret change needs a commit. |
| OD-5 | Which apps are in this track? | **Decided 2026-10-09:** Primary and www (Must), CodeCamp (Could, after the ceiling fix). |

## Review

A Fable subagent reviewed the first draft on 2026-10-09 (4 High, 6 Medium, 5 Low findings). This
version includes all of them: the `promote` job (H1), the gate scope (H2), private logs through
`CLOUD_LOGGING_ONLY` instead of `--suppress-logs` (H3), the contract test change for pinned
secrets (H4), WIF hardening and reuse of the existing pool (M1), the backup check (M2), testable
acceptance criteria (M3), the measured time limit (M4), the concurrency note (M5), tag cleanup
(M6), and L1 to L6.
