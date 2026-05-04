# Plan: Reading-Advantage Build Remediation

- [x] Run `pnpm turbo run build --filter=reading-advantage` and catalog all TypeScript errors
  - Fixed: Recreated missing `configs/locale-config.ts` (deleted during i18n migration but still imported by 5 files)
  - Build currently hangs during "Creating an optimized production build" — likely due to system memory constraints (2GB available, Next.js 16 + webpack requires more)
  - Blocker: Cannot complete full build verification on current hardware
- [ ] Write tests for any new type guard functions needed for error fixes
- [ ] Fix TypeScript errors in top 10 most-imported files (by import count)
- [ ] Fix TypeScript errors in remaining files
- [ ] Run `pnpm turbo run lint --filter=reading-advantage` and catalog all warnings
- [ ] Fix `no-explicit-any` warnings by adding proper type annotations
- [ ] Fix `prefer-const` warnings by converting `let` to `const` where applicable
- [ ] Fix `no-undef` warnings by adding missing imports or type declarations
- [x] Run `pnpm turbo run test --filter=reading-advantage` and identify failing suites
  - Fixed workspace package resolution by adding moduleNameMapper to jest.config.ts
  - Tests now complete successfully (was hanging before)
  - 26 failed test suites (91 tests), 50 passed — pre-existing failures primarily in game components (zustand store mocking, component rendering)
- [ ] Fix test failures one suite at a time (prioritize critical path tests)
- [ ] Remove `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` from next.config.ts
- [ ] Run full build, lint, and test pipeline to verify all gates pass
