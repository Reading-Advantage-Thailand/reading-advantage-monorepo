# Plan: Jest 30 Major Migration

## Phase 1: Contract & Schema Definition

- [ ] Task: Audit Jest 30 breaking changes relevant to the monorepo.
- [ ] Task: Identify configuration and API changes needed.

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
