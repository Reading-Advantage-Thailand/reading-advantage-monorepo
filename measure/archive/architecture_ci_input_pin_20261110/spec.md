# Specification: CI input pin for the architecture check

**Track ID:** `architecture_ci_input_pin_20261110`
**Type:** chore (classic FR list with acceptance checks)
**Status:** new. Opened 2026-11-10.
**Author model:** deepseek/deepseek-flash#high
**Amends:** [backend_architecture_enforcement_20260713](../../archive/backend_architecture_enforcement_20260713/) (archived 2026-07-18; this track does not edit it)
**Owner chain:** Daniel (owner; deploy gate) → Monorepo orchestrator (track owner) → PM orchestrator
**Plan:** [plan.md](./plan.md)
**Depends on:** none.

## 1. Purpose

The CI step "Architecture boundary check" fails on every push. The step runs
`pnpm architecture:check` (`.github/workflows/ci.yml:156-157`) in the job
"Build, Lint, and Test" (`.github/workflows/ci.yml:61`). The architecture check
exits 2 with this message:

```
Architecture check failed: V2 reconciliation manifest is invalid: Analyzer input snapshot hash does not match current bytes
```

CI run 42674322925 (head 0ffffb5a) and CI run 42701037984 (head 17ab2d5ac) hold
this failure. Both runs have the conclusion `failure`.

The command compares the manifest field `analyzerInputSnapshotSha256` with the
current bytes of every analyzed input. A change to one analyzed file breaks the
check until a person refreshes the pin. Commit 221081178 last refreshed the
manifest on 2026-09-08. Every later change to an analyzed file makes the pin
stale.

The PM decided to skip the pin comparison in CI and to keep the pin as a local
command. This track does that. This track amends the archived track and leaves
the archive intact.

The PM decisions, word for word:

> architecture: YES to skipping the pin in CI, in backend_architecture_enforcement_20260713, as a small amendment. The pin stays as a local refresh command. A test must prove that an unlisted new analyzed file still fails.

> Option B. Write a new small track that refers to the archived backend_architecture_enforcement_20260713, and keep the archive intact.

The PM decisions of 2026-11-11, word for word:

> PM DECISION until 11-20: no heavy job may hold the lock longer than 30 min (HEAVY_RUN_TIMEOUT_S 1800 max) except a Storytime p1 job. The pin refresh does not run again until it fits in 30 min.

> Your default is ACCEPTED: a light Build role adds task 1.4a to the spec and the plan; Red on MiniMax with the tree-walk count test (no clock); Green caches the result per module and shares one analysis run (5 passes → 2, 1 copy); manifest fields and the AC-2 guard unchanged; task 1.4 runs again after 1.4a under the 1800 s p2 cap

The PM decision of 2026-11-11 (05:2x), word for word:

> If it exits 124 again at 5400 s, do not retry: go to option B (task 1.4b, checkpoint per module) and tell the PM.

The PM rule until 2026-11-20, word for word:

> no heavy job may hold the lock longer than 30 min (HEAVY_RUN_TIMEOUT_S 1800 max) except a Storytime p1 job.

Round 6 of task 1.4 was PM option A: one run at p1 with a 5400 s cap. It exited 124. The manifest did not change. This track now applies option B (FR-8).

Round 7 of task 1.4 was the first split refresh (task 1.4b). It stopped with exit 124 inside batch 16, which holds 69 minified game bundles from `apps/www-reading-advantage/public/experience/assets`. This track now narrows the analyzer source set (FR-9, task 1.4c) before task 1.4 runs again.

## 2. Evidence (read only, 2026-11-10, at 5062b170e)

- **CI step.** `.github/workflows/ci.yml:156-157`. The step name is
  "Architecture boundary check" and the command is `pnpm architecture:check`.
- **Failure message.** CI run 42701037984, step "Architecture boundary check",
  log line `Architecture check failed: V2 reconciliation manifest is invalid:
  Analyzer input snapshot hash does not match current bytes`.
- **Comparison sites.** `packages/architecture-enforcement/src/v2-manifest-validation.ts:953-960`
  (sync) and `:1026-1030` (async). Both compare `analyzerInputSnapshotSha256`
  with `computeAnalyzerInputSnapshotSha256*`.
- **Fact check.** The brief named `:740-750` as a third comparison site. At
  HEAD 5062b170e, `:740-750` holds `selectV2AnalyzerSourcePaths` (`:740`), not a
  comparison. The comparison has two sites, not three.
- **Pin computation.** `packages/architecture-enforcement/src/v2-manifest-validation.ts:812`
  (async) and `:837` (sync). The snapshot hashes the exact bytes of every
  analyzed input. The path list is `:775-805`.
- **Analyzed files.** Tracked TypeScript and JavaScript files under `apps`,
  `integrations`, `packages`, and `services`
  (`packages/architecture-enforcement/src/inventory.ts:180-197`).
- **Manifest.** `packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json`.
  Commit 221081178 refreshed it on 2026-09-08
  (`git show -s --format='%H %ad %s' 221081178`).
- **Check call.** `packages/architecture-enforcement/src/architecture-check.ts:177-185`
  validates the manifest and throws the CI message.
- **Check CLI.** `packages/architecture-enforcement/src/architecture-check-cli.ts:56-96`
  parses arguments and rejects an unknown argument at `:88`.
- **Other bindings.** The analyzer implementation tree
  (`v2-manifest-validation.ts:937-944`), the implementation and test tree
  (`:945-952`), the report hashes (`:1031-1039`), and the canonical manifest
  source (`:724` and `:961`).
- **Report shape.** `ArchitectureAnalysisResult` holds `sourcePaths`, `findings`,
  and `parseErrors` (`packages/architecture-enforcement/src/analyzer.ts:116-125`).
  The report hash binds the exact source path list. A new analyzed file changes
  the report, even when the file adds no finding.
- **Cost analysis.** `measure/runs/architecture_ci_input_pin_20261110/pin-refresh-cost-analysis.md`
  (2026-11-11) counts 5 analyzer passes, 5 projections, and 3 input snapshot
  hash runs for one refresh. It names the whole-file walk in
  `moduleSpecifierForBinding` as the likely super-linear step.
- **Projection.** `createV2EvidenceSourceProjection`
  (`v2-manifest-validation.ts:294-346`) reads clean HEAD bytes and overlays only
  `packages/architecture-enforcement` candidates. An unrelated dirty file does
  not enter the pin. The test at
  `packages/architecture-enforcement/src/__tests__/baseline-validation.test.ts:435-476`
  proves it.

- **Refresh rounds (2026-11-11).** The refresh cannot finish on this machine.
  Round 2 ran 5 analyzer passes and stopped at the 5400 s cap. Task 1.4a
  (`c8ba91d8c`, `bd474955f`) cut the tree walks and cut the passes to 2, run in
  turn. Round 5 stopped at the 1800 s cap. Round 6 (PM option A, p1, 5400 s cap,
  05:32:37 to 07:02:38) exited 124 with 3 output lines and no preview line. The
  manifest did not change. The refresh prints no progress, so the time of each
  step is unknown. See plan task 1.4,
  `measure/runs/architecture_ci_input_pin_20261110/green-p1-1.4.log`, and
  `measure/runs/architecture_ci_input_pin_20261110/pin-refresh-cost-analysis.md`.
- **Module unit (FR-8).** `analyzeArchitectureSources`
  (`packages/architecture-enforcement/src/analyzer.ts:2467-2973`) has two parts.
  - The prelude (`analyzer.ts:2470-2525`) is global. It loads and parses every file
    (`loadArchitectureSourceDetails`, called at `:2471`, defined at `:881`), collects
    the table exports (`:2475`), parses one `ParsedArchitectureModule` for each
    path (loop `:2505-2518`, interface `:1149-1158`), and runs the cross-module
    fixed point `computeBindingOrigins` (called at `:2519`, defined at `:1492`).
    The prelude cannot split by module.
  - The module loop `for (const module of modules)` (`analyzer.ts:2597`, body to
    `:2966`) reads the prelude output and writes findings only through
    `addFinding` (`:2529-2595`). The `instanceKey` of a finding holds the
    `sourcePath` (`finding-identity.ts:72-77`), and the `rawFindingKey` holds it
    too (`analyzer.ts:2567-2576`). One iteration changes only the `locals` map of
    its own module (`:2615`). The findings of a module depend on the prelude and on
    that module only. One iteration is the module unit.
  - The result is `{schemaVersion, sourcePaths, findings, parseErrors}` with the
    findings sorted by `compareFindings` (`analyzer.ts:2459-2464` and
    `:2967-2972`).
- **Evidence code (FR-8).** `computeAnalyzerReconciliationEvidence`
  (`v2-manifest-validation.ts:867-901`) makes 1 projection (`:871`), runs 2 passes
  in turn (`:874-884`), compares the two report byte strings (`:885`), and computes
  the input snapshot over the same projection (`:892`;
  `computeInputSnapshotForProjection` at `:824`). The refresh CLI calls it at
  `architecture-pin-refresh-cli.ts:147-150`. It then checks `parseErrors`
  (`:151-155`), computes the tree hashes (`:160-163`), previews or writes
  (`:178-190`), and validates (`:191-195`). Its return type is `0 | 1 | 2` (`:135`).
- **Projection identity.** The projection holds HEAD bytes plus the bytes of every
  changed or untracked file under `packages/architecture-enforcement`
  (`listCodingCandidatePaths`, `v2-manifest-validation.ts:220-246`; overlay loop at
  `:339-348`). HEAD alone names the projection only when that candidate list is
  empty.
- **Test seam.** The cost test mocks `analyzeArchitectureSources` and counts its
  calls (`architecture-analyzer-cost.test.ts:126-135`). AC-7 expects 2 calls for one
  refresh. The checkpoint option therefore goes through `analyzeArchitectureSources`.
- **Exit codes in use.** `heavy-run.sh` uses 2, 64, 70, 75, 76, 77, 78, 124, and 201
  (`/home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh:80-84`). The CLI
  uses 0, 1, and 2.
- **Ignore rule.** `.gitignore:42` holds `.cache`. `git check-ignore -v
  .cache/architecture-pin-refresh/checkpoint.json` reports that line.

## 3. Decisions

- **D-1 (CI mode selector). DECIDED (orchestrator, 2026-11-10).** CI mode is the
  explicit CLI flag `--skip-input-snapshot-pin` on `pnpm architecture:check`.
  The step at `.github/workflows/ci.yml:157` passes the flag. No environment
  variable selects the mode. Without the flag, the command is the full local
  check and keeps the pin comparison.
- **D-2 (the PM test line). DECIDED (orchestrator, 2026-11-10).** The PM line
  "A test must prove that an unlisted new analyzed file still fails." holds for
  every new analyzed file, clean or not. Reason: the analyzer report holds the
  exact source path list (`analyzer.ts:116-125`), and CI mode keeps the report
  hash. A byte change in an existing analyzed file passes when the path list,
  the findings, and the parse errors do not change. This track adds no field.
- **D-3 (the refresh command). DECIDED (orchestrator, 2026-11-10).** The local
  refresh command is `pnpm architecture:pin:refresh`. Without `--acknowledge`
  it prints the old and new values and writes nothing. With `--acknowledge` it
  writes the manifest. It refreshes five fields:
  `analyzerInputSnapshotSha256`, `analyzerImplementationTreeSha256`,
  `implementationAndTestTreeSha256`, `reportSha256s`, and
  `reviewSubjectSha256`. The round 2 review confirms the five-field scope.
  `reviewSubjectSha256` binds all protected fields
  (`v2-manifest-validation.ts:606-616`), so a refresh of the other four must
  recompute it.
- **D-4 (the refresh order). DECIDED (orchestrator, 2026-11-10).** The Green
  code commits first. The refresh runs at that clean HEAD. The refreshed
  manifest is the last Green commit. Reason: the projection reads HEAD bytes for
  every path outside `packages/architecture-enforcement`, so a refresh before
  the code commit cannot see the root `package.json` change.
- **D-5 (the archive). DECIDED (PM, 2026-11-10).** The archive stays intact. No
  file in `measure/archive/backend_architecture_enforcement_20260713/` changes.
- **D-6 (the hash policy). DECIDED (orchestrator, 2026-11-10).** This track adds
  no hash field. It narrows where the existing pin comparison runs
  (`AGENTS.md:80-94`).
- **D-7 (the refresh cost). DECIDED (PM, 2026-11-11).** A light Build role adds
  task 1.4a to this spec and the plan. Red runs on the MiniMax model family with
  the tree-walk count test. The test reads no clock. Green caches the binding
  result for each module and shares one analysis run. The passes go from 5 to 2.
  The projections go from 5 to 1. The manifest fields and the AC-2 guard stay
  unchanged. Task 1.4 runs again after task 1.4a under the 1800 s p2 cap.
- **D-8 (the resumable refresh). DECIDED (PM, 2026-11-11, 05:2x; details by the
  Build role).** Round 6 exited 124 at 5400 s, so the PM ordered option B: task
  1.4b, a checkpoint for each module. The module unit is one iteration of the
  loop at `analyzer.ts:2597`. The checkpoint store is
  `.cache/architecture-pin-refresh/checkpoint.json` under the repository root,
  which `.gitignore:42` ignores. The store is valid for one full HEAD commit. A run
  stops before its time budget (`--budget-s`, default 1500) and exits with code 3.
  The manifest changes only when the last module of the last pass is done. Reason:
  the PM cap is 1800 s for one heavy job, and the refresh needs more time than one
  run has.
- **D-9 (the partial exit code). DECIDED (Build role, 2026-11-11).** The code for
  "partial, run again" is 3. The codes 75, 77, 124, and 201 belong to `heavy-run.sh`
  (`heavy-run.sh:80-84`). The code 2 stays "failure". Code 3 means that the run
  stored at least one new module.
- **D-10 (static public assets). DECIDED (orchestrator, 2026-11-11, after round 7;
  details by the Build role).** The architecture inventory ignores every tracked
  file under `apps/<app>/public/`. The rule is a separate rule in
  `isIgnoredPath` (`inventory.ts:143-153`), not a new member of
  `GENERATED_WORKSPACE_DIRECTORIES` (`inventory.ts:16-25`). Reason: the set holds
  generated or dependency directories, and `public/` holds tracked static assets
  that an app serves as-is. A member of that set would also ignore `public` under
  `packages/<name>`, `services/<name>`, and `integrations/<name>`, and no round 7
  fact supports that change. The rule matches the directory at the app level
  only. Task 1.4c carries it, before task 1.4 runs again. The rule is input
  selection, not a finding exemption (see FR-9.4).

- **D-11 (the v1 debt baseline). DECIDED (PM, 2026-11-11, after the r9 preview at `ed10bc39d`).**
  The PM wrote, word for word: "1. Baseline ALL 332 additions now (with the 16 removals and 161 renames), so the architecture step can go green and per-app CD is not blocked. Owner: \"Monorepo session (architecture owner), approved by the PM 2026-11-11\". Rationale, by class: DATABASE_BOUNDARY 205 + DURABLE_JOB_DATABASE_BOUNDARY 16: pre-existing debt (commits 2026-07-19 to 2026-10-14, before this track), part of the tech-debt entry on the 294 legacy API routes. COMPANY_IDENTITY_PRODUCT_ISOLATION 93 + COMPANY_IDENTITY_DB_BOUNDARY 5 + AI_PROVIDER_BOUNDARY 11 + INTEGRATION_PROVIDER_BOUNDARY 2: pre-existing debt, accepted only until the remediation track below closes; name that track id in the rationale. 2. Open a remediation track (build session: yes, my word) for the 111 auth/identity and provider-adapter findings: P2, starts after the 11-20 Storytime release, done-when the 111 are fixed and removed from the baseline, due 2026-12-15. A new finding of these rules still fails CI (the baseline freezes only the old ones). 3. Then one more pin refresh check, architecture:check, and task 1.5, on the routes your plan names."
  The baseline command is `pnpm architecture:baseline:update --acknowledge --owner <id> --rationale <text>`.
  The owner field accepts only a lower-case id (`contracts.ts:7` and `:81`: `/^[a-z0-9][a-z0-9_-]*$/`),
  so the PM owner text cannot go in the field. **Deviation:** the owner id is `monorepo-architecture`, and
  the PM owner text goes into the rationale (12 to 1000 characters, `contracts.ts:82`). The remediation
  track is `architecture_identity_provider_debt_20261111` (P2, start not before 2026-11-21, due 2026-12-15).
  Task 1.4d carries the baseline step. Task 1.4 then runs its series again (item 3 of the decision).

## 4. Functional requirements

### FR-1 CI mode skips only the input snapshot pin

`pnpm architecture:check --skip-input-snapshot-pin` skips the two comparisons of
`analyzerInputSnapshotSha256` (`v2-manifest-validation.ts:953-960` and
`:1026-1030`). The option flows from the CLI (`architecture-check-cli.ts:56-96`)
through `checkArchitectureRepository` (`architecture-check.ts:67-80`) to
`validateAnalyzerReconciliationManifestV2`. The new input field is
`validateInputSnapshotPin?: boolean`. Its default is `true`.

### FR-2 Every other check stays

CI mode keeps every other manifest and boundary check:

- the analyzer implementation tree comparison
  (`v2-manifest-validation.ts:937-944`);
- the implementation and test tree comparison (`:945-952`);
- the report hash comparison (`:1031-1039`);
- the canonical manifest source (`:724` and `:961`);
- the v2 artifact family and the v1 binding;
- the debt comparison against the baselines;
- the tenant and provider guard step (`.github/workflows/ci.yml:159-165`).

A stale implementation tree still fails in CI mode. A new analyzed file still
fails, because the analyzer report holds the exact source path list
(`analyzer.ts:116-125`) and CI mode keeps the report hash binding. A byte change
in an existing file passes when the findings and the parse errors do not change.

### FR-3 The pin stays local

`pnpm architecture:check` without the flag keeps the pin comparison. The pin
stays the guard for a local full check.

### FR-4 The refresh command

A new CLI `packages/architecture-enforcement/src/architecture-pin-refresh-cli.ts`
implements the refresh. The root script is `architecture:pin:refresh`
(`package.json`). The package script is `pin:refresh`
(`packages/architecture-enforcement/package.json`). The command:

1. reads the manifest;
2. computes the five values of D-3 from the current bytes;
3. prints every old value and every new value;
4. writes nothing and exits 1 when a value differs, without `--acknowledge`;
5. writes the manifest and exits 0 with `--acknowledge`;
6. writes the canonical pretty JSON with one trailing newline;
7. exits 2 and writes nothing on an analysis error.

The command writes the manifest, then validates it. A validation failure restores
the old bytes and exits 2. The command is not in the CI step.

### FR-5 CI wiring

The step at `.github/workflows/ci.yml:156-157` runs
`pnpm architecture:check --skip-input-snapshot-pin`. The local command keeps no
flag. No environment variable selects the mode.

### FR-6 Documentation

`docs/architecture-enforcement.md` records the CI mode, the local full check,
and the refresh command. It keeps the rule that CI never runs the
baseline-update command.

### FR-7 The refresh cost: one analysis per refresh

`moduleSpecifierForBinding` (`analyzer.ts:1913-1944`) walks the whole source
file with `ts.forEachChild`. The analyzer calls it once for each member-access
node, from `analyzer.ts:1999` inside the loops at `analyzer.ts:2775` and
`analyzer.ts:2856`. A module with N member-access nodes pays N whole-file walks.

The fix stores the module facts once for each module. The store holds the static
module specifier for each local binding. The call at `analyzer.ts:1999` reads
the store and stops the whole-file walk.

One refresh makes 1 source projection and 2 analyzer report passes. Its
validation reuses that evidence. The validation adds no pass and no projection.
The current command makes 5 passes and 5 projections.

The manifest fields stay the same. `V2_MANIFEST_KEYS` and the strict key check
do not change. The AC-2 guard stays: an unlisted new analyzed file still fails.

The proof counts tree walks, passes, and projections with spies or counters.
The proof never reads clock time.

### FR-8 The resumable refresh

A refresh that ends inside its time budget follows FR-4 and FR-7. A refresh that
needs more time runs as a series of runs. FR-4 and FR-7 hold for the series. This
requirement adds the points below. The module unit is one iteration of the loop at
`analyzer.ts:2597` (spec section 2, "Module unit").

**FR-8.1 Arguments.** The command is
`pnpm architecture:pin:refresh [--acknowledge] [--budget-s <n>]`. The value `<n>` is
a positive whole number of seconds. The default is 1500, so that a run fits the 1800 s
cap with a margin. `PinRefreshCliOptions` holds `budgetSeconds`. The parser rejects
any other argument or value as it does today
(`architecture-pin-refresh-cli.ts:70-86`).

**FR-8.2 Progress.** Each run prints one labeled line through `writeStdout` for each
step and for each module batch. The prefix is `architecture pin refresh: `. The
formats are:

- `step=<name> elapsed_s=<n>` at the end of a step. For the step `prelude`, the
  line also holds `pass=<1|2>`. The names are `store`, `projection`, `prelude`,
  `combine`, `input_snapshot`, `trees`, and `validate`.
- `step=modules pass=<1|2> modules_done=<n> modules_total=<n> elapsed_s=<n>` after
  each batch. The value `modules_done` counts every module of that pass that the
  store holds.
- `partial pass=<1|2> modules_done=<n> modules_total=<n>; run again with the same
  arguments` before exit code 3.

The value `elapsed_s` is whole seconds since the start of the run. The clock is
`PinRefreshCliDependencies.now` (default `Date.now`).

**FR-8.3 The checkpoint in the analyzer.** `AnalyzeArchitectureSourcesOptions` gets one
optional field, `moduleCheckpoint?: ArchitectureModuleCheckpoint`:

- `done: ReadonlyMap<string, readonly ArchitectureFinding[]>`: findings of modules
  that an earlier run finished, by source path;
- `batchModules: number`: the batch size (default 250);
- `shouldContinue(): boolean`: the analyzer calls it before each batch, the first
  batch included;
- `onBatch(results, modulesDone, modulesTotal): void | Promise<void>`: the analyzer
  calls it after each batch with the new findings of that batch;
- `onModuleAnalyzed?(sourcePath: string): void`: a test seam. The analyzer calls it
  once for each module that it analyzes in this call, and never for a stored module.

`PinRefreshCliDependencies` gets `now?: () => number` (milliseconds),
`batchModules?: number`, and `onModuleAnalyzed?(pass: 1 | 2, sourcePath: string): void`.
The CLI forwards them to `moduleCheckpoint`.

With the option, `analyzeArchitectureSources` runs the prelude in full. When the
prelude holds a parse error, it skips the module loop and returns the parse errors.
Otherwise it walks `modules` in the order of the sorted source paths
(`analyzer.ts:885-887`), skips each module in `done`, and analyzes the others in
batches. When `shouldContinue()` returns false and a module is left, it throws the
exported class `ArchitectureAnalysisStopped`. The class holds `modulesDone` and
`modulesTotal`. Without the option, the function behaves as at HEAD and returns the
same bytes.

The analyzer exports `analyzeArchitectureModuleFindings` (the loop body, with one
finding map for each module) and
`assembleArchitectureAnalysis(sourcePaths, parseErrors, findingsByModule)`. The second
function merges the findings by `instanceKey`, sorts them with `compareFindings`, and
returns `{schemaVersion, sourcePaths, findings, parseErrors}` with the same key order
as `analyzer.ts:2967-2972`. `analyzeArchitectureSources` uses both functions for its
own result.

**FR-8.4 The checkpoint store.** The path is
`.cache/architecture-pin-refresh/checkpoint.json` under the repository root.
`.gitignore:42` (`.cache`) ignores it, so the store is outside git and `.gitignore`
does not change. The JSON holds:

```
{ "version": 1, "headCommit": "<40 hex>", "candidatePaths": [],
  "sourcePaths": ["..."],
  "passes": [ { "modules": { "<sourcePath>": [ finding ] } }, { "modules": {} } ] }
```

- `passes[0]` is pass 1 and `passes[1]` is pass 2. A pass is complete when `modules`
  holds one key for each entry of `sourcePaths`.
- The store holds no hash, no checksum, and no key with `hash`, `sha256`, or
  `checksum` in its name. `headCommit` is the Git commit identity from
  `git rev-parse HEAD`. A store never holds a parse error, because a parse error ends
  the refresh with exit code 2.
- The run writes the store after each batch. It writes `checkpoint.json.tmp` in the
  same folder, then renames it, so a stop in the middle of a write leaves the old
  store intact.
- The run reads the store at its start and discards it when any of these holds: the
  file is unreadable or is not valid JSON; `version` is not 1; `headCommit` differs
  from the HEAD of this run; `candidatePaths` is not empty; `sourcePaths` differs
  from `sourcePaths` of the projection of this run. A discard deletes the file and
  prints `checkpoint=discarded reason=<head_changed|unreadable|version|candidate_overlay|source_paths>`.
- When `listCodingCandidatePaths` (`v2-manifest-validation.ts:220-246`) returns a
  path, the projection holds bytes that no commit names. The run then neither reads nor
  writes the store, ignores the budget, runs as one run (FR-4 and FR-7), and prints
  `checkpoint=off reason=candidate_overlay`.
- After a successful manifest write (exit 0 with `--acknowledge`), the run deletes
  the store. After a complete preview (exit 0 or 1), the run keeps the store, so a
  later `--acknowledge` run needs only the combine step. After a parse error, the
  run deletes the store. A store from a preview run serves an `--acknowledge` run, and
  the reverse.

**FR-8.5 The time budget.** The run clock starts with the run.
`shouldContinue()` returns true only when `elapsed_s < budget_s` and, after the first
batch of the run, `elapsed_s + longest_batch_s <= budget_s`. The value `longest_batch_s`
is the longest batch of this run. The run saves the store before each next call of
`shouldContinue()`. A run that stops with at least one new module stored exits with
code 3. A run that stops with no new module exits 2 and prints the cause, because
code 3 must mean progress. An exit 3 run writes nothing in the manifest, with or
without `--acknowledge`.

**FR-8.6 Resume.** The next run reads the store and analyzes only the modules that
the store does not hold. It handles pass 1 first and pass 2 after pass 1 is complete.
Each pass attempt makes its own prelude, as each pass does today, so the two passes
stay independent for the byte-identity check. A run whose store holds both complete
passes makes no analyzer call and no prelude.

**FR-8.7 The last run.** When both passes are complete, the run assembles the report
of each pass with `assembleArchitectureAnalysis` from the store. It compares the two
report byte strings. A difference ends with exit code 2, the message "Analyzer reports
are not byte-identical", and no manifest write. Then it computes `reportSha256` and the
input snapshot with the functions that `computeAnalyzerReconciliationEvidence` uses
(`v2-manifest-validation.ts:891-896`), over the projection of this run. The new exported
function `computeAnalyzerReconciliationEvidenceResumable` returns
`{status: "complete", evidence}` or `{status: "partial", pass, modulesDone,
modulesTotal, newModules}`. The CLI then follows FR-4: trees, preview or write, and
validation with the same `evidence`. `computeAnalyzerReconciliationEvidence` stays
unchanged. The return type of `runArchitecturePinRefreshCli` becomes `0 | 1 | 2 | 3`.

**FR-8.8 The contract stays.** The manifest of a split refresh equals the manifest of
one full run, field by field. The key set equals `V2_MANIFEST_KEYS`. AC-2 and AC-8 hold.
No hash field is new.

**FR-8.9 The cost counts.** A refresh of R runs makes R source projections, one for each
run. Over the whole series, each module is analyzed once for each pass, so the series
makes 2 × N module analyses for N modules. Each run makes at most 2 analyzer calls and
one prelude for each pass that it touches. One walk for each module and each prelude
stays (AC-6). The input snapshot runs once, in the last run. The validation adds no
projection and no analyzer call. A refresh that fits in one run keeps the FR-7 counts:
1 projection and 2 analyzer calls.

**FR-8.10 Documentation.** `docs/architecture-enforcement.md` names `--budget-s`, the
store path, and exit code 3.

### FR-9 Static public assets are not analyzer inputs

The inventory ignores every tracked file under `apps/<app>/public/`. The refresh
then analyzes fewer modules, and it does not spend its time budget on minified
bundles.

**Evidence (read only, 2026-11-11, at `ca7b1f4e1`).**

- Round 7 stored 3750 of 6936 pass-1 modules in 76 s, about 5 s for each batch of 250
  modules. Batch 16 (indices 3750 to 3999) did not finish in the remaining 29 minutes.
  It holds 69 minified game bundles (3,049,795 bytes), for example
  `phaser.esm-kk0bm_Sx.js` (1,377,429 bytes) and `hud-CK-u5dw1.js` (794,685 bytes).
- `git ls-files 'apps/*/public/**/*.js'` and the `.mjs` form list 70 tracked files. The
  list of all tracked files under `apps/*/public/` that match
  `SOURCE_FILE_PATTERN` (`inventory.ts:15`, `/\.[cm]?[jt]sx?$/`) holds the same 70
  files. No tracked file under any other root matches `/public/` and the pattern.
- No baseline file in `packages/architecture-enforcement/src/config` names a path
  under `/public/`, so the rule removes no reviewed finding.
- The only imports of a `public/` path in tracked source are images (`.webp`, `.svg`),
  for example `apps/reading-advantage/components/ui/toaster.tsx:13-16`. No tracked source
  imports a `.js` file from `public/`.

| App | Files | Bytes |
| --- | --- | --- |
| `www-reading-advantage` (all under `public/experience/assets`) | 69 | 3,049,795 |
| `primary-advantage` (`public/serwist/sw.js`) | 1 | 3,080 |
| Total | 70 | 3,052,875 |

**FR-9.1 The rule.** `isIgnoredPath` (`inventory.ts:143-153`) gets one new line after the
`node_modules` line (`inventory.ts:145`). The line returns true when `segments[0]` is
`"apps"`, `segments[2]` is `"public"`, and the path holds more than 3 segments. A new
constant `STATIC_ASSET_DIRECTORY = "public"` sits next to
`GENERATED_WORKSPACE_DIRECTORIES` (`inventory.ts:16-25`). The set
`GENERATED_WORKSPACE_DIRECTORIES` does not change. `isIgnoredPath` is the only function
that changes, and `selectArchitectureSourceFiles` (`inventory.ts:180-197`) calls it, so
the rule needs no second edit. The JSDoc of `isIgnoredPath` names the new case.

**FR-9.2 The callers.** The analyzer, the v2 source projection
(`selectV2AnalyzerSourcePaths`, `v2-manifest-validation.ts:762-772`), the check
(`architecture-check.ts:202`), and the reconciliation (`architecture-reconciliation.ts:304`)
all take their source list from `selectArchitectureSourceFiles`. They change by the new
selection and need no edit. The segment filters in `analyzer.ts`
(`isSafeTrackedResolverPath`, `analyzer.ts:498-507`; `isIgnoredProjectedPath`,
`analyzer.ts:510-517`; `isSafeProjectedSourcePath`, `analyzer.ts:520-531`) guard resolver
configuration and projected import targets. They do not select files, and they stay
unchanged. Task 1.4c Green does not edit `analyzer.ts`.

**FR-9.3 The hand-written file and the trade-off.** One of the 70 files is hand-written:
`apps/primary-advantage/public/serwist/sw.js` (3,080 bytes, a service worker with its own
header comment). It loses the architecture checks. It holds no database, provider, or
`process.env` access (a read of the file found no import, no `require`, and no `process.env`), so the check finds nothing in it today. The
decision accepts the loss, because `public/` holds static assets that the apps serve
as-is. Code that needs architecture checks belongs under `app/`, `lib/`, or `src/`.
Reason for no per-file exception: the 69 bundle names carry content hashes, so a file
list breaks at the next bundle build. See OQ-7.

**FR-9.4 No finding exemption.** FR-9 selects analyzer inputs. It adds no wildcard
exception, no directory exemption in a policy file, and no baseline entry
(`docs/architecture-enforcement.md:78`). The rule applies to minified static assets, and
no tracked file there carries a reviewed finding.

**FR-9.5 The pins change, the contract stays.** The source list is shorter, so the
five pin fields of D-3 change at the next refresh. `inventory.ts` is in
`V2_ANALYZER_IMPLEMENTATION_PATHS` (`reconciliation-manifest.ts:68`), so the committed
implementation tree hash is stale after the Green commit of task 1.4c, as it is after
tasks 1.4a and 1.4b. Task 1.4 refreshes it. `V2_MANIFEST_KEYS` and the strict key check do
not change. AC-2 and AC-8 hold. The expected module count of the next refresh is 6866
(6936 minus 70). Task 1.4 confirms the count and records it.

**FR-9.6 The CI effect.** CI runs the same analyzer on the same source list
(`pnpm architecture:check --skip-input-snapshot-pin`, `.github/workflows/ci.yml:157`). The
rule therefore also cuts the CI check time, for the check's analysis and for its
validation. The track measures no CI time, and no test reads a clock. The effect is an
expectation, not an acceptance criterion.

## 5. Constraints

- Tests first. Red tests fail at HEAD. Green changes the minimum.
- No new hash field, checksum column, or manifest (`AGENTS.md:80-94`).
- No edit, move, or rename in `measure/archive/backend_architecture_enforcement_20260713/`.
- No production deploy, no traffic move, no push.
- Stage named paths only. Never run `git add -A` or `git add .`.
- Heavy steps run through
  `/home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh` with
  `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800`. A named test file may run
  outside it. The PM cap of 2026-11-11 is 30 min for one heavy job.
- Task 1.4 runs the refresh as a series of runs. Each run uses
  `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800` and `--budget-s 1500`. The series ends
  at the first run that exits 0.
- The checkpoint store stays outside git and adds no hash (`AGENTS.md:80-94`).
- Commit headers are 100 characters or less and carry
  `(track_id: architecture_ci_input_pin_20261110)`.

## 6. Acceptance criteria

Each criterion has an automated test in
`packages/architecture-enforcement/src/__tests__/architecture-ci-input-pin.test.ts`.
AC-6 to AC-8 have tests in
`packages/architecture-enforcement/src/__tests__/architecture-analyzer-cost.test.ts`.
AC-9 to AC-17 have tests in
`packages/architecture-enforcement/src/__tests__/architecture-pin-refresh-resume.test.ts`.
AC-18 to AC-21 have tests in
`packages/architecture-enforcement/src/__tests__/inventory.test.ts`.
No test of AC-9 to AC-21 reads a clock or asserts an `elapsed_s` value. A test that
needs a clock passes a stub as `PinRefreshCliDependencies.now`. The stub returns a
test variable. The test adds a fixed step to that variable inside its `writeStdout`
hook, each time a line holds `modules_done=`.

1. **AC-1 (the input pin no longer fails CI).** Given a manifest whose
   `analyzerInputSnapshotSha256` differs from the current bytes, when the
   validator runs with `validateInputSnapshotPin: false`, then the result holds
   no "Analyzer input snapshot hash does not match current bytes" error. When
   the validator runs without the option, then the result holds that error.
2. **AC-2 (a new analyzed file still fails).** Given a fixture repository whose
   manifest matches its bytes, when a new analyzed file appears with no finding,
   then the CI-mode check exits non-zero. The result holds the report hash error
   (`v2-manifest-validation.ts:1031-1039`) and no input snapshot error. Reason:
   the report holds the exact source path list. The manifest was refreshed
   before the new file existed. The fixture must satisfy
   `hasFullRepositoryInputSet` (`v2-manifest-validation.ts:916-923`). Build it
   on the `createMinimalV2EvidenceRepository` pattern
   (`baseline-validation.test.ts:112`).
3. **AC-3 (the skip is narrow).** Given a manifest whose
   `analyzerImplementationTreeSha256` differs from the current bytes, when the
   validator runs with `validateInputSnapshotPin: false`, then the result holds
   "Analyzer implementation tree hash does not match current bytes".
4. **AC-4 (the CI wiring).** When a test reads `.github/workflows/ci.yml`, then
   the "Architecture boundary check" step runs
   `pnpm architecture:check --skip-input-snapshot-pin`, and the local command in
   `package.json` holds no flag. When a test calls `runArchitectureCheckCli` with
   the flag and a stub `checkRepository`, then the stub receives
   `skipInputSnapshotPin: true` (`architecture-check-cli.ts:114-119`). A parsed
   but inert flag fails this assertion.
5. **AC-5 (the refresh command).** Given a fixture repository whose manifest is
   stale, when the refresh command runs without `--acknowledge`, then it prints
   the old and new values, exits 1, and the manifest bytes do not change. When
   it runs with `--acknowledge`, then it exits 0 and the five fields hold the
   current values.
6. **AC-6 (one walk per module).** Given a fixture module with more than one
   member-access node on one local binding, when the analyzer runs, then the
   analyzer walks that file once for the binding store. At HEAD the walk count
   equals the member-access node count. A counter or a spy on the walk proves the
   count. The test reads no clock.
7. **AC-7 (one projection and two passes per refresh).** Given a fixture
   repository with a stale manifest, when the refresh command runs, then
   `createV2EvidenceSourceProjection` runs once and the analyzer report runs
   twice. The validation runs on the same evidence and adds no projection and no
   pass. A spy or a counter proves each count. The test reads no clock.
8. **AC-8 (the contract stays).** When the refresh writes the manifest, then the
   key set equals `V2_MANIFEST_KEYS` and no field is new. AC-2 still holds at the
   task 1.4a HEAD: an unlisted new analyzed file still fails.
9. **AC-9 (progress).** Given a fixture repository with at least 7 analyzed modules and
   a batch size of 2, when the refresh with `--acknowledge` finishes in one run, then stdout holds the
   `step=` lines of FR-8.2 for `store`, `projection`, `prelude` (pass 1 and pass 2),
   `combine`, `input_snapshot`, `trees`, and `validate`. It holds one
   `modules_done=<n> modules_total=<n> elapsed_s=<n>` line after each batch of each
   pass. The `modules_done` values grow, and the last value of each pass equals
   `modules_total`. Each line matches its format by a pattern. No assertion reads an
   `elapsed_s` value.
10. **AC-10 (the store).** Given a run that stops with exit code 3, then
    `.cache/architecture-pin-refresh/checkpoint.json` exists under the fixture root.
    It holds `version` 1, `headCommit` equal to `git rev-parse HEAD` (40 hex),
    `candidatePaths` equal to `[]`, `sourcePaths` equal to the projection paths, and
    `passes[0].modules` with the finished modules and their findings only. No key name
    holds `hash`, `sha256`, or `checksum`. In the real repository,
    `git check-ignore -q .cache/architecture-pin-refresh/checkpoint.json` exits 0.
11. **AC-11 (the store belongs to one HEAD).** Given a store at another `headCommit`
    that holds a wrong finding for one module, when the refresh runs, then it prints
    `checkpoint=discarded reason=head_changed`, analyzes every module of pass 1, and
    writes a manifest that equals the manifest of a run with no store. The same
    holds for an unreadable store, a store with `version` 2, a store with a
    different `sourcePaths`, and a store with a non-empty `candidatePaths`. When the
    candidate root holds a changed file, the run neither reads nor writes the store.
12. **AC-12 (the budget).** Given a stub clock that passes the budget during a run, when
    the refresh runs with `--acknowledge`, then it exits 3, the manifest bytes stay
    unchanged, and the store holds at least 1 module and fewer than all modules. The
    run starts no batch after `shouldContinue()` returns false. When the prelude uses
    the whole budget, the run exits 2 and stores no module. `parsePinRefreshArguments`
    returns `budgetSeconds` 1500 without the flag and 900 for `--budget-s 900`. It
    rejects `0`, `-5`, `1.5`, `abc`, and a missing value.
13. **AC-13 (resume).** Given the store of AC-12, when the refresh runs again, then the
    run analyzes only the modules that the store lacks, and the seam
    `onModuleAnalyzed` fires for no stored module. After the last run, the sum of
    the modules analyzed in all runs equals the module count for each pass. The last
    run exits 0 with `--acknowledge`, writes the manifest, and deletes the store. A
    run whose store holds both complete passes makes no analyzer call.
14. **AC-14 (equality and contract).** Given two identical fixture repositories with a
    stale manifest, when one refresh runs in one run and the other refresh runs in at
    least 3 runs (batch size 2 and a stub clock), then the two manifests hold the
    same value in every field of `V2_MANIFEST_KEYS`, and the bytes are equal. The key
    set equals `V2_MANIFEST_KEYS`. The test files of AC-2 and AC-8 pass at the same
    HEAD.
15. **AC-15 (the cost counts over the series).** Given the split refresh of AC-14 with R
    runs, then `createV2EvidenceSourceProjection` runs R times, the seam
    `onModuleAnalyzed` fires 2 × N times for N modules, each module fires once for
    each pass, and the validation adds no projection and no analyzer call. The input
    snapshot runs once. A refresh that fits in one run makes 1 projection and 2
    analyzer calls (AC-7 holds). The whole-file walk count for each module and each
    prelude stays 1 (AC-6 holds). Spies and counters prove each count.
16. **AC-16 (the two passes).** Given a split refresh, then the store holds a record for
    each pass. Pass 2 starts after pass 1 is complete. A run that stops inside pass 2
    resumes in pass 2 and does not repeat pass 1. Given a store whose pass 2 holds a
    changed finding list for one module, when the last run combines the passes, then
    the run exits 2 with "Analyzer reports are not byte-identical" and the manifest
    does not change.
17. **AC-17 (documentation).** `docs/architecture-enforcement.md` names `--budget-s`,
    `.cache/architecture-pin-refresh/checkpoint.json`, and exit code 3.
18. **AC-18 (a public asset is not selected).** Given the tracked file list
    `apps/example/public/x.js` plus the control of AC-19, when
    `selectArchitectureSourceFiles` runs on that list, then the result does not hold
    `apps/example/public/x.js`. The same holds for `apps/example/public/a/b/y.mjs`,
    `apps/example/public/z.jsx`, and `apps/example/public/serwist/sw.js`. When
    `inventoryRepository` runs on the same list with the files present, then
    `filesScanned` counts only the control and the result holds no parse error for a
    `public/` file.
19. **AC-19 (the positive control).** Given the list of AC-18, then
    `apps/example/src/x.ts` is still selected. The control stands in the same list as
    the public file, so the test fails for the right reason at HEAD.
20. **AC-20 (the rule matches the app-level directory only).** The result still holds
    `apps/example/src/public/x.ts` (a nested directory named `public`),
    `apps/example/src/public.ts` and `apps/example/public.ts` (files whose name starts
    with `public`), and `packages/example/public/x.ts` (another root). An over-broad rule
    that ignores any `public` segment fails this criterion.
21. **AC-21 (the manifest contract stays).** The key set of
    `packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json` equals
    the 15 keys of `V2_MANIFEST_KEYS` (`v2-manifest-validation.ts:109-125`), in order, so
    no key is new and none is gone. The test holds its own copy of the key list, as
    `reconciliation-manifest-v2.red.test.ts:24` does. Task 1.4c changes no manifest field.
    The five pin fields of D-3 change only at task 1.4.

## 7. Out of scope

- Any change to the archived track. The archive stays intact.
- A new hash field, checksum, or manifest.
- A change to the tenant and provider guards.
- A change to any app, deploy step, traffic rule, or Cloud Run service.
- A full rewrite of the v2 reconciliation policy.
- A change to the pin surface. The new CLI file joins no hash list. The new store
  file `pin-refresh-checkpoint.ts` joins no hash list.
- A checkpoint of the prelude output (see OQ-1).
- A store key for a hash, a checksum, or a tree identity (see OQ-2).
- A change to the ignore rule for `public` under `packages`, `services`, or `integrations`
  (see OQ-8).
- A per-file exception for a hand-written file under `public/` (see OQ-7).

## 8. Open questions

Section 3 holds every decision. The items below came up during the FR-8 design. Each
item has a default. The Build roles use the default and continue.

- **OQ-1 (the prelude repeats in each run).** The prelude (`analyzer.ts:2470-2525`)
  loads, parses, and resolves every file, and it runs the cross-module fixed point. It
  cannot split by module, so each pass attempt in each run pays it again. Nobody knows
  its time, because the refresh printed no progress before FR-8.2. **Default:** accept
  the cost. The first series run prints the `prelude` step time. If a run exits 2
  because the prelude used the whole budget, the orchestrator stops the series, tells
  the PM, and opens a task that checkpoints the prelude output. The first module batch
  is not forced.
- **OQ-2 (HEAD can move during the series).** The store is valid for one full HEAD
  commit (PM rule for FR-8). Other roles commit to this branch while the series runs.
  A commit of any file changes HEAD and discards the store, even when the commit
  touches no analyzed file. **Default:** keep the strict rule. Task 1.4 prints HEAD
  before each run. The orchestrator tells the PM at the first `reason=head_changed`
  discard and continues. It stops the series at the second discard. The PM can pause
  other commits or can choose a tree identity of the analyzer inputs (a Git tree
  identity of `apps`, `integrations`, `packages`, `services`, and the root
  `package.json`). This track does not build the tree identity.
- **OQ-3 (the batch size and the margin).** **Default:** a batch is 250 modules, a
  constant in the analyzer. Only `PinRefreshCliDependencies.batchModules` changes it.
  The margin of 300 s (1800 s cap minus 1500 s budget) must hold one batch, the store
  write, and the exit. The `longest_batch_s` rule of FR-8.5 protects the margin after the
  first batch. If the first batch of a real run exceeds 300 s, the orchestrator reduces
  the constant in a new task.
- **OQ-4 (a changed file in the candidate root).** The projection then holds working
  tree bytes that no HEAD names. **Default:** FR-8.4 bypasses the store and the budget
  and runs as one run. Task 1.4 checks that `git status --short --
  packages/architecture-enforcement` is empty before the first run.
- **OQ-5 (the exit code).** **Default:** code 3 (D-9). The code 75 belongs to the memory
  hold of `heavy-run.sh`.
- **OQ-6 (preview runs).** **Default:** a run without `--acknowledge` also stores
  modules, also stops at the budget, and also exits with code 3. A complete preview
  exits 1 or 0 as in FR-4, and it keeps the store.
- **OQ-7 (the hand-written file under `public/`).** `apps/primary-advantage/public/serwist/sw.js`
  is one of the 70 files, and a person wrote it (FR-9.3). It loses the architecture checks.
  **Default:** accept the loss, because `public/` holds static assets that the apps serve
  as-is. Add no per-file exception. If a later change puts a database, provider, or
  `process.env` access in a `public/` file, the owner moves that code under `app/`, `lib/`,
  or `src/`.
- **OQ-8 (the other roots).** The rule covers `apps/<app>/public/` only. No tracked source
  file sits under `public/` in `packages`, `services`, or `integrations`. **Default:** keep
  the rule at the app level. A new task widens it if such a file appears and slows the
  refresh.
- **OQ-9 (the 1.4c commits move HEAD).** The Green commit and the evidence commits of task
  1.4c change HEAD, so the next series starts from an empty store. **Default:** accept it.
  Task 1.4 starts its series after the last 1.4c commit, and OQ-2 applies from there.
