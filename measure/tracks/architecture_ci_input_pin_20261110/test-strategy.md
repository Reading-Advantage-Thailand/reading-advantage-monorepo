# Test strategy: CI input pin for the architecture check

> **Track:** `architecture_ci_input_pin_20261110` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Scope:** Phase 1 `## Phase 1: CI mode and the local pin refresh (target 2026-11-12)` in full (section P1).
> **Written:** 2026-11-10 at role base `3058dc8d4e98b587e4871b2caa2eaa95ed541898`. Model: minimax-cn-coding-plan/MiniMax-M3.1-Flash.
> **Amended:** 2026-11-11 at role base `06fcbc4e91bc07a5023dd0234ad285ba6d4d2835`. Model: claude-sonnet-5-5. Cause: the PM decision D-7 added task 1.4a (spec FR-7, AC-6 to AC-8). Section P1.11 and the section 7 line for 1.4a are new. Section 1.1 now names two files outside the wrapper. The phase base stays `09168dc422ed48604b8f2f0cb9a23ad4d110543b`.
> **Spec review:** round 2 passed. The result sits at `measure/runs/architecture_ci_input_pin_20261110/spec-review-r2-791ef0057.json`. Its four Nit findings are fixed in `3058dc8d4`.
> **No SHA in this file.** The strategy names no `phase_base_sha`. Section 1.5 names the capture point.
> **No user interface and no route.** The track adds one developer flag, one local refresh command, and one line in a CI workflow file.

## 1. Rules for every phase of this track

### 1.1 Machine rules and the heavy job wrapper

- Every package suite, every type check, every lint run, and every architecture check runs through one wrapper:

  ```bash
  HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>'
  ```

- One heavy job runs at a time. The machine holds 7.3 GB of RAM.
- Two named test files run outside the wrapper: `packages/architecture-enforcement/src/__tests__/architecture-ci-input-pin.test.ts` and `packages/architecture-enforcement/src/__tests__/architecture-analyzer-cost.test.ts` (task 1.4a).
- From 2026-11-11 every wrapper call also sets `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800`. The PM cap until 2026-11-20 is 1800 s. The plan rules hold the exact form. The wrapper lines of sections P1.1 to P1.4 above predate this cap and read as if the two variables were present.
- Every other test file of the package runs inside the wrapper through the package suite.
- Every Vitest command uses `CI=true` and runs in the foreground.
- A light task needs no lock: reads, `rg -n`, `git show`, `git log`, `git diff`, `git rev-parse`.
- All work runs in the shared master tree. No worktree is created (A16).
- Scratch folders are plain folders made with `mktemp -d` under `/tmp`. The Red role removes each folder after its run.

### 1.2 The hash rule

- This track adds no hash field, no checksum column, and no manifest (AGENTS.md:80-94, spec D-6).
- The refresh command writes the five values of spec D-3 into the existing manifest. It adds no field.
- The new CLI file joins no hash list. The three path lists in `reconciliation-manifest.ts` stay byte-identical.
- The new file enters the analyzer input snapshot through the existing rule for tracked TypeScript files. That rule adds no list.
- A diff of the manifest in this phase touches exactly five values. The count `manifest_fields_changed=5` is a labeled integer.

### 1.3 Evidence classes

- **Artifact test:** reads a file and checks text or structure. The workflow file check, the root package file check, the documentation check, and the manifest key check are artifact tests. They never prove runtime behavior.
- **Function-level live test:** calls the real validator, the real check CLI, and the real refresh command on a temporary fixture repository. It proves behavior in the test runtime.
- **Command run:** the real `pnpm architecture:check`, the real `pnpm architecture:check --skip-input-snapshot-pin`, and the real `pnpm architecture:pin:refresh --acknowledge` at one HEAD. They prove the script chain and the workflow step.
- **Human evidence:** none. This track needs no person and no owner gate. Every acceptance criterion has an automated test.
- A plan `[x]` note names the commit, the evidence class, the exit code, and the labeled counts (A5).

### 1.4 Intentionally-red aggregate suites

- The package suite holds the new Red file from task 1.1. It is red by design until task 1.2.
- The aggregate suite is not a gate while the Red file of the phase is open. The targeted command of the phase is the gate.
- The aggregate suite runs at the phase check of task 1.5. At that point every Red file of the phase is green.
- A file whose name ends in `.red.test.ts` is not a red file. The name is a naming convention. Five such files sit in the package today, and all of them are green (fact M1).
- A pre-existing red file outside this track is named with its path and its exit code. The count `preexisting_red_files=<n>` is a labeled integer.
- The base counts of section 2 hold for the package suite at the role base. A Green run quotes the new counts and the delta.

### 1.5 Capture of `phase_base_sha`

- This file embeds no `phase_base_sha`. A value from before the commit of this strategy is not valid.
- The orchestrator captures the value with `git rev-parse HEAD` **after** the commit of this strategy and **before** the Red role starts.
- The orchestrator records the full value in the Red evidence of Phase 1.
- The role base `3058dc8d4e98b587e4871b2caa2eaa95ed541898` is a role-base fact. It is not a `phase_base_sha`.
- Master is shared with other tracks. `phase_base_sha..HEAD` therefore holds their commits. A scope check uses the commits of this track only:

  ```bash
  git log <phase_base_sha>..HEAD --format=%H --grep='track_id: architecture_ci_input_pin_20261110'
  ```

  Then `git show --name-only --format= <sha>` for each commit. The label is `pin_out_of_scope_paths=<n>`. The phase check needs 0.
- The allowed paths are the track files, the Red test file, and the paths of section P1.3. Section P1.3 names them per task.

### 1.6 Labeled counts and the count floors

- Every count in a test message, a log line, a run note, or a plan note is a labeled integer. The label and the integer are written as `label=<n>`. A bare number never counts as a count (A3).
- A count that measures work has a floor. The floor is stated before the loop runs. A loop over an empty set is a defect (A4).
- The Red file fails at least one case at the base for the reason the task names. A case that passes at the base is a named characterization case, and the Red evidence lists it with its reason.
- A Green run quotes the exit code, the file count, the test count, and the labeled counts of the command it cites. A plan note that says "pass" without the exit code is a defect (A5).

### 1.7 Shared anti-pattern defenses

The catalog is `measure/anti-patterns.md`. Per-task coverage is in section P1.9.

| ID | Defense in this track | Falsification condition |
|---|---|---|
| A3 | Every count is `label=<n>`. The floors of section 1.6 are parsed from the label. | A bare number or a date passes a count check. |
| A4 | The Red file fails at the base for the named reason. The fixture has a positive control: its manifest validates cleanly before any field is broken. Every loop asserts its input size first. | The Red file exits 0 with no failing case, or the fixture fails for a reason other than the mutation. |
| A5 | A plan note quotes the exit code and the labeled counts of the command it cites. The CLI exit code of the check command and the exit code of the `pnpm` wrapper are two different values (fact M2). A note that names one exit code must name the command it ran. | The note says "exit 2" for the `pnpm` command, or it says "pass" and the cited command exits non-zero. |
| A6 | The registry note in `measure/tracks.md` names the CI mode and the local pin. No note claims that the pin is gone from the local check. | The registry claims that the pin is removed everywhere. |
| A7 | No detector of this track uses a bare English word as an exclusion token. A near-miss flag is a positive case, not an excluded line. | A near-miss flag spelling is silently accepted or silently dropped. |
| A9 | No test of this track reads a `measure/tracks/` path or a `measure/runs/` path. The archive check is a shell command in the phase check, not a test. | A test of this track holds the string `measure/tracks` or `measure/runs`. |
| A10 | The closeout runs `build-graph update ./graph.db <the changed source files>` once after the structural edits. | The phase adds an export and the graph stays stale. |
| A12 | The manifest key check reads the fixed key list from the production module. The check never asserts a key list of its own. | The check holds its own key list that drifts from the module. |
| A14 | Every detector uses `rg -n '<regex>'`. The command never uses `rg -nE`. An exit code of 2 is a failure and never a zero-hit result. | A detector exits 2 and the evidence reads "no hit". |
| A15 | The role receipt of this track records the commit and the commands. It holds no file hash, so a later commit cannot make it stale. | The receipt holds a hash of a file that a later commit changes. |
| A16 | The one-worktree rule of section 1.1 holds. | `git worktree list --porcelain` holds more than one worktree. |

A1, A2, A8, A11, and A13 are not phase risks of this track. A1 applies to the supervisor of the orchestrator. A2 applies to a publish gate. A8 applies to the plan markers, which the plan-update role owns. A11 applies to a review track. A13 applies to the closeout move of this track folder.

## 2. Measured facts that shape the tests

Every fact was read on 2026-11-10 at the role base. One heavy job ran per measurement.

| # | Fact | How measured |
|---|---|---|
| M1 | The package suite exits 0 with `Test Files 31 passed (31)` and `Tests 251 passed (251)`. Duration 63.18 s. Failed 0. Skipped 0. Five files carry the `.red.test.ts` suffix, and all of them are green. | One `heavy-run.sh` job on 2026-11-10. |
| M2 | `pnpm architecture:check` fails at the role base with `Architecture check failed: V2 reconciliation manifest is invalid: Analyzer input snapshot hash does not match current bytes`. The `tsx` command exits 2. The `pnpm` wrapper exits 1 and prints `[ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL]`. Both values are non-zero. | One `heavy-run.sh` job on 2026-11-10. |
| M3 | The input snapshot comparison is the first failure. The analyzer implementation tree hash and the implementation-and-test tree hash still match at the role base. Proof: the validator checks both tree hashes first (`v2-manifest-validation.ts:937-952`) and the message names the input snapshot. | Read of `v2-manifest-validation.ts:937-960` plus the message of M2. |
| M4 | `V2_ANALYZER_IMPLEMENTATION_PATHS` (`reconciliation-manifest.ts:95-102`) holds `architecture-check.ts`, `architecture-check-cli.ts`, and `v2-manifest-validation.ts`. Task 1.2 changes all three. The analyzer implementation tree hash and the implementation-and-test tree hash therefore go stale at task 1.2. | Read of `reconciliation-manifest.ts:64-138`. |
| M5 | `V2_IMPLEMENTATION_AND_TEST_PATHS` (`reconciliation-manifest.ts:132-138`) is a fixed list. It holds no new file. The new Red test file and the new refresh CLI file join no list. The refresh CLI file still enters the analyzer input snapshot through the tracked TypeScript rule. | Read of `reconciliation-manifest.ts:132-138` and `inventory.ts:180-197`. |
| M6 | `reviewSubjectSha256` binds every protected manifest field (`v2-manifest-validation.ts:606-616`). A refresh of the other four values must recompute it. The five values of spec D-3 are therefore the whole refresh surface. | Read of `v2-manifest-validation.ts:606-616`. |
| M7 | The validator has two pin comparison sites: the sync site at `:953-960` and the async site at `:1026-1030`. The async validator calls the sync validator first (`:984`). The new option must reach both sites. | Read of `v2-manifest-validation.ts:926-1030`. |
| M8 | The report hash comparison lives only in the async validator (`:1031-1039`). The sync validator never compares the report hash. An AC-2 case that uses the sync validator cannot see the report error. | Read of `v2-manifest-validation.ts:926-978` against `:981-1039`. |
| M9 | `ArchitectureAnalysisResult` holds `sourcePaths` (`analyzer.ts:116-125`). The report hash binds the exact path list. A new analyzed file changes the report even when it adds no finding. | Read of `analyzer.ts:116-125`. |
| M10 | `hasFullRepositoryInputSet` (`v2-manifest-validation.ts:916-923`) needs `package.json` and `packages/architecture-enforcement/src/analyzer.ts` in the fixture root. Without both, the validator skips the whole current-state block and the case passes for the wrong reason. | Read of `v2-manifest-validation.ts:916-923`. |
| M11 | The fixture pattern `createMinimalV2EvidenceRepository` (`baseline-validation.test.ts:112-164`) already computes a report hash over a temporary repository. The existing green test at `:478-508` proves that the pattern works. | Read of `baseline-validation.test.ts:112-164` and `:478-508`. |
| M12 | The strict CLI parser rejects an unknown argument (`architecture-check-cli.ts:87-89`). The parse result carries no field for an unknown argument. | Read of `architecture-check-cli.ts:56-96`. |
| M13 | The root script `architecture:check` (`package.json:7`) holds no flag. The CI step at `.github/workflows/ci.yml:156-157` runs `pnpm architecture:check`. | Read of both files. |
| M14 | The barrel `packages/architecture-enforcement/src/index.ts` exports no CLI module. `architecture-check-cli.ts` and `baseline-update-cli.ts` sit outside the barrel. The new refresh CLI file may do the same. The barrel is not an allowed path. | Read of `packages/architecture-enforcement/src/index.ts`. |
| M15 | `packages/architecture-enforcement/dist/` is git-ignored and untracked. A build changes no tracked file. | `git ls-files` and `.gitignore:9`. |
| M16 | The v2 manifest key set is fixed by `V2_MANIFEST_KEYS` (`v2-manifest-validation.ts:90-106`). The shape validator is strict, so a manifest with an extra key fails. | Read of `v2-manifest-validation.ts:90-106` and the shape validator. |
| M17 | The archive folder `measure/archive/backend_architecture_enforcement_20260713/` exists and holds its files. The phase check reads its diff against `5062b170e`. | `ls` of the archive folder. |
| M18 | `docs/architecture-enforcement.md` holds 72 lines. It names four commands and the rule that CI never runs the baseline-update command (`:67-72`). | Read of the file. |
| M19 | The committed manifest is a candidate manifest: `acceptance.status` is `candidate` and `acceptance.defaultPolicy` is `v1`. The `reviews` array is empty. | Read of `analyzer-reconciliation.v2.json`. |
| M20 | The manifest pins were last refreshed in commit `221081178` on 2026-09-08. Since that commit, 3601 tracked TypeScript or JavaScript files changed, and 20 package manifests changed. The pin is therefore stale by a wide margin at the role base. | `git diff --name-only 221081178..HEAD` over the input globs of `v2-manifest-validation.ts:779-796`. |

Red and Green measure the counts again. A fact of this table is not a proof for a later commit.

## 3. Phase summary and the review applicability table

| Phase | Risk | Review A (correctness) | Review B (security) | Review C (UX/API) | Adversarial | Browser review (UX) |
|---|---|---|---|---|---|---|
| P1 CI mode and the local pin refresh | high | **yes (required)** | **yes (required)** | **yes (required, limited scope)** | **yes (required)** | no |

**Why the risk is high.** The phase removes one comparison from a CI integrity gate. It also adds a local command that writes a hashed manifest file. The blast radius is a build gate, not a runtime service. A wrong flag turns a red CI green for the wrong reason. A wrong refresh writes a manifest that binds nothing.

**Review A applies.** The phase changes a validator, a checker, a CLI parser, a workflow file, two package files, and one document. Review A checks the default value of the new option, the two comparison sites, and the flag flow. It also checks the strict argument parsing, the canonical manifest bytes, and the refresh order.

**Review B applies.** The phase weakens a CI integrity check. That is a security property of the pipeline, so Review B reads the skip surface and the write surface. Its scope is in section P1.5.

**Review C applies with a narrow scope.** The phase adds no route, no page, and no public API. It adds two developer command-line surfaces, and one of them carries a consent gate. Review C therefore checks the command-line contract, not a web surface. Its scope is in section P1.5.

**Adversarial testing applies.** The phase adds a flag that a hostile commit or a hostile workflow edit can misuse. The attack surfaces are the near-miss flag spelling, the environment variable attempt, the broadened skip, and the unacknowledged write.

**The browser review does not apply.** The track changes no page, no component, no style, and no route. No browser renders the new surface, because the new surface is a terminal command and one workflow line. A browser review would have no page to open and no viewport to check, so it adds no evidence. The developer command line replaces it.

## 4. The acceptance criteria and their tests

The spec names one test file for every criterion: `packages/architecture-enforcement/src/__tests__/architecture-ci-input-pin.test.ts`. Every criterion has an automated test. No criterion needs a person.

| AC | Requirement | Test cases in the Red file | Evidence class |
|---|---|---|---|
| AC-1 | The pin comparison is skipped only when the option is false | `ac1_pin_error_present_without_option`, `ac1_pin_error_absent_with_option`, `ac1_sync_validator_skips_pin` | automated (function-level live test on a fixture repository) |
| AC-2 | A new analyzed file still fails in CI mode | `ac2_new_analyzed_file_fails_with_report_hash`, `ac2_ci_mode_cli_exits_non_zero` | automated (function-level live test on a fixture repository) |
| AC-3 | The skip stays narrow | `ac3_implementation_tree_error_survives_skip`, `ac3b_implementation_and_test_tree_error_survives_skip`, `ac3c_canonical_manifest_source_error_survives_skip` | automated (function-level live test on a fixture repository) |
| AC-4 | The CI wiring | `ac4_workflow_step_runs_the_flag`, `ac4_local_script_holds_no_flag`, `ac4_cli_passes_the_flag_to_the_checker`, `ac4_no_environment_variable_selects_the_mode`, `ac4_unknown_flag_is_rejected` | automated (artifact test plus function-level live test) |
| AC-5 | The refresh command | `ac5_preview_prints_old_and_new_and_writes_nothing`, `ac5_acknowledged_run_writes_the_five_fields`, `ac5_acknowledged_run_writes_canonical_bytes`, `ac5_analysis_error_exits_two_and_writes_nothing`, `ac5_validation_failure_restores_the_old_bytes` | automated (function-level live test on a fixture repository) |
| FR-6 | The documentation records the CI mode, the local full check, and the refresh command | `fr6_documentation_names_the_three_commands` | automated (artifact test) |

The spec holds no criterion number for FR-6. The `fr6` case is a closeout check that the strategy adds. The orchestrator may route it as a Nit against the spec.

## 5. The risks of the phase and their defense

| ID | Risk | How the track can fail it | Defense in the tests |
|---|---|---|---|
| R1 | An inert flag. The flag is parsed but never passed to the checker. | `architecture-check-cli.ts` parses the flag and drops it. `architecture-check.ts` never reads it. CI keeps failing while every parse test passes. | `ac4_cli_passes_the_flag_to_the_checker` calls `runArchitectureCheckCli` with the flag and a stub `checkRepository`. The stub must receive `skipInputSnapshotPin: true`. A parsed-but-inert flag fails this case. |
| R2 | The flag turns off more than the one comparison. | The new option short-circuits the whole current-state block, or guards the wrong comparison site. | The `ac3` group holds the analyzer implementation tree, the implementation-and-test tree, and the canonical manifest source. `ac2_new_analyzed_file_fails_with_report_hash` holds the report hash. The mutant table of section P1.7 names one wrong guard per comparison. |
| R3 | An unlisted new analyzed file passes in CI mode. | The report hash comparison goes away, or the report stops holding the exact source path list. | `ac2_new_analyzed_file_fails_with_report_hash` refreshes the fixture manifest, then adds a new analyzed file with no finding. The check must fail with the report hash error and no input snapshot error. |
| R4 | The refresh command writes without `--acknowledge`. | The preview path writes the manifest before it decides to preview. | `ac5_preview_prints_old_and_new_and_writes_nothing` reads the manifest bytes before and after the preview run and requires them to be equal. The exit code must be 1. |
| R5 | The hashing policy of AGENTS.md breaks. The track adds a hash field, a checksum, a broader hash list, or a new manifest. | The refresh command writes a sixth field. The new CLI file joins a path list. The manifest gains a key. | The manifest key check reads `V2_MANIFEST_KEYS` from the production module. The phase check counts `manifest_fields_changed=5` and `hash_path_lists_changed=0`. |
| R6 | The CI mode is green for the wrong reason at the phase check. | The Green role sees a red CI-mode command at the 1.2 and 1.3 HEADs and widens the skip to make it pass. | The plan rule of section P1.8 states the expected exit code at each HEAD. `ac3` and `ac2` hold the narrow skip. A wider skip fails both cases. |
| R7 | The archive changes. | A tool or a command touches a file under the archive folder. | The phase check reads the archive diff. The count `archive_changed_paths=0` is a labeled integer. |

## 6. The per-phase strategy

`ROOT=/home/daniebo/Desktop/reading-advantage-monorepo`. `HEAVY` is the wrapper of section 1.1. Every command below runs inside `HEAVY` unless the line says otherwise.

### P1: CI mode and the local pin refresh

**Risk: high.** The phase removes one comparison from a CI integrity gate. It adds a local command that writes a hashed manifest file. The blast radius is the build gate and the manifest.

**Review applicability**

| Review | Applies | Reason and scope |
|---|---|---|
| Review A (correctness) | **yes (required)** | The phase changes a validator, a checker, a CLI parser, a workflow file, two package files, and one document. Review A checks the new option and its default of true, the guard at both pin comparison sites, and the CLI-to-validator mapping. It also checks the strict argument parsing, the canonical manifest bytes, the restore path, and the refresh order of spec D-4. |
| Review B (security) | **yes (required)** | The phase weakens a CI integrity check. Review B checks that the skip covers only the `analyzerInputSnapshotSha256` comparison, and that no environment variable or config file selects the mode. It also checks that the CI workflow holds no refresh command, and that the refresh command writes only the manifest file. The command writes only with `--acknowledge`. Review B checks that the track adds no hash field and joins no hash list, and that the archive holds an empty diff. |
| Review C (UX/API) | **yes (required, limited scope)** | The phase adds no route, no page, and no public API. The applicable surface is the developer command line. Review C checks the exit codes of the check command and the refresh command, and the printed old and new values of the preview. It also checks the wording that names `--acknowledge` and the rejection of an unknown argument. It also checks the CI step name and the three commands in the documentation. |
| Adversarial testing | **yes (required)** | The phase adds a flag that a hostile commit can misuse. The hostile round covers the near-miss flag spelling, the environment variable attempt, and the argument order attack. It also covers the broadened skip, the unacknowledged write, and a wrong acknowledgement spelling. The last two cases are a manifest with an extra field and a workflow file that names the refresh command. |
| Browser review (UX) | no | The track changes no page, no component, no style, and no route. The new surface is a terminal command and one workflow line, and no browser renders it. A browser review has no page to open, so it adds no evidence. |

#### P1.1 The Red command

The one named test file runs outside the wrapper, as the plan rule states.

```bash
CI=true pnpm exec vitest run packages/architecture-enforcement/src/__tests__/architecture-ci-input-pin.test.ts
```

The plan names the expected Red state of each criterion. The strategy adds one more check at the Red step. The fixture must be proven valid before any field is broken. The Red role also runs the package suite inside the wrapper, to prove that the new file is the only red file.

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && CI=true pnpm --filter @reading-advantage/architecture-enforcement test'
```

**Expected failure at the base**

| Task | File | Expected at the base | Labeled counts |
|---|---|---|---|
| 1.1 | `architecture-ci-input-pin.test.ts` | Exit 1. The `ac1`, `ac2`, `ac4`, and `ac5` groups fail. The `ac3` group passes. The failure message names the missing behaviour, for example `expected no input snapshot error, received one`. A load error of `Cannot find module` is a defect of the Red test. | `fixture_positive_control=1`, `ac1_cases=3`, `ac2_cases=2`, `ac3_cases=3`, `ac4_cases=5`, `ac5_cases=5`, `fr6_cases=1` |
| 1.1 | package suite | Exit 1. Only the new file fails. Every other file passes. The count `other_files_failed=0` is a labeled integer. | `suite_files=31`, `suite_tests=251` |

**The characterization cases.** The `ac3` group passes at the base because the base code ignores the new option. The base code still reports the implementation tree error. The Red evidence names `ac3_implementation_tree_error_survives_skip`, `ac3b_implementation_and_test_tree_error_survives_skip`, and `ac3c_canonical_manifest_source_error_survives_skip` as the characterization cases and gives the reason.

**The fixture positive control.** The fixture repository holds a manifest whose five values match the fixture bytes. The validator must accept that manifest before any field is broken. The case `fixture_positive_control` asserts `valid: true`. Without this case, every AC case could fail for a fixture reason instead of the mutation reason (A4).

**The two sites of the pin.** The Red file must exercise the sync validator and the async validator. The async validator calls the sync validator first (`v2-manifest-validation.ts:984`). A Green change that guards only the async site leaves the sync site live, and `ac1_sync_validator_skips_pin` fails (facts M7 and M8).

**The three narrow-skip cases.** The `ac3` group holds the comparisons of FR-2 that sit inside the current-state block. `ac3` breaks the analyzer implementation tree hash. `ac3b` breaks the implementation-and-test tree hash. `ac3c` writes the fixture manifest without the trailing newline, so the canonical source check fails. Each case runs the validator with `validateInputSnapshotPin: false` and requires its own error to stay present.

**The fixture shape.** The fixture follows `createMinimalV2EvidenceRepository` (`baseline-validation.test.ts:112-164`) and adds the following:

- `package.json` and `packages/architecture-enforcement/src/analyzer.ts` in the fixture root, so `hasFullRepositoryInputSet` holds (fact M10).
- The real bytes of the four v1 artifact files and the three v2 artifact files. The artifact family hashes and the fixed `v1ManifestSha256` then match.
- A committed git history, so `git ls-files` returns a stable path list.
- The five values computed over the fixture bytes with the production helpers. The helpers are `computeAnalyzerImplementationTreeSha256V2` and `computeReconciliationImplementationTreeSha256V2`. The other two are `computeAnalyzerInputSnapshotSha256` and `computeAnalyzerReportSha256`. The review subject is computed over the protected fields.

The Red test copies the `canonicalJson` helper from `baseline-validation.test.ts:58-71`. It holds no hash of its own beyond the review subject. The review subject is a required binding of the existing manifest (spec D-3), not a new hash field.

#### P1.2 The Green gate

- The Red command of section P1.1 exits 0 with `tests_failed=0` and `tests_skipped=0`.
- The package suite exits 0. The base is M1. The count `suite_files=32` and `suite_tests=251 + <n>` are labeled integers, where `<n>` is the new case count.
- The type check and the lint run of the package exit 0:

  ```bash
  HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm --filter @reading-advantage/architecture-enforcement check-types'
  HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm --filter @reading-advantage/architecture-enforcement lint'
  ```

- The CI-mode command stays red at the 1.2 and the 1.3 HEADs. This is the expected state. See section P1.8.

#### P1.3 The allowed paths

**The Red paths (task 1.1).** The Red role may change one path:

- `packages/architecture-enforcement/src/__tests__/architecture-ci-input-pin.test.ts`

**The Green paths (tasks 1.2, 1.3, and 1.4).**

- `packages/architecture-enforcement/src/v2-manifest-validation.ts` (task 1.2)
- `packages/architecture-enforcement/src/architecture-check.ts` (task 1.2)
- `packages/architecture-enforcement/src/architecture-check-cli.ts` (task 1.2)
- `.github/workflows/ci.yml` (task 1.2)
- `packages/architecture-enforcement/src/architecture-pin-refresh-cli.ts` (task 1.3, new file)
- `packages/architecture-enforcement/package.json` (task 1.3)
- `package.json` (task 1.3, the root script)
- `docs/architecture-enforcement.md` (task 1.3)
- `packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json` (task 1.4 only)
- the track files under `measure/tracks/architecture_ci_input_pin_20261110/`

**The paths that stay out of scope.** The barrel `packages/architecture-enforcement/src/index.ts` is out of scope, because no CLI module sits in the barrel today (fact M14). The path lists in `reconciliation-manifest.ts` are out of scope, because the track must join no hash list. The archive folder is out of scope. The count `pin_out_of_scope_paths=0` is a labeled integer.

**The Red file after Green.** The plan commits the Red file alone in task 1.1. Green changes the minimum and edits no test file. A later amendment to the Red file needs a new plan line.

#### P1.4 The closeout gate

1. The Green gate of this phase holds with the quoted counts.
2. Every Red file of task 1.1 exists, and its commit sits before the Green commits.
3. `pin_out_of_scope_paths=0`. The allowed paths are the paths of section P1.3.
4. Both commands exit 0 at one HEAD. The count `commands_green=2` is a labeled integer:

   ```bash
   HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm architecture:check --skip-input-snapshot-pin'
   HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm architecture:check'
   ```

   The first command must print no line with `Analyzer input snapshot hash does not match current bytes`. The second command keeps the pin, so it must also exit 0 at the same HEAD, which the 1.4 refresh guarantees.
5. The manifest diff touches exactly five values. The count `manifest_fields_changed=5` is a labeled integer. The count `manifest_keys_added=0` is a labeled integer.
6. The three path lists in `reconciliation-manifest.ts` are byte-identical to the base. The count `hash_path_lists_changed=0` is a labeled integer.
7. The CI workflow file holds the flag on the "Architecture boundary check" step and holds no refresh command. The counts `ci_flag_steps=1` and `ci_refresh_commands=0` are labeled integers.
8. The root `architecture:check` script holds no flag. The count `local_script_flags=0` is a labeled integer.
9. The archive diff is empty. The count `archive_changed_paths=0` is a labeled integer:

   ```bash
   git diff --name-only 5062b170e..HEAD -- measure/archive/backend_architecture_enforcement_20260713/
   ```

10. The detector of section 1.7 for A9 exits 1: `rg -n 'measure/tracks|measure/runs' packages/architecture-enforcement/src/__tests__/architecture-ci-input-pin.test.ts` exits 1.
11. `build-graph update ./graph.db packages/architecture-enforcement/src/v2-manifest-validation.ts packages/architecture-enforcement/src/architecture-check.ts packages/architecture-enforcement/src/architecture-check-cli.ts packages/architecture-enforcement/src/architecture-pin-refresh-cli.ts` runs once (A10).

#### P1.5 The review scope for P1

**Review A (correctness).** The reviewer reads the diff of the four source files and the workflow line.

- The new input field `validateInputSnapshotPin?: boolean` has a default of true. An absent option must keep the comparison.
- The guard sits at the sync site (`:953-960`) and at the async site (`:1026-1030`), and at no other site.
- The mapping in `architecture-check.ts` reads `options.skipInputSnapshotPin !== true`, so an absent option validates.
- The CLI parser rejects an unknown argument and keeps the strict parser.
- `runArchitectureCheckCli` passes the option to the checker.
- The refresh command reads the manifest and computes the five values. It writes the canonical pretty JSON with one trailing newline. It restores the old bytes on a validation failure, and it exits 2 on an analysis error.
- The refresh order of spec D-4 holds: the code commits come first and the refreshed manifest is the last Green commit.
- Every new export holds a JSDoc block.

**Review B (security).** The reviewer reads the skip surface and the write surface.

- The skip covers only the `analyzerInputSnapshotSha256` comparison. Every other comparison still runs in CI mode.
- No environment variable, no config file, and no default selects the mode. The only selector is the explicit CLI flag (spec D-1).
- The CI workflow file holds the flag on one step and holds no refresh command.
- The refresh command is a local write. It needs `--acknowledge`. It writes only the manifest file. It restores the old bytes on a validation failure, and it exits 2 on an analysis error.
- The track adds no hash field, no checksum, and no manifest. The new CLI file joins no hash list (AGENTS.md:80-94).
- The archive holds an empty diff.
- No test writes into the real repository manifest. Every write happens in a temporary fixture.

**Review C (UX/API).** The reviewer reads the command-line contract.

- The check command keeps its exit codes 0, 1, and 2 as the documentation states (`docs/architecture-enforcement.md:16-22`).
- The CI step keeps the step name "Architecture boundary check".
- The refresh preview prints the old value and the new value of each of the five fields, so a person can decide.
- The refresh preview names `--acknowledge` in its wording, and the acknowledged run says it wrote.
- The refresh command rejects an unknown argument.
- The documentation names the CI mode, the local full check, and the refresh command.

#### P1.6 The fixtures and the mocks

- The fixture repository is a temporary directory made with `mkdtemp`. The Red role removes it after each case.
- The fixture holds a git history with one commit, so `git ls-files` returns a stable path list.
- The fixture holds the real bytes of the four v1 artifact files and the three v2 artifact files. It also holds `package.json`, `pnpm-workspace.yaml`, and `packages/architecture-enforcement/src/analyzer.ts`. One analysed source file with no finding sits under `apps/`.
- The fixture manifest holds the five values computed over the fixture bytes. The Red test computes them with the production helpers.
- The broken copy of a fixture is a manifest with one value replaced by a wrong 64-character hex string. The review subject is recomputed over the protected fields. This is the pattern of `withProtectedManifestHash` (`baseline-validation.test.ts:72-89`).
- The new analysed file of the AC-2 case holds one exported constant and no import, so it adds no finding.
- The checker stub of the AC-4 case is a `vi.fn()` that records the options object. It returns a minimal valid report.
- The output capture of the CLI cases uses the `writeStdout` and `writeStderr` adapters of `ArchitectureCheckCliDependencies`, as the existing CLI test does (`architecture-cli.test.ts:78-86`).
- No fixture holds a real secret, a real path, or a machine-specific path.
- No test reads a file under `measure/tracks/` or `measure/runs/`.

#### P1.7 The mutants

Each mutant is a wrong copy of the code. The test must reject it.

- A CLI that parses the flag and never passes it to the checker. Rejected by `ac4_cli_passes_the_flag_to_the_checker`.
- A checker that drops the option. Rejected by `ac4_cli_passes_the_flag_to_the_checker` and by `ac1_pin_error_absent_with_option`.
- A validator that skips the whole current-state block when the option is false. Rejected by `ac3_implementation_tree_error_survives_skip` and by `ac3c_canonical_manifest_source_error_survives_skip`.
- A validator that skips the report hash comparison when the option is false. Rejected by `ac2_new_analyzed_file_fails_with_report_hash`.
- A validator that skips the implementation-and-test tree comparison. Rejected by `ac3b_implementation_and_test_tree_error_survives_skip`.
- A validator that skips the canonical manifest source check. Rejected by `ac3c_canonical_manifest_source_error_survives_skip`.
- A validator that guards only the async site. Rejected by `ac1_sync_validator_skips_pin`.
- A validator whose default is false. Rejected by `ac1_pin_error_present_without_option`.
- A CLI that accepts a near-miss flag spelling. Rejected by `ac4_unknown_flag_is_rejected`.
- A CLI that reads an environment variable to select the mode. Rejected by `ac4_no_environment_variable_selects_the_mode`.
- A refresh command that writes the manifest in the preview path. Rejected by `ac5_preview_prints_old_and_new_and_writes_nothing`.
- A refresh command that writes a sixth field. Rejected by `ac5_acknowledged_run_writes_the_five_fields` and by the manifest key check.
- A refresh command that writes JSON without the trailing newline. Rejected by `ac5_acknowledged_run_writes_canonical_bytes`.
- A refresh command that leaves a broken manifest after a validation failure. Rejected by `ac5_validation_failure_restores_the_old_bytes`.
- A refresh command that exits 0 after an analysis error. Rejected by `ac5_analysis_error_exits_two_and_writes_nothing`.
- A workflow file that runs the refresh command. Rejected by the phase check of section P1.4, item 7.
- A root script that carries the flag. Rejected by `ac4_local_script_holds_no_flag`.
- A path list that gains the new CLI file. Rejected by the phase check of section P1.4, item 6.

#### P1.8 The plan rule this strategy adds

The plan lacks one gate line. The plan expects the CI-mode command to exit 0 at the phase check. It says nothing about the state of that command at the 1.2 and the 1.3 HEADs. A Green role that runs the command there sees exit 2. The reason is fact M4. Task 1.2 changes three files of the analyzer implementation tree, so the tree hashes and the report hashes go stale until the 1.4 refresh.

The strategy adds one line to the rules of `plan.md`:

> The CI-mode command stays red at the 1.2 and the 1.3 HEADs. It passes only after the 1.4 refresh. A non-zero exit at 1.2 or at 1.3 is the expected state, not a defect. Widening the skip to make it pass is a defect.

That line closes risk R6.

#### P1.9 The anti-pattern coverage per task

| Task | Anti-patterns | Defense | Falsification condition |
|---|---|---|---|
| 1.1 | A4 | The fixture positive control asserts that the fresh fixture manifest validates before any field is broken. Every AC case breaks one field on purpose. | An AC case fails because the fixture is invalid, not because of the mutation. |
| 1.1 | A3 | `ac1_cases=3`, `ac2_cases=2`, `ac3_cases=3`, `ac4_cases=5`, `ac5_cases=5`, and `fr6_cases=1` are parsed from the label. The floors hold. | A case group has fewer cases than its floor, or the count comes from a bare number. |
| 1.1 | A7 | The near-miss flag spellings are positive cases of `ac4_unknown_flag_is_rejected`. No detector drops a line because it holds an English word. | A near-miss flag spelling is accepted or dropped without an error. |
| 1.2 | A5 | The Red evidence names the three `ac3` characterization cases and their reason. The plan note quotes the exit code of the command it ran. | The plan says all cases fail, or it says "pass" and the command exits non-zero. |
| 1.2 | A6 | The registry note in `measure/tracks.md` names the CI mode and the local pin. | The registry claims the pin is gone everywhere. |
| 1.3 | A5 | The refresh preview case names the exit code 1 and the byte compare of the manifest. | The note claims the preview wrote the manifest. |
| 1.3 | A12 | The manifest key check reads `V2_MANIFEST_KEYS` from the production module. | The check holds its own key list. |
| 1.4 | A5 | The phase check quotes both exit codes and the labeled counts. It names the `tsx` exit code and the `pnpm` exit code separately (fact M2). | The note names one exit code for the other command. |
| 1.4 | A3 | `manifest_fields_changed=5`, `manifest_keys_added=0`, `hash_path_lists_changed=0`, `ci_refresh_commands=0`, `local_script_flags=0`, and `archive_changed_paths=0` are labeled integers. | A count in the note has no label. |
| 1.5 | A10 | The closeout runs `build-graph update` once over the four changed source files. | The phase adds an export and the graph stays stale. |
| 1.5 | A9 | The detector for A9 exits 1 over the Red file. | The Red file holds a `measure/tracks` or a `measure/runs` path. |
| 1.5 | A14 | Every detector uses `rg -n`. An exit code of 2 is a failure. | A detector exits 2 and the evidence reads "no hit". |
| 1.5 | A16 | The one-worktree rule of section 1.1 holds. | More than one worktree exists. |

#### P1.10 What the tests cannot prove

- The real CI run on GitHub. The workflow file check reads text. The phase check proves the command and the script chain on this machine.
- The real state of the manifest after the 1.4 refresh. The refresh command runs at the 1.3 HEAD, and the phase check proves the result with the local full check.
- That the pin stays fresh over time. The pin goes stale again after the next analysed file changes. No test can keep it fresh.
- The real analyzer behaviour on a real new file. The AC-2 fixture holds a minimal file with no finding.
- The behaviour of the CI check on a machine with a dirty working tree. The existing projection test covers that rule, and this track does not change it.

#### P1.11 Task 1.4a: the refresh cost (added 2026-11-11)

Source: spec FR-7, D-7, AC-6 to AC-8, and `measure/runs/architecture_ci_input_pin_20261110/pin-refresh-cost-analysis.md`. The PM words of D-7: "A light Build role adds task 1.4a to this spec and the plan. Red runs on the MiniMax model family with the tree-walk count test. The test reads no clock."

**Risk: high.** The task is a refactor with no change in behavior, inside the analyzer that feeds the report hash. A wrong store changes a finding without a visible error. A wrong shared evidence run skips a comparison of an integrity gate. The task adds no hash field and no manifest key.

**Facts read on 2026-11-11 (no run).** Red and Green measure again.

| # | Fact | Source |
|---|---|---|
| N1 | `moduleSpecifierForBinding` is a private function. No test can import it. The walk count therefore needs a seam outside the function. It returns the first matching declaration in depth-first order. | `analyzer.ts:1913-1944` |
| N2 | The TypeScript namespace object defines its members as getters with `enumerable: true` and no `configurable`. `vi.spyOn(ts, "forEachChild")` can therefore fail with a redefine error. The fallback seam is `vi.mock("typescript", ...)` with a wrapper that counts `forEachChild` calls and delegates to the original. | `node_modules/typescript/lib/typescript.js:22-25` |
| N3 | `V2_MANIFEST_KEYS` is not exported. The strict check compares the exact key order at `v2-manifest-validation.ts:572`. The key check of AC-8 therefore compares the key list of the written manifest with the key list of the manifest before the refresh, and it requires `valid: true` from the strict validator. | `v2-manifest-validation.ts:92`, `:572` |
| N4 | `createV2EvidenceSourceProjection` and its sync twin are called inside `v2-manifest-validation.ts`. A spy on the export does not see an internal call. Both functions run `git archive` through `execFileSync`. The count seam is the `git archive` call. | `v2-manifest-validation.ts:262-278`, `:350-372` |
| N5 | `analyzeArchitectureSources` is called from `v2-manifest-validation.ts:878` and from `architecture-check.ts:210`. A passthrough `vi.mock` of `../analyzer.js` counts both call sites. | `analyzer.ts:2470` |
| N6 | The refresh cases of the pin file run the CLI in a child process (`spawnSync`, `architecture-ci-input-pin.test.ts:245-251`). A spy cannot see a child process. The cost file calls `runArchitecturePinRefreshCli` in the test process. | `architecture-ci-input-pin.test.ts:245-251` |
| N7 | The refresh at HEAD makes `analyzer_passes=5`, `projections=5`, and `input_snapshot_hash_runs=3` by the analysis. These values are `[read]`, not measured. The Red evidence records the counts that the seams observe at HEAD. | analysis section 1 |

**The Red command** (the one named file outside heavy-run):

```bash
CI=true pnpm exec vitest run packages/architecture-enforcement/src/__tests__/architecture-analyzer-cost.test.ts
```

The Red role writes this one file and changes no other path. The Red role runs no package suite. The aggregate suite is not a gate while the Red file is open (section 1.4).

**The cases of the cost file**

| Case | Proves | Falsification condition | Expected at HEAD |
|---|---|---|---|
| `cost_fixture_positive_control` | The fixture manifest validates (`valid: true`). Each seam counts at least one event in a control run: `root_walks>=1`, `git_archive_calls>=1`, `analyzer_calls>=1`. | Any seam reads 0 in its control run, or the fixture manifest is invalid. The seam is then dead and every later count of 0 or 1 proves nothing (A4). | pass |
| `ac6_walks_per_module_is_one` | One fixture module holds `member_access_nodes>=50` call arguments of the form `binding.member`, with `binding` assigned by `require` or by `await import`. The analyzer runs over it. The root walks for the binding store are `walks_per_module<=1`. The value `walks_per_module` is the count of `forEachChild` calls whose first argument is the fixture `SourceFile`, minus the same count for a control module of the same shape with no member-access argument. | At HEAD the delta equals about the member-access count. A store that rebuilds on each lookup, or one that walks again for a second binding, keeps `walks_per_module` above 1. | **fail** |
| `ac6_walk_count_does_not_grow_with_member_access_nodes` | Two modules of the same shape hold `member_access_nodes=10` and `member_access_nodes=50`. The root-walk totals are equal: `walk_growth=0`. | `walk_growth` is above 0. This case catches a Green change that caps the walk at 1 for a small file but not for a large one. | **fail** |
| `ac6b_binding_resolution_unchanged` | Characterization. The fixture holds one binding assigned by `require`, one assigned by `await import`, one name with no assignment, and one name declared twice with two different specifiers. The resolved resources equal an explicit expected list written in the test. The first declaration in source order wins. | The store returns the last declaration, returns a value for the unassigned name, or loses the `await import` form. | pass |
| `ac7_refresh_makes_one_projection_and_two_passes` | The test process runs `runArchitecturePinRefreshCli(["--acknowledge"], ...)` on a fixture with a stale manifest. The seams read `projections=1` and `analyzer_passes=2` for the whole call, with the validation inside it. | A value other than 1 or 2. The expected value at HEAD is 5 and 5 (N7). The Red evidence records what the seams read. | **fail** |
| `ac7b_preview_run_makes_one_projection_and_two_passes` | The same fixture, run without `--acknowledge`, reads `projections=1` and `analyzer_passes=2`. The preview exits 1 and writes nothing. | A Green change that shares the evidence only on the write path. | **fail** |
| `ac8_manifest_key_set_unchanged_after_refresh` | After the acknowledged run, `Object.keys` of the written manifest equals `Object.keys` of the manifest before the run, the same order. The count `manifest_fields_changed<=5`. The strict validator returns `valid: true`. A control case writes one extra key and requires the strict validator to reject it. | The refresh writes a sixth field, reorders the keys, or the control manifest with an extra key passes. | pass |
| `ac8b_new_analyzed_file_still_fails` | AC-2 at the new HEAD. The fixture is refreshed, then one new analyzed file with one exported constant and no finding is added and committed. The CI-mode check reports the report hash error and no input snapshot error. | The shared evidence drops the exact source path list, or the check reuses stale evidence. | pass |

The Red expectation at HEAD is exit 1 with `tests_total=8`, `tests_failed=4`, `tests_passed=4`. The failing cases are the four AC-6 and AC-7 cases above. The passing cases are `cost_fixture_positive_control`, `ac6b_binding_resolution_unchanged`, `ac8_manifest_key_set_unchanged_after_refresh`, and `ac8b_new_analyzed_file_still_fails`. The Red evidence names the last three as characterization cases with their reason: the base code already meets AC-8 and the binding result. A load error of `Cannot find module` or a type error is a defect of the Red test. The Red role may add cases. A floor of the counts below may rise and may not fall.

**The labeled counts of the cost file.** `fixture_positive_control=1`, `ac6_cases=3`, `ac7_cases=2`, `ac8_cases=2`, `member_access_nodes>=50`, `walks_per_module<=1`, `walk_growth=0`, `projections=1`, `analyzer_passes=2`, `manifest_fields_changed<=5`, `manifest_keys_added=0`. The test builds each message as `label=<n>` from a variable of the same name. The test computes `member_access_nodes` by parsing the fixture text with the TypeScript API and counting property-access nodes. It does not take the number from the analyzer.

**The no-clock rule.** No test of the cost file reads clock time. No case uses `Date`, `performance.now`, `process.hrtime`, a timer, or a fake timer, and no case asserts a duration. A per-case timeout argument of `it` is a number for the runner and is allowed. The wall time of 1800 s is proven only by the 1.4 rerun. The detector exits 1:

```bash
rg -n 'Date\.now|new Date|performance\.now|hrtime|setTimeout|setInterval|useFakeTimers|getTime' packages/architecture-enforcement/src/__tests__/architecture-analyzer-cost.test.ts
```

**The fixture rule.** The cost file builds its own temporary repository on the `createMinimalV2EvidenceRepository` pattern (`baseline-validation.test.ts:112-164`), as task 1.1 did. The fixture satisfies `hasFullRepositoryInputSet` (fact M10): `package.json` and `packages/architecture-enforcement/src/analyzer.ts` sit in the root. It holds the real bytes of the v1 and v2 artifact files, one git commit, and a manifest computed with the production helpers. The cost file does not import from the pin test file and does not change it. The fixture is made with `mkdtemp`, and the test removes it in `afterAll`. The seams are set up after the fixture build, and each case clears its counters before the measured run. Each spy or mock is restored in `afterEach`. The cost test never writes into the real repository manifest.

**Anti-pattern coverage for 1.4a**

| Anti-pattern | Defense | Falsification condition |
|---|---|---|
| A3 | Every count is `label=<n>`, built from a variable with that name. `member_access_nodes`, `walks_per_module`, `walk_growth`, `projections`, and `analyzer_passes` are labeled integers in each failure message and in each plan note. | A message or a note holds a bare number, or a count check passes on a number with no label. |
| A4 | The positive control proves that each seam counts. The floor `member_access_nodes>=50` is asserted before the walk assertion. `ac6_walks_per_module_is_one` fails at HEAD with a walk count of at least 50, not 0. Each loop in the file asserts its input size above 0 before it runs. | A walk count of 0 at HEAD, a counter that reads 1 because the spy never fires, or a loop over an empty set. |
| A5 | A plan note for 1.4a quotes the exit code of each command and the labeled counts. A `heavy-run` timeout or a signal exit is named with its code and is never written as "fail" or "pass" alone. | A note says "pass" with a non-zero exit code. |
| A9 | The cost file holds no `measure/tracks` and no `measure/runs` path. Detector: `rg -n 'measure/tracks\|measure/runs' <cost file>` exits 1. | The detector exits 0, or it exits 2. |
| A12 | The key check reads no key list of its own (fact N3). It compares the key list before and after the refresh and uses the strict validator as the oracle. | The cost file holds a literal list of manifest keys. |
| A14 | Every detector uses `rg -n`. An exit code of 2 is a failure and never "no hit". | A detector exits 2 and the evidence reads "no hit". |
| A15 | The role receipts hold the commit and the commands. They hold no file hash. | A receipt holds a hash that a later commit changes. |

A1, A2, A8, A11, and A13 are not risks of this task, as in section 1.7. A6 and A7 apply as in section 1.7. A10 applies to the Green commit (see the `build-graph` rule below). A16 holds: no worktree.

**The Green gate for 1.4a.** Every item runs at the Green HEAD of 1.4a. The wrapper prefix is `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600`.

1. `CI=true pnpm exec vitest run packages/architecture-enforcement/src/__tests__/architecture-analyzer-cost.test.ts` exits 0 with `tests_failed=0`, `tests_skipped=0`, and `tests_total>=8`.
2. `CI=true pnpm exec vitest run packages/architecture-enforcement/src/__tests__/architecture-ci-input-pin.test.ts` exits 0 with `tests_total=20` and `tests_failed=0`. The Green change edits no test file.
3. The package suite through the wrapper exits 0: `CI=true pnpm --filter @reading-advantage/architecture-enforcement test`. The floors are `suite_files>=33` and `suite_tests>=279`, which is 251 base cases plus 20 pin cases plus 8 cost cases. The note quotes the delta against the base of fact M1.
4. The type check through the wrapper exits 0: `pnpm --filter @reading-advantage/architecture-enforcement check-types`.
5. Both detectors of this section exit 1.
6. The Green commit touches only the paths named below.

**The allowed paths for 1.4a**

- Red: `packages/architecture-enforcement/src/__tests__/architecture-analyzer-cost.test.ts`.
- Green: `packages/architecture-enforcement/src/analyzer.ts`, `packages/architecture-enforcement/src/v2-manifest-validation.ts`, `packages/architecture-enforcement/src/architecture-pin-refresh-cli.ts`, and the track files under `measure/tracks/architecture_ci_input_pin_20261110/`.
- Out of scope: the manifest file, the three path lists in `reconciliation-manifest.ts`, the barrel, the archive folder, and both pin and cost test files after Red. A new exported function in `v2-manifest-validation.ts` needs a JSDoc block. `V2_MANIFEST_KEYS` stays unexported unless the orchestrator approves a change.
- Fact M4 holds: `v2-manifest-validation.ts` is in the analyzer implementation list. The 1.4a Green commit therefore makes the manifest pins stale again. The CI-mode command stays red at the 1.4a HEADs, as the plan rule states. It passes after the 1.4 refresh. A wider skip is a defect.

**The `build-graph` rule.** After the Green commit, `build-graph update ./graph.db packages/architecture-enforcement/src/analyzer.ts packages/architecture-enforcement/src/v2-manifest-validation.ts packages/architecture-enforcement/src/architecture-pin-refresh-cli.ts` runs once, and it runs only through `heavy-run.sh` with `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800` (A10). A run outside the wrapper is a defect.

**The 1.4 rerun rule at the 1.4a HEAD.**

- The rerun runs at the HEAD of the Green commit of 1.4a, or at a later HEAD that changes no analyzer input except the manifest.
- The command is one job under the same cap: `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm architecture:pin:refresh --acknowledge'`.
- The cap is 1800 s. The role never raises the cap and never retries a timed-out job in the same turn.
- A timeout or a signal exit stops task 1.4. The role records the exit code, the start time, the stop time, and `git status --short` for the manifest path. The manifest must stay unchanged. The role then reports to the orchestrator. The cost tests prove counts, so they do not prove that two passes fit in 1800 s. The analysis expects about 36 minutes if one pass stays at 18 minutes, so a second timeout is possible. The next step is then an orchestrator decision.
- When the job exits 0, the role commits only the manifest file, then runs the checks of task 1.4 and the closeout items 4 to 6 of section P1.4.

**Reviews for 1.4a**

| Review | Applies to 1.4a | Scope |
|---|---|---|
| Review A (correctness) | **yes (required)** | The store keeps first-declaration-wins (N1). The call at `analyzer.ts:1999` reads the store and holds no whole-file walk. The shared evidence function makes 1 projection and 2 passes, and it exposes `parseErrors` so the refresh still exits 2 on a parse error. The validator option skips its own projection, sync snapshot, and two reports. It keeps the report comparison, the canonical source check, and the debt comparison. The option has a default that keeps the old behavior. |
| Review B (security) | **yes at phase level (required)** | No separate round for 1.4a. The phase round reads one more point: only the refresh CLI passes the evidence option. The check CLI and `checkArchitectureRepository` never pass it. `ac8b` guards that the CI-mode check still recomputes. |
| Review C (UX/API) | **yes at phase level (limited)** | No separate round for 1.4a. The task changes no flag and no message. The phase round confirms that the preview lines and exit codes of the refresh stay the same. |
| Adversarial | **yes at phase level** | Spoof attempt: a stale evidence object passed to the validator must not hide a mismatch. The orchestrator may add this case to the phase round. |
| Browser review (UX) | no | No page, no component, no route. |

**What the 1.4a tests cannot prove**

- The wall time. The tests read no clock (PM words of D-7). Only the 1.4 rerun proves the 1800 s limit.
- The secondary candidate of the analysis: the per-module evidence scan at `analyzer.ts:1408-1410`. The spec FR-7 does not name it. No test counts it. A pass that stays slow because of that scan shows up only in the 1.4 rerun.
- That the findings of the whole repository stay equal. `ac6b` proves the binding rule on a small fixture. The 1.4 refresh and the package suite catch a change in the real report: a changed report hash fails the CI-mode check at the phase check.

## 7. The labeled counts and the floors of P1

`fixture_positive_control=1`, `ac1_cases=3`, `ac2_cases=2`, `ac3_cases=3`, `ac4_cases=5`, `ac5_cases=5`, `fr6_cases=1`, `other_files_failed=0`, `suite_files>=32`, `suite_tests>=251`, `commands_green=2`, `manifest_fields_changed=5`, `manifest_keys_added=0`, `hash_path_lists_changed=0`, `ci_flag_steps=1`, `ci_refresh_commands=0`, `local_script_flags=0`, `archive_changed_paths=0`, `pin_out_of_scope_paths=0`.

Task 1.4a adds these floors: `fixture_positive_control=1`, `ac6_cases=3`, `ac7_cases=2`, `ac8_cases=2`, `member_access_nodes>=50`, `walks_per_module<=1`, `walk_growth=0`, `projections=1`, `analyzer_passes=2`, `manifest_keys_added=0`, `suite_files>=33`, `suite_tests>=279`, `pin_cases=20`. The `suite_files>=32` and `suite_tests>=251` floors above stay valid for the earlier tasks.

## 8. Questions for the orchestrator

The default of each row applies if no answer comes. The orchestrator may change one default before the Red role starts.

| # | Question | Default |
|---|---|---|
| Q1 | The role base. The assignment named `3058dc8d4e98b587e4871b2caa2eaa95ed541898` as the role base, and `git rev-parse HEAD` returned the same value at the start of this role. | The `phase_base_sha` is the value of `git rev-parse HEAD` after the commit of this strategy and before the Red role starts. The role base is a role-base fact only. |
| Q2 | The capture point of the `phase_base_sha`. | The orchestrator captures it with `git rev-parse HEAD` after the commit of this strategy and before the Red role starts. The orchestrator records the full value in the Red evidence of Phase 1. |
| Q3 | The Red file name. The plan and the spec name `packages/architecture-enforcement/src/__tests__/architecture-ci-input-pin.test.ts`. | The Red file uses that name. The plan rule of section 1.1 names it as the one file that runs outside the wrapper. |
| Q4 | The `ac2` end-to-end case. The spec says the CI-mode check exits non-zero. The check CLI needs a repository root with a full input set and with the baselines and the ownership map. | The Red file builds the fixture with the real v1 and v2 artifact bytes, so `checkArchitectureRepository` reads them. The case calls `runArchitectureCheckCli` with the flag and `--repo-root` at the fixture, and expects exit 2 with the report hash message on stderr. |
| Q5 | The count floors of section 1.6 and section 7. | The floors in this file are the floors. A floor may rise when the Red evidence shows a larger case set. A floor may not fall without a note that names the reason. |
| Q6 | The documentation check for FR-6. The spec holds no criterion number for FR-6. | The Red file holds one artifact case that names the CI mode, the local full check, and the refresh command in `docs/architecture-enforcement.md`. The orchestrator may route the missing criterion number as a Nit against the spec. |
| Q7 | The plan line of section P1.8. | The strategy adds that one line to the rules of `plan.md` and commits it with this strategy. The plan change is named in the handoff. |
| Q8 | The aggregate suite as a gate. | The aggregate suite is not a gate while the Red file of the phase is open. The targeted command of the phase is the gate. At the phase check the aggregate suite runs, and a pre-existing red file outside this track is named with its path and its exit code. |
| Q9 | The model families of the Red and the Green roles. | The Red and the Green families differ from the family of this strategy role (minimax) and from each other where the quota allows. The orchestrator picks them at the spawn. |
