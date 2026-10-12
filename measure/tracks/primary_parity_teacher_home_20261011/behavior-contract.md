# Behavior contract — primary_parity_teacher_home_20261011

Legacy revision: `bfea121`. Paths in the legacy column are relative to `~/Desktop/primary-advantage`.
Reference SQL: `reference.sql` in this folder (SELECT only). Run it with
`docker exec -i reading-advantage-postgres psql -U postgres -d <copy> -At -v teacher_id=<users.id> < reference.sql`.
Phase 1 ran it read-only on `primary_parity_20261011` (one teacher with 6 classes, 160 students).

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| TCH-03 | Teacher home numbers and class table with CSV | Extend the new teacher home. Add no second dashboard. | 2026-10-11 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source |
| --- | --- | --- | --- | --- |
| Number "Active students" | TEACHER | Opens `/teacher/dashboard` | A percentage: students with a `UserActivity` row in 30 days, divided by the unique roster. The trend repeats the same percentage. | `server/models/teacherModel.ts:1103-1105`; `components/dashboard/teacher/teacher-overview-kpis.tsx:37-40,78-86` |
| Number "Average level" | TEACHER | Same | Mean of `User.level` (1 to 15). The label says "Class average CEFR level", which is wrong. | `teacherModel.ts:1108-1112`; `messages/en/en.json:3474` |
| Number "Active today" | TEACHER | Same | Unique students with a `UserActivity` row since midnight (server time zone). | `teacherModel.ts:1128-1136` |
| Number "Completed today" | TEACHER | Same | Student assignment rows with status COMPLETED and `updatedAt` today (not `completedAt`). | `teacherModel.ts:1139-1152` |
| Class table columns | TEACHER | Reads the table | Class name, code, students, active (7 days) with a rate badge (70 % and 40 % limits), average level, total XP (lifetime `User.xp`), trend, status, actions. | `components/dashboard/teacher/class-summary-table.tsx:366-381`; `teacherModel.ts:1177` |
| Trend column | TEACHER | Reads the table | Always flat: the model never sends `trend`. | `class-summary-table.tsx:182-191` |
| Status column | TEACHER | Reads the table | Always "Active": `archived` is hard-coded `false`. | `teacherModel.ts:1204` |
| Search | TEACHER | Types in the search box | Rows filter by class name or code. | `class-summary-table.tsx:88-102` |
| Sort | TEACHER | Taps a column | Sort by name, students, active (7 days), average level, total XP. Default: name, ascending. | `class-summary-table.tsx:66-131` |
| CSV export | TEACHER | Taps "Export" | Downloads `teacher-classes-<UTC date>.csv` with the shown rows in the shown order. | `class-summary-table.tsx:133-175` |
| Row click | TEACHER | Taps a row | Goes to `/teacher/class-detail/<id>`, which does not exist. The handler is not attached to the row. The actions menu opens `/teacher/class-roster/<id>`. | `class-summary-table.tsx:193-199,346,413` |
| AI insights | TEACHER | Reads the page | A block of AI text. Out of scope (SYS-02). | `components/dashboard/teacher/dashboard.tsx:134-136` |

## 3. Data read and written

| Item | Kind | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| Teacher classes | table `classrooms`, `classroom_teachers` | owned (`teacher_id`) or co-taught, `archived = false`, same `school_id` | read | `assertCan(user, "class:list", { schoolId })` | `getTeacherHome` |
| Class students | table `classroom_students`, `users` | `student_id`, `users.role = 'STUDENT'`, `users.school_id` = the teacher school, `users.level` | read | same | `getTeacherHome` |
| Activity events | tables `user_activity`, `xp_logs`, `primary_student_lesson_steps` | the shared rule: a row, an `xp_logs` row, or a lesson step with `status = 'done'` | read | same | `primary-dashboards/activity.ts` |
| XP in a window | table `xp_logs` | `sum(xp_earned)` for the class students | read | same | `primary-dashboards/activity.ts` |
| Completed today | table `student_assignments` | `completed = true` or `status = 'COMPLETED'`, and `completed_at` on the Bangkok day of today | read | same | `getTeacherHome` |
| CSV | browser | built from the shown rows by `toTeacherClassCsv` | none | none (no request) | new |

Side effects: none. The page writes nothing (no XP, no log, no email, no file, no AI call).

## 4. New target

- Drizzle tables: none. No migration.
- Domain functions: `getTeacherHome` (new fields), shared counts in `packages/domain/src/primary-dashboards/activity.ts` with the scope `{ kind: "classes", schoolId, classIds }`, pure rules in `primary-home/teacher-class-rules.ts`, `toTeacherClassCsv` in `primary-home/teacher-class-csv.ts`, `toCsvText` in `csv.ts`.
- Permission action for `assertCan`: `class:list` (unchanged).
- TenantDB class: `classrooms` FLAT; `classroom_students`, `classroom_teachers`, `user_activity`, `xp_logs`, `student_assignments`, `primary_student_lesson_steps` REFERENTIAL (`unscoped("<reason>")` with the class FK join).
- AI adapter use: none.
- RPG skin components: `Scene` (`place="guild-hall"`, `contained`), `Panel`, `Sign`, `Meter`, `RpgLink`, `RpgButton`.
- Routes: `/[locale]/teacher/dashboard` (page); `/[locale]/teacher/class-roster/<id>` (class link, "Start class" at `#class-login`). No new route and no API route.

Decisions that Phase 2 must keep:

- A student is a distinct `classroom_students` user of the teacher school with the role `STUDENT`.
  The summary counts a student one time. A class row counts the students of that class. A student in two classes counts in both rows.
- The status uses the whole percent that the row shows (`activeRate7d`). 69.6 % shows as 70 % and gives `onTrack`.
- A day is a Bangkok calendar day. "Last 7 days" is today and the 6 days before. "Previous 7 days" is the 7 days before that.

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| Active students shows "n of m (p %)", not only a percentage | Legacy showed a percentage with no count | Spec FR-7, 2026-10-11 |
| Average level label says "Average level" | Legacy label said CEFR but the value is the Primary level | Spec FR-7, 2026-10-11 |
| Windows use Bangkok days | Legacy used the server time zone | Shared decision, 2026-10-11 |
| Activity includes `xp_logs` and lesson steps | The new app writes most student work there | Shared rule, admin dashboard FR-2 |
| Completed today uses `completed_at` | Legacy used `updatedAt`, which changes for other reasons | Spec FR-1, 2026-10-11 |
| XP column is XP in 7 days, not lifetime XP | A trend needs a window; lifetime XP never falls | Default of the look check (pending, owner, async) |
| Trend works (up, flat, down at +5 % and -5 %) | Legacy trend was always flat | Default of the look check (pending, owner, async) |
| Status is an engagement status | Legacy status was always "Active" | Default of the look check (pending, owner, async) |
| The class code column is gone | The teacher-started sign-in code replaced the class code (TCH-13) | Spec, 2026-10-11 |
| The table replaces the class cards | One class list on the page | Default of the look check (pending, owner, async) |
| Class name opens `/teacher/class-roster/<id>` | The legacy row link pointed to a missing page | Spec FR-8 |
| CSV file name uses the Bangkok date | Legacy used the UTC date | Spec FR-10 |
| No "View Reports" and "Assignments" row actions | The `?class=` filter does not work in legacy | Spec, Out of Scope |

## 6. Acceptance rows

Pair file: `acceptance-pairs.json`. Steps modules: `acceptance-steps-search-sort.ts` (env `PARITY_CLASS_SEARCH`) and
`acceptance-steps-class-link.ts` (optional env `PARITY_NEW_CLASS_ID`). The legacy class id in `th-start-class` is a raw id.

| Pair id | AC | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| th-numbers | AC-1, AC-2 | `/teacher/dashboard` | `/teacher/dashboard` | TEACHER | Each legacy number maps to a new number (section 5 for the changes) | D1: the `summary` row of `reference.sql` equals the strip | batch capture (orchestrator) |
| th-columns | AC-1, AC-2 | `/teacher/dashboard` | `/teacher/dashboard` | TEACHER | Each legacy table column maps to a new column or a reason (section 5) | D2: the `class` rows of `reference.sql` equal the table | batch capture (orchestrator) |
| th-search-sort | AC-3 | `/teacher/dashboard` | `/teacher/dashboard` | TEACHER | Search shows only matching classes; two taps on "Students" sort and reverse | none | batch capture (orchestrator) |
| th-csv | AC-4 | `/teacher/dashboard` (export) | `/teacher/dashboard` (export) | TEACHER | The button exists; the file has the FR-10 header and the shown rows in the shown order (manual download step) | D3: row count equals the table | batch capture (orchestrator) |
| th-class-link | AC-5 | `/teacher/dashboard` | `/teacher/dashboard` | TEACHER | A tap on a class name opens `/teacher/class-roster/<id>` and the page loads | none | batch capture (orchestrator) |
| th-start-class | AC-6 | `/teacher/class-roster/<legacy id>#class-login` | `/teacher/class-roster/{map:classrooms:<legacy id>}#class-login` | TEACHER | "Start class" opens the class page at the sign-in panel | none | batch capture (orchestrator) |
| th-one-list | AC-6 | `/teacher/dashboard` | `/teacher/dashboard` | TEACHER | One class list; each row has "Start class" | none | batch capture (orchestrator) |
| th-look | AC-7 | `/teacher/dashboard` | `/teacher/dashboard` | TEACHER | Captures at 375 px and 1280 px, day and night | none | batch capture (orchestrator); look check pending (owner, async) |

### SQL data checks

Run on a clone of the matched copy (name with `_run_`), for the teacher that the kit signs in as.
Command: `docker exec -i reading-advantage-postgres psql -U postgres -d <clone> -At -v teacher_id=<users.id> < reference.sql`.

- D1: the `summary` row gives `classes`, `students`, `active_students_30d`, `active_today`, `average_level` (one decimal), `completed_today`. They equal the strip. The "n of m (p %)" tile reads `active_students_30d` of `students`.
- D2: each `class` row gives `students`, `active_7d`, `active_rate_7d`, `average_level`, `xp_7d`, `xp_previous_7d`, `trend`, `status`. They equal the table row of the same class.
- D3: the number of `class` rows equals the number of data rows in the CSV file. The CSV header is the header of spec FR-10.
- The 2026-10-12 query check (acceptance.md) ran D1 and D2 for two teachers: 0 differences.

## 7. ETL and runbook changes

None. No schema change, no backfill, no new cutover check.
