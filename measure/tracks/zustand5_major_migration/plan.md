# Plan: Zustand 5 Major Migration

## Phase 1: Contract & Schema Definition

- [ ] Task: Audit Zustand 5 breaking changes and current v4 usage in reading-advantage.
- [ ] Task: Identify store definitions and middleware that need updating.

## Phase 2: Test

- [ ] Task: Add focused tests for store creation under Zustand 5 API.
- [ ] Task: Confirm tests fail against the Zustand 4 baseline.

## Phase 3: Implement

- [ ] Task: Upgrade Zustand to 5.x in reading-advantage.
- [ ] Task: Update store definitions and middleware for Zustand 5 API.
- [ ] Task: Run `check-types`, `lint`, and `test` in reading-advantage.

## Phase 4: Validate & Close

- [ ] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate.
- [ ] Task: Re-run `pnpm outdated` and `pnpm audit`; document results.
- [ ] Task: Update `measure/tech-stack.md` with the selected Zustand version.
