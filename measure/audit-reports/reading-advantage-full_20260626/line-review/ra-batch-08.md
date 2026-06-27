# Line-by-Line Review: Reading Advantage — Batch 08

**Track ID:** `reading_advantage_full_review_20260626`  
**Batch ID:** `ra-batch-08`  
**Baseline SHA:** `6921fda0ee45012232bdd71c444d4e9523a10ab6`  
**Current HEAD:** `d348666be047b929d02c747120c32d2ea0fc53fc`  
**Review Date:** 2026-06-27  
**Reviewer Role:** A — correctness / product behavior / anti-patterns  

---

## Scope

All 20 files listed in the batch were reviewed in full, line by line. These are the API route entry points under `apps/reading-advantage/app/api/v1/` for articles, questions, assignments, assignment notifications, and assistant chat. Because the route files are thin wrappers around `server/controllers/*`, the review also inspected the called controllers to determine whether route-level wiring gaps are mitigated downstream.

| # | File | Lines Reviewed |
|---|------|----------------|
| 1 | `apps/reading-advantage/app/api/v1/articles/[article_id]/questions/laq/[question_id]/route.ts` | 1–38 |
| 2 | `apps/reading-advantage/app/api/v1/articles/[article_id]/questions/laq/route.ts` | 1–37 |
| 3 | `apps/reading-advantage/app/api/v1/articles/[article_id]/questions/mcq/[question_id]/route.ts` | 1–38 |
| 4 | `apps/reading-advantage/app/api/v1/articles/[article_id]/questions/mcq/route.ts` | 1–47 |
| 5 | `apps/reading-advantage/app/api/v1/articles/[article_id]/questions/sa/[question_id]/rate/route.ts` | 1–38 |
| 6 | `apps/reading-advantage/app/api/v1/articles/[article_id]/questions/sa/[question_id]/route.ts` | 1–38 |
| 7 | `apps/reading-advantage/app/api/v1/articles/[article_id]/questions/sa/route.ts` | 1–39 |
| 8 | `apps/reading-advantage/app/api/v1/articles/[article_id]/route.ts` | 1–41 |
| 9 | `apps/reading-advantage/app/api/v1/articles/[article_id]/translate/route.ts` | 1–15 |
| 10 | `apps/reading-advantage/app/api/v1/articles/generate/custom-generate/route.ts` | 1–29 |
| 11 | `apps/reading-advantage/app/api/v1/articles/generate/custom-generate/user-generated/[articleId]/route.ts` | 1–26 |
| 12 | `apps/reading-advantage/app/api/v1/articles/generate/custom-generate/user-generated/route.ts` | 1–30 |
| 13 | `apps/reading-advantage/app/api/v1/articles/generate/route.ts` | 1–23 |
| 14 | `apps/reading-advantage/app/api/v1/articles/genres/route.ts` | 1–24 |
| 15 | `apps/reading-advantage/app/api/v1/articles/route.ts` | 1–45 |
| 16 | `apps/reading-advantage/app/api/v1/articles/validate/route.ts` | 1–23 |
| 17 | `apps/reading-advantage/app/api/v1/assignment-notifications/route.ts` | 1–62 |
| 18 | `apps/reading-advantage/app/api/v1/assignments/route.ts` | 1–63 |
| 19 | `apps/reading-advantage/app/api/v1/assistant/chatbot-question/route.ts` | 1–24 |
| 20 | `apps/reading-advantage/app/api/v1/assistant/chatbot/route.ts` | 1–24 |

**No file was partially reviewed.**

---

## Executive Summary

This batch exposes the route surface for the core reading/article domain. The route files themselves are conventional `next-connect` wrappers, but several of them have wiring inconsistencies, missing auth guards, and no tenant scoping. More importantly, the controllers they call lack the validation and scoping that the route layer does not provide, so the gaps are not mitigated downstream.

The most severe issues are:

1. **Unauthenticated translate endpoint** (`/articles/[article_id]/translate`) — no `protect` or `restrictAccessKey` middleware, and the controller does not verify the caller either.
2. **Unrestricted article deletion** (`DELETE /articles/[article_id]`) — any authenticated user can delete any article because the route only uses `protect` and the controller performs no ownership or role check.
3. **No school/tenant scoping** across article, question, generator, and assistant routes — directly contrary to `AGENTS.md` multi-tenancy rules.
4. **XP correctness holes** — SA answers award a fixed 3 XP regardless of quality, SA ratings add the raw client `rating` value directly to user XP without range validation, and MCQ retakes reset progress without idempotency controls, enabling XP farming.
5. **AI/content-safety gaps** — chatbot routes accept arbitrary user messages and forward them to OpenAI with only prompt-level guardrails; no input length limits, moderation API, or output filtering.

---

## Findings

### Critical / High

#### H-01 — `/articles/[article_id]/translate` is unauthenticated
- **File:** `apps/reading-advantage/app/api/v1/articles/[article_id]/translate/route.ts`
- **Lines:** 1–15 (entire file)
- **Severity:** High
- **Evidence:**
  - Line 1 only imports `translateArticleSummary`.
  - Lines 10–14 export a `POST` handler that immediately delegates to `translateArticleSummary(request, context)`.
  - No `protect`, `restrictTo`, or `restrictAccessKey` middleware is applied.
  - The controller (`server/controllers/article-controller.ts:820–925`) accepts `NextRequest` (not `ExtendedNextRequest`) and never calls `getCurrentUser()` or validates an access key.
- **Impact:** Any unauthenticated caller can translate any article summary and cause GPT/Google Translate calls and database writes (`translatedSummary` is persisted at line 895–898). This is a direct cost, data-poisoning, and abuse vector.
- **Fix:** Add `router.use(protect)` (or `restrictAccessKey` if this is meant for cron/service use) and pass an `ExtendedNextRequest` to the controller so the caller is known.

#### H-02 — `DELETE /articles/[article_id]` allows any authenticated user to delete any article
- **File:** `apps/reading-advantage/app/api/v1/articles/[article_id]/route.ts`
- **Lines:** 1–41
- **Severity:** High
- **Evidence:**
  - Line 19: `router.use(protect)`.
  - Line 21: `router.delete(deleteArticle)`.
  - The controller (`server/controllers/article-controller.ts:416–446`) checks only that the article exists, then deletes it. No role check, no ownership check, no school scoping.
- **Impact:** A student or any authenticated user can delete public articles, user-generated articles, or curriculum content created by others.
- **Fix:** Apply `restrictTo(Role.ADMIN, Role.SYSTEM)` or enforce owner/admin deletion in the controller. The route should not expose delete to all authenticated users.

#### H-03 — No tenant (`schoolId`) scoping at the route or controller level
- **Files:** All 20 route files
- **Severity:** High
- **Evidence:**
  - `AGENTS.md` states: "Every query must be scoped by `schoolId`. Check `user.schoolId` or `tenant.schoolId`. Never trust tenant IDs from the frontend without verifying the user has access."
  - Article controllers (`article-controller.ts`, `question-controller.ts`, `generator-controller.ts`) query `articles`, `users`, `userActivity`, `assignments`, `classrooms`, etc. by `id` or `userId` only — never by `schoolId`.
  - `assignment-controller.ts` has `checkClassroomAccess`, but for `ADMIN` it only compares `users.schoolId === classrooms.schoolId`; it does not verify the user's own `schoolId` is allowed for the requested scope, and `TEACHER`/`SYSTEM` paths ignore `schoolId` entirely.
- **Impact:** Cross-tenant data leakage and mutation. A user from school A can read, answer questions for, generate, translate, or (combined with H-02) delete articles belonging to school B.
- **Fix:** Add a tenant-scoping middleware or require controllers to join/filter by the session user's `schoolId`. REFERENTIAL tables (e.g., `classroomStudents`) must use `tenantDb.unscoped("reason")` with explicit owner-FK checks per `AGENTS.md`.

#### H-04 — SA rating awards unbounded XP based on client input
- **File:** `apps/reading-advantage/app/api/v1/articles/[article_id]/questions/sa/[question_id]/rate/route.ts`
- **Lines:** 1–38
- **Severity:** High
- **Evidence:**
  - The route is protected and delegates to `rateSAQuestion`.
  - The controller (`server/controllers/question-controller.ts:1342–1427`) reads `const { rating } = await req.json();` and, after a duplicate-rating guard, does:
    - Line 1395: `const updatedXp = user.xp + rating;`
    - Line 1403: `xpEarned: rating`
  - There is no validation that `rating` is within an expected range (e.g., 1–5).
- **Impact:** A user can send `rating: 1000000` and instantly inflate their XP.
- **Fix:** Validate `rating` in the controller (e.g., `z.number().int().min(1).max(5)`). Map the validated rating to a fixed XP value rather than using the raw rating as XP.

#### H-05 — MCQ retake resets XP without preventing re-farming
- **File:** `apps/reading-advantage/app/api/v1/articles/[article_id]/questions/mcq/route.ts`
- **Lines:** 1–47
- **Severity:** High
- **Evidence:**
  - Line 18: `router.delete(retakeMCQuestion)`.
  - The controller (`server/controllers/question-controller.ts:949–1023`) deletes all MCQ activities and XP logs for the article and recomputes `totalXp` from remaining logs.
  - After reset, the user can answer the same 5 questions again and re-earn up to 5 XP.
- **Impact:** XP farming by repeatedly retaking the same MCQ set. There is no rate limit, no audit log, and no cap on retakes per article.
- **Fix:** Limit retakes (e.g., one per day, or require teacher/admin action), log retakes as an audit event, and consider capping MCQ XP per article.

#### H-06 — Route exports HTTP methods that are not registered in the router
- **Files:**
  - `articles/[article_id]/questions/laq/[question_id]/route.ts:20–28` (exports `GET` but only registers `router.post(answerLAQuestion)`)
  - `articles/[article_id]/questions/laq/route.ts:29–37` (exports `POST` but only registers `router.get(getLAQuestion)`)
  - `articles/[article_id]/questions/mcq/[question_id]/route.ts:20–28` (exports `GET` but only registers `router.post(answerMCQuestion)`)
  - `articles/[article_id]/questions/sa/[question_id]/rate/route.ts:20–28` (exports `GET` but only registers `router.post(rateSAQuestion)`)
  - `articles/[article_id]/questions/sa/[question_id]/route.ts:20–28` (exports `GET` but only registers `router.post(answerSAQuestion)`)
  - `articles/[article_id]/questions/sa/route.ts:31–38` (exports `POST` but only registers `router.get(getSAQuestion)`)
- **Severity:** Medium-High
- **Evidence:** In each file, an HTTP method is exported at the Next.js App Router level but no corresponding `router.get/post/...` handler is registered. `router.run()` with no matching handler will not return a `NextResponse`, causing the exported wrapper to fall through to `throw new Error("Expected a NextResponse from router.run")`.
- **Impact:** Internal server errors on legitimate HTTP verbs instead of clean 405 Method Not Allowed responses. It also suggests copy-paste drift.
- **Fix:** Remove the unregistered exported handlers or register a handler that returns `405`. Prefer declaring only the exported methods that are wired.

#### H-07 — `/articles/generate/custom-generate/user-generated/[articleId]` imports unused functions
- **File:** `apps/reading-advantage/app/api/v1/articles/generate/custom-generate/user-generated/[articleId]/route.ts`
- **Lines:** 1–9
- **Severity:** Medium
- **Evidence:**
  - Lines 1–5 import `approveUserArticle`, `getUserGeneratedArticles`, `updateUserArticle`, `protect`, `generateUserArticle`.
  - Only `protect` and `updateUserArticle` are used (lines 21, 23).
- **Impact:** Dead imports clutter the file and mislead readers about what the route supports. The route path suggests article-specific update only, so the extra generator imports are confusing.
- **Fix:** Remove unused imports.

#### H-08 — `/articles/generate/custom-generate/user-generated` imports unused functions
- **File:** `apps/reading-advantage/app/api/v1/articles/generate/custom-generate/user-generated/route.ts`
- **Lines:** 1–9
- **Severity:** Medium
- **Evidence:**
  - Lines 1–5 import `approveUserArticle`, `getUserGeneratedArticles`, `updateUserArticle`, `protect`, `generateUserArticle`.
  - Only `protect`, `getUserGeneratedArticles`, and `approveUserArticle` are used (lines 20, 23–24).
- **Impact:** Same as H-07 — dead imports and route-surface confusion.
- **Fix:** Remove unused imports.

### Medium

#### M-01 — `translateArticleSummary` lacks input validation beyond language enum
- **File:** `apps/reading-advantage/app/api/v1/articles/[article_id]/translate/route.ts` (controller: `article-controller.ts:820–925`)
- **Lines:** 10–14 in route; 824–835 in controller
- **Severity:** Medium
- **Evidence:**
  - The controller checks `targetLanguage` against `LanguageType` enum values.
  - No validation of `article_id` format, no max length on `summary`, no rate limiting, no authentication.
- **Impact:** Potential abuse (large payloads, repeated translations of the same article).
- **Fix:** Add Zod schema for `article_id` and `targetLanguage`, enforce auth, and add idempotency/caching checks.

#### M-02 — `answerSAQuestion` awards fixed 3 XP regardless of answer quality
- **File:** `apps/reading-advantage/app/api/v1/articles/[article_id]/questions/sa/[question_id]/route.ts`
- **Severity:** Medium
- **Evidence:**
  - Controller (`question-controller.ts:599–717`) inserts the SA activity and always adds 3 XP (lines 679–696).
  - There is no evaluation of the answer; the client simply receives the suggested answer.
- **Impact:** A user can submit empty or nonsense answers and earn the same XP as a high-quality answer. This devalues the XP economy.
- **Fix:** Require a server-side quality/rubric check (or AI evaluation) before awarding XP, or split SA submission from XP award and tie XP to a later rating/feedback step.

#### M-03 — `answerMCQuestion` trusts client `selectedAnswer` string and reveals correct answer
- **File:** `apps/reading-advantage/app/api/v1/articles/[article_id]/questions/mcq/[question_id]/route.ts`
- **Severity:** Medium
- **Evidence:**
  - Controller (`question-controller.ts:819–946`) reads `selectedAnswer` and compares it to `question.answer` (a text string).
  - The response always includes `correctAnswer: question.answer` and `textualEvidence` (line 930–931), even when the user was incorrect.
  - There is no validation that `selectedAnswer` is one of the four options.
- **Impact:**
  - A client can send arbitrary strings to probe answers.
  - The response leaks the correct answer and textual evidence on every attempt, enabling trivial cheating.
- **Fix:** Validate `selectedAnswer` against `question.options`. Consider whether the full correct answer should be returned before the set is complete.

#### M-04 — `assignments` route role restriction comment is inaccurate
- **File:** `apps/reading-advantage/app/api/v1/assignments/route.ts`
- **Lines:** 20–21
- **Severity:** Medium
- **Evidence:**
  - Line 20 comment: "restrict to STAFF/ADMIN/TEACHER".
  - Line 21: `router.use(restrictTo(Role.TEACHER, Role.ADMIN, Role.SYSTEM) as any)`.
  - `Role` enum in `lib/enums.ts` has no `STAFF` value.
- **Impact:** Misleading comment; `STAFF` is not a role in this codebase.
- **Fix:** Update comment to match actual roles (`TEACHER`, `ADMIN`, `SYSTEM`). Remove the `as any` cast if possible.

#### M-05 — `assignment-notifications` GET uses a single handler for two different authorization models
- **File:** `apps/reading-advantage/app/api/v1/assignment-notifications/route.ts`
- **Lines:** 22–23
- **Severity:** Medium
- **Evidence:**
  - Route comment says `?studentId=...` for students and `?teacherId=...&history=true` for teachers.
  - The controller (`assignment-notification-controller.ts:19–141`) branches on `history` and performs its own role checks.
  - The route itself applies only `protect`, so a `STUDENT` hitting `?history=true` reaches the controller and is rejected there.
- **Impact:** Functional but fragile. Authorization is split between route and controller, making it easy to accidentally expose teacher history endpoints.
- **Fix:** Split the endpoint into separate route files or apply `restrictTo` at the route level for the history variant.

#### M-06 — `chatbot` and `chatbot-question` routes have no content-safety or rate-limiting middleware
- **Files:**
  - `apps/reading-advantage/app/api/v1/assistant/chatbot/route.ts`
  - `apps/reading-advantage/app/api/v1/assistant/chatbot-question/route.ts`
- **Severity:** Medium
- **Evidence:**
  - Both routes only apply `protect` and `logRequest`.
  - Controllers (`assistant-controller.ts:323–378` and `380–499`) validate JSON shape with Zod and then call OpenAI.
  - No input length limits, no OpenAI moderation API, no output filtering, no rate limiting.
- **Impact:** Potential for prompt injection, generation of harmful content, and runaway API costs.
- **Fix:** Add per-user rate limiting, input length caps, and OpenAI moderation checks. Consider stripping or escaping JSON injection attempts in the `messages` array.

#### M-07 — `articles/route.ts` level-enforcement logic is commented out
- **File:** `apps/reading-advantage/app/api/v1/articles/route.ts`
- **Lines:** 15–28
- **Severity:** Medium
- **Evidence:**
  - Lines 15–28 contain a commented-out middleware that would force the search `level` parameter to match `session.user.level`.
  - The current implementation (`article-controller.ts:72–89`) takes `level` from the session and returns 400 if missing, but does not reject a mismatched query parameter if a client manually supplies one.
- **Impact:** Clients can request articles at levels outside their assigned level, undermining the leveling system.
- **Fix:** Re-enable level enforcement or remove the misleading commented code.

#### M-08 — `generateQueue` route is protected only by an access key
- **File:** `apps/reading-advantage/app/api/v1/articles/generate/route.ts`
- **Lines:** 1–23
- **Severity:** Medium
- **Evidence:**
  - Line 16: `router.use(restrictAccessKey)`.
  - No user context is established; the controller (`generator-controller.ts:85–185`) only reads `amountPerGenre` from the body.
- **Impact:** Anyone with the access key can trigger expensive article generation across all CEFR levels and genres.
- **Fix:** If this is a staff endpoint, add `restrictTo(Role.ADMIN, Role.SYSTEM)`. Log every invocation with caller identity.

### Low

#### L-01 — Inconsistent handler wrapper patterns
- **Files:** Various
- **Severity:** Low
- **Evidence:**
  - Some routes use inline `export async function GET/POST/...` with `if (result instanceof NextResponse)` guards.
  - Others use `handleRequest(router, request, ctx)` from `server/utils/handle-request.ts`.
  - `handleRequest.ts` itself throws a generic `Error` if the router does not return a `NextResponse`, which Next.js will render as a 500.
- **Impact:** Maintenance overhead and inconsistent error responses.
- **Fix:** Standardize on one pattern and return proper 405/500 JSON responses.

#### L-02 — `mcq/route.ts` has commented-out POST handler
- **File:** `apps/reading-advantage/app/api/v1/articles/[article_id]/questions/mcq/route.ts`
- **Lines:** 30–38
- **Severity:** Low
- **Evidence:** A large block of commented-out POST code remains in the file.
- **Impact:** Noise and confusion.
- **Fix:** Remove or restore with intent.

#### L-03 — `articles/route.ts` has commented-out level middleware
- **File:** `apps/reading-advantage/app/api/v1/articles/route.ts`
- **Lines:** 15–28
- **Severity:** Low
- **Evidence:** Same as M-07; the stale commented code references a non-existent `session` object in scope.
- **Fix:** Remove or implement.

#### L-04 — No route-level param/body validation
- **Files:** All 20 route files
- **Severity:** Low-Medium
- **Evidence:** Route files pass raw `request`/`ctx` to controllers. Zod validation only appears inside some controllers (e.g., `assistant-controller.ts`).
- **Impact:** Invalid IDs and malformed bodies can reach business logic before validation.
- **Fix:** Add a lightweight route-level Zod middleware or validate at the earliest controller boundary.

---

## Anti-Pattern Audit

| ID | Anti-pattern | Present in batch? | Evidence |
|----|--------------|-------------------|----------|
| A3 | Digit-only as a "labeled count" | No | No bare-digit regex assertions found in route files. |
| A4 | Vacuous-pass on nothing-done | No | These are route files; they do not contain test assertions. However, the underlying controllers (e.g., `validateArticle`) return a hard-coded 501 and have unreachable dead code after an early return, which is a form of stale-plan evidence. |
| A5 | False-claim text vs test reality | Partial | Route comments and code suggest protections exist (e.g., "restrict to STAFF/ADMIN/TEACHER") while the actual role set differs. The `validateArticle` controller claims validation but is permanently disabled. |

---

## Controller-Level Findings Relevant to Route Review

Because the route files delegate all behavior, the following controller issues directly affect these routes and are noted here for traceability:

1. **`article-controller.ts:getArticleById`** — Creates an `ARTICLE_READ` activity with `completed: false` but never validates `schoolId` or article visibility for the user's tenant.
2. **`question-controller.ts:checkAndUpdateArticleCompletion`** — Awards no XP for article completion, only marks an activity. The completion logic depends on license level and counts MCQ activities filtered in application code rather than in SQL.
3. **`question-controller.ts:answerLAQuestion`** — Does not award XP. A separate `getLAQuestionXP` function exists but is not exposed by any route in this batch.
4. **`generator-controller.ts:generateUserArticle`** — Validates required fields but does not enforce rate limits, tenant scoping, or license entitlements before calling OpenAI/image/audio generators.
5. **`validator-controller.ts:validateArticle`** — Returns HTTP 501 for all requests; the body after line 59 is unreachable dead code referencing the removed Firestore client.

---

## Recommendations Summary

1. **Add auth to `translate` route immediately.**
2. **Restrict `DELETE /articles/[article_id]` to admins/system or article owners.**
3. **Add `schoolId` tenant scoping to every article/question/assignment/assistant controller.**
4. **Validate and clamp SA rating before converting to XP.**
5. **Limit MCQ retakes and log them as audit events.**
6. **Remove unregistered HTTP method exports or return 405 from them.**
7. **Add rate limiting and moderation to assistant chat routes.**
8. **Standardize route wrapper pattern and remove dead/commented code.**

---

*No acceptance claims are made in this review. Findings are based on static analysis of the 20 route files and their called controllers at HEAD `d348666be047b929d02c747120c32d2ea0fc53fc`.*
