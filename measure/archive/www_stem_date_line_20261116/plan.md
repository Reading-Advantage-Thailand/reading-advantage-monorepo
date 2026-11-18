# Plan: www STEM Advantage release-date line

Track: `www_stem_date_line_20261116` (light lane).
Author model: opencode-go/deepseek-v4.1-flash

## Phase 1: Delete the date text and prove it

- [x] 1.1 Red: add the locale test with the six places and the scope sweep. Done: `f6055a4aa`.

  File `apps/www-reading-advantage/src/__tests__/www-stem-date-line.locale.test.ts`. Row set: the
  three en places and the three th places, each with its removed phrase and its kept text. Two scope
  rows walk every string under `pages.products.stemAdvantage` in en and in th. One row holds the zh
  lines, one row holds four kept lines per locale, and one row checks the description, og, and
  twitter values.

  Run: `pnpm exec vitest run src/__tests__/www-stem-date-line.locale.test.ts --silent=true`.
  Result: exit 1, 9 failed and 2 passed of 11.

- [x] 1.2 Green: delete the date text at the six places. Done: `bae6053da`.

  Six deletions in `apps/www-reading-advantage/src/locales/pages/products/stem-advantage.ts`, lines
  4, 9, 100, 123, 128, and 219. Six insertions and six deletions in `git diff --stat`. One space
  stays between two kept sentences. No other character changes. The zh lines stay.

  Run: same command. Result: exit 0, 11 of 11 pass.

- [x] 1.3 Fix a test or fixture that pins the old text. Done: no file changed; the grep at `8aeb92028` finds the new test only. The line below holds the detail.

  `grep -rn "No launch date\|with no release date\|It has no release date"` over
  `apps/www-reading-advantage` finds the new test only. The Storytime fixture
  `src/__tests__/fixtures/storytime-page-expected.ts` holds the same phrases for the Storytime page,
  not for the STEM page. The grep of the STEM page component
  `app/[locale]/(marketing)/products/stem-advantage/page.tsx` finds no date text. The navigation
  description and the b2b card also hold no date text.

- [x] 1.4 Run the five gates and record the selector output. Done at `8aeb92028`.

  - www vitest suite: exit 0, 62 files and 2481 tests pass.
  - `tsc --noEmit`: exit 0, no output.
  - ESLint on the locale file and the test file: exit 0, no output.
  - `next build`: exit 0, `/[locale]/products/stem-advantage` is in the route list.
  - `npx vitest run scripts/ci/__tests__/` from the repo root: exit 0, 14 files and 226 tests pass.
  - Selector: `node scripts/ci/affected-apps.mjs --base a7ba202cd --head <HEAD>` prints
    `["www-reading-advantage"]`.

- [x] 1.5 Push to master and check the CD run and the live pages. Done: `8aeb92028`.

  `origin/master` did not move, so no rebase was needed. The push took `master` from `a7ba202cd` to
  `8aeb92028`. The selector on the pushed head prints `["www-reading-advantage"]`.

  CD run 43816539480 on `8aeb92028` passed. The steps "Run the www photo e2e" and
  "Deploy to Cloud Run 🚀" succeeded.

  Live check at 06:30 UTC on 2026-11-16: `/en/products/stem-advantage` HTTP 200 and
  `/th/products/stem-advantage` HTTP 200. The visible text holds no `release date`, `launch date`,
  `no date`, `กำหนดวัน`, or `วันเปิดตัว` phrase. The description, og:description, and
  twitter:description tags hold none either. The zh page keeps `暂无发布日期` and is untouched.

## Closeout

- [x] C.1 Move the track to `measure/archive/www_stem_date_line_20261116` and record the closeout. Done: the pre-closeout head is `8aeb92028`; this commit holds the move.

  The closeout checker passes with an INFO line for the light lane: no final acceptance is
  required. The selector on the closeout head prints `[]`. The closeout commits to `master`.
