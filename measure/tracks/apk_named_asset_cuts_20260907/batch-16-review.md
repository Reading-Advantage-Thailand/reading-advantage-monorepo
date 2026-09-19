# Batch 16 review

The batch contains 2,166 new cuts and 363 exact reuses. The owner approved the corrected cuts.

- C: Original caves, 325 new cuts and 59 reuses.
- R: Remastered caves, 295 new cuts and 78 reuses.
- M: Abandoned mines, 396 new cuts and 105 reuses.
- I: Frozen caves, 331 new cuts and 93 reuses.
- V: Rogue cavern, 544 new cuts and 22 reuses.
- B: Beast interior, 275 new cuts and 6 reuses.

The preview contains 154 animation or state sequences.
R preserves eight-frame flames and four-frame pedestal sequences.
V preserves three palettes of four-frame flames and symbols.
B preserves four-frame organs and eight-frame panels.
Separate frames use explicit source rectangles. The cropper joins each sequence into a horizontal strip.

The preview preserves cave entrances, stairs, rocks, pillars, and props.
Source bounds, visible pixel coverage, unique names, and animation mappings passed validation.
Direct pixel comparisons confirm all exact reuses. Former rail and crate fragments now reference the complete corrected crops.
The preview passed the JavaScript syntax check.

All 2,166 approved crops are exported. Exact pixel checks and both library tests passed.
The receipt contains 56,879 rows. The native queue contains 33 sheets. Other asset families are outside this count.

Preview: `packages/advantage-play-kit/assets/review/mixed-sheets-batch-16.html`.

## Owner corrections

C113/C125 and C118/C130 now contain separate 16-pixel wall tiles. The source view preserves their construction context.
C159 contains four rail pieces. R25 contains three pieces, and R26 contains two pieces.
M25 moves eight pixels right to include both rails.
M44/M45 and I55/I56 compare off/on lamp states.
V102 includes the upper crate. The matching V100 uses the same height.
Split pieces retain their review IDs with letter suffixes.
Bounds, source coverage, unique IDs, frame mappings, exact reuses, and preview syntax checks passed.
The corrected-only preview uses `?changes=1`. All approved batch 16 crops are exported.
Use the current JSON for cropping. The original batch 16 builder predates these corrections.
