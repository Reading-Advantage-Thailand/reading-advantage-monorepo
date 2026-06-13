# Plan: TypeScript 6 Major Migration

## Phase 1: Contract & Schema Definition

- [ ] Task: Audit TS 6 breaking changes relevant to the monorepo.
- [ ] Task: Identify type patterns that will break under stricter checking.

## Phase 2: Test

- [ ] Task: Add type-level tests for critical type aliases and interfaces.
- [ ] Task: Confirm `check-types` fails under TS 6 before migration.

## Phase 3: Implement

- [ ] Task: Upgrade TypeScript to 6.x.
- [ ] Task: Fix type errors introduced by TS 6 strictness.
- [ ] Task: Update `tsconfig.json` for new configuration options.
- [ ] Task: Run `check-types`, `lint`, and `test` across all workspaces.

## Phase 4: Validate & Close

- [ ] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate.
- [ ] Task: Re-run `pnpm outdated` and `pnpm audit`; document results.
- [ ] Task: Update `measure/tech-stack.md` with the selected TypeScript version.
