# Plan: Experience Primary Advantage

## Phase 1: Demo build in the site
- [x] Task: Build the demo in advantage-forge (`scripts/demo-embed.sh`) into `public/experience/`.
- [x] Task: Check that only the four bank stories are in the build.

## Phase 2: Page section
- [x] Task: Add the `experience` text in en, th, zh (`src/locales/pages/products/primary-advantage.ts`).
- [x] Task: Add the client component `src/components/marketing/experience-demo.tsx` (poster, lazy iframe, full screen link).
- [x] Task: Add the section to the page after the hero.
- [x] Task: Add a test for the component.

## Phase 3: Verify
- [x] Task: Type check, lint, and tests pass.
- [x] Task: Check the page in a browser (desktop width; the frame loads the demo).
- [ ] Task: Decide where the 30 MB demo build lives (committed in `public/experience/`, or copied at deploy time).
- [ ] Task: Check the page at phone width and with Thai and Chinese text.
