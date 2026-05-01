# Track: Remaining Product Pages Redesign

## Overview

The Reading Advantage and Primary Advantage product pages have been redesigned to use the new visual language: inline hero sections with product-specific gradients, Lucide icons, Tailwind-only animations, asymmetric 7/5 grid layouts, and glassmorphism accents. The remaining seven product pages — Math Advantage, Science Advantage, STEM Advantage, Storytime Advantage, Zhongwen Advantage, CodeCamp Advantage, and Tutor Advantage — still use the older design patterns (Framer Motion, emoji icons, inconsistent colors, generic `HeroSection` component).

This track brings all seven pages up to the same standard. Each page receives a product-specific color identity, an inline hero section, Lucide-icon feature cards, and a consistent section structure, while preserving all existing i18n locale content.

## Functional Requirements

1. Each of the seven product pages removes Framer Motion and all `motion.*` JSX.
2. Each page builds an inline hero section (no `HeroSection` component import) with a product-specific gradient and organic blob decorations.
3. All emoji icons on product pages are replaced with `lucide-react` icons.
4. Section structure is consistent across all product pages:
   - Hero (inline, product gradient)
   - Key Features (3-column grid, Lucide icons)
   - CEFR/Level Alignment or equivalent differentiator section (asymmetric 7/5)
   - Platform Features or Technology section
   - Results / Stats section (dark gradient, 3 stats)
   - Final CTA section
5. Each product page uses its logo brand colors from the official palette:
   - Math Advantage: `from-orange-300 via-orange-400 to-orange-300` (#fdba74 → #fdba74, dark #9a3412)
   - Science Advantage: `from-rose-300 via-rose-400 to-rose-300` (#fda4af → #fda4af, dark #9f1239)
   - STEM Advantage: `from-indigo-300 via-indigo-400 to-indigo-300` (#a5b4fc → #a5b4fc, dark #3730a3)
   - Storytime Advantage: `from-amber-300 via-amber-400 to-amber-300` (#fcd34d → #fcd34d, dark #92400e)
   - Zhongwen Advantage: `from-fuchsia-300 via-fuchsia-400 to-fuchsia-300` (#f0abfc → #f0abfc, dark #86198f)
   - CodeCamp Advantage: `from-slate-700 via-slate-800 to-slate-900` (TODO: confirm logo colors)
   - Tutor Advantage: `from-emerald-300 via-emerald-400 to-emerald-300` (#6ee7b7 → #6ee7b7, dark #065f46)
6. Each product page displays its product logo prominently in the hero section and throughout the page where appropriate (reading-advantage-logo.svg, primary-advantage-logo.svg, etc.).
7. All text remains sourced from existing locale files — no i18n keys are removed or renamed.
8. All animations use `tailwindcss-animate` utility classes only.
9. All pages pass `npm run build` with TypeScript strict mode enabled.

## Non-Functional Requirements

- Each redesigned page achieves a Lighthouse performance score of ≥ 85 in production mode.
- All pages are fully responsive from 320px (mobile) to 1440px (desktop).
- WCAG 2.1 AA color contrast on hero sections must be verified for each product gradient.
- Page weight must not increase relative to the pre-redesign baseline.
- Hero section images (where they exist) use `next/image` with `width`, `height`, `priority`, and `sizes` props.

## Acceptance Criteria

- [ ] All 7 product pages load without JavaScript errors in the browser console.
- [ ] All 7 product pages use their correct logo-based brand colors (not the previously incorrect palette).
- [ ] All 7 product pages display their product logo prominently in the hero section.
- [ ] No Framer Motion imports remain in any product page file.
- [ ] No emoji characters are used as icons in any product page.
- [ ] All 7 pages render correctly in EN, TH, and ZH locales.
- [ ] `npm run build` exits 0.
- [ ] Mobile layout (375px viewport) shows a single-column stack for all grid sections.

## Out of Scope

- Creating new locale translation keys — only existing keys are used.
- Adding new product images not already present in `public/images/`.
- Redesigning the `/products` overview listing page.
- Changing the URL structure of any product page.
- Adding video embeds or interactive demos.
