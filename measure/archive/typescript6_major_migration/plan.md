# Plan: TypeScript 6 Major Migration

## Phase 1: Contract & Schema Definition

- [b] Task: Audit TS 6 breaking changes relevant to the monorepo. — deferred:track-owner
- [b] Task: Identify type patterns that will break under stricter checking. — deferred:track-owner

## Phase 2: Test

- [b] Task: Add type-level tests for critical type aliases and interfaces. — deferred:track-owner
- [b] Task: Confirm `check-types` fails under TS 6 before migration. — deferred:track-owner

## Phase 3: Implement

- [b] Task: Upgrade TypeScript to 6.x. — deferred:track-owner
- [b] Task: Fix type errors introduced by TS 6 strictness. — deferred:track-owner
- [b] Task: Update `tsconfig.json` for new configuration options. — deferred:track-owner
- [b] Task: Run `check-types`, `lint`, and `test` across all workspaces. — deferred:track-owner

## Phase 4: Validate & Close

- [b] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate. — deferred:track-owner
- [b] Task: Re-run `pnpm outdated` and `pnpm audit`; document results. — deferred:track-owner
- [b] Task: Update `measure/tech-stack.md` with the selected TypeScript version. — deferred:track-owner
