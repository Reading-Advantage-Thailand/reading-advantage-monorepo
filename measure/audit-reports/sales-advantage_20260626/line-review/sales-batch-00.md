# Line-by-Line Review — `sales-batch-00`

- **Track:** `sales_advantage_review_20260626`
- **Batch:** `sales-batch-00`
- **Reviewer model:** `ark-code-latest` (Doubao-Seed-Code)
- **Date:** 2026-06-27
- **Scope:** Exactly the 20 files listed in `/tmp/opencode/sales-batch-00`. No source code was edited.
- **Finding ID scheme:** `F-SALES-B00-###`
- **Severity legend:** `critical` / `high` / `medium` / `low` / `info`

> This is a line-review artifact only. It makes **no** acceptance or closeout
> determination for the track. See "Limitations" for review boundaries.

---

## Files reviewed (20/20)

| # | File | Findings |
|---|------|----------|
| 1 | `apps/sales-advantage/.env.example` | F-SALES-B00-001, -002 |
| 2 | `apps/sales-advantage/app/[locale]/admin/[repId]/page.tsx` | F-SALES-B00-003, -004 |
| 3 | `apps/sales-advantage/app/[locale]/admin/create-rep/page.tsx` | F-SALES-B00-005, -006 |
| 4 | `apps/sales-advantage/app/[locale]/admin/curriculum/page.tsx` | F-SALES-B00-007, -008 |
| 5 | `apps/sales-advantage/app/[locale]/admin/page.tsx` | F-SALES-B00-009 |
| 6 | `apps/sales-advantage/app/[locale]/layout.tsx` | F-SALES-B00-010 |
| 7 | `apps/sales-advantage/app/[locale]/lesson/[id]/page.tsx` | F-SALES-B00-011, -012, -013 |
| 8 | `apps/sales-advantage/app/[locale]/module/[slug]/page.tsx` | F-SALES-B00-014 |
| 9 | `apps/sales-advantage/app/[locale]/page.tsx` | F-SALES-B00-015 |
| 10 | `apps/sales-advantage/app/api/auth/login/route.ts` | F-SALES-B00-016 |
| 11 | `apps/sales-advantage/app/api/auth/logout/route.ts` | (clean) |
| 12 | `apps/sales-advantage/app/api/auth/session/route.ts` | F-SALES-B00-017 |
| 13 | `apps/sales-advantage/app/api/chat/__tests__/route.test.ts` | F-SALES-B00-018 |
| 14 | `apps/sales-advantage/app/api/chat/route.ts` | F-SALES-B00-019, -020, -021 |
| 15 | `apps/sales-advantage/app/api/lesson-complete/route.ts` | F-SALES-B00-022, -023, -024 |
| 16 | `apps/sales-advantage/app/api/roleplay-attempts/__tests__/route.test.ts` | F-SALES-B00-025 |
| 17 | `apps/sales-advantage/app/api/roleplay-attempts/route.ts` | F-SALES-B00-026, -027, -028 |
| 18 | `apps/sales-advantage/app/api/trpc/[trpc]/route.ts` | F-SALES-B00-029, -030 |
| 19 | `apps/sales-advantage/app/globals.css` | (clean) |
| 20 | `apps/sales-advantage/app/layout.tsx` | F-SALES-B00-031 |

---

## Findings

### 1. `apps/sales-advantage/.env.example`

**F-SALES-B00-001** — `info` — Lines 8, 24–25.
`AUTH_SECRET` placeholder is a literal hint string and `STORAGE_ACCESS_KEY_ID` /
`STORAGE_SECRET_ACCESS_KEY` default to `minioadmin`. Acceptable for an
`.env.example` (these are not real secrets), but worth confirming the deploy
pipeline rejects these defaults in production (no validation visible in batch).

**F-SALES-B00-002** — `info` — Lines 10–15.
AI model wiring matches the documented OpenRouter-primary + parakeet-STT-fallback
design (`SALES_AUDIO_EVAL_MODEL`, `SALES_AUDIO_EVAL_FALLBACK_STT_MODEL`,
`SALES_AUDIO_EVAL_FALLBACK_EVAL_MODEL`). No `STORAGE_PUBLIC_BASE_URL` value set
(line 26) — confirm the storage adapter tolerates an empty public base URL for
private (non-public) objects, which is the intended mode for roleplay audio.

### 2. `app/[locale]/admin/[repId]/page.tsx`

**F-SALES-B00-003** — `medium` — Lines 13–16.
The "rep detail" page reuses `cohortOverview` and filters client-side
(`rows.find((r) => r.userId === repId)`). This downloads the entire cohort to
render one rep, and the per-rep data is whatever the cohort row contains. As the
cohort grows this is an N-row over-fetch for a single-row view. Recommend a
dedicated `sales.admin.repDetail` query scoped server-side.

**F-SALES-B00-004** — `low` — Lines 15, 30.
`rows` is cast through `as unknown as Array<Record<string, unknown> & {...}>`
and the rep object is dumped raw via `JSON.stringify(rep, null, 2)` into a
`<pre>`. The unknown-cast defeats type safety, and rendering the entire row
verbatim can leak internal fields (IDs, timestamps, scoring internals) to the
admin UI that were never intended for display. Render explicit fields instead.

### 3. `app/[locale]/admin/create-rep/page.tsx`

**F-SALES-B00-005** — `medium` — Lines 38–44.
On success the UI shows "Rep created. Share their credentials." but the initial
password was typed by the admin (line 49) and is never re-displayed; the message
implies a credential is surfaced when it is not. More importantly, there is no
"force password change on first login" affordance referenced here — confirm the
backend marks the initial password as must-reset (not visible in this batch).

**F-SALES-B00-006** — `low` — Line 49.
Password policy is only `minLength={8}` enforced client-side. The real policy
must be enforced server-side in `createRepAccount`; client `minLength` is a UX
hint, not a control. Verify server-side validation exists (out of batch scope).

### 4. `app/[locale]/admin/curriculum/page.tsx`

**F-SALES-B00-007** — `medium` — Lines 43–45.
`ModuleLessons` fires a separate `trpc.sales.moduleBySlug` query per module
(one query per rendered card). For a curriculum with many modules this is an
N+1 query waterfall on the admin curriculum page. Consider a single
`modules-with-lessons` query.

**F-SALES-B00-008** — `low` — Lines 25, 45.
Repeated `as unknown as {...}` casts on tRPC query results (`modules`, `data`).
The tRPC client is generic-typed end-to-end; these casts indicate the router
output type is not flowing through (or is being deliberately discarded),
weakening compile-time safety on the content-approval admin surface. Same
pattern recurs across files 2, 5, 7, 8, 9.

### 5. `app/[locale]/admin/page.tsx`

**F-SALES-B00-009** — `low` — Lines 59–66.
Cohort table rows cast via `as unknown as Array<{...}>`. Functionally fine and
defensively defaulted (`?? 0`, `?? "—"`), but loses router type fidelity. The
quiz score is rendered as `%` (line 78) while roleplay score is unitless (line
75) — confirm that asymmetry matches the data model (roleplay = /100 raw,
quiz = percentage). No tenant scoping concern at the UI layer (server enforces).

### 6. `app/[locale]/layout.tsx`

**F-SALES-B00-010** — `info` — Lines 22–28.
Locale layout is clean: server component, `getLocale`/`getMessages`, font class
by locale, `NextIntlClientProvider`. `<html lang={locale}>` is correct for a11y.
No findings beyond noting `Header` is rendered for all routes including the
unauthenticated landing/login (file 9 renders `LoginForm` inside this chrome).

### 7. `app/[locale]/lesson/[id]/page.tsx`

**F-SALES-B00-011** — `high` — Lines 77, 111–127.
**XSS risk.** `dangerouslySetInnerHTML={{ __html: renderMarkdown(l.content) }}`
renders lesson `content` through a hand-rolled `renderMarkdown` that does **no
sanitization**. `renderMarkdown` wraps paragraphs in `<p>`/`<h2>`/`<li>` and
applies bold/italic regex but passes raw input through — any inline HTML or
`<script>`/`<img onerror=...>` in lesson content executes. Lesson content is
authored/AI-generated and admin-approved, but approval (file 4) is a status
toggle, not sanitization. Use a sanitizing markdown renderer (e.g.
DOMPurify + a real markdown lib) before `dangerouslySetInnerHTML`.

**F-SALES-B00-012** — `medium` — Lines 51–60.
`handleMarkComplete` bypasses tRPC and POSTs to `/api/lesson-complete` "for
simplicity (the mutation isn't on the router yet)". This is an architectural
shortcut: a one-off REST endpoint duplicates auth/validation that the tRPC
router already centralizes, and the inline comment confirms it is intentional
tech debt. It also ignores the fetch response (no error handling — a 4xx/5xx
still flips `setMarked(true)` on line 58 and shows "Completed" optimistically
even on failure).

**F-SALES-B00-013** — `low` — Lines 26–49.
Large `as unknown as {...}` cast for the entire lesson shape including
`scenarios`, `rubric.criteriaJson: unknown`, `quizQuestions`. The roleplay
`scenario`/`rubric` is passed straight into `RoleplayRecorder` (line 95) with
this asserted shape; a router shape drift would surface only at runtime.

### 8. `app/[locale]/module/[slug]/page.tsx`

**F-SALES-B00-014** — `low` — Lines 31, 37.
Progression/lock state is computed in the sibling dashboard (file 9) but the
module page itself does not re-check whether the module is unlocked for the
current rep — a rep can deep-link `/module/<slug>` for a locked module and see
its lessons (gating is purely the dashboard's `pointer-events-none` styling,
F-SALES-B00-015). Server-side authorization on `moduleBySlug` / `lesson` is the
real gate; confirm it enforces sequential-progression access (out of batch).

### 9. `app/[locale]/page.tsx`

**F-SALES-B00-015** — `medium` — Lines 62–67.
Curriculum progression locking is **client-side cosmetic only**:
`locked = idx > 0 && !m.previousModuleCompleted` then renders the link with
`pointer-events-none opacity-50`. `pointer-events-none` is trivially bypassed
(keyboard nav, devtools, or direct URL per F-SALES-B00-014). If sequential
progression is a product requirement, it must be enforced by the
`moduleBySlug`/`lesson` queries server-side, not by CSS. Also a keyboard user
focusing the locked card and pressing Enter may still navigate (pointer-events
does not block keyboard activation reliably) — accessibility + gating gap.

### 10. `app/api/auth/login/route.ts`

**F-SALES-B00-016** — `low` — Lines 9–16.
Delegates to shared `handleLogin` (good — adapter reuse). Structured error log
includes `error.stack` (line 14). Stack is logged server-side only (not
returned to client — line 18 returns generic message), which is acceptable, but
confirm login does not log credentials anywhere upstream. No rate-limiting is
applied at this route layer; relies on `handleLogin` internals (AGENTS requires
login rate limiting — verify in `@reading-advantage/api`).

### 11. `app/api/auth/logout/route.ts`

Clean. Thin delegation to `handleLogout` with structured error logging. No
findings.

### 12. `app/api/auth/session/route.ts`

**F-SALES-B00-017** — `info` — Lines 8–16.
On any error the route returns `{ user: null }` with status **200**. This is a
deliberate fail-open-as-unauthenticated pattern (reasonable for a session probe)
but it masks genuine infrastructure failures (DB down) as "logged out", which
can hide outages and cause confusing client behavior. Consider distinguishing
"no session" (200, user:null) from "session check failed" (503).

### 13. `app/api/chat/__tests__/route.test.ts`

**F-SALES-B00-018** — `low` — Lines 89–150, 198–288.
Test quality is **good**: covers the FR-1 authorization gate (STUDENT/TEACHER
rejected, SALES_REP allowed) and FR-8 input hardening (Zod rejection +
role-marker spoof stripping for content, `lessonId`, `moduleId`). Gaps: (a) no
test asserts the 429 rate-limit branch (the rate limiter is mocked always-allow,
line 31–33); (b) no test for the 500 catch path; (c) the SALES_ADMIN role is not
exercised even though `authorizeSalesChat` permits it (permissions.ts:98). These
are coverage gaps, not defects.

### 14. `app/api/chat/route.ts`

**F-SALES-B00-019** — `info` — Lines 44–71.
Auth/authorization is correctly layered: session validated via
`validateSession`, rate-limited per user, then `sales.authorizeSalesChat({user})`
gates by role with `AuthError → 403`. Order is sensible (authn → rate limit →
authz). Good adapter usage (`getAIClient`, no direct provider SDK).

**F-SALES-B00-020** — `medium` — Lines 22–32, 100–106.
The role-marker sanitizer strips `REP:`/`COACH:` (bare + bracketed), but the
prompt assembly still concatenates user content into a single text blob with
`[REP]`/`[COACH]` turn markers (line 104) and a trailing `[COACH]:` (line 106).
This is a string-concatenation prompt rather than the AI SDK's structured
`messages` array; sanitization is a denylist (only `REP`/`COACH` markers).
Other injection vectors (e.g. instructions without a role marker, unicode
look-alikes, or "ignore previous instructions") are not mitigated. Denylist
sanitization of a free-text prompt is inherently fragile — prefer passing
structured roles to the model. Tracked as a hardening limitation, not a break.

**F-SALES-B00-021** — `low` — Lines 108–116, 119–122.
No explicit timeout/abort on `aiClient.streamText`; a hung upstream stream is
bounded only by platform defaults (note: chat route has no `maxDuration`, unlike
the roleplay route line 14). The catch (line 119) returns a generic 500 — but a
streaming response that fails mid-stream after `toDataStreamResponse()` returns
won't hit this catch. Acceptable for v1; note for observability.

### 15. `app/api/lesson-complete/route.ts`

**F-SALES-B00-022** — `medium` — Lines 21–25.
Input validation is hand-rolled (`if (!lessonId)`) rather than Zod, contrary to
AGENTS "Use Zod for every external boundary." `lessonId` is taken from
`body.lessonId` with no type/shape check beyond truthiness, then passed to
`markTheoryLessonComplete`. Low blast radius (domain fn presumably validates),
but inconsistent with the chat/roleplay routes which use Zod.

**F-SALES-B00-023** — `medium` — Lines 18–27.
No role authorization on this endpoint. It validates the session but never calls
a sales-role gate (unlike chat's `authorizeSalesChat`). Any authenticated user
of any role (STUDENT/TEACHER from the shared auth system) can POST to mark a
sales theory lesson complete. The domain function may enforce
`assertCan(...,'sales:...')`, but this route does not, and there is no test in
this batch covering it. Confirm `markTheoryLessonComplete` enforces the sales
permission and tenant scoping.

**F-SALES-B00-024** — `low` — Line 27, 19.
`db as never` cast and `tenant = { schoolId: user.schoolId }` constructed from
the session user (correct — tenant derived server-side, not from client, which
satisfies the multi-tenancy rule). The `as never` cast on `db` is a type-safety
smell worth resolving but is not a runtime defect.

### 16. `app/api/roleplay-attempts/__tests__/route.test.ts`

**F-SALES-B00-025** — `low` — Lines 128–282.
Strong, scenario-focused tests for FR-4: (a) canonical source excerpts are
forwarded to the evaluator (lines 140–199), (b) `audioStorageKey=null` when
`storage.put` rejects — the no-orphan-reference invariant (201–232), (c) key
persisted on success (234–262), (d) 404 when scenario missing (264–282). Gaps:
no test for the 401 (missing/invalid session), 403 (non-sales role — note the
route itself has the same gap, see F-SALES-B00-027), 400 (missing fields), or
429 (rate limit) branches. Audio size/type limits are not asserted (see
F-SALES-B00-028). Coverage gaps, not defects.

### 17. `app/api/roleplay-attempts/route.ts`

**F-SALES-B00-026** — `info` — Lines 51–76.
FR-4 remediation is correctly implemented: scenario/rubric/excerpts are fetched
**before** upload and the evaluator closure forwards
`evaluationContext.canonicalSourceExcerpts` (line 109), and `audioStorageKey` is
only persisted when `audioUploadSucceeded` (line 117) — no orphan reference. Good
use of the storage adapter (`getStorageClient().put`, `public: false`) and AI
adapter. Privacy: audio is stored non-public, keyed by user id — reasonable.

**F-SALES-B00-027** — `high` — Lines 16–36.
**No role authorization.** The route validates the session and rate-limits, but
never gates by sales role (no `authorizeSalesChat`-equivalent / `assertCan`).
Any authenticated user from the shared auth system can submit a roleplay attempt
and trigger a (paid) AI evaluation. Authorization presumably lives inside
`submitRoleplayAttempt`, but the route should fail fast before the upload + AI
spend, and the test batch does not cover a forbidden-role case. Confirm and
add an explicit role gate consistent with the chat route. (Same class as
F-SALES-B00-023.)

**F-SALES-B00-028** — `medium` — Lines 38–49.
No validation of audio size or MIME type before buffering. `audioFile` is read
fully into memory via `arrayBuffer()` (line 47) with `maxDuration = 60` but no
max-bytes guard; a large upload is buffered into a Node Buffer before any limit
check, enabling a memory-pressure / cost vector even within the 10/hour rate
limit. `mimeType` defaults to `audio/webm` but is otherwise unchecked before
being sent to storage and the AI evaluator. `durationMs` is `parseInt`'d with no
bound (line 41). Add a Zod/size/type guard on the multipart fields.

### 18. `app/api/trpc/[trpc]/route.ts`

**F-SALES-B00-029** — `medium` — Lines 9–12.
`createContext` is called with only `{ authorization }` from the request header.
The sales-advantage UI authenticates via the `session_token` **cookie** (see
file 9 `useAuth`, and the auth routes). `createContext`/`getAuthToken`
(`packages/api/src/context.ts`) reads the cookie via `next/headers` `cookies()`
as the primary source and only falls back to the Authorization header — so this
works, but passing `authorization` here is redundant/misleading and relies on
the ambient `cookies()` request scope rather than the `req` passed to the
handler. Confirm `cookies()` resolves correctly in this route runtime; if it
ever doesn't, sales tRPC auth silently breaks.

**F-SALES-B00-030** — `high` — `packages/api/src/context.ts` lines 8, 52 (observed via this route's `appRouter`/`createContext` import).
`createContext` parses the session role with
`roleSchema = z.enum(["INTERN","STUDENT","TEACHER","ADMIN","SYSTEM"])` and calls
`roleSchema.parse(session.user.role)`. **`SALES_REP` and `SALES_ADMIN` are not
in this enum** (they exist in `packages/auth/src/roles.ts`). For a sales user,
`roleSchema.parse` throws, the `catch` on context.ts:66 swallows it, and `auth`
stays `null` — meaning every sales tRPC call (dashboard, modules, admin
cohort/createRep/approveContent) would be treated as unauthenticated. This
directly contradicts the working assumption of files 1–9 and the passing
sales-router tests (which construct context directly, bypassing this enum).
**This is the highest-impact finding in the batch** — verify whether the live
tRPC context enum has been updated to include sales roles; if not, the entire
sales tRPC surface is broken at runtime even though unit tests pass. (Flagged
from in-batch file 18's dependency; the enum file itself is out of batch scope.)

### 19. `app/globals.css`

Clean. Standard Tailwind v4 + theme token setup. Sales-specific primary/accent
palette defined. No findings.

### 20. `app/layout.tsx`

**F-SALES-B00-031** — `info` — Lines 8–13.
Root layout returns `children` directly (no `<html>`/`<body>`) because the
`[locale]` layout (file 6) owns the document shell. This is the standard
next-intl nested-layout pattern and is correct. Static `metadata` here is
overridden by `generateMetadata` in the locale layout. No finding beyond noting
the duplication of title/description between the two layouts.

---

## Cross-cutting observations

- **Authorization inconsistency (highest theme):** the chat route gates by sales
  role (`authorizeSalesChat`), but `lesson-complete` (F-SALES-B00-023) and
  `roleplay-attempts` (F-SALES-B00-027) do **not** add a route-level role gate.
  Combined with the tRPC role-enum gap (F-SALES-B00-030), authorization for the
  sales surface is uneven and warrants a focused verification pass on the domain
  layer.
- **Client-side casts:** pervasive `as unknown as {...}` on tRPC results across
  files 2, 4, 5, 7, 8, 9 erodes the end-to-end type safety tRPC is meant to
  provide. Likely caused by the sales router output type not being exported into
  the app's `AppRouter` shape.
- **Progression gating is cosmetic** (F-SALES-B00-014/-015) — must be confirmed
  server-side.
- **Adapter compliance is good:** AI (`getAIClient`), storage (`getStorageClient`),
  and auth (`validateSession`, shared `handle*` routes) are all used through
  adapters; no direct provider SDK calls observed in this batch.
- **Rate limiter** (`lib/rate-limit.ts`, referenced by files 13/14/16/17) is a
  documented best-effort in-memory limiter (FR-7 decision, not durable across
  instances) — out of batch file list but relevant to the chat/roleplay routes.

---

## Limitations

1. **Batch-scoped:** Only the 20 listed files were reviewed. Domain functions
   (`markTheoryLessonComplete`, `submitRoleplayAttempt`,
   `getRoleplayEvaluationContext`, `authorizeSalesChat`,
   `aiClientToEvaluateRoleplay`, `createRepAccount`), the sales tRPC router, the
   storage/AI adapters, and `lib/trpc.ts` / `lib/rate-limit.ts` were consulted
   only to validate specific claims and are **not** fully reviewed here.
2. Several findings (F-SALES-B00-005/-006/-014/-023/-027/-030) depend on
   behavior in out-of-batch modules; they are flagged for verification, not
   asserted as confirmed defects in those modules.
3. No code was executed and no tests were run; test-quality assessments are by
   inspection only.
4. F-SALES-B00-030 references `packages/api/src/context.ts` (out of batch) but is
   reachable directly through in-batch file 18's `createContext`/`appRouter`
   import; its runtime impact should be confirmed against the live enum.
5. This report makes **no acceptance or closeout claim** for the track or batch.

---

*End of `sales-batch-00` line review.*
