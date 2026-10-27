# Plan — Real Advantage logos on the www site

Starts after the Primary cutover blockers (feature freeze until the Primary deployment).

## Phase 1: Files and mapping
- [x] Copy `vector/horizontal`, `vector/horizontal-dark-inverse`, and `vector/square` for the ten products into `public/media/brand/logos/` (1e7948a8e)
- [x] Point `site-assets.ts` `color` and `reversed` at the new files; replace the `public/*.png` product images with `vector/square` (1e7948a8e)
- [x] Favicon from `png/favicon/reading-advantage.ico` (1e7948a8e)
- [x] `thaiLockup` → `vector/lockup-thai` (approved 2026-10-08), with the dark and dark-inverse files (1e7948a8e)
- [x] Test: every logo path in `site-assets.ts` exists under `public/`; no reference to a removed placeholder (1e7948a8e)
  - Red (mid-red, phase_base_sha `8f849e390`): exit 1, 59 failed / 3 passed (62). Failures are the expected Red causes, no import/config error. Mapping (33): all 30 color/reversed/thaiLockup fields still point at `/svg/`, `/reversed/`, `/lockups/` instead of `vector/horizontal`, `vector/horizontal-dark-inverse`, `vector/lockup-thai`; the 3 removed-kind sweeps hit. References (23): 11 removed-literal hits (svg/reversed/lockups + 8 rasters in `b2b-solutions.tsx` and product pages), placeholder dirs and 8 rasters still present, `vector/square/` missing. Favicon (3 of 5): `src/app/[locale]/favicon.ico` (25931 B) and `public/favicon.ico` (15406 B) are not byte-identical and neither is 6507 B; ICO magic `00 00 01 00` already correct (2 pass). Command: `pnpm vitest run --maxWorkers=1 src/lib/__tests__/real-logos-{mapping,references,favicon}.red.test.ts`.
  - Green (jr-green, role_base_sha `b1e673eb9`): exit 0, 64 passed (64) — the three Red files plus `site-assets.test.ts`. Command: `pnpm vitest run --maxWorkers=1 src/lib/__tests__/real-logos-{mapping,references,favicon}.red.test.ts src/lib/__tests__/site-assets.test.ts`. `pnpm check-types` exit 0. `pnpm lint` exit 1, pre-existing: the 146 errors all sit in minified `public/experience/assets/*.js` bundles; every file this track touched lints clean. `pnpm build` exit 0. `phase-3-group-b-types.test.ts` and `phase-3-i18n.red.test.ts` exit 0 (10 passed) after the b2b logo source moved to `siteLogos.reading.square`.

## Phase 2: Checks
- [x] Browser captures of the header, footer, and product pages (light and dark) to PR and Daniel (7453eba9d)
  - Red (mid-red, phase_base_sha `338507317`): exit 1, 15 failed / 3 passed (18). Each failure message is `missing capture file: <name>`. The run has no import error. The run has no config error. The 3 passes are the repo-root check and the two name anchors. Those passes do not assert that a capture file exists. Command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/www-real-logos/apps/www-reading-advantage && timeout 900 pnpm vitest run --maxWorkers=1 src/lib/__tests__/real-logos-captures.red.test.ts'`.
  - Green (jr-green, role_base_sha `3c0c1e085`): the same vitest command exits 0, 18 passed (18), all 15 named PNGs non-empty with PNG magic. Capture command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd .../apps/www-reading-advantage && (timeout 900 pnpm exec next start -p 3123 &); ... BASE_URL=http://localhost:3123 pnpm exec playwright test e2e/real-logos-captures.spec.ts --workers=1 --reporter=list; fuser -k 3123/tcp'` — CAPTURE_EXIT=0, 16 passed (16): the favicon check and the 15 captures. Server and captures ran in one heavy-run command; the server stops in the same command. No rebuild was needed: the diff against `apps/www-reading-advantage/src` (page source) is empty, so the Phase 1 build serves the same pages; the 5 files the wider diff lists are the e2e spec, `playwright.config.ts`, and the locale favicon copies.
  - Remediation (green r2, role_base_sha `cf13c7b9d`, reviews A and C at cf13c7b9d): decision 1 — the old en-home-light.png showed the header and hero, and the old en-products-light.png showed the /products hero. The spec now scrolls the home product card grid (`[data-testid^="home-live-"]`, the color horizontal lockups) and the /products b2b card grid (the "Printed Workbooks and a Digital Twin" section, the square logos) into the 1280x800 viewport before the screenshot. The 15 names and the Red test stay unchanged; the header still appears in en-home-footer-light and every product page. Capture command rerun: CAPTURE_EXIT=0, 16 passed (16); GREEN_TEST_COMMAND rerun: exit 0, 18 passed (18). Capture commit `7453eba9d`. Decision 4 — out of scope, no change: the /products hero subtitle is almost invisible (`hero-section.tsx`, pre-existing); the capture spec header comment now records that a later `pnpm test:e2e` run rewrites the committed PNGs.
  - Deviation: the strategy names `pnpm test:e2e` as the Red command. This phase uses the targeted vitest file above. The whole Playwright suite is broader than this phase.
  - Deviation: the capture set is the 15 named files below. Viewport is 1280x800. Do not capture the full page. The dark pair uses `prefers-color-scheme: dark`. The site has no theme switch.
  - Deviation: `playwright.config.ts` now reads `BASE_URL` and skips its own dev `webServer` when it is set. Green runs against `next start -p 3123` through that variable. Default behavior without `BASE_URL` is unchanged.
  - Deviation: the built app 404s `/{locale}/favicon.ico`. Next serves the `favicon.ico` convention only at the root of `app/`; the file at `src/app/[locale]/favicon.ico` is pinned by the Phase 1 favicon Red test, and a route or metadata fix needs a rebuild the disk cannot afford. Green instead copies the 6507-byte ICO to `public/{en,th,zh}/favicon.ico` (commit `b6b23328b`); `next start` serves `public/` at runtime, so no rebuild is needed. All four URLs now return the 6507-byte ICO with ICO magic `00 00 01 00`.
  - Decision (green r2, review A option 1): keep `public/{en,th,zh}/favicon.ico` for now. A later change adds `src/app/favicon.ico` with a rebuild and removes the copies. Open item.
  - Fact (review C): the locale favicon copies reach production only through a new image build. The www deploy is a Cloud Build of `apps/www-reading-advantage` from source, so a deploy includes them.
  - Note: `next start` logs a non-fatal `ENVIRONMENT_FALLBACK` error from the header chunk. Every captured page returns 200 and renders fully. Logged, not fixed in this phase.
  - Note: `bash measure/doctor.sh` fails one check in this worktree: `measure/automation-supervisor.py not found`. The file is absent in the main monorepo too, so the failure is pre-existing and not from this phase. The strategy's documented Phase 2 live gate (captures exist and are non-empty; the capture step checks the ICO and the img-404 rule) passes.
  - Named files under `measure/tracks/www_real_logos_20261008/captures/`:
    - `en-home-light.png` — en home, header and product cards
    - `en-home-footer-light.png` — en home footer, scrolled
    - `en-products-light.png` — en `/products`, b2b cards
    - `en-math-light.png` — en `/products/math-advantage`
    - `en-primary-light.png` — en `/products/primary-advantage`
    - `en-reading-light.png` — en `/products/reading-advantage`
    - `en-science-light.png` — en `/products/science-advantage`
    - `en-stem-light.png` — en `/products/stem-advantage`
    - `en-storytime-light.png` — en `/products/storytime-advantage`
    - `en-zhongwen-light.png` — en `/products/zhongwen-advantage`
    - `en-tutor-light.png` — en `/products/tutor-advantage`, reversed logo on the dark chip
    - `th-home-light.png` — th home
    - `th-primary-light.png` — th `/products/primary-advantage`
    - `en-home-dark.png` — en home, dark preference
    - `en-tutor-dark.png` — en tutor page, dark preference
  - Green saves each named file. Each file must be non-empty. Each file must start with PNG magic `89 50 4E 47`. Do not add a hash.
  - Green capture step also checks the served ICO. `/favicon.ico` must return the new 6507-byte ICO. `/{locale}/favicon.ico` must return the same ICO. The locales are en, th, and zh. Every `<img>` must return a status other than 404.

Open items from Phase 1. These items are not this capture task. Green or a follow-up owns them.
- Color logos still declare width 240 and height 60. The color SVG ratio is now 2.69 to 1.
- `lockup-thai-dark` and `lockup-thai-dark-inverse` have no consumer yet. Daniel approved the copy on 2026-10-08.
- Stale raster names remain in `apps/www-reading-advantage/docs/pages/*.md` and in `todo.md`.
- Old icon PNG files remain. The files are `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, and `android-chrome-512x512.png`. FR-3 names only the `.ico`.
