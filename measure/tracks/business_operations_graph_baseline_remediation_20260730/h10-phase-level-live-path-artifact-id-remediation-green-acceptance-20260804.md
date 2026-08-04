# H10 Phase-Level Live-Path Artifact-Id Remediation Green Acceptance

## Scope

This receipt accepts only the live-path raw-artifact staging fix in the
command-less phase-level publisher: `_publish_phase_level_failure_attempt`
must build `phaseLevelFailure.rawArtifacts` from the staged commands that
carry the established non-empty string command `id` only, so staging and
validation agree on the LIVE path where the executor's staged-command list
also contains id-less host-side evidence (`supplements-*`, `podman-version`,
`podman-image-inspect`, `network-*`). It closes the live finding in
`/tmp/opencode/r1v3-attempt-20260804-d.log` where the H8 phase-level
preservation seam itself failed after a trace-parse failure:
`_publish_phase_level_failure_attempt` published a carrier whose
`rawArtifacts` included id-less finalized commands and
`_validate_phase_level_failure_v1` rejected the record at the artifact-id
check, surfacing `V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: direct-runtime-trace:
V3_PODMAN_ATTEMPT_FAILURE` with the trace receipt dropped again. It does not
accept any candidate rerun, any trace-parser/validator or tracer change, any
validation weakening, any second id convention, any happy-path, pre-seal,
hermetic, workspace, or candidate carrier change, or any Podman action.

Acceptance authority is in-loop single-authority per `AGENTS.md` "Implement
high-risk work in-loop (… Measure acceptance …)". All gate runs below were
executed directly in this loop against the real runner and the real test
file.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Green runner SHA-256 | `ded40b2cb16d887b36cbd350a7ad8dbd7169790f749cc191fb8bd901201c3688` |
| Frozen test SHA-256 | `b0328f72c52704953c9492282db196e13c639452c99b5267a148295c9faebf01` |
| Pre-Red runner SHA-256 (H7 Green, baseline) | `198f26102d2c94aefd8dc3cb41d8dcb89741ac04b9c1a4d2227ec5466ef90166` |
| Frozen artifact-id guard block SHA-256 (pre-Green runner lines 4812-4818, 251 bytes) | `0d1503b9609718bd3ec40834acffe653adb7265a592d48064b3d80edbf1ebc73` |
| Reconstructed pre-Green runner | `198f26102d2c94aefd8dc3cb41d8dcb89741ac04b9c1a4d2227ec5466ef90166` (byte-for-byte) |
| New H10 tests, Red run | 2 failed in `9.40s`, each at `V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: direct-runtime-trace: V3_PODMAN_ATTEMPT_FAILURE` (the artifact-id check) |
| New H10 tests, Green run | 2 passed in `5.09s` |
| Focused 23-test suite, Green run | 23 passed in `26.00s` (the 21-test H1-H8/H7 selection + the two H10 tests) |
| Pre-fix focused 21-test suite, Green run | 21 passed in `37.32s` (unchanged baseline receipt, no H10 regression) |
| Runner delta vs reconstructed pre-Green | 1 hunk, `+1/-0` (one added filter line in `_publish_phase_level_failure_attempt`) |
| Test delta vs pre-Red | Pure addition: one fixture helper + two test methods (+90 lines, +91 in the diff), no existing line changed |

The frozen test SHA-256 equals the Post-Red hash recorded in
`h10-phase-level-live-path-artifact-id-remediation-pre-green-baseline-20260804.md`,
so the test surface is unchanged since the Red slice. The reconstructed
pre-Green runner equals the pre-Red runner SHA-256 pinned in that baseline
byte-for-byte, so the Green slice's pre-state is exact and its delta is
attributable.

## Defect fixed

In the live attempt, `capture_trace` raised
`V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED` after the
`direct-runtime-trace` container command had succeeded (exit 0), and the H8
phase-level preservation seam then failed to publish anything:
`_publish_phase_level_failure_attempt` finalized **every** staged command
into `phaseLevelFailure.rawArtifacts`, including the id-less host-side
evidence commands staged before the container command receipts
(`supplements-pre-git-status`, `supplements-pre-staged-diff`,
`podman-version`, `podman-image-inspect`, `network-route`, `network-dns`,
`network-tcp`). `_validate_phase_level_failure_v1` requires every raw artifact
to carry the established non-empty string command `id`, so the record was
rejected with `V3_PODMAN_ATTEMPT_FAILURE` and `preserve_failure` surfaced
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: direct-runtime-trace:
V3_PODMAN_ATTEMPT_FAILURE`. The H8 tests stayed Green because their synthetic
`_staged_commands` contained only the one id-carrying trace command; the live
staging construction disagreed with the validator only when real host-side
evidence was present.

## Green delta

The H10 runner delta is exactly one hunk, `+1/-0`, inside
`_publish_phase_level_failure_attempt`: the `rawArtifacts` list comprehension
now finalizes only the staged commands that carry the established non-empty
string command `id`:

```python
            finalized_commands = [
                _finalize_command(
                    command,
                    directory,
                    reference_root=TRACK_DIR / attempt_name,
                )
                for command in commands
                if isinstance(command.get("id"), str) and command.get("id")
            ]
```

The id-less host-side evidence commands are not command receipts; they have no
command-id identity in any published attempt (they are name-keyed supplemental
evidence: gitStatus/stagedDiff/route/dns/tcp/versionCommand/inspectCommand).
The `rawArtifacts` list keeps the command-receipt convention — every entry is
an id-carrying finalized command — so the artifact-id validation rule stays
byte-unchanged and no second id convention is introduced. On the live path the
critical evidence (the id-carrying `direct-runtime-trace` receipt) is still
materialized and hash-bound; on the H8 path behavior is identical (its single
staged command carries an id).

The trace parser/validator rules, the tracer wrapper, the happy path, the H6
cap line, the pre-seal fail-closed guard, and all pre-seal/candidate/hermetic/
workspace carriers are byte-unchanged.

## Anchored reconstruction proof

- Reversing only the H10 runner edit (removing the one added filter line)
  reconstructs the complete pre-Green runner at
  `198f26102d2c94aefd8dc3cb41d8dcb89741ac04b9c1a4d2227ec5466ef90166`
  byte-for-byte (verified; the pre-Green runner is exactly the pinned pre-Red
  runner). The Green runner diff against that reconstruction is exactly
  1 hunk, `+1/-0`.
- The frozen artifact-id guard block (pre-Green runner lines 4812-4818,
  251 bytes) occurs exactly once in both runners and is byte-identical,
  proving the validation rule was not weakened.
- The frozen test SHA-256 (`b0328f72…`) is byte-identical since the Red slice
  (pure addition of one fixture helper and two test methods, +91 lines).

## Focused suite definition

All twenty-three names are in
`measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests`.
The first twenty-one are the unchanged H1-H6/H7/H8 selection
(`preseal`/`production_materialize`/`candidate_failure_evidence`/
`trace_event_cap`/`trace_capture_failure_evidence`/`directory_enumeration`/
`unknown_trace_event_kind`); the two new H10 names are:

1. `test_phase_level_failure_publishes_live_shaped_mixed_staged_commands`
2. `test_phase_level_failure_never_blocks_on_unidentified_staged_evidence`

No Podman or pnpm command was run; the suite exercises only the no-Podman
runner/test surfaces.

## Observed behavior

Both new tests build the H8 real trace-parse failure (a sealed integration
through the real builder, an in-container trace receipt containing an invalid
`UNDECLARED` event kind, the real parser raising
`V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_TRACE_EVENT_INVALID`) and then extend
the executor's staged-command list to the live shape: the id-less
host-side supplement command first (mirroring the exact `_stage_command`
shape — argv/cwd/env/envAbsent/network/exitCode/`_rawId`/`_stdoutPath`/
`_stderrPath`/`_stdoutText`/`_stderrText`, no `id` key, real raw stream
files) followed by the id-carrying `direct-runtime-trace` command.
`preserve_failure` then:

- `test_phase_level_failure_publishes_live_shaped_mixed_staged_commands`:
  publishes exactly one attempt directory whose `phaseLevelFailure.rawArtifacts`
  contains only the id-carrying `direct-runtime-trace` artifact; the
  supplement's streams are not copied under `raw/` (the directory holds
  exactly `receipt-direct-runtime-trace.stdout.txt` and
  `receipt-direct-runtime-trace.stderr.txt`); the published record validates
  with the real `validate_failed_execution_attempt_v1`.
- `test_phase_level_failure_never_blocks_on_unidentified_staged_evidence`:
  never raises `CandidateExecutionBlocked` /
  `V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED` on this path and publishes exactly
  one attempt directory.

The pre-fix Red run reproduced the live failure exactly — both tests failed at
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: direct-runtime-trace:
V3_PODMAN_ATTEMPT_FAILURE`, i.e. the artifact-id check in
`_validate_phase_level_failure_v1` (line 4818).

## Full-file verification

The entire 68-test module was run once against the Green runner: **58 passed,
9 failed, 1 skipped** in 392.77s (0:06:32). To prove the nine failures are
pre-existing and not attributable to this slice, the identical full module was
also run once against the byte-reconstructed pre-Green runner
(`198f2610...`): **56 passed, 11 failed, 1 skipped** in 411.85s (0:06:51). The
failure sets differ by exactly the two new H10 tests — they fail pre-fix and
pass post-fix — and the other nine failures are byte-identical in both runs:

1. `test_direct_command_runtime_attempt_preserves_missing_script_blocker` —
   documented F2: the live generator worktree hash differs from the frozen
   baseline blob hash, a permanent failure on every version bump (plan line 591).
2. `test_direct_runtime_tracer_requires_exact_generator_child_inheritance` —
   H2-era source assertion drift (`[CONTAINER_NODE, logical[1]]` vs
   `[CONTAINER_NODE, script["resolvedPath"]]`); `generate` is byte-identical
   pre/post H10 (proven by the reconstruction).
3. `test_noninstall_pnpm_executor_validator_rejects_payload_environment_and_executor_drift` —
   documented F4: `V3_PNPM_NONINSTALL_EXECUTOR_INVALID` (plan line 592).
4. `test_production_executor_generation_uses_sealed_direct_node_payload_only` —
   H2-era generation-context drift
   (`V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_PRODUCTION_GENERATION_CONTEXT_UNBOUND`);
   `generate` and the executor constructor are byte-identical pre/post H10.
5. `test_profile_rebuilds_exports_and_receipt_replays_exact_isolated_commands`
6. `test_v3_manifest_and_ledger_bind_the_addendum_and_mechanical_omissions`
7. `test_v3_podman_network_boundary_is_route_proven_for_all_execution`
8. `test_v3_regenerates_graph_audit_and_compensation_from_the_fresh_closure`
9. `test_v3_sol_materialization_gates_bind_only_a_candidate`

Tests 5-9 all abort in `_load_v3` at
`V3_EXECUTION_CLOSURE_MANIFEST_MISSING: r1-v3-execution-closure-20260801/execution-closure.manifest.json`
— the frozen V3 candidate directory is absent from this working tree, so every
test that validates the candidate artifacts fails regardless of the runner.
None of the nine involves the H10 seam; the comparison run is the proof.

## Authorship

The Red test methods, the fixture, the live-shaped staged-command
construction, the Green delta, the anchored reconstruction, and every gate run
were performed in-loop for this slice against the real runner and the real
test file.

## Decision and exclusions

**ACCEPT** -- bounded only to the live-path raw-artifact staging fix in
`_publish_phase_level_failure_attempt` at Green runner SHA-256
`ded40b2cb16d887b36cbd350a7ad8dbd7169790f749cc191fb8bd901201c3688` and frozen
test SHA-256 `b0328f72c52704953c9492282db196e13c639452c99b5267a148295c9faebf01`.

Excluded: no candidate rerun or closure attempt; no trace-policy semantic
change (truncation/duplicates policies, tracer ordinal guard, trace-event
parser, and validator rules remain byte-unchanged and owned by H7/H9); no
tracer wrapper change; no happy-path or H6 cap-line change; no pre-seal
fail-closed guard change; no pre-seal/candidate/hermetic/workspace carrier or
publisher change; no marker change (Phase R1 v3 remains `[~]`); no successor,
registry, V2/history, Finance, or Podman action. A confirming closure attempt
is still required before any candidate claim. The runner and test work remains
uncommitted shared R1-v3 work.
