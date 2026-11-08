# Test strategy: Bind the traffic sources to the release commit

> **Track:** `sales_traffic_source_binding_20261108` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
>
> **Phase 1 written:** 2026-11-08 at the role base `50cb858bbc209e1f7b1d1b2176e2f22ad03dcd75`. Model: claude-code/claude-opus-5-5. The role base is not the `phase_base_sha` (section 1.4). Phase 2 has an outline only (section P2).

## 1. Rules for every phase

### 1.1 Heavy jobs and disk

- Each Vitest run goes through the heavy wrapper, in the foreground, with `CI=true` and `--maxWorkers=1`:

  ```bash
  HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>; echo "EXIT=$?"'
  ```

- Read the `EXIT=` line, not the exit of the wrapper. One heavy job runs at a time.
- **Disk guard.** Before each Vitest run, run `df -m --output=avail / | tail -1`. If the value is below 3000, stop and report `disk_avail_mb=<n>`. At the role base the value was 10765.
- **Delete after use.** Each test removes its scratch folders in `afterEach` or `afterAll`, on pass and on fail. After each run, `find /tmp /tmp/opencode -maxdepth 1 -name 'traffic-bind-*' | wc -l` must print 0. Label: `scratch_left=<n>`.
- Light work needs no lock: reads, `rg -n`, `git show|log|diff|rev-parse`, and `bash -n scripts/ci/verify-traffic-source.sh`.

### 1.2 Hash rule

- The track adds no hash, no checksum field, no manifest, and no provenance file (AGENTS.md hashing policy, FR-6).
- Git blob ids from `git ls-tree` and `git hash-object` are Git identity (PM Q1, Option A). They are allowed. The tests compare them and compute no other digest.
- This strategy holds no hash field.

### 1.3 Evidence classes

- **Function-level live test.** The test runs the real script with `/bin/bash` on a scratch Git fixture. It proves the behavior of the script. Most Phase 1 cases are this class.
- **Artifact test.** The test reads a file (`cloudbuild-traffic.yaml`, `.gcloudignore`, the runbook, the script text) and checks text or structure. It does not prove that Cloud Build runs the step.
- **Live proof.** A real Cloud Build run of the traffic file. Only Daniel's traffic run gives it (`deferred:daniel`). No test fakes it, and no plan note claims it.
- A plan `[x]` note names the commit, the evidence class, the `EXIT=` value, and the labeled counts (A3, A5).

### 1.4 Capture of `phase_base_sha`

- This file embeds no `phase_base_sha`. The role base `50cb858bb` predates this strategy commit. It is not a valid `phase_base_sha`.
- **Exact point for Phase 1.** The orchestrator runs `git rev-parse HEAD` immediately after the commit of this strategy lands. The capture happens before the Red role writes its first file.
- Verify the capture: `git cat-file -e <sha>:measure/tracks/sales_traffic_source_binding_20261108/test-strategy.md` must exit 0. If it fails, the capture is void; capture again.
- Other tracks commit on master. A later HEAD that holds this file is valid at the capture time. Record the full 40-hex value in the Red evidence and in the phase log.
- Scope checks use the commits of this track only: `git log <phase_base_sha>..HEAD --format=%H --grep='track_id: sales_traffic_source_binding_20261108'`, then `git show --name-only --format= <sha>` for each.
- Phase 2 gets its own capture, by the same command, after the Phase 1 checkpoint commit and before the first Phase 2 Red file.
- All work runs in the shared master tree. No role runs `git worktree add` (A16).

### 1.5 Architecture guardrails and changed-contract risks

Guardrails (a violation is a Review A blocker):

- No new dependency. No edit to `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, or `turbo.json`.
- No edit to `.gcloudignore`, `apps/sales-advantage/cloudbuild.yaml`, `release-source-manifest.mjs`, or `create-sales-release-archive.sh` (spec section 6, FR-10).
- No edit to `scripts/ci/__tests__/helpers/plan.mjs` or `helpers/scratch.mjs`. The new test may import their exports.
- The bind step holds the exact block of spec section 3a-1. It holds no `-c` string, no `secretEnv`, no `env`, and no `apt-get`.
- The script reads no secret, writes nothing outside its `mktemp -d` folder, and calls no network except the one `git fetch` (and the lazy load of `.gcloudignore`) from the URL argument.

Changed contracts (each one gets a test and a review):

- **C1 Script CLI:** `verify-traffic-source.sh <commit> <repo-url> <uploaded-root>`, exit 0 or non-zero, and stderr lines `missing: <path>`, `extra: <path>`, `differs: <path>`. Six traffic files will consume it (Phase 2). A changed argument order breaks all six without a visible sign.
- **C2 Step id `bind-release-source`:** case F-12, the new test, the runbook, and the Phase 2 tests read it.
- **C3 Upload scope:** the expected list follows the `.gcloudignore` of the commit. A later edit of `.gcloudignore` changes the scope of the check with no test change. That is the intended design (spec section 3).

Live risks (no local test can close them; Review B and the live proof must see them):

- **R-L1 In-scope directory link.** At the role base, the path `measure/tracks/backend_architecture_enforcement_20260713` is a symbolic link (mode 120000) to `../archive/backend_architecture_enforcement_20260713`, and `.gcloudignore` keeps it in scope. If `gcloud builds submit` stores the link target files and not the link, the first live run prints `missing:` and `extra:` lines and stops. The stop is safe, but it blocks the traffic move. Review B records it. A fix is a product decision for Daniel.
- **R-L2 Rule difference** between gcloud and `git check-ignore`. It gives a false stop only (spec section 3c).
- **R-L3 Tool set of the builder image** (`bash`, `git`, `sort -z`, `comm -z`). The live log must show both version lines (spec section 3a-1).

### 1.6 Intentionally-red aggregate suites

- The root `pnpm test` and `pnpm turbo run test` are not a gate of this track. CI on master is red for causes outside this track. A red aggregate run is never a phase-gate failure.
- Record a red aggregate run with its first failing step (`ci_first_failing_step=<name>`), not with the word "red" (A3, A5).
- No role fixes an aggregate failure, skips a test, or weakens a filter to make a gate pass.
- Inside the track, one red window is planned: the runbook cases S-30 and S-30b stay red after task 1.2 and turn green in task 1.3 (section P1.6).

### 1.7 Local fixtures only

- Fixtures are scratch Git repositories under `/tmp` (`/tmp/opencode` when it exists, else `os.tmpdir()`), with the prefix `traffic-bind-`.
- The origin of each fixture is a local bare repository with `uploadpack.allowFilter true` and `uploadpack.allowAnySHA1InWant true`. The URL is `file://<absolute path>` (spec section 5).
- The test builds the commit through a work clone, pushes it to the bare repository, and writes the upload as a second scratch folder.
- Not allowed in any role of Phase 1: network access, `gcloud`, a Cloud Build submit, a GitHub workflow run, a container build, an image pull, a clone of the monorepo, and a push.
- The test environment sets `GIT_ALLOW_PROTOCOL=file` and `GIT_TERMINAL_PROMPT=0`. So an `https` fetch fails in every case.
- Git calls of the test and of the script use the hermetic environment of `gitEnv()` in `helpers/scratch.mjs` (`GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1`). Case S-26 is the one exception.
- The script runs as `/bin/bash <repo>/scripts/ci/verify-traffic-source.sh <sha> <url> .` with the upload root as the working folder. This is the form of the step (entrypoint `bash`, the `args` list).

## 2. Facts at the role base (2026-11-08)

- `git rev-parse HEAD` gave `50cb858bbc209e1f7b1d1b2176e2f22ad03dcd75`. `scripts/ci/verify-traffic-source.sh` does not exist. No file under `scripts`, `docs`, or the sales traffic file names `bind-release-source`.
- `scripts/ci/__tests__/cloudbuild-files.test.mjs:340` (case F-12) asserts `ids[0] === "verify-curriculum-backup"`. `ordered()` at `helpers/plan.mjs:317` checks relative order and requires `update-traffic` last.
- The sales traffic file has 11 steps. Line 120 holds `_RELEASE_COMMIT_SHA: "REQUIRED_RELEASE_COMMIT_SHA"`. Lines 17 and 88 use the value as a label. Line 88 holds the words `sha256sum` and `manifest` in another step; criterion 6 reads the bind step only.
- The runbook section `## sales-advantage` starts at `docs/runbooks/traffic-moves.md:127`. Its step list starts with `verify-curriculum-backup`.
- Local tools: `git version 2.53.0`, `GNU bash, version 5.3.9`. `locale -a` lists `en_US.utf8`; in that locale `sort` puts `a` before `B`, and in `C` it puts `B` before `a`.
- At HEAD, `git ls-tree -r` gave 91,473 entries of mode 100644, 49 of mode 100755, 6 of mode 120000, and 0 of mode 160000. One link is in scope (R-L1).
- With `core.autocrlf=true` in the global config, `git hash-object` of a CRLF file gave a different id than `git hash-object --no-filters`. So case S-26 can reject a script that omits `--no-filters`.
- No test may depend on the counts of spec.md:50 (review r7 Nit F17). This strategy uses none.

## 3. Phase summary

| Phase | Risk | Reason |
|---|---|---|
| P1 Sales binding | **high** | The script is a security control on the path that migrates the production database. A false pass keeps the defect open and gives a false belief that the tree is bound. The phase makes no live change, so it is not `critical`. |
| P2 Five other files | **high** | The same control on five files. The Primary step must come before the read-only legacy guard. |

## P1: Bind the sales traffic source to the release commit

### P1.1 Defaults that the spec leaves open

These defaults are test rules only. They change no product decision.

- **D1 Tool message.** A missing-tool stop prints a stderr line that names the tool and does not hold `command not found`. Reason: with `set -e`, bash itself prints `git: command not found`, so only this rule rejects a script without the `command -v` check.
- **D2 No-fetch proof.** The test puts a logging `git` wrapper first in `PATH`. The wrapper is a `#!/bin/bash` file that writes its arguments to a log file and then runs the real `git` by absolute path. "No fetch" means the log holds no `fetch` line and no `init` line. A positive control (case S-01) requires a `fetch` line on a valid run.
- **D3 Output order.** The test merges stdout and stderr into one file descriptor to read the order of the version lines.
- **D4 Fixture builder.** The builder lives in the new test file. Phase 1 adds no helper file, because task 1.4 allows no other path.
- **D5 Pass output.** A pass run prints no `missing:`, `extra:`, or `differs:` line. The spec defines no pass text, so the test asserts none.
- **D6 Actual list.** The actual list is not filtered (spec section 3, step 4). An extra file on an ignored path in the upload stops the run (case S-05).
- **D7 Fixture rules file.** The fixture `.gcloudignore` is the text of the real root `.gcloudignore`, read at test time. Cases S-13 add one line to a copy.

### P1.2 Harness

- New file: `scripts/ci/__tests__/sales-traffic-source-binding.test.mjs`. It holds a JSDoc header and JSDoc on each function (AGENTS.md).
- Changed file: `scripts/ci/__tests__/cloudbuild-files.test.mjs`, case F-12 only.
- Builder `fixture(entries)`: an entry is a regular file (bytes, optional mode 100755), a symbolic link (link text), or a gitlink (`git update-index --add --cacheinfo 160000,<40-hex>,<path>`). It returns `{ bare, url, sha, upload }`. The upload starts as the in-scope files of the commit, written with the same bytes and links.
- Runner `run(sha, url, { cwd, env, pathDir })`: it spawns `/bin/bash <ROOT>/scripts/ci/verify-traffic-source.sh`. It returns `{ status, stdout, stderr, merged, fetchLog }`.
- **Precondition of every script case:** `existsSync(<ROOT>/scripts/ci/verify-traffic-source.sh)` must be true. Reason: a missing script also exits non-zero, so without this check each negative case passes at Red (A4).

### P1.3 Red command and expected failure

Targeted Red command (repository root):

```bash
CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci/__tests__/sales-traffic-source-binding.test.mjs scripts/ci/__tests__/cloudbuild-files.test.mjs
```

Light run (repository root, criterion 7):

```bash
CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci
```

Expected Red result:

- `sales-traffic-source-binding.test.mjs`: every case fails. `tests_passed=0`. Each script case fails on the precondition of P1.2. S-27 fails because the script is absent. S-28 fails because step 0 is `verify-curriculum-backup`. S-29 fails because the script is absent. S-30 fails because the runbook lacks the id.
- `cloudbuild-files.test.mjs`: exactly one failing case, F-12. All other cases pass.
- Any other failure in the light run is a Red defect. The Red fixes it before the commit.
- Record `EXIT=1`, the file count, `tests_failed=<n>`, `tests_passed=<n>`, and the names of the failing cases.

### P1.4 Cases

Each row gives the fail-first reason at Red. Criterion numbers are of spec section 5.

| Case | Crit. | Given and action | Assertion | Fail-first reason |
|---|---|---|---|---|
| S-01 | 2 | Fixture with the real `.gcloudignore`, files in `apps/sales-advantage`, `packages/db/drizzle`, `scripts/ci`, root files, and ignored files (`apps/primary-advantage/x.ts`, `node_modules/x.js`, `.env`). The upload equals the in-scope files. Root arg `.`. | Exit 0. No `missing:`, `extra:`, or `differs:` line. The fetch log holds a `fetch` line (D2 control). | Script absent. |
| S-02 | 1 | Two in-scope files with other bytes in the upload (`a.txt`, `b.txt`). | Exit non-zero. The first `differs:` line is `differs: a.txt`. Both lines appear. No `missing:` or `extra:` line. | Script absent. |
| S-03 | 17 | The upload lacks `packages/db/drizzle/0001_x.sql`. | Exit non-zero. A stderr line is `missing: packages/db/drizzle/0001_x.sql`. | Script absent. |
| S-04 | 17 | The upload holds `apps/sales-advantage/untracked.txt`, which the commit lacks. | Exit non-zero. A line is `extra: apps/sales-advantage/untracked.txt`. | Script absent. |
| S-05 | FR-3, D6 | The upload holds `apps/primary-advantage/evil.ts`, which is on an ignored path. | Exit non-zero. A line is `extra: apps/primary-advantage/evil.ts`. | Script absent. |
| S-06 | 17 | The commit holds `apps/primary-advantage/x.ts` and `node_modules/x.js`. The upload lacks both. | Exit 0. | Script absent. |
| S-07 | 17, FR-3a | The upload lacks `apps/sales-advantage/app/page.tsx` (a path that `!apps/sales-advantage/**` re-includes). | Exit non-zero. A line is `missing: apps/sales-advantage/app/page.tsx`. | Script absent. |
| S-08 | spec §3 step 5 | The upload lacks `B.txt` and `a.txt` and holds `D.txt` and `c.txt`. Env `LANG=en_US.utf8`, no `LC_ALL`. | The stderr lines, in order, are `missing: B.txt`, `missing: a.txt`, `extra: D.txt`, `extra: c.txt`. | Script absent. |
| S-09 | 19 | The commit holds `dir/a b"c` + newline + `d-é.txt`. The upload holds the same bytes. | Exit 0. | Script absent. |
| S-10 | 19 | Same commit. The upload lacks that file. | Exit non-zero. A line starts with `missing: dir/a b"c`. | Script absent. |
| S-11 | 19 | Same commit. The upload holds that file with other bytes. | Exit non-zero. A line starts with `differs: dir/a b"c`. | Script absent. |
| S-12 | 20 | The commit holds a gitlink at `vendor/sub` (in scope). | Exit non-zero. | Script absent. |
| S-13 | 20 | The `.gcloudignore` of the commit holds the line `#!include:extra.ignore`. | Exit non-zero. | Script absent. |
| S-14 | 20 | The commit holds the link `link` with text `target.txt`. The upload holds the same link. | Exit 0. | Script absent. |
| S-15 | 20 | Same commit. The upload link has the text `other.txt`. | Exit non-zero. A line is `differs: link`. | Script absent. |
| S-16 | §3c | Same commit. The upload holds a regular file `link` with the bytes `target.txt` (no newline), so the blob id is the same. | Exit non-zero. A line is `differs: link`. | Script absent. |
| S-17 | 20 | The commit holds `run.sh` with mode 100755. The upload file has mode 0644. A second fixture has the reverse. | Exit 0 in both. | Script absent. |
| S-18 | 3 | Valid fixture URL. SHA forms: no arguments, `""`, `REQUIRED_RELEASE_COMMIT_SHA`, 39 hex, 41 hex, 40 upper-case hex, 40 characters with one `g`, `<sha>` + newline, a space + `<sha>`, `-` + 39 hex. | For each form: exit non-zero, the merged output holds `GNU bash, version` and `git version`, and the fetch log holds no `fetch` and no `init` line. `forms_checked=10`. | Script absent; the output has no version lines. |
| S-19 | 1, 3 | A valid 40-hex SHA that the bare repository does not hold. | Exit non-zero. | Script absent. |
| S-20 | 16 | Script text. Merged output of the `REQUIRED_` run of S-18. | In the text, `bash --version` and `git --version` both come before the first `fetch`. In the output, both version strings come before the last non-empty line. | Script absent. |
| S-21 | 16 | Copy of the script in a scratch folder. `PATH` is a scratch folder with links to the needed tools, without `git`. | Exit non-zero. A stderr line names `git` and does not hold `command not found` (D1). | Script absent. |
| S-22 | 16 | `/bin/bash <copy>`. `PATH` holds the logging `git` wrapper and the other tools, without `bash`. | Exit non-zero. A line names `bash` (D1). No `fetch` in the log. | Script absent. |
| S-23 | 16, Q16 | `PATH` holds a silent `sort` stub that exits 2 on `-z` and else runs the real `sort`. | Exit non-zero. A line names `sort`. No `fetch` in the log. | Script absent. |
| S-24 | 16, Q16 | The same with a `comm` stub. | Exit non-zero. A line names `comm`. No `fetch` in the log. | Script absent. |
| S-25 | spec §3 step 2 | `TMPDIR` is an empty scratch folder. Run the S-01 setup and the S-03 setup. | After each run, `TMPDIR` is empty. | Script absent. |
| S-26 | Q17 | `GIT_CONFIG_GLOBAL` is a scratch file with `core.autocrlf = true`. The commit holds a CRLF file. The upload holds the same bytes. | Exit 0. | Script absent. |
| S-27 | 6 | The script text and `stepText()` of the bind step. | No match of the 10 words of criterion 6, case-insensitive. Control: the same check flags a scratch string that holds `ShA256Sum`. | Script absent; the step is absent. |
| S-28 | 4, FR-11 | The parsed sales traffic file. | `ids[0]` is `bind-release-source`. Its index is below `verify-curriculum-backup` and `migrate-db`. `name` is `gcr.io/cloud-builders/git` with no `@`. `entrypoint` is `bash`. `args` deep-equals the 4 items of spec section 3a-1. The step has no `secretEnv` and no `env`. The substitution default is `REQUIRED_RELEASE_COMMIT_SHA`. | Step 0 is `verify-curriculum-backup`. |
| S-29 | 15 | The bind step text. The real `.gcloudignore`. | No `apt-get` in the step. In a non-bare scratch repository, `git -c core.excludesFile=<copy> check-ignore --no-index` exits 1 for `scripts/ci/verify-traffic-source.sh`. The script file exists. | The script and the step are absent. |
| S-30 | 5 | `sectionText(runbook, "sales-advantage")`. | The section holds `bind-release-source`. | The runbook lacks the id. |
| S-30b | 5, task 1.3 | The sentence that starts `Steps, in order:` in that section. | `bind-release-source` comes before `verify-curriculum-backup`. | The list starts with `verify-curriculum-backup`. |
| F-12 | 4 | `cloudbuild-files.test.mjs` case F-12. | Add `bind-release-source` as the first item of the `ordered()` list. Assert `ids[0] === "bind-release-source"` and `ids[1] === "verify-curriculum-backup"`. Keep the two `indexOf` checks. | The traffic file has no `bind-release-source`. |

Criterion 7 is the light-run gate, not a case.

No test reads a path under `measure/` (rule C27 of `per_app_cicd_20261107`).

### P1.5 Adversarial mutant set

The adversarial role applies each mutant to a scratch copy of the script or of the YAML, runs the targeted command, and restores the file. It commits no mutant. Label: `mutants_rejected=<n>/30`.

| Mutant | Change | Case that must reject it |
|---|---|---|
| Y1 | The expected list drops the `check-ignore` filter. | S-06, S-01 |
| Y2 | One-way compare: no `missing:` check. | S-03, S-07, S-10 |
| Y3 | One-way compare: no `extra:` check. | S-04, S-05 |
| Y4 | The actual list is filtered by `.gcloudignore`. | S-05 |
| Y5 | The blob-id compare is removed. | S-02, S-11 |
| Y6 | A link is hashed through its target, or `find -type f` skips links. | S-14 |
| Y7 | The type (file or link) is not compared. | S-16 |
| Y8 | The executable bit is compared. | S-17 |
| Y9 | The `command -v` tool check is removed. | S-21, S-22 |
| Y10 | `pipefail` is missing in the `-z` probe, or its status is ignored. | S-23, S-24 |
| Y11 | The `-z` probe runs after the fetch. | S-23, S-24 |
| Y12 | An empty SHA or no argument is accepted. | S-18 |
| Y13 | The SHA pattern is not anchored. | S-18 (41 hex, newline, space) |
| Y14 | The SHA pattern accepts upper case. | S-18 |
| Y15 | The `REQUIRED_` default is accepted. | S-18 |
| Y16 | A gitlink is accepted. | S-12 |
| Y17 | A `#!include:` line is accepted. | S-13 |
| Y18 | The lists are split at newlines (no `-z`). | S-09 |
| Y19 | `xargs` runs without `-0`. | S-09 |
| Y20 | `git hash-object` runs without `--no-filters`. | S-26 |
| Y21 | `sort` runs without `LC_ALL=C`. | S-08 |
| Y22 | `git init --bare`. | S-01 |
| Y23 | A failed fetch is ignored. | S-19 |
| Y24 | The `trap` is removed. | S-25 |
| Y25 | The bind step moves after `verify-curriculum-backup`. | S-28, F-12 |
| Y26 | The step uses `node:22-slim` and `apt-get install git`. | S-28, S-29 |
| Y27 | The step uses a `-c` string. | S-28 |
| Y28 | The script adds a SHA-256 manifest check. | S-27 |
| Y29 | A mismatch exits 0 (the status is lost in a pipe or a subshell). | S-02, S-03, S-04 |
| Y30 | The version lines print after the SHA check. | S-20 |

Adversarial scenarios (no mutant): a SHA that starts with `-`; a URL argument with a space; an upload root that is a link; an upload with an empty folder. Label: `scenarios_checked=<n>/4`. No scenario may give a false pass. An empty folder is not a file, so it must not stop the run.

### P1.6 Green gates

- **Task 1.2 gate.** Disk guard first. Run the targeted command of P1.3. Required: every case passes except S-30 and S-30b. `tests_failed=2` with those two names. F-12 passes. Then run `bash -n scripts/ci/verify-traffic-source.sh` (exit 0).
- **Task 1.3 gate.** Disk guard first. Run the light command. Required: `EXIT=0`, `tests_failed=0`, `tests_skipped=0`, and the F-16 runbook case passes.
- No Green edits a test to pass, except the F-12 update that the Red owns.

### P1.7 Closeout gate (task 1.4)

1. Disk guard: `disk_avail_mb>=3000`.
2. Light run at the phase head: `CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci`. Record `EXIT=0`, the test file count, the test count, `tests_failed=0`, and `tests_skipped=0`.
3. Targeted run of the two files of P1.3: `EXIT=0`. The record names S-27 (criterion 6) and S-20 to S-24 (criterion 16) as passed.
4. Scope check (section 1.4 commands): the track commits change only `scripts/ci/verify-traffic-source.sh`, `scripts/ci/__tests__/sales-traffic-source-binding.test.mjs`, `scripts/ci/__tests__/cloudbuild-files.test.mjs`, `apps/sales-advantage/cloudbuild-traffic.yaml`, `docs/runbooks/traffic-moves.md`, `measure/tracks.md`, and paths under `measure/tracks/sales_traffic_source_binding_20261108/` and `measure/runs/sales_traffic_source_binding_20261108/`. Label: `p1_out_of_scope_paths=0`.
5. No-change check: `git diff --stat <phase_base_sha> HEAD -- .gcloudignore apps/sales-advantage/cloudbuild.yaml apps/sales-advantage/scripts package.json pnpm-lock.yaml scripts/ci/__tests__/helpers` prints 0 lines. Other tracks can change other files; this list must not change.
6. Hash detector: `rg -n -i 'sha256|sha-256|sha256sum|sha1sum|shasum|md5sum|openssl dgst|checksum|createHash|manifest' scripts/ci/verify-traffic-source.sh` exits 1. The same command exits 0 on a scratch file that holds `sha256sum` (A14 control).
7. Measure-read detector: `rg -n '(readFile|readFileSync|existsSync|readText)\([^)]*measure/' scripts/ci/__tests__/sales-traffic-source-binding.test.mjs` exits 1.
8. Clean state: `scratch_left=0`. `git worktree list | wc -l` prints the same value as at the phase base (A16).
9. Header check: each commit subject of the track is 100 characters or less.
10. Adversarial set: `mutants_rejected=30/30` and `scenarios_checked=4/4`. The main checkout holds no mutant file after the round.
11. Review A, Review B, and Review C each give a pass at the phase head. The browser review is recorded as not applicable.
12. Phase acceptance gives a pass against FR-1 to FR-6, FR-3a, FR-10 to FR-13, and criteria 1 to 7, 15 to 17, 19, and 20.
13. The plan note of task 1.4 states that no role ran `gcloud`, a Cloud Build submit, a workflow run, or a push. It states that the live proof is open.
14. **Live proof, `deferred:daniel`.** The first sales traffic Cloud Build run shows the two version lines and a pass of `bind-release-source` before `migrate-db`. It belongs to task 2.3h of `per_app_cicd_20261107`, which stays `[b]` with `deferred:daniel`. Risk R-L1 is recorded with it.

### P1.8 Document tests and live tests

- S-28, S-29, S-30, S-30b, S-27, the text part of S-20, and F-12 are artifact tests. They prove the text of the YAML, the runbook, and the script. They do not prove a Cloud Build run.
- S-01 to S-26 and the run part of S-20 are function-level live tests of the script on local Git data. They prove the compare and the stop rules. They do not prove the GitHub fetch, the builder image, or the gcloud upload form.
- The live proof is item 14 of P1.7. Text that calls the binding "live" or "proven in Cloud Build" before that run is an A5 or A6 defect.

### P1.9 Review gates

| Review | Applies | Reason and checks |
|---|---|---|
| Review A (correctness) | **yes, required** | The compare method of spec section 3, the table of section 3c, the NUL path from `ls-tree -z` to `comm -z`, the exit codes, the line order, the `trap`, the exact step block, the F-12 update, and the scope of P1.7 item 4. |
| Review B (security) | **yes, required** | The step fetches code from GitHub inside Cloud Build, and it gates a step that migrates the production database. Checks: the `args` form gives no shell injection; the SHA check runs before any Git use of the value, so a value that starts with `-` cannot become an option; the step holds no secret and no credential URL; the URL is fixed in the YAML; the step runs before every `secretEnv` step; fail-closed on each error path; the `.gcloudignore` of the upload is itself compared. Review B also confirms or refutes this point: GitHub can serve a commit that exists only in a fork through the upstream URL. If so, the check binds the upload to the named commit, not to a commit of `master`. Review B records that limit and R-L1. A change of the limit is a decision for Daniel. |
| Review C (UX/API) | **yes, required** | There is no screen. The operator API changes: the script CLI (C1), the `missing:`, `extra:`, and `differs:` lines, the tool messages, and the sales runbook text (FR-5, FR-10, FR-12). The text must tell the operator what stopped and what to do. |
| Adversarial testing | **yes, required** | The 30 mutants and 4 scenarios of P1.5. The risk is `high`. |
| Browser review (UX) | **no** | No page, component, or route changes. The only human surface is a build log and a runbook. |
| Phase acceptance | **yes, required** | P1.7 item 12. |

### P1.10 Anti-pattern coverage

| ID | Defense in Phase 1 | Falsification condition |
|---|---|---|
| A1 | Task 2.3h of `per_app_cicd_20261107` stays `[b] ... deferred:daniel`. No free text "deferred" stands for a marker. | The live proof counts as done, or the marker is not `[b]`. |
| A3 | Each count is a labeled integer: `forms_checked`, `tests_failed`, `tests_passed`, `tests_skipped`, `mutants_rejected`, `scenarios_checked`, `scratch_left`, `p1_out_of_scope_paths`, `disk_avail_mb`. A check parses the integer after its label. | A bare number or a date passes a count check. |
| A4 | The script-exists precondition in each script case. The `fetch` control in S-01 before any "no fetch" claim. `forms_checked=10` before the S-18 loop. Negative cases assert a named stderr line, not only a non-zero exit. | A case passes while the script is absent, or a "no fetch" check passes with a dead wrapper. |
| A5 | Plan notes quote `EXIT=`, the labels, and the case names. No note claims a Cloud Build result. | A note says that the step ran in Cloud Build or that a run passed. |
| A6 | `measure/tracks.md` and the runbook do not call the defect fixed in production before item 14 of P1.7. | The registry says "resolved" while the live proof is open. |
| A7 | The forbidden-word check of S-27 reads the bind step only, not the whole file (line 88 holds `sha256sum` legally). The `.gcloudignore` check of S-29 runs `check-ignore` and does not match text. | The check flags line 88, or a pattern such as `scripts/**` passes a text check. |
| A8 | The plan uses `[ ]`, `[~]`, `[x]`, and `[b]` as its rules section defines. No task holds `[ ]` with "blocked" prose. | A blocked task uses `[ ]`. |
| A9 | No test reads `measure/` as data (P1.7 item 7). | The detector finds a hit. |
| A10 | Does not apply: the phase generates no facts file. | A generated facts file appears in the scope. |
| A11 | Reviews A, B, and C run and report before the closeout. No task stays `[b] deferred:review-execution`. | The phase closes while a review has no result. |
| A12, A13 | Do not apply: no catalog guard and no archive move change. | A guard reference dangles, or a track folder moves. |
| A14 | Each `rg` detector of P1.7 has a scratch control that must hit. Exit 2 is a failure. | A bad option gives no hit and the gate passes. |
| A15 | Does not apply: the track adds no receipt and no hash. | A receipt hash or a checksum field appears. |
| A16 | Scratch folders only under `/tmp`. The worktree count stays the same. | The count changes. |

A2 does not apply: the phase has no publish gate with named subjects.

## P2: Bind the other five traffic sources to the release commit (outline)

- **Risk:** `high`. The step joins five files. For `primary-advantage`, it must come before `refuse-legacy-db` (spec section 3b).
- **Red file:** `scripts/ci/__tests__/traffic-source-binding-phase2.test.mjs`, criteria 8 to 14 and 18.
- **Red command:** `CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci/__tests__/traffic-source-binding-phase2.test.mjs`. **Gate:** the light command of P1.3, `EXIT=0`.
- **Main cases:** step 1 and its order against the first source step of each file (criterion 8); the exact block and the `REQUIRED_` default in each file (criteria 11 and 13); the exact Primary step ids and no `gcloud` in the bind step (criterion 14); each runbook section names the step and `_RELEASE_COMMIT_SHA` (criterion 12, FR-9).
- **Criterion 18 method:** read the `args` of each bind step. Assert that they name the script and `$_RELEASE_COMMIT_SHA`. Replace the SHA with the fixture commit and the GitHub URL with the `file://` URL. Run `/bin/bash` with that list in the scratch upload root, which holds a copy of the script. No `-c` string.
- **Open scope point for the Phase 2 strategy:** Phase 2 needs the fixture builder of Phase 1. A shared helper file under `scripts/ci/__tests__/helpers/` is outside the Phase 1 paths. The Phase 2 strategy must state the allowed path before the Red starts.
- **Mutants:** the bind step after `refuse-legacy-db` or after `migrate-company-identity`; a missing substitution; a GitHub URL with a typing error in one file; a `-c` string in one file.
- **Reviews:** A, B, C, adversarial, and phase acceptance apply. The browser review does not apply. Review B checks that the Primary read-only guard still runs before every migrate step.
- **Scope rule (Q2b):** no Primary deploy, no Cloud Build submit, and no revision change. Traffic moves stay Daniel's word. The live proofs stay `deferred:daniel` in task 2.3h (four apps) and task 2.3c (`primary-advantage`) of `per_app_cicd_20261107`.
- **`phase_base_sha`:** a new capture after the Phase 1 checkpoint (section 1.4).
