# Design decisions (Phase 0)

Owner decision of 2026-10-12: the set runs with no stop. Each default below stands until the owner changes it.
Each item is: look check pending (owner, async).

| # | Decision | Default used | Status |
| --- | --- | --- | --- |
| 1 | D4: MC XP once for each chapter | MC pays 2 XP for each correct answer of 5, once for each chapter. A retake gives new questions and a new score, but no second XP. SA and LA take one submit for each chapter. | look check pending (owner, async) |
| 2 | D9: level window on every story page | Students see published stories with raLevel +/- 1 on the list, the story page, and the chapter page. Staff in preview see every published story. | look check pending (owner, async) |
| 3 | Member Question: no stop | The set runs to the end. The spec defaults stand. | look check pending (owner, async) |
| 4 | Read tab sign | A sign row "Articles \| Stories" (`cq-signs` with `Sign small`, 48 px tall) above the Read content. The selected sign has the gold ring. The toolbar keeps four tabs. | look check pending (owner, async) |
| 5 | Story shelf | `library` place. Books stand on wood planks: 2 on a row at 375 px, 4 on a row at 1280 px. Each book has the cover, the level badge, the title (2 lines), and the genre. | look check pending (owner, async) |
| 6 | Genre filter | Genre signs sit in one horizontal scroll row (not a wrapped list) so that the books show on the first screen of a phone. The search box is above the row. | look check pending (owner, async) |
| 7 | Page turn | "Back", "Page N of M", and "Turn the page" under the last shelf. 10 stories for each page, as in legacy. No endless scroll. | look check pending (owner, async) |
| 8 | Story page | A parchment panel with the cover, badges (level, CEFR, genre, chapter count), the translated summary, and a gold "Start chapter N" button (the first chapter that the student did not finish). Signs "Chapters" and "Characters" below. | look check pending (owner, async) |
| 9 | Chapter list | One 56 px row for each chapter: number, title, a green "Done" mark when the student finished it. | look check pending (owner, async) |
| 10 | Chapter page | The reading rule applies: a desk card, plain text column, no decoration in the text. It uses `ReadAlongPassage` and `useReadAlong` of the read-along track. The word list and the questions panel sit in the side column at 1280 px and below the text at 375 px. | look check pending (owner, async) |
| 11 | Translation | Four signs (th, cn, tw, vi) above the text. The translation of the current sentence shows in a dashed blue box below the text. | look check pending (owner, async) |
| 12 | Previous and next | A "Chapter N-1" button and a "Next chapter" button under the text. The last chapter has no "Next chapter". | look check pending (owner, async) |
| 13 | Question panels | One parchment panel at a time on a page after the chapter: signs for the three types, with a check on the done types. MCQ shows one question at a time. | look check pending (owner, async) |
| 14 | LAQ rule | The counter shows "N of at least level x 30 characters" and "Feedback tries left: N" (2 at most). A short answer shows "Write a longer answer to get feedback." | look check pending (owner, async) |

## Checks of the mock

- No horizontal overflow at 375 px or 1280 px (day and night, 10 screens).
- Each button, link, tab sign, and input is 48 px tall or more. Exception: the sign labels that only label a panel are not controls.
- The mock runs in one headless Chrome with `img.decode()` before each shot.

## Changes that the data forces

- The 412 legacy stories have a cover picture only through `image` (the legacy cuid). The mock uses Forge backdrops as covers. The real page uses `getStoryImageUrl`.
