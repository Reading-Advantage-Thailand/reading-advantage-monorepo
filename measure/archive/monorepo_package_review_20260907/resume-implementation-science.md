# Science implementation report

## Scope

This repair covers Science quiz completion, observability, type diagnostics, migration support, and historical audit contracts.

The change preserves school, tenant, and attempt owner checks.

## Quiz completion

`scienceAttempts.selectedQuestionIds` stores the question set selected when an attempt starts.

Migration `0057_complex_sleeper.sql` adds the non-null JSONB column with an empty array default.

The empty default does not invent identifiers for existing attempts. Existing incomplete attempts without identifiers receive a structured rejection.

Completed historical attempts remain unchanged.

Submission rejects duplicate, missing, and extra question identifiers before response or reward writes.

The completion transaction claims the attempt before it writes responses. A losing concurrent request receives the structured completed-attempt conflict.

The same transaction writes responses, completion counts, a pending mastery run, profile changes, XP, streaks, and badges.

A failure after the claim rolls back every completion write. The same attempt can then retry.

The integration suite verifies one concurrent winner, one response set, one mastery run, one completion count, and one XP award.

## Science runtime

Science instrumentation now uses the installed OpenTelemetry Node SDK contracts.

A shared initialization promise prevents concurrent registration from starting two SDK instances.

The Sentry build option uses the installed option name.

Science source and fixtures now satisfy the current TypeScript contracts.

The migration test helper runs the installed TypeScript runner through Node. It does not invoke a package manager shim.

Required CI tests run installed TypeScript, ESLint, Vitest, Next.js, and Turbo entrypoints.

The Phase 8 gate retains the Turbo dependency build. It passes `--env-mode=loose` and preserves the inherited environment.

The Phase 12C gate retains the direct Science Next.js build.

## Historical audit evidence

Historical assertions use repository evidence at recorded revisions.

- Inventory assertions use `e5c77751fb9fffcc450b40949afc51bd172226a3`.
- Phase 2 configuration assertions use `1b7d49ed052351ac0b57bb974d44647c43aa57ca`.
- Phase 4 classification assertions use `fd346a83aaabf0072b364f1562a869749868788f`.
- Phase 8 closeout assertions use `a86bb051e149d5891f7ec60e741481cba3774c0b`.
- Seed relocation assertions use `1f8c2a013723e717564bf780030f5603a28da025`.

The tests preserve the existing seed SHA-256 contract. This repair adds no hash and expands no hash scope.

The repaired assertions cover inventory counts, route lists, graph gaps, five classification rows, source removal, JSDoc coverage, and seed content identity.

## Completed validation

- Database focused migration contracts: 52 passed.
- Database Phase 1 current migration contract: 29 passed.
- Domain quiz unit tests: 9 passed.
- Full Domain suite: 839 passed, 7 optional PostgreSQL tests skipped, and 0 failed.
- Science quiz PostgreSQL integration: 19 passed.
- Science assignment PostgreSQL integration: 27 passed.
- Science audit and housekeeping focus: 144 passed.
- Seed relocation focus after independent tree enumeration: 23 passed.
- Science CI gate focus before final launcher changes: 56 passed.
- Science CI file checks after final launcher changes: 7 passed and 5 build tests skipped by the filter.
- Science quiz player tests: 31 passed.
- Science instrumentation and Sentry focus: 12 passed.
- Science browser setup, environment, auth mock, and component focus: 50 passed.
- Science node instrumentation and quiz player focus: 37 passed.
- Student analytics and progress integration focus: 20 passed.
- Six repaired fixture groups under the default config: 61 passed.
- Four UUID student route groups under the default config: 35 passed.
- DSAR import focus: 13 passed and 1 fixture assertion failed.
- DSAR denied-request assertion now compares the matching row count before and after the requests.
- Science migration helper tests: 4 passed.
- Science type check: 0 diagnostics.
- Science lint: 0 errors and 17 existing warnings.
- Workspace type gate: 37 tasks passed.
- Workspace build completed the Science build successfully.

The PostgreSQL checks used database `science_review_0907a` in container `monorepo-review-postgres-20260907` on port 55439.

No external database received a migration.

## Remaining validation

The final workspace test gate is running against the owned PostgreSQL fixture.

The Science task uses the default configuration once. This configuration covers unit and integration tests.

The equivalent Science command is:

```bash
TEST_DATABASE_URL=postgres://postgres:review_local@127.0.0.1:55439/science_review_0907a CI=true node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts --maxWorkers=1 --no-file-parallelism
```

The earlier full unit attempt exposed a recursive Corepack package-manager shim in Phase 13.

The next split attempt exposed the same launcher fault in Phase 12C after 540 seconds.

Installed tool entrypoints replaced those launchers. The final default run will verify the complete gate set.

The historical evidence review is closed. The reviewer verified the independent revisions and all 53 relocated file contents.

The root completed the Science production build successfully.

## Default configuration repairs

The default configuration now loads the browser setup for component tests.

The setup guards browser globals for Node environment tests.

Vitest excludes Playwright files. The existing Playwright runner retains those tests.

Integration users now include the school that owns their Science records.

UUID route fixtures now use valid deterministic identifiers. Their usernames retain cleanup prefixes.

Cleanup deletes child records before parent records. It preserves shared school and immutable audit records.

The DSAR denial test compares scoped counts before and after denied requests.

The invalid mastery JSON path returns a structured 400 response before domain processing.

## Sales evidence import boundary

The packaged Sales evidence files existed in `packages/sales-knowledge/dist`.

Science jsdom transformed the workspace package URL into a Vite `/@fs` path.

The Node file reader then received `/@fs/home/...` instead of the real absolute path.

All three Science Vitest configurations now externalize the built Sales knowledge package path.

Native Node loading preserves `import.meta.url` and the byte-exact packaged evidence validation.

The package build dependency still copies the approved evidence into `dist` before tests run.

The focused regression first reproduced the `ENOENT` failure.

After the configuration repair, the same test passed with exit 0.

Focused ESLint passed for the three configurations and the regression test.

The incremental graph update completed for all four TypeScript files.

Changed files:

- `apps/science-advantage/vitest.config.ts`
- `apps/science-advantage/vitest.unit.config.ts`
- `apps/science-advantage/vitest.integration.config.ts`
- `apps/science-advantage/lib/test/sales-knowledge-package-import.test.ts`
