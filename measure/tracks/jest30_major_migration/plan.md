# Plan: Jest 30 Major Migration

## Phase 1: Contract & Schema Definition

- [x] Task: Audit Jest 30 breaking changes relevant to the monorepo.
- [x] Task: Identify configuration and API changes needed.

### Phase 1 — Red proof (contract test)

Targeted Red command (bounded to a single file, no watch, no full-suite):

```
pnpm --filter reading-advantage exec jest __test__/jest30-config.contract.test.ts --no-coverage
```

Result at HEAD (Jest 29 baseline, current `apps/reading-advantage/jest.config.ts`):

```
Test Suites: 1 failed, 1 total
Tests:       2 failed, 4 passed, 6 total
```

The 2 failing tests are the load-bearing contract assertions and fail
**for the right reason** (current implementation is wrong, not because
of stale records):

1. `does NOT declare the redundant ts-jest preset` — fails because
   `apps/reading-advantage/jest.config.ts:16` still declares
   `preset: "ts-jest"`.
2. `does NOT use the full module-name 'jest-environment-jsdom' string`
   — fails because `apps/reading-advantage/jest.config.ts:15` still
   declares `testEnvironment: "jest-environment-jsdom"`.

The 4 passing tests (`jsdom` literal, `coverageProvider: "v8"`,
`setupFilesAfterEnv` for `jest.setup.ts`, `next/jest` wiring) pass
because the post-migration target keys are present as
`//`-commented placeholders in the current config and the test reads
the source as text. After Phase 3 replaces the comments with real
declarations (per `jest30-audit.md` §3), those 4 tests must continue
to pass — they are not false-positive Red and are not a contract
loophole.

## Phase 2: Test

- [ ] Task: Add focused test verifying Jest 30 compatibility.
- [ ] Task: Confirm tests fail under the current Jest 29 baseline with Jest 30 config.

## Phase 3: Implement

- [ ] Task: Upgrade Jest to 30.x in reading-advantage and advantage-games.
- [ ] Task: Update Jest configuration for the new schema.
- [ ] Task: Fix any snapshot or mocking API changes.
- [ ] Task: Run test suites in both affected apps.

## Phase 4: Validate & Close

- [ ] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate.
- [ ] Task: Re-run `pnpm outdated` and `pnpm audit`; document results.
- [ ] Task: Update `measure/tech-stack.md` with the selected Jest version.
