# Plan: www daily blog posts of PR

Track: `www_daily_blog_posts_20261115` (light lane). One task per post.

## Phase 1: Daily posts

- [~] 1.1 Post `a-five-year-old-reads-by-herself`, 2026-11-15 (PM task A-61 follow-up): verify the
  hand-off manifest, write the en and th posts, copy the four images to `public/blog/`, run the
  gates (blog tests, www build, local render captures), push, watch the www CD, and capture the
  live pages.

## Gate record (2026-11-15)

- Manifest `sha256sum -c`: 8 of 8 files OK.
- Blog tests (`blog-blocks`, `blog-draft`, `blog-posts-validation`, `--maxWorkers=1`): exit 0,
  1547 tests. The old-pipeline test now skips a post that holds a rich block, because its intent is
  the plain-Markdown invariant (FR-8 of `www_blog_rich_format_20261115`).
- `pnpm --filter www-reading-advantage build` through heavy-run: exit 0.
- Local render (`next start` of that build) at 1280 px and 390 px, en and th: 8 images load
  (naturalWidth above 0), the YouTube iframe shows, horizontal overflow 0 px. Captures and
  `checks.json` in `/tmp/opencode/a61-post/local/`.

## Deploy record

(pending)
