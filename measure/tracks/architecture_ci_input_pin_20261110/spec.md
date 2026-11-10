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

## 3. Decisions (zero open decisions)

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
- Commit headers are 100 characters or less and carry
  `(track_id: architecture_ci_input_pin_20261110)`.

## 6. Acceptance criteria

Each criterion has an automated test in
`packages/architecture-enforcement/src/__tests__/architecture-ci-input-pin.test.ts`.
AC-6 to AC-8 have tests in
`packages/architecture-enforcement/src/__tests__/architecture-analyzer-cost.test.ts`.

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

## 7. Out of scope

- Any change to the archived track. The archive stays intact.
- A new hash field, checksum, or manifest.
- A change to the tenant and provider guards.
- A change to any app, deploy step, traffic rule, or Cloud Run service.
- A full rewrite of the v2 reconciliation policy.
- A change to the pin surface. The new CLI file joins no hash list.

## 8. Open questions

None. Section 3 holds every decision.
