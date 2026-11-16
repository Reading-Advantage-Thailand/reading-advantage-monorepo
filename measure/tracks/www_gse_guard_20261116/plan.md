# Implementation Plan: www: GSE out of customer copy

> **Track ID:** `www_gse_guard_20261116` · **Spec:** [spec.md](./spec.md)
> **Branch:** `www/gse-guard` in `/home/daniebo/Desktop/rama-worktrees/www-gse-guard`. Base: `origin/master` `9a9ae9aea`.

## Rules

- PM 2026-11-03: light lane. One maker, one checker later, then Daniel's page-check.
- No spec review, strategy, or Red/Green split applies. The guard test still comes before the fix.
- Markers: `[ ]` pending, `[~]` active, `[x]` done, `[b]` human gate.
- Heavy commands use `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
- Run from `apps/www-reading-advantage` with `../../node_modules/.bin/<tool>`.
- Commit by path. Commit headers are lower case, at most 100 characters, and carry `(track_id: www_gse_guard_20261116)`.
- Test commit and fix commit stay separate.
- The blog post `the-advantage-engine-kst-srs` stays unchanged. The PM decides it.

## Phase 1: Sweep, guard, and mockup fix

- [x] 1.0 Open the track. Track files only: `spec.md`, `plan.md`, `metadata.json`, `index.md`, and the `measure/tracks.md` row. Commit `docs(measure): open the www GSE guard track (track_id: www_gse_guard_20261116)`.
- [x] 1.1 Sweep, read-only. Search the customer-copy paths for `GSE`, `Global Scale of English`, `Pearson`, and `YLE`. Record every hit with file, line, and text in [spec.md](./spec.md) section 4. Four hit groups: the two Reading mockups (fixed here) and the en and th blog post (PENDING). No `Pearson` and no `YLE` hits.
- [x] 1.2 Red: the guard test. Create `apps/www-reading-advantage/src/__tests__/no-gse-in-customer-copy.test.ts`. It scans the customer-copy paths, fails on the four terms, and prints each hit as `file:line`. The PENDING list holds the en and th blog post with one reason each. Run it before the fix. Expect a failure that names both Reading mockups.
  - Command: `cd apps/www-reading-advantage && ../../node_modules/.bin/vitest run --maxWorkers=1 src/__tests__/no-gse-in-customer-copy.test.ts`
  - Commit: `test(www): guard customer copy against GSE (track_id: www_gse_guard_20261116)`.
- [x] 1.3 Fix: both Reading mockups. Remove the three `GSE <n>` labels and the three `<!-- GSE tag n -->` comments. Remove each `<g class="tagN">` group, because the group holds one pill and one label and nothing else. Keep every other line, the `.tag` CSS, and the word highlights. No new text.
  - Command: the guard test of task 1.2. Expect a pass.
  - Commit: `fix(www): drop the GSE labels from the reading mockups (track_id: www_gse_guard_20261116)`.
- [x] 1.4 Gates, through the heavy-run wrapper.
  - www vitest suite: `cd apps/www-reading-advantage && ../../node_modules/.bin/vitest run --silent=true`.
  - Typecheck: `cd apps/www-reading-advantage && ../../node_modules/.bin/tsc --noEmit`.
  - ESLint on the touched files: the guard test only.
  - Build: `cd apps/www-reading-advantage && ../../node_modules/.bin/next build`.
  - Repo CI tests: `npx vitest run scripts/ci/__tests__/` from the repo root.
- [x] 1.5 Selector. `node scripts/ci/affected-apps.mjs --base <origin/master sha> --head HEAD` must print `["www-reading-advantage"]` or `[]`. Otherwise stop.
- [x] 1.6 Push and live check. `git push origin HEAD:master`. Watch the `cd-www-reading-advantage.yml` run. Then check the live page with Playwright at 1280 and 390 in en and th. Capture the mockup at 1280 to `/home/daniebo/Desktop/handoff/www-gse-2026-11-16/live/`.
- [x] 1.7 Close out the light lane. Run the closeout checker from a fresh worktree of `origin/master` and push it. Remove both worktrees and both branches.

## PENDING entries for the PM

| File | Line | Text | Reason |
| --- | --- | --- | --- |
| `src/app/[locale]/(marketing)/blog/posts/en/the-advantage-engine-kst-srs.md` | 24 | "aligned with the Global Scale of English (GSE) and international math standards" | The PM decision of 2026-11-16 sends the CEFR sentence. This track does not edit a blog post. |
| `src/app/[locale]/(marketing)/blog/posts/th/the-advantage-engine-kst-srs.md` | 24 | "ที่สอดคล้องกับมาตรฐาน Global Scale of English (GSE) และมาตรฐานคณิตศาสตร์สากล" | Same reason. The Thai edit needs the PM sentence. |

The PM runs the page-check. Daniel owns the push gate; the standing approval covers www-only pushes.

## Out of scope

- The blog post copy and the other PENDING hits.
- The Science mockups and the Science page copy.
- Any route, component, or locale file.
