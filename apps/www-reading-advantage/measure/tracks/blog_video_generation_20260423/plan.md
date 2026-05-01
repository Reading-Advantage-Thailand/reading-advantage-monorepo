# Implementation Plan: Blog-to-Video Generation Pipeline (Rev 3 — ffmpeg-only)

## Phase 1: Pipeline Architecture & Schema Design
- [x] Task: Rewrite spec with JSON segment schema and ffmpeg-only multi-clip approach.
- [x] Task: Rewrite `scripts/generate-blog-video.ts` with per-clip ffmpeg generation (intro → segments → outro → concat → mux → jingle).
- [x] Task: Define JSON segment schema with `text` + `imageDescription` fields.
- [x] Task: Measure - User Manual Verification 'Pipeline Architecture & Schema Design' [checkpoint: 0b9f529]

## Phase 2: Asset Generation & Composition Engine
- [x] Task: Implement per-segment TTS generation (`mmx speech synthesize` per segment text).
- [x] Task: Implement per-segment image generation (`mmx image generate` per imageDescription, 9:16, "no text" prompt).
- [x] Task: Implement ffmpeg-based intro clip (logo + title text overlay).
- [x] Task: Implement ffmpeg-based segment clips (image + dark overlay + subtitle text box).
- [x] Task: Implement ffmpeg-based outro clip (brand bg + logo + CTA text).
- [x] Task: Implement ffmpeg concat demuxer for clip assembly.
- [x] Task: Fix audio cutoff: mux without `-shortest`, use two-step jingle mix.
- [x] Task: Fix text overlap in intro/outro by repositioning logo and text.
- [x] Task: Measure - User Manual Verification 'Asset Generation & Composition Engine' [checkpoint: 0b9f529]

## Phase 3: Background Music & Polish
- [x] Task: Source soft jingle for background music (`public/audio/reading-advantage-jingle.mp3`).
- [x] Task: Mix background jingle at 10% volume using pre-loop + amix approach.
- [x] Task: Verify subtitle readability with brand-colored box behind white text.
- [x] Task: Test end-to-end with Thai blog post (Day 5) — 76s video, 7 segments, outro present, no audio cutoff.
- [ ] Task: Test end-to-end with English blog post.
- [ ] Task: Measure - User Manual Verification 'Background Music & Polish' (Protocol in workflow.md)

## Phase 4: Regeneration & Documentation
- [x] Task: Regenerate Day 5 video using the new pipeline.
- [ ] Task: Add npm script shortcut (e.g. `npm run generate:video -- <blog.md>`).
- [ ] Task: Document usage in `docs/` or README.
- [x] Task: Commit all track artifacts and mark track complete.
- [ ] Task: Measure - User Manual Verification 'Regeneration & Documentation' (Protocol in workflow.md)
