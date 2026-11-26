# R1 Task 2 Evidence-Transaction Remediation

- Track: `business_operations_graph_baseline_remediation_20260730`
- Status: Task 2 remains `[~]`; this is a repair receipt, not source-snapshot acceptance.

## Invalidated historical receipt

The prior `r1-task2-source-snapshot-run-receipt-20260730.md` is not valid Task 2 acceptance evidence. It did not execute `repo-graph scan . ./graph.db` between the producer pre/post captures, retained the only full bundle outside the repository, did not verify the rich or R0 state artifacts, and recorded empty workspace package globs despite the declared pnpm workspace.

## Remediation

- Added a scan-bracketed producer entry point that executes and validates the canonical scan strictly between pre/post state captures.
- Bound scan command, exit, stdout/stderr, generated `graph.db` path/size/digest, and exact on-disk pre/post state references in `snapshot.scan.json`.
- Made replay verification fail closed for all rich/R0 state artifacts and scan-record references.
- Added a publish helper that first verifies an external scan bundle, then copies the exact expected artifact set under `measure/tracks/` and re-verifies the durable copy.
- Corrected rich-manifest `packageGlobs` discovery from `pnpm-workspace.yaml`.

## Executable evidence

Red before implementation:

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_snapshot.BusinessOperationsGraphSnapshotRedTests.test_scan_runner_executes_between_state_captures_and_binds_its_record measure.tests.test_business_operations_graph_baseline_snapshot.BusinessOperationsGraphSnapshotRedTests.test_verification_rejects_tampered_rich_and_r0_state_artifacts measure.tests.test_business_operations_graph_baseline_snapshot.BusinessOperationsGraphSnapshotRedTests.test_workspace_package_globs_are_recorded_from_pnpm_workspace -v
```

Result: missing scan entry point plus four state-tampering failures; package-glob regression failed before its one-line repair was retained.

Green after implementation:

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_snapshot measure.tests.test_business_operations_graph_baseline_remediation -v
```

Result: `Ran 50 tests ... OK`.

## Next acceptance action

Coordinate a stable shared-worktree window, call `produce_scan_bracketed_snapshot` into an external directory, call `verify_scan_bracketed_snapshot`, publish the verified bundle through `publish_scan_bracketed_snapshot`, and commit that immutable bundle with a fresh Task 2 receipt. Do not reuse or amend the invalidated receipt.
