# Design decisions (Phase 0)

Owner decision of 2026-10-12: the set runs with no stop. Each default below stands until the owner changes it.
Each item is: look check pending (owner, async).

| # | Decision | Default used | Status |
| --- | --- | --- | --- |
| 1 | Speed list (spec D3 member question) | 0.75×, 1×, 1.25×. A tap on the speed sign goes to the next speed. The owner may ask for 0.5× and 1.5×. | look check pending (owner, async) |
| 2 | The player on a phone | A bar at the bottom, above the toolbar (`bottom-(--bottom-nav-h)`). It has 5 controls in one row: previous, replay, play or pause (56 px, gold), next, speed. | look check pending (owner, async) |
| 3 | The player on a desktop | The same panel, sticky at the bottom of the reading card (`lg:sticky lg:bottom-4`). | look check pending (owner, async) |
| 4 | The current sentence and word | The sentence uses `HIGHLIGHT_CLASSES.playingSentence` (amber band). The word uses `HIGHLIGHT_CLASSES.currentWord` (blue). The hover uses `hoverWord` (green). The mark stays on the last word when the audio pauses. | look check pending (owner, async) |
| 5 | The tap-to-play sign | One hint line (dashed amber box) shows above the text while read-along is on: "Tap a word to hear it from there. Tap a line to hear the whole sentence." Words get the green hover. No dotted mark on each word (the text column has no decoration). | look check pending (owner, async) |
| 6 | The keyboard | Each sentence is one tab stop with a 3 px blue outline. Words are not tab stops. | look check pending (owner, async) |
| 7 | No timings (spec D7) | A sentence with `words: []` shows the band only. | look check pending (owner, async) |
| 8 | The follow scroll | The current sentence stays at about 30% of the viewport height. A scroll by hand stops the follow until the next play. | look check pending (owner, async) |
| 9 | The Close button | The existing "Listen and read along" button becomes "Close the audio" in iron tone while the player is open. | look check pending (owner, async) |

## Checks of the mock

- Player targets: 48 × 48 px (previous, replay, next), 56 × 56 px (play), 56 × 48 px (speed), at 375 px and 1280 px.
- No horizontal overflow at 375 px or 1280 px.
- The player has 5 buttons. They fit in one row at 375 px (343 px free).

## Changes that the data forces (not a design choice)

- The resync must bridge a gap of up to 7 audio words (see `data-profile.md`).
