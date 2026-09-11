# Specification: Reading Loading and State Correctness

Track ID: `loading_state_correctness_20260911`. Type: bug. App: `apps/reading-advantage`.

## Overview

The 2026-09-11 UX audit found loading and state defects: double pagination, infinite-scroll races, stuck skeletons, translate request storms, and render-phase side effects. Evidence: `docs/reading-advantage-ux-refactor-plan.md` Phase 2. Each fix is small and uses existing code. No new dependencies.

## Functional Requirements

### FR-1: Fix teacher-assignments double pagination

`components/teacher/teacher-assignments-table.tsx` paginates data that the server already paginated. Users cannot reach page 2. Remove the client-side pagination layer. Render the server page directly.

### FR-2: Fix the handle-article infinite-scroll race

`components/teacher/handle-article.tsx` never sets its loading flag, so rapid scroll events fire duplicate fetches. The `loading ??` expression on a boolean is wrong. Set the flag during fetch and fix the boolean expression.

### FR-3: Fix the system-reports loading condition

`app/[locale]/(system)/system/reports.tsx` lines 290-294 use an always-true loading condition. Replace it with the real loading state so the table renders.

### FR-4: Stop the showcase-card translate storm

`components/article-showcase-card.tsx` POSTs a translate request on mount for every grid card. Reuse the `translatedSummary` cache-check pattern from `article-summary.tsx`. Add the missing `cn` to `zh-CN` locale normalization.

### FR-5: Fix assignment dashboard state defects

In `components/student-assignment-dashboard.tsx`:

- Hoist `AssignmentDetailDialog` out of the render body.
- Move `fetchNotifications` into its own `useEffect` with correct dependencies.
- Replace `window.location.href` navigation with `router.push`.
- Add `redirect("/auth/signin")` for unauthenticated users, matching sibling pages.

### FR-6: Fix system dashboard health badges and KPI labels

- `system-dashboard-client.tsx` health badges default to "excellent" when data is missing. Default to "unknown".
- `school-dashboard-content.tsx` labels a reading-session count as "Total XP". Fix the label or the metric.
- Replace dynamic Tailwind class strings in `system-dashboard-client.tsx` and `change-role.tsx` with a static lookup map so Tailwind extracts them.

### FR-7: Pass game mode from page props

`StudentCartridgeHost.tsx` reads `window.location.search` during render. Pass `mode` from the page `searchParams` prop instead.

### FR-8: Fix the matching-game translation key

`matching.tsx` hardcodes `translation.th`. Use `translation[currentLocale]` with a Thai fallback. One line.

### FR-9: Fix matching empty-versus-loading states

`matching.tsx` renders skeletons forever on an empty or failed fetch. Render an explicit empty state and an explicit error state.

## Non-Functional Requirements

- NFR-1: No new dependencies.
- NFR-2: No fetch storms: one translate request per article summary per locale, cached.

## Acceptance Criteria

- AC-1: Teacher assignments table reaches every server page.
- AC-2: Rapid scrolling in handle-article fires at most one in-flight fetch.
- AC-3: System reports table renders rows after loading completes.
- AC-4: A grid of ten showcase cards issues at most one uncached translate request per card locale and zero on revisit.
- AC-5: Assignment dashboard mounts no duplicate notification fetches and navigates client-side.
- AC-6: Missing health data renders "unknown"; the XP KPI label matches its metric.
- AC-7: `StudentCartridgeHost` contains no `window.location` read during render.
- AC-8: Matching words show the current-locale translation; empty decks render an empty state, not skeletons.

## Out of Scope

- Server-side migration of metric and goals fetches. Track `structural_ux_alignment_20260911` owns that.
- Matching-game component merge. Track `component_deduplication_20260911` owns that.
