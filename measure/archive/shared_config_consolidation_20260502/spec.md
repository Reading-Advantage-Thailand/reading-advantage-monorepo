# Specification: Shared Config Consolidation

## Context

Despite having a `packages/config/` directory, most apps still use local tooling configurations, creating fragmentation:
- **Tailwind**: advantage-games and monorepo packages use v4 CSS-based config; reading-advantage and primary-advantage still use v3 `tailwind.config.js`
- **ESLint**: reading-advantage uses `.eslintrc.json` (v8); monorepo shared config uses flat config v9 but doesn't resolve plugins across pnpm boundaries
- **i18n**: www-reading-advantage uses `next-international`; reading-advantage and primary-advantage use `next-intl` (and reading-advantage imports both)
- **UI components**: reading-advantage has 36 local shadcn components; only 5 are in `@reading-advantage/ui`
- **Utilities**: `cn()` helper duplicated in 127+ files across apps

This track consolidates all shared tooling so every app consumes `@reading-advantage/config` and `@reading-advantage/ui`, eliminating drift and reducing maintenance surface.

## Goals

1. Migrate remaining Tailwind v3 apps to v4 CSS-based config in `@reading-advantage/config/tailwind`
2. Fix ESLint flat config plugin resolution across pnpm workspace boundaries
3. Unify i18n on `next-intl` and remove `next-international` from all apps
4. Expand `@reading-advantage/ui` with the most commonly duplicated shadcn components
5. Replace all local `cn()` copies with `@reading-advantage/utils`

## Acceptance Criteria

- [ ] No app has a `tailwind.config.js` (all use v4 CSS import from shared package)
- [ ] No app has `.eslintrc.json` (all use flat config extending `@reading-advantage/config/eslint`)
- [ ] `next-international` is removed from every `package.json`
- [ ] `@reading-advantage/ui` exports ≥15 components consumed by ≥3 apps
- [ ] `cn()` is imported from `@reading-advantage/utils` in all apps (zero local copies)
- [ ] `turbo run lint` passes with zero errors in all apps
- [ ] `turbo run build` passes for all apps after config changes
- [ ] Tech debt updated: resolved items removed or marked closed

## Out of Scope

- Migrating test runners (Jest → Vitest) — belongs in `unified-ci-cd-pipeline` or a future track
- Removing MUI from reading-advantage (keep alongside Radix for now)
- Upgrading Next.js versions per app
- Adding new UI components not already present in any app

## References

- `measure/tech-debt.md` — Tailwind v3/v4 split, ESLint plugin resolution, i18n split, duplicated UI
- `measure/product.md` — Shared Component Library and Shared Tooling goals
- `packages/config/` — existing shared configs
- `packages/ui/` — existing shared UI package
