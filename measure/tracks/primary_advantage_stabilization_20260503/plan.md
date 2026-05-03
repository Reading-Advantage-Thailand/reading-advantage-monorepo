# Plan: Primary-Advantage Stabilization

- [ ] Run `pnpm turbo run build --filter=primary-advantage` and catalog TypeScript errors
- [ ] Write tests for new utility functions added during error fixes
- [ ] Fix TypeScript compilation errors
- [ ] Run `pnpm turbo run lint --filter=primary-advantage` and catalog lint errors
- [ ] Fix `react/no-unescaped-entities` errors by escaping or using components
- [ ] Fix `react-hooks/rules-of-hooks` errors by correcting hook call patterns
- [ ] Fix remaining lint errors and reduce warnings
- [ ] Set up Vitest config for primary-advantage (vitest.config.ts)
- [ ] Write ≥5 unit tests for core components or utilities
- [ ] Remove `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` from next.config.ts
- [ ] Document Prisma schema boundary in packages/db/README.md
- [ ] Run full build, lint, and test pipeline to verify all gates pass
