# Plan review — primary_parity_stories_20261011

## Phase 0: Design (phase review, 2026-10-12)

Diff: documents and one mock only. No app code, no schema, no locale file changed. Checks for security, tests, JSDoc, logger, and locale keys do not apply to this phase.

Critical and High: none.

Medium:
- The mock uses Forge backdrops as book covers. The real covers come from `images/story/<legacy cuid>.png`. The owner look check may judge cover proportion (3:4) on real art. Check it in the S2 captures.
- Spec D7 names props `{ sentences, passage, audioUrl, translations }` for the read-along component. The built component has other props (`position`, `active`, `onTranslate`, `renderBlockMedia`, and more). The host owns the audio and the player. S4 must use the built props. Spec D7 and plan S4 need this correction.
- The mock player is the read-along mock player. The read-along track S2 builds the real one. S4 must reuse it.

Low:
- Spec says the level window is raLevel +/- 1. The legacy copy has levels 1 to 15 with gaps (no level 7). A student of level 7 sees levels 6 to 8. A student of level 1 sees levels 1 to 2. Fine, but the list can be short at the high levels (13 to 15 have 1 to 3 stories).
- The acceptance pair ST-A1 needs a student of level 5. The orchestrator picks it when it runs the captures.
- The new map table names `stories` and `story_chapters` are a proposal. S1 sets them in `MAP_TABLES`; the pairs file must match.

Shortcuts: none. Deviations: none. Lessons: Graph condition (NULL `article_id` for chapter rows) is in `behavior-contract.md` section 7 and in the spec, so S1 cannot miss it.

## Phase S1: ETL for stories (phase review, 2026-10-12)

Diff: migration 0072, schema (`stories.ts`, `primary.ts`), sentinel, ETL, tests, cloudbuild files, runbook version string, inventory rows. No app code, no locale key, no route.
Checks: JSDoc on each new export (yes); no `console` in new code (the ETL uses the report); Zod and TenantDB do not apply (offline ETL); `tsc` of the app is clean; db tests 26 of 26 pass.

Critical and High: none.

Medium:
- Git history: helper C2 amended a commit in the shared worktree. The ETL commit (first `feat(db)` sha 59fea6ec1) now sits in `bce9093f1` under a lesson games header, and `d273c8dbd` carries the `feat(db)` header but holds only the inventory change. The orchestrator rewords them after the phase. Resolved 2026-10-12 by the orchestrator: the range after d735c641c was rebuilt with the same trees and corrected messages (git commit-tree). New shas: projector panel d3c9f367e, guide steps 59c2e8a27 (header 99 characters), stories ETL 0426ed75e (C1's original message), inventory rows ac76ad031 (docs(stories)), stories S1 record 81d4db30b. The git notes were copied.
- Migration 0072 has no drizzle snapshot (`meta/0072_snapshot.json`), as the hand-written migrations 0060 to 0069 have none. The next `drizzle-kit generate` diffs against the 0071 snapshot and can re-emit these columns. Lane A (0073) must not run `generate` without checking.
- The 11 chapter MCQ rows whose answer is not among the options are skipped (the article rule); no owner fix exists for them. A chapter then shows 9 or 10 MCQ instead of 10. S5 must pick 5 of what exists.
- The `chapters.words` column stays empty. The word list of a chapter comes from the chapter row of `sentencs_and_words_for_flashcard` (S4).
- The Cloud Build rehearsal is not run (`etl-cloud-step.md`).
- The 5 legacy chapter flashcard cards load as 0 because their decks belong to users who do not move.
- `measure/doctor.sh` reports `A13 stale archived directories` for `agents_md_audit_science_advantage_20260603`. This is not from this track.

Low:
- `QUESTION_ORDER_SQL` now partitions by `coalesce(article_id, story_chapter_id)`; the existing order test got a `story_chapter_id` column.

Shortcuts: none. Lessons: a nullable owner column needs a check constraint that keeps one owner (added). A shared worktree and `git commit --amend` by another helper can change the sha of a commit.

## Phase S2: Stories tab in Read (phase review, 2026-10-12)

Diff: `listPrimaryStories` and its Zod contracts (`packages/domain/src/stories`), the `./stories` export, `getStoryImageKey` and `getStoryImageUrl`, the tab sign, the shelf, the filters, the page, `loading.tsx`, `error.tsx`, and the `Stories` copy in five locale files.
Checks: domain test 15 of 15; app tests in `read/` and `storage-config` 33 of 33; app `tsc` clean; eslint on the changed files has 0 errors; JSDoc on each export; no `console` in new code; key parity (same 24 keys in en, th, cn, tw, vi); Zod parse on input and output; `assertCan("story:list")`; `stories` is a global table, read through `unscoped` with a reason.

Critical and High: none.

Medium:
- The th, cn, tw, and vi `Stories` keys hold English text. No approved translation exists. A translator must fill them before the cutover.
- Each book links to `/student/read/stories/<id>`. That page comes in S3. Until S3 lands, a tap gives a 404. Do not merge S2 alone to master.
- The genre signs show the legacy names, for example "Children's Sci-Fi". Phase 0 mock cut the prefix "Children's ". The look check can decide.
- The student window uses `user.level` as the RA level. Staff in preview see every published story with no window text, as the spec says.
- The page turn counts the pages from the total. The page query has no cap check: a page above the last gives the empty state.
- The shelf planks cover only the cells of a partial last row. The look check can judge this.
- The unit test for `listPrimaryStories` checks the condition list with a mock; no real Postgres test of the ILIKE escape.
- Pre-existing, not from this track: `components/__tests__/component-deduplication-behavior.test.tsx` and `loading-state-flow.behavior.test.tsx` fail to load because `packages/sales-knowledge/dist/data/evidence/release-candidate.json` is missing.

Low:
- `listStories` (old query) still ignores `genre`. Nothing calls it.
- The cover picture of a story with no bucket file shows the book icon (client `onError`).
- The harness used gcloud read-only copies of 8 cover PNG files (scratch folder, not in the repository).

Shortcuts: none. Deviations: the plan names `components/stories/story-filters.tsx` as a client component; it is a server component (plain GET form), so the filters need no script. Lessons: the mock DB has no `selectDistinct`; use `groupBy`.

## Phase S7 review (helper C2)

Review of `git diff bcd1ef419^..HEAD` for the S7 files: no Critical or High finding. `assertCan("story:read")` runs before the lookup. The lookup runs through the TenantDB and the map table (EXEMPT). Zod covers the input and output. The logger rule does not apply (no error path logs).

Medium:
- The redirect page sends a signed-out visitor to sign in without a return path. The article page does the same.
- The redirect goes to `/student/read/stories/<uuid>/<n>` with no check that the chapter exists. The S4 page shows the not-found state.
- Pre-existing, not from this track: `measure/doctor.sh` fails A13 (stale archived directory `agents_md_audit_science_advantage_20260603`).

Low:
- `resolveLegacyChapter` accepts 1 to 6 digits only.
- The tests use mocks. The local copy `primary_parity_20261011` has 0 story rows in `primary_legacy_id_map` (made before S1). A real-id check needs the ETL run of rehearsal 3.

Shortcuts: none. Deviation: `resolveLegacyChapter` does no map lookup (the legacy chapter URL carries the number). Lessons: none.
