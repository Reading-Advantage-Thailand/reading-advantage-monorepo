# Line Review Evidence: primary-advantage-093

Reviewer: coder-xiaomi-mimo-v2-5/primary-advantage-093
Files assigned: 1
Lines assigned: 1044

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/server/models/classroomModel.ts` | 1-1044 | reviewed | 15 |

## Findings

### LR-primary-advantage-093-001 — Transport coupling: model imports and returns `NextResponse`

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/classroomModel.ts:20,38-41,922-925,929-932,948`
- Evidence: `NextResponse` is imported from `next/server` (line 20). Three model functions return `NextResponse.json(...)` directly: `createClassCode` returns 404 on line 38, `getClassroomStudentForLogin` returns 404 on line 922, 410 on line 929, and 200 on line 948. A domain model file must not depend on HTTP transport primitives. The Reading Advantage server models exhibit the same coupling.
- Impact: Prevents reuse of model functions from Server Actions, tRPC routers, workers, or CLI tools without HTTP wrapper overhead. Violates the transport-independence principle in AGENTS.md.
- Recommendation: Replace all `NextResponse.json(...)` returns in model functions with plain `{ success: boolean; error?: string; data?: T }` objects. Move HTTP response mapping to the route handlers that call these functions.

### LR-primary-advantage-093-002 — No tenant/school scoping in enrollment and classroom access functions

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/server/models/classroomModel.ts:117-185,187-262,264-351`
- Evidence: `enrollStudentInClassroom` (lines 117-185), `unenrollStudentFromClassroom` (lines 187-262), and `getAvailableStudentsForClassroom` (lines 264-351) accept raw `classroomId` and `studentId` parameters without verifying the requesting user's schoolId matches the classroom's schoolId. These functions are called from route handlers that extract `user.id` but do not pass tenant context. A user in school A could theoretically enroll a student from school B into a classroom.
- Impact: Cross-tenant data manipulation risk. Primary students in multi-school deployments could be enrolled in classrooms belonging to a different school. This is a primary-student adaptation risk because the multi-school use case is a core Primary Advantage feature.
- Recommendation: Add a `tenantId` or `userWithRoles` parameter to these functions and verify `classroom.schoolId === user.schoolId` before performing mutations. Alternatively, enforce scoping at the route handler layer and document the contract clearly.

### LR-primary-advantage-093-003 — `getClassroomWithStudents` references non-existent `classrooms.teacherId` column

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/classroomModel.ts:819`
- Evidence: Line 819 adds `eq(classrooms.teacherId, teacherId)` to the where clause. However, every other function in this file uses the `classroomTeachers` join table for the teacher-classroom relationship (e.g., lines 82-85, 196-209, 388-391). The Drizzle schema for `classrooms` in `packages/db` does not have a `teacherId` column — the Prisma-era direct FK was replaced by the join table during migration. If this column does not exist in the Drizzle schema, this query will fail at runtime with a type error. If it does exist as a legacy column, it creates an inconsistent dual-relationship model.
- Impact: The teacher verification in `getClassroomWithStudents` either fails at runtime or checks the wrong column. Teachers attempting to view their classrooms via this function will get incorrect results.
- Recommendation: Replace `eq(classrooms.teacherId, teacherId)` with a subquery or join through `classroomTeachers` to verify teacher ownership, matching the pattern used by `unenrollStudentFromClassroom` (lines 196-209).

### LR-primary-advantage-093-004 — `teacherRows[0]?.user` always undefined — destructured fields accessed via wrong property

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/classroomModel.ts:885,894`
- Evidence: Lines 875-883 select `{ id, userId, name, email }` from `classroomTeachers INNER JOIN users`. Line 885 accesses `teacherRows[0]?.user` — but the result shape has no `user` property; it has `userId`, `name`, `email` as flat fields. The `?.user` access always yields `undefined`. Line 894 then sets `teacherId: primaryTeacher?.id` which is also `undefined`. The formatted classroom object (lines 887-897) therefore always has `teacherId: undefined`.
- Impact: The `getClassroomWithStudents` response never reports a valid `teacherId`, breaking any client-side code that relies on identifying the classroom teacher. This is a fork-specific regression from the Prisma-era `include` shape that nested `user` inside the relation.
- Recommendation: Change line 885 to `const primaryTeacher = teacherRows[0]` and line 894 to `teacherId: primaryTeacher?.userId`.

### LR-primary-advantage-093-005 — `deleteClassroom` does not cascade-delete `classroomStudents` and `classroomTeachers` rows

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/classroomModel.ts:536-592`
- Evidence: When a teacher deletes a single-teacher classroom (line 574) or an admin/system deletes any classroom (line 580), only the `classrooms` row is deleted. The `classroomStudents` and `classroomTeachers` rows referencing this classroom are not deleted. When a multi-teacher classroom has one teacher removed (lines 564-570), only the `classroomTeachers` row is deleted but `classroomStudents` rows remain. The Drizzle schema does not appear to define `ON DELETE CASCADE` foreign keys for these relationships.
- Impact: Orphaned enrollment and teacher-classroom records accumulate over time, causing incorrect student counts in reports and stale teacher associations. The `getAllClassrooms` N+1 query (lines 420-464) will fetch deleted classrooms' student/teacher data via the join table even after classroom deletion.
- Recommendation: Add explicit `db.delete(classroomStudents).where(eq(classroomStudents.classroomId, classroomId))` and `db.delete(classroomTeachers).where(eq(classroomTeachers.classroomId, classroomId))` before the classroom delete, or add `ON DELETE CASCADE` to the foreign key constraints in the Drizzle schema.

### LR-primary-advantage-093-006 — System role creates classrooms without `schoolId`

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/server/models/classroomModel.ts:101-107`
- Evidence: Lines 101-107 handle the "system or other elevated roles" path by inserting a classroom without `schoolId`. The teacher path (lines 74-88) and admin path (lines 90-99) both set `schoolId: schoolId` from the user's profile. The system path omits `schoolId` entirely, creating a classroom that is not scoped to any school.
- Impact: System-created classrooms exist outside the multi-tenant boundary. Queries filtered by `schoolId` (e.g., `getAllClassrooms` for admin/school-admin roles, line 384) will never return these classrooms. Tenant-scoped reports and dashboards will be incomplete.
- Recommendation: If system roles should create school-scoped classrooms, require a `schoolId` parameter. If global classrooms are intentional, document this as a deliberate EXEMPT-pattern design decision and ensure system-level views include them.

### LR-primary-advantage-093-007 — `unenrollStudentFromClassroom` skips authorization when `teacherId` is not provided

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/classroomModel.ts:195-210`
- Evidence: The teacher ownership check (lines 195-210) is guarded by `if (teacherId)`. When `teacherId` is `undefined`, the function proceeds directly to enrollment lookup and deletion without any authorization check. The caller at `app/api/classroom/[id]/unenroll/route.ts` (batch 014) extracts `user.id` and passes it as `teacherId`, but any caller that omits this parameter gains unauthenticated access to unenroll any student from any classroom.
- Impact: Authorization bypass allows unenrolling students without verifying classroom ownership. While the route handler currently passes the teacher ID, the model function's API surface is unsafe by default.
- Recommendation: Make `teacherId` a required parameter (not optional) for `unenrollStudentFromClassroom`, or add a fallback authorization check (e.g., verify the requesting user is a system admin) when `teacherId` is omitted.

### LR-primary-advantage-093-008 — `Math.random()` used for class code generation

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/classroomModel.ts:978-985`
- Evidence: The `generateCode` inner function (lines 978-985) uses `Math.floor(Math.random() * chars.length)` to select each character. `Math.random()` is not cryptographically secure and produces predictable sequences on some runtimes. The class code is used for student login (`getClassroomStudentForLogin`, line 918) and is effectively a shared secret.
- Impact: An attacker who can observe or predict class codes can authenticate as any student in the classroom. `Math.random()` values are reproducible given the seed or internal state, and 8-character alphanumeric codes have ~41 bits of entropy (vs ~48 bits for `crypto.randomBytes`).
- Recommendation: Replace with `crypto.randomBytes` or `crypto.getRandomValues` for class code generation. The `crypto` module is available in Node.js server environments.

### LR-primary-advantage-093-009 — Dead code: `if (classroom)` unreachable after early return

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/classroomModel.ts:37-51`
- Evidence: Lines 37-41 return `NextResponse.json({ error: "Classroom not found" }, { status: 404 })` when `!classroom`. Line 44 then checks `if (classroom)` — this condition is always true because the `!classroom` case already returned. The body on lines 45-50 always executes. The `if (classroom)` guard is dead code.
- Impact: No runtime impact, but creates confusion for readers about whether the two branches are mutually exclusive. The comment on line 45 ("Update the existing classroom's expiration date") suggests the intent was different — possibly the early return on line 38 was added later.
- Recommendation: Remove the `if (classroom)` guard on line 44 and unindent lines 45-50.

### LR-primary-advantage-093-010 — Extensive `any[]` types and `@ts-ignore` suppress type safety

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/classroomModel.ts:298,316,321,325,334,376,753,777`
- Evidence: Line 298: `const conditions: any[] = []` (unused variable). Line 316: `const whereConditions: any[] = [eq(roles.name, "student")]`. Lines 321, 325, 334: `@ts-ignore` comments around the `notInArrayFn` call (though the function is correctly imported on line 355). Line 376: `const whereConditions: any[] = []`. Line 753: `const teacherByClassroom = new Map<string, any[]>()`. Line 777: `const groupedByStudent = new Map<string, any>()`.
- Impact: `any[]` bypasses Drizzle's type-checked query building. A contributor could push an incompatible SQL fragment into `whereConditions` without a compile error. The `@ts-ignore` comments on lines 321-334 are unnecessary since `notInArray` is properly imported from `@reading-advantage/db` on line 355.
- Recommendation: Replace `any[]` with `Array<SQL<unknown>>` or specific Drizzle types. Remove the `@ts-ignore` comments and the stale inline comments explaining the dynamic import workaround.

### LR-primary-advantage-093-011 — N+1 query pattern in `getAllClassrooms`

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/classroomModel.ts:420-464`
- Evidence: Lines 421-464 iterate over `classroomsRows` and for each classroom execute two additional queries: one to fetch teachers (lines 423-430) and one to fetch students (lines 432-439). For N classrooms, this produces 1 + 2N queries. A classroom listing with 50 classrooms would issue 101 database queries.
- Impact: Response time grows linearly with classroom count. Primary schools with many classrooms will experience slow dashboard loads. The same N+1 pattern appears in `getAllStudentsInSystem` (lines 744-773) but is mitigated by the batched teacher fetch on lines 754-773.
- Recommendation: Fetch all teacher and student rows in two batched queries using `inArray(classroomTeachers.classroomId, classroomIds)` and `inArray(classroomStudents.classroomId, classroomIds)`, then group in memory using Maps, matching the pattern used by `getAllStudentsInSystem`.

### LR-primary-advantage-093-012 — `archived: false` with incomplete migration comment

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/classroomModel.ts:895`
- Evidence: Line 895 hardcodes `archived: false` with the inline comment `// Add this field based on your schema`. This is a migration artifact — the Prisma-era `Classroom` model likely had an `archived` boolean, but the Drizzle migration either dropped the column or it was never ported. The comment indicates the developer knew this was incomplete.
- Impact: The `archived` field is always `false` regardless of actual state, potentially masking archived classrooms from UI filtering or allowing archived classrooms to be used in active queries.
- Recommendation: Either add the `archived` column to the Drizzle classroom schema and read it from the DB, or remove the field from the response shape if archiving is not a feature.

### LR-primary-advantage-093-013 — Unused import `currentUser`

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/classroomModel.ts:22`
- Evidence: `currentUser` is imported from `@/lib/session` on line 22 but never referenced anywhere in the file. The `UserWithRoles` type import on line 23 is used (line 358), but `currentUser` is dead.
- Impact: Dead import adds confusion about which functions actually require session context. May cause ESLint warnings depending on config.
- Recommendation: Remove the unused `currentUser` import.

### LR-primary-advantage-093-014 — Unsafe type assertion `data.teacherId as string`

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/classroomModel.ts:69`
- Evidence: Line 69 reads `eq(users.id, data.teacherId as string)`. The function parameter `data.teacherId` is typed as `string | undefined` (line 59). The `as string` assertion suppresses the undefined check without runtime validation. If `data.teacherId` is `undefined`, the query will compare `users.id` to `undefined`, which in Drizzle/SQL becomes `NULL` and returns no rows.
- Impact: A `createClassroom` call with `role: "teacher"` but no `teacherId` will silently create a classroom with no teacher association (the insert on lines 75-80 uses `data.teacherId` directly, which would be `undefined`). The classroom exists but no `classroomTeachers` row is created.
- Recommendation: Add an explicit null check before the teacher-role branch: `if (data.role === "teacher" && data.teacherId)`. The existing `if` on line 74 already checks this, so line 69 should use `eq(users.id, data.teacherId!)` only after the guard, or restructure to query the user after the guard.

### LR-primary-advantage-093-015 — `notInArrayFn` import placed after usage, with unnecessary `@ts-ignore` comments

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/classroomModel.ts:319-338,353-355`
- Evidence: The `notInArray` function is used on line 338 inside `getAvailableStudentsForClassroom` (lines 264-351) but imported as `notInArrayFn` on line 355, after the function that uses it. While JavaScript hoisting allows this, it creates a confusing reading order. Lines 319-338 contain extensive comments (8 lines) explaining a dynamic import workaround that is no longer needed — the function is imported directly at the module level. The `@ts-ignore` comments on lines 321, 325, 334 suppress type errors that no longer exist.
- Impact: Readability degradation. The comments suggest the import was problematic, but the current code is straightforward.
- Recommendation: Move the `import { notInArray as notInArrayFn } from '@reading-advantage/db'` to the top-level import block (lines 1-19) and remove the 8-line comment block and `@ts-ignore` annotations.

## No-Finding Notes

All 1044 lines of `apps/primary-advantage/server/models/classroomModel.ts` were reviewed line-by-line. 15 findings were identified. No lines were excluded from review.
