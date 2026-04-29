# Implementation Plan: Monorepo Scaffold & First Migration

---

## Phase 1: Monorepo Infrastructure

- [ ] Task: Create root `package.json` with pnpm workspace metadata
- [ ] Task: Create `pnpm-workspace.yaml` defining `apps/*` and `packages/*`
- [ ] Task: Install and configure Turborepo (`turbo` as devDependency)
- [ ] Task: Create `turbo.json` with build/lint/test/dev pipeline definitions
    - [ ] Write tests: Verify turbo pipeline resolves dependency graph correctly
    - [ ] Implement turbo.json with topological build ordering
- [ ] Task: Create root `.gitignore` for monorepo artifacts
- [ ] Task: Measure — User Manual Verification 'Monorepo Infrastructure' (Protocol in workflow.md)

## Phase 2: Shared Packages

- [ ] Task: Scaffold `packages/config` with ESLint, TypeScript, and Tailwind base configs
    - [ ] Write tests: Verify each config file is valid and importable
    - [ ] Implement config package structure and exports
- [ ] Task: Scaffold `packages/utils` with cn() helper and common hooks
    - [ ] Write tests: Test cn() with various className combinations
    - [ ] Write tests: Test useLocalStorage hook behavior
    - [ ] Implement utils package with full test coverage
- [ ] Task: Scaffold `packages/ui` with base Button, Card, Dialog, Input, Tabs components
    - [ ] Write tests: Verify each component renders without errors
    - [ ] Write tests: Verify component props are correctly typed
    - [ ] Implement UI package using Radix primitives + Tailwind
- [ ] Task: Verify all shared packages build with `turbo run build --filter=./packages/*`
- [ ] Task: Measure — User Manual Verification 'Shared Packages' (Protocol in workflow.md)

## Phase 3: Migrate advantage-games

- [ ] Task: Copy advantage-games source into `apps/advantage-games/`
- [ ] Task: Update `apps/advantage-games/package.json` to use workspace dependencies
    - [ ] Replace local clsx/tailwind-merge with `@reading-advantage/utils`
    - [ ] Replace local UI primitives with `@reading-advantage/ui`
- [ ] Task: Update `apps/advantage-games/tsconfig.json` to extend shared config
- [ ] Task: Update `apps/advantage-games/eslint.config.*` to extend shared config
- [ ] Task: Update `apps/advantage-games/tailwind.config.*` to extend shared config
- [ ] Task: Resolve any path alias or import issues after migration
- [ ] Task: Run `pnpm dev` and verify app starts without errors
- [ ] Task: Run `turbo build` and verify production build succeeds
- [ ] Task: Run existing Jest tests and ensure they pass in monorepo context
- [ ] Task: Measure — User Manual Verification 'Migrate advantage-games' (Protocol in workflow.md)

## Phase 4: CI/CD & Documentation

- [ ] Task: Create `.github/workflows/ci.yml` running `turbo build lint test`
    - [ ] Write tests: Validate workflow YAML syntax
    - [ ] Implement CI workflow with pnpm setup and turbo remote caching
- [ ] Task: Write `README.md` with setup instructions (clone, install, dev, build)
- [ ] Task: Verify CI pipeline passes on initial commit
- [ ] Task: Measure — User Manual Verification 'CI/CD & Documentation' (Protocol in workflow.md)

---

## Total Estimated Tasks: 28
