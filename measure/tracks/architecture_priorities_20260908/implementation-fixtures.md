# Audit fixture implementation

## Result

The Science audit test now writes five generated fixtures to an isolated temporary directory.
The test creates the directory before the suite.
It removes the directory after the suite, including failed test runs.
The archived audit fixtures remain unchanged.

The original fifth fixture depended on a stale repository file.
The test now runs an `@ai-sdk` source query to create that temporary fixture.
All revision constants and inventory assertions remain unchanged.

## Test evidence

The sandbox run failed because it blocked the test's subprocess calls with `EPERM`.
The approved subprocess run passed all 71 tests.

```bash
CI=true node ../../node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts --environment node lib/__tests__/audit-phase2-static-analysis.test.ts --maxWorkers=1
```

The command used the required pinned executable path and pnpm dependency warning setting.
No `science-audit-phase2-*` directory remained in `/tmp` after the run.
The obsolete active audit track path remained absent.
`git diff --check` passed for the assigned scope.
