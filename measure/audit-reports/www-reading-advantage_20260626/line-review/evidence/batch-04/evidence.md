# Batch-04 Evidence: Layout Components + Marketing Components + Contact Form

> Track: `www_reading_advantage_review_20260626`
> Reviewed: 2026-06-27
> Files: 10 | Lines: ~1,508 (manifest predicted 910 — actual significantly exceeds due to mastery-advantage-graph + data files)

---

## File 1: Fade In — `src/components/layout/fade-in.tsx` (0 lines)

### Critical: Empty File

- The file is completely empty (0 bytes, 0 lines).
- File-inventory.tsv lists this as 20 lines; batch-manifest.json predicts 20 lines.
- If this component is imported anywhere, it will cause a runtime error or export `undefined`.
- **Recommendation**: Either implement the component (wrapping children with fade-in animation) or delete the file and remove all imports.

---

## File 2: Page Transition — `src/components/layout/page-transition.tsx` (0 lines)

### Critical: Empty File

- The file is completely empty (0 bytes, 0 lines).
- Same issue as fade-in.tsx.
- File-inventory.tsv lists this as 30 lines.
- **Recommendation**: Implement or delete.

---

## File 3: Scroll Fade — `src/components/layout/scroll-fade.tsx` (0 lines)

### Critical: Empty File

- The file is completely empty (0 bytes, 0 lines).
- Same issue as fade-in.tsx and page-transition.tsx.
- File-inventory.tsv lists this as 30 lines.
- **Recommendation**: Implement or delete.

---

## File 4: Hero Section — `src/components/marketing/hero-section.tsx` (283 lines)

### Claims Accuracy

- Reusable component used by services pages (batch-03).
- `"use client"` — renders on client, no SSR.

### Accessibility

- **Line 144-151**: When `title` is a ReactNode (not a string), it renders inside a `<div>` with no heading role. This means if pages pass JSX as title (like managed-service page does at line 38-45 with an `<h1>` inside), the heading structure depends entirely on the caller. The component should enforce that a page has exactly one `<h1>`.
- **Line 154-161**: When `description` is a ReactNode, renders as `<div>` — adequate.
- **Line 110-117**: Background image uses `next/image` with `fill` + `priority` + `alt` ✓
- **Line 115**: Parallax transform with `will-change-transform` — performance hint ✓

### Code Quality

- **Lines 88-98**: Scroll listener for parallax effect — registered even when `backgroundImage` is undefined. The early return at line 89 handles this, but `useEffect` still runs. Consider conditional hook or derived state.
- **Lines 65-67**: `getHeightStyles` function — simple mapping, clean.
- **Lines 41-63**: `getBadgeVariantStyles` — well-structured switch with "custom" fallback.
- Component is complex with two major rendering paths (center vs left-aligned) — may benefit from splitting into sub-components.

### i18n

- Component receives already-localized strings as props — locale responsibility is delegated to callers ✓

### Performance

- `useState` for parallax even without background image — unnecessary state initialization

---

## File 5: Marketing SVG — `src/components/marketing/marketing-svg.tsx` (33 lines)

### Claims Accuracy

- Server component that reads SVG files from disk at request time.
- Thai variant detection: checks for `{baseName}-th.svg` in `public/marketing/` directory.
- Falls back to default SVG if Thai variant doesn't exist.

### Accessibility

- Uses `<object>` tag with `aria-label={alt}` and `role="img"` ✓ — correct pattern for SVG with object.
- Note: `<object>` has inconsistent screen reader support compared to `<img>`. Consider using `<img>` with `@svgr/webpack` or inline SVG for better a11y.

### Code Quality

- **Line 20**: `fs.existsSync()` — synchronous filesystem operation at render time. In production, this should be cached or moved to build-time.
- **Line 25-31**: `<object>` tag used — no fallback content between tags. If SVG fails to load, nothing is shown (but `aria-label` provides some description).
- No error handling if base SVG file doesn't exist — will render broken object.

### i18n

- Thai variant selection is explicit (checks for `-th.svg` suffix).
- Chinese (`zh`) locale currently has no SVG variant support — uses default instead.

---

## File 6: Marketing SVG Client — `src/components/marketing/marketing-svg-client.tsx` (47 lines)

### Claims Accuracy

- Client-side counterpart of `marketing-svg.tsx`.
- Determines locale from `usePathname()` — assumes locale is first path segment.
- Thai variants defined in `TH_VARIANTS` Set (lines 6-19).

### Missing Thai Variant Entries

The `TH_VARIANTS` set lists all product marketing SVGs. Directory check confirms:
- `ra-marketing-tutor-advantage-th.svg` — EXISTS ✓
- `ra-marketing-zhongwen-advantage-th.svg` — EXISTS ✓

All product SVGs listed have Thai variants. No gaps found here.

### Accessibility

- Same `<object>` + `aria-label` + `role="img"` pattern as server version ✓

### Code Quality

- Set-based lookup is clean and efficient.
- No error handling for missing SVG files.

---

## File 7: Mastery Advantage Graph — `src/components/marketing/mastery-advantage-graph.tsx` (548 lines)

### Claims Accuracy

- Animated SVG knowledge graph that cycles through 8 domains: reading, primary, storytime, math, science, stem, zhongwen, tutor.
- **Notable absence**: CodeCamp Advantage is NOT included in the 8 domains. This conflicts with the "9 products" claim made elsewhere (homepage, mastery-advantage page).
- The demo animates cursor travel, forgetting, refreshing, and unlocking — visually demonstrates spaced repetition / knowledge graph concepts.

### Accessibility

- **Missing: SVG has no `aria-label` or `role="img"`**. The entire animated graph is inaccessible to screen readers.
- **Line 372-374**: `prefers-reduced-motion` media query respected ✓ — all animations disabled when user prefers reduced motion.
- **Line 268-275**: Status bar caption is a `<span>` — no ARIA live region for dynamic text updates. Screen readers won't announce caption changes.

### Code Quality

- **Lines 88-196**: `runDemo` is a complex async generator function using RAF-based cursor animation. Well-structured but complex — 108 lines.
- **Lines 199-226**: Main loop uses `useEffect` with proper cleanup (cancelled flag, abortRef) ✓
- **Lines 229-238**: IntersectionObserver for lazy start ✓
- **Lines 250-258**: `useMemo` for CSS variable derivation from domain metadata ✓
- `react-hooks/exhaustive-deps` disabled for the main loop effect — intentional but means dependency tracking is manual.
- `setInterval`/`setTimeout` patterns used but all cleanup is managed via `abortRef` and `cancelled` flag.

### i18n

- Text content is in English only. The cluster labels (e.g., "A1 · Beginner"), node labels, and captions are all hardcoded in the data file. No locale support for Thai or Chinese.
- Caption text at lines 110, 117, 123, 147, 154, 166, 183-186, 211 — all hardcoded English.

### Performance

- RAF-based cursor animation — efficient, no layout thrashing
- SVG rendering with CSS transitions/animations — smooth
- Component unmounts properly via cleanup

---

## File 8: Mastery Advantage Graph Data — `src/components/marketing/mastery-advantage-graph-data.ts` (620 lines)

### Claims Accuracy

- Defines graph data for 8 product domains (no CodeCamp).
- CEFR-aligned progression for reading (A1-C2), HSK-aligned for zhongwen.
- Data is internally consistent and visually coherent.
- Tutor domain is the most complex with 7 sub-clusters and 56 nodes.

### Content Claims in Data

- Reading: 6 clusters (A1·Beginner through C2·Proficient), 22 nodes — demonstrates CEFR progression
- Primary: 4 clusters (Pre-A1 through B1·Intermediate), 18 nodes
- Storytime: 2 clusters (Pre-A1·Starter, A1·Beginner), 17 nodes — simpler structure for K-3
- Math: 6 clusters (Numbers·Operations through Advanced Math) — matches math subject coverage
- Science: 6 clusters (Life Science through Physics) — matches K-12 science claim
- STEM: 6 clusters (Circuits·Power through AI & Optimisation) — internally consistent
- Zhongwen: 6 clusters (HSK 1 through HSK 6) — matches HSK alignment claim
- Tutor: 7 clusters (Reading, Math, Science, Chinese, STEM, Primary, AI Tutor) — hub-and-spoke model

All cluster labels are hardcoded English. No locale support.

### Code Quality

- Well-typed with `GraphData` interface ✓
- Large but declarative — typical for this kind of data
- Consistent structure across all 8 domains
- Some graph data is duplicated (math, science, stem, zhongwen have nearly identical topology to reading) — may be intentional for visual consistency but means the graph doesn't reflect domain-specific structures in all cases

---

## File 9: Localized Link — `src/components/common/localized-link.tsx` (46 lines)

### Claims Accuracy

- `"use client"` — needs client for current locale detection via `useCurrentLocale()`.
- Logic correctly handles: absolute URLs (http, //, mailto, tel), already-prefixed paths, root path, and plain paths.
- Uses `localeConfig.locales` for supported locale detection.
- Wraps Next.js `Link` component.

### Accessibility

- Delegates to Next.js `Link` — standard accessible behavior.
- No `target="_blank"` handling in this component (handled by callers).

### Code Quality

- Well-tested: 7 test cases in `localized-link.test.tsx` covering:
  - Plain path prefixed with locale ✓
  - Root path `/` → `/{locale}` ✓
  - No double-prefixing for already-localized paths ✓
  - No modification of absolute URLs ✓
  - No modification of mailto links ✓
  - Current locale from `useCurrentLocale()` ✓
  - Children rendering ✓

### i18n

- Core i18n routing component — used throughout the marketing site for locale-aware navigation.
- Note: This component is separate from the `Link` component in `@/locales/navigation`. The `LocalizedLink` appears to be a custom implementation while the site primarily uses `@/locales/navigation`'s `Link`. Potential confusion — two different locale-aware link components.

### Architecture Note

- The site primarily uses `Link` from `@/locales/navigation` (seen throughout all pages). `LocalizedLink` in this file is a second, parallel locale-aware link implementation.
- **Duplicate pattern**: Two components with the same purpose (`@/locales/navigation`'s `Link` and this `LocalizedLink`). Inconsistent usage could lead to routing bugs.

---

## File 10: Contact Form — `src/components/contact/contact-form.tsx` (151 lines)

### Claims Accuracy

- `"use client"` — interactive form component.

### Conversion / Lead Flow

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-CF-01 | Form submits via `mailto:` link — no server-side submission | Line 43 | **`[Critical]` No backend submission** — leads go to user's email client; no analytics, no CRM capture |
| C-CF-02 | Mailto target: `contact@readingadvantage.com` vs footer's `support@reading-advantage.com` | Line 43 vs footer line 73 | **`[Medium]` Two different email addresses** — potential confusion |
| C-CF-03 | Product dropdown populated from `productLinks` (9 products) | Line 122-126 | `[PASS]` Matches navigation product list |
| C-CF-04 | Form fields: name, email, company, role, product, message — all required except product | Lines 53-142 | `[PASS]` Comprehensive field set |

### Accessibility

- All inputs have proper `<label>` with `htmlFor` attribute ✓
- `required` attribute on key fields (name, email, company, role, message) ✓
- Semantic `<form>` element with `onSubmit` ✓
- `<select>` has `<option>` placeholder ✓

### Code Quality

- **Line 28-43**: `handleSubmit` builds email body by concatenation — minimal formatting, no validation beyond HTML `required`
- **Line 43**: `window.location.href = mailto:...` — this replaces the current page URL with a mailto link. After the user sends/cancels the email, they're left on the same page but the URL in the address bar is now a mailto: URI. Browser behavior varies.
- **No success/error feedback**: After submission (or cancel), there's no confirmation message, toast, or UI state change.
- **No form reset**: After submission, form data persists in state.
- **No CSRF protection** — not critical for mailto-based forms but worth noting.
- **No rate limiting** — not applicable since no server endpoint.

### i18n

- All form labels, placeholders, and button text use `useScopedI18n("components.contactForm")` ✓
- `emailSubject` locale key for mail subject line ✓
- **Limitation**: The mailto body is built from localized field labels concatenated with field values. If a user fills the form in Thai, the email body will mix Thai field labels with the actual values. This is functional but not ideal for processing.

### Conversion Risk Assessment

- **No analytics tracking**: No form submission analytics, no conversion tracking, no UTM parameter handling.
- **No lead capture**: Form submissions go directly to email without server-side processing. If the email bounces or goes to spam, the lead is lost with no retry mechanism.
- **No CRM integration**: No Salesforce, HubSpot, or other CRM integration evident.
- **No confirmation**: User receives no confirmation that their message was sent.

---

## Batch-04 Cross-Cutting Findings

### Critical

1. **3 empty component files** — `fade-in.tsx`, `page-transition.tsx`, `scroll-fade.tsx` are all 0 bytes. If imported anywhere, they will cause runtime failures. Need to determine if these are legacy stubs or intentionally blank.
2. **Contact form uses mailto: only** — No server-side submission, no analytics, no CRM integration. Leads may be lost if email fails.

### High

1. **Mastery Advantage Graph has no ARIA label** — The entire animated SVG is invisible to screen readers despite being a major visual feature.
2. **Mastery Advantage Graph captions are hardcoded English** — No locale support; Thai/Chinese users see English animation captions.

### Medium

1. **LocalizedLink duplicates `@/locales/navigation`'s `Link`** — Two parallel locale-aware link implementations in the same app.
2. **Contact form has two different email addresses** — `contact@readingadvantage.com` (form) vs `support@reading-advantage.com` (footer/contact page).
3. **MarketingSvg has no SVG error fallback** — `<object>` tag has no fallback content; broken SVGs render as invisible.
4. **Hero section parallax unnecessary state** — `useState` initialized even when no background image.

### Low

1. **Mastery Advantage Graph doesn't include CodeCamp** — Only 8 domains shown despite "9 products" claim.
2. **MarketingSvg uses synchronous fs.existsSync** — Minor performance concern at scale.
3. **Contact form no post-submit feedback** — No confirmation or error state after form submission.

---

## Test Coverage

| File | Existing Test | Coverage Quality |
|------|---------------|------------------|
| fade-in.tsx | **None** (file is empty) | — |
| page-transition.tsx | **None** (file is empty) | — |
| scroll-fade.tsx | **None** (file is empty) | — |
| hero-section.tsx | `hero-section.test.tsx` (Active) | Tests heading rendering, description, CTA rendering/href, optional CTA — 4 tests covering basic functionality |
| marketing-svg.tsx | **None** | — |
| marketing-svg-client.tsx | **None** | — |
| mastery-advantage-graph.tsx | **None** | — |
| mastery-advantage-graph-data.ts | **None** | — |
| localized-link.tsx | `localized-link.test.tsx` (Active) | 7 tests covering all locale-prefix scenarios — good coverage |
| contact-form.tsx | **None** | — |

---

## Summary: Batch-04 Findings

| Severity | Count | Categories |
|----------|-------|------------|
| Critical | 4 | 3 empty component files, mailto-only contact form (no backend) |
| High | 2 | Mastery graph missing ARIA label, hardcoded English captions |
| Medium | 5 | Duplicate Link components, email address inconsistency, SVG error handling, parallax state waste, marketing-svg missing thai |
| Low | 3 | CodeCamp not in graph, fs.existsSync, no form feedback |

### Claims Matrix Updates Needed

- C-TC-03 (forms): `[FAIL]` Contact form is mailto-only with no backend; two different email addresses used
- C-TC-03 (accessibility): `[FAIL]` Mastery Advantage Graph has no ARIA label; empty component files
- C-TC-02 (i18n): `[FAIL]` Mastery graph captions are hardcoded English; no locale support for 3 empty components
- C-MK-01: `[UNKNOWN]` Empty layout components (fade-in, page-transition, scroll-fade) may or may not be in use — needs verification
