# Spec: www daily blog posts of PR

Track: `www_daily_blog_posts_20261115` (light lane, feature). Source: PM task A-61 follow-up from the
Monorepo orchestrator, 2026-11-15.

## Scope

The www app only (`apps/www-reading-advantage`). PR writes one daily post per task, in en and th,
from `apps/www-reading-advantage/docs/blog-post-format.md`. The track stays open for later daily
posts; one task per post.

## Functional requirements

- FR-1: Each post has the slug and the date of the PM task, in `posts/en/<slug>.md` and
  `posts/th/<slug>.md`, with frontmatter per the format doc.
- FR-2: Each `[image: ...]` line of the source becomes a `figure` block with the source alt and
  caption. The th file uses the Thai alt and caption.
- FR-3: Each `[youtube: ...]` line of the source becomes a `youtube` block.
- FR-4: Every other body line of the source stays exactly as written.
- FR-5: Post images go to `public/blog/` with names prefixed by the slug, each 1 MB or less.
- FR-6: A post is published: no `draft` flag.
- FR-7: The blog tests exit 0, the www build exits 0, and both post pages render at 1280 px and
  390 px with no broken image and no overflow.

## Out of scope

- Social copy (fb.txt, linkedin.txt of the hand-off).
- Any change to the renderer or the format doc.
