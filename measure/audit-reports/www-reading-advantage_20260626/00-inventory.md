# File Inventory: www-reading-advantage

> Track: `www_reading_advantage_review_20260626`
> Generated: 2026-06-27
> Updated: 2026-06-27 (line-review synthesis)
> App root: `apps/www-reading-advantage`
>
> **Review-only audit. No source code remediation was performed.** This inventory was the basis for the 10-batch line review; per-file coverage is recorded in `line-review/line-review-coverage.tsv` (130 rows) and findings in `findings.md` / `line-review/line-review-findings.md`.

## Overview Counts

| Category | Count |
|----------|-------|
| Total src files | 270 |
| Total ts/tsx files | 130 (77 tsx + 53 ts) |
| Total lines ts/tsx | 20,033 |
| Pages (page.tsx) | 23 |
| Layouts (layout.tsx) | 3 |
| Components | 41 (incl. 4 test files) |
| Locale definition files | 38 |
| Locale lines | 7,540 |
| Lib files | 5 (4 ts + 3 test) |
| Tests (unit, active) | 15 |
| Tests (unit, skipped) | 2 |
| E2E tests | 4 |
| Blog posts (markdown) | 96 (49 en + 47 th) |
| Blog segment JSON | 37 |
| Blog MD lines | 8,256 |
| Scripts | 10 (8 ts + 1 mjs + 1 test) |
| Public static assets | 192 |
| Config files (root) | 10 |
| GitHub workflows/templates | 6 |
| Docs files | ~60+ |

---

## 1. Pages & Routes (`src/app/[locale]`)

Group: `(marketing)`

### Page routes (23 page.tsx)

| # | Route | Description |
|---|-------|-------------|
| 1 | `/(home)/page.tsx` | Homepage / landing |
| 2 | `/about/page.tsx` | About / brand story |
| 3 | `/blog/page.tsx` | Blog listing (paginated) |
| 4 | `/blog/[slug]/page.tsx` | Blog post detail |
| 5 | `/blog/page/[page]/page.tsx` | Blog pagination helper |
| 6 | `/case-studies/page.tsx` | Case studies index |
| 7 | `/contact/page.tsx` | Contact / lead capture |
| 8 | `/features/page.tsx` | Features overview |
| 9 | `/mastery-advantage/page.tsx` | Mastery Advantage product |
| 10 | `/pricing/page.tsx` | Pricing table |
| 11 | `/products/page.tsx` | Products overview |
| 12 | `/products/reading-advantage/page.tsx` | Reading Advantage product |
| 13 | `/products/primary-advantage/page.tsx` | Primary Advantage product |
| 14 | `/products/science-advantage/page.tsx` | Science Advantage product |
| 15 | `/products/codecamp-advantage/page.tsx` | CodeCamp Advantage product |
| 16 | `/products/math-advantage/page.tsx` | Math Advantage product |
| 17 | `/products/stem-advantage/page.tsx` | STEM Advantage product |
| 18 | `/products/storytime-advantage/page.tsx` | Storytime Advantage product |
| 19 | `/products/tutor-advantage/page.tsx` | Tutor Advantage product |
| 20 | `/products/zhongwen-advantage/page.tsx` | Zhongwen (Chinese) Advantage product |
| 21 | `/services/page.tsx` | Services overview |
| 22 | `/services/blended-learning/page.tsx` | Blended Learning service |
| 23 | `/services/managed-service/page.tsx` | Managed Service |

### Layouts (3 layout.tsx)

| # | Route | Scope |
|---|-------|-------|
| 1 | `[locale]/layout.tsx` | Root layout (locale-aware) |
| 2 | `[locale]/(marketing)/layout.tsx` | Marketing group layout |
| 3 | `[locale]/(marketing)/products/reading-advantage/layout.tsx` | Reading-advantage sub-layout |

---

## 2. Components

### Blog (11 files, 1 test)
`blog-breadcrumbs.tsx`, `blog-card.tsx`, `blog-header.tsx`, `blog-layout.tsx`, `blog-pagination.tsx` (1 test), `blog-tags.tsx`, `contact-cta.tsx`, `product-cta.tsx`, `related-posts.tsx`, `table-of-contents.tsx`

### Common (3 files, 1 test)
`footer.tsx`, `localized-link.tsx` (1 test)

### Contact (1 file)
`contact-form.tsx`

### Features (1 file)
`comparison-table.tsx`

### Layout (4 files)
`fade-in.tsx`, `header.tsx`, `page-transition.tsx`, `scroll-fade.tsx`

### Marketing (6 files, 1 test)
`hero-section.tsx` (1 test), `marketing-svg.tsx`, `marketing-svg-client.tsx`, `mastery-advantage-graph.tsx`, `mastery-advantage-graph-data.ts`

### Pricing (1 file)
`pricing-table.tsx`

### Products (4 files)
`b2b-solutions.tsx`, `b2c-solutions.tsx`, `product-card.tsx`, `tutor-advantage.tsx`

### UI (10 files)
`button.tsx`, `card.tsx`, `faq-accordion.tsx`, `floating-pill.tsx`, `horizontal-strip.tsx`, `large-image-break.tsx`, `overlapping-section.tsx`, `select.tsx`, `sheet.tsx`, `step-flow.tsx`

---

## 3. i18n / Locales

### Language root files (5)
`en.ts`, `th.ts`, `zh.ts`, `navigation.ts`, `client.ts`, `server.ts`

### Page-specific locales (19)
`pages/about.ts`, `pages/blended-learning.ts`, `pages/blog.ts`, `pages/case-studies.ts`, `pages/contact.ts`, `pages/feature.ts`, `pages/home.ts`, `pages/managed-service.ts`, `pages/mastery-advantage.ts`, `pages/pricing.ts`, `pages/services.ts`, `pages/products/codecamp-advantage.ts`, `pages/products/math-advantage.ts`, `pages/products/overview.ts`, `pages/products/primary-advantage.ts`, `pages/products/reading-advantage.ts`, `pages/products/science-advantage.ts`, `pages/products/stem-advantage.ts`, `pages/products/storytime-advantage.ts`, `pages/products/tutor-advantage.ts`, `pages/products/zhongwen-advantage.ts`

### Component-specific locales (11)
`components/common/footer.ts`, `components/common/header.ts`, `components/common/navigation.ts`, `components/comparison-table.ts`, `components/contact-form.ts`, `components/locale-switcher.ts`, `components/pagination.ts`, `components/pricing-table.ts`, `components/products/b2b-solutions.ts`, `components/products/b2c-solutions.ts`, `components/products/tutor-advantage.ts`

### Infrastructure (3)
`i18n.ts`, `i18n/routing.ts`, `config/locale-config.ts`

---

## 4. Blog Content

| Locale | Post count | Segment JSON count |
|--------|-----------|-------------------|
| en | 49 | 0 |
| th | 47 | 37 |
| **Total** | **96** | **37** |

---

## 5. Tests

### Unit tests (15 active, 2 skipped)

| File | Status |
|------|--------|
| `src/lib/blog.test.ts` | Active |
| `src/lib/blog-locale.test.ts` | Active |
| `src/lib/blog-posts-validation.test.ts` | Active |
| `src/components/blog/blog-pagination.test.tsx` | Active |
| `src/components/common/localized-link.test.tsx` | Active |
| `src/components/marketing/hero-section.test.tsx` | Active |
| `src/app/.../products/reading-advantage/page.test.tsx` | Active |
| `src/app/.../products/primary-advantage/page.test.tsx` | Active |
| `src/app/.../products/science-advantage/page.test.tsx` | Active |
| `src/app/.../products/codecamp-advantage/page.test.tsx` | Active |
| `src/app/.../products/math-advantage/page.test.tsx` | Active |
| `src/app/.../products/stem-advantage/page.test.tsx` | Active |
| `src/app/.../products/storytime-advantage/page.test.tsx` | Active |
| `src/app/.../products/tutor-advantage/page.test.tsx` | Active |
| `src/app/.../products/zhongwen-advantage/page.test.tsx` | Active |
| `src/app/.../products/primary-advantage/page.test.tsx.skip` | Skipped |
| `src/app/.../(home)/page.test.tsx.skip` | Skipped |

### E2E tests (4)

| File | Scope |
|------|-------|
| `e2e/homepage.spec.ts` | Homepage smoke test |
| `e2e/contact.spec.ts` | Contact form flow |
| `e2e/locale-middleware.spec.ts` | Locale routing |
| `e2e/link-locale-preservation.spec.ts` | Locale-aware links |

### Script tests (1)
`scripts/__tests__/i18n-cli.test.ts`

---

## 6. Public Assets

| Type | Count |
|------|-------|
| SVG (marketing) | ~24 |
| Blog images (JPG/PNG/WebP) | ~50 |
| Video thumbnails (MP4) | ~46 |
| Icons/favicons | ~6 |
| Other (PDF, etc.) | ~2 |
| **Total** | **192** |

---

## 7. Config & Infrastructure

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript config |
| `next.config.ts` | Next.js configuration |
| `vitest.config.ts` | Vitest configuration |
| `playwright.config.ts` | Playwright E2E config |
| `eslint.config.mjs` | ESLint flat config |
| `postcss.config.mjs` | PostCSS/Tailwind config |
| `components.json` | shadcn/ui config |
| `Dockerfile` | Docker build |
| `nginx.conf` | Nginx reverse proxy |
| `cloudbuild.yaml` | GCP Cloud Build |
| `.github/workflows/ci.yaml` | CI pipeline |
| `.github/workflows/cd.yaml` | CD pipeline |

---

## 8. Measure Artifacts (within app)

The app has its own `measure/` directory with 10+ archived tracks, 10 active tracks, product guidelines, code styleguides, and review docs. These may contain relevant historical claims and decisions for cross-referencing.

---

## 9. Source Line Distribution (for batch planning)

| Subdirectory | Files | Lines (approx) |
|-------------|-------|----------------|
| `src/app` (pages + blog) | ~150 (incl. blog posts + JSON) | ~15,000 |
| `src/components` | 41 | 4,613 |
| `src/locales` | 38 | 7,540 |
| `src/lib` | 5 | 703 |
| `src/i18n` | 2 | ~200 |
| `src/config` | 2 | ~150 |
| `src/providers` | 1 | ~100 |
| `src/switcher` | 1 | ~100 |
| `src/types` | 3 | ~80 |
| `src/test` | 1 | ~30 |

**Total ts/tsx lines**: 20,033
