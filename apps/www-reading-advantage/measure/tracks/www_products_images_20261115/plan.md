# Plan: www products images stuck faded or blurred

Light lane. Classic FR list from spec.md.

## Phase 1: Evidence
- [x] Capture live /en/products and /th/products at 1280 px and 390 px, full
  page, after a scroll to the bottom and back, into /tmp/opencode/a59/before/.
- [x] Record computed opacity, filter, transform, and animation state
  (getAnimations) of the stuck cards and images.

## Phase 2: Root cause and local reproduction
- [x] Identify the exact rule or component that keeps content hidden.
- [x] Reproduce the hidden state on a local www server or production build.

## Phase 3: Test first, then fix
- [x] Write a failing test that pins the class or CSS rule that hides content,
  including the reduced-motion case.
- [x] Apply the minimal fix so content reaches a visible end state under both
  motion settings.

## Phase 4: Same pattern on other www pages
- [x] Grep all www pages and components for the same classes and inline
  `--delay` usage; capture pages that use them; fix pages with the same cause.
  Global CSS guard covers all 17 files with `animate-in`; the only permanent
  image blur/fade was the b2b blended-learning image. Routes captured:
  home, services, features, case-studies, contact, science/stem/math product
  pages, blended-learning, in both motion settings (summary.json, zero
  low-opacity elements, zero broken images).

## Phase 4b: Blog hero empty band (PM addition, 2026-11-15)
- [x] Capture live blog post routes at 1280 px and 390 px; prove zero
  animations and zero hidden elements; measure the 70vh min-height gap
  (up to 259 px desktop, 94 px mobile; 431 to 491 px on the blog index).
- [x] Add a red test for a compact hero utility and its blog route usage.
- [x] Add `height="compact"` to HeroSection and use it on the post, index,
  and paginated index routes; verify gap 0 at every viewport.

## Phase 5: Gates
- [x] Targeted vitest (changed files only, --maxWorkers=1) exits 0.
- [x] www lint: touched files exit 0; full run keeps the pre-existing baseline
  of 146 errors, all in public/experience minified JS; 0 shadcn errors,
  0 src errors (no new error).
- [x] www check-types exits 0.
- [x] www production build exits 0 (heavy run, `next build` rc=0; built CSS
  contains the compact utility, the enter-opacity guard, and the reduced-motion
  block).
- [x] Local after-captures at 1280 px and 390 px into /tmp/opencode/a59/after/,
  reviewed against the production build (`next start`): zero low-opacity
  elements, zero broken images, hero gap 0, both motion settings.

## Commit map (branch www/products-images, pre-push)

- `09b5d5d95` chore: open the light-lane track (spec, plan, metadata, registry).
- `10cefcb96` test: failing entrance-visibility regression test (3 tests).
- `2dd1ab297` fix: enter-opacity guard, reduced-motion block, workbook image
  blur/fade removal.
- `22171334d` test: failing compact blog hero height test (3 tests).
- `63c5ab77c` fix: `height="compact"` HeroSection option on the three blog
  routes and the `min-h-hero-compact` utility.
- `075383af6` chore: blog hero addition recorded in this track.
- `ea0bda240` chore: gates and production build evidence recorded.

## Phase 6: Deploy and verify
- [x] Rebase on origin/master, rerun gates if it moved, push
  `HEAD:master` (www-only push, standing-approved 2026-11-15). Pushed
  `ea0bda240` (origin/master moved 0 commits before the push).
- [x] Watch the GitHub Actions www deploy run. Run 43663295522 (CD —
  www-reading-advantage, head `ea0bda240`): success.
- [x] Capture live /en/products and /th/products at 1280 px and 390 px, plus
  the two blog post locales at both widths, into /tmp/opencode/a59/live/ and
  review.

## Phase 7: Follow-up found in the live review (PM confirmation, 2026-11-15)
- [x] Diagnose the pale hero subtitle under "Programs for Every Learning
  Stage": the products page passes `alignment="left"` with the default
  `textColor="light"`, so the string description renders `text-white/90` —
  white text over the default light amber/orange gradient. A contrast fault,
  not the entrance-state fault and not a capture artifact. Verified on the
  live page: the description `<p>` carried `text-white/90` at opacity 1.
- [x] Check /th/products and every other www page that renders HeroSection
  for the same fault. The same fault was live on /en/about and /th/about.
  The other left-aligned pages are correct: pricing sets
  `textColor="dark"`; reading-advantage uses a dark sky gradient with a
  background image; managed-service and blended-learning pass ReactNode
  descriptions with their own colors.
- [x] Red test first: `6840714fb` adds
  `src/__tests__/hero-text-contrast.red.test.ts` (2 tests). It fails on the
  products and about heroes.
- [x] Fix: `11aa5068a` adds `textColor="dark"` to the products overview and
  about heroes. Live /en/products and /th/products descriptions now render
  `text-slate-700`.
- [x] Gates rerun: targeted vitest (3 track test files, --maxWorkers=1) exit
  0; eslint on the touched files exit 0; check-types exit 0; production build
  through heavy-run exit 0 (only the pre-existing blog-blocks tracing
  warnings).
- [x] Push `11aa5068a` to master, deploy run 43666163019 (CD —
  www-reading-advantage): success. Live recapture into
  /tmp/opencode/a59/live/: subtitle readable in en and th at 1280 px and
  390 px, zero low-opacity elements, zero broken images, blog heroes compact.

## Deploy record (2026-11-15)
- Push `ea0bda240` → GitHub Actions run 43663295522 (CD — www-reading-advantage):
  success. Run 43663295459 (CD — apps): success. CI run 43663295395: failure
  from pre-existing causes (the lint errors in minified `public/experience`
  assets and the architecture boundary check), recorded also by
  www_blog_rich_format_20261115.
- Push `11aa5068a` → GitHub Actions run 43666163019 (CD — www-reading-advantage):
  success. Run 43666163008 (CD — apps): success. CI run 43666163024: failure
  from the same pre-existing causes. The touched files pass eslint locally.
- Live captures reviewed in /tmp/opencode/a59/live/ (products en/th, blog
  posts en/th, blog index en/th, at 1280 px and 390 px, with 8 s viewport and
  full-page shots): nothing hidden, faded, blurred, or empty.
