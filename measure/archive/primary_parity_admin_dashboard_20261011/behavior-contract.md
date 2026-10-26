# Behavior contract — primary_parity_admin_dashboard_20261011

Legacy revision: `bfea121` (`~/Desktop/primary-advantage`). New target: `primary-parity-integration`.
The reference SQL is in `reference-sql.sql` in this folder. The kit runs it on a clone of the rehearsal copy.

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| ADM-01 | Admin dashboard with real school data | Port, before the cutover. Note: "Improve UX while porting". | 2026-10-11 |
| SYS-03 | School selector on the admin dashboard for SYSTEM | Port, before the cutover. Note: "Improve UX". | 2026-10-11 |
| ADM-13 | Empty sub-pages Students and Teachers | Keep (status SAME). The spec removes the empty pages and the nav links, as legacy hides them (see section 5). | 2026-10-11 |
| (all) | Run to the end with no stop for owner input | Defaults of the spec stand for the look check. | 2026-10-12 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| `/admin/dashboard` layout | ADMIN, SYSTEM | Opens the page | Page header, school picker (SYSTEM), range control 7 / 30 / 90 (default 30), 2 rows of KPI cards (4 + 3), adoption, alerts, teacher effectiveness, activity heatmap, AI insights | `components/dashboard/admin/dashboard.tsx:122-259`, `app/[locale]/admin/dashboard/page.tsx:56` |
| Time window | ADMIN, SYSTEM | Changes the range | `startOfDay(subDays(now, N))` in the server zone; range is client state, not in the URL | `server/models/adminModel.ts:11-17`, `dashboard.tsx:34` |
| KPI "Active Students" | ADMIN, SYSTEM | Reads | Students with `lastActiveAt` in the window; `lastActiveAt` changes on any API call | `adminModel.ts:64-72`, `server/utils/middleware.ts:113-122` |
| KPI "Active Teachers" | ADMIN, SYSTEM | Reads | Teachers and admins with `lastActiveAt` in the window; "{total} total" always shows "0 total" | `dashboard.tsx:166-168`, `adminController.ts:48-69` |
| KPI "Active Classrooms" | ADMIN, SYSTEM | Reads | Counts class membership rows, not classes | `adminModel.ts:88-97` |
| KPI "Reading Sessions" | ADMIN, SYSTEM | Reads | Counts assignment rows created in the window | `adminModel.ts:100-109` |
| KPI "Total XP Earned" | ADMIN, SYSTEM | Reads | Shows the count of assignment rows created today; the XP sum is computed and not shown | `dashboard.tsx:192-201`, `adminModel.ts:143-166` |
| KPI "New Users" | ADMIN, SYSTEM | Reads | Users of all roles created today | `adminModel.ts:123-130` |
| KPI "System Health" | ADMIN, SYSTEM | Reads | Always "healthy" | `adminController.ts:61-64` |
| Adoption | ADMIN, SYSTEM | Reads | "Active" = an `ARTICLE_READ` row in the window; "by grade" guessed from CEFR; "average XP" is lifetime XP | `adminModel.ts:283-489`, `:424-432`, `:405-410` |
| Alert center | ADMIN, SYSTEM | Reads, taps "Mark Read" / "View Details" | Low activity (under 30 %; high under 10 %), license expiring (rule inverted: fires for licenses ended over 7 days ago), license capacity (users of all roles at 90 % or more); the two buttons do nothing | `adminModel.ts:491-648`, `:567`, `components/dashboard/admin/alert-center.tsx:135-156, 279-286` |
| Teacher effectiveness | ADMIN, SYSTEM | Reads | Scatter chart and top 3; engagement = active students / students per teacher (a student in two classes counts two times); "progress" and "accuracy" are 0 | `adminModel.ts:656-793`, `teacher-effectiveness.tsx:83-85` |
| Activity heatmap | ADMIN, SYSTEM | Reads | `UserActivity` rows by UTC date; today is missing in Thailand | `components/dashboard/compact-activity-heatmap.tsx:43-60`, `server/models/dashboardModel.ts:110-180` |
| School selector | SYSTEM | Picks a school | Lists schools from `/api/system/dashboard/schools`, labeled "Select License"; `/api/admin/dashboard` takes any `schoolId` from the query (any admin reads any school) | `components/dashboard/admin/license-selector.tsx`, `app/api/admin/dashboard/route.ts:8-15` |
| Sub-pages | SYSTEM | none | `students/page.tsx` and `teachers/page.tsx` are empty; the nav sub-items are commented out | `app/[locale]/admin/dashboard/{students,teachers}/page.tsx`, `configs/admin-page-config.ts:34-55` |
| AI insights | ADMIN, SYSTEM | Reads | AI text about the school | `components/dashboard/ai-insights.tsx` |

## 3. Data read and written

All reads. The page writes nothing: no XP, no log, no e-mail, no file, no AI call.

| Item | Kind | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| `users` | table (FLAT) | `id`, `role`, `school_id`, `cefr_level`, `created_at`, `name` | read | `assertCan(user, "admin:dashboard")` plus the school check (FR-10) | spec FR-3 to FR-8 |
| `user_activity` | table (REFERENTIAL) | `user_id`, `activity_type`, `created_at` | read, join to `users.school_id` | same | FR-2, FR-3 |
| `xp_logs` | table (REFERENTIAL) | `user_id`, `xp_earned`, `created_at` | read, join to `users.school_id` | same | FR-2, FR-3 |
| `primary_student_lesson_steps` | table (REFERENTIAL) | `student_id`, `status`, `done_at` | read, join to `users.school_id` | same | FR-2 |
| `classrooms` | table (FLAT) | `id`, `school_id`, `teacher_id`, `grade`, `archived` | read | same | FR-3, FR-5, FR-8 |
| `classroom_students`, `classroom_teachers` | table (REFERENTIAL) | `classroom_id`, `student_id`, `teacher_id` | read, owner-FK join | same | FR-5, FR-8 |
| `audit_events` | table (EXEMPT) | `actor_user_id`, `action = 'auth:login'`, `created_at` (timestamptz) | read, join actor to `users.school_id` | same | FR-3 |
| `primary_class_login_sessions` | table (FLAT) | `teacher_id`, `created_at` | read | same | FR-3 |
| `licenses` | table (FLAT) | `school_id`, `status`, `max_users`, `expiry_date` | read | same | FR-6, FR-7 |
| `schools` | table (EXEMPT) | `id`, `name` | read (name; selector list) | SYSTEM only for the list | FR-10, FR-14 |

## 4. New target

- Drizzle tables: no change, no migration.
- Domain functions (Zod input and output): `getSchoolDashboard({ db, user, input: { range, schoolId } })` in
  `packages/domain/src/primary-dashboards/school.ts`; shared counts in `primary-dashboards/activity.ts`;
  `getSchoolSeatUsage` in `packages/domain/src/licenses/usage.ts`; pure alert rules in `school-rules.ts`.
- Permission action for `assertCan`: `admin:dashboard` (ADMIN, SYSTEM). A non-SYSTEM caller with another school gets FORBIDDEN.
- TenantDB class for each table: see section 3.
- AI adapter use: none.
- RPG skin components: `Scene` (place `observatory`, with the `contained` option, see below), `Panel`, `Sign`, `Meter`, `RpgLink`.
- Routes (with the locale): `/{locale}/admin/dashboard?range=7|30|90&school=<id>&by=cefr|grade`. No API route.

Design (Phase 1, captures in `captures.md`):

- Panel order: heading with school name and date range, school selector (SYSTEM only), range signs,
  key numbers, alerts, adoption (CEFR / class grade signs), teachers table, activity by day.
- Place: `observatory` (the reports place). The staff shell has no `cq-world`. So the scene sits inside the
  main column: a wrapper with `clip-path: inset(0)` clips the fixed backdrop to the column. Phase 3 adds a
  `contained` prop to `Scene` for this (a class `cq-scene--staff`), with a unit test.
- Key numbers: six tiles. Each label names its metric. Only "active students" has a meter.
- Alerts: a chip with a text label and a mark (not color alone): Critical, High, Medium. No alerts: a check mark and text.
- Adoption and teachers: tables on parchment. The meter column hides below 640 px; the percentage stays.
- Activity by day: a calendar grid, Monday first, one cell for each day of the window, the count inside the
  cell, today with a gold outline. Each cell has an `aria-label`. At 90 days it has 13 to 14 rows.
- Empty school: each panel shows a one-line empty state; the key numbers panel shows no zeros.
- SYSTEM without a school: heading, the selector panel, and the "Choose a school" panel. No other panel.

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| "Active students" uses the shared activity rule (FR-2), not `lastActiveAt` | `lastActiveAt` changes on any API call, so it counts page loads, not learning | ADM-01 "improve UX", 2026-10-11 |
| "Active teachers" = TEACHER users with a sign-in event or class sign-in session; admins are not counted | Legacy counted admins and the total text was broken | same |
| "Active classrooms" counts classes with activity, not membership rows | Legacy number was wrong | same |
| "Reading sessions" becomes "Articles opened" (`ARTICLE_READ` rows) | Legacy counted assignment rows | same |
| "Total XP earned" shows the XP sum | Legacy showed an assignment count under this label | same |
| "New users" becomes "New students", in the range | Legacy counted all roles, today only | same |
| "System Health" is gone | The text was fixed, not measured | same |
| Adoption "by grade" uses the class grade | Legacy guessed the grade from CEFR | same |
| Adoption "average XP" = XP earned in the range, divided by all students of the row | Legacy used lifetime XP | same |
| Alert "License expiring" rule is fixed; "License ended" added | Legacy rule was inverted | same |
| Seats used = STUDENT users only | Owner answer 2026-10-11: "which students hold a license" | 2026-10-11 |
| No seat alert when the school has no active license (seats = 0) | A percentage of 0 seats has no meaning. The page shows no seat alert; the "license ended" alert covers a lapsed license | default used (owner decision 2026-10-12: no stop) |
| "Mark Read" and "View Details" are gone | They did nothing; alerts are computed on each load, nothing is stored | same |
| Teacher effectiveness scatter chart becomes a table; "progress" and "accuracy" columns are gone | They were hard-coded 0. The table gives the same job: who has active students | same |
| Heatmap by UTC date becomes a Bangkok calendar grid of distinct active students | Legacy lost the cell of today in Thailand | same |
| AI insights are not ported | SYS-02, after the cutover | 2026-10-11 |
| The empty `students` and `teachers` sub-pages and the nav links are deleted (ADM-13) | Legacy hides the links; the monorepo nav shows them to SYSTEM | spec FR-18 |
| `/api/admin/recent-activity` is deleted | It read the audit events of all schools | spec FR-17 |
| Any admin cannot read any school; ADMIN always gets the session school | Legacy route accepted any `schoolId` | spec FR-10 |

## 6. Acceptance rows

Pair ids are the ids in `acceptance-pairs.json`. The domain numbers were checked on a clone in Phase 4
(`acceptance.md`, "Domain query check"). The page result waits for the batch capture (orchestrator).

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| AC-1-admin | `/admin/dashboard` | `/admin/dashboard` | ADMIN | Each legacy widget maps to a new block (section 5) or to its reason | none | batch capture (orchestrator) |
| AC-1-system | `/admin/dashboard` | `/admin/dashboard` | SYSTEM | Selector and "Choose a school" only | school list | batch capture (orchestrator) |
| AC-2-admin | n/a | `/admin/dashboard?range=30` | ADMIN | Each number of FR-3 equals Q3a to Q3f | Q3a to Q3f (equal on the clone) | batch capture (orchestrator) |
| AC-2-adoption | n/a | `?range=30&by=grade` | ADMIN | Adoption rows equal Q4 and Q5; teacher rows equal Q8 | Q4, Q5, Q8 (equal on the clone) | batch capture (orchestrator) |
| AC-2-alerts | n/a | `/admin/dashboard` | ADMIN | Alerts equal Q6a and Q6b | Q6a, Q6b (equal on the clone) | batch capture (orchestrator) |
| AC-2-system | n/a | `?range=30&school=<id>` | SYSTEM | Numbers equal the ADMIN of that school | Q3a to Q3f | batch capture (orchestrator) |
| AC-3-admin | n/a | `?school=<other school id>` | ADMIN | The page shows the own school | Q3a for both ids | batch capture (orchestrator) |
| AC-3-system | n/a | `?school=<id>` | SYSTEM | The page shows the chosen school | Q3a | batch capture (orchestrator) |
| AC-4-system-empty | `/admin/dashboard` | `/admin/dashboard` | SYSTEM | Selector shows; no numbers; same school list | school list | batch capture (orchestrator) |
| AC-4-system-chosen | `/admin/dashboard` | `?school=<id>` | SYSTEM | URL has `school=<id>`; numbers equal the ADMIN | Q3a to Q3f | batch capture (orchestrator) |
| AC-4-admin | n/a | `/admin/dashboard` | ADMIN | No selector; own school at once | none | batch capture (orchestrator) |
| AC-5-admin, AC-5-system | n/a | `/admin/dashboard`, `GET /api/admin/recent-activity` | ADMIN, SYSTEM | No "Data unavailable", no sample number; the route returns 404 | none | batch capture (orchestrator) |
| AC-6-system, AC-6-admin | `/admin/dashboard` nav | `/admin/dashboard` nav | SYSTEM, ADMIN | No link to `/admin/dashboard/students` or `/admin/dashboard/teachers` | none | batch capture (orchestrator) |
| AC-7-admin-7, AC-7-admin-90, AC-7-system-7 | n/a | `?range=7`, `?range=90` | ADMIN, SYSTEM | Numbers change except the low activity alert; N cells; last cell is today in Bangkok | Q3a with n=7 and n=90; Q9a row count and last day (equal on the clone) | batch capture (orchestrator) |

## 7. ETL and runbook changes

none.

Note for the acceptance phase: the local matched copy `primary_parity_20261011` has 0 rows in `audit_events` and
0 rows in `primary_class_login_sessions`, and its large schools have no license. The check of "active teachers"
(Q3b) and of the license and seat alerts (Q6a) needs rows that the acceptance phase creates on a clone: sign
in as a teacher, and add one active license to the school.

## Reference run (read only, local matched copy `primary_parity_20261011`, as of 2026-10-12)

The school is the largest school with activity (218 students, 8 classes, 2 teachers). No name is written here.

| Query | n = 30 | n = 90 |
| --- | --- | --- |
| Q3a active students / total / % | 23 / 218 / 11 | 72 / 218 / 33 |
| Q3b active teachers / total | 0 / 2 | 0 / 2 |
| Q3c classes with activity / total | 3 / 8 | 6 / 8 |
| Q3d articles opened | 71 | 187 |
| Q3e XP earned | 1745 | 4493 |
| Q3f new students | 0 | 1 |
| Q4 CEFR (A0 only; all 218 students are A0-) | A0: 218 / 23 active / 11 % / avg XP 8 | A0: 218 / 72 / 33 % / 21 |
| Q5 grade 4 / 5 / 6 (students / active / avg XP) | 58 / 0 / 0; 38 / 3 / 8; 122 / 20 / 12 | 58 / 23 / 4; 38 / 12 / 16; 122 / 37 / 30 |
| Q6a seats / seats used / license ended | 0 / 218 / false | 0 / 218 / false |
| Q6b low activity (n=30) | 23 of 218, medium | not used |
| Q8 teachers (classes / students / active / engagement) | 6 / 160 / 23 / 14 %; 2 / 58 / 0 / 0 % | 6 / 160 / 49 / 31 %; 2 / 58 / 23 / 40 % |
| Q9b activity events | 580 | 1431 |

The design captures use a fictional "Demo School" with the same shape, not these values.
