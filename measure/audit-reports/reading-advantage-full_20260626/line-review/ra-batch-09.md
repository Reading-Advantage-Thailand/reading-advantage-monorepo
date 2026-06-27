# Line Review: ra-batch-09

> **Track:** `reading_advantage_full_review_20260626`
> **Reviewer:** Measure Review B (Security / Tenancy / Auth)
> **Date:** 2026-06-27
> **Baseline SHA:** 6921fda0ee45012232bdd71c444d4e9523a10ab6
> **Batch:** ra-batch-09 (20 files: 8 assistant routes, 12 classroom routes)

---

## Coverage

| Category | Files | Lines Reviewed (route + controller) |
|----------|-------|-------------------------------------|
| Assistant — Stories Translation routes | 2 | 27 + 26 |
| Assistant — Stories Wordlist routes | 2 | 26 + 31 |
| Assistant — Translation routes | 2 | 26 + 24 |
| Assistant — FSRS Flash Card route | 1 | 34 |
| Assistant — Wordlist route | 1 | 24 |
| Classroom — Archive/Overview/Students | 3 | 40 + 32 + 32 |
| Classroom — Assignment Notifications | 2 | 29 + 29 |
| Classroom — Assignments | 2 | 30 + 29 |
| Classroom — Core (get/update/delete) | 1 | 54 |
| Classroom — Enroll/Unenroll | 2 | 29 + 29 |
| Classroom — Teachers | 1 | 49 |
| Classroom — All Students | 1 | 28 |
| **Route files** | **20** | **~574** |
| **Controller files (deep-inspected)** | **6** | **~3,729** |
| | | |
| `auth-controller.ts` | | 128 |
| `classroom-controller.ts` | | 1,690 |
| `assignment-classroom-controller.ts` | | 211 |
| `translation-controller.ts` | | 723 |
| `assistant-controller.ts` | | 499 |
| `stories-assistant-controller.ts` | | 318 |
| `session.ts` | | 184 |

---

## Findings

### F-RA-B09-001: deleteClassroom — Destructive Operation With Zero Authorization

**Severity:** Critical
**Category:** Auth / Authorization / Classroom Security
**Files:**
- `apps/reading-advantage/app/api/v1/classroom/[classroomId]/route.ts` (line 24 — `router.delete(deleteClassroom) as any`)
- `apps/reading-advantage/server/controllers/classroom-controller.ts` (lines 893–906)

**Evidence:**

```typescript
// classroom-controller.ts:893-906
export async function deleteClassroom(req: ExtendedNextRequest, ctx: RequestContext) {
  const { classroomId } = await ctx.params;
  try {
    const [classroom] = await db.select().from(classrooms)
      .where(eq(classrooms.id, classroomId)).limit(1);

    if (!classroom) return NextResponse.json(
      { message: "Classroom not found" }, { status: 404 });

    await db.delete(classrooms).where(eq(classrooms.id, classroomId));

    return NextResponse.json({ message: "success deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error }, { status: 500 });
  }
}
```

The function checks only that the classroom **exists**, not that the authenticated user is the classroom owner/teacher. The `protect` middleware only verifies authentication, not resource ownership. A malicious authenticated student can delete any classroom by knowing (or guessing) a `classroomId`.

**Contrast with `addCoTeacher` (line 1283):** The same controller file has `addCoTeacher` which correctly verifies ownership:

```typescript
// classroom-controller.ts:1294-1298
const [classroom] = await db.select().from(classrooms)
  .where(and(
    eq(classrooms.id, classroomId),
    or(eq(classrooms.teacherId, user.id), eq(classrooms.createdBy as any, user.id))
  )).limit(1);

if (!classroom) return NextResponse.json(
  { error: "Only classroom creator can add co-teachers" }, { status: 403 });
```

This proves the team understood the requirement but failed to apply it consistently.

**Impact:**
- Any authenticated user can irreversibly delete any classroom and all its associated data (assignments, student enrollments, XP data)
- No audit logging for the deletion
- No soft-delete or recovery mechanism
- Classroom IDs may be guessable (UUIDs but could leak via URLs, browser history, API responses)

**Recommendation:**
1. Add `getCurrentUser()` call at the start of `deleteClassroom`
2. Verify `user.id === classroom.teacherId || user.id === classroom.createdBy || user.role === "ADMIN" || user.role === "SYSTEM"`
3. Consider soft-delete (set `archived: true` with timestamp) instead of hard delete
4. Add `recordAuditEvent` for classroom deletion
5. Return 403 Forbidden for unauthorized deletion, not 404 (information disclosure)

**Cross-reference:** F-RA-003 (No Audit Logging for Destructive Operations)

---

### F-RA-B09-002: achivedClassroom / updateClassroom — Mutations Without Classroom Ownership Verification

**Severity:** High
**Category:** Auth / Authorization / Classroom Security
**Files:**
- `apps/reading-advantage/app/api/v1/classroom/[classroomId]/achived/route.ts` (line 20 — `router.patch(achivedClassroom) as any`)
- `apps/reading-advantage/app/api/v1/classroom/[classroomId]/route.ts` (line 23 — `router.patch(updateClassroom) as any`)
- `apps/reading-advantage/server/controllers/classroom-controller.ts` (lines 855–891)

**Evidence:**

```typescript
// achivedClassroom: lines 855-870
export async function achivedClassroom(req: ExtendedNextRequest, ctx: RequestContext) {
  const { classroomId } = await ctx.params;
  try {
    const { archived } = await req.json();
    const [classroom] = await db.select().from(classrooms)
      .where(eq(classrooms.id, classroomId)).limit(1);
    if (!classroom) return NextResponse.json(
      { message: "Classroom not found" }, { status: 404 });
    await db.update(classrooms).set({ archived, updatedAt: new Date() })
      .where(eq(classrooms.id, classroomId));
    return NextResponse.json(
      { message: "success updated archived status" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

// updateClassroom: lines 872-891
export async function updateClassroom(req: ExtendedNextRequest, ctx: RequestContext) {
  const { classroomId } = await ctx.params;
  try {
    const { classroomName, grade } = await req.json();
    const [classroom] = await db.select().from(classrooms)
      .where(eq(classrooms.id, classroomId)).limit(1);
    if (!classroom) return NextResponse.json(
      { message: "Classroom not found" }, { status: 404 });
    await db.update(classrooms).set({
      name: classroomName,
      grade: grade ? parseInt(grade) : null,
      updatedAt: new Date()
    }).where(eq(classrooms.id, classroomId));
    return NextResponse.json({ message: "success updated" }, { status: 200 });
  } catch (error) { ... }
}
```

Neither function verifies classroom ownership. Any authenticated user can archive or rename any classroom. Archiving is reversible but constitutes a denial-of-service — a student could archive all classrooms, hiding them from teachers who filter by `ne(classrooms.archived, true)`.

**Input validation gap:** `updateClassroom` casts `grade` with `parseInt(grade)` without validation — non-numeric values become `NaN` and are silently written to the database.

**Recommendation:**
Add ownership verification matching the `addCoTeacher` pattern (teacherId or createdBy).

---

### F-RA-B09-003: patchClassroomEnroll / patchClassroomUnenroll — Student Enrollment Mutations Without Classroom Ownership Verification

**Severity:** High
**Category:** Auth / Authorization / Classroom Security
**Files:**
- `apps/reading-advantage/app/api/v1/classroom/[classroomId]/enroll/route.ts`
- `apps/reading-advantage/app/api/v1/classroom/[classroomId]/unenroll/route.ts`
- `apps/reading-advantage/server/controllers/classroom-controller.ts` (lines 908–985)

**Evidence:**

```typescript
// patchClassroomEnroll: lines 908-957
export async function patchClassroomEnroll(req: ExtendedNextRequest, ctx: RequestContext) {
  const { classroomId } = await ctx.params;
  // ... Zod validates student array ...
  const [classroom] = await db.select().from(classrooms)
    .where(eq(classrooms.id, classroomId)).limit(1);
  // NO ownership check — only existence check
  if (!classroom) return NextResponse.json(
    { message: "Classroom not found" }, { status: 404 });
  // Proceeds to enroll students
}

// patchClassroomUnenroll: lines 959-985 — same pattern
```

**Positive note:** `patchClassroomEnroll` does use Zod validation (`z.array(studentSchema).parse(json.student)`) for the input body — this is one of the few controllers in this batch that validates user input.

**Impact:**
- Any authenticated user can enroll/unenroll any student into/from any classroom
- Student can enroll themselves into another teacher's classroom to access their assignments
- Student can unenroll themselves from their current classroom to avoid assignments
- Cross-school enrollment possible (no schoolId check)

**Recommendation:**
Add ownership verification before enrollment mutations. Additionally, verify that the student(s) being enrolled belong to the classroom owner's license scope.

---

### F-RA-B09-004: postFlashCard — Updates User Records Without Verifying Record Ownership

**Severity:** High
**Category:** Auth / Authorization / Data Integrity
**Files:**
- `apps/reading-advantage/app/api/v1/assistant/ts-fsrs-test/flash-card/[id]/route.ts`
- `apps/reading-advantage/server/controllers/assistant-controller.ts` (lines 256–321)

**Evidence:**

```typescript
// assistant-controller.ts:256-304
export async function postFlashCard(req: ExtendedNextRequest, ctx: RequestContext) {
  const { id } = await ctx.params;
  try {
    const json = await req.json();
    if (json.page === "vocabulary") {
      // ... builds wordUpdate from request body ...
      await db.update(userWordRecords)
        .set(wordUpdate)
        .where(eq(userWordRecords.id, id));  // ← No user ownership check!
    } else {
      // ... builds sentenceUpdate from request body ...
      await db.update(userSentenceRecords)
        .set(sentenceUpdate)
        .where(eq(userSentenceRecords.id, id));  // ← No user ownership check!
    }
    return NextResponse.json({ messeges: "success" }, { status: 200 });
  } catch (error) { ... }
}
```

The function updates `userWordRecords` or `userSentenceRecords` by record `id` from the URL parameter. It never verifies that the record belongs to the authenticated user. Any authenticated user can tamper with any other user's FSRS flashcard data (difficulty, stability, due dates, reps, lapses, state).

**Note on context adaptation (route.ts:18-24):** The route artificially injects `article_id: ''` into the params context because `postFlashCard` expects an `article_id` field in its context interface but this route only has `[id]`. This is a fragile adapter pattern.

**Impact:**
- Cross-user data tampering in the spaced-repetition system
- Can corrupt another student's flashcard scheduling
- Can manipulate another student's vocabulary/sentence learning progress

**Recommendation:**
1. Verify `userWordRecords.userId === req.session.user.id` or `userSentenceRecords.userId === req.session.user.id` before update
2. Fix the mismatched `RequestContext` interface — the `article_id` field is dead in the flash-card route

---

### F-RA-B09-005: getStudentInClassroom — Exposes Classroom Student Data Without Ownership Verification

**Severity:** Medium
**Category:** Auth / Authorization / Data Exposure
**Files:**
- `apps/reading-advantage/app/api/v1/classroom/[classroomId]/route.ts` (line 22 — `router.get(getStudentInClassroom) as any`)
- `apps/reading-advantage/server/controllers/classroom-controller.ts` (lines 704–754)

**Evidence:**

```typescript
// classroom-controller.ts:704-754
export async function getStudentInClassroom(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ classroomId: string }> }
) {
  const { classroomId } = await ctx.params;
  // NO auth check, NO ownership check, NO role check
  const [classroom] = await db.select().from(classrooms)
    .where(eq(classrooms.id, classroomId)).limit(1);
  if (!classroom) return NextResponse.json(
    { error: "Classroom not found" }, { status: 404 });

  // Exposes student names, emails, XP, levels, CEFR levels, join dates
  const studentRows = await db.select({ ... }).from(classroomStudents)
    .leftJoin(users, eq(classroomStudents.studentId, users.id))
    .where(eq(classroomStudents.classroomId, classroomId));
  // ...
}
```

Any authenticated user (including students) can view the full roster of any classroom — student names, emails, XP, levels, CEFR levels, and join dates.

**Contrast with `getClassroomOverview` and `getClassroomStudents`:** Both of those functions have proper ownership checks (`isTeacher || isAdmin`). This function was overlooked.

**Recommendation:**
Add the same teacher/admin check used in `getClassroomOverview` and `getClassroomStudents`.

---

### F-RA-B09-006: getClassroomAssignments / getAssignmentStudents — No Classroom Ownership Verification

**Severity:** Medium
**Category:** Auth / Authorization / Data Exposure
**Files:**
- `apps/reading-advantage/app/api/v1/classroom/[classroomId]/assignments/route.ts`
- `apps/reading-advantage/app/api/v1/classroom/[classroomId]/assignments/[assignmentId]/students/route.ts`
- `apps/reading-advantage/server/controllers/assignment-classroom-controller.ts` (lines 6–77)

**Evidence:**

```typescript
// assignment-classroom-controller.ts:9-30
export async function getClassroomAssignments(req, ctx) {
  const { classroomId } = await ctx.params;
  // Only checks classroomId exists, not ownership
  const rows = await db.select().from(assignments)
    .where(eq(assignments.classroomId, classroomId))
    .orderBy(desc(assignments.createdAt));
  return NextResponse.json(rows);
}

// assignment-classroom-controller.ts:35-77
export async function getAssignmentStudents(req, ctx) {
  const { classroomId, assignmentId } = await ctx.params;
  // Only checks params exist, not ownership
  // Exposes student names and emails for the classroom
}
```

**Impact:**
- Any authenticated user can enumerate assignments in any classroom
- Any authenticated user can see which students have completed/not completed assignments
- Student emails are exposed

**Recommendation:**
Add classroom ownership verification. At minimum, verify the requesting user is a teacher/admin of the specified classroom.

---

### F-RA-B09-007: sendClassroomAssignmentNotifications — No Classroom Ownership Verification

**Severity:** Medium
**Category:** Auth / Authorization
**Files:**
- `apps/reading-advantage/app/api/v1/classroom/[classroomId]/assignment-notifications/send/route.ts`
- `apps/reading-advantage/server/controllers/assignment-classroom-controller.ts` (lines 83–156)

**Evidence:**

```typescript
// assignment-classroom-controller.ts:83-156
export async function sendClassroomAssignmentNotifications(req, ctx) {
  const { classroomId } = await ctx.params;
  const user = req.session?.user;
  if (!user?.id) return NextResponse.json(
    { error: "Unauthorized" }, { status: 401 });
  if (!classroomId) return NextResponse.json(
    { error: "Missing classroomId" }, { status: 400 });
  // ... proceeds to send notifications without checking if user
  // is a teacher of the classroom
}
```

The function requires authentication but does not verify the caller is a teacher of the target classroom. Any authenticated user can trigger notification inserts for any classroom.

**Impact:**
- Student could spam notification records in other classrooms
- Notification data pollution

**Recommendation:**
Verify the requesting user is a teacher (owner or co-teacher) of the specified classroom.

---

### F-RA-B09-008: getClassroomNotificationHistory — No Classroom Ownership Verification

**Severity:** Medium
**Category:** Auth / Authorization / Data Exposure
**Files:**
- `apps/reading-advantage/app/api/v1/classroom/[classroomId]/assignment-notifications/history/route.ts`
- `apps/reading-advantage/server/controllers/assignment-classroom-controller.ts` (lines 158–211)

**Evidence:**

```typescript
// assignment-classroom-controller.ts:161-211
export async function getClassroomNotificationHistory(req, ctx) {
  const { classroomId } = await ctx.params;
  if (!classroomId) return NextResponse.json(
    { error: "Missing classroomId" }, { status: 400 });
  // No auth/ownership check
  const notifications = await db.select({ ... })
    .from(assignmentNotifications)
    .innerJoin(assignments, ...)
    .innerJoin(users, ...)
    .where(eq(assignments.classroomId, classroomId));
  // Exposes notification history including student names
}
```

**Recommendation:**
Add classroom ownership/teacher verification.

---

### F-RA-B09-009: [achived] GET Exports a Route With No Handler — Silent 500

**Severity:** Medium
**Category:** Correctness / Dead Route
**Files:**
- `apps/reading-advantage/app/api/v1/classroom/[classroomId]/achived/route.ts` (lines 22–30)

**Evidence:**

```typescript
// route.ts:20
router.patch(achivedClassroom) as any;  // Only PATCH handler registered

// route.ts:22-30
export async function GET(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);  // ← passes auth (protect)
  // result will NOT be a NextResponse because no GET handler exists
  // Falls through to: throw new Error("Expected a NextResponse from router.run");
}
```

The route exports a `GET` handler but only registers a `PATCH` handler in the router. A GET request passes through `logRequest` + `protect` middleware (consuming a session validation) but then has no handler, so `router.run()` returns undefined, the `instanceof NextResponse` check fails, and the route throws an unhandled 500 error.

**Impact:**
- Wasted session validation on every misdirected GET request
- Confusing error messages in logs
- Degraded UX for API consumers

**Recommendation:**
Either remove the GET export, register a GET handler that returns 405 Method Not Allowed, or register the actual controller for GET.

---

### F-RA-B09-010: protect Middleware Returns 403 Instead of 401 for Unauthenticated Access

**Severity:** Low
**Category:** HTTP Semantics / Auth
**Files:**
- `apps/reading-advantage/server/controllers/auth-controller.ts` (lines 13–29, 33–61)

**Evidence:**

```typescript
// auth-controller.ts:19-24
if (!user) {
  return NextResponse.json(
    { message: "Unauthorized - Please login to access this resource" },
    { status: 403 }  // ← Should be 401
  );
}
```

HTTP 403 Forbidden means "you are authenticated but not authorized." HTTP 401 Unauthorized means "you are not authenticated." The `protect` middleware checks authentication, not authorization, so it should return 401.

This is repeated in `restrictTo` (line 43) which also returns 403 for missing authentication.

**Recommendation:**
Return 401 when `getCurrentUser()` returns null, 403 when role check fails.

---

### F-RA-B09-011: assertSelfOrAllowedStaff Excludes SYSTEM Role

**Severity:** Medium
**Category:** Auth / Role Authorization Gap
**Files:**
- `apps/reading-advantage/server/controllers/auth-controller.ts` (lines 112–128)

**Evidence:**

```typescript
// auth-controller.ts:121
const allowedRoles: string[] = ["ADMIN", "TEACHER"];
if (allowedRoles.includes(sessionUser.role)) { return true; }
```

The SYSTEM role is excluded from `allowedRoles`. Throughout the classroom controller, SYSTEM users are consistently treated as having admin-level access (see `getClassroomOverview`, `getClassroom`, `getClassroomXpCustomRange`). This function diverges from that pattern — a SYSTEM user calling an endpoint that uses `assertSelfOrAllowedStaff` would be denied.

**Recommendation:**
Add `"SYSTEM"` to `allowedRoles` for consistency with the rest of the codebase.

---

### F-RA-B09-012: Translation Controller Functions — No Internal Auth Re-Verification

**Severity:** Low
**Category:** Auth / Defense in Depth
**Files:**
- `apps/reading-advantage/server/controllers/translation-controller.ts` (entire file, 723 lines)

**Evidence:**

All translation functions (`translate`, `translateForPrint`, `translateChapterContent`, `translateStorySummary`) rely entirely on the `protect` middleware for authentication. None of them call `getCurrentUser()` or check `req.session` internally. While the routes have `protect`, defense-in-depth is missing.

Additionally:
- **Direct Google Translate SDK usage** (line 264–265): `new Translate({ projectId: process.env.GOOGLE_PROJECT_ID, key: process.env.GOOGLE_TEXT_TO_SPEECH_API_KEY })` — bypasses the AI adapter. Confirms F-RA-014.
- **Raw `process.env` reads**: `GOOGLE_PROJECT_ID`, `GOOGLE_TEXT_TO_SPEECH_API_KEY` used without runtime validation. Confirms F-RA-011.
- **GPT translation path** (line 331): Uses `generateObject` from `@reading-advantage/ai` but with model config from `@/utils/google` — mixing adapter and direct patterns.
- **No schoolId scoping**: Article/story/chapter queries have no tenant filtering.

---

### F-RA-B09-013: getWordlist / getChapterWordlist — Staff Role Check Uses Session, Not Fresh Auth

**Severity:** Low
**Category:** Auth / Session Trust Boundary
**Files:**
- `apps/reading-advantage/server/controllers/assistant-controller.ts` (lines 149–254)
- `apps/reading-advantage/server/controllers/stories-assistant-controller.ts` (lines 129–270)

**Evidence:**

```typescript
// assistant-controller.ts:192-193
const sessionUser = req.session?.user;
const isStaff = sessionUser && ["ADMIN", "STAFF", "TEACHER", "SUPERADMIN"]
  .includes(sessionUser.role as string);
```

Both `getWordlist` and `getChapterWordlist` rely on `req.session` (set by the `protect` middleware) rather than calling `getCurrentUser()` for a fresh auth verification. The session object on the request is a middleware artifact — if the middleware chain is ever modified, these checks become stale.

The pattern is inconsistent within the same codebase: `getAllStudentList`, `getClassroom`, `addCoTeacher`, and others call `getCurrentUser()` independently.

**Recommendation:**
Use `getCurrentUser()` for consistent auth verification rather than relying on `req.session`.

---

### F-RA-B09-014: getAllStudentList — No Role Check, Returns All Students Under Teacher's License Scope

**Severity:** Low
**Category:** Auth / Role Authorization
**Files:**
- `apps/reading-advantage/app/api/v1/classroom/all-students/route.ts`
- `apps/reading-advantage/server/controllers/classroom-controller.ts` (lines 194–277)

**Evidence:**

```typescript
// classroom-controller.ts:194-277
export async function getAllStudentList(req: ExtendedNextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // NO role check — a STUDENT passes the protect middleware and gets here
  // But: the function queries based on the user's license IDs
  // A student with no license links would get an empty list
  // ...
}
```

While a student would likely get an empty response (their license scoping would return no students), the function should explicitly gate on TEACHER/ADMIN/SYSTEM roles for clarity and consistent authorization patterns.

**Note on `restrictAccess` comment:** The route (line 16) has `// router.use(restrictAccess);` commented out. The `restrictAccess` import is not even present in the file. This suggests access restriction was considered but deferred.

**Recommendation:**
Add an explicit role gate: only TEACHER, ADMIN, and SYSTEM roles should access the all-students endpoint.

---

### F-RA-B09-015: Inconsistent Auth Pattern — Some Controllers Use `getCurrentUser()`, Others Use `req.session`

**Severity:** Low
**Category:** Auth / Consistency
**Files:** All 20 route files and their controllers

**Evidence:**

Controllers in this batch use three different auth verification patterns:

| Pattern | Used By | Freshness |
|---------|---------|-----------|
| `const user = await getCurrentUser()` | `getAllStudentList`, `getClassroom`, `addCoTeacher`, `removeCoTeacher`, `getClassroomTeachers`, `createdClassroom` | ✅ Fresh |
| `const session = req.session; if (!session) ...` | `getClassroomOverview`, `getClassroomStudents` | ⚠️ Middleware artifact |
| `const sessionUser = req.session?.user` | `getWordlist`, `getChapterWordlist`, `sendClassroomAssignmentNotifications` | ⚠️ Middleware artifact |
| **No auth check within controller** | `deleteClassroom`, `achivedClassroom`, `updateClassroom`, `patchClassroomEnroll`, `patchClassroomUnenroll`, `getStudentInClassroom`, `getClassroomAssignments`, `getAssignmentStudents`, `getClassroomNotificationHistory`, `postFlashCard`, all translation functions | ❌ Missing |

**Impact:**
- 11 of 23 controller functions in this batch have no internal auth verification
- 5 rely on middleware artifacts
- Only 7 do a proper independent auth call

**Recommendation:**
Standardize on `getCurrentUser()` at the top of every controller function for defense-in-depth.

---

## Anti-Pattern Checks

### A2 (Consent-Blind Publish Gate)

**Status:** Not Triggered in this batch.

No publish/draft→publish gate is present in the 20 files reviewed. The batch covers translation, wordlist, flashcard, and classroom mutation routes — none of which implement content publication with consent requirements.

### A6 (Registry-Note Overstatement)

**Status:** Not Triggered for this batch.

`measure/tracks.md` (line 30) describes this track as a "Full Feature Review" with accurate scope statements. No security posture claims are overstated in the registry. The existing `review-b-security-result.json` correctly identifies the overall posture as `NOT_PRODUCTION_GREEN` with 2 Critical and 5 High findings.

---

## Input Validation Summary

| Function | Body Validation | Params Validation | Query Validation |
|----------|----------------|-------------------|-----------------|
| `patchClassroomEnroll` | ✅ Zod (`z.array(studentSchema)`) | ❌ None | N/A |
| `patchClassroomUnenroll` | ⚠️ Checks `studentId` exists | ❌ None | N/A |
| `updateClassroom` | ❌ Direct `req.json()` | ❌ None | N/A |
| `achivedClassroom` | ❌ Direct `req.json()` | ❌ None | N/A |
| `deleteClassroom` | N/A | ❌ None | N/A |
| `postFlashCard` | ❌ Direct `req.json()` | ❌ None | N/A |
| `translate` | ❌ Direct destructuring | ❌ None | N/A |
| `translateChapterContent` | ❌ Direct destructuring | ⚠️ Manual checks | N/A |
| `translateStorySummary` | ❌ Direct destructuring | ⚠️ Manual checks | N/A |
| `sendClassroomAssignmentNotifications` | ⚠️ Manual checks | ❌ None | N/A |
| `getWordlist` | ❌ Direct `req.json()` | N/A | N/A |
| `getChapterWordlist` | N/A | ⚠️ `parseInt()` | N/A |

Only 1 of 12 mutation endpoints in this batch uses Zod validation. This confirms F-RA-008 (Inconsistent Zod Input Validation) at the batch level.

---

## Tenant/School Scoping Summary

| Function | schoolId Filter | Cross-School Risk |
|----------|----------------|-------------------|
| All classroom controller functions | ❌ None | **High** — any classroom accessible across schools |
| Translation controller functions (articles) | ❌ None | **Medium** — articles/chapters not school-scoped |
| Assignment classroom functions | ❌ None | **High** — assignments not school-scoped |
| `getAllStudentList` | ❌ None (license-scoped only) | **Medium** — students matched by license, not school |

None of the 20 route files' controller functions apply `schoolId` filtering. This confirms F-RA-001 (Missing Tenant/School Scoping) at the batch level.

---

## Summary

| Severity | Count | Finding IDs |
|----------|-------|-------------|
| Critical | 1 | F-RA-B09-001 |
| High | 3 | F-RA-B09-002, F-RA-B09-003, F-RA-B09-004 |
| Medium | 5 | F-RA-B09-005, F-RA-B09-006, F-RA-B09-007, F-RA-B09-008, F-RA-B09-009 |
| Low | 6 | F-RA-B09-010, F-RA-B09-011, F-RA-B09-012, F-RA-B09-013, F-RA-B09-014, F-RA-B09-015 |
| **Total** | **15** | |

### Key Metrics

- **Routes reviewed:** 20
- **Controllers deep-inspected:** 6
- **Controller functions with no internal auth:** 11 / 23 (48%)
- **Controller functions with no tenant scoping:** 23 / 23 (100%)
- **Mutation endpoints with Zod validation:** 1 / 12 (8%)
- **Destructive operations without authorization:** 1 (deleteClassroom — Critical)
- **Anti-patterns triggered:** 0 (A2 not in scope, A6 not overstated)

### Worst Offenders

1. **`deleteClassroom`** — Destructive, irreversible, zero authorization. Any authenticated user can delete any classroom.
2. **`achivedClassroom` / `updateClassroom`** — Mutations on any classroom without ownership check.
3. **`patchClassroomEnroll` / `patchClassroomUnenroll`** — Student roster manipulation without classroom ownership verification.
4. **`postFlashCard`** — Cross-user data tampering in the FSRS spaced-repetition system.

These findings directly support the existing remediation tracks proposed in `review-b-security-result.json`:
- **M-RA-SEC-1** (Tenant/School Scoping Enforcement) — 100% of this batch lacks schoolId filtering
- **M-RA-SEC-7** (Zod Input Validation Across All Routes) — only 8% of mutations validated
- **F-RA-001/F-RA-003/F-RA-008/F-RA-010** are all confirmed at the file level in this batch

---

MEASURE_AGENT_RESULT
