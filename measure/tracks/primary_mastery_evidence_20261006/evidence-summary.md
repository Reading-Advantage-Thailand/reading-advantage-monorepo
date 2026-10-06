# Evidence summary of the end-to-end run (AC-6, AC-7)

Run on 2026-10-06 against `primary_evidence_laneh`, a clone of `primary_etl_prod` (the production
copy of 2026-10-06 after the lane-m ETL, rebuilt after the jsonb double-encoding fix). Steps:
`pnpm backfill-primary-tags` (28 articles, 560 questions by legacy id), `pnpm evidence:backfill --apply`
(1065 jobs, one per quiz row), `pnpm evidence:run`, `summarizePrimaryEvidence` per school, then one
finished job re-enqueued (`refreshed`, prior state `succeeded`) and run again.

## Totals

| Count | Value |
|-------|-------|
| Jobs enqueued / settled / failed | 1065 / 1065 / 0 |
| Evidence rows (`mastery_evidence`) | 1361 |
| Review rows (`mastery_reviews`) | 1361 |
| Principals (`mastery_principals`) | 173 |
| Items skipped (all reasons) | 958 |
| Evidence rows after the replay of one job | 1361 (unchanged; the job reported 4 committed, 1 skipped again) |

## Per school (`summarizePrimaryEvidence`, since 2020-01-01)

| School | Evidence | mcq | saq | 0.5 | 0.7 | Jobs recorded | Committed | Skipped |
|--------|----------|-----|-----|-----|-----|---------------|-----------|---------|
| Boonyathat | 1097 | 870 | 227 | 870 | 227 | 849 | 1097 | 701 |
| Huakieaw School | 246 | 225 | 21 | 225 | 21 | 154 | 246 | 241 |
| Home | 18 | 15 | 3 | 15 | 3 | 10 | 18 | 16 |
| Primary Advantage School | 0 | 0 | 0 | 0 | 0 | 52 | 0 | 0 |

Every row is at the legacy confidence: MCQ 0.5 (`LEGACY_QUIZ_MODE = "teacher_led"`), SAQ 0.7.
`byDay` is the run day for every row (`observedAt` is the job's commit time; the quiz date is in
`provenance_json`).

## Outcome by activity type

| Activity | Article tagged | Rows | Rows with evidence | Items committed | Items skipped | Why the rest skipped |
|----------|----------------|------|--------------------|-----------------|---------------|----------------------|
| MC_QUESTION | yes | 387 | 373 | 1110 | 765 | the question bank was regenerated after the quiz: the asked text is not in the bank (`legacyUnmatched`) |
| MC_QUESTION | no | 36 | 0 | 0 | 90 | the article is not in the Workbooks export (28 of 582 articles are tagged today) |
| SA_QUESTION | yes | 359 | 251 | 251 | 94 | asked text not in the bank (regenerated), 14 rows with no text match |
| SA_QUESTION | no | 37 | 0 | 0 | 9 | article not tagged |
| LA_QUESTION | any | 246 | 0 | 0 | 0 | LAQ records no evidence by policy (confidence null) |

The 73 quiz rows of three staff accounts without a school were not enqueued (owner decision item 5
on the monorepo list).

## What the run changed in the code

- 194 SAQ rows tagged with the listening objective L19 skipped as `listening-without-audio` in the
  first run because no screen sends `audioPlayed`; the rule now skips only `audioPlayed: false`
  (1e34f8b3a).
- The first ETL copy stored `details` as a JSON string inside jsonb; the loader parses a string once.
- `sql.json()` through the shared Drizzle-wrapped client throws; the queue has its own client
  (c24767db7).
