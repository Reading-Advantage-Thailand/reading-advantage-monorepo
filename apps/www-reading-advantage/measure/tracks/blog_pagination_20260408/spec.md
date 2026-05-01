# Track: Blog Pagination and Content Pipeline Improvements

## Overview

The blog listing page (`/blog`) currently renders all posts in a single server-rendered page. As the content library grows, this causes progressively slower static generation times and larger HTML payloads. Additionally, individual blog post pages lack a table of contents (TOC) and related-post recommendations, reducing time on site for readers who arrive via search.

This track adds page-based pagination to the blog listing, a floating table of contents to post pages, and a related-posts section driven by tag matching.

The blog is a key SEO asset for the platform — improving the reading experience and internal linking density directly supports organic lead generation.

## Functional Requirements

1. **Blog listing pagination:**
   - Posts are paginated at 9 posts per page.
   - Static pages are generated via `generateStaticParams` for pages 1–N (where N = `ceil(totalPosts / 9)`).
   - The first page is accessible at `/blog` (no `/blog/page/1` redirect needed — both work).
   - A numeric pagination UI is rendered below the post grid, showing previous/next buttons and up to 5 page numbers.
   - The current page is highlighted in the pagination UI.
   - Each locale generates its own paginated set (`/en/blog`, `/th/blog`, `/zh/blog`).

2. **Blog post table of contents:**
   - A floating TOC sidebar is rendered on blog post pages at `md:` breakpoint and above.
   - The TOC is generated from the H2 and H3 headings in the MDX post content.
   - The currently visible section is highlighted in the TOC as the user scrolls (uses `IntersectionObserver`).
   - On mobile (below `md:`), the TOC collapses to a toggleable "Contents" button at the top of the article.

3. **Related posts section:**
   - At the bottom of each blog post, a "Related Posts" section displays up to 3 posts that share at least one tag with the current post.
   - If no tag-matched posts exist, the section shows the 3 most recent posts instead.
   - Related post cards match the existing `BlogCard` component style.

4. **Reading time estimate:**
   - Each blog post page displays an estimated reading time (e.g., "5 min read") below the post title.
   - Calculation: `Math.ceil(wordCount / 200)` minutes.

## Non-Functional Requirements

- Pagination is fully static — no client-side data fetching, no API routes introduced.
- The TOC scroll-spy uses `IntersectionObserver` (no scroll event listeners).
- Paginated pages generate at build time with `generateStaticParams`.
- All new UI text (pagination labels, TOC heading, "Related Posts" heading) is added to the locale files in EN, TH, and ZH.
- The blog listing page maintains its existing card layout and styling — pagination is additive.
- `npm run build` time must not increase by more than 30 seconds relative to the baseline.

## Acceptance Criteria

- [ ] `/en/blog` renders only the first 9 posts, with a pagination bar below the grid.
- [ ] `/en/blog/page/2` renders posts 10–18 (if they exist).
- [ ] Navigating to page 2 via the pagination UI updates the URL and renders the correct posts.
- [ ] A blog post page at `/en/blog/<slug>` displays a TOC on desktop (at `md:` breakpoint).
- [ ] The TOC correctly lists the H2 and H3 headings from the post body.
- [ ] The active TOC item updates as the user scrolls through the post.
- [ ] A "Related Posts" section appears at the bottom of each post page with 1–3 post cards.
- [ ] Each blog post page displays a reading time estimate.
- [ ] All new UI labels appear in Thai and Chinese when the locale is set to `/th/` or `/zh/`.
- [ ] `npm run build` exits 0.

## Out of Scope

- Author pages or author profiles.
- Comment systems.
- Newsletter subscription forms within blog posts.
- Changing the MDX authoring format or front matter schema.
- Infinite scroll as an alternative to pagination.
- Search within the blog.
