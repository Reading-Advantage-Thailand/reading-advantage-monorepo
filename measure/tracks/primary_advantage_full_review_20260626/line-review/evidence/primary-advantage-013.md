# Line Review Evidence: primary-advantage-013

Reviewer: measure-jr-green/primary-advantage-013
Files assigned: 10
Lines assigned: 210

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/app/api/assignments/[id]/progress/route.ts` | 1-9 | reviewed | 1 |
| `apps/primary-advantage/app/api/assignments/[id]/route.ts` | 1-19 | reviewed | 2 |
| `apps/primary-advantage/app/api/assignments/activity/[id]/route.ts` | 1-9 | reviewed | 1 |
| `apps/primary-advantage/app/api/assignments/route.ts` | 1-13 | reviewed | 2 |
| `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts` | 1-150 | reviewed | 5 |
| `apps/primary-advantage/app/api/auth/impersonate/route.ts` | 1-2 | reviewed | 0 |
| `apps/primary-advantage/app/api/auth/login/route.ts` | 1-2 | reviewed | 0 |
| `apps/primary-advantage/app/api/auth/logout/route.ts` | 1-2 | reviewed | 0 |
| `apps/primary-advantage/app/api/auth/register/route.ts` | 1-2 | reviewed | 0 |
| `apps/primary-advantage/app/api/auth/reset-password/route.ts` | 1-2 | reviewed | 0 |

## Findings

### LR-primary-advantage-013-001 — Assignments `route.ts` (POST) lacks authentication and tenant scoping on a state-mutating endpoint

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/assignments/route.ts:11-13` (cross-referenced with `apps/primary-advantage/server/controllers/assignmentController.ts:236-262`)
- Evidence: Lines 11-13 export `POST(request)` that delegates directly to `postAssignment(request)` from the assignment controller. The route itself does not call `currentUser()` and the controller at `assignmentController.ts:236-262` also does not call `currentUser()` or any role check — it only destructures `classroomId, articleId, students, name, description, dueDate` from `req.json()` (line 238-239) and forwards them to `createAssignment(...)` (line 241). There is no Zod validation of the body shape and no verification that the actor owns the classroom, is a teacher of the classroom, or is in the same school as the target classroom. An unauthenticated HTTP client can POST to `/api/assignments` with any `classroomId`/`articleId`/`students` payload and create assignments on behalf of any classroom in any school.
- Impact: Primary students are the audience for assignments, and unauthenticated assignment creation is a primary-student adaptation risk (inappropriate or confusing content targeted at primary children) and a fork-specific regression versus the Reading Advantage `app/api/assignments/route.ts`, which gates the same controller behind `requireRole(["teacher", "admin", "system"])` and validates the body.
- Recommendation: Add `await currentUser()` and `requireRole(["teacher", "admin", "system"])` at the top of `postAssignment` in the controller. Validate the body with a Zod schema (e.g., `z.object({ classroomId: z.string().uuid(), articleId: z.string().uuid(), students: z.array(...), name: z.string().min(1), description: z.string().optional(), dueDate: z.coerce.date().optional() })`) and return 400 on parse failure. Verify that `classroomId` is in the actor's `schoolId` and that the actor teaches that classroom (TEACHER case) or is admin/system. Wrap the controller call in `try/catch` so non-Error throws (e.g., string throws) still return a structured 500.

### LR-primary-advantage-013-002 — Assignments `route.ts` (GET) has no authentication, tenant filter, or pagination cap

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/assignments/route.ts:7-9` (cross-referenced with `apps/primary-advantage/server/controllers/assignmentController.ts:26-234`)
- Evidence: Lines 7-9 export `GET(request)` that delegates directly to `fetchAssignments(request)` without any auth or tenant filter. The controller at `assignmentController.ts:26-234` does not call `currentUser()` and accepts arbitrary query parameters — `classroomId`, `articleId`, `assignmentId`, `search`, `page`, `limit`. It runs `parseInt(searchParams.get("limit") || "10")` (line 34) without an upper bound, so a client can pass `?limit=10000` and force a full-table scan that joins `articles`, `classrooms`, and `studentAssignments` across every assignment row (lines 47-71 and 124-148). The controller also has a leftover `console.log("Do we get here?");` on line 38.
- Impact: An unauthenticated client can list every assignment in any school by passing `?classroomId=*` patterns or no filter at all. Combined with the lack of `users.schoolId` filtering, this is a cross-tenant data exposure path that returns assignments for primary-student classrooms. The pagination cap also enables resource exhaustion.
- Recommendation: Add `await currentUser()` and `requireRole(["teacher", "admin", "system"])` (with TEACHER scoped to own classroom) at the top of `fetchAssignments`. Cap `limit` at e.g. `Math.min(100, parsed)` and validate `page >= 1`. Filter all queries through `actor.schoolId` (join through `classrooms.schoolId`). Remove the `console.log("Do we get here?");` debug line.

### LR-primary-advantage-013-003 — `assignments/[id]/route.ts` GET delegates to controller with no auth or tenant scoping

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/app/api/assignments/[id]/route.ts:7-12` (cross-referenced with `apps/primary-advantage/server/controllers/assignmentController.ts:301-317`)
- Evidence: Lines 7-12 export `GET(request, { params })` that delegates to `fetchAssignmentById(request, { params })` with no auth or tenant check. The controller at `assignmentController.ts:301-317` does not call `currentUser()`. It extracts `id` from the path (line 306) and returns whatever `getAssignmentById(id)` returns for that ID. There is no school/classroom ownership verification.
- Impact: An unauthenticated client can fetch any assignment (including ones targeted at primary-student classrooms) by enumerating or guessing IDs. The same root cause applies to Reading Advantage's older routes that still rely on controller-level guards only.
- Recommendation: Add `await currentUser()` and verify the assignment's `classroomId.schoolId === actor.schoolId` (or admin bypass) before returning. Return 404 when not found in the actor's tenant to avoid leaking existence.

### LR-primary-advantage-013-004 — `assignments/[id]/route.ts` POST does not validate body shape before calling the controller

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/assignments/[id]/route.ts:14-19` (cross-referenced with `apps/primary-advantage/server/controllers/assignmentController.ts:319-350`)
- Evidence: Lines 14-19 export `POST(request, { params })` that delegates to `postUserLessonProgress(request, { params })`. The route handler itself does not validate the body; the controller at `assignmentController.ts:329` destructures `articleId, progress, timeSpent` directly from `await request.json()`. If any field is missing or mistyped (e.g., `progress` is a string instead of an array), the destructuring yields `undefined` and `updateUserLessonProgress` runs with undefined values, silently writing a malformed progress row. The route also has no rate limiting on a per-student progress-update endpoint.
- Impact: A primary student (or an attacker using a stolen session) can flood progress writes for the same `assignmentId`, potentially gaming XP/leaderboards. Malformed body writes corrupt the progress ledger.
- Recommendation: Validate the body in the controller with a Zod schema (`z.object({ articleId: z.string().uuid(), progress: z.array(z.number()), timeSpent: z.number().nonnegative() })`) and return 400 on parse failure. Add a per-user rate limit (e.g., 1 progress update per 5 seconds per assignment). Reject `progress` arrays whose sum is implausible.

### LR-primary-advantage-013-005 — `assignments/[id]/progress/route.ts` thin handler swallows controller errors

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/api/assignments/[id]/progress/route.ts:1-9` (cross-referenced with `apps/primary-advantage/server/controllers/assignmentController.ts:352-377`)
- Evidence: Lines 1-9 export `GET(request, { params })` that returns `await fetchUserLessonProgress(request, { params })` directly. There is no `try/catch` at the route boundary. The controller at `assignmentController.ts:352-377` calls `currentUser()` (good) and returns 401 when missing (lines 357-360), but on any thrown error it returns `NextResponse.json({ error: "Internal server error" }, { status: 500 })` (lines 371-374) without `console.error`'s stack or a structured error code. The route does not log when the controller throws.
- Impact: A primary-student progress-read failure produces a generic 500 with no observable context. The pattern is consistent across the assignments route family and needs explicit documentation that controllers own error shape.
- Recommendation: Either (a) wrap the route in `try/catch` and return a typed `NextResponse.json({ error: { code: "PROGRESS_FETCH_FAILED" } }, { status: 500 })`, or (b) document the convention in `line-review-protocol.md`/`workflow-map.md` that controllers own error shape and route handlers are intentionally thin. Add `console.error` with structured fields (request id, actor id, assignmentId).

### LR-primary-advantage-013-006 — `assignments/activity/[id]/route.ts` does not enforce tenant scoping on the activity fetch

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/assignments/activity/[id]/route.ts:1-9` (cross-referenced with `apps/primary-advantage/server/controllers/assignmentController.ts:379-398`)
- Evidence: Lines 1-9 export `GET(request, { params })` that delegates to `fetchAssignmentActivityById(request, { params })`. The controller at `assignmentController.ts:379-398` calls `currentUser()` (good) and returns 401 when missing, but only verifies that `user` is authenticated. There is no check that the requested `id` belongs to an assignment in the actor's `schoolId` and no check that the actor is a teacher/admin/system allowed to view activity. The controller's name is "activity by ID", which suggests per-student or per-assignment activity, but it does not enforce a tenant boundary.
- Impact: A primary-age student with a valid session can read the activity log of any assignment in any school by passing another school's assignment ID. The activity log may include student names, statuses, and timestamps — a primary-student data exposure path.
- Recommendation: After `currentUser()`, verify `actor.schoolId` matches the assignment's `classroom.schoolId` (TEACHER case) or that `actor.role` is admin/system. Return 404 when the assignment is not in the actor's tenant. Add `requireRole(["teacher", "admin", "system"])` if students should never see this endpoint.

### LR-primary-advantage-013-007 — `lesson-chatbot/route.ts` has no authentication or rate limit on an LLM-cost-incurring endpoint

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts:22-23,112-115`
- Evidence: Lines 22-23 export `POST(request)` with no `currentUser()` and no rate limiting. Lines 112-115 call `streamText({ model: openai(openaiModel), messages: [systemMessage, ...chatMessages] })` directly. The route accepts arbitrary `messages`, `title`, `passage`, `summary`, `image_description` payloads (Zod-validated only for shape, lines 7-20) and streams to OpenAI on every call. There is no per-user or per-IP rate limit, no auth check, and no usage cap. The "Thai explanation" branch (lines 56, 75) is a primary-student adaptation (i18n + age-appropriate tone) but the route is also reachable by unauthenticated clients.
- Impact: An unauthenticated client can flood `/api/assistant/lesson-chatbot` with arbitrary prompts, each of which streams a full OpenAI completion. This is a denial-of-wallet attack and a fork-specific regression versus the Reading Advantage equivalent, which gates the chatbot behind an authenticated session.
- Recommendation: Add `await currentUser()` at the top of the handler (before any work) and `requireRole(["student", "teacher", "admin", "system"])`. Add a per-user rate limit (e.g., 20 messages / hour). Add a max token cap on the streamed completion. Consider pinning to a cheaper model for primary students (the current `openaiModel` is opaque).

### LR-primary-advantage-013-008 — `lesson-chatbot/route.ts` collects the full LLM stream and returns a buffered 201, defeating the streaming capability

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts:117-137`
- Evidence: Lines 117-137 iterate `for await (const chunk of textStream)` (line 119), push each chunk into `streamChunks` (line 121), then `return NextResponse.json({ messages: "success", sender: "bot", text: fullMessage }, { status: 201 })` (lines 130-137). The route uses `streamText` from `@reading-advantage/ai` (line 112), which returns a streaming response object, but the handler collects every chunk into a single string and returns a buffered JSON. The user-visible benefit of streaming is lost (no TTFB improvement, no progressive render).
- Impact: A primary student sees the entire reply after the full LLM completion; the perceived latency is higher than it should be. This is also wasteful: the route waits for the full completion before responding, so the response shape forces the client to use a non-streaming fetch and cannot use `useChat` progressive rendering.
- Recommendation: Replace the buffered JSON with `return textStream.toTextStreamResponse()` (or equivalent from `@reading-advantage/ai`) and a content-type `text/event-stream` or `text/plain` response. Update the client to consume the stream. Document the choice in `workflow-map.md`.

### LR-primary-advantage-013-009 — `lesson-chatbot/route.ts` relies on prompt-only enforcement of the comprehension-question blacklist

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts:18-19,40-43,71-74`
- Evidence: Line 18 accepts `blacklistedQuestions: z.array(z.string()).optional().default([])` (Zod-validated). Lines 40-43 render the blacklist into the system prompt: `Blacklisted Questions (DO NOT answer these):\n${blacklistedQuestions.map(...).join("\n")}`. Lines 72-74 instruct the model: `If the user asks any of the blacklisted questions, respond with: "That is one of our article's comprehension questions..."`. Enforcement is prompt-only; a jailbroken user can still elicit the answer. The blacklist is also sent from the client (line 18), so a malicious client can submit an empty blacklist and bypass the restriction entirely.
- Impact: A primary-age student can read the lesson's comprehension questions by either (a) submitting an empty `blacklistedQuestions` array, or (b) phrasing the question differently enough that the model answers it. The intended pedagogical guardrail does not hold. This is a primary-student adaptation risk because the entire feature is positioned as a tutor that should not leak assessment answers.
- Recommendation: Move the blacklist to a server-side source keyed by `articleId` (e.g., a Drizzle table or a constant per article). Compute `isBlacklisted(text)` server-side and short-circuit the model call with a fixed refusal response. Also enforce semantic similarity (e.g., embeddings) rather than exact string match so rephrasing is caught.

### LR-primary-advantage-013-010 — `lesson-chatbot/route.ts` emits unstructured `console.error` for Zod validation failures

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts:138-149`
- Evidence: Lines 138-149 catch errors. If `error instanceof z.ZodError` (line 139), the code logs `console.error("Validation Error:", error.errors)` (line 140) and returns `NextResponse.json({ errors: error.errors }, { status: 400 })` (line 141). Otherwise it logs `console.error("ChatBot API Error:", error)` (line 144) and returns `NextResponse.json({ error: "Internal Server Error" }, { status: 500 })` (lines 145-148). The two log lines are unstructured and do not include a request id, actor id, or `articleId`. The 400 path also leaks the raw `error.errors` array (which may include internal Zod paths) to the client.
- Impact: Validation failures and server errors are not searchable in production logs. The 400 response leaks internal Zod shape to clients, which is acceptable for development but not for production.
- Recommendation: Replace `console.error` with the structured logger from `@reading-advantage/ai` (or root AGENTS.md observability guidance). Strip the `error.errors` array from the 400 response and return a generic `{ message: "Invalid input" }` plus a server-side structured log with the full Zod error.

### LR-primary-advantage-013-011 — `lesson-chatbot/route.ts` route accepts unbounded `messages` and `passage` payloads

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts:7-20`
- Evidence: Lines 7-20 declare `createLessonChatbotQuestionSchema` with `messages: z.array(z.object({ text: z.string(), sender: z.enum(["user", "bot"]) }))` (lines 8-13) and `passage: z.string()` (line 15) — there is no `.max()` on `text`, no `.max()` on `passage`, and no `.max()` length on the `messages` array. A client can submit a 1 MB passage and a 10,000-message history; each will be tokenized and sent to the model, incurring cost proportional to payload size.
- Impact: The endpoint can be used to drive a denial-of-wallet attack by sending large passages or large message histories. Combined with finding 007 (no auth/rate limit), the cost surface is unbounded.
- Recommendation: Cap each field with a reasonable max (`text: z.string().max(2000)`, `passage: z.string().max(20_000)`, `messages: z.array(...).max(50)`). Return 400 with a structured message on failure. Add an aggregate byte-size check before the model call.

### LR-primary-advantage-013-012 — `lesson-chatbot/route.ts` `@/utils/openai` import bypasses the shared AI adapter layer for client construction

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts:4-5`
- Evidence: Line 4 imports `openai, openaiModel` from `@/utils/openai`, while line 5 imports `streamText` from `@reading-advantage/ai`. The two imports are inconsistent: the model factory and model name live in the app-local `@/utils/openai`, but the stream wrapper lives in the shared `@reading-advantage/ai` package. AGENTS.md's provider-neutrality rule prefers keeping model construction inside the shared AI adapter so multiple apps do not fork provider selection. The shared adapter should expose `getChatModel()` (or a named model like `chatbot`) rather than forcing each app to re-export the provider.
- Impact: Each app can independently pin a different OpenAI model, drift from the shared adapter's intended defaults, and bypass provider abstraction that the rest of the monorepo depends on. This is a shared package migration blocker because the AI adapter layer cannot enforce consistent provider config if apps keep reaching past it.
- Recommendation: Move `openai` and `openaiModel` into `@reading-advantage/ai` as named exports (e.g., `chatbotModel`/`chatbotProvider`) and have the route import from there. Delete `@/utils/openai` if no other consumers exist, or migrate other consumers to the shared adapter in a follow-up track.

## No-Finding Notes

- `apps/primary-advantage/app/api/auth/impersonate/route.ts`: thin re-export of `handleImpersonate` from `@reading-advantage/api/routes/auth`. The shared implementation (`packages/api/src/routes/auth/impersonate.ts:39-154`) is gated by `NODE_ENV !== production` AND `IMPERSONATION_ENABLED === "true"`, validates the body with Zod (`impersonateSchema`, lines 28-30), creates a fresh session via `createSession(db, user.id)`, and uses HttpOnly secure cookies (lines 13-19). No findings from this thin re-export.
- `apps/primary-advantage/app/api/auth/login/route.ts`: thin re-export of `handleLogin` from `@reading-advantage/api/routes/auth`. The shared implementation (`packages/api/src/routes/auth/login.ts:42-202`) enforces rate limiting via `checkRateLimit(lowerUsername)` (line 58), uses the constant-time `DUMMY_HASH` for unknown-username timing protection (line 87), validates with Zod (`loginSchema`, lines 30-33), hashes via Argon2id, supports `rehashOnLogin` for bcrypt→Argon2id migration (line 160), and emits `auth:login` and `auth:login_failed` audit events (lines 145-150, 176-181). No findings from this thin re-export.
- `apps/primary-advantage/app/api/auth/logout/route.ts`: thin re-export of `handleLogout` from `@reading-advantage/api/routes/auth`. The shared implementation (`packages/api/src/routes/auth/logout.ts:12-28`) deletes the session from the DB and clears the `SESSION_COOKIE_NAME` cookie with `maxAge: 0` (lines 20-26). No findings from this thin re-export.
- `apps/primary-advantage/app/api/auth/register/route.ts`: thin re-export of `handleRegister` from `@reading-advantage/api/routes/auth`. The shared implementation (`packages/api/src/routes/auth/register.ts:28-138`) is gated by `requireRole(db, cookie, "TEACHER")` (line 45), enforces TEACHER tenant scoping (lines 53-58), checks for existing username (lines 61-72), and creates the user with role `STUDENT` and a credential account (lines 91-112). It does not create a session for the registered user (FR-16). No findings from this thin re-export.
- `apps/primary-advantage/app/api/auth/reset-password/route.ts`: thin re-export of `handleResetPassword` from `@reading-advantage/api/routes/auth`. The shared implementation (`packages/api/src/routes/auth/reset-password.ts:27-130`) is gated by `requireRole(db, cookie, "TEACHER")` (line 43), applies tenant scoping for TEACHER (lines 55-58, 75-77), enforces the authorization matrix (TEACHER can reset STUDENT in own school; ADMIN can reset STUDENT/TEACHER but not ADMIN, lines 71-83), revokes all sessions for the target user (line 111), and emits `auth:password_reset` audit event (lines 116-121). No findings from this thin re-export.

## Summary

- Total findings: 11 (2 Critical, 2 High, 4 Medium, 3 Low).
- Critical findings: LR-001 (POST `/api/assignments` no auth on state-mutating endpoint), LR-007 (lesson-chatbot no auth or rate limit on LLM-cost-incurring endpoint).
- Highest-impact fork-divergence categories for this batch: `Fork-specific regression` (missing auth on state-mutating endpoints, missing rate limiting on LLM path, streaming capability not used), `Primary-student adaptation risk` (no auth on activity fetch, prompt-only enforcement of comprehension-question blacklist, i18n leakage via Thai prompts), `Shared package migration blocker` (lesson-chatbot bypasses shared AI adapter for client construction).
- No source-code, plan.md, or `line-review-coverage.tsv` edits were made. The patch TSV is written under `line-review/coverage-patches/primary-advantage-013.tsv` and the evidence is in this file.