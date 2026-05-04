# Implementation Plan

## Phase 1: Critical Tenant Scoping Fixes

- [x] Task: Fix `reportsRouter.teacherDashboard` to use `ctx.tenantDb` instead of `ctx.db` [ce790ee]
  - Replace `ctx.db.query.classrooms.findMany` with `ctx.tenantDb.select().from(classrooms).where(...)`
  - Ensure the returned shape matches `teacherDashboardSchema`
  - Add/update test in `packages/api/src/__tests__/reports.test.ts`
- [x] Task: Document TenantDB relational query API limitation [ce790ee]
  - Add comment in `db-contract.ts` documenting that `db.query.*` is NOT intercepted
  - Add note in `packages/api/src/trpc.ts` or context docs warning against `ctx.db.query` usage

## Phase 2: Validation and Authorization Fixes

- [ ] Task: Fix `sessionUserSchema` silent parse failure on empty email
  - Change `email: z.string().email()` to `email: z.string().email().optional().or(z.literal("")` or use `.default("unknown@example.com")`
  - Add test in reading-advantage that simulates `user.email = null` and verifies `getCurrentUser()` returns user instead of null
- [ ] Task: Remove remaining `as Role` cast in `context.ts`
  - Replace with runtime Zod validation: `role: z.enum([...]).parse(session.user.role)`
  - Add test verifying invalid role strings throw a clear error
- [ ] Task: Add `assertCan` to `getUser` domain function
  - Add `assertCan(user, "user:read", tenant)` at function entry
  - Update `users.test.ts` to verify unauthorized roles are rejected
- [ ] Task: Add classroom ownership check to `importRoster`
  - After fetching classroom, verify `classroom.teacherId === user.id` (or user is ADMIN/SYSTEM)
  - Add test in `students.test.ts` for cross-teacher roster import attempt

## Phase 3: Test Coverage Backfill

- [ ] Task: Backfill assignments domain tests
  - Add test for `listAssignments` (verify classroom ownership check, tenant scoping)
  - Add test for `getAssignment` (verify returns assignment, rejects cross-tenant)
  - Add test for `updateAssignment` (verify updates allowed fields, rejects cross-tenant)
  - Add test for `deleteAssignment` (verify deletes, rejects cross-tenant)
  - Add test for `submitAssignment` (verify score update, rejects non-enrolled student)
- [ ] Task: Backfill articles domain tests
  - Add test for `getArticle` (verify returns article, throws on missing)
  - Add test for `createArticle` (verify assertCan, inserts data)
  - Add test for `updateArticle` (verify updates, throws on missing, rejects cross-tenant)
- [ ] Task: Backfill API router output-contract tests
  - Add tests for `articlesRouter` verifying `.output()` strips extraneous fields
  - Add tests for `assignmentsRouter` verifying `.output()` contracts
  - Add tests for `classesRouter` verifying `.output()` contracts
  - Add tests for `progressRouter` verifying branded type transformation and output contracts
  - Add tests for `reportsRouter` verifying output contracts
  - Add tests for `studentsRouter` verifying output contracts
  - Add tests for `authRouter` verifying session response shape

## Phase 4: Code Quality

- [ ] Task: Remove UTF-8 BOM from `apps/reading-advantage/app/api/v1/metrics/srs/route.ts`
- [ ] Task: Run full test suite (`pnpm turbo run test`) and verify all packages pass
- [ ] Task: Run type check (`pnpm turbo run check-types`) and verify clean

## Summary

Remediation track for review findings from `strict_contracts_20260504`. Focuses on closing tenant-scoping bypasses, fixing silent validation failures, removing remaining unsafe casts, adding missing authorization checks, and backfilling test coverage for domains and routers that shipped without tests.
