# Phase 3: Tutor read test (FR-5)

The script runs Tutor's five reads on the new database through schema `tutor_compat` and on a legacy copy. It compares the results.

## Command

```
cd packages/db
B=postgresql://postgres:postgres@localhost:5432
../../node_modules/.bin/tsx scripts/tutor-read-check.ts \
  --target $B/primary_advantage --reference $B/primary_legacy_20260429 [--sample 3 | --article-ids <file>]
```

The package script `pnpm --filter @reading-advantage/db tutor-read-check -- <args>` runs the same code. Exit codes: 0 match, 1 difference, 2 connection or config error. The SQL strings are in `packages/db/src/tutor-read-queries.ts` (verbatim from the Tutor repository). The comparison logic is in `packages/db/src/tutor-read-compare.ts`.

## Shape result (column names and pg types)

| Tutor read | Reference columns | Target columns | Result |
|---|---|---|---|
| article | 14 | 14 | PASS |
| multiple_choice_questions | 4 | 4 | PASS |
| short_answer_questions | 3 | 3 | PASS |
| sentencs_and_words_for_flashcard | 4 | 4 | PASS |
| import_published_articles | 2 | 2 | PASS |

Overall: MATCH, exit 0.

## Row result (`--sample 3`)

The result is FAIL (51 differences), exit 1. This result is expected until the ETL loads data. The local `primary_advantage` has no migrated legacy data. All differences are `missing-row`: 3 article rows, 30 multiple choice rows, 15 short answer rows, and 3 flashcard rows.

## Rehearsal instruction

Before each rehearsal, restore a production copy to a scratch database. Run the ETL into the target database. Run the script with `--sample 50` or with `--article-ids <file>`. Rehearsal passes only when the script exits 0.
