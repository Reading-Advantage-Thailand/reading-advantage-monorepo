# H5 Candidate-Publisher Publication-Collision Causality Green Acceptance

## Scope

This receipt accepts only the candidate-publisher final-directory collision
causality fix inside `_publish_candidate_publication_failure_attempt`, closing
review finding CAND-2 (High) from
`r1-v3-candidate-publisher-causality-independent-review-20260803.md`. It does
not accept the CAND-1 rename causality variant (a separate slice), successful
publication, another candidate/pre-seal/generic variant, candidate path
contents, or broader H3/H4/H5 through R1 work.

Acceptance authority is in-loop single-authority per `AGENTS.md` "Implement
high-risk work in-loop (… Measure acceptance …)". All gate runs below were
executed directly in this loop against the real runner and the frozen test.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Green runner SHA-256 | `bff014ae25971a1e378917868dd85d5dc0a02d9a4eebd6a4329e3520deb3f0f4` |
| Frozen test SHA-256 | `771df0ec53d254879d06f27e37b42ed33731eea58143eb89ad23fa73e126278d` |
| Focused suite, guarded run 1 | Thirteen tests passed in `12.19s`, zero subprocess/podman invocations |
| Focused suite, guarded run 2 | The same thirteen passed in `12.60s`, zero subprocess/podman invocations |
| Focused suite, guarded run 3 | The same thirteen passed in `18.39s`, zero subprocess/podman invocations |
| Reconstructed pre-Green runner | `e52859d6b4f01c374662f33c6af97a21643ce6a8f344d7d2a0e2de8ae6051cb2` |
| Frozen bare block | `3d05a8465e98620956829c709a92dc703f99b28ca4854d1330d4887b23820383` |
| Frozen pre-seal wrapped block | `79c2d4c32b3401d64566b563e06b41e4687db54e4b19b0bc8bdfbc2f9f8a3084` |
| Runner delta | One hunk, `+146` bytes |
| Source check | Anchored whole-file reconstruction passed; `git diff --check` clean |

The frozen test SHA-256 equals the Post-Red hash recorded in
`h5-candidate-collision-causality-pre-green-baseline-20260803.md`, so the test
surface is unchanged since the Red slice. The reconstructed pre-Green runner
also equals the pre-Red runner SHA-256 pinned in that baseline and the runner
SHA-256 that the independent review CAND-2 finding reviewed, so the Green
slice's pre-state is byte-exact and reachable.

## Defect fixed

This slice closes a real causality defect found by independent review, not a
coverage gap. Before the fix, a final-directory `FileExistsError` inside the
candidate publisher raised
`_fail("V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION", attempt_name)` bare: the
collision validation error propagated without an explicit cause, so the
in-flight candidate-operation failure was detached from the causal chain that
operators would inspect. The pre-seal path already had the accepted
`try/except core.ExecutionClosureValidationError as collision_error: raise
collision_error from error` pattern; the committed Red proved the
candidate-publisher mechanism concretely:
`collision_error.__cause__` was `None` (`AssertionError: None is not
OSError('V3_TEST_CANDIDATE_FAILURE_EVIDENCE_OPERATION')`).

## Green delta

The sole runner change wraps the authorized candidate-publisher
`_fail("V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION", attempt_name)` call in the
exact pre-seal pattern, so the candidate-publisher block at lines 6817-6823 is
now byte-identical to the pre-seal block at lines 7083-7089:

    try:
        final_directory.mkdir()
    except FileExistsError:
        try:
            _fail("V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION", attempt_name)
        except core.ExecutionClosureValidationError as collision_error:
            raise collision_error from error

No validator, reservation, rename, cleanup, staging, schema, carrier, message,
or `preserve_failure` routing behavior was altered, and the pre-seal wrapped
block is byte-unchanged at SHA-256
`79c2d4c32b3401d64566b563e06b41e4687db54e4b19b0bc8bdfbc2f9f8a3084`.

## Anchored reconstruction proof

The baseline records that after Green the wrapped candidate-publisher block is
byte-identical to the pre-seal wrapped block, so content-only replacement is
invalid: the 7-line wrapped block occurs as a full block exactly twice (lines
6817-6823 in the candidate publisher and lines 7083-7089 in the pre-seal path),
and the bare block falls from exactly one occurrence to zero. Disambiguation
must use the longer unique context that continues with the candidate tail
(`final_reserved = True`, `try:`, `os.rename(directory, final_directory)`,
`published = True`, `finally:`), which the pre-seal path never follows (it
opens `rename_error: OSError | None = None` instead). The required checks were
performed and passed:

- The pre-Red 7-line disambiguation anchor (bare block plus the candidate tail
  through the reservation `finally:`) at SHA-256
  `29b680946eef2aa13ff719b3aa1ab9ad85e324faa7d3a8f126f4b22176372422` occurs
  exactly once in the pre-Red runner.
- In the Green runner the wrapped block occurs exactly twice, classified by
  following context: position 313015 is the candidate publisher (followed by
  `final_reserved = True` + `try:` + `os.rename(directory, final_directory)`)
  and position 325971 is the pre-seal path (followed by `rename_error:`).
- Replacing only the candidate-publisher occurrence with the frozen bare block
  reconstructs the **complete** pre-Green runner at
  `e52859d6b4f01c374662f33c6af97a21643ce6a8f344d7d2a0e2de8ae6051cb2` exactly
  (post-reconstruction counts: bare block 1, wrapped block 1).
- The pre-seal wrapped block remains byte-unchanged at SHA-256
  `79c2d4c32b3401d64566b563e06b41e4687db54e4b19b0bc8bdfbc2f9f8a3084`.

Therefore this slice is bytewise attributable and every other runner byte is
proven unchanged between the baseline and Green states. This does not
reconstruct or attribute cumulative runner history preceding
`e52859d6...`, authorize a runner commit, or provide cumulative R1-v3
attribution.

## Focused suite definition

All thirteen names are in
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
12. `test_candidate_failure_evidence_json_write_failure_cleans_private_stage_and_retains_cause`
13. `test_candidate_failure_evidence_collision_preserves_existing_attempt_and_retains_cause`

"No-Podman" was proven, not asserted, on all three runs by the subprocess guard
over `run`, `Popen`, `call`, `check_call`, and `check_output`: every one of the
three runs recorded zero subprocess invocations and therefore zero podman
invocations.

## Observed behavior

The real candidate `preserve_failure` to
`_publish_candidate_publication_failure_attempt` path reaches one real private
validator acceptance of the complete no-command candidate-operation record
under the private `.candidate-publication-failure-` staging parent, then a
single intercepted expected public `Path.mkdir` that creates the canonical
attempt directory and its hash-bound sentinel and raises `FileExistsError`.
The collision validation error now retains the original candidate-operation
error as its explicit `__cause__`, and the outer failure remains exactly
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: candidate-publication:
V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION:
r1-v3-podman-execution-attempt-20260802-0001`. The competing public directory
and sentinel remain byte-for-byte intact with no publisher JSON or raw child,
the private staged leaf and its staging parent are removed, and no
rename/replace/pre-seal-publisher/generic-publisher/Podman/trace/build or
generation path executes. The twelve previously accepted pre-seal/candidate
slices and the new candidate collision regression remain Green in the same
runs.

## Authorship

The Red test method, the fault design, the disambiguation, the Green delta, the
anchored reconstruction, and every gate run were performed in-loop for this
slice against the real runner and the frozen test.

## Decision and exclusions

**ACCEPT** -- bounded only to the candidate-publisher final-directory
`FileExistsError` collision causality fix after successful private validation
at Green runner SHA-256
`bff014ae25971a1e378917868dd85d5dc0a02d9a4eebd6a4329e3520deb3f0f4` and frozen
test SHA-256
`771df0ec53d254879d06f27e37b42ed33731eea58143eb89ad23fa73e126278d`.

Phase R1 v3 remains `[~]`, and the cumulative runner and test work remains
uncommitted shared R1-v3 work. This does not accept the CAND-1 rename
causality variant (a separate slice); successful publication; other
candidate/pre-seal/generic variants; candidate path contents; H3/H4/H5 or
R1-v3-wide acceptance; a runner commit; or any Podman, candidate, Finance,
marker, registry, successor, V2, or historical-evidence action. A later
cumulative runner acceptance must review a full reachable diff from a committed
or reconstructible baseline; this receipt cannot substitute for it.
