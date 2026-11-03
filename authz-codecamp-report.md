# CodeCamp Advantage — server route authorization audit

Commit audited: `01f2acfe8`. Scope: `apps/codecamp-advantage` route handlers, server actions, `proxy.ts`, and the packages they mount (`@reading-advantage/api` codecamp + activity tRPC routers, `routes/auth`, `@reading-advantage/domain/codecamp`, `domain/activity`, `@reading-advantage/webhooks/github`). I only read the code. I did not start a server or a database.

## Summary

- 13 route files, 14 HTTP handlers (the tRPC route serves GET and POST). 0 server actions (`"use server"` appears nowhere). 0 payment routes.
- 40 tRPC procedures: 31 `codecamp.*` (22 `protectedProcedure`, 9 `adminProcedure`) and 9 `activity.*` (all `protectedProcedure`; `teacherGet` also checks the role inline).
- Signed-out callers reach 10 handlers. 7 are auth routes and public by design. The webhook needs an HMAC signature. The 2 internal routes need a bearer token. No tRPC procedure is public.
- A learner who knows another learner's PR URL reaches that learner's PR review: 1 route (`codecamp.createPrReview`, finding 1).
- Learners can write their own grades: 2 procedures (`updateProgress`, `submitQuiz`; findings 2 and 3).
- The roles are ADMIN, TEACHER, INTERN, and STUDENT. No role is named "mentor". TEACHER is the nearest match, and it gets no more Codecamp access than a learner.
- Login rate limits: legacy `/api/auth/login` has one (backed by Postgres, per username and per IP). Company mode hands login to Accounts. Chat has an in-memory limit of 30 per minute. The tutor, the `/session` route, and tRPC have none.
- Error shapes vary: `{message}` on the auth routes, `{error}` on chat, tutor, and internal routes, and the tRPC error envelope on tRPC. 4 places send raw `error.message` text to the client.
- Findings: 3 high, 4 medium, 3 low (top 10 below).

## Full table

Legend: **Auth** is how the server learns the caller's identity. **Own** is how each database read and write is limited to the caller's own rows. Company mode is the default (`CODECAMP_AUTH_MODE` unset). Legacy mode is a rollback switch.

### Route handlers

| Route | Method | Auth | Role | Own (each read/write) | Validation | Rate limit | Error shape | Signed-out / other learner |
|---|---|---|---|---|---|---|---|---|
| `/api/auth/mode` | GET | none | none | no DB | none needed | none | `{mode}` | **Signed-out: yes** (by design, reveals only the mode) |
| `/api/auth/company/start` | GET | none (opens the PKCE flow) | none | no DB; sealed transaction cookie | `returnTo` checked by the OIDC client's Zod schema; an unsafe value falls back to `/` | none (redirect only) | 409 `{message}` in legacy mode; otherwise a redirect | **Signed-out: yes** (by design) |
| `/api/auth/callback` | GET | sealed transaction cookie + `code`/`state` exchanged with Accounts | at least one Codecamp role is required, or the token is revoked and the response is `?error=forbidden` | principal synced through `sync_codecamp_company_principal` with the identity's own `sub`/org | params checked for presence; the exchange checks the rest | none | redirect with `?error=` | **Signed-out: yes** (by design) |
| `/api/auth/login` | POST | legacy credentials (company mode returns 409) | none | `handleLogin` reads the user by username | Zod in `handleLogin` | **yes**: Postgres limiter per username and per IP; 429 with `captchaRequired` | `{message}` | **Signed-out: yes** (by design) |
| `/api/auth/logout` | POST | session cookie (optional) | none | revokes only the token in the cookie | Origin header must match the public origin (403 otherwise) | none | `{success}` 200/502; `{message}` 403 | Signed-out: yes, harmless |
| `/api/auth/reset-password` | POST | legacy `session_token` (company mode returns 409) | `requireRole(TEACHER)`; TEACHER→STUDENT, ADMIN→STUDENT/TEACHER | target loaded by `userId`; school check uses `schoolId` and is skipped when `schoolId` is null (finding 6) | Zod `userId`, `newPassword` | none | `{message}` 400/401/403/404 | Signed-out: 401. Another learner: 403 |
| `/api/auth/session` | GET | session cookie → Accounts introspection | any | returns only the caller's own principal | none | none | `{session}`; a thrown introspection error is unhandled (raw 500) | Signed-out: yes, returns `{session:null}` |
| `/api/chat` | POST | session cookie (company) or `requireAuth` (legacy) | `codecamp:chat` (all four roles) | `getChatContext` reads only published global curriculum rows; no learner data | Zod `chatInputSchema` (message ≤ 4000, UUIDs, locale) | **yes**: 30 per minute per user, in memory per instance | `{error}` 401/429/400 (with `details`)/500 | Signed-out: 401. Another learner: no learner data reachable |
| `/api/tutor/intervention` | POST | same as chat | `codecamp:chat` | activity session, interventions, and evidence filtered by `learnerId = user.id` and `tenantKey`; conversation filtered by `userId` | Zod discriminated union, `.strict()` | **none** (finding 4) | `{error}` 401/400; any other error returns raw `error.message` with 400 (finding 7) | Signed-out: 401. Another learner: blocked by the ownership filters |
| `/api/trpc/[trpc]` | GET, POST | session cookie → introspection → local principal (company); cookie or bearer `session_token` (legacy) | per procedure (see below) | per procedure | per procedure (Zod) | none | tRPC envelope; introspection and principal sync run outside tRPC, so their errors are unhandled 500s | Signed-out: every procedure returns UNAUTHORIZED |
| `/api/internal/review-worker-tick` | POST | bearer `REVIEW_WORKER_TICK_TOKEN`, compared with `!==` | service | worker uses the global `review_jobs` table | none needed | none | `{error}` 401/500, message sanitized | Signed-out: reachable, 401 without the token |
| `/api/internal/tutorial-repository-capture` | POST | bearer `TUTORIAL_REPOSITORY_WORKER_TOKEN`, compared with `!==` | service | `learnerId` comes from the body; the token holder is trusted; `githubUsername` is read for that learner | Zod `.strict()`, file allowlist, GitHub username regex | **yes**: Postgres lease plus 20 per learner per minute and 2 concurrent | `{error}` 401/429; other errors return raw `error.message` with 400 | Signed-out: reachable, 401 without the token |
| `/webhooks/github/pr` | POST | HMAC-SHA256 `x-hub-signature-256` with `timingSafeEqual`; optional timestamp skew check | SYSTEM | review looked up by PR URL; a new review is tied to the user whose `githubUsername` matches `pr.user.login`; **an existing row keeps its owner** (finding 1) | JSON parse + payload schema | none (delivery-id dedup only) | `{error}` 401/400/500; `{received}` 200 | Signed-out: reachable, 401 without a valid signature |

### tRPC procedures (`/api/trpc`)

Every procedure needs a session (`isAuthed` or `isAdmin`). Every learner procedure scopes rows by `user.id` unless the Own column says otherwise. Every error uses the tRPC envelope through `mapDomainError`. INTERNAL errors carry the raw `err.message` (finding 7). No procedure has a rate limit.

| Procedure | Type | Role | Own (each read/write) | Validation | Signed-out / other learner |
|---|---|---|---|---|---|
| `codecamp.modules` | query | any | global curriculum; the caller's own progress; APK unit filtered by assignment | none needed | own data only |
| `codecamp.moduleBySlug` | query | any | global; APK unit gated | `slug: string` (no length cap) | own only |
| `codecamp.lessons` | query | any | global; module assignment checked | UUID | own only |
| `codecamp.lesson` | query | any | global, published only; assignment checked | UUID | own only |
| `codecamp.submitExercise` | mutation | any | writes the caller's progress row; **no published or assignment check** | UUID, `code: string` (no length cap) | own only (finding 8) |
| `codecamp.submitQuiz` | mutation | any | writes the caller's progress; **the response returns every `correctAnswer`** | UUID + answers array | own only (finding 3) |
| `codecamp.markTheoryLessonComplete` | mutation | any | writes the caller's progress; **no published or assignment check** | `lessonId: string` (**not UUID**) | own only (finding 8) |
| `codecamp.saveChatMessage` | mutation | any | conversation filtered by `userId = user.id`; inserts are tied to the caller | Zod (message ≤ 4000) | blocked: another learner's conversation returns NOT_FOUND |
| `codecamp.chatHistory` | query | any | conversation filtered by `userId` | UUID | blocked |
| `codecamp.conversations` | query | any | filtered by `userId` | none | own only |
| `codecamp.updateProgress` | mutation | any | upsert on `(user.id, lessonId)` | **`status` free, `score: z.number()` unbounded** | own only, but **learners grade themselves** (finding 2) |
| `codecamp.dashboard` | query | any | cache key = school + user | none | own only |
| `codecamp.practiceIssues` | query | any | GitHub API call, no DB | none | n/a; makes an uncached GitHub call each time (finding 10) |
| `codecamp.exerciseRepos` | query | any | global; assignment checked when `moduleId` is set | UUID optional | own only |
| `codecamp.linkExerciseRepo` | mutation | ADMIN, SYSTEM | global write | Zod | admin only |
| `codecamp.prReviews` | query | any | filtered by `userId` | none | own only |
| `codecamp.createPrReview` | mutation | any | checks that the PR targets the exercise repo; **does not check that the caller authored the PR**; PR URL is unique across learners | Zod URL + GitHub path parse | **other learner: yes** (finding 1) |
| `codecamp.updatePrReview` | mutation | ADMIN, SYSTEM | by `reviewId`, global | Zod | admin only |
| `codecamp.prReviewByPrUrl` | query | any | filtered by `prUrl` and `userId` (SYSTEM skips the user filter) | URL | own only |
| `codecamp.modulesByPhase` | query | any | global; APK unit filtered | enum | own only |
| `codecamp.moduleWithExercises` | query | any | global; assignment checked | UUID | own only |
| `codecamp.checkPrerequisite` | query | any | the caller's own progress | UUID | own only |
| `codecamp.reviewExercise` | mutation | ADMIN, SYSTEM | LLM call | diff ≤ 50000 | admin only |
| `codecamp.createIntern` | mutation | ADMIN, SYSTEM | none (returns an Accounts URL) | strict `{}` | admin only |
| `codecamp.updateInternGithubUsername` | mutation | ADMIN, SYSTEM | every INTERN account (single org by design) | `userId: string`, `githubUsername: string \| null` (no format check) | admin only |
| `codecamp.listInterns` | query | ADMIN, SYSTEM | every INTERN account | none | admin only |
| `codecamp.getInternProgress` | query | ADMIN, SYSTEM | any INTERN account | `userId: string` | admin only |
| `codecamp.recordPrReviewOverride` | mutation | ADMIN, SYSTEM | attempt filtered by `tenantKey`; append-only audit row | strict Zod | admin only |
| `codecamp.webhookEvents` | query | ADMIN, SYSTEM | global | limit 1–100 | admin only |
| `codecamp.listDeadReviewJobs` | query | ADMIN, SYSTEM | global | Zod | admin only |
| `codecamp.requeueReviewJob` | mutation | ADMIN, SYSTEM | by `jobId`, global | Zod | admin only |
| `activity.start` | mutation | any | session created for `learnerId = user.id`, `tenantKey` | transport Zod | own only |
| `activity.append` | mutation | any | locked session filtered by `id`, `tenantKey`, `learnerId` | Zod | blocked |
| `activity.get` | query | any | same filter | Zod | blocked |
| `activity.assessCheckpoint` | mutation | any | same filter; server-side grading | Zod | blocked |
| `activity.assessTutorial` | mutation | any | same filter | Zod | blocked |
| `activity.reportTutorial` | mutation | any | uses the actor's `learnerId` + signed report secret | Zod | blocked |
| `activity.prepareTutorial` | mutation | any | uses the actor's `learnerId`; calls the capture worker | Zod | blocked; capture lease limits it |
| `activity.reissueTutorialCredential` | mutation | any | uses the actor's `learnerId` | Zod | blocked |
| `activity.teacherGet` | query | TEACHER, ADMIN, SYSTEM; Codecamp (null school) allows **ADMIN/SYSTEM only** | filtered by `learnerId` + `sessionId`, `schoolId IS NULL` | strict Zod | learner: FORBIDDEN |

Page gate: `proxy.ts` checks for the ADMIN role on `/admin` pages only. The `matcher` skips `/api` and `/webhooks`, so every API route enforces its own auth.

## Top 10 findings by risk

1. **High: a learner can claim another learner's pull request.** `packages/domain/src/codecamp/pr-reviews.ts:139` checks only that the PR targets the exercise repo and that no review exists yet. Line 143 then stores the caller as the owner. `packages/webhooks/src/github.ts:200` keeps the existing owner when the PR author's webhook arrives. Learner A can submit learner B's PR URL first. A then gets the review and any approval credit, and B is locked out with "A review for this PR URL already exists". **Fix:** in `createPrReview`, have the GitHub client confirm that the PR author matches `users.githubUsername` for the caller before the insert.

2. **High: learners can grade themselves.** `packages/api/src/routers/codecamp.ts:253` (`updateProgress`) passes client `status` and `score` to `packages/domain/src/codecamp/progress.ts:23`. The schema at `packages/types/src/codecamp.ts:187-191` allows `status: "completed"` and any number as `score`. A learner can mark any lesson complete with any score, and mentors and admins see that result in `listInterns`. **Fix:** remove `status: "completed"` and `score` from `progressUpdateSchema` so that only the server grading paths (quiz, PR approval, activity assessment) can complete a lesson.

3. **High: the quiz response gives away the answers.** `packages/domain/src/codecamp/quizzes.ts:29` returns `correctAnswer` for every question on every attempt, and `submitQuiz` has no attempt limit. A learner can submit blank answers, read the key, and resubmit for 100. **Fix:** return `correctAnswer` only after the learner passes, or only for questions they answered correctly.

4. **Medium: no rate limit on the paid LLM tutor.** `apps/codecamp-advantage/app/api/tutor/intervention/route.ts:56` calls OpenRouter and writes a database row on every request. It has no limit, unlike `/api/chat`. Any signed-in learner can run up model cost and fill `codecamp_tutor_interventions`. **Fix:** call `checkChatRateLimit(user.id)` (or a separate bucket) before `tutorRequestSchema.parse` and return 429 when the limit is hit.

5. **Medium: the chat rate limit lives in process memory.** `apps/codecamp-advantage/lib/rate-limit.ts:10` keeps the counts in a `Map`. With several Cloud Run instances or a restart, the real limit is 30 per minute times the number of instances. **Fix:** use the Postgres limiter the legacy login already uses (`configurePostgresRateLimiter`) for the chat and tutor buckets.

6. **Medium (legacy mode only): password reset across learners.** In `packages/api/src/routes/auth/reset-password.ts:99`, the school filter is skipped when the actor's `schoolId` is null, and line 131 then compares `null !== null`, which is false. Every Codecamp user has `schoolId = null`, so a legacy TEACHER can reset the password of any STUDENT with a null school. An ADMIN can reset any STUDENT or TEACHER in the shared `users` table. **Fix:** give Codecamp a `createResetPasswordHandler` whose `authorizeTarget` denies a null school or a target from another product.

7. **Medium: raw server error text reaches the client.** `packages/api/src/routers/codecamp.ts:64` sends `err.message` with INTERNAL_SERVER_ERROR. `app/api/tutor/intervention/route.ts:150` and `app/api/internal/tutorial-repository-capture/route.ts:39` send `error.message` with 400. Database and driver errors (for example, the invalid-UUID error from `markTheoryLessonComplete`) can expose SQL and schema details. **Fix:** return a fixed "Internal error" message and keep the detail in the structured log.

8. **Low: progress writes skip curriculum gating.** `submitExercise`, `submitQuiz`, and `markTheoryLessonComplete` (`packages/api/src/routers/codecamp.ts:138-183`) never call `assertCodecampModuleAssigned` and never check the published status. A learner can record progress on unassigned APK-unit or unpublished lessons. `markTheoryLessonComplete` also accepts any string (`codecamp.ts:171`). **Fix:** call `assertCodecampModuleAssigned` on `lesson.moduleId` in `updateUserProgress` and change the input to `z.string().uuid()`.

9. **Low: unhandled auth errors on the session and tRPC routes.** `app/api/auth/session/route.ts:22` and `app/api/trpc/[trpc]/route.ts:38` call `introspect()` and `resolveCodecampSessionUser()` without `try`. An Accounts outage or a mapping mismatch returns a raw 500 instead of a clean 401 or `{session:null}`. **Fix:** wrap those calls in `try/catch`, treat a failure as signed out, and log it with `logStructuredError`.

10. **Low: learner input goes to logs, and the internal tokens use a plain comparison.** `packages/api/src/trpc.ts:60-88` logs every tRPC input, scrubbing only top-level keys, so chat text, code, and PR diffs from adult learners end up in the logs. `app/api/internal/review-worker-tick/route.ts:15` and `tutorial-repository-capture/route.ts:9` compare bearer tokens with `!==`. `practiceIssues` (`codecamp.ts:294`) calls the GitHub API uncached for every learner request. **Fix:** log input keys and sizes only, compare tokens with `timingSafeEqual`, and cache `practiceIssues` for a short time.
