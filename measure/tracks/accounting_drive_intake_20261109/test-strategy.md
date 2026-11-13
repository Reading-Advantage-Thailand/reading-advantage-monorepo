# Test strategy: Accounting Drive intake

> **Track:** `accounting_drive_intake_20261109` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Scope:** Phases 1 to 10 of the plan. Phases 1, 2, 3, 4, 6, 7, 8, and 10 hold build code. Phases 5 and 9 hold PM work or owner work and no code.
> **Written:** 2026-11-09. Model: minimax-cn-coding-plan/MiniMax-M3. The route table names claude-opus-5-5, and the 11-10 15:22 Claude reset holds that route.
> **Role base:** `git rev-parse HEAD` returned `f438d09d72328a94ba04888358d8455419756ea4` when this role started. The assignment named `9f784b842864fcb8bcaa25d08429e7c2971743f8` as the role base. That commit is the spec-review commit, and it is an ancestor of the role base. Another session committed on master during this role, so the role base moved. Section 1.5 holds the capture point of `phase_base_sha`.
> **Spec review:** round 7 passed. The result sits at `measure/runs/accounting_drive_intake_20261109/spec-review-9f784b842.json`. The result line sits in [spec-review.md](./spec-review.md).
> **Amendment P3 r1 (2026-11-13).** Route `claude-code/claude-opus-5-5[1m]#high`. The P3 section gains the subsection "P3 remediation r1" for Review A P3 and Review B P3 at `05ae3b335` and the PM decisions PM-20 to PM-23 (spec section 14.7). The P3 allowed list gains `pnpm-lock.yaml` (Review A P3 F314). The Phase 3 `phase_base_sha` does not move. The capture point of the r1 base is in the subsection.
> **Amendment P10 (2026-11-13).** Route `claude-code/claude-opus-5-5[1m]#high`. `role_base_sha=e708b36f09fd0fdc93efa68839f2b4834233eacc`. The P10 section is rewritten for the accountant year files (PM-24, spec section 9b, FR-28 to FR-31, criteria 48 to 52, section 14.8). The P10 row of section 3 changes. Questions Q13 to Q20 are added, and Q9 is replaced. The capture point of the Phase 10 base is in the P10 section.
> **Amendment r2 (2026-11-09).** PM decision of 2026-11-09 after Review A P1. The Phase 1 allowed path list of section 4 gains three paths: `packages/domain/src/__tests__/accounting-tenant-classification.test.ts`, `packages/db/src/accounting/__tests__/schema-parity.test.ts`, and `packages/db/tsconfig.build.json`. The count `intake_out_of_scope_paths=0` now holds for the real Phase 1 commits. The Phase 1 base of section 1.5 does not move.

## 1. Rules for every phase of this track

### 1.1 Machine rules and the heavy job wrapper

- The machine holds 7 GB of RAM. One heavy job runs at a time, in the foreground.
- Every Vitest command uses `CI=true`, the workspace binary `../../node_modules/.bin/vitest`, and `--maxWorkers=1`. It runs from the package folder.
- No package holds its own `vitest` binary. The binary sits at the workspace root (fact M2).
- Every suite, the app-wide `tsc`, the lint run, and the build run go through one wrapper:

  ```bash
  HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>'
  ```

- The app-wide `tsc`, the lint run, and the build run never enter a plain shell.
- The root suite `pnpm turbo run test` is red for reasons outside this track. No gate uses it.
- A light task needs no lock: reads, `rg -n`, `git show`, `git log`, `git diff`, `git rev-parse`.
- All work runs in the shared master tree. No worktree is created (A16).
- Scratch folders are plain folders made with `mktemp -d` under `/tmp`. They are removed after the run.

### 1.2 The finance rules

- Fakes live in tests and in fixtures only. No test reads a real finance document.
- No real amount, no payee, no name, no Drive id, and no document text enters git, a test, a log line, or a run note.
- The money in a fixture is digit text in minor units, for example `"12345"`. The payee in a fixture is `"Test Counterparty"`. The company id in a fixture is a fixed fake uuid. The Drive file id in a fixture is a fake string of at most 256 characters.
- The extraction route for document reading is Vertex AI only. The route never uses the Aliyun plan, and it never uses OpenRouter. A test that needs a model uses the fake model port.
- The Drive folder id comes only from `ACCOUNTING_DRIVE_FOLDER_ID`. No Drive id literal appears in a source file, a test, a log line, or a fixture.
- The track adds no hash field, no checksum column, and no manifest. The identity of a source is the Drive file id. The comparison of two files is a byte compare. The stored size is the integer `evidence_byte_size` (AGENTS.md hashing policy).
- A log line holds the document type, the status, the month, and a count. It holds no amount, no payee, no file name, and no Drive id.
- A report that leaves the repository holds no amount, no document text, no payee, no name, and no Drive id.

### 1.3 Evidence classes

- **Artifact test:** reads a file and checks text, tokens, or structure. The Dockerfile test, the cloud build test, the grants test, the schema test, and the guard scanner tests are artifact tests. They never prove a runtime behavior.
- **Function-level live test:** calls the real function or renders the real component on fake data. It proves behavior in the test runtime, not in a browser and not on Google Drive.
- **Bundle run:** builds the runner file with the real bundler and runs `--help`. It proves that the bundle holds every import and that the dry start makes no network call.
- **Deploy check:** the runtime probe SQL and the Cloud Run job step. They run at deploy time under the runtime service account. No test can replace them.
- **Human evidence:** the PM structure report, the PM dry-run report, Daniel's word for the production write, and the owner gates. No test writes these lines.
- A plan `[x]` note names the commit, the evidence class, the exit code, and the labeled counts (A5).

### 1.4 Intentionally-red aggregate suites

- The aggregate suite is not a gate while a Red file of the phase is open. The targeted command of the phase is the gate.
- The aggregate suite runs at the phase check. At that point every Red file of the phase is green.
- A file whose name ends in `.red.test.ts` is not a red file. The name is a naming convention. The gate reads the exit code and never the name. Nine such files exist today under `apps/accounting` and all of them are green.
- A pre-existing red file outside this track is named in the phase check with its path and its exit code. The count `preexisting_red_files=<n>` is a labeled integer. The track does not fix it and does not count it as its own failure.
- The base counts of section 2 hold for the aggregate suites of this track at the role base. A Green run quotes the new counts and the delta.

### 1.5 Capture of `phase_base_sha`

- This file embeds no `phase_base_sha`. A value from before the commit of this strategy is not valid.
- The orchestrator captures the value with `git rev-parse HEAD` **after** the commit of this strategy and **before** the Red role starts. The capture happens after the answers to the questions of section 6 (at least Q1, Q2, and Q5).
- The orchestrator records the full value in the Red evidence of Phase 1.
- Master is shared with other tracks. `phase_base_sha..HEAD` therefore holds their commits. A scope check uses the commits of this track only:

  ```bash
  git log <phase_base_sha>..HEAD --format=%H --grep='track_id: accounting_drive_intake_20261109'
  ```

  Then `git show --name-only --format= <sha>` for each commit. The label is `intake_out_of_scope_paths=<n>`. The phase check needs 0.
- The allowed paths of the track are the three track files under `measure/tracks/accounting_drive_intake_20261109/`, the files of the plan tasks, and the new test files. Section 4 names them per phase.
- Each phase after Phase 1 captures its own value with the same command after the checkpoint of the previous phase. This strategy states the capture point once; it does not move it.

### 1.6 Labeled counts and the count floors

- Every count in a test message, a log line, a run note, or a plan note is a labeled integer. The label and the integer are written as `label=<n>`. A bare number never counts as a count (A3).
- A count that measures work has a floor. The floor is stated before the loop runs. A loop over an empty set is a defect (A4).
- A Red file fails at least one case at the base, for the reason the task names. A case that passes at the base is a named characterization case, and the Red evidence lists it with its reason.
- A Green run quotes the exit code, the file count, the test count, and the labeled counts of the command it cites. A plan note that says "pass" without the exit code is a defect (A5).

### 1.7 Shared anti-pattern defenses

The catalog is `measure/anti-patterns.md`. Per-phase coverage is in the phase tables.

| ID | Defense in this track | Falsification condition |
|---|---|---|
| A1 | The deferred rows of the plan carry a structured `deferred:<owner>` suffix. A check that counts a deferred task parses that suffix and never a free-text word. No test reads the plan file. | A check counts a row because the word "deferred" appears in its prose. |
| A2 | The dry-run report is a publish artifact. It carries an anonymization marker line, and the gate that allows the production write reads that marker plus the human sign-off. | The report reaches a person with no marker line and no named reviewer. |
| A3 | Every count is `label=<n>`. The floors of section 1.6 are parsed from the label. | A bare number passes a count check, or a date matches a count regex. |
| A4 | Every Red file fails at the base for the named reason. Every loop asserts its input size first. The counterexample fixtures of Phase 7 prove that each guard scanner rejects its own fixture. | A Red file exits 0 with no failing case, or a loop over zero cases exits 0. |
| A5 | A plan note quotes the exit code and the labeled counts of the command it cites. A file named `.red.test.ts` is read by its exit code, not by its name. | The note says "pass" and the cited command exits non-zero. |
| A6 | The registry note in `measure/tracks.md` states the D-33 limit. No note claims the intake is live, and no note claims that the duplicate lookup covers a hand-made submission. | The registry claims a coverage that the pass-1 limit does not give. |
| A7 | The guard scanners strip comments and never use a bare English word as an exclusion token. Each scanner runs over the fixture that it must reject. | A scanner reports zero hits on its own counterexample fixture. |
| A9 | No test of this track reads a `measure/tracks/` path or a `measure/runs/` path. The detector is section 4 of each phase. | A test of this track holds the string `measure/tracks` or `measure/runs`. |
| A10 | The closeout runs `build-graph update ./graph.db <files>` once per phase after the structural edits. | A phase adds an export and the graph stays stale. |
| A14 | Every detector uses `rg -n '<regex>'`. The command never uses `rg -nE`. An exit code of 2 is a failure and never a zero-hit result. | A detector exits 2 and the evidence reads "no hit". |
| A15 | The role receipt of this track records the commit and the commands. It holds no file hash, so a later commit cannot make it stale. | The receipt holds a hash of a file that a later commit changes. |
| A16 | The one-worktree rule of section 1.1 holds. | `git worktree list --porcelain` holds more than one worktree. |

A8, A11, A12, and A13 are not phase risks of this track. A8 applies to the plan markers, which the plan-update role owns. A11 applies to a review track. A12 applies to the catalog file. A13 applies to the closeout move of this track folder.

## 2. Measured facts that shape the tests

Every fact was read on 2026-11-09. One heavy job ran per suite.

| # | Fact | How measured |
|---|---|---|
| M1 | The app suite of `apps/accounting` exits 0 at the role base with `Test Files 38 passed (38)` and `Tests 271 passed (271)`. Duration 58.28 s. | One `heavy-run.sh` job, output in `/tmp/opencode/accounting-app-base.txt`. |
| M2 | The vitest binary sits at the workspace root only. No package holds `node_modules/.bin/vitest`. The command shape is `cd <package> && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 <paths>`. | `ls` of each package folder. |
| M3 | The backend accounting suite exits 0 with `Test Files 3 passed (3)` and `Tests 51 passed (51)`: `submissions`, `approvals`, `postgres-submission-repository`. | One `heavy-run.sh` job, output in `/tmp/opencode/accounting-backend-base.txt`. |
| M4 | The db accounting suite and the journal test exit 0 with `Test Files 4 passed (4)` and `Tests 25 passed (25)`. | One `heavy-run.sh` job, output in `/tmp/opencode/accounting-db-base.txt`. |
| M5 | The two domain tenant suites exit 0 with `Test Files 2 passed (2)` and `Tests 14 passed (14)`. | One `heavy-run.sh` job, output in `/tmp/opencode/accounting-domain-base.txt`. |
| M6 | The direct-SDK guard of the AI package exits 0 with `Test Files 1 passed (1)` and `Tests 1 passed (1)`. The guard covers a direct import only. It holds no OpenRouter and no Aliyun rule. | One `heavy-run.sh` job, output in `/tmp/opencode/accounting-ai-base.txt`. |
| M7 | The workspace holds `esbuild` 0.28.1 at `node_modules/.bin/esbuild`. The version matches the lockfile value of the spec. The runner bundle build can run on this machine before the app takes the dependency. | `node_modules/.bin/esbuild --version`. |
| M8 | `apps/accounting/vitest.config.ts` includes `proxy.test.ts`, `app/**`, `components/**`, and `lib/**`. A new test under `app/lib/__tests__/` and a new test under `app/_components/` are picked up. A new test outside those globs is not picked up. | Read of the config. |
| M9 | `hasSameSubmissionContent` is private at `packages/backend/src/modules/accounting/submissions.ts:169`. It returns false on a scalar mismatch before it calls the evidence callback. The content duplicate therefore needs a byte-only compare (D-11). | Read of the module. |
| M10 | `requireOwnerRole` at `submissions.ts:344` allows the OWNER only. The list filter at `submissions.ts:333` matches the role `STAFF` only. Both change in Phase 2. | Read of the module. |
| M11 | The app route holds the private byte compare `haveSameBytes` at `apps/accounting/app/api/submissions/route.ts:109`. The route passes it as `compareEvidence` at `:298-309`. | Read of the route. |
| M12 | The AI client throws `ProviderNotConfiguredError` for the vertex case when the project, the client email, or the private key is missing (`packages/ai/src/client.ts:63-80`). The ADC path needs the branch to stop requiring the key pair. | Read of the client. |
| M13 | The AI package exports `MockProvider` and `createTestClient` (`packages/ai/src/index.ts:29`). The mock provider is the fake model port of this track. | Read of the barrel. |
| M14 | Two existing grant expectations count the grant statements. They sit at `apps/accounting/app/lib/__tests__/database-access-contract.red.test.ts:30` and at `apps/accounting/app/lib/__tests__/deployment-gates.adversarial.test.ts:174`. The count moves from 2 to 6 in task 1.6a. | Read of both files. |
| M15 | The tenant registry holds the two accounting tables as `EXEMPT` at `packages/domain/src/tenant-registry.ts:263-265`. The coverage test sits at `packages/domain/src/__tests__/tenant-coverage.test.ts`. | Read of the registry and the test. |
| M16 | The accounting Dockerfile holds the web stage as the last stage at `apps/accounting/Dockerfile:27`. Its `WORKDIR` is `/app` at `:34`. Its `CMD` is `["node", "apps/accounting/server.js"]`. | Read of the file. |
| M17 | The cloud build file holds the web `--set-secrets` line at `apps/accounting/cloudbuild.yaml:40` and the `allow-build-invoker` step at `:48-57`. The job step of Phase 3 copies the secret form of line 40. | Read of the file. |
| M18 | The app holds 38 test files today. Nine of them carry the `.red.test.ts` suffix and all of them are green. | `find` and the run of M1. |

Red and Green measure the counts again. A fact of this table is not a proof for a later commit.

## 3. Phase summary and the review applicability table

| Phase | Risk | Review A (code) | Review B (security) | Review C (UX/API) | Adversarial | Browser review (UX) |
|---|---|---|---|---|---|---|
| P1 Contracts, permissions, schema | high | yes | **yes (required)** | no | yes | no |
| P2 Roles and the monthly close | critical | yes | **yes (required)** | yes | yes | no |
| P3 The Drive intake poll | critical | yes | **yes (required)** | no | yes | no |
| P4 The Vertex route and the extraction adapter | critical | yes | **yes (required)** | no | yes | no |
| P5 The PM first load and the report | low (no code) | no | **yes (required, evidence only)** | no | no | no |
| P6 Document parsing | high | yes | **yes (required)** | no | yes | no |
| P7 The marker, the list, and the guards | high | yes | **yes (required)** | yes | yes | yes |
| P8 The history import | critical | yes | **yes (required)** | no | yes | no |
| P9 The deferred work | low (no code) | no | no | no | no | no |
| P10 The accountant year files for 2024 and 2025 | high (task 10.7 critical) | yes | **yes (required; before the task 10.7 summary leaves)** | yes | yes | **yes (required, task 10.9 view; waits for the Phase 7 script)** |

Review B is required for every phase that touches roles, the close sign-off, IAM-adjacent config, secrets, the Drive read, the Vertex route, or finance data. The reason of each row sits in the phase table of section 4.

The browser review applies to Phase 7 and Phase 10. The intake list and the close controls sit in Phase 7. The view "Filings and year end" sits in Phase 10 (task 10.9), and the Phase 7 gate script covers it. The other phases change no page.

## 4. The per-phase strategy

`ROOT=/home/daniebo/Desktop/reading-advantage-monorepo`. `HEAVY` is the wrapper of section 1.1. Every command below runs inside `HEAVY`.

### P1: The contracts, the permissions module, and the schema

**Risk: high.** The phase adds four tables, one permissions module, and eleven contract schemas. It widens the runtime grants of the accounting database. The permissions module decides who may submit, approve, reject, export, read evidence, and open a close.

**Review applicability**

| Review | Applies | Reason and scope |
|---|---|---|
| Review A (code) | yes | The phase adds a module, four tables, a migration, and a grants change. Review A checks the file placement (the contracts in one file, the repository interface in `intake.ts`), the JSDoc on every export, the check constraints, the three unique indexes, the non-unique index on `evidence_byte_size`, and the migration journal. |
| Review B (security) | **yes (required)** | The phase touches roles (the permission matrix of section 3.2) and IAM-adjacent config (the runtime database grants of FR-12a). Review B checks the least-privilege grant per table, the append-only rule of the close audit table, the rule that no table holds a hash column, and the rule that the company scope comes from the actor. |
| Review C (UX/API) | no | The phase adds no route, no page, and no user-visible text. |
| Adversarial testing | yes | The role matrix gets a hostile-actor round: a fake actor with a forged role, a scope that names another company, and a contract value that holds a path or a control character. |
| Browser review (UX) | no | The phase changes no page. |

**Red command per task**

```bash
# 1.1 contracts
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/backend && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/modules/accounting/__tests__/intake-contracts.test.ts'

# 1.3 permissions
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/backend && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/modules/accounting/__tests__/permissions.test.ts'

# 1.5 schema, tenant, and grants
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/db && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/accounting/__tests__/intake-schema.test.ts'
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/domain && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/__tests__/tenant-coverage.test.ts src/__tests__/accounting-tenant-classification.test.ts'
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/lib/__tests__/accounting-runtime-grants.test.ts'
```

**Expected failure at the base**

| Task | File | Expected at the base | Labeled counts |
|---|---|---|---|
| 1.1 | `intake-contracts.test.ts` | Exit 1. The message names the missing module or the missing export, for example `Missing packages/backend/src/modules/accounting/intake-contracts.ts`. A load error of `Cannot find module` is a defect of the Red test: the file loads the module with `existsSync` and then a dynamic import. | `contract_schemas=11`, `schema_cases>=8` |
| 1.3 | `permissions.test.ts` | Exit 1. The message names the missing permission function. The CEO row and the CONTRACTOR row fail first. | `permission_rows>=13`, `permission_denials>=8` |
| 1.5 | `intake-schema.test.ts` | Exit 1. The message names the missing table export, for example `accountingIntakeDocuments is not exported`. | `tables=4`, `unique_indexes=3`, `check_constraints>=4` |
| 1.5 | `tenant-coverage.test.ts` | Exit 1. The message names the table that the registry does not classify. The two existing rows stay green. | `unclassified_tables=4` |
| 1.5 | `accounting-runtime-grants.test.ts` | Exit 1. The message names the missing grant line for one of the four new tables. | `grant_statements=6`, `grant_cases>=5` |

**Green gate**

- The three commands of the Red block exit 0. `tests_failed=0` and `tests_skipped=0`.
- The backend accounting suite exits 0 with `Test Files 3 + <n> passed` and `Tests 51 + <n> passed`, where `<n>` is the new case count of the phase. The base is M3.
- The db accounting suite and the journal test exit 0. The base is M4.
- The two domain tenant suites exit 0. The base is M5.
- The app suite exits 0. The base is M1. The two edited grant expectations now count 6 grants instead of 2 (M14). A weaker assertion in either file is a defect (A5).
- The app-wide `tsc` and the lint run exit 0 for the changed files:

  ```bash
  HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && ../../node_modules/.bin/tsc --noEmit'
  HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && ../../node_modules/.bin/eslint app/lib/__tests__/accounting-runtime-grants.test.ts'
  ```

- The migration generation runs once: `pnpm --filter @reading-advantage/db accounting:generate`. The journal integrity test passes after it.

**Closeout gate**

1. The Green gate of this phase holds with the quoted counts.
2. Every Red file of task 1.1, 1.3, and 1.5 exists, and each Red commit sits before its Green commit.
3. `intake_out_of_scope_paths=0`. The allowed paths of this phase: `packages/backend/src/modules/accounting/{intake-contracts.ts,permissions.ts,index.ts,__tests__/**}`, `packages/db/src/accounting/schema/index.ts`, `packages/db/src/accounting/__tests__/intake-schema.test.ts`, `packages/db/src/accounting/__tests__/schema-parity.test.ts` (the six exports and the 0001 migration), `packages/db/accounting/drizzle/**`, `packages/db/tsconfig.build.json` (PM decision C1 of 2026-11-09, the build exclude of `src/**/__tests__`), `packages/domain/src/tenant-registry.ts`, `packages/domain/src/__tests__/accounting-tenant-classification.test.ts` (the Red file of the Red command at line 174), `apps/accounting/scripts/**`, `apps/accounting/app/lib/__tests__/accounting-runtime-grants.test.ts`, `apps/accounting/app/lib/__tests__/database-access-contract.red.test.ts`, `apps/accounting/app/lib/__tests__/deployment-gates.adversarial.test.ts`, and the track files.
4. `build-graph update ./graph.db packages/backend/src/modules/accounting/intake-contracts.ts packages/backend/src/modules/accounting/permissions.ts` runs once (A10).
5. The detector of section 1.7 for A9 exits 1: `rg -n 'measure/tracks|measure/runs' packages/backend/src/modules/accounting packages/db/src/accounting apps/accounting/app/lib/__tests__` exits 1.

**Fixtures and mocks**

- The fixtures hold a fake company id, a fake account id, a fake Drive file id of 40 fake characters, a fake evidence reference of the form `private-evidence://<companyId>/submissions/<uuid>/evidence`, a fake amount of `"12345"` in minor units, and the fake payee `"Test Counterparty"`.
- The repository port is a fake object with `vi.fn()` members. No database call runs in a unit test.
- The grants test reads the SQL file with `readFileSync`. The schema test reads the Drizzle table objects.

**Mutants**

- A contract that accepts a 257-character Drive file id. Rejected.
- A contract that accepts `status: "duplicate"` with no `duplicateOfSubmissionId`. Rejected.
- A contract that accepts `status: "failed"` with no `failureReason`. Rejected.
- A contract that accepts `status: "locked"` with no `lockedAt`. Rejected.
- A contract that accepts a history row with no `historySource`, and a non-history row with a `historySource`. Rejected.
- A contract that accepts a byte size of zero, a negative byte size, and a non-integer byte size. Rejected.
- A permission function that grants the CEO `accounting:submission:view-all`. Rejected.
- A permission function that grants the CONTRACTOR `accounting:submission:export`. Rejected.
- A grants file that adds `UPDATE` or `DELETE` to the close audit table. Rejected.
- A registry that leaves one of the four tables unclassified. Rejected.

**Labeled counts and floors**

`contract_schemas=11`, `schema_cases>=8`, `permission_rows>=13`, `permission_denials>=8`, `tables=4`, `unique_indexes=3`, `grant_statements=6`, `grant_cases>=5`, `unclassified_tables=4`.

**What the tests cannot prove**

- The schema test reads the Drizzle objects. It does not run a migration on a database. The migration proof is the deploy check.
- The grants test reads the SQL text. It does not hold the runtime role. The runtime probe proves the grants on the live database.
- The permission test proves the matrix. It does not prove that a route calls the permission function. The route test of Phase 2 proves the call.

**Anti-pattern coverage**

| Task | Anti-patterns | Defense | Falsification condition |
|---|---|---|---|
| 1.1 | A3, A4, A5 | `contract_schemas=11` and `schema_cases>=8` are parsed from the label. The missing-module case is an assertion with a message. | The case count is below the floor, or the failure is a bare load error. |
| 1.3 | A1, A3, A4 | One row per role per permission, with `permission_rows>=13` before the loop. A denial is a positive row, not an absent row. | A permission with no row passes, or a loop over zero rows exits 0. |
| 1.5 | A2, A5, A7 | The grants test names every grant line, and the append-only rule is a negative match on `UPDATE` and `DELETE` for one table. The two edited existing expectations keep their other assertions. | The edited expectation drops an assertion, or the audit table holds an update grant. |

### P2: The role mapping and the monthly close

**Risk: critical.** The phase adds the roles `CEO` and `CONTRACTOR`, widens the approve and reject gate, adds the CEO visibility filter, and writes the CEO sign-off and the lock. The sign writes two audit rows and ends the close at `locked`. A wrong sign rule lets a wrong actor lock a month of finance data.

**Review applicability**

| Review | Applies | Reason and scope |
|---|---|---|
| Review A (code) | yes | The phase changes the role resolution, the list filter, the approve gate, and adds the close module. Review A checks that the close module holds no route logic, that `FIRST_LIVE_MONTH` is a code constant, that the sign calls the lock in the same call, and that the repository port sits in the backend module. |
| Review B (security) | **yes (required)** | The phase touches roles (two new roles and a widened gate) and the close sign-off, and it reads finance data (the approved submissions of a period). Review B checks the sign actor, the audit actor, the refusal of every other role, the read rule of a close by status, and the rule that the scope comes from the actor. |
| Review C (UX/API) | yes | The two new routes are a public surface. Review C checks the response shapes, the 403 rule, the error body, and the route thinness. |
| Adversarial testing | yes | A forged actor, a second sign, a sign on an unknown close, a period month with a hostile shape, and a report reference that points to another company. |
| Browser review (UX) | no | The phase adds no page. The close buttons do not exist yet. |

**Red command per task**

```bash
# 2.1 roles and close
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/lib/__tests__/company-oidc.test.ts'
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/backend && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/modules/accounting/__tests__/monthly-close.test.ts src/modules/accounting/__tests__/submissions.test.ts'

# 2.3 close routes
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/api/monthly-close/route.test.ts "app/api/monthly-close/[id]/sign/route.test.ts"'
```

**Expected failure at the base**

| Task | File | Expected at the base | Labeled counts |
|---|---|---|---|
| 2.1 | `company-oidc.test.ts` | Exit 1. The file is new. The message names the missing role in the resolution, for example `resolveAccountingRole(["CEO"]) returned "ACCOUNTANT"`. | `role_rows>=5`, `role_order=5` |
| 2.1 | `monthly-close.test.ts` | Exit 1. The message names the missing export `openMonthlyClose` or `signMonthlyClose`. | `close_functions=4`, `close_audit_actions=3`, `sign_denied_roles=4` |
| 2.1 | `submissions.test.ts` | Exit 1. The two new CONTRACTOR rows fail: the list returns a submission of another account. | `contractor_rows=2` |
| 2.3 | `app/api/monthly-close/route.test.ts` | Exit 1. The message names the missing route file or the missing export `GET`. | `close_route_rows>=4` |
| 2.3 | `app/api/monthly-close/[id]/sign/route.test.ts` | Exit 1. The message names the missing route file or the missing export `POST`. | `sign_route_rows>=6`, `sign_denied_roles=4` |

**Green gate**

- The three commands exit 0 with `tests_failed=0` and `tests_skipped=0`.
- The backend accounting suite exits 0. The base is M3.
- The app suite exits 0. The base is M1. The CSV export route test stays green and the export route file is byte-identical (criterion 23). A byte compare of `apps/accounting/app/api/submissions/export/route.ts` against the base revision is part of the gate, and the header of the export route keeps its own role test at `:35` (FR-8).
- The app-wide `tsc` and the lint run exit 0.

**Closeout gate**

1. The Green gate of this phase holds with the quoted counts.
2. `intake_out_of_scope_paths=0`. The allowed paths of this phase: `apps/accounting/app/lib/company-oidc.ts`, `apps/accounting/app/lib/__tests__/company-oidc.test.ts`, `packages/backend/src/modules/accounting/{monthly-close.ts,postgres-monthly-close-repository.ts,submissions.ts,index.ts,__tests__/**}`, `apps/accounting/app/api/monthly-close/**`, and the track files.
3. `git diff --name-only` names no path under `apps/accounting/app/api/submissions/export/`.
4. `build-graph update ./graph.db packages/backend/src/modules/accounting/monthly-close.ts packages/backend/src/modules/accounting/submissions.ts` runs once (A10).
5. The detector of section 1.7 for A9 exits 1.

**Fixtures and mocks**

- The close repository port is a fake object with `vi.fn()` members. The fake holds one close row and a list of approved submissions of the period.
- The report evidence reference is a fake reference of the form `private-evidence://<companyId>/submissions/<uuid>/evidence`.
- The actors are fakes: one per role, each with a fake account id and the fake company id.
- The period month is the string `2026-11`, and the refused month is `2026-10`.

**Mutants**

- A sign that accepts an OWNER. Rejected.
- A sign that writes one audit row instead of two. Rejected.
- A lock that leaves the status at `signed`. Rejected.
- A list that returns an `open` close to the CEO. Rejected.
- A close open for `2026-10`. Rejected.
- A second close for one period month. Rejected.
- A close that takes the company scope from the request instead of the actor. Rejected.
- A list filter that keeps the STAFF branch only and drops the CONTRACTOR. Rejected.

**Labeled counts and floors**

`role_rows>=5`, `role_order=5`, `close_functions=4`, `close_audit_actions=3`, `sign_denied_roles=4`, `contractor_rows=2`, `close_route_rows>=4`, `sign_route_rows>=6`.

**What the tests cannot prove**

- The close report content. The report holds the period month, the approved submissions, the close row, the reference, and the audit rows (open item Q11). The test proves that the report is stored once and that the reference is set, not its body.
- The report storage. The evidence store is a fake, so the test proves one call and not a stored object.
- The session actor. The route test uses a fake guard. A live session is a deploy check.

**Anti-pattern coverage**

| Task | Anti-patterns | Defense | Falsification condition |
|---|---|---|---|
| 2.1 | A1, A3, A4, A6 | `close_audit_actions=3` and `sign_denied_roles=4` are parsed from the label. The denial is a positive case for each wrong role. | One wrong role passes the sign, or the audit row count is one. |
| 2.1 | A4 | The `FIRST_LIVE_MONTH` case asserts the constant value and the refusal, so the phase cannot pass with no close rule. | A close for `2026-10` opens. |
| 2.2 | A5, A7 | The approve gate widens from the OWNER to the OWNER and the ACCOUNTANT, and the negative cases for the STAFF and the CONTRACTOR stay. | The gate accepts a STAFF. |
| 2.3 | A1, A3, A7 | Each route row is a 403 case with the role named, not an absent case. | A route returns 200 for a wrong role. |
| 2.4 | A5 | The export route file is byte-identical and its own role test is unchanged. | The export route file changed in the phase diff. |

### P3: The Drive intake poll

**Risk: critical.** The phase reads the Drive folder, writes the evidence, writes the intake rows and the submissions, adds the lease, adds the bundled runner, and adds the Cloud Run job and the scheduler. It touches the Vertex route (a non-text PDF, a JPEG, and a PNG), the Drive read, the IAM-adjacent config (the job and the two scheduler grants), and finance data (the submitted documents).

**Review applicability**

| Review | Applies | Reason and scope |
|---|---|---|
| Review A (code) | yes | The phase adds the Drive adapter, the intake domain module, the runner, the bundle stage, and the job step. Review A checks the port boundary, the one code path, the two-pass lookup, the bundle flags, the stage order, and the Dockerfile path rule of D-35. |
| Review B (security) | **yes (required)** | The phase touches the Drive read, the Vertex route, IAM-adjacent config (the Cloud Run job and the scheduler step), the secrets (the `--set-secrets` form), and finance data (the documents). Review B checks the folder id source, the absence of a key file, the secret split, the log content, the lease compare-and-swap, and the rule that no grant command sits in the build file. |
| Review C (UX/API) | no | The phase adds no route and no page. |
| Adversarial testing | yes | A hostile file name, a file over the size limit, a refused type, a Drive listing with a missing field, a lease that a second worker claims, and a duplicate with a different payee. |
| Browser review (UX) | no | The phase changes no page. |

**Red command per task**

```bash
# 3.1 the poll
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/lib/__tests__/drive-intake.test.ts'

# 3.3 the runner, the lease, the image, and the job
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/lib/__tests__/intake-runner.test.ts app/lib/__tests__/intake-runner-image.red.test.ts'
```

**Expected failure at the base**

| Task | File | Expected at the base | Labeled counts |
|---|---|---|---|
| 3.1 | `drive-intake.test.ts` | Exit 1. The message names the missing module `packages/backend/src/modules/accounting/intake.ts` or the missing export `intakeDriveDocument`. | `acceptance_rows>=14`, `duplicate_passes=2`, `scan_cap_default=500` |
| 3.3 | `intake-runner.test.ts` | Exit 1. The message names the missing runner file or the missing export. | `lease_cases>=4`, `dry_start_cases=1` |
| 3.3 | `intake-runner-image.red.test.ts` | Exit 1. The first failing row names the missing stage `runner-bundle`, the missing bundle flags, the missing `COPY` line, or the missing job step. | `image_assertions>=12`, `stage_names=5` |

**Green gate**

- The two commands exit 0 with `tests_failed=0` and `tests_skipped=0`.
- The app suite exits 0. The base is M1.
- The backend accounting suite exits 0. The base is M3.
- The db accounting suite and the journal test exit 0. The base is M4.
- The direct-SDK guard of the AI package exits 0. The base is M6.
- The app-wide `tsc`, the lint run, and the app build run exit 0.
- The bundle run proves the self-contained file:

  ```bash
  HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && rm -rf /tmp/opencode/intake-bundle && mkdir -p /tmp/opencode/intake-bundle && BANNER="import{createRequire as __cr}from\"node:module\";const require=__cr(import.meta.url);" && ../../node_modules/.bin/esbuild app/lib/intake-runner.ts --bundle --platform=node --format=esm --target=node22 --banner:js="$BANNER" --outfile=/tmp/opencode/intake-bundle/intake-runner.mjs && node /tmp/opencode/intake-bundle/intake-runner.mjs --help'
  ```

  The exit code is 0. The usage text prints. The run makes no Drive call, no database call, and no network call. The banner is the banner of FR-24 and the flags are the flags of FR-24, so the local run and the image build hold the same command.
- The image test reads the Dockerfile text and the cloud build text. It does not build the image. The image build runs at deploy time.

**Closeout gate**

1. The Green gate of this phase holds with the quoted counts.
2. `intake_out_of_scope_paths=0`. The allowed paths of this phase: `apps/accounting/app/lib/{drive-document-source.ts,intake-runner.ts,accounting-evidence-store.ts,accounting-intake-document-repository.ts}`, `apps/accounting/app/lib/__tests__/{drive-intake.test.ts,intake-runner.test.ts,intake-runner-image.red.test.ts}`, `packages/backend/src/modules/accounting/{intake.ts,intake-contracts.ts,index.ts,__tests__/**}`, `apps/accounting/app/api/submissions/route.ts` (the byte compare moves into the adapter), `apps/accounting/package.json`, `pnpm-lock.yaml` (the lockfile change of the three planned dependencies, Review A P3 F314), `apps/accounting/Dockerfile`, `apps/accounting/cloudbuild.yaml`, and the track files.
3. `apps/accounting/package.json` gains exactly three dependencies: `googleapis`, `@reading-advantage/ai`, and `esbuild` at `0.28.1`. The count `package_deps_added=3` is a labeled integer.
4. The build file holds no new grant command for the two scheduler grants. The existing `allow-build-invoker` step stays byte-identical (D-20). A byte compare of that step names the count `scheduler_grant_steps=0`.
5. The job step holds all seven secret references in `--set-secrets` and the four plain values in `--set-env-vars`. The counts are `job_secrets=7` and `job_env_vars=4`.
6. The detector of section 1.7 for A9 exits 1, and the detector for A14 holds: no detector of this track uses `rg -nE`.
7. `build-graph update ./graph.db packages/backend/src/modules/accounting/intake.ts apps/accounting/app/lib/intake-runner.ts` runs once (A10).

**Fixtures and mocks**

- The `DocumentSourcePort` is a fake. It returns a list of fake Drive files. Each fake file holds a fake id, a fake name, a fake mime type, a fake byte size, a fake modified time, and a fake byte buffer.
- The `AccountingEvidenceStore` is a fake. It holds a map of reference to bytes, and it counts the calls.
- The `AccountingIntakeDocumentRepository` is a fake. It holds rows in a list and it counts the calls of every member.
- The extraction port is a fake. It records the calls and returns a fake draft.
- The bytes of the fake files are made in the test. No file fixture enters git.

**Mutants**

- A poll that calls the extraction port for a text PDF. Rejected.
- A poll that calls the extraction port for a Google Sheets voucher. Rejected.
- A duplicate lookup that reads the payee or the amount before the byte compare. Rejected.
- A pass 2 that holds a cap. Rejected.
- A pass 1 that reads more rows than the cap. Rejected.
- An intake insert that writes a submit audit row. Rejected.
- A name filter that accepts a file whose name does not match the rule. Rejected.
- A log line that holds the file name, the payee, the amount, or the Drive id. Rejected.
- A lease claim that lets a second worker take the same queue. Rejected.
- A bundle command that holds `--packages=external`. Rejected.
- A bundle outfile that differs from the `COPY` source path. Rejected.
- A job step that puts a secret reference in `--set-env-vars`. Rejected.

**Voucher file name cases (PM-16, 2026-11-12)**

- A file named `ใบสำคัญจ่าย 2026-11.xlsx` with the `.xlsx` MIME type passes the name rule and writes one intake row with the month 2026-11.
- The type of that row comes from the MIME type and the worksheet layout, not from the name.
- A file named `ใบสำคัญจ่าย 2026-13.xlsx` is skipped and writes no intake row and one count log line.
- A poll that calls the extraction port for an `.xlsx` voucher. Rejected.

**Labeled counts and floors**

`acceptance_rows>=14`, `duplicate_passes=2`, `scan_cap_default=500`, `lease_cases>=4`, `dry_start_cases=1`, `image_assertions>=12`, `stage_names=5`, `package_deps_added=3`, `job_secrets=7`, `job_env_vars=4`, `scheduler_grant_steps=0`.

**What the tests cannot prove**

- The real Drive listing and the real file download. The adapter runs against a fake port.
- The real image build. The image test reads text. The bundle run proves the flags and the self-contained file on this machine.
- The real Cloud Run job, the real scheduler, and the real IAM grants. Those are deploy steps and the two scheduler grants are `deferred:pm`.
- The real Vertex call for a non-text PDF. The extraction port is a fake. The model id is blank by default (open item Q8).
- The content of a real document. No test holds one.

**Anti-pattern coverage**

| Task | Anti-patterns | Defense | Falsification condition |
|---|---|---|---|
| 3.1 | A1, A2, A3, A4 | `acceptance_rows>=14` is parsed from the label. Each acceptance row of section 12 has a named case. The log detector scans the rendered log text for the banned tokens. | A row of section 12 has no case, or the log holds a payee. |
| 3.1 | A5, A6 | The duplicate lookup compares the bytes alone, so a case with an equal byte count and a different payee must still be a duplicate. | The lookup misses the duplicate because the payee differs. |
| 3.1 | A4 | The pass 2 case holds a fake history row outside the newest 500 rows. The cap case holds more rows than the cap. | A cap on pass 2 passes the test. |
| 3.2 | A7, A14 | The two-pass lookup calls the byte compare and no scalar field. The scanner for a non-Vertex route uses no English exclusion word. | The lookup reads a scalar field, or the scanner skips a banned line. |
| 3.3 | A3, A4, A5 | `image_assertions>=12` and `stage_names=5` are labeled. The stage names are unique and the last stage is the web stage. | A second stage named `runner` passes, or the last stage is not the web stage. |
| 3.3 | A5, A6 | The bundle run proves exit 0 on the real bundle. A jsdom or text-only pass never claims that the bundle holds every import. | The note says "the bundle is self-contained" on the strength of the text test alone. |
| 3.4 | A5 | The build file holds no new grant command, and the existing invoker step is byte-identical. | A new grant command sits in the build file. |

#### P3 remediation r1 (Review A P3 and Review B P3 at `05ae3b335`)

**Risk: critical.** The group moves live-changing deploy steps out of the push path, changes the duplicate lookup that decides whether a finance document becomes a submission, changes the tenant scope of four `UPDATE` statements, and changes the actor that the poll writes as. The plan holds the tasks 3.6 to 3.12, the finding-to-task map, and the deferred findings with their reasons.

**Base capture.** The Phase 3 `phase_base_sha` stays the value that the orchestrator captured for this phase (`7262366f866462c6efdde55f22b993645a93c65c`). This group does not move it. The orchestrator captures one more value, `r1_base_sha`, with `git rev-parse HEAD` immediately after the commit of this strategy (header `docs(measure): plan the a-52 p3 remediation (track_id: accounting_drive_intake_20261109)`) and before the Red role of task 3.6 starts. A value from before that commit is not valid. The Red evidence of task 3.6 records the full value as its `role_base_sha`.

**Model families.** The Red role of tasks 3.6, 3.8, and 3.10 runs on a model family other than the Green family of tasks 3.7, 3.9, and 3.11. The orchestrator sets the models. The three Red tasks may run in one Red round with three commits, and the three Green tasks in one Green round with three commits, in task order.

**Review applicability for r1**

| Review | Applies | Reason and scope |
|---|---|---|
| Review A (code) | yes | Review A checks the moved steps, the match target of both passes, the pass 1 source, the `application/pdf` gate, the removed casts and aliases, the actor source, the entry catch, and the one `haveSameBytes` definition. |
| Review B (security) | **yes (required)** | The group changes IAM-adjacent deploy config (the new build file and its scheduler step), the tenant scope of four `UPDATE` statements, the poll actor, the data-out gate to Vertex, and the log content of a failed run. Review B checks that a push creates no job and no scheduler, that no Drive id enters git or a log, that neither build file holds a grant, and that every intake `UPDATE` binds `scope_company_id`. |
| Review C (UX/API) | no | The group adds no route and no page. |
| Adversarial testing | yes | A third byte-equal copy, a failed row first in the scan, a hand-made submission copy, an `.xlsx` that a reader sends to the model, an empty substitution, a malformed scan cap, an existing scheduler job, a Drive error that carries an id, a cross-company row id. |
| Browser review (UX) | no | The group changes no page. |

**Red command per task** (the form of plan task 3.1)

```bash
# 3.6 the build file rows
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/lib/__tests__/intake-runner-image.red.test.ts'

# 3.8 the lookup, the data-out, and the intake repository rows
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/lib/__tests__/drive-intake.test.ts app/lib/__tests__/accounting-intake-document-repository.test.ts'

# 3.10 the runner rows
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/lib/__tests__/intake-runner.test.ts'
```

Run each command as its own heavy-run call. Do not chain two stages with `&&`, because an exit 1 of the first stage skips the second stage.

**Expected failure at Red**

| Task | Expected at Red | Labeled counts at Green |
|---|---|---|
| 3.6 | Exit 1. The moved rows fail on the missing file `apps/accounting/cloudbuild-intake-job.yaml`. The push-file row fails on the two steps that the push file still holds. | `push_job_steps=0`, `push_scheduler_steps=0`, `intake_file_steps=3`, `intake_file_grant_steps=0`, `substitution_defaults=0`, `guard_empty_cases=6`, `scheduler_branch_cases=2`, `job_secrets=7`, `job_env_vars=5` |
| 3.8 | Exit 1. The F302 rows give `f302_third_status=parsed` or `f302_new_submissions=1`; the F303 row gives `f303_status=parsed`; the `.xlsx` row counts a model call; the scope rows find no `scope_company_id` in the four `UPDATE` statements. | `f302_third_status=duplicate`, `f302_new_submissions=0`, `f303_status=duplicate`, `f303_new_submissions=0`, `xlsx_model_calls=0`, `scoped_mark_calls>=4`, `scoped_updates=4`, `duplicate_passes=2`, `scan_cap_default=500` |
| 3.10 | Exit 1. The rows fail on the missing exports `readIntakePollActor`, `createPostgresIntakeLeaseRepository`, and `runIntakePollEntry`, or on an assertion. | `lease_cases>=4`, `lease_sql_cases>=3`, `release_calls=1`, `entry_error_cases>=1`, `have_same_bytes_definitions=1`, `files_scanned>=10` |

A row that passes at Red is a named characterization row, and the Red evidence lists it with its reason. No row may fail on a load error or a type error.

**Green gate r1**

- The three Red commands exit 0 with `tests_failed=0` and `tests_skipped=0`, and quote the labeled counts above.
- The original Phase 3 command of plan task 3.1 exits 0. It now also runs the new file `accounting-intake-document-repository.test.ts`.
- `app/lib/__tests__/cloudbuild.red.test.ts` and `app/lib/__tests__/deployment-gates.adversarial.test.ts` exit 0, so the push file still passes its own gates.
- The bundle run of the P3 Green gate exits 0 and prints the usage line.

**Closeout gate r1 (task 3.12)**

1. The Green gate r1 holds. The app suite, the backend accounting suite, the db accounting suite with the journal test, and the direct-SDK guard exit 0, and the note quotes each count and its delta.
2. `tsc --noEmit` in `apps/accounting` and in `packages/backend`, ESLint on the changed files, and `pnpm --filter accounting build` exit 0.
3. `intake_out_of_scope_paths=0` for the r1 commits (the `--grep` rule of section 1.5, from `r1_base_sha`). The r1 allowed paths: `apps/accounting/cloudbuild.yaml`, `apps/accounting/cloudbuild-intake-job.yaml`, `apps/accounting/app/lib/{intake-runner.ts,drive-document-source.ts,accounting-intake-document-repository.ts,monthly-close.ts}`, `packages/backend/src/modules/accounting/intake.ts`, `apps/accounting/app/lib/__tests__/{intake-runner-image.red.test.ts,drive-intake.test.ts,intake-runner.test.ts,accounting-intake-document-repository.test.ts}`, and the track files. A path outside the list needs an orchestrator line in the plan.
4. `rg -n 'gcloud run jobs|gcloud scheduler' apps/accounting/cloudbuild.yaml` exits 1. `rg -n 'add-iam-policy-binding' apps/accounting/cloudbuild-intake-job.yaml` exits 1. An exit code of 2 is a failure (A14).
5. `rg -n 'company_product_principals' apps/accounting/app/lib/intake-runner.ts` exits 1.
6. The A9 detector `rg -n 'measure/tracks|measure/runs' apps/accounting/app/lib/__tests__ packages/backend/src/modules/accounting` exits 1. The Review A scratch fixture stays under `measure/runs` and no test imports it.
7. `build-graph update ./graph.db` runs once over the changed source files (A10).
8. No task of Phase 9 is marked. Tasks 9.3b and 9.7 stay `[ ]`.

**Fixtures and mocks**

- The intake repository fake holds intake rows and seeded submissions, and it returns the submissions through `listRecentSubmissionEvidence`, newest first. It counts the calls of each member and records the `scope` of each mark and bump call.
- The evidence store fake keeps the Phase 3 r2 rule: it reads the object body of spec section 5.4 and compares the bytes.
- The SQL double follows `packages/backend/src/modules/accounting/__tests__/postgres-submission-repository.test.ts:24-40`: it records the joined statement text and the bound values.
- The guard row and the scheduler row run the step scripts with fake values and a stub `gcloud` in a `mkdtemp` folder. No row calls the real `gcloud`, the network, or Google Cloud. The folder is removed after the row.
- The fake Drive id of the entry row is `fake-folder-id-0001`. No real id, amount, or payee enters a fixture.

**Artifact tests and live behavior tests in r1**

- Artifact rows: the step reads, the step order, the substitution defaults, the grant counts, the source token rows (`company_product_principals`, `readIntakeFolderId(`, the entry call), the export list row, and the `haveSameBytes` definition count. They prove file text only.
- Function-level live rows: the guard script run, the scheduler script run with the stub, the F302, F303, F307, F310, and F312 poll rows, the scope rows, the SQL double rows, `readIntakePollActor`, the folder-id rejection, the trap release, and the entry catch. They prove behavior in the test runtime. None proves the real Cloud Build, the real scheduler, the real IAM state, or a real Drive error shape.

**Mutants for r1**

- A push file that keeps either intake step. Rejected by the push-file row.
- A guard that skips one key, or prints a value. Rejected by the six empty-key runs.
- A scheduler step that runs `create` only. Rejected by the describe-success branch.
- A pass 2 that stops on a row with no submission id, or that takes `submissionId` only. Rejected by the F302 rows.
- A pass 1 that reads intake rows instead of submissions. Rejected by the F303 row.
- A `readDocument` that sends an `.xlsx` or a Google Sheet to the model. Rejected by the F307 row.
- An `UPDATE` that binds the row id only. Rejected by the SQL double row.
- A runner that reads the principal table, or takes the role from a value other than the fixed `ACCOUNTANT`. Rejected by the F304 rows.
- An entry with no catch, or a catch that prints the error object. Rejected by the entry row.
- A second `haveSameBytes` definition in `apps/accounting/app`. Rejected by the F311 row.

**Anti-pattern coverage for r1**

| Task | Anti-patterns | Defense | Falsification condition |
|---|---|---|---|
| 3.6 | A3, A4 | Every count is `label=<n>`. The guard row runs six empty-key cases and asserts `guard_empty_cases=6` before the loop. The step reader returns an empty string for a missing step, and each row first asserts that its step text is not empty. | A row passes over an empty step text, or the loop runs zero cases. |
| 3.6 | A5, A7 | The push-file row searches the whole push file for the two command tokens, not only the old step ids. | A renamed step that still runs `gcloud scheduler` passes the row. |
| 3.8 | A4 | The F302 and F303 rows assert the status and `new_submissions=0`, not only the call counts. The scratch rows proved that the call-count rows pass with the defect. | The F302 row passes against the code at `05ae3b335`. |
| 3.8 | A5, A6 | The spec states the narrower D-33 limit (a hand-made submission older than the newest 500 submissions). No note claims a full coverage of hand-made submissions. | A note or the registry claims that every hand-made submission is found. |
| 3.8 | A1 | The scope rows read the bound values of the SQL double, not a word in the statement text alone. | A statement with `scope_company_id` in a comment passes. |
| 3.10 | A4, A5 | The trap row asserts `release_calls=1` after a real rejected run, not the lease expiry only. | The trap row passes with no `runIntakePoll` call. |
| 3.10 | A7 | The F311 row scans every `.ts` file of `apps/accounting/app` and asserts `files_scanned>=10` before the count. | The scan reads zero files and reports one definition. |
| 3.12 | A9, A10, A14 | Closeout items 4 to 7. | A detector exits 2 and the note reads "no hit", or the graph stays stale. |

### P4: The Vertex route and the extraction adapter

**Risk: critical.** The phase changes the credential path of the AI package and adds the only file of this track that names a model provider. A wrong route sends a finance document to a wrong provider. The route must be Vertex and it must use Application Default Credentials.

**Review applicability**

| Review | Applies | Reason and scope |
|---|---|---|
| Review A (code) | yes | The phase changes `packages/ai/src/providers/vertex.ts` and `packages/ai/src/client.ts` and adds the app adapter. Review A checks the optional credential fields, the key-pair path that stays for the current callers, and the port boundary. |
| Review B (security) | **yes (required)** | The phase touches the Vertex route and the credentials. Review B checks that no key pair enters the image or git, that the ADC path passes no `googleAuthOptions.credentials` object, that the adapter names only the vertex provider, and that no test calls a real model. |
| Review C (UX/API) | no | The phase adds no route and no page. |
| Adversarial testing | yes | A model that returns a value outside the schema, an empty model value, a document with a hostile name, and a provider that is not vertex. |
| Browser review (UX) | no | The phase changes no page. |

**Red command per task**

```bash
# 4.1 the ADC path
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/ai && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/__tests__/vertex-adc.test.ts'

# 4.3 the extraction adapter
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/lib/__tests__/document-extraction.test.ts'
```

**Expected failure at the base**

| Task | File | Expected at the base | Labeled counts |
|---|---|---|---|
| 4.1 | `vertex-adc.test.ts` | Exit 1. The message names the thrown error, for example `createAIClient({ provider: "vertex" }) threw ProviderNotConfiguredError without a key pair`. | `adc_cases>=4` |
| 4.3 | `document-extraction.test.ts` | Exit 1. The message names the missing adapter file or the missing export. | `model_paths=3`, `local_paths=2`, `provider_route_cases>=6` |

**Green gate**

- The two commands exit 0 with `tests_failed=0` and `tests_skipped=0`.
- The AI package suite exits 0. The base for the direct-SDK guard is M6.
- The app suite exits 0. The base is M1.
- The backend accounting suite exits 0. The base is M3.
- The app-wide `tsc` and the lint run exit 0.
- The key-pair path of the AI package still builds a client. The existing AI tests cover that path and must stay green.

**Closeout gate**

1. The Green gate of this phase holds with the quoted counts.
2. `intake_out_of_scope_paths=0`. The allowed paths of this phase: `packages/ai/src/providers/vertex.ts`, `packages/ai/src/client.ts`, `packages/ai/src/__tests__/vertex-adc.test.ts`, `apps/accounting/app/lib/document-extraction.ts`, `apps/accounting/app/lib/__tests__/document-extraction.test.ts`, `apps/accounting/package.json`, and the track files.
3. The OpenRouter and Google provider files of the AI package hold an empty diff. The count `other_provider_files_changed=0` is a labeled integer.
4. No test of this track calls a real model. The count `real_model_calls=0` is a labeled integer, and the test asserts that the fake provider served every call.
5. The detector of section 1.7 for A9 exits 1.

**Fixtures and mocks**

- The model is the `MockProvider` of `@reading-advantage/ai` (M13). The test injects a canned response.
- The project id is a fake string and the location is a fake string. No credential value appears.
- The fake document bytes are made in the test.

**Mutants**

- A client that passes a `googleAuthOptions.credentials` object on the ADC path. Rejected.
- A client that throws when the project is present and the key pair is absent. Rejected.
- An adapter that calls the model for a text PDF or for a Google Sheets voucher. Rejected.
- An adapter that sends the document bytes to a provider that is not vertex. Rejected.
- An adapter that fills a value that the model returned empty. Rejected.
- An adapter that sets the marker to `model` on a local read. Rejected.

**Labeled counts and floors**

`adc_cases>=4`, `model_paths=3`, `local_paths=2`, `provider_route_cases>=6`, `other_provider_files_changed=0`, `real_model_calls=0`.

**What the tests cannot prove**

- The real Vertex call, the real Application Default Credentials on Cloud Run, and the real Gemini answer. The IAM grant of the runtime service account is `deferred:pm`.
- The chosen model id. The default is blank (open item Q8). A test cannot name a model that the PM has not chosen.
- The quality of an extracted value. The test proves the marker and the schema, not the reading.

**Anti-pattern coverage**

| Task | Anti-patterns | Defense | Falsification condition |
|---|---|---|---|
| 4.1 | A2, A4 | The ADC case asserts that no credentials object is passed, so the test fails when the key pair is still required. | The client still needs a key pair, or the credentials object is present. |
| 4.3 | A2, A3, A7 | `provider_route_cases>=6` covers the three model paths and the two local paths. The route detector scans the adapter source for a banned provider token. | The adapter names a second provider, or a local path calls the model. |
| 4.4 | A5, A6 | The note says the fake provider served every call. It never says the Vertex route works on the live runtime. | A note claims a live model run from a fake run. |

### P5: The PM first load and the structure report

**Risk: low.** The phase holds no code in this track. The PM runs a script on this machine. The script writes a report outside git and writes no row in the accounting database.

**Review applicability**

| Review | Applies | Reason and scope |
|---|---|---|
| Review A (code) | no | The phase adds no file to this repository. |
| Review B (security) | **yes (required, evidence only)** | The phase touches the Drive read and finance data. Review B reads the phase check evidence and confirms that no real amount, no payee, no name, no Drive id, and no document text entered git, and that the report stays outside git. |
| Review C (UX/API) | no | The phase adds no route and no page. |
| Adversarial testing | no | The phase adds no code to attack. |
| Browser review (UX) | no | The phase changes no page. |

**Red and Green commands**

None. The phase holds no Red task and no Green task. The plan names the two tasks as `deferred:pm` with the evidence class `owner-passed`.

**Closeout gate**

1. The report file exists outside git. The path is named in the phase note.
2. `git log --name-only` of the track commits names only the track files and the allowed code paths.
3. The report holds no real amount. A person reads the report and records `real_amounts_in_report=0`.
4. The `2024` and `2025` folders hold no row. The person records `history_rows_written=0` and `rows_in_accounting_db=0`.
5. The script used no code of this track. The person records `track_functions_called=0`.
6. The parser fixtures of task 6.2 come from the report, and they are fakes only.

**What the tests cannot prove**

- The report content. No test reads it, because it holds real documents.
- The load itself. The script is the PM's own script, outside this repository.

**Anti-pattern coverage**

| Task | Anti-patterns | Defense | Falsification condition |
|---|---|---|---|
| 5.1 | A2, A5, A6 | The phase check is person-checked and writes `real_amounts_in_report=0` and `rows_in_accounting_db=0`. The note names the class `owner-passed`. | The note claims the report holds no amount without a check line. |
| 5.2 | A5, A6 | The report goes to the PM, and the plan records the date of the report. No task claims the report is complete before the date. | The parsers of Phase 6 start before the report date. |
| 5.3 | A10 | The spec section 8 changes with the report date, and the change is a measured fact of that date. | The spec section 8 holds a placeholder row for a type the report names. |

### P6: Document parsing

**Risk: high.** The phase writes the eight parsers and the eight draft schemas from the structure report. The parsers read money and counterparty text from a document, and they set the extraction marker. A wrong parser puts a wrong value into a finance row.

**Review applicability**

| Review | Applies | Reason and scope |
|---|---|---|
| Review A (code) | yes | The phase adds one module with eight parsers and eight schemas. Review A checks the single-file placement, the Zod validation of every draft, the marker on every value, and the read-path routing. |
| Review B (security) | **yes (required)** | The phase touches finance data (the parsed money and counterparty) and the Vertex route (a non-text cloud, Workspace, or OpenAI invoice goes to the model, D-13). Review B checks that the parsers read no other document, that the fixtures hold no real text, and that the model path is the only path that leaves the machine. |
| Review C (UX/API) | no | The phase adds no route and no page. |
| Adversarial testing | yes | A document with a hostile field value, a document with a missing field, a document with a field over the schema limit, and a CSV with a hostile cell. |
| Browser review (UX) | no | The phase changes no page. |

**Red command**

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/backend && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/modules/accounting/__tests__/document-parsing.test.ts'
```

**Expected failure at the base**

| Task | File | Expected at the base | Labeled counts |
|---|---|---|---|
| 6.1 | `document-parsing.test.ts` | Exit 1. The message names the missing module `packages/backend/src/modules/accounting/document-parsing.ts` or a missing parser export. | `parsers=8`, `draft_schemas=8`, `marker_cases>=6`, `read_path_rows>=8` |

**Green gate**

- The command exits 0 with `tests_failed=0` and `tests_skipped=0`.
- The backend accounting suite exits 0. The base is M3.
- The app suite exits 0. The base is M1.
- The app-wide `tsc` and the lint run exit 0.

**Closeout gate**

1. The Green gate of this phase holds with the quoted counts.
2. `intake_out_of_scope_paths=0`. The allowed paths of this phase: `packages/backend/src/modules/accounting/document-parsing.ts`, `packages/backend/src/modules/accounting/__tests__/document-parsing.test.ts`, `packages/backend/src/modules/accounting/index.ts`, and the track files.
3. The spec section 8 holds no placeholder row for a document type that the report names. The count `placeholder_rows_left=0` is a labeled integer.
4. The report date is recorded in the plan note and in the spec. The count `report_date_recorded=1` is a labeled integer.
5. The fixtures hold no real text. The count `real_text_in_fixtures=0` is a labeled integer.

**Fixtures and mocks**

- The parser fixtures come from the structure report and are fakes. A fixture holds a header row, a data row, a money text, a counterparty text, and a document type.
- The reader is a fake. It returns a fake text or a fake CSV row set.
- The marker of every value comes from the read path, not from the parser input.

**Mutants**

- A parser that returns a draft without the marker. Rejected.
- A parser that accepts a value outside the schema. Rejected.
- A parser that sends a text PDF to the model path. Rejected.
- A parser that reads a text cloud, Workspace, or OpenAI invoice locally. Rejected.
- A parser that sends a non-text cloud, Workspace, or OpenAI invoice to the local path. Rejected.
- A parser that fills a missing field with a default value. Rejected.

**Labeled counts and floors**

`parsers=8`, `draft_schemas=8`, `marker_cases>=6`, `read_path_rows>=8`, `placeholder_rows_left=0`, `real_text_in_fixtures=0`.

**What the tests cannot prove**

- The real shape of a real document. The fixtures come from the report, and the report holds sample shapes only.
- The reading quality of the model on a real scan.
- That a real document parses. No real document enters a test.

**Anti-pattern coverage**

| Task | Anti-patterns | Defense | Falsification condition |
|---|---|---|---|
| 6.1 | A1, A3, A4 | `parsers=8` and `draft_schemas=8` are parsed from the label. The missing-module case is an assertion with a message. | One parser or one schema is missing and the file passes. |
| 6.2 | A2, A7 | Every fixture holds a fake counterparty and a fake amount. The marker case asserts the marker on every value. | A fixture holds a real amount, or a value has no marker. |
| 6.2 | A5 | The placeholder-error case is proven with a test double, so no test file is deleted and no Green edit weakens a case. | The real parser case passes without a schema check. |

### P7: The marker, the review surface, and the guards

**Risk: high.** The phase adds the guard module that keeps the extraction route on Vertex and keeps a hash field out, and it adds the intake list that shows finance rows to the OWNER and the ACCOUNTANT.

**Review applicability**

| Review | Applies | Reason and scope |
|---|---|---|
| Review A (code) | yes | The phase adds a component, a listing, and a guard module. Review A checks the component thinness, the guard scanner logic, the fixture placement, and the JSDoc rule. |
| Review B (security) | **yes (required)** | The phase touches roles (the OWNER and the ACCOUNTANT see every row, the CEO sees none of the pending rows) and holds the two security guards (the non-Vertex route and the no-hash rule). Review B reads the scanner logic for an over-broad filter and reads the role rule of the list. |
| Review C (UX/API) | yes | The intake list is a new surface for a reviewer. Review C checks the status labels, the reason text, the marker next to each value, and the link of a content duplicate. |
| Adversarial testing | yes | A row with a hostile reason text, a row with a hostile link target, a marker value that is not in the enum, and a scanner input with a hidden banned token. |
| Browser review (UX) | **yes (required)** | The intake list and the close controls render on the main page. The browser run proves the labels, the marker, the link, the empty state, and the close controls. |

**Red command per task**

```bash
# 7.1 the marker and the lists
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/backend && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/modules/accounting/__tests__/intake-contracts.test.ts'
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/_components/intake-documents-list.test.tsx app/_components/pending-submissions-list.test.tsx app/_components/submission-history-list.test.tsx'

# 7.3 the guards
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/backend && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/modules/accounting/__tests__/intake-architecture-guards.test.ts'

# 7.4a the document month and the zone
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/backend && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/modules/accounting/__tests__/monthly-close.test.ts src/modules/accounting/__tests__/postgres-monthly-close-repository.test.ts'
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/api/submissions/export/route.test.ts'

# 7.4c the transaction
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/backend && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/modules/accounting/__tests__/monthly-close.test.ts src/modules/accounting/__tests__/postgres-monthly-close-repository.test.ts'

# 7.4e the close notes
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/backend && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/modules/accounting/__tests__/monthly-close-notes.test.ts'

# 7.4g the close controls
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/_components/monthly-close-controls.test.tsx app/_components/pending-submissions-list.test.tsx "app/api/monthly-close/[id]/report/route.test.ts"'
```

**Expected failure at the base**

| Task | File | Expected at the base | Labeled counts |
|---|---|---|---|
| 7.1 | `intake-contracts.test.ts` | Exit 1 on the three new marker rows. The earlier rows of the file stay green. | `marker_values=3`, `marker_cases>=3` |
| 7.1 | `intake-documents-list.test.tsx` | Exit 1. The message names the missing component `app/_components/intake-documents-list.tsx`. | `list_rows>=5`, `list_roles=2` |
| 7.3 | `intake-architecture-guards.test.ts` | Exit 1. The message names the missing guard module `packages/backend/src/modules/accounting/intake-architecture-guards.ts`. | `guard_scanners=3`, `counterexample_fixtures=3`, `fixtures_detected=3` |
| 7.4a | `monthly-close.test.ts`, `postgres-monthly-close-repository.test.ts`, `app/api/submissions/export/route.test.ts` | Exit 1. The message names the missing export `accountingMonthInBangkok`, and the repository row names the missing join on `source_month`. | `document_month_rows>=4`, `bangkok_month_cases>=2`, `export_month_rows>=2`, `history_month_rows=1` |
| 7.4c | `monthly-close.test.ts`, `postgres-monthly-close-repository.test.ts` | Exit 1. The message names the missing port member `saveWithAuditEvent`, and the domain row names the missing transaction member of the fake. | `transaction_rows>=3` |
| 7.4e | `monthly-close-notes.test.ts` | Exit 1. The message names the missing export `buildMonthlyCloseNotes`. | `close_note_rows>=7`, `close_note_kinds=4` |
| 7.4g | `monthly-close-controls.test.tsx`, `pending-submissions-list.test.tsx`, `app/api/monthly-close/[id]/report/route.test.ts` | Exit 1. The message names the missing component `app/_components/monthly-close-controls.tsx` and the missing route file. | `close_control_rows>=6`, `accountant_control_rows=2`, `double_click_rows>=1` |

**Green gate**

- The commands of the Red block exit 0 with `tests_failed=0` and `tests_skipped=0`.
- The backend accounting suite exits 0. The base is M3.
- The app suite exits 0. The base is M1.
- The app-wide `tsc`, the lint run, and the app build run exit 0.
- The three scanners run over the new module, the four app adapter files, and the new migration with zero hits. The count `guard_hits=0` is a labeled integer.

**Closeout gate**

1. The Green gate of this phase holds with the quoted counts.
2. `intake_out_of_scope_paths=0`. The allowed paths of this phase: `packages/backend/src/modules/accounting/{intake-architecture-guards.ts,intake-contracts.ts,intake.ts,monthly-close.ts,postgres-monthly-close-repository.ts,index.ts,__tests__/**}`, `packages/backend/src/modules/accounting/__tests__/__fixtures__/**`, `apps/accounting/app/_components/{intake-documents-list.tsx,intake-documents-list.test.tsx,pending-submissions-list.tsx,pending-submissions-list.test.tsx,submission-history-list.tsx,submission-history-list.test.tsx,monthly-close-controls.tsx,monthly-close-controls.test.tsx}`, `apps/accounting/app/api/monthly-close/[id]/report/route.ts`, `apps/accounting/app/api/submissions/export/route.ts`, `apps/accounting/app/api/submissions/export/route.test.ts`, `apps/accounting/app/lib/monthly-close.ts`, `apps/accounting/app/page.tsx`, and the track files.
3. Every row of spec section 12 has a named test file. The count `acceptance_rows_without_test=0` is a labeled integer.
4. Each scanner rejects its own counterexample fixture. The count `fixtures_detected=3` is a labeled integer. A scanner that reports zero hits on its fixture fails the phase.
5. The browser run of the intake list exits 0 with `FAIL=0` and `console_errors=0`.
6. The detector of section 1.7 for A9 exits 1.
7. `build-graph update ./graph.db packages/backend/src/modules/accounting/intake-architecture-guards.ts` runs once (A10).
8. The export route changed in this phase, because the zone step of PM-17 reads the fixed zone `Asia/Bangkok`. The CSV text and the ten headers stay unchanged, and the count `export_headers_changed=0` is a labeled integer.

**Fixtures and mocks**

- The counterexample fixtures live under `packages/backend/src/modules/accounting/__tests__/__fixtures__/`. They are test data. No product code imports them.
- The three fixtures are: a source file that names a banned provider token, a source file with an export that has no JSDoc block, and a migration fragment that holds a checksum column.
- The list test renders the component with fake rows. Each fake row holds a fake status, a fake marker, a fake reason, a fake sighting count, and a fake history marker.
- The close repository fake holds one transaction member for the sign and the lock. The member stages the status change and the audit row, and it applies both or neither.
- The note items are fakes. Each item holds a fake voucher number, a fake tax invoice flag, a fake school invoice version, and a fake total in digits and in words.
- The browser run reads the main page with a signed-in OWNER session. It uses a throwaway database and a seeded account, the pattern of the existing signed-in scripts.

**Mutants**

- A scanner that matches only the lower-case `openrouter`. Rejected.
- A scanner that skips a line because the line holds an English word such as "never". Rejected.
- A JSDoc scanner that reads only the first export of a file. Rejected.
- A JSDoc scanner that accepts a JSDoc block that sits above another symbol. Rejected.
- A hash scanner that misses a `checksum` column. Rejected.
- A list that shows an approve action on a failed row. Rejected.
- A list that shows a pending row to the CEO. Rejected.
- A marker that renders as an empty cell. Rejected.
- A close that reads `submitted_at`. Rejected.
- A month step in UTC. Rejected.
- A status write outside the transaction. Rejected.
- A missing ACCOUNTANT control. Rejected.

**Labeled counts and floors**

`guard_scanners=3`, `counterexample_fixtures=3`, `fixtures_detected=3`, `guard_hits=0`, `marker_values=3`, `marker_cases>=3`, `list_rows>=5`, `list_roles=2`, `acceptance_rows_without_test=0`, `document_month_rows>=4`, `bangkok_month_cases>=2`, `export_month_rows>=2`, `history_month_rows=1`, `transaction_rows>=3`, `close_note_rows>=7`, `close_note_kinds=4`, `close_control_rows>=6`, `accountant_control_rows=2`, `double_click_rows>=1`, `export_headers_changed=0`.

**What the tests cannot prove**

- The browser layout of the intake list. The component test is a jsdom test. The browser run proves the layout.
- The browser layout of the close controls. The component test is a jsdom test, and the browser gate script of the phase proves the layout.
- The scanner catches a banned token that hides inside a comment. The scanner strips comments, so a banned token in a comment is not a hit by design. The rule holds: the product code must not name a banned route in a comment either, and the reviewer reads the comments.
- The JSDoc scanner proves that a block sits above a symbol. It does not prove that the text of the block is correct.

**Anti-pattern coverage**

| Task | Anti-patterns | Defense | Falsification condition |
|---|---|---|---|
| 7.1 | A3, A4 | `list_rows>=5` and `marker_values=3` are parsed from the label. The role rows are positive cases. | A status renders with no label, or a role case is absent. |
| 7.3 | A2, A4, A7 | Each scanner runs over its own counterexample fixture, so a scanner that reports zero hits fails the test. The exclusion filter names no English word. | A scanner passes on its own fixture, or a banned line with the word "never" is skipped. |
| 7.4 | A6 | The guard run reports `guard_hits=0` and the fixture detection count. The note never claims that the scanner proves the whole file. | The note says the track holds no hash field without the scanner count. |
| 7.4a | A3, A4, A5 | `document_month_rows>=4` and `bangkok_month_cases>=2` are parsed from the label. The zone row names the instant and the expected month. | The close reads `submitted_at`, or the month step runs in UTC. |
| 7.4c | A4, A5 | `transaction_rows>=3` is parsed from the label. The fake models one transaction member, and the rollback row asserts the stored status and the audit row count. | A status change lands with no audit row. |
| 7.4e | A3, A4 | `close_note_rows>=7` and `close_note_kinds=4` are parsed from the label. Each kind has one positive row, and the empty case is a positive row. | A kind of item has no row, or a note changes a value. |
| 7.4g | A4, A5 | `close_control_rows>=6` and `accountant_control_rows=2` are parsed from the label. The double-click row counts the requests. | The ACCOUNTANT sees no control, or a double click sends two requests. |
| 7.5 | A5 | The phase check names the test file of every acceptance row of section 12. | An acceptance row has no named test file. |

### P8: The history import

**Risk: critical.** The phase imports the January to October 2026 documents into the app. It writes finance rows. It holds the byte-only duplicate lookup that covers the history rows, and it writes a report that leaves the repository.

**Review applicability**

| Review | Applies | Reason and scope |
|---|---|---|
| Review A (code) | yes | The phase adds the history mode and the dry-run report to the intake module. Review A checks that one function serves both modes, that the naming filter is skipped in the history mode, and that the report builder holds no business rule of its own. |
| Review B (security) | **yes (required)** | The phase touches the Drive read and finance data, and it writes a report that leaves the repository. Review B checks the report content, the byte-only compare, the history marker, and the rule that the production write waits for the owner word. |
| Review C (UX/API) | no | The phase adds no route and no page. The history marker appears on the list of Phase 7. |
| Adversarial testing | yes | A history file with a hostile name, a history file with no parsable month, a history file that no parser matches, and a copy of a history file under a new Drive id. |
| Browser review (UX) | no | The phase changes no page. |

**Red command per task**

```bash
# 8.1 the history mode
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/lib/__tests__/drive-intake-history.test.ts'

# 8.3 the dry-run report
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/lib/__tests__/intake-history-dry-run.test.ts'
```

**Expected failure at the base**

| Task | File | Expected at the base | Labeled counts |
|---|---|---|---|
| 8.1 | `drive-intake-history.test.ts` | Exit 1. The message names the missing export `intakeDriveDocument` for the history mode or the missing `dryRunAccountingIntakeHistory`. | `history_cases>=10`, `mode_values=2`, `history_sources=2` |
| 8.3 | `intake-history-dry-run.test.ts` | Exit 1. The message names the missing export of the report builder. | `dry_run_rows>=5`, `report_lines>=3` |

**Green gate**

- The two commands exit 0 with `tests_failed=0` and `tests_skipped=0`.
- The app suite exits 0. The base is M1.
- The backend accounting suite exits 0. The base is M3.
- The db accounting suite and the journal test exit 0. The base is M4.
- The app-wide `tsc` and the lint run exit 0.

**Closeout gate**

1. The Green gate of this phase holds with the quoted counts.
2. `intake_out_of_scope_paths=0`. The allowed paths of this phase: `packages/backend/src/modules/accounting/{intake.ts,index.ts,__tests__/**}`, `apps/accounting/app/lib/__tests__/{drive-intake-history.test.ts,intake-history-dry-run.test.ts}`, and the track files.
3. One intake function serves both modes. The count `intake_functions=1` is a labeled integer, and the test names the function and the two modes.
4. The report holds no amount, no document content, no payee, no name, and no Drive id. The counts `report_amount_hits=0`, `report_payee_hits=0`, `report_drive_id_hits=0`, and `report_file_name_hits=0` are labeled integers.
5. The dry run writes no row and calls no evidence store. The counts `dry_run_rows_written=0` and `dry_run_evidence_calls=0` are labeled integers.
6. No close row and no sign-off row exists for a past month. The count `past_month_close_rows=0` is a labeled integer.
7. The production write is `deferred:daniel`. The phase note names the owner gate and no test claims the write.
8. The detector of section 1.7 for A9 exits 1.

**Fixtures and mocks**

- The source port is a fake. It holds fake history files. Each fake file holds a fake id, a fake name, a fake folder name, a fake modified time, and a fake byte buffer.
- The evidence store is a fake. The intake repository is a fake.
- The report is a rendered text. The detectors scan that text for the banned tokens.

**Mutants**

- A second intake function for the history mode. Rejected.
- A history mode that applies the naming filter. Rejected.
- A history file whose month comes from the file name when the folder holds a `YYYY-MM` name. Rejected.
- A history file that no parser matches, and the file is imported. Rejected.
- A history row without the history marker. Rejected.
- A copy of a history file under a new Drive id, and the copy becomes a new submission. Rejected.
- A report that holds a file name or an amount. Rejected.
- A dry run that writes a row or calls the evidence store. Rejected.
- A history row that opens a close. Rejected.

**Labeled counts and floors**

`history_cases>=10`, `mode_values=2`, `history_sources=2`, `dry_run_rows>=5`, `report_lines>=3`, `intake_functions=1`, `report_amount_hits=0`, `report_payee_hits=0`, `report_drive_id_hits=0`, `report_file_name_hits=0`, `dry_run_rows_written=0`, `dry_run_evidence_calls=0`, `past_month_close_rows=0`.

**What the tests cannot prove**

- The real history load. The source port is a fake.
- The real report content. The report is built from fake files.
- The production write. It waits for the owner word (`deferred:daniel`).
- The pass-2 coverage of a hand-made submission. That submission has no intake row, so pass 1 covers it only. The limit sits in D-33 and in the registry note.

**Anti-pattern coverage**

| Task | Anti-patterns | Defense | Falsification condition |
|---|---|---|---|
| 8.1 | A1, A2, A4 | `mode_values=2` and `history_cases>=10` are parsed from the label. The one-function case asserts that no second export exists. | A second intake function exists and the case passes. |
| 8.1 | A5, A6 | The copy case holds a fake history row outside the newest 500 rows and a new Drive id with the same bytes. | The copy becomes a new submission. |
| 8.3 | A2, A3, A7 | The report detectors scan the rendered text for the banned tokens. The exclusion filter names no English word. | The report holds a file name or an amount. |
| 8.4 | A2 | The report carries an anonymization marker line, and the gate for the production write reads that marker plus the owner sign-off. | The production write runs on a report with no marker. |
| 8.5 | A5 | The phase check quotes the counts above. The note never claims that the production write ran. | A note claims the history rows are in the database. |

### P9: The deferred work

**Risk: low.** The phase holds no code. Every task is `deferred:pm` or `deferred:daniel`.

**Review applicability**

| Review | Applies | Reason and scope |
|---|---|---|
| Review A (code) | no | The phase adds no file to this repository. |
| Review B (security) | no | The phase adds no code and no secret handling in this track. The IAM grants and the Drive share sit in the PM console and in the PM repository, and their evidence class is person-checked there. |
| Review C (UX/API) | no | The phase adds no route and no page. |
| Adversarial testing | no | The phase adds no code to attack. |
| Browser review (UX) | no | The phase changes no page. |

**Red and Green commands**

None. The phase holds no Red task and no Green task.

**Closeout gate**

1. Every deferred task names an owner and a reason. The count `deferred_tasks_without_owner=0` is a labeled integer.
2. No deferred task added code in this track. `git log --name-only` over the track commits names only the track files and the allowed code paths.
3. No test claims a deferred task. The scan of the test files holds no reference to the grant, the share, the pull job, the Tutor gate, the `PA-INV` source, the role seed, the deploy, or the production write.
4. The task rows keep the structured marker `deferred:<owner>`. A row whose marker is missing fails the count.

**Anti-pattern coverage**

| Task | Anti-patterns | Defense | Falsification condition |
|---|---|---|---|
| 9.1 to 9.9 | A1, A5, A8 | The owner is read from the structured `deferred:<owner>` suffix, never from a free-text word. The evidence class is person-checked or owner-passed. | A row loses its owner marker, or a note claims a deferred task is done. |

### P10: The accountant year files for 2024 and 2025 (PM-24)

**Risk: high.** Task 10.7 is **critical**. The phase adds a new table, a migration, a new Drive walk, a widened intake contract, and a read-only page. Task 10.7 reads the real finance PDFs on this machine and sends a summary out of the repository. The year files create no submission and no close. The phase replaces the old P10 text (the plain `2024` and `2025` folders). Q30 keeps those two folders out of the walk.

**Role base and base capture.** `role_base_sha=e708b36f09fd0fdc93efa68839f2b4834233eacc` (the review-fix commit of the spec addendum). It is not a `phase_base_sha`. The orchestrator captures the Phase 10 `phase_base_sha` with `git rev-parse HEAD` immediately after the commit of this strategy (header `docs(accounting): write the phase 10 test strategy (track_id: accounting_drive_intake_20261109)`) and before the Red role of task 10.1 starts. A value from before that commit is not valid. Phase 10 starts before Phases 4, 6, 7, and 8 close, so the capture point is not "after the previous checkpoint" of section 1.5. The Red evidence of task 10.1 records the full value.

**Order and the date.** Tasks 10.1 to 10.6 run first, in pair order. Task 10.7 sends the summary to the PM by 2026-11-14 18:00. Tasks 10.8 and 10.9 follow after the send. Task 10.10 is `deferred:daniel` for the deploy word and `deferred:pm` for the rest. Task 10.11 runs after task 10.9.

#### P10.1 Measured facts at the role base

Each fact was read at `e708b36f0` with a light read. Red measures each fact again.

| # | Fact | Effect on the tests |
|---|---|---|
| Y1 | `packages/backend/src/modules/accounting/document-parsing.ts` does not exist. `parseWhtFilingPnd3` does not exist. Phase 6 is open. | Task 10.2 cannot "extend" the PND.3 parser. See Q13. |
| Y2 | `accountingIntakeDocumentTypeSchema` holds eight keys and no `wht-filing-pnd3` (`intake-contracts.ts:46-55`). The db check holds the same eight keys (`packages/db/src/accounting/schema/index.ts:187`). | The phase adds eight type keys, not seven: `type_keys_added=8` (Q13 default). |
| Y3 | The request of `intakeDriveDocument` holds `mode: "poll"` only (`intake.ts:317`). The history mode is task 8.2, and task 8.2 is open. | The walk needs the `history` value first. See Q14. |
| Y4 | The check `accounting_intake_documents_history_source_check` allows `drive-folder` and `drive-modified-date` only (`schema/index.ts:202-203`). | A year-file row with `history_source = document` fails this check. Task 10.4 widens it. See Q15. |
| Y5 | The source port member `list` returns files only. The adapter drops every folder entry (`drive-document-source.ts:153-182`). The poll reads the root and, from 2027, the current-year folder. The poll has no customer-folder read today. | The walk needs a folder-listing read. The Q29 skip has no current code to change. See Q16. |
| Y6 | `apps/accounting/app/_components/intake-documents-list.tsx` and its test do not exist. Task 7.1 creates them. | The list row of task 10.3 has no file to join. See Q18. |
| Y7 | The runner wires `unavailableLocalReader` (`apps/accounting/app/lib/intake-runner.ts:267`). The workspace holds no PDF text library. `/usr/bin/pdftotext` and `/usr/bin/pdfinfo` exist on this machine. | Task 10.7 needs a real text-layer reader. See Q17. |
| Y8 | The backend Vitest config has no include list. The app config includes `app/**`. `apps/accounting/scripts/` sits outside the app include globs. | A `.txt` fixture is never a test file. `app/filings/__tests__/` is picked up. The runner script has no unit row. |
| Y9 | The db accounting tests read Drizzle metadata and run no database (`packages/db/src/accounting/__tests__/intake-schema.test.ts`). | `year-file-facts.test.ts` follows the same form. |
| Y10 | `measure/runs/` is in `.gitignore:56`. `git check-ignore -v` exits 0 for the report path of task 10.7. | The report stays out of git. Task 10.7 checks this again before the run. |
| Y11 | `canReadYearFiles` does not exist. `canOpenMonthlyClose` sits at `packages/backend/src/modules/accounting/permissions.ts:161`. | Task 10.9 adds the new check in the permissions module. |

#### P10.2 Risk list

| # | Risk | Tasks | Class |
|---|---|---|---|
| R1 | The report, a log line, or the summary holds an amount, a tax id, a payee, a person name, a file name, or a Drive id. | 10.5, 10.6, 10.7 | critical |
| R2 | The type comes from the file name or the subfolder name, not from the text. | 10.1, 10.2 | high |
| R3 | The BE to CE step gives a wrong year, or the period falls back to the folder name or to `modifiedTime`. | 10.1, 10.2 | high |
| R4 | The dry-run and the import use two walks or two intake functions, so the two lists differ. | 10.3 to 10.6 | high |
| R5 | The walk reads outside the five subfolders or deeper than one level, or the poll reads the five subfolders. | 10.3, 10.4 | high |
| R6 | A year file writes a submission, an audit row of action `submit`, or a close row. | 10.3, 10.4 | high |
| R7 | A voucher matches a year file, a year file matches a submission, or a duplicate row names both targets or neither. | 10.1 to 10.4 | high |
| R8 | A hash field, a checksum column, or a manifest enters the code (Q28). | all | high |
| R9 | The migration uses `ALTER TYPE`, misses the `history_source` check, or leaves the new table out of the tenant registry. | 10.4 | high |
| R10 | The dry-run writes a row, calls the evidence store, or calls a model. | 10.5, 10.6 | high |
| R11 | The live run puts a credential, the folder id, or the report into git, a command line, or a log. | 10.7 | critical |
| R12 | The CEO, the STAFF, or the CONTRACTOR reads the view, or the view holds a write control. | 10.8, 10.9 | medium |
| R13 | A widened contract breaks the poll: the duplicate rule, the source port, the type list, or the `history_source` check. | 10.2, 10.4 | high |
| R14 | Phase 10 runs before Phases 6, 7, and 8, and a Green role writes the code of those phases. | 10.2, 10.4 | medium |

#### P10.3 Review applicability

| Review | Applies | Reason and scope |
|---|---|---|
| Review A (code) | yes | Review A checks the one walk function, the one intake function, the dispatcher, the BE to CE step, the migration form, the tenant classification, and the port shape. It checks that no code of Phases 6, 7, or 8 enters beyond the Q13 to Q16 defaults. |
| Review B (security) | **yes (required)** | The phase touches the Drive read, finance data, a new table, a role gate, and a report that leaves the repository. Review B of the slice 10.3 to 10.6 runs before the summary of task 10.7 leaves this machine (Q19). Review B checks the report and log content, the credential path of the runner, the read-only port, the `EXEMPT` classification, and `canReadYearFiles`. |
| Review C (UX/API) | yes | The phase adds the page "Filings and year end", the read function `listYearFileFacts`, the duplicate display of a year-file row, and a new contract rule on `status = duplicate`. Review C checks the labels, the empty state, the grouping by tax year and form type, and the refusal shape for a refused role. |
| Adversarial testing | yes | See the adversarial cases below. |
| Browser review (UX) | **yes (required, task 10.9 only)** | The view is a new page. The browser run of the Phase 7 gate script covers the view rows (task 10.9). The script does not exist before Phase 7, so the browser review of P10 waits for it and records `blocked-by:7.4h` until then. |

**Adversarial cases.** Each case is a row of the named Red file.

- A subfolder name with a trailing space, or a Unicode lookalike of a name of `YEAR_FILE_FOLDER_NAMES`. The walk does not read it (10.3).
- Two subfolders with the same name of the constant. The walk stops with the safe error (10.3, Q20).
- A PDF two levels deep inside a named subfolder. The walk does not read it (10.3).
- A non-PDF file inside a named subfolder. The walk does not read it (10.3).
- A fixture whose fake file name says `PND53` and whose text says PND.3. The type is PND.3 (10.1).
- A year written in Thai digits. The parser reads the year or gives `period-unreadable`. It never gives a wrong year (10.1).
- A text that holds a Drive-id-shaped string, a tax-id sentinel, and the payee sentinel. No output holds any of them (10.1, 10.5).
- A model fake that throws when it is called. The dry-run finishes with `model_calls=0` (10.5).
- A voucher candidate with the bytes of a year file, and a year file with the bytes of a submission evidence (10.3).
- A CEO actor with the OWNER display name. `canReadYearFiles` refuses it (10.8).

#### P10.4 Test levels per task

Every Red row is a unit row or a function-level live row (section 1.3). No unit row reads the real Drive, makes a network call, or runs a database. The ports are fakes: the source port, the evidence store, the intake repository, the text-layer reader, and the model (`MockProvider` or a fake that throws).

| Task | Level | Evidence class | What the rows prove |
|---|---|---|---|
| 10.1 | Unit, pure functions on fixture text | Function-level live test | The parsers, the dispatcher, the BE to CE step, the null facts, the `period-unreadable` result, the eight type keys, and the duplicate-target rule of the contract. |
| 10.3 walk | Unit with fake ports | Function-level live test | The walk scope, the one walk function, the one intake function, the poll reach, the writes and the non-writes of a year file, the idempotency, and the pass 2 duplicate. |
| 10.3 db | Metadata read of the Drizzle objects and of the migration SQL text | Artifact test | The facts table, its nine columns, the widened checks, the new duplicate column, and no hash column. No migration runs. |
| 10.3 list | jsdom component render | Function-level live test | The year-file duplicate row of the list (Q18). |
| 10.3 tenant | The existing tenant coverage suite | Artifact test | The new table is classified `EXEMPT`. |
| 10.5 | Unit with fake ports and a temp folder | Function-level live test | The report fields, the counts, the duplicate groups, the non-writes, the non-calls, and the banned-token scans of the report and the log. |
| 10.7 | The real runner against the real folder on this machine | Human evidence (person-checked) | The real counts. This is the one live proof of the Drive read, and it proves no correctness of a parser. |
| 10.8 read | Unit with a fake repository | Function-level live test | The grouping, the role gate, and no write call. |
| 10.8 page | jsdom render of the page with a fake reader | Function-level live test | The rows, the marker, the link, and no write control. |
| 10.9 browser | The Phase 7 browser gate script with the view rows | Live behavior in a browser | The layout of the view with a signed-in OWNER and a refused CEO. |

#### P10.5 The fixture rule

- The fixtures sit under `packages/backend/src/modules/accounting/__tests__/__fixtures__/year-files/`. Each fixture is a plain `.txt` file that stands for the text layer of one PDF. No fixture is a PDF.
- Line 1 of each fixture is exactly `no real sample`. The count `fixtures_without_marker=0` is a labeled integer.
- A fixture is synthetic. It holds the public form labels that the parser keys on, a BE year (2567 or 2568), and sentinel values only. No fixture holds a real company figure, a real payee name, a real person name, a real tax id, or a real account number.
- The sentinels are fixed: the amounts `1,234.56`, `7,890.12`, and `100.00`; the payee `Test Counterparty`; the tax id `0000000000000`; the account `000-0-00000-0`; the Drive ids `fake-drive-<n>`; the file names `fake-file-<n>.pdf`. The tests assert that no output holds a sentinel of the payee, the tax id, the account, the Drive id, or the file name.
- No fixture is a copy of the text of a real file. After task 10.7, a fixture may gain a public form label that the report names. It never gains a value from a real file (Q27).
- The app tests of tasks 10.3 and 10.5 build their fake files in memory. A fake file holds `fake-drive-<n>`, `fake-file-<n>.pdf`, a fake folder name, and fake bytes. The fake text-layer reader returns fixture text or `null`.
- Minimum set: one fixture for each of the eight types (`year_file_fixtures>=8`), one with no readable period, one with a Thai-digit year, one with a misleading fake file name, and one PND form with its attachment and its receipt.

#### P10.6 Red and Green pairs

`HEAVY_P2` stands for `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c`. The commands below write it in full. Each command is one heavy job in the foreground. The command of this strategy is the gate. The `pnpm exec vitest` form of the plan rows is not the gate (fact M2).

**Pair 1: tasks 10.1 (Red) and 10.2 (Green).**

```bash
# RED_TEST_COMMAND 10.1
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/backend && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/modules/accounting/__tests__/year-file-parsers.test.ts'

# GREEN_TEST_COMMAND 10.2
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/backend && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/modules/accounting/__tests__/year-file-parsers.test.ts src/modules/accounting/__tests__/intake-contracts.test.ts && ../../node_modules/.bin/tsc --noEmit && cd ../../apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/lib/__tests__/drive-intake.test.ts app/lib/__tests__/accounting-intake-document-repository.test.ts && ../../node_modules/.bin/tsc --noEmit'
```

- Red, expected at the base: exit 1. The message names the missing module `year-file-parsers.ts` or the missing export `parseYearFile`. A bare load error with no named export is a defect of the Red file.
- Labeled counts and floors: `year_file_types=8`, `filing_kinds=4`, `year_file_fixtures>=8`, `fixtures_without_marker=0`, `be_to_ce_cases>=2`, `period_unreadable_rows>=1`, `null_fact_rows>=1`, `type_from_text_rows>=2`, `type_keys_added=8`, `unknown_key_rows>=1`, `duplicate_target_rows=4` (submission only passes, intake document only passes, neither fails, both fail), `banned_fact_rows>=1`.
- Green gate: exit 0, `tests_failed=0`, `tests_skipped=0`. The poll suites stay green, so the widened contract breaks no poll row. Both `tsc` runs exit 0.
- Green guardrail: the new field `duplicateOfIntakeDocumentId` is optional or nullable in the contract at task 10.2, so the app adapter compiles before task 10.4 wires the column. Task 10.2 edits the three files of the plan only (Q13 changes the PND.3 file).

**Pair 2: tasks 10.3 (Red) and 10.4 (Green).**

```bash
# RED_TEST_COMMAND 10.3 (a) the walk
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/lib/__tests__/year-file-walk.test.ts'

# RED_TEST_COMMAND 10.3 (b) the facts table
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/db && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/accounting/__tests__/year-file-facts.test.ts'

# RED_TEST_COMMAND 10.3 (c) the list row; only when the component of task 7.2 exists (Q18)
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/_components/intake-documents-list.test.tsx'

# GREEN_TEST_COMMAND 10.4
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/db && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/accounting/__tests__/year-file-facts.test.ts src/accounting/__tests__/intake-schema.test.ts src/accounting/__tests__/schema-parity.test.ts && ../../node_modules/.bin/tsc --noEmit && cd ../domain && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/__tests__/tenant-coverage.test.ts src/__tests__/accounting-tenant-classification.test.ts && cd ../backend && ../../node_modules/.bin/tsc --noEmit && cd ../../apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/lib/__tests__/year-file-walk.test.ts app/lib/__tests__/drive-intake.test.ts app/lib/__tests__/drive-document-source-query.test.ts app/lib/__tests__/accounting-intake-document-repository.test.ts app/lib/__tests__/intake-runner.test.ts && ../../node_modules/.bin/tsc --noEmit'
```

- Red, expected at the base: exit 1 in (a) and (b). (a) names the missing export `YEAR_FILE_FOLDER_NAMES` or the missing walk function. (b) names the missing table export `accountingYearFileFacts`. The Q16 poll row passes at the base, and the Red evidence names it as a characterization row.
- Labeled counts and floors: `named_subfolders=5`, `subfolders_read=5`, `deeper_list_calls=0`, `unnamed_subfolder_reads=0`, `customer_folder_reads_by_walk=0`, `missing_name_rows>=1`, `poll_year_file_folder_reads=0`, `drive_write_members=0`, `folder_id_output_hits=0`, `walk_functions=1`, `intake_functions=1`, `facts_rows_per_year_file=1`, `submissions_written=0`, `submit_audit_rows=0`, `close_rows=0`, `second_run_rows_added=0`, `duplicate_facts_rows=0`, `voucher_to_year_file_matches=0`, `year_file_to_submission_matches=0`, `unreadable_period_rows_written=0`, `facts_columns=9`, `hash_columns=0`, `document_type_keys=16`, `history_source_values=3`.
- Green gate: exit 0, `tests_failed=0`, `tests_skipped=0`. The poll, the adapter query, the repository, and the runner suites stay green. The three `tsc` runs exit 0.
- Green guardrails: the migration comes from `pnpm --filter @reading-advantage/db accounting:generate` inside `HEAVY_P2`. It uses `DROP CONSTRAINT` and `ADD CONSTRAINT` for both checks and no `ALTER TYPE`. The walk reads the folder listing through a new read member on a separate interface that extends the source port. The existing fakes of the poll tests stay unchanged: `existing_fake_edits=0`.

**Pair 3: tasks 10.5 (Red) and 10.6 (Green).**

```bash
# RED_TEST_COMMAND 10.5
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/lib/__tests__/year-file-dry-run.test.ts'

# GREEN_TEST_COMMAND 10.6
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/lib/__tests__/year-file-dry-run.test.ts app/lib/__tests__/year-file-walk.test.ts && ../../node_modules/.bin/tsc --noEmit && cd ../../packages/backend && ../../node_modules/.bin/tsc --noEmit'
```

- Red, expected at the base: exit 1. The message names the missing export `dryRunAccountingYearFiles`.
- Labeled counts and floors: `dry_run_files>=6`, `report_fields_per_file=9`, `count_sections=7`, `duplicate_groups=1` for the two byte-equal files, `walk_calls=1` per run, `second_walk_functions=0`, `db_writes=0`, `evidence_store_calls=0`, `model_calls=0`, `no_text_layer_rows>=1`, `rerun_count_diffs=0`, `count_log_lines>=2`, and these scans of the report and of every log line: `report_amount_hits=0`, `report_tax_id_hits=0`, `report_payee_hits=0`, `report_person_name_hits=0`, `report_file_name_hits=0`, `report_drive_id_hits=0`, `log_banned_token_hits=0`.
- The report path row: the test passes a `mktemp`-style temp folder and asserts that the report file sits in that folder. The test never holds the string of the `measure/runs` path (A9). The default path of task 10.7 is a runner argument, not a test fact.
- Green gate: exit 0, `tests_failed=0`, `tests_skipped=0`. Both `tsc` runs exit 0.
- Green guardrails: the runner `apps/accounting/scripts/year-file-dry-run.ts` reads the folder id from `ACCOUNTING_DRIVE_FOLDER_ID` and the credentials from the environment. It takes the report folder as an argument. It prints numbers in plain integers with no thousands separator. The text-layer reader follows Q17.

**Task 10.7: the live dry-run (person-checked, no Red and no Green).**

Before the run:

1. `git check-ignore -v measure/runs/accounting_drive_intake_20261109/year-files-dry-run-2026-11-14.md` exits 0.
2. The folder id and the credentials come from the PM channel as environment values. Use `openchamber_secret` `secret.run` when a value is a secret. No value goes on a command line, in a file in the repository, or in a log.

The run, one heavy job (the variables are set in the environment of the job, not in the command text):

```bash
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && ../../node_modules/.bin/tsx scripts/year-file-dry-run.ts /home/daniebo/Desktop/reading-advantage-monorepo/measure/runs/accounting_drive_intake_20261109'
```

After the run, each detector runs on the report file and must exit 1 (zero hits). An exit code of 2 is a failure (A14).

```bash
REPORT=/home/daniebo/Desktop/reading-advantage-monorepo/measure/runs/accounting_drive_intake_20261109/year-files-dry-run-2026-11-14.md
rg -n '[A-Za-z0-9_-]{30,}' "$REPORT"                       # a Drive id; no report token reaches 30 characters
rg -n '[0-9]{13}|[0-9]-[0-9]{4}-[0-9]{5}-[0-9]{2}-[0-9]' "$REPORT"   # a tax id
rg -n '[0-9],[0-9]{3}|[0-9]\.[0-9]{2}' "$REPORT"           # an amount
rg -n -i '\.pdf' "$REPORT"                                  # a file name
```

- Labeled counts: `report_files>=1` (a zero is a defect, A4). The PM scan expects `report_files=118` and the subfolder counts 9, 35, 10, 38, and 26. A difference is a finding for the PM. The run does not change a count to match.
- The person reads the full report for a payee or a person name. No regex proves this. The note records `person_read=1` and the reader role.
- `git status --short --ignored measure/runs/accounting_drive_intake_20261109` shows the report as ignored (`!!`). `git diff --cached --name-only` holds no `measure/runs` path.
- The downloaded bytes stay in memory. A temp file of the text-layer reader goes into a `mktemp -d` folder under `/tmp` with a trap that removes it.
- The summary to the PM holds the counts, the serials of the unmatched files, the serials of the files with no text layer, and the duplicate groups. It holds no value. It leaves after Review B of the slice (Q19).

**Pair 4: tasks 10.8 (Red) and 10.9 (Green).**

```bash
# RED_TEST_COMMAND 10.8 (a) the read function
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/backend && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/modules/accounting/__tests__/year-files-read.test.ts'

# RED_TEST_COMMAND 10.8 (b) the page
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/filings/__tests__/filings-page.test.tsx'

# GREEN_TEST_COMMAND 10.9
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/backend && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/modules/accounting/__tests__/year-files-read.test.ts src/modules/accounting/__tests__/permissions.test.ts && ../../node_modules/.bin/tsc --noEmit && cd ../../apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 app/filings/__tests__/filings-page.test.tsx app/page.test.tsx && ../../node_modules/.bin/tsc --noEmit'
```

- Red, expected at the base: exit 1 in both commands. (a) names the missing export `listYearFileFacts` or `canReadYearFiles`. (b) names the missing module `app/filings/page.tsx`.
- Labeled counts and floors: `read_roles_allowed=2`, `read_roles_refused=3`, `tax_years=2`, `form_type_groups>=2`, `write_calls=0`, `write_control_hits=0` (edit, approve, reject, delete), `history_marker_rows>=1`, `evidence_link_rows>=1`.
- Green gate: exit 0, `tests_failed=0`, `tests_skipped=0`. The `permissions` suite and the main page suite stay green. Both `tsc` runs exit 0. The browser run of the view exits 0 with `FAIL=0` and `console_errors=0` when the Phase 7 script exists. Until then, the browser line is `blocked-by:7.4h`, and the Green note says so.

#### P10.7 Intentionally-red aggregate suites

- The app suite, the backend accounting suite, and the db accounting suite are not gates while a Red file of this phase is open. The open Red files are `year-file-parsers.test.ts`, `year-file-walk.test.ts`, `year-file-facts.test.ts`, `year-file-dry-run.test.ts`, `year-files-read.test.ts`, and `filings-page.test.tsx`, each until its Green task.
- Tasks 10.8 and 10.9 run after the send of task 10.7. The aggregate suites stay red by design between task 10.8 and task 10.9.
- The aggregate base is the last phase-check record of Phase 3. Task 10.11 quotes the new counts and the delta. Tasks 10.1 to 10.6 run the targeted commands only, so the date of task 10.7 holds.
- A list row carried by Q18 is open across Phase 7. Task 10.11 names it with its path and its exit code when it is still red.

#### P10.8 Closeout gate (task 10.11)

```bash
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/accounting && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1'
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/backend && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/modules/accounting'
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/packages/db && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/accounting'
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm --filter accounting run lint'
```

1. Each command exits 0. The note quotes the exit code, the file count, the test count, and the delta from the Phase 3 record. A pre-existing red file outside this track is named with its path and its exit code (`preexisting_red_files=<n>`).
2. `intake_out_of_scope_paths=0`. The allowed paths of this phase: `packages/backend/src/modules/accounting/{year-file-parsers.ts,document-parsing.ts,intake-contracts.ts,intake.ts,year-files.ts,permissions.ts,index.ts}`, `packages/backend/src/modules/accounting/__tests__/{year-file-parsers.test.ts,year-files-read.test.ts,__fixtures__/year-files/**}`, `apps/accounting/app/lib/{drive-document-source.ts,accounting-intake-document-repository.ts}` and one new year-file reader member file there, `apps/accounting/app/lib/__tests__/{year-file-walk.test.ts,year-file-dry-run.test.ts}`, `apps/accounting/app/_components/intake-documents-list.test.tsx` (Q18), `apps/accounting/app/filings/{page.tsx,__tests__/filings-page.test.tsx}`, `apps/accounting/app/page.tsx`, `apps/accounting/scripts/year-file-dry-run.ts`, `packages/db/src/accounting/schema/index.ts`, `packages/db/accounting/drizzle/**` (the one new migration and its meta files), `packages/db/src/accounting/__tests__/year-file-facts.test.ts`, `packages/domain/src/tenant-registry.ts`, the Phase 7 browser gate script when it exists, and the three track files. A commit of another phase of this track inside the window is named by its SHA and is not counted.
3. `dockerfile_changes=0` and `build_file_changes=0`. The phase changes no Dockerfile and no Cloud Build file. No docker or podman build runs.
4. The hash detectors exit 1 over the product files of item 2 and the new migration: `rg -n 'createHash\(|subtle\.digest\(|from "node:crypto"|from "crypto"' <files>` and `rg -n -i '"[a-z_]*(hash|checksum|digest|manifest)[a-z_]*"' <migration> packages/db/src/accounting/schema/index.ts`.
5. The A9 detector exits 1: `rg -n 'measure/(tracks|runs)' <the six P10 test files> packages/backend/src/modules/accounting/__tests__/__fixtures__/year-files`.
6. `walk_functions=1` and `intake_functions=1`. The poll of the root differs only by the skip of the five names: `poll_year_file_folder_reads=0`.
7. `submissions_written=0`, `submit_audit_rows=0`, and `close_rows=0` for a year file, quoted from the green runs.
8. Every new export holds a JSDoc comment. The note lists each new export for the graph update (`graph_update_pending=1`). No `build-graph update` runs today (section 1.1 rule of the orchestrator for 2026-11-13). The update runs at the first closeout after that rule lifts.
9. Task 10.7 holds its person-checked note with the labeled counts. Task 10.10 keeps its two markers. No note claims the production import.

#### P10.9 Mutants

Each mutant must turn at least one row red. A mutant that stays green is a gap, and the Red role adds a row.

- The dispatcher reads the type from the file name or the subfolder name.
- The parser gives 2568 as the CE year, or subtracts 542.
- A file with no readable period takes the month of the folder name or of `modifiedTime`.
- A fact holds the payee sentinel or the tax-id sentinel.
- A duplicate row with both targets, or with neither, passes the contract.
- The walk reads a customer folder, an unnamed folder, or a PDF two levels deep.
- The walk skips a missing name with no error.
- The poll lists one of the five subfolders.
- A year file writes a submission or an audit row of action `submit`.
- A second byte-equal year file writes a facts row.
- A voucher candidate matches a year-file row.
- The dry-run calls `put` on the evidence store, writes a row, or calls the model for a text PDF.
- The dry-run uses its own copy of the walk.
- The report holds `fake-file-<n>.pdf`, `fake-drive-<n>`, or `1,234.56`.
- The view admits the CEO, or it renders a reject control.
- The migration widens the `document_type` check and leaves the `history_source` check unchanged.

#### P10.10 Anti-pattern coverage

| Task | Anti-patterns | Defense | Falsification condition |
|---|---|---|---|
| 10.1 | A3, A4 | `year_file_types=8` and `year_file_fixtures>=8` are parsed from the label. The test asserts the fixture count before the loop over the fixtures. | The loop runs over zero fixtures and exits 0, or a count is a bare number. |
| 10.1 | A7 | The banned-fact scan of the parser output runs over the sentinels and over one counterexample output that holds the payee sentinel. The scan names no English exclusion word. | The scan reports zero hits on its own counterexample. |
| 10.2 | A5 | The Green note quotes the exit code, the file count, the test count, and the labeled counts of the pair 1 Green command. | The note says "pass" and the cited command exits non-zero. |
| 10.3 | A4 | The fake root listing holds `named_subfolders=5` before the walk runs. The walk row asserts `subfolders_read=5`, not only "no error". | The walk reads zero subfolders and the row passes. |
| 10.3 | A5, A6 | The one-function rows assert that no second walk export and no second intake export exist. The poll row is named as a characterization row in the Red evidence (Q16). | A note claims a poll change that the code does not hold. |
| 10.4 | A10 | The note lists the new exports, `graph_update_pending=1`, and the reason (no update today). | A new export is missing from the list. |
| 10.5 | A2 | The report holds the line `anonymized: no amount, no tax id, no payee, no file name, no Drive id`. The summary of task 10.7 leaves only after the detectors and Review B. | The summary reaches the PM with no marker line and no named reviewer. |
| 10.5 | A3, A7 | The report scans count each sentinel. The scan runs once over a counterexample report that holds every sentinel and must find each one. | A scan finds zero hits on the counterexample report. |
| 10.5 | A9 | The report path row uses a temp folder. The test holds no `measure/runs` string. | The A9 detector exits 0. |
| 10.6 | A4, A5 | `dry_run_files>=6` and `walk_calls=1` are parsed from the label. The note quotes the Green command result. | A dry run over an empty listing exits 0 with no files and no error. |
| 10.7 | A2, A5, A14 | The four detectors use `rg -n` with no `-E`. Exit 1 is zero hits, and exit 2 is a failure. The note records `report_files=<n>`, the detector exit codes, `person_read=1`, and the reviewer. | A detector exits 2 and the note reads "no hit", or the note claims the import ran. |
| 10.8 | A4 | The role rows loop over a list of five roles and assert the list size first. | The role loop runs over zero roles. |
| 10.9 | A5, A6 | The browser line of the Green note is `blocked-by:7.4h` until the Phase 7 script exists. No note claims a browser pass that did not run. | A note claims a browser pass with no script output. |
| 10.10 | A1, A5 | The task keeps the structured markers `deferred:daniel` (deploy word) and `deferred:pm` (the rest). No test claims the import. | A note claims the import, or a check reads the word "deferred" from prose. |
| 10.11 | A14, A15, A16 | The detectors of the closeout use `rg -n`. The role receipt holds commits and commands, and no file hash. `git worktree list --porcelain` names one worktree. | A detector exits 2, a receipt holds a file hash, or a second worktree exists. |

A8, A11, A12, and A13 are not risks of this phase, for the reasons of section 1.7.

#### P10.11 What the tests cannot prove

- That a parser reads a real layout. The fixtures are synthetic. Task 10.7 shows the real match rate as counts only.
- That the real Drive listing holds the five names once each. Task 10.7 shows it.
- That a real Drive id is shorter than 30 characters. The Drive id detector of task 10.7 catches an id of 30 or more characters only. The person read covers the rest.
- That the report holds no payee or person name in free text. The report fields are a closed set, and the person read covers the rest.
- The production import, the Vertex read of a scan PDF, and the deploy (`deferred:daniel` and `deferred:pm`).
- The browser layout of the view before the Phase 7 script exists.

## 5. The deferred tasks and what no test claims

| Task | Owner | What no test claims |
|---|---|---|
| The Vertex AI user grant on the runtime service account | `deferred:pm` | No test proves that the grant exists. The ADC test proves that the client builds without a key pair. |
| The Drive folder share to the runtime service account | `deferred:pm` | No test proves the share. The adapter test runs against a fake port. |
| The monthly invoice pull job | `deferred:pm` | No test of this track covers the pull. This track only reads the folder. |
| The Tutor read endpoints and the service-identity gate | `deferred:pm` | No test of this track calls a Tutor endpoint. |
| The `PA-INV` and the Storytime receipt sources | `deferred:pm` | No test of this track reads a school invoice. |
| The Accounts role seed for `CEO` and `CONTRACTOR` | `deferred:pm` | No test proves the seed. The role test uses a fake claim list. |
| The two scheduler IAM grants | `deferred:pm` | No test proves the grants. The build-file test proves that no grant command sits in the build file. |
| The first load and the structure report | `deferred:pm` | No test reads the report. The parser fixtures come from it as fakes. |
| The first deploy of the Cloud Run job and its scheduler | `deferred:daniel` | No test proves the deploy. The image test reads text, the bundle run proves the file, and the guard and scheduler rows of task 3.6 run the step scripts with fake values and a stub `gcloud`. Daniel's deploy word is the gate; the session then runs `apps/accounting/cloudbuild-intake-job.yaml` (PM-20, task 9.7). |
| The scheduler permission of the Cloud Build service account | `deferred:pm` | No test proves the grant. The build-file rows prove that neither build file holds a grant command (PM-23, task 9.3b). |
| The production history write for January to October 2026 | `deferred:daniel` | No test writes a history row. The dry-run test proves that the dry run writes none. |
| The production import of the year files for 2024 and 2025 (task 10.10) | `deferred:daniel` for the deploy word; `deferred:pm` for the rest | No test runs the import. The walk test proves the write shape on fakes, and task 10.7 proves the real counts only. |
| The deploy and the traffic move | `deferred:daniel` | No test of this track moves traffic. |

A deferred task carries no code in this track. No plan note claims a deferred task is done.

## 6. Questions for the orchestrator

The default of each row applies if no answer comes. The orchestrator may change one default before the Red role starts.

| # | Question | Default |
|---|---|---|
| Q1 | The role base. The assignment named `9f784b842864fcb8bcaa25d08429e7c2971743f8` as the role base, and `git rev-parse HEAD` returned `f438d09d72328a94ba04888358d8455419756ea4` at the start of this role. The first value is the spec-review commit and an ancestor of the second. Another session committed on master during this role. | The `phase_base_sha` is the value of `git rev-parse HEAD` after the commit of this strategy and before the Red role starts. The two values above are role-base facts only, and neither is a `phase_base_sha`. |
| Q2 | The capture point of the `phase_base_sha`. | The orchestrator captures it with `git rev-parse HEAD` after the commit of this strategy, after the answers to Q1, Q2, and Q5, and before the Red role starts. The orchestrator records the full value in the Red evidence of Phase 1. |
| Q3 | The dry-run report of the history import lists the unmatched files, and the report holds no payee and no name. A history file name can hold a counterparty. | The report lists each unmatched file by a sequence label, its month, its extension, and its byte size. It holds no file name. The count `report_file_name_hits=0` is asserted. The mapping from the label to the file name stays in the PM channel and never enters this repository, a test, a log line, or a run note. |
| Q4 | The placeholder error `ParsingRulesPending` of task 6.1. The plan names it as a row of the Red file, and task 6.2 fills the parsers in one task. | The Red file proves the placeholder behavior with a test double, so no file is deleted and no case is weakened. The eight real parsers return a draft that matches their schema after task 6.2. A parser of a type the report does not name keeps throwing the named error, and the phase check names that type. |
| Q5 | The count floors of section 1.6 and the labeled counts of each phase. | The floors in this file are the floors. A floor may rise when the Red evidence shows that a case set is larger. A floor may not fall without a note that names the reason. |
| Q6 | The model route for the extraction adapter. The spec names Vertex and the assignment names Vertex only. | The adapter names the vertex provider only. A test that needs a model uses `MockProvider`. No test calls a real model, and the count `real_model_calls=0` is asserted. The Aliyun plan and OpenRouter are never used. |
| Q7 | The Drive folder id. | The folder id comes only from `ACCOUNTING_DRIVE_FOLDER_ID`. No Drive id literal appears in a source file, a test, a fixture, or a log line, and the source scan for a Drive id literal is a detector that must exit 1. |
| Q8 | The hash field. The PM wrote "file hash". The AGENTS.md hashing policy forbids a new hash field. | The track adds no hash field, no checksum column, and no manifest. The identity is the Drive file id, the comparison is a byte compare, and the stored size is the integer `evidence_byte_size`. The no-hash scanner of task 7.4 must find zero hits and must reject its own counterexample fixture. |
| Q9 | The `2024` and `2025` folders (replaced 2026-11-13). | PM-24 replaces the old Phase 10. Q30 of the spec keeps the two old folders out of the walk. The P10 section holds the new strategy. |
| Q10 | The aggregate suite as a gate. | The aggregate suite is not a gate while a Red file of the phase is open. The targeted command of the phase is the gate. At the phase check the aggregate suite runs, and a pre-existing red file outside this track is named with its path and its exit code. |
| Q11 | The browser run of Phase 7. The plan names no browser script for this track. | The Red role of Phase 7 writes one browser gate script for the intake list. It uses a throwaway database, a seeded account, a signed-in OWNER session, and one process group with a trap on exit. It runs inside `HEAVY`. The browser review reads its output. |
| Q12 | The model families of the Red and the Green roles. | The Red and the Green families differ from the family of this strategy role (minimax) and from each other where the quota allows. The orchestrator picks them at the spawn. |
| Q13 | Task 10.2 says "extend `parseWhtFilingPnd3` in `document-parsing.ts`". The file and the parser do not exist (fact Y1), and the key `wht-filing-pnd3` is not in the type list (fact Y2). | Task 10.2 creates `document-parsing.ts` with `parseWhtFilingPnd3` for the year-file layouts only, and adds eight type keys (`type_keys_added=8`). Task 6.1 names its PND.3 row as a characterization row, and task 6.2 extends the same function for the voucher layouts. |
| Q14 | The walk is an input of the `history` mode, and the mode does not exist before task 8.2 (fact Y3). | Task 10.4 adds the `history` value of `mode` with the year-file walk as its only input. Task 8.2 later adds the voucher-history input to the same function. Task 8.1 names the rows that pass at its base as characterization rows. `intake_functions=1` holds. |
| Q15 | The check `accounting_intake_documents_history_source_check` refuses `document` (fact Y4). The plan names only the `document_type` check. | Task 10.4 widens both checks in the one migration with `DROP CONSTRAINT` and `ADD CONSTRAINT`. Task 10.3 (b) pins `history_source_values=3`. |
| Q16 | The poll has no customer-folder read today (fact Y5), so the Q29 skip has no code to change. | The 10.3 poll row asserts `poll_year_file_folder_reads=0` on a listing with the five names and a customer folder. It passes at the base and is a named characterization row. The skip of the five names goes into the code that adds the customer-folder read (Phase 6), and the same row then guards it. |
| Q17 | Task 10.7 needs a real text-layer reader, and the runner wires `unavailableLocalReader` (fact Y7). | The runner of task 10.6 takes a text-layer port. Its real adapter on this machine calls `/usr/bin/pdftotext` through `node:child_process` `execFile` with no shell, and it adds no dependency. Unit rows use a fake. The Cloud Run image does not hold `pdftotext`, so task 10.10 uses the local text-PDF reader of task 6.2. |
| Q18 | The list row of task 10.3 needs `intake-documents-list.tsx`, and task 7.1 creates it (fact Y6). | The row is not on the path of task 10.7. Red 10.3 writes it only when the component exists at its base. Otherwise the row moves to Red 10.8, and the phase check names it. |
| Q19 | The review gate before the summary of task 10.7 leaves this machine. The date is 2026-11-14 18:00. | The run may start before Review B, because the report stays in the ignored folder. The summary leaves only after Review B of the slice 10.3 to 10.6 passes and the four detectors exit 1. When Review B cannot finish by 17:00, the orchestrator tells the PM, and the PM decides. |
| Q20 | Two Drive subfolders hold the same name of `YEAR_FILE_FOLDER_NAMES`. The spec does not say which one the walk reads. | The walk stops with the same safe error as for a missing name. The report names the subfolder name and no Drive id. |
