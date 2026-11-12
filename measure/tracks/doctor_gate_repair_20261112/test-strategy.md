# Test strategy: doctor gate repair

> **Track:** `doctor_gate_repair_20261112` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Scope:** Phase 1 (F411, the marker guard), Phase 2 (F421, the architecture verdict), Phase 3 (the exit 1 rule of F207, then the gate is green on master). All tasks 1.1 to 3.4.
> **Written:** 2026-11-12 at role base `0b3d04ac0` (the amendment commit). Model: claude-sonnet-5-5.
> **Amended:** 2026-11-12 after the failed Phase 2 reviews (Review A F201 to F205, Review B F251, N1, N2) and the PM decision of 2026-11-12. Model: deepseek-flash.
> **Amended (P3):** 2026-11-12 after the PM decision on F207. The amendment adds tasks 3.0a and 3.0b (sections 6.8a and 6.8b), the P3 cases (section 4.1), the P3 mutants (section 7.4), and the part A floor of 19. Model: claude-sonnet-5-5.
> **Spec review:** pass at `measure/runs/doctor_gate_repair_20261112/spec-review-0b3d04ac0.json` (round 2, Kimi).
> **One SHA in this file.** Section 1.5 records the `phase_base_sha` of Phase 3, which the orchestrator set. The other phases name no SHA. Section 1.5 names each capture point.
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
- **Phase 3:** `phase_base_sha=6a059f1a909ce58db31533a8c81a28db62626fc1`. The orchestrator set this value. It is the commit after the Phase 2 acceptance that adds the Phase 2 checkpoint and the F207 tasks. It is the scope base for the check below.
  - This value predates the commit of the P3 amendment of this file. That commit writes only the track folder, so `doctor_out_of_scope_paths` stays 0. See question Q4.
  - The first task of the phase is 3.0a (Red). Before 3.0a starts, the orchestrator confirms that `git log -1 --format=%s -- measure/tracks/doctor_gate_repair_20261112/test-strategy.md` prints `docs(measure): add the doctor p3 exit 1 strategy (track_id: doctor_gate_repair_20261112)`. The Red role then works from the amended strategy.
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
- **The part A floor of P3.** Part A holds `part_a_cases=13` today. A run of `bash tests/orchestrator_doctor_gate.sh --part a` on 2026-11-12 printed `cases_total=13 cases_failed=0`. Task 3.0a adds 6 cases: the 3 cases of the plan and 3 cases of this strategy (section 4.1). The new floor is `part_a_floor=19`. The constant `PART_A_FLOOR` moves from 12 to 19 in the Red commit. The floor equals the count, so a deleted case fails the floor check (A4). The run with no argument holds `cases_total=31` (part A 19, part B 12).

### 1.7 Output contract of the two new test files (the strategy adds this)

The adversarial role must attribute a mutant to a case. Both new files therefore print:

- one line per case: `CASE <name>: PASS` or `CASE <name>: FAIL (<reason>)`;
- one summary line: `cases_total=<n> cases_failed=<n>`;
- exit 1 when `cases_failed` is above 0, and exit 1 when `cases_total` is below the floor of its file (A4). The floor is `cases_total>=14` for the marker cases file. The floor of part A of the doctor gate file is `cases_total>=12` through Phase 2, and `cases_total>=19` from task 3.0a (section 1.6).

Both files derive `ROOT` from `BASH_SOURCE` (the idiom of line 4 of the guard). They hold no absolute repository path. A scratch repository layout then tests the copy that sits beside it (section 7). The case-file copy rule: each case builds its own root, copies the script under test from its own `ROOT`, and removes the scratch root when it ends. No fixture enters `measure/tracks/`.

## 2. Facts that shape the tests (read on 2026-11-12 at `0b3d04ac0`; Red and Green measure again)

| # | Fact | Source |
|---|---|---|
| M1 | The base guard predicate is `grep -n '^- \[ \] '`. It rejects `[ ]` and ignores `[?]`. At the base, the cases `clean_active_exits_0` and `unknown_marker_exits_1` fail, and the other three plan cases pass. | `tests/orchestrator_marker_vocabulary.sh:55` |
| M2 | The planned predicate is `grep -nE '^- \[[^ ~xb]\] '`. It matches one character between the brackets. A marker of two or more characters (`[xx]`, `[]`) is not matched, and it was not matched at the base either. See finding F3 (section 8). | `plan.md` task 1.2 |
| M3 | The guard sets `ROOT` from `BASH_SOURCE`. A copy at `<tmp>/tests/` reads `<tmp>/measure/`. `--track <id>` resolves `measure/archive/<id>` first. | guard lines 4, 9 to 16 |
| M4 | `pnpm` lives at `/home/daniebo/.local/bin/pnpm`. A `PATH` of `<tmp>/bin:$PATH` finds it. The plan sentence "`<tmp>/bin` holds no pnpm, so the shell returns 127" is therefore false with that `PATH`. See finding F1. | `command -v pnpm` on 2026-11-12 |
| M5 | `doctor.sh` calls the guards as `bash tests/<name>.sh`. The call needs the repository root as the working directory. A scratch root works when the case runs `cd <tmp>`. | `measure/doctor.sh` |
| M6 | The CLI returns 0 for a pass, 1 for a boundary failure, and 2 for a tool failure. The catch block at `architecture-check-cli.ts` lines 143 to 149 returns 2 for every error, so exit 2 covers the known manifest drift and every other tool failure. The root script `architecture:check` holds two pnpm layers, and each layer reports 1 for a failed child. The gate must call `node_modules/.bin/tsx` directly to read the real CLI exit. The local path exists: `node_modules/.bin/tsx` is an executable symlink to `../tsx/dist/cli.mjs`. No `tsx` exists under `packages/architecture-enforcement/node_modules/.bin/`. | `architecture-check-cli.ts:135-150`, `package.json:7`, `ls -l node_modules/.bin/tsx` |
| M7 | The guard test and the truthfulness guard both read plans. The truthfulness guard counts only `[~xb]` lines. It is unaffected by the guard change. | `tests/orchestrator_review_execution_truthfulness.sh:18` |
| M8 | The catalog test scans each `**Guard:**` line for `tests/...sh` paths and fails when one is missing. | `tests/orchestrator_catalog.sh:22-35` |
| M9 | `tests/orchestrator_detector_syntax.sh` exists and guards A14. An A8 reword must not add `rg -nE`. | `tests/` |
| M10 | The Part B record path sits under `measure/tracks/`. Closeout moves the track to `measure/archive/`. A path that is not resolved with `track_dir_resolve` breaks at the archive move (A9). | spec section 5, AGENTS.md closeout rule |
| M11 | The sibling track `architecture_ci_input_pin_20261110` keeps the architecture check red on master (task 1.4 is `[~]`, task 1.4d is `[ ]`). The expected CLI exit of step 4 on master today is 2 with the line `Architecture check failed: V2 reconciliation manifest is invalid: Analyzer report hashes do not match current byte-identical reports`. The pnpm wrapper reported that exit as 1, so the record of task 2.3 holds a false boundary verdict (Review A F201). After task 2.5 the expected gate result is exit 0 with the known-drift line. | spec sections 2.3 and 3, `doctor-run-49f96a7d8.log:13-18` |
| M12 | Plan task 2.2 checks `bash tests/orchestrator_doctor_gate.sh` exits 0. That file holds part B, and the record that part B reads is written only in task 2.3. The check cannot pass at task 2.2. See finding F2. | `plan.md` tasks 2.1 to 2.3 |

## 3. Phase summary and review applicability

| Phase | Risk | Review A | Review B | Review C | Adversarial | Browser review |
|---|---|---|---|---|---|---|
| P1 F411: the marker guard accepts the pending marker | **medium** | yes | yes | no | yes (small scope) | no |
| P2 F421: the gate records the architecture verdict | **high** | yes | **yes (required)** | no | **yes (required)** | no |
| P3 The exit 1 rule (tasks 3.0a, 3.0b), then the gate is green on master | **high** (tasks 3.1 to 3.4 stay low) | yes (owns the track-level run) | **yes (required)** | records "not applicable" | **yes (required)** | no |

**Why P1 is medium.** The change loosens a gate. A predicate that is too wide hides a bad marker, and a predicate that is too narrow keeps the gate red for 57 plans. The change touches no product file. The blast radius is the plan-marker check of every active plan.

**Why P2 is high.** The change turns the architecture step from a gating step into a recorded step. A defect there hides a real failure: a swallowed guard, a swallowed tool crash, or a call that rewrites the manifest. The installed closeout role reads the doctor exit code (spec section 1.3). A false green weakens every later closeout.

**Why P3 is high.** Tasks 3.0a and 3.0b change `measure/doctor.sh`, the script of P2. The new rule decides when an exit 1 hides a real failure. A rule that is too loose repeats F207: a failed `cd` or a crash counts as a boundary verdict, and the gate exits 0. A rule that is too strict turns the gate red for a real boundary verdict. The installed closeout role reads the doctor exit code (spec section 1.3). The blast radius is small: one branch of one script. Tasks 3.1 to 3.4 edit one registry status text and record reviews and one live run. They change no script, so they stay low.

**Review A (correctness) applies to every phase.** The reviews run at task 3.2 on the full track diff (plan). The orchestrator may also run Review A at the acceptance of P1 and P2 over the phase range. The default is the plan: one run at task 3.2. See question Q2.

**Review B (security) applies to P1, P2, and P3 and is required for P2 and P3.** The scope is the two sentences of plan task 3.2: the gate must not hide a real failure, and the guard must not accept a marker that hides work. Section 6 lists the reading points.

**Review C does not apply.** The track has no route, no UI, no API, and no message file. The guard FAIL and PASS lines and the DOCTOR lines are pinned strings. The tests assert them. Review C writes `review-c-<short-head>.json` with the verdict "not applicable" and that reason (plan task 3.2).

**Adversarial testing applies to P1 (small), P2 (required), and P3 (required).** Each phase holds a script with a boolean outcome that a mutant can invert. Section 7 lists the mutants. Section 7.4 lists the P3 mutants of the exit 1 rule. Tasks 3.1 to 3.4 have no behavior to mutate.

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

### 4.1 Cases of AC-5 for the FR-3 exit 1 rule (P3, task 3.0a)

The PM rule of 2026-11-12, quoted word for word: "doctor.sh counts exit 1 as a boundary verdict only when the CLI output holds its verdict line; exit 1 without that line is a tool failure (gate exit 1). Add the m-cd case."

The verdict literal in every case is `architecture check: debt-change (files=12, findings=3, parseErrors=0)`. The test copies it from the template at `packages/architecture-enforcement/src/architecture-check.ts` line 278. The stub prints it. The test never computes it with the code under test.

The tool-failure pair for code 1 is these two lines, word for word:

- `ARCHITECTURE: step 4 exits 1; this is a tool failure, not a boundary verdict`
- `DOCTOR: the architecture step did not produce a boundary verdict; the gate exits 1`

The boundary pair for code 1 is these two lines, word for word:

- `ARCHITECTURE: step 4 exits 1; the owner of the remaining drift is architecture_ci_input_pin_20261110`
- `DOCTOR: the three structural guard steps gate this exit code`

Every tool-failure case also asserts that the output holds no boundary pair line, so the gate line `DOCTOR: the three structural guard steps gate this exit code` is absent (R15). Every boundary case asserts that the output holds no `tool failure` text and no `did not produce a boundary verdict` text.

| Case (the name states the gate exit) | Setup | Gate exit | Printed lines | At the base |
|---|---|---|---|---|
| 1 `tsx_exit_1_no_verdict_gate_exits_1` | The guards pass. The stub `tsx` exits 1 and prints nothing on either stream. The case first asserts `tsx_message_set=0` (no message variable leaks from an earlier case). | 1 | the tool-failure pair for code 1 | **fails** (the base exits 0 and prints the boundary pair) |
| 2 `step4_cd_fails_gate_exits_1` (the m-cd case) | The guards pass. The stub `tsx` exists, exits 1, and prints the whole verdict line on stdout (a trap). The case removes `<tmp>/packages`, so the `cd` of the step 4 command fails. It asserts `arch_dir_absent=1` before the run and `tsx_calls=0` after the run. | 1 | the tool-failure pair for code 1 | **fails** (the base exits 0 and prints the boundary pair) |
| 3 `tsx_exit_1_verdict_line_gate_exits_0` (the positive control) | The guards pass. The stub `tsx` exits 1 and prints three lines on stdout: `build output line`, the whole verdict line, and `architecture policy: v2 (status=ok, default=deny)`. The verdict line sits in the middle. | 0 | the boundary pair for code 1 | passes (characterization) |
| 4 `tsx_exit_1_verdict_in_longer_line_gate_exits_1` | A loop with `fixtures_checked=2`, asserted before the loop. The stub exits 1. Fixture A prints `crash: ` before the verdict line on the same line. Fixture B prints ` (uncaught exception)` after the verdict line on the same line. | 1 for each fixture | the tool-failure pair for code 1 | **fails** (the base exits 0) |
| 5 `tsx_exit_1_malformed_verdict_gate_exits_1` | A loop with `shapes_checked=7`, asserted before the loop. The stub exits 1. Shape a: `architecture check: failed` (prefix only). Shape b: empty counts, `(files=, findings=, parseErrors=)`. Shape c: non-digit counts, `(files=x, findings=y, parseErrors=z)`. Shape d: one count missing, `(files=12, findings=3)`. Shape e: empty status, `architecture check:  (files=12, findings=3, parseErrors=0)`. Shape f: a status with a space, `debt change`. Shape g: a capital letter, `Architecture check: debt-change (files=12, findings=3, parseErrors=0)`. | 1 for each shape | the tool-failure pair for code 1 | **fails** (the base exits 0) |
| 6 `tsx_exit_2_verdict_line_gate_exits_1` | The guards pass. The stub exits 2 and prints the whole verdict line on stdout. | 1 | `ARCHITECTURE: step 4 exits 2; this is a tool failure, not a boundary verdict` and `DOCTOR: the architecture step did not produce a boundary verdict; the gate exits 1` | passes (characterization of the unchanged exit 2 rule) |

**Cases 1, 2, and 3 are the cases of plan task 3.0a.** Cases 4, 5, and 6 are new in this strategy. Case 4 is Red, not only adversarial. The whole-line rule is in plan task 3.0b, and the P2 mutant `m-x` survived until a late case killed it. Case 5 pins the three counts that FR-3 and plan task 3.0b require. Case 6 pins the rule that the match changes no exit 2 rule.

**The existing cases that the P3 rule changes (a changed contract).** A stub exit 1 with no verdict line is now a tool failure. Three existing part A cases use that fixture. The Red commit must change them. If the Red commit leaves them, task 3.0b fails the Green run (R27).

- `tsx_exit_1_gate_exits_0` keeps its name. Its stub keeps exit 1 and now prints the whole verdict line through the existing stderr message variable `DOCTOR_GATE_TSX_MESSAGE`. It stays the probe of the stderr stream.
- `architecture_line_shows_code` sets the same stderr message for its code 1 run. It then also asserts the boundary clause `; the owner of the remaining drift is architecture_ci_input_pin_20261110` for code 1. Without this change the printed code 1 comes from the tool-failure line and the case stops pinning the boundary line.
- `no_write_in_root` sets the same stderr message, so the file list check covers the boundary path.
- `tsx_exit_0_gate_exits_0` stays unchanged. An exit 0 with no verdict line still exits 0 (the orchestrator default, spec FR-3). The PM has not changed the exit 0 rule.

**The stub gains a stdout message.** The real CLI writes the verdict line to stdout (`architecture-check-cli.ts` line 41) and the error line to stderr (line 46). The stub today writes only to stderr. The new variable `DOCTOR_GATE_TSX_STDOUT` makes the stub print its value on stdout, one line for each line of the value. Case 3 and case 6 use stdout. The changed `tsx_exit_1_gate_exits_0` uses stderr. The two streams are then both pinned. Each new case calls `reset_tsx` first, and `reset_tsx` unsets both message variables (R26).

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
| R11 | P2 | A boundary verdict gates the exit. | Code 1 gives exit 1. | The cases `tsx_exit_1_gate_exits_0` and `tsx_exit_0_gate_exits_0`. |
| R12 | P2 | The architecture command is wrong. | The flag is dropped, or `architecture:pin:refresh` runs. The refresh writes five hash fields of the manifest. | The stub records its argv. The case asserts the exact argv and `tsx_calls=1`. |
| R13 | P2 | The architecture step runs after a failed guard. | The step runs on its own and prints a verdict next to a red guard. | The guard failure cases assert `tsx_calls=0` and no ARCHITECTURE line. |
| R14 | P2 | The gate writes a file. | The script writes a hash or a pin in the repository. | The case `no_write_in_root` compares the file list of the scratch root. |
| R15 | P2 | A message and an exit disagree. | The tool-failure path prints the gate line. The verdict path prints the tool-failure line. | Negative assertions in each case. |
| R16 | P2 | The test uses a real step 4 tool. | A path that holds a real executable makes the 127 case run the real check. | The 127 case asserts `<tmp>/node_modules/.bin/tsx` is absent first (finding F1). |
| R17 | P2 | The record is wrong or stale. | A STEP line says `exit 0` for a step that exited 1. The verdict line and the STEP 4 line disagree. | Part B cross-checks the codes (section 6, P2). Section 6, P3 records the currency rule. |
| R18 | P2 | The record path breaks at closeout (A9). | Part B reads only `measure/tracks/...`. After the archive move the test fails forever. | Part B resolves the path with `track_dir_resolve`. |
| R19 | P2 | The full run kills the machine. | The architecture check runs outside `HEAVY` and the Postgres process dies. | Every architecture run, including the timing run, goes through `HEAVY` (finding F4). |
| R20 | P3 | The registry overstates (A6). | The status says "green at <sha>" for a sha with no green run. | The registry sha is the HEAD of a recorded run with exit 0. Section 6, P3 holds the detector. |
| R21 | all | A hidden product change. | A path under `apps/`, `packages/`, or `services/` changes. | The per-commit scope check of section 1.5. |
| R22 | P3 | An exit 1 with no boundary verdict still gates as a boundary verdict (F207). | A failed `cd`, an uncaught Node exception, or a crash gives exit 1 and the gate exits 0. | Case 1 (`tsx_exit_1_no_verdict_gate_exits_1`) and case 2 (`step4_cd_fails_gate_exits_1`, the m-cd case). |
| R23 | P3 | The verdict match is too loose. | A prefix, a substring, a line with no counts, or a line with empty counts counts as the verdict line. | Case 4 (whole line) and case 5 (`shapes_checked=7`). |
| R24 | P3 | The verdict match is too strict or reads the wrong stream. | A real boundary verdict turns the gate red. The match reads one stream only, or one line only. | Case 3 (verdict on stdout, in the middle of three lines) and the changed `tsx_exit_1_gate_exits_0` (verdict on stderr). |
| R25 | P3 | The stub format and the real CLI format drift apart. | `formatArchitectureCheckReport` changes its line. The stub cases stay green, and the real gate turns red. | The artifact check of section 6.8b (`format_source_hits=1`). The red direction is loud and safe. |
| R26 | P3 | A message variable leaks between cases. | `run_case` does not unset the exported `DOCTOR_GATE_TSX_MESSAGE`. An earlier case leaves a verdict line, and case 1 sees it. | Each new case calls `reset_tsx` first. Case 1 asserts `tsx_message_set=0`. |
| R27 | P3 | An old case contradicts the new rule. | `tsx_exit_1_gate_exits_0` keeps a stub exit 1 with no line, so the Green run fails or the Green role edits the test. | The Red commit changes the three old cases (section 4.1). The Green commit changes `measure/doctor.sh` only. |
| R28 | P3 | The new rule changes another rule. | The match applies to exit 0 or to exit 2, or the printed text of a rule changes. | `tsx_exit_0_gate_exits_0` (unchanged) and case 6 (`tsx_exit_2_verdict_line_gate_exits_1`). |

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

**No hold (PM decision of 2026-11-12).** The PM decided Q1, quoted word for word: "1. Doctor Q1: option 2, the path you continue on after the failed Phase 2 reviews. Record it as the PM decision." Option 2 is spec D-3 option (C) with the known manifest drift as the recorded drift. Task 2.1 and task 2.5 proceed. Section 9 stays inactive.

#### 6.5 Task 2.1: Red

**RED_TEST_COMMAND:**

```bash
bash tests/orchestrator_doctor_gate.sh --part a
```

The file accepts `--part a`, `--part b`, and no argument (both parts). See finding F2. With no argument it runs part A, then part B, and exits 1 if either part fails.

**Expected result at the base.** `--part a`: exit 1. The failing cases are `tsx_exit_1_gate_exits_0`, `tsx_exit_0_gate_exits_0`, `tsx_exit_2_manifest_drift_gate_exits_0`, `tsx_exit_2_other_line_gate_exits_1`, and the added cases that fail at the base (table below). The three guard failure cases pass at the base (characterization). The base `doctor.sh` calls `pnpm architecture:check` with no flag, and the harness holds no `pnpm`, so the base prints the tool-failure line with 127. `--part b`: exit 1, the record is absent. Red is not a syntax error and not a copy error.

**Part A harness rules.**

- Each case builds `<tmp>`, writes a copy of `measure/doctor.sh` to `<tmp>/measure/doctor.sh`, writes three stub guards to `<tmp>/tests/`, and creates `<tmp>/packages/architecture-enforcement`, because the step 4 command changes into it. Each case that sets a code writes `<tmp>/node_modules/.bin/tsx`. The relative path `../../node_modules/.bin/tsx` resolves to the stub, so the stub models the real call path.
- The stub `tsx` appends its argv, one line for each call, to `<tmp>/tsx.log` and exits with the code that the case sets. It prints the case output line on stderr when the case sets one. The log is not under `node_modules`, so the case `no_write_in_root` skips `./tsx.log` in its file list.
- The case runs `cd <tmp>`, sets `PATH=<tmp>/bin:/usr/bin:/bin`, and runs `bash measure/doctor.sh` with stdout and stderr merged. It captures `gate_exit=<n>` and the output. The real `pnpm` lives at `/home/daniebo/.local/bin`, outside that `PATH`. The harness writes no `pnpm` stub, because step 4 no longer calls `pnpm`. At the base, the `pnpm` call of the old script gives 127, so no case runs the real check.
- **The 127 case and the tool-failure loop with no stub:** the case still creates `<tmp>/packages/architecture-enforcement`, and it writes no `<tmp>/node_modules/.bin/tsx`, so the command gives 127. The case first asserts that `test -x <tmp>/node_modules/.bin/tsx` fails (`tsx_absent=1`). When that assertion fails, the case fails with the reason (A4: the case would otherwise run a real executable).
- Exit codes are asserted as integers (`gate_exit`). A substring never proves an exit (A1).

**The plan cases, with the names of task 2.5:** `tsx_exit_1_gate_exits_0`, `tsx_exit_0_gate_exits_0`, `guard_catalog_failure_gate_exits_1`, `guard_marker_failure_gate_exits_1`, `guard_truthfulness_failure_gate_exits_1`, `tsx_exit_2_manifest_drift_gate_exits_0`, `tsx_exit_2_other_line_gate_exits_1`, `tsx_exit_127_gate_exits_1`, `tsx_argv_exact`, `tool_failure_codes`, `architecture_line_shows_code`, and `no_write_in_root`.

- `tsx_exit_1_gate_exits_0` and `tsx_exit_0_gate_exits_0` also assert that the output holds no `tool failure` text and holds no `did not produce a boundary verdict` text.
- `tsx_exit_2_other_line_gate_exits_1` and `tsx_exit_127_gate_exits_1` also assert that the output holds no `DOCTOR: the three structural guard steps gate this exit code` text (R15).
- `guard_failure_gate_exits_1` runs once for each of the three guards: `guard_catalog_failure_gate_exits_1`, `guard_marker_failure_gate_exits_1`, and `guard_truthfulness_failure_gate_exits_1`. Each asserts `gate_exit=1`, `tsx_calls=0` (no `tsx.log`, or an empty one), and no `ARCHITECTURE:` line.

**Added cases (the strategy adds them; task 2.5 pins the names).**

| Case | Setup | Expected | At the base |
|---|---|---|---|
| `tsx_argv_exact` | the guards pass, the stub `tsx` exits 0 | `tsx.log` holds exactly one line, and that line is `src/architecture-check-cli.ts --skip-input-snapshot-pin`. `tsx_calls=1`. | fails (the base runs `pnpm architecture:check` with no flag, and no `pnpm` exists) |
| `tsx_exit_2_manifest_drift_gate_exits_0` | the stub `tsx` exits 2 and prints `Architecture check failed: V2 reconciliation manifest is invalid: Analyzer report hashes do not match current byte-identical reports` on stderr | `gate_exit=0`, the output holds `ARCHITECTURE: step 4 exits 2; the known manifest drift is owned by architecture_ci_input_pin_20261110` and `DOCTOR: the three structural guard steps gate this exit code` | fails (the base prints the tool-failure line with 127) |
| `tsx_exit_2_other_line_gate_exits_1` | the stub `tsx` exits 2 and prints `Architecture check failed: another failure` on stderr | `gate_exit=1`, the output holds `ARCHITECTURE: step 4 exits 2; this is a tool failure, not a boundary verdict` and `DOCTOR: the architecture step did not produce a boundary verdict; the gate exits 1` | fails (the base prints 127, and no 2 line) |
| `tool_failure_codes` | a loop over the stub codes 2 (no output line), 3, 126, and 137, plus the 127 case with no stub. The loop asserts `codes_checked=5` first. | each run: `gate_exit=1`, the output holds `ARCHITECTURE: step 4 exits <code>; this is a tool failure, not a boundary verdict` and `DOCTOR: the architecture step did not produce a boundary verdict; the gate exits 1` | fails (the base prints 127 for every code) |
| `architecture_line_shows_code` | the stub exits 0, then 1 | the first run holds `step 4 exits 0;`, the second holds `step 4 exits 1;` (kills a hard-coded code) | fails |
| `no_write_in_root` | the guards pass, the stub `tsx` exits 1 | the sorted `find <tmp> -type f` list before and after the run is equal, apart from `tsx.log` | passes (characterization) |

`cases_total` for part A is at least 12 (2 `tsx` exit cases, 3 guard cases, 2 exit-2 cases, the 127 case, 3 added cases, and the characterization case). The floor in section 1.7 is 12 through Phase 2. Task 3.0a raises it to 19 (section 1.6).

**Part B rules (the record).** Part B reads the record with the `track_dir_resolve` helper of the guard (archive first, then `measure/tracks`), so the test survives the archive move (R18, A9). It keeps the plan checks:

- four lines match `^- STEP [1-4]: .+, exit [0-9]+, [0-9]{4}-[0-9]{2}-[0-9]{2}$`, one for each step number;
- one line starts `- VERDICT: ARCHITECTURE: step 4 exits ` and holds `; the owner of the remaining drift is architecture_ci_input_pin_20261110`, or holds `; the known manifest drift is owned by architecture_ci_input_pin_20261110`;
- one line holds `OWNER: architecture_ci_input_pin_20261110 owns tasks 1.4 (pin refresh) and 1.4d (debt baseline)`.

The strategy adds these checks to part B. Each reads a labeled integer or a literal:

- The command text of each STEP line equals the literal of plan task 2.5 (`bash tests/orchestrator_catalog.sh`, `bash tests/orchestrator_marker_vocabulary.sh`, `bash tests/orchestrator_review_execution_truthfulness.sh`, `(cd packages/architecture-enforcement && ../../node_modules/.bin/tsx src/architecture-check-cli.ts --skip-input-snapshot-pin)`).
- The exit codes of STEP 1, STEP 2, and STEP 3 are `0`. A gate that exits 0 needs three passing guards, so another code is a false record (A5).
- The exit code of STEP 4 is `0`, `1`, or `2`. A `2` is valid only when the VERDICT line holds `; the known manifest drift is owned by architecture_ci_input_pin_20261110`. Another code is a tool failure, and the gate would exit 1.
- The code in the VERDICT line equals the code of the STEP 4 line (R17).
- A line `- DOCTOR: the three structural guard steps gate this exit code` exists.
- A line matches `^- DURATION: step 4 took [0-9]+([.][0-9]+)? s, from the timing run at [0-9a-f]{7,12}$`, and its short sha equals the `- HEAD:` value (Review B N2).
- A line `- HEAD: <short-sha>` exists, and the short sha is 7 to 12 hexadecimal characters.

Part B checks the form and the cross-consistency of the record. It does not check that the record is current. Currency is the job of the live run at task 3.4 (R17, section 6.7). The case counts are `record_lines_checked=<n>`, with a floor of 8.

**Red commit:** `test(measure): pin the doctor gate behavior (track_id: doctor_gate_repair_20261112)`, test file only.

#### 6.6 Task 2.2 and task 2.5: Green

**GREEN_TEST_COMMAND:**

```bash
bash tests/orchestrator_doctor_gate.sh --part a
```

It exits 0 with `cases_failed=0`. Part B is not part of this check, because the record does not exist until task 2.3 (finding F2).

**The live checks of task 2.2** (plan, with one change in section 8, F4):

1. The timing run of step 4. The plan says a plain local run. The strategy runs it through `HEAVY`, because the architecture check is a heavy job and the machine has one heavy lock (R19):

   ```bash
   HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && time (cd packages/architecture-enforcement && ../../node_modules/.bin/tsx src/architecture-check-cli.ts --skip-input-snapshot-pin)'
   ```

   The note records `step4_seconds=<N>` and the CLI exit code. This run is a measurement, not the gate proof.
2. The full doctor run through `HEAVY` (plan rule 19, the command in section 1.1). The note records the exit code of the run, the four step results, the printed ARCHITECTURE line, and `step4_seconds`.

Task 2.5 repeats item 1 and item 2 at the record HEAD. It saves the timing output to `measure/runs/doctor_gate_repair_20261112/step4-timing-<short-head>.log` and the gate output to `measure/runs/doctor_gate_repair_20261112/doctor-run-<short-head>.log`. The record of task 2.5 reads those logs (Review A F204, Review B N2).

**Expected outcomes of the full run on master (M11).**

| Step 4 CLI exit | The doctor exit | The action |
|---|---|---|
| 0 | 0 | Record it. The sibling track landed its work. Record the boundary line with code 0. |
| 1 | 0 | Record it. Record the boundary line with code 1. |
| 2 with the manifest-drift line | 0 | The known drift that F421 names. Record the known-drift line and its owner. |
| 2 with any other output, and 3, 126, 127, 137, or another code | 1 | A tool failure. Stop. Record the exit, the log, and the output. Report to the orchestrator. Do not widen the change and do not edit the architecture package. |
| 124 (the heavy limit) | 124 | Stop (plan rule 20). The orchestrator asks the owner. |

A doctor exit of 1 with a step 4 tool failure is a true result. It is not a defect of the gate.

The record of task 2.3 holds a false boundary verdict, because the pnpm wrapper reported the CLI exit 2 as 1 (Review A F201). Task 2.5 corrects `measure/doctor.sh` and the record.

**Commit:** `fix(measure): record the architecture verdict in doctor (track_id: doctor_gate_repair_20261112)`.

#### 6.7 Task 2.3: Green, the gate record

**GREEN_TEST_COMMAND:**

```bash
bash tests/orchestrator_doctor_gate.sh
```

With no argument the file runs both parts. It exits 0.

**Evidence rules for the record (A5).** Each value comes from a saved run log at the record HEAD. Each STEP line comes from the output of the full run of task 2.5. A STEP exit of 0 for steps 1 to 3 needs the PASS line of that step in the saved output. The saved output goes to `measure/runs/doctor_gate_repair_20261112/doctor-run-<short-head>.log`. The STEP 4 line records the real CLI exit and the command text `(cd packages/architecture-enforcement && ../../node_modules/.bin/tsx src/architecture-check-cli.ts --skip-input-snapshot-pin)`. The VERDICT line copies the ARCHITECTURE line. The DURATION line reads `- DURATION: step 4 took <N> s, from the timing run at <short-sha>`, and its sha equals the `- HEAD:` value. The `<N>` value comes from `measure/runs/doctor_gate_repair_20261112/step4-timing-<short-head>.log`. No value comes from memory.

**Commit:** `docs(measure): record the doctor gate evidence (track_id: doctor_gate_repair_20261112)`.

#### 6.8 Task 2.4: phase check

**CLOSEOUT_GATE (P2):** at one HEAD, run

```bash
bash tests/orchestrator_doctor_gate.sh
```

and the full doctor run through `HEAVY` (section 1.1), and the per-commit scope check of section 1.5 (`doctor_out_of_scope_paths=0`). The note records each exit code and `step4_seconds`. `git worktree list --porcelain` shows one worktree.

**Review B reading points (P2).** (1) `set -euo pipefail` stays, and no guard gets `|| true`. (2) The capture block restores `set -e`. (3) Every code other than 0, 1, and the known-drift exit 2 exits 1. (4) The gate runs `(cd packages/architecture-enforcement && ../../node_modules/.bin/tsx src/architecture-check-cli.ts --skip-input-snapshot-pin)` and nothing else. No pnpm layer sits between the CLI and the gate, because each layer reports 1 for a failed child (Review A F201, Review B F251). (5) The script writes no file. (6) The restore condition of spec D-3 is written down. The rule: the Green role puts one comment in `measure/doctor.sh` that names the condition and the owner (finding F5). (7) The line `the owner of the remaining drift is architecture_ci_input_pin_20261110` also prints for exit 0, where no drift remains. The text is pinned by the spec. Review B records it as a Nit (A5, N1). (8) The exit-2 branch reads the output of the CLI. A tool crash with any other line exits 1.

Restore line (unchanged): the architecture step gates the doctor exit code again when `architecture_ci_input_pin_20261110` closes its pin refresh task 1.4d. Owner: the Monorepo orchestrator. The orchestrator watches the close of task 1.4d and opens the follow-up change.

### P3: the exit 1 rule, then the gate is green on master

**Risk: high for tasks 3.0a and 3.0b. Low for tasks 3.1 to 3.4.** Review A, Review B (required), and adversarial (required) apply. Review C records "not applicable". The browser review does not apply (section 3).

#### 6.8a Task 3.0a: Red

**RED_TEST_COMMAND:**

```bash
bash tests/orchestrator_doctor_gate.sh --part a
```

**Expected result at the base.** Exit 1. The base is the `measure/doctor.sh` of P2. It maps every exit 1 to a boundary verdict. The output holds `cases_total=19 cases_failed=4` and `failed_cases=tsx_exit_1_no_verdict_gate_exits_1,step4_cd_fails_gate_exits_1,tsx_exit_1_verdict_in_longer_line_gate_exits_1,tsx_exit_1_malformed_verdict_gate_exits_1`. The new cases run after `drift_match_requires_whole_line`, in the order of section 4.1.

**Characterization cases (they pass at the base).**

- `tsx_exit_1_verdict_line_gate_exits_0` and `tsx_exit_2_verdict_line_gate_exits_1`. The base and the new rule give the same result for these two fixtures.
- The 13 existing cases. Three of them hold the changed fixture of section 4.1.

Red is not a syntax error and not a copy error. `bash -n tests/orchestrator_doctor_gate.sh` exits 0, and the run prints `cases_total=19`. A Red run with `cases_failed` other than 4 goes back to the Red role.

**The Red commit holds these changes, in `tests/orchestrator_doctor_gate.sh` only.**

- `PART_A_FLOOR` moves from 12 to 19.
- The stub `tsx` helper prints `DOCTOR_GATE_TSX_STDOUT` on stdout. `reset_tsx` unsets both message variables.
- The three old cases of section 4.1 print the whole verdict line for their stub exit 1.
- The six new cases of section 4.1 join `run_part_a`.
- The m-cd case removes `<tmp>/packages` and asserts `arch_dir_absent=1` before the run.

**Falsification condition.** A `measure/doctor.sh` that keeps the base rule fails cases 1, 2, 4, and 5. A `measure/doctor.sh` that exits 1 for every exit 1 fails case 3 and `tsx_exit_1_gate_exits_0`. A test that deletes a case fails the floor check of 19 (A4).

**Red commit:** `test(measure): pin the doctor exit 1 verdict rule (track_id: doctor_gate_repair_20261112)`. Test file only.

#### 6.8b Task 3.0b: Green

**GREEN_TEST_COMMAND:**

```bash
bash tests/orchestrator_doctor_gate.sh && bash tests/orchestrator_marker_vocabulary_cases.sh && bash tests/orchestrator_catalog.sh
```

All three exit 0. The first command prints `cases_total=31 cases_failed=0` (part A 19, part B 12). The second prints `cases_failed=0`. The third prints `PASS: measure anti-pattern catalog exists with A1-A15`.

**The Green commit changes `measure/doctor.sh` only.** It changes the exit 1 rule only: exit 1 counts as a boundary verdict only when the step 4 output holds the whole verdict line (the pattern of plan task 3.0b, matched as a whole line). It changes no test. The exit 0 rule, the exit 2 rules, and the printed text of every rule stay as FR-3 states. A case that the Green role cannot pass goes back to the strategy role, and the Green role does not edit the case.

**The artifact check of R25.** It reads the template that the stub copies, and it proves that the real line shape still exists in the source:

```bash
grep -cF 'architecture check: ${report.status} (files=${report.filesScanned}, findings=${report.findings.length}, parseErrors=${report.parseErrors.length})' packages/architecture-enforcement/src/architecture-check.ts
```

It prints `1` and exits 0 (`format_source_hits=1`). A hit count of 0 means the real format changed. The gate then turns red for a real boundary verdict, and the strategy role revises the verdict literal.

**Live proof limit.** The real CLI exits 2 on master today (M11), so no live run reaches the exit 1 branch. The stub cases are the proof of the exit 1 rule. They are function-level live tests with test doubles. Task 3.4 proves the known-drift exit 2 path live. `measure/doctor.sh` itself is not part of the Green command. It runs only at task 3.4 through `HEAVY`.

**Commit:** `fix(measure): count doctor exit 1 only with the verdict line (track_id: doctor_gate_repair_20261112)`.

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

**P3 correction of the A6 rule (finding F12).** Task 3.0b changes `measure/doctor.sh` after the run of task 2.4. That run therefore does not prove the gate of the new script. The registry sha must be the HEAD of a full run with exit 0 that used the task 3.0b script. No such run exists before task 3.4. **Default:** the orchestrator writes the task 3.1 status after the task 3.4 run and uses the HEAD of that run. Only the order of two commits changes (the record commit of 3.4, then the registry commit of 3.1). Plan task numbers and commit texts stay.

**Commit:** `docs(measure): state the doctor gate track status (track_id: doctor_gate_repair_20261112)`.

#### 6.10 Task 3.2 and 3.3: reviews and acceptance

- Review A and Review B run on the full track diff at one HEAD. Each result file goes to `measure/runs/doctor_gate_repair_20261112/review-<a|b|c>-<short-head>.json` (plan task 3.2). Review C holds the verdict "not applicable" and the reason in section 3.
- The adversarial result goes to `measure/runs/doctor_gate_repair_20261112/adversarial-<phase>-<short-head>.json` for P1, P2, and P3 (`adversarial-p3-<short-head>.json`). The P3 run uses the mutants of section 7.4. A later change of `measure/doctor.sh` or of `tests/orchestrator_doctor_gate.sh` invalidates the kills, and the run repeats.
- No Critical and no High finding stays open at task 3.3.

**Review B reading points (P3).** (1) The pattern holds the status and all three counts, and no count accepts an empty string. (2) The match is a whole-line match. (3) The match reads the same merged output that the exit 2 rule reads, so it sees both streams. (4) A `grep` with no hit does not stop the script under `set -e`. The tool-failure lines print. (5) The exit 0 rule and the exit 2 rules are unchanged. An exit 0 with no verdict line still exits 0 (orchestrator default, spec FR-3). Review B records it as a residual. (6) The residual that a tool could print a whole verdict line and then fail. The real CLI prints the report and then returns its code, so the residual is small. Review B records it. (7) The `cd` of the step 4 command is inside the capture subshell. Its error text goes to the stderr of the gate, not to the capture. The case `step4_cd_fails_gate_exits_1` proves the gate exit 1.

#### 6.11 Task 3.4: the final run

**GREEN_TEST_COMMAND (the closeout gate of the track):**

```bash
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && bash measure/doctor.sh'
```

**CLOSEOUT_GATE (track):** the exit code is 0. The output holds the step 1 PASS line, no `FAIL: unsupported task marker` line, the step 3 PASS line, the ARCHITECTURE line, and the `DOCTOR:` line. Then `bash tests/orchestrator_doctor_gate.sh` exits 0 at the same HEAD (the record is current), and the per-commit scope check over the whole track gives `doctor_out_of_scope_paths=0`. The note records `git rev-parse HEAD`, the four step results, the verdict line, and `step4_seconds`. The evidence class is automated. On exit 124, stop (plan rule 20). The run proves the exit 2 known-drift path of the task 3.0b script live. It does not reach the exit 1 branch (section 6.8b). The note says so.

**Commit:** `docs(measure): record the doctor gate run (track_id: doctor_gate_repair_20261112)`, with this track folder.

## 7. Mutants the adversarial role must kill

**Method.** The role never edits the repository. It builds a scratch repository layout with `mktemp -d`:

- P1: `<scratch>/tests/orchestrator_marker_vocabulary.sh` (the mutant), `<scratch>/tests/orchestrator_marker_vocabulary_cases.sh` (an unchanged copy).
- P2: `<scratch>/measure/doctor.sh` (the mutant), `<scratch>/tests/orchestrator_doctor_gate.sh` (an unchanged copy), run with `--part a`.
- P3: the same layout as P2. The test copy is the P3 version of `tests/orchestrator_doctor_gate.sh` (19 cases in part A). The mutant file is a copy of the task 3.0b `measure/doctor.sh` with one edit. Run with `--part a`.

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
| no `set +e` before the capture (an exit of 1 stops the script) | `tsx_exit_1_gate_exits_0` |
| `\|\| true` after the command (the code is lost) | `tool_failure_codes` |
| the gate calls `pnpm architecture:check` (the wrapper reports 2 as 1) | `tsx_exit_2_manifest_drift_gate_exits_0` and `tsx_exit_2_other_line_gate_exits_1` |
| code 1 is treated as a tool failure | `tsx_exit_1_gate_exits_0` |
| every exit 2 gives the known-drift line | `tsx_exit_2_other_line_gate_exits_1` and `tool_failure_codes` |
| every exit 2 gives the tool-failure line | `tsx_exit_2_manifest_drift_gate_exits_0` |
| the drift match is the shorter prefix `Architecture check failed:` | `tsx_exit_2_other_line_gate_exits_1` |
| only code 2 is treated as a tool failure (`-eq 2`) | `tool_failure_codes` (codes 3, 126, 127, 137) |
| a catalog guard with `\|\| true` | `guard_catalog_failure_gate_exits_1` |
| a marker guard with `\|\| true` | `guard_marker_failure_gate_exits_1` |
| a truthfulness guard with `\|\| true` | `guard_truthfulness_failure_gate_exits_1` |
| `set -e` removed | the three guard failure cases |
| the architecture step runs before the guards, or runs after a failed guard | the three guard failure cases (`tsx_calls=0`) |
| the flag `--skip-input-snapshot-pin` is dropped | `tsx_argv_exact` |
| the command is `pnpm architecture:pin:refresh` | `tsx_argv_exact` |
| the command runs twice | `tsx_argv_exact` (`tsx_calls=1`) |
| the printed code is a fixed `1` | `architecture_line_shows_code` |
| the tool-failure path prints the gate line | `tsx_exit_2_other_line_gate_exits_1` and `tool_failure_codes` |
| the verdict path prints the tool-failure line | `tsx_exit_1_gate_exits_0` and `tsx_exit_0_gate_exits_0` |
| the tool-failure path exits 0 after it prints | `tsx_exit_2_other_line_gate_exits_1` and `tool_failure_codes` |
| the script writes a file in its root | `no_write_in_root` |
| the 127 case runs with a real executable on the path (a test mutant) | the `tsx_absent` assertion of the 127 case |

### 7.3 Part B mutants (the record)

The adversarial role also edits a scratch copy of the record, never the real one:

| Mutant | Killed by |
|---|---|
| STEP 2 says `exit 1` | the exit code rule for steps 1 to 3 |
| the VERDICT code differs from the STEP 4 code | the cross-check |
| a STEP command text is changed | the command literal check |
| the owner line names another track | the owner line match |
| the file is absent | the file check (`--part b` exits 1) |

### 7.4 P3 mutants (the exit 1 rule of doctor.sh)

The case names are the short names of section 4.1: case 1 `tsx_exit_1_no_verdict_gate_exits_1`, case 2 `step4_cd_fails_gate_exits_1`, case 3 `tsx_exit_1_verdict_line_gate_exits_0`, case 4 `tsx_exit_1_verdict_in_longer_line_gate_exits_1`, case 5 `tsx_exit_1_malformed_verdict_gate_exits_1`, case 6 `tsx_exit_2_verdict_line_gate_exits_1`. The count of mutants is `p3_mutants=22` (rows p3-01 to p3-22 below). The role runs each one and reports `p3_mutants_killed=<n>`.

| ID | Mutant | Killed by |
|---|---|---|
| p3-01 | the base rule: every exit 1 is a boundary verdict | case 1 and case 2 (and cases 4 and 5) |
| p3-02 | the m-cd mutant: a failed `cd` counts as a boundary verdict | case 2 |
| p3-03 | every exit 1 is a tool failure (the rule is removed) | case 3 and `tsx_exit_1_gate_exits_0` |
| p3-04 | a prefix-only match, `grep -qF 'architecture check:'` or `^architecture check: ` | case 5, shape a |
| p3-05 | a count pattern that accepts no digits, `[0-9]*` | case 5, shape b |
| p3-06 | a count pattern `.*`, or a pattern that checks `files=` only | case 5, shapes c and d |
| p3-07 | the third count (`parseErrors`) is dropped from the pattern | case 5, shape d |
| p3-08 | a status pattern that accepts an empty status, `[^ ]*` | case 5, shape e |
| p3-09 | a status pattern that accepts a space, `.+` | case 5, shape f |
| p3-10 | a case-fold match, `grep -i` | case 5, shape g |
| p3-11 | a match that is not whole-line (no `-x`, no anchors) | case 4, both fixtures |
| p3-12 | a match anchored at the start only | case 4, fixture B |
| p3-13 | a match anchored at the end only | case 4, fixture A |
| p3-14 | a match against stdout only (the capture drops `2>&1`, or uses `2>/dev/null`) | `tsx_exit_1_gate_exits_0` (verdict on stderr) |
| p3-15 | a match against stderr only (`2>&1 >/dev/null`) | case 3 (verdict on stdout) |
| p3-16 | a match against the first line only (`head -n 1`), or the last line only (`tail -n 1`) | case 3 (verdict in the middle of three lines) |
| p3-17 | a pattern that never matches (a BRE with `\(`, or an unescaped bracket) | case 3 and `tsx_exit_1_gate_exits_0` |
| p3-18 | the match runs under `set -e` with no guard, so a no-hit stops the script before the tool-failure lines print | case 1 and case 2 (line assertions) |
| p3-19 | the exit 1 tool-failure path prints the boundary pair, or the boundary path prints the tool-failure pair | case 1, case 2, case 4, case 5 (negative assertions), and case 3 |
| p3-20 | the verdict match also applies to exit 0 (an exit 0 with no verdict line gates) | `tsx_exit_0_gate_exits_0` (unchanged) |
| p3-21 | the verdict match also applies to exit 2 (an exit 2 with a verdict line is a boundary verdict) | case 6 |
| p3-22 | a test mutant: `reset_tsx` does not unset the message variables, so an earlier verdict line leaks into case 1 | the `tsx_message_set=0` assertion of case 1 |

A mutant that no case kills is a finding. The role checks `bash -n` on each mutant first. A prefix pattern combined with `-x` is not a mutant: the pattern never matches, and p3-17 covers it.

## 8. Findings and questions for the orchestrator

- **F1 (Major, plan task 2.1, case `tsx_exit_127_gate_exits_1`): the 127 case cannot use the normal `PATH`.** The plan sets `PATH=<tmp>/bin:$PATH`, and says an empty `<tmp>/bin` gives 127. `pnpm` lives in `/home/daniebo/.local/bin`, so the real `pnpm` is found and the case runs the real check, with an unknown exit code and a heavy run. Rule: the case uses `PATH=<tmp>/bin:/usr/bin:/bin` and asserts that no step 4 tool exists at `<tmp>/node_modules/.bin/tsx` (section 6.5). This is a plan correction. It does not change a pinned string.
- **F2 (Major, plan tasks 2.1 to 2.3, AC-5 and AC-6): task 2.2 cannot pass.** Its check is `bash tests/orchestrator_doctor_gate.sh` exits 0. That file holds part B, and part B reads the record that task 2.3 writes. Rule: the file accepts `--part a`, `--part b`, and no argument. Task 2.2 checks `--part a`. Task 2.3 checks the full file. AC-5 reads `--part a` and AC-6 reads `--part b`. The no-argument run still exits 0 at task 2.3, so the spec wording of AC-5 and AC-6 holds. **Default:** adopt the selector. The Red role of task 2.1 implements it.
- **F3 (Minor, plan task 1.2): the predicate does not match a marker of two or more characters.** `- [xx] task` and `- []` pass the guard. The base guard accepts them too, so this is not a regression. FR-1 says a marker outside the set fails. **Default:** keep the predicate of the plan (zero-decision rule). Review B records the residual. The adversarial role reports it and does not count it as a missed mutant.
- **F4 (Minor, plan task 2.2): the step 4 timing run is a plain run.** The architecture check is a heavy job and the machine has one heavy lock and 7.3 GB of RAM. **Default:** run the timing through `HEAVY` (section 6.6). The acceptance text does not change.
- **F5 (Minor, spec D-3): the restore condition is not written in any file that the gate reads.** The spec names it (close of sibling task 1.4d, owner the Monorepo orchestrator). No test can check a comment. **Default:** the Green role of task 2.2 writes one comment in `measure/doctor.sh` that names the condition and the owner. Review B reads it.
- **F6 (Minor, plan tasks 1.4, 2.4, AC-7): `git diff --name-only <phase_base_sha>..HEAD` lists other tracks.** Master is shared. **Default:** the per-commit scope check of section 1.5 is the gate.
- **F7 (Minor, plan task 3.1): the registry says "green at <short-sha>" before task 3.4.** **Default:** the sha is the HEAD of the task 2.4 run with exit 0. The rule is in section 6.9.
- **F8 (Nit):** the ARCHITECTURE line names the owner of the remaining drift when step 4 exits 0. The spec pins the text. **Default:** keep it.
- **Q1 (PM, decided 2026-11-12): option (C) of spec D-3.** The doctor gate records the architecture verdict and does not gate on it. The PM decided Q1, quoted word for word: "1. Doctor Q1: option 2, the path you continue on after the failed Phase 2 reviews. Record it as the PM decision." Option 2 holds the known manifest drift as the recorded drift, and it keeps every other CLI exit 2 a tool failure. The alternative, option (A), stays inactive (section 9).
- **Q2 (orchestrator): when do Review A and Review B run?** **Default:** once, at task 3.2, on the full track diff (the plan). The orchestrator may add a Review B run at the P2 acceptance, because P2 is high risk.
- **Q3 (orchestrator): the strategy adds cases to both test files** (section 6.1 and section 6.5). **Default:** the Red roles write all the added cases. A plan case that the Red role cannot write as stated goes back to the strategy role.

**P3 findings and questions (PM decision on F207, 2026-11-12).**

- **F9 (Major, plan task 3.0a): three existing cases contradict the new rule.** `tsx_exit_1_gate_exits_0`, `architecture_line_shows_code`, and `no_write_in_root` use a stub exit 1 with no verdict line. After task 3.0b that fixture is a tool failure, so the Green run would fail. **Default:** the Red commit changes the fixture of the three cases (section 4.1). The Green role edits no test.
- **F10 (Minor, plan task 3.0a): the stub prints only on stderr, and the real CLI prints the verdict on stdout.** A stderr-only stub cannot kill a mutant that reads stderr only. **Default:** the stub gains `DOCTOR_GATE_TSX_STDOUT`. Case 3 and case 6 use stdout, and `tsx_exit_1_gate_exits_0` keeps stderr.
- **F11 (Minor, plan task 3.0a): the plan lists 3 cases, and the strategy adds 3.** Cases 4, 5, and 6 of section 4.1 pin the whole-line rule, the three counts, and the unchanged exit 2 rule. The part A floor is 19, not 16. **Default:** adopt the six cases (Q3 of this section already lets the Red role write the cases of the strategy).
- **F12 (Minor, plan task 3.1): the registry status names a sha before the new script has a green run.** See the P3 correction of the A6 rule in section 6.9. **Default:** write the registry status after the task 3.4 run.
- **F13 (Minor, test file): `run_case` does not unset `DOCTOR_GATE_TSX_MESSAGE`.** The variable stays exported between cases. **Default:** each new case calls `reset_tsx` first, and case 1 asserts `tsx_message_set=0`.
- **F14 (Nit, spec FR-3): an exit 0 with no verdict line still exits 0.** The PM decision names exit 1 only. **Default:** keep it. The unchanged case `tsx_exit_0_gate_exits_0` pins it (mutant p3-20). A PM change to the exit 0 rule needs a new strategy revision.
- **Q4 (orchestrator): the `phase_base_sha` of Phase 3 predates the amended strategy.** The orchestrator set `6a059f1a909ce58db31533a8c81a28db62626fc1`, the commit before this amendment. **Default:** keep that value as the scope base, and confirm the amendment commit through the `git log -1 --format=%s` check of section 1.5 before task 3.0a. If the orchestrator wants a base that contains the amendment, it captures `git rev-parse HEAD` after the amendment commit and before task 3.0a, and it records the new value in section 1.5.

## 9. Inactive branch: option (A)

This section is inactive. The PM decided option 2 on 2026-11-12.

- Option (A) keeps the architecture step as a gating step in CI mode. The CLI exits 2 on master today and the sibling track owns the fix. AC-1 cannot pass on master until the sibling tasks 1.4 and 1.4d close.
- The cases `tsx_exit_1_gate_exits_0` and `tsx_exit_0_gate_exits_0` would become `tsx_exit_1_gate_exits_1` and `tsx_exit_0_gate_exits_0`. The code-1 mutants of section 7.2 change their expected exit.
- Task 2.2 would change `doctor.sh` only to add the flag. Task 3.4 would wait for the sibling track.
- On a reversal, the orchestrator asks the strategy role for a revision. No other part of this file changes.

## 10. Anti-pattern coverage

The catalog is `measure/anti-patterns.md` (A1 to A16). Per phase, each row names the defense and the falsification condition.

| ID | P1 | P2 | P3 | Defense and falsification |
|---|---|---|---|---|
| A1 | yes | yes | yes | Exit codes are integers (`gate_exit`, the case exit), never a substring. In P3 each case asserts `gate_exit` as an integer next to the printed lines. The catalog test does not read the A8 text, so the A8 token detector reads it. Falsification: a guard that prints PASS and exits 1 passes a substring-only test. |
| A2 | no | no | no | No publish gate in this track. |
| A3 | yes | yes | yes | Every count is `label=<n>`: `cases_total`, `cases_failed`, `plans_checked`, `fail_lines`, `markers_checked`, `codes_checked`, `tsx_calls`, `a8_tokens`, `step4_seconds`, `doctor_out_of_scope_paths`, and in P3 `part_a_floor`, `shapes_checked`, `fixtures_checked`, `tsx_message_set`, `arch_dir_absent`, `format_source_hits`, `p3_mutants`. A count check parses the label. Falsification: a date or a bare number passes a count check. |
| A4 | yes | yes | yes | In P3 the part A floor is `part_a_floor=19`, the loops assert `shapes_checked=7` and `fixtures_checked=2` first, and the m-cd case asserts `arch_dir_absent=1` and `tsx_calls=0`. Floors on `cases_total`. Each loop asserts its size first. Every exit-0 case has a plan count of at least 1. The 127 case asserts `tsx_absent=1`. The guard failure cases assert `tsx_calls=0` against a fixture where the control writes a call. Falsification: a loop runs over an empty list, or a case passes with a real executable. |
| A5 | yes | yes | yes | A plan note quotes the exit code and the labeled counts. A record STEP line needs the PASS line in the saved output. Part B cross-checks the codes. Falsification: a record says `exit 0` for a step that exited 1. |
| A6 | no | no | yes | The registry sha is the HEAD of a run with exit 0 (section 6.9). Falsification: the registry says green for a sha with no green run. |
| A7 | yes | no | yes | In P3 the shape loop of case 5 holds near-misses of the verdict line (prefix only, empty counts, one count missing, a capital letter). The marker loop holds near-misses (`X`, `!`, `-`, `.`, `1`, `a`). No filter uses a bare word as an exclusion token. Falsification: a near-miss marker passes the guard. |
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
# P3 Red 3.0a (exit 1 at the base: cases_total=19 cases_failed=4)
bash tests/orchestrator_doctor_gate.sh --part a
# P3 Green 3.0b (exit 0: cases_total=31 cases_failed=0 for the first command)
bash tests/orchestrator_doctor_gate.sh && bash tests/orchestrator_marker_vocabulary_cases.sh && bash tests/orchestrator_catalog.sh
# P3 Green 3.1 (after the task 3.4 run, finding F12)
grep -n 'implemented (doctor gate green at' measure/tracks.md && bash tests/orchestrator_catalog.sh
# P2 and P3 full run (heavy), tasks 2.2, 2.4, 3.4
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && bash measure/doctor.sh'
```
