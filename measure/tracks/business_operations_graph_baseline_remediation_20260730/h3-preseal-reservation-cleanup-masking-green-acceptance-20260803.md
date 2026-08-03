# H3 Pre-Seal Reservation Cleanup Masking Green Acceptance

## Scope

This receipt accepts only the inner reservation-cleanup no-masking fix in
`_publish_failed_attempt`'s materialize path. It does not accept the candidate
publisher's reservation cleanup, successful publication, another publisher
failure, another pre-seal stage, candidate paths, or broader H3 through R1 work.

Acceptance authority is in-loop per `AGENTS.md` "Implement high-risk work
in-loop (… Measure acceptance …)". All gate runs below were executed directly in
this loop against the real runner and the frozen test.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Green runner SHA-256 | `c35f07868b00cae579a046255b3a2e4436e921042caae4361a573feffe2bf591` |
| Frozen test SHA-256 | `046dd1769b11f5161f0b3cbe395d5e5c81e31b26fc10a77d137ba3479c5640a8` |
| Focused suite, guarded run 1 | Ten tests passed in `4.01s`, zero podman invocations |
| Focused suite, guarded run 2 | The same ten passed in `3.46s`, zero podman invocations |
| Focused suite, guarded run 3 | The same ten passed in `3.49s`, zero podman invocations |
| Reconstructed pre-Green runner | `ba251a85cf3238675475e848a69a414323557accfe5f8e0fc6fe0c7a4fe2d815` |
| Frozen block artifact | `24678741940349ac09f2ee48d638e346a45557cb3a7140a2fcddb81d6c5edcf4` |
| Runner delta | One hunk, `-10` bytes |
| Source check | Anchored whole-file reconstruction passed |

The frozen test SHA-256 equals the Post-Red hash recorded in
`h3-preseal-reservation-cleanup-masking-pre-green-baseline-20260803.md`, so the
test surface is unchanged since the Red slice. The reconstructed pre-Green
runner also equals the committed HEAD blob for the runner, so this slice's
pre-state is additionally anchored to a reachable Git object.

## Defect fixed

This slice closes a real masking defect, not a coverage gap. Before the fix, any
non-`FileNotFoundError` `OSError` from `shutil.rmtree(final_directory)` escaped
the inner reservation `finally` while the captured rename failure was waiting to
be re-raised, replaced it, and destroyed the original materialize failure
identity, message, and cause chain. The committed Red proved the mechanism
concretely: the raised message became
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: materialize: V3_TEST_PRESEAL_FAILURE_EVIDENCE_CLEANUP`,
with the injected reservation cleanup `PermissionError` masking the rename error
and the materialize error beneath it. Operators would have been told the wrong
thing failed on any cleanup-permission or busy-resource condition.

## Green delta

The sole runner change widens the caught exception in the authorized block:

    except OSError as caught_rename_error:
            rename_error = caught_rename_error
        finally:
            if final_reserved and not published:
                try:
                    shutil.rmtree(final_directory)
                except OSError:
                    pass

The rename error is now always re-raised from the original materialize error
after the cleanup fault is suppressed. No cleanup target, ordering, message,
finalizer, validator, reservation, rename, or `preserve_failure` routing
behavior changed.

## Anchored reconstruction proof

- The Green block occurs exactly once in the Green runner.
- Replacing only that block with the committed frozen artifact reconstructs the
  **complete** pre-Green runner at
  `ba251a85cf3238675475e848a69a414323557accfe5f8e0fc6fe0c7a4fe2d815`, matching
  the baseline exactly (and the committed HEAD blob).
- Every line outside the hunk is byte-identical.
- The bare `except FileNotFoundError:` count fell from 2 to 1, exactly as the
  baseline required.
- The candidate-publisher `final_directory` cleanup block remains present and
  byte-unchanged (count 1).

Therefore this slice is bytewise attributable and every other runner byte is
proven unchanged between the baseline and Green states. This does not
reconstruct or attribute cumulative runner history preceding `ba251a85...`,
authorize a runner commit, or provide cumulative R1-v3 attribution.

## Focused suite definition

Extends the enumerated list to ten, adding item 10. All names are in
`measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests`:

1. `test_preseal_failed_attempt_preserves_terminality_without_sealed_integration`
2. `test_production_materialize_failure_persists_real_preseal_terminal_carrier`
3. `test_preseal_materialize_failure_evidence_validation_is_private_atomic_and_leaves_no_partial_attempt`
4. `test_preseal_materialize_failure_evidence_rename_failure_cleans_reservation_and_retains_cause`
5. `test_preseal_materialize_failure_evidence_collision_preserves_existing_attempt_and_retains_cause`
6. `test_preseal_materialize_failure_evidence_raw_copy_failure_cleans_private_stage_and_retains_cause`
7. `test_preseal_materialize_failure_evidence_json_write_failure_cleans_private_stage_and_retains_cause`
8. `test_preseal_materialize_failure_evidence_staging_cleanup_failure_does_not_mask_original_failure`
9. `test_candidate_failure_evidence_validation_is_private_atomic_and_leaves_no_partial_attempt`
10. `test_preseal_materialize_failure_evidence_reservation_cleanup_failure_does_not_mask_original_failure`

"No-Podman" was proven, not asserted, on all three runs by the subprocess guard
over `run`, `Popen`, `call`, `check_call`, and `check_output`: every one of the
three runs recorded zero subprocess invocations and zero podman invocations.

## Authorship

The Red test method, the defect analysis, the contract choice, the Green delta,
and the anchored reconstruction were all performed in-loop for this slice. The
test drives the real materialize `preserve_failure` path with a deterministic
injected `os.rename` OSError and a deterministic injected non-`FileNotFoundError`
`OSError` from only the reservation-cleanup `shutil.rmtree(final_directory)`
call, delegating the outer `staging_parent` rmtree to the real removal so it is
allowed to succeed. The Red failure, the three guarded Green runs, and all
hashes were verified in-loop against the real runner and the frozen test.

## Decision and exclusions

**ACCEPT** -- bounded only to the inner reservation-cleanup no-masking fix at
Green runner SHA-256
`c35f07868b00cae579a046255b3a2e4436e921042caae4361a573feffe2bf591` and frozen
test SHA-256 `046dd1769b11f5161f0b3cbe395d5e5c81e31b26fc10a77d137ba3479c5640a8`.

Phase R1 v3 remains `[~]`, and the cumulative runner and test work remains
uncommitted. This does not accept the candidate-publisher reservation cleanup,
successful publication, other pre-seal/generic variants, candidate paths,
H3/H4/H5 or R1-v3-wide acceptance, a runner commit, or any Podman, candidate,
Finance, marker, registry, successor, V2, or historical-evidence action. A later
cumulative runner acceptance must review a full reachable diff from a committed
or reconstructible baseline; this receipt cannot substitute for it.
