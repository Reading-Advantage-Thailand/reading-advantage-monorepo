# R1/R2 v2 Bounded Task Closeout — Green Receipt (2026-08-01)

## Scope

This receipt records only the Measure marker transition for the already
hash-bound v2 recapture and R2 Tasks 1-2 evidence committed in `772839f`.
It does not accept R2 Tasks 3-5, Phase R2, R3, the parent track, any
successor, or Finance work.

## Red and Green

After the bounded task markers changed from `[~]` to `[x]`, the existing plan
assertions correctly went Red because they still required the in-progress
state. The first full focused rerun reported three plan-marker assertion
failures only; all source/archive/audit/compensation checks remained Green.

The assertions were narrowed to require the committed `[x]` markers and retain
explicit checks for R2 Tasks 3-5 and all R3 `[b]` blockers.

```bash
CI=true PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \
  measure.tests.test_business_operations_graph_baseline_r1_r2_v2_acceptance \
  measure.tests.test_business_operations_graph_baseline_r2_clean_audit \
  measure.tests.test_business_operations_graph_baseline_r2_compensation \
  measure.tests.test_business_operations_graph_baseline_snapshot \
  measure.tests.test_business_operations_graph_baseline_remediation
```

Result: `Ran 83 tests in 65.783s` — `OK`.

## Bounded Disposition

The v2 recapture and R2 Tasks 1-2 markers are complete only for their recorded
technical evidence scope. The graph binding remains `CANDIDATE_UNACCEPTED`;
the clean audit remains `COMPENSATION_REQUIRED`. R2 Tasks 3-5, all R3 tasks,
owner confirmation, the handoff, Admin S1, CRM, and Finance remain blocked.
