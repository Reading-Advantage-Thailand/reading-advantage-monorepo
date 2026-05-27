# Specification: www-reading-advantage i18n/l10n Remediation

## Overview

Remediate all internationalization (i18n) and localization (l10n) gaps in the `www-reading-advantage` marketing site. An automated audit (`npm run i18n:audit`) revealed **12 missing translation keys** and **183 hardcoded English strings** across 19 page/component files. This track closes those gaps so the site renders correctly in all three supported locales (en, th, zh).

## Functional Requirements

### FR-1: Missing Header Navigation Keys
The `components.common.header.main` array (6 navigation items with `title` and `href`) exists in `en` but is entirely absent from `th` and `zh`. Add translated `main` arrays to both locale files.

**Acceptance Criteria:**
- `src/locales/components/common/header.ts` exports `th.main` and `zh.main` arrays with 6 items each
- Each item has translated `title` and locale-appropriate `href` values
- `npm run i18n:audit -- --keys` reports 0 missing keys

### FR-2: Hardcoded Section Eyebrow Labels
Uppercase tracking-widest `<span>` labels (e.g., `PLATFORM`, `BLENDED LEARNING`, `KEY FEATURES`, `THE PROCESS`, `GET STARTED`) are hardcoded English across all product and marketing pages. Extract to translation files.

**Acceptance Criteria:**
- Every uppercase eyebrow label in JSX uses `t("sectionEyebrow")` or equivalent
- New keys added to `en`, `th`, `zh` for each page's translation module
- No raw English eyebrow text remains in JSX

### FR-3: Hardcoded "Adaptive Engine" Section Text
Every product page has an identical "Adaptive Engine" section with hardcoded heading, subheading, and description paragraph. Extract to per-page translation keys.

**Acceptance Criteria:**
- "Adaptive Engine", its subheading, and the "Powered by Mastery Advantage…" paragraph are all behind `t()` calls
- Keys exist in all 3 locale files for each product page that has this section

### FR-4: Hardcoded Device/Capability Labels
Labels like `Desktop`, `Tablet`, `Mobile` in the reading-advantage page are hardcoded. Extract to translation keys.

**Acceptance Criteria:**
- Device names use `t()` calls
- Keys exist in en, th, zh

### FR-5: Hardcoded Trust Signals & Benefit Strips
The pricing page trust signals (`No Hidden Fees`, `Instant Setup`, `Dedicated Support` + descriptions) and product page benefit/result labels are hardcoded.

**Acceptance Criteria:**
- All trust signal titles and descriptions use `t()` calls
- Benefit/result labels on product pages use `t()` calls
- Keys exist in all 3 locales

### FR-6: Hardcoded Image Alt Text
Descriptive `alt` attributes on `<Image>` components contain hardcoded English. These need translation for accessibility in all locales.

**Acceptance Criteria:**
- All user-facing `alt` text uses `t()` calls or is pulled from translation keys
- Keys exist in all 3 locales

### FR-7: Remaining Hardcoded Strings
All remaining hardcoded English text in JSX (section headings, paragraphs, CTA labels, form placeholders, FAQ titles, etc.) must be extracted.

**Acceptance Criteria:**
- `npm run i18n:audit -- --hardcoded` reports 0 hardcoded strings
- All extracted keys exist in en, th, zh

### FR-8: Audit Pass Verification
Run the full audit suite and confirm zero issues.

**Acceptance Criteria:**
- `npm run i18n:audit` exits 0 with 0 missing keys and 0 hardcoded strings
- `npm run build` passes for www-reading-advantage
- Existing tests (`npm run test`) still pass

## Non-Functional Requirements

- **NFR-1:** Translation key naming follows existing conventions (dot-notation, camelCase leaf keys)
- **NFR-2:** No new dependencies introduced
- **NFR-3:** Brand names (Reading Advantage, Mastery Advantage, KST, SRS, FSRS, CEFR, etc.) remain in English across all locales (intentional)
- **NFR-4:** The `i18n:audit` script is updated if false positives/negatives are discovered during remediation

## Out of Scope

- Metadata (`<title>`, `description`, `openGraph`) localization — requires a different i18n strategy (Next.js `generateMetadata`)
- Adding new locales beyond en/th/zh
- Shared i18n type-safety (tracked separately in tech-debt)
- Blog post content localization (content, not UI)
- `reading-advantage`, `primary-advantage`, `science-advantage` app i18n (each has its own setup)
