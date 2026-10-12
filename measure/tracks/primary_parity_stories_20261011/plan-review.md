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
- Git history: helper C2 amended a commit in the shared worktree. The ETL commit (first `feat(db)` sha 59fea6ec1) now sits in `bce9093f1` under a lesson games header, and `d273c8dbd` carries the `feat(db)` header but holds only the inventory change. The orchestrator rewords them after the phase.
- Migration 0072 has no drizzle snapshot (`meta/0072_snapshot.json`), as the hand-written migrations 0060 to 0069 have none. The next `drizzle-kit generate` diffs against the 0071 snapshot and can re-emit these columns. Lane A (0073) must not run `generate` without checking.
- The 11 chapter MCQ rows whose answer is not among the options are skipped (the article rule); no owner fix exists for them. A chapter then shows 9 or 10 MCQ instead of 10. S5 must pick 5 of what exists.
- The `chapters.words` column stays empty. The word list of a chapter comes from the chapter row of `sentencs_and_words_for_flashcard` (S4).
- The Cloud Build rehearsal is not run (`etl-cloud-step.md`).
- The 5 legacy chapter flashcard cards load as 0 because their decks belong to users who do not move.
- `measure/doctor.sh` reports `A13 stale archived directories` for `agents_md_audit_science_advantage_20260603`. This is not from this track.

Low:
- `QUESTION_ORDER_SQL` now partitions by `coalesce(article_id, story_chapter_id)`; the existing order test got a `story_chapter_id` column.

Shortcuts: none. Lessons: a nullable owner column needs a check constraint that keeps one owner (added). A shared worktree and `git commit --amend` by another helper can change the sha of a commit.
