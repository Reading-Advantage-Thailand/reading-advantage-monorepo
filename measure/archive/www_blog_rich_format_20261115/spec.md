# Spec: www blog rich post format

Track: `www_blog_rich_format_20261115` (light lane, feature). Source: PM task A-61.

Owner words (Daniel, 2026-11-15): "Blog post format needs to be improved to include inline images,
videos, etc."

## Scope

The www app only (`apps/www-reading-advantage`). The renderer is `src/lib/blog.ts`. The post page is
`src/app/[locale]/(marketing)/blog/[slug]/page.tsx`.

## Functional requirements

- FR-1: A post can hold an inline image with alt text and an optional caption (`figure`).
- FR-2: A post can hold a YouTube embed. The embed uses `youtube-nocookie.com`, a 16:9 box,
  `loading="lazy"`, and an iframe title. The renderer accepts only an 11-character video id.
- FR-3: A post can hold a short mp4 or webm video with a poster, `controls`, `preload="none"`, and
  `playsinline`. The video and the poster must be local `/blog/` files.
- FR-4: A post can hold a gallery of 2 to 6 images. Two images make a pair. The gallery stacks into
  one column at 390 px.
- FR-5: A post can hold a pull quote with an optional source.
- FR-6: A post can hold a callout box of the type `note`, `tip`, or `warning`. The type label comes
  from the locale files in en, th, and zh.
- FR-7: The renderer builds the HTML of each element from validated fields. It escapes all text. It
  does not pass author HTML through for these elements. A bad field stops the render with an error
  that names the block.
- FR-8: Plain Markdown renders the same as before. Every existing post gives the same HTML.
- FR-9: The frontmatter flag `draft: true` hides a post in production: list, pagination, related
  posts, and the post URL (404). The post renders in development. The www app has no sitemap and no
  RSS feed, so those need no change.
- FR-10: The file `apps/www-reading-advantage/docs/blog-post-format.md` gives the syntax of each
  element with one example, the file rules, and the draft flag. PR writes the daily posts from it.
- FR-11: One English sample draft post uses every element. Its files are in `public/blog/`.

## Syntax decision

Each element is a fenced code block with a fixed language name (`figure`, `youtube`, `video`,
`gallery`, `pullquote`, `callout`). The block body holds `key: value` lines. This needs no new
dependency: `remark-gfm` already parses the fences, and a small local remark step replaces them with
HTML. No existing post uses a fenced code block, so no existing post changes.

## Acceptance

- One vitest render test per element, a test that an existing post renders unchanged, draft tests,
  and rejection tests (a bad YouTube id, a non-local video path).
- Captures of the sample post at 1280 px and 390 px.
- The targeted vitest files, lint (no new error), the type check, and a production build exit 0.

## Out of scope

Thai and Chinese sample posts, image resizing, and a new Markdown dependency.
