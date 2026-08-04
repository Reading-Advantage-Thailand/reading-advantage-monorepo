# H8 Phase-Level Evidence Preservation Green Acceptance

## Scope

This receipt accepts only the command-less phase-level failure-evidence
seam: when a blocking failure occurs during trace capture/parse (or any
phase before a failed-command record exists, i.e. the stage's command is
missing or exited 0), `preserve_failure` must publish the attempt directory
and a `failed-attempt.json` carrying stage, classification, reason, error
detail, and any raw artifacts collected so far, instead of raising
`V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED`. It closes the live finding
recorded in `/tmp/opencode/r1v3-attempt-20260804-c.log` where
`V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_TRACE_EVENT_INVALID` during
`direct-runtime-trace` left no published attempt. It does not accept any
candidate rerun, any trace-policy or parser semantic change, any marker or
successor change, or any Podman action.

Acceptance authority is in-loop single-authority per `AGENTS.md` "Implement
high-risk work in-loop (… Measure acceptance …)". All gate runs below were
executed directly in this loop against the real runner and the real test
file.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Green runner SHA-256 | `77d38e5e4911ea0bc2a32bf935ab596914eb4f01c0b4fe006b6f759784d05516` |
| Frozen test SHA-256 | `0653f19618c820ebdd03063e736db6d4be82fc0b90a1f8898a966153dbfdd025` |
| Pre-Red runner SHA-256 (H6 Green, baseline) | `cf8f7b9ab980568dfd40bc7ee17f111580d6de4c757e96b695e172bab859af4a` |
| Frozen guard block SHA-256 (pre-Green runner lines 6921-6923, 303 bytes) | `0581eb941cb7f96ef000ae1a2b0a88d857944eca6d2c00436479e1cc0557a80a` |
| Reconstructed pre-Green runner | `cf8f7b9ab980568dfd40bc7ee17f111580d6de4c757e96b695e172bab859af4a` (byte-for-byte) |
| New H8 tests, Red run | 2 failed in `12.40s`, each at `V3_PODMAN_ATTEMPT_FAILED_COMMAND_MISSING: direct-runtime-trace` → `V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: direct-runtime-trace` |
| New H8 tests, Green run | 2 passed in `8.43s` |
| Focused 17-test suite, Green run | 17 passed in `20.40s` (`-k "preseal or production_materialize or candidate_failure_evidence or trace_event_cap or trace_capture_failure_evidence"`) |
| Runner delta vs reconstructed pre-Green | 9 hunks, `+294/-1` (one line deleted: the fail-closed guard line, replaced by the phase-level delegation) |
| Test delta vs pre-Red | Pure addition: one fixture helper + two test methods (+346 lines), no line changed |

The frozen test SHA-256 equals the Post-Red hash recorded in
`h8-phase-level-evidence-preservation-pre-green-baseline-20260804.md`, so
the test surface is unchanged since the Red slice. The reconstructed
pre-Green runner equals the pre-Red runner SHA-256 pinned in that baseline
byte-for-byte, so the Green slice's pre-state is exact and its delta is
attributable.

## Defect fixed

In the live attempt, the `direct-runtime-trace` container command succeeded
(exit code 0) and staged its raw trace receipt, but the subsequent trace
parse raised `V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_TRACE_EVENT_INVALID` (a
post-command phase-level failure). `_publish_failed_attempt` required the
failed command to carry a genuine nonzero exit code, so it raised
`V3_PODMAN_ATTEMPT_FAILED_COMMAND_MISSING: direct-runtime-trace`, which
`preserve_failure` surfaced as
`CandidateExecutionBlocked: V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED` — and
no attempt directory was published. The raw trace receipt was collectible
and was silently dropped, violating the H1-H5 fail-closed evidence invariant
that every blocked attempt publishes preserved evidence.

## Green delta

The H8 runner delta (9 hunks, `+294/-1`, fully listed in the acceptance
evidence above):

1. `_PHASE_LEVEL_FAILURE_CLASSIFICATION = "PHASE_LEVEL_FAILURE"` — the single
   phase-level classification, shared by publisher and validator.
2. `_validate_phase_level_failure_v1` — validates the closed
   `phaseLevelFailure` carrier: exact key set, kind/schema, stage/reason/
   classification agreement with the outer `failure`, non-empty
   `errorDetail`, and hash-bound `rawArtifacts` references under the
   attempt's `raw/` directory (path prefix, file name, digest, and size are
   all re-derived from the physical bytes).
3. `validate_failed_execution_attempt_v1` — accepts exactly one new shape:
   `failure` with only `stage`/`reason`/`classification` equal to
   `PHASE_LEVEL_FAILURE`, `commands: []`, and the `phaseLevelFailure`
   carrier. The carrier is mutually exclusive with the pre-seal, hermetic,
   workspace, and candidate carriers, the outer failure keys are exact,
   and the optional `directRuntimeIntegration` forward is validated with the
   same reached-stage/later-stages rules as the command-level path. Any
   mutation fails closed; the pre-seal shape is untouched.
4. `_publish_failed_attempt` — the guard now routes missing or
   zero-exit failed-command records to the phase-level publisher, keeping the
   fail-closed `V3_PODMAN_ATTEMPT_FAILED_COMMAND_MISSING` guard only for
   pre-seal failures (which carry a `directRuntimePreSealAttempt` carrier
   that cannot describe a command-less failure).
5. `_publish_phase_level_failure_attempt` — the dedicated publisher
   mirroring `_publish_failed_attempt`'s private staging, real-validator
   gate, collision-safe reservation, single rename, and cleanup: it
   finalizes every staged command's raw streams (the artifacts collected so
   far), writes the command-less record with the carrier, validates it
   privately, then publishes.

No happy-path, pre-seal, candidate, trace-policy, tracer, parser,
discovery, runner-script, or generator behavior changed. The trace-event
parser's validation rules are untouched; H7 owns the readdir event-kind
design separately.

## Anchored reconstruction proof

- Reversing only the five H8 runner edits reconstructs the complete
  pre-Green runner at `cf8f7b9ab980568dfd40bc7ee17f111580d6de4c757e96b695e172bab859af4a`
  byte-for-byte (verified; the pre-Green runner is exactly the pinned
  pre-Red runner).
- The Green runner diff against that reconstruction is exactly 9 hunks,
  `+294/-1`; the single deleted line is the old fail-closed guard line.
- The frozen 303-byte guard block occurs exactly once in the pre-Green
  runner and is replaced by the delegation in the Green runner.
- `git diff --check` is clean (no whitespace errors; verified on the
  working-tree files).

## Focused suite definition

All seventeen names are in
`measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests`.
The first fifteen are the unchanged H1-H6 pre-seal / production-materialize
/ candidate-failure-evidence / trace-event-cap selection; the two new H8
names are:

1. `test_trace_capture_failure_evidence_publishes_attempt_without_failed_command`
2. `test_trace_capture_failure_evidence_never_raises_failure_evidence_unpreserved`

No Podman or pnpm command was run; the suite exercises only the no-Podman
runner/test surfaces.

## Observed behavior

Both new tests force a real trace-parse failure: a sealed integration built
through the real builder (reached stage `build-advantage-play-kit-for-runtime`),
an in-container trace receipt containing an invalid `UNDECLARED` event kind
normalized by the real `capture_direct_command_runtime_in_container_trace_v1`,
and the real parser raising
`V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_TRACE_EVENT_INVALID`. The staged
`direct-runtime-trace` command records exit code 0 with the raw receipt on
stdout, exactly mirroring the live attempt. `preserve_failure` then:

- publishes exactly one attempt directory
  (`r1-v3-podman-execution-attempt-20260802-0001`) with a
  `failed-attempt.json` whose `failure` is
  `{"stage": "direct-runtime-trace", "reason": "V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_TRACE_EVENT_INVALID", "classification": "PHASE_LEVEL_FAILURE"}`,
  `commands: []`, a `phaseLevelFailure` carrier carrying the same
  stage/reason/classification plus `errorDetail` and one hash-bound
  `rawArtifacts` entry for the staged trace receipt (stdout + stderr bytes
  materialized under `raw/`), and the exact `directRuntimeIntegration`
  forward (`reachedStage: generate-standard-pack-catalog`, later stage
  `direct-runtime-trace` NOT_RUN);
- never raises `CandidateExecutionBlocked` /
  `V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED` on this path;
- validates the published record with the real
  `validate_failed_execution_attempt_v1` after publication.

The seventeen previously accepted tests remain Green in the same run, and
the full-file run shows no new failures or errors beyond the documented
pre-existing set (see the full-file result below).

## Full-file verification

The entire 62-test module was run once against the Green runner:
**52 passed, 9 failed, 1 skipped** in 800.37s (0:13:20). To prove the nine
failures are pre-existing and not attributable to this slice, the identical
full module was also run once against the byte-reconstructed pre-Green
runner (`cf8f7b9a...`): **50 passed, 11 failed, 1 skipped** in 714.39s. The
failure sets differ by exactly the two new H8 tests — they fail pre-fix and
pass post-fix — and the other nine failures are byte-identical in both runs:

1. `test_direct_command_runtime_attempt_preserves_missing_script_blocker` —
   documented F2: the live generator worktree hash
   (`cda4ee63...`, version `2026.08.04`) differs from the frozen baseline
   blob hash (`ea4e0724...`), a permanent failure on every version bump
   (plan line 591).
2. `test_direct_runtime_tracer_requires_exact_generator_child_inheritance` —
   H2-era source assertion drift: it searches `generate` for
   `[CONTAINER_NODE, logical[1]]`, which the D1/D2-era runner replaced with
   `[CONTAINER_NODE, script["resolvedPath"]]`; `generate` is byte-identical
   pre/post H8 (proven by the reconstruction).
3. `test_noninstall_pnpm_executor_validator_rejects_payload_environment_and_executor_drift` —
   documented F4: `V3_PNPM_NONINSTALL_EXECUTOR_INVALID` (plan line 592).
4. `test_production_executor_generation_uses_sealed_direct_node_payload_only` —
   H2-era generation-context drift
   (`V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_PRODUCTION_GENERATION_CONTEXT_UNBOUND`);
   `generate` and the executor constructor are byte-identical pre/post H8.
5. `test_profile_rebuilds_exports_and_receipt_replays_exact_isolated_commands`
6. `test_v3_manifest_and_ledger_bind_the_addendum_and_mechanical_omissions`
7. `test_v3_podman_network_boundary_is_route_proven_for_all_execution`
8. `test_v3_regenerates_graph_audit_and_compensation_from_the_fresh_closure`
9. `test_v3_sol_materialization_gates_bind_only_a_candidate`

Tests 5-9 all abort in `_load_v3` at
`V3_EXECUTION_CLOSURE_MANIFEST_MISSING: r1-v3-execution-closure-20260801/execution-closure.manifest.json`
— the frozen V3 candidate directory is absent from this working tree (the
candidate was never published), so every test that validates the candidate
artifacts fails regardless of the runner. None of the nine involves the H8
seam; the comparison run is the proof.

## Authorship

The Red test methods, the fixture, the real parser forcing, the frozen-block
capture, the Green delta, the anchored reconstruction, and every gate run
were performed in-loop for this slice against the real runner and the real
test file.

## Decision and exclusions

**ACCEPT** -- bounded only to the command-less phase-level failure-evidence
seam at Green runner SHA-256
`77d38e5e4911ea0bc2a32bf935ab596914eb4f01c0b4fe006b6f759784d05516` and
frozen test SHA-256
`0653f19618c820ebdd03063e736db6d4be82fc0b90a1f8898a966153dbfdd025`.

Excluded: no candidate rerun or closure attempt; no trace-policy semantic
change (truncation/duplicates policies, tracer ordinal guard, trace-event
parser, and the `UNDECLARED` readdir classification remain untouched and
owned by H7); no discovery or read-set contract change; no generator change;
no pre-seal/candidate/hermetic/workspace carrier or publisher change; no
marker change (Phase R1 v3 remains `[~]`); no successor, registry, V2/history,
Finance, or Podman action. A confirming closure attempt is still required
before any candidate claim. The runner and test work remains uncommitted
shared R1-v3 work.
