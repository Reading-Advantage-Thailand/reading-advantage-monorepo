# Batch-05 Evidence: Feature, Pricing, Product, and Blog Components (Part 1)

> Track: `www_reading_advantage_review_20260626`
> Reviewed: 2026-06-27
> Files: 13 | Lines: 760

---

## File 1: Comparison Table — `src/components/features/comparison-table.tsx` (142 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-RA-02 | Competitive comparison against Raz-Kids, Lexia Core5, Accelerated Reader, Achieve3000 — claims Reading Advantage covers grades 4-12, priced $36-120, has fiction+nonfiction, reading material, device support, audio, AI assistant, and ELL support (Thai/Chinese/Vietnamese) | Lines 25-98 | `[NEEDS-PO]` Needs cross-app verification of feature completeness |
| F-001 | `lastUpdated` says "October 2023" (line 29, locale `comparison-table.ts` line 3) — now nearly 3 years old. If competitive data (pricing, features) is unchanged, the date should be refreshed. If competitors have changed, comparison data may be inaccurate. | Locale `comparison-table.ts` line 3 (en) | `[Medium]` Stale last-updated date |

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- Semantic HTML: `<table>`, `<thead>`, `<tbody>`, `<th>` with `scope` via column position ✓
- Feature marks (`✔`, `✘`, `⚬`) rendered as text — screen readers announce literally as "check mark", "ballot x", "middle dot". Consider using `aria-label` or visually-hidden text equivalents.
- `title` attribute on cells provides hover context but is not consistently accessible (touch devices don't show `title`)
- Line 101: `overflow-x-auto` on parent — scrollable table handled ✓

### i18n

- All strings use `useScopedI18n('components.comparisonTable')` ✓
- `lastUpdated` date should ideally be dynamic or auto-generated rather than a hardcoded locale string

### Code Quality

- Well-typed with `ComparisonRow` and `ComparisonCell` interfaces ✓
- `'use client'` necessary for i18n hook ✓

### Test

- No test file exists for this component

---

## File 2: Pricing Table — `src/components/pricing/pricing-table.tsx` (220 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-RA-05 | Pricing tiers: Basic (US$36), AI Enhanced (US$60), AI Tutor (US$120) per student/12-month license | Locale `pricing-table.ts` lines 16-18 | `[NEEDS-PO]` Verify current pricing |
| | Features 18-24 marked "coming-soon" across all tiers: gamification, parent portal, AI-generated quizzes, personalized learning paths, AI analytics, AI-generated content, virtual AI writing tutor | Locale `pricing-table.ts` lines 123-163 | `[NEEDS-PO]` Verify roadmap status |

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- **F-002**: Checkmark/true features use `<span className="check"></span>` (lines 189, 198, 208) — no `aria-label` or screen-reader-visible text. Assistive technology will see an empty element. Recommendation: use `aria-label="Included"` or a visually-hidden `<span>` with "Included" text.
- "Coming Soon" text is rendered as visible text ✓
- Semantic table structure with `<thead>` and `<tbody>` ✓

### i18n

- All strings use `useScopedI18n('components.pricingTable')` ✓
- `lastUpdated` date in locale: "October 2024" — about 20 months old but more recent than comparison table

### Code Quality

- **F-003**: Pricing features use numeric indices 0-24 as locale keys (lines 15-166). Any reordering of the locale file silently breaks the mapping, potentially assigning wrong feature names or tier status. Consider using named keys.

### Test

- No test file exists for this component

---

## File 3: B2B Solutions — `src/components/products/b2b-solutions.tsx` (331 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-MK-02 | Reading Advantage card claims "50% greater grammar gains" (feature 1) and "twice the vocabulary growth" (feature 2) — strong quantitative claims | Locale `b2b-solutions.ts` lines 27-28 | `[NEEDS-PO]` Requires research citation verification |
| **F-004** | Science Advantage: "Coming early 2026" (locale line 45) — current date is June 2026. If not yet launched, the badge is misleading. If launched, badge should be updated. | Locale `b2b-solutions.ts` line 45 (en) | `[High]` Potentially stale launch date |
| | Math Advantage: "Arriving late 2026" — still in the future, OK | Locale `b2b-solutions.ts` line 56 | `[PASS]` Future date |
| | Zhongwen Advantage: "Coming late 2026" — still in the future, OK | Locale `b2b-solutions.ts` line 67 | `[PASS]` Future date |
| | STEM Advantage: "Coming mid 2027" — future, OK | Locale `b2b-solutions.ts` line 34 | `[PASS]` Future date |
| | Storytime Advantage: "Coming early 2027" — future, OK | Locale `b2b-solutions.ts` line 78 | `[PASS]` Future date |
| | CodeCamp Advantage: "Coming 2027" — future, OK | Locale `b2b-solutions.ts` line 89 | `[PASS]` Future date |
| C-MK-03 | "Join hundreds of successful institutions" — claim of market adoption without verifiable evidence | Locale `b2b-solutions.ts` line 3 | `[UNKNOWN]` |

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- Semantic HTML: `<section>`, `<h2>`, `<h3>`, `<ul>`/`<li>` ✓
- Uses `next/image` with proper `alt={product.title}` ✓
- `aria-hidden="true"` on decorative arrow icons (lines 266-269) ✓
- CTA buttons use semantic `<Button asChild>` with `<Link>` ✓

### i18n

- Uses `getScopedI18n("components.products.b2bSolutions")` — async server component ✓
- Locale keys fully populated for en/th/zh ✓

### Code Quality

- **F-006**: TypeScript `as never` assertions used for locale key lookups (lines 140-144):
  - `t('products.${config.key}.title' as never)` — bypasses TypeScript type checking for key validity
  - `t('products.${config.key}.features.${featureIndex}' as never)` — similar issue
  - `t('products.${config.key}.gradeRange' as never)` — similar issue
  - `t(products.${config.key}.badge` as never) — line 148
  - These should ideally use properly typed locale key accessors or a typed helper function

### Images

- **F-005**: `src="/primary-advantage logo.png"` (line 61) — filename contains a space character. This works in modern browsers but may cause URL encoding issues in some contexts (CDN, proxy, build tools). Use `kebab-case` or `camelCase` without spaces.
- `src="/images/blended-learning.png"` (line 307) — used as inset background image; no alt text needed as it's decorative (blurred overlay) ✓
- No `loading="lazy"` on the blended-learning inset Image (line 307) — minor, not critical since it uses `fill` + `sizes`

### Claims About Reading Advantage

- Feature 0: "Strengthen advanced English comprehension with sustained extensive reading routines" — aligns with product description
- Feature 1: "Extensive reading cohorts achieved 50% greater grammar gains than direct grammar instruction" — strong statistical claim
- Feature 2: "Students saw twice the vocabulary growth compared with direct vocabulary drills" — strong statistical claim
- Feature 3: "Use reading analytics to conference with students and guide instruction instead of grading stacks of papers" — workflow claim

### Test

- No test file exists for this component

---

## File 4: B2C Solutions — `src/components/products/b2c-solutions.tsx` (176 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-CC-01/02 | CodeCamp Advantage: "Become a full-stack engineer in 15 weeks with AI tutors, project-based sprints, and human-reviewed code" — claim of 15-week conversion to employable engineer | Locale `b2c-solutions.ts` line 3 | `[NEEDS-PO]` |
| C-CC-02 | "New tracks debuting 2026" — current year, appropriate | Locale `b2c-solutions.ts` line 3 | `[PASS]` Current year reference |
| | "Apply Now" / "View Curriculum" CTAs link to `/products/codecamp-advantage` | Lines 152, 163 | `[PASS]` Valid links |

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- Semantic HTML: `<section>`, `<h2>`, `<h3>`, `<h4>`, `<ul>`/`<li>` ✓
- Icon containers with `role="img"` equivalent — none explicitly set but icons are decorative (all have text nearby) ✓
- CTA buttons with `asChild` and `<Link>` ✓
- `aria-hidden` not set on decorative dot elements (lines 117, 138) — non-critical as they are `<span>` elements with no semantic meaning

### i18n

- Uses `useScopedI18n("components.products.b2cSolutions")` — client component ✓
- Locale keys fully populated for en/th/zh ✓
- Features array is locale-driven ✓
- Codecamp highlights and outcomes are locale-driven ✓

### Code Quality

- `"use client"` — necessary for i18n hook ✓
- Clean component with well-organized feature grid and codecamp highlight card
- No `key` issues — uses feature title as key ✓

### Test

- No test file exists for this component

---

## File 5: Product Card — `src/components/products/product-card.tsx` (39 lines)

### Claims Accuracy

- Pure presentational component — no claims made ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- `aria-hidden="true"` on ArrowRight icon ✓
- Semantic heading hierarchy: uses `<h3>` ✓
- Text elements use semantic HTML ✓
- `Link` for navigation ✓

### i18n

- All text comes from props — locale responsibility delegated to callers ✓

### Code Quality

- Clean, well-structured component with typed props ✓
- Animation styling via `style` prop with index-based delay ✓

### Test

- No test file exists for this component (bare component)

---

## File 6: Tutor Advantage — `src/components/products/tutor-advantage.tsx` (132 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-TA-01 | Tutor Advantage: "Launch your tutoring business with built-in mentorship, AI lesson tools, and company-led coaching seminars" — product description | Locale `tutor-advantage.ts` line 3 | `[NEEDS-PO]` |
| C-TA-02 | "Join Our Network" / "We'll connect you with your mentor tutor within 48 hours" — specific service-level claim about mentor matching turnaround | Locale `tutor-advantage.ts` lines 22-23 | `[NEEDS-PO]` Verify 48h SLA |

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- Semantic HTML: `<section>`, `<h2>`, `<h3>` ✓
- Decorative floating background elements use `pointer-events-none` ✓
- `next/image` with `alt="Tutor Advantage"` — static alt text; appropriate for logo ✓
- Icon containers use proper gradient styling ✓

### i18n

- Uses `getScopedI18n("components.products.tutorAdvantage")` — async server component ✓
- Locale keys fully populated for en/th/zh ✓

### Code Quality

- Clean component with 4 feature cards, heading, description, CTA
- Server component — no `'use client'` needed ✓
- Good use of CSS composability with tailwind classes

### Test

- No test file exists for this component

---

## File 7: Blog Breadcrumbs — `src/components/blog/blog-breadcrumbs.tsx` (29 lines)

### Claims Accuracy

- No product claims — navigation component ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- `<nav>` with `aria-label="Breadcrumb"` ✓
- `<ol>` for ordered list ✓
- `aria-current="page"` on current post title ✓
- `aria-hidden="true"` on divider characters (`›`) ✓

### i18n

- **F-007**: Hardcoded strings instead of i18n locale keys:
  - Line 12: `"Home"` — should use a locale key (e.g., `navigation.home` exists in locale)
  - Line 18: `"Blog"` — should use a locale key (e.g., `pages.blog.title` or `navigation.blog` exists in locale)
- Navigation locale already has `home: "Home"` and `blog: "Blog"` in all three languages — these keys should be used

### Code Quality

- Clean component with well-structured props
- Proper TypeScript interface ✓

### Test

- No test file exists for this component

---

## File 8: Blog Card — `src/components/blog/blog-card.tsx` (58 lines)

### Claims Accuracy

- No product claims — blog listing component ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- `next/image` with `alt={post.title}` ✓
- Proper `sizes` attribute for responsive images ✓
- Semantic HTML: `<h2>`, `<p>`, `<Link>` ✓
- Tag spans with proper styling classes ✓

### i18n

- Uses `getScopedI18n("pages.blog")` for `readingTime` locale key ✓
- Date formatting with `Intl.DateTimeFormat(locale, ...)` — locale-aware ✓

### Code Quality

- Async server component ✓
- Clean prop interface with well-typed `BlogListItem` ✓

### Test

- No test file exists for this component

---

## File 9: Blog Header — `src/components/blog/blog-header.tsx` (27 lines)

### Claims Accuracy

- No product claims — blog metadata component ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- `<h1>` used for blog post title — proper hierarchy ✓
- Semantic HTML ✓

### i18n

- Uses `getScopedI18n("pages.blog")` for `readingTime` ✓
- `Intl.DateTimeFormat(locale, ...)` — locale-aware ✓

### Code Quality

- Clean async server component ✓
- Well-typed props ✓

### Test

- No test file exists for this component

---

## File 10: Blog Layout — `src/components/blog/blog-layout.tsx` (15 lines)

### Claims Accuracy

- No claims — bare layout wrapper ✓

### SEO Metadata

- Not a page component — no metadata export expected ✓

### Accessibility

- Simple container `<div>` — no accessibility concerns ✓

### i18n

- No text content — N/A ✓

### Code Quality

- Minimal component, `'use client'` due to no async requirements needed (could be server component)
- Clean structure

### Test

- No test file exists for this component

---

## File 11: Blog Pagination — `src/components/blog/blog-pagination.tsx` (122 lines)

### Claims Accuracy

- No product claims — pagination component ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- `<nav>` with `aria-label="Pagination"` ✓
- `aria-disabled` on disabled prev/next links ✓
- **F-008**: Disabled prev/next links use `href="#"` with `pointer-events-none` and `cursor-not-allowed` (lines 70-76, 106-114). When tab-focused, pressing Enter changes the URL to `#`. Better pattern: render as `<span>` or `aria-disabled="true"` link that prevents default navigation.

### i18n

- Uses `useScopedI18n("components.pagination")` with keys `previous` and `next` ✓
- Page numbers are generated numerically — no locale needed ✓

### Code Quality

- Well-structured pagination logic with ellipsis truncation
- Page number rendering handles edge cases (first page, last page, near edges) ✓
- `scroll={false}` on pagination links — prevents scroll-to-top behavior ✓

### Test

- **Test exists**: `blog-pagination.test.tsx` — one of only 3 component tests in the project ✓
- Existing test covers: renders previous/next, shows page numbers, disables prev on first page, disables next on last page, ellipsis, empty render for single page

---

## File 12: Blog Tags — `src/components/blog/blog-tags.tsx` (22 lines)

### Claims Accuracy

- No product claims — blog tag navigation ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- Semantic `<Link>` elements for tag navigation ✓
- Proper focus styles via class composition ✓

### i18n

- Tags come from blog post data — no hardcoded text ✓
- Links use locale-aware `Link` from `@/locales/navigation` ✓

### Code Quality

- Clean, minimal component ✓

### Test

- No test file exists for this component

---

## File 13: Contact CTA — `src/components/blog/contact-cta.tsx` (30 lines)

### Claims Accuracy

- "We'd love to answer your questions and help you find the right solution for your child" — parent-facing language, positions product as child-focused ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- `aria-hidden="true"` on ArrowRight icon ✓
- `<Link>` for navigation ✓

### i18n

- **F-009**: Hardcoded string branching with only en/th support:
  - Lines 14: `isThai ? "ต้องการพูดคุยกับทีมของเรา?" : "Want to talk to our team?"`
  - Lines 16-19: `isThai ? "เรายินดี..." : "We'd love to answer..."`
  - Line 25: `isThai ? "ติดต่อเรา" : "Contact Us"`
- Chinese (`zh`) locale falls back to English strings
- Should use i18n locale keys with all three language variants

### Code Quality

- Clean component with clear locale branching
- Uses locale prop instead of hook — appropriate for blog context

### Test

- No test file exists for this component

---

## Batch-05 Cross-Cutting Findings

### High

| # | Finding | Files | Description |
|---|---------|-------|-------------|
| F-004 | Stale Science Advantage launch claim | b2b-solutions.tsx locale | "Coming early 2026" — now past due; needs status update |
| F-007 | Hardcoded breadcrumb strings | blog-breadcrumbs.tsx lines 12, 18 | "Home" and "Blog" should use locale keys |
| F-009 | Hardcoded en/th branching in ContactCTA | contact-cta.tsx lines 14-26 | zh locale falls back to English; should use i18n keys |
| F-010 | Hardcoded en/th branching in ProductCTA | product-cta.tsx lines 22-34 | zh locale falls back to English; should use i18n keys (note: in batch-06) |

### Medium

| # | Finding | Files | Description |
|---|---------|-------|-------------|
| F-001 | Stale last-updated date | comparison-table.tsx locale | "October 2023" — nearly 3 years old |
| F-002 | Missing aria-label on pricing checkmarks | pricing-table.tsx lines 189, 198, 208 | Assistive tech doesn't know features are included |
| F-006 | `as never` type assertions on locale keys | b2b-solutions.tsx lines 140-144 | Bypasses TypeScript type safety for i18n key lookups |
| F-008 | Disabled pagination links use `href="#"` | blog-pagination.tsx lines 70-76, 106-114 | Tab focus + Enter changes URL to `#` |

### Low

| # | Finding | Files | Description |
|---|---------|-------|-------------|
| F-003 | Numeric locale key indices | pricing-table.tsx lines 15-166 | Fragile — reordering locale breaks mapping |
| F-005 | Space in image filename | b2b-solutions.tsx line 61 | `/primary-advantage logo.png` may cause URL encoding issues |

### Claims Matrix Updates Needed

- C-RA-02: `[NEEDS-PO]` Comparison table feature claims against competitors need verification
- C-RA-05: `[NEEDS-PO]` Pricing tiers and "coming-soon" features need verification
- C-MK-02: `[NEEDS-PO]` 50% grammar gains and 2x vocabulary growth claims need research citation
- C-CC-01/02: `[NEEDS-PO]` 15-week full-stack engineer claim needs verification
- C-TA-01/02: `[NEEDS-PO]` Tutor Advantage claims and 48h SLA need verification

---

## Test Coverage

| File | Existing Test | Coverage Quality |
|------|---------------|------------------|
| comparison-table.tsx | **None** | — |
| pricing-table.tsx | **None** | — |
| b2b-solutions.tsx | **None** | — |
| b2c-solutions.tsx | **None** | — |
| product-card.tsx | **None** | — |
| tutor-advantage.tsx | **None** | — |
| blog-breadcrumbs.tsx | **None** | — |
| blog-card.tsx | **None** | — |
| blog-header.tsx | **None** | — |
| blog-layout.tsx | **None** | — |
| blog-pagination.tsx | `blog-pagination.test.tsx` | Good — covers prev/next, pages, disabled states, ellipsis |
| blog-tags.tsx | **None** | — |
| contact-cta.tsx | **None** | — |

---

## Summary: Batch-05 Findings

| Severity | Count | Categories |
|----------|-------|------------|
| High | 4 | Stale launch claim (Science Advantage), hardcoded i18n in breadcrumbs, hardcoded i18n in contact-cta, hardcoded i18n in product-cta |
| Medium | 4 | Stale last-updated date, missing aria on pricing checkmarks, `as never` type assertions, disabled pagination link pattern |
| Low | 2 | Numeric locale keys, space in image filename |

### Claims Matrix Updates Needed

- C-MK-02: `[NEEDS-PO]` Statistical claims about grammar (+50%) and vocabulary (2x) gains require verification
- C-SA-01 (Science Advantage): `[NEEDS-PO]` "Coming early 2026" is now past due — verify launch status
- C-TC-02 (i18n): `[FAIL]` ContactCTA and ProductCTA have hardcoded en/th branching with no zh support
