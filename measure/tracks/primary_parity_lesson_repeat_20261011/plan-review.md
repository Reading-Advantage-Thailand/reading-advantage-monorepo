# Plan review: lesson repeat

## Note for S1 (from batch acceptance, 2026-10-12)
The ETL keeps only the latest of the duplicate legacy `lesson_progress` rows. When that row has no
`assignment_id`, a finished lesson opens at step 1. New rows with `assignment_id`: 28 of 263. Legacy
rows: 40 of 289. Example student id prefix: `cmhxdhv81000d`.
S1 must:
1. Import the legacy duplicates as closed attempts (history rows).
2. Keep the row that links the assignment as the current `lesson_progress` row.
3. Add an ETL test for both rules.

## Phase D
- Low: the Thai texts of the new keys have no owner approval. S2 to S4 use English until the owner gives Thai.
- Low: the grid cell grows from 36 px to 44 px high. S4 must check the 14-lesson grid at 375 px (the table already scrolls).
- Shortcut: the summary mock shows only the top and the action row, not the full summary.
