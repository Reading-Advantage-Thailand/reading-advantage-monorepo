# Specification: Migrate www-reading-advantage into Monorepo

## Context

www-reading-advantage is the company marketing/website app built with Next.js 15, MDX, Tailwind v3, React 18, next-international, and Vitest. Needs React 18→19 upgrade and Tailwind v3→v4 migration as part of monorepo unification.

## Goals

1. Copy app source into `apps/www-reading-advantage/`
2. Upgrade React 18 → 19
3. Upgrade Tailwind v3 → v4 (CSS-based config)
4. Convert to pnpm workspace deps
5. Ensure the app builds, lints, and tests pass

## Acceptance Criteria

- [x] `apps/www-reading-advantage/` exists with full app source
- [x] React upgraded to ^19
- [x] Tailwind upgraded to v4 with CSS-based config
- [x] `pnpm install` succeeds
- [x] `turbo run build` succeeds
- [x] `turbo run lint` passes (0 errors, 0 warnings)
- [x] Tests: 13/15 suites, 403/403 tests pass
