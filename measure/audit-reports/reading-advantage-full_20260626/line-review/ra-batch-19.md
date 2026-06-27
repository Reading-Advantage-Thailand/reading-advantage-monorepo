# Line-by-Line Review: Reading Advantage — Batch 19

**Track ID:** `reading_advantage_full_review_20260626`  
**Batch ID:** `ra-batch-19`  
**Baseline SHA:** `d348666be047b929d02c747120c32d2ea0fc53fc`  
**Current HEAD:** `d348666be047b929d02c747120c32d2ea0fc53fc`  
**Review Date:** 2026-06-27  
**Reviewer Role:** C — UX and API end-to-end contract

---

## Scope

All 20 files listed in the batch were reviewed in full, line by line.

| # | File | Lines Reviewed |
|---|------|----------------|
| 1 | `apps/reading-advantage/components/dashboard/ai-teacher-brief.tsx` | 1–241 (entire file) |
| 2 | `apps/reading-advantage/components/dashboard/alert-center.tsx` | 1–425 (entire file) |
| 3 | `apps/reading-advantage/components/dashboard/assignment-notification-dialog.tsx` | 1–584 (entire file) |
| 4 | `apps/reading-advantage/components/dashboard/class-accuracy-metrics.tsx` | 1–204 (entire file) |
| 5 | `apps/reading-advantage/components/dashboard/class-activity-heatmap.tsx` | 1–316 (entire file) |
| 6 | `apps/reading-advantage/components/dashboard/class-alignment-matrix.tsx` | 1–166 (entire file) |
| 7 | `apps/reading-advantage/components/dashboard/class-assignment-funnel.tsx` | 1–335 (entire file) |
| 8 | `apps/reading-advantage/components/dashboard/class-batch-actions.tsx` | 1–224 (entire file) |
| 9 | `apps/reading-advantage/components/dashboard/class-dashboard-kpis.tsx` | 1–164 (entire file) |
| 10 | `apps/reading-advantage/components/dashboard/class-detail-dashboard.tsx` | 1–218 (entire file) |
| 11 | `apps/reading-advantage/components/dashboard/class-genre-engagement.tsx` | 1–130 (entire file) |
| 12 | `apps/reading-advantage/components/dashboard/class-summary-table.tsx` | 1–479 (entire file) |
| 13 | `apps/reading-advantage/components/dashboard/class-velocity-table.tsx` | 1–187 (entire file) |
| 14 | `apps/reading-advantage/components/dashboard/classroom-goals/classroom-goal-card.tsx` | 1–197 (entire file) |
| 15 | `apps/reading-advantage/components/dashboard/classroom-goals/classroom-goal-group-card.tsx` | 1–263 (entire file) |
| 16 | `apps/reading-advantage/components/dashboard/classroom-goals/classroom-goals-management.tsx` | 1–315 (entire file) |
| 17 | `apps/reading-advantage/components/dashboard/classroom-goals/create-classroom-goal-dialog.tsx` | 1–276 (entire file) |
| 18 | `apps/reading-advantage/components/dashboard/classroom-goals/index.ts` | 1–4 (entire file) |
| 19 | `apps/reading-advantage/components/dashboard/classroom-goals/student-progress-dialog.tsx` | 1–263 (entire file) |
| 20 | `apps/reading-advantage/components/dashboard/classroom-xp-chart.tsx` | 1–177 (entire file) |

**No file was partially reviewed.**

---

## Executive Summary

This batch is a concentrated set of teacher/admin dashboard components covering classroom KPIs, metrics visualization, assignment management, goal tracking, and notification flows. The components follow a consistent pattern: `"use client"`, i18n via `useScopedI18n`, data fetching via `fetch()` in `useEffect`, loading/error/empty states, and shadcn/ui presentation.

The most severe finding is a **missing API endpoint**: `alert-center.tsx` calls `POST /api/v1/admin/alerts/${alertId}/acknowledge`, but no route handler exists for this path. The acknowledge button will silently fail (the `catch` block logs to console but provides no user feedback beyond the console error). A secondary concern is an **N+1 query pattern** in `assignment-notification-dialog.tsx` that fetches students per assignment in a sequential loop, which will degrade performance in classrooms with many assignments.

Several components hardcode English strings despite using i18n elsewhere (e.g., `"Accuracy by Student & Type"`, `"No accuracy data available"`, `"At Risk"`, `"Delete"`, `"In progress"`, `"Loading goals..."`). These bypass the i18n system and will display English text regardless of the user's locale.

---

## Findings

### Critical / High

#### H-01 — Missing API endpoint: `POST /api/v1/admin/alerts/[alertId]/acknowledge`
- **File:** `apps/reading-advantage/components/dashboard/alert-center.tsx:128–131`
- **Severity:** High
- **Evidence:** The component calls `fetch(\`/api/v1/admin/alerts/${alertId}/acknowledge\`, { method: 'POST' })`. No route handler exists at `app/api/v1/admin/alerts/[alertId]/acknowledge/route.ts`. The only alert-related route is `app/api/v1/admin/alerts/route.ts` (GET only). The `catch` block (line 139–141) logs the error to console but provides no user feedback — the alert's local state is only updated on `response.ok` (line 132), so on failure the UI state remains inconsistent (button still visible, alert still unacknowledged).
- **Impact:** Teachers cannot acknowledge admin alerts. The "Mark Read" button appears functional but silently fails. This is a broken end-to-end contract: the UI promises an action the API does not support.
- **Fix:** Either create the missing route handler (`app/api/v1/admin/alerts/[alertId]/acknowledge/route.ts`) or update the component to call an existing acknowledge endpoint. Add user-facing error feedback (toast or inline error) when the request fails.

#### H-02 — N+1 query pattern in assignment notification dialog
- **File:** `apps/reading-advantage/components/dashboard/assignment-notification-dialog.tsx:101–115`
- **Severity:** High
- **Evidence:** `fetchAssignments` first fetches all assignments (line 95–98), then loops through each assignment and fetches its students individually (lines 102–114). For a classroom with 20 assignments, this produces 21 sequential HTTP requests.
- **Impact:** On slow networks or with many assignments, this dialog will take 10+ seconds to load. The sequential `await` in a `for` loop means no parallelism. This is a performance anti-pattern that degrades the user experience.
- **Fix:** Either (a) add a query parameter to the assignments endpoint that includes incomplete student counts in the response, (b) use `Promise.all` for parallel fetching, or (c) create a dedicated endpoint that returns assignments with their incomplete student status in a single call.

#### H-03 — Hardcoded English strings bypass i18n
- **Files:**
  - `apps/reading-advantage/components/dashboard/class-accuracy-metrics.tsx:105–106` — `"Accuracy by Student & Type"` and `"No accuracy data available"`
  - `apps/reading-advantage/components/dashboard/class-alignment-matrix.tsx:116–118` — inline strings in JSX
  - `apps/reading-advantage/components/dashboard/class-assignment-funnel.tsx:300–301` — `"At Risk"`
  - `apps/reading-advantage/components/dashboard/classroom-goals/classroom-goal-card.tsx:125,146,160–168,176–178` — `"Student:"`, `"Delete"`, `"Progress"`, `"X% complete"`, `"X days left"`, `"X days overdue"`
  - `apps/reading-advantage/components/dashboard/classroom-goals/classroom-goals-management.tsx:160,181,195` — `"Loading goals..."`, `"For X students"`, `"In progress"`
  - `apps/reading-advantage/components/dashboard/classroom-goals/student-progress-dialog.tsx` — (status badges use raw enum values like `"COMPLETED"`, `"ACTIVE"`)
- **Severity:** High (for a product serving international schools)
- **Evidence:** These components use `useScopedI18n` for most text but have English strings hardcoded in specific locations. The Thai locale (`th`) is referenced in `assignment-notification-dialog.tsx` (line 28, `import { th } from "date-fns/locale"`), confirming this product serves Thai users.
- **Impact:** Thai-speaking teachers will see a mix of Thai and English text in the same dialog. This is a UX consistency failure.
- **Fix:** Replace all hardcoded strings with `t()` calls. For status badges, create a mapping function that translates enum values to localized labels.

### Medium

#### M-01 — Silent error handling with no user feedback
- **Files:**
  - `apps/reading-advantage/components/dashboard/alert-center.tsx:139–141` — `console.error` only
  - `apps/reading-advantage/components/dashboard/assignment-notification-dialog.tsx:119,131,143` — `console.error` only
  - `apps/reading-advantage/components/dashboard/classroom-goals/classroom-goal-card.tsx:82–83` — `console.error` only
  - `apps/reading-advantage/components/dashboard/classroom-goals/classroom-goal-group-card.tsx:119–120` — `console.error` only (though toast is used for the parent)
  - `apps/reading-advantage/components/dashboard/classroom-goals/classroom-goals-management.tsx:94–95` — `console.error` only
- **Severity:** Medium
- **Evidence:** Multiple components catch fetch errors and log to console without informing the user. The `classroom-goal-group-card.tsx` and `create-classroom-goal-dialog.tsx` correctly use `useToast` for error feedback, but other components in the same feature area do not.
- **Impact:** When a delete or acknowledge action fails, the user has no indication that the operation failed. They may think the action succeeded when it did not.
- **Fix:** Add toast notifications for error states in all components that perform write operations (DELETE, POST, PATCH). The pattern is already established in `classroom-goal-group-card.tsx` and should be applied consistently.

#### M-02 — `useEffect` dependency arrays may cause stale closures
- **Files:**
  - `apps/reading-advantage/components/dashboard/class-dashboard-kpis.tsx:36–63` — `useEffect` with `fetchData` defined inside but `classroomId` in deps
  - `apps/reading-advantage/components/dashboard/class-accuracy-metrics.tsx:37–70`
  - `apps/reading-advantage/components/dashboard/class-activity-heatmap.tsx:23–50`
  - `apps/reading-advantage/components/dashboard/class-alignment-matrix.tsx:36–64`
  - `apps/reading-advantage/components/dashboard/class-assignment-funnel.tsx:38–64`
  - `apps/reading-advantage/components/dashboard/class-genre-engagement.tsx:20–46`
  - `apps/reading-advantage/components/dashboard/class-velocity-table.tsx:22–48`
- **Severity:** Medium
- **Evidence:** Each component defines `fetchData` as a nested async function inside `useEffect`, then lists only `classroomId` (and sometimes `expanded`) in the dependency array. While this works in practice because `classroomId` changes trigger re-fetches, the `fetchData` function is recreated on every render but only called when `classroomId` changes. This is a minor React patterns concern — the function is not memoized with `useCallback`.
- **Impact:** Low practical impact, but violates React's exhaustive-deps lint rule. If any of these components are wrapped in `React.StrictMode` or if the linter is enforced, this will produce warnings.
- **Fix:** Extract `fetchData` outside the component and pass `classroomId` as a parameter, or wrap it in `useCallback` with proper dependencies.

#### M-03 — `class-detail-dashboard.tsx` hardcodes locale in back navigation
- **File:** `apps/reading-advantage/components/dashboard/class-detail-dashboard.tsx:56`
- **Severity:** Medium
- **Evidence:** `router.push("/th/teacher/dashboard")` hardcodes the `/th/` locale prefix. The component also pushes to `/th/teacher/my-classes/${classroomId}/settings` (line 123).
- **Impact:** If the user's locale is not Thai (e.g., `/en/`), the back button and settings button will force a locale switch to Thai. This is a locale-routing contract violation.
- **Fix:** Use the current locale from the router or i18n context rather than hardcoding `/th/`. The pattern should be `router.push(\`/\${locale}/teacher/dashboard\`)` or use Next.js `usePathname` to extract the current locale.

#### M-04 — `class-batch-actions.tsx` uses `alert()` for user feedback
- **File:** `apps/reading-advantage/components/dashboard/class-batch-actions.tsx:50,121–125`
- **Severity:** Medium
- **Evidence:** The component uses `window.alert()` for "no export data" and export error messages. This is inconsistent with the rest of the codebase which uses shadcn/toast for notifications.
- **Impact:** `alert()` blocks the UI thread, is not styled, and breaks the visual design language. It also cannot display rich content or be dismissed programmatically.
- **Fix:** Replace `alert()` calls with `useToast()` notifications, following the pattern established in `classroom-goal-group-card.tsx`.

#### M-05 — `classroom-xp-chart.tsx` fetches on every `view` change even though data structure is the same
- **File:** `apps/reading-advantage/components/dashboard/classroom-xp-chart.tsx:38–76`
- **Severity:** Medium
- **Evidence:** The `useEffect` dependency array includes `view` (line 76), but the API call does not pass `view` as a parameter. The component fetches the same data from the server and then client-side switches between `dataMostActive` and `dataLeastActive` keys (line 57–58). This means every toggle between "Most Active" and "Least Active" triggers a redundant network request.
- **Impact:** Unnecessary network traffic and loading spinner flash on each view toggle.
- **Fix:** Fetch data once (on mount or when `timeRange`/`licenseId` changes), store both `dataMostActive` and `dataLeastActive` in state, and switch between them client-side without re-fetching.

### Low

#### L-01 — `ai-teacher-brief.tsx` uses `as any` for i18n hook
- **File:** `apps/reading-advantage/components/dashboard/ai-teacher-brief.tsx:50`
- **Severity:** Low
- **Evidence:** `const t = useScopedI18n("pages.teacher.dashboardPage.aiBrief") as any;` casts the return type to `any`, bypassing type safety for translation keys.
- **Impact:** Typo in translation keys will not be caught at compile time. This pattern is repeated in almost every file in this batch (and presumably the wider codebase).
- **Fix:** This is a systemic issue. The i18n layer should provide typed translation functions. In the meantime, removing `as any` and fixing type errors would improve safety.

#### L-02 — `class-summary-table.tsx` row click handler not keyboard accessible
- **File:** `apps/reading-advantage/components/dashboard/class-summary-table.tsx:362`
- **Severity:** Low
- **Evidence:** `<TableRow key={cls.id} className=" hover:bg-muted/50">` has a `className` with a leading space but no `onClick` handler or keyboard event handler. The `handleRowClick` function (line 197–203) is defined but never attached to the row. Rows appear clickable (hover style) but are not actually interactive.
- **Impact:** Users expect to click a row to navigate to class details, but clicking does nothing. The only way to navigate is via the dropdown menu's "View Details" option.
- **Fix:** Either add `onClick={() => handleRowClick(cls.id)}` and `role="button" tabIndex={0}` with `onKeyDown` handler to the row, or remove the hover style to avoid the false affordance.

#### L-03 — `classroom-goal-card.tsx` uses browser `confirm()` dialog
- **File:** `apps/reading-advantage/components/dashboard/classroom-goals/classroom-goal-card.tsx:70`
- **Severity:** Low
- **Evidence:** `if (!confirm(\`Are you sure you want to delete this goal for ${studentName}?\`)) return;` uses the native browser confirm dialog. The sibling component `classroom-goal-group-card.tsx` uses a proper shadcn `ConfirmDialog` component (line 251–260).
- **Impact:** Inconsistent UX within the same feature area. The native confirm dialog is unstyled and cannot be customized.
- **Fix:** Replace `confirm()` with the `ConfirmDialog` component already used in `classroom-goal-group-card.tsx`.

#### L-04 — `class-activity-heatmap.tsx` uses `bg-green-450` which is not a standard Tailwind color
- **File:** `apps/reading-advantage/components/dashboard/class-activity-heatmap.tsx:260`
- **Severity:** Low
- **Evidence:** `colorClass = "bg-green-450/10 text-green-600 border-green-400/20"` references `green-450`, which is not a default Tailwind CSS color. This will be ignored or require a custom theme extension.
- **Impact:** The color will fall back to transparent/invisible, making that intensity level visually indistinguishable from others.
- **Fix:** Use `bg-green-400/10` or `bg-green-500/10` instead.

#### L-05 — `classroom-xp-chart.tsx` uses `any` for error catch
- **File:** `apps/reading-advantage/components/dashboard/classroom-xp-chart.tsx:68`
- **Severity:** Low
- **Evidence:** `} catch (error: any) {` uses `any` type for the caught error.
- **Impact:** Weakens type safety. TypeScript best practice is `catch (error)` with `error instanceof Error` check.
- **Fix:** Use `catch (error)` and check `error instanceof Error` before accessing `.message`.

---

## API Endpoint Contract Audit

| Component | API Endpoint Called | Route Exists | Method | Auth | Notes |
|-----------|-------------------|--------------|--------|------|-------|
| `alert-center.tsx` | `/api/v1/admin/alerts` | ✅ | GET | `restrictTo(SYSTEM, ADMIN)` | Works |
| `alert-center.tsx` | `/api/v1/admin/alerts/[id]/acknowledge` | ❌ | POST | — | **Missing route** |
| `assignment-notification-dialog.tsx` | `/api/v1/classroom/[id]/assignments` | ✅ | GET | — | Works |
| `assignment-notification-dialog.tsx` | `/api/v1/classroom/[id]/assignments/[id]/students` | ✅ | GET | — | N+1 pattern |
| `assignment-notification-dialog.tsx` | `/api/v1/classroom/[id]/assignment-notifications/history` | ✅ | GET | — | Works |
| `assignment-notification-dialog.tsx` | `/api/v1/classroom/[id]/assignment-notifications/send` | ✅ | POST | — | Works |
| `class-accuracy-metrics.tsx` | `/api/v1/teacher/class/[id]/accuracy` | ✅ | GET | `protect` | Works |
| `class-activity-heatmap.tsx` | `/api/v1/metrics/activity` | ✅ | GET | — | Works |
| `class-alignment-matrix.tsx` | `/api/v1/metrics/alignment` | ✅ | GET | — | Works |
| `class-assignment-funnel.tsx` | `/api/v1/metrics/assignments` | ✅ | GET | — | Works |
| `class-batch-actions.tsx` | `/api/v1/classroom/[id]/students` | ✅ | GET | — | Works |
| `class-dashboard-kpis.tsx` | `/api/v1/classroom/[id]/overview` | ✅ | GET | — | Works |
| `class-genre-engagement.tsx` | `/api/v1/metrics/genres` | ✅ | GET | — | Works |
| `class-velocity-table.tsx` | `/api/v1/metrics/velocity` | ✅ | GET | — | Works |
| `classroom-goal-card.tsx` | `/api/v1/goals/[id]` | ✅ | DELETE | — | Works |
| `classroom-goal-group-card.tsx` | `/api/v1/teacher/classroom/[id]/goals/[id]` | ✅ | DELETE | — | Works |
| `classroom-goals-management.tsx` | `/api/v1/teacher/classroom/[id]/goals` | ✅ | GET | — | Works |
| `create-classroom-goal-dialog.tsx` | `/api/v1/teacher/classroom/[id]/goals` | ✅ | POST | — | Works |
| `classroom-xp-chart.tsx` | `/api/v1/classroom/xp-chart` | ✅ | GET | — | Redundant fetch on view toggle |

---

## Route Parity and Integration Wiring

- **Route parity:** 19 of 20 API calls have matching route handlers. The one exception (`/api/v1/admin/alerts/[id]/acknowledge`) is a broken contract.
- **Auth wiring:** Most dashboard metric endpoints (`/api/v1/metrics/*`) do not appear to have explicit auth middleware in the route files examined. The `class-accuracy-metrics.tsx` calls `/api/v1/teacher/class/[id]/accuracy` which uses `protect` middleware — this is correct. The `alert-center.tsx` calls admin-only endpoints which use `restrictTo(Role.SYSTEM, Role.ADMIN)` — this is correct for admin users but the component is rendered in a teacher dashboard context, which may be a role mismatch.
- **i18n wiring:** All components import `useScopedI18n` but several have hardcoded English strings that bypass the translation system (finding H-03).

---

## Anti-Pattern Audit

| ID | Anti-pattern | Present in batch? | Evidence |
|----|--------------|-------------------|----------|
| A4 | Vacuous-pass on nothing-done | No | No vacuous test assertions in this batch (these are UI components, not tests). |
| A5 | False-claim text vs test reality | No | No test claims in this batch. |
| A9 | Pre-existing test references archived track paths | No | No test files in this batch. |

---

## Recommendations (focused, no broad refactor)

1. **Create the missing `/api/v1/admin/alerts/[id]/acknowledge` route handler.** This is a broken end-to-end contract that prevents teachers from acknowledging alerts. [Critical]
2. **Fix the N+1 query in `assignment-notification-dialog.tsx`.** Either batch the student-status check into the assignments endpoint or use `Promise.all` for parallel requests. [High]
3. **Replace all hardcoded English strings with `t()` calls.** The product serves Thai users and the i18n system is already in place. [High]
4. **Add toast notifications for error states** in components that perform write operations (alert acknowledge, goal delete, notification send). [Medium]
5. **Fix the locale hardcoding in `class-detail-dashboard.tsx`** back-navigation and settings routes. [Medium]
6. **Remove the redundant fetch in `classroom-xp-chart.tsx`** on view toggle. [Medium]
7. **Replace `alert()` and `confirm()` with shadcn components** for consistent UX. [Low]

---

*End of line-review report for batch 19.*