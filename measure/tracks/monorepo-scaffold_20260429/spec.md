# Specification: Monorepo Scaffold & First Migration

## Overview

Establish the `reading-advantage-monorepo` foundation using pnpm workspaces and Turborepo. Migrate `advantage-games` as the proof-of-concept app to validate the monorepo structure, shared package consumption, and build pipeline.

## Requirements

### 1. Monorepo Infrastructure

- Initialize `pnpm-workspace.yaml` with `apps/*` and `packages/*` globs
- Create root `package.json` with pnpm workspace configuration
- Add `turbo.json` with pipeline definitions for:
  - `build` (with dependency topology)
  - `lint`
  - `test`
  - `dev`
- Configure `.gitignore` for monorepo root (node_modules, .turbo, dist, build outputs)

### 2. Shared Packages

Create three foundational shared packages:

- **`packages/ui`** — Extracted Radix UI + Tailwind components
  - Must export at least: Button, Card, Dialog, Input, Tabs
  - Must include its own `tsconfig.json` and build configuration
  - Must be consumable by apps via `workspace:*` protocol

- **`packages/utils`** — Shared TypeScript utilities
  - Must export: cn() helper (clsx + tailwind-merge), common hooks (useLocalStorage, useMediaQuery)
  - Must include unit tests with Vitest

- **`packages/config`** — Shared toolchain configurations
  - Must export: base ESLint flat config, base TypeScript config, base Tailwind config
  - Must be importable by apps and packages

### 3. App Migration (advantage-games)

- Copy `advantage-games` source into `apps/advantage-games/`
- Replace local UI components with imports from `@reading-advantage/ui`
- Replace local utility functions with imports from `@reading-advantage/utils`
- Adopt shared ESLint and TypeScript configs from `@reading-advantage/config`
- Ensure `next.config.js` is compatible with monorepo path aliases
- Verify `pnpm dev` starts the app successfully
- Verify `turbo build` compiles the app successfully

### 4. React 19 Compatibility

- Ensure all shared packages build correctly against React 19
- Verify `advantage-games` (already on React 19) consumes shared packages without type errors

## Acceptance Criteria

- [ ] `pnpm install` from root installs all dependencies across apps and packages
- [ ] `turbo build` builds `packages/ui`, `packages/utils`, then `apps/advantage-games` in correct order
- [ ] `turbo lint` runs ESLint across all workspaces
- [ ] `turbo test` runs test suites across all workspaces
- [ ] `pnpm dev` starts advantage-games dev server on expected port
- [ ] advantage-games renders its main page without console errors
- [ ] Shared Button component from `@reading-advantage/ui` renders correctly inside advantage-games
- [ ] CI-ready: GitHub Actions workflow file exists that runs `turbo build lint test` on PR

## Constraints

- Do NOT migrate other apps in this track (science-advantage, reading-advantage, primary-advantage, www-reading-advantage)
- Do NOT refactor app logic beyond what's necessary for monorepo compatibility
- Preserve existing advantage-games git history if possible (consider `git subtree` or filter-repo later; for now, copy is acceptable)
