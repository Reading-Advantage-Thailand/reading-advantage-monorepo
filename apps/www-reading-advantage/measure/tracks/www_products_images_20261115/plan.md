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
- [ ] Targeted vitest (changed files only, --maxWorkers=1) exits 0.
- [ ] www lint exits 0 with no new error and every shadcn/* error fixed in
  touched files (read docs/design-rules.md first).
- [ ] www check-types exits 0.
- [ ] www production build exits 0 (heavy run).
- [ ] Local after-captures at 1280 px and 390 px into /tmp/opencode/a59/after/,
  reviewed.

## Phase 6: Deploy and verify
- [ ] Rebase on origin/master, rerun gates if it moved, push
  `HEAD:master` (www-only push, standing-approved 2026-11-15).
- [ ] Watch the GitHub Actions www deploy run.
- [ ] Capture live /en/products and /th/products at 1280 px and 390 px into
  /tmp/opencode/a59/live/ and review.
