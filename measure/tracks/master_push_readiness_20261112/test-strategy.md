# Test strategy: master push readiness

> **Track:** `master_push_readiness_20261112` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Scope:** Phase 1 in full (tasks 1.1 to 1.9). Phase 2 is a placeholder (section 9). It gets its full strategy after task 2.0.
> **Written:** 2026-11-13 at role base `0171736cc`. Model: claude-code/claude-opus-5-5.
> **Spec review:** round 1 fail (`measure/runs/master_push_readiness_20261112/spec-review-6199abbcc.json`), round 2 pass (`spec-review-639eaef2c.json`). Nits F12 and F13 are closed in section 10.
> **No SHA of a phase base in this file.** Section 1.5 names the capture point.
> **No hash, no checksum, no manifest.** The track adds none (AGENTS.md, Hashing and Provenance Policy). Git commit identity is the only provenance.

## 1. Rules for the track

### 1.1 Machine rules and commands

- `HEAVY` is the wrapper of plan rule 18. Each vitest run goes through it, in the foreground, with this form:

  ```bash
  HEAVY_PRIORITY=p2 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && <command>'
  ```

- Reads, `grep`, `rg -n`, `git show`, `git log`, and `git diff` are light. They need no lock.
- All work runs in the shared master tree. No worktree (A16). Scratch folders come from `mktemp -d`.
- A wrapper exit is not a test result. The exit codes 64, 65, 75, 77, 124, and 201 of `heavy-run.sh` are wrapper stops. They are never Red proof and never Green proof. On exit 124, stop the task and report it. Do not retry with a longer limit before the orchestrator answers.
- No `gcloud` or `gh` command that writes, except the grant of task 1.7. No push. No deploy.

### 1.2 The hash rule

- The track adds no hash field, no checksum, and no manifest.
- The new helper of task 1.1 reads text and parses YAML. It computes no digest.

### 1.3 Evidence classes

- **Artifact test.** All Phase 1 tests are artifact tests. They read `cloudbuild.yaml`, `cloudbuild-traffic.yaml`, the scheduler script, and the runbook. They never run Cloud Build, `gcloud`, or the scheduler. A pass proves the file text and the step order. It does not prove that Cloud Build runs the step or that the IAM grant exists.
- **Live behavior proof.** Phase 1 has two live proofs, and both sit at human gates outside the Red and Green roles:
  - task 1.7 (`deferred:pm`): the exact grant command and its output in the command log;
  - task 1.8 (`deferred:daniel-push`): the `cd-apps` run id after Daniel's push word, with the codecamp-advantage job conclusion `success`.
  - The first codecamp traffic run (Daniel's traffic word) is the live proof of the moved step. It is outside this track. The runbook of task 1.4 names it.
- **Fixture test.** Case F-20-fixture runs the new helper on inline YAML text and inline script text. It proves the detection logic, not the real files.
- **Read-only check.** Task 1.9 is a read-only `grep` and a read of the A-52 state. It proves the text of the push files at one HEAD.
- A plan `[x]` note names the commit, the evidence class, the exit code, and the labeled counts (A5). A note that says "pass" with no exit code is a defect.

### 1.4 Intentionally-red aggregate suites

- Task 1.1 makes `CI=true pnpm exec vitest run scripts/ci` red on master. Task 1.2 makes the contract test red. Both stay red until task 1.3. The CI job of `.github/workflows/ci.yml` line 146 runs the same `scripts/ci` command, so CI on a push between task 1.1 and task 1.3 is red by design. The track pushes nothing, so no CI run sees this state.
- `pnpm turbo run test` is not a gate of this phase. The codecamp app has no `node_modules` in this checkout (spec review r1, F4). The root vitest commands of task 1.5 are the gates.
- `bash measure/doctor.sh` runs only when the doctor track has closed (plan task 1.5). It is not Red proof and not Green proof. When it runs, record its exit code as information.
- Red tasks 1.1 and 1.2 run on a model family other than the Green family (plan rule 11). The orchestrator sets the models.

### 1.5 Capture of `phase_base_sha`

- This file embeds no `phase_base_sha`. A value from before the commit of this strategy is not valid.
- **Phase 1:** the orchestrator captures `git rev-parse HEAD` **after** the commit `docs(measure): add the push readiness test strategy (track_id: master_push_readiness_20261112)`, **after** any commit of `measure/runs/master_push_readiness_20261112/strategy-p1.log`, and **before** task 1.1 starts. The captured commit must hold this file: `git cat-file -e <sha>:measure/tracks/master_push_readiness_20261112/test-strategy.md` exits 0.
- **Phase 2:** capture after the Phase 1 acceptance commit and after the deploy word list goes to Daniel, before task 2.0 starts.
- Master is shared with other tracks. `git diff --name-only <phase_base_sha>..HEAD` lists the paths of every track. The scope check of the phase is per commit:

  ```bash
  git log <phase_base_sha>..HEAD --format=%H --fixed-strings --grep='track_id: master_push_readiness_20261112'
  ```

  Then run `git show --name-only --format= <sha>` for each commit. The label is `push_readiness_out_of_scope_paths=<n>`. A path is in scope when section 6 allows it for the task of that commit. The phase check needs 0.

### 1.6 Labeled counts and floors

- Every count in a test message, a log line, or a plan note is a labeled integer `label=<n>`. A bare number never counts (A3).
- Each loop asserts its input size before it runs. A loop over an empty set is a defect (A4).
- Base counts, measured on 2026-11-13 at `0171736cc` (one run, exit 0, `Test Files 2 passed`, `Tests 25 passed`):
  - `cloudbuild_cases_base=18` (F-01 to F-17 and F-19 in `scripts/ci/__tests__/cloudbuild-files.test.mjs`);
  - `contract_cases_base=7` (`review-worker-deployment-contract.test.ts`).
- Base counts from spec review r2 at `639eaef2c` (no commit since then changed these files): `scripts_ci_files=13`, `scripts_ci_tests=208`, `db_contract_tests=21` (2 files), `accounts_readiness_tests=9`. The Red role measures them again at `phase_base_sha` and records the four values.
- Floors after task 1.1: `cloudbuild_cases=21` (adds F-20, F-20-fixture, F-21) and `scripts_ci_tests=<base>+3`. The contract file keeps `contract_cases=7`. A Green run with a lower count fails the gate.

## 2. Facts that shape the tests (read on 2026-11-13 at `0171736cc`; Red and Green measure again)

| # | Fact | Source |
|---|---|---|
| M1 | The push step `configure-review-worker-scheduler` sits at lines 53 to 62. It runs `bash -c ./apps/codecamp-advantage/scripts/configure-review-worker-scheduler.sh` with `PROJECT_ID=$PROJECT_ID` and `secretEnv: CODECAMP_REVIEW_WORKER_TICK_TOKEN`. The step text holds no `gcloud scheduler`. Only the script holds it (lines 24 to 27). | `apps/codecamp-advantage/cloudbuild.yaml`, the script |
| M2 | The push `availableSecrets` holds one entry, the tick token (lines 67 to 70). `--set-secrets` at line 38 holds `REVIEW_WORKER_TICK_TOKEN=CODECAMP_REVIEW_WORKER_TICK_TOKEN:latest`. | push file |
| M3 | The traffic file holds `bind-release-source`, `migrate-db`, `doctor-check`, `update-traffic`, and one `availableSecrets` entry, `CODECAMP_DATABASE_URL`. Line 7 is the order line. Line 44 is the comment "The traffic move runs last." | `apps/codecamp-advantage/cloudbuild-traffic.yaml` |
| M4 | `ordered` throws when the expected list or the file does not end with `update-traffic`. It stays unchanged. | `scripts/ci/__tests__/helpers/plan.mjs:317-340` |
| M5 | `dbToken` marks a step as a database step when a `secretEnv` name holds `DATABASE_URL` or the text holds a database token. The tick token name holds no `DATABASE_URL`. The script holds no database token. So F-11 does not count the moved step as a database step. | `plan.mjs:261-291` |
| M6 | `stepText` joins `entrypoint`, `args`, and `env`. It does not join `name` or `secretEnv`. A step on the image `gcr.io/cloud-builders/gcloud` with `args: [scheduler, ...]` calls `gcloud scheduler`, and its text holds no literal `gcloud scheduler`. | `plan.mjs:203-226` |
| M7 | `readArtifact` of the contract test returns `""` for a missing file. A `not.toContain` on a missing file passes. | contract test lines 14 to 17 |
| M8 | T-01 of `traffic-source-binding-phase2.test.mjs` needs `bind-release-source` first and `migrate-db` after it. The new step does not change this. | lines 724 to 737 |
| M9 | `codecamp-0049-ledger-gap-deploy-contract.test.ts` reads the traffic file with `indexOf` for the migrate and doctor order. `deploy-gate-contract.test.ts` line 320 reads the traffic file for `availableSecrets:` then `secretManager:`. A second entry keeps both green. | spec review r2, F9 |
| M10 | `.gcloudignore` uploads `apps/codecamp-advantage/**`, so the traffic upload holds the script. The four failed push builds reached the create call, so the Cloud Build service account can read the tick token secret today. | `.gcloudignore:8-9`, spec section 2.2 |
| M11 | The runbook codecamp section says "Steps, in order: `bind-release-source`, `migrate-db`, `doctor-check`, `update-traffic`." It has no "Order:" line now. F-16 checks the file name, each step id, and the text "old schema". | `docs/runbooks/traffic-moves.md` |

## 3. Phase summary and review applicability

| Phase | Risk | Review A | Review B | Review C | Adversarial | UX browser review |
|---|---|---|---|---|---|---|
| P1 move the codecamp scheduler step | **medium** | yes | **yes (required)** | no | yes (small scope) | no |
| P2 old Primary test failures | set after task 2.1 (section 9) | yes | set after task 2.1 | set after task 2.1 | set after task 2.1 | set after task 2.1 |

**Why P1 is medium.** The change edits two production build files. It changes no product code. A defect has two forms. The step can stay in the push, and the push then changes live behavior before Daniel's traffic word. Or the step can be missing or out of order in the traffic file, and then the review worker stops after the traffic move, or the traffic moves before the step. The blast radius is the codecamp push and the codecamp traffic run. It is not critical, because the track runs neither file. Daniel's words gate both.

**Review A (correctness) applies.** It checks FR-1 to FR-6 and AC-1 to AC-5. It checks that the helper `ordered` and runbook line 17 stay unchanged. It checks that no other test of section 2 turns red.

**Review B (security) applies and is required.** The phase moves a secret binding between two build files, and it names an IAM grant. Review B reads:

- the push file keeps the runtime binding `--set-secrets=...REVIEW_WORKER_TICK_TOKEN=CODECAMP_REVIEW_WORKER_TICK_TOKEN:latest` and holds no Cloud Build copy of the secret (FR-1);
- the traffic file binds the secret only through `secretEnv` and `availableSecrets`, with `versions/latest`, and no step prints the token. The step runs the unchanged script, and the script puts the token only in the header argument;
- no file of the diff holds a token value, a database URL, or a password;
- task 1.7 names the narrowest role that covers `cloudscheduler.jobs.get`, `cloudscheduler.jobs.create`, and `cloudscheduler.jobs.update`. The member is the Cloud Build service account. The scope is project `reading-advantage`. Review B checks that no grant ran before task 1.7 and that the plan holds no grant command outside task 1.7;
- the runbook names the grant as a precondition of the first traffic run and names Daniel's gate as only his traffic word.

**Review C (UX/API) does not apply.** The phase has no route, no UI, no API, no message file, and no public contract. The tick route stays unchanged. Review C writes its result with the verdict "not applicable" and this reason.

**Adversarial testing applies, with a small scope.** The new helper of F-20 is a detector with a boolean outcome. A mutant can make it blind. Section 7 lists the mutants. The YAML moves have no logic to mutate.

**The UX browser review does not apply.** No page, route, or component changes. Nothing renders in a browser.

## 4. Acceptance criteria and the proof of each

| AC | Requirement | Test or run | Evidence class |
|---|---|---|---|
| AC-1 | the contract test passes | command C2 (section 6.5) | artifact test |
| AC-2 | `cloudbuild-files.test.mjs` passes with F-11, F-16, F-20, F-21 | command C1 | artifact test |
| AC-3 | the FR-3 check passes and fails on a fixture | F-20 and F-20-fixture in command C1 | artifact test and fixture test |
| AC-4 | `grep -n "gcloud scheduler" apps/codecamp-advantage/cloudbuild.yaml` prints no line | the grep of task 1.5, exit 1 and `grep_lines=0` | read-only check |
| AC-5 | the runbook names the step and the three permissions | F-16 and the runbook grep of task 1.4 | artifact test |
| AC-6 | the grant exists before the first codecamp traffic move | task 1.7 command log | live proof, `deferred:pm` |
| AC-7 | the next `cd-apps` run ends in `success` for codecamp-advantage | task 1.8 run id | live proof, `deferred:daniel-push` |

AC-4 is weaker than F-20: the push file holds no literal `gcloud scheduler` today either (M1). AC-4 is a smoke check. F-20 is the real proof.

## 5. Risks, changed contracts, and architecture guardrails

### 5.1 Changed contracts

- **Push file contract.** The codecamp push no longer creates or updates the scheduler job. A person who reads the old push header can expect the scheduler at push time. Task 1.3 updates the push header comments.
- **Traffic file contract.** The codecamp traffic run now needs the scheduler IAM grant and the tick token secret. Without the grant, the run stops at the scheduler step **after** `migrate-db` and `doctor-check`. The database is then migrated and the traffic stays on the old revision. This is the same state as a failed traffic move, and the runbook already allows it. The runbook of task 1.4 must state the grant as a precondition.
- **Order contract.** The new order is "release source bind, migrate, doctor check, review worker scheduler, traffic move." The scheduler then calls the live host for a few seconds before the traffic move (spec OQ-2). The tick route exists on the live revision `codecamp-advantage-00010-ts6` only if that revision holds the route. Review A reads this as a known limit of OQ-2. It is not a test target.
- **Contract test ownership.** Track `codecamp_pr_review_recovery_20260820` owns the contract test. This track changes only the file that one case reads (spec section 2.6). Task 1.6 tells that owner.

### 5.2 Architecture guardrails

- `ordered`, `dbToken`, `stepText`, and runbook line 17 stay unchanged. The diff of `plan.mjs` adds one exported function with a JSDoc comment and changes no line of an existing function.
- The scheduler script stays unchanged. `git diff <phase_base_sha>..HEAD -- apps/codecamp-advantage/scripts/configure-review-worker-scheduler.sh` prints nothing.
- No other app file changes. The accounting scheduler step stays with A-52 (spec section 2.7). F-20 reads only the codecamp push file.
- No new dependency. The helper uses the `yaml` parser that `plan.mjs` imports now, and `node:fs`.

### 5.3 Risk table

| # | Risk | Defense |
|---|---|---|
| R1 | The detector misses a scheduler call that has no literal `gcloud scheduler` text (M6). | F-20-fixture rows X3 and X4 (section 6.1). |
| R2 | The detector skips a script path that it cannot read, and the case passes. | Row X5: a missing script path throws. |
| R3 | The detector always fails, or always passes. | Row X6 (a clean fixture returns 0) and the positive control of F-20 on the real traffic file. |
| R4 | F-21 matches `REVIEW_WORKER_TICK_TOKEN` as a substring of the whole file, and the removal of the `availableSecrets` entry hides behind the `--set-secrets` text. | F-21 parses the YAML and reads `availableSecrets.secretManager` and each `secretEnv` (A1). |
| R5 | A contract test assertion reads a missing file and passes (M7). | Task 1.2 asserts that the traffic file exists before it reads it. |
| R6 | Green moves the step after `update-traffic`, or adds it twice. | F-11 through `ordered`, and the F-11 extra check `scheduler_steps=1`. |
| R7 | Green drops `PROJECT_ID` or the `secretEnv` from the moved step. The traffic run then fails at the script's first line. | F-21 positive checks on the traffic step (section 6.1). |
| R8 | Green deletes the tick token from `--set-secrets`, and the runtime loses its bearer token. | F-21 and the contract test both check the exact entry. |
| R9 | A plan note says "all tests pass" with a wrapper exit. | Section 1.1 and A5. |
| R10 | Another test file that reads the codecamp build files turns red. | Commands C3 and C4 at task 1.5. |

## 6. The per-phase strategy

`ROOT=/home/daniebo/Desktop/reading-advantage-monorepo`. Expected values are literals in the tests. A test never computes an expected value with the code under test.

### P1: fix the failing cd-apps codecamp job

**Risk: medium.** Review A, Review B (required), and adversarial (small) apply. Review C and the UX browser review do not apply (section 3).

The four commands of plan task 1.5, named C1 to C4:

```bash
# C1
HEAVY_PRIORITY=p2 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && CI=true pnpm exec vitest run scripts/ci'
# C2
HEAVY_PRIORITY=p2 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run apps/codecamp-advantage/lib/__tests__/review-worker-deployment-contract.test.ts --maxWorkers=1'
# C3
HEAVY_PRIORITY=p2 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run packages/db/src/__tests__/deploy-gate-contract.test.ts packages/db/src/__tests__/codecamp-0049-ledger-gap-deploy-contract.test.ts --maxWorkers=1'
# C4
HEAVY_PRIORITY=p2 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run apps/accounts/scripts/production-readiness.test.ts --maxWorkers=1'
```

**RED_TEST_COMMAND** (the orchestrator gate value; it must exit non-zero after task 1.2):

```bash
rc=0; HEAVY_PRIORITY=p2 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && CI=true pnpm exec vitest run scripts/ci' || rc=1; HEAVY_PRIORITY=p2 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run apps/codecamp-advantage/lib/__tests__/review-worker-deployment-contract.test.ts --maxWorkers=1' || rc=1; HEAVY_PRIORITY=p2 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run packages/db/src/__tests__/deploy-gate-contract.test.ts packages/db/src/__tests__/codecamp-0049-ledger-gap-deploy-contract.test.ts --maxWorkers=1' || rc=1; HEAVY_PRIORITY=p2 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run apps/accounts/scripts/production-readiness.test.ts --maxWorkers=1' || rc=1; exit $rc
```

**GREEN_TEST_COMMAND** (it must exit 0 after task 1.3 and at task 1.5):

```bash
HEAVY_PRIORITY=p2 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && CI=true pnpm exec vitest run scripts/ci' && HEAVY_PRIORITY=p2 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run apps/codecamp-advantage/lib/__tests__/review-worker-deployment-contract.test.ts --maxWorkers=1' && HEAVY_PRIORITY=p2 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run packages/db/src/__tests__/deploy-gate-contract.test.ts packages/db/src/__tests__/codecamp-0049-ledger-gap-deploy-contract.test.ts --maxWorkers=1' && HEAVY_PRIORITY=p2 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run apps/accounts/scripts/production-readiness.test.ts --maxWorkers=1'
```

The RED gate exits non-zero for any failure, also for a wrong reason. The gate is therefore not enough. The Red evidence records each command alone, with its exit code, its labeled counts, and the names of the failing cases. The expected Red pattern after task 1.2 is `c1_exit=1 c2_exit=1 c3_exit=0 c4_exit=0`. Any other pattern stops the task.

#### 6.1 Task 1.1: Red, F-20, F-20-fixture, F-21

**Allowed paths:** `scripts/ci/__tests__/cloudbuild-files.test.mjs`, `scripts/ci/__tests__/helpers/plan.mjs`, `measure/tracks/master_push_readiness_20261112/plan.md`, `measure/runs/master_push_readiness_20261112/`.

**Targeted Red command:** C1. The fast loop may run `CI=true pnpm exec vitest run scripts/ci/__tests__/cloudbuild-files.test.mjs --maxWorkers=1` through `HEAVY`, but the evidence is C1.

**The helper.** Add one exported function to `plan.mjs`, for example `schedulerCalls(doc, readScript)`. It returns a list of `{ step, file }` items, one for each step that calls Cloud Scheduler. `readScript(path)` returns the script text. The real case passes a reader of the repository file. The fixture case passes a map of inline texts. A step calls Cloud Scheduler when one of these is true:

- `stepText(step)` matches `/\bgcloud\b(?:\s+(?:--?\S+|\\\n))*\s+scheduler\b/`;
- the step image (`name`) holds `cloud-builders/gcloud` and the first argument is `scheduler`;
- a script that the step runs holds a match of the first rule. A script path is an argument token or a token inside an argument that ends in `.sh`. The helper resolves it against the repository root (a leading `./` is removed). A path that does not resolve to a file throws an error that names the path. It is not skipped.

**F-20 the codecamp push file calls no gcloud scheduler.** It parses `apps/codecamp-advantage/cloudbuild.yaml`. It asserts `push_steps>=4` first. It fails when `schedulerCalls` returns one or more items. The message holds `apps/codecamp-advantage/cloudbuild.yaml`, the step id, the script path, and `scheduler_calls=<n>`. Then it runs a positive control: `schedulerCalls` on `apps/codecamp-advantage/cloudbuild-traffic.yaml` must return `scheduler_calls_traffic=1`. The control proves that the real reader resolves a real script.

- At the base: fails on the push check, with `scheduler_calls=1`, step `configure-review-worker-scheduler`, file `./apps/codecamp-advantage/scripts/configure-review-worker-scheduler.sh`.
- Falsification: F-20 is wrong if it passes while any step of the push file runs a script that holds `gcloud scheduler`.

**F-20-fixture the scheduler check fails on a fixture push file.** One case, with these rows. Each row asserts the exact return length. The case asserts `fixture_rows=6` before the loop.

| Row | Inline fixture | Expected |
|---|---|---|
| X1 | a step with `args: ["-c", "gcloud scheduler jobs create http j --project=p"]` | 1 item |
| X2 | a step with `args: ["-c", "./x/run.sh"]`, the inline script `gcloud scheduler jobs describe j` | 1 item, `file` = `x/run.sh` |
| X3 | a step with `name: gcr.io/cloud-builders/gcloud`, `args: ["scheduler", "jobs", "update", "http", "j"]` | 1 item |
| X4 | a step with `args: ["-c", "gcloud --project=p scheduler jobs list"]` | 1 item |
| X5 | a step with `args: ["-c", "./x/missing.sh"]`, no inline text for that path | throws, the message holds `x/missing.sh` |
| X6 | two clean steps, one runs `./x/clean.sh` with the inline text `gcloud run deploy s` | 0 items, `steps_checked=2` |

- At the base: the case passes (the helper is new and correct). It is a named characterization case.
- Falsification: the case is wrong if a row passes with a helper that returns `[]` for every input, or that throws for every input.

**F-21 the codecamp push file holds no Cloud Build copy of the tick token.** It parses the YAML.

- Fail when any step of the push file lists `CODECAMP_REVIEW_WORKER_TICK_TOKEN` in `secretEnv`.
- Fail when any `availableSecrets.secretManager` entry of the push file has `env` equal to `CODECAMP_REVIEW_WORKER_TICK_TOKEN`, or a `versionName` that holds `/secrets/CODECAMP_REVIEW_WORKER_TICK_TOKEN/`.
- Keep: the `deploy-cloudrun` step holds one `--set-secrets=` argument. Split its value on `,`. The list holds the exact item `REVIEW_WORKER_TICK_TOKEN=CODECAMP_REVIEW_WORKER_TICK_TOKEN:latest`. Assert `set_secrets_items>=13` before the search.
- Traffic side: the step `configure-review-worker-scheduler` of the traffic file lists `CODECAMP_REVIEW_WORKER_TICK_TOKEN` in `secretEnv` and `PROJECT_ID=$PROJECT_ID` in `env`. The traffic `availableSecrets.secretManager` holds the entry with `env: CODECAMP_REVIEW_WORKER_TICK_TOKEN` and `versionName: projects/$PROJECT_ID/secrets/CODECAMP_REVIEW_WORKER_TICK_TOKEN/versions/latest`, and it keeps the `CODECAMP_DATABASE_URL` entry (`traffic_secrets=2`).
- The message names each failed item and the file.
- At the base: fails on the push `secretEnv` and the push `availableSecrets` entry.
- Falsification: F-21 is wrong if it passes while the push file holds the token in `secretEnv` or `availableSecrets`, or while `--set-secrets` lacks the exact item.

**Header comment.** Line 4 of `cloudbuild-files.test.mjs` names F-20 and F-21 and this strategy file.

**Expected Red result of C1.** Exit 1. `failed_cases=2`: F-20 and F-21. F-20-fixture passes. `scripts_ci_tests=<base>+3`. No syntax error and no import error: a load failure of the file is not Red.

**Commit:** `test(ci): fail a push file that calls gcloud scheduler (track_id: master_push_readiness_20261112)`.

#### 6.2 Task 1.2: Red, F-11, F-16, and the contract test

**Allowed paths:** `scripts/ci/__tests__/cloudbuild-files.test.mjs`, `apps/codecamp-advantage/lib/__tests__/review-worker-deployment-contract.test.ts`, `measure/tracks/master_push_readiness_20261112/plan.md`, `measure/runs/master_push_readiness_20261112/`.

**Targeted Red commands:** C1 and C2.

- **F-11.** The codecamp row reads `steps: ["migrate-db", "doctor-check", "configure-review-worker-scheduler", "update-traffic"]`. `ordered` stays unchanged. Add one check for the codecamp row: the traffic file holds `scheduler_steps=1` (exactly one step with that id).
- **F-16.** The codecamp section reads the same four steps. Add one check for the codecamp section: the body holds `cloudscheduler.jobs.get`, `cloudscheduler.jobs.create`, and `cloudscheduler.jobs.update` (`iam_permissions=3`), and the order line `Order: release source bind, migrate, doctor check, review worker scheduler, traffic move.`
- **The contract test.** Change only the case "binds the route token from the canonical Secret Manager secret". It keeps the `--set-secrets` check on `cloudbuild.yaml`. It asserts that `cloudbuild-traffic.yaml` exists (`existsSync`) before it reads it. It reads the traffic file for the step id `configure-review-worker-scheduler`, the script path `./apps/codecamp-advantage/scripts/configure-review-worker-scheduler.sh`, the `versionName` text, and `env: "CODECAMP_REVIEW_WORKER_TICK_TOKEN"`. The other six cases stay unchanged. The spec allows only the move of the file reference (spec section 2.6).

**Expected Red result.** C1: exit 1, `failed_cases=4` (F-11, F-16, F-20, F-21). C2: exit 1, `failed_cases=1` ("binds the route token from the canonical Secret Manager secret"), `contract_cases=7`. C3 and C4: exit 0 with their base counts.

- Falsification of F-11: it is wrong if it passes with the step after `update-traffic`, with the step absent, or with two copies.
- Falsification of F-16: it is wrong if it passes with a runbook section that lacks the step id or one of the three permissions.
- Falsification of the contract case: it is wrong if it passes when `cloudbuild-traffic.yaml` is missing.

**Commit:** `test(ci): expect the codecamp scheduler step in the traffic file (track_id: master_push_readiness_20261112)`.

#### 6.3 Task 1.3: Green, move the step

**Allowed paths:** `apps/codecamp-advantage/cloudbuild.yaml`, `apps/codecamp-advantage/cloudbuild-traffic.yaml`, `measure/tracks/master_push_readiness_20261112/plan.md`, `measure/runs/master_push_readiness_20261112/`.

- The Green role edits no test file. A Green that needs a test change stops and reports to the orchestrator.
- The moved step keeps the same `name`, `entrypoint`, `args`, `env`, and `secretEnv` as the push step of M1.
- The push file then holds no top-level `availableSecrets` key. That is correct, because the entry was its only one.
- Line 7 of the traffic file reads the order line of FR-2. The comment "The traffic move runs last." stays above `update-traffic`.

**Green gate:** C2, C3, and C4 exit 0. C1 exits 1 with `cloudbuild_cases=21` and `failed_cases=1`. The one failed case is F-16, because the runbook changes only in task 1.4. Any other failed case stops the task. The orchestrator runs the full GREEN_TEST_COMMAND after task 1.4 (question Q2).

**Commit:** `fix(ci): move the codecamp scheduler step to the traffic file (track_id: master_push_readiness_20261112)`.

#### 6.4 Task 1.4: Green, the runbook

**Allowed paths:** `docs/runbooks/traffic-moves.md` (the codecamp section only), `measure/tracks/master_push_readiness_20261112/plan.md`, `measure/runs/master_push_readiness_20261112/`.

- The step list names five steps in the new order. The order line is the line of FR-2.
- The section names the three permissions, the member (the Cloud Build service account of project `reading-advantage`), and the grant as a precondition of the first traffic run. It names task 1.7 and the tag `deferred:pm`. It states that Daniel's gate at the traffic move is only his traffic word.
- The section states the failure state of section 5.1: without the grant, the run stops after `doctor-check`, and the traffic stays on the old revision.
- `git diff <phase_base_sha>..HEAD -- docs/runbooks/traffic-moves.md` changes no line outside the codecamp section. Line 17 stays.

**Green gate:** the full GREEN_TEST_COMMAND exits 0. C1 shows `failed_cases=0`.

**Commit:** `docs(ci): name the codecamp scheduler step and its IAM precondition (track_id: master_push_readiness_20261112)`.

#### 6.5 Task 1.5: the closeout gate of Phase 1

Run at one HEAD, with no edit between the runs:

1. C1, C2, C3, C4, one at a time. Record `c1_exit` to `c4_exit` and the counts: `scripts_ci_tests`, `cloudbuild_cases=21`, `contract_cases=7`, `db_contract_tests`, `accounts_readiness_tests`. Each count is at or above its base.
2. `grep -n "gcloud scheduler" apps/codecamp-advantage/cloudbuild.yaml`. The expected result is exit 1 and `grep_lines=0`. An exit 2 is a failure.
3. `git diff <phase_base_sha>..HEAD -- apps/codecamp-advantage/scripts/configure-review-worker-scheduler.sh scripts/ci/__tests__/helpers/plan.mjs` shows no changed line in the script and no changed line of `ordered`, `dbToken`, or `stepText`.
4. The scope check of section 1.5: `push_readiness_out_of_scope_paths=0`.
5. `bash measure/doctor.sh` only when the doctor track has closed. Record its exit code. It does not gate this phase.

**Closeout gate of Phase 1:** steps 1 to 4 pass, Review A and Review B pass, the adversarial result passes, and the Review C result says "not applicable". Tasks 1.7 and 1.8 stay `[b]` with their tags. They do not block the phase acceptance. Task 1.9 runs before the deploy word list goes to Daniel. If the list goes out after the phase acceptance, task 1.9 is the last open task of the phase.

#### 6.6 Task 1.6: tell the owner

No file change except the plan note. The note names the date, the receiver (the owner of `codecamp_pr_review_recovery_20260820`), and the commit of task 1.3. Evidence class: person-checked.

#### 6.7 Task 1.7: the IAM grant (`deferred:pm`)

Not a Red or Green task. The session runs it only before the first codecamp traffic move. The command log in the plan holds the exact command and its exit code, for example:

```bash
gcloud projects add-iam-policy-binding reading-advantage --member=serviceAccount:<project-number>@cloudbuild.gserviceaccount.com --role=roles/cloudscheduler.admin --condition=None
```

The member and the role in the log are the values that ran. The proof of the grant is a read: `gcloud projects get-iam-policy reading-advantage --flatten=bindings --filter="bindings.members:<member>" --format="value(bindings.role)"` prints the role. The PM records it. The PM decision says "on the codecamp project only"; codecamp runs in the shared project `reading-advantage`, so the grant covers that project (spec D-3). Question Q1 (section 11) carries this.

#### 6.8 Task 1.8: the green push run (`deferred:daniel-push`)

After Daniel's push word, record the `cd-apps` run id and the conclusion of the codecamp-advantage job. Read-only: `gh run view <id> --json jobs`. The expected value is `success`. A `failure` reopens the phase.

#### 6.9 Task 1.9: the push check (read-only)

- `grep -n 'gcloud scheduler' apps/*/cloudbuild.yaml` and the same grep over each script that those files run. Record `push_scheduler_lines=<n>`.
- For each line, the deploy word list names the app and its IAM grant, or A-52 Phase 3 has removed the line (finding F301). Record the A-52 Phase 3 state with its commit.
- No file changes except the plan note.

## 7. Mutants the adversarial role must kill

Each mutant runs on a scratch copy of the test helper or of the build file, through C1. The adversarial role reports `mutants_total=10 mutants_killed=<n>`. The floor is `mutants_killed=10`.

| # | Mutant | Killed by |
|---|---|---|
| M-01 | `schedulerCalls` returns `[]` always | F-20 (the positive control on the traffic file) and F-20-fixture X1 |
| M-02 | the helper skips a script path that it cannot read | F-20-fixture X5 |
| M-03 | the helper ignores the image form `name: .../gcloud`, `args: [scheduler, ...]` | F-20-fixture X3 |
| M-04 | the regex matches only `gcloud scheduler` with one space | F-20-fixture X4 |
| M-05 | the helper does not read script files | F-20-fixture X2 and the F-20 positive control |
| M-06 | the push file keeps the step | F-20 and F-21 |
| M-07 | the push file keeps only the `availableSecrets` entry | F-21 |
| M-08 | the push `--set-secrets` drops the tick token item | F-21 and the contract case |
| M-09 | the traffic step moves after `update-traffic` | F-11 (`ordered`) |
| M-10 | the traffic step drops `secretEnv` or `PROJECT_ID` | F-21 (traffic side) |

## 8. Anti-pattern coverage

| ID | Applies to | Defense in this phase | Falsification condition |
|---|---|---|---|
| A1 substring as a structured signal | F-21, the contract case | F-21 parses the YAML and reads `secretEnv`, `availableSecrets.secretManager`, and the split `--set-secrets` list. A substring of the whole file is not a signal. The contract case stays a text check, and F-21 carries the structure. | F-21 passes while the push file holds the token in `availableSecrets`, because the `--set-secrets` text holds the same name. |
| A3 digit only as a labeled count | every count | Each count is `label=<n>`. The plan notes quote `failed_cases`, `cloudbuild_cases`, `scheduler_calls`, `grep_lines`. | A note or message holds a bare number as a count. |
| A4 vacuous pass on nothing done | F-20, F-20-fixture, F-21, the contract case | `push_steps>=4`, `fixture_rows=6`, `set_secrets_items>=13`, `traffic_secrets=2` before the loops. The F-20 positive control `scheduler_calls_traffic=1`. `existsSync` before a read of the traffic file. Row X5 throws on a missing script. | Any of these cases passes on an empty file, an empty step list, or a missing script. |
| A5 false claim text | plan notes, runbook | A plan `[x]` note quotes the exit code and the counts of section 6. A wrapper exit is not a pass. The runbook names the grant as a precondition, not as done. | A note says "pass" while a command exited non-zero, or the runbook says the grant exists before task 1.7 ran. |
| A6 registry note overstatement | `measure/tracks.md` | The registry status changes only at the phase acceptance. It names tasks 1.7 and 1.8 as open gates until their evidence exists. | The registry says "fixed" or "green" before task 1.8 records `success`. |
| A7 over-broad filter | the detector regex | The detector excludes nothing. It has no exclusion list. Comments in a script count as a call. This is strict by design: a comment that names `gcloud scheduler` in a push script is rare and cheap to remove. | A real call passes because a filter dropped its line. |
| A8 marker set | `plan.md` | Markers stay in {` `, `~`, `x`, `b`}. Tasks 1.7 and 1.8 stay `[b]` with `deferred:pm` and `deferred:daniel-push`. This strategy marks no task. | A marker outside the set, or `[x]` on 1.7 or 1.8 without the log or the run id. |
| A9 archived track paths | none of the new tests read a track path | The new cases read app files and the runbook only. | A new case reads `measure/tracks/<id>/`. |
| A10 generated facts drift | not applicable | The phase changes no structure that `measure/generated/` holds. | not applicable |
| A11 executed review left blocked | not applicable | The track is not a review track. | not applicable |
| A16 one worktree | every role | Every role works in the shared master tree. | `git worktree list` shows a worktree for this track. |

A2 (consent) and A12 to A15 do not apply. The phase has no publish gate, no catalog edit, no `rg` detector, and no role receipt with hashes.

## 9. Phase 2: placeholder

**Start condition:** the deploy word list of the push goes to Daniel (spec D-4, OQ-3). Capture `phase_base_sha` then (section 1.5).

- Task 2.0 is a read-only list. Its command is the plan command. It is not Red. Its evidence is the list with `failing_tests=<n>` and `suites_not_loaded=<n>`. The expected values are 4 and 2, or the note names the difference.
- Task 2.1 classifies each item. Task 2.2 adds the tasks.
- After task 2.1, the strategy role writes the full Phase 2 section: the Red and Green commands per added task, the risk, and the review applicability. Until then, the risk is not set. A product defect in a Primary student page makes the UX browser review apply. An environment defect has no Red test (section 10, F12).
- Task 2.3 is the closeout gate of Phase 2: the task 2.0 command exits 0 with `failing_tests=0` and `suites_not_loaded=0`.

## 10. Spec-review Nits

| Nit | State | Change |
|---|---|---|
| F12 | closed | `plan.md` task 2.2 now asks each Red or Green task to name its file and test name, and each environment-defect task to name the failing file and the setup item. `spec.md` FR-8 now fixes test and product defects test-first and records the cause and the setup fix of an environment defect. |
| F13 | closed | One list of Daniel's gates: the push word and the traffic word. `spec.md` line 8 and `metadata.json` `owner_chain` now match the registry entry of `measure/tracks.md`. The track has no deploy gate of its own: the push deploys with `--no-traffic`, and the traffic word gates the traffic move. |

## 11. Questions for the orchestrator

- **Q1.** The PM decision says "on the codecamp project only". Codecamp runs in the shared project `reading-advantage` (`scripts/ci/apps.json`). A project-level grant then also covers the accounting scheduler step of A-52. Default: grant `roles/cloudscheduler.admin` on project `reading-advantage` at task 1.7, as spec D-3 says, and log that the grant covers the shared project. Option: a custom role with only the three permissions, on the same project.
- **Q2.** Task 1.3 leaves F-16 red until task 1.4. Default: the orchestrator runs the full GREEN gate after task 1.4 and accepts `failed_cases=1` (F-16) at task 1.3. Option: merge tasks 1.3 and 1.4 into one Green run.

## 12. Summary of the commands

```bash
# P1 Red 1.1: C1, exit 1, failed_cases=2 (F-20, F-21)
# P1 Red 1.2: C1 exit 1 failed_cases=4 (F-11, F-16, F-20, F-21); C2 exit 1 failed_cases=1; C3 and C4 exit 0
# P1 Green 1.3: C1 exit 1 failed_cases=1 (F-16 only); C2, C3, C4 exit 0
# P1 Green 1.4 and closeout 1.5: GREEN_TEST_COMMAND exit 0, then:
grep -n "gcloud scheduler" apps/codecamp-advantage/cloudbuild.yaml   # exit 1, grep_lines=0
```
