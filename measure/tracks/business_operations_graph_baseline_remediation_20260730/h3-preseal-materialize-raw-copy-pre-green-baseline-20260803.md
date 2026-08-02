# H3 Pre-Seal Materialize Raw-Copy Pre-Green Baseline

This artifact freezes the only production block authorized for the next Green
slice. It is a Red baseline, not acceptance evidence.

- Captured date: 2026-08-03
- Runner path: measure/business_operations_graph_baseline_execution_closure_v3_podman.py
- Pre-Green runner SHA-256: 90d550c3e4c2871de6b15349fa50cfda647af25a08532ad3842f1eb36a730490
- Test path: measure/tests/test_business_operations_graph_baseline_execution_closure.py
- Pre-Red full test SHA-256: 8f403418cfb729b0228928cd51315ed3b94dcd45efb608bf063eab097b5f881a
- Post-Red full test SHA-256: 54f81f425dbe65911907e8d7615e21657641b6dc926f498558906d69f9aa9cea
- Authorized Green surface: only the captured _finalize_command call below.
- Frozen: finalizer mechanics, private identity/staging/raw references, stage
  classification, schemas/carriers, JSON, validator, reserve/collision/rename
  and cleanup behavior, preserve_failure routing/message, all tests, and
  shared helper identity.

## Context anchors

The snapshot is in _publish_failed_attempt immediately after its private
canonical leaf is created and immediately before construction of the failed
attempt record, JSON writing, validation, public reservation, and rename. The
enclosing try/finally retains the private staging cleanup boundary. The only
permitted Green change is to catch the same OSError from this call and rethrow
it from the existing error; no finalizer, cleanup, or error identity behavior
may otherwise change. Replacing only that Green wrapper with this captured block
must reconstruct the listed pre-Green full runner SHA-256 exactly.

## Exact UTF-8 snapshot

The following indented block is the exact UTF-8 byte sequence from pre-Green
runner lines 7040-7044, including one terminal LF. Its SHA-256 is
957aa86ddb9c6ae2dde192a043b21ac0eca8ec9af27c7cffb3b34aa8c6183d46.

        finalized = _finalize_command(
            failed,
            directory,
            reference_root=TRACK_DIR / attempt_name,
        )

## Red receipt

Command:

    PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests.test_preseal_materialize_failure_evidence_raw_copy_failure_cleans_private_stage_and_retains_cause

Observed result: one test failed in 0.186s only at
self.assertIs(raw_copy_error.__cause__, materialize_error): the same
pre-created OSError for V3_TEST_PRESEAL_FAILURE_EVIDENCE_RAW_COPY has no
explicit cause. Before that assertion, the real finalizer delegated exactly the
first stdout copy into a private canonical raw leaf and observed its unique
nonempty bytes byte-for-byte, then received the deterministic stderr copy
failure. The test proved the exact outer CandidateExecutionBlocked message, no
JSON/public attempt/V3/candidate output, no lingering private leaf or stage,
and no further copy after stderr; the real path therefore cannot reach
validator, reservation, rename, replace, candidate/generic publisher, Podman,
trace, build, or generation.
