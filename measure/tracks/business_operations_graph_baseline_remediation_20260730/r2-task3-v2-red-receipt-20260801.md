# R2 Task 3 v2 Accounts Matrix — Red Receipt (2026-08-01)

## Scope

This receipt records the authorized Red phase for the next R2 Task 3 candidate.
Only the Task 3 plan marker moved to `[~]`, the current-v2 boundary assertion
was updated, and the new v2 contract test was added. Task 4, Task 5, R3, and
all successor markers remain blocked.

No Accounts or backend product source, matrix helper, matrix artifact, gate
receipt, Finance code, or existing historical Task 3/4 evidence was changed.

## Command

```bash
CI=true PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \
  measure.tests.test_business_operations_graph_baseline_r1_r2_v2_acceptance \
  measure.tests.test_business_operations_graph_baseline_r2_accounts_v2
```

## Result

Executed against the shared dirty `master` checkout:

- `Ran 11 tests in 2.505s`
- `FAILED (failures=5)`
- All five existing v2 acceptance-boundary tests passed.
- The v2-input binding test passed.
- Each of the five new matrix-contract tests failed only with
  `V2_ACCOUNTS_MATRIX_ARTIFACT_MISSING` for
  `r2-task3-accounts-security-matrix-v2-20260801/matrix.json`.

The missing artifact is intentional Red evidence. Because the artifact is
absent, the new helper import and every later matrix mutation check remain
unreached; this receipt does not claim that any historical Task 3 finding has
been resolved.

## Green Boundary

Green requires a new v2 helper and hash-bound v2 candidate matrix with raw FR4
gate receipts, route-and-dimension-specific evidence mapping, immutable audit
trigger/test evidence, and strict OIDC logout-contract evidence. A Green test
result may validate only the candidate evidence contract; it cannot unblock
R2 Tasks 4-5, R3, Admin, CRM, or Finance.
