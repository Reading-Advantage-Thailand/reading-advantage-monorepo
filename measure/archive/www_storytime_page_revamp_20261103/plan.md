# Implementation Plan: www Storytime Advantage page revamp

> **Track ID:** `www_storytime_page_revamp_20261103` · **Spec:** [spec.md](./spec.md)
> **Branch:** `www/storytime-page-revamp` in `/home/daniebo/Desktop/rama-worktrees/www-storytime-page`.

## Rules

- PM 2026-11-03: light lane. One maker, one checker later, then Daniel's look check.
- No spec review, strategy, Red/Green split, or Reviews A/B/C apply.
- Markers: `[ ]` pending, `[~]` active, `[x]` done, `[b]` human gate.
- Tests run only for files touched. Heavy commands use `HEAVY_PREFLIGHT_WAIT_S=3600` and `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
- Use `../../node_modules/.bin/<tool>`. Exit 75 means memory refusal; wait and retry once.
- Commit by path. Do not use `git add -A`, do not commit `graph.db`, do not push, merge, or deploy. The merge, push, and deploy of task 1.8 ran under Daniel's gate.
- Commit headers are lower case, at most 100 characters, and include `(track_id: www_storytime_page_revamp_20261103)`.

## Phase 1: Storytime Advantage page

- [x] 1.0 Receive hand-off. Test: AC-1, AC-3, AC-5. PM hand-off at 19:06 ICT closes this task. Track update committed as `2fad5973b`. Inputs: `/home/daniebo/Desktop/handoff/a45-storytime-www-images/` (10 PNG files and `MANIFEST.txt`; SHA-256 checked at source and copy), copy v0.4 from advantage-pr commit `9b5e1743`, Thai copy v0.1 from `4f8fcbde`, and image list v0.2 from `84b07643`. Image list contains 10 assets. The cast sheet is removed; the `classroomAlt` slot stays empty. Hand-off files are read-only.
- [x] 1.1 Record image source checks and crops. Test: AC-3, AC-4. Done in commit `25ab29720`. `sha256sum` matched all 10 manifest entries. `../../node_modules/.bin/tsx scripts/crop-storytime-page-images.ts --manifest /home/daniebo/Desktop/handoff/a45-storytime-www-images/MANIFEST.txt` exited 0 and wrote 10 lossless WebP files at the sizes below. No source PNG files entered the repository.
- [x] 1.2 Build the page and locale strings from the source copy. Test: AC-1, AC-5, AC-6, AC-7, AC-12, AC-13, AC-15. Done in commits `ccb627bc0` and `2777798e5`. Output: 3 locales, 7 containers, 10 images, and two `/contact` links. No task-specific test ran; task 1.3 ran the changed tests.
  - Command: `git diff --check` — exit 0.
  - Command: `git add 'apps/www-reading-advantage/src/app/[locale]/(marketing)/products/storytime-advantage/page.tsx' apps/www-reading-advantage/src/locales/pages/products/storytime-advantage.ts measure/tracks/www_storytime_page_revamp_20261103/spec.md && git commit -m "feat(www): rebuild storytime product page (track_id: www_storytime_page_revamp_20261103)"` — exit 0; 3 files changed.
  - Command: `git add 'apps/www-reading-advantage/src/app/[locale]/(marketing)/products/storytime-advantage/page.tsx' apps/www-reading-advantage/src/locales/pages/products/storytime-advantage.ts measure/tracks/www_storytime_page_revamp_20261103/spec.md && git commit -m "fix(www): align storytime copy to handoff (track_id: www_storytime_page_revamp_20261103)"` — exit 0; 4 files changed.
- [x] 1.3 Add and update the requested tests. Test: AC-1, AC-6, AC-7, AC-12, AC-13, AC-14, AC-15. Done in commit `a18578146`. Heavy-run test command exited 0: `../../node_modules/.bin/vitest run --maxWorkers=1 "src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx" "src/app/[locale]/(marketing)/products/storytime-advantage/page.test.tsx" src/lib/__tests__/storytime-page-images.test.ts src/__tests__/phase-2-seo-remaining-static.red.test.ts src/lib/__tests__/phase-w3-claims.test.ts`. Five files passed; 42 tests passed.
- [x] 1.4 Run focused gates. Test: AC-8. Done in commit `7774e808f`. Initial ESLint exited 1 on 9 raw-color errors. The final ESLint and typecheck passed with exit 0.
  - Command: `../../node_modules/.bin/eslint --no-warn-ignored scripts/crop-storytime-page-images.ts "src/app/[locale]/(marketing)/products/storytime-advantage/page.tsx" "src/locales/pages/products/storytime-advantage.ts" src/__tests__/fixtures/storytime-page-expected.ts "src/app/[locale]/(marketing)/products/storytime-advantage/page.test.tsx" "src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx" src/lib/__tests__/storytime-page-images.test.ts src/__tests__/phase-2-seo-remaining-static.red.test.ts src/lib/__tests__/phase-w3-claims.test.ts` — exit 0.
  - Command: `../../node_modules/.bin/tsc --noEmit` — exit 0.
  - The crop script is ignored by ESLint. The initial ESLint run reported 9 errors; the corrected run reported 0 errors.
- [x] 1.5 Build, start, and capture. Test: AC-5, AC-9. Done in commits `e0dc1ea31` and `d9e696b9a`. The final build and 10 captures passed in one heavy-run call (exit 0). All pages returned HTTP 200. The Storytime route loaded 10 images and had no horizontal overflow at each viewport. The wrapper stopped the server using its `ss` PID.
  - Commands: `../../node_modules/.bin/next build` — exit 0; `../../node_modules/.bin/next start --port "$PORT"` — started successfully; `timeout 15m node scripts/capture-storytime-page.mjs` — exit 0.
  - Storytime captures: `en-desktop.png`, `en-phone.png`, `th-desktop.png`, `th-phone.png`. BEFORE captures: `en-products-desktop.png`, `th-products-desktop.png`, `en-nav-desktop.png`, `th-nav-desktop.png`, `en-home-desktop.png`, `th-home-desktop.png`.
  - The prior capture retry exited 1 because it counted site header and footer images. The script now scopes image checks to Storytime sections. A missing `timeZone` in the shared client locale provider caused `ENVIRONMENT_FALLBACK`; both locale config and provider now use `Asia/Bangkok`. The final server log has no fallback error. Primary already uses this zone. The existing standalone-output warning remains.
- [x] 1.6 Record evidence and commit. Test: AC-8, AC-9, AC-14. The earlier capture commit is `e0dc1ea31`; the plan evidence commit is `d9e696b9a`. The branch committed by path and did not include `graph.db`.
- [x] 1.7 Daniel's look check and Thai check. Test: AC-10. Recorded in commit `db52712f8`. Daniel, 2026-11-04, through the PM: "Approved" (look, every Thai line; FAQ answer 5 keeps the English sentence; zh drafts go live, a contracted Chinese speaker checks them after).
- [x] 1.8 Merge or deploy. Test: AC-11. The merge into master is commit `dd1c4133f` (`chore(www): merge the storytime page revamp`). The PM ran `git push origin dd1c4133f:master` (`7db52a49d..dd1c4133f`) on Daniel's word: "You need to push because I'm not at the computer". The CD run `41737286738` ("CD — www-reading-advantage") at `dd1c4133f` passed at 06:24 ICT on 2026-11-04. The live check at 07:11:15 ICT on 2026-11-04 passed on https://www.reading-advantage.com for en and th, desktop and phone: HTTP 200, 10 of 10 images decode and render, no horizontal overflow, both CTA buttons open `/en/contact` and `/th/contact`, and the phone hero badge sits below the header. The products card and the home roadmap card show the new copy. The 12 captures are in `/home/daniebo/Desktop/a45-www-storytime-captures/live-20261104/`. The CI run `41737286699` at `dd1c4133f` failed only on the step "Architecture boundary check". The same step failed at `7db52a49d` before the push. Track A-32 owns that step.
- [x] 1.9 Fix checker round 1 findings. Test: AC-1, AC-4, AC-6, AC-8, AC-9, AC-14. Done in code commit `89bd28e4e`; this evidence is committed separately. F1 checks 49 rendered strings per locale, image alts, auxiliary locale copy, and old roadmap values. F2 uses one scanner for 25 term classes, controls, and page copy. F3 uses crop `520, 840, 2880, 2160`; the leftmost raised hand remains visible. F4-F5 and F7 are fixed. F6 and F8 are unchanged. The requested tech-debt row is committed by path.
  - Crop command: `../../node_modules/.bin/tsx scripts/crop-storytime-page-images.ts --manifest /home/daniebo/Desktop/handoff/a45-storytime-www-images/MANIFEST.txt` — exit 0; 10 images written.
  - Test command: `../../node_modules/.bin/vitest run --maxWorkers=1 "src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx" src/lib/__tests__/storytime-page-images.test.ts` — exit 0; 2 files and 38 tests passed.
  - ESLint command: `../../node_modules/.bin/eslint --no-warn-ignored scripts/crop-storytime-page-images.ts scripts/capture-storytime-page.mjs src/__tests__/fixtures/storytime-page-expected.ts "src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx" "src/app/[locale]/(marketing)/products/storytime-advantage/page.tsx" src/lib/__tests__/storytime-page-images.test.ts src/locales/pages/products/storytime-advantage.ts` — exit 0.
  - Typecheck command: `../../node_modules/.bin/tsc --noEmit` — exit 0.
  - Build command: `../../node_modules/.bin/next build` — exit 0; compile and typecheck passed. `../../node_modules/.bin/next start --port "$PORT"` started successfully. Capture command: `timeout 15m node scripts/capture-storytime-page.mjs` — exit 0; 10 captures written, HTTP 200 for all 10.
  - Cover image test confirms crop pixels, 960×720 output, and lossless encoding. The image was viewed once; the leftmost raised hand is not cut.
- [x] 1.10 Fix lazy-image capture verification. Test: AC-9. Done in commit `62fe7d40e`. The script now scrolls each Storytime page from top to bottom before capture. It awaits `decode()` for all 10 section images and requires `naturalWidth > 0`. The four Storytime captures were viewed; all 10 images show in each. The six BEFORE captures were also overwritten. `.next` matched the current app source, so the build was skipped.
  - Heavy-run command: `../../node_modules/.bin/next start --port "$PORT"` — started successfully; `timeout 15m node scripts/capture-storytime-page.mjs` — exit 0; wrapper stopped the server by PID from `ss`.
  - Result: 10 captures returned HTTP 200. Four Storytime captures passed 40 image decode and width checks total; no image failed. The six BEFORE capture files were also written. The final capture output directory contains all 10 expected PNG files.
  - Visual check: `en-desktop.png`, `en-phone.png`, `th-desktop.png`, and `th-phone.png` each show the hero, cover, two reader covers, and all six week images.
- [x] 1.11 Apply Storytime label handoff round 2. Test: AC-1, AC-6, AC-8, AC-9. Done in commits `14427dd50` and `5b0dc59a2`. The product card, navigation, home section, Storytime home status, and products overview card use the hand-off copy. The overview CTA labels remain unchanged. Both Storytime logos use the hand-off SVGs. The phone hero badge clears the fixed header at 390 px and 360 px. PM addition (03:38 ICT): improve Storytime image paint checks and recapture the eight final views before Daniel's check.
  - Focused test: `../../node_modules/.bin/vitest run --maxWorkers=1 "src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx"` — exit 0; 1 file and 38 tests passed.
  - ESLint: `../../node_modules/.bin/eslint --no-warn-ignored scripts/capture-storytime-page.mjs src/__tests__/fixtures/storytime-page-expected.ts "src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx" "src/app/[locale]/(marketing)/products/storytime-advantage/page.tsx" "src/app/[locale]/(marketing)/(home)/page.tsx" src/components/products/b2b-solutions.tsx src/config/navigation.ts src/locales/components/common/navigation.ts src/locales/components/products/b2b-solutions.ts src/locales/pages/home.ts` — exit 0.
  - Typecheck: `../../node_modules/.bin/tsc --noEmit` — exit 0.
  - Production run: `../../node_modules/.bin/next build` — exit 0; `next start` started; `timeout 15m node scripts/capture-storytime-page.mjs` — exit 0. The capture wrapper stopped the server by PID from `ss`.
  - Captures in `/home/daniebo/Desktop/a45-www-storytime-captures/after-r2/`: `en-desktop.png`, `en-phone.png`, `th-desktop.png`, `th-phone.png`, `en-phone-top.png`, `th-phone-top.png`, `en-phone-top-360.png`, `th-phone-top-360.png`, `en-products-desktop.png`, `th-products-desktop.png`, `en-nav-desktop.png`, `th-nav-desktop.png`, `en-home-desktop.png`, and `th-home-desktop.png`. All returned HTTP 200; image decoding and `naturalWidth > 0` checks passed. I viewed all 14 captures. The product card shows the new copy and square logo. The home card shows the new preparation label. Phone shots at both widths show the badge clear of the header. The full-page mobile captures show the page imagery.
  - Products overview additions: `gradeRange` and `description` match hand-off section (d) word for word in en, th, and zh. All three `ctaLabel` values remain unchanged. The focused content test passed: 1 file and 40 tests, exit 0. ESLint and `tsc --noEmit` exited 0. The production build exited 0.
  - Paint-race follow-up: the initial checker review found blank story images in `th-phone.png` despite successful decode checks. The final capture sets every image to eager before scrolling, scrolls each Storytime image into view, checks each rendered box, waits two animation frames and 500 ms, then captures. The final combined heavy run built and started the app, captured all eight final views, and stopped the server in the same call. `timeout 15m node scripts/capture-storytime-page.mjs` exited 0. All eight returned HTTP 200. Each Storytime view passed 10 image decode, natural-width, and non-zero rendered-box checks. Each overview view decoded 12 images with `naturalWidth > 0`. I viewed all eight final captures; all six story images show in each Storytime capture. The overview cards show the new English and Thai copy.
  - Final captures: `en-desktop.png`, `en-phone.png`, `th-desktop.png`, `th-phone.png`, `en-overview-desktop.png`, `th-overview-desktop.png`, `en-overview-phone.png`, and `th-overview-phone.png`. The capture mode wrote only these eight files and preserved the other `after-r2/` captures.
  - Defaults: Thai and zh remain drafts pending their checks. Only the named Storytime logos changed. F6 and F8 remain unchanged. Round 2 captures stay under `after-r2/`.
- [x] 1.12 Close the checker finding F12 and merge the branch. Test: AC-1, AC-6, AC-8. Done in commit `db52712f8`. The merge into master is `dd1c4133f`. The overview content test now runs for en, th, and zh. The zh overview copy matches hand-off section (d) word for word. The zh strings stay a draft until a contracted Chinese speaker checks them.
  - Test command: `../../node_modules/.bin/vitest run --maxWorkers=1 "src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx"` — exit 0; 1 file and 41 tests passed.
  - Changed files: the storytime page content test and this plan. The zh strings in the fixture were already present.

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
| `level-2-unit-1-cover-art.png` | `520, 840, 2880, 2160` | `960×720` | `level-2-unit-1-cover-art.webp` |
| `week-01-reader-hello-cover.png` | `0, 0, 4000, 3000` | `480×360` | `week-01-reader-hello-cover.webp` |
| `week-01-reader-nan-can-nod-cover.png` | `0, 0, 4000, 3000` | `480×360` | `week-01-reader-nan-can-nod-cover.webp` |

## Handoff defaults

- Both CTA buttons link to `/contact`.
- FAQ A5 stays in English in the Thai page. The PM asks Daniel during the look check.
- No games section or demo section appears.
- The missing `classroomAlt` image slot stays empty.

## Out of scope

- Any further push, merge, or deploy after task 1.8.
- New copy outside the named source files.
- A Storytime app build.
