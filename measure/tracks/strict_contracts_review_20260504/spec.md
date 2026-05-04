# Specification: Strict Contracts Review Remediation

## Overview

Post-implementation review of track `strict_contracts_20260504` (commits `fd5094d` through `42466f1`). The original track introduced TenantDB, branded types, tRPC output contracts, and boundary validation. This remediation track fixes defects discovered during review.

## Defects Found

### CRITICAL — Tenant Scoping Bypass

1. **`reportsRouter.teacherDashboard` uses raw `ctx.db`** instead of `ctx.tenantDb`, completely bypassing the TenantDB wrapper and its automatic `schoolId` injection.
2. **`reportsRouter.teacherDashboard` uses Drizzle relational query API** (`db.query.classrooms.findMany`). The TenantDB proxy only intercepts `select` / `update` / `delete` builder chains; relational queries are untouched. This is an architectural blind spot that must be documented and guarded against.

### HIGH — Validation, Authorization, and Cast Defects

3. **`sessionUserSchema` rejects empty email strings** — `email: z.string().email()` fails on `""`, but `getCurrentUser()` passes `user.email ?? ""`. Users without emails cause `sessionUserSchema.parse()` to throw; the catch block silently returns `null`, breaking sessions for valid users.
4. **Unsafe cast still present in `context.ts`** — `role: session.user.role as Role` remains in `packages/api/src/context.ts` despite Phase 4 claiming to "eradicate unsafe casts."
5. **`getUser` domain function lacks `assertCan()`** — Any authenticated user in the same school can query any other user by ID. No role or ownership check exists.
6. **`importRoster` lacks classroom ownership check** — `assertCan(user, "student:import", tenant)` only checks role, not whether the teacher owns the target classroom.

### MEDIUM — Test Coverage Gaps

7. **Assignments domain: 2 tests, 5 functions untested** — Only `createAssignment` is tested. `listAssignments`, `getAssignment`, `updateAssignment`, `deleteAssignment`, and `submitAssignment` have zero tests.
8. **Articles domain: 1 test, 3 functions untested** — Only `listArticles` is tested. `getArticle`, `createArticle`, and `updateArticle` have no tests.
9. **API routers: only `users` router has output-contract tests** — 7 other routers (articles, assignments, classes, progress, reports, students, auth) have no tests verifying `.output()` schema enforcement or data leakage prevention.

### LOW — Code Quality

10. **UTF-8 BOM in `srs/route.ts`** — File starts with a BOM character, which can cause tooling issues.

## Acceptance Criteria

- [ ] `reportsRouter.teacherDashboard` uses `ctx.tenantDb` and standard query builder (or equivalent tenant-scoped query).
- [ ] `sessionUserSchema` handles null/empty emails without throwing (`.nullable()`, `.optional()`, or `.default()`).
- [ ] `context.ts` role assignment uses runtime validation instead of `as Role`.
- [ ] `getUser` calls `assertCan(user, "user:read", tenant)` or equivalent permission check.
- [ ] `importRoster` verifies the requesting teacher owns the target classroom (or is ADMIN/SYSTEM).
- [ ] At least one test added for each untested assignments function.
- [ ] At least one test added for each untested articles function.
- [ ] At least one test added for each router lacking output-contract coverage.
- [ ] BOM removed from `srs/route.ts`.

## Out of Scope

- Refactoring TenantDB to intercept Drizzle relational queries (`db.query.*`) — this is architectural debt requiring a separate design track.
- Adding integration tests with real Postgres — unit tests with mocked DB only.
