# Implementation Plan: www Storytime Advantage page revamp

> **Track ID:** `www_storytime_page_revamp_20261103` · **Spec:** [spec.md](./spec.md)
> **Branch:** `www/storytime-page-revamp` in `/home/daniebo/Desktop/rama-worktrees/www-storytime-page`.

## Rules

- PM 2026-11-03: light lane. One maker, one checker later, then Daniel's look check.
- No spec review, strategy, Red/Green split, or Reviews A/B/C apply.
- Markers: `[ ]` pending, `[~]` active, `[x]` done, `[b]` human gate.
- Tests run only for files touched. Heavy commands use `HEAVY_PREFLIGHT_WAIT_S=3600` and `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
- Use `../../node_modules/.bin/<tool>`. Exit 75 means memory refusal; wait and retry once.
- Commit by path. Do not use `git add -A`, do not commit `graph.db`, do not push, merge, or deploy.
- Commit headers are lower case, at most 100 characters, and include `(track_id: www_storytime_page_revamp_20261103)`.

## Phase 1: Storytime Advantage page

- [x] 1.0 Receive hand-off. Test: AC-1, AC-3, AC-5. PM hand-off at 19:06 ICT closes this task. Track update committed as `2fad5973b`. Inputs: `/home/daniebo/Desktop/handoff/a45-storytime-www-images/` (10 PNG files and `MANIFEST.txt`; SHA-256 checked at source and copy), copy v0.4 from advantage-pr commit `9b5e1743`, Thai copy v0.1 from `4f8fcbde`, and image list v0.2 from `84b07643`. Image list contains 10 assets. The cast sheet is removed; the `classroomAlt` slot stays empty. Hand-off files are read-only.
- [x] 1.1 Record image source checks and crops. Test: AC-3, AC-4. Done in commit `25ab29720`. `sha256sum` matched all 10 manifest entries. `../../node_modules/.bin/tsx scripts/crop-storytime-page-images.ts --manifest /home/daniebo/Desktop/handoff/a45-storytime-www-images/MANIFEST.txt` exited 0 and wrote 10 lossless WebP files at the sizes below. No source PNG files entered the repository.
- [x] 1.2 Build the page and locale strings from the source copy. Test: AC-1, AC-5, AC-6, AC-7, AC-12, AC-13, AC-15. Done in commits `ccb627bc0` and `2777798e5`. English and Thai use the supplied source files; `zh` uses English. The two CTA links use `/contact`. No games or demo section appears. Old roadmap copy and stock image references left the page.
- [x] 1.3 Add and update the requested tests. Test: AC-1, AC-6, AC-7, AC-12, AC-13, AC-14, AC-15. Done in commit `a18578146`. Heavy-run test command exited 0: `../../node_modules/.bin/vitest run --maxWorkers=1 "src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx" "src/app/[locale]/(marketing)/products/storytime-advantage/page.test.tsx" src/lib/__tests__/storytime-page-images.test.ts src/__tests__/phase-2-seo-remaining-static.red.test.ts src/lib/__tests__/phase-w3-claims.test.ts`. Five files passed; 42 tests passed.
- [~] 1.4 Run focused gates. Test: AC-8. Run ESLint on changed files and check-types for the www app through heavy-run.
- [ ] 1.5 Build, start, and capture. Test: AC-5, AC-9. Run `next build` and `next start` through heavy-run on a free port. Capture full-page en and th pages at desktop width 1440 and phone width 390 in `/home/daniebo/Desktop/a45-www-storytime-captures/`. Check image loads and horizontal overflow. Stop the server by PID found with `ss -ltnp` for its port.
- [ ] 1.6 Record evidence and commit. Test: AC-8, AC-9, AC-14. Record commands, exit codes, test counts, image checks, and capture names here. Commit changed paths only. Keep each commit on this branch.
- [b] 1.7 Daniel's look check and Thai check. `deferred:daniel-look`. Test: AC-10.
- [b] 1.8 Merge or deploy. `deferred:daniel`. Test: AC-11. This maker does not merge or deploy.

## Crop decisions

Crop boxes use source pixels in `x, y, width, height` order. Output dimensions are pixels. The initial crop policy uses the full 4:3 image when the component keeps that ratio; otherwise crop to the observed page slot after inspecting source images.

| Source file | Crop box | Output size | Target |
|---|---:|---:|---|
| `week-01-hello-pip.png` | `0, 0, 4000, 3000` | `1200×900` | `week-01-hello-pip.webp` |
| `week-02-how-many-cakes.png` | `0, 0, 4000, 3000` | `900×675` | `week-02-how-many-cakes.webp` |
| `week-03-it-is-red.png` | `0, 0, 4000, 3000` | `900×675` | `week-03-it-is-red.webp` |
| `week-04-nan-and-pam-nap.png` | `0, 0, 4000, 3000` | `900×675` | `week-04-nan-and-pam-nap.webp` |
| `week-05-two-ears.png` | `0, 0, 4000, 3000` | `900×675` | `week-05-two-ears.webp` |
| `week-06-i-see-a-cat.png` | `0, 0, 4000, 3000` | `900×675` | `week-06-i-see-a-cat.webp` |
| `week-07-top-on-a-pot.png` | `0, 0, 4000, 3000` | `900×675` | `week-07-top-on-a-pot.webp` |
| `level-2-unit-1-cover-art.png` | `0, 0, 4000, 3000` | `960×720` | `level-2-unit-1-cover-art.webp` |
| `week-01-reader-hello-cover.png` | `0, 0, 4000, 3000` | `480×360` | `week-01-reader-hello-cover.webp` |
| `week-01-reader-nan-can-nod-cover.png` | `0, 0, 4000, 3000` | `480×360` | `week-01-reader-nan-can-nod-cover.webp` |

## Handoff defaults

- Both CTA buttons link to `/contact`.
- FAQ A5 stays in English in the Thai page. The PM asks Daniel during the look check.
- No games section or demo section appears.
- The missing `classroomAlt` image slot stays empty.

## Out of scope

- Push, merge, and deploy.
- New copy outside the named source files.
- A Storytime app build.
