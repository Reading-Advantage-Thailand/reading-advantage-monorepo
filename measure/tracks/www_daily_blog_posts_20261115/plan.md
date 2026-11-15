# Plan: www daily blog posts of PR

Track: `www_daily_blog_posts_20261115` (light lane). One task per post.

## Phase 1: Daily posts

- [x] 1.1 Post `a-five-year-old-reads-by-herself`, 2026-11-15 (PM task A-61 follow-up): verify the
  hand-off manifest, write the en and th posts, copy the four images to `public/blog/`, run the
  gates (blog tests, www build, local render captures), push, watch the www CD, and capture the
  live pages. `a6641da7e`.
- [x] 1.2 Fault: the reading time ignored the prose inside rich blocks and Thai script, so the daily
  post showed 4 min in en and 1 min in th. `calculateReadingTime` now counts figure captions,
  callout titles and text, and pull quotes, skips block keys, paths, alt text, and screen-reader
  titles, and counts Thai characters without spaces. Red tests first, then green.

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
