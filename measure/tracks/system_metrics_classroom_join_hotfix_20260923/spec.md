# Specification: System Metrics Classroom Join Hotfix

Track ID: `system_metrics_classroom_join_hotfix_20260923`. Type: bug. App: `apps/reading-advantage`.

## Overview

`GET /api/v1/metrics/system` returned 500, so the system dashboard showed
"No data available". `fetchActivityData` in
`server/controllers/metrics-controller.ts` selected
`classroomStudentId: classroomStudents.id` in its non-classId branch without
joining `classroom_students`. Drizzle rejected the query. The classId branch
joins correctly; the sibling `metrics-extended-controller.ts` joins correctly.
Found by owner manual verification S5.14 on 2026-09-23.

## Functional Requirements

- FR-1: The non-classId branch must not reference `classroom_students`.
- FR-2: No unfiltered join may be added (row multiplication would inflate counts).
- FR-3: The mapped `studentClassrooms` shape stays intact for the classId branch.

## Acceptance Criteria

- AC-1: `GET /api/v1/metrics/system?dateRange=30d` returns 200 with overview, activity, and health data.
- AC-2: The system dashboard renders overview, license, active-user, and health sections.
- AC-3: `tsc --noEmit` reports no errors for `metrics-controller.ts`.

## Out of Scope

- `metrics-extended-controller.ts` (already correct).
- The hardcoded "Total XP Gained (Last 30 Days)" label mismatch in `shcools-dashboard.tsx` (separate tech-debt entry).
