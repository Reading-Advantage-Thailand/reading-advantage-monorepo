# Specification: Test Coverage Baseline

## Overview

Establish a test coverage baseline for all new packages created in the monorepo (`packages/auth`, `packages/domain`, `packages/api`, `packages/db`). Currently `pnpm turbo run test` fails because `packages/auth` and `packages/domain` declare `vitest run` scripts but have zero test files. This track fixes the build, writes tests for meaningful logic, and codifies a testing policy so future work ships with tests.

## Functional Requirements

1. **Fix `turbo run test`** — `packages/auth` and `packages/domain` must not fail when no test files exist yet. Either add placeholder tests or configure vitest to allow empty suites.

2. **Auth package tests** (`packages/auth`):
   - `roles.ts` — role hierarchy, `roleAtLeast()`
   - `permissions.ts` — `hasPermission()` for each role × permission
   - `assert.ts` — `assertCan()` throws `AuthError` on unauthorized, passes on authorized
   - `tenant.ts` — `assertTenantAccess()` for admin cross-school, student own-school, missing school
   - `token.ts` — `signAccessToken`, `verifyAccessToken`, `signRefreshToken`, `verifyRefreshToken`, `createTokenPair` round-trip

3. **Domain package tests** (`packages/domain`):
   - `classes/index.ts` — `createClass()` with authorized/unauthorized role, `listClasses()` with teacher/admin/student scoping
   - `students/index.ts` — `listStudents()`, `importRoster()` with mocked DB
   - Use in-memory or mocked Drizzle DB (no real Postgres required for unit tests)

4. **API package tests** (`packages/api`):
   - `trpc.ts` — `protectedProcedure` throws UNAUTHORIZED when auth is null
   - `routers/classes.ts` — `create` and `list` procedures with mocked context
   - `routers/auth.ts` — `login`, `register`, `session`, `refresh`, `logout` with mocked DB

5. **DB package** (`packages/db`):
   - Schema validation tests — verify table definitions compile and export correctly
   - No integration tests requiring Postgres (those are manual verification)

6. **Testing policy** — Update `CONTRIBUTING.md` or `AGENTS.md` with a rule: every new domain function, tRPC router, or auth utility must ship with tests in the same PR.

## Non-Functional Requirements

- All tests use Vitest (consistent across new packages)
- Tests run without Docker/Postgres (mocked DB layer)
- `pnpm turbo run test` exits 0 across all packages
- Test execution time < 30s for the full suite

## Acceptance Criteria

- [ ] `pnpm turbo run test` exits 0 (no failures, no ELIFECYCLE errors)
- [ ] `packages/auth` has ≥15 test cases covering roles, permissions, assert, tenant, token
- [ ] `packages/domain` has ≥6 test cases covering classes and students with mocked DB
- [ ] `packages/api` has ≥5 test cases covering auth middleware and key procedures
- [ ] Test policy documented in CONTRIBUTING.md
- [ ] AGENTS.md updated with testing requirement for future tracks

## Out of Scope

- Integration tests against real Postgres (deferred to manual verification protocol)
- E2E / Playwright tests
- Coverage percentage thresholds (track separately once baseline is solid)
- Tests for pre-existing app code (reading-advantage, advantage-games, etc.)
- Tests for `packages/types` (type-only, compile-time validation)
