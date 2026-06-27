# Line Review Evidence: primary-advantage-005

Reviewer: measure-jr-green/primary-advantage-005
Files assigned: 10
Lines assigned: 615

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/error.tsx` | 1-30 | reviewed | 2 |
| `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/loading.tsx` | 1-35 | reviewed | 0 |
| `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx` | 1-134 | reviewed | 5 |
| `apps/primary-advantage/app/[locale]/(student)/student/read/loading.tsx` | 1-33 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/(student)/student/read/page.tsx` | 1-172 | reviewed | 3 |
| `apps/primary-advantage/app/[locale]/(student)/student/reports/page.tsx` | 1-48 | reviewed | 2 |
| `apps/primary-advantage/app/[locale]/(student)/student/sentences/page.tsx` | 1-59 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/(student)/student/vocabulary/page.tsx` | 1-19 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/[...not-found]/layout.tsx` | 1-35 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/[...not-found]/page.tsx` | 1-50 | reviewed | 2 |

## Findings

### LR-primary-advantage-005-001 — Article error boundary never sets HTTP 404 status

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/error.tsx:5-30`
- Evidence: The error component (lines 5-30) renders a custom 404-styled page with `<h1>404</h1>` and "Article Not Found" text, but it does not call `notFound()` from `next/navigation` and does not set any HTTP status header. Next.js will serve the error segment with the default 200 OK. The reading-advantage equivalent renders `notFound()` (its `read/[articleId]/page.tsx:86-89` delegates to a `CustomError` component when `articleResponse.message` is set, but the segment `not-found.tsx` boundary still uses Next's native `notFound()`).
- Impact: Search engines and HTTP-aware clients receive 200 OK for missing articles, breaking SEO for `student/read/[articleId]` URLs and degrading error monitoring. Returning 200 for missing content also weakens any future CDN/bot filtering.
- Recommendation: Move the 404 logic into a sibling `not-found.tsx` in the same segment that calls `notFound()` first, or import `notFound` from `next/navigation` at the top of the component and invoke it before returning JSX.

### LR-primary-advantage-005-002 — `"use client"` directive on a purely presentational error component

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/error.tsx:1`
- Evidence: The file starts with `"use client";` (line 1) but the component only uses the i18n `Link` import (line 3) and renders static markup (lines 6-29). There is no `useState`, `useEffect`, `useRouter`, `useTranslations`, event handler, or other client-only API. The `Link` from `@/i18n/navigation` is a server-component-compatible wrapper. The same error page in reading-advantage is implemented as a server component (`apps/reading-advantage/app/[locale]/(student)/student/read/[articleId]/custom-error.tsx` is a server component, not `"use client"`).
- Impact: Forcing the error boundary into a client component increases hydration cost and prevents the segment from streaming the static 404 markup. Document the divergence in `apps/primary-advantage/AGENTS.md` if it is intentional.
- Recommendation: Remove the `"use client"` directive unless a client-side hook is added; the error page can be a server component.

### LR-primary-advantage-005-003 — Lowercase role string comparison diverges from reading-advantage

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx:48-51`
- Evidence: The page defines `isAtLeastTeacher = (role) => role.includes("teacher") || role.includes("admin") || role.includes("system")` (lines 48-51) and uses it to gate teacher tools (lines 82-90). The reading-advantage equivalent at `apps/reading-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx:78-84` uses uppercase values (`"TEACHER"`, `"ADMIN"`, `"SYSTEM"`) and also defines a separate `isAboveTeacher` helper for admin/system roles. If the role column in `@reading-advantage/db` was migrated to lowercase, this works locally, but the inconsistent case-sensitivity creates a silent authorization surface (e.g., `role = "Teacher"` would pass primary but fail reading).
- Impact: Authorization is done by string `includes`, which is fragile (matches substrings such as `"systemAdministrator"`). A typo in the role enum upstream would silently lock out teachers. Cross-app behavior is inconsistent.
- Recommendation: Centralize the role check in a shared helper (e.g., `packages/auth/src/roles.ts`) and use `role.toUpperCase()` or a typed enum comparison; align with reading-advantage's uppercase constants.

### LR-primary-advantage-005-004 — Side effect during render: `saveArticleToFlashcard` called inside the page component

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx:58-69`
- Evidence: Lines 58-69 call `await saveArticleToFlashcard(articleId, article.articleActivityLog[0].id)` inside the default-export server component. The check is gated by `isLongAnswerQuestionCompleted && isShortAnswerQuestionCompleted && isMultipleChoiceQuestionCompleted`. React may render server components multiple times during dev; the unconditional call would re-write the flashcard deck on every render. The reading-advantage equivalent (`read/[articleId]/page.tsx:1-181`) does not perform write-side-effects in the page render.
- Impact: Possible duplicate inserts into `flashcardDecks` / `flashcardCards` and unintended `userActivity` rows. Idempotency is not guaranteed; concurrent renders (e.g., during HMR) could race. This pattern violates Next.js App Router guidance that server components should not perform mutations.
- Recommendation: Move the auto-save logic into a Server Action triggered by a `useEffect`/client form, or guard with a `saveArticleToFlashcard` idempotency key (e.g., `idempotencyKey = ${userId}:${articleId}:${lastActivityAt}`) before insert.

### LR-primary-advantage-005-005 — `as unknown as Article & { articleActivityLog: any[] }` defeats type safety

- Severity: High
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx:75-79`
- Evidence: The page casts the model to `Article & { articleActivityLog: any[] }` (lines 75-79) before passing to `<ArticleCard />`. The model `getArticleById` returns from `server/models/articleModel.ts:1-812` with a richer Prisma-era shape that does not match the current Drizzle `Article` type. The `as any[]` array bypass means downstream `article.articleActivityLog.some(...)` (lines 53-67) is unchecked.
- Impact: The Drizzle migration is incomplete for the article domain; type-system protection is bypassed. A schema rename or column removal in `@reading-advantage/db` will fail silently at runtime, blocking the "fully removed Prisma" claim referenced in `apps/primary-advantage/AGENTS.md:21-54`.
- Recommendation: Extend `packages/db/src/schema/primary.ts` (or a shared `article.ts`) to declare `articleActivityLog` as a typed relation, regenerate Drizzle types, and remove the `as unknown as ...` cast.

### LR-primary-advantage-005-006 — Dead commented-out `PrintArticle`, `ArticleActions`, and `ChatBotFloatingChatButton` blocks

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx:84-96,129-131`
- Evidence: Lines 84-96 leave a commented-out `PrintArticle` and `ArticleActions` block; lines 129-131 leave a commented-out `<ChatBotFloatingChatChatButton>` at the bottom. The reading-advantage equivalent actively uses `PrintArticle`, `ArticleActions`, and `ChatBotFloatingChatChatButton` (lines 104-119, 176-178 of `apps/reading-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx`).
- Impact: Primary students lose in-article printing, article actions, and chatbot help. Dead code bloats the file and signals an incomplete migration or a deferred product decision.
- Recommendation: Either port the three features or document in `apps/primary-advantage/AGENTS.md` that they are intentionally out-of-scope for primary students, and delete the commented blocks.

### LR-primary-advantage-005-007 — Unsafe `[0]` access on `article.sentencsAndWordsForFlashcard`

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx:100-115`
- Evidence: Lines 100-105 and 108-115 access `article.sentencsAndWordsForFlashcard[0].wordsUrl` and `article.sentencsAndWordsForFlashcard[0].audioSentencesUrl` without checking the array length. If the article has no `sentencsAndWordsForFlashcard` row (a valid state for older articles, articles without a generated flashcard set, or articles in a different CEFR bucket), `.flatMap` returns `[]` and `[0]` throws `TypeError: cannot read properties of undefined`.
- Impact: The page hard-500s for any article missing a flashcard content row, blocking the article rendering. This is fork-specific because the Prisma-era relation was non-empty by default.
- Recommendation: Guard the access: `const first = article.sentencsAndWordsForFlashcard[0];` and conditionally render `<WordList />` and `<Sentence />` only when `first` is defined.

### LR-primary-advantage-005-008 — Unauthenticated access on `student/read` and missing tenant scoping

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(student)/student/read/page.tsx:40-53`
- Evidence: The page calls `const user = await currentUser()` (line 42) but never checks for `null` and never redirects. The `fetchArticles` controller (`server/controllers/articleController.ts:100-118`) does not call `currentUser` and does not filter by `schoolId`; the underlying `getArticlesWithParams` is invoked with no tenant scope. The reading-advantage equivalent (`read/page.tsx:16-17`) requires `getCurrentUser()` and redirects on null.
- Impact: Anonymous users can enumerate every article in every school. Multi-tenancy is violated: a primary student in school A can read articles in school B's deck. The root `AGENTS.md` multi-tenancy section is contradicted.
- Recommendation: Add `if (!user) return redirect("/auth/signin")` after line 42, and update `fetchArticles` to call `currentUser` and pass `schoolId` to `getArticlesWithParams`, filtering by `articles.schoolId` (or via `TenantDB` if the table is FLAT-classified in `packages/domain/src/tenant-registry.ts`).

### LR-primary-advantage-005-009 — Hardcoded `limit: "10"` and `offset: "0"` pagination

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/(student)/student/read/page.tsx:45-53`
- Evidence: Lines 45-53 build a `URLSearchParams` with hardcoded `limit: "10"` and `offset: "0"`. There is no UI for changing the page size, and the `ArticleSelect` consumer (`components/articles/article-select.tsx`) has no way to advance to page 2 from this page. The reading-advantage `read/page.tsx` (33 lines) delegates selection entirely to a `<Select>` component without server-side fetch.
- Impact: A primary student or teacher can only ever see 10 articles. The reset filter (lines 152-160) drops `type/genre/subgenre` but the underlying `initialData.articles` is still the first 10 of the unfiltered list, so the "filter" is effectively decoupled from the fetch.
- Recommendation: Pass `type/genre/subgenre` to `ArticleSelect` and let it call `fetchArticles` with the appropriate page size; or document the 10-article cap in `apps/primary-advantage/AGENTS.md` if it is a deliberate primary-student simplification.

### LR-primary-advantage-005-010 — Unused import `translateAndStoreSentences`

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/(student)/student/read/page.tsx:17`
- Evidence: Line 17 imports `translateAndStoreSentences` from `@/server/utils/genaretors/sentence-translator`. The import is never referenced anywhere in the file (lines 1-172). The same deviance in `actions/flashcard.ts:36` is already documented (LR-primary-advantage-002-008) as dead-import cleanup needed.
- Impact: Dead import; minor bundle/IDE overhead; signal of incomplete migration. Not security-critical.
- Recommendation: Remove the import on line 17, or wire it up to a server-side seed pass during a primary-student-specific content pre-flight.

### LR-primary-advantage-005-011 — `Reports` page renders the auth error page as a fallback

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/(student)/student/reports/page.tsx:6,16-18,24-26`
- Evidence: The page imports `AuthErrorPage` from `@/app/[locale]/auth/error/page` (line 6) and returns it as a component when `user` is null (lines 16-18) or when activity data is missing (lines 24-26). The `auth/error/page.tsx` is a 9-line page component (not a reusable component) and returns HTTP 200 by default. The reading-advantage `read/page.tsx:16-17` uses `redirect("/auth/signin")` for the same case.
- Impact: Returning a sibling page as a component risks a duplicate-layout render (the auth error page will be wrapped by any parent layout) and conflates "auth failure" with "data failure" (both paths return the same component, but they have different root causes). The auth page is intended for an error.tsx boundary, not as a substitute for proper redirects.
- Recommendation: Replace lines 16-18 with `if (!user) return redirect("/auth/signin");` and replace lines 24-26 with a proper empty-state component or a typed error response; remove the `AuthErrorPage` import on line 6.

### LR-primary-advantage-005-012 — `Reports` page does not scope `fetchUserActivity` by school/tenant

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(student)/student/reports/page.tsx:14-22`
- Evidence: Line 22 calls `fetchUserActivity(user.id)` without verifying that the user belongs to the active tenant/school. The `userController` import (line 4) does not surface a `schoolId` filter at the call site, and reading-advantage's `Reports` flow enforces tenant scoping at the controller layer.
- Impact: If the user is impersonating, has an outdated session, or a request crosses a tenant boundary, the report will leak another school's student activity / XP logs / heatmap. The page also lacks an explicit `if (user.schoolId !== ...)` guard before rendering `CEFRLevels` (line 42), which prints the user's own level — a minor privacy concern in shared devices.
- Recommendation: Add `currentUser({ schoolId: true })` (or extend `currentUser` to include `schoolId`) and filter `fetchUserActivity` server-side by `users.schoolId`; ensure the `userActivity` table is FLAT-classified in `packages/domain/src/tenant-registry.ts` or use `tenantDb.unscoped("...")` with explicit owner-FK joins.

### LR-primary-advantage-005-013 — `Sentences` page has no auth check and exposes all sentence flashcards to anonymous traffic

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(student)/student/sentences/page.tsx:11-13`
- Evidence: The page is a server component that calls `await getAllSentenceCards()` (line 12) and never calls `currentUser()` or redirects on null user. The `getAllSentenceCards` action is a Server Action in `@/actions/flashcard`; the consumer does not gate by role/school. Reading-advantage's `Sentences` flow requires authentication before any server action call.
- Impact: Anonymous users can trigger a Server Action that reads all sentence flashcards across all schools. The `TabsList` (lines 18-37) then renders `<FlashcardDashboard type="SENTENCE" />` (line 39) and the manage tab passes `flashcardsResult.cards` (line 54) to `<ManageTab>` — all without auth context. Multi-tenancy is violated and the manage UI may let anonymous callers mutate flashcards.
- Recommendation: Add `const user = await currentUser(); if (!user) return redirect("/auth/signin");` before line 12; pass `user.id` to `getAllSentenceCards` and have it filter by `users.schoolId`.

### LR-primary-advantage-005-014 — `Vocabulary` page is publicly accessible and uses a 6-column TabsList for a single tab

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(student)/student/vocabulary/page.tsx:5-19`
- Evidence: The page is a server component (lines 5-19) with no `currentUser()` call and no redirect. It renders `<TabsList className="grid h-fit w-full grid-cols-1 md:grid-cols-6">` (line 9) but only one `<TabsTrigger value="flashcard">` (line 10). The single tab is then rendered into `<FlashcardDashboard type="VOCABULARY" />` (line 15), a server action consumer that requires auth.
- Impact: Anonymous users can hit `/student/vocabulary` and trigger Server Actions that read vocabulary flashcards across all schools. The 6-column `TabsList` is also visually misleading on the page (empty cells, no other tabs) — a primary-student UX regression compared to the sentences page where the 6 columns are populated.
- Recommendation: Add `const user = await currentUser(); if (!user) return redirect("/auth/signin");`; simplify the TabsList to a single `TabsTrigger` and a non-grid wrapper (e.g., a plain `<div>` or a single-column `grid-cols-1`).

### LR-primary-advantage-005-015 — `[...not-found]/layout` hardcodes user fields to empty values

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/[...not-found]/layout.tsx:26`
- Evidence: Line 26 renders `<UserAccountNav user={{ ...user, xp: 0, level: 0, cefrLevel: "", email: null, image: null }} />`. The spread `...user` is overridden by explicit empty/null fields for `xp`, `level`, `cefrLevel`, `email`, and `image`. Reading-advantage's not-found layout passes the real user object without overrides.
- Impact: `UserAccountNav` will render an anonymized user chip (no XP, no level, no email, no avatar). For a 404 page this is intentional (don't show real data on a missing URL), but the hardcoded zeros also break any client-side component that reads `user.xp` to compute progress bars or achievement toasts. If `UserAccountNav` is reused elsewhere expecting real values, this is a divergence that needs documentation.
- Recommendation: Either pass the real `user` and rely on `UserAccountNav`'s null-safety, or create a dedicated `anonymousUser` constant in a shared module and reuse it. Document the divergence in `apps/primary-advantage/AGENTS.md`.

### LR-primary-advantage-005-016 — `[...not-found]/page` is a heavy custom 404 that returns HTTP 200

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/[...not-found]/page.tsx:1-50`
- Evidence: The page is a 50-line `"use client"` component that renders a custom 404 with a "Go Back" button and a "Return to Website" link (lines 6-49). It does not call `notFound()` from `next/navigation` and does not set any HTTP status; Next.js will serve the page with status 200 OK. Reading-advantage's `[...not-found]/page.tsx:1-5` is a 5-line server component that simply calls `notFound()` and lets the framework render the `not-found.tsx` boundary.
- Impact: SEO crawlers and HTTP-aware clients receive 200 OK for any non-existent route under `/[locale]/...`. CDN error pages, monitoring alerts, and the Next.js error boundary flow are all bypassed. The custom 404 also embeds client-side `window.history.length` checks (lines 11-18) that are unreachable if the page is server-rendered (this is `"use client"`, so they work, but the page could be a server component to keep the 404 fully streamable).
- Recommendation: Keep the visual 404 markup but split it: a server `page.tsx` that calls `notFound()` and a separate client component for the 404 visual; or use the App Router `not-found.tsx` convention.

### LR-primary-advantage-005-017 — `[...not-found]/page` uses `<button>` + `router.back()` instead of the i18n `<Link>`

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/[...not-found]/page.tsx:10-18,33-38`
- Evidence: Lines 10-18 define `handleGoBack` using `useRouter` from `@/i18n/navigation`, then bind it to a `<button onClick={handleGoBack}>` (lines 33-38). Reading-advantage's not-found flow uses `<Link>` for navigation; the i18n-aware `<Link>` from `@/i18n/navigation` is already imported in the file (line 3) and used for the "Return to Website" link (lines 39-45).
- Impact: The "Go Back" button runs a client-side history pop, which loses i18n locale context if the previous URL had a different locale, and breaks for users with JavaScript disabled (the 404 page should still be navigable). Inconsistent with the `<Link>` used for "Return to Website" in the same file.
- Recommendation: Replace the button with a typed fallback (e.g., `<Link href={previousUrl}>` resolved server-side) or keep the button but make sure the JS-disabled path falls back to the `<Link>` to "/".

### LR-primary-advantage-005-018 — `read/loading.tsx` declares `async function` for a component that performs no awaits

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/(student)/student/read/loading.tsx:11`
- Evidence: `export default async function Loading()` (line 11) is declared `async` but the body (lines 12-32) contains no `await` expressions. The `Header` (line 14) accepts a plain string heading. The reading-advantage equivalent uses a synchronous default export.
- Impact: Trivial runtime cost; signals an incomplete refactor. Not security-critical.
- Recommendation: Drop the `async` keyword on line 11.

## No-Finding Notes

- `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/loading.tsx`: reviewed line-by-line (1-35); pure skeleton placeholder using `Card`/`CardContent`/`CardHeader`/`CardTitle` and `Skeleton` from `@/components/ui/*`. No findings.
