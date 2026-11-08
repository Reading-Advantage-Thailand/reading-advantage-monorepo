# Specification: Bind the sales traffic source to the release commit

**Track ID:** `sales_traffic_source_binding_20261108`
**Type:** chore (classic FR list). It is a security fix of the release path.
**Status:** new. Opened 2026-11-08.
**Author model:** claude-code/claude-sonnet-5-5
**Plan:** [plan.md](./plan.md)
**Depends on:** nothing.
**Blocks:** task 2.3h of `measure/tracks/per_app_cicd_20261107/plan.md`, for `sales-advantage` only. That task runs the `cloudbuild-traffic.yaml` files and stays `deferred:daniel`. The first sales traffic run waits for this track (test-strategy rows M53, C31, and Q18 of that track).

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
- The four other traffic files (`accounts`, `accounting`, `codecamp-advantage`, `marketing`) do not mention `_RELEASE_COMMIT_SHA`. Each has a `migrate-db`-type step. They appear to hold the same defect. See Q2.

## 3. Binding choice (decision Q1)

The AGENTS.md hashing policy says: prefer Git commit or tree identity, and stop and explain before a hash spreads to a new file.

**Option A (default): bind with Git identity. No new hash.**
A new first step `bind-release-source` runs before `verify-curriculum-backup` and so before `migrate-db`. The step does three things:

1. It refuses a `_RELEASE_COMMIT_SHA` that is not 40 lowercase hex characters. This includes the default `REQUIRED_RELEASE_COMMIT_SHA`.
2. It fetches that commit from the upstream repository into a temporary directory.
3. It lists each uploaded file, except `release-source.json`. For each file it compares the Git blob id of the file with the blob id of the same path in the commit. A file that is missing from the commit, or that differs, stops the build.

Reason for the form: the upload has no `.git`, so a check "uploaded tree equals tree of the commit" needs the commit from outside. The upload is a subset of the commit (a fixed path list), so a subset check is the smallest exact test. The blob ids are Git identity. The step adds no SHA-256 field and no manifest. A small script holds the logic so that a test can run it against a local fixture repository: `apps/sales-advantage/scripts/verify-traffic-source.sh <commit> <repo-url> <uploaded-root>`. The YAML passes the GitHub URL. The fetch is read-only and uses no secret, because the repository is public. If the repository becomes private, the step needs a credential. That change needs Daniel's word.

**Option B: reuse `release-source-manifest.mjs verify`.**
The traffic file would run the same SHA-256 manifest check as the push file, with a new substitution `_RELEASE_SOURCE_MANIFEST_SHA256`. This spreads an existing SHA-256 check to one more build file. Reason it could be chosen: it needs no network fetch and it matches the push path. Reason it is not the default: the policy tells us to prefer Git identity, and the hash would also bind only to the manifest, not to the commit itself, because the manifest hash comes from the operator.

**Q1 for the PM and Daniel:** Option A or Option B? Default: **Option A**. The plan and the tasks follow Option A. A change to Option B changes tasks 1.1 and 1.2 only.

## 4. Functional requirements

- **FR-1.** `apps/sales-advantage/cloudbuild-traffic.yaml` holds a step `bind-release-source` that comes before `verify-curriculum-backup` and before `migrate-db`.
- **FR-2.** The step stops the build (non-zero exit) when `_RELEASE_COMMIT_SHA` is missing, is the `REQUIRED_` default, or is not 40 lowercase hex characters.
- **FR-3.** The step stops the build when any uploaded file (except `release-source.json`) differs from, or is missing in, the release commit.
- **FR-4.** The step passes when each uploaded file equals the file of the release commit at the same path.
- **FR-5.** `docs/runbooks/traffic-moves.md` (the sales section) names the step, says what it checks, and says that a traffic run stops before `migrate-db` on a mismatch.
- **FR-6.** The change adds no SHA-256, checksum field, manifest, or provenance file.

## 5. Acceptance criteria

Each criterion has an automated test in `scripts/ci/__tests__/sales-traffic-source-binding.test.mjs`.

1. Given an uploaded source that differs from `_RELEASE_COMMIT_SHA`, when the script runs, then it exits non-zero and prints the path of the first differing file.
2. Given a matching source, when the script runs, then it exits 0.
3. Given no `_RELEASE_COMMIT_SHA`, the default value, or a short or upper-case value, when the script runs, then it exits non-zero before any fetch.
4. Given the traffic file, when a test reads the step order, then `bind-release-source` has a lower index than `verify-curriculum-backup` and `migrate-db`.
5. Given the runbook, when a test reads the sales section, then it names `bind-release-source`.
6. Given the diff of this track, then no new hash field, manifest, or provenance file appears.
7. The test run `vitest run --maxWorkers=1 scripts/ci` exits 0 (light run).

## 6. Out of scope

- A live traffic run, a deploy, a push, and any `gcloud` write. The live run stays `deferred:daniel` in task 2.3h of `per_app_cicd_20261107`.
- The other four traffic files. See Q2.
- The open limit of `capture-legacy-rollback` in the runbook.
- Any change to `cloudbuild.yaml` (the push file) or to `release-source-manifest.mjs`.

## 7. Questions

- **Q1.** Option A or Option B (section 3)? Default: Option A.
- **Q2.** The four other traffic files appear to hold the same defect. Should the PM open a separate track for them? Default: yes, as a note only. This track creates no task for them.
- **Q3.** Should the script take the repository URL from an argument (default, for the test fixture) or from a hard-coded constant? Default: an argument, with the GitHub URL in the YAML.
