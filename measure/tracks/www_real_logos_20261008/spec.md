# Spec — Real Advantage logos on the www site

## Why

Every file in `apps/www-reading-advantage/public/media/brand/logos/{svg,reversed,single-color,lockups}/`
is a placeholder: Inter text ("Primary" over "ADVANTAGE"), with no circle and no book. Daniel approved
the real logos on 2026-10-08 (advantage-pr `a6e2eeb`, track `logo_vector_masters_20261007`).

## Source

`~/Desktop/advantage-pr/assets/logos/` at advantage-pr master `e222d0e` (its `README.md` names the file
for each use; the files did not change after `64a6fed`). Ten products:
primary, reading, math, science, stem, storytime, tutor, zhongwen, codecamp, mastery
(`<id>-advantage.svg`). Every SVG has a viewBox, a unique `<title>` id, `role="img"`, outlines only,
no `<text>`, no `<image>`, no external links; 1–35 KB.

## Requirements

- FR-1: `apps/www-reading-advantage/src/lib/site-assets.ts` maps `color` → `vector/horizontal`,
  `reversed` → `vector/horizontal-dark-inverse`.
- FR-2: The 700 px product PNGs in `public/*.png` give way to `vector/square`.
- FR-3: The www favicon uses `png/favicon/reading-advantage.ico` (the company logo is the Reading
  Advantage logo).
- FR-4: `thaiLockup` → `vector/lockup-thai/<id>-advantage.svg` (with `-dark` and `-dark-inverse`).
  Daniel approved the Thai tagline lockups on 2026-10-08 (through PR).
- FR-5: The placeholder files go; no page references a removed path (test).

## Out of scope

- The Primary app logo (`apps/primary-advantage/public/primary-advantage.png`) and its favicon: after
  the Primary cutover and the feature freeze, in a separate change. No change to
  `primary-parity-integration` for this track.
