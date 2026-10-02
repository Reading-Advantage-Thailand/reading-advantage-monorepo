# Spec: www asset pipeline

Source: `advantage-pr/assets`. Destination: `public/media/`. Image optimization is off in `next.config.ts` (`unoptimized: true`), so the script ships two WebP sizes (800 and 1600 wide).

## Rules
1. Include only assets with no people, or with AI-made abstract art, UI screenshots, game art, and logos.
2. Exclude: competitor ads, stock photos, the Tutor payout and tax diagram, images with a white Western teacher, founder placeholders, and the founders-at-event photo (child's face; no consent record).
3. Classroom images (Thai students in uniform) wait until Daniel confirms they are AI-made or have consent. Not copied in this track.
4. Chibi Quest art is tagged `primary` and `tutor` only.
5. No GSE, Pearson, or YLE text in any asset. Reading Advantage screenshots are dated June 2026 and carry no school-use claim.
6. Output is reproducible: `scripts/build-site-assets.py` writes the files and `src/lib/site-assets.ts`.

## Acceptance
- Each image under 400 KB at 1600 wide; each video under 5 MB.
- `check-types`, `lint`, and tests pass.

## Excluded after review
- `2026-08-15-mastery-advantage-explainer.mp4`: on-screen "our quality guarantee" and "Retain longer · Review less". Re-render before use.
