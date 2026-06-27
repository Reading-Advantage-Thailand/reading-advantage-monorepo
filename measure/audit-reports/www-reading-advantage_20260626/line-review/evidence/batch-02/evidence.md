# Batch-02 Evidence: Product Pages

> Track: `www_reading_advantage_review_20260626`
> Reviewed: 2026-06-27
> Files: 7 | Lines: 1,410

---

## File 1: Reading Advantage — `src/app/[locale]/(marketing)/products/reading-advantage/page.tsx` (516 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-RA-01 | "AI-Powered Language Learning" hero title | Line 3 (locale) | `[PASS]` RA app is AI-powered |
| C-RA-01 | "Starting May 2026, Reading Advantage will also offer a comprehensive Blended Learning model" | Locale `reading-advantage.ts` line 5 | **`[FAIL]` Past due** — current date is June 27, 2026; Blended Learning should have launched or text needs updating |
| C-RA-02 | "Over 3,000 articles available, 60 new pieces added daily" | Locale `reading-advantage.ts` lines 22-23 | `[UNKNOWN]` Cannot verify article count from marketing site code |
| C-RA-02 | "Switch between English, Thai, Chinese, Vietnamese, and more languages" | Locale `reading-advantage.ts` line 59 | `[PASS]` RA app locales confirm en, th, zh, vi, cn, tw |
| C-RA-02 | Games: Magic Defense, RPG Battle, Dragon Flight, Wizard vs Zombie | Locale `reading-advantage.ts` lines 136-156 | `[PASS]` Games confirmed existing at `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/` |
| C-RA-03 | Screenshots: `app-on-desktop.png`, `reading-advantage-demo.png`, `app-on-phone.png` | File lines 143-181 | `[PASS]` Images exist in `public/images/` |
| C-RA-03 | Screenshot path `/images/reading-advantage-demo.png` used for tablet mockup | File line 160 | `[PASS]` File exists |
| C-MK-01 | Hero background image `/images/hero-reading-advantage.jpg` | File line 74 | `[PASS]` File exists |
| C-RA-04 | "Evidence-Based Methodology" referencing "Aka, 2019" with "+9.5 pts" | Locale `reading-advantage.ts` lines 80-87 | `[NEEDS-PO]` Research citation |

### SEO Metadata

- **Critical: No `metadata` or `generateMetadata` export exists.**
- File starts with `"use client"` (line 1) — this entirely prevents server-side metadata generation.
- SEO metadata completely missing for the Reading Advantage product page.

### Performance / Architecture

- **Line 1: `"use client"` forces entire page to client-side rendering.**
  - No SSR for a content-heavy marketing page — bad for SEO, LCP, and initial load.
  - The page uses `useScopedI18n` from `@/locales/client` (client-side only).
  - Consider splitting into server component shell with client islands.

### Accessibility

- Lines 143, 160, 174, 176: All images use `next/image` with locale-sourced alt ✓
- Line 175: Image `app-on-phone.png` referenced with `object-cover` — may crop important content on mobile device mockup

### i18n

- All visible text uses locale keys via `useScopedI18n()` ✓
- Hero description concatenates `${t("hero.subtitle")} ${t("hero.description")}` — consider using template in locale instead

### Conversion

- Primary CTA: "Sign Up Your School" → mailto: with pre-filled inquiry email ✓
- Secondary: "Start Free Trial" → /contact ✓
- Good multi-CTA pattern with both email and contact page paths

### Code Quality

- Line 1-2: `"use client"` + Image import — `next/image` works in client components but loses optimization benefits when used without server components
- Parent locale file (`reading-advantage.ts`) at 578 lines is very large — consider splitting

---

## File 2: Primary Advantage — `src/app/[locale]/(marketing)/products/primary-advantage/page.tsx` (377 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-PA-01 | "CEFR aligned" for grades 3-6 (Pre-A1 through B1) | Page lines 86-101 | `[UNKNOWN]` Cannot verify CEFR alignment from code |
| C-PA-02 | "100 baht per student per month" hardcoded in mailto link | Page line 111 (and again line 359) | `[Medium]` Pricing hardcoded; should be in locale |
| C-PA-02 | "Free pilot term" in mailto body | Page line 111 | `[UNKNOWN]` Cannot verify free pilot offering from code |
| C-PA-03 | Age/grade claim: "3-6" displayed as FloatingPill | Page line 199 | `[UNKNOWN]` Cannot verify target grade levels |
| C-PA-01 | Platform screenshots under `/images/reading-advantage/` path (e.g., `choose-your-article.png`) | Page lines 53-78 | `[PASS]` Images confirmed existing |
| C-PA-01 | "Multi-Language Support" including Vietnamese (`language-selector-en-th-zh-vn.png`) | Locale `primary-advantage.ts` feature description | `[PASS]` RA app has vi locale |

### SEO Metadata

- **Critical: No `metadata` or `generateMetadata` export.**
- Primary Advantage product page has no SEO metadata at all.

### Accessibility

- Line 118: `productLogo` image with `alt` ✓
- Line 188-196: Feature image with fill/layout ✓
- Images with alt text via locale ✓

### i18n

- All visible text via `t()` ✓
- **Issue**: Pricing ("100 baht per student per month") hardcoded in mailto link body at lines 111 and 359. Should be in locale for easy updates and translation.

### Code Quality

- Line 111: Price and offer details hardcoded in URL-encoded mailto body — fragile and locale-specific
- Lines 344-351: Animated FloatingPill components with `animate-bounce` — decorative but may impact performance

---

## File 3: Science Advantage — `src/app/[locale]/(marketing)/products/science-advantage/page.tsx` (399 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-SA-01 | "Launching in 2025" — metadata (line 29) and locale | Line 29: metadata OG description | **`[FAIL]` Past due** — current date June 2026; claim says "launching in 2025" |
| C-SA-02 | "NGSS standards" alignment claim | Locale description | `[UNKNOWN]` Cannot verify NGSS alignment |
| C-SA-01 | "Comprehensive K-12 science education platform" | Metadata description | `[UNKNOWN]` No actual app exists at `apps/science-advantage/` — product is either vaporware or not connected to this site |
| C-SA-01 | "Coming Soon" badge displayed | Page line 58 | `[PASS]` Consistent with product status |
| C-SA-01 | Science Advantage logo image `/science-advantage.png` | Page line 80 | `[PASS]` File exists |
| C-SA-01 | Hero background image `/images/hero-science-advantage.jpg` | Page line 44 | `[PASS]` File exists |

### SEO Metadata

- Lines 22-31: Static `metadata` export ✓
- OG tags present ✓
- One of the few batch-02 product pages with proper SEO metadata.

### Accessibility

- Lines 44-51: Hero image with `fill` + `priority` + alt text ✓
- Lines 80-86: Logo image with alt ✓
- All images properly handled ✓

### i18n

- All visible text via `t()` ✓

### Code Quality

- **Lines 380-392: Waitlist form with email input has NO `action` or `onSubmit` handler.** The form is non-functional:
  ```html
  <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
    <input type="email" placeholder={...} />
    <button type="submit">...</button>
  </form>
  ```
  Submitting this form will do a page refresh with no data being sent anywhere. Either a missing `action` or missing JavaScript handler.
- Line 270: `point.replace(/^[✓•]\s*/, "")` — fragile text manipulation pattern that strips bullet characters from locale strings. If locale doesn't include bullets, it may have no effect but is an odd pattern.
- Line 29: Description says "launching in 2025" — outdated.

---

## File 4: CodeCamp Advantage — `src/app/[locale]/(marketing)/products/codecamp-advantage/page.tsx` (418 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-CC-01 | "Launching in 2025" — OG description line 31 | Line 31 | **`[FAIL]` Past due** |
| C-CC-02 | Coding tracks: NEXT.js, MERN, Django — specific language/platform claims | Locale data | `[UNKNOWN]` Cannot verify from code |
| C-CC-02 | Tech stack: Next.js, React, Node.js, GitHub, Docker, Vercel | File lines 276-282 | `[UNKNOWN]` Cannot verify actual curriculum |
| C-CC-01 | "Coming Soon" badge displayed | Page line 61 | `[PASS]` Consistent with status |
| C-CC-01 | Hero image `/images/hero-codecamp-advantage.jpg` | Page line 48 | `[PASS]` File exists |
| C-CC-01 | Workspace image `/images/codecamp-advantage-hero.jpg` | Page line 84 | `[PASS]` File exists |
| C-CC-01 | No root logo file (`codecamp-advantage.png` not found at public root) | Checked public/ and public/images/ | `[Medium]` Missing product logo at root level |

### SEO Metadata

- Lines 24-33: Static `metadata` export ✓
- OG tags present ✓

### i18n

- All visible text via `t()` ✓
- Code snippets in cards are hardcoded English (e.g., `$ git commit -m "init"`, `const project`) — expected for code display

### Accessibility

- Images with alt text via locale ✓
- MarketingSvg with alt ✓
- Good use of semantic HTML

### Code Quality

- Well-structured page with clear sections ✓

---

## File 5: Math Advantage — `src/app/[locale]/(marketing)/products/math-advantage/page.tsx` (344 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-MA-01 | "Launching in 2025" — OG description line 26 | Line 26 | **`[FAIL]` Past due** |
| C-MA-01 | "AI-enhanced math tutoring platform" | Metadata description | `[UNKNOWN]` No actual app at `apps/math-advantage/` |
| C-MA-02 | "3× faster learning" — marketing stat | Page line 288 | `[UNKNOWN]` Unverifiable from code |
| C-MA-02 | "95% confidence boost" — marketing stat | Page line 297 | `[UNKNOWN]` Unverifiable marketing claim |
| C-MA-02 | "24/7 AI support" — marketing stat | Page line 305 | `[UNKNOWN]` |
| C-MA-01 | Subject coverage: Algebra, Geometry, Calculus, Statistics, Trigonometry, Arithmetic | Locale data | `[UNKNOWN]` |
| C-MA-01 | Hero background `/images/hero-math-advantage.jpg` | Page line 80 | `[PASS]` File exists |
| C-MA-01 | Logo image `/math-advantage.png` | Page line 113 | `[PASS]` File exists |

### SEO Metadata

- Lines 19-28: Static `metadata` export ✓
- OG tags present ✓

### Accessibility

- Hero image with `fill` + `priority` + alt ✓
- All images with proper alt text ✓

### i18n

- All visible text via `t()` ✓

### Code Quality

- Line 78: Comment `/* Hero Section — Already done, keep as-is */` — unusual work-in-progress comment
- Marketing stats ("3×", "95%", "24/7") are hardcoded in the page component (lines 288, 297, 305), not in locale — these should be in locale for i18n.

---

## File 6: STEM Advantage — `src/app/[locale]/(marketing)/products/stem-advantage/page.tsx` (384 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-STEM-01 | "Launching in 2025" — OG description line 27 | Line 27 | **`[FAIL]` Past due** |
| C-STEM-01 | "75% coding + 25% STEM integration" — specific ratio claim | Page line 178, locale | `[UNKNOWN]` Cannot verify curriculum ratio |
| C-STEM-01 | "Comprehensive K-12 coding education platform" | OG description | `[UNKNOWN]` No actual app at `apps/stem-advantage/` |
| C-STEM-01 | Grade breakdown: 3 levels (grade ranges from locale) | Locale | `[UNKNOWN]` |
| C-STEM-01 | Hero image `/images/hero-stem-advantage.jpg` | Page line 43 | `[PASS]` File exists |
| C-STEM-01 | Logo `/stem-advantage.png` | Page line 77 | `[PASS]` File exists |

### SEO Metadata

- Lines 20-29: Static `metadata` export ✓
- OG tags present ✓
- No `metadataBase`

### Accessibility

- Hero image with `fill` + `priority` + alt ✓
- All images with proper alt text ✓

### Code Quality

- Good use of structured components (OverlappingSection, StepFlow, Card) ✓

---

## File 7: Storytime Advantage — `src/app/[locale]/(marketing)/products/storytime-advantage/page.tsx` (385 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-ST-01 | "Launching in 2025" — metadata description line 24 | Line 24 | **`[FAIL]` Past due** |
| C-ST-01 | "Comprehensive K-3 early literacy curriculum" | Metadata description | `[UNKNOWN]` No actual app at `apps/storytime-advantage/` |
| C-ST-01 | "Coming Soon" badge displayed | Page line 122 | `[PASS]` Consistent with status |
| C-ST-01 | Hero image `/images/hero-storytime-advantage.jpg` | Page line 108 | `[PASS]` File exists |
| C-ST-01 | Logo `/storytime-advantage.png` | Page line 144 | `[PASS]` File exists |
| C-ST-01 | Classroom image `/images/storytime-advantage-hero.jpg` | Page line 281 | `[PASS]` File exists |

### SEO Metadata

- Lines 20-30: Static `metadata` export ✓
- OG tags present ✓

### i18n

- All text via `t()` ✓

### Accessibility

- All images with alt text ✓

### Code Quality

- Well-structured with FAQAccordion, OverlappingSection, staggered cards ✓

---

## Batch-02 Cross-Cutting Findings

### Critical Findings

1. **All 4 "Launching in 2025" products (Science, CodeCamp, Math, STEM, Storytime) are past due** — current date is June 2026. The "launching in 2025" claim in OG metadata and locale text has been inaccurate for 6+ months.
2. **Reading Advantage and Primary Advantage product pages have NO SEO metadata** — missing `metadata` or `generateMetadata` export entirely.
3. **Reading Advantage is `"use client"`** — entire 516-line page is client-rendered, losing SSR benefits.

### High Findings

1. **Science Advantage waitlist form is non-functional** — HTML form at line 380 has no `action` or `onSubmit` handler; submitting does nothing.
2. **"Starting May 2026" blended learning claim on RA product page** — past due by ~1 month.
3. **5 of 9 products have no actual app** (Math, STEM, Storytime, Tutor, Zhongwen) — no `apps/<product>-advantage` directories exist.

### Medium Findings

1. **Pricing hardcoded in mailto links** — Primary Advantage page includes "100 baht per student per month" in URL-encoded mailto body (lines 111, 359).
2. **Marketing stats hardcoded in components** — Math Advantage has "3×", "95%", "24/7" as hardcoded strings (not in locale).
3. **No `metadataBase`** on several pages that have metadata exports.

### Summary: Batch-02 Findings

| Severity | Count | Categories |
|----------|-------|------------|
| Critical | 6 | Past-due "launching in 2025" claims (5 products), missing metadata (2 pages), use-client architecture (1 page) |
| High | 3 | Non-functional form (1), past-due blended learning (1), vaporware product claims (5 products without apps) |
| Medium | 4 | Hardcoded pricing, hardcoded stats, missing metadataBase, missing product logo |
| Low | 2 | Work-in-progress comment, fragile replace pattern |

### Claims Matrix Updates Needed

- C-RA-01: `[FAIL]` Blended Learning "Starting May 2026" is past due; update needed
- C-RA-02: `[PASS]` Games verified existing in RA app; multi-language confirmed
- C-RA-03: `[PASS]` Screenshots verified existing
- C-RA-04: `[NEEDS-PO]` Research citation + target audience claims
- C-RA-05: `[NEEDS-PO]` Pricing/availability (no actual pricing on page)
- C-PA-01: `[FAIL]` No SEO metadata; pricing hardcoded in mailto
- C-PA-02: `[UNKNOWN]` Feature accuracy against apps needs PO
- C-PA-03: `[UNKNOWN]` Age/grade claims
- C-SA-01: `[FAIL]` "Launching in 2025" past due; form broken
- C-SA-02: `[UNKNOWN]` NGSS curriculum claims
- C-CC-01: `[FAIL]` "Launching in 2025" past due; missing logo file
- C-CC-02: `[UNKNOWN]` Coding language/platform claims
- C-MA-01: `[FAIL]` "Launching in 2025" past due; no app exists
- C-MA-02: `[FAIL]` "3× faster learning" and "95%" unverifiable marketing claims
- C-STEM-01: `[FAIL]` "Launching in 2025" past due; no app exists
- C-ST-01: `[FAIL]` "Launching in 2025" past due; no app exists
