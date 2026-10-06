# Spec — Primary Objective Tags (T1 of the Primary Mastery Graph Program)

Track ID: `primary_objective_tags_20261006`
Type: feature
Program: [primary-mastery-graph-program](../../primary-mastery-graph-program.md) (track T1)
Branch: `primary/lane-h-objective-tags` (worktree `~/Desktop/rama-worktrees/lane-h`), off
`primary/lane-f-reedy-preview`.
Owner decisions (2026-10-06): the ten decisions in program section 8 are approved. For this
track: decision 4 (tag the printed books by script from the Workbooks export through the
legacy ids; legacy online articles stay untagged until the banks replace them), decision 6
(T1 may start now), and decision 10 (the Workbooks authors write the child-language
objective titles beside the objective keys; this track imports them when they exist).

## Context

The Mastery Advantage path for Primary is: tag the content, run shadow mode in semester 2,
adapt in May 2027. The tags exist in the Workbooks lesson packages (every one of the 5,000
bank questions carries objective short ids such as `R17.2`; every package carries
`tags.targetObjectives` and `supportingObjectives`; 222 of 250 packages carry vocabulary
node ids in `glossedNodes`). The monorepo importer keeps them only inside
`primary_book_lessons.package` (jsonb). No table links an article, a question, or a word
to a graph node, so no evidence pipeline can resolve an objective. This track adds the join.

The workbooks session (owner of `~/Desktop/Workbooks`) builds the export
`content/primary/tags.json`: one entry per package with the legacy article and question
ids when injected, the objectives as short id and GSE node id with role, the vocabulary
nodes with role, and the objectives per question. The monorepo never edits Workbooks files.

The importer (`packages/domain/src/primary-books/import.ts`) deletes and reinserts the
question rows of an article on every import, so link rows keyed by question id must be
rewritten in the same transaction or cascade with the question row.

## Functional Requirements

- FR-1 (objective key in code): A new domain module `packages/domain/src/primary-mastery/`
  holds the objective key as a versioned data file: short id, GSE node id, GSE score, skill,
  descriptor text, and optional `titleEn`, `titleTh`, `exampleEn` (decision 10), plus
  `graphRelease` for the GSE graph and the vocabulary graph. The source files are
  `~/Desktop/Workbooks/docs/content-plans/data/a0-objective-key.json` and
  `a1-objective-key.json`. A Zod contract validates the file at load. A lookup function
  resolves a short id to its node and throws on an unknown id.
- FR-2 (tags export contract): A Zod contract for the Workbooks export
  `content/primary/tags.json` (committed 2026-10-06, Workbooks `6e63a50`; validated the same
  day: 250 packages, 138 objectives in the key, 5,000 questions, vocabulary on 222 packages,
  legacy ids on the 28 printed packages). Shape:
  - header: `{ version: 1, generatedAt, source, graphs: { gse, vocabulary }, objectiveKey: Record<shortId, { nodeId, gse, skill, text }>, packages: [...] }`.
    Each graph record names the file, commit, commit date, and schema version; the contract
    reads `file`, `commit`, and `schemaVersion` as the `graphRelease` and passes the rest
    through unread.
  - package: `{ key, book, lesson, title, role: "workbook" | "bank", level, legacy: { articleId, questions: Record<packageQuestionId, cuid> } | null, articleObjectives: [{ shortId, role: "target" | "supporting" }], vocabulary: [{ word, pos, nodeId, role: "glossed" | "recycled" }], questions: [{ id, type: "mcq" | "saq" | "laq", objectives: [shortId] }] }`.
  - `word` is the node's normalized form and `pos` is the last segment of the node id. One
    word and part of speech can appear twice with two sense nodes (141 such pairs); both
    rows are kept.
  A short id missing from the header key fails validation with the package key and the id
  in the message. The contract validates the header key against the objective key in code
  (FR-1) and reports node ids that differ.
- FR-3 (tables): Three additive tables with the `primary_` prefix, classified `EXEMPT` in
  `tenant-registry.ts` like `primary_book_lessons` (content catalogue, no `schoolId`):
  - `primary_article_objectives` (`articleId` FK articles cascade, `shortId`, `nodeId`,
    `role`, `graphRelease`; unique on article, short id, role).
  - `primary_question_objectives` (`articleId`, `questionId` uuid, `questionType`
    `mcq | saq | laq`, `shortId`, `nodeId`, `graphRelease`; unique on question, type, short
    id). The question id is polymorphic, so the row has no FK to a question table; it has an
    FK to the article with cascade, and the importer deletes an article's rows before it
    rewrites the questions, so a reimport leaves no stale row.
  - `primary_article_word_nodes` (`articleId` FK cascade, `word`, `pos`, `nodeId`, `role`
    `glossed | recycled`; unique on article and node id, because one word can carry two
    sense nodes).
  Migration `0070_primary_objective_tags`, append-only; `--required-migration
  0070_primary_objective_tags` in `apps/primary-advantage/cloudbuild.yaml`. No change to the
  tables Tutor reads.
- FR-4 (importer writes the links): `importLessonPackage` writes the three link tables from
  the package's `tags` and per-question `objectives` in the same transaction as the question
  rows, after deleting the article's link rows. The package schema in
  `package-schema.ts` parses `tags` with the `TagsSchema` shape instead of `z.unknown()`. A
  package with no tags writes no link rows and the import result reports `tagged: false`.
- FR-5 (backfill from the export): A domain function `backfillPrimaryTags({ db, entries })`
  and a thin script `packages/db/scripts/backfill-primary-tags.ts` read `tags.json` and write
  the link tables for articles already in the database. The article joins through
  `primary_legacy_id_map` (`articles`) or the package key in `primary_book_lessons`. A
  question joins through `primary_legacy_id_map` when the map holds question ids; otherwise
  by article, type, and exact question text. The function is idempotent (upsert on the
  unique keys) and returns a report: entries matched, articles not found, questions not
  matched, with the keys. It never writes to the legacy database.
- FR-6 (coverage report): A domain function `reportPrimaryTagCoverage({ db })` returns:
  objectives in the key with no article; tagged articles per level; articles with no tags;
  questions with no objectives; words with no node; the 28 printed-book packages without
  vocabulary nodes. The script prints it as Markdown. The first run's output is saved as
  `measure/tracks/primary_objective_tags_20261006/coverage.md`.
- FR-7 (read functions for later tracks): `getArticleObjectives(articleId)`,
  `getQuestionObjectives(questionIds)`, `getArticleWordNodes(articleId)` in the new module,
  returning node ids with short ids. These are the only read path T2 uses.

## Non-Functional Requirements

- Schema is additive only. The Tutor read test (`primary_cutover_blockers_20261003` FR-5)
  stays green.
- Business logic lives in `packages/domain`; the script and the route stay thin.
- Unit tests mock the database (`packages/domain/src/__tests__/mock-db.ts`). No real
  Postgres in unit tests.
- Every exported function has a JSDoc comment.
- One heavy job on the machine at a time (type check, build, or test run; not in parallel
  with the Forge build).
- No legacy database change. The legacy injector is not touched.

## Acceptance Criteria

- A package imported with tags produces link rows for its article, its 20 questions, and
  its glossary words; a reimport of the same package leaves one row per link.
- The backfill of a `tags.json` fixture against a mocked database with legacy ids matched
  writes the links and reports zero unmatched; a fixture with an unknown article reports it
  by key and writes nothing for it.
- The coverage report lists the objectives of the key that no article targets.
- `pnpm turbo run test --filter=@reading-advantage/domain --filter=@reading-advantage/db`,
  `check-types`, and `lint` exit 0. `tenant-coverage.test.ts` passes with the three new
  tables.
- Migration 0070 applies on the local database; the doctor check passes with the new
  required migration.

## Out of Scope

- Evidence recording, knowledge state, recommendations, and views (T2 to T5).
- A lemma matcher. Workbooks tagged the 28 printed-book packages on 2026-10-06
  (`566734d`); 13 glossed words have no node in the vocabulary graph and stay personal
  cards. The coverage report (FR-6) lists words without a node and words whose node has a
  different part of speech from the glossary (one case: `pets` verb to `pet.noun`).
- Tagging legacy online articles that have no package.
- Any change to Workbooks files or to the legacy database.
- Reading Advantage.
