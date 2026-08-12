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

- [~] Map video IDs for the curated videos in the seed curriculum data (source-integrity Red `2faaf316`; bounded Green `0117e8e1b` retains exactly five independently verified IDs with exact module/lesson/heading mappings and removes the five rejected legacy embeds; pending placement/version questions are recorded in [owner-decision-video-placement.md](owner-decision-video-placement.md), and the final denominator remains an owner decision).
- [x] Map the newly generated diagram image paths in the seed curriculum data (16 distinct paths are covered and verified by the curriculum contract test; evidence `f9032fc75`).
- [x] Execute `pnpm seed:codecamp` (or the direct seed command) to populate PostgreSQL with the new media attributes.

## Phase 5: Verification and Cleanup

- [~] Run dev server and manually verify multiple lessons render videos and images correctly. The canonical authenticated Playwright fixture at `apps/codecamp-advantage/e2e/interactive-media-acceptance.spec.ts` was independently ACCEPTed and committed as `bf00083a7`; it covers the seeded Docker Basics lesson with its diagram and verified Fireship embed. Focused auth/media tests passed 13/13, app typecheck, targeted ESLint, and Prettier check passed, Playwright discovery passed, and the credential-free Playwright execution exited successfully with its intentional skip. The authenticated media gate remains blocked on an owner-provided valid company storage-state file (`CODECAMP_MEDIA_STORAGE_STATE`) or explicit legacy-mode credentials; company mode never posts legacy credentials. The exact session architecture blocker is recorded in [browser-auth-architectural-blocker.md](browser-auth-architectural-blocker.md), so broader credentialed browser execution remains open.
- [x] Run Playwright or Vitest suites to verify no regressions in the codecamp application (media contract 3/3, combined DB media/data 30/30, LessonContent 13/13, DB/app type checks, targeted lint, and Playwright fixture discovery pass; `7f6c0f6d0`, `665e214e6`).
- [x] Delete the draft `curriculum_enhancement_plan.md` artifact.

## Production release evidence — 2026-07-15

- Media-capable lesson rendering shipped in Cloud Run revision `codecamp-advantage-00019-682` with 100% traffic.
- Authenticated Chrome acceptance verified the Measure lifecycle diagram on a seeded production lesson.
- This track remains active: all 16 specified diagrams are present and mapped, five independently verified video IDs are source-tracked, five rejected legacy embeds are removed, and broader video denominator and browser verification remain open. Deployment of the implemented slice does not satisfy the remaining content denominator.

## Remaining executable gate — 2026-08-12

- No further safe non-external implementation task remains in this bounded track. The remaining Phase 4 work requires owner decisions on the final video denominator and the documented placement/version caveats; production remapping is intentionally paused.
- The remaining Phase 5 work requires an owner-provided valid company-mode Playwright storage state or explicit legacy-mode credentials (`PHASE5_MEDIA_TEST_USERNAME`/`PHASE5_MEDIA_TEST_PASSWORD` or the `CODECAMP_E2E_*` pair with legacy mode enabled). No credentials or session are available to mint or infer locally, so the browser/media owner gate stays in progress.
