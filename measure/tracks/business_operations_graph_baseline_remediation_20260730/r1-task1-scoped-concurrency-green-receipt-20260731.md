# R1 Task 1 Source-Scoped Concurrency Green Receipt

- Track: `business_operations_graph_baseline_remediation_20260730`
- Phase/task: R1 Task 1 — scanner-scoped concurrency correction
- Production code modified: `measure/business_operations_graph_baseline_snapshot.py`
- Parent/successor gates changed: **no**
- R0 validator modified: **no**

## Green implementation

The producer now records the pre/post HEAD interval in the rich manifest and
scan record. It accepts a concurrent HEAD advance only when the original HEAD
is an ancestor of the post-scan HEAD, the worktree/branch invariant remains
unchanged, scanner-input metadata and bytes are identical, and scanner-scoped
status and staged-diff artifacts are identical.

It walks every intervening commit individually and rejects any scanner input
touched in the interval, including an input changed and later restored. It
also rejects non-ancestor history while retaining the unchanged R0 v1
projection and its pre-scan aliases.

## Adversarial coverage

- A committed unrelated Measure-plan update is accepted and recorded as a
  HEAD interval.
- Unrelated staged documentation drift is excluded from scanner-scoped state.
- Scanner staged-diff drift fails even if worktree bytes are restored.
- Changed-and-reverted scanner commits fail.
- Non-ancestor rewritten history fails.

## Verification

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_snapshot -v
Ran 27 tests in 24.115s
OK
```

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_remediation -v
Ran 29 tests in 14.262s
OK
```

This Green receipt is producer evidence only. R1 Task 1 remains `[~]` pending
an independent rereview; Parent Phase 0, Admin Phase S1, and CRM
contract/schema/Red remain blocked.
