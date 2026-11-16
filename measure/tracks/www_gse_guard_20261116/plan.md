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

- [x] 1.0 Open the track. Track files only: `spec.md`, `plan.md`, `metadata.json`, `index.md`, and the `measure/tracks.md` row. Commit `9f7a75b01` `docs(measure): open the www gse guard track (track_id: www_gse_guard_20261116)`.
- [x] 1.1 Sweep, read-only, at base `9a9ae9aea`. Search the customer-copy paths for `GSE`, `Global Scale of English`, `Pearson`, and `YLE`. Four hit groups: 12 lines in the two Reading mockups (fixed here) and line 24 of the en and th blog post (PENDING). No `Pearson` and no `YLE` hit in customer copy. The full table sits in [spec.md](./spec.md) section 4.
- [x] 1.2 Red: the guard test. Commit `51ddd4aef` `test(www): guard customer copy against gse (track_id: www_gse_guard_20261116)`. The run before the fix failed 1 test of 4. The failure listed the 12 Reading mockup hits as `file:line`. The 3 PENDING tests passed.
  - Command: `cd apps/www-reading-advantage && ../../node_modules/.bin/vitest run --maxWorkers=1 src/__tests__/no-gse-in-customer-copy.test.ts`
- [x] 1.3 Fix: both Reading mockups. Commit `3b4bda109` `fix(www): drop the gse labels from the reading mockups (track_id: www_gse_guard_20261116)`. Each file lost 18 lines: 3 comments, 3 `<g class="tagN">` groups, 3 pill `rect` elements, and 3 label `text` elements. The `.tag` CSS and the word highlights stay. No new text. The guard test then passed 4 of 4.
- [x] 1.4 Gates, through the heavy-run wrapper, all at `3b4bda109`.
  - www vitest suite: 61 files and 2470 tests passed, exit 0.
  - Typecheck: `tsc --noEmit`, exit 0.
  - ESLint on the guard test, exit 0.
  - Build: `next build`, exit 0.
  - Repo CI tests: `npx vitest run scripts/ci/__tests__/`, 14 files and 226 tests passed, exit 0.
- [x] 1.5 Selector. `node scripts/ci/affected-apps.mjs --base 9a9ae9aeada847a3509c44c4a9ced816c2490c0d --head <HEAD>` printed `["www-reading-advantage"]`.
- [x] 1.6 Push and live check. `git push origin HEAD:master`. Watch the `cd-www-reading-advantage.yml` run. Then check the live page with Playwright at 1280 and 390 in en and th. Capture the mockup at 1280 to `/home/daniebo/Desktop/handoff/www-gse-2026-11-16/live/`.
  - The Science mockups held no GSE at base `9a9ae9aea`. Commit `7843d864b` removed their labels on `origin/master` before this branch opened. No rebase was needed.
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
