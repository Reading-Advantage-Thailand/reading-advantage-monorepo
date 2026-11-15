# Plan: www products page photos

Track: `www_products_photos_20261115` (light lane).
Author model: claude-code/claude-sonnet-5-5

## Phase 1: Photo checks, then the remaining fixes

- [ ] 1.1 Red: write the AC-1 e2e, the AC-2 unit test, and the AC-3 CI step. Prove each test by a
  failing run at `8193625ca^` (hero, product photos) and a failing run at HEAD for what is still
  wrong (the covered photo, the Tutor section, the squeezed pictures at 1024 px, the home hero).
  Commit the tests and the failing runs before any Green change.
- [ ] 1.2 Green: fix what is still wrong (AC-4) and add the CI wiring support that Red needs
  (a `next start` step and the Chrome install). The draft in the commit `8193625ca` stays.
- [ ] 1.3 Review and live render check at 390, 980, 1024, and 1280 px, en and th. Look at each
  capture. Every photo shows at least 85 percent.
- [ ] 1.4 Push to www master (standing approval), watch the www CD run, and run the PM page check
  (`scripts/jobs/page-check`) before Daniel gets the link.

## Test strategy

- Unit (AC-2): `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd apps/www-reading-advantage && pnpm exec vitest run src/components/marketing/hero-section.test.tsx src/__tests__/products-page-pictures.red.test.tsx --maxWorkers=1'`.
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
- The www CD workflow does not wait for CI. A red CI run does not stop a deploy.
- AC-3 plan: add steps to the `affected` job, only when the matrix id is `www-reading-advantage`:
  install Chrome, start `next start -p 3123` in the background after the build, wait for the port,
  and run `BASE_URL=http://localhost:3123 pnpm --filter www-reading-advantage exec playwright test e2e/photos.spec.ts`.
  Task 1.2 decides whether the check also runs before the CD deploy.

## Facts to check in Red

- A decorative image (empty alt, such as the home `texture-warm` background) is excluded from AC-1.
  Confirm the alt text of each excluded image in task 1.1.
