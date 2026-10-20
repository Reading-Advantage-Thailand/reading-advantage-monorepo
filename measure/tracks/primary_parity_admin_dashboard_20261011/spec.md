# Spec — Primary parity: school admin dashboard with real data

Track ID: `primary_parity_admin_dashboard_20261011`
Type: feature (Classic FR list, template group "dashboards": this member is the sample)
Triage rows: ADM-01, SYS-03, ADM-13

## Overview

Every school admin opens `/admin/dashboard` first after sign-in. Today the page shows three
"Data unavailable" cards and four charts with hard-coded sample numbers, for example "+12% from
last week". This track replaces the page with a school dashboard that reads real school data:
a time range, a row of key numbers, adoption by grade and by CEFR level, an alert list, a
teacher table, and activity by day. A SYSTEM user chooses the school with a school selector.
The track also removes the unused dashboard parts and the two empty dashboard sub-pages.

Owner note (ADM-01): "Improve UX while porting". Owner note (SYS-03): "Improve UX". The legacy
page has many wrong labels (see Legacy Behavior). This track ports the job of each widget with a
correct definition, not the legacy layout or the legacy numbers.

## Track Set

This track is member 4 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_acceptance_20261011. The shared decisions and the start gate in the set overview apply to this track.

## Legacy Behavior (bfea121)

Paths are relative to `~/Desktop/primary-advantage`.

- Layout: page header, a SYSTEM-only school picker, a repeated "Admin Dashboard" title with a
  7 / 30 / 90 day control (default 30), two rows of KPI cards (4 + 3), then adoption, alerts,
  teacher effectiveness, the activity heatmap, and AI insights
  (`components/dashboard/admin/dashboard.tsx:122-259`, `app/[locale]/admin/dashboard/page.tsx:56`).
- Time window: `startOfDay(subDays(now, N))` in the server time zone (`server/models/adminModel.ts:11-17`).
  The range is client state only and is not in the URL (`dashboard.tsx:34`).
- KPI cards (`adminModel.ts:56-166`, `server/controllers/adminController.ts:48-82`):
  - "Active Students": students with `lastActiveAt` in the window. `lastActiveAt` changes on any
    API call (`adminModel.ts:64-72`, `server/utils/middleware.ts:113-122`).
  - "Active Teachers": teachers and admins with `lastActiveAt` in the window. The "{total} total"
    text reads a field that the API does not send, so it always shows "0 total"
    (`dashboard.tsx:166-168`, `adminController.ts:48-69`).
  - "Active Classrooms": counts class membership rows, not classes (`adminModel.ts:88-97`).
  - "Reading Sessions": counts assignment rows created in the window, not completed sessions
    (`adminModel.ts:100-109`).
  - "Total XP Earned": shows the count of assignment rows created today. The real XP sum is
    computed and not shown (`dashboard.tsx:192-201`, `adminModel.ts:143-166`).
  - "New Users": users of all roles created today (`adminModel.ts:123-130`).
  - "System Health": always "healthy" (`adminController.ts:61-64`).
- Adoption (`adminModel.ts:283-489`): "active" means an `ARTICLE_READ` row in the window, which is
  a different rule from the KPI cards. "By grade" is a guess from the CEFR level, not the class
  grade (`adminModel.ts:424-432`). "Average XP" is lifetime XP (`adminModel.ts:405-410`).
- Alert center (`adminModel.ts:491-648`): "Low Student Activity" (under 30 % of students active
  in 30 days; "high" under 10 %), "License Expiring Soon" (the rule is inverted: it fires for
  licenses that ended more than 7 days ago, `adminModel.ts:567`), and "License Capacity Warning"
  (users of all roles at 90 % or more of the seats). "Mark Read" and "View Details" do nothing
  (`components/dashboard/admin/alert-center.tsx:135-156, 279-286`).
- Teacher effectiveness (`adminModel.ts:656-793`): engagement = active students / students per
  teacher. A student in two classes of one teacher counts two times. The UI is a scatter chart
  and a top-3 list; "progress" and "accuracy" are hard-coded 0
  (`components/dashboard/admin/teacher-effectiveness.tsx:83-85`).
- Activity heatmap: `/api/dashboard/heatmap` buckets `UserActivity` rows by UTC date. In Thailand
  the cell of today is missing (`components/dashboard/compact-activity-heatmap.tsx:43-60`,
  `server/models/dashboardModel.ts:110-180`). `/api/admin/heatmap` has no caller.
- School selector (SYS-03): `components/dashboard/admin/license-selector.tsx` lists schools from
  `/api/system/dashboard/schools`, but its labels say "Select License". `/api/admin/dashboard`
  accepts any `schoolId` from the query and does not compare it with the session: any admin can
  read any school (`app/api/admin/dashboard/route.ts:8-15`).
- Sub-pages: `app/[locale]/admin/dashboard/students/page.tsx` and `teachers/page.tsx` are empty.
  The legacy nav does not link to them: the sub-items are commented out
  (`configs/admin-page-config.ts:34-55`).
- AI insights (`components/dashboard/ai-insights.tsx`) are out of scope (SYS-02 is after the cutover).

## Current Monorepo State

Paths are relative to `apps/primary-advantage` unless they start with `packages/`.

- `app/[locale]/admin/dashboard/page.tsx:30-104`: three "Data unavailable" cards and four charts
  from `components/dashboard/class-activity-chart.tsx`, which holds sample arrays
  (`class-activity-chart.tsx:27-44`) and fixed text such as "+12% from last week" (`:242`).
- `app/[locale]/admin/page.tsx:20-24` imports `AdminStatsCards`, `AdminRecentActivity`,
  `AdminQuickActions`, `AdminOverviewCharts`, and `AdminDashboardHeader`, but the page only
  redirects to `/admin/dashboard`. No page renders these components.
  `components/admin/admin-overview-charts.tsx:10-34` holds mock data.
- `app/api/admin/recent-activity/route.ts:116-130` reads `audit_events` of all schools with no
  school filter. Only `components/admin/admin-recent-activity.tsx` calls it, and no page renders
  that component. Any ADMIN can call the route and read the audit events of other schools.
- `configs/admin-page-config.ts:45-58` shows the two empty sub-page links to SYSTEM users
  (`requiredPermissions: ["SYSTEM_ACCESS"]`). The triage row ADM-13 says "SAME"; the legacy nav
  hides these links, so the monorepo nav is a small regression.
- `components/admin/school-select.tsx` is a SYSTEM-only school picker (reads `/api/schools`,
  SYSTEM only). `server/utils/auth.ts:223-237` (`resolveCreationSchoolId`) and
  `lib/license-db.ts:24-54` have the rule "SYSTEM picks the school, and the school must exist;
  every other role keeps its own school".
- The permission `admin:dashboard` (ADMIN, SYSTEM) exists (`packages/auth/src/permissions.ts:86`).
  `assertCan` checks the role only (`packages/auth/src/assert.ts`), so each query must apply the
  school filter itself.
- The Reading Advantage admin dashboard (`apps/reading-advantage/server/controllers/admin-controller.ts`)
  scopes by `license_on_users`. Primary never writes `license_on_users` or `users.license_id`, so
  those queries give empty or platform-wide numbers for Primary. This track reuses the Reading
  widget ideas, not its queries. No Primary query may read a `mv_*` materialized view: no
  Drizzle migration creates one (tech-debt row of 2026-05-23).

## Functional Requirements

### Data (domain)

- FR-1: The dashboard reads one window: the last N calendar days in Asia/Bangkok, today included,
  with N = 7, 30, or 90. The default is 30. An unknown value gives 30.
- FR-2: An "activity event" is one of these rows of a student: a `user_activity` row (by
  `created_at`), an `xp_logs` row (by `created_at`), or a `primary_student_lesson_steps` row with
  the status `done` (by `done_at`). A student is "active" in a window when the student has at
  least one activity event in the window. The three members of the group "dashboards" use this
  one rule (see Shared Domain Queries).
- FR-3: `getSchoolDashboard` returns these numbers for the school and the window. Each label in
  the UI names the metric that it shows.
  - Active students: active students of the school, of all students of the school, and the
    percentage.
  - Active teachers: TEACHER users of the school with an `auth:login` audit event or a class
    sign-in session (`primary_class_login_sessions.created_at`) in the window, of all TEACHER
    users of the school.
  - Classes with activity: not archived classes of the school with at least one active student,
    of all not archived classes.
  - Articles opened: `user_activity` rows with the type `ARTICLE_READ` created in the window by
    students of the school.
  - XP earned: the sum of `xp_logs.xp_earned` in the window for students of the school.
  - New students: STUDENT users of the school created in the window.
- FR-4: Adoption by CEFR level: one row for each main level of the Primary scale (A0, A1, A2, B1,
  B2). A sub-level counts in its main level (for example `A1-`, `A1`, `A1+` count in A1). Each row
  has the student count, the active count, the active percentage, and the average XP earned in
  the window. A row with no students is hidden.
- FR-5: Adoption by grade: one row for each `classrooms.grade` value of the not archived classes
  of the school, plus "No grade" for students without such a class. A student counts once in
  each grade of the student's classes. The row fields are the same as in FR-4. The grade is the
  real class grade. The legacy guess from the CEFR level is not ported.
- FR-6: Alerts. The rules are computed on each page load. Nothing is stored, so there is no
  "Mark read".
  - Low student activity: the school has students and fewer than 30 % of them are active in the
    last 30 days. Severity "high" under 10 %, else "medium". This alert does not use the range
    control; its text says "in the last 30 days".
  - License ends soon: a license of the school with the status `active` has an end date
    (`licenses.expiry_date`) from today to 30 days after today. Severity "critical" at 7 days or
    less, else "medium".
  - License ended: the school has a license with an end date before today, and no license with
    the status `active` and an end date from today on (or no end date). Severity "critical".
  - Seats nearly full: the seats used (FR-7) are 90 % or more of the seats. Severity "critical"
    at 100 % or more, else "high".
  - The alerts are sorted critical, high, medium. The alert text is translated (en, th, cn, tw, vi).
- FR-7: Seat usage of a school (shared with `primary_parity_school_management_20261011` and
  `primary_parity_system_dashboard_20261011`): seats = the sum of `max_users` of the licenses of
  the school with the status `active` and an end date from today on, or no end date. Seats used =
  the STUDENT users of the school. The function lives in `packages/domain/src/licenses/`.
- FR-8: Teachers table: one row for each TEACHER user of the school, with the classes (owned in
  `classrooms.teacher_id` or co-taught in `classroom_teachers`, not archived), the distinct
  students of those classes, the active students in the window, and the engagement percentage
  (active / students). Sorted by engagement, high first. A teacher without students shows "No
  students" at the end of the table.
- FR-9: Activity by day: one value for each Bangkok calendar day of the window: the number of
  distinct active students on that day. The panel also shows the total of activity events, the
  day with the most active students, and the daily average of active students.
- FR-10: School choice (SYS-03). The page resolves the school with the existing rule
  `resolveCreationSchoolId` (`server/utils/auth.ts:223-237`): only a SYSTEM caller may name a
  school, the id must be a UUID of a school that exists, and every other caller keeps the
  session school. This track writes no second copy of that rule.
  - ADMIN: always the school of the session. A `school` value in the URL is ignored.
  - SYSTEM: the requested school. A SYSTEM user with no valid school sees the school selector,
    and the page runs no dashboard query.
  - `getSchoolDashboard` checks again: `assertCan(user, "admin:dashboard")`, and a caller that
    is not SYSTEM gets FORBIDDEN when the school is not the session school. Other roles get
    FORBIDDEN.
- FR-11: Every query filters by the resolved school through `createTenantDB(db, { schoolId })`
  and `unscoped("<reason>")` with an owner-FK join to `users.school_id` (REFERENTIAL tables
  `user_activity`, `xp_logs`, `primary_student_lesson_steps`, `classroom_students`,
  `classroom_teachers`). `audit_events` is EXEMPT; the teacher sign-in count joins the actor to
  `users.school_id`.

### Page

- FR-12: `/admin/dashboard` is a server page that calls `getSchoolDashboard` directly (the pattern
  of `app/[locale]/teacher/dashboard/page.tsx`). It adds no API route. The range is the URL value
  `range` (7, 30, 90). The SYSTEM school is the URL value `school` (a school id). A change of the
  range keeps the school.
- FR-13: The page uses the RPG skin: a `Scene` (the place comes from the Design phase), `Panel`
  for each block, `Sign` tabs for the range and for CEFR / grade, and `RpgLink` or `RpgButton`
  for actions (`docs/primary-rpg-skin.md` §6). Tables and numbers stay ink on parchment, with no
  decoration inside the data area. Phone first (375 px), then 1280 px. Day and night.
- FR-14: For SYSTEM users the page shows a school selector at the top, labeled "School" (not
  "License"). It reuses `components/admin/school-select.tsx`. A selection sets the URL value
  `school`. A SYSTEM user without a school sees "Choose a school" and the selector only.
- FR-15: The page has `loading.tsx` and `error.tsx` in the pattern of
  `app/[locale]/teacher/dashboard/`. An empty school (no students) shows an empty state in each
  panel, not zeros with percentages.

### Removals

- FR-16: Delete `components/dashboard/class-activity-chart.tsx` and the "Data unavailable" cards.
- FR-17: Delete the unused components `components/admin/admin-stats-cards.tsx`,
  `admin-recent-activity.tsx`, `admin-overview-charts.tsx`, `admin-quick-actions.tsx`, and
  `admin-dashboard-header.tsx`, the dead imports and the comment block in
  `app/[locale]/admin/page.tsx`, and the route `app/api/admin/recent-activity/route.ts` (it reads
  the audit events of all schools). Delete or change the tests that cover them (see plan Phase 3).
  Reason: the new dashboard does their job with school-scoped queries, and no page renders them.
- FR-18 (ADM-13): Remove the `items` list of the dashboard entry in `configs/admin-page-config.ts`
  (the sub-link to the dashboard itself and the "teachers" and "students" sub-links), as legacy
  does (`configs/admin-page-config.ts:34-55` in legacy). Delete the two empty pages
  `app/[locale]/admin/dashboard/{students,teachers}/page.tsx`.

## Shared Domain Queries

The three members of the template group "dashboards" (admin dashboard, teacher home, and system
dashboard) use one module:
`packages/domain/src/primary-dashboards/` (new subpath export
`@reading-advantage/domain/primary-dashboards` in `packages/domain/package.json`).

- `activity.ts`: the activity event rule (FR-2), the Bangkok window (FR-1), the Bangkok day SQL
  (today it is copied in `primary-home/home.ts:21` and `primary-quest/goals.ts:20`), and the
  counts: active students, active students by day, articles opened, XP earned, and last activity.
  Each count takes a scope: `{ kind: "school", schoolId }`.
- `packages/domain/src/licenses/usage.ts`: the seat usage (FR-7).
- This member builds the module. If `primary_parity_teacher_home_20261011` starts first, that
  member builds the module with the same file names and scope type, and this member extends it.
  `primary_parity_teacher_home_20261011` adds the scope `{ kind: "classes", schoolId, classIds }`.
  `primary_parity_system_dashboard_20261011` adds the counts grouped by school for all schools.
  No member writes a second copy of a count.

## Non-Functional Requirements

- Tenant safety: a PGlite test with two schools proves that each count of school A ignores the
  rows of school B, and that an ADMIN of school A with `?school=<B>` gets the data of school A
  (lessons-learned 2026-05-02: `assertCan` checks the role only).
- Contracts: Zod input and output schemas for `getSchoolDashboard` and the shared counts.
  The page renders only data that passed the output schema.
- Performance: the dashboard runs a fixed number of aggregate queries (no loop over teachers or
  classes) and no query loads raw activity rows into memory. Target: the page renders in 2 s or
  less for the largest school of the rehearsal copy.
- Logging: server errors log with `lib/observability/logger.ts`, never `console.error`.
- i18n: all new strings in en, th, cn, tw, and vi (`messages/*.json`, namespace `AdminDashboard`).
- Accessibility: tap targets of 48 px or more; each chart has a text table or an `aria-label`
  with its values.
- JSDoc on every exported function, type, and schema (`AGENTS.md`).
- Schema: no change, no migration. ETL and cutover runbook: no change.
- Tests: Vitest in `packages/domain` (mock DB from `packages/domain/src/__tests__/mock-db.ts` or
  the recording DB of `primary-teacher-home.test.ts`, plus PGlite for the SQL), and Vitest in
  `apps/primary-advantage` (`pnpm --filter primary-advantage test`).

## Acceptance Criteria

The side-by-side kit (`primary_parity_acceptance_20261011`) runs these checks on rehearsal copies
of legacy `bfea121` and the new build with the same school data.

- AC-1: Legacy `/admin/dashboard` and new `/admin/dashboard`, as the same school ADMIN. For each
  legacy widget (7 KPI cards, adoption, alerts, teacher effectiveness, heatmap), the behavior
  contract names the new block that does its job, or the reason it is gone ("System Health":
  fixed text; AI insights: SYS-02).
- AC-2: New `/admin/dashboard?range=30` as a school ADMIN: each number of FR-3 equals the result of
  the reference SQL in the behavior contract, run on the rehearsal copy for that school and window.
- AC-3: New `/admin/dashboard?school=<id of another school>` as a school ADMIN shows the data of
  the admin's own school.
- AC-4: New `/admin/dashboard` as SYSTEM shows the school selector and no numbers. After a school
  is chosen, the URL has `school=<id>` and the numbers equal those that the school's ADMIN sees.
  Legacy `/admin/dashboard` as SYSTEM: the picker lists the same schools.
- AC-5: The page has no sample number and no "Data unavailable" text. `GET /api/admin/recent-activity`
  returns 404.
- AC-6: The admin nav (legacy and new, as SYSTEM) has no link to `/admin/dashboard/students` or
  `/admin/dashboard/teachers`.
- AC-7: The range control 7 / 30 / 90 changes all numbers except the low activity alert, and the
  activity by day panel shows N cells, the last cell is today in Bangkok.
- AC-8: Captures at 375 px and 1280 px, day and night, pass the owner's look check.
- AC-9: `pnpm --filter @reading-advantage/domain test` and `pnpm --filter primary-advantage test`
  exit 0; tsc and ESLint on the changed files report 0 errors.

## Values for the Owner's Look Check

These defaults are chosen in this spec. The owner can change each one at the design look check.

- The range options 7 / 30 / 90 days and the default of 30 (legacy values).
- The activity event rule (FR-2) and the "active teacher" rule (FR-3).
- "Articles opened" as the reading number (the app writes an `ARTICLE_READ` row when a student opens
  an article, `server/models/articleModel.ts:657`).
- The alert thresholds: 30 % and 10 % (legacy), 30 days and 7 days for the license end, 90 % and
  100 % for seats (legacy).
- Seats used = students only. Legacy counts users of all roles
  (`components/school/school-detail.tsx:428` in legacy). This is a member question; see Out of Scope.
- Activity by day shows distinct active students per day (legacy showed event counts).

### Look check answers (Phase 1)

Default used (owner decision 2026-10-12: no stop). Each value above stays as written: the range options and the
default of 30; the activity event rule and the "active teacher" rule; "Articles opened"; the alert thresholds;
seats used = students only; activity by day = distinct active students. The design look check is async; the
captures are in `captures.md`.

Decisions that the design added (Phase 1, see `behavior-contract.md` section 4 and 5):

- Place `observatory`. The staff shell has no `cq-world`, so Phase 3 adds a `contained` option to `Scene`
  (a wrapper with `clip-path: inset(0)` clips the fixed backdrop to the main column).
- Activity by day is a Monday-first calendar grid with the count in each cell (not a bar chart).
- The URL also has `by=cefr|grade` for the adoption signs; an unknown value gives `cefr`.
- When the school has no active license (seats = 0), the page shows no seat alert (the percentage has no meaning).
- "Average XP" in adoption = XP earned in the range / all students of the row.

## Out of Scope

- AI insights on the dashboard (SYS-02, after the cutover).
- "System Health" (legacy text was fixed, not measured).
- Alert "Mark read" or acknowledge (no stored alert state), and alert e-mails.
- Export of the admin dashboard. Legacy has none.
- A change to how a student gets a license, or to license access rules (the school license view
  in `primary_parity_school_management_20261011` is view only).
- New indexes on `user_activity` or `xp_logs`. If the 2 s target fails on the rehearsal copy,
  record a tech-debt row and ask the owner before a migration.
- Member question for the owner: does a teacher or an admin take a seat? This spec counts
  students only (owner answer of 2026-10-11: "which students hold a license"); legacy counts all
  users of the school.
