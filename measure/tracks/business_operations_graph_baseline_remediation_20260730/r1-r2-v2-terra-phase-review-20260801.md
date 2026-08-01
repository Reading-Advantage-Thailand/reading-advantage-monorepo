# R1/R2 v2 Candidate — Terra Phase Review (2026-08-01)

## Scope

This review evaluates only the regenerated R1 source/graph candidate and R2
Tasks 1-2 candidate evidence in
`business_operations_graph_baseline_remediation_20260730`. It does not evaluate
or accept R2 Tasks 3-5, R3, either successor, or Finance work.

## Verification

```bash
CI=true PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \
  measure.tests.test_business_operations_graph_baseline_r1_r2_v2_acceptance \
  measure.tests.test_business_operations_graph_baseline_r2_clean_audit \
  measure.tests.test_business_operations_graph_baseline_r2_compensation \
  measure.tests.test_business_operations_graph_baseline_snapshot \
  measure.tests.test_business_operations_graph_baseline_remediation
```

Result: `Ran 83 tests in 64.566s` — `OK`.

The suite verifies retained v1 evidence immutability; the v2 source archive,
manifest, pre/post state, graph binding, probes, and commands; the truthful
non-clean audit outcome; two hash-bound equal normalized inventories; the
compensation adversarial corpus; the source producer; and the original
remediation counterexamples.

## Bounded Verdict

**PASS — candidate evidence contract only.** The v2 R1 recapture and R2 Tasks
1-2 candidate evidence are internally consistent, source-bound, and replayable
under the focused test boundary. The clean audit truthfully selects
`COMPENSATION_REQUIRED`; it does not claim a clean graph.

This is not independent R3 acceptance. The v2 graph binding remains
`CANDIDATE_UNACCEPTED`; R2 Tasks 3-5 and all R3 tasks remain blocked, and no
Admin S1, CRM, or Finance dependency is unblocked. Owner confirmation remains
required before any handoff or registry change.

## Narrow Contract Corrections

The phase review corrected only two test/plan contract details after the
published candidate exposed them: the acceptance guard reads the immutable
inventory envelope's `inventory` member, and the v2 recapture plan names
`r1-task3-graph-binding-v2-20260801.json`. Candidate evidence bytes and task
markers were not changed by this review.
