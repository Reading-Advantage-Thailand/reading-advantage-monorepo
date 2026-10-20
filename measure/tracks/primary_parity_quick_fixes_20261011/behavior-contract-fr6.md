# Behavior contract — primary_parity_quick_fixes_20261011 / FR-6 quiz finish (STU-03)

Template: `docs/runbooks/primary-behavior-contract-template.md`. Legacy revision `bfea121`.

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| STU-03 | A quiz finishes when a row exists | port (owner choice "port", before the cutover) | 2026-10-11 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| Finish quiz | STUDENT | Finishes MCQ, SAQ, or LAQ | Finds a `completed = false` row of the same user, type, and article and updates it; else creates one | legacy `actions/question.ts:65-114` |
| Double click | STUDENT | Clicks twice | A second row and XP two times (no unique key) | legacy `actions/question.ts:65-114` |

## 3. Data read and written

| Item | Kind (table, route, side effect) | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| Quiz row | table `user_activity` | details, timer, `completed` | write (upsert) | session user | `actions/question.ts` |
| XP | tables `xp_logs`, `users` | `xp_earned`, `xp` | write | session user | `actions/question.ts` |
| Article log | table `article_activity_logs` | quiz flags | write | session user | `actions/question.ts` |
| Evidence | side effect | `enqueuePrimaryEvidenceJob` | write | session user | `actions/question.ts` |

## 4. New target

- Drizzle tables: none changed. Unique key `user_activity` (user_id, activity_type, target_id) and `xp_logs_user_activity_unique` stay.
- Domain functions: none (the action stays in the app).
- Permission action: session user only.
- TenantDB class: unchanged.
- AI adapter use: none.
- RPG skin components: unchanged.
- Routes: server action `finishQuiz`.

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| A double click gives XP one time | Legacy defect E-4 (no unique key) | Spec, 2026-10-11 |
| One transaction for all writes | Stops a half write on error | Spec, 2026-10-11 |

## 6. Acceptance rows

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| AC-6 | `/en/student/read/<id>` | same | STUDENT | A quiz with a migrated `completed = false` row finishes; a double click gives XP one time | SQL FR-6 (rows with `completed = false`: LA 50, MC 22, SA 21 on the copy) | |

## 7. ETL and runbook changes

none. The track reads the stored values as they are (rule R-1). `migrated-data-checks.sql` holds the data checks.

