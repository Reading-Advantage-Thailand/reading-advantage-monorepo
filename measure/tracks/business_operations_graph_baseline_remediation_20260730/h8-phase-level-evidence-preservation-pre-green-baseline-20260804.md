# H8 Phase-Level Evidence Preservation Pre-Green Baseline

This artifact freezes the only production seam authorized for the next Green
slice. It is a Red baseline, not acceptance evidence.

- Captured date: 2026-08-04
- Runner path: measure/business_operations_graph_baseline_execution_closure_v3_podman.py
- Pre-Red runner SHA-256: cf8f7b9ab980568dfd40bc7ee17f111580d6de4c757e96b695e172bab859af4a
- Test path: measure/tests/test_business_operations_graph_baseline_execution_closure.py
- Pre-Red full test SHA-256: 0de7865de04d1b828ceb356b96a0449f3ac148db68a630c65f6ad77bccf34a66
- Post-Red full test SHA-256: 0653f19618c820ebdd03063e736db6d4be82fc0b90a1f8898a966153dbfdd025
- Authorized Green surface: only the failed-command guard inside
  `_publish_failed_attempt` (runner line 6921-6923), a new dedicated
  command-less phase-level publisher, a new closed `phaseLevelFailure`
  carrier with builder/validator, and the failed-attempt validator's schema
  branch that accepts that carrier. The trace-event parser
  `parse_direct_command_runtime_trace_events_v1`, the in-container tracer,
  the trace policy, the read-set contract validators, the discovery walk,
  the runner scripts, the generator script, the happy path, the frozen
  pre-seal/candidate carriers and publishers, and every other runner line
  remain byte-unchanged.
- Frozen: the pre-seal path, the command-level `_publish_failed_attempt`
  path, the candidate-publication carrier/publisher/validator, all H3/H5/H6
  evidence behavior, and every previously accepted test.

## Defect this Red demonstrates

Live observed failure (log `/tmp/opencode/r1v3-attempt-20260804-c.log`,
stage `direct-runtime-trace`):

1. `capture_trace` (runner line 8098) called the trace parser
   `parse_direct_command_runtime_trace_events_v1` (runner line 3114), which
   raised `V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_TRACE_EVENT_INVALID` — a
   blocking failure **after** the `direct-runtime-trace` container command
   itself had already succeeded (exit code 0) and staged its raw trace
   receipt.
2. `preserve_failure` routed the failure to `_publish_failed_attempt`
   (runner line 6923), whose guard requires the failed command to have a
   genuine nonzero exit code:
   `V3_PODMAN_ATTEMPT_FAILED_COMMAND_MISSING: direct-runtime-trace`.
3. `preserve_failure` therefore raised
   `CandidateExecutionBlocked: V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED` and
   **no attempt directory was published at all**.

Net: a blocked attempt published no preserved evidence, violating the
fail-closed evidence invariant hardened in H1-H5 that every blocked attempt
must publish preserved evidence. The raw trace receipt (the direct-runtime
trace command's stdout) was collectible and was silently dropped.

Accepted contract: when the blocking failure occurs during trace
capture/parse — or any phase before a failed-command record exists — failure
evidence must still publish the attempt directory and `failed-attempt.json`
with stage, classification, reason, error detail, and any raw artifacts
collected so far. A phase-level failure record with no failed command is a
valid preserved shape, and `V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED` must
become unreachable for this seam.

## Exact UTF-8 snapshot

The following code block is the exact UTF-8 byte sequence from pre-Green
runner lines 6921-6923, including one terminal LF. Its SHA-256 is
`0581eb941cb7f96ef000ae1a2b0a88d857944eca6d2c00436479e1cc0557a80a` and it is
303 bytes.

```python
    failed = next((command for command in reversed(commands) if command.get("id") == reason), None)
    if failed is None or not isinstance(failed.get("exitCode"), int) or isinstance(failed["exitCode"], bool) or failed["exitCode"] == 0:
        _fail("V3_PODMAN_ATTEMPT_FAILED_COMMAND_MISSING", reason)
```

The permitted Green change is to replace the single `_fail(...)` line with a
bounded phase-level delegation: when no failed-command record exists (the
stage's command is missing or exited 0, i.e. the failure happened after the
command in stage processing), preserve the attempt through a new dedicated
publisher instead of failing. The `failed = ...` line and the
`failed is None or ... exitCode == 0` condition must remain byte-unchanged.
Pre-seal failures (which carry a `directRuntimePreSealAttempt` carrier bound
to one failed command) keep the fail-closed `V3_PODMAN_ATTEMPT_FAILED_COMMAND_MISSING`
guard: the pre-seal carrier cannot describe a command-less failure, so that
state remains a genuinely non-publishable shape.

## Green surface

The new command-less phase-level record (mirroring the closed
`candidatePublicationFailure` carrier pattern) must contain:

- `failure` with exactly `stage`, `reason`, `classification`, where
  `classification == "PHASE_LEVEL_FAILURE"` and `reason` is the full error
  text (e.g. `V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_TRACE_EVENT_INVALID`).
- `commands: []` — no failed command exists.
- a `phaseLevelFailure` carrier with `schemaVersion: 1`,
  `kind: execution-closure-phase-level-failure`, the same `stage`/`reason`/
  `classification`, an `errorDetail` string, and a `rawArtifacts` list of
  every finalized staged command record collected so far (hash-bound
  stdout/stderr references under the attempt's `raw/` directory).
- `directRuntimeIntegration` forwarded exactly like the existing
  command-level post-seal path when a sealed integration exists (the live
  trace failure forwards `reachedStage: generate-standard-pack-catalog`).

`validate_failed_execution_attempt_v1` must accept exactly this shape and
reject any mutation: wrong stage/reason/classification, extra or missing
carrier keys, a non-empty `commands` list, a pre-seal or candidate carrier in
the same record, and unbounded raw-artifact references all fail closed. The
trace-event parser's validation rules are untouched (H7 owns the readdir
event-kind design separately).

## Red receipt

Command:

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -q -k trace_capture_failure_evidence

which selects exactly

- `R1V3ExecutionClosureRedTests.test_trace_capture_failure_evidence_publishes_attempt_without_failed_command`
- `R1V3ExecutionClosureRedTests.test_trace_capture_failure_evidence_never_raises_failure_evidence_unpreserved`

Observed result: both tests failed in 12.40s at the real seam, each with the
exact live failure chain recorded in `/tmp/opencode/r1v3-attempt-20260804-c.log`:

    ExecutionClosureValidationError: V3_PODMAN_ATTEMPT_FAILED_COMMAND_MISSING: direct-runtime-trace
    CandidateExecutionBlocked: V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: direct-runtime-trace: V3_PODMAN_ATTEMPT_FAILED_COMMAND_MISSING: direct-runtime-trace

Before reaching the guard, the fixture proved one real trace-parse failure:
a sealed integration built through the real builder, an in-container trace
receipt with an invalid `UNDECLARED` event kind normalized by the real
`capture_direct_command_runtime_in_container_trace_v1`, and the real parser
raising `V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_TRACE_EVENT_INVALID`. The
`direct-runtime-trace` staged command recorded exit code 0 with the raw
trace receipt on stdout, exactly mirroring the live attempt.

Focused-suite green baseline receipt (pre-fix, the shared no-Podman
`preseal`/`production_materialize`/`candidate_failure_evidence` selection):

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -k "preseal or production_materialize or candidate_failure_evidence or trace_event_cap" -q
    15 passed, 45 deselected in 15.48s

## Authorship

The test methods, the fixture, the real parser forcing, the frozen-block
capture, and the Red run were performed in-loop for this slice against the
real runner and the real test file.
