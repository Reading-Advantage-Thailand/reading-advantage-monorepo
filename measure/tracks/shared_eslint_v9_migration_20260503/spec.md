# Spec: Shared ESLint v9 Flat Config Migration

## Problem

The shared ESLint flat config doesn't resolve plugins across pnpm workspace boundaries. Apps use local flat configs importing plugins directly instead of the shared config. reading-advantage still uses legacy `.eslintrc.json` (v8).

## Goals

- Migrate reading-advantage from ESLint v8 `.eslintrc.json` to v9 flat config
- Fix plugin resolution across workspace boundaries
- Ensure all apps use the shared `@reading-advantage/config/eslint` package
- Achieve consistent lint rules across the monorepo

## Non-Goals

- Custom rule creation
- ESLint plugin development
- Performance optimization of lint runs

## Acceptance Criteria

- [ ] reading-advantage has `eslint.config.mjs` (no `.eslintrc.json`)
- [ ] All 5 apps import shared config from `@reading-advantage/config/eslint`
- [ ] `pnpm turbo run lint` runs successfully across all apps
- [ ] No plugin resolution errors across workspace boundaries
- [ ] Unit tests cover shared config plugin resolution
