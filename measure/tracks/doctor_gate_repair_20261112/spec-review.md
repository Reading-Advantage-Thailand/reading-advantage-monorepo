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
