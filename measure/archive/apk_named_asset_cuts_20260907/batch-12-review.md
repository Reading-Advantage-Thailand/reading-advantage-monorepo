# Batch 12 review

The owner approved this batch. It contains 696 new cuts and 189 exact reuses across six sheets.

- C: Cavern update, two new cuts.
- F: Farming ground, 133 new cuts and 43 reuses.
- W: Remastered water animations, 55 new cuts and four reuses.
- H: Hell terrain and objects, 119 new cuts and 60 reuses.
- S: Sanctuary, 99 new cuts and 31 reuses.
- K: Crypt, 288 new cuts and 51 reuses.

The preview preserves water, lava, flame, portal, rune, and crypt animation sequences.
The crypt sequences use four vertically arranged source frames. The cropper joins these frames into horizontal strips.
H02 clears a small corner that belongs to the adjacent cave. The source image remains unchanged.
Sanctuary basins use separate upper and lower cuts. Stair assemblies include their supports.

All boxes passed source bounds checks. The proposals cover every visible pixel except the red water guides.
Direct pixel comparisons confirm all reuses. The preview script passed its syntax check.
Temporary cropper checks confirmed corner clearing, preserved RGBA pixels, ordinary cuts, animation frames, and invalid rectangle rejection.
The browser displayed the preview and the cleared H02 corner.

The preview is `packages/advantage-play-kit/assets/review/mixed-sheets-batch-12.html`.
All 696 approved crops are exported. Exact pixel checks and both library tests passed.
The receipt contains 50,014 assets. The native queue contains 57 sheets.
