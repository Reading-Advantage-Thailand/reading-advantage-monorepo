# Plan: www Monday batch 2026-11-16, rows A and B

> **Track ID:** `www_batch_20261116` · **Spec:** [spec.md](./spec.md)
> **Source:** batch v1.2 and change list v1.39 of 2026-11-16.
> **Branch:** `www/batch-1116`, worktree `/home/daniebo/Desktop/rama-worktrees/www-batch-1116`.

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done.
- Each task names its acceptance criterion in the form `Test: AC-n`.
- The test comes first. The failing run is evidence before the locale edit.
- Pathspec commits only. No `git add -A`, no `git commit -a`, no stash, no reset.
- Every heavy command runs through
  `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
- Commit headers are 100 characters or less and hold `(track_id: www_batch_20261116)`.
- No push. The orchestrator pushes.

## Phase 1: Rows A and B, then the stapler row

- [x] 1.1 Red: extend the Storytime page content test and its fixture for row B places 1
  to 10, and add a locale test for rows A and B. Test: AC-1, AC-3, AC-4.

  - `src/__tests__/fixtures/storytime-page-expected.ts`: the new en and th strings of the
    ten places, `hero.launchNote`, and the approved-date allowance
    (`APPROVED_DATES`, `findUnapprovedClaimTerms`).
  - `src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx`: the
    scanner clears the two approved date strings; a control keeps a different year, a
    different month, `พ.ศ.`, and a price flagged.
  - `src/__tests__/www-batch-20261116.locale.test.ts`: row A keys and row B keys hold the
    new en and th lines and no old line. The zh lines of row A stay as they are.
  - Failing run before any locale edit: exit 1, 42 failed and 41 passed of 83.
    Log: `measure/runs/www_batch_20261116/red-p1.log`.
  - The static English header line takes the same approved-date allowance in the Green
    task, because the header carries the new date too.

- [x] 1.2 Green, row A: the three cards and the two limit features in
  `src/locales/components/products/b2b-solutions.ts`, en and th. Test: AC-1, AC-2.

  - `For the 2027 school year` on the Science, Math, and Zhongwen badges.
  - `Planned for Thai primary schools in the 2027 school year` on the Science and Zhongwen
    limit features. The Math card has no limit feature. STEM keeps `On our roadmap`.
  - The row A cases of the new locale test pass. The zh lines do not change.

- [x] 1.3 Green, row B: the ten places in
  `src/locales/pages/products/storytime-advantage.ts`, `src/locales/pages/home.ts`,
  `src/locales/pages/products/overview.ts`,
  `src/locales/components/common/navigation.ts`, and
  `src/locales/components/products/b2b-solutions.ts`, en and th. `src/config/navigation.ts`
  follows place 5. Test: AC-1, AC-3.

  - Place 10 renders as the new hero note under the description. The string stays word for
    word.
  - The new locale test and the Storytime page content test pass: 83 of 83.
  - The zh Storytime page shows the English lines through the `...en` spread. No zh file
    changes.

- [x] 1.4 Gates. Test: AC-5, AC-6.

  - The full www vitest suite: 60 files, 2448 tests, exit 0.
    Log: `measure/runs/www_batch_20261116/gate-vitest-full.log`.
  - `tsc --noEmit` in the www app: exit 0. Log: `.../gate-tsc.log`.
  - ESLint on the ten touched files: exit 0. Log: `.../gate-eslint.log`.
  - `next build` in the www app: exit 0. Log: `.../gate-build.log`.
  - The photo e2e `e2e/photos.spec.ts` against `next start` on port 3223 with a 1200 s
    timeout: 56 passed, exit 0. Log: `.../gate-photo-e2e.log`.
  - `npx vitest run scripts/ci/__tests__/` at the repository root: 14 files, 226 tests,
    exit 0. Log: `.../gate-ci-tests-final.log`.
  - The branch rebased onto `origin/master` `a713c2c62` after the gates, because another
    session moved the ref. The www app folder is byte-identical between `ad461d105` and
    `a713c2c62`, so the build and the captures hold. The www suite, `tsc`, the photo e2e,
    and the CI tests ran again on the new base: exit 0 each.
  - Captures of the six pages at 1280 and 390 px: exit 0, 12 files in
    `/tmp/opencode/www-batch-1116/`. The session read each one. The card and hero crops
    sit in `/tmp/opencode/www-batch-1116/crops/`; a DOM overflow scan of the four cards in
    en and th found none.
  - Grep of the www app for the eight old lines of rows A, B, and the stapler row: no live
    occurrence outside tests.

- [x] 1.5 Selector check. `node scripts/ci/affected-apps.mjs --base <base> --head HEAD`
  prints `[]` for the track-only commit and `["www-reading-advantage"]` for each code
  commit. Test: AC-7.

- [x] 1.6 Stapler row of 2026-11-05 (TH-184), one separate last commit. Test: AC-1.

  - The test line and the en and th copy change. Failing run first: exit 1, 5 failed and
    80 passed of 85. Log: `.../red-p1-stapler.log`. Then the copy, and 85 of 85 pass.
  - The commit stands alone, so the orchestrator can drop it.

- [x] 1.7 Report. The track files, each changed key with old and new text, the commit list,
  the gate exit codes, the capture paths, the selector output, and the facts changed.

## Phase 2: PM decision of 2026-11-16 on the home roadmap note

- [x] 2.1 PM decision 2026-11-16: delete only the second sentence "We give no dates."
  from the home section "ON OUR ROADMAP", and delete its Thai sentence. Keep "These
  product lines are planned." and its Thai first sentence word for word. A deletion
  only. Test: AC-1, AC-2.

  - Key `pages.home.v2.products.roadmapNote` in `src/locales/pages/home.ts`.
    en: `These product lines are planned. We give no dates.` →
    `These product lines are planned.`
    th: `สายผลิตภัณฑ์เหล่านี้อยู่ในแผน เรายังไม่กำหนดวันที่` →
    `สายผลิตภัณฑ์เหล่านี้อยู่ในแผน`
    The Thai space after `แผน` is the sentence boundary, so the edit ran.
  - zh stays as it is: `这些产品线在计划中，我们不给出日期。`
  - Red first: 2 failed and 37 passed of 39, exit 1. Log:
    `measure/runs/www_batch_20261116/red-p2-roadmap.log`.
  - Green: 39 of 39, exit 0. Log: `.../green-p2-roadmap.log`.
  - This batch pushes to `origin/master` under the standing approval for www-only
    pushes. The Phase 1 line "No push" holds for Phase 1 only.

## Phase 3: PM decision of 2026-11-16 on the product detail pages
- [x] 3.1 PM decision 2026-11-16: on the Science, Math, and Zhongwen product detail
  pages, delete only the sentence "It has no release date." and its Thai sentence. Delete
  also the named form "<Product> has no release date." with its Thai sentence. A deletion
  only, with no new words and no new Thai. The zh text does not change. Test: AC-1, AC-2.

  - Places: `src/locales/pages/products/math-advantage.ts` (hero 5, cta 74, th 97 and
    166), `science-advantage.ts` (cta 125, waitlist 165, th 307 and 347), and
    `zhongwen-advantage.ts` (hero 6, waitlist 54, th 74 and 122).
  - The Thai clause ` และยังไม่มีกำหนดวันเปิดตัว` takes its leading `และ` and the joining
    space. No double space and no trailing space remain.
  - Red first, then Green in `src/__tests__/www-batch-20261116.locale.test.ts`.
    Red: 12 failed and 40 passed of 52, exit 1. Log: `red-p3-detail.log`.
    Green: 52 of 52, exit 0. Log: `green-p3-detail.log`.
  - This commit pushes to `origin/master` under the standing approval for www-only
    pushes.

- [x] 3.2 PM additions of 2026-11-16: the meta tags, the notify line, and the GSE
  labels. Test: AC-1, AC-2.

  - A. The meta description, `og:description`, and `twitter:description` of the three
    pages read `hero.description` through `buildMarketingMetadata`. The 3.1 deletion
    covers all three tags. The locale test builds the three tags for en and th and finds
    no deleted sentence in any of them.
  - B. The notify line takes the roadmap sentence, because the exact Thai exists on the
    same page. Science en: `Science Advantage is on our roadmap. We will keep your email
    for news.`; th: `Science Advantage อยู่ในแผนงานของเรา เราจะเก็บอีเมลของคุณไว้เพื่อแจ้งข่าว`.
    Zhongwen en and th follow the same rule. Math has no notify line.
  - C. The two science mockup SVGs hold no `GSE` label. Removed the `<text>` elements
    `GSE 48`, `GSE 52`, `GSE 50`, and `GSE 54` and the number in the three XML comments.
    `ra-marketing-reading-advantage*.svg` and the blog posts stay as they are.
  - D. The live check captures the 1280 science mockup in en and th. The Photosynthesis
    node keeps its title and has no GSE label.
  - Red: 2 failed and 53 passed of 55 for the notify rows; 2 failed of 2 for the SVG
    rows. Logs: `red-p3b-meta-cta-svg.log` and `red-p3c-svg.log`.
    Green: 55 of 55, exit 0. Log: `green-p3b-meta-cta-svg.log`.
  - Gates on the two commits, each through `heavy-run.sh`: the www suite 60 files and
    2466 tests, exit 0; `tsc --noEmit`, exit 0; ESLint on the four TS files, exit 0;
    `next build`, exit 0; `scripts/ci/__tests__/` 14 files and 226 tests, exit 0.
    Logs: `gate-p3-*.log`. The branch rebased onto `origin/master` `6d2ed28cc`.
  - The selector prints `["www-reading-advantage"]` for the two code commits.

## Findings for the look

- Place 10 repeats the date sentence of place 2 in the hero. The change list requires both
  strings, and it gives the slot choice to this session. The page reads "…The first unit
  launches on 30 November 2026." and then "Storytime Advantage launches on 30 November
  2026." If Daniel wants no repeat, drop the `hero.launchNote` line.
- The Storytime card on `/` moves to the tag "Launches 30 November 2026" but stays in the
  roadmap group, under "These product lines are planned. We give no dates." The roadmap
  note is place 4 of the row of 2026-11-12, which waits for the Thai check. The group
  heading and the note stay out of this batch. Phase 2.1 supersedes the note part: the PM
  decision of 2026-11-16 deletes the second sentence.

## Out of scope

- The rows that are not READY.
- The zh lines Z19 to Z28.
- Push and deploy.
