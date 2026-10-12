# Behavior contract — primary_parity_quick_fixes_20261011 / FR-3 reports tile (TCH-05)

Template: `docs/runbooks/primary-behavior-contract-template.md`. Legacy revision `bfea121`.

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| TCH-05 | Reports tile "Active this week" | port (owner choice "port", before the cutover) | 2026-10-11 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| Teacher reports overview | TEACHER, ADMIN, SYSTEM | Opens `/teacher/reports` | Four tiles. The fourth shows the percent of students active in 7 days and "{count} of {total} students". It always shows 0 percent (E-3). | `components/teacher/teacher-progress-reports.tsx:150-167`, `:335-354` |
| Student list read | TEACHER | (server) | `getAllStudentsByTeacher` returns no `lastActivity` field | `server/models/classroomModel.ts:534-594` |

## 3. Data read and written

| Item | Kind (table, route, side effect) | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| Student list | read | `user_activity.created_at`, `xp_logs.created_at` (max per student) | read | List scoped by school of the caller | new `classroomModel.ts` `getLastActivityByStudent` |

## 4. New target

- Drizzle tables: none changed. Reads `user_activity` and `xp_logs`.
- Domain functions: none (app model read, out of scope to move).
- Permission action: unchanged (the existing list reads and `canManageClassrooms`).
- TenantDB class: ids come from the school-scoped list; the grouped reads filter by those ids.
- AI adapter use: none.
- RPG skin components: staff page, existing tile component.
- Routes: `/en/teacher/reports`.

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| New tile counts real activity; legacy always shows 0 percent | Legacy defect E-3 (reads a field that does not exist) | Owner choice "port", 2026-10-11 |

## 6. Acceptance rows

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| AC-3 | `/en/teacher/reports` | `/en/teacher/reports` | TEACHER | Four tiles; the fourth shows percent and "n of m students" | SQL FR-3 count of students active in 7 days; make one activity in both apps first | |

## 7. ETL and runbook changes

none. The track reads the stored values as they are (rule R-1). `migrated-data-checks.sql` holds the data checks.

