# Line Review: ra-batch-10

> **Track:** `reading_advantage_full_review_20260626`
> **Reviewer:** Measure Review C (UX and API end-to-end contract)
> **Date:** 2026-06-27
> **Baseline SHA:** 6921fda0ee45012232bdd71c444d4e9523a10ab6
> **Batch:** ra-batch-10 (20 files: classroom OAuth2, classroom routes, classroom students/teachers/XP, demo endpoints)

---

## Coverage

| Category | Files | Lines Reviewed |
|----------|-------|----------------|
| Classroom OAuth2 (callback, courses, link, unlink) | 5 | 350 |
| Classroom main route | 1 | 42 |
| Classroom students (list, enroll, unenroll, [studentId]) | 4 | 142 |
| Classroom assignment-notifications (acknowledge, check, unread) | 3 | 89 |
| Classroom teachers | 1 | 38 |
| Classroom XP (chart, custom-range, per-students) | 3 | 85 |
| Demo endpoints (accounts, refresh, status) | 3 | 227 |
| **Total** | **20** | **973** |

---

## Findings

### F-RA-B10-001: Google OAuth2 Callback Stores Tokens Without App Session Authentication

**Severity:** Critical
**Category:** Auth / API Contract
**Files:**
- `apps/reading-advantage/app/api/v1/classroom/oauth2/callback/route.ts`

**Evidence (lines 5-48):**

```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json({ error: "Google Oauth Error :" + error });
    // ^^^ No HTTP status code on error response (defaults to 200)
  }

  if (!code) {
    return NextResponse.json({ error: "Authorization code not found" });
    // ^^^ No HTTP status code (defaults to 200)
  }

  try {
    const { tokens } = await oauth2Client.getToken(code as string);

    const cookieStore = await cookies();
    cookieStore.set({
      name: "google_access_token",
      value: tokens.access_token || "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 3600,
    });
    cookieStore.set({
      name: "google_refresh_token",
      value: tokens.refresh_token || "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    const lastUrl = cookieStore.get("last_url")?.value || "/teacher/my-classes";
    return NextResponse.redirect(
      new URL(lastUrl, process.env.NEXT_PUBLIC_BASE_URL).toString()
    );
  } catch (error) {
    return NextResponse.json({
      error: "Google Oauth Error failed to exchange code:" + error,
    });
    // ^^^ No HTTP status code (defaults to 200); exposes raw error object
  }
}
```

**Impact:**
- The callback handler stores Google access and refresh tokens without verifying the user is authenticated to the app. Any HTTP request with a valid OAuth authorization code can store tokens — no session cookie check, no CSRF protection.
- Error responses at lines 11, 15, and 45 return HTTP 200 with error messages, violating API contract expectations (clients checking `response.ok` will not detect errors).
- Line 19: `code as string` cast is redundant since the `!code` guard already returned if null — but the cast suggests the type system doesn't narrow properly.
- Line 42: `process.env.NEXT_PUBLIC_BASE_URL` used in redirect URL construction without validation. If this env var is undefined or attacker-controlled, the redirect could leak the authorization code to an arbitrary origin.

**Recommendation:**
1. Verify app session (call `getCurrentUser()`) before processing the callback.
2. Add CSRF `state` parameter to the OAuth2 authorization URL and validate it in the callback.
3. Return proper HTTP status codes (400 for missing code/error, 500 for token exchange failure).
4. Validate `NEXT_PUBLIC_BASE_URL` against an allowlist or use `req.nextUrl.origin`.

---

### F-RA-B10-002: Google OAuth2 Courses Endpoints Have No Session Auth — Rely Only on Google Tokens

**Severity:** High
**Category:** Auth / Integration Wiring
**Files:**
- `apps/reading-advantage/app/api/v1/classroom/oauth2/classroom/courses/route.ts`
- `apps/reading-advantage/app/api/v1/classroom/oauth2/classroom/courses/[courseId]/route.ts`

**Evidence (courses/route.ts, lines 9-13):**

```typescript
export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get("google_access_token")?.value;
  const refreshToken = req.cookies.get("google_refresh_token")?.value;
  // ^^^ No app session check — only checks for Google OAuth tokens in cookies
```

**Evidence (courses/[courseId]/route.ts, lines 23-28):**

```typescript
  /* eslint-disable-next-line no-unreachable */
  const { courseId } = await ctx.params;
  const accessToken = req.cookies.get("google_access_token")?.value;
  const refreshToken = req.cookies.get("google_refresh_token")?.value;
  // ^^^ Dead code behind early return; same pattern — no app session check
```

**Impact:**
- Both Google Classroom API endpoints rely solely on Google OAuth tokens stored in cookies. No app session authentication (`getCurrentUser()`) is performed.
- If a user logs out of the app but their Google OAuth cookies remain (maxAge: 30 days for refresh token), the Google Classroom endpoints remain accessible without app authentication.
- The `[courseId]/route.ts` file is entirely dead code (returns 501 before any logic) but still imports Firestore (`db` from `@/configs/firestore-config`), which was removed. The import will fail at runtime if the file is ever loaded.
- Error responses in both files expose raw error objects: `details: error` at lines 100 and 136 of `[courseId]/route.ts`.

**Recommendation:**
1. Add app session authentication to all Google Classroom endpoints.
2. Remove dead code behind the 501 return or complete the Firestore→Drizzle migration.
3. Sanitize error responses — never expose raw error objects to clients.

---

### F-RA-B10-003: OAuth2 Link Endpoint Silently Swallows Errors and Returns Success

**Severity:** Medium
**Category:** API Contract / Error Handling
**Files:**
- `apps/reading-advantage/app/api/v1/classroom/oauth2/link/route.ts`

**Evidence (lines 7-34):**

```typescript
export async function GET(req: NextRequest) {
  try {
    // ... generates authUrl and sets cookies ...
    return NextResponse.json({ authUrl }, { status: 200 });
  } catch (error) {
    console.error("Error getting last URL:", error);
    // ^^^ Error is logged but not returned to the caller
  }

  return NextResponse.json({ message: "Cookies removed" });
  // ^^^ This line runs if the try block throws — returns a success-like
  //     message about "Cookies removed" when the actual operation failed
}
```

**Impact:**
- If `generateAuthUrl()` or `cookies().set()` throws, the catch block logs the error and falls through to return `{ message: "Cookies removed" }` with HTTP 200. The client receives a success response when the operation actually failed.
- The response message "Cookies removed" is misleading — the link endpoint's purpose is to initiate an OAuth flow, not to remove cookies.

**Recommendation:**
1. Return a proper error response from the catch block (e.g., 500 with error message).
2. Use a contextually appropriate response message.
3. Add app session authentication (same as F-RA-B10-002).

---

### F-RA-B10-004: OAuth2 Unlink Endpoint Missing Security Flags on Cookie Clearing

**Severity:** Low
**Category:** Auth / Security Hygiene
**Files:**
- `apps/reading-advantage/app/api/v1/classroom/oauth2/unlink/route.ts`

**Evidence (lines 4-18):**

```typescript
export async function GET() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "google_access_token",
    value: "",
    path: "/",
    maxAge: 0,
    // ^^^ Missing httpOnly and secure flags
  });

  cookieStore.set({
    name: "google_refresh_token",
    value: "",
    path: "/",
    maxAge: 0,
    // ^^^ Missing httpOnly and secure flags
  });
```

**Impact:**
- When setting cookies in the callback (line 22-37 of callback/route.ts), `httpOnly: true` and `secure: production` are set. But when unlinking (clearing) the cookies, those flags are omitted. In strict cookie environments, this could result in the clear operation not fully removing the original cookie.
- The endpoint also has no session auth check — anyone can clear the Google OAuth cookies.

**Recommendation:**
1. Include `httpOnly` and `secure` flags matching the original cookie settings when clearing.
2. Add app session authentication.

---

### F-RA-B10-005: Classroom Students/Teachers XP Routes Expose Dead PATCH Handlers

**Severity:** Medium
**Category:** API Contract / Dead Code
**Files:**
- `apps/reading-advantage/app/api/v1/classroom/students/route.ts` (line 30)
- `apps/reading-advantage/app/api/v1/classroom/teachers/route.ts` (line 30)

**Evidence (students/route.ts, lines 30-37):**

```typescript
export async function PATCH(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  // Handle the case where result is not a NextResponse
  throw new Error("Expected a NextResponse from router.run");
}
```

**Impact:**
- Both `students/route.ts` and `teachers/route.ts` export a `PATCH` handler, but no PATCH handler is registered on the router (`router.get(...)` only). A PATCH request to these endpoints will call `router.run()`, which has no PATCH handler registered, causing an unhandled error or unexpected behavior.
- The PATCH export creates a false contract — clients or API docs may assume PATCH is supported.

**Recommendation:**
1. Either register PATCH handlers on the router or remove the dead PATCH exports.
2. If PATCH is intentionally unsupported, the route should return 405 Method Not Allowed.

---

### F-RA-B10-006: Classroom `getStudentInClassroom` and `getClassXpPerStudents` Skip Auth Check

**Severity:** High
**Category:** Auth / Tenant Scoping
**Files:**
- `apps/reading-advantage/server/controllers/classroom-controller.ts` (lines 704-754, 1233-1281)

**Evidence (getStudentInClassroom, line 704):**

```typescript
export async function getStudentInClassroom(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ classroomId: string }> }
) {
  const { classroomId } = await ctx.params;
  // ^^^ No call to getCurrentUser() — no authentication
  // ^^^ No authorization check — any authenticated user can query any classroomId
  try {
    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);
    // ^^^ Direct DB access, no tenant/school scoping
```

**Evidence (getClassXpPerStudents, line 1233):**

```typescript
export async function getClassXpPerStudents(req: NextRequest, ctx: RequestContext) {
  try {
    const params = await ctx.params;
    const classroomId = params?.classroomId;
    // ^^^ No call to getCurrentUser() — no authentication
    // ^^^ No authorization check
    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);
    // ^^^ Direct DB access, no tenant/school scoping
```

**Impact:**
- Both functions accept a `classroomId` parameter and query the database without any authentication or authorization check. Any user with a valid session (from the `protect` middleware in the route file) can access any classroom's student data or XP data by guessing or knowing the classroom ID.
- `getStudentInClassroom` returns student PII (names, emails) for any classroom.
- `getClassXpPerStudents` returns XP data for all students in any classroom.
- No tenant/school scoping means cross-school data leakage is possible.

**Recommendation:**
1. Add `getCurrentUser()` check at the start of both functions.
2. Verify the requesting user is the classroom teacher/co-teacher or an admin for the classroom's school.
3. Add school/license scoping to prevent cross-tenant data access.

---

### F-RA-B10-007: `getClassroomTeacher` Returns All Teachers Globally Without Auth or Tenant Scoping

**Severity:** High
**Category:** Auth / Tenant Scoping
**Files:**
- `apps/reading-advantage/server/controllers/classroom-controller.ts` (lines 770-781)

**Evidence:**

```typescript
export async function getClassroomTeacher(req: ExtendedNextRequest) {
  try {
    const teachers = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, updatedAt: users.updatedAt })
      .from(users)
      .where(eq(users.role, "TEACHER" as any));
    // ^^^ No getCurrentUser() call — no authentication
    // ^^^ Returns ALL teachers globally — no license/school scoping

    return NextResponse.json({ teachers }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error }, { status: 500 });
    // ^^^ Exposes raw error object
  }
}
```

**Impact:**
- This function queries and returns every user with the TEACHER role across the entire database. No session check, no license/school scoping.
- Returns teacher emails and names — PII exposure at scale.
- The `restrictAccess` middleware is commented out in the route file (teachers/route.ts line 16), so even if it were implemented, it wouldn't apply.

**Recommendation:**
1. Add `getCurrentUser()` and verify the user has a teaching role.
2. Scope results to the user's license/school.
3. Remove the `as any` cast on the role comparison.

---

### F-RA-B10-008: `getClassXp` Has No Auth Check — Accepts licenseId from Query Params

**Severity:** High
**Category:** Auth / Tenant Scoping / API Contract
**Files:**
- `apps/reading-advantage/server/controllers/classroom-controller.ts` (lines 987-1085)

**Evidence:**

```typescript
export async function getClassXp(req: NextRequest) {
  // ^^^ No ExtendedNextRequest — no session access
  // ^^^ No getCurrentUser() call
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const licenseId = searchParams.get("licenseId");
    // ^^^ licenseId comes from query parameters — any user can query any license

    // ... queries licenseOnUsers, classrooms, xpLogs using the supplied licenseId ...
```

**Impact:**
- Any authenticated user (the route has `protect` middleware) can pass any `licenseId` as a query parameter and retrieve XP data for all classrooms and students associated with that license.
- No verification that the requesting user has access to the specified license.
- The XP data includes per-classroom student activity — sensitive educational data.

**Recommendation:**
1. Add `getCurrentUser()` check and verify the user's own license matches the requested licenseId.
2. For SYSTEM role, allow cross-license queries. For ADMIN/TEACHER, scope to own license.
3. Add Zod validation for the `year` and `licenseId` query parameters.

---

### F-RA-B10-009: `achivedClassroom` and `deleteClassroom` Lack Ownership Verification

**Severity:** High
**Category:** Auth / Tenant Scoping
**Files:**
- `apps/reading-advantage/server/controllers/classroom-controller.ts` (lines 855-906)

**Evidence (achivedClassroom, lines 855-870):**

```typescript
export async function achivedClassroom(req: ExtendedNextRequest, ctx: RequestContext) {
  const { classroomId } = await ctx.params;
  // ^^^ No getCurrentUser() — no auth check
  try {
    const { archived } = await req.json();
    // ^^^ No Zod validation on input
    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);
    if (!classroom) return NextResponse.json({ message: "Classroom not found" }, { status: 404 });
    await db.update(classrooms).set({ archived, updatedAt: new Date() }).where(eq(classrooms.id, classroomId));
    // ^^^ No ownership check — any user can archive any classroom
```

**Evidence (deleteClassroom, lines 893-906):**

```typescript
export async function deleteClassroom(req: ExtendedNextRequest, ctx: RequestContext) {
  const { classroomId } = await ctx.params;
  // ^^^ No getCurrentUser() — no auth check
  const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);
  if (!classroom) return NextResponse.json({ message: "Classroom not found" }, { status: 404 });
  await db.delete(classrooms).where(eq(classrooms.id, classroomId));
  // ^^^ Destructive operation with no ownership/authorization check
```

**Impact:**
- Both functions perform destructive operations (archive, delete) without any authentication or authorization check.
- Any authenticated user can archive or delete any classroom in the system by knowing its ID.
- `deleteClassroom` cascades a hard delete with no soft-delete safety net.
- No audit logging for these destructive operations.

**Recommendation:**
1. Add `getCurrentUser()` and verify ownership (classroom.teacherId === user.id) or ADMIN/SYSTEM role.
2. Use soft-delete (set archived=true) instead of hard-delete for classrooms.
3. Add audit logging for destructive classroom operations.
4. Add Zod validation for input.

---

### F-RA-B10-010: `patchClassroomEnroll` / `patchClassroomUnenroll` Skip Ownership and Tenant Checks

**Severity:** High
**Category:** Auth / Tenant Scoping
**Files:**
- `apps/reading-advantage/server/controllers/classroom-controller.ts` (lines 908-985)

**Evidence (patchClassroomEnroll, lines 908-957):**

```typescript
export async function patchClassroomEnroll(req: ExtendedNextRequest, ctx: RequestContext) {
  const { classroomId } = await ctx.params;
  // ^^^ No getCurrentUser() — no auth check
  try {
    const json = await req.json();
    const newStudents = z.array(studentSchema).parse(json.student);
    // ^^^ Zod validation present on input — good

    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);
    if (!classroom) return NextResponse.json({ message: "Classroom not found" }, { status: 404 });

    for (const student of newStudents) {
      // ^^^ No check that the student belongs to the same school/license
      // ^^^ No check that the requesting user owns the classroom
      await db.insert(classroomStudents).values({ classroomId, studentId: student.studentId }).onConflictDoNothing();
    }
```

**Impact:**
- Any authenticated user can enroll any student into any classroom by providing the classroomId and studentId.
- No verification that the requesting user is the classroom teacher/co-teacher.
- No verification that the student belongs to the same school/license as the classroom.
- This enables cross-tenant student enrollment — a student from School A could be enrolled in School B's classroom.

**Recommendation:**
1. Add `getCurrentUser()` and verify classroom ownership or co-teacher status.
2. Verify the student's schoolId/licenseId matches the classroom's schoolId/licenseId.
3. Add audit logging for enrollment changes.

---

### F-RA-B10-011: Demo Accounts Endpoint Exposes Hardcoded Credentials Without Authentication

**Severity:** Medium
**Category:** API Contract / Security Hygiene
**Files:**
- `apps/reading-advantage/app/api/v1/demo/accounts/route.ts`

**Evidence (lines 3-75):**

```typescript
const DEMO_ACCOUNTS = {
  students: [
    { email: "demo-student-a1@reading-advantage.com", password: "demo123", level: "A1", name: "Alex Anderson (A1)" },
    { email: "demo-student-a2@reading-advantage.com", password: "demo123", level: "A2", name: "Beth Brown (A2)" },
    // ... 6 student accounts, 1 teacher, 1 admin — all with password "demo123"
  ],
  // ...
};

export async function GET() {
  // ^^^ No authentication required
  return NextResponse.json({ success: true, data: DEMO_ACCOUNTS, message: "Demo accounts retrieved successfully" });
}
```

**Impact:**
- 8 demo account emails and passwords are exposed via an unauthenticated endpoint.
- The admin account credentials (`demo-admin@reading-advantage.com` / `demo123`) could be used to gain admin access if the accounts exist in the database.
- While these are "demo" accounts, if they map to real database records, they represent a credential exposure risk.
- No rate limiting on this endpoint.

**Recommendation:**
1. Remove hardcoded passwords from the response or from the source code entirely.
2. If demo accounts must be exposed, require at minimum an access key or session auth.
3. Ensure demo accounts are isolated from production data (the demo-isolation-service exists but is not used by this endpoint).

---

### F-RA-B10-012: Demo Refresh Endpoint Executes Shell Commands with Only Access-Key Auth

**Severity:** High
**Category:** Security / Integration Wiring
**Files:**
- `apps/reading-advantage/app/api/v1/demo/refresh/route.ts`

**Evidence (lines 24-52):**

```typescript
async function refreshDemoData(req: NextRequest) {
  try {
    console.log("[Demo Refresh] Starting demo data refresh...");
    const { stdout, stderr } = await execAsync("npm run db:seed:demo", {
      cwd: process.cwd(),
    });
    // ^^^ Executes a shell command — potential command injection vector
    // ^^^ Access key from header is the only auth (restrictAccessKey middleware)
    // ^^^ No rate limiting

    return NextResponse.json({
      message: "Demo data refreshed successfully",
      output: stdout,
      // ^^^ Returns raw stdout from shell command in response
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to refresh demo data",
        details: error instanceof Error ? error.message : String(error),
        // ^^^ Returns error details including possible stack traces
      },
      { status: 500 }
    );
  }
}
```

**Impact:**
- The endpoint executes a shell command (`npm run db:seed:demo`) using `exec()`. While the command is hardcoded (not user-controlled), the `exec()` function spawns a shell, which is a risk pattern.
- Authentication is via a single `Access-Key` header checked against `process.env.ACCESS_KEY`. If this env var is weak or leaked, anyone can trigger database re-seeding.
- The response includes raw `stdout` from the command execution, which could leak internal system paths, database credentials, or other sensitive information.
- No rate limiting — repeated calls could cause database contention or denial of service.

**Recommendation:**
1. Replace `exec()` with `execFile()` to avoid shell interpretation.
2. Use a more robust authentication mechanism (session + role check).
3. Never return raw command output to the client.
4. Add rate limiting.
5. Add audit logging for this privileged operation.

---

### F-RA-B10-013: Demo Status Endpoint Queries Database Without Authentication or Tenant Scoping

**Severity:** Medium
**Category:** Auth / Tenant Scoping
**Files:**
- `apps/reading-advantage/app/api/v1/demo/status/route.ts`

**Evidence (lines 10-89):**

```typescript
export async function GET() {
  // ^^^ No authentication required
  try {
    const demoIds = await getDemoIds();
    if (!demoIds) {
      return NextResponse.json({ success: false, error: "Demo system not initialized." }, { status: 404 });
    }
    const { licenseId, schoolId } = demoIds;

    const lastActivityRows = await db
      .select({ createdAt: userActivity.createdAt })
      .from(userActivity)
      .innerJoin(users, eq(users.id, userActivity.userId))
      .where(eq(users.licenseId, licenseId))
      .orderBy(desc(userActivity.createdAt))
      .limit(1);

    const totalActivitiesRows = await db
      .select({ value: count() })
      .from(userActivity)
      .innerJoin(users, eq(users.id, userActivity.userId))
      .where(eq(users.licenseId, licenseId));

    const userCounts = await db
      .select({ role: users.role, count: count() })
      .from(users)
      .where(eq(users.licenseId, licenseId))
      .groupBy(users.role);

    return NextResponse.json({
      success: true,
      data: {
        licenseId,
        schoolId,
        // ^^^ Returns internal IDs to unauthenticated caller
        lastRefresh: lastActivity?.createdAt ?? null,
        nextRefresh: nextRefresh.toISOString(),
        totalActivities,
        users: userCounts.reduce(/* ... */),
        isolationStatus: "OK",
        // ^^^ Hardcoded "OK" — actual isolation check not performed
      },
    });
```

**Impact:**
- No authentication required — any HTTP request can query demo system status.
- Returns internal `licenseId` and `schoolId` to unauthenticated callers, leaking infrastructure identifiers.
- Direct DB access via `db` from `@reading-advantage/db` — bypasses domain layer.
- The `isolationStatus: "OK"` is hardcoded rather than actually calling `runAllIsolationChecks()` from the demo-isolation-service. The isolation service exists but is unused by this endpoint.
- No tenant scoping — the query uses the demo licenseId but doesn't enforce school-level isolation.

**Recommendation:**
1. Add authentication (at minimum, session check or access key).
2. Remove internal IDs from the response or require auth to view them.
3. Actually run isolation checks from the demo-isolation-service instead of hardcoding "OK".
4. Route through the domain layer instead of direct DB access.

---

### F-RA-B10-014: `restrictAccess` Middleware Commented Out Across Classroom Routes

**Severity:** Medium
**Category:** Auth / User-Facing Flow Consistency
**Files:**
- `apps/reading-advantage/app/api/v1/classroom/route.ts` (line 19)
- `apps/reading-advantage/app/api/v1/classroom/students/[studentId]/route.ts` (line 21)
- `apps/reading-advantage/app/api/v1/classroom/students/route.ts` (line 16)
- `apps/reading-advantage/app/api/v1/classroom/teachers/route.ts` (line 16)

**Evidence (classroom/route.ts, lines 17-22):**

```typescript
router.use(logRequest);
router.use(protect);
// router.use(restrictAccess);

router.get(getClassroom) as any;
router.post(createdClassroom) as any;
```

**Impact:**
- Four classroom route files have `restrictAccess` commented out in the middleware chain. This middleware was presumably intended to perform role-based or ownership-based access control beyond the basic session check (`protect`).
- Without `restrictAccess`, all authenticated users (including STUDENTs) can access teacher/admin endpoints like listing all students, creating classrooms, etc.
- The `protect` middleware only verifies a session exists — it does not check roles or resource ownership.

**Recommendation:**
1. Either implement and enable `restrictAccess` or remove the commented-out code.
2. If role-based access is needed, use `restrictTo` (which exists in auth-controller.ts) with appropriate roles.
3. Document which roles are authorized for each endpoint.

---

### F-RA-B10-015: Inconsistent Error Response Shapes Across Classroom and Demo Endpoints

**Severity:** Medium
**Category:** API Contract / User-Facing Flow Consistency
**Files:** All 20 files in batch

**Evidence:**

| Endpoint | Error Shape | HTTP Status |
|----------|-------------|-------------|
| OAuth2 callback | `{ error: string }` | 200 (should be 400/500) |
| OAuth2 courses | `{ error: string, details: object }` | 500 |
| OAuth2 link | `{ message: "Cookies removed" }` | 200 (on error) |
| OAuth2 unlink | `{ message: string }` | 200 |
| Classroom route | `{ error: string }` or `{ message: string }` | 401/500 |
| Student classroom | `{ message: string }` or `{ error }` | 200/401/404/500 |
| Enroll | `{ messages: string }` or `{ error }` | 401/404/501 |
| Teachers | `{ message: string }` | 500 |
| XP chart | `{ message: string }` | 400/404/500 |
| Demo accounts | `{ success, data, message }` | 200 |
| Demo refresh | `{ message }` or `{ error, details }` | 200/500 |
| Demo status | `{ success, data, message }` or `{ success, error }` | 200/404/500 |

**Impact:**
- At least 6 distinct error response shapes exist across these 20 files.
- Some use `error`, some use `message`, some use `success: false`, some use `messages` (typo).
- HTTP status codes are inconsistent: errors return 200 in multiple places (OAuth2 callback, link).
- The `messages` (plural) typo in enroll/unenroll suggests copy-paste errors.
- Clients cannot reliably detect errors by checking a consistent field.

**Recommendation:**
1. Adopt a single error response schema: `{ error: { code: string, message: string } }` or similar.
2. Use correct HTTP status codes (400 for bad input, 401 for unauthenticated, 403 for forbidden, 404 for not found, 500 for server error).
3. Fix the `messages` typo to `message`.

---

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 1 | F-RA-B10-001 |
| High | 6 | F-RA-B10-002, F-RA-B10-006, F-RA-B10-007, F-RA-B10-008, F-RA-B10-009, F-RA-B10-010, F-RA-B10-012 |
| Medium | 6 | F-RA-B10-003, F-RA-B10-005, F-RA-B10-011, F-RA-B10-013, F-RA-B10-014, F-RA-B10-015 |
| Low | 1 | F-RA-B10-004 |
| **Total** | **15** | |

### Key Themes

1. **OAuth2 endpoints lack app session authentication** (F-RA-B10-001, F-RA-B10-002, F-RA-B10-003, F-RA-B10-004): The Google OAuth2 flow stores/manages tokens without verifying the user is authenticated to the Reading Advantage app. This creates a parallel authentication surface that bypasses the app's session system.

2. **Missing auth checks in controller functions** (F-RA-B10-006, F-RA-B10-007, F-RA-B10-008, F-RA-B10-009, F-RA-B10-010): Multiple classroom controller functions skip `getCurrentUser()` entirely, relying solely on the `protect` middleware in the route files. But `protect` only checks session existence — it does not verify resource ownership, role, or tenant scope.

3. **No tenant/school scoping** (F-RA-B10-007, F-RA-B10-008, F-RA-B10-010, F-RA-B10-013): Queries use `licenseId` from query params or user session without verifying the requesting user has access to that license/school. Cross-tenant data leakage is possible.

4. **Demo endpoints expose credentials and execute commands** (F-RA-B10-011, F-RA-B10-012, F-RA-B10-013): Demo endpoints have minimal or no authentication, expose hardcoded passwords, execute shell commands, and query the database without tenant scoping.

5. **Inconsistent API contracts** (F-RA-B10-015): Error responses use at least 6 different shapes, HTTP status codes are often incorrect (200 on errors), and typos exist in response field names.

---

*No acceptance claims. This is a review-only report.*
