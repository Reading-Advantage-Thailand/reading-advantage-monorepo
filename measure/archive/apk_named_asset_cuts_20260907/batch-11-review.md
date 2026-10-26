# Batch 11 review

The owner approved this batch. It contains 1,077 new cuts and 33 exact reuses across six sheets.

- D: Desert ground tiles, 99 new cuts.
- G: Fantasy ground tiles, 623 new cuts and 33 reuses.
- R: Remastered ground tiles, 133 new cuts.
- A: Rogue ground tiles, 132 new cuts.
- L: Dungeon lava animations, 44 new cuts.
- W: Rogue water animations, 46 new cuts.

Borders use the source tile grid. Ground patches remain complete. Corner tiles preserve their complete source pixels.
Lava strips contain four frames. Water strips contain eight frames.
The lower lava patches use a centered 32-pixel box. Separate frame boxes exclude the source spacing.

All boxes passed source bounds checks. The proposals cover every visible pixel except the red water guides.
Direct pixel comparisons confirm all reuses. The preview script passed its syntax check.
The browser displayed the preview and the lava animation frames.

The preview is `packages/advantage-play-kit/assets/review/mixed-sheets-batch-11.html`.
All 1,077 approved crops are exported. Exact pixel checks and both library tests passed.
The receipt contains 49,318 assets. The native queue contains 63 sheets.
