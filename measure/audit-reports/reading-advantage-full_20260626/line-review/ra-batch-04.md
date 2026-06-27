# Line Review: ra-batch-04 — Security / Data-Handling / Auth-Boundary Audit

> **Track:** `reading_advantage_full_review_20260626`
> **Review role:** B — Security, Tenancy, Auth-Boundary
> **Batch ID:** ra-batch-04
> **Date:** 2026-06-27
> **Baseline SHA:** 6921fda0ee45012232bdd71c444d4e9523a10ab6
> **Files reviewed:** 20

---

## Files Inspected

| # | File | Route Group | Key Function |
|---|------|------------|--------------|
| 1 | `(student)/student/read/[articleId]/page.tsx` | student | Article quiz page |
| 2 | `(student)/student/read/loading.tsx` | student | Loading skeleton |
| 3 | `(student)/student/read/page.tsx` | student | Article selection |
| 4 | `(student)/student/reports/page.tsx` | student | Student dashboard/reports |
| 5 | `(student)/student/sentences/page.tsx` | student | Sentence practice |
| 6 | `(student)/student/stories/[storyId]/[chapterNumber]/custom-error.tsx` | student | Chapter error display |
| 7 | `(student)/student/stories/[storyId]/[chapterNumber]/error.tsx` | student | Next.js error boundary |
| 8 | `(student)/student/stories/[storyId]/[chapterNumber]/loading.tsx` | student | Chapter loading skeleton |
| 9 | `(student)/student/stories/[storyId]/[chapterNumber]/page.tsx` | student | Story chapter page |
| 10 | `(student)/student/stories/[storyId]/error.tsx` | student | Story error boundary |
| 11 | `(student)/student/stories/[storyId]/loading.tsx` | student | Story loading skeleton |
| 12 | `(student)/student/stories/[storyId]/page.tsx` | student | Story chapter selection |
| 13 | `(student)/student/stories/[storyId]/stories-custom-error.tsx` | student | Story custom error |
| 14 | `(student)/student/stories/loading.tsx` | student | Story list loading |
| 15 | `(student)/student/stories/page.tsx` | student | Story selection |
| 16 | `(student)/student/vocabulary/page.tsx` | student | Vocabulary practice |
| 17 | `(system)/system/dashboard/loading.tsx` | system | System dashboard loading |
| 18 | `(system)/system/dashboard/page.tsx` | system | System dashboard |
| 19 | `(system)/system/handle-passages/loading.tsx` | system | Handle passages loading |
| 20 | `(system)/system/handle-passages/page.tsx` | system | Handle passages |

---

## Findings

### Finding B4-001: System Dashboard Page — Missing Authentication

**Severity:** Critical
**Category:** Auth / Access Control
**File:** `apps/reading-advantage/app/[locale]/(system)/system/dashboard/page.tsx`
**Lines:** 6–23

**Description:** The system dashboard page (`(system)/system/dashboard/page.tsx`) performs **no authentication check**. Unlike every other page in this batch that calls `getCurrentUser()` and redirects unauthenticated users, this page loads i18n and renders `SystemDashboardClient` without verifying the user's session. The `(system)` route group naming suggests this should be restricted to SYSTEM-level users, but neither the page nor any visible middleware enforces this.

**Evidence:**
```tsx
// page.tsx lines 6-14 — no getCurrentUser() call
export default async function SystemDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const t = await getScopedI18n("pages.system.dashboard");
  // No getCurrentUser() — renders SystemDashboardClient unconditionally
```

Compare with the authorized sibling `handle-passages/page.tsx` which at minimum calls `getCurrentUser()` (line 10).

**Impact:** Any unauthenticated visitor can access the system dashboard. If `SystemDashboardClient` performs its own auth check client-side via API calls, the server page still renders server-side i18n content and the client skeleton, leaking the existence and structure of the system dashboard. If the client component fails to check auth properly, the entire system dashboard is exposed.

**Recommendation:** Add `getCurrentUser()` and verify the user has `SYSTEM` or `ADMIN` role before rendering. Redirect to `/auth/signin` if unauthenticated, or to a 403 page if the role is insufficient.

---

### Finding B4-002: System Handle-Passages Page — Missing Role Gate

**Severity:** Critical
**Category:** Auth / Access Control
**File:** `apps/reading-advantage/app/[locale]/(system)/system/handle-passages/page.tsx`
**Lines:** 9–26

**Description:** The handle-passages page calls `getCurrentUser()` and redirects unauthenticated users, but performs **no role check**. Any authenticated user — including `STUDENT` — can access the system-level "Handle Passages" page. The `(system)` route group implies SYSTEM/ADMIN-only access, but there is no role enforcement.

**Evidence:**
```tsx
// page.tsx lines 9-13 — authenticates but no role gate
export default async function SystemPage() {
  const user = await getCurrentUser();
  if (!user) {
    return redirect("/auth/signin");
  }
  // Missing: if (user.role !== "SYSTEM" && user.role !== "ADMIN") redirect(...)
  return ( ... <HandleArticle /> ... );
}
```

**Impact:** A student who knows the URL can access system content management tools. While `HandleArticle` likely performs its own server-side or API-level authorization, the page itself should not be accessible. This exposes admin tooling UI to unauthorized roles and violates the principle of defense-in-depth.

**Recommendation:** Add a role check after `getCurrentUser()`: redirect users without `SYSTEM` or `ADMIN` role to `/auth/signin` or a dedicated forbidden page.

---

### Finding B4-003: Direct DB Access in Page Component Bypassing Domain Layer

**Severity:** High
**Category:** Architecture / Data Access
**File:** `apps/reading-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx`
**Lines:** 9, 34–54

**Description:** The article page imports `db`, `and`, and `eq` directly from `@reading-advantage/db` and executes a raw Drizzle query in the `getArticleRating` function. This bypasses:
1. The `@reading-advantage/domain` layer mandated by `AGENTS.md`.
2. Tenant scoping — the query has no `schoolId` filter, so it reads `userActivity` across all tenants.
3. Permission checks — no `assertCan` or ownership verification.
4. Any shared business logic for activity retrieval.

**Evidence:**
```tsx
// line 9
import { db, and, eq } from "@reading-advantage/db";

// lines 39-48 — raw DB query in a page component
const [activity] = await db
  .select({ details: userActivity.details })
  .from(userActivity)
  .where(
    and(
      eq(userActivity.userId, userId),
      eq(userActivity.activityType, "ARTICLE_RATING"),
      eq(userActivity.targetId, articleId),
    ),
  )
  .limit(1);
```

**Impact:**
- No tenant isolation on the `userActivity` read — the query works correctly only because `userId` is unique, but this pattern, if copied, would leak cross-tenant data for tables without per-user uniqueness.
- Business logic (how to fetch article rating) is embedded in the view layer, violating separation of concerns.
- Contributes to the 209 direct-DB-import problem documented in `findings.md` (this is one instance of the pattern).
- The `catch` block (line 51) silently returns `0` for any error, masking DB connection failures, permission errors, or schema mismatches.

**Recommendation:** Move this logic into a domain function (e.g., `getArticleRating({ userId, articleId, tenant })`) in `@reading-advantage/domain` that performs the query through `TenantDB` with proper scoping. The page should call that domain function.

---

### Finding B4-004: Unsafe Type Cast on User Activity JSON Details

**Severity:** High
**Category:** Type Safety / Data Validation
**File:** `apps/reading-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx`
**Line:** 50

**Description:** The `userActivity.details` column (a JSON/JSONB field) is cast to `any` and the `rating` property is accessed without validation:

```tsx
return (activity?.details as any)?.rating ?? 0;
```

If the JSON structure changes, is corrupted, or `details` contains unexpected data, this silently returns `0` — which is indistinguishable from "user hasn't rated." There is no Zod validation on the parsed JSON to confirm the expected shape.

**Impact:**
- Malformed JSON silently interpreted as "no rating" — the student's previously submitted rating is lost.
- If `details.rating` is a string (e.g., `"4"` instead of `4`), it passes truthiness but may cause JavaScript comparison bugs downstream.
- No error boundary catches the shape mismatch.

**Recommendation:** Define a Zod schema for the expected `details` shape (`z.object({ rating: z.number().int().min(1).max(5) })`) and `safeParse` the JSON. Return `0` only on validation failure with a logged warning.

---

### Finding B4-005: Custom Error Components Leak Server Response Data to Client

**Severity:** Medium
**Category:** Information Disclosure
**Files:**
- `apps/reading-advantage/app/[locale]/(student)/student/stories/[storyId]/[chapterNumber]/custom-error.tsx` (line 22–25)
- `apps/reading-advantage/app/[locale]/(student)/student/stories/[storyId]/stories-custom-error.tsx` (lines 22–25)
- `apps/reading-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx` (indirectly — passes `articleResponse` to CustomError)

**Description:** The custom error components use `JSON.stringify(resp)` to render the full API response object in the DOM. The `resp` parameter is typed as `any` and comes directly from `fetchData()`, which returns the raw JSON from an API endpoint. This can expose:
- Internal error messages
- Database IDs
- Stack traces (if the API includes them)
- Query parameters
- System-internal metadata

**Evidence:**
```tsx
// stories-custom-error.tsx lines 21-25
<p className="text-center text-red-500 dark:text-red-300">
  Error message: {message}
  <br />
  Invalids: {JSON.stringify(resp)}  // ← Raw API response rendered in DOM
</p>
```

Compare with the Next.js error boundary implementations (`[chapterNumber]/error.tsx`, `[storyId]/error.tsx`) which correctly gate error detail display behind `process.env.NODE_ENV === "development"`.

**Impact:** In production, users see raw API error data including potentially sensitive internal details. This violates the principle of not exposing server internals to clients.

**Recommendation:** Either:
1. Gate `JSON.stringify(resp)` behind `process.env.NODE_ENV === "development"` (consistent with Next.js error boundaries), or
2. Display only `message` (which should be a user-friendly, sanitized string) and log the full response server-side.

---

### Finding B4-006: Stories Loading Page Uses Wrong i18n Scope

**Severity:** Medium
**Category:** Correctness / i18n
**File:** `apps/reading-advantage/app/[locale]/(student)/student/stories/loading.tsx`
**Line:** 13

**Description:** The stories loading skeleton uses the i18n scope `pages.student.readPage` (intended for the article reading page) instead of `pages.student.storyPage`:

```tsx
// stories/loading.tsx line 13
const t = await getScopedI18n("pages.student.readPage");  // ← Wrong scope
// ...
<Header heading={t("articleSelection")} />  // ← Displays "Article Selection" on stories page
```

Compare with the correct usage in `stories/page.tsx` (line 19):
```tsx
const t = await getScopedI18n("pages.student.storyPage");
```

**Impact:** During loading, the stories page heading shows "Article Selection" instead of "Story Selection" — a UX bug that misleads users about where they are. If the translation key `t("articleSelection")` is missing from the `storyPage` scope, this would also show a missing-key fallback.

**Recommendation:** Change to `getScopedI18n("pages.student.storyPage")` and use `t("storySelection")` consistent with the actual stories page.

---

### Finding B4-007: Role Check Uses Fragile Substring Matching

**Severity:** Medium
**Category:** Authorization Correctness
**Files:**
- `apps/reading-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx` (lines 78–84)
- `apps/reading-advantage/app/[locale]/(student)/student/stories/[storyId]/page.tsx` (lines 98–104)

**Description:** Both pages use `String.prototype.includes()` for role gating UI elements:

```tsx
const isAtLeastTeacher = (role: string) =>
  role.includes("TEACHER") || role.includes("ADMIN") || role.includes("SYSTEM");

const isAboveTeacher = (role: string) =>
  role.includes("ADMIN") || role.includes("SYSTEM");
```

While currently safe (the `Role` enum contains only `USER`, `STUDENT`, `TEACHER`, `ADMIN`, `SYSTEM`), substring matching is inherently fragile:
- A future role like `ASSISTANT_TEACHER` would include `"TEACHER"` as a substring, incorrectly granting teacher-level UI.
- The check is bypassed if `role` is empty string, null, or undefined — `"".includes("TEACHER")` returns `false`, which happens to be correct but relies on coincidence.

**Impact:** Currently low (stable Role enum), but this pattern violates the principle of exact-match role comparison and creates a latent footgun for future role additions. Any refactor to add granular roles could silently escalate privileges.

**Recommendation:** Use exact equality checks: `role === "TEACHER" || role === "ADMIN" || role === "SYSTEM"`, or import the `Role` enum and compare:
```tsx
const isAtLeastTeacher = [Role.TEACHER, Role.ADMIN, Role.SYSTEM].includes(user.role);
```

This is already done correctly in `lib/enums.ts` where `Role` is defined as a const object. The page should reference those constants.

---

### Finding B4-008: Unused Import — `log` from `console`

**Severity:** Low
**Category:** Code Quality
**File:** `apps/reading-advantage/app/[locale]/(student)/student/stories/[storyId]/page.tsx`
**Line:** 19

**Description:** The file imports `log` from the `console` module but never uses it:

```tsx
import { log } from "console";
```

This is unusual — `log` is not typically destructured from `console`. It's likely a leftover from debugging or a mistaken auto-import.

**Impact:** Minor — adds an unnecessary import. If `console` is not available in the edge runtime (unlikely but possible), this could cause a build or runtime error.

**Recommendation:** Remove the unused import.

---

### Finding B4-009: Dead Code Import — `fetchMoreArticles`

**Severity:** Low
**Category:** Code Quality
**File:** `apps/reading-advantage/app/[locale]/(system)/system/handle-passages/page.tsx`
**Lines:** 6, 21

**Description:** `fetchMoreArticles` is imported but its usage is commented out:

```tsx
import { fetchMoreArticles } from "@/lib/fetchMoreArticles";
// ...
{/* <System fetchMoreData={fetchMoreArticles} /> */}
```

The import and the associated `System` component import (line 5: `import System from "@/components/system-articles"`) are both dead code.

**Impact:** Minor — increases bundle size unnecessarily and clutters the import graph.

**Recommendation:** Remove both unused imports (`fetchMoreArticles` and `System`).

---

## General Observations

### Student Page Patterns (files 3–5, 15–16)

The student pages (`read/page.tsx`, `reports/page.tsx`, `sentences/page.tsx`, `stories/page.tsx`, `vocabulary/page.tsx`) follow a consistent, clean pattern:
1. Call `getCurrentUser()` — authenticate
2. Redirect to `/auth/signin` if null
3. Optionally check level/cefr for placement redirect
4. Render a client component, passing `user.id` and relevant user properties

**Positive:** Consistent auth pattern. `getCurrentUser()` properly validates the session token via `@reading-advantage/auth` `validateSession()` before returning user data (see `lib/session.ts:77`).

**Concern:** `user.id`, `user.email`, `user.level`, `user.cefr_level`, `user.xp`, `user.role`, and `user.display_name` are passed as props to client components. While this is typical for Next.js server→client data passing, it means these identifiers are serialized into the client bundle. Ensure client components use these primarily for display and not as auth tokens for subsequent API calls — the session cookie should be the sole auth mechanism.

### Loading Skeletons (files 2, 8, 11, 14, 17, 19)

All loading skeletons are simple, non-interactive, and contain no sensitive data. No security concerns. The `system/dashboard/loading.tsx` uses a lowercase `function loading()` which is syntactically valid but uses non-standard casing for a React component (should be `function Loading()`). This is cosmetic and does not affect functionality.

### Next.js Error Boundaries (files 7, 10)

Both `error.tsx` files correctly gate error detail display behind `NODE_ENV === "development"`. This is good practice and should be the model for the `custom-error.tsx` files (see B4-005).

### API Data Fetching Pattern

`fetchData()` (`utils/fetch-data.ts`) forwards the incoming request headers (including cookies) to internal API routes. This means:
- Session cookies are forwarded — the API route can authenticate the user.
- But it also forwards all other headers (user-agent, accept-encoding, etc.), which is unnecessary and slightly leaks internal request shape to API routes.
- URL construction uses `process.env.NEXT_PUBLIC_BASE_URL` — if this is missing, the fetch URL becomes `undefined/api/v1/...` which would throw.

The `fetchMoreArticles` server action (`lib/fetchMoreArticles.ts`) additionally deletes `content-length` from forwarded headers (line 52), which is a known pattern for preventing header conflicts in server-side fetch. However, it does **not** delete `host` or `connection` headers, which can also cause issues.

---

## A2 Check: Consent-Blind Publish Gate

**Status:** Not Applicable

None of the 20 files in this batch involve publishing, draft→published status transitions, or content with named subjects. These are student-facing read/quiz/vocabulary/story pages and system admin tools. The A2 anti-pattern (consent-blind publish gate) does not apply to this batch.

---

## A6 Check: Registry-Note Overstatement

**Status:** Pass

The track plan (`measure/tracks/reading_advantage_full_review_20260626/plan.md`) has all tasks marked `[x]`. The `measure/tracks.md` entry for this track (line 30) describes it as a review track that "Reviews the oldest and largest legacy app..." — this is accurate and not an overstatement. The plan does not claim any security state is "resolved." No A6 violation found in this batch.

---

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 2 | B4-001, B4-002 |
| High | 2 | B4-003, B4-004 |
| Medium | 3 | B4-005, B4-006, B4-007 |
| Low | 2 | B4-008, B4-009 |

### Security Posture Assessment

**Student pages (14/20 files):** Generally good. Consistent auth pattern using `getCurrentUser()`. The main concern is the direct-DB bypass in `read/[articleId]/page.tsx` (B4-003) and the unsafe type cast on JSON details (B4-004). Student pages do not perform tenant scoping themselves (this should happen in the API routes and domain functions).

**System pages (4/20 files):** **Inadequate.** The system dashboard has no authentication at all (B4-001), and the handle-passages page authenticates but has no role gate (B4-002). Both are Critical findings that must be addressed before the system admin area can be considered secured.

**Error pages (2 custom):** Information disclosure risk (B4-005). The `custom-error.tsx` components leak raw API responses to the client, unlike the Next.js error boundaries which properly gate behind dev mode.
