# Domain import implementation

## Result

Science production code now imports `createTenantDB` from `@reading-advantage/domain/db-contract`.
The two teacher list pages import the teacher namespace from `@reading-advantage/domain/teachers`.
Nine related integration tests now use the database contract subpath.
The Domain package API did not change.

## Regression coverage

`domain-subpath-isolation.test.ts` loads both narrow modules with a throwing Sales knowledge mock.
It confirms that three required exports remain callable.
It scans production TypeScript files under the Science `app` and `lib` directories.
The multiline fixture confirms that the guard detects a banned import.
The existing root compatibility test remains unchanged.

## Test evidence

- Red: the new guard reported all eight production root imports.
- Green: `domain-subpath-isolation.test.ts` passed two tests.
- Compatibility: `sales-knowledge-package-import.test.ts` passed in the targeted combined run.
- Tenant coverage: the proper-config tenant and import run passed all 16 tests.
- Static check: only `sales-knowledge-package-import.test.ts` retains a TypeScript root import.
- Diff check: `git diff --check` passed for the assigned scope.

The proper-config run passed 16 tests with a 15-second timeout.
It resolved the earlier unit-config `server-only` alias limitation.

## Commands

```bash
CI=true node ../../node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts lib/test/domain-subpath-isolation.test.ts --maxWorkers=1
CI=true node ../../node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts lib/test/domain-subpath-isolation.test.ts lib/test/sales-knowledge-package-import.test.ts lib/gamification/gamification-tenant-isolation.test.ts lib/services/services-tenant-isolation.test.ts --maxWorkers=1
```

Both commands used the required pinned executable path and pnpm dependency warning setting.

## Remaining verification

The root orchestrator will run the Science build and update `graph.db` after concurrent edits finish.
The database integration tests remain for the final sequential verification pass.
