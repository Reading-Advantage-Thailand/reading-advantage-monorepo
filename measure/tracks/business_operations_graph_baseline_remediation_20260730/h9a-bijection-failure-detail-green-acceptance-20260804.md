# H9a Bijection-Failure Detail Green Acceptance

## Scope

This receipt accepts only the observability seam: when
`validate_direct_command_runtime_execution_trace_v1` fails the four-member
bijection (baselineReads / derivedBuildReads / writes / directoryEnumerations
vs the readSetContract declared sets), the raised
`ExecutionClosureValidationError` must carry a bounded, deterministic
single-line canonical-JSON detail payload naming, for each diverging bucket,
the sorted paths present-in-trace-but-undeclared and declared-but-untraced
(each list capped at the first 25 entries with the total count) plus a
SHA-256 of the canonical full uncapped divergence. It closes the live finding
recorded in `/tmp/opencode/r1v3-attempt-20260804-d.log` where the confirming
attempt failed at `validate_direct_command_runtime_execution_trace_v1` (line
1094) with the bare
`V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED` and no detail
naming the divergent paths (suspected: the H7 residual discovery
`directoryListingCount` 1,895 vs full-tree ancestor walk 1,911 divergence).
It does not fix the set mismatch itself (that is H9b, a later separate slice),
does not change any pass/fail outcome, and does not change the parser, tracer,
declared-set derivation, cap formula, or any carrier semantics.

Acceptance authority is in-loop single-authority per `AGENTS.md` "Implement
high-risk work in-loop (… Measure acceptance …)". All gate runs below were
executed directly in this loop against the real runner and the real test
file. No Podman or pnpm command was run.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Green runner SHA-256 | `d697d2a345bb3edd44b6bdf0bc27a43ca0852c46ab5739386316d3f8636363b3` |
| Frozen test SHA-256 | `29637a0c48be79e3ea1ddd1327a6beb254111009df7fd8d8a5bf1ccacc1273f3` |
| Pre-Red runner SHA-256 (H10 Green, baseline) | `ded40b2cb16d887b36cbd350a7ad8dbd7169790f749cc191fb8bd901201c3688` |
| Frozen guard block SHA-256 (pre-Green runner lines 1088-1094, 433 bytes) | `1d368d5ccc47697c746e315b949e480fa52e31a35dddd22c72e7048b43b4c628` |
| Reconstructed pre-Green runner | `ded40b2cb16d887b36cbd350a7ad8dbd7169790f749cc191fb8bd901201c3688` (byte-for-byte) |
| New/changed H9a tests, Red run | 4 failed in `14.90s` (3 new tests at the missing detail; the updated H7 test at `AssertionError: "^V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED: " does not match "V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED"`) |
| New/changed H9a tests, Green run | 4 passed in `7.65s` |
| Focused 26-test suite, Green run | 26 passed in `55.81s` (`-k "preseal or production_materialize or candidate_failure_evidence or trace_event_cap or trace_capture_failure_evidence or directory_enumeration or unknown_trace_event_kind or phase_level_failure or bijection_failure_detail"`) |
| Unchanged 22-test selection, pre-fix | 22 passed in `37.69s` (the shared selection minus the one updated H7 assertion) |
| Runner delta vs reconstructed pre-Green | 3 hunks, `+37/-2` (one line deleted: the bare bijection raise, replaced by the detail-carrying raise) |
| Test delta vs pre-Red | One existing regex line changed (H7 rejection test), one fixture helper + three test methods added |

The frozen test SHA-256 equals the Post-Red hash recorded in
`h9a-bijection-failure-detail-pre-green-baseline-20260804.md`, so the test
surface is unchanged since the Red slice. The reconstructed pre-Green runner
equals the pre-Red runner SHA-256 pinned in that baseline byte-for-byte, so
the Green slice's pre-state is exact and its delta is attributable.

## Defect fixed

In the live attempt, the `direct-runtime-trace` bijection failure raised
`V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED` with no detail
naming which of the four buckets diverged or which paths were
present-in-trace-but-undeclared / declared-but-untraced. The preserved
phase-level evidence (`failure.reason` / `phaseLevelFailure.errorDetail`)
copied that bare code verbatim, so the blocked attempt — the only durable
record of the mismatch — could not direct the next slice to the divergent
paths, and the frozen evidence cannot be rewritten to carry them. The
suspected divergence (H7 residual finding: discovery `directoryListingCount`
1,895 vs the full-tree ancestor walk's 1,911) was unconfirmable.

## Green delta

The H9a runner delta is exactly 3 hunks (`+37/-2`):

1. `_DIRECT_RUNTIME_TRACE_BIJECTION_DETAIL_CAP = 25` — the single detail-cap
   constant shared by every capped bucket list.
2. `_direct_runtime_trace_bijection_detail_v1` — a private helper that, for
   each of the four buckets, computes the sorted declared path set from the
   already derived `expected_trace` and the sorted observed path set from
   `execution_trace`, and emits `{bucket: {extra, missing, extraTotal,
   missingTotal}}` for diverging buckets only — each named list capped at 25
   — plus `divergenceSha256`, the SHA-256 of the canonical full uncapped
   divergence (`_canonical` = `sort_keys=True, separators=(",",":")`),
   serialized as one line of canonical JSON.
3. `validate_direct_command_runtime_execution_trace_v1` — the bare raise
   `_direct_runtime_read_set_fail("EXECUTION_TRACE_BIJECTION_FAILED")` becomes
   the same raise with the helper's detail, matching the existing
   `_fail(code, detail)` `code: detail` convention. The four-member comparison
   block above it is byte-unchanged.

No bijection semantics, declared-set derivation, parser, tracer, cap,
phase-level publisher/validator, carrier, or pass/fail outcome changed. The
bare code `V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED`
remains the prefix; only the detail suffix is added.

## Anchored reconstruction proof

- Reversing only the three H9a runner edits reconstructs the complete
  pre-Green runner at
  `ded40b2cb16d887b36cbd350a7ad8dbd7169790f749cc191fb8bd901201c3688`
  byte-for-byte (verified: the reverse-edited Green runner bytes are
  identical to the pinned pre-Red runner bytes).
- The Green runner diff against that reconstruction is exactly 3 hunks,
  `+37/-2`; the two deleted lines are the old bare raise and its indentation
  block shape, replaced by the detail-carrying call.
- The frozen 433-byte guard block (lines 1088-1094) occurs exactly once in
  the pre-Green runner; its comparison lines are byte-unchanged in the Green
  runner.

## Focused suite definition

All twenty-six names are in
`measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests`.
The first twenty-three are the unchanged H1-H10 selection; the three new H9a
names are:

1. `test_bijection_failure_detail_names_exact_divergent_paths_per_bucket`
2. `test_bijection_failure_detail_caps_lists_and_pins_full_divergence_hash`
3. `test_bijection_failure_detail_flows_through_phase_level_preserved_attempt`

plus the one minimally updated existing test
`test_undeclared_directory_enumeration_is_rejected_by_trace_validation` (its
pre-Red regex asserted the exact bare message
`^V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED$`; it now
asserts `^V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED: `, so
the H7 rejection contract still holds and additionally proves the real
parser-to-validator path carries detail). This is the only pre-existing test
whose assertion changed; it is documented in the baseline doc.

## Observed behavior

1. **4a** — a crafted trace (one extra write, one extra directory
   enumeration, one declared enumeration omitted, one declared baseline read
   omitted) raised the bijection error whose canonical-JSON detail names
   exactly `writes.extra = [EXTRA-write.json]`, `directoryEnumerations.extra =
   [EXTRA-dir]` / `.missing = [<declared audio dir>]`, and
   `baselineReads.missing = [<omitted baseline read>]` with the correct
   totals, and whose `divergenceSha256` equals the test-computed SHA-256 of
   the canonical full divergence.
2. **4b** — thirty extra directory enumerations produce a deterministic
   message (two calls, identical strings) with `extra` truncated to the first
   25 sorted paths, `extraTotal: 30`, the 2 declared-but-untraced paths in
   `missing`, the 30th path absent from the message, and `divergenceSha256`
   still hashing all 30 (nothing silently elided).
3. **4c** — a real sealed integration with an extra WRITE trace event parses
   through the real parser and raises the bijection error with detail; the
   H8/H10 phase-level preservation path publishes one attempt whose
   `phaseLevelFailure.errorDetail` (and `reason`, equal by the H8/H10
   publisher's existing `str(error)` convention) contains the full payload
   including the extra write path, and the published record re-validates with
   the real `validate_failed_execution_attempt_v1`.
4. The updated H7 test passes through the real parser and real validator with
   the detail suffix present.

The twenty-two unchanged focused tests remain Green pre-fix and post-fix
(pre-fix receipt: 22 passed in 37.69s), and the full-file run shows no new
failures or errors beyond the documented pre-existing set (see below).

## Full-file verification

The entire 71-test module was run once against the Green runner: **61 passed,
9 failed, 1 skipped** in 743.98s (0:12:23). To prove the nine failures are
pre-existing and not attributable to this slice, the identical full module
was also run once against the byte-reconstructed pre-Green runner
(`ded40b2c...`): **57 passed, 13 failed, 1 skipped** in 729.12s. The failure
sets differ by exactly the four new/changed tests — the three H9a tests and
the updated H7 test fail pre-fix and pass post-fix — and the other nine
failures are byte-identical in both runs and disposed as pre-existing (the
same nine as H7/H8/H10: F2 generator-blob hash drift, F4 noninstall-validator
drift, two H2-era `generate` source/state assertion drifts, and five
V3-manifest tests that require the absent frozen candidate directory
`r1-v3-execution-closure-20260801/`).

## Authorship

The Red test methods, the fixture, the assertion update, the Green delta, the
anchored reconstruction, and every gate run were performed in-loop for this
slice against the real runner and the real test file.

## Decision and exclusions

**ACCEPT** -- bounded only to the bijection-failure detail observability seam
at Green runner SHA-256
`d697d2a345bb3edd44b6bdf0bc27a43ca0852c46ab5739386316d3f8636363b3` and
frozen test SHA-256
`29637a0c48be79e3ea1ddd1327a6beb254111009df7fd8d8a5bf1ccacc1273f3`.

Excluded: no candidate rerun or closure attempt; no bijection semantics,
declared-set derivation, parser, tracer, or cap change (H9b owns the actual
set-mismatch fix in a separate later slice); no phase-level publisher or
validator change; no pre-seal/candidate/hermetic/workspace carrier or
publisher change; no marker change (Phase R1 v3 remains `[~]`); and no
successor, registry, V2/history, Finance, or Podman action. A confirming
closure attempt is still required before any candidate claim. The runner and
test work remains uncommitted shared R1-v3 work.
