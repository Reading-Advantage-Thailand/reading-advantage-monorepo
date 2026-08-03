# H3 Pre-Seal Staging Cleanup Masking Pre-Green Baseline

This artifact freezes the only production block authorized for the next Green
slice. It is a Red baseline, not acceptance evidence.

- Captured date: 2026-08-03
- Runner path: measure/business_operations_graph_baseline_execution_closure_v3_podman.py
- Pre-Green runner SHA-256: 99e096bda4dc5748efef4a12ad9dd8e46394a55482598705d17bd79267d4ab94
- Test path: measure/tests/test_business_operations_graph_baseline_execution_closure.py
- Pre-Red full test SHA-256: f02b207eea0e737a15e397f521eaea29114bc7162bc418d8c7020629e91dbaa7
- Post-Red full test SHA-256: ab580980f0dd754ba9ae367d3e88b1558664d1d0caec4e91e7abc1661d4882b0
- Authorized Green surface: only the outer private-staging cleanup block below.
- Frozen: finalizer mechanics, raw-copy and JSON-write wrappers, validator,
  reservation/collision/rename behavior, the inner reservation cleanup, private
  identity/staging references, stage classification, schemas/carriers,
  preserve_failure routing/message, all tests, and shared helper identity.

## Defect this Red demonstrates

This slice does not merely add coverage; it pins a real masking defect. The
outer `finally` in `_publish_failed_attempt` removes the private staging parent
and suppresses only `FileNotFoundError`. Any other `OSError` raised there
propagates **out of the finally while an original failure is already in
flight**, replacing it. Python sets `__context__` but not `__cause__` on that
replacement, so the original preservation failure identity, message, and cause
chain are destroyed and the caller is told the wrong thing failed.

Accepted contract: a private staging cleanup failure must never mask, replace,
or reclassify the in-flight failure. Cleanup is best-effort. Residue may remain
and stays observable on disk, but the original error object, its exact outer
message, and its cause chain must survive unchanged.

## Exact UTF-8 snapshot

The authorized block occurs exactly **once** in the pre-Green runner. Its exact
UTF-8 bytes are

        try:
            shutil.rmtree(staging_parent)
        except FileNotFoundError:
            pass

with SHA-256
`2a8c54e5c219359c53ad5282411916b2708c45c91e351c8c4d12e2966ed604dc`.

The only permitted Green change is to widen that block's caught exception from
`FileNotFoundError` to `OSError` so the cleanup cannot escape. No cleanup
target, ordering, message, or other handler may change.

## Call-site disambiguation

Unlike the JSON-write slice the authorized block itself is unique, but adjacent
lookalikes exist and are **frozen**:

| Construct | Occurrences | Status |
| --- | --- | --- |
| `try/shutil.rmtree(staging_parent)/except FileNotFoundError/pass` | 1 | **Authorized.** The sole Green surface. |
| `try/shutil.rmtree(final_directory)/except FileNotFoundError/pass` | 2 | **Frozen.** Inner reservation cleanup; out of scope. |
| bare `except FileNotFoundError:` | 3 | Two are frozen; only the one in the authorized block may change. |
| `shutil.rmtree(staging_parent)` | 1 | Unique; safe reconstruction anchor. |

Green acceptance must verify that the bare `except FileNotFoundError:` count
falls from 3 to 2, that both `final_directory` cleanup blocks remain
byte-unchanged, and that the anchored whole-file reconstruction is exact.

## Red receipt

Command:

    PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests.test_preseal_materialize_failure_evidence_staging_cleanup_failure_does_not_mask_original_failure

Observed result: one test failed in 0.345s at the `assertRaisesRegex` boundary.
The raised message was
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: materialize: V3_TEST_PRESEAL_FAILURE_EVIDENCE_CLEANUP`
where the contract requires
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: materialize: V3_TEST_PRESEAL_FAILURE_EVIDENCE_JSON_WRITE`.
The traceback confirms the mechanism exactly: the injected `PermissionError`
became the direct cause of `CandidateExecutionBlocked` while the JSON-write
failure was demoted to context. This composes an already-accepted fault
(JSON-write) with the new cleanup fault and asserts the first one must win.

## Authorship

The test method was transcribed by a `reasonix` delegate from the accepted
JSON-write exemplar under a fixed contract. Its bash sandbox was enabled during
this slice (owner-authorized `[sandbox] bash = "off"`), so it executed three of
four DONE-WHEN greps and reported their raw output; its own policy blocked the
`python3` parse check. The diff verification, parse check, and Red run were
performed in-loop. One in-loop correction was applied: the delegate emitted a
`# summary:` comment where the file's convention is a docstring, because the
prompt supplied that placeholder literally and instructed prompt-over-style; the
nested function now carries a normal `@param`/`@returns` docstring.
