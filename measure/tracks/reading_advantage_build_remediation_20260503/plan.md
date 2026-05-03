# Plan: Reading-Advantage Build Remediation

- [ ] Run `pnpm turbo run build --filter=reading-advantage` and catalog all TypeScript errors
- [ ] Write tests for any new type guard functions needed for error fixes
- [ ] Fix TypeScript errors in top 10 most-imported files (by import count)
- [ ] Fix TypeScript errors in remaining files
- [ ] Run `pnpm turbo run lint --filter=reading-advantage` and catalog all warnings
- [ ] Fix `no-explicit-any` warnings by adding proper type annotations
- [ ] Fix `prefer-const` warnings by converting `let` to `const` where applicable
- [ ] Fix `no-undef` warnings by adding missing imports or type declarations
- [ ] Run `pnpm turbo run test --filter=reading-advantage` and identify failing suites
- [ ] Fix test failures one suite at a time (prioritize critical path tests)
- [ ] Remove `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` from next.config.ts
- [ ] Run full build, lint, and test pipeline to verify all gates pass
