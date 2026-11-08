# Specification: Bind the sales traffic source to the release commit

**Track ID:** `sales_traffic_source_binding_20261108`
**Type:** chore (classic FR list). It is a security fix of the release path.
**Status:** new. Opened 2026-11-08.
**Author model:** claude-code/claude-sonnet-5-5
**Plan:** [plan.md](./plan.md)
**Depends on:** nothing.
**Blocks:** task 2.3h of `measure/tracks/per_app_cicd_20261107/plan.md`. That task runs the `cloudbuild-traffic.yaml` files and stays `deferred:daniel`. Task 2.3h names five apps and not `primary-advantage`. So Phase 2 gates the next Primary traffic move instead, for that app. In total this track gates six apps: Phase 1 gates the first sales traffic run, and Phase 2 gates the first traffic run of `accounts`, `accounting`, `codecamp-advantage`, and `marketing`, and the next traffic run of `primary-advantage` (test-strategy rows M53, C31, and Q18 of that track).
**PM decisions of 2026-11-08:** Q1 is Option A. Q3 is yes. Q2 is decided differently: this track covers the other traffic files in Phase 2, and no separate track is planned (reason, PM: one script and one review set cost less than two tracks). Q2b is yes: `primary-advantage` joins Phase 2. Q4 is yes: the shared script lives in `scripts/ci/`.

## 1. Purpose

A person starts `apps/sales-advantage/cloudbuild-traffic.yaml` by hand. The person uploads a source tree. The step `migrate-db` applies migrations from that tree to the production database. No step checks that the tree is the release commit.

The push path has a binding. `.github/workflows/cd-apps.yml` passes the pushed commit as `_RELEASE_COMMIT_SHA`. Line 11 of `apps/sales-advantage/cloudbuild.yaml` runs `release-source-manifest.mjs verify` against that value.

The traffic file uses `_RELEASE_COMMIT_SHA` in two places only: `verify-curriculum-backup` and `verify-repair-verify-legacy-rollback`. Both steps use the value as a label. Neither step compares the uploaded files with the commit. A wrong tree can therefore change the production schema.

Source: Review B finding F4 (Nit) in `measure/runs/per_app_cicd_20261107/review-b-p3-57bb8376c.log`.

## 2. Facts read on 2026-11-08

- `.gcloudignore` excludes `.git`. The uploaded tree holds no Git data. A step cannot run `git rev-parse HEAD` on it.
- `apps/sales-advantage/scripts/create-sales-release-archive.sh` builds the upload of the push file `cloudbuild.yaml` only. The traffic file does not read its `release-source.json`.
- The traffic upload is the repository root `.`. Reason: line 18 of `docs/runbooks/traffic-moves.md` says a person starts every traffic file with `gcloud builds submit --config=<file> .` from the repository root, and the sales traffic file names no archive and no `release-source.json`.
- `release-source-manifest.mjs verify` uses a SHA-256 manifest. The push file passes the manifest hash as `_RELEASE_SOURCE_MANIFEST_SHA256`.
- The upstream repository is `https://github.com/Reading-Advantage-Thailand/reading-advantage-monorepo.git`.
- The four other traffic files (`accounts`, `accounting`, `codecamp-advantage`, `marketing`) do not mention `_RELEASE_COMMIT_SHA`. Each has a step that reads the uploaded source. That step runs `pnpm install --frozen-lockfile` and a migrate command. The first such step is `migrate-company-identity` (accounts) or `migrate-db` (the other three). So the four files hold the same defect, and each protects the same thing: the production schema, which a wrong tree could change. Phase 2 covers them.
- `apps/primary-advantage/cloudbuild-traffic.yaml` has the same defect. Its steps are `refuse-legacy-db`, `migrate-db`, `doctor-check`, and `update-traffic`. The first step, `refuse-legacy-db`, is a read-only guard of the legacy database. It still reads the uploaded source: it runs `pnpm install --frozen-lockfile` and then `pnpm --filter @reading-advantage/db refuse-legacy-db`. `migrate-db` (near line 27) migrates from the same source.
- `scripts/ci/` holds `affected-apps.mjs`, `apps.json`, and shell scripts with kebab-case names (`check-graph-db.sh`, `sql-adr-guard.sh`). The name `verify-traffic-source.sh` fits.
- The root `.gcloudignore` excludes `apps/*` and re-includes six apps: accounting, codecamp-advantage, marketing, sales-advantage, accounts, and www-reading-advantage. It does not exclude `scripts/`. So `scripts/ci/` stays in the upload of all six traffic builds, the sales build included.
- Every bash step of the six traffic files runs on `node:22-slim`. That image has no `git`. The steps install `curl` with `apt-get`.

## 3. Binding choice (decision Q1)

The AGENTS.md hashing policy says: prefer Git commit or tree identity, and stop and explain before a hash spreads to a new file.

**Option A (default): bind with Git identity. No new hash.**
A new first step `bind-release-source` runs before `verify-curriculum-backup` and so before `migrate-db`. The step does three things:

1. It refuses a `_RELEASE_COMMIT_SHA` that is not 40 lowercase hex characters. This includes the default `REQUIRED_RELEASE_COMMIT_SHA`.
2. It fetches that commit from the upstream repository into a temporary directory.
3. It lists each uploaded file. For each file it compares the Git blob id of the file with the blob id of the same path in the commit. A file that is missing from the commit, or that differs, stops the build.

Reason for the form: the upload has no `.git`, so a check "uploaded tree equals tree of the commit" needs the commit from outside. The upload is a subset of the commit (a fixed path list), so a subset check is the smallest exact test. The blob ids are Git identity. The step adds no SHA-256 field and no manifest. The script is shared (see section 3a). A small script holds the logic so that a test can run it against a local fixture repository: `scripts/ci/verify-traffic-source.sh <commit> <repo-url> <uploaded-root>`. The YAML passes the GitHub URL. The fetch is read-only and uses no secret, because the repository is public. If the repository becomes private, the step needs a credential. That change needs Daniel's word.

**Option B: reuse `release-source-manifest.mjs verify`.**
The traffic file would run the same SHA-256 manifest check as the push file, with a new substitution `_RELEASE_SOURCE_MANIFEST_SHA256`. This spreads an existing SHA-256 check to one more build file. Reason it could be chosen: it needs no network fetch and it matches the push path. Reason it is not the default: the policy tells us to prefer Git identity, and the hash would also bind only to the manifest, not to the commit itself, because the manifest hash comes from the operator.

**Q1 answer (PM, 2026-11-08): Option A.** The plan follows Option A. Option B is not planned.

**Limit after the first push.** The check fetches the release commit from GitHub. The commit must exist on GitHub. A live traffic run can therefore pass only after the first push of that commit. Before that push, every run stops at the check. This is the correct result: the check cannot confirm a commit that GitHub does not hold.

## 3a. Script location (PM decision Q4)

The six traffic files call one script: `scripts/ci/verify-traffic-source.sh`. Reason: shared code lives outside any one app, and the folder already holds the shell scripts of the CI. Phase 1 creates the script there. Each traffic upload is the repository root `.`, and the root `.gcloudignore` keeps `scripts/ci/` in it. So the `.gcloudignore` file and `create-sales-release-archive.sh` need no change.

## 3a-1. Container image of the step (review finding F1)

The step `bind-release-source` runs on the image `gcr.io/cloud-builders/git` with `entrypoint: "bash"`. Reason: the image holds `git` and `bash`, so the step needs no `apt-get` install and no network install; `node:22-slim` has no `git`. The step uses `git init`, `git fetch`, and `git hash-object` only. The script needs no other tool.

## 3b. Where the Primary step goes (Phase 2)

The step `bind-release-source` is step 1 of the Primary file, before `refuse-legacy-db`. Reason: `refuse-legacy-db` runs `pnpm install` and a script of the `db` package from the uploaded source. A wrong tree could change that guard and disable it. The bind step must run first. The bind step reads the database in no way. It does not weaken the read-only guard: the guard still runs before any migrate step. This phase makes no Primary deploy, no Cloud Build submit, and no revision change. The next Primary deploy stays the team's, on Daniel's word.

## 4. Functional requirements

- **FR-1.** `apps/sales-advantage/cloudbuild-traffic.yaml` holds a step `bind-release-source` that comes before `verify-curriculum-backup` and before `migrate-db`.
- **FR-2.** The step stops the build (non-zero exit) when `_RELEASE_COMMIT_SHA` is missing, is the `REQUIRED_` default, or is not 40 lowercase hex characters.
- **FR-3.** The step stops the build when any uploaded file differs from, or is missing in, the release commit.
- **FR-4.** The step passes when each uploaded file equals the file of the release commit at the same path.
- **FR-5.** `docs/runbooks/traffic-moves.md` (the sales section) names the step, says what it checks, and says that a traffic run stops before `migrate-db` on a mismatch.
- **FR-6.** The change adds no SHA-256, checksum field, manifest, or provenance file.
- **FR-10.** The script is `scripts/ci/verify-traffic-source.sh`. The sales upload is the repository root `.` and holds it. The sales section of the runbook says so, and no archive script changes.
- **FR-11.** The step `bind-release-source` of each file runs on `gcr.io/cloud-builders/git` with `entrypoint: "bash"` and installs nothing.
- **FR-12.** The runbook rules for every traffic file say: start from a clean checkout of the release commit, because an untracked file in the upload stops the build (Q6).

- **FR-7 (Phase 2).** Each traffic file of `accounts`, `accounting`, `codecamp-advantage`, `marketing`, and `primary-advantage` holds the same step `bind-release-source` as its first step. The step calls the script of Phase 1 with the GitHub URL. Each file holds a new substitution `_RELEASE_COMMIT_SHA` with the default `REQUIRED_RELEASE_COMMIT_SHA`.
- **FR-8 (Phase 2).** The step stops each of the five runs before its first step that reads the source (for `primary-advantage`, `refuse-legacy-db`), on any mismatch, and on a missing, default, or malformed SHA.
- **FR-9 (Phase 2).** The runbook sections of the five apps name the step and the stop rule.

## 5. Acceptance criteria

Each criterion has an automated test. Criteria 1 to 7 are in `scripts/ci/__tests__/sales-traffic-source-binding.test.mjs` (task 1.1). Criteria 8 to 14 are in the new file `scripts/ci/__tests__/traffic-source-binding-phase2.test.mjs` (task 2.1). No test reads `measure/` (rule C27 of `per_app_cicd_20261107`).

1. Given an uploaded source that differs from `_RELEASE_COMMIT_SHA`, when the script runs, then it exits non-zero and prints the path of the first differing file.
2. Given a matching source, when the script runs, then it exits 0.
3. Given no `_RELEASE_COMMIT_SHA`, the default value, or a short or upper-case value, when the script runs, then it exits non-zero before any fetch.
4. Given the traffic file, when a test reads the step order, then `bind-release-source` has a lower index than `verify-curriculum-backup` and `migrate-db`.
5. Given the runbook, when a test reads the sales section, then it names `bind-release-source`.
6. Given the script and the `bind-release-source` step of the sales traffic file, when a test reads their text, then it finds none of `sha256`, `sha-256`, `sha1sum`, `checksum`, `createHash`, or `manifest` (case-insensitive).
7. The test run `vitest run --maxWorkers=1 scripts/ci` exits 0 (light run).
15. Given the sales step, when a test reads it, then its image is `gcr.io/cloud-builders/git`, its entrypoint is `bash`, and its command holds no `apt-get`. Given `.gcloudignore`, when a test reads it, then no pattern excludes `scripts/` or `scripts/ci`, and the file `scripts/ci/verify-traffic-source.sh` exists (task 1.1).

**Phase 2 criteria.** One Red test file, `scripts/ci/__tests__/traffic-source-binding-phase2.test.mjs`, covers the five files.

8. Given the traffic file of each of the five apps, when a test reads the step order, then `bind-release-source` is step 1 and comes before the first step that reads the source (`migrate-company-identity` for accounts, `refuse-legacy-db` for primary-advantage, `migrate-db` for the others).
9. Given a source that differs from `_RELEASE_COMMIT_SHA`, when the step runs for each of the five files, then the build stops before that first step. The test runs the shared script on a fixture and reads the step command of each file to confirm that it calls the script with `$_RELEASE_COMMIT_SHA`.
10. Given a matching source, then the script exits 0 for each of the five step commands.
11. Given a missing, default, short, or upper-case SHA, then the script exits non-zero before any fetch, and each file holds the `_RELEASE_COMMIT_SHA` substitution with the `REQUIRED_` default.
12. Given the runbook, then the sections of the five apps name `bind-release-source`.
13. Given the `bind-release-source` step text of each of the five files, then it finds none of the words of criterion 6, and the step uses the image and entrypoint of FR-11.
14. Given the Primary traffic file, when a test reads the step ids, then they are exactly `bind-release-source`, `refuse-legacy-db`, `migrate-db`, `doctor-check`, `update-traffic`, and the bind step holds no `gcloud` command. (The rule of no Primary deploy, no Cloud Build submit, and no revision change is a scope rule of this track, not a test.)

## 6. Out of scope

- A live traffic run, a deploy, a push, and any `gcloud` write, for all six apps. The live runs stay `deferred:daniel` in task 2.3h of `per_app_cicd_20261107`.
- The open limit of `capture-legacy-rollback` in the runbook.
- Any change to `cloudbuild.yaml` (the push file) or to `release-source-manifest.mjs`.

## 7. Questions

Answered by the PM on 2026-11-08:

- **Q1.** Option A (accepted).
- **Q2.** Decided differently: the other traffic files join this track as Phase 2. No separate track.
- **Q2b.** Yes: `primary-advantage` joins Phase 2 (section 3b).
- **Q3.** Yes. The script takes the repository URL as an argument.
- **Q4.** Yes. The script lives in `scripts/ci/` (section 3a).

Added by the spec review of 2026-11-08 (no PM question): the image of the step (section 3a-1), the Phase 2 test file, the tests of criteria 6, 14, and 15, and the sales upload source (section 2: the repository root `.`).

Open (default used):

- **Q5.** Task 2.3h of `per_app_cicd_20261107` names five apps and not `primary-advantage`. Should the PM add `primary-advantage` to that task? Default: no change to that task. This spec says the Primary file gates the next Primary traffic move.
- **Q6.** The check compares every uploaded file, so an untracked file in the upload stops the build. Is that acceptable? Default: yes. The check fails closed, and the operator uploads a clean tree.
