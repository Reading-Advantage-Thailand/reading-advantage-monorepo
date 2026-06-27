# Page Map: www-reading-advantage

> Track: `www_reading_advantage_review_20260626`
> Generated: 2026-06-27
> Note: All routes are locale-prefixed under `[locale]` which supports `en`, `th`, `zh`.

---

## Route Tree

```
/                               → Redirects to /[locale]
/[locale]                       → Root layout (html, head, body, fonts, locale provider)
├── /(marketing)/layout         → Marketing group layout (header, footer, animations)
│   ├── /(home)/                → Homepage (hero, product cards, social proof, CTAs)
│   ├── /about/                 → About / brand story / mission
│   ├── /blog/                  → Blog listing page (paginated, locale-filtered)
│   │   ├── /blog/[slug]/       → Blog post detail page
│   │   └── /blog/page/[page]/  → Blog pagination controller
│   ├── /case-studies/          → Case studies index
│   ├── /contact/               → Contact / lead generation form
│   ├── /features/              → Features overview for the platform
│   ├── /mastery-advantage/     → Mastery Advantage product landing
│   ├── /pricing/               → Pricing table (probably TBD/hidden)
│   ├── /products/layout        → (via reading-advantage sub-layout)
│   ├── /products/              → Products overview / grid
│   ├── /products/reading-advantage/       → Reading Advantage deep page
│   ├── /products/primary-advantage/       → Primary Advantage deep page
│   ├── /products/science-advantage/       → Science Advantage deep page
│   ├── /products/codecamp-advantage/      → CodeCamp Advantage deep page
│   ├── /products/math-advantage/          → Math Advantage deep page
│   ├── /products/stem-advantage/          → STEM Advantage deep page
│   ├── /products/storytime-advantage/     → Storytime Advantage deep page
│   ├── /products/tutor-advantage/         → Tutor Advantage deep page
│   ├── /products/zhongwen-advantage/      → Zhongwen (Chinese) Advantage deep page
│   ├── /services/              → Services overview
│   ├── /services/blended-learning/        → Blended Learning as a service
│   └── /services/managed-service/         → Managed Service offering
```

## Page Details

### Marketing Pages

| Route | Locale files | Components | Metadata present | Test |
|-------|-------------|-----------|-----------------|------|
| `/` (home) | `pages/home.ts` | `hero-section`, `marketing-svg`, product presentation | Unknown* | Skipped |
| `/about` | `pages/about.ts` | (rendered from locales) | Unknown* | None |
| `/features` | `pages/feature.ts` | `comparison-table`, features | Unknown* | None |
| `/case-studies` | `pages/case-studies.ts` | (rendered from locales) | Unknown* | None |
| `/contact` | `pages/contact.ts` | `contact-form` | Unknown* | E2E |
| `/pricing` | `pages/pricing.ts` | `pricing-table` | Unknown* | None |
| `/mastery-advantage` | `pages/mastery-advantage.ts` | `mastery-advantage-graph`, `step-flow` | Unknown* | None |

### Product Pages

| Route | Locale file | Page test | Has own layout |
|-------|-------------|-----------|----------------|
| `/products` (overview) | `pages/products/overview.ts` | None | No |
| `/products/reading-advantage` | `pages/products/reading-advantage.ts` | Yes | Yes |
| `/products/primary-advantage` | `pages/products/primary-advantage.ts` | Yes (1 skipped) | No |
| `/products/science-advantage` | `pages/products/science-advantage.ts` | Yes | No |
| `/products/codecamp-advantage` | `pages/products/codecamp-advantage.ts` | Yes | No |
| `/products/math-advantage` | `pages/products/math-advantage.ts` | Yes | No |
| `/products/stem-advantage` | `pages/products/stem-advantage.ts` | Yes | No |
| `/products/storytime-advantage` | `pages/products/storytime-advantage.ts` | Yes | No |
| `/products/tutor-advantage` | `pages/products/tutor-advantage.ts` | Yes | No |
| `/products/zhongwen-advantage` | `pages/products/zhongwen-advantage.ts` | Yes | No |

### Service Pages

| Route | Locale file | Page test | Notes |
|-------|-------------|-----------|-------|
| `/services` | `pages/services.ts` | None | Overview |
| `/services/blended-learning` | `pages/blended-learning.ts` | None | Detailed page |
| `/services/managed-service` | `pages/managed-service.ts` | None | Detailed page |

### Blog

| Route | Purpose | Dynamic |
|-------|---------|---------|
| `/blog` | Blog listing (paginated, locale-filtered) | Reads frontmatter from MD files |
| `/blog/[slug]` | Blog post detail | Reads MD file by slug |
| `/blog/page/[page]` | Pagination offset | Reads page number param |

**Blog posts**: 96 markdown files (49 en, 47 th) + 37 segment JSON files for Thai video transcripts.

---

## SEO Metadata Verification Status

> Verified via line review (batch-01..03). **Review-only — no fixes applied.** See `findings.md` LRF-005/006/007/036 and `claims-matrix.md` C-TC-03.

| Page | Metadata export | Notes |
|------|-----------------|-------|
| `/(home)` | ❌ Missing | No metadata/generateMetadata (LRF-005) |
| `/about` | ✅ Present | Hardcoded English title, no hreflang/canonical/metadataBase (LRF-036) |
| `/blog` | ✅ Present | metadataBase set; hardcoded English body strings (LRF-021) |
| `/blog/[slug]` | ✅ generateMetadata | OG article tags present |
| `/blog/page/[page]` | ✅ generateMetadata | Hardcoded English text (LRF-021) |
| `/case-studies` | ❌ Missing | No metadata (LRF-006) |
| `/contact` | ❌ Missing | No metadata (LRF-006) |
| `/features` | ✅ Present | Hardcoded title, no metadataBase (LRF-036) |
| `/mastery-advantage` | ✅ generateMetadata | No OG image/canonical/hreflang |
| `/pricing` | ✅ Present | Title "Feature Matrix" mismatch; not locale-aware (LRF-036) |
| `/products` (overview) | ✅ Present | No OG tags, no metadataBase |
| `/products/reading-advantage` | ⚠️ Layout-only | Page is `use client`; metadata from sub-layout (LRF-006/007) |
| `/products/primary-advantage` | ❌ Missing | No metadata (LRF-006) |
| `/products/science-advantage` | ✅ Present | OG present |
| `/products/codecamp-advantage` | ✅ Present | OG present; missing logo asset |
| `/products/math-advantage` | ✅ Present | OG present |
| `/products/stem-advantage` | ✅ Present | No metadataBase |
| `/products/storytime-advantage` | ✅ Present | OG present |
| `/products/tutor-advantage` | ✅ Present | Hardcoded title; no OG image/canonical |
| `/products/zhongwen-advantage` | ✅ generateMetadata | Hardcoded title |
| `/services` | ❌ Missing | No metadata (LRF-006) |
| `/services/blended-learning` | ❌ Missing | No metadata (LRF-006) |
| `/services/managed-service` | ❌ Missing | No metadata (LRF-006) |
| Root `[locale]/layout` | ✅ Present | Default OG image `/images/og-image.jpg` **missing** (LRF-011) |

## Page Status Legend

| Status | Meaning |
|--------|---------|
| ✅ Present | Page exists, has content |
| ⚠️ Partial | Page exists but may have gaps |
| ❌ Missing | Page referenced but not found |
| ? Unknown | Needs inspection |
