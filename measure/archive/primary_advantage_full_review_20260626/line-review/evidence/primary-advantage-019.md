# Line Review Evidence: primary-advantage-019

Reviewer: coder-minimax-m3/primary-advantage-019
Files assigned: 7
Lines assigned: 1046

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/app/api/upload/csv/route.ts` | 1-506 | reviewed | 10 |
| `apps/primary-advantage/app/api/users/[id]/article-records/route.ts` | 1-43 | reviewed | 0 |
| `apps/primary-advantage/app/api/users/[id]/reminder-reread/route.ts` | 1-36 | reviewed | 0 |
| `apps/primary-advantage/app/api/users/[id]/route.ts` | 1-116 | reviewed | 3 |
| `apps/primary-advantage/app/api/users/activitylog/[id]/route.ts` | 1-22 | reviewed | 1 |
| `apps/primary-advantage/app/api/users/me/school/admins/[adminId]/route.ts` | 1-160 | reviewed | 2 |
| `apps/primary-advantage/app/api/users/me/school/admins/route.ts` | 1-163 | reviewed | 2 |

## Findings

### LR-primary-advantage-019-001 — `userSchool` lookup reads `users` table by `schoolId` instead of `schools` table

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/upload/csv/route.ts:53-60`
- Evidence:
  ```ts
  let userSchool: { id: string; name: string } | null = null;
  if (currentUser.schoolId) {
    const [s] = await db.select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, currentUser.schoolId))
      .limit(1);
    userSchool = s;
  }
  ```
  `currentUser.schoolId` is a `uuid` column on `users` (`packages/db/src/schema/users.ts:34`) that references `schools.id`. The query selects from the `users` table (not `schools`) and compares `users.id` (text, per `users.ts:26`) against `currentUser.schoolId` (uuid). No user has `id` equal to a school id, so `s` is always `undefined`, and `userSchool` stays `null` for every non-system caller. The response at lines 488-496 then falls into the `"system user - users imported without school assignment"` branch even for an authenticated ADMIN who legitimately has a school. Same root cause as LR-018-002 in batch 018 — the Prisma `include: { School: true }` was hand-stitched incorrectly to the `users` table.
- Impact: The `schoolInfo` block in the bulk-import response is wrong for every authenticated non-system caller. The `"All imported users have been assigned to this school"` note never appears; downstream UIs that surface `schoolInfo.id` or `schoolInfo.name` receive `undefined`. Admins get a misleading message after a real, school-scoped import.
- Recommendation: Query the `schools` table instead — `db.select({ id: schools.id, name: schools.name }).from(schools).where(eq(schools.id, currentUser.schoolId)).limit(1)` — or define a Drizzle `relations()` declaration on `users` and use `db.query.users.findFirst({ where: eq(users.id, authUser.id), with: { school: true } })`.

### LR-primary-advantage-019-002 — Path traversal in `POST /api/upload/csv` via user-controlled `originalName` segment

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/upload/csv/route.ts:152-154`
- Evidence: Line 152 reads `const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");` and line 153 reads `const fileName = \`${currentUser.id}_${originalName}\`;`. The sanitization regex strips characters NOT in `[a-zA-Z0-9.-]` — note that `.` is NOT stripped. The original `file.name` is taken from the multipart upload (`formData.get("file") as File`, line 101) which is fully client-controlled. Combined with `path.join(tempDir, fileName)` on line 154 (where `tempDir = path.join(process.cwd(), "temp")` on line 145), the `..` segments can resolve to files OUTSIDE the intended `temp/` directory. Same root cause as LR-018-003 in batch 018.
- Impact: An authenticated admin/teacher/system caller can write uploaded CSV bytes to any path the Next.js process has write access to via a file named e.g. `..__evilname` or `.._.._apps_.._primary-advantage_.._env.local`. Combined with `await writeFile(filePath, buffer)` on line 159, an attacker can overwrite source files, `.env`, or build caches. The 5 MB upload cap (line 134) makes this a powerful authenticated write primitive.
- Recommendation: Reject any file name containing `/`, `\`, `..`, or starting with `.`. Sanitize with `path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_")` AND verify the resolved `filePath` stays inside `tempDir` with `path.relative(tempDir, filePath)` returning a string that does not start with `..`. Better: route all uploads through the S3-compatible storage adapter (`storage.put(\`uploads/${currentUser.id}/${fileName}\`, buffer, { contentType: "text/csv" })`) so the path namespace is enforced by the adapter.

### LR-primary-advantage-019-003 — PATCH `/api/users/[id]` has no role / owner / school-scope authorization

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/users/[id]/route.ts:9-92`
- Evidence: The only auth check is `await currentUser()` (lines 14-17) — there is no `requireRole`, no ownership check (`currentUserData.id === userId`), no admin gate, and no `schoolId` scope check anywhere in the 116-line file. Any authenticated user can update any other user — including a STUDENT escalating themselves to ADMIN by sending `{ "role": "ADMIN" }`. The transaction at lines 48-92 then unconditionally:
  - Updates the target user's `name`, `email`, `xp`, `level`, `cefrLevel`, `password` (lines 50-54).
  - Deletes every existing role for the target user (lines 67-69) and inserts a new role row with `roleId` resolved from the request body (lines 72-75).
  - Returns the updated row including a freshly-bcrypted password hash (line 44, bcrypt with `saltRounds = 12`).
- Impact: Critical privilege escalation. A STUDENT (or unauthenticated browser session holder) can: (a) overwrite any other user's email and password (account takeover), (b) assign themselves the ADMIN role on the `roles` table (which is the role-check source for csv upload at `route.ts:70`, [adminId] route at lines 46-51, etc.), and (c) deface any user's name/level/xp/cefrLevel. The `roleEnum` on `users.role` (the OTHER role column, `packages/db/src/schema/users.ts:33`) is not touched, but the `userRoles` row controls the bulk-import authorization at `csv/route.ts:70`, so it is enough to start importing CSVs into any school.
- Recommendation: Gate the route on `requireRole(["ADMIN", "SYSTEM"])`, branch to allow self-update of a narrow allowlist (`name`, `password`) only when `currentUserData.id === userId`, and verify `targetUser.schoolId === currentUserData.schoolId` for non-SYSTEM callers. Validate the body with a Zod schema (`z.object({ name: z.string().optional(), role: z.enum(["STUDENT","TEACHER","ADMIN","SYSTEM"]).optional(), ... })`) — see LR-019-011. Reject `role` updates entirely for self-edits.

### LR-primary-advantage-019-004 — `POST /api/users/activitylog/[id]` is an unauthenticated stub that ignores request body and params

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/users/activitylog/[id]/route.ts:5-21`
- Evidence: The 22-line POST handler has NO `await currentUser()` / `await getCurrentUser()` call anywhere. Line 9 extracts `id` from params but never passes it to the controller. Line 10 destructures `articleId, data, timer, type` from the JSON body and discards all four. Lines 12-19 call `handleUpdateUserActivity` with hardcoded `activityType: ActivityType.MC_QUESTION` and hardcoded `data: { responses: [], progress: [], timer: 0 }`. Line 21 returns 200 unconditionally (no try/catch, no validation of the controller's return).
- Impact: Two compounding bugs. (1) Any external attacker can spam this endpoint without authentication, and because `data.progress` is `[]`, line 26 in the controller (`data.progress?.filter((p) => p === 0).length`) yields `undefined` and `if (!correctCount)` triggers `throw new Error("Progress not Have")` (line 29 in `server/controllers/userController.ts`). With no try/catch in the route, this surfaces as a 500 from the Next.js runtime — a denial-of-service surface that is reachable from any client. (2) The endpoint advertises activity logging but does nothing useful — every request is a no-op or a 500. Mobile/web clients that call this endpoint after a quiz lose their XP/progress silently.
- Recommendation: Either remove the endpoint entirely or implement it correctly: authenticate with `await currentUser()`, resolve the userId from session (or from `params.id` after a self/teacher/admin authz check), and forward the real `data.progress` / `data.timer` from the request body to the controller. Pass `targetId` as the second argument to `handleUpdateUserActivity` so the controller knows whose activity to write (`userController.ts:34` currently calls `updateUserActivity(activityType, data, targetId, xpEarned)`).

### LR-primary-advantage-019-005 — `db.insert(users).values(batch)` lacks `onConflictDoNothing`; duplicate emails 500 the whole upload

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/upload/csv/route.ts:324,337`
- Evidence: Lines 324 and 337 read `await db.insert(users).values(batch as any);` with NO `.onConflictDoNothing()`. The `users.email` column has a unique index (Drizzle `users` schema in `packages/db/src/schema/users.ts:25-47`), so inserting a row with a duplicate email raises a Postgres unique-violation. The route's per-row validation block (lines 211-298) checks `name`, `email`, `role`, `classroom_name` formats but does NOT pre-check duplicates against `users.email` nor against prior rows in the same CSV. The `userRoles` insert at line 369-371 correctly uses `onConflictDoNothing()`, but the users insert does not.
- Impact: An admin re-uploading a CSV after a partial success, or uploading a CSV with two rows sharing an email, or uploading against a school where any email already exists, gets a 500 with no recovery path (line 499 catch returns generic 500). Worse: because inserts are NOT wrapped in a transaction across batches (lines 318-345 process up to 500 rows per batch, with NO `db.transaction(...)` wrapping), a duplicate in batch N+1 leaves batch 1..N committed. The admin sees a 500 and a partially-mutated database. For a primary-student app, this means some students exist with no role binding and some classroom assignments point at non-existent users.
- Recommendation: Add `.onConflictDoNothing()` to both inserts (lines 324 and 337) and re-fetch the existing rows the same way the `userRoles` insert does. Even better: wrap the entire upload in a single `db.transaction(async (tx) => { ... })` so a duplicate mid-CSV rolls back the entire import, matching the AGENTS.md "Transactional boundary when appropriate" guidance.

### LR-primary-advantage-019-006 — `currentUser.schoolId as string` cast lies about UUID → string type

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/upload/csv/route.ts:414,425`
- Evidence: Line 414 reads `eq(classrooms.schoolId, currentUser.schoolId as string)` and line 425 reads `schoolId: currentUser.schoolId as string`. `classrooms.schoolId` is `uuid` (`packages/db/src/schema/classrooms.ts:10`) and `users.schoolId` is also `uuid` (`packages/db/src/schema/users.ts:34`). Both sides are uuid. The cast lies to TypeScript so the `eq(...)` helper accepts both operands. When the runtime value of `currentUser.schoolId` is `null` (a SYSTEM user — line 89 short-circuits for non-system null users, but system users reach here with `schoolId = null`), `eq(classrooms.schoolId, null)` becomes `classrooms.schoolId IS NULL` instead of the intended "match any school" filter, and `db.insert(classrooms).values({ schoolId: null })` creates a schoolless classroom. Same root cause as LR-018-008 in batch 018.
- Impact: A SYSTEM caller uploading `students.csv` cannot target any specific school because the schoolId filter becomes `IS NULL`. The classroom inserts at line 423-427 also create `schoolId: null` classrooms, so every classroom in the import is detached from any school. Downstream classroom listings filter by `schoolId` and will hide these rows. The cast hides a legitimate bug: the SYSTEM path has no school scoping at all.
- Recommendation: Remove the cast and branch the query: `currentUser.schoolId ? and(eq(classrooms.schoolId, currentUser.schoolId), ...) : sql\`true\``. For system users, drop the schoolId filter entirely (they should be uploading against an explicit `schoolId` column on each CSV row, or this route should reject SYSTEM uploads).

### LR-primary-advantage-019-007 — `as any` casts on typed Drizzle inserts defeat migration's type safety

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/upload/csv/route.ts:324,337,370,426,438,455`
- Evidence: Six `as any` casts silence Drizzle's variadic-tuple narrowing on `.values(...)`:
  - Line 324: `await db.insert(users).values(batch as any);`
  - Line 337: `await db.insert(users).values(batch as any);`
  - Line 370: `await db.insert(userRoles).values(roleAssignments as any).onConflictDoNothing();`
  - Line 426: `db.insert(classrooms).values({ name: classroomName, schoolId: currentUser.schoolId as string } as any).returning();`
  - Line 438: `db.insert(classroomStudents).values({ classroomId: classroom.id, studentId: assignment.userId } as any).onConflictDoNothing();`
  - Line 455: `db.insert(classroomTeachers).values({ classroomId: classroom.id, teacherId: assignment.userId } as any);`
  The Drizzle table definitions (`packages/db/src/schema/users.ts:25-47`, `classrooms.ts:7-48`, `primary.ts:98-110,117-122`) match the shape of every insert payload. No legitimate type mismatch exists. Same root cause as LR-018-007 in batch 018.
- Impact: The casts mask future schema drift. If `users.schoolId` becomes non-null, or `classroomStudents.joinedAt` is added as a generated column, or `userRoles.assignedAt` becomes required, these inserts will compile, the database will reject them at runtime, and the admin will see a 500 with no actionable error. AGENTS.md explicitly calls `as any` a Prisma-era anti-pattern that the Drizzle migration was supposed to retire.
- Recommendation: Type the batch arrays with `InferInsertModel<typeof users>`. Drizzle supports `db.insert(users).values([row1, row2, ...])` with a tuple type — no `any` needed. For single-row inserts (lines 426, 438, 455), construct the value with `InferInsertModel<typeof tableName>` and let Drizzle's compiler verify field-by-field. As an interim, `@ts-expect-error` with a comment naming the issue is preferable to a global `as any`.

### LR-primary-advantage-019-008 — No audit logging for bulk user creation / role assignment / classroom binding

- Severity: High
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/upload/csv/route.ts:286-461`
- Evidence: The route creates users (lines 324-345), assigns roles (lines 366-372), creates classrooms (lines 421-429), and binds teachers/students to classrooms (lines 432-458) with no calls to any audit-log writer. There is no `audit_logs` insert, no console log of "who created what", and no integration with the existing `ArticleActivityLog` style logging. The only logging in the entire file is `console.error("Error deleting temp file:", err)` on line 466 and `console.error("File upload error:", error)` on line 500 — both error paths, not audit trails. Same root cause as LR-018-011 in batch 018.
- Impact: An admin uploading a 200-row `students.csv` produces 200 student accounts, 200 role bindings, and N classroom bindings with no recoverable trail of which row went where. If the CSV was wrong (misnamed columns, wrong classroom mapping), there is no way to determine which `users.id`s were just created, which `userRoles` rows they own, or which `classroomStudents`/`classroomTeachers` rows came from this upload. A primary-age student who gets accidentally enrolled in the wrong classroom cannot be un-enrolled by replaying the import, because the system doesn't know which enrollment came from which upload.
- Recommendation: Add an `import_log` table (or reuse the existing `ArticleActivityLog`-style pattern, `packages/db/src/schema/primary.ts:124-`) keyed by `(uploadId, callerId, action, targetId, timestamp)`. Write one row per `(inserted user, assigned role, classroom binding)` inside the same transaction as the inserts. Return `uploadId` in the response (line 470) so admins can correlate later. Audit logging belongs in the shared `@reading-advantage/db` schema so this isn't a fork-specific concern — file under the Shared Package Migration Blocker category.

### LR-primary-advantage-019-009 — Per-row validation errors include raw emails, enabling enumeration oracle

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/upload/csv/route.ts:217-263`
- Evidence: Lines 217-263 push error strings into the `errors: string[]` array that include the offending email verbatim:
  - Line 219: `Row ${rowNumber}: Name is required and must be a valid string`
  - Line 230: `Row ${rowNumber}: Email is required and must be a valid string`
  - Line 245: `Row ${rowNumber}: Invalid email format '${row.email}'`
  - Line 253: `Row ${rowNumber}: Invalid role '${role}'. Valid roles are: ${validRoles.join(", ")}`
  - Line 260: `Row ${rowNumber}: Role '${role}' not found in database`
  Combined with the fact that the `users.email` column has a unique index, an attacker who controls an admin/teacher account (or compromises one) can submit a CSV with thousands of guessed email addresses and learn which ones exist in the database: any row whose email passes format validation but causes a uniqueness violation at insert time surfaces as a 500, while unknown emails succeed. The success-path response on lines 470-498 also exposes `createdUsers.length` so the attacker can iterate the search.
- Impact: Email enumeration is a data-minimization violation (AGENTS.md: "Consent/data handling" for primary students) and a precursor to credential-stuffing or phishing attacks against the parents/teachers whose email is now confirmed. The validation response is structured per-row so the attacker can iterate quickly without parsing.
- Recommendation: Return a generic `{ error: "Validation failed", details: errors.map(e => ({ row: e.rowNumber, code: "INVALID_EMAIL" | "INVALID_ROLE" | ... })) }` where the email itself is masked as `j***@example.com`. Drop the email from every error message. Add per-caller rate limiting (e.g., 10 uploads / hour) so enumeration is bounded.

### LR-primary-advantage-019-010 — Direct filesystem writes from a route handler bypass the storage adapter contract

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/upload/csv/route.ts:2-4,144-159,463-468`
- Evidence: Lines 2-4 import `writeFile, mkdir` from `fs/promises`, `existsSync, unlink` from `fs`, and `path`. Lines 144-159 perform `await mkdir(tempDir, { recursive: true })` (line 147), `path.join(tempDir, fileName)` (line 154), and `await writeFile(filePath, buffer)` (line 159) directly to the local filesystem. Lines 463-468 call `unlink(filePath, ...)` (fire-and-forget). None of these go through the S3-compatible storage adapter described in root AGENTS.md ("Storage" section): "Application code must not directly call storage provider SDKs." Same root cause as LR-018-006 in batch 018.
- Impact: The bulk user-import feature is not portable to serverless platforms (Cloud Run, Fly.io, Railway) that have ephemeral filesystems — a pod restart loses all in-flight uploads, and horizontal scaling means two pods can race on the same `temp/` directory. The route also can't switch to GCS/R2/S3 without rewriting every `fs` call. The path-traversal vulnerability in LR-019-002 is enabled entirely by the local-filesystem choice.
- Recommendation: Replace filesystem writes with `storage.put(\`uploads/${currentUser.id}/${fileName}\`, buffer, { contentType: "text/csv" })`. Replace `unlink` calls with `storage.delete(...)`. Move the temp-file cleanup logic into `services/worker` (Trigger.dev) so it runs against the object store lifecycle, not local disk. Once this is done, the path-traversal surface area shrinks because the storage adapter enforces its own key namespace.

### LR-primary-advantage-019-011 — `PATCH /api/users/[id]` has no Zod validation on request body

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/users/[id]/route.ts:20-21`
- Evidence: Line 20 reads `const body = await request.json();` and line 21 reads `const { name, email, role, xp, level, cefrLevel, password } = body;` — both with no `z.object({...}).parse(body)` and no `.safeParse(body)`. The body is then forwarded directly into the Drizzle `.set(updateData)` (line 51-53) and the role lookup (line 59-61). For comparison, the `users/me/school/admins/route.ts` POST handler at lines 7-21 uses a Zod schema (`addAdminSchema = z.object({ userId: z.string().min(1) })`) — so the project already has the Zod-validation pattern in scope, just not applied here.
- Impact: Combined with LR-019-003 (no role/owner authz), an attacker can send `{"role": "ADMIN", "cefrLevel": "C2", "level": 999}` and Drizzle will accept whatever shape the body has — unknown fields like `passwordHash`, `emailVerified`, or `subscriptionType` are silently ignored by the destructuring, but extra fields inside destructured slots (e.g., `email: { injected: "..." }`) would fail at runtime with an opaque 500 from the bcrypt step. More importantly, the absence of validation means the role-name string flows unchecked into `eq(roles.name, role)` at line 60; if `role` is undefined or empty, the `select().where(...).limit(1)` returns `undefined` and the route throws `"Role 'undefined' not found"` at line 64.
- Recommendation: Validate with `z.object({ name: z.string().min(1).optional(), email: z.string().email().optional(), role: z.enum(["STUDENT","TEACHER","ADMIN","SYSTEM"]).optional(), xp: z.number().int().nonnegative().optional(), level: z.number().int().positive().optional(), cefrLevel: z.string().optional(), password: z.string().min(8).optional() }).parse(body)` and return 400 with `error.errors` on `z.ZodError`. Reject `role` updates for self-edits (see LR-019-003 recommendation).

### LR-primary-advantage-019-012 — `updateData: any` defeats Drizzle's `InferInsertModel` type safety on `users.update`

- Severity: Low
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/users/[id]/route.ts:34`
- Evidence: Line 34 reads `const updateData: any = {};` and lines 35-39 populate fields by hand without typing. The Drizzle `users` schema (`packages/db/src/schema/users.ts:25-47`) exposes `InferInsertModel<typeof users>` for exactly this purpose. Same root cause as LR-019-007 (just on `.update()` instead of `.insert().values()`).
- Impact: Type drift — if a column is renamed in `packages/db/src/schema/users.ts`, the route continues to compile because the property access is on `any`. The `bcrypt.hash(password, saltRounds)` call at line 44 silently produces a hash string and writes it to `updateData.password` regardless of whether the `users.password` column still accepts strings (it currently does — `users.ts:31`).
- Recommendation: `const updateData: Partial<InferInsertModel<typeof users>> = {};` and let the compiler verify the field names. Move the destructuring into a Zod schema (see LR-019-011) so the schema and the type stay in sync.

### LR-primary-advantage-019-013 — No audit logging when removing a school admin

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/users/me/school/admins/[adminId]/route.ts:87-147`
- Evidence: Lines 87-147 delete the `schoolAdmins` row, optionally downgrade the user's role from `admin` to `teacher`, and set `users.schoolId = null`. None of these mutations produce an audit-log row. There is no call to any `auditLog` writer, no console-log of "removed admin X from school Y", and no integration with the existing `ArticleActivityLog` table. Same root cause as LR-018-011 / LR-019-008.
- Impact: A school owner removing an admin is one of the most security-sensitive actions in this app — it changes who has access to a school's user roster, classroom data, and student progress records. With no audit trail, there is no way to detect or roll back a malicious admin removal. For a primary-student app, this is a consent/data-handling gap: a parent who later asks "who had access to my child's classroom on date X?" gets no answer.
- Recommendation: Insert an audit row with `(callerUserId, action: "REMOVE_SCHOOL_ADMIN", targetUserId, schoolId, reason, timestamp)` inside the same transaction as the `schoolAdmins.delete`. If a `Reason` field is added to the request body, persist it; otherwise, derive from the change set. Reuse the `ArticleActivityLog` schema pattern or define a new `audit_logs` table in `packages/db/src/schema/primary.ts` (mirroring the `import_log` recommendation in LR-019-008).

### LR-primary-advantage-019-014 — Redundant DB queries `otherAdminRoles` and `remainingSchoolRoles` select the same rows

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/users/me/school/admins/[adminId]/route.ts:91-92,134-137`
- Evidence: Lines 91-92 read:
  ```ts
  const otherAdminRoles = await db.select().from(schoolAdmins)
    .where(eq(schoolAdmins.userId, adminRecord.admin.userId));
  ```
  Lines 134-137 read:
  ```ts
  const remainingSchoolRoles = await db.select().from(schoolAdmins)
    .where(
      eq(schoolAdmins.userId, adminRecord.admin.userId),
    );
  ```
  Both queries are `SELECT * FROM schoolAdmins WHERE userId = ?` — identical shape, identical result set. The variable naming ("otherAdminRoles" vs "remainingSchoolRoles") implies different intent (lines 91-92 check "any other schools", lines 134-137 check "still in this school") but the WHERE clauses are the same; only the in-memory filtering at lines 139-141 (`r.schoolId === userSchool!.id`) differs.
- Impact: Two DB roundtrips for the same rowset on every DELETE. Latency overhead is small but real for a hot path. More importantly, the divergent variable names suggest the author intended two semantically different queries — a maintenance hazard if the schema later supports per-school role distinctions (`admin` vs `co-admin`) where the second query needs a different filter.
- Recommendation: Run the SELECT once into a local `const allSchoolAdminRows = ...` and reuse it for both the role-downgrade decision (lines 95-130) and the school-membership decision (lines 139-141). Or, if the two checks must diverge, give them different WHERE clauses and document why in a comment.

### LR-primary-advantage-019-015 — No audit logging when adding a school admin

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/users/me/school/admins/route.ts:94-147`
- Evidence: Lines 94-147 insert the `schoolAdmins` row, optionally upgrade the user's role to `admin`, and update `users.schoolId`. None of these mutations produce an audit-log row. No `auditLog` writer is called. Same root cause as LR-019-013 (audit gap on the opposite mutation).
- Impact: A school owner adding an admin grants school-wide access to the new admin's user account, including the ability to read every classroom roster, every student's progress, and every teacher's assignments in that school. With no audit trail, there is no way to determine who was made an admin on a given date, or to roll back a malicious admin grant. Combined with the LR-019-013 gap on removal, the entire `schoolAdmins` lifecycle is unauditable.
- Recommendation: Insert an audit row with `(callerUserId, action: "ADD_SCHOOL_ADMIN", targetUserId, schoolId, roleChangedFrom, roleChangedTo, timestamp)` inside the same transaction as the `schoolAdmins.insert`. Use the same audit-log schema recommended in LR-019-013.

### LR-primary-advantage-019-016 — `roleUpgraded` computed from stale `targetRoleRows` after the upgrade is committed

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/users/me/school/admins/route.ts:142-146`
- Evidence: Lines 142-146 read:
  ```ts
  roleUpgraded:
    !hasAdminRole &&
    targetRoleRows.some(
      (r) => r.roleName === "user" || r.roleName === "teacher",
    ),
  ```
  `targetRoleRows` is the role snapshot loaded at lines 68-74 (BEFORE the upgrade at lines 119-127). The expression returns `true` iff the target user had `"user"` or `"teacher"` role and did NOT already have `"admin"` role — which is the correct logical condition for "did we upgrade them?". However, `hasAdminRole` is also computed from the pre-upgrade snapshot (lines 100-102), and the response field is named `roleUpgraded` implying post-state, but it actually reports pre-state intent. The function `targetRoleRows.some(...)` repeats the same predicate that drives the actual upgrade (line 107), which is fine but verbose.
- Impact: The API response is internally consistent but semantically misleading — a client receiving `{ roleUpgraded: true }` cannot tell whether to query the server again for current state. For a primary-student app where the admin's UI may render this field, the misleading naming is a UX/audit hazard. No security impact.
- Recommendation: Compute the boolean before the upgrade (capture `const wasUpgraded = !hasAdminRole && currentRoles.includes("user") || currentRoles.includes("teacher");` at lines 105-108), use it for the upgrade gate AND the response field, and add a JSDoc explaining that `roleUpgraded` reports the pre-upgrade predicate.

### LR-primary-advantage-019-017 — Unused imports `or`, `ilike` in `csv/route.ts`

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/upload/csv/route.ts:6`
- Evidence: Line 6 reads `import { db, eq, and, inArray, or, ilike } from '@reading-advantage/db';`. The identifiers `or` and `ilike` are not referenced anywhere in the 506-line file. Greppable with `grep -nE '\b(or|ilike)\b' apps/primary-advantage/app/api/upload/csv/route.ts` — zero hits in code, only the import line and an unrelated `classroom_name`/`originalName` substring match.
- Impact: Dead code; no runtime impact (TypeScript tree-shakes unused imports in the emitted JS, and Drizzle's barrel exports don't include `or`/`ilike` as side-effects). Mild maintenance noise — a future reader scanning the import line assumes `or`/`ilike` are used somewhere and wastes time searching.
- Recommendation: Drop `or, ilike` from the import. If they were intended for use in a search/filter path that wasn't completed, mark the import with `// TODO` and link to the issue, or delete the dead entries.

### LR-primary-advantage-019-018 — Fire-and-forget `unlink` callback silently swallows delete failures and races request completion

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/upload/csv/route.ts:463-468`
- Evidence: Lines 463-468 read:
  ```ts
  // Delete temp file
  unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting temp file:", err);
    }
  });
  ```
  The `unlink` is invoked without `await`, the callback only `console.error`s on failure (no retry, no metric, no structured log), and the `NextResponse.json({ success: true, ... })` on lines 470-498 is returned synchronously without waiting for the callback. The response shape includes `filePath: filePath` (line 474) and `fileName: fileName` (line 473) which the client uses as a "upload receipt" — but the file is not guaranteed to be deleted by the time the client gets the response. On serverless platforms with cold starts, the pod may be reaped before the callback fires.
- Impact: Temp files accumulate in `temp/` over time. An attacker who can write files (LR-019-002 path traversal) can compound this by repeatedly uploading large files; even legitimate uploads leave residue because the unlink is best-effort. The `console.error` is the only signal of failure, and there's no log shipping config in this file (AGENTS.md "Observability" section requires structured logs).
- Recommendation: Either `await unlink(filePath)` (synchronous-delete variant via `import { unlink } from "fs/promises"`) inside a `try/catch` so the route can report the failure in the response, or move the cleanup to a worker scheduled job (Trigger.dev `temp.cleanup` cron). Same root cause as LR-018-012 in batch 018 — silent delete failures and unawaited callback.

## No-Finding Notes

- `apps/primary-advantage/app/api/users/[id]/article-records/route.ts`: reviewed line-by-line (1-43). Thin wrapper delegating to `fetchUserActivity` (line 26 in `server/controllers/userController.ts:38-51`). Role check at lines 17-23 correctly uses the `users.role` enum values (`"TEACHER"`, `"SYSTEM"`) which match the pgEnum declared at `packages/db/src/schema/users.ts:5` (`["INTERN", "STUDENT", "TEACHER", "ADMIN", "SYSTEM", "SALES_REP", "SALES_ADMIN"]`). The route is a fork-specific divergence from csv upload (which uses lowercase `roles.name` strings) but the convention here is correct for the enum column. No findings at this route layer — the no-authn and no-body-handling concerns live in the separate activitylog route (LR-019-004) and the PATCH route (LR-019-003 / LR-019-011 / LR-019-012).
- `apps/primary-advantage/app/api/users/[id]/reminder-reread/route.ts`: reviewed line-by-line (1-36). Same auth pattern as `article-records/route.ts`, delegates to `fetchUserReminderReread` (line 26 in `server/controllers/userController.ts:89-106`). Role check uses the same uppercase enum values. The controller at `userController.ts:89-106` does NOT call `currentUser()` internally (the route-layer check is the only auth boundary, which is acceptable). One borderline observation: when `getUserReminderReread` returns successfully but `result.data` is undefined, the controller still returns `{ success: true, data: undefined }` and the route returns 200 with that body — a no-finding-files-only observation, not a security finding.
- `apps/primary-advantage/app/api/upload/csv/route.ts` parts: the Zod-free CSV row validation block (lines 211-298), the file size / MIME validation (lines 100-142), and the per-row class-of-error categorization (lines 217-263) are correct in isolation — findings only attach to the downstream effects (school-lookup bug LR-019-001, path traversal LR-019-002, missing onConflictDoNothing LR-019-005, `as any` casts LR-019-007, audit gap LR-019-008, raw-email oracle LR-019-009, storage-adapter bypass LR-019-010, dead imports LR-019-017, fire-and-forget unlink LR-019-018).

## Summary

- Total findings: 18.
- Per-file finding counts: 10 (csv/route.ts) + 0 (users/[id]/article-records/route.ts) + 0 (users/[id]/reminder-reread/route.ts) + 3 (users/[id]/route.ts) + 1 (users/activitylog/[id]/route.ts) + 2 (users/me/school/admins/[adminId]/route.ts) + 2 (users/me/school/admins/route.ts) = 18. Coverage-table totals match.
- Severity tally: Critical = LR-001, LR-002, LR-003, LR-004 (4). High = LR-005, LR-008 (2). Medium = LR-006, LR-007, LR-009, LR-010, LR-011, LR-013, LR-015 (7). Low = LR-012, LR-014, LR-016, LR-017, LR-018 (5).
- Critical-severity findings:
  - LR-001: `userSchool` lookup queries the `users` table by `schoolId`, identical to LR-018-002 from batch 018 — the response always reports "system user" for any non-system caller, hiding a wrong return type and a wrong school scoping.
  - LR-002: Path traversal in `POST /api/upload/csv` via the same `[^a-zA-Z0-9.-]` sanitizer used in batch 018 — `..` segments survive the filter and let authenticated callers write to any path the Next.js process can write.
  - LR-003: `PATCH /api/users/[id]` accepts the request from any authenticated user with no role/owner/school check — a STUDENT can escalate themselves to ADMIN by sending `{ "role": "ADMIN" }` because `userRoles` (not `users.role`) gates the bulk-import authorization.
  - LR-004: `POST /api/users/activitylog/[id]` is an unauthenticated stub that ignores the entire request body and always returns 200 (or 500 when `data.progress` is empty, which it always is). The handler exists for a route that's reachable from the public internet and does nothing useful.
- Highest-impact fork-divergence categories for this batch:
  - `Fork-specific regression` (10 findings): LR-001, LR-002, LR-003, LR-004, LR-005, LR-010, LR-011, LR-014, LR-016, LR-017, LR-018.
  - `Shared package migration blocker` (6 findings): LR-006, LR-007, LR-008, LR-012, LR-013, LR-015 — all `as any` casts and audit-log gaps track back to the Prisma→Drizzle migration not introducing a shared audit-log schema or stricter insert typing.
  - `Primary-student adaptation risk` (1 finding): LR-009 — the per-row validation error includes the offending email verbatim, enabling an enumeration oracle against primary-student accounts.
- Notable cross-batch patterns (this batch inherits root causes from batch 018):
  - LR-001 ≡ LR-018-002 (school-lookup query reads from the wrong table).
  - LR-002 ≡ LR-018-003 (path traversal in CSV upload).
  - LR-006 ≡ LR-018-008 (UUID `as string` cast on `currentUser.schoolId`).
  - LR-007 ≡ LR-018-007 (`as any` on Drizzle inserts).
  - LR-008 ≡ LR-018-011 (no audit logging on bulk mutation paths).
  - LR-009 ≡ LR-018-010 (per-row email-enumeration oracle).
  - LR-010 ≡ LR-018-006 (storage-adapter bypass for filesystem writes).
  - LR-018 ≡ LR-018-012 (silent delete failures on fire-and-forget unlink).
  - The repetition across two CSV-routes (`classes/route.ts` in batch 018 and `csv/route.ts` in this batch) suggests the Prisma→Drizzle migration tooling generated a copy-pasted template, not a single shared backend function — flag for the shared-package-migration track.
- No source-code, plan.md, or `line-review-coverage.tsv` edits were made. The patch TSV is written under `line-review/coverage-patches/primary-advantage-019.tsv` and the evidence is in this file.