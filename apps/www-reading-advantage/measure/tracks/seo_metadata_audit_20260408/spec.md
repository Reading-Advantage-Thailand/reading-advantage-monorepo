# Track: SEO and Metadata Audit

## Overview

The Reading Advantage marketing site is the primary organic search entry point for decision-makers evaluating the Advantage suite. Current SEO coverage is inconsistent: some pages have custom `metadata` exports, others reuse generic descriptions, and several pages lack Open Graph images or structured data entirely.

This track performs a systematic audit and remediation of SEO signals across all pages: unique title tags, unique meta descriptions, Open Graph images, canonical URLs, hreflang tags for multilingual routing, JSON-LD structured data, a comprehensive XML sitemap, and a proper `robots.txt`.

## Functional Requirements

1. **Title tags:** Every page has a unique `<title>` in the format `"<Page Name> — Reading Advantage"`. No two pages share the same title.

2. **Meta descriptions:** Every page has a unique `description` meta tag of 120–160 characters. No placeholder or repeated descriptions.

3. **Open Graph tags:** Every page exports a complete `openGraph` object including `title`, `description`, `url`, `images` (at least one image with `width`, `height`, and `alt`), and `type: "website"`.

4. **Twitter card tags:** Every page exports a `twitter` metadata object with `card: "summary_large_image"`, `title`, and `description`.

5. **Canonical URLs:** The root `layout.tsx` sets `metadataBase` to `https://reading-advantage.com`. Every page uses its own canonical path (Next.js derives this from `metadataBase` + route).

6. **hreflang tags:** The multilingual layout adds `alternates.languages` with `en`, `th`, and `zh` variants for every page, pointing to the correct locale-prefixed URLs.

7. **JSON-LD structured data:** The following page types receive structured data:
   - Homepage: `Organization` schema with name, url, logo, contactPoint
   - Product pages (all 9): `Product` schema with name, description, brand
   - Blog post pages: `Article` schema with headline, author, datePublished, dateModified
   - Pricing page: `PriceSpecification` or `FAQPage` schema if pricing FAQs are present

8. **XML sitemap:** A dynamic sitemap is generated via `src/app/sitemap.ts` (Next.js App Router convention). It includes all static marketing pages and all blog posts across all three locales.

9. **robots.txt:** A `src/app/robots.ts` file generates a `robots.txt` that allows all crawlers and points to the sitemap URL.

10. **OG image:** A default OG image exists at `public/images/og-image.jpg` (1200×630px). Each product page references its own product-specific OG image if available.

## Non-Functional Requirements

- All metadata is set using Next.js 15 App Router `metadata` exports — no `<Head>` components or `react-helmet`.
- Structured data JSON-LD is injected via `<script type="application/ld+json">` in the page's server component, not via a third-party library.
- No hardcoded string values in metadata exports — all page-specific text comes from the locale files or a central `seo-config.ts` file.
- The sitemap must be validated against Google Search Console's sitemap schema.
- `npm run build` exits 0 after all changes.

## Acceptance Criteria

- [ ] Every page accessible under `/en/*` has a unique `<title>` tag when inspected in browser DevTools.
- [ ] Every page has a `<meta name="description">` tag of 120–160 characters.
- [ ] Every page has `<meta property="og:image">` pointing to a valid image URL.
- [ ] `https://reading-advantage.com/sitemap.xml` (or `http://localhost:3000/sitemap.xml` in dev) returns a valid XML sitemap listing all pages.
- [ ] `http://localhost:3000/robots.txt` returns a valid robots.txt with `Sitemap:` directive.
- [ ] The homepage contains a `<script type="application/ld+json">` with an `Organization` schema.
- [ ] At least one product page contains a `<script type="application/ld+json">` with a `Product` schema.
- [ ] At least one blog post page contains a `<script type="application/ld+json">` with an `Article` schema.
- [ ] `npm run build` exits 0.
- [ ] Google Rich Results Test (or equivalent validator) returns no errors for the homepage structured data.

## Out of Scope

- Creating new OG images for every product (uses existing `og-image.jpg` as fallback).
- Dynamic OG image generation (Next.js `ImageResponse`) — deferred to a future track.
- Google Search Console submission or sitemap indexing.
- A/B testing different meta descriptions.
- Schema markup for Events, FAQs, or Reviews (unless already present in page content).
