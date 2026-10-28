# Real run of Phase S1 (local scratch copy)

Written on 2026-10-13 from the notes of the S1 helper in `plan.md` (review fix A4).
The helper ran the migration and one close on a scratch database, then dropped it.

## Setup

- Scratch database: `primary_etl_repeat_s1` (dropped after the run).
- Legacy source: `primary_legacy_20261011`. The run only read it.
- Migration: `0073_primary_lesson_attempts`.

## Legacy counts

- `user_lesson_progress`: 289 rows, 266 (user, article) pairs.
- 23 pairs had duplicates. 40 rows had an `assignment_id`.

## After the migration and the import

- `lesson_progress`: 263 rows. 3 rows were skipped because the user was not migrated.
- 40 current rows kept an `assignment_id`.
- `primary_lesson_attempts`: 23 rows. All have the reason `legacy_import`.
- Each of the 23 attempts has a current row. All attempt numbers start from 1.
- `tutor_compat` still has 4 views.

## One close on a real student row

| Measure | Before | After |
| --- | --- | --- |
| Activity rows of the article | 7 | 1 (the left row is not a lesson type) |
| `primary_lesson_attempts` rows | 0 | 1 |
| Lesson progress | 100 | 0 |
| `xp_logs` rows | 10 | 10 |
| `users.xp` | 58 | 58 |
