# H3 Pre-Seal Materialize Raw-Copy Green Acceptance

## Scope

This receipt accepts only one stderr raw-copy failure inside the retained
pre-seal materialize publisher. It does not accept successful publication,
another publisher failure, another pre-seal stage, candidate paths, or broader
H3 through R1 work.

Acceptance authority is in-loop per `AGENTS.md` "Implement high-risk work
in-loop (… Measure acceptance …)". Both gate runs below were executed directly
in this loop against the real runner and the frozen test; no delegate report is
relied upon.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Green runner SHA-256 | `9f5ad52728c4c3c01ec1d9ff210de35f11ec82a0da3ebd656ab92944ae763b97` |
| Frozen test SHA-256 | `54f81f425dbe65911907e8d7615e21657641b6dc926f498558906d69f9aa9cea` |
| Focused suite, run 1 | Seven tests passed in `2.932s` |
| Focused suite, run 2 | The same seven tests passed in `2.728s` |
| Focused suite, guarded run | The same seven passed in `1.788s`, zero podman invocations |
| Reconstructed pre-Green runner | `90d550c3e4c2871de6b15349fa50cfda647af25a08532ad3842f1eb36a730490` |
| Frozen call-site artifact | `957aa86ddb9c6ae2dde192a043b21ac0eca8ec9af27c7cffb3b34aa8c6183d46` |
| Runner delta | One hunk, `+119` bytes |
| Source check | Whole-file reconstruction check passed |

## Focused suite definition

Earlier receipts in this track cite a "focused no-Podman suite" by count only
(three, four, five, six) and never enumerate it. This receipt fixes the set
explicitly. All names are in
`measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests`:

1. `test_preseal_failed_attempt_preserves_terminality_without_sealed_integration`
2. `test_production_materialize_failure_persists_real_preseal_terminal_carrier`
3. `test_preseal_materialize_failure_evidence_validation_is_private_atomic_and_leaves_no_partial_attempt`
4. `test_preseal_materialize_failure_evidence_rename_failure_cleans_reservation_and_retains_cause`
5. `test_preseal_materialize_failure_evidence_collision_preserves_existing_attempt_and_retains_cause`
6. `test_preseal_materialize_failure_evidence_raw_copy_failure_cleans_private_stage_and_retains_cause`
7. `test_candidate_failure_evidence_validation_is_private_atomic_and_leaves_no_partial_attempt`

**Provenance caveat:** this set was reconstructed from the documented suite
sizes of the prior slices (five for rename, six for collision, so seven here)
plus the H5 candidate regression that the rename receipt names in prose. No
committed artifact defines the earlier suites, so continuity with them is
inferred, not proven. The seven tests above are what actually ran, and future
slices should extend this enumerated list rather than a bare count.

## "No-Podman" definition and proof

"No-Podman" means the container engine is never invoked. It is not implied by
absence of the token: in these tests `podman` is the module alias for
`measure/business_operations_graph_baseline_execution_closure_v3_podman.py`,
and `podman.PODMAN` is the constant `"/usr/bin/podman"` used only to build an
expected command payload for comparison. Podman is installed at that absolute
path, so a `PATH` shim would not prove non-invocation.

Proof: `subprocess.run`, `call`, `check_call`, `check_output`, and `Popen` were
each wrapped with a guard recording any argv containing `podman`, then the
seven tests were run under that guard. Seven passed in `1.788s` with zero
recorded podman invocations. No container, image, or network side effect was
produced.

The frozen test SHA-256 equals the Post-Red hash recorded in
`h3-preseal-materialize-raw-copy-pre-green-baseline-20260803.md`, so the test
surface is unchanged since commit `459697e3c` and the Green run exercised the
exact frozen contract.

## Green delta

The sole runner change wraps the frozen `_finalize_command` call in
`_publish_failed_attempt`:

    try:
        finalized = _finalize_command(
            failed,
            directory,
            reference_root=TRACK_DIR / attempt_name,
        )
    except OSError as raw_copy_error:
        raise raw_copy_error from error

No finalizer, cleanup, staging, classification, schema, JSON, validator,
reservation, rename, or `preserve_failure` routing behavior was altered.

## Reconstruction proof

Replacing only the eight-line Green block above with the committed five-line
frozen artifact reconstructs the **complete** pre-Green runner at SHA-256
`90d550c3e4c2871de6b15349fa50cfda647af25a08532ad3842f1eb36a730490`, matching
the baseline exactly. The Green block occurs exactly once in the file.
Therefore this slice is bytewise attributable and every other runner byte is
proven unchanged between the baseline and Green states.

This does not reconstruct or attribute cumulative runner history preceding
`90d550c3...`, authorize a runner commit, or provide cumulative R1-v3
attribution.

Separately, `measure/business_operations_graph_baseline_execution_closure.py`
is an untracked shared helper with no recorded pre-Green byte baseline. Both
Green runs exercised its current real behavior, but no historical byte
identity, unchanged-source proof, or change attribution is claimed for it.

## Observed behavior

The real `materialize` to `preserve_failure` to `_publish_failed_attempt` to
`_finalize_command` path copies only stdout into its private canonical raw
leaf, observes that leaf's unique nonempty bytes byte-for-byte, then takes the
deterministic stderr `shutil.copyfile` OSError. The caught raw-copy error now
retains the original materialize error as its explicit `__cause__`. The outer
failure remains exactly
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: materialize: V3_TEST_PRESEAL_FAILURE_EVIDENCE_RAW_COPY`.
No JSON is written, the validator is not called, no public attempt is exposed,
no rename or replace occurs, no further copy follows stderr, and no private
raw or staging residue remains. Candidate, generic-publisher, Podman, trace,
build, and generation paths are unreachable from this failure. The four
previously accepted pre-seal slices and the H5 candidate regression remain
Green in the same runs.

## Decision and exclusions

**ACCEPT** -- bounded only to one stderr raw-copy failure inside retained
pre-seal materialize evidence at Green runner SHA-256
`9f5ad52728c4c3c01ec1d9ff210de35f11ec82a0da3ebd656ab92944ae763b97` and frozen
test SHA-256
`54f81f425dbe65911907e8d7615e21657641b6dc926f498558906d69f9aa9cea`.

Acceptance is in-loop and single-authority. Prior slices in this track record a
two-party form ("Terra and Sol accepted…"), which reflects how earlier sessions
were driven rather than a requirement; `AGENTS.md` assigns Measure acceptance to
the owning loop. The evidence basis is three direct gate runs plus a whole-file
byte reconstruction performed here, not a delegate self-report.

Phase R1 v3 remains `[~]`, and the cumulative runner and test work remains
uncommitted. This records no collision, rename, JSON-write, validator, or
cleanup-failure injection; no successful publication; no other pre-seal stage
or generic variant; no candidate path; no H3/H4/H5 or R1-v3-wide acceptance;
no runner commit; and no Podman, candidate, Finance, marker, registry,
successor, V2, or historical-evidence action. A later cumulative runner
acceptance must review a full reachable diff from a committed or
reconstructible baseline; this receipt cannot substitute for it.
