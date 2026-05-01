# Specification: Phase 2 Marketing Blog Generation (Days 31-60)

## Overview
Generate 30 bilingual (English and Thai) blog posts and associated assets for Phase 2 of the Marketing Blog Generation campaign (Days 31-60) using the MiniMax (mmx) CLI tool.

## Functional Requirements
- **Content Generation:** Generate 30 blog posts in both English (`en`) and Thai (`th`) using the `mmx` CLI tool (`create-text-mmx` skill).
- **Image Generation:** Generate a relevant hero/cover image for each of the 30 blog posts using the `mmx` CLI tool (`create-image-mmx` skill).
- **Format:** Posts must be saved as Markdown files (`.md`) matching the existing format, including YAML frontmatter.
- **File Location:** 
  - English posts: `src/app/[locale]/(marketing)/blog/posts/en/`
  - Thai posts: `src/app/[locale]/(marketing)/blog/posts/th/`
  - Images: `public/blog/`
  - Video segments JSON: `src/app/[locale]/(marketing)/blog/posts/th/<slug>-segments.json`
  - Videos: `public/videos/day<NN>-<slug>-th.mp4`

## Video Pipeline

Each day's Thai blog post gets a TikTok-style vertical video (1080x1920, ~1 min). The pipeline (`scripts/generate-blog-video.ts`) requires a segments JSON file placed **next to the Thai blog post**, named `<basename>-segments.json` (auto-discovered).

**Segments JSON format:**
```json
[
  {"text": "Thai narration sentence (max 150 chars)", "imageDescription": "Clean scene description in English — NO mention of text, words, letters, charts, graphs, signs, labels, screens, books"},
  ...
]
```

**Rules:**
- 8-10 segments per video
- `text`: Short Thai narration (max 150 chars) summarizing one key point
- `imageDescription`: Vivid, photorealistic scene description. Must NOT contain any prohibited terms (text, words, letters, charts, graphs, diagrams, signs, labels, screens, books with visible text). Describe people, places, nature, objects only.
- The pipeline auto-discovers the JSON — no `--segments` flag needed
- The pipeline **fails loudly** if segments JSON is missing — no garbage fallback

## Non-Functional Requirements
- Maintain the established brand voice and formatting conventions used in Days 1-30.

## Acceptance Criteria
- [ ] 30 `.md` files exist in the `en` blog posts directory.
- [ ] 30 `.md` files exist in the `th` blog posts directory.
- [ ] 30 corresponding image files exist in the `public/blog/` directory.
- [ ] 30 video segment JSON files exist in the `th` blog posts directory.
- [ ] 30 `.mp4` video files exist in the `public/videos/` directory.

## Out of Scope
- Addressing the 'Blog section lacks pagination' tech debt (already planned as a separate track).