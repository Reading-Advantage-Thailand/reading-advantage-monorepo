# Spec: Site-Wide Refactor — Appearance, Performance & Code Quality

## Overview

This track addresses all findings from the Measure Audit (REFACTOR.md, 2026-02-07). The marketing website suffers from inconsistent visual design, a 3.2 MB JavaScript bundle (16x over budget), excessive Framer Motion animations, disabled TypeScript checking, accessibility violations, and hard-coded English strings bypassing the i18n system. This refactor will bring the site into compliance with the product guidelines (amber/sky color palette, no Framer Motion, lucide-react icons, WCAG 2.1 AA) while dramatically improving performance.

## Functional Requirements

### FR-1: Critical Bug Fixes
- FR-1.1: Fix the CSS class typo `conntainer` → `container` on the pricing page (`src/app/[locale]/(marketing)/pricing/page.tsx` line 46)
- FR-1.2: Fix the broken `href="#"` link on the about page (`src/app/[locale]/(marketing)/about/page.tsx` line 193) — should use Next.js `Link` to `/contact`
- FR-1.3: Re-enable TypeScript build error checking by setting `ignoreBuildErrors: false` in `next.config.ts` (line 22) and fixing any resulting type errors
- FR-1.4: Configure production image domains in `next.config.ts` (currently only allows `localhost`)

### FR-2: Performance — Remove Framer Motion & Reduce Bundle
- FR-2.1: Remove the `PageTransition` component (`src/components/layout/page-transition.tsx`) which imports `framer-motion`
- FR-2.2: Update the marketing layout (`src/app/[locale]/(marketing)/layout.tsx`) to render children directly without `PageTransition` wrapper
- FR-2.3: Replace any Framer Motion `whileInView` animations with CSS `tailwindcss-animate` classes (content must be visible by default)
- FR-2.4: Uninstall the `framer-motion` npm package from the project
- FR-2.5: Convert `services/page.tsx` from client component to server component (remove `"use client"`, use `await getScopedI18n`)
- FR-2.6: Convert `case-studies/page.tsx` from client component to server component
- FR-2.7: Remove excessive `priority` props on images — keep only on above-fold hero images (max 1-2 per page)
- FR-2.8: Add `sizes` prop to all Next.js `<Image>` components that use `fill`

### FR-3: Visual Consistency — Unified Color Palette
- FR-3.1: Remove all `violet-*` color classes from the about page (lines 42, 150) — replace with `amber-*` or `sky-*`
- FR-3.2: Remove all `emerald-*` color classes from the contact page — replace with `sky-*` or `amber-*`
- FR-3.3: Update the Reading Advantage product page hero gradient to use the warm amber/sky palette instead of `sky-400/blue-600`
- FR-3.4: Remove the `purple-50/pink-50` gradient from the Reading Advantage games section (line 247) — use `amber-50/sky-50`
- FR-3.5: Standardize section padding across all marketing pages to use only `py-16` (small) and `py-24` (large)
- FR-3.6: Fix the homepage footer gap (reduce or remove extra spacing before footer)
- FR-3.7: Fix the products page card overlap by removing conflicting `hover:-translate-y` values

### FR-4: Accessibility & i18n
- FR-4.1: Replace all emoji strings on the features page with `lucide-react` icon components + `aria-hidden="true"`
- FR-4.2: Add `aria-hidden="true"` to all decorative blur/blob elements across all pages
- FR-4.3: Improve image `alt` text to be descriptive and unique (not generic "Reading Advantage Platform")
- FR-4.4: Move all hard-coded English strings on the homepage to the locale system (`src/locales/pages/home.ts`)
- FR-4.5: Move hard-coded strings on the about page to locale files
- FR-4.6: Move the "Last updated: October 2024" string on pricing page to locale files

### FR-5: Cleanup
- FR-5.1: Remove the unused `teal-modern` gradient from `tailwind.config.ts` (line 66)
- FR-5.2: Consolidate `.glass-morphism` and `.hero-glass` in `globals.css` — remove `.hero-glass` and apply its styles inline where used
- FR-5.3: Remove unused shadow utilities (`shadow-glow`, `shadow-glow-lg`) if truly unused after refactor
- FR-5.4: Reduce decorative CSS blur animation count on homepage — limit to 2 max per section, remove `animate-float` infinite loops
- FR-5.5: Enable or remove the commented-out console removal code in `next.config.ts`

## Non-Functional Requirements

- **Performance**: Total JS bundle should be reduced to under 500 KB (from 3.2 MB). First Contentful Paint target: < 2 seconds.
- **Accessibility**: All pages must pass WCAG 2.1 AA automated checks. No emoji used as icons.
- **i18n**: Zero hard-coded English strings in page components. All text via locale files.
- **Type Safety**: TypeScript build errors must be caught — `ignoreBuildErrors` must be `false`.
- **Animations**: All animations via `tailwindcss-animate` only. No `framer-motion` dependency.

## Acceptance Criteria

1. `npm run build` succeeds with `ignoreBuildErrors: false` and zero TypeScript errors
2. The `framer-motion` package is not in `package.json`
3. No `"use client"` directive on services or case-studies pages
4. No `violet-*`, `emerald-*`, `purple-*`, or `pink-*` Tailwind classes in any marketing page
5. All marketing pages use only `py-16` or `py-24` for section padding
6. No emoji strings rendered in JSX — all icons use `lucide-react`
7. All decorative elements have `aria-hidden="true"`
8. All `<Image fill>` components have a `sizes` prop
9. Maximum 1 `priority` image per page (the above-fold hero)
10. The pricing page renders with correct `container` class (no typo)
11. All previously hard-coded English strings are now in locale files with translation keys
12. Visual inspection confirms consistent amber/orange + sky blue color palette across all pages

## Out of Scope

- Blog page refactoring (content pipeline)
- Adding new pages or features
- Server-side i18n architecture changes (lazy-loading locale data is a separate track)
- WebP/AVIF image format conversion (requires image pipeline setup)
- Mobile hamburger menu redesign (separate UX track)
- QR code responsive sizing (minor, separate fix)
