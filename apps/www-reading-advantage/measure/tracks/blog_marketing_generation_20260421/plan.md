# Implementation Plan: 30-Day Marketing Blog Posts Generation

## Phase 1: Validation Script & Setup
- [x] Task: Write a test script to validate that all generated blog posts have valid YAML frontmatter, corresponding localized versions, and that the referenced cover images exist.
- [x] Task: Review existing blog format and define the prompt templates for `mmx` generation.
- [ ] Task: Measure - User Manual Verification 'Validation Script & Setup' (Protocol in workflow.md)

## Phase 2: Generation of Days 1-10
- [~] Task: Generate English & Thai text, 16:9 images, segments JSON, and vertical videos for Days 1-10. (Days 1-9 complete) [checkpoint: 4b25498]
  - Per day: EN post, TH post, cover image, `<slug>-segments.json` next to TH post, Thai video
- [x] Task: Generate Day 7 (Solving the 'Forgotten Summer') — EN post, TH post, 16:9 cover image, and vertical video
- [x] Task: Generate Day 8 (STEM vs. STEAM) — EN post, TH post, 16:9 cover image, and vertical video
- [x] Task: Generate Day 9 (The Science of Storytelling) — EN post, TH post, 16:9 cover image, segments JSON, and vertical video
- [ ] Task: Measure - User Manual Verification 'Generation of Days 1-10' (Protocol in workflow.md)

## Phase 3: Generation of Days 11-20
- [ ] Task: Generate English & Thai text, 16:9 images, segments JSON, and vertical videos for Days 11-20.
  - Per day: EN post, TH post, cover image, `<slug>-segments.json` next to TH post, Thai video
- [ ] Task: Measure - User Manual Verification 'Generation of Days 11-20' (Protocol in workflow.md)

## Phase 4: Generation of Days 21-30
- [ ] Task: Generate English & Thai text, 16:9 images, segments JSON, and vertical videos for Days 21-30.
  - Per day: EN post, TH post, cover image, `<slug>-segments.json` next to TH post, Thai video
- [ ] Task: Measure - User Manual Verification 'Generation of Days 21-30' (Protocol in workflow.md)

## Phase 5: Final Validation
- [ ] Task: Run the validation script to ensure all 60 markdown files (30 EN, 30 TH) and 30 images exist and are well-formed. Fix any issues found.
- [ ] Task: Measure - User Manual Verification 'Final Validation' (Protocol in workflow.md)