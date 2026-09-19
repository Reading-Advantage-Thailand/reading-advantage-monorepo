# Batch 8 review

Approval is pending for three seasonal forest sheets. The batch contains 306 new cuts and 192 exact reuses.

- S01–S166: spring forest. All 166 cuts are new.
- U01–U166: summer forest. The sheet contains 73 new cuts and 93 reuses.
- A01–A166: autumn forest. The sheet contains 67 new cuts and 99 reuses.

Each sheet includes complete trees, hollow logs, root pieces, plants, signs, fences, and terrain patches. Plant and mushroom sequences contain four frames each.

Each sign has a separate 16×16 box. Leaf clumps above the terrain patches have separate boxes.

Coverage checks found no omitted artwork. All boxes are nonempty and within their source sheets. Pixel comparisons identify every reuse.

Process these sheets in S, U, A order. Save new cuts under `top-down/native/farming-game-world/processed/<slug>/`.

Entries with `reuseProposal` reference another proposed cut in this batch. Skip their crops and preserve the references.

Preview: `packages/advantage-play-kit/assets/review/mixed-sheets-batch-08.html`.

## Remaining work

The current top-down queue contains 84 native sheets, including these three sheets and the unfinished house sheet. Some sheets can remain intact.

The count covers the farming, fantasy-dreamland, and rogue families. It excludes the two processed cellar copies. Other asset families need a separate inventory.

Queue: `remaining-native-sheets.json`.

The owner approved this batch. All 306 cuts are saved. Pixel checks and both library tests passed.
