# Plan: www daily blog posts of PR

Track: `www_daily_blog_posts_20261115` (light lane). One task per post.

## Phase 1: Daily posts

- [x] 1.1 Post `a-five-year-old-reads-by-herself`, 2026-11-15 (PM task A-61 follow-up): verify the
  hand-off manifest, write the en and th posts, copy the four images to `public/blog/`, run the
  gates (blog tests, www build, local render captures), push, watch the www CD, and capture the
  live pages. `a6641da7e`.
- [~] 1.3 Post `she-chooses-the-words-she-keeps`, 2026-11-18 (PM task A-62, PREPARE only; the
  orchestrator pushes on 2026-11-18 because `blog.ts` has no date gate): verify the hand-off
  manifest, copy the en and th posts and the two images, run the gates (five blog vitest files, www
  build, local render captures at 1280 and 390, en and th). Third commit on
  `www/daily-posts-1116-1117`. No push from this session.
- [x] 1.2 Fault: the reading time ignored the prose inside rich blocks and Thai script, so the daily
  post showed 4 min in en and 1 min in th. `calculateReadingTime` now counts figure captions,
  callout titles and text, and pull quotes, skips block keys, paths, alt text, and screen-reader
  titles, and counts Thai characters without spaces. `81363a133`. Red tests first, then green.

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
