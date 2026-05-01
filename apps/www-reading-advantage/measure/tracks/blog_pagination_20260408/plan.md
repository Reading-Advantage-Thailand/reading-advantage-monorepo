# Plan: Blog Pagination and Content Pipeline Improvements

---

## Phase 1: Pagination for Blog Listing

### Task 1.1: Audit the current blog listing implementation
- [ ] Read `src/app/[locale]/(marketing)/blog/page.tsx` and understand how posts are fetched and rendered
- [ ] Read the blog post loading utility in `src/lib/` (if it exists) to understand the data shape
- [ ] Record the total number of posts currently in `src/app/[locale]/(marketing)/blog/posts/` or the MDX content directory
- [ ] Confirm the current `BlogCard` component interface

### Task 1.2: Create `getPaginatedPosts` utility (Red phase)
- [ ] Create `src/lib/blog.ts` (or add to existing blog utility file)
- [ ] Write a test in `src/lib/blog.test.ts` for a `getPaginatedPosts(page, perPage)` function:
  - Returns the correct slice of posts for a given page
  - Returns total page count
  - Returns an empty array for page numbers beyond total
- [ ] Run `npm test` — confirm tests FAIL (function does not exist yet)

### Task 1.3: Implement `getPaginatedPosts`
- [ ] Implement `getPaginatedPosts(page: number, perPage: number = 9)` that reads all posts, sorts by date descending, and returns `{ posts, totalPages, currentPage }`
- [ ] Run `npm test` — confirm tests PASS (Green phase)

### Task 1.4: Create paginated blog listing page
- [ ] Create `src/app/[locale]/(marketing)/blog/page/[page]/page.tsx` with `generateStaticParams` producing pages 1–N
- [ ] Update the root `src/app/[locale]/(marketing)/blog/page.tsx` to show page 1 content
- [ ] Both pages use `getPaginatedPosts` to render only 9 posts

### Task 1.5: Build the `BlogPagination` component
- [ ] Write a test for a `BlogPagination` component that renders the correct page links given `{ currentPage, totalPages }`
- [ ] Run `npm test` — FAIL
- [ ] Create `src/components/blog/blog-pagination.tsx` — renders Previous/Next and up to 5 numbered links
- [ ] Run `npm test` — PASS (Green phase)
- [ ] Add pagination locale keys (`pagination.previous`, `pagination.next`, `pagination.page`) to EN, TH, ZH locale files

**Manual Verification — Phase 1:**
1. Start `npm run dev`
2. Open `http://localhost:3000/en/blog` — confirm only 9 posts are shown, pagination bar is visible below the grid
3. Click "Next" or page 2 — confirm URL changes to `/en/blog/page/2` and different posts appear
4. Open `http://localhost:3000/th/blog` — confirm Thai locale and pagination labels in Thai

---

## Phase 2: Reading Time Estimate

### Task 2.1: Create `getReadingTime` utility (Red phase)
- [ ] Write a test for `getReadingTime(content: string): number` — should return `Math.ceil(wordCount / 200)`
- [ ] Test cases: 200 words → 1 min, 201 words → 2 min, empty string → 1 min
- [ ] Run `npm test` — FAIL

### Task 2.2: Implement `getReadingTime`
- [ ] Add `getReadingTime` to `src/lib/blog.ts`
- [ ] Run `npm test` — PASS

### Task 2.3: Add reading time to blog post page
- [ ] Read the blog post `[slug]/page.tsx` and identify where post metadata (title, date, tags) is rendered
- [ ] Add reading time display below the post title: "N min read"
- [ ] Add locale key `blog.readingTime` in EN ("{{ count }} min read"), TH, and ZH

**Manual Verification — Phase 2:**
1. Open any blog post at `/en/blog/<slug>`
2. Confirm "N min read" appears near the post title/date
3. Open the same post in `/th/` — confirm the reading time label is in Thai

---

## Phase 3: Table of Contents

### Task 3.1: Create `extractHeadings` utility (Red phase)
- [ ] Write a test for `extractHeadings(mdxContent: string): Array<{ id: string; text: string; level: 2 | 3 }>`
- [ ] Test cases: extracts H2 and H3 headings, ignores H1 and H4+, generates slug IDs from heading text
- [ ] Run `npm test` — FAIL

### Task 3.2: Implement `extractHeadings`
- [ ] Add to `src/lib/blog.ts`
- [ ] Run `npm test` — PASS

### Task 3.3: Build `TableOfContents` component
- [ ] Create `src/components/blog/table-of-contents.tsx`
- [ ] Props: `headings: Array<{ id: string; text: string; level: number }>`
- [ ] Renders a sticky sidebar on `md:` and above
- [ ] Uses `IntersectionObserver` to track the active heading and apply an active style class
- [ ] On mobile (below `md:`), renders a collapsible "Contents" toggle using Radix UI Dialog or a simple `<details>` element
- [ ] Add locale key `blog.tableOfContents` in EN ("Contents"), TH, ZH

### Task 3.4: Integrate TableOfContents into post page
- [ ] Update `[slug]/page.tsx` to call `extractHeadings` on the raw MDX content
- [ ] Pass headings to the `TableOfContents` component
- [ ] Layout: use a 2-column grid on `lg:` — article content (col-span-3) + TOC sidebar (col-span-1)

**Manual Verification — Phase 3:**
1. Open a blog post with multiple H2 and H3 headings
2. Confirm the TOC sidebar is visible on desktop (at ≥ 768px viewport)
3. Scroll through the post — confirm the active TOC item updates as sections enter view
4. At 375px viewport — confirm the TOC is not visible in sidebar mode; a "Contents" toggle appears at the top
5. Click a TOC link — confirm the page scrolls to the correct section

---

## Phase 4: Related Posts

### Task 4.1: Create `getRelatedPosts` utility (Red phase)
- [ ] Write a test for `getRelatedPosts(currentSlug: string, currentTags: string[], allPosts: Post[], limit: number)`
- [ ] Should return posts sharing at least one tag, excluding the current post, up to `limit`
- [ ] Should fall back to most recent posts if no tag matches found
- [ ] Run `npm test` — FAIL

### Task 4.2: Implement `getRelatedPosts`
- [ ] Add to `src/lib/blog.ts`
- [ ] Run `npm test` — PASS

### Task 4.3: Add Related Posts section to post page
- [ ] Update `[slug]/page.tsx` to call `getRelatedPosts` and pass results
- [ ] Render a "Related Posts" section at the bottom of the post using the existing `BlogCard` component
- [ ] Add locale key `blog.relatedPosts` in EN ("Related Posts"), TH, ZH

**Manual Verification — Phase 4:**
1. Open any blog post
2. Scroll to the bottom — confirm a "Related Posts" section appears with 1–3 post cards
3. Confirm the cards link to valid posts and the current post is not listed in its own related section
4. Open a post in `/th/` — confirm "Related Posts" heading is translated

---

## Phase 5: Final Build and Check

### Task 5.1: Run full test suite
- [ ] Run `npm test` — all tests pass
- [ ] Run `npm run test:coverage` — confirm coverage for `src/lib/blog.ts` is >80%

### Task 5.2: Run i18n verify
- [ ] Run `npm run i18n:verify` — exits 0 (new locale keys for pagination, reading time, TOC, related posts are all present in EN/TH/ZH)

### Task 5.3: Run production build
- [ ] Run `npm run build` — exits 0
- [ ] Note the number of static pages generated — confirm paginated blog pages appear in the output

**Manual Verification — Phase 5:**
1. `npm run build` exits 0
2. `npm run start` — open `http://localhost:3000/en/blog` and verify the full paginated blog experience works in production mode
3. Open `http://localhost:3000/en/blog/page/2` directly — confirm it renders without error
4. Open a blog post — confirm TOC, reading time, and related posts all appear
