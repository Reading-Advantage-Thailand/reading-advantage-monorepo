# Blog-to-Video Generation Pipeline

Quick reference for this track.

## Files

- **Specification:** [spec.md](./spec.md)
- **Implementation Plan:** [plan.md](./plan.md)
- **Metadata:** [metadata.json](./metadata.json)

## Key Assets

- `revideo/project.ts` — Revideo project config (9:16, 8fps, resolutionScale 0.5)
- `revideo/scenes/blog-video.tsx` — Main video composition scene (intro + segments + CTA)
- `scripts/generate-blog-video.ts` — Full pipeline orchestration
- `scripts/test-revideo.ts` — Minimal Revideo smoke test (renders a red square)

## Commands

```bash
# Smoke-test Revideo rendering
npx tsx scripts/test-revideo.ts

# Dry-run pipeline (parse + script only, no assets or render)
npx tsx scripts/generate-blog-video.ts <blog.md> --skip-assets --skip-render

# Full pipeline
npx tsx scripts/generate-blog-video.ts <blog.md>

# Skip AI script generation, use paragraph-based segments
npx tsx scripts/generate-blog-video.ts <blog.md> --skip-script-ai

# Force ffmpeg slideshow fallback (not tested since refactor)
npx tsx scripts/generate-blog-video.ts <blog.md> --force-ffmpeg-fallback

# Preserve intermediates for debugging
npx tsx scripts/generate-blog-video.ts <blog.md> --keep-intermediates
```

## Current State (2026-04-24 handoff)

### What works

- **mmx asset generation** (script, TTS, images) — all functional
- **Revideo rendering** at 540×960 (resolutionScale 0.5) — tested up to 120s without crashes
- **EOF crash** — fixed. The `range: [0, 9999]` in project.ts + per-run temp project files work
- **Image normalization** — mmx-generated images are normalized to 1080×1920 JPG under `public/` during generation (step 3)
- **Thai text** — SRT caption wrapping with Intl.Segmenter works

### What is broken / incomplete

1. **Missing upscale step after Revideo render** — Revideo outputs 540×960 MP4. The pipeline needs to upscale to 1080×1920 via ffmpeg before final output. The upscale step existed previously but was removed during a refactor. See tech-debt.md P1 entry for the exact ffmpeg command to re-add.
2. **Narration mux** is wired but untested at full pipeline — the `muxWithNarration` call is in the render path but currently feeds the 540×960 Revideo output directly (no upscale). Result will be half-resolution.
3. **ffmpeg fallback** has NOT been tested end-to-end since its path resolution fix. It may still produce audio-only output. Decide whether to keep it.

### Changes made 2026-04-24 (this session)

- Removed the 60s auto-fallback to ffmpeg (`expectedDurationSeconds > 60` branch deleted)
- Removed redundant second image normalization that wrote to `tmp/` (causing path resolution bugs). Images now use their already-normalized paths under `public/` directly.
- Added `fs.existsSync` check in ffmpeg fallback path resolution as a safety net
- Changed `resolutionScale` back to 0.5 in project.ts and createTempProjectFile (was briefly set to 1.0 during testing — full res is too slow for 120s videos)
- Removed the old upscale step from the Revideo post-render path (needs to be re-added — see above)

### Benchmark data

Measured on this machine with 5 segments using `images/logo.jpg`:

| Config | Duration | Render Time | Output Resolution |
|--------|----------|-------------|-------------------|
| 0.5 scale, 8fps | 15s | 54s | 540×960 |
| 0.5 scale, 8fps | 60s | 105s | 540×960 |
| 0.5 scale, 8fps | 120s | 250s | 540×960 |
| 1.0 scale, 8fps | 60s | 300s | 1080×1920 |
| 1.0 scale, 8fps | 120s | >600s (timed out) | — |

### Last run intermediates (for testing without burning mmx quota)

```
public/generated/blog-videos/blog-video-1777031094587/
├── narration.mp3              (816KB, 50.9s)
├── segment-0/scene.jpg
├── segment-1/scene.jpg
├── segment-2/scene.jpg
├── segment-3/scene.jpg
├── segment-4/scene.jpg
└── segment-5/scene.jpg
```

## Blockers

- **P1:** Missing upscale step — see tech-debt.md for details and fix instructions
- **External:** MiniMax quotas (`usage limit exceeded`) can block fresh speech/image generation
