# Specification: Unified CI/CD Pipeline

## Context

The monorepo has 5 apps with mixed testing strategies (Jest in advantage-games and reading-advantage, Vitest in science-advantage and www-reading-advantage), mixed lint configs, and no unified local development workflow. Each app was built with its own GCP deployment in mind. Developers must manually run commands per app.

This track focuses on local development tooling: a shared Docker Compose for PostgreSQL, Turborepo task orchestration for lint/test/build, and developer documentation. Production deployment (GCP) is out of scope — each app's existing deployment pipeline is preserved for now.

## Goals

1. Move PostgreSQL Docker Compose from science-advantage to monorepo root as the shared local database
2. Ensure `turbo run lint`, `turbo run test`, and `turbo run build` work across all apps locally
3. Normalize mixed test runners so `turbo run test` exits cleanly for all apps (Jest + Vitest coexist)
4. Add a lightweight GitHub Actions CI check for PRs (lint + test + build, no deployment)
5. Document the local development workflow

## Acceptance Criteria

- [ ] `docker-compose.yml` at monorepo root runs PostgreSQL 16 on port 5432
- [ ] All apps point `DATABASE_URL` at the shared local Postgres instance
- [ ] `pnpm dev` starts the database + all apps with one command
- [ ] `pnpm turbo run lint` passes for all 5 apps
- [ ] `pnpm turbo run test` succeeds for all 5 apps (Jest + Vitest both exit cleanly)
- [ ] `pnpm turbo run build` passes for all 5 apps
- [ ] `.github/workflows/ci.yml` runs lint + test + build on PRs (no deployment)
- [ ] Developer docs (`CONTRIBUTING.md` or root README) explain local setup and common commands

## Out of Scope

- Production deployment to GCP or any cloud provider
- Vercel deployment configuration
- Turborepo remote caching (local only for now)
- Migrating Jest suites to Vitest (separate track or part of config consolidation)
- Firebase Functions deployment automation
- Staging / preview environments

## References

- `apps/science-advantage/docker-compose.yml` — existing Postgres Docker setup to be moved to root
- `measure/tech-debt.md` — mixed test runners, ESLint v8/v9 split
- `measure/tech-stack.md` — Turborepo, pnpm
- `turbo.json` — existing task pipeline config
