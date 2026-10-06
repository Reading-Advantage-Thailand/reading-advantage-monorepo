# Plan — Primary Objective Tags (T1)

Measure TDD workflow; one commit per task with `(track_id: primary_objective_tags_20261006)`;
tests before implementation; type check and lint once per phase before the phase commit.
Branch `primary/lane-h-objective-tags` in `~/Desktop/rama-worktrees/lane-h`. Rebased twice on 2026-10-06 at the owner's request: first from lane-f onto lane-de (the lesson
importer's lane), then onto `primary-parity-integration` once the other session had merged every
lane (lane-de and lane-f included) into it. The migration is `0070` on integration, after lane-f's
`0066` to `0069`. The journal test requires contiguous indexes, so the number follows the base. Fresh worktree
setup: `pnpm install --offline --frozen-lockfile`, then build each dependency package with
`npm run build` in its folder (`pnpm -r run build` hangs).

## Phase 0: Discovery
- [x] Facts verified 2026-10-06: tags and per-question objectives in all 250 Workbooks packages; `glossedNodes` in 222; the importer keeps tags only in `primary_book_lessons.package`; the importer deletes and reinserts question rows per import; `primary_legacy_id_map` maps `articles` (question ids: to confirm with the lane-m migration track)
- [x] The workbooks session committed `content/primary/tags.json` (Workbooks `6e63a50`, 2026-10-06); validated against the agreed shape the same day; two extra fields (`title`, `role`) and the two-sense-node case recorded in spec FR-2. Legacy ids are null for the 222 new packages until Workbooks injects them (before the rehearsals, after Daniel grants database access); Workbooks re-exported on 2026-10-06 (`566734d`): all 250 packages carry vocabulary nodes; the 28 printed packages have 328 of 341 glossed words matched (53 through a dictionary form), 13 words with no node in the graph, and one wrong-part-of-speech fallback (`pets` verb to `pet.noun`) that the coverage report must list as a data issue. Legacy ids stay at 28 until the injection
- [x] Task: Confirm with the lane-m migration track whether `primary_legacy_id_map` will hold question ids at the cutover; record the answer here and pick the question join (FR-5)
  - Answer (lane-m, 2026-10-06): the id map covers articles. Question ids are not confirmed. The backfill joins questions by legacy id when the map has them, else by exact question text within the article (FR-5 fallback stays).

## Phase 1: Contract and Schema Definition
- [x] Task: Objective key data and contract (08cc9e9)
    - [x] Copy `a0-objective-key.json` and `a1-objective-key.json` into `packages/domain/src/primary-mastery/data/objective-key.json` with `graphRelease` and optional title fields (FR-1)
    - [x] Zod contract `objectiveKeySchema` and `resolveObjective(shortId)` in `contracts.ts`
- [x] Task: Tags export contract (08cc9e9, same commit)
    - [x] Zod contracts `tagsExportSchema`, `tagsEntrySchema` with the header and the unknown-short-id refinement (FR-2)
    - [x] Export the contracts from `packages/domain/src/primary-mastery/index.ts`
- [x] Task: Tables and migration (6acf04c, then rebased; the ledger file is a design note with no per-migration list, so no entry; `journal-integrity` also fails for the lane-f migrations 0068 and 0069, which have no sentinel probe: owner of that fix is lane-f)
    - [x] `packages/db/src/schema/primary-mastery.ts`: the three tables with FKs, unique indexes, and JSDoc (FR-3)
    - [x] Register the three tables `EXEMPT` in `packages/domain/src/tenant-registry.ts`
    - [x] `drizzle-kit generate` -> `0070_primary_objective_tags`; review the SQL; add it to `MIGRATION_LEDGER.md`; bump `--required-migration` in `apps/primary-advantage/cloudbuild.yaml`
    - [x] Package schema: `tags` parsed with the `TagsSchema` shape in `package-schema.ts` (FR-4)
- [ ] Task: Measure - User Manual Verification 'Phase 1: Contract and Schema Definition' (Protocol in workflow.md)

## Phase 2: Test
- [x] Task: Contract tests (08cc9e9)
    - [x] `objective-key.test.ts`: every short id in the data resolves; an unknown id throws; the data file validates
    - [x] `tags-export.test.ts`: a valid fixture parses; an unknown short id fails with the key and the id; `legacy: null` parses
- [x] Task: Importer tests (extend `primary-books/__tests__/import.test.ts`) (266d249)
    - [x] A tagged package writes article, question, and word link rows in the transaction
    - [x] A reimport deletes the article's link rows before writing; one row per link after
    - [x] A package without tags writes no link rows and reports `tagged: false`
- [x] Task: Backfill tests (`backfill.test.ts`, in-memory port) (d6ee8fd)
    - [x] Legacy ids matched: links written, report has zero unmatched
    - [x] Unknown article: reported by key, nothing written for it
    - [x] Question join by text when the id map has no question ids
    - [x] A second run writes no duplicate rows
- [x] Task: Coverage and read-function tests (d6ee8fd)
    - [x] `coverage.test.ts`: objectives with no article, articles with no tags, words with no node
    - [x] `queries.test.ts`: the three read functions return node ids with short ids
- [x] Task: Tenant coverage: `tenant-coverage.test.ts` passes with the three tables classified (d6ee8fd)
- [ ] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md)

## Phase 3: Implement
- [x] Task: Importer writes the links (FR-4) (266d249, with its tests)
    - [x] `toTagRows(pkg, articleId, questionIds)` in `primary-books/mapping.ts`
    - [x] `import.ts`: delete the article's link rows, insert the new ones in the same transaction; `tagged` in the result
- [x] Task: Backfill (FR-5) (d6ee8fd; the script lives in `packages/domain/scripts` beside the lesson importer, not in `packages/db/scripts`)
    - [x] `backfillPrimaryTags` in `primary-mastery/backfill.ts`: article join by legacy id or package key, question join by legacy id or text, upsert, report
    - [x] Thin script `packages/db/scripts/backfill-primary-tags.ts` (`--file`, `--dry-run`, prints the report)
- [x] Task: Coverage report (FR-6) (d6ee8fd; the glossary-to-node join uses a crude stem for inflected forms; follow-up: ask Workbooks for a `glossaryWord` field)
    - [x] `reportPrimaryTagCoverage` in `primary-mastery/coverage.ts` and a Markdown printer in the script (`--coverage`)
- [x] Task: Read functions (FR-7) in `primary-mastery/queries.ts` (d6ee8fd)
- [x] Task: Phase gate: type check, lint, and the domain and db test suites once; commit
  - 2026-10-06 on the integration base: domain targeted suites 109 passed; tsc and eslint clean for domain and db. The db suite has 3 failures that also fail on `primary-parity-integration` (missing 0068/0069 sentinel probes; the adversarial migration allowlist stops at 0057). Not from this track; recorded in tech-debt.
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs and Doctor
- [ ] Task: Apply migration 0070 locally; run the db doctor with the new required migration
- [ ] Task: Run the backfill against the local database with the Workbooks `tags.json` once it is committed (`--dry-run` first); save the coverage output as `coverage.md` in this track folder
- [ ] Task: Run `measure/generate.sh` and `measure/doctor.sh`; `build-graph update ./graph.db` for the new and changed files
- [ ] Task: Tutor read test green; record the result here
- [ ] Task: Update `measure/tracks.md`, this plan, `lessons-learned.md`, and `tech-debt.md` (the 28 printed packages without vocabulary nodes if Workbooks does not tag them)
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs and Doctor' (Protocol in workflow.md)
