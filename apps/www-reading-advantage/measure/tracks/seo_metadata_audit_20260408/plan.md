# Plan: SEO and Metadata Audit

---

## Phase 1: Audit Current State

### Task 1.1: Inventory all page metadata exports
- [ ] List every `page.tsx` file under `src/app/[locale]/(marketing)/`
- [ ] For each, check whether a `metadata` export exists and record: title, description, openGraph.images
- [ ] Identify pages with missing, generic, or duplicate metadata

### Task 1.2: Verify metadataBase is set
- [ ] Read `src/app/[locale]/layout.tsx` and the root `src/app/layout.tsx`
- [ ] Confirm `metadataBase: new URL("https://reading-advantage.com")` is present in the root layout's `metadata` export
- [ ] If missing, add it now

### Task 1.3: Audit existing OG image
- [ ] Confirm `public/images/og-image.jpg` exists and is 1200×630px
- [ ] If dimensions differ, note the discrepancy for correction

### Task 1.4: Check for sitemap and robots.txt
- [ ] Check whether `src/app/sitemap.ts` exists
- [ ] Check whether `src/app/robots.ts` exists
- [ ] Record what is missing

**Manual Verification — Phase 1:**
1. Run `npm run dev`
2. Open DevTools on each of: `/en`, `/en/products`, `/en/pricing`, `/en/about`, `/en/contact`
3. Inspect `<head>` — note which pages are missing `og:image`, `og:description`, or `twitter:card`

---

## Phase 2: Fix Title Tags and Meta Descriptions

### Task 2.1: Create `src/config/seo-config.ts` with per-page SEO data
- [ ] Define a `PageSeoConfig` interface: `{ title: string; description: string; ogImage?: string }`
- [ ] Populate entries for: home, about, pricing, features, contact, products (overview), all 9 product pages, services, blended-learning, managed-service, case-studies, blog
- [ ] All descriptions must be 120–160 characters and unique
- [ ] Use the format `"<Page Name> — Reading Advantage"` for all title values

### Task 2.2: Update homepage metadata
- [ ] Read `src/app/[locale]/(marketing)/(home)/page.tsx`
- [ ] Update `metadata` export to use `seo-config.ts` values for title, description, and openGraph
- [ ] Add `twitter` metadata object

### Task 2.3: Update all marketing page metadata (bulk)
- [ ] Apply `seo-config.ts` values to: about, pricing, features, contact, products overview, services overview, case-studies, blog listing
- [ ] Each page gets: unique title, unique description, complete openGraph block with correct `url`, `twitter` block
- [ ] Run `npm run build` after this batch — exits 0

### Task 2.4: Update all 9 product page metadata
- [ ] For each product page, update `metadata` export with product-specific title, description, and openGraph
- [ ] Each openGraph block uses a product-specific OG image path (falls back to `/images/og-image.jpg` if not available)
- [ ] Run `npm run build` — exits 0

**Manual Verification — Phase 2:**
1. Run `npm run dev`
2. Open DevTools → Elements → `<head>` for `/en`, `/en/products/reading-advantage`, `/en/pricing`
3. Confirm each has a unique `<title>` and `<meta name="description">` with correct content
4. Confirm `<meta property="og:image">` is present on each page

---

## Phase 3: hreflang and Canonical URLs

### Task 3.1: Add `alternates.languages` to the locale layout
- [ ] Read `src/app/[locale]/layout.tsx`
- [ ] Add `alternates: { languages: { en: "...", th: "...", zh: "..." } }` to the layout-level `metadata`
- [ ] This ensures all pages under `[locale]` inherit hreflang links without duplicating them per-page

### Task 3.2: Verify canonical URLs are derived correctly
- [ ] Confirm `metadataBase` is set in root layout (from Phase 1)
- [ ] In the browser, inspect a product page `<head>` and confirm `<link rel="canonical">` points to the correct absolute URL
- [ ] No `canonical` tag should point to a localhost URL in production

**Manual Verification — Phase 3:**
1. In DevTools on `/en/products/reading-advantage`, search `<head>` for `hreflang` links
2. Confirm links for `en`, `th`, and `zh` variants are present and point to the correct paths
3. Confirm `<link rel="canonical">` is present

---

## Phase 4: XML Sitemap and robots.txt

### Task 4.1: Create `src/app/sitemap.ts`
- [ ] Create the file using Next.js App Router convention
- [ ] The sitemap function reads all static marketing pages and all blog post slugs
- [ ] Returns a `MetadataRoute.Sitemap` array with `url`, `lastModified`, `changeFrequency`, and `priority`
- [ ] Includes all three locale variants for each URL (EN, TH, ZH)
- [ ] Set priority: homepage 1.0, product pages 0.9, services/pricing/features 0.8, blog posts 0.7, other pages 0.6

### Task 4.2: Create `src/app/robots.ts`
- [ ] Create the file using Next.js App Router convention
- [ ] Returns `{ rules: [{ userAgent: "*", allow: "/" }], sitemap: "https://reading-advantage.com/sitemap.xml" }`

### Task 4.3: Verify sitemap in development
- [ ] Run `npm run dev`
- [ ] Open `http://localhost:3000/sitemap.xml`
- [ ] Confirm it is valid XML and lists the expected pages
- [ ] Count the entries — confirm all product pages, blog posts, and marketing pages appear

**Manual Verification — Phase 4:**
1. Open `http://localhost:3000/sitemap.xml` — valid XML, lists all pages
2. Open `http://localhost:3000/robots.txt` — shows `Allow: /` and `Sitemap:` directive
3. Paste the sitemap XML into an online XML validator and confirm it is well-formed

---

## Phase 5: JSON-LD Structured Data

### Task 5.1: Write JSON-LD utility
- [ ] Create `src/lib/structured-data.ts` with helper functions:
  - `organizationSchema()` — returns `Organization` JSON-LD for Reading Advantage
  - `productSchema(name, description)` — returns `Product` JSON-LD
  - `articleSchema(title, description, datePublished, dateModified)` — returns `Article` JSON-LD

### Task 5.2: Add Organization schema to homepage
- [ ] In the homepage server component, add:
  ```tsx
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }} />
  ```
- [ ] Verify the JSON is valid (no circular references)

### Task 5.3: Add Product schema to all 9 product pages
- [ ] In each product page server component, add the `productSchema` JSON-LD with the product name and description
- [ ] For `"use client"` product pages, move the JSON-LD injection to a parent server component or use a separate `layout.tsx`

### Task 5.4: Add Article schema to blog post pages
- [ ] In `[slug]/page.tsx`, add `articleSchema` JSON-LD using the post's title, description, and dates from front matter

**Manual Verification — Phase 5:**
1. Open `/en` — confirm `<script type="application/ld+json">` with `Organization` schema is present in page source
2. Open `/en/products/reading-advantage` — confirm `Product` schema JSON-LD in page source
3. Open a blog post — confirm `Article` schema JSON-LD in page source
4. Paste the homepage JSON-LD into Google's Rich Results Test — confirm it passes with no errors

---

## Phase 6: Final Build and Verification

### Task 6.1: Run full build
- [ ] Run `npm run build`
- [ ] Confirm exit code 0 and no TypeScript errors

### Task 6.2: Spot-check metadata in production build
- [ ] Run `npm run start`
- [ ] Open 5 pages in DevTools and verify title, description, og:image, and canonical are all correct

### Task 6.3: Document SEO conventions
- [ ] Add a brief section to `measure/product-guidelines.md` (or a new `measure/seo-guidelines.md`) documenting: how to add metadata to new pages, the title format convention, how to add structured data

**Manual Verification — Phase 6:**
1. `npm run build` exits 0
2. `npm run start` — open `/en/sitemap.xml` and `/en/robots.txt` in production mode
3. Open 3 product pages and confirm unique titles and OG images in the `<head>`
4. Run Google Rich Results Test on the homepage URL — no errors
