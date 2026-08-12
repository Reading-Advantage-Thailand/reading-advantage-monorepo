# Implementation Plan: CodeCamp Interactive Media and Diagrams Integration

## Phase 1: Track Setup

- [x] Create Measure track metadata, spec, and plan.
- [x] Register the new track in the project tracks list.

## Phase 2: Schema and Frontend Adapters

- [x] Update `TheorySection` interface in [LessonContent](file:///home/daniel-bo/Desktop/reading-advantage-monorepo/apps/codecamp-advantage/components/lesson-content.tsx) to include `youtubeId` and `imagePath`.
- [x] Implement conditional rendering for images and YouTube iframes in [LessonContent](file:///home/daniel-bo/Desktop/reading-advantage-monorepo/apps/codecamp-advantage/components/lesson-content.tsx).
- [x] Write Vitest unit tests verifying that `LessonContent` correctly handles and renders the new optional properties.

## Phase 3: Diagram Generation

- [x] Create folder `apps/codecamp-advantage/public/images/diagrams/` if it does not exist.
- [x] Generate 16 visual diagrams covering the specified units and save them in the directory (all 16 assets are tracked under `apps/codecamp-advantage/public/images/diagrams/`; implementation evidence `3f0464ac6`, `f9032fc75`).

## Phase 4: Video Mapping and Seeding

- [~] Map video IDs for the curated videos in the seed curriculum data (Red `15ef0b920`; bounded Green `7f6c0f6d0`; 10 IDs now have exact module/lesson/heading mappings; the five independently curated additions carry Fireship, Dave Gray, Jack Herrington, or Web Dev Simplified provenance, while the final denominator remains an owner decision).
- [x] Map the newly generated diagram image paths in the seed curriculum data (16 distinct paths are covered and verified by the curriculum contract test; evidence `f9032fc75`).
- [x] Execute `pnpm seed:codecamp` (or the direct seed command) to populate PostgreSQL with the new media attributes.

## Phase 5: Verification and Cleanup

- [~] Run dev server and manually verify multiple lessons render videos and images correctly. An authenticated Playwright fixture (`665e214e6`) now covers the seeded Terminal lesson; production Chrome acceptance on 2026-07-15 verified the Measure lifecycle diagram, while broader credentialed browser execution remains open.
- [x] Run Playwright or Vitest suites to verify no regressions in the codecamp application (media contract 3/3, combined DB media/data 30/30, LessonContent 13/13, DB/app type checks, targeted lint, and Playwright fixture discovery pass; `7f6c0f6d0`, `665e214e6`).
- [x] Delete the draft `curriculum_enhancement_plan.md` artifact.

## Production release evidence — 2026-07-15

- Media-capable lesson rendering shipped in Cloud Run revision `codecamp-advantage-00019-682` with 100% traffic.
- Authenticated Chrome acceptance verified the Measure lifecycle diagram on a seeded production lesson.
- This track remains active: all 16 specified diagrams are present and mapped, 10 video IDs are source-tracked (with legacy source uncertainty disclosed), and broader video denominator and browser verification remain open. Deployment of the implemented slice does not satisfy the remaining content denominator.
