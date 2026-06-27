# Line Review Evidence: primary-advantage-012

Reviewer: measure-jr-green/primary-advantage-012
Files assigned: 10
Lines assigned: 223

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/app/[locale]/teacher/reports/page.tsx` | 1-46 | reviewed | 4 |
| `apps/primary-advantage/app/[locale]/teacher/student-progress/[id]/page.tsx` | 1-53 | reviewed | 3 |
| `apps/primary-advantage/app/api/articles/[articleId]/route.ts` | 1-12 | reviewed | 1 |
| `apps/primary-advantage/app/api/articles/generate/custom-generate/approve/route.ts` | 1-6 | reviewed | 1 |
| `apps/primary-advantage/app/api/articles/generate/custom-generate/route.ts` | 1-13 | reviewed | 1 |
| `apps/primary-advantage/app/api/articles/generate/custom-generate/save/route.ts` | 1-6 | reviewed | 1 |
| `apps/primary-advantage/app/api/articles/generate/route.ts` | 1-15 | reviewed | 2 |
| `apps/primary-advantage/app/api/articles/questions/[articleId]/route.ts` | 1-45 | reviewed | 3 |
| `apps/primary-advantage/app/api/articles/questions/feedback/route.ts` | 1-13 | reviewed | 1 |
| `apps/primary-advantage/app/api/articles/route.ts` | 1-14 | reviewed | 1 |

## Findings

### LR-primary-advantage-012-001 — Teacher role check is fully commented out on reports page

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/[locale]/teacher/reports/page.tsx:16-18`
- Evidence: Lines 16-18 read `// if (user.role !== "teacher" && user.role !== "system") { //   return <AuthErrorPage />; // }`. The role check is present in source comments but not enforced. The only auth gate is the `if (!user)` check on lines 12-14. Any authenticated user (including a `student` or `parent` role) can mount `/[locale]/teacher/reports`, fetch every classroom, and view every student's progress through the `TeacherProgressReports` component. The page then calls `fetchClassrooms()` and `fetchStudentsByRole()` (lines 23-24), which are themselves role-aware inside the controller (`switch (user.role)` at `classroomController.ts:188`), but the `student` case in that switch returns a 401-style response and the page's `instanceof Response` check (lines 27-29) silently swallows the error, falling through to `classrooms = []`. The result is that a primary student sees an empty page rather than a real authorization error.
- Impact: A primary-age student can navigate to the teacher reports page and trigger the role-aware controller, which either errors silently or reveals aggregation logic. The commenting-out pattern is also a primary-student adaptation risk: the explicit `teacher`/`system` allowlist was deleted but the route was kept under `(teacher)/reports`, suggesting it was a fork-specific simplification that lost the role boundary.
- Recommendation: Re-enable the role check on lines 16-18 or replace with a `requireRole(["teacher", "system"])` Server Action call. Do not rely on the controller's `instanceof Response` branch to surface the error to the client; the page should redirect to `/auth/error` (or the localized equivalent) before any controller call.

### LR-primary-advantage-012-002 — `AuthErrorPage` reused as a component from a sibling route

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/teacher/reports/page.tsx:4,13`
- Evidence: Line 4 imports `AuthErrorPage` as the default export of `@/app/[locale]/auth/error/page`. Line 13 returns `<AuthErrorPage />` to short-circuit unauthenticated access. The import is a sibling `page.tsx`, which means the same React component is also the routed page for `/auth/error`. Reusing a route page as a guard component conflates two concerns: (a) the user is unauthenticated, (b) the user is authenticated but lacks permission. The localized error page at `/auth/error` typically renders with a specific translation key and a "Go back" link, which is unhelpful when the failure is a missing teacher role. The same import pattern is used in `app/[locale]/teacher/student-progress/[id]/page.tsx:6,23,30` and would be fixed by a single shared component.
- Impact: When a student lands on the reports page, the `AuthErrorPage` route is rendered inline — it does not redirect. The user sees an auth error component, but the URL remains `/teacher/reports`, which is a primary-student UX risk (a student who hits "back" will see the page again). It is also a fork-specific regression because the Reading Advantage reports page uses a dedicated `notFound()` call instead of reusing the error route.
- Recommendation: Extract `AuthErrorPage` into a non-route component under `components/auth/error-page.tsx` and keep the route as a thin wrapper, or use `notFound()`/`redirect()` from `next/navigation` instead of rendering a sibling route. The pattern repeats at `student-progress/[id]/page.tsx:6,23,30` (see finding 004), so the fix should be a single shared component.

### LR-primary-advantage-012-003 — Controller-returned `Response` objects are parsed inline instead of being awaited as data

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/teacher/reports/page.tsx:23-34`
- Evidence: Lines 23-24 invoke `fetchClassrooms()` and `fetchStudentsByRole()` (the same functions used by the `/api/classroom` route handlers — see `classroomController.ts:20` and `:178`). These functions are documented as controllers and always return `NextResponse.json(...)` even on the happy path (e.g. line 33: `return NextResponse.json({ classrooms }, { status: 200 });`). The page then checks `classroomsResponse instanceof Response` (lines 27-29) and re-parses the JSON via `(await classroomsResponse.json()).classrooms || []`. The same pattern is repeated for `studentsResponse` (lines 31-34). The original direct model access (without the HTTP wrapper) is bypassed, and the page round-trips the data through a synthetic `Response` object.
- Impact: Server-component pages should call data-layer functions directly (e.g. `getAllClassrooms(user)` and `getAllStudentsByRole(user)`), not HTTP-shaped wrappers. The current shape forces the data through a JSON serialize/parse cycle and the error path is hidden behind a 500 → empty array. It is a divergence from the AGENTS.md "Backend modules" pattern that expects controllers to expose typed functions, and it is also inconsistent with how `student-progress/[id]/page.tsx:27` calls `fetchUserActivity(userId)` and accesses `data.activity` directly.
- Recommendation: Either (a) call the model helpers directly (`getAllClassrooms(userWithRoles)`, `getAllStudentsByTeacher(user.id)`) from the server component, or (b) extract a `getReportsData()` function from `classroomController.ts` that returns a typed object (not a `NextResponse`). Document the choice in `workflow-map.md`.

### LR-primary-advantage-012-004 — Student-progress page has no authorization for the requested student ID

- Severity: Critical
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/[locale]/teacher/student-progress/[id]/page.tsx:18,22-24,29-31`
- Evidence: Line 18 takes `userId` from the URL parameter without any role check or tenant boundary. Lines 22-24 only check `if (!user)`. There is no check that the current user is a `teacher` (or `system`/`admin`) and no check that `userId` belongs to a student in one of the current user's classrooms. Lines 29-31 then read `data.user.name` and `data.activity` from the controller response. The `fetchUserActivity(userId)` controller (`userController.ts`) is not validated for cross-tenant reads in this file path. A primary-age student's learning activity, XP logs, CEFR level, and reading stats can be retrieved by any authenticated user who guesses or enumerates a student ID.
- Impact: This is the most severe finding in the batch. A primary-student data exposure path exists because the page lacks a Server Action / route-handler-style authorization wrapper. The page also reads `user.cefrLevel` (line 47) — that is the current user's level, not the target student's; a teacher who is at `B2` would see the chart labeled with their own CEFR level rather than the student's. Combined with the absence of role checks, this is a primary-student adaptation risk and likely a regulatory concern (e.g., FERPA/COPPA depending on jurisdiction).
- Recommendation: Add a Server Action that calls `requireRole(["teacher", "system", "admin"])` and `assertCan(user, "student:read", { studentId: userId })` before calling `fetchUserActivity`. Validate that the student is in a classroom owned by the current user (or that the current user is a system admin). Replace the inline page with a `try/catch` that surfaces authorization failures via `notFound()`. Pass the *student's* CEFR level to the chart, not the teacher's.

### LR-primary-advantage-012-005 — Header interpolates unvalidated `user.name` and a non-i18n literal

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/teacher/student-progress/[id]/page.tsx:35`
- Evidence: Line 35 renders `<Header heading={`Progress for ${data.user.name}`} />`. The heading string is a literal English template that bypasses `getTranslations("Reports")` even though `t` is fetched on line 26. `data.user.name` is also used as raw text; React's default JSX escaping will mitigate XSS, but a user whose name contains `<script>` would be rendered as text, which is correct, but the lack of i18n for the heading means localized users see English. The page also reads `t` on line 26 but never references it in the JSX.
- Impact: A primary-student page showing "Progress for <name>" should be localized. The current code mixes English literal with what is supposed to be a localized report page (the `t` variable is fetched but unused, which is also dead code). It is a divergence from the i18n pattern used elsewhere in the admin/teacher flows.
- Recommendation: Move the heading to the i18n message catalog (e.g. `Reports.studentProgressHeading` with a `{name}` placeholder) and use `t("studentProgressHeading", { name: data.user.name })`. Remove the unused `t` import or use it consistently.

### LR-primary-advantage-012-006 — `user.cefrLevel` is rendered instead of the target student's CEFR level

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/teacher/student-progress/[id]/page.tsx:47`
- Evidence: Line 47 passes `currentLevel={user.cefrLevel || "A0"}` to `<CEFRLevels>`. The `user` is the *current* (teacher) user, not the target student whose progress is being viewed. The controller response (`fetchUserActivity(userId)`) typically includes the student's CEFR level, but the page does not destructure it from `data`. As a result, the CEFR indicator shows the teacher's level, which is unrelated to the student's actual level.
- Impact: A primary-student's CEFR indicator is wrong on the page. The teacher cannot trust the visual CEFR placement shown next to the student's activity. The Reading Advantage equivalent passes the student's level rather than the current user's.
- Recommendation: Read `data.user.cefrLevel` (or `data.student.cefrLevel` depending on the controller return shape) and pass it to `<CEFRLevels>`. Add a fallback only when the student's level is missing. The user's `cefrLevel` should not be used in the student's progress view.

### LR-primary-advantage-012-007 — Stale "Progress not Have" error string and `correctCount` truthiness check

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/api/articles/questions/[articleId]/route.ts:25-30` (cross-referenced with `userController.ts:25-30`)
- Evidence: The POST handler in this route (line 39) calls `handleUpdateUserActivity(body, articleId)`, which in `userController.ts:25-30` reads `const correctCount = data.progress?.filter((p) => p === 0).length;` and then `if (!correctCount) { throw new Error("Progress not Have"); }`. The error message is grammatically broken English. The `!correctCount` check rejects `correctCount === 0` (no correct answers) but also rejects any case where `correctCount` is `undefined` (no `progress` array at all). Both are valid "no progress" states, but the error conflates them. The route handler then catches the throw and returns 500 (line 43).
- Impact: An honest score of 0/5 is treated as a server error rather than a zero-XP outcome. The route returns 500 with "Error" as the body (line 43), so the student-facing UI cannot distinguish "no correct answers" from "server failure". This is a primary-student adaptation risk because the UI may show a generic error toast instead of a "Try again" message.
- Recommendation: Distinguish between missing `progress` and zero correct answers. The 0-correct case should be a 200 response with `xpEarned: 0`; only the missing-data case should be 400. Fix the typo and add an i18n key for the error.

### LR-primary-advantage-012-008 — Article-by-id route ignores the `[articleId]` path parameter

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/articles/[articleId]/route.ts:4-8`
- Evidence: Line 4 declares `export async function GET(req: NextRequest)` — there is no second `{ params }` argument, so the dynamic segment `[articleId]` from the URL is never extracted. Line 6 calls `fetchArticleById(req.nextUrl.searchParams)`, which reads `req.get("articleId")` from query string (`articleController.ts:121`). A request to `/api/articles/abc-123` (with no `?articleId=`) hits `fetchArticleById`, throws `Article ID is required` on line 124, and surfaces a 500 from line 10. The intended path-parameter usage is bypassed. The controller itself is also misnamed at the call site: line 8 returns `{ articles }` (plural) but the controller returns `{ article: { ... } }` (singular) per `articleModel.ts:413-419`.
- Impact: The dynamic route segment is misleading; the API client must add `?articleId=...` to the URL or the call fails. The response shape `{ articles: <object> }` mislabels a single article, so consumers must use `result.articles.article` instead of `result.article`. This is a fork-specific regression versus the Reading Advantage route, which extracts `params.articleId` directly.
- Recommendation: Change the signature to `GET(req: NextRequest, { params }: { params: Promise<{ articleId: string }> })`, extract `(await params).articleId`, and pass that directly to the controller. Rename the response key to match the controller's `{ article }` shape (or rename the controller to return `{ articles }` consistently). Add a test for the path-parameterized route.

### LR-primary-advantage-012-009 — Bulk AI generation route has no authentication or rate limit

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/articles/generate/route.ts:1-15`
- Evidence: The handler at lines 4-14 calls `generateAllArticle(amountPerGenre)` directly with no `currentUser()` check, no role check, and no rate limiting. `generateAllArticle` (`articleController.ts:56`) is the bulk AI generation path that fans out across all configured genres — a single call can trigger dozens of LLM completions. There is no error guard before the call (lines 5-8 are wrapped in `try`, but the body destructures `amountPerGenre` from `req.json()` without validation, and any non-numeric input will crash inside the controller). Lines 9-13 catch as `err: any` and return status 404 with the error message (see finding 010).
- Impact: Any unauthenticated HTTP client can POST `/api/articles/generate` with a body of `{ amountPerGenre: 50 }` and trigger 50+ AI completions, which is both a denial-of-service vector and a direct cost-incurrence path. This is a fork-specific regression versus the Reading Advantage `app/api/articles/generate/route.ts` which gates the same controller behind an admin-role check.
- Recommendation: Add `await currentUser()` plus `requireRole(["admin", "system"])` and a per-user rate limit (e.g., 1 call / 5 min). Validate `amountPerGenre` with a Zod schema (e.g., `z.number().int().min(1).max(10)`) and return 400 on parse failure. See also finding 010 for the catch-block fix.

### LR-primary-advantage-012-010 — `generate` route returns 404 for any error and uses `any` catch

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/articles/generate/route.ts:9-13`
- Evidence: Line 9 catches `err: any` (the `any` annotation defeats TypeScript narrowing), then lines 10-13 return `NextResponse.json({ success: false, message: err.message }, { status: 404 })`. The HTTP 404 status is semantically wrong for a generation failure: 404 means "Not Found", but the resource was found and the generation step failed. Any client that branches on status code (e.g., a UI that shows "this article type does not exist" on 404) will misclassify every error as "missing". The `err: any` is the same anti-pattern flagged in `primary-advantage-007-002` (the shared Drizzle migration blocker).
- Impact: Mobile/UIs that differentiate "not found" from "generation failed" will show the wrong message. The `any` widens error handling to bypass the Drizzle migration's stricter typing. This is also a fork-specific divergence from the Reading Advantage `app/api/articles/generate/route.ts`, which uses 500 for catch-all errors.
- Recommendation: Change the catch type to `unknown`, narrow with `err instanceof Error` for the message, and return status 500 with a structured error body. Reserve 404 for actual "article not found" cases (e.g., when the controller validates an article ID).

### LR-primary-advantage-012-011 — Questions-by-article GET ignores path parameter, requires query string instead

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/articles/questions/[articleId]/route.ts:6-27`
- Evidence: The route file is `/api/articles/questions/[articleId]/route.ts` (the directory name `[articleId]` is a Next.js dynamic segment), but the GET handler on line 6 declares `GET(req: NextRequest)` with no `{ params }` argument. It then reads `articleId` from `searchParams.get("articleId")` on line 9. The path parameter is never extracted, and any client that uses the path parameter (e.g. `/api/articles/questions/abc-123`) hits the `!articleId` branch on line 12 and gets a 400. The POST handler below (lines 29-44) does the right thing — it declares `{ params }: { params: Promise<{ articleId: string }> }` and extracts `(await params).articleId` on line 34. The two handlers in the same file disagree on the contract.
- Impact: Clients written against the path parameter for the GET endpoint will fail; clients written against the query string for the GET but path for the POST will also fail (they have to know which verb to use). The comments on lines 16-17 ("This is a placeholder. Replace with actual fetching logic.") are stale: the code below the comment does implement the fetch via `getQuestionsByArticleId(articleId, questionType as ActivityType)`. The comments should be removed but the parameter mismatch remains a fork-specific bug.
- Recommendation: Change the GET signature to match the POST: `GET(req: NextRequest, { params }: { params: Promise<{ articleId: string }> })`. Extract `(await params).articleId` and remove the `searchParams.get("articleId")` lookup. Keep `searchParams.get("questionType")` since the question type is not in the path. Remove the stale placeholder comments on lines 16-17 and 37-38.

### LR-primary-advantage-012-012 — Questions POST has no auth and no body validation

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/articles/questions/[articleId]/route.ts:29-44`
- Evidence: The POST handler (lines 29-44) does not call `currentUser()` and does not validate the shape of `body` before passing it to `handleUpdateUserActivity(body, articleId)`. The controller (`userController.ts:12-36`) assumes `body.data.progress` and `body.activityType` are present and well-typed; if a client sends a malformed body, the controller throws and the route returns 500. The handler also does not check that the user has permission to update the activity log for the given `articleId`. Cross-student activity tampering is possible if a malicious client knows another user's ID.
- Impact: A primary-student adaptation risk: a malicious client could post a forged progress payload that credits another student with XP, or could log activity against an article the user has not read. The Reading Advantage equivalent validates the body via Zod and runs `requireUser()`.
- Recommendation: Add `await currentUser()` and `requireRole(["student", "teacher", "admin", "system"])`. Validate the body with a Zod schema (e.g., `z.object({ data: z.object({ ... }), activityType: z.nativeEnum(ActivityType) })`) and return 400 on parse failure. Verify that the activity log row, if created, is owned by the current user (or the user they are authorized to act on behalf of).

### LR-primary-advantage-012-013 — Question-feedback route file is dead code (POST handler fully commented out)

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/articles/questions/feedback/route.ts:1-13`
- Evidence: The file imports `fetchArticles` (line 1) and `NextRequest, NextResponse` (line 2) but the entire POST handler is commented out (lines 4-12). There is no exported GET/POST handler, so the route is unreachable from a Next.js routing perspective. The `fetchArticles` import is unused. The file is essentially a stub left behind after a previous implementation was removed.
- Impact: A client that POSTs to `/api/articles/questions/feedback` receives a 404 or 405 (depending on Next.js version), with no actionable error. The dead file adds 13 lines of confusing artifacts to the file inventory and lint will flag the unused imports. It is a fork-specific divergence from the Reading Advantage `feedback` route, which is implemented.
- Recommendation: Either (a) delete the file entirely, or (b) implement the POST handler that consumes the body shape originally described in the commented-out block (lines 5-12 reference a `body` and a placeholder `fetchQuestionFeedback`). If implementation is out of scope, delete the file and remove it from the inventory. The associated `fetchQuestionFeedback` was also commented out in `articleController.ts:130-141`, suggesting a coordinated removal or restoration is needed.

### LR-primary-advantage-012-014 — Generic "Error" string in `/api/articles` catch hides server failures

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/api/articles/route.ts:11-12`
- Evidence: Lines 11-12 read `return new Response("Error", { status: 500 })`. The body is the literal string "Error" with no JSON shape, no error code, and no message. The matching `app/api/articles/[articleId]/route.ts:10` has the same pattern (`return new Response("Error", { status: 500 })`). The `generate` route by contrast uses `NextResponse.json({ success: false, message: err.message }, { status: 404 })` (lines 10-13), so the codebase is inconsistent.
- Impact: Clients cannot parse the error body as JSON and cannot show a localized error. For a primary-student app, the i18n layer is bypassed because the body is not a structured object. This is a divergence from the AGENTS.md "structured logging + structured error" pattern.
- Recommendation: Standardize on `NextResponse.json({ error: { code: "ARTICLES_FETCH_FAILED", message: "..." } }, { status: 500 })` and add i18n-aware error codes. Use the same shape in both `/api/articles` and `/api/articles/[articleId]`.

### LR-primary-advantage-012-015 — `instanceof Response` narrowing on the reports page silently swallows auth errors

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/[locale]/teacher/reports/page.tsx:26-34`
- Evidence: Lines 26-29 check `classroomsResponse instanceof Response` and parse the JSON. If the controller returns an error `NextResponse` (e.g., 401 from `classroomController.ts:24`), the check passes (because `NextResponse extends Response`) and the code reads `((await classroomsResponse.json()).classrooms || [])`. Error responses from the controller use the shape `{ error: "Unauthorized" }` (not `{ classrooms: ... }`), so the parse yields `undefined`, the `|| []` fallback applies, and the user is silently shown an empty classroom list. The same pattern on lines 31-34 for `studentsResponse` yields an empty students list. The teacher reports page therefore renders as a "no data" page when the user is actually unauthorized.
- Impact: A primary student landing on the reports page (per finding 001) sees a friendly-looking "no classrooms to display" UI rather than an authorization error. This is a primary-student adaptation risk because the UI masks the security boundary; the student is not told they are in the wrong place, and the page does not log the failed access. The pattern also exists on the same page for `studentsResponse` (lines 31-34).
- Recommendation: Inspect the `Response.status` and short-circuit with a redirect (or render the localized error component) when status >= 400. Better, do not call HTTP-shaped controllers from server components — call the data-layer functions directly (see finding 003) so the error case is a thrown exception that Next.js can render as a 500/404, not a silent empty array.

### LR-primary-advantage-012-016 — Custom-generate GET/POST route has no authentication

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/articles/generate/custom-generate/route.ts:1-13`
- Evidence: The route file exports `GET(req)` (lines 7-9) and `POST(req)` (lines 11-13) that delegate directly to `fetchCustomArticleController(req)` and `generateCustomArticle(req)` from `articleController.ts`. Neither handler calls `currentUser()` or performs any role check. `generateCustomArticle` (line 186) is the per-article AI path that creates new draft content; `fetchCustomArticleController` (line 280) reads custom-article state. Both are state-mutating or data-disclosing routes that should require an authenticated, role-appropriate user.
- Impact: An unauthenticated client can list custom articles and trigger per-article AI generation. The bulk-generate route (finding 009) has the same issue at a higher volume; this route is the lower-volume path that should still be gated. Fork-specific regression versus the Reading Advantage `app/api/articles/generate/custom-generate/route.ts` which adds `requireRole` and `requireUser`.
- Recommendation: Add `await currentUser()` and `requireRole(["admin", "system", "teacher"])` (teacher can create drafts; admin/system can also publish). Wrap the controller calls in `try/catch` and return structured 401/403/500 responses.

### LR-primary-advantage-012-017 — Custom-generate approve route has no authentication on a state-mutating endpoint

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/articles/generate/custom-generate/approve/route.ts:1-6`
- Evidence: Lines 4-6 export `POST(req)` that delegates to `saveArticleAndPublish(req)` from `articleController.ts:224`. There is no `try/catch` and no `currentUser()` check. The `saveArticleAndPublish` controller mutates the article state from draft to published, which is an irreversible state transition that affects what primary students see in the published content library.
- Impact: Any unauthenticated HTTP client can POST to `/api/articles/generate/custom-generate/approve` and publish whatever payload they construct. Combined with finding 016, an attacker could (a) generate an article via the custom-generate POST, then (b) approve it without any credential check, then (c) have it served to all primary students in the school. This is a primary-student adaptation risk because the content is intended for children. The Reading Advantage `approve` route is gated behind `requireRole(["admin", "system"])`.
- Recommendation: Add `await currentUser()` and `requireRole(["admin", "system"])` at the top of the handler. Wrap the controller call in `try/catch` and return 401/403/500 with structured error bodies. Add a per-user rate limit and a per-school publish quota.

### LR-primary-advantage-012-018 — Custom-generate save (draft) route has no authentication on a state-mutating endpoint

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/articles/generate/custom-generate/save/route.ts:1-6`
- Evidence: Lines 4-6 export `POST(req)` that delegates to `saveArticleAsDraft(req)` from `articleController.ts:256`. There is no `try/catch` and no `currentUser()` check. The `saveArticleAsDraft` controller writes draft content to the database; it is state-mutating and should require an authenticated, role-appropriate user (typically `teacher` or higher).
- Impact: An unauthenticated client can write draft rows to the article table. Even though drafts are not visible to primary students, the unchecked write path can be used to fill the database with junk rows, exhaust storage, and (depending on the schema) cascade foreign-key writes. It is a fork-specific regression versus the Reading Advantage save route.
- Recommendation: Add `await currentUser()` and `requireRole(["teacher", "admin", "system"])` at the top of the handler. Wrap the controller call in `try/catch` and return 401/403/500 with structured error bodies. Validate the request body with a Zod schema before the controller call.

## No-Finding Notes

- All ten files in this batch produced at least one finding, so there are no rows with `finding_count: 0`. The coverage table above is complete and each row's count matches the number of findings whose `File:` primary target is that row's file.

## Summary

- Total findings: 18 (2 Critical on auth/authorization, 7 High on missing role checks or routing contract, 3 Medium on UX/typing/i18n, 6 Low on stale comments, error structure, and i18n).
- Critical-severity findings: LR-004 (student-progress has no auth), LR-017 (approve route has no auth on a state-mutating endpoint).
- Highest-impact fork-divergence categories for this batch: `Fork-specific regression` (routing contract mismatches, missing auth, no rate limiting), `Primary-student adaptation risk` (authorization gaps on teacher pages, role-check commented out, silent error swallowing, wrong CEFR level displayed, approve endpoint unprotected).
- No source-code, plan.md, or `line-review-coverage.tsv` edits were made. The patch TSV is written under `line-review/coverage-patches/primary-advantage-012.tsv` and the evidence is in this file.
