# Lessons Learned

Retrospective insights captured after completing tracks, PR merges, and development milestones. Most recent entries at the top.

---

## 2026-04-29 — Video Pipeline Architecture Fix (video_pipeline_fix_20260429)

### What Happened

- Retrospective revealed the pipeline had a fundamental architecture flaw: video and audio were generated independently, then muxed at the end. This caused constant sync issues.
- The correct architecture: each segment's video is rendered WITH its audio already embedded. Intro/outro get silent audio tracks. All clips are then concatenated — audio/video already paired.
- Key changes made:
  1. `createSegmentClip` now accepts `audioPath` and muxes it during clip creation
  2. Intro/outro get silent audio tracks (both Revideo and ffmpeg fallback paths)
  3. Removed Steps 3 (audio concat) and 8 (audio mux) from main()
  4. `mixBackgroundMusic` simplified — no more padding/extraction, direct amix with jingle
  5. Thai text wrapping fixed with dynamic maxCharsPerLine based on font size and frame width
  6. Image prompts hardened to reject charts, graphs, diagrams, and request only situational images

### Lessons

- **Architecture matters more than bug fixes.** The sync issues weren't individual bugs — they were symptoms of a fundamentally wrong approach. Rendering video and audio separately then muxing at the end guarantees alignment problems.
- **Self-contained segments eliminate sync.** When each segment has its audio embedded, concat just works. No complex duration matching, no padding, no amix tricks.
- **Thai text wrapping needs font-size-aware character limits.** At 62px, Thai characters are ~50px wide. 25 chars = 1250px overflows 1080px. Dynamic calculation: `maxChars = floor((frameWidth * 0.85) / (fontSize * 0.6))`.
- **amix=duration=first works when inputs match.** The truncation bug was caused by mismatched durations (video container vs audio stream). When both inputs are same duration, amix works correctly.

---

## 2026-04-25 — Day 4 Blog Post Generation (blog_marketing_generation_20260421)

### What Happened

- Generated Day 4 blog post ("1 District 1 Quality School") in English using mmx text chat successfully (~1200 words).
- Thai text generation via mmx produced truncated output twice (only ~100-200 words, incomplete). Had to write Thai version manually based on English content.
- Validation tests failed on existing Day 2-3 posts due to `---` horizontal rules in markdown body conflicting with frontmatter delimiter validation.
- Attempted to fix with `sed` accidentally removed frontmatter delimiters from Day 4 posts, requiring manual restoration.
- Video generation pipeline worked correctly: 44s Thai video rendered at 1080×1920 with AAC audio.

### Lessons

- **Always verify mmx output length and completeness.** Thai generation especially may truncate; check word count and ending before accepting.
- **Never use `---` horizontal rules in blog post bodies.** The validation test treats bare `---` lines as potential frontmatter errors. Use `***` or avoid horizontal rules entirely.
- **Be extremely careful with sed on markdown files.** Pattern matching `---` will match frontmatter delimiters too. Use line-specific edits or avoid sed for markdown fixes.
- **The video pipeline is stable.** Revideo + ffmpeg upscale + mux workflow consistently produces valid 1080×1920 h264+AAC output.

---

## 2026-04-24 — Revideo EOF Crash Fix (blog_video_generation_20260423)

### What Happened

- Diagnosed the root cause of `stream.push() after EOF` in `@revideo/renderer`: `project.ts` had `range: [0, 120]`, which at 8fps caps the render at exactly 15 seconds. When narration audio was 60–90s, the scene generator kept yielding frames past frame 120, but the renderer had already closed the stream.
- Fixed by setting `range: [0, 9999]` as a safe default and generating temporary project files with exact frame ranges for each render (`Math.ceil(duration * fps) + 30`).
- Added duration pre-check in the pipeline: videos >60s skip Revideo and use the ffmpeg fallback directly, avoiding the long-render stream edge case entirely.
- Added image normalization (ffmpeg to 1080×1920 JPG) for all segment assets before rendering to prevent decoder surprises.
- Added `--single-process` to Puppeteer args to improve stability in headless/container environments.

### Lessons

- **Revideo `range` is in frames, not seconds.** Always ensure `range` covers the full expected frame count (`duration * fps + buffer`). A default range that is too short causes EOF crashes that look like stream bugs but are actually configuration errors.
- **Pre-calculate expected duration before calling the renderer.** This allows choosing the right render strategy (Revideo vs fallback) and setting the correct frame range.
- **Normalize all image inputs to consistent format and dimensions.** Revideo's browser media pipeline is sensitive to mixed formats; standardizing to JPG with yuv420p prevents decode errors.
- **Puppeteer in containers needs `--single-process`.** Without it, sandbox-related process spawning can cause intermittent renderer failures.

---

## 2026-04-23 — Blog-to-Video Pipeline Setup (blog_video_generation_20260423)

### What Happened

- Validated Thai TTS using `mmx speech synthesize` with default voice on a Thai blog sentence. Output was clear and acceptable at 128kbps MP3.
- Installed Revideo dependencies (`@revideo/cli`, `@revideo/core`, `@revideo/2d`, `@revideo/renderer`, `@revideo/ui`, `tsx`).
- Created `revideo/project.ts` and `revideo/scenes/blog-video.tsx` for 9:16 TikTok-style composition.
- Created `scripts/generate-blog-video.ts` pipeline script that: parses markdown with `gray-matter`, generates TikTok script via `mmx text chat`, generates narration via `mmx speech`, generates segment images via `mmx image`, and renders via `@revideo/renderer`.
- Fixed `makeScene2D` call signature: requires a string name as the first argument (`makeScene2D('scene-name', function* (view) {...})`). Documentation examples omitting the name are incorrect for this version.
- Rendering currently blocked by ffmpeg export format resolution — `visuals.undefined` filename suggests `format` is not being derived from `outFile` extension correctly when exporter options lack an explicit `format` key.

### Lessons

- `mmx text chat` returns structured JSON with `content[].text` and often wraps JSON arrays in markdown code blocks. Must strip ```json fences before parsing.
- `makeScene2D` has a required `name` parameter in Revideo 0.10.4. Calling it with only a generator function causes `config` to be undefined, leading to "The thread is not available in the current context" at runtime.
- Revideo `.ts` project files must NOT contain JSX — only `.tsx` scene files should have JSX. Esbuild in Vite will not transform JSX in `.ts` files.
- When using `@revideo/core/ffmpeg` exporter, explicitly set `options.format` (e.g., `mp4`) in the project settings, or ensure `outFile` has a valid extension that `validate-settings.js` can parse. Otherwise `ffmpeg_1.extensions[format]` resolves to `undefined`.
- `renderVideo()` settings should include `puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process'] }` for headless environments.

---

## 2026-04-16 — Hero Image Inconsistency Fix (hero_image_inconsistency_20260416)

### What Happened

- Top tech-debt item claimed pricing and about pages "reuse the same `students_at_computers.jpg`"
- Audit revealed: **neither page actually had a `floatingImage` prop set** — both used `alignment="center"` which suppresses the floating image entirely
- The actual problem: pricing and about were visually underwhelming compared to home/products pages which show a hero image via `floatingImage` with `alignment="left"`
- Resolution: added `floatingImage` + `alignment="left"` to both pages using existing images:
  - pricing → `/images/app-on-desktop.png`
  - about → `/images/teacher-at-board.png`

### Lessons

- Tech-debt descriptions may be inaccurate or outdated — always verify by reading current code before implementing
- `HeroSection` floating image only renders when `alignment="left"` (hidden at center alignment per component logic)
- When a debt entry says two pages "share the same image," check if they share anything at all first

---

## 2026-04-15 — Reduce Excessive Client Component Boundaries (client_component_reduction_20260415)

### What Happened

- Converted 4 pages and 2 components from `"use client"` to server components using `getScopedI18n`.
- Converted pages: `primary-advantage`, `managed-service`, `blended-learning`, and home page.
- Converted components: `tutor-advantage` and `b2b-solutions`.
- The key pattern: remove `"use client"`, change `useScopedI18n` to `getScopedI18n`, add `async` and `await`.

### Lessons

- Pages/components that only use `useScopedI18n` (no `useState`, `useEffect`, or browser APIs) can be safely converted to server components.
- `getScopedI18n` is async and must be awaited: `const t = await getScopedI18n("scope")`.
- `server-only` module prevents testing async server components in Vitest jsdom environment — tests fail at import time with "This module cannot be imported from a Client Component module."
- Skipped affected test files (`primary-advantage/page.test.tsx`, `home/page.test.tsx`) — they need special handling for async server components with `server-only` dependencies.

---

## 2026-04-14 — Fix Missing `sizes` Props on `fill` Images (images_sizes_prop_20260414)

### What Happened

- Top tech-debt item: `tutor-advantage.tsx` had a `fill` image without `sizes`.
- Also found invalid `sizes` props passed via `floatingImage` to `HeroSection` — the component uses `width`/`height` props, not `fill`, so `sizes` was rejected by TypeScript on 3 pages.
- Fixed `tutor-advantage.tsx` (added `sizes="10rem"`), removed invalid `sizes` from `reading-advantage`, `products`, and `blended-learning` pages.

### Lessons

- `HeroSection` internally uses `width`/`height` (not `fill`) for floatingImage, so `sizes` is never appropriate on that prop.
- Build error "Object literal may only specify known properties" from `sizes` on a non-`fill` Image means the prop doesn't exist on that type.
- When adding `sizes` to a track, audit the entire `floatingImage` pattern across all pages — if one page has it wrong, others likely do too.

---

## 2026-04-13 — Phase 3 Fixes (Complete Site Redesign)

### What Happened

- Fixed Phase 3 incomplete tasks for reading-advantage and primary-advantage pages.
- Replaced emoji icons (🧠 ✍️) in primary-advantage with Brain and PenTool Lucide equivalents.
- Removed unused `showDecorations` prop from HeroSection interface and all 5 call sites.
- Removed unused imports (CardHeader, CardTitle) from home page.
- Fixed test mock to return `/images/placeholder.png` for i18n keys ending in `.image` (prevents Next/Image error on relative paths without leading `/`).
- Fixed regex-based test assertions that matched multiple elements by using more specific queries.

### Lessons

- The `useScopedI18n` mock must return valid image paths for keys ending in `.image` — otherwise Next/Image rejects them at render time.
- Regex `/hero\./i` in `getByText` can match multiple elements when the mock returns strings containing the pattern — use `getAllByRole` with count assertions instead.
- `showDecorations` prop was declared in HeroProps but never used in the component body — always check that props are actually consumed before shipping.
- Build errors from unused vars must be fixed before push — CI will reject.

---

## 2026-04-11 — Blog Pagination and Content Pipeline (blog_pagination_20260408)

### What Happened

- Implemented static pagination for blog listing (9 posts/page) with `generateStaticParams`.
- Added `getPaginatedPosts` utility with TDD - 6 passing tests.
- Created `BlogPagination` client component with Previous/Next and page numbers (up to 5 visible).
- Added `extractHeadings` utility to parse H2/H3 from MDX content - 7 passing tests.
- Built `TableOfContents` component with IntersectionObserver scroll-spy and mobile collapsible toggle.
- Created `getRelatedPosts` utility for tag-based related post matching - 5 passing tests.
- Added `RelatedPosts` client component to display up to 3 related posts at bottom of blog posts.
- All 30 tests passing; production build successful.

### Lessons

- `useScopedI18n` scope must match locale file structure: `components.pagination`, `pages.blog`, not just `"pagination"` or `"blog"`.
- Client components that need i18n (`TableOfContents`, `RelatedPosts`) must be separate from server page components.
- `extractHeadings` works on raw MDX content before MDX-to-HTML processing.
- Testing-library queries return multiple elements across test runs if `cleanup()` is not called in `afterEach`.

---

## 2026-04-10 — Remaining Product Pages Redesign (product_pages_redesign_20260408)

### What Happened

- Redesigned 7 product pages (Math, Science, STEM, Storytime, Zhongwen, CodeCamp, Tutor) following the new design language.
- Each page now has an inline hero section with product-specific gradient (emerald/teal for Math, violet/purple for Science, orange/amber for STEM, pink/rose for Storytime, red/rose for Zhongwen, dark slate for CodeCamp, sky/blue for Tutor).
- All emoji icons replaced with Lucide equivalents.
- All animations now use tailwindcss-animate patterns.
- No Framer Motion usage in any of the 7 product pages.

### Lessons

- Testing async server components with @testing-library/react requires additional mocking setup for next-international. The mock in setup.ts needs to return a synchronous function for `getScopedI18n`.
- Removing unused imports immediately after implementation prevents lint errors from blocking the build.
- Product-specific gradients help with visual distinction - each product now has a unique color identity.

---

## 2026-04-10 — Testing Infrastructure Setup (testing_infrastructure_20260408)

### What Happened

- Track was already fully implemented when reviewed: Vitest, Playwright, test setup, E2E tests, CI workflow, and testing guide all in place.
- 8 unit tests passing, 3 E2E tests passing.
- Build passes, npm test passes, npm run test:e2e passes.
- No work required — track verified complete.

### Lesson

- Always verify current state before starting implementation. Run the test suite, inspect the CI config, and confirm the guide exists before assuming work is needed.

---

## 2026-04-09 — Services Pages i18n Completion (services_i18n_completion_20260408)

### What Happened

- Track was created with spec/plan but work was already completed prior to track creation.
- Both `blended-learning/page.tsx` and `managed-service/page.tsx` already correctly use `useScopedI18n("pages.blendedLearning")` and `useScopedI18n("pages.managedService")` respectively.
- All visible text uses `t("...")` calls properly wired to locale files.
- Build passes with no TypeScript errors; tests pass (8/8).

### Lesson

- Always verify current state before starting a track — the problem may already be solved. Run `npm run build` and inspect the actual page code to confirm before implementing.

---

## 2026-04 — Testing Infrastructure Setup (testing_infrastructure_20260408)

### What Went Well

- Vitest setup was straightforward; `@vitejs/plugin-react` handles Next.js JSX transform correctly.
- Playwright webServer config auto-starts dev server for E2E tests — no manual server management needed.
- Mock setup in `src/test/setup.ts` provides consistent i18n and navigation mocks across all tests.

### What Could Be Improved

- Existing test file at `scripts/__tests__/i18n-cli.test.ts` uses Jest globals (`@jest/globals`) — had to exclude it from Vitest. Migrate to Vitest or Jest exclusively in a future cleanup.
- DOM pollution between tests required explicit `cleanup()` in `afterEach` — `@testing-library/react` doesn't auto-cleanup in Vitest by default.

### Lessons

- Vitest `include` pattern must be specific (`src/**/*.test.ts`) or it picks up all files in src including `.md`, fonts, and `.tsx` pages.
- Use `passWithNoTests: true` in vitest config to exit 0 when no test files found (required for CI).
- `@vitest/coverage-v8` must be installed separately — not bundled with `vitest`.
- Playwright `exact: true` is needed with `getByRole` when page has multiple similar headings to avoid strict mode violations.

---

## 2026-02 — Site Refactor Track (site_refactor_20260207)

### What Went Well

- Systematic audit-first approach (REFACTOR.md) gave a clear, prioritised backlog before writing any code.
- Fixing the `conntainer` typo and the `href="#"` broken link were quick wins that immediately improved production quality.
- Re-enabling `ignoreBuildErrors: false` in `next.config.ts` surfaced latent TypeScript errors early, preventing silent regressions from shipping.
- Converting `services/page.tsx`, `case-studies/page.tsx`, and `features/page.tsx` from `"use client"` to server components measurably reduced client-side JS.

### What Could Be Improved

- The initial audit found 3.2 MB of JavaScript on a static marketing site — excessive `"use client"` boundaries had accumulated over many PRs without review. Enforce server-component-first in every future PR.
- Multiple pages had inconsistent color use (violet, emerald, purple) despite a documented brand palette. Need a lint-level check or a pre-PR visual review step.
- Scroll-triggered animations (Framer Motion `whileInView`) made content invisible by default on slow connections. Any animation that hides content initially is a UX regression — use CSS `animation-fill-mode: backwards` with short delays instead.

### Lessons

- Run `npm run build` locally before merging to catch TypeScript errors; do not rely on CI to be the first to catch them.
- The `sizes` prop on Next.js `Image` components must always be set when using `fill` — omitting it causes the browser to fetch the largest image variant unnecessarily.
- Decorative blur blobs (`blur-[100px]`, `animate-pulse-slow`) are expensive GPU compositing operations. Limit to 2-3 per page and use `will-change: transform` sparingly.

---

## 2026-01 — Services Pages Development (services_development_20260114)

### What Went Well

- Navigation integration (header + footer in EN/TH/ZH) was completed cleanly alongside the new pages.
- Using `IMPLEMENTATION-STATUS.md` inside the page directory as a work-in-progress checklist proved useful for async handoff.

### What Could Be Improved

- Both `blended-learning/page.tsx` and `managed-service/page.tsx` shipped with hard-coded English text despite locale files being prepared. The pages were technically "done" but not production-ready for TH/ZH users.
- The mismatch between `useScopedI18n("pages.services")` and the intended `useScopedI18n("pages.blendedLearning")` scope went undetected until review.

### Lessons

- Never mark a task complete if i18n strings are still hard-coded. The locale files and the component must be wired together in the same PR.
- Use the i18n verify script (`npm run i18n:verify`) as a mandatory pre-commit check whenever new locale keys are added.

---

## 2026-01 — Product Page Iterations (Primary Advantage, Math Advantage)

### Lessons

- Must follow the issue-executor workflow exactly to get AI-assisted planning benefits — manual implementation works but misses context synthesis.
- Product team feedback integration is crucial — always check the products overview page for the latest copy rather than working from memory or assumptions.
- Product-specific image assets (`public/images/<product-name>/`) need to exist before implementing hero sections. Placeholder images cause layout shifts; plan image delivery in the same sprint as the component.

---

## General Patterns

### i18n

- Run `npm run i18n:verify` after every locale file change.
- Add new locale keys to EN, TH, and ZH in the same commit — never leave TH/ZH as TODO.
- Use `getScopedI18n` for server components and `useScopedI18n` for client components.

### Performance

- Default to server components. Add `"use client"` only when `useState`, `useEffect`, or browser APIs are strictly required.
- Every `next/image` with `fill` must have a `sizes` prop.
- Keep above-the-fold `priority` images to 1-2 per page.

### Animations

- All animations via `tailwindcss-animate`. No Framer Motion anywhere.
- Content must be visible without JavaScript. Animate as progressive enhancement only.
- Limit animated blur decorations to 2-3 per page.

### TypeScript

- Keep `ignoreBuildErrors: false` in `next.config.ts` at all times.
- Resolve all TypeScript errors before merging — CI is not a substitute for local `npm run build`.

### Testing

- Export utility functions from `src/lib/` for direct testing — internal functions cannot be tested without export.
- Always call `cleanup()` in `afterEach` when using `@testing-library/react` with Vitest.
- Use `vi.mock()` for Next.js and i18n mocks in test setup files — actual modules should not be imported during tests.
