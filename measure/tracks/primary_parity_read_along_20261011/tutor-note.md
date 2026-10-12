# Note for the Tutor session: the read-along alignment

Date: 2026-10-12. Track: `primary_parity_read_along_20261011`. No Tutor peer session was active, so this
note waits for delivery (orchestrator or owner step).

## What changed in the monorepo

The Primary app has a new alignment module. It replaces the alignment that the Tutor app copied from the legacy Primary app.

| Item | Path |
| --- | --- |
| New alignment (display words to audio words) | `apps/primary-advantage/lib/read-along/align.ts` |
| New position finder (time to sentence and word) | `apps/primary-advantage/lib/read-along/position.ts` |
| Tests and 5 real fixtures | `apps/primary-advantage/lib/read-along/__tests__/` |
| Data profile (622 production articles) | `measure/tracks/primary_parity_read_along_20261011/data-profile.md` |

## What it replaces in the Tutor copy

`buildPrimaryWordMap` in `tutor-advantage` `ArticleDisplay.tsx` is a copy of the legacy Primary function
`components/articles/article-content.tsx:115-207`. The copy has these faults:

1. It uses one forward cursor. After a dropped audio word, every later word maps to the wrong word.
   The new `buildWordMaps(displayWords, audioWords)` finds the nearest matching anchor (up to 9 positions on each side) and resyncs.
2. It splits words on straight quotes only. A curly quote joins two words. The new `splitDisplayWords` and `tokenizeWords` handle curly quotes.
3. It does not strip edge punctuation on both sides before it compares. The new code does.

## Request

Replace the body of `buildPrimaryWordMap` with a call to `buildWordMaps` (or copy `align.ts`, which has no
dependency except `zod`). Keep the tests of the five fixtures. No change of the Tutor data is needed.
