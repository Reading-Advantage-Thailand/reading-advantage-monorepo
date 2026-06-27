# Batch-01 Evidence: Core Marketing Pages

> Track: `www_reading_advantage_review_20260626`
> Reviewed: 2026-06-27
> Files: 11 | Lines: 750

---

## File 1: Homepage — `src/app/[locale]/(marketing)/(home)/page.tsx` (278 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-MK-01 | "9 Products powered" — homepage claims 9 products (line 80: `Products powered` stats). Only 4 products have corresponding app directories (`apps/reading-advantage`, `apps/primary-advantage`, `apps/science-advantage`, `apps/codecamp-advantage`). Math, STEM, Storytime, Tutor, Zhongwen have NO app directories. | `apps/math-advantage` MISSING, `apps/stem-advantage` MISSING, etc. | `[FAIL]` Overstated |
| C-RA-04 | "2,172+ Mapped skills" (homepage locale `hero.stats.skills`) — cannot verify actual skill count against the engine. No data source confirmed. | Locale `home.ts` line 14 | `[UNKNOWN]` |
| C-MV-01 | "KST + SRS adaptive engine" claimed (line 21, locale `engine.pillars.kst.title` / `engine.pillars.srs.title`). KST (Knowledge Space Theory) and FSRS (Free Spaced Repetition Scheduler) are described in detail in `mastery-advantage.ts` locale. | Locale `mastery-advantage.ts` lines 37-43 | `[NEEDS-PO]` Verify actual implementation |
| C-MK-02 | "Aka 2019 Research: +9.5 points over grammar instruction" (locale `home.ts` line 57-58). Research citation present but unverifiable from code alone. | Locale `home.ts` line 57-58 | `[NEEDS-PO]` Requires PO to confirm citation |
| C-TC-02 | "Google Gemini & GPT-5 AI" (locale `home.ts` line 143). Claims specific AI models powering the platform. Cannot verify which models are actually in use from marketing site code alone. | Locale `home.ts` line 143 | `[UNKNOWN]` |

### SEO Metadata

**Critical: Homepage has NO `metadata` or `generateMetadata` export.** 

- File line 1-278: No metadata export exists. The most important page on the website has no title tag, no description, no Open Graph tags.
- Compare: About page (batch-01, file 2) has proper `metadata` export.

**Recommendation**: Add `generateMetadata` with locale-aware title/description/OG tags.

### Accessibility

- Line 106: `<MasteryAdvantageGraph>` used with `className` only — no explicit `alt` prop on the component call. Component must handle alt internally or it should be passed.
- Lines 76-101: Semantic `<dl>` used for stats — correct pattern.
- Lines 77-100: `<dd>` appears before `<dt>` in the markup (dd=value, dt=label). This is valid HTML5 but unusual ordering.

### i18n

- All visible text uses locale keys via `t()` function ✓
- Line 95: `{t("kstSrs")}` — locale key `kstSrs` is ambiguous; should be more descriptive (e.g., `engineName`)

### Conversion

- Primary CTA: "Book a 20-min demo" → `/contact` ✓
- Secondary CTA: "See the engine" → `/mastery-advantage` ✓
- Impact CTA also leads to `/contact` ✓

### Code Quality

- Line 95: `{t("kstSrs")}` referenced directly (not nested under a section) despite other keys being organized under `hero.stats`. Inconsistent key structure.

---

## File 2: About Page — `src/app/[locale]/(marketing)/about/page.tsx` (289 lines)

### Claims Accuracy

- Generic claims about "AI-powered learning solutions" and "transforming education" — standard marketing positioning, no falsifiable claims.

### SEO Metadata

- Lines 9-22: Static `metadata` export present ✓
- OG tags: `og:title`, `og:description`, `og:image` all present ✓
- **Missing**: No hreflang tags (important for 3-locale site)
- **Missing**: No canonical URL (though OG has `url`)
- **Missing**: No `metadataBase` — unlike blog pages which set it from env
- **Issue**: Title is hardcoded English "About Us - Reading Advantage (Thailand)" — NOT locale-aware. Thai/Chinese users see English title.

### Accessibility

- Line 107-113: `next/image` with `alt={t("altText.team")}` ✓
- Heading hierarchy: H1 (via HeroSection) → H2 → H3 ✓

### i18n

- All visible text via `t()` ✓
- `altText.team` key used for multiple images (about-team.jpg and teacher-at-board.png) — different images sharing the same alt text is an accessibility concern.

### Conversion

- CTA button leads to `/contact` ✓
- No secondary CTAs

---

## File 3: Blog Listing — `src/app/[locale]/(marketing)/blog/page.tsx` (60 lines)

### SEO Metadata

- Lines 12-31: Static `metadata` export ✓
- OG tags: `title`, `description`, `type`, `images` ✓
- Twitter card ✓
- `metadataBase` from env ✓

### i18n

- **Lines 44-48**: Hardcoded English strings used directly instead of locale keys:
  - Line 44: `description="Educational insights, learning strategies, and product updates from Reading Advantage."`
  - Line 45: `text: "Contact Us"`
  - These should use `t()` from the blog locale.

### Accessibility

- Blog post cards rendered via `<BlogCard>` — alt text handling delegated to that component.

---

## File 4: Blog Detail — `src/app/[locale]/(marketing)/blog/[slug]/page.tsx` (117 lines)

### SEO Metadata

- Lines 24-50: `generateMetadata` with dynamic post data ✓
- OG article tags: `publishedTime`, `authors`, `tags` all present ✓

### Accessibility

- Line 80-86: Cover image with `alt={post.title}` ✓
- Line 100-102: `dangerouslySetInnerHTML` used for blog content — potential XSS vector if content contains unsanitized HTML.

### Code Quality

- Line 101: `dangerouslySetInnerHTML={{ __html: post.content }}` — should sanitize HTML content before rendering.

---

## File 5: Blog Pagination — `src/app/[locale]/(marketing)/blog/page/[page]/page.tsx` (72 lines)

### SEO Metadata

- Lines 19-42: `generateMetadata` with dynamic page number ✓

### i18n

- **Major gap**: All text is hardcoded English, not using locale:
  - Line 54: `title={\`Blog - Page ${pageNumber}\`}`
  - Line 55: `description="Educational insights..."` 
  - Line 57: `text: "Contact Us"`
  - Line 59: `href: "/blog"`

### Test Coverage

- No test exists for this pagination page.

---

## File 6: Case Studies — `src/app/[locale]/(marketing)/case-studies/page.tsx` (308 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-MK-03 | **"Real Results from Real Schools"** (locale `case-studies.ts` line 6) — but all data uses **placeholder values**: "School A (Coming Soon)", "+X points over Y months", "X articles per student", "X/100", "Teacher Name". No actual results are displayed. This heading overstates the content. | Locale `case-studies.ts` lines 23-50 | `[FAIL]` Misleading heading vs placeholder data |
| C-MK-04 | Testimonial attributes "Teacher Name" / "School A" — not real, clearly placeholder. No partner logos or authenticated testimonials visible. | Locale `case-studies.ts` lines 45-49 | `[FAIL]` Not authentic |

### SEO Metadata

- **Critical: No metadata export at all.** No title, description, OG tags for the case studies page.

### Accessibility

- Lines 96-101, 104-111, 113-120: All images use `next/image` with locale-sourced alt text ✓

### i18n

- All visible text via `t()` ✓

### Code Quality

- Lines 12-43: Complex data construction with nested locale lookups — but well-structured.
- The placeholder data pattern ("X points", "School A", "Teacher Name") should be flagged as incomplete feature rather than live marketing content.

---

## File 7: Contact — `src/app/[locale]/(marketing)/contact/page.tsx` (194 lines)

### SEO Metadata

- **Critical: No metadata export at all.** No title, description, OG tags for the contact page.

### Accessibility

- Lines 144-151: Line QR image with `alt={t("lineQrCode")}` ✓
- Lines 163-171: External TikTok link has `target="_blank"` and `rel="noopener noreferrer"` ✓

### i18n

- All visible text via `t()` ✓

### Conversion

- Email CTA: `support@reading-advantage.com` (mailto:) ✓
- Phone: `+66 099-005-8038` (tel:) ✓
- TikTok external link ✓
- Line QR code for LINE messaging ✓
- Multiple contact channels — good conversion design

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-MK-04 | Phone number `+66 099-005-8038` — hardcoded in component (line 79). Should be moved to locale for i18n and easy updates. | Contact page line 79 | `[Medium]` |
| C-MK-04 | Email `support@reading-advantage.com` — hardcoded in 3 places (lines 30, 62, 185). Should use locale. | Contact page lines 30, 62, 185 | `[Medium]` |
| C-TC-03 | TikTok handle `@reading.advantage` — hardcoded URL (line 163). Should be in locale. | Contact page line 163 | `[Medium]` |

---

## File 8: Features — `src/app/[locale]/(marketing)/features/page.tsx` (145 lines)

### SEO Metadata

- Lines 10-23: Static `metadata` export ✓
- OG tags present ✓
- **Missing**: No `metadataBase` set
- Title: "Features - Reading Advantage Thailand" — NOT locale-aware

### Accessibility

- Lines 70-77: `next/image` with `alt={t("hero.alt")}` ✓
- Line 46: `bg-[url('/grid-pattern.svg')]` — **FILE NOT FOUND** (`public/grid-pattern.svg` does not exist). This will cause a 404 and no background image.

### i18n

- All visible text via `t()` ✓

### Code Quality

- Line 25: `type IndexRange = 0 | 1 | 2 | 3 | 4 | 5` — fragile, must match locale feature count exactly

---

## File 9: Mastery Advantage — `src/app/[locale]/(marketing)/mastery-advantage/page.tsx` (265 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-MV-01 | Spaced repetition claim with FSRS algorithm naming — detailed technical description in locale matching actual FSRS (Free Spaced Repetition Scheduler) algorithm characteristics | Locale `mastery-advantage.ts` lines 41-43 | `[NEEDS-PO]` Verify actual FSRS implementation |
| C-MV-02 | Knowledge state tracking via KST (Knowledge Space Theory) — detailed description with DAG prerequisites | Locale `mastery-advantage.ts` lines 37-39 | `[NEEDS-PO]` |
| C-MV-03 | Graph/data visualization on page — MarketingSvg and MasteryAdvantageGraph components present ✓ | Page lines 92-99, 112-119 | `[PASS]` Visual elements present |
| C-MK-01 | "9 Products powered" — same claim as homepage, 5 products have no app directory | Page lines 37-46 (product list) | `[FAIL]` Overstated |

### SEO Metadata

- Lines 9-26: `generateMetadata` with locale-aware description ✓
- OG tags present ✓
- **Missing**: OG image, canonical URL, hreflang

### i18n

- All visible text via `t()` ✓

---

## File 10: Pricing — `src/app/[locale]/(marketing)/pricing/page.tsx` (103 lines)

### SEO Metadata

- Lines 9-22: Static `metadata` export ✓
- OG tags present ✓
- **Missing**: No `metadataBase` set
- Title: "Reading Advantage Feature Matrix" — NOT locale-aware
- Note: title mentions "Feature Matrix" rather than "Pricing" — potential SEO mismatch

### i18n

- All visible text via `t()` ✓

### Conversion

- CTA leads to `/contact` ✓
- Trust signals section (No hidden fees, Instant setup, Dedicated support) — good conversion patterns

---

## File 11: Products Overview — `src/app/[locale]/(marketing)/products/page.tsx` (136 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-RA-04 | Grade bands: Storytime (K-3), Primary (3-6), Reading (6+) — grade ranges from locale, cannot verify against actual products | Locale `products/overview.ts` | `[UNKNOWN]` |

### SEO Metadata

- Lines 10-14: Static `metadata` export ✓
- **Missing**: NO Open Graph tags (only title and description)
- **Missing**: No `metadataBase`

### i18n

- All visible text via `t()` ✓

---

## Summary: Batch-01 Findings

| Severity | Count | Categories |
|----------|-------|------------|
| Critical | 3 | SEO (homepage, case studies, contact — no metadata) |
| High | 5 | Claims (9 products overstated, case study placeholders), i18n (blog pages hardcoded), Missing assets (grid-pattern.svg, og-image.jpg) |
| Medium | 7 | Locale-aware titles, hreflang, canonical, metadataBase, blog pagination hardcoded text |
| Low | 4 | Alt text reuse, key naming inconsistency, fragile IndexRange type |

### Claims Matrix Updates Needed

- C-MK-01: `[FAIL]` 9 products claim overstated; only 4 have app directories
- C-MK-03: `[FAIL]` Case study headings overstate results; data is placeholder
- C-MK-04: `[FAIL]` No authenticated partner logos or testimonials visible
- C-MK-02: `[NEEDS-PO]` Aka 2019 research citation
- C-MV-01: `[NEEDS-PO]` FSRS implementation
- C-MV-02: `[NEEDS-PO]` KST implementation
- C-MV-03: `[PASS]` Visual elements present
- C-TC-03: `[PASS]` SEO metadata present on most pages (3 pages missing)
- C-TC-02: `[NEEDS-PO]` 3 languages confirmed (en, th, zh); completeness needs check
