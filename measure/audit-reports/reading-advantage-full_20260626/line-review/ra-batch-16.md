# Line-by-Line Review — ra-batch-16

**Batch:** ra-batch-16  
**Date:** 2026-06-27  
**Baseline SHA:** d348666be047b929d02c747120c32d2ea0fc53bc  
**Scope:** 20 route.ts files under `apps/reading-advantage/app/api/v1/`  
**Reviewer:** Measure Review B — security and data handling

---

## Files Reviewed

| # | File | Lines |
|---|------|-------|
| 1 | `teacher/classes/route.ts` | 27 |
| 2 | `teacher/classroom/[classroomId]/goals/[goalId]/route.ts` | 49 |
| 3 | `teacher/classroom/[classroomId]/goals/route.ts` | 48 |
| 4 | `teacher/overview/route.ts` | 27 |
| 5 | `telemetry/dashboard/route.ts` | 168 |
| 6 | `users/[id]/activity-data/route.ts` | 25 |
| 7 | `users/[id]/activitylog/route.ts` | 53 |
| 8 | `users/[id]/reset-all-progress/route.ts` | 24 |
| 9 | `users/[id]/route.ts` | 28 |
| 10 | `users/[id]/student-data/route.ts` | 25 |
| 11 | `users/[id]/xp-logs/route.ts` | 25 |
| 12 | `users/assignments/route.ts` | 25 |
| 13 | `users/ranking/[id]/route.ts` | 27 |
| 14 | `users/ranking/route.ts` | 24 |
| 15 | `users/records/[id]/route.ts` | 37 |
| 16 | `users/route.ts` | 61 |
| 17 | `users/sentences/[id]/route.ts` | 52 |
| 18 | `users/vocabularies/[id]/route.ts` | 54 |
| 19 | `users/wordlist/[id]/route.ts` | 53 |
| 20 | `xp/[userId]/route.ts` | 24 |

**Total route surface:** 836 lines

---

## Architecture Summary

All 20 files are thin `next-connect` route handlers following a uniform pattern:

1. Create a `createEdgeRouter<NextRequest, RequestContext>()` instance
2. Register `logRequest` middleware (logs `${method} ${url}` to console)
3. Register `protect` middleware (checks session cookie → attaches `req.session.user`)
4. Register one or more controller handlers via `router.get/post/patch/delete(handler) as any`
5. Export named HTTP method functions that call `router.run(request, ctx)`

The **20 route files reference 8 controllers** (inspected for completeness):

| Controller | Routes using it |
|------------|-----------------|
| `teacher-dashboard-controller` | Files 1, 4 |
| `classroom-goals-controller` | Files 2, 3 |
| `user-controller` | Files 6–11, 15, 16, 20 |
| `assignment-controller` | File 12 |
| `leaderboard-controller` | Files 13, 14 |
| `flashcard-controller` | Files 17, 18, 19 |
| `license-controller` | File 20 |
| `auth-controller` (middleware only) | All 20 |

---

## Critical Findings

### CRIT-1: Telemetry endpoint is completely unauthenticated (File 5)

**File:** `apps/reading-advantage/app/api/v1/telemetry/dashboard/route.ts`  
**Lines:** 22–58

The `POST` handler has **no authentication middleware whatsoever**:

```typescript
// Line 22: No router.use(logRequest), no router.use(protect)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const events = TelemetryBatchSchema.parse(body);
  await processTelemetryEvents(events);
  // ...
}
```

- `logRequest` is imported but never applied
- `protect` is never imported
- Anyone can POST arbitrary telemetry events with any `userId` and `sessionId`
- Events include a `userId` field that is accepted without verification
- The endpoint accepts batches of arbitrary size (no rate limiting or size cap)

**Severity:** **HIGH** — Unauthenticated write endpoint accepting user-identifying data.

### CRIT-2: `getAllUsers` has no role check — any authenticated user can enumerate all users (File 16 → `user-controller.ts:812`)

**File:** `apps/reading-advantage/app/api/v1/users/route.ts` (line 19 routes to `getAllUsers`)

The controller function `getAllUsers` takes a plain `NextRequest` (not `ExtendedNextRequest`) and performs NO authorization check:

```typescript
// user-controller.ts:812
export async function getAllUsers(req: NextRequest) {
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
  // Returns ALL users with name, email, role, xp, level, cefrLevel, license info
}
```

- No `assertSelfOrAllowedStaff` call
- No role check
- No school/tenant scoping
- Returns sensitive PII (email, license data) for every user in the system

**Severity:** **HIGH** — Mass enumeration of all users with PII accessible to any authenticated user.

### CRIT-3: `resetUserProgress` has no authorization check — any authenticated user can wipe any user's data (File 8 → `user-controller.ts:1084`)

**File:** `apps/reading-advantage/app/api/v1/users/[id]/reset-all-progress/route.ts`

```typescript
// user-controller.ts:1084 — NO assertSelfOrAllowedStaff call!
export async function resetUserProgress(req: ExtendedNextRequest, ctx: RequestContext) {
  const { id } = await ctx.params;
  // deletes lessonRecords, userActivity, xpLogs, storyRecords, userWordRecords, userSentenceRecords
  // resets xp: 0, level: 0, cefrLevel: ""
}
```

Compare with `getUser` (same controller, line 63) which correctly calls `assertSelfOrAllowedStaff(req, routeId)`. The `resetUserProgress` function **omits this check entirely**.

**Severity:** **CRITICAL** — Destructive operation with zero authorization. Any authenticated user can irreversibly wipe any other user's progress data.

### CRIT-4: `getUserActivityData` has no authorization check (File 6 → `user-controller.ts:914`)

**File:** `apps/reading-advantage/app/api/v1/users/[id]/activity-data/route.ts`

```typescript
// user-controller.ts:914 — NO assertSelfOrAllowedStaff call!
export async function getUserActivityData(req: ExtendedNextRequest, ctx: RequestContext) {
  const { id } = await ctx.params;
  // Retrieves ALL user activity, XP progression, article details...
}
```

**Severity:** **HIGH** — Any authenticated user can view any user's complete activity history.

### CRIT-5: `getStudentData` has no authorization check (File 10 → `user-controller.ts:1036`)

**File:** `apps/reading-advantage/app/api/v1/users/[id]/student-data/route.ts`

```typescript
// user-controller.ts:1036 — NO assertSelfOrAllowedStaff call!
export async function getStudentData(req: ExtendedNextRequest, ctx: RequestContext) {
  const { id } = await ctx.params;
  // Returns name, email, role, xp, level, cefrLevel, licenseId, etc.
}
```

**Severity:** **HIGH** — Any authenticated user can retrieve any user's full profile.

### CRIT-6: `getUserXpLogs` has no authorization check (File 11 → `user-controller.ts:1127`)

**File:** `apps/reading-advantage/app/api/v1/users/[id]/xp-logs/route.ts`

```typescript
// user-controller.ts:1127 — NO assertSelfOrAllowedStaff call!
export async function getUserXpLogs(req: ExtendedNextRequest, ctx: RequestContext) {
  const { id } = await ctx.params;
  // Returns all XP logs for the given user
}
```

**Severity:** **MEDIUM** — Any authenticated user can view any user's XP history.

### CRIT-7: `updateUserData` has no role check — authenticated users can modify anyone's role (File 16 → `user-controller.ts:845`)

**File:** `apps/reading-advantage/app/api/v1/users/route.ts` (line 20 routes to `updateUserData`)

```typescript
// user-controller.ts:845
export async function updateUserData(req: ExtendedNextRequest) {
  const data = await req.json();
  // Looks up user by email, assigns license, updates role
  // NO assertSelfOrAllowedStaff
  // NO role check on the caller
  await db.update(users).set({
    role: data.role,   // <-- ANY authenticated user can change ANY user's role!
    // ...
  }).where(eq(users.id, user.id));
}
```

**Severity:** **CRITICAL** — Privilege escalation: any authenticated user can promote themselves (or anyone) to ADMIN, or downgrade admins to students.

### CRIT-8: `deleteUser` has no role check — any authenticated user can delete any user (File 16 → `user-controller.ts:1180`)

**File:** `apps/reading-advantage/app/api/v1/users/route.ts` (line 21 routes to `deleteUser`)

```typescript
// user-controller.ts:1180
export async function deleteUser(req: ExtendedNextRequest) {
  const { id } = await req.json();
  // Deletes classroomStudents linkage, then the user
  // NO authorization check whatsoever
}
```

**Severity:** **CRITICAL** — Any authenticated user can delete any other user.

### CRIT-9: `getLessonXp` has no session check — any authenticated user can query any user's XP (File 20 → `license-controller.ts:575`)

**File:** `apps/reading-advantage/app/api/v1/xp/[userId]/route.ts`

```typescript
// The route applies protect middleware BUT the controller accepts plain NextRequest:
// license-controller.ts:575
export const getLessonXp = async (req: NextRequest, ctx: Context) => {
  const { userId } = await ctx.params;
  // No session check, no assertSelfOrAllowedStaff
  // Any authenticated user can query any userId's XP data
}
```

The route file imports `getLessonXp` from `license-controller`, which takes `NextRequest` (not `ExtendedNextRequest`). The `protect` middleware sets `req.session` but the controller never reads it.

**Severity:** **MEDIUM** — Cross-user data access without authorization.

---

## High-Severity Findings

### HIGH-1: `getAllRankingLeaderboard` has no school/license scoping (File 14 → `leaderboard-controller.ts:19`)

Any authenticated user can see leaderboard data for ALL licenses/schools. The function iterates over `allLicenses` without filtering by the caller's school or license.

**Severity:** **HIGH** — Cross-tenant data leak; any authenticated user sees all schools' ranking data.

### HIGH-2: `getRankingLeaderboardById` has no authorization check (File 13 → `leaderboard-controller.ts:123`)

Any authenticated user can query rankings for any license ID, regardless of whether they belong to that school.

**Severity:** **HIGH** — Cross-tenant ranking data access.

### HIGH-3: `updateUser` allows role field mutation via raw body (File 9 → `user-controller.ts:106`)

```typescript
// user-controller.ts:117
const data = await req.json();
await db.update(users).set({
  role: data.role,  // Pass-through from request body!
  // ...
}).where(eq(users.id, id));
```

While `assertSelfOrAllowedStaff` checks that the caller is the user or ADMIN/TEACHER, the `updateUser` function **blindly applies any field from the request body**, including `role`. A student calling this on themselves (which `assertSelfOrAllowedStaff` allows since `sessionUser.id === routeUserId`) could escalate their own role to ADMIN.

The `assertSelfOrAllowedStaff` check at line 113 allows self-modification. Combined with a passthrough `role` field, this enables privilege escalation.

**Severity:** **HIGH** — Self-privilege-escalation via PATCH /api/v1/users/[own-id].

### HIGH-4: `handleRequest` throws unhandled Error (Files 8, 9, 20)

```typescript
// handle-request.ts:3-8
export async function handleRequest(router: any, request: NextRequest, ctx: ...): Promise<NextResponse> {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) return result;
  throw new Error("Expected a NextResponse from router.run");
}
```

If `router.run` returns a non-`NextResponse` value (e.g., due to a middleware returning `undefined`), this throws a raw `Error` that Next.js catches and returns as a 500 HTML error page rather than a JSON error response. This can leak internal details depending on Next.js error handling configuration.

**Severity:** **MEDIUM** — Improper error handling may expose stack traces; inconsistent response format.

---

## Medium-Severity Findings

### MED-1: `as any` type cast on every handler registration (All 20 files)

Every single controller registration uses `router.get(handler) as any`. This completely subverts TypeScript's type checking at the integration boundary between the router and controllers. Type mismatches, missing parameters, and wrong return types are invisible to the compiler.

**Example from file 9, line 21:**
```typescript
router.get(getUser) as any;
```

**Severity:** **MEDIUM** — Type safety gap at the most critical integration boundary. Not an immediate security vulnerability but eliminates a key defense layer.

### MED-2: No input validation at the route layer (All 20 files except file 5)

Only the telemetry endpoint (file 5) performs Zod validation on the request body. Every other route passes raw `req.json()` results directly to controllers with no:
- Body schema validation
- Query parameter validation
- Path parameter validation (no UUID/format checks)

Controllers that do perform validation do so with ad-hoc checks (e.g., checking `!articleId`), not Zod schemas.

**Severity:** **MEDIUM** — Increased attack surface for malformed inputs though mitigated by Drizzle parameterized queries.

### MED-3: Error messages leak implementation details in multiple controllers

**Files affected:** Routes 1, 2, 3, 4, 12 (via their controllers)

```typescript
// teacher-dashboard-controller.ts:147
details: error instanceof Error ? { error: error.message } : {}
```

```typescript
// assignment-controller.ts:769
error: error instanceof Error ? error.message : "Unknown error"
```

```typescript
// flashcard-controller.ts:106
return NextResponse.json({ message: "Internal server error", error, status: 500 });
```

The flashcard controller directly returns the `error` object in the JSON response (line 106), which can include stack traces.

**Severity:** **MEDIUM** — Information disclosure; production error responses should not include raw error objects.

### MED-4: `protect` middleware status code inconsistency

The `protect` middleware returns HTTP 403 (Forbidden) for unauthenticated users rather than the standard HTTP 401 (Unauthorized):

```typescript
// auth-controller.ts:20
return NextResponse.json(
  { message: "Unauthorized - Please login to access this resource" },
  { status: 403 }  // Should be 401
);
```

**Severity:** **LOW** — Semantically incorrect; may confuse API consumers and monitoring tools.

### MED-5: Session double-check adds unnecessary DB load

Several controllers (e.g., `getTeacherOverview`, `getTeacherClasses`, `getClassroomGoals`) re-read the session from `req.session` after `protect` already authenticated the user, then also re-query the user from the database:

```typescript
// teacher-dashboard-controller.ts:34
const session = req.session;
if (!session) {
  return NextResponse.json({ code: "UNAUTHORIZED", ... }, { status: 401 });
}
const userId = session.user.id;
// Then re-queries the user from DB at line 46
const [teacher] = await db.select(...).from(users).where(eq(users.id, userId)).limit(1);
```

The `protect` middleware already guarantees `req.session.user` is populated. The re-query is redundant but not harmful.

**Severity:** **LOW** — Performance concern, not a security issue.

### MED-6: Classroom goals controller parses classroomId from URL path (Files 2, 3)

```typescript
// classroom-goals-controller.ts:26-28
const pathParts = url.pathname.split("/");
const classroomIndex = pathParts.indexOf("classroom");
const classroomId = pathParts[classroomIndex + 1];
```

This extracts `classroomId` by string-splitting the URL path rather than from the typed route params. If the URL structure changes, this silently breaks. It also trusts the path index without bounds checking.

**Severity:** **LOW** — Fragile but not directly exploitable since the path is server-routed.

---

## Anti-Pattern Checks

### A2 — Consent-blind publish gate

**Result: NOT APPLICABLE**

None of the 20 files or their underlying controllers deal with publishing content, consent artifacts, or anonymization. The routes handle CRUD operations on users, classrooms, goals, assignments, rankings, flashcards, and telemetry. No publish/draft workflow exists in this batch.

### A6 — Registry-note overstatement

**Result: NOT APPLICABLE**

The `measure/tracks.md` entry for `reading_advantage_full_review_20260626` is marked `[ ]` (not started/incomplete). No security state is claimed as "resolved" for these routes. The review track explicitly states it is a "review/planning track only; remediation must be opened as separate Measure tracks."

---

## Authorization Coverage Matrix

| Route | File | Method | Controller | Auth Check | Role Check | Self/Staff | Tenant Scoping |
|-------|------|--------|------------|------------|------------|------------|----------------|
| teacher/classes | 1 | GET | getTeacherClasses | ✅ protect | ✅ (TEACHER/ADMIN/SYSTEM) | N/A | ✅ teacher's classrooms |
| classroom goals | 2,3 | GET/POST/PATCH/DELETE | classroom-goals | ✅ protect | ✅ verifyTeacherAccess | N/A | ✅ teacher's classroom |
| teacher/overview | 4 | GET | getTeacherOverview | ✅ protect | ✅ (TEACHER/ADMIN/SYSTEM) | N/A | ✅ teacher's classrooms |
| telemetry/dashboard | 5 | POST | inline | ❌ NONE | ❌ NONE | ❌ NONE | ❌ NONE |
| users/[id]/activity-data | 6 | GET | getUserActivityData | ✅ protect | ❌ NONE | ❌ NONE | ❌ NONE |
| users/[id]/activitylog | 7 | GET/POST/PUT | activity log fns | ✅ protect | ✅ assertSelfOrAllowedStaff | ✅ | ⚠️ no school check |
| users/[id]/reset-progress | 8 | POST | resetUserProgress | ✅ protect | ❌ NONE | ❌ NONE | ❌ NONE |
| users/[id] | 9 | GET/PATCH | getUser/updateUser | ✅ protect | ✅ assertSelfOrAllowedStaff | ✅ | ⚠️ no school check |
| users/[id]/student-data | 10 | GET | getStudentData | ✅ protect | ❌ NONE | ❌ NONE | ❌ NONE |
| users/[id]/xp-logs | 11 | GET | getUserXpLogs | ✅ protect | ❌ NONE | ❌ NONE | ❌ NONE |
| users/assignments | 12 | GET | getStudentAssignments | ✅ protect | ✅ checkClassroomAccess | ✅ | ✅ classroom scoped |
| users/ranking/[id] | 13 | GET | getRankingLeaderboardById | ✅ protect | ❌ NONE | ❌ NONE | ❌ NONE |
| users/ranking | 14 | GET | getAllRankingLeaderboard | ✅ protect | ❌ NONE | ❌ NONE | ❌ NONE |
| users/records/[id] | 15 | GET/POST | getUserRecords | ✅ protect | ✅ assertSelfOrAllowedStaff | ✅ | ⚠️ no school check |
| users (collection) | 16 | GET/PATCH/DELETE | getAllUsers/updateUserData/deleteUser | ✅ protect | ❌ NONE | ❌ NONE | ❌ NONE |
| users/sentences/[id] | 17 | GET/POST/DELETE | flashcard fns | ✅ protect | ✅ assertSelfOrAllowedStaff | ✅ | ⚠️ no school check |
| users/vocabularies/[id] | 18 | GET/POST/DELETE | flashcard fns | ✅ protect | ✅ assertSelfOrAllowedStaff | ✅ | ⚠️ no school check |
| users/wordlist/[id] | 19 | GET/POST/DELETE | flashcard fns | ✅ protect | ✅ assertSelfOrAllowedStaff | ✅ | ⚠️ no school check |
| xp/[userId] | 20 | GET | getLessonXp (license) | ✅ protect | ❌ NONE | ❌ NONE | ❌ NONE |

**Legend:**
- ✅ = present
- ❌ = missing
- ⚠️ = partial (individual-level check present but missing cross-school scoping)

---

## Summary Statistics

| Severity | Count |
|----------|-------|
| CRITICAL | 9 |
| HIGH | 4 |
| MEDIUM | 6 |
| LOW | 3 |
| **Total findings** | **22** |

| Category | Count |
|----------|-------|
| Missing authorization check | 10 |
| Missing authentication | 1 |
| Privilege escalation | 2 |
| Information disclosure | 2 |
| Type safety gap | 1 |
| Input validation gap | 1 |
| Cross-tenant data leak | 2 |
| Improper error handling | 2 |
| HTTP semantics | 1 |

---

## Remediation Priority

1. **Immediate:** Add `assertSelfOrAllowedStaff` to `resetUserProgress`, `getUserActivityData`, `getStudentData`, `getUserXpLogs` (CRIT-3, 4, 5, 6)
2. **Immediate:** Add role checks to `getAllUsers`, `updateUserData`, `deleteUser` (CRIT-2, 7, 8)
3. **Immediate:** Add authentication to `telemetry/dashboard` POST endpoint (CRIT-1)
4. **High:** Add school/license scoping to leaderboard controllers (HIGH-1, 2)
5. **High:** Remove `role` from allowed fields in `updateUser` for non-ADMIN callers (HIGH-3)
6. **High:** Add `assertSelfOrAllowedStaff` or equivalent to `getLessonXp` in license-controller (CRIT-9)
7. **Medium:** Add Zod validation at all route boundaries
8. **Medium:** Remove raw error objects from error responses
9. **Medium:** Replace `as any` casts with proper typed handler registration
10. **Low:** Fix 403→401 status code in `protect` middleware
11. **Low:** Extract classroomId from typed route params instead of URL path splitting

---

## Database Note

All controllers use Drizzle ORM with parameterized queries (`eq()`, `and()`, `inArray()`, etc.), which provides strong protection against SQL injection. No raw SQL string interpolation was observed in the 20 route files or their referenced controllers (with the exception of `sql` template literals with bound parameters, which are safe). The database access layer is **not** the primary concern in this batch; the authorization gap at the controller level is the dominant risk.

---

MEASURE_AGENT_RESULT
