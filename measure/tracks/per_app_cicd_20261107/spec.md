# Specification: Per-app CI/CD (a change deploys only the affected app)

**Track ID:** `per_app_cicd_20261107`
**Type:** chore (classic FR list with acceptance checks)
**Status:** active. Opened 2026-11-07. Date needed: 2026-11-09.
**Author model:** claude-code/claude-sonnet-5-5
**Owner chain:** Daniel (owner; first push, traffic moves, new secrets and roles) → PM orchestrator → Monorepo orchestrator (track owner).
**Plan:** [plan.md](./plan.md)
**Depends on:** nothing.

## 1. Purpose

Today one workflow deploys one app from GitHub, and the team avoids the push so that no deploy starts. Daniel, Google Tasks, 2026-11-07 06:02 ICT, word for word:

```
Question 2: we need to fix deployment. We are trying not to push so that we don't trigger deployment, but that's the wrong cope. We need to fix the ci/CD so that changes to an app or an app's packages deploys only that app. Only cuteness to www should deploy www. Then we should be pushing all the time.
```

The PM reads "cope" as "approach" and "cuteness" as "changes". The goal: pushes become routine (backup, review, the tower move about 2026-11-14) with no unplanned deploy.

PM order (WHAT):

1. `.github/workflows/cd-www-reading-advantage.yml` deploys www only when www is affected: a change in `apps/www-reading-advantage/**`, or in a workspace package or a lockfile entry that www really depends on. A change to a package that only other apps use, or to `measure/`, `docs/`, or another app, starts no www deploy.
2. The same pattern for every app that has a `cloudbuild.yaml`. For the apps with a human gate, the push builds a new revision with `--no-traffic` and a tag. The traffic switch stays manual on Daniel's word. www keeps its direct deploy.
3. `ci.yml` runs the checks of the affected apps only.
4. Tests: a fake-range test of the affected logic and a dry run of each workflow, with no real deploy.
5. Before the first push: build and test www locally through `heavy-run` at the pushed HEAD.

## 2. Facts read on 2026-11-07 (re-measured in task 1.1)

**Apps with a Cloud Build file** (`apps/*/cloudbuild*.yaml`). The service, the project, and the traffic mode come from the file as read. "Direct" means the deploy step gives the new revision all traffic.

| App | File | Cloud Run service | Project | Traffic in the file | Choice for this track |
|---|---|---|---|---|---|
| www-reading-advantage | `cloudbuild.yaml` | `www-reading-advantage` | `$PROJECT_ID` (secret `GCP_PROJECT_ID`) | direct | Direct deploy (PM order); only when www is affected |
| primary-advantage | `cloudbuild.yaml` | `primary-advantage-app` | `${_PROJECT_ID}` = `primary-advantage` | direct; the build runs migrations before the deploy | Gated: `--no-traffic` + tag, with no migrate step on the push (D1) |
| storytime | `cloudbuild.yaml` | `storytime-app` | `primary-advantage` (fixed in the file) | `--no-traffic --tag=st-$BUILD_ID` | Gated; fix the tag length (FR-4) |
| accounting | `cloudbuild.yaml` | `accounting` | `$PROJECT_ID` | `--no-traffic --tag=candidate` when the service exists | Gated |
| codecamp-advantage | `cloudbuild.yaml` | `codecamp-advantage` | `$PROJECT_ID` | `--tag=sso-candidate --no-traffic` | Gated |
| marketing | `cloudbuild.yaml` | `marketing` | `$PROJECT_ID` | `--no-traffic` with a candidate tag | Gated |
| sales-advantage | `cloudbuild.yaml` | `sales-advantage` | `$PROJECT_ID` | `--no-traffic`, tags `legacy-rollback` and `candidate` | Gated |
| accounts | `cloudbuild.yaml` | `accounts` | `$PROJECT_ID` | direct; the build runs company-identity migrate, bootstrap, doctor, and a runtime probe before the deploy | Gated: `--no-traffic` + tag (D2); no database step on the push (D7) |
| workbooks | `cloudbuild.yaml` | `workbooks` | `$PROJECT_ID` | direct | Gated: `--no-traffic` + tag (D2) |
| reading-advantage | `cloudbuild.yaml` | `reading-advantage-web` | `$PROJECT_ID` | direct; the file builds `web/` of the legacy layout | Excluded from CD until its file matches the monorepo layout (D3) |

### 2a. App table file and tag rule

The table file is `scripts/ci/apps.json`: a JSON array with one object per app and these keys: `id` (the workspace name of the app, for example `storytime`), `path` (`apps/<folder>`), `service`, `project`, `region`, `cloudbuild` (the file path), `mode` (`direct`, `gated`, or `excluded`), and `tagPrefix` (empty for `direct` and `excluded`). Gated rows also hold `tag` (the rule text, for example `st-${BUILD_ID:0:8}`) and `tagLength` (the computed length). Region is `asia-southeast1` for every row (measured in the four files that this track edits). Project is the value of the file for the row (`$PROJECT_ID` rows keep that text; the workflow supplies it).

Tag rule `<prefix>-<first 8 characters of BUILD_ID>` is 3 characters of prefix and dash plus 8, so 11 characters. Computed lengths:

| App (gated) | Service | Service length | Tag | Tag length | Tag + service |
|---|---|---|---|---|---|
| primary-advantage | `primary-advantage-app` | 21 | `pa-xxxxxxxx` | 11 | 32 |
| storytime | `storytime-app` | 13 | `st-xxxxxxxx` | 11 | 24 |
| accounts | `accounts` | 8 | `ac-xxxxxxxx` | 11 | 19 |
| workbooks | `workbooks` | 9 | `wb-xxxxxxxx` | 11 | 20 |
| accounting | `accounting` | 10 | `candidate` (as in the file) | 9 | 19 |
| codecamp-advantage | `codecamp-advantage` | 18 | `sso-candidate` (as in the file) | 13 | 31 |
| marketing | `marketing` | 9 | `c` + 8 characters (as in the file) | 9 | 18 |
| sales-advantage | `sales-advantage` | 15 | `legacy-rollback` (longest tag in the file) | 15 | 30 |

The limit is 46 for tag plus service name (the failure text of build `4907d929`). The four rows below the line keep the tags that their files already set; their lengths are in the table so that AC-2.3 covers every gated row.

**One-off Cloud Build files, excluded from CD:** `apps/primary-advantage/cloudbuild-backfill.yaml` (untracked), `cloudbuild-catalogue.yaml`, `cloudbuild-etl.yaml`, and `apps/sales-advantage/cloudbuild.continue-f5063222.yaml`. They run by hand with a named context.

**Workflows today:**

- `.github/workflows/cd-www-reading-advantage.yml` deploys on every push to `master` that changes `apps/www-reading-advantage/**`, `packages/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, or `turbo.json`. It runs `gcloud builds submit --config=apps/www-reading-advantage/cloudbuild.yaml .` straight to traffic, with the secrets `GCP_SERVICE_ACCOUNT` and `GCP_PROJECT_ID`. Any change under `packages/**` starts the deploy, even when www does not use the package.
- `.github/workflows/ci.yml` runs on every push to `master` and on pull requests with a path filter. It runs one job for the whole monorepo: install, config drift, architecture checks, `pnpm build`, `pnpm verify:science`, `pnpm lint`, `turbo run check-types`, the generator gate, the codecamp cold-start tests, and `pnpm test`. The last 30 runs of this workflow all ended with `failure` (last read 2026-11-07; the run of 2026-11-04 failed in about 2 minutes).
- Cloud Build triggers (`gcloud builds triggers list`, read only): `Main` (owner Reading-Advantage-Thailand, repository `reading-advantage`, branch `^main$`, file `web/cloudbuild.yaml`) and `deploy-test` (branch `^dev$`, disabled). No trigger watches this monorepo.
- Cloud Run services in project `primary-advantage` (read only): `primary-advantage-app` and `storytime-app`.

**Local master:** 168 commits ahead of `origin/master` (`f3611d47c`). Those commits change `packages/read-along`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml` (next 16.4.1, vinext 1.2.0). `turbo ls --filter='...[f3611d47c]'` lists 22 packages, because a change of `pnpm-workspace.yaml` or the lockfile marks every package. The affected logic of this track must not use the lockfile as a global trigger.

**Storytime defect.** `apps/storytime/cloudbuild.yaml` deploys with `--tag=st-$BUILD_ID`. On 2026-11-07 build `4907d929` failed at the deploy step with: `traffic tag 'st-4907d929-48ae-4f4f-8983-e7666d8407a1' and service name 'storytime-app' together are too long. Combined traffic tag and service name cannot exceed 46 characters.` The orchestrator deployed the pushed image by hand with `--tag=st-4907d929`.

## 3. Functional requirements

Evidence classes: **automated**, **person-checked**, **owner-passed**.

### FR-1 The affected-app logic (Phase 1)

- One script answers: "which apps does this commit range affect?" Its exact path is `scripts/ci/affected-apps.mjs`. Red, Green, and the three workflows (`cd-www-reading-advantage.yml`, `cd-apps.yml`, `ci.yml`) all call this one path with this one CLI:

  ```
  node scripts/ci/affected-apps.mjs --base <sha> --head <sha>
  ```

  - It is plain Node ESM. It uses only Node built-ins (`node:child_process`, `node:fs`, `node:path`) and `git`. It adds no dependency. The root `package.json` has no `yaml` package, so the script reads `pnpm-lock.yaml` as text.
  - On success it prints one JSON array of app ids on stdout (sorted, one line, one final newline) and exits 0. The array is `[]` only when the range is readable and no app is affected.
  - On a bad argument, a bad base, or a bad head it prints nothing on stdout, writes one message on stderr, and exits 2.
  - It reads the workspace graph from the `package.json` files of `apps/*` and `packages/*`, with `git diff --name-only <base> <head>` for the changed files. The workflows check out with `fetch-depth: 0` and pass `${{ github.event.before }}` and `${{ github.sha }}`.
  - The app ids come from the table file `scripts/ci/apps.json` (section 2a). The script prints the id of each table row that the range affects, including the `excluded` row. A workflow skips a row whose mode is `excluded`.
- An app is affected when a file in its folder changes, when a workspace package that it depends on (directly or through other packages) changes, or when a lockfile entry in its importer or in its resolved dependency set changes.
- A change to `measure/`, `docs/`, `.github/workflows/` (outside the workflow under test), or another app affects no other app. A change to the root `package.json`, `pnpm-workspace.yaml`, or `turbo.json` is a global change; the script lists which root keys count as global (D4).
- Rule for the base:
  - A zero base (40 zeros, the `before` of a new branch) falls back to `git merge-base <head> origin/master`. If that merge base fails, or equals the head (an empty range), the script exits 2.
  - A base that is empty, is not a 40-character hex value, or names a commit that the clone does not hold (for example after a force push) exits 2. The workflow step then fails and no deploy starts. The workflow does not retry with a guess.
  - The script never answers `[]` when it cannot read the range.

Acceptance:

- AC-1.1 (automated) Fake-range test: a www-only change returns `["www-reading-advantage"]`.
- AC-1.2 (automated) A storytime-only change returns `["storytime"]`.
- AC-1.3 (automated) Two cases on the real workspace manifests (measured 2026-11-07 from `package.json` files, direct and through other packages):
  - A change of `packages/read-along` returns `["storytime"]`. Only `storytime` lists `@reading-advantage/read-along`, and no other workspace package lists it.
  - A change of `packages/utils` (listed directly by `www-reading-advantage` and `primary-advantage`, and by `reading-advantage`) returns the table rows `accounting`, `codecamp-advantage`, `marketing`, `primary-advantage`, `reading-advantage`, `sales-advantage`, and `www-reading-advantage`, through the workspace graph. It returns none of `storytime`, `accounts`, and `workbooks`. The test asserts that `www-reading-advantage` and `primary-advantage` are in the list and that the three named apps are not.
- AC-1.4 (automated) A lockfile change of one dependency of one app returns that app only. A lockfile change of a dependency that two apps share returns both.
- AC-1.5 (automated) A docs-only change (`docs/`, `measure/`) returns `[]`.
- AC-1.6 (automated) Three cases: a zero base falls back to the merge base with `origin/master` and prints a non-empty array for a scratch branch that changes an app; a zero base with no `origin/master` exits 2; a base commit that the clone does not hold exits 2. Each exit 2 prints nothing on stdout.
- AC-1.7 (automated) Each test asserts that the app list is not empty before it checks a property of each app, where a list is expected.

### FR-2 Per-app CD workflows (Phase 2)

- `cd-www-reading-advantage.yml` runs the FR-1 script and deploys www only when the output holds `www-reading-advantage`. It keeps the direct deploy and the two secrets.
- One workflow (`cd-apps.yml`) runs the FR-1 script and starts one job for each affected gated app. The job runs `gcloud builds submit` with the app's own config. A gated job builds a new revision with `--no-traffic` and a tag. No gated job moves traffic.
- The table `scripts/ci/apps.json` (section 2a) drives the jobs and is the one source for the script, the tests, and the three workflows.
- The tag of a gated app is `<prefix>-<first 8 characters of BUILD_ID>`. The prefix is set per app in the table so that tag plus service name is 46 characters or less (section 2a gives the prefix and the computed length). The deploy step computes the 8 characters in a bash step (`${BUILD_ID:0:8}`; Cloud Build substitutions have no substring), with `BUILD_ID` passed through `env`.
- `apps/accounts/cloudbuild.yaml` and `apps/workbooks/cloudbuild.yaml` change their deploy step to `--no-traffic` and the tag (D2), so that no push moves their traffic without Daniel's word.
- The one-off files of section 2 are not in the table.

Acceptance:

- AC-2.1 (automated) Dry run of the www workflow with a www-only range plans one deploy job. With a docs-only range, it plans none. With a storytime-only range, it plans none.
- AC-2.2 (automated) Dry run of `cd-apps.yml` for each gated app: a range that affects only that app plans exactly one job for that app, with `--no-traffic` and a tag.
- AC-2.3 (automated) For every gated row of `scripts/ci/apps.json`, the tag rule gives a tag whose length plus the service name length is 46 or less, and the length equals the value in the table (`rows_checked` equals the gated row count, 8, asserted not empty). A second check reads each app's `cloudbuild.yaml` and finds the tag expression of the table.
- AC-2.4 (automated) No job in any workflow runs `update-traffic` or `--to-latest` (a text check of the workflow files).
- AC-2.5 (person-checked) Each gated app's secrets and roles exist for the GitHub service account. A missing secret or role is a `[b] deferred:daniel` task, and the workflow for that app stays out of the table until the gate passes.

### FR-3 CI runs the affected apps only (Phase 3)

- `ci.yml` runs the FR-1 script. It checks the affected apps with `turbo run build lint check-types test --filter=<app>...`. Repository-wide guards that do not depend on an app (config drift, architecture checks, tenant guards) keep running on every change that touches their inputs.
- A change that affects no app runs only the repository-wide guards that its paths trigger.
- The red state of CI since 2026-09-24 is a fact to record, not to fix here. This track records the first failing step of the latest run in the report (D5).

Acceptance:

- AC-3.1 (automated) Dry run of `ci.yml` for each fake range of FR-1: the planned app set equals the FR-1 output.
- AC-3.2 (automated) A docs-only range plans no app job.

### FR-4 Storytime tag fix and runbook facts (Phase 2)

- `apps/storytime/cloudbuild.yaml` uses a tag that keeps tag plus service name at 46 characters or less (for example `st-` plus the first 8 characters of `$BUILD_ID`).
- `docs/runbooks/storytime-deploy.md` records these facts of 2026-11-07:
  - The test deploy used an archive of the Dockerfile COPY set (154 files, about 3 MB): `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `.pnpmfile.cjs`, `.dockerignore`, `apps/storytime`, `packages/config`, and `packages/read-along`, in place of the whole commit.
  - The service needs `STORYTIME_MEDIA_BASE=https://storage.googleapis.com/primary-app-storage/storytime-app` (set 2026-11-07).
  - The media of the new app sit under `gs://primary-app-storage/storytime-app/` (public read until the login phase).
  - The ingress was `internal` (every public address answered 404) and is now `all`. The rollback is `--ingress=internal`.
  - The traffic must not move to `storytime-app-00008-tmb` (the rejected build) while the ingress is `all`.
  - The live revision is `storytime-app-00011-dut`.
  - The tag rule and the 46-character limit, with the failure text of build `4907d929`.

Acceptance:

- AC-4.1 (automated) A test reads `apps/storytime/cloudbuild.yaml`: the tag expression, with the longest legal service name rule, stays within 46 characters (test with a 36-character build id).
- AC-4.2 (automated) A test reads the runbook and finds each fact above (`facts_found` equals 7).

### FR-5 Dry runs, local www proof, and the first-push plan (Phase 4)

- A dry run of each workflow runs with `act` if it is installed and works, or with a script that evaluates the same logic with no deploy and no secret. The report has one row per app.
- Before the first push: build and test www locally through `heavy-run` at the pushed HEAD. If www is affected by the pending 168 commits, it deploys on the push by design, so it must pass first.
- The report holds a one-line plan for the first push: which apps the push deploys.

Acceptance:

- AC-5.1 (automated) The dry-run report has one row for each app in the table and for the CI workflow (`rows` equals the table count plus 1).
- AC-5.2 (automated) `turbo run build test --filter=www-reading-advantage...` exits 0 at the HEAD that the report names, through `heavy-run`.
- AC-5.3 (automated) The first-push plan names the apps that the FR-1 script returns for `origin/master..HEAD`.
- AC-5.4 (owner-passed) Daniel gives the word for the first push after the PM relays the report.

## 4. Constraints

- Human gates (`[b] … deferred:daniel`): a new GitHub secret or a new service-account role, the first push, and every traffic move.
- No push and no deploy before the report. No change to a Cloud Build trigger.
- No hash, checksum field, or provenance file (AGENTS.md hashing policy).
- Stage named paths only. Other sessions commit on master. Never run `git add -A` or `git add .`.
- Heavy jobs run one at a time through `HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>'`.
- Commit headers are 100 characters or less, with the `track_id`.

## 5. Out of scope

- A traffic move for any app.
- A change to a Cloud Build trigger or to the legacy repository.
- The fix of the red CI steps (D5), except where a step blocks the affected-app run.
- A change in the app code. Build config files change only for the tag rule (storytime) and the table.

## 6. PM decisions (2026-11-07)

The PM decided the six open questions of the first draft on 2026-11-07. Each decision binds this track.

| # | Decision (PM, 2026-11-07) |
|---|---|
| D1 | A push builds and deploys Primary with `--no-traffic` and a tag, with NO migrate step. The migrate step runs only inside the manual traffic step, on Daniel's word. Until then the new revision must start against the old schema. The manual traffic step is a separate Cloud Build file, `apps/primary-advantage/cloudbuild-traffic.yaml`, that Daniel's word starts by hand. It runs, in this order: the read-only guard `refuse-legacy-db` (it refuses to migrate the legacy Primary database that Tutor reads), then `migrate-db`, then `doctor-check`, then the traffic move. The guard, the migrate step, and the doctor step all move out of the push file `apps/primary-advantage/cloudbuild.yaml`, so the push file holds no database step. The traffic move targets the tag of the new revision (a substitution that Daniel's word supplies). No workflow runs the file. |
| D2 | `accounts` and `workbooks` become `--no-traffic` plus a tag. |
| D3 | `reading-advantage` stays out of CD until its monorepo build exists. |
| D4 | `overrides` and `catalog` entries count only for the apps that use them. Every other root key of `package.json`, `pnpm-workspace.yaml`, and `turbo.json` is global. |
| D5 | Record the first failing step of `ci.yml` only. The PM opens a separate small track later to make `ci.yml` green for the affected apps. |
| D6 | Keep `cd-www-reading-advantage.yml` and add one table-driven `cd-apps.yml`. Fold the storytime tag-length fix into this track: the tag `st-$BUILD_ID` and the service name together are 52 characters and the limit is 46. |
| D7 | Same rule as D1 for `accounts` (PM, 2026-11-07, answer to question 3 of the first reply): "The company-identity migrate and bootstrap steps leave the push path and move to the manual traffic step, which runs only on Daniel's word. A push never changes a production database." General rule: **no push path of any app changes a production database.** `apps/accounts/cloudbuild.yaml` (the push file) holds no database step. A new `apps/accounts/cloudbuild-traffic.yaml` runs, in this order: `migrate-company-identity`, `bootstrap-company-identity`, `doctor-company-identity`, `bootstrap-production-identity`, `runtime-db-contract`, then the traffic move (`update-traffic`). The accounts file has no read-only guard step like `refuse-legacy-db`; if one is added, it runs first. No workflow runs the file. |

Acceptance for D1 (added to FR-2):

- AC-2.6 (automated) A test reads `apps/primary-advantage/cloudbuild.yaml` (the push path). It asserts that the file has steps before it checks a property of each step. No step has the id `refuse-legacy-db`, `migrate-db`, or `doctor-check`, and no step command holds `@reading-advantage/db migrate`, `@reading-advantage/db doctor`, or `refuse-legacy-db`. A conditional rule holds the guard in place: if a database step ever returns to this file, a `refuse-legacy-db` step comes before it. Today the file has no database step, so the guard is absent from it.
- AC-2.7 (automated) A test reads `apps/primary-advantage/cloudbuild-traffic.yaml`. The four steps exist and run in this order (step index check): `refuse-legacy-db`, `migrate-db`, `doctor-check`, the traffic move (`update-traffic`). The doctor step keeps its `--required-migration` argument from the push file of today.
- AC-2.8 (automated) No workflow file references any `cloudbuild-traffic.yaml` (the Primary file of D1 and the files of D7). Only a person starts them.
- AC-2.9 (automated) A test reads `apps/accounts/cloudbuild.yaml` and `apps/workbooks/cloudbuild.yaml` (`files_checked` equals 2, asserted). In each, the `deploy-cloudrun` step holds `--no-traffic` and a `--tag=` with the prefix of section 2a (`ac` or `wb`) plus the first 8 characters of `BUILD_ID`, and the file holds no `update-traffic` and no `--to-latest`.
- AC-2.10 (automated, general rule of D7) For every row of `scripts/ci/apps.json` whose mode is not `excluded` (9 rows, asserted), the push file `cloudbuild` of the row holds no database step. A database step is a step that names a secret with `DATABASE_URL` in `secretEnv`, or whose command holds `cloud-sql-proxy`, `psql`, `drizzle`, `@reading-advantage/db`, `company-identity:`, or `bootstrap:production`. The runtime options of the deploy step (`--set-secrets`, `--add-cloudsql-instances`) are not database steps. The test asserts that each file has steps before it checks each step.
- AC-2.11 (automated) A test reads `apps/accounts/cloudbuild-traffic.yaml`. The six steps exist and run in this order (step index check): `migrate-company-identity`, `bootstrap-company-identity`, `doctor-company-identity`, `bootstrap-production-identity`, `runtime-db-contract`, the traffic move (`update-traffic`). A guard step, if any exists, has the lowest index.
- AC-2.12 (automated) For each of `accounting`, `codecamp-advantage`, `marketing`, and `sales-advantage` (`files_checked` equals 4, asserted): the push file holds no database step (AC-2.10), and the file `apps/<app>/cloudbuild-traffic.yaml` holds the database steps that the push file holds today, in their current order, before the traffic move (`update-traffic`). These four apps hold database steps in their push files on 2026-11-07, so the general rule of D7 reaches them. Sales (measured in `apps/sales-advantage/cloudbuild.yaml`) holds six database steps and two helper steps. The traffic file of sales runs, in this order: `verify-curriculum-backup` (guard), `migrate-db`, `doctor-check`, `build-curriculum-workspace-deps`, `seed-production-curriculum`, `verify-production-curriculum`, `runtime-db-contract`, `capture-legacy-rollback`, `verify-repair-verify-legacy-rollback`, then `update-traffic`. The order differs from the push file in one place only: `verify-repair-verify-legacy-rollback` needs the URL that `capture-legacy-rollback` writes for the tagged `legacy-rollback` revision, so the traffic file captures the tag first. A check asserts, for each of the six database steps (`migrate-db`, `doctor-check`, `seed-production-curriculum`, `verify-production-curriculum`, `runtime-db-contract`, `verify-repair-verify-legacy-rollback`), that the step is in the traffic file and absent from the push file (`sales_db_steps_moved` equals 6).
