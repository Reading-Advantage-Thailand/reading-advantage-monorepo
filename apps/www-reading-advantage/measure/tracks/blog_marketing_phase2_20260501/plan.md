# Implementation Plan: Phase 2 Marketing Blog Generation (Days 31-60)

## Phase 1: Setup Automation Script
- [ ] Task: Create/update script to automate generation of blog content and video segments
  - [ ] Implement logic to call `mmx` to generate English blog post and Image prompt.
  - [ ] Implement logic to call `mmx` to translate/generate Thai blog post.
  - [ ] Implement logic to call `mmx` to generate the 8-10 segment video JSON summary.
  - [ ] Implement logic to call `mmx` (or `create-image-mmx`) to generate Hero Image.
  - [ ] Ensure script handles mmx JSON responses properly (stripping ```json fences).
  - [ ] Ensure script formats the markdown frontmatter correctly and saves to `src/app/[locale]/(marketing)/blog/posts/`.
  - [ ] Ensure video segment JSON is saved next to the Thai markdown file.
- [ ] Task: Measure - User Manual Verification 'Setup Automation Script' (Protocol in workflow.md)

## Phase 2: Generation of Days 31-40
- [ ] Task: Generate English & Thai text, 16:9 images, segments JSON, and vertical videos for Days 31-40.
  - Per day: EN post, TH post, cover image, `<slug>-segments.json` next to TH post, Thai video via pipeline.
- [ ] Task: Measure - User Manual Verification 'Generation of Days 31-40' (Protocol in workflow.md)

## Phase 3: Generation of Days 41-50
- [ ] Task: Generate English & Thai text, 16:9 images, segments JSON, and vertical videos for Days 41-50.
  - Per day: EN post, TH post, cover image, `<slug>-segments.json` next to TH post, Thai video via pipeline.
- [ ] Task: Measure - User Manual Verification 'Generation of Days 41-50' (Protocol in workflow.md)

## Phase 4: Generation of Days 51-60
- [ ] Task: Generate English & Thai text, 16:9 images, segments JSON, and vertical videos for Days 51-60.
  - Per day: EN post, TH post, cover image, `<slug>-segments.json` next to TH post, Thai video via pipeline.
- [ ] Task: Measure - User Manual Verification 'Generation of Days 51-60' (Protocol in workflow.md)

## Phase 5: Final Validation
- [ ] Task: Validate all assets
  - [ ] Verify all 30 hero images exist in `public/blog/` and are referenced correctly.
  - [ ] Verify all 30 video files exist in `public/videos/`.
  - [ ] Run the blog frontmatter validation test suite to ensure all posts are structurally sound.
- [ ] Task: Measure - User Manual Verification 'Final Review' (Protocol in workflow.md)