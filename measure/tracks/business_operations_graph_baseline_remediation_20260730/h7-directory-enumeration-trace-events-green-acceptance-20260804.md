# H7 Directory-Enumeration Trace Events Green Acceptance

## Scope

This receipt accepts only the directory-enumeration event seam: the new
`DIRECTORY_ENUMERATION` trace event kind, the declared directory-enumeration
set carried in the read-set contract (hash-bound, nonce-bound), the in-container
wrapper's `readdir` classification against that declared set, the parser's
fourth `directoryEnumerations` bucket, and the trace validator's exact bijection
over the declared set. It closes the live finding in
`/tmp/opencode/r1v3-attempt-20260804-c.log` where the standard-pack generator's
1,895 `readdir` directory enumerations were emitted with a kind the parser
rejects (`V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_TRACE_EVENT_INVALID` at
`parse_direct_command_runtime_trace_events_v1`). It does not accept any
candidate rerun, any trace-policy truncation/duplicates or tracer ordinal-guard
change, any discovery-artifact or `discover_direct_command_runtime_read_set_v1`
output-shape change, any H6 cap-formula change, any generator change, any
marker or successor change, or any Podman action.

Acceptance authority is in-loop single-authority per `AGENTS.md` "Implement
high-risk work in-loop (… Measure acceptance …)". All gate runs below were
executed directly in this loop against the real runner and the real test file.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Green runner SHA-256 | `198f26102d2c94aefd8dc3cb41d8dcb89741ac04b9c1a4d2227ec5466ef90166` |
| Frozen test SHA-256 | `93cc1b791850fb131ce649a4644a2edd909d202c189232cc1b3e37aefae897bd` |
| Pre-Red runner SHA-256 (H8 Green, baseline) | `77d38e5e4911ea0bc2a32bf935ab596914eb4f01c0b4fe006b6f759784d05516` |
| Reconstructed pre-Green runner | `77d38e5e4911ea0bc2a32bf935ab596914eb4f01c0b4fe006b6f759784d05516` (byte-for-byte) |
| New H7 tests, Red run | 4 failed in `17.86s`, each at `V3_DIRECT_RUNTIME_READ_SET_READ_SET_INVALID` |
| New H7 tests, Green run | 4 passed (3 in `9.82s` via `-k directory_enumeration`, 1 in `3.70s` via `-k unknown_trace_event_kind`) |
| Focused 21-test suite, Green run | 21 passed in `40.38s` (the 17-test H1-H8 selection + the four H7 tests) |
| Runner delta vs reconstructed pre-Green | 19 hunks, `+49/-3` |
| Test delta vs pre-Red | Pure addition: one fixture helper + four test methods (+290 lines), no existing line changed |
| Trailing-whitespace check | clean on both files (verified with an independent scan, no git used) |

The frozen test SHA-256 equals the Post-Red hash recorded in
`h7-directory-enumeration-trace-events-pre-green-baseline-20260804.md`, so the
test surface is unchanged since the Red slice. The reconstructed pre-Green
runner equals the pre-Red runner SHA-256 pinned in that baseline byte-for-byte,
so the Green slice's pre-state is exact and its delta is attributable.

## Defect fixed

The in-container tracer wrapper's `record()` classified every traced path
against `baselineByPath` then `derivedByPath` and fell through to
`append("UNDECLARED", …)`. A directory is in neither map, so all 1,895 `readdir`
directory enumerations the standard-pack generator performs
(`discovery.directoryListingCount`, attempts
`r1-v3-podman-execution-attempt-20260804-0002/-0003`) classified as `UNDECLARED`
and the parser rejected the trace with
`V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_TRACE_EVENT_INVALID`. H6 had already
budgeted the readdir events in the cap and H8 had already made the resulting
phase-level failure publish preserved evidence; H7 makes the parser accept the
events and validate them against a declared set, so a traced attempt can
actually pass.

## Green delta

The H7 runner delta (19 hunks, `+49/-3`):

1. `_direct_runtime_validate_read_set_shape_v1` admits an optional top-level
   `directoryEnumerations` (sorted, unique, safe paths under the discovery
   root, count equal to `directoryListingCount`). Absence remains valid, so the
   frozen `discover_direct_command_runtime_read_set_v1` output shape and every
   legacy fixture read-set are byte-unchanged; the exact-key-set gate became a
   bounded superset gate (`+1/-1` line on that guard).
2. `build_direct_command_runtime_read_set_contract_v1` carries
   `directoryEnumerations` (default `[]`) next to
   `baselineReadSet`/`derivedBuildReadSet`/`outputPaths`, which makes the
   declared set nonce-bound through the existing
   `sha256(canonical({readSetContract, sourcePacketSha256}))` computation and
   hash-bound inside the canonical contract digest.
3. `validate_direct_command_runtime_execution_trace_v1` enforces an exact
   four-member bijection: the three existing members keep their exact equality
   and a fourth `directoryEnumerations` member (absent means `[]`) must equal
   `[{"path": p} for p in expected_contract["directoryEnumerations"]]`; extra
   trace keys still fail closed with `EXECUTION_TRACE_BIJECTION_FAILED`.
4. `parse_direct_command_runtime_trace_events_v1` adds the
   `DIRECTORY_ENUMERATION` kind to the fourth `directory_enumerations` bucket
   with the identical ordinal/nonce/duplicate discipline, and normalizes every
   bucket to sorted-by-path order so the trace satisfies the sorted contract
   lists the real generator's unsorted event stream produces. Unknown kinds
   still fail `TRACE_EVENT_INVALID`.
5. The `direct-runtime-fs-promises-wrapper.mjs` text validates
   `config.directoryEnumerations`, builds the declared set, classifies
   `readdir` operations against it (`DIRECTORY_ENUMERATION` when declared,
   `UNDECLARED` otherwise), and keeps every other operation byte-identical.
6. The two trace-config writers (`_runner_scripts` and
   `_derive_trace_execution_context`) carry `directoryEnumerations` from the
   integration read set into the in-container trace config.
7. `DirectCommandRuntimeProductionExecutorV1.post_build_identity` emits
   `directoryEnumerations = sorted(directories)` in the production read set, so
   the declared set and `directoryListingCount` agree by construction (1,895 in
   the live attempts).

The H6 cap line (runner line 2970) is byte-unchanged: `readdir` events still
count toward `maxEvents` through
`validated_read_set["discovery"]["directoryListingCount"]`. No happy-path,
pre-seal, candidate, phase-level, discovery-output, generator, or
trace-policy truncation/duplicates behavior changed.

## Anchored reconstruction proof

- Reversing only the fifteen H7 runner edits reconstructs the complete
  pre-Green runner at
  `77d38e5e4911ea0bc2a32bf935ab596914eb4f01c0b4fe006b6f759784d05516`
  byte-for-byte (verified; the pre-Green runner is exactly the pinned pre-Red
  runner). The Green runner diff against that reconstruction is exactly
  19 hunks, `+49/-3`.
- The frozen test SHA-256 (`93cc1b79…`) is byte-identical since the Red slice
  (pure addition of one fixture helper and four test methods, +290 lines).
- `test_direct_command_runtime_read_set_discovery_binds_full_fixture_tree`
  (the byte-exact read-set output pin) passes unchanged in the Green run,
  proving the discover output shape was not touched.

## Focused suite definition

All twenty-one names are in
`measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests`.
The first seventeen are the unchanged H1-H6/H8 selection
(`preseal`/`production_materialize`/`candidate_failure_evidence`/
`trace_event_cap`/`trace_capture_failure_evidence`); the four new H7 names are:

1. `test_directory_enumeration_events_parse_and_validate_against_declared_set`
2. `test_undeclared_directory_enumeration_is_rejected_by_trace_validation`
3. `test_unknown_trace_event_kind_is_still_rejected_by_parser`
4. `test_duplicate_directory_enumeration_is_rejected_by_parser`

No Podman or pnpm command was run by the four H7 tests; the pinned-podman
acceptance test (`test_direct_runtime_tracer_child_only_pinned_podman_acceptance`,
pre-existing, unaffected) was not part of the focused receipt.

## Observed behavior

All four new tests build one sealed integration through the real builder: a
read-set carrying `directoryEnumerations = [<root>, <root>/audio]` with
`discovery.directoryListingCount: 2`, a real source packet, and a real nonce.
The trace is driven through the real `capture_direct_command_runtime_in_container_trace_v1`
and `parse_direct_command_runtime_trace_events_v1` seams:

- `test_directory_enumeration_events_parse_and_validate_against_declared_set`:
  six raw events (two `BASELINE_READ`, one `DERIVED_BUILD_READ`, one `WRITE`,
  two `DIRECTORY_ENUMERATION`) emitted in non-sorted generator order parse into
  the exact four-member trace — `directoryEnumerations` equals
  `[{"path": <root>}, {"path": <root>/audio}]` — and the real
  `validate_direct_command_runtime_execution_trace_v1` passes; the contract
  carries the declared set.
- `test_undeclared_directory_enumeration_is_rejected_by_trace_validation`: one
  enumeration path replaced with `<root>/UNDECLARED-dir` parses (kind accepted)
  and the parser's embedded exact-bijection validation rejects it with
  `V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED`.
- `test_unknown_trace_event_kind_is_still_rejected_by_parser`: kind
  `NOT_A_DIRECTORY_KIND` still fails `TRACE_EVENT_INVALID` — the widening did
  not over-accept. This test is a regression guard: it is green pre-fix because
  unknown kinds were always rejected, and remains green post-fix, proving the
  accepted-kind set is exactly the four declared kinds.
- `test_duplicate_directory_enumeration_is_rejected_by_parser`: the same
  `DIRECTORY_ENUMERATION` kind-and-path pair at a later ordinal fails
  `TRACE_DUPLICATE`, identical to the other kinds.

## Full-file verification

The entire 66-test module was run once against the Green runner: **56 passed,
9 failed, 1 skipped** in 682.20s (0:11:22). To prove the nine failures are
pre-existing and not attributable to this slice, the identical full module was
also run once against the byte-reconstructed pre-Green runner
(`77d38e5e...`): **52 passed, 13 failed, 1 skipped** in 525.31s (0:08:45). The
failure sets differ by exactly the four new H7 tests — they fail pre-fix and
pass post-fix — and the other nine failures are byte-identical in both runs:

1. `test_direct_command_runtime_attempt_preserves_missing_script_blocker` —
   documented F2: the live generator worktree hash differs from the frozen
   baseline blob hash, a permanent failure on every version bump (plan line 591).
2. `test_direct_runtime_tracer_requires_exact_generator_child_inheritance` —
   H2-era source assertion drift (`[CONTAINER_NODE, logical[1]]` vs
   `[CONTAINER_NODE, script["resolvedPath"]]`); `generate` is byte-identical
   pre/post H7 (proven by the reconstruction).
3. `test_noninstall_pnpm_executor_validator_rejects_payload_environment_and_executor_drift` —
   documented F4: `V3_PNPM_NONINSTALL_EXECUTOR_INVALID` (plan line 592).
4. `test_production_executor_generation_uses_sealed_direct_node_payload_only` —
   H2-era generation-context drift
   (`V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_PRODUCTION_GENERATION_CONTEXT_UNBOUND`);
   `generate` and the executor constructor are byte-identical pre/post H7.
5. `test_profile_rebuilds_exports_and_receipt_replays_exact_isolated_commands`
6. `test_v3_manifest_and_ledger_bind_the_addendum_and_mechanical_omissions`
7. `test_v3_podman_network_boundary_is_route_proven_for_all_execution`
8. `test_v3_regenerates_graph_audit_and_compensation_from_the_fresh_closure`
9. `test_v3_sol_materialization_gates_bind_only_a_candidate`

Tests 5-9 all abort in `_load_v3` at
`V3_EXECUTION_CLOSURE_MANIFEST_MISSING: r1-v3-execution-closure-20260801/execution-closure.manifest.json`
— the frozen V3 candidate directory is absent from this working tree, so every
test that validates the candidate artifacts fails regardless of the runner.
None of the nine involves the H7 seam; the comparison run is the proof.

## Authorship

The Red test methods, the fixture, the declared-set derivation, the Green
delta, the anchored reconstruction, and every gate run were performed in-loop
for this slice against the real runner and the real test file.

## Decision and exclusions

**ACCEPT** -- bounded only to the directory-enumeration event seam at Green
runner SHA-256
`198f26102d2c94aefd8dc3cb41d8dcb89741ac04b9c1a4d2227ec5466ef90166` and frozen
test SHA-256 `93cc1b791850fb131ce649a4644a2edd909d202c189232cc1b3e37aefae897bd`.

Excluded: no candidate rerun or closure attempt; no trace-policy semantic
change (truncation/duplicates policies and the tracer ordinal guard remain
byte-unchanged); no discovery-artifact or `discover_direct_command_runtime_read_set_v1`
output-shape change; no H6 cap-formula change (`readdir` events still count
toward the cap through `directoryListingCount`); no generator change; no
pre-seal/candidate/phase-level carrier or publisher change; no marker change
(Phase R1 v3 remains `[~]`); no successor, registry, V2/history, Finance, or
Podman action. A confirming closure attempt is still required before any
candidate claim; the D4 discrepancy between the baseline-tree ancestor count
(1,911) and discovery's `directoryListingCount` (1,895) remains a separate
discovery-walk finding, and any traced directory the generator enumerates
outside the declared set will now fail with a precise
`EXECUTION_TRACE_BIJECTION_FAILED` naming the undeclared path. The runner and
test work remains uncommitted shared R1-v3 work.
