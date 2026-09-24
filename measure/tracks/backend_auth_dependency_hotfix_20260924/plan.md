# Implementation Plan: Backend Auth Dependency Hotfix

- [x] Task 1: Add `@reading-advantage/auth` workspace dependency to `packages/backend/package.json` and sync the lockfile importer (600a417)
- [x] Task 2: Validate `pnpm install --frozen-lockfile --lockfile-only` in a clean container — passed 2026-09-24
