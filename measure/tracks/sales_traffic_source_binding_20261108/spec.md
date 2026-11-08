# Specification: Bind the sales traffic source to the release commit

**Track ID:** `sales_traffic_source_binding_20261108`
**Type:** chore (classic FR list). It is a security fix of the release path.
**Status:** new. Opened 2026-11-08.
**Author model:** claude-code/claude-sonnet-5-5
**Plan:** [plan.md](./plan.md)
**Depends on:** nothing.
**Blocks:** task 2.3h for accounts, accounting, codecamp-advantage, marketing, and sales-advantage, and task 2.3c for primary-advantage, of `measure/tracks/per_app_cicd_20261107/plan.md`. Those tasks run the `cloudbuild-traffic.yaml` files and stay `deferred:daniel`. Phase 2 gates the first traffic run of the first four apps and the next Primary traffic run (task 2.3c). In total this track gates six apps: Phase 1 gates the first sales traffic run, and Phase 2 gates the first traffic run of `accounts`, `accounting`, `codecamp-advantage`, and `marketing`, and the next traffic run of `primary-advantage` (test-strategy rows M53, C31, and Q18 of that track).
**PM decisions of 2026-11-08:** Q1 is Option A. Q3 is yes. Q2 is decided differently: this track covers the other traffic files in Phase 2, and no separate track is planned (reason, PM: one script and one review set cost less than two tracks). Q2b is yes: `primary-advantage` joins Phase 2. Q4 is yes: the shared script lives in `scripts/ci/`.

## 1. Purpose

A person starts `apps/sales-advantage/cloudbuild-traffic.yaml` by hand. The person uploads a source tree. The step `migrate-db` applies migrations from that tree to the production database. No step checks that the tree is the release commit.

The push path has a binding. `.github/workflows/cd-apps.yml` passes the pushed commit as `_RELEASE_COMMIT_SHA`. Line 11 of `apps/sales-advantage/cloudbuild.yaml` runs `release-source-manifest.mjs verify` against that value.

The traffic file uses `_RELEASE_COMMIT_SHA` in two places only: `verify-curriculum-backup` and `verify-repair-verify-legacy-rollback`. Both steps use the value as a label. Neither step compares the uploaded files with the commit. A wrong tree can therefore change the production schema.

Source: Review B finding F4 (Nit) in `measure/runs/per_app_cicd_20261107/review-b-p3-57bb8376c.log`.

## 2. Facts read on 2026-11-08

- The root `.gcloudignore` excludes `.git` on its line 1, and gcloud applies the rules of that file to the upload. The uploaded tree holds no Git data. A step cannot run `git rev-parse HEAD` on it.
- `apps/sales-advantage/scripts/create-sales-release-archive.sh` builds the upload of the push file `cloudbuild.yaml` only. The traffic file does not read its `release-source.json`.
- The traffic upload is the repository root `.`. Reason: line 18 of `docs/runbooks/traffic-moves.md` says a person starts every traffic file with `gcloud builds submit --config=<file> .` from the repository root, and the sales traffic file names no archive and no `release-source.json`.
- `release-source-manifest.mjs verify` uses a SHA-256 manifest. The push file passes the manifest hash as `_RELEASE_SOURCE_MANIFEST_SHA256`.
- The upstream repository is `https://github.com/Reading-Advantage-Thailand/reading-advantage-monorepo.git`.
- The four other traffic files (`accounts`, `accounting`, `codecamp-advantage`, `marketing`) do not mention `_RELEASE_COMMIT_SHA`. Each has a step that reads the uploaded source. That step runs `pnpm install --frozen-lockfile` and a migrate command. The first such step is `migrate-company-identity` (accounts) or `migrate-db` (the other three). So the four files hold the same defect, and each protects the same thing: the production schema, which a wrong tree could change. Phase 2 covers them.
- `apps/primary-advantage/cloudbuild-traffic.yaml` has the same defect. Its steps are `refuse-legacy-db`, `migrate-db`, `doctor-check`, and `update-traffic`. The first step, `refuse-legacy-db`, is a read-only guard of the legacy database. It still reads the uploaded source: it runs `pnpm install --frozen-lockfile` and then `pnpm --filter @reading-advantage/db refuse-legacy-db`. `migrate-db` (near line 27) migrates from the same source.
- `scripts/ci/` holds `affected-apps.mjs`, `apps.json`, and shell scripts with kebab-case names (`check-graph-db.sh`, `sql-adr-guard.sh`). The name `verify-traffic-source.sh` fits.
- The root `.gcloudignore` excludes `apps/*` and re-includes six apps: accounting, codecamp-advantage, marketing, sales-advantage, accounts, and www-reading-advantage. It does not exclude `scripts/`. So `scripts/ci/` stays in the upload of all six traffic builds, the sales build included.
- Every bash step of the six traffic files runs on `node:22-slim`. That image has no `git`. The steps install `curl` with `apt-get`.

- **Primary scope (F15).** `.gcloudignore` line 3 is `apps/*`, and no line re-includes `apps/primary-advantage` (lines 4 to 16 re-include accounting, codecamp-advantage, marketing, sales-advantage, accounts, and www-reading-advantage only). So `apps/primary-advantage` stays outside the root upload of its traffic file. The steps of `apps/primary-advantage/cloudbuild-traffic.yaml` (lines 22, 31, and 40) read `packages/db` through `pnpm --filter @reading-advantage/db` and the root files. The Primary check therefore covers `packages/`, `scripts/ci/`, and the root files, and not the app folder. The other four Phase 2 apps and sales-advantage are re-included at `.gcloudignore` lines 4 to 5 (accounting), 8 to 9 (codecamp-advantage), 10 to 11 (marketing), 12 to 13 (sales-advantage), and 14 to 15 (accounts), so their app folders are in the check.

## 3. Binding choice (decision Q1)

The AGENTS.md hashing policy says: prefer Git commit or tree identity, and stop and explain before a hash spreads to a new file.

**Option A (default): bind with Git identity. No new hash.**
A new first step `bind-release-source` runs before `verify-curriculum-backup` and so before `migrate-db`. The step does five things:

1. It refuses a `_RELEASE_COMMIT_SHA` that is not 40 lowercase hex characters. This includes the default `REQUIRED_RELEASE_COMMIT_SHA`.
2. It fetches that commit into a scratch folder. The folder is `mktemp -d` under `${TMPDIR:-/tmp}`, and a `trap` removes it on exit. The commands are `git init`, `git remote add origin <url>`, and `git fetch --depth=1 --filter=blob:none origin <sha>`. The named remote lets Git load the one blob `.gcloudignore` on demand. The fetch needs trees only, because `git ls-tree` gives the blob ids. GitHub serves a fetch of a bare SHA that it holds.
3. It builds the expected path list from NUL-separated data only: `git ls-tree -r -z <sha>`. Each record is `<mode> <type> <blob id>`, a tab, and the path; the script splits a record at the first tab. The step reads the `.gcloudignore` of that commit with `git show <sha>:.gcloudignore` into a file and runs `git -c core.excludesFile=<that file> check-ignore --no-index --stdin -z` on the paths. Plain `-z` is enough: without `-v`, the command prints each ignored path, NUL-terminated and unquoted, and the step needs no more. A path that the command prints is outside the upload and leaves the list. The step uses a non-bare repository (plain `git init`, never `--bare`), because `git check-ignore` exits 128 in a bare repository. The work tree of that repository is empty and holds no `.gitignore`, so only that file filters.
4. It builds the actual path list: `cd <root> && find . \( -type f -o -type l \) -print0`, then removes the leading `./` of each path (for example `sed -z 's|^\./||'`). The paths are relative to the upload root.
5. Both lists are sorted bytewise with `LC_ALL=C sort -z` and compared with `comm -z -3`. The lists must be equal. If they differ, the script prints one line for each difference on standard error and exits 1, in this order: first every `missing: <path>` (the commit holds it in scope, the upload lacks it), then every `extra: <path>` (the upload holds it, the commit lacks it), each group in bytewise order. The first line names the first problem. The comparison itself is byte exact, so a path with a space, a quote, a newline, or a non-ASCII character compares as it is; a newline in a name affects only the display of the line. If the lists are equal, the script compares the blob id of each path, in the same sorted order, and prints `differs: <path>` for each path whose id differs or whose type differs from the commit, then exits 1. A regular file gets its id from `git hash-object --no-filters -- <path>` (in batches with `xargs -0`); a symbolic link gets it from `readlink -n -- <path> | git hash-object --stdin`. All special entries follow section 3c.

Method check on 2026-11-08, with plain `git` in a scratch repository and no new tool: for the commit at HEAD of the real repository, `git ls-tree -r` gave 91,528 paths, `check-ignore` removed 5,953, and 85,575 stayed in the expected list. That check used a full local repository and no `-z`. The Red test (task 1.1) proves the partial fetch, the `-z` form, and the on-demand load of `.gcloudignore` against a fixture.

Reason for the form: the upload has no `.git` (line 1 of the root `.gcloudignore` is `.git`, and gcloud applies that file to the upload), so a check "uploaded tree equals tree of the commit" needs the commit from outside. The scope of the upload is defined by `.gcloudignore`, so the expected list uses the same rule on the commit. A second list of folders would be a copy that can drift from that file; this is why the method does not pick a folder scope. The blob ids are Git identity. The step adds no SHA-256 field and no manifest. The script is shared (see section 3a). A small script holds the logic so that a test can run it against a local fixture repository: `scripts/ci/verify-traffic-source.sh <commit> <repo-url> <uploaded-root>`. The YAML passes the GitHub URL. The fetch is read-only and uses no secret, because the repository is public. If the repository becomes private, the step needs a credential. That change needs Daniel's word.

**Option B: reuse `release-source-manifest.mjs verify`.**
The traffic file would run the same SHA-256 manifest check as the push file, with a new substitution `_RELEASE_SOURCE_MANIFEST_SHA256`. This spreads an existing SHA-256 check to one more build file. Reason it could be chosen: it needs no network fetch and it matches the push path. Reason it is not the default: the policy tells us to prefer Git identity, and the hash would also bind only to the manifest, not to the commit itself, because the manifest hash comes from the operator.

**Q1 answer (PM, 2026-11-08): Option A.** The plan follows Option A. Option B is not planned.

**Limit after the first push.** The check fetches the release commit from GitHub. The commit must exist on GitHub. A live traffic run can therefore pass only after the first push of that commit. Before that push, every run stops at the check. This is the correct result: the check cannot confirm a commit that GitHub does not hold.

## 3c. Special entries and rule differences

One table states the behavior for each special case. The script exits non-zero (fails closed) on the first two.

| Case | Behavior |
|---|---|
| Submodule entry (mode 160000) in the expected list | Fail closed. |
| A line that starts `#!include:` in the `.gcloudignore` of the commit | Fail closed. Git reads such a line as a comment, so the filter would be wrong. The file has no such line today. |
| Symbolic link | The script compares the blob id of the link text (`readlink -n`) with the blob id of the commit entry (mode 120000). A type difference between file and link is a `differs:` line. |
| Executable bit | Not compared (PM Q13, accepted: the steps run files through `node`, `pnpm`, and `bash`, which ignore the bit). |
| Rule syntax | gcloud documents `.gcloudignore` with the syntax of `.gitignore`, plus the `#!include:` line. So `git check-ignore` with that file as the exclude file applies the same rules. If another difference exists, a path appears in one list only and the build stops. A false stop is safe; a false pass cannot come from it. |

## 3a. Script location (PM decision Q4)

The six traffic files call one script: `scripts/ci/verify-traffic-source.sh`. Reason: shared code lives outside any one app, and the folder already holds the shell scripts of the CI. Phase 1 creates the script there. Each traffic upload is the repository root `.`, and the root `.gcloudignore` keeps `scripts/ci/` in it. `apps/primary-advantage` is the one app folder that stays outside the upload of its own file (section 2); the script path `scripts/ci/` does not depend on it. So the `.gcloudignore` file and `create-sales-release-archive.sh` need no change.

## 3a-1. Container image of the step (review finding F1)

The step `bind-release-source` uses this exact block. The image is written as the other steps write theirs: a quoted tag and no digest (`name: "node:22-slim"`, `name: "gcr.io/cloud-builders/gcloud"`; no `@sha256:` appears in any `cloudbuild-traffic.yaml`). The `bash` entrypoint runs the script directly with the four `args`; there is no `-c` string, so no `$$` escape and no shell quoting is needed. Cloud Build replaces `$_RELEASE_COMMIT_SHA` before the step starts. The step reads no environment variable and no secret. The arguments are, in order: the release commit, the repository URL, and the uploaded root.

```yaml
  - name: "gcr.io/cloud-builders/git"
    id: "bind-release-source"
    entrypoint: "bash"
    args:
      - "scripts/ci/verify-traffic-source.sh"
      - "$_RELEASE_COMMIT_SHA"
      - "https://github.com/Reading-Advantage-Thailand/reading-advantage-monorepo.git"
      - "."
```

The file also holds `_RELEASE_COMMIT_SHA: "REQUIRED_RELEASE_COMMIT_SHA"` under `substitutions:` (a new key in the five Phase 2 files; the sales file has it). The script path is relative to the Cloud Build workspace, which is the upload root.

Reason: the builder image holds `git`, so the step needs no `apt-get` install; `node:22-slim` has no `git`. Base image: the Dockerfile of the builder is `FROM gcr.io/cloud-builders/gcloud-slim`, with `ENTRYPOINT ["/usr/bin/notice.sh"]`, a `/bin/sh` script that runs `git "$@"` (source: https://raw.githubusercontent.com/GoogleCloudPlatform/cloud-builders/master/git/Dockerfile and `notice.sh` in the same folder). The Dockerfile does not state `bash`. The `entrypoint: "bash"` replaces the builder entrypoint. The gcloud-slim base is a Debian image, and bash is a Debian base package; the existing `gcr.io/cloud-builders/gcloud` steps of the sales file already use `entrypoint: "bash"`. The step uses `git init`, `git fetch`, and `git hash-object` only.

**Tool check (review finding F-R3-1).** The script prints `bash --version` and `git --version` as its first output, before the commit check and before any fetch. It exits non-zero, with a message that names the missing tool, when `command -v bash` or `command -v git` fails. Then, still before any fetch, it runs the small check `printf 'b\0a\0' | sort -z | comm -z - /dev/null >/dev/null`. If `sort` or `comm` does not support `-z`, the check fails, the script exits non-zero with a message that names the tool, and no traffic moves (PM order Q16). So a missing tool stops step 1 before `migrate-db` (and before `refuse-legacy-db` for Primary), and no traffic moves. The first traffic-file Cloud Build run of each app is the live proof: its log shows both version lines. Fallback: if a run stops at this check, the fix is another image that holds git and bash, written in the same quoted-tag form with no digest. The live proof stays with Daniel's traffic run (task 2.3h for accounts, accounting, codecamp-advantage, marketing, and sales-advantage, and task 2.3c for primary-advantage, of `per_app_cicd_20261107`; both `deferred:daniel`).

## 3b. Where the Primary step goes (Phase 2)

The step `bind-release-source` is step 1 of the Primary file, before `refuse-legacy-db`. Reason: `refuse-legacy-db` runs `pnpm install` and a script of the `db` package from the uploaded source. A wrong tree could change that guard and disable it. The bind step must run first. The bind step reads the database in no way. It does not weaken the read-only guard: the guard still runs before any migrate step. This phase makes no Primary deploy, no Cloud Build submit, and no revision change. The next Primary deploy stays the team's, on Daniel's word.

## 4. Functional requirements

- **FR-1.** `apps/sales-advantage/cloudbuild-traffic.yaml` holds a step `bind-release-source` that comes before `verify-curriculum-backup` and before `migrate-db`.
- **FR-2.** The step stops the build (non-zero exit) when `_RELEASE_COMMIT_SHA` is missing, is the `REQUIRED_` default, or is not 40 lowercase hex characters.
- **FR-3.** The step stops the build when any uploaded file differs from the same path in the release commit, or is missing in the commit.
- **FR-4.** The step passes only when the expected list and the actual list are equal and each common path has the same blob id.
- **FR-5.** `docs/runbooks/traffic-moves.md` (the sales section) names the step, says what it checks, and says that a traffic run stops before `migrate-db` on a mismatch.
- **FR-3a.** The check is two-way inside the upload scope (section 3). A path that the commit holds in scope and the upload lacks stops the build, as does an uploaded path that the commit lacks.
- **FR-13.** The lists are NUL-separated from `git ls-tree -r -z` to the compare, and the special entries follow section 3c.
- **FR-6.** The change adds no SHA-256, checksum field, manifest, or provenance file.
- **FR-10.** The script is `scripts/ci/verify-traffic-source.sh`. The sales upload is the repository root `.` and holds it. The sales section of the runbook says so, and no archive script changes.
- **FR-11.** The step `bind-release-source` of each file has the block of section 3a-1 (`name: "gcr.io/cloud-builders/git"`, `id: "bind-release-source"`, `entrypoint: "bash"`, and the four `args`) and installs nothing. The step prints the two version lines first and fails closed on a missing tool (section 3a-1).
- **FR-12.** The runbook rules for every traffic file say: start from a clean checkout of the release commit, because an untracked file in the upload stops the build (Q6).

- **FR-7 (Phase 2).** Each traffic file of `accounts`, `accounting`, `codecamp-advantage`, `marketing`, and `primary-advantage` holds the same step `bind-release-source` as its first step. The step calls the script of Phase 1 with the GitHub URL. Each file holds a new substitution `_RELEASE_COMMIT_SHA` with the default `REQUIRED_RELEASE_COMMIT_SHA`. The runbook tells the operator to pass it (FR-9).
- **FR-8 (Phase 2).** The step stops each of the five runs before its first step that reads the source (for `primary-advantage`, `refuse-legacy-db`), on any mismatch, and on a missing, default, or malformed SHA.
- **FR-9 (Phase 2).** The runbook sections of the five apps name the step and the stop rule. Each section also names `_RELEASE_COMMIT_SHA` as a substitution and tells the operator to pass `--substitutions=_RELEASE_COMMIT_SHA=<lowercase 40-character release commit>` (together with the substitutions that the section already names). A missing or empty value fails the bind step closed, so the run stops at step 1. Reason: line 19 of `docs/runbooks/traffic-moves.md` passes only the substitutions that a section names, and the default is `REQUIRED_RELEASE_COMMIT_SHA`.

## 5. Acceptance criteria

Each criterion has an automated test. Criteria 1 to 7, 15 to 17, 19, and 20 are in `scripts/ci/__tests__/sales-traffic-source-binding.test.mjs` (task 1.1). Criteria 8 to 14 and 18 are in the new file `scripts/ci/__tests__/traffic-source-binding-phase2.test.mjs` (task 2.1). No test reads `measure/` (rule C27 of `per_app_cicd_20261107`).

1. Given an uploaded source that differs from `_RELEASE_COMMIT_SHA`, when the script runs, then it exits non-zero and prints the path of the first differing file.
2. Given a matching source, when the script runs, then it exits 0.
3. Given no `_RELEASE_COMMIT_SHA`, the default value, or a short or upper-case value, when the script runs, then it exits non-zero before any fetch.
4. Given the traffic file, when a test reads the step order, then `bind-release-source` has a lower index than `verify-curriculum-backup` and `migrate-db`.
5. Given the runbook, when a test reads the sales section, then it names `bind-release-source`.
6. Given the script and the `bind-release-source` step of the sales traffic file, when a test reads their text, then it finds none of `sha256`, `sha-256`, `sha256sum`, `sha1sum`, `shasum`, `md5sum`, `openssl dgst`, `checksum`, `createHash`, or `manifest` (case-insensitive). The forbidden set is a new hash field, a call of a SHA or checksum tool, a checksum file, or a manifest. `git hash-object` and Git blob ids are Git identity (PM Q1, Option A) and are allowed.
7. The test run `vitest run --maxWorkers=1 scripts/ci` exits 0 (light run).
15. Given the sales step, when a test reads it, then its image is `gcr.io/cloud-builders/git`, its entrypoint is `bash`, and its command holds no `apt-get`. Given `.gcloudignore`, when a test reads it, then no pattern excludes `scripts/` or `scripts/ci`, and the file `scripts/ci/verify-traffic-source.sh` exists (task 1.1).
16. Given the script text, when a test reads it, then the two version commands come before the first fetch. Given a scratch folder that holds a copy of the script and a PATH without `git`, when the script runs, then it exits non-zero, prints a message that names `git`, and makes no fetch. The same holds for a PATH without `bash`, with `git` present: the test starts the script with `/bin/bash <script>` by absolute path and sets `PATH` to a scratch folder that holds symbolic links to the other needed tools. Given a scratch `PATH` whose `sort` or `comm` is a stub that exits 2 on `-z`, then the script exits non-zero, prints a message that names that tool, and makes no fetch (Q16). The shell that runs the test is `bash` in all cases (task 1.1).
17. Given a scratch repository with a commit and an upload that lacks one file of the commit (for example a migration file), when the script runs, then it exits non-zero and prints the path of the missing file. Given an upload with one extra file that the commit lacks, then it exits non-zero and prints that path. Given a file of the commit that `.gcloudignore` excludes and the upload lacks, then the script exits 0 (task 1.1).
19. Given a fixture repository whose commit holds a file with a space, a double quote, a newline, and a non-ASCII character in its name, when the upload holds the same file with the same bytes, then the script exits 0. When the upload lacks that file, then the script exits non-zero and prints a `missing:` line. When the upload holds it with other bytes, then the script exits non-zero and prints a `differs:` line (task 1.1).
20. Given the special entries of section 3c, when the script runs on a fixture, then: a commit with a submodule entry exits non-zero; a `.gcloudignore` with a `#!include:` line exits non-zero; a symbolic link with the same target text exits 0 and with another target text exits non-zero; a file whose executable bit differs from the commit exits 0 (task 1.1).

Fixture for criteria 1, 2, 17, 19, and 20: a test creates a scratch bare repository with `mkdtemp` under `os.tmpdir()`, and sets `git config uploadpack.allowFilter true` and `git config uploadpack.allowAnySHA1InWant true` in it. The URL is `file://<absolute path of the bare repository>`. The test commits the fixture tree by a work clone, pushes it, and builds the upload as a second scratch folder. The script gets that URL as its second argument.

**Phase 2 criteria.** One Red test file, `scripts/ci/__tests__/traffic-source-binding-phase2.test.mjs`, covers the five files.

8. Given the traffic file of each of the five apps, when a test reads the step order, then `bind-release-source` is step 1 and comes before the first step that reads the source (`migrate-company-identity` for accounts, `refuse-legacy-db` for primary-advantage, `migrate-db` for the others).
9. Given a fixture upload that differs from the fixture commit, when the script runs with the arguments of each of the five `bind-release-source` blocks, then the script exits non-zero. The test proves two things: the `args` of each file name the script and `$_RELEASE_COMMIT_SHA`, and the script rejects a differing upload. It observes no build. The outcome "the build stops before the first source-reading step" is shown in part by criterion 8 (step order by index) and in full by the deferred live proof (task 2.3h for accounts, accounting, codecamp-advantage, and marketing; task 2.3c for primary-advantage).
10. Given a matching source, then the script exits 0 for each of the five step commands.
11. Given a missing, default, short, or upper-case SHA, then the script exits non-zero before any fetch, and each file holds the `_RELEASE_COMMIT_SHA` substitution with the `REQUIRED_` default.
12. Given the runbook, then the sections of the five apps name `bind-release-source`.
13. Given the `bind-release-source` step text of each of the five files, then it finds none of the words of criterion 6, and the step uses the image and entrypoint of FR-11.
14. Given the Primary traffic file, when a test reads the step ids, then they are exactly `bind-release-source`, `refuse-legacy-db`, `migrate-db`, `doctor-check`, `update-traffic`, and the bind step holds no `gcloud` command. (The rule of no Primary deploy, no Cloud Build submit, and no revision change is a scope rule of this track, not a test.)
18. Given the scratch repository of criterion 17 and the step command of each of the five files, when the upload lacks one file of the commit, then the shared script exits non-zero. Test method: the test reads each of the five files, takes the `args` list of the step `bind-release-source`, replaces `$_RELEASE_COMMIT_SHA` with the fixture commit and the GitHub URL with the `file://` URL of the fixture, and runs `/bin/bash` with the resulting `args` in the scratch upload root. That root holds a copy of the script at `scripts/ci/verify-traffic-source.sh`, which the fixture commit also holds. The test asserts that the `args` name the script and `$_RELEASE_COMMIT_SHA` before it runs them (task 2.1).

## 6. Out of scope

- A live traffic run, a deploy, a push, and any `gcloud` write, for all six apps. The live runs stay `deferred:daniel` in task 2.3h for accounts, accounting, codecamp-advantage, marketing, and sales-advantage, and task 2.3c for primary-advantage, of `per_app_cicd_20261107`.
- The open limit of `capture-legacy-rollback` in the runbook.
- Any change to `cloudbuild.yaml` (the push file) or to `release-source-manifest.mjs`.

## 7. Questions

Answered by the PM on 2026-11-08 (Q1 to Q6):

- **Q1.** Option A (accepted).
- **Q2.** Decided differently: the other traffic files join this track as Phase 2. No separate track.
- **Q2b.** Yes: `primary-advantage` joins Phase 2 (section 3b).
- **Q3.** Yes. The script takes the repository URL as an argument.
- **Q4.** Yes. The script lives in `scripts/ci/` (section 3a).

Added by the spec review of 2026-11-08 (no PM question): the image of the step (section 3a-1), the Phase 2 test file, the tests of criteria 6, 14, and 15, and the sales upload source (section 2: the repository root `.`). Review r4 added the two-way check (section 3, FR-3a, criteria 17 and 18). Review r6 added the exact `args` block (3a-1), the update of case F-12, the runbook substitution step (FR-9), the non-bare repository, the Primary scope fact, criterion 9 as a proxy test, and the Q16 tool proof. Review r5 added the NUL-separated lists (FR-13, criterion 19), the table of special entries (section 3c, criterion 20), the fixture form, and the forbidden-set wording of criterion 6.

- **Q5 (closed).** Task 2.3h of `per_app_cicd_20261107` names five apps and not `primary-advantage`. Task 2.3c of that track covers the Primary file and points to this track, so the Primary live proof stays with task 2.3c. No change to the other track is needed.
- **Q16 (closed).** PM order, 2026-11-08: the bind step runs `printf 'b\0a\0' | sort -z | comm -z - /dev/null` before the compare. If `-z` is not supported, the step fails closed and no traffic moves (section 3a-1, criterion 16).
- **Q17 (closed).** PM order, 2026-11-08: the accepted default is `xargs -0 -n 500 git hash-object --no-filters`. The Green may pick another batch size.
- **Q13 (closed).** The executable bit is not compared. PM answer, 2026-11-08: accepted (section 3c).
- **Q6 (closed).** The check compares every uploaded file, so an untracked file in the upload stops the build. PM answer, 2026-11-08: accepted. Fail closed on any untracked file in the upload; the operator uploads a clean tree.
