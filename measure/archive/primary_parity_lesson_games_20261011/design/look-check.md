# Look check and Member Questions (Phase D)

Status: look check pending (owner, async). The owner decided on 2026-10-12 that the set runs with
no stop. Each Member Question uses the default of the spec. The owner can change a default later.

## The owner's look check

Look check pending (owner, async). Captures: see `captures.md`. Check these points:
1. Task 10 and task 12 look like a place of the arena, and each cartridge is an object.
2. The last result and the "Simple game" choice are easy to see at 375 px.
3. The locked state gives a clear reason, and the four activities stay open in task 12.
4. The projector panel is readable at 1280 px and 1920 px.

## Member Questions

| # | Question | Default used | Status |
| --- | --- | --- | --- |
| 1 | XP of a lesson game | The game rule for each run (at most 10 XP) | look check pending (owner, async) |
| 2 | The cartridge lists | Task 10: `rpg-battle`, `rune-match`, `dragon-rider`, `enchanted-library`. Task 12: `castle-defense`, `potion-rush` | look check pending (owner, async) |
| 3 | Teacher-led mode | A demo on the projector that saves nothing. No class challenge button | look check pending (owner, async) |

## Design decisions (source: Forge session, 2026-10-12)

1. Gate each game with `missingFor(manifest, input)` of the 3D kit contracts. With 0 items of its kind
   a game ends at once with a result and no play. Minimums: `rune-match` 6 words; `rpg-battle`,
   `dragon-rider`, `enchanted-library`, `hero-vs-zombie` 4 words; `castle-defense`, `potion-rush` 3 sentences.
   The locked state of the mocks shows "not enough words or sentences in this lesson".
2. `castle-defense` and `potion-rush` are sentence games. They read `input.sentences` only. They stay in task 12.
3. Below the minimum the games still run but are easier. Runs are short (6 to 9 s at bot pace).
4. Each sentence needs its `words` array. Phase S1 builds the input with `parsePracticeInput`.
5. Names: Tutor `wizard-vs-zombie` = Forge `hero-vs-zombie`; Tutor `labyrinth-goblin-king` = Forge `labyrinth`.
   Tutor plays `dragon-flight`, `wizard-vs-zombie`, `enchanted-library`, `rune-match`, `castle-defense`,
   `potion-rush`. `rpg-battle` and `dragon-rider` are not in the Tutor list.
6. No Forge sync is pending (last sync Forge `52cab8be` = integration `0adca572e`).

## Lesson counts (printed books, Workbooks package files)

The class book catalogue is empty on `primary_parity_20261011` (`primary_books` has 0 rows). The counts
come from the Workbooks package files (`content/primary/<book>/*.json`, read only). Words = distinct
`glossary` terms. Sentences = distinct `audio.flashcardTimes` texts with 2 words or more (the rule of
`toFlashcardRow` and `buildPracticeInput`).

| Book | Lessons | Words (min) | Sentences (min) | Meet 6 words | Meet 4 words | Meet 3 sentences |
| --- | --- | --- | --- | --- | --- | --- |
| origins-1 | 14 | 12 | 5 | 14 | 14 | 14 |
| origins-2 | 14 | 10 | 5 | 14 | 14 | 14 |
| origins-3.1 | 14 | 10 | 4 | 14 | 14 | 14 |
| origins-3.2 | 14 | 10 | 5 | 14 | 14 | 14 |
| quest-4 | 14 | 10 | 5 | 14 | 14 | 14 |
| Total | 70 | | | 70 | 70 | 70 |

No lesson opens no cartridge. Each lesson gives the full 10 words and at least 4 sentences, so the
locked state of the cartridges is a rare case (an article that has a short or missing flashcard snapshot).
