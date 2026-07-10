# APK Edition Asset-Pack Contract

Primary Chibi and Secondary Epic are replaceable edition manifests over the same cartridge source. Procedural low-color assets are the foundation placeholder; final art from `pixelart-benchmark`, Gemini/Nanobanana, an internal artist, or a licensed pack enters through this boundary and never becomes a runtime dependency on the authoring tool.

## Required import output

Every semantic asset records:

- stable semantic slot and Phaser loader type;
- version and encoded format;
- source, creator, license, and optional upstream URL;
- optimized status and transfer size when applicable;
- pixel width/height for raster assets;
- named atlas/animation frames when applicable;
- local or host-resolved versioned URL.

Cartridges request slots such as `player.hero`, `enemy.basic`, `feedback.correct`, and `ui.panel`; they never embed edition file paths or branch on `primary-chibi` versus `secondary-epic`.

## Normalization pipeline

1. Review the source image and license; reject uncertain provenance.
2. Crop transparent padding and normalize scale, anchor, and silhouette readability.
3. Export lossless source masters, then web-optimized PNG/WebP/AVIF or atlas output as appropriate.
4. Pack animation frames with stable names and verify no clipped bounds or frame-size drift.
5. Record dimensions, frames, byte size, format, version, and provenance in the manifest.
6. Validate every cartridge-required slot and both audience tuning ranges.
7. Run desktop and 390×844 QC for readability, contrast, collision alignment, memory, and decode failures.

## Edition guidance

- Primary Chibi: larger targets, generous collision bodies, slower pacing, lower enemy density, bright readable silhouettes, playful non-threatening feedback.
- Secondary Epic: mature fantasy silhouettes, faster pacing, denser encounters, restrained high-intensity effects, and no gore.
- Tuning may change game feel but not prompts, answer correctness, input arrays, result fields, or server authority.

## Rejection evidence

Reject an import when provenance is missing, semantic slots are ambiguous, dimensions/frames are inconsistent, transparency or compression artifacts impair play, text contrast fails, collision alignment is misleading, memory/transfer exceeds the successor track’s budget, or either edition obscures educational prompts. Record the rejected asset, reason, and replacement action in the owning game track.
