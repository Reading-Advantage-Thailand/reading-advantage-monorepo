# Plan: www products page photos

Track: `www_products_photos_20261115` (light lane).
Author model: claude-code/claude-sonnet-5-5
Revised by: opencode-go/deepseek-v4.1-flash (spec review r1 fixes)

## Phase 1: Photo checks, then the remaining fixes

- [x] 1.1 Red: write the AC-1 e2e, the AC-2 unit test, and the AC-3 wiring. The wiring has two parts:
  the steps of the `ci.yml` job `affected` for `www-reading-advantage`, and the steps of
  `cd-www-reading-advantage.yml` before the deploy step. Prove each test by a failing run at
  `8193625ca^` (hero, product photos) and a failing run at HEAD for what is still wrong (the covered
  photo, the Tutor section, the squeezed pictures at 1024 px, the home hero). The wiring fails on
  current code, because the e2e that it runs fails there. Commit the tests and the failing runs
  before any Green change.

  Commit `4c48a8b12` holds the tests, the two workflows, and the AC-1 rule text. Evidence is in
  `measure/runs/www_products_photos_20261115/red-p1-40419d4bc.log`.

  - Tests: `apps/www-reading-advantage/e2e/photos.spec.ts` (56 cases) and the new case in
    `src/components/marketing/hero-section.test.tsx`.
  - Run at HEAD `40419d4bc` through `heavy-run.sh`: `pnpm exec next build` exit 0;
    `next start -p 3123` answered 200; `playwright test e2e/photos.spec.ts` exit 1.
  - Failing cases at HEAD, by name:
    - `home en 390 px` and `home th 390 px`: `workbook-tablet-cutaway-800.webp` is 40 percent
      covered. The photo passes at 980, 1024, and 1280 px. (Spec evidence line corrected to 40.)
    - `/products` photo cases at 390, 980, 1024, and 1280 px, en and th: `blended-learning.png` is
      100 percent covered.
    - `/products` block cases at 390, 980, and 1280 px, en and th: the Tutor section shows no photo.
    - `/products` block cases at 1024 px, en and th: the Tutor section shows no photo, and
      `primary-origins-2-cover.webp`, `reading-origins-2-cover.webp`, and `tutor-flashcard.webp`
      break the 5 percent aspect rule (deviation 15.2, 15.2, and 22.2 percent).
  - `/services/blended-learning` passes at all four widths: its hero is a HeroSection floating image
    with no overlay. The covered instance of the same file sits on `/products` and fails there.
  - Unit test at HEAD: passes, because the hero fix is in `8193625ca`.
  - Pre-fix proof at `8193625ca^` (`705a9ad60`) in a temporary worktree: the hero unit test fails with
    `AssertionError: expected [ 'div.hidden' ] to deeply equal []`. The e2e pre-fix run was skipped to
    keep the run cost down. The unit test proves the hero regression. The product-picture case fails
    at HEAD for the Tutor section.
- [x] 1.2 Green: fix what is still wrong (AC-4). The draft in the commit `8193625ca` stays.

  Implementation commit `b09e21f32`. Role base `5f197fd99`; phase base `40419d4bc`.
  - Report-results card: the picture sits above the text in a flow layout, with no overlay. The
    card stays stacked at every width, because the grid cell is one third wide at `lg` (deviation
    from "beside the picture from `lg`"; no text covers the photo).
  - Tutor section: `tutor-flashcard.webp` through `ProductPicture`, with a localized alt in en,
    th, and zh (`imageAlt`).
  - Portrait pictures: `w-full max-w-48 h-auto`, so the natural ratio holds.
  - Home hero: the Mastery card sits under the photo below `lg` and overlaps a corner from `lg`.
  - Green gate (heavy-run, `next build`, `next start -p 3123`, `playwright test e2e/photos.spec.ts`):
    exit 0. Log: `measure/runs/www_products_photos_20261115/green-p1-5f197fd99-gate.log`.
  - Vitest on the touched www tests, `tsc --noEmit`, and `eslint` on the touched files: exit 0.
    Log: `measure/runs/www_products_photos_20261115/green-p1-5f197fd99-checks.log`.
  - Captures at 390, 980, 1024, and 1280 px of `/en/products`, `/th/products`, and `/en` were
    read by the Green session: no text sits on a photo and no picture looks squeezed.
    Captures are in `/tmp/opencode/a62-green/` (not committed).
  - Note: a stale `next start` from the Red run held port 3123 and served the old build in the
    first two gate runs. The Green gate run named above ran on a free port against the final tree.
- [ ] 1.3 Review and live render check at 390, 980, 1024, and 1280 px, en and th. Look at each
  capture. Every photo shows at least 85 percent.
- [ ] 1.4 Push to www master (standing approval), watch the www CD run, and run the PM page check
  (`scripts/jobs/page-check`) before Daniel gets the link.

## Test strategy

- Unit (AC-2): `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd apps/www-reading-advantage && pnpm exec vitest run src/components/marketing/hero-section.test.tsx --maxWorkers=1'`.
- E2E (AC-1), Red and Green: build the app, start it, and run the spec against it, all through
  heavy-run.sh:
  `bash .../heavy-run.sh -c 'cd apps/www-reading-advantage && pnpm exec next build && (pnpm exec next start -p 3123 & sleep 8; BASE_URL=http://localhost:3123 pnpm exec playwright test e2e/photos.spec.ts)'`.
  The Chrome path on this machine is `/opt/google/chrome/chrome` (use `channel: "chrome"`).
- Type check and lint: `pnpm exec tsc --noEmit` and `pnpm exec eslint <touched files>` in the www app.

## Runner facts (checked at `8193625ca`)

- `apps/www-reading-advantage` has `playwright.config.ts` (testDir `./e2e`, chromium project, the
  script `test:e2e`) and an `e2e/` folder with 5 specs. `BASE_URL` skips the dev web server.
- No workflow runs these specs on a push. `capture-real-logos.yml` (dispatch only) runs one spec.
  It installs Chrome with `pnpm --filter www-reading-advantage exec playwright install --with-deps chromium`.
- The job that checks a www push is `ci.yml`, job `affected` ("Check www-reading-advantage"). It
  runs `pnpm turbo run build lint check-types test --filter=www-reading-advantage...`. The job
  `Build, Lint, and Test` does not test www.
- The www CD workflow (`cd-www-reading-advantage.yml`) does not wait for CI: the `deploy` job needs
  only `select`. A red CI run does not stop a deploy. `ci.yml` is red on master for an unrelated
  cause, the architecture check, so a "CD needs CI" link would stop every www deploy. The e2e gate
  goes into the CD job itself.
- AC-3 plan, part (a): add steps to the `affected` job, only when the matrix id is
  `www-reading-advantage`: install Chrome with
  `playwright install --with-deps chromium`, start `next start -p 3123` in the background after the
  build, wait for the port, and run
  `BASE_URL=http://localhost:3123 pnpm --filter www-reading-advantage exec playwright test e2e/photos.spec.ts`.
- AC-3 plan, part (b): add the same Chrome install and e2e steps to the `deploy` job of
  `cd-www-reading-advantage.yml`, before "Submit Cloud Build". Build the app in that job. Start the
  build with `next start -p 3123`. Run the spec. A failing e2e stops the deploy. Daniel gets no link
  until task 1.4 passes. (spec review r2, F5: the standalone `server.js` option needs a copy of
  `public/` and `.next/static`, so the wiring names `next start -p 3123` only.)

## Facts to check in Red

- A decorative image (empty alt, such as the home `texture-warm` background) is excluded from AC-1.
  Confirm the alt text of each excluded image in task 1.1.
