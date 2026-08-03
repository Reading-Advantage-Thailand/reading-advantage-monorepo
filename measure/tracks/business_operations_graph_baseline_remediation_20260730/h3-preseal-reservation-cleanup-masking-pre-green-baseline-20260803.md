# H3 Pre-Seal Reservation Cleanup Masking Pre-Green Baseline

This artifact freezes the only production block authorized for the next Green
slice. It is a Red baseline, not acceptance evidence.

- Captured date: 2026-08-03
- Runner path: measure/business_operations_graph_baseline_execution_closure_v3_podman.py
- Pre-Red runner SHA-256: ba251a85cf3238675475e848a69a414323557accfe5f8e0fc6fe0c7a4fe2d815
- Test path: measure/tests/test_business_operations_graph_baseline_execution_closure.py
- Pre-Red full test SHA-256: ab580980f0dd754ba9ae367d3e88b1558664d1d0caec4e91e7abc1661d4882b0
- Post-Red full test SHA-256: 046dd1769b11f5161f0b3cbe395d5e5c81e31b26fc10a77d137ba3479c5640a8
- Authorized Green surface: only the inner reservation-cleanup block below.
- Frozen: finalizer mechanics, raw-copy and JSON-write wrappers, validator,
  reservation/collision/rename behavior, the outer staging cleanup, private
  identity/staging references, stage classification, schemas/carriers,
  preserve_failure routing/message, all tests, and shared helper identity.

## Defect this Red demonstrates

This slice does not merely add coverage; it pins a real masking defect. The
inner reservation cleanup in `_publish_failed_attempt` removes the reserved
canonical `final_directory` and suppresses only `FileNotFoundError`. Any other
`OSError` raised there escapes the `finally` while the already-captured rename
failure is waiting to be re-raised, replaces it, and destroys the original
materialize failure identity, message, and cause chain. Operators would be told
the wrong thing failed on any cleanup-permission or busy-resource condition.

Accepted contract: a reservation cleanup failure must never mask, replace, or
reclassify the in-flight rename failure or the materialize failure beneath it.
Cleanup is best-effort, but the original error object, its exact outer message,
and its cause chain must survive unchanged.

## Exact UTF-8 snapshot

The authorized block is the inner reservation-cleanup block immediately
preceded by the disambiguating two-line anchor

    except OSError as caught_rename_error:
            rename_error = caught_rename_error

which occurs exactly **once** in the pre-Red runner. The authorized block's
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

The authorized block's text is not unique on its own; the exact same four lines
appear in the candidate publisher. The disambiguating anchor
`except OSError as caught_rename_error:` / `rename_error = caught_rename_error`
is unique and immediately precedes only the authorized occurrence:

| Construct | Occurrences | Status |
| --- | --- | --- |
| `except OSError as caught_rename_error:` anchor | 1 | **Authorized.** The sole Green surface. |
| `try/shutil.rmtree(final_directory)/except FileNotFoundError/pass` | 2 | One is **Authorized** (anchor-preceded); the candidate-publisher one at ~6822-6827 is **Frozen**. |
| bare `except FileNotFoundError:` | 2 | One frozen; only the one in the authorized block may change. |

Green acceptance must verify that the bare `except FileNotFoundError:` count
falls from 2 to 1, that the candidate-publisher `final_directory` cleanup block
remains byte-unchanged, and that the anchored whole-file reconstruction is
exact.

## Red receipt

Command:

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -q -k reservation_cleanup_failure

which selects exactly
`R1V3ExecutionClosureRedTests.test_preseal_materialize_failure_evidence_reservation_cleanup_failure_does_not_mask_original_failure`.

Observed result: one test failed at the `assertRaisesRegex` boundary. The raised
message was
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: materialize: V3_TEST_PRESEAL_FAILURE_EVIDENCE_CLEANUP`
where the contract requires
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: materialize: V3_TEST_PRESEAL_FAILURE_EVIDENCE_RENAME`.
The traceback confirms the mechanism exactly: the injected reservation cleanup
`PermissionError` escaped the `finally` and replaced the captured rename
failure, so the cleanup error masked both the rename error and the materialize
error beneath it. This composes an already-accepted fault (rename) with the new
cleanup fault and asserts the first one must win.

## Authorship

The test method was transcribed and the defect analyzed in-loop for this slice:
the Red test drives the real materialize `preserve_failure` path with a
deterministic injected `os.rename` OSError and a deterministic injected
non-`FileNotFoundError` `OSError` (`PermissionError`) from only the
reservation-cleanup `shutil.rmtree(final_directory)` call, while the outer
`staging_parent` rmtree is allowed to succeed via delegation. The Red failure
and all hashes were verified in-loop against the real runner and the frozen
test.
