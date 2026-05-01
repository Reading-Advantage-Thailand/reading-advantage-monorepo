# Website Review: Appearance & Performance Findings

**Date:** 2026-02-07
**Reviewed by:** Measure Audit
**Site:** Reading Advantage Thailand Marketing Website (Next.js 15)
**Pages reviewed:** Homepage, Products, Pricing, Features, About, Contact, Services, Case Studies, Reading Advantage product page

---

## Executive Summary

The site is a functional Next.js 15 marketing website with a warm orange/sky-blue brand identity. However, it suffers from **inconsistent visual design across pages**, **heavy JavaScript bundles (3.3 MB)**, **excessive scroll-triggered animations**, and **numerous hard-coded values** that bypass the theme system. First Contentful Paint is 3.1 seconds and full page load is 6.8 seconds, both well above acceptable thresholds.

---

## 1. APPEARANCE ISSUES

### 1.1 Color Inconsistency (HIGH)

The site lacks a unified color palette across pages:

| Page | Accent Colors Used | Expected |
|------|--------------------|----------|
| Homepage | Amber/Orange + Sky Blue | Brand colors |
| About | **Violet/Purple** (`text-violet-500`, `text-violet-600`) | Amber/Sky |
| Reading Advantage product | **Blue/Purple gradient** (completely different hero) | Amber/Sky |
| Contact | Sky, **Emerald**, Amber (3 different icon gradients) | Amber/Sky |
| Features | Emoji icons instead of themed icons | Amber/Sky |
| Pricing | `bg-sky-800` hard-coded | Theme variable |

**Recommendation:** Establish a strict 2-3 color palette in CSS variables and enforce it. Remove all violet/purple/emerald accent usage. The Reading Advantage product page hero gradient should match the site-wide warm gradient.

### 1.2 Scroll-Triggered Animation Issues (HIGH)

Multiple sections only render content when scrolled into view (Framer Motion `whileInView`). This causes:
- Content appears as **blank white/grey boxes** until the user scrolls to them
- The "Built for Thai Private Schools" glassmorphism cards render as opaque grey rectangles until animated in
- Feature cards on the homepage flash in sequentially, creating a jarring stagger effect
- Users on slow connections or devices see empty placeholders

**Recommendation:** Remove `whileInView` animations or replace with CSS `animation-timeline: view()` for progressive enhancement. Content should be visible by default with animation as enhancement only.

### 1.3 Layout & Spacing Problems (MEDIUM)

- **Homepage footer gap:** Large empty space (~100px) between the final CTA stats section and the footer
- **Products page overlap:** The "See Success Stories" card overlaps/collides with the Reading Advantage product card in the lower section
- **Inconsistent section padding:** Pages mix `py-16`, `py-20`, `py-24`, and `py-32` without a clear rhythm
- **Hero images:** Pricing and About pages use the same background image cropped to show just hands, which looks accidental rather than intentional

### 1.4 Typography & Heading Hierarchy (MEDIUM)

- Homepage uses mixed font weight and size combinations without clear hierarchy
- "Our Story" heading on About page is purple — breaks visual continuity
- Feature card titles on homepage have inconsistent sizing between sections

### 1.5 Mobile Responsiveness (MEDIUM)

- Navigation header does not collapse to hamburger menu at narrower widths (the mobile breakpoint may be too narrow)
- Hero images on product pages are clipped on the right edge rather than responsive
- QR code image in contact and footer has fixed `width={200} height={200}` — not responsive

### 1.6 Broken/Placeholder Links (LOW)

- About page CTA uses `href="#"` — does nothing when clicked
- "Get Started" button on homepage links to `/contact` but text suggests account creation

---

## 2. PERFORMANCE ISSUES

### 2.1 JavaScript Bundle Size (CRITICAL)

| Resource | Size |
|----------|------|
| `main-app.js` | **1,713 KB** |
| `layout.js` | **1,061 KB** |
| `_app-pages-browser_src_locales_en_ts.js` | 234 KB |
| `page.js` | 196 KB |
| **Total JS** | **3,296 KB (3.2 MB)** |

A marketing website should target under 200 KB of JavaScript. The current 3.2 MB is **16x over budget**.

**Root causes:**
- **Framer Motion** (~50 KB gzipped) loaded on every page via `PageTransition` wrapper in marketing layout
- All locale strings loaded client-side (234 KB for English alone)
- Multiple pages marked `"use client"` unnecessarily (services, case-studies, features could be server components)
- 8+ lucide-react icon imports per page without verified tree-shaking

**Recommendations:**
1. Remove `PageTransition` Framer Motion wrapper — replace with CSS transitions
2. Move pages to server components where possible (services, case-studies, about)
3. Lazy-load locale data or use server-side i18n rendering
4. Audit and minimize client component boundaries

### 2.2 Page Load Timing (HIGH)

| Metric | Value | Target |
|--------|-------|--------|
| TTFB | 2,472 ms | < 800 ms |
| First Paint | 3,104 ms | < 1,800 ms |
| First Contentful Paint | 3,104 ms | < 1,800 ms |
| DOM Content Loaded | 2,746 ms | < 1,500 ms |
| Full Load | 6,850 ms | < 3,000 ms |

Note: Measured on localhost dev server, so production may differ. However, the JS bundle size will persist.

### 2.3 Image Optimization (MEDIUM)

- **Excessive `priority` prop usage:** Case Studies page marks 8+ images as `priority`, defeating the purpose (only above-fold images should be priority)
- **Missing `sizes` prop:** Images using `fill` don't specify `sizes`, so the browser downloads the largest variant
- **No WebP/AVIF:** Images are PNG/JPG without modern format optimization
- **Image domains:** `next.config.ts` only allows `localhost` — production images from external CDN would fail
- **Hero background image** (`students_at_computers.jpg`) loaded on multiple pages with `priority` even when below fold

### 2.4 Excessive CSS Animations (MEDIUM)

- Homepage has 6+ animated blur elements (`blur-[100px]`, `blur-[120px]`) with `animate-pulse-slow` — these are expensive GPU compositing operations
- `animate-float` keyframes run infinitely on decorative blobs
- Staggered `animate-in` delays on 10+ elements per page create render jank
- `backdrop-blur-md` glassmorphism effects on dark section cards add compositing overhead

### 2.5 Unused CSS/Config (LOW)

- Tailwind config defines `teal-modern` gradient — never used in any component
- `globals.css` defines `.glass-morphism` and `.hero-glass` with overlapping styles
- Multiple custom shadow utilities (`shadow-modern`, `shadow-glow`) rarely used
- Console removal code is commented out in `next.config.ts`

---

## 3. ACCESSIBILITY ISSUES

### 3.1 Critical

- **Emojis as icons:** Features page uses emoji strings ("🤖", "📊") instead of icon components — screen readers announce these as "robot face", "bar chart" etc.
- **Decorative blur elements** lack `aria-hidden="true"`
- **Missing descriptive alt text:** Multiple images reuse generic alt text like "Reading Advantage Platform"

### 3.2 Important

- **Color contrast:** White text on orange gradient sections may fail WCAG AA 4.5:1 ratio
- **Active navigation indicator** uses gradient line only — may be invisible to color-blind users
- **Array index as key** in Features page grid — can cause rendering bugs if items reorder

---

## 4. CODE QUALITY ISSUES

### 4.1 TypeScript Safety Disabled (CRITICAL)

`next.config.ts` line 22: `ignoreBuildErrors: true` — TypeScript errors are completely ignored at build time. This means type errors can ship to production undetected.

### 4.2 Pricing Page Typo (HIGH)

`src/app/[locale]/(marketing)/pricing/page.tsx` line 46: Class name `conntainer` (double 'n') instead of `container` — this breaks the container styling on the pricing page.

### 4.3 Hard-Coded Strings (MEDIUM)

Multiple pages contain hard-coded English text instead of using the i18n system:
- Homepage: "Get Started", "Partner With Us", "Built for Thai Private Schools", "Google Gemini & GPT-5 AI"
- About: Section headings
- Pricing: "Last updated: October 2024"

### 4.4 Unnecessary Client Components (MEDIUM)

Pages that could be server components but are marked `"use client"`:
- `services/page.tsx` — only uses static i18n
- `case-studies/page.tsx` — only uses static i18n
- `features/page.tsx` — only uses static i18n

Converting these to server components would reduce client-side JS significantly.

---

## 5. PRIORITIZED ACTION PLAN

### Phase 1: Critical Fixes (Week 1)
- [ ] Fix `conntainer` typo on pricing page
- [ ] Fix broken `href="#"` link on about page
- [ ] Re-enable TypeScript build error checking in `next.config.ts`
- [ ] Configure production image domains in `next.config.ts`

### Phase 2: Performance (Week 2-3)
- [ ] Remove Framer Motion `PageTransition` wrapper — replace with CSS
- [ ] Convert services, case-studies, features pages to server components
- [ ] Remove excessive `priority` props (keep only for above-fold hero images)
- [ ] Add `sizes` prop to all `fill` images
- [ ] Audit and reduce client component boundaries
- [ ] Lazy-load locale data or switch to server-side i18n

### Phase 3: Visual Consistency (Week 3-4)
- [ ] Unify color palette: remove violet/purple/emerald — stick to amber/orange + sky blue
- [ ] Standardize section padding to a consistent rhythm (e.g., `py-16` / `py-24`)
- [ ] Fix products page card overlap layout issue
- [ ] Fix homepage footer gap
- [ ] Replace hero background image on pricing/about with intentional per-page images
- [ ] Make scroll-triggered content visible by default (animate as enhancement)

### Phase 4: Accessibility & i18n (Week 4-5)
- [ ] Replace emoji icons with lucide-react icons + `aria-hidden`
- [ ] Add `aria-hidden="true"` to all decorative elements
- [ ] Improve image alt text to be descriptive and unique
- [ ] Audit color contrast on orange gradient sections
- [ ] Move all hard-coded English strings to locale files

### Phase 5: Cleanup (Week 5-6)
- [ ] Remove unused Tailwind config entries (teal-modern, unused shadows)
- [ ] Consolidate overlapping CSS utilities in globals.css
- [ ] Reduce CSS blur animation count and complexity
- [ ] Remove or enable console removal in next.config.ts
- [ ] Add WebP/AVIF image format support

---

## Appendix: Pages Reviewed with Screenshots

| Page | URL | Key Issues |
|------|-----|------------|
| Homepage | `/en` | Heavy animations, hard-coded strings, footer gap |
| Products | `/en/products` | Card overlap, layout shift risk |
| Pricing | `/en/pricing` | `conntainer` typo, odd hero crop |
| Features | `/en/features` | Emoji accessibility, no icons |
| About | `/en/about` | Violet colors, broken CTA link |
| Contact | `/en/contact` | Mixed accent colors, fixed QR size |
| Services | `/en/services` | Unnecessary client component |
| Case Studies | `/en/case-studies` | 8+ priority images, unnecessary client |
| Reading Advantage | `/en/products/reading-advantage` | Completely different color scheme |
