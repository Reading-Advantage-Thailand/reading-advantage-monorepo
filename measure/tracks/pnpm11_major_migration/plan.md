# Plan: pnpm 11 Major Migration

## Phase 1: Contract & Schema Definition

- [ ] Task: Audit pnpm 11 breaking changes relevant to the monorepo.
- [ ] Task: Identify workspace protocol and lockfile format changes.

## Phase 2: Test

- [ ] Task: Add lockfile compatibility test for pnpm 11 format.
- [ ] Task: Confirm `pnpm install --frozen-lockfile` fails under pnpm 11 with old lockfile.

## Phase 3: Implement

- [ ] Task: Upgrade pnpm to 11.x.
- [ ] Task: Regenerate lockfile under pnpm 11.
- [ ] Task: Update `pnpm-workspace.yaml` for any protocol changes.
- [ ] Task: Update CI pipelines for pnpm 11.
- [ ] Task: Run `pnpm install --frozen-lockfile` and `pnpm dedupe --check`.

## Phase 4: Validate & Close

- [ ] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate.
- [ ] Task: Re-run `pnpm outdated` and `pnpm audit`; document results.
- [ ] Task: Update `measure/tech-stack.md` with the selected pnpm version.
