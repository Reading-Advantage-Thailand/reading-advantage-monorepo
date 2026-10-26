# Data profile of the read-along timings

Read only. Date: 2026-10-12. Database copy: `primary_etl_20261007` (the migrated production data).
Script: `apps/primary-advantage/scripts/profile-read-along.ts` (pure logic in `lib/read-along/profile.ts`).
Each row of `articles.sentences` is one "sentence" entry. An entry can hold more than one real sentence.

## Counts

| Item | Count |
| --- | --- |
| Articles | 622 |
| Articles with `sentences` (all have `audio_url`) | 622 |
| Sentence entries | 19825 |
| Entries with `words: []` | 0 |
| Entries where the audio has more words than the screen (`audio-extra`) | 0 |
| Entries where the same word count hides a different word (`word-mismatch`) | 0 |
| Entries where the audio has fewer words than the screen (`audio-dropped`) | 58 (11 articles) |
| Entries with a contraction | 618 (234 articles) |
| Entries with a curly quote | 165 (25 articles) |
| Entries with a hyphenated word | 31 (26 articles) |
| Entries with a digit | 8 (6 articles) |
| Entries that hold more than one real sentence | 321 |

## What the audio-dropped entries look like

- Missing words per entry: 1 to 7 (most often 1 or 5 to 7).
- Position: 17 entries miss leading words, 23 miss trailing words, 18 miss words in the middle or elsewhere.
- Example (real data): the screen shows "The ball is a friend." and the audio words are `is a friend`.

## Findings for the next phases

1. The resync of spec D5 looks ahead up to 4 audio words. Real gaps are up to 7 words. Phase S1 must
   handle a gap of 7 or more (an anchor-based alignment), or the maps stay wrong for those 58 entries.
2. The risky shapes are the 165 curly-quote entries and the 58 dropped-word entries. Legacy splits
   on straight quotes only, so a curly quote moves the index. A contraction alone is safe: the audio
   keeps it as one word.
3. No entry has `words: []` and none has an extra audio word in production. Phase S1 builds those two
   fixtures from a real entry (remove all words, or insert one word). The design still handles both (spec D7).
4. Audio words carry the punctuation of the screen ("phone.", "friend" with no period). The alignment
   must compare words with the edge punctuation removed.
5. The data has no marker for the articles that the Workbooks injector made. Their timing quality
   cannot be split out. The numbers above cover all 622 articles.

## Fixtures

Five real entries are in `apps/primary-advantage/lib/read-along/__tests__/fixtures/`:
`audio-dropped.json`, `contraction.json`, `curly-quote.json`, `digit.json`, `hyphen.json`.
The fixtures for `words: []`, an extra audio word, and a same-count mismatch do not exist in the data.
Phase S1 derives them from these files.

## Articles for the acceptance run (legacy ids; the new ids come from `primary_legacy_id_map`)

| Shape | Legacy id |
| --- | --- |
| Clean (no dropped word, no curly quote) | `cmgqu1x6v00w2t79bzal712ko` |
| Curly quotes | `cmgqulnnp014it79bvuynoxk9` |
| Dropped audio words (the maps need the resync) | `cmorc1khs001bs601yvv09j2a` |
