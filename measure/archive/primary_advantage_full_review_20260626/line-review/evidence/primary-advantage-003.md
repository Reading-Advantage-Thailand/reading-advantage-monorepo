# Line Review Evidence: primary-advantage-003

Reviewer: measure-jr-green/primary-advantage-003
Files assigned: 10
Lines assigned: 741

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/actions/pratice.ts` | 1-137 | reviewed | 2 |
| `apps/primary-advantage/actions/question.ts` | 1-196 | reviewed | 2 |
| `apps/primary-advantage/actions/signupAction.ts` | 1-27 | reviewed | 1 |
| `apps/primary-advantage/actions/singinAction.ts` | 1-41 | reviewed | 1 |
| `apps/primary-advantage/actions/test.ts` | 1-132 | reviewed | 3 |
| `apps/primary-advantage/actions/user.ts` | 1-101 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/(index)/about/page.tsx` | 1-21 | reviewed | 0 |
| `apps/primary-advantage/app/[locale]/(index)/authors/page.tsx` | 1-13 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/(index)/contact/page.tsx` | 1-15 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/(index)/layout.tsx` | 1-58 | reviewed | 1 |

## Findings

### LR-primary-advantage-003-001 — Test/admin server actions in `actions/test.ts` lack any authorization

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/actions/test.ts:14-132`
- Evidence: Every exported function in this `"use server"` file is reachable from any client without authentication or role gating: `generateAudios` (line 14), `generateWordAudios` (line 30), `uploadArticleImages` (line 42), `deleteArticleFile` (line 50), `deleteAllArticles` (line 55), and `generateImages` (line 106) all skip `currentUser()` and any role check. `deleteAllArticles` (lines 55-104) iterates over every `articles` row, deletes their associated files via `deleteFile`, then issues `db.delete(articles).returning({ id: articles.id })` on line 88, wiping the entire content corpus. None of the actions in the file are restricted to a system/admin role.
- Impact: Unauthenticated or low-privilege clients (including any primary student session) can trigger expensive AI generation, modify the public asset bucket, and destroy every article in the database. The destructive `deleteAllArticles` is the highest-impact path because it is a single round-trip to mass-delete content and storage. Reading Advantage's prior Prisma-era code at least called `currentUser()` first in equivalent handlers.
- Recommendation: Gate every action behind `currentUser()` plus an admin/system role check (e.g., a shared `assertRole(user, "admin")` helper). Move `deleteAllArticles` and other destructive functions behind an admin-only server-side authorization layer, and add audit logging per the root `AGENTS.md` observability section.

### LR-primary-advantage-003-002 — `actions/question.ts:116` operator-precedence bug silently zeroes MC XP multiplier

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/actions/question.ts:116`
- Evidence: Line 116: `xpEarned = data.score ?? 0 * UserXpEarned.MCQuestion;`. JavaScript's `??` operator has lower precedence than `*`, so the expression parses as `data.score ?? (0 * UserXpEarned.MCQuestion)`. When `data.score` is a real number, the multiplier is never applied; the multiplier is only evaluated when `data.score` is `null` or `undefined` (where the product is `0`). Compare with the SA_QUESTION branch (line 108) and LA_QUESTION branch (line 112) which simply use `data.score ?? 0`. The MC_QUESTION branch therefore always awards the raw score, not `score * MCQuestion`.
- Impact: Primary students completing a multiple-choice quiz never earn the intended MC XP multiplier, breaking the gamification balance vs. short-answer and long-answer quizzes. This regresses from the documented Reading Advantage intent where MC questions awarded a multiple of the raw score.
- Recommendation: Parenthesise the left operand: `xpEarned = (data.score ?? 0) * UserXpEarned.MCQuestion;`. Add a unit test in `actions/question.test.ts` (or equivalent) covering each `ActivityType` branch.

### LR-primary-advantage-003-003 — `actions/user.ts:43` always-empty `isCompleted` defeats `articleActivityLogs` completion tracking

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/actions/user.ts:43,60-80`
- Evidence: Line 43 declares `let isCompleted = {};` and never reassigns it inside `updateUserActivity`. The upsert at lines 60-80 spreads `...isCompleted` into both the `db.update(...).set(...)` payload and the `db.insert(articleActivityLogs).values(...)` payload, so the function always writes an empty object. The `articleActivityLogs` table columns `isShortAnswerQuestionCompleted`, `isMultipleChoiceQuestionCompleted`, and `isLongAnswerQuestionCompleted` therefore never receive a `true` value, even though the file documents itself as the user-activity tracker.
- Impact: Article-completion dashboards and report pages (which read these flags) will always show every activity as incomplete for users whose only entry point is `updateUserActivity`. The `finishQuiz` path in `actions/question.ts:106-121` does set the correct flag, so the regression is isolated to the second entry point. This is fork-specific because the same columns were populated correctly under Prisma.
- Recommendation: Branch on `type` (mirror the `finishQuiz` switch in `actions/question.ts:106-121`) and set the matching `is*Completed` flag. Consider extracting a shared `computeCompletedFlag(type)` helper to avoid future drift.

### LR-primary-advantage-003-004 — `actions/singinAction.ts` accepts but never uses `callbackUrl` and returns no success branch

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/actions/singinAction.ts:6-40`
- Evidence: `signInAction` (lines 6-40) accepts a `callbackUrl` parameter (line 8) but never references it. The function POSTs `{ username: email, password }` to `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/login` (lines 21-28) and only checks `response.ok`; the JSON body is discarded. There is no success branch (only an error path on lines 30-34) and no `redirect(callbackUrl)` on success. The auth state itself depends on `app/api/auth/login/route.ts` (a 2-line file in batch 013) setting a cookie, which the action does not verify.
- Impact: Login can silently fail to set a session cookie yet the action still returns no error, leaving the caller with an indeterminate UI state. The `callbackUrl` post-login redirect never happens. This regresses from the NextAuth/Prisma-era behavior where the action would either throw a credential error or trigger a session-bound redirect.
- Recommendation: Either drop `callbackUrl` from the signature if not used, or implement `redirect(callbackUrl)` on success after verifying the login response carries a session token. Surface login failures by checking the response body shape rather than just `response.ok`.

### LR-primary-advantage-003-005 — `actions/pratice.ts:67-70` server action self-fetches its own API via `NEXT_PUBLIC_APP_URL`

- Severity: High
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/actions/pratice.ts:67-70`
- Evidence: `getSentencesForOrderingGame` resolves `baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"` (line 67) and then issues `fetch(\`${baseUrl}/api/flashcard/decks/${deck.id}/sentences-for-ordering\`)` (lines 68-70). The `NEXT_PUBLIC_*` namespace is inlined into client bundles, and the function also makes an unnecessary HTTP round-trip to a route handler it could call in-process. The route itself is implemented in `app/api/flashcard/decks/[deckId]/sentences-for-ordering/route.ts` (batch 016).
- Impact: The production base URL is leaked into the client bundle, adding a reverse-proxy / SSRF / path-rewrite brittleness surface. In environments where the app sits behind a different external URL (Cloud Run, nginx), the self-fetch either fails or hits a non-canonical path, producing a 502-style error in the ordering game. The function also doubles latency by going through the HTTP loop instead of calling the implementation directly.
- Recommendation: Import the data function from `@/actions/flashcard` (or a shared `@/server/...` helper) and call it in-process. Drop the `NEXT_PUBLIC_APP_URL` dependency from this Server Action.

### LR-primary-advantage-003-006 — `actions/pratice.ts:49-56,110-117` queries `flashcardDecks` without `schoolId` tenant scope

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/actions/pratice.ts:49-56,110-117`
- Evidence: Both `getSentencesForOrderingGame` and `getFlashcardDeckId` filter `flashcardDecks` only by `eq(flashcardDecks.userId, user.id)` and `eq(flashcardDecks.type, "SENTENCE")`. Per root `AGENTS.md` multi-tenancy rule, every query must be scoped by `schoolId` (either directly or by joining through `users.schoolId`). The `userId` filter is user-scoped but does not prove the row's `userId` is currently a member of the same school.
- Impact: If a `userId` is reused or a user changes `schoolId` mid-session, a deck from a prior school can still resolve. Fork-specific only in the sense that the actions were ported wholesale; the same anti-pattern exists in Reading Advantage. For a multi-tenant primary-student deployment this is a privacy-relevant concern.
- Recommendation: Add `.innerJoin(users, eq(flashcardDecks.userId, users.id)).where(eq(users.schoolId, tenant.schoolId))` (or equivalent) to both queries, mirroring the multi-tenancy pattern required by the root AGENTS.md.

### LR-primary-advantage-003-007 — `actions/question.ts:97` unsafe `feedback as string` cast in `userActivity.details`

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/actions/question.ts:89-103`
- Evidence: The `userActivity` insert on lines 89-103 stores `details: { ..., feedback: data.feedback as string, ... }`. `data.feedback` is declared `string | undefined` on line 62, so the `as string` cast silently coerces an absent value into the literal string `"undefined"` at JSON-serialisation time. The same problem applies to `yourAnswer`, `responses`, and `suggestedAnswer` (lines 96-100), which are also optional and cast to plain types.
- Impact: When the caller omits `feedback` (common for MC quizzes), the persisted `userActivity.details` row contains the literal text `"undefined"`. The "feedback review" surface and any analytics that join on `details->>'feedback'` will treat that as a real value. This is fork-specific because the Prisma-era JSON column accepted `null` cleanly.
- Recommendation: Pass `feedback: data.feedback ?? null` (drop the `as string` cast) and align the column type to `text | null`. Apply the same null-safe treatment to the other optional detail fields.

### LR-primary-advantage-003-008 — `app/[locale]/(index)/layout.tsx:48` strips user fields to satisfy `UserAccountNav` shape

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/(index)/layout.tsx:48`
- Evidence: Line 48: `<UserAccountNav user={{ ...user, xp: 0, level: 0, cefrLevel: "", email: null, image: null }} />`. The spread overwrites the live `user.xp`, `user.level`, `user.cefrLevel`, `user.email`, and `user.image` with hardcoded zero/empty values. The sign-out path on lines 17-39 omits `UserAccountNav` entirely (it renders `MainNav` + a "login" link instead), so the spread is only reached for authenticated users.
- Impact: Authenticated primary students reaching the public landing pages see `xp=0, level=0, cefrLevel=""` in the header account menu, hiding their progress. If the divergence is intentional (e.g., "public pages hide progress to avoid attracting attention"), it is not documented anywhere. If it is a type-mismatch workaround, the real fix is to widen `UserAccountNav`'s prop type.
- Recommendation: Update `UserAccountNav` to accept the full `User` type from `getCurrentUser()` and pass `user` through, or document the intentional stripping in the layout comment and the index-page AGENTS.md.

### LR-primary-advantage-003-009 — `app/[locale]/(index)/contact/page.tsx` hardcodes personal email in source

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/[locale]/(index)/contact/page.tsx:10`
- Evidence: Line 10 inlines `Daniel Bo: admin@reading-advantage.com.` as static text. There is no `getTranslations` call (compare `app/[locale]/(index)/about/page.tsx:7`), no translatable string, and no contact form. The page is reached from the public site and is intended to be student-visible.
- Impact: A primary-student-facing page exposes a plaintext admin email, increasing spam/social-engineering risk and breaking locale coverage (the other four locales still render English contact info). A contact form routed through shared support tooling is the expected pattern.
- Recommendation: Replace the literal with a translatable `t("contact")` string from `messages/<locale>.json` (matching the `about/page.tsx` pattern) or route through a shared contact form / support inbox adapter.

### LR-primary-advantage-003-010 — `actions/test.ts` uses unstructured `console.log/error` instead of a structured logger

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/actions/test.ts:25,38,64-66,82-84,90,101,129`
- Evidence: `console.log("error", error)` appears on lines 25, 38, 101, and 129 (inside the destructive `deleteAllArticles` and AI-generation actions). Operational context is logged via `console.log` on lines 64 (`Deleting ${n} articles and their associated files...`), 82 (`File deletions - Success: ..., Failed: ...`), and 90 (`Successfully deleted ${n} article records`). None include a request id, user id, or operation name. Root `AGENTS.md` observability section requires structured logs with request/user/operation metadata.
- Impact: Unstructured logs are unsearchable in production; sensitive context (who triggered `deleteAllArticles`, request id, actor role) is lost. For a destructive admin path, this is a compliance gap.
- Recommendation: Replace `console.log`/`console.error` with the internal structured logger used elsewhere in the app (or add one if missing), and include `{ operation, actor, requestId }` metadata on each log call.

### LR-primary-advantage-003-011 — `actions/test.ts:14-22` declares but never uses `article` for permission checks in `generateAudios`

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/actions/test.ts:14-22`
- Evidence: `generateAudios` (lines 14-28) calls `const article = await getArticleById(articleId)` on line 16, then calls `generateAudio({ passage: article.article.passage, articleId })` on lines 18-21. The function loads a full article row (which presumably includes tenant/owner metadata) but never inspects any field other than `article.article.passage` for authorization or scoping. Sibling `generateWordAudios` (lines 30-41) has the `getArticleById` call commented out. No `currentUser()` call appears in either function.
- Impact: Code-quality issue with security implications. If `getArticleById` is later updated to require a tenant scope, this function would silently bypass that scope. Combined with the missing auth check in finding 001, any caller can regenerate audio for any article.
- Recommendation: Either pass `articleId` only to `generateAudio` (if that is all the function needs) or use the loaded `article` to perform an authorization check. Document the intended usage in the action comment.

### LR-primary-advantage-003-012 — `actions/signupAction.ts:24-26` discards the created user object

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/actions/signupAction.ts:7-27`
- Evidence: `signUpAction` returns `{ success: result.success }` on line 25. `createUser` (line 16) presumably returns the new user (for auto-login, session creation, or welcome-email routing), but the action throws that object away. The success branch is the only data the calling form receives.
- Impact: After signup, the calling UI cannot auto-login the user or surface the new user id; the developer has to wire a separate fetch to `/api/auth/session` or similar. Slight regression in UX flow vs. typical NextAuth-style signups.
- Recommendation: Return `{ success: true, user: result.user }` (or a similar shape) so callers can complete the post-signup flow without an extra round-trip. Pair with a `redirect()` to a welcome page if appropriate.

### LR-primary-advantage-003-013 — `app/[locale]/(index)/authors/page.tsx` is a placeholder with no i18n

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/(index)/authors/page.tsx:5-12`
- Evidence: The page renders a hardcoded English "Authors Page" paragraph on line 9 without `getTranslations`. The sibling `about/page.tsx:7` uses `next-intl`, and `contact/page.tsx` also omits i18n (covered in finding 009). The route still resolves under all five supported locales (`en`, `th`, `cn`, `tw`, `vi`) because of the `[locale]` segment.
- Impact: Locale switching still shows "Authors Page" in English across every locale. Minor UX issue, but inconsistent with the rest of the public surface and the i18n-first policy enforced by `messages/<locale>.json`.
- Recommendation: Replace the hardcoded text with a translatable string from `messages/<locale>.json`, or remove the page if it is not used.

## No-Finding Notes

- `apps/primary-advantage/app/[locale]/(index)/about/page.tsx`: reviewed line-by-line (lines 1-21); static translatable page using `getTranslations("AboutPage")`; no findings.
