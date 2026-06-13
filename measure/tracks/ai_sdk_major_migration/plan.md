# Plan: AI SDK Major Migration

## Phase 1: Contract & Schema Definition

- [ ] Task: Audit current `@ai-sdk/*` versions and identify breaking changes.
- [ ] Task: Map all AI adapter call sites in `packages/domain/src/ai/`.
- [ ] Task: Define version-alignment contracts for the new major.

## Phase 2: Test

- [ ] Task: Add contract tests for the AI adapter layer against the new API.
- [ ] Task: Confirm tests fail against the current (pre-migration) baseline.

## Phase 3: Implement

- [ ] Task: Upgrade `@ai-sdk/*` packages in root and workspace manifests.
- [ ] Task: Update the internal AI adapter for breaking API changes.
- [ ] Task: Run `check-types`, `lint`, and `test` across affected workspaces.

## Phase 4: Validate & Close

- [ ] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate.
- [ ] Task: Re-run `pnpm outdated` and `pnpm audit`; document results.
- [ ] Task: Update `measure/tech-stack.md` with the selected AI SDK version.
