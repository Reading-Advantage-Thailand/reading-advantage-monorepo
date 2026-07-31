# R1 Task 1 Source-Scoped Concurrency Red Receipt

- Track: `business_operations_graph_baseline_remediation_20260730`
- Phase/task: R1 Task 1 — scanner-scoped concurrency correction
- Baseline behavior: the former producer rejected every `HEAD` advance, even
  when the complete scanner-input denominator and its source state were
  unchanged.
- Production code modified: **no**
- Parent/successor gates changed: **no**

## Red contract

An unrelated committed Measure-plan Markdown change during the canonical scan
must be recorded as a pre/post HEAD interval without invalidating a source
snapshot when the scanner denominator, scanner-scoped porcelain state, and
scanner-scoped staged diff are unchanged. This allowance never applies to
TypeScript, tsconfig/extends, manifest/workspace/lock, or build-graph config
paths; those remain scanner inputs and must fail closed.

## Focused Red command

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_snapshot.BusinessOperationsGraphSnapshotRedTests.test_non_scanner_commit_during_scan_preserves_source_snapshot_and_records_head_interval -v
```

## Observed Red result

```text
ERROR: SnapshotDriftError: concurrent baseline HEAD or branch drift detected
```

The error is intentional evidence of the superseded whole-repository HEAD
guard. No snapshot bundle was accepted or published. The prior Task 1
independent acceptance remains a truthful record for its earlier global-state
contract, but cannot accept this materially revised source-scoped contract.
