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

- [x] 1.3 Fix a test or fixture that pins the old text. Done: no change needed.

  `grep -rn "No launch date\|with no release date\|It has no release date"` over
  `apps/www-reading-advantage` finds the new test only. The Storytime fixture
  `src/__tests__/fixtures/storytime-page-expected.ts` holds the same phrases for the Storytime page,
  not for the STEM page. The grep of the STEM page component
  `app/[locale]/(marketing)/products/stem-advantage/page.tsx` finds no date text. The navigation
  description and the b2b card also hold no date text.

- [x] 1.4 Run the five gates and record the selector output. Done.

  - www vitest suite: exit 0, 62 files and 2481 tests pass.
  - `tsc --noEmit`: exit 0, no output.
  - ESLint on the locale file and the test file: exit 0, no output.
  - `next build`: exit 0, `/[locale]/products/stem-advantage` is in the route list.
  - `npx vitest run scripts/ci/__tests__/` from the repo root: exit 0, 14 files and 226 tests pass.
  - Selector: `node scripts/ci/affected-apps.mjs --base a7ba202cd --head <HEAD>` prints
    `["www-reading-advantage"]`.

- [ ] 1.5 Push to master and check the CD run and the live pages.

## Closeout

Pending.
