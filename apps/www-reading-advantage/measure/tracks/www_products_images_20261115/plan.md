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

## Phase 6: Deploy and verify
- [~] Rebase on origin/master, rerun gates if it moved, push
  `HEAD:master` (www-only push, standing-approved 2026-11-15).
- [ ] Watch the GitHub Actions www deploy run.
- [ ] Capture live /en/products and /th/products at 1280 px and 390 px, plus
  the two blog post locales at both widths, into /tmp/opencode/a59/live/ and
  review.
