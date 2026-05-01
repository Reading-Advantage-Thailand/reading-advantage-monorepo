# Specification: 30-Day Marketing Blog Posts Generation

## Overview
This track focuses on generating all 30 blog posts outlined in the `measure/marketing_plan_30_days.md` campaign. The posts will be localized into both English and Thai, and will include generated images. The generation process will utilize the `mmx` CLI tool, specifically leveraging the `create-image-mmx` and `create-text-mmx` skills.

## Functional Requirements
- **Content Generation:** Generate 30 blog posts in both English (`en`) and Thai (`th`) using the `mmx` CLI tool (`create-text-mmx` skill).
- **Image Generation:** Generate a relevant hero/cover image for each of the 30 blog posts using the `mmx` CLI tool (`create-image-mmx` skill).
- **Format:** Posts must be saved as Markdown files (`.md`) matching the existing format, including YAML frontmatter:
  - `title`: The localized title.
  - `date`: Publish date.
  - `excerpt`: A short summary of the post.
  - `coverImage`: Path to the generated image (e.g., `/blog/slug.webp`).
  - `author`: "Reading Advantage Marketing Team" (or similar).
  - `tags`: Relevant tags.
  - `readingTime`: Estimated reading time.
  - `product`: Absolute path to the relevant product/service page (e.g., `/products/math-advantage`). Must match the Advantage Page column in `measure/marketing_plan_30_days.md`.
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
- **Text Tone:** Professional & Accessible, Marketing & Persuasive.
- **Word Count:** Approximately 800-1000 words per post.
- **Image Style:** Educational Illustration or Photorealistic style, strictly adhering to a 16:9 aspect ratio.
- **Localization:** High-quality, natural-sounding Thai translation that captures the intended marketing tone.

## Acceptance Criteria
- [ ] 30 `.md` files exist in the `en` blog posts directory.
- [ ] 30 `.md` files exist in the `th` blog posts directory.
- [ ] 30 corresponding image files exist in the `public/blog/` directory.
- [ ] All Markdown files contain valid YAML frontmatter matching the current schema.
- [ ] Images are in a 16:9 aspect ratio and fit the specified style.
- [ ] Content length averages 800-1000 words per post.

## Out of Scope
- Modifying the blog UI or rendering logic in the Next.js application.
- Modifying the Next.js routing for the blog.