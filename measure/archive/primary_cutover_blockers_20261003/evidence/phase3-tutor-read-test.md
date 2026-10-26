# Phase 3: Tutor read test (FR-5)

The script runs Tutor's five reads on the new database through schema `tutor_compat` and on a legacy copy. It compares the results.

## Command

```
cd packages/db
B=postgresql://postgres:postgres@localhost:5432
../../node_modules/.bin/tsx scripts/tutor-read-check.ts \
  --target $B/primary_advantage --reference $B/primary_legacy_20260429 [--sample N | --article-ids <file>]
```

The package script `pnpm --filter @reading-advantage/db tutor-read-check -- <args>` runs the same code. Exit codes: 0 match, 1 difference, 2 connection or config error. The script catches errors for each query. A renamed or dropped view column (SQLSTATE 42703) or a missing table (42P01) is a shape failure with exit 1, and the script runs the other queries. Only connection or config errors give exit 2. The SQL strings are in `packages/db/src/tutor-read-queries.ts` (verbatim from the Tutor repository). The comparison logic is in `packages/db/src/tutor-read-compare.ts`.

## Shape result (column names and pg types)

| Tutor read | Reference columns | Target columns | Result |
|---|---|---|---|
| article | 14 | 14 | PASS |
| multiple_choice_questions | 4 | 4 | PASS |
| short_answer_questions | 3 | 3 | PASS |
| sentencs_and_words_for_flashcard | 4 | 4 | PASS |
| import_published_articles | 2 | 2 | PASS |

Overall shape: PASS for all five reads.

## Row result (default: all published article ids)

Without `--sample` or `--article-ids`, the row check uses all published article ids of the reference database (24 in `primary_legacy_20260429`). `--sample N` takes the first N ids for a quick run. `import_published_articles` is compared in full (all rows, by id).

The result is FAIL (434 differences), exit 1. This result is expected until the ETL loads data. The local `primary_advantage` has no migrated legacy data. The differences are `missing-row`: 24 article rows, 240 multiple choice rows, 120 short answer rows, 24 flashcard rows, and 24 import rows. The 2 `extra-row` import differences are 2 published articles that exist only in the local target.

## Rehearsal instruction

Before each rehearsal, restore a production copy to a scratch database. Run the ETL into the target database. Run the script with no id option (all published articles). Rehearsal passes only when the script exits 0.
