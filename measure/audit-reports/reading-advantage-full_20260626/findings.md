# Findings: Reading Advantage Security / UX / Correctness Review

> **Audit:** reading-advantage-full_20260626
> **Review roles:** B — Security / Tenancy / Auth; C — UX / API / Contracts; A — Correctness / Product Behavior
> **Date:** 2026-06-27
> **Baseline SHA:** 6921fda0ee45012232bdd71c444d4e9523a10ab6

---

## Finding C-001: Inconsistent Error Response Contracts Across API Surface

**Severity:** High
**Category:** API Contract Inconsistency
**Affected routes:** 209 route handlers, 54 controllers

### Evidence

The API surface uses at least 6 different error response shapes with no standardized contract:

| Pattern | Shape | Example Location |
|---------|-------|-----------------|
| Status-in-body | `{ message: string, status: number }` | `flashcard/progress/update/route.ts:17,24` |
| Code+message | `{ code: string, message: string }` | `ai-controller.ts:26,112` |
| Error object | `{ error: any }` | `classroom-controller.ts:275` |
| Success wrapper | `{ success: boolean, data: any, message: string }` | `demo/accounts/route.ts:60` |
| Simple message | `{ message: string }` | Most controllers |
| Error+message | `{ error: string, message: string }` | `classroom-controller.ts:937-938` |

### Impact
- Frontend must handle 6+ error shapes, leading to inconsistent error display
- No contract tests exist — error shape changes silently break consumers
- HTTP status codes are sometimes returned as body fields (status: 403) rather than HTTP status

### Recommendation
Define a shared `ErrorResponse` Zod schema in `@reading-advantage/types` and enforce it at all API boundaries.

---

## Finding C-002: HTTP Status Codes Returned in Response Body Instead of HTTP Status

**Severity:** High
**Category:** API Contract Violation
**Affected routes:** `flashcard/progress/update/route.ts`

### Evidence

```typescript
// flashcard/progress/update/route.ts:14-18
return NextResponse.json({
  message: "Unauthorized",
  status: 403,  // ← Status in body, HTTP status is 200
});
```

```typescript
// flashcard/progress/update/route.ts:22-27
return NextResponse.json({
  message: "Missing required fields: cardId, rating, type",
  status: 400,  // ← Status in body, HTTP status is 200
});
```

### Impact
- Clients relying on HTTP status codes for error handling receive 200 OK for errors
- Fetch API `response.ok` returns true for error responses
- No middleware or monitoring can detect errors via status codes

### Recommendation
Always use `NextResponse.json(body, { status: 4xx/5xx })` — never embed status in body.

---

## Finding C-003: Unauthenticated Sensitive Endpoints

**Severity:** High
**Category:** Security / Contract
**Affected routes:** 14+ routes

### Evidence

These routes have no authentication but expose sensitive functionality:

| Route | Risk |
|-------|------|
| `/api/v1/articles/generate` | Triggers AI article generation without auth |
| `/api/v1/stories/generate` | Triggers AI story generation without auth |
| `/api/v1/ai/insights/refresh` | Triggers AI insight generation without auth |
| `/api/v1/metrics/health` | System health info exposed |
| `/api/v1/metrics/cache` | Cache internals exposed |
| `/api/v1/metrics/stream` | Metrics streaming exposed |
| `/api/v1/telemetry/dashboard` | Telemetry data exposed |
| `/api/v1/activity/update-all` | Bulk activity update without auth |

### Impact
- Anyone can trigger AI generation, consuming API credits
- System internals exposed to unauthenticated users
- Potential for abuse/rate-limit bypass

### Recommendation
Add `protect` middleware to all generation and system endpoints. Health endpoints should use access-key authentication.

---

## Finding C-004: No Input Validation on Query Parameters or Request Bodies

**Severity:** High
**Category:** API Contract / Validation
**Affected routes:** 180+ controllers

### Evidence

```typescript
// article-controller.ts:79-80
const page = Number(req.nextUrl.searchParams.get("page")) || 1;
const limit = Number(req.nextUrl.searchParams.get("limit")) || 10;
```

```typescript
// classroom-controller.ts:758
const json = await req.json();
const { name, studentId } = json;  // No validation
```

```typescript
// assignment-controller.ts — entire file
// No Zod schemas for any assignment body parsing
```

Only `patchClassroomEnroll` in `classroom-controller.ts:910-917` uses Zod:
```typescript
const studentSchema = z.object({
  studentId: z.string(),
  lastActivity: z.string(),
});
const newStudents = z.array(studentSchema).parse(json.student);
```

### Impact
- SQL injection risk from unvalidated string inputs
- NaN values from `Number()` casts silently become 0 or 1
- Unexpected body shapes cause runtime errors (500) instead of validation errors (400)
- No contract documentation for API consumers

### Recommendation
Add Zod validation schemas to all route handlers. Use `parseBody()` and `parseQuery()` helpers.

---

## Finding C-005: Duplicate Auth Routes — signup vs register

**Severity:** Medium
**Category:** API Contract Duplication
**Affected routes:** `/api/auth/signup`, `/api/auth/register`

### Evidence

| Route | Handler | DB Import |
|-------|---------|-----------|
| `/api/auth/register` | `@reading-advantage/api/routes/auth` `handleRegister` | Shared package |
| `/api/auth/signup` | Direct handler | `@reading-advantage/db` directly |

Both create user accounts but via different code paths:
- `register` uses the shared auth package (argon2id, session management)
- `signup` uses `bcryptjs` via `PasswordUtils` and raw db queries

### Impact
- Two code paths for the same operation = inconsistent behavior
- `signup` uses bcryptjs while the shared package uses argon2id
- No audit logging on `signup` path
- Confusing for API consumers — which endpoint to use?

### Recommendation
Remove the `signup` route and redirect to `register`, or consolidate into a single shared handler.

---

## Finding C-006: FSRS Flashcard Progress Update Lacks Ownership Verification

**Severity:** Medium
**Category:** API Contract / Security
**Affected route:** `/api/v1/flashcard/progress/update`

### Evidence

```typescript
// flashcard/progress/update/route.ts:54
if (!currentCard || currentCard.userId !== user.id) {
  return NextResponse.json({ message: "Card not found or unauthorized", status: 404 });
}
```

The check exists, but:
1. No Zod validation on `rating` — values 1-4 are valid, but any other value silently defaults to `Rating.Good`
2. No validation that `type` is "vocabulary" or "sentence" — any other value defaults to sentence
3. The `cardId` is not validated as a valid UUID format

### Impact
- Users can manipulate FSRS scheduling by sending arbitrary rating values
- Invalid type values silently default to sentence path

### Recommendation
Add Zod schema: `z.object({ cardId: z.string().uuid(), rating: z.number().int().min(1).max(4), type: z.enum(["vocabulary", "sentence"]) })`

---

## Finding C-007: Classroom Controller Missing Authorization Checks

**Severity:** Critical
**Category:** Security / Tenancy
**Affected routes:** `classroom-controller.ts` multiple functions

### Evidence

```typescript
// classroom-controller.ts:855-869 — achivedClassroom
export async function achivedClassroom(req, ctx) {
  const { classroomId } = await ctx.params;
  // No auth check — anyone can archive any classroom
  const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);
  await db.update(classrooms).set({ archived, updatedAt: new Date() }).where(eq(classrooms.id, classroomId));
}
```

```typescript
// classroom-controller.ts:872-891 — updateClassroom
export async function updateClassroom(req, ctx) {
  // No auth check — anyone can update any classroom name/grade
}
```

```typescript
// classroom-controller.ts:893-906 — deleteClassroom
export async function deleteClassroom(req, ctx) {
  // No auth check — anyone can delete any classroom
}
```

```typescript
// classroom-controller.ts:756-768 — updateStudentClassroom
export async function updateStudentClassroom(req, ctx) {
  // No auth check — anyone can update any student's name
}
```

```typescript
// classroom-controller.ts:770-781 — getClassroomTeacher
export async function getClassroomTeacher(req) {
  // No auth check — returns all teachers
}
```

### Impact
- Any authenticated user can archive/update/delete any classroom regardless of ownership
- Any user can update any student's name
- No school/tenant isolation

### Recommendation
Add ownership + schoolId verification to all mutating classroom operations.

---

## Finding C-008: No Audit Logging on Destructive Operations

**Severity:** High
**Category:** Contract / Compliance
**Affected routes:** All delete/archive/update routes

### Evidence

Zero references to `recordAuditEvent` from `@reading-advantage/auth` anywhere in `apps/reading-advantage/`.

Destructive operations with no audit trail:
- `DELETE /api/v1/articles/[article_id]` — article deletion
- `DELETE /api/v1/stories/[storyId]` — story deletion
- `DELETE /api/v1/classroom/[classroomId]` — classroom deletion
- `DELETE /api/v1/users/[id]` — user deletion
- Classroom archive/update/unenroll operations

### Impact
- No compliance trail for FERPA/GDPR
- Cannot investigate data loss or unauthorized changes
- No evidence of who performed what action when

### Recommendation
Wire `recordAuditEvent` into all destructive operations. Priority: user deletion, classroom deletion, article deletion.

---

## Finding C-009: Inconsistent Logging — console.log in Production Code

**Severity:** Medium
**Category:** Code Quality / Observability
**Affected files:** All 54 controllers

### Evidence

```typescript
// student-dashboard-controller.ts:133
console.log(`[Controller] getStudentDashboard - ${duration}ms - user: ${userId}`);

// ai-controller.ts:39-46
console.log('[AI Insights] Request params:', { userId, classroomId, ... });

// classroom-controller.ts:493
console.error(error);  // Logs full error object including stack
```

Every controller uses `console.log` and `console.error` for logging. No structured logging, no request IDs, no log levels.

### Impact
- No log aggregation or searchability
- Sensitive data (user IDs, request params) logged to stdout
- No performance monitoring integration

### Recommendation
Migrate to structured logger from `@reading-advantage/domain` or equivalent. Add request ID correlation.

---

## Finding C-010: Missing Loading/Empty State Contracts

**Severity:** Medium
**Category:** UX / API Contract
**Affected routes:** All list endpoints

### Evidence

No endpoint defines a consistent empty-state response shape:

```typescript
// Some return empty array:
return NextResponse.json({ students: [] }, { status: 200 });

// Some return empty data in nested structure:
return NextResponse.json({ message: "success", data: [] }, { status: 200 });

// Some return null/undefined:
return NextResponse.json({ message: "success", data: classroomId }, { status: 200 });
// where classroomId can be null
```

### Impact
- Frontend must handle multiple empty-state patterns
- No consistent pagination metadata (total, page, limit, hasMore)
- No cursor-based or offset-based pagination contract

### Recommendation
Define a `ListResponse<T>` wrapper with `{ data: T[], meta: { total, page, limit, hasMore } }`.

---

## Finding C-011: Race Condition in Flashcard Progress Update

**Severity:** Medium
**Category:** API Contract / Data Integrity
**Affected route:** `/api/v1/flashcard/progress/update`

### Evidence

```typescript
// flashcard/progress/update/route.ts:38-51
currentCard = (await db.select().from(userWordRecords).where(eq(userWordRecords.id, cardId)).limit(1))[0];
// ... FSRS calculation ...
await db.update(userWordRecords).set(updateData).where(eq(userWordRecords.id, cardId));
```

Read-then-update without transaction or optimistic locking. If two concurrent requests update the same card, the second read may see stale data.

### Impact
- FSRS scheduling data can be corrupted under concurrent access
- Last-write-wins behavior loses rating data

### Recommendation
Use `FOR UPDATE` in the select or wrap in a transaction with optimistic locking.

---

## Finding C-012: Middleware Pattern Bypass — next-connect Edge Router

**Severity:** Medium
**Category:** API Architecture
**Affected routes:** 180+ routes

### Evidence

All v1 routes use the `next-connect` edge router pattern:
```typescript
const router = createEdgeRouter<NextRequest, RequestContext>();
router.use(logRequest);
router.use(protect);
router.get(handler) as any;

export async function GET(request, ctx) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) return result;
  throw new Error("Expected a NextResponse from router.run");
}
```

This pattern:
1. Uses `as any` type casts on every handler registration
2. Throws generic Error (not NextResponse) when router.run fails
3. Adds `next-connect` as a dependency for middleware composition
4. Every route file repeats the same boilerplate (8+ lines of setup per HTTP method)

### Impact
- Error thrown without HTTP response → Next.js returns 500 with no useful message
- Type safety lost via `as any` casts
- Boilerplate duplication across 180+ route files

### Recommendation
Replace with a shared `withAuth(handler)` wrapper function that handles middleware composition cleanly.

---

## Finding C-013: Direct Google Cloud Translate SDK Usage

**Severity:** Medium
**Category:** Provider Coupling
**Affected file:** `article-controller.ts:755-774`

### Evidence

```typescript
// article-controller.ts:5
import { Translate } from "@google-cloud/translate/build/src/v2";

// article-controller.ts:755-774
const translate = new Translate({ projectId: process.env.GOOGLE_CLOUD_PROJECT_ID });
const [translation] = await translate.translate(text, targetLanguage);
```

Direct SDK usage bypasses the `@reading-advantage/ai` adapter pattern. Other AI calls use the shared adapter.

### Impact
- Provider lock-in to Google Cloud Translate
- No fallback if Google Translate is unavailable
- Inconsistent with the AI adapter pattern used elsewhere

### Recommendation
Route translation through the AI adapter or create a dedicated `@reading-advantage/translation` adapter.

---

## Finding C-014: Firebase Admin SDK Remnant in Generator

**Severity:** Low
**Category:** Provider Coupling / Legacy
**Affected file:** `generator-controller.ts:1499-1599`

### Evidence

```typescript
// Dynamic require to avoid build failure
const { getStorage } = require("firebase-admin/storage");
const bucket = getStorage().bucket("artifacts.reading-advantage.appspot.com");
```

Used only for audio file cleanup. All other Firebase usage has been removed.

### Impact
- Build dependency on firebase-admin even though only one function uses it
- Dynamic require may fail at runtime if firebase-admin is not installed

### Recommendation
Replace with `@reading-advantage/storage` adapter. Remove firebase-admin from package.json.

---

## Finding C-015: No Response Type Definitions for API Consumers

**Severity:** Medium
**Category:** API Documentation / Contract
**Affected routes:** All 209 routes

### Evidence

While `@/types/dashboard.ts` defines some response types (`StudentMeResponse`, `AISummaryResponse`), most controllers:
1. Return inline object literals without type definitions
2. Use `any` types in intermediate calculations
3. Have no OpenAPI/Swagger documentation
4. Have no contract tests verifying response shapes

Example: `classroom-controller.ts` builds response objects inline across 1400+ lines with no shared type.

### Impact
- Frontend developers must reverse-engineer response shapes from controller code
- No API documentation for external consumers
- Response shape changes break consumers silently

### Recommendation
Define response types in `@reading-advantage/types` and validate with Zod at boundaries.

---

# Product Behavior / Correctness Findings

> Findings from the correctness/product-behavior review. These focus on student-learning correctness, data persistence, edge cases, and workflow outcomes rather than API shape or auth enforcement.

---

## Finding PB-001: XP and Level Progression vulnerable to double-award under concurrency

**Severity:** Critical
**Category:** Product Correctness / Data Integrity
**Affected files:** `server/controllers/user-controller.ts:157-328`, `server/controllers/question-controller.ts`, game score routes

### Evidence

`postActivityLog` reads whether an XP log already exists, then inserts the XP log and updates `users.xp` / `users.level` in separate statements:

```typescript
// user-controller.ts:269-277
const [existingXpLog] = await db.select().from(xpLogs).where(eq(xpLogs.activityId, existingActivity.id)).limit(1);
hasExistingXpLog = !!existingXpLog;

// user-controller.ts:279-314
if (!hasExistingXpLog && ...) {
  await db.insert(xpLogs).values({ ... });
  const [currentUser] = await db.select({ xp: users.xp, ... }).from(users).where(eq(users.id, id)).limit(1);
  const finalXp = (currentUser?.xp || 0) + data.xpEarned;
  await db.update(users).set({ xp: finalXp, level: levelCalculation(finalXp).raLevel, ... }).where(eq(users.id, id));
}
```

There is no transaction or unique constraint preventing two concurrent requests from both observing `hasExistingXpLog === false` and both awarding XP.

### Impact
- A student can double/triple-earn XP for a single activity by submitting multiple concurrent requests.
- Level/CEFR promotion can be gamed by replaying activity-completion requests.
- XP-based leaderboards, streaks, and license tier thresholds become unreliable.

### Recommendation
Wrap the read-insert-update sequence in a Drizzle transaction with a `FOR UPDATE` lock on the user row, or enforce a unique `(userId, activityId)` constraint on `xpLogs` and use an upsert.

---

## Finding PB-002: Level-test assessment JSON is parsed but never validated

**Severity:** High
**Category:** Product Correctness / AI Output Safety
**Affected file:** `server/controllers/level-test-controller.ts:85-95`, `components/level-test-chat.tsx:239-333`

### Evidence

The AI's final assessment is extracted from a markdown code block and parsed as JSON, but the resulting object is returned with type `object | null` and no Zod validation:

```typescript
function parseAssessment(fullMessage: string): object | null {
  const jsonMatch = fullMessage.match(/```json\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1]); } catch (e) { ... }
  }
  return null;
}
```

The frontend then accesses `assessmentData.level`, `assessmentData.sublevel`, `assessmentData.xp`, etc. without any guarantee those fields exist or are valid.

### Impact
- A malformed or missing assessment can leave the student at level 0/null, forcing them back into the level-test loop.
- Invalid CEFR strings can corrupt the user's `cefrLevel` column.
- Missing `xp` causes the initial-level-test XP path to behave inconsistently with `postActivityLog`.

### Recommendation
Define and enforce a Zod schema for the assessment JSON (`level`, `sublevel`, `cefrLevel`, `xp`, `explanation`, `strengths`, `improvements`, `nextSteps`) before returning it to the frontend.

---

## Finding PB-003: AI-generated reading content has no level/quality gate

**Severity:** High
**Category:** Product Correctness / Content Quality
**Affected files:** `server/utils/generators/article-generator.ts:71-117`, `server/utils/generators/stories-chapters-generator.ts:330-420`, `server/utils/generators/question-generator.ts:48-90`

### Evidence

1. `generateArticle` uses `temperature: 1` and a random `seed`, making generation non-deterministic and highly variable.
2. No post-hoc check verifies that the generated passage actually matches the requested CEFR level, genre, or subgenre.
3. The generator throws a raw string (`throw \`failed to generate article: ${error}\``), losing stack traces.
4. `question-generator.ts` also throws raw strings.

### Impact
- Students may receive articles far above/below their level, harming the placement algorithm.
- Inconsistent quality undermines teacher trust in auto-generated assignments.
- Raw string throws break standard error handling and logging.

### Recommendation
Add a validation step (readability scorer + Zod schema) after generation, lower temperature or use structured output only, and throw `Error` instances. Reject content that does not pass the level gate.

---

## Finding PB-004: Assignment status mapping is ad-hoc and not source-of-truth aligned

**Severity:** Medium
**Category:** Product Correctness / Data Consistency
**Affected file:** `server/controllers/assignment-controller.ts:84-88`, `server/controllers/student-dashboard-controller.ts`

### Evidence

Assignment status is converted with a local helper:

```typescript
const statusToInt = (status: string | null | undefined): number => {
  if (status === "COMPLETED") return 2;
  if (status === "IN_PROGRESS") return 1;
  return 0;
};
```

This mapping is not shared with the frontend's `Status` enum or the database enum, and the inverse mapping is not defined in one place.

### Impact
- Frontend and backend can disagree on whether a student assignment is "completed".
- Progress reports, assignment funnels, and due-date alerts can show stale or contradictory numbers.

### Recommendation
Centralize assignment status as a shared Zod enum in `@reading-advantage/types` and use it in the schema, API, and UI.

---

## Finding PB-005: Class accuracy report combines incommensurable score types

**Severity:** Medium
**Category:** Product Correctness / Reporting
**Affected file:** `server/controllers/class-accuracy-controller.ts:91-130`

### Evidence

The controller computes per-student accuracy as:

```typescript
const totalCorrect = mcqCorrect + openEndedCorrect;
const overallAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
```

MCQ correctness is binary (`isCorrect === true`), while open-ended correctness is `score >= 3 || rating >= 3`. Adding binary and thresholded counts and dividing by total attempts mixes two different scoring scales.

### Impact
- A class with many MCQ attempts and few open-ended attempts can have a misleadingly high or low overall accuracy.
- Teachers cannot trust the "overall accuracy" metric for instructional decisions.

### Recommendation
Report MCQ accuracy and open-ended accuracy separately; if a combined metric is required, weight by question type or use a normalized score.

---

## Finding PB-006: Open-ended scoring threshold is arbitrary and undocumented

**Severity:** Medium
**Category:** Product Correctness / Assessment
**Affected files:** `server/controllers/class-accuracy-controller.ts:105-108`, `server/controllers/question-controller.ts` (LAQ/SAQ grading)

### Evidence

```typescript
const openEndedCorrect = openEndedActivities.filter((a) => {
  const details = a.details as any;
  return details?.score >= 3 || details?.rating >= 3;
}).length;
```

The threshold `>= 3` is hard-coded with no rubric reference, no enum, and no alignment with the AI feedback scale used when grading SAQ/LAQ answers.

### Impact
- A "correct" open-ended answer in reports may not match the AI's qualitative feedback.
- Progress metrics and at-risk detection are inconsistent with the actual grading rubric.

### Recommendation
Define a shared scoring rubric enum and use it consistently in grading, feedback, and reporting.

---

## Finding PB-007: Activity target ID resolution is fragile and can misattribute progress

**Severity:** Medium
**Category:** Product Correctness / Data Persistence
**Affected file:** `server/controllers/user-controller.ts:169-198`

### Evidence

```typescript
const targetId = data.articleId || data.storyId || data.contentId || "";
let finalTargetId = targetId;
if (!finalTargetId && data.details?.articleId) {
  finalTargetId = data.details.articleId;
}
if (activityType === ActivityType.ARTICLE_RATING && finalTargetId.startsWith("cmesn" || finalTargetId.startsWith("cmeu"))) { ... }
```

Target ID is inferred from multiple optional fields and special-cased for rating activities. If a client omits or misorders fields, progress can be recorded against the wrong artifact.

### Impact
- A student's article completion may not be reflected on the article they actually read.
- XP and streak calculations can be tied to the wrong content.

### Recommendation
Require the client to send a single validated `targetId` and reject requests where it is missing or malformed.

---

## Finding PB-008: License-level fallback treats missing license data as Enterprise

**Severity:** Medium
**Category:** Product Correctness / Billing
**Affected files:** `server/controllers/question-controller.ts:25-63`, `server/controllers/user-controller.ts:37-66`

### Evidence

```typescript
if (!user.expiredDate) {
  return LicenseType.ENTERPRISE;
}
```

Both `getUserLicenseLevel` helpers return `ENTERPRISE` when the user has no `expiredDate`, even if they also have no `licenseId`. This means a user with missing/incomplete license data receives Enterprise feature gating (e.g., LAQ required for completion).

### Impact
- Free/missing-license users may be gated into Enterprise-only flows.
- Conversely, users who should have Enterprise may be downgraded to Basic if `expiredDate` is set but `licenseId` resolution fails.

### Recommendation
Make license level derive from the active `licenseOnUsers` / `licenses` record with explicit defaults; treat missing data as Basic, not Enterprise.

---

## Finding PB-009: Report controllers read session/params through unsafe casts

**Severity:** Medium
**Category:** Product Correctness / Type Safety
**Affected files:** `server/controllers/class-accuracy-controller.ts:6-13`, `server/controllers/system-dashboard-controller.ts:8`, `server/controllers/system-controller.ts:24`

### Evidence

```typescript
const session = (req as any).session;
const classroomId = (req as any).params?.classroomId;
```

`class-accuracy-controller.ts` relies on `session` and `params` being attached by middleware, but there is no compile-time guarantee. Several controllers also call `requireRole(["SYSTEM"] as any)(req)`.

### Impact
- A route that forgets to attach session/params can crash or bypass auth at runtime.
- Type casts hide contract drift between routes and controllers.

### Recommendation
Use a typed request context object built by middleware, or use the shared guard helpers that return the user context explicitly.

---

## Finding PB-010: No product-level tests for learning outcomes

**Severity:** High
**Category:** Test Gap / Product Correctness
**Affected files:** Entire `__test__/` directory

### Evidence

There are no tests that verify:
- Completing all question types marks an article as completed.
- XP awarded matches the configured XP table and is idempotent.
- A student at level N sees articles in the appropriate RA level range.
- FSRS card scheduling advances correctly per rating.
- Assignment due dates and status transitions behave as teachers expect.
- AI-generated articles pass readability/level validation.

Existing tests (`dashboard-summary-controller.test.ts`, `velocity-metrics.test.ts`, etc.) verify SQL structure or math helpers, not end-to-end learning behavior.

### Impact
- Product regressions in core learning loops are caught only in production or manual QA.
- The confidence to refactor controllers into a domain layer is low.

### Recommendation

Add behavior-focused integration tests for the core learning loops (article completion, XP idempotency, FSRS scheduling, assignment status transitions) using an in-memory or test-Postgres database.

---

## Line Review Synthesis

> This section was added during the line-review synthesis pass (`line-review-synthesis.md`) against baseline SHA `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`. The C-001..C-015 and PB-001..PB-010 finding IDs above are the aggregated triage names from the earlier sampled pass against baseline SHA `6921fda0`. The 51-batch line review (`line-review/ra-batch-00.md` through `line-review/ra-batch-50.md`) is the line-anchored source of truth behind those IDs.

### Source of truth

- **Coverage manifest:** [`line-review-coverage.md`](./line-review-coverage.md) records 1,016 in-scope tracked files, 51 batches (`ra-batch-00` through `ra-batch-50`), and the file-to-batch mapping.
- **Deduplicated synthesis:** [`line-review-synthesis.md`](./line-review-synthesis.md) §3 lists the highest-priority findings, each cross-referenced to the originating batch report and the line numbers in the affected file.
- **Per-batch reports:** `line-review/ra-batch-00.md` through `line-review/ra-batch-50.md` are the canonical evidence. The batches do not claim acceptance or closeout.

### Mapping from C-### / PB-### IDs to line-review synthesis IDs

| This document | Synthesis ID | Originating batch report(s) |
|---------------|--------------|------------------------------|
| C-001 (error response shapes) | H-09 | `ra-batch-09.md`, `ra-batch-11.md`, `ra-batch-13.md`, `ra-batch-44.md` |
| C-002 (status in body) | H-09 | `ra-batch-11.md` (`flashcard/progress/update`) |
| C-003 (unauthenticated sensitive) | H-03 | `ra-batch-09.md`, `ra-batch-10.md`, `ra-batch-13.md`, `ra-batch-16.md`, `ra-batch-44.md` |
| C-004 (no Zod validation) | H-02 | batches 09, 10, 11, 14, 44, 45, 46 |
| C-005 (duplicate auth routes) | (see `ra-batch-06.md`, `ra-batch-44.md`) | `ra-batch-06.md` (auth-controller), `ra-batch-44.md` (auth-controller) |
| C-006 (FSRS lacks validation) | H-22 | `ra-batch-11.md` |
| C-007 (classroom auth missing) | C-RA-CRIT-03 | `ra-batch-09.md` F-RA-B09-001..010; `ra-batch-45.md` |
| C-008 (no audit logging) | H-05 | `ra-batch-44.md` through `ra-batch-47.md`; `00-inventory.md` §10 |
| C-009 (console.log) | M-02 | every controller batch |
| C-010 (inconsistent empty states) | M-03 | batches 09, 11, 13, 16, 44, 45 |
| C-011 (race in flashcard) | H-22 | `ra-batch-11.md` |
| C-012 (next-connect boilerplate) | H-18 | `ra-batch-12.md`, `ra-batch-13.md` |
| C-013 (Google Translate SDK) | H-01 | `ra-batch-44.md` (`article-controller.ts:5,755-774`) |
| C-014 (Firebase admin remnant) | H-01 | `ra-batch-44.md` (`generator-controller.ts:1499-1599`) |
| C-015 (no response types) | (see §3.2 H-15) | `ra-batch-44.md` and others |
| PB-001 (XP double-award) | C-RA-CRIT-06 | `ra-batch-46.md` (`user-controller.ts:157-328`) |
| PB-002 (level-test JSON) | H-08 | `ra-batch-13.md`, `ra-batch-37.md`, `ra-batch-48.md` |
| PB-003 (AI content quality) | H-08 | `ra-batch-48.md` (article-generator), `ra-batch-49.md` |
| PB-004 (assignment status) | M-16 | `ra-batch-44.md`, `ra-batch-46.md` |
| PB-005 (class accuracy) | M-15 | `ra-batch-45.md`, `ra-batch-46.md` |
| PB-006 (open-ended threshold) | M-15 | `ra-batch-45.md`, `ra-batch-46.md` |
| PB-007 (targetId fragile) | M-13 | `ra-batch-46.md` (`user-controller.ts:169-198`) |
| PB-008 (license fallback) | M-14 | `ra-batch-46.md`, `ra-batch-47.md` |
| PB-009 (unsafe casts) | H-07 | `ra-batch-45.md`, `ra-batch-46.md`, `ra-batch-47.md` |
| PB-010 (no learning-loop tests) | §3.2 H-21 | `test-gaps.md` §5; re-confirmed in batches 00, 01, 09, 44 |

### Additional Critical items surfaced by the 51-batch review

The line review surfaced **seven additional Critical items** that the original sampled pass did not flag (see `line-review-synthesis.md` §3.1):

- **C-RA-CRIT-01** — Unauthenticated `submitRating` server action. (`ra-batch-01.md` F-RA-B01-001.)
- **C-RA-CRIT-02** — Session-token fabrication in `actions/pratice.ts`. (`ra-batch-01.md` F-RA-B01-002.)
- **C-RA-CRIT-04** — `refreshAIInsightsAutomated` is unauthenticated. (`ra-batch-44.md`.)
- **C-RA-CRIT-05** — Missing role check on admin `article-creation` and `management` pages. (`ra-batch-01.md` F-RA-B01-003, F-RA-B01-004.)
- **C-RA-CRIT-07** — Vacuous `implementation-validation.test.ts` (anti-pattern A4). (`ra-batch-00.md` H-01.)
- **C-RA-CRIT-08** — Five Jest 30 Phase 5 Red-proof tests reference archived track paths (anti-pattern A9). (`ra-batch-00.md` H-02.)
- Plus additional 22 High clusters and ~548 Medium items (see `line-review-synthesis.md` §3.2, §3.3).

### What this document does not do

- It does not enumerate the per-line evidence for every finding — that is the per-batch report's job.
- It does not claim acceptance or closeout. Phase 7 is pending. The prior `phase-acceptance-result.json` predates the 51-batch review and must be rerun or superseded.
- It does not include the M-RA-SEC-* and M-RA-PB-* remediation tracks — those live in `migration-tracks.md`.
