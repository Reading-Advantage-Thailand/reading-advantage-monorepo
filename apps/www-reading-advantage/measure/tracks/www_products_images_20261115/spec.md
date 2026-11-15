# Spec: www products images stuck faded or blurred

Source: Daniel through the PM orchestrator, task A-59, 2026-11-15.
Page: `https://www.reading-advantage.com/en/products` (and `/th/products`).

## Problem

The owner reports that most images on the products page do not load.
The image URLs answer HTTP 200. A headless capture shows product cards and
the workbook image stuck faded or blurred. The cause is render state
(CSS animation, opacity, blur, lazy loading, or next/image), not missing files.

## Functional requirements

- FR-1: Every image and animated content block on the products page reaches a
  fully visible end state after load, on 1280 px and 390 px viewports, in
  English and Thai.
- FR-2: Content is visible with `prefers-reduced-motion: reduce` and with the
  default motion setting. No element may stay at the animation start state.
- FR-3: The intentional blended-learning treatment keeps a designed look but
  must not read as a broken, unloaded image.
- FR-4: The same defect class is checked on every other www page that uses the
  same classes or components. Pages with the same cause are fixed in this track.
- FR-5: A failing test is written before the fix and passes after it.
- FR-6: The fix is minimal and stays inside the www app plus this track's
  measure files. The globals.css change stays clear of the `@utility prose`
  block that a parallel track edits.

## Acceptance criteria

- Targeted vitest exits 0, including the new regression test.
- `pnpm --filter www-reading-advantage lint` shows no new error, and every
  `shadcn/*` error in touched files is fixed.
- `pnpm --filter www-reading-advantage check-types` exits 0.
- The www production build exits 0.
- Local before/after captures and post-deploy live captures at 1280 px and
  390 px show the images and cards fully visible, and are reviewed by a person
  (the Build session reads the PNGs).

## Blog post hero addition (PM, 2026-11-15)

A render check of `/en/blog/the-forgetting-curve` and `/th/blog/the-forgetting-curve`
showed an empty band of about 800 px under the hero title. Diagnostics prove it
is not a headless artifact and not an animation fault: zero animations, zero
hidden descendants, all images loaded. The cause is `HeroSection` keeping the
70vh `min-h-hero` minimum when the blog routes pass no image.

- FR-7: A compact height option sizes imageless blog heroes to their content,
  with no empty band, at 1280 px and 390 px, in English and Thai.
- FR-8: The post route, the blog index, and the paginated blog index use the
  compact hero. Other section landing pages keep their existing hero design.
- FR-9: Before, after, and live captures cover both blog post locales at
  1280 px and 390 px.

## Out of scope

- Image file replacement, asset pipeline changes, and copy changes.
- The separate blog format work in the parallel A-61 track (already merged at
  `98a23da9d`; this branch rebased onto it).
- Imageless heroes on services and contact pages: same CSS mechanism, but an
  intentional section-landing design and not reported. Recorded as an open risk.
