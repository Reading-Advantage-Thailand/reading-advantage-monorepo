# Phase 3 — Tutor ID mapping and articleId resolution check (FR-8, 2026-10-04)

Question: does the legacy-to-monorepo data path cover ID mapping, and do the article
IDs that Tutor Advantage stores still resolve after the migration?

Answer: the design covers it, and a local test proves the mechanism. The real data
proof needs the ETL (track `primary_legacy_data_migration_20261004`, Phase 2) and runs
at rehearsal.

## Where Tutor gets and keeps Primary article IDs

| Use | Query | Source |
|---|---|---|
| Import into Tutor's catalogue | `SELECT id, title FROM article WHERE is_published = true` | `tutor-advantage/packages/database/import-primary-workbooks.ts:56-58` |
| Store | `articleId` in Tutor's own book/article table (upsert on `articleId_bookId`) | same file, lines 134-140 |
| Read a lesson | four queries by `id` / `article_id` | `tutor-advantage/services/learning-service/src/services/PrimaryAdvantageDB.ts:93-120` |
| Route to Primary | books whose `bookCode` starts with "Primary " | `ReadingAdvantageDB.ts:282-290` |

The stored IDs are legacy cuids (text). The import query is a fifth query that the
Lane A spec FR-5 does not list. The Tutor read test must include it.

## How the migration keeps them valid

- Migration spec D2: `primary_legacy_id_map (table_name, legacy_id, new_id)`. The ETL
  writes one row for each remapped article and question (spec §6).
- Migration spec D4: schema `tutor_compat` has four views with the legacy table names.
  Each view exposes `coalesce(map.legacy_id, new.id::text)` as `id` / `article_id`.
  Built in the migration track: `cbc839b6a` (table), `c7cf1bfb5` (views), `e90202faf`
  (sentinels).
- Tutor switches with no code change: `DATABASE_URL_PRIMARY_ADVANTAGE` with
  `options=-c search_path=tutor_compat` (spec D4, runbook step 6).

Result for each ID kind:

| Article kind | ID Tutor holds | Resolves through the view? |
|---|---|---|
| Migrated legacy article | cuid | Yes: the map row gives the cuid back as `id`. |
| Article created after cutover | none until Tutor re-imports | Yes: no map row, so `id` is the uuid as text. A re-import stores the uuid. |
| Legacy article the ETL skips | cuid | No. The reconciliation report must list every skipped article; zero skips for articles in Tutor's catalogue is a go/no-go item. |

## Evidence

- Column names and pg types of all four Tutor queries are identical between the new
  views (local `primary_advantage`, migrations 0060-0061) and the restored April legacy
  copy (`primary_legacy_20260429`). Zero differences. (Migration track Phase 1 report.)
- A rolled-back transaction in the local database inserted one article with map row
  `cuidABC`, one MCQ, one SAQ and one flashcard row. Tutor's queries with `$1 = 'cuidABC'`
  returned all four, with MCQ `options` as `text[]`, `answer` derived from
  `correct_answer`, and `article_id = 'cuidABC'`.

## Open items (owner: migration track unless stated)

1. The ETL must fill `passage`/`content`, `answer`, and `is_published` (legacy columns
   were NOT NULL; the views can show NULL).
2. `articles` has two publish flags, `published` and `is_published`. Tutor filters on
   `is_published`. The ETL must set both the same way.
3. Tutor filters on a computed `coalesce(...)` value, so Postgres cannot use the map's
   primary key. At about 25k question rows this is acceptable; measure it at rehearsal.
4. Story-chapter questions (22,720 MCQ rows) have no article and show `article_id` NULL.
   Tutor never looks them up by article, so they do not affect Tutor.
5. Lane A: the Tutor read test must run all five queries (four reads plus the import
   query) against `tutor_compat`.
