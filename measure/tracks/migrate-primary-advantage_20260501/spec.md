# Specification: Migrate primary-advantage into Monorepo

## Context

primary-advantage is a primary education app built with Next.js 15.2, Prisma, NextAuth v5 (beta), AI SDK, Framer Motion, and Tailwind v4. It uses `next-intl` for i18n and `"type": "module"` (ESM). No test suite exists.

## Goals

1. Copy app source into `apps/primary-advantage/`
2. Convert from `package-lock.json` to pnpm workspace deps
3. Adopt shared packages (`@reading-advantage/ui`, `@reading-advantage/utils`)
4. Ensure the app builds and lints in the monorepo context

## Acceptance Criteria

- [ ] `apps/primary-advantage/` exists with full app source
- [ ] `package.json` uses `workspace:*` for shared packages where applicable
- [ ] `pnpm install` succeeds from monorepo root
- [ ] `turbo run build --filter=primary-advantage` succeeds
- [ ] `turbo run lint --filter=primary-advantage` passes (or known warnings documented)
- [ ] Tech debt items added for any deferred work

## Out of Scope

- Creating a test suite (future track)
- Upgrading NextAuth v5 beta to stable (future track)
- Prisma schema deconfliction with reading-advantage (future track)
