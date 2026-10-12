# Plan review: Phase 0 (design)

Phase review of `d4c6d51a1..fd2696367`. No Critical and no High finding.

## Medium

- M-1: The resync of spec D5 (look ahead 4 audio words) is too small. Real gaps are 1 to 7 words in
  58 production entries (`data-profile.md`). Phase S1 must use an anchor-based alignment, or a look-ahead of 8 or more.
- M-2: The data has no `words: []` entry, no extra audio word, and no same-count mismatch. Phase S1 must
  derive these fixtures from the 5 real files. The spec criterion "real fixtures" holds for the other shapes only.
- M-3: The acceptance pair RA-A4 uses the lesson of the acceptance track (`cmirl4sc5000ts60d7zuiqpjb`).
  That lesson may have no reading step with audio. The orchestrator must check it before the capture.

## Low

- L-1: 321 sentence entries hold more than one real sentence. The "sentence" of the read-along is one
  entry, not one real sentence. The previous and next buttons move by entry. Name this in the UI copy if the owner asks.
- L-2: The mock (scratch) shows the toolbar as a stand-in with the real `cq-toolbar` class and 4 plain labels.
- L-3: The mock has a 404 for the favicon only.
- L-4: The profile script prints with `console.log` (a CLI script, not Primary server code).

## Shortcuts and deviations

- The Workbooks-injected articles cannot be split out (no marker in the data). The profile covers all 622 articles.
- Five fixtures, not the 10 to 12 of the plan, because the data has no other shape.

## Lessons (for the orchestrator to move)

- `audio_url` and `sentences` carry audio words with the screen punctuation ("phone."). Any alignment
  must strip edge punctuation on both sides before it compares.
- A tsx script outside the app folder cannot import `postgres`. Run it from the app folder.
