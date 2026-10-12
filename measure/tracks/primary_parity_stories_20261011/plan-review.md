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
