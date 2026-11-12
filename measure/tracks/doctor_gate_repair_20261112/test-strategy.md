# Test strategy: doctor gate repair

> **Track:** `doctor_gate_repair_20261112` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Scope:** Phase 1 (F411, the marker guard), Phase 2 (F421, the architecture verdict), Phase 3 (the gate is green on master). All tasks 1.1 to 3.4.
> **Written:** 2026-11-12 at role base `0b3d04ac0` (the amendment commit). Model: claude-sonnet-5-5.
> **Spec review:** pass at `measure/runs/doctor_gate_repair_20261112/spec-review-0b3d04ac0.json` (round 2, Kimi).
> **No SHA in this file.** The strategy names no `phase_base_sha`. Section 1.5 names each capture point.
> **No hash, no checksum, no manifest.** The track adds none (AGENTS.md, Hashing and Provenance Policy). Git commit identity is the only provenance.

## 1. Rules for the track

### 1.1 Machine rules and commands

- The machine holds 7.3 GB of RAM. One heavy job runs at a time. The architecture check is a heavy job.
- `HEAVY` is the wrapper of plan rule 19. A full doctor run goes only through it, in the foreground:

  ```bash
  HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && bash measure/doctor.sh'
  ```

- The three shell guards, the two new test files, and the detectors of this file are light jobs. They run as plain `bash` commands.
- A light task needs no lock: reads, `grep`, `rg -n`, `git show`, `git log`, `git diff`, `git rev-parse`.
- All work runs in the shared master tree. No worktree is created (A16). Scratch roots come from `mktemp -d` under `/tmp`.
- Detectors use `rg -n '<regex>'` or `grep`. No command uses `rg -nE` (A14). An `rg` exit code of 2 is a failure. It is never a zero-hit result.
- A heavy run that ends with exit 124 stops the task (plan rule 20). The orchestrator reports the stop and asks the owner. No retry runs with a longer timeout before the answer.

### 1.2 The hash rule

- The track adds no hash field, no checksum, and no manifest. The gate record is a recorded run, not a hash (spec review note F2).
- `doctor.sh` must never run `pnpm architecture:pin:refresh`. The Phase 2 argv assertion (section 6, P2) proves it.

### 1.3 Evidence classes

- **Artifact test:** reads a file and checks text or structure. The A8 token detector, the gate record Part B, and the registry grep are artifact checks. They never prove runtime behavior.
- **Function-level live test:** runs the real script. The two new test files run a copy of the real guard or the real `doctor.sh` in a scratch root, with stub dependencies. The stubs are test doubles. They prove the script logic, not the real architecture check.
- **Recorded live run:** the full doctor run through `HEAVY` at one HEAD (tasks 2.2, 2.4, 3.4). It proves the real four-step behavior on master. The evidence is automated.
- **Repository sweep:** `bash tests/orchestrator_marker_vocabulary.sh` over the real active plans. It proves the guard accepts the real plans on master today.
- A plan `[x]` note names the commit, the evidence class, the exit code, and the labeled counts (A5). A note that says "pass" with no exit code is a defect.
- Doc and registry edits (task 1.3, 3.1) have no behavior to test. Their gates are the catalog test and the detectors. They are artifact checks only.

### 1.4 Intentionally-red aggregate suites

- No aggregate runner globs `tests/orchestrator_*.sh`. A search of `package.json`, the workflows, and the make files found no such glob. A Red file therefore cannot break an aggregate suite.
- The two Red files are red by design until their Green tasks. The targeted commands of section 6 are the gates.
- **`bash measure/doctor.sh` is red at the base and stays red through Phase 1.** After task 1.2 the step 2 sweep passes, and step 4 (`pnpm architecture:check` with no flag) can still fail. The full doctor run is therefore **not** a Phase 1 gate and is **not** run at Phase 1. The first full run is task 2.2.
- A full doctor run is not a Red proof. Red proof is the two new test files only.

### 1.5 Capture of `phase_base_sha`

- This file embeds no `phase_base_sha`. A value from before the commit of this strategy is not valid.
- **Phase 1:** the orchestrator captures `git rev-parse HEAD` **after** the commit of this strategy and **after** any commit of a strategy log, and **before** task 1.1 (Red) starts. The captured commit must contain this file: `git cat-file -e <sha>:measure/tracks/doctor_gate_repair_20261112/test-strategy.md` exits 0.
- **Phase 2:** capture after the Phase 1 acceptance commit and before task 2.1 starts.
- **Phase 3:** capture after the Phase 2 acceptance commit and before task 3.1 starts.
- The orchestrator records each full value in the Red or first-task evidence of its phase.
- Master is shared with other tracks. `git diff --name-only <phase_base_sha>..HEAD` (plan tasks 1.4 and 2.4, AC-7) lists the paths of every track and so fails for a reason that this track does not own. The gate is the per-commit scope check:

  ```bash
  git log <phase_base_sha>..HEAD --format=%H --fixed-strings --grep='track_id: doctor_gate_repair_20261112'
  ```

  Then `git show --name-only --format= <sha>` for each commit. The label is `doctor_out_of_scope_paths=<n>`. A path is in scope when it is one of the allowed write paths of plan rule 13. The phase check needs 0. The plan form is valid as an extra check only when no other commit landed on master in the range.

### 1.6 Labeled counts and floors

- Every count in a test message, a log line, or a plan note is a labeled integer `label=<n>`. A bare number never counts (A3).
- A count that measures work has a floor, stated before the loop runs. A loop over an empty set is a defect (A4). Each loop asserts its input size first.
- A Red file fails at least one case at the base for the reason the task names. A case that passes at the base is a named characterization case. The Red evidence lists each one with its reason.
- A Green run quotes the exit code, the case counts, and the labeled counts.

### 1.7 Output contract of the two new test files (the strategy adds this)

The adversarial role must attribute a mutant to a case. Both new files therefore print:

- one line per case: `CASE <name>: PASS` or `CASE <name>: FAIL (<reason>)`;
- one summary line: `cases_total=<n> cases_failed=<n>`;
- exit 1 when `cases_failed` is above 0, and exit 1 when `cases_total` is below the floor of its file (A4). The floor is `cases_total>=14` for the marker cases file and `cases_total>=11` for part A of the doctor gate file.

Both files derive `ROOT` from `BASH_SOURCE` (the idiom of line 4 of the guard). They hold no absolute repository path. A scratch repository layout then tests the copy that sits beside it (section 7). The case-file copy rule: each case builds its own root, copies the script under test from its own `ROOT`, and removes the scratch root when it ends. No fixture enters `measure/tracks/`.

## 2. Facts that shape the tests (read on 2026-11-12 at `0b3d04ac0`; Red and Green measure again)

| # | Fact | Source |
|---|---|---|
| M1 | The base guard predicate is `grep -n '^- \[ \] '`. It rejects `[ ]` and ignores `[?]`. At the base, the cases `clean_active_exits_0` and `unknown_marker_exits_1` fail, and the other three plan cases pass. | `tests/orchestrator_marker_vocabulary.sh:55` |
| M2 | The planned predicate is `grep -nE '^- \[[^ ~xb]\] '`. It matches one character between the brackets. A marker of two or more characters (`[xx]`, `[]`) is not matched, and it was not matched at the base either. See finding F3 (section 8). | `plan.md` task 1.2 |
| M3 | The guard sets `ROOT` from `BASH_SOURCE`. A copy at `<tmp>/tests/` reads `<tmp>/measure/`. `--track <id>` resolves `measure/archive/<id>` first. | guard lines 4, 9 to 16 |
| M4 | `pnpm` lives at `/home/daniebo/.local/bin/pnpm`. A `PATH` of `<tmp>/bin:$PATH` finds it. The plan sentence "`<tmp>/bin` holds no pnpm, so the shell returns 127" is therefore false with that `PATH`. See finding F1. | `command -v pnpm` on 2026-11-12 |
| M5 | `doctor.sh` calls the guards as `bash tests/<name>.sh`. The call needs the repository root as the working directory. A scratch root works when the case runs `cd <tmp>`. | `measure/doctor.sh` |
| M6 | The CLI returns 0 for a pass, 1 for a boundary failure, and 2 for a tool failure. A missing `pnpm` gives 127. An out-of-memory kill gives 137. | `architecture-check-cli.ts:135-150`, spec review r2 |
| M7 | The guard test and the truthfulness guard both read plans. The truthfulness guard counts only `[~xb]` lines. It is unaffected by the guard change. | `tests/orchestrator_review_execution_truthfulness.sh:18` |
| M8 | The catalog test scans each `**Guard:**` line for `tests/...sh` paths and fails when one is missing. | `tests/orchestrator_catalog.sh:22-35` |
| M9 | `tests/orchestrator_detector_syntax.sh` exists and guards A14. An A8 reword must not add `rg -nE`. | `tests/` |
| M10 | The Part B record path sits under `measure/tracks/`. Closeout moves the track to `measure/archive/`. A path that is not resolved with `track_dir_resolve` breaks at the archive move (A9). | spec section 5, AGENTS.md closeout rule |
| M11 | The sibling track `architecture_ci_input_pin_20261110` keeps the architecture check red on master (task 1.4 is `[~]`, task 1.4d is `[ ]`). The expected exit of step 4 on master today is 1. | spec section 2.3 |
| M12 | Plan task 2.2 checks `bash tests/orchestrator_doctor_gate.sh` exits 0. That file holds part B, and the record that part B reads is written only in task 2.3. The check cannot pass at task 2.2. See finding F2. | `plan.md` tasks 2.1 to 2.3 |

## 3. Phase summary and review applicability

| Phase | Risk | Review A | Review B | Review C | Adversarial | Browser review |
|---|---|---|---|---|---|---|
| P1 F411: the marker guard accepts the pending marker | **medium** | yes | yes | no | yes (small scope) | no |
| P2 F421: the gate records the architecture verdict | **high** | yes | **yes (required)** | no | **yes (required)** | no |
| P3 The gate is green on master | **low** | yes (owns the track-level run) | yes (owns the track-level run) | records "not applicable" | no | no |

**Why P1 is medium.** The change loosens a gate. A predicate that is too wide hides a bad marker, and a predicate that is too narrow keeps the gate red for 57 plans. The change touches no product file. The blast radius is the plan-marker check of every active plan.

**Why P2 is high.** The change turns the architecture step from a gating step into a recorded step. A defect there hides a real failure: a swallowed guard, a swallowed tool crash, or a call that rewrites the manifest. The installed closeout role reads the doctor exit code (spec section 1.3). A false green weakens every later closeout.

**Why P3 is low.** The phase edits one registry status text and records reviews and one live run. It changes no script.

**Review A (correctness) applies to every phase.** The reviews run at task 3.2 on the full track diff (plan). The orchestrator may also run Review A at the acceptance of P1 and P2 over the phase range. The default is the plan: one run at task 3.2. See question Q2.

**Review B (security) applies to P1, P2, and P3 and is required for P2.** The scope is the two sentences of plan task 3.2: the gate must not hide a real failure, and the guard must not accept a marker that hides work. Section 6 lists the reading points.

**Review C does not apply.** The track has no route, no UI, no API, and no message file. The guard FAIL and PASS lines and the DOCTOR lines are pinned strings. The tests assert them. Review C writes `review-c-<short-head>.json` with the verdict "not applicable" and that reason (plan task 3.2).

**Adversarial testing applies to P1 (small) and P2 (required).** Both phases hold a script with a boolean outcome that a mutant can invert. Section 7 lists the mutants. P3 has no behavior to mutate.

**The UX browser review does not apply to any phase.** The track changes shell scripts, a catalog entry, a record file, and a registry line. No page, no route, and no component changes. Nothing renders in a browser.

## 4. Acceptance criteria, tests, and the proof of each

| AC | Requirement | Test or run | Evidence class |
|---|---|---|---|
| AC-1 | `bash measure/doctor.sh` exits 0 on master | the full run through `HEAVY` at tasks 2.2, 2.4, 3.4 | recorded live run |
| AC-2 | the guard accepts `[ ]` and rejects an unknown marker | `bash tests/orchestrator_marker_vocabulary_cases.sh` | function-level live test |
| AC-3 | the sweep passes | `bash tests/orchestrator_marker_vocabulary.sh` | repository sweep |
| AC-4 | the catalog stays whole | `bash tests/orchestrator_catalog.sh` and the A8 token detector (section 6, P1) | live test and artifact check |
| AC-5 | the gate holds four steps and one recorded verdict | `bash tests/orchestrator_doctor_gate.sh --part a` | function-level live test |
| AC-6 | the gate record is complete | `bash tests/orchestrator_doctor_gate.sh --part b` | artifact test |
| AC-7 | no product file changed | the per-commit scope check of section 1.5 | command run |
| AC-8 | the registry carries the track | `grep -n 'doctor_gate_repair_20261112' measure/tracks.md` | artifact check |

## 5. Risks and defenses

| ID | Phase | Risk | How the track can fail it | Defense |
|---|---|---|---|---|
| R1 | P1 | The predicate is too wide. | A marker is dropped from the set. A `[~]`, `[x]`, or `[b]` plan fails the sweep. | The case `canonical_markers_exit_0` holds all three markers. Each mutant that drops one marker fails it. |
| R2 | P1 | The predicate is too narrow. | An unknown marker passes. `[X]`, `[!]`, `[-]` pass because of a case-fold or a literal match. | The marker loop (section 6, P1) with `markers_checked=7`. |
| R3 | P1 | A message is wrong. | The FAIL line goes to stdout, names no marker, or prints only one line for two hits. | Stdout and stderr are captured apart. The two-offender case asserts `fail_lines=2`. |
| R4 | P1 | A count is not the real count. | The PASS line holds a fixed number. | Cases with one plan and with two plans assert `(1 plans checked)` and `(2 plans checked)`. |
| R5 | P1 | The scope changes. | `--track` is ignored, or the archive is scanned. | The cases `track_scope_exits_0` and `archive_excluded_exits_0`. |
| R6 | P1 | A line that is not a task is flagged. | The anchor is dropped. A prose line with `[a]` in the middle fails. | The case `prose_bracket_not_flagged`. |
| R7 | P1 | The A8 text and the guard disagree. | The reword omits one marker. The catalog test still passes because it reads headings and the Guard line only. | The A8 token detector `a8_tokens=4`. |
| R8 | P1 | A vacuous pass on a plan that no one scanned. | An empty scope prints PASS. | The case `empty_scope_exits_1` and the plan count floor of 1. |
| R9 | P2 | A guard failure is swallowed. | One of three guards gets `|| true`, or `set -e` is gone. | One failure case for each of the three guards. |
| R10 | P2 | A tool crash passes the gate. | Code 2, 3, 126, 127, or 137 gives exit 0. | The loop `tool_failure_codes` with `codes_checked=5`. |
| R11 | P2 | A boundary verdict gates the exit. | Code 1 gives exit 1. | The cases `pnpm_exit_1_gate_exits_0` and `pnpm_exit_0_gate_exits_0`. |
| R12 | P2 | The architecture command is wrong. | The flag is dropped, or `architecture:pin:refresh` runs. The refresh writes five hash fields of the manifest. | The stub records its argv. The case asserts the exact argv and `pnpm_calls=1`. |
| R13 | P2 | The architecture step runs after a failed guard. | The step runs on its own and prints a verdict next to a red guard. | The guard failure cases assert `pnpm_calls=0` and no ARCHITECTURE line. |
| R14 | P2 | The gate writes a file. | The script writes a hash or a pin in the repository. | The case `no_write_in_root` compares the file list of the scratch root. |
| R15 | P2 | A message and an exit disagree. | The tool-failure path prints the gate line. The verdict path prints the tool-failure line. | Negative assertions in each case. |
| R16 | P2 | The test uses the real `pnpm`. | A `PATH` that holds the real `pnpm` makes the 127 case run the real check. | The 127 case uses a `PATH` with no `pnpm`, and asserts `command -v pnpm` fails under it first (finding F1). |
| R17 | P2 | The record is wrong or stale. | A STEP line says `exit 0` for a step that exited 1. The verdict line and the STEP 4 line disagree. | Part B cross-checks the codes (section 6, P2). Section 6, P3 records the currency rule. |
| R18 | P2 | The record path breaks at closeout (A9). | Part B reads only `measure/tracks/...`. After the archive move the test fails forever. | Part B resolves the path with `track_dir_resolve`. |
| R19 | P2 | The full run kills the machine. | The architecture check runs outside `HEAVY` and the Postgres process dies. | Every architecture run, including the timing run, goes through `HEAVY` (finding F4). |
| R20 | P3 | The registry overstates (A6). | The status says "green at <sha>" for a sha with no green run. | The registry sha is the HEAD of a recorded run with exit 0. Section 6, P3 holds the detector. |
| R21 | all | A hidden product change. | A path under `apps/`, `packages/`, or `services/` changes. | The per-commit scope check of section 1.5. |

## 6. The per-phase strategy

`ROOT=/home/daniebo/Desktop/reading-advantage-monorepo`. Expected values are literals in the tests. A test never computes an expected value with the code under test.

### P1: F411, the marker guard accepts the pending marker

**Risk: medium.** Review A, Review B, and adversarial (small) apply. Review C and the browser review do not apply (section 3).

#### 6.1 Task 1.1: Red

**RED_TEST_COMMAND:**

```bash
bash tests/orchestrator_marker_vocabulary_cases.sh
```

**Expected result at the base.** Exit 1. The failing cases are `clean_active_exits_0` and `unknown_marker_exits_1` (plan), and the cases that the strategy adds and that fail at the base (list below). The characterization cases pass at the base. Red is not a syntax error and not a copy error. `cases_failed` must name each failing case.

**The five plan cases stay as written.** The strategy adds the rows below. Each added row is a case in the same file, in the same commit.

| Case | Fixture | Expected | At the base |
|---|---|---|---|
| `markers_outside_set_exit_1` | a loop over the markers `?`, `X`, `!`, `-`, `.`, `1`, `a`, one fixture plan for each, `- [<m>] 1.1 task`. The loop asserts `markers_checked=7` before it runs. | each run: exit 1, stderr holds `FAIL: unsupported task marker [<m>] in`, stdout holds no `PASS:` | fails (the base ignores every marker except the space) |
| `two_offenders_two_fail_lines` | one plan with `- [?] 1.1 task` and `- [!] 1.2 task` | exit 1, `fail_lines=2` (count of `^FAIL: unsupported task marker` lines on stderr), the two lines name `[?]` and `[!]` | fails |
| `fail_on_stderr_pass_on_stdout` | a clean fixture and an offending fixture, stdout and stderr captured apart | the clean run prints the PASS line on stdout and nothing on stderr. The offending run prints `FAIL:` on stderr only. | the clean part fails at the base for a `[ ]` fixture, the offending part fails |
| `two_plans_count_two` | two active fixtures, each with `- [ ] 1.1 task` | exit 0, the PASS text holds `(2 plans checked)` | fails (the base rejects `[ ]`) |
| `prose_bracket_not_flagged` | one plan: `- [x] 1.1 task`, `  - nested see [a] below`, and `Prose [?] in the middle of a line` | exit 0, no `FAIL:` | passes (characterization) |
| `indented_marker_ignored` | one plan: `- [x] 1.1 task` and `  - [?] 1.2 nested` | exit 0, no `FAIL:` (spec FR-1 says top-level only) | passes (characterization) |
| `usage_error_exits_2` | `--track` with no id | exit 2, stderr holds `Usage:` | passes (characterization) |
| `empty_scope_exits_1` | no active plan under `<tmp>/measure/tracks/` | exit 1, stderr holds `FAIL: no plan.md found` | passes (characterization) |
| `track_archive_first_exits_1` | `<tmp>/measure/archive/fixture_archived_20260103/plan.md` holds `- [?] 1.1 task`. Run `--track fixture_archived_20260103`. | exit 1, `FAIL: unsupported task marker [?] in` | fails |

`cases_total` is at least 14 (5 plan cases plus 9 added rows; a loop counts as one case). The floor in section 1.7 is 14. The count line `cases_total=<n>` is a labeled integer (A3).

The case file also asserts, for the five plan cases, the exact literal substrings of the plan. The `unknown_marker_exits_1` case asserts the literal `measure/tracks/fixture_unknown_20260101/plan.md` and `FAIL: unsupported task marker [?] in`.

**Falsification condition.** A guard that exits 0 for `[?]` fails `unknown_marker_exits_1`. A guard that rejects `[ ]` fails `clean_active_exits_0`. A guard that skips the plan fails the floor check (A4).

**Red commit:** `test(measure): pin the marker guard cases (track_id: doctor_gate_repair_20261112)`, test file only.

#### 6.2 Task 1.2: Green

**GREEN_TEST_COMMAND:**

```bash
bash tests/orchestrator_marker_vocabulary_cases.sh && bash tests/orchestrator_marker_vocabulary.sh && bash tests/orchestrator_marker_vocabulary.sh --track doctor_gate_repair_20261112
```

All three exit 0. The case file reports `cases_failed=0`. The sweep prints `PASS: all active track plans use only [ ], [~], [x], or [b] task markers (<N> plans checked)` and the evidence quotes `plans_checked=<N>` read from that text at run time. The plan count moves with each new plan, so no fixed count is valid.

**The sweep depends on plans that other sessions own.** A new plan with a marker outside the set fails the sweep for a reason outside this track. The Green role then records the failing plan path and stops. It does not edit that plan (plan rule 13) and it does not widen the predicate.

#### 6.3 Task 1.3: Green, catalog entry A8

**GREEN_TEST_COMMAND:**

```bash
bash tests/orchestrator_catalog.sh && bash tests/orchestrator_marker_vocabulary.sh --track doctor_gate_repair_20261112
```

Both exit 0. The catalog test prints `PASS: measure anti-pattern catalog exists with A1-A15`.

**The catalog test does not read the A8 text.** It reads the heading and the Guard line. A reword that omits a marker passes it (R7, A1). The strategy adds the A8 token detector. It runs as a plain command and must print `a8_tokens=4`:

```bash
awk '/^## A8 /{f=1;next} /^## A9 /{f=0} f&&/\[ \]/{a=1} f&&/\[~\]/{b=1} f&&/\[x\]/{c=1} f&&/\[b\]/{d=1} END{print "a8_tokens=" a+b+c+d}' measure/anti-patterns.md
```

At the base the section holds `[ ]` and the count is below 4 (Red for the reword). After the reword the count is 4. A person reads the A8 text once for the sentence that gives `[ ]` the meaning pending. The detector for the Guard line: `rg -n '^\*\*Guard:\*\*.*tests/orchestrator_marker_vocabulary\.sh' measure/anti-patterns.md` returns one hit, and `rg -n 'rg -nE' measure/anti-patterns.md` returns exit 1 (no hit). `bash tests/orchestrator_detector_syntax.sh` exits 0 (A14).

#### 6.4 Task 1.4: phase check

**CLOSEOUT_GATE (P1):** at one HEAD, run

```bash
bash tests/orchestrator_catalog.sh && bash tests/orchestrator_marker_vocabulary.sh && bash tests/orchestrator_marker_vocabulary_cases.sh && bash tests/orchestrator_detector_syntax.sh
```

and the A8 token detector (`a8_tokens=4`), and the per-commit scope check of section 1.5 (`doctor_out_of_scope_paths=0`). The note records each exit code and the printed plan count (A5). `git worktree list --porcelain` shows one worktree (A16).

**Not a P1 gate:** the full doctor run (section 1.4).

**Review B reading points (P1).** (1) The predicate rejects every one-character marker outside the set, and a two-character marker passes (F3). Review B states whether that residual is acceptable. (2) A task that started and still shows `[ ]` is not flagged during the work. Closeout (`[ ]` must not remain) catches it. (3) The guard is line-based. It does not parse code fences. (4) An unreadable plan gives `grep` exit 2, and the guard reads that as no hit. This is the base behavior and it is not a regression.

### P2: F421, the gate records the architecture verdict

**Risk: high.** Review A, Review B (required), and adversarial (required) apply. Review C and the browser review do not apply.

**Hold condition (question Q1).** Spec D-3 option (C) is a default of 2026-11-12. It waits for the PM confirmation. The track does not record option (C) as a PM decision. Phase 1 does not depend on option (C) and proceeds. The orchestrator should hold task 2.1 (Red) until the PM confirms option (C), or until the orchestrator orders Red on the default. The cost of a late rejection is the Red commit of task 2.1 and the Green commit of task 2.2 (section 9 holds the inactive branch).

#### 6.5 Task 2.1: Red

**RED_TEST_COMMAND:**

```bash
bash tests/orchestrator_doctor_gate.sh --part a
```

The file accepts `--part a`, `--part b`, and no argument (both parts). See finding F2. With no argument it runs part A, then part B, and exits 1 if either part fails.

**Expected result at the base.** `--part a`: exit 1. The failing cases are `pnpm_exit_1_gate_exits_0`, `pnpm_exit_0_gate_exits_0`, `pnpm_exit_2_gate_exits_1`, `pnpm_exit_127_gate_exits_1` (plan), and the added cases that fail at the base (table below). `guard_failure_gate_exits_1` passes at the base (characterization). The base `doctor.sh` runs `pnpm architecture:check` with no flag, so the argv case fails at the base too. `--part b`: exit 1, the record is absent. Red is not a syntax error and not a copy error.

**Part A harness rules.**

- Each case builds `<tmp>`, writes a copy of `measure/doctor.sh` to `<tmp>/measure/doctor.sh`, writes three stub guards to `<tmp>/tests/`, and writes `<tmp>/bin/pnpm`. Each stub guard prints a PASS line and exits with a code that the case sets.
- The `pnpm` stub appends its argv, one line for each call, to `<tmp>/pnpm.log` and exits with the code that the case sets. The log is not in `<tmp>/bin`, so the stub does not change the file list that case `no_write_in_root` compares.
- The case runs `cd <tmp>`, sets `PATH=<tmp>/bin:$PATH`, and runs `bash measure/doctor.sh` with stdout and stderr merged. It captures `gate_exit=<n>` and the output.
- **The 127 case and the tool-failure loop with no stub:** `PATH=<tmp>/bin:/usr/bin:/bin`, with `<tmp>/bin` holding no `pnpm`. `pnpm` lives in `/home/daniebo/.local/bin`, so this `PATH` has no `pnpm`. The case first asserts `command -v pnpm` fails under that `PATH` (`pnpm_absent=1`). When that assertion fails, the case fails with the reason (A4: the case would otherwise run the real check).
- Exit codes are asserted as integers (`gate_exit`). A substring never proves an exit (A1).

**The plan cases stay as written** (`pnpm_exit_1_gate_exits_0`, `pnpm_exit_0_gate_exits_0`, `guard_failure_gate_exits_1`, `pnpm_exit_2_gate_exits_1`, `pnpm_exit_127_gate_exits_1`), with these additions to their assertions:

- `pnpm_exit_1_gate_exits_0` and `pnpm_exit_0_gate_exits_0` also assert that the output holds no `tool failure` text and holds no `did not produce a boundary verdict` text.
- `pnpm_exit_2_gate_exits_1` and `pnpm_exit_127_gate_exits_1` also assert that the output holds no `DOCTOR: the three structural guard steps gate this exit code` text (R15).
- `guard_failure_gate_exits_1` runs once for each of the three guards: `guard_catalog_failure_gate_exits_1`, `guard_marker_failure_gate_exits_1`, and `guard_truthfulness_failure_gate_exits_1`. Each asserts `gate_exit=1`, `pnpm_calls=0` (the `pnpm.log` is empty or absent), and no `ARCHITECTURE:` line.

**Added cases (the strategy adds them).**

| Case | Setup | Expected | At the base |
|---|---|---|---|
| `architecture_argv_exact` | the guards pass, `pnpm` exits 0 | `pnpm.log` holds exactly one line, and that line is `architecture:check --skip-input-snapshot-pin`. `pnpm_calls=1`. | fails (the base has no flag) |
| `tool_failure_codes` | a loop over the stub codes 2, 3, 126, 137, and the 127 case with no stub. The loop asserts `codes_checked=5` first. | each run: `gate_exit=1`, the output holds `ARCHITECTURE: step 4 exits <code>; this is a tool failure, not a boundary verdict` and `DOCTOR: the architecture step did not produce a boundary verdict; the gate exits 1` | fails for codes 2, 3, 126, 137 (the base exits with the pnpm code, not 1) |
| `architecture_line_shows_code` | the stub exits 0, then 1 | the first run holds `step 4 exits 0;`, the second holds `step 4 exits 1;` (kills a hard-coded code) | fails |
| `no_write_in_root` | the guards pass, `pnpm` exits 1 | the sorted `find <tmp> -type f` list before and after the run is equal, apart from `pnpm.log` | passes (characterization) |

`cases_total` for part A is at least 11 (5 plan cases, 2 extra guard cases, and 4 added cases, with a loop counted as one case). The floor in section 1.7 is 11.

**Part B rules (the record).** Part B reads the record with the `track_dir_resolve` helper of the guard (archive first, then `measure/tracks`), so the test survives the archive move (R18, A9). It keeps the plan checks:

- four lines match `^- STEP [1-4]: .+, exit [0-9]+, [0-9]{4}-[0-9]{2}-[0-9]{2}$`, one for each step number;
- one line starts `- VERDICT: ARCHITECTURE: step 4 exits ` and holds `; the owner of the remaining drift is architecture_ci_input_pin_20261110`;
- one line holds `OWNER: architecture_ci_input_pin_20261110 owns tasks 1.4 (pin refresh) and 1.4d (debt baseline)`.

The strategy adds these checks to part B. Each reads a labeled integer or a literal:

- The command text of each STEP line equals the literal of plan task 2.3 (`bash tests/orchestrator_catalog.sh`, `bash tests/orchestrator_marker_vocabulary.sh`, `bash tests/orchestrator_review_execution_truthfulness.sh`, `pnpm architecture:check --skip-input-snapshot-pin`).
- The exit codes of STEP 1, STEP 2, and STEP 3 are `0`. A gate that exits 0 needs three passing guards, so another code is a false record (A5).
- The exit code of STEP 4 is `0` or `1`. Another code is a tool failure, and the gate would exit 1.
- The code in the VERDICT line equals the code of the STEP 4 line (R17).
- A line `- DOCTOR: the three structural guard steps gate this exit code` exists.
- A line `- DURATION: step 4 took <N> s` exists, and `<N>` is an integer or a decimal number.
- A line `- HEAD: <short-sha>` exists, and the short sha is 7 to 12 hexadecimal characters.

Part B checks the form and the cross-consistency of the record. It does not check that the record is current. Currency is the job of the live run at task 3.4 (R17, section 6.7). The case counts are `record_lines_checked=<n>`, with a floor of 8.

**Red commit:** `test(measure): pin the doctor gate behavior (track_id: doctor_gate_repair_20261112)`, test file only.

#### 6.6 Task 2.2: Green

**GREEN_TEST_COMMAND:**

```bash
bash tests/orchestrator_doctor_gate.sh --part a
```

It exits 0 with `cases_failed=0`. Part B is not part of this check, because the record does not exist until task 2.3 (finding F2).

**The live checks of task 2.2** (plan, with one change in section 8, F4):

1. The timing run of step 4. The plan says a plain local run. The strategy runs it through `HEAVY`, because the architecture check is a heavy job and the machine has one heavy lock (R19):

   ```bash
   HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && time pnpm architecture:check --skip-input-snapshot-pin'
   ```

   The note records `step4_seconds=<N>` and the exit code. This run is a measurement, not the gate proof.
2. The full doctor run through `HEAVY` (plan rule 19, the command in section 1.1). The note records the exit code of the run, the four step results, the printed ARCHITECTURE line, and `step4_seconds`.

**Expected outcomes of the full run on master (M11).**

| Step 4 exit | The doctor exit | The action |
|---|---|---|
| 1 | 0 | The expected result. Record it. |
| 0 | 0 | Record it. The sibling track landed its work. |
| 2, 127, 137, or another code | 1 | A tool failure. Stop. Record the exit and the log. Report to the orchestrator. Do not widen the change and do not edit the architecture package. |
| 124 (the heavy limit) | 124 | Stop (plan rule 20). The orchestrator asks the owner. |

A doctor exit of 1 with a step 4 tool failure is a true result. It is not a defect of the gate.

**Commit:** `fix(measure): record the architecture verdict in doctor (track_id: doctor_gate_repair_20261112)`.

#### 6.7 Task 2.3: Green, the gate record

**GREEN_TEST_COMMAND:**

```bash
bash tests/orchestrator_doctor_gate.sh
```

With no argument the file runs both parts. It exits 0.

**Evidence rules for the record (A5).** Each STEP line comes from the output of the full run of task 2.2 or 2.4. A STEP exit of 0 for steps 1 to 3 needs the PASS line of that step in the saved output. The saved output goes to `measure/runs/doctor_gate_repair_20261112/doctor-run-<short-head>.log`. The step 4 code comes from the ARCHITECTURE line. The VERDICT line copies that line. No value comes from memory.

**Commit:** `docs(measure): record the doctor gate evidence (track_id: doctor_gate_repair_20261112)`.

#### 6.8 Task 2.4: phase check

**CLOSEOUT_GATE (P2):** at one HEAD, run

```bash
bash tests/orchestrator_doctor_gate.sh
```

and the full doctor run through `HEAVY` (section 1.1), and the per-commit scope check of section 1.5 (`doctor_out_of_scope_paths=0`). The note records each exit code and `step4_seconds`. `git worktree list --porcelain` shows one worktree.

**Review B reading points (P2).** (1) `set -euo pipefail` stays, and no guard gets `|| true`. (2) The capture block restores `set -e`. (3) Every code other than 0 and 1 exits 1. (4) The command is `pnpm architecture:check --skip-input-snapshot-pin` and nothing else runs from `pnpm`. (5) The script writes no file. (6) The restore condition of spec D-3 (the close of sibling task 1.4d, owner the Monorepo orchestrator) is written down. The default: the Green role puts one comment in `measure/doctor.sh` that names the condition and the owner (finding F5). (7) The line `the owner of the remaining drift is architecture_ci_input_pin_20261110` also prints for exit 0, where no drift remains. The text is pinned by the spec. Review B records it as a Nit (A5).

### P3: the gate is green on master

**Risk: low.** Review A and Review B own the track-level run at task 3.2. Review C records "not applicable". Adversarial and the browser review do not apply.

#### 6.9 Task 3.1: Green, the registry status

**RED_TEST_COMMAND (base state, not a test):**

```bash
grep -n 'new (spec and plan only; due 2026-11-14)' measure/tracks.md
```

The command exits 0 at the base and shows the status line (one hit). It is the pre-state.

**GREEN_TEST_COMMAND:**

```bash
grep -n 'implemented (doctor gate green at' measure/tracks.md && bash tests/orchestrator_catalog.sh
```

Both exit 0. The `grep` returns one hit. The command `grep -c 'new (spec and plan only; due 2026-11-14)' measure/tracks.md` then prints `0` and exits 1. Both outcomes are the expected change.

**A6 rule (the registry must not overstate).** The status text names `<short-sha>`. That sha must be the HEAD that the saved output of a full doctor run with exit 0 records (the run of task 2.4). The detector: the `- HEAD:` line of `doctor-gate-evidence.md` and the sha in the registry line are equal at the time of task 3.1. Task 3.1 runs before task 3.4. The status text is therefore true only if the run of task 2.4 exited 0. If task 3.4 or an earlier run exits non-zero, the orchestrator corrects the registry line in the same turn (A6). The registry entry holds no other change (plan task 3.1).

**Commit:** `docs(measure): state the doctor gate track status (track_id: doctor_gate_repair_20261112)`.

#### 6.10 Task 3.2 and 3.3: reviews and acceptance

- Review A and Review B run on the full track diff at one HEAD. Each result file goes to `measure/runs/doctor_gate_repair_20261112/review-<a|b|c>-<short-head>.json` (plan task 3.2). Review C holds the verdict "not applicable" and the reason in section 3.
- The adversarial result goes to `measure/runs/doctor_gate_repair_20261112/adversarial-<phase>-<short-head>.json` for P1 and for P2.
- No Critical and no High finding stays open at task 3.3.

#### 6.11 Task 3.4: the final run

**GREEN_TEST_COMMAND (the closeout gate of the track):**

```bash
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && bash measure/doctor.sh'
```

**CLOSEOUT_GATE (track):** the exit code is 0. The output holds the step 1 PASS line, no `FAIL: unsupported task marker` line, the step 3 PASS line, the ARCHITECTURE line, and the `DOCTOR:` line. Then `bash tests/orchestrator_doctor_gate.sh` exits 0 at the same HEAD (the record is current), and the per-commit scope check over the whole track gives `doctor_out_of_scope_paths=0`. The note records `git rev-parse HEAD`, the four step results, the verdict line, and `step4_seconds`. The evidence class is automated. On exit 124, stop (plan rule 20).

**Commit:** `docs(measure): record the doctor gate run (track_id: doctor_gate_repair_20261112)`, with this track folder.

## 7. Mutants the adversarial role must kill

**Method.** The role never edits the repository. It builds a scratch repository layout with `mktemp -d`:

- P1: `<scratch>/tests/orchestrator_marker_vocabulary.sh` (the mutant), `<scratch>/tests/orchestrator_marker_vocabulary_cases.sh` (an unchanged copy).
- P2: `<scratch>/measure/doctor.sh` (the mutant), `<scratch>/tests/orchestrator_doctor_gate.sh` (an unchanged copy), run with `--part a`.

It runs the copy of the test file. A mutant is killed when the named case prints `CASE <name>: FAIL` and the summary shows `cases_failed` above 0. This works because both test files derive `ROOT` from `BASH_SOURCE` and copy the script under test from beside themselves (section 1.7). A mutant that no case kills is a finding. A mutant that breaks the harness (a syntax error in the mutant) is not a kill. The role checks that the mutant file passes `bash -n` first.

### 7.1 P1 mutants (the guard)

| Mutant | Killed by |
|---|---|
| the base predicate `'^- \[ \] '` stays | `clean_active_exits_0` and `unknown_marker_exits_1` |
| the class is `[^~xb]` (the space is dropped) | `clean_active_exits_0` |
| the class is `[^ xb]`, `[^ ~b]`, or `[^ ~x]` (one marker dropped) | `canonical_markers_exit_0` |
| `grep -i` (case-fold) | `markers_outside_set_exit_1` (marker `X`) |
| a literal `\[\?\]` predicate | `markers_outside_set_exit_1` (markers other than `?`) |
| the anchor `^- ` is dropped | `prose_bracket_not_flagged` and `indented_marker_ignored` |
| the FAIL line prints and `status` stays 0 | every exit assertion of the failing cases |
| the FAIL line goes to stdout | `fail_on_stderr_pass_on_stdout` |
| the marker in the FAIL line is the fixed text `[?]` | `markers_outside_set_exit_1` |
| the loop stops at the first hit of a plan | `two_offenders_two_fail_lines` |
| the PASS count is a fixed number | `two_plans_count_two` and `clean_active_exits_0` |
| the glob reads `measure/*/plan.md` (archive included) | `archive_excluded_exits_0` |
| `--track` is ignored | `track_scope_exits_0` |
| an empty scope prints PASS | `empty_scope_exits_1` |
| the usage exit is 1 | `usage_error_exits_2` |
| the archive-first resolution is removed | `track_archive_first_exits_1` |

### 7.2 P2 mutants (doctor.sh)

| Mutant | Killed by |
|---|---|
| no `set +e` before the capture (a pnpm exit of 1 stops the script) | `pnpm_exit_1_gate_exits_0` |
| `\|\| true` after the `pnpm` call (the code is lost) | `tool_failure_codes` |
| code 1 is treated as a tool failure | `pnpm_exit_1_gate_exits_0` |
| code 2 is treated as a verdict | `pnpm_exit_2_gate_exits_1` |
| only code 2 is treated as a tool failure (`-eq 2`) | `tool_failure_codes` (codes 3, 126, 127, 137) |
| a catalog guard with `\|\| true` | `guard_catalog_failure_gate_exits_1` |
| a marker guard with `\|\| true` | `guard_marker_failure_gate_exits_1` |
| a truthfulness guard with `\|\| true` | `guard_truthfulness_failure_gate_exits_1` |
| `set -e` removed | the three guard failure cases |
| the architecture step runs before the guards, or runs after a failed guard | the three guard failure cases (`pnpm_calls=0`) |
| the flag `--skip-input-snapshot-pin` is dropped | `architecture_argv_exact` |
| the command is `pnpm architecture:pin:refresh` | `architecture_argv_exact` |
| the command runs twice | `architecture_argv_exact` (`pnpm_calls=1`) |
| the printed code is a fixed `1` | `architecture_line_shows_code` |
| the tool-failure path prints the gate line | `pnpm_exit_2_gate_exits_1` and `tool_failure_codes` |
| the verdict path prints the tool-failure line | `pnpm_exit_1_gate_exits_0` and `pnpm_exit_0_gate_exits_0` |
| the tool-failure path exits 0 after it prints | `pnpm_exit_2_gate_exits_1` and `tool_failure_codes` |
| the script writes a file in its root | `no_write_in_root` |
| the 127 case runs with the real `pnpm` on `PATH` (a test mutant) | the `pnpm_absent` assertion of the 127 case |

### 7.3 Part B mutants (the record)

The adversarial role also edits a scratch copy of the record, never the real one:

| Mutant | Killed by |
|---|---|
| STEP 2 says `exit 1` | the exit code rule for steps 1 to 3 |
| the VERDICT code differs from the STEP 4 code | the cross-check |
| a STEP command text is changed | the command literal check |
| the owner line names another track | the owner line match |
| the file is absent | the file check (`--part b` exits 1) |

## 8. Findings and questions for the orchestrator

- **F1 (Major, plan task 2.1, case `pnpm_exit_127_gate_exits_1`): the 127 case cannot run as the plan states it.** The plan sets `PATH=<tmp>/bin:$PATH`, and says an empty `<tmp>/bin` gives 127. `pnpm` lives in `/home/daniebo/.local/bin`, so the real `pnpm` is found and the case runs the real check, with an unknown exit code and a heavy run. Rule: the case uses `PATH=<tmp>/bin:/usr/bin:/bin` and asserts that `command -v pnpm` fails under it (section 6.5). This is a plan correction. It does not change a pinned string.
- **F2 (Major, plan tasks 2.1 to 2.3, AC-5 and AC-6): task 2.2 cannot pass.** Its check is `bash tests/orchestrator_doctor_gate.sh` exits 0. That file holds part B, and part B reads the record that task 2.3 writes. Rule: the file accepts `--part a`, `--part b`, and no argument. Task 2.2 checks `--part a`. Task 2.3 checks the full file. AC-5 reads `--part a` and AC-6 reads `--part b`. The no-argument run still exits 0 at task 2.3, so the spec wording of AC-5 and AC-6 holds. **Default:** adopt the selector. The Red role of task 2.1 implements it.
- **F3 (Minor, plan task 1.2): the predicate does not match a marker of two or more characters.** `- [xx] task` and `- []` pass the guard. The base guard accepts them too, so this is not a regression. FR-1 says a marker outside the set fails. **Default:** keep the predicate of the plan (zero-decision rule). Review B records the residual. The adversarial role reports it and does not count it as a missed mutant.
- **F4 (Minor, plan task 2.2): the step 4 timing run is a plain run.** The architecture check is a heavy job and the machine has one heavy lock and 7.3 GB of RAM. **Default:** run the timing through `HEAVY` (section 6.6). The acceptance text does not change.
- **F5 (Minor, spec D-3): the restore condition is not written in any file that the gate reads.** The spec names it (close of sibling task 1.4d, owner the Monorepo orchestrator). No test can check a comment. **Default:** the Green role of task 2.2 writes one comment in `measure/doctor.sh` that names the condition and the owner. Review B reads it.
- **F6 (Minor, plan tasks 1.4, 2.4, AC-7): `git diff --name-only <phase_base_sha>..HEAD` lists other tracks.** Master is shared. **Default:** the per-commit scope check of section 1.5 is the gate.
- **F7 (Minor, plan task 3.1): the registry says "green at <short-sha>" before task 3.4.** **Default:** the sha is the HEAD of the task 2.4 run with exit 0. The rule is in section 6.9.
- **F8 (Nit):** the ARCHITECTURE line names the owner of the remaining drift when step 4 exits 0. The spec pins the text. **Default:** keep it.
- **Q1 (PM, open): option (C) of spec D-3.** The doctor gate records the architecture verdict and does not gate on it. **Default:** option (C). The default waits for the PM confirmation and the track does not record it as a PM decision. The orchestrator should send the question now, because the due date is 2026-11-14. Phase 1 proceeds. The orchestrator holds task 2.1 until the answer, or orders Red on the default.
- **Q2 (orchestrator): when do Review A and Review B run?** **Default:** once, at task 3.2, on the full track diff (the plan). The orchestrator may add a Review B run at the P2 acceptance, because P2 is high risk.
- **Q3 (orchestrator): the strategy adds cases to both test files** (section 6.1 and section 6.5). **Default:** the Red roles write all the added cases. A plan case that the Red role cannot write as stated goes back to the strategy role.

## 9. Inactive branch: the PM rejects option (C)

This section is inactive until the PM answer.

- Option (A) keeps the architecture step as a gating step in CI mode. The step exits 1 on master today and the sibling track owns the fix. AC-1 cannot pass on master until the sibling tasks 1.4 and 1.4d close.
- The cases `pnpm_exit_1_gate_exits_0` and `pnpm_exit_0_gate_exits_0` would become `pnpm_exit_1_gate_exits_1` and `pnpm_exit_0_gate_exits_0`. The code-1 mutants of section 7.2 change their expected exit.
- Task 2.2 would change `doctor.sh` only to add the flag. Task 3.4 would wait for the sibling track.
- The orchestrator then asks the strategy role for a revision. No other part of this file changes.

## 10. Anti-pattern coverage

The catalog is `measure/anti-patterns.md` (A1 to A16). Per phase, each row names the defense and the falsification condition.

| ID | P1 | P2 | P3 | Defense and falsification |
|---|---|---|---|---|
| A1 | yes | yes | no | Exit codes are integers (`gate_exit`, the case exit), never a substring. The catalog test does not read the A8 text, so the A8 token detector reads it. Falsification: a guard that prints PASS and exits 1 passes a substring-only test. |
| A2 | no | no | no | No publish gate in this track. |
| A3 | yes | yes | yes | Every count is `label=<n>`: `cases_total`, `cases_failed`, `plans_checked`, `fail_lines`, `markers_checked`, `codes_checked`, `pnpm_calls`, `a8_tokens`, `step4_seconds`, `doctor_out_of_scope_paths`. A count check parses the label. Falsification: a date or a bare number passes a count check. |
| A4 | yes | yes | no | Floors on `cases_total`. Each loop asserts its size first. Every exit-0 case has a plan count of at least 1. The 127 case asserts `pnpm_absent=1`. The guard failure cases assert `pnpm_calls=0` against a fixture where the control writes a call. Falsification: a loop runs over an empty list, or a case passes with the real `pnpm`. |
| A5 | yes | yes | yes | A plan note quotes the exit code and the labeled counts. A record STEP line needs the PASS line in the saved output. Part B cross-checks the codes. Falsification: a record says `exit 0` for a step that exited 1. |
| A6 | no | no | yes | The registry sha is the HEAD of a run with exit 0 (section 6.9). Falsification: the registry says green for a sha with no green run. |
| A7 | yes | no | no | The marker loop holds near-misses (`X`, `!`, `-`, `.`, `1`, `a`). No filter uses a bare word as an exclusion token. Falsification: a near-miss marker passes the guard. |
| A8 | yes | no | no | The subject of Phase 1. The guard and the A8 text state the same set {`[ ]`, `[~]`, `[x]`, `[b]`}. Falsification: the A8 token detector prints `a8_tokens` below 4, or the guard rejects a marker of the set. The pending marker stays a closeout defect per track. |
| A9 | yes | yes | no | Part B resolves the record with `track_dir_resolve`, so the archive move does not break it. The case files use fixture ids that match no repository track. Falsification: Part B fails after the closeout move. |
| A10 | no | no | no | No TypeScript symbol changes. `build-graph update` is not needed. |
| A11 | no | no | no | No review track. |
| A12 | yes | no | no | Every `**Guard:**` path in the catalog names a live file. The catalog test runs at tasks 1.3, 1.4, and 3.1. Falsification: a Guard line names a missing file. |
| A13 | no | no | yes | The closeout role removes `measure/tracks/doctor_gate_repair_20261112/` after the archive move. Falsification: both directories exist after the move. |
| A14 | yes | no | no | Every detector uses `rg -n` or `grep`. The command never uses `rg -nE`. `bash tests/orchestrator_detector_syntax.sh` exits 0 at the P1 closeout. Falsification: a detector exits 2 and the note reads "no hit". |
| A15 | yes | yes | yes | The role receipts hold the commit and the commands. They hold no file hash. Falsification: a receipt holds a file hash that a later commit changes. |
| A16 | yes | yes | yes | One worktree. `git worktree list --porcelain` shows one worktree at each phase check. Falsification: the list shows more than one. |

## 11. Summary of the commands

```bash
# P1 Red 1.1 (exit 1 at the base)
bash tests/orchestrator_marker_vocabulary_cases.sh
# P1 Green 1.2
bash tests/orchestrator_marker_vocabulary_cases.sh && bash tests/orchestrator_marker_vocabulary.sh && bash tests/orchestrator_marker_vocabulary.sh --track doctor_gate_repair_20261112
# P1 Green 1.3
bash tests/orchestrator_catalog.sh && bash tests/orchestrator_marker_vocabulary.sh --track doctor_gate_repair_20261112
# P1 closeout 1.4
bash tests/orchestrator_catalog.sh && bash tests/orchestrator_marker_vocabulary.sh && bash tests/orchestrator_marker_vocabulary_cases.sh && bash tests/orchestrator_detector_syntax.sh
# P2 Red 2.1 (exit 1 at the base)
bash tests/orchestrator_doctor_gate.sh --part a
# P2 Green 2.2
bash tests/orchestrator_doctor_gate.sh --part a
# P2 Green 2.3 and closeout 2.4
bash tests/orchestrator_doctor_gate.sh
# P3 Green 3.1
grep -n 'implemented (doctor gate green at' measure/tracks.md && bash tests/orchestrator_catalog.sh
# P2 and P3 full run (heavy), tasks 2.2, 2.4, 3.4
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && bash measure/doctor.sh'
```
