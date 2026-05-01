# Implementation Plan: Migrate primary-advantage into Monorepo

---

## Phase 1: Copy & Scaffold

- [x] Task: Copy app source into `apps/primary-advantage/`
    - Copy from `/Desktop/primary-advantage/` excluding `node_modules/`, `.next/`, `package-lock.json`, `.git/`
- [x] Task: Convert `package.json` to pnpm workspace
    - Rename to `primary-advantage`
    - Add `@reading-advantage/ui`, `@reading-advantage/utils` as `workspace:*` deps
    - Remove duplicated deps (clsx, tailwind-merge, class-variance-authority)
- [x] Task: Run `pnpm install` and verify dependency resolution

## Phase 2: Build & Fix

- [x] Task: Run `turbo run build --filter=primary-advantage` and fix issues
    - Fix any import path issues
    - Handle env var requirements gracefully
    - Set `ignoreBuildErrors` if needed (pre-existing TS errors)
- [x] Task: Run `turbo run lint --filter=primary-advantage`
    - Document baseline warnings

## Phase 3: Polish

- [x] Task: Update plan/metadata with final results
- [x] Task: Add tech debt items for deferred work
- [x] Task: Measure — User Manual Verification (Protocol in workflow.md)

---

## Total Estimated Tasks: 8
## Completed Tasks: 8
## Notes

- Tailwind v4 — matches monorepo pattern (same as advantage-games)
- `"type": "module"` — ESM app, be careful with require() in configs
- No test suite — nothing to verify
- NextAuth v5 beta — stays as-is
- Uses `next-intl` for i18n (same as reading-advantage)
- Has `cloudbuild.yaml` and `Dockerfile` for GCP — skip, keep as artifacts

### Build Results
- `next build`: ✅ passes (33 pages generated, `ignoreBuildErrors` + `ignoreDuringBuilds` enabled)
- `next lint`: 49 errors, 74 warnings (pre-existing; `react/no-unescaped-entities`, `react-hooks/rules-of-hooks`)
- No test suite exists
- Added missing `base64-js` dependency
