# Catalogue build: local run on a scratch copy (2026-10-12)

Target: a clone of `primary_parity_20261011` (ETL done, `primary_legacy_id_map` has 25145 rows,
the book tables were empty). The clone is dropped. Workbooks commit `eeeddfd`. The test ran the
exact text of the `import` step of `cloudbuild-catalogue.yaml` (below the marker line), with the
local archive and the local database. The Cloud SQL proxy, the install, and the fetch step did not run.

| Check | Result |
|---|---|
| Guard | `target OK` |
| Build of `@reading-advantage/db` | done |
| Packages | `70 lessons: 0 new articles, 70 linked, 0 unmapped, 0 skipped, 0 failed.` |
| Guides | `en: 13 steps, 13 with a script`, `th: 13 steps, 13 with a script` |
| Rows after run 1 | series 2, books 5, lessons 70, guides 26, articles 626 |
| Rows after run 2 | same counts; the lesson id and article link hash and the guide key hash are the same |
| Bad package (`{bad` in `quest-4/l03.json`) | exit 1, `FAILED quest-4/l03.json: ...`, `STOP: a package failed` |
| Log scan (password, `postgres`, `://`) | 0 matches in the logs of both good runs |

Unmapped lessons: none. The owner has nothing to decide for the unmapped list on this copy.
The dry-run flag was not run: the real run on a clone is the stronger check.
The cloud run is an orchestrator or owner step: `catalogue-build-commands.md`.
