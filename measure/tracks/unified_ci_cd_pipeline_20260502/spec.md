# Specification: Unified CI/CD Pipeline

## Context

The monorepo currently has 5 apps with mixed testing strategies (Jest in advantage-games and reading-advantage, Vitest in science-advantage and www-reading-advantage), mixed lint configs, and no automated CI/CD. Developers must manually run commands per app. The product vision requires a unified pipeline that lints, tests, and builds affected apps while preserving independent Vercel deployability.

## Goals

1. Create a root-level GitHub Actions workflow triggered on PR and push to `main`
2. Configure Turborepo remote caching (Vercel Remote Cache or self-hosted) to speed up builds
3. Orchestrate mixed test runners so `turbo run test` exits cleanly for all apps
4. Set up per-app Vercel deployment with monorepo-aware `ignore` scripts
5. Document the developer workflow for CI expectations

## Acceptance Criteria

- [ ] `.github/workflows/ci.yml` exists and runs on PR + push to `main`
- [ ] Workflow installs dependencies with pnpm caching
- [ ] Workflow runs `turbo run lint test build` with affected filtering
- [ ] Turborepo remote cache is configured and reducing build times
- [ ] `turbo run test` succeeds for all 5 apps (Jest + Vitest both pass)
- [ ] Per-app Vercel projects are linked and deploy from monorepo root
- [ ] `vercel.json` or deployment configs use `ignore` to skip unaffected apps
- [ ] CI status badge added to root README
- [ ] Developer docs explain how to interpret CI failures and rerun locally

## Out of Scope

- Migrating Jest suites to Vitest (future track, or part of `shared-config-consolidation`)
- Setting up staging / preview environments beyond Vercel's defaults
- Firebase Functions deployment automation (reading-advantage scripts are separate)
- Custom self-hosted runners

## References

- `measure/tech-debt.md` — mixed test runners, ESLint v8/v9 split
- `measure/product.md` — Key Goal #3 (CI/CD pipeline)
- `measure/tech-stack.md` — GitHub Actions, Vercel, Turborepo
