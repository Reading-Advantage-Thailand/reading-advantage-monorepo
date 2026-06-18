# Plan: Jest 30 Major Migration

## Phase 1: Contract & Schema Definition

- [x] Task: Audit Jest 30 breaking changes relevant to the monorepo. (`ee707dfd`)
- [x] Task: Identify configuration and API changes needed. (`ee707dfd`)

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

### Phase 1 — Green proof (config shape applied)

Commit `04c76fc7` applied the §3 changes from `jest30-audit.md`:
removed `preset: "ts-jest"`, replaced `testEnvironment:
"jest-environment-jsdom"` with `"jsdom"`, and activated
`coverageProvider: "v8"`.

```
Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

## Phase 2: Test

- [~] Task: Add focused test verifying Jest 30 compatibility.
- [~] Task: Confirm tests fail under the current Jest 29 baseline with Jest 30 config.

### Phase 2 — Red proof (live-behavior test)

Targeted Red command (bounded to a single new file, no watch, no full
suite; the `jest.config.ts` already applied in Phase 1 — commit
`04c76fc7` — drives the contract test green, so this Red proof is the
**runtime** companion to the Phase 1 **config-shape** proof):

```
cd apps/reading-advantage && ../../node_modules/.bin/jest __test__/jest30-red.test.ts --no-coverage
```

(Falls back to `./node_modules/.bin/jest` in apps/reading-advantage;
the absolute path above is used by the track's CI script. Both are
equivalent — the test path is the single source of truth for
"bounded".)

Red proof (added at the START of Phase 2, before any Phase 3 bump):

```
Test Suites: 1 failed, 1 total
Tests:       3 failed, 1 passed, 4 total
```

The 3 failing tests fail **for the right reason** — the installed
`jest` runtime is on the 29.x release line, which is exactly the
missing-behavior Phase 3 will remediate. The 1 passing test
(`expect.getState() returns an object with a `testPath` field`) is a
sentinel that the test harness itself is healthy; it passes on both
Jest 29 and Jest 30 and is documented as such inline so reviewers
cannot mistake it for a false-positive Red.

Cross-app sanity (advantage-games is already on Jest 30.x — the
post-condition):

```
cd apps/advantage-games && ../../node_modules/.bin/jest __test__/jest30-red.test.ts --no-coverage
```

```
Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

The same test file is copied into `apps/advantage-games/__test__/` so
the cross-app check uses the **identical** source (no parallel
maintenance). The copy is owned by this track and is folded into the
same Red commit; both copies are deleted when Phase 3 lands the
runtime bump (the file's value disappears once the migration is
green).

See `jest30-red.test.ts` inline header for the design rationale
(version-resolved runtime check, bounded scope, no full-suite
hazard).

## Phase 3: Implement

- [ ] Task: Upgrade Jest to 30.x in reading-advantage and advantage-games.
- [ ] Task: Update Jest configuration for the new schema.
- [ ] Task: Fix any snapshot or mocking API changes.
- [ ] Task: Run test suites in both affected apps.

## Phase 4: Validate & Close

- [ ] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate.
- [ ] Task: Re-run `pnpm outdated` and `pnpm audit`; document results.
- [ ] Task: Update `measure/tech-stack.md` with the selected Jest version.
