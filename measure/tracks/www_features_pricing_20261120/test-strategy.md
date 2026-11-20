# Test Strategy — www features and pricing rewrite (A-70, row FP1)

Track: `www_features_pricing_20261120`. Feature. Five phases. The app is `apps/www-reading-advantage`. Vitest with jsdom runs the tests. Playwright runs only in the capture step. No other package changes.

## Risk

- Overall risk: low to medium. The change is static copy and static pages. It has no auth, no data, no input and no new dependency.
- The main risk is a copy error. The copy is word for word, so a wrong character is a defect. Two exact sources exist: the spec (English) and the Thai check page (Thai).
- The second risk is a broken look on a phone (a wide table, a long Thai line) and empty picture slots.
- The third risk is a stale reader of a deleted key or component.
- A page on master goes live on a push, so the Thai and the look gates stay with Daniel.

## Sources the tests pin

- English: `/home/daniebo/Desktop/advantage-pr/11-content/www-features-pricing-spec.md` v1.0, sections 3, 4 and 5.
- Thai: `/home/daniebo/Desktop/advantage-pr/11-content/thai-check/2026-11-20-features-pricing.html`, TH-FP-01 to TH-FP-95 (decision D5: no trailing period).
- The tests hold the strings in `src/__tests__/fixtures/features-pricing-expected.ts`. The www suite never reads the advantage-pr repository. The check of task 1.4 and Review A compare the fixture with the sources.

## Phase 1: Red — risk `medium`

| New test file | Asserts | AC |
|---|---|---|
| `src/__tests__/www-features-pricing.locale.test.ts` | Every en and th string at its key; `metadata.*`; no Thai value ends with "."; the FR-9 figures and the 3,000 baht floor; zh equals en for the two pages; no removed string anywhere under `src/locales/` (en, th, zh); removed namespaces gone; scope guards (zh `roadmap.description` unchanged); a positive control for the scan | AC-1, 2, 3, 5, 6, 8, 9 |
| `src/__tests__/www-features-page.content.test.tsx` | Section order and hooks; five cards in order; bullets; seven logos, Storytime first; FAQ items; one `<h1>`; `alt` on every image; button targets; no old text; en, th, zh | AC-3, 4, 5 |
| `src/__tests__/www-pricing-page.content.test.tsx` | Section order and hooks; table caption, five rows, three columns, FR-9 numbers; the only baht amounts are the FR-9 and FR-10 amounts; no tier names; button targets; en, th, zh | AC-3, 4, 5 |
| `src/__tests__/www-features-pricing.assets.test.ts` | Four WebP files exist, are not empty, are at most 200 KB, have the recorded pixel sizes; every image `src` of the two pages exists under `public/` | AC-7 |

Red rules:

- A Red run exits 1 with no import error and no config error. Each failing case fails on a missing key, section or file. The guard cases pass. The orchestrator records the counts.
- A test reads the rendered text and the locale objects. It never reads a section key that Green names, so a key rename does not break it (spec section 7).
- Every old test that the change breaks is listed in spec section 4.3. Green edits or deletes it with a reason, in the commit that removes the code it pins.

Commands: the vitest form of the plan with the named file. Evidence class: automated.

## Phase 2: Green — risk `low`

Gate commands (task 2.6), each through heavy-run, one at a time: ESLint on the changed files; `pnpm check-types`; the full www vitest suite; `pnpm build`; `node scripts/ci/affected-apps.mjs` (must list only `www-reading-advantage`).

Regression set (must stay green): `phase-2-seo-assets.red.test.ts` (updated), `phase-3-i18n.red.test.ts`, `phase-3-group-b-types.test.ts`, `no-gse-in-customer-copy.test.ts`, `hero-text-contrast.red.test.ts`, `phase-4-browser-regressions-remaining.red.test.tsx` (hero contrast case), `www-batch-20261119.locale.test.ts` (edited), `phase-w3-claims.test.ts` (block 1I removed).

## Reviews

| Gate | Assigned | Why |
|---|---|---|
| Review A (correctness, callers, test meaning) | Yes | Copy exactness, deleted callers, type shape of the locale roots, weakened old tests |
| Review B (security) | No | Static copy and pages. No auth, no data, no input, no new dependency |
| Review C (routes, links, UX contract) | Yes | Six routes, metadata per locale, button targets, header links, removed message keys |
| Adversarial tests | No | The site-wide removed-string scan and the "only these baht amounts" assertion already attack the main failure modes. A defect found in review goes back to Green |
| Browser review (UX) | Yes | The look at 390, 980 and 1280 px is the PM's and Daniel's check, and a table or a long Thai line can break a phone layout |
| Phase acceptance | Yes | AC-1 to AC-11 at an immutable HEAD |

## Phase 4: Browser review — risk `medium`

- The capture script (scratch, not committed) saves 18 full-page PNG files: three locales, two pages, three widths. It reports horizontal overflow, broken images, console errors and the `<h1>` count for each capture.
- The `measure-ux-browser-review` role judges the look from the captures and from the live pages. A High finding blocks the hand-off.
- Evidence class: automated for the script report, person-checked for the verdict, owner-passed for Daniel's look check (task 5.2).

## Phase 5: Gate — risk `low`

- The acceptance role checks AC-1 to AC-11.
- Daniel's Thai check, look check and deploy word are the only gate to the push (AC-12). Evidence class: owner-passed.

## Not tested, and why

- Live-site content after the deploy. The PM checks the live pages after Daniel's deploy.
- zh copy quality. The zh pages show English copy by default (Q-PR-33). The contracted Chinese speaker checks later copy.
