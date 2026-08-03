# H3 Pre-Seal Staging Cleanup Masking Green Acceptance

## Scope

This receipt accepts only the outer private-staging cleanup no-masking fix in
`_publish_failed_attempt`. It does not accept the inner reservation cleanup,
successful publication, another publisher failure, another pre-seal stage,
candidate paths, or broader H3 through R1 work.

Acceptance authority is in-loop per `AGENTS.md` "Implement high-risk work
in-loop (… Measure acceptance …)". All gate runs below were executed directly in
this loop against the real runner and the frozen test.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Green runner SHA-256 | `ba251a85cf3238675475e848a69a414323557accfe5f8e0fc6fe0c7a4fe2d815` |
| Frozen test SHA-256 | `ab580980f0dd754ba9ae367d3e88b1558664d1d0caec4e91e7abc1661d4882b0` |
| Focused suite, guarded run 1 | Nine tests passed in `2.506s`, zero podman invocations |
| Focused suite, guarded run 2 | The same nine passed in `2.944s`, zero podman invocations |
| Focused suite, guarded run 3 | The same nine passed in `2.948s`, zero podman invocations |
| Reconstructed pre-Green runner | `99e096bda4dc5748efef4a12ad9dd8e46394a55482598705d17bd79267d4ab94` |
| Frozen block artifact | `2a8c54e5c219359c53ad5282411916b2708c45c91e351c8c4d12e2966ed604dc` |
| Runner delta | One hunk, `-10` bytes |
| Source check | Anchored whole-file reconstruction passed |

The frozen test SHA-256 equals the Post-Red hash recorded in
`h3-preseal-staging-cleanup-masking-pre-green-baseline-20260803.md`, so the test
surface is unchanged since commit `c80a754c3`.

## Defect fixed

This slice closes a real masking defect, not a coverage gap. Before the fix, any
non-`FileNotFoundError` `OSError` from `shutil.rmtree(staging_parent)` escaped
the outer `finally` while an original failure was in flight and replaced it.
The committed Red proved the mechanism concretely: the raised message became
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: materialize: V3_TEST_PRESEAL_FAILURE_EVIDENCE_CLEANUP`,
with the injected `PermissionError` promoted to direct cause and the real
JSON-write failure demoted to context. Operators would have been told the wrong
thing failed on any cleanup-permission or busy-resource condition.

## Green delta

The sole runner change widens the caught exception in the authorized block:

    try:
        shutil.rmtree(staging_parent)
    except OSError:
        pass

Cleanup is now best-effort by contract: residue may remain and stays observable
on disk, but the in-flight failure's identity, exact outer message, and cause
chain survive unchanged. No cleanup target, ordering, message, finalizer,
validator, reservation, rename, or `preserve_failure` routing behavior changed.

## Anchored reconstruction proof

- The Green block occurs exactly once in the Green runner.
- Replacing only that block with the committed frozen artifact reconstructs the
  **complete** pre-Green runner at
  `99e096bda4dc5748efef4a12ad9dd8e46394a55482598705d17bd79267d4ab94`, matching
  the baseline exactly.
- Every line outside the hunk is byte-identical.
- The bare `except FileNotFoundError:` count fell from 3 to 2, exactly as the
  baseline required.
- Both frozen `final_directory` inner-cleanup blocks remain present and
  byte-unchanged (count 2).

Therefore this slice is bytewise attributable and every other runner byte is
proven unchanged between the baseline and Green states. This does not
reconstruct or attribute cumulative runner history preceding `99e096bd...`,
authorize a runner commit, or provide cumulative R1-v3 attribution. The runner
remains untracked, so both states are verified by content hash only.

## Focused suite definition

Extends the enumerated list to nine, adding item 8. All names are in
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

"No-Podman" was proven, not asserted, on all three runs by the subprocess guard
over `run`, `call`, `check_call`, `check_output`, and `Popen`.

## Authorship

The Red test method was transcribed by a `reasonix` delegate from the accepted
JSON-write exemplar under a fixed contract, with its bash sandbox enabled by
owner authorization for the first time this track; it ran three of four
DONE-WHEN greps and reported raw output. The diff was independently confirmed
purely additive (one hunk, 198 insertions, zero deletions), the parse check and
every test run were performed in-loop, and one in-loop style correction replaced
a `# summary:` comment with the file-conventional docstring. The defect
analysis, contract choice, Green delta, and anchored reconstruction were
performed in-loop.

## Decision and exclusions

**ACCEPT** -- bounded only to the outer private-staging cleanup no-masking fix
at Green runner SHA-256
`ba251a85cf3238675475e848a69a414323557accfe5f8e0fc6fe0c7a4fe2d815` and frozen
test SHA-256 `ab580980f0dd754ba9ae367d3e88b1558664d1d0caec4e91e7abc1661d4882b0`.

Phase R1 v3 remains `[~]`, and the cumulative runner and test work remains
uncommitted. This does not accept the frozen inner reservation cleanup, cleanup
failures in the candidate publisher, successful publication, other pre-seal
stages or generic variants, candidate paths, H3/H4/H5 or R1-v3-wide acceptance,
a runner commit, or any Podman, candidate, Finance, marker, registry, successor,
V2, or historical-evidence action. A later cumulative runner acceptance must
review a full reachable diff from a committed or reconstructible baseline; this
receipt cannot substitute for it.
