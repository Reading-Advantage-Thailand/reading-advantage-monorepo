# H5 Candidate-Publisher JSON-Write Causality Green Acceptance

## Scope

This receipt accepts only one `failed-attempt.json` write failure inside the
candidate publisher `_publish_candidate_publication_failure_attempt`, closing
review finding CAND-3 (Medium) from
`r1-v3-candidate-publisher-causality-independent-review-20260803.md`. It does
not accept successful publication, another candidate/pre-seal/generic variant,
candidate path contents, the CAND-1 rename or CAND-2 collision causality
variants, or broader H3/H4/H5 through R1 work.

Acceptance authority is in-loop single-authority per `AGENTS.md` "Implement
high-risk work in-loop (… Measure acceptance …)". All gate runs below were
executed directly in this loop against the real runner and the frozen test.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Green runner SHA-256 | `e52859d6b4f01c374662f33c6af97a21643ce6a8f344d7d2a0e2de8ae6051cb2` |
| Frozen test SHA-256 | `4bd0a875ba002781138c30ea0197b79656a42f5d6e7452599b8dbb264592dd46` |
| Focused suite, guarded run 1 | Twelve tests passed in `9.74s`, zero subprocess/podman invocations |
| Focused suite, guarded run 2 | The same twelve passed in `7.96s`, zero subprocess/podman invocations |
| Focused suite, guarded run 3 | The same twelve passed in `10.08s`, zero subprocess/podman invocations |
| Reconstructed pre-Green runner | `4f1eb6a34c946f101791a26cf090f68cfffc360000a57974015947f44feec1c3` |
| Frozen line artifact | `dce45138d4a2347ccfcec49e2c206b7092c027724817311c88b8ee9ced58876f` |
| Pre-Red disambiguation anchor | `62dd09767a7ef099d238d9cdf5f96832730857a8bc5e5e42714cb0eb62e7fed2` |
| Frozen pre-seal wrapped block | `c5b1563bcbc8898d1ae40037675f8971461039b4fc236893b5ac864a30c600ea` |
| Runner delta | One hunk, `+107` bytes |
| Source check | Anchored whole-file reconstruction passed; `git diff --check` clean |

The frozen test SHA-256 equals the Post-Red hash recorded in
`h5-candidate-json-write-causality-pre-green-baseline-20260803.md`, so the test
surface is unchanged since the Red slice. The reconstructed pre-Green runner
also equals the pre-Red runner SHA-256 pinned in that baseline and the committed
HEAD blob, so the Green slice's pre-state is byte-exact and reachable.

## Defect fixed

This slice closes a real causality defect found by independent review, not a
coverage gap. Before the fix, an OSError from `_write_json` inside the candidate
publisher propagated bare: the in-flight candidate-operation failure was
detached from the raised error's causal chain, so operators could not see what
actually failed. The pre-seal path already had the accepted
`try/except OSError as json_write_error: raise json_write_error from error`
pattern; the committed Red proved the candidate-publisher mechanism concretely:
`json_write_error.__cause__` was `None` (`AssertionError: None is not
OSError('V3_TEST_CANDIDATE_FAILURE_EVIDENCE_OPERATION')`).

## Green delta

The sole runner change wraps the authorized candidate-publisher `_write_json`
call in exactly the accepted pre-seal pattern:

    try:
        _write_json(directory / "failed-attempt.json", attempt)
    except OSError as json_write_error:
        raise json_write_error from error

No validator, reservation, collision, rename, cleanup, staging, schema,
carrier, message, or `preserve_failure` routing behavior was altered, and the
pre-seal wrapped block is byte-unchanged.

## Anchored reconstruction proof

The baseline records that content-only replacement is invalid: the authorized
8-space byte sequence occurs as a full line exactly once (line 6812 in the
candidate publisher) and as a substring of the frozen 12-space pre-seal line.
After Green, the wrapped candidate-publisher block is byte-identical to the
pre-seal wrapped block, so disambiguation must use the longer unique context.
The required checks were performed and passed:

- The pre-Red 5-line disambiguation anchor at SHA-256
  `62dd09767a7ef099d238d9cdf5f96832730857a8bc5e5e42714cb0eb62e7fed2` occurs
  exactly once in the pre-Red runner and falls to zero occurrences in the Green
  runner (both `_write_json` lines are now 12-space), the expected signature of
  the wrap.
- The Green-state unique context (the wrapped block plus the following
  `validate_failed_execution_attempt_v1(attempt, directory)`, `try:`,
  `final_directory.mkdir()`, `except FileExistsError:`, and the candidate
  publisher's `_fail("V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION", attempt_name)`
  tail) occurs exactly once.
- Replacing only that context's wrapped block with the frozen line
  reconstructs the **complete** pre-Green runner at
  `4f1eb6a34c946f101791a26cf090f68cfffc360000a57974015947f44feec1c3` exactly.
- The pre-seal wrapped block remains byte-unchanged at SHA-256
  `c5b1563bcbc8898d1ae40037675f8971461039b4fc236893b5ac864a30c600ea`.
- The 8-space frozen line as a full line falls from 1 to 0, and as a substring
  still occurs exactly twice (inside both wrapped blocks).

Therefore this slice is bytewise attributable and every other runner byte is
proven unchanged between the baseline and Green states. This does not
reconstruct or attribute cumulative runner history preceding `4f1eb6a3...`,
authorize a runner commit, or provide cumulative R1-v3 attribution.

## Focused suite definition

All twelve names are in
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

"No-Podman" was proven, not asserted, on all three runs by the subprocess guard
over `run`, `Popen`, `call`, `check_call`, and `check_output`: every one of the
three runs recorded zero subprocess invocations and therefore zero podman
invocations.

## Observed behavior

The real candidate `preserve_failure` to
`_publish_candidate_publication_failure_attempt` path reaches the deterministic
`_write_json` OSError against `failed-attempt.json` while that JSON is still
absent under the private `.candidate-publication-failure-` staging parent (the
candidate publisher performs no raw receipt copies, and the test mirrors that
actual structure). The caught JSON-write error now retains the original
candidate-operation error as its explicit `__cause__`. The outer failure remains
exactly
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: candidate-publication: V3_TEST_CANDIDATE_FAILURE_EVIDENCE_JSON_WRITE`.
The validator is never called, no public attempt is exposed, no reservation,
rename, or replace occurs, and no private raw or staging residue remains.
Generic-publisher, Podman, trace, build, and generation paths are unreachable
from this failure. The eleven previously accepted pre-seal/candidate slices and
the new candidate JSON-write regression remain Green in the same runs.

## Authorship

The Red test method, the fault design, the disambiguation, the Green delta, the
anchored reconstruction, and every gate run were performed in-loop for this
slice against the real runner and the frozen test.

## Decision and exclusions

**ACCEPT** -- bounded only to one `failed-attempt.json` write failure inside
the candidate publisher at Green runner SHA-256
`e52859d6b4f01c374662f33c6af97a21643ce6a8f344d7d2a0e2de8ae6051cb2` and frozen
test SHA-256 `4bd0a875ba002781138c30ea0197b79656a42f5d6e7452599b8dbb264592dd46`.

Phase R1 v3 remains `[~]`, and the cumulative runner and test work remains
uncommitted shared R1-v3 work. This does not accept the CAND-1 rename or CAND-2
collision causality variants (separate slices); successful publication; other
candidate/pre-seal/generic variants; candidate path contents; H3/H4/H5 or
R1-v3-wide acceptance; a runner commit; or any Podman, candidate, Finance,
marker, registry, successor, V2, or historical-evidence action. A later
cumulative runner acceptance must review a full reachable diff from a committed
or reconstructible baseline; this receipt cannot substitute for it.
