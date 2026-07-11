# APK Dual-Theme Asset Inventory

This inventory distinguishes the physical sprite-pack manifest from the APK's
semantic gameplay bindings. The current 40-slot registry is a consumer inventory,
not a declaration that the pack contains 40 independent still images. It remains
Red until the canonical sheets, strips, tiles, static art, and their semantic
frame/animation bindings exist for both themes.

| Pack | Edition | Current semantic consumers | Canonical physical pack | Status |
|---|---|---:|---:|---|
| Chibi Quest | Primary Chibi | 40 current slots, view taxonomy pending | Not present | In progress |
| Riven Lands | Secondary Epic | 40 current slots, view taxonomy pending | Not present | In progress |

## Existing-asset visual audit

| Source | Visual inspection | Decision |
|---|---|---|
| `pixel-art-benchmark/assets/chibi-quest/characters/knight_top.png` | A 384×384 transparent 3×3 sheet showing a detailed dark heroic knight. It does not match the Chibi Quest proportions, the required 4×8 top-down layout, or the 512×1024 contract. | Rejected; do not import. |
| `pixel-art-benchmark/public/knight_32x32_clean.png` | Downscaled 3×3 derivative with severe detail loss and the same wrong heroic art direction/layout. | Rejected; do not import. |
| `pixel-art-benchmark/public/knight_64x64_clean.png` | Alternate 3×3 heroic-knight frames with inconsistent poses relative to the source and no dual-pack counterpart. | Rejected; do not import. |
| `pixel-art-benchmark/public/knight_128x128_clean.png` | Duplicate-scale derivative of the wrong 3×3 heroic sheet. | Rejected; do not import. |
| Built-in generator contact sheet with simulated checkerboard | A collection of unrelated icon-like stills with no canonical sprite grids or animation continuity. The checkerboard was baked into RGB rather than representing alpha. | Rejected and deleted from the production path. |
| Built-in generator Chibi knight still on simulated checkerboard | One pose, not a sprite sheet; the background was baked RGB and the pose established no animation contract. | Rejected; do not import. |
| Built-in generator Chibi knight still on solid magenta | The chroma strategy is valid, but one pose is not a deliverable character asset. | Rejected as production art; retain no pack binding. |

An initial MMX probe was explicitly rejected by the product owner as an inappropriate generation path. The command was stopped, all generated files were deleted, and no MMX output may enter either production pack. Asset creation for this track uses the built-in image generator exclusively.
