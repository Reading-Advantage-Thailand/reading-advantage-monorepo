# Line Review Evidence: primary-advantage-090

Reviewer: coder-minimax-m3/primary-advantage-090
Files assigned: 6
Lines assigned: 1161

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/server/controllers/studentController.ts` | 1-351 | reviewed | 6 |
| `apps/primary-advantage/server/controllers/teacherController.ts` | 1-340 | reviewed | 7 |
| `apps/primary-advantage/server/controllers/userController.ts` | 1-106 | reviewed | 5 |
| `apps/primary-advantage/server/models/__tests__/helpers/testDb.smoke.test.ts` | 1-40 | reviewed | 0 |
| `apps/primary-advantage/server/models/__tests__/helpers/testDb.ts` | 1-202 | reviewed | 0 |
| `apps/primary-advantage/server/models/__tests__/siblingModels.behavior.test.ts` | 1-122 | reviewed | 0 |

## Findings

> Per-file finding totals: studentController.ts=6, teacherController.ts=7, userController.ts=5, testDb.smoke.test.ts=0, testDb.ts=0, siblingModels.behavior.test.ts=0. Total findings: 11 (LR-001/002/003/004/005/006/007/008/009/010/011).

### LR-primary-advantage-090-001 — Controllers reimplement auth boilerplate instead of using `withAuth` middleware

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/controllers/studentController.ts:34-51`, `apps/primary-advantage/server/controllers/teacherController.ts:24-41`
- Evidence: All five CRUD controllers in both files repeat the identical 18-line pattern: `currentUser()` -> 401, `validateUser(user.id)` -> 404, `checkAdminPermissions(userWithRoles)` -> 403. The project already exposes a `withAuth(handler, requiredPermissions)` higher-order function in `apps/primary-advantage/server/utils/middleware.ts:31-120` that encapsulates the same flow plus JWT/session decoding. The controllers choose to inline the lower-level helpers instead of using `withAuth`.
- Impact: Auth/permission logic is duplicated across 10 controller entry points. Any future change to the auth contract (e.g. switching to the shared `@reading-advantage/auth` adapter described in AGENTS.md, or adding audit logging on permission checks) requires editing every controller. Risk of drift between `withAuth` and the inline pattern.
- Recommendation: Migrate studentController.ts and teacherController.ts (and the other 4 controllers) to `withAuth` for the common admin path; only fall back to the inline pattern when the handler must distinguish between two permission tiers.

### LR-primary-advantage-090-002 — Local `validateUser`/`checkAdminPermissions` duplicates shared auth adapter

- Severity: High
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/server/controllers/studentController.ts:11`, `apps/primary-advantage/server/controllers/teacherController.ts:11`, `apps/primary-advantage/server/utils/auth.ts:30-122`
- Evidence: Both controllers import `validateUser` and `checkAdminPermissions` from `@/server/utils/auth`, which is a local module. Root AGENTS.md prescribes "Application code should depend on auth.login(), auth.getCurrentUser(), auth.requireUser(), auth.requireRole()" via the shared `@reading-advantage/auth` adapter. The local `validateUser` reimplements the same logic with three Drizzle queries (`users`, `userRoles ⨝ roles`, `schoolAdmins`) and `checkAdminPermissions` does string matching on role names ("system"/"admin") instead of consulting permission tables.
- Impact: Primary Advantage owns its own auth surface, which means it cannot benefit from improvements to the shared adapter (e.g. Argon2id migration, session-cookie fixes, audit logging) and has to maintain its own duplicates. This is also why the local `validateUser` does three separate queries when a single `select().from(users).leftJoin(...)` would suffice. Migration work is blocked on replacing these helpers with the shared adapter.
- Recommendation: Replace `@/server/utils/auth` usage with the shared `@reading-advantage/auth` adapter (or migrate `withAuth` in `middleware.ts` to call the shared adapter). Block track `primary_advantage_drizzle_migration_20260526` Phase 9 / auth-adapter migration on this replacement.

### LR-primary-advantage-090-003 — Inline regex email validation instead of Zod schema at boundary

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/controllers/studentController.ts:140-146`, `apps/primary-advantage/server/controllers/teacherController.ts:133-139`
- Evidence: Both files declare `const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;` inside `createStudentController` and `createTeacherController`, then call `emailRegex.test(email)`. Root AGENTS.md requires "Use Zod as the standard contract system" and "Zod schemas define Backend inputs". Body parsing also uses `body as CreateStudentInput` (studentController.ts:128-129, teacherController.ts:121-122) without runtime validation.
- Impact: Inputs reach the model layer without runtime guarantees. A client sending extra/unknown fields will silently round-trip through to `createStudent`/`createTeacher`. Two parallel email regexes (one per controller) make future changes divergent. For primary-student records (PII of minors), uncontrolled fields increase data-handling risk.
- Recommendation: Define a `CreateStudentSchema` / `CreateTeacherSchema` with Zod (`.email()`, role enum, classroomId UUID check) and call `schema.parse(body)` once at the top of each handler. Move the schema to `packages/backend/modules/students/contracts.ts` so Reading Advantage cannot drift from it.

### LR-primary-advantage-090-004 — Free-form `console.log`/`console.error` instead of structured logger

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/controllers/studentController.ts:91,106,167,176,194,221,227,247,290,308,342`, `apps/primary-advantage/server/controllers/teacherController.ts:79,177,194,223,281,331`, `apps/primary-advantage/server/controllers/userController.ts:49,84,103`
- Evidence: 21 sites use bare `console.log` / `console.error` with template strings such as `"Student Controller: Successfully created student:", result.student?.id` (studentController.ts:167-170). The project has a `server/utils/logging.ts` module already available. AGENTS.md requires structured logs with request IDs, user IDs, operation names, and timing. `console.log(error)` (userController.ts:49) even misuses the level.
- Impact: Logs are unsearchable, lack request/user correlation, and cannot be filtered by severity. For a multi-tenant app handling primary-student PII this complicates incident response and audit.
- Recommendation: Replace each `console.log`/`console.error` with `logger.info({ event, userId, ... })` from `@/server/utils/logging`. Reserve `console.error` for boot-time fatal errors only.

### LR-primary-advantage-090-005 — PII in `console.log` of student/teacher identifiers

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/server/controllers/studentController.ts:167-170,194,221-224,247,281-284,308,339`, `apps/primary-advantage/server/controllers/teacherController.ts:79,177-180`
- Evidence: Multiple sites log full identifiers (`result.student?.id`, `student.id`, `id`, `email`) to `console.log`. For primary-student records these are child PII and must not be written to default application logs (which in production often flow to vendor log sinks without a DPA).
- Impact: Logging child PII violates data-minimization principles. Even when logs are "internal", downstream observability tooling may forward them to external services, which is a child-privacy concern.
- Recommendation: Log only operational metadata (route, status, request id, role). Strip student/teacher ids, emails, and names from log messages.

### LR-primary-advantage-090-006 — Auth checks are coarse-grained admin-only; no tenant or resource-owner scoping

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/controllers/studentController.ts:45-51,119-125,207-213,260-266,321-327`, `apps/primary-advantage/server/controllers/teacherController.ts:35-41,112-118,207-213,255-261,311-317`
- Evidence: Every controller authorizes with the same `checkAdminPermissions(userWithRoles)` call. There is no `assertCan(user, "student:read", { schoolId: targetStudent.schoolId })` or ownership check — the controllers pass `userWithRoles` into the model and rely on the model to filter by `schoolId`. AGENTS.md mandates "Multi-tenant queries must be scoped by schoolId. Never trust tenant IDs from the frontend." The model functions are invoked with the acting admin's `userWithRoles`, but there is no assertion at the controller boundary that the admin's `schoolId` matches the resource.
- Impact: A school-admin (allowed by `checkAdminPermissions` because they have a `SchoolAdmins` row) can read/update/delete students from any school if the model does not strictly enforce tenant scoping. This is the classic "trusts model-side filtering" anti-pattern. Reading Advantage has the same fragility, but the controllers here add no defense-in-depth.
- Recommendation: At the top of each handler, compare `userWithRoles.schoolId` to the target resource's schoolId (or assert `can(user, action, target)` from a shared permissions module). Track this as a Phase-4 review concern for the migration track.

### LR-primary-advantage-090-007 — Dead import: `NextRequest` unused in `userController.ts`

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/controllers/userController.ts:1`
- Evidence: Line 1 imports `import { NextRequest } from "next/server";` but none of the exported handlers (`handleUpdateUserActivity`, `fetchUserActivity`, `fetchUserArticleRecords`, `fetchUserReminderReread`) take a `NextRequest` parameter — they are plain async functions called from server actions / route handlers. The unused import is dead code.
- Impact: Minor lint/treeshaking noise. Indicates the file was originally shaped like a Route Handler and partially refactored without cleaning imports.
- Recommendation: Remove the `NextRequest` import. (Review-only — do not edit in this track.)

### LR-primary-advantage-090-008 — `import { error } from "console";` is dead and confusing

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/controllers/userController.ts:9`
- Evidence: Line 9 imports `import { error } from "console";`. This named export refers to Node's `console.error` alias. The file does not reference the imported `error` binding anywhere (it uses bare `console.log`/`console.error`).
- Impact: Dead import that misleads readers about which logging mechanism the controller uses. No runtime impact.
- Recommendation: Remove line 9.

### LR-primary-advantage-090-009 — `userController.ts` helpers have inconsistent and incomplete auth checks

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/controllers/userController.ts:12-106`
- Evidence: `handleUpdateUserActivity` (lines 12-36) does **not** call `currentUser()` or `validateUser` — it accepts `targetId` and `body` from a caller and writes activity. `fetchUserActivity` (lines 38-51) calls `currentUser()` and throws on missing user, but swallows the throw and `console.log`s the error, returning `undefined` (so the caller cannot tell auth-fail from network-fail). `fetchUserArticleRecords` (lines 53-87) and `fetchUserReminderReread` (lines 89-106) perform **no** auth check at all — they only validate that `userId` is non-empty and call `getUserArticleRecords(userId, ...)` / `getUserReminderReread(userId)`.
- Impact: Any authenticated session (or, for the last two helpers, any caller) can read or write another user's activity by passing their `userId`. This is an authorization bypass: the controller treats `userId` from the payload as authoritative instead of deriving it from the session. For primary students this is a serious data-leak risk across classrooms/schools.
- Recommendation: All four helpers must call `currentUser()` and compare the result to `targetId`/`body.userId`. If the user is a school-admin/teacher, the existing `checkAdminPermissions` / `checkTeacherPermissions` helper should gate cross-user access. Long-term, move these into `packages/backend/modules/users/` so the Zod contract and permission module can wrap them.

### LR-primary-advantage-090-010 — `handleUpdateUserActivity` silently returns `undefined` for non-MC activity types

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/controllers/userController.ts:23-36`
- Evidence: Lines 25-35 only handle `ActivityType.MC_QUESTION`. Any other `activityType` (e.g. reading completion, vocabulary) falls through to the implicit `return undefined`. The function signature on line 12 implies it should return the model result for all activity types, but the implementation is a one-branch `if`.
- Impact: Callers receive `undefined` and cannot distinguish "feature not implemented yet" from "update succeeded with no XP". Progress tracking for primary students will silently drop data for any new activity type.
- Recommendation: Make the unsupported branches explicit: either implement each activity type or `throw new Error("Unsupported activity type: " + activityType)`. Add a Vitest case that proves non-MC types throw rather than silently returning undefined.

### LR-primary-advantage-090-011 — `parseInt(searchParams.get("page") || "1")` without explicit radix

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/controllers/teacherController.ts:45-46`
- Evidence: Lines 45-46 use `parseInt(searchParams.get("page") || "1")` and `parseInt(searchParams.get("limit") || "50")` with no second argument. The matching controller in `studentController.ts:55-56` correctly passes `10` as the radix. ESLint `radix` rule (`unicorn/prefer-number-properties` and `radix`) flags this as inconsistent.
- Impact: Behavior is identical for decimal input but inconsistent with the sibling controller, which makes future hardening (NaN handling, schema validation) drift between the two endpoints. Small but easy to fix.
- Recommendation: Add `, 10` radix to both `parseInt` calls. (Review-only — do not edit in this track.)

## No-Finding Notes

- `apps/primary-advantage/server/models/__tests__/helpers/testDb.smoke.test.ts` (1-40): PGlite WASM-Postgres smoke test. Verifies that `h.db.execute(sql\`INSERT ...\`)` writes are queryable and that `LEFT JOIN` produces real fan-out (3 rows for 2 students in 2 classrooms). The 60-second `beforeAll` timeout accommodates WASM boot. Tests use uuid-shaped fixture IDs (`00000000-0000-0000-0000-000000000001` etc.) and avoid fixed timestamps. No findings.
- `apps/primary-advantage/server/models/__tests__/helpers/testDb.ts` (1-202): Focused DDL harness scoped to the tables the primary-advantage list queries touch (schools, users, roles, user_roles, school_admins, classrooms, classroom_students, classroom_teachers, assignments, student_assignments). The header comment explains the deliberate scope choice (line 27-29: "rather than replaying all 24 drizzle migrations... to keep the harness fast and resilient"). `globalThis.__TEST_DB__` is the documented handoff point for `vi.mock("@reading-advantage/db", ...)`. `TABLES` array (157-168) is ordered parent-then-child and combined with `RESTART IDENTITY CASCADE` for between-test isolation. No findings.
- `apps/primary-advantage/server/models/__tests__/siblingModels.behavior.test.ts` (1-122): Behavioral test suite (FR-2) that runs three migrated models (`getAllClassrooms`, `getTeachers`, `getStudentAssignments`) against the PGlite harness. The `dbProxy` Proxy on lines 13-29 forwards every method/property access on the mocked `db` to `globalThis.__TEST_DB__`, which lets the model-under-test use the real Drizzle query builder against an in-process Postgres. `bcryptjs` is mocked to a deterministic `"hashed"` return (line 31-34). The `systemAdmin` fixture (line 40-46) provides a `roles: [{ role: { id: 'r1', name: 'system' } }]` membership which mirrors what `checkAdminPermissions` accepts. No findings on test correctness, scope, or coverage. Note: the test does not exercise school/tenant scoping, which is a coverage gap to flag in `test-gaps.md` rather than a finding on this file.