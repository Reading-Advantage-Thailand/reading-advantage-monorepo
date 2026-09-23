# Plan: System Metrics Classroom Join Hotfix

Track ID: `system_metrics_classroom_join_hotfix_20260923`

## Tasks

- [x] Task 1: Remove the `classroomStudentId` select field from the non-classId branch of `fetchActivityData`; guard the mapped shape with `'classroomStudentId' in activity`.
  - Verified: tsc clean for the file; SQL shape proven against local Postgres; no tests cover the controller (none written, per scope).
- [x] Task 2: Live-verify `GET /api/v1/metrics/system?dateRange=30d` returns 200 (5 schools, 24 students, 3 teachers, 25 articles, 36 reading sessions) and `/en/system/dashboard` renders all sections as SYSTEM user. Owner manual verification S5.14 on 2026-09-23.
