# Specification: Blog Localization and Navigation Resilience

## Overview
This track addresses the current limitation where the blog system serves the same English content across all locales ([en, th, zh]). It also fixes the navigation issue where internal links "drop" the current locale, reverting users to the default English path.

## Functional Requirements

### 1. Multi-lingual Content Pipeline
- **Directory Structure**: Migrate from a single `posts/` directory to locale-specific subdirectories:
  - `src/app/[locale]/(marketing)/blog/posts/en/`
  - `src/app/[locale]/(marketing)/blog/posts/th/`
  - `src/app/[locale]/(marketing)/blog/posts/zh/`
- **Fetching Logic**: Update `getBlogPost` and `getAllBlogPosts` in `src/lib/blog.ts` to take a `locale` parameter and read from the corresponding subdirectory.
- **Fallback Strategy**: If a requested slug does not exist in the current locale directory, fall back to the `en/` version of that post.
- **URL Preservation**: Fallback posts must be served at the current locale's URL (e.g., `/th/blog/post-slug` serves English content if Thai is missing).

### 2. Frontmatter Localization
- Localize all metadata in markdown files: `title`, `excerpt`, `author`, `tags`.
- Support locale-specific tag sets (e.g., tagging a post with "AI" in EN and "เอไอ" in TH).

### 3. Navigation Resilience
- **Global `LocalizedLink` Component**: Implement a wrapper around `next/link` that automatically prepends the current locale to the `href` if it's not already present.
- **Blog Integration**: Update `BlogCard`, `BlogPagination`, and `BlogPost` components to use `LocalizedLink` (or the equivalent logic).
- **Breadcrumbs**: Implement localized breadcrumbs on the blog post page (e.g., `Home > Blog > [Post Title]`).

### 4. Localized UI Elements
- **Date Formatting**: Use `Intl.DateTimeFormat` with the active locale to display publication dates.
- **Reading Time**: Ensure the "min read" suffix is localized via `next-international`.

## Technical Requirements
- **Framework**: Next.js 15 (App Router).
- **i18n Library**: `next-international`.
- **Parser**: Maintain existing `unified`/`remark`/`rehype` pipeline.

## Acceptance Criteria
- [ ] Navigating to `/th/blog` shows posts from the `th/` folder (falling back to `en/` if empty).
- [ ] Clicking a post on `/th/blog` keeps the user on a `/th/blog/...` URL.
- [ ] Clicking "Next Page" on `/th/blog/page/1` navigates to `/th/blog/page/2`.
- [ ] Dates are displayed in Thai (e.g., using Thai month names) when in the TH locale.
- [ ] A `LocalizedLink` component is available for use across the entire project.

## Out of Scope
- Translating existing English posts into Thai/Chinese (this is a content task, though one placeholder will be created for testing).
- Implementing a headless CMS (sticking with MDX).
