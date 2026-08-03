# H3 Pre-Seal Materialize JSON-Write Pre-Green Baseline

This artifact freezes the only production block authorized for the next Green
slice. It is a Red baseline, not acceptance evidence.

- Captured date: 2026-08-03
- Runner path: measure/business_operations_graph_baseline_execution_closure_v3_podman.py
- Pre-Green runner SHA-256: 9f5ad52728c4c3c01ec1d9ff210de35f11ec82a0da3ebd656ab92944ae763b97
- Test path: measure/tests/test_business_operations_graph_baseline_execution_closure.py
- Pre-Red full test SHA-256: 54f81f425dbe65911907e8d7615e21657641b6dc926f498558906d69f9aa9cea
- Post-Red full test SHA-256: f02b207eea0e737a15e397f521eaea29114bc7162bc418d8c7020629e91dbaa7
- Authorized Green surface: only the single `_write_json` call identified below.
- Frozen: finalizer mechanics, raw-copy behavior and its accepted wrapper,
  private identity/staging references, stage classification, schemas/carriers,
  the validator, reserve/collision/rename and cleanup behavior,
  preserve_failure routing/message, all tests, and shared helper identity.

## Context anchors

The snapshot is in `_publish_failed_attempt` immediately after the failed
attempt record is fully constructed and immediately before
`validate_failed_execution_attempt_v1`, public reservation, and rename. The
enclosing try/finally retains the private staging cleanup boundary. The only
permitted Green change is to catch the same OSError from this call and rethrow
it from the existing `error`; no finalizer, validator, cleanup, or error
identity behavior may otherwise change.

## Call-site disambiguation (required for reconstruction)

Unlike the raw-copy slice, the authorized line is **not unique** in the runner.
The byte sequence

        _write_json(directory / "failed-attempt.json", attempt)

occurs **twice**, at SHA-256
`dce45138d4a2347ccfcec49e2c206b7092c027724817311c88b8ee9ced58876f`:

| Line | Enclosing function | Status |
| --- | --- | --- |
| 6812 | `_publish_candidate_publication_failure_attempt` | **Frozen.** Out of scope; this is the H5 candidate publisher. |
| 7072 | `_publish_failed_attempt` | **Authorized.** The sole Green surface. |

A whole-file reconstruction check that replaces the block by content alone is
therefore ambiguous and must not be used. Reconstruction must anchor on the
unique two-line sequence ending at line 7072, whose exact UTF-8 bytes are

            attempt["workspaceBuildResolution"] = workspace_resolution_for_attempt
        _write_json(directory / "failed-attempt.json", attempt)

with SHA-256
`ca754ecf23d8838b24f517a0a3438a604b1462d57c055e9fb930a9d8e1d71070` and exactly
one occurrence in the pre-Green runner. Green acceptance must verify that the
6812 occurrence is byte-unchanged and that the anchor still occurs exactly once.

## Red receipt

Command:

    PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests.test_preseal_materialize_failure_evidence_json_write_failure_cleans_private_stage_and_retains_cause

Observed result: one test failed in 0.277s only at
`self.assertIs(json_write_error.__cause__, materialize_error)`: the same
pre-created OSError for `V3_TEST_PRESEAL_FAILURE_EVIDENCE_JSON_WRITE` has no
explicit cause. Before that assertion, the real finalizer delegated both raw
receipt copies into the private canonical leaf and both were observed
byte-for-byte, then the deterministic JSON-write failure was taken against
`failed-attempt.json` under the private `.failed-attempt-` staging parent while
that JSON was still absent. The test proved the exact outer
`CandidateExecutionBlocked` message, zero validator calls, zero rename calls, no
public attempt, no lingering private leaf or staging parent, and no raw residue;
the real path therefore cannot reach reservation, rename, replace,
candidate/generic publisher, Podman, trace, build, or generation.

## Authorship

The test method was transcribed by a `reasonix` delegate from the accepted
raw-copy exemplar under a fixed contract; its sandboxed bash was refused, so it
executed no gates. The fault design, assertion set, disambiguation above, diff
verification, and the Red run were performed in-loop. The delegate deviated from
the written spec in one respect: it matched the exemplar's literal `\\n` escape
style in the receipt byte constants rather than the `\n` given in the prompt.
The constants are written and compared self-consistently, so behavior is
unaffected, and the exemplar-consistent form was retained.
