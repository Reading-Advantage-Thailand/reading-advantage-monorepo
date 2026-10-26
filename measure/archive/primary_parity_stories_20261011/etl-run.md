# Local ETL reconciliation, phase S1 (2026-10-12)

Counts only. No name and no email.
Cloud Build did not run: the commands are in `etl-cloud-step.md` (orchestrator or owner step).

Target: new local database `primary_etl_stories_s1` (dropped after the run).
Source: `primary_legacy_20261011`, read only. Migrations 0000 to 0072 ran; the doctor gate for `0072_primary_stories` passed.
The import ran two times with the three cutover input files.

## Counts

| Item | Legacy | New (after run 1 and after run 2) |
|---|---|---|
| stories | 412 | 412 (all 412 have `image` set) |
| chapters | 3,296 | 3,296 |
| chapter MCQ | 32,960 | 32,949 (11 skipped: answer not among the options, the article rule) |
| chapter SAQ | 16,480 | 16,480 |
| chapter LAQ | 16,480 | 16,480 |
| flashcard source rows of chapters | 3,296 | 3,296 |
| chapter flashcard cards | 5 | 0 (the 2 decks belong to users who do not move; reported "deck not migrated") |
| `STORIES_*` activity rows | 14 | 11 (3 are duplicates or users who do not move); all 11 target a new chapter id |
| chapters with the fallback audio key | 0 | 0 |

## Checks

- Second run: the report table (read, written, skipped) is identical to the first run. The row counts did not change. No duplicate row.
- Chapter MCQ rows with a non-NULL `article_id`: 0. Chapter question rows and chapter flashcard source rows have a NULL `article_id` (Graph condition).
- Flashcard source rows with both or neither owner: 0 (the check constraint holds).
- Chapters without a story: 0.
- The report has no "stories deferred" skip.
- `tutor-read-check.ts --sample 200`: RESULT MATCH (all 5 reads PASS).
- Bucket sample (read-only `gcloud storage ls`, exact keys): 10 of 10 picture keys (`images/story/<legacy id>.png`, 5 stories and 5 chapters) and 10 of 10 audio keys exist.

## Notes

- Targets in the shared copy are unchanged. The legacy and `primary_parity_20261011` copies were not written.
- The Cloud Build run is still open for the orchestrator or the owner.
