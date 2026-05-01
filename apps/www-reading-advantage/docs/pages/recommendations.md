# Website Rewrite Recommendations

## Summary

Analysis of 16 pages across the website reveals several inconsistencies and opportunities for standardization. Below are key findings and recommendations for a comprehensive rewrite.

---

## Current State: What IS Common

### ✅ Good Common Patterns

1. **Animation Standards (Most Pages)**
   - Consistent use of `tailwindcss-animate` classes:
     - `animate-in fade-in slide-in-from-bottom-4 duration-500`
     - `animate-in fade-in duration-700 delay-100`
   - Staggered animations with `delay` pattern
   - We should make this true across all pages.

2. **Card Components**
   - shadcn/ui Card components used consistently
   - Modern card styling with hover effects
   - Shadow and transition classes
   - We should reduce the dependency on obvious cards (though they can be less obvious) in order to look more modern.

3. **Container Patterns**
   - `container mx-auto px-4` used consistently
   - Responsive grid patterns: `grid-cols-1 md:grid-cols-2/3`

4. **i18n Structure**
   - Consistent namespace usage: `pages.[pageName].[section].[key]`
   - Server Components use `getScopedI18n` from `@/locales/server`
   - Client Components use `useScopedI18n` from `@/locales/client`

5. **CTA Sections**
   - Most pages end with prominent CTA section
   - Consistent button styling
   - Common use of mailto: links with pre-filled subject/body
   - Be more consistent here

---

## Current State: What SHOULD Be Common (Issues Found)

### ❌ Inconsistent Color Schemes Across Products

Each product has completely different colors, creating visual fragmentation:

| Product | Hero Color | Issue |
|----------|-------------|--------|
| Reading Advantage | Sky/Blue gradient (500-600-700) | Good |
| Primary Advantage | Cyan gradient (500-600-700) | Inconsistent |
| Math Advantage | Orange (100-200-300) | Too light, different approach |
| Science Advantage | Rose (200-400) | Completely different |
| STEM Advantage | Indigo (200-400) | Too light |
| Storytime Advantage | Sky-50 (very light) | Too subtle |
| CodeCamp | Sky-800 (dark cards) | Dark approach |
| Tutor Advantage | Emerald (100-400) | Completely different |
| Zhongwen Advantage | Fuchsia (200-400) | Completely different |

**Recommendation**: Establish brand color hierarchy:
- **Primary Brand**: Sky/Blue (500-700) for main products
- **Secondary Brand**: Use 2-3 accent colors maximum (e.g., Emerald for special programs, Indigo for STEM)
- **Consistent Pattern**: All products should use similar gradient intensity (500-700 range, not 100-300)

**Feedback from owner**: The different pages represent the different color schemes of the product logos. Each product has its own colors. We need to keep some part of this logo color scheme on the product pages, though it could be less overt. 

### ❌ Framer Motion Usage (Violates System Prompt)

**Critical Issue**: Some pages still use Framer Motion despite the NO FRAMER MOTION requirement.

| Page | Framer Motion Components |
|-------|------------------------|
| Home (`/`) | `motion.div` throughout |
| Primary Advantage | `motion.div`, `PageTransition` wrapper |
| Math Advantage | `FadeIn`, `ScrollFade`, `PageTransition` wrappers |

**Action Required**: Replace all Framer Motion with `tailwindcss-animate` classes:
- Remove `<FadeIn>` wrappers → Add `animate-in fade-in` directly to elements
- Remove `<PageTransition>` → Delete wrapper
- Remove `<motion.div>` → Replace with standard div + animation classes

### ❌ Inconsistent Hero Component Usage

| Pattern | Usage | Issue |
|----------|-------|--------|
| Standard Hero | `<Hero backgroundImage />` | Good |
| Custom Gradient | `<Hero className="bg-gradient-to-br from-XXX to-XXX" />` | Inconsistent |
| Custom Title | `<Hero title={<><Image /><h1 /></>}` | Varies by page |

**Recommendation**: Standardize Hero usage:
1. Products should follow consistent title/logo pattern
2. Use `backgroundImage` prop OR consistent custom className pattern
3. All products should have "Coming Soon" badge in same position/style

### ❌ Missing Content Structure

Some pages are minimal or incomplete:

| Page | Issue |
|-------|--------|
| CodeCamp Advantage | No detailed sections, only 2 basic feature cards |
| Zhongwen Advantage | Hardcoded content instead of i18n keys |
| Storytime Advantage | Very minimal content |
| Some "Coming Soon" pages | Very little feature detail |

**Recommendation**: All product pages should have:
1. Hero with logo + title + subtitle
2. Key Features (3 cards)
3. Platform Features (6 cards with images)
4. Results/Benefits section
5. CTA section with clear call-to-action

### ❌ "Coming Soon" Badge Inconsistency

| Page | Badge Style | Position |
|-------|-------------|----------|
| Math | `bg-yellow-400 text-sky-50 px-4 py-2` | Absolute top-4 right-4 |
| Science | `bg-rose-100 text-rose-900` | Absolute top-4 right-4 |
| STEM | `bg-yellow-400 text-gray-800` | Absolute top-4 right-4 |
| Storytime | `bg-sky-400 text-white px-4 py-2 mb-6` | Mixed in with title |
| Tutor | `inline-block bg-yellow-400 text-emerald-900` | Inline with subtitle |

**Recommendation**: Create consistent "Coming Soon" badge:
- Position: Absolute top-4 right-4
- Style: `bg-yellow-400 text-gray-800 px-4 py-2 rounded-full`
- Or create a reusable `<ComingSoonBadge />` component

### ❌ Image Inconsistencies

| Page | Logo Usage | Size |
|-------|-------------|------|
| Reading Advantage | Image in hero, 200x200 | ✓ |
| Primary Advantage | Image in hero, 200x200 | ✓ |
| Math | Image in hero, 200x200 | ✓ |
| Science | Image in hero, 200x200 | ✓ |
| STEM | Image in hero, 200x200 | ✓ |
| Tutor | Image in hero, 200x200 | ✓ |
| Zhongwen | Image in hero, 200x200 | ✓ |
| Storytime | No logo image | ✗ |

**Recommendation**: All product pages should include logo image with consistent sizing (200x200)

### ❌ Hardcoded Content (i18n Violations)

**Zhongwen Advantage** has hardcoded text instead of i18n keys:
- "Dual-Level Learning System" → should be from locale
- "When will Zhongwen Advantage launch?" → should be from locale

**Recommendation**: Move all content to `src/locales/pages/products/zhongwen-advantage.ts`

---

## Rewrite Recommendations by Priority

### 🔴 HIGH PRIORITY

1. **Remove All Framer Motion**
   - Files to update:
     - `src/app/[locale]/(marketing)/(home)/page.tsx`
     - `src/app/[locale]/(marketing)/products/primary-advantage/page.tsx`
     - `src/app/[locale]/(marketing)/products/math-advantage/page.tsx`
   - Delete imports: `motion` from 'framer-motion', `FadeIn`, `ScrollFade`, `PageTransition`
   - Replace with `tailwindcss-animate` classes

2. **Standardize Product Color Schemes**
   - Establish unified brand colors in globals.css or design system
   - Recommended hierarchy:
     - **Main Products** (Reading, Primary): Sky/Blue (500-700)
     - **STEM Products** (Math, Science, STEM): Accent colors but use darker gradients (500-700)
     - **Special Programs** (Tutor, Zhongwen, CodeCamp): Green/Purple families
   - Update all product pages to use consistent gradient intensity

3. **Create Reusable Hero Badge Component**
   - Create `src/components/ui/coming-soon-badge.tsx`
   - Usage: `<ComingSoonBadge />`
   - Consistent: `bg-yellow-400 text-gray-800 rounded-full`

### 🟡 MEDIUM PRIORITY

4. **Standardize Product Page Structure**
   - All product pages should follow template:
     ```
     1. Hero (Logo + Title + Subtitle + Coming Soon Badge)
     2. Key Features (3 emoji cards)
     3. Platform Features (6 image cards)
     4. Results/Benefits (stats or benefits list)
     5. Teacher/For Educators section (if applicable)
     6. CTA (Dark gradient + buttons)
     ```

5. **Add Missing Content to Incomplete Pages**
   - CodeCamp Advantage: Add Technology Tracks section with more detail
   - Zhongwen Advantage: Move content to i18n, add more features
   - Storytime Advantage: Add platform features, teacher tools, FAQ
   - All "Coming Soon" pages: Add preview/features even if launching

6. **Create Design System Documentation**
   - Document approved color palette in `docs/design-system.md`
   - Define gradient usage rules
   - Create reusable gradient constants:
     ```typescript
     // src/config/gradients.ts
     export const PRODUCT_GRADIENTS = {
       sky: 'from-sky-500 via-blue-600 to-sky-700',
       cyan: 'from-cyan-500 via-cyan-600 to-cyan-700',
       // etc.
     }
     ```

### 🟢 LOW PRIORITY

7. **Add Missing Logos**
   - Create/find logo images for all products:
     - Storytime Advantage (storytime-advantage.png)
   - Standardize logo size: 200x200

8. **CTA Standardization**
   - Create `src/components/ui/cta-section.tsx` component
   - Props: title, description, buttons[]
   - Consistent styling: `bg-gradient-to-br from-sky-600 to-blue-700`

9. **Image Optimization**
   - Ensure all images use `next/image` with:
     - Defined `width`, `height`
     - Proper `alt` text
     - `sizes` prop for responsive images

---

## Quick Wins (Easy Implementations)

1. **Fix Zhongwen i18n** - Move 15 minutes
2. **Create ComingSoonBadge component** - Create once, replace in 6 pages
3. **Standardize CTA email links** - Create helper function for consistent mailto formatting
4. **Add Storytime logo** - Add image file
5. **Remove Framer Motion imports** - Delete from 3 files

---

## Suggested Rewrite Order

### Phase 1: Foundation (Week 1)
1. Remove Framer Motion
2. Create design system constants
3. Build reusable components (ComingSoonBadge, CTASection)
4. Fix Zhongwen i18n

### Phase 2: Product Pages (Week 2-3)
5. Standardize colors for Math, Science, STEM
6. Update incomplete product pages (CodeCamp, Storytime, Zhongwen)
7. Add missing logos

### Phase 3: Consistency Pass (Week 4)
8. Review all pages for Hero consistency
9. Audit all CTA sections
10. Test responsive behavior across pages

---

## After Rewrite: Desired State

✅ All product pages follow identical structure
✅ Consistent color hierarchy based on product category
✅ Zero Framer Motion usage
✅ All content in i18n (no hardcoded text)
✅ All products have logo, features, CTA
✅ Reusable components for common patterns
✅ Documented design system
