# Plan: www daily blog posts of PR

Track: `www_daily_blog_posts_20261115` (light lane). One task per post.

## Phase 1: Daily posts

- [x] 1.1 Post `a-five-year-old-reads-by-herself`, 2026-11-15 (PM task A-61 follow-up): verify the
  hand-off manifest, write the en and th posts, copy the four images to `public/blog/`, run the
  gates (blog tests, www build, local render captures), push, watch the www CD, and capture the
  live pages. `a6641da7e`.
- [x] 1.3 Post `she-chooses-the-words-she-keeps`, 2026-11-18 (PM task A-62, PREPARE only; the
  orchestrator pushes on 2026-11-18 because `blog.ts` has no date gate): verify the hand-off
  manifest, copy the en and th posts and the two images, run the gates (five blog vitest files, www
  build, local render captures at 1280 and 390, en and th). Third commit on
  `www/daily-posts-1116-1117`. No push from this session. `73daa201f`.
- [x] 1.4 Post `the-line-that-settled-the-class`, 2026-11-19 (PREPARE only; the orchestrator pushes
  on 2026-11-19 because `blog.ts` has no date gate): verify the hand-off manifest, copy the en and
  th posts and the two images, run the gates (five blog vitest files, www build, local render
  captures at 1280 and 390, en and th). Fifth commit on `www/daily-posts-1116-1117`. No push from
  this session. Pushed `bf4ebd647` to master (`ac1d09869..bf4ebd647`). CD run 44416947459: success.
  Live: en and th give HTTP 200, hero `2026-11-19-class-finds-the-line.webp` loads, overflow 0 px at
  390, 980, and 1280. Contact sheet:
  https://drive.google.com/file/d/1LyLeQWzbdQ5_-PjGLk7MH04Ui6kX51tK/view?usp=drivesdk.
- [x] 1.5 Post `her-pencil-stops-the-tablet-stays-closed`, 2026-11-20 (PREPARE only; the orchestrator
  pushes on 2026-11-20 because `blog.ts` has no date gate): verify the hand-off manifest, copy the
  en and th posts and the two images, run the gates (five blog vitest files, www build, local render
  captures at 1280 and 390, en and th). Sixth commit on `www/daily-posts-1116-1117`. No push from
  this session. Pushed `dc5a78bb7` to master. CD run 44633876712: success. 12 of 12 page checks
  passed (en and th post, both blog lists, 390/980/1280).
- [x] 1.6 Post `five-minutes-on-the-sofa`, 2026-11-21 (PREPARE only; the orchestrator pushes on
  2026-11-21 because `blog.ts` has no date gate): verify the hand-off manifest, copy the en and th
  posts and the two images, run the gates (five blog vitest files, www build, local render captures
  at 1280 and 390, en and th). Seventh commit on `www/daily-posts-1116-1117`. No push from this
  session. Pushed `829287b5d` to master (`12e057842..829287b5d`). CD run 44849723029: success. 12 of
  12 page checks passed. Contact sheet:
  https://drive.google.com/drive/folders/1HAS26l1okOW3vhqd-QnDHpuc9r5bMBvC.
- [x] 1.7 Post `every-lesson-has-a-next-lesson`, 2026-11-22 (PREPARE only; the orchestrator pushes
  on 2026-11-22 because `blog.ts` has no date gate): verify the hand-off manifest, copy the en and
  th posts and the two images, run the gates (five blog vitest files, www build, local render
  captures at 1280 and 390, en and th). Eighth commit on `www/daily-posts-1116-1117`. No push from
  this session. Pushed `bebaf8509` to master (`d782cc169..bebaf8509`). CD run 44962570177: success.
  12 of 12 page checks passed. The 11-23 post still gave 404. Contact sheet:
  https://drive.google.com/drive/folders/1crx5RlJse2NdLBobxMLtF6WFCdRYxHB2.
- [x] 1.8 Post `she-taps-nest-and-hears-it`, 2026-11-23 (PREPARE only; the orchestrator pushes on
  2026-11-23 because `blog.ts` has no date gate): verify the hand-off manifest, copy the en and th
  posts and the two images, run the gates (five blog vitest files, www build, local render captures
  at 1280 and 390, en and th). Ninth commit on `www/daily-posts-1116-1117`. No push from this
  session.
- [x] 1.2 Fault: the reading time ignored the prose inside rich blocks and Thai script, so the daily
  post showed 4 min in en and 1 min in th. `calculateReadingTime` now counts figure captions,
  callout titles and text, and pull quotes, skips block keys, paths, alt text, and screen-reader
  titles, and counts Thai characters without spaces. `81363a133`. Red tests first, then green.

## Gate record (2026-11-15, 2026-11-19 post, PREPARE only, no push)

- Hand-off `~/Desktop/handoff/blog/2026-11-19/MANIFEST.txt`: `sha256sum -c` gives 6 of 6 lines OK.
- Bytes: `post.md` and `post.th.md` match the hand-off posts with `cmp`. The two images in
  `public/blog/` give the manifest sha256. Frontmatter date is `2026-11-19` in en and th.
- Five blog vitest files (`blog`, `blog-blocks`, `blog-draft`, `blog-posts-validation`,
  `blog-locale`, `--maxWorkers=1`) through heavy-run: exit 0, 1697 tests.
- `pnpm --filter www-reading-advantage build` through heavy-run: exit 0.
- Local render (`next start` of that build, port 3419) at 1280 px and 390 px, en and th: HTTP 200,
  8 images load (naturalWidth above 0), no image under a text box (0 overlaps), reading time
  "3 min read" en and "3 นาทีในการอ่าน" th, horizontal overflow 0 px. Captures and `checks.json`
  in `/tmp/opencode/daily-post-1119/`.
- `node scripts/ci/affected-apps.mjs --base fe891bc3e --head <this commit>` gives
  `["www-reading-advantage"]`, exit 0.
- Embed notes: the video `8laRMIZZOeY` plays a Thai recording on the English page too, and it
  letterboxes with a brown blurred fill. The `2026-11-19-class-progress.webp` figure is a 986x208
  banner crop, so at 390 px its app text is small. The cover image is a wide crop of the same
  illustration as the first figure.
- Open: the orchestrator pushes this commit on 2026-11-19 and captures the live pages.

## Gate record (2026-11-15, reading-time fault, head `81363a133`)

- Targeted vitest (`blog`, `blog-blocks`, `blog-draft`, `blog-posts-validation`, `blog-locale`,
  `--maxWorkers=1`): exit 0, 1581 tests.
- `tsc --noEmit` in the www app: exit 0.
- `eslint src/lib/blog.ts src/lib/blog.test.ts`: exit 0.
- `pnpm --filter www-reading-advantage build` through heavy-run: exit 0.

## Gate record (2026-11-15)

- Manifest `sha256sum -c`: 8 of 8 files OK.
- Blog tests (`blog-blocks`, `blog-draft`, `blog-posts-validation`, `--maxWorkers=1`): exit 0,
  1547 tests. The old-pipeline test now skips a post that holds a rich block, because its intent is
  the plain-Markdown invariant (FR-8 of `www_blog_rich_format_20261115`).
- `pnpm --filter www-reading-advantage build` through heavy-run: exit 0.
- Local render (`next start` of that build) at 1280 px and 390 px, en and th: 8 images load
  (naturalWidth above 0), the YouTube iframe shows, horizontal overflow 0 px. Captures and
  `checks.json` in `/tmp/opencode/a61-post/local/`.

## Deploy record (2026-11-15)

- Pushed `a6641da7e` to master (origin/master `a6641da7ef87e5ecccc5758ca94c7121d55d67d3`).
  CD — www-reading-advantage.yml run 43672769409: success.
- Live: `/en/blog/a-five-year-old-reads-by-herself` and `/th/blog/a-five-year-old-reads-by-herself`
  give HTTP 200. At 1280 px and 390 px every image loads (naturalWidth above 0), the YouTube iframe
  shows, and horizontal overflow is 0 px. Captures in `/tmp/opencode/a61-post/live/`.
- Reading-time fix `81363a133`: CD run 43676629418 success. Live: en shows "3 min read", th shows
  "3 นาทีในการอ่าน". The blog list also shows "3 min read".
- Frontmatter `readingTime` still wins over the calculated value; the daily post sets none.

## Gate record (2026-11-15, 2026-11-18 post, head `73daa201f`, PREPARE only, no push)

- Hand-off `~/Desktop/handoff/blog/2026-11-18/MANIFEST.txt`: `sha256sum -c` gives 6 of 6 lines OK.
- Bytes: `post.md` and `post.th.md` match the hand-off posts with `cmp`. The two images in
  `public/blog/` give the manifest sha256. Frontmatter date is `2026-11-18` in en and th.
- Five blog vitest files (`blog`, `blog-blocks`, `blog-draft`, `blog-posts-validation`,
  `blog-locale`, `--maxWorkers=1`) through heavy-run: exit 0, 1668 tests.
- `pnpm --filter www-reading-advantage build` through heavy-run: exit 0.
- Local render (`next start` of that build, port 3417) at 1280 px and 390 px, en and th: HTTP 200,
  8 images load (naturalWidth above 0), the cover image and both figure images show, no image
  under a text box (0 overlaps), reading time "3 min read" en and "3 นาทีในการอ่าน" th,
  horizontal overflow 0 px. Captures and `checks.json` in `/tmp/opencode/daily-post-1118/`.
- `node scripts/ci/affected-apps.mjs --base fe891bc3e --head 73daa201f` gives
  `["www-reading-advantage"]`, exit 0.
- Embed note: the video `c7799Fx9vrU` is a vertical YouTube Short, so the 16:9 frame letterboxes it
  with a blurred fill. The recording shows the Thai student home on the English page too. The
  `2026-11-18-my-words.webp` figure is a 1279x300 banner crop, so at 390 px its app text is small.
- Open: the orchestrator pushes `73daa201f` on 2026-11-18 and captures the live pages.

## Gate record (2026-11-18, 2026-11-23 post, PREPARE only, no push)

- Hand-off `~/Desktop/handoff/blog/2026-11-23/MANIFEST.txt`: `sha256sum -c` gives 6 of 6 lines OK.
- Bytes: `post.md` and `post.th.md` match the hand-off posts with `cmp`. The two images in
  `public/blog/` give the manifest sha256. Frontmatter date is `2026-11-23` in en and th.
- Five blog vitest files (`blog`, `blog-blocks`, `blog-draft`, `blog-posts-validation`,
  `blog-locale`, `--maxWorkers=1`) through heavy-run: exit 0, 1813 tests.
- `pnpm build` in the www app through heavy-run: exit 0 after one retry. The first call exits 1 on
  the Next.js security reminder.
- Local render (`next start` of that build, port 3423) at 1280 px and 390 px, en and th: HTTP 200,
  both images load (naturalWidth above 0), reading time "3 min read" en and "2 นาทีในการอ่าน" th,
  horizontal overflow 0 px. Captures and `checks.json` in `/tmp/opencode/daily-post-1123/`.
- `node scripts/ci/affected-apps.mjs --base 40419d4bc1f3a712f295acd7a6fc8939c8b6d69a --head
  <this commit>` (the merge base of HEAD and `origin/master`) gives `["www-reading-advantage"]`,
  exit 0. The zero base gives the same. The `origin/master` tip `ac1d0986` is ahead of the branch
  point, and this branch is not rebased, so a run against that tip lists 10 apps.
- Open: the orchestrator pushes this commit on 2026-11-23 and captures the live pages.
