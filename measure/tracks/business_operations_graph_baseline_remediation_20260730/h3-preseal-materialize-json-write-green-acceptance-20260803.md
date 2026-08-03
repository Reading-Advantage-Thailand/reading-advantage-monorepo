# H3 Pre-Seal Materialize JSON-Write Green Acceptance

## Scope

This receipt accepts only one `failed-attempt.json` write failure inside the
retained pre-seal materialize publisher. It does not accept successful
publication, another publisher failure, another pre-seal stage, candidate paths,
or broader H3 through R1 work.

Acceptance authority is in-loop per `AGENTS.md` "Implement high-risk work
in-loop (… Measure acceptance …)". All gate runs below were executed directly in
this loop against the real runner and the frozen test.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Green runner SHA-256 | `99e096bda4dc5748efef4a12ad9dd8e46394a55482598705d17bd79267d4ab94` |
| Frozen test SHA-256 | `f02b207eea0e737a15e397f521eaea29114bc7162bc418d8c7020629e91dbaa7` |
| Focused suite, guarded run | Eight tests passed in `2.470s`, zero podman invocations |
| Focused suite, run 2 | The same eight passed in `1.867s` |
| Focused suite, run 3 | The same eight passed in `2.075s` |
| Reconstructed pre-Green runner | `9f5ad52728c4c3c01ec1d9ff210de35f11ec82a0da3ebd656ab92944ae763b97` |
| Frozen anchor artifact | `ca754ecf23d8838b24f517a0a3438a604b1462d57c055e9fb930a9d8e1d71070` |
| Runner delta | One hunk, `+107` bytes |
| Source check | Anchored whole-file reconstruction passed |

The frozen test SHA-256 equals the Post-Red hash recorded in
`h3-preseal-materialize-json-write-pre-green-baseline-20260803.md`, so the test
surface is unchanged since commit `7675a6ea1` and the Green runs exercised the
exact frozen contract.

## Focused suite definition

Extends the enumerated list fixed by the raw-copy receipt to eight, adding item
7. All names are in
`measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests`:

1. `test_preseal_failed_attempt_preserves_terminality_without_sealed_integration`
2. `test_production_materialize_failure_persists_real_preseal_terminal_carrier`
3. `test_preseal_materialize_failure_evidence_validation_is_private_atomic_and_leaves_no_partial_attempt`
4. `test_preseal_materialize_failure_evidence_rename_failure_cleans_reservation_and_retains_cause`
5. `test_preseal_materialize_failure_evidence_collision_preserves_existing_attempt_and_retains_cause`
6. `test_preseal_materialize_failure_evidence_raw_copy_failure_cleans_private_stage_and_retains_cause`
7. `test_preseal_materialize_failure_evidence_json_write_failure_cleans_private_stage_and_retains_cause`
8. `test_candidate_failure_evidence_validation_is_private_atomic_and_leaves_no_partial_attempt`

"No-Podman" was proven, not asserted: `subprocess.run`, `call`, `check_call`,
`check_output`, and `Popen` were wrapped with a guard recording any argv
containing `podman`; the guarded run recorded zero invocations.

## Green delta

The sole runner change wraps the authorized `_write_json` call in
`_publish_failed_attempt`:

    try:
        _write_json(directory / "failed-attempt.json", attempt)
    except OSError as json_write_error:
        raise json_write_error from error

No finalizer, raw-copy, validator, cleanup, staging, classification, schema,
reservation, rename, or `preserve_failure` routing behavior was altered.

## Anchored reconstruction proof

The baseline records that the authorized line is **not unique**: the identical
byte sequence also appears at line 6812 inside
`_publish_candidate_publication_failure_attempt`, so a content-only replacement
check is invalid. The required anchored check was performed and passed:

- The Green anchor block occurs exactly once in the Green runner.
- Replacing only that block with the committed two-line frozen anchor
  reconstructs the **complete** pre-Green runner at
  `9f5ad52728c4c3c01ec1d9ff210de35f11ec82a0da3ebd656ab92944ae763b97`, matching
  the baseline exactly.
- Line 6812 is byte-unchanged, and the whole candidate-publisher region
  (lines 6800-6816) is byte-identical to baseline.
- All lines before the hunk and all lines after it are byte-identical.
- The frozen line still occurs exactly twice in the runner, as in baseline.

Therefore this slice is bytewise attributable and every other runner byte is
proven unchanged between the baseline and Green states. This does not
reconstruct or attribute cumulative runner history preceding `9f5ad527...`,
authorize a runner commit, or provide cumulative R1-v3 attribution.

The runner remains untracked, so no Git object backs either state; both are
verified by content hash only. Separately,
`measure/business_operations_graph_baseline_execution_closure.py` is an
untracked shared helper with no recorded pre-Green byte baseline; the Green runs
exercised its current real behavior, but no historical byte identity is claimed
for it.

## Observed behavior

The real `materialize` to `preserve_failure` to `_publish_failed_attempt` path
completes both raw receipt copies into its private canonical leaf, then takes
the deterministic `_write_json` OSError against `failed-attempt.json` while that
JSON is still absent under the private `.failed-attempt-` staging parent. The
caught JSON-write error now retains the original materialize error as its
explicit `__cause__`. The outer failure remains exactly
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: materialize: V3_TEST_PRESEAL_FAILURE_EVIDENCE_JSON_WRITE`.
The validator is never called, no public attempt is exposed, no reservation or
rename occurs, and no private raw or staging residue remains. Candidate,
generic-publisher, Podman, trace, build, and generation paths are unreachable
from this failure. The five previously accepted pre-seal slices and the H5
candidate regression remain Green in the same runs.

## Authorship

The Red test method was transcribed by a `reasonix` delegate from the accepted
raw-copy exemplar under a fixed contract; its sandboxed bash was refused, so it
ran no gates and its verification claims were file reads only. The diff was
independently confirmed purely additive (one hunk, 180 insertions, zero
deletions), the DONE-WHEN greps were re-run in-loop, and the fault design, Green
delta, anchored reconstruction, and every test run were performed in-loop.

## Decision and exclusions

**ACCEPT** -- bounded only to one `failed-attempt.json` write failure inside
retained pre-seal materialize evidence at Green runner SHA-256
`99e096bda4dc5748efef4a12ad9dd8e46394a55482598705d17bd79267d4ab94` and frozen
test SHA-256 `f02b207eea0e737a15e397f521eaea29114bc7162bc418d8c7020629e91dbaa7`.

Phase R1 v3 remains `[~]`, and the cumulative runner and test work remains
uncommitted. This does not accept validator or cleanup-failure injection;
successful publication; the frozen candidate-publisher `_write_json` at line
6812; other pre-seal stages or generic variants; candidate paths; H3/H4/H5 or
R1-v3-wide acceptance; a runner commit; or any Podman, candidate, Finance,
marker, registry, successor, V2, or historical-evidence action. A later
cumulative runner acceptance must review a full reachable diff from a committed
or reconstructible baseline; this receipt cannot substitute for it.
