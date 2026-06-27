# Test Gaps: www-reading-advantage

> Track: `www_reading_advantage_review_20260626`
> Generated: 2026-06-27
> Updated: 2026-06-27 (line-review synthesis)
> Status: **Confirmed via line review.** Per-file coverage gaps and suggested test types are catalogued in `line-review/coverage-patches/batch-01..10.tsv`. **Review-only — no tests were written or executed in this track.**

---

## Current Test Coverage

### Unit Tests (15 active + 2 skipped)

| Test | Type | Covers |
|------|------|--------|
| `lib/blog.test.ts` | Unit | Blog library functions |
| `lib/blog-locale.test.ts` | Unit | Blog locale resolution |
| `lib/blog-posts-validation.test.ts` | Unit | Blog post frontmatter validation |
| `components/blog/blog-pagination.test.tsx` | Component | Pagination component |
| `components/common/localized-link.test.tsx` | Component | Localized link component |
| `components/marketing/hero-section.test.tsx` | Component | Hero section |
| 9x product page tests | Page | Product page rendering (one per product) |

### E2E Tests (4)

| Test | Covers |
|------|--------|
| `homepage.spec.ts` | Homepage smoke |
| `contact.spec.ts` | Contact form flow |
| `locale-middleware.spec.ts` | Locale routing |
| `link-locale-preservation.spec.ts` | Locale-aware links |

---

## Coverage Gaps (Initial)

### Pages without tests
- `/about` — no unit or E2E test
- `/blog` listing — no test
- `/case-studies` — no test
- `/features` — no test
- `/mastery-advantage` — no test
- `/pricing` — no test
- `/products` overview — no test
- `/services` — no test
- `/services/blended-learning` — no test
- `/services/managed-service` — no test
- Blog post detail (`/[slug]`) — no test

### Components without tests
- Most blog components (header, tags, breadcrumbs, etc.)
- Marketing components (marketing-svg, mastery-advantage-graph)
- UI components (button, card, accordion, etc.)
- Product components (b2b, b2c, product-card)
- Pricing table
- Contact form (no unit test, but E2E exists)
- Layout components (header, footer, fade-in, transitions)
- Locale switcher

### Missing test types
- **Integration tests**: No tests exercising locale-switching behavior across pages
- **Accessibility tests**: No aXe/jest-axe tests
- **SEO tests**: No metadata assertion tests
- **Visual regression**: No visual testing setup
- **API tests**: If the app has any API routes (none found in static scan)

---

## Gap Analysis

| Coverage Type | Current | Target | Status |
|--------------|---------|--------|--------|
| Page unit tests | 9/23 pages (39%) | 100% | ⚠️ Gap |
| Component tests | 3/35 non-page components (9%) | >50% | ❌ Major gap |
| E2E coverage | 4 critical flows | All user journeys | ⚠️ Gap |
| Accessibility tests | 0 | All pages | ❌ Missing |
| SEO tests | 0 | All pages | ❌ Missing |
| Integration tests | 0 | Key flows | ❌ Missing |
| Script tests | 1/10 (10%) | >50% | ⚠️ Gap |

---

## Coverage Patches (per-file, from line review)

Detailed per-file coverage gaps, priorities, and suggested test types were recorded during line review in:

- `line-review/coverage-patches/batch-01.tsv` … `batch-10.tsv`

### Highest-priority test targets surfaced

| Priority | File | Gap |
|----------|------|-----|
| Critical | `src/app/.../(home)/page.tsx` | Homepage test exists but is **skipped** (`page.test.tsx.skip`) — unskip and fix (LRF-043) |
| Critical | `src/components/layout/fade-in.tsx`, `page-transition.tsx`, `scroll-fade.tsx` | **Empty files** — implement or delete; verify imports (LRF-010) |
| Critical | `src/components/contact/contact-form.tsx` | No test for the lead form; mailto-only flow (LRF-009) |
| Critical | `src/locales/components/pricing-table.ts` | 25-row feature matrix integrity untested (LRF-018) |
| High | `src/lib/blog.ts` | Library funcs (getBlogPost, pagination, headings, sanitization) untested (LRF-028) |
| High | `src/proxy.ts` | Cloud Run port-stripping + i18n redirect logic untested |
| High | product page tests | Existing tests shallow (4 DOM selectors); deepen metadata/CTA assertions (LRF-043) |
| Medium | `src/config/navigation.ts` | Verify all 9 products & productLinks (LRF-029) |
| Medium | locale parity | No automated en/th/zh key-parity tests across 38 locale files |

> **Note:** This review did not author or run any tests. The coverage-patch TSVs are *suggestions* captured during the read-only line review.
