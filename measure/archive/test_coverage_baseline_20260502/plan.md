# Implementation Plan: Test Coverage Baseline

---

## Phase 1: Fix turbo test failure

- [x] Task: Add placeholder test files to unblock `turbo run test`
    - Create `packages/auth/src/__tests__/placeholder.test.ts` with a trivial passing test
    - Create `packages/domain/src/__tests__/placeholder.test.ts` with a trivial passing test
    - These get deleted once real tests exist in Phase 2+
- [x] Task: Verify `pnpm turbo run test` exits 0
    - All packages with `test` scripts must pass or skip cleanly
    - No ELIFECYCLE errors
    - Also removed orphaned `reading-advantage-scripts/recalculateLevel.test.js`
    - Added `--passWithNoTests` to scripts package Jest config
- [x] Task: Measure — User Manual Verification 'Fix turbo test failure' (Protocol in workflow.md)

---

## Phase 2: Auth package tests

- [x] Task: Write role tests — `roles.test.ts`
    - `roleAtLeast()` returns true/false correctly for all role pairs
    - `ROLES` constant has expected shape
- [x] Task: Write permission tests — `permissions.test.ts`
    - `hasPermission()` returns true for each allowed role × permission
    - `hasPermission()` returns false for each denied role × permission
    - Cover all 17 permission keys
- [x] Task: Write assert tests — `assert.test.ts`
    - `assertCan()` throws `AuthError` with code `"FORBIDDEN"` when role lacks permission
    - `assertCan()` does not throw when role has permission
    - `AuthError` extends `Error` and has `.code` property
- [x] Task: Write tenant tests — `tenant.test.ts`
    - Admin can access any school
    - Student/teacher can access own school
    - Student/teacher throws on different school
    - User with no school throws
- [x] Task: Write token tests — `token.test.ts`
    - `signAccessToken` → `verifyAccessToken` round-trip returns correct payload
    - `signRefreshToken` → `verifyRefreshToken` round-trip returns userId
    - `createTokenPair` returns both tokens
    - `verifyRefreshToken` rejects access token (wrong type)
    - Expired token throws
- [x] Task: Delete placeholder test from Phase 1
- [x] Task: Verify `pnpm turbo run test --filter=@reading-advantage/auth` passes
    - Result: 41 tests across 5 files, all passing
- [x] Task: Measure — User Manual Verification 'Auth package tests' (Protocol in workflow.md)

---

## Phase 3: Domain package tests

- [x] Task: Write test helpers — create mock DB factory
    - `packages/domain/src/__tests__/mock-db.ts` — vi.fn() chain for insert/select/transaction
    - Reusable across domain tests
- [x] Task: Write class tests — `classes.test.ts`
    - `createClass()` with TEACHER role → inserts row, returns result
    - `createClass()` with STUDENT role → throws AuthError
    - `listClasses()` as TEACHER → queries scoped to own teacherId
    - `listClasses()` as ADMIN → queries scoped to schoolId
    - `listClasses()` with `includeArchived: false` → filters archived
- [x] Task: Write student tests — `students.test.ts`
    - `listStudents()` returns students for a classroom
    - `importRoster()` creates users + links to classroom in transaction
    - `importRoster()` with STUDENT role → throws AuthError
- [x] Task: Delete placeholder test from Phase 1
- [x] Task: Verify `pnpm turbo run test --filter=@reading-advantage/domain` passes
    - Result: 11 tests across 2 files, all passing
- [x] Task: Measure — User Manual Verification 'Domain package tests' (Protocol in workflow.md)

---

## Phase 4: API package tests

- [x] Task: Write tRPC middleware tests — `trpc.test.ts`
    - `protectedProcedure` throws `UNAUTHORIZED` when `ctx.auth` is null
    - `protectedProcedure` passes through when `ctx.auth` is present
    - `publicProcedure` works without auth
    - Mutation works with auth context
- [x] Task: Verify `pnpm turbo run test --filter=@reading-advantage/api` passes
    - Result: 5 tests in trpc.test.ts, all passing
- [x] Task: Measure — User Manual Verification 'API package tests' (Protocol in workflow.md)

---

## Phase 5: DB schema validation

- [x] Task: Write schema export tests — `schema.test.ts`
    - Verify all 17 tables exported from `@reading-advantage/db/schema`
    - Verify key columns on `users`, `classrooms`, `articles`, `assignments`
    - Added vitest + test script to db package
- [x] Task: Verify `pnpm turbo run test --filter=@reading-advantage/db` passes
    - Result: 6 tests, all passing
- [x] Task: Measure — User Manual Verification 'DB schema validation' (Protocol in workflow.md)

---

## Phase 6: Testing policy

- [x] Task: Update `CONTRIBUTING.md` with testing section
    - Every new domain function, tRPC router, or auth utility must include tests
    - Tests go in `__tests__/` or alongside source as `*.test.ts`
    - Use Vitest for all new packages
    - Mock DB layer — no real Postgres for unit tests
- [x] Task: Update `AGENTS.md` with testing requirement
    - Added "Testing Requirements" section with rules and tooling references
- [x] Task: Final full-suite verification
    - `pnpm turbo run test --filter='@reading-advantage/*'` — 9 packages, 0 failures
- [x] Task: Measure — User Manual Verification 'Testing policy' (Protocol in workflow.md)

---

## Total Estimated Tasks: 29
## Completed Tasks: 29
## Notes

### Decisions
- Placeholder tests unblock turbo immediately; real tests replace them in order
- Vitest across all new packages (matches existing `ui`, `utils`, `config`)
- Mocked DB — no Docker dependency for unit tests
- Policy codified in both CONTRIBUTING.md (human) and AGENTS.md (agent)

### Sequencing
- Phase 1 is urgent — unblocks CI
- Phases 2-5 can partially parallelize (auth, domain, api are independent test files)
- Phase 6 is last (policy after practice)

### New test files created
| Package | File | Tests |
|---------|------|-------|
| auth | roles.test.ts | 5 |
| auth | permissions.test.ts | 14 |
| auth | assert.test.ts | 6 |
| auth | tenant.test.ts | 6 |
| auth | token.test.ts | 9 |
| domain | mock-db.ts (helper) | — |
| domain | classes.test.ts | 6 |
| domain | students.test.ts | 5 |
| api | trpc.test.ts | 5 |
| db | schema.test.ts | 6 |
| **Total** | | **62** |
