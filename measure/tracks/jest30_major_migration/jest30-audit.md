# Jest 30 Breaking-Changes Audit (Phase 1 Artifact Contract)

**Phase 1 deliverable.** This document is the contract artifact for the
Jest 30 major migration. It is the only executable artifact Phase 1
produces besides the companion `__test__/jest30-config.contract.test.ts`
shape check. The matrix below maps every Jest 30 breaking change that
touches the monorepo to:

- the file(s) currently in scope,
- the required migration action,
- the Phase 3 task that owns the change,
- a status flag (`required` / `vacuous` / `out-of-scope`).

Phase 2 will introduce the **red** behavioral test that proves a
Jest-30-only API path fails on the current Jest 29 baseline.

## 1. Inventory At Audit Time (2026-06-18)

| App | `jest` | `jest-environment-jsdom` | `ts-jest` | `@types/jest` | `preset` in config |
|---|---|---|---|---|---|
| `apps/reading-advantage` | `^29.7.0` | `^29.7.0` | `^29.2.5` | `^29.5.12` | `"ts-jest"` (redundant with `next/jest`) |
| `apps/advantage-games` | `^30.2.0` | `^30.2.0` | _(not present)_ | _(not present)_ | _(none — uses `next/jest` SWC only)_ |

`apps/advantage-games` is already the post-condition; it is the
working reference. The migration moves `apps/reading-advantage` from
the Jest 29 + redundant `ts-jest` preset to a Jest 30 configuration
that matches `apps/advantage-games`.

## 2. Breaking-Changes Matrix

| # | Jest 30 breaking change | Touches monorepo? | Where | Required action | Owner phase | Status |
|---|---|---|---|---|---|---|
| 1 | Default Node version: Node 18+ required (Node 14/16 dropped) | Yes | `apps/reading-advantage`, `apps/advantage-games` | Verify engines via `pnpm -r --filter "*/package.json" exec node -v`; bump CI image if <18 | Phase 3 | required |
| 2 | `ts-jest` 29.x peer-depends on `jest@^29`; silent install is allowed by pnpm but breaks at runtime on TS-only test files | Yes | `apps/reading-advantage` (declares `ts-jest@^29.2.5`) | Drop the `preset: "ts-jest"` line in `jest.config.ts` — `next/jest` already wires SWC for TS, matching `apps/advantage-games/jest.config.ts` | Phase 3 | required |
| 3 | `@types/jest@^29` types pass TS check under Jest 30 runtime, masking breaking types | Yes | `apps/reading-advantage` (declares `@types/jest@^29.5.12`) | Bump `@types/jest` to `^30` in lockstep with `jest` | Phase 3 | required |
| 4 | `testEnvironment: "jest-environment-jsdom"` (full module name) is still valid but `testEnvironment: "jsdom"` is the new convention | Yes | `apps/reading-advantage/jest.config.ts:15` | Replace with `'jsdom'` literal to match `apps/advantage-games/jest.config.ts:12` | Phase 3 | required |
| 5 | `jest.requireActual` API kept, but module-graph caching is tightened | Yes | 7 files in `apps/reading-advantage` (`castle-defense.test`, `dragon-rider.test`, `dragon-flight.test`, `dashboard-summary.test`, `assignment-prediction.test`, `query-optimizer.test`, `useRPGBattleStore.test`) | Re-run each individually after the upgrade (see `test-strategy.md` §3 canary list) | Phase 3 | required (smoke) |
| 6 | `useFakeTimers` API kept, modern timer is now default | Yes | 6 Konva/hook tests in `apps/reading-advantage/hooks/` and `lib/games/` | Re-run each individually; no source change expected | Phase 3 | required (smoke) |
| 7 | `toMatchSnapshot` snapshot format updated (v30) | **No** | — | rg returns zero callers in either app. AC #3 ("Snapshot tests updated") is vacuously satisfied; record in Phase 4 closeout | Phase 4 | vacuous |
| 8 | ESM-style mocks via `jest.unstable_mockModule` replaced by stable `jest.mock` and new `jest.unstable_mockModule` semantics | **No** | — | rg returns zero callers; largest ESM landmine sidestepped | Phase 4 | out-of-scope |
| 9 | New `testRunner: "jest-circus"` default (was `jest-jasmine2`) | **No (covered)** | — | Already the default in Jest 29.7+; no action required | Phase 4 | vacuous |
| 10 | `jest-environment-node` and `jest-environment-jsdom` are now `jest-environment-jsdom` v30+ peers; **not** auto-installed | Yes | `apps/reading-advantage` | Confirm `jest-environment-jsdom@^30.2.0` is in the lockfile (advantage-games reference already has it) | Phase 3 | required |
| 11 | `jest.fn().mock.calls` typing tightened (unknown → `unknown[]`) | Possible | All `jest.fn()` callers | Will surface only in `check-types`; Phase 3 must run `pnpm turbo run check-types` before declaring done | Phase 3 | required (check) |
| 12 | `globalSetup`/`globalTeardown` are now async-only; sync forms are removed | **No** | — | rg returns zero callers in either app | Phase 4 | out-of-scope |
| 13 | `coverageProvider: "v8"` is the new default; `babel` provider is removed | No-op for RA; advantage-games already opts in | — | `apps/advantage-games/jest.config.ts:11` already sets `coverageProvider: 'v8'`; reading-advantage should follow suit in Phase 3 | Phase 3 | required (parity) |
| 14 | `testEnvironmentOptions` keys renamed (`userAgent`, `url`) | **No** | — | Neither app uses `testEnvironmentOptions` | Phase 4 | out-of-scope |
| 15 | `maxConcurrency` of `test()` removed (use `describe.concurrent`) | **No** | — | rg returns zero callers | Phase 4 | out-of-scope |
| 16 | `jest-haste-map` `haste` defaults removed | No (Next.js sets its own) | — | `next/jest` already configures haste correctly | Phase 4 | vacuous |

## 3. Required Configuration Changes (Phase 3 input)

`apps/reading-advantage/jest.config.ts` must change as follows before
the Jest 30 dependency bump in `package.json`:

```ts
// BEFORE (Jest 29, current)
const config: Config = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  preset: "ts-jest",                  // ← REMOVE
  moduleNameMapper: { /* unchanged */ },
};

// AFTER (Jest 30, target)
const config: Config = {
  coverageProvider: "v8",             // ← ADD (parity with advantage-games)
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",           // ← CHANGE literal
  moduleNameMapper: { /* unchanged */ },
};
```

`apps/reading-advantage/package.json` devDependencies must change:

```json
// BEFORE
"@types/jest": "^29.5.12",
"jest": "^29.7.0",
"jest-environment-jsdom": "^29.7.0",
"ts-jest": "^29.2.5"

// AFTER
"@types/jest": "^30.2.0",           // ← BUMP (lockstep with jest)
"jest": "^30.2.0",                   // ← BUMP
"jest-environment-jsdom": "^30.2.0"  // ← BUMP
// "ts-jest" line deleted              // ← REMOVE
```

`apps/advantage-games` requires **no changes** — it is already the
post-condition.

## 4. Acceptance Criteria Mapping

| AC# | AC text | Satisfied by | Phase |
|---|---|---|---|
| 1 | Jest upgraded from 29.x to 30.x in reading-advantage and advantage-games | §1 inventory + §3 bump list | Phase 3 |
| 2 | All Jest configuration files updated for the new schema | §3 before/after diff | Phase 3 |
| 3 | Snapshot tests updated for any format changes | §2 row 7 (`vacuous`) | Phase 4 closeout |
| 4 | All existing test suites pass under Jest 30 | §2 rows 5, 6 hotspot smoke + full re-run | Phase 3 + Phase 4 |
| 5 | Module resolution configuration compatible with monorepo setup | §2 row 10 peer check | Phase 3 |
| 6 | `pnpm outdated -r` shows Jest at the target major version | Aggregate gate | Phase 4 |
| 7 | Documentation updated in `measure/tech-stack.md` | tech-stack.md edit | Phase 4 |

## 5. Companion Config-Shape Contract Test

`apps/reading-advantage/__test__/jest30-config.contract.test.ts` is
the only executable Phase 1 artifact. It is labeled as a **shape
contract**, not a live-behavior test:

- It imports the source-of-truth `jest.config.ts` (the literal
  `next/jest`-wrapped config) and inspects the keys.
- It asserts the keys/values required for Jest 30 (no `preset`,
  `coverageProvider: "v8"`, `testEnvironment: "jsdom"`).
- It will FAIL on the current Jest 29 baseline (the config has
  `preset: "ts-jest"` and `testEnvironment: "jest-environment-jsdom"`),
  proving the contract is enforced by Jest 30 schema, not by runtime.

Phase 2 will add a separate **live-behavior** red test that exercises
a Jest-30-only API path (e.g., `expect.getState().testPath` typing,
or the tightened `jest.fn().mock.calls` signature). Phase 2 does not
modify this contract test.

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Pre-existing hang in `pnpm --filter reading-advantage test` (full run) | High (>10min, see `tech-debt.md`) | Mask Jest-30 regressions | Phase 4 must declare the gate as targeted `__test__` (194-test baseline) and document the choice; do not silently downgrade |
| `ts-jest` peer drift (pnpm allows, runtime breaks) | Medium | Silent green at install, red at test | Drop `preset: "ts-jest"` (recommended); if kept, bump to `^29.1.x` Jest-30-compatible release — but drop is simpler and matches advantage-games |
| `@types/jest` drift (TS green on Jest-29 types) | High (silent) | Misleading type checks | Bump `@types/jest` in lockstep with `jest` |
| 7 `jest.requireActual` callers fail under tightened module caching | Medium | Per-file test failures | Run each individually first; fix in source, not via `testPathIgnorePatterns` |
| 6 `useFakeTimers` callers break on modern-timer default | Low | Per-file test failures | Run each individually; legacy timers via `legacyFakeTimers: true` only if needed |

## 7. Phase 1 → Phase 2 Handoff

Phase 2 must:

1. Add **one** new test file (single-purpose, live-behavior) at
   `apps/reading-advantage/__test__/jest30-red.test.ts`.
2. Use a Jest-30-only API guarantee (e.g., tightened
   `jest.fn().mock.calls` typing via `expect.objectContaining`, or
   `expect.getState().testPath` semantics that differ between 29 and
   30).
3. Verify the new test FAILS on the current Jest 29 baseline AND
   PASSES on `apps/advantage-games` (already Jest 30).
4. Do not modify `jest30-config.contract.test.ts` (Phase 1 owns it).
5. Do not run the aggregate `pnpm turbo run test` between Phase 2
   and Phase 3 — the new red test would mask other regressions.
