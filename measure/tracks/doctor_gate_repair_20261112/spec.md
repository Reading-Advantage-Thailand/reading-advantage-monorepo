# Specification: Doctor gate repair

**Track ID:** `doctor_gate_repair_20261112`
**Type:** chore (classic FR list with acceptance checks)
**Status:** new. Opened 2026-11-12.
**Author model:** minimax-cn-coding-plan/MiniMax-M3#high
**Due:** 2026-11-14 (PM order)
**Owner chain:** Daniel (owner; deploy gate) → Monorepo orchestrator (track owner) → PM orchestrator (decisions of 2026-11-12)
**Plan:** [plan.md](./plan.md)
**Depends on:** none. This track reads the state of `architecture_ci_input_pin_20261110` and does not change it.

## 1. Purpose

`bash measure/doctor.sh` fails on master today. The script holds four steps. Two of them fail for reasons that this track does not own:

- step 2, the marker vocabulary guard, fails on 56 active plans that use the canonical pending marker `- [ ] `;
- step 4, the architecture boundary check, fails on committed byte hashes that the Storytime commit of 2026-11-11 changed.

This track repairs the doctor gate. It changes no product file. It names the owner of the remaining architecture drift.

### 1.1 PM decision of 2026-11-12

Quoted word for word:

> 3. F411: accepted. The marker check for one track counts as the pass. Open the doctor.sh follow-up track with a done date of 11-14.

> 4. Gate manifest: accepted (unchanged; separate track).

### 1.2 Findings to repair

- **F411 — the marker vocabulary guard.** The guard rejects the canonical pending marker in active plans.
- **F421 — the architecture boundary step.** The step compares committed byte hashes with a moving working tree.

### 1.3 Dependency the PM owns, outside the repository

The installed role file `~/.config/opencode/agents/measure-final-acceptance.md` requires `bash measure/doctor.sh exits 0` at line 141, under "Closeout readiness". This track reads that file. It does not edit it. The PM owns the file. The same file keeps the closeout rule that no `[ ]` task may remain at closeout.

## 2. Evidence

All reads below happened on 2026-11-12 at commit `8e15f353c` on branch `master`. A second read at `97d86a413` on the same day confirmed every fact. The counts of section 2.2 and the line numbers of sections 2.2 and 7 come from the second read.

### 2.1 The doctor script

`measure/doctor.sh` holds seven lines. Its four steps are:

1. `bash tests/orchestrator_catalog.sh`
2. `bash tests/orchestrator_marker_vocabulary.sh`
3. `bash tests/orchestrator_review_execution_truthfulness.sh`
4. `pnpm architecture:check`

The script sets `set -euo pipefail`, so it stops at the first failing step.

`bash measure/doctor.sh` on master exits with code 1 at `8e15f353c` and at `97d86a413`. The output names the marker failures of step 2. Steps 1 and 3 pass on master today:

- step 1 prints `PASS: A12/A13 guard declarations and archive directories verified (6 guards)`;
- step 3 prints `PASS: executed review tracks are not fully blocked by deferred:review-execution`.

### 2.2 F411, the marker vocabulary guard

`tests/orchestrator_marker_vocabulary.sh` scans `measure/tracks/*/plan.md` when no `--track` argument is given (lines 40 to 47). It fails a plan that holds a top-level line starting with `- [ ] ` (line 55). The comment at lines 36 to 39 states the archive exclusion. The glob at line 45 reads only `measure/tracks/*/plan.md`, so the guard scans no archived plan.

Measured on master at `97d86a413`:

- 92 active plans.
- 56 of them fail the guard.
- 760 top-level `- [ ] ` lines across the active plans.
- 0 top-level task lines carry a marker outside the set {` `, `~`, `x`, `b`}.
- 169 top-level `[~]` lines, 1154 top-level `[x]` lines, and 286 top-level `[b]` lines.

The count at `8e15f353c` was 170 `[~]` lines and 1153 `[x]` lines. The first draft printed 1170 `[x]` lines. That figure was wrong at both commits.

The failing lines mark pending tasks in other tracks. Example: `measure/tracks/accounting_drive_intake_20261109/plan.md` marks task 3.1 and its later tasks with `- [ ] ` at lines 239, 245, 247, 249, and later lines.

The canonical marker vocabulary of the framework gives `- [ ] ` the meaning pending:

- The measure skill, section "Task Status Markers" (SKILL.md lines 123 to 127): "`[ ]` - Pending", "`[~]` - In Progress", "`[x]` - Completed".
- `measure/workflow.md` line 53: "Mark In Progress: Before beginning work, edit `plan.md` and change the task from `[ ]` to `[~]`".
- The measure skill, new-track workflow (references/new-track.md lines 205 to 210), tells the author to write `- [ ] ` for every task and sub-task.
- The measure-guard rule asks for `[~]` only after work starts.

The catalog entry A8 (`measure/anti-patterns.md` lines 232 to 249) declares the space marker deprecated, because the supervisor task regex ignored it. Its "Detection" recipe greps `measure/automation-supervisor.py`. That file was deleted in commit `49d6aeaa4` of 2026-10-05. `measure/doctor.sh` stopped running the supervisor guard in commit `31175a24b` of 2026-11-12. The catalog entry names its guard `tests/orchestrator_marker_vocabulary.sh`.

The pending marker stays a closeout defect per track. The installed closeout role (`~/.config/opencode/agents/measure-closeout.md` line 33) requires "No `[ ]` (space) tasks remain" before closeout.

### 2.3 F421, the architecture boundary step

Step 4 runs `pnpm architecture:check`. The root script (`package.json` line 7) calls `packages/architecture-enforcement/src/architecture-check-cli.ts`.

The PM finding F421 of 2026-11-12 records two failures on master:

- without a flag: "Analyzer input snapshot hash does not match current bytes";
- with `--skip-input-snapshot-pin`: "Analyzer report hashes do not match current byte-identical reports".

The code sites of both messages:

- input snapshot comparison: `packages/architecture-enforcement/src/v2-manifest-validation.ts` lines 1233 to 1242 (sync) and lines 1337 to 1344 (async);
- report hash comparison: `packages/architecture-enforcement/src/v2-manifest-validation.ts` lines 1345 to 1353.

The committed manifest is `packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json`. Its hash fields were last written in commit `de25d49a9` of 2026-11-11 10:45 +0700, "chore(architecture): refresh the v2 manifest pins". The Storytime commit `08c36df04` of 2026-11-11 13:53 +0700 came later. It changed analyzed files: `apps/storytime/app/[locale]/teacher/[level]/[week]/day/lesson-flow.tsx`, `apps/storytime/app/[locale]/teacher/[level]/[week]/week-view.tsx`, and new files under `apps/storytime/__tests__/`. The analyzer input snapshot hashes the bytes of those files. The report hash binds the source path list. Both committed hashes are therefore stale.

The sibling track `architecture_ci_input_pin_20261110` records the same fact (its spec.md lines 27 to 30): "A change to one analyzed file breaks the check until a person refreshes the pin. Commit 221081178 last refreshed the manifest on 2026-09-08. Every later change to an analyzed file makes the pin stale."

The PM decision of 2026-11-10, quoted in `measure/tracks.md` line 81 and in the sibling spec.md line 38:

> architecture: YES to skipping the pin in CI, in backend_architecture_enforcement_20260713, as a small amendment. The pin stays as a local refresh command. A test must prove that an unlisted new analyzed file still fails.

CI runs the check in CI mode (`.github/workflows/ci.yml` line 157): `pnpm architecture:check --skip-input-snapshot-pin`. The refresh command stays local (`package.json` line 8): `pnpm architecture:pin:refresh`.

The debt verdict also keeps the check red on master. The sibling track owns that work: task 1.4 (refresh) is `[~]`, and task 1.4d (debt baseline) is `[ ]`. The PM decision D-11 of 2026-11-11 (sibling spec.md line 220) names 332 additions, 16 removals, and 161 renames to baseline under owner `monorepo-architecture`.

### 2.4 The hashing policy that applies

`AGENTS.md` lines 80 to 93 hold the "Hashing and Provenance Policy". These lines bear on this track:

- AGENTS.md line 82: "Do not introduce, expand, or propagate cryptographic hashing unless an existing specification, protocol, test, or external interface requires it."
- AGENTS.md line 88: "Prefer tests and assertions for correctness."
- AGENTS.md line 89: "Treat existing hash machinery as local legacy behavior, not as a pattern to generalize."
- AGENTS.md line 91: "Minimize manifest churn. Modify only hashes strictly necessary for the requested change."
- AGENTS.md line 93: "Principle: A hash proves content identity, not correctness. Do not use hashing as a substitute for tests, validation, or review. Do not improve auditability, provenance, reproducibility, or integrity unless explicitly asked."

## 3. Decisions

### D-1 The guard is the wrong side, and the plans are right

The plans use `- [ ] ` for tasks that have not started. The canonical vocabulary of the framework gives that marker the meaning pending (section 2.2). The measure skill tells a new plan to write `- [ ] ` for every task and sub-task. The A8 entry protects a supervisor file that no longer exists, and the doctor script stopped calling that guard on 2026-11-12.

So the guard is wrong when it rejects the pending marker across the whole active set. The plans are right.

The PM decision of 2026-11-12 supports the same direction: "The marker check for one track counts as the pass."

### D-2 F411 default: option (a), the guard accepts the pending marker

Two options exist.

- **Option (a): the guard accepts `- [ ] ` for a task that has not started.** The guard then fails only for a task line whose marker is outside the canonical set.
- **Option (b): migrate every `- [ ] ` line.** The track would rewrite 760 lines in 56 plans of other tracks.

The default is option (a). The reasons:

- The canonical vocabulary has no other marker for a not-started task. Option (b) would claim `[~]` (in progress), `[x]` (done), or `[b]` (blocked by an owner) for work that has not started. That is a false claim in plan text, which the catalog forbids as anti-pattern A5.
- The framework writes `- [ ] ` for every task of a new plan. Option (b) would break each future plan at birth and hold this gate red for the next track.
- Option (b) touches plans that other sessions own and edit today, for example `measure/tracks/accounting_drive_intake_20261109/plan.md`. Those edits would collide.
- The pending marker keeps a per-track defect at closeout, where the installed closeout role already catches it (section 2.2). Option (a) leaves that rule intact.

The residual risk of option (a): a task that was started and still shows `- [ ] ` is not flagged during the work. The closeout gate and the evidence gate still catch it.

### D-3 F421 default: the doctor gate records the architecture verdict and does not gate on it

The architecture check compares committed byte hashes with the current working tree. On a moving master that comparison fails after any change to an analyzed file. The AGENTS.md policy says a hash proves content identity, not correctness, and says to treat existing hash machinery as local legacy behavior. The boundary check itself stays a CI gate on every push.

Three options exist.

- **Option (A): doctor.sh keeps the architecture check as a gating step in CI mode.** The doctor gate then stays red on master until the sibling track lands task 1.4 and task 1.4d, and turns red again after the next change to an analyzed file. The gate would train its readers to ignore it.
- **Option (B): doctor.sh refreshes the pins before the check.** That rewrites the five hash fields of the committed manifest on every run. It adds manifest churn, it propagates hash machinery, and the sibling track owns the refresh.
- **Option (C): doctor.sh runs the check in CI mode, captures its exit code, prints the verdict and its owner, and leaves the gate exit code to the three structural guard tests.** The boundary check keeps gating every push in CI.

The default is option (C). The reasons:

- It meets the acceptance criterion on master today, without a product file change and without a manifest change.
- It adds no hash field and it broadens no hash coverage (AGENTS.md line 82).
- It prefers a test and a recorded run over a hash comparison (AGENTS.md line 88).
- It leaves the existing hash machinery alone instead of extending it (AGENTS.md line 89).
- It writes no manifest hash (AGENTS.md line 91).
- It keeps the boundary check enforced on every push, so the check is not lost.

The doctor gate still runs the check. It records the verdict. The gate result no longer depends on that verdict.

### D-4 The owner of the remaining drift stays outside this track

The refresh of the manifest pins and the debt baseline belong to `architecture_ci_input_pin_20261110` (tasks 1.4 and 1.4d). This track names that owner in its record and does not change the manifest, the baselines, or the sibling track.

### D-5 The gate manifest stays a separate track

`measure/evidence_integrity_gates/supervisor_gate.py` line 25 lists `measure/automation-supervisor.py` in `REQUIRED_GATE_FILES`, and that file was deleted in commit `49d6aeaa4`. The PM decision of 2026-11-12 keeps the gate manifest unchanged in a separate track. This track does not edit the gate files. Their bytes stay pinned by `measure/evidence-integrity-accepted-gate.json`.

## 4. Functional requirements

### FR-1 The marker guard accepts the canonical pending marker

`tests/orchestrator_marker_vocabulary.sh` must accept a top-level task line that starts with `- [ ] `. It must fail a top-level task line whose marker is outside the set {` `, `~`, `x`, `b`}. It must keep its `--track <track-id>` scope, its exclusion of archived plans, and its exit code 1 with a message that names the plan and the offending marker.

### FR-2 The catalog entry A8 states the rule that the guard enforces

`measure/anti-patterns.md` must keep the heading of entry A8. Its text must name the marker set that the guard accepts, and its "Guard" line must keep pointing at `tests/orchestrator_marker_vocabulary.sh`. The catalog test `tests/orchestrator_catalog.sh` must still exit 0.

### FR-3 The doctor gate records the architecture verdict

`measure/doctor.sh` must run `pnpm architecture:check --skip-input-snapshot-pin`. It must capture the exit code of that command, print a line that names the step and the exit code, and must keep the doctor gate exit code independent of that exit code. The three structural guard steps must keep gating the exit code.

### FR-4 The gate record names every step

The track must hold a gate record at `measure/tracks/doctor_gate_repair_20261112/doctor-gate-evidence.md`. The record must name each of the four doctor steps, the exit code of each step, the architecture verdict message, and the owner track of the remaining drift.

### FR-5 The registry carries the track

`measure/tracks.md` must carry an entry for this track. The entry must state the status, the due date of 2026-11-14, the owner chain, and the findings F411 and F421.

## 5. Constraints

- No product file change. No file under `apps/`, `packages/`, or `services/` changes. The manifest `packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json` does not change. No pin refresh runs in this track.
- No change to `measure/automation-supervisor.py`, which no longer exists, and no change to any file under `measure/evidence_integrity_gates/`. Their bytes stay pinned by `measure/evidence-integrity-accepted-gate.json`.
- No change to any file under `~/.config/opencode/agents/`. The PM owns those files.
- No change to the plans of other tracks.
- Tests first. A Red task writes a test and shows it fail at the base. A Green task makes the test pass with the least change.
- Every step of the doctor gate needs a test or a recorded run as proof.
- One commit per task. Each header carries `(track_id: doctor_gate_repair_20261112)` and stays at 100 characters or less.
- Stage named paths only. Never run `git add -A` or `git add .`.
- No push, no deploy, no traffic move.

## 6. Acceptance criteria

Each criterion has a falsifiable test. A recorded run proves a criterion that has no test file.

1. **AC-1, the doctor gate exits 0.** Run `bash measure/doctor.sh` on master. The exit code is 0.
2. **AC-2, the guard accepts a pending marker.** Run `bash tests/orchestrator_marker_vocabulary_cases.sh`. The exit code is 0. A fixture plan that holds a top-level `- [ ] ` line passes the guard. A fixture plan that holds a top-level line with a marker outside {` `, `~`, `x`, `b`} fails the guard with exit code 1.
3. **AC-3, the repository sweep passes.** Run `bash tests/orchestrator_marker_vocabulary.sh`. The exit code is 0 and the output holds no "FAIL: deprecated [ ] markers" line.
4. **AC-4, the catalog stays whole.** Run `bash tests/orchestrator_catalog.sh`. The exit code is 0 and the output names entries A1 to A15.
5. **AC-5, the doctor gate holds four steps and one recorded verdict.** Run `bash tests/orchestrator_doctor_gate.sh`. The exit code is 0. The test reads `measure/doctor.sh` and holds that the three structural guard scripts run as gating steps, that the architecture check runs in CI mode with a captured exit code, and that the gate exit code does not depend on the architecture verdict.
6. **AC-6, the gate record is complete.** Run `bash tests/orchestrator_doctor_gate.sh`. The exit code is 0 and the gate record holds one line per doctor step with its exit code, the architecture verdict message, and the owner track `architecture_ci_input_pin_20261110`.
7. **AC-7, no product file changed.** Run `git diff --name-only <base>..HEAD`. The list holds no path under `apps/`, `packages/`, or `services/`.
8. **AC-8, the registry carries the track.** Read `measure/tracks.md`. The entry for `doctor_gate_repair_20261112` names the due date of 2026-11-14 and the findings F411 and F421.

## 7. Out of scope

- The gate manifest. `measure/evidence_integrity_gates/supervisor_gate.py` line 25 lists `measure/automation-supervisor.py` in `REQUIRED_GATE_FILES`, and that file no longer exists. The PM decision of 2026-11-12 keeps the gate manifest unchanged in a separate track.
- The pin refresh and the debt baseline. They belong to `architecture_ci_input_pin_20261110` (tasks 1.4 and 1.4d).
- The marker vocabulary of the evidence integrity gate. `measure/evidence_integrity_gates/contracts.py` line 652 keeps its own marker rule, and the gate files stay pinned.
- The installed role files under `~/.config/opencode/agents/`. The PM owns them.
- The plans of other tracks. This track changes no plan outside its own folder.
- Any product file under `apps/`, `packages/`, or `services/`.

## 8. Open questions

Each item has a default. The track proceeds with the default unless the PM says otherwise.

- **OQ-1, the doctor gate and the architecture verdict.** The default of D-3 option (C) is that the doctor gate records the architecture verdict and does not gate on it. The alternative is option (A), which keeps the verdict as a gating step and needs the sibling track to land tasks 1.4 and 1.4d first.
- **OQ-2, the catalog entry A8.** The default of D-1 and FR-2 is to reword entry A8 so that it states the marker set that the guard accepts, and to keep its heading and its guard line. The alternative is to leave A8 as it is, which makes the catalog and the guard disagree.
