# Specification: Video Pipeline Structural Fixes

## Overview
Fix the structural bugs in `scripts/generate-blog-video.ts` that cause recurring issues: Thai text bleeding in intro/outro, audio/video length mismatches, jingle mixing truncation, and unreliable output. The goal is a pipeline that works consistently every day without manual intervention.

## Root Causes (from retrospective)
1. **Thai text bleeds** — ffmpeg fallback paths in `renderIntroClip`/`renderOutroClip` use `drawtext` with raw text that isn't wrapped. The `wrapText` function exists but isn't used in the fallback drawtext calls.
2. **Audio/video mismatch** — Sync logic only extends video when it's shorter than audio. Does nothing when video > audio (the common case: intro + outro + 0.5s buffer = video always longer than narration).
3. **Jingle mixing truncates** — `mixBackgroundMusic` uses `amix=duration=first` on a video where the audio stream is shorter than the container. `amix` gets confused and produces truncated output (~36s instead of ~48s).
4. **Image prompts produce text** — The `imageDescription` prompt doesn't strongly enough enforce "no text" for all languages.

## Functional Requirements

### 1. Intro/Outro Text Wrapping
- The ffmpeg fallback paths MUST use `wrapText()` to wrap Thai text before writing to the textfile.
- Font size MUST be dynamic based on text length (already implemented via `calculateIntroFontSize`).
- The `drawtext` filter MUST use the wrapped text from the textfile.

### 2. Audio/Video Length Synchronization
- After concatenating clips and muxing narration, the pipeline MUST check if video duration > audio duration.
- If video is longer: trim video to match audio (don't pad audio with silence — it's wasteful and produces dead air).
- If audio is longer: extend video by cloning the last frame (existing behavior, already works).
- Final check: video and audio durations must differ by ≤0.5s.

### 3. Jingle Mixing
- The jingle MUST be mixed at 10% volume (already correct).
- The mixing step MUST NOT use `amix=duration=first` when inputs have different durations.
- Instead: extract audio from video, pad to match video duration, mix with jingle of same duration, then replace audio in video.
- OR: use a two-pass approach where jingle is looped to video duration first, then mixed.

### 4. Image Generation
- Image prompts MUST include explicit anti-text instructions in both English and Thai context.
- The `imageDescription` field in segments.json MUST NOT contain words like "chart", "graph", "diagram", "text", "sign", "label".
- Pipeline should validate that image prompts are scene descriptions (locations, people, activities), not abstract concepts.

### 5. Output Verification
- After rendering, the pipeline MUST verify:
  - Video duration matches audio duration (±0.5s)
  - Audio stream exists and is not truncated
  - Resolution is 1080×1920
  - File size is reasonable (>100KB for >10s video)

## Acceptance Criteria
- [ ] Thai blog post renders without text bleeding in intro/outro
- [ ] Video and audio durations match within 0.5s
- [ ] Jingle plays at ~10% volume for the full video duration
- [ ] Background images contain no visible text, charts, or graphs
- [ ] Pipeline produces consistent output across multiple runs
- [ ] No manual intervention required between starting and completing

## Non-Functional Requirements
- Pipeline must complete in under 10 minutes for 5 segments
- Output must be valid MP4 with H.264 video and AAC audio
- Must work with both Thai and English blog posts

## Out of Scope
- Revideo scene rendering (intro/outro already fall back to ffmpeg)
- Script generation (mmx text chat for segments)
- New visual effects or transitions
