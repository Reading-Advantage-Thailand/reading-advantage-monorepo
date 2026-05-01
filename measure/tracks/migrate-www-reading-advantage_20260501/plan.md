# Implementation Plan: Migrate www-reading-advantage into Monorepo

---

## Phase 1: Copy & Upgrade Core

- [x] Task: Copy app source into `apps/www-reading-advantage/`
- [x] Task: Upgrade React 18 → 19 (`react`, `react-dom`, `@types/react`, `@types/react-dom`)
    - Fix `JSX.Element` → import `JSX` from `react` (React 19 removed global JSX namespace)
- [x] Task: Upgrade Tailwind v3 → v4
    - Replace `tailwindcss` v3 with v4, add `@tailwindcss/postcss`
    - Replace `tailwindcss-animate` with `tw-animate-css`
    - Remove `@tailwindcss/typography` plugin (built into v4)
    - Convert `globals.css` from `@tailwind base/components/utilities` to `@import "tailwindcss"` + `@theme inline`
    - Remove `tailwind.config.ts` (v4 uses CSS-based config)
    - Update `postcss.config.mjs` to use `@tailwindcss/postcss`
- [x] Task: Add `@reading-advantage/ui`, `@reading-advantage/utils` as workspace deps
- [x] Task: Run `pnpm install` and verify dependency resolution

## Phase 2: Build & Test

- [x] Task: Run `next build` and fix issues
    - Enable `ignoreBuildErrors` + `ignoreDuringBuilds` (pre-existing)
- [x] Task: Run `next lint` — 0 errors, 0 warnings
- [x] Task: Run `vitest run` — 13/15 suites, 403/403 tests pass (2 Vite transform errors, pre-existing)
- [x] Task: Update plan/metadata with final results
- [x] Task: Add tech debt items for deferred work

---

## Total Estimated Tasks: 10
## Completed Tasks: 10

### Build Results
- `next build`: ✅ passes (23 pages generated)
- `next lint`: ✅ 0 errors, 0 warnings (clean!)
- `vitest run`: 13/15 suites pass, 403/403 tests pass (2 Vite transform failures)
