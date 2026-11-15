# Plan: www blog rich post format

Track: `www_blog_rich_format_20261115` (light lane).

## Phase 1: Rich post elements and the draft flag

- [x] 1.1 Write the red tests: one render test per element, the unchanged-post test, the draft
  tests, and the rejection tests (FR-1 to FR-9). `5a9fd944c`. Red: blog-draft 4 of 6 fail;
  blog-blocks does not load.
- [x] 1.2 Add the rich block step and the draft flag to `src/lib/blog.ts`, the callout labels to the
  locale files, and the styles to `globals.css` (FR-1 to FR-9). `32c2e0e42`. Green: 24 of 24.
  The old English fallback after a render failure of a Thai file is removed. A test renders
  every en and th post, so no current Thai post fails, and a bad future file stops the build.
- [x] 1.3 Add the sample draft post and its files in `public/blog/` (FR-11). `5a9fd944c`, alt text
  corrected in `32c2e0e42`.
- [x] 1.4 Write `docs/blog-post-format.md` (FR-10). `ad8f8408d`.
- [x] 1.5 Capture the sample post at 1280 px and 390 px and fix what looks wrong. Captures in
  `/tmp/opencode/a61/` (not in the repository). Horizontal overflow 0 px at both widths. The
  full-page capture does not paint the YouTube iframe; a viewport capture shows the player.
- [~] 1.6 Run the gates (vitest files, lint, type check, production build), push to master, watch
  the www deploy, and capture one live post at 1280 px and 390 px.

## Gate record (2026-11-15, head `ad8f8408d`)

- vitest `blog-blocks`, `blog-draft`, `page.test.tsx`: exit 0 (33 tests). The old blog tests: exit 0
  (1542 tests).
- `tsc --noEmit` in the www app: exit 0.
- `pnpm --filter www-reading-advantage lint`: exit 1 with 146 errors, all in the built bundles of
  `public/experience/assets/` (tracked before this track). The touched files: 0 errors.
- `pnpm --filter www-reading-advantage build` through heavy-run: exit 0.
- `next start` check: the draft URL gives 404 in en and th; the list and page 2 do not name it.
