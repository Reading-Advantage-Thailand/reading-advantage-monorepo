# Line Review Evidence: primary-advantage-018

Reviewer: coder-minimax-m3/primary-advantage-018
Files assigned: 3
Lines assigned: 1176

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/app/api/teachers/route.ts` | 1-15 | reviewed | 0 |
| `apps/primary-advantage/app/api/upload/classes/route.ts` | 1-1074 | reviewed | 9 |
| `apps/primary-advantage/app/api/upload/csv/cleanup/route.ts` | 1-87 | reviewed | 3 |

## Findings

### LR-primary-advantage-018-001 — `const roles = await db.select().from(roles)` shadow / TDZ ReferenceError on users CSV upload

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/upload/classes/route.ts:728`
- Evidence: Line 728 reads `const roles = await db.select().from(roles);` inside the `if (filename === "students.csv" || filename === "teachers.csv")` branch (lines 725-970). The imported `roles` table from `@reading-advantage/db` (line 8) is the `pgTable` symbol that `db.select().from(...)` expects; the local `const roles` shadows it but the initializer `await db.select().from(roles)` is evaluated BEFORE the const binding is initialized. At the moment `.from(roles)` runs, `roles` is in the Temporal Dead Zone and the expression throws `ReferenceError: Cannot access 'roles' before initialization`. There is no possible path through the users CSV branch that survives this line, so uploading `students.csv` or `teachers.csv` has never worked against the deployed code — only `classes.csv` succeeds.
- Impact: The "users uploaded and created successfully" path advertised in `actions/flashcard.ts` and the admin import-data UI (`app/[locale]/admin/import-data/page.tsx`, batch 007) is non-functional. Anyone who tests the bulk user-creation flow gets a 500. The teacher assignment / classroom assignment downstream logic (lines 787-966) is also unreachable for the users-CSV path. This is the worst kind of fork-specific regression: the migration introduced the bug in the same line where it documented "replaces Prisma `role.findMany`" — the comment on line 727 confirms the original intent (a `db.select().from(roles)` against the imported symbol), but the destination variable took the same name as the source table.
- Recommendation: Rename the local variable. `const allRoles = await db.select().from(roles); const roleMap = new Map(allRoles.map((r) => [r.name, r.id]));`. This preserves the intent expressed in the migration comment and removes the shadowing. Also consider enabling ESLint's `no-shadow` rule (`apps/primary-advantage/eslint.config.mjs`) so this class of bug fails lint.

### LR-primary-advantage-018-002 — `userSchool` lookup queries `users` table by `schoolId` instead of `schools` table

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/upload/classes/route.ts:174-180`
- Evidence: Lines 174-180 read:
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
  `currentUser.schoolId` is a UUID column on `users` (`packages/db/src/schema/users.ts:34`) that references `schools.id` (`packages/db/src/schema/users.ts:10`). The query selects from the `users` table (not `schools`) and compares `users.id` (text, per `users.ts:26`) against `currentUser.schoolId` (uuid). Even if the types coerced correctly, the result is a `users` row, not a `schools` row. In practice the type mismatch and the fact that no user has `id` equal to a school id means `s` is `undefined` and `userSchool` stays `null` for every non-system caller. The response then falls into the `else` branch at lines 1054-1056 and reports "system user - data imported without school assignment", which is incorrect for every ADMIN and TEACHER caller.
- Impact: The API response field `schoolInfo` (lines 1045-1056) is wrong for every authenticated non-system caller. An admin who imports 200 students sees `note: "system user - data imported without school assignment"` even though the import was correctly scoped to their schoolId. Downstream UIs that surface `schoolInfo.id` or `schoolInfo.name` will receive `undefined` and silently render blanks. This is a fork-specific regression caused by the Prisma→Drizzle join-stitching pattern described in AGENTS.md; the previous Prisma query was `user.findUnique({ include: { School: true } })` which resolved the School via the relation, but the manual stitch incorrectly reads from `users` instead of `schools`.
- Recommendation: Replace with a join against the `schools` table. Either `db.select({ id: schools.id, name: schools.name }).from(schools).where(eq(schools.id, currentUser.schoolId)).limit(1)` (importing `schools` from `@reading-advantage/db/schema`) or, better, define a Drizzle `relations()` declaration on `users` and use `db.query.users.findFirst({ where: ..., with: { school: true } })`. Verify the type of `schoolId` is `uuid` (not `string`) so the cast `currentUser.schoolId as string` from LR-018-008 is also corrected.

### LR-primary-advantage-018-003 — Path traversal in `POST /api/upload/classes` via user-controlled `originalName` segment

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/upload/classes/route.ts:269-271`
- Evidence: Line 269 reads `const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");` and line 270 reads `const fileName = \`${currentUser.id}_${originalName}\`;`. The sanitization regex strips characters NOT in `[a-zA-Z0-9.-]` — note that `.` and `/` are NOT stripped. The original `file.name` is taken from the multipart upload (line 224: `const file = formData.get("file") as File;`), which is fully client-controlled. A caller can upload a file named `..__evilname` and the resulting `fileName` will contain `..`. Combined with `path.join(tempDir, fileName)` on line 271 (where `tempDir = path.join(process.cwd(), "temp")` on line 262), the `..` segments can resolve to files OUTSIDE the intended `temp/` directory.
- Impact: An authenticated admin/teacher/system caller can write uploaded CSV bytes to any path the Next.js process has write access to. Realistic targets: `apps/primary-advantage/.env.local` (overwrite the `.env` and brick the deploy on next boot), `.next/cache/...` (corrupt the build cache), `apps/primary-advantage/server/controllers/teacherController.ts` (drop a malicious TS file that the next compile will pick up). The file is overwritten with attacker-chosen bytes after the validation pass (lines 276, `await writeFile(filePath, buffer);`). Combined with the fact that the multipart parser already accepts up to 5 MB per file (line 63), this gives an authenticated attacker a powerful write primitive.
- Recommendation: Reject any file name containing `/`, `\`, `..`, or starting with `.`. Sanitize with `path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_")` AND verify the resolved `filePath` stays inside `tempDir` with `path.relative(tempDir, filePath)` returning a string that does not start with `..`. Better: store uploads in the S3-compatible storage adapter per AGENTS.md ("Storage" section) and never touch the local filesystem from a route handler.

### LR-primary-advantage-018-004 — Path traversal in `DELETE /api/upload/csv/cleanup` allows arbitrary file deletion

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/upload/csv/cleanup/route.ts:6-40`
- Evidence: The DELETE handler reads `fileName` from the query string on line 9 with NO authentication (the route has no `await currentUser()` / `await getCurrentUser()` call anywhere in lines 6-40) and no role check. Line 19 reads `const filePath = path.join(tempDir, fileName);` where `tempDir = path.join(process.cwd(), "temp")` (line 18). There is no sanitization or boundary check on `fileName`. A request like `DELETE /api/upload/csv/cleanup?fileName=../../../apps/primary-advantage/.env.local` will compute `filePath = "/app/apps/primary-advantage/.env.local"` and, if the file exists (line 22 `existsSync` returns true), `await unlink(filePath)` on line 27 will delete it. No CSRF protection either — the route accepts any DELETE.
- Impact: An unauthenticated external attacker can delete any file the Next.js process has write access to. Realistic targets: `apps/primary-advantage/.env.local` (denial-of-service via env wipe), `apps/primary-advantage/server/controllers/*.ts` (delete controller source — the next compile will fail and the entire app goes down), `.next/cache/...` (corrupt the build cache, slow rebuilds). This is the most severe finding in this batch — it requires zero authentication and is reachable from any internet client that can reach the route.
- Recommendation: Replace the route entirely with an adapter-mediated delete: `await storage.delete(\`uploads/${fileName}\`)`. Validate `fileName` against `^[a-zA-Z0-9._-]+$` before any filesystem access. Reject `..`, `/`, `\\`, and any leading `.`. Add `await currentUser()` plus a SYSTEM role gate. Move the delete trigger to a worker cron that scans a known bucket prefix, not a public HTTP route.

### LR-primary-advantage-018-005 — Unauthenticated bulk file deletion in `POST /api/upload/csv/cleanup`

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/upload/csv/cleanup/route.ts:42-86`
- Evidence: The POST handler (lines 42-86) is exported with NO `currentUser()` call, NO role check, and NO rate limit. It iterates `await readdir(tempDir)` (line 54) and deletes every file older than 24 hours (lines 59-74). Any external client can call this endpoint in a loop and either (a) wipe pending uploads that an admin is about to process, or (b) trigger a race condition where an admin's in-flight upload is deleted before the handler reads it. The comment on line 42 says "Clean up old temporary files (older than 24 hours)" which suggests it was intended as a scheduled job, not an HTTP endpoint.
- Impact: Unauthenticated denial-of-service on the bulk-import workflow. A motivated attacker can prevent legitimate CSV imports from completing by triggering cleanup during the import window. The POST handler returns the count of deleted files (line 78), giving the attacker feedback. Combined with LR-018-004, the entire `/api/upload/csv/cleanup` namespace is an unauthenticated file-management endpoint and should not be reachable from the public internet.
- Recommendation: Remove the HTTP route. Move the cleanup logic into `services/worker` (a Trigger.dev job or scheduled cron) where the JWT/secret can be scoped to an internal scheduler. If the HTTP endpoint must remain for debugging, gate it behind `requireRole(["SYSTEM"])` and add a rate limit (e.g., 1 call / hour per IP).

### LR-primary-advantage-018-006 — Direct filesystem writes from a route handler bypass the storage adapter contract

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/upload/classes/route.ts:2-4,261-276,989-993`
- Evidence: Lines 2-4 import `writeFile`, `mkdir` from `fs/promises`, `existsSync`, `unlink` from `fs`, and `path`. Lines 261-276 perform `await mkdir(tempDir, { recursive: true })` and `await writeFile(filePath, buffer)` directly. Lines 989-993 call `unlink(filePath, ...)` (fire-and-forget). Lines 695-700 call `unlink(filePath, ...)` on the validation-error path. None of these go through the S3-compatible storage adapter described in the root AGENTS.md ("Storage" section): "Application code must not directly call storage provider SDKs." The route is also responsible for its own retention logic instead of delegating to a worker.
- Impact: The bulk-import feature is not portable to serverless platforms (Cloud Run, Fly.io, Railway) that have ephemeral filesystems — a pod restart loses all in-flight uploads, and horizontal scaling means two pods can race on the same `temp/` directory. The route also can't switch to GCS/R2/S3 without rewriting every `fs` call. AGENTS.md explicitly calls this out as a Provider Neutrality violation.
- Recommendation: Replace filesystem writes with `storage.put(\`uploads/${currentUser.id}/${fileName}\`, buffer, { contentType: "text/csv" })`. Replace `unlink` calls with `storage.delete(...)`. Keep the temp-file cleanup logic in `services/worker` (Trigger.dev) so it runs against the object store lifecycle, not local disk. Once this is done, LR-018-003 and the corresponding input-validation burden disappear because the storage adapter enforces its own key namespace.

### LR-primary-advantage-018-007 — `as any` casts on Drizzle inserts defeat migration's type safety across all five batched inserts

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/upload/classes/route.ts:752,769,808,938,956,976`
- Evidence: Lines 752, 769, 808, 938, 956, and 976 each cast a typed insert payload to `as any`:
  - Line 752: `await db.insert(users).values(batch as any).onConflictDoNothing();`
  - Line 769: `await db.insert(users).values(batch as any).onConflictDoNothing();`
  - Line 808: `await db.insert(userRoles).values(roleAssignments as any).onConflictDoNothing();`
  - Line 938: `await db.insert(classroomStudents).values(studentAssignmentsToCreate as any).onConflictDoNothing();`
  - Line 948: `await db.insert(classroomStudents).values({ ... } as any).onConflictDoNothing();`
  - Line 956: `await db.insert(classroomTeachers).values(teacherAssignmentsToCreate as any).onConflictDoNothing();`
  - Line 976: `await db.insert(classrooms).values(processedClasses as any).onConflictDoNothing();`
  The Drizzle table definitions (`packages/db/src/schema/users.ts:25-47`, `classrooms.ts:7-48`, `primary.ts:98-110`) match the shape of every insert payload exactly. There is no legitimate type mismatch — the casts exist purely to silence the variadic tuple narrowing that Drizzle performs on `.values([...])`.
- Impact: AGENTS.md calls `as any` a Prisma-era anti-pattern that the Drizzle migration was supposed to retire. The casts mask future schema drift: if `users.schoolId` becomes non-null, or `classroomStudents.joinedAt` is changed to a generated column, the inserts will continue to compile and the database will reject them at runtime, returning 500 to the admin doing the CSV upload. Same root cause as LR-017-002 and LR-017-009 from batch 017 — fork-wide regression that survives migration.
- Recommendation: Use Drizzle's `InferInsertModel<typeof table>` type and type the batch arrays as `Array<InferInsertModel<typeof users>>`. For multi-row inserts, Drizzle supports `db.insert(users).values([row1, row2, ...])` with a tuple type — no `any` needed. As an interim, `@ts-expect-error` with a comment naming the issue is preferable to a global `as any`.

### LR-primary-advantage-018-008 — `currentUser.schoolId as string` cast lies about UUID → string type

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/upload/classes/route.ts:645,850`
- Evidence: Line 645 reads `eq(classrooms.schoolId, currentUser.schoolId as string)` and line 850 reads `eq(classrooms.schoolId, currentUser.schoolId as string)`. The `classrooms.schoolId` column is declared `uuid("school_id")` (`packages/db/src/schema/classrooms.ts:10`), and `users.schoolId` is also `uuid` (`packages/db/src/schema/users.ts:34`). Both sides are uuid. The cast lies about the type so the `eq(...)` helper accepts both operands without a compile error. If the runtime value of `currentUser.schoolId` is `null` (a system user), the cast is also a runtime lie — `eq(classrooms.schoolId, null)` becomes `classrooms.schoolId IS NULL`, not the intended "all schools" filter. Combined with LR-018-001's TDZ crash on the users path, system users cannot upload classes either.
- Impact: The cast hides the legitimate bug that the system-user flow has no school scoping. A SYSTEM caller is supposed to upload into any school, but the code silently filters `classrooms.schoolId IS NULL` instead. The system user might believe the upload succeeded (lines 1017-1025 will report `processedClasses: N`) but no classrooms are actually inserted. The userSchool report (lines 1045-1056) also falls into the wrong branch.
- Recommendation: Remove the cast. Branch the query: `currentUser.schoolId ? and(eq(classrooms.schoolId, currentUser.schoolId), ...) : sql\`true\``. For system users, drop the schoolId filter entirely. Document the SYSTEM scope semantics in `fork-divergence.md`.

### LR-primary-advantage-018-009 — Teacher-upload path assigns teachers to ANY classroom in the school, not ones owned by the importing teacher

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/upload/classes/route.ts:874-960`
- Evidence: Lines 874-901 iterate `processedUsers` and, for each teacher, push `{ classroomId, teacherId }` into `teacherAssignmentsToCreate` (line 891). Lines 844-857 build a `classroomNameToIdMap` by selecting every classroom in the school (`and(inArray(classrooms.name, ...), eq(classrooms.schoolId, currentUser.schoolId as string))`). The code never checks whether the calling teacher already teaches that classroom, whether the calling teacher has admin permission over the school, or whether the target classroom was even created by the same uploader. For a TEACHER-role caller (which is allowed by line 191 `allowedRoles = ["admin", "system", "teacher"]`), this means any teacher in school A can rebind every other teacher in school A into arbitrary classrooms.
- Impact: Classroom membership is the primary authorization boundary for primary-student content. A teacher who gets reassigned to a different classroom by an unauthorized peer will start seeing that classroom's students in their roster, including primary-age children. Combined with the audit gap (no `audit_log` row written for the rebind), the change is unrecoverable. This is a primary-student adaptation risk because the impact is on the teacher → student relationship, and there is no consent/notification path for the affected teacher.
- Recommendation: Restrict the teacher-assignment branch to ADMIN and SYSTEM callers. Drop "teacher" from `allowedRoles` on line 190, or branch: if the caller is a TEACHER, only allow classroomNames the caller already teaches (loaded by `db.select(...).from(classroomTeachers).where(eq(classroomTeachers.teacherId, authUser.id))`). Add an audit-log entry per (callerId, teacherId, classroomId) triple. Document the teacher-self-service limitation in `fork-divergence.md`.

### LR-primary-advantage-018-010 — Per-row error messages enable email enumeration and account-confirmation oracle

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/upload/classes/route.ts:485-490`
- Evidence: Lines 485-490 read:
  ```ts
  if (existingEmailSet.has(validatedRow.email.toLowerCase())) {
    errors.push(
      `Row ${rowNumber}: User with email '${validatedRow.email}' already exists`,
    );
    continue;
  }
  ```
  Combined with the rest of the validation logic (lines 491-557), a single bulk upload response contains a per-row pass/fail reason that includes the offending email. An attacker who controls an admin/teacher account (or compromises one) can submit a `students.csv` with thousands of guessed email addresses and learn which ones exist in the database. The success-path response on lines 1032-1059 also exposes the inserted user IDs implicitly via the stats.
- Impact: Email enumeration is a data-minimization violation (AGENTS.md: "Consent/data handling" for primary students) and a precursor to credential-stuffing or phishing attacks against the parents/teachers whose email is now confirmed. The response is also structured per-row so the attacker can iterate quickly without parsing.
- Recommendation: Return a generic `{ error: "Validation failed", details: errors.map(e => ({ row: e.row, code: "DUPLICATE_EMAIL" | "INVALID_FORMAT" | ... })) }` where the email itself is masked as `j***@example.com`. Drop the email from the error message. Rate-limit the import endpoint per caller (e.g., 10 uploads / hour) so enumeration is bounded.

### LR-primary-advantage-018-011 — No audit logging for bulk user creation / classroom creation / role assignment

- Severity: High
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/upload/classes/route.ts:738-984`
- Evidence: The route creates users (lines 752-779), assigns roles (lines 805-816), and binds teachers/students to classrooms (lines 934-960) with no calls to any audit-log writer. There is no `audit_logs` table insert, no console-log of "who created what", and no integration with the existing `articleActivityLogs` style logging. The AGENTS.md "Audit Logs" section says: "Security-sensitive actions should create audit events: ... Destructive actions." A 200-row bulk import that creates 200 student accounts and binds them to classrooms is exactly the kind of action that needs a recoverable audit trail.
- Impact: If a bulk import goes wrong (wrong CSV, wrong classroom mapping), the admin has no way to determine which rows were inserted, which role bindings succeeded, or which classroom assignments were applied. The response shape on lines 1032-1059 includes `stats.processedUsers`, `stats.createdUsers`, etc., but these numbers don't tie back to specific userIds. A primary-age student who gets accidentally enrolled in the wrong classroom cannot be un-enrolled by replaying the import, because the system doesn't know which enrollment came from which upload.
- Recommendation: Add an `import_log` table (or reuse `articleActivityLogs`-style pattern) keyed by `(uploadId, callerId, action, targetId, timestamp)`. Write one row per (inserted user, assigned role, classroom binding) inside the same transaction as the inserts. Return `uploadId` in the response so admins can correlate later. Audit logging belongs in the shared `@reading-advantage/db` schema so this isn't a fork-specific concern — file this under the Shared Package Migration Blocker category.

### LR-primary-advantage-018-012 — `cleanup` POST handler returns success even when an individual file delete fails silently

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/upload/csv/cleanup/route.ts:66-71`
- Evidence: Lines 66-71 wrap the per-file `unlink` in `try/catch` and only `console.error` on failure (line 70). The handler then increments `deletedCount` only on success (line 68). The handler returns `{ success: true, message: \`Cleaned up ${deletedCount} old files\` }` on line 77-79 regardless of how many individual deletes failed. There is no aggregate error count, no list of failed files, and no `success: false` for partial failure.
- Impact: Operators relying on the endpoint's response to confirm cleanup will believe all stale files are gone when in fact some remain. Combined with the lack of auth (LR-018-005), there is no signal that something went wrong. For a primary-student app where temp files may contain partially-parsed CSV data with student emails, the silent failures are an audit gap.
- Recommendation: Track `failedCount` and `failedFiles` and return them in the response. Set `success: false` if `failedCount > 0`. Log a structured warning with the failed file paths. The fix should also enable an alert (PagerDuty, Sentry, etc.) when the failure rate exceeds a threshold.

## No-Finding Notes

- `apps/primary-advantage/app/api/teachers/route.ts`: reviewed line-by-line (1-15). Thin wrapper delegating to `getTeachersController` (line 9) and `createTeacherController` (line 14) in `server/controllers/teacherController.ts`. Both controllers perform their own `currentUser()` and `checkAdminPermissions` checks per the same root-cause pattern documented in batch 017 (LR-017-014 et al.). No findings at this route layer — the same cross-tenant mutation risk lives downstream in the controllers and is already captured in the prior batch's findings.
- `apps/primary-advantage/app/api/upload/classes/route.ts` parts: the CSV header validation (lines 330-362), the file size / MIME validation (lines 53-70), the Zod schemas for `classroomCsvRowSchema` and `userCsvRowSchema` (lines 13-50), and the per-row Zod validation pass (lines 382-408, 591-617) are correct in isolation. Findings only attach to the boundary effects (TDZ, casts, audit gap).

## Summary

- Total findings: 12 (2 Critical, 5 High, 4 Medium, 1 Low).
- Per-file finding counts: 0 (teachers/route.ts) + 9 (classes/route.ts) + 3 (cleanup/route.ts) = 12. Coverage-table totals match: 0 + 9 + 3 = 12.
- Severity tally: Critical = LR-001, LR-004 (2). High = LR-002, LR-003, LR-005, LR-009, LR-011 (5). Medium = LR-006, LR-007, LR-008, LR-010 (4). Low = LR-012 (1).
- Critical-severity findings: LR-001 (TDZ crash on users CSV upload — entire `students.csv` / `teachers.csv` import is non-functional), LR-004 (unauthenticated path traversal delete on `/api/upload/csv/cleanup`).
- Highest-impact fork-divergence categories for this batch: `Fork-specific regression` (TDZ bug, file traversal, unauth cleanup, storage-adapter bypass, silent delete failures), `Primary-student adaptation risk` (teacher-classroom rebind by peer teachers, email enumeration oracle), `Shared package migration blocker` (`as any` casts, missing audit-log schema for bulk imports).
- No source-code, plan.md, or `line-review-coverage.tsv` edits were made. The patch TSV is written under `line-review/coverage-patches/primary-advantage-018.tsv` and the evidence is in this file.