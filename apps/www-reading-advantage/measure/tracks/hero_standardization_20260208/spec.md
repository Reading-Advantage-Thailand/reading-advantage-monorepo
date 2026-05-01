# Spec: Hero Section Standardization

## Overview

This track establishes a reusable `Hero` component that provides consistent, engaging hero sections across all marketing pages. The component encapsulates rich inline hero pattern from home, reading-advantage, and managed-service pages while enforcing unified design aesthetics. All pages will use this component with configuration via props, ensuring predictable user experience and maintainable code structure.

## Functional Requirements

### FR-1: Reusable Hero Component

- **FR-1.1**: Create new `@/components/marketing/hero-section.tsx` with the following props:

  ```typescript
  interface HeroProps {
    title: string | ReactNode;
    description: string | ReactNode;
    ctaButton: {
      text: string;
      href: string;
      variant?: "primary" | "secondary" | "white" | "outline";
      icon?: ReactNode;
    };
    badge?: {
      text: string;
      icon?: ReactNode;
      variant?: "amber" | "sky" | "green" | "rose" | "yellow" | "custom";
      customColor?: string;
    };
    floatingImage?: {
      src: string;
      alt: string;
      sizes?: string;
    };
    height?: "tall" | "medium";
    alignment?: "left" | "center";
    customGradient?: string;
    showDecorations?: boolean;
    className?: string;
  }
  ```

- **FR-1.2**: Component default behavior:
  - Height: `medium` (min-h-[70vh]) unless `tall` specified (min-h-[90vh])
  - Alignment: `center` unless `left` specified
  - Decorations: Enabled (`true`) unless `showDecorations={false}`
  - CTA button: `primary` variant (gradient amber-to-orange)

### FR-2: Unified Visual Design

- **FR-2.1**: Default background gradient: `bg-gradient-to-br from-amber-50 via-orange-50 to-sky-50`
- **FR-2.2**: Organic blob decorations (2-3 per hero) with animations:
  - `animate-pulse-slow` on one blob
  - Static blur effect on others
  - Colors: amber-300/40 and sky-300/30 with large blur (100-150px)
  - All blobs have `aria-hidden="true"`
- **FR-2.3**: Floating image container:
  - Position: Right side when `alignment="left"`, hidden when `alignment="center"`
  - Container dimensions: w-[500px] h-[400px] (medium) or w-[600px] h-[500px] (tall)
  - Rounded corners: rounded-[32px] (medium) or rounded-[40px] (tall)
  - Shadow: `shadow-2xl`
  - Background blur behind image: white/20 with large blur
  - Gradient fade overlay on left side: `from-white/90 via-white/40 to-transparent`
  - Animation: `animate-in fade-in slide-in-from-right-8 duration-700 delay-300`

- **FR-2.4**: Entry animations:
  - Text container: `animate-in fade-in slide-in-from-bottom-8 duration-700`
  - Badge (if present): Included in text container animation
  - No `framer-motion` — use `tailwindcss-animate` classes only

### FR-3: Badge System

- **FR-3.1**: Badge variants map to Tailwind classes:
  ```typescript
  'amber': 'bg-amber-100 text-amber-800'
  'sky': 'bg-sky-100 text-sky-800'
  'green': 'bg-green-100 text-green-800'
  'rose': 'bg-rose-100 text-rose-800'
  'yellow': 'bg-yellow-400 text-sky-50'
  'custom': use `customColor` prop for background
  ```
- **FR-3.2**: Badge styling:
  - Rounded-full pill shape
  - Text size: `text-sm font-bold`
  - Padding: `px-4 py-2`
  - Icon: 4x4 lucide-react icon before text (if provided)
  - Display: `inline-flex items-center gap-2`
  - Margin: `mb-6` (below text container)

### FR-4: CTA Button System

- **FR-4.1**: CTA variants map to Tailwind classes:
  ```typescript
  'primary': 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-2xl hover:shadow-amber-500/30'
  'secondary': 'bg-white/60 backdrop-blur-sm border-2 border-slate-200 text-slate-700 hover:bg-white hover:border-sky-300'
  'white': 'bg-white text-slate-900 hover:bg-slate-50 shadow-2xl hover:shadow-white/30'
  'outline': 'bg-transparent border-2 border-white text-white hover:bg-white hover:text-slate-900'
  ```
- **FR-4.2**: CTA styling:
  - Rounded corners: `rounded-2xl`
  - Padding: `px-10 py-5`
  - Font: `font-bold text-lg`
  - Hover effects: `transition-all duration-300 hover:-translate-y-1`
  - Display: `inline-flex items-center gap-3`
  - Icon: Optional, positioned before text (left) or after text (right)
  - Animation on hover: Icon translates `translate-x-1`

### FR-5: Mobile Responsiveness

- **FR-5.1**: Hero text container:
  - Mobile (< md): `text-5xl` for titles, `text-xl` for descriptions
  - Desktop (md+): `text-6xl md:text-8xl` for titles, `text-2xl md:text-3xl` for descriptions
- **FR-5.2**: Floating image:
  - Hidden on screens < xl (`hidden xl:block`)
- **FR-5.3**: CTA buttons:
  - Stack vertically on mobile with `flex-wrap gap-4`
  - Full width on small screens if needed

### FR-6: Page Refactor Requirements

- **FR-6.1**: Replace existing inline heroes on ALL pages:
  - `src/app/[locale]/(marketing)/(home)/page.tsx` — Use `height="tall"` and `alignment="left"`
  - `src/app/[locale]/(marketing)/products/page.tsx` — Remove inline hero, use Hero component
  - `src/app/[locale]/(marketing)/products/reading-advantage/page.tsx` — Replace with Hero component
  - `src/app/[locale]/(marketing)/services/page.tsx` — Replace with Hero component
  - `src/app/[locale]/(marketing)/services/managed-service/page.tsx` — Replace with Hero component
  - `src/app/[locale]/(marketing)/services/blended-learning/page.tsx` — Replace with Hero component
  - `src/app/[locale]/(marketing)/products/math-advantage/page.tsx` — Remove Hero component usage, use new Hero component with badge
  - `src/app/[locale]/(marketing)/products/science-advantage/page.tsx` — Same as math-advantage
  - `src/app/[locale]/(marketing)/products/stem-advantage/page.tsx` — Same as math-advantage
  - `src/app/[locale]/(marketing)/products/zhongwen-advantage/page.tsx` — Same as math-advantage
  - `src/app/[locale]/(marketing)/products/codecamp-advantage/page.tsx` — Same as math-advantage
  - `src/app/[locale]/(marketing)/about/page.tsx` — Replace with Hero component
  - `src/app/[locale]/(marketing)/features/page.tsx` — Replace with Hero component
  - `src/app/[locale]/(marketing)/pricing/page.tsx` — Replace with Hero component
  - `src/app/[locale]/(marketing)/contact/page.tsx` — Replace with Hero component

- **FR-6.2**: Remove old `@/components/layout/hero.tsx` component after migration
- **FR-6.3**: Update imports on all refactored pages to use new `@/components/marketing/hero-section.tsx`

### FR-7: Accessibility

- **FR-7.1**: All images have descriptive `alt` text
- **FR-7.2**: Decorative blobs have `aria-hidden="true"`
- **FR-7.3**: Focus states on all interactive elements
- **FR-7.4**: Keyboard navigation support for CTA buttons

## Non-Functional Requirements

- **Performance**: Hero component must be server-side renderable (no `"use client"` unless state needed)
- **Maintainability**: Single source of truth for hero design patterns
- **Consistency**: All pages must use same component with only prop variations
- **Type Safety**: Full TypeScript prop typing with no `any` types
- **Accessibility**: WCAG 2.1 AA compliant (color contrast, focus indicators, aria labels)

## Acceptance Criteria

1. New `@/components/marketing/hero-section.tsx` component exists and compiles without errors
2. Component accepts all defined props with TypeScript validation
3. Home page uses `height="tall"` and displays correctly
4. All other pages use `height="medium"` (default) and display correctly
5. Product pages with "Coming Soon" badges display prominent badges with correct colors
6. Floating images display correctly on desktop, hidden on mobile
7. Organic blob decorations render with animations and correct blur effects
8. All page refactors complete — no inline hero code remaining in page files
9. Old `@/components/layout/hero.tsx` component is deleted
10. Visual inspection confirms unified amber/orange/sky gradient across all pages
11. `npm run build` succeeds with zero TypeScript errors
12. All hero sections pass Lighthouse accessibility audit

## Out of Scope

- Blog page hero refactoring (separate content pipeline track)
- New hero designs or patterns beyond standardizing existing ones
- A/B testing different hero variations
- Analytics integration on hero CTAs
- Personalization logic in hero component
