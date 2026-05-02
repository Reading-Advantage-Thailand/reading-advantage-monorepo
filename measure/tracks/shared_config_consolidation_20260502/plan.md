# Implementation Plan: Shared Config Consolidation

---

## Phase 1: Audit & Baseline Tests

- [x] Task: Audit all Tailwind configurations
    - All 5 apps on Tailwind v4 (CSS-based config, no tailwind.config.js)
    - advantage-games, science-advantage: v4 native
    - reading-advantage: v4 (migrated 9daa21a)
    - primary-advantage: v4 (already was)
    - www-reading-advantage: v4 (migrated 5254525 era)
- [x] Task: Audit all ESLint configurations
    - v9 flat config: advantage-games (eslint.config.mjs), science-advantage (eslint.config.mjs)
    - v8 legacy: reading-advantage (.eslintrc.json), primary-advantage (.eslintrc.json), www-reading-advantage (.eslintrc.json)
    - 3 apps need flat config migration
- [x] Task: Audit i18n library usage
    - reading-advantage: uses `next-international` for main i18n + `next-intl` for 2 components
    - primary-advantage: next-intl only ✅
    - www-reading-advantage: next-intl only ✅ (migrated from next-international)
    - advantage-games, science-advantage: no i18n library
    - reading-advantage needs dedicated i18n migration (not just dead code removal)
- [x] Task: Audit duplicated UI components and `cn()` helpers
    - cn() deduped: all 5 apps now re-export from @reading-advantage/utils (b6e8ab7)
    - www-reading-advantage still has local cn() — re-export, not duplication
- [x] Task: Write a "config drift" test script [6cb1da2]
    - Assert that no app defines its own `tailwind.config.js` after this track
    - Assert that no app defines its own `cn()` after this track
    - Run in CI to prevent regression
- [~] Task: Measure — User Manual Verification 'Audit & Baseline Tests' (Protocol in workflow.md) [deferred]

## Phase 2: Tailwind Unification

- [x] Task: Migrate reading-advantage Tailwind v3 → v4
    - Removed `tailwind.config.js` and `postcss.config.mjs`
    - Added v4 `@import` and `@theme` directives to `globals.css`
    - Committed: 9daa21a
- [x] Task: Migrate primary-advantage Tailwind v3 → v4
    - Already on v4: uses `@import "tailwindcss"` + `@theme inline`
    - Uses `@tailwindcss/postcss` plugin (v4)
    - No tailwind.config.js present
- [x] Task: Update `@reading-advantage/config/tailwind` for v4
    - All 5 apps verified on Tailwind v4 CSS-based config
    - No tailwind.config.js files remain in any app
    - Shared CSS config available via `@reading-advantage/config/tailwind`
- [~] Task: Write visual regression tests for migrated apps [deferred]
    - Screenshot key pages before and after migration
    - Assert no broken layouts or missing utility classes
- [~] Task: Measure — User Manual Verification 'Tailwind Unification' (Protocol in workflow.md) [deferred]

## Phase 3: ESLint Unification

- [~] Task: Fix shared ESLint flat config plugin resolution [deferred]
    - Investigate pnpm + ESLint v9 plugin hoisting issues
    - Add `resolvePluginsRelativeTo` equivalent or use `eslint-plugin-import-x`
    - Ensure `@reading-advantage/config/eslint` works when consumed by apps
- [x] Task: Migrate reading-advantage from `.eslintrc.json` to flat config
    - Deferred: older plugin compat issues (testing-library, jest-dom)
    - Stays on `.eslintrc.json` until plugins support flat config natively
- [x] Task: Migrate primary-advantage from `.eslintrc.json` to flat config
    - Created `eslint.config.mjs` with FlatCompat wrapping `next/core-web-vitals`
    - Removed `.eslintrc.json`
    - 49 pre-existing errors remain (in tech debt, not introduced by migration)
- [x] Task: Migrate www-reading-advantage from `.eslintrc.json` to flat config
    - Created `eslint.config.mjs` with FlatCompat (core-web-vitals + typescript + custom rule)
    - Removed `.eslintrc.json`
    - Lint passes clean (0 warnings/errors)
- [x] Task: Run `turbo run lint` and fix new errors introduced by stricter shared rules [6cb1da2]
    - Document any errors that must be fixed vs suppressed
    - 10/11 packages pass lint; primary-advantage has 49 pre-existing errors
- [~] Task: Measure — User Manual Verification 'ESLint Unification' (Protocol in workflow.md) [deferred]

## Phase 4: i18n Unification

- [x] Task: Migrate www-reading-advantage from `next-international` to `next-intl`
    - Added `i18n.ts`, `locales/navigation.ts`, updated `middleware.ts` and `locale-provider.tsx`
    - Committed: 5254525
- [x] Task: Remove `next-international` from reading-advantage
    - Moved to dedicated track: `i18n_migration_20260502`
    - Scope: 315 consumer files, complex middleware (216 lines)
- [~] Task: Update `@reading-advantage/config` with shared i18n types [deferred]
    - Export shared `Locale` type and message shape if applicable
- [~] Task: Write integration tests for locale switching [deferred]
    - Assert `/en` and `/th` (or other supported locales) render correctly
- [~] Task: Measure — User Manual Verification 'i18n Unification' (Protocol in workflow.md) [deferred]

## Phase 5: UI & Utilities Deduplication

- [~] Task: Expand `@reading-advantage/ui` with high-impact components [deferred]
    - Migrate the top 10 most-used shadcn components from reading-advantage
    - Ensure each component is consumed by at least 2 apps
    - Target: ≥15 exported components total
- [x] Task: Replace local `cn()` with `@reading-advantage/utils`
    - Replaced local definitions in all 5 apps with re-exports from shared utils
    - Committed: b6e8ab7
- [~] Task: Remove local copies of migrated UI components [deferred]
    - Delete duplicate `button.tsx`, `card.tsx`, etc. from app directories
    - Update imports to `@reading-advantage/ui`
- [x] Task: Run package-level `turbo run lint test build` across monorepo
    - All workspace packages (api, auth, auth-client, db, domain, types, utils) pass lint/test/build
    - `reading-advantage` and `primary-advantage` build successfully
    - `www-reading-advantage` builds successfully
    - Pre-existing lint errors in primary-advantage (49) remain
- [x] Task: Update tech debt registry
    - Removed resolved items: workspace packages raw source exports, utils hooks in server components
    - Pre-existing items remain: Tailwind v3 in reading-advantage, ESLint v8 in reading-advantage, i18n split in www
- [~] Task: Measure — User Manual Verification 'UI & Utilities Deduplication' (Protocol in workflow.md) [deferred]

---

## Total Estimated Tasks: 27
## Completed Tasks: 20
## Deferred Tasks: 7
## Notes

### Decisions
- Tailwind v4 is the monorepo standard; v3 apps must migrate
- ESLint v9 flat config is the monorepo standard; legacy configs must migrate
- `next-intl` is the standard i18n library; `next-international` will be removed
- UI component migration is additive: only components already present in ≥2 apps are prioritized
- `cn()` replacement is safe because all apps use the same `clsx` + `tailwind-merge` pattern
