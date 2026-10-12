# Acceptance: primary_parity_read_along_20261011

- Date: 2026-10-12 (Phase A preparation). The page captures and the audio recordings run in a batch (orchestrator).
- Legacy revision: bfea121
- New commit: pending (batch capture)
- Copies: primary_legacy_20261011, primary_parity_20261011
- Pair list: `acceptance-pairs.json` (5 pairs, AC-1 to AC-4 as STUDENT; it parses with `PairList`)
- Behavior contract: `behavior-contract.md` (section 6 uses the pair ids)
- Data check: none (no schema change, no write). The article ids are in `data-profile.md`. Use one STUDENT account.

## Batch capture (orchestrator)

For each of the 3 articles of the data profile (clean, curly quotes, dropped audio words), record a screen capture
with audio in both apps. Capture the lesson reading step of the clean article at 375 px (pair RA-A5).

| Pair | Check | Result (pass, fail, difference on purpose) | Note |
| --- | --- | --- | --- |
| RA-A1 | RA-A1-a (clean article, lit word follows the voice) | | |
| RA-A1 | RA-A1-b (tap 5 words) | | |
| RA-A1 | RA-A1-c (one player, previous, replay, next, speed) | | |
| RA-A1 | RA-A1-d (follow scroll, hint line) | | |
| RA-A2 | RA-A2-a (curly quotes) | | |
| RA-A2 | RA-A2-b (tap after a curly quote) | | |
| RA-A3 | RA-A3-a (dropped audio words, resync) | | |
| RA-A3 | RA-A3-b (pause keeps the mark; no mark in a gap) | | |
| RA-A4 | RA-A4-a (lesson reading step, highlight and tap) | | |
| RA-A4 | RA-A4-b (one player, speed sign, translation tap) | | |
| RA-A5 | RA-A5-a (player bar and lesson footer at 375 px, finding M-11) | | |

Differences on purpose (see `behavior-contract.md` section 5): one player; working previous and next; speeds
0.75x, 1x, 1.25x; one tab stop for each sentence; hint line; follow scroll in the upper third.

## Final gates

Run in the batch by the orchestrator: the Vitest files of `lib/read-along`, `components/read-along`,
`hooks/__tests__/use-read-along.test.tsx`, the article and lesson highlight tests, and `tsc --noEmit` of the app.

Owner look check (AC-5, player and highlight at 375 px and 1280 px, day and night): pending
