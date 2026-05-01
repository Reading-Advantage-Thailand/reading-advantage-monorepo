# Track: Complete Site Redesign

## Overview

The entire Reading Advantage website needs to be redesigned to use the Clay-inspired design system defined in `measure/DESIGN.md`. This includes all marketing pages, all 9 product pages, navigation components, footer, and any reusable UI components. The redesign must apply the warm cream canvas, product brand colors, Roobert typography with OpenType stylistic sets, playful hover animations, and all other design system elements consistently across the entire site.

## Scope

### Pages to Redesign

1. **Homepage** (`/`)
2. **About** (`/about`)
3. **Contact** (`/contact`)
4. **All Product Pages** (9 total):
   - Reading Advantage (`/products/reading-advantage`)
   - Primary Advantage (`/products/primary-advantage`)
   - Math Advantage (`/products/math-advantage`)
   - Science Advantage (`/products/science-advantage`)
   - STEM Advantage (`/products/stem-advantage`)
   - Storytime Advantage (`/products/storytime-advantage`)
   - Zhongwen Advantage (`/products/zhongwen-advantage`)
   - Tutor Advantage (`/products/tutor-advantage`)
   - CodeCamp Advantage (`/products/codecamp-advantage`)
5. **Products Overview** (`/products`)
6. **Blog** (if applicable - pages under `/blog`)
7. **Any other marketing pages** under `src/app/[locale]/(marketing)/`

### Components to Redesign

1. **Navigation/Header** - sticky nav on warm cream with oat border
2. **Footer** - 40px radius container on warm cream
3. **Buttons** - all button variants (primary, secondary, ghost, outlined)
4. **Cards** - feature cards, pricing cards, content cards
5. **Form inputs** - borders, focus states, styling
6. **Hero sections** - inline heroes with product brand colors
7. **Stat/result sections** - dark gradient sections
8. **Testimonial/social proof sections** - consistent styling
9. **CTA sections** - consistent call-to-action patterns

## Functional Requirements

### Design System Application

1. **Color System**
   - All page backgrounds use warm cream (`#faf9f7`)
   - All borders use oat tones (`#dad4c8`, `#eee9df`) — never neutral gray
   - Product pages use their logo brand colors:
     - Reading Advantage: Sky 300/400/900
     - Primary Advantage: Cyan 300/400/800
     - Math Advantage: Orange 300/400/800
     - Science Advantage: Rose 300/400/800
     - STEM Advantage: Indigo 300/400/800
     - Storytime Advantage: Amber 300/400/800
     - Zhongwen Advantage: Fuchsia 300/400/800
     - Tutor Advantage: Emerald 300/400/800
     - CodeCamp Advantage: Slate 700/800/900

2. **Typography**
   - Primary font: Roobert (with fallback to Arial)
   - Monospace: Space Mono
   - All headings use 5 OpenType stylistic sets: `"ss01", "ss03", "ss10", "ss11", "ss12"`
   - Body text uses 4 stylistic sets: `"ss03", "ss10", "ss11", "ss12"`
   - Display text (80px): weight 600, line-height 1.00, letter-spacing -3.2px
   - Section headings (44px): weight 600, letter-spacing -0.88px to -1.32px
   - Body text (18px): weight 400, line-height 1.60, relaxed spacing
   - Uppercase labels: 12px, weight 600, letter-spacing 1.08px, text-transform uppercase

3. **Animations & Interactions**
   - Buttons on hover: `rotateZ(-8deg)`, `translateY(-80%)`, hard shadow `rgb(0,0,0) -7px 7px`
   - Background transitions to contrasting swatch color on hover
   - No Framer Motion — use `tailwindcss-animate` only
   - All hover states are playful and physical, not subtle fades

4. **Spacing & Layout**
   - Base unit: 8px scale
   - Card radius: 24px for feature cards, 12px for standard cards
   - Section radius: 40px for large containers
   - Generous padding on sections: `py-24` to `py-32`
   - Responsive breakpoints: <479px, 479-767px, 768-991px, 992px+

5. **Shadows & Depth**
   - Clay shadow: `rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px`
   - Hard offset shadow on hover: `rgb(0,0,0) -7px 7px`
   - Focus ring: `rgb(20, 110, 245) solid 2px`

### Page-Specific Requirements

1. **Homepage**
   - Warm cream background
   - Hero section with Reading Advantage brand colors (Sky)
   - Product showcase cards with logo colors
   - Stats/results section with dark gradient
   - CTA section with playful hover buttons
   - All sections use product brand colors appropriately

2. **Product Pages** (all 9)
   - Inline hero with product-specific brand gradient
   - Product logo prominently displayed in hero
   - 3-column feature grid with Lucide icons
   - Asymmetric 7/5 grid for differentiator sections
   - Dark gradient stats section (3 stats)
   - Final CTA section
   - All emoji icons replaced with `lucide-react`
   - No Framer Motion imports
   - All i18n content preserved

3. **About & Contact**
   - Consistent with design system
   - Warm cream backgrounds
   - Appropriate use of brand colors for accents
   - Playful hover animations on buttons/links

4. **Products Overview**
   - Card grid for all 9 products
   - Each card shows product logo and brand color
   - Hover animations on cards
   - Links to individual product pages

5. **Navigation/Header**
   - Sticky top nav on warm cream (`#faf9f7`)
   - Oat border bottom: `1px solid #dad4c8`
   - Roobert 15px weight 500 for nav links
   - Logo left-aligned
   - CTA buttons right-aligned with pill radius
   - Mobile: hamburger collapse at 767px

6. **Footer**
   - 40px radius container
   - Warm cream or appropriate section background
   - Oat borders
   - Consistent typography

### Component Requirements

1. **Buttons**
   - Primary: transparent background → swatch color on hover with rotation + hard shadow
   - White solid: white background → oat-200 on hover with animation
   - Ghost outlined: transparent → dragonfruit on hover with animation
   - All buttons follow playful hover pattern

2. **Cards**
   - White background on cream canvas
   - Oat border: `1px solid #dad4c8` (solid or dashed)
   - 24px radius for feature cards
   - Clay shadow (multi-layer with inset highlight)
   - Hover animations (translate, scale)

3. **Inputs & Forms**
   - Text: `#000000`
   - Border: `1px solid #717989`
   - Radius: 4px
   - Focus: `rgb(20, 110, 245) solid 2px` outline

### i18n Requirements

- All text remains sourced from existing locale files
- No new translation keys created
- All pages render correctly in EN, TH, and ZH locales
- `npm run i18n:verify` exits 0

### Technical Requirements

- Remove all Framer Motion imports and `motion.*` JSX
- Use `tailwindcss-animate` for all animations
- All pages pass `npm run build` with TypeScript strict mode
- No JavaScript errors in browser console
- Responsive from 320px (mobile) to 1440px (desktop)

## Non-Functional Requirements

- **Performance**: Lighthouse score ≥85 in production mode
- **Accessibility**: WCAG 2.1 AA color contrast on all sections, focus indicators on all interactive elements
- **Responsiveness**: Mobile-first, works at 320px, 375px, 768px, 1024px, 1440px
- **Page weight**: No significant increase relative to pre-redesign baseline
- **Images**: All images use `next/image` with proper `width`, `height`, `priority`, and `sizes` props
- **Cross-browser**: Works in Chrome, Firefox, Safari, Edge

## Acceptance Criteria

- [ ] All marketing pages load without JavaScript errors
- [ ] All 9 product pages display correct logo brand colors
- [ ] All 9 product pages display their product logo in the hero section
- [ ] No Framer Motion imports remain anywhere in the codebase
- [ ] No emoji icons used anywhere (all replaced with `lucide-react`)
- [ ] All pages use warm cream (`#faf9f7`) as page background
- [ ] All borders use oat tones (`#dad4c8`) — no neutral gray borders
- [ ] All headings use Roobert with 5 OpenType stylistic sets
- [ ] All buttons have playful hover animations (rotateZ + translateY + hard shadow)
- [ ] All cards have 24px radius and clay shadow
- [ ] Navigation is sticky on warm cream with oat border
- [ ] Footer has 40px radius container
- [ ] All pages render correctly in EN, TH, and ZH locales
- [ ] Mobile layout (375px) shows single-column stack for all grid sections
- [ ] `npm run i18n:verify` exits 0
- [ ] `npm run build` exits 0 with no TypeScript errors
- [ ] `npm test` passes (all tests green)
- [ ] Lighthouse score ≥85 on homepage and all product pages

## Out of Scope

- Creating new pages or routes
- Adding new features or functionality
- Changing the site structure or URL patterns
- Creating new translation keys or content
- Backend changes (Convex functions, API routes)
- Database migrations or schema changes
- SEO optimization beyond what's necessary for the redesign
- Analytics or tracking implementation
- Third-party integrations (unless they're broken by the redesign)
