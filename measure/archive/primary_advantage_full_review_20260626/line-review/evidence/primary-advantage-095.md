# Line Review Evidence: primary-advantage-095

Reviewer: coder-minimax-m3/primary-advantage-095
Files assigned: 1
Lines assigned: 669

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/server/models/studentModel.ts` | 1-669 | reviewed | 10 |

## Findings

### LR-primary-advantage-095-001 — `bcryptjs` instead of root-AGENTS-mandated Argon2id for password hashing

- Severity: High
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/server/models/studentModel.ts:20,309-311,463-465`
- Evidence: Line 20 imports `bcrypt from "bcryptjs"`. Lines 309-311 (`createStudent`) and 463-465 (`updateStudent`) hash passwords with `bcrypt.hashSync(password, 10)`. Root `AGENTS.md` "Authentication Requirements" mandates "Argon2id password hashing". `bcryptjs` is a pure-JS re-implementation of bcrypt with known weaknesses vs. native argon2 (memory hardness, side-channel resistance), and uses the older bcrypt KDF instead of the AGENTS-prescribed algorithm.
- Impact: All student passwords in this app are hashed with bcrypt instead of Argon2id. Migration to the shared `@reading-advantage/auth` adapter (also called out as "Features Not Included by Default" in AGENTS.md — no migration path) requires re-hashing on next login. For primary-student records, weaker KDF is a higher-impact defense-in-depth gap because a stolen hash database is harder to brute-force with Argon2id.
- Recommendation: Replace `bcrypt`/`bcryptjs` with `argon2` (Node native binding) or `argon2id` from `@node-rs/argon2` in this file. This must be coordinated with a global auth migration track; it cannot be a single-file fix without breaking existing password verifiers elsewhere in the app.

### LR-primary-advantage-095-002 — `Math.random()` used to auto-generate the initial student password

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/server/models/studentModel.ts:309-311`
- Evidence: When `createStudent` is called without a `password` parameter, line 311 sets `password = bcrypt.hashSync(Math.random().toString(36).slice(-8), 10)`. `Math.random()` is not a cryptographic PRNG; V8 uses xorshift128+ which is predictable from a small number of observed outputs and seeded deterministically per V8 context. The output is also base-36 truncated to 8 chars, capping entropy well below the ~41 bits the slice appears to suggest.
- Impact: An attacker who can observe any auto-generated password (e.g. by creating their own test student) can search the resulting space and recover other auto-generated passwords, then attempt student-account logins. For primary students this is a data-protection concern because the password protects minor-PII accounts and reading progress.
- Recommendation: Use `crypto.randomBytes(12).toString('base64url')` (or `crypto.randomInt` over an alphabet) for auto-generated passwords. Even better, require an explicit password to be passed in by the admin caller and surface the entered-but-never-returned password error to the UI so the teacher can communicate it.

### LR-primary-advantage-095-003 — Auto-generated student password is never returned to the caller

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/studentModel.ts:309-311,373-374`
- Evidence: Line 311 silently generates a password via `Math.random()...` and hashes it into the `users.password` column. The `studentData` object returned on lines 361-372 contains `id, name, email, cefrLevel, xp, role, createdAt, className, classroomId` — but no plaintext or initial password field. The function returns `{ success: true, student: studentData }` on line 374 with no way for the admin/teacher caller to learn the auto-generated credential.
- Impact: Teachers cannot communicate the password to the student, forcing a separate password-reset flow that bypasses the initial credential entirely. This is also why the password is never rotated after creation — a security gap. For a primary-student product where the teacher is the trust anchor for account setup, the missing return value makes the auto-generated password effectively unusable.
- Recommendation: Return the plaintext auto-generated password in the `studentData` (e.g. `initialPassword`) so the caller can display it once and force a change on first login. Alternatively, throw a validation error when `password` is omitted so callers must provide a real value.

### LR-primary-advantage-095-004 — `createStudent` allows non-school-admin callers to insert students with `schoolId = null`

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/studentModel.ts:286-290,313-323`
- Evidence: Lines 286-290 compute `let schoolId = null; if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) { schoolId = userWithRoles.schoolId; }`. The model relies solely on the *caller* claiming to be a school admin to set `schoolId`. The actual authorization branch — system/admin/teacher — is not distinguished here. System-role users (who legitimately lack a `SchoolAdmins` row) will create a student with `schoolId = null`, even if they pass a `classroomId` belonging to a specific school.
- Impact: Multi-tenant isolation is enforced by application-layer schoolId tagging, not by database constraints. A system caller can mint a tenant-less student and attach it to a school-A classroom on line 332, producing a row that bypasses `eq(users.schoolId, ...)` filters in `getStudents` (line 74) for the school-A admin. This is the same kind of "tenant ID set by frontend trust" pattern root AGENTS.md prohibits ("Multi-tenant queries must be scoped by schoolId. Never trust tenant IDs from the frontend").
- Recommendation: Branch the `schoolId` derivation on `userWithRoles.roles` (system / admin / teacher / school-admin) and require explicit input for system callers. A system caller creating a student must pass `schoolId` explicitly, or the function should reject the call.

### LR-primary-advantage-095-005 — `createStudent` classroom-validation only enforces `schoolId` when the caller already has one

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/studentModel.ts:292-306`
- Evidence: Lines 293-306 build `classroomConditions: any[] = [eq(classrooms.id, classroomId)]` and only push `eq(classrooms.schoolId, schoolId)` when `schoolId` is truthy (line 295). Because `schoolId` is null for any non-school-admin caller (see LR-095-004), the classroom lookup on lines 297-300 only verifies "this classroom exists anywhere" — not "this classroom belongs to my school".
- Impact: A teacher (no `SchoolAdmins` row, `schoolId` may be set or null) calling `createStudent` with another school's classroom ID will succeed, enrolling a freshly created student into a foreign classroom. This is a cross-tenant write that is silently accepted because the model lacks defense-in-depth.
- Recommendation: Always require `classroom.schoolId` to match either the caller's `userWithRoles.schoolId` (when set) or an explicit `expectedSchoolId` parameter passed by the route handler. Reject when neither is available.

### LR-primary-advantage-095-006 — `deleteStudent` cascade is incomplete; many related tables are not cleaned up

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/studentModel.ts:568-575`
- Evidence: Lines 568-572 explicitly delete from `userRoles`, `classroomStudents`, `userActivity`, `xpLogs`. The `users` row is deleted on line 575. The packages/db schema also contains `flashcardCards`, `flashcardCardReviews`, `articleRecords`, `articleActivityLogs`, `reminderRereads`, `assignments`, `assignmentActivities`, `leaderboard`, and `SentencsAndWordsForFlashcard` — none of which are cleaned up here. There is no `ON DELETE CASCADE` evidence in the `users` foreign keys for these tables (the file does not assert cascade, and the `packages/db` schema barrel does not advertise it).
- Impact: Deleting a student leaves orphaned flashcard cards, assignment records, and reading-progress rows referencing a non-existent `userId`. Subsequent `getStudentById` calls will return `null`, but reports that join through these tables will silently drop the user (creating under-counts) or, worse, leak historical PII through orphaned content if those rows still carry `userId`.
- Recommendation: Add an explicit cleanup loop for every table that references `users.id`, or convert the deletion to a Drizzle `db.transaction` that lists each dependent table. A cheaper alternative: declare `ON DELETE CASCADE` on the relevant FKs in `packages/db/src/schema/` and add a migration.

### LR-primary-advantage-095-007 — Free-form `console.log` / `console.error` instead of structured logger

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/studentModel.ts:175-176,186,224,241,244,262,271,282,303,373,376,388,417,429,450-453,522-525,528,539,564,577,580,666`
- Evidence: 23 sites use bare `console.log` / `console.error` with concatenated strings such as `"Student Model: Error fetching students:", error` (line 175) or `"Student Model: Successfully created student:", studentData.id` (line 373). The project already exposes `server/utils/logging.ts` (referenced from primary-advantage-090 evidence). Root AGENTS.md mandates structured logs with request IDs, user IDs, operation names, and timing.
- Impact: Logs are unsearchable and unfilterable; child PII (`studentData.id`, `email`) is leaked to default log streams. For multi-tenant student data, this is a data-handling concern.
- Recommendation: Replace each `console.log` / `console.error` with `logger.info({ event, userId, ... })` / `logger.error(...)` from the existing `server/utils/logging.ts`. Strip identifiers that are not operationally necessary.

### LR-primary-advantage-095-008 — `any[]` typed `whereConditions` arrays defeat Drizzle type-safety

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/studentModel.ts:46-51,67,92,189,287,294,391,436,459,542,589`
- Evidence: `studentJoinAndWhere` (line 46) is typed `extra: any[] = []`. The caller sites at lines 67, 92, 189, 287, 294, 391, 436, 459, 542, and 589 all declare `whereConditions: any[]` (or push into one). Drizzle exports `SQL<unknown>` / `SQLWrapper` for typing these; using `any[]` defeats the type checker so any contributor can push `undefined`, a number, or an object literal into the array without compile-time error.
- Impact: Type-safety regression vs. what Drizzle provides out of the box. This is a pattern carried over from the Prisma-era code that this track is supposed to be replacing; keeping `any[]` here means the Drizzle migration is only partial.
- Recommendation: Replace `any[]` with `Array<SQL<unknown>>` (or `SQLWrapper[]`) and remove the `extra: any[] = []` default in `studentJoinAndWhere` (line 46).

### LR-primary-advantage-095-009 — `getStudentStatistics` fetches the full student list into memory to compute averages and counts

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/server/models/studentModel.ts:586-668`
- Evidence: Lines 602-618 run a single SELECT against `users ⨝ userRoles ⨝ roles LEFT JOIN userActivity` and return every row in memory. The function then iterates twice (lines 621-637 for `averageXp` / `mostCommonLevel`, and lines 645-654 for `activeThisWeek`). `totalStudents`, `averageXp`, `mostCommonLevel`, `activeThisWeek`, and `activePercentage` are all aggregate values that Postgres can compute in the database.
- Impact: For a school with thousands of students (the primary-advantage deployment target), this query streams thousands of rows into Node and runs two reduce passes. Memory + latency cost grows linearly. For dashboards that re-fetch on every page load, this is a measurable UX hit. Primary-student admins waiting on slow dashboards is a usability risk for the product.
- Recommendation: Convert each metric to a SQL `count() / avg() / count(distinct userId)` aggregate using Drizzle's `sql` template or `countDistinct`. The seven-day active window can be computed with a single `count(distinct userActivity.userId) where userActivity.createdAt >= now() - interval '7 days'` joined to the same schoolId filter.

### LR-primary-advantage-095-010 — Hard-coded "student" role string in 12 places; role changes will silently misroute queries

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/studentModel.ts:39,48-49,67,166,191,235,278,367,393,516,544,589`
- Evidence: Line 39 declares `const studentRole = "student";` and most usages correctly reference the alias. However the `studentJoinAndWhere` helper (line 46) takes `extra: any[]` and pushes an arbitrary filter, while the surrounding code repeatedly relies on the literal value `"student"` (lines 48, 67 via `eq(roles.name, studentRole)` — fine — but the response field `role: studentRole` on lines 166, 235, 367, 516 hard-codes the role on every response object). If the role is ever renamed (e.g. to `primary_student` to differentiate from the Reading Advantage student role — a plausible fork-divergence move), the response field `role: "student"` will continue to claim a role name that no longer matches `roles.name`.
- Impact: API consumers (`server/controllers/studentController.ts`, downstream UI) will receive `role: "student"` even after a rename. Permission checks elsewhere that compare against `roles.name` will succeed, but client-side display and audit logs will diverge from the source-of-truth role name.
- Recommendation: Replace the literal `"student"` role strings with a typed enum (`Role.Student`) defined in `packages/db` (or `packages/backend`) and import it everywhere. Update the `role` response field to read from `roles.name` (already selected in some queries) rather than the local alias.

## No-Finding Notes

- The Drizzle imports (lines 1-19) and schema access (`@reading-advantage/db`) are correct — no Prisma references remain in this file, consistent with the AGENTS.md "Forbidden Patterns" section.
- `getStudents` (lines 53-178) correctly avoids the N+1 fan-out by paginating DISTINCT users and joining classroom data in a follow-up query (lines 134-156). The pagination math on lines 64 and 124-126 is sound.
- `getStudentById` (lines 180-247) and `deleteStudent` (lines 533-583) apply the same schoolId scoping via `userWithRoles.SchoolAdmins` and the system-role bypass check (lines 70-75, 195-200, 397-402, 547-553). The pattern is consistent across the file, even where the scoping itself is too permissive (see LR-095-004, LR-095-005).
- `updateStudent` correctly uses a `db.transaction` for the user+classroomStudents mutation (lines 468-487) and re-fetches the post-update row in a separate query (lines 490-505). Race windows for the user being deleted between the two queries exist but are not material for the typical use case.

All 669 lines of `apps/primary-advantage/server/models/studentModel.ts` were reviewed line-by-line. 10 findings were identified. No lines were excluded from review.
