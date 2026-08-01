# R1 Task 1 pnpmfile Boundary Remediation Receipt

- Track: `business_operations_graph_baseline_remediation_20260730`
- Scope: bounded producer/test correction only
- Producer: `measure/business_operations_graph_baseline_snapshot.py`
- Focused tests: `measure/tests/test_business_operations_graph_baseline_snapshot.py`
- R0 validator: **unchanged**
- R1 recapture: **not performed**
- Parent/successor gates: **unchanged and blocked**

## Correction

The existing tracked root `.pnpmfile.cjs` is now classified as scanner input
alongside `pnpm-workspace.yaml` and `pnpm-lock.yaml`. The existing denominator,
archive, replay, dependency-scope, status, staged-diff, deletion-tombstone, and
intervening-commit machinery therefore binds its bytes without changing the
R0 projection or recapturing R1 evidence.

## Adversarial coverage

- Positive capture archives the tracked root pnpmfile and verifies replayed bytes.
- A committed change-and-restore of the pnpmfile fails closed.
- Staged pnpmfile bytes fail closed even when live bytes are restored.
- A staged pnpmfile deletion remains a scoped, replayable tombstone.
- The positive capture asserts the pnpmfile, workspace file, and lockfile share
  the scanner/dependency scope.

## Verification

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_business_operations_graph_baseline_snapshot measure.tests.test_business_operations_graph_baseline_remediation
Ran 70 tests in 53.992s
OK
```

No existing evidence hash, plan, graph bundle, or R1 capture was edited.
