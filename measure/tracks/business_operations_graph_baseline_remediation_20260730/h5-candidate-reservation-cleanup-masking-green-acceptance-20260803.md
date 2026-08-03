# H5 Candidate-Publisher Reservation Cleanup Masking Green Acceptance

## Scope

This receipt accepts only the candidate-publisher reservation-cleanup
no-masking fix in `_publish_candidate_publication_failure_attempt`. It does not
accept successful publication, another candidate/pre-seal/generic variant,
candidate path contents, or broader H3/H4/H5 through R1 work.

Acceptance authority is in-loop single-authority per `AGENTS.md` "Implement
high-risk work in-loop (… Measure acceptance …)". All gate runs below were
executed directly in this loop against the real runner and the frozen test.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Green runner SHA-256 | `4f1eb6a34c946f101791a26cf090f68cfffc360000a57974015947f44feec1c3` |
| Frozen test SHA-256 | `69053a5a5e49c22bdfeb4c4d2ac3b2f0e050c96f63a97de64c49b541adafc01e` |
| Focused suite, guarded run 1 | Eleven tests passed in `6.04s`, zero subprocess/podman invocations |
| Focused suite, guarded run 2 | The same eleven passed in `6.57s`, zero subprocess/podman invocations |
| Focused suite, guarded run 3 | The same eleven passed in `6.01s`, zero subprocess/podman invocations |
| Reconstructed pre-Green runner | `c35f07868b00cae579a046255b3a2e4436e921042caae4361a573feffe2bf591` |
| Frozen block artifact | `24678741940349ac09f2ee48d638e346a45557cb3a7140a2fcddb81d6c5edcf4` |
| Runner delta | One hunk, `-10` bytes |
| Source check | Whole-file reconstruction passed; `git diff --check` clean |

The frozen test SHA-256 equals the Post-Red hash recorded in
`h5-candidate-reservation-cleanup-masking-pre-green-baseline-20260803.md`, so
the test surface is unchanged since the Red slice. The reconstructed pre-Green
runner also equals the pre-Red runner SHA-256 pinned in that baseline, so the
Green slice's pre-state is byte-exact.

## Defect fixed

This slice closes a real masking defect, not a coverage gap. Before the fix, any
non-`FileNotFoundError` `OSError` from `shutil.rmtree(final_directory)` escaped
the candidate publisher's inner reservation `finally` while the captured rename
failure was waiting to be re-raised, replaced it, and destroyed the original
candidate-operation failure identity, message, and cause chain. The committed
Red proved the mechanism concretely: the raised message became
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: candidate-publication: V3_TEST_CANDIDATE_FAILURE_EVIDENCE_CLEANUP`,
with the injected reservation cleanup `PermissionError` masking the rename
error. Operators would have been told the wrong thing failed on any
cleanup-permission or busy-resource condition.

## Green delta

The sole runner change widens the caught exception in the authorized block
(`except FileNotFoundError:` → `except OSError:` at the candidate publisher's
reservation cleanup). The rename error is now always re-raised after the
cleanup fault is suppressed. No cleanup target, ordering, message, finalizer,
validator, reservation, rename, collision, or `preserve_failure` routing
behavior changed.

## Anchored reconstruction proof

- The authorized frozen block is byte-counted exactly once in the pre-Green
  runner (occurrences = 1), so no disambiguation anchor is required.
- Replacing only the Green hunk with the committed frozen artifact reconstructs
  the **complete** pre-Green runner at
  `c35f07868b00cae579a046255b3a2e4436e921042caae4361a573feffe2bf591` exactly.
- Every line outside the hunk is byte-identical.
- The bare `except FileNotFoundError:` count fell from 1 to 0, exactly as the
  baseline required.
- The already-widened `_publish_failed_attempt` reservation-cleanup block
  (SHA-256 `0ac6bd1ea520569851cf58dc17fcf7734e9e4ce74ba861a178372a355b732630`)
  and staging-cleanup block (SHA-256
  `5343b54a88fd7b8ca98ddc607b73676b7e86ed6f2879ce7b7692dfae06ac58d0`) remain
  byte-unchanged.

Therefore this slice is bytewise attributable and every other runner byte is
proven unchanged between the baseline and Green states. This does not
reconstruct or attribute cumulative runner history preceding `c35f0786...`,
authorize a runner commit, or provide cumulative R1-v3 attribution.

## Focused suite definition

All eleven names are in
`measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests`:

1. `test_preseal_failed_attempt_preserves_terminality_without_sealed_integration`
2. `test_production_materialize_failure_persists_real_preseal_terminal_carrier`
3. `test_preseal_materialize_failure_evidence_validation_is_private_atomic_and_leaves_no_partial_attempt`
4. `test_preseal_materialize_failure_evidence_rename_failure_cleans_reservation_and_retains_cause`
5. `test_preseal_materialize_failure_evidence_collision_preserves_existing_attempt_and_retains_cause`
6. `test_preseal_materialize_failure_evidence_raw_copy_failure_cleans_private_stage_and_retains_cause`
7. `test_preseal_materialize_failure_evidence_json_write_failure_cleans_private_stage_and_retains_cause`
8. `test_preseal_materialize_failure_evidence_staging_cleanup_failure_does_not_mask_original_failure`
9. `test_preseal_materialize_failure_evidence_reservation_cleanup_failure_does_not_mask_original_failure`
10. `test_candidate_failure_evidence_validation_is_private_atomic_and_leaves_no_partial_attempt`
11. `test_candidate_failure_evidence_reservation_cleanup_failure_does_not_mask_original_failure`

"No-Podman" was proven, not asserted, on all three runs by the subprocess guard
over `run`, `Popen`, `call`, `check_call`, and `check_output`: every one of the
three runs recorded zero subprocess invocations and therefore zero podman
invocations.

## Authorship

The Red test method, the defect analysis, the contract choice, the Green delta,
and the anchored reconstruction were all performed in-loop for this slice. The
test drives the real candidate `preserve_failure` path through
`_publish_candidate_publication_failure_attempt` with successful private
validation (real `validate_failed_execution_attempt_v1`), a deterministic
injected `os.rename` OSError, and a deterministic injected
non-`FileNotFoundError` `OSError` (`PermissionError`) from only the
reservation-cleanup `shutil.rmtree(final_directory)` call. The Red failure, the
three guarded Green runs, and all hashes were verified in-loop against the real
runner and the frozen test.

## Decision and exclusions

**ACCEPT** -- bounded only to the candidate-publisher reservation-cleanup
no-masking fix at Green runner SHA-256
`4f1eb6a34c946f101791a26cf090f68cfffc360000a57974015947f44feec1c3` and frozen
test SHA-256 `69053a5a5e49c22bdfeb4c4d2ac3b2f0e050c96f63a97de64c49b541adafc01e`.

Phase R1 v3 remains `[~]`, and the cumulative runner and test work remains
uncommitted. This does not accept successful publication, other
candidate/pre-seal/generic variants, candidate path contents, H3/H4/H5 or
R1-v3-wide acceptance, a runner commit decision, or any Podman, candidate,
Finance, marker, registry, successor, V2, or historical-evidence action. A
later cumulative runner acceptance must review a full reachable diff from a
committed or reconstructible baseline; this receipt cannot substitute for it.
