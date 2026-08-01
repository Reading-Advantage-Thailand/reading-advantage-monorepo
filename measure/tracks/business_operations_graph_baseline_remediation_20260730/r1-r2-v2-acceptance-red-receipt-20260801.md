# R1/R2 v2 Acceptance Guard — Red Receipt (2026-08-01)

## Scope

This receipt records the Red phase for the independent candidate-boundary guard
in `measure/tests/test_business_operations_graph_baseline_r1_r2_v2_acceptance.py`.
It does not accept R1/R2 evidence, change any task marker, modify the parent
Admin or CRM gate, or authorize a successor.

## Command

```bash
CI=true python3 -m unittest measure.tests.test_business_operations_graph_baseline_r1_r2_v2_acceptance
```

## Result

Executed 2026-08-01 against the shared dirty `master` checkout.

- `Ran 5 tests in 0.456s`
- `FAILED (failures=4)`
- The immutable retained-v1 evidence check passed.

The four required failures establish that the v2 candidate is incomplete:

1. The R2 plan does not yet state the truthful non-clean branch as
   `` `COMPENSATION_REQUIRED` ``.
2. `r1-task3-graph-binding-v2-20260801.json` does not exist, so the candidate
   graph cannot yet bind the v2 archive, manifest, and scan with
   `CANDIDATE_UNACCEPTED` status.
3. The v2 clean-audit attempt cannot yet bind the required v2 graph candidate.
4. The v2 compensation evidence cannot yet bind the same candidate and its
   two equal normalized scans.

## Green Boundary

Green requires only the hash-bound v2 graph binding, the truthful R2
clean-audit/compensation evidence generated from that same binding, and the
plan truthfulness correction. The guard explicitly preserves historical v1
evidence and the blocked Admin S1 and CRM successor states; passing it is not
independent acceptance and does not unblock either successor.
