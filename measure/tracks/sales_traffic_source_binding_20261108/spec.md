# Specification: Bind the sales traffic source to the release commit

**Track ID:** `sales_traffic_source_binding_20261108`
**Type:** chore (classic FR list). It is a security fix of the release path.
**Status:** new. Opened 2026-11-08.
**Author model:** claude-code/claude-sonnet-5-5
**Plan:** [plan.md](./plan.md)
**Depends on:** nothing.
**Blocks:** task 2.3h of `measure/tracks/per_app_cicd_20261107/plan.md`, for all five apps. That task runs the `cloudbuild-traffic.yaml` files and stays `deferred:daniel`. Phase 1 gates the first sales traffic run. Phase 2 gates the first traffic run of `accounts`, `accounting`, `codecamp-advantage`, and `marketing` (test-strategy rows M53, C31, and Q18 of that track).
**PM decisions of 2026-11-08:** Q1 is Option A. Q3 is yes. Q2 is decided differently: this track covers the four other files in Phase 2, and no separate track is planned. Reason (PM): one script and one review set cost less than two tracks.

## 1. Purpose

A person starts `apps/sales-advantage/cloudbuild-traffic.yaml` by hand. The person uploads a source tree. The step `migrate-db` applies migrations from that tree to the production database. No step checks that the tree is the release commit.

The push path has a binding. `.github/workflows/cd-apps.yml` passes the pushed commit as `_RELEASE_COMMIT_SHA`. Line 11 of `apps/sales-advantage/cloudbuild.yaml` runs `release-source-manifest.mjs verify` against that value.

The traffic file uses `_RELEASE_COMMIT_SHA` in two places only: `verify-curriculum-backup` and `verify-repair-verify-legacy-rollback`. Both steps use the value as a label. Neither step reads the uploaded files. A wrong tree can therefore change the production schema.

Source: Review B finding F4 (Nit) in `measure/runs/per_app_cicd_20261107/review-b-p3-57bb8376c.log`.

## 2. Facts read on 2026-11-08

- `.gcloudignore` excludes `.git`. The uploaded tree holds no Git data. A step cannot run `git rev-parse HEAD` on it.
- `apps/sales-advantage/scripts/create-sales-release-archive.sh` builds the upload. It runs `git archive` of the release commit for a fixed path list, then writes `release-source.json`.
- `release-source-manifest.mjs verify` uses a SHA-256 manifest. The push file passes the manifest hash as `_RELEASE_SOURCE_MANIFEST_SHA256`.
- The upstream repository is `https://github.com/Reading-Advantage-Thailand/reading-advantage-monorepo.git`.
- The four other traffic files (`accounts`, `accounting`, `codecamp-advantage`, `marketing`) do not mention `_RELEASE_COMMIT_SHA`. Each has a step that reads the uploaded source. That step runs `pnpm install --frozen-lockfile` and a migrate command. The first such step is `migrate-company-identity` (accounts) or `migrate-db` (the other three). So the four files hold the same defect, and each protects the same thing: the production schema, which a wrong tree could change. Phase 2 covers them.
- `apps/primary-advantage/cloudbuild-traffic.yaml` also exists (runbook section `primary-advantage`). The PM decision names five traffic files and not this one. See Q2b.

## 3. Binding choice (decision Q1)

The AGENTS.md hashing policy says: prefer Git commit or tree identity, and stop and explain before a hash spreads to a new file.

**Option A (default): bind with Git identity. No new hash.**
A new first step `bind-release-source` runs before `verify-curriculum-backup` and so before `migrate-db`. The step does three things:

1. It refuses a `_RELEASE_COMMIT_SHA` that is not 40 lowercase hex characters. This includes the default `REQUIRED_RELEASE_COMMIT_SHA`.
2. It fetches that commit from the upstream repository into a temporary directory.
3. It lists each uploaded file, except `release-source.json`. For each file it compares the Git blob id of the file with the blob id of the same path in the commit. A file that is missing from the commit, or that differs, stops the build.

Reason for the form: the upload has no `.git`, so a check "uploaded tree equals tree of the commit" needs the commit from outside. The upload is a subset of the commit (a fixed path list), so a subset check is the smallest exact test. The blob ids are Git identity. The step adds no SHA-256 field and no manifest. The script is shared (see section 3a). A small script holds the logic so that a test can run it against a local fixture repository: `apps/sales-advantage/scripts/verify-traffic-source.sh <commit> <repo-url> <uploaded-root>`. The YAML passes the GitHub URL. The fetch is read-only and uses no secret, because the repository is public. If the repository becomes private, the step needs a credential. That change needs Daniel's word.

**Option B: reuse `release-source-manifest.mjs verify`.**
The traffic file would run the same SHA-256 manifest check as the push file, with a new substitution `_RELEASE_SOURCE_MANIFEST_SHA256`. This spreads an existing SHA-256 check to one more build file. Reason it could be chosen: it needs no network fetch and it matches the push path. Reason it is not the default: the policy tells us to prefer Git identity, and the hash would also bind only to the manifest, not to the commit itself, because the manifest hash comes from the operator.

**Q1 answer (PM, 2026-11-08): Option A.** The plan follows Option A. Option B is not planned.

**Limit after the first push.** The check fetches the release commit from GitHub. The commit must exist on GitHub. A live traffic run can therefore pass only after the first push of that commit. Before that push, every run stops at the check. This is the correct result: the check cannot confirm a commit that GitHub does not hold.

## 3a. Script location (Phase 2)

The five traffic files call one script: `apps/sales-advantage/scripts/verify-traffic-source.sh`. Reason: it is the smallest form. Phase 1 creates the script there, so no file moves and Phase 1 stays unchanged. The root `.gcloudignore` already keeps `apps/sales-advantage/**` in every upload, so the script is present in each of the four builds. Cost: four apps call a script of another app. A later move to a shared folder is possible and is not planned. See Q4.

## 4. Functional requirements

- **FR-1.** `apps/sales-advantage/cloudbuild-traffic.yaml` holds a step `bind-release-source` that comes before `verify-curriculum-backup` and before `migrate-db`.
- **FR-2.** The step stops the build (non-zero exit) when `_RELEASE_COMMIT_SHA` is missing, is the `REQUIRED_` default, or is not 40 lowercase hex characters.
- **FR-3.** The step stops the build when any uploaded file (except `release-source.json`) differs from, or is missing in, the release commit.
- **FR-4.** The step passes when each uploaded file equals the file of the release commit at the same path.
- **FR-5.** `docs/runbooks/traffic-moves.md` (the sales section) names the step, says what it checks, and says that a traffic run stops before `migrate-db` on a mismatch.
- **FR-6.** The change adds no SHA-256, checksum field, manifest, or provenance file.

- **FR-7 (Phase 2).** Each traffic file of `accounts`, `accounting`, `codecamp-advantage`, and `marketing` holds the same step `bind-release-source` as its first step. The step calls the script of Phase 1 with the GitHub URL. Each file holds a new substitution `_RELEASE_COMMIT_SHA` with the default `REQUIRED_RELEASE_COMMIT_SHA`.
- **FR-8 (Phase 2).** The step stops each of the four runs before its first step that reads the source, on any mismatch, and on a missing, default, or malformed SHA.
- **FR-9 (Phase 2).** The runbook sections of the four apps name the step and the stop rule.

## 5. Acceptance criteria

Each criterion has an automated test in `scripts/ci/__tests__/sales-traffic-source-binding.test.mjs`.

1. Given an uploaded source that differs from `_RELEASE_COMMIT_SHA`, when the script runs, then it exits non-zero and prints the path of the first differing file.
2. Given a matching source, when the script runs, then it exits 0.
3. Given no `_RELEASE_COMMIT_SHA`, the default value, or a short or upper-case value, when the script runs, then it exits non-zero before any fetch.
4. Given the traffic file, when a test reads the step order, then `bind-release-source` has a lower index than `verify-curriculum-backup` and `migrate-db`.
5. Given the runbook, when a test reads the sales section, then it names `bind-release-source`.
6. Given the diff of this track, then no new hash field, manifest, or provenance file appears.
7. The test run `vitest run --maxWorkers=1 scripts/ci` exits 0 (light run).

**Phase 2 criteria.** One Red test covers the four files, in the same test file or a new file next to it.

8. Given the traffic file of each of the four apps, when a test reads the step order, then `bind-release-source` is step 1 and comes before the first step that reads the source (`migrate-company-identity` for accounts, `migrate-db` for the others).
9. Given a source that differs from `_RELEASE_COMMIT_SHA`, when the step runs for each of the four files, then the build stops before that first step. The test runs the shared script on a fixture and reads the step command of each file to confirm that it calls the script with `$_RELEASE_COMMIT_SHA`.
10. Given a matching source, then the script exits 0 for each of the four step commands.
11. Given a missing, default, short, or upper-case SHA, then the script exits non-zero before any fetch, and each file holds the `_RELEASE_COMMIT_SHA` substitution with the `REQUIRED_` default.
12. Given the runbook, then the sections of the four apps name `bind-release-source`.
13. Given the diff of Phase 2, then no new hash field, manifest, or provenance file appears.

## 6. Out of scope

- A live traffic run, a deploy, a push, and any `gcloud` write, for all five apps. The live runs stay `deferred:daniel` in task 2.3h of `per_app_cicd_20261107`.
- The traffic file of `primary-advantage`. See Q2b.
- The open limit of `capture-legacy-rollback` in the runbook.
- Any change to `cloudbuild.yaml` (the push file) or to `release-source-manifest.mjs`.

## 7. Questions

Answered by the PM on 2026-11-08:

- **Q1.** Option A (accepted).
- **Q2.** Decided differently: the four other traffic files join this track as Phase 2. No separate track.
- **Q3.** Yes. The script takes the repository URL as an argument.

Open (default used):

- **Q2b.** `apps/primary-advantage/cloudbuild-traffic.yaml` also runs a migrate step from the uploaded source. Should it join Phase 2? Default: no. This track names the five files of the PM decision. The PM may add it as a task.
- **Q4.** Should the script move to a shared folder (for example `scripts/ci/`)? Default: no. It stays at `apps/sales-advantage/scripts/` (section 3a).
