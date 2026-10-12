# Behavior contract — primary_parity_quick_fixes_20261011 / FR-5 lesson resume (STU-02)

Template: `docs/runbooks/primary-behavior-contract-template.md`. Legacy revision `bfea121`.

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| STU-02 | Lesson resumes on the saved task | port (owner choice "port", before the cutover) | 2026-10-11 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| Lesson page load | STUDENT | Opens a lesson with saved progress | Task 1 for progress 0 or less, else `min(14, max(2, round(p/100*14)))` | legacy `components/lesson/lesson-progress-utils.ts` (36 lines) |
| Lesson task save | STUDENT | Moves to the next task | Stores `round(task/14*100)`; 0 for task 1 | legacy `components/lesson/lesson-progress-utils.ts` |

## 3. Data read and written

| Item | Kind (table, route, side effect) | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| Lesson progress | table `lesson_progress` | `progress` percent | read and write | session user | `components/lesson/lesson-progress-bar.tsx` |

## 4. New target

- Drizzle tables: none changed.
- Domain functions: none. Pure module `apps/primary-advantage/lib/lesson-progress.ts`.
- Permission action: unchanged.
- TenantDB class: unchanged.
- AI adapter use: none.
- RPG skin components: existing lesson chrome.
- Routes: `/en/student/lesson/<id>`.

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| `startLesson` saves 14 (task 2) instead of 7 | The reader accepts both values; 7 still gives task 2 | Plan deviation note, 2026-10-12 |

## 6. Acceptance rows

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| AC-5 | `/en/student/lesson/<id>?type=article` | same | STUDENT | Progress 93 opens task 13 with a Next button; progress 0 opens task 1 | SQL FR-5 progress values | |

## 7. ETL and runbook changes

none. The track reads the stored values as they are (rule R-1). `migrated-data-checks.sql` holds the data checks.

