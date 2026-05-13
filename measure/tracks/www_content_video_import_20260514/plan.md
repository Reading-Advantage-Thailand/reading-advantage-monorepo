# Implementation Plan: Import www-reading-advantage Content & Video Pipeline

## Phase 1: Contract & Schema Definition

- [ ] Task: Define video-pipeline package contract
    - [ ] Create `packages/video-pipeline/` directory structure: `src/`, `revideo/`, `revideo/scenes/`
    - [ ] Create `packages/video-pipeline/package.json` with name `@reading-advantage/video-pipeline`, `"type": "module"`, scripts (`build`, `dev`, `generate-video`, `next-blog-day`, `test`), and `@revideo/*` devDependencies
    - [ ] Create `packages/video-pipeline/tsconfig.json` following existing package convention (ESM, `strict: true`, path alias `@/*` → `./src/*`)
    - [ ] Define npm script entry points: `generate-video` → `npx tsx src/generate-blog-video.ts`, `next-blog-day` → `npx tsx src/next-blog-day.ts`
- [ ] Task: Define gitignore rules for video assets
    - [ ] Add `apps/www-reading-advantage/public/videos/*.mp4` to `apps/www-reading-advantage/.gitignore`
    - [ ] Verify images in `public/blog/` remain tracked (only mp4s are gitignored)

## Phase 2: Test

- [ ] Task: Write contract/unit tests for adapted scripts
    - [ ] Create `packages/video-pipeline/src/__tests__/next-blog-day.test.ts` — test path resolution, day-number detection from blog images, directive parsing
    - [ ] Create `packages/video-pipeline/src/__tests__/generate-blog-video.test.ts` — test `slugify()`, `detectLanguage()`, `resolveCoverImagePath()`, `wrapText()`, output filename derivation from `blogBasename`
    - [ ] Create `packages/video-pipeline/vitest.config.ts` following existing package convention
    - [ ] Run tests and confirm they fail (Red phase — scripts not yet ported)

## Phase 3: Implement

### Phase 3a: Blog Content Import

- [ ] Task: Copy EN blog posts
    - [ ] Copy 13 EN markdown files from `../www-reading-advantage/src/app/[locale]/(marketing)/blog/posts/en/` to `apps/www-reading-advantage/src/app/[locale]/(marketing)/blog/posts/en/`
- [ ] Task: Copy TH blog posts and segments
    - [ ] Copy 13 TH markdown files from source `posts/th/` to monorepo `posts/th/`
    - [ ] Copy 13 TH segments JSON files from source `posts/th/` to monorepo `posts/th/`
- [ ] Task: Copy blog cover images
    - [ ] Copy 15 blog cover images from source `public/blog/` to monorepo `public/blog/` (skip `day32-*_001_001.jpg` duplicate)
- [ ] Task: Copy video files (local-only)
    - [ ] Copy 14 `.mp4` files from source `public/videos/` to monorepo `public/videos/`
    - [ ] Verify `.gitignore` rule excludes them from tracking

### Phase 3b: Video Pipeline Package Scaffold

- [ ] Task: Scaffold package structure
    - [ ] Create `packages/video-pipeline/package.json` (from Phase 1 contract)
    - [ ] Create `packages/video-pipeline/tsconfig.json`
    - [ ] Create `packages/video-pipeline/vitest.config.ts`
- [ ] Task: Port Revideo scene definitions
    - [ ] Copy `revideo/project.ts` from source to `packages/video-pipeline/revideo/project.ts` — update import paths
    - [ ] Copy `revideo/scenes/blog-video.tsx` from source to `packages/video-pipeline/revideo/scenes/blog-video.tsx`
    - [ ] Copy `revideo/scenes/intro.tsx` from source to `packages/video-pipeline/revideo/scenes/intro.tsx`
    - [ ] Copy `revideo/scenes/outro.tsx` from source to `packages/video-pipeline/revideo/scenes/outro.tsx`
- [ ] Task: Port `generate-blog-video.ts` with monorepo path adaptation
    - [ ] Copy source `scripts/generate-blog-video.ts` to `packages/video-pipeline/src/generate-blog-video.ts`
    - [ ] Update `PUBLIC_DIR_ABS` to resolve to `apps/www-reading-advantage/public/` relative to monorepo root
    - [ ] Update `JINGLE_PATH`, `FALLBACK_IMAGE_PATH` to use monorepo-relative paths
    - [ ] Update default `--out-dir` to `apps/www-reading-advantage/public/videos`
    - [ ] Update blog path resolution: accept paths relative to monorepo root or to `apps/www-reading-advantage/`
    - [ ] Preserve `blogBasename`-based output naming from source version
    - [ ] Verify Revideo project path references point to `packages/video-pipeline/revideo/`
- [ ] Task: Port `next-blog-day.ts` with monorepo path adaptation
    - [ ] Copy source `scripts/next-blog-day.ts` to `packages/video-pipeline/src/next-blog-day.ts`
    - [ ] Update `POSTS_DIR` to point to `apps/www-reading-advantage/src/app/[locale]/(marketing)/blog/posts/en/`
    - [ ] Update `BLOG_IMAGES_DIR` to point to `apps/www-reading-advantage/public/blog/`
    - [ ] Update `MARKETING_PLAN` and `CURRENT_DIRECTIVE` paths to resolve from monorepo root or package directory
- [ ] Task: Port regression test script
    - [ ] Copy `scripts/regression-test-video-pipeline.ts` to `packages/video-pipeline/src/regression-test-video-pipeline.ts`
    - [ ] Update paths for monorepo layout
- [ ] Task: Install dependencies and verify package
    - [ ] Run `pnpm install` to link the new workspace package
    - [ ] Verify `pnpm --filter @reading-advantage/video-pipeline build` succeeds
    - [ ] Verify `pnpm --filter @reading-advantage/video-pipeline next-blog-day` reports the correct next day
    - [ ] Run Phase 2 tests and confirm they pass (Green phase)
- [ ] Task: Verify www-reading-advantage build
    - [ ] Run `pnpm turbo run build --filter=www-reading-advantage` and confirm it passes
    - [ ] Run `pnpm turbo run lint --filter=www-reading-advantage` and confirm no new errors
- [ ] Task: Remove old video pipeline from www app
    - [ ] Delete `apps/www-reading-advantage/scripts/generate-blog-video.ts` (replaced by `packages/video-pipeline/`)
    - [ ] Delete `apps/www-reading-advantage/revideo/` directory (replaced by `packages/video-pipeline/revideo/`)
    - [ ] Delete `apps/www-reading-advantage/scripts/regression-test-video-pipeline.ts` (moved to package)
    - [ ] Delete `apps/www-reading-advantage/scripts/test-revideo.ts` (moved to package)
    - [ ] Delete `apps/www-reading-advantage/scripts/test-vite.mjs` (moved to package)
    - [ ] Verify no remaining imports reference the deleted scripts/revideo in the www app

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update generated documentation
    - [ ] Run any applicable `measure/doctor.sh` or architecture linting to verify new package conforms to monorepo conventions
    - [ ] Verify `pnpm-workspace.yaml` already includes `packages/*` (no change needed)
- [ ] Task: Measure — Manual Verification 'Generate Docs & Doctor' (Protocol in workflow.md)
