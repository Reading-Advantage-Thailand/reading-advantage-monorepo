# Batch-06 Evidence: Blog Components (Part 2) + UI Components Suite

> Track: `www_reading_advantage_review_20260626`
> Reviewed: 2026-06-27
> Files: 12 | Lines: 440

---

## File 1: Product CTA — `src/components/blog/product-cta.tsx` (45 lines)

### Claims Accuracy

- No product claims — CTA component that generates product name from URL path segment ✓
- `getProductName()` splits path by `/` and capitalizes segments — fallible if a product path changes format

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- `aria-hidden="true"` on ArrowRight icon ✓
- `<Link>` for navigation ✓

### i18n

- **F-010**: Hardcoded string branching with only en/th support:
  - Line 22-24: `isThai ? "เรียนรู้เพิ่มเติมเกี่ยวกับ ${productName}" : "Learn more about ${productName}"`
  - Line 28-30: `isThai ? "สนใจเรียนรู้เพิ่มเติม?" : "Want to learn more?"`
  - Lines 32-34: `` isThai ? `สำรวจว่า ${productName} สามารถช่วยเหลือลูกของคุณได้อย่างไร` : `Explore how ${productName} can help your child` ``
- Chinese (`zh`) locale falls back to English strings
- Should use i18n locale keys with all three language variants

### Code Quality

- Returns `null` if no product prop — graceful no-op ✓
- Clean component with single responsibility

### Product Name Generation

- `getProductName()` at lines 9-15 uses `path.split("/").pop()` to extract last segment, then capitalizes with `split("-").map(capitalize).join(" ")`
- Example: `/products/reading-advantage` → "Reading Advantage" ✓
- Works for any product path as long as it's `/products/{product-name}` format

### Test

- No test file exists for this component

---

## File 2: Related Posts — `src/components/blog/related-posts.tsx` (27 lines)

### Claims Accuracy

- No product claims — blog navigation component ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- Semantic HTML: `<section>`, `<h2>` ✓
- Delegates to `BlogCard` for individual post rendering ✓
- Returns `null` when no posts — empty state handled ✓

### i18n

- Uses `getScopedI18n("pages.blog")` for `youMightAlsoLike` key ✓

### Code Quality

- Async server component ✓
- Clean delegation to `BlogCard` ✓

### Test

- No test file exists for this component

---

## File 3: Table of Contents — `src/components/blog/table-of-contents.tsx` (132 lines)

### Claims Accuracy

- No product claims — blog navigation component ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- Desktop: `<nav>` element with sticky positioning (line 53) ✓
- Mobile: `<button>` with `aria-expanded={isOpen}` (line 64) ✓
- Smooth scroll on anchor click ✓
- IntersectionObserver for active heading tracking ✓
- **F-011**: Desktop `<nav>` (line 53) lacks `aria-label="Table of contents"` or `aria-labelledby`. Screen readers will announce it only as "navigation" — indistinguishable from other `<nav>` elements (breadcrumbs, pagination).
- Active heading uses visual styling only (`text-foreground font-medium`) — could use `aria-current="true"` on the active link for screen reader benefit

### i18n

- Uses `useScopedI18n("pages.blog")` for `onThisPage` heading key ✓

### Code Quality

- Well-structured intersection observer with proper cleanup ✓
- `'use client'` necessary for hooks ✓
- Headings are filtered by level (h3 indentation at line 59, 108) ✓
- Clean separation of desktop and mobile layouts

### Test

- No test file exists for this component

---

## File 4: UI Button — `src/components/ui/button.tsx` (64 lines)

### Claims Accuracy

- No product claims — generic UI component ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- Uses Radix `Slot` for `asChild` pattern — enables button-polymorphism ✓
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(20,110,245)]` — custom focus ring ✓
- `disabled:pointer-events-none disabled:opacity-50` — disabled state styling ✓
- Defaults to `<button>` element for native keyboard accessibility ✓

### i18n

- No i18n concerns — presentation component ✓

### Code Quality

- Uses `cva` from `class-variance-authority` for variant management ✓
- 7 variants (default, destructive, outline, secondary, ghost, link, white, monospace) ✓
- 4 sizes (default, sm, lg, icon) ✓
- Proper `forwardRef` with `displayName` ✓

### Performance

- **F-016**: Global `hover:-translate-y-1 hover:shadow-lg` (line 8) added to every button variant. Causes a 1px layout shift on hover for every button on every page. Minor but cumulative across the UI.

### Test

- No test file exists for this component (shadcn/ui convention — may be considered external)

---

## File 5: UI Card — `src/components/ui/card.tsx` (105 lines)

### Claims Accuracy

- No product claims — generic UI component ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- `CardTitle` defaults to `<h3>` element — appropriate heading level ✓
- All subcomponents use semantic HTML (`<div>`, `<p>`, `<h3>`) ✓
- Proper `forwardRef` usage ✓

### i18n

- No i18n concerns — presentation component ✓

### Code Quality

- Standard shadcn/ui card pattern with 6 subcomponents (Card, Header, Title, Description, Content, Footer) ✓
- Custom `borderStyle` prop with solid/dashed/mixed variants — extends shadcn/ui default
- `borderStyle="mixed"` produces `border-dashed border-b-solid` — renders top/left/right dashed, bottom solid. This is a visually interesting but unconventional pattern that may confuse users expecting consistent borders.

### Test

- No test file exists for this component

---

## File 6: FAQ Accordion — `src/components/ui/faq-accordion.tsx` (97 lines)

### Claims Accuracy

- No product claims — generic UI component ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- `<button>` with `aria-expanded={isOpen}` on each accordion trigger ✓
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500` ✓
- **F-012a**: The content panel (lines 78-87) does not have `aria-labelledby` or `role="region"` connecting it to the trigger button. Screen readers may not associate the expanded content with its heading.
- 9 color variants available ✓

### i18n

- Question/answer text comes from data props — no i18n concerns in component layer ✓

### Performance

- **F-012b**: Content expand/collapse uses `max-h-96` CSS transition (lines 80-82):
  - `max-h-96 opacity-100` → `max-h-0 opacity-0`
  - Known anti-pattern: the animation duration doesn't match actual content height. Content shorter than 24rem will have a delayed collapse; content taller than 24rem will be clipped.
  - Prefer `grid-template-rows: 0fr / 1fr` animation or JS-based height measurement for smooth animation.

### Code Quality

- Clean accordion pattern with single open state ✓
- 9 variant color map with consistent border/accent/icon structure ✓
- Single-file component with good organization ✓

### Test

- No test file exists for this component

---

## File 7: Floating Pill — `src/components/ui/floating-pill.tsx` (74 lines)

### Claims Accuracy

- No product claims — presentational component ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- Display-only component rendered as `<div>` — no interactive elements ✓
- Content is visible text — no hidden/accessible-only content ✓
- 9 color variants, 3 size variants ✓

### i18n

- No i18n concerns — text passed as props ✓

### Code Quality

- Clean component with well-organized variant and size style maps ✓
- Proper `forwardRef` with `displayName` ✓

### Test

- No test file exists for this component

---

## File 8: Horizontal Strip — `src/components/ui/horizontal-strip.tsx` (44 lines)

### Claims Accuracy

- No product claims — presentational component ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- **F-013**: Uses `scrollbar-hide` class (line 34) which hides the native scrollbar on the horizontal-scrolling container. Horizontal content areas without visible scroll indicators are often undiscoverable — users may not know content extends beyond the viewport.
- `snap-x snap-mandatory` provides some affordance for scroll behavior ✓
- The scroll container is a `<div>` (not a `<nav>`) — appropriate for content strips
- Consider adding a subtle fade gradient at the edges to indicate scrollability

### i18n

- No i18n concerns — children-based layout component ✓

### Code Quality

- Simple wrapper component with default `bg-sky-50` background and `py-12` padding ✓
- Proper `forwardRef` with `displayName` ✓

### Test

- No test file exists for this component

---

## File 9: Large Image Break — `src/components/ui/large-image-break.tsx` (66 lines)

### Claims Accuracy

- No product claims — presentational component ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- `alt` prop is required for the image — ✓
- Uses `next/image` with `fill` + `sizes="100vw"` ✓
- Overlay glassmorphism card with `aria-hidden` not needed (text content is visible) ✓
- Three overlay positions: center, bottom-left, bottom-right ✓
- Gradient overlay (`from-black/60 via-black/30 to-black/10`) ensures text contrast on varied images ✓

### i18n

- No i18n concerns — text passed via `overlayText` prop ✓

### Code Quality

- Clean component with well-defined position styles ✓
- Proper `forwardRef` with `displayName` ✓
- `priority={false}` by default — appropriate for below-fold images

### Test

- No test file exists for this component

---

## File 10: Overlapping Section — `src/components/ui/overlapping-section.tsx` (37 lines)

### Claims Accuracy

- No product claims — presentational component ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- Simple layout wrapper with `<section>` — semantic HTML ✓
- Defaults to `-mt-20` overlap — visually pulls section up to overlap with previous content ✓

### i18n

- No i18n concerns — layout component ✓

### Code Quality

- Minimal, focused component ✓
- Proper `forwardRef` with `displayName` ✓
- Default props provide sensible defaults (sky background, 40px top rounding, -80px overlap)

### Test

- No test file exists for this component

---

## File 11: UI Select — `src/components/ui/select.tsx` (164 lines)

### Claims Accuracy

- No product claims — generic UI component ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- Uses Radix UI Select primitive — full keyboard navigation, screen reader support ✓
- Proper `aria-` attributes managed by Radix ✓
- Focus ring via `focus:outline-none focus:ring-1 focus:ring-ring` ✓
- `data-[disabled]:pointer-events-none data-[disabled]:opacity-50` — disabled state ✓

### i18n

- No i18n concerns — generic UI component ✓

### Code Quality

- Standard shadcn/ui select implementation with 9 subcomponents (Root, Group, Value, Trigger, ScrollUp/Down, Content, Label, Item, Separator) ✓
- Uses `@radix-ui/react-select` — well-maintained library ✓
- Proper `forwardRef` and `displayName` for all subcomponents ✓

### Test

- No test file exists for this component

---

## File 12: UI Sheet — `src/components/ui/sheet.tsx` (140 lines)

### Claims Accuracy

- No product claims — generic UI component ✓

### SEO Metadata

- Component is not a page — no metadata export expected ✓

### Accessibility

- Uses Radix UI Dialog primitive — built-in focus trapping, keyboard dismissal (Escape), screen reader announcements ✓
- `SheetOverlay` with `bg-black/80` — visual focus on sheet content ✓
- Close button with `Cross2Icon` ✓
- **F-014**: Line 69: `<span className="sr-only">Close</span>` — hardcoded English text. Screen readers in all locales hear "Close". Should use i18n locale key. While the text is visually hidden (sr-only), it's the primary accessibility label for the close button.
- 4 side variants: top, bottom, left, right ✓

### i18n

- Hardcoded "Close" string (line 69) — needs locale key for screen reader users in Thai and Chinese locales
- All other visible content is children-based ✓

### Code Quality

- Standard shadcn/ui sheet implementation with 10 subcomponents ✓
- Proper use of Radix UI Dialog primitives ✓
- Proper `forwardRef` and `displayName` ✓

### Test

- No test file exists for this component

---

## Batch-06 Cross-Cutting Findings

### High

| # | Finding | Files | Description |
|---|---------|-------|-------------|
| F-010 | Hardcoded en/th branching in ProductCTA | product-cta.tsx lines 22-34 | zh locale falls back to English; should use i18n keys |

### Medium

| # | Finding | Files | Description |
|---|---------|-------|-------------|
| F-011 | Desktop TOC nav missing aria-label | table-of-contents.tsx line 53 | Screen readers can't distinguish from other nav elements |
| F-012a | FAQ accordion content panel missing region/aria-labelledby | faq-accordion.tsx lines 78-87 | No programmatic association between trigger and panel |
| F-012b | FAQ accordion uses max-h-96 for animation | faq-accordion.tsx lines 80-82 | May cause animation stuttering; height clipping risk |
| F-013 | Horizontal strip hides scrollbar | horizontal-strip.tsx line 34 | Scrollable content may be undiscoverable |
| F-014 | Sheet close button sr-only text hardcoded | sheet.tsx line 69 | "Close" in English, not locale-aware |

### Low

| # | Finding | Files | Description |
|---|---------|-------|-------------|
| F-016 | Global button hover translate-y-1 on all buttons | button.tsx line 8 | Minor layout shift on hover, cumulative across pages |

---

## Claims Matrix Updates Needed

- C-TC-02 (i18n): `[FAIL]` Sheet close button hardcoded English; ProductCTA hardcoded en/th branching with no zh
- C-TC-03 (accessibility): `[FAIL]` Table of contents nav missing aria-label; FAQ accordion missing panel association; Horizontal strip hides scrollbar

---

## Test Coverage

| File | Existing Test | Coverage Quality |
|------|---------------|------------------|
| product-cta.tsx | **None** | — |
| related-posts.tsx | **None** | — |
| table-of-contents.tsx | **None** | — |
| button.tsx | **None** | Standard UI component — may be considered external |
| card.tsx | **None** | Standard UI component — may be considered external |
| faq-accordion.tsx | **None** | — |
| floating-pill.tsx | **None** | — |
| horizontal-strip.tsx | **None** | — |
| large-image-break.tsx | **None** | — |
| overlapping-section.tsx | **None** | — |
| select.tsx | **None** | Standard UI component — may be considered external |
| sheet.tsx | **None** | Standard UI component — may be considered external |

---

## Summary: Batch-06 Findings

| Severity | Count | Categories |
|----------|-------|------------|
| High | 1 | Hardcoded i18n in ProductCTA |
| Medium | 6 | Missing aria-label (TOC), accordion a11y gaps, scrollbar hidden, hardcoded sr-only "Close", max-h animation |
| Low | 1 | Global button hover layout shift |

### Claims Matrix Updates Needed

- C-TC-02 (i18n): `[FAIL]` Sheet close button hardcoded English; ProductCTA hardcoded en/th branching
- C-TC-03 (accessibility): `[FAIL-05,FAIL-06]` TOC nav missing distinctive aria-label; FAQ panel lacks aria-labelledby; horizontal strip hides scrollbar affordance
