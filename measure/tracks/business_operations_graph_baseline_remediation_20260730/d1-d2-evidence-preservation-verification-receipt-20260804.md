# D1/D2 Evidence-Preservation Verification Receipt (2026-08-04)

## Scope

This receipt verifies and accepts, bounded, exactly the three fixes committed as
`f8455cf51` — "fix(measure): preserve evidence":

- **D2a** — `validate_failed_execution_attempt_v1` recognized only the pnpm and
  root-relative generator argv when deciding whether generator `NODE_OPTIONS` is
  expected. H2 moved the live generator to package-relative argv, so every
  generator failure mismatched `effectiveEnvironment` and raised
  `V3_PODMAN_ATTEMPT_EXECUTOR`. `PACKAGE_RELATIVE_STANDARD_PACK_GENERATOR` is now
  the single argv source, shared by the segment builder and the evidence
  validator through `derive_generator_environment_overrides_v1`.
- **D2b** — `preserve_failure` re-raised only for offline-install, pre-seal, and
  candidate-publication failures, so the D2a validation error was swallowed and
  stage-6/7 failures published nothing at all. It now surfaces for every stage.
- **D1** — the zero-network attestation counted any `https?://` string as a
  registry request, so `ERR_PNPM_NO_OFFLINE_TARBALL`'s advisory URL was reported
  as `HERMETIC_NETWORK_POLICY_VIOLATION` under `--network none`. It now counts
  pnpm's monotonic downloaded counter and retry markers.

It accepts nothing else: no candidate run or publication, no closure attempt, no
H3/H4/H5, no R1-v3 phase completion, no marker change, no Finance action, no
V2/historical-evidence modification, and no registry or successor action.
Phase R1 v3 remains `[~]`; R2 Tasks 3-5 and all R3 tasks remain `[b]`.

Acceptance authority is in-loop per `AGENTS.md` "Implement high-risk work in-loop
(… Measure acceptance …)". Every run below was executed directly in this loop.

## Protocol deviation (disclosed)

**This receipt was written after its code was committed.** The normal order for
this track is pre-Green baseline receipt → Red → Green → acceptance receipt →
commit. For `f8455cf51` the code landed first and the evidence is being written
now. That inversion is recorded here rather than papered over.

The mitigating fact is that the pre-Green state is not a reconstruction: it is
the committed blob at `f8455cf51^`, so attribution is an exact reachable Git
diff rather than an anchored replacement argument. The diff is six hunks in the
runner and two in the test file, enumerated below.

## Bound artifacts

| Artifact | SHA-256 |
| --- | --- |
| Runner at `f8455cf51` (= live worktree, clean) | `cb06deb7dc40cfba73ed6a4957d878257eae5e7d1eb165bc0471b3d3b425fb69` |
| Runner at `f8455cf51^` (pre-Green) | `b8abd4e1e140d49e585d74d5acff0b9a2ecb638b2514b36fa330e96ad8d4743d` |
| Test file at `f8455cf51` (= live worktree, clean) | `32b6b01fdaaf14a38e4b33b00c6c17a40d671454259ad7294733ae13680beb45` |
| Test file at `f8455cf51^` (pre-Green) | `f969e71b1e0700772eb2ac612ebddcff476328538cd93c6c597c1bc3a0cd57d5` |

`git status --porcelain` for both files is empty, so the verified bytes are the
committed bytes.

## Attributed delta

Runner hunks: `@@ -74`, `@@ -1343`, `@@ -4247`, `@@ -4306`, `@@ -4919`, `@@ -8508`.
Test hunks: `@@ -84` (five constant lines) and `@@ -9476` (the three new tests).
Total `200` insertions, `20` deletions across the two files. No other file in the
repository was touched by this commit.

## Gate runs

### 1. The three new tests

    python3 -m unittest \
      measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests.test_generator_environment_overrides_recognize_every_frozen_segment_form \
      measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests.test_offline_tarball_advisory_url_is_not_counted_as_a_registry_request \
      measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests.test_preservation_failure_is_never_swallowed_for_any_stage

`Ran 3 tests in 3.105s` — `OK`. No Podman invocation. The three tests drive the
two real committed offline-install corpora rather than synthetic fixtures.

### 2. Preservation-path selection

    python3 -m unittest measure.tests.test_business_operations_graph_baseline_execution_closure -k preserv

`Ran 7 tests in 6.979s` — one failure,
`test_direct_command_runtime_attempt_preserves_missing_script_blocker`, disposed
as F2/F3 below and unrelated to this slice.

### 3. Full module

    python3 -m unittest measure.tests.test_business_operations_graph_baseline_execution_closure -v

`Ran 59 tests in 1075.081s` — `FAILED (failures=7, errors=2, skipped=1)`. A first
full run earlier the same day produced the identical outcome in `592.819s`
(wall-clock differs only by machine load). Every non-passing test is disposed
below; **none is attributable to `f8455cf51`.**

| Test | Kind | Reason | Attribution |
| --- | --- | --- | --- |
| `test_profile_rebuilds_exports_and_receipt_replays_exact_isolated_commands` | FAIL | `V3_EXECUTION_CLOSURE_MANIFEST_MISSING` | Expected: the v3 closure has never been published |
| `test_v3_manifest_and_ledger_bind_the_addendum_and_mechanical_omissions` | FAIL | `V3_EXECUTION_CLOSURE_MANIFEST_MISSING` | Same |
| `test_v3_podman_network_boundary_is_route_proven_for_all_execution` | FAIL | `V3_EXECUTION_CLOSURE_MANIFEST_MISSING` | Same |
| `test_v3_regenerates_graph_audit_and_compensation_from_the_fresh_closure` | FAIL | `V3_EXECUTION_CLOSURE_MANIFEST_MISSING` | Same |
| `test_v3_sol_materialization_gates_bind_only_a_candidate` | FAIL | `V3_EXECUTION_CLOSURE_MANIFEST_MISSING` | Same |
| `test_direct_runtime_tracer_requires_exact_generator_child_inheritance` | FAIL | `'[CONTAINER_NODE, logical[1]]' not found` in `generate()` source | Expected: `plan.md` declares this the narrow open Red gate for H2 child inheritance |
| `test_direct_command_runtime_attempt_preserves_missing_script_blocker` | FAIL | `cda4ee63…` != `ea4e0724…` | Finding F2/F3: the test reads the live worktree; the generator changed in sibling commit `d6becf5f1` |
| `test_noninstall_pnpm_executor_validator_rejects_payload_environment_and_executor_drift` | ERROR | `V3_PNPM_NONINSTALL_EXECUTOR_INVALID` | Finding F4; pre-existing — `validate_noninstall_pnpm_executor_v1` is byte-identical at `f8455cf51^` |
| `test_production_executor_generation_uses_sealed_direct_node_payload_only` | ERROR | `V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_PRODUCTION_GENERATION_CONTEXT_UNBOUND` | Pre-existing: raised at runner line `7957`, outside every hunk of this commit; the test body is untouched by it |

The one skip is the opt-in pinned-image container gate
(`RUN_R1_PODMAN_CHILD_TRACE_ACCEPTANCE=1`), already accepted separately in
`h2-direct-runtime-tracer-child-only-pinned-podman-acceptance-20260803.md`.

### Correction to an earlier in-loop report

An earlier reading in this session reported the full module as "8 failures, all
`V3_EXECUTION_CLOSURE_MANIFEST_MISSING`". The verified result is 7 failures and 2
errors, of which only **5** are `MANIFEST_MISSING`. The other four are the open
H2 Red gate, F2/F3, F4, and the pre-existing generation-context error. The
corrected table above supersedes that report.

## Decision and exclusions

**ACCEPT**, bounded to D1, D2a, and D2b as committed at `f8455cf51`, at runner
SHA-256 `cb06deb7…b425fb69` and test SHA-256 `32b6b01f…680beb45`.

This does not accept the runner cumulatively, does not close any finding in
`r1-v3-post-d2-findings-dispositions-20260804.md`, and cannot substitute for the
independent review or the confirming closure attempt that Phase R1 v3 still
requires. In particular, D2b's claim — that stage-6/7 failures now publish
evidence — is proven only against the tests above. Nothing here proves it against
a real Podman closure attempt; only a confirming attempt can.
