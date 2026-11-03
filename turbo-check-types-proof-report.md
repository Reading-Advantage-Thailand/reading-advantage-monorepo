# Turbo check-types proof at 01f2acfe8

Base: commit 39c12055f (01f2acfe8 plus the turbo-tooling change). Clean cloud clone.
Command for both runs: `./node_modules/.bin/turbo run check-types --continue`.

## Setup

- `git fetch --unshallow` ran first.
- `pnpm install --frozen-lockfile` exited 0 before Run A. No dist/ folder existed.
- Before Run B, all dist/ folders and turbo caches were removed.
- turbo.json and pnpm-workspace.yaml were restored from 01f2acfe8.
- The second install printed "Done in 17.7s" but the pnpm process did not exit.
- After 10 minutes the stalled pnpm process was killed. Run B then started.
- `git checkout HEAD -- .` restored the tree after Run B. `git status` showed it clean.

## Run A: with the change

- Exit code: 134.
- Tasks: 71 total, 69 passed, 2 failed. Totals include 28 build tasks and 43 check-types tasks.
- check-types tasks: 41 passed, 2 failed.
- Failed tasks:
  - `@reading-advantage/backend#check-types` (exit 2)
  - `reading-advantage#check-types` (exit 134, JavaScript heap out of memory)
- TS2307 lines: 0.
- The backend failure is one error:
  `src/modules/accounting/__tests__/submissions.test.ts(252,40): error TS2820: Type '"usd"' is not assignable to type '"THB" | "USD" | "JPY"'. Did you mean '"USD"'?`

## Run B: without the change

- Exit code: 134.
- Tasks: 45 total, 20 passed, 25 failed. Totals include 2 build tasks and 43 check-types tasks.
- check-types tasks: 18 passed, 25 failed.
- TS2307 lines: 2786.
- Failed tasks:
  - `@reading-advantage/activity-runtime#check-types`
  - `@reading-advantage/advantage-play-kit-3d#check-types`
  - `@reading-advantage/api#check-types`
  - `@reading-advantage/auth#check-types`
  - `@reading-advantage/backend#check-types`
  - `@reading-advantage/codecamp-knowledge#check-types`
  - `@reading-advantage/db#check-types`
  - `@reading-advantage/domain#check-types`
  - `@reading-advantage/game-cartridges-3d#check-types`
  - `@reading-advantage/knowledge-space-practice#check-types`
  - `@reading-advantage/mastery-runtime-compat#check-types`
  - `@reading-advantage/sales-knowledge#check-types`
  - `@reading-advantage/srs-engine#check-types`
  - `@reading-advantage/webhooks#check-types`
  - `@reading-advantage/worker#check-types`
  - `accounting#check-types`
  - `accounts#check-types`
  - `codecamp-advantage#check-types`
  - `marketing#check-types`
  - `primary-advantage#check-types`
  - `reading-advantage#check-types` (JavaScript heap out of memory)
  - `sales-advantage#check-types`
  - `science-advantage#check-types`
  - `vocabulary-games#check-types`
  - `workbooks#check-types`

First 20 TS2307 lines:

```
@reading-advantage/sales-knowledge:check-types: src/contracts.ts(4,8): error TS2307: Cannot find module '@reading-advantage/knowledge-space-core' or its corresponding type declarations.
@reading-advantage/sales-knowledge:check-types: src/graph.ts(4,8): error TS2307: Cannot find module '@reading-advantage/knowledge-space-core' or its corresponding type declarations.
@reading-advantage/sales-knowledge:check-types: src/validation.ts(5,8): error TS2307: Cannot find module '@reading-advantage/knowledge-space-core' or its corresponding type declarations.
@reading-advantage/srs-engine:check-types: src/srs/contract.ts(81,8): error TS2307: Cannot find module '@reading-advantage/practice-core/srs-rating' or its corresponding type declarations.
@reading-advantage/srs-engine:check-types: src/srs/contract.ts(86,8): error TS2307: Cannot find module '@reading-advantage/practice-core/srs-rating' or its corresponding type declarations.
@reading-advantage/srs-engine:check-types: src/srs/contract.ts(92,45): error TS2307: Cannot find module '@reading-advantage/practice-core/timing-baseline' or its corresponding type declarations.
@reading-advantage/srs-engine:check-types: src/srs/contract.ts(93,38): error TS2307: Cannot find module '@reading-advantage/practice-core/timing-baseline' or its corresponding type declarations.
@reading-advantage/srs-engine:check-types: src/srs/contract.ts(94,45): error TS2307: Cannot find module '@reading-advantage/practice-core/timing-baseline' or its corresponding type declarations.
@reading-advantage/srs-engine:check-types: src/srs/contract.ts(104,8): error TS2307: Cannot find module '@reading-advantage/practice-core/contract' or its corresponding type declarations.
@reading-advantage/srs-engine:check-types: src/srs/review-processor.ts(17,8): error TS2307: Cannot find module '@reading-advantage/practice-core/srs-rating' or its corresponding type declarations.
@reading-advantage/srs-engine:check-types: src/srs/review-processor.ts(18,38): error TS2307: Cannot find module '@reading-advantage/practice-core/timing-baseline' or its corresponding type declarations.
@reading-advantage/srs-engine:check-types: src/srs/srs-proficiency.ts(7,45): error TS2307: Cannot find module '@reading-advantage/practice-core' or its corresponding type declarations.
@reading-advantage/srs-engine:check-types: src/srs/submission-srs-adapter.ts(7,40): error TS2307: Cannot find module '@reading-advantage/practice-core/srs-rating' or its corresponding type declarations.
@reading-advantage/srs-engine:check-types: src/srs/submission-srs-adapter.ts(8,38): error TS2307: Cannot find module '@reading-advantage/practice-core/timing-baseline' or its corresponding type declarations.
@reading-advantage/knowledge-space-practice:check-types: src/blueprints/types.ts(2,35): error TS2307: Cannot find module '@reading-advantage/knowledge-space-core' or its corresponding type declarations.
@reading-advantage/knowledge-space-practice:check-types: src/misconception-loop.ts(10,49): error TS2307: Cannot find module '@reading-advantage/practice-core/contract' or its corresponding type declarations.
@reading-advantage/knowledge-space-practice:check-types: src/projections/activity-map.ts(1,61): error TS2307: Cannot find module '@reading-advantage/knowledge-space-core' or its corresponding type declarations.
@reading-advantage/knowledge-space-practice:check-types: src/projections/fixtures.ts(4,66): error TS2307: Cannot find module '@reading-advantage/knowledge-space-core' or its corresponding type declarations.
@reading-advantage/knowledge-space-practice:check-types: src/projections/srs.ts(1,61): error TS2307: Cannot find module '@reading-advantage/knowledge-space-core' or its corresponding type declarations.
@reading-advantage/knowledge-space-practice:check-types: src/projections/teacher-evidence.ts(1,61): error TS2307: Cannot find module '@reading-advantage/knowledge-space-core' or its corresponding type declarations.
```

## Verdict

The change removes all TS2307 failures. TS2307 lines drop from 2786 to 0. Failed check-types tasks drop from 25 to 2. The change adds no failed task. Both remaining failures also fail in Run B. reading-advantage runs out of heap memory in both runs. backend fails in both runs, for a different reason in each. In Run A, backend shows one TS2820 error in a test file. Run B does not show it, because unresolved imports hide that type. The change exposes this latent error. It does not cause it.
