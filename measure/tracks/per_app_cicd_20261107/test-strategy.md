# Test strategy: Per-app CI/CD

> **Track:** `per_app_cicd_20261107` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Scope:** Phase 1 `## Phase 1: The affected-app logic` and Phase 2 `## Phase 2: Per-app CD workflows` in full (sections P1 and P2). Outlines for `## Phase 3: CI for the affected apps` and `## Phase 4: Dry runs, www proof, and the first-push plan` (sections P3 and P4).
> **Written:** 2026-11-07 at role base `04b5cb1619afb7742a06f6cf1c884805cee3e320` (spec review passed in round 2). Model: claude-code/claude-sonnet-5-5.
> **Checked and revised (round 2):** 2026-11-07 at role base `c4890971f4c99bbe74ba052722938e29c6700371`. Model: deepseek/deepseek-v4.1-flash (a different family from the writer). Section 5 lists what was re-measured and what changed.
> **Phase 2 written:** 2026-11-07 at the P2 role base `390bcb684237d0ed9bde78682a2d3e06493cb0d3` (the tree after the Phase 1 checkpoint). Model: deepseek/deepseek-flash, a family different from the spec writer (the plan requires it). The immutable `phase_base_sha` is captured after this strategy commit (P2.7).
> **Amended 2026-11-07 (PM decision):** guard runs for the P2, P3, and P4 phase gates (Red r5), Red r6 cases W-22 and F-18, the P3 sales build-identity contract, and Review B finding B1 (M43).
> **Facts:** each "measured" fact in section 2 was read at its role base on 2026-11-07. One heavy job ran at each base (M1, M37). Red and Green must measure again. Facts re-read in round 2 carry the round-2 date. Facts M23 to M42 were read at `390bcb684`.
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
- **Intentionally-red aggregate suites.** `ci.yml` is red on master for steps outside this track (D5). A red aggregate run is therefore expected and is never a phase-gate failure. Rules:
  - The gate of every phase is the targeted `scripts/ci` suite plus the detectors of that phase. It is the only suite that must be green.
  - A red aggregate run is recorded with its first failing step or test (`ci_first_failing_step=<name>`), never summarized as "red" (A3, A5).
  - No role fixes an aggregate failure, skips a test, or weakens a filter to make a gate pass (D5).
  - The one exception is AC-5.2: `turbo run build test --filter=www-reading-advantage...` is a gate of Phase 4 and must exit 0. If it is red, the phase stops and the report names the first failing task, the test, and the pre-existing cause. A red www run is a blocker for the first push, not a recorded fact.
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

- This file embeds no SHA. A SHA from before this strategy commit is not valid. The role base `c4890971f` and `04b5cb161` are **not** valid `phase_base_sha` values: each predates the committed strategy.
- **Exact point for Phase 1.** The orchestrator captures `phase_base_sha` with `git rev-parse HEAD` immediately after these two commits exist, in this order: (a) the commit of this strategy, and (b) the commit that marks plan task 1.1 `[x]` with its evidence. The capture happens after (b) and before the Red role writes or commits its first file. The orchestrator records the full 40-hex SHA in the Red evidence and in the phase log.
- If the capture finds a HEAD that does not contain this strategy file (`git cat-file -e <sha>:measure/tracks/per_app_cicd_20261107/test-strategy.md` fails), the capture is void: capture again after the strategy commit lands.
- The answers to the questions of section 4 do not block the capture. A later answer that changes a default reopens the phase; it does not move `phase_base_sha` (A5: the base stays the base that the tests ran against).
- Master is shared with the storytime tracks. `phase_base_sha..HEAD` holds commits of other tracks. Scope checks use the commits of this track only:
  `git log <phase_base_sha>..HEAD --format=%H --grep='track_id: per_app_cicd_20261107'`, then `git show --name-only --format= <sha>` for each. Label: `p1_out_of_scope_paths=<n>`; closeout needs 0 (the allowed paths are in P1.5 item 6).
- Phases 2, 3, and 4 each get their own capture, by the same command, immediately after the checkpoint commit of the phase before it and before the first Red commit of the new phase.
- All work runs in the shared master tree. Scratch folders are plain directories from `mktemp -d` under `/tmp`. No role runs `git worktree add` (A16).

### 1.5 Architecture guardrails and changed-contract risks

- **Guardrails** (a violation is a Review A blocker):
  - No new dependency and no edit to `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, or `.pnpmfile.cjs`. Each is a global input under D4; a change would make every push deploy every app.
  - The script stays at `scripts/ci/affected-apps.mjs`, and no app, package, or test imports it as a module. The contract is the CLI plus one JSON line on stdout.
  - The table `scripts/ci/apps.json` is the only source of app facts. No workflow and no test hard-codes a service name, a project, or a tag prefix.
  - No workflow runs a `cloudbuild-traffic.yaml`, and no push path holds a database step (D1, D7).
  - The script reads no secret and calls no network.
- **Changed-contract risks.** Four contracts change in this track; each gets a test and a review:
  - The script CLI (`--base`, `--head`, stdout, exit 0 or 2) is consumed by three workflows and by the tests. A changed flag name or output shape breaks all of them silently.
  - The table schema (`id`, `path`, `service`, `project`, `region`, `cloudbuild`, `mode`, `tagPrefix`, plus `tag` and `tagLength` on gated rows) is consumed by the script, the two workflow files, and the tests of P2.
  - The step ids of the cloud build files (`migrate-db`, `doctor-check`, `capture-legacy-rollback`, and the rest) are consumed by the tests of AC-2.6 to AC-2.12. A renamed step fails a test even when the behavior is right; the role renames the step and updates the test in one commit, never the test alone.
  - The runbook facts of FR-4 are consumed by AC-4.2. A rewrite that drops a fact fails the count.

## 2. Measured facts at the role base

| # | Fact | How measured |
|---|---|---|
| M1 | `scripts/ci/` exists and holds 3 shell files (`check-graph-db.sh`, `fresh-db-e2e.sh`, `sql-adr-guard.sh`) and no test. The root `vitest.config.ts` (default include `**/*.{test,spec}.?(c|m)[jt]s?(x)`, `testTimeout` 120 s) is the only Vitest config that applies from the root. There is no `vitest.workspace` file. The plan command at the base prints `No test files found, exiting with code 1`, with `filter: scripts/ci` (Vitest 4.1.8), and the inner exit is 1 while the wrapper exit is 0. No other tracked file path contains `scripts/ci`, so the filter picks no foreign test. That a `.mjs` test under `scripts/ci/__tests__` runs was NOT measured here (it needs a test file). The first Red run proves it. | One `heavy-run.sh` job, 2026-11-07, output in `/tmp/cicd-base-vitest.txt`; `git ls-files`. |
| M2 | Test command, exact: `CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci; echo "EXIT=$?"` inside the wrapper, cwd the repository root. `pnpm exec` starts at once because `pnpm-workspace.yaml` sets `verifyDepsBeforeRun: false`. | Same job. |
| M3 | YAML parsers that already exist: `yaml` 2.9.0 (`node_modules/yaml`) and `js-yaml` 4.3.2 (`node_modules/js-yaml`). Both resolve from the root (`require.resolve`). The root `package.json` declares neither. They sit at the root only because `pnpm-workspace.yaml` sets `nodeLinker: hoisted`. Rule: P2 and P3 tests may `import { parse } from "yaml"`. The script itself uses no YAML package (spec FR-1). No role adds a dependency (that edits `package.json` and the lockfile, which is a global change under D4). | `ls`, `node -e require.resolve`, `grep` of `package.json`. |
| M4 | The workspace has 48 `package.json` folders and **four** globs in `pnpm-workspace.yaml`: `apps/*`, `packages/*`, `packages/integrations/*`, `services/*`. The spec names two. `packages/integrations/github` (`@reading-advantage/integrations-github`) is a dependency of `@reading-advantage/domain`. It therefore reaches 6 table rows: `codecamp-advantage`, `marketing`, `primary-advantage`, `reading-advantage`, `sales-advantage`, `workbooks`. A script that reads only `apps/*` and `packages/*` returns `[]` for a change in that package. `services/session-service` and `services/worker` have no app dependent. The workspace has no dependency cycle. | A Node read of every manifest (dependencies, devDependencies, peerDependencies, optionalDependencies), transitive closure. |
| M5 | Transitive closures at the base, table rows only (re-read in round 2, same result): `packages/utils` reaches the 7 rows of AC-1.3 (it also reaches the workspace package `@reading-advantage/ui` and the two apps `science-advantage` and `advantage-games`, whose package name is `vocabulary-games`; none is a table row). `packages/read-along` reaches `storytime` only. `packages/config` reaches all 10 rows. `packages/ui` reaches 6 rows (not `storytime`, `accounts`, `workbooks`, `marketing`). `packages/db` reaches 8 rows. `packages/backend` reaches `accounting`, `accounts`, `primary-advantage`. | Same read. |
| M6 | Git 2.53.0. The global git config holds no `diff.renames` and no `core.quotepath`. Git defaults therefore apply: rename detection is on for `git diff`, and a path with a non-ASCII character prints in quotes with octal escapes under `--name-only`. A tracked path of this kind exists: `apps/advantage-games/public/Vibe-Coding Arena — Official Rules.pdf`. A script that prefix-matches `git diff --name-only` output misses such a path, and it misses the old path of a moved file. | `git config`, `git ls-files`. |
| M7 | Root files that build inputs read and that D4 does not name: `.pnpmfile.cjs` (every Dockerfile copies it; the lockfile holds `pnpmfileChecksum`) and `.dockerignore`. The root has no `tsconfig*.json` and no ESLint config. | `ls -a`. |
| M8 | `act`, `actionlint`: not installed. `docker` and `gh`: installed. | `command -v`. |
| M9 | `ci.yml` uses Node 22 (`actions/setup-node@v4`). Local Node is 24.19.0. The script must not use an API that Node 22 lacks. `cd-www-reading-advantage.yml` sets up no Node (the runner image holds one). | Read the workflows, `node --version`. |
| M10 | The `www-reading-advantage` Dockerfile copies the whole `apps` and `packages` folders. The `storytime` Dockerfile copies `apps/storytime`, `packages/config`, and `packages/read-along` only. The www image context therefore holds code the www build does not use. D4 and the PM order still decide by the dependency closure. | `grep COPY`. |
| M11 | The count of commits `origin/master..HEAD` is **207** (round 2, 2026-11-07). It was 198 at the round-1 base and 168 when the spec was written. The spec's number is stale by design. Phase 4 measures again and names its own count. | `git rev-list --count origin/master..HEAD`. |
| M12 | The range `origin/master..HEAD` changes `pnpm-workspace.yaml` by one key, `verifyDepsBeforeRun: false` (re-read in round 2: the hunk adds three lines, one of them the key). That key is not a `catalog` or `overrides` entry, so D4 makes it **global**. The affected set of the push is therefore all 10 table rows, whatever else the range holds (section 4, Q7). The range also changes `pnpm-lock.yaml` (88 insertions, 101 deletions, unchanged from round 1), 3 files of `apps/www-reading-advantage`, 94 of `apps/storytime` (87 at round 1), 34 of `apps/primary-advantage`, 1 of `apps/marketing`, 4 of `packages/read-along`, 2 of `packages/backend`, 1 of `packages/db`, 2 of `apps/activity-vinext-fixture`, 2 of `docs/`, 91 of `measure/`, and `CONTRIBUTING.md`. | `git diff origin/master HEAD`, `git diff --stat`, `git rev-list --count`. |
| M13 | Real past single-commit ranges for task 1.4 (first-parent, `X^..X`), with the files read: `ca3155932` changes 3 www files only; `811f05f36` changes `apps/storytime` only; `2515efe95` changes `packages/read-along` only; `04b5cb161` changes `measure/` only; `c0e2cfbb1` changes `apps/activity-vinext-fixture`, `apps/marketing/package.json`, and `pnpm-lock.yaml` (vinext 0.2.0 to 1.2.0). Only `marketing` and `activity-vinext-fixture` list `vinext`. | `git show --stat`, `grep '"vinext"'`. |
| M14 | Not measured: `tsc` on the new `.mjs` files (no `tsconfig` covers `scripts/`, and the root has no ESLint config), and `turbo ls --filter=<id>...` for the 10 ids. The Phase 1 gate uses `node --check` instead (Q8). | Cost and absence of config. |
| M15 | `git worktree list \| wc -l` prints 8 and the branch is `master`. | Light read. |
| M16 | **Round 2.** The app table of spec section 2 matches the tree: 10 rows, `direct=1` (www), `gated=8`, `excluded=1` (reading-advantage); every row's file exists and is tracked; every row's region is `asia-southeast1`; the one-off files (`cloudbuild-backfill.yaml` untracked, `cloudbuild-catalogue.yaml`, `cloudbuild-etl.yaml`, `cloudbuild.continue-f5063222.yaml`) exist and are in no row. `scripts/ci/apps.json` does not exist yet. | `git ls-files 'apps/*/cloudbuild*.yaml'`, `git diff --stat`, a read of each deploy step. |
| M17 | **Round 2.** `apps/accounting/cloudbuild.yaml` uses `--tag=candidate --no-traffic` only when the service exists (line 66-69); its other branch deploys with `--tag=candidate` and no `--no-traffic`. The other seven gated rows set `--no-traffic` unconditionally. A test that asserts `--no-traffic` in every gated file fails on accounting. | Read of the deploy step of each gated file. |
| M18 | **Round 2.** `apps/sales-advantage/cloudbuild.continue-f5063222.yaml` holds the token `update-traffic` (line 128). A detector for AC-2.4 that scans `apps/*/cloudbuild*.yaml` reports a hit. AC-2.4 is about workflow files, so the detector is scoped to `.github/workflows/**`. Any other scan of cloud build files must name the row's own file. | `grep -rn 'update-traffic\|--to-latest'`. |
| M19 | **Round 2.** The marketing deploy step derives its tag in bash: `candidate_tag="c$${build_id%%-*}"`, so the file holds no literal `c<8 hex>`. The table's `tag` text for marketing is the derivation, not a literal prefix. Same for accounting (`candidate`), codecamp (`sso-candidate`), and sales (`legacy-rollback`, `candidate`): their tags do not follow the `<prefix>-<8>` rule. | Read of the four deploy steps and of spec section 2a. |
| M20 | **Round 2.** Neither workflow declares `permissions:`. `grep -rn 'permissions:' .github/workflows` finds nothing. The two workflows read the repository and use `secrets.GCP_SERVICE_ACCOUNT` and `secrets.GCP_PROJECT_ID`; `ci.yml` also holds a Postgres and a pgbouncer service. | Read of both workflow files. |
| M21 | **Round 2.** Three apps are not table rows: `activity-vinext-fixture`, `advantage-games` (package name `vocabulary-games`), and `science-advantage`. A change to one of them returns `[]` from the script by design (C5), so Phase 3 plans no app job for it. `ci.yml` today checks `apps/**` under one job. This is a coverage gap, recorded as Q9. | Read of the app list against the table. |
| M22 | **Round 2.** `ci.yml` already sets `fetch-depth: 0` in its checkout. `cd-www-reading-advantage.yml` does not set it (the default is 1). With `fetch-depth: 0`, `actions/checkout` fetches all branches into `refs/remotes/origin/*`, so the zero-base fallback to `origin/master` works in Actions. A shallow checkout breaks that fallback (case A6-06). | Read of both workflows. |
| M23 | **P2 base.** HEAD is `390bcb684237d0ed9bde78682a2d3e06493cb0d3` and equals the given P2 base. The working tree is dirty from other sessions. | `git rev-parse HEAD`, `git status --porcelain`. |
| M24 | **P2 base.** `.github/workflows/` holds exactly `cd-www-reading-advantage.yml` and `ci.yml`. No `cd-apps.yml`. `cd-www` triggers on push to `master` with 6 paths (`apps/www-reading-advantage/**`, `packages/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`) and runs one job `deploy`. Its steps are checkout (no `fetch-depth`), auth, setup-gcloud, `gcloud builds submit --config=apps/www-reading-advantage/cloudbuild.yaml .`, and describe. `ci.yml` holds `fetch-depth: 0`, Node 22, and the two service containers. Neither file declares `permissions:`, `concurrency:`, or `pull_request_target`. Only `cd-www` uses secrets. | Read of both files, `grep -rn`. |
| M25 | **P2 base.** `scripts/ci/apps.json` exists (P1): 10 rows, `direct=1`, `gated=8`, `excluded=1`. Every gated row holds `tag` and `tagLength`. The four prefix rows hold `<prefix>-${BUILD_ID:0:8}`. The four file-tag rows hold `candidate`, `sso-candidate`, `c$${build_id%%-*}` (JSON text), and `legacy-rollback`. | Read and a Node read of the table. |
| M26 | **P2 base.** Tag math: primary 11+21=32; storytime 11+13=24; accounting 9+10=19; codecamp 13+18=31; marketing 9+9=18; sales 15+15=30; accounts 11+8=19; workbooks 11+9=20. The maximum is 32. The limit 46 comes from the spec's quoted failure text of build `4907d929`. `gcloud run deploy --help` does not state the number locally. | A Node read of the table; `gcloud run deploy --help`. |
| M27 | **P2 base.** `apps/storytime/cloudbuild.yaml` deploys `--no-traffic --tag=st-$BUILD_ID`. The tag renders to 39 characters (`st-` plus the 36-character build id). Tag plus service is 52. | Read of the deploy step. |
| M28 | **P2 base.** Primary push file step ids: `build-image`, `push-image`, `refuse-legacy-db`, `migrate-db`, `doctor-check`, `deploy-cloudrun`. The deploy step is direct (no `--no-traffic`, no `--tag`). The three database steps hold `cloud-sql-proxy`, `pnpm --filter @reading-advantage/db`, and `secretEnv DATABASE_URL`. `doctor-check` holds `--required-migration 0074_primary_help_events`. | `yaml` parse and a read. |
| M29 | **P2 base.** Accounts push file step ids: `build-image`, `push-image`, `migrate-company-identity`, `bootstrap-company-identity`, `doctor-company-identity`, `bootstrap-production-identity`, `runtime-db-contract`, `deploy-cloudrun`, `allow-public-invoker`. The deploy step is direct (no `--no-traffic`, no `--tag`). It holds `--service-account=accounts-cloud-run@...`, `--set-secrets`, and `--add-cloudsql-instances`. The five database steps hold `cloud-sql-proxy`, `company-identity:`, `bootstrap:production`, `psql`, and secret names that contain `DATABASE_URL`. | `yaml` parse and a read. |
| M30 | **P2 base.** Workbooks push file step ids: `build-image`, `push-image`, `deploy-cloudrun`. It deploys direct and holds `--service-account=workbooks-cloud-run@$PROJECT_ID.iam.gserviceaccount.com`. It holds no database step. | `yaml` parse and a read. |
| M31 | **P2 base.** Accounting holds `migrate-db`, `doctor-check`, `runtime-db-contract` before `deploy-company-candidate`. That deploy step runs `--tag=candidate --no-traffic` only when the service exists, and `--tag=candidate` otherwise (M17 holds). | Read of lines 46 to 71. |
| M32 | **P2 base.** Codecamp holds `migrate-db` and `doctor-check`; it deploys `--tag=sso-candidate --no-traffic`. Marketing holds `migrate-db`, `doctor-check`, `runtime-db-contract`; its deploy derives the tag `c$${build_id%%-*}` and uses `--no-traffic`. Sales holds the 6 database steps `migrate-db`, `doctor-check`, `seed-production-curriculum`, `verify-production-curriculum`, `runtime-db-contract`, `verify-repair-verify-legacy-rollback`, and the helpers `build-curriculum-workspace-deps` and `capture-legacy-rollback`. `verify-curriculum-backup` is at index 1. Both sales deploys use `--no-traffic` (tags `legacy-rollback` and `candidate`). | `yaml` parse of all files. |
| M33 | **P2 base.** No `apps/*/cloudbuild-traffic.yaml` exists. | `git ls-files 'apps/*/cloudbuild-traffic.yaml'`. |
| M34 | **P2 base.** `rg -n 'update-traffic\|--to-latest' .github/workflows` exits 1 (no hit). `rg -n 'cloudbuild-traffic' .github/workflows` exits 1. These are characterization passes. | `rg -n` on `.github/workflows`. |
| M35 | **P2 base.** `docs/runbooks/storytime-deploy.md` exists (track `storytime_app_rebuild_20261025`) and holds `facts_found=0` of the 7 FR-4 facts. It still documents `--tag=st-$BUILD_ID`. | A read and 7 greps. |
| M36 | **P2 base.** `yaml` 2.9.0 resolves from the root and parses both workflows and every `cloudbuild*.yaml`. `on` is a string key. `jq`, `gh`, and `gcloud` exist locally. `act` and `actionlint` do not (M8). | `node -e require.resolve`, a parse, `command -v`. |
| M37 | **P2 base.** `CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci` gives `EXIT=0`, `Test Files 2 passed (2)`, `Tests 52 passed (52)` (48 P1 plus 4 adversarial). One heavy job, 45.60 s. | One `heavy-run.sh` job, 2026-11-07. |
| M38 | **P2 base.** `gh secret list --repo Reading-Advantage-Thailand/reading-advantage-monorepo` shows exactly two names: `GCP_PROJECT_ID` (`2026-05-23T03:56:03Z`) and `GCP_SERVICE_ACCOUNT` (`2026-05-23T03:55:39Z`). No per-app secret exists. The values were not read. | `gh auth status`, `gh secret list`. |
| M39 | **P2 base.** In project `reading-advantage`, `github-actions-deploy@reading-advantage` holds `artifactregistry.writer`, `iam.serviceAccountUser`, `run.admin`, and `secretmanager.secretAccessor`, with no Cloud Build role at project level. `docker-service-account@reading-advantage` holds `cloudbuild.builds.builder`, `cloudbuild.serviceAgent`, `run.developer`, `run.invoker`, and `run.serviceAgent`. The secret value is unknown, so the active identity is not proven. | `gcloud projects get-iam-policy ... --flatten='bindings[].members' --filter=...`. |
| M40 | **P2 base.** In project `primary-advantage`, neither candidate service account holds a project-level binding. The Cloud Build service account `1064299189080@cloudbuild.gserviceaccount.com` holds `cloudbuild.builds.builder`; the user `wannachok.job@gmail.com` holds `cloudbuild.builds.editor`. | `gcloud projects get-iam-policy primary-advantage ...`. |
| M41 | **P2 base.** Project `reading-advantage` holds the service accounts `accounts-cloud-run`, `accounting-cloud-run`, `codecamp-cloud-run`, `marketing-cloud-run`, `sales-cloud-run`, and `accounting-build-verifier`. It holds no `workbooks-cloud-run` (`describe` returns NOT_FOUND). Its Cloud Run services hold `accounting`, `accounts`, `codecamp-advantage`, `marketing`, `sales-advantage`, `reading-advantage-web`, and others, and no `workbooks`. Project `www-reading-advantage` holds `www-reading-advantage`. | `gcloud iam service-accounts list|describe`, `gcloud run services list`. |
| M42 | **P2 base.** The table's `project` field holds `$PROJECT_ID` on 8 rows and `primary-advantage` on 2. The measured locations put www in project `www-reading-advantage` and the six `$PROJECT_ID` gated apps in `reading-advantage`. One `GCP_PROJECT_ID` secret cannot select both projects. This is the new fact of the phase (Q10). | M41 and a table read. |
| M43 | **Review B, 2026-11-07.** B1: the www deploy key held `roles/editor`, `run.admin`, `storage.admin`, and `iam.serviceAccountUser` in project `www-reading-advantage`. Daniel reduced the roles in IAM on 2026-11-07. No repository file changed. The reduced role set was not read. The P4 www dry run (AC-5.2) is the live proof that the reduced key still deploys. | Review B result and the owner statement; no secret value read. |

## 3. Phase summary

| Phase | Risk | Review A (code) | Review B (secrets, permissions) | Review C (UX/API) | Adversarial | Browser review |
|---|---|---|---|---|---|---|
| P1 Affected-app logic | **medium** | yes | no (no secret, no role, no workflow) | yes, scoped to the CLI contract | **yes (one round, mutation set)** | no (no UI) |
| P2 Per-app CD workflows | **critical** | yes | **yes (required)** | yes (tag, runbook, traffic-file contract) | **yes** | no (no UI) |
| P3 CI for affected apps | medium | yes | yes (CI service containers and env only) | no | yes (light, one mutant round) | no |
| P4 Dry runs, www proof, first-push plan | **high** | yes | yes (final) | yes (the report and the push plan) | **yes** | no (a post-push www page check belongs to Daniel and the PM) |

The reasons are in P1.7 and P2.7, and in the P3 and P4 outlines.

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

### P1.5 Green gates and phase check (closeout gate)

**Task 1.3 Green (create `affected-apps.mjs` and `apps.json`).** Gates, each with its labeled evidence:

1. **Targeted tests.** The Red command with the same file list: `EXIT=0`, `Test Files 1 passed (1)`, `Tests <n> passed (<n>)`, failed 0, skipped 0 (parse the labeled lines, A3). `<n>` equals `cases_total` of Red.
2. **No test edit.** `git diff --stat <red_commit>..HEAD -- scripts/ci/__tests__` prints nothing. Green changes code only. A wrong test goes back to Red as a new commit before the checkpoint; Green never edits a test to pass.
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
| A6 | The plan note of task 1.3 says what the script does and what the tests prove. It never says CI is fixed, that a deploy is safe, or that the first push is cleared (P1 deploys nothing and proves no workflow). | A note claims a workflow or deploy behavior that P1 did not test. |
| A7 | Cases B-05 and B-06 defeat a folder filter that drops `docs/` or `measure/` anywhere in a path, and one that matches a folder prefix without a slash. The docs-only case A5-01 uses top-level folders only. | A filter that swallows `apps/storytime/docs/x.md` or matches `apps/storytime-lab`. |
| A9 | No test reads a `measure/tracks/` or `measure/archive/` path as a file. Fake changed-path strings are test data. Detector: `rg -n "(readFile|readFileSync|existsSync)[^;]*measure/" scripts/ci/__tests__` exits 1. | A test reads a file under `measure/`. |
| A14 | Detectors use `rg -n '<regex>'` (no `-E`). Exit 1 means no hit. Exit 2 is a failure, not a pass. | A detector with a bad option reports zero hits. |
| A16 | Scratch repos are plain `git init` folders under `/tmp`. `git worktree list \| wc -l` still prints 8 after the phase. | The count changes. |

A1 and A2 do not apply: no supervisor decides from a substring, and P1 has no publish gate. A8 does not apply: this track uses the four markers only. A10 does not apply: the track generates no facts file. A11 does not apply: P1 holds no `[b]` review task (the human gates are in P2, 2.3c, 2.3h, 2.6, 4.5, 4.6). A12 and A13 do not apply: no archive move in P1. A15 does not apply: this repository adds no role receipts or hashes (AGENTS.md hashing policy).

## P2: Per-app CD workflows

**Risk: critical.** The phase changes production deploy files: the push path of 9 apps, the traffic mode of `accounts` and `workbooks`, and the move of every database step out of the push files (D1, D7). A wrong workflow can start a production build on an unplanned push. A wrong traffic file can leave a schema step out of the manual path. Task risk: 2.1 low, 2.2 high, 2.3 high, 2.3a/2.3b critical, 2.3c human gate, 2.3d/2.3e critical, 2.3f/2.3g critical, 2.3h human gate, 2.4 medium, 2.5 low, 2.6 human gate, 2.7 low.

`ROOT=/home/daniebo/Desktop/reading-advantage-monorepo`. `HEAVY` is the wrapper of section 1.1. P2 adds no hash (section 1.2). Every P2 test is an artifact test or the select-step dry run (section 1.3).

### P2.1 Contract assumptions that the spec leaves open

Red tests pin each assumption. A test that disagrees with the PM is a question (section 4), not a silent change.

- **C11 One select step, one filter.** Each CD workflow holds a job `select` with one step `id: select`. The step runs `node scripts/ci/affected-apps.mjs --base "$BASE_SHA" --head "$HEAD_SHA"`. It then reads `scripts/ci/apps.json` with `node` and appends two keys to `$GITHUB_OUTPUT`: `www=yes|no` and `matrix=<json array>`. The array holds one object per affected gated row: `{id, service, project, cloudbuild}`. The two select steps are equal after trimming (one filter text, two files). Neither step names an app id, a service, a project, or a tag prefix; the table is the source. (Q12)
- **C12 SHAs from the event.** The select step env binds `BASE_SHA: ${{ github.event.before }}` and `HEAD_SHA: ${{ github.sha }}`. A zero `before` reaches the script, and the script handles it (P1 C1 and P1 C6). The step passes no ref name.
- **C13 Job wiring.** `cd-www-reading-advantage.yml` has jobs `select` and `deploy`; `deploy` has `needs: select` and `if: needs.select.outputs.www == 'yes'`. `cd-apps.yml` has jobs `select` and `build`; `build` has `needs: select`, `if: needs.select.outputs.matrix != '[]'`, and `strategy.matrix.include: ${{ fromJSON(needs.select.outputs.matrix) }}`. The build job runs `gcloud builds submit --config="${{ matrix.cloudbuild }}" --project="${{ matrix.project }}" .`. (Q12)
- **C14 Node 22 on the runner.** Both CD workflows set up Node 22 (`actions/setup-node@v4`, `node-version: 22`) before the select step. Local Node is 24 (M9). The script uses no API that Node 22 lacks (P1 gate 7). (Q15)
- **C15 Full clone.** The checkout of both CD workflows sets `fetch-depth: 0`. The zero-base fallback needs `origin/master`; a shallow clone lacks the base (P1 case A6-06).
- **C16 Coarse path filters stay.** A workflow `paths:` filter is a cheap pre-filter, not the decision. `cd-www` keeps `apps/www-reading-advantage/**`, `packages/**`, and the root build files. `cd-apps` uses `apps/**`, `packages/**`, `services/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `.pnpmfile.cjs`, and `.dockerignore`. Neither filter holds `measure/**` or `docs/**`, so a docs push starts no CD workflow.
- **C17 One job per gated row.** The matrix holds only rows with `mode: "gated"` and an id in the script output. A `direct` row (`www`) is handled by `cd-www` only. An `excluded` row (`reading-advantage`) starts no job. The matrix ids are unique.
- **C18 No traffic move; the traffic files are manual.** No workflow names a `cloudbuild-traffic.yaml`. No workflow step holds `update-traffic` or `--to-latest`. The traffic step of each traffic file holds `update-traffic` and a substitution (`--to-revisions=<sub>` or `--to-tag=<sub>`), never a literal revision.
- **C19 Least privilege.** Each CD workflow declares `permissions:` with exactly `contents: read`. It declares no `id-token: write`, because the auth uses a JSON key and not OIDC. It declares no `pull_request_target`. `ci.yml` is P3's file and gets no block here. (Q16)
- **C20 Literal project for gated rows.** A gated row's `project` is the literal GCP project id that the job passes to `gcloud builds submit --project`. The default fills the measured project of each row (M42). A `direct` or `excluded` row may keep `$PROJECT_ID`. No new table key: P1 case B-21 asserts the exact key set. (Q10)
- **C21 Tag shape per row.** The four prefix rows (`primary-advantage`, `storytime`, `accounts`, `workbooks`) use a bash deploy step with `env: BUILD_ID=$BUILD_ID` and the tag `<prefix>-${BUILD_ID:0:8}`. The four file-tag rows keep their text: `candidate` (accounting, conditional on service existence), `sso-candidate` (codecamp), `c$${build_id%%-*}` (marketing), and `legacy-rollback` (sales). The table's `tag` and `tagLength` are the source; a change to one side changes the other in the same commit.
- **C22 Runbook append.** `docs/runbooks/storytime-deploy.md` already exists (M35) and holds none of the 7 facts. Task 2.5 appends a dated facts block; it does not rewrite the steps. The traffic-file facts live in one new runbook, `docs/runbooks/traffic-moves.md`, with one section per traffic file (6). (Q14, Q17)
- **C23 SHA-pinned actions.** Every `uses:` line of `cd-www-reading-advantage.yml` and `cd-apps.yml` names a 40-hex commit SHA, with the version in a trailing comment. A tag such as `@v4` fails W-22. The pin covers `actions/checkout`, `actions/setup-node`, `google-github-actions/auth`, and `google-github-actions/setup-gcloud`.
- **C24 Traffic runbook names the build.** Each section of `docs/runbooks/traffic-moves.md` names how the operator finds the tag or build after a push: the command and the field (for example `gcloud builds list --filter=...` and the `BUILD_ID`). F-18 fails a section without that text. (Q17)

### P2.2 Harness

Files, created by the Red roles: `scripts/ci/__tests__/cd-workflows.test.mjs` (task 2.1), `scripts/ci/__tests__/cloudbuild-files.test.mjs` (2.3a, 2.3d, 2.3f), and one support file `scripts/ci/__tests__/helpers/plan.mjs`. P1's `scratch.mjs` is reused and not edited.

- `FIXTURE_ROOT = process.env.CICD_FIXTURE_ROOT ?? ROOT`. The variable exists only for the mutation proof (P2.3). Green does not read it.
- `workflow(name)` parses `<FIXTURE_ROOT>/.github/workflows/<name>` with `yaml` 2.9.0 (M36). A missing file throws `Missing .github/workflows/<name>`.
- `allSteps(doc)` returns `{job, index, step}` for every step of every job. `selectStep(doc)` returns the step with `id === "select"` and throws `missing select step in <file>`.
- `runSelect(workflow, repo, base, head)` writes the step's `run:` text to a temp `.sh`, then runs `bash -e` with cwd `repo`, `BASE_SHA=<base>`, `HEAD_SHA=<head>`, `GITHUB_OUTPUT=<tmp>/out`, `PATH=<tmp>/bin:$PATH` (a stub `gcloud` that appends its args to a log and exits 0), and the hermetic git env of `scratch.mjs`. It returns `{status, outputs, gcloudCalls, stdout, stderr}`. `parseOutputs` reads `key=value` lines and rejects a line without `=`.
- `planRepo(range)` builds a scratch repository with `makeRepo(realPlanFiles())`, then commits the range with `commitChanges`. `realPlanFiles()` is `realWorkspaceFiles()` plus the table and script text read from `FIXTURE_ROOT`. The real table replaces the P1 fixture table.
- `tagFor(row)` returns `{text, length}`: for a prefix row `prefix + "-" + "x".repeat(8)`; for a file row the table's `tag`, with `$$` read as one `$`. `combined(row)` is `tagFor(row).length + row.service.length`.
- `deployStep(doc)` returns the step whose `args` hold `run` and `deploy`, or whose id starts with `deploy`. `stepIds(doc)` returns the ordered ids. `stepText(step)` joins `entrypoint`, `args`, and `env`.
- `dbToken(step)` applies the AC-2.10 rule. A step is a database step when its `secretEnv` holds a name with `DATABASE_URL`, or its text holds `cloud-sql-proxy`, `psql`, `drizzle`, `@reading-advantage/db`, `company-identity:`, or `bootstrap:production`. The runtime options `--set-secrets` and `--add-cloudsql-instances` are removed before the scan. It returns the matching token or `null`.
- `ordered(doc, expected)` finds each expected id and asserts the indexes rise; it asserts that the `update-traffic` step is last, and that `expected.length > 0` first.
- `runbookFacts()` returns 7 checker functions. The test asserts `facts.length === 7` before the loop.
- `usesLines(doc)` returns every `uses:` value. W-22 asserts each value matches `^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+@[0-9a-f]{40}$` and records `uses_lines_checked=<n>`.
- Every case ends with a labeled message: `rows_checked=8`, `files_checked=9`, `files_checked=4`, `files_checked=2`, `steps_checked=<n>`, `facts_found=<n>`, `jobs_planned=<n>`, `gated_jobs=<n>`, `gcloud_calls=0`, `max_combined=<n>`, `sales_db_steps_moved=<n>`, `mutants_rejected=<k>/<n>`.

### P2.3 Red: command, expected failure, and proof

**Red command (task 2.1, then 2.3a, 2.3d, 2.3f):**

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci; echo "EXIT=$?"'
```

**Measured at the P2 base before the first Red commit:** `EXIT=0`, `Test Files 2 passed (2)`, `Tests 52 passed (52)` (M37). That is the characterization baseline, not a Red result.

**Expected at the 2.1 Red commit:** `EXIT=1`; `cd-workflows.test.mjs` fails; `affected-apps.test.mjs` still passes 52. The failure messages:

| Case group | Message |
|---|---|
| W-01 to W-04 | `missing select step in .github/workflows/cd-www-reading-advantage.yml` |
| W-05 to W-09 | `missing .github/workflows/cd-apps.yml` |
| W-11, W-15 | `storytime tag combined=52 limit=46` and `tag expression missing` |
| W-14a | `permissions missing on .github/workflows/cd-www-reading-advantage.yml` |
| W-16 | `facts_found=0 expected=7` |
| W-18a, W-19, W-20 | `missing select step` and `missing fetch-depth: 0` |
| W-22 | `uses line is not a 40-hex SHA: actions/checkout@v4` |

Characterization passes at the 2.1 Red: W-10 and W-12 (the table math and the service agreement, M26), W-13 (AC-2.4, `workflow_detector_hits=0`, M34), W-14 (`secret_names=2`, M38), W-14c, W-17 (AC-2.8, `traffic_refs=0`, M34), and W-21 (the input-size guards).

**Expected at the 2.3a Red commit:** F-01 fails (`primary push file holds database steps: refuse-legacy-db,migrate-db,doctor-check`, M28); F-03 and F-04 fail (`missing apps/primary-advantage/cloudbuild-traffic.yaml`, M33). F-02 and F-05 pass (characterization: the guard rule on a fixture; no workflow traffic reference).

**Expected at the 2.3d Red commit:** F-06 fails (`accounts deploy step has no --no-traffic`, `workbooks deploy step has no --no-traffic`, M29/M30); F-08 fails (`files_with_db_steps=6 files_checked=9`); F-10 fails (`missing apps/accounts/cloudbuild-traffic.yaml`). F-07 and F-09 pass (characterization: the runtime flags stay; the detector fixtures).

**Expected at the 2.3f Red commit:** F-08 fails (`files_with_db_steps=4 files_checked=9`); F-11 fails (missing traffic files for the four apps); F-12 fails (`sales_db_steps_moved=0 expected=6`, M32); F-14 fails (`psql in a push file`). F-13 and F-15 pass (characterization: the sales push keeps its steps; the input-size guards).

**Expected at the r6 Red commit (W-22 and F-18, Red r6 writes them now):** W-22 fails with `uses line is not a 40-hex SHA: actions/checkout@v4` (the base holds 5 tag forms across the two CD workflows). F-18 fails with `missing docs/runbooks/traffic-moves.md` before 2.3g, and with `traffic runbook section <app> has no build-finding step` for each section that lacks the C24 text after 2.3g.

**Proof at Red time, partial repairs.** The Red role copies the real tree to a `mktemp -d` folder, edits one artifact, and runs the new file with `CICD_FIXTURE_ROOT=<copy>`. Each partial must still fail its case (6 partials, `partials_rejected=6`, `partials_accepted=0`):

| # | Partial edit | Case that must still fail |
|---|---|---|
| P-1 | add a `select` step that runs the script and writes nothing | W-01, W-05 |
| P-2 | add `--no-traffic` to the accounts deploy step and no tag | F-06 |
| P-3 | add a primary traffic file with `migrate-db` before `refuse-legacy-db` | F-03 |
| P-4 | add 6 of the 7 runbook facts | W-16 |
| P-5 | add `permissions: write-all` | W-14a |
| P-6 | add `--tag=st-$BUILD_ID` only as a comment | W-15 |

A partial repair passes when an assertion is loose text. These 6 prove that each assertion is specific.

### P2.4 Cases per acceptance check

Group W: `scripts/ci/__tests__/cd-workflows.test.mjs`.

| Case | Acceptance | Check | Expected after Green |
|---|---|---|---|
| W-01 | AC-2.1 | www-only range, dry run of the www select step | `www=yes`, `jobs_planned=1`, `gcloud_calls=0` |
| W-02 | AC-2.1 | docs-only range (`docs/a.md`, `measure/b.md`) | `www=no`, `jobs_planned=0`, `changed_files>=1` |
| W-03 | AC-2.1 | storytime-only range | `www=no`, `jobs_planned=0` |
| W-04 | AC-2.1 | `packages/read-along` only (www does not use it) | `www=no`, `jobs_planned=0` |
| W-05 | AC-2.2 | loop over the 8 gated rows; one app change each; `gated_rows=8` | one matrix object per range; id and `cloudbuild` match the row; `gcloud_calls=0` |
| W-06 | AC-2.2 | `apps/reading-advantage/...` change (excluded row) | `matrix=[]`, `jobs_planned=0` |
| W-07 | AC-2.2 | www change | `matrix=[]`, `jobs_planned=0` |
| W-08 | AC-2.2 | accounts and workbooks change in one range | `jobs_planned=2`; ids equal; unique |
| W-09 | AC-2.2 | every `--config` and `--project` in `cd-apps.yml` | both are expressions; `--config` equals `${{ matrix.cloudbuild }}` |
| W-10 | AC-2.3 | tag math over the 8 gated rows (M26) | `rows_checked=8`, `max_combined<=46`, `tagLength` equals the rule |
| W-11-primary | AC-2.3 | primary deploy step | tag `pa-` and `${BUILD_ID:0:8}`; `env` holds `BUILD_ID` |
| W-11-storytime | AC-2.3 | storytime deploy step | tag `st-` and `${BUILD_ID:0:8}`; `env` holds `BUILD_ID` |
| W-11-accounts | AC-2.3 | accounts deploy step | tag `ac-` and `${BUILD_ID:0:8}`; `env` holds `BUILD_ID` |
| W-11-workbooks | AC-2.3 | workbooks deploy step | tag `wb-` and `${BUILD_ID:0:8}`; `env` holds `BUILD_ID` |
| W-11-accounting | AC-2.3 | accounting deploy step | `--tag=candidate` in both branches (M31) |
| W-11-codecamp | AC-2.3 | codecamp deploy step | `--tag=sso-candidate` |
| W-11-marketing | AC-2.3 | marketing deploy step | `c$${build_id%%-*}`; the rendered tag is 9 characters |
| W-11-sales | AC-2.3 | sales deploy steps | `legacy-rollback` and `candidate` |
| W-12 | AC-2.3 | each deploy step's service name | equals `row.service`; `services_checked=8` |
| W-13 | AC-2.4 | every step text of every workflow | no `update-traffic`, no `--to-latest`; `workflow_detector_hits=0` |
| W-14 | AC-2.5 | union of `secrets.*` names in all workflows | exactly `GCP_SERVICE_ACCOUNT` and `GCP_PROJECT_ID` (M38) |
| W-14a | AC-2.5, C19 | `permissions` of `cd-www` | exactly `{contents: read}` |
| W-14b | AC-2.5, C19 | `permissions` of `cd-apps` | exactly `{contents: read}` |
| W-14c | AC-2.5 | trigger and secret placement | no `pull_request_target`; every `secrets.*` sits in a push-triggered job |
| W-15 | AC-4.1 | storytime with a 36-character build id | tag 11 plus service 13 = 24, `<=46`; prefix and slice present |
| W-16 | AC-4.2 | the 7 runbook facts of FR-4 | `facts_found=7`; `facts_expected=7` first |
| W-17 | AC-2.8 | every workflow text | no `cloudbuild-traffic`; `traffic_refs=0` |
| W-18a | C11, C14, C15 | `cd-www` plumbing | `fetch-depth: 0`; node 22; `BASE_SHA`/`HEAD_SHA`; script call |
| W-18b | C11, C14, C15 | `cd-apps` plumbing | same four facts |
| W-18c | C11 | the two select `run:` blocks | equal after trimming |
| W-19 | 2.2 | www deploy job | `gcloud builds submit --config=apps/www-reading-advantage/cloudbuild.yaml` equals the www row's file; both secrets kept |
| W-20 | 2.2 | www deploy job condition | `needs: select` and `if:` reference `steps.select.outputs.www` (the job `needs.select.outputs.www`) |
| W-21 | A4 | the input-size guards | `gated_rows=8`, `ranges>=6`, `rows_checked=8`; passes at the base |
| W-22 | C23 | every `uses:` line of the two CD workflows | a 40-hex SHA each; `uses_lines_checked>=4`; a tag fails |

Group F: `scripts/ci/__tests__/cloudbuild-files.test.mjs`.

| Case | Acceptance | Check | Expected after Green |
|---|---|---|---|
| F-01 | AC-2.6 | primary push file | `push_steps>=1`; no step id `refuse-legacy-db`, `migrate-db`, `doctor-check`; no DB token; `db_steps_found=0` |
| F-02 | AC-2.6 | the guard rule on a fixture | a DB step without `refuse-legacy-db` fails the rule; with it passes; `guard_rule_cases=2`; passes at the base |
| F-03 | AC-2.7 | primary traffic file | ids in order `refuse-legacy-db`, `migrate-db`, `doctor-check`, traffic; `--required-migration 0074_primary_help_events` kept; `steps_checked>=4` |
| F-04 | AC-2.7, C18 | the traffic step | `update-traffic` plus a substitution; no literal revision |
| F-05 | AC-2.8 | every workflow text | no traffic-file reference; passes at the base |
| F-06 | AC-2.9 | accounts and workbooks deploy steps | `files_checked=2`; `--no-traffic`; tag `ac-`/`wb-` plus 8 characters; no `update-traffic` |
| F-07 | AC-2.9 | the runtime flags of the two deploy steps | `--service-account`, `--set-secrets`, `--add-cloudsql-instances` kept; passes at the base |
| F-08 | AC-2.10 | the 9 non-excluded push files | `files_checked=9`; `steps>=1` each; `database_steps_found=0` |
| F-09 | AC-2.10 | the detector fixtures | `--set-secrets=DATABASE_URL=...` and `--add-cloudsql-instances` pass; `psql` fails; `fixtures=3`; passes at the base |
| F-10 | AC-2.11 | accounts traffic file | `migrate-company-identity`, `bootstrap-company-identity`, `doctor-company-identity`, `bootstrap-production-identity`, `runtime-db-contract`, traffic; a guard has the lowest index; `steps_checked>=6` |
| F-11 | AC-2.12 | the 4 apps | `files_checked=4`; no DB step in each push file; each traffic file holds its expected ordered list (M28 to M32) |
| F-12 | AC-2.12 | sales | `sales_db_steps_moved=6`; each of the 6 is in the traffic file and absent from the push file; the guard is first; `build-curriculum-workspace-deps` precedes `seed-production-curriculum`; `capture-legacy-rollback` precedes `verify-repair-verify-legacy-rollback` |
| F-13 | AC-2.12 | the sales push keeps its steps | `validate-release-inputs`, build, push, both deploys, `allow-public-invoker`, `capture-company-candidate`, `verify-company-candidate`; both deploys `--no-traffic`; passes at the base |
| F-14 | AC-2.10 | no `psql` in a non-excluded push file | `psql_hits=0` |
| F-15 | A4 | the input-size guards | `files_checked=4`, `steps_expected=6`, `files_checked=2` |
| F-16 | C22 | `docs/runbooks/traffic-moves.md` | 6 sections, one per traffic file; each names the file, the ordered steps, and the old-schema sentence; `traffic_runbook_sections=6` |
| F-18 | C24 | each of the 6 traffic runbook sections | names the build-finding command and field after a push; `sections_checked=6` |

Counts: about 48 P2 cases. The phase gate runs 52 P1 cases plus the P2 cases.

### P2.5 Green gates and the phase check

Each Green task runs its subset with a name filter. The command is the P1.3 wrapper:

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci/__tests__/<file> -t "<pattern>"; echo "EXIT=$?"'
```

| Task | Green gate |
|---|---|
| 2.2 | W-01 to W-04, W-14a, W-18a, W-19, W-20; `cd-www` holds `select` and `deploy`; `fetch-depth: 0`; node 22; `permissions` exactly `contents: read`; the build still targets the www file; `yaml_ok=<n>`; no test edit |
| 2.3 | W-05 to W-09, W-14b, W-18b, W-18c, W-22; `cd-apps.yml` parses; the matrix holds only gated rows; `gcloud_calls=0`; no traffic-file reference; no test edit |
| 2.3b | F-01 to F-04 and W-11-primary; the primary push ids are `build-image`, `push-image`, `deploy-cloudrun`; the deploy step holds `--no-traffic`, `pa-`, `${BUILD_ID:0:8}`, and `env`; `yaml_ok`; `schema_note_found=1` |
| 2.3e | F-06, F-07, F-09, F-10 and W-11-accounts, W-11-workbooks; the accounts push ids are `build-image`, `push-image`, `deploy-cloudrun`, `allow-public-invoker`; the workbooks push ids are `build-image`, `push-image`, `deploy-cloudrun`; the accounts traffic file holds the 5 steps and the move; `yaml_ok` |
| 2.3g | F-08, F-11 to F-16, F-18 and W-11-accounting, W-11-codecamp, W-11-marketing, W-11-sales; the four push ids match the expected lists; the four traffic files parse; `sales_db_steps_moved=6` |
| 2.4 | W-15 and W-11-storytime; the tag renders 11 plus 13 = 24; `yaml_ok`; no test edit |
| 2.5 | W-16 `facts_found=7`; the runbook diff adds a block; no test edit |
| 2.3c, 2.3h, 2.6 | `[b] ... deferred:daniel`; no automated test. The phase check asserts the marker and the owner field |

Every Green gate also runs `git diff --stat <red_commit>..HEAD -- scripts/ci/__tests__/<file>`; the output must be empty. Green never edits a test to pass.

**Guard runs (P2, P3, and P4 phase gates).** Green `a8eeaf793` broke `apps/storytime/__tests__/phase1-service.test.ts`, because the phase gates ran only `scripts/ci`. From now on every phase gate also runs the tests that read a file the track changes. Red r5 (P2, 2026-11-07) measured the list, the runner, and the counts. Each row is one heavy job, in the foreground, one at a time. Prefix each inner command with the wrapper of section 1.1 and `cd /home/daniebo/Desktop/reading-advantage-monorepo &&`; read the `EXIT=` line.

| App or package | Inner command (Vitest for every row) | Expected at the gate (Red r5 baseline) |
|---|---|---|
| storytime | `CI=true pnpm exec vitest run --maxWorkers=1 apps/storytime/__tests__/phase1-service.test.ts apps/storytime/__tests__/phase3-media-gate.test.ts; echo "EXIT=$?"` | 0 failed; the r5 app count is 17 passed across 3 files |
| packages/db | `CI=true pnpm exec vitest run --maxWorkers=1 packages/db/src/__tests__/primary-deploy-gate-contract.test.ts packages/db/src/__tests__/deploy-gate-contract.test.ts packages/db/src/__tests__/codecamp-0049-ledger-gap-deploy-contract.test.ts; echo "EXIT=$?"` | 29 tests: 28 passed; 1 known failure (`codecamp-0049` ceiling) |
| accounting | `CI=true pnpm exec vitest run --maxWorkers=1 apps/accounting/app/lib/__tests__/cloudbuild.red.test.ts apps/accounting/app/lib/__tests__/release-verifier.red.test.ts; echo "EXIT=$?"` | 2 files, 18 passed, 0 failed |
| accounts | `CI=true pnpm exec vitest run --maxWorkers=1 apps/accounts/scripts/production-readiness.test.ts; echo "EXIT=$?"` | 1 file, 9 passed, 0 failed |
| marketing | `CI=true pnpm exec vitest run --maxWorkers=1 apps/marketing/app/__tests__/production-readiness.test.ts apps/marketing/scripts/marketing-staged-release-contract.test.ts; echo "EXIT=$?"` | 2 files, 15 passed, 0 failed |
| packages/domain | `CI=true pnpm exec vitest run --maxWorkers=1 packages/domain/src/primary-books/__tests__/catalogue-build-contract.test.ts; echo "EXIT=$?"` | 1 file, 10 passed, 0 failed |
| sales-advantage | `CI=true pnpm exec vitest run --maxWorkers=1 apps/sales-advantage/scripts/production-readiness.test.ts apps/sales-advantage/scripts/sales-continuation.test.ts apps/sales-advantage/scripts/sales-release-source.test.ts apps/sales-advantage/scripts/__tests__/cloudbuild-secret-isolation.test.ts; echo "EXIT=$?"` | r5: 27 passed, 2 failed. The gate needs 28 passed, 1 failed: the 2 D7 failures are fixed; the remaining 1 is the sales approval known failure (item 4) |
| codecamp-advantage | `CI=true pnpm exec vitest run --maxWorkers=1 apps/codecamp-advantage/lib/__tests__/auth-rollback-deployment.test.ts apps/codecamp-advantage/lib/__tests__/cold-start-optimization.test.ts apps/codecamp-advantage/lib/__tests__/_helpers/cloudbuild-parser.test.ts apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-10-edge-cases-and-production-scenarios.test.ts apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-2-database-and-configuration.test.ts apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-3-authentication-and-authorization.test.ts apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-8-5-deployment-gate.test.ts apps/codecamp-advantage/lib/__tests__/review-worker-deployment-contract.test.ts; echo "EXIT=$?"` | 8 files, 133 tests: 131 passed; 2 known failures |

**Known failures (4).** They fail at `d28f8fd52` too; item 4 failed then on an earlier assertion. The gate records `known_failures=4`; a fifth failure fails the gate:

1. `packages/db` `codecamp-0049-ledger-gap-deploy-contract.test.ts` case "bounds the Codecamp migration step to 0049" (the file holds `0059_game_challenges`).
2. codecamp `prod-smoke/phase-10` "auth session schema pins the DB session lifetime to 7 days".
3. codecamp `prod-smoke/phase-10` launch gate.
4. sales-advantage `production-readiness.test.ts` case "seeds only deterministic approved curriculum and gates exact completeness" (Red r7, `7cc94da8a`). It fails on `releaseCandidate.approval`, because `apps/sales-advantage/curriculum/release-candidate.json` holds `status: "awaiting_human_review"` (last change `4394c28c0`, 2026-10-17). This track never changed that file. It is a human review gate of the sales curriculum, outside this track. Before the D7 split, the case failed earlier on the cloudbuild slice, so the failure was hidden.

**Adversarial mutant set (task 2.7).** The adversarial role copies the real tree and applies each mutant with `CICD_FIXTURE_ROOT`. Each mutant must make at least one case fail. Label `mutants_rejected=12/12`; closeout needs 12/12.

| # | Mutant | Case that must fail |
|---|---|---|
| X1 | drop the `if` on the www deploy job | W-01, W-20 |
| X2 | plan every row (drop the excluded filter) | W-06 |
| X3 | plan no gated job | W-05, W-08 |
| X4 | add `update-traffic` to `cd-apps.yml` | W-13, F-05 |
| X5 | remove `fetch-depth: 0` | W-18a, W-18b |
| X6 | drop `--no-traffic` from the accounts deploy | F-06 |
| X7 | put `migrate-db` back into the primary push file | F-01 |
| X8 | put the accounts traffic move before `runtime-db-contract` | F-10 |
| X9 | add `psql` to a deploy step | F-08, F-14 |
| X10 | set the storytime tag to `st-$BUILD_ID` | W-15 |
| X11 | drop `env: BUILD_ID` from the primary deploy step | W-11-primary |
| X12 | point the www job at the gated matrix | W-01, W-19 |

**Phase check (task 2.7).** The orchestrator runs it; no role edits a file to pass it.

1. The P1.3 command at the phase HEAD: `EXIT=0`; `Test Files 4 passed (4)`; `Tests <52+P2> passed`; failed 0; skipped 0.
2. `git diff --stat <p1_green>..HEAD -- scripts/ci/affected-apps.mjs` prints nothing. The table may change only the `project` text (C20); the key set and the row count stay (P1 case B-21 passes).
3. `git log <phase_base_sha>..HEAD --grep='track_id: per_app_cicd_20261107'` lists the commits in this order: 2.1 Red, 2.2 Green, 2.3 Green, 2.3a Red, 2.3b Green, 2.3d Red, 2.3e Green, 2.3f Red, 2.3g Green, 2.4 Green, 2.5 Green. Each header is 100 characters or less.
4. The 2.1 Red commit, checked out alone, runs red with the messages of P2.3; the P1 file passes 52.
5. `yaml_ok=<n>` for every changed workflow and `cloudbuild` file; the parse exits 0.
6. Detectors: `rg -n 'update-traffic|--to-latest' .github/workflows` exits 1; `rg -n 'cloudbuild-traffic' .github/workflows` exits 1; the DB-token detector over the 9 push files exits 1; `rg -n --pcre2 'secrets\.(?!GCP_SERVICE_ACCOUNT|GCP_PROJECT_ID)' .github/workflows` exits 1; the `permissions` deep-equal check passes; no `pull_request_target`. Each detector is proven on a scratch file that must hit (A14).
7. `p2_out_of_scope_paths=0` over `.github/workflows/**`, `apps/*/cloudbuild*.yaml`, `docs/runbooks/**`, `scripts/ci/**`, `measure/tracks/per_app_cicd_20261107/**`, `measure/runs/per_app_cicd_20261107/**`.
8. No dependency file changed by the P2 commits: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `.pnpmfile.cjs`.
9. `git worktree list | wc -l` prints 8 (M15 and A16).
10. The adversarial mutant set above reports `mutants_rejected=12/12`.
11. Review A, Review B, and Review C results are `pass`. The browser review is `not applicable`.
12. Tasks 2.3c, 2.3h, and 2.6 stay `[b] ... deferred:daniel`. They are not part of the closeout. The check asserts `blocked_tasks=3` and the owner field on each.
13. The 8 guard runs above: `known_failures=4`, `other_failures=0`, and the sales command reports 28 passed and 1 failed.

Then the orchestrator appends `[checkpoint: <sha>]` to the Phase 2 heading.

### P2.6 Document tests and live tests

- **Artifact:** every W and F case except the select-step dry run. They read the files. They prove no Cloud Build or GitHub behavior.
- **Function-level (dry run):** `runSelect` runs the real script and the real step text on a scratch git repository. It proves the step plumbing, the outputs, and the zero `gcloud` calls. It does not evaluate the GitHub expressions (`fromJSON`, `if`), the runner, or the auth.
- **Documentation:** W-16 (the storytime runbook) and F-16 (the traffic runbook). They prove the text, not that a person follows it.
- **Live:** only the first push (P4, Daniel) and the traffic runs (2.3c, 2.3h, Daniel). No test fakes a build.
- **Not proven:** that Cloud Build accepts an edited file; that the tag stays within 46 at run time; that the new Primary revision starts against the old schema; that the GitHub service account can submit in `primary-advantage` (M40). The report states each limit.

### P2.7 Review applicability and anti-patterns

| Review | Applies | Checks |
|---|---|---|
| Review A (code) | **yes** | C11 to C22; the YAML parse instead of substring matching; the table as the only source of app facts; the step-id dependencies; the traffic-file order; the bash slice and `env: BUILD_ID`; the scope. |
| Review B (secrets, permissions) | **yes (required)** | `permissions` exactly `contents: read` on the two CD workflows; the two secret names and nothing else; no secret outside a push-triggered job; no `pull_request_target`; no secret on a fork run; the measured roles (M39 to M41) and the three gaps (primary-advantage binding, `workbooks-cloud-run`, the two-project ambiguity); no push path touches a production database; the traffic files have no trigger and no workflow reference. B1 (M43): the www deploy key held `editor`, `run.admin`, `storage.admin`, and `serviceAccountUser`; Daniel reduced the roles on 2026-11-07 with no repository change. P4 proves that the reduced key still deploys. |
| Review C (UX/API) | **yes** | The tag names, the job names, the traffic-file contract, and the runbook text. The text is plain and one meaning per word. There is no screen. |
| Adversarial testing | **yes** | The 12 mutants of P2.5; a fork PR (no secret); a zero base; a base that the clone lacks after a force push; a comment that names `cloudbuild-traffic`. |
| Browser review (UX) | **no** | No UI. |

Anti-pattern coverage:

| ID | Defense in this phase | Falsification condition |
|---|---|---|
| A1 | The supervisor reads the markers. Tasks 2.3c, 2.3h, and 2.6 are `[b] ... deferred:daniel`; no free-text "deferred" stands in for a marker. The phase check counts `blocked_tasks=3` and requires the owner field on each. | A `[b]` task without `deferred:daniel`, or a `[ ]` task whose prose says "deferred", counts as blocked. |
| A3 | Every count is a labeled integer: `rows_checked`, `files_checked`, `steps_checked`, `facts_found`, `jobs_planned`, `gated_jobs`, `gcloud_calls`, `max_combined`, `sales_db_steps_moved`, `mutants_rejected`, `traffic_runbook_sections`, `services_checked`. The check parses the integer after the label. | A bare number or a date passes a count check. |
| A4 | Every loop asserts its input first: `gated_rows=8` before the tag and matrix loops, `files_checked=4` before the four-app loop, `files_checked=2` before the accounts/workbooks loop, `facts_expected=7` before the runbook loop, `steps_expected>=4` before an order check. W-02 and W-06 assert `changed_files>=1` before they accept an empty plan. | A loop over zero rows, zero files, or an empty range exits 0 and reports pass. |
| A5 | The plan notes of 2.3b, 2.3e, and 2.3g quote the step names they moved, the exit code, and the labels. No note says that a Cloud Build run succeeded or that traffic moved. | A note claims a build or deploy result that the phase did not produce. |
| A6 | The 2.5 runbook block says the 7 facts are of 2026-11-07. Neither the runbook nor the plan says the tag fix is deployed or that traffic moved. | The runbook or the plan says the fix is live. |
| A7 | The DB-token detector matches the 7 named tokens and must not flag `--set-secrets` or `--add-cloudsql-instances` (F-09). The tag test matches the deploy step and not a comment (P-6). The project/secrets test matches whole names, not substrings. | The detector misses a `psql` step, flags `--set-secrets`, or accepts a comment as the tag. |
| A8 | The plan uses `[~x]` and `[b]` only. The three human gates are `[b]`. | A P2 task uses `[ ]` with prose that says "blocked". |
| A9 | No test reads a path under `measure/tracks/` or `measure/archive/` as data. Detector: `rg -n '(readFile|readFileSync|existsSync)[^;]*measure/' scripts/ci/__tests__` exits 1. The runbook path is `docs/runbooks/`, which is allowed. | A test reads a `measure/` file as data. |
| A10 | Does not apply: P2 generates no facts file. | A generated facts file appears in the phase scope. |
| A11 | Review A, Review B, and Review C run after task 2.7 and report a result. The plan does not leave them `[b] deferred:review-execution`. | The phase closes while a review has no result. |
| A12, A13 | Do not apply: no catalog guard reference changes, and no archive move in P2. | A guard reference dangles, or a track directory moves. |
| A14 | Detectors use `rg -n '<regex>'`; `--pcre2` only where the pattern needs it. Exit 2 is a failure, not a pass. Each detector is proven on a scratch file that must hit. | A bad option reports no hit and the gate passes. |
| A15 | Does not apply: this repository adds no role receipts or hashes. | A receipt hash or a checksum field appears. |
| A16 | Scratch folders are under `/tmp`. `git worktree list \| wc -l` still prints 8. | The worktree count changes. |

A2 does not apply: P2 holds no publish gate with named subjects; the traffic move is a deploy gate and has its own guards (AC-2.4, C18, 2.3c/2.3h).

**`phase_base_sha`.** The orchestrator captures it with `git rev-parse HEAD` immediately after the commit of this strategy and before the first P2 Red commit. `390bcb684237d0ed9bde78682a2d3e06493cb0d3` is the role base of this section. It predates this strategy commit and is not the immutable base. Verify the capture with `git cat-file -e <sha>:measure/tracks/per_app_cicd_20261107/test-strategy.md`.

## P3: CI for the affected apps (outline)

**Risk: medium.** The phase edits CI only. It changes no deploy file. A wrong filter can skip a check (a quality risk) but cannot deploy. The repository-wide guards must keep running.

- **Red command:** the P1.3 command. File: `ci-workflow.test.mjs` (3.1). Expected at the base: `ci.yml` holds no `affected-apps.mjs` call and no `--filter=` run, so the planned-set cases fail. The case "the repository-wide guards still run" passes at the base (characterization).
- **Green gates:** the Red command exits 0 with every file passing; AC-3.1 holds for each fake range of P1 (the planned app set of the `ci.yml` select step equals the script output, `ranges_checked>=6`); AC-3.2 (docs-only range plans no app job and keeps the guards that its paths trigger); the filter syntax is valid for every table id: `pnpm exec turbo ls --filter=<id>...` exits 0 and lists at least 1 package for each of the 10 ids, label `turbo_filters_ok=10` (not measured at the base, M14); YAML parses.
- **Non-table apps (M21, Q9).** The nine non-excluded rows get a job. `activity-vinext-fixture`, `advantage-games`, and `science-advantage` are not rows, so a change to one of them plans no app job. The phase test asserts this behavior (it is the spec, not a bug), and task 3.2 records the gap in one line of the plan note: `untested_apps=3` with the three names. A test that silently widens the filter to every app fails AC-3.1.
- **Closeout gate (task 3.4).** The Green gates again at the phase HEAD; one Red commit and one Green commit for task 3.1/3.2, in that order; `git log <phase_base_sha>..HEAD --grep='track_id: per_app_cicd_20261107'` inspected the same way; Review A and Review B results are `pass`; the scope label `p3_out_of_scope_paths=0` over `.github/workflows/ci.yml`, `scripts/ci/**`, `measure/tracks/per_app_cicd_20261107/**`, `measure/runs/per_app_cicd_20261107/**`; `ci_first_failing_step` is recorded. Then the orchestrator appends `[checkpoint: <sha>]` to the Phase 3 heading.
- **Guard runs (P3 gate).** The 8 commands of P2.5 again, one heavy job each. P3 changes `ci.yml`, so the gate also runs the 4 `apps/science-advantage/lib/ci-gates/` files that read `.github/workflows/**`: `phase-10-monorepo-root-ci-paths-filter.test.ts`, `phase-13-final-acceptance.test.ts`, `phase-9-delete-app-local-ci-workflow.test.ts`, and `verification-partition.test.ts`. One heavy job, expected 0 failed; the count is recorded at the gate (not measured in this role). `known_failures=4`; a fifth failure fails the gate.
- **Sales build identity contract (P3).** `apps/sales-advantage/cloudbuild-traffic.yaml` must name the same build in the rollback capture step and in the traffic target: the `BUILD_ID` and image that `capture-legacy-rollback` records equal the revision that `update-traffic` targets. A P3 test asserts the equality, label `sales_build_identity=1`, before any sales traffic run (task 2.3h). A mismatch blocks 2.3h.
- **Task 3.3:** record the first failing step of the latest `ci.yml` run on master with a read-only `gh run list` and `gh run view --log-failed` (a read, not a run). Label: `ci_first_failing_step=<step name>`. The expected step is `Architecture boundary check` (`pnpm architecture:check`, exit 1, "Analyzer input snapshot hash does not match current bytes", per the plan). The role does not fix it (D5).
- **Document vs live:** artifact tests plus the select-step dry run. Live proof is the first push and the CI run that follows. CI stays red until the later CI-green track.
- **Reviews:** A yes; B yes (the service containers and test credentials only; no deploy secret in `ci.yml`; the `permissions:` block, M20); C no; adversarial yes, light (one mutant round: drop the guards, run all apps on a docs range, ignore a failed select step); browser no.
- Anti-pattern coverage:

  | ID | Defense in this phase | Falsification condition |
  |---|---|---|
  | A3 | `ranges_checked`, `turbo_filters_ok=10`, `untested_apps=3`, `ci_first_failing_step=<name>` are labeled. | A count without its label passes. |
  | A4 | A docs-only case asserts `changed_files>=1` before it accepts "no app job". The guard-kept case asserts the guard job list is not empty. | An empty range or an empty guard list passes as a green docs case. |
  | A5 | The plan note quotes the first failing step text exactly; it never says "CI green". | The note says CI passes. |
  | A6 | The registry and plan note say CI is red and name the failing step (D5). | A note says the red state is fixed by this track. |
  | A7 | The planned set is compared as a set of ids, not as a substring of the workflow text. A mutant that plans every app for a docs range fails AC-3.2. | A substring match lets an extra app pass. |
  | A9 | No test reads a `measure/` path. | A test reads `measure/tracks/...` as data. |
  | A14 | Every detector is proven on a scratch file that must hit. | A bad-option detector reports no hit. |
  | A16 | Scratch repos under `/tmp`; `git worktree list \| wc -l` still prints 8. | The worktree count changes. |

## P4: Dry runs, www proof, and the first-push plan (outline)

**Risk: high.** No deploy happens in the phase, but its report and its plan lead directly to a push that deploys www to traffic. The www build and test at the pushed HEAD is the only proof that the pending commits build (207 at the round-2 check, M11; the phase measures the count again at its own HEAD).

- **Dry run:** `act` is not installed (M8). The dry run is the select-step runner of P2 and P3 over each workflow and each fake range, with no secret and no deploy. The report `dry-run-report.md` has one row per table app (10) and one row for CI (`rows=11`, AC-5.1).
- **Red:** the report test, run with the P1.3 command, fails at the base because the report is missing (`Missing dry-run-report.md`) and passes after task 4.1. Task 4.2 has no Red (it is a run). Expected failure shape for 4.2 if www does not build: the first failing task from `turbo`.
- **Green gates:** AC-5.1 (`rows=11`, each row names its range, its planned jobs, and `gcloud_calls=0`); AC-5.2: `HEAVY … 'cd ROOT && CI=true pnpm exec turbo run build test --filter=www-reading-advantage...; echo "EXIT=$?"'` gives `EXIT=0` at the HEAD that the report names (label `www_head=<sha>`; the heavy job takes long and one job runs at a time); AC-5.3: the plan line names exactly the ids that the script returns for `origin/master..HEAD`, computed at the report HEAD; no `gcloud` write and no change to a Cloud Build trigger happened (`gcloud builds triggers list` read only).
- AC-5.2 is the one aggregate run that gates a phase (section 1.1). If `www` is red, the phase stops: the report names the first failing task and the failing test, and the first push does not happen.
- **Guard runs (P4 gate).** The 8 commands of P2.5 again, one heavy job each, plus the report test. `known_failures=4`; a fifth failure fails the gate.
- **B1 live proof (M43).** The P4 www dry run is the live proof that the reduced www deploy key still deploys. The workflow uses the `GCP_SERVICE_ACCOUNT` secret, and AC-5.2 must pass with the reduced roles. A failure here blocks the first push.
- **Closeout gate (task 4.4).** The Green gates again at the report HEAD; the report and the plan line read from the same immutable HEAD (`www_head` equals the HEAD that the plan uses); the adversarial round of the Reviews bullet passes (`mutants_rejected=n/n`); Review A, Review B, and Review C results are `pass`; the scope label `p4_out_of_scope_paths=0` over `measure/tracks/per_app_cicd_20261107/**` and `measure/runs/per_app_cicd_20261107/**`; the handoff to the PM names the raw truth: which apps the push deploys, which stay gated, and that Daniel decides (AC-5.4). Then the orchestrator appends `[checkpoint: <sha>]` to the Phase 4 heading. The first push (`[b]` 4.5) and every traffic move (`[b]` 4.6) stay blocked after the checkpoint; they are not part of the closeout.
- **Predicted plan at the base:** all 10 ids affected (M12). The non-excluded rows deploy: `www-reading-advantage` to traffic (direct) and 8 gated apps as `--no-traffic` revisions with a tag; `reading-advantage` is skipped (`excluded`). The report states this in one line, with the app names, and keeps the deploy list (round 2: the orchestrator sent Q7 to the PM; Daniel decides at AC-5.4). The role does not narrow the list on its own.
- **Document vs live:** the dry run and the report are artifact and function-level proof. Live proof is the first push on Daniel's word (`[b] deferred:daniel`) and every traffic move.
- **Reviews:** A yes; B yes (final check of workflow permissions, secrets, and roles against the dry-run report); C yes (the report and the push plan: plain words, one row per app, the deploy list); **adversarial yes**: a force-pushed base that the runner lacks, a zero base on a new branch, a push with only `measure/` files, and a workflow run on a pull request from a fork (no secret). Browser: no.
- Anti-pattern coverage:

  | ID | Defense in this phase | Falsification condition |
  |---|---|---|
  | A3 | `rows=11`, `www_head=<sha>`, `gcloud_calls=0`, `mutants_rejected=n/n` are labeled. | A count without its label passes. |
  | A4 | The plan line asserts at least 1 id before it names them; a plan with zero ids needs a stated reason and fails the gate. Each report row asserts its range count is 1. | A plan with zero ids passes, or a report row without a range passes. |
  | A5 | The report quotes the exit code of every command it cites, including the failing `turbo` task. | A row says "pass" with no exit code. |
  | A6 | The report and the plan claim no deploy, no traffic move, and no CI fix. | The report says a deploy or a CI fix happened. |
  | A9 | No test or report reads a `measure/` path as proof input. | A report row cites a `measure/` file as its evidence. |
  | A14 | Every detector is proven on a scratch file that must hit. | A bad-option detector reports no hit. |
  | A16 | Scratch folders under `/tmp`; `git worktree list \| wc -l` still prints 8. | The worktree count changes. |

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
| Q7 | The pending range changes the global key `verifyDepsBeforeRun` of `pnpm-workspace.yaml` (M12). Under D4 the first push then affects all 10 rows: www deploys to traffic and 8 gated apps build. Do you keep D4 literal for that push? | **Answered by the PM on 2026-11-07: yes, no change.** The role does not change D4. Phase 4 keeps its deploy list, and Daniel decides the first push at AC-5.4. |
| Q8 | The root has no ESLint config and no `tsconfig` for `scripts/`. The plan names `tsc` and ESLint for the new files. | The gate is `node --check` of the script and the tests, plus the detectors of P1.5 gate 3 to 6. `tsc --checkJs` is optional and advisory. The Green role records the exit code of any optional run. |
| Q9 | Three apps are not table rows: `activity-vinext-fixture`, `advantage-games` (package name `vocabulary-games`), and `science-advantage` (M21). A change to one of them returns `[]`, so Phase 3 plans no app job for it. May the table grow to 13 rows, or may `ci.yml` fall back to a whole-repo check for those paths? | **Keep the spec: 10 rows.** The table is the one source, and the excluded row rule stays. Task 3.2 records the gap in one line (`untested_apps=3` with the three names), and the Phase 3 report sends it to the PM as a follow-up for the CI-green track. The role does not widen the filter. |
| Q10 | The table gives `project: $PROJECT_ID` on 8 rows, but the measured services live in two projects: www in `www-reading-advantage` and the six gated apps in `reading-advantage` (M41). One `GCP_PROJECT_ID` secret cannot select both. How does a gated job resolve its project? | **Literal project on the gated rows.** P2 changes `project` on the 8 gated rows to the measured project (`reading-advantage` on 6, `primary-advantage` on 2). `www` and `reading-advantage` keep `$PROJECT_ID`. `cd-apps.yml` passes `--project="${{ matrix.project }}"`; `cd-www` keeps `GCP_PROJECT_ID`. No new table key, so P1 case B-21 stays green. The PM may instead add a second project secret; that answer changes the 2.3 Green. |
| Q11 | AC-2.5 measured three gaps. `workbooks-cloud-run` does not exist (M41). No candidate service account holds a project-level binding in `primary-advantage` (M40). The `project: $PROJECT_ID` text hides a second project (Q10). The spec says an app with a missing secret or role stays out of the table. Removing rows breaks the 10-row and 8-gated-row counts of P1 case B-21 and AC-2.3. | **Keep all 10 rows.** Task 2.6 stays `[b] ... deferred:daniel`. The Phase 2 report names the three gaps. A job whose role is missing fails closed (no deploy) until Daniel adds the role. The tag and `--no-traffic` text still land. The PM decides if a row must leave the table; that answer reopens P1 case B-21 and AC-2.3. |
| Q12 | The select step id, the job names, and the output names are consumed by the tests and by the job `if` and matrix. The spec does not name them. | `id: select`; jobs `select` and `deploy` (`cd-www`), `select` and `build` (`cd-apps`); outputs `www` (`yes`/`no`) and `matrix` (a JSON array of `{id, service, project, cloudbuild}`). A rename is a contract change: the workflow and the test change in one commit. |
| Q13 | AC-2.2 says a gated job runs "with `--no-traffic` and a tag". The flag lives in the app's `cloudbuild` file, not in the workflow. The plan runs task 2.3 (workflow) before 2.3d and 2.3e (files). | **Split the assertion.** The 2.3 gate checks the planned job, the `--config` from the table, and `gcloud_calls=0`. The 2.3d/2.3e gate checks `--no-traffic` and the tag in the file. The phase gate needs both. |
| Q14 | `docs/runbooks/storytime-deploy.md` exists and holds none of the 7 FR-4 facts (M35). Does task 2.5 rewrite it? | **Append.** Task 2.5 adds a dated "Facts (2026-11-07)" block. The existing steps stay. The test counts the 7 fact patterns and does not require a rewrite. |
| Q15 | `cd-www` sets up no Node today. The select step needs `node`. | Both CD workflows add `actions/setup-node@v4` with `node-version: 22`, the same as `ci.yml`. A test asserts it. |
| Q16 | `ci.yml` declares no `permissions:` block (M20). Does P2 add one? | **No.** P2 adds `permissions: contents: read` to the two CD workflows only. `ci.yml` is P3's file. |
| Q17 | Tasks 2.3b, 2.3e, and 2.3g say "record in the runbook" and "the runbook of each app". Only `docs/runbooks/storytime-deploy.md` exists. Six new files is churn. | **One new runbook:** `docs/runbooks/traffic-moves.md`, with one section per traffic file (6). Each section names the file, the ordered steps, and the old-schema sentence. Test F-16 counts the sections. |

## 5. Independent check (round 2)

- **Model:** opencode-go/deepseek-v4.1-flash, a family different from the writer of round 1 (claude-code/claude-sonnet-5-5). Role base `c4890971f4c99bbe74ba052722938e29c6700371`; plan task 1.1.
- **Method:** each "measured" fact of section 2 was read again from the tree, with a targeted grep, a read, or `git`. One heavy job ran: the P1.3 Vitest command through the wrapper. No fact was taken from the round-1 text.
- **Re-measured and confirmed:** the Vitest behavior and version (M1, M2, `EXIT=1`); the two YAML parsers and their versions (M3); the four workspace globs, 48 packages, and the closures (M4, M5); the single non-ASCII path and the git defaults (M6); the root files (M7); the absent tools `act` and `actionlint` (M8); Node versions (M9); the Dockerfile `COPY` sets (M10); the worktree count (M15); the app table of spec section 2 and the tag lengths of section 2a; one real range per case of task 1.4; the two workflow files.
- **Differences recorded:** the commit count is 207, not 198 (M11), and the range file counts moved with it (M12). `packages/utils` also reaches `@reading-advantage/ui` (M5). The lockfile diff is unchanged at 88/101.
- **New facts:** accounting deploys `--no-traffic` only when the service exists (M16/M17); `cloudbuild.continue-f5063222.yaml` holds `update-traffic`, so the AC-2.4 detector is workflow-scoped (M18); four gated rows keep tags that do not follow `<prefix>-<8>` (M19); neither workflow declares `permissions:` (M20); three apps are not rows and get no CI job (M21); `ci.yml` already sets `fetch-depth: 0` and `cd-www` does not (M22).
- **Changes to this file (7):**
  1. Header names the round-2 model and base.
  2. Section 1.1 gains the intentionally-red aggregate-suite rules, with AC-5.2 as the one gating aggregate run.
  3. Section 1.4 gives the exact `phase_base_sha` capture point and voids any SHA that predates the committed strategy.
  4. Section 1.5 (new) lists the architecture guardrails and the four changed-contract risks.
  5. Section 2 gains M16 to M22, and M5, M11, and M12 are corrected.
  6. P1.5 becomes an explicit closeout gate; P1.7 gains A6 and exact non-applicability reasons.
  7. P2, P3, and P4 gain explicit closeout gates, the tag and detector nuances of M17 to M20, and per-phase anti-pattern tables with a falsification condition per row.
- **Not changed:** the Red command, the harness of P1.2, the case table of P1.4, the stub set and mutation set, and the phase risks (`medium`, `critical`, `medium`, `high`). They hold against the tree.
