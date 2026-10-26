# Spec — Primary parity: teacher home numbers and class table

Track ID: `primary_parity_teacher_home_20261011`
Type: feature (Classic FR list, template group "dashboards")
Triage row: TCH-03

## Overview

Teachers open the teacher home (`/teacher/dashboard`) first after sign-in. The new home shows
four numbers (classes, students, open assignments, need help), class cards with "Start class",
the class book slot, Class Quest cards, open assignments, and who needs help. The legacy
dashboard also showed active students in 30 days with an engagement percentage, the average
level, active today, completed today, and a class table with search, sort, XP, trend, status,
and CSV export. This track adds these numbers and the class table to the new home. It adds no
second dashboard (shared decision of 2026-10-11: extend the new feature).

## Track Set

This track is member 4 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_acceptance_20261011. The shared decisions and the start gate in the set overview apply to this track.

## Legacy Behavior (bfea121)

Paths are relative to `~/Desktop/primary-advantage`. The files are the same as in legacy commit
`a62204a`.

- Data: `GET /api/teachers/dashboard` (`app/api/teachers/dashboard/route.ts:5-17`, TEACHER_ACCESS)
  calls `getTeachersDashboardModel` (`server/models/teacherModel.ts:1022-1246`). It loads all
  assignments of all time and the activity rows of 30 days for each student, and adds them up in
  JavaScript (`teacherModel.ts:1030-1080`). Windows use the server time zone, not Bangkok
  (`teacherModel.ts:1025-1027`).
- Numbers (`components/dashboard/teacher/teacher-overview-kpis.tsx`):
  - Active students: a percentage only. Numerator: unique students with a `UserActivity` row in
    30 days; denominator: the unique roster (`teacherModel.ts:1103-1105`, `kpis.tsx:37-40`). The
    "trend" repeats the same percentage (`kpis.tsx:78-86`).
  - Average level: the mean of `User.level` (the Primary Advantage level, 1 to 15)
    (`teacherModel.ts:1108-1112`). The label says "Class average CEFR level" (`messages/en/en.json:3474`),
    which is wrong.
  - Active today: unique students with a `UserActivity` row since midnight (`teacherModel.ts:1128-1136`).
  - Completed today: student assignment rows with the status COMPLETED and `updatedAt` today, not
    `completedAt` (`teacherModel.ts:1139-1152`).
- Class table (`components/dashboard/teacher/class-summary-table.tsx`):
  - Columns: class name, code, students (not unique across classes), active (7 days) with a rate
    badge (70 % and 40 % limits, `:366-381`), average level, total XP (lifetime sum of `User.xp`,
    `teacherModel.ts:1177`), trend, status, actions.
  - Trend: the model never sends `trend`, so the icon is always flat (`:182-191`).
  - Status: `archived` is hard-coded `false`, so it always shows "Active" (`teacherModel.ts:1204`).
  - Search: class name or code (`:88-102`). Sort: name, students, active (7 days), average level,
    total XP; default name, ascending (`:66-131`).
  - CSV: `teacher-classes-<UTC date>.csv` with the shown rows in the shown order
    (`:133-175`).
  - Row link: `handleRowClick` goes to `/teacher/class-detail/<id>` (`:193-199`), a page that
    does not exist. The click handler is not attached to the row (`:346`). The actions menu opens
    `/teacher/class-roster/<id>` (`:413`), which exists.
- AI insights on the legacy page (`components/dashboard/teacher/dashboard.tsx:134-136`) are out
  of scope (SYS-02 is after the cutover).

## Current Monorepo State

Paths are relative to `apps/primary-advantage` unless they start with `packages/`.

- `app/[locale]/teacher/dashboard/page.tsx` is a server page. It calls `getTeacherHome`
  (`packages/domain/src/primary-home/teacher-home.ts`) and shows four `StatTile` numbers, a list
  of class cards with "Start class", `ClassBookSlot`, `TeacherQuestCard`, open assignments, and
  "Who needs help". The triage evidence for TCH-03 is correct.
- `teacherHomeOutput` (`packages/domain/src/primary-home/teacher-contracts.ts:48-59`) has classes
  with `studentCount`, `studentCount`, open assignments, and needs help.
- "Who needs help" uses `max(user_activity.created_at)` as the last activity
  (`teacher-home.ts:77-81`). It does not see lesson steps or game XP.
- `classrooms.archived` exists in the monorepo (`packages/db/src/schema/classrooms.ts:14`).
  The home lists only classes that are not archived.
- The app writes `student_assignments.completed_at` when a student finishes
  (`server/models/assignmentModel.ts:426, 452-456`).
- CSV pattern: `toProgressCsv` (`packages/domain/src/primary-books/progress.ts:234-260`) and the
  route `app/api/class-books/[classBookId]/progress/route.ts:18-23`.
- The class page is `/teacher/class-roster/<classroomId>`.

## Functional Requirements

### Data (domain)

- FR-1: `getTeacherHome` returns four more numbers for the teacher's classes (owned or co-taught,
  not archived, in the teacher's school):
  - `activeStudents30d`: distinct students with an activity event (FR-5) in the last 30 Bangkok
    calendar days, today included; and `engagementRate30d` = round(active / students × 100),
    0 when there is no student.
  - `averageLevel`: the mean `users.level` (Primary Advantage level) of the distinct students,
    one decimal; null when there is no student.
  - `activeToday`: distinct students with an activity event on the Bangkok calendar day of today.
  - `completedToday`: student assignment rows of these classes that are done (`completed = true`
    or status `COMPLETED`) with `completed_at` on the Bangkok calendar day of today.
- FR-2: `getTeacherHome` returns one class row for each class, with: id, name, grade, students,
  `active7d` (distinct students with an activity event in the last 7 Bangkok days), `activeRate7d`,
  `averageLevel`, `xp7d` (sum of `xp_logs.xp_earned` of the class students in the last 7 days),
  `xpPrevious7d` (the 7 days before), `trend`, and `status`.
- FR-3: Trend rule: `up` when `xpPrevious7d` = 0 and `xp7d` > 0, or when the change
  (`xp7d` − `xpPrevious7d`) / `xpPrevious7d` is more than +5 %. `down` when the change is less
  than −5 %. Else `flat`. Legacy compares `trend.xp` with 5 and −5 with no unit, and the model
  never sends the value (`class-summary-table.tsx:182-191`); this spec reads the 5 as a percentage.
- FR-4: Status rule: `noStudents` when the class has no student; `onTrack` when `activeRate7d` is
  70 % or more; `someQuiet` from 40 % to 69 %; `needsAttention` under 40 %. The limits are the
  legacy rate badge limits (`class-summary-table.tsx:366-381`).
- FR-5: An activity event is the shared rule of `primary_parity_admin_dashboard_20261011` FR-2:
  a `user_activity` row, an `xp_logs` row, or a done `primary_student_lesson_steps` row. "Who
  needs help" uses the same rule for the last activity, so that a student who is "active today"
  is never "no activity for 7 days".
- FR-6: Every new query reads only the teacher's class ids in the teacher's school
  (`createTenantDB(db, { schoolId })` and `unscoped("<reason>")` with the class FK join), as the
  current `getTeacherHome` does.

### Page

- FR-7: The summary strip shows the four current numbers and the four new numbers of FR-1. The
  active number shows "n of m (p %)". The average level label says "Average level", not "CEFR".
- FR-8: The class table replaces the class card list of "My classes", so that the page has one
  class list. Each row keeps the "Start class" action (`/teacher/class-roster/<id>#class-login`).
  A tap on the class name opens the class page `/teacher/class-roster/<id>`.
- FR-9: Search: a case-insensitive part of the class name. Sort: class name, students, active
  (7 days), average level, XP (7 days), trend, and status; the default is the class name,
  ascending; a second tap on the same column changes the order. On a phone (375 px) each row is
  a card with the same values; the sort is a select.
- FR-10: CSV export: a button downloads the rows that the table shows, after the search, in the
  sort order. The file name is `teacher-classes-<YYYY-MM-DD>.csv` with the Bangkok date. The
  header row is `class,grade,students,active_7d,active_rate_7d,average_level,xp_7d,xp_previous_7d,trend,status`.
  The pure function `toTeacherClassCsv` builds the text in the browser; it reuses the quote rule
  of `toProgressCsv`, moved to a shared pure file `packages/domain/src/csv.ts`.
- FR-11: The page uses the RPG skin: a `Scene` (the place comes from the Design phase), `Panel`
  for each block, and `RpgLink` or `RpgButton` for actions (`docs/primary-rpg-skin.md` §6). The
  current blocks keep their content. Phone first (375 px), then 1280 px. Day and night.

### Removals

- FR-12: Remove the class card list of the "My classes" block (FR-8). The "My classes" empty
  state stays.

## Shared Domain Queries

The three members of the template group "dashboards" (admin dashboard, teacher home, and system
dashboard) use one module:
`packages/domain/src/primary-dashboards/` (subpath `@reading-advantage/domain/primary-dashboards`).

- `primary_parity_admin_dashboard_20261011` builds the module: the activity event rule, the
  Bangkok window, the Bangkok day SQL, and the counts with the scope `{ kind: "school", schoolId }`.
- This member extends `activity.ts` with the scope `{ kind: "classes", schoolId, classIds }` and
  with counts grouped by class (active students, XP in a window). If this member starts before
  the admin dashboard member, it builds the module with the same file names and scope type, and
  the admin member extends it.
- `getTeacherHome` stays in `packages/domain/src/primary-home/teacher-home.ts` and calls the
  shared counts. No member writes a second copy of a count.

## Non-Functional Requirements

- Tenant safety: a PGlite test with two schools and two teachers proves that the numbers and the
  class rows read only the teacher's classes in the teacher's school.
- Contracts: `teacherHomeOutput` gets the new fields (Zod); the page renders parsed data only.
- Performance: a fixed number of aggregate queries, no query for each class or each student.
- Logging: server errors log with `lib/observability/logger.ts`.
- i18n: all new strings in en, th, cn, tw, and vi (namespace `TeacherHome`).
- Accessibility: tap targets of 48 px or more; the sort buttons have `aria-sort`.
- JSDoc on every exported function, type, and schema.
- Schema: no change, no migration. ETL and cutover runbook: no change.
- Coordination: `primary_parity_class_books_20261011` (member 3) changes the class book slot on
  the same page. Merge integration into the branch before the UI phase, and keep the book slot as
  that member leaves it.
- Tests: Vitest in `packages/domain` (recording DB of `primary-teacher-home.test.ts` and PGlite)
  and in `apps/primary-advantage`.

## Acceptance Criteria

The side-by-side kit (`primary_parity_acceptance_20261011`) runs these checks on rehearsal copies
of legacy `bfea121` and the new build with the same school data.

- AC-1: Legacy `/teacher/dashboard` and new `/teacher/dashboard`, as the same TEACHER. For each
  legacy number and each legacy table column, the behavior contract names the new number or
  column, or the reason it changed (code: the class sign-in code took its place, TCH-13; total XP:
  now XP in 7 days).
- AC-2: As a TEACHER on the new build, each number of FR-1 and each class row value of FR-2
  equals the reference SQL of the behavior contract on the rehearsal copy.
- AC-3: As a TEACHER on the new build, a search for part of a class name shows only the matching
  classes; a tap on "Students" sorts by students, a second tap changes the order.
- AC-4: As a TEACHER on the new build, the CSV file has the header of FR-10 and the rows of the
  table in the shown order. Legacy CSV: the kit records its columns for the comparison.
- AC-5: As a TEACHER on the new build, a tap on a class name opens `/teacher/class-roster/<id>`
  and the page loads (legacy row click goes to a page that does not exist).
- AC-6: The page has one class list, and "Start class" works from the table.
- AC-7: Captures at 375 px and 1280 px, day and night, pass the owner's look check.
- AC-8: `pnpm --filter @reading-advantage/domain test` and `pnpm --filter primary-advantage test`
  exit 0; tsc and ESLint on the changed files report 0 errors.

## Values for the Owner's Look Check

These defaults are chosen in this spec. The owner can change each one at the design look check.

- XP in the table is the XP of the last 7 days, with the trend against the 7 days before. Legacy
  showed lifetime XP and a trend that was always flat.
- Status is an engagement status (FR-4). Legacy status was Active / Archived and always "Active".
- The table replaces the class cards (FR-8).
- The 70 % / 40 % and 5 % limits (legacy values).

Defaults used in Phase 1 (each one: look check pending (owner, async)): XP of the last 7 days with a working trend; engagement status; table replaces the class cards; limits 70 % / 40 % / 5 %; place `guild-hall`; block order as in "Design Decisions (Phase 1)".

## Design Decisions (Phase 1)

Mocks: `design/captures.md`. The owner look check is pending (owner, async, decision 2026-10-12).
The defaults below stand until the owner changes one.

- Place: `guild-hall` with `Scene contained` (the page sits in the staff shell, as the admin dashboard does). Look check pending (owner, async).
- Block order: header, summary `Panel` (8 numbers), class table `Panel lg:col-span-2`, `ClassBookSlot` `lg:col-span-2` (as class_books S5 leaves it, no change), one Class Quest `Panel` for each class, open assignments `Panel`, who needs help `Panel`. The last two share one row at 1024 px and more. Look check pending (owner, async).
- Summary strip: one `Panel` with a 2-column grid at 375 px and a 4-column grid at 768 px and more. Row 1: classes, students, active students (30 days) with a `Meter` and "n of m (p%)", average level. Row 2: active today, completed today, open assignments, need help (red number when above 0). With no student: average level shows "—" and the active tile shows "No students yet".
- Class table: search box, "Download CSV" `RpgButton small`, and a sort select (below 768 px). At 768 px and more it is a table with 7 sort buttons in `th` with `aria-sort`, and the "Start class" `RpgLink small tone="gold"` in the last column. Below 768 px each class is a card with a status chip, a 2-column list of values, and a full-width "Start class". The class name is the link to the class page.
- Trend and status show a symbol and a word, never colour alone. Trend: up, flat, down. Status: On track, Some quiet, Needs attention, No students.
- Sort select and sort button labels: Class, Students, Active (7 days), Average level, XP (7 days), Trend, Status. Sort order for trend: down, flat, up. For status: needs attention, some quiet, on track, no students.
- Active column at 1280 px reads "21 of 24 (88%)". Long class names wrap in the first column (`max-w-[13rem]`); all other cells do not wrap.
- A search with no match shows one `role="status"` line. No class shows the "My classes" empty state with "Go to My Classes".
- Phone height: each class card is about 280 px, so six classes need about 1700 px. Accepted for the first release.

## Out of Scope

- AI insights on the teacher home (SYS-02, after the cutover).
- The class report tabs (TCH-04, after the cutover).
- Archived classes in the table. The home lists classes that are not archived; "My classes"
  manages archived classes.
- The class code column: the teacher-started sign-in code replaced the class code (TCH-13).
- The legacy "View Reports" and "Assignments" row actions (the `?class=` filter does not work in
  legacy either).
