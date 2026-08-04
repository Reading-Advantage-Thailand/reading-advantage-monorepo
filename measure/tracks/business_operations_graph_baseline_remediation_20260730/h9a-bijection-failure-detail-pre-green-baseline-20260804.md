# H9a Bijection-Failure Detail Pre-Green Baseline

This artifact freezes the only production seam authorized for the next Green
slice. It is a Red baseline, not acceptance evidence.

- Captured date: 2026-08-04
- Runner path: measure/business_operations_graph_baseline_execution_closure_v3_podman.py
- Pre-Red runner SHA-256: ded40b2cb16d887b36cbd350a7ad8dbd7169790f749cc191fb8bd901201c3688
- Test path: measure/tests/test_business_operations_graph_baseline_execution_closure.py
- Pre-Red full test SHA-256: b0328f72c52704953c9492282db196e13c639452c99b5267a148295c9faebf01
- Post-Red full test SHA-256: 29637a0c48be79e3ea1ddd1327a6beb254111009df7fd8d8a5bf1ccacc1273f3
- Authorized Green surface: the single bare bijection-failure raise inside
  `validate_direct_command_runtime_execution_trace_v1` only — the
  `_direct_runtime_read_set_fail("EXECUTION_TRACE_BIJECTION_FAILED")` call at
  pre-Green runner line 1094, plus one new bounded detail-builder helper and
  one detail-cap constant. Every other runner line remains byte-unchanged.
- Frozen: the four-member bijection comparison at pre-Green runner lines
  1088-1093 (the 433-byte frozen guard block at SHA-256
  `1d368d5ccc47697c746e315b949e480fa52e31a35dddd22c72e7048b43b4c628`), the
  declared-set derivation, the trace-event parser, the tracer, the H6 cap line,
  the read-set contract validators, the phase-level failure publisher and
  validator (H8/H10 machinery), the happy path, and every previously accepted
  test.

## Defect this Red demonstrates

The live confirming attempt failed at
`validate_direct_command_runtime_execution_trace_v1` (log
`/tmp/opencode/r1v3-attempt-20260804-d.log`, line 1094) with

    V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED

carrying **no detail naming which paths diverge**. The raised error is a bare
code; a blocked attempt preserves it as-is, so the preserved evidence cannot
name the divergent paths either. Suspected divergence (from the H7 residual
finding, plan line 608): discovery measured `directoryListingCount` 1,895
while the full-tree ancestor walk counts 1,911 — i.e. the generator
enumerates roughly 16 directories outside the discovery-derived declared set,
or another bucket diverges. That cannot be confirmed without the divergent
paths, and the frozen evidence cannot be rewritten to carry them.

Accepted contract: when the four-member bijection (baselineReads /
derivedBuildReads / writes / directoryEnumerations vs the readSetContract
declared sets) fails, the raised `ExecutionClosureValidationError` must carry
a bounded, deterministic single-line canonical-JSON detail payload (matching
the runner's existing `_fail(code, detail)` `code: detail` convention)
naming, for each diverging bucket, the sorted paths
present-in-trace-but-undeclared and declared-but-untraced, each list capped at
the first 25 entries with the total count, plus a SHA-256 of the canonical
full uncapped divergence so nothing is silently elided. The same failures,
the same successes, and the same bare code remain — only the detail is added.

## Red receipt

Post-Red tests (three new + one minimally updated existing test; the update
is documented below):

- `R1V3ExecutionClosureRedTests.test_bijection_failure_detail_names_exact_divergent_paths_per_bucket`
- `R1V3ExecutionClosureRedTests.test_bijection_failure_detail_caps_lists_and_pins_full_divergence_hash`
- `R1V3ExecutionClosureRedTests.test_bijection_failure_detail_flows_through_phase_level_preserved_attempt`
- `R1V3ExecutionClosureRedTests.test_undeclared_directory_enumeration_is_rejected_by_trace_validation`
  (updated: its pre-Red regex asserted the exact bare message
  `^V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED$`; the update
  asserts the code prefix plus the required detail suffix
  `^V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED: `, so the
  existing H7 rejection contract still holds and additionally proves the real
  parser-to-validator path now carries detail. This is the only pre-existing
  test whose assertion changes; every other test is untouched.)

Observed result: all four Red tests failed in 14.90s against the pre-Green
runner (`ded40b2c...`), re-verified with the final frozen test file after one
test-assertion correction (the end-to-end test initially asserted the bare
`reason` code; the H8/H10 phase-level publisher records `reason` and
`errorDetail` both as `str(error)`, so the final assertion checks
`reason == errorDetail` and that both carry the detail). The three new tests
fail because the bare raise carries no detail payload, and the updated H7
test fails because the raised message has no `: ` detail suffix:

    AssertionError: "^V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED: " does not match "V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED"

Focused-suite green baseline receipt (pre-fix, the shared no-Podman 22-test
selection excluding the one updated assertion — the unchanged tests):

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -k "(preseal or production_materialize or candidate_failure_evidence or trace_event_cap or trace_capture_failure_evidence or directory_enumeration or unknown_trace_event_kind or phase_level_failure) and not undeclared" -q
    22 passed, 49 deselected in 37.69s

## Authorized Green surface (bounded)

- `validate_direct_command_runtime_execution_trace_v1`: replace the bare
  `_direct_runtime_read_set_fail("EXECUTION_TRACE_BIJECTION_FAILED")` raise
  with the same raise carrying a bounded detail string. The comparison at
  lines 1088-1093 stays byte-unchanged.
- One new private helper that builds the detail payload from the already
  derived `expected_trace` and the observed `execution_trace`, and one
  constant `_DIRECT_RUNTIME_TRACE_BIJECTION_DETAIL_CAP = 25`.

The parser, the tracer, the declared-set derivation, the cap formula, the
phase-level publisher/validator, all carriers, the happy path, and every
pass/fail outcome are frozen. H9b (a later separate slice) owns the actual
set-mismatch fix; this slice is observability only.

## Authorship

The test methods, the fixture, and the Red run were performed in-loop for this
slice against the real runner and the real test file.
