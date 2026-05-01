# Specification: Blog-to-Video Generation Pipeline (Rev 2)

## Overview
Build an automated pipeline that transforms Reading Advantage blog posts into TikTok-style 9:16 engagement videos (60–90 seconds). The pipeline uses MiniMax (`mmx` CLI) for generative assets and **ffmpeg** for reliable video composition.

## Key Design Decisions

- **Per-segment generation:** Each video segment is generated independently (text, image description, TTS audio, background image) to guarantee alignment.
- **No text on images:** Background images are pure visuals. All text is rendered as subtitles/captions during the ffmpeg composition step.
- **ffmpeg-based composition:** Replaces Revideo for stability. Each segment is a still image + subtitle overlay + TTS audio, stitched sequentially.
- **Background music:** A soft jingle loops underneath the entire video at ~15% volume.

## Functional Requirements

### Video Structure
- **Title card (3s):** Reading Advantage logo on branded background with blog title text overlay.
- **Content segments (variable):** 5–7 segments, each showing:
  - A full-screen background image (9:16, generated per segment).
  - Large subtitle text overlay with the segment's narration text.
  - The segment's TTS audio.
- **CTA card (3s):** Branded screen prompting viewers to read the full blog with text overlay.
- **Background music:** Soft jingle plays at ~15% volume for the full duration.

### Segment JSON Schema
The AI script generator must output an array of segments in this exact format:

```json
[
  {
    "text": "The narration text for this segment, 1-2 sentences max.",
    "imageDescription": "A detailed, text-free visual description for the background image. Must NOT contain any text, words, or letters."
  }
]
```

### Input
- A blog markdown file path (e.g. `src/app/[locale]/(marketing)/blog/posts/th/beyond-the-backpacker.md`).

### Output
- A 9:16 MP4 video file saved to `public/videos/<slug>.mp4`.

### Pipeline Steps
1. **Parse:** Extract title, excerpt, cover image, and body content from markdown frontmatter.
2. **Script Generation:** Use `mmx text chat` to generate a JSON array of segments (text + imageDescription).
3. **Per-Segment Asset Generation:** For each segment:
   - Generate TTS audio (`mmx speech synthesize`) from the segment's `text`.
   - Generate background image (`mmx image generate`, 9:16) from the segment's `imageDescription`.
4. **Title/CTA Card Generation:** Create static 1080×1920 JPG frames for title and CTA cards using ffmpeg.
5. **Video Composition:** Use ffmpeg to:
   - Concatenate title card → content segments → CTA card.
   - Overlay subtitle text on each segment.
   - Mix all segment audio tracks sequentially.
   - Mix background jingle at 15% volume.
   - Output final 1080×1920 H.264 + AAC MP4.

## Non-Functional Requirements
- **Aspect Ratio:** 9:16 (1080×1920) for TikTok/Reels/Shorts.
- **Duration:** 60–90 seconds target.
- **Language Support:** Must work with Thai and English blog posts.
- **Image Constraint:** All generated images must be text-free. Prompts must explicitly request "no text, no words, no letters."
- **Audio:** No audio cutoffs. Each segment's video duration must be ≥ its audio duration + 0.5s buffer.

## Acceptance Criteria
- [ ] Running `npx tsx scripts/generate-blog-video.ts <blog.md>` produces a valid MP4.
- [ ] Background images contain no visible text.
- [ ] Subtitle text matches the narration audio exactly.
- [ ] Each segment's image is visually related to its narration content.
- [ ] Audio does not cut off at the end of any segment or the final video.
- [ ] Background jingle plays softly underneath the entire video.
- [ ] Thai blog posts produce intelligible Thai TTS audio.
