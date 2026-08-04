# H6 Trace-Event Cap Generator-Ancillary Coverage Green Acceptance

## Scope

This receipt accepts only the widening of the trace-event cap computation in
`build_direct_command_runtime_runner_integration_v1` to include the generator's
directory-enumeration events, closing the D4 task from plan line 594. It does
not accept any candidate rerun, any trace-policy semantic change, any marker or
successor change, or any Podman action.

Acceptance authority is in-loop single-authority per `AGENTS.md` "Implement
high-risk work in-loop (… Measure acceptance …)". All gate runs below were
executed directly in this loop against the real runner and the real test file.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Green runner SHA-256 | `cf8f7b9ab980568dfd40bc7ee17f111580d6de4c757e96b695e172bab859af4a` |
| Frozen test SHA-256 | `0de7865de04d1b828ceb356b96a0449f3ac148db68a630c65f6ad77bccf34a66` |
| Frozen block SHA-256 (pre-Green runner lines 2970-2972, 222 bytes) | `b7c818bf7f63f42f59bcc3dab06d410dc941fdf4e4a6e05d0177c91b10424272` |
| Reconstructed pre-Green runner | `cb06deb7dc40cfba73ed6a4957d878257eae5e7d1eb165bc0471b3d3b425fb69` |
| New H6 test, Red run | 1 failed in `2.20s` (`AssertionError: 5 not greater than or equal to 1900`) |
| New H6 test, Green run | 1 passed in `1.64s` |
| Focused 14-test suite, Green run | 14 passed in `12.29s` (`-k "preseal or production_materialize or candidate_failure_evidence"`) |
| Runner delta | One hunk, `+65/-0` bytes on the single `max_events` line (`1 insertion(+), 1 deletion(-)`) |
| Test delta | Pure addition: 141 inserted lines (one named constant block + one test method) |
| Source check | Anchored whole-file reconstruction passed; `git diff --check` clean |

The frozen test SHA-256 equals the Post-Red hash recorded in
`h6-trace-event-cap-pre-green-baseline-20260804.md`, so the test surface is
unchanged since the Red slice. The reconstructed pre-Green runner also equals
the pre-Red runner SHA-256 pinned in that baseline, so the Green slice's
pre-state is byte-exact and its delta is attributable.

## Defect fixed

The trace-event cap was a count of distinct declared file paths
(`len(baselineReadSet) + len(derivedBuildReadSet) + len(outputPaths)`), while
the in-container tracer records one event per `node:fs/promises` operation.
The generator's recursive `discoverAssets()` issues one `readdir` event per
directory under `assets/standard` (1,895 per `discovery.directoryListingCount`
in blocked attempts `r1-v3-podman-execution-attempt-20260804-0002/-0003`), and
none of those events was budgeted, so the tracer aborted with
`Error: raw trace event cap exceeded`. The complete per-run fs-operation
enumeration (3 receipt reads, 43,075 asset reads, 1,895 readdir enumerations,
1 release-JSON write, and no doc reads - the `ignoredExtensions` set on
generator line 15 excludes `.md`/`.txt` docs from every `readFile`) is
recorded with script line refs in the baseline receipt. Only the readdir
events are un-budgeted: the receipts, asset reads, and write are already
declared inside `baselineReadSet` and `outputPaths`.

## Green delta

The sole runner change widens the authorized cap line (runner line 2970) by
deriving the missing quantity from the read set the runner already carries -
the same unit discovery measures (`directoryListingCount`, populated from
`len(discovery["directoryListings"])` at runner line 965):

    max_events = len(baseline_read_set) + len(validated_read_set["derivedBuildReadSet"]) + len(validated_read_set["outputPaths"]) + validated_read_set["discovery"]["directoryListingCount"]

The cap remains deterministic and read-set-derived; the
`if max_events <= 0:` guard and `TRACE_EVENT_CAP_INVALID` failure are
byte-unchanged. No tracer, trace-policy (`truncation: "REJECT"`,
`duplicates: "REJECT"`), parser, validator, discovery, runner-script, or
generator behavior was altered.

## Anchored reconstruction proof

The baseline records that content-only replacement is valid: the pre-Green
frozen 3-line block (SHA-256 `b7c818bf...`, 222 bytes) is the authorized
surface and occurs exactly once. The required checks were performed and
passed:

- The frozen block occurs exactly once in the pre-Green runner (lines
  2970-2972) and falls to zero occurrences in the Green runner, the expected
  signature of the widening.
- Replacing only the widened line with the frozen line reconstructs the
  **complete** pre-Green runner at
  `cb06deb7dc40cfba73ed6a4957d878257eae5e7d1eb165bc0471b3d3b425fb69` exactly
  (verified byte-for-byte; the widened line occurs exactly once in the Green
  runner).
- The `if max_events <= 0:` guard and the `TRACE_EVENT_CAP_INVALID` failure
  lines are byte-identical before and after.
- `git diff --check` is clean and `git diff` on the runner shows exactly the
  one hunk (`1 insertion(+), 1 deletion(-)`).

Therefore this slice is bytewise attributable and every other runner byte is
proven unchanged between the baseline and Green states. This does not
reconstruct or attribute cumulative runner history preceding `cb06deb7...`,
authorize a runner commit, or provide cumulative R1-v3 attribution.

## Focused suite definition

All fourteen names are in
`measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests`
and match the shared no-Podman `preseal`/`production_materialize`/
`candidate_failure_evidence` selection:

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
11. `test_candidate_failure_evidence_collision_preserves_existing_attempt_and_retains_cause`
12. `test_candidate_failure_evidence_rename_failure_cleans_reservation_and_retains_cause`
13. `test_candidate_failure_evidence_reservation_cleanup_failure_does_not_mask_original_failure`
14. `test_candidate_failure_evidence_json_write_failure_cleans_private_stage_and_retains_cause`

No Podman or pnpm command was run; the suite exercises only the no-Podman
runner/test surfaces.

## Observed behavior

The new Red test builds one minimal integration through the real read-set
shape validator, source-packet digest binding, and resource-budget binding,
then proves `tracePolicy.maxEvents` covers
`len(baselineReadSet) + len(derivedBuildReadSet) + len(outputPaths)` plus the
enumerated 1,895 generator directory-enumeration events (named constant
`H6_GENERATOR_ANCILLARY_DIRECTORY_ENUMERATION_EVENTS`). Against the old
formula the fixture cap was `5` and the assertion failed; against the Green
formula the fixture cap is `1900` (3 baseline + 1 derived + 1 output + 1,895
directory enumerations) and the assertion passes. For the real standard pack
the widened cap re-derived in-loop is `43,081 + 1,895 = 44,976`, above the
measured ≈44,974 operation total. The fourteen previously accepted
pre-seal/candidate slices remain Green in the same run.

## Authorship

The Red test method, the fixture, the enumeration, the disambiguation, the
Green delta, the anchored reconstruction, and every gate run were performed
in-loop for this slice against the real runner and the real generator script.

## Decision and exclusions

**ACCEPT** -- bounded only to the trace-event cap widening inside
`build_direct_command_runtime_runner_integration_v1` at Green runner SHA-256
`cf8f7b9ab980568dfd40bc7ee17f111580d6de4c757e96b695e172bab859af4a` and frozen
test SHA-256 `0de7865de04d1b828ceb356b96a0449f3ac148db68a630c65f6ad77bccf34a66`.

Excluded: no candidate rerun or closure attempt; no trace-policy semantic
change (truncation/duplicates policies, tracer ordinal guard, trace-event
parser, and the `UNDECLARED`-classification design decision raised as D4-b in
`d4-apk-generator-read-profile-handoff-20260804.md` all remain untouched); no
discovery or read-set contract change; no generator change; no marker change
(Phase R1 v3 remains `[~]`); no successor, registry, V2/history, Finance, or
Podman action. A confirming closure attempt is still required before any
candidate claim, and the `UNDECLARED` readdir classification must be settled
as a separate design decision before a traced attempt can fully validate. The
runner and test work remains uncommitted shared R1-v3 work.
