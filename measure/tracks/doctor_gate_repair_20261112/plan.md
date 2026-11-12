# Implementation Plan: Doctor gate repair

> **Track ID:** `doctor_gate_repair_20261112` · **Spec:** [spec.md](./spec.md)
> **Due:** 2026-11-14 (PM order). No deploy. No product file change.

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done, and `[b] … deferred:<owner>` at a human gate. An `[x]` note names the commit and the evidence class: automated, person-checked, or owner-passed.
- Tests first. The Red task writes the test and shows it fail at the base. The Green task makes the test pass with the least change.
- Red runs on a model family other than the Green family. The orchestrator sets the models.
- Stage named paths only. Never run `git add -A`, `git add .`, or `git add -u`. Commit with a pathspec: `git commit -m <msg> -- <paths>`.
- No push, no deploy, no amend, no `--no-verify`, no `git reset`, `checkout`, `restore`, `revert`, or `stash`, and no `git worktree add`.
- Allowed write paths: `tests/orchestrator_marker_vocabulary.sh`, `tests/orchestrator_marker_vocabulary_cases.sh`, `tests/orchestrator_doctor_gate.sh`, `measure/doctor.sh`, `measure/anti-patterns.md`, this track folder, and `measure/tracks.md`.
- No product file changes. No path under `apps/`, `packages/`, or `services/`. The manifest `packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json` does not change. No pin refresh runs.
- No new hash, checksum, or manifest (`AGENTS.md`, Hashing and Provenance Policy).
- No change to any file under `measure/evidence_integrity_gates/` and no change to any file under `~/.config/opencode/agents/`.
- The doctor gate reads and runs; it does not write a hash and it does not refresh a pin.
- Commit headers are 100 characters or less and use a lower-case subject. Each header carries `(track_id: doctor_gate_repair_20261112)`.
- The full doctor run goes through the heavy-run prefix, in the foreground: `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && bash measure/doctor.sh'`. The three shell guards run as plain commands.

## Phase 1: F411, the marker guard accepts the pending marker

Blast radius: `tests/orchestrator_marker_vocabulary.sh` (the predicate at line 55, the comment at lines 32 to 39, and the two messages), entry A8 of `measure/anti-patterns.md`, and step 2 of `measure/doctor.sh`. The catalog test reads the A8 Guard line. No product symbol changes.

- [ ] 1.1 Red: the marker guard cases. Create `tests/orchestrator_marker_vocabulary_cases.sh`. The test copies the guard into a temporary root and writes fixture plans there. No fixture enters `measure/tracks/`. The cases:
  - A fixture plan with a top-level `- [ ] 1.1 task` line passes with exit 0. This case fails at the base.
  - A fixture plan with a top-level `- [?] 1.1 task` line fails with exit 1, and the message names the plan and the marker.
  - A fixture plan with `- [~]`, `- [x]`, and `- [b]` lines passes with exit 0.
  - `--track <id>` reads that one track only and passes when that track is clean.
  - A fixture plan under `measure/archive/<id>/` passes, so the archive exclusion holds.
  - Check: `bash tests/orchestrator_marker_vocabulary_cases.sh`. Expect exit 1 at the base, with case 1 as the failing case. Red is not a syntax or a copy error.
  - Commit: `test(measure): pin the marker guard cases (track_id: doctor_gate_repair_20261112)`, with the test file only.
- [ ] 1.2 Green: the guard predicate. In `tests/orchestrator_marker_vocabulary.sh`, change the line-55 predicate to `grep -nE '^- \[[^ ~xb]\] ' "$plan"`. The guard then fails only a marker outside the set {` `, `~`, `x`, `b`}. Rewrite the comment at lines 32 to 39 to state that set and the archive exclusion. Keep the `--track <track-id>` scope. Keep exit code 1 and the message that names the plan and the marker. Update the PASS message to name the accepted set.
  - Check: `bash tests/orchestrator_marker_vocabulary_cases.sh` exits 0.
  - Check: `bash tests/orchestrator_marker_vocabulary.sh` exits 0. Record `plans_checked=92` and `fail_lines=0`.
  - Check: `bash tests/orchestrator_marker_vocabulary.sh --track doctor_gate_repair_20261112` exits 0. The PM decision of 2026-11-12 counts this single-track check as the pass.
  - Commit: `fix(measure): accept the pending marker in the guard (track_id: doctor_gate_repair_20261112)`.
- [ ] 1.3 Green: catalog entry A8. Reword entry A8 in `measure/anti-patterns.md` so its text names the accepted marker set and the pending marker. Keep the heading `## A8 — …`. Keep the `**Guard:**` line that points at `tests/orchestrator_marker_vocabulary.sh`, because the catalog test scans that line for a live file.
  - Check: `bash tests/orchestrator_catalog.sh` exits 0, with the line `PASS: measure anti-pattern catalog exists with A1-A15`.
  - Check: `bash tests/orchestrator_marker_vocabulary.sh --track doctor_gate_repair_20261112` exits 0.
  - Commit: `docs(measure): state the marker set in catalog A8 (track_id: doctor_gate_repair_20261112)`.
- [ ] 1.4 Phase check at one HEAD. Run `bash tests/orchestrator_catalog.sh`, `bash tests/orchestrator_marker_vocabulary.sh`, and `bash tests/orchestrator_marker_vocabulary_cases.sh`. Record each exit code. Run `git diff --name-only <phase_base_sha>..HEAD`. The list holds only `tests/orchestrator_marker_vocabulary.sh`, `tests/orchestrator_marker_vocabulary_cases.sh`, and `measure/anti-patterns.md`. Record the result as automated.

## Phase 2: F421, the gate records the architecture verdict

Blast radius: `measure/doctor.sh` and the new files `tests/orchestrator_doctor_gate.sh` and `doctor-gate-evidence.md`. Step 4 keeps the boundary check. The gate exit code no longer depends on it.

- [ ] 2.1 Red: the doctor gate shape. Create `tests/orchestrator_doctor_gate.sh`. The test reads `measure/doctor.sh` as text and holds these facts:
  - The three structural guard scripts run as bare gating steps.
  - The architecture step runs `pnpm architecture:check --skip-input-snapshot-pin`.
  - The architecture exit code goes into a variable, and the script does not exit on that code.
  - The script prints a line with the step name and the architecture exit code.
  - The gate record `measure/tracks/doctor_gate_repair_20261112/doctor-gate-evidence.md` holds one line for each of the four steps, with its exit code, the verdict message, and the owner track `architecture_ci_input_pin_20261110`.
  - Check: `bash tests/orchestrator_doctor_gate.sh`. Expect exit 1 at the base, on the missing capture and the missing record. Red is not a syntax error.
  - Commit: `test(measure): pin the doctor gate shape (track_id: doctor_gate_repair_20261112)`, with the test file only.
- [ ] 2.2 Green: `measure/doctor.sh`. Keep `set -euo pipefail` and the three guard steps. Run the architecture step inside a capture block: `set +e`, `pnpm architecture:check --skip-input-snapshot-pin`, `architecture_status=$?`, `set -e`. Print `ARCHITECTURE: step 4 exits <code>; the owner of the remaining drift is architecture_ci_input_pin_20261110`. Print `DOCTOR: the three structural guard steps gate this exit code`. Exit 0 when the three guard steps pass.
  - Check: `bash tests/orchestrator_doctor_gate.sh` exits 0.
  - Check: the full doctor run through the heavy-run prefix. Record the exit code of each of the four steps and the architecture verdict line.
  - Commit: `fix(measure): record the architecture verdict in doctor (track_id: doctor_gate_repair_20261112)`.
- [ ] 2.3 Green: the gate record. Write `measure/tracks/doctor_gate_repair_20261112/doctor-gate-evidence.md`. It holds one line for each step: the step name, the command, the exit code, and the date. It holds the architecture verdict message and the owner track `architecture_ci_input_pin_20261110`. It states that task 1.4 and task 1.4d of that track own the pin refresh and the debt baseline.
  - Check: `bash tests/orchestrator_doctor_gate.sh` exits 0 and reports the four step lines and the owner track.
  - Commit: `docs(measure): record the doctor gate evidence (track_id: doctor_gate_repair_20261112)`.
- [ ] 2.4 Phase check at one HEAD. Run `bash tests/orchestrator_doctor_gate.sh` and the full doctor run through the heavy-run prefix at one HEAD. Record each exit code. Run `git diff --name-only <phase_base_sha>..HEAD`. The list holds only `measure/doctor.sh`, `tests/orchestrator_doctor_gate.sh`, and the track record. Record the result as automated.

## Phase 3: The gate is green on master

Blast radius: the registry entry in `measure/tracks.md` and the track record. No code path changes.

- [ ] 3.1 Green: the registry entry. Read `measure/tracks.md`. The entry for `doctor_gate_repair_20261112` names the status, the due date of 2026-11-14, the owner chain, finding F411, and finding F421. Correct the entry in place when a field is absent.
  - Check: `grep -n 'doctor_gate_repair_20261112' measure/tracks.md` shows the link line and the status line. `bash tests/orchestrator_catalog.sh` exits 0.
  - Commit: `docs(measure): state the doctor gate track status (track_id: doctor_gate_repair_20261112)`.
- [ ] 3.2 Reviews. Run Review A (correctness) on the diff. Run Review B (security): the gate must not hide a real failure, and the guard must not accept a marker that hides work. Review C records "not applicable", because no route and no UI change. Record the review result files in the track folder.
  - Check: each review result file names a verdict and its findings.
- [ ] 3.3 Phase acceptance at an immutable HEAD. Record `git rev-parse HEAD` and the review verdicts. No Critical or High finding stays open.
- [ ] 3.4 Final task: the doctor gate exits 0 on master. Run the full doctor command through the heavy-run prefix at one HEAD:
  `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && bash measure/doctor.sh'`
  - Check: the exit code is 0. The output holds the step 1 PASS line, no `FAIL: deprecated [ ] markers` line, the step 3 PASS line, the architecture verdict line, and the `DOCTOR:` line. Record `git rev-parse HEAD`, the four step exit codes, and the architecture verdict message in `doctor-gate-evidence.md`.
  - Evidence class: automated.

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

## Out of scope

- The pin refresh and the debt baseline. They belong to `architecture_ci_input_pin_20261110` (tasks 1.4 and 1.4d).
- The gate manifest and its `REQUIRED_GATE_FILES` list. The PM decision of 2026-11-12 keeps them in a separate track.
- The marker rule of `measure/evidence_integrity_gates/contracts.py`. The gate files stay pinned.
- The plans of other tracks. This track changes no plan outside its own folder.
- Any product file under `apps/`, `packages/`, or `services/`.
