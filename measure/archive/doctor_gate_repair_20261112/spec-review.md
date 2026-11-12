# Spec Review — doctor_gate_repair_20261112

Author model: minimax-cn-coding-plan/MiniMax-M3#high (spec.md), deepseek/deepseek-flash#high (plan.md and corrections)

Review kind: author self-check. No independent `measure-spec-review` subagent ran in this session. The orchestrator runs one later, on a model family other than the author families, before Red starts.

## What this track proposes

`bash measure/doctor.sh` fails on master at step 2. The marker guard rejects the canonical pending marker `- [ ] ` in 56 active plans. Step 4 also fails, because the committed manifest hashes are stale after the Storytime commit of 2026-11-11.

The track makes two repairs and changes no product file.

- F411: the guard accepts `- [ ] ` for a task that has not started. It fails only a marker outside the set {` `, `~`, `x`, `b`}. The catalog entry A8 states the same set.
- F421: the doctor gate runs the architecture check in CI mode with `--skip-input-snapshot-pin`. It captures the exit code, prints the verdict, and names the owner track `architecture_ci_input_pin_20261110`. The three structural guard tests keep the gate exit code.

The track ends when `bash measure/doctor.sh` exits 0 on master. The due date is 2026-11-14.

## Zero-decision check

- The marker set is fixed: {` `, `~`, `x`, `b`}. The spec gives the pending marker the meaning pending, with four sources (spec section 2.2).
- The guard keeps its `--track <track-id>` scope, its exit code 1, its message, and its archive exclusion. The plan names the predicate `grep -nE '^- \[[^ ~xb]\] '`.
- The architecture command is fixed: `pnpm architecture:check --skip-input-snapshot-pin`. The capture form is fixed: `set +e`, the command, the variable, `set -e`.
- The gate record path is fixed: `measure/tracks/doctor_gate_repair_20261112/doctor-gate-evidence.md`. Its content is fixed: one line for each of the four steps, the exit codes, the verdict message, and the owner track.
- The owner of the remaining drift is fixed: `architecture_ci_input_pin_20261110`, tasks 1.4 and 1.4d.
- The plan names the test files, the cases, the commands, and the commit headers.
- Two open questions stay open, each with a default. OQ-1 uses D-3 option (C). OQ-2 uses the A8 rewording. No task waits on an answer.

## Facts verified against the code (read only, at `8e15f353c` and `97d86a413`)

- `measure/doctor.sh` holds seven lines and four steps. Step 2 runs `bash tests/orchestrator_marker_vocabulary.sh`.
- The guard fails a plan on a top-level line that starts with `- [ ] ` (line 55). The glob at line 45 reads only active plans.
- `bash measure/doctor.sh` exits 1 at both commits. Step 1 prints the PASS line with 6 guards. Step 2 names the 56 failing plans.
- 92 active plans, 56 failing plans, and 760 pending lines. No top-level line carries a marker outside the canonical set.
- A8 is at `measure/anti-patterns.md:232-249`. Its Guard line names the live guard script.
- `measure/automation-supervisor.py` is absent. Commit `49d6aeaa4` removed it. Commit `31175a24b` removed its check from `measure/doctor.sh`.
- The manifest hash was last written in `de25d49a9` at 2026-11-11 10:45 +0700. Commit `08c36df04` came later at 13:53 +0700 and changed two analyzed app files and test files.
- The two failure messages sit at `v2-manifest-validation.ts:1233-1242`, `:1337-1344`, and `:1345-1353`.
- `package.json:7-8`, `.github/workflows/ci.yml:157`, `AGENTS.md:80-93`, and the two installed role lines at 141 and 33 hold as the spec states.
- The sibling track holds task 1.4 as `[~]` and task 1.4d as `[ ]`. The PM decision of 2026-11-11 is at its spec line 220.

## Corrections made in this session

- The base commit line now names the second read at `97d86a413`.
- The counts now read 169 `[~]` lines and 1154 `[x]` lines at `97d86a413`. The earlier draft printed 170 and 1170. The 1170 figure was wrong at both commits.
- The archived-plan sentence now points at the comment at lines 36 to 39 and the glob at line 45, not at code lines 36 to 39.
- The accounting example now names lines 239, 245, 247, and 249. The earlier lines 208, 214, 216, and 218 were wrong.
- The evidence integrity marker rule now names `contracts.py:652`. The earlier line 649 was wrong.

## Findings

- None blocking.
- F1 [Note] The spec says two steps fail. With `set -euo pipefail`, step 4 does not run while step 2 fails. The plan fixes step 2 first, then records the step 4 verdict.
- F2 [Note] The gate record is a new file. Its content is a recorded run, not a hash.
- F3 [Note] The guard test uses a temporary copy of the guard and fixture plans. No fixture enters `measure/tracks/`.
- F4 [Note] A16 of `measure/anti-patterns.md` exists and is out of scope for this track.

Verdict: pass for the author self-check. Retry recommendation: run an independent spec review on another model family before Red.

Dispositions: F1 KEEP, F2 KEEP, F3 KEEP, F4 KEEP (out of scope).

## Independent spec review, round 1

Source: `measure/runs/doctor_gate_repair_20261112/spec-review-e6dc5b067.json`.

- Role: `measure-spec-review`. Round: `r1`. Reviewer route: `claude-code/claude-sonnet-5-5#high`. Confidence: high.
- Audited head: `e6dc5b067e7e9cc58c7bd1afc441fab49d49b127`.
- Verdict: **fail**. Retry recommendation: `escalate_human`.
- Summary, verbatim: "The track repairs the doctor gate with a small change. It does not touch the gate manifest, any product file, the PM role files, or the evidence gate marker rule. Every fact of spec section 2 that was checked holds, except one path typo. Two plan gaps leave a design choice to Red or Green (guard message text and gate record line format). Both are Blockers under the zero-decision rule. Eight Major findings and two Nit findings also remain."

### Paraphrase, verbatim

- Proposes: "The track makes the marker guard accept the canonical pending marker `- [ ] ` and fail only a marker outside {space, ~, x, b}, and it rewords catalog entry A8 to match. It changes measure/doctor.sh so that the architecture check runs in CI mode with a captured exit code, prints its verdict and its owner track, and no longer sets the gate exit code. Three structural guard steps keep gating the exit code. The track adds two tests, a gate record and a registry entry, and changes no product file, no manifest, no gate file and no PM role file. The goal is bash measure/doctor.sh exits 0 on master by 2026-11-14."
- Current system: "doctor.sh runs four steps under set -euo pipefail: the catalog test, the marker vocabulary guard, the review truthfulness test, and pnpm architecture:check. Step 2 fails today on 56 active plans (57 at HEAD with the track plan) because it rejects the pending marker that the framework writes for every new task. Step 4 would fail next, because the committed manifest hashes are stale after the Storytime commit 08c36df04, and the sibling track architecture_ci_input_pin_20261110 owns the pin refresh and the debt baseline. CI already runs the check with --skip-input-snapshot-pin."

### Blocking findings, verbatim

- **F1 [Blocker]** plan.md task 1.1 and task 1.2: the plan does not give the exact FAIL and PASS message text of the guard, and the Red test needs a string to assert. Rationale: the current FAIL header at tests/orchestrator_marker_vocabulary.sh:56 reads "deprecated [ ] markers ... use [~], [x], or [b]" and is false after the change. Task 1.2 only says to update the PASS message, and FR-1 and Red case 2 need a message that names the plan and the offending marker. Green must invent the text and Red must guess it, so a CLI shape is left to the implementer. Write the exact FAIL line, the exact PASS line, and the substring that case 2 asserts.
- **F2 [Blocker]** plan.md task 2.1 and task 2.3: the plan does not give the line format of doctor-gate-evidence.md, and the Red test must match it before the file exists. Rationale: Red (one model family) writes a matcher for the four step lines, the exit codes, the verdict message and the owner track. Green (another family) writes the file later. The plan says only "one line for each step" and "the step name, the command, the exit code, and the date". The file shape is left to Red and Green. Write one literal template line per step and the exact verdict line, and say which tokens the test matches.

### Nonblocking findings, verbatim

- **F3 [Major]** plan.md task 1.1: the expected Red result is wrong, and the fixture layout is not pinned. Rationale: the plan says exit 1 at the base "with case 1 as the failing case". Case 2 (`- [?]` must exit 1) also fails at the base, because the base predicate at guard line 55 matches only `[ ]` and exits 0 on `[?]`. Cases 3, 4 and 5 pass at the base. The guard sets ROOT from BASH_SOURCE, so the copy must sit at <tmp>/tests/orchestrator_marker_vocabulary.sh with fixtures under <tmp>/measure/tracks/<id>/plan.md. The archive case must put an offending marker in <tmp>/measure/archive/<id>/plan.md, or it proves nothing. `--track <id>` resolves measure/archive/<id> first (guard lines 9 to 16). State these facts in the task.
- **F4 [Major]** plan.md task 2.1 and spec AC-5: the doctor gate test only reads measure/doctor.sh as text, and text cannot prove the stated behavior. Rationale: AC-5 says the test holds that the gate exit code does not depend on the architecture verdict. A substring check cannot prove that, and it cannot prove that a failing guard step still fails the gate. This is the A1 class of the catalog (substring as signal). Review B of task 3.2 asks for exactly this proof. Phase 1 already uses a temporary root, so use it here: run a copy of doctor.sh in a temporary directory with stub guard scripts and a stub pnpm on PATH. Name the cases: guards pass and pnpm exits 1 gives exit 0 and the ARCHITECTURE line; a guard fails gives a non-zero exit.
- **F5 [Major]** spec.md D-3 and plan.md task 2.2: the gate treats every exit code of the architecture step the same, so a tool crash passes silently. Rationale: the CLI returns 1 for a boundary failure and 2 for a tool failure (architecture-check-cli.ts lines 135 to 150). A missing pnpm returns 127. Option (C) prints the code and exits 0 for all of them. The line shows the code, but the plan states no rule for code 2 or 127. Name the behavior, for example a distinct DOCTOR line for a code other than 0 or 1, and test it (see F4).
- **F6 [Major]** spec.md D-3 and OQ-1: the quoted PM decisions do not cover a non-gating architecture step, and the track has no condition that restores the gate. Rationale: decision 3 is about the marker check and the follow-up track. Decision 4 is about the gate manifest. Neither says the architecture step may stop gating doctor. The gate that measure-final-acceptance reads at line 141 then no longer reflects the boundary check. Task 1.4 of the sibling track is `[~]` and task 1.4d is `[ ]`. Neither the spec nor the plan says who restores gating or when. Confirm option (C) with the PM and add one line that names the restore condition and its owner.
- **F7 [Major]** plan.md task 1.2 and task 1.4: the plan hard-codes counts that already moved, and the guard does not print them. Rationale: the plan says to record plans_checked=92 and fail_lines=0. At HEAD e6dc5b067 there are 93 active plans (the track's own plan.md is the 93rd). The guard prints only "(N plans checked)" and prints no fail_lines. Green cannot match the literal 92. Say to record the printed count at run time, and drop fail_lines or define how to measure it.
- **F8 [Major]** plan.md task 3.1 with spec FR-5 and AC-8: the registry entry already exists, so the task has no failing state and may make an empty commit. Rationale: measure/tracks.md lines 1664 to 1667 already name the due date, the owner chain, F411 and F421. AC-8 passes at the base. The plan says only to correct a missing field in place. State the one change the task makes (for example the status text at close) or fold the task into 3.4.
- **F9 [Major]** plan.md task 3.2 and task 3.4: the review result files have no names, and task 3.4 has no commit header. Rationale: task 3.2 says to record the review result files in the track folder without a path. Task 3.4 changes doctor-gate-evidence.md but names no commit. One commit per task is a constraint of spec section 5. Name the file paths and the 3.4 commit header.
- **F10 [Major]** plan.md Verification commands and task 3.4: the runtime of the architecture step is not known, and the heavy-run prefix kills the run at 1800 s. Rationale: the sibling track refresh ended with exit 124 at 5400 s, and its plan says no test measures the check time. The spec has no measured time for `pnpm architecture:check --skip-input-snapshot-pin`. If the step takes longer than 1800 s, heavy-run kills the whole doctor run, the capture block does not help, and AC-1 and task 3.4 fail. Record the step duration in task 2.2 and name the action when the run exits 124.
- **F11 [Nit]** spec.md section 2.3: the path of the changed Storytime file is wrong. Rationale: git show --stat 08c36df04 shows apps/storytime/app/[locale]/teacher/[level]/[week]/[day]/lesson-flow.tsx. The spec writes `[week]/day/lesson-flow.tsx` without the brackets around day.
- **F12 [Nit]** plan.md task 1.4: the expected diff list omits the track plan. Rationale: the range <phase_base_sha>..HEAD holds the plan.md marker edits of the track folder. Task 2.4 allows the track record, but task 1.4 lists only three files. Add the track folder to the list. Also note that spec.md section 7 does not say that contracts.py:649 validate_plan_marker (pinned, rejects `[ ]`, no caller outside its test) now disagrees with the guard.

### Reviewer view on the copy-versus-flag question, verbatim

"View on the author's open question: copy the guard into a temporary root. Do not add a --plans-root flag. The guard sets ROOT from BASH_SOURCE, so a copy at <tmp>/tests/ reads <tmp>/measure/. A flag adds CLI surface that FR-1 does not ask for and that no other caller needs. The plan must pin the layout (finding F3)."

### Handoff questions and their defaults

- Q1: may the architecture step stop gating doctor (spec D-3 option C)? Default: yes, option C, with a named restore condition and owner (F6).
- Q2: what is the measured runtime of `pnpm architecture:check --skip-input-snapshot-pin`, and what happens at exit 124 under the 1800 s heavy-run limit? Default: record the duration in task 2.2 and stop for an owner decision on exit 124 (F10).
- Q3: temporary-root copy or a `--plans-root` flag for task 1.1? Default and reviewer view: temporary-root copy, no flag.

## Author response, round 1

Each response names the plan task or the spec section that changed.

- **F1**: task 1.1 and task 1.2 now hold the exact PASS line, the exact FAIL line, and the substrings that each case asserts. FR-1 pins both strings.
- **F2**: task 2.1 part B and task 2.3 now hold one literal step line, the verdict line, the owner line, and the token list. AC-6 pins the same form.
- **F3**: task 1.1 now names the copy path, the fixture path, the five case names, and the base result. Cases 1 and 2 fail at the base, and cases 3, 4, and 5 pass. The archive fixture holds an offending marker.
- **F4**: task 2.1 now runs a copy of `doctor.sh` in a temporary root with stub guards and a stub `pnpm`. The five cases carry their expected exit in the name. AC-5 states the same behavior.
- **F5**: task 2.2 and FR-3 give the rule for an exit code other than 0 or 1: a distinct ARCHITECTURE line, the tool-failure DOCTOR line, and exit 1. Cases `pnpm_exit_2_gate_exits_1` and `pnpm_exit_127_gate_exits_1` test it.
- **F6**: spec D-3 and OQ-1 mark option (C) as the default of 2026-11-12, waiting for the PM confirmation. D-3 holds the restore line and the owner.
- **F7**: task 1.2 records the printed plan count at run time. The `fail_lines` figure is gone, and task 1.4 records the same printed count.
- **F8**: task 3.1 now makes one change: the registry status text moves from `new (spec and plan only…)` to `implemented (doctor gate green at <short-sha>…)`.
- **F9**: task 3.2 names `measure/runs/doctor_gate_repair_20261112/review-a-<short-head>.json`, `review-b-<short-head>.json`, and `review-c-<short-head>.json`. Task 3.4 carries the commit header `docs(measure): record the doctor gate run (track_id: doctor_gate_repair_20261112)`.
- **F10**: task 2.2, task 2.4, task 3.4, the Verification commands, and spec OQ-3 record the step 4 seconds. Exit 124 stops the task, and the orchestrator asks the owner.
- **F11**: spec section 2.3 now reads `apps/storytime/app/[locale]/teacher/[level]/[week]/[day]/lesson-flow.tsx`.
- **F12**: task 1.4 adds the track folder to the expected diff list. Spec section 7 states that `contracts.py:649` `validate_plan_marker` disagrees with the guard after this track.
- **Q3**: the plan takes the reviewer view. Task 1.1 copies the guard into a temporary root and adds no flag.

Round 2 awaits the independent spec review at the amended head.
