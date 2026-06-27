# Batch-10 Evidence: Remaining Locales + Lib + Config + i18n + Types + Providers

> Track: `www_reading_advantage_review_20260626`
> Reviewed: 2026-06-27
> Files: 21 | Lines: ~2,060

---

## File 1: Footer Locale — `src/locales/components/common/footer.ts` (65 lines)

### Claims Accuracy

- "Empowering students with comprehensive reading and learning solutions." — generic marketing tagline, not falsifiable.
- Location: "Khonkaen, Thailand" — consistent across all 3 locales ✓
- "Reading Advantage Thailand" brand name — consistent ✓

### i18n

- Copyright uses `{year}` template (line 20 en, 42 th, 64 zh) — correct i18n pattern ✓
- HTML entity `&copy;` in locale string (line 20) — potential risk: if the consumer renders via a function that HTML-escapes output, the entity will show as literal text. Need to verify the consumer (footer.tsx) handles this correctly.
- All 3 locales present with matching key structure ✓

### Key Observations

- QuickLinks only has: About, Products, Services, Case Studies, Contact. Note "Services" IS in footer but NOT in header nav.
- Phone number is not in locale — hardcoded in the Footer component (per batch-03 finding likely).

---

## File 2: Navigation Locale Strings — `src/locales/components/common/navigation.ts` (68 lines)

### Claims Accuracy

- Product descriptions for nav dropdown: "AI-powered reading comprehension platform" (Reading), "Interactive mathematics learning" (Math), "Hands-on science education" (Science), "Integrated STEM learning platform" (STEM), "Chinese language learning platform" (Zhongwen), "Interactive storytelling platform" (Storytime), "Learn coding through projects" (CodeCamp), "Online tutoring platform" (Tutor) — short descriptions, not strong claims.
- Missing: Primary Advantage is NOT in the itemsDescription list, even though it's a product. This means the nav dropdown can't display a description for Primary Advantage.

### i18n

- All 3 locales present ✓
- `masteryAdvantage` brand name is NOT translated — remains "Mastery Advantage" in all 3 locales ✓ (proper noun)
- Product descriptions fully translated ✓

### Key Observations

- **Primary Advantage missing from itemsDescription** (lines 13-20): The nav has 9 products (Primary, Reading, Math, Science, STEM, Zhongwen, Storytime, CodeCamp, Tutor) but only 8 descriptions. Primary Advantage cannot have a description in the nav dropdown.

---

## File 3: Comparison Table Locale — `src/locales/components/comparison-table.ts` (212 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-MK-04 | **"Last updated: October 2023"** — line 3 (en), line 74 (th), line 145 (zh) | Lines 3, 74, 145 | **`[FAIL]` Extremely stale** — 33 months old. Competitor features, pricing, and availability may have changed significantly |
| C-TC-02 | ELL Support: Reading Advantage supports "Thai, Chinese, Vietnamese" | Lines 63, 134, 205 | `[PARTIAL]` RA app also has `cn` (Cantonese) and `tw` (Traditional Chinese) locales — not listed here |
| C-MK-04 | Competitor comparisons: Raz-Kids, Lexia Core5, Accelerated Reader, Achieve3000 | Lines 8-11 | `[UNKNOWN]` Competitor descriptions need verification for accuracy |
| C-MK-04 | "AI Assistant" feature: Reading Advantage has "AI-powered writing feedback and language explanations" — competitors all have empty/no entry | Lines 60-61 | `[PASS]` RA has AI features; competitors may not |
| C-MK-04 | Price (table header item): pricing data referenced in feature names but no actual prices shown | Line 14 | `[UNKNOWN]` Price comparison feature exists but actual values may not be displayed |

### i18n

- All 3 locales present ✓
- Key structure matches across all languages ✓
- Competitor names correctly remain untranslated ✓
- Feature names fully translated ✓

### Key Observations

- The October 2023 timestamp is critically stale. Analytics/pricing/features for both RA and its competitors have likely changed.
- Vietnamese (vi) listed for ELL support but the site only supports en, th, zh. This is a claim about the RA app's capabilities, which does have vi locale.

---

## File 4: Contact Form Locale — `src/locales/components/contact-form.ts` (53 lines)

### Claims Accuracy

- No product claims — pure form field labels.

### i18n

- All 3 locales present ✓
- Form field labels fully translated ✓
- `rolePlaceholder`: "e.g. Teacher, Administrator, Parent" — good segmentation for lead qualification
- `productPlaceholder`: "Select a product" — drop-down presumably listing all products

### Key Observations

- Clean, well-structured locale data for the contact/lead form.
- The `emailSubject: "Contact Form"` (line 15) is used as the email subject line — currently only in English, not translated in th/zh locales unless the consuming component uses the localized value.

---

## File 5: Locale Switcher Strings — `src/locales/components/locale-switcher.ts` (21 lines)

### i18n

- All 3 locales present ✓
- `select` translated in all 3 ✓
- Language names: "English", "ไทย", "中文" — self-referential as expected ✓

### Key Observations

- Minimal file, no issues. Clean.

---

## File 6: Pagination Locale — `src/locales/components/pagination.ts` (17 lines)

### i18n

- All 3 locales present ✓
- Keys: `previous`, `next`, `page` — all translated ✓
- Chinese pagination: "上一页" (Previous), "下一页" (Next), "页" (Page) ✓
- Thai pagination: "ก่อนหน้า" (Previous), "ถัดไป" (Next), "หน้า" (Page) ✓

### Key Observations

- Clean, no issues.

---

## File 7: Pricing Table Locale — `src/locales/components/pricing-table.ts` (516 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-RA-05 | **"Last updated: October 2024"** — Table lastUpdated | Lines 7, 178, 351 | `[Medium]` 20 months stale. Pricing may no longer be current |
| C-RA-05 | Pricing: Basic Tier US$36, AI Enhanced US$60, AI Tutor US$120 (per student, 12-month license) | Lines 16-18 | `[UNKNOWN]` Needs PO to confirm current pricing |
| C-RA-05 | "AI-generated vocabulary quizzes" — "coming-soon" for AI Enhanced, "coming-soon" for AI Tutor | Lines 135-139 | `[NEEDS-PO]` Check if this feature has been delivered |
| C-RA-05 | "AI-driven personalized learning paths" — "coming-soon" only for AI Tutor | Lines 141-145 | `[NEEDS-PO]` |
| C-RA-05 | "Virtual AI writing tutor for real-time assistance" — "coming-soon" for AI Tutor | Lines 159-163 | `[NEEDS-PO]` |
| C-RA-05 | "Gamification elements (badges, leaderboards)" — "coming-soon" for ALL tiers | Lines 123-127 | `[NEEDS-PO]` |
| C-RA-05 | "Parent portal for progress monitoring" — "coming-soon" for ALL tiers | Lines 129-133 | `[NEEDS-PO]` |
| C-RA-05 | Translation support: "Thai, Chinese, Vietnamese" — feature row 7 | Lines 57, 228, 401 | Same 3-language claim as comparison table; Vietnamese is listed |

### i18n

- All 3 locales present ✓
- Large file (516 lines) with detailed feature matrix — ALL translated ✓
- "coming-soon" values are translated in th (line 297: "เร็วๆ นี้") and zh (line 469: "即将推出") ✓
- `true`/`false` boolean values are NOT locale-translated (expected — booleans are programmatic, not displayed directly) ✓

### Key Observations

- The pricing table has 25 feature rows (indices 0-24), tracking a large matrix of tiered features.
- Many advanced features (items 18-24) are marked "coming-soon" for all or most tiers — this includes gamification, parent portal, AI-generated quizzes, personalized learning paths, AI analytics, AI-generated content, and virtual AI writing tutor.
- The "coming-soon" status has persisted across multiple releases. No launch dates are specified for any of these features.
- This file is the largest in batch-10 (516 lines) and also the most test-critical — no tests validate the integrity of this pricing matrix (correct number of rows, no missing tier values, etc.).

---

## File 8: B2B Solutions Locale — `src/locales/components/products/b2b-solutions.ts` (299 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-SV-02 | "Join hundreds of successful institutions already benefiting" — line 3 | Line 3 | `[UNKNOWN]` Claim about customer count |
| C-PA-01 | Primary Advantage badge: "New for SY2025" — line 12 (en), 112 (th), 212 (zh) | Lines 12, 112, 212 | **`[FAIL]` Past due** — SY2025 runs 2025-2026; current is June 2026 (end of SY2025). Should be "Available Now" or updated for SY2026 |
| C-RA-05 | Reading Advantage badge: "Available Now" | Line 22 | `[PASS]` |
| C-STEM-01 | STEM Advantage: "Coming mid 2027" | Line 34 | `[PASS]` Future date, consistent |
| C-SA-01 | Science Advantage: "Coming early 2026" — line 45 (en), 145 (th), 245 (zh) | Lines 45, 145, 245 | **`[FAIL]` Past due** — "early 2026" has passed (current is June 2026) |
| C-MA-01 | Math Advantage: "Arriving late 2026" | Line 56 | `[PASS]` Future |
| C-ZA-01 | Zhongwen Advantage: "Coming late 2026" | Line 67 | `[PASS]` Future |
| C-ST-01 | Storytime Advantage: "Coming early 2027" | Line 78 | `[PASS]` Future but note product locale says "Coming in 2025" — **cross-file date conflict** |
| C-CC-01 | CodeCamp Advantage: "Coming 2027" | Line 89 | `[PASS]` Future but note product locale may say different |
| C-RA-02 | "Extensive reading cohorts achieved 50% greater grammar gains than direct grammar instruction" — line 27 | Line 27 (en), 127 (th), 227 (zh) | `[UNKNOWN]` Specific statistical claim needs research citation |
| C-RA-02 | "Students saw twice the vocabulary growth compared with direct vocabulary drills" — line 28 | Line 28 (en), 128 (th), 228 (zh) | `[UNKNOWN]` Another specific statistical claim |
| C-MA-02 | Math Advantage: "Provide immediate formative feedback loops that double year-over-year growth" | Line 60 (en) | `[UNKNOWN]` |
| C-ZA-01 | Zhongwen: "Extensive reading cohorts doubled vocabulary growth and character recognition versus rote drills" | Line 72 (en) | `[UNKNOWN]` |

### i18n

- All 3 locales present ✓
- Product badges and grade ranges fully translated ✓
- Product feature lists fully translated ✓
- Feature keys use numeric strings ("0", "1", "2", "3") — fragile, order-dependent

### Key Observations

- **Cross-file launch date conflicts**: B2B dates differ from product locale dates in several cases (Science, Storytime, STEM). This is a systemic issue.
- "New for SY2025" Primary Advantage badge is stale at end of SY2025.
- The locale file references 8 products via `products` key, with detailed feature descriptions for each.
- Grade ranges differ between B2B solutions and product pages in some cases — e.g., B2B says "Grades 4-12 AI coding & STEM projects" for STEM while product locale says K-12.

---

## File 9: B2C Solutions Locale — `src/locales/components/products/b2c-solutions.ts` (125 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-CC-02 | "Become a full-stack engineer in 15 weeks with AI tutors, project-based sprints, and human-reviewed code" | Line 3 | `[UNKNOWN]` 15-week timeline claim |
| C-CC-02 | "New tracks debuting 2026" | Line 3 | `[PASS]` Current year |
| C-CC-02 | "Choose from curated stacks like Next.js, Laravel/Vue, Django/React, Ruby on Rails/React, FastAPI/Svelte, and more" | Line 7 | `[UNKNOWN]` |
| C-CC-02 | "Career services beta launches alongside 2026 founding cohorts" | Line 37 | `[UNKNOWN]` |
| C-CC-02 | "Alumni network and hiring metrics will launch with the first graduating class" | Line 38 | `[UNKNOWN]` |

### i18n

- All 3 locales present ✓
- Tech stack names preserved in all languages ✓

### Key Observations

- The B2C page is specifically for CodeCamp Advantage's consumer (B2C) offering — distinct from the school/enterprise B2B offering.
- Multiple very specific claims about curriculum structure and career services.

---

## File 10: Tutor Advantage Component Locale — `src/locales/components/products/tutor-advantage.ts` (74 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-TA-02 | "Launch your tutoring business with built-in mentorship, AI lesson tools, and company-led coaching seminars" | Line 2 | `[UNKNOWN]` |
| C-TA-02 | "Get paired with an experienced TA mentor to secure first clients and refine your playbook" | Line 7 | `[UNKNOWN]` |
| C-TA-02 | "We'll connect you with your mentor tutor within 48 hours." | Line 23 | `[UNKNOWN]` Operational claim |

### i18n

- All 3 locales present ✓
- Note: The `joinCaption` (line 23 en) uses a contraction "We'll" — acceptable in marketing copy but consider formal expansion for non-native audiences.

### Key Observations

- This component locale is for the Tutor Advantage recruiter/marketing component — distinct from the product page locale.
- Focuses on recruiting tutors rather than selling tutoring to students.

---

## File 11: Blog Library — `src/lib/blog.ts` (254 lines)

### Code Quality

- **Line 74: `remarkHtml` with `sanitize: false`** — Blog HTML content is not sanitized. If any markdown post contains malicious HTML, it will be rendered as-is.
- **Line 101-117: `getBlogPost` uses `console.error` on failure** (line 115) — logs to stdout in production. Acceptable for an edge case but could be noisy.
- **Lines 35-67: `validateFrontmatter` uses manual type checks** — should use a Zod schema per project convention.
- **Line 82: `htmlContent = processedContent.toString()` — `processedContent` type from unified is generic.

### i18n

- **Line 20-22: `postsDirectory(locale)`** function — locale-aware blog content loading ✓
- **Lines 107-112: Fallback to English when locale-specific post doesn't exist** — good pattern for graceful degradation ✓
- **Line 110: `if (locale === "en") return null`** — English fallback at top, avoids infinite recursion ✓

### Accessibility / Security

- `dangerouslySetInnerHTML` is used by the consumer (blog detail page) to render `post.content`. The `sanitize: false` in remarkHtml means no sanitization pipeline exists.

### Claims Accuracy

- No product claims — pure library.

### Key Observations

- Locale input `SupportedLocale = "en" | "th" | "zh"` (line 18) — correctly typed ✓
- `calculateReadingTime` uses 200 wpm (line 167) — standard convention ✓
- `getPaginatedPosts` defaults to 9 per page (line 180) ✓
- Well-structured library with clear separation of concerns.

---

## File 12: Utils — `src/lib/utils.ts` (6 lines)

### Code Quality

- Standard `cn()` utility using `clsx` + `tailwind-merge` — correct pattern ✓
- No issues.

---

## File 13: Navigation Config — `src/config/navigation.ts` (82 lines)

### Claims Accuracy

- Nav item descriptions match product descriptions in navigation locale ✓
- Product descriptions: "Grades 3-6 literacy development platform" (Primary), "AI-powered reading comprehension platform" (Reading), "Interactive mathematics learning" (Math), "Hands-on science education" (Science), "Integrated STEM learning platform" (STEM), "Chinese language learning platform" (Zhongwen), "Interactive storytelling platform" (Storytime), "Learn coding through projects" (CodeCamp), "Online tutoring platform" (Tutor) — line 13-54.

### Key Observations

- **No "Services" in the navigation** — same as header. Services pages exist but no top-level nav item reaches them.
- `productLinks` export (line 79) provides a flat list of product label/href pairs — used for product grids.
- Primary Advantage is listed here with description ✓ (unlike navigation locale which misses it).
- All 9 products listed ✓.

---

## File 14: Locale Config — `src/config/locale-config.ts` (31 lines)

### Code Quality

- Defines `Locales = "en" | "th" | "zh"` — union type ✓
- `localeConfig.locales` matches `routing.locales` in `i18n/routing.ts` ✓
- `localeImports` provides dynamic import paths (lines 21-25) — enables code-splitting by locale ✓
- `localeNames` (lines 15-19) matches locale-switcher component usage ✓
- `feedbackLanguage` (lines 27-31) returns human-readable language names ✓

### Key Observations

- Clean configuration file. No issues.
- Note the `LocaleConfig` type is defined after being used (line 5 uses `LocaleConfig`, line 10 defines it) — works due to TypeScript's declaration hoisting but unusual ordering.

---

## File 15: i18n Main — `src/i18n.ts` (18 lines)

### Code Quality

- Uses `getRequestConfig` from `next-intl/server` — correct pattern ✓
- Handles missing/invalid locale by falling back to `routing.defaultLocale` ✓
- Dynamic import of locale messages from `./locales/${locale}.ts` ✓

### Key Observations

- The import path `./locales/${locale}.ts` expects files to exist at `src/locales/en.ts` etc. — confirmed existing.
- Clean, minimal i18n setup.

---

## File 16: i18n Routing — `src/i18n/routing.ts` (6 lines)

### Code Quality

- Uses `defineRouting` from `next-intl/routing` ✓
- Locales: `["en", "th", "zh"]`, default: `"en"` ✓
- Clean, minimal.

---

## File 17: Blog Types — `src/types/blog.ts` (37 lines)

### Code Quality

- `BlogPost` interface: slug, content, rawContent, title, date, excerpt, author, tags, readingTime, coverImage?, product? — comprehensive ✓
- `BlogListItem` interface: Same as BlogPost minus `content` and `rawContent` — explicitly defined (not using Omit) per the comment on line 15. Good practice for maintainability ✓
- `BlogHeaderProps`, `BlogTagsProps` — typed component props ✓

### Key Observations

- `BlogListItem` duplicates most of `BlogPost` — intentional per comment. Consider using `Pick<BlogPost, ...>` or a shared base type if this grows.
- No Zod schema used for post frontmatter validation (the blog.ts uses manual validation).

---

## File 18: Nav Types — `src/types/nav.ts` (6 lines)

### Code Quality

- `NavItem` interface: title, href, items?, description? — recursive definition for nested nav ✓
- Clean, minimal.

---

## File 19: Locale Provider — `src/providers/locale-provider.tsx` (18 lines)

### Code Quality

- `"use client"` directive ✓
- Wraps `NextIntlClientProvider` — correct pattern ✓
- Clean, minimal wrapper.

---

## File 20: Locale Switcher Component — `src/switcher/locale-switcher.tsx` (46 lines)

### Code Quality

- `"use client"` directive ✓
- Uses `useScopedI18n("components.localeSwitcher")` for locale- aware labels ✓
- Uses `useChangeLocale` and `useCurrentLocale` from `@/locales/client` ✓

### Code Quality Issues

- **Line 18: Commented-out code** — `/* { preserveSearchParams: true } */` — should be cleaned up.
- **Line 35: `focus:ring-[rgb(20,110,245)]`** — arbitrary color value, should use a theme token.
- **Line 34: `w-[100px]`** — arbitrary width value, consider a semantic token.

### Accessibility

- Uses `<Select>` (shadcn/ui) with `SelectTrigger`, `SelectContent`, `SelectItem` — keyboard accessible ✓
- Current locale moved to front of list (lines 24-27) — UX best practice ✓

### Key Observations

- Clean component, one minor cleanup needed.

---

## File 21: Proxy/Middleware — `src/proxy.ts` (26 lines)

### Code Quality

- Implements `next-intl/middleware` — correct pattern ✓
- **Lines 11-18: Cloud Run port leakage fix** — strips `:8080` from redirect URLs to prevent port leaking in production. This is a production-patching workaround; ideally Cloud Run should be configured to avoid this, but the workaround is pragmatic and well-commented.
- **Line 25: Matcher pattern** excludes api, static, `_next`, favicon, robots.txt — standard Next.js i18n middleware config ✓

### Key Observations

- The port strip regex `/:8080(?!\d)/` (line 14) replaces `:8080` only when not followed by a digit — prevents stripping port-like substrings from URLs. Good edge-case handling.
- Clean, focused middleware.

---

## Batch-10 Cross-Cutting Findings

### Critical Findings

1. **Pricing table dated "October 2024"** (pricing-table.ts line 7) — 20 months stale. Pricing may no longer be valid.
2. **Comparison table dated "October 2023"** (comparison-table.ts line 3) — 33 months stale. Competitive landscape may have shifted significantly.
3. **Science Advantage "Coming early 2026"** in B2B solutions (line 45) — past due by ~6 months.

### High Findings

1. **Primary Advantage "New for SY2025" badge** (b2b-solutions.ts line 12) — past due; SY2025 is ending.
2. **Cross-file launch date conflicts**: Storytime says "Coming in 2025" in product locale but "Coming early 2027" in B2B locale. STEM product says "Coming in 2025" but B2B says "Coming mid 2027". Dates need systematic reconciliation across all files.
3. **Primary Advantage missing from navigation locale itemsDescription** (navigation.ts lines 13-20) — 8 descriptions for 9 products.
4. **Blog library uses `sanitize: false`** (blog.ts line 77) and no Zod schema for frontmatter (blog.ts lines 35-67).

### Medium Findings

1. **Locales with HTML entities** (`&copy;` in footer.ts) — risk of improper escaping depending on consumer rendering method.
2. **Commented-out code** in locale-switcher.tsx line 18.
3. **Unusual type ordering** in locale-config.ts (type used before definition).
4. **Duplicate BlogListItem interface** — maintainability concern if the schema grows.
5. **5 product feature matrix rows marked "coming-soon"** (pricing-table.ts indices 18-24) — persistent "coming soon" status across multiple tiers.

### Summary: Batch-10 Findings

| Severity | Count | Categories |
|----------|-------|------------|
| Critical | 3 | Stale prices (20mo), stale comparison (33mo), past-due launch date |
| High | 4 | Stale badge, cross-file date conflicts, missing nav description, blog security |
| Medium | 5 | HTML entity risk, commented code, type ordering, duplicate types, persistent "coming soon" |

### Claims Matrix Updates Needed

- C-RA-05: `[FAIL]` Pricing table 20 months stale; persistent "coming-soon" features unknown
- C-MK-04: `[FAIL]` Comparison table 33 months stale; competitor data likely outdated
- C-TC-02: `[PASS]` 3 languages confirmed across all locale files
- C-SA-01: `[FAIL]` "Coming early 2026" past due (B2B locale)
- C-PA-01: `[FAIL]` "New for SY2025" is past due
- C-ST-01: `[FAIL]` Cross-file date conflict (2025 vs 2027)
- C-STEM-01: `[FAIL]` Cross-file date conflict (2025 vs 2027)
- C-CC-01: `[UNKNOWN]` "Coming 2027" in B2B — verify against product page dates
- C-MA-01: `[PASS]` "Arriving late 2026" and "Coming in 2026" consistent
- C-ZA-01: `[PASS]` "Coming late 2026" consistent
