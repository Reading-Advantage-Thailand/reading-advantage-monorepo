# Implementation Plan: JSDoc Comments for Shared Packages

Phases are ordered bottom-up by dependency: `db` → `auth` → `auth-client` → `domain` → `api` / `webhooks` / `ui` / `utils`.

Each phase follows the same pattern:
1. Run `build-graph query` to list undocumented functions in the package
2. Add JSDoc comments (summary + `@param` + `@returns`) to each function
3. Run `build-graph update` to refresh the graph
4. Run package tests to verify no behavioral changes
5. Run type-check and lint

---

## Phase 1: `packages/db` (15 functions)
_db → no shared-package dependencies_

- [ ] Task: Query undocumented functions in `packages/db`
    - [ ] Run `build-graph query --json ./graph.db "SELECT name, file_path, line_start FROM nodes WHERE type = 'function' AND summary IS NULL AND package_id = 'db' AND file_path NOT LIKE '%__tests__%'"` to get the list
- [ ] Task: Add JSDoc comments to `packages/db/src/` functions
    - [ ] Document each function with summary, @param, @returns
- [ ] Task: Verify `packages/db`
    - [ ] Run `build-graph update ./graph.db` on changed files
    - [ ] Run `pnpm turbo run test --filter=@reading-advantage/db`
    - [ ] Run `pnpm turbo run check-types --filter=@reading-advantage/db`
    - [ ] Run `pnpm turbo run lint --filter=@reading-advantage/db`

## Phase 2: `packages/auth` (19 functions)
_depends on: db_

- [ ] Task: Query undocumented functions in `packages/auth`
    - [ ] Run `build-graph query` for `package_id = 'auth'` and `summary IS NULL`
- [ ] Task: Add JSDoc comments to `packages/auth/src/` functions
    - [ ] Document `assert.ts` — `assertCan`
    - [ ] Document `session.ts` — `createSession`, `validateSession`, `deleteSession`
    - [ ] Document `server.ts` — `getSession`, `requireAuth`, `requireRole`, `hasRole`
    - [ ] Document `permissions.ts` — `hasPermission`
    - [ ] Document `roles.ts` — `roleAtLeast`
    - [ ] Document `password.ts` — `hashPassword`, `verifyPassword`
    - [ ] Document `rate-limit.ts` — `checkRateLimit`, `recordFailure`, `resetLimit`
- [ ] Task: Verify `packages/auth`
    - [ ] Run `build-graph update` on changed files
    - [ ] Run `pnpm turbo run test --filter=@reading-advantage/auth`
    - [ ] Run `pnpm turbo run check-types --filter=@reading-advantage/auth`
    - [ ] Run `pnpm turbo run lint --filter=@reading-advantage/auth`

## Phase 3: `packages/auth-client` (6 functions)
_depends on: auth_

- [ ] Task: Query undocumented functions in `packages/auth-client`
    - [ ] Run `build-graph query` for `package_id = 'auth-client'` and `summary IS NULL`
- [ ] Task: Add JSDoc comments to `packages/auth-client/src/` functions
    - [ ] Document `provider.tsx` — `AuthProvider`
    - [ ] Document `context.ts` — `useAuthContext`
    - [ ] Document `index.ts` — `useAuth`
- [ ] Task: Verify `packages/auth-client`
    - [ ] Run `build-graph update` on changed files
    - [ ] Run `pnpm turbo run check-types --filter=@reading-advantage/auth-client`
    - [ ] Run `pnpm turbo run lint --filter=@reading-advantage/auth-client`

## Phase 4: `packages/domain` (69 functions)
_depends on: db, auth_

- [ ] Task: Query undocumented functions in `packages/domain`
    - [ ] Run `build-graph query` for `package_id = 'domain'` and `summary IS NULL`
- [ ] Task: Add JSDoc comments to `packages/domain/src/` functions
    - [ ] Document domain functions (articles, assignments, classes, progress, reports, users, etc.)
    - [ ] Document helper/utility functions
- [ ] Task: Verify `packages/domain`
    - [ ] Run `build-graph update` on changed files
    - [ ] Run `pnpm turbo run test --filter=@reading-advantage/domain`
    - [ ] Run `pnpm turbo run check-types --filter=@reading-advantage/domain`
    - [ ] Run `pnpm turbo run lint --filter=@reading-advantage/domain`

## Phase 5: `packages/api` (28 functions, excluding tests)
_depends on: db, auth, domain_

- [ ] Task: Query undocumented functions in `packages/api`
    - [ ] Run `build-graph query` for `package_id = 'api'` and `summary IS NULL` and `file_path NOT LIKE '%__tests__%'`
- [ ] Task: Add JSDoc comments to `packages/api/src/` functions (non-test)
    - [ ] Document `context.ts` — `createContext`, `getAuthToken`
    - [ ] Document route handlers — `handleLogin`, `handleRegister`, `handleLogout`, `handleSession`, `handleImpersonate`
    - [ ] Document routers — `mapDomainError`, other exported helpers
- [ ] Task: Verify `packages/api`
    - [ ] Run `build-graph update` on changed files
    - [ ] Run `pnpm turbo run test --filter=@reading-advantage/api`
    - [ ] Run `pnpm turbo run check-types --filter=@reading-advantage/api`
    - [ ] Run `pnpm turbo run lint --filter=@reading-advantage/api`

## Phase 6: `packages/webhooks` (8 functions)
_depends on: db, domain_

- [ ] Task: Query undocumented functions in `packages/webhooks`
    - [ ] Run `build-graph query` for `package_id = 'webhooks'` and `summary IS NULL`
- [ ] Task: Add JSDoc comments to `packages/webhooks/src/` functions
    - [ ] Document webhook handlers and helpers
- [ ] Task: Verify `packages/webhooks`
    - [ ] Run `build-graph update` on changed files
    - [ ] Run `pnpm turbo run test --filter=@reading-advantage/webhooks`
    - [ ] Run `pnpm turbo run check-types --filter=@reading-advantage/webhooks`
    - [ ] Run `pnpm turbo run lint --filter=@reading-advantage/webhooks`

## Phase 7: `packages/ui` + `packages/utils` (9 functions)
_no shared-package dependencies_

- [ ] Task: Query undocumented functions in `packages/ui` and `packages/utils`
    - [ ] Run `build-graph query` for both packages
- [ ] Task: Add JSDoc comments to `packages/ui/src/` and `packages/utils/src/` functions
    - [ ] Document UI helper functions
    - [ ] Document utility functions
- [ ] Task: Verify `packages/ui` and `packages/utils`
    - [ ] Run `build-graph update` on changed files
    - [ ] Run `pnpm turbo run check-types --filter=@reading-advantage/ui --filter=@reading-advantage/utils`
    - [ ] Run `pnpm turbo run lint --filter=@reading-advantage/ui --filter=@reading-advantage/utils`

## Phase 8: Final Verification
_cross-package validation_

- [ ] Task: Run full build-graph audit
    - [ ] Run `build-graph query --json ./graph.db "SELECT COUNT(*) as remaining FROM nodes WHERE type = 'function' AND summary IS NULL AND package_id IN ('domain','api','auth','db','webhooks','ui','auth-client','utils') AND file_path NOT LIKE '%__tests__%'"` — expect 0
- [ ] Task: Run full monorepo validation
    - [ ] Run `pnpm turbo run check-types`
    - [ ] Run `pnpm turbo run lint`
    - [ ] Run `pnpm turbo run test`
- [ ] Task: Create verification script
    - [ ] Add `scripts/verify-jsdoc.sh` that runs the build-graph query and exits non-zero if any functions remain undocumented
