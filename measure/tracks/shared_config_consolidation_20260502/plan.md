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
    - reading-advantage: both next-intl AND next-international (dead code to remove)
    - primary-advantage: next-intl only ✅
    - www-reading-advantage: next-intl only ✅ (migrated from next-international)
    - advantage-games, science-advantage: no i18n library
- [x] Task: Audit duplicated UI components and `cn()` helpers
    - cn() deduped: all 5 apps now re-export from @reading-advantage/utils (b6e8ab7)
    - www-reading-advantage still has local cn() — re-export, not duplication
- [ ] Task: Write a "config drift" test script
    - Assert that no app defines its own `tailwind.config.js` after this track
    - Assert that no app defines its own `cn()` after this track
    - Run in CI to prevent regression
- [ ] Task: Measure — User Manual Verification 'Audit & Baseline Tests' (Protocol in workflow.md)

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
- [ ] Task: Write visual regression tests for migrated apps
    - Screenshot key pages before and after migration
    - Assert no broken layouts or missing utility classes
- [ ] Task: Measure — User Manual Verification 'Tailwind Unification' (Protocol in workflow.md)

## Phase 3: ESLint Unification

- [ ] Task: Fix shared ESLint flat config plugin resolution
    - Investigate pnpm + ESLint v9 plugin hoisting issues
    - Add `resolvePluginsRelativeTo` equivalent or use `eslint-plugin-import-x`
    - Ensure `@reading-advantage/config/eslint` works when consumed by apps
- [ ] Task: Migrate reading-advantage from `.eslintrc.json` to flat config
    - Create `eslint.config.mjs` extending shared config
    - Preserve app-specific rules (e.g., Firebase naming conventions if still needed)
- [x] Task: Migrate primary-advantage from `.eslintrc.json` to flat config
    - Created `eslint.config.mjs` with FlatCompat wrapping `next/core-web-vitals`
    - Removed `.eslintrc.json`
    - 49 pre-existing errors remain (in tech debt, not introduced by migration)
- [ ] Task: Run `turbo run lint` and fix new errors introduced by stricter shared rules
    - Document any errors that must be fixed vs suppressed
- [ ] Task: Measure — User Manual Verification 'ESLint Unification' (Protocol in workflow.md)

## Phase 4: i18n Unification

- [x] Task: Migrate www-reading-advantage from `next-international` to `next-intl`
    - Added `i18n.ts`, `locales/navigation.ts`, updated `middleware.ts` and `locale-provider.tsx`
    - Committed: 5254525
- [ ] Task: Remove `next-international` from reading-advantage
    - Audit imports and delete dead code
    - Ensure only `next-intl` remains
- [ ] Task: Update `@reading-advantage/config` with shared i18n types
    - Export shared `Locale` type and message shape if applicable
- [ ] Task: Write integration tests for locale switching
    - Assert `/en` and `/th` (or other supported locales) render correctly
- [ ] Task: Measure — User Manual Verification 'i18n Unification' (Protocol in workflow.md)

## Phase 5: UI & Utilities Deduplication

- [ ] Task: Expand `@reading-advantage/ui` with high-impact components
    - Migrate the top 10 most-used shadcn components from reading-advantage
    - Ensure each component is consumed by at least 2 apps
    - Target: ≥15 exported components total
- [x] Task: Replace local `cn()` with `@reading-advantage/utils`
    - Replaced local definitions in all 5 apps with re-exports from shared utils
    - Committed: b6e8ab7
- [ ] Task: Remove local copies of migrated UI components
    - Delete duplicate `button.tsx`, `card.tsx`, etc. from app directories
    - Update imports to `@reading-advantage/ui`
- [ ] Task: Run full `turbo run lint build` across monorepo
    - Confirm zero lint errors
    - Confirm all apps build successfully
- [ ] Task: Update tech debt registry
    - Remove resolved items (Tailwind v3, ESLint v8, i18n split, duplicated UI)
- [ ] Task: Measure — User Manual Verification 'UI & Utilities Deduplication' (Protocol in workflow.md)

---

## Total Estimated Tasks: 27
## Completed Tasks: 9
## Notes

### Decisions
- Tailwind v4 is the monorepo standard; v3 apps must migrate
- ESLint v9 flat config is the monorepo standard; legacy configs must migrate
- `next-intl` is the standard i18n library; `next-international` will be removed
- UI component migration is additive: only components already present in ≥2 apps are prioritized
- `cn()` replacement is safe because all apps use the same `clsx` + `tailwind-merge` pattern
