# Implementation Plan: Doctor gate repair

> **Track ID:** `doctor_gate_repair_20261112` · **Spec:** [spec.md](./spec.md)
> **Due:** 2026-11-14 (PM order). No deploy. No product file change.

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done, and `[b] … deferred:<owner>` at a human gate. An `[x]` note names the commit and the evidence class: automated, person-checked, or owner-passed.
- Tests first. The Red task writes the test and shows it fail at the base. The Green task makes the test pass with the least change.
- Red runs on a model family other than the Green family. The orchestrator sets the models.
- Stage named paths only. Never run `git add -A`, `git add .`, or `git add -u`. Commit with a pathspec: `git commit -m <msg> -- <paths>`.
- No push, no deploy, no amend, no `--no-verify`, no `git reset`, `checkout`, `restore`, `revert`, or `stash`, and no `git worktree add`.
- Allowed write paths: `tests/orchestrator_marker_vocabulary.sh`, `tests/orchestrator_marker_vocabulary_cases.sh`, `tests/orchestrator_doctor_gate.sh`, `measure/doctor.sh`, `measure/anti-patterns.md`, this track folder, `measure/runs/doctor_gate_repair_20261112/`, and `measure/tracks.md`.
- No product file changes. No path under `apps/`, `packages/`, or `services/`. The manifest `packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json` does not change. No pin refresh runs.
- No new hash, checksum, or manifest (`AGENTS.md`, Hashing and Provenance Policy).
- No change to any file under `measure/evidence_integrity_gates/` and no change to any file under `~/.config/opencode/agents/`.
- The doctor gate reads and runs; it does not write a hash and it does not refresh a pin.
- Commit headers are 100 characters or less and use a lower-case subject. Each header carries `(track_id: doctor_gate_repair_20261112)`.
- The full doctor run goes through the heavy-run prefix, in the foreground: `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && bash measure/doctor.sh'`. The three shell guards run as plain commands.
- If the heavy run ends with exit 124, the task stops. The orchestrator reports the stop and asks the owner for the next action. No retry runs with a longer timeout before that answer.

## Phase 1: F411, the marker guard accepts the pending marker [checkpoint: 247330b27]

Blast radius: `tests/orchestrator_marker_vocabulary.sh` (the predicate at line 55, the comment at lines 32 to 39, and the two messages), entry A8 of `measure/anti-patterns.md`, and step 2 of `measure/doctor.sh`. The catalog test reads the A8 Guard line. No product symbol changes.

- [x] 1.1 Red: the marker guard cases. Create `tests/orchestrator_marker_vocabulary_cases.sh`. Commit `0088e86c8` (automated evidence). Each case builds its own root in `<tmp>`, copies `tests/orchestrator_marker_vocabulary.sh` to `<tmp>/tests/`, and writes fixture plans under `<tmp>/measure/tracks/<fixture-id>/plan.md`. The guard sets `ROOT` from `BASH_SOURCE` (line 4), so the copy reads `<tmp>/measure/`. The test removes `<tmp>` when it ends. No fixture enters `measure/tracks/`.
  - Case `clean_active_exits_0`: the one active fixture holds `- [ ] 1.1 task`. Expect exit 0 and the literal substring `PASS: all active track plans use only [ ], [~], [x], or [b] task markers (1 plans checked)`.
  - Case `unknown_marker_exits_1`: the one active fixture holds `- [?] 1.1 task`. Expect exit 1 and the literal substrings `FAIL: unsupported task marker [?] in` and `measure/tracks/fixture_unknown_20260101/plan.md`.
  - Case `canonical_markers_exit_0`: the one active fixture holds `- [~] 1.1 task`, `- [x] 1.2 task`, and `- [b] deferred:daniel 1.3 task`. Expect exit 0 and no literal substring `FAIL:` in the output.
  - Case `track_scope_exits_0`: two active fixtures. The clean one holds `- [x] 1.1 task`. The other holds `- [?] 1.1 task`. Run `--track <clean-id>`. Expect exit 0 and no `FAIL:` in the output.
  - Case `archive_excluded_exits_0`: `<tmp>/measure/archive/fixture_archived_20260103/plan.md` holds `- [?] 1.1 task`. The active fixture holds `- [x] 1.1 task`. Run with no argument. Expect exit 0 and no `FAIL:` in the output. The archive id differs from every active id, because `track_dir_resolve` (lines 9 to 16) reads `measure/archive/<id>` first.
  - Expected result at the base: exit 1. Cases `clean_active_exits_0` and `unknown_marker_exits_1` fail. The base predicate `grep -n '^- \[ \] '` (line 55) rejects `- [ ] ` and accepts `[?]`. Cases `canonical_markers_exit_0`, `track_scope_exits_0`, and `archive_excluded_exits_0` pass. Red is not a syntax error and not a copy error.
  - Check: `bash tests/orchestrator_marker_vocabulary_cases.sh` exits 1 at the base, with the two named cases failing.
  - Commit: `test(measure): pin the marker guard cases (track_id: doctor_gate_repair_20261112)`, with the test file only.
  - Evidence of the Red round (role: Measure Mid Red; model: deepseek-flash):
    - `phase_base_sha=088efb891a20a2be2619b839812ad8ee13bac562`; `role_base_sha=088efb891a20a2be2619b839812ad8ee13bac562`; commit `0088e86c8674bd03b8e575e0e72c90ed22668cad`.
    - Command: `bash tests/orchestrator_marker_vocabulary_cases.sh`. Exit 1 at the base. `cases_total=14 cases_failed=7`. Floor of 14 met.
    - `bash -n tests/orchestrator_marker_vocabulary_cases.sh` exits 0.
    - Case `clean_active_exits_0`: FAIL (expected exit 0, got exit 1).
    - Case `unknown_marker_exits_1`: FAIL (expected exit 1, got exit 0).
    - Case `canonical_markers_exit_0`: PASS. Case `track_scope_exits_0`: PASS. Case `archive_excluded_exits_0`: PASS. These three are the named characterization cases.
    - Case `markers_outside_set_exit_1`: FAIL (marker [?]: expected exit 1, got exit 0).
    - Case `two_offenders_two_fail_lines`: FAIL (expected exit 1, got exit 0).
    - Case `fail_on_stderr_pass_on_stdout`: FAIL (clean run: expected exit 0, got exit 1).
    - Case `two_plans_count_two`: FAIL (expected exit 0, got exit 1).
    - Case `prose_bracket_not_flagged`: PASS. Case `indented_marker_ignored`: PASS. Case `usage_error_exits_2`: PASS. Case `empty_scope_exits_1`: PASS. These four are characterization cases.
    - Case `track_archive_first_exits_1`: FAIL (expected exit 1, got exit 0).
    - `failed_cases=clean_active_exits_0,unknown_marker_exits_1,markers_outside_set_exit_1,two_offenders_two_fail_lines,fail_on_stderr_pass_on_stdout,two_plans_count_two,track_archive_first_exits_1`.
    - No fixture entered `measure/tracks/`. Each case removed its own `<tmp>` root. The test file holds no production change.
- [x] 1.2 Green: the guard predicate and its two messages. Commit `150e22e9d` (automated evidence). In `tests/orchestrator_marker_vocabulary.sh`:
  - Change the line-55 predicate to `grep -nE '^- \[[^ ~xb]\] ' "$plan" >/tmp/orchestrator-marker-hits.$$`. The guard then fails only a marker outside the set {` `, `~`, `x`, `b`}.
  - Replace the per-plan FAIL line with one line for each hit, on stderr. The exact FAIL line reads `FAIL: unsupported task marker [<marker>] in <plan>; use [ ], [~], [x], or [b] deferred:<owner>`. Read `<marker>` from the hit line between its first `[` and the next `]`. Keep `status=1` and the exit code 1.
  - Replace the PASS line with the exact text `PASS: all active track plans use only [ ], [~], [x], or [b] task markers (%d plans checked)`. Pass `${#plans[@]}` as the count.
  - Rewrite the comment at lines 32 to 39 to state the accepted set {` `, `~`, `x`, `b`}, the pending meaning of `[ ]`, the closeout rule, and the archive exclusion.
  - Keep the `--track <track-id>` scope, the usage error with exit 2, and the hits file removal.
  - Check: `bash tests/orchestrator_marker_vocabulary_cases.sh` exits 0.
  - Check: `bash tests/orchestrator_marker_vocabulary.sh` exits 0. Record the count from its `(N plans checked)` text at run time and record the exit code. Do not write a fixed count: the count was 93 at `e6dc5b067` and it moves with each new plan. Do not record a fail-line count, because the guard prints no such number.
  - Check: `bash tests/orchestrator_marker_vocabulary.sh --track doctor_gate_repair_20261112` exits 0. The PM decision of 2026-11-12 counts this single-track check as the pass.
  - Commit: `fix(measure): accept the pending marker in the guard (track_id: doctor_gate_repair_20261112)`.
  - Evidence of the Green round (role: Measure Jr Green; model: claude-sonnet-5-5; `phase_base_sha=088efb891a20a2be2619b839812ad8ee13bac562`; `role_base_sha=d8b60a75ccdcb6de4d0b95c3d170358fd06deb3b`; commit `150e22e9d41043936b10a765e92610924a5376a1`):
    - `bash -n tests/orchestrator_marker_vocabulary.sh` exits 0.
    - `bash tests/orchestrator_marker_vocabulary_cases.sh` exits 0. `cases_total=14 cases_failed=0`.
    - `bash tests/orchestrator_marker_vocabulary.sh` exits 0, with `(93 plans checked)` at run time.
    - `bash tests/orchestrator_marker_vocabulary.sh --track doctor_gate_repair_20261112` exits 0, with `(1 plans checked)`.
    - The commit holds `tests/orchestrator_marker_vocabulary.sh` only. The Red test file did not change.
- [x] 1.3 Green: catalog entry A8. Commit `14a501a77` (automated evidence). Reword entry A8 in `measure/anti-patterns.md` so its text names the accepted marker set and the pending marker. Keep the heading `## A8 — …`. Keep the `**Guard:**` line that points at `tests/orchestrator_marker_vocabulary.sh`, because the catalog test scans that line for a live file.
  - Check: `bash tests/orchestrator_catalog.sh` exits 0, with the line `PASS: measure anti-pattern catalog exists with A1-A15`.
  - Check: `bash tests/orchestrator_marker_vocabulary.sh --track doctor_gate_repair_20261112` exits 0.
  - Commit: `docs(measure): state the marker set in catalog A8 (track_id: doctor_gate_repair_20261112)`.
  - Evidence: before the commit, `bash tests/orchestrator_catalog.sh` exited 0 with `PASS: measure anti-pattern catalog exists with A1-A15`. `bash tests/orchestrator_marker_vocabulary.sh --track doctor_gate_repair_20261112` exited 0. The commit holds `measure/anti-patterns.md` only. The heading and the `**Guard:**` line stay.
- [x] 1.4 Phase check at one HEAD `14a501a77` (automated evidence). Run `bash tests/orchestrator_catalog.sh`, `bash tests/orchestrator_marker_vocabulary.sh`, and `bash tests/orchestrator_marker_vocabulary_cases.sh`. Record each exit code and the printed plan count. Run `git diff --name-only <phase_base_sha>..HEAD`. The list holds only `tests/orchestrator_marker_vocabulary.sh`, `tests/orchestrator_marker_vocabulary_cases.sh`, `measure/anti-patterns.md`, and files under `measure/tracks/doctor_gate_repair_20261112/`. The track plan is in the list because its own task markers changed. Record the result as automated.
  - Evidence at `HEAD=14a501a77d897f15a0a4a1cccecb25fdbee06065` (the HEAD did not move during the check):
    - `bash -n tests/orchestrator_marker_vocabulary.sh` exits 0.
    - `bash tests/orchestrator_catalog.sh` exits 0, with `PASS: measure anti-pattern catalog exists with A1-A15`.
    - `bash tests/orchestrator_marker_vocabulary.sh` exits 0, with `(93 plans checked)` at run time.
    - `bash tests/orchestrator_marker_vocabulary.sh --track doctor_gate_repair_20261112` exits 0, with `(1 plans checked)`.
    - `bash tests/orchestrator_marker_vocabulary_cases.sh` exits 0, with `cases_total=14 cases_failed=0`.
    - `git log 088efb891..HEAD` lists four commits, all with `track_id: doctor_gate_repair_20261112`: `0088e86c8`, `d8b60a75c`, `150e22e9d`, `14a501a77`. No other track committed in the range.
    - `git diff --name-only 088efb891..HEAD`: `measure/anti-patterns.md`, `measure/tracks/doctor_gate_repair_20261112/plan.md`, `tests/orchestrator_marker_vocabulary.sh`, `tests/orchestrator_marker_vocabulary_cases.sh`. The list matches the allowed set.
    - Phase 1 accepted at 247330b27 (phase acceptance r1 pass, MiniMax M3.1 Flash); reviews A and B pass; adversarial 18 of 18 mutants killed; Review C and UX browser review not applicable.

## Phase 2: F421, the gate records the architecture verdict

PM decision of 2026-11-12, quoted word for word: "1. Doctor Q1: option 2, the path you continue on after the failed Phase 2 reviews. Record it as the PM decision." Task 2.5 applies it.

Blast radius: `measure/doctor.sh` and the new files `tests/orchestrator_doctor_gate.sh` and `doctor-gate-evidence.md`. Step 4 keeps the boundary check. The gate exit code no longer depends on it.

- [x] 2.1 Red: the doctor gate behavior and the gate record. Create `tests/orchestrator_doctor_gate.sh` with two parts. Commit `b6a2531c5` (automated evidence).
  - Part A, the gate behavior. Each case builds its own root in `<tmp>`. It writes these files: `<tmp>/measure/doctor.sh` (a copy of `measure/doctor.sh`), `<tmp>/tests/orchestrator_catalog.sh`, `<tmp>/tests/orchestrator_marker_vocabulary.sh`, and `<tmp>/tests/orchestrator_review_execution_truthfulness.sh` (stub guards that print a PASS line and exit 0), and `<tmp>/bin/pnpm` (an executable stub whose exit code the case sets). Each case runs `cd <tmp>`, `PATH=<tmp>/bin:$PATH`, `bash measure/doctor.sh 2>&1`, and captures the exit code and the output. The case name states the expected exit.
  - Case `pnpm_exit_1_gate_exits_0`: the stubs exit 0 and the pnpm stub exits 1. Expect exit 0. The output holds `ARCHITECTURE: step 4 exits 1; the owner of the remaining drift is architecture_ci_input_pin_20261110` and `DOCTOR: the three structural guard steps gate this exit code`.
  - Case `pnpm_exit_0_gate_exits_0`: the pnpm stub exits 0. Expect exit 0. The output holds `ARCHITECTURE: step 4 exits 0; the owner of the remaining drift is architecture_ci_input_pin_20261110`.
  - Case `guard_failure_gate_exits_1`: the marker guard stub exits 1 and the pnpm stub exits 0. Expect exit 1. The output holds no `DOCTOR: the three structural guard steps gate this exit code`.
  - Case `pnpm_exit_2_gate_exits_1`: the pnpm stub exits 2. Expect exit 1. The output holds `ARCHITECTURE: step 4 exits 2; this is a tool failure, not a boundary verdict` and `DOCTOR: the architecture step did not produce a boundary verdict; the gate exits 1`.
  - Case `pnpm_exit_127_gate_exits_1`: `<tmp>/bin` holds no pnpm executable, so the shell returns 127. Expect exit 1. The output holds `ARCHITECTURE: step 4 exits 127; this is a tool failure, not a boundary verdict`.
  - Part B, the gate record. The test reads `measure/tracks/doctor_gate_repair_20261112/doctor-gate-evidence.md`. Four lines match `^- STEP [1-4]: .+, exit [0-9]+, [0-9]{4}-[0-9]{2}-[0-9]{2}$`, one line for each step number. One line starts `- VERDICT: ARCHITECTURE: step 4 exits ` and holds `; the owner of the remaining drift is architecture_ci_input_pin_20261110`. One line holds `OWNER: architecture_ci_input_pin_20261110 owns tasks 1.4 (pin refresh) and 1.4d (debt baseline)`.
  - Tokens the test matches: `STEP 1:`, `STEP 2:`, `STEP 3:`, `STEP 4:`, `, exit `, `VERDICT: ARCHITECTURE: step 4 exits`, and `OWNER: architecture_ci_input_pin_20261110 owns tasks 1.4 (pin refresh) and 1.4d (debt baseline)`.
  - Expected result at the base: exit 1. Four behavior cases fail. `pnpm_exit_1_gate_exits_0` gets the gate exit 1 from `set -euo pipefail` and no ARCHITECTURE line. `pnpm_exit_0_gate_exits_0` misses the ARCHITECTURE line. `pnpm_exit_2_gate_exits_1` exits 2. `pnpm_exit_127_gate_exits_1` exits 127. `guard_failure_gate_exits_1` passes at the base. Part B fails because the record is absent. Red is not a syntax error.
  - Check: `bash tests/orchestrator_doctor_gate.sh` exits 1 at the base, with the four named behavior cases and part B failing.
  - Commit: `test(measure): pin the doctor gate behavior (track_id: doctor_gate_repair_20261112)`, with the test file only.
  - The file follows test-strategy.md section 6.5. It takes `--part a`, `--part b`, and no argument. The no-argument run runs both parts and exits 1 when a case fails. Each case builds its own root in `<tmp>`, copies `measure/doctor.sh` into `<tmp>/measure/`, writes three stub guards into `<tmp>/tests/`, and writes a stub `pnpm` into `<tmp>/bin/`. The stub logs its argv in `<tmp>/pnpm.log`. Each case removes its own `<tmp>` root. No fixture enters the repository.
  - Evidence of the Red round (role: Measure Mid Red; model: minimax-cn-coding-plan/MiniMax-M3.1-Flash):
    - `phase_base_sha=e592f824607cc220c02096e0a66d3174d1fe78ec`; `role_base_sha=e592f824607cc220c02096e0a66d3174d1fe78ec`; commit `b6a2531c597a700c1df08a184f3f908d450b8553`.
    - Command: `bash tests/orchestrator_doctor_gate.sh --part a`. Exit 1 at the base. `cases_total=11 cases_failed=7`. The floor of 11 is met.
    - Command: `bash tests/orchestrator_doctor_gate.sh --part b`. Exit 1 at the base. `cases_total=11 cases_failed=11`. The record is absent.
    - Command: `bash tests/orchestrator_doctor_gate.sh`. Exit 1 at the base. `cases_total=22 cases_failed=18`.
    - Command: `bash -n tests/orchestrator_doctor_gate.sh`. Exit 0.
    - Case `pnpm_exit_1_gate_exits_0`: FAIL (expected gate exit 0, got exit 1).
    - Case `pnpm_exit_0_gate_exits_0`: FAIL (the ARCHITECTURE line for exit 0 is missing).
    - Case `guard_catalog_failure_gate_exits_1`: PASS. Case `guard_marker_failure_gate_exits_1`: PASS. Case `guard_truthfulness_failure_gate_exits_1`: PASS. These three are the named characterization cases.
    - Case `pnpm_exit_2_gate_exits_1`: FAIL (expected gate exit 1, got exit 2).
    - Case `pnpm_exit_127_gate_exits_1`: FAIL (expected gate exit 1, got exit 127).
    - Case `architecture_argv_exact`: FAIL (the pnpm log does not hold the pinned argv).
    - Case `tool_failure_codes`: FAIL (code 2: expected gate exit 1, got exit 2). The loop asserts `codes_checked=5` before it runs.
    - Case `architecture_line_shows_code`: FAIL (the ARCHITECTURE line does not hold the code 0).
    - Case `no_write_in_root`: PASS. This is the named characterization case.
    - Part B cases `record_file_present`, `record_step_lines`, `record_step_commands`, `record_step_exit_codes`, `record_verdict_line`, `record_verdict_code_matches_step4`, `record_owner_line`, `record_doctor_line`, `record_duration_line`, `record_head_line`, and `record_lines_floor`: FAIL. The reason of each is that the record file is absent.
    - The failing part A cases are the four plan behavior cases and the three added cases. The base runs `pnpm architecture:check` with no flag, and `set -euo pipefail` stops the script at the first non-zero exit.
    - The 127 case and the 127 run of the tool-failure loop use `PATH=<tmp>/bin:/usr/bin:/bin`. Each asserts `pnpm_absent=1` before the run, so no real `pnpm` runs.
    - A scratch copy of the test file, a scratch copy of `measure/doctor.sh` that holds the planned behavior, and a scratch record in the planned form make all 22 cases pass. The scratch root was outside the repository and was removed. The real `measure/doctor.sh` and the real record did not change.
    - The commit holds `tests/orchestrator_doctor_gate.sh` only. No production file changed.
- [x] 2.2 Green: `measure/doctor.sh`. Commit `49f96a7d8` (automated evidence). Keep `set -euo pipefail` and the three guard steps as bare lines. Then:
  - Run the architecture step inside a capture block: `set +e`, `pnpm architecture:check --skip-input-snapshot-pin`, `architecture_status=$?`, `set -e`.
  - Print one ARCHITECTURE line. For an exit code of 0 or 1, the line reads `ARCHITECTURE: step 4 exits <code>; the owner of the remaining drift is architecture_ci_input_pin_20261110`.
  - For any other exit code (2, 127, and every code other than 0 or 1), print `ARCHITECTURE: step 4 exits <code>; this is a tool failure, not a boundary verdict`, then print `DOCTOR: the architecture step did not produce a boundary verdict; the gate exits 1`, then exit 1. A tool crash never passes the gate.
  - For an exit code of 0 or 1, print `DOCTOR: the three structural guard steps gate this exit code` and exit 0.
  - Check: `bash tests/orchestrator_doctor_gate.sh` exits 0.
  - Check: record the seconds of step 4 from one plain local run of `time pnpm architecture:check --skip-input-snapshot-pin`. This run is a measurement, not the gate proof.
  - Check: the full doctor run through the heavy-run prefix. Record the exit code of each of the four steps, the architecture verdict line, and the measured seconds.
  - If the heavy run exits 124, stop the task. The orchestrator reports the stop and asks the owner for the next action.
  - Commit: `fix(measure): record the architecture verdict in doctor (track_id: doctor_gate_repair_20261112)`.
  - Evidence of the Green round (role: Measure Jr Green; model: deepseek/deepseek-flash; `phase_base_sha=e592f824607cc220c02096e0a66d3174d1fe78ec`; `role_base_sha=02e9ee7e3d113269777d829ac7054e9dc0850e6b`; commit `49f96a7d845ccafca56c50ff5b1efddabad06691`):
    - `bash -n measure/doctor.sh` exits 0.
    - `bash tests/orchestrator_doctor_gate.sh --part a` exits 0. `cases_total=11 cases_failed=0`.
    - Timing run through HEAVY on 2026-11-12: `time pnpm architecture:check --skip-input-snapshot-pin` exits 1, `real 2m45.684s`. `step4_seconds=165.684`. This run is a measurement, not the gate proof.
    - Full run through HEAVY at HEAD `49f96a7d8`: doctor exits 0. Steps 1, 2, and 3 exit 0 and print `PASS: A12/A13 guard declarations and archive directories verified (6 guards)`, `PASS: measure anti-pattern catalog exists with A1-A15`, `PASS: all active track plans use only [ ], [~], [x], or [b] task markers (93 plans checked)`, and `PASS: executed review tracks are not fully blocked by deferred:review-execution`. Step 4 exits 1. The output holds `ARCHITECTURE: step 4 exits 1; the owner of the remaining drift is architecture_ci_input_pin_20261110` and `DOCTOR: the three structural guard steps gate this exit code`.
    - Saved output: `measure/runs/doctor_gate_repair_20261112/doctor-run-49f96a7d8.log`. The log is not committed.
    - Outcome table row 1 applies: step 4 exit 1, doctor exit 0. The commit holds `measure/doctor.sh` only. The Red test file did not change.
- [x] 2.3 Green: the gate record. Commit `657059226` (automated evidence). Write `measure/tracks/doctor_gate_repair_20261112/doctor-gate-evidence.md` with these lines:
  - `- HEAD: <short-sha>` and `- DATE: <YYYY-MM-DD>`.
  - `- STEP 1: bash tests/orchestrator_catalog.sh, exit <code>, <YYYY-MM-DD>`
  - `- STEP 2: bash tests/orchestrator_marker_vocabulary.sh, exit <code>, <YYYY-MM-DD>`
  - `- STEP 3: bash tests/orchestrator_review_execution_truthfulness.sh, exit <code>, <YYYY-MM-DD>`
  - `- STEP 4: pnpm architecture:check --skip-input-snapshot-pin, exit <code>, <YYYY-MM-DD>`
  - `- VERDICT: ARCHITECTURE: step 4 exits <code>; the owner of the remaining drift is architecture_ci_input_pin_20261110`. Copy the printed ARCHITECTURE line after the `VERDICT: ` prefix.
  - `- DURATION: step 4 took <N> s`
  - `- OWNER: architecture_ci_input_pin_20261110 owns tasks 1.4 (pin refresh) and 1.4d (debt baseline)`. The owner track owns the pin refresh and the debt baseline.
  - `- DOCTOR: the three structural guard steps gate this exit code`
  - Check: `bash tests/orchestrator_doctor_gate.sh` exits 0 and reports the four step lines, the verdict line, and the owner line.
  - Commit: `docs(measure): record the doctor gate evidence (track_id: doctor_gate_repair_20261112)`.
  - Evidence: `bash tests/orchestrator_doctor_gate.sh` exits 0 at HEAD `657059226f488c4af177067ad19d12434ed634f7`. `cases_total=22 cases_failed=0`. The record holds `HEAD: 49f96a7d8`, `STEP 1` to `STEP 3` at exit 0, `STEP 4` at exit 1, and `DURATION: step 4 took 165.684 s`. Every value comes from the saved output of the full run at `49f96a7d8`. The commit holds `measure/tracks/doctor_gate_repair_20261112/doctor-gate-evidence.md` only.
- [x] 2.4 Phase check at one HEAD. Record `657059226f488c4af177067ad19d12434ed634f7` (automated evidence). Run `bash tests/orchestrator_doctor_gate.sh` and the full doctor run through the heavy-run prefix at one HEAD. Record each exit code and the step 4 seconds. Run `git diff --name-only <phase_base_sha>..HEAD`. The list holds only `measure/doctor.sh`, `tests/orchestrator_doctor_gate.sh`, and files under `measure/tracks/doctor_gate_repair_20261112/`. Record the result as automated.
  - Evidence at `HEAD=657059226f488c4af177067ad19d12434ed634f7` (both runs ran at this HEAD):
    - `bash tests/orchestrator_doctor_gate.sh` exits 0. `cases_total=22 cases_failed=0`.
    - `bash -n measure/doctor.sh` exits 0. `bash -n tests/orchestrator_doctor_gate.sh` exits 0.
    - Full run through HEAVY at this HEAD: doctor exits 0. Steps 1 to 3 exit 0 and print their PASS lines (`(6 guards)`, `A1-A15`, `(93 plans checked)`, and the review-execution PASS line). Step 4 exits 1. The output holds `ARCHITECTURE: step 4 exits 1; the owner of the remaining drift is architecture_ci_input_pin_20261110` and `DOCTOR: the three structural guard steps gate this exit code`. `step4_seconds=165.684`, from the timing run of task 2.2.
    - `bash tests/orchestrator_marker_vocabulary_cases.sh` exits 0, `cases_total=15 cases_failed=0`. `bash tests/orchestrator_catalog.sh` exits 0 with `PASS: measure anti-pattern catalog exists with A1-A15`.
    - This track's paths in `git diff --name-only e592f8246..HEAD`: `measure/doctor.sh`, `tests/orchestrator_doctor_gate.sh`, `measure/tracks/doctor_gate_repair_20261112/plan.md`, and `measure/tracks/doctor_gate_repair_20261112/doctor-gate-evidence.md`. No path under `apps/`, `packages/`, or `services/`.
    - The range also holds `e3fd1aa38` (storytime_app_rebuild_20261025) and `09bb8e109` (accounting_drive_intake_20261109). Those paths belong to other tracks and are not listed.
    - `git worktree list --porcelain` shows 7 worktrees. This track created none of the six other worktrees.

- [~] 2.5 Remediation of the Phase 2 reviews: Review A F201, F202, and F203; Review B F251.
  - The defect: `package.json` line 7 holds `pnpm --filter @reading-advantage/architecture-enforcement exec tsx src/architecture-check-cli.ts`. On master the CLI exits 2 through the catch block of `architecture-check-cli.ts` lines 143 to 149 and prints `Architecture check failed: V2 reconciliation manifest is invalid: Analyzer report hashes do not match current byte-identical reports`. Two pnpm layers report exit 1 for that failed child. Step 4 therefore records exit 1, prints a boundary verdict, and the tool-failure rule of FR-3 cannot fire for a real CLI exit 2. The stub `pnpm` returns the code directly, so the 22 cases cannot see the mapping.
  - Red: model the real call path with a stub `tsx`, not a stub `pnpm`.
    - Each case that sets a code writes `<tmp>/node_modules/.bin/tsx`. The step 4 command `(cd packages/architecture-enforcement && ../../node_modules/.bin/tsx src/architecture-check-cli.ts --skip-input-snapshot-pin)` resolves that file, so the case needs `<tmp>/packages/architecture-enforcement` too.
    - The stub logs its argv in `<tmp>/tsx.log` and exits with the code that the case sets. The case asserts `tsx_calls=1`.
    - Case `tsx_exit_2_manifest_drift_gate_exits_0`: the stub exits 2 and prints the line `Architecture check failed: V2 reconciliation manifest is invalid: Analyzer report hashes do not match current byte-identical reports` on stderr. Expect gate exit 0 and `ARCHITECTURE: step 4 exits 2; the known manifest drift is owned by architecture_ci_input_pin_20261110`.
    - Case `tsx_exit_2_other_line_gate_exits_1`: the stub exits 2 and prints another line. Expect gate exit 1, `ARCHITECTURE: step 4 exits 2; this is a tool failure, not a boundary verdict`, and `DOCTOR: the architecture step did not produce a boundary verdict; the gate exits 1`.
    - Case `tsx_exit_1_gate_exits_0`: the stub exits 1. Expect gate exit 0 and `ARCHITECTURE: step 4 exits 1; the owner of the remaining drift is architecture_ci_input_pin_20261110`.
    - Case `tsx_exit_0_gate_exits_0`: the stub exits 0. Expect gate exit 0 and `ARCHITECTURE: step 4 exits 0; the owner of the remaining drift is architecture_ci_input_pin_20261110`.
    - Keep the three guard failure cases, the `tool_failure_codes` loop, the `architecture_line_shows_code` case, and the `no_write_in_root` case. The loop runs codes 2 (no output line), 3, 126, and 137 with a stub, and code 127 with no stub.
    - F203: the 127 case and the 127 branch of `tool_failure_codes` assert that `<tmp>/node_modules/.bin/tsx` is absent before the gate runs, with `test -x`. The gate then returns 127.
    - The stubs model the real call path. A `pnpm` stub is no longer the step 4 stub. A case that returns a code from a `pnpm` stub proves nothing about step 4.
    - Check: `bash tests/orchestrator_doctor_gate.sh --part a` exits 1 at the base, with the new cases failing. Record the failing case list.
  - Green: `measure/doctor.sh` per FR-3.
    - Keep `set -euo pipefail` at line 2 and the three guard steps as bare lines 4 to 6.
    - Replace the capture block with `set +e`, `architecture_output="$( cd packages/architecture-enforcement && ../../node_modules/.bin/tsx src/architecture-check-cli.ts --skip-input-snapshot-pin 2>&1 )"`, `architecture_status=$?`, `set -e`, then `printf '%s\n' "$architecture_output"`. The output reaches the terminal, and the script holds the exit code and the text.
    - For a code of 0 or 1, print `ARCHITECTURE: step 4 exits <code>; the owner of the remaining drift is architecture_ci_input_pin_20261110`, print `DOCTOR: the three structural guard steps gate this exit code`, and exit 0.
    - For a code of 2 with a whole-line match of `Architecture check failed: V2 reconciliation manifest is invalid: Analyzer report hashes do not match current byte-identical reports` in `$architecture_output`, print `ARCHITECTURE: step 4 exits 2; the known manifest drift is owned by architecture_ci_input_pin_20261110`, print `DOCTOR: the three structural guard steps gate this exit code`, and exit 0.
    - For every other code, and for a code of 2 with any other output, print `ARCHITECTURE: step 4 exits <code>; this is a tool failure, not a boundary verdict`, print `DOCTOR: the architecture step did not produce a boundary verdict; the gate exits 1`, and exit 1.
    - Keep the restore-condition comment at lines 8 to 10. It names the close of task 1.4d of `architecture_ci_input_pin_20261110` and the Monorepo orchestrator.
    - Run a new full doctor run through the heavy-run prefix at one HEAD. Save the output to `measure/runs/doctor_gate_repair_20261112/doctor-run-<short-head>.log`.
    - Run one timing run of the step 4 command through the heavy-run prefix at the same HEAD. Save the output to `measure/runs/doctor_gate_repair_20261112/step4-timing-<short-head>.log`. Record `step4_seconds` from that log.
  - The record (`doctor-gate-evidence.md`) per FR-4:
    - The STEP 4 line records the real CLI exit and the command text `(cd packages/architecture-enforcement && ../../node_modules/.bin/tsx src/architecture-check-cli.ts --skip-input-snapshot-pin)`.
    - The VERDICT line copies the ARCHITECTURE line of the saved run.
    - The DURATION line names its source run: `- DURATION: step 4 took <N> s, from the timing run at <short-sha>`. The sha equals the `- HEAD:` value.
    - Each value comes from a saved run log at the record HEAD.
  - Check: `bash tests/orchestrator_doctor_gate.sh` exits 0, with `cases_total=<n> cases_failed=0`.
  - Check: `bash -n measure/doctor.sh` exits 0 and `bash -n tests/orchestrator_doctor_gate.sh` exits 0.
  - Check: the full run exits 0. Its output holds the known-drift ARCHITECTURE line and `DOCTOR: the three structural guard steps gate this exit code`. Record the CLI exit, the four step exit codes, and `step4_seconds`.
  - Check: the per-commit scope check of test-strategy section 1.5 gives `doctor_out_of_scope_paths=0`.
  - Commit: `fix(measure): read the real architecture exit in doctor (track_id: doctor_gate_repair_20261112)`, with `tests/orchestrator_doctor_gate.sh`, `measure/doctor.sh`, `doctor-gate-evidence.md`, and this plan.
  - Evidence of the Red round (role: Measure Mid Red; model: minimax-cn-coding-plan/MiniMax-M3.1-Flash):
    - `phase_base_sha=e592f824607cc220c02096e0a66d3174d1fe78ec`; `role_base_sha=ad72cee7a36615704ed955f4d4feb03e951ae5b5`; commit `50db02a6338faf65c891bb2b1f7b7701e8290df8`.
    - The file follows the amended test-strategy.md section 6.5. Each case builds its own root in `<tmp>`, copies `measure/doctor.sh` into `<tmp>/measure/`, writes three stub guards into `<tmp>/tests/`, creates `<tmp>/packages/architecture-enforcement/`, and writes the stub `tsx` into `<tmp>/node_modules/.bin/tsx`. The stub logs its argv in `<tmp>/tsx.log` and prints the case message on stderr. The harness writes no `pnpm` stub, and the `PATH` of every run is `<tmp>/bin:/usr/bin:/bin`. Each case removes its own `<tmp>` root. No fixture enters the repository.
    - Command: `bash tests/orchestrator_doctor_gate.sh --part a`. Exit 1 at the base. `cases_total=12 cases_failed=7`. The floor of 12 is met.
    - Command: `bash tests/orchestrator_doctor_gate.sh --part b`. Exit 1 at the base. `cases_total=12 cases_failed=3`.
    - Command: `bash tests/orchestrator_doctor_gate.sh`. Exit 1 at the base. `cases_total=24 cases_failed=10`.
    - Command: `bash -n tests/orchestrator_doctor_gate.sh`. Exit 0.
    - Case `tsx_exit_1_gate_exits_0`: FAIL (expected gate exit 0, got exit 1).
    - Case `tsx_exit_0_gate_exits_0`: FAIL (expected gate exit 0, got exit 1).
    - Case `guard_catalog_failure_gate_exits_1`: PASS. Case `guard_marker_failure_gate_exits_1`: PASS. Case `guard_truthfulness_failure_gate_exits_1`: PASS. These three are the named characterization cases.
    - Case `tsx_exit_2_manifest_drift_gate_exits_0`: FAIL (expected gate exit 0, got exit 1).
    - Case `tsx_exit_2_other_line_gate_exits_1`: FAIL (the tool failure ARCHITECTURE line is missing).
    - Case `tsx_exit_127_gate_exits_1`: PASS. This is the named characterization case.
    - Case `tsx_argv_exact`: FAIL (tsx_calls=0 expected=1).
    - Case `tool_failure_codes`: FAIL (code 2: the tool failure ARCHITECTURE line is missing). The loop asserts `codes_checked=5` before it runs.
    - Case `architecture_line_shows_code`: FAIL (the ARCHITECTURE line does not hold the code 0).
    - Case `no_write_in_root`: PASS. This is the named characterization case.
    - Part B cases `record_file_present`, `record_step_lines`, `record_step_exit_codes`, `record_verdict_line`, `record_verdict_code_matches_step4`, `record_owner_line`, `record_doctor_line`, `record_head_line`, and `record_lines_floor`: PASS. The record of task 2.3 exists, and it holds `record_lines_checked=14` against the floor of 8.
    - Part B case `record_step_commands`: FAIL (the STEP 4 command text is not the planned literal). The record holds `pnpm architecture:check --skip-input-snapshot-pin`.
    - Part B case `record_duration_line`: FAIL (the record holds no DURATION line with a source run).
    - Part B case `record_duration_sha_matches_head`: FAIL (the record holds no DURATION line with a source run).
    - F203: the 127 case and the 127 branch of `tool_failure_codes` assert `tsx_absent=1` before the gate runs. The assertion reads `test -x <tmp>/node_modules/.bin/tsx`.
    - The base `doctor.sh` calls `pnpm architecture:check --skip-input-snapshot-pin`. The harness holds no `pnpm`, so the base prints the tool-failure line with 127 in every case.
    - A scratch copy of the test file, a scratch copy of `measure/doctor.sh` that holds the planned behavior of task 2.5, and a scratch record in the planned form make all 24 cases pass with exit 0. The scratch root sat outside the repository and was removed. The real `measure/doctor.sh` and the real record did not change.
    - The scratch copy also kills two mutants of test-strategy section 7.2. A drift match on the shorter prefix `Architecture check failed:` fails `tsx_exit_2_other_line_gate_exits_1`. A branch that gives every exit 2 the tool-failure line fails `tsx_exit_2_manifest_drift_gate_exits_0`.
    - The commit holds `tests/orchestrator_doctor_gate.sh` only. No production file changed.

## Phase 3: The gate is green on master

Blast radius: the registry entry in `measure/tracks.md` and the track record. No code path changes.

- [ ] 3.1 Green: the registry status text. The entry in `measure/tracks.md` already holds the due date, the owner chain, F411, and F421, so this task makes one change: the `Status:` text moves from `new (spec and plan only; due 2026-11-14)` to `implemented (doctor gate green at <short-sha>; due 2026-11-14)`. Add no other field.
  - Check: `grep -n 'doctor_gate_repair_20261112' measure/tracks.md` shows the link line and the status line. `bash tests/orchestrator_catalog.sh` exits 0.
  - Commit: `docs(measure): state the doctor gate track status (track_id: doctor_gate_repair_20261112)`.
- [ ] 3.2 Reviews. Run Review A (correctness) on the diff. Run Review B (security): the gate must not hide a real failure, and the guard must not accept a marker that hides work. Review C records "not applicable", because no route and no UI change. Each result file goes in `measure/runs/doctor_gate_repair_20261112/` with the role and the short HEAD: `review-a-<short-head>.json`, `review-b-<short-head>.json`, and `review-c-<short-head>.json`.
  - Check: each review result file names a verdict and its findings.
- [ ] 3.3 Phase acceptance at an immutable HEAD. Record `git rev-parse HEAD` and the review verdicts. No Critical or High finding stays open.
- [ ] 3.4 Final task: the doctor gate exits 0 on master. Run the full doctor command through the heavy-run prefix at one HEAD:
  `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && bash measure/doctor.sh'`
  - Check: the exit code is 0. The output holds the step 1 PASS line, no `FAIL: unsupported task marker` line, the step 3 PASS line, the architecture verdict line, and the `DOCTOR:` line. Record `git rev-parse HEAD`, the four step exit codes, the architecture verdict message, and the step 4 seconds in `doctor-gate-evidence.md`.
  - If the run exits 124, stop the task. The orchestrator reports the stop and asks the owner for the next action.
  - Evidence class: automated.
  - Commit: `docs(measure): record the doctor gate run (track_id: doctor_gate_repair_20261112)`, with this track folder.

## Verification commands

```bash
bash tests/orchestrator_marker_vocabulary_cases.sh
bash tests/orchestrator_marker_vocabulary.sh
bash tests/orchestrator_marker_vocabulary.sh --track doctor_gate_repair_20261112
bash tests/orchestrator_catalog.sh
bash tests/orchestrator_doctor_gate.sh
git diff --name-only <base>..HEAD
```

The full gate, through the heavy-run prefix:

```bash
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && bash measure/doctor.sh'
```

The full gate records the four step exit codes and the step 4 seconds. Exit 124 stops the task. The orchestrator then asks the owner for the next action.

## Out of scope

- The pin refresh and the debt baseline. They belong to `architecture_ci_input_pin_20261110` (tasks 1.4 and 1.4d).
- The gate manifest and its `REQUIRED_GATE_FILES` list. The PM decision of 2026-11-12 keeps them in a separate track.
- The marker rule of `measure/evidence_integrity_gates/contracts.py`. The gate files stay pinned.
- The plans of other tracks. This track changes no plan outside its own folder.
- Any product file under `apps/`, `packages/`, or `services/`.
