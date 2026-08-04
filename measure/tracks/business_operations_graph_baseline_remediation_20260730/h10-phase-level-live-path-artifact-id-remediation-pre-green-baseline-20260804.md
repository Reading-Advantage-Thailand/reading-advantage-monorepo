# H10 Phase-Level Live-Path Artifact-Id Remediation Pre-Green Baseline

This artifact freezes the only production seam authorized for the next Green
slice. It is a Red baseline, not acceptance evidence.

- Captured date: 2026-08-04
- Runner path: measure/business_operations_graph_baseline_execution_closure_v3_podman.py
- Pre-Red runner SHA-256: 198f26102d2c94aefd8dc3cb41d8dcb89741ac04b9c1a4d2227ec5466ef90166
- Test path: measure/tests/test_business_operations_graph_baseline_execution_closure.py
- Pre-Red full test SHA-256: 93cc1b791850fb131ce649a4644a2edd909d202c189232cc1b3e37aefae897bd
- Post-Red full test SHA-256: b0328f72c52704953c9492282db196e13c639452c99b5267a148295c9faebf01
- Authorized Green surface: `_publish_phase_level_failure_attempt` only — the
  staging of the `phaseLevelFailure.rawArtifacts` list in the command-less
  phase-level publisher. Every other runner line remains byte-unchanged.
- Frozen: the artifact-id validation rule in
  `_validate_phase_level_failure_v1` (pre-Green runner lines 4812-4818, the
  251-byte raw-artifact identity guard at SHA-256
  `0d1503b9609718bd3ec40834acffe653adb7265a592d48064b3d80edbf1ebc73`), the
  trace parser and validator rules, the tracer wrapper, the happy path, the
  H6 cap line, the pre-seal fail-closed guard, all pre-seal/candidate/
  hermetic/workspace carriers, and every previously accepted test.

## Defect this Red demonstrates

The live confirming attempt (log `/tmp/opencode/r1v3-attempt-20260804-d.log`)
failed twice: first `capture_trace` raised
`V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED` after the
`direct-runtime-trace` container command had already succeeded (exit 0), then
the H8 phase-level preservation seam itself failed on the live path:

    `_publish_failed_attempt` (line 7095)
    -> `_publish_phase_level_failure_attempt` (line 7443)
    -> `validate_failed_execution_attempt_v1` (line 4984)
    -> `_validate_phase_level_failure_v1` (line 4818)
    -> V3_PODMAN_ATTEMPT_FAILURE

so `preserve_failure` surfaced
`CandidateExecutionBlocked: V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED:
direct-runtime-trace: V3_PODMAN_ATTEMPT_FAILURE` and the trace receipt was
silently dropped again.

### Exact mismatch

`_publish_phase_level_failure_attempt` finalizes **every** staged command into
`phaseLevelFailure.rawArtifacts`. On the live path
`DirectCommandRuntimeProductionExecutorV1` stages the host-side evidence
commands before the container command receipts, and those host-side commands
carry no `id` key:

- `_host_git_capture` -> `_stage_command`: `supplements-pre-git-status`,
  `supplements-pre-staged-diff` (no `id`)
- `_podman_host_evidence` -> `_stage_command`: `podman-version`,
  `podman-image-inspect` (no `id`)
- `_network_proof` -> `_run_container`: `network-route`, `network-dns`,
  `network-tcp` (no `id`)

Only the `_run`/`_inventory_mount`-staged commands receive the established
command `id` (`materialize`, `inventory-<mount>-pre`,
`direct-runtime-trace`, ...), matching the convention that every published
command receipt in an attempt carries a non-empty string `id`.

`_validate_phase_level_failure_v1` (line 4812-4818) requires every raw
artifact to carry that non-empty string `id`:

    for artifact in record["rawArtifacts"]:
        if (
            not isinstance(artifact, dict)
            or not isinstance(artifact.get("id"), str)
            or not artifact.get("id")
        ):
            _fail("V3_PODMAN_ATTEMPT_FAILURE")

So the live staging produced `None` ids and the validator rejected the record:
staging and validation disagreed on the LIVE path while agreeing on the H8
synthetic fixture, whose `_staged_commands` contained only one id-carrying
trace command. The host-side commands are not command receipts; they are
name-keyed supplemental evidence (gitStatus/stagedDiff/route/dns/tcp/
versionCommand/inspectCommand) and have no command-id identity to publish.

## Red receipt

Command:

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -q -k "phase_level_failure_publishes_live_shaped_mixed_staged_commands or phase_level_failure_never_blocks_on_unidentified_staged_evidence"

which selects exactly

- `R1V3ExecutionClosureRedTests.test_phase_level_failure_publishes_live_shaped_mixed_staged_commands`
- `R1V3ExecutionClosureRedTests.test_phase_level_failure_never_blocks_on_unidentified_staged_evidence`

Observed result: both failed in 9.40s against the byte-reconstructed pre-Green
runner (`198f2610...`), each at the live artifact-id check:

    CandidateExecutionBlocked: V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED:
    direct-runtime-trace: V3_PODMAN_ATTEMPT_FAILURE

The Red demonstrates that the phase-level publisher cannot publish a
live-shaped staged-command set whose raw artifacts include id-less host-side
evidence.

Focused-suite green baseline receipt (pre-fix, the shared no-Podman
`preseal`/`production_materialize`/`candidate_failure_evidence`/
`trace_event_cap`/`trace_capture_failure_evidence`/`directory_enumeration`/
`unknown_trace_event_kind` selection):

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -k "preseal or production_materialize or candidate_failure_evidence or trace_event_cap or trace_capture_failure_evidence or directory_enumeration or unknown_trace_event_kind" -q
    21 passed, 47 deselected in 37.32s

## Authorized Green surface (bounded)

- `_publish_phase_level_failure_attempt`: build `rawArtifacts` from the staged
  commands that carry the established non-empty string `id` only. The artifact
  list keeps the command-receipt convention (each entry is an id-carrying
  finalized command); id-less host-side evidence commands are excluded because
  they have no command-id identity in any published attempt. The validation
  rule stays byte-unchanged — it is not weakened to accept id-less shapes, and
  no second id convention is invented.

The trace parser/validator rules, the tracer wrapper, the happy path, the H6
cap line, the pre-seal fail-closed guard, and all pre-seal/candidate/hermetic/
workspace carriers are frozen.

## Authorship

The test methods, the fixture, and the Red run were performed in-loop for this
slice against the real runner and the real test file.
