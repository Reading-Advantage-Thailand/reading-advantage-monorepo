# Pilot report: game-cartridges coverage

Scope: `packages/game-cartridges/src`. Coverage excludes `dist/`. Base commit: `01f2acfe8`. Branch: `pilot/cloud-game-cartridges-coverage`.

## Coverage before and after

| Scope | Lines before | Lines after | Branches before | Branches after |
|---|---|---|---|---|
| Package total | 91.81% (12474/13586) | 92.63% (12586/13586) | 79.53% (9738/12244) | 80.53% (9861/12244) |
| `legacy-traversal-cartridges.ts` | 50.67% | 76.47% | 35.25% | 64.74% |
| `astral-mage.ts` | 69.86% | 79.91% | 38.84% | 57.55% |
| `sorcerer-ziggurat.ts` | 72.94% | 84.54% | 44.16% | 65.00% |
| `labyrinth-goblin-king.ts` | 72.43% | 75.00% | 55.70% | 60.26% |
| `shadow-gate-dungeon.ts` | 80.68% | 81.37% | 54.02% | 56.89% |
| `spellweavers-run.ts` | 83.72% | 85.46% | 59.32% | 66.10% |

The package branch total now passes the 80% threshold in `vitest.config.ts`.
Remaining gaps in these files are mostly Phaser scene rendering code.

## Tests added per file

- `legacy-traversal-scoring.test.ts` (22): scoring, route rotation, sentence words, XP, input, restore, shutdown, tutorial actions.
- `astral-mage-rules.test.ts` (21): echo decoys, shot outcomes, final result, restore checks, crystal geometry.
- `sorcerer-ziggurat-rules.test.ts` (20): seeded directions, rune labels, scoring, final result, restore checks.
- `shadow-gate-dungeon-rules.test.ts` (23): crystal scoring, gate victory, movement caps, hazards, restore checks.
- `labyrinth-goblin-king-rules.test.ts` (24): orb scoring, lives, defeat, aura, victory, goblin contact, restore checks.
- `spellweavers-run-rules.test.ts` (20): lane choice, orb timing, sentence building, victory, restore checks.

Total: 130 new tests. No source file changed.

## Defects

1. `packages/game-cartridges/src/legacy-traversal-cartridges.ts:229` accepts a `NaN` target index in `restore()`.
   The range check `< 0 || > targets.length` is false for `NaN`.
   `snapshot()` at line 192-193 then reads `targets[NaN]` and throws a `TypeError`.
   The `it.fails` test in `legacy-traversal-scoring.test.ts` marks it. Commit `87e2f5800`.

## Commands

Run from `packages/game-cartridges` unless noted.

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `git fetch --unshallow` (repo root) | 0 | Full history fetched. |
| 2 | `pnpm install --frozen-lockfile` (repo root) | 0 | Installed. `@vitest/coverage-v8` was present. |
| 3 | `./node_modules/.bin/vitest run --coverage ...` | 127 | No package-local vitest binary. |
| 4 | `../../node_modules/.bin/vitest run --coverage --coverage.include='src/**' --coverage.exclude='dist/**'` | 1 | Dependency `dist` folders missing. |
| 5 | `./node_modules/.bin/turbo run build --filter='@reading-advantage/game-cartridges^...'` (repo root) | 0 | Built `game-contracts` and `advantage-play-kit`. |
| 6 | Command 4 again (baseline) | 1 | 62 files, 800 passed. Branch threshold failed: 79.53% < 80%. |
| 7 | `../../node_modules/.bin/vitest run src/<new file>` per new file | 0 | All new tests pass; one expected fail. |
| 8 | `../../node_modules/.bin/tsc --noEmit -p tsconfig.json` | 0 | No type errors. |
| 9 | `../../node_modules/.bin/eslint <new test files>` | 0 | No lint errors. |
| 10 | Command 4 again (final) | 0 | 68 files, 929 passed, 1 expected fail. |

No test needs a database, a secret, or a network call.
