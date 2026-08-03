# H5 Candidate-Publisher Reservation Cleanup Masking Pre-Green Baseline

This artifact freezes the only production block authorized for the next Green
slice. It is a Red baseline, not acceptance evidence.

- Captured date: 2026-08-03
- Runner path: measure/business_operations_graph_baseline_execution_closure_v3_podman.py
- Pre-Red runner SHA-256: c35f07868b00cae579a046255b3a2e4436e921042caae4361a573feffe2bf591
- Test path: measure/tests/test_business_operations_graph_baseline_execution_closure.py
- Pre-Red full test SHA-256: 046dd1769b11f5161f0b3cbe395d5e5c81e31b26fc10a77d137ba3479c5640a8
- Post-Red full test SHA-256: 69053a5a5e49c22bdfeb4c4d2ac3b2f0e050c96f63a97de64c49b541adafc01e
- Authorized Green surface: only the candidate-publisher reservation-cleanup block below.
- Frozen: finalizer mechanics, raw-copy and JSON-write wrappers, validator,
  reservation/collision/rename behavior, the outer staging cleanup, private
  identity/staging references, stage classification, schemas/carriers,
  preserve_failure routing/message, all tests, and shared helper identity.

## Defect this Red demonstrates

This slice does not merely add coverage; it pins a real masking defect. The
inner reservation cleanup in `_publish_candidate_publication_failure_attempt`
removes the reserved canonical `final_directory` and suppresses only
`FileNotFoundError`. Any other `OSError` raised there escapes the `finally`
while the already-captured rename failure is waiting to be re-raised, replaces
it, and destroys the original candidate-operation failure identity, message,
and cause chain. Operators would be told the wrong thing failed on any
cleanup-permission or busy-resource condition.

Accepted contract: a reservation cleanup failure must never mask, replace, or
reclassify the in-flight rename failure. Cleanup is best-effort, but the
original error object, its exact outer message, and its cause chain must
survive unchanged. The collision path (`FileExistsError` →
`V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION`) is frozen and out of scope.

## Exact UTF-8 snapshot

The authorized block is the candidate-publisher reservation-cleanup block. Its
exact UTF-8 bytes (16-space indentation, trailing newline) are

                try:
                    shutil.rmtree(final_directory)
                except FileNotFoundError:
                    pass

with SHA-256
`24678741940349ac09f2ee48d638e346a45557cb3a7140a2fcddb81d6c5edcf4`.

The only permitted Green change is to widen that one block's caught exception
from `FileNotFoundError` to `OSError` so the cleanup error cannot escape and
mask the rename error. No cleanup target, ordering, message, or other handler
may change.

## Call-site disambiguation

Unlike the earlier pre-seal reservation-cleanup slice, no disambiguation
anchor is required: the authorized block's exact bytes occur exactly **once**
in the pre-Red runner, verified by byte-count over the whole file
(occurrences = 1). The `_publish_failed_attempt` reservation/staging cleanup
blocks were already widened to `except OSError:` in the prior slice, so they
no longer contain the frozen bytes.

| Construct | Occurrences | Status |
| --- | --- | --- |
| `try/shutil.rmtree(final_directory)/except FileNotFoundError/pass` | 1 | **Authorized.** The sole Green surface. |
| bare `except FileNotFoundError:` | 1 | Only the one in the authorized block; must fall to 0. |
| `except OSError:` (including the already-widened `_publish_failed_attempt` cleanup blocks) | 4 | **Frozen.** Byte-unchanged. |

Green acceptance must verify that the bare `except FileNotFoundError:` count
falls from 1 to 0, that the already-widened `_publish_failed_attempt`
reservation-cleanup block (SHA-256 `0ac6bd1ea520569851cf58dc17fcf7734e9e4ce74ba861a178372a355b732630`)
and staging-cleanup block (SHA-256 `5343b54a88fd7b8ca98ddc607b73676b7e86ed6f2879ce7b7692dfae06ac58d0`)
remain byte-unchanged, and that the whole-file reconstruction is exact.

## Red receipt

Command:

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -q -k candidate_failure_evidence_reservation

which selects exactly
`R1V3ExecutionClosureRedTests.test_candidate_failure_evidence_reservation_cleanup_failure_does_not_mask_original_failure`.

Observed result: one test failed at the `assertRaisesRegex` boundary. The raised
message was
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: candidate-publication: V3_TEST_CANDIDATE_FAILURE_EVIDENCE_CLEANUP`
where the contract requires
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: candidate-publication: V3_TEST_CANDIDATE_FAILURE_EVIDENCE_RENAME`.
The traceback confirms the mechanism exactly: the injected reservation cleanup
`PermissionError` escaped the `finally` and replaced the captured rename
failure, so the cleanup error masked the rename failure. This composes an
already-accepted fault (rename) with the new cleanup fault and asserts the
first one must win.

## Authorship

The test method was transcribed and the defect analyzed in-loop for this slice:
the Red test drives the real candidate `preserve_failure` path through
`_publish_candidate_publication_failure_attempt` with successful private
validation (real `validate_failed_execution_attempt_v1`), a deterministic
injected `os.rename` OSError, and a deterministic injected
non-`FileNotFoundError` `OSError` (`PermissionError`) from only the
reservation-cleanup `shutil.rmtree(final_directory)` call, while the private
staging rmtree is allowed to succeed via delegation. The Red failure and all
hashes were verified in-loop against the real runner and the frozen test.
