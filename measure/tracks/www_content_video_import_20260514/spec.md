# Specification: Import www-reading-advantage Content & Video Pipeline

## Overview

Import recent blog content and video creation pipeline from the standalone `www-reading-advantage` project (`../www-reading-advantage/`) into the monorepo. The standalone project has diverged from the monorepo copy in framework libraries (next-international vs next-intl, React 18 vs 19, Tailwind v3 vs v4), so only content assets and the video pipeline are ported — not framework code.

## Functional Requirements

### FR-1: Blog Post Content
Import all blog posts that exist in the source but are missing from the monorepo:
- 13 English markdown files (`posts/en/*.md`) — day10 through day21, day31, day32
- 13 Thai markdown files (`posts/th/*.md`) — same days
- 13 Thai segments JSON files (`posts/th/*-segments.json`) — video narration timing data

Destination: `apps/www-reading-advantage/src/app/[locale]/(marketing)/blog/posts/{en,th}/`

### FR-2: Blog Cover Images
Import all blog cover images missing from the monorepo (15 images, ~3.5 MB total):
- `day10-ai-slops_001.jpg` through `day21-digital-safety-more-than-just-a-password_001.jpg`
- `day31-the-tutoring-epidemic_001.jpg`
- `day32-why-12-years-of-english-fails_001.jpg` (canonical version only)

Destination: `apps/www-reading-advantage/public/blog/`

### FR-3: Video Assets
Copy all Thai TikTok-style video files from source to monorepo for local development:
- 14 `.mp4` files (~177 MB total) — day10 through day21, day31, day32

Destination: `apps/www-reading-advantage/public/videos/`
Git tracking: Add `apps/www-reading-advantage/public/videos/*.mp4` to `.gitignore`

### FR-4: Video Pipeline Package
Extract the video generation pipeline into a standalone monorepo package at `packages/video-pipeline/`:
- Package name: `@reading-advantage/video-pipeline`
- Own `package.json` with `@revideo/*` dependencies (currently removed from monorepo www app)
- Port `generate-blog-video.ts` from the source project as canonical version (uses `blogBasename`-based output naming)
- Port `next-blog-day.ts` from the source project, adapted for monorepo paths
- Port `regression-test-video-pipeline.ts` and test infrastructure
- Port `revideo/` scene definitions (project.ts, scenes/)
- The package must be runnable independently of any app's i18n framework

### FR-5: Script Adaptation
- `next-blog-day.ts`: Update paths to resolve correctly from the monorepo root or from within `packages/video-pipeline/`
- `generate-blog-video.ts`: Update paths for monorepo layout (blog posts under `apps/www-reading-advantage/...`, videos under `apps/www-reading-advantage/public/videos/`, etc.)
- Register npm script entry points in the new package's `package.json`

### FR-6: Cleanup Duplicate day32 Image
The source has two files for day32 cover image:
- `day32-why-12-years-of-english-fails_001.jpg` (original)
- `day32-why-12-years-of-english-fails_001_001.jpg` (duplicate from a rename fix)

Import only the canonical version. Delete or exclude the duplicate.

## Non-Functional Requirements

### NFR-1: No Framework Regression
The monorepo's `apps/www-reading-advantage/` must continue using next-intl, React 19, and Tailwind v4. No downgrades or framework changes.

### NFR-2: Repo Size Discipline
Video `.mp4` files must NOT be committed to Git. They are local-dev-only and gitignored.

### NFR-3: Independent Package
The video pipeline package must be independently runnable (`pnpm --filter @reading-advantage/video-pipeline ...`) without depending on any app's node_modules or i18n setup.

### NFR-4: Build Verification
After import, `apps/www-reading-advantage` must still pass `pnpm turbo run build --filter=www-reading-advantage` (or the monorepo's equivalent build command).

## Acceptance Criteria

1. All 13 EN blog posts, 13 TH blog posts, and 13 TH segments JSON files are present in the monorepo's www app
2. All 15 blog cover images (excluding the duplicate day32) are present in `apps/www-reading-advantage/public/blog/`
3. All 14 video files are present locally but gitignored
4. `packages/video-pipeline/` exists as a workspace package with its own `package.json`, Revideo deps, and runnable scripts
5. `next-blog-day.ts` works correctly from the monorepo, reporting the next day to generate
6. `generate-blog-video.ts` is ported with the source project's `blogBasename` output naming
7. `apps/www-reading-advantage` build still passes
8. No `.mp4` files are tracked by Git

## Out of Scope

- Porting the source project's i18n framework (next-international) or downgrading React/Tailwind
- Porting divergent framework files (layout.tsx, middleware.ts, locale-provider.tsx, etc.)
- Merging the source's `package.json` into the monorepo www app's `package.json`
- Setting up CDN/S3 hosting for videos (local-only for now)
- Rewriting the video pipeline to use a different rendering engine than Revideo
- Any changes to the blog rendering UI components
