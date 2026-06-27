# Batch Manifest: www-reading-advantage Line Review

> Generated: 2026-06-27
> Total ts/tsx source files: 130
> Total ts/tsx lines: 20,033
> Batches: 10
> Max batch size: 2,500 lines

---

## Batch Overview

| Batch | Focus | Files | Lines | Status |
|-------|-------|-------|-------|--------|
| batch-01 | Core marketing pages | 11 | 750 | Reviewed |
| batch-02 | Product pages (7 major products) | 7 | 1,410 | Reviewed |
| batch-03 | Remaining product + services + layouts + header/footer | 10 | 1,050 | Reviewed |
| batch-04 | Layout + marketing components + contact | 10 | 910 | Reviewed |
| batch-05 | Feature, pricing, product, blog components (pt1) | 13 | 760 | Reviewed |
| batch-06 | Blog components (pt2) + UI components | 12 | 440 | Reviewed |
| batch-07 | Locale roots + page locales (core pages) | 12 | 2,140 | Reviewed |
| batch-08 | Page locales (features, services, product locales) | 9 | 1,430 | Reviewed |
| batch-09 | Product locales + header/nav locale strings | 10 | 1,950 | Reviewed |
| batch-10 | Remaining locales + lib + config + infra types | 16 | 1,460 | Reviewed |

> All 10 batches reviewed (read-only). See `line-review-coverage.tsv` (130 rows), `line-review-findings.md`, and `evidence/batch-NN/evidence.md`. Note: manifest line/file estimates differ from actual file sizes; actuals are recorded in `line-review-coverage.tsv` (ActualLines column).

---

## Batch Details

### batch-01: Core Marketing Pages (750 lines)
- Homepage, about, blog list, blog detail, blog pagination, case studies, contact, features, mastery-advantage, pricing, products overview
- **Line review focus**: Claims accuracy, SEO metadata, i18n completeness, CTA consistency

### batch-02: Product Pages (1,410 lines)
- Reading Advantage, Primary Advantage, Science Advantage, CodeCamp Advantage, Math Advantage, STEM Advantage, Storytime Advantage
- **Line review focus**: Product claim accuracy against actual apps, feature descriptions, screenshots/media references

### batch-03: Remaining Pages + Layouts + Nav (1,050 lines)
- Tutor Advantage, Zhongwen Advantage, Services overview, Blended Learning, Managed Service, root layout, marketing layout, RA sub-layout, header, footer
- **Line review focus**: Service claims, layout structure, nav links

### batch-04: Marketing/Layout Components (910 lines)
- fade-in, page-transition, scroll-fade, hero-section, marketing-svg, marketing-svg-client, mastery-advantage-graph, graph-data, localized-link, contact-form
- **Line review focus**: Component correctness, accessibility

### batch-05: Feature/Pricing/Product/Blog Components pt1 (760 lines)
- comparison-table, pricing-table, b2b-solutions, b2c-solutions, product-card, tutor-advantage, blog-breadcrumbs, blog-card, blog-header, blog-layout, blog-pagination, blog-tags, contact-cta
- **Line review focus**: Component composition, data flow

### batch-06: Blog Components pt2 + UI (440 lines)
- product-cta, related-posts, table-of-contents, button, card, faq-accordion, floating-pill, horizontal-strip, large-image-break, overlapping-section, select, sheet, step-flow
- **Line review focus**: UI component correctness, accessibility

### batch-07: Locale Roots + Core Page Locales (2,140 lines)
- en.ts, th.ts, zh.ts, navigation.ts, client.ts, server.ts, home, about, contact, blog locales
- **Line review focus**: Translation completeness, accuracy, consistency

### batch-08: Feature/Service/Product Locales (1,430 lines)
- features, pricing, services, blended-learning, managed-service, case-studies, mastery, products-overview, reading-advantage
- **Line review focus**: Translation accuracy, key coverage

### batch-09: Product Locales + Nav (1,950 lines)
- primary, science, codecamp, math, stem, storytime, tutor, zhongwen, header, navigation
- **Line review focus**: Translation completeness

### batch-10: Remaining Infra (1,460 lines)
- Remaining component locales, blog lib, utils, nav config, locale config, i18n, routing, types, providers, locale-switcher, proxy
- **Line review focus**: Infrastructure correctness

---

## Review Protocol

Each batch review should:

1. Load the batch manifest and file inventory
2. For each file, inspect for:
   - Hardcoded text that should use i18n
   - Claims about product capabilities
   - SEO metadata exports
   - Accessibility issues (missing ARIA, heading hierarchy)
   - Broken links or references
3. Record findings in `findings.md` with batch reference
4. Mark batch complete when all files reviewed

## Evidence Placeholders

See `evidence/` directory — one subdirectory per batch for screenshots, diffs, etc.
