# R2 Task 2 Compensation Denominator Red Receipt

- Track: `business_operations_graph_baseline_remediation_20260730`
- Phase/task: R2 Task 2 — compensation denominator reconciliation
- Baseline behavior: no focused compensation-denominator evidence existed; the
  accepted R2 clean-audit attempt pinned the raw `3,971` unaudited symbol
  list, but no producer had reconciled each node to a frozen source anchor
  and source-range digest, nor proven that two unchanged-input full scans
  produce byte-identical normalized file/route/field inventories.
- Production code modified: **no** (only the new producer, new focused test
  module, and new evidence file).
- Parent/successor gates changed: **no**

## Red contract

The evidence file `measure/tracks/business_operations_graph_baseline_remediation_20260730/r2-task2-compensation-denominator-20260731.json` must:

1. pin the exact `3,971` unaudited symbol denominator (`3,306` fields plus
   `665` routes) with the canonical symbol-set SHA-256
   `d2ee44b5e249a56f3c7bfe24d7371c70701ee30f2973f9d7a271f18de6722b42`;
2. reconcile every node to a frozen source path, declaration anchor, and
   source-range SHA-256 that re-derives exactly from the R1 archive bytes;
3. preserve the audit exit code `1` and the `COMPENSATION_REQUIRED` label
   verbatim from the accepted R2 Task 1 attempt;
4. prove that two unchanged-input full scans (the bound canonical
   `graph.db` and the R2 clean-audit `audit-attempt.db`) produce
   byte-identical normalized file/route/field inventories once each
   scan's project-root prefix is removed.

Before this task's implementation, none of these properties existed. The
focused test module
`measure/tests/test_business_operations_graph_baseline_r2_compensation.py`
recorded the Red expectation against the producer
`measure/business_operations_graph_baseline_compensation.py` (which had not
yet been authored) and the evidence file (which did not yet exist on disk).

## Focused Red command

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_business_operations_graph_baseline_r2_compensation
```

## Observed Red result (pre-implementation)

```text
Ran 19 tests in 0.612s
FAILED (errors=19)
```

All 19 tests errored with `FileNotFoundError` for the missing evidence file
or with `AttributeError` for the not-yet-authored producer functions. The
Red contract is recorded as the failure surface that the Green receipt must
close.

## Implementation scope

The focused producer
`measure/business_operations_graph_baseline_compensation.py` and the focused
test module
`measure/tests/test_business_operations_graph_baseline_r2_compensation.py`
were the only code added by this task. They read-only inspect the committed
R1 archive, the accepted R2 clean-audit attempt, the canonical `graph.db`,
and the R2 audit-attempt database at
`/tmp/opencode/r2-clean-audit-probe-nbi4_dbp/source/audit-attempt.db`. They
never modify the real Git index, the dirty worktree, the R1 archive, the
canonical `graph.db`, or any application source.

The plan.md was updated to flip the R2 Task 2 marker from `[b]` to `[~]`
and to reference the new files; no other plan sections changed. No
parent/successor plan was modified.