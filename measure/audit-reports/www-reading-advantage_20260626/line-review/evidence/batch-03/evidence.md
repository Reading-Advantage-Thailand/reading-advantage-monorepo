# Batch-03 Evidence: Remaining Product + Services Pages + Layouts + Header/Footer

> Track: `www_reading_advantage_review_20260626`
> Reviewed: 2026-06-27
> Files: 10 | Lines: ~1,985 (manifest predicted 1,050 — actual exceeds due to file growth)

---

## File 1: Tutor Advantage — `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx` (426 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-TA-01 | Metadata title: "Tutor Advantage - Reading Advantage Thailand" | Line 24 | `[PASS]` Product page exists |
| C-TA-02 | Metadata description: "launching in Thailand in 2025" | Line 26 | **`[FAIL]` Past due** — current date is June 2026 |
| C-TA-02 | OG description: "launching in Thailand in 2025" | Line 30 | **`[FAIL]` Past due** |
| C-TA-02 | Stat section hardcoded "2025" launch year | Line 378 | **`[FAIL]` Past due** |
| C-TA-01 | "Coming Soon" badge displayed | Line 61 | `[PASS]` Consistent with status |
| C-TA-01 | Hero image `/images/hero-tutor-advantage.jpg` | Line 47 | `[PASS]` File exists |
| C-TA-01 | Logo `/tutor-advantage.png` | Line 83 | `[PASS]` File exists |
| C-TA-01 | Screenshot `/images/tutor-advantage-hero.jpg` | Line 179 | `[PASS]` File exists |
| C-TA-02 | CEFR coverage stat "A1–B2" hardcoded | Line 369 | `[UNKNOWN]` CEFR claim cannot be verified from code |
| C-TA-02 | Hardcoded step titles: "Assess", "Personalize", "Progress" | Lines 149, 154, 159 | `[Medium]` Not localized, hardcoded English |

### SEO Metadata

- Lines 23-32: Static `metadata` export ✓
- OG tags: title, description ✓
- **Missing**: OG image, `metadataBase`, canonical, hreflang
- Title is hardcoded English — NOT locale-aware

### Accessibility

- Hero image with `fill` + `priority` + `alt={t("heroAlt")}` ✓
- Logo image with `alt={t("logoAlt")}` ✓
- Screenshot with `alt={t("platformAlt")}` ✓
- Decorative blur elements have `aria-hidden="true"` ✓

### i18n

- All visible text via `t()` ✓ except step titles "Assess", "Personalize", "Progress" (hardcoded)
- CEFR stat "A1–B2" hardcoded at line 369 — should be in locale
- Launch year "2025" hardcoded at lines 26, 30, 378

### Conversion

- Primary CTA: "Register Now" → `/contact` ✓
- Secondary CTA: "Apply as Tutor" → `/contact` ✓
- Both CTAs lead to the same contact page

### Code Quality

- Lines 55, 127, 289: `bg-[url('/grid-pattern.svg')]` — **FILE NOT FOUND** (`public/grid-pattern.svg` does not exist). This will produce a 404 for the background pattern and render no grid decoration on 3 sections.
- Well-structured page with clear sections and consistent color theme (emerald)

---

## File 2: Zhongwen Advantage — `src/app/[locale]/(marketing)/products/zhongwen-advantage/page.tsx` (480 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-ZA-01 | FAQ: "scheduled to launch in early 2025" | Line 85 | **`[FAIL]` Past due** — June 2026 |
| C-ZA-01 | "Coming Soon" badge displayed | Line 118 | `[PASS]` Consistent with status |
| C-ZA-01 | Hero image `/images/hero-zhongwen-advantage.jpg` | Line 103 | `[PASS]` File exists |
| C-ZA-01 | Logo `/zhongwen-advantage.png` | Line 139 | `[PASS]` File exists |
| C-ZA-01 | Screenshot `/images/zhongwen-advantage-hero.jpg` | Line 282 | `[PASS]` File exists |
| C-ZA-01 | HSK mapping levels 1-3 / 4-6 | Lines 218, 246 | `[UNKNOWN]` Curriculum alignment |
| C-ZA-02 | "Stroke recognition" / "AI-powered tone feedback" claims | Lines 50-57, 331-333 | `[UNKNOWN]` Cannot verify actual app capabilities |
| C-ZA-02 | Hardcoded interactive features (Character Mastery, Pronunciation Perfect) | Lines 46-59 | `[High]` Hardcoded English, not localized |
| C-ZA-02 | Hardcoded educator features (Class Management, Progress Tracking, Custom Content) | Lines 61-79 | `[High]` Hardcoded English, not localized |
| C-ZA-02 | Hardcoded FAQ items with questions and answers | Lines 81-97 | `[High]` Hardcoded English, not localized |
| C-ZA-02 | Hardcoded Interactive Learning bullet points (3 items) | Lines 331-338 | `[Medium]` Hardcoded English |

### SEO Metadata

- Lines 24-36: `generateMetadata()` function ✓ (dynamic, locale-aware for OG description)
- OG tags: title, description ✓
- **Missing**: OG image, `metadataBase`, canonical, hreflang
- Title is hardcoded English: "Zhongwen Advantage - The Future of Chinese Learning | Reading Advantage Thailand"

### Accessibility

- Logo image line 140: `alt="Zhongwen Advantage"` — hardcoded alt text, not using locale
- Hero image with `fill` + `priority` + `alt={t("hero.alt")}` ✓
- SVG visualization with `alt={t("adaptiveEngine.alt")}` ✓
- Large image break with `alt={t("levelMapping.alt")}` ✓

### i18n

- **Major gap**: Interactive features, educator features, FAQ items, and learning bullet points are ALL hardcoded English strings — not in locale files
- These should be moved to locale keys under `pages.products.zhongwenAdvantage`

### Conversion

- CTA: "Join Waitlist" → `/contact` ✓
- Secondary CTA: "Learn More" → `/contact` ✓
- Waitlist form at lines 425-441: email input with subscribe button — **BUT form has NO `action` or `onSubmit` handler** (same pattern as Science Advantage batch-02 finding). Submitting does nothing beyond page refresh.
- This is a `[Critical]` conversion gap — waitlist signups are completely non-functional

### Code Quality

- Line 112: `bg-[url('/grid-pattern.svg')]` — **FILE NOT FOUND** (`grid-pattern.svg`)
- Large file (480 lines) but well-structured with clear sections

---

## File 3: Services Overview — `src/app/[locale]/(marketing)/services/page.tsx` (172 lines)

### Claims Accuracy

- Service data loaded dynamically from locale `pages.services` — claims depend on locale content
- Images referenced from locale — can't verify statically
- All visible text via `t()` ✓
- CTAs: all lead to `/contact` ✓

### SEO Metadata

- **Critical: No `metadata` or `generateMetadata` export**. No title, description, or OG tags.

### Accessibility

- Service card images use locale-sourced `alt={service.name}` ✓
- Semantic HTML with `<main>`, `<section>`, `<ul>`, `<li>` ✓
- `aria-hidden` on decorative blur elements ✓

### i18n

- All visible text via `t()` ✓

### Code Quality

- Lines 10-15: `serviceConfigs` with duplicated `featureIndexes` (`[0,1,2,3,4,5]` repeated) — fragile, depends on exactly 6 features per service. Service index 3 only has 4 features.
- Lines 16-27: `as never` casts for dynamic locale access — potential runtime errors if keys are missing
- Line 66: `animationDelay` inline styles — standard pattern but no `prefers-reduced-motion` check

---

## File 4: Blended Learning — `src/app/[locale]/(marketing)/services/blended-learning/page.tsx` (332 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-SV-01 | Blended Learning program described | Entire page | `[PASS]` Page exists and content is locale-driven |
| C-SV-03 | Availability badge shows target date | Line 228: `levels.availabilityDate` | `[UNKNOWN]` Depends on locale content |
| C-SV-01 | Hero image `/images/blended-learning.png` | Line 71 | `[PASS]` File exists |
| C-SV-01 | Workbook image `/images/workbook-cover.png` | Line 104 | `[PASS]` File exists |
| C-SV-01 | Teacher image `/images/teacher-at-board.png` | Line 174 | `[PASS]` File exists |

### SEO Metadata

- **Critical: No `metadata` or `generateMetadata` export**. No title, description, or OG tags.

### Accessibility

- All images with locale-sourced alt text via `altTexts.*` keys ✓
- Semantic HTML structure ✓
- `aria-hidden` on decorative elements ✓

### i18n

- All visible text via `t()` ✓

### Conversion

- CTA 1: "Get Started" → `/contact` ✓
- CTA 2: "View Case Studies" → `/case-studies` ✓
- Good dual-CTA pattern

### Code Quality

- Lines 38-42: `onboardingIcons` Record with string-keyed JSX elements — fragile, depends on matching locale icon names exactly. Falls back to `Target` if key not found.
- Well-structured with logical section ordering

---

## File 5: Managed Service — `src/app/[locale]/(marketing)/services/managed-service/page.tsx` (224 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-SV-02 | Managed Service scope | Entire page | `[PASS]` Page exists and uses locale |
| C-SV-03 | Roadmap target date from locale | Line 201 | `[UNKNOWN]` Depends on locale |
| C-SV-02 | Images: teacher-and-dashboard.png, teacher-assisting-students.png, small-group.png | Lines 64, 79, 173 | `[PASS]` All files exist |

### SEO Metadata

- **Critical: No `metadata` or `generateMetadata` export**. No title, description, or OG tags.

### Accessibility

- All images with locale-sourced alt text ✓

### i18n

- All visible text via `t()` ✓

### Conversion

- CTA 1: "View All Services" → `/services` ✓
- CTA 2: "Contact Us" → `/contact` ✓

### Code Quality

- Clean, well-structured page
- Good separation of layout into overview, benefits, roadmap sections

---

## File 6: Root Layout — `src/app/[locale]/layout.tsx` (31 lines)

### SEO Metadata

- Lines 7-19: Static `metadata` export ✓ with `metadataBase` ✓ (only root page that has this)
- Title: "Reading Advantage (Thailand) - Innovative EdTech Solutions" — hardcoded English, NOT locale-aware
- OG: title, description, images, url present ✓
- OG image: `/images/og-image.jpg` — **FILE NOT FOUND** (confirmed: `public/images/og-image.jpg` does not exist). This is shared as the default OG image across the entire site.
- Keywords and authors metadata ✓

### i18n

- `html lang={locale}` — dynamically set from params ✓
- `LocaleProvider` wraps children ✓
- Messages loaded via `getMessages()` ✓

### Accessibility

- `suppressHydrationWarning={true}` — intentional for next-intl hydration

### Performance

- Layout is async but minimal — only loads messages and renders LocaleProvider

---

## File 7: Marketing Layout — `src/app/[locale]/(marketing)/layout.tsx` (23 lines)

### Structure

- Wraps children with `Header` and `Footer`
- `animate-in fade-in` class on wrapper div
- Note: imports `Footer` from `@/components/common/footer` (matches actual file location; file-inventory.tsv incorrectly lists it under `components/layout/`)

### SEO

- No metadata export — inherits from root layout

### Accessibility

- Semantic structure: `<main>` element for content ✓

---

## File 8: Reading Advantage Sub-Layout — `src/app/[locale]/(marketing)/products/reading-advantage/layout.tsx` (19 lines)

### SEO Metadata

- Lines 3-11: Static `metadata` export with title, description, OG title, OG description, OG image
- OG image: `/images/reading-advantage-demo.png` → `[PASS]` File confirmed exists
- Title: "Reading Advantage - AI-Powered Language Learning Platform" — hardcoded English, NOT locale-aware

### Architecture Note

- This layout's metadata may conflict with the Reading Advantage page itself (batch-02, file 1) which is `"use client"` and cannot export server-side metadata. The layout metadata serves as the effective SEO metadata for the page.

---

## File 9: Header — `src/components/layout/header.tsx` (177 lines)

### Claims Accuracy

- Navigation items sourced from `components.common.navigation` locale keys ✓
- Logo: `/images/logo.jpg` → `[PASS]` File exists
- All navigation links use locale-aware `Link` from `@/locales/navigation` ✓

### i18n

- All text via `useScopedI18n` hooks: `h()` for header locale, `n()` for navigation locale ✓
- `LocaleSwitcher` rendered in desktop header ✓
- Menu button `sr-only` text: `h("openMenu")` ✓

### Accessibility

- Sheet has `SheetTitle` and `SheetDescription` for screen reader context ✓
- `sr-only` span on mobile menu button ✓
- Responsive: mobile sheet + desktop navigation ✓

### Code Quality

- `"use client"` — required for `usePathname` and `useState`
- Clean navigation data structure sourced from locale
- Active link tracking via `pathname` comparison ✓

---

## File 10: Footer — `src/components/common/footer.tsx` (101 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-TC-03 | Email `support@reading-advantage.com` hardcoded | Line 73 | `[Medium]` Should be in locale |
| C-TC-03 | Phone `+66 099-005-8038` hardcoded | Line 74 | `[Medium]` Should be in locale |
| C-TC-03 | TikTok handle hardcoded "Tiktok @reading.advantage" | Line 77 | `[Medium]` Should be in locale |
| C-TC-03 | Line QR image with `alt="Line QR"` hardcoded | Line 84 | `[Medium]` Hardcoded alt text |

### i18n

- Contact details (email, phone, TikTok, LINE QR) are hardcoded — NOT in locale
- Quick links use locale keys ✓
- Section headings use locale keys ✓
- All other text via `t()` ✓

### Accessibility

- Line QR image: `alt="Line QR"` — should be locale-sourced
- Semantic `<footer>` element with `<ul>` for navigation ✓
- `Link` components use locale-aware routing ✓

### Code Quality

- Server component (async) ✓
- Copyright year dynamically generated with `new Date().getFullYear()` ✓

---

## Batch-03 Cross-Cutting Findings

### Critical

1. **3 pages (Services, Blended Learning, Managed Service) have NO SEO metadata** — no title, description, OG tags.
2. **Zhongwen Advantage waitlist form is non-functional** — HTML form at lines 425-441 has no `action` or `onSubmit` handler; submitting does nothing (same pattern as Science Advantage batch-02).
3. **grid-pattern.svg missing** — Referenced in tutor-advantage (lines 55, 127, 289), zhongwen-advantage (line 112). `public/grid-pattern.svg` does not exist, causing 404s.
4. **Default OG image missing** — Root layout metadata references `/images/og-image.jpg` but the file does not exist. This affects social sharing for the entire site.

### High

1. **"Launching in 2025" claims past due** — Tutor Advantage metadata (lines 26, 30, 378) and Zhongwen Advantage FAQ (line 85) both reference 2025. Current date is June 2026.
2. **Zhongwen Advantage has extensive hardcoded English content** — Interactive features (lines 46-59), educator features (lines 61-79), FAQ items (lines 81-97), and learning bullet points (lines 331-338) are all hardcoded English strings, not using locale keys. This affects all 3 languages.
3. **Missing default OG image** — `/images/og-image.jpg` does not exist; root layout metadata will produce broken OG image on social shares.

### Medium

1. **Hardcoded contact details in footer** — Email, phone, TikTok handle, LINE QR alt text are all hardcoded (not locale-aware).
2. **Hardcoded step titles in tutor-advantage** — "Assess", "Personalize", "Progress" are hardcoded English (lines 149, 154, 159).
3. **Hardcoded CEFR stat "A1–B2"** in tutor-advantage (line 369) — should be in locale.
4. **Zhongwen Advantage logo alt text hardcoded** (line 140) — `alt="Zhongwen Advantage"`.
5. **Tutor Advantage and Reading Advantage sub-layout have hardcoded English titles** — not locale-aware.

### Low

1. **Services page uses `as never` casts** for dynamic locale access (lines 17-27) — potential runtime errors.
2. **Services page has fragile `serviceConfigs` pattern** with hardcoded feature index arrays (lines 10-15).
3. **Duplicate email addresses** — Footer uses `support@reading-advantage.com`, Contact form (batch-04) uses `contact@readingadvantage.com`.

---

## Test Coverage

| File | Existing Test | Coverage Quality |
|------|---------------|------------------|
| tutor-advantage/page.tsx | `page.test.tsx` (Active) | Tests 4 DOM elements: process flow, testimonials, overlapping section, stats/cta — basic presence tests only |
| zhongwen-advantage/page.tsx | `page.test.tsx` (Active) | Tests 4 DOM elements: level mapping, FAQ/waitlist, image break, editorial cards — basic presence tests only |
| services/page.tsx | **None** | — |
| blended-learning/page.tsx | **None** | — |
| managed-service/page.tsx | **None** | — |
| layout.tsx (root) | **None** | — |
| (marketing)/layout.tsx | **None** | — |
| reading-advantage/layout.tsx | **None** | — |
| header.tsx | **None** | — |
| footer.tsx | **None** | — |

---

## Summary: Batch-03 Findings

| Severity | Count | Categories |
|----------|-------|------------|
| Critical | 6 | Missing SEO metadata (3 pages), non-functional form (1), missing grid-pattern.svg (1), missing OG image (1) |
| High | 3 | Past-due "launching in 2025" claims (2 products), hardcoded English content in zhongwen (3 sections) |
| Medium | 6 | Hardcoded contact details, hardcoded step titles, hardcoded CEFR stat, hardcoded alt text, hardcoded English titles |
| Low | 3 | Cast safety, fragile config pattern, duplicate email addresses |

### Claims Matrix Updates Needed

- C-TA-01: `[PASS]` Page exists with images confirmed; update past-due claims
- C-TA-02: `[FAIL]` "Launching in 2025" past due; CEFR claims unverifiable; hardcoded step titles
- C-ZA-01: `[FAIL]` "Launching in early 2025" past due; waitlist form broken; grid-pattern.svg missing
- C-ZA-02: `[FAIL]` Extensive hardcoded English content not localized; HSK curriculum claims unverifiable
- C-SV-01: `[PASS]` Blended Learning page structure correct; needs PO for content accuracy
- C-SV-02: `[PASS]` Managed Service page structure correct; needs PO for content accuracy
- C-SV-03: `[UNKNOWN]` Availability claims depend on locale; needs PO
- C-TC-03 (footer): `[FAIL]` Contact details hardcoded, not locale-aware
- C-TC-03 (OG image): `[FAIL]` Default OG image `/images/og-image.jpg` missing
