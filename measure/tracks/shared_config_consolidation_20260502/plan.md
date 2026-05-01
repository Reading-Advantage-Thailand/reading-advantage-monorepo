# Implementation Plan: Shared Config Consolidation

---

## Phase 1: Audit & Baseline Tests

- [ ] Task: Audit all Tailwind configurations
    - List every app with `tailwind.config.js` or `tailwind.config.ts`
    - Document custom theme extensions per app
    - Record v3 vs v4 usage matrix
- [ ] Task: Audit all ESLint configurations
    - List `.eslintrc.json`, `.eslintrc.js`, and flat config files
    - Document plugin usage and version (v8 vs v9)
    - Record which plugins fail to resolve across pnpm boundaries
- [ ] Task: Audit i18n library usage
    - Search `package.json` files for `next-international` and `next-intl`
    - Document locale files and routing setup per app
- [ ] Task: Audit duplicated UI components and `cn()` helpers
    - Count local shadcn components per app
    - Count `cn()` function definitions outside `@reading-advantage/utils`
- [ ] Task: Write a "config drift" test script
    - Assert that no app defines its own `tailwind.config.js` after this track
    - Assert that no app defines its own `cn()` after this track
    - Run in CI to prevent regression
- [ ] Task: Measure — User Manual Verification 'Audit & Baseline Tests' (Protocol in workflow.md)

## Phase 2: Tailwind Unification

- [ ] Task: Migrate reading-advantage Tailwind v3 → v4
    - Remove `tailwind.config.js` and `postcss.config.mjs`
    - Add `@import "@reading-advantage/config/tailwind";` to app CSS entry
    - Resolve `tailwindcss-animate` usage (v4 built-in or plugin equivalent)
- [ ] Task: Migrate primary-advantage Tailwind v3 → v4
    - Same process as reading-advantage
    - Preserve custom theme extensions by inlining into `@theme`
- [ ] Task: Update `@reading-advantage/config/tailwind` for v4
    - Ensure shared CSS exports work for all apps
    - Document how apps override tokens in `@theme inline`
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
- [ ] Task: Migrate primary-advantage from `.eslintrc.json` to flat config
    - Same process as reading-advantage
- [ ] Task: Run `turbo run lint` and fix new errors introduced by stricter shared rules
    - Document any errors that must be fixed vs suppressed
- [ ] Task: Measure — User Manual Verification 'ESLint Unification' (Protocol in workflow.md)

## Phase 4: i18n Unification

- [ ] Task: Migrate www-reading-advantage from `next-international` to `next-intl`
    - Replace `I18nProvider` with `NextIntlClientProvider`
    - Convert locale files to `next-intl` format
    - Update middleware and routing config
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
- [ ] Task: Replace local `cn()` with `@reading-advantage/utils`
    - Find-and-replace in all apps except where local `cn` has custom behavior
    - Verify no build errors after replacement
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

## Total Estimated Tasks: 16
## Completed Tasks: 0
## Notes

### Decisions
- Tailwind v4 is the monorepo standard; v3 apps must migrate
- ESLint v9 flat config is the monorepo standard; legacy configs must migrate
- `next-intl` is the standard i18n library; `next-international` will be removed
- UI component migration is additive: only components already present in ≥2 apps are prioritized
- `cn()` replacement is safe because all apps use the same `clsx` + `tailwind-merge` pattern
