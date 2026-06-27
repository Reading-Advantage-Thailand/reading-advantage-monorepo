# Line Review Evidence: primary-advantage-017

Reviewer: measure-jr-green/primary-advantage-017
Files assigned: 10
Lines assigned: 588

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/app/api/licenses/route.ts` | 1-220 | reviewed | 5 |
| `apps/primary-advantage/app/api/schools/ranking/route.ts` | 1-80 | reviewed | 2 |
| `apps/primary-advantage/app/api/schools/route.ts` | 1-131 | reviewed | 3 |
| `apps/primary-advantage/app/api/send/route.ts` | 1-21 | reviewed | 2 |
| `apps/primary-advantage/app/api/students/[id]/assignments/route.ts` | 1-9 | reviewed | 1 |
| `apps/primary-advantage/app/api/students/[id]/route.ts` | 1-30 | reviewed | 1 |
| `apps/primary-advantage/app/api/students/leaderboard/route.ts` | 1-46 | reviewed | 0 |
| `apps/primary-advantage/app/api/students/route.ts` | 1-15 | reviewed | 0 |
| `apps/primary-advantage/app/api/teachers/[id]/route.ts` | 1-30 | reviewed | 0 |
| `apps/primary-advantage/app/api/teachers/assignments/route.ts` | 1-6 | reviewed | 1 |

## Findings

### LR-primary-advantage-017-001 — Unused `randomBytes` import in licenses POST handler

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/licenses/route.ts:5`
- Evidence: Line 5 imports `import { randomBytes } from "crypto";` but the symbol is never referenced in the file. License keys are generated on line 41 via `generateLicenseKey()` from `@/lib/utils` (which itself uses `generateSecureCode` per `lib/utils.ts:120-122`). The leftover import dates from a pre-helper implementation that manually built the key with `randomBytes(16).toString("hex")`.
- Impact: Adds a dead symbol that will confuse future reviewers and pollute tree-shaking results. It is a fork-specific regression from a partially-completed refactor: the import survived when the helper extraction happened. There is no runtime impact, but the AGENTS.md "JSDoc for all functions" rule plus the Drizzle migration policy both flag dead imports as anti-pattern.
- Recommendation: Remove line 5. If a CSPRNG is ever needed inside this route, import `randomBytes` at the call site rather than at module scope.

### LR-primary-advantage-017-002 — `as any` cast on Drizzle insert in licenses POST

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/licenses/route.ts:53-63`
- Evidence: Lines 53-63 read `const [license] = await db.insert(licenses).values({ ... } as any).returning();`. The cast covers a six-property object that includes `subscription: validatedData.subscriptionType.toUpperCase() as SubscriptionType` (line 61) and `schoolId: validatedData.schoolId || null` (line 62). The Drizzle `licenses` table (`packages/db/src/schema/licenses.ts:8-31`) declares all six columns; the only legitimate mismatch is the `SubscriptionType` string-literal narrowing, which can be solved with a type guard (`subscriptionType.enumValues.includes(value)`) instead of `as any`. The `schoolId` shape is correct (`uuid` column, nullable).
- Impact: `as any` defeats the migration's intent. AGENTS.md (root) and `apps/primary-advantage/AGENTS.md` both call out the `as any` pattern as a Prisma-era anti-pattern that Drizzle was meant to retire. The cast masks the real type mismatch on line 61 (where a runtime `.toUpperCase()` could produce `"PREMIUM"` not present in the `subscriptionType` pgEnum values) and silently writes an invalid subscription to the database. A primary-student license key could end up with `subscription = "BASIC"` (the enum default) when the API caller intended `"premium"`, and the error would not surface until the row is read back.
- Recommendation: Remove the `as any`. Use `subscriptionType.enumValues` as the source of truth: `const sub = validatedData.subscriptionType.toUpperCase(); if (!(subscriptionType.enumValues as readonly string[]).includes(sub)) { return NextResponse.json({ error: "Invalid subscription" }, { status: 400 }); }` and then assign `subscription: sub as SubscriptionType`. The remaining insert properties are already Drizzle-compatible.

### LR-primary-advantage-017-003 — `whereConditions: any[]` array defeats type narrowing in licenses GET

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/licenses/route.ts:121`
- Evidence: Line 121 reads `const whereConditions: any[] = [];`. The array is later populated with `eq(...)` predicates (lines 123, 132) and passed to `and(...whereConditions)` (lines 139, 148). The Drizzle `and(...)` helper accepts a variadic `SQL<unknown> | undefined`; using `any[]` forces every predicate to widen to `any` before narrowing back, which defeats the migration's whole point of moving to a strongly-typed query builder.
- Impact: A future contributor adding a predicate that returns `undefined` (e.g., `searchParams.get(...)` used without a guard) will compile silently and only fail at runtime when the SQL is built. This is the same anti-pattern as LR-017-002.
- Recommendation: Type the array as `SQL<unknown>[]` (or `Array<ReturnType<typeof eq>>`) and conditionally push via `whereConditions.push(predicate)` only when the predicate is defined. Drop the `as any` and `any[]` markers together.

### LR-primary-advantage-017-004 — DELETE handler accepts license id via query string and does not check school ownership

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/licenses/route.ts:187-219`
- Evidence: The DELETE handler reads the license id from a query string on line 199 (`const id = searchParams.get("id");`) rather than a path parameter or request body. More importantly, after authenticating as ADMIN or SYSTEM (lines 189-196), the handler does not verify that the license's `schoolId` matches the caller's school. The Drizzle delete on lines 209-210 (`db.delete(licenses).where(eq(licenses.id, id))`) will succeed for any license row regardless of which school owns it. An `ADMIN` user from school A can therefore delete a license assigned to school B by issuing `DELETE /api/licenses?id=<other-school-license>`.
- Impact: Cross-tenant destructive write. The `licenseOnUsers` join table (`packages/db/src/schema/licenses.ts:33-43`) cascades on delete, so all user→license bindings are wiped silently. A primary-student account that is currently bound to the deleted license will lose feature flags on the next session. The DELETE route also has no audit logging (no `console.log` of who deleted what), so the destructive action is unrecoverable.
- Recommendation: Move the id into a path parameter (`DELETE /api/licenses/[id]`) so the contract is unambiguous. Before delete, load the row and assert `license.schoolId === user.schoolId` unless `user.role === "SYSTEM"`. Add an audit-log entry (`audit.ts` schema) capturing `{ actorId, licenseId, schoolId, action: "delete" }`. Return 404 if the license does not exist (so the caller cannot distinguish "missing" from "not owned").

### LR-primary-advantage-017-005 — License GET silently returns zeroed `_count`-equivalent user counts

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/api/licenses/route.ts:154-168`
- Evidence: Lines 154-168 stitch a `School` include onto each license row (lines 154-163) and then explicitly comment "we won't compute exact user counts in this route — they aren't actually rendered by the API consumer" (lines 167-168). The returned shape on line 172 (`licensesWithSchool`) does not include any `_count` field, which differs from the previous Prisma `_count.select.users` shape that consumers may still expect. The same pattern is used in `app/api/schools/route.ts:113-119` (see finding LR-017-008) where hardcoded zeros are returned instead.
- Impact: A documented API consumer expecting `{ license, School, _count: { users: N } }` will silently break. The current consumers (`apps/primary-advantage/components/system/license-table.tsx`, etc.) may not surface this because they happen to not render the count. If they are updated later, the consumer will read a hardcoded 0 and incorrectly conclude the license has no users. This is an intentional product divergence (the migration removed the cross-table `_count` to avoid N+1 queries) but it is not documented in `measure/audit-reports/primary-advantage-full_20260626/fork-divergence.md`.
- Recommendation: Either (a) populate the user count via a single batched `db.select({ licenseId, count: count() }).from(licenseOnUsers).where(inArray(licenseId, licenseIds)).groupBy(licenseId)` and stitch it onto the response, or (b) document the divergence in `fork-divergence.md` and `migration-tracks.md` so consumers know the count is omitted by design. The first option is preferable because it preserves the prior contract.

### LR-primary-advantage-017-006 — GET `/api/schools/ranking` accepts arbitrary `schoolId` and leaks other schools' leaderboards

- Severity: Critical
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/schools/ranking/route.ts:35-65`
- Evidence: The GET handler reads `schoolId` from `searchParams.get("schoolId")` on line 44. If the param is missing, it falls back to the caller's own `users.schoolId` (lines 46-61). If the param is present, it is passed straight into `getSchoolLeaderboardController(schoolId, user.id)` on line 64 without verifying that the authenticated user belongs to `schoolId`. The underlying model (`server/models/schoolModel.ts:241-383`) accepts the `schoolId` verbatim and returns top-5 students for that school (names, classrooms, XP totals, and userIds), plus optionally injects the caller's own rank.
- Impact: Cross-tenant data exposure. A primary-age student signed in to school A can issue `GET /api/schools/ranking?schoolId=<school-B-uuid>` and read the top-5 student names, classroom names, XP totals, and user IDs of school B. This violates the AGENTS.md "Multi-Tenancy" rule: "Never trust tenant IDs from the frontend without verifying the user has access." It is also a primary-student adaptation risk because the leaked data is the kind of competitive metric (XP, classroom placement) that can be used to target or exclude specific children.
- Recommendation: Remove the `schoolId` query parameter entirely; always derive `schoolId` from `user.schoolId` via the join in lines 48-51. If a SYSTEM user must view another school's leaderboard, add a separate `/api/system/schools/[schoolId]/ranking` route gated by `requireRole(["SYSTEM"])` and audited. Cross-tenant reads must never flow through a per-user leaderboard endpoint.

### LR-primary-advantage-017-007 — POST `/api/schools/ranking` uses single shared secret for state-mutating admin endpoint

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/schools/ranking/route.ts:10-33`
- Evidence: The POST handler is gated only by `x-access-key === process.env.ACCESS_KEY` (lines 12-15). There is no per-user authentication, no role check, and no rate limit. The endpoint calls `updateSchoolRankingController()` (line 17) which fans out across **all schools globally** — `server/models/schoolModel.ts:66` (`db.select().from(schools)`) iterates every row. The handler mutates the `leaderboards` table for every school (model lines 211-230) on every call.
- Impact: Anyone with the shared secret (or the ability to brute-force it — there is no rate limit, and `ACCESS_KEY` is a single env var with no minimum length or rotation enforced) can mass-mutate the global leaderboard. Combined with finding LR-017-006, a single leaked secret compromises both read and write of cross-school leaderboard data. This is a fork-specific regression because the AGENTS.md "Authentication" section requires "PostgreSQL-backed sessions" and "Rate limiting for login endpoints" — neither is present here.
- Recommendation: Replace the shared-secret gate with `await currentUser()` plus `requireRole(["SYSTEM"])` and a per-user rate limit (e.g., 1 call / hour). If the endpoint must remain triggerable by an external cron, accept a signed webhook (HMAC over the body + timestamp) and reject replays via a nonce store.

### LR-primary-advantage-017-008 — Schools GET returns hardcoded zero user/admin counts

- Severity: High
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/api/schools/route.ts:113-121`
- Evidence: Lines 113-121 build the response shape with `_count: { users: 0, admins: 0 }` (line 119). The comment on lines 113-116 says "For simplicity in this route (the existing call doesn't actually surface these counts at this layer), use 0 placeholders to preserve shape." The previous Prisma query was `findMany({ include: { _count: { select: { users: true, admins: true } } } })` (per the comment on line 89).
- Impact: Any API consumer that renders "users" or "admins" per school will display `0` instead of the real count. `apps/primary-advantage/app/[locale]/system/schools/page.tsx` (which lives in another batch but reads `/api/schools`) may render "0 admins" and "0 users" against every row, masking license utilization. This is not a multi-tenant data leak (the route is already gated to `SYSTEM` role on line 80), but it is a documented product divergence that needs to be flagged.
- Recommendation: Compute the real counts in a single batched query: `db.select({ schoolId, count: count() }).from(users).where(inArray(users.schoolId, schoolIds)).groupBy(users.schoolId)`. Mirror the same for `schoolAdmins` (`packages/db/src/schema/primary.ts`). Replace the hardcoded zeros with the actual aggregates. Document the change in `migration-tracks.md` so the consumer side knows the count is now accurate.

### LR-primary-advantage-017-009 — `as any` cast on Drizzle insert in schools POST

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/schools/route.ts:47-51`
- Evidence: Lines 47-51 read `const [school] = await db.insert(schools).values({ name: validatedData.name, contactName: validatedData.contactName, contactEmail: validatedData.contactEmail, } as any).returning();`. The Drizzle `schools` table (`packages/db/src/schema/users.ts:9-21`) declares exactly these three fields plus auto-managed `id`, `country`, `createdAt`, `updatedAt`. There is no type mismatch.
- Impact: Identical to LR-017-002. The `as any` is unnecessary and bypasses type safety. If a future contributor adds a required field to the schema (e.g., a `district` non-null), the `as any` will keep the route compiling while the database rejects the insert with a 500.
- Recommendation: Remove the `as any`. Rely on Drizzle's inferred insert type, or use `InferInsertModel<typeof schools>` if explicit typing is desired.

### LR-primary-advantage-017-010 — Schools route uses stricter role check than the rest of the admin surface

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/api/schools/route.ts:22,80`
- Evidence: Lines 22 and 80 both read `if (currentUser.role !== "SYSTEM")` and return 403. The rest of the admin surface (e.g., `studentController.ts:119` and `teacherController.ts:112` via `checkAdminPermissions`) accepts `SYSTEM`, `ADMIN`, and `SCHOOL_ADMIN` roles. A `SCHOOL_ADMIN` who can manage students and teachers in their own school cannot view the list of schools they are bound to.
- Impact: A `SCHOOL_ADMIN` viewing their own school's dashboard will see a 403 when the UI fetches `/api/schools` to look up the school name. The UI path `apps/primary-advantage/app/[locale]/admin/dashboard/students/page.tsx` lives in a different batch but is a consumer of this endpoint; if it does not pre-filter on the client, the page will render empty.
- Recommendation: Either (a) widen the role check to `checkAdminPermissions(currentUser)` (allowing ADMIN/SCHOOL_ADMIN/SYSTEM) and filter the returned list to the caller's `schoolId` for non-SYSTEM users, or (b) document the divergence as intentional and have the admin UI fetch a per-school endpoint instead. The fork-specific design (system-only schools list) should be visible in `fork-divergence.md`.

### LR-primary-advantage-017-011 — `/api/send` route is a dead stub with no auth and no actual email sending

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/send/route.ts:1-21`
- Evidence: Lines 6-15 contain a fully commented-out `resend.emails.send` call. Line 17 returns `{ message: "Email sent" }` without ever sending. Line 1 imports `EmailTemplate` from a template component (which is only 13 lines and renders `<h1>Welcome, {firstName}!</h1>` — not a forgot-password email body, despite the file name). The handler accepts no body, has no `currentUser()` check, no role check, and no rate limit.
- Impact: A live production route that promises to send an email and never does. Anyone POSTing to `/api/send` gets `{ message: "Email sent" }` even though nothing was sent. Combined with the dead `EmailTemplate` import, this is a fork-specific regression where the original Resend integration was partially removed but the route was kept. It is also a primary-student adaptation risk if a parent-facing flow (e.g., parent email verification) is wired to this endpoint.
- Recommendation: Either (a) delete `app/api/send/route.ts` entirely (the inventory entry, the file, and any caller references), or (b) implement the route properly with `await currentUser()`, an explicit role check (typically `SYSTEM` or `ADMIN`), a Zod-validated body (`{ to: z.string().email(), template: z.enum([...]), data: z.object({...}) }`), and a real Resend call. Document the choice in `fork-divergence.md`.

### LR-primary-advantage-017-012 — Catch block returns `{ error }` but `error` is not in scope

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/send/route.ts:18-20`
- Evidence: Lines 18-20 read `} catch (error) { return Response.json({ error }, { status: 500 }); }`. The shorthand property `{ error }` reads the `error` binding from the catch parameter, which IS defined — but it is the raw `unknown` value. Worse, lines 6-15 are entirely commented out, so the `try` block on line 5 is empty until line 17, which always succeeds. The catch branch can therefore only fire on a future implementation, and the `unknown` body would be serialized to `{}` by `Response.json` (which calls `JSON.stringify` on an `unknown` that has no enumerable properties).
- Impact: When this stub is eventually fleshed out, error responses will be `{}` with status 500 — the client receives an empty body. That is a fork-specific regression and also a primary-student UX risk because the UI cannot tell whether the email was sent or failed. Combined with finding LR-017-011, the entire route is a time bomb.
- Recommendation: When re-implementing, replace `Response.json({ error })` with `Response.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })`. Use `unknown` narrowing (the modern style) rather than `error: any`. If the route stays a stub, delete it.

### LR-primary-advantage-017-013 — `/api/students/[id]/assignments` has no authentication or role check

- Severity: Critical
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/students/[id]/assignments/route.ts:1-9`
- Evidence: Lines 4-9 forward the request and path parameter directly to `fetchStudentAssignments` (`server/controllers/assignmentController.ts:264-298`). The controller itself does NOT call `currentUser()` and does NOT verify the caller. It parses query params (line 273-277) and immediately calls `getStudentAssignments({ studentId: id, page, limit, status, dueDateFilter, search })`. The result includes assignment titles, descriptions, due dates, classroom IDs, article IDs, and student assignment statuses.
- Impact: Any unauthenticated HTTP client can `GET /api/students/<any-id>/assignments` and read another student's assignments. Worse, this includes pending/unread assignments the student has not yet seen, which leaks curriculum timing. Combined with the per-classroom discovery elsewhere in this batch, a primary student's reading schedule can be reconstructed from the outside. This is a primary-student adaptation risk and a regulatory concern (data minimization).
- Recommendation: Add `await currentUser()` at the top of `fetchStudentAssignments`. Verify the caller is allowed to read the student's assignments: the student themselves (id matches), or a teacher in a classroom that contains the student, or a system/admin role. Return 403 with a structured `{ error: "Forbidden" }` body otherwise.

### LR-primary-advantage-017-014 — Student PUT/DELETE controllers allow any admin to mutate cross-tenant students

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/students/[id]/route.ts:17-29`
- Evidence: Lines 17-29 delegate to `updateStudentController` and `deleteStudentController` (`studentController.ts:239-351`). Both controllers call `currentUser()` and `checkAdminPermissions(userWithRoles)` (`studentController.ts:260-265`, `:321-326`). `checkAdminPermissions` (`server/utils/auth.ts:99-117`) returns true for SYSTEM, ADMIN, or SCHOOL_ADMIN. For a SCHOOL_ADMIN, the role check passes regardless of which school the target student belongs to. The student model (`studentModel.ts`) is then expected to scope the read/write by `userWithRoles.schoolId`, but the controller does not verify the school match before calling `updateStudent(id, ...)` / `deleteStudent(id, ...)`.
- Impact: A SCHOOL_ADMIN of school A can mutate or delete a student record of school B by passing `id=<school-B-student>` in the URL. The route is a thin wrapper (lines 17-29) so the bug is inherited from the controller/model, but the route layer offers no defense. This is a primary-student adaptation risk because a school admin could accidentally (or maliciously) delete a student record and wipe their progress data.
- Recommendation: Verify in the route layer (or in the controller) that `userWithRoles.schoolId === targetStudent.schoolId` for non-SYSTEM callers before issuing the update/delete. Return 403 with `{ error: "Forbidden - cross-tenant write" }`. SYSTEM users should be the only path that bypasses the schoolId check.

### LR-primary-advantage-017-015 — `/api/teachers/assignments` has no authentication or role check

- Severity: Critical
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/teachers/assignments/route.ts:1-6`
- Evidence: Lines 1-6 delegate to `fetchAssignments` (`server/controllers/assignmentController.ts:26-262`). The controller function has NO `currentUser()` call, NO role check, and NO tenant scoping. It reads `classroomId`, `articleId`, `assignmentId`, `search`, `page`, `limit` from the query string and queries the `assignments`, `articles`, `classrooms`, and `studentAssignments` tables directly. With no params, it lists ALL assignments across ALL classrooms. With `?classroomId=<id>`, it scopes to that classroom but does not verify the caller has access to that classroom.
- Impact: Any unauthenticated HTTP client can `GET /api/teachers/assignments` and read every assignment in the database — including titles, descriptions, due dates, the articles they reference, the classrooms they belong to, and the per-student assignment rows (with studentIds and statuses). The same is true for `/api/teachers/assignments?classroomId=<id>` for any classroom ID guessed or enumerated. This is the most severe finding in this batch — the entire school's assignment graph is leaked to anonymous clients.
- Recommendation: Add `await currentUser()` at the top of `fetchAssignments` (`assignmentController.ts:26`). Enforce role: teachers can read their own classrooms' assignments, admins can read their school's, system can read all. Add a `where` clause that limits the result set to the caller's school or classrooms. Return 401/403 with structured errors.

## No-Finding Notes

- `apps/primary-advantage/app/api/students/leaderboard/route.ts`: reviewed line-by-line (1-46). The handler derives `schoolId` from the authenticated user's `users.schoolId` (lines 15-18), which is the correct multi-tenant pattern. Auth gate is on lines 9-12. No findings.
- `apps/primary-advantage/app/api/students/route.ts`: reviewed line-by-line (1-15). Thin wrapper delegating to `getStudentsController` and `createStudentController` (`studentController.ts`), which both perform `currentUser()` and `checkAdminPermissions` checks. No findings at the route layer.
- `apps/primary-advantage/app/api/teachers/[id]/route.ts`: reviewed line-by-line (1-30). Thin wrapper delegating to `getTeacherByIdController`, `updateTeacherController`, `deleteTeacherController` (`teacherController.ts`), which all perform `currentUser()` and `checkAdminPermissions` checks. No findings at the route layer. (Cross-tenant mutation risk on the underlying controllers is captured in finding LR-017-014 by analogy.)

## Summary

- Total findings: 15 (3 Critical, 5 High, 3 Medium, 4 Low — verified by per-finding severity count; per-file column totals also sum to 5+2+3+2+1+1+0+0+0+1 = 15).
- Critical-severity findings: LR-006 (cross-tenant leaderboard read), LR-013 (`/api/students/[id]/assignments` no auth), LR-015 (`/api/teachers/assignments` no auth).
- Highest-impact fork-divergence categories for this batch: `Primary-student adaptation risk` (cross-tenant leaderboard leak, unauthenticated assignment reads, school-bypass on admin mutation), `Fork-specific regression` (`as any` casts on Drizzle inserts, dead stub on `/api/send`, single-secret gate on `POST /api/schools/ranking`).
- No source-code, plan.md, or `line-review-coverage.tsv` edits were made. The patch TSV is written under `line-review/coverage-patches/primary-advantage-017.tsv` and the evidence is in this file.