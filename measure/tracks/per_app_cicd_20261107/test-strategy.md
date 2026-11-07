# Test strategy: Per-app CI/CD

> **Track:** `per_app_cicd_20261107` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Scope:** Phase 1 `## Phase 1: The affected-app logic` in full (section P1). Outlines for `## Phase 2: Per-app CD workflows`, `## Phase 3: CI for the affected apps`, and `## Phase 4: Dry runs, www proof, and the first-push plan` (sections P2, P3, P4).
> **Written:** 2026-11-07 at role base `04b5cb1619afb7742a06f6cf1c884805cee3e320` (spec review passed in round 2). Model: claude-code/claude-sonnet-5-5.
> **Facts:** each "measured" fact in section 2 was read at the role base on 2026-11-07. One heavy job ran (M1). Red and Green must measure again.
> **No push.** A push to `master` deploys www today. No role pushes before Phase 4 and Daniel's word.

## 1. Rules for every phase

### 1.1 Heavy jobs

- Every Vitest, `tsc`, build, and `turbo` run goes through one wrapper:

  ```bash
  HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>'
  ```

- Every Vitest command uses `CI=true` and `--maxWorkers=1`, runs in the foreground, and ends with `; echo "EXIT=$?"` inside the quoted command. The wrapper returned exit 0 while the inner command returned 1 (M1). Read the `EXIT=` line, not the wrapper exit.
- One heavy job runs at a time (7 GB machine).
- Light work needs no lock: reads, `rg -n`, `git show|log|diff|rev-parse`, `node --check`, and `node scripts/ci/affected-apps.mjs` on a small range.
- The root suite `pnpm test` and `pnpm turbo run test` are not a gate of this track (the spec records CI red since 2026-09-24).
- No live deploy, no `gcloud` write, no `gh workflow run`, and no GitHub Actions run in any role before Phase 4. Workflow checks are static: parse the YAML, run the select step of a workflow in a scratch directory with stubs. `act` is not installed (M8).

### 1.2 Hash rule

- This track adds no hash, no checksum field, no manifest, and no provenance file (AGENTS.md hashing policy). Git commit identity is the provenance.
- The script and the tests contain no hash call. Detector (exit 1 means no hit): `rg -n "createHash|node:crypto|sha256sum|shasum|checksum" scripts/ci/affected-apps.mjs scripts/ci/__tests__`. The detector is case-sensitive, so the legacy lockfile key `pnpmfileChecksum` in a fixture string is not a hit. The tests treat that key as plain text and never compute or verify a hash.

### 1.3 Evidence classes

- **Function-level live test:** the test runs the real script (`node scripts/ci/affected-apps.mjs`) on a real scratch git repository. It proves the behavior of the script. It is the main class of P1.
- **Artifact test:** the test reads a file (`apps.json`, a workflow, a `cloudbuild*.yaml`, the runbook) and checks text or structure. It never proves that Cloud Build or GitHub Actions runs the file. P2 and P3 are mostly this class.
- **Live proof:** a real push or a real Cloud Build run. It exists only in Phase 4 on Daniel's word (AC-5.4) and in every traffic move (owner-passed). No test fakes it.
- A plan `[x]` note names the commit, the evidence class, the exit code, and the labeled counts (A5).

### 1.4 Capture of `phase_base_sha`

- This file embeds no SHA. A SHA from before this strategy commit is not valid.
- The orchestrator captures `phase_base_sha` with `git rev-parse HEAD` after these events, in this order: the commit of this strategy, the answers to the questions of section 4 (or the acceptance of their defaults), and the start of Red. The capture happens before the Red role starts. The orchestrator records the full SHA in the Red evidence.
- Master is shared with the storytime tracks. `phase_base_sha..HEAD` holds commits of other tracks. Scope checks use the commits of this track only:
  `git log <phase_base_sha>..HEAD --format=%H --grep='track_id: per_app_cicd_20261107'`, then `git show --name-only --format= <sha>` for each. Label: `p1_out_of_scope_paths=<n>`; closeout needs 0 (the allowed paths are in P1.5 item 6).
- Phases 2, 3, and 4 each get their own capture, by the same command, after the checkpoint of the phase before.
- All work runs in the shared master tree. Scratch folders are plain directories from `mktemp -d` under `/tmp`. No role runs `git worktree add` (A16).

## 2. Measured facts at the role base

| # | Fact | How measured |
|---|---|---|
| M1 | `scripts/ci/` exists and holds 3 shell files (`check-graph-db.sh`, `fresh-db-e2e.sh`, `sql-adr-guard.sh`) and no test. The root `vitest.config.ts` (default include `**/*.{test,spec}.?(c|m)[jt]s?(x)`, `testTimeout` 120 s) is the only Vitest config that applies from the root. There is no `vitest.workspace` file. The plan command at the base prints `No test files found, exiting with code 1`, with `filter: scripts/ci` (Vitest 4.1.8), and the inner exit is 1 while the wrapper exit is 0. No other tracked file path contains `scripts/ci`, so the filter picks no foreign test. That a `.mjs` test under `scripts/ci/__tests__` runs was NOT measured here (it needs a test file). The first Red run proves it. | One `heavy-run.sh` job, 2026-11-07, output in `/tmp/cicd-base-vitest.txt`; `git ls-files`. |
| M2 | Test command, exact: `CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci; echo "EXIT=$?"` inside the wrapper, cwd the repository root. `pnpm exec` starts at once because `pnpm-workspace.yaml` sets `verifyDepsBeforeRun: false`. | Same job. |
| M3 | YAML parsers that already exist: `yaml` 2.9.0 (`node_modules/yaml`) and `js-yaml` 4.3.2 (`node_modules/js-yaml`). Both resolve from the root (`require.resolve`). The root `package.json` declares neither. They sit at the root only because `pnpm-workspace.yaml` sets `nodeLinker: hoisted`. Rule: P2 and P3 tests may `import { parse } from "yaml"`. The script itself uses no YAML package (spec FR-1). No role adds a dependency (that edits `package.json` and the lockfile, which is a global change under D4). | `ls`, `node -e require.resolve`, `grep` of `package.json`. |
| M4 | The workspace has 48 `package.json` folders and **four** globs in `pnpm-workspace.yaml`: `apps/*`, `packages/*`, `packages/integrations/*`, `services/*`. The spec names two. `packages/integrations/github` (`@reading-advantage/integrations-github`) is a dependency of `@reading-advantage/domain`. It therefore reaches 6 table rows: `codecamp-advantage`, `marketing`, `primary-advantage`, `reading-advantage`, `sales-advantage`, `workbooks`. A script that reads only `apps/*` and `packages/*` returns `[]` for a change in that package. `services/session-service` and `services/worker` have no app dependent. The workspace has no dependency cycle. | A Node read of every manifest (dependencies, devDependencies, peerDependencies, optionalDependencies), transitive closure. |
| M5 | Transitive closures at the base, table rows only: `packages/utils` reaches the 7 rows of AC-1.3 (it also reaches `science-advantage` and `advantage-games`, which are not table rows). `packages/read-along` reaches `storytime` only. `packages/config` reaches all 10 rows. `packages/ui` reaches 6 rows (not `storytime`, `accounts`, `workbooks`, `marketing`). `packages/db` reaches 8 rows. `packages/backend` reaches `accounting`, `accounts`, `primary-advantage`. | Same read. |
| M6 | Git 2.53.0. The global git config holds no `diff.renames` and no `core.quotepath`. Git defaults therefore apply: rename detection is on for `git diff`, and a path with a non-ASCII character prints in quotes with octal escapes under `--name-only`. A tracked path of this kind exists: `apps/advantage-games/public/Vibe-Coding Arena — Official Rules.pdf`. A script that prefix-matches `git diff --name-only` output misses such a path, and it misses the old path of a moved file. | `git config`, `git ls-files`. |
| M7 | Root files that build inputs read and that D4 does not name: `.pnpmfile.cjs` (every Dockerfile copies it; the lockfile holds `pnpmfileChecksum`) and `.dockerignore`. The root has no `tsconfig*.json` and no ESLint config. | `ls -a`. |
| M8 | `act`, `actionlint`: not installed. `docker` and `gh`: installed. | `command -v`. |
| M9 | `ci.yml` uses Node 22 (`actions/setup-node@v4`). Local Node is 24.19.0. The script must not use an API that Node 22 lacks. `cd-www-reading-advantage.yml` sets up no Node (the runner image holds one). | Read the workflows, `node --version`. |
| M10 | The `www-reading-advantage` Dockerfile copies the whole `apps` and `packages` folders. The `storytime` Dockerfile copies `apps/storytime`, `packages/config`, and `packages/read-along` only. The www image context therefore holds code the www build does not use. D4 and the PM order still decide by the dependency closure. | `grep COPY`. |
| M11 | The count of commits `origin/master..HEAD` is **198** at the base. The spec says 168. The difference is new commits on master since the spec read. Phase 4 measures again. | `git rev-list --count`. |
| M12 | The range `origin/master..HEAD` changes `pnpm-workspace.yaml` by one key, `verifyDepsBeforeRun: false`. That key is not a `catalog` or `overrides` entry, so D4 makes it **global**. The affected set of the 198-commit push is therefore all 10 table rows, whatever else the range holds (section 4, Q7). The range also changes `pnpm-lock.yaml` (88 insertions, 101 deletions), 3 files of `apps/www-reading-advantage`, 87 of `apps/storytime`, 34 of `apps/primary-advantage`, 1 of `apps/marketing`, 4 of `packages/read-along`, 2 of `packages/backend`, and 1 of `packages/db`. | `git diff origin/master HEAD`. |
| M13 | Real past single-commit ranges for task 1.4 (first-parent, `X^..X`), with the files read: `ca3155932` changes 3 www files only; `811f05f36` changes `apps/storytime` only; `2515efe95` changes `packages/read-along` only; `04b5cb161` changes `measure/` only; `c0e2cfbb1` changes `apps/activity-vinext-fixture`, `apps/marketing/package.json`, and `pnpm-lock.yaml` (vinext 0.2.0 to 1.2.0). Only `marketing` and `activity-vinext-fixture` list `vinext`. | `git show --stat`, `grep '"vinext"'`. |
| M14 | Not measured: `tsc` on the new `.mjs` files (no `tsconfig` covers `scripts/`, and the root has no ESLint config), and `turbo ls --filter=<id>...` for the 10 ids. The Phase 1 gate uses `node --check` instead (Q8). | Cost and absence of config. |
| M15 | `git worktree list \| wc -l` prints 8 and the branch is `master`. | Light read. |

## 3. Phase summary

| Phase | Risk | Review A (code) | Review B (secrets, permissions) | Review C (UX/API) | Adversarial | Browser review |
|---|---|---|---|---|---|---|
| P1 Affected-app logic | **medium** | yes | no (no secret, no role, no workflow) | yes, scoped to the CLI contract | **yes (one round, mutation set)** | no (no UI) |
| P2 Per-app CD workflows | **critical** | yes | **yes (required)** | yes (tag, runbook, traffic-file contract) | **yes** | no (no UI) |
| P3 CI for affected apps | medium | yes | yes (CI service containers and env only) | no | yes (light, one mutant round) | no |
| P4 Dry runs, www proof, first-push plan | **high** | yes | yes (final) | yes (the report and the push plan) | **yes** | no (a post-push www page check belongs to Daniel and the PM) |

The reasons are in P1.7 and in the outline sections.

## P1: The affected-app logic

**Risk: medium.** The script reads git and files and prints JSON. It deploys nothing and holds no secret. Its output decides, in P2 and P3, which production service a push builds. A wrong `[]` skips a needed deploy. A wrong wide answer deploys www straight to traffic, which is the defect this track fixes. Task risk: 1.1 low, 1.2 low, 1.3 medium, 1.4 low, 1.5 low.

`ROOT=/home/daniebo/Desktop/reading-advantage-monorepo`. `HEAVY` is the wrapper of section 1.1.

### P1.1 Contract assumptions that the spec leaves open

Red tests pin each assumption below. A test that disagrees with the PM is a question (section 4), not a silent change.

- **C1 Read from the head commit.** The script reads `scripts/ci/apps.json`, the workspace `package.json` files, the lockfile, and the root files from the repository at the current directory, **from the head commit** (`git show <head>:<path>`, `git ls-tree`), and the base versions from the base commit. It does not read the working tree. Reason: the answer at a named HEAD is then reproducible on a dirty tree (the working tree of this repo is dirty now). Case B-15. (Q2)
- **C2 Strict ids.** `--base` and `--head` must each match `^[0-9a-f]{40}$` (base may be 40 zeros). A ref name such as `HEAD` or `master` exits 2. This also blocks option injection into git (`--output=…`). Cases A6-07 to A6-09. (Q1)
- **C3 Four workspace globs.** The script finds workspace packages in `apps/*`, `packages/*`, `packages/integrations/*`, and `services/*` (M4). A premise test compares this list with the `packages:` list of the real `pnpm-workspace.yaml`. Case B-21.
- **C4 Edges.** A workspace edge is any key of `dependencies`, `devDependencies`, `peerDependencies`, or `optionalDependencies` whose name is a workspace package. A cycle must end. Cases B-13 and B-14.
- **C5 Rows only.** The output lists table ids only. A change that reaches a workspace app that is not a table row (`science-advantage`, `vocabulary-games`, `activity-vinext-fixture`) adds nothing. The answer `[]` with exit 0 is legal when the range is readable. Case B-03.
- **C6 Net diff, no renames.** The changed files come from `git diff --name-only --no-renames -z <base> <head>` or an equal call, so a moved file counts at both paths and a non-ASCII path keeps its true text. Cases B-07 and B-08. (A script that prints a prefix-matched name from default output fails both.)
- **C7 No app effect.** `docs/`, `measure/`, `.github/`, `scripts/ci/`, and root files that are not build inputs (for example `README.md`) affect no app. The match is on the top-level folder only, so `apps/storytime/docs/x.md` is a change of `storytime` (A7). (Q5)
- **C8 Global inputs.** A change to any key of root `package.json`, `pnpm-workspace.yaml`, or `turbo.json` other than `overrides` and `catalog` entries (D4) affects all 10 rows. So does a change to `.pnpmfile.cjs`, `.dockerignore`, or a top-level lockfile key other than `importers`, `packages`, `snapshots`, `catalogs`, and `overrides` (for example `settings`, `lockfileVersion`, `pnpmfileChecksum`). (Q4)
- **C9 Entries by use.** A `catalog` entry change affects the rows whose manifest lists that package with the value `catalog:`. An `overrides` entry change affects the rows whose resolved set holds that package name (D4). A lockfile `packages:` or `snapshots:` entry change affects the rows whose importer or whose workspace dependency importers reach that entry through the resolved set. An entry that no row uses affects nothing.
- **C10 Same-sha range.** A non-zero base that equals the head is a readable empty range: output `[]`, exit 0. Case B-16. (Q3)

### P1.2 Harness (one helper, one test file)

Files, created by the Red role: `scripts/ci/__tests__/affected-apps.test.mjs` and `scripts/ci/__tests__/helpers/scratch.mjs`. The plan names only the test file; the helper is a support file in the same Red commit.

- `SCRIPT = process.env.AFFECTED_APPS_SCRIPT ?? <ROOT>/scripts/ci/affected-apps.mjs`. The variable exists for the Red stub run (P1.3). Green does not read it.
- `runScript(cwd, base, head)` first asserts `existsSync(SCRIPT)` with the message `Missing scripts/ci/affected-apps.mjs`, then calls `spawnSync(process.execPath, [SCRIPT, "--base", base, "--head", head], { cwd, env, encoding: "utf8" })`. It returns `{ status, stdout, stderr }`. A `Cannot find module` error from `node` is a defect of the Red test.
- **Hermetic git.** Every `git` call of the helper and the spawn env use `HOME=<tmp>`, `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1`, and no `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`, or `GIT_PREFIX` (a hook run sets them). The repo config sets `user.name`, `user.email`, and `commit.gpgsign=false`. Reason: git defaults equal the CI runner and expose the rename and quoting defects (M6). Case B-22 asserts the scrub.
- `makeRepo(files)` runs `git init -q -b master` in `mkdtemp(os.tmpdir() + "/affected-")`, writes the files, commits, and returns `{ dir, sha }`. `commit(dir, changes)` applies writes, deletes, and moves, commits, and returns the sha. The origin is faked with `git update-ref refs/remotes/origin/master <sha>`; no network and no remote. `afterEach` removes the directory.
- `realWorkspaceFiles()` reads the working tree of `ROOT`: root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.pnpmfile.cjs`, `.dockerignore`, `pnpm-lock.yaml`, and the `package.json` of all four globs. `fixtureTable()` writes `scripts/ci/apps.json` of the scratch repo from the 10 rows of spec section 2a. **The Red tests never copy the real table**, because it does not exist before Green. Case B-21 tests the real table.
- `expectIds(result, expected, label)`: status 0; stdout equals `JSON.stringify(sorted) + "\n"` (one line, one final newline, nothing else on stdout); the parsed value is an array of strings equal to the sorted `expected`. When `expected` is not `[]`, it first asserts `expected.length > 0` and then checks each id (AC-1.7). When `expected` is `[]`, it asserts the labeled `changed_files=<n>` of the range is at least 1, so a `[]` never comes from an empty range (A4).
- `expectRefusal(result, label)`: status exactly 2 (not 1); stdout is exactly `""`; stderr, trimmed, is one non-empty line.
- `requireNonEmpty(list, label)` throws on an empty list. Case A7-01 tests it.
- Each case ends with its own labeled evidence in the assertion message, for example `rows=7`, `changed_files=1`, `bad_bases=9`.

### P1.3 Red: command, expected failure, and stub proof

**Red command (task 1.2):**

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci; echo "EXIT=$?"'
```

**Expected at the base (script and table absent):** `EXIT=1`; `Test Files 1 failed (1)`; every case fails with `Missing scripts/ci/affected-apps.mjs` or (case B-21) `Missing scripts/ci/apps.json`. The cases that pass at the base are exactly these named characterization cases: A7-01 (helper guard), B-22 (env scrub), and the three premise guards `read_along_dependents=1`, `utils_rows=7`, `integrations_rows=6` (they read manifests only). The Red evidence lists each passing case with its reason (A4). A failure by `Cannot find module`, `ENOENT` of a fixture, or a thrown error that is not an assertion is a defect of the Red test. If the output says `No test files found`, the include rule or the filter is wrong (M1): stop and report.

**Stub proof (Red role, not committed).** The Red role writes seven constant stubs in a `mktemp -d` folder and runs the Red file once for each with `AFFECTED_APPS_SCRIPT=<stub>` (seven heavy jobs, one at a time; or one job that loops):

| Stub | Behavior | Must make fail |
|---|---|---|
| S1 | prints `[]`, exit 0, for every input | every case that expects an id or a refusal |
| S2 | prints all 10 ids, exit 0 | every case that expects `[]`, a subset, or a refusal |
| S3 | prints `["www-reading-advantage"]`, exit 0 | every case except A1-01 |
| S4 | prints `[]` and exits 0 even for a bad base | every refusal case |
| S5 | prints the right ids with `JSON.stringify(ids, null, 2)` | every success case (format) |
| S6 | throws an uncaught error on bad input (exit 1, stack on stderr) | every refusal case |
| S7 | prints `[]` on stdout, then exits 2 | every refusal case (stdout must be empty) |

Evidence labels: `stubs=7`, `cases_total=<n>`, `cases_killed_by_a_stub=<n>`, `cases_unkilled=0`. Exempt from the stub rule: A7-01, B-21, B-22, and the three premise guards (named). Any other case that no stub kills is vacuous (A4) and the Red role rewrites it.

### P1.4 Cases: fake ranges and expected sets

`base` is the first commit of the scratch repo and `head` is the commit after the change, unless the row says otherwise. `W` is the workspace fixture of `realWorkspaceFiles()` plus the fixture table. `S` is a synthetic mini workspace (apps `alpha` and `beta`, packages `p1`, `p2`, `p3`, and a handwritten lockfile in the format of the real one: `lockfileVersion: '9.0'`, `settings`, `catalogs`, `overrides`, `importers`, `packages`, `snapshots`; fixture integrity strings are placeholder text such as `sha512-fixture-alpha`).

**Group A: the acceptance checks of the spec**

| Case | Repo and change | Expected |
|---|---|---|
| A1-01 (AC-1.1) | W; edit `apps/www-reading-advantage/src/app/page.tsx` | `["www-reading-advantage"]` |
| A1-02 (AC-1.2) | W; edit `apps/storytime/app/page.tsx` | `["storytime"]` |
| A3-01 (AC-1.3) | W; edit `packages/read-along/src/index.ts`. Premise guard first: `read_along_dependents=1` and it names `storytime`. | `["storytime"]` |
| A3-02 (AC-1.3) | W; edit `packages/utils/src/index.ts`. Premise guard: `utils_rows=7`. | the 7 ids `accounting`, `codecamp-advantage`, `marketing`, `primary-advantage`, `reading-advantage`, `sales-advantage`, `www-reading-advantage`; `www-reading-advantage` and `primary-advantage` are in; `storytime`, `accounts`, `workbooks` are out |
| A4-01 (AC-1.4) | S; head changes the `alpha` importer version of `chalk` and the `packages:`/`snapshots:` entry of `chalk` (only `alpha` lists `chalk`) | `["alpha"]` |
| A4-02 (AC-1.4) | S; head changes the entry of `zod` (both apps list it) | `["alpha","beta"]` |
| A4-03 (AC-1.4) | S; head changes only the `snapshots:` entry of `ansi-styles`, which `chalk` pulls in (resolved set of `alpha` only) | `["alpha"]` |
| A4-04 (AC-1.4) | W; head changes only one `version:` line in the `apps/www-reading-advantage:` importer block of the real lockfile | `["www-reading-advantage"]` |
| A4-05 (AC-1.4) | W; head changes one line in the `packages/read-along:` importer block of the real lockfile | `["storytime"]` |
| A4-06 (AC-1.4) | S; head adds a `packages:` entry that no importer reaches | `[]` (exit 0) |
| A5-01 (AC-1.5) | W; one commit changes `docs/a.md`, `measure/tracks/some-track/plan.md`, `.github/workflows/ci.yml`, `README.md`, and `scripts/ci/apps.json` (fake path strings only; no test reads a `measure/` file) | `[]`, with `changed_files=5` |
| A6-01 (AC-1.6) | W; zero base; `origin/master` set with `update-ref` to the first commit; branch commit edits `apps/storytime/app/page.tsx` | `["storytime"]` (non-empty) |
| A6-02 (AC-1.6) | W; zero base; no `origin/master` ref | refusal |
| A6-03 | zero base; `origin/master` equals the head (empty range) | refusal |
| A6-04 | zero base; `origin/master` points to an unrelated root commit (no merge base) | refusal |
| A6-05 (AC-1.6) | non-zero well-formed base that the repo does not hold (`deadbeef` repeated to 40) | refusal |
| A6-06 | shallow clone (`git clone --depth 1 file://…`); base is the parent that the clone lacks (the `fetch-depth: 1` default of Actions) | refusal |
| A6-07 | loop over at least 9 bad bases: empty string, `HEAD`, `master`, `HEAD~1`, 7 hex characters, 39 and 41 hex characters, 40 non-hex characters (`g`×40), 40 characters with a space. Assert `bad_bases>=9`. | refusal each |
| A6-08 | loop over at least 6 bad heads (same forms) | refusal each |
| A6-09 | option and shell injection: base `--output=<tmpfile>`, head `--output=<tmpfile>`, base `$(touch <tmpfile>)`. Assert the file does not exist after each run. | refusal each; `injection_files_created=0` |
| A6-10 | argument forms: no `--base`, no `--head`, an unknown flag, a repeated `--base`, a positional argument, no arguments | refusal each |
| A6-11 | base is a 40-hex id of a blob (made with `git hash-object -w`) and of a tree | refusal each |
| A7-01 (AC-1.7) | helper `requireNonEmpty([])` throws; `expectIds` throws when `expected` is `[]` and `changed_files` is 0 | the guards fire |

**Group B: cases that the strategy adds from the measured facts and the anti-patterns**

| Case | Repo and change | Expected |
|---|---|---|
| B-01 | W; edit `packages/integrations/github/src/index.ts`. Premise: `integrations_rows=6`. | `["codecamp-advantage","marketing","primary-advantage","reading-advantage","sales-advantage","workbooks"]` |
| B-02 | W; edit `services/worker/src/index.ts` | `[]` (exit 0, `changed_files=1`) |
| B-03 | W; edit `apps/science-advantage/app/page.tsx` (not a table row) | `[]` |
| B-04 | W; edit `packages/config/src/index.ts` | all 10 ids (`rows=10`) |
| B-05 (A7) | W; edit `apps/storytime/docs/note.md`; second commit edits `packages/utils/measure/x.ts` | `["storytime"]`; then the 7 ids of A3-02 |
| B-06 (A7) | W; add `apps/storytime-lab/x.ts` (folder with the prefix of an app id) | `[]` |
| B-07 | W; `git mv apps/storytime/app/old.ts docs/old.ts` (the base file holds at least 20 lines so git detects a rename) | `["storytime"]` |
| B-08 | W; add `apps/storytime/content/ไทย — one.json` (non-ASCII and a space) | `["storytime"]` |
| B-09 | W; delete `apps/www-reading-advantage/src/x.ts` (the base holds it) | `["www-reading-advantage"]` |
| B-10 | W; edit `apps/accounts/package.json` (add a script key) | `["accounts"]` |
| B-11 | W; three commits (a www file, a storytime file, a docs file); base is the first commit, head is the third | `["storytime","www-reading-advantage"]` |
| B-12 | W; edit `apps/reading-advantage/app/page.tsx` | `["reading-advantage"]` (the excluded row is still printed, spec FR-1) |
| B-13 | S; chain `alpha` to `p1` to `p2` to `p3`; edit `p3`. A second app `beta` lists `p1` only in `devDependencies`, a third lists `p2` in `peerDependencies`. | each app that reaches `p3` by any of the four fields; the app that does not reach it is absent |
| B-14 | S; `p1` and `p2` list each other (a cycle); edit `p1`. The case has a 10 s limit. | the apps that reach `p1`; exit 0 |
| B-15 | W; commit a change to `apps/storytime/…`; then leave an uncommitted edit of `apps/www-reading-advantage/package.json` and an untracked file under `apps/accounts/` in the working tree | `["storytime"]` (the working tree does not matter) |
| B-16 (C10) | W; base equals head (the same sha) | `[]`, exit 0 |
| B-17 | loop over the global inputs: `pnpm-workspace.yaml` key `nodeLinker`, `pnpm-workspace.yaml` key `verifyDepsBeforeRun`, root `package.json` `devDependencies`, `turbo.json` `globalEnv`, `.pnpmfile.cjs`, `.dockerignore`, lockfile `settings`. Assert `globals_checked=7`. | all 10 ids each |
| B-18 | W; edit the `catalog:` entry `zod` in `pnpm-workspace.yaml` (and the same entry in the `catalogs:` block of the lockfile). The expected set comes from a 5-line filter in the test over the copied manifests: table rows whose manifest holds `"zod": "catalog:"`. Assert the set is not empty. Second change: a new `catalog:` entry that no manifest lists. | the filtered set; then `[]` |
| B-19 | S; change the `overrides:` entry `ansi-styles` (reached by `alpha` only); then `zod` (reached by `beta` only); then an override for a name nobody lists | `["alpha"]`; `["beta"]`; `[]` |
| B-20 | loop over every success case above: stdout has exactly one line, no space, ids sorted. (The `expectIds` helper does this; the case counts `success_cases_checked>=20`.) | format holds |
| B-21 | Real table (reads `scripts/ci/apps.json`; artifact test): 10 rows; the key set of each row is exactly `id`, `path`, `service`, `project`, `region`, `cloudbuild`, `mode`, `tagPrefix`, plus `tag` and `tagLength` on gated rows; counts `direct=1` (`www-reading-advantage`), `gated=8`, `excluded=1` (`reading-advantage`); ids, paths, and services are unique; each `id` equals the `name` of `<path>/package.json`; each `cloudbuild` file is tracked; `region` is `asia-southeast1`; `tagPrefix` is `""` for direct and excluded rows and non-empty for gated rows; gated rows hold a non-empty `tag` and an integer `tagLength`; the one-off files (`cloudbuild-backfill.yaml`, `cloudbuild-catalogue.yaml`, `cloudbuild-etl.yaml`, `cloudbuild.continue-f5063222.yaml`) appear in no row; the `packages:` list of the real `pnpm-workspace.yaml` equals the four globs of C3. The tag values and lengths are checked in P2 (AC-2.3), not here. | pass after Green |
| B-22 | The helper env holds no `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`, or `GIT_PREFIX`, and sets `GIT_CONFIG_GLOBAL=/dev/null`. | passes at the base (characterization) |

Premise guards P-01 (`read_along_dependents=1`, names `storytime`), P-02 (`utils_rows=7`), and P-03 (`integrations_rows=6`) are three separate cases that read the copied manifests only. They fail with a message that says "the premise of the spec changed" if another track adds a dependent. The role reports that failure and does not edit the expected set. Cases A3-01, A3-02, and B-01 repeat the same numbers in their messages.

Counts of cases: about 50. The Red role records `cases_total=<n>` and Green must report the same `<n>` passed.

### P1.5 Green gates and phase check

**Task 1.3 Green (create `affected-apps.mjs` and `apps.json`).** Gates, each with its labeled evidence:

1. **Targeted tests.** The Red command with the same file list: `EXIT=0`, `Test Files 1 passed (1)`, `Tests <n> passed (<n>)`, failed 0, skipped 0 (parse the labeled lines, A3). `<n>` equals `cases_total` of Red.
2. **No test edit.** `git diff --stat <red_commit>..HEAD -- scripts/ci/__tests__` prints nothing. Green changes code only. A test that is wrong goes back to the Red role.
3. **Built-ins only.** `rg -n --pcre2 "from ['\"](?!node:|\.)" scripts/ci/affected-apps.mjs` and `rg -n "require\(|import\(" scripts/ci/affected-apps.mjs` both exit 1. No `yaml` import in the script.
4. **No shell.** `rg -n "execSync\(|exec\(|shell: *true" scripts/ci/affected-apps.mjs` exits 1. The script runs `git` with `execFileSync` or `spawnSync` and an argument array.
5. **No hash.** The detector of section 1.2 exits 1.
6. **Syntax and JSDoc.** `node --check scripts/ci/affected-apps.mjs` exits 0, and so does `node --check` on both test files. AGENTS.md requires JSDoc on every exported function: `rg -U --pcre2 -n "(?<!\*/\n)^export (async )?function" scripts/ci/affected-apps.mjs` exits 1 (run it first on a one-line scratch file that must hit, A14).
7. **Node 22.** The script uses no API that Node 22 lacks. Green names the lowest Node version it needs; the nearest check is a read of the API list (no Node 22 binary is installed).
8. **Dependency files untouched.** Among the commits of this track since `phase_base_sha`: no change to `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, or `.pnpmfile.cjs` (each is a global input; a change would affect all apps).

**Task 1.4 (record the script on real ranges).** Run the script (light; each call reads git) and write the output in the plan note with the exit code:

| Range | Expected |
|---|---|
| `ca3155932^..ca3155932` | `["www-reading-advantage"]` |
| `811f05f36^..811f05f36` | `["storytime"]` |
| `2515efe95^..2515efe95` | `["storytime"]` |
| `04b5cb161^..04b5cb161` | `[]` |
| `c0e2cfbb1^..c0e2cfbb1` | `["marketing"]` (the lockfile change is a vinext change; only `marketing` lists `vinext` among table rows). If the script returns more, the role explains each extra id with the lockfile entry that causes it before it changes the script. |
| `origin/master..HEAD` (use `git rev-parse` ids) | all 10 ids, because of the global key `verifyDepsBeforeRun` (M12). Record it. A narrower answer is a defect of the script, because `pnpm-workspace.yaml` changed outside `catalog` and `overrides`. |

Each id is the full sha from `git rev-parse` (the script takes only 40-hex ids, C2). The role writes the labeled line `real_ranges_checked=6`.

**Task 1.5 phase check** (the orchestrator runs it; no role edits to pass it):

1. The Green gates 1 to 8 again at the phase HEAD.
2. `git log <phase_base_sha>..HEAD --grep='track_id: per_app_cicd_20261107'` shows, in order: the Red commit (tests only), the Green commit (script and table only). Each commit header is 100 characters or less and carries `(track_id: per_app_cicd_20261107)`.
3. The Red commit, checked out alone, runs red with the expected failure of P1.3.
4. **Red-to-Green mutation set (adversarial role, P1.7).** The adversarial role copies the real script to a `mktemp -d` folder and applies each mutation with `AFFECTED_APPS_SCRIPT`. Each mutation must make at least one case fail. Label `mutants_killed=<k>/10`; closeout needs 10/10:

   | # | Mutation | Case that must fail |
   |---|---|---|
   | X1 | any lockfile change is global | A4-01, A4-03 |
   | X2 | direct dependencies only (no transitive closure) | B-13, A3-02 |
   | X3 | folder match without the trailing slash | B-06 |
   | X4 | `git diff` with default rename detection | B-07 |
   | X5 | no `-z` or `core.quotepath=false` | B-08 |
   | X6 | read only `apps/*` and `packages/*` | B-01 |
   | X7 | skip `devDependencies` and `peerDependencies` | B-13 |
   | X8 | drop any path that contains `docs/` or `measure/` anywhere | B-05 |
   | X9 | treat every `catalog` or `overrides` change as global | B-18, B-19 |
   | X10 | print `[]` and exit 0 when git fails | A6-02 to A6-06 |

5. Reviews A and C and the phase acceptance (P1.7).
6. **Scope.** The files of this track's P1 commits are inside: `scripts/ci/affected-apps.mjs`, `scripts/ci/apps.json`, `scripts/ci/__tests__/**`, `measure/tracks/per_app_cicd_20261107/**`, `measure/runs/per_app_cicd_20261107/**`. Label `p1_out_of_scope_paths=0`.
7. No `.github/workflows/**`, no `apps/**/cloudbuild*.yaml`, and no `docs/runbooks/**` change in P1.

Then the orchestrator appends `[checkpoint: <sha>]` to the Phase 1 heading.

### P1.6 Document tests and live tests

- **Live (function-level):** every case of groups A and B except B-21 and B-22 runs the real script on a real git repository. This is the proof of the logic.
- **Artifact:** B-21 reads the table and `pnpm-workspace.yaml`. It does not prove that a workflow uses the table. P2 proves that by text and by a dry run.
- **Not proven by P1:** that GitHub passes the right `before` and `sha`, that `fetch-depth: 0` is set, and that a push starts nothing it should not. Phase 2 checks the text. Only the first push (Phase 4, Daniel) proves the behavior.
- **Not proven:** `act` is absent (M8), so no tool runs a real workflow.

### P1.7 Review applicability and anti-patterns

| Review | Applies | Reason and scope |
|---|---|---|
| Review A (code) | **yes** | Checks the contract assumptions C1 to C10, that git runs without a shell, the base rule (zero base, held commit, merge base), the lockfile-as-text parser against the real format, and the two-file scope. |
| Review B (security, secrets, permissions) | **no** | P1 adds no workflow, no secret, no role, and no `gcloud` call. The one input risk (option injection into git) has its own cases (A6-09) and gate 4. If the script ever reads an environment secret or calls the network, Review B becomes required. |
| Review C (UX/API) | **yes, scoped to the CLI contract** | Three workflows and the tests depend on one interface: the flag names, the stdout JSON line, exit 0 or 2, and one stderr line. Review C checks that stdout and stderr are stable and plain enough for `fromJSON` and shell use. There is no screen. |
| Adversarial testing | **yes (one round)** | The mutation set of P1.5 item 4, plus hostile paths and refs: merge commits, a force-pushed base that the clone still holds, a very long file list (10 000 changed paths), and CRLF in a manifest. The adversarial role adds tests only in `scripts/ci/__tests__/` and runs them against Green. |
| Browser review (UX) | **no** | No UI. |

Anti-pattern coverage (catalog `measure/anti-patterns.md`):

| ID | Defense in this phase | Falsification condition |
|---|---|---|
| A3 | Every count is a labeled integer in the message or the evidence line: `rows`, `changed_files`, `bad_bases`, `globals_checked`, `cases_total`, `real_ranges_checked`. The check parses the integer after the label. | A bare number or a date passes a count check. |
| A4 | `expectIds` asserts the expected list is not empty before it checks each id, and asserts `changed_files` is at least 1 before it accepts `[]`. Each loop (bad bases, bad heads, globals) asserts its input size first. The stub run (P1.3) proves that no case is vacuous. | A loop over zero inputs exits 0. A case that no stub kills. A `[]` from an empty range passes. |
| A5 | The plan note quotes the exit code and the labeled counts of the command it cites. The note for task 1.4 quotes each range and each output. | A note says "pass" and the cited command exits non-zero. |
| A7 | Cases B-05 and B-06 defeat a folder filter that drops `docs/` or `measure/` anywhere in a path, and one that matches a folder prefix without a slash. The docs-only case A5-01 uses top-level folders only. | A filter that swallows `apps/storytime/docs/x.md` or matches `apps/storytime-lab`. |
| A9 | No test reads a `measure/tracks/` or `measure/archive/` path as a file. Fake changed-path strings are test data. Detector: `rg -n "(readFile|readFileSync|existsSync)[^;]*measure/" scripts/ci/__tests__` exits 1. | A test reads a file under `measure/`. |
| A14 | Detectors use `rg -n '<regex>'` (no `-E`). Exit 1 means no hit. Exit 2 is a failure, not a pass. | A detector with a bad option reports zero hits. |
| A16 | Scratch repos are plain `git init` folders under `/tmp`. `git worktree list \| wc -l` still prints 8 after the phase. | The count changes. |

A1, A2, A8, A10 to A13, and A15 do not apply to P1 (no supervisor edit, no publish gate, no plan-marker change beyond the standard `[x]`, no generated facts, no archive move, no receipts).

## P2: Per-app CD workflows (outline)

**Risk: critical.** The phase changes production deploy files: the push path of 9 apps, the traffic mode of `accounts` and `workbooks`, and the move of every database step out of the push files (D1, D7). A mistake can start a production build on an unplanned push, or leave a schema step out of the manual path. Task risk: 2.1 low, 2.2 high (www deploys straight to traffic), 2.3 high, 2.3a/b critical, 2.3d/e critical, 2.3f/g critical, 2.4 medium, 2.5 low, 2.7 low.

- **Red command (all Red tasks):** the P1.3 command (the same `scripts/ci` filter). Files: `cd-workflows.test.mjs` (2.1), `cloudbuild-files.test.mjs` (2.3a, 2.3d, 2.3f). Each Red task commits alone. The P1 file stays green.
- **Expected failures at the P2 base:** `cd-workflows`: the www workflow has no `affected-apps.mjs` call and no `fetch-depth: 0`; `cd-apps.yml` is missing; `apps/storytime/cloudbuild.yaml` holds `st-$BUILD_ID` (52 characters with the service, limit 46); `facts_found=0` of 7 in the runbook. `cloudbuild-files`: Primary holds `refuse-legacy-db`, `migrate-db`, `doctor-check` in the push file; `cloudbuild-traffic.yaml` files are missing; `accounts` and `workbooks` deploy straight to traffic. Characterization cases that pass at the base: AC-2.4 (no `update-traffic` or `--to-latest` in the workflows) and AC-2.8 (no workflow names a traffic file). Red names them.
- **Select-step dry run.** A helper parses each workflow with `yaml` 2.9.0 (M3), finds the step that runs `affected-apps.mjs`, runs its `run:` text in a scratch repo with `GITHUB_OUTPUT=<tmpfile>`, the event `before` and `sha` in the env, and a stub `gcloud` first on `PATH` that records each call. It asserts that the select step makes **zero** `gcloud` calls and that the matrix or the flag in `GITHUB_OUTPUT` plans the right jobs for the AC-1 ranges (AC-2.1, AC-2.2). Labeled counts: `jobs_planned=<n>`, `gcloud_calls=0`.
- **Green gates:** the Red command exits 0 with every file passing and the same P1 count; `rows_checked=8` (AC-2.3); `files_checked=2` (AC-2.9), `files_checked=4` and `sales_db_steps_moved=6` (AC-2.12); `rows` of non-excluded table rows equals 9 (AC-2.10); `facts_found=7` (AC-4.2); the YAML of each changed workflow and `cloudbuild` file parses (`yaml` parse exits without error); no workflow holds `update-traffic`, `--to-latest`, or `cloudbuild-traffic` (`rg -n` exit 1 on `.github/workflows`).
- **Document vs live:** all P2 tests are artifact tests plus the select-step dry run. None proves that Cloud Build accepts the edited file, that the tag stays within 46 characters at run time, or that the new Primary revision starts against the old schema (D1). The last one is a runbook statement and an owner-passed check at the first traffic move.
- **Reviews:** A yes; **B yes (required)**: `permissions:` of each workflow, secrets only in push jobs, no `pull_request_target`, no secret on a fork run, the roles of the GitHub service account for each gated app (AC-2.5, `[b] deferred:daniel`), and the rule that no push path touches a production database; C yes: the tag names, the traffic-file contract, and the runbook text; adversarial **yes**: put a database step back in a push file, drop `--no-traffic`, lengthen a tag to 40 characters, add `update-traffic` to a workflow, and add a row that is `excluded` to the matrix. Each must fail a test (`mutants_rejected=<n>`). Browser: no.
- **Anti-patterns:** A3 (labeled counts above); A4 (every loop over files or steps asserts its input is not empty: `steps_n>0` before a per-step check, `files_checked` asserted); A5; A7 (the database-step detector names `DATABASE_URL` in `secretEnv`, `cloud-sql-proxy`, `psql`, `drizzle`, `@reading-advantage/db`, `company-identity:`, `bootstrap:production` as in AC-2.10, and must not flag the runtime options `--set-secrets` and `--add-cloudsql-instances`; a mutant file that adds each token to a step must fail); A9; A14; A16.
- **`phase_base_sha`:** captured by the section 1.4 command after the Phase 1 checkpoint.

## P3: CI for the affected apps (outline)

**Risk: medium.** The phase edits CI only. It changes no deploy file. A wrong filter can skip a check (a quality risk) but cannot deploy. The repository-wide guards must keep running.

- **Red command:** the P1.3 command. File: `ci-workflow.test.mjs` (3.1). Expected at the base: `ci.yml` holds no `affected-apps.mjs` call and no `--filter=` run, so the planned-set cases fail. The case "the repository-wide guards still run" passes at the base (characterization).
- **Green gates:** the Red command exits 0 with every file passing; AC-3.1 holds for each fake range of P1 (the planned app set of the `ci.yml` select step equals the script output, `ranges_checked>=6`); AC-3.2 (docs-only range plans no app job and keeps the guards that its paths trigger); the filter syntax is valid for every table id: `pnpm exec turbo ls --filter=<id>...` exits 0 and lists at least 1 package for each of the 10 ids, label `turbo_filters_ok=10` (not measured at the base, M14); YAML parses.
- **Task 3.3:** record the first failing step of the latest `ci.yml` run on master with a read-only `gh run list` and `gh run view --log-failed` (a read, not a run). Label: `ci_first_failing_step=<step name>`. The expected step is `Architecture boundary check` (`pnpm architecture:check`, exit 1, "Analyzer input snapshot hash does not match current bytes", per the plan). The role does not fix it (D5).
- **Document vs live:** artifact tests plus the select-step dry run. Live proof is the first push and the CI run that follows. CI stays red until the later CI-green track.
- **Reviews:** A yes; B yes (the service containers and test credentials only; no deploy secret in `ci.yml`); C no; adversarial yes, light (one mutant round: drop the guards, run all apps on a docs range, ignore a failed select step); browser no.
- **Anti-patterns:** A3, A4 (a docs-only case asserts `changed_files>=1`), A5 (the plan note quotes the failing step text exactly; it never says "CI green"), A6 (the registry note says CI is red), A9, A14, A16.

## P4: Dry runs, www proof, and the first-push plan (outline)

**Risk: high.** No deploy happens in the phase, but its report and its plan lead directly to a push that deploys www to traffic. The www build and test at the pushed HEAD is the only proof that the 198 commits build.

- **Dry run:** `act` is not installed (M8). The dry run is the select-step runner of P2 and P3 over each workflow and each fake range, with no secret and no deploy. The report `dry-run-report.md` has one row per table app (10) and one row for CI (`rows=11`, AC-5.1).
- **Red:** the report test, run with the P1.3 command, fails at the base because the report is missing (`Missing dry-run-report.md`) and passes after task 4.1. Task 4.2 has no Red (it is a run). Expected failure shape for 4.2 if www does not build: the first failing task from `turbo`.
- **Green gates:** AC-5.1 (`rows=11`, each row names its range, its planned jobs, and `gcloud_calls=0`); AC-5.2: `HEAVY … 'cd ROOT && CI=true pnpm exec turbo run build test --filter=www-reading-advantage...; echo "EXIT=$?"'` gives `EXIT=0` at the HEAD that the report names (label `www_head=<sha>`; the heavy job takes long and one job runs at a time); AC-5.3: the plan line names exactly the ids that the script returns for `origin/master..HEAD`, computed at the report HEAD; no `gcloud` write and no change to a Cloud Build trigger happened (`gcloud builds triggers list` read only).
- **Predicted plan at the base:** all 10 ids affected (M12). The non-excluded rows deploy: `www-reading-advantage` to traffic (direct) and 8 gated apps as `--no-traffic` revisions with a tag; `reading-advantage` is skipped (`excluded`). The report states this in one line. The decision to accept it, or to change the global-key rule, belongs to Daniel (Q7, AC-5.4).
- **Document vs live:** the dry run and the report are artifact and function-level proof. Live proof is the first push on Daniel's word (`[b] deferred:daniel`) and every traffic move.
- **Reviews:** A yes; B yes (final check of workflow permissions, secrets, and roles against the dry-run report); C yes (the report and the push plan: plain words, one row per app, the deploy list); **adversarial yes**: a force-pushed base that the runner lacks, a zero base on a new branch, a push with only `measure/` files, and a workflow run on a pull request from a fork (no secret). Browser: no.
- **Anti-patterns:** A3 (`rows=11`, `www_head=<sha>`), A4 (the plan names at least 1 id; a plan with zero ids needs a stated reason), A5 (the report quotes each exit code), A6 (no "resolved" claim about CI or deploys), A16.

## 4. Questions and defaults

The role continued with each default. The orchestrator relays a question to the PM only if it wants a different answer.

| # | Question | Default used |
|---|---|---|
| Q1 | Do `--base` and `--head` both need a 40-hex id (no ref names)? The spec fixes this for the base only. | Yes, both. The head follows the same rule, which also blocks option injection (C2). |
| Q2 | Does the script read the table, manifests, and lockfile from the head commit (not from the working tree)? | Yes (C1). The answer at a named HEAD is then the same on a dirty tree. |
| Q3 | A non-zero base equal to the head: `[]` with exit 0, or exit 2? | `[]` with exit 0 (C10). It is a readable empty range. The zero-base empty range exits 2, as the spec says. |
| Q4 | Are `.pnpmfile.cjs`, `.dockerignore`, and the lockfile top-level keys (`settings`, `lockfileVersion`, `pnpmfileChecksum`) global inputs? D4 names only the keys of `package.json`, `pnpm-workspace.yaml`, and `turbo.json`. | Yes, global (C8). Every Dockerfile copies `.pnpmfile.cjs`, and `settings` changes the install of every app. |
| Q5 | Does a change to `.github/workflows/**` or `scripts/ci/**` (including `cd-www-reading-advantage.yml` itself) affect an app? | No. The script returns `[]` (C7). A workflow edit can start the workflow run through its own `paths:` filter, but it deploys no app. |
| Q6 | The spec says the graph comes from `apps/*` and `packages/*`. The real workspace has four globs (M4). May the script read all four? | Yes (C3). Without `packages/integrations/*` a change reaches 6 rows and returns `[]`. |
| Q7 | The pending range changes the global key `verifyDepsBeforeRun` of `pnpm-workspace.yaml` (M12). Under D4 the first push then affects all 10 rows: www deploys to traffic and 8 gated apps build. Do you keep D4 literal for that push? | Yes. The role does not change D4. Phase 4 reports the deploy list and Daniel decides at AC-5.4. |
| Q8 | The root has no ESLint config and no `tsconfig` for `scripts/`. The plan names `tsc` and ESLint for the new files. | The gate is `node --check` of the script and the tests, plus the detectors of P1.5 gate 3 to 6. `tsc --checkJs` is optional and advisory. The Green role records the exit code of any optional run. |
