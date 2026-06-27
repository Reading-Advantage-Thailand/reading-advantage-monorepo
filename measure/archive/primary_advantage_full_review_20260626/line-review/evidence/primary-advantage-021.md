# Line Review Evidence: primary-advantage-021

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-021
Files assigned: 2
Lines assigned: 353

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/admin/admin-recent-activity.tsx` | 1-214 | reviewed | 3 |
| `apps/primary-advantage/components/admin/admin-stats-cards.tsx` | 1-139 | reviewed | 6 |

## Findings

### LR-primary-advantage-021-001 — Unused `Badge` import

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/admin/admin-recent-activity.tsx:5`
- Evidence: Line 5 imports `Badge` from `@/components/ui/badge`, but `Badge` is never referenced anywhere in lines 6-214. The component renders activity items using `Avatar`, `AvatarFallback`, `AvatarImage` (line 4) and icons from lucide-react, but never uses a `Badge`. This is dead code left over from a prior iteration.
- Impact: Adds an unused dependency import that increases the client bundle size by the full `badge.tsx` module (~60 lines including Radix Slot wiring). Tree-shaking cannot remove it because the import is a named ESM binding that the bundler must assume has side effects. Not a runtime bug, but a code hygiene issue.
- Recommendation: Remove line 5. If a badge is needed later for activity type labels, re-add it then.

### LR-primary-advantage-021-002 — Admin dashboard renders hardcoded mock activity data in production

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/admin/admin-recent-activity.tsx:43-97`
- Evidence: Lines 43-97 contain a comment `// In a real app, this would fetch from an API` followed by a `mockActivities` array with five hardcoded entries. Lines 99 (`setActivities(mockActivities)`) unconditionally assigns this mock data to state. There is no actual API call, no conditional logic to use real data when available, and no feature flag. The component always displays the same five fake activities: "Sarah Johnson" registering as a teacher (line 54), "Admin System" creating "The Magic Forest" article (line 64), "Michael Chen" creating "Grade 3A" classroom (line 74), "Emma Wilson" student account creation (line 84), and "System Admin" maintenance (line 94). The hardcoded emails use `@school.edu` and `@primary-advantage.com` domains (lines 51-52, 62, 72, 82, 92). The avatar path `/avatars/sarah.jpg` (line 53) is a placeholder that does not exist in `public/`.
- Impact: Every admin who visits the dashboard sees the same fabricated activity stream. For a primary-student platform, this creates two risks: (1) admins may believe the platform has real user activity when it does not, delaying onboarding actions; (2) the hardcoded names/emails are PII-shaped data that could confuse auditors reviewing the platform for COPPA/data-protection compliance. The comment acknowledges this is placeholder code, but it is shipped in the production route `app/[locale]/admin/dashboard/page.tsx` (batch 006).
- Recommendation: Replace with an actual API call to a `GET /api/admin/activity` endpoint. Until that endpoint exists, render an empty state with the existing `t("recentActivity.empty")` translation (line 153) and remove the mock data entirely. If mock data must remain for development, gate it behind `process.env.NODE_ENV === "development"` and show the empty state in production.

### LR-primary-advantage-021-003 — "View All" button has no click handler or navigation

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/admin/admin-recent-activity.tsx:190-192`
- Evidence: Lines 190-192 render a `<button>` element with the text `t("recentActivity.viewAll")`. The button has no `onClick` handler, no `href`, no `Link` wrapper, and no `router.push()` call. It is styled with `text-muted-foreground hover:text-foreground text-sm transition-colors` — a text-only appearance that suggests a link, but the element is a `<button>` with no behavior. The button is only rendered when `activities.length > 0` (line 188), so it is always visible (because the mock data always populates `activities`).
- Impact: An admin clicking "View All" gets no response. This is a broken affordance — the button promises navigation to a full activity log that does not exist. For primary-student platforms where admins may be less technical, a non-functional button erodes trust in the dashboard's accuracy.
- Recommendation: Either (a) add `onClick={() => router.push("/admin/activity-log")}` and build the activity-log page, or (b) remove the button until the feature exists. Use a `Link` component from `next-intl/navigation` if the target is a page route.

### LR-primary-advantage-021-004 — Hardcoded `monthlyGrowth: 12.5` never fetched from API

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/admin/admin-stats-cards.tsx:43`
- Evidence: Line 43 reads `monthlyGrowth: 12.5` with the comment `// This would come from analytics`. The value is assigned unconditionally inside the `try` block of `fetchStats()` — even when the three API calls on lines 29-33 succeed, the growth value is always 12.5%. The `statsData` array on line 86 renders it as `` `${stats.monthlyGrowth}%` `` with the label `t("stats.growth")`. There is no API endpoint for growth analytics, no feature flag, and no conditional logic.
- Impact: Admins see a fixed 12.5% growth figure regardless of actual platform usage. If the platform is in decline or growing faster, this fabricated metric makes dashboard-driven decisions unreliable. For primary-student platforms where admin trust drives license renewals, a fake growth number is a business risk.
- Recommendation: Either (a) build a `GET /api/admin/analytics/growth` endpoint that computes month-over-month user/activity growth and wire it into `fetchStats`, or (b) remove the growth card from `statsData` until the analytics pipeline exists. Do not display a hardcoded percentage as if it were computed.

### LR-primary-advantage-021-005 — Fetch calls never check `response.ok`; non-2xx responses silently produce `undefined` stats

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/admin/admin-stats-cards.tsx:29-37`
- Evidence: Lines 29-33 issue three `fetch()` calls via `Promise.all`:
  ```ts
  const [teachersRes, studentsRes, articlesRes] = await Promise.all([
    fetch("/api/teachers?count=true"),
    fetch("/api/students?count=true"),
    fetch("/api/articles?count=true"),
  ]);
  ```
  Lines 35-37 immediately call `.json()` on each response without checking `response.ok` or `response.status`:
  ```ts
  const teachersData = await teachersRes.json();
  const studentsData = await studentsRes.json();
  const articlesData = await articlesRes.json();
  ```
  If any endpoint returns a 401, 403, 404, or 500, `.json()` will attempt to parse the error body. If the error body is not valid JSON (e.g., Next.js HTML error page), `.json()` throws and execution falls to the `catch` block (line 45). If the error body IS valid JSON (e.g., `{ error: "Unauthorized" }`), then `teachersData.total` on line 40 is `undefined` and the `|| 0` fallback silently sets 0 — hiding the auth/permission failure behind a "0 teachers" stat card.
- Impact: An admin whose session expires sees "0 teachers, 0 students, 0 articles" instead of an error message. The fallback stats (lines 48-53) then kick in on the next render if the catch triggers, showing fabricated numbers. Either outcome masks real API failures. The `?count=true` parameter is also not implemented by any of the API routes in the codebase (verified: `/api/teachers/route.ts` delegates to `getTeachersController` which returns full teacher objects, not a count).
- Recommendation: Check `response.ok` before calling `.json()`. On non-2xx, throw a descriptive error that the catch block can surface to the user. Remove the `?count=true` parameter or implement it in the API routes. The API routes should return `{ total: number }` if the count parameter is intended.

### LR-primary-advantage-021-006 — Hardcoded fallback stats mislead admins on API failure

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/admin/admin-stats-cards.tsx:47-53`
- Evidence: Lines 47-53 read:
  ```ts
  setStats({
    totalTeachers: 25,
    totalStudents: 340,
    totalArticles: 156,
    monthlyGrowth: 8.2,
  });
  ```
  These values are assigned in the `catch` block when any of the three fetch calls fail. There is no indication to the admin that these are fabricated fallback numbers — they render identically to real data in the `Card` components (lines 98-118). The `statsData` array on lines 62-91 uses `stat.value` directly with no "fallback" or "unavailable" label.
- Impact: When APIs are down (deployment, migration, network issue), admins see a dashboard claiming 25 teachers, 340 students, 156 articles, and 8.2% growth. This is worse than showing an error — it actively misleads. For a primary-student platform, an admin who trusts these numbers may not investigate a real outage. The hardcoded values also look like they were copied from a development/demo environment (340 students is suspiciously round).
- Recommendation: In the catch block, set a flag like `setError(true)` and render an error state instead of fake numbers. Use the existing skeleton component as inspiration for an error card: "Unable to load stats. Please try again." Never display fabricated data as real.

### LR-primary-advantage-021-007 — `console.error` only in catch with no user-facing error feedback

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/admin/admin-stats-cards.tsx:46`; `apps/primary-advantage/components/admin/admin-recent-activity.tsx:101`
- Evidence: Both components follow the same pattern — the `catch` block logs to `console.error` and then either sets fallback data (stats-cards line 47-53) or does nothing (recent-activity line 101). In `admin-stats-cards.tsx`, line 46 reads `console.error("Failed to fetch admin stats:", error)` and then silently falls back to hardcoded numbers. In `admin-recent-activity.tsx`, line 101 reads `console.error("Failed to fetch activities:", error)` and the loading state is cleared (line 103) so the empty state renders — but no error message is shown.
- Impact: In production, `console.error` output is invisible to end users and only visible in browser DevTools. Admins have no way to know data fetching failed. This is the same anti-pattern in both files and is common across the codebase (same root cause as Reading Advantage dashboard components).
- Recommendation: Add an `error` state variable. In the catch block, `setError(true)`. In the render, conditionally show an error banner using the existing `Alert` component (`components/ui/alert.tsx`). For `admin-recent-activity.tsx`, the empty state already exists (line 150-154) — extend it to distinguish "no activities" from "failed to load".

### LR-primary-advantage-021-008 — Client-side `fetch()` to API routes from `"use client"` component bypasses backend module pattern

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/components/admin/admin-stats-cards.tsx:29-37`
- Evidence: Lines 29-33 make direct `fetch()` calls to `/api/teachers`, `/api/students`, and `/api/articles` from a `"use client"` component (line 1). The root AGENTS.md states: "Business logic must not live in React components" and "Keep business logic in `/packages/backend`". The API routes themselves (`app/api/teachers/route.ts`, `app/api/students/route.ts`, `app/api/articles/route.ts`) are thin wrappers delegating to controllers in `server/controllers/` — the data flow is: `Client Component → fetch() → Route Handler → Controller → DB`. This bypasses the backend module pattern entirely: there is no typed contract (Zod input/output schema), no shared authorization logic, and no way to call the same logic from a worker, CLI, or server component without going through HTTP.
- Impact: The stats-fetching logic is locked into the client-side HTTP path. It cannot be reused in a server component (which would avoid the client-server round trip), a cron job (which would pre-compute stats), or a test (which would mock the backend function directly). This is the same pattern that blocks migration to tRPC or server actions — every new dashboard card adds three more `fetch()` calls.
- Recommendation: Extract stats-fetching into a server action or tRPC procedure that calls backend domain functions directly. The component should call `const stats = await getAdminStats()` (server action) or `const stats = trpc.admin.stats.useQuery()` (tRPC). The domain function `getAdminStats()` should live in `packages/backend/modules/admin/` with Zod input/output schemas.

### LR-primary-advantage-021-009 — Skeleton loaders use hardcoded `bg-gray-200` instead of design tokens

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/admin/admin-stats-cards.tsx:128-133`; `apps/primary-advantage/components/admin/admin-recent-activity.tsx:204-209`
- Evidence: Both skeleton components use Tailwind's `bg-gray-200` for placeholder blocks:
  - `admin-stats-cards.tsx` lines 128, 129, 132, 133: `bg-gray-200` on skeleton rectangles.
  - `admin-recent-activity.tsx` lines 204, 206, 207, 209: `bg-gray-200` on skeleton circles and rectangles.
  The app supports dark mode via `next-themes` (the `ThemeProvider` in `components/providers/theme-provider.tsx`). In dark mode, `bg-gray-200` (a light gray) renders as a bright rectangle against a dark background, breaking the loading illusion.
- Impact: Skeleton loaders appear as bright white/gray blocks in dark mode, creating a visual flash during loading. This is a cosmetic issue but is immediately visible to any admin using dark mode.
- Recommendation: Replace `bg-gray-200` with `bg-muted` (the shadcn design token that adapts to light/dark mode). The rest of the component already uses `text-muted-foreground` (lines 111, 151, 172, 176 in recent-activity), so `bg-muted` is consistent.

## No-Finding Notes

- `apps/primary-advantage/components/admin/admin-recent-activity.tsx`: Lines 1-42 (imports, interface, state initialization) and lines 110-196 (helper functions, render logic) are structurally sound. The `getActivityIcon`/`getActivityColor` mappers (lines 110-142) are exhaustive over the `ActivityItem["type"]` union. The `Avatar`/`AvatarFallback` pattern (lines 161-167) handles missing avatars correctly. The `formatDistanceToNow` usage (lines 177-179) with `addSuffix: true` is correct for relative timestamps. No findings in the render/helper logic itself — findings are limited to the mock data (LR-002), unused import (LR-001), and dead button (LR-003).
- `apps/primary-advantage/components/admin/admin-stats-cards.tsx`: Lines 1-27 (imports, interface, state initialization) and lines 62-139 (statsData array, render, skeleton) are structurally sound. The `Promise.all` pattern (lines 29-33) is a correct concurrent fetch strategy. The `statsData.map` render (lines 99-117) correctly destructures `Icon` and applies color. The skeleton (lines 122-139) mirrors the 4-card grid layout. No findings in the render/helper logic — findings are limited to data-fetching issues (LR-004 through LR-008) and skeleton colors (LR-009).

## Summary

- Total findings: 9 (0 Critical, 3 High, 4 Medium, 2 Low).
- Per-file finding counts: 3 (admin-recent-activity.tsx) + 6 (admin-stats-cards.tsx) = 9.
- Severity tally: Critical = 0. High = LR-002, LR-005, LR-006 (3). Medium = LR-003, LR-004, LR-007, LR-008 (4). Low = LR-001, LR-009 (2).
- Highest-impact fork-divergence categories for this batch: `Primary-student adaptation risk` (mock data in production, hardcoded fallback stats, fake growth metric, non-functional button), `Fork-specific regression` (missing `response.ok` checks on API calls), `Shared package migration blocker` (client-side fetch bypassing backend module pattern), `Same root cause as Reading Advantage` (unused import, console.error only, hardcoded skeleton colors).
- No source-code, plan.md, or `line-review-coverage.tsv` edits were made. The patch TSV is written under `line-review/coverage-patches/primary-advantage-021.tsv` and the evidence is in this file.
