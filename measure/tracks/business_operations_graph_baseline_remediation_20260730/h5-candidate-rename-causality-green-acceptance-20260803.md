# Bounded Green/Acceptance: H5 Candidate-Publisher Rename Causality (2026-08-03)

Accepted in-loop, single-authority per `AGENTS.md` Measure-acceptance ownership,
for only the candidate-publisher rename causality fix — review finding CAND-1
(High) from `r1-v3-candidate-publisher-causality-independent-review-20260803.md`,
the final open finding of that review.

## Binding

- Post-Green runner SHA-256: `b8abd4e1e140d49e585d74d5acff0b9a2ecb638b2514b36fa330e96ad8d4743d`
- Frozen test SHA-256: `f969e71b1e0700772eb2ac612ebddcff476328538cd93c6c597c1bc3a0cd57d5`
  (equals the Post-Red hash in the baseline; the test surface is unchanged
  since Red)
- Pre-Green baseline:
  `h5-candidate-rename-causality-pre-green-baseline-20260803.md` (frozen bare
  block SHA-256 `47c232db56b81a534830146369360f95525b9e28c983190fb10aff03c672e82e`)

## Green delta

The sole runner delta converts the candidate-publisher rename block to the
accepted pre-seal capture/re-raise form: adds `rename_error: OSError | None = None`,
the `except OSError as caught_rename_error:` capture, and the trailing
`if rename_error is not None: raise rename_error from error`, keeping the
`finally` cleanup (`except OSError`) byte-identical. Because the pre-Green
runner is Git-committed at `bff014ae25971a1e378917868dd85d5dc0a02d9a4eebd6a4329e3520deb3f0f4`,
`git diff` itself is the byte-reconstruction proof: exactly one hunk, five
insertions, zero other changes. The pre-seal wrapped block remains
byte-unchanged at `390fcc79c193b7476a4c51db8f39c42418ab68e222a4d35787924de74063850d`;
the bare-form prefix count fell 1 to 0 and the wrapped form now occurs twice
with distinct following context, as the baseline required.

## Focused suite

The fourteen focused tests — `test_preseal_failed_attempt_preserves_terminality_without_sealed_integration`,
`test_production_materialize_failure_persists_real_preseal_terminal_carrier`,
`test_preseal_materialize_failure_evidence_validation_is_private_atomic_and_leaves_no_partial_attempt`,
`test_preseal_materialize_failure_evidence_rename_failure_cleans_reservation_and_retains_cause`,
`test_preseal_materialize_failure_evidence_collision_preserves_existing_attempt_and_retains_cause`,
`test_preseal_materialize_failure_evidence_raw_copy_failure_cleans_private_stage_and_retains_cause`,
`test_preseal_materialize_failure_evidence_json_write_failure_cleans_private_stage_and_retains_cause`,
`test_preseal_materialize_failure_evidence_staging_cleanup_failure_does_not_mask_original_failure`,
`test_preseal_materialize_failure_evidence_reservation_cleanup_failure_does_not_mask_original_failure`,
`test_candidate_failure_evidence_validation_is_private_atomic_and_leaves_no_partial_attempt`,
`test_candidate_failure_evidence_reservation_cleanup_failure_does_not_mask_original_failure`,
`test_candidate_failure_evidence_json_write_failure_cleans_private_stage_and_retains_cause`,
`test_candidate_failure_evidence_collision_preserves_existing_attempt_and_retains_cause`,
and the new `test_candidate_failure_evidence_rename_failure_cleans_reservation_and_retains_cause` —
passed in-loop via
`python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -q -k "preseal or production_materialize or candidate_failure_evidence"`:
`14 passed, 42 deselected in 21.47s`. All selected tests are no-Podman
monkeypatched/in-memory gates; the opt-in pinned-image gate is separately
environment-gated and unaffected.

## Exclusions

This accepts only the candidate-publisher rename causality wrap. It does not
accept: successful candidate publication, candidate contents, any other
candidate/pre-seal/generic variant, H3/H4/H5/R1-v3-wide acceptance, a runner
commit decision beyond the recorded atomic slice commits, or any
Podman/candidate/Finance/marker/registry/successor/V2/history action. Phase
R1 v3 remains `[~]`; R2 Tasks 3-5 and all R3 tasks remain `[b]`.

## Note on execution

The Red test, baseline, and Green hunk were produced by a delegated worker
whose final report was lost; every gate (Red failure mode, Green hunk identity
against the committed pre-Green runner, frozen hashes, and the 14-test suite)
was independently re-verified in-loop by the orchestrator before this
acceptance, and the orchestrator authored this receipt and the plan addendum.
