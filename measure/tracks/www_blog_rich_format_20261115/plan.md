# Plan: www blog rich post format

Track: `www_blog_rich_format_20261115` (light lane).

## Phase 1: Rich post elements and the draft flag

- [ ] 1.1 Write the red tests: one render test per element, the unchanged-post test, the draft
  tests, and the rejection tests (FR-1 to FR-9).
- [ ] 1.2 Add the rich block step and the draft flag to `src/lib/blog.ts`, the callout labels to the
  locale files, and the styles to `globals.css` (FR-1 to FR-9).
- [ ] 1.3 Add the sample draft post and its files in `public/blog/` (FR-11).
- [ ] 1.4 Write `docs/blog-post-format.md` (FR-10).
- [ ] 1.5 Capture the sample post at 1280 px and 390 px and fix what looks wrong.
- [ ] 1.6 Run the gates (vitest files, lint, type check, production build), push to master, watch
  the www deploy, and capture one live post at 1280 px and 390 px.
