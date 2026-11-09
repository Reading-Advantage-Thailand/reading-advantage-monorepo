# Test strategy: Bind the traffic sources to the release commit

> **Track:** `sales_traffic_source_binding_20261108` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
>
> **Phase 1 written:** 2026-11-08 at the role base `50cb858bbc209e1f7b1d1b2176e2f22ad03dcd75`. Model: claude-code/claude-opus-5-5. The role base is not the `phase_base_sha` (section 1.4). Amendment round 4 replaces the Phase 2 outline with the full Phase 2 strategy (sections P2.1 to P2.10).
>
> **Amendment round 2:** 2026-11-08 at the role base `d5301b5c55e77f5c7258c218aa87af06afae8772`, after the spec and plan commit `0a042ccbb` (criterion 21, FR-14, PM decision Q19). It adds the cases S-31 to S-33, the mutants Y31 to Y33, and the `.gcloudignore` gate items. It does not move the captured `phase_base_sha`.
>
> **Amendment round 3:** 2026-11-09 at the role base `b131f9a16c7deecc1fc4df60e33731476fb8d495`. Model: minimax-cn-coding-plan/MiniMax-M3, a substitute for claude-opus-5-5. Cause: the adversarial round rejected the Y32 form of section P1.5 as an equivalent mutant. A `!` line cannot re-include a path whose parent directory is excluded, so the old form changed no upload list. Evidence: `measure/runs/sales_traffic_source_binding_20261108/adversarial-p1-dd66da7e3.json` and `.log` (commit `b131f9a16c7deecc1fc4df60e33731476fb8d495`). This round replaces the Y32 form with `!measure/` after the line `measure/`. The mutant count stays 33. It does not move the captured `phase_base_sha`. The capture of section 1.4 already happened at the commit that first landed this file, so this amendment creates no new capture point.
>
> **Amendment round 4 (the Phase 2 strategy):** 2026-11-09 at the role base `d36d11da5b657e2c5e55b42331a06853ae70301a`. Model: nvidia/stepfun-ai/step-5-preview, a substitute for claude-code/claude-opus-5-5. Claude is held to 2026-11-10 15:22. Cause: PM decision D10 closes in Phase 2, not only recorded. The cause is the amendment of spec.md section 8 (commits `7dba7cea2`, `e660cde27`, `d36d11da5`): FR-15, criteria 22 and 23, sections 8.2, 8.5, 8.6, and 8.7, and plan.md tasks 2.1 to 2.4. Spec review r3 PASS: `measure/runs/sales_traffic_source_binding_20261108/spec-review-d36d11da5.json` (one Nit F26 at plan.md:70). This round writes the full Phase 2 strategy in sections P2.1 to P2.10. It adds the path `scripts/ci/__tests__/sales-traffic-source-binding-adversarial.test.mjs` (commit `b131f9a16`, phase acceptance Nit N2) to the item 4 list of P1.7 as a recorded amendment. The Phase 1 gate already ran, so the list records a scope fact and changes no Phase 1 result. It does not move the captured Phase 1 `phase_base_sha`. Section 1.4 names the exact capture point for Phase 2.

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
- The capture for Phase 1 happened once, at the commit that landed this file the first time. A later amendment of this file does not move the captured value. The orchestrator keeps the captured value in the Red evidence and in the phase log.
- Verify the capture: `git cat-file -e <sha>:measure/tracks/sales_traffic_source_binding_20261108/test-strategy.md` must exit 0. If it fails, the capture is void; capture again.
- Other tracks commit on master. A later HEAD that holds this file is valid at the capture time. Record the full 40-hex value in the Red evidence and in the phase log.
- Scope checks use the commits of this track only: `git log <phase_base_sha>..HEAD --format=%H --grep='track_id: sales_traffic_source_binding_20261108'`, then `git show --name-only --format= <sha>` for each.
- Phase 2 gets its own capture, by the same command, after the Phase 1 checkpoint commit and before the first Phase 2 Red file.
- **Exact point for Phase 2.** The orchestrator runs `git rev-parse HEAD` immediately after the commit that lands amendment round 4 of this file. That value is the immutable `phase_base_sha` of Phase 2. The orchestrator records it in the Phase 2 Red evidence and in the phase log. This file embeds no SHA for that capture, and the role base of round 4 is not a valid `phase_base_sha`, because it predates the commit of this amendment. The same check of `git cat-file -e <sha>:measure/tracks/sales_traffic_source_binding_20261108/test-strategy.md` must exit 0, else the capture is void.
- **Recorded amendment of the Phase 1 capture.** The Phase 1 capture stands at the commit that first landed this file. Rounds 2, 3, and 4 change no captured value.
- All work runs in the shared master tree. No role runs `git worktree add` (A16).

### 1.5 Architecture guardrails and changed-contract risks

Guardrails (a violation is a Review A blocker):

- No new dependency. No edit to `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, or `turbo.json`.
- The only edit to `.gcloudignore` is one added line `measure/` (FR-14, task 1.2). No other line of that file changes.
- No edit to `apps/sales-advantage/cloudbuild.yaml`, `release-source-manifest.mjs`, or `create-sales-release-archive.sh` (spec section 6, FR-10).
- No edit to `scripts/ci/__tests__/helpers/plan.mjs` or `helpers/scratch.mjs`. The new test may import their exports.
- The bind step holds the exact block of spec section 3a-1. It holds no `-c` string, no `secretEnv`, no `env`, and no `apt-get`.
- The script reads no secret, writes nothing outside its `mktemp -d` folder, and calls no network except the one `git fetch` (and the lazy load of `.gcloudignore`) from the URL argument.

Changed contracts (each one gets a test and a review):

- **C1 Script CLI:** `verify-traffic-source.sh <commit> <repo-url> <uploaded-root>`, exit 0 or non-zero, and stderr lines `missing: <path>`, `extra: <path>`, `differs: <path>`. Six traffic files will consume it (Phase 2). A changed argument order breaks all six without a visible sign.
- **C2 Step id `bind-release-source`:** case F-12, the new test, the runbook, and the Phase 2 tests read it.
- **C3 Upload scope:** the expected list follows the `.gcloudignore` of the commit. A later edit of `.gcloudignore` changes the scope of the check with no test change. That is the intended design (spec section 3).

Live risks (no local test can close them; Review B and the live proof must see them):

- **R-L1 In-scope directory link (resolved in task 1.2; PM decision Q19).** The path `measure/tracks/backend_architecture_enforcement_20260713` is a tracked symbolic link (mode 120000) to `../archive/backend_architecture_enforcement_20260713`. It is the only tracked link inside the root upload scope. The orchestrator ran `gcloud meta list-files-for-upload .` (local, no API call). It lists 25 regular files under that path and no link entry. So gcloud follows the link, and without a fix the bind step fails closed on every sales run. Q19 makes this a CI and build-config item of the PM, not of Daniel. Task 1.2 adds the line `measure/` to the root `.gcloudignore`, and criterion 21 (cases S-31 to S-33) pins the fix. R-L1 is not part of the `deferred:daniel` live proof. No PM step is expected after task 1.2. If item 16 of P1.7 fails, R-L1 goes back to the PM as `deferred:pm`.
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
- One `gcloud` command is allowed: `gcloud meta list-files-for-upload .` in task 1.2 and in the closeout. It is local and makes no API call. No test calls `gcloud`.
- Not allowed in any role of Phase 1: network access, any other `gcloud` command, a Cloud Build submit, a GitHub workflow run, a container build, an image pull, a clone of the monorepo, and a push.
- The test environment sets `GIT_ALLOW_PROTOCOL=file` and `GIT_TERMINAL_PROMPT=0`. So an `https` fetch fails in every case.
- Git calls of the test and of the script use the hermetic environment of `gitEnv()` in `helpers/scratch.mjs` (`GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1`). Case S-26 is the one exception.
- The script runs as `/bin/bash <repo>/scripts/ci/verify-traffic-source.sh <sha> <url> .` with the upload root as the working folder. This is the form of the step (entrypoint `bash`, the `args` list).

## 2. Facts at the role base (2026-11-08)

- `git rev-parse HEAD` gave `50cb858bbc209e1f7b1d1b2176e2f22ad03dcd75`. `scripts/ci/verify-traffic-source.sh` does not exist. No file under `scripts`, `docs`, or the sales traffic file names `bind-release-source`.
- `scripts/ci/__tests__/cloudbuild-files.test.mjs:340` (case F-12) asserts `ids[0] === "verify-curriculum-backup"`. `ordered()` at `helpers/plan.mjs:317` checks relative order and requires `update-traffic` last.
- The sales traffic file has 11 steps. Line 120 holds `_RELEASE_COMMIT_SHA: "REQUIRED_RELEASE_COMMIT_SHA"`. Lines 17 and 88 use the value as a label. Line 88 holds the words `sha256sum` and `manifest` in another step; criterion 6 reads the bind step only.
- The runbook section `## sales-advantage` starts at `docs/runbooks/traffic-moves.md:127`. Its step list starts with `verify-curriculum-backup`.
- Local tools: `git version 2.53.0`, `GNU bash, version 5.3.9`. `locale -a` lists `en_US.utf8`; in that locale `sort` puts `a` before `B`, and in `C` it puts `B` before `a`.
- At HEAD, `git ls-tree -r` gave 91,473 entries of mode 100644, 49 of mode 100755, 6 of mode 120000, and 0 of mode 160000. One link is in the root upload scope until task 1.2 (R-L1).
- Round 2, at `d5301b5c5`: `scripts/ci/verify-traffic-source.sh` is still absent. The Red r1 file holds the cases S-01 to S-30b.
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
- **D7 Fixture rules file.** The fixture `.gcloudignore` is the text of the real root `.gcloudignore`, read at test time. Case S-13 adds one line to a copy. Case S-33 adds the line `measure/` to a copy when the real text lacks it, so S-33 does not depend on task 1.2.
- **D8 Link check location.** S-31 and S-32 run `git check-ignore --no-index` in an empty non-bare scratch repository with `core.excludesFile=<copy of .gcloudignore>`. They do not run it in the real checkout. Reason: in the real checkout, the `.gitignore` files also apply, and they can hide a path that `.gcloudignore` keeps.
- **D9 No staged mutant.** No role stages a file in the shared index of the real checkout. Other tracks commit on master, and a staged mutant can enter their commit. So S-32 holds a synthetic control, and mutant Y32 uses a negation line (section P1.5).
- **D10 Owner of the fork limit.** By the rule of Q19, a CI and build-config limit belongs to the PM. So the fork-commit limit of Review B (section P1.9) goes to the PM, not to Daniel.

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

**Red round 2 (criterion 21).** The Red adds S-31, S-32, and S-33 to the same file and runs the same two commands. Expected result:

- S-31 and S-32 fail for the reasons of section P1.4: the line `measure/` is absent, and the link path is not ignored.
- S-33 fails at the script-exists precondition.
- The 31 cases of round 1 and F-12 still fail as before.
- Light run: `EXIT=1` and `tests_failed=35` (34 in the new file, and F-12). Record the labels and the fail line of each new case.

Expected Red result (round 1):

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
| S-31 | 21(a) | The real root `.gcloudignore` text. A copy of it is the exclude file of an empty non-bare scratch repository (D8). | The text holds a line that equals `measure/` after trim. `git check-ignore --no-index` prints `measure/tracks/x.md`, so no later `!` line includes it again. | The line `measure/` is absent until task 1.2. |
| S-32 | 21(b) | `git ls-files -s -z` in the repository root. Keep the mode-120000 entries. Run `check-ignore --no-index --stdin -z` on their paths in the scratch repository of D8. | `links_tracked>=1` before the check (6 at the role base). `links_in_scope=0`. The fail message names each path that the rules keep. Control: the same function, given a synthetic entry for `scripts/ci/fake-link` with mode 120000, reports that path. The case reads index data only and no file under `measure/`, so rule C27 holds. | `measure/tracks/backend_architecture_enforcement_20260713` is in scope until task 1.2. |
| S-33 | 21(c) | Scratch commit: the rules text of D7 with the line `measure/`, a directory link `measure/tracks/old` to `../archive/old`, and a regular file `measure/archive/old/plan.md`. The upload lacks both paths. Control: the same tree without the line `measure/`, in the commit and in the upload. | Exit 0 and no `missing:` line. Control: exit non-zero and a `missing:` line for each of the two paths. | Script absent. |
| F-12 | 4 | `cloudbuild-files.test.mjs` case F-12. | Add `bind-release-source` as the first item of the `ordered()` list. Assert `ids[0] === "bind-release-source"` and `ids[1] === "verify-curriculum-backup"`. Keep the two `indexOf` checks. | The traffic file has no `bind-release-source`. |

Criterion 7 is the light-run gate, not a case.

No test reads a path under `measure/` (rule C27 of `per_app_cicd_20261107`). S-31 and S-32 read only `.gcloudignore` and the `git ls-files -s` output. S-33 writes `measure/` paths in a scratch folder only.

### P1.5 Adversarial mutant set

The adversarial role applies each mutant to a scratch copy of the script or of the YAML, runs the targeted command, and restores the file. It commits no mutant. Label: `mutants_rejected=<n>/33`.

Every mutant form must change an observable output of the targeted command. A form that changes no output is an equivalent mutant, and it does not count as rejected. The adversarial role names the form that it applied for each mutant.

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
| Y31 | The line `measure/` is removed from `.gcloudignore` (scratch edit, then restore). | S-31, S-32 |
| Y32 | A tracked link stays outside the ignore rules. Form: in the scratch tree, add the line `!measure/` after the line `measure/` in the root `.gcloudignore` (scratch edit, then restore). No staged file (D9). The negation re-includes the excluded folder, so the tracked link returns to scope in the compare. | S-31, S-32 |
| Y33 | The compare skips the ignore filter on the Git side. | S-33 (the `measure/` paths print as `missing:`), S-06 |

Adversarial scenarios (no mutant): a SHA that starts with `-`; a URL argument with a space; an upload root that is a link; an upload with an empty folder. Label: `scenarios_checked=<n>/4`. No scenario may give a false pass. An empty folder is not a file, so it must not stop the run.

### P1.6 Green gates

- **Task 1.2 gate.** Disk guard first. Run the targeted command of P1.3. Required: every case passes except S-30 and S-30b. `tests_failed=2` with those two names. S-31, S-32, S-33, and F-12 pass. Then run `bash -n scripts/ci/verify-traffic-source.sh` (exit 0).
- **Task 1.2 upload list.** After the `.gcloudignore` edit, run `gcloud meta list-files-for-upload . > /tmp/opencode/traffic-bind-upload.txt` from the repository root. The command is local and makes no API call. Record these labels and then delete the file:
  - `measure_files_in_upload` = `grep -c '^measure/'` of the file. It must be 0.
  - `sales_files_in_upload` = `grep -c '^apps/sales-advantage/'` of the file. It must be 1 or more.
  - `scripts/ci/verify-traffic-source.sh` must be a line of the file.
- **Task 1.3 gate.** Disk guard first. Run the light command. Required: `EXIT=0`, `tests_failed=0`, `tests_skipped=0`, and the F-16 runbook case passes.
- No Green edits a test to pass, except the F-12 update that the Red owns.

### P1.7 Closeout gate (task 1.4)

1. Disk guard: `disk_avail_mb>=3000`.
2. Light run at the phase head: `CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci`. Record `EXIT=0`, the test file count, the test count, `tests_failed=0`, and `tests_skipped=0`.
3. Targeted run of the two files of P1.3: `EXIT=0`. The record names S-27 (criterion 6) S-20 to S-24 (criterion 16), and S-31 to S-33 (criterion 21) as passed.
4. Scope check (section 1.4 commands): the track commits change only `scripts/ci/verify-traffic-source.sh`, `scripts/ci/__tests__/sales-traffic-source-binding.test.mjs`, `scripts/ci/__tests__/cloudbuild-files.test.mjs`, `apps/sales-advantage/cloudbuild-traffic.yaml`, `docs/runbooks/traffic-moves.md`, `.gcloudignore`, `measure/tracks.md`, and paths under `measure/tracks/sales_traffic_source_binding_20261108/` and `measure/runs/sales_traffic_source_binding_20261108/`. Label: `p1_out_of_scope_paths=0`. **Recorded amendment (round 4, 2026-11-09):** the list also holds `scripts/ci/__tests__/sales-traffic-source-binding-adversarial.test.mjs` (commit `b131f9a16`, the Phase 1 adversarial output, phase acceptance Nit N2). The Phase 1 gate already ran, so the addition records a scope fact. Sections P2.2 and P2.7 name the path in the Phase 2 allowed paths and in the Phase 2 scope check.
5. No-change check: `git diff --stat <phase_base_sha> HEAD -- apps/sales-advantage/cloudbuild.yaml apps/sales-advantage/scripts package.json pnpm-lock.yaml scripts/ci/__tests__/helpers` prints 0 lines. Other tracks can change other files; this list must not change.
6. Hash detector: `rg -n -i 'sha256|sha-256|sha256sum|sha1sum|shasum|md5sum|openssl dgst|checksum|createHash|manifest' scripts/ci/verify-traffic-source.sh` exits 1. The same command exits 0 on a scratch file that holds `sha256sum` (A14 control).
7. Measure-read detector: `rg -n '(readFile|readFileSync|existsSync|readText)\([^)]*measure/' scripts/ci/__tests__/sales-traffic-source-binding.test.mjs` exits 1.
8. Clean state: `scratch_left=0`. `git worktree list | wc -l` prints the same value as at the phase base (A16).
9. Header check: each commit subject of the track is 100 characters or less.
10. Adversarial set: `mutants_rejected=33/33` and `scenarios_checked=4/4`. The main checkout holds no mutant file after the round.
11. Review A, Review B, and Review C each give a pass at the phase head. The browser review is recorded as not applicable.
12. Phase acceptance gives a pass against FR-1 to FR-6, FR-3a, FR-10 to FR-14, and criteria 1 to 7, 15 to 17, and 19 to 21.
13. The plan note of task 1.4 states that no role ran `gcloud`, a Cloud Build submit, a workflow run, or a push. It states that the live proof is open.
14. **Live proof, `deferred:daniel`.** The first sales traffic Cloud Build run shows the two version lines and a pass of `bind-release-source` before `migrate-db`. It belongs to task 2.3h of `per_app_cicd_20261107`, which stays `[b]` with `deferred:daniel`. R-L1 is not part of this item (Q19).
15. `.gcloudignore` diff: `git diff <phase_base_sha> HEAD -- .gcloudignore` shows one added line `measure/` and no removed line. Labels: `gcloudignore_lines_added=1` and `gcloudignore_lines_removed=0`.
16. Upload list at the phase head: run the command of the task 1.2 upload list again (P1.6). Required: `measure_files_in_upload=0`, `sales_files_in_upload>=1`, and the script path in the list. Then R-L1 is closed. If a value fails, R-L1 goes to the PM as `deferred:pm`, and the phase does not close.

### P1.8 Document tests and live tests

- S-27 to S-32 (with S-30b), the text part of S-20, and F-12 are artifact tests. S-31 and S-32 read `.gcloudignore` and the index of the real checkout; they do not prove what gcloud uploads. The upload list of P1.6 is the local proof of the upload form. They prove the text of the YAML, the runbook, and the script. They do not prove a Cloud Build run.
- S-01 to S-26, S-33, and the run part of S-20 are function-level live tests of the script on local Git data. They prove the compare and the stop rules. They do not prove the GitHub fetch, the builder image, or the gcloud upload form.
- The live proof is item 14 of P1.7. Text that calls the binding "live" or "proven in Cloud Build" before that run is an A5 or A6 defect.

### P1.9 Review gates

| Review | Applies | Reason and checks |
|---|---|---|
| Review A (correctness) | **yes, required** | The compare method of spec section 3, the table of section 3c, the NUL path from `ls-tree -z` to `comm -z`, the exit codes, the line order, the `trap`, the exact step block, the F-12 update, and the scope of P1.7 item 4. |
| Review B (security) | **yes, required** | The step fetches code from GitHub inside Cloud Build, and it gates a step that migrates the production database. Checks: the `args` form gives no shell injection; the SHA check runs before any Git use of the value, so a value that starts with `-` cannot become an option; the step holds no secret and no credential URL; the URL is fixed in the YAML; the step runs before every `secretEnv` step; fail-closed on each error path; the `.gcloudignore` of the upload is itself compared. Review B also confirms or refutes this point: GitHub can serve a commit that exists only in a fork through the upstream URL. If so, the check binds the upload to the named commit, not to a commit of `master`. Review B records that limit. A change of the limit is a decision for the PM (D10). R-L1: Review B confirms that the line `measure/` removes the only tracked link from the upload, and that no traffic step reads a file under `measure/` (the grep of spec section 2). |
| Review C (UX/API) | **yes, required** | There is no screen. The operator API changes: the script CLI (C1), the `missing:`, `extra:`, and `differs:` lines, the tool messages, and the sales runbook text (FR-5, FR-10, FR-12). The text must tell the operator what stopped and what to do. |
| Adversarial testing | **yes, required** | The 33 mutants and 4 scenarios of P1.5. The risk is `high`. |
| Browser review (UX) | **no** | No page, component, or route changes. The only human surface is a build log and a runbook. |
| Phase acceptance | **yes, required** | P1.7 item 12. |

### P1.10 Anti-pattern coverage

| ID | Defense in Phase 1 | Falsification condition |
|---|---|---|
| A1 | Task 2.3h of `per_app_cicd_20261107` stays `[b] ... deferred:daniel`. No free text "deferred" stands for a marker. | The live proof counts as done, or the marker is not `[b]`. |
| A3 | Each count is a labeled integer: `links_tracked`, `links_in_scope`, `measure_files_in_upload`, `sales_files_in_upload`, `gcloudignore_lines_added`, `forms_checked`, `tests_failed`, `tests_passed`, `tests_skipped`, `mutants_rejected`, `scenarios_checked`, `scratch_left`, `p1_out_of_scope_paths`, `disk_avail_mb`. A check parses the integer after its label. | A bare number or a date passes a count check. |
| A4 | The script-exists precondition in each script case. The `fetch` control in S-01 before any "no fetch" claim. `forms_checked=10` before the S-18 loop. In S-32, `links_tracked>=1` and the synthetic link control. In S-33, the control tree without `measure/`. In the upload list, `sales_files_in_upload>=1` must hold, so a changed path form (for example a `./` prefix) cannot give `measure_files_in_upload=0` by default. Negative cases assert a named stderr line, not only a non-zero exit. | A case passes while the script is absent, or a "no fetch" check passes with a dead wrapper. |
| A5 | Plan notes quote `EXIT=`, the labels, and the case names. No note claims a Cloud Build result. | A note says that the step ran in Cloud Build or that a run passed. |
| A6 | `measure/tracks.md` and the runbook do not call the defect fixed in production before item 14 of P1.7. | The registry says "resolved" while the live proof is open. |
| A7 | The forbidden-word check of S-27 reads the bind step only, not the whole file (line 88 holds `sha256sum` legally). The `.gcloudignore` checks of S-29, S-31, and S-32 run `check-ignore` in an empty scratch repository (D8), so a `.gitignore` rule cannot hide a path that `.gcloudignore` keeps. | The check flags line 88, a pattern such as `scripts/**` passes a text check, or a `.gitignore` rule hides a kept link. |
| A8 | The plan uses `[ ]`, `[~]`, `[x]`, and `[b]` as its rules section defines. No task holds `[ ]` with "blocked" prose. | A blocked task uses `[ ]`. |
| A9 | No test reads `measure/` as data (P1.7 item 7). | The detector finds a hit. |
| A10 | Does not apply: the phase generates no facts file. | A generated facts file appears in the scope. |
| A11 | Reviews A, B, and C run and report before the closeout. No task stays `[b] deferred:review-execution`. | The phase closes while a review has no result. |
| A12, A13 | Do not apply: no catalog guard and no archive move change. | A guard reference dangles, or a track folder moves. |
| A14 | Each `rg` detector of P1.7 has a scratch control that must hit. Exit 2 is a failure. | A bad option gives no hit and the gate passes. |
| A15 | Does not apply: the track adds no receipt and no hash. | A receipt hash or a checksum field appears. |
| A16 | Scratch folders only under `/tmp`. The worktree count stays the same. | The count changes. |

A2 does not apply: the phase has no publish gate with named subjects.

## Phase 2: Bind the other five traffic sources to the release commit

**Risk: `high`.** The same control joins five files, and the ancestor check of FR-15 is a new fail-closed gate on the path that migrates a production database. The phase makes no live change, so it is not `critical`. Section 3 carries the row.

**Scope:** `apps/accounts`, `apps/accounting`, `apps/codecamp-advantage`, `apps/marketing`, and `apps/primary-advantage` (spec FR-7 to FR-9, FR-15, criteria 8 to 14, 18, 22, and 23).

### P2.1 Defaults that the spec leaves open

These defaults are test rules only. They change no product decision.

- **D11 Fixture builder.** The new test file holds its own `fixture(entries)` and `runScript(args, options)` copies. It edits no file under `scripts/ci/__tests__/helpers/`, and it imports nothing from the Phase 1 test file. Reason: the Phase 1 file exports neither function (`scripts/ci/__tests__/sales-traffic-source-binding.test.mjs:344` and `:468`), and the helper files hold build-plan data for other tests.
- **D12 Ancestor fixture.** The fixture of section 8.5 is one `file://` bare repository with two commits on `refs/heads/master` (an older commit and the newer tip), plus a third commit pushed to `refs/pull/7/head`. The third commit is the fork-only commit. `refs/pull/7/head` is a local scratch ref name, so the fixture needs no network and no GitHub call (section 1.7).
- **D13 The exact stop lines.** The section 8.6 line is `verify-traffic-source: the release commit <sha> is not on the upstream master; merge it into master first, then start the traffic run from a commit on master`. The section 8.7 line is `verify-traffic-source: the ancestor check failed (git exit <n>); the run stops`. The Red asserts each full line, with the SHA or the exit code filled in.
- **D14 Position proof by output.** The test proves the position of the ancestor check with the output order, not with the script text only. Each ancestor row asserts that no `missing:`, `extra:`, or `differs:` line prints (criterion 22).
- **D15 The dropped fetch.** The script drops the `--depth=1` fetch of the release commit by SHA (spec section 3 step 2, superseded by section 8.2 step 1). The Phase 1 rows stay true: each Phase 1 fixture pushes its commit to `refs/heads/master` (`scripts/ci/__tests__/sales-traffic-source-binding.test.mjs:367`), so the one master fetch holds each fixture commit.
- **D16 Tool stubs.** A stub is a `#!/bin/bash` file in a scratch `PATH` folder. It logs its arguments to a file and then runs the real tool by absolute path. A forced-exit stub skips the real call and exits with the named code. Phase 1 rows S-23 and S-24 use the same form.

### P2.2 Harness and allowed paths

- New file: `scripts/ci/__tests__/traffic-source-binding-phase2.test.mjs`. It holds a JSDoc header and JSDoc on each function (AGENTS.md).
- Changed files: the five traffic files, `scripts/ci/verify-traffic-source.sh`, and `docs/runbooks/traffic-moves.md` (task 2.2 and task 2.3).
- **Allowed paths of Phase 2** (the scope check of P2.7 item 4): the five files `apps/accounts/cloudbuild-traffic.yaml`, `apps/accounting/cloudbuild-traffic.yaml`, `apps/codecamp-advantage/cloudbuild-traffic.yaml`, `apps/marketing/cloudbuild-traffic.yaml`, `apps/primary-advantage/cloudbuild-traffic.yaml`; `scripts/ci/verify-traffic-source.sh`; `scripts/ci/__tests__/traffic-source-binding-phase2.test.mjs`; `scripts/ci/__tests__/sales-traffic-source-binding-adversarial.test.mjs` (commit `b131f9a16`, the recorded amendment of P1.7 item 4); `scripts/ci/__tests__/cloudbuild-files.test.mjs`; `docs/runbooks/traffic-moves.md`; `.gcloudignore` (no change expected, because criterion 21 is closed; a change needs a spec amendment); and paths under `measure/tracks/sales_traffic_source_binding_20261108/` and `measure/runs/sales_traffic_source_binding_20261108/`.
- **Not allowed in Phase 2:** a new file under `scripts/ci/__tests__/helpers/`, a new dependency, an edit to `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `apps/sales-advantage/cloudbuild.yaml`, `release-source-manifest.mjs`, `create-sales-release-archive.sh`, and any other app folder.
- **Precondition of every script case:** `existsSync(<ROOT>/scripts/ci/verify-traffic-source.sh)` must be true (rule of P1.2).
- No test reads a path under `measure/` (rule C27 of `per_app_cicd_20261107`).

### P2.3 Red command and expected failure

Targeted Red command (repository root):

```bash
CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci/__tests__/traffic-source-binding-phase2.test.mjs
```

Light run (repository root, criterion 7):

```bash
CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci
```

Expected Red result (task 2.1):

- Every artifact row (T-01, T-04, T-05, T-06, T-07) fails, because the five traffic files have no step `bind-release-source` and no `_RELEASE_COMMIT_SHA` substitution. `scripts/ci/__tests__/cloudbuild-files.test.mjs` records that no Phase 2 step-order assertion breaks.
- The script exists at task 1.2, so the script-exists precondition of P2.2 holds. The script rows fail on the ancestor check, not on a missing script.
- Row T-22 fails, because no section 8.6 line prints: the Phase 1 script fetches the release commit by SHA with `--depth=1` and holds no `cat-file` or `merge-base` check.
- Rows T-20, T-21, T-24, and T-25 fail on the script text and the fetch log, because the script holds no master fetch and no ancestor check.
- Row T-23 does not fail first, and that is stated here (A4). The Phase 1 script fetches the older commit by SHA at depth 1, so a matching upload gives exit 0. The row is a guard row: it fails when a mutant or a later change puts a depth limit on the master fetch (Y43).
- Light run: `EXIT=1`, `test_files_failed` includes the new file, and the Phase 1 files still pass. Any other failure is a Red defect, and the Red fixes it before the commit.
- Record `EXIT=1`, the file count, `tests_failed=<n>`, `tests_passed=<n>`, and the name and fail reason of each new row. Label: `scratch_left=0` and `disk_avail_mb=<n>`.

### P2.4 Cases

Row ids use the `T-` prefix, because the rows live in a second file. Criterion numbers are of spec sections 5 and 8.4. Each row gives the fail-first reason at Red.

| Row | Crit. | Given and action | Assertion | Fail-first reason |
|---|---|---|---|---|
| T-01 | 8 | The parsed `steps` of each of the five traffic files. | In each file, `ids[0]` is `bind-release-source`. Its index is below the first source step: `migrate-company-identity` for accounts, `refuse-legacy-db` for primary-advantage, and `migrate-db` for the other three. | The step is absent in each file. |
| T-02 | 9 | The `args` of each bind step. A fixture whose upload differs from the fixture commit. | The `args` deep-equals the four items of spec section 3a-1: the script path, `$_RELEASE_COMMIT_SHA`, the GitHub URL, and `.`. The run exits non-zero and prints a `differs:` line. | The step is absent. |
| T-03 | 10 | The `args` of each bind step, with the SHA and the URL replaced by the fixture values. A matching upload. | The run exits 0 for each of the five step commands. No `missing:`, `extra:`, or `differs:` line. | The step is absent. |
| T-04 | 11 | Each parsed file, and the run of each step command with the SHA forms of S-18. | Each file holds `_RELEASE_COMMIT_SHA: "REQUIRED_RELEASE_COMMIT_SHA"` under `substitutions:`. Each malformed SHA gives a non-zero exit before any fetch (the fetch log holds no `fetch` line). | The substitution and the step are absent. |
| T-05 | 12, FR-9 | `sectionText(runbook, name)` for the five app sections. | Each section holds `bind-release-source` and `_RELEASE_COMMIT_SHA`. | The sections lack the id. |
| T-06 | 13 | The bind step text of each of the five files, and the parsed step. | No match of the words of criterion 6, case-insensitive. `name` is `gcr.io/cloud-builders/git` with no `@`. `entrypoint` is `bash`. No `apt-get` and no `gcloud` in the step. | The step is absent. |
| T-07 | 14 | The parsed Primary traffic file. | The step ids are exactly `bind-release-source`, `refuse-legacy-db`, `migrate-db`, `doctor-check`, and `update-traffic`. The bind step holds no `gcloud` command. | The step is absent. |
| T-08 | 18 | The `args` of each bind step, and a scratch upload that lacks one in-scope file of the fixture commit. | Each of the five runs exits non-zero and prints `missing: <path>`. The `args` name the script and `$_RELEASE_COMMIT_SHA` before the run. | The step is absent. |
| T-20 | FR-15, §8.2 | The script text. | The text holds `git cat-file -e` with `<sha>^{commit}` before `git merge-base --is-ancestor` and before the two list commands. The text holds `merge-base --is-ancestor` with `FETCH_HEAD` as the second argument. | The script holds no ancestor check. This row is an artifact test. |
| T-21 | 22, §8.2 | The valid run of T-03, with the logging `git` wrapper first in `PATH` (D2). | The fetch log holds one `fetch` line that names `origin master`. The log holds no fetch by SHA and no `--depth` option. The log holds a `merge-base --is-ancestor` line whose last argument is `FETCH_HEAD`. | The script holds no master fetch. |
| T-22 | 22, §8.6, §8.5 | The fork-only commit of D12 as the release commit. The upload holds the files of that commit. | Exit 1. One stderr line equals the D13 section 8.6 line with the fork-only SHA filled in. No `missing:`, `extra:`, or `differs:` line. Control: the same run with the tip of `master` and a matching upload exits 0. | The script holds no `cat-file` check. Without it, `git merge-base` on the absent object exits 128 and prints the section 8.7 line, so the D13 assertion fails. |
| T-23 | 23, §8.5 | The older commit of `master` (not the tip) as the release commit. The upload equals the tree of that commit. | Exit 0. No `missing:`, `extra:`, or `differs:` line. This row proves that the master fetch is not depth-limited. | No fail-first reason (guard row): a `--depth=1` fetch of the older commit also gives exit 0 (P2.3). The row fails when a mutant adds a depth limit. |
| T-24 | §8.7 | The tip of `master` and a matching upload, with a `git` wrapper that logs the arguments and forces `merge-base --is-ancestor` to exit 128 (D16). | Exit non-zero. One stderr line equals the D13 section 8.7 line with `128` filled in. No `missing:` line. Control: the same run with the real `git` exits 0. | The script holds no tool-failure branch. |
| T-25 | FR-15, §8.2 step 3 | The tip of `master` and a matching upload, with a `git` wrapper that forces `merge-base --is-ancestor` to exit 1 (D16). | Exit 1. One stderr line equals the D13 section 8.6 line. This row forces the branch that the master-only fetch cannot reach. | The script maps merge-base exit 1 to a pass, or it holds no merge-base call. |

No row depends on the counts of spec.md. No row reads a file under `measure/`. The rows T-02, T-03, and T-08 write scratch paths only.

### P2.5 Adversarial mutant set

The adversarial role applies each mutant to a scratch copy of the script or of the YAML, runs the targeted command of P2.3, and restores the file. It commits no mutant. Label: `mutants_rejected=<n>/10`, `mutants_total=10`.

The new total is 10: the four Phase 2 rows of the outline (now Y34 to Y37) plus the six rows of the ancestor check (Y38 to Y43).

| Mutant | Change | Row that must reject it |
|---|---|---|
| Y34 | The bind step moves after the first source step: after `refuse-legacy-db` in the Primary file, or after `migrate-company-identity` in the accounts file. | T-01 |
| Y35 | The substitution `_RELEASE_COMMIT_SHA` is absent from one file. | T-04 |
| Y36 | The GitHub URL holds a typing error in one file. | T-02 |
| Y37 | One bind step uses a `-c` string instead of the four `args`. | T-03, T-06 |
| Y38 | The `git cat-file -e <sha>^{commit}` check is removed. | T-22, T-20 |
| Y39 | The `git merge-base --is-ancestor` check is removed. | T-25, T-20 |
| Y40 | `FETCH_HEAD` is replaced by the release commit, or by `HEAD`. | T-21, T-20 |
| Y41 | A merge-base exit 1 is mapped to a pass. | T-25 |
| Y42 | The section 8.6 line changes its text. | T-22, T-25 |
| Y43 | The fetch of `master` is replaced by a fetch of the release commit. | T-21, T-23 |

Y40 and Y41 need the stub rows of T-24 and T-25, because the master-only fetch cannot reach a commit that is present and not on `master` (spec section 8.2 step 3). T-21 gives the log form for Y40 and for Y43. Y42 is killed by the exact-line assertions of T-22 and T-25. So none of the six new rows is an equivalent mutant.

Adversarial scenarios (no mutant): a URL argument with a space; an upload root that is a symbolic link; an upload that holds an empty folder; a bare repository that refuses `allowAnySHA1InWant`. Label: `scenarios_checked=<n>/4`. No scenario may give a false pass.

**PM scratch rules of 2026-11-09.** The adversarial brief carries these rules:

1. Run any whole-tree copy of the repository through `heavy-run.sh` (section 1.1). Do not start a second heavy job.
2. Copy only the paths that the case needs. A whole-tree copy is the last choice. The PM form allows `git worktree add --no-checkout` with a sparse checkout, but A16 of `measure/anti-patterns.md` forbids `git worktree add` in this repository. So the case copies named paths and does not add a worktree. The orchestrator records the conflict; a change of A16 is an owner decision, not a role decision.
3. Delete the scratch base at the end of the case in the same command, with `trap EXIT`. Keep a scratch tree under 200 MB. After the round, `scratch_left=0` and the main checkout holds no mutant file.

### P2.6 Green gates

- **Task 2.2 gate (the script and the five files).** Disk guard first. Run the targeted command of P2.3. Required: `EXIT=0`, `tests_failed=0`, and `tests_skipped=0`. Rows T-20 to T-25 pass, and the Phase 1 file still passes. Then run `bash -n scripts/ci/verify-traffic-source.sh` (exit 0).
- **Task 2.2 Phase 1 rows.** Run the targeted command of P1.3 again. Required: `EXIT=0` and `tests_failed=0`. Reason: task 2.2 changes the fetch of the script, and the Phase 1 rows must survive the change (D15).
- **Task 2.3 gate (the runbook).** Run the light command. Required: `EXIT=0`, `tests_failed=0`, `tests_skipped=0`, and the F-16 runbook case passes.
- No Green edits a test to pass, except a defect fix that the Red names.

### P2.7 Closeout gate (task 2.4)

1. Disk guard: `disk_avail_mb>=3000`.
2. Light run at the phase head: `EXIT=0`, the test file count, the test count, `tests_failed=0`, `tests_skipped=0`.
3. Targeted run of the Phase 2 file: `EXIT=0`. The record names T-01, T-06, T-07, T-20, T-21, T-22, T-23, T-24, and T-25 as passed.
4. Scope check (section 1.4 commands): the Phase 2 track commits change only the allowed paths of P2.2. Label: `p2_out_of_scope_paths=0`.
5. No-change check: `git diff --stat <phase_base_sha> HEAD -- apps/sales-advantage/cloudbuild.yaml apps/sales-advantage/scripts package.json pnpm-lock.yaml scripts/ci/__tests__/helpers .gcloudignore` prints 0 lines.
6. Criterion 21 re-run: the cases S-31 and S-32 of the Phase 1 file pass, and `gcloud meta list-files-for-upload .` gives `measure_files_in_upload=0`, `sales_files_in_upload>=1`, and the script path in the list. The five files upload the same root, so this check covers them.
7. Hash detector and the measure-read detector of P1.7 items 6 and 7, run again over the script and the Phase 2 test file (A14 controls).
8. Clean state: `scratch_left=0`. `git worktree list | wc -l` prints the same value as at the phase base (A16).
9. Header check: each commit subject of the track is 100 characters or less.
10. Adversarial set: `mutants_rejected=10/10` and `scenarios_checked=4/4`.
11. Reviews A, B, and C each give a pass at the phase head. The browser review is recorded as not applicable.
12. Phase acceptance gives a pass against FR-7 to FR-9, FR-11 to FR-15, and criteria 8 to 14, 18, 22, and 23.
13. The plan note of task 2.4 states that no role ran `gcloud` other than the list command, a Cloud Build submit, a workflow run, a push, or a deploy. It states that the live proofs are open.
14. **Live proof, `deferred:daniel`.** The first traffic Cloud Build run of each app shows the two version lines and a pass of `bind-release-source` before the first source step. The runs stay in task 2.3h (accounts, accounting, codecamp-advantage, marketing, sales-advantage) and task 2.3c (primary-advantage) of `per_app_cicd_20261107`.

### P2.8 Document tests and live tests

- T-01, T-04, T-05, T-06, T-07, and T-20 are artifact tests. They read the YAML, the runbook, and the script text. They prove no Cloud Build run.
- T-02, T-03, T-08, T-21, T-22, T-23, T-24, and T-25 are function-level live tests. They run the real script with `/bin/bash` on local Git data and controlled `PATH` stubs. They prove the compare, the stop rules, and the ancestor check. They do not prove the GitHub fetch, the builder image, or the gcloud upload form.
- The live proof is item 14 of P2.7. Text that calls the ancestor check "live" or "proven in Cloud Build" before that run is an A5 or A6 defect.

### P2.9 Review gates

| Review | Applies | Reason and checks |
|---|---|---|
| Review A (correctness) | **yes, required** | The ancestor order of section 8.2 (one master fetch, `cat-file`, `merge-base`, then the two lists), the exit handling, the exact lines of sections 8.6 and 8.7, the step order of criterion 8, the Primary ids of criterion 14, the runbook text of FR-9, and the scope of P2.7 item 4. Review A checks that the drop of the depth-1 SHA fetch keeps every Phase 1 case true. |
| Review B (security) | **yes, required** | The check changes a fail-closed gate that runs before a production migration on six files. Review B confirms or refutes each point of FR-15: the script injects no ref from the release commit or from the argument, so a value such as `master:refs/pull/7/head` cannot widen the fetch; the fetch ref is the fixed name `master` and the URL is the fixed argument of section 3a-1; the check fails closed on each exit of `git cat-file`, of `git merge-base`, and of the fetch itself; the check runs before the two lists, so a stop prints no upload information; and the step still holds no secret and no credential URL. Review B records any remaining limit, and a change of a limit is a decision for the PM (D10). |
| Review C (UX/API) | **yes, required** | There is no screen. The operator API changes: the runbook sections of six files (FR-9, FR-12), the stop lines of sections 8.6 and 8.7, and the closing line of a mismatch (task 2.2). The text must tell the operator what stopped and what to do. |
| Adversarial testing | **yes, required** | The 10 mutants and 4 scenarios of P2.5, under the PM scratch rules. The risk is `high`. |
| Browser review (UX) | **no** | No page, component, or route changes. The only human surface is a build log and a runbook. |
| Phase acceptance | **yes, required** | P2.7 item 12. |

### P2.10 Anti-pattern coverage

| ID | Defense in Phase 2 | Falsification condition |
|---|---|---|
| A1 | The live proofs stay `[b] ... deferred:daniel` in tasks 2.3h and 2.3c of `per_app_cicd_20261107`. No free text stands for a marker. | A plan note counts a live proof as done, or the marker is not `[b]`. |
| A3 | Each count is a labeled integer: `tests_failed`, `tests_passed`, `tests_skipped`, `test_files`, `mutants_rejected`, `mutants_total`, `scenarios_checked`, `scratch_left`, `disk_avail_mb`, `p2_out_of_scope_paths`, `measure_files_in_upload`, `sales_files_in_upload`. A check parses the integer after its label. | A bare number or a date passes a count check. |
| A4 | The script-exists precondition in each script row (P2.2). The T-22 and T-25 controls (a matching tip run exits 0). The T-24 control (the real `git` exits 0). The T-21 fetch log proves the fetch that the row claims. Row T-23 is named a guard row, not a fail-first row (P2.3), so a pass at Red is not counted as proof. | A row passes while the script is absent, a stub control runs against a dead wrapper, or a guard row is reported as a Red failure. |
| A5 | Plan notes quote `EXIT=`, the labels, and the row names. No note claims a Cloud Build result. | A note says that the step ran in Cloud Build or that a run passed. |
| A6 | `measure/tracks.md` and the runbook do not call the ancestor check resolved before item 14 of P2.7. | The registry says "resolved" while the live proofs are open. |
| A7 | The forbidden-word check of T-06 reads the bind step text of each file, not the whole file. The `cat-file` and `merge-base` checks of T-20 match the command names and the arguments, not the word "ancestor". | The check flags a step that uses the word in a comment, or a text check passes while the run fails. |
| A8 | The plan uses `[ ]`, `[~]`, `[x]`, and `[b]`. No task holds `[ ]` with "blocked" prose. | A blocked task uses `[ ]`. |
| A9 | No test reads `measure/` as data (P2.7 item 7). | The detector finds a hit. |
| A10 | Does not apply: the phase generates no facts file. | A generated facts file appears in the scope. |
| A11 | Reviews A, B, and C run and report before the closeout. No task stays `[b] deferred:review-execution`. | The phase closes while a review has no result. |
| A12, A13 | Do not apply: no catalog guard and no archive move change. | A guard reference dangles, or a track folder moves. |
| A14 | Each `rg` detector of P2.7 has a scratch control that must hit. Exit 2 is a failure. | A bad option gives no hit and the gate passes. |
| A15 | Does not apply: the phase adds no receipt and no hash. | A receipt hash or a checksum field appears. |
| A16 | Scratch folders only under `/tmp`. The worktree count stays the same. The PM worktree form of P2.5 is blocked by A16, so the cases copy named paths. | The count changes, or a case adds a worktree. |

A2 does not apply: the phase has no publish gate with named subjects.
