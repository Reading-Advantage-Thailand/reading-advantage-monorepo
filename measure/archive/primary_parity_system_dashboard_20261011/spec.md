# Spec — Primary parity: system dashboard with a schools table

Track ID: `primary_parity_system_dashboard_20261011`
Type: feature (Classic FR list, template group "dashboards")
Triage row: SYS-01

## Overview

SYSTEM users open `/system/dashboard` to see the whole platform. Today the page shows a heading
and the text "System Dashboard Description" only. Legacy has a large dashboard with two rows of
numbers, three tabs, and many numbers with the same value or a wrong label. Owner note (SYS-01):
"We need to improve the usability of this. The old design was confusing and not very helpful."
Owner answer of 2026-10-11 for this member: a short strip of platform totals, then one row for
each school with active students this week, reading this week, licenses used of total, last
activity, and a flag when a school goes quiet. A row opens the admin dashboard of that school.

## Track Set

This track is member 5 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_admin_dashboard_20261011. The shared decisions and the start gate in the set overview apply to this track.

## Legacy Behavior (bfea121)

Paths are relative to `~/Desktop/primary-advantage`.

- Page: `app/[locale]/system/dashboard/page.tsx` with `components/dashboard/system/dashboard.tsx`:
  a toolbar (range 7 / 30 / 90 / all, Export, Refresh, `:158-196`), six metric cards above three
  tabs (Overview, Activity, AI Insights, `:210-254`).
- Metric cards (`server/models/systemModel.ts:358-619`): "Total Sessions" and "Reading Sessions"
  show the same value (`components/dashboard/system/metrics-cards.tsx:88, 154`); "Active Users"
  counts users of all roles; "Alignment Score", "Learning Velocity", and "Avg. Session Time"
  are computed from all rows in memory, with N+1 queries for each student (`systemModel.ts:443-505`).
- Overview tab: total schools ("Active institutions", but all schools), total users, total
  articles, completion rate (`server/controllers/systemController.ts:21-138`); license usage
  (one license at a time in a carousel; used = all users of the school, any role; total =
  `maxUsers`, `components/dashboard/system/modern-license-usage.tsx:99-100`); active users
  (three different definitions; "7" and "90" fall back to 30, `systemModel.ts:240-263`); system
  health (uptime fixed at "99.9%", `systemController.ts:89`); recent activity (5 rows).
- Activity tab: a heatmap and a trend chart of the same series, and a 50-row activity log
  (`systemModel.ts:621-812`). The "all" range gives an invalid start date (`systemModel.ts:626-627`).
- Export downloads only one of the six queries as JSON; Refresh refetches only one query
  (`dashboard.tsx:135-153, 185`).
- There is no table with one row for each school. The only school-level view is the license
  carousel.
- All `app/api/system/dashboard/**` routes are SYSTEM only (`SYSTEM_ACCESS`).

## Current Monorepo State

Paths are relative to `apps/primary-advantage` unless they start with `packages/`.

- `app/[locale]/system/dashboard/page.tsx:4-9`: a heading and "System Dashboard Description".
  The triage evidence for SYS-01 is correct.
- `/system` pages are SYSTEM only (`lib/route-policies.ts:18`). The permission
  `system:dashboard:read` (SYSTEM) exists (`packages/auth/src/permissions.ts:112`).
- The Reading Advantage system dashboard reads global counts with no per-school table, and its
  license numbers come from `license_on_users`, which Primary never writes
  (`apps/reading-advantage/server/controllers/system-controller.ts:23-123`). Its label
  "Total XP Gained (Last 30 Days)" shows lifetime XP (tech-debt row of 2026-09-23,
  `apps/reading-advantage/components/system/shcools-dashboard.tsx:266-271`). This track copies
  neither.
- `primary_parity_admin_dashboard_20261011` builds the shared counts, the seat usage, and the
  SYSTEM school choice `/admin/dashboard?school=<id>` that a row of this page opens.

## Functional Requirements

### Data (domain)

- FR-1: "This week" is the last 7 calendar days in Asia/Bangkok, today included. An activity
  event and an active student follow the shared rule of
  `primary_parity_admin_dashboard_20261011` FR-2.
- FR-2: `getPlatformOverview` returns the totals: schools, students (STUDENT users with a
  school), teachers (TEACHER users with a school), active students this week, articles opened
  this week (`ARTICLE_READ` rows created this week), and seats used of seats for all schools.
  It also returns the count of STUDENT users without a school.
- FR-3: `getPlatformOverview` returns one row for each school: id, name, students, active
  students this week, the active percentage, articles opened this week, seats used and seats
  (the shared seat usage of `packages/domain/src/licenses/usage.ts`, or "no license" when the
  school has no license with seats), the last activity (the newest activity event of a student
  of the school, or none), and the quiet flag.
- FR-4: Quiet rule: a school "goes quiet" when it has at least one student and no activity event
  in the last 7 Bangkok calendar days (today included). A school without students is "No
  students", not quiet. The value 7 is a look-check value.
- FR-5: Only SYSTEM may call `getPlatformOverview` (`assertCan(user, "system:dashboard:read")`;
  other roles get FORBIDDEN). It reads all schools through `unscoped("<reason>")` with a reason
  string, and it groups each count by `users.school_id`.
- FR-6: The counts are grouped by school in SQL. The function runs a fixed number of aggregate
  queries, not one query for each school.

### Page

- FR-7: `/system/dashboard` is a server page that calls `getPlatformOverview` directly. It adds no
  API route.
- FR-8: The totals strip shows the six totals of FR-2 with labels that name each metric. The
  count of students without a school shows only when it is more than 0.
- FR-9: The schools table has the columns: school, active students this week ("n of m"),
  articles opened this week, seats ("used of total", or "No license"), last activity (a date in
  Bangkok, or "None"), and status ("Quiet", "Active", or "No students"). Default order: quiet
  schools first, then the school name, ascending. Search: a part of the school name. Each
  column sorts; a second tap changes the order. On a phone (375 px) each row is a card.
- FR-10: A tap on a school row opens `/admin/dashboard?school=<schoolId>` (the SYS-03 school
  choice of `primary_parity_admin_dashboard_20261011`).
- FR-11: The page uses the RPG skin: a `Scene` (the place comes from the Design phase), `Panel`
  for the strip and the table, and `RpgLink` for the row action (`docs/primary-rpg-skin.md` §6).
  Phone first (375 px), then 1280 px. Day and night.
- FR-12: The page has `loading.tsx` and `error.tsx` in the pattern of
  `app/[locale]/teacher/dashboard/`. A platform with no school shows an empty state.

### Removals

- FR-13: Remove the "System Dashboard Description" placeholder text and its message key.

## Shared Domain Queries

The three members of the template group "dashboards" (admin dashboard, teacher home, and system
dashboard) use one module:
`packages/domain/src/primary-dashboards/` (subpath `@reading-advantage/domain/primary-dashboards`).

- `primary_parity_admin_dashboard_20261011` builds the module and the seat usage in
  `packages/domain/src/licenses/usage.ts`.
- This member extends `activity.ts` with the scope `{ kind: "platform" }` and counts grouped by
  school (active students, articles opened, last activity), and extends `licenses/usage.ts`
  with the seat usage grouped by school. It writes no second copy of a count.

## Non-Functional Requirements

- Access: a PGlite test proves that ADMIN, TEACHER, and STUDENT get FORBIDDEN, and that each
  school row has only the rows of its school.
- Contracts: Zod output schema for `getPlatformOverview`; the page renders parsed data only.
- Performance: a fixed number of grouped aggregate queries. Target: the page renders in 2 s or
  less on the rehearsal copy.
- Logging: server errors log with `lib/observability/logger.ts`.
- i18n: all new strings in en, th, cn, tw, and vi (namespace `SystemDashboard`).
- Accessibility: tap targets of 48 px or more; the sort buttons have `aria-sort`.
- JSDoc on every exported function, type, and schema.
- Schema: no change, no migration. ETL and cutover runbook: no change.
- Tests: Vitest in `packages/domain` (recording DB and PGlite) and in `apps/primary-advantage`.

## Acceptance Criteria

The side-by-side kit (`primary_parity_acceptance_20261011`) runs these checks on rehearsal copies
of legacy `bfea121` and the new build with the same school data.

- AC-1: Legacy `/system/dashboard` and new `/system/dashboard`, as SYSTEM. For each legacy
  number, the behavior contract names the new total or column, or the reason it is gone
  (duplicate value, fixed text, AI insights).
- AC-2: As SYSTEM on the new build, each total and each school row value equals the reference
  SQL of the behavior contract on the rehearsal copy.
- AC-3: As SYSTEM on the new build, a school with students and no activity event in the last 7
  days shows "Quiet" and is in the first rows. Check it with one school of the rehearsal copy,
  or with a test school with two students and old activity.
- AC-4: As SYSTEM on the new build, a tap on a school row opens `/admin/dashboard?school=<id>`,
  and that page shows the numbers of the same school.
- AC-5: As a school ADMIN, legacy and new `/system/dashboard` refuse access: the proxy sends the
  user to the unauthorized page (`proxy.ts:81` in the new build).
- AC-6: Captures at 375 px and 1280 px, day and night, pass the owner's look check.
- AC-7: `pnpm --filter @reading-advantage/domain test` and `pnpm --filter primary-advantage test`
  exit 0; tsc and ESLint on the changed files report 0 errors.

## Values for the Owner's Look Check

These defaults are chosen in this spec. The owner can change each one at the design look check.

- The quiet rule (FR-4): at least one student and no activity event in 7 days.
- "This week" is the last 7 days, not the calendar week from Monday.
- "Articles opened" as the reading number (the shared definition of the admin dashboard).
- The default order: quiet schools first, then the name.
- The count of students without a school in the strip (a SYSTEM import without a school writes
  such students, ADM-04).

### Look check record (Phase 1, 2026-10-12)

Look check pending (owner, async). The owner decided on 2026-10-12 that the set does not stop for owner input,
so each default above stands until the owner changes it. The Design phase added one default:

- The strip "Seats used" counts only the students of schools that have an active license with seats. A school without
  seats shows "No license" in its row. Look check pending (owner, async).

Captures: `design/captures.md`. Notes: `design/design.md`.

## Out of Scope

- AI insights (SYS-02, after the cutover).
- The range control, Export JSON, and Refresh of legacy. The owner's answer defines one window,
  "this week"; a reload refreshes the server page.
- System health (legacy values were fixed text), alignment score, learning velocity, average
  session time, the activity log, and recent activity.
- Changes to the schools page (`/system/schools`) or the licenses page (`/system/licenses`).
- E-mail or push alerts for quiet schools.
