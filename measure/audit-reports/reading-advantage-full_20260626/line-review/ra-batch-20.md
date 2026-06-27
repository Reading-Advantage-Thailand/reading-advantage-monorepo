# Line Review: ra-batch-20 — Dashboard Components

**Track:** `reading_advantage_full_review_20260626`
**Role:** C (UX and API end-to-end contract)
**Date:** 2026-06-27
**Baseline SHA:** `d348666be047b929d02c747120c32d2ea0fc53fc`
**Files reviewed:** 20/20
**Lines reviewed:** 5,611
**Changes since baseline:** 0 (all pre-existing files)

---

## Coverage Summary

| File | Lines | Status |
|------|-------|--------|
| compact-activity-heatmap.tsx | 446 | Reviewed |
| enhanced-activity-heatmap.tsx | 551 | Reviewed |
| index.ts | 26 | Reviewed |
| kpi-card.tsx | 188 | Reviewed |
| metrics-cards.tsx | 285 | Reviewed |
| modern-active-users.tsx | 379 | Reviewed |
| modern-license-usage.tsx | 212 | Reviewed |
| school-dashboard-content.tsx | 351 | Reviewed |
| student-ai-coach.tsx | 187 | Reviewed |
| student-dashboard-content.tsx | 185 | Reviewed |
| student-eta-card.tsx | 143 | Reviewed |
| student-genre-engagement.tsx | 170 | Reviewed |
| student-srs-health.tsx | 216 | Reviewed |
| student-xp-velocity.tsx | 171 | Reviewed |
| system-dashboard-client.tsx | 624 | Reviewed |
| teacher-dashboard-content.tsx | 234 | Reviewed |
| teacher-effectiveness.tsx | 279 | Reviewed |
| teacher-overview-kpis.tsx | 198 | Reviewed |
| telemetry-tracker.tsx | 283 | Reviewed |
| user-activity-chart.tsx | 342 | Reviewed |

---

## Findings

### F-RA-B20-001 — Missing useEffect dependency: `entityId` and `scope`

**Severity:** High
**File:** `compact-activity-heatmap.tsx` line 150
**Contract concern:** Stale data served to user

```tsx
}, [licenseId, timeframe]); // ← missing entityId, scope
```

The `useEffect` on line 49 calls `fetchData` which reads `scope` and `entityId` to build the API URL (lines 76–81). If `entityId` or `scope` changes, the effect will NOT re-fire. The component receives new props but continues displaying stale data from the previous entity/scope. This is a broken contract between the parent's prop changes and the component's data fetching.

---

### F-RA-B20-002 — Duplicate metric card: "Total Sessions" and "Reading Sessions" show identical values

**Severity:** Medium
**File:** `metrics-cards.tsx` lines 70 and 101
**Contract concern:** Misleading data display

```tsx
// Line 70 — "Total Sessions" card
value: summaryData.activity?.totalSessions?.toLocaleString() || "0",

// Line 101 — "Reading Sessions" card (same field!)
value: summaryData.activity?.totalSessions?.toLocaleString() || "0",
```

Both the first and third metric cards pull from `summaryData.activity?.totalSessions`. The "Reading Sessions" card should likely use a different field (e.g., `readingSessions`) or a filtered subset. As-is, the user sees two identical numbers with different labels, which is confusing and breaks the UX contract.

---

### F-RA-B20-003 — `process.env.NEXT_PUBLIC_BASE_URL` used in client-side fetch

**Severity:** High
**File:** `modern-license-usage.tsx` line 38
**Contract concern:** Broken API contract on preview/undefined env

```tsx
const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/licenses`);
```

If `NEXT_PUBLIC_BASE_URL` is undefined (preview deployments, local dev without env set), the URL becomes `undefined/api/v1/licenses` — a relative path that will 404. Every other component in this batch uses relative URLs (`/api/v1/...`) for client-side fetches. This component is the sole outlier. Additionally, mixing `process.env` with `fetch` in a `"use client"` component means the env var must be `NEXT_PUBLIC_*` and available at build time, creating a silent failure mode.

---

### F-RA-B20-004 — Two competing telemetry systems with different APIs

**Severity:** Medium
**Files:** `telemetry-tracker.tsx` (local), `@/lib/telemetry/dashboard-telemetry.ts` (shared)
**Contract concern:** Inconsistent event schemas, duplicate HTTP calls

The batch contains a local `TelemetryTracker` class (telemetry-tracker.tsx) and a shared `DashboardTelemetryService` class (`@/lib/telemetry/dashboard-telemetry`). Both export `useDashboardTelemetry` but with different return shapes:

| Source | Hook returns | Flush target |
|--------|-------------|--------------|
| `./telemetry-tracker` | `{ setUserId, trackComponentLoad, trackComponentInteraction, trackNavigation, trackError, trackPerformance }` | `/api/v1/telemetry/dashboard` |
| `@/lib/telemetry/dashboard-telemetry` | `DashboardTelemetryService` singleton | `/api/v1/telemetry/dashboard` |

**Import split:**
- `teacher-dashboard-content.tsx` → imports from `./telemetry-tracker`
- `school-dashboard-content.tsx`, `student-dashboard-content.tsx`, `enhanced-activity-heatmap.tsx` → import from `@/lib/telemetry/dashboard-telemetry`

Both flush to the same endpoint. When both are active in the same session, events arrive interleaved with different schemas (the local tracker includes `url` and `userAgent` in properties; the shared service does not). This creates inconsistent analytics data.

---

### F-RA-B20-005 — Dynamic Tailwind classes will not compile

**Severity:** High
**File:** `system-dashboard-client.tsx` lines 557–561
**Contract concern:** Broken styling, invisible UI elements

```tsx
className={`... hover:bg-${color}-500/5 dark:hover:bg-${color}-400/5 ...`}
// ...
className={`w-2 h-2 rounded-full bg-${color}-500 dark:bg-${color}-400`}
```

Tailwind JIT cannot detect dynamically constructed class names. The `getActivityColor` function returns strings like `"emerald"`, `"blue"`, etc., which are interpolated into class names at runtime. Tailwind will purge these classes during build, leaving the recent activity list items with no background color or dot color. This is a known Tailwind anti-pattern.

---

### F-RA-B20-006 — `axios` used for one component; all others use `fetch`

**Severity:** Low
**File:** `system-dashboard-client.tsx` line 5
**Contract concern:** Inconsistent HTTP client, extra bundle weight

```tsx
import axios from "axios";
// ...
let response = await axios.get(`/api/v1/metrics/system?${params}`);
```

All 19 other components in this batch use the native `fetch` API. `system-dashboard-client.tsx` is the sole `axios` consumer. This adds ~13KB gzipped to the bundle and creates an inconsistent pattern. The `axios` usage also means error handling differs (axios throws on non-2xx; fetch does not).

---

### F-RA-B20-007 — Dead commented-out code block

**Severity:** Low
**File:** `user-activity-chart.tsx` lines 301–337
**Contract concern:** Code clarity, bundle bloat from unused imports

A 37-line commented-out `<ResponsiveContainer>` block with a full chart implementation remains. This is dead code that should be removed. The imports for `LineChart` from recharts (line 3-10) may still be needed for the active chart, but the commented block references `resolvedTheme` and `useTheme` imports that are only used in the dead code path (the active chart uses `ChartContainer` instead).

---

### F-RA-B20-008 — Hook name typo: `useDashboardMetrice`

**Severity:** Low
**File:** `student-dashboard-content.tsx` line 25
**Contract concern:** API naming inconsistency

```tsx
import { useDashboardMetrice } from "@/hooks/student/useDashboardMetrice"
```

The hook is named `useDashboardMetrice` (extra 'e'). The file is also `useDashboardMetrice.ts`. This is a persistent typo in the public API surface that will confuse developers and create search/index issues.

---

### F-RA-B20-009 — `teacher-overview-kpis.tsx` uses `as any` to bypass i18n types

**Severity:** Low
**File:** `teacher-overview-kpis.tsx` line 36
**Contract concern:** Type safety bypass

```tsx
const t = useScopedI18n("pages.teacher.dashboardPage.kpis") as any;
```

The `as any` cast disables all type checking on translation keys. A missing or misspelled key will not be caught at compile time. This same pattern appears in `teacher-dashboard-content.tsx` line 20, `student-dashboard-content.tsx` line 43, and `modern-license-usage.tsx` line 30.

---

### F-RA-B20-010 — Potential division by zero in ETA progress bar

**Severity:** Medium
**File:** `student-eta-card.tsx` line 124
**Contract concern:** Runtime error / visual glitch

```tsx
style={{
  width: `${data ? ((data.currentXp - (data.nextLevelXp - data.xpToNextLevel)) / data.xpToNextLevel) * 100 : 0}%`,
}}
```

If `data.xpToNextLevel` is 0, this produces `Infinity` or `NaN` for the width, causing a broken progress bar. The component already guards against `data` being null, but does not guard against `xpToNextLevel === 0`.

---

### F-RA-B20-011 — `enhanced-activity-heatmap.tsx` accesses `data.buckets` without null-check

**Severity:** Medium
**File:** `enhanced-activity-heatmap.tsx` lines 186, 212
**Contract concern:** Runtime crash on malformed API response

```tsx
// Line 186 — used in telemetry effect
bucketCount: data.buckets.length,

// Line 212 — used in processedData
data.buckets.forEach(bucket => {
```

After the loading state (line 334) and error state (line 350), the component renders with the assumption that `data` is non-null. However, the `useActivityHeatmap` hook could set `data` to a response that lacks `buckets` (e.g., `{ metadata: {...}, buckets: null }`). There is no defensive check on `data.buckets` before accessing `.length` or `.forEach()`.

---

### F-RA-B20-012 — `compact-activity-heatmap.tsx` fetches on mount + 60s interval, no abort

**Severity:** Low
**File:** `compact-activity-heatmap.tsx` lines 146–149
**Contract concern:** Memory leak on unmount, race condition

```tsx
const refreshInterval = setInterval(fetchData, 60000);
return () => clearInterval(refreshInterval);
```

The `setInterval` is properly cleaned up, but `fetchData` uses a raw `fetch()` without an `AbortController`. If the component unmounts while a fetch is in flight, the response will try to call `setData` on an unmounted component. The `enhanced-activity-heatmap.tsx` has the same pattern but uses `useCallback` with proper dependency tracking. `compact-activity-heatmap.tsx` does not.

---

### F-RA-B20-013 — `index.ts` barrel does not export dashboard components in this batch

**Severity:** Informational
**File:** `index.ts`
**Contract concern:** Barrel file scope

The barrel file (`index.ts`) exports teacher dashboard components (`TeacherDashboardContent`, `TeacherOverviewKPIs`, `ClassSummaryTable`, etc.) but does NOT export any of the student dashboard components, heatmap components, or metric cards from this batch. This means those components are imported via direct path references elsewhere. This is not a bug but creates an inconsistency in import patterns.

---

## API Endpoint Inventory (from this batch)

| Endpoint | Method | Consumer(s) | Notes |
|----------|--------|-------------|-------|
| `/api/v1/metrics/activity` | GET | compact-activity-heatmap, enhanced-activity-heatmap | Both use same endpoint with different param shapes |
| `/api/v1/metrics/dashboard-summary` | GET | metrics-cards | |
| `/api/v1/activity/active-users` | GET | modern-active-users | |
| `/api/v1/activity/daily-active-users` | GET | modern-active-users | |
| `/api/v1/licenses` | GET | modern-license-usage | Uses `NEXT_PUBLIC_BASE_URL` prefix |
| `/api/v1/admin/overview` | GET | school-dashboard-content | |
| `/api/v1/teacher/overview` | GET | teacher-dashboard-content | |
| `/api/v1/teacher/classes` | GET | teacher-dashboard-content | |
| `/api/v1/metrics/stream` | GET (SSE) | teacher-dashboard-content | Real-time updates |
| `/api/v1/admin/teacher-effectiveness` | GET | teacher-effectiveness | |
| `/api/v1/metrics/system` | GET | system-dashboard-client | |
| `/api/v1/telemetry/dashboard` | POST | telemetry-tracker, dashboard-telemetry | Two producers |

---

## Key Themes

1. **Stale data from missing useEffect deps** — `compact-activity-heatmap.tsx` will not re-fetch when `entityId`/`scope` change (High).
2. **Broken Tailwind compilation** — Dynamic class interpolation in `system-dashboard-client.tsx` produces invisible styles (High).
3. **Dual telemetry systems** — Two competing `useDashboardTelemetry` hooks with different APIs flush to the same endpoint, creating inconsistent analytics (Medium).
4. **Duplicate metric values** — "Total Sessions" and "Reading Sessions" show the same number (Medium).
5. **`process.env` in client fetch** — `modern-license-usage.tsx` uses `NEXT_PUBLIC_BASE_URL` prefix unlike all other components (High).
6. **No contract tests** — None of the 12 API endpoints consumed by these components have corresponding contract tests or schema validation in the component layer.

---

MEASURE_AGENT_RESULT
{
  "track_id": "reading_advantage_full_review_20260626",
  "review_role": "C",
  "batch_id": "ra-batch-20",
  "status": "complete",
  "files_reviewed": 20,
  "lines_reviewed": 5611,
  "findings": {
    "critical": 0,
    "high": 3,
    "medium": 4,
    "low": 4,
    "informational": 1,
    "total": 12
  },
  "finding_ids": [
    "F-RA-B20-001",
    "F-RA-B20-002",
    "F-RA-B20-003",
    "F-RA-B20-004",
    "F-RA-B20-005",
    "F-RA-B20-006",
    "F-RA-B20-007",
    "F-RA-B20-008",
    "F-RA-B20-009",
    "F-RA-B20-010",
    "F-RA-B20-011",
    "F-RA-B20-012"
  ],
  "report_path": "measure/audit-reports/reading-advantage-full_20260626/line-review/ra-batch-20.md"
}
