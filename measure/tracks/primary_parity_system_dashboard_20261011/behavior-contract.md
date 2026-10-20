# Behavior contract — primary_parity_system_dashboard_20261011

Legacy revision: `bfea121` (`~/Desktop/primary-advantage`). New target: `primary-parity-integration`.
The reference SQL is in `reference-sql.sql` in this folder. The kit runs it on a clone of the rehearsal copy.

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| SYS-01 | System dashboard | Port, before the cutover. Note: "We need to improve the usability of this. The old design was confusing and not very helpful." | 2026-10-11 |
| SYS-01 | Member answer | A totals strip, then one row for each school (active students this week, reading this week, licenses used of total, last activity, a flag when a school goes quiet). A row opens the admin dashboard of that school. | 2026-10-11 |
| SYS-02 | AI insights | After the cutover. Not in this track. | 2026-10-11 |
| (all) | Run to the end with no stop for owner input | The defaults of the spec stand for the look check. | 2026-10-12 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| `/system/dashboard` toolbar | SYSTEM | Picks range 7 / 30 / 90 / all, Export, Refresh | Range is client state; "7" and "90" fall back to 30 in the active-users query; "all" gives an invalid start date; Export downloads one of six queries; Refresh refetches one query | `components/dashboard/system/dashboard.tsx:135-196`, `server/models/systemModel.ts:240-263, 626-627` |
| Metric card "Total Sessions" | SYSTEM | Reads | Same value as "Reading Sessions" | `components/dashboard/system/metrics-cards.tsx:88, 154` |
| Metric card "Active Users" | SYSTEM | Reads | Users of all roles | `server/models/systemModel.ts:358-619` |
| Metric cards "Alignment Score", "Learning Velocity", "Avg. Session Time" | SYSTEM | Reads | Computed from all rows in memory, with N+1 queries for each student | `systemModel.ts:443-505` |
| Tabs Overview / Activity / AI Insights | SYSTEM | Switches tab | Three tabs over the six cards | `dashboard.tsx:210-254` |
| Overview: totals | SYSTEM | Reads | Total schools (labeled "Active institutions", but all schools), total users, total articles, completion rate | `server/controllers/systemController.ts:21-138` |
| Overview: license usage | SYSTEM | Pages a carousel, one license at a time | Used = all users of the school (any role); total = `maxUsers` | `components/dashboard/system/modern-license-usage.tsx:99-100` |
| Overview: system health | SYSTEM | Reads | Uptime fixed at "99.9%" | `systemController.ts:89` |
| Overview: recent activity | SYSTEM | Reads | 5 rows | `systemController.ts:21-138` |
| Activity tab: heatmap, trend chart, activity log | SYSTEM | Reads | A heatmap and a trend chart of the same series; a 50-row log | `systemModel.ts:621-812` |
| Table of schools | SYSTEM | none | None. The only school-level view is the license carousel | (absent) |
| API routes | SYSTEM | none | All `app/api/system/dashboard/**` routes need `SYSTEM_ACCESS` | `app/api/system/dashboard/**` |
| School ADMIN opens `/system/dashboard` | ADMIN | Opens the page | Refused (no page access) | `SYSTEM_ACCESS` |

## 3. Data read and written

All reads. The page writes nothing: no XP, no log, no e-mail, no file, no AI call.

| Item | Kind | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| `schools` | table (EXEMPT) | `id`, `name` | read | `assertCan(user, "system:dashboard:read")` (SYSTEM) | FR-2, FR-3 |
| `users` | table (FLAT) | `id`, `role`, `school_id` | read, grouped by `school_id` | same | FR-2, FR-3 |
| `user_activity` | table (REFERENTIAL) | `user_id`, `activity_type`, `created_at` | read, join to `users.school_id` | same | FR-1, FR-2, FR-3 |
| `xp_logs` | table (REFERENTIAL) | `user_id`, `created_at` | read, join to `users.school_id` (activity event only) | same | FR-1 |
| `primary_student_lesson_steps` | table (REFERENTIAL) | `student_id`, `status`, `done_at` | read, join to `users.school_id` (activity event only) | same | FR-1 |
| `licenses` | table (FLAT) | `school_id`, `status`, `max_users`, `expiry_date` | read, grouped by `school_id` | same | FR-3 |

## 4. New target

- Drizzle tables: no change, no migration.
- Domain functions (Zod input and output): `getPlatformOverview({ db, user })` in
  `packages/domain/src/primary-dashboards/platform.ts`; contracts in `platform-contracts.ts`; the pure quiet rule in
  `platform-rules.ts`; counts grouped by school in `activity.ts` (scope `{ kind: "platform" }`); seat usage grouped by
  school in `packages/domain/src/licenses/usage.ts`. A fixed number of aggregate queries.
- Permission action for `assertCan`: `system:dashboard:read` (SYSTEM only). ADMIN, TEACHER, and STUDENT get FORBIDDEN.
- TenantDB class for each table: see section 3. Reads of all schools go through `unscoped("<reason>")`.
- AI adapter use: none.
- RPG skin components: `Scene` (place `observatory`, option `contained`), `Panel`, `Meter`, `RpgLink`. The quiet status
  is a chip with a mark and a text label.
- Routes (with the locale): `/{locale}/system/dashboard`. No API route.

Design (Phase 1, captures in `design/captures.md`, notes in `design/design.md`):

- Order: heading with the week, the totals panel (six tiles; a note when students have no school), the schools panel
  (search, sort, table from 768 px, cards below).
- Table columns: school (a link), active students ("n of m (p%)"), articles opened, seats ("used of total" or
  "No license"), last activity (a Bangkok date or "None"), status (Quiet, Active, No students), and an "Open" button.
- Default order: quiet schools first, then the school name.

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| Six cards, three tabs, and a carousel become one totals strip and one schools table | Legacy numbers repeated or had a wrong label; a table with one row for each school did not exist | SYS-01 member answer, 2026-10-11 |
| "Total Sessions" and "Reading Sessions" (same value) become "Articles opened this week" (`ARTICLE_READ` rows) | Duplicate value | same |
| "Active Users" (all roles) becomes "Active students this week" with the shared activity rule | Legacy counted users of all roles | same |
| "Active institutions" (all schools) becomes "Schools" | The legacy label was wrong | same |
| License "used" (users of all roles) becomes seats used = STUDENT users | Owner answer 2026-10-11: which students hold a license | 2026-10-11 |
| Strip "Seats used" counts only the students of schools that have an active license with seats | A school without seats has no total to compare with. The row shows "No license" | default used (owner decision 2026-10-12: no stop) |
| One window, "this week" (last 7 Bangkok days); no range control, Export, or Refresh | Owner answer defines one window; a reload refreshes the server page | SYS-01 member answer, 2026-10-11 |
| Alignment score, learning velocity, average session time, completion rate, system health, recent activity, activity log, heatmap, trend chart | Fixed text, computed from all rows in memory, or not asked for | same |
| AI insights tab is not ported | SYS-02, after the cutover | 2026-10-11 |
| New: the quiet flag and the order with quiet schools first | Owner answer 2026-10-11 | same |
| New: a row opens `/admin/dashboard?school=<id>` | Owner answer; SYS-03 school choice | same |
| New: the count of students without a school (only when more than 0) | A SYSTEM import without a school writes such students (ADM-04) | spec FR-8 |

## 6. Acceptance rows

The pair ids are in `acceptance-pairs.json` (6 pairs). The steps module `acceptance-steps-open-school.ts` reads the
school id from the environment variable `PARITY_SCHOOL_ID`.

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| AC-1-system | `/system/dashboard` | `/system/dashboard` | SYSTEM | Each legacy number maps to a new total or column, or to its reason (section 5); no tab, range control, Export, Refresh, or placeholder text | none | batch capture (orchestrator) |
| AC-2-totals | n/a | `/system/dashboard` | SYSTEM | Each total equals Q-A (and Q-C for the note) | Q-A, Q-C | batch capture (orchestrator) |
| AC-2-rows | n/a | `/system/dashboard` | SYSTEM | Each school row equals Q-B | Q-B | batch capture (orchestrator) |
| AC-3-quiet | n/a | `/system/dashboard` | SYSTEM | Schools with students and no event in 7 days show "Quiet" and sit first; a school without students shows "No students" | Q-B `status` | batch capture (orchestrator) |
| AC-4-open | n/a | `/system/dashboard` then `/admin/dashboard?school=<id>` | SYSTEM | A tap on a row opens the admin dashboard of the same school with the same student total | Q-B students | batch capture (orchestrator) |
| AC-5-admin | `/system/dashboard` | `/system/dashboard` | ADMIN | The proxy sends the user to the unauthorized page | none | batch capture (orchestrator) |

## 7. ETL and runbook changes

none.

## Reference run (read only, local matched copy `primary_parity_20261011`, 2026-10-12)

The reference SQL ran on the copy. The result is the expected shape; the real values depend on the day.

| Query | Result |
| --- | --- |
| Q-A | 8 schools, 643 students, 7 teachers, 5 active students, 2 articles opened, 5 seats used of 101 seats |
| Q-B | 3 schools "Quiet" (students 218, 3, and 417), 1 "Active" (5 students, 5 active, 100 %, seats 5 of 100), 4 "No students" |
| Q-C | 0 students without a school |

Note for Phase 4: the copy has three quiet schools, so AC-3 needs no test school. Two schools have no license
("No license" cells). No school has a license that ends soon.
