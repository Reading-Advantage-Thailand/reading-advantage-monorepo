# Test strategy: CI input pin for the architecture check

> **Track:** `architecture_ci_input_pin_20261110` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Scope:** Phase 1 `## Phase 1: CI mode and the local pin refresh (target 2026-11-12)` in full (section P1).
> **Written:** 2026-11-10 at role base `3058dc8d4e98b587e4871b2caa2eaa95ed541898`. Model: minimax-cn-coding-plan/MiniMax-M3.1-Flash.
> **Amended:** 2026-11-11 at role base `06fcbc4e91bc07a5023dd0234ad285ba6d4d2835`. Model: claude-sonnet-5-5. Cause: the PM decision D-7 added task 1.4a (spec FR-7, AC-6 to AC-8). Section P1.11 and the section 7 line for 1.4a are new. Section 1.1 now names two files outside the wrapper. The phase base stays `09168dc422ed48604b8f2f0cb9a23ad4d110543b`.
> **Amended:** 2026-11-11 at role base `fba3a45f10613f760358abe3178a9cc9e49633c8`. Model: claude-sonnet-5-5 (a substitution for the Opus role-table entry). Cause: the PM decision D-8 added task 1.4b (spec FR-8, AC-9 to AC-17). Section P1.12 and the section 7 line for 1.4b are new. The phase base stays `09168dc422ed48604b8f2f0cb9a23ad4d110543b`.
> **Amended:** 2026-11-11 at role base `756eb027b33d0786846f8a3c5e62b27b965c6960`. Model: claude-sonnet-5-5. Cause: the orchestrator decision D-10 added task 1.4c (spec FR-9, AC-18 to AC-21). Section P1.13 and the section 7 line for 1.4c are new. The phase base stays `09168dc422ed48604b8f2f0cb9a23ad4d110543b`.
> **Amended:** 2026-11-11 at role base `7dd89f20fca790398ad77e420dde0cc845d99404`. Model: claude-sonnet-5-5. Cause: the PM decision D-11 added task 1.4d, a Green-only baseline task. Section P1.14, the section 3 note, the section 7 floors, and questions Q10 and Q11 are new. The strategy found that the plan route is blocked (P1.14 finding F1). The phase base stays `09168dc422ed48604b8f2f0cb9a23ad4d110543b`.
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
- Four named test files run outside the wrapper (task 1.4c adds `packages/architecture-enforcement/src/__tests__/inventory.test.ts`, with `--maxWorkers=1`). The first three are: `packages/architecture-enforcement/src/__tests__/architecture-ci-input-pin.test.ts`, `packages/architecture-enforcement/src/__tests__/architecture-analyzer-cost.test.ts` (task 1.4a), and `packages/architecture-enforcement/src/__tests__/architecture-pin-refresh-resume.test.ts` (task 1.4b, with `--maxWorkers=1`).
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

**Task 1.4d (added 2026-11-11).** The task writes the baselines and changes no behavior. Its risk is high (section P1.14). Review A and Review B apply to it. Review C and the browser review do not apply. Adversarial testing applies in a small scope. The phase-level answers in the table do not change.

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

#### P1.12 Task 1.4b: the resumable refresh (added 2026-11-11)

Source: spec FR-8, D-8, D-9, AC-9 to AC-17, OQ-1 to OQ-6 (spec commit `fba3a45f1`), and plan task 1.4b. The PM words of D-8: "Round 6 exited 124 at 5400 s, so the PM ordered option B: task 1.4b, a checkpoint for each module." The plan names the Red file `packages/architecture-enforcement/src/__tests__/architecture-pin-refresh-resume.test.ts` and its 25 case names. This section adds the proofs, the falsification conditions, and the gates.

**Risk: high.** The task splits the analyzer loop that feeds the report hash. A wrong split changes a finding without a visible error. A wrong store gives a manifest that binds a mix of two HEADs. A wrong stop rule writes the manifest from a partial run. The task adds no hash field and no manifest key. The store is outside git and holds no hash (AGENTS.md hashing policy). The store identity is the Git commit from `git rev-parse HEAD`.

**Facts read on 2026-11-11 (no run).** Red and Green measure again.

| # | Fact | Source |
|---|---|---|
| S1 | `runArchitecturePinRefreshCli` returns `0 \| 1 \| 2` today and takes `PinRefreshCliDependencies` with three members. `parsePinRefreshArguments` rejects every argument except `--acknowledge`. At HEAD, a test that passes `--budget-s` therefore fails by a thrown `Unsupported architecture pin refresh argument`. That is the Red failure reason for the cases that use it. | `architecture-pin-refresh-cli.ts:40-90` |
| S2 | The cost file calls `runArchitecturePinRefreshCli` in the test process and counts `git archive` calls and analyzer calls with `vi.mock` wrappers of `node:child_process` and `../analyzer.js`. The resume file copies that pattern. It needs no `typescript` mock. | `architecture-analyzer-cost.test.ts:84-125` |
| S3 | `createBaseFixture` copies the real `packages/architecture-enforcement/src` into the fixture. The analyzed module set therefore holds the production paths and the `apps/` files. The count `fixture_modules` is not known before the run. The test reads it from `selectV2AnalyzerSourcePaths(root).length` and asserts the floor. | `architecture-analyzer-cost.test.ts:204-246`, `v2-manifest-validation.ts:756-766` |
| S4 | The candidate overlay reads `git diff` and `git ls-files --others` under the candidate root only. The store sits at the repository root in `.cache`, outside that root. A store file therefore does not trigger `candidate_overlay`. | `v2-manifest-validation.ts:219-246` |
| S5 | `.gitignore:42` holds `.cache`. In the real repository the store is ignored. The fixture repositories hold no `.gitignore`, and they need none (S4). | `.gitignore:42` |
| S6 | `cloneFixture` copies a whole fixture with its `.git` folder. Two clones of one stale fixture hold the same `HEAD` and the same bytes. The split run and the one-run refresh therefore start from equal inputs. | `architecture-analyzer-cost.test.ts:262-268` |
| S7 | The store key for a module is a source path. A source path can hold the text `hash`. The key scan of AC-10 must therefore skip the keys inside `modules` (A7). | spec FR-8.4 |

**The Red command** (the one named file outside heavy-run):

```bash
CI=true pnpm exec vitest run --maxWorkers=1 packages/architecture-enforcement/src/__tests__/architecture-pin-refresh-resume.test.ts
```

The Red role writes this one file and changes no other path. The Red role runs no package suite and no real refresh. Then the type check through the wrapper: `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter @reading-advantage/architecture-enforcement check-types'`. Expect exit 0, so the new names go through a cast and the file loads at HEAD. The aggregate suite is not a gate while the Red file is open (section 1.4).

**The fixture rules**

- Each fixture is a small repository built in the test with `mkdtemp`, on the pattern of `architecture-analyzer-cost.test.ts` (`createBaseFixture`, `cloneFixture`, `patchManifest`). The test removes each fixture in `afterAll`.
- Each fixture holds a committed stale manifest (one wrong `analyzerInputSnapshotSha256`). The fixture satisfies `hasFullRepositoryInputSet` (fact M10). It holds at least 7 analyzed modules: `fixture_modules>=7`. The test asserts the floor before any loop (A4).
- The fixture adds modules under `apps/` with names that hold none of the texts `hash`, `sha256`, and `checksum`. Each module is small and has no finding, so a split bug shows as a manifest difference and not as noise.
- No real network, no heavy job, no real refresh, and no write into the real repository manifest. Each case runs the CLI in the test process through `runArchitecturePinRefreshCli` with `discoverRepositoryRoot` set to the fixture root. The one real-repository access is the `git check-ignore` call of `ac10_store_path_is_git_ignored`, which writes nothing.
- **No time-based budget.** No case reads a clock and no case asserts an `elapsed_s` value. The clock is the injected stub `PinRefreshCliDependencies.now`. The stub returns a test variable. The test adds a fixed step to that variable inside its `writeStdout` hook, each time a line holds `modules_done=`. The step stops a run: a run of `--budget-s <k>` with a stub step of 1000 ms ends after about `k` batch lines. The test never hard-codes the batch count for a run. It asserts properties: exit code, stored count above 0 and below the total, and the labeled counts. Two more stops use the same stub: a jump of the variable inside the hook on the line `step=prelude` (the zero-progress case), and a `batchModules` of 2.
- **Run loop guard.** A loop of runs ends at the first exit that is not 3. The loop has a hard cap: `runs<=50`. A loop that reaches the cap fails with `runs=<n>` (A4). The loop asserts `runs>=3` before the equality compare of AC-14 and before the count compare of AC-15. The loop also asserts an upper bound `runs<=12` so the file stays within the time of the package suite.
- **Equal inputs.** The split fixture and the one-run fixture are two `cloneFixture` copies of one stale fixture (fact S6).
- **Counting seams.** `git archive` calls count projections. The passthrough wrapper of `../analyzer.js` counts analyzer calls. The `onModuleAnalyzed(pass, sourcePath)` dependency counts modules, and the test keeps one map for each pass. Each case clears the counters before its measured run (as in the cost file).
- **Store seeds for the discard cases.** The test builds a store file by hand, in the exact format of FR-8.4, with one wrong finding list for one module. It builds the base from a real exit 3 run, then edits the field under test (`headCommit`, `version`, `sourcePaths`, or `candidatePaths`), or it writes a non-JSON file. A store that is wrong for two reasons proves nothing: each row changes one field only.

**The cases and their proofs**

One row for each criterion. The plan holds the case names; each row names them. The case `resume_fixture_positive_control` and the case `ac11_candidate_overlay_prints_checkpoint_off` are strategy additions (the Red role may add cases; the floors may rise and may not fall).

| AC | Cases | What the cases prove | Falsification condition | At HEAD |
|---|---|---|---|---|
| (control) | `resume_fixture_positive_control` | The stale fixture validates as stale: the one-run refresh with `--acknowledge` exits 0 and fixes the pin. `fixture_modules>=7`, `analyzer_calls>=1`, `archive_calls>=1`, `module_events>=1`. Each seam counts in the control run. | Any seam reads 0, or the fixture refresh fails. A later count of 1 or 0 then proves nothing (A4). | pass |
| AC-9 | `ac9_step_lines_for_every_step`, `ac9_batch_lines_count_up_to_total` | A one-run refresh with `batchModules` 2 prints a `step=` line for each of `store`, `projection`, `prelude` (once with `pass=1` and once with `pass=2`), `combine`, `input_snapshot`, `trees`, and `validate`. Each line carries the prefix `architecture pin refresh: ` and matches an anchored pattern. It prints one `step=modules pass=<1\|2> modules_done=<n> modules_total=<n> elapsed_s=<n>` line after each batch. The `modules_done` values grow in each pass, and the last value of each pass equals `modules_total`. The labeled counts are `step_lines=<n>`, `batch_lines_pass1=<n>`, `batch_lines_pass2=<n>`. | A listed `step=` line is missing or has the wrong form. A pass prints no batch line. A `modules_done` value falls or stays equal. The last value is not `modules_total`. A pattern holds `elapsed_s=<digits>` as a free token and the test reads its value. The test asserts a value for `elapsed_s` (clock read). | fail |
| AC-10 | `ac10_store_written_after_partial_run`, `ac10_store_holds_no_hash_key`, `ac10_store_path_is_git_ignored` | After an exit 3 run, `.cache/architecture-pin-refresh/checkpoint.json` exists. It holds `version` 1, `headCommit` equal to `git rev-parse HEAD` of the fixture (40 hex), `candidatePaths` equal to `[]`, `sourcePaths` equal to the projection paths, and `passes[0].modules` with the finished modules and their findings only. `passes[0].modules` holds at least 1 and fewer than all keys. No structural key holds `hash`, `sha256`, or `checksum`. The scan covers the top level, `passes`, and each pass record, and it skips the keys inside `modules` (fact S7; A7). The guard runs `git check-ignore -q .cache/architecture-pin-refresh/checkpoint.json` in the real repository and requires exit 0. | The file is missing or a field differs. A module with no finished state is in the store, or a module that finished is not. A structural key holds one of the three texts. The scan skips the whole file, or it flags a source path that holds the text (over-broad filter). The check-ignore command exits 1, or exits 128 and the test reads that as "ignored". | fail, fail, **pass (guard)** |
| AC-11 | `ac11_store_from_another_head_is_discarded`, `ac11_unusable_stores_are_discarded` (`it.each`, 4 rows), `ac11_changed_candidate_root_bypasses_store`, `ac11_candidate_overlay_prints_checkpoint_off` | A store at another `headCommit` with a wrong finding for one module: the run prints `checkpoint=discarded reason=head_changed`, analyzes every module of pass 1 (`onModuleAnalyzed` fires N times for pass 1), and writes a manifest equal to the manifest of a run with no store. The same holds for an unreadable file (`reason=unreadable`), `version` 2 (`reason=version`), a different `sourcePaths` (`reason=source_paths`), and a non-empty `candidatePaths` (`reason=candidate_overlay`). When the candidate root holds a changed file, the run neither reads nor writes the store, ignores the budget, exits by FR-4, and prints `checkpoint=off reason=candidate_overlay`. | The wrong finding enters the manifest. A module of pass 1 is skipped. The reason text is missing or wrong in a row. The discard leaves the old file in place. The run reads a store when the candidate root is changed, or it writes one. The guard writes a store after the run. | fail, fail, **pass (guard)**, fail |
| AC-12 | `ac12_run_stops_at_budget_with_exit_3`, `ac12_partial_run_writes_no_manifest_with_acknowledge`, `ac12_zero_progress_run_exits_2`, `ac12_budget_argument_parsing` | With the stub clock past the budget, the run exits 3 and prints the `partial pass=<1\|2> modules_done=<n> modules_total=<n>; run again with the same arguments` line. The manifest bytes stay equal to the bytes before the run, with and without `--acknowledge`. The store holds at least 1 and fewer than all modules. The run starts no batch after `shouldContinue()` returned false: the count of `onModuleAnalyzed` events in the run equals the count of new keys in the store. When the prelude uses the whole budget (the stub jumps on the `step=prelude` line), the run exits 2 and stores no module. `parsePinRefreshArguments` returns `budgetSeconds` 1500 without the flag and 900 for `--budget-s 900`. It throws for `0`, `-5`, `1.5`, `abc`, and a missing value. | The exit code is not 3. The store holds 0 or all modules. The manifest changes in an exit 3 run. The run analyzes a module after the stop. A run that stored nothing exits 3. The default is not 1500. The parser accepts one of the five bad values. The parser case tests only some of the five (loop over an empty set, A4: the case asserts `bad_values=5` before the loop). | fail |
| AC-13 | `ac13_resume_analyzes_only_missing_modules`, `ac13_last_run_writes_manifest_and_deletes_store`, `ac13_complete_store_makes_no_analyzer_call` | After a stop, the next run analyzes only the modules that the store lacks: `onModuleAnalyzed` fires for no stored module. The sum of the modules analyzed over all runs equals `fixture_modules` for each pass: `analyzed_pass1=<N>`, `analyzed_pass2=<N>`. The last run exits 0 with `--acknowledge`, writes the manifest, and deletes the store file. A run whose store holds both complete passes makes 0 analyzer calls and 0 prelude lines (`analyzer_calls=0`). | A stored module fires again. The sums differ from N (a module is lost or repeated at a batch edge). The last run exits non-zero, writes no manifest, or leaves the file. The run with a complete store calls the analyzer. | fail |
| AC-14 | `ac14_split_manifest_equals_full_manifest_field_by_field`, `ac14_key_set_equals_v2_manifest_keys` | The split refresh (at least 3 runs, `runs>=3`, batch size 2, stub clock) and the one-run refresh give a manifest with the same value in every field. The test compares key by key and prints the key name of the first difference. The bytes are equal. The key list of the written manifest equals the key list of the manifest before the refresh and the strict validator accepts it (fact N3; no literal key list in the test, A12). The test files of AC-2 and AC-8 pass at the same HEAD (gate item 2). | One field differs, or the bytes differ. `runs<3` (the series did not split, so the case proves nothing). The test holds a literal key list. The compare is over a manifest that the split run never wrote (a stale file read, not the written file). | fail, **pass (guard)** |
| AC-15 | `ac15_projections_equal_run_count`, `ac15_each_module_analyzed_once_per_pass`, `ac15_unsplit_refresh_keeps_fr7_counts`, `ac15_validation_adds_no_projection_or_analyzer_call` | Over the split refresh of R runs: `archive_calls=R` (one projection for each run, fact S2). `module_events=2*N`, and each source path fires once for each pass (`max_events_per_module_pass=1`). The validation step adds no projection and no analyzer call: the counters at the `step=validate` line equal the counters at the end. The one-run refresh makes `projections=1` and `analyzer_calls=2` (AC-7 holds). The input snapshot runs once: the `step=input_snapshot` line appears `input_snapshot_lines=1` time over the whole series. | `archive_calls` differs from R. A module fires twice for a pass, or the total is not 2 × N. The validation makes a projection. The unsplit refresh makes other than 1 and 2. The input snapshot line prints in each run. | fail, fail, **pass (guard)**, fail |
| AC-16 | `ac16_store_holds_a_record_for_each_pass`, `ac16_pass_two_starts_after_pass_one_completes`, `ac16_changed_pass_two_finding_exits_2` | The store holds `passes[0]` and `passes[1]`. A module of pass 2 is analyzed only after every module of pass 1 is in the store (the event order shows no pass 2 event before the last pass 1 event). A run that stops inside pass 2 resumes in pass 2 and fires no pass 1 event. A store whose pass 2 holds a changed finding list for one module makes the last run exit 2 with `Analyzer reports are not byte-identical`, with the manifest bytes unchanged. | A pass 2 event comes before the last pass 1 event. A resume repeats pass 1. A changed pass 2 finding exits 0, or the message differs, or the manifest changes. The test changes a pass 1 and a pass 2 finding at once (the case proves nothing about pass 2). | fail |
| AC-17 | `ac17_documentation_names_budget_store_and_exit_3` | `docs/architecture-enforcement.md` names `--budget-s`, `.cache/architecture-pin-refresh/checkpoint.json`, and exit code 3. This is an artifact test (section 1.3). It proves the text and never the behavior. | One of the three texts is missing. The test passes on a text in a code comment or in another file. | fail |

**The two report passes.** AC-10, AC-13, AC-15, and AC-16 hold a record, a count, or an order for each pass. AC-16's changed pass 2 finding proves that the last run compares the two assembled reports and does not copy one into the other. The mutant list below names the "pass 2 copies pass 1" defect.

**AC-2 and AC-8 still hold.** The cost file keeps `ac8_manifest_key_set_unchanged_after_refresh` and `ac8b_new_analyzed_file_still_fails`. The pin file keeps its AC-2 cases. Gate item 1 runs both files at the Green HEAD. The 1.4b Green change adds a new exported function to `v2-manifest-validation.ts`, which leaves the old function unchanged. A drop in either file is a Green defect.

**The expected Red state at HEAD.** Exit 1. The plan's 25 names plus the two strategy additions are 27 named cases. The `it.each` of AC-11 holds 4 rows, so `tests_total>=30`. The guards that pass at HEAD are `resume_fixture_positive_control`, `ac10_store_path_is_git_ignored`, `ac11_changed_candidate_root_bypasses_store`, `ac14_key_set_equals_v2_manifest_keys`, and `ac15_unsplit_refresh_keeps_fr7_counts`: `tests_passed>=5` and `tests_failed>=25`. Each failing case fails for the reason of fact S1 or for a missing store, a missing line, or a missing text, and never for a load error, a `Cannot find module`, or a type error. The Red evidence names each guard with its reason: the base code already meets it. If a listed guard fails at HEAD, the Red role reports the cause, and the strategy does not accept a fix by a weaker assertion.

**The labeled counts of the resume file.** `resume_control=1`, `ac9_cases=2`, `ac10_cases=3`, `ac11_cases=7` (1 + 4 `it.each` rows + 1 + 1 addition, counted per expanded test), `ac12_cases=4`, `ac13_cases=3`, `ac14_cases=2`, `ac15_cases=4`, `ac16_cases=3`, `ac17_cases=1`, `fixture_modules>=7`, `runs>=3`, `runs<=12`, `bad_values=5`, `manifest_keys_added=0`. Each message holds `label=<n>` built from a variable of that name (A3). The floors may rise and may not fall.

**The no-clock rule and its detectors.** No case reads a clock or asserts a duration, as in P1.11. The stub is a plain variable. Both detectors exit 1:

```bash
rg -n 'Date\.now|new Date|performance\.now|hrtime|setTimeout|setInterval|useFakeTimers|getTime' packages/architecture-enforcement/src/__tests__/architecture-pin-refresh-resume.test.ts
rg -n 'elapsed_s=[0-9]' packages/architecture-enforcement/src/__tests__/architecture-pin-refresh-resume.test.ts
```

The second detector finds a literal `elapsed_s` value in an assertion. A pattern may hold `elapsed_s=\d+`; the detector uses `[0-9]` literals only, so a pattern with `\d` does not match it. A per-case timeout argument of `it` is a number for the runner and is allowed. The wall-time rule of 1500 s is proven only by the 1.4 series.

**The mutants.** Each mutant is a wrong copy of the code. The test must reject it.

- A run that writes the manifest after an exit 3 stop. Rejected by `ac12_partial_run_writes_no_manifest_with_acknowledge`.
- A run that stops with no new module and exits 3. Rejected by `ac12_zero_progress_run_exits_2`.
- A run that starts one more batch after `shouldContinue()` returned false. Rejected by `ac12_run_stops_at_budget_with_exit_3` (event count against new keys).
- A store that ignores `headCommit`. Rejected by `ac11_store_from_another_head_is_discarded`.
- A store reader that trusts any `sourcePaths`, any `version`, or any `candidatePaths`. Rejected by the four rows of `ac11_unusable_stores_are_discarded`.
- A run that reads the store when the candidate root is changed. Rejected by `ac11_changed_candidate_root_bypasses_store`.
- A resume that analyzes a stored module again. Rejected by `ac13_resume_analyzes_only_missing_modules`.
- A resume that skips a module at a batch edge. Rejected by `ac13_resume_analyzes_only_missing_modules` (sum against N) and by `ac14_split_manifest_equals_full_manifest_field_by_field`.
- A store that keeps the old file after a successful write. Rejected by `ac13_last_run_writes_manifest_and_deletes_store`.
- A last run that uses the pass 1 findings for pass 2 and skips the compare. Rejected by `ac16_changed_pass_two_finding_exits_2`.
- A pass 2 that starts before pass 1 is complete. Rejected by `ac16_pass_two_starts_after_pass_one_completes`.
- A store that holds a hash, a checksum, or a tree identity as a key. Rejected by `ac10_store_holds_no_hash_key`.
- An assembly that sorts findings in another order than the one-run result. Rejected by `ac14_split_manifest_equals_full_manifest_field_by_field`.
- A projection for each batch instead of each run. Rejected by `ac15_projections_equal_run_count`.
- A validation that makes its own projection or analyzer call. Rejected by `ac15_validation_adds_no_projection_or_analyzer_call`.
- A batch line that prints from a separate counter that does not follow the store. Rejected by `ac9_batch_lines_count_up_to_total`.
- A parser that accepts `--budget-s 0`, a negative value, a fraction, or text. Rejected by `ac12_budget_argument_parsing`.

**Anti-pattern coverage for 1.4b**

| Anti-pattern | Defense | Falsification condition |
|---|---|---|
| A3 | Every count in a message and in a plan note is `label=<n>`: `runs`, `fixture_modules`, `archive_calls`, `module_events`, `analyzer_calls`, `analyzed_pass1`, `analyzed_pass2`, `step_lines`, `input_snapshot_lines`, `bad_values`. The progress lines of FR-8.2 are labeled values by design (`modules_done=<n>`), and each test parses the label and never the position. | A message or a note holds a bare number. A progress check reads a value by position (`split(" ")[3]`). |
| A4 | The positive control proves each seam counts. `fixture_modules>=7` and `runs>=3` are asserted before the loops that use them. The run loop has a hard cap and an upper bound. `bad_values=5` is asserted before the parser loop. Each failing case fails at HEAD by a thrown unsupported-argument error or a missing line, not by a vacuous 0. | A seam reads 0 in the control. A loop runs over an empty set. A series that never splits still passes the equality case. |
| A5 | A plan note for 1.4b quotes the exit code and the labeled counts of each command. The Gate 2 failure of the one known `baseline-validation.test.ts` case is named with its exit code and counts, as the 1.4a note did. A `heavy-run` code (124, 137, 75, 77, 201) is named with its code. | A note says "pass" with a non-zero exit. A note hides the expected `baseline-validation` failure or adds a second failure to it. |
| A6 | The registry note in `measure/tracks.md` keeps the claim that the local pin stays and that CI skips only the input pin. It makes no claim that the refresh is done before task 1.4 ends. | The registry says the pin is refreshed while task 1.4 is open. |
| A7 | The AC-10 key scan skips `modules` keys (fact S7) and is tested with a fixture path that holds no forbidden text. The AC-9 patterns are anchored and name the full line. A near-miss line (`step=modules` with a missing label) is a positive failing case, not an excluded line. | A scan flags a path name, or it skips the structural keys. A pattern accepts a line with a missing label. |
| A9 | The resume file holds no `measure/tracks` and no `measure/runs` path. Detector: `rg -n 'measure/tracks\|measure/runs' <resume file>` exits 1. The documentation case reads `docs/architecture-enforcement.md` only. | The detector exits 0 or 2. |
| A10 | After the Green commit, `build-graph update ./graph.db <the changed source files>` runs once through `heavy-run.sh` (Gate 5). The Green task adds exports: `ArchitectureAnalysisStopped`, `analyzeArchitectureModuleFindings`, `assembleArchitectureAnalysis`, `computeAnalyzerReconciliationEvidenceResumable`, and the new store module. | A new export and a stale graph. A `build-graph` call outside the wrapper. |
| A12 | The key check of AC-14 compares the key list of the written manifest with the key list before the refresh, and it uses the strict validator as the oracle (fact N3). | The file holds a literal key list. |
| A14 | Every detector uses `rg -n`. An exit code of 2 is a failure and never "no hit". | A detector exits 2 and the evidence reads "no hit". |
| A15 | The role receipts hold the commit and the commands and no file hash. The store holds no hash. | A receipt holds a hash that a later commit changes. |
| A16 | The tests create no worktree. See the note for task 1.4 below: the snapshot worktree default needs a PM waiver of A16. | `git worktree add` runs without a recorded PM waiver. |

A1, A2, A8, A11, and A13 are not risks of this task, as in section 1.7.

**The Green gate for 1.4b.** Every item runs at the Green HEAD. One job at a time. The wrapper prefix is `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600`.

1. The targeted file, outside the wrapper: `CI=true pnpm exec vitest run --maxWorkers=1 packages/architecture-enforcement/src/__tests__/architecture-pin-refresh-resume.test.ts` exits 0 with `tests_failed=0`, `tests_skipped=0`, and `tests_total>=30`.
2. The cost file, outside the wrapper: `CI=true pnpm exec vitest run --maxWorkers=1 packages/architecture-enforcement/src/__tests__/architecture-analyzer-cost.test.ts` exits 0 with `tests_total=8` and `tests_failed=0`. The Green change edits no test file.
3. The pin file, outside the wrapper: `CI=true pnpm exec vitest run --maxWorkers=1 packages/architecture-enforcement/src/__tests__/architecture-ci-input-pin.test.ts` exits 0 with `tests_total=20` and `tests_failed=0`.
4. The package suite through the wrapper: `CI=true pnpm --filter @reading-advantage/architecture-enforcement test`. The floors are `suite_files>=34` and `suite_tests>=309` (the 1.4a Green note quotes `suite_files=33` and `suite_tests=279`; the resume file adds 1 file and at least 30 tests). The one expected failure is the `baseline-validation.test.ts` case "rejects stale synchronous v2 implementation and input hashes" (`tests_failed=1`, stale tree hash until task 1.4). Any other failure stops the task. The note quotes the delta.
5. The type check through the wrapper: `pnpm --filter @reading-advantage/architecture-enforcement check-types`. Exit 0.
6. The lint through the wrapper: `pnpm --filter @reading-advantage/architecture-enforcement lint`. Exit 0.
7. `build-graph update ./graph.db <the changed source files>` through the wrapper only (A10).
8. All detectors of this section exit 1, and the Green commit touches only the allowed paths below. The Green role runs no `pnpm architecture:pin:refresh`.

**The allowed paths for 1.4b**

- Red: `packages/architecture-enforcement/src/__tests__/architecture-pin-refresh-resume.test.ts`.
- Green: `packages/architecture-enforcement/src/analyzer.ts`, `packages/architecture-enforcement/src/pin-refresh-checkpoint.ts` (new), `packages/architecture-enforcement/src/v2-manifest-validation.ts`, `packages/architecture-enforcement/src/architecture-pin-refresh-cli.ts`, `docs/architecture-enforcement.md`, and the track files under `measure/tracks/architecture_ci_input_pin_20261110/`.
- Out of scope: `.gitignore`, the manifest file, the three path lists in `reconciliation-manifest.ts`, the barrel, the archive folder, and the Red, pin, and cost test files after Red. A new exported function needs a JSDoc block.
- Fact M4 holds: `analyzer.ts`, `v2-manifest-validation.ts`, and the CLI file change the analyzer inputs. The 1.4b Green commit makes the manifest pins stale again. The CI-mode command stays red at the 1.4b HEADs, as the plan rule states. A wider skip is a defect.

**Reviews for 1.4b**

| Review | Applies to 1.4b | Scope |
|---|---|---|
| Review A (correctness) | **yes (required)** | The loop split keeps the result bytes without the option (`analyzeArchitectureSources` with no `moduleCheckpoint` returns the old bytes). The assembly sorts and merges as `analyzer.ts:2967-2972` does. `shouldContinue()` is called before each batch, the first included. The store write is a temporary file then a rename. The budget rule of FR-8.5 holds, and a run with no new module exits 2. The last run compares the two assembled reports. `computeAnalyzerReconciliationEvidence` stays unchanged. |
| Review B (security) | **yes (required)** | Review of one new integrity surface: a stored finding list that a later run trusts. The store is trusted only for one `headCommit` with equal `sourcePaths` and an empty `candidatePaths`. A forged store with a wrong finding must fail the byte-identity compare or be discarded: the test of AC-16 covers pass 2, and Review B asks whether a forged pass 1 and pass 2 pair that agree can reach the manifest. This is a known limit (see below), accepted because the store sits in a git-ignored folder on the local machine and the manifest is then checked by the CI report-hash compare. The store holds no hash. The write goes to the manifest only. The CI workflow never runs the refresh. |
| Review C (UX/API) | **yes (required, limited scope)** | The command-line contract: `--budget-s`, the progress lines, exit codes 0, 1, 2, and 3, and the `partial` line that tells the user to run again with the same arguments. The documentation names the flag, the path, and the code. |
| Adversarial | **yes (required)** | Attack surfaces: a forged or edited store; a store from another HEAD; a truncated store file (a stop in the middle of a write); two runs at once on one store; a `--budget-s` value at the edge; and a clock that moves back. The phase round may add cases. |
| Browser review (UX) | no | No page, no component, no route. |

**What the 1.4b tests cannot prove**

- The wall time. No test reads a clock. Only the 1.4 series proves that each run fits 1800 s and that the prelude time leaves room for a batch (spec OQ-1 and OQ-3).
- That a forged store with equal passes is rejected. The byte-identity compare needs a difference between the two passes. A forged equal pair passes. The CI report-hash compare is the later defense, and the limit stays.
- The `input_snapshot` count by a seam. The step line proves the count in the output. A run that prints the line once but computes the snapshot in each run is not seen. Review A reads the code for it.
- Two runs at once on one store. The heavy lock holds one job at a time. No test starts two runs.
- The real number of runs and the real `reason=head_changed` events. The 1.4 series records them (spec OQ-2).

**Task 1.4 note (spec OQ-2: HEAD moves during the series).** The store is valid for one full HEAD. Other roles commit to master while the series runs, and each commit discards the store (`reason=head_changed`). The default of the orchestrator is a **snapshot worktree**: task 1.4 runs the whole series in a worktree at one fixed commit, so its HEAD does not move. Task 1.4 removes the worktree after the manifest commit. The PM decides.

Points for the orchestrator and the PM:

- The snapshot commit is the 1.4b Green commit, or a later commit that changes no analyzer input except the manifest (the rule of P1.11). Task 1.4 records `git rev-parse HEAD` of the snapshot before the first run.
- The series runs `pnpm architecture:pin:refresh --acknowledge --budget-s 1500` from the snapshot root, under `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800` for each run. The store sits in the snapshot `.cache` folder. The manifest changes in the snapshot. The role copies only that one manifest file back to master and commits it there with the header of plan task 1.4. The role must not commit from the snapshot branch: the commit on master uses the manifest of the snapshot, and its five pins must match the master HEAD analyzer inputs. Master must therefore hold no analyzer-input change between the snapshot commit and the manifest commit. If a role changed an analyzer input in that time, the pins are stale at once, and the role stops and reports.
- **A16 conflict.** `measure/anti-patterns.md` A16 says: "Never run `git worktree add`". The `git worktree list` output today shows more than one worktree, so the rule is already not met in this repository. A snapshot worktree is still a new worktree. The PM must record a waiver of A16 for this one use, or choose another path. A16 is not met by default until that waiver exists.
- **Alternative that meets A16.** A detached local clone in a plain folder under `/tmp` (`git clone --shared --no-checkout <repo> <dir>`, then `git checkout --detach <sha>`) is not a registered worktree. It needs `node_modules` (a link or an install) and the heavy job. The orchestrator measures that cost before the choice.
- Cleanup: the role removes the worktree with `git worktree remove <path>` and then `git worktree prune`, or deletes the clone folder, in the same turn as the manifest commit (AGENTS.md cleanup rule). It reports `git worktree list` at the end.
- If the PM rejects both, the default of spec OQ-2 stays: print HEAD before each run, tell the PM at the first `head_changed` discard, and stop at the second.

#### P1.13 Task 1.4c: static public assets are not analyzer inputs (added 2026-11-11)

Source: spec FR-9, D-10, AC-18 to AC-21, OQ-7 to OQ-9, and plan task 1.4c (plan commit `756eb027b`). Round 7 of task 1.4 stopped inside batch 16, which holds 69 minified bundles under `apps/www-reading-advantage/public/experience/assets`.

**Risk: medium.** The change is one rule in `isIgnoredPath` in `inventory.ts`. It selects analyzer inputs. It is not a finding exemption (FR-9.4), and it adds no baseline entry. A rule that is too wide drops real source from the architecture checks without a visible error. A rule that is too narrow keeps the slow bundles. The task adds no hash and no manifest key. `inventory.ts` is in `V2_ANALYZER_IMPLEMENTATION_PATHS`, so the Green commit makes the pins stale until task 1.4.

**The Red command** (a named file outside heavy-run):

```bash
CI=true pnpm exec vitest run --maxWorkers=1 packages/architecture-enforcement/src/__tests__/inventory.test.ts
```

Red adds one `describe` block, "static public assets (AC-18 to AC-21)", to this file and changes no other path. Red adds no clock read, no spy on the analyzer, and no hash. Then the package type check through the wrapper, with exit 0: `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter @reading-advantage/architecture-enforcement check-types'`. The aggregate suite is not a gate while the Red file is open (section 1.4).

**The expected Red state.** Exit 1. The counts are `tests_total=19`, `tests_failed=5`, and `tests_passed=14`: 8 existing cases plus 11 new cases. The 5 failing cases are the AC-18 group (`ac18_public_js_is_not_selected` 1, `ac18_public_variants_are_not_selected` 3 rows, `ac18_inventory_scans_only_the_control` 1). Each fails because the base code selects or scans the public file. The 6 guard cases pass at HEAD: `ac19_src_file_is_still_selected` 1, `ac20_app_level_match_only` 4 rows, and `ac21_manifest_key_set_is_unchanged` 1. Red names each guard with its reason: the base code already meets it. A failure for a syntax error or an import error is not a valid Red. Red records the real counts.

**The cases and their falsification conditions**

| AC | Cases | What the cases prove | Falsification condition | At HEAD |
|---|---|---|---|---|
| AC-18 | `ac18_public_js_is_not_selected`, `ac18_public_variants_are_not_selected` (3 rows: `public/a/b/y.mjs`, `public/z.jsx`, `public/serwist/sw.js`), `ac18_inventory_scans_only_the_control` | `selectArchitectureSourceFiles` on a list that holds a public file and the control `apps/example/src/x.ts` does not return the public path. `inventoryRepository` on the same files, where the public file holds `import OpenAI from "openai";`, returns `filesScanned=1`, no fact with a `public/` source path, and no parse error with a `public/` source path. | The result holds a public path. `filesScanned` is not 1. A fact or a parse error names a `public/` path. A row list is empty (the case asserts `variant_rows=3` before the loop, A4). | fail |
| AC-19 | `ac19_src_file_is_still_selected` | The control `apps/example/src/x.ts` stands in the same list as the public file and stays selected. A rule that ignores a whole app fails here. | The control is missing from the result. | **pass (guard)** |
| AC-20 | `ac20_app_level_match_only` (4 rows) | The result still holds `apps/example/src/public/x.ts` (nested directory), `apps/example/src/public.ts` and `apps/example/public.ts` (names that start with `public`), and `packages/example/public/x.ts` (another root). A rule that ignores any `public` segment, or a prefix match on the text, fails. | One of the four paths is missing from the result. The row list has fewer than 4 rows (`guard_rows=4`). | **pass (guard)** |
| AC-21 | `ac21_manifest_key_set_is_unchanged` | The key list of `src/config/analyzer-reconciliation.v2.json`, read with `new URL("../config/analyzer-reconciliation.v2.json", import.meta.url)`, equals the test's own copy of the 15 keys of `V2_MANIFEST_KEYS`, in order. Task 1.4c changes no manifest field. The own copy follows `reconciliation-manifest-v2.red.test.ts:24`, as the spec says. | A key is new, missing, or in another order. The test reads a key list from the production module and compares it with itself (a test that cannot fail). | **pass (guard)** |

The own key list in AC-21 is a spec choice and differs from the A12 rule of the cost and resume files. The guard exists to stop a task that edits the manifest. A12 asks that a check never drifts from the module. The two aims meet if the list has exactly the 15 keys of `V2_MANIFEST_KEYS` at this HEAD. Review A checks the list once against `v2-manifest-validation.ts:109-125`.

**Fixtures and mocks.** The cases use the `writeFixture` helper and the `trackedFiles` option of the existing cases (`inventory.test.ts:30-181`). No real repository file is read except the manifest file of AC-21. No network, no heavy job, no clock, and no mock. The AC-18 and AC-19 cases put the public file and the control in one list, so the case fails for the right reason at HEAD.

**The Green gate.** One job at a time. The wrapper prefix is `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600`.

1. The four named files, outside the wrapper: `CI=true pnpm exec vitest run --maxWorkers=1 packages/architecture-enforcement/src/__tests__/inventory.test.ts packages/architecture-enforcement/src/__tests__/architecture-pin-refresh-resume.test.ts packages/architecture-enforcement/src/__tests__/architecture-analyzer-cost.test.ts packages/architecture-enforcement/src/__tests__/architecture-ci-input-pin.test.ts`. Exit 0 with `tests_failed=0` and `tests_skipped=0`. The count of the inventory file is `tests_total=19`.
2. The package suite through the wrapper: `CI=true pnpm --filter @reading-advantage/architecture-enforcement test`. The 1.4b Green note quotes `suite_files=34` and `suite_tests=309`, and the Red file adds 11 cases, so the floors are `suite_files>=34` and `suite_tests>=320`. The one expected failure is the `baseline-validation.test.ts` case "rejects stale synchronous v2 implementation and input hashes" (`tests_failed=1`). The cause is the stale implementation tree hash, which stays until task 1.4. Any other failure stops the task. The note quotes the delta.
3. `pnpm --filter @reading-advantage/architecture-enforcement check-types` through the wrapper. Exit 0.
4. `pnpm --filter @reading-advantage/architecture-enforcement lint` through the wrapper. Exit 0.
5. `build-graph update ./graph.db packages/architecture-enforcement/src/inventory.ts` through the wrapper only (A10).
6. The Green commit touches `packages/architecture-enforcement/src/inventory.ts` only. The Green role runs no `pnpm architecture:pin:refresh`.

**The allowed paths for 1.4c.** Red: `packages/architecture-enforcement/src/__tests__/inventory.test.ts`. Green: `packages/architecture-enforcement/src/inventory.ts`. Out of scope: `analyzer.ts`, `v2-manifest-validation.ts`, the manifest file, `.gitignore`, the docs, the other test files, and the archive. The set `GENERATED_WORKSPACE_DIRECTORIES` does not change (D-10). The CI-mode command stays red at the 1.4c HEADs, as the plan rule states.

**Reviews for 1.4c**

| Review | Applies | Scope |
|---|---|---|
| Review A (correctness) | **yes (required)** | The new line sits after the `node_modules` line. It tests `segments[0] === "apps"`, `segments[2] === STATIC_ASSET_DIRECTORY`, and `segments.length > 3`. The constant sits next to the set and the set is unchanged. The JSDoc names the new case. The `isIgnoredPath` function is the only function that changes. Check once that the module count falls by the 70 tracked files, and that no tracked source imports a `.js` file from `public/` (FR-9 evidence). |
| Review B (security) | small, at phase level | One point: the rule removes the architecture checks for files under `apps/<app>/public/`. The loss of `apps/primary-advantage/public/serwist/sw.js` is accepted (OQ-7). The rule adds no wildcard, no policy exemption, and no baseline entry (FR-9.4). Review B reads the rule width: any `apps/<app>/public/**` file is out, and nothing else. |
| Review C (UX/API) | no | No flag, no message, no page, and no public API. |
| Adversarial | small, at phase level | One surface: a path that tries to use the rule to hide source. The cases are `apps/example/src/public/x.ts`, `apps/example/public.ts`, and `packages/example/public/x.ts` (AC-20). The phase round may add `apps/public/x.ts` (an app named `public`) and a path with a doubled slash. |
| Browser review (UX) | no | No page, no component, no route. |

**Anti-pattern coverage for 1.4c**

| Anti-pattern | Defense | Falsification condition |
|---|---|---|
| A3 | Every count in a message and in a plan note is `label=<n>`: `tests_total`, `tests_failed`, `tests_passed`, `variant_rows`, `guard_rows`, `files_scanned`, `suite_files`, `suite_tests`. | A message or a note holds a bare number. |
| A4 | The control `apps/example/src/x.ts` stands in each list. `variant_rows=3` and `guard_rows=4` are asserted before the `it.each` loops. The 5 AC-18 cases fail at HEAD because the public path is selected, not because the fixture is empty. | A loop runs over an empty set. A case fails at HEAD for a missing fixture. A guard that cannot fail (AC-21 compares a list with itself). |
| A5 | The Red and Green notes quote the exit code and the counts. The one known `baseline-validation` failure is named with its exit code and `tests_failed=1`. A `heavy-run` code is named with its code. | A note says "pass" with a non-zero exit, or hides the known failure. |
| A7 | The AC-20 rows are exact paths, and no row is a pattern. A name that starts with `public` is a positive case that must stay selected. | A prefix match drops `public.ts`. The rule accepts any segment named `public`. |
| A9 | The Red cases hold no `measure/tracks` and no `measure/runs` path. Detector: `rg -n 'measure/tracks\|measure/runs' packages/architecture-enforcement/src/__tests__/inventory.test.ts` exits 1. | The detector exits 0 or 2. |
| A10 | After the Green commit, `build-graph update ./graph.db packages/architecture-enforcement/src/inventory.ts` runs once through the wrapper. | The graph stays stale, or the call runs outside the wrapper. |
| A14 | Every detector uses `rg -n`. An exit code of 2 is a failure and never "no hit". | A detector exits 2 and the evidence reads "no hit". |
| A15 | The receipts hold the commit and the commands, and no file hash. | A receipt holds a hash that a later commit changes. |
| A16 | No worktree is created. | `git worktree add` runs for this task. |

A1, A2, A6, A8, A11, and A13 are not risks of this task. A6 applies only if the registry note claims the pin is fresh: it is not, until task 1.4.

**What the 1.4c tests cannot prove**

- The wall time. No test reads a clock. Only the 1.4 series proves that the next series ends within its runs.
- The module count of 6866. The fixture is small. Task 1.4 reads `modules_total` from the real series.
- That the CI check gets faster (FR-9.6). No test measures it.

**Task 1.4 note for the next series (spec FR-9.5, OQ-9).** The series starts after the last 1.4c commit, so the store starts empty (OQ-9). The first run prints `modules_total=6866`, which is 6936 minus the 70 public files. Task 1.4 records the real value. A different `modules_total` is a finding: the role stops and reports it to the orchestrator before it accepts the series. Round 7 stored 3750 modules in 76 s, and the prelude took 58 s. The 69 bundles are out of the list, so the series should end in one or two runs under `--budget-s 1500`. This is an expectation and not a gate: a third run is not a defect, and the run limit of the plan rules still holds. OQ-2 applies from the last 1.4c commit.

#### P1.14 Task 1.4d: baseline the pre-existing v1 debt (added 2026-11-11)

Source: spec D-11, plan task 1.4d and its amendment line under task 1.4 (plan commit `7dd89f20f`), and the r9 preview (`measure/runs/architecture_ci_input_pin_20261110/green-p1-1.4-r9.log`, commit `ed10bc39d`): `additions=332` (database 319, provider 13), `removals=16` (all `AI_PROVIDER_BOUNDARY`), `renames=161`, `filesScanned=6868`, `findings=876`, `policyVersion=v1`.

**Risk: high.** The change is data only, but it weakens a CI integrity gate. It accepts 332 findings, and 111 of them belong to auth, identity, and provider-adapter rules. A wrong owner, a wrong rationale, or a wide write turns a red gate green for the wrong reason. The task adds no hash and no manifest key.

**The task is Green only. Why no Red test.** The task adds no behavior: `baseline-update.ts` and `ratchet.ts` stay unchanged. The task writes data with an existing command. A new Red test for a command that does not change would pass at once and prove nothing (A4). The existing ratchet tests are the guard. The Green role writes no test file and no source file.

**The existing guard check.** The strategy role read the four files. The table shows what each file holds and what is missing.

| Need | Case that holds it | What it proves | Gap |
|---|---|---|---|
| A new finding fails against a non-empty baseline | `ratchet.red.test.ts:52` ("fails when a new violation increases reviewed debt"); `ratchet.test.ts:97` ("preserves surplus same-semantic instances as new debt"); `ratchet.test.ts:120` (precedence: `new-debt` wins) | `compareArchitectureDebt` returns `status=new-debt` and lists the one added instance. `architectureCheckExitCode` maps every status except `clean` to exit 1 (`architecture-check.ts:251-256`). | These cases build the baseline by hand. **No case runs `updateArchitectureBaselines` with an acknowledged write and then checks a new finding against the written baselines.** |
| An addition without owner and rationale fails | `baseline-update.test.ts:267` (`createUpdatedArchitectureBaselines` throws `requires --owner and --rationale`; a short rationale and a non-lower-case owner also throw); `baseline-update.test.ts:529` (the live acknowledged write throws and leaves both files unchanged) | The owner regex and the 12-character rationale floor hold, and no file changes on the error. | None. |
| Exact and renamed entries keep their metadata | `baseline-update.test.ts:215` | Owner and rationale of an exact match and of a rename come from the old entry. The new entry gets the new metadata. | None. |
| A removal leaves the baseline | `baseline-update.test.ts:294`; `ratchet.red.test.ts:74` | A removed finding drops out. It needs no new metadata. | None. |
| A preview writes nothing; a concurrent change is not overwritten | `baseline-update.test.ts:309` and `:489` | `wroteBaselines=false` without `--acknowledge`; a baseline that changes after analysis stops the write. | None. |
| The write refuses protected v1 files | `baseline-update.test.ts:349` | See finding F1. | See finding F1. |

The one gap is the first row: no case proves "update, then a new finding fails". The ratchet is a pure function of the baseline and the findings, so the existing cases cover the logic. Question Q10 asks the orchestrator for a decision.

**Finding F1 (blocker for the plan route).** The plan step 2 cannot write the baselines under policy v1.

- The update CLI passes no `policyVersion` (`baseline-update-cli.ts`). The committed manifest has `acceptance.status=candidate` and `defaultPolicy=v1`, so `selectArchitecturePolicy` selects v1 (`policy-selection.ts`, r9 report: `policyVersion=v1`).
- The v1 `baselineFiles` are `.../config/baselines/database.v1.json` and `.../provider.v1.json` (`ownership-map.v1.json:1431-1434`). Both paths are in `V1_ARTIFACT_BINDINGS` (`v1-validation.ts:44-53`).
- `writeArchitectureBaselines` throws `Architecture <domain> baseline writes cannot target protected v1 artifacts` for such a path (`baseline-update.ts`, first loop). The case `baseline-update.test.ts:349` proves this with the real v1 path. The throw comes before the transaction, so no file changes.
- Even a forced edit of the v1 files breaks `validateV1ArtifactFamilySync`. Every later policy selection then throws `Protected v1 artifacts do not match Gate 1`. A change of `acceptedSha256` is a source change and a hash change, and the hash policy forbids it.
- The v2 route is also closed: `updateArchitectureBaselines` throws `Policy v2 baseline writes require the complete four-file reconciliation transaction`. The v2 baselines (`database.v2.json`, `provider.v2.json`) change only through `architecture:reconcile`, and the default policy stays v1 while the manifest is a candidate.

The result: the plan steps 2 to 4 are expected to fail with the protected-v1 error (exit 2), and `architecture:check` stays red on the v1 comparison. The plan and spec D-11 do not name this limit. The Green role must not start step 2 before the orchestrator answers question Q11. A single `pnpm architecture:baseline:update --acknowledge ...` run is safe to try once, because the throw comes before any write, but the code reading is conclusive and the run costs a heavy slot of about 4 minutes (r9: 11:04:38 to 11:08:20).

**Finding F2 (a gate in the plan is wrong).** The plan step 5 expects exit 0 for four files that include `baseline-validation.test.ts`. That file holds the case "rejects stale synchronous v2 implementation and input hashes" (`baseline-validation.test.ts:510`). The 1.4c Green notes record it as the one expected failure until a pin refresh runs (plan line 142: `tests_failed=1`). The strategy sets the expected result of step 5 to exit 1 with `tests_failed=1` and the named case, unless the 1.4c failure cause no longer holds at the 1.4d HEAD. The Green role measures the failure and quotes it. Any other failing case stops the task. The pin refresh in commit `de25d49a9` may already have cleared the cause. The Green role records which state holds, and does not assume it.

**The Green gate commands.** These apply only after Q11 names a writable route. The wrapper prefix is `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600`. One heavy job runs at a time.

1. Before the write: `git status --short -- packages/architecture-enforcement` is empty, and `git rev-parse HEAD` goes in the log.
2. The write: the command of plan step 2, through `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh`. The owner is `monorepo-architecture`. The rationale is the exact plan text (12 to 1000 characters, `contracts.ts:82`). Exit 0 and `wroteBaselines=true`. The log quotes the three counts `additions=332`, `removals=16`, and `renames=161`. A different count stops the task and goes to the orchestrator (plan step 3).
3. `pnpm architecture:baseline:validate` through the wrapper. Exit 0. A failure with a pin error (a stale manifest pin caused by the write) stops the task and goes to the orchestrator. Task 1.4 owns the pin refresh.
4. The four named files, outside the wrapper: `CI=true pnpm exec vitest run --maxWorkers=1 packages/architecture-enforcement/src/__tests__/ratchet.test.ts packages/architecture-enforcement/src/__tests__/ratchet.red.test.ts packages/architecture-enforcement/src/__tests__/baseline-update.test.ts packages/architecture-enforcement/src/__tests__/baseline-validation.test.ts`. Expected: see finding F2. `tests_skipped=0`. The log quotes `tests_total`, `tests_failed`, and the failing case name.
5. The entry counts after the write, from a read of the two files: `database_entries_after=786` (467 + 319) and `provider_entries_after=90` (93 + 13 - 16). The renames keep the count. A different value stops the task.
6. `git diff --stat` over `packages/architecture-enforcement/src` shows only the baseline files of the route (see "The allowed paths").
7. The Green role runs no `pnpm architecture:pin:refresh` and no `pnpm architecture:check`. Both belong to task 1.4, which runs after this task.

**The allowed paths for 1.4d.** Green may change only these files:

- the two baseline files that `config.baselineFiles` names for the route that Q11 selects. At the plan route (policy v1) they are `packages/architecture-enforcement/src/config/baselines/database.v1.json` and `packages/architecture-enforcement/src/config/baselines/provider.v1.json`, and F1 blocks that write. At a v2 route they are `database.v2.json` and `provider.v2.json`, and the write goes through `architecture:reconcile`, which touches a larger destination set (`V2_RECONCILIATION_DESTINATION_PATHS`);
- `measure/tracks/architecture_ci_input_pin_20261110/plan.md` (the `[x]` note);
- the Green log under `measure/runs/architecture_ci_input_pin_20261110/`.

Out of scope: every file under `packages/architecture-enforcement/src` other than the baseline files, the v1 artifact bindings, the manifest file, the ownership maps, the workflow file, and the tests. The count `source_files_changed=0` is a labeled integer.

**The review checks for 1.4d**

| Review | Applies | Scope |
|---|---|---|
| Review A (correctness) | **yes (required)** | The `owner` of each new entry is `monorepo-architecture`, and the `rationale` is the exact plan text. The entry total moved by +332 and -16, and no entry outside the 332 is new. The 161 renamed entries keep the owner and rationale of their old entry (`baseline-update.test.ts:215`). The 16 removed entries are gone, and a removal leaves no metadata to keep. No source file changed. The entries are in canonical order (`compareStableStrings` on `instanceKey`). `rulesetHash` did not change. |
| Review B (security) | **yes (required)** | The write accepts 111 findings of auth, identity, and provider-adapter rules (93 + 5 + 11 + 2). The rationale names the remediation track `architecture_identity_provider_debt_20261111` and the due date 2026-12-15. A new finding of these rules must still fail the check (see Q10). The owner text of the PM is in the rationale, as D-11 requires. |
| Review C (UX/API) | no | No flag, no message, no page. |
| Adversarial | small | One surface: an addition that hides in the 332 (a path under `packages/architecture-enforcement`, or a rule outside the six named rules). The reviewer counts the additions by rule: DATABASE_BOUNDARY 205, COMPANY_IDENTITY_PRODUCT_ISOLATION 93, DURABLE_JOB_DATABASE_BOUNDARY 16, AI_PROVIDER_BOUNDARY 11, COMPANY_IDENTITY_DB_BOUNDARY 5, INTEGRATION_PROVIDER_BOUNDARY 2. The count of additions under `packages/architecture-enforcement` is 0. |
| Browser review (UX) | no | No page, no component, no route. |

**Anti-pattern coverage for 1.4d**

| Anti-pattern | Defense | Falsification condition |
|---|---|---|
| A3 | Every count in the log and in the plan note is `label=<n>`: `additions`, `removals`, `renames`, `database_entries_after`, `provider_entries_after`, `tests_total`, `tests_failed`, `source_files_changed`. | A note holds a bare number. |
| A4 | The expected counts are asserted against the real command output, not against an empty result. A run that prints `wroteBaselines=false` is not a pass. | The task reports "baselined" with `wroteBaselines=false` or with an unchanged baseline file. |
| A5 | The note quotes the exit code of each step and the one failing case of step 4 by name. A `heavy-run` code is named with its code. The note does not say "all green" when `tests_failed=1`. | A note says "pass" with a non-zero exit, or hides the known failure. |
| A6 | The registry note says the debt is baselined and the pins are stale until task 1.4. It does not say the CI check is green. | The note claims `architecture:check` passes before task 1.4 runs it. |
| A7 | The review counts the additions by exact rule id. No filter drops a rule because its name looks like a known one. | A rule outside the six names is in the 332, and the count by rule hides it. |
| A14 | Every detector uses `rg -n`. An exit code of 2 is a failure. | A detector exits 2 and the evidence reads "no hit". |
| A15 | The receipts hold the commit and the commands. They hold no file hash. | A receipt holds a hash that a later commit changes. |
| A16 | No worktree is created. | `git worktree add` runs for this task. |

A1, A2, A8 to A13 are not risks of this task.

**What the 1.4d checks cannot prove**

- That the check is green. The task runs no `architecture:check`. Task 1.4 runs it.
- That a new finding of the 111 security-relevant findings fails CI after the baseline. The existing cases prove the ratchet logic with hand-built baselines. They do not run an update first (question Q10).
- That the 332 are correct debt. The review checks the counts and the metadata. The PM decision D-11 accepts the debt.

**The order.** Task 1.4d, then task 1.4 (the pin refresh series, then `pnpm architecture:check` exit 0, then the pin test), then task 1.5. Task 1.4d is blocked until Q11 has an answer.

## 7. The labeled counts and the floors of P1

`fixture_positive_control=1`, `ac1_cases=3`, `ac2_cases=2`, `ac3_cases=3`, `ac4_cases=5`, `ac5_cases=5`, `fr6_cases=1`, `other_files_failed=0`, `suite_files>=32`, `suite_tests>=251`, `commands_green=2`, `manifest_fields_changed=5`, `manifest_keys_added=0`, `hash_path_lists_changed=0`, `ci_flag_steps=1`, `ci_refresh_commands=0`, `local_script_flags=0`, `archive_changed_paths=0`, `pin_out_of_scope_paths=0`.

Task 1.4a adds these floors: `fixture_positive_control=1`, `ac6_cases=3`, `ac7_cases=2`, `ac8_cases=2`, `member_access_nodes>=50`, `walks_per_module<=1`, `walk_growth=0`, `projections=1`, `analyzer_passes=2`, `manifest_keys_added=0`, `suite_files>=33`, `suite_tests>=279`, `pin_cases=20`. The `suite_files>=32` and `suite_tests>=251` floors above stay valid for the earlier tasks.

Task 1.4c adds these floors: `existing_inventory_cases=8`, `ac18_cases=5`, `ac19_cases=1`, `ac20_cases=4`, `ac21_cases=1`, `variant_rows=3`, `guard_rows=4`, `tests_total=19` (inventory file), `manifest_keys_added=0`, `suite_files>=34`, `suite_tests>=320`, `modules_total=6866` (task 1.4 expectation).

Task 1.4d adds these floors (Green only, no test case is added, so no `suite_tests` floor moves): `baseline_additions=332`, `baseline_removals=16`, `baseline_renames=161`, `database_entries_after=786`, `provider_entries_after=90`, `baseline_files_changed=2`, `source_files_changed=0`, `new_hash_fields=0`, `manifest_keys_added=0`, `named_files=4`, `tests_skipped=0`, `additions_under_architecture_package=0`. The two entry counts are expectations from `467 + 319` and `93 + 13 - 16`. The Green role measures them.

Task 1.4b adds these floors: `resume_control=1`, `ac9_cases=2`, `ac10_cases=3`, `ac11_cases=7`, `ac12_cases=4`, `ac13_cases=3`, `ac14_cases=2`, `ac15_cases=4`, `ac16_cases=3`, `ac17_cases=1`, `fixture_modules>=7`, `runs>=3`, `runs<=12`, `bad_values=5`, `tests_total>=30`, `manifest_keys_added=0`, `suite_files>=34`, `suite_tests>=309`, `cost_cases=8`, `pin_cases=20`.

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
| Q10 | Task 1.4d, the missing end-to-end case. No existing case writes baselines with `updateArchitectureBaselines`, then checks a new finding against the written files (P1.14, guard check, row 1). | Add a small Red task "1.4e" before 1.4d. It adds one case to `baseline-update.test.ts` on the live fixture (`createLiveBaselineFixture`): acknowledged write with owner and rationale, then `checkArchitectureRepository` returns `clean`, then a second source file with a new import returns `new-debt` and exit 1. The case must fail for the right reason if the update wrote nothing (A4). The orchestrator may drop the task and accept the pure-function cases (`ratchet.red.test.ts:52`, `ratchet.test.ts:97`) as sufficient. |
| Q11 | Task 1.4d, finding F1. The plan route (policy v1) writes protected v1 baseline files, and the code rejects that write. Which route does the PM choose? (a) Run a read-only preview with `pnpm architecture:check --policy v2` first, then write the v2 baselines through the four-file `architecture:reconcile` transaction and point the CI step at policy v2. (b) Accept policy v2 as the default (manifest `acceptance.status=accepted`), which is a larger change. (c) Change the v1 protection. The strategy advises against (c): it breaks the v1 immutability tests and adds hash changes. | The default is to hold task 1.4d. The orchestrator asks the PM. The Green role does not start. The strategy advises route (a), after the preview shows the v2 counts, because the v2 counts can differ from `additions=332`. The P1.14 gates then apply with the v2 file names, and the D-11 text and the plan step 2 command need an amendment. |
