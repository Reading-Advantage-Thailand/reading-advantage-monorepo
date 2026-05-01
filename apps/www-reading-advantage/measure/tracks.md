# Project Tracks

This file tracks all major tracks for project. Each track has its own detailed plan in its respective folder.

---

## [ ] Track: Complete Services and Blended Learning Page Development

_Link: [./measure/tracks/services_development_20260114/](./measure/tracks/services_development_20260114/)_

## [x] Track: Site-Wide Refactor — Appearance, Performance & Code Quality

_Link: [./measure/archive/site_refactor_20260207/](./measure/archive/site_refactor_20260207/)_

## [ ] Track: Hero Section Standardization

_Link: [./measure/tracks/hero_standardization_20260208/](./measure/tracks/hero_standardization_20260208/)_

---

### [x] Track: Marketing Pages Redesign

**Status:** Completed

**Type:** refactor | **Estimated Tasks:** 24 | **Actual Tasks:** 24

**Description:** Apply the established brand design system (glassmorphism, asymmetric layouts, uppercase wayfinding labels, rounded-3xl cards, standard Button CTAs) to all non-product marketing pages: Home, About, Features, Pricing, Services, and Contact.

_Link: [./measure/archive/marketing_pages_redesign_20260418/](./measure/archive/marketing_pages_redesign_20260418/)_

---

## Archived Tracks

### [x] Track: Complete Site Redesign (Archived)

**Status:** Archived — Replaced by Product Brand Refresh 2026-04-18

**Reason:** Implemented incorrect Clay design system (warm cream, Roobert font, broken animations) that violated product guidelines. Color schemes were incorrect and product logos missing.

_Link: [./measure/archive/complete_site_redesign_20260412_archived/](./measure/archive/complete_site_redesign_20260412_archived/)_

---

## Upcoming Tracks (created 2026-04-08)

### [ ] Track: Reduce Excessive Client Component Boundaries

**Status:** New

**Type:** refactor | **Estimated Tasks:** 6

**Description:** Convert pages/components that only use `useScopedI18n` (no useState, useEffect, or browser APIs) from "use client" to server components using `getScopedI18n`. This reduces JS bundle size by moving static content to the server bundle.

_Link: [./measure/tracks/client_component_reduction_20260415/](./measure/tracks/client_component_reduction_20260415/)_

### [ ] Track: Fix Missing `sizes` Props on `fill` Images

**Status:** New

**Type:** bug | **Estimated Tasks:** 4

**Description:** Add `sizes` prop to every `next/image` component using `fill` prop. Without `sizes`, the browser defaults to `100vw` and downloads the largest image variant even on small viewports.

_Link: [./measure/tracks/images_sizes_prop_20260414/](./measure/tracks/images_sizes_prop_20260414/)_

### [x] Track: Product Brand Refresh

**Status:** Completed

**Type:** feature | **Estimated Tasks:** 28 | **Actual Tasks:** 28

**Description:** Align all 9 product pages with actual brand identity: correct hero gradients per product specifications, product logos in hero sections, sky-50 base theme, glassmorphism cards, and Geist typography per product guidelines. Replaces the archived Clay design system track.

_Link: [./measure/archive/product_brand_refresh_20260418/](./measure/archive/product_brand_refresh_20260418/)_

---

### [x] Track: Product Page Structure Redesign

**Status:** Completed

**Type:** feature | **Estimated Tasks:** 36

**Description:** Redesign all 9 product pages with unique, distinctive layouts that break the repetitive AI-slop template pattern. Uses asymmetric splits, full-width color rooms, overlapping sections, dashed borders, and generous radius per Clay-inspired design principles while maintaining correct brand colors.

_Link: [./measure/archive/product_page_structure_redesign_20260418/](./measure/archive/product_page_structure_redesign_20260418/)_

---

### [ ] Track: Blog Pagination and Content Pipeline Improvements

**Status:** Spec Complete | Plan Complete

**Type:** feature | **Estimated Tasks:** 16

**Description:** Add static pagination (9 posts/page) to the blog listing, a floating table of contents to post pages, related-post recommendations driven by tag matching, and reading-time estimates.

_Link: [./measure/tracks/blog_pagination_20260408/](./measure/tracks/blog_pagination_20260408/)_

---

### [ ] Track: SEO and Metadata Audit

**Status:** Spec Complete | Plan Complete

**Type:** chore | **Estimated Tasks:** 20

**Description:** Audit and complete SEO metadata across all pages: unique title tags, unique OG descriptions, Open Graph images, hreflang tags, JSON-LD structured data (Organization, Product, Article schemas), XML sitemap, and robots.txt.

_Link: [./measure/tracks/seo_metadata_audit_20260408/](./measure/tracks/seo_metadata_audit_20260408/)_

---



## [x] Track: Blog Localization and Navigation Resilience

**Status:** Completed

**Type:** feature | **Estimated Tasks:** 16 | **Actual Tasks:** 18

**Description:** Locale-aware blog system: posts organized in `posts/{locale}/` dirs with `en/` fallback, `LocalizedLink` for locale-prefixed navigation, async server components using `getScopedI18n`, `Intl.DateTimeFormat` for locale dates, `BlogBreadcrumbs`, and comprehensive frontmatter validation test suite.

*Link: [./archive/blog_localization_20260421/](./archive/blog_localization_20260421/)*

---

## [x] Track: Day 2 Blog Post — The PISA Crisis

**Status:** Completed

**Type:** feature | **Estimated Tasks:** 6 | **Actual Tasks:** 6

**Description:** Create Day 2 blog post for the 30-Day "Advantage" Blog Marketing Campaign analyzing Thailand's declining PISA scores and positioning Reading Advantage as the solution to the reading comprehension crisis.

_Link: [./archive/blog_day02_pisa_crisis_20260423/](./archive/blog_day02_pisa_crisis_20260423/)_

---

### [~] Track: Blog-to-Video Generation Pipeline

**Status:** In Progress

**Type:** feature | **Estimated Tasks:** 12

**Description:** Create a TikTok-style engagement video generation pipeline that summarizes blog posts into 1-2 minute videos using mmx (audio/images/video) and Revideo (composition). Thai TTS validated. Revideo installed. Scene composition and pipeline script drafted. Rendering blocked on ffmpeg export format issue.

_Link: [./tracks/blog_video_generation_20260423/](./tracks/blog_video_generation_20260423/)*

---

### [x] Track: Video Pipeline Structural Fixes

**Status:** Complete

**Type:** bug | **Estimated Tasks:** 12

**Description:** Fix structural bugs in generate-blog-video.ts: Thai text bleeding in intro/outro fallback, audio/video length mismatch, jingle mixing truncation, and image text enforcement. Makes pipeline work reliably without manual intervention.

_Link: [./archive/video_pipeline_fix_20260429/](./archive/video_pipeline_fix_20260429/)_

---

- [ ] **Track: Generate 30 blog posts localized into English and Thai using the mmx cli tool with the create-image-mmx skill.**
*Link: [./tracks/blog_marketing_generation_20260421/](./tracks/blog_marketing_generation_20260421/)*
- [x] **Track: Visual Refresh: Define Unique Identity**
  *Link: [./archive/visual_refresh_20260425/](./archive/visual_refresh_20260425/)*
  *Status: Complete*

- [ ] **Track: Production Image Domains**
  *Link: [./tracks/production_image_domains_20260426/](./tracks/production_image_domains_20260426/)*
  Add production/CDN domains to remotePatterns in next.config.ts.

- [ ] **Track: CSS Utility Consolidation**
  *Link: [./tracks/css_utility_consolidation_20260426/](./tracks/css_utility_consolidation_20260426/)*
  Merge .glass-morphism and .hero-glass into single .glass utility.

- [ ] **Track: Blog Pagination**
  *Link: [./tracks/blog_pagination_20260426/](./tracks/blog_pagination_20260426/)*
  Implement static pagination with generateStaticParams for growing content.

---

- [ ] **Track: Phase 2 Marketing Blog Generation (Days 31-60)**
  *Link: [./tracks/blog_marketing_phase2_20260501/](./tracks/blog_marketing_phase2_20260501/)*

---

- [ ] **Track: PR and Website Strategic Alignment**
  *Link: [./tracks/pr_website_alignment_20260501/](./tracks/pr_website_alignment_20260501/)*
